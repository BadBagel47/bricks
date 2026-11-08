import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { firebaseIdentity, serviceAccountToken } from '../server/operating/credentials.ts'
import { D1LinkStore } from '../modules/access-control/d1-store.ts'
import { D1SessionStore } from '../modules/access-control/sessions.ts'
import { OperatingControls } from '../server/operating/controls.ts'
import { MemoryPublisher } from './fixtures/operating-publisher.ts'
import { ResendMailer } from '../server/operating/mail.ts'

test('local workerd D1 runs the actual schema and concurrent one-time consumption SQL', { timeout: 60000 }, async () => {
  const runtime = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("ok") } }', compatibilityDate: '2026-11-08', d1Databases: ['DB'] }))
  try {
    const database = await runtime.getD1Database('DB')
    const schema = await readFile(new URL('../modules/access-control/schema.sql', import.meta.url), 'utf8')
    await database.batch(schema.split(';').map(x => x.trim()).filter(Boolean).map(x => database.prepare(x)))
    await database.prepare("INSERT INTO admins VALUES ('subject', 1)").run()
    const links = new D1LinkStore(database), sessions = new D1SessionStore(database)
    await links.put({ digest: 'token-digest', subject: 'subject', expiresAt: 200 })
    const outcomes = await Promise.all([links.consume('token-digest', 100), links.consume('token-digest', 100)])
    assert.equal(outcomes.filter(Boolean).length, 1)
    await sessions.putSession('session-digest', { subject: 'subject', expiresAt: 200 })
    assert.equal((await sessions.findSession('session-digest', 100))?.subject, 'subject')
    assert.equal(await sessions.findSession('session-digest', 200), null)
    const controls = new OperatingControls(new MemoryPublisher(), database, 'bricks', 'https://game.example.invalid/')
    await controls.initialize()
    const invite = await controls.create(1000, 100)
    assert.equal((await controls.list())[0].code, invite.code)
    const token = new URL(invite.url).hash.slice('#invite='.length)
    await Promise.all([controls.redeem(token, 'host', 'Host', 101), controls.redeem(token, 'guest', 'Guest', 101)])
    await controls.revoke(invite.id)
    assert.equal(await controls.validInvitation(token, 102), false)
    await controls.prune(10 * 86_400_000)
    assert.equal((await controls.list()).length, 0)
  } finally { await runtime.dispose() }
})

test('OAuth adapter signs a valid assertion, deduplicates refresh and caches only until expiry', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
  const raw = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
  const key = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(raw).toString('base64')}\n-----END PRIVATE KEY-----`
  let calls = 0, now = 1000
  const token = serviceAccountToken(JSON.stringify({ client_email: 'publisher@test.iam.gserviceaccount.com', private_key: key }), (async (url, options) => {
    assert.equal(url, 'https://oauth2.googleapis.com/token')
    const assertion = (options!.body as URLSearchParams).get('assertion')!, parts = assertion.split('.')
    assert.equal(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pair.publicKey, Buffer.from(parts[2], 'base64url'), new TextEncoder().encode(`${parts[0]}.${parts[1]}`)), true)
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    assert.equal(claims.aud, 'https://oauth2.googleapis.com/token')
    assert.equal(claims.exp - claims.iat, 3600)
    calls++
    return Response.json({ access_token: `token-${calls}`, expires_in: 3600 })
  }) as typeof fetch, () => now)
  assert.deepEqual(await Promise.all([token(), token()]), ['token-1', 'token-1'])
  assert.equal(await token(), 'token-1')
  now += 3_600_000
  assert.equal(await token(), 'token-2')
  assert.equal(calls, 2)
})

test('identity adapter requires a verified, enabled anonymous user in the configured project', async () => {
  const claims = { aud: 'bricks-test', iss: 'https://securetoken.google.com/bricks-test', sub: 'host', firebase: { sign_in_provider: 'anonymous' } }
  const encoded = (value: object) => `header.${Buffer.from(JSON.stringify(value)).toString('base64url')}.signature`
  const verify = firebaseIdentity('bricks-test', 'public-key', (async () => Response.json({ users: [{ localId: 'host' }] })) as typeof fetch)
  assert.equal(await verify(encoded(claims)), 'host')
  await assert.rejects(verify(encoded({ ...claims, aud: 'different-project' })))
  await assert.rejects(verify(encoded({ ...claims, firebase: { sign_in_provider: 'password' } })))
  const rejected = firebaseIdentity('bricks-test', 'public-key', (async () => Response.json({ error: {} }, { status: 400 })) as typeof fetch)
  await assert.rejects(rejected(encoded(claims)))
})

test('mail adapter fixes the sign-in origin, uses fragment tokens and sanitizes provider failures', async () => {
  let count = 0
  const mailer = new ResendMailer('fake-provider-key', 'Bricks <admin@example.invalid>', 'https://admin.example.invalid', (async (input, init) => {
    assert.equal(input, 'https://api.resend.com/emails')
    assert.equal(new Headers(init!.headers).get('Authorization'), 'Bearer fake-provider-key')
    const body = JSON.parse(String(init!.body))
    assert.deepEqual(body.to, ['recipient@example.invalid'])
    assert.ok(body.text.includes(`https://admin.example.invalid/admin/#token=${'a'.repeat(64)}`))
    assert.equal(body.text.includes('?token='), false)
    count++
    return count === 1 ? Response.json({ id: 'test' }) : Response.json({ message: 'private provider detail' }, { status: 429 })
  }) as typeof fetch)
  await mailer.send('recipient@example.invalid', 'a'.repeat(64))
  await assert.rejects(mailer.send('recipient@example.invalid', 'a'.repeat(64)), { message: 'Mail delivery failed' })
})

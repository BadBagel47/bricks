import assert from 'node:assert/strict'
import { test } from 'node:test'
import { accessDatabase } from './fixtures/access-database.ts'
import { INITIAL_OPERATING, parseOperating, privateAccess, publicAccess } from '../modules/access-control/operating.ts'
import { OperatingControls } from '../server/operating/controls.ts'
import { MemoryPublisher } from './fixtures/operating-publisher.ts'
import { FirebasePublisher } from '../server/operating/publisher.ts'
import { MagicLinks, privateSubject } from '../modules/access-control/magic-links.ts'
import { AdminSessions, D1SessionStore } from '../modules/access-control/sessions.ts'
import { AdminHttp } from '../modules/access-control/http.ts'
import { OperatingApi } from '../server/operating/api.ts'
import worker from '../server/operating/worker.ts'
import type { OperatingEnvironment } from '../server/operating/worker.ts'

async function setup() {
  const { sql, database, store } = accessDatabase(), publisher = new MemoryPublisher()
  const controls = new OperatingControls(publisher, sql, 'bricks', 'https://game.example.invalid/bricks/')
  await controls.initialize()
  return { controls, publisher, database, sql, store }
}

test('initial policy is explicitly public-open; malformed or missing policy fails closed', async () => {
  const f = await setup()
  try {
    assert.deepEqual(await f.controls.config(), INITIAL_OPERATING)
    assert.equal(await f.controls.solo(false, 100), true)
    assert.equal(publicAccess(INITIAL_OPERATING, 'multi', 100), true)
    assert.throws(() => parseOperating(null))
    assert.deepEqual(parseOperating({ ...INITIAL_OPERATING, single: { mode: 'on' }, multi: { mode: 'on' } }), INITIAL_OPERATING)
    assert.throws(() => parseOperating({ ...INITIAL_OPERATING, single: { mode: 'rooms', expiresAt: null } }))
    const closed = await f.controls.update({ ...INITIAL_OPERATING, revision: 2, single: { mode: 'off', expiresAt: null } }, 100)
    assert.equal(await f.controls.solo(false, 100), false)
    assert.equal(await f.controls.solo(true, 100), true)
    assert.equal(publicAccess(closed, 'multi', 100), true)
    assert.deepEqual(await f.controls.initialize(), closed, 'initialization never resets a deliberate closure')
  } finally { f.database.close() }
})

test('concurrent policy updates cannot overwrite one another; deadlines are exact', async () => {
  const f = await setup()
  try {
    const next = { ...INITIAL_OPERATING, revision: 2, multi: { mode: 'until', expiresAt: 200 } }
    const updates = await Promise.allSettled([f.controls.update(next, 100), f.controls.update(next, 100)])
    assert.equal(updates.filter(x => x.status === 'fulfilled').length, 1)
    const policy = await f.controls.config()
    assert.equal(publicAccess(policy, 'multi', 199), true)
    assert.equal(publicAccess(policy, 'multi', 200), false)
    const changedOtherMode = await f.controls.update({ ...policy, revision: 3, single: { mode: 'off', expiresAt: null } }, 200)
    assert.deepEqual(changedOtherMode.multi, policy.multi, 'An unchanged expired timer does not block independent mode changes')
    await assert.rejects(f.controls.update({ ...changedOtherMode, revision: 4, multi: { mode: 'until', expiresAt: 199 } }, 200))
  } finally { f.database.close() }
})

test('private shared invitations elect one host and never overwrite an existing room on repeat redemption', async () => {
  const f = await setup()
  try {
    const invite = await f.controls.create(10_000, 100), token = new URL(invite.url).hash.slice('#invite='.length)
    assert.match(invite.code, /^[A-HJ-NP-Z2-9]{4}$/)
    const stored = JSON.stringify(f.database.prepare('SELECT * FROM private_invites').all())
    assert.equal(stored.includes(token), false)
    await Promise.all([f.controls.redeem(token, 'host', 'Host', 101), f.controls.redeem(token, 'guest', 'Guest', 101)])
    const room = (await f.publisher.read<{ hostUid: string }>(`rooms/${invite.code}`)).value!
    assert.ok(['host', 'guest'].includes(room.hostUid))
    await f.publisher.write(`rooms/${invite.code}`, { ...room, customSentinel: 'must-survive' })
    await f.controls.redeem(token, 'third', 'Third', 102)
    assert.equal((await f.publisher.read<{ customSentinel: string }>(`rooms/${invite.code}`)).value?.customSentinel, 'must-survive')
    const metadata = (await f.publisher.read<{ id: string; expiresAt: number; revoked: boolean }>(`privateRooms/${invite.code}`)).value
    const membership = (await f.publisher.read<{ id: string; expiresAt: number }>(`roomAccess/${invite.code}/guest`)).value
    assert.equal(privateAccess(metadata, membership, 9999), true)
    assert.equal(privateAccess(metadata, membership, 10_000), false)
    await f.controls.revoke(invite.id)
    await assert.rejects(f.controls.redeem(token, 'other', 'Other', 103))
    assert.equal((await f.controls.list())[0].state, 'revoked')
    await assert.rejects(f.controls.redeem('a'.repeat(64), 'guest', 'Guest', 103))
  } finally { f.database.close() }
})

test('revoked operator sessions cannot be resurrected by an in-flight claim', async () => {
  const f = await setup()
  try {
    const subject = 'a'.repeat(64), sid = 'b'.repeat(64)
    await f.publisher.write(`adminAllowlist/${subject}`, true)
    await f.controls.operator('host', sid, subject, 1000)
    await f.controls.revokeSession(sid)
    await assert.rejects(f.controls.operator('host', sid, subject, 1000))
    await f.publisher.write(`adminAllowlist/${subject}`, false)
    await assert.rejects(f.controls.operator('guest', 'c'.repeat(64), subject, 1000))
  } finally { f.database.close() }
})

test('older active invitations stay available for revocation even with more than 100 recent historical records', async () => {
  const f = await setup()
  try {
    f.database.prepare("INSERT INTO private_invites (id, digest, code, expires_at, state, created_at) VALUES ('active', 'active-digest', 'QWER', 1000, 'active', 1)").run()
    const insert = f.database.prepare("INSERT INTO private_invites (id, digest, code, expires_at, state, created_at) VALUES (?, ?, ?, 10, 'revoked', ?)")
    for (let n = 0; n < 110; n++) insert.run(`historical-${n}`, `digest-${n}`, `code-${n}`, n + 10)
    const list = await f.controls.list(100)
    assert.equal(list.length, 100)
    assert.equal(list[0].id, 'active')
  } finally { f.database.close() }
})

test('control API authenticates every mutation, verifies player identity and constrains cross-origin access', async () => {
  const f = await setup(), origin = 'https://admin.example.invalid'
  try {
    const subject = await privateSubject('bricks', 'admin@example.invalid', 's'.repeat(32))
    f.database.prepare('INSERT INTO admins VALUES (?, 1)').run(subject)
    await f.publisher.write(`adminAllowlist/${subject}`, true)
    const sessions = new AdminSessions('bricks', new D1SessionStore(f.sql))
    const auth = new AdminHttp(origin, new MagicLinks('bricks', 's'.repeat(32), f.store, { async send() {} }), sessions, () => 100)
    const api = new OperatingApi(auth, f.controls, async token => { if (token !== 'verified') throw new Error(); return 'verified-uid' })
    const cookie = `${auth.cookieName}=${await sessions.issue(subject, 100)}`
    const context = { source: 'source', waitUntil() {} }
    const send = (path: string, input: object, headers = {}) => api.handle(new Request(`${origin}${path}`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Admin-Request': '1', ...headers }, body: JSON.stringify(input) }), context)
    assert.equal((await send('/api/admin/logout', {}, { Cookie: `${auth.cookieName}=${'f'.repeat(64)}` })).status, 200)
    assert.equal(f.database.prepare('SELECT COUNT(*) AS n FROM operator_mirrors').get()?.n, 0, 'Forged cookies never create mirrored session records')
    assert.equal((await send('/api/control/config', { config: INITIAL_OPERATING })).status, 401)
    assert.equal((await send('/api/control/config', { config: { ...INITIAL_OPERATING, revision: 2 } }, { Cookie: cookie })).status, 200)
    assert.equal((await send('/api/control/config', { config: { ...INITIAL_OPERATING, revision: 2 } }, { Cookie: cookie })).status, 409)
    assert.equal((await send('/api/control/invites', { expiresAt: 1000 }, { Cookie: cookie, Origin: 'https://other.invalid' })).status, 403)
    const created = await send('/api/control/invites', { expiresAt: 1000 }, { Cookie: cookie })
    const invite = await created.json() as { url: string; code: string }
    const token = new URL(invite.url).hash.slice('#invite='.length)
    assert.equal((await send('/api/play/invite', { token, idToken: 'forged', name: 'Guest' }, { Origin: 'https://game.example.invalid' })).status, 401)
    const redeemed = await send('/api/play/invite', { token, idToken: 'verified', name: 'Guest' }, { Origin: 'https://game.example.invalid' })
    assert.equal(redeemed.status, 200)
    assert.equal(redeemed.headers.get('Access-Control-Allow-Origin'), 'https://game.example.invalid')
    assert.equal((await f.publisher.read(`roomAccess/${invite.code}/verified-uid`)).value !== null, true)
    assert.equal((await send('/api/play/operator', { idToken: 'verified' }, { Cookie: cookie })).status, 200)
    assert.equal((await send('/api/admin/logout', {}, { Cookie: cookie })).status, 200)
    assert.equal((await send('/api/play/operator', { idToken: 'verified' }, { Cookie: cookie })).status, 401)
  } finally { f.database.close() }
})

test('Firebase publication uses version conditions, a constrained override identity and no credential in URLs', async () => {
  const requests: { url: URL; options: RequestInit }[] = []
  const publisher = new FirebasePublisher('https://demo-default-rtdb.europe-west1.firebasedatabase.app', async () => 'private-oauth-token', (async (input, options) => {
    requests.push({ url: new URL(String(input)), options: options! })
    return requests.length === 1 ? new Response('null', { headers: { etag: 'version' } }) : new Response('{}', { status: 412 })
  }) as typeof fetch)
  assert.equal((await publisher.read('operating/config')).etag, 'version')
  assert.equal(await publisher.write('operating/config', INITIAL_OPERATING, 'version'), false)
  assert.equal(new Headers(requests[0].options.headers).get('Authorization'), 'Bearer private-oauth-token')
  assert.equal(requests[0].url.href.includes('private-oauth-token'), false)
  assert.equal(JSON.parse(requests[0].url.searchParams.get('auth_variable_override')!).token.operatingPublisher, true)
  assert.equal(new Headers(requests[1].options.headers).get('If-Match'), 'version')
  await assert.rejects(publisher.read('gameSnapshots/AAAA/1/host'))
  await assert.rejects(publisher.read('rooms'))
})

test('worker serves admin assets with a strict policy and fails closed without private configuration', async () => {
  const env = { ADMIN_ORIGIN: 'https://admin.example.invalid' } as OperatingEnvironment
  const context = { waitUntil() {} }
  const page = await worker.fetch(new Request('https://admin.example.invalid/admin/'), env, context)
  assert.equal(page.status, 200)
  assert.ok(page.headers.get('Content-Security-Policy')?.includes("script-src 'self'"))
  assert.ok((await page.text()).includes('Public single player'))
  assert.equal((await worker.fetch(new Request('https://admin.example.invalid/api/access'), env, context)).status, 503)
})

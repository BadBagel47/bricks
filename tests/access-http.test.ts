import assert from 'node:assert/strict'
import { test } from 'node:test'
import { accessDatabase } from './fixtures/access-database.ts'
import { MagicLinks, privateSubject } from '../modules/access-control/magic-links.ts'
import { AdminSessions, D1SessionStore } from '../modules/access-control/sessions.ts'
import { AdminHttp } from '../modules/access-control/http.ts'

const origin = 'https://admin.example.invalid'
async function setup() {
  const { database, store, sql } = accessDatabase()
  const sent: { email: string; token: string }[] = [], tasks: Promise<void>[] = []
  const subject = await privateSubject('bricks', 'admin@example.invalid', 's'.repeat(32))
  database.prepare('INSERT INTO admins VALUES (?, 1)').run(subject)
  const links = new MagicLinks('bricks', 's'.repeat(32), store, { async send(email, token) { sent.push({ email, token }) } })
  const sessions = new AdminSessions('bricks', new D1SessionStore(sql))
  let now = 100
  const api = new AdminHttp(origin, links, sessions, () => now)
  const context = { source: 'trusted-source', waitUntil(task: Promise<void>) { tasks.push(task) } }
  const send = (path: string, input: object, extra: Record<string, string> = {}) => api.handle(new Request(`${origin}/api/admin/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'X-Admin-Request': '1', ...extra }, body: JSON.stringify(input),
  }), context)
  return { database, sent, tasks, links, sessions, api, context, send, setTime(value: number) { now = value } }
}

test('request-link responds identically for known and unknown addresses; GET/scanners never redeem', async () => {
  const f = await setup()
  try {
    const allowed = await f.send('request-link', { email: 'admin@example.invalid' })
    const unknown = await f.send('request-link', { email: 'unknown@example.invalid' })
    assert.equal(allowed.status, 202)
    assert.equal(await allowed.text(), await unknown.text())
    assert.equal(allowed.headers.get('cache-control'), 'no-store')
    await Promise.all(f.tasks)
    assert.equal(f.sent.length, 1)
    assert.equal((await f.api.handle(new Request(`${origin}/api/admin/redeem#${f.sent[0].token}`), f.context)).status, 404)
    assert.equal((await f.send('redeem', { token: f.sent[0].token })).status, 200)
    assert.equal((await f.send('redeem', { token: f.sent[0].token })).status, 401)
  } finally { f.database.close() }
})

test('redeem issues private scoped cookie, supports logout, expiry and revoked administrators', async () => {
  const f = await setup()
  try {
    await f.send('request-link', { email: 'admin@example.invalid' }); await Promise.all(f.tasks)
    const response = await f.send('redeem', { token: f.sent[0].token })
    const setCookie = response.headers.get('set-cookie')!
    assert.match(setCookie, /^__Host-admin-bricks=[a-f0-9]{64}; Path=\//)
    for (const required of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Max-Age=1800']) assert.ok(setCookie.includes(required))
    const cookie = setCookie.split(';')[0]
    const check = () => f.api.handle(new Request(`${origin}/api/admin/session`, { headers: { Cookie: cookie } }), f.context)
    const status = await check()
    assert.deepEqual(await status.json(), { authenticated: true, expiresAt: 100 + 30 * 60_000 })
    f.database.prepare('UPDATE admins SET enabled = 0').run()
    assert.equal((await check()).status, 401)
    f.database.prepare('UPDATE admins SET enabled = 1').run()
    f.setTime(100 + 30 * 60_000)
    assert.equal((await check()).status, 401)
    f.setTime(200)
    const logout = await f.send('logout', {}, { Cookie: cookie })
    assert.ok(logout.headers.get('set-cookie')?.includes('Max-Age=0'))
    assert.equal((await check()).status, 401)
  } finally { f.database.close() }
})

test('admin POSTs reject CSRF, missing origin, oversized bodies and tokens in query parameters', async () => {
  const f = await setup()
  try {
    assert.equal((await f.send('request-link', { email: 'admin@example.invalid' }, { Origin: 'https://other.invalid' })).status, 403)
    assert.equal((await f.send('request-link', { email: 'admin@example.invalid' }, { Origin: '' })).status, 403)
    assert.equal((await f.send('request-link', { email: 'admin@example.invalid' }, { 'X-Admin-Request': '' })).status, 403)
    assert.equal((await f.send('request-link', { email: 'a'.repeat(2000) })).status, 400)
    assert.equal((await f.send('request-link', { email: 'admin@example.invalid', source: 'forged' })).status, 400)
    assert.equal((await f.send('redeem?token=secret', { token: 'a'.repeat(64) })).status, 400)
    assert.equal(f.tasks.length, 0)
  } finally { f.database.close() }
})

test('mail failure is generic, invalidates the link and does not refund the outbound budget', async () => {
  const f = await setup()
  try {
    const links = new MagicLinks('bricks', f.links.secret, f.links.store, { async send() { throw new Error('private provider information') } })
    const api = new AdminHttp(origin, links, f.sessions, () => 100)
    const response = await api.handle(new Request(`${origin}/api/admin/request-link`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'X-Admin-Request': '1' }, body: JSON.stringify({ email: 'admin@example.invalid' }),
    }), f.context)
    assert.equal(response.status, 202)
    await Promise.all(f.tasks)
    assert.equal(f.database.prepare('SELECT COUNT(*) AS n FROM magic_links').get()?.n, 0)
    assert.equal(f.database.prepare("SELECT used FROM rate_windows WHERE key = 'mail:daily'").get()?.used, 1)
  } finally { f.database.close() }
})

test('simultaneous HTTP redemption succeeds once and successful reauthentication revokes the old session', async () => {
  const f = await setup()
  try {
    await f.send('request-link', { email: 'admin@example.invalid' }); await Promise.all(f.tasks)
    const pair = await Promise.all([f.send('redeem', { token: f.sent[0].token }), f.send('redeem', { token: f.sent[0].token })])
    assert.deepEqual(pair.map(x => x.status).sort(), [200, 401])
    const oldCookie = pair.find(x => x.status === 200)!.headers.get('set-cookie')!.split(';')[0]
    await f.send('request-link', { email: 'admin@example.invalid' }); await Promise.all(f.tasks)
    const next = await f.send('redeem', { token: f.sent[1].token }, { Cookie: oldCookie })
    assert.equal(next.status, 200)
    const check = (cookie: string) => f.api.handle(new Request(`${origin}/api/admin/session`, { headers: { Cookie: cookie } }), f.context)
    assert.equal((await check(oldCookie)).status, 401)
    const nextCookie = next.headers.get('set-cookie')!.split(';')[0]
    assert.equal((await check(nextCookie)).status, 200)
    assert.equal((await check(`${nextCookie}; ${nextCookie}`)).status, 401)
  } finally { f.database.close() }
})

test('missing trusted source fails closed even with a forged client IP header', async () => {
  const f = await setup()
  try {
    const response = await f.api.handle(new Request(`${origin}/api/admin/request-link`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'X-Admin-Request': '1', 'CF-Connecting-IP': 'forged' },
      body: JSON.stringify({ email: 'admin@example.invalid' }),
    }), { source: '', waitUntil(task) { f.tasks.push(task) } })
    assert.equal(response.status, 202)
    assert.equal(f.tasks.length, 0)
    assert.equal(f.sent.length, 0)
  } finally { f.database.close() }
})

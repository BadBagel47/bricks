import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright-core'
import { accessDatabase } from './fixtures/access-database.ts'
import { OperatingControls } from '../server/operating/controls.ts'
import { firebaseIdentity } from '../server/operating/credentials.ts'
import { parseOperating } from '../modules/access-control/operating.ts'
import { seedOperating } from './fixtures/seed-operating.mjs'

const base = 'http://127.0.0.1:4244', backend = 'https://operating.example.invalid'
let browser, server, state, controls
const fetchDatabase = async (path, init = {}) => {
  const response = await fetch(`http://127.0.0.1:9000/${path}.json?ns=demo-bricks-default-rtdb`, { ...init, headers: { Authorization: 'Bearer owner', ...init.headers } })
  assert.ok(response.ok || response.status === 412)
  return response
}
before(async () => {
  assert.ok(process.env.FIREBASE_DATABASE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST)
  await seedOperating(); state = accessDatabase()
  controls = new OperatingControls({
    async read(path) { const response = await fetchDatabase(path, { headers: { 'X-Firebase-ETag': 'true' } }); return { value: await response.json(), etag: response.headers.get('etag') } },
    async write(path, value, etag) { return (await fetchDatabase(path, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(etag ? { 'If-Match': etag } : {}) }, body: JSON.stringify(value) })).status !== 412 },
  }, state.sql, 'bricks', 'https://game.example.invalid/')
  const env = { ...process.env, VITE_FIREBASE_USE_EMULATORS: 'true', VITE_OPERATING_ORIGIN: backend }
  for (const key of ['API_KEY', 'AUTH_DOMAIN', 'DATABASE_URL', 'PROJECT_ID', 'APP_ID']) env[`VITE_FIREBASE_${key}`] = ''
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4244', '--strictPort'], { env, stdio: 'pipe' })
  const end = Date.now() + 30000
  while (true) {
    try { if ((await fetch(base)).ok) break } catch { /* wait for Vite */ }
    assert.ok(Date.now() < end); await new Promise(resolve => setTimeout(resolve, 100))
  }
  const executablePath = process.env.BRICKS_CHROMIUM_EXECUTABLE || ['/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync)
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
}, { timeout: 60000 })
after(async () => { await browser?.close(); server?.kill(); state?.database.close() })

async function pageIn(context) {
  const verify = firebaseIdentity('demo-bricks', 'demo-bricks-key', async (input, init) => {
    const url = new URL(String(input)); return fetch(`http://127.0.0.1:9099/${url.hostname}${url.pathname}${url.search}`, init)
  })
  // Transport adapter only: real anonymous Auth Emulator tokens and actual RTDB
  // rules are used. Cloudflare/OAuth/D1 deployment is tested separately.
  await context.route(`${backend}/**`, async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    const headers = { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Request', 'Content-Type': 'application/json' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    try {
      if (path === '/api/access') return route.fulfill({ status: 200, headers, body: JSON.stringify({ config: await controls.config(), serverTime: Date.now() }) })
      if (path === '/api/play/invite') {
        const { token, name, idToken } = request.postDataJSON()
        const result = await controls.redeem(token, await verify(idToken), name, Date.now())
        return route.fulfill({ status: 200, headers, body: JSON.stringify(result) })
      }
      return route.fulfill({ status: 404, headers, body: '{}' })
    } catch (error) { return route.fulfill({ status: 403, headers, body: JSON.stringify({ error: error.message }) }) }
  })
  const page = await context.newPage(); page.setDefaultTimeout(10000); return page
}
async function join(page, link, name) {
  await page.goto(link)
  await page.getByLabel('Player name', { exact: true }).fill(name)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

test('private link admits two real identities while closed; code-only access fails and revoked invitations let gameplay continue', { timeout: 60000 }, async () => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()])
  try {
    const current = await controls.config()
    await controls.update({ ...current, revision: current.revision + 1, multi: { mode: 'off', expiresAt: null } }, Date.now())
    const invite = await controls.create(Date.now() + 60000, Date.now())
    const url = new URL(invite.url); url.protocol = 'http:'; url.host = '127.0.0.1:4244'
    const [host, guest, outsider] = await Promise.all(contexts.map(pageIn))
    await join(host, url.href, 'Private Host')
    try { await host.getByRole('heading', { name: `Room ${invite.code}`, exact: true }).waitFor() }
    catch (error) { throw new Error(`Host: ${await host.locator('body').innerText()}`, { cause: error }) }
    assert.equal(new URL(host.url()).hash, '')
    await join(guest, url.href, 'Private Guest')
    await guest.getByRole('heading', { name: `Room ${invite.code}`, exact: true }).waitFor()
    assert.ok((await guest.getByLabel('Invite link', { exact: true }).inputValue()).includes('#invite='))
    await join(outsider, `${base}/?room=${invite.code}`, 'Outsider')
    await outsider.getByRole('alert').waitFor()
    assert.equal(await outsider.getByRole('heading', { name: `Room ${invite.code}`, exact: true }).count(), 0)
    await guest.reload()
    await guest.getByRole('heading', { name: `Room ${invite.code}`, exact: true }).waitFor()
    assert.equal(await guest.getByRole('button', { name: 'Copy Invite Link', exact: true }).count(), 0, 'Reload does not offer an incomplete private link')
    await host.getByRole('button', { name: 'Start Match', exact: true }).click()
    await Promise.all([host.locator('.multiplayer-game').waitFor(), guest.locator('.multiplayer-game').waitFor()])
    await controls.revoke(invite.id)
    assert.equal(await host.locator('.multiplayer-game').isVisible(), true)
    assert.equal(await guest.locator('.multiplayer-game').isVisible(), true)
    const saved = await (await fetchDatabase(`matchStarts/${invite.code}/1`)).json()
    assert.equal(saved.status, 'ready')
    const before = await (await fetchDatabase(`gameSnapshots/${invite.code}/1/${saved.guestUid}`)).json()
    await guest.bringToFront(); await guest.keyboard.press('ArrowLeft')
    const deadline = Date.now() + 5000
    while (true) {
      const after = await (await fetchDatabase(`gameSnapshots/${invite.code}/1/${saved.guestUid}`)).json()
      if (after && after.seq > (before?.seq ?? 0)) break
      assert.ok(Date.now() < deadline, 'Snapshots still publish after revocation')
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    assert.equal(parseOperating((await controls.publisher.read('operating/config')).value).multi.mode, 'off')
  } finally { for (const context of contexts) await context.close() }
})

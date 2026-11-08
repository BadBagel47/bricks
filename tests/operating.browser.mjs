import assert from 'node:assert/strict'
import { createServer } from 'node:https'
import { readFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright-core'
import { accessDatabase } from './fixtures/access-database.ts'
import { MemoryPublisher } from './fixtures/operating-publisher.ts'
import { AdminHttp } from '../modules/access-control/http.ts'
import { AdminSessions, D1SessionStore } from '../modules/access-control/sessions.ts'
import { MagicLinks, privateSubject } from '../modules/access-control/magic-links.ts'
import { OperatingControls } from '../server/operating/controls.ts'
import { OperatingApi } from '../server/operating/api.ts'
import { adminHTML, adminCSS, adminJS } from '../server/operating/admin-page.ts'

const origin = 'https://127.0.0.1:4262'
let browser, server, database, magic, sent, api, now, controls
before(async () => {
  const temp = '/tmp/bricks-operating-browser'
  await mkdir(temp, { recursive: true })
  if (!existsSync(`${temp}/key.pem`)) execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', `${temp}/key.pem`, '-out', `${temp}/cert.pem`, '-days', '2', '-subj', '/CN=localhost'], { stdio: 'ignore' })
  const state = accessDatabase(); database = state.database
  const subject = await privateSubject('bricks', 'admin@example.invalid', 's'.repeat(32))
  database.prepare('INSERT INTO admins VALUES (?, 1)').run(subject)
  const publisher = new MemoryPublisher()
  await publisher.write(`adminAllowlist/${subject}`, true)
  now = Date.now(); sent = []
  magic = new MagicLinks('bricks', 's'.repeat(32), state.store, { async send(_email, token) { sent.push(token) } })
  const auth = new AdminHttp(origin, magic, new AdminSessions('bricks', new D1SessionStore(state.sql)), () => now)
  controls = new OperatingControls(publisher, state.sql, 'bricks', `${origin}/play/`)
  await controls.initialize()
  api = new OperatingApi(auth, controls, async () => { throw new Error('No multiplayer identity in this isolated browser test') })
  server = createServer({ key: await readFile(`${temp}/key.pem`), cert: await readFile(`${temp}/cert.pem`) }, async (incoming, outgoing) => {
    try {
      const chunks = []; for await (const chunk of incoming) chunks.push(chunk)
      const url = new URL(incoming.url, origin)
      let response
      if (url.pathname.startsWith('/api/')) {
        const request = new Request(url, { method: incoming.method, headers: incoming.headers, ...(incoming.method === 'POST' ? { body: Buffer.concat(chunks) } : {}) })
        response = await api.handle(request, { source: 'browser-test', waitUntil(task) { void task } })
      } else if (url.pathname === '/admin/') response = new Response(adminHTML, { headers: { 'Content-Type': 'text/html', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'" } })
      else if (url.pathname === '/admin/app.js') response = new Response(adminJS, { headers: { 'Content-Type': 'text/javascript' } })
      else if (url.pathname === '/admin/style.css') response = new Response(adminCSS, { headers: { 'Content-Type': 'text/css' } })
      else if (url.pathname.startsWith('/play/')) {
        const relative = url.pathname.slice('/play/'.length) || 'index.html'
        if (relative.includes('..')) throw new Error('Invalid asset')
        const content = await readFile(new URL(`../dist/${relative}`, import.meta.url))
        const type = relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.css') ? 'text/css' : relative.endsWith('.svg') ? 'image/svg+xml' : 'text/html'
        response = new Response(content, { headers: { 'Content-Type': type, 'Referrer-Policy': 'no-referrer' } })
      } else response = new Response('', { status: 404 })
      outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(Buffer.from(await response.arrayBuffer()))
    } catch { outgoing.writeHead(500); outgoing.end('Unavailable') }
  })
  await new Promise(resolve => server.listen(4262, '127.0.0.1', resolve))
  const executablePath = process.env.BRICKS_CHROMIUM_EXECUTABLE || ['/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync)
  assert.ok(executablePath)
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
}, { timeout: 60000 })
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); database?.close() })

async function login(page) {
  await magic.request('admin@example.invalid', 'browser-test', now)
  const token = sent.at(-1)
  await page.goto(`${origin}/admin/#token=${token}`)
  await page.getByRole('button', { name: 'Continue sign-in', exact: true }).waitFor()
  assert.equal(new URL(page.url()).hash, '')
  assert.ok(database.prepare('SELECT COUNT(*) AS n FROM magic_links').get().n > 0, 'GET does not consume the link')
  await page.getByRole('button', { name: 'Continue sign-in', exact: true }).click()
  await page.getByRole('button', { name: 'Save access', exact: true }).waitFor()
}
async function name(page, value) {
  await page.getByLabel('Player name', { exact: true }).fill(value)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

test('admin signs in explicitly, changes public access, creates/revokes invitations and signs out on mobile', { timeout: 60000 }, async () => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } })
  try {
    const page = await context.newPage(), exceptions = []
    page.on('pageerror', error => exceptions.push(error.message))
    await login(page)
    assert.equal(await page.getByLabel('Access', { exact: true }).first().inputValue(), 'on')
    await page.locator('#single').selectOption('off')
    await page.locator('#multi').selectOption('off')
    await page.getByRole('button', { name: 'Save access', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Access saved.' }).waitFor()
    assert.equal((await controls.config()).single.mode, 'off')
    await page.getByRole('button', { name: 'Create invitation', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Invitation created.' }).waitFor()
    const link = new URL(await page.getByLabel('Invitation link', { exact: true }).inputValue())
    assert.match(link.searchParams.get('room'), /^[A-HJ-NP-Z2-9]{4}$/)
    assert.match(link.hash, /^#invite=[a-f0-9]{64}$/)
    const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth).map(el => `${el.tagName}#${el.id}:${Math.round(el.getBoundingClientRect().right)}`) }))
    assert.ok(overflow.scroll <= overflow.width, `Horizontal overflow: ${JSON.stringify(overflow)}`)
    await page.getByRole('button', { name: 'Revoke', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Invitation revoked.' }).waitFor()
    const policy = await controls.config()
    await controls.update({ ...policy, revision: policy.revision + 1, single: { mode: 'until', expiresAt: now + 1000 } }, now)
    now += 2000
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Refreshed.' }).waitFor()
    await page.locator('#multi').selectOption('on')
    await page.getByRole('button', { name: 'Save access', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Access saved.' }).waitFor()
    assert.equal((await controls.config()).multi.mode, 'on', 'An expired solo timer does not prevent independent multiplayer updates')
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await page.getByRole('button', { name: 'Send sign-in link', exact: true }).waitFor()
    assert.equal(await page.getByLabel('Invitation link', { exact: true }).inputValue(), '')
    assert.deepEqual(exceptions, [])
  } finally { await context.close() }
})

test('closed single player rejects visitors, admits administrator and lets the round continue after session expiry', { timeout: 60000 }, async () => {
  const admin = await browser.newContext({ ignoreHTTPSErrors: true }), visitor = await browser.newContext({ ignoreHTTPSErrors: true })
  try {
    const management = await admin.newPage()
    await login(management)
    const publicPage = await visitor.newPage()
    await publicPage.goto(`${origin}/play/`); await name(publicPage, 'Visitor')
    await publicPage.getByRole('button', { name: '1 Player', exact: true }).click()
    await publicPage.getByRole('status').filter({ hasText: 'Single player is currently closed.' }).waitFor()
    assert.equal(await publicPage.getByRole('img', { name: 'Game board, 10 columns by 20 rows' }).count(), 0)
    const game = await admin.newPage()
    await game.goto(`${origin}/play/`); await name(game, 'Administrator')
    await game.getByRole('button', { name: '1 Player', exact: true }).click()
    await game.getByRole('img', { name: 'Game board, 10 columns by 20 rows' }).waitFor()
    now += 31 * 60_000
    await management.getByRole('button', { name: 'Refresh', exact: true }).click()
    await management.getByRole('button', { name: 'Send sign-in link', exact: true }).waitFor()
    assert.equal(await game.getByRole('img', { name: 'Game board, 10 columns by 20 rows' }).isVisible(), true)
    await game.keyboard.press('Escape')
    await game.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Main menu', exact: true }).click()
    await game.getByRole('button', { name: '1 Player', exact: true }).click()
    await game.getByRole('status').filter({ hasText: 'Single player is currently closed.' }).waitFor()
  } finally { await admin.close(); await visitor.close() }
})

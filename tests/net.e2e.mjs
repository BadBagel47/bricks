// F-028: Bricks 2 Players on network-kit, end to end: the room Worker in local workerd
// (wrangler dev), a build that talks to it, and two real browser sessions.
import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright-core'

const ROOMS = 'http://127.0.0.1:8790'
const PAGE = 'http://127.0.0.1:4173/'
const OUT = 'dist-net-test'
const children = []
let browser

async function waitFor(url, label, child, headers = {}) {
  const deadline = Date.now() + 90000
  while (true) {
    try { if ((await fetch(url, { headers })).ok) return } catch { /* not up yet */ }
    assert.equal(child.exitCode, null, `${label} stopped`)
    assert.ok(Date.now() < deadline, `${label} did not start`)
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

before(async () => {
  const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', OUT, '--emptyOutDir'], { env: { ...process.env, VITE_ROOMS_ORIGIN: ROOMS }, encoding: 'utf8' })
  assert.equal(build.status, 0, build.stderr)
  const env = { ...process.env, WRANGLER_SEND_METRICS: 'false', XDG_CONFIG_HOME: `${process.cwd()}/.wrangler-test-config` }
  for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']) delete env[key]
  const rooms = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--config', 'wrangler.rooms.jsonc', '--var', 'ROOM_JURISDICTION:', '--port', '8790', '--ip', '127.0.0.1'], { env, stdio: 'pipe' })
  const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', OUT, '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'pipe' })
  children.push(rooms, preview)
  await waitFor(`${ROOMS}/rooms`, 'Room server', rooms, { Origin: 'http://127.0.0.1:4173' })
  await waitFor(PAGE, 'Preview', preview)
  const executablePath = process.env.BRICKS_CHROMIUM_EXECUTABLE || ['/usr/bin/chromium', '/usr/bin/google-chrome', '/opt/pw-browsers/chromium'].find(existsSync)
  browser = await chromium.launch({ ...(executablePath && !executablePath.endsWith('pw-browsers/chromium') ? { executablePath } : {}), args: ['--no-sandbox'] })
}, { timeout: 180000 })

after(async () => {
  await browser?.close()
  for (const child of children) child.kill('SIGTERM')
  rmSync(OUT, { recursive: true, force: true })
})

async function player(name) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } })
  await context.addInitScript(([n]) => {
    localStorage.setItem('bricks.username', n)
    localStorage.setItem('bricks.net-backend.v1', 'cloudflare')
    localStorage.setItem('bricks.personal.v1', JSON.stringify({ musicEnabled: false, effectsEnabled: false }))
  }, [name])
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  return { context, page, errors }
}

async function lobby() {
  const host = await player('Host One'), guest = await player('Guest Two')
  await host.page.goto(PAGE)
  await host.page.getByRole('button', { name: '2 Players', exact: true }).click()
  await host.page.getByRole('button', { name: 'Host Game', exact: true }).click()
  const heading = host.page.locator('h1[aria-label^="Room "]')
  await heading.waitFor({ timeout: 20000 })
  const code = (await heading.getAttribute('aria-label')).slice(5)
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/, 'six-character room codes')
  await guest.page.goto(`${PAGE}#room=${code}`)
  await guest.page.locator('h1[aria-label^="Room "]').waitFor({ timeout: 20000 })
  return { host, guest, code }
}

async function startMatch(host) {
  const start = host.page.getByRole('button', { name: 'Start Match', exact: true })
  for (let i = 0; i < 100 && await start.isDisabled(); i++) await host.page.waitForTimeout(100)
  await start.click()
  await host.page.getByText(/^Starting in/).waitFor({ timeout: 10000 })
  await host.page.waitForTimeout(5600)
}

async function topOut(page) {
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Space')
    if (await page.getByText('Game over', { exact: true }).first().isVisible()) return
  }
  const state = await page.evaluate(() => ({ status: [...document.querySelectorAll('.multiplayer-game [role=status], .multiplayer-game .match-note')].map(e => e.textContent), focus: document.activeElement?.tagName, text: document.body.innerText.slice(0, 300) }))
  assert.fail(`Game over never came: ${JSON.stringify(state)}`)
}

test('Score Duel through a network-kit room: invite link, countdown, play, shared result, measurement, rematch', async () => {
  const { host, guest } = await lobby()
  await startMatch(host)
  await topOut(host.page); await topOut(guest.page)
  for (const p of [host.page, guest.page]) await p.getByRole('button', { name: 'Rematch', exact: true }).waitFor({ timeout: 20000 })
  const saved = await host.page.evaluate(() => JSON.parse(localStorage.getItem('bricks.multiplayer-results.v1')).matches)
  const theirs = await guest.page.evaluate(() => JSON.parse(localStorage.getItem('bricks.multiplayer-results.v1')).matches)
  assert.equal(saved.length, 1)
  assert.deepEqual(saved, theirs, 'both devices store the same match')
  assert.match(await host.page.locator('.connection-line').textContent(), /Connection \(Cloudflare\): delay \d+ ms/)
  await host.page.getByRole('button', { name: 'Rematch', exact: true }).click()
  await guest.page.getByRole('button', { name: 'Rematch', exact: true }).click()
  const start = host.page.getByRole('button', { name: 'Start Match', exact: true })
  for (let i = 0; i < 100 && await start.isDisabled(); i++) await host.page.waitForTimeout(100)
  assert.equal(await start.isDisabled(), false, 'a rematch can start once both are back in the lobby')
  assert.deepEqual([...host.errors, ...guest.errors], [])
  await host.context.close(); await guest.context.close()
}, { timeout: 120000 })

test('Battle settles by survival; a lost connection pauses both games; leaving ends the match without a result', async () => {
  const { host, guest } = await lobby()
  await host.page.getByRole('radio', { name: 'Battle', exact: true }).click()
  await startMatch(host)
  await guest.context.setOffline(true)
  await host.page.getByText('Match paused. Waiting for reconnection…').waitFor({ timeout: 20000 })
  await guest.context.setOffline(false)
  await host.page.getByText('Match paused. Waiting for reconnection…').waitFor({ state: 'hidden', timeout: 40000 })
  await topOut(host.page); await topOut(guest.page)
  await host.page.getByRole('heading', { name: 'You lose', exact: true }).waitFor({ timeout: 20000 })
  await guest.page.getByRole('heading', { name: 'You win', exact: true }).waitFor({ timeout: 20000 })
  assert.match(await host.page.locator('.connection-line').textContent(), /1 reconnect/)
  await host.page.getByRole('button', { name: 'Rematch', exact: true }).click()
  await guest.page.getByRole('button', { name: 'Rematch', exact: true }).click()
  await startMatch(host)
  await guest.page.keyboard.press('Escape')
  await guest.page.getByRole('button', { name: 'Return to lobby', exact: true }).last().click()
  await host.page.getByText('Your opponent left the match. No result is recorded.').waitFor({ timeout: 15000 })
  assert.deepEqual([...host.errors, ...guest.errors], [])
  await host.context.close(); await guest.context.close()
}, { timeout: 150000 })

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright-core'

let server
let browser
const baseURL = 'http://127.0.0.1:4241'
before(async () => {
  assert.ok(process.env.FIREBASE_DATABASE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST)
  const env = { ...process.env, VITE_FIREBASE_USE_EMULATORS: 'true' }
  for (const key of ['API_KEY', 'AUTH_DOMAIN', 'DATABASE_URL', 'PROJECT_ID', 'APP_ID']) env[`VITE_FIREBASE_${key}`] = ''
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4241', '--strictPort'], { stdio: 'pipe', env })
  let startup = ''
  server.stdout.on('data', chunk => { startup += chunk })
  server.stderr.on('data', chunk => { startup += chunk })
  const deadline = Date.now() + 30000
  while (true) {
    try { if ((await fetch(baseURL)).ok) break } catch { /* Wait for Vite. */ }
    assert.equal(server.exitCode, null, startup)
    assert.ok(Date.now() < deadline, startup)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  const executablePath = process.env.BRICKS_CHROMIUM_EXECUTABLE || ['/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync)
  assert.ok(executablePath)
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
}, { timeout: 60000 })
after(async () => { await browser?.close(); server?.kill('SIGTERM') })

async function name(page, value) {
  await page.getByLabel('Player name', { exact: true }).fill(value)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}
const menu = page => page.getByRole('button', { name: '← Back to menu', exact: true }).click()

test('real room UI: host, change code, invite onboarding, join/reload, errors, leave, close and reopen', { timeout: 60000 }, async () => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()])
  try {
    const [host, guest, third] = await Promise.all(contexts.map(context => context.newPage()))
    for (const page of [host, guest, third]) page.setDefaultTimeout(12000)
    await host.goto(baseURL)
    await name(host, 'Host Player')
    await host.getByRole('button', { name: '2 Players', exact: true }).click()
    await host.getByRole('button', { name: 'Host Game', exact: true }).click()
    await host.getByRole('heading', { name: /^Room [A-HJ-NP-Z2-9]{8}$/ }).waitFor()
    await host.getByLabel('Room code', { exact: true }).fill('brks77')
    await host.getByRole('button', { name: 'Change Code', exact: true }).click()
    await host.getByRole('heading', { name: 'Room BRKS77', exact: true }).waitFor()
    const invite = await host.getByLabel('Invite link', { exact: true }).inputValue()
    assert.equal(new URL(invite).searchParams.get('room'), 'BRKS77')
    assert.equal(new URL(invite).origin, baseURL)
    await contexts[0].grantPermissions(['clipboard-read', 'clipboard-write'])
    await host.bringToFront()
    await host.getByRole('button', { name: 'Copy Code', exact: true }).click()
    await host.getByRole('status').filter({ hasText: 'Code copied.' }).waitFor()
    assert.equal(await host.evaluate(() => navigator.clipboard.readText()), 'BRKS77')
    await host.getByRole('button', { name: 'Copy Invite Link', exact: true }).click()
    await host.getByRole('status').filter({ hasText: 'Invite link copied.' }).waitFor()
    assert.equal(await host.evaluate(() => navigator.clipboard.readText()), invite)
    await host.evaluate(() => { navigator.clipboard.writeText = async () => { throw new DOMException('Denied', 'NotAllowedError') } })
    await host.getByRole('button', { name: 'Copy Code', exact: true }).click()
    await host.getByRole('status').filter({ hasText: 'Clipboard is unavailable.' }).waitFor()
    assert.equal(await host.getByLabel('Copy text', { exact: true }).inputValue(), 'BRKS77')

    await guest.goto(invite)
    await name(guest, 'Guest Player')
    await guest.getByRole('heading', { name: 'Room BRKS77', exact: true }).waitFor()
    await host.getByText('Guest Player', { exact: true }).waitFor()
    assert.equal(new URL(guest.url()).searchParams.get('room'), 'BRKS77')
    assert.equal(await host.getByRole('button', { name: 'Change Code', exact: true }).isDisabled(), true)
    await guest.reload()
    await guest.getByRole('heading', { name: 'Room BRKS77', exact: true }).waitFor()
    await host.getByText('Guest Player', { exact: true }).waitFor()

    await third.goto(baseURL)
    await name(third, 'Third Player')
    await third.getByRole('button', { name: '2 Players', exact: true }).click()
    await third.getByLabel('Room code', { exact: true }).fill('brks77')
    await third.getByRole('button', { name: 'Join Game', exact: true }).click()
    await third.getByRole('alert').filter({ hasText: 'This room already has two players.' }).waitFor()
    await third.getByLabel('Room code', { exact: true }).fill('ZZZZ77')
    await third.getByRole('button', { name: 'Join Game', exact: true }).click()
    await third.getByRole('alert').filter({ hasText: "This room doesn't exist." }).waitFor()
    await third.getByLabel('Room code', { exact: true }).fill('invalid!')
    await third.getByRole('button', { name: 'Join Game', exact: true }).click()
    await third.getByRole('alert').filter({ hasText: 'Enter a valid room code.' }).waitFor()

    await menu(guest)
    await host.getByText('Waiting for opponent…', { exact: true }).waitFor()
    assert.equal(await host.getByRole('button', { name: 'Change Code', exact: true }).isEnabled(), true)
    await menu(host)
    await third.getByLabel('Room code', { exact: true }).fill('BRKS77')
    await third.getByRole('button', { name: 'Join Game', exact: true }).click()
    await third.getByRole('alert').filter({ hasText: 'This room is currently inactive.' }).waitFor()

    await host.getByRole('button', { name: '2 Players', exact: true }).click()
    await host.getByRole('button', { name: 'Reopen Previous Room', exact: true }).click()
    await host.getByRole('heading', { name: 'Room BRKS77', exact: true }).waitFor()
    await guest.goto(invite)
    await guest.getByRole('heading', { name: 'Room BRKS77', exact: true }).waitFor()
    await host.getByText('Guest Player', { exact: true }).waitFor()
    await host.setViewportSize({ width: 320, height: 667 })
    assert.equal(await host.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    assert.equal(await host.getByRole('button', { name: 'Start Match', exact: true }).count(), 0)

    await menu(third)
    await third.evaluate(() => localStorage.setItem('bricks.previous-room.v1', 'BRKS77'))
    await third.getByRole('button', { name: '2 Players', exact: true }).click()
    await third.getByRole('button', { name: 'Reopen Previous Room', exact: true }).click()
    await third.getByRole('alert').filter({ hasText: 'This room belongs to another player identity.' }).waitFor()
    await host.getByText('Guest Player', { exact: true }).waitFor()
  } finally { for (const context of contexts) await context.close() }
})

import assert from 'node:assert/strict'
import { existsSync, mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { after, afterEach, before, test } from 'node:test'
import { chromium } from 'playwright-core'

const baseURL = 'http://127.0.0.1:4220'
let browser
let server
const contexts = []
const errors = []

before(async () => {
  const executablePath = process.env.BRICKS_CHROMIUM_EXECUTABLE || ['/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync)
  assert.ok(executablePath, 'Set BRICKS_CHROMIUM_EXECUTABLE to an installed Chromium/Chrome browser')
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4220', '--strictPort'], { stdio: 'pipe' })
  let startup = ''
  server.stderr.on('data', (chunk) => { startup += chunk })
  const deadline = Date.now() + 30000
  while (true) {
    try { if ((await fetch(baseURL)).ok) break } catch { /* Wait for Vite readiness. */ }
    assert.equal(server.exitCode, null, startup)
    assert.ok(Date.now() < deadline, `Preview failed to start: ${startup}`)
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
}, { timeout: 60000 })

afterEach(async () => {
  for (const context of contexts.splice(0)) await context.close()
  assert.deepEqual(errors.splice(0), [], 'No browser exceptions or console errors')
})
after(async () => { await browser?.close(); server?.kill('SIGTERM') })

async function open({ viewport = { width: 1280, height: 800 }, personal = {}, singlePlayer = {} } = {}) {
  const context = await browser.newContext({ viewport, hasTouch: true })
  contexts.push(context)
  await context.addInitScript(({ personal, singlePlayer }) => {
    // Deterministic piece stream, simulated controller hardware, and real Web Audio instrumentation.
    const nativeRandom = crypto.getRandomValues.bind(crypto)
    crypto.getRandomValues = (array) => array instanceof Uint32Array && array.length === 1 ? (array[0] = 47, array) : nativeRandom(array)
    window.__pads = []
    Object.defineProperty(navigator, 'getGamepads', { value: () => { if (window.__gamepadDenied) throw new DOMException('Disabled', 'SecurityError'); return window.__pads } })
    window.__audio = { contexts: 0, tones: 0 }
    const NativeAudioContext = window.AudioContext
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) { super(...args); window.__audio.contexts++; window.__audio.state = () => this.state }
      createOscillator() { window.__audio.tones++; return super.createOscillator() }
    }
    if (!sessionStorage.getItem('review-seeded')) {
      localStorage.setItem('bricks.personal.v1', JSON.stringify({ ...personal, version: 1 }))
      localStorage.setItem('bricks.single-player.v1', JSON.stringify({ ...singlePlayer, version: 1 }))
      sessionStorage.setItem('review-seeded', 'yes')
    }
  }, { personal, singlePlayer })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(baseURL)
  await page.getByLabel('Player name', { exact: true }).fill('Original Name')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  return page
}
const start = async (page) => {
  await page.getByRole('button', { name: '1 Player', exact: true }).click()
  await page.getByRole('img', { name: 'Game board, 10 columns by 20 rows' }).waitFor()
}
const cells = (page) => page.locator('.playfield').evaluate((board) => [...board.children].flatMap((cell, index) => cell.classList.contains('filled') ? [index] : []))
const minX = async (page) => Math.min(...(await cells(page)).map((cell) => cell % 10))
const mainMenu = (page) => page.getByRole('button', { name: '← Main menu', exact: true }).click()
const settings = (page) => page.getByRole('button', { name: 'Open personal settings' }).click()
async function finish(page) {
  for (let i = 0; i < 40 && !await page.getByRole('heading', { name: 'Game over', exact: true }).isVisible(); i++) await page.keyboard.press('Space')
  await page.getByRole('heading', { name: 'Game over', exact: true }).waitFor()
}
async function controller(page, buttons = [], connected = true, axes = [0, 0]) {
  await page.evaluate(({ buttons, connected, axes }) => {
    window.__pads = connected ? [{ connected: true, index: 0, mapping: 'standard', axes, buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: buttons.includes(index), value: buttons.includes(index) ? 1 : 0 })) }] : []
  }, { buttons, connected, axes })
  await page.waitForTimeout(70)
}

test('desktop flow: all preview cells, movement, hold, pause/blur, results, rename and replay', async () => {
  const page = await open({ singlePlayer: { holdEnabled: true } })
  await start(page)
  assert.equal(await page.locator('.piece-preview').first().locator('.filled').count(), 4)
  const initial = await minX(page)
  await page.keyboard.press('ArrowLeft')
  assert.equal(await minX(page), initial - 1)
  await page.keyboard.press('KeyC')
  assert.equal(await page.locator('.piece-preview').nth(1).locator('.filled').count(), 4)
  await page.keyboard.press('KeyP')
  await page.getByRole('status').filter({ hasText: 'Game paused.' }).waitFor()
  const paused = await cells(page)
  await page.waitForTimeout(850)
  assert.deepEqual(await cells(page), paused)
  await page.getByRole('button', { name: 'Resume', exact: true }).press('Space')
  await page.getByRole('status').filter({ hasText: 'Game resumed.' }).waitFor()
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await page.getByRole('heading', { name: 'Paused', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await finish(page)
  await page.getByRole('status').filter({ hasText: 'Game over. Final score' }).waitFor()
  assert.equal(await page.locator('.result-card tbody tr').count(), 1)
  await page.getByRole('button', { name: 'Play Again', exact: true }).click()
  assert.equal((await cells(page)).length, 4)
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bricks.highscores.v1')).records.length), 1)
  await mainMenu(page)
  await settings(page)
  await page.getByLabel('Player name', { exact: true }).fill('New Name')
  await page.getByRole('button', { name: 'Save name', exact: true }).click()
  await page.getByRole('button', { name: 'High Scores', exact: true }).click()
  assert.equal(await page.locator('tbody tr').first().locator('td').nth(1).textContent(), 'Original Name')
})

test('keyboard focus follows navigation, enters the board, and returns after resume', async () => {
  const page = await open()
  await start(page)
  await page.waitForFunction(() => document.activeElement === document.querySelector('.playfield'))
  assert.equal(await page.locator('.playfield').evaluate((board) => getComputedStyle(board).outlineStyle), 'solid')
  await page.keyboard.press('KeyP')
  await page.getByRole('button', { name: 'Resume', exact: true }).waitFor()
  await page.keyboard.press('Space')
  await page.waitForFunction(() => document.activeElement === document.querySelector('.playfield'))
  await mainMenu(page)
  await page.waitForFunction(() => document.activeElement?.textContent?.includes('Make room'))
  await settings(page)
  await page.waitForFunction(() => document.activeElement?.textContent === 'Personal settings')
})

test('settings and mappings survive reload; leaving capture does not intercept gameplay', async () => {
  const page = await open()
  await settings(page)
  await page.getByLabel('Hard Drop', { exact: true }).uncheck()
  await page.getByLabel('Hold Piece', { exact: true }).check()
  await page.getByLabel('Starting Level', { exact: true }).selectOption('4')
  const left = page.locator('.binding-row').filter({ hasText: 'Move left' }).first()
  await left.getByRole('button').click(); await page.keyboard.press('a')
  await page.reload(); await settings(page)
  assert.equal(await page.getByLabel('Hard Drop', { exact: true }).isChecked(), false)
  assert.equal(await page.getByLabel('Hold Piece', { exact: true }).isChecked(), true)
  assert.equal(await page.getByLabel('Starting Level', { exact: true }).inputValue(), '4')
  await page.locator('.binding-row').filter({ hasText: 'Soft drop' }).first().getByRole('button').click()
  await page.getByRole('button', { name: '← Back to menu', exact: true }).click()
  await start(page)
  const initial = await minX(page)
  await page.keyboard.press('a')
  assert.equal(await minX(page), initial - 1)
  const before = await cells(page)
  await page.keyboard.press('Space')
  assert.deepEqual(await cells(page), before)
})

test('gamepad digital/analog hold, pause, disconnect fallback and remapping', async () => {
  const page = await open({ viewport: { width: 390, height: 844 } })
  await start(page)
  const initial = await minX(page)
  await controller(page, [14])
  assert.equal(await minX(page), initial - 1)
  await page.waitForTimeout(250)
  assert.equal(await minX(page), 0)
  await controller(page, [], false)
  await page.getByRole('region', { name: 'Touch controls' }).waitFor()
  await controller(page, [], true, [0.8, 0])
  assert.equal(await minX(page), 1)
  await controller(page, [9])
  await page.getByRole('heading', { name: 'Paused', exact: true }).waitFor()
  await controller(page, [])
  await controller(page, [9])
  await page.getByRole('heading', { name: 'Paused', exact: true }).waitFor({ state: 'hidden' })
  await controller(page, [], false)
  await mainMenu(page); await settings(page)
  await page.locator('.binding-row').filter({ hasText: 'Move left' }).nth(1).getByRole('button').click()
  await controller(page, [6])
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('bricks.gamepad-controls.v1'))?.moveLeft === 6)
  await controller(page, [], false)
  await page.getByRole('button', { name: '← Back to menu', exact: true }).click()
  await start(page)
  const x = await minX(page)
  await controller(page, [6])
  assert.equal(await minX(page), x - 1)
})

test('real touch events: held D-pad, pause releases repeats, and swipe movement', async () => {
  const page = await open({ viewport: { width: 390, height: 844 } })
  await start(page)
  const cdp = await page.context().newCDPSession(page)
  const right = await page.getByRole('button', { name: 'Move right', exact: true }).boundingBox()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: right.x + right.width / 2, y: right.y + right.height / 2 }] })
  await page.waitForTimeout(210)
  assert.ok(await minX(page) >= 5)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  const x = await minX(page)
  await page.waitForTimeout(300)
  assert.equal(await minX(page), x)
  await mainMenu(page); await settings(page)
  await page.getByLabel('Control method', { exact: true }).selectOption('swipe')
  await page.getByRole('button', { name: '← Back to menu', exact: true }).click()
  await start(page)
  const board = await page.getByRole('img', { name: 'Game board, 10 columns by 20 rows' }).boundingBox()
  const initial = await minX(page)
  const point = { x: board.x + board.width / 2, y: board.y + board.height / 2 }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x - 50, y: point.y }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  assert.equal(await minX(page), initial - 1)
})

test('a new game clears keys held during the previous Game Over', async () => {
  const page = await open()
  await start(page)
  await page.keyboard.down('ArrowRight')
  await finish(page)
  await page.getByRole('button', { name: 'Play Again', exact: true }).click()
  await page.waitForTimeout(300)
  assert.equal(await minX(page), 3)
  await page.keyboard.up('ArrowRight')
})

test('gravity preserves elapsed time across a blocked render frame', async () => {
  const page = await open({ personal: { musicEnabled: false, effectsEnabled: false } })
  await start(page)
  await page.waitForTimeout(70)
  await page.evaluate(() => { const until = performance.now() + 600; while (performance.now() < until) { /* Simulate a long main-thread task. */ } })
  await page.waitForTimeout(350)
  assert.ok(Math.min(...(await cells(page)).map((cell) => Math.floor(cell / 10))) >= 1)
})

test('keyboard remains playable when the browser denies gamepad access', async () => {
  const page = await open()
  await page.evaluate(() => { window.__gamepadDenied = true })
  await start(page)
  const initial = await minX(page)
  await page.keyboard.press('ArrowLeft')
  assert.equal(await minX(page), initial - 1)
  await page.waitForTimeout(650)
})

test('real Web Audio initializes after start, pauses and obeys saved mute settings', async () => {
  const page = await open()
  assert.equal(await page.evaluate(() => window.__audio.contexts), 0)
  await start(page)
  await page.waitForFunction(() => window.__audio.tones > 0 && window.__audio.state() === 'running')
  await page.keyboard.press('KeyP'); await page.waitForTimeout(400)
  const stopped = await page.evaluate(() => window.__audio.tones)
  await page.waitForTimeout(450)
  assert.equal(await page.evaluate(() => window.__audio.tones), stopped)
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  assert.ok(await page.evaluate(() => window.__audio.tones) > stopped)
  await mainMenu(page); await settings(page)
  await page.getByLabel('Music', { exact: true }).uncheck()
  await page.getByLabel('Sound effects', { exact: true }).uncheck()
  await page.reload(); await start(page)
  await page.keyboard.press('KeyX'); await page.waitForTimeout(450)
  assert.equal(await page.evaluate(() => window.__audio.tones), 0)
})

for (const viewport of [{ width: 1280, height: 800 }, { width: 320, height: 667 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 800, height: 600 }]) {
  test(`layout ${viewport.width} × ${viewport.height}: complete board and largest touch controls fit`, async () => {
    const page = await open({ viewport, personal: { touchButtonSize: 72 }, singlePlayer: { holdEnabled: true } })
    await start(page)
    const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollHeight: document.documentElement.scrollHeight, scrollWidth: document.documentElement.scrollWidth }))
    assert.ok(dimensions.scrollHeight <= dimensions.height + 1, JSON.stringify(dimensions))
    assert.ok(dimensions.scrollWidth <= dimensions.width + 1, JSON.stringify(dimensions))
    const board = await page.getByRole('img', { name: 'Game board, 10 columns by 20 rows' }).boundingBox()
    assert.ok(board.y >= 0 && board.y + board.height <= viewport.height)
    const controls = page.getByRole('region', { name: 'Touch controls' })
    if (await controls.isVisible()) {
      const controlBox = await controls.boundingBox()
      assert.ok(controlBox.y >= board.y + board.height)
      for (const button of await controls.getByRole('button').all()) {
        const box = await button.boundingBox()
        assert.ok(box.width >= 44 && box.height >= 44)
        assert.ok(box.x >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height)
      }
    }
    if (process.env.BRICKS_SCREENSHOT_DIR) {
      mkdirSync(process.env.BRICKS_SCREENSHOT_DIR, { recursive: true })
      await page.screenshot({ path: `${process.env.BRICKS_SCREENSHOT_DIR}/${viewport.width}x${viewport.height}.png` })
    }
  })
}

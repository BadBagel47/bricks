import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright-core'

let server
let browser
const baseURL = 'http://127.0.0.1:4240'
before(async () => {
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Run with npm run test:firebase')
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4240', '--strictPort'], { stdio: 'pipe' })
  let startup = ''
  server.stderr.on('data', chunk => { startup += chunk })
  server.stdout.on('data', chunk => { startup += chunk })
  const deadline = Date.now() + 30000
  while (true) {
    try { if ((await fetch(baseURL)).ok) break } catch { /* Wait for Vite. */ }
    assert.equal(server.exitCode, null, startup)
    assert.ok(Date.now() < deadline, startup)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  const executablePath = process.env.BRICKS_CHROMIUM_EXECUTABLE || ['/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync)
  assert.ok(executablePath, 'Install Chromium/Chrome or set BRICKS_CHROMIUM_EXECUTABLE')
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
}, { timeout: 60000 })
after(async () => { await browser?.close(); server?.kill('SIGTERM') })

const identify = page => page.evaluate(async () => (await import('/tests/fixtures/firebase-browser.ts')).identify())

test('two browser sessions get distinct persistent anonymous identities', { timeout: 60000 }, async () => {
  const first = await browser.newContext()
  const second = await browser.newContext()
  try {
    const host = await first.newPage()
    const guest = await second.newPage()
    const externalRequests = []
    host.on('request', request => {
      if (/firebaseio\.com|googleapis\.com|firebasedatabase\.app|:9099|:9000/.test(request.url())) externalRequests.push(request.url())
    })
    await host.goto(baseURL)
    await guest.goto(baseURL)
    assert.deepEqual(externalRequests, [], 'The single-player app initializes no Firebase services')
    const owner = await identify(host)
    const opponent = await identify(guest)
    assert.ok(owner.uid)
    assert.equal(owner.sameIdentity, true)
    assert.notEqual(owner.uid, opponent.uid)
    await host.reload()
    assert.equal((await identify(host)).uid, owner.uid, 'Anonymous identity survives a reload')
  } finally {
    await first.close()
    await second.close()
  }
})

test('authenticated browser clients cannot steal another player reservation', { timeout: 60000, skip: !process.env.FIREBASE_DATABASE_EMULATOR_HOST }, async () => {
  const first = await browser.newContext()
  const second = await browser.newContext()
  try {
    const host = await first.newPage()
    const guest = await second.newPage()
    await host.goto(baseURL)
    await guest.goto(baseURL)
    const owner = await identify(host)
    await identify(guest)
    assert.equal(await host.evaluate(async () => (await import('/tests/fixtures/firebase-browser.ts')).reserve('AUTH77')), null)
    assert.equal(await guest.evaluate(async () => (await import('/tests/fixtures/firebase-browser.ts')).reserve('AUTH77')), 'permission')
    assert.equal(await guest.evaluate(async () => (await import('/tests/fixtures/firebase-browser.ts')).ownerOf('AUTH77')), owner.uid)
  } finally {
    await first.close()
    await second.close()
  }
})

import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const local = fileURLToPath(new URL('../.firebase/', import.meta.url))
mkdirSync(local, { recursive: true })
const authOnly = process.argv.slice(2).includes('--auth-only')
const testMode = authOnly || process.argv.slice(2).includes('--test')
const args = [
  fileURLToPath(new URL('../node_modules/firebase-tools/lib/bin/firebase.js', import.meta.url)),
  testMode ? 'emulators:exec' : 'emulators:start',
  '--only', authOnly ? 'auth' : 'auth,database', '--project', 'demo-bricks', '--non-interactive',
]
if (testMode) args.push(authOnly ? 'node --test tests/firebase.auth.mjs' : 'node --test --test-concurrency=1 tests/firebase.*.mjs')
const child = spawn(process.execPath, args, {
  cwd: root, stdio: 'inherit',
  env: {
    ...process.env, CI: 'true', FIREBASE_CLI_DISABLE_MOTD: 'true',
    XDG_CONFIG_HOME: `${local}config`, FIREBASE_EMULATORS_PATH: `${local}emulators`,
  },
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })

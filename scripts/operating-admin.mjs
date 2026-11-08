// Run locally with Node 24. Private configuration and email input never belong
// in command arguments, Git, workflow logs or chat.
import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { serviceAccountToken } from '../server/operating/credentials.ts'
import { FirebasePublisher } from '../server/operating/publisher.ts'
import { privateSubject } from '../modules/access-control/magic-links.ts'
import { INITIAL_OPERATING, parseOperating } from '../modules/access-control/operating.ts'

async function main() {
  const action = process.argv[2]
  if (!['init', 'allow', 'deny'].includes(action)) throw new Error('Invalid action')
  const config = JSON.parse(await readFile(process.env.BRICKS_OPERATING_CONFIG_FILE || '.operating.local', 'utf8'))
  const token = serviceAccountToken(typeof config.FIREBASE_SERVICE_ACCOUNT === 'string' ? config.FIREBASE_SERVICE_ACCOUNT : JSON.stringify(config.FIREBASE_SERVICE_ACCOUNT))
  const publisher = new FirebasePublisher(config.FIREBASE_DATABASE_ORIGIN, token)
  if (action === 'init') {
    // Intentional bootstrap before new rules are installed. This one fixed path
    // uses the underlying admin credential; ordinary Worker requests always use
    // the restricted auth override. Never reset existing settings to open.
    const url = `${publisher.origin}/operating/config.json`
    const headers = { Authorization: `Bearer ${await token()}` }
    const response = await fetch(url, { headers: { ...headers, 'X-Firebase-ETag': 'true' }, redirect: 'error' })
    if (!response.ok) throw new Error('Bootstrap read failed')
    const existing = await response.json()
    if (existing !== null) { parseOperating(existing); console.log('Existing access settings retained.'); return }
    const etag = response.headers.get('etag')
    if (!etag) throw new Error('Bootstrap version unavailable')
    const saved = await fetch(url, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json', 'If-Match': etag }, body: JSON.stringify(INITIAL_OPERATING), redirect: 'error' })
    if (!saved.ok) throw new Error('Bootstrap write failed')
    console.log('Public single player and multiplayer initialized as open.'); return
  }
  if (!/^[a-f0-9]{32}$/.test(config.CLOUDFLARE_ACCOUNT_ID) || !/^[a-f0-9-]{36}$/.test(config.CLOUDFLARE_D1_ID) || !config.CLOUDFLARE_API_TOKEN) throw new Error('Invalid private D1 configuration')
  const terminal = createInterface({ input: stdin, output: stdout })
  let email
  try { email = (await terminal.question('Administrator email (local private input): ')).trim().toLowerCase() } finally { terminal.close() }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email')
  const subject = await privateSubject(config.PROJECT, email, config.SUBJECT_SECRET)
  email = ''
  async function query(sql, params) {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.CLOUDFLARE_ACCOUNT_ID}/d1/database/${config.CLOUDFLARE_D1_ID}/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${config.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ sql, params }), redirect: 'error',
    })
    if (!response.ok) throw new Error('Private database update failed')
    const data = await response.json()
    if (!data.success || !data.result?.[0]?.success) throw new Error('Private database update failed')
    return data.result[0].results
  }
  // Close first; enabling also invalidates previous sessions before reopening.
  // A partial failure remains closed and can be retried idempotently.
  await publisher.write(`adminAllowlist/${subject}`, false)
  await query('INSERT INTO admins (subject, enabled) VALUES (?, 0) ON CONFLICT(subject) DO UPDATE SET enabled = 0', [subject])
  await query('DELETE FROM admin_sessions WHERE subject = ?', [subject])
  const mirrors = await query('SELECT digest FROM operator_mirrors WHERE subject = ?', [subject])
  for (const { digest } of mirrors) await publisher.write(`operatorSessions/${digest}`, { revoked: true, expiresAt: 0, subject: '' })
  if (action === 'allow') {
    await publisher.write(`adminAllowlist/${subject}`, true)
    await query('UPDATE admins SET enabled = 1 WHERE subject = ?', [subject])
  }
  console.log(action === 'allow' ? 'Administrator enabled. Sign in with a new email link.' : 'Administrator disabled and sessions revoked.')
}
try { await main() }
catch { console.error('Operating setup failed. Check private configuration, permissions and service availability. No secrets were printed.'); process.exitCode = 1 }

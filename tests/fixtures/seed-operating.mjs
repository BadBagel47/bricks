export const openOperating = { version: 1, revision: 1, single: { mode: 'on', expiresAt: null }, multi: { mode: 'on', expiresAt: null } }
export async function seedOperating(reset = false) {
  if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) return
  if (reset) {
    const cleared = await fetch('http://127.0.0.1:9000/.json?ns=demo-bricks-default-rtdb', { method: 'DELETE', headers: { Authorization: 'Bearer owner' } })
    if (!cleared.ok) throw new Error('Could not reset emulator test namespace')
  }
  const response = await fetch('http://127.0.0.1:9000/operating/config.json?ns=demo-bricks-default-rtdb', {
    method: 'PUT', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify(openOperating),
  })
  if (!response.ok) throw new Error('Could not seed open emulator operating policy')
}

import { parseOperating } from '../../modules/access-control/operating.ts'
import type { OperatingConfig } from '../../modules/access-control/operating.ts'

let backend: string | null = null
let operatorUntil = 0
const invitations = new Map<string, string>()
const redeemed = new Set<string>()
export function configureAccess(env: Readonly<Record<string, unknown>>, href: string) {
  const page = new URL(href), configured = env.VITE_OPERATING_ORIGIN
  const adminGame = page.pathname.startsWith('/play/')
  backend = adminGame ? page.origin : null
  if (!adminGame && configured !== undefined && configured !== '') {
    if (typeof configured !== 'string') throw new Error('Invalid operating origin')
    const url = new URL(configured)
    if (url.origin !== configured || (url.protocol !== 'https:' && !(env.VITE_FIREBASE_USE_EMULATORS === 'true' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Invalid operating origin')
    backend = configured
  }
  const token = new URLSearchParams(page.hash.slice(1)).get('invite'), code = page.searchParams.get('room')
  if (code && /^[A-HJ-NP-Z2-9]{4,8}$/.test(code) && token && /^[a-f0-9]{64}$/.test(token)) invitations.set(code, token)
}
export function operatingOrigin() { return backend }
export function invitationToken(code: string) { return invitations.get(code) }
export async function accessRequest(path: string, value?: object) {
  if (!backend) throw new Error('Access control is not configured')
  let response: Response
  try {
    response = await fetch(`${backend}${path}`, { method: value === undefined ? 'GET' : 'POST', credentials: backend === location.origin ? 'same-origin' : 'omit', cache: 'no-store',
      headers: value === undefined ? {} : { 'Content-Type': 'application/json', 'X-Admin-Request': '1' }, body: value === undefined ? undefined : JSON.stringify(value), signal: AbortSignal.timeout(8000) })
  } catch { throw new Error('Unable to check access. Check your connection and try again.') }
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to check access. Try again.')
  return result
}
export async function checkSolo() { if (backend) await accessRequest('/api/play/solo', {}) }
export async function checkOperator(getToken: () => Promise<string>) {
  if (!backend || backend !== location.origin || Date.now() < operatorUntil) return
  // The admin game is hosted beside the API; public Pages never sends admin cookies.
  const status = await fetch(`${backend}/api/admin/session`, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(8000) })
  if (!status.ok) return
  const result = await accessRequest('/api/play/operator', { idToken: await getToken() })
  operatorUntil = Math.min(result.expiresAt, Date.now() + 15 * 60_000)
}
export async function redeemInvitation(code: string, name: string, uid: string, getToken: () => Promise<string>) {
  const token = invitationToken(code), key = `${code}:${uid}`
  if (!token || redeemed.has(key)) return
  const result = await accessRequest('/api/play/invite', { token, name, idToken: await getToken() })
  if (result.code !== code) throw new Error('Invitation does not match this room')
  redeemed.add(key)
}
export async function publicOperating(): Promise<OperatingConfig | null> {
  if (!backend) return null
  return parseOperating((await accessRequest('/api/access')).config)
}

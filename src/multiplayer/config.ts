import { MultiplayerError } from './errors.ts'

export interface FirebaseConfig {
  readonly mode: 'emulator' | 'production'
  readonly options: {
    readonly apiKey: string
    readonly authDomain: string
    readonly databaseURL: string
    readonly projectId: string
    readonly appId: string
  }
}

const KEYS = ['API_KEY', 'AUTH_DOMAIN', 'DATABASE_URL', 'PROJECT_ID', 'APP_ID'] as const

/** No config means multiplayer is unavailable; single-player needs none of it. */
export function readFirebaseConfig(env: Readonly<Record<string, unknown>>): FirebaseConfig | null {
  const emulator = env.VITE_FIREBASE_USE_EMULATORS
  if (emulator !== undefined && emulator !== '' && emulator !== 'true' && emulator !== 'false') {
    throw new MultiplayerError('configuration')
  }
  if (emulator === 'true') {
    // A demo project and fixed loopback endpoints cannot accidentally write to production.
    if (KEYS.some(key => env[`VITE_FIREBASE_${key}`])) throw new MultiplayerError('configuration')
    return {
      mode: 'emulator',
      options: {
        apiKey: 'demo-bricks-key', authDomain: 'demo-bricks.firebaseapp.com',
        databaseURL: 'https://demo-bricks-default-rtdb.firebaseio.com',
        projectId: 'demo-bricks', appId: 'demo-bricks-web',
      },
    }
  }
  const values = KEYS.map(key => env[`VITE_FIREBASE_${key}`])
  if (values.every(value => value === undefined || value === '')) return null
  if (values.some(value => typeof value !== 'string' || value.trim() !== value || !value || value.length > 2048)) {
    throw new MultiplayerError('configuration')
  }
  const [apiKey, authDomain, databaseURL, projectId, appId] = values as string[]
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId) || projectId.startsWith('demo-') || authDomain !== `${projectId}.firebaseapp.com`) {
    throw new MultiplayerError('configuration')
  }
  let url: URL
  try { url = new URL(databaseURL) } catch { throw new MultiplayerError('configuration') }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port || url.pathname !== '/' ||
    !/^[-a-z0-9]+\.(?:firebaseio\.com|[a-z0-9-]+\.firebasedatabase\.app)$/.test(url.hostname)) {
    throw new MultiplayerError('configuration')
  }
  return { mode: 'production', options: { apiKey, authDomain, databaseURL, projectId, appId } }
}

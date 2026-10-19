import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth'
import { connectDatabaseEmulator, getDatabase } from 'firebase/database'
import type { Database } from 'firebase/database'
import type { FirebaseConfig } from './config.ts'
import { MultiplayerError, playerFacingError } from './errors.ts'

export interface AnonymousPlayer { readonly uid: string }
export interface FirebaseClient {
  readonly database: Database
  getPlayer(): Promise<AnonymousPlayer>
}

let active: { signature: string; client: FirebaseClient } | undefined

/** Call only when entering multiplayer. Importing the single-player app starts no Firebase work. */
export function getFirebaseClient(config: FirebaseConfig | null): FirebaseClient {
  if (!config) throw new MultiplayerError('configuration')
  const signature = JSON.stringify(config)
  if (active) {
    if (active.signature !== signature) throw new MultiplayerError('configuration')
    return active.client
  }
  const app = initializeApp(config.options, 'bricks-multiplayer')
  // Browser SDK persistence restores the same anonymous UID after reloads.
  const auth = getAuth(app)
  const database = getDatabase(app)
  if (config.mode === 'emulator') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectDatabaseEmulator(database, '127.0.0.1', 9000)
  }
  let pending: Promise<AnonymousPlayer> | undefined
  const client: FirebaseClient = {
    database,
    getPlayer() {
      if (pending) return pending
      pending = (async () => {
        try {
          await auth.authStateReady()
          const user = auth.currentUser ?? (await signInAnonymously(auth)).user
          if (!user.isAnonymous) throw new MultiplayerError('permission')
          return { uid: user.uid }
        } catch (error) {
          throw playerFacingError(error)
        } finally {
          pending = undefined
        }
      })()
      return pending
    },
  }
  active = { signature, client }
  return client
}

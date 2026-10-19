import { get, ref, serverTimestamp, set } from 'firebase/database'
import { readFirebaseConfig } from '../../src/multiplayer/config.ts'
import { playerFacingError } from '../../src/multiplayer/errors.ts'
import { getFirebaseClient } from '../../src/multiplayer/firebase-client.ts'

const client = getFirebaseClient(readFirebaseConfig({ VITE_FIREBASE_USE_EMULATORS: 'true' }))

export async function identify() {
  const players = await Promise.all([client.getPlayer(), client.getPlayer()])
  return { uid: players[0].uid, sameIdentity: players[0].uid === players[1].uid }
}

export async function reserve(code: string) {
  try {
    const player = await client.getPlayer()
    await set(ref(client.database, `roomReservations/${code}`), { version: 1, ownerUid: player.uid, createdAt: serverTimestamp() })
    return null
  } catch (error) {
    return playerFacingError(error).code
  }
}

export async function ownerOf(code: string): Promise<string> {
  return (await get(ref(client.database, `roomReservations/${code}`))).val().ownerUid
}

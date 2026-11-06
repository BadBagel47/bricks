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

export async function disconnectDatabase() {
  const { goOffline } = await import('firebase/database')
  goOffline(client.database)
}
export async function reconnectDatabase() {
  const { goOnline } = await import('firebase/database')
  goOnline(client.database)
}

export async function debugLobby(code: string) {
  const room = (await get(ref(client.database, `rooms/${code}`))).val()
  const base = `matchSettings/${code}/${room.epoch}`
  return { room, editors: (await get(ref(client.database, `${base}/editors`))).val(), presence: (await get(ref(client.database, `presence/${code}/${room.epoch}`))).val() }
}

export async function matchData(code: string) {
  const room = (await get(ref(client.database, `rooms/${code}`))).val()
  const base = `${code}/${room.epoch}`
  return { start: (await get(ref(client.database, `matchStarts/${base}`))).val(), snapshots: (await get(ref(client.database, `gameSnapshots/${base}`))).val() }
}

/** Real input script computed with the standalone engine, not an application backdoor. */
export async function lineClearPlan(code: string) {
  const { createGame, dispatch } = await import('../../src/engine/game.ts')
  const { start } = await matchData(code)
  let game = createGame({ seed: start.seed, startLevel: start.settings.startLevel })
  const actions: import('../../src/engine/types.ts').GameAction[] = []
  for (let piece = 0; piece < 60 && game.score === 0; piece++) {
    let best: { cost: number; state: typeof game; actions: typeof actions } | null = null
    for (let rotation = 0; rotation < 4; rotation++) for (let dx = -5; dx <= 5; dx++) {
      const candidate: typeof actions = [...Array.from({ length: rotation }, () => 'rotateClockwise' as const), ...Array.from({ length: Math.abs(dx) }, () => dx < 0 ? 'moveLeft' as const : 'moveRight' as const), 'hardDrop']
      let state = game
      for (const action of candidate) state = dispatch(state, action).state
      if (state.status !== 'playing') continue
      const heights = Array.from({ length: 10 }, (_, x) => { const y = state.board.findIndex(row => row[x] !== null); return y < 0 ? 0 : 20 - y })
      const holes = heights.reduce((sum, h, x) => sum + state.board.slice(20 - h).filter(row => row[x] === null).length, 0)
      const bumps = heights.slice(1).reduce((sum, h, i) => sum + Math.abs(h - heights[i]), 0)
      const cost = holes * 20 + heights.reduce((sum, h) => sum + h, 0) + bumps * 2 - state.score * 100
      if (!best || cost < best.cost) best = { cost, state, actions: candidate }
    }
    if (!best) break
    game = best.state; actions.push(...best.actions)
  }
  return { actions, score: game.score, lines: game.lines }
}

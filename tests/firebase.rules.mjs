import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { get, ref, remove, runTransaction, serverTimestamp, set, update } from 'firebase/database'

let environment
const code = 'BRK724'
const reservation = uid => ({ version: 1, ownerUid: uid, createdAt: serverTimestamp() })
const db = uid => uid ? environment.authenticatedContext(uid).database() : environment.unauthenticatedContext().database()

before(async () => {
  assert.ok(process.env.FIREBASE_DATABASE_EMULATOR_HOST, 'Run with npm run test:firebase, never against a production database')
  environment = await initializeTestEnvironment({
    projectId: 'demo-bricks',
    database: { host: '127.0.0.1', port: 9000, rules: await readFile(new URL('../firebase/database.rules.json', import.meta.url), 'utf8') },
  })
})
beforeEach(async () => { await environment.clearDatabase() })
after(async () => { await environment?.cleanup() })

test('unauthenticated users cannot read or reserve a room code', async () => {
  await assertFails(get(ref(db(), `roomReservations/${code}`)))
  await assertFails(set(ref(db(), `roomReservations/${code}`), reservation('host')))
})

test('authenticated users can inspect a known reservation but cannot enumerate codes', async () => {
  await assertSucceeds(set(ref(db('host'), `roomReservations/${code}`), reservation('host')))
  const result = await assertSucceeds(get(ref(db('guest'), `roomReservations/${code}`)))
  assert.equal(result.val().ownerUid, 'host')
  await assertFails(get(ref(db('guest'), 'roomReservations')))
  await assertFails(get(ref(db('host'))))
})

test('the original owner and timestamp are immutable, including deletion and parent writes', async () => {
  await set(ref(db('host'), `roomReservations/${code}`), reservation('host'))
  for (const uid of ['host', 'guest']) {
    await assertFails(set(ref(db(uid), `roomReservations/${code}`), reservation(uid)))
    await assertFails(update(ref(db(uid), `roomReservations/${code}`), { ownerUid: uid }))
    await assertFails(remove(ref(db(uid), `roomReservations/${code}`)))
  }
  await assertFails(set(ref(db('host'), 'roomReservations'), { [code]: reservation('host') }))
})

test('reservation validation rejects impersonation, invalid codes, extra fields and client timestamps', async () => {
  await assertFails(set(ref(db('guest'), `roomReservations/${code}`), reservation('host')))
  for (const invalidCode of ['short', 'lowercase', 'BRK001', 'TOOLONGABC']) {
    await assertFails(set(ref(db('host'), `roomReservations/${invalidCode}`), reservation('host')))
  }
  for (const value of [
    { ...reservation('host'), version: 2 },
    { ...reservation('host'), extra: 'x'.repeat(8192) },
    { ...reservation('host'), createdAt: Date.now() + 60000 },
    { ...reservation('host'), createdAt: Date.now() - 60000 },
    { version: 1, ownerUid: 'host' },
    { ...reservation('host'), ownerUid: { nested: 'host' } },
  ]) await assertFails(set(ref(db('host'), `roomReservations/${code}`), value))
})

test('two concurrent reservation transactions cannot claim the same code', async () => {
  const contenders = ['host', 'guest']
  const results = await Promise.allSettled(contenders.map(uid => runTransaction(
    ref(db(uid), `roomReservations/${code}`),
    current => current === null ? reservation(uid) : undefined,
    { applyLocally: false },
  )))
  assert.equal(results.filter(result => result.status === 'fulfilled' && result.value.committed).length, 1)
  const owner = (await get(ref(db('host'), `roomReservations/${code}`))).val().ownerUid
  assert.ok(contenders.includes(owner))
})

test('presence and session data remain denied until their milestones add tested rules', async () => {
  await environment.withSecurityRulesDisabled(async context => {
    for (const path of ['sessions/session1', 'presence/host']) {
      await set(ref(context.database(), path), { ownerUid: 'host' })
    }
  })
  for (const path of ['sessions/session1', 'presence/host', 'unknown/data']) {
    await assertFails(get(ref(db('host'), path)))
    await assertFails(set(ref(db('host'), path), { ownerUid: 'host' }))
  }
})

const newRoom = () => ({ version: 1, ownerUid: 'host', hostUid: 'host', epoch: 1, status: 'waiting', createdAt: serverTimestamp(), players: { host: { uid: 'host', name: 'Host' } } })
async function ownedRoom() {
  await set(ref(db('host'), `roomReservations/${code}`), reservation('host'))
  await set(ref(db('host'), `rooms/${code}`), newRoom())
  return (await get(ref(db('host'), `rooms/${code}`))).val()
}

test('only the reservation owner can create a room; room codes do not grant identity or list access', async () => {
  await assertFails(set(ref(db('host'), `rooms/${code}`), newRoom()))
  await set(ref(db('host'), `roomReservations/${code}`), reservation('host'))
  await assertFails(set(ref(db('guest'), `rooms/${code}`), newRoom()))
  await assertSucceeds(set(ref(db('host'), `rooms/${code}`), newRoom()))
  await assertSucceeds(get(ref(db('guest'), `rooms/${code}`)))
  await assertFails(get(ref(db(), `rooms/${code}`)))
  await assertFails(get(ref(db('host'), 'rooms')))
  await assertFails(remove(ref(db('host'), `rooms/${code}`)))
})

test('guest writes cannot change the host, ownership, epoch or add a third slot', async () => {
  const room = await ownedRoom()
  const candidate = { ...room, players: { ...room.players, guest: { uid: 'guest', name: 'Guest' } } }
  for (const invalid of [
    { ...candidate, ownerUid: 'guest' }, { ...candidate, hostUid: 'guest' },
    { ...candidate, epoch: 2 }, { ...candidate, createdAt: 0 },
    { ...candidate, players: { ...candidate.players, host: { uid: 'host', name: 'Spoofed' } } },
    { ...candidate, players: { ...candidate.players, third: { uid: 'third', name: 'Third' } } },
    { ...candidate, players: { ...candidate.players, guest: { uid: 'another', name: 'Guest' } } },
    { ...candidate, players: { ...candidate.players, guest: { uid: 'guest', name: 'x'.repeat(2048) } } },
    { ...candidate, players: { ...candidate.players, guest: { uid: 'guest', name: 'Bad\nName' } } },
  ]) await assertFails(set(ref(db('guest'), `rooms/${code}`), invalid))
  await assertSucceeds(set(ref(db('guest'), `rooms/${code}`), candidate))
  await assertFails(update(ref(db('third'), `rooms/${code}/players/guest`), { uid: 'third', name: 'Third' }))
  await set(ref(db('guest'), `presence/${code}/1/guest/${'b'.repeat(32)}`), true)
  await assertFails(set(ref(db('host'), `rooms/${code}`), room))
  await assertSucceeds(remove(ref(db('guest'), `rooms/${code}/players/guest`)))
})

test('concurrent guest claims allow exactly one second participant', async () => {
  const baseline = await ownedRoom()
  const results = await Promise.allSettled(['guest', 'third'].map(uid => runTransaction(ref(db(uid), `rooms/${code}`), value => {
    const current = value ?? baseline
    return current.players.guest ? undefined : { ...current, players: { ...current.players, guest: { uid, name: 'Guest' } } }
  }, { applyLocally: false })))
  assert.equal(results.filter(result => result.status === 'fulfilled' && result.value.committed).length, 1)
  const room = (await get(ref(db('host'), `rooms/${code}`))).val()
  assert.equal(Object.keys(room.players).length, 2)
  assert.ok(['guest', 'third'].includes(room.players.guest.uid))
})

test('a host cannot evict a guest by closing; the original owner alone reopens closed rooms', async () => {
  const room = await ownedRoom()
  const joined = { ...room, players: { ...room.players, guest: { uid: 'guest', name: 'Guest' } } }
  await set(ref(db('guest'), `rooms/${code}`), joined)
  const closed = { ...room, status: 'closed' }
  await assertFails(set(ref(db('guest'), `rooms/${code}`), closed))
  await assertFails(set(ref(db('host'), `rooms/${code}`), closed))
  await remove(ref(db('guest'), `rooms/${code}/players/guest`))
  await assertSucceeds(set(ref(db('host'), `rooms/${code}`), closed))
  await assertFails(set(ref(db('guest'), `rooms/${code}`), joined))
  await assertFails(set(ref(db('host'), `rooms/${code}`), room))
  const reopened = { ...room, epoch: 2 }
  await assertSucceeds(set(ref(db('host'), `rooms/${code}`), reopened))
  await assertFails(set(ref(db('host'), `rooms/${code}`), closed))
})


test('only the current host can transfer to the existing guest; reservation ownership survives host departure', async () => {
  const room = await ownedRoom()
  const joined = { ...room, players: { ...room.players, guest: { uid: 'guest', name: 'Guest' } } }
  await set(ref(db('guest'), `rooms/${code}`), joined)
  const transferred = { ...joined, roleRevision: 1, hostUid: 'guest', players: { host: joined.players.guest, guest: joined.players.host } }
  for (const uid of ['guest', 'third']) await assertFails(set(ref(db(uid), `rooms/${code}`), transferred))
  await assertFails(set(ref(db('host'), `rooms/${code}`), { ...transferred, ownerUid: 'guest' }))
  await assertFails(set(ref(db('host'), `rooms/${code}`), { ...transferred, players: { ...transferred.players, host: { uid: 'guest', name: 'Spoofed' } } }))
  await assertSucceeds(set(ref(db('host'), `rooms/${code}`), transferred))
  await assertFails(set(ref(db('host'), `rooms/${code}`), joined))
  const alone = { ...transferred, players: { host: transferred.players.host } }
  await assertSucceeds(set(ref(db('host'), `rooms/${code}`), alone))
  await assertFails(set(ref(db('host'), `rooms/${code}`), { ...alone, status: 'closed' }))
  await assertSucceeds(set(ref(db('guest'), `rooms/${code}`), { ...alone, status: 'closed' }))
  await assertFails(set(ref(db('guest'), `rooms/${code}`), { ...alone, epoch: 2 }))
  await assertSucceeds(set(ref(db('host'), `rooms/${code}`), { ...room, roleRevision: 2, epoch: 2 }))
  assert.equal((await get(ref(db('host'), `roomReservations/${code}`))).val().ownerUid, 'host')
})

test('presence is participant-only, epoch-scoped, bounded and cannot impersonate another player', async () => {
  const room = await ownedRoom()
  const path = `presence/${code}/1/host/`
  const connection = 'a'.repeat(32)
  await assertSucceeds(set(ref(db('host'), path + connection), true))
  await assertFails(set(ref(db('guest'), path + connection), true))
  await assertFails(set(ref(db('guest'), `presence/${code}/1/guest/${connection}`), true))
  await assertFails(get(ref(db('guest'), `presence/${code}/1`)))
  await assertFails(set(ref(db('host'), path + connection), { payload: 'unexpected' }))
  await assertFails(set(ref(db('host'), `presence/${code}/1/host`), { [connection]: true }))
  await assertFails(set(ref(db('host'), path + 'invalid-id'), true))
  await assertFails(set(ref(db('host'), `presence/${code}/2/host/${connection}`), true))
  await assertSucceeds(set(ref(db('host'), `rooms/${code}`), { ...room, status: 'closed' }))
  await assertSucceeds(set(ref(db('host'), `rooms/${code}`), { ...room, epoch: 2 }))
  await assertFails(get(ref(db('host'), `presence/${code}/1`)))
  await assertSucceeds(remove(ref(db('host'), path + connection)))
})

test('only the host can free an offline guest; any guest connection blocks cleanup', async () => {
  const room = await ownedRoom()
  const joined = { ...room, players: { ...room.players, guest: { uid: 'guest', name: 'Guest' } } }
  await set(ref(db('guest'), `rooms/${code}`), joined)
  const path = `presence/${code}/1/guest/${'c'.repeat(32)}`
  await set(ref(db('guest'), path), true)
  await assertFails(set(ref(db('host'), `rooms/${code}`), room))
  await remove(ref(db('guest'), path))
  await assertFails(set(ref(db('third'), `rooms/${code}`), room))
  await assertSucceeds(set(ref(db('host'), `rooms/${code}`), room))
  const replacement = { ...room, players: { ...room.players, guest: { uid: 'third', name: 'Third' } } }
  await assertSucceeds(set(ref(db('third'), `rooms/${code}`), replacement))
})

test('match settings are host-only, validated, revisioned; approvals belong to the current guest and roles', async () => {
  const room = await ownedRoom()
  const joined = { ...room, players: { ...room.players, guest: { uid: 'guest', name: 'Guest' } } }
  await set(ref(db('guest'), `rooms/${code}`), joined)
  const path = `matchSettings/${code}/1`
  const settings = { revision: 1, mode: 'score-duel', startLevel: 0, hold: false, requireApproval: true }
  await assertFails(set(ref(db('guest'), `${path}/config`), settings))
  await assertSucceeds(set(ref(db('host'), `${path}/config`), settings))
  await assertFails(set(ref(db('host'), `${path}/config`), { ...settings, revision: 2 }))
  await assertFails(set(ref(db('host'), `${path}/config`), { ...settings, revision: 2, startLevel: 20 }))
  const approval = { revision: 1, roleRevision: 0, hostUid: 'host', guestUid: 'guest' }
  await assertFails(set(ref(db('host'), `${path}/approval`), approval))
  await assertFails(set(ref(db('third'), `${path}/approval`), approval))
  await assertSucceeds(set(ref(db('guest'), `${path}/approval`), approval))
  await assertSucceeds(set(ref(db('host'), `${path}/config`), { ...settings, revision: 2, hold: true }))
  await assertFails(set(ref(db('guest'), `${path}/approval`), approval))
  await assertFails(get(ref(db('third'), path)))
  await assertFails(set(ref(db('host'), `matchSettings/${code}/2/config`), settings))
  const transferred = { ...joined, roleRevision: 1, hostUid: 'guest', players: { host: joined.players.guest, guest: joined.players.host } }
  await assertSucceeds(set(ref(db('host'), `rooms/${code}`), transferred))
  await assertFails(set(ref(db('host'), `${path}/approval`), { ...approval, revision: 2, hostUid: 'guest', guestUid: 'host' }))
  await assertSucceeds(set(ref(db('host'), `${path}/approval`), { revision: 2, roleRevision: 1, hostUid: 'guest', guestUid: 'host' }))
})


test('four-character room codes work while legacy codes remain supported', async () => {
  const short = 'ABCD'
  await assertSucceeds(set(ref(db('host'), `roomReservations/${short}`), reservation('host')))
  await assertSucceeds(set(ref(db('host'), `rooms/${short}`), newRoom()))
  await assertSucceeds(get(ref(db('guest'), `rooms/${short}`)))
  await assertFails(set(ref(db('host'), 'roomReservations/ABC'), reservation('host')))
  await assertSucceeds(set(ref(db('host'), 'roomReservations/ABCDEFGH'), reservation('host')))
})

test('editing markers contain no draft, are current-host-only and bound to role generation', async () => {
  const room = await ownedRoom()
  const joined = { ...room, players: { ...room.players, guest: { uid: 'guest', name: 'Guest' } } }
  await set(ref(db('guest'), `rooms/${code}`), joined)
  const base = `matchSettings/${code}/1/editors`
  const path = `${base}/host/${'d'.repeat(32)}`
  await assertFails(set(ref(db('guest'), path), { roleRevision: 0 }))
  await assertFails(set(ref(db('guest'), `${base}/guest/${'d'.repeat(32)}`), { roleRevision: 0 }))
  await assertFails(set(ref(db('host'), path), { roleRevision: 1 }))
  await assertFails(set(ref(db('host'), path), { roleRevision: 0, draft: { startLevel: 19 } }))
  await assertSucceeds(set(ref(db('host'), path), { roleRevision: 0 }))
  await assertSucceeds(get(ref(db('guest'), base)))
  await assertFails(get(ref(db('third'), base)))
  const transferred = { ...joined, roleRevision: 1, hostUid: 'guest', players: { host: joined.players.guest, guest: joined.players.host } }
  await set(ref(db('host'), `rooms/${code}`), transferred)
  await assertFails(set(ref(db('host'), path), { roleRevision: 0 }))
  await assertSucceeds(remove(ref(db('host'), path)))
  await assertSucceeds(set(ref(db('guest'), `${base}/guest/${'e'.repeat(32)}`), { roleRevision: 1 }))
})

test('only the host starts; approval, connections, settings and five-second server deadline are enforced', async () => {
  const room = await ownedRoom()
  const joined = { ...room, players: { ...room.players, guest: { uid: 'guest', name: 'Guest' } } }
  await set(ref(db('guest'), `rooms/${code}`), joined)
  const hc = 'b'.repeat(32), gc = 'c'.repeat(32)
  await set(ref(db('host'), `presence/${code}/1/host/${hc}`), true)
  await set(ref(db('guest'), `presence/${code}/1/guest/${gc}`), true)
  const settings = { revision: 1, mode: 'score-duel', startLevel: 7, hold: true, requireApproval: true }
  await set(ref(db('host'), `matchSettings/${code}/1/config`), settings)
  const proposal = { id: 'a'.repeat(32), status: 'countdown', seed: 47, countdownAt: serverTimestamp(), settings, roleRevision: 0, hostUid: 'host', guestUid: 'guest', hostConnection: hc, guestConnection: gc }
  const path = `matchStarts/${code}/1`
  await assertFails(set(ref(db('host'), path), proposal))
  await set(ref(db('guest'), `matchSettings/${code}/1/approval`), { revision: 1, roleRevision: 0, hostUid: 'host', guestUid: 'guest' })
  await assertFails(set(ref(db('guest'), path), proposal))
  await assertFails(set(ref(db('third'), path), proposal))
  for (const bad of [{ ...proposal, settings: { ...settings, startLevel: 19 } }, { ...proposal, seed: -1 }, { ...proposal, countdownAt: 0 }, { ...proposal, guestConnection: 'f'.repeat(32) }, { ...proposal, roleRevision: 1 }, { ...proposal, extra: true }]) await assertFails(set(ref(db('host'), path), bad))
  const editor = `matchSettings/${code}/1/editors/host/${'d'.repeat(32)}`
  await set(ref(db('host'), editor), { roleRevision: 0 })
  await assertFails(set(ref(db('host'), path), proposal))
  await remove(ref(db('host'), editor))
  await assertSucceeds(set(ref(db('host'), path), proposal))
  const current = (await get(ref(db('host'), path))).val()
  await assertFails(set(ref(db('host'), path), { ...current, status: 'ready' }))
  await assertFails(set(ref(db('host'), `matchSettings/${code}/1/config`), { ...settings, revision: 2, hold: false }))
  await assertFails(set(ref(db('host'), editor), { roleRevision: 0 }))
  await assertFails(remove(ref(db('guest'), `rooms/${code}/players/guest`)))
  await assertFails(set(ref(db('host'), `rooms/${code}`), { ...joined, roleRevision: 1, hostUid: 'guest', players: { host: joined.players.guest, guest: joined.players.host } }))
  await assertFails(get(ref(db('third'), path)))
  await new Promise(resolve => setTimeout(resolve, 5100))
  await assertFails(set(ref(db('guest'), path), { ...current, status: 'ready' }))
  await assertSucceeds(set(ref(db('host'), path), { ...current, status: 'ready' }))
  await assertFails(set(ref(db('host'), path), { ...current, seed: 999, status: 'ready' }))
  await assertFails(set(ref(db('third'), path), { ...current, status: 'cancelled' }))
  await assertSucceeds(set(ref(db('guest'), path), { ...current, status: 'cancelled' }))
  await assertSucceeds(set(ref(db('host'), path), { ...proposal, id: 'e'.repeat(32), seed: 48 }))
  await assertFails(set(ref(db('host'), path), { ...current, status: 'cancelled' }))
})

test('live snapshots are bounded, participant-owned, current-match-bound, rate-limited and terminal', async () => {
  const hc = 'b'.repeat(32), gc = 'c'.repeat(32), mid = 'a'.repeat(32)
  const room = await ownedRoom()
  const joined = { ...room, players: { ...room.players, guest: { uid: 'guest', name: 'Guest' } } }
  await set(ref(db('guest'), `rooms/${code}`), joined)
  const matchPath = `matchStarts/${code}/1`
  const ready = { id: mid, status: 'ready', seed: 47, countdownAt: Date.now() - 6000, settings: { revision: 0, mode: 'score-duel', startLevel: 0, hold: false, requireApproval: false }, roleRevision: 0, hostUid: 'host', guestUid: 'guest', hostConnection: hc, guestConnection: gc }
  // Countdown authorization is covered separately. Seed a prepared session for snapshot isolation.
  await environment.withSecurityRulesDisabled(async context => {
    await set(ref(context.database(), matchPath), ready)
    await set(ref(context.database(), `presence/${code}/1`), { host: { [hc]: true }, guest: { [gc]: true } })
  })
  const base = `gameSnapshots/${code}/1`
  const location = ref(db('host'), `${base}/host`)
  const payload = { matchId: mid, connection: hc, seq: 1, board: '0'.repeat(200), next: 'T', held: '-', status: 'playing', score: 0, level: 0, lines: 0, updatedAt: serverTimestamp() }
  await assertFails(set(ref(db('guest'), `${base}/host`), payload))
  await assertFails(set(ref(db(), `${base}/host`), payload))
  await assertFails(set(ref(db('third'), `${base}/third`), { ...payload, connection: gc }))
  await assertFails(set(ref(db('host'), `gameSnapshots/${code}/2/host`), payload))
  for (const bad of [{ ...payload, matchId: 'd'.repeat(32) }, { ...payload, connection: gc }, { ...payload, seq: 2 }, { ...payload, board: '0'.repeat(201) }, { ...payload, board: '8'.repeat(200) }, { ...payload, extra: 'spam' }, { ...payload, score: -1 }, { ...payload, level: 1.5 }, { ...payload, held: 'X' }, { ...payload, updatedAt: 1 }]) await assertFails(set(location, bad))
  await assertSucceeds(set(location, payload))
  await assertSucceeds(get(ref(db('guest'), `${base}/host`)))
  await assertFails(get(ref(db('third'), base)))
  await assertFails(get(ref(db('host'), 'gameSnapshots')))
  await assertFails(remove(location))
  await assertFails(set(location, { ...payload, seq: 2, score: 40 }))
  await new Promise(resolve => setTimeout(resolve, 550))
  await assertFails(set(location, payload))
  await assertSucceeds(set(location, { ...payload, seq: 2, score: 40, lines: 1 }))
  await new Promise(resolve => setTimeout(resolve, 550))
  await assertFails(set(location, { ...payload, seq: 3, score: 0 }))
  await assertSucceeds(set(location, { ...payload, seq: 3, score: 40, lines: 1, status: 'gameOver' }))
  await new Promise(resolve => setTimeout(resolve, 550))
  await assertFails(set(location, { ...payload, seq: 4, score: 100, lines: 2 }))
  await set(ref(db('host'), matchPath), { ...ready, status: 'cancelled' })
  await assertFails(set(ref(db('guest'), `${base}/guest`), { ...payload, connection: gc }))
  await environment.withSecurityRulesDisabled(async context => { await set(ref(context.database(), matchPath), { ...ready, id: 'e'.repeat(32) }) })
  await assertFails(set(location, { ...payload, seq: 4 }))
  await assertSucceeds(set(location, { ...payload, matchId: 'e'.repeat(32) }))
})

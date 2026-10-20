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

test('only the owner can close/reopen; reopening advances the epoch and clears the guest', async () => {
  const room = await ownedRoom()
  const joined = { ...room, players: { ...room.players, guest: { uid: 'guest', name: 'Guest' } } }
  await set(ref(db('guest'), `rooms/${code}`), joined)
  const closed = { ...room, status: 'closed' }
  await assertFails(set(ref(db('guest'), `rooms/${code}`), closed))
  await assertSucceeds(set(ref(db('host'), `rooms/${code}`), closed))
  await assertFails(set(ref(db('guest'), `rooms/${code}`), joined))
  await assertFails(set(ref(db('host'), `rooms/${code}`), room))
  const reopened = { ...room, epoch: 2 }
  await assertSucceeds(set(ref(db('host'), `rooms/${code}`), reopened))
  await assertFails(set(ref(db('host'), `rooms/${code}`), closed))
})

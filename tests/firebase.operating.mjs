import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { get, ref, set, update, remove, serverTimestamp } from 'firebase/database'
import { openOperating } from './fixtures/seed-operating.mjs'

let environment
const code = 'QWER', hc = 'a'.repeat(32), gc = 'b'.repeat(32), mid = 'c'.repeat(32)
const db = uid => environment.authenticatedContext(uid).database()
const publisher = () => environment.authenticatedContext('bricks-operating-publisher', { operatingPublisher: true }).database()
const admin = async (path, value) => set(ref(publisher(), path), value)
const seed = async value => environment.withSecurityRulesDisabled(async context => update(ref(context.database()), value))
const room = () => ({ version: 1, ownerUid: 'host', hostUid: 'host', epoch: 1, status: 'waiting', createdAt: Date.now(), players: { host: { uid: 'host', name: 'Host' }, guest: { uid: 'guest', name: 'Guest' } } })
const start = () => ({ id: mid, status: 'countdown', seed: 47, countdownAt: serverTimestamp(), settings: { revision: 0, mode: 'score-duel', startLevel: 0, hold: false, requireApproval: false }, roleRevision: 0, hostUid: 'host', guestUid: 'guest', hostConnection: hc, guestConnection: gc })
async function lobby() {
  await seed({ [`rooms/${code}`]: room(), [`roomReservations/${code}`]: { version: 1, ownerUid: 'host', createdAt: Date.now() }, [`presence/${code}/1/host/${hc}`]: true, [`presence/${code}/1/guest/${gc}`]: true })
}
before(async () => {
  assert.ok(process.env.FIREBASE_DATABASE_EMULATOR_HOST)
  environment = await initializeTestEnvironment({ projectId: 'demo-bricks', database: { host: '127.0.0.1', port: 9000, rules: await readFile(new URL('../firebase/database.rules.json', import.meta.url), 'utf8') } })
})
beforeEach(async () => { await environment.clearDatabase(); await admin('operating/config', openOperating) })
after(async () => environment?.cleanup())

test('operating policy is readable, never client-writable; publisher has no root or gameplay access', async () => {
  assert.equal((await get(ref(environment.unauthenticatedContext().database(), 'operating/config'))).val().multi.mode, 'on')
  await assertFails(set(ref(db('host'), 'operating/config'), openOperating))
  await assertFails(set(ref(environment.authenticatedContext('bricks-operating-publisher').database(), 'operating/config'), openOperating))
  await assertFails(get(ref(publisher())))
  await assertFails(set(ref(publisher(), `gameSnapshots/${code}/1/host`), {}))
  await assertFails(set(ref(db('host'), 'adminAllowlist/forged'), true))
  await assertFails(set(ref(db('host'), `roomAccess/${code}/host`), { id: 'forged', expiresAt: Date.now() + 10000 }))
})

test('REST auth override uses the same constrained publisher identity as SDK rules tests', async () => {
  const request = async (path, value) => {
    const url = new URL(`http://127.0.0.1:9000/${path}.json?ns=demo-bricks`)
    url.searchParams.set('auth_variable_override', JSON.stringify({ uid: 'bricks-operating-publisher', token: { operatingPublisher: true } }))
    return fetch(url, { method: 'PUT', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify(value) })
  }
  assert.equal((await request('operating/config', openOperating)).status, 200)
  assert.equal((await request(`gameSnapshots/${code}/1/host`, {})).status, 401)
  assert.equal((await request('unrelated/private', true)).status, 401)
})

test('public closure and missing configuration deny new reservations, rooms and guests', async () => {
  await lobby()
  await admin('operating/config', { ...openOperating, multi: { mode: 'off', expiresAt: null } })
  await assertFails(set(ref(db('third'), 'roomReservations/ASDF'), { version: 1, ownerUid: 'third', createdAt: serverTimestamp() }))
  await assertFails(get(ref(db('third'), `rooms/${code}`)))
  const existing = room(); delete existing.players.guest
  await seed({ [`rooms/${code}`]: existing })
  await assertFails(set(ref(db('guest'), `rooms/${code}`), { ...existing, players: { ...existing.players, guest: { uid: 'guest', name: 'Guest' } } }))
  await admin('operating/config', null)
  await assertFails(set(ref(db('third'), 'roomReservations/ASDF'), { version: 1, ownerUid: 'third', createdAt: serverTimestamp() }))
})

test('a private room requires UID membership even when public multiplayer is on', async () => {
  await lobby()
  const expiresAt = Date.now() + 60000
  await admin(`privateRooms/${code}`, { id: mid, expiresAt, revoked: false })
  await assertFails(get(ref(db('third'), `rooms/${code}`)))
  await assertFails(get(ref(db('third'), `roomReservations/${code}`)))
  await admin(`roomAccess/${code}/third`, { id: mid, expiresAt })
  await assertSucceeds(get(ref(db('third'), `rooms/${code}`)))
  await assertFails(get(ref(db('outsider'), `roomAccess/${code}/third`)))
  await assertFails(get(ref(db('third'), 'privateRooms')))
  await admin(`privateRooms/${code}`, { id: mid, expiresAt, revoked: true })
  await assertFails(get(ref(db('third'), `rooms/${code}`)))
})

test('private invitations permit both players to start while public access is closed', async () => {
  await lobby()
  await admin('operating/config', { ...openOperating, multi: { mode: 'off', expiresAt: null } })
  const expiresAt = Date.now() + 60000
  await admin(`privateRooms/${code}`, { id: mid, expiresAt, revoked: false })
  await admin(`roomAccess/${code}/host`, { id: mid, expiresAt })
  await assertFails(set(ref(db('host'), `matchStarts/${code}/1`), start()))
  await admin(`roomAccess/${code}/guest`, { id: mid, expiresAt })
  await assertSucceeds(set(ref(db('host'), `matchStarts/${code}/1`), start()))
})

test('closure during countdown denies ready transition but permits cancellation and presence cleanup', async () => {
  await lobby()
  await set(ref(db('host'), `matchStarts/${code}/1`), start())
  const saved = (await get(ref(db('host'), `matchStarts/${code}/1`))).val()
  await seed({ [`matchStarts/${code}/1`]: { ...saved, countdownAt: Date.now() - 6000 } })
  await admin('operating/config', { ...openOperating, multi: { mode: 'until', expiresAt: Date.now() - 1 } })
  await assertFails(update(ref(db('host'), `matchStarts/${code}/1`), { status: 'ready' }))
  await assertSucceeds(update(ref(db('host'), `matchStarts/${code}/1`), { status: 'cancelled' }))
  await assertSucceeds(remove(ref(db('host'), `presence/${code}/1/host/${hc}`)))
})

test('already admitted games keep snapshot/result access after closure; the next round cannot start', async () => {
  await lobby()
  await seed({ [`matchStarts/${code}/1`]: { ...start(), countdownAt: Date.now() - 6000, status: 'ready' } })
  await admin('operating/config', { ...openOperating, multi: { mode: 'off', expiresAt: null } })
  const snapshot = { matchId: mid, connection: hc, seq: 1, board: '0'.repeat(200), next: 'I', held: '-', status: 'gameOver', score: 40, level: 0, lines: 1, updatedAt: serverTimestamp() }
  await assertSucceeds(set(ref(db('host'), `gameSnapshots/${code}/1/host`), snapshot))
  await assertSucceeds(get(ref(db('guest'), `gameSnapshots/${code}/1/host`)))
  await assertSucceeds(update(ref(db('host'), `matchStarts/${code}/1`), { status: 'cancelled' }))
  await assertFails(set(ref(db('host'), `matchStarts/${code}/1`), { ...start(), id: 'd'.repeat(32) }))
})

test('administrator bypass checks allowlist, session revocation and expiry using server time', async () => {
  const subject = 'e'.repeat(64), sid = 'f'.repeat(64)
  await admin('operating/config', { ...openOperating, multi: { mode: 'off', expiresAt: null } })
  await admin(`adminAllowlist/${subject}`, true)
  await admin(`operatorSessions/${sid}`, { subject, expiresAt: Date.now() + 60000, revoked: false })
  await admin('operatorPlayers/host', { sessionId: sid })
  await assertSucceeds(set(ref(db('host'), 'roomReservations/ASDF'), { version: 1, ownerUid: 'host', createdAt: serverTimestamp() }))
  await admin(`adminAllowlist/${subject}`, false)
  await assertFails(set(ref(db('host'), 'roomReservations/ZXCV'), { version: 1, ownerUid: 'host', createdAt: serverTimestamp() }))
  await admin(`adminAllowlist/${subject}`, true)
  await admin(`operatorSessions/${sid}`, { subject, expiresAt: Date.now() + 60000, revoked: true })
  await assertFails(set(ref(db('host'), 'roomReservations/ZXCV'), { version: 1, ownerUid: 'host', createdAt: serverTimestamp() }))
  await admin(`operatorSessions/${sid}`, { subject, expiresAt: Date.now() - 1, revoked: false })
  await assertFails(set(ref(db('host'), 'roomReservations/ZXCV'), { version: 1, ownerUid: 'host', createdAt: serverTimestamp() }))
})

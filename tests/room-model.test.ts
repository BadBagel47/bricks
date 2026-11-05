import assert from 'node:assert/strict'
import { test } from 'node:test'
import { claimGuest, leaveRoom, transferHost, inviteURL, normalizeRoomCode, parseRoom, randomRoomCode } from '../src/multiplayer/room-model.ts'
import type { Room } from '../src/multiplayer/room-model.ts'

const room: Room = { version: 1, ownerUid: 'host', hostUid: 'host', epoch: 1, status: 'waiting', createdAt: 1, players: { host: { uid: 'host', name: 'Host' } } }
test('room codes normalize case and reject forbidden characters without changing invitation paths', () => {
  assert.equal(normalizeRoomCode(' brk724 '), 'BRK724')
  for (const input of ['short', 'ROOM01', 'BRK/24', 'BRK724999']) assert.throws(() => normalizeRoomCode(input))
  for (let i = 0; i < 50; i++) assert.match(randomRoomCode(), /^[A-HJ-NP-Z2-9]{8}$/)
  assert.equal(inviteURL('brk724', 'https://example.com/bricks/?other=value#fragment'), 'https://example.com/bricks/?other=value&room=BRK724')
})
test('a second distinct identity claims the guest slot; repeat joins are idempotent and a third cannot join', () => {
  assert.equal(parseRoom(room), room)
  assert.equal(claimGuest(room, room.players.host), room)
  const joined = claimGuest(room, { uid: 'guest', name: 'Guest' })
  assert.equal(claimGuest(joined, { uid: 'guest', name: 'Guest' }), joined)
  assert.throws(() => claimGuest(joined, { uid: 'third', name: 'Third' }), { code: 'room-full' })
  assert.throws(() => claimGuest({ ...room, status: 'closed' }, { uid: 'guest', name: 'Guest' }), { code: 'room-closed' })
})
test('untrusted room snapshots reject extra slots, duplicate identities, malformed data and future states', () => {
  for (const invalid of [null, { ...room, version: 2 }, { ...room, epoch: -1 }, { ...room, status: 'playing' }, { ...room, secret: 'extra' },
    { ...room, players: { ...room.players, extra: { uid: 'extra', name: 'Extra' } } },
    { ...room, players: { ...room.players, guest: { uid: 'host', name: 'Duplicate' } } },
    { ...room, players: { host: { uid: 'host', name: '\nBad' } } },
  ]) assert.throws(() => parseRoom(invalid), { code: 'session-expired' })
})

test('transfer and host departure preserve code ownership and leave one valid host', () => {
  const joined = claimGuest(room, { uid: 'guest', name: 'Guest' })
  assert.throws(() => transferHost(joined, 'guest'), { code: 'permission' })
  const swapped = parseRoom(transferHost(joined, 'host'))
  assert.equal(swapped.hostUid, 'guest')
  assert.equal(swapped.ownerUid, 'host')
  assert.equal(swapped.players.guest?.uid, 'host')
  const alone = parseRoom(leaveRoom(joined, 'host'))
  assert.equal(alone.hostUid, 'guest')
  assert.equal(alone.players.guest, undefined)
  assert.equal(parseRoom(leaveRoom(alone, 'guest')).status, 'closed')
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { accessDatabase as setup } from './fixtures/access-database.ts'
import { AdminSessions, D1SessionStore } from '../modules/access-control/sessions.ts'

test('durable SQL consumes a token once and rejects expiry and disabled admins', async () => {
  const { store, database } = setup()
  try {
    database.prepare('INSERT INTO admins VALUES (?, 1)').run('subject')
    assert.equal(await store.isAllowed('subject'), true)
    await store.put({ digest: 'digest', subject: 'subject', expiresAt: 200 })
    const results = await Promise.all([store.consume('digest', 100), store.consume('digest', 100)])
    assert.equal(results.filter(Boolean).length, 1)
    await store.put({ digest: 'expired', subject: 'subject', expiresAt: 200 })
    assert.equal(await store.consume('expired', 200), null)
    database.prepare('UPDATE admins SET enabled = 0').run()
    assert.equal(await store.isAllowed('subject'), false)
    await store.prune(200)
    assert.equal(database.prepare('SELECT COUNT(*) AS n FROM magic_links').get()?.n, 0)
  } finally { database.close() }
})

test('durable recipient and source limits reset at the exact window boundary', async () => {
  const { store, database } = setup()
  try {
    for (let n = 0; n < 3; n++) assert.equal(await store.permitRequest('admin', 'source', 100), true)
    assert.equal(await store.permitRequest('admin', 'source', 100), false)
    assert.equal(await store.permitRequest('admin', 'source', 100 + 15 * 60_000), true)
    const outcomes = await Promise.all(Array.from({ length: 12 }, (_, n) => store.permitRequest(`person-${n}`, 'another-source', 100)))
    assert.equal(outcomes.filter(Boolean).length, 10)
  } finally { database.close() }
})

test('project-wide daily mail budget is atomic, shared and resets at midnight UTC', async () => {
  const { store, database } = setup()
  try {
    const outcomes = await Promise.all(Array.from({ length: 95 }, () => store.permitMail(100)))
    assert.equal(outcomes.filter(Boolean).length, 90)
    assert.equal(await store.permitMail(86_400_000 - 1), false)
    assert.equal(await store.permitMail(86_400_000), true)
  } finally { database.close() }
})

test('sessions store only hashes, are project isolated, expire and respect allowlist revocation', async () => {
  const { sql, database } = setup()
  try {
    database.prepare('INSERT INTO admins VALUES (?, 1)').run('subject')
    const store = new D1SessionStore(sql)
    const service = new AdminSessions('bricks', store)
    const token = await service.issue('subject', 100)
    assert.equal(JSON.stringify(database.prepare('SELECT * FROM admin_sessions').all()).includes(token), false)
    assert.equal((await service.authenticate(token, 100))?.subject, 'subject')
    assert.equal(await new AdminSessions('other', store).authenticate(token, 100), null)
    assert.equal(await service.authenticate(token, 100 + 8 * 60 * 60_000), null)
    database.prepare('UPDATE admins SET enabled = 0').run()
    assert.equal(await service.authenticate(token, 101), null)
    await store.prune(101)
    database.prepare('UPDATE admins SET enabled = 1').run()
    assert.equal(await service.authenticate(token, 101), null)
    const next = await service.issue('subject', 101)
    await service.revoke(next)
    assert.equal(await service.authenticate(next, 102), null)
  } finally { database.close() }
})

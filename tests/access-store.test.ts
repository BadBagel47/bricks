import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { D1LinkStore } from '../modules/access-control/d1-store.ts'
import type { SqlStatement } from '../modules/access-control/d1-store.ts'

function setup() {
  const database = new DatabaseSync(':memory:')
  database.exec(readFileSync(new URL('../modules/access-control/schema.sql', import.meta.url), 'utf8'))
  const store = new D1LinkStore({ prepare(sql) {
    let values: (string | number)[] = []
    const statement: SqlStatement = {
      bind(...next) { values = next; return statement },
      async first<T>() { return database.prepare(sql).get(...values) as T | undefined ?? null },
      async run() { return database.prepare(sql).run(...values) },
    }
    return statement
  } })
  return { store, database }
}

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

import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { D1LinkStore } from '../../modules/access-control/d1-store.ts'
import type { SqlStatement } from '../../modules/access-control/d1-store.ts'

export function accessDatabase() {
  const database = new DatabaseSync(':memory:')
  database.exec(readFileSync(new URL('../../modules/access-control/schema.sql', import.meta.url), 'utf8'))
  const sql = { prepare(sql: string) {
    let values: (string | number)[] = []
    const statement: SqlStatement = {
      bind(...next) { values = next; return statement },
      async first<T>() { return database.prepare(sql).get(...values) as T | undefined ?? null },
      async run() { return database.prepare(sql).run(...values) },
    }
    return statement
  } }
  const store = new D1LinkStore(sql)
  return { store, database, sql }
}

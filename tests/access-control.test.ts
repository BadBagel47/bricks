import assert from 'node:assert/strict'
import { test } from 'node:test'
import { accessAllowed, admitMatch, mayFinishMatch } from '../modules/access-control/policy.ts'
import { linkDigest, MagicLinks, privateSubject } from '../modules/access-control/magic-links.ts'
import type { LinkRecord, LinkStore } from '../modules/access-control/magic-links.ts'

test('access modes enforce global override, exact deadlines and room-only access', () => {
  assert.equal(accessAllowed({ mode: 'off', expiresAt: null }, { expiresAt: 200 }, 100), false)
  assert.equal(accessAllowed({ mode: 'on', expiresAt: null }, null, 100), true)
  assert.equal(accessAllowed({ mode: 'until', expiresAt: 200 }, null, 199), true)
  assert.equal(accessAllowed({ mode: 'until', expiresAt: 200 }, null, 200), false)
  assert.equal(accessAllowed({ mode: 'rooms', expiresAt: null }, null, 100), false)
  assert.equal(accessAllowed({ mode: 'rooms', expiresAt: null }, { expiresAt: null }, 100), false)
  assert.equal(accessAllowed({ mode: 'rooms', expiresAt: null }, { expiresAt: 200 }, 199), true)
  assert.equal(accessAllowed({ mode: 'on', expiresAt: null }, { expiresAt: 200 }, 200), false)
  assert.equal(accessAllowed({ mode: 'on', expiresAt: null }, null, NaN), false)
})

test('closure denies new matches and rematches while an already admitted match may finish', () => {
  const policy = { mode: 'until', expiresAt: 200 } as const
  const admission = admitMatch(policy, null, 'match-1', 199)
  assert.ok(admission)
  assert.equal(admitMatch(policy, null, 'match-2', 200), null)
  assert.equal(mayFinishMatch(admission, 'match-1', 300), true)
  assert.equal(mayFinishMatch(admission, 'match-2', 300), false)
  assert.equal(mayFinishMatch(null, 'match-1', 300), false)
  assert.equal(mayFinishMatch(admission, 'match-1', 198), false)
  assert.equal(admitMatch({ mode: 'off', expiresAt: null }, null, 'match-3', 300), null)
  assert.equal(admitMatch({ mode: 'rooms', expiresAt: null }, { expiresAt: 200 }, 'match-4', 200), null)
})

class MemoryStore implements LinkStore {
  allowed = new Set<string>()
  records = new Map<string, LinkRecord>()
  limited = false
  async isAllowed(subject: string) { return this.allowed.has(subject) }
  async permitRequest() { return !this.limited }
  async permitMail() { return !this.limited }
  async put(record: LinkRecord) { this.records.set(record.digest, record) }
  async consume(digest: string, now: number) {
    const record = this.records.get(digest)
    if (!record || record.expiresAt <= now) return null
    this.records.delete(digest)
    return record
  }
}
async function setup() {
  const store = new MemoryStore(), sent: { email: string; token: string }[] = []
  const service = new MagicLinks('bricks', 's'.repeat(32), store, { async send(email, token) { sent.push({ email, token }) } })
  const subject = await privateSubject('bricks', 'admin@example.invalid', service.secret)
  store.allowed.add(subject)
  return { store, service, sent, subject }
}

test('only allowed recipients get mail; stored records contain neither email nor raw token', async () => {
  const { store, service, sent } = await setup()
  await service.request('stranger@example.invalid', 'test-source', 100)
  assert.equal(sent.length, 0)
  await service.request(' ADMIN@example.invalid ', 'test-source', 100)
  assert.equal(sent.length, 1)
  const record = JSON.stringify([...store.records.values()])
  assert.equal(record.includes(sent[0].token), false)
  assert.equal(record.includes(sent[0].email), false)
})

test('links are single-use under simultaneous redemption, expire and respect revocation', async () => {
  const { store, service, sent, subject } = await setup()
  await service.request('admin@example.invalid', 'source', 100)
  const results = await Promise.all([service.redeem(sent[0].token, 200), service.redeem(sent[0].token, 200)])
  assert.equal(results.filter(value => value === subject).length, 1)
  await service.request('admin@example.invalid', 'source', 1000)
  assert.equal(await service.redeem(sent[1].token, 1000 + 60 * 60000), null)
  await service.request('admin@example.invalid', 'source', 2000)
  store.allowed.clear()
  assert.equal(await service.redeem(sent[2].token, 2100), null)
})

test('projects are isolated and rate limiting prevents mail sends', async () => {
  const { store, service, sent } = await setup()
  assert.notEqual(await privateSubject('bricks', 'admin@example.invalid', service.secret), await privateSubject('other', 'admin@example.invalid', service.secret))
  assert.notEqual(await linkDigest('bricks', 'a'.repeat(64)), await linkDigest('other', 'a'.repeat(64)))
  store.limited = true
  await service.request('admin@example.invalid', 'source', 100)
  assert.equal(sent.length, 0)
})

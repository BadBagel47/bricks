import assert from 'node:assert/strict'
import { test } from 'node:test'
import { WAITING_MESSAGES, WaitingMessages } from '../src/multiplayer/waiting-messages.ts'

test('all fifty approved texts appear once per cycle; previous five cannot open the next cycle', () => {
  assert.equal(WAITING_MESSAGES.length, 50)
  assert.equal(new Set(WAITING_MESSAGES).size, 50)
  const bag = new WaitingMessages(() => 0.42)
  let recent: string[] = []
  for (let cycle = 0; cycle < 10; cycle++) {
    const drawn = Array.from({ length: 50 }, () => bag.next())
    assert.equal(new Set(drawn).size, 50)
    for (const message of drawn.slice(0, 5)) assert.equal(recent.includes(message), false)
    recent = drawn.slice(-5)
  }
})
test('reading the current text repeatedly or resuming a waiting screen does not consume the bag', () => {
  const bag = new WaitingMessages(() => 0)
  const first = bag.current()
  assert.equal(bag.current(), first)
  const second = bag.next()
  assert.notEqual(second, first)
  assert.equal(bag.current(), second)
})

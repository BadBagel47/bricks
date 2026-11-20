import assert from 'node:assert/strict'
import test from 'node:test'
import { advanceFrames, CLASSIC_RULES, createGame, createRandomizer, dispatch, drawPiece, LOCK_DELAY_FRAMES, MAX_LOCK_RESETS, MODERN_RULES, PIECE_TYPES } from '../src/engine/index.ts'
import type { GameState, PieceType } from '../src/engine/index.ts'
import { validateCheckpoint } from '../src/multiplayer/checkpoint.ts'
import { CLASSIC_PLAY, engineRules, MODERN_PLAY, playRules, rulesLabel } from '../src/play-rules.ts'

test('F-046: the 7-bag deals every piece once per bag, so at most 12 pieces pass between two I pieces', () => {
  for (const seed of [1, 42, 99999, 0xffffffff]) {
    let randomizer = createRandomizer(seed)
    const pieces: PieceType[] = []
    for (let i = 0; i < 700; i++) { const drawn = drawPiece(randomizer, true); pieces.push(drawn.piece); randomizer = drawn.randomizer }
    for (let bag = 0; bag < 100; bag++) assert.deepEqual([...pieces.slice(bag * 7, bag * 7 + 7)].sort(), [...PIECE_TYPES].sort(), `bag ${bag} of seed ${seed}`)
    const is = pieces.flatMap((piece, index) => piece === 'I' ? [index] : [])
    assert.ok(is.every((at, k) => k === 0 || at - is[k - 1] - 1 <= 12))
  }
})

test('F-054: Modern knows three pieces ahead and the queue moves up in drawing order', () => {
  const game = createGame({ seed: 7, rules: MODERN_RULES })
  assert.equal(game.queue.length, 2)
  const after = dispatch(game, 'hardDrop').state
  assert.equal(after.active?.type, game.next)
  assert.equal(after.next, game.queue[0])
  assert.equal(after.queue[0], game.queue[1])
  assert.equal(createGame({ seed: 7 }).queue.length, 0, 'Classic shows one')
  // The same seed deals the same pieces whether one or three are shown (Classic order).
  const one = createGame({ seed: 7, rules: { ...CLASSIC_RULES } }), three = createGame({ seed: 7, rules: { ...CLASSIC_RULES, preview: 3 } })
  assert.deepEqual([one.active?.type, one.next], [three.active?.type, three.next])
})

function withActive(rules = MODERN_RULES, active: GameState['active']): GameState {
  return { ...createGame({ seed: 3, rules }), active, lowestY: active!.y }
}

test('F-052: a vertical I piece at the right wall turns with wall kicks, and not without', () => {
  const piece = { type: 'I' as const, rotation: 1, x: 7, y: 5 }
  const modern = dispatch(withActive(MODERN_RULES, piece), 'rotateClockwise')
  assert.equal(modern.state.active?.rotation, 2)
  assert.equal(modern.state.active?.x, 6)
  const classic = dispatch(withActive(CLASSIC_RULES, piece), 'rotateClockwise')
  assert.deepEqual(classic.state.active, piece)
  assert.equal(classic.events.length, 0)
})

test('F-053: a landed piece waits half a second, moving restarts the wait, and the restarts run out', () => {
  const floor = withActive(MODERN_RULES, { type: 'T', rotation: 0, x: 3, y: 18 })
  const waiting = advanceFrames(floor, LOCK_DELAY_FRAMES - 1).state
  assert.deepEqual(waiting.active, floor.active, 'still movable')
  const locked = advanceFrames(waiting, 1)
  assert.ok(locked.events.some(event => event.type === 'locked'))
  // A move restarts the wait.
  let game = advanceFrames(floor, 20).state
  game = dispatch(game, 'moveLeft').state
  game = advanceFrames(game, 20).state
  assert.equal(game.active?.x, 2, 'not locked after 40 frames with a move between')
  // After the last restart a resting piece locks at once.
  game = floor
  for (let i = 0; i < MAX_LOCK_RESETS; i++) { game = advanceFrames(game, 1).state; game = dispatch(game, i % 2 ? 'moveLeft' : 'moveRight').state }
  assert.equal(game.lockResets, MAX_LOCK_RESETS)
  assert.ok(advanceFrames(game, 1).events.some(event => event.type === 'locked'))
  // Classic: no wait, the next fall locks it.
  const classic = withActive(CLASSIC_RULES, { type: 'T', rotation: 0, x: 3, y: 18 })
  assert.ok(dispatch(classic, 'softDrop').events.some(event => event.type === 'locked'))
})

test('checkpoints carry the rules and refuse a game played under other rules', () => {
  const game = advanceFrames(dispatch(createGame({ seed: 5, rules: MODERN_RULES, holdEnabled: true }), 'hardDrop').state, 10).state
  const expected = { seed: 5, startLevel: 0, holdEnabled: true, battle: false, rules: MODERN_RULES }
  assert.deepEqual(validateCheckpoint(game, expected), game)
  assert.throws(() => validateCheckpoint(game, { ...expected, rules: CLASSIC_RULES }))
  assert.throws(() => validateCheckpoint({ ...game, queue: [] }, expected))
  assert.deepEqual(validateCheckpoint(createGame({ seed: 5 }), { ...expected, holdEnabled: false, rules: undefined }).rules, CLASSIC_RULES)
})

test('rules choice: presets, Custom, and the label a score gets', () => {
  assert.deepEqual(playRules({ preset: 'classic', custom: MODERN_PLAY }), CLASSIC_PLAY)
  assert.deepEqual(engineRules(MODERN_PLAY), MODERN_RULES)
  assert.equal(rulesLabel(MODERN_PLAY), 'modern')
  assert.equal(rulesLabel(CLASSIC_PLAY), 'classic')
  assert.equal(rulesLabel({ ...MODERN_PLAY, ghost: false }), 'custom')
})

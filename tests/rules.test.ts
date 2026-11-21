import assert from 'node:assert/strict'
import test from 'node:test'
import { advanceFrames, CLASSIC_RULES, createGame, createRandomizer, dispatch, drawPiece, LOCK_DELAY_FRAMES, MAX_LOCK_RESETS, MODERN_RULES, modernClearPoints, PIECE_TYPES } from '../src/engine/index.ts'
import { visibleBoard } from '../src/multiplayer/game-snapshot.ts'
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

test('F-057: with pieces above the board a full top no longer ends the game at once; a lock above the board does', () => {
  const blocked = (rules: typeof MODERN_RULES): GameState => {
    const game = createGame({ seed: 3, rules })
    const board = game.board.map((row, y) => y < 2 ? row.map((_, x) => x >= 3 && x <= 6 ? 'G' as const : null) : [...row])
    return { ...game, board, active: { type: 'O', rotation: 0, x: 0, y: 5 }, lowestY: 5, next: 'T' }
  }
  const classic = dispatch(blocked(CLASSIC_RULES), 'hardDrop').state
  assert.equal(classic.status, 'gameOver', 'Classic: no room at the top ends the game')
  const modern = dispatch(blocked(MODERN_RULES), 'hardDrop').state
  assert.equal(modern.status, 'playing')
  assert.deepEqual([modern.active?.type, modern.active?.y], ['T', -2], 'the T appears in the two rows above the board')
  assert.ok(!visibleBoard(modern).includes('3'), 'cells above the board are not drawn')
  assert.equal(validateCheckpoint(modern, { seed: 3, startLevel: 0, holdEnabled: false, battle: true, rules: MODERN_RULES }).active?.y, -2, 'a saved game with a piece above the board is accepted')
  const locked = dispatch(modern, 'hardDrop')
  assert.equal(locked.state.status, 'gameOver', 'a piece that locks above the board ends the game')
  assert.ok(locked.events.some(event => event.type === 'gameOver'))
  assert.equal(engineRules(MODERN_PLAY).spawnAbove, true)
  assert.equal(engineRules(CLASSIC_PLAY).spawnAbove, false)
})

test('F-058: modern scoring is off in Classic and Modern; when chosen, T-spins, back-to-back and combos score more', () => {
  assert.equal(MODERN_PLAY.scoring, false)
  assert.equal(CLASSIC_PLAY.scoring, false)
  assert.equal(rulesLabel({ ...MODERN_PLAY, scoring: true }), 'custom')
  assert.deepEqual([1, 2, 3, 4].map(rows => modernClearPoints(rows, 0, false, false, 0).points), [100, 300, 500, 800])
  assert.deepEqual([0, 1, 2, 3].map(rows => modernClearPoints(rows, 0, true, false, 0).points), [400, 800, 1200, 1600])
  assert.equal(modernClearPoints(4, 0, false, true, 0).points, 1200, 'back-to-back Tetris × 1.5')
  assert.equal(modernClearPoints(1, 0, false, true, 0).points, 100, 'a single is not difficult')
  assert.equal(modernClearPoints(1, 0, false, false, 2).points, 200, 'third clear in a row: + 50 × 2')
  assert.equal(modernClearPoints(2, 4, false, false, 0).points, 1500, 'times (level + 1)')
  // A T rotated into a slot with three corners filled clears two rows: a T-spin double.
  const tSpinDouble = (modernScoring: boolean): GameState => {
    const game = createGame({ seed: 3, rules: { ...MODERN_RULES, modernScoring } })
    const board = game.board.map((row, y) => row.map((_, x) => y === 17 && x === 3 ? 'G' as const : y === 18 && (x < 3 || x > 5) ? 'G' as const : y === 19 && x !== 4 ? 'G' as const : null))
    return { ...game, board, active: { type: 'T', rotation: 1, x: 3, y: 17 }, lowestY: 17 }
  }
  for (const [modernScoring, score] of [[true, 1200], [false, 100]] as const) {
    const turned = dispatch(tSpinDouble(modernScoring), 'rotateClockwise').state
    assert.equal(turned.active?.rotation, 2)
    const result = dispatch(turned, 'hardDrop')
    assert.equal(result.state.lines, 2)
    assert.equal(result.state.score, score, modernScoring ? 'T-spin double' : 'plain double without modern scoring')
    assert.equal(result.events.some(event => event.type === 'bonus' && event.tSpin), modernScoring)
  }
  // Without the rotation as the last move it is a plain double.
  const slid = { ...tSpinDouble(true), active: { type: 'T' as const, rotation: 2, x: 3, y: 17 } }
  assert.equal(dispatch(slid, 'hardDrop').state.score, 300)
})

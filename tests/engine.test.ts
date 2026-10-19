import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  advanceFrames, advanceGame, BOARD_HEIGHT, BOARD_WIDTH, clearRows, collides, createBoard,
  createGame, createRandomizer, dispatch, drawPiece, firstLevelThreshold, FRAME_MS,
  framesPerFall, levelForLines, lineClearPoints, lockPiece, orientationCount,
  pieceCells, PIECE_TYPES, rotatedPiece, spawnPiece,
} from '../src/engine/index.ts'
import type { Cell, GameAction, GameState, PieceType } from '../src/engine/index.ts'
import { createScenario } from '../src/dev/scenario.ts'

function emptyBoard(): Cell[][] {
  return createBoard().map((row) => [...row])
}

function countCells(state: GameState): number {
  return state.board.flat().filter((cell) => cell !== null).length
}

function sequence(seed: number, length: number): PieceType[] {
  let randomizer = createRandomizer(seed)
  return Array.from({ length }, () => {
    const drawn = drawPiece(randomizer)
    randomizer = drawn.randomizer
    return drawn.piece
  })
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

function lineScenario(rows: number, startLevel = 0, lines = 0): GameState {
  const board = emptyBoard()
  for (let y = BOARD_HEIGHT - rows; y < BOARD_HEIGHT; y++) {
    board[y] = Array.from({ length: BOARD_WIDTH }, (_, x) => x === 5 ? null : 'J')
  }
  return createScenario({
    seed: 47, startLevel, lines, board,
    active: { type: 'I', rotation: 1, x: 3, y: 0 }, next: 'T',
  })
}

test('new game has a 10 × 20 independent board, preview, and default rules', () => {
  const game = createGame({ seed: 47 })
  assert.equal(game.board.length, 20)
  assert.ok(game.board.every((row) => row.length === 10 && row.every((cell) => cell === null)))
  assert.equal(new Set(game.board).size, 20)
  assert.equal(game.level, 0)
  assert.equal(game.score, 0)
  assert.equal(game.lines, 0)
  assert.equal(game.status, 'playing')
  assert.equal(game.holdEnabled, false)
  assert.equal(game.hardDropEnabled, true)
  assert.equal(game.held, null)
  assert.equal(game.holdUsed, false)
  assert.equal(game.randomizer.index, 2)
  assert.equal(game.active?.type, sequence(47, 2)[0])
  assert.equal(game.next, sequence(47, 2)[1])
})

test('a game without a supplied seed receives a valid fresh seed', () => {
  const game = createGame()
  assert.ok(Number.isInteger(game.randomizer.seed))
  assert.ok(game.randomizer.seed >= 0 && game.randomizer.seed <= 0xffffffff)
})

for (const type of PIECE_TYPES) {
  test(`${type}: four distinct connected cells in every orientation; spawns and locks`, () => {
    let active = spawnPiece(type)
    const initial = active
    for (let rotation = 0; rotation < orientationCount(type); rotation++) {
      const cells = pieceCells(active)
      const occupied = new Set(cells.map(([x, y]) => `${x},${y}`))
      assert.equal(cells.length, 4)
      assert.equal(occupied.size, 4)
      // Flood fill checks that a malformed shape cannot contain disconnected blocks.
      const visited = new Set<string>()
      const pending = [cells[0]]
      while (pending.length) {
        const [x, y] = pending.pop()!
        const key = `${x},${y}`
        if (!occupied.has(key) || visited.has(key)) continue
        visited.add(key)
        pending.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1])
      }
      assert.equal(visited.size, 4)
      assert.equal(collides(createBoard(), active), false)
      active = rotatedPiece(active, 'clockwise')
    }
    assert.deepEqual(active, initial)
    assert.deepEqual(rotatedPiece(rotatedPiece(initial, 'clockwise'), 'counterclockwise'), initial)
    const state = createScenario({ seed: 47, active: initial, next: 'O' })
    const result = dispatch(state, 'hardDrop')
    assert.equal(countCells(result.state), 4)
    assert.equal(result.state.active?.type, 'O')
    assert.equal(result.state.score, 0)
    assert.equal(result.events.filter((event) => event.type === 'locked').length, 1)
    assert.equal(result.state.board[19].some((cell) => cell === type), true)
  })
}

test('orientation counts use classic two-state I/S/Z, single-state O and four-state J/L/T', () => {
  assert.deepEqual(PIECE_TYPES.map(orientationCount), [2, 1, 4, 2, 2, 4, 4])
})

test('T clockwise and counterclockwise rotations use anchored orientations', () => {
  const active = spawnPiece('T')
  assert.deepEqual(pieceCells(active), [[4, 0], [3, 1], [4, 1], [5, 1]])
  assert.deepEqual(pieceCells(rotatedPiece(active, 'clockwise')), [[4, 0], [4, 1], [5, 1], [4, 2]])
  assert.deepEqual(pieceCells(rotatedPiece(active, 'counterclockwise')), [[4, 0], [3, 1], [4, 1], [4, 2]])
})

test('wall, floor, ceiling and locked-cell collisions', () => {
  const board = emptyBoard()
  const piece = spawnPiece('O')
  assert.equal(collides(board, { ...piece, x: -1, y: 18 }), false)
  assert.equal(collides(board, { ...piece, x: -2 }), true)
  assert.equal(collides(board, { ...piece, x: 7 }), false)
  assert.equal(collides(board, { ...piece, x: 8 }), true)
  assert.equal(collides(board, { ...piece, y: -1 }), true)
  assert.equal(collides(board, { ...piece, y: 19 }), true)
  board[1][4] = 'J'
  assert.equal(collides(board, piece), true)
  assert.throws(() => lockPiece(board, piece), RangeError)
})

test('horizontal movement stops at walls and blocks without changing timers or RNG', () => {
  const board = emptyBoard()
  board[0][6] = 'J'
  let state = createScenario({ seed: 47, active: spawnPiece('O'), board })
  const randomizer = state.randomizer
  assert.strictEqual(dispatch(state, 'moveRight').state, state)
  for (let i = 0; i < 20; i++) state = dispatch(state, 'moveLeft').state
  assert.equal(state.active?.x, -1)
  assert.strictEqual(dispatch(state, 'moveLeft').state, state)
  assert.equal(state.gravityFrames, 0)
  assert.strictEqual(state.randomizer, randomizer)
})

for (const [name, active, obstacle] of [
  ['wall', { type: 'T', rotation: 1, x: -1, y: 3 }, null],
  ['floor', { type: 'T', rotation: 0, x: 3, y: 18 }, null],
  ['ceiling', { type: 'I', rotation: 0, x: 3, y: -1 }, null],
  ['block', { type: 'T', rotation: 0, x: 3, y: 2 }, [4, 4]],
] as const) {
  test(`rotation rejects ${name} collision without a kick`, () => {
    const board = emptyBoard()
    if (obstacle) board[obstacle[1]][obstacle[0]] = 'J'
    const game = createScenario({ seed: 47, board, active })
    assert.strictEqual(dispatch(game, 'rotateClockwise').state, game)
    assert.deepEqual(dispatch(game, 'rotateClockwise').events, [])
  })
}

test('O rotation is an unchanged no-op', () => {
  const game = createScenario({ seed: 47, active: spawnPiece('O') })
  assert.strictEqual(dispatch(game, 'rotateClockwise').state, game)
})

for (const [level, frames] of [[0,48],[1,43],[8,8],[9,6],[10,5],[12,5],[13,4],[15,4],[16,3],[18,3],[19,2],[28,2],[29,1],[45,1]]) {
  test(`level ${level}: gravity advances one row every ${frames} frames`, () => {
    assert.equal(framesPerFall(level), frames)
    const game = createScenario({
      seed: 47, startLevel: level > 19 ? 19 : level,
      lines: level > 19 ? 140 + (level - 20) * 10 : 0, active: spawnPiece('T'),
    })
    const before = advanceFrames(game, frames - 1).state
    assert.equal(before.active?.y, 0)
    const after = advanceFrames(before, 1).state
    assert.equal(after.active?.y, 1)
    assert.equal(after.score, 0)
  })
}

test('landing waits for the next blocked downward step before locking', () => {
  let game = createScenario({ seed: 47, active: { ...spawnPiece('O'), y: 17 }, next: 'T' })
  game = advanceFrames(game, 48).state
  assert.equal(game.active?.y, 18)
  assert.equal(countCells(game), 0)
  assert.equal(countCells(advanceFrames(game, 47).state), 0)
  const locked = advanceFrames(game, 48)
  assert.equal(countCells(locked.state), 4)
  assert.equal(locked.state.active?.type, 'T')
  assert.equal(locked.state.active?.y, 0)
})

test('elapsed milliseconds preserve incomplete frames and exact gravity boundaries', () => {
  const game = createScenario({ seed: 47, active: spawnPiece('T') })
  const partial = advanceGame(game, 5).state
  assert.equal(partial.gravityFrames, 0)
  assert.equal(partial.remainderMs, 5)
  const before = advanceGame(partial, 794).state
  assert.equal(before.active?.y, 0)
  const after = advanceGame(before, 1).state
  assert.equal(after.active?.y, 1)
  assert.equal(after.remainderMs, 0)
})

test('60 Hz, 120 Hz, irregular frames and batched elapsed time agree across multiple locks', () => {
  const game = createGame({ seed: 47, startLevel: 19 })
  for (const duration of [1000, 5000]) {
    const expected = advanceGame(game, duration)
    if (duration === 1000) assert.equal(expected.state.status, 'playing')
    const frames = duration * 60 / 1000
    for (const schedule of [Array(frames).fill(FRAME_MS), Array(frames * 2).fill(FRAME_MS / 2), [1, 23, duration / 2, 7, duration / 2 - 31]]) {
      let state = game
      const events = []
      for (const ms of schedule) {
        const next = advanceGame(state, ms)
        state = next.state
        events.push(...next.events)
      }
      assert.deepEqual(state, expected.state)
      assert.deepEqual(events, expected.events)
    }
    if (duration === 5000) assert.ok(expected.events.filter((event) => event.type === 'locked').length > 1)
  }
})

test('soft drop moves one cell without scoring and resets the gravity interval', () => {
  const initial = createScenario({ seed: 47, active: spawnPiece('O') })
  let state = advanceFrames(initial, 47).state
  state = dispatch(state, 'softDrop').state
  assert.equal(state.active?.y, 1)
  assert.equal(state.score, 0)
  assert.equal(state.gravityFrames, 0)
  state = advanceFrames(state, 1).state
  assert.equal(state.active?.y, 1)
})

test('blocked soft drop locks without awarding points', () => {
  const game = createScenario({ seed: 47, active: { ...spawnPiece('O'), y: 18 } })
  const result = dispatch(game, 'softDrop')
  assert.equal(countCells(result.state), 4)
  assert.equal(result.state.score, 0)
  assert.ok(result.events.some((event) => event.type === 'locked'))
})

test('hard drop stops on blocks, locks immediately and never awards distance points', () => {
  const board = emptyBoard()
  board[10][4] = 'J'
  const game = createScenario({ seed: 47, board, active: spawnPiece('O'), next: 'I' })
  const result = dispatch(game, 'hardDrop')
  assert.equal(result.state.score, 0)
  assert.equal(result.state.board[9][4], 'O')
  assert.equal(result.state.board[10][4], 'J')
  assert.deepEqual(result.events[0], { type: 'hardDropped', distance: 8 })
  assert.equal(result.state.active?.type, 'I')
})

test('hard drop disabled is a no-op; a grounded hard drop still locks', () => {
  const disabled = createGame({ seed: 47, hardDropEnabled: false })
  assert.strictEqual(dispatch(disabled, 'hardDrop').state, disabled)
  const game = createScenario({ seed: 47, active: { ...spawnPiece('O'), y: 18 } })
  const result = dispatch(game, 'hardDrop')
  assert.deepEqual(result.events[0], { type: 'hardDropped', distance: 0 })
  assert.equal(countCells(result.state), 4)
})

for (const [rows, base] of [[1,40],[2,100],[3,300],[4,1200]]) {
  test(`${rows}-row clear compacts the board and scores ${base} × (level + 1)`, () => {
    const initial = lineScenario(rows, 7)
    const result = dispatch(initial, 'hardDrop')
    assert.equal(result.state.lines, rows)
    assert.equal(result.state.score, base * 8)
    assert.equal(countCells(result.state), 4 - rows)
    assert.equal(result.state.board.length, 20)
    assert.ok(result.state.board.slice(0, rows).flat().every((cell) => cell === null))
    assert.deepEqual(result.events.find((event) => event.type === 'linesCleared'), { type: 'linesCleared', count: rows, points: base * 8 })
    assert.equal(countCells(initial), rows * 9)
  })
}

test('row clearing preserves the order and contents of non-full rows', () => {
  const board = emptyBoard()
  board[15][2] = 'T'
  board[16].fill('J')
  board[17][5] = 'S'
  board[19].fill('O')
  const cleared = clearRows(board)
  assert.equal(cleared.cleared, 2)
  assert.equal(cleared.board[17][2], 'T')
  assert.equal(cleared.board[18][5], 'S')
  assert.equal(cleared.board[19].every((cell) => cell === null), true)
  assert.equal(board[16].every((cell) => cell === 'J'), true)
  assert.strictEqual(clearRows(createBoard()).cleared, 0)
})

test('scoring has no combo/T-spin bonus and no score for zero lines', () => {
  for (const level of [0, 9, 19, 29]) {
    assert.deepEqual([0,1,2,3,4].map((rows) => lineClearPoints(rows, level)), [0,40,100,300,1200].map((base) => base * (level + 1)))
  }
  assert.throws(() => lineClearPoints(5, 0), RangeError)
})

for (const [start, threshold] of [[0,10],[1,20],[9,100],[10,100],[15,100],[16,110],[19,140]]) {
  test(`starting level ${start} first transitions at ${threshold} lines, then every 10`, () => {
    assert.equal(firstLevelThreshold(start), threshold)
    assert.equal(levelForLines(start, threshold - 1), start)
    assert.equal(levelForLines(start, threshold), start + 1)
    assert.equal(levelForLines(start, threshold + 9), start + 1)
    assert.equal(levelForLines(start, threshold + 10), start + 2)
  })
}

test('a transition clear uses the old level for score and the new level for gravity', () => {
  const result = dispatch(lineScenario(1, 0, 9), 'hardDrop')
  assert.equal(result.state.lines, 10)
  assert.equal(result.state.level, 1)
  assert.equal(result.state.score, 40)
  assert.deepEqual(result.events.find((event) => event.type === 'levelChanged'), { type: 'levelChanged', from: 0, to: 1 })
  assert.equal(advanceFrames(result.state, 42).state.active?.y, 0)
  assert.equal(advanceFrames(result.state, 43).state.active?.y, 1)
})

test('Hold defaults off; an empty Hold consumes exactly one preview and allows no second Hold', () => {
  const disabled = createGame({ seed: 47 })
  assert.strictEqual(dispatch(disabled, 'hold').state, disabled)
  const game = createGame({ seed: 47, holdEnabled: true })
  const held = dispatch(game, 'hold').state
  assert.equal(held.held, game.active?.type)
  assert.equal(held.active?.type, game.next)
  assert.equal(held.randomizer.index, game.randomizer.index + 1)
  assert.equal(held.holdUsed, true)
  assert.strictEqual(dispatch(held, 'hold').state, held)
  const locked = dispatch(held, 'hardDrop').state
  assert.equal(locked.holdUsed, false)
  assert.equal(dispatch(locked, 'hold').state.holdUsed, true)
})

test('Hold swap resets position and rotation without consuming preview or randomness', () => {
  const game = createScenario({
    seed: 47, holdEnabled: true, held: 'L',
    active: { type: 'T', rotation: 2, x: 2, y: 6 }, next: 'I',
  })
  const result = dispatch(game, 'hold')
  assert.deepEqual(result.state.active, spawnPiece('L'))
  assert.equal(result.state.held, 'T')
  assert.equal(result.state.next, 'I')
  assert.strictEqual(result.state.randomizer, game.randomizer)
  assert.equal(countCells(result.state), 0)
})

for (const held of [undefined, 'T'] as const) {
  test(`blocked ${held ? 'swap' : 'empty'} Hold ends the game without overwriting blocks`, () => {
    const board = emptyBoard()
    board[1][4] = 'Z'
    const game = createScenario({ seed: 47, board, holdEnabled: true, held, active: { ...spawnPiece('O'), y: 10 }, next: 'I' })
    const result = dispatch(game, 'hold')
    assert.equal(result.state.status, 'gameOver')
    assert.equal(result.state.active, null)
    assert.equal(result.state.held, 'O')
    assert.deepEqual(result.state.board, board)
    assert.equal(result.state.randomizer.index, game.randomizer.index + (held ? 0 : 1))
  })
}

test('blocked next spawn ends play after locking; game-over actions and time are ignored', () => {
  const board = emptyBoard()
  board[0][4] = 'Z'
  const game = createScenario({ seed: 47, board, active: { ...spawnPiece('O'), y: 18 }, next: 'T' })
  const result = dispatch(game, 'hardDrop')
  assert.equal(result.state.status, 'gameOver')
  assert.equal(result.state.active, null)
  assert.equal(countCells(result.state), 5)
  assert.equal(result.events.at(-1)?.type, 'gameOver')
  for (const action of ['moveLeft','moveRight','rotateClockwise','rotateCounterclockwise','softDrop','hardDrop','hold','pause','resume'] as const) {
    assert.strictEqual(dispatch(result.state, action).state, result.state)
  }
  assert.strictEqual(advanceGame(result.state, 60000).state, result.state)
})

test('rows clear before testing the next spawn', () => {
  const original = lineScenario(1)
  const board = original.board.map((row) => [...row])
  board[1][3] = 'Z'
  const state = { ...original, board, next: 'I' as const }
  assert.equal(collides(board, spawnPiece('I')), true)
  const result = dispatch(state, 'hardDrop')
  assert.equal(result.state.status, 'playing')
  assert.equal(result.state.active?.type, 'I')
  assert.equal(result.state.board[2][3], 'Z')
})

test('pause freezes time, actions and RNG; resume preserves the unfinished fall', () => {
  const initial = advanceGame(createGame({ seed: 47 }), 123).state
  const paused = dispatch(initial, 'pause').state
  assert.equal(paused.status, 'paused')
  assert.strictEqual(advanceGame(paused, 90000).state, paused)
  assert.strictEqual(dispatch(paused, 'hardDrop').state, paused)
  assert.strictEqual(dispatch(paused, 'hold').state, paused)
  assert.strictEqual(dispatch(paused, 'pause').state, paused)
  const resumed = dispatch(paused, 'resume').state
  assert.deepEqual(resumed, initial)
  assert.deepEqual(advanceGame(resumed, 677), advanceGame(createGame({ seed: 47 }), 800))
})

test('piece generation repeats for a seed, diverges for another and is not a seven-bag', () => {
  // Fixed vectors calculated independently from the documented integer algorithm.
  assert.equal(sequence(1, 20).join(''), 'OLSITSZSLOZIOLOSLOJZ')
  assert.equal(sequence(47, 20).join(''), 'JOTSOSILJTJTTLTZSJST')
  const first = sequence(47, 128)
  assert.deepEqual(sequence(47, 128), first)
  assert.notDeepEqual(sequence(48, 128), first)
  assert.ok(first.some((piece, i) => i > 0 && piece === first[i - 1]))
  assert.ok(new Set(first.slice(0, 7)).size < 7)
  assert.deepEqual(new Set(first), new Set(PIECE_TYPES))
})

test('seed zero is supported and randomizer snapshots continue exactly', () => {
  const zero = createRandomizer(0)
  assert.notEqual(zero.state, 0)
  const draw = drawPiece(zero)
  assert.deepEqual(drawPiece(JSON.parse(JSON.stringify(draw.randomizer))), drawPiece(draw.randomizer))
  assert.equal(zero.index, 0)
  assert.equal(draw.randomizer.index, 1)
})

test('movement, rotation, elapsed speed and Hold swap never rewrite generated order', () => {
  const base = createGame({ seed: 47, holdEnabled: true })
  const expected = sequence(47, 12)
  let current = base
  const consumed = [current.active!.type, current.next]
  current = dispatch(current, 'hold').state
  consumed.push(current.next)
  for (let i = 0; i < 8; i++) {
    const before = current.randomizer
    for (let move = 0; move < 4; move++) current = dispatch(current, i % 2 ? 'moveRight' : 'moveLeft').state
    current = dispatch(current, 'rotateClockwise').state
    current = advanceFrames(current, 1).state
    assert.strictEqual(current.randomizer, before)
    current = dispatch(current, 'hardDrop').state
    assert.equal(current.status, 'playing')
    consumed.push(current.next)
    const beforeSwap = current.randomizer
    current = dispatch(current, 'hold').state
    assert.strictEqual(current.randomizer, beforeSwap)
  }
  assert.deepEqual(consumed, expected.slice(0, consumed.length))
})

test('JSON snapshots preserve a partially advanced game and deterministic continuation', () => {
  let state = createGame({ seed: 47, holdEnabled: true, startLevel: 7 })
  state = dispatch(state, 'hold').state
  state = advanceGame(state, 103).state
  const restored: GameState = JSON.parse(JSON.stringify(state))
  assert.deepEqual(restored, state)
  const actions: GameAction[] = ['moveLeft','rotateCounterclockwise','softDrop','hardDrop','hold','hardDrop']
  let original = state
  let replay = restored
  for (const action of actions) {
    const a = dispatch(original, action)
    const b = dispatch(replay, action)
    assert.deepEqual(a, b)
    original = advanceGame(a.state, 197).state
    replay = advanceGame(b.state, 197).state
    assert.deepEqual(original, replay)
  }
})

test('all transitions preserve deeply frozen caller-owned state', () => {
  const state = deepFreeze(createGame({ seed: 47, holdEnabled: true }))
  const snapshot = JSON.stringify(state)
  for (const action of ['moveLeft','moveRight','rotateClockwise','rotateCounterclockwise','softDrop','hardDrop','hold','pause','resume'] as const) {
    dispatch(state, action)
  }
  advanceGame(state, 2000)
  assert.equal(JSON.stringify(state), snapshot)
  const clear = deepFreeze(lineScenario(4))
  dispatch(clear, 'hardDrop')
})

test('invalid game options, time, frames, levels and seeds fail explicitly', () => {
  for (const level of [-1, 20, 1.5, Infinity, NaN]) assert.throws(() => createGame({ startLevel: level }), RangeError)
  for (const seed of [-1, 2 ** 32, 1.5, Infinity, NaN]) assert.throws(() => createGame({ seed }), RangeError)
  const game = createGame({ seed: 47 })
  for (const ms of [-1, Infinity, NaN]) assert.throws(() => advanceGame(game, ms), RangeError)
  for (const frames of [-1, 0.5, Infinity]) assert.throws(() => advanceFrames(game, frames), RangeError)
  assert.throws(() => levelForLines(0, -1), RangeError)
  assert.throws(() => framesPerFall(-1), RangeError)
  assert.strictEqual(advanceGame(game, 0).state, game)
})

test('developer scenarios reject malformed and colliding boards', () => {
  assert.throws(() => createScenario({ board: [[null]] }), RangeError)
  const board = emptyBoard()
  board[0][4] = 'J'
  assert.throws(() => createScenario({ board, active: spawnPiece('T') }), RangeError)
})

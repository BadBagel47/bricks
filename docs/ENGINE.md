# Bricks engine — Milestone 1.2

The engine in `src/engine` is independent of React, DOM input, audio and Firebase. It is NES-inspired, not an exact NES emulator. Rendering and keyboard integration belong to Milestone 1.3.

## Public API

```ts
import { createGame, dispatch, advanceGame } from '../src/engine/index.ts'

let game = createGame({ seed: 47, startLevel: 0, holdEnabled: false })
game = dispatch(game, 'moveLeft').state
game = advanceGame(game, 1000 / 60).state
```

`createGame` accepts an optional unsigned 32-bit seed, starting level 0–19, optional Hold (default OFF) and personal Hard Drop (default ON). Omitting the seed generates a new seed with `crypto.getRandomValues`. The caller must create a new game for each new round.

`dispatch` accepts `moveLeft`, `moveRight`, `rotateClockwise`, `rotateCounterclockwise`, `softDrop`, `hardDrop`, `hold`, `pause`, and `resume`. Key repeat, held-button intervals and input mapping belong to the input layer.

`dispatch`, `advanceFrames` and `advanceGame` return `{ state, events }`. They preserve their input state; board writes copy rows. Events report movement, rotation, hard drop, locking, line clears, level changes, spawning, Hold, pause/resume and Game Over. Invalid or unavailable actions produce no events. Consumers must handle the events from each returned transition once; events are not stored in game snapshots.

## Board, spawning and rotation

- The board has 10 columns and 20 rows. `(0, 0)` is top left. Cells are `null` or a piece type; color belongs to the renderer's future level palettes.
- Active cells are separate from locked board cells. Spawn anchor is `(3, 0)`, rotation 0. There are no hidden rows. O occupies columns 4–5, rows 0–1. I starts horizontally in columns 3–6, row 1. Other pieces occupy the top two rows.
- `pieces.ts` contains the complete anchored orientation tables. I/S/Z have two orientations, O one, and J/L/T four. Counterclockwise traverses the same tables in reverse. Rotation never translates the anchor and is rejected on wall, floor, ceiling or locked-cell collision. There are no SRS kicks, T-spin bonuses or ghost piece.
- A successful downward step moves one cell. On a blocked gravity/Soft Drop step, the piece locks immediately; there is no extra lock delay. A piece that just lands remains movable until its next downward attempt. Hard Drop moves to the lowest legal position and locks immediately, even at distance zero.
- Locking writes the four cells, removes all full rows simultaneously, preserves remaining row order, adds empty rows at the top, scores the clear, updates level, resets Hold allowance, and spawns the preview piece.
- A blocked required spawn (including Hold/swap) sets `status: 'gameOver'` and `active: null`. It never overwrites locked cells. Game Over ignores subsequent actions and elapsed time.

## Time and pause

Simulation uses fixed 60 Hz frames. `advanceFrames(state, n)` is the exact integer-frame API for deterministic replays. `advanceGame(state, elapsedMs)` accumulates partial frames and executes only complete frames. A tolerance of less than 0.0000001 ms removes floating-point noise at frame boundaries. The same elapsed time and action schedule produce the same simulation regardless of rendering cadence; actions must be applied at the same simulated boundaries when comparing replays.

All complete frames are processed, including multiple locks within one update; elapsed time is not silently clamped or discarded. Pause freezes gravity, partial-frame time, actions and the randomizer. The UI must reset its real-time timestamp on resume and pause on backgrounding where appropriate, so wall-clock suspension does not become catch-up gameplay. Personal pause is currently single-player only; multiplayer remains unimplemented.

| Level | Frames per downward cell |
| --- | ---: |
| 0–8 | 48, 43, 38, 33, 28, 23, 18, 13, 8 |
| 9 | 6 |
| 10–12 | 5 |
| 13–15 | 4 |
| 16–18 | 3 |
| 19–28 | 2 |
| 29+ | 1 |

Successful automatic and Soft Drop movement reset the gravity-frame counter. Horizontal movement and rotation do not reset it. The input layer can repeat Soft Drop actions; each successful action awards one point, each blocked action awards zero. This is a simple documented classic-inspired rule, not an emulation of NES input-scoring quirks. Hard Drop has no distance bonus. Gravity itself awards no points.

## Scores and progression

Line clears score `40 / 100 / 300 / 1200 × (level + 1)` for one/two/three/four rows. The multiplier uses the level **before** the clear, including when that clear advances the level. There are no combo bonuses.

The first transition threshold for starting level `s` is `min((s + 1) × 10, max(100, s × 10 − 50))` total lines. Examples: start 0 → 10, start 9–15 → 100, start 16 → 110, start 19 → 140. Subsequent levels require another ten total lines each. Progression can exceed 19; only the initial selection is limited to 0–19.

## Deterministic piece stream

The piece order is `[I, O, T, S, Z, J, L]`.

1. Xorshift32 updates unsigned state using XOR with shifts left 13, unsigned right 17 and left 5. Seed 0 maps to nonzero state `0x6d2b79f5`; all other seeds start with their supplied value.
2. Draw a candidate from eight choices. Candidate 7 or a repeat of the previous piece triggers one redraw from seven choices. That redraw is accepted even if repeated. Sampling rejects integers outside the largest multiple of the requested range below `2^32` before applying modulo.
3. Save the new PRNG state, previous output and piece index. This permits repeats and droughts, with no guaranteed seven-bag.

Golden first-20 vectors: seed 1 → `OLSITSZSLOZIOLOSLOJZ`; seed 47 → `JOTSOSILJTJTTLTZSJST`.

Game creation draws the active piece and one preview (index 2). Every consumption of the preview draws exactly one replacement. Empty Hold consumes the preview; swapping an occupied Hold does not draw anything. Hold resets the incoming piece to spawn position/orientation and is limited to once between locks. Movement, rotation, elapsed time and occupied Hold swaps do not alter randomizer state; gravity advances the stream only when it locks and spawns a piece. Consequently, timing and Hold can change **which** generated piece is active, but never the order of the generated stream. Future penalty rows must use a separate random stream; no Battle or multiplayer logic exists yet.

## Reproduction and snapshots

`GameState` is plain JSON with `version: 1`, board, active/next/Hold, Hold allowance, rules, starting/current level, score, total lines, randomizer seed/state/index, status and time counters. A trusted `JSON.parse(JSON.stringify(state))` round trip preserves deterministic continuation. This milestone does not provide a validator for untrusted imported/network data or a migration system for future versions.

For developer scenarios, import `createScenario` from `src/dev/scenario.ts`, outside the normal application menus:

```ts
const game = createScenario({
  seed: 47,
  startLevel: 19,
  board: myBoard,
  active: { type: 'I', rotation: 1, x: 3, y: 0 },
  next: 'T',
})
```

The helper validates board dimensions/cells, active placement and numeric scores/lines, clones the board and derives the current level. A seed reproduces the subsequent piece sequence. Optional active/next overrides prescribe the first two pieces without rewinding the seeded continuation (which resumes after the two creation draws). Import a trusted complete snapshot instead when reproducing an existing game's exact randomizer/timers. The test fixtures include one- through four-line clears, blocked spawn, Hold and level transitions.

## Validation

Run `npm test` with Node.js 24. It first type-checks the engine, scenarios and tests with strict TypeScript, then runs Node's built-in test runner. No additional test dependencies are required. `npm run lint` and `npm run build` remain separate checks. GitHub Pages CI runs all three before deployment.

import { createGame, dispatch } from '../../src/engine/game.ts'
import type { GameAction } from '../../src/engine/types.ts'
export function planInputs(seed: number, startLevel: number, minimumRows = 1) {
  let game = createGame({ seed: seed, startLevel: startLevel })
  const actions: GameAction[] = []
  for (let piece = 0; piece < 120 && game.score === 0; piece++) {
    let best: { cost: number; state: typeof game; actions: typeof actions } | null = null
    for (let rotation = 0; rotation < 4; rotation++) for (let dx = -5; dx <= 5; dx++) {
      const candidate: typeof actions = [...Array.from({ length: rotation }, () => 'rotateClockwise' as const), ...Array.from({ length: Math.abs(dx) }, () => dx < 0 ? 'moveLeft' as const : 'moveRight' as const), 'hardDrop']
      let state = game
      for (const action of candidate) state = dispatch(state, action).state
      if (state.status !== 'playing') continue
      if (state.lines > game.lines && state.lines - game.lines < minimumRows) continue
      if (minimumRows > 1 && state.board.some(row => row[9] !== null) && state.lines - game.lines < minimumRows) continue
      const heights = Array.from({ length: 10 }, (_, x) => { const y = state.board.findIndex(row => row[x] !== null); return y < 0 ? 0 : 20 - y })
      const holes = heights.reduce((sum, h, x) => sum + state.board.slice(20 - h).filter(row => row[x] === null).length, 0)
      const bumps = heights.slice(1).reduce((sum, h, i) => sum + Math.abs(h - heights[i]), 0)
      const cost = holes * 20 + heights.reduce((sum, h) => sum + h, 0) + bumps * 2 - state.score * 100
      if (!best || cost < best.cost) best = { cost, state, actions: candidate }
    }
    if (!best) break
    game = best.state; actions.push(...best.actions)
  }
  return { actions, score: game.score, lines: game.lines }
}

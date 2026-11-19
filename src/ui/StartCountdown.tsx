import { useState } from 'react'
import type { CSSProperties } from 'react'

/**
 * B-029: the start countdown of a 2 Players match. Each second a new brick with the
 * remaining seconds drops onto a small pile, in the logo's colours and tilts
 * (5 blue, 4 red, 3 cyan, 2 green, 1 purple).
 */
const COLORS = ['#A98BF5', '#4FD98A', '#38D1E8', '#F2706D', '#5B9CF6']
const TILTS = [-3, 4, -2, 3, -5]
const SHIFTS = [[0, 0], [10, 7], [-7, -9], [9, -6], [-10, 8]]

export function StartCountdown({ seconds }: { seconds: number }) {
  // Bricks from the value first shown, so a view that opens late does not drop bricks it missed.
  const [first] = useState(seconds)
  if (seconds <= 0) return null
  const bricks: number[] = []
  for (let n = Math.max(first, seconds); n >= seconds; n--) bricks.push(n)
  return <div className="start-countdown" role="status" aria-label={`First brick in ${seconds}`}>
    <h2 aria-hidden="true">First brick in</h2>
    <div className="start-countdown-pile" aria-hidden="true">
      {bricks.map(n => {
        const i = (n - 1) % COLORS.length
        return <span key={n} className="brand-tile" style={{ '--brick': COLORS[i], '--r': `${TILTS[i]}deg`, '--x': `${SHIFTS[i][0]}px`, '--y': `${SHIFTS[i][1]}px` } as CSSProperties}>{n}</span>
      })}
    </div>
  </div>
}

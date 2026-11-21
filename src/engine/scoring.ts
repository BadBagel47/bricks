const LINE_POINTS = [0, 40, 100, 300, 1200] as const

export function lineClearPoints(rows: number, level: number): number {
  if (!Number.isInteger(rows) || rows < 0 || rows > 4) throw new RangeError('A piece can clear 0–4 rows')
  if (!Number.isSafeInteger(level) || level < 0) throw new RangeError('Level must be a nonnegative integer')
  return LINE_POINTS[rows] * (level + 1)
}

/**
 * F-058: modern scoring, as in today's guideline games, times (level + 1) like the classic table:
 * lines 100 / 300 / 500 / 800; T-spin 400 with no lines, 800 / 1200 / 1600 with 1 / 2 / 3;
 * back-to-back (a Tetris or a T-spin with lines right after another) × 1.5; each further clear
 * in a row (combo) adds 50 × the count. Drops still give no points.
 */
const MODERN_LINE_POINTS = [0, 100, 300, 500, 800] as const
const T_SPIN_POINTS = [400, 800, 1200, 1600] as const

export function modernClearPoints(rows: number, level: number, tSpin: boolean, backToBack: boolean, combo: number): { points: number; bonus: number } {
  if (!Number.isInteger(rows) || rows < 0 || rows > 4) throw new RangeError('A piece can clear 0–4 rows')
  if (!Number.isSafeInteger(level) || level < 0) throw new RangeError('Level must be a nonnegative integer')
  const factor = level + 1
  const base = (tSpin ? T_SPIN_POINTS[Math.min(rows, 3)] : MODERN_LINE_POINTS[rows]) * factor
  const difficult = rows > 0 && (rows === 4 || tSpin)
  const withB2b = difficult && backToBack ? Math.floor(base * 1.5) : base
  const comboPoints = rows > 0 && combo > 0 ? 50 * combo * factor : 0
  const points = withB2b + comboPoints
  return { points, bonus: points - MODERN_LINE_POINTS[rows] * factor }
}

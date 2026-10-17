const LINE_POINTS = [0, 40, 100, 300, 1200] as const

export function lineClearPoints(rows: number, level: number): number {
  if (!Number.isInteger(rows) || rows < 0 || rows > 4) throw new RangeError('A piece can clear 0–4 rows')
  if (!Number.isSafeInteger(level) || level < 0) throw new RangeError('Level must be a nonnegative integer')
  return LINE_POINTS[rows] * (level + 1)
}

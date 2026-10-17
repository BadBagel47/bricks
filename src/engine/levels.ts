export const FRAMES_PER_SECOND = 60
export const FRAME_MS = 1000 / FRAMES_PER_SECOND

export function validateStartLevel(level: number): void {
  if (!Number.isInteger(level) || level < 0 || level > 19) {
    throw new RangeError('Starting level must be an integer from 0 to 19')
  }
}

export function firstLevelThreshold(startLevel: number): number {
  validateStartLevel(startLevel)
  return Math.min((startLevel + 1) * 10, Math.max(100, startLevel * 10 - 50))
}

export function levelForLines(startLevel: number, lines: number): number {
  if (!Number.isSafeInteger(lines) || lines < 0) throw new RangeError('Lines must be a nonnegative integer')
  const threshold = firstLevelThreshold(startLevel)
  return lines < threshold ? startLevel : startLevel + 1 + Math.floor((lines - threshold) / 10)
}

export function framesPerFall(level: number): number {
  if (!Number.isSafeInteger(level) || level < 0) throw new RangeError('Level must be a nonnegative integer')
  if (level <= 8) return 48 - level * 5
  if (level === 9) return 6
  if (level <= 12) return 5
  if (level <= 15) return 4
  if (level <= 18) return 3
  if (level <= 28) return 2
  return 1
}

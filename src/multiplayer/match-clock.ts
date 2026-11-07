/** Shared match time measured with a monotonic clock after the server-time anchor. */
export class MatchClock {
  private anchor: number
  private elapsed: number
  private stopped = false

  constructor(elapsed: number, now: number) {
    if (!Number.isFinite(elapsed) || !Number.isFinite(now)) throw new RangeError('Invalid match clock')
    this.elapsed = elapsed
    this.anchor = now
  }

  frame(now: number): number {
    if (!Number.isFinite(now) || now < this.anchor) throw new RangeError('Invalid match clock')
    return Math.max(0, Math.floor((this.elapsed + (this.stopped ? 0 : now - this.anchor)) * 60 / 1000))
  }

  pause(now: number): void {
    if (!Number.isFinite(now) || now < this.anchor) throw new RangeError('Invalid match clock')
    if (this.stopped) return
    this.elapsed += now - this.anchor
    this.anchor = now
    this.stopped = true
  }

  resume(now: number): void {
    if (!Number.isFinite(now) || now < this.anchor) throw new RangeError('Invalid match clock')
    if (!this.stopped) return
    this.anchor = now
    this.stopped = false
  }
}

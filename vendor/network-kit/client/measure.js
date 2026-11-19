// Anonymous measurement of connection quality in games (F-052). Turned on by
// the game (`measure: true`), which shows MEASURE_NOTICE. A summary is sent
// every 5 minutes, when the player leaves and when the page goes away. It holds
// no names, no ids and no address: only timings, counts, the kind of device and
// the browser family. The game's Worker hands it to the admin page, which keeps
// it 7 days.

export const MEASURE_NOTICE = 'Connection quality is measured anonymously to improve the game.';

const MAX_SAMPLES = 300;
const SEND_EVERY_MS = 5 * 60_000;

function push(list, v) {
  list.push(Math.round(v));
  if (list.length > MAX_SAMPLES) list.shift();
}

export function quantiles(list) {
  if (!list.length) return null;
  const s = [...list].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { n: s.length, p50: q(0.5), p90: q(0.9), max: s[s.length - 1] };
}

/** The kind of device and the browser family, nothing finer. */
export function deviceClass(nav) {
  const ua = String(nav?.userAgent ?? '');
  const touch = (nav?.maxTouchPoints ?? 0) > 1;
  const kind = /iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && touch) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'phone' : 'desktop';
  const browser = /Edg\//.test(ua) ? 'edge' : /SamsungBrowser/.test(ua) ? 'samsung' : /Firefox|FxiOS/.test(ua) ? 'firefox'
    : /Chrome|CriOS/.test(ua) ? 'chrome' : /Safari/.test(ua) ? 'safari' : 'other';
  return { kind, browser };
}

export class Measure {
  constructor(room, { send, win = globalThis.window, nav = globalThis.navigator, now = () => Date.now() } = {}) {
    this.room = room;
    this.sendFn = send;
    this.win = win;
    this.nav = nav;
    this.now = now;
    this.reset();
    this.timer = setInterval(() => this.flush('interval'), SEND_EVERY_MS);
    this.timer.unref?.();
    this.offlineSince = null;
    this.pingAt = null;
    // Frame rate, if the page draws (one timestamp per frame).
    if (win?.requestAnimationFrame) {
      let last = null;
      const frame = (t) => {
        if (this.stopped) return;
        if (last !== null && !win.document?.hidden && t - last < 1000) push(this.frames, t - last);
        last = t;
        win.requestAnimationFrame(frame);
      };
      win.requestAnimationFrame(frame);
    }
    this.onHide = () => this.flush('page-hidden');
    win?.addEventListener?.('pagehide', this.onHide);
  }

  reset() {
    this.since = this.now();
    this.rtt = [];
    this.hostGaps = [];
    this.frames = [];
    this.offline = [];
    this.counts = { reconnects: 0, hostChanges: 0, dropsSeen: 0, hostMessages: 0 };
    this.lastHostMessage = null;
  }

  // ---- what the client reports in
  pingSent() { this.pingAt = this.now(); }
  pongReceived() {
    if (this.pingAt !== null) push(this.rtt, this.now() - this.pingAt);
    this.pingAt = null;
  }
  hostMessage() {
    const t = this.now();
    this.counts.hostMessages += 1;
    if (this.lastHostMessage !== null && t - this.lastHostMessage < 10_000) push(this.hostGaps, t - this.lastHostMessage);
    this.lastHostMessage = t;
  }
  status(s) {
    if (s === 'reconnecting') this.counts.reconnects += 1;
    if (s !== 'online' && this.offlineSince === null) this.offlineSince = this.now();
    if (s === 'online' && this.offlineSince !== null) {
      push(this.offline, this.now() - this.offlineSince);
      this.offlineSince = null;
    }
  }
  hostChanged() { this.counts.hostChanges += 1; }
  peerDropped() { this.counts.dropsSeen += 1; }

  summary(why) {
    const room = this.room;
    const players = room.players?.filter((p) => p.role !== undefined) ?? [];
    return {
      v: 1,
      why,
      seconds: Math.round((this.now() - this.since) / 1000),
      device: deviceClass(this.nav),
      network: this.nav?.connection?.effectiveType ?? null,
      role: room.isHost ? 'host' : room.self?.role === 'viewer' ? 'viewer' : 'player',
      players: players.length,
      phase: room.room?.phase ?? null,
      rttMs: quantiles(this.rtt),
      hostGapMs: quantiles(this.hostGaps),
      frameMs: quantiles(this.frames),
      offlineMs: quantiles(this.offline),
      counts: { ...this.counts },
    };
  }

  /** Send what was measured since the last summary (nothing if almost nothing happened). */
  flush(why) {
    if (this.now() - this.since < 5_000 && why === 'interval') return;
    const body = this.summary(why);
    if (!body.rttMs && !body.hostGapMs && !body.frameMs) return;
    try {
      this.sendFn(JSON.stringify(body), why === 'page-hidden' || why === 'leave');
    } catch {
      // measuring must never disturb the game
    }
    this.reset();
  }

  stop(why = 'leave') {
    if (this.stopped) return;
    this.flush(why);
    this.stopped = true;
    clearInterval(this.timer);
    this.win?.removeEventListener?.('pagehide', this.onHide);
  }
}

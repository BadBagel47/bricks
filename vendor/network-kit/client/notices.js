// Notices from the admin page to every page of a game (F-066): Cloudflare
// limiting soon or reached, a timer running out, a message from the owner.
// The page asks the game's status now and then, shows each new notice in a
// box with a background that cannot be missed, plays a warning sound, and
// keeps the box until the player presses OK. Each notice is shown once per
// browser. Texts are English (owner's decision 2026-11-18).
//
//   const notices = watchNotices(SERVER, { mode: 'duo' });   // starts at once
//   notices.stop();
//
// Games can also show their own: new NoticeBoard().show({ id, title, text }).

import { NetworkRoom } from './room.js';

const SEEN_KEY = 'nk-notices-seen';
const CHECK_MS = 60_000;

/** "{until}" in a notice's text becomes the local time of its `until`. */
export function noticeText(notice) {
  const text = String(notice?.text ?? '');
  if (!text.includes('{until}')) return text;
  const at = notice.until ? new Date(notice.until) : null;
  const time = at && !Number.isNaN(at.getTime())
    ? at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'later';
  return text.replaceAll('{until}', time);
}

// ------------------------------------------------------------------ sound

let audio = null;
let waiting = null; // the newest sound that waits for the player's next touch
let armedOn = null;
// The events after which a page may start sound: lifting the finger (iPad and
// Android need this, a finger down is not enough), a click, a key (B-084).
const UNLOCK = ['touchend', 'click', 'keydown'];

function play(ctx, { level, volume }) {
  const t0 = ctx.currentTime + 0.02;
  const notes = level === 'warning' ? [988, 740, 988, 740] : [880, 660];
  const out = ctx.createGain();
  out.gain.value = volume;
  out.connect(ctx.destination);
  notes.forEach((freq, i) => {
    const start = t0 + i * 0.2;
    for (const [type, mix] of [['triangle', 1], ['sine', 0.5]]) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq * (type === 'sine' ? 2 : 1);
      env.gain.setValueAtTime(0.0001, start);
      env.gain.exponentialRampToValueAtTime(mix, start + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(env).connect(out);
      osc.start(start);
      osc.stop(start + 0.2);
    }
  });
}

function disarm() {
  for (const type of UNLOCK) armedOn?.removeEventListener?.(type, unlock, true);
  armedOn = null;
}

function arm(win) {
  if (armedOn === win) return;
  disarm();
  armedOn = win;
  for (const type of UNLOCK) win.addEventListener?.(type, unlock, true);
}

// Runs inside the player's touch, the only moment a page may start sound.
// A sound paused while an iPad slept does not come back (B-084), so a paused
// one is replaced by a new one, made and started in the same touch.
function unlock() {
  const win = armedOn;
  disarm();
  const sound = waiting;
  waiting = null;
  if (!sound || !win) return;
  const Ctx = win.AudioContext ?? win.webkitAudioContext;
  if (audio?.state !== 'running') {
    try {
      audio?.close?.();
    } catch {
      // already closed
    }
    audio = new Ctx();
    audio.resume?.().catch(() => {});
  }
  play(audio, sound);
}

/**
 * A short warning sound made in the browser (no file): two tones twice for a
 * warning, once for a message. Browsers only play sound after the player has
 * touched the page, and an iPad stops a page's sound while it sleeps; then
 * the sound waits for the next touch or key.
 */
export function playWarningSound({ level = 'warning', volume = 0.3, window: win = globalThis } = {}) {
  const Ctx = win.AudioContext ?? win.webkitAudioContext;
  if (!Ctx) return false;
  if (!audio || audio.state === 'closed' || !(audio instanceof Ctx)) audio = new Ctx();
  const sound = { level, volume };
  if (audio.state === 'running') {
    play(audio, sound);
    return true;
  }
  // Not allowed yet, or paused ('suspended', or 'interrupted' on an iPad).
  waiting = sound;
  arm(win);
  const ctx = audio;
  ctx.resume?.().then(() => {
    if (ctx.state === 'running' && waiting === sound) {
      waiting = null;
      disarm();
      play(ctx, sound);
    }
  }, () => {});
  return true;
}

// ------------------------------------------------------------------ the box

const STYLE = `
.nk-notices { position: fixed; top: max(12px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%);
  width: min(560px, calc(100vw - 24px)); display: grid; gap: 10px; z-index: 2147483000; pointer-events: none; }
.nk-notice { pointer-events: auto; display: grid; grid-template-columns: auto 1fr auto; gap: 4px 14px; align-items: start;
  padding: 14px 16px; border-radius: 12px; border: 3px solid var(--nk-notice-edge, #1a1a1a);
  background: var(--nk-notice-warning-bg, #ffcc33); color: var(--nk-notice-warning-ink, #1a1a1a);
  font: 500 16px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; box-shadow: 0 8px 28px rgba(0,0,0,.45);
  animation: nk-notice-in .5s ease-out 1; }
.nk-notice[data-level="info"] { background: var(--nk-notice-info-bg, #1f5fd6); color: var(--nk-notice-info-ink, #fff);
  border-color: var(--nk-notice-info-edge, #0b2e70); }
.nk-notice .nk-icon { grid-row: 1 / span 2; width: 28px; height: 28px; display: block; }
.nk-notice .nk-title { font-weight: 800; font-size: 17px; }
.nk-notice .nk-text { grid-column: 2; }
.nk-notice button { grid-row: 1 / span 2; grid-column: 3; align-self: center; font: inherit; font-weight: 800; cursor: pointer;
  padding: 8px 18px; border-radius: 8px; border: 2px solid currentColor; background: transparent; color: inherit; }
@keyframes nk-notice-in { 0% { transform: translateY(-16px); opacity: 0; } 40% { transform: translateY(0); opacity: 1; }
  60% { transform: scale(1.03); } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .nk-notice { animation: none; } }
`;

// A constructed style sheet works under a strict Content-Security-Policy
// (style-src 'self'), where a <style> element would be blocked.
const styled = new WeakSet();
function addStyle(doc) {
  if (styled.has(doc)) return;
  styled.add(doc);
  const Sheet = doc.defaultView?.CSSStyleSheet;
  if (Sheet && 'adoptedStyleSheets' in doc) {
    try {
      const sheet = new Sheet();
      sheet.replaceSync(STYLE);
      doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
      return;
    } catch {
      // fall back to an element
    }
  }
  const style = doc.createElement('style');
  style.textContent = STYLE;
  doc.head.append(style);
}

function readSeen(storage) {
  try {
    const seen = JSON.parse(storage?.getItem(SEEN_KEY) ?? '{}');
    return seen && typeof seen === 'object' ? seen : {};
  } catch {
    return {};
  }
}

// The same drawn icon on every device (B-085): a font's ⚠ and ℹ become an
// emoji on some devices and a text sign on others.
const SVG = 'http://www.w3.org/2000/svg';
const ICON = {
  warning: [['path', { d: 'M12 2.5 1.5 21h21L12 2.5Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linejoin': 'round' }],
    ['path', { d: 'M12 9v5.5', stroke: 'currentColor', 'stroke-width': '2.6', 'stroke-linecap': 'round' }],
    ['circle', { cx: '12', cy: '17.8', r: '1.5', fill: 'currentColor' }]],
  info: [['circle', { cx: '12', cy: '12', r: '10', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2' }],
    ['path', { d: 'M12 11v6', stroke: 'currentColor', 'stroke-width': '2.6', 'stroke-linecap': 'round' }],
    ['circle', { cx: '12', cy: '7.3', r: '1.5', fill: 'currentColor' }]],
};

/** The notice icon as an inline SVG element; `level` is 'warning' or 'info'. */
export function noticeIcon(doc, level) {
  const svg = doc.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'nk-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  for (const [tag, attrs] of ICON[level]) {
    const part = doc.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) part.setAttribute(k, v);
    svg.append(part);
  }
  return svg;
}

/** The box on the page. Notices stay until OK; each id is shown once per browser. */
export class NoticeBoard {
  constructor({ document: doc = globalThis.document, storage = globalThis.localStorage, sound = true, onShow = null, onDismiss = null } = {}) {
    this.doc = doc;
    this.storage = storage;
    this.sound = sound;
    this.onShow = onShow;
    this.onDismiss = onDismiss;
    this.memory = {}; // when the browser keeps nothing
    this.open = new Map(); // id → element
  }

  seen(id) {
    return Boolean(readSeen(this.storage)[id] || this.memory[id]);
  }

  markSeen(notice) {
    const keepUntil = notice.until ? Date.parse(notice.until) : Date.now() + 7 * 86_400_000;
    this.memory[notice.id] = keepUntil;
    try {
      const seen = readSeen(this.storage);
      const now = Date.now();
      for (const [id, until] of Object.entries(seen)) if (!(until > now)) delete seen[id];
      seen[notice.id] = keepUntil;
      this.storage?.setItem(SEEN_KEY, JSON.stringify(seen));
    } catch {
      // private mode: remembered for this page only
    }
  }

  container() {
    if (this.box?.isConnected) return this.box;
    addStyle(this.doc);
    this.box = this.doc.createElement('div');
    this.box.className = 'nk-notices';
    this.doc.body.append(this.box);
    return this.box;
  }

  /** Show a notice unless it was already seen or is on screen; true if shown. */
  show(notice) {
    if (!notice?.id || this.open.has(notice.id) || this.seen(notice.id)) return false;
    const level = notice.level === 'info' ? 'info' : 'warning';
    const item = this.doc.createElement('section');
    item.className = 'nk-notice';
    item.dataset.level = level;
    item.dataset.kind = notice.kind ?? 'message';
    item.setAttribute('role', 'alert');
    const icon = noticeIcon(this.doc, level);
    const title = this.doc.createElement('div');
    title.className = 'nk-title';
    title.textContent = notice.title || (level === 'warning' ? 'Warning' : 'Message');
    const text = this.doc.createElement('div');
    text.className = 'nk-text';
    text.textContent = noticeText(notice);
    const ok = this.doc.createElement('button');
    ok.type = 'button';
    ok.textContent = 'OK';
    ok.addEventListener('click', () => this.dismiss(notice));
    item.append(icon, title, ok, text);
    this.container().append(item);
    this.open.set(notice.id, item);
    if (this.sound) playWarningSound({ level, window: this.doc.defaultView ?? globalThis });
    this.onShow?.(notice);
    return true;
  }

  dismiss(notice) {
    this.markSeen(notice);
    this.open.get(notice.id)?.remove();
    this.open.delete(notice.id);
    this.onDismiss?.(notice);
  }

  /** Notices that have ended (or were removed on the admin page) leave the screen. */
  keepOnly(ids) {
    for (const [id, item] of this.open) {
      if (!ids.has(id)) {
        item.remove();
        this.open.delete(id);
      }
    }
  }
}

/**
 * Ask the game's status now and every `everyMs` while the page is visible
 * (and at once when it becomes visible again), and show new notices.
 * `fetchStatus` defaults to NetworkRoom.status; returns { stop, check, board }.
 */
export function watchNotices(server, {
  basePath = '/rooms', mode = null, everyMs = CHECK_MS, board = null, sound = true, onNotice = null,
  fetchStatus = null, document: doc = globalThis.document, window: win = globalThis,
} = {}) {
  board ??= new NoticeBoard({ document: doc, sound });
  let timer = null;
  let stopped = false;
  const ask = fetchStatus ?? (() => NetworkRoom.status(server, { basePath, mode, window: win }));
  const check = async () => {
    if (stopped || doc?.hidden) return;
    let status = null;
    try {
      status = await ask();
    } catch {
      return; // try again next time
    }
    const notices = Array.isArray(status?.notices) ? status.notices : [];
    for (const n of notices) {
      if (board.show(n)) onNotice?.(n);
    }
    board.keepOnly(new Set(notices.map((n) => n.id)));
  };
  const onVisible = () => {
    if (!doc.hidden) check();
  };
  doc?.addEventListener?.('visibilitychange', onVisible);
  timer = setInterval(check, everyMs);
  check();
  return {
    board,
    check,
    stop() {
      stopped = true;
      clearInterval(timer);
      doc?.removeEventListener?.('visibilitychange', onVisible);
    },
  };
}

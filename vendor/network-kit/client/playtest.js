// Playtest (F-091): Playtest-rutan, a movable panel on a game's pages for the
// owner's play tests, and Playtest Remote, the same panel on another device
// (a phone, a tablet or a computer) paired by a QR code, a short code or a link.
//
// The panel shows only in a browser that has opened a tester link from the
// admin page (`#nk-tester=…`); for everyone else startPlaytest does nothing.
// It lists the game's tests, shows a test's steps and questions, and sends the
// result with the answers, pictures and the page's context to the admin page,
// where the owner sees it under Rapporter and the developing agent reads it.
//
//   import { startPlaytest } from './vendor/network-kit/client/index.js';
//   startPlaytest({
//     admin: 'https://network-kit-admin.example.workers.dev',
//     items: ITEMS,                       // [{ id, title, where, steps, links, ask | questions }]
//     version: '2026-11-19',              // the game's version (commit or date)
//     context: () => ({ mode: game.mode }), // what the game wants in each report
//     canvas: () => document.querySelector('canvas'), // for screenshots (optional)
//   });
//
// The panel never takes the keyboard: it does not take focus by itself, and
// pointer, touch and key events inside it stop there, so the game does not
// steer or shoot while the tester types (as Critical's fullscreen button).
// Texts are Swedish: it is the owner's tool (owner 2026-11-19).

import { VERSION } from '../version.js';
// The QR code maker and the room client are loaded only when Playtest Remote
// is opened (F-096): a tester who never pairs a remote does not load them.
const loadShare = () => import('./share.js');
const loadRoom = () => import('./room.js');

const TOKEN_KEY = 'nk-playtest:tester';
const RUN_KEY = 'nk-playtest:run';
const QUEUE_KEY = 'nk-playtest:queue';
const PLACE_KEY = 'nk-playtest:place';
const PAIR_KEY = 'nk-playtest:pair';
const QUEUE_MAX = 5;
const IMAGE_TARGET = 300 * 1024; // owner 2026-11-19: about 300 kB, made smaller, never thrown away
const RESULT_TEXT = { worked: 'Fungerade', partly: 'Delvis', failed: 'Fungerade inte', cancelled: 'Avbrutet', note: 'Anteckning' };
const STOPPED = ['pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'click', 'dblclick', 'touchstart', 'touchend',
  'touchmove', 'keydown', 'keyup', 'keypress', 'wheel', 'contextmenu', 'input'];

// ------------------------------------------------------------------ helpers

const store = (win, kind = 'localStorage') => {
  try {
    return win[kind] ?? null;
  } catch {
    return null;
  }
};
const read = (s, key, fallback = null) => {
  try {
    const v = s?.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const write = (s, key, value) => {
  try {
    if (value === null || value === undefined) s?.removeItem(key);
    else s?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // full or private mode
  }
};

/** The tester token in the address (`#nk-tester=…`), if any. */
export function readTesterLink(hash) {
  const m = /(?:^#|&)nk-tester=(pt_[A-Za-z0-9_.-]+)/.exec(String(hash ?? ''));
  return m ? m[1] : null;
}

/** A test's questions: `questions`, or `ask` (one text or a list). */
export function questionsOf(item) {
  if (Array.isArray(item?.questions)) return item.questions.map(String);
  if (Array.isArray(item?.ask)) return item.ask.map(String);
  return item?.ask ? [String(item.ask)] : [];
}

/** The same address with `playtest=<id>` in its query, so the test is running after the page loads. */
export function withTest(href, id, base) {
  const url = new URL(href, base);
  url.searchParams.set('playtest', id);
  return url.toString();
}

/** Device and browser in plain words, from the user agent (enough for a report). */
export function describeDevice(nav = globalThis.navigator) {
  const ua = String(nav?.userAgent ?? '');
  const touch = (nav?.maxTouchPoints ?? 0) > 1;
  const device = /iPad/.test(ua) || (/Macintosh/.test(ua) && touch) ? 'iPad'
    : /iPhone/.test(ua) ? 'iPhone'
      : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android phone' : 'Android tablet')
        : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const browser = nav?.brave ? 'Brave'
    : /Edg\//.test(ua) ? 'Edge' : /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
      : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  return { device, browser, userAgent: ua.slice(0, 300) };
}

/**
 * A picture of `source` (a canvas, an image or a Blob) as JPEG of at most
 * about 300 kB: made smaller step by step, never thrown away. Resolves to a Blob.
 */
export async function shrinkPicture(source, { doc = globalThis.document, target = IMAGE_TARGET } = {}) {
  let img = source;
  if (source instanceof Blob) {
    if (source.size <= target && source.type === 'image/jpeg') return source;
    img = await new Promise((resolve, reject) => {
      const el = doc.createElement('img');
      const url = URL.createObjectURL(source);
      el.onload = () => { URL.revokeObjectURL(url); resolve(el); };
      el.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not a picture')); };
      el.src = url;
    });
  }
  const w0 = img.naturalWidth ?? img.width;
  const h0 = img.naturalHeight ?? img.height;
  let scale = Math.min(1, 1600 / Math.max(w0, h0, 1));
  let quality = 0.82;
  for (let i = 0; i < 12; i += 1) {
    const c = doc.createElement('canvas');
    c.width = Math.max(1, Math.round(w0 * scale));
    c.height = Math.max(1, Math.round(h0 * scale));
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', quality));
    if (blob && (blob.size <= target || i === 11)) return blob;
    if (quality > 0.55) quality -= 0.12;
    else scale *= 0.8;
  }
  return null;
}

const STYLE = `
.nkp { position: fixed; z-index: 2147482000; width: min(360px, calc(100vw - 16px)); max-height: min(78vh, 640px);
  display: flex; flex-direction: column; background: #10142a; color: #eef1ff; border: 2px solid #7db4ff; border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,.5); font: 15px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; overflow: hidden; }
.nkp[hidden] { display: none; }
.nkp.folded { width: auto; max-height: none; border-radius: 999px; }
.nkp * { box-sizing: border-box; }
.nkp .bar { display: flex; align-items: center; gap: 6px; padding: 6px 8px 6px 12px; background: #1b2147; cursor: grab; touch-action: none; }
.nkp.folded .bar { padding: 6px 12px; border-radius: 999px; }
.nkp .bar b { flex: 1; font-size: 14px; letter-spacing: .04em; white-space: nowrap; }
.nkp .dot { width: 10px; height: 10px; border-radius: 50%; background: #ffcc33; display: inline-block; margin-right: 4px; }
.nkp button { font: inherit; color: inherit; background: #262d5c; border: 1px solid #3a4386; border-radius: 8px;
  padding: 8px 12px; min-height: 40px; cursor: pointer; touch-action: manipulation; }
.nkp button.small { min-height: 32px; padding: 4px 10px; }
.nkp button.go { background: #7db4ff; color: #0b1020; border-color: #7db4ff; font-weight: 800; }
.nkp button[aria-pressed="true"] { background: #ffcc33; color: #1a1a1a; border-color: #ffcc33; font-weight: 800; }
.nkp .body { overflow: auto; padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 10px; -webkit-user-select: text; user-select: text; }
.nkp .muted { color: #a9b0d6; font-size: 13px; }
.nkp .item { display: flex; flex-direction: column; align-items: stretch; text-align: left; gap: 2px; }
.nkp .item .id { font: 700 12px ui-monospace, Menlo, monospace; color: #7db4ff; }
.nkp .item.done { opacity: .6; }
.nkp ol { margin: 0; padding-left: 1.3em; }
.nkp li.now { color: #ffcc33; font-weight: 700; }
.nkp label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #c9cff0; }
.nkp textarea { font: inherit; color: #eef1ff; background: #0b0e20; border: 1px solid #3a4386; border-radius: 8px; padding: 8px; min-height: 44px; resize: vertical; }
.nkp .row { display: flex; flex-wrap: wrap; gap: 6px; }
.nkp .row > button { flex: 1 1 auto; }
.nkp .thumbs { display: flex; gap: 6px; flex-wrap: wrap; }
.nkp .thumbs img { width: 72px; height: 54px; object-fit: cover; border-radius: 6px; border: 1px solid #3a4386; }
.nkp .qr svg { width: 180px; height: 180px; background: #fff; padding: 6px; border-radius: 8px; }
.nkp .code { font: 800 26px ui-monospace, Menlo, monospace; letter-spacing: .15em; }
.nkp .note { color: #7fd49a; }
.nkp .warn { color: #ffcc33; }
`;

function addStyle(doc) {
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

// ------------------------------------------------------------------ sending

/** Sends reports to the admin page; keeps what could not be sent and tries again. */
export class ReportSender {
  constructor({ admin, token, storage = null, fetch: f = (...a) => fetch(...a) }) {
    this.admin = String(admin).replace(/\/$/, '');
    this.token = token;
    this.storage = storage;
    this.fetch = f;
  }

  async image(blob) {
    const res = await this.fetch(`${this.admin}/playtest/v1/image`, {
      method: 'POST', headers: { 'content-type': blob.type || 'image/jpeg', 'x-playtest-token': this.token }, body: blob,
    });
    if (!res.ok) throw Object.assign(new Error('image'), { status: res.status });
    return (await res.json()).id;
  }

  async post(report) {
    const res = await this.fetch(`${this.admin}/playtest/v1/report`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: this.token, report }),
    });
    if (!res.ok) throw Object.assign(new Error('report'), { status: res.status });
    return (await res.json()).id;
  }

  /** Pictures first (Blobs or data URLs), then the report. Resolves to { sent, queued }. */
  async send(report, pictures = []) {
    try {
      const images = [...(report.images ?? [])];
      for (const p of pictures) images.push(await this.image(typeof p === 'string' ? await (await this.fetch(p)).blob() : p));
      await this.post({ ...report, images });
      return { sent: true };
    } catch (e) {
      if (e.status === 401 || e.status === 413 || e.status === 415) return { sent: false, error: e.status };
      // Kept to send later: pictures as data URLs, so they survive a reload.
      const kept = [];
      for (const p of pictures) kept.push(typeof p === 'string' ? p : await blobToDataUrl(p));
      const queue = read(this.storage, QUEUE_KEY, []).slice(-(QUEUE_MAX - 1));
      queue.push({ report, pictures: kept });
      if (!write(this.storage, QUEUE_KEY, queue)) write(this.storage, QUEUE_KEY, [...queue.slice(0, -1), { report, pictures: [] }]);
      return { sent: false, queued: true };
    }
  }

  /** Reports kept from earlier tries; resolves to how many are left. */
  async flush() {
    const queue = read(this.storage, QUEUE_KEY, []);
    const left = [];
    for (const q of queue) {
      try {
        const images = [];
        for (const p of q.pictures) images.push(await this.image(await (await this.fetch(p)).blob()));
        await this.post({ ...q.report, images: [...(q.report.images ?? []), ...images] });
      } catch (e) {
        if (e.status !== 401 && e.status !== 413 && e.status !== 415) left.push(q);
      }
    }
    write(this.storage, QUEUE_KEY, left.length ? left : null);
    return left.length;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// ------------------------------------------------------------------ the panel

/**
 * Start Playtest on this page. Does nothing (returns null) unless this browser
 * has a working tester link. Options: admin (the admin page's address), items,
 * version, context(), canvas() or screenshot() (returns a canvas, an image or
 * a Blob), hidden (default: the address has ?still), remote (default true:
 * offer Playtest Remote), window, document, fetch.
 */
export async function startPlaytest(options = {}) {
  const win = options.window ?? globalThis.window;
  const doc = options.document ?? win?.document;
  if (!win || !doc || !options.admin) return null;
  const local = store(win);
  const fromLink = readTesterLink(win.location?.hash);
  if (fromLink) {
    write(local, TOKEN_KEY, fromLink);
    const hash = String(win.location.hash).replace(/(^#|&)nk-tester=[^&]*/, '$1').replace(/^#&/, '#').replace(/^#$/, '');
    try {
      win.history?.replaceState(win.history.state, '', `${win.location.pathname}${win.location.search}${hash}`);
    } catch {
      // keep the address as it is
    }
  }
  const token = read(local, TOKEN_KEY);
  if (!token) return null;
  const f = options.fetch ?? ((...a) => win.fetch(...a));
  const admin = String(options.admin).replace(/\/$/, '');
  let tester = null;
  try {
    const res = await f(`${admin}/playtest/v1/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
    if (res.status === 401) {
      write(local, TOKEN_KEY, null); // revoked or expired: the panel goes away
      return null;
    }
    tester = res.ok ? await res.json() : null;
  } catch {
    tester = null; // offline: show the panel anyway; reports wait
  }
  const panel = new PlaytestPanel({ ...options, win, doc, admin, token, tester, fetch: f, storage: local });
  panel.mount();
  return panel;
}

export class PlaytestPanel {
  constructor(o) {
    this.o = o;
    this.win = o.win;
    this.doc = o.doc;
    this.items = Array.isArray(o.items) ? o.items.filter((i) => i && i.id) : [];
    this.tester = o.tester;
    this.reported = new Set(o.tester?.reported ?? []);
    this.storage = o.storage;
    this.session = store(this.win, 'sessionStorage') ?? o.storage;
    this.sender = new ReportSender({ admin: o.admin, token: o.token, storage: o.storage, fetch: o.fetch });
    this.errors = [];
    this.pictures = []; // Blobs waiting to be sent with the report
    this.view = 'list';
    this.remote = null; // the pairing room (Playtest Remote)
    this.frames = { count: 0, slowest: 0, last: 0, since: 0 };
    const query = new URLSearchParams(this.win.location?.search ?? '');
    this.hidden = o.hidden ?? query.has('still');
    // A test is running: from the address (?playtest=ID) or from before a reload.
    const wanted = query.get('playtest');
    const saved = read(this.session, RUN_KEY);
    if (wanted && this.item(wanted)) {
      this.run = saved?.id === wanted ? saved : { id: wanted, startedAt: Date.now(), step: 0, answers: {}, text: '', result: null };
    } else this.run = saved && this.item(saved.id) ? saved : null;
    if (this.run) this.view = 'test';
  }

  item(id) {
    return this.items.find((i) => i.id === id) ?? null;
  }

  save() {
    write(this.session, RUN_KEY, this.run);
  }

  // ---- what the page tells

  watchPage() {
    const add = (text) => {
      this.errors.push(String(text).slice(0, 500));
      if (this.errors.length > 20) this.errors.shift();
    };
    this.win.addEventListener?.('error', (e) => add(`${e.message ?? 'error'}${e.filename ? ` (${String(e.filename).split('/').pop()}:${e.lineno})` : ''}`));
    this.win.addEventListener?.('unhandledrejection', (e) => add(`Unhandled: ${e.reason?.message ?? e.reason}`));
    const con = this.win.console;
    if (con?.error && !con.error.nkPlaytest) {
      const original = con.error.bind(con);
      const wrapped = (...args) => {
        add(args.map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })())).join(' '));
        return original(...args);
      };
      wrapped.nkPlaytest = true;
      con.error = wrapped;
    }
    // Frames per second and the slowest frame while a test runs.
    const raf = this.win.requestAnimationFrame?.bind(this.win);
    if (raf) {
      const tick = (t) => {
        if (this.run) {
          const f = this.frames;
          if (f.last) f.slowest = Math.max(f.slowest, t - f.last);
          if (!f.since) f.since = t;
          f.count += 1;
          f.last = t;
        }
        raf(tick);
      };
      raf(tick);
    }
  }

  context() {
    const w = this.win;
    const { device, browser, userAgent } = describeDevice(w.navigator);
    const f = this.frames;
    const seconds = f.last && f.since ? (f.last - f.since) / 1000 : 0;
    let game = null;
    try {
      game = this.o.context?.() ?? null;
    } catch (e) {
      game = { error: String(e?.message ?? e) };
    }
    return {
      url: String(w.location?.href ?? ''),
      version: String(this.o.version ?? ''),
      kit: VERSION,
      device,
      browser,
      userAgent,
      window: `${w.innerWidth}x${w.innerHeight}`,
      screen: `${w.screen?.width ?? 0}x${w.screen?.height ?? 0}`,
      dpr: w.devicePixelRatio ?? 1,
      fullscreen: Boolean(this.doc.fullscreenElement ?? this.doc.webkitFullscreenElement),
      language: w.navigator?.language ?? '',
      startedAt: this.run?.startedAt ?? null,
      durationMs: this.run ? Date.now() - this.run.startedAt : null,
      errors: [...this.errors],
      game: { ...(game && typeof game === 'object' ? game : { value: game }), ...(seconds > 1 ? { fps: Math.round(f.count / seconds), slowestFrameMs: Math.round(f.slowest) } : {}) },
    };
  }

  /** A screenshot of the game, as a Blob of about 300 kB, or null. */
  async screenshot() {
    let source = null;
    try {
      source = (await this.o.screenshot?.()) ?? this.o.canvas?.() ?? null;
      if (!source) {
        const canvases = [...this.doc.querySelectorAll('canvas')].filter((c) => !this.root?.contains(c));
        source = canvases.sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null;
      }
      if (!source) return null;
      // A WebGL canvas keeps its picture only until the frame is shown: draw right after one.
      await new Promise((r) => (this.win.requestAnimationFrame ? this.win.requestAnimationFrame(() => r()) : r()));
      return await shrinkPicture(source, { doc: this.doc });
    } catch {
      return null;
    }
  }

  // ---- the box

  mount() {
    this.watchPage();
    addStyle(this.doc);
    this.root = this.doc.createElement('section');
    this.root.className = 'nkp';
    this.root.setAttribute('aria-label', 'Playtest');
    this.root.hidden = this.hidden;
    // Nothing the tester does in the box reaches the game.
    for (const type of STOPPED) this.root.addEventListener(type, (e) => e.stopPropagation());
    this.root.addEventListener('pointerdown', () => {
      const active = this.doc.activeElement;
      if (active && !this.root.contains(active) && active !== this.doc.body) this.returnTo = active;
    }, true);
    // Under the document element, so it shows in fullscreen too.
    this.doc.documentElement.append(this.root);
    this.folded = Boolean(read(this.storage, PLACE_KEY)?.folded) && !this.run;
    this.render();
    this.place(read(this.storage, PLACE_KEY));
    this.sender.flush().catch(() => {});
    this.win.addEventListener?.('online', () => this.sender.flush().catch(() => {}));
    if (read(this.session, PAIR_KEY)) this.pair(true).catch(() => {});
  }

  /** Where the box is: kept per browser; at first on the left, a third down, away from the corners. */
  place(p) {
    const w = this.win.innerWidth || 800;
    const h = this.win.innerHeight || 600;
    const box = this.root.getBoundingClientRect?.() ?? { width: 300, height: 60 };
    const x = Math.min(Math.max(4, p?.x ?? 8), Math.max(4, w - (box.width || 300) - 4));
    const y = Math.min(Math.max(4, p?.y ?? Math.round(h * 0.3)), Math.max(4, h - 48));
    this.root.style.left = `${x}px`;
    this.root.style.top = `${y}px`;
    this.at = { x, y };
  }

  remember() {
    write(this.storage, PLACE_KEY, { ...this.at, folded: this.folded });
  }

  giveBack() {
    // The game gets the keyboard back (Critical: the canvas has focus).
    const target = this.returnTo ?? this.doc.querySelector('canvas[tabindex]');
    try {
      target?.focus?.({ preventScroll: true });
    } catch {
      // nothing to give back to
    }
  }

  el(tag, attrs = {}, ...children) {
    const e = this.doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'on') for (const [type, fn] of Object.entries(v)) e.addEventListener(type, fn);
      else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : String(v));
    }
    for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) e.append(c);
    return e;
  }

  render() {
    const root = this.root;
    root.replaceChildren();
    root.classList.toggle('folded', this.folded);
    const bar = this.el('div', { class: 'bar' },
      this.run ? this.el('span', { class: 'dot', title: 'Ett test pågår' }) : null,
      this.el('b', {}, `Playtest${this.folded && this.run ? ` · ${this.run.id}` : ''}${this.folded && this.remotes ? ' · fjärr' : ''}`),
      this.folded ? null : this.el('button', { type: 'button', class: 'small', title: 'Fjärrkontroll på en annan enhet', on: { click: () => this.showPair() } }, 'Fjärr'),
      this.el('button', { type: 'button', class: 'small', 'aria-label': this.folded ? 'Visa' : 'Fäll ihop', on: { click: () => this.fold(!this.folded) } }, this.folded ? '▸' : '–'));
    this.drag(bar);
    root.append(bar);
    if (this.folded) return;
    const body = this.el('div', { class: 'body' });
    root.append(body);
    if (this.view === 'pair') this.renderPair(body);
    else if (this.view === 'test' && this.run) this.renderTest(body);
    else this.renderList(body);
  }

  fold(folded) {
    this.folded = folded;
    this.render();
    this.place(this.at);
    this.remember();
    if (folded) this.giveBack();
  }

  drag(bar) {
    let start = null;
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      start = { px: e.clientX, py: e.clientY, ...this.at };
      bar.setPointerCapture?.(e.pointerId);
    });
    bar.addEventListener('pointermove', (e) => {
      if (!start) return;
      this.place({ x: start.x + e.clientX - start.px, y: start.y + e.clientY - start.py });
    });
    const end = () => {
      if (!start) return;
      start = null;
      this.remember();
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  }

  renderList(body) {
    const who = this.tester ? `${this.tester.label || 'Testare'} · ${this.tester.game}` : 'Inte kontakt med adminsidan än; rapporter sparas och skickas senare.';
    body.append(this.el('p', { class: 'muted' }, who));
    if (this.notice) body.append(this.el('p', { class: 'note', role: 'status' }, this.notice));
    if (!this.items.length) body.append(this.el('p', { class: 'muted' }, 'Spelet har inga tester i listan just nu.'));
    for (const item of this.items) {
      const done = this.reported.has(item.id);
      body.append(this.el('button', { type: 'button', class: `item${done ? ' done' : ''}`, on: { click: () => this.open(item.id) } },
        this.el('span', { class: 'id' }, `${item.id}${done ? ' · rapporterad' : ''}${item.where ? ` · ${item.where}` : ''}`),
        this.el('span', {}, item.title ?? item.id)));
    }
    body.append(this.el('button', { type: 'button', on: { click: () => this.note() } }, 'Skriv en anteckning utan test'));
  }

  open(id) {
    if (!this.run || this.run.id !== id) {
      this.run = { id, startedAt: Date.now(), step: 0, answers: {}, text: '', result: null };
      this.frames = { count: 0, slowest: 0, last: 0, since: 0 };
      this.pictures = [];
      this.save();
    }
    this.view = 'test';
    this.notice = null;
    this.render();
  }

  note() {
    this.items = this.items.some((i) => i.id === 'note') ? this.items : [...this.items, { id: 'note', title: 'Anteckning', steps: [], questions: ['Vad vill du berätta?'] }];
    this.open('note');
  }

  renderTest(body) {
    const item = this.item(this.run.id) ?? { id: this.run.id, title: this.run.id };
    body.append(this.el('div', {},
      this.el('div', { class: 'muted' }, `${item.id}${item.where ? ` · ${item.where}` : ''}`),
      this.el('strong', {}, item.title ?? item.id)));
    if (Array.isArray(item.steps) && item.steps.length) {
      body.append(this.el('ol', {}, item.steps.map((s, i) => this.el('li', { class: i === this.run.step ? 'now' : null }, String(s)))));
      if (this.run.step < item.steps.length - 1) {
        body.append(this.el('button', { type: 'button', on: { click: () => { this.run.step += 1; this.save(); this.render(); this.remoteState(); } } }, 'Nästa steg'));
      }
    }
    const links = Array.isArray(item.links) ? item.links : [];
    if (links.length) {
      body.append(this.el('div', { class: 'row' }, links.map(([text, href]) => this.el('button', {
        type: 'button', class: 'go', on: { click: () => this.go(href) },
      }, String(text)))));
    }
    questionsOf(item).forEach((q, i) => {
      const area = this.el('textarea', { rows: 2, on: { input: (e) => { this.run.answers[i] = e.target.value; this.save(); } } });
      area.value = this.run.answers[i] ?? '';
      body.append(this.el('label', {}, q, area));
    });
    const extra = this.el('textarea', { rows: 2, on: { input: (e) => { this.run.text = e.target.value; this.save(); } } });
    extra.value = this.run.text ?? '';
    body.append(this.el('label', {}, 'Övrigt (valfritt)', extra));
    body.append(this.el('div', { class: 'row', role: 'group', 'aria-label': 'Resultat' }, ['worked', 'partly', 'failed'].map((r) => this.el('button', {
      type: 'button', 'aria-pressed': String(this.run.result === r), on: { click: () => { this.run.result = r; this.save(); this.render(); } },
    }, RESULT_TEXT[r]))));
    const thumbs = this.el('div', { class: 'thumbs' });
    for (const p of this.pictures) {
      const url = URL.createObjectURL(p);
      thumbs.append(this.el('img', { src: url, alt: 'Bild som skickas med' }));
    }
    const file = this.el('input', { type: 'file', accept: 'image/*', hidden: true, on: { change: (e) => this.addFile(e.target.files?.[0]) } });
    body.append(this.el('div', { class: 'row' },
      this.el('button', { type: 'button', on: { click: () => this.takeShot() } }, 'Ta skärmbild'),
      this.el('button', { type: 'button', on: { click: () => file.click() } }, 'Lägg till bild')), file, thumbs);
    if (this.notice) body.append(this.el('p', { class: 'warn', role: 'status' }, this.notice));
    body.append(this.el('div', { class: 'row' },
      this.el('button', { type: 'button', class: 'go', on: { click: () => this.send() } }, 'Skicka'),
      this.el('button', { type: 'button', on: { click: () => this.restart() } }, 'Börja om'),
      this.el('button', { type: 'button', on: { click: () => this.cancel() } }, 'Avbryt')));
    body.append(this.el('button', { type: 'button', class: 'small', on: { click: () => { this.view = 'list'; this.notice = null; this.render(); } } }, 'Till listan (testet fortsätter)'));
  }

  go(href) {
    // The test keeps running after the page loads with its start address.
    this.save();
    this.win.location.assign(withTest(href, this.run.id, this.win.location.href));
  }

  async takeShot() {
    // The box is hidden while the picture is taken.
    this.root.hidden = true;
    const blob = await this.screenshot();
    this.root.hidden = this.hidden;
    if (blob) this.addPicture(blob);
    else {
      this.notice = 'Sidan har ingen bild att ta. Använd Lägg till bild.';
      this.render();
    }
    return blob;
  }

  async addFile(file) {
    if (!file) return;
    const blob = await shrinkPicture(file, { doc: this.doc }).catch(() => null);
    if (blob) this.addPicture(blob);
  }

  addPicture(blob) {
    if (this.pictures.length >= 4) this.pictures.shift();
    this.pictures.push(blob);
    this.notice = null;
    this.render();
  }

  restart() {
    const item = this.item(this.run.id);
    this.run = { id: this.run.id, startedAt: Date.now(), step: 0, answers: {}, text: '', result: null };
    this.frames = { count: 0, slowest: 0, last: 0, since: 0 };
    this.pictures = [];
    this.errors = [];
    this.save();
    const first = Array.isArray(item?.links) && item.links[0]?.[1];
    if (first) this.go(first);
    else this.render();
    this.remoteState();
  }

  async cancel() {
    if (!this.run) return;
    await this.finish('cancelled');
  }

  async send() {
    if (!this.run.result) {
      this.notice = 'Välj Fungerade, Delvis eller Fungerade inte först.';
      this.render();
      return;
    }
    await this.finish(this.run.result);
  }

  /** Sends the running test with `result` and ends it. `extra` comes from Playtest Remote. */
  async finish(result, extra = {}) {
    const item = this.item(this.run.id) ?? { id: this.run.id };
    const questions = questionsOf(item);
    const answers = extra.answers ?? questions.map((q, i) => ({ q, a: this.run.answers[i] ?? '' }));
    const report = {
      testId: item.id === 'note' ? '' : item.id,
      title: item.title ?? '',
      result,
      answers,
      text: extra.text ?? this.run.text ?? '',
      via: extra.via ?? 'panel',
      images: extra.images ?? [],
      context: this.context(),
    };
    const outcome = await this.sender.send(report, this.pictures);
    if (outcome.sent && result !== 'cancelled' && report.testId) this.reported.add(report.testId);
    this.run = null;
    this.pictures = [];
    this.save();
    this.view = 'list';
    this.notice = outcome.sent ? (result === 'cancelled' ? 'Avbrutet och rapporterat.' : 'Skickat. Tack!')
      : outcome.queued ? 'Ingen kontakt just nu. Rapporten är sparad och skickas när det går.'
        : 'Rapporten kunde inte skickas. Testarlänken kan ha gått ut.';
    this.render();
    this.giveBack();
    this.remoteState();
    return outcome;
  }

  // ---- Playtest Remote: the same panel on another device

  showPair() {
    this.view = this.view === 'pair' ? (this.run ? 'test' : 'list') : 'pair';
    this.render();
    if (this.view === 'pair' && !this.remote) this.pair().catch(() => { this.pairError = 'Kunde inte öppna fjärrkontrollen.'; this.render(); });
  }

  renderPair(body) {
    if (this.pairError) body.append(this.el('p', { class: 'warn' }, this.pairError));
    if (!this.remote?.code) {
      body.append(this.el('p', { class: 'muted' }, 'Öppnar en fjärrkontroll …'));
      return;
    }
    const link = this.remoteLink();
    const qr = this.el('div', { class: 'qr' });
    if (this.qrSvg) qr.innerHTML = this.qrSvg(link, { title: 'QR-kod till fjärrkontrollen' }); // plain SVG made from the link
    const copy = this.el('button', { type: 'button', on: { click: async () => {
      try {
        await this.win.navigator.clipboard.writeText(link);
        copy.textContent = 'Kopierad';
      } catch {
        copy.textContent = link;
      }
    } } }, 'Kopiera länken');
    body.append(
      this.el('p', { class: 'muted' }, 'Skanna koden med mobilen eller paddan, eller skriv in koden på fjärrkontrollens sida på en dator.'),
      qr,
      this.el('div', { class: 'code' }, this.remote.code),
      this.el('p', { class: 'muted' }, `${this.o.admin}/remote/`),
      copy,
      this.el('p', { class: 'muted' }, this.remotes ? `${this.remotes} fjärrkontroll${this.remotes > 1 ? 'er' : ''} ansluten` : 'Ingen fjärrkontroll ansluten än.'),
      this.el('button', { type: 'button', class: 'small', on: { click: () => this.unpair() } }, 'Stäng fjärrkontrollen'),
    );
  }

  remoteLink() {
    return `${this.o.admin}/remote/#code=${this.remote.code}`;
  }

  /** Opens (or, after a reload, joins again) the pairing room; this page is its host. */
  async pair(again = false) {
    const saved = read(this.session, PAIR_KEY);
    const opts = { basePath: '/playtest/rooms', name: 'Spelet', window: this.win, document: this.doc, slot: 'playtest' };
    const [{ NetworkRoom }, { qrSvg }] = await Promise.all([loadRoom(), loadShare()]);
    this.qrSvg = qrSvg;
    let room;
    if (again && saved?.code && saved?.ownerKey) {
      room = await NetworkRoom.join(this.o.admin, { ...opts, code: saved.code, ownerKey: saved.ownerKey }).catch(() => null);
      if (!room) {
        write(this.session, PAIR_KEY, null);
        return;
      }
    } else {
      room = await NetworkRoom.create(this.o.admin, { ...opts, adminPass: this.o.token });
    }
    this.remote = room;
    // The remote may send its own pictures with a key that only does that, for a few hours (B-094).
    this.uploadKey = null;
    this.o.fetch(`${this.o.admin}/playtest/v1/upload-key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: this.o.token }) })
      .then((res) => (res.ok ? res.json() : null))
      .then((made) => {
        this.uploadKey = made?.key ?? null;
        this.remoteState();
      })
      .catch(() => {});
    write(this.session, PAIR_KEY, { code: room.code, ownerKey: room.ownerKey ?? saved?.ownerKey });
    const count = () => {
      const before = this.remotes ?? 0;
      this.remotes = room.players.filter((p) => p.role === 'remote' && p.status === 'online').length;
      if (this.remotes !== before && this.view === 'pair') this.render();
      if (this.remotes > before) {
        this.remoteState(); // a remote came: it gets the list
        if (!before && !this.folded) this.fold(true); // the game screen keeps only a small tab
      }
    };
    room.on('room', count);
    room.on('welcome', count);
    room.on('message', ({ data }) => this.fromRemote(data).catch(() => {}));
    room.on('closed', () => { this.remote = null; write(this.session, PAIR_KEY, null); this.render(); });
    this.render();
    this.remoteState();
  }

  unpair() {
    try {
      this.remote?.command?.('close');
      this.remote?.disconnect?.();
    } catch {
      // already gone
    }
    this.remote = null;
    write(this.session, PAIR_KEY, null);
    this.view = this.run ? 'test' : 'list';
    this.render();
  }

  /** What the remotes need to show: the list, what is running, who the tester is. */
  remoteState() {
    if (!this.remote) return;
    this.remote.send({
      t: 'state',
      game: this.tester?.game ?? null,
      tester: this.tester?.label ?? null,
      upload: this.uploadKey ?? null, // a short-lived key for the remote's own pictures (B-094); never the tester link
      admin: this.o.admin,
      items: this.items.filter((i) => i.id !== 'note').map((i) => ({
        id: i.id, title: i.title ?? i.id, where: i.where ?? '', steps: (i.steps ?? []).map(String),
        links: (i.links ?? []).map(([t]) => String(t)), questions: questionsOf(i),
      })),
      reported: [...this.reported],
      run: this.run ? { id: this.run.id, startedAt: this.run.startedAt, step: this.run.step } : null,
      page: { title: this.doc.title, device: describeDevice(this.win.navigator).device },
    });
  }

  async fromRemote(data) {
    if (!data || typeof data !== 'object') return;
    if (data.t === 'hello') this.remoteState();
    else if (data.t === 'start' && this.item(data.id)) {
      this.open(data.id);
      const link = this.item(data.id).links?.[Number(data.link) || 0]?.[1];
      this.remoteState();
      if (link && data.go !== false) this.go(link);
    } else if (data.t === 'step' && this.run) {
      this.run.step = Math.max(0, Number(data.step) || 0);
      this.save();
      this.render();
      this.remoteState();
    } else if (data.t === 'restart' && this.run) this.restart();
    else if (data.t === 'shot') {
      const blob = await this.takeShot();
      if (!blob) this.remote?.send({ t: 'shot', ok: false });
      else {
        // The picture stays here and goes with the report; the remote gets a small copy to see.
        const thumb = await shrinkPicture(blob, { doc: this.doc, target: 12 * 1024 }).then(blobToDataUrl).catch(() => null);
        this.remote?.send({ t: 'shot', ok: true, thumb, count: this.pictures.length });
      }
    } else if (data.t === 'send' && this.run && data.report) {
      const r = data.report;
      const result = ['worked', 'partly', 'failed', 'cancelled'].includes(r.result) ? r.result : 'note';
      const outcome = await this.finish(result, {
        answers: Array.isArray(r.answers) ? r.answers : undefined,
        text: typeof r.text === 'string' ? r.text : '',
        images: Array.isArray(r.images) ? r.images : [],
        via: 'remote',
      });
      this.remote?.send({ t: 'sent', ok: Boolean(outcome.sent), queued: Boolean(outcome.queued) });
    }
  }
}

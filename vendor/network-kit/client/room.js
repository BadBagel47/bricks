// Browser client for a network-kit room. Plain JavaScript, no build step,
// no dependencies; also runs in Node 22+ (used by the tests).
//
//   const room = await NetworkRoom.create('https://rooms.example.workers.dev', { name: 'Ada' });
//   room.on('message', ({ from, data }) => ...);
//   room.send({ fire: true });
//
// Connection recovery: reconnect with a growing delay, react at once to
// network changes, the tab coming back and the browser going online, and a
// cheap heartbeat that the server answers without waking the room. A client
// that cannot reach the server slows down and finally gives up, so a
// forgotten tab does not keep knocking for ever.

import { readLobbyLink, forgetLobbyLink } from './lobby.js';
import {
  PROTOCOL, CLOSE, CLOSE_TEXT, FINAL_CLOSE_CODES, gameClosedText, normalizeCode, isValidCode, PART_CHARS, splitIntoParts, PartJoiner,
  LOBBY_REFUSED,
} from '../shared/protocol.js';

// The largest text a client accepts from the room (joined from parts).
const MAX_INCOMING_CHARS = 8 * 1024 * 1024;
import { tabSession } from './tab.js';
import { Measure } from './measure.js';
import { adminPass } from './admin-pass.js';

// Identities already renewed in this page because the tab was a copy.
const renewedInThisPage = new Set();

const memoryStore = new Map();
const memoryStorage = {
  getItem: (k) => (memoryStore.has(k) ? memoryStore.get(k) : null),
  setItem: (k, v) => memoryStore.set(k, String(v)),
  removeItem: (k) => memoryStore.delete(k),
};

function pickStorage(kind) {
  try {
    const store = globalThis[kind];
    if (store) {
      const probe = '__network_kit__';
      store.setItem(probe, '1');
      store.removeItem(probe);
      return store;
    }
  } catch {
    // storage blocked (private mode, sandbox)
  }
  return memoryStorage;
}

function randomKey(bytes = 18) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  let out = '';
  for (const b of data) out += b.toString(16).padStart(2, '0');
  return out;
}

function apiBase(server, basePath) {
  return `${String(server).replace(/\/$/, '')}${basePath}`;
}

const UNREACHABLE = 'Could not reach the room. Check your connection and try again.';

export class RoomError extends Error {
  constructor(code, reason, text) {
    super(text || CLOSE_TEXT[code] || UNREACHABLE);
    this.code = code;
    this.reason = reason;
  }
}

export class NetworkRoom {
  /**
   * @param {object} o
   * @param {string} o.server  base URL of the game's room Worker
   * @param {string} o.code    room code
   * @param {string} [o.name]  nickname
   * @param {string} [o.role]  wanted role in an open room (default: the game's default)
   * @param {string} [o.key]   invitation key from a share link
   * @param {string} [o.ownerKey]
   * @param {'tab'|'device'} [o.identity] keep the participant per tab (default) or per device
   * @param {string} [o.slot] a separate identity in the same browser, e.g. 'screen'
   * @param {object} [o.on] event handlers to register before connecting, e.g. { host: fn }
   * @param {{getItem, setItem, removeItem}} [o.storage] replaces sessionStorage/localStorage
   * @param {number} [o.hostSilentMs] host-run games: report the host when it has sent nothing for this long
   * @param {boolean} [o.measure] send anonymous connection-quality summaries (F-052); show MEASURE_NOTICE
   */
  constructor(o) {
    this.server = o.server;
    this.basePath = o.basePath ?? '/rooms';
    this.code = normalizeCode(o.code);
    this.name = o.name ?? 'Player';
    this.role = o.role ?? null;
    this.key = o.key ?? null;
    this.WebSocket = o.WebSocket ?? globalThis.WebSocket;
    this.win = o.window ?? (typeof window !== 'undefined' ? window : null);
    this.doc = o.document ?? (typeof document !== 'undefined' ? document : null);
    this.minDelayMs = o.minDelayMs ?? 500;
    this.maxDelayMs = o.maxDelayMs ?? 15_000;
    this.slowDelayMs = o.slowDelayMs ?? 60_000; // retry pace after slowAfterMs or in a hidden tab
    this.slowAfterMs = o.slowAfterMs ?? 120_000;
    this.giveUpMs = o.giveUpMs ?? 30 * 60_000; // stop reconnecting after failing this long
    this.connectTimeoutMs = o.connectTimeoutMs ?? 15_000; // the first connect must succeed within this
    this.heartbeatMs = o.heartbeatMs ?? 20_000;
    this.pongTimeoutMs = o.pongTimeoutMs ?? 8_000;
    this.autoHostReady = o.autoHostReady ?? true;
    this.maxQueue = o.maxQueue ?? 200;
    this.maxQueueAgeMs = o.maxQueueAgeMs ?? 60_000; // game messages older than this are not resent
    this.aloneSnapshotMs = o.aloneSnapshotMs ?? 300_000; // a host alone in the room stores state this seldom
    this.hostSilentMs = o.hostSilentMs ?? null;
    this.adminPass = o.adminPass ?? adminPass(this.win); // the owner's pass, if any (F-058)
    // Anonymous measurement of connection quality (F-052): the game turns it on
    // and shows MEASURE_NOTICE. Summaries go to the game's Worker (…/measure).
    this.measure = o.measure
      ? new Measure(this, {
        win: this.win,
        send: (body, leaving) => {
          const url = `${apiBase(this.server, this.basePath)}/measure`;
          const nav = this.win?.navigator ?? globalThis.navigator;
          if (leaving && nav?.sendBeacon) nav.sendBeacon(url, body);
          else fetch(url, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
        },
      })
      : null;
    // The room tells its own limits at the welcome; these apply until then.
    // Limits given here are kept when they are lower than the room's.
    this.ownLimits = { message: o.maxMessageBytes ?? Infinity, snapshot: o.maxSnapshotBytes ?? Infinity };
    this.maxMessageBytes = o.maxMessageBytes ?? 256 * 1024;
    this.maxSnapshotBytes = o.maxSnapshotBytes ?? 1024 * 1024;

    // Keys are kept per game server, so games on the same site do not share them.
    // `slot` keeps a separate identity in the same browser (e.g. a big-screen window).
    const prefix = `network-kit:${apiBase(this.server, this.basePath)}:${o.slot ? `${o.slot}:` : ''}`;
    const keyStore = o.storage ?? pickStorage(o.identity === 'device' ? 'localStorage' : 'sessionStorage');
    this.keyStore = keyStore;
    this.playerKeyName = `${prefix}player-key`;
    // A per-tab identity must not be shared with a tab the browser copied (B-033).
    this.tabScoped = !o.storage && !o.playerKey && o.identity !== 'device' && keyStore === globalThis.sessionStorage;
    this.tabSession = o.tabSession ?? (this.tabScoped ? tabSession : null);
    this.ownerStore = o.storage ?? pickStorage('localStorage');
    this.playerKey = o.playerKey ?? keyStore.getItem(`${prefix}player-key`);
    if (!this.playerKey) {
      this.playerKey = randomKey();
      keyStore.setItem(`${prefix}player-key`, this.playerKey);
    }
    this.ownerKeyName = `${prefix}owner:${this.code}`;
    this.ownerKey = o.ownerKey ?? this.ownerStore.getItem(this.ownerKeyName);
    if (o.ownerKey) this.ownerStore.setItem(this.ownerKeyName, o.ownerKey);

    this.sid = randomKey(8); // one page session; resets duplicate protection on reload
    this.listeners = new Map();
    // Handlers given here are in place before the first message arrives.
    for (const [type, fn] of Object.entries(o.on ?? {})) this.on(type, fn);
    this.n = 0;
    this.queue = []; // numbered messages kept for resending: { n, text, at, kind }
    // The room accepts a limited pace from one connection; the client stays under it.
    this.rate = 40;
    this.tokens = this.rate;
    this.tokensAt = Date.now();
    this.outbox = []; // messages held back by the pace, in order
    this.outboxTimer = null;
    this.latest = new Map(); // kind → newest pending value (send with `latest`, F-037)
    this.latestTimer = null;
    this.partSeq = 0;
    this.leaveTimer = null;
    this.pendingSnapshot = null;
    this.welcomeState = null; // the room's state for newcomers, if the game uses it (F-030)
    this.status = 'idle';
    this.ws = null;
    this.socketWelcomed = false;
    this.me = null;
    this.room = null;
    this.clockOffset = 0;
    this.welcomed = false;
    this.stopped = false;
    this.attempt = 0;
    this.failingSince = null;
    this.retryTimer = null;
    this.connectTimer = null;
    this.heartbeatTimer = null;
    this.pongTimer = null;
    this.phaseTimer = null;
    this.silentTimer = null;
    this.hiddenAt = 0;
    this.wasHost = false;
    this.wasOwner = false;
    this.wasRunning = false;
    this.lastHostData = 0;
    this.lastSnapshotAt = 0;
    this.firstWelcome = null;
  }

  // -------------------------------------------------------------- creating

  /** Create a room and connect to it as its owner. */
  static async create(server, options = {}) {
    const basePath = options.basePath ?? '/rooms';
    let res;
    try {
      res = await fetch(apiBase(server, basePath), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // The owner's admin pass, if this browser has one (F-058).
        body: JSON.stringify({ settings: options.settings ?? {}, adminPass: options.adminPass ?? adminPass(options.window) ?? undefined }),
      });
    } catch {
      throw new RoomError(0, 'network', 'Could not reach the server. Check your connection and try again.');
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const closed = (res.status === 503 && body.error !== 'no-free-code') || res.status === 429;
      throw new RoomError(closed ? CLOSE.GAME_CLOSED : 0, body.error ?? 'network', gameClosedText(body.error, body.until));
    }
    const room = new NetworkRoom({ ...options, server, code: body.code, ownerKey: body.ownerKey });
    await room.connect();
    return room;
  }

  /**
   * Is the game (or one of its modes) open right now? Asks the room server
   * without waking a room, e.g. before a game played alone in the browser
   * starts (F-057). Returns { open, reason, until, text }; open when unsure.
   */
  static async status(server, { basePath = '/rooms', mode = null, adminPass: pass, window: win } = {}) {
    const url = `${apiBase(server, basePath)}/status${mode ? `?mode=${encodeURIComponent(mode)}` : ''}`;
    const token = pass ?? adminPass(win);
    try {
      const res = await fetch(url, { headers: token ? { 'x-admin-pass': token } : {} });
      const body = await res.json();
      const notices = Array.isArray(body.notices) ? body.notices : []; // F-066
      return { open: body.open !== false, reason: body.reason ?? null, until: body.until ?? null, text: gameClosedText(body.reason, body.until), notices };
    } catch {
      return { open: true, reason: null, until: null, text: null, notices: [] };
    }
  }

  /** Join an existing room. */
  static async join(server, options) {
    // No game uses codes shorter than 4 or longer than 12 characters.
    if (!isValidCode(normalizeCode(options?.code))) throw new RoomError(CLOSE.NOT_FOUND, 'not-found');
    const room = new NetworkRoom({ ...options, server });
    await room.connect();
    return room;
  }

  /**
   * Join a lobby made on the admin page (F-059) from its host or guest link:
   * `token` defaults to the one in the address bar (`#nk-lobby=…`), which is
   * then taken out of it. The host link joins as the room's owner; the guest
   * link joins with an invitation key and waits for the host. Rejects with a
   * RoomError when it cannot; its reason is one of LOBBY_REFUSED's keys (B-089).
   */
  static async joinLobby(server, options = {}) {
    const token = options.token ?? readLobbyLink(options.window?.location?.hash);
    if (!token) throw new RoomError(CLOSE.NOT_FOUND, 'no-lobby', 'This is not a lobby link.');
    let res;
    try {
      res = await fetch(`${apiBase(server, options.basePath ?? '/rooms')}/lobby`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch {
      throw new RoomError(0, 'network', 'Could not reach the server. Check your connection and try again.');
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.code) {
      const reason = body.error ?? 'lobby-ended';
      throw new RoomError(CLOSE.GAME_CLOSED, reason, LOBBY_REFUSED[reason] ?? LOBBY_REFUSED['lobby-ended']);
    }
    if (!options.token) forgetLobbyLink(options.window);
    const { token: _t, ...rest } = options;
    const room = await NetworkRoom.join(server, body.role === 'host'
      ? { ...rest, code: body.code, ownerKey: body.ownerKey }
      : { ...rest, code: body.code, key: body.key });
    room.lobby = { role: body.role, ends: body.ends ?? null };
    return room;
  }

  /** Look up a room without joining: { code, phase, access, participants } or null. */
  static async info(server, code, { basePath = '/rooms' } = {}) {
    const res = await fetch(`${apiBase(server, basePath)}/${encodeURIComponent(normalizeCode(code))}`);
    if (res.status === 404) return null;
    const body = await res.json().catch(() => null);
    if (res.status === 410) return { ...body, closed: true };
    if (!res.ok) throw new RoomError(0, body?.error ?? 'network');
    return body;
  }

  // ---------------------------------------------------------------- events

  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    return () => this.listeners.get(type)?.delete(fn);
  }

  emit(type, detail) {
    for (const fn of [...(this.listeners.get(type) ?? [])]) {
      try {
        fn(detail);
      } catch (err) {
        console.error(`network-kit: "${type}" handler failed`, err);
      }
    }
  }

  setStatus(status) {
    if (this.status === status) return;
    this.status = status;
    this.measure?.status(status);
    this.emit('status', status);
  }

  // ------------------------------------------------------------ connection

  /** True when messages can be sent right now. */
  get ready() {
    return Boolean(this.ws && this.ws.readyState === 1 && this.socketWelcomed);
  }

  get hidden() {
    return Boolean(this.doc?.hidden);
  }

  /** Connect; resolves on the first welcome, rejects if the room refuses or cannot be reached. */
  connect() {
    if (this.firstWelcome) return this.firstWelcome.promise;
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.firstWelcome = { promise, resolve, reject, done: false };
    this.connectTimer = setTimeout(() => {
      if (!this.welcomed) this.finish(0, 'timeout');
    }, this.connectTimeoutMs);
    this.watch();
    this.claimIdentity().then(() => this.open());
    return promise;
  }

  /**
   * A tab opened from another tab (or duplicated) starts with a copy of its
   * sessionStorage, identity included. Such a copy gets an identity of its
   * own, so it joins as a new participant instead of taking over the other
   * tab's seat. A reload keeps the identity.
   */
  async claimIdentity() {
    if (!this.tabSession) return;
    try {
      const { copied } = await this.tabSession();
      if (copied && !renewedInThisPage.has(this.playerKeyName)) {
        renewedInThisPage.add(this.playerKeyName);
        this.playerKey = randomKey();
        this.keyStore.setItem(this.playerKeyName, this.playerKey);
      }
    } catch {
      // cannot tell: keep the stored identity
    }
  }

  open() {
    if (this.stopped) return;
    clearTimeout(this.retryTimer);
    this.dropSocket();
    this.setStatus(this.welcomed ? 'reconnecting' : 'connecting');
    const url = `${apiBase(this.server, this.basePath)}/${this.code}/ws`.replace(/^http/, 'ws');
    let ws;
    try {
      ws = new this.WebSocket(url);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws = ws;
    this.socketWelcomed = false;
    this.outbox = [];
    this.tokens = this.rate;
    this.tokensAt = Date.now();
    const joiner = new PartJoiner(MAX_INCOMING_CHARS); // large messages arrive in parts (F-036)
    let denied = null;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      try {
        ws.send(JSON.stringify({
          t: 'hello', v: PROTOCOL, pk: this.playerKey, sid: this.sid,
          name: this.name, role: this.role, key: this.key, owner: this.ownerKey,
          hidden: this.doc?.hidden === true,
          ...(this.adminPass ? { adminPass: this.adminPass } : {}),
        }));
      } catch {
        // onclose follows
      }
      this.startHeartbeat();
    };
    ws.onmessage = (event) => {
      if (this.ws !== ws) return;
      if (event.data === 'pong') {
        this.measure?.pongReceived();
        clearTimeout(this.pongTimer);
        this.pongTimer = null;
        if (this.ready) this.setStatus('online'); // the connection survived a blip
        return;
      }
      let msg;
      try {
        msg = JSON.parse(event.data);
        if (msg?.t === 'part') {
          const text = joiner.add(msg);
          if (text === null) return; // more parts to come
          msg = JSON.parse(text);
        }
      } catch {
        return;
      }
      if (msg.t === 'denied') denied = msg;
      this.handle(msg);
    };
    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.socketWelcomed = false;
      this.stopHeartbeat();
      const code = denied?.code ?? event.code;
      if (FINAL_CLOSE_CODES.has(code)) {
        this.finish(code, denied?.reason ?? event.reason);
        return;
      }
      this.scheduleRetry();
    };
    ws.onerror = () => {
      // onclose follows and schedules the retry
    };
  }

  dropSocket() {
    const ws = this.ws;
    this.ws = null;
    this.socketWelcomed = false;
    this.stopHeartbeat();
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
  }

  scheduleRetry() {
    if (this.stopped) return;
    const now = Date.now();
    this.failingSince ??= now;
    const failingFor = now - this.failingSince;
    if (this.welcomed && failingFor > this.giveUpMs) {
      this.finish(0, 'unreachable');
      return;
    }
    const offline = this.win?.navigator?.onLine === false;
    this.setStatus(offline ? 'offline' : this.welcomed ? 'reconnecting' : 'connecting');
    // Slow down in a hidden tab and after a long failure.
    const cap = this.hidden || failingFor > this.slowAfterMs ? this.slowDelayMs : this.maxDelayMs;
    const base = Math.min(cap, this.minDelayMs * 2 ** Math.min(this.attempt, 20));
    const delay = base * (0.75 + Math.random() * 0.5);
    this.attempt += 1;
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.open(), delay);
  }

  /** Reconnect now if the connection is not known to be healthy. */
  recover(force = false) {
    if (this.stopped) return;
    const open = this.ws && this.ws.readyState === 1;
    if (!open) {
      this.attempt = 0;
      this.open();
    } else if (force) {
      this.probe(3_000);
    } else if (this.ready) {
      this.setStatus('online');
    }
  }

  /** Send a heartbeat and reconnect if no answer arrives in time. */
  probe(timeoutMs) {
    if (!this.ws || this.ws.readyState !== 1 || this.pongTimer) return;
    try {
      this.ws.send('ping');
      this.measure?.pingSent();
    } catch {
      this.attempt = 0;
      this.open();
      return;
    }
    this.pongTimer = setTimeout(() => {
      this.pongTimer = null;
      this.attempt = 0;
      this.open();
    }, timeoutMs);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => this.probe(this.pongTimeoutMs), this.heartbeatMs);
  }

  stopHeartbeat() {
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.pongTimer);
    this.heartbeatTimer = null;
    this.pongTimer = null;
  }

  watch() {
    const win = this.win;
    const doc = this.doc;
    if (this.hostSilentMs) {
      this.silentTimer = setInterval(() => this.checkHostSilent(), Math.max(250, this.hostSilentMs / 2));
    }
    if (!win) return;
    const online = () => this.recover(true);
    const offline = () => this.setStatus('offline');
    const visible = () => {
      // The room closes a room whose pages have all been hidden for long (F-032).
      if (this.ready) this.command('visibility', { hidden: doc.hidden === true });
      if (doc.hidden) {
        this.hiddenAt = Date.now();
        return;
      }
      this.recover(Date.now() - this.hiddenAt > 15_000);
    };
    const shown = (event) => {
      if (event.persisted) this.recover(true);
    };
    const connection = win.navigator?.connection;
    win.addEventListener('online', online);
    win.addEventListener('offline', offline);
    win.addEventListener('pageshow', shown);
    doc?.addEventListener('visibilitychange', visible);
    connection?.addEventListener?.('change', online);
    this.unwatch = () => {
      win.removeEventListener('online', online);
      win.removeEventListener('offline', offline);
      win.removeEventListener('pageshow', shown);
      doc?.removeEventListener('visibilitychange', visible);
      connection?.removeEventListener?.('change', online);
    };
  }

  stopTimers() {
    this.measure?.stop('leave');
    clearTimeout(this.retryTimer);
    clearTimeout(this.connectTimer);
    clearTimeout(this.phaseTimer);
    clearTimeout(this.outboxTimer);
    clearTimeout(this.latestTimer);
    clearTimeout(this.leaveTimer);
    clearInterval(this.silentTimer);
    this.outbox = [];
    this.dropSocket();
    this.unwatch?.();
  }

  finish(code, reason) {
    if (this.stopped) return;
    this.stopped = true;
    this.stopTimers();
    this.setStatus('closed');
    if ([CLOSE.ROOM_CLOSED, CLOSE.KICKED, CLOSE.BANNED, CLOSE.BUDGET, CLOSE.LEFT, CLOSE.NOT_FOUND].includes(code)) {
      this.ownerStore.removeItem(this.ownerKeyName);
    }
    const detail = { code, reason, text: gameClosedText(reason, this.closedUntil) ?? CLOSE_TEXT[code] ?? UNREACHABLE };
    if (this.firstWelcome && !this.firstWelcome.done) {
      this.firstWelcome.done = true;
      this.firstWelcome.reject(new RoomError(code, reason, detail.text)); // the closed game's own words (F-026)
    }
    this.emit('closed', detail);
  }

  /** Stop without leaving: the seat is kept for the grace period. */
  disconnect() {
    if (this.stopped) return;
    this.stopped = true;
    this.stopTimers();
    this.setStatus('closed');
    if (this.firstWelcome && !this.firstWelcome.done) {
      this.firstWelcome.done = true;
      this.firstWelcome.reject(new RoomError(0, 'disconnected'));
    }
  }

  // -------------------------------------------------------------- incoming

  handle(msg) {
    switch (msg.t) {
      case 'welcome': {
        this.me = msg.you.id;
        this.role = msg.you.role;
        this.welcomed = true;
        this.socketWelcomed = true;
        this.attempt = 0;
        this.failingSince = null;
        clearTimeout(this.connectTimer);
        const limits = msg.room?.settings ?? {};
        if (Number.isFinite(limits.rate)) this.rate = limits.rate;
        if (Number.isFinite(limits.maxMessageBytes)) this.maxMessageBytes = Math.min(limits.maxMessageBytes, this.ownLimits.message);
        if (Number.isFinite(limits.maxSnapshotBytes)) this.maxSnapshotBytes = Math.min(limits.maxSnapshotBytes, this.ownLimits.snapshot);
        // The room may ask for a faster heartbeat, so it notices a dead connection sooner (F-051).
        if (Number.isFinite(limits.heartbeatMs) && limits.heartbeatMs > 0 && limits.heartbeatMs !== this.heartbeatMs) {
          this.heartbeatMs = limits.heartbeatMs;
          if (this.heartbeatTimer) this.startHeartbeat();
        }
        this.tokens = this.rate;
        this.tokensAt = Date.now();
        this.lastHostData = Date.now();
        this.applyRoom(msg.room);
        // Resend what the room has not counted yet; old game messages are not worth resending.
        const now = Date.now();
        this.queue = this.queue.filter(
          (m) => m.n > msg.lastN && (m.kind !== 'msg' || now - m.at <= this.maxQueueAgeMs),
        );
        if (this.n < msg.lastN) this.n = msg.lastN;
        // The newest state first, so a queued handover or leave passes on the right one.
        if (this.pendingSnapshot && this.isHost) this.transmit(this.pendingSnapshot);
        this.pendingSnapshot = null;
        if (this.isHost) for (const text of this.pendingWelcomeStates?.values() ?? []) this.transmit(text);
        this.pendingWelcomeStates?.clear();
        for (const m of this.queue) this.transmit(m.text);
        this.flushLatest(); // the newest values, after everything that must arrive in order
        this.setStatus('online');
        this.emit('welcome', this.room);
        if (!this.firstWelcome.done) {
          this.firstWelcome.done = true;
          this.firstWelcome.resolve(this);
        }
        break;
      }
      case 'room':
        this.applyRoom(msg.room);
        break;
      case 'msg':
        if (msg.from === this.room?.hostId) {
          this.lastHostData = Date.now();
          this.measure?.hostMessage();
        }
        // `at`: when the message reached the room, in server time (F-063).
        this.emit('message', { from: msg.from, data: msg.d, at: Number.isFinite(msg.at) ? msg.at : null });
        break;
      case 'probe':
        // The room measures the response time for the game's rules (F-076): answer at once.
        this.rawSend({ t: 'probe', n: msg.n });
        break;
      case 'host':
        // This client runs the game now: continue from the snapshot (null: start fresh).
        this.emit('host', { snapshot: msg.snapshot });
        if (this.autoHostReady) this.hostReady();
        break;
      case 'welcome-state':
        this.welcomeState = msg.d;
        this.emit('welcome-state', { data: msg.d });
        break;
      case 'owner':
        this.ownerKey = msg.key;
        this.ownerStore.setItem(this.ownerKeyName, msg.key);
        break;
      case 'check':
        this.rawSend({ t: 'cmd', c: 'alive' });
        break;
      case 'ev':
        if (msg.e === 'drop') this.measure?.peerDropped();
        if (msg.e === 'host') this.measure?.hostChanged();
        this.emit('peer', {
          event: msg.e, id: msg.id, why: msg.why, name: msg.name ?? this.player(msg.id)?.name ?? null,
          returning: msg.returning === true, player: this.player(msg.id),
        });
        break;
      case 'ok':
        this.emit('ok', { command: msg.c, n: msg.n });
        break;
      case 'err':
        this.emit('error', {
          code: msg.code, command: msg.c, n: msg.n,
          ...(msg.code === 'game-closed' ? { reason: msg.reason, until: msg.until, text: gameClosedText(msg.reason, msg.until) } : {}),
        });
        break;
      case 'closed':
      case 'denied':
        this.closedUntil = msg.until ?? null; // shown in the closed text (F-026)
        break; // handled when the socket closes
    }
  }

  applyRoom(room) {
    this.clockOffset = room.now - Date.now();
    this.room = room;
    // Nothing is sent when a countdown ends, so the phase is advanced here.
    clearTimeout(this.phaseTimer);
    if (room.phase === 'countdown' && room.startsAt !== null) {
      this.phaseTimer = setTimeout(() => {
        if (this.room !== room) return;
        this.room = { ...room, phase: 'playing' };
        if (!room.paused) {
          this.lastHostData = Date.now();
          this.wasRunning = true;
        }
        this.emit('room', this.room);
      }, Math.max(0, room.startsAt - this.serverNow()));
    }
    const isHost = this.isHost;
    const isOwner = this.isOwner;
    if (isHost !== this.wasHost) {
      // Messages queued in the old role must not be delivered in the new one.
      this.queue = this.queue.filter((m) => m.kind !== 'msg');
      this.latest.clear();
      this.pendingSnapshot = null;
      this.lastHostData = Date.now();
    }
    if (this.wasOwner && !isOwner && room.ownerId && room.ownerId !== this.me) {
      // This client gave the room to someone else: its key no longer works.
      this.ownerKey = null;
      this.ownerStore.removeItem(this.ownerKeyName);
    }
    const running = room.phase === 'playing' && !room.paused;
    if (running && !this.wasRunning) this.lastHostData = Date.now(); // the host has had no reason to send until now
    this.wasRunning = running;
    const changed = isHost !== this.wasHost || isOwner !== this.wasOwner;
    this.wasHost = isHost;
    this.wasOwner = isOwner;
    this.emit('room', room);
    if (changed) this.emit('role', { isHost, isOwner });
  }

  checkHostSilent() {
    const room = this.room;
    if (!this.ready || !room || room.mode !== 'host' || this.isHost || !this.running || this.self?.waiting) return;
    if (this.player(room.hostId)?.status !== 'online') return;
    if (Date.now() - this.lastHostData < this.hostSilentMs) return;
    this.lastHostData = Date.now();
    this.reportHostSilent();
  }

  // --------------------------------------------------------------- queries

  get isHost() {
    return Boolean(this.room && this.me && this.room.hostId === this.me);
  }

  get isOwner() {
    return Boolean(this.room && this.me && this.room.ownerId === this.me);
  }

  get players() {
    return this.room?.players ?? [];
  }

  player(id) {
    return this.players.find((p) => p.id === id) ?? null;
  }

  get self() {
    return this.player(this.me);
  }

  get phase() {
    return this.room?.phase ?? null;
  }

  /** True while the game is being played: started, countdown over, not paused. */
  get running() {
    return this.room?.phase === 'playing' && !this.room.paused;
  }

  /** Other participants who are connected right now. */
  get othersOnline() {
    return this.players.filter((p) => p.id !== this.me && p.status === 'online');
  }

  /** Server time in ms, for countdowns (room.startsAt). */
  serverNow() {
    return Date.now() + this.clockOffset;
  }

  /** Invitation keys (owner only): { role: { k, exp } }. */
  get inviteKeys() {
    return this.isOwner ? this.room.keys ?? null : null;
  }

  // -------------------------------------------------------------- outgoing

  rawSend(msg) {
    if (!this.ws || this.ws.readyState !== 1) return false;
    try {
      this.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
      return true;
    } catch {
      return false;
    }
  }

  tooLarge(text, limit, command) {
    if (text.length <= limit / 3 || new TextEncoder().encode(text).length <= limit) return false;
    this.emit('error', { code: 'too-large', command });
    return true;
  }

  takeToken() {
    if (!this.rate) return true; // the room sets no limit
    const now = Date.now();
    this.tokens = Math.min(this.rate, this.tokens + ((now - this.tokensAt) / 1000) * this.rate * 0.8);
    this.tokensAt = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  /**
   * Send at a pace the room accepts. Faster than that, messages that must
   * arrive are held back in order, and droppable ones are dropped.
   */
  transmit(text, droppable = false) {
    if (!this.ready) return false;
    // A large message goes in parts, one after the other, at the same pace (F-036).
    if (text.length > PART_CHARS) {
      this.partSeq += 1;
      for (const part of splitIntoParts(text, this.partSeq)) this.transmitPiece(part, false);
      return true;
    }
    return this.transmitPiece(text, droppable);
  }

  /** Send one text as it is, keeping the pace. */
  transmitPiece(text, droppable) {
    if (this.outbox.length === 0 && this.takeToken()) return this.rawSend(text);
    if (droppable) return false;
    this.outbox.push(text);
    this.outboxTimer ??= setTimeout(() => this.drain(), 50);
    return true;
  }

  /** Send the newest pending value of each kind as soon as the pace allows (F-037). */
  flushLatest() {
    this.latestTimer = null;
    for (const [kind, text] of this.latest) {
      if (!this.ready || this.outbox.length > 0 || !this.takeToken()) break;
      this.rawSend(text);
      this.latest.delete(kind);
    }
    if (this.latest.size > 0 && this.ready) this.latestTimer = setTimeout(() => this.flushLatest(), 30);
  }

  drain() {
    this.outboxTimer = null;
    while (this.outbox.length > 0 && this.ready && this.takeToken()) this.rawSend(this.outbox.shift());
    if (this.outbox.length > 0 && this.ready) this.outboxTimer = setTimeout(() => this.drain(), 50);
  }

  numbered(msg, kind) {
    this.n += 1;
    const text = JSON.stringify({ ...msg, n: this.n });
    this.queue.push({ n: this.n, text, at: Date.now(), kind });
    if (this.queue.length > this.maxQueue) this.queue.shift();
    if (this.ready) this.transmit(text);
    return this.n;
  }

  /**
   * Send game data. Host-run rooms: from the host to `to` (default: everyone
   * else); from anyone else to the host. Server-run rooms: to the game rules.
   * `to`: 'all' | [ids] | { role } | { place }.
   * `reliable: false` drops the message while disconnected or when it comes
   * faster than the room's pace (for data that the next message replaces anyway).
   * `latest: kind` (e.g. 'aim') keeps only the newest value of that kind and
   * sends it as soon as the pace allows, also after a reconnect: for values
   * that change faster than they can be sent, where only the last one counts.
   * Returns false when the message was not sent: nobody is there to get it
   * (a host alone in the room, or the host is away), or it is too large.
   */
  send(data, { to, reliable = true, latest } = {}) {
    const room = this.room;
    if (room && !this.isHost) {
      // Only roles that send may; someone still waiting to be admitted may not.
      if (this.self?.waiting || room.roles?.[this.role]?.sends === false) return false;
    }
    if (room?.mode === 'host') {
      if (this.isHost ? this.othersOnline.length === 0 : this.player(room.hostId)?.status !== 'online') return false;
    }
    const msg = { t: 'msg', d: data };
    if (to !== undefined) msg.to = to;
    const text = JSON.stringify(msg);
    if (this.tooLarge(text, this.maxMessageBytes, 'send')) return false;
    if (latest !== undefined) {
      const kind = String(latest);
      if (text.length > PART_CHARS) return this.transmit(text);
      if (!this.latest.has(kind) && this.ready && this.outbox.length === 0 && this.takeToken()) return this.rawSend(text);
      this.latest.delete(kind); // keeps the kinds in the order they last changed
      this.latest.set(kind, text);
      if (this.ready) this.latestTimer ??= setTimeout(() => this.flushLatest(), 30);
      return true;
    }
    if (reliable) return this.numbered(msg, 'msg');
    return this.transmit(text, true);
  }

  /**
   * Host only: give the room the full game state to keep. It is private to
   * the host seat: the room only ever sends it back to whoever runs the game
   * (this host after a reload, or the next host after a takeover or handover).
   * State for participants who join or come back is sent with send(..., { to: [id] }).
   * While the host is alone in the room, snapshots are kept seldom
   * (aloneSnapshotMs) unless `force` is set.
   */
  sendSnapshot(data, { force = false } = {}) {
    if (!this.isHost) return false;
    const now = Date.now();
    if (!force && this.othersOnline.length === 0 && now - this.lastSnapshotAt < this.aloneSnapshotMs) return false;
    const text = JSON.stringify({ t: 'snap', d: data });
    if (this.tooLarge(text, this.maxSnapshotBytes, 'snapshot')) return false;
    this.lastSnapshotAt = now;
    if (this.ready) return this.transmit(text);
    this.pendingSnapshot = text; // delivered after the reconnect
    return true;
  }

  /**
   * Host: the state everyone who joins or comes back gets right after the
   * welcome, kept by the room (so it reaches them even while the host is
   * asleep). One shared state, or one per role with `{ role }`; `null`
   * removes it (F-030). Only the newest counts.
   */
  setWelcomeState(data, { role = null } = {}) {
    if (!this.isHost) return false;
    const text = JSON.stringify({ t: 'welcome-state', role, d: data ?? null });
    if (this.tooLarge(text, this.maxSnapshotBytes, 'welcome-state')) return false;
    this.pendingWelcomeStates ??= new Map();
    if (this.ready) {
      this.pendingWelcomeStates.delete(role ?? '*');
      return this.transmit(text);
    }
    this.pendingWelcomeStates.set(role ?? '*', text); // delivered after the reconnect
    return true;
  }

  command(c, args = {}) {
    return this.numbered({ t: 'cmd', c, ...args }, 'cmd');
  }

  /** Take a place (a post, a team, a side). */
  takePlace(place) { return this.command('take', { place }); }
  leavePlace() { return this.command('leave-place'); }
  pause() { return this.command('pause'); }
  resume() { return this.command('resume'); }

  // Host (and owner): running the game.
  start() { return this.command('start'); }
  cancelStart() { return this.command('cancel'); }
  end() { return this.command('end'); }
  /** Small shared data everyone sees in room.data (lobby choices, the chosen map, ...). */
  setData(data) { return this.command('data', { d: data }); }
  admitWaiting() { return this.command('admit'); }
  assignPlace(id, place) { return this.command('assign', { id, place }); }
  hostReady() { return this.command('host-ready'); }
  /** Owner: lift a ban (`room.bans` lists who was banned) (F-031). They need a new invitation link. */
  unban(id) { return this.command('unban', { id }); }
  /** Host: who should take over first if this browser is lost, e.g. the player whose turn it is (F-040). */
  setSuccessors(ids) { return this.command('successors', { ids }); }

  /** Hand the game to another participant. Sends `snapshot` first if given. */
  handover(id, snapshot) {
    if (snapshot !== undefined) this.sendSnapshot(snapshot, { force: true });
    return this.command('handover', { id });
  }

  // Owner: the room itself.
  kick(id, { ban = false } = {}) { return this.command('kick', { id, ban }); }
  renewKey(role, { ttlMs } = {}) { return this.command('renew', { role, ttlMs }); }
  setSettings(settings) { return this.command('settings', settings); }
  giveOwnership(id) { return this.command('owner', { id }); }

  /** Owner only: close the room for everyone. */
  close() { return this.command('close'); }

  /** Tell the room that the host seems to have stopped; it checks and acts within seconds. */
  reportHostSilent() {
    return this.rawSend({ t: 'cmd', c: 'host-check' });
  }

  /**
   * Leave on purpose. An owner leaving closes the room unless the game passes
   * ownership on. A host may pass a last `snapshot` for whoever continues.
   */
  leave(snapshot) {
    if (this.stopped) return;
    if (snapshot !== undefined && this.isHost) this.sendSnapshot(snapshot, { force: true });
    this.command('leave');
    // Not connected right now: keep trying for a moment so the room hears about
    // it. If it does not, the seat is simply held for the grace period (and an
    // owner keeps the key, to come back and close the room properly).
    if (!this.ready) this.recover();
    this.leaveTimer = setTimeout(() => this.disconnect(), 10_000);
  }
}

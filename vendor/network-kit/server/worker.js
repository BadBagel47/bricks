// Cloudflare glue: a Worker fetch handler and a Durable Object class built
// around RoomCore. A game's own Worker uses it like this:
//
//   import { createRoomServer } from './vendor/network-kit/server/index.js';
//   const rooms = createRoomServer({ mode: 'host', takeover: true, places: ['captain', 'gunner'] });
//   export const Room = rooms.RoomObject;          // class_name in wrangler config
//   export default { fetch: rooms.fetch };
//
// HTTP API (prefix `basePath`, default /rooms):
//   POST /rooms               create a room → { code, ownerKey, keys }
//   GET  /rooms/CODE          room info → { code, phase, access, participants }
//   GET  /rooms/CODE/ws       WebSocket into the room (first message: hello)

import {
  CLOSE, CODE_LENGTH, CODE_MAX_LENGTH, CODE_MIN_LENGTH, isValidCode, normalizeCode,
} from '../shared/protocol.js';
import { VERSION } from '../version.js';
import { RoomCore, resolveOptions } from './room-core.js';
import { cleanSummary } from './measure-check.js';
import { newRoomCode } from './random.js';

const SERVER_OPTIONS = {
  binding: 'ROOMS', // Durable Object namespace binding name in the wrangler config
  basePath: '/rooms',
  codeLength: CODE_LENGTH, // characters in a room code, 4 to 12
  allowedOrigins: '*', // '*' or a list such as ['https://badbagel47.github.io']
  jurisdiction: null, // 'eu' keeps rooms in the EU; may be a function (env) => 'eu' | null
  gate: null, // experimental: async ({ request, env, action }) => true | { open: false, reason }
  // Per visitor (address) and minute, checked before a room is woken (F-053):
  // rooms created, and look-ups or joins at a room code. null turns it off;
  // may be a function (env) => limits | null.
  limits: { createsPerMinute: 10, attemptsPerMinute: 60 },
  // The admin page (F-003, F-004): { binding, game, mode } — a service binding
  // to the admin Worker's GameApi entrypoint, this game's name (its Worker's
  // name) and, for a game with modes, the rooms' mode (F-057). May be a
  // function (env) => { … } | null. null: not connected.
  admin: null,
  // The role a lobby's guest link joins in (F-059); null: 'player', else the first role.
  lobbyRole: null,
  fallback: null, // async (request, env, ctx) => Response for other paths
};

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

/** A WebSocket that closes at once with a reason, without waking a room. */
function closedSocket(code, reason) {
  // eslint-disable-next-line no-undef
  const pair = new WebSocketPair();
  pair[1].accept();
  pair[1].send(JSON.stringify({ t: 'denied', code, reason }));
  pair[1].close(code, reason);
  return new Response(null, { status: 101, webSocket: pair[0] });
}

/** The admin page's notices as pages get them (F-066): known fields only, short texts. */
export function cleanNotices(list) {
  if (!Array.isArray(list)) return [];
  const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  return list.slice(0, 20).filter((n) => n && typeof n.id === 'string' && n.id).map((n) => ({
    id: text(n.id, 80),
    kind: text(n.kind, 40) || 'message',
    level: n.level === 'warning' ? 'warning' : 'info',
    title: text(n.title, 80),
    text: text(n.text, 400),
    until: typeof n.until === 'string' && !Number.isNaN(Date.parse(n.until)) ? n.until : null,
  }));
}

export function createRoomServer(gameOptions = {}) {
  const serverOptions = {};
  const coreOptions = {};
  for (const [key, value] of Object.entries(gameOptions)) {
    if (key in SERVER_OPTIONS) serverOptions[key] = value;
    else coreOptions[key] = value;
  }
  const opts = { ...SERVER_OPTIONS, ...serverOptions };
  if (!Number.isInteger(opts.codeLength) || opts.codeLength < CODE_MIN_LENGTH || opts.codeLength > CODE_MAX_LENGTH) {
    throw new Error(`network-kit: codeLength must be a whole number from ${CODE_MIN_LENGTH} to ${CODE_MAX_LENGTH}`);
  }
  resolveOptions(coreOptions); // fail early on bad options

  function namespace(env) {
    const ns = env[opts.binding];
    if (!ns) throw new Error(`network-kit: missing Durable Object binding "${opts.binding}"`);
    const where = typeof opts.jurisdiction === 'function' ? opts.jurisdiction(env) : opts.jurisdiction;
    return where ? ns.jurisdiction(where) : ns;
  }

  const stub = (env, code) => {
    const ns = namespace(env);
    return ns.get(ns.idFromName(code));
  };

  function corsHeaders(request) {
    const origin = request.headers.get('origin');
    if (!origin) return {};
    if (opts.allowedOrigins === '*' || opts.allowedOrigins.includes(origin)) {
      return {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type, x-admin-pass', // x-admin-pass: a game link on the status check (B-104)
        'access-control-max-age': '86400',
        vary: 'origin',
      };
    }
    return null;
  }

  async function makeRoom(env, { settings = {}, open = false, pass = null, lobbyEnds = null } = {}) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = newRoomCode(opts.codeLength);
      const res = await stub(env, code).fetch('https://room/create', {
        method: 'POST',
        body: JSON.stringify({ code, settings, open, pass, lobbyEnds }),
      });
      if (res.status === 409) continue;
      return { status: res.status, body: await res.json() };
    }
    return { status: 503, body: { error: 'no-free-code' } };
  }

  /**
   * For the game's own server code: create a room nobody in it created, e.g.
   * for an invitation two people open (F-029). The first participant who may
   * lead becomes owner and host. Returns { code, keys } (no owner key).
   */
  async function createRoom(env, { settings = {} } = {}) {
    const made = await makeRoom(env, { settings, open: true });
    if (made.status !== 200) throw new Error(`network-kit: could not create a room (${made.body.error ?? made.status})`);
    return made.body;
  }

  // Counters per address, kept in this Worker instance's memory: cheap, and
  // enough to make guessing codes or creating rooms in bulk pointless (F-053).
  const visitors = new Map();
  function overLimit(request, env, kind) {
    const limits = typeof opts.limits === 'function' ? opts.limits(env) : opts.limits;
    const max = limits?.[kind === 'create' ? 'createsPerMinute' : 'attemptsPerMinute'];
    if (!max) return false;
    const address = request.headers.get('cf-connecting-ip') || 'unknown';
    const minute = Math.floor(Date.now() / 60_000);
    let v = visitors.get(address);
    if (!v || v.minute !== minute) {
      if (visitors.size > 10_000) visitors.clear(); // never let the table grow without end
      v = { minute, create: 0, attempt: 0 };
      visitors.set(address, v);
    }
    v[kind] += 1;
    return v[kind] > max;
  }

  // The admin page's word, asked at most every 30 s per Worker instance. If
  // the admin Worker cannot be reached the game stays open: a broken admin
  // page must not stop every game.
  const words = new Map(); // mode → { at, value }
  const adminLink = (env) => {
    const link = typeof opts.admin === 'function' ? opts.admin(env) : opts.admin;
    const api = link && env[link.binding];
    return api?.status ? { link, api } : null;
  };
  async function adminWord(env, mode = undefined) {
    const found = adminLink(env);
    if (!found) return null;
    const m = mode === undefined ? found.link.mode ?? null : mode;
    const now = Date.now();
    const cached = words.get(m);
    if (cached && now - cached.at < 30_000) return cached.value;
    let value = null;
    try {
      value = await found.api.status(found.link.game, m, VERSION); // the version is shown on the admin page (F-074)
    } catch {
      value = null;
    }
    words.set(m, { at: now, value });
    return value;
  }

  // The owner's admin pass (F-058): checked with the admin page, kept a minute.
  const passes = new Map(); // token → { at, valid }
  async function passValid(env, token) {
    const found = adminLink(env);
    if (!found?.api.checkPass || typeof token !== 'string' || token.length > 100) return false;
    const now = Date.now();
    const cached = passes.get(token);
    if (cached && now - cached.at < 60_000) return cached.valid;
    let valid = false;
    try {
      valid = (await found.api.checkPass(found.link.game, token)) === true;
    } catch {
      valid = false;
    }
    if (passes.size > 1000) passes.clear();
    passes.set(token, { at: now, valid });
    return valid;
  }

  async function gate(request, env, action) {
    if (!opts.gate) return { open: true };
    const result = await opts.gate({ request, env, action });
    if (result === true || result?.open) return { open: true };
    return { open: false, reason: result?.reason || 'game-closed' };
  }

  async function fetch(request, env, ctx) {
    const url = new URL(request.url);
    const base = opts.basePath.replace(/\/$/, '');
    if (url.pathname !== base && !url.pathname.startsWith(`${base}/`)) {
      return opts.fallback ? opts.fallback(request, env, ctx) : json({ error: 'not-found' }, 404);
    }
    const cors = corsHeaders(request);
    if (cors === null) return json({ error: 'origin-not-allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    // A path with an empty part (a doubled slash) is never one of ours (B-097).
    if (url.pathname.slice(base.length).includes('//')) return json({ error: 'not-found' }, 404, cors);
    const parts = url.pathname.slice(base.length).split('/').filter(Boolean);

    if (parts.length === 0 && request.method === 'POST') {
      if (overLimit(request, env, 'create')) return json({ error: 'too-many-requests' }, 429, { ...cors, 'retry-after': '60' });
      let body = {};
      try {
        body = (await request.json()) ?? {};
      } catch {
        body = {};
      }
      const status = await adminWord(env);
      // The owner's admin pass opens a closed game for this browser; an emergency stop stays a stop.
      if (status && !status.open && (status.stopped || !(await passValid(env, body.adminPass)))) {
        return json({ error: status.reason ?? 'off', until: status.until ?? null }, 503, cors);
      }
      const open = await gate(request, env, 'create');
      if (!open.open) return json({ error: open.reason }, 503, cors);
      const made = await makeRoom(env, { settings: body.settings ?? {} });
      return json(made.body, made.status, cors);
    }

    // Is the game (or one of its modes) open right now? For pages that need no
    // room to ask, e.g. a game played alone in the browser (F-057).
    if (parts.length === 1 && parts[0] === 'status' && request.method === 'GET') {
      if (overLimit(request, env, 'attempt')) return json({ error: 'too-many-requests' }, 429, cors);
      const mode = url.searchParams.get('mode') || null;
      const status = (await adminWord(env, mode)) ?? { open: true, reason: null, until: null };
      // Notices from the admin page reach every page that asks, open or not (F-066).
      const notices = cleanNotices(status.notices);
      if (!status.open && !status.stopped && (await passValid(env, request.headers.get('x-admin-pass')))) {
        return json({ open: true, reason: 'admin', until: null, notices }, 200, cors);
      }
      return json({ open: status.open, reason: status.reason ?? null, until: status.until ?? null, notices }, 200, cors);
    }

    // A lobby made on the admin page (F-059): the page sends the link's token
    // and gets the room's code with the owner key (host link) or an
    // invitation key (guest link). The room is made when the first one comes.
    if (parts.length === 1 && parts[0] === 'lobby' && request.method === 'POST') {
      if (overLimit(request, env, 'attempt')) return json({ error: 'too-many-requests' }, 429, { ...cors, 'retry-after': '60' });
      const found = adminLink(env);
      if (!found?.api.lobby) return json({ error: 'no-lobbies' }, 404, cors);
      let token = '';
      try {
        token = String((await request.json())?.token ?? '').slice(0, 120);
      } catch {
        token = '';
      }
      const status = await adminWord(env);
      if (status?.stopped) return json({ error: 'stopped' }, 503, cors);
      let lobby = null;
      try {
        lobby = await found.api.lobby(found.link.game, token);
      } catch {
        lobby = null;
      }
      if (!lobby || lobby.error) return json({ error: lobby?.error ?? 'lobby-ended' }, 410, cors);
      let room = lobby.room;
      if (!room) {
        const made = await makeRoom(env, { settings: { access: 'private' }, pass: token, lobbyEnds: lobby.expires });
        if (made.status !== 200) return json({ error: made.body.error ?? 'no-room' }, 503, cors);
        const keys = made.body.keys ?? {};
        const guestRole = opts.lobbyRole && keys[opts.lobbyRole] ? opts.lobbyRole : keys.player ? 'player' : Object.keys(keys)[0];
        // The first room stored wins; one made at the same moment by someone else is left to be cleaned up.
        room = await found.api.lobbyRoom(found.link.game, lobby.id, { code: made.body.code, ownerKey: made.body.ownerKey, key: keys[guestRole]?.k ?? null });
      }
      return json(lobby.role === 'host'
        ? { role: 'host', code: room.code, ownerKey: room.ownerKey, ends: lobby.expires }
        : { role: 'guest', code: room.code, key: room.key, ends: lobby.expires }, 200, cors);
    }

    // Anonymous measurement from the game's pages (F-052), handed to the admin page.
    if (parts.length === 1 && parts[0] === 'measure' && request.method === 'POST') {
      if (overLimit(request, env, 'attempt')) return new Response(null, { status: 429, headers: cors });
      const link = typeof opts.admin === 'function' ? opts.admin(env) : opts.admin;
      const api = link && env[link.binding];
      const text = await request.text();
      if (!api?.measure || text.length > 8 * 1024) return new Response(null, { status: 204, headers: cors });
      let summary = null;
      try {
        summary = cleanSummary(JSON.parse(text));
      } catch {
        summary = null;
      }
      if (summary) {
        const sent = api.measure(link.game, summary).catch(() => {});
        if (ctx?.waitUntil) ctx.waitUntil(sent);
        else await sent;
      }
      return new Response(null, { status: 204, headers: cors });
    }

    if (parts.length === 0 && request.method === 'GET') {
      return json({ name: 'network-kit', version: VERSION, codeLength: opts.codeLength }, 200, cors);
    }

    const code = normalizeCode(parts[0]);
    // A code of the wrong length cannot be one of this game's rooms: answer without waking a room.
    // A WebSocket gets a proper "Room not found", so the player is told at once.
    if (!isValidCode(code, opts.codeLength)) {
      const ws = parts.length === 2 && parts[1] === 'ws' && request.headers.get('upgrade')?.toLowerCase() === 'websocket';
      return ws ? closedSocket(CLOSE.NOT_FOUND, 'not-found') : json({ error: 'not-found' }, 404, cors);
    }

    const wantsSocket = parts.length === 2 && parts[1] === 'ws';
    if ((parts.length === 1 && request.method === 'GET') || wantsSocket) {
      if (overLimit(request, env, 'attempt')) {
        return wantsSocket && request.headers.get('upgrade')?.toLowerCase() === 'websocket'
          ? closedSocket(CLOSE.RATE, 'too-many-attempts')
          : json({ error: 'too-many-requests' }, 429, { ...cors, 'retry-after': '60' });
      }
    }

    if (parts.length === 1 && request.method === 'GET') {
      const res = await stub(env, code).fetch('https://room/info');
      return json(await res.json(), res.status, cors);
    }

    if (parts.length === 2 && parts[1] === 'ws') {
      if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
        return json({ error: 'websocket-expected' }, 426, cors);
      }
      // An emergency stop turns everyone away here; otherwise the room decides,
      // so participants who were already in a room can come back (F-003).
      const status = await adminWord(env);
      if (status?.stopped) return closedSocket(CLOSE.GAME_CLOSED, 'stopped');
      const open = await gate(request, env, 'join');
      if (!open.open) return closedSocket(CLOSE.GAME_CLOSED, open.reason);
      return stub(env, code).fetch('https://room/ws', { headers: { upgrade: 'websocket' } });
    }

    return json({ error: 'not-found' }, 404, cors);
  }

  class RoomObject {
    constructor(ctx, env) {
      this.ctx = ctx;
      this.env = env;
      const attachments = new WeakMap();
      const host = {
        now: () => Date.now(),
        storage: {
          get: (key) => ctx.storage.get(key),
          put: (key, value) => ctx.storage.put(key, value),
          delete: (key) => ctx.storage.delete(key),
          deleteAll: () => ctx.storage.deleteAll(),
        },
        setAlarm: (at) => (at === null ? ctx.storage.deleteAlarm() : ctx.storage.setAlarm(at)),
        // A pending timer keeps the room in memory, so this is only for short waits.
        defer(ms, fn) {
          const timer = setTimeout(() => ctx.waitUntil(Promise.resolve().then(fn).catch(() => {})), ms);
          return () => clearTimeout(timer);
        },
        env,
        sockets: () => ctx.getWebSockets(),
        getAttachment(ws) {
          if (!attachments.has(ws)) attachments.set(ws, ws.deserializeAttachment() ?? null);
          return attachments.get(ws);
        },
        setAttachment(ws, value) {
          attachments.set(ws, value);
          ws.serializeAttachment(value);
        },
        send(ws, text) {
          try {
            ws.send(text);
          } catch {
            // the socket is already closing
          }
        },
        close(ws, code, reason) {
          try {
            ws.close(code, reason);
          } catch {
            // already closed
          }
        },
        admission: () => adminWord(env),
        checkAdminPass: (token) => passValid(env, token),
        lastPingAt(ws) {
          // When the platform last answered this socket's heartbeat for us (F-051).
          return ctx.getWebSocketAutoResponseTimestamp?.(ws)?.getTime() ?? null;
        },
      };
      this.core = new RoomCore(host, coreOptions);
      // Heartbeats are answered without waking the room (no cost).
      // eslint-disable-next-line no-undef
      if (typeof WebSocketRequestResponsePair === 'function') {
        // eslint-disable-next-line no-undef
        ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
      }
      ctx.blockConcurrencyWhile(() => this.core.load());
    }

    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/create') {
        const body = await request.json();
        const result = await this.core.create(body.settings, body.code, { open: body.open === true, pass: body.pass ?? null, lobbyEnds: body.lobbyEnds ?? null });
        return json(result, result.error ? 409 : 200);
      }
      if (url.pathname === '/info') {
        const info = this.core.info();
        if (!info) return json({ error: 'not-found' }, 404);
        return json({ ...info, where: await this.where() }, info.closed ? 410 : 200);
      }
      if (url.pathname === '/ws') {
        // eslint-disable-next-line no-undef
        const pair = new WebSocketPair();
        this.ctx.acceptWebSocket(pair[1]);
        this.core.opened(pair[1]);
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      return json({ error: 'not-found' }, 404);
    }

    /**
     * The data centre this room runs in (e.g. "FRA"), asked once per wake-up
     * from Cloudflare's trace page; null if that fails (D-046). A room stays
     * where it was created: near the first visitor, inside the jurisdiction.
     */
    async where() {
      this.whereAt ??= (async () => {
        try {
          const res = await globalThis.fetch('https://www.cloudflare.com/cdn-cgi/trace', { signal: AbortSignal.timeout(2_000) });
          return /^colo=(\w+)$/m.exec(await res.text())?.[1] ?? null;
        } catch {
          return null;
        }
      })();
      return this.whereAt;
    }

    async webSocketMessage(ws, message) {
      await this.core.message(ws, message);
    }

    async webSocketClose(ws, code, reason) {
      await this.core.closed(ws);
      try {
        ws.close(code === 1005 ? 1000 : code, reason);
      } catch {
        // already closed
      }
    }

    async webSocketError(ws) {
      await this.core.closed(ws);
    }

    async alarm() {
      await this.core.alarm();
    }
  }

  return { fetch, createRoom, RoomObject, options: opts };
}

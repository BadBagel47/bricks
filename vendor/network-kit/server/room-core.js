// One room's logic, independent of Cloudflare so it can be tested in Node.
// The Durable Object glue (worker.js) feeds it sockets, messages and alarms
// through a small "host" interface:
//
//   host.now()                          current time in ms
//   host.storage.get/put/delete/deleteAll
//   host.setAlarm(atMs | null)
//   host.defer(ms, fn) → cancel()       short in-memory timer (keeps the room awake)
//   host.sockets()                      all accepted sockets of this room
//   host.getAttachment(ws) / host.setAttachment(ws, value)
//   host.send(ws, text) / host.close(ws, code, reason)
//   host.env                            the Worker's environment (for rules)
//   host.lastPingAt(ws)                 optional: when the socket last sent a
//                                       heartbeat the platform answered (ms or null)
//   host.admission()                    optional: the admin page's word on this game,
//                                       { open, reason, until, stopped } (F-003)
//   host.checkAdminPass(token)          optional: is this a valid game link (admin pass)? (F-058, F-068)
//
// Everything that must survive hibernation lives in `this.state` (stored
// under the key "room") or in socket attachments. The latest full game state
// sent by the host (snapshot) is kept in memory and stored at most every
// `snapshotSaveMs`, with a trailing save so the newest one is never lost when
// the room goes to sleep.
//
// Words used here:
//   participant  anyone in the room (a "player" record), whatever the role
//   owner        the creator: keeps the rights and the invitation keys
//   host         host-run rooms: the participant whose browser runs the game

import {
  PROTOCOL, CLOSE, CLOSE_UNRESPONSIVE, PART_CHARS, splitIntoParts, PartJoiner,
} from '../shared/protocol.js';
import { newPlayerId, newSecret, randomSeed, sha256, sameSecret } from './random.js';
import { LOBBY_PREFIX, own, byteLength } from './room-shared.js';
import { admissionMethods } from './room-admission.js';
import { commandMethods } from './room-commands.js';

// The stored room's shape (D-105). Raising it needs, in the same change, either
// a step in STATE_MIGRATIONS from the version before (live rooms carry on), or
// the version in STATE_DROPPED with a CHANGELOG line saying the update closes
// live rooms, so the owner can check on the admin page that none are playing.
// tests/unit/room-core.test.js fails if neither is there.
export const STATE_VERSION = 2;
export const STATE_MIGRATIONS = {
  // 2: (state) => ({ ...state, v: 3, newField: null }),
};
export const STATE_DROPPED = new Set([1]); // 0.2.0: rooms of 0.1.x were closed (before D-105)
const KNOWN_MAX = 100;
const USAGE_SAVE_EVERY = 500;
const USAGE_SAVE_SOON = 50; // unsaved messages that are worth a write before the room sleeps

export const DEFAULT_ROLES = Object.freeze({
  player: Object.freeze({ seats: 8, plays: true }),
  viewer: Object.freeze({ seats: 4, plays: false }),
});

export const DEFAULT_OPTIONS = Object.freeze({
  mode: 'host', // 'host': a participant's browser runs the game; 'server': rules run here
  roles: null, // name → { seats, plays, canPause, canHost, sends, sendsTo, needsKey }; null = player + viewer
  ownerRole: 'player', // the role the room's creator joins in
  places: {}, // named spots a playing participant can take: { name: capacity } or [names]
  access: 'open', // default room access: 'open' (code is enough) or 'private' (key needed)
  lateJoin: 'now', // default: 'now', 'next' (wait for the next safe point) or 'never'
  lateJoinChoices: ['now', 'next', 'never'], // what an owner may choose for this game
  pauseBy: 'anyone', // 'anyone' (whose role may pause), 'host' (host and owner) or 'nobody'
  graceMs: 60_000, // how long a dropped participant keeps the seat
  autoPauseMs: null, // pause automatically when a playing participant has been away this long
  takeover: false, // host-run rooms: may another participant take over a lost host's game?
  takeoverMs: 5_000, // ... after waiting this long for the host
  hostCheckMs: 3_000, // how long a host has to answer when others report it silent
  heartbeatMs: null, // clients send a free heartbeat this often; a participant silent for
  // 2.5 heartbeats is treated as dropped (F-051). null: the client's default (20 s), no check
  closeAfterHostAwayMs: null, // without takeover: close the room after waiting this long
  passOwnerAfterMs: null, // ownership passes on when the owner has been away this long
  ownerLeave: 'close', // owner leaving on purpose: 'close' the room or 'pass' ownership on
  countdownMs: 3_000,
  idleCloseMs: 60 * 60_000, // close the room when every connected page has been hidden this long (null: never) (F-032)
  cleanupMs: 24 * 60 * 60_000, // delete a room this long after the last participant left
  closedKeepMs: 60 * 60_000, // keep a closed room's "closed" note this long
  snapshotSaveMs: 5_000,
  maxMessageBytes: 256 * 1024, // larger messages travel in parts (F-036)
  maxSnapshotBytes: 1024 * 1024,
  maxDataBytes: 4 * 1024, // the room's shared data (see the "data" command)
  maxMessagesPerSecond: 40, // per connection (short bursts of twice this are fine)
  // Per room and UTC day (lowered in 0.16, F-106: the old 600,000 and 720 were a
  // third of the whole account's day). A long evening of play fits well within these.
  maxMessagesPerDay: 150_000,
  maxActiveMinutesPerDay: 4 * 60, // minutes in which messages arrived
  // Host-run rooms: a room that keeps getting game messages while nobody else is
  // there to receive them is a script or a fault (the kit's client sends nothing
  // when alone); it closes after this long (F-098). null: never.
  closeAloneAfterMs: 5 * 60_000,
  maxPendingSockets: 8, // connections that have not said hello yet
  nameMaxLength: 24,
  rttProbeMs: null, // measure each participant's response time this often, for the rules (F-076); null: never
  rules: null, // server mode: the game's rules (see docs/INTEGRATION.md)
});


function resolveRoles(roles) {
  const out = {};
  for (const [name, def] of Object.entries(roles ?? DEFAULT_ROLES)) {
    if (!/^[a-z][a-z0-9-]{0,23}$/.test(name)) throw new Error(`network-kit: bad role name "${name}"`);
    const merged = { ...(DEFAULT_ROLES[name] ?? { seats: 1, plays: false }), ...def };
    const plays = Boolean(merged.plays);
    out[name] = {
      seats: Math.max(0, Math.floor(Number(merged.seats) || 0)),
      plays,
      canPause: Boolean(merged.canPause ?? plays),
      canHost: Boolean(merged.canHost ?? plays),
      sends: Boolean(merged.sends ?? plays),
      // Host-run rooms: 'host' (messages go to the host) or 'all' (the same
      // targets as the host: everyone, a list, a role or a place) (F-039).
      sendsTo: merged.sendsTo === 'all' ? 'all' : 'host',
      needsKey: Boolean(merged.needsKey ?? !own(DEFAULT_ROLES, name)),
    };
  }
  if (Object.keys(out).length === 0) throw new Error('network-kit: at least one role is needed');
  return out;
}

function resolvePlaces(places) {
  const out = {};
  const entries = Array.isArray(places) ? places.map((name) => [name, 1]) : Object.entries(places ?? {});
  for (const [name, capacity] of entries) {
    if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,23}$/i.test(name)) {
      throw new Error(`network-kit: bad place name "${name}"`);
    }
    out[name] = Math.max(1, Math.floor(Number(capacity) || 1));
  }
  return out;
}

export function resolveOptions(options = {}) {
  const merged = { ...DEFAULT_OPTIONS, ...options };
  if (!['host', 'server'].includes(merged.mode)) throw new Error(`network-kit: unknown mode "${merged.mode}"`);
  if (merged.mode === 'server' && !merged.rules) throw new Error('network-kit: server mode needs rules');
  merged.roles = resolveRoles(options.roles);
  merged.places = resolvePlaces(options.places);
  if (!own(merged.roles, merged.ownerRole)) {
    throw new Error(`network-kit: ownerRole "${merged.ownerRole}" is not one of the roles`);
  }
  // The owner runs the game from the start, so the owner's role can host unless the game says no.
  if (options.roles?.[merged.ownerRole]?.canHost === undefined) merged.roles[merged.ownerRole].canHost = true;
  // The role someone gets when joining an open room without a key.
  const open = Object.entries(merged.roles).filter(([, r]) => !r.needsKey);
  merged.defaultRole = (open.find(([, r]) => r.plays) ?? open[0] ?? [null])[0];
  return merged;
}

function cleanName(name, max) {
  const text = String(name ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  return text.slice(0, max) || 'Player';
}


const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10);

export class RoomCore {
  constructor(host, options) {
    this.host = host;
    this.options = resolveOptions(options);
    this.state = null;
    this.snapshot = null; // { d, at }
    this.snapshotLoaded = false;
    this.snapshotDirty = false;
    this.snapshotSavedAt = 0;
    this.cancelSave = null;
    this.buckets = new WeakMap(); // per-connection rate limit
    this.joiners = new WeakMap(); // per-connection parts of a large message
    this.partSeq = 0;
    this.hostCheck = null; // { id, cancel }: the host has been asked to show it is alive
    this.lastHostCheck = 0;
    this.uncounted = 0; // messages counted since the usage was last stored
    this.cancelUsageSave = null;
    this.dirty = false;
    this.alarmAt = null;
    this.heard = new WeakMap(); // socket → when a message last arrived (in memory)
    this.lastScan = 0;
  }

  // ---------------------------------------------------------------- storage

  async load() {
    this.state = (await this.host.storage.get('room')) ?? null;
    if (this.state && this.state.v !== STATE_VERSION) {
      // Stored by an earlier network-kit: carried over step by step where a
      // step is known (D-105), otherwise the room starts clean rather than guess.
      let state = this.state;
      while (state && state.v !== STATE_VERSION && STATE_MIGRATIONS[state.v]) state = STATE_MIGRATIONS[state.v](state);
      if (state?.v !== STATE_VERSION) {
        await this.deleteRoom();
        return;
      }
      this.state = state;
      await this.host.storage.put('room', this.state);
    }
    this.alarmAt = this.state ? this.nextTimerAt() : null;
  }

  async flush() {
    if (this.state && !this.state.closed) {
      this.syncHostPause();
      this.checkIdle();
      // A room nobody is connected to must always be on its way to being deleted.
      if (this.identifiedSockets().length === 0 && !this.hasTimer('cleanup')) {
        this.setTimer('cleanup', this.options.cleanupMs);
      }
    }
    if (this.dirty && this.state) {
      this.uncounted = 0;
      this.dirty = false;
      await this.host.storage.put('room', this.state);
    }
    const next = this.state ? this.nextTimerAt() : null;
    if (next !== this.alarmAt) {
      this.alarmAt = next;
      await this.host.setAlarm(next);
    }
  }

  touch() {
    this.dirty = true;
  }

  // The snapshot is stored as text in parts (F-036), so a large game state
  // never meets the platform's limit on one stored value:
  //   snapshot      { at, parts }      snapshot:0 … snapshot:N-1  text parts
  async getSnapshot() {
    if (!this.snapshotLoaded) {
      const record = (await this.host.storage.get('snapshot')) ?? null;
      if (record && 'd' in record) {
        this.snapshot = record; // stored whole by an earlier 0.x version
      } else if (record) {
        const texts = [];
        for (let i = 0; i < record.parts; i++) texts.push((await this.host.storage.get(`snapshot:${i}`)) ?? '');
        try {
          this.snapshot = { d: JSON.parse(texts.join('')), at: record.at };
        } catch {
          this.snapshot = null; // an incomplete save: better nothing than a broken state
        }
      }
      this.storedParts = record?.parts ?? 0;
      this.snapshotLoaded = true;
    }
    return this.snapshot;
  }

  async saveSnapshot() {
    this.cancelSave?.();
    this.cancelSave = null;
    if (!this.snapshotDirty || !this.snapshot || !this.state) return;
    this.snapshotDirty = false;
    this.snapshotSavedAt = this.host.now();
    const text = JSON.stringify(this.snapshot.d) ?? 'null';
    const parts = Math.max(1, Math.ceil(text.length / PART_CHARS));
    for (let i = 0; i < parts; i++) {
      await this.host.storage.put(`snapshot:${i}`, text.slice(i * PART_CHARS, (i + 1) * PART_CHARS));
    }
    await this.host.storage.put('snapshot', { at: this.snapshot.at, parts });
    for (let i = parts; i < (this.storedParts ?? 0); i++) await this.host.storage.delete(`snapshot:${i}`);
    this.storedParts = parts;
  }

  // State for newcomers (F-030): set by the host (or the rules), one shared and
  // optionally one per role, kept by the room and sent to everyone who joins
  // or comes back, right after the welcome. Stored in parts like the snapshot:
  //   welcome:<role|*>   { at, parts }   welcome:<role|*>:0 … text parts
  async getWelcomeState(role) {
    this.welcomeStates ??= new Map();
    if (!this.welcomeStates.has(role)) {
      const record = (await this.host.storage.get(`welcome:${role}`)) ?? null;
      let d;
      if (record) {
        const texts = [];
        for (let i = 0; i < record.parts; i++) texts.push((await this.host.storage.get(`welcome:${role}:${i}`)) ?? '');
        try {
          d = JSON.parse(texts.join(''));
        } catch {
          d = undefined;
        }
      }
      this.welcomeStates.set(role, { d, parts: record?.parts ?? 0, dirty: false });
    }
    return this.welcomeStates.get(role);
  }

  async setWelcomeState(role, d) {
    const entry = await this.getWelcomeState(role);
    entry.d = d === null ? undefined : d;
    entry.dirty = true;
    // Stored at most every snapshotSaveMs, like the snapshot, with a trailing save.
    const wait = (this.welcomeSavedAt ?? 0) + this.options.snapshotSaveMs - this.host.now();
    if (wait <= 0) await this.saveWelcomeStates();
    else this.cancelWelcomeSave ??= this.host.defer(wait, () => this.saveWelcomeStates());
  }

  async saveWelcomeStates() {
    this.cancelWelcomeSave?.();
    this.cancelWelcomeSave = null;
    if (!this.state || !this.welcomeStates) return;
    this.welcomeSavedAt = this.host.now();
    for (const [role, entry] of this.welcomeStates) {
      if (!entry.dirty) continue;
      entry.dirty = false;
      if (entry.d === undefined) {
        await this.host.storage.delete(`welcome:${role}`);
        for (let i = 0; i < entry.parts; i++) await this.host.storage.delete(`welcome:${role}:${i}`);
        entry.parts = 0;
        continue;
      }
      const text = JSON.stringify(entry.d);
      const parts = Math.max(1, Math.ceil(text.length / PART_CHARS));
      for (let i = 0; i < parts; i++) await this.host.storage.put(`welcome:${role}:${i}`, text.slice(i * PART_CHARS, (i + 1) * PART_CHARS));
      await this.host.storage.put(`welcome:${role}`, { at: this.host.now(), parts });
      for (let i = parts; i < entry.parts; i++) await this.host.storage.delete(`welcome:${role}:${i}`);
      entry.parts = parts;
    }
  }

  /** Send a participant the state for newcomers that fits their role, if there is one. */
  async sendWelcomeState(ws, p) {
    const forRole = await this.getWelcomeState(p.role);
    const entry = forRole.d !== undefined ? forRole : await this.getWelcomeState('*');
    if (entry.d !== undefined) this.sendJson(ws, { t: 'welcome-state', d: entry.d });
  }

  async dropWelcomeStates() {
    for (const role of [...Object.keys(this.options.roles), '*']) {
      const entry = await this.getWelcomeState(role);
      if (entry.d === undefined && entry.parts === 0) continue;
      entry.d = undefined;
      entry.dirty = true;
    }
    await this.saveWelcomeStates();
  }

  async dropSnapshot() {
    this.cancelSave?.();
    this.cancelSave = null;
    if (!this.snapshotLoaded) await this.getSnapshot(); // to know how many parts to remove
    this.snapshot = null;
    this.snapshotLoaded = true;
    this.snapshotDirty = false;
    await this.host.storage.delete('snapshot');
    for (let i = 0; i < (this.storedParts ?? 0); i++) await this.host.storage.delete(`snapshot:${i}`);
    this.storedParts = 0;
  }

  // ----------------------------------------------------------------- timers

  nextTimerAt() {
    let next = null;
    for (const t of this.state.timers) if (next === null || t.at < next) next = t.at;
    return next;
  }

  hasTimer(kind) {
    return this.state.timers.some((t) => t.kind === kind);
  }

  /** Set a timer; replaces one of the same kind (and the same key, if it has one). */
  setTimer(kind, delayMs, key = null) {
    this.clearTimer(kind, key);
    this.state.timers.push({ kind, key, at: this.host.now() + delayMs });
    this.touch();
  }

  /** Clear timers of a kind; `key` null clears every timer of that kind. */
  clearTimer(kind, key = null) {
    const before = this.state.timers.length;
    this.state.timers = this.state.timers.filter((t) => !(t.kind === kind && (key === null || t.key === key)));
    if (this.state.timers.length !== before) this.touch();
  }

  async alarm() {
    if (!this.state) return;
    const now = this.host.now();
    const due = this.state.timers.filter((t) => t.at <= now);
    this.state.timers = this.state.timers.filter((t) => t.at > now);
    this.alarmAt = null; // the platform cleared it by firing
    this.touch();
    if (this.state.closed) {
      // A closed room only waits to be forgotten.
      if (due.some((t) => t.kind === 'cleanup')) await this.deleteRoom();
    } else {
      await this.findSilent();
      await this.checkStopped();
      for (const timer of due) {
        if (!this.state || this.state.closed) break; // closed or deleted by an earlier timer
        await this.runTimer(timer);
      }
    }
    if (this.state) await this.flush();
  }

  async runTimer(timer) {
    const s = this.state;
    switch (timer.kind) {
      case 'grace': {
        const p = this.player(timer.key);
        if (p && p.status === 'away') await this.removePlayer(p, 'gone');
        break;
      }
      case 'autopause': {
        const p = this.player(timer.key);
        if (p && p.status === 'away' && !s.paused && this.inGame()) {
          s.paused = { reason: 'player-away', id: p.id, at: this.host.now() };
          this.broadcastRoom();
        }
        break;
      }
      case 'takeover': {
        const hostPlayer = this.player(s.hostId);
        if (!hostPlayer || hostPlayer.status === 'away') await this.takeOver();
        break;
      }
      case 'hostaway': {
        const hostPlayer = this.player(s.hostId);
        if (!hostPlayer || hostPlayer.status === 'away') await this.closeRoom('host-away');
        break;
      }
      case 'ownerpass': {
        const owner = this.player(s.ownerId);
        if (!owner || owner.status === 'away') await this.passOwner();
        break;
      }
      case 'idle': {
        // Every page in the room has been hidden all this time: nobody is playing (F-032).
        if (this.everyoneHidden()) await this.closeRoom('idle');
        break;
      }
      case 'cleanup': {
        if (this.identifiedSockets().length === 0) await this.deleteRoom();
        break;
      }
      case 'lobby-end': {
        await this.closeRoom('lobby-ended');
        break;
      }
      case 'rules': {
        await this.callRules('onTimer', timer.key);
        break;
      }
    }
  }

  /** True when someone is connected and every connected page is hidden. */
  everyoneHidden() {
    const online = Object.values(this.state.players).filter((p) => p.status === 'online');
    return online.length > 0 && online.every((p) => p.hidden === true);
  }

  /** A room whose pages are all hidden (forgotten tabs) closes after idleCloseMs (F-032). */
  checkIdle() {
    if (!this.options.idleCloseMs) return;
    if (this.everyoneHidden()) {
      if (!this.hasTimer('idle')) this.setTimer('idle', this.options.idleCloseMs);
    } else if (this.hasTimer('idle')) {
      this.clearTimer('idle');
    }
  }

  // ------------------------------------------------------------------ rooms

  /**
   * Create the room. `open`: created by the game's server for an invitation,
   * without a participating creator: the first participant who may lead
   * becomes owner (and host) (F-029).
   */
  async create(settings = {}, code, { open = false, pass = null, lobbyEnds = null } = {}) {
    if (this.state && !this.state.closed) return { error: 'exists' };
    const o = this.options;
    const access = settings?.access === 'private' || settings?.access === 'open' ? settings.access : o.access;
    const lateJoin = o.lateJoinChoices.includes(settings?.lateJoin) ? settings.lateJoin : o.lateJoin;
    const now = this.host.now();
    const keys = {};
    for (const role of Object.keys(o.roles)) keys[role] = { k: newSecret(), exp: null };
    this.state = {
      v: STATE_VERSION,
      code,
      createdAt: now,
      closed: null,
      settings: { access, lateJoin },
      ownerKey: newSecret(),
      ownerId: null,
      ownerOpen: Boolean(open), // true: ownership is free for the next eligible participant
      hostId: null,
      hostEver: false,
      hostPending: o.mode === 'host', // the host has not confirmed that it runs the game
      keys,
      phase: 'lobby',
      round: 0,
      seed: null,
      startsAt: null,
      paused: null,
      players: {},
      known: {}, // player-key hash → { id, sid, lastN, role, admitted, at }
      bans: [], // player-key hashes that may not come back
      banList: {}, // hash → { id, name, at }: who was banned, for the owner's list (F-031)
      timers: [],
      usage: { day: utcDay(now), n: 0 },
      data: null, // small shared data set by the host, the owner or the rules; everyone sees it
      game: null,
    };
    // A lobby made on the admin page (F-059): its link opens the room while the
    // game takes no new players, and the room closes when the lobby ends.
    if (typeof pass === 'string' && pass && Number.isFinite(lobbyEnds) && lobbyEnds > now) {
      this.state.pass = pass.slice(0, 100);
      this.state.lobbyEnds = lobbyEnds;
    }
    await this.dropSnapshot();
    await this.dropWelcomeStates();
    this.setTimer('cleanup', o.cleanupMs);
    if (this.state.lobbyEnds) this.setTimer('lobby-end', this.state.lobbyEnds - now);
    if (o.mode === 'server') this.state.game = (await this.callRules('init')) ?? null;
    this.touch();
    await this.flush();
    if (open) return { code, keys: this.publicKeys() };
    return { code, ownerKey: this.state.ownerKey, keys: this.publicKeys() };
  }

  info() {
    if (!this.state) return null;
    const counts = {};
    for (const role of Object.keys(this.options.roles)) counts[role] = 0;
    for (const p of Object.values(this.state.players)) counts[p.role] = (counts[p.role] ?? 0) + 1;
    return {
      code: this.state.code,
      closed: Boolean(this.state.closed),
      phase: this.currentPhase(),
      access: this.state.settings.access,
      participants: counts,
    };
  }

  currentPhase() {
    const s = this.state;
    if (s.phase === 'countdown' && s.startsAt !== null && this.host.now() >= s.startsAt) s.phase = 'playing';
    return s.phase;
  }

  inGame() {
    const phase = this.currentPhase();
    return phase === 'countdown' || phase === 'playing';
  }

  publicKeys() {
    const out = {};
    for (const [role, key] of Object.entries(this.state.keys)) out[role] = { ...key };
    return out;
  }

  async closeRoom(reason, code = CLOSE.ROOM_CLOSED) {
    const s = this.state;
    s.closed = { reason, at: this.host.now() };
    s.timers = [];
    this.cancelHostCheck();
    this.touch();
    const text = JSON.stringify({ t: 'closed', reason });
    for (const ws of this.liveSockets()) {
      this.host.send(ws, text);
      this.shut(ws, code, reason);
    }
    await this.dropSnapshot();
    this.setTimer('cleanup', this.options.closedKeepMs);
  }

  async deleteRoom() {
    for (const ws of this.liveSockets()) this.shut(ws, CLOSE.ROOM_CLOSED, 'expired');
    this.cancelHostCheck();
    this.cancelUsageSave?.();
    this.cancelUsageSave = null;
    this.cancelSave?.();
    this.cancelSave = null;
    this.state = null;
    this.welcomeStates = null;
    this.cancelWelcomeSave?.();
    this.cancelWelcomeSave = null;
    this.snapshot = null;
    this.snapshotLoaded = true;
    this.snapshotDirty = false;
    this.dirty = false;
    this.alarmAt = null;
    await this.host.storage.deleteAll();
    await this.host.setAlarm(null);
  }

  // ---------------------------------------------------------------- sockets

  liveSockets() {
    return this.host.sockets().filter((ws) => {
      const att = this.host.getAttachment(ws);
      return att && !att.closed;
    });
  }

  identifiedSockets() {
    return this.liveSockets().filter((ws) => this.host.getAttachment(ws).id);
  }

  socketsOf(id) {
    return this.liveSockets().filter((ws) => this.host.getAttachment(ws).id === id);
  }

  player(id) {
    return own(this.state.players, id) ? this.state.players[id] : null;
  }

  role(p) {
    return this.options.roles[p.role] ?? { seats: 0, plays: false, canPause: false, canHost: false, sends: false };
  }

  /** Send a text, in parts if it is large (F-036). */
  deliver(ws, text) {
    if (text.length <= PART_CHARS) {
      this.host.send(ws, text);
      return;
    }
    this.partSeq += 1;
    for (const part of splitIntoParts(text, this.partSeq)) this.host.send(ws, part);
  }

  sendTo(id, text) {
    for (const ws of this.socketsOf(id)) this.deliver(ws, text);
  }

  sendJson(ws, msg) {
    this.deliver(ws, JSON.stringify(msg));
  }

  /** Close a socket from our side and remember that it no longer counts. */
  shut(ws, code, reason) {
    this.host.setAttachment(ws, { ...(this.host.getAttachment(ws) || {}), closed: true });
    this.host.close(ws, code, reason);
  }

  reject(ws, code, reason, extra = {}) {
    this.sendJson(ws, { t: 'denied', code, reason, ...extra });
    this.shut(ws, code, reason);
  }

  /** A new WebSocket was accepted; it must send "hello" first. */
  opened(ws) {
    this.host.setAttachment(ws, { id: null, n: 0, at: this.host.now() });
    if (!this.state || this.state.closed) {
      const closed = this.state?.closed;
      if (closed) this.sendJson(ws, { t: 'closed', reason: closed.reason });
      this.shut(ws, closed ? CLOSE.ROOM_CLOSED : CLOSE.NOT_FOUND, closed ? closed.reason : 'not-found');
      return;
    }
    // Connections that never introduce themselves must not pile up.
    const pending = this.liveSockets()
      .filter((other) => !this.host.getAttachment(other).id)
      .sort((a, b) => this.host.getAttachment(a).at - this.host.getAttachment(b).at);
    while (pending.length > this.options.maxPendingSockets) {
      this.shut(pending.shift(), CLOSE.BAD_REQUEST, 'too-many-connections');
    }
  }

  /**
   * Participants whose connection died without closing (wifi gone, phone in a
   * tunnel) are found by their heartbeat (F-051): a socket that has sent
   * nothing, not even a heartbeat, for 2.5 heartbeats is closed as
   * unresponsive and the participant counts as dropped. Checked at most once a
   * second while messages arrive, and when a timer fires: it costs nothing extra.
   */
  async findSilent() {
    const beat = this.options.heartbeatMs;
    if (!beat || !this.state || this.state.closed) return;
    const now = this.host.now();
    if (now - this.lastScan < 1000) return;
    this.lastScan = now;
    const limit = beat * 2.5;
    for (const ws of this.identifiedSockets()) {
      const att = this.host.getAttachment(ws);
      const heard = Math.max(att.at ?? 0, this.heard.get(ws) ?? 0, this.host.lastPingAt?.(ws) ?? 0);
      if (now - heard <= limit) continue;
      this.shut(ws, CLOSE_UNRESPONSIVE, 'unresponsive');
      await this.closed(ws, true);
      if (!this.state || this.state.closed) return;
    }
  }

  /** Per-connection rate limit; false when the connection sends too fast. */
  allow(ws) {
    const rate = this.options.maxMessagesPerSecond;
    if (!rate) return true;
    const now = this.host.now();
    let bucket = this.buckets.get(ws);
    if (!bucket) {
      bucket = { tokens: rate * 2, at: now };
      this.buckets.set(ws, bucket);
    }
    bucket.tokens = Math.min(rate * 2, bucket.tokens + ((now - bucket.at) / 1000) * rate);
    bucket.at = now;
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }

  /**
   * Messages that are refused or ignored cost the connection extra, so that
   * sending them in bulk closes that connection instead of using up the room.
   */
  penalize(ws, cost) {
    const bucket = this.buckets.get(ws);
    if (bucket) bucket.tokens -= cost;
  }

  /** Count a message against the room's daily budget; false when it is used up. */
  count() {
    const s = this.state;
    const o = this.options;
    const now = this.host.now();
    const day = utcDay(now);
    if (s.usage.day !== day) s.usage = { day, n: 0, minutes: 0, minute: 0 };
    s.usage.n += 1;
    const minute = Math.floor(now / 60_000);
    if (s.usage.minute !== minute) {
      s.usage.minute = minute;
      s.usage.minutes = (s.usage.minutes ?? 0) + 1;
    }
    // Stored now and then, and once more before a room that goes quiet sleeps.
    this.uncounted += 1;
    if (this.uncounted >= USAGE_SAVE_EVERY) {
      this.touch();
    } else if (this.uncounted >= USAGE_SAVE_SOON && !this.cancelUsageSave) {
      this.cancelUsageSave = this.host.defer(10_000, async () => {
        this.cancelUsageSave = null;
        if (!this.state || this.uncounted === 0) return;
        this.touch();
        await this.flush();
      });
    }
    if (o.maxMessagesPerDay && s.usage.n > o.maxMessagesPerDay) return false;
    if (o.maxActiveMinutesPerDay && s.usage.minutes > o.maxActiveMinutesPerDay) return false;
    return true;
  }

  /** May this participant's game messages reach the host or the rules? */
  maySend(p) {
    return p.id === this.state.hostId || (!p.waiting && this.role(p).sends);
  }

  async message(ws, raw, joined = false) {
    if (!this.state || this.state.closed) return;
    const att = this.host.getAttachment(ws);
    if (!att || att.closed) return;
    this.heard.set(ws, this.host.now());
    await this.findSilent();
    await this.checkStopped();
    if (!this.state || this.state.closed) return;
    const size = byteLength(raw);
    let msg = null;
    if (size <= this.options.maxSnapshotBytes) {
      try {
        msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
      } catch {
        msg = null;
      }
    }
    const valid = msg !== null && typeof msg === 'object' && !Array.isArray(msg);

    if (!att.id) {
      // Not introduced yet: the only thing accepted is a proper hello.
      if (!valid || msg.t !== 'hello') return this.reject(ws, CLOSE.BAD_REQUEST, 'hello-first');
      await this.hello(ws, msg);
      if (this.state) await this.flush();
      return;
    }

    // A joined large message was paid for part by part.
    if (!joined && !this.allow(ws)) {
      this.reject(ws, CLOSE.RATE, 'too-many-messages');
      await this.closed(ws, true);
      return;
    }
    if (valid && msg.t === 'part' && !joined) {
      // Parts of a large message (F-036): joined here, then handled as one message.
      let joiner = this.joiners.get(ws);
      if (!joiner) {
        joiner = new PartJoiner(this.options.maxSnapshotBytes);
        this.joiners.set(ws, joiner);
      }
      let text;
      try {
        text = joiner.add(msg);
      } catch (err) {
        this.penalize(ws, 5);
        return this.sendJson(ws, { t: 'err', code: err.message === 'too large' ? 'too-large' : 'bad-part' });
      }
      if (text !== null) await this.message(ws, text, true);
      return;
    }
    if (!valid) {
      this.penalize(ws, 5);
      return this.sendJson(ws, { t: 'err', code: size > this.options.maxSnapshotBytes ? 'too-large' : 'bad-json' });
    }

    const player = this.player(att.id);
    if (!player) return this.reject(ws, CLOSE.KICKED, 'not-in-room');

    // Duplicate protection: a numbered message resent after a glitch counts once.
    if (msg.n !== undefined) {
      if (!Number.isSafeInteger(msg.n) || msg.n <= att.n) return;
      att.n = msg.n;
      player.lastN = msg.n;
      this.host.setAttachment(ws, att);
    }

    // Any sign of life from a host that was asked to answer is an answer.
    if (this.hostCheck && player.id === this.hostCheck.id) this.cancelHostCheck();

    // Response time for the rules (F-076): the page's answer to a probe, and now and then a new probe.
    if (msg.t === 'probe') {
      this.probed(player.id, msg.n);
      return;
    }
    this.probe(ws, player.id);

    const isSnap = msg.t === 'snap' && this.options.mode === 'host' && player.id === this.state.hostId;
    const isWelcomeState = msg.t === 'welcome-state' && this.options.mode === 'host' && player.id === this.state.hostId;
    if (msg.t === 'msg' && size > this.options.maxMessageBytes) {
      this.penalize(ws, 5);
      this.sendJson(ws, { t: 'err', code: 'too-large', n: msg.n });
    } else if ((msg.t === 'msg' && this.maySend(player)) || isSnap || isWelcomeState || msg.t === 'cmd') {
      if (!this.count()) {
        await this.closeRoom('room-budget', CLOSE.BUDGET);
        await this.flush();
        return;
      }
      if (msg.t === 'msg' && (await this.aloneTooLong(player))) return;
      if (msg.t === 'msg') await this.relay(player, msg);
      else if (isSnap) await this.storeSnapshot(player, msg);
      else if (isWelcomeState) {
        const role = typeof msg.role === 'string' && own(this.options.roles, msg.role) ? msg.role : '*';
        await this.setWelcomeState(role, msg.d ?? null);
      }
      else await this.command(ws, player, msg);
    } else {
      // Not something this participant may send: it costs them, not the room.
      this.penalize(ws, 10);
    }
    if (this.state) await this.flush();
  }

  /** A socket closed (or was closed by us with `force`). */
  async closed(ws, force = false) {
    const att = this.host.getAttachment(ws);
    if (!att || (att.closed && !force)) return;
    att.closed = true;
    this.host.setAttachment(ws, att);
    if (!this.state || this.state.closed || !att.id) return;
    const p = this.player(att.id);
    if (p && att.sid === p.sid && att.n > p.lastN) {
      p.lastN = att.n; // keep duplicate protection across hibernation
      this.touch();
    }
    if (p && this.socketsOf(p.id).length === 0) await this.dropped(p);
    if (this.state && this.identifiedSockets().length === 0) this.setTimer('cleanup', this.options.cleanupMs);
    if (this.state) await this.flush();
  }

  // ------------------------------------------------------------------ hello

  async hello(ws, msg) {
    const s = this.state;
    const o = this.options;
    if (msg.v !== PROTOCOL) return this.reject(ws, CLOSE.VERSION, 'version');
    if (typeof msg.pk !== 'string' || msg.pk.length < 16 || msg.pk.length > 128) {
      return this.reject(ws, CLOSE.BAD_REQUEST, 'player-key');
    }
    if (typeof msg.sid !== 'string' || msg.sid.length < 1 || msg.sid.length > 64) {
      return this.reject(ws, CLOSE.BAD_REQUEST, 'session');
    }
    const pkh = await sha256(msg.pk);
    if (s.bans.includes(pkh)) return this.reject(ws, CLOSE.BANNED, 'banned');

    const now = this.host.now();
    const name = cleanName(msg.name, o.nameMaxLength);
    const known = own(s.known, pkh) ? s.known[pkh] : null;
    let player = known ? this.player(known.id) : null;

    // The owner key makes its holder the owner, unless the owner's seat is in
    // use by another connected identity: then this is a second window of the
    // owner's own browser, and it joins like anyone else.
    const ownerSeat = this.player(s.ownerId);
    const isOwner = sameSecret(msg.owner, s.ownerKey)
      && (!ownerSeat || ownerSeat === player || ownerSeat.status === 'away');
    if (isOwner && ownerSeat && !player) {
      // The owner came back on another device while the old seat was still
      // held: the seat (id, place, host role) is theirs, under the new identity.
      delete s.known[ownerSeat.pkh];
      ownerSeat.pkh = pkh;
      ownerSeat.sid = null; // this device does not have the game: like a reloaded page
      player = ownerSeat;
    }
    // The owner had another seat already and now claims the room from this one.
    const oldOwnerSeat = isOwner && ownerSeat && ownerSeat !== player ? ownerSeat : null;
    const isNew = !player;
    let returning = false;
    let reloaded = false;

    if (isNew && s.lobbyEnds && !(await this.checkLobby())) return this.reject(ws, CLOSE.ROOM_CLOSED, 'lobby-ended');
    if (isNew) {
      // Which role? The owner key first, then a valid invitation key, then a
      // seat held before, then (open rooms only) what the client asks for.
      const standing = known && !known.out && own(o.roles, known.role) ? known : null;
      // A newcomer asks the admin page; the owner and those who were already
      // in this room come back whatever it says, so admitted games finish (F-003).
      const word = !isOwner && !standing ? await this.admission() : null;
      // A game link lets its holder in while the game takes no new players, but not after a stop
      // (F-058); so does an invitation to a room that was made with a valid game link (F-068).
      const closed = word && !word.open;
      const admin = closed && !word.stopped && (await this.isAdminPass(msg.adminPass));
      const invited = closed && !admin && !word.stopped && s.pass && this.validKey(msg.key, now) && (await this.isAdminPass(s.pass, { lobby: true }));
      if (closed && !admin && !invited) return this.reject(ws, CLOSE.GAME_CLOSED, word.reason ?? 'off', { until: word.until ?? null });
      let role = null;
      let admitted = false;
      if (isOwner) {
        role = o.ownerRole;
        admitted = true;
      } else {
        let expired = false;
        for (const [keyRole, key] of Object.entries(s.keys)) {
          if (!sameSecret(msg.key, key.k)) continue;
          if (key.exp !== null && key.exp <= now) expired = true;
          else role = keyRole;
        }
        const open = s.settings.access === 'open';
        const wanted = own(o.roles, msg.role) ? msg.role : null;
        const asked = open && wanted && !o.roles[wanted].needsKey ? wanted : null;
        if (!role && standing) role = asked ?? standing.role; // was here before: no key needed
        if (!role && expired) return this.reject(ws, CLOSE.KEY, 'key-expired');
        if (!role) {
          if (!open) {
            return this.reject(ws, CLOSE.KEY, typeof msg.key === 'string' && msg.key ? 'key-invalid' : 'key-required');
          }
          // A role with its own link cannot be picked by name.
          if (wanted && o.roles[wanted].needsKey) return this.reject(ws, CLOSE.KEY, 'key-required');
          role = asked ?? o.defaultRole;
          if (!role) return this.reject(ws, CLOSE.KEY, 'key-required');
        }
        // Back in the round they were part of: not a late joiner.
        admitted = Boolean(standing && standing.role === role && standing.admitted && standing.round === s.round);
      }
      const def = o.roles[role];
      const taken = Object.values(s.players).filter((p) => p.role === role).length;
      if (!isOwner && taken >= def.seats) return this.reject(ws, CLOSE.FULL, 'full');
      let waiting = false;
      if (def.plays && this.inGame() && !admitted) {
        if (s.settings.lateJoin === 'never') return this.reject(ws, CLOSE.IN_PROGRESS, 'in-progress');
        waiting = s.settings.lateJoin === 'next';
      }
      let id = known?.id;
      const usedIds = new Set(Object.values(s.known).map((k) => k.id));
      if (!id || this.player(id)) {
        do id = newPlayerId();
        while (this.player(id) || usedIds.has(id));
      }
      player = {
        id, pkh, name, role, waiting, status: 'online', place: null, joinedAt: now, awaySince: null,
        sid: msg.sid, lastN: known && known.sid === msg.sid ? known.lastN : 0,
      };
      // Back after the grace period: the same participant as before (B-044).
      returning = Boolean(standing && standing.id === id && standing.role === role);
      // Their place is given back if nobody has taken it meanwhile.
      const place = returning && !waiting ? standing.place : null;
      if (place && own(o.places, place)
        && Object.values(s.players).filter((p) => p.place === place).length < o.places[place]) {
        player.place = place;
      }
      s.players[id] = player;
    } else {
      // The same participant connected again: the newest connection wins.
      let lastN = player.lastN;
      for (const other of this.socketsOf(player.id)) {
        if (other === ws) continue;
        const oatt = this.host.getAttachment(other);
        if (oatt.sid === player.sid && oatt.n > lastN) lastN = oatt.n;
        this.shut(other, CLOSE.REPLACED, 'replaced');
      }
      player.status = 'online';
      player.awaySince = null;
      player.name = name;
      if (player.sid === msg.sid) {
        player.lastN = lastN;
      } else {
        player.sid = msg.sid; // the page was reloaded: its numbering starts again
        player.lastN = 0;
        reloaded = true;
      }
      this.clearTimer('grace', player.id);
      this.clearTimer('autopause', player.id);
    }

    player.hidden = msg.hidden === true; // the page is in the background (F-032)
    if (typeof msg.adminPass === 'string') {
      const pass = msg.adminPass.slice(0, 100);
      (this.adminPasses ??= new WeakMap()).set(ws, pass);
      // The owner's room made with a game link: its invitations get past "no new players" (F-068).
      // The owner key counts on the very first hello too, before the room has recorded its owner (B-080).
      if ((isOwner || player.id === s.ownerId) && !s.lobbyEnds && s.pass !== pass && (await this.isAdminPass(pass))) s.pass = pass;
    }
    this.remember(player);
    this.host.setAttachment(ws, { id: player.id, n: player.lastN, sid: player.sid, at: now });
    this.clearTimer('cleanup');
    this.touch();

    // Ownership: the owner key wins; otherwise ownership may be free.
    if (isOwner) {
      if (oldOwnerSeat && s.hostId === oldOwnerSeat.id) {
        s.hostId = player.id;
        s.hostPending = true; // this seat does not have the game yet
      }
      s.ownerId = player.id;
      s.ownerOpen = false;
    } else if (s.ownerOpen && !this.player(s.ownerId) && this.canLead(player)) {
      await this.giveOwner(player, true);
    } else if (player.id === s.ownerId) {
      // The owner without the current key (it was renewed and may not have arrived).
      this.sendJson(ws, { t: 'owner', key: s.ownerKey });
    }
    if (player.id === s.ownerId) this.clearTimer('ownerpass');
    if (o.mode === 'server') s.hostId = s.ownerId;

    // Host seat (host-run rooms).
    let tookOver = false;
    if (o.mode === 'host') {
      const hostPlayer = this.player(s.hostId);
      if (!hostPlayer && player.id === s.ownerId) {
        s.hostId = player.id; // the owner runs the game until someone else does
        s.hostEver = true;
        s.hostPending = true;
      } else if (o.takeover && s.hostEver && this.inGame() && this.canHost(player) && !this.hasTimer('takeover')
        && (!hostPlayer || hostPlayer.status === 'away')) {
        tookOver = true; // a game is running, the host is missing and nobody is waiting to take over
      } else if (player.id === s.ownerId && hostPlayer && hostPlayer.id !== player.id && !this.inGame()
        && this.canHost(player)) {
        // The owner is back between games: the owner's browser runs the next one (B-034).
        tookOver = true;
      }
      if (player.id === s.hostId) {
        this.clearTimer('takeover');
        this.clearTimer('hostaway');
        if (reloaded) s.hostPending = true; // a reloaded page has lost the game it was running
        if (s.paused?.reason === 'host-away') {
          if (s.hostPending) s.paused = { ...s.paused, reason: 'host-change' };
          else s.paused = null;
        }
      }
    }
    this.liftAutoPause();

    this.sendJson(ws, {
      t: 'welcome',
      you: { id: player.id, role: player.role },
      lastN: player.lastN,
      room: this.view(player.id),
    });
    await this.sendWelcomeState(ws, player);

    if (tookOver) {
      await this.takeOver(player.id);
    } else {
      this.broadcastRoom();
      // Repeated on every hello until the host confirms with host-ready.
      if (o.mode === 'host' && player.id === s.hostId && s.hostPending) await this.sendHost(player.id);
    }
    // After the room's new list, so the others already know who it is (B-043).
    const about = { name: player.name, ...(returning ? { returning: true } : {}) };
    if (isNew) this.event(player.waiting ? 'waiting' : 'join', player.id, about);
    else this.event('back', player.id, about);

    if (oldOwnerSeat) await this.removePlayer(oldOwnerSeat, 'moved');

    if (o.mode === 'server') {
      if (isNew && !player.waiting) await this.callRules('onJoin', this.rulesPlayer(player));
      if (!isNew) await this.callRules('onBack', this.rulesPlayer(player));
    }
  }

  /** Remember a participant so they can return after the grace period. */
  remember(p) {
    const s = this.state;
    s.known[p.pkh] = {
      id: p.id, sid: p.sid, lastN: p.lastN, role: p.role, place: p.place ?? null, name: p.name,
      admitted: !p.waiting, round: s.round, at: this.host.now(),
    };
    const entries = Object.entries(s.known);
    if (entries.length > KNOWN_MAX) {
      entries.sort((a, b) => a[1].at - b[1].at);
      for (const [key, value] of entries) {
        if (Object.keys(s.known).length <= KNOWN_MAX) break;
        if (!this.player(value.id)) delete s.known[key];
      }
    }
  }

  canHost(p) {
    return Boolean(p) && this.role(p).canHost && !p.waiting && p.status === 'online';
  }

  /** May this participant receive ownership when it is passed on? */
  canLead(p) {
    return this.canHost(p);
  }

  async dropped(p) {
    const s = this.state;
    const o = this.options;
    if (p.status === 'away') return;
    p.status = 'away';
    p.awaySince = this.host.now();
    this.remember(p);
    this.setTimer('grace', o.graceMs, p.id);
    if (o.autoPauseMs !== null && this.role(p).plays && !p.waiting && this.inGame()) {
      this.setTimer('autopause', o.autoPauseMs, p.id);
    }
    if (p.id === s.ownerId && o.passOwnerAfterMs !== null) this.setTimer('ownerpass', o.passOwnerAfterMs);
    if (o.mode === 'host' && p.id === s.hostId) {
      await this.saveSnapshot();
      this.cancelHostCheck();
      if (this.inGame() && !s.paused) s.paused = { reason: 'host-away', id: p.id, at: this.host.now() };
      // Only a running game needs someone to continue it; in the lobby and
      // between rounds the room waits for the host (B-034).
      if (o.takeover && this.inGame()) this.setTimer('takeover', o.takeoverMs);
      else if (o.closeAfterHostAwayMs !== null) this.setTimer('hostaway', o.closeAfterHostAwayMs);
    }
    this.touch();
    this.event('drop', p.id, { name: p.name });
    this.broadcastRoom();
    if (o.mode === 'server') await this.callRules('onDrop', this.rulesPlayer(p));
  }

  async removePlayer(p, why) {
    const s = this.state;
    const o = this.options;
    this.remember(p);
    // Only someone whose connection was lost keeps their standing; the others
    // get the same id if they are let in again, but need a way in like anyone.
    if (why === 'banned') delete s.known[p.pkh];
    else if (why !== 'gone') s.known[p.pkh].out = true;
    delete s.players[p.id];
    this.clearTimer('grace', p.id);
    this.clearTimer('autopause', p.id);
    this.touch();
    this.event('gone', p.id, { why, name: p.name });
    if (p.id === s.ownerId) {
      s.ownerId = null; // the owner is absent; the owner key still brings them back
      if (o.passOwnerAfterMs !== null && !this.hasTimer('ownerpass')) this.setTimer('ownerpass', o.passOwnerAfterMs);
    }
    if (o.mode === 'server') s.hostId = s.ownerId;
    this.liftAutoPause();
    if (o.mode === 'host' && p.id === s.hostId) {
      s.hostId = null;
      this.clearTimer('takeover');
      this.cancelHostCheck();
      const owner = this.player(s.ownerId);
      if (o.takeover || this.canHost(owner)) {
        // Without takeover only the owner may pick the game up again.
        if (!(await this.takeOver(o.takeover ? null : owner.id))) this.broadcastRoom();
      } else {
        if (this.inGame() && !s.paused) s.paused = { reason: 'host-away', id: null, at: this.host.now() };
        if (o.closeAfterHostAwayMs !== null && !this.hasTimer('hostaway')) {
          this.setTimer('hostaway', o.closeAfterHostAwayMs);
        }
        this.broadcastRoom();
      }
    } else {
      this.broadcastRoom();
    }
    if (o.mode === 'server') await this.callRules('onGone', this.rulesPlayer(p));
  }

  /**
   * Give the host role to another participant: `preferId` if eligible, else
   * the owner, else whoever has been here longest. Returns false when nobody
   * can host now (the next eligible participant to connect will).
   */
  async takeOver(preferId = null) {
    const s = this.state;
    this.clearTimer('takeover');
    // The host's preferred order first (F-040), then the owner, then whoever has been here longest.
    const preferred = Array.isArray(s.successors) ? s.successors : [];
    const rank = (p) => {
      const i = preferred.indexOf(p.id);
      return i === -1 ? Infinity : i;
    };
    const candidates = Object.values(s.players)
      .filter((p) => p.id !== s.hostId && this.canHost(p))
      .sort((a, b) => rank(a) - rank(b) || (b.id === s.ownerId) - (a.id === s.ownerId) || a.joinedAt - b.joinedAt);
    const next = (preferId && candidates.find((p) => p.id === preferId)) || (preferId ? null : candidates[0]);
    if (!next) return false;
    await this.saveSnapshot();
    s.hostId = next.id;
    s.hostEver = true;
    s.hostPending = true;
    this.clearTimer('hostaway');
    this.cancelHostCheck();
    if (this.inGame() && (!s.paused || s.paused.reason === 'host-away')) {
      s.paused = { reason: 'host-change', id: next.id, at: this.host.now() };
    } else if (s.paused?.reason === 'host-away') {
      s.paused = null;
    }
    this.touch();
    this.event('host', next.id, { name: next.name });
    this.broadcastRoom();
    await this.sendHost(next.id);
    return true;
  }

  /**
   * Tell the host that it runs the game, with the latest state to continue
   * from, and ask it to show that it is there: a host that was picked while
   * its phone was asleep must not leave everyone waiting.
   */
  async sendHost(id) {
    const snapshot = await this.getSnapshot();
    this.sendTo(id, JSON.stringify({ t: 'host', snapshot: snapshot?.d ?? null }));
    this.startHostCheck(id);
  }

  /** Ask the host to answer within hostCheckMs. Kept in memory: no storage writes. */
  startHostCheck(id) {
    this.cancelHostCheck();
    this.sendTo(id, JSON.stringify({ t: 'check' }));
    const cancel = this.host.defer(this.options.hostCheckMs, () => this.hostUnresponsive(id));
    this.hostCheck = { id, cancel };
  }

  cancelHostCheck() {
    this.hostCheck?.cancel();
    this.hostCheck = null;
  }

  /** The host did not answer in time: its connection is dead, whatever it looks like. */
  async hostUnresponsive(id) {
    this.hostCheck = null;
    const s = this.state;
    if (!s || s.closed) return;
    const p = this.player(id);
    if (!p || p.id !== s.hostId || p.status !== 'online') return;
    for (const ws of this.socketsOf(id)) {
      this.shut(ws, CLOSE_UNRESPONSIVE, 'unresponsive');
      await this.closed(ws, true);
    }
    if (this.state && this.options.takeover) await this.takeOver();
    if (this.state) await this.flush();
  }

  /**
   * Give ownership (and a fresh owner key) to a participant. `auto`: not by
   * the owner's own choice. Without takeover the game said that nobody else
   * may continue its state, so the kept state does not pass on with the room.
   */
  async giveOwner(p, auto = false) {
    const s = this.state;
    if (auto && !this.options.takeover && this.options.mode === 'host') await this.dropSnapshot();
    s.ownerKey = newSecret();
    s.ownerId = p.id;
    s.ownerOpen = false;
    this.clearTimer('ownerpass');
    if (this.options.mode === 'server') s.hostId = p.id;
    this.touch();
    this.sendTo(p.id, JSON.stringify({ t: 'owner', key: s.ownerKey }));
    this.event('owner', p.id, { name: p.name });
  }

  /** Pass ownership on: to the host if there is one, else to whoever has been here longest. */
  async passOwner(exceptId = null) {
    const s = this.state;
    const hostPlayer = this.player(s.hostId);
    const candidates = Object.values(s.players)
      .filter((p) => p.id !== exceptId && p.id !== s.ownerId && this.canLead(p))
      .sort((a, b) => a.joinedAt - b.joinedAt);
    const next = (hostPlayer && candidates.find((p) => p.id === hostPlayer.id)) || candidates[0];
    if (!next) {
      s.ownerOpen = true; // the next eligible participant to connect becomes the owner
      this.touch();
      return false;
    }
    await this.giveOwner(next, true);
    // A room without a host gets one in its new owner.
    if (this.options.mode === 'host' && !this.player(s.hostId) && (await this.takeOver(next.id))) return true;
    this.broadcastRoom();
    return true;
  }

  /** A host-run game is never left "running" while nobody runs it. */
  syncHostPause() {
    const s = this.state;
    if (this.options.mode !== 'host') return;
    const hostPlayer = this.player(s.hostId);
    const missing = !hostPlayer || hostPlayer.status === 'away';
    if (this.inGame() && missing && !s.paused) {
      s.paused = { reason: 'host-away', id: s.hostId, at: this.host.now() };
      this.touch();
    }
  }

  /** Lift an automatic "player away" pause when nobody is away that long any more. */
  liftAutoPause() {
    const s = this.state;
    if (s.paused?.reason !== 'player-away') return;
    const limit = this.options.autoPauseMs;
    const now = this.host.now();
    const still = Object.values(s.players).find(
      (p) => p.status === 'away' && this.role(p).plays && !p.waiting && limit !== null && p.awaySince + limit <= now,
    );
    s.paused = still ? { ...s.paused, id: still.id } : null;
    this.touch();
  }

  // ------------------------------------------------------------- broadcasts

  view(forId) {
    const s = this.state;
    const o = this.options;
    const places = {};
    for (const place of Object.keys(o.places)) places[place] = [];
    const players = Object.values(s.players)
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => {
        if (p.place && own(places, p.place)) places[p.place].push(p.id);
        return { id: p.id, name: p.name, role: p.role, status: p.status, waiting: p.waiting, place: p.place };
      });
    const roles = {};
    for (const [name, def] of Object.entries(o.roles)) {
      roles[name] = { seats: def.seats, plays: def.plays, sends: def.sends, sendsTo: def.sendsTo };
    }
    const room = {
      code: s.code,
      mode: o.mode,
      phase: this.currentPhase(),
      round: s.round,
      startsAt: s.startsAt,
      now: this.host.now(),
      paused: s.paused,
      ownerId: s.ownerId,
      hostId: s.hostId,
      settings: {
        ...s.settings,
        pauseBy: o.pauseBy,
        takeover: o.takeover,
        rate: o.maxMessagesPerSecond,
        maxMessageBytes: o.maxMessageBytes,
        maxSnapshotBytes: o.maxSnapshotBytes,
        heartbeatMs: o.heartbeatMs,
      },
      roles,
      places,
      placeSizes: { ...o.places },
      data: s.data,
      players,
    };
    // Host-run games start from a shared seed; server-run rules keep theirs secret.
    if (o.mode === 'host') room.seed = s.seed;
    if (forId && forId === s.ownerId) {
      room.keys = this.publicKeys();
      room.bans = Object.values(s.banList ?? {}).map((b) => ({ ...b })); // who was banned (F-031)
    }
    if (o.mode === 'host') room.successors = Array.isArray(s.successors) ? [...s.successors] : [];
    return room;
  }

  broadcastRoom() {
    if (!this.state || this.state.closed) return;
    this.syncHostPause();
    const common = JSON.stringify({ t: 'room', room: this.view(null) });
    let ownerText = null;
    for (const ws of this.identifiedSockets()) {
      const { id } = this.host.getAttachment(ws);
      if (id === this.state.ownerId) {
        ownerText ??= JSON.stringify({ t: 'room', room: this.view(id) });
        this.deliver(ws, ownerText);
      } else {
        this.deliver(ws, common);
      }
    }
  }

  event(e, id, extra = {}) {
    const text = JSON.stringify({ t: 'ev', e, id, ...extra });
    for (const ws of this.identifiedSockets()) this.deliver(ws, text);
  }

  /**
   * Resolve a `to` value into participant ids. The sender is never included.
   *   undefined | 'all'      everyone admitted
   *   [ids]                  exactly these (also participants still waiting)
   *   { role } | { place }   everyone admitted with that role or in that place
   */
  targets(to, fromId) {
    const online = Object.values(this.state.players).filter((p) => p.status === 'online' && p.id !== fromId);
    if (Array.isArray(to)) {
      const ids = new Set(to.slice(0, 64).filter((id) => typeof id === 'string'));
      return online.filter((p) => ids.has(p.id)).map((p) => p.id);
    }
    const admitted = online.filter((p) => !p.waiting);
    if (to === undefined || to === null || to === 'all') return admitted.map((p) => p.id);
    if (typeof to === 'object') {
      const byRole = typeof to.role === 'string';
      const byPlace = typeof to.place === 'string';
      if (!byRole && !byPlace) return [];
      return admitted
        .filter((p) => (!byRole || p.role === to.role) && (!byPlace || p.place === to.place))
        .map((p) => p.id);
    }
    return [];
  }

  // ------------------------------------------------------- relay, snapshots

  async relay(player, msg) {
    const s = this.state;
    const at = this.host.now(); // when it arrived at the room (F-063)
    if (this.options.mode === 'server') {
      await this.callRules('onMessage', this.rulesPlayer(player), msg.d, { at });
      return;
    }
    const text = JSON.stringify({ t: 'msg', from: player.id, d: msg.d, at });
    if (player.id === s.hostId || this.role(player).sendsTo === 'all') {
      for (const id of this.targets(msg.to, player.id)) this.sendTo(id, text);
    } else if (s.hostId) {
      this.sendTo(s.hostId, text);
    }
  }

  async storeSnapshot(player, msg) {
    const now = this.host.now();
    // The snapshot is the host's private state: it is only ever sent back to
    // whoever runs the game. What joiners may see is sent as normal messages.
    this.snapshot = { d: msg.d, at: now };
    this.snapshotLoaded = true;
    this.snapshotDirty = true;
    // Stored at most every snapshotSaveMs; a short timer makes sure the newest
    // one is stored even if nothing else arrives before the room sleeps.
    const wait = this.snapshotSavedAt + this.options.snapshotSaveMs - now;
    if (wait <= 0) await this.saveSnapshot();
    else this.cancelSave ??= this.host.defer(wait, () => this.saveSnapshot());
  }

  // --------------------------------------------------------------- commands

  mayPause(player) {
    const o = this.options;
    if (o.pauseBy === 'nobody') return false;
    if (player.id === this.state.hostId || player.id === this.state.ownerId) return true;
    return o.pauseBy === 'anyone' && this.role(player).canPause && !player.waiting;
  }

  /** What a command can change, to tell real changes from no-ops. */
  fingerprint() {
    const s = this.state;
    return JSON.stringify([
      s.settings, s.keys, s.phase, s.round, s.startsAt, s.paused, s.ownerId, s.hostId, s.hostPending, s.data, s.successors,
      s.bans.length, Object.values(s.players).map((p) => [p.id, p.place, p.waiting, p.status, p.hidden === true]),
      Object.values(s.known).map((k) => k.out === true),
    ]);
  }

  async admitWaiting() {
    for (const p of Object.values(this.state.players)) {
      if (!p.waiting) continue;
      p.waiting = false;
      this.remember(p);
      this.event('join', p.id, { name: p.name });
      if (this.options.mode === 'server') await this.callRules('onJoin', this.rulesPlayer(p));
    }
    this.touch();
  }

  // ----------------------------------------------------- server-mode rules

  rulesPlayer(p) {
    return { id: p.id, name: p.name, role: p.role, place: p.place, status: p.status, waiting: p.waiting, rttMs: this.rttOf(p.id) };
  }

  // ---- response time per participant (F-076), for the rules

  /** The median of the last few measured response times, or null. */
  rttOf(id) {
    const list = this.rtts?.get(id);
    if (!list?.length) return null;
    const sorted = [...list].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  /** Ask this participant's page to answer at once, now and then (only when the game wants it). */
  probe(ws, id) {
    const every = this.options.rttProbeMs;
    if (!every || !id) return;
    this.probes ??= new Map();
    const last = this.probes.get(id);
    const now = this.host.now();
    if (last && now - last.at < every) return;
    const n = ((last?.n ?? 0) + 1) % 1_000_000;
    this.probes.set(id, { at: now, n, sent: now });
    this.sendJson(ws, { t: 'probe', n });
  }

  /** The page's answer: the time since the probe is the response time. */
  probed(id, n) {
    const p = this.probes?.get(id);
    if (!p || p.n !== n || p.sent === null) return;
    const ms = this.host.now() - p.sent;
    p.sent = null;
    if (ms < 0 || ms > 10_000) return;
    this.rtts ??= new Map();
    const list = this.rtts.get(id) ?? [];
    list.push(ms);
    if (list.length > 5) list.shift();
    this.rtts.set(id, list);
  }

  rulesRoom() {
    const core = this;
    const s = this.state;
    return {
      get code() { return s.code; },
      get phase() { return core.currentPhase(); },
      get round() { return s.round; },
      get seed() { return s.seed; },
      get ownerId() { return s.ownerId; },
      get players() { return Object.values(s.players).map((p) => core.rulesPlayer(p)); },
      get game() { return s.game; },
      set game(value) { s.game = value; core.touch(); },
      get data() { return s.data; },
      set data(value) { s.data = value ?? null; core.touch(); core.broadcastRoom(); },
      env: core.host.env,
      now: () => core.host.now(),
      /** Store `room.game` after changing it in place. */
      save: () => core.touch(),
      send(to, data) {
        const text = JSON.stringify({ t: 'msg', from: null, d: data });
        for (const id of core.targets(to, null)) core.sendTo(id, text);
      },
      end() { s.phase = 'ended'; s.startsAt = null; core.touch(); core.broadcastRoom(); },
      admit: async () => { await core.admitWaiting(); core.broadcastRoom(); },
      /** State for newcomers (F-030): sent to everyone who joins or comes back; per role if `role` is given. */
      setWelcomeState: (data, role = null) => core.setWelcomeState(role && own(core.options.roles, role) ? role : '*', data ?? null),
      setTimer: (name, ms) => core.setTimer('rules', ms, String(name)),
      clearTimer: (name) => core.clearTimer('rules', String(name)),
    };
  }

  /** Call a rules hook. Nothing is stored unless the rules changed `room.game` or called `room.save()`. */
  async callRules(hook, ...args) {
    const fn = this.options.rules?.[hook];
    if (typeof fn !== 'function' || !this.state) return undefined;
    return fn(this.rulesRoom(), ...args);
  }
}

// The room's parts that live in their own files (D-108): the admin page's word
// and the links that get past it, and the commands.
Object.assign(RoomCore.prototype, admissionMethods, commandMethods);

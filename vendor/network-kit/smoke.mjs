#!/usr/bin/env node
// network-kit smoke test: checks that this copy of the kit works, in plain
// Node, without Cloudflare. A game runs it after taking in a new version:
//
//   node vendor/network-kit/smoke.mjs                       the kit's defaults
//   node vendor/network-kit/smoke.mjs --options rooms.js    with the game's room options
//   node vendor/network-kit/smoke.mjs --client old/room.js  another client build (compatibility)
//
// The options file exports the object the game passes to createRoomServer
// (`export default { ... }` or `export const options = { ... }`); keep it in
// a file of its own so it can be loaded outside Cloudflare.
//
// It loads every file a game imports, builds the room server from the
// options, creates a room, connects the real client to the real room logic
// through in-memory sockets, and walks through: join, messages both ways, a
// dropped connection that comes back without anything being counted twice,
// (host-run rooms) the host getting its kept state back after a reload and,
// where the game allows it, another participant taking over; and finally a
// participant who stays away being counted as gone when the room's timer fires.

import { pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { RoomCore } from './server/room-core.js';
import { VERSION } from './version.js';

const args = process.argv.slice(2);
const arg = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const load = (path) => import(pathToFileURL(resolve(path)).href);

const optionsModule = arg('--options') ? await load(arg('--options')) : null;
const options = optionsModule ? (optionsModule.default ?? optionsModule.options) : { mode: 'host', takeover: true };
const { NetworkRoom } = arg('--client') ? await load(arg('--client')) : await import('./client/room.js');
// The entry files a game imports must load and offer what the guide promises.
const serverEntry = await import('./server/index.js');
const clientEntry = arg('--client') ? await load(join(dirname(arg('--client')), 'index.js')) : await import('./client/index.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let step = 'starting';
const say = (text) => {
  step = text;
  console.log(`  ${text}`);
};

function fail(message) {
  console.error(`network-kit smoke test FAILED while: ${step}\n  ${message}`);
  try {
    const st = core.state;
    const people = Object.values(st.players).map((p) => `${p.name} (${p.role}, ${p.status}${p.id === st.hostId ? ', host' : ''}${p.id === st.ownerId ? ', owner' : ''})`);
    console.error(`  room: phase ${st.phase}, paused ${st.paused?.reason ?? 'no'}, participants: ${people.join('; ') || 'none'}`);
  } catch {
    // the room was not there yet
  }
  process.exit(1);
}

const check = (condition, message) => {
  if (!condition) fail(message);
};

async function until(condition, what) {
  const started = Date.now();
  while (!condition()) {
    if (Date.now() - started > 5000) fail(`timed out waiting for ${what}`);
    await sleep(5);
  }
}

// ---- an in-memory room: storage, alarms and sockets ----------------------

const world = { store: new Map(), sockets: [], alarm: null, chain: Promise.resolve(), skew: 0 };
const now = () => Date.now() + world.skew;
const core = new RoomCore({
  env: {},
  now,
  storage: {
    get: async (k) => structuredClone(world.store.get(k)),
    put: async (k, v) => void world.store.set(k, structuredClone(v)),
    delete: async (k) => void world.store.delete(k),
    deleteAll: async () => void world.store.clear(),
  },
  setAlarm: async (at) => {
    clearTimeout(world.alarm);
    if (at !== null) world.alarm = setTimeout(() => run(() => core.alarm()), Math.max(0, at - now()));
  },
  defer(ms, fn) {
    const timer = setTimeout(() => run(fn), ms);
    return () => clearTimeout(timer);
  },
  sockets: () => world.sockets.filter((ws) => !ws.closedWith),
  getAttachment: (ws) => ws.attachment,
  setAttachment: (ws, v) => {
    ws.attachment = structuredClone(v);
  },
  send: (ws, text) => {
    if (!ws.closedWith) setTimeout(() => ws.client.onmessage?.({ data: text }), 0);
  },
  close: (ws, code, reason) => {
    if (ws.closedWith) return;
    ws.closedWith = { code, reason };
    setTimeout(() => {
      ws.client.readyState = 3;
      ws.client.onclose?.({ code, reason });
    }, 0);
  },
}, options);

function run(fn) {
  world.chain = world.chain.then(fn).catch((err) => fail(err.stack ?? String(err)));
  return world.chain;
}

class MemorySocket {
  constructor() {
    this.readyState = 0;
    this.peer = { client: this, attachment: null, closedWith: null };
    setTimeout(() => {
      if (this.readyState !== 0) return;
      this.readyState = 1;
      world.sockets.push(this.peer);
      core.opened(this.peer);
      this.onopen?.();
    }, 0);
  }

  send(text) {
    if (text === 'ping') {
      setTimeout(() => this.onmessage?.({ data: 'pong' }), 0);
      return;
    }
    run(() => core.message(this.peer, text));
  }

  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    setTimeout(() => this.onclose?.({ code: 1006, reason: '' }), 0);
    if (!this.peer.closedWith) {
      this.peer.closedWith = { code: 1000, reason: '' };
      run(() => core.closed(this.peer));
    }
  }
}

const clients = [];
function client(name, extra = {}) {
  const store = new Map();
  const room = new NetworkRoom({
    server: 'http://smoke', code: 'SMOKE', name, WebSocket: MemorySocket, window: null, document: null,
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    minDelayMs: 10, maxDelayMs: 50, connectTimeoutMs: 3000, ...extra,
  });
  room.got = [];
  room.hostEvents = [];
  room.on('message', (m) => room.got.push(m.data));
  room.on('host', (e) => room.hostEvents.push(e));
  clients.push(room);
  return room;
}

// ---- the walk-through -----------------------------------------------------

console.log(`network-kit ${VERSION} smoke test (${options.mode ?? 'host'}-run room${arg('--options') ? `, options from ${arg('--options')}` : ''})`);

say('loading the files a game imports');
check(typeof serverEntry.createRoomServer === 'function', 'server/index.js does not export createRoomServer');
const server = serverEntry.createRoomServer(options);
check(typeof server.fetch === 'function' && typeof server.RoomObject === 'function', 'createRoomServer did not return fetch and RoomObject');
for (const name of ['NetworkRoom', 'shareLink', 'readShareLink', 'forgetShareKey', 'qrSvg']) {
  check(typeof clientEntry[name] === 'function', `client/index.js does not export ${name}`);
}
const link = clientEntry.shareLink('https://example.com/game/', 'ABCDE', 'key');
check(clientEntry.readShareLink(link)?.code === 'ABCDE', 'share links do not read back');
check(clientEntry.qrSvg(link).startsWith('<svg'), 'the QR code is not an SVG');

await core.load();
say('creating a room');
const created = await core.create({}, 'SMOKE');
check(created.ownerKey && created.keys, 'create() did not return an owner key and invitation keys');

say('connecting the owner');
const owner = client('Owner', { ownerKey: created.ownerKey });
await owner.connect().catch((err) => fail(`the owner could not connect: ${err.message}`));
check(owner.isOwner, 'the creator is not the owner');

const hostRun = core.options.mode === 'host';
let last = owner;
/** Let time pass for the room and fire its timer. */
async function skip(ms) {
  await world.chain; // what has already happened is handled at the old time
  world.skew += ms;
  await run(() => core.alarm());
}
if (hostRun) {
  await until(() => owner.hostEvents.length === 1, 'the owner being told to run the game');
  check(owner.isHost, 'the owner is not the host');
}

say('joining as a second participant');
// A role that plays and has a seat left beside the owner (else any other role with a seat).
const roles = Object.entries(core.options.roles).filter(([name, r]) => r.seats > (name === core.options.ownerRole ? 1 : 0));
const role = (roles.find(([, r]) => r.plays) ?? roles[0] ?? [])[0];
check(role, 'the options leave no seat for a second participant');
const guest = client('Guest', { key: created.keys[role].k });
await guest.connect().catch((err) => fail(`a second participant could not join: ${err.message}`));
await until(() => owner.players.length === 2, 'the owner seeing the second participant');
const guestId = guest.me;

if (hostRun) {
  const sends = core.options.roles[guest.role]?.sends;
  say('sending messages both ways');
  owner.send({ smoke: 'to everyone' });
  await until(() => guest.got.length === 1, 'the host\'s message reaching the participant');
  if (sends) {
    guest.send({ smoke: 'to the host' });
    await until(() => owner.got.length === 1, 'the participant\'s message reaching the host');
  }

  say('dropping a connection and coming back');
  guest.ws.close();
  if (sends) guest.send({ smoke: 'sent while away' });
  await until(() => guest.status !== 'online', 'the client noticing the drop');
  await until(() => guest.status === 'online', 'the client reconnecting');
  check(guest.me === guestId, 'the participant came back with another id');
  if (sends) {
    await until(() => owner.got.length === 2, 'the queued message arriving after the reconnect');
    await sleep(50);
    check(owner.got.length === 2, `a message was delivered more than once (${owner.got.length - 1} copies)`);
  }

  say('reloading the host and getting the kept state back');
  owner.sendSnapshot({ smoke: 'state' }, { force: true });
  await sleep(20);
  await world.chain;
  owner.disconnect();
  const reloaded = client('Owner', { ownerKey: created.ownerKey, playerKey: owner.playerKey });
  await reloaded.connect().catch((err) => fail(`the host could not come back: ${err.message}`));
  await until(() => reloaded.hostEvents.length === 1, 'the host being told to continue');
  check(reloaded.hostEvents[0].snapshot?.smoke === 'state', 'the kept state did not come back to the host');
  check(reloaded.isHost && reloaded.isOwner, 'the returning creator is not owner and host');
  last = reloaded;

  if (core.options.takeover && core.options.roles[guest.role]?.canHost) {
    say('losing the host during a game and letting the other participant take over');
    reloaded.start();
    await until(() => guest.phase !== 'lobby', 'the game starting');
    reloaded.sendSnapshot({ smoke: 'later state' }, { force: true });
    await sleep(20);
    await world.chain;
    reloaded.disconnect();
    await skip(core.options.takeoverMs + 100);
    await until(() => guest.isHost, 'the other participant becoming host');
    await until(() => guest.hostEvents.length === 1, 'the new host being told to continue');
    check(guest.hostEvents[0].snapshot?.smoke === 'later state', 'the new host did not get the kept state');
    check(!guest.isOwner, 'the stand-in host became the owner');
    last = guest;
  }
} else {
  say('dropping a connection and coming back');
  guest.ws.close();
  await until(() => guest.status !== 'online', 'the client noticing the drop');
  await until(() => guest.status === 'online', 'the client reconnecting');
  check(guest.me === guestId, 'the participant came back with another id');
  say('starting a round');
  owner.start();
  await until(() => guest.phase !== 'lobby', 'the round starting');
  last = owner;
}

say('counting someone who stays away as gone');
const stays = last;
const leaves = clients.find((room) => room !== stays && room.status === 'online');
if (leaves) {
  const count = stays.players.length;
  leaves.disconnect();
  await until(() => stays.players.some((p) => p.status === 'away'), 'the room noticing the drop');
  await skip(core.options.graceMs + 1000);
  await until(() => stays.players.length === count - 1, 'the seat being freed after the grace period');
}

for (const room of clients) room.disconnect();
clearTimeout(world.alarm);
await sleep(20);
console.log('network-kit smoke test passed');
process.exit(0);

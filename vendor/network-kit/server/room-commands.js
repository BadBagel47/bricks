// The room's commands (owner, host and everyone's), mixed into RoomCore (D-108);
// `this` is the room.
import { CLOSE } from '../shared/protocol.js';
import { newSecret, randomSeed } from './random.js';
import { OWNER_COMMANDS, HOST_COMMANDS, own, byteLength } from './room-shared.js';

export const commandMethods = {
  async command(ws, player, msg) {
    const s = this.state;
    const o = this.options;
    const c = msg.c;
    const isOwner = player.id === s.ownerId;
    const isHost = player.id === s.hostId;
    const fail = (code) => {
      this.penalize(ws, 5);
      this.sendJson(ws, { t: 'err', code, c: typeof c === 'string' ? c.slice(0, 24) : null, n: msg.n });
    };
    const before = this.fingerprint();
    if (OWNER_COMMANDS.has(c) && !isOwner) return fail('owner-only');
    if (HOST_COMMANDS.has(c) && !isHost && !isOwner) return fail('host-only');

    switch (c) {
      case 'take': {
        if (!this.role(player).plays || player.waiting) return fail('not-allowed');
        if (!own(o.places, msg.place)) return fail('no-such-place');
        const holders = Object.values(s.players).filter((p) => p.place === msg.place && p.id !== player.id);
        if (holders.length >= o.places[msg.place]) return fail('place-taken');
        player.place = msg.place;
        break;
      }
      case 'visibility':
        // The page went to the background or came back (F-032).
        player.hidden = msg.hidden === true;
        break;
      case 'leave-place':
        player.place = null;
        break;
      case 'assign': {
        const target = this.player(msg.id);
        if (!target || !this.role(target).plays) return fail('no-such-participant');
        if (msg.place !== null && !own(o.places, msg.place)) return fail('no-such-place');
        if (msg.place !== null) {
          const holders = Object.values(s.players).filter((p) => p.place === msg.place && p.id !== target.id);
          if (holders.length >= o.places[msg.place]) {
            if (o.places[msg.place] !== 1) return fail('place-taken');
            holders[0].place = null; // a single spot changes hands
          }
        }
        target.place = msg.place;
        break;
      }
      case 'pause': {
        if (!this.mayPause(player)) return fail('not-allowed');
        if (s.paused) return;
        s.paused = { reason: 'player', id: player.id, at: this.host.now() };
        await this.saveSnapshot();
        break;
      }
      case 'resume': {
        if (!this.mayPause(player)) return fail('not-allowed');
        // Waiting for a host cannot be resumed away: only the host can end it.
        if (!s.paused || s.paused.reason === 'host-away' || s.paused.reason === 'host-change') return;
        s.paused = null;
        if (o.mode === 'host' && this.inGame()) {
          const hostPlayer = this.player(s.hostId);
          if (!hostPlayer || hostPlayer.status === 'away') {
            s.paused = { reason: 'host-away', id: s.hostId, at: this.host.now() };
          }
        }
        break;
      }
      case 'host-ready': {
        if (!isHost) return; // a late answer from someone who is no longer the host
        s.hostPending = false;
        if (s.paused?.reason === 'host-change' || s.paused?.reason === 'host-away') s.paused = null;
        break;
      }
      case 'host-check': {
        // Others report that the host has gone silent: ask it to answer.
        const hostPlayer = this.player(s.hostId);
        if (o.mode !== 'host' || isHost || player.waiting || !hostPlayer || hostPlayer.status !== 'online') return;
        if (this.hostCheck || this.host.now() - this.lastHostCheck < o.hostCheckMs * 2) return;
        this.lastHostCheck = this.host.now(); // reports are acted on at most this often
        this.startHostCheck(hostPlayer.id);
        return;
      }
      case 'alive':
        return; // the answer to a check; handled when the message arrived
      case 'start': {
        // A new round (also a rematch) needs the game to be open (F-003).
        const word = await this.admission();
        // A round started with a game link, or in a room made with one, is allowed while the game
        // takes no new players (F-058, F-068); never after a stop.
        const passed = async () => (await this.isAdminPass(this.adminPasses?.get(ws))) || (s.pass && (await this.isAdminPass(s.pass, { lobby: true })));
        if (word && !word.open && !(!word.stopped && (await passed()))) {
          this.sendJson(ws, { t: 'err', code: 'game-closed', reason: word.reason, until: word.until ?? null, c, n: msg.n });
          return;
        }
        s.round += 1;
        s.seed = randomSeed();
        s.phase = o.countdownMs > 0 ? 'countdown' : 'playing';
        s.startsAt = this.host.now() + o.countdownMs;
        if (s.paused && s.paused.reason !== 'host-change' && s.paused.reason !== 'host-away') s.paused = null;
        await this.admitWaiting();
        if (o.mode === 'server') await this.callRules('onStart');
        if (o.mode === 'host' && o.takeover && !this.hasTimer('takeover')) {
          // Started while the host is away: now there is a game to continue.
          const hostPlayer = this.player(s.hostId);
          if (!hostPlayer || hostPlayer.status === 'away') this.setTimer('takeover', o.takeoverMs);
        }
        break;
      }
      case 'cancel': {
        // Call a countdown off (someone dropped, settings changed): back to the lobby.
        if (this.currentPhase() !== 'countdown') return fail('not-allowed');
        s.phase = 'lobby';
        s.startsAt = null;
        if (o.mode === 'server') await this.callRules('onCancel');
        break;
      }
      case 'data': {
        if (byteLength(JSON.stringify(msg.d ?? null)) > o.maxDataBytes) return fail('too-large');
        s.data = msg.d ?? null;
        break;
      }
      case 'successors': {
        // Who should take over first if the host is lost, e.g. the player whose turn it is (F-040).
        if (o.mode !== 'host') return fail('not-allowed');
        const ids = Array.isArray(msg.ids) ? msg.ids.filter((id) => typeof id === 'string').slice(0, 16) : null;
        if (!ids) return fail('bad-request');
        s.successors = ids;
        break;
      }
      case 'end':
        s.phase = 'ended';
        s.startsAt = null;
        if (o.mode === 'server') await this.callRules('onEnd');
        break;
      case 'admit':
        await this.admitWaiting();
        break;
      case 'kick': {
        const ban = msg.ban === true;
        const target = this.player(msg.id);
        // Someone the room remembers can be removed while they are away, too.
        const absent = target ? null : Object.entries(s.known).find(([, k]) => k.id === msg.id);
        if ((!target && !absent) || target?.id === player.id) return fail('no-such-participant');
        if (ban) {
          // A ban only holds if the links stop working and nobody else the
          // room remembers can walk back in without one.
          const pkh = target ? target.pkh : absent[0];
          s.bans.push(pkh);
          s.banList ??= {};
          s.banList[pkh] = { id: msg.id, name: target ? target.name : absent[1].name ?? null, at: this.host.now() };
          for (const role of Object.keys(s.keys)) s.keys[role] = { k: newSecret(), exp: null };
          s.settings.access = 'private';
          for (const k of Object.values(s.known)) if (!this.player(k.id)) k.out = true;
        }
        if (target) {
          for (const other of this.socketsOf(target.id)) {
            this.reject(other, ban ? CLOSE.BANNED : CLOSE.KICKED, ban ? 'banned' : 'kicked');
          }
          await this.removePlayer(target, ban ? 'banned' : 'kicked');
        } else if (ban) {
          delete s.known[absent[0]];
        } else {
          absent[1].out = true;
        }
        this.touch();
        break;
      }
      case 'unban': {
        // Lift a ban (F-031). The person still needs a new invitation link:
        // the links were renewed when they were banned.
        const entry = Object.entries(s.banList ?? {}).find(([, b]) => b.id === msg.id);
        if (!entry) return fail('no-such-participant');
        s.bans = s.bans.filter((h) => h !== entry[0]);
        delete s.banList[entry[0]];
        this.touch();
        break;
      }
      case 'renew': {
        if (!own(s.keys, msg.role)) return fail('bad-role');
        const ttl = Number.isFinite(msg.ttlMs) && msg.ttlMs > 0 ? msg.ttlMs : null;
        s.keys[msg.role] = { k: newSecret(), exp: ttl === null ? null : this.host.now() + ttl };
        // The old link is void, also for those who used it and are away now.
        for (const k of Object.values(s.known)) if (k.role === msg.role && !this.player(k.id)) k.out = true;
        this.touch();
        break;
      }
      case 'settings': {
        if (msg.access === 'open' || msg.access === 'private') s.settings.access = msg.access;
        if (o.lateJoinChoices.includes(msg.lateJoin)) s.settings.lateJoin = msg.lateJoin;
        break;
      }
      case 'handover': {
        if (o.mode !== 'host') return fail('not-allowed');
        const target = this.player(msg.id);
        if (!target || !this.canHost(target)) return fail('no-such-participant');
        if (target.id !== s.hostId && !(await this.takeOver(target.id))) return fail('no-such-participant');
        if (msg.n !== undefined) this.sendJson(ws, { t: 'ok', c, n: msg.n });
        return;
      }
      case 'owner': {
        const target = this.player(msg.id);
        if (!target || target.id === player.id || target.status !== 'online') return fail('no-such-participant');
        await this.giveOwner(target);
        break;
      }
      case 'leave': {
        this.sendJson(ws, { t: 'closed', reason: 'left' });
        for (const other of this.socketsOf(player.id)) this.shut(other, CLOSE.LEFT, 'left');
        if (isOwner) {
          if (o.ownerLeave === 'close') {
            await this.closeRoom('owner-left');
            return;
          }
          await this.passOwner(player.id);
        }
        if (isHost) await this.saveSnapshot();
        await this.removePlayer(player, 'left');
        if (this.identifiedSockets().length === 0) this.setTimer('cleanup', o.cleanupMs);
        return;
      }
      case 'close':
        await this.closeRoom('closed-by-owner');
        return;
      default:
        return fail('unknown-command');
    }
    if (msg.n !== undefined) this.sendJson(ws, { t: 'ok', c, n: msg.n });
    if (this.fingerprint() === before) {
      this.penalize(ws, 2); // nothing changed: no write, nothing to tell anyone
      return;
    }
    this.touch();
    this.broadcastRoom();
  },
};

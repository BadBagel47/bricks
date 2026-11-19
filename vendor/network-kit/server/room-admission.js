// The admin page's word in a room (F-003, F-004, F-058, F-059, F-098): whether
// the game is open, game links and lobbies that get past a closed game, the
// stop check while a room is busy, and rooms that send with nobody listening.
// Mixed into RoomCore (D-108); `this` is the room.
import { CLOSE } from '../shared/protocol.js';
import { sameSecret } from './random.js';
import { LOBBY_PREFIX } from './room-shared.js';

export const admissionMethods = {
  /**
   * The admin page's word on this game (F-003, F-004): null when the game is
   * not connected to it or it cannot be reached (then the game stays open).
   */
  async admission() {
    if (!this.host.admission) return null;
    try {
      return (await this.host.admission()) ?? null;
    } catch {
      return null;
    }
  },

  /** Is this one of the room's invitation keys, not expired? */
  validKey(key, now) {
    if (typeof key !== 'string' || !key) return false;
    return Object.values(this.state.keys).some((k) => sameSecret(key, k.k) && (k.exp === null || k.exp > now));
  },

  /** A game link (F-058); a lobby's token (F-059) only counts where `lobby` is true. */
  async isAdminPass(token, { lobby = false } = {}) {
    if (!this.host.checkAdminPass || typeof token !== 'string' || !token) return false;
    if (!lobby && token.startsWith(LOBBY_PREFIX)) return false;
    try {
      return (await this.host.checkAdminPass(token)) === true;
    } catch {
      return false;
    }
  },

  /**
   * An emergency stop closes running rooms too; so does Cloudflare limiting
   * once the game has used its share (F-098), except a room opened with a game
   * link or a lobby. Looked at now and then while the room is busy.
   */
  async checkStopped() {
    if (!this.host.admission || !this.state || this.state.closed) return;
    const now = this.host.now();
    if (now - (this.lastStopCheck ?? 0) < 30_000) return;
    this.lastStopCheck = now;
    const status = await this.admission();
    if (status?.stopped) await this.closeRoom('stopped', CLOSE.GAME_CLOSED);
    else if (status && !status.open && status.reason === 'budget' && !(this.state.pass && (await this.isAdminPass(this.state.pass, { lobby: true })))) {
      await this.closeRoom('budget', CLOSE.GAME_CLOSED);
    } else await this.checkLobby();
  },

  /** F-098: game messages with nobody to receive them, for too long, close a host-run room. */
  async aloneTooLong(player) {
    const limit = this.options.closeAloneAfterMs;
    if (!limit || this.options.mode !== 'host') return false;
    const others = Object.values(this.state.players).some((p) => p.id !== player.id && p.status === 'online');
    const now = this.host.now();
    if (others) {
      this.aloneSince = null;
      return false;
    }
    this.aloneSince ??= now;
    if (now - this.aloneSince < limit) return false;
    await this.closeRoom('alone', CLOSE.ROOM_CLOSED);
    await this.flush();
    return true;
  },

  /** A lobby room closes when its lobby was revoked on the admin page (F-059). */
  async checkLobby() {
    const s = this.state;
    if (!s || s.closed || !s.lobbyEnds || !this.host.checkAdminPass) return true;
    if (await this.isAdminPass(s.pass, { lobby: true })) return true;
    await this.closeRoom('lobby-ended');
    return false;
  },
};

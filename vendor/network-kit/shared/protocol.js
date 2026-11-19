// Wire protocol shared by the room server and the browser client.
// Both sides of one game always use the same network-kit version (D-009),
// so the protocol number only guards against mixed copies.

export const PROTOCOL = 3;

// Large messages travel in parts of at most this many characters (F-036):
// at most 64 kB each in UTF-8, well under Cloudflare's limits for one
// WebSocket message and one stored value. Both sides split and join them.
export const PART_CHARS = 16_000;

/** Split a text into part messages: { t: 'part', p, i, of, d }. */
export function splitIntoParts(text, p) {
  const of = Math.ceil(text.length / PART_CHARS);
  const parts = [];
  for (let i = 0; i < of; i++) {
    parts.push(JSON.stringify({ t: 'part', p, i, of, d: text.slice(i * PART_CHARS, (i + 1) * PART_CHARS) }));
  }
  return parts;
}

/**
 * Collects parts into whole texts. `add(part)` returns the joined text when
 * the last part has arrived, null while parts are missing, and throws on
 * parts that do not fit together or would make a text longer than maxChars.
 */
export class PartJoiner {
  constructor(maxChars) {
    this.maxChars = maxChars;
    this.current = null;
  }

  add(part) {
    const { p, i, of, d } = part;
    if (!Number.isSafeInteger(p) || !Number.isSafeInteger(i) || !Number.isSafeInteger(of) || typeof d !== 'string') {
      throw new Error('bad part');
    }
    if (of < 2 || of > Math.ceil(this.maxChars / PART_CHARS) || d.length > PART_CHARS) throw new Error('bad part');
    if (i === 0) this.current = { p, of, texts: [], length: 0 };
    const c = this.current;
    if (!c || c.p !== p || c.of !== of || c.texts.length !== i) {
      this.current = null;
      throw new Error('parts out of order');
    }
    c.texts.push(d);
    c.length += d.length;
    if (c.length > this.maxChars) {
      this.current = null;
      throw new Error('too large');
    }
    if (c.texts.length < of) return null;
    this.current = null;
    return c.texts.join('');
  }
}

// Room codes: no 0/O or 1/I so codes are easy to read out loud.
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6; // the default (owner, 2026-11-18); each game may choose 4 to 12 (codeLength)
export const CODE_MIN_LENGTH = 4;
export const CODE_MAX_LENGTH = 12;

// WebSocket close codes sent by the server. The client stops reconnecting
// on all of them (see FINAL_CLOSE_CODES).
export const CLOSE = Object.freeze({
  ROOM_CLOSED: 4000,
  KICKED: 4001,
  BANNED: 4002,
  REPLACED: 4003,
  NOT_FOUND: 4004,
  FULL: 4005,
  IN_PROGRESS: 4006,
  KEY: 4007,
  GAME_CLOSED: 4008,
  VERSION: 4009,
  BAD_REQUEST: 4010,
  LEFT: 4011,
  RATE: 4012,
  BUDGET: 4013,
});

// Not final: the server gave up on a connection that stopped answering.
// A client that is in fact alive reconnects.
export const CLOSE_UNRESPONSIVE = 4014;

export const FINAL_CLOSE_CODES = new Set(Object.values(CLOSE));

// Why a game is closed (close code GAME_CLOSED, or a refused start or room),
// as the admin page decides it (F-003, F-004, F-026). `until` is filled in.
export const GAME_CLOSED_TEXT = Object.freeze({
  off: 'The game is not taking new players right now.',
  until: 'The game is closed until {until}.',
  budget: "The game has used up today's free quota. It opens again at {until}.",
  'too-many-rooms': 'Too many new rooms right now. Try again in a while.',
  stopped: 'The game was stopped by its owner.',
  'too-many-attempts': 'Too many tries in a short time. Wait a minute and try again.',
  'too-many-requests': 'Too many tries in a short time. Wait a minute and try again.',
});

/** Plain text for a closed game, with the time in the reader's own clock. */
export function gameClosedText(reason, until = null) {
  const text = GAME_CLOSED_TEXT[reason];
  if (!text) return null;
  if (!text.includes('{until}')) return text;
  const at = until ? new Date(until) : null;
  const when = at && !Number.isNaN(at.getTime())
    ? at.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    : 'later';
  return text.replace('{until}', when);
}

// Plain-language reasons for close codes, for games that show them as is.
export const CLOSE_TEXT = Object.freeze({
  [CLOSE.ROOM_CLOSED]: 'The room has closed.',
  [CLOSE.KICKED]: 'You were removed from the room.',
  [CLOSE.BANNED]: 'You cannot join this room.',
  [CLOSE.REPLACED]: 'The room was opened in another tab.',
  [CLOSE.NOT_FOUND]: 'Room not found.',
  [CLOSE.FULL]: 'The room is full.',
  [CLOSE.IN_PROGRESS]: 'The game has already started.',
  [CLOSE.KEY]: 'This room needs a valid invitation link.',
  [CLOSE.GAME_CLOSED]: 'The game is closed right now.',
  [CLOSE.VERSION]: 'Please reload the page to get the latest version.',
  [CLOSE.BAD_REQUEST]: 'Could not join the room.',
  [CLOSE.LEFT]: 'You left the room.',
  [CLOSE.RATE]: 'Too many messages were sent. Please reload the page.',
  [CLOSE.BUDGET]: 'This room has used up its time for today.',
});

/** Upper-case a typed room code and drop spaces and dashes. */
export function normalizeCode(text) {
  return String(text ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Is `code` a room code? With `length`, it must have exactly that many
 * characters; without, any length a game may choose (4 to 12).
 */
export function isValidCode(code, length) {
  if (typeof code !== 'string') return false;
  if (length !== undefined ? code.length !== length : code.length < CODE_MIN_LENGTH || code.length > CODE_MAX_LENGTH) {
    return false;
  }
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return false;
  return true;
}

// Notices from the admin page to every page of a game (F-066): the admin page
// sends these texts; pages show them in a box with a warning sound. English
// only (owner's decision 2026-11-18). "{until}" becomes the local time.
export const NOTICE_TEXT = Object.freeze({
  'budget-soon': {
    level: 'warning',
    title: 'Closing soon for today',
    text: 'This game has almost used its share of today\'s free server time. It will soon close for new games until {until}. Games already running can finish.',
  },
  'budget-closed': {
    level: 'warning',
    title: 'Closed for today',
    text: 'This game has used its share of today\'s free server time. No new games until {until}. Games already running can finish.',
  },
  // The timer ("on until a time", F-067): before and after it ends.
  'timer-soon': {
    level: 'warning',
    title: 'Open play ends soon',
    text: 'Open play ends at {until}. After that no new players can join. Games already running can finish.',
  },
  'timer-ended': {
    level: 'warning',
    title: 'Open play has ended',
    text: 'No new players can join now. Games already running can finish.',
  },
  'timer-stop-soon': {
    level: 'warning',
    title: 'The game stops soon',
    text: 'The game stops at {until}. Everyone will be disconnected then.',
  },
  'timer-stopped': {
    level: 'warning',
    title: 'The game has stopped',
    text: 'No games can be started or joined now.',
  },
  message: { level: 'info', title: 'Message', text: '' },
});

// What a player sees when a lobby link does not work (B-089).
export const LOBBY_REFUSED = {
  'lobby-ended': 'This lobby has ended.',
  'lobby-revoked': 'This lobby was closed by its owner.',
  'lobby-other-game': 'This lobby link is for another game.',
  'not-a-lobby': 'This lobby link does not work. Ask for a new one.',
  'no-lobbies': 'This game does not take lobby links.',
  'no-room': 'The lobby could not open its room. Try again in a minute.',
  stopped: 'The game is stopped right now.',
  'too-many-requests': 'Too many tries. Wait a minute and try again.',
};

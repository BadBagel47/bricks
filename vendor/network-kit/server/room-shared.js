// Small definitions the room core and its parts share (D-108).
export const LOBBY_PREFIX = 'lb_'; // lobby tokens from the admin page (F-059)
export const OWNER_COMMANDS = new Set(['kick', 'unban', 'renew', 'settings', 'close', 'owner']);
export const HOST_COMMANDS = new Set(['start', 'cancel', 'end', 'admit', 'assign', 'handover', 'data', 'successors']);
export const own = (obj, key) => typeof key === 'string' && Object.hasOwn(obj, key);
export function byteLength(text) {
  return typeof text === 'string' ? new TextEncoder().encode(text).length : text.byteLength;
}

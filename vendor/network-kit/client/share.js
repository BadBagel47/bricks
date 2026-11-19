// Share links and QR codes. The room code and key travel in the part of the
// link after "#", which browsers never send to servers.
import qrcode from './vendor/qrcode-generator.js';
import { normalizeCode, isValidCode } from '../shared/protocol.js';

qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

/**
 * Build a link to the game page that opens a room.
 * @param {string} pageUrl the game's page, e.g. location.href
 * @param {string} code room code
 * @param {string|null} [key] invitation key (player or viewer); omit for open rooms
 */
export function shareLink(pageUrl, code, key = null) {
  const url = new URL(pageUrl);
  const params = new URLSearchParams();
  params.set('room', normalizeCode(code));
  if (key) params.set('key', key);
  url.hash = params.toString();
  return url.toString();
}

/** Read { code, key } from a link or location.hash; null when there is no valid room. */
export function readShareLink(urlOrHash) {
  const text = String(urlOrHash ?? '');
  const hash = text.includes('#') ? text.slice(text.indexOf('#') + 1) : text;
  const params = new URLSearchParams(hash);
  const code = normalizeCode(params.get('room'));
  if (!isValidCode(code)) return null;
  return { code, key: params.get('key') || null };
}

/** Remove the invitation key from the address bar (keeps the room code). */
export function forgetShareKey(win = globalThis.window) {
  if (!win?.history?.replaceState) return;
  const link = readShareLink(win.location.hash);
  if (!link?.key) return;
  const url = shareLink(win.location.href, link.code);
  win.history.replaceState(win.history.state, '', url);
}

/**
 * An SVG QR code for `text`, sized by its viewBox so CSS decides the size.
 * @returns {string} SVG markup
 */
export function qrSvg(text, { margin = 4, ecc = 'M', title = 'QR code' } = {}) {
  const qr = qrcode(0, ecc);
  qr.addData(String(text), 'Byte');
  qr.make();
  return qr.createSvgTag({ cellSize: 1, margin, scalable: true, title: { text: title } });
}

/** The QR code as a matrix of booleans, for games that draw it themselves. */
export function qrMatrix(text, { ecc = 'M' } = {}) {
  const qr = qrcode(0, ecc);
  qr.addData(String(text), 'Byte');
  qr.make();
  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => qr.isDark(r, c)));
}

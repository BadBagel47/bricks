// Small helpers for ids, keys and hashing. Uses Web Crypto, which exists in
// Cloudflare Workers and in Node 22+.
import { CODE_ALPHABET, CODE_LENGTH } from '../shared/protocol.js';

const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

function randomChars(alphabet, length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export const newRoomCode = (length = CODE_LENGTH) => randomChars(CODE_ALPHABET, length);
export const newPlayerId = () => randomChars(ID_ALPHABET, 6);

function base64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A 128-bit random secret as base64url (22 characters). */
export const newSecret = () => base64url(crypto.getRandomValues(new Uint8Array(16)));

export function randomSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

export async function sha256(text) {
  const data = new TextEncoder().encode(text);
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
}

/** Compare two strings without exiting early on the first difference. */
export function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// A light entry for Playtest (F-096): pages import this instead of the whole
// client. Without a tester link (`#nk-tester=` in the address, or one kept from
// before) it loads nothing more and makes no request; with one it loads
// Playtest (and Playtest Remote only when it is opened).
//
//   import { startPlaytest } from './vendor/network-kit/client/playtest-entry.js';
//   startPlaytest({ admin, items, version, context });

const TOKEN_KEY = 'nk-playtest:tester';

/** Has this browser a tester link, in the address or kept from before? */
export function hasTesterLink(win = globalThis.window) {
  if (/(?:^#|&)nk-tester=pt_/.test(String(win?.location?.hash ?? ''))) return true;
  try {
    return Boolean(win?.localStorage?.getItem(TOKEN_KEY));
  } catch {
    return false;
  }
}

/** Starts Playtest when this browser has a tester link; otherwise resolves to null at once. */
export async function startPlaytest(options = {}) {
  const win = options.window ?? globalThis.window;
  if (!hasTesterLink(win)) return null;
  const { startPlaytest: start } = await import('./playtest.js');
  return start(options);
}

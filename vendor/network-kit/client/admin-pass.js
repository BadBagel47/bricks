// The owner's admin pass (F-058): a personal link from the admin page
// (`…#nk-admin=<pass>`) lets this browser create, join and start games while
// public play is off. Opened once per device; the pass is kept in this
// browser's storage and taken out of the address bar.

const KEY = 'network-kit:admin-pass';
const PARAM = 'nk-admin';

function storage(win) {
  try {
    return win?.localStorage ?? null;
  } catch {
    return null; // storage blocked
  }
}

/** Take a pass from the address bar (if any) into storage, and return the stored pass. */
export function adminPass(win = globalThis.window) {
  const store = storage(win);
  const hash = win?.location?.hash ?? '';
  if (hash.includes(`${PARAM}=`)) {
    const params = new URLSearchParams(hash.slice(1));
    const pass = params.get(PARAM);
    params.delete(PARAM);
    if (pass && /^[A-Za-z0-9_-]{8,16}\.[A-Za-z0-9_-]{20,64}$/.test(pass)) store?.setItem(KEY, pass);
    const rest = params.toString();
    win.history?.replaceState?.(win.history.state, '', `${win.location.pathname}${win.location.search}${rest ? `#${rest}` : ''}`);
  }
  return store?.getItem(KEY) ?? null;
}

/** Forget the pass in this browser. */
export function forgetAdminPass(win = globalThis.window) {
  storage(win)?.removeItem(KEY);
}

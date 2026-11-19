// Lobbies made on the admin page (F-059): a host link and a guest link
// (`…#nk-lobby=<token>`). The page sends the token to the game's server and
// gets the lobby's room: the host link makes its holder the room's owner, the
// guest link lets its holder in as a guest who waits for the host. Works while
// the game takes no new players, until the lobby ends.

const PARAM = 'nk-lobby';
const TOKEN = /^lb_[A-Za-z0-9_-]{6,16}\.[A-Za-z0-9_-]{20,64}$/;

/** The lobby token in an address's hash, or null. */
export function readLobbyLink(hash = globalThis.location?.hash ?? '') {
  const params = new URLSearchParams(String(hash).replace(/^#/, ''));
  const token = params.get(PARAM);
  return token && TOKEN.test(token) ? token : null;
}

/** Take the lobby token out of the address bar (it is a key, like an invitation key). */
export function forgetLobbyLink(win = globalThis.window) {
  const hash = win?.location?.hash ?? '';
  if (!hash.includes(`${PARAM}=`)) return;
  const params = new URLSearchParams(hash.slice(1));
  params.delete(PARAM);
  const rest = params.toString();
  win.history?.replaceState?.(win.history.state, '', `${win.location.pathname}${win.location.search}${rest ? `#${rest}` : ''}`);
}

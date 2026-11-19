// Which browser tab is this? sessionStorage survives a reload of the tab,
// which is what a game wants, but browsers also copy it into a tab that is
// opened from another tab or duplicated. Without care, the copy then acts as
// the same tab: the same participant, the same room.
//
// tabSession() tells the two apart. Each tab holds a browser lock (Web Locks
// API) named after its tab id for as long as it is open. A tab whose stored
// id is already held by another open tab is a copy, and gets a new id.
// Where Web Locks are missing, it asks the other tabs over a BroadcastChannel
// instead; where that is missing too, every tab counts as the original.

const ID_KEY = 'network-kit:tab';
const LOCK_PREFIX = 'network-kit-tab:';
const CHANNEL = 'network-kit-tab';

let session = null;

function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function defaultStorage() {
  try {
    const store = globalThis.sessionStorage;
    store.setItem('__network_kit__', '1');
    store.removeItem('__network_kit__');
    return store;
  } catch {
    return null;
  }
}

/** Try to hold the lock for `id` for the life of the page; false if another tab holds it. */
function holdLock(locks, id) {
  return new Promise((resolve) => {
    locks
      .request(`${LOCK_PREFIX}${id}`, { ifAvailable: true }, (lock) => {
        resolve(Boolean(lock));
        if (!lock) return undefined;
        return new Promise(() => {}); // held until the page goes away
      })
      .catch(() => resolve(true)); // locks not usable here: assume the original
  });
}

/** Ask the other tabs whether one of them uses `id`; answer such questions for our own id. */
function askOthers(Channel, getId, waitMs) {
  const channel = new Channel(CHANNEL);
  channel.unref?.(); // Node: an open channel must not keep the process alive
  channel.onmessage = (event) => {
    if (event.data?.ask && event.data.ask === getId()) channel.postMessage({ taken: event.data.ask });
  };
  return (id) => new Promise((resolve) => {
    const listen = (event) => {
      if (event.data?.taken === id) done(true);
    };
    const done = (taken) => {
      clearTimeout(timer);
      channel.removeEventListener('message', listen);
      resolve(taken);
    };
    const timer = setTimeout(() => done(false), waitMs);
    channel.addEventListener('message', listen);
    channel.postMessage({ ask: id });
  });
}

/**
 * This tab's session: `{ id, copied }`. `copied` is true when the tab's
 * sessionStorage came from another tab that is still open (a link opened in a
 * new tab, a duplicated tab); per-tab state a game keeps there then belongs to
 * the other tab. A reload keeps the id and gives `copied: false`. The answer
 * is worked out once per page.
 *
 * @param {object} [o] for tests: { storage, locks, BroadcastChannel, waitMs }
 */
export function tabSession(o = {}) {
  if (session && !o.fresh) return session;
  const storage = o.storage ?? defaultStorage();
  const locks = 'locks' in o ? o.locks : globalThis.navigator?.locks;
  const Channel = 'BroadcastChannel' in o ? o.BroadcastChannel : globalThis.BroadcastChannel;
  const result = (async () => {
    if (!storage) return { id: randomId(), copied: false };
    let id = storage.getItem(ID_KEY);
    const stored = Boolean(id);
    id ??= randomId();
    // Every tab holds its own id (a new tab too, so that its copies can be
    // recognised); only a stored id can have come from another tab.
    let taken = false;
    if (locks?.request) {
      taken = !(await holdLock(locks, id)) && stored;
    } else if (Channel) {
      const ask = askOthers(Channel, () => id, o.waitMs ?? 150);
      taken = stored && (await ask(id));
    }
    if (taken) {
      id = randomId();
      if (locks?.request) await holdLock(locks, id);
    }
    storage.setItem(ID_KEY, id);
    return { id, copied: taken };
  })();
  if (!o.fresh) session = result;
  return result;
}

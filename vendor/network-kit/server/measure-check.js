// The room server's side of the anonymous measurement (F-052): a summary from
// a page is cut down to the fields the kit sends, with numbers only, before it
// goes on to the admin page. Nothing else from the request is kept.

const Q = (q) => (q && typeof q === 'object'
  ? Object.fromEntries(['n', 'p50', 'p90', 'max'].map((k) => [k, Number.isFinite(q[k]) ? Math.max(0, Math.min(1e7, Math.round(q[k]))) : null]))
  : null);
const word = (v, allowed) => (allowed.includes(v) ? v : 'other');
const COUNTS = ['reconnects', 'hostChanges', 'dropsSeen', 'hostMessages'];

export function cleanSummary(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return null;
  const counts = {};
  for (const k of COUNTS) counts[k] = Number.isFinite(raw.counts?.[k]) ? Math.max(0, Math.min(1e7, Math.round(raw.counts[k]))) : 0;
  return {
    v: 1,
    why: word(raw.why, ['interval', 'leave', 'page-hidden']),
    seconds: Number.isFinite(raw.seconds) ? Math.max(0, Math.min(86_400, Math.round(raw.seconds))) : 0,
    device: {
      kind: word(raw.device?.kind, ['phone', 'tablet', 'desktop']),
      browser: word(raw.device?.browser, ['chrome', 'safari', 'firefox', 'edge', 'samsung']),
    },
    network: word(raw.network, ['slow-2g', '2g', '3g', '4g']),
    role: word(raw.role, ['host', 'player', 'viewer']),
    players: Number.isFinite(raw.players) ? Math.max(0, Math.min(1000, Math.round(raw.players))) : 0,
    rttMs: Q(raw.rttMs),
    hostGapMs: Q(raw.hostGapMs),
    frameMs: Q(raw.frameMs),
    offlineMs: Q(raw.offlineMs),
    counts,
  };
}

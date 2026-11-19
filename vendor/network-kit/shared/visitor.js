// Who a visitor is, for limits per visitor (F-100): an IPv4 address as it is,
// an IPv6 address by its first 64 bits, since one home connection gets a whole
// /64 and could otherwise change address for every request.
export function visitorKey(address) {
  const a = String(address ?? '').trim().toLowerCase();
  if (!a.includes(':')) return a || 'unknown';
  const [head, tail = ''] = a.split('::');
  const h = head ? head.split(':') : [];
  const t = a.includes('::') && tail ? tail.split(':') : [];
  if (t.some((p) => p.includes('.')) || h.some((p) => p.includes('.'))) return a; // an IPv4-mapped address
  const groups = a.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h;
  return `${groups.slice(0, 4).map((g) => (g || '0').replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

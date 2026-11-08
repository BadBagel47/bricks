# Reusable operating controls — implementation in progress

Independent of React, Bricks, Firebase and the email provider. This is staged on
`feature/operating-controls`, not integrated with the live game or deployed.

## Implemented and locally tested

- `policy.ts`: admission checks for off/on/global deadline/timed-room-only access.
  A timed room's deadline also bounds new starts when global mode is on. Already
  admitted matches may finish after closure; a rematch needs a new admission.
- `magic-links.ts`: private allowlist lookup, 256-bit random tokens, 15-minute
  expiry, hashed token storage and project-scoped HMAC administrator subjects.
- `d1-store.ts` / `schema.sql`: SQL DELETE RETURNING for atomic one-time
  redemption; per-source 10 and per-recipient 3 requests per 15 minutes; shared
  maximum 20 outbound attempts per UTC day, configurable downwards. Failed sends
  consume budget. This is an application cap, not a verified provider allowance.
- `sessions.ts`: 30-minute opaque sessions; hashed storage, allowlist check on
  authentication, expiry, logout, rotation and pruning of expired/disabled sessions.
- `http.ts`: bounded JSON POSTs, fixed HTTPS origin and CSRF header, generic
  request-link response with background work, sanitized failures, secure HttpOnly
  SameSite=Strict host-only cookies, no-store/no-referrer and no CORS grants.
  GET never redeems a link. The API never returns administrator email/subject.

`npm test` runs the core, SQL and HTTP tests. SQL tests use Node SQLite, not a
Cloudflare deployment; real D1 concurrency and platform behavior still need tests.
No existing gameplay traffic or production rules have changed.

## Private configuration and adapter contract

Use separate databases, HMAC secrets and provider credentials per project.
Allowlisted addresses are transformed with `privateSubject` by trusted server
code; store only the resulting subject and enabled flag. Do not put addresses,
keys, cookies, tokens or allowlist exports in Git, frontend variables or logs.
A magic-link token must be in the email link's fragment only, never query/path;
remove the fragment immediately on loading the private sign-in page. The email
provider and recipient mailbox necessarily see the email and link.
Losing/changing the HMAC secret requires reprovisioning administrator subjects.

The platform adapter must:

1. Serve the admin UI and API from the same configured HTTPS origin. It is
   separate from the GitHub Pages game, avoiding cross-site session cookies.
2. Construct links from that origin, never a Host header or caller redirect.
   Render a confirmation button which explicitly POSTs the fragment token;
   scanners following a GET must not log in or consume the token. No third-party
   assets, analytics or automatic redemption on page load.
3. Pass a platform-authenticated source address to `AdminHttp.handle`, never an
   arbitrary inbound header outside the platform's trust boundary, and wire
   `waitUntil` to the platform lifecycle. Missing source sends no mail.
4. Authenticate the cookie through `AdminSessions` on **every** control action;
   login alone must not grant unauthenticated access to later policy writes.
   Preserve strict origin/header/JSON checks on those writes too.
5. Wire the real mail adapter, fixed sender, deployment secrets, and scheduled
   pruning. Verify the chosen provider's current quota before setting the cap.
   Do not share one provider account budget across projects without an aggregate
   cap. Failed sends may have been accepted remotely; do not blindly retry.

No admin UI, platform entry point, live provider, control mutation API or scheduled
pruning runner exists yet. Session/link revocation in the tests is local only.

## Firebase/application adapter still required

Mirror only the non-private policy into a narrowly scoped Firebase record.
No email, session, allowlist or magic token belongs there. Anonymous gameplay
identity stays separate from administrator identity. RTDB rules cannot call a
Worker: a trusted publication adapter and private credentials require setup.

Enforce the `admitMatch` condition with trusted time/policy/grants atomically
when transitioning to actual gameplay. RTDB rules must express and validate this
condition themselves; they cannot execute the TypeScript helper. A client write
is acceptable only if rules validate admission immutably against server time and
the current policy. Do not trust a client-supplied admission or add an extra
Worker request per gameplay snapshot. `mayFinishMatch` is a drain-policy helper,
not a replacement for participant, control-lease, recovery-deadline or schema
checks. Archive admission when done; new matches/rematches need new IDs. Do not
admit a countdown merely because it was scheduled before expiry. Reconnection
may finish the admitted match under the existing recovery limits.

Apply policy checks to existing per-path Firebase grants, preserving authorized
presence cleanup and access needed to finish admitted matches. Never add a
permissive root rule. No heartbeat or repeated polling: multiplayer should use
its existing connection, while solo admission can use a small initial read.
An already downloaded/offline solo client cannot be reliably revoked remotely.

Reusing the core does not prove the second application's enforcement. Test its
real adapter for expiry, lobby/countdown, ongoing games, recovery, cleanup,
rematches and re-enable before publishing it.

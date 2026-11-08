# Reusable operating controls — implementation in progress

This package is independent of React, Bricks, Firebase and the email provider.
It is not connected to production and is not a complete authentication service.

- `policy.ts`: off, on, global deadline, timed-room-only access. Exact deadlines
  use trusted server time; an expired room is denied even when global access is on.
- `magic-links.ts`: server-only private allowlist lookup, 256-bit random tokens,
  15-minute expiry, hashed token storage and project-scoped HMAC admin subjects.
- `d1-store.ts` / `schema.sql`: durable one-time token consumption using SQL
  DELETE RETURNING, allowlist revocation and recipient/source request limits.
- Tests in `tests/access-control.test.ts` and `tests/access-store.test.ts` run with
  `npm test`. SQL tests use Node SQLite; deployed D1 must also be integration-tested.

## Private configuration

Use separate databases, signing secrets and provider credentials per project.
Allowlisted addresses are transformed with `privateSubject` by trusted server
code; only the resulting subject and enabled flag need to be stored. Do not put
addresses, keys, tokens or allowlist exports in Git, Vite variables, URLs or logs.
Email necessarily goes to the selected mail provider and recipient mailbox;
protect those accounts too. Losing/changing the HMAC key requires reprovisioning
allowlist subjects and invalidates the subject mapping.

## Required HTTP adapter before deployment

1. Validate request size and same-origin POSTs. Derive rate-limit source from a
   trusted platform header, never from a submitted IP address.
2. Return the same generic 202 response for all syntactically accepted requests.
   Dispatch request processing in a background task to avoid an obvious
   allowlist-dependent HTTP response time. Suppress identifying error logs.
3. Construct email links using a fixed configured origin, not a Host header or
   caller-supplied redirect. Put the token in the URL fragment; avoid third-party
   resources and use Referrer-Policy: no-referrer and Cache-Control: no-store.
4. Require an explicit POST to redeem a link; a mail scanner's GET must not consume
   it. Never grant control just because a page contains a token.
5. Exchange a redeemed token for a short-lived opaque server session. Store only
   session-token hashes; use Secure, HttpOnly, SameSite cookies. Check allowlist
   membership and session expiry on every control action, and enforce CSRF/origin
   protection. Session support and the HTTP adapter are not implemented yet.
6. Add an overall outbound-mail budget below the selected provider's allowance;
   the current per-source and recipient limits are not a global service quota.
7. Add bounded retention/pruning and tests for provider failures, scanners, CORS,
   CSRF, session revocation, real D1 concurrency and deployment secrets.

## Firebase/application adapter still required

Mirror only non-private operating policy into a narrowly scoped Firebase record.
No admin email or link token belongs in that record. Keep anonymous gameplay
identity separate from administrator identity. Apply operating conditions to the
existing per-path grants, preserving authorized disconnect cleanup; never grant
root access when enabled. Stop active network traffic on explicit closure and
avoid persistent Firebase connections for single-player solely to watch a flag.
Firestore/RTDB rules cannot call an arbitrary external Worker: a trusted adapter
must publish the policy into Firebase and its credentials need explicit setup.

The backend and each application's data rules are separate adapters. Reusing the
core does not prove that a second project's enforcement is correct. Run its
integration tests for expiry, lobby/game/recovery shutdown, cleanup and re-enable.

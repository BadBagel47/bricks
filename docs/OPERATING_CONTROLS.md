# Operating controls proposal

Owner direction, 2026-11-08: casual play with friends; Firebase Spark efficiency
and simple operation take priority over advanced anti-cheat. Preserve existing
participant authorization and input validation.

## Access switch

Proposed control: a small public-readable, client-write-denied operating record
in Realtime Database. The owner changes its enabled boolean in Firebase Console;
no custom admin login or backend is required. Whole-game versus multiplayer-only
scope is pending clarification. This is a proposal, not implemented behavior.

The multiplayer client observes the operating record over its existing connection.
When disabled it stops gameplay, detaches listeners and disconnects, and the
server rules reject ordinary room/game reads and writes. Authorized presence and
intent cleanup must remain possible so onDisconnect does not leave stale state.
Administrative interruption must not produce a competitive result.

Apply the operating condition to individual existing read/write grants. Never
add a permissive root write/read rule: ancestor grants bypass child restrictions.
The operating record itself remains readable while disabled and cannot be
changed by anonymous game clients; console administrators bypass client rules.

If whole-game gating is chosen, use a small initial REST read rather than opening
a persistent Firebase socket for single-player. It consumes some database
bandwidth per check. An already loaded/offline static single-player client cannot
be reliably revoked; an immediate stop of all online clients requires additional
checks/connections. Agree the desired semantics before implementation.

## Quota priorities

1. Keep changed-only compact snapshots and the existing two-per-second ceiling;
   measure before reducing smoothness or recovery reliability.
2. Measure actual Firebase downloads, storage and connection counts for a defined
   two-player session. JSON byte estimates alone do not establish billed traffic.
3. Evaluate redundant Battle preflight reads and obsolete-epoch payload cleanup.
   Preserve attack deduplication, recovery consistency and owned room-code links.
4. Keep the access control event-driven for multiplayer; do not introduce routine
   polling, heartbeat writes, paid functions or a separate administration site.

Tests should cover disabling during lobby/countdown/game/recovery, denied new
sessions, allowed owner cleanup, reconnect/re-enable, and protection of the
operating record against anonymous client writes. No production rules change is
requested until an implementation has passed those tests.

## Updated owner requirements and research checkpoint — 2026-11-08

The owner subsequently chose passwordless email links for administrators, a
private allowlist, global off/on/timed-on and timed rooms, and reuse in another
project. The initial console-only proposal above is superseded by these needs.
The implementation foundation is in `modules/access-control/README.md`.
It is not integrated with Bricks and sends no production email.

Cloudflare Workers/D1 is a candidate for the trusted server and private storage.
The official Workers limits source was fetched successfully on 2026-11-08:
https://raw.githubusercontent.com/cloudflare/cloudflare-docs/production/src/content/docs/workers/platform/limits.mdx
It lists 100,000 requests/day and 10 ms CPU/request for Workers Free. These are
limits, not a guarantee that every complete deployment will remain free.
The official D1 pricing source was also fetched:
https://raw.githubusercontent.com/cloudflare/cloudflare-docs/production/src/content/docs/d1/platform/pricing.mdx
Its numeric pricing table is imported from another file and was not verified in
this pass. Secret configuration is documented at:
https://raw.githubusercontent.com/cloudflare/cloudflare-docs/production/src/content/docs/workers/configuration/secrets.mdx

Direct Firebase, Cloudflare and Resend documentation sites returned the cloud
proxy's 403. Attempts to find an assumed Resend docs-repository path returned 404.
No current Firebase email-link quota, Resend allowance or domain requirement is
claimed as verified. Select/verify the mail provider and domain arrangement before
provisioning. Existing app Firebase traffic remains unchanged by this foundation.

Open inputs: whether a timer hard-stops a running match or only new starts, and
whether an owned sender domain is available. Do not request real addresses or
secrets in public issue bodies, commits or chat; provision through private tools.

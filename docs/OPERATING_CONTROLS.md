# Operating controls

Owner-approved behavior, 2026-11-08: Bricks is a hobby game for friends. Keep
normal identity/database protections and prioritize quota over advanced anti-cheat.
Both public modes are **On initially**. Administrators can play when public modes
are closed, independently control public singleplayer/multiplayer with on/off or
a deadline, and create/revoke shared private multiplayer invitations with timers.

## Boundaries and data flow

GitHub Pages remains the public game. A Cloudflare Worker serves the admin UI,
its first-party `/play/` game and small APIs; D1 stores HMAC administrator subjects,
hashed one-use email links, short sessions and hashed private invitation keys.
No allowlist email or credential belongs in Git, Vite code or public responses.
Mailjet is the isolated mail adapter; provider/domain configuration is still needed.

- Admin email links last 1 hour and are consumed by an explicit confirmation
  POST, never GET. Sessions last 8 hours, use Secure/HttpOnly/SameSite cookies,
  and check the private allowlist on every privileged API call. Logout mirrors
  revocation before clearing the session; forged cookies create no mirror records.
- Public policy lives in `operating/config`, with separate single/multi policies
  and a revision. Updates use RTDB ETags and conflict responses; no D1/Firebase
  policy copy needs synchronizing. Missing/malformed policy is an error, not On.
  RTDB omission of null properties is explicitly normalized by the parser.
- Private invitations use a 256-bit fragment key distinct from their four-character
  code and from email-login tokens. Their hash lives in D1. The browser removes
  the fragment immediately and retains the invitation in memory only. After a
  reload, already admitted identities retain server membership, but cannot copy
  a reconstructed incomplete invite; use the original link.
- Redemption verifies the Firebase token against Google's project-scoped lookup,
  checks its project and anonymous identity, and grants only that UID access to
  that private room. Unknown/expired keys are rejected before identity lookup.
  SQL elects one initial host; conditional reservation/room writes are repeatable
  without replacing an existing guest or match. Two-player capacity stays under
  the existing rules, including the absent-guest release behavior.
- A room remains private even when public multiplayer is On. Public Off does not
  override a valid private invitation. No email login is required for players.

## API contract

All responses are no-store. Privileged requests require the current first-party
admin session; JSON mutations also require the configured Origin and
`X-Admin-Request: 1`. Public endpoints allow only the configured game origin,
without cross-site cookies. Times are epoch milliseconds.

| Endpoint | Contract |
| --- | --- |
| `GET /api/access` | Non-private config plus server time. |
| `POST /api/play/solo` | Empty JSON; admit public play or a current administrator. |
| `POST /api/play/invite` | Invitation token, Firebase ID token and player name; returns the room code after identity-bound grant. |
| `POST /api/play/operator` | Same-origin admin session plus Firebase ID token; binds this anonymous UID to the admin session. |
| `GET /api/control/state` | Current config, bounded invitation metadata and server time; never raw stored keys. |
| `POST /api/control/config` | Next full config with revision incremented by one; stale/concurrent changes return 409. |
| `POST /api/control/invites` | Future expiry within 30 days; returns the new code and shareable fragment URL once. |
| `POST /api/control/revoke` | Invitation ID; revoke new admission while preserving ongoing games. |

Email request, confirmation and logout use the existing `/api/admin/` routes.
A private link is shareable until expiry/revocation; an administrator email link
is consumed once. Those semantics must not be interchanged during reuse.

## Admission and draining

Room creation, new joins, reopen and countdown/ready transitions require current
public access, a valid operator session, or that private room's UID membership.
Both participants must be authorized at a new match start. All enforcement uses
RTDB server time. A scheduled countdown is not an admitted game: closing before
its ready transition prevents the game, while cancellation/cleanup stays allowed.

An existing `ready` match is the admission record. Its participant, snapshot,
result, control lease and recovery rules continue unchanged after public closure,
invitation revocation, timer expiry or administrator-session expiry. Existing
recovery deadlines still apply. Cancelling/finishing it does not authorize the
next match. No broad root grant or bypass for old clients is added. Existing ready
matches can continue across rollout; later starts use the current policy.

New solo rounds, including Play Again, call the admission endpoint. Admin cookies
are used only on the Worker's own origin; Pages sends none. There is no anonymous
Firebase sign-in for solo and no listener/polling during the round. Downloaded or
modified offline solo code cannot be securely revoked. Silent audio unlock stays
inside the user gesture before awaiting admission, and navigation away prevents
an overdue response from starting an unwanted game.

## Quota and retained state

Multiplayer observes the tiny public policy on its existing connection; timers
use local wakeups and server-side comparisons, with no clock writes, heartbeat or
polling. Keep the existing changed-only snapshot ceiling of two/player/second.
Solo uses one small backend/policy check per new round. Actual quota use still
requires measurement in the provider consoles.

Login limits are durable: source 10 and recipient 3 per 15 minutes, and at most
90 mail attempts/project/UTC day, configurable downwards. Failed attempts consume
budget. Private invite creation is limited to 100 active/pending records, with
at most 30 days until closure and a bounded recent list. Shared provider accounts
need aggregate budgeting across projects.

Twice-daily pruning removes expired links/rate windows/sessions, cleans expired
operator mirrors after a safety delay and revokes abandoned pending invitations.
Each sweep limits external work to 10 mirrors and 5 pending invitations, to stay
within the free runtime's per-invocation request budget. Expiry enforcement does
not depend on the scheduler. Old invitation SQL records are removed seven days
after expiry. Small code reservations, private-room markers and UID membership
records are retained; deleting the private marker would make a code public.
They consume storage and should be measured alongside the existing retained room
and epoch data. Dangling operator-player pointers deny access once their session
expires/is removed. None of this is an unlimited-free-use guarantee.

## Verification and reuse

See [setup](OPERATING_SETUP.md) for private provisioning and rollout order. The
independent helpers are in `modules/access-control`; the Worker, mail and Firebase
adapters are in `server/operating`. Test evidence is in `PROGRESS.md`, distinguishing
SQLite/workerd/emulator/browser tests from unperformed production checks.

For another project, copy the common module and only applicable adapters, use new
private keys/database/sender credentials and configure its origins/project IDs.
Translate admission/draining into that application's real authorization rules;
copying helpers or passing Bricks tests does not prove the new integration. Repeat
its server-time, CSRF, one-use, revocation, private-room and ongoing-work tests.

## Verified research — 2026-11-08

Cloudflare's official GitHub docs list Workers Free at 100,000 requests/day and
10 ms CPU/request. The D1 pricing table lists 5 million rows read/day, 100,000 rows
written/day and 5 GB total storage for Free. These are documented allowances,
not measurements or a promise that every workload fits:

- https://raw.githubusercontent.com/cloudflare/cloudflare-docs/production/src/content/docs/workers/platform/limits.mdx
- https://raw.githubusercontent.com/cloudflare/cloudflare-docs/production/src/content/partials/workers/d1-pricing.mdx
- https://raw.githubusercontent.com/cloudflare/cloudflare-docs/production/src/content/docs/workers/configuration/secrets.mdx

Earlier research covered Resend; the owner subsequently chose Mailjet. Mailjet's
official documentation describes transactional Send API v3.1. The owner reports the selected account allows 200/day and 6,000/month; the
project cap is 90/day, shared across administrators:

- https://github.com/mailjet/api-documentation
- https://github.com/mailjet/mailjet-apiv3-nodejs

Direct provider documentation sites remain proxy-blocked. The owner reports
Mailjet DNS verification complete for `system@trythis.one`. No live mail test,
remote D1 provisioning, real IAM grant or backend deployment has been performed here.

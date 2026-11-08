# Operating controls

Owner direction, 2026-11-08: casual games with friends; prioritize Firebase Spark
quota efficiency and simple operation over advanced anti-cheat. Keep ordinary
identity, participant authorization and input validation.

## Approved behavior

Private administrators enter their email and get a temporary personal sign-in
link only when allowlisted. No password or Google account is required for the
administrator. The allowlist must not appear in GitHub, frontend code or public
API responses. Email service and mailbox access still require private accounts.

Controls: Off, On, On with a timer, and timed room grants in Rooms-only mode.
Off takes precedence over room grants for new admissions. A room timer bounds
new matches in that room; expiry is computed from trusted server time, without a
write every second or a scheduled database update to close it.

Owner confirmed that ongoing games should finish. Use draining closure: expired
access/Off denies new admissions and rematches, while already admitted matches
retain their participant-scoped gameplay/result/recovery access until completion.
Lobby presence alone is not an admission. A countdown that would reach gameplay
after the cutoff must not create a fresh active match. Existing recovery deadlines
still apply; closure does not give an unlimited recovery window. These are the
integration requirements, not behavior already present in the live game.

The owned sender domain is undecided; `l8p.one` is a tentative candidate only.
Do not assume approval to edit its DNS or migrate the game to that domain.
A separate sender subdomain such as `spel.l8p.one` can isolate provider DNS records
from existing mail. Use the selected provider's actual DKIM/SPF/return-path
instructions; preserve existing apex MX/SPF and do not create conflicting SPF
records. No DNS record values have been generated or published. Correct DNS
configuration improves delivery but cannot guarantee inbox placement.

## Architecture and implementation state

Keep GitHub Pages for the game. Host the administrator UI and API together on a
small trusted backend. The reusable core is in `modules/access-control`; its
README lists implemented/tested primitives and remaining adapters explicitly.
No production email, backend provisioning or Firebase policy integration exists.
The previous console-only proposal is superseded by the approved delegated
email-link access, timers and cross-project reuse.

Mirror non-private operating policy into RTDB using a trusted narrow publisher.
Do not expose credentials/allowlists there, and never grant permissive root
read/write access: ancestor grants bypass child restrictions. Ordinary anonymous
game identities cannot modify policy or fabricate admission. Preserve disconnect
cleanup and the paths required to finish already admitted matches.

No routine polling or heartbeat writes. Multiplayer should observe the tiny
policy on its existing connection; solo can use a small initial REST admission
read. An already downloaded/offline static solo game cannot be reliably revoked.

## Quota priorities

1. Preserve changed-only compact snapshots and the two-per-second ceiling;
   measure before reducing smoothness or recovery reliability.
2. Measure actual Firebase downloads, storage and connections in a defined
   two-player session. JSON byte estimates alone are not billed-traffic evidence.
3. Evaluate redundant Battle preflight reads and obsolete-epoch cleanup without
   breaking attack deduplication, recovery or owned room-code links.
4. Bound login mail with durable source/recipient limits and an aggregate daily
   cap. Current default is 20 attempts/day/project, configurable downwards; verify
   the provider allowance and other projects' shared usage before deployment.
5. Keep scheduled pruning and connection lifecycle bounded. No paid services or
   billing upgrades without the owner's explicit approval.

Tests before publication must cover closed/new admission, exact timer boundaries,
lobby/countdown, ongoing-match completion, recovery, rematch denial, cleanup,
re-enable, admin revocation and anonymous policy-write denial. Complete the HTTP
and mail-provider deployment tests before packaging the reuse guide for another
project. A focused Terra High review remains planned before publication.

## Research checkpoint — 2026-11-08

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

# Bricks handover

Read this first, then `AGENTS.md`, `BRICKS_SPEC.md` and the relevant linked
guides. Owner instructions and the specification take precedence.

## Current checkpoint — 2026-11-10

**Continue on `feature/operating-controls`, not main.** The local checkout is
`/workspace/bricks` (local branch `work`). Verify Git status and remote heads
before editing; preserve user changes. Operating controls are not merged to main.

- Public game: https://badbagel47.github.io/bricks/?v=09a7cb6 .
  Last verified Pages application deployment is recovery Phase 3.12, `09a7cb6`:
  https://github.com/BadBagel47/bricks/actions/runs/42434535645 .
  Main subsequently reached documentation-only `07383d5`; that is not a new
  gameplay deployment.
- Worker preview: https://bricks-operating.l8p1.workers.dev/admin/ and
  https://bricks-operating.l8p1.workers.dev/play/ .
  Latest verified deployed application commit: `498c293`.
  Complete CI, Worker deployment and live read-only checks passed:
  https://github.com/BadBagel47/bricks/actions/runs/42533876102 .
- Owner confirmed actual Mailjet email-link login reaches the settings page.
  First administrator exists in D1 and the Firebase subject allowlist.
  Both public modes were initialized On; owner confirmed publication of the
  checked operating-aware Firebase rules. Live policy reads passed from GitHub.
- **A real private two-player match has not yet been confirmed by the owner.**
  Public Pages operating-origin activation and rollout remain pending.
  Do not mistake local/emulator success or owner setup reports for independently
  verified production behavior.

## Next session: finish the playable preview

1. Create a **fresh** private invitation and open its complete link in two
   browsers/devices with distinct anonymous identities. Earlier links may expire.
   The first redeemer becomes host and the second becomes guest automatically;
   enter a player name if requested. Do not separately select Host Game.
2. Once both connect, host chooses Start Match. Close the configuration editor
   with Apply/Cancel and obtain guest approval if required. If blocked, record
   the exact stage and visible error before changing configuration.
3. Check public On/Off/Until, administrator bypass, private play while public is
   Off, admitted-game draining and denial of new starts/rematches after expiry
   or revocation. Keep public modes On outside deliberate checks.
4. Verify production logout, one-use/expiry and revocation, D1 schema/indexes,
   actual usage/retention and the restored Google organization-policy status.
   Consolidate manual checks; automate what can be reproduced locally.
5. Only after those checks, follow the setup guide's controlled Pages activation
   (`VITE_OPERATING_ORIGIN`), publish the checked main build and change GAME_URL
   to the public Pages game. Never simply merge and assume rollout is complete.

The owner's earlier “citaten” message meant **chatten** (ChatGPT not updating);
there is no established quote feature bug. The last gameplay report was inability
to start an invited game, before successful end-to-end confirmation.

## Known failures already repaired

- Worker returned `Service temporarily unavailable`: workerd rejects
  `redirect: 'error'`, and native fetch failed when called through a class
  receiver. Adapters now use manual redirects, reject 3xx and call an unbound
  local fetch function. Actual workerd regression tests cover the adapters.
  The corrected FIREBASE_API_KEY name alone did not resolve this failure.
- Invitation opened Worker root and showed Not found: requesting internal
  `/index.html` caused Static Assets to redirect to root. `498c293` requests
  internal `/` for game HTML and redirects legacy root links to `/play/`,
  preserving query and browser-inherited fragment. The live check now requests
  `/play/?room=ABCD` without following redirects. Owner retry remains pending.
- Mobile admin overflow was repaired in `7fa6133`. Do not repeat earlier failed
  CI conclusions as the current status. Git history retains the investigation.

## Provisioned resources and private configuration

These resource identifiers are not credentials:

| Resource | Current value |
| --- | --- |
| Cloudflare account | Ofi's Account, `ba62b17cf838a334c50450438732f225` |
| Worker | `bricks-operating`, origin above |
| D1 | `bricks-operating`, `665b9d70-e43f-47f3-a15b-875abfb256a5`, binding `DB`, EU |
| Firebase project | `bricks-8f56b` |
| Realtime Database | `https://bricks-8f56b-default-rtdb.europe-west1.firebasedatabase.app` |
| Publisher service account | `bricks-operating@bricks-8f56b.iam.gserviceaccount.com` |
| Mail sender | `system@trythis.one` via Mailjet |

- `wrangler.operating.jsonc` contains nonprivate configuration. Preview
  ADMIN_ORIGIN is the Worker origin; GAME_URL is its `/play/` URL.
- Owner installed Production Worker secrets FIREBASE_SERVICE_ACCOUNT (full JSON),
  FIREBASE_API_KEY, SUBJECT_SECRET, MAILJET_API_KEY and MAILJET_SECRET_KEY.
  Actual secret values stay private. VITE_FIREBASE_API_KEY belongs in frontend
  build variables, not as the Worker's Firebase API key name.
- GitHub Actions secret CLOUDFLARE_API_TOKEN was supplied privately. Its token
  has Workers Scripts Edit and D1 Edit scoped to Ofi's Account. No expiration or
  IP restriction was selected. Never print credentials or request them in chat.
- Owner reports verified Mailjet sender DNS through Cloudflare. Actual delivery
  and first login succeeded. Mailjet Free allowance reported by owner:
  200/day and 6,000/month. Project cap is 90 attempts/day (at most 2,790/31 days);
  other projects share provider-account usage. Earlier Resend and tentative
  `l8p.one` plans are superseded.
- Owner screenshot confirmed six D1 application tables. Full production
  column/index/concurrency verification is still pending.
- Firebase `operating/config` was confirmed persisted with numeric version=1,
  revision=1, single.mode="on", multi.mode="on". RTDB omits null expiresAt fields;
  the parser handles this. Never reset existing policy to initialize again.

### Google key creation and first administrator

The blocking constraint was the **legacy** `iam.disableServiceAccountKeyCreation`,
even though `iam.managed.disableServiceAccountKeyCreation` was Not enforced.
Owner temporarily overrode the legacy policy for the Bricks project, downloaded
the dedicated service-account JSON key, then reported restoring **Inherit parent's
policy**. Existing credentials now work for live policy reads; effective restored
policy and IAM cleanup have not been independently read back. Workspace and
personal administrator accounts differed. Organization Administrator alone does
not imply Organization Policy Administrator. Preserve the project-only scope.

Exact legacy policy:
https://console.cloud.google.com/iam-admin/orgpolicies/iam-disableServiceAccountKeyCreation?project=bricks-8f56b

Owner has no local Node and chose browser-only first-admin provisioning.
`docs/admin-subject-local.html` generates the project/email HMAC locally from
private inputs, without requests/storage, then clears inputs and provides the
first-time D1 SQL. Owner executed it and added the same subject as boolean true
under the **existing** Firebase `adminAllowlist`. Never replace that parent or
collect the real email, HMAC secret or subject here. First login succeeded.

For later full revocation/reprovisioning, follow `docs/OPERATING_SETUP.md` and
`scripts/operating-admin.mjs`; the browser helper is only first-time insertion,
not a complete revocation tool. Local Node is optional for the owner's chosen
first-time route. Secret values and the real allowlist deliberately are not in Git.

## Architecture, reuse and deployment

- `modules/access-control`: reusable core; `server/operating`: Bricks Worker,
  admin UI, Mailjet, Google OAuth/identity and Firebase publication adapters.
  `docs/OPERATING_CONTROLS.md` explains contracts and reuse boundaries;
  `docs/OPERATING_SETUP.md` is the concrete private setup/rollout runbook.
- RTDB is policy source of truth, with ETag conflict protection. D1 stores private
  subjects, hashed links/sessions/invites and durable limits. Magic links last
  1 hour; sessions/cookies last 8 hours.
- Publisher auth override and path rules constrain ordinary requests; the
  underlying service-account credential remains privileged. Reuse requires its
  own database, secrets, origins and application-specific admission/rules tests.
- Worker `/play/` keeps admin cookies first-party. Pages controls activate only
  with VITE_OPERATING_ORIGIN; after activation missing policy fails closed.
- Feature CI does not deploy Pages. Worker deployment requires a feature push
  containing `[deploy operating]`, after full CI, and uses the exact checked
  Pages artifact. The deployment job runs `scripts/check-operating-preview.mjs`.
  Main pushes deploy Pages; Firebase rules are published separately by the owner.
  Documentation commits use `[skip ci]` and do not deploy.
- Never roll back to pre-control rules while private rooms exist: doing so removes
  their protection. Retain policy/private markers and follow the staged guide.

## Durable product and workflow

- Hobby game for friends: NES-inspired mechanics, engine independent of UI,
  ordinary authorization, quota efficiency over advanced anti-cheat.
- Independent public single/multi On/Off/Until; admins play while closed.
  Shared private links require no player email, admit two simultaneous players,
  bypass public closure and remain private while public is On. Codes alone
  grant no access. A room invitation is distinct from an administrator login.
- Admitted ready games and bounded recovery/results finish after closure; a
  countdown is not admission. New starts/rematches recheck access. Offline solo
  code cannot reliably be revoked remotely.
- Keep changed-only snapshots at 2/player/second, no heartbeat/polling. Measure
  retained private markers/reservations/UID grants. WebRTC/P2P is a future quota
  evaluation, not an approved migration. No paid plan/billing upgrade authorized.
- Swedish owner communication; English direct UI copy. Retain “Make room for
  one more.” No decorative filler. No worktrees or parallel agents unless asked.
- Owner prefers practical handling of low-risk room-invite test links; avoid
  repeating excessive masking warnings. Real administrator tokens, secrets and
  allowlists remain private.
- Keep this checkpoint current and retain durable requirements in the spec.
  Operating controls are authorized; later Phase 4 work needs authorization.
- Recommended model: **GPT-6.1 Sol Medium** for this verification/setup stage.
  Terra High for a difficult access/rules issue; Luna for routine copy-only work.
  Do not claim a model switch happened.

## Verification and environment limits

Latest observed: 181 local unit/runtime/adapter tests, lint/build passed. Latest
complete feature CI above passed gameplay, operating browser and Firebase suites.
The recorded suites include 15 gameplay browser checks, 3 operating/helper browser
checks and 51 Firebase checks, including a real two-identity emulator private game.
Those are not evidence of an owner-completed production private match.

```sh
npm run lint
npm test
npm run build
npm run test:browser
npm run test:operating
npm run test:firebase
```

Cached Firebase emulator JAR works with proxies unset **only for loopback tests**:

```sh
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u ALL_PROXY -u all_proxy npm run test:firebase
```

Local Wrangler: `XDG_CONFIG_HOME=/tmp/bricks-wrangler-config WRANGLER_SEND_METRICS=false`.
Local dry-run/D1 checks need no real credentials. Test seeds never initialize
production policy. Managed runtime proxy blocks workers.dev/Firebase production;
GitHub post-deploy checks provided actual read-only preview evidence. Do not
bypass network policy. Helper browser tests use localhost HTTPS because managed
Chromium blocks file opening; owner completed the local helper route.

Further references: `docs/MULTIPLAYER.md`, `docs/FIREBASE_QUOTA.md`,
`docs/FIREBASE_ACCESS.md`, `docs/PHASE3_REVIEW.md`, `PROGRESS.md`.

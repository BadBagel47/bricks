# Bricks handover

Read this first, then verify current facts in `PROGRESS.md`, Git and the linked
phase docs. Owner instructions and `BRICKS_SPEC.md` take precedence.

## Current checkpoint — 2026-11-08

- **Live access repaired:** `0e84d3b` passed all checks, deployed and passed
  actual read-only `/admin/` and `/api/access` checks from GitHub:
  https://github.com/BadBagel47/bricks/actions/runs/42525336450 . Node mocks had
  missed unsupported redirect:error and native fetch invoked with a class receiver.
  Adapters now use manual redirects (rejecting 3xx) and a local unbound fetch.
  Actual workerd tests cover all four adapters and native fetch with intercepted
  outbound traffic. Regression confirmed failing with the old receiver pattern.
  180 local tests/lint/build passed. Owner corrected the Worker key name to
  FIREBASE_API_KEY, leaving the VITE name in GitHub. Next: private administrator
  provisioning and actual Mailjet receipt/session checks. Public Pages unchanged.
- **Worker application deployed:** `afcfb8e` passed the complete CI pipeline and
  the `Publish operating preview` job succeeded with the owner-supplied GitHub
  Cloudflare Actions secret: https://github.com/BadBagel47/bricks/actions/runs/42520439790 .
  Preview origin: https://bricks-operating.l8p1.workers.dev ; `/admin/`, `/play/`.
  This is separate from public Pages, which remains unchanged. This runtime's
  proxy blocks workers.dev; live readback now uses GitHub's checked deployment.
  Next: privately provision
  the allowlist using the setup CLI and test actual Mailjet receipt/session.
- Owner reports publishing the checked operating-aware Firebase rules after
  confirming both modes On. No live API/rules readback performed here yet.
  Prepared optional GitHub Worker deployment job: only feature pushes whose
  commit message contains `[deploy operating]`, after the entire build/test job,
  deploy the exact checked Pages asset artifact to the preview Worker. Requires
  private repository secret `CLOUDFLARE_API_TOKEN`. No trigger-marker push or
  Worker application deployment has occurred yet. MAIL_FROM is in Wrangler vars
  to preserve the owner-selected plain-text sender during deployment.
- Owner's Firebase Console screenshot confirms persisted `operating/config`:
  numeric version/revision 1 and both single/multi mode `on`. Manual bootstrap
  is complete (null expiresAt fields are correctly omitted by RTDB). Next: checked
  rules publication, then application Worker deployment and private allowlist setup.
- Owner reports adding `FIREBASE_SERVICE_ACCOUNT` and `FIREBASE_API_KEY` as
  Worker secrets, creating a random `SUBJECT_SECRET`, saving it privately and
  adding it as a Worker secret. Values and effective deployment remain unverified.
  The initial open policy has now been confirmed in the owner's screenshot. The local setup CLI
  requires private credentials and this runtime has no Cloudflare identity.
- **Firebase publisher setup:** Owner created the `bricks-operating` service
  account and reports granting Firebase Realtime Database Admin. The legacy
  organization constraint blocked key creation. Owner temporarily overrode it
  for the Bricks project, reports creating a JSON key and then restoring the
  inherited policy. Effective status and key validity have not been independently
  checked. The key has not been shared here or installed in Cloudflare. Existing
  Worker publisher is not ready for deployment.
  Google documents Workload Identity Federation with an external OIDC provider,
  but a suitable automatic Cloudflare Worker identity and this Firebase REST
  combination have not been verified. An alternative dedicated Firebase Auth
  publisher account with a Worker-held credential and UID-scoped rules requires
  changing/testing publisher, bootstrap, allowlist CLI and rules; enabling the
  provider and signup/quota implications also need review. Neither is implemented
  or proven in the real account. Preserve the public game and existing policy.
- Owner's Cloudflare screenshot confirms the Worker's D1 binding `DB` points
  to the configured database. Owner reports `MAILJET_API_KEY` and
  `MAILJET_SECRET_KEY` saved as Production secrets and `MAIL_FROM` set to
  `system@trythis.one`, each deployed through the dashboard. Values have not
  been shared here or independently verified. Worker still serves its placeholder;
  Firebase publisher behavior and live mail tests remain unverified.
- Owner created the placeholder Worker at `https://bricks-operating.l8p1.workers.dev/`.
  Wrangler now uses that origin and its `/play/` URL for the private preview stage.
  Application deployment has now succeeded in GitHub. Next: verify
  the Firebase publisher and privately provision the allowlist, then follow
  the bootstrap/rules/preview sequence in `docs/OPERATING_SETUP.md`.
- Owner created Cloudflare D1 `bricks-operating` in EU jurisdiction and supplied
  database ID `665b9d70-e43f-47f3-a15b-875abfb256a5`; Wrangler binding updated.
  Account ID from its dashboard URL is `ba62b17cf838a334c50450438732f225`.
  These are resource identifiers, not credentials. Owner's D1 Console screenshot
  confirms all six application tables exist after running the schema in smaller
  blocks (the initial large paste was truncated). Indexes/column definitions have
  not been independently read back. Worker provisioning and live access remain
  unverified; runtime has no Cloudflare identity.
- **Mailjet follow-up:** Mail adapter now uses Send API v3.1 with separate private
  `MAILJET_API_KEY`/`MAILJET_SECRET_KEY`, plain `MAIL_FROM=system@trythis.one`,
  no click/open tracking and per-message success validation. Magic links last
  1 hour; sessions and cookies last 8 hours. Local 177 unit/adapter tests,
  2 HTTPS admin browser tests, lint and build passed. Actual Mailjet delivery
  remains untested. Owner reports Mailjet allows 200/day and 6,000/month;
  project cap is 90/day (2,790 attempts at most in 31 days). Account-wide usage
  from any other projects must also fit those provider limits.
- **Published:** Phase 3.12 recovery. Live URL:
  https://badbagel47.github.io/bricks/?v=09a7cb6 . The owner confirmed its checked
  rules published; main CI/Pages passed:
  https://github.com/BadBagel47/bricks/actions/runs/42434535645 . No newer
  production deployment is claimed.
- **Staged:** `feature/operating-controls` now contains the approved admin UI,
  Worker/D1/mail/publication adapters, separate public mode controls, private
  invitations and game/rules integration. Both public modes initialize On.
  See `docs/OPERATING_CONTROLS.md` and the concrete private setup/rollout guide
  `docs/OPERATING_SETUP.md`. Do not publish this by simply pushing main.
- **Local checks:** 177 unit/adapter tests passed, including actual local workerd
  D1, OAuth signatures, mail contract and authentication/authorization. The 15
  existing gameplay browser tests and 2 new real-HTTPS admin/solo browser tests
  passed. The complete Firebase suite passed 51 tests, including REST override enforcement and a real two-identity private-game check. Worker deploy dry-run passed; no external publication occurred. Browser checks passed both without and with a configured operating-origin build.
- **Still external:** The owner has a Mailjet transactional account and reports verified DNS for
  `system@trythis.one` through Cloudflare, plus a production D1, placeholder
  Worker and downloaded service-account key. Application Worker deployment
  succeeded through GitHub; no real email test has been performed. Managed runtime status reports no secrets or outbound identities. Do not
  request credential values or real allowlist emails in chat. `trythis.one` supersedes tentative `l8p.one`; the owner performed DNS setup.
- **Review/CI checkpoint:** The focused review found no additional access/quota
  issue. CI initially exposed horizontal overflow in the mobile admin layout;
  `7fa6133` constrains fieldset/input minimum widths and allows heading wrapping.
  All feature CI checks now pass, including the previously failing admin browser
  test: https://github.com/BadBagel47/bricks/actions/runs/42482035336 . This is a
  feature-branch verification, not a production deployment.
- **Next model:** GPT-6.1 Sol Medium for private setup and live provider checks
  following `docs/OPERATING_SETUP.md`. Terra High is appropriate if those checks
  expose a difficult authorization issue; Luna suits routine copy/UI-only work.
  Do not claim a model switch occurred.

## Durable product direction

- Browser Tetris-inspired game, NES-inspired mechanics rather than cycle-accurate
  emulation. Engine remains independent of React/rendering/input/audio/networking.
- Owner's hobby/friends use case prioritizes Firebase Spark quota efficiency and
  simple operation over advanced anti-cheat. Preserve ordinary authorization.
- Operating controls: independent public singleplayer/multiplayer On/Off/timers;
  administrators can play while closed. Shared private room links need no player
  email login, allow two simultaneous players, work while public access is Off,
  and remain private when public access is On. Codes alone do not authorize them.
- Closing/expiry prevents new starts/rematches; ready matches and their bounded
  recovery/results can finish. A countdown is not an admitted game. Offline solo
  code cannot be reliably revoked remotely. Never silently reset policy to On.
- Keep existing 2/player/second changed-only snapshots, no heartbeat/polling,
  no paid plan/billing upgrade without owner approval. Small retained code/private
  markers and UID grants consume storage; measure real traffic and retention.
- Future WebRTC/P2P is a backlog evaluation only if measured quota usage warrants
  it, not an approved migration. See `docs/FIREBASE_QUOTA.md`.

## Workflow

- Work in `/workspace/bricks`, existing checkout, no worktrees or parallel agents
  unless explicitly requested. Preserve user changes.
- Communicate in Swedish; player/admin UI text stays English and functional.
  Preserve “Make room for one more.”; no decorative copy or footer filler.
- Recommend an economical suitable model before new phases and at each stop,
  considering Sol, Terra and Luna. Manual playtests should be consolidated;
  automate multiple-session and rules checks between larger checkpoints.
- Keep handover/progress and durable requirements current. A later phase still
  needs authorization; operating controls are authorized separately from Phase 4.
- Feature-branch CI tests the new rules without deploying Pages. Main pushes
  deploy Pages after checks; there is no automatic Worker or Firebase rules deploy.
  Current owner authorization does not supply missing credentials or live setup.

## Important implementation boundaries

- `modules/access-control` is reusable server-independent logic; `server/operating`
  contains the Bricks Worker/admin/mail/Firebase adapters. RTDB is the only policy
  source of truth; ETags prevent lost updates. D1 holds private subjects/tokens.
- Normal publication requests use a restricted RTDB auth override and a bounded
  path list; the underlying OAuth credential remains privileged. The local setup
  CLI's `init` is a deliberate fixed-path bootstrap before new rules are installed.
- Admin game runs at Worker `/play/` beside its API to avoid third-party cookies;
  Pages stays public. Setting `VITE_OPERATING_ORIGIN` activates controls on Pages.
  Missing policy after activation fails closed; an unset build variable retains
  the existing unconfigured development/legacy flow until controlled rollout.
- Provision the open policy **before** checked admission rules. Provision private
  allowlist subjects in both D1 and the private RTDB mirror with the provided CLI.
  Follow the entire setup guide, including real provider tests and review.
- Do not roll back to pre-control rules while private rooms exist: that removes
  their enforcement. Retain private room markers and policy on failures.

## Checks and environment notes

```sh
npm run lint
npm test
npm run build
npm run test:browser
npm run test:operating
npm run test:firebase
```

Local Firebase works with the cached JAR when proxies are unset **only for the
loopback emulator test command**:

```sh
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u ALL_PROXY -u all_proxy npm run test:firebase
```

For local Wrangler commands in this managed sandbox use scoped
`XDG_CONFIG_HOME=/tmp/bricks-wrangler-config WRANGLER_SEND_METRICS=false`.
No real credentials are needed for `deploy --dry-run` or local D1 checks. The test
emulator seed explicitly opens and isolates test data; it never initializes a
production policy. Local D1/emulator/browser checks do not prove live IAM,
remote D1 concurrency, mail delivery or real billed quota.

References: `docs/MULTIPLAYER.md`, `docs/FIREBASE_QUOTA.md`,
`docs/FIREBASE_ACCESS.md`, `docs/PHASE3_REVIEW.md`, `docs/OPERATING_CONTROLS.md`,
`docs/OPERATING_SETUP.md`. The 3.13 review identifies limits; production behavior
has not been independently audited here.

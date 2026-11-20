# Bricks handoff

Read this first, then `AGENTS.md` (shared rules), `BRICKS_SPEC.md` and the relevant linked
guides. Owner instructions and the specification take precedence.

## Shared rules and inventory

- **Shared rules version:** v1.14 (2026-11-18), https://raw.githubusercontent.com/BadBagel47/agent-rules/main/AGENTS.md . Adapted to v1.14 on 2026-11-20: v1.13 added WEB.md (web basics, applied only with the owner's go-ahead, see *Pending adaptation*) and v1.14 slimmed the rules (setup moved to SETUP.md) and removes old fully merged work branches at session start (this session can only push its own branch, so the merged `ccr-d6b5c771-fnfalf` from 2026-11-18 is left; limitation noted 2026-11-20). Before that adapted to v1.12 on 2026-11-18 (previously v1.9 from 2026-11-15, v1.7 before that; v1.6, v1.3 and v1.0 before that, T-004). v1.10–v1.12 changed the reply format, run proposals (priority line, dependencies, questions with recommendations) and IDs from other repos (written as e.g. "network-kit F-059"); the current documents were updated accordingly. v1.8–v1.9 needed no repo change: Bricks has no `auto-merge.yml` (agents push to `main`, see Decisions), and the new working steps ("Pågår" marks, [wip] commits, restoring a broken site at once) apply from now on.
- Inventory: 2026-11-12
  - Redone because the 2026-11-11 inventory missed branches (the cloud checkout fetched only `feature/operating-controls`). Remote branches now: `main` (integration, deploys Pages) and `feature/operating-controls` (kept: admin Worker deploy trigger). Eleven older branches were archived as `archive/<branch>` tags and deleted on 2026-11-12: `ccr-308e5bf5-5nte3w`, `ccr-63fd355a-1ucin4` (its one commit, an early wording of the owner working rules, is superseded by the rules in `main`), `feature/visual-refresh`, `milestone-3.3` – `milestone-3.7`, `milestone-3.9`, `milestone-3.11`, `milestone-3.12`. No open pull requests or issues.
  - Sensitive information: git history on all branches scanned for keys, tokens and personal e-mail addresses; only test fixtures with fake service-account keys were found. The Firebase web config is public by design and protected by database rules. The repo is public.
  - Laws and regulations: brief review done; findings T-006 and T-007 in `docs/BACKLOG.md`.
- **network-kit updates:** `.github/workflows/update-network-kit.yml` (T-011) proposes network-kit fix versions daily on a branch `network-kit/vX.Y.Z` with an issue; the agent merges it after checking. New minor versions are only announced.
- **Publishing method:** GitHub Pages from `main` via `.github/workflows/pages.yml`, custom domain https://bricks.trythis.one ; admin Worker via the `feature/operating-controls` branch (see Decisions); Cloudflare room Worker `bricks` (https://bricks.l8p1.workers.dev) from `main` via `.github/workflows/rooms.yml`.
- **Project language:** English for all player-facing text and the README; chat with the owner in Swedish.
- **Environment (2026-11-18):** a Bricks session can message the network-kit session (cross-session messages) and read `BadBagel47/network-kit` when it is added to the session; the network-kit agent answers questions and records needs on its own (its Decisions). Pushes that go beyond what the owner asked for in the current message may be stopped by the session's safety check; the owner then confirms in chat. The Firebase emulator suite can run locally with proxies unset (database emulator jar downloaded to `.firebase/`), but `tests/firebase.rooms.mjs` alone stops after 60 s for the whole file here, so CI is the gate for it.
- **Environment (checked 2026-11-12):** agents can push to `main` and `feature/operating-controls`; GitHub REST works through `gh api`, GraphQL (`gh pr list`, `gh issue list`) is blocked in Claude cloud sessions; setting repository variables via `gh` is blocked (owner sets them); pushing tags and writing refs through the REST API are blocked, so tags are created by `.github/workflows/archive-branches.yml` (list branches in `.github/archive-branches.txt`; it tags, verifies, then deletes). A fresh cloud checkout may fetch only one branch: run `git fetch origin '+refs/heads/*:refs/remotes/origin/*'` before comparing branches.

## Decisions

Owner decisions that adjust the shared rules for this repo. Older product decisions are in `docs/adr/` and *Project rules* below.

- **IDs (2026-11-10):** Bricks keeps `F-`/`B-`/`T-` (T = operational/owner task) instead of `D-`.
- **Publishing (2026-11-11):** push to `main` after every run (temporary breakage is acceptable, the owner is the only tester); changes to `server/operating/` or `wrangler.operating.jsonc` are also merged into `feature/operating-controls` with `[deploy operating]` to deploy the admin Worker. No `auto-merge.yml` is needed because agents can push to `main`. Firebase rule changes are published by the owner before the client that depends on them.
- **`CLAUDE.md`:** kept as a one-line import of `AGENTS.md`; no rules live in it.
- **Workstreams (2026-11-11):** music is composed in a separate "music studio" chat; other agents leave `src/audio/music.ts` and music behavior alone unless asked.
- **Music tempo (2026-11-11, T-005):** new music keeps a stable BPM; *Bricks Theme* keeps its danger tempo rise (132 → 172 BPM).
- **Opponent board (2026-11-12, B-004):** fix shipped; the owner checks it on two devices.
- **Modern block colors (2026-11-15, T-007):** keep the current per-piece colors; a guideline-avoiding assignment is parked as F-027.
- **Admin after the move to network-kit (2026-11-18, F-007):** Bricks will use network-kit's admin page and its sign-in as they are; Bricks' own admin Worker is retired then. Gaps recorded in network-kit: network-kit F-057 (separate 1 Player On/Off/Until) and network-kit F-058 (administrators playing while closed).
- **Timing of the move (2026-11-18, T-008):** Bricks may move before network-kit is proven in another game, once network-kit has network-kit F-057 (1 Player On/Off/Until) and network-kit F-058 (administrators play while closed), both in v0.9.0, and network-kit F-059 (admin-issued invitations, not built), and has been tested more.
- **Icon (2026-11-18, F-035):** the logo's B tile in orange, tilted like in the logo, on the dark background.
- **Drop choice (2026-11-18, F-034):** Drop / Hard Drop / Both, default Both, for every kind of control; with one drop button the three buttons form one row, centred vertically beside the rotate buttons in the Split layout.
- **Fullscreen (2026-11-18, F-033):** button next to the Settings button on the main menu; the choice is remembered and the game returns to fullscreen at the first tap next time (recommendation approved); the game can be added to the home screen as an app (recommendation approved).
- **Touch button size (2026-11-18, F-031, Q1 with recommendation):** the Settings *Button size* slider is removed; on phones the touch controls are as large as fits below the board.
- **Room codes after the move (2026-11-18, T-008):** 6 characters, network-kit's default, from the move to network-kit; until then Bricks keeps 4.
- **Move to network-kit (2026-11-19, F-028/F-036, "Kör A rek"):** Rejoin last room replaces Reopen Previous Room (while network-kit keeps the room); Bricks' room server is a new Worker on the same Cloudflare account, deployed from GitHub; the operating-controls project rule is rewritten when F-028 is published; anti-cheat later as its own item; Firebase and Cloudflare side by side with a switch on the 2 Players screen (Firebase first); measurements on the result screen and under Connection in Settings.
- **Restore point before F-028 (2026-11-18):** tag `archive/restore-before-f028` marks the published game before the move to network-kit (made by the archive workflow; restore with `git push origin archive/restore-before-f028:refs/heads/<branch>` or revert `main` to it).
- **Danger music (2026-11-18, F-037):** as in NES Tetris: fast music while a locked block is in the top six rows, normal music as soon as they are empty (no margin).
- **network-kit feedback (2026-11-19):** improvements for network-kit found while working in Bricks are raised with the owner as they come up, recorded as `T-` items in the backlog, and sent to the network-kit session only after the owner's yes (project rule in `AGENTS.md`).
- **Room caps (2026-11-19, T-012):** Bricks keeps network-kit's default caps per room and day (from 0.16: about 4 hours with activity, 150,000 messages).
- **Invitation QR code (2026-11-19, F-039):** a QR Code button next to Copy Invite Link in both 2 Players versions; it closes when the lobby is full (F-042).
- **Touch layout default (2026-11-19, F-041, Q3 with recommendation):** Split is the default and listed first; everyone who had Row saved moves to Split once and can choose Row again.
- **Start countdown (2026-11-19, B-029):** in Cloudflare matches, "First brick in" with bricks dropping onto a pile (logo colours and tilts, 5 blue … 1 purple) over the dimmed match screen; the 5 s countdown is kept. Same countdown for Firebase is an idea, not planned.
- **Abandoned match (2026-11-19, B-028, Q1 with recommendation):** the remaining player's board freezes with the note and Return to lobby; the music stops.
- **Tablet start screen (2026-11-19, B-026, Q2 with recommendation):** every portrait screen stacks the start screen as on phones.
- **Start screen widths (2026-11-19, F-045):** logo and menu buttons equally wide: on phones the buttons follow the logo, on tablets in portrait the logo grows to the buttons' width.
- **Rules (2026-11-20, F-046, F-052 – F-055):** Classic / Modern / Custom in Settings → 1 Player, Modern by default; Modern = 7-bag, SRS wall kicks, lock delay, 3 next pieces, Hold, ghost piece; Custom shows the switches only when chosen and starts from the preset chosen before (Q7 a); one high-score list with a Classic/Modern/Custom label (Q5); Cloudflare matches choose Classic or Modern, Firebase stays Classic (Q4). Modern scoring (T-spins, combos) parked as F-058.
- **Design and animations (2026-11-20, standing):** every new or changed element follows Bricks' design and animations; ask the owner when unsure (project rule in `AGENTS.md`).
- **Settings removed (2026-11-20, F-048, F-049):** no Game effects or Interface animations setting; only the system's reduced-motion choice turns animations off.
- **Hold button (2026-11-20, F-050, Q1 with recommendation):** Split: the pad's free top corner on the outer side; Row: last in the row, the seven buttons may be drawn down to 36 px (owner's choice during the run).
- **Borders (2026-11-20, F-051, Q2 with recommendation):** `--line` #3A4268.
- **Orange (2026-11-19, F-044, Q1 with recommendation):** orange fill is for Start Match and selected options; Copy Invite Link is outlined like the other room buttons.
- **Hosting (2026-11-10):** GitHub Pages with the custom domain https://bricks.trythis.one instead of the spec's Firebase Hosting; Firebase stays the auth/database backend (`docs/DEPLOYMENT.md`).
- **Visual refresh (2026-11-10):** spec section 5.0 design, generated audio, optional Ghost piece (off by default); block colors since F-024 are Retro / Tones / Vivid (Vivid was called Modern until F-062, 2026-11-20).
- **Operating controls (2026-11-09):** approved as described in the project rules; public modes start On.
- **Shared rules adaptation (2026-11-12):** model advice and translation follow the shared rules (only models in the agent's own environment; working documents are never translated); finished milestone authorizations and duplicated working rules were removed; old branches are kept as `archive/*` tags (restore: `git push origin archive/<branch>:refs/heads/<branch>`).

## Pending adaptation

- 1.1 (web basics, WEB.md v1.13): Bricks already has no blue tap highlight, a focus ring only for keyboard users and pressed states; missing is the own SVG arrow in drop-down menus (the one `<select>` is in the Firebase match settings). Waits for the owner's go-ahead.

Earlier: The v1.2/v1.3 adaptation plan (items 1.1 – 4.1) was run on 2026-11-12: 11 old branches archived as `archive/<branch>` tags and deleted, project rules moved to `AGENTS.md` (outdated and duplicated ones removed; shared rules apply for model advice and untranslated working documents), history moved to `PROGRESS.md`.

## Current state (2026-11-19)

- Live: https://bricks.trythis.one (Pages from `main`); admin https://bricks-operating.l8p1.workers.dev/admin/ (Worker from `feature/operating-controls`).
- Latest work, newest first:
  - 2026-11-20: F-062 block colours Modern → Vivid.
  - 2026-11-20: run D: Rules Classic / Modern / Custom (7-bag, wall kicks, lock delay, 3 next pieces, Hold and ghost as rules), Modern by default; Cloudflare matches choose Classic or Modern.
  - 2026-11-20: run C: B-032 touch areas around the buttons, F-050 Hold button, F-048/F-049 settings removed, F-051 clearer borders, F-047 missing animations.
  - 2026-11-19: run B: B-031 square QR box, F-043 server switch cross-fades, F-044 Copy Invite Link outlined, F-045 equal logo and button widths.
  - 2026-11-19: run A: B-028 abandoned Cloudflare match stops, B-029 brick countdown, B-026 iPad portrait start screen, B-027 centred QR Code button, F-040 Row gap, F-041 Split default (also fits landscape phones), F-042 QR closes when full.
  - 2026-11-19: F-039 invitation QR code; T-012 network-kit 0.17.0; T-011 network-kit update workflow.
  - 2026-11-19: B-025 network-kit 0.15.1 (status check and notices with a game link); T-010 feedback recorded there as network-kit F-112, F-113.
  - 2026-11-19: F-038 a reload during a Cloudflare match continues it; network-kit feedback rule (T-010 waits for the owner's yes).
  - 2026-11-19: F-028 Cloudflare 2 Players side by side with Firebase (switch on the 2 Players screen) and F-036 connection comparison. Needs a real match on two devices.
  - 2026-11-18: F-037 danger music ends as in NES; restore point tag before F-028; F-028 proposal with questions.
- Waiting on the owner: the QR box on the iPad (B-031, Safari not testable here); the new countdown, Split default and stopped abandoned game on a phone (run A); a real Cloudflare 2 Players match on two devices and a look at Settings → Connection (F-028, F-036); phone checks of F-030 – F-035 (also adding the game to the home screen), B-019, B-018 and B-017; a two-device check of B-004; whether the privacy text is enough.
- Next: B-030 (match top bar on phones), B-033 and F-056 (key repeat settings) are recorded, not yet proposed as runs; T-009 only on the owner's explicit yes. F-006 music in the music studio chat.
- Older checkpoints and history: `PROGRESS.md` (section *Handoff history*) and git history.

## Documentation map

| What | Where |
| --- | --- |
| Agent rules | `AGENTS.md` (reference to the shared rules and the Bricks project rules; `CLAUDE.md` imports it); owner decisions in *Decisions* above |
| Product requirements | `BRICKS_SPEC.md` (section 5.0 = approved visual design) |
| Current state, environments, resources | this file |
| Goals | *Product direction* below and spec section 4 |
| Open features, bugs and tasks (`F-`/`B-`/`T-` IDs) | `docs/BACKLOG.md` |
| Done work per milestone, with checks | `PROGRESS.md` |
| Released changes | `CHANGELOG.md` |
| Why things are built this way | `docs/adr/` |
| Subsystems | `docs/ENGINE.md`, `docs/AUDIO.md`, `docs/INPUT.md`, `docs/MULTIPLAYER.md`, `docs/OPERATING_CONTROLS.md`, `docs/OPERATING_SETUP.md`, `docs/FIREBASE_QUOTA.md`, `docs/FIREBASE_ACCESS.md` |
| Music themes and the owner test player | `docs/music/` (see its README) |

## Product direction (goals)

- A polished, NES-inspired falling-block game for casual play with friends, on
  phone and desktop, in the browser.
- Two-player Score Duel and Battle with honest reconnection, results and rematch.
- Owner-controlled access: public on/off/timer and private invitations.
- Free to run: Firebase Spark, Cloudflare free tier, GitHub Pages; no paid
  services without owner approval.
- Later: more music (F-006) and moving 2 Players to the shared room server in
  `BadBagel47/network-kit` (F-007) once it is proven with Boomers (`BadBagel47/boomers`).

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
- Keep changed-only snapshots (about 4 per player per second since B-004, at most 5), no heartbeat/polling. Measure
  retained private markers/reservations/UID grants. WebRTC/P2P is a future quota
  evaluation, not an approved migration. No paid plan/billing upgrade authorized.
- Owner prefers practical handling of low-risk room-invite test links; avoid
  repeating excessive masking warnings. Real administrator tokens, secrets and
  allowlists remain private.
- Keep the current state short and retain durable requirements in the spec.
- Model choice is per run. Saved documents use neutral levels: a strong model with high reasoning for multiplayer, rules or access work; a standard model at medium level for focused features; an economical model for copy or styling only. Do not claim a model switch happened.

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

Restricted environments without package installs (observed in a Claude cloud
session, 2026-11-10): Node 22+ runs `node --test tests/*.test.ts` directly via
type stripping for every suite that does not need `firebase`, `miniflare` or
`esbuild`; a global `tsc` can type-check `tsconfig.tests.json` apart from those
modules. If React, esbuild and playwright-core exist globally, the gameplay and
operating browser suites can run against an esbuild bundle with Firebase
stubbed. Treat such runs as supporting evidence; CI remains the gate.

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


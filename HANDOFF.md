# Bricks handoff

Read this first, then `AGENTS.md` (shared rules), `BRICKS_SPEC.md` and the relevant linked
guides. Owner instructions and the specification take precedence.

## Shared rules and inventory

- **Shared rules version:** v1.0 (2026-11-11), https://raw.githubusercontent.com/BadBagel47/agent-rules/main/AGENTS.md . This repo was last adapted to v1.0 on 2026-11-11 (T-004).
- **Inventory done:** 2026-11-11. Branches: `main` (integration, deploys Pages) and `feature/operating-controls` (0 commits ahead of `main`; a push-trigger for the admin Worker deploy, see below). No open pull requests or issues. Documentation existed already (this file, `docs/BACKLOG.md`, `PROGRESS.md`, `CHANGELOG.md`, ADRs); nothing needed moving.
- **Publishing method:** GitHub Pages from `main` via `.github/workflows/pages.yml`, custom domain https://bricks.trythis.one ; admin Worker via the `feature/operating-controls` branch (see Project rules).

## Documentation map

| What | Where |
| --- | --- |
| Agent rules | `AGENTS.md` (reference to the shared rules; `CLAUDE.md` imports it); Bricks rules in *Project rules* below |
| Product requirements | `BRICKS_SPEC.md` (section 5.0 = approved visual design) |
| Current checkpoint, environments, resources | this file |
| Goals | *Product direction* below and spec section 4 |
| Open features, bugs and tasks (`F-`/`B-`/`T-` IDs) | `docs/BACKLOG.md` |
| Done work per milestone, with checks | `PROGRESS.md` |
| Released changes | `CHANGELOG.md` |
| Why things are built this way | `docs/adr/` |
| Subsystems | `docs/ENGINE.md`, `docs/AUDIO.md`, `docs/INPUT.md`, `docs/MULTIPLAYER.md`, `docs/OPERATING_CONTROLS.md`, `docs/OPERATING_SETUP.md`, `docs/FIREBASE_QUOTA.md`, `docs/FIREBASE_ACCESS.md` |
| Music themes and the owner test player | `docs/music/` (see its README) |

## Phase 4 public deployment (parallel track)

- **Phase 4:** Public deployment (authorized by the owner 2026-11-10).
- **Target:** https://bricks.trythis.one via GitHub Pages custom domain (approved
  deviation from Firebase Hosting, "for now"). Firebase stays the auth/database
  backend. Setup, origin-change effects, checklist and maintenance:
  `docs/DEPLOYMENT.md`.
- **Current live build:** 3.12 at https://badbagel47.github.io/bricks/?v=09a7cb6 .
  No application code changed for Phase 4; the domain is a repository setting.
- **Waiting on owner:** DNS CNAME `bricks → badbagel47.github.io`; GitHub
  Settings → Pages custom domain + Enforce HTTPS; Firebase Authorized domains;
  API-key referrer list if restricted. Then a consolidated live two-device
  playtest against the checklist (this environment cannot reach the live site).
- **Open decisions from 3.13:** trusted competition, abuse resistance and
  retention (`docs/PHASE3_REVIEW.md`) remain unsolved; do not represent them as solved.
- **Next model:** GPT-6.1 Sol Medium for Phase 4 verification and any quota/abuse
  mitigation; Terra High only for server-authoritative competition; Luna for
  routine UI/doc changes.
- Relation to this branch: Phase 4 publishes `main` (3.12) on the custom
  domain. The visual refresh and operating controls reach the public site only
  through T-002. Owner steps are tracked as T-003 in `docs/BACKLOG.md`.

## Product direction (goals)

- A polished, NES-inspired falling-block game for casual play with friends, on
  phone and desktop, in the browser.
- Two-player Score Duel and Battle with honest reconnection, results and rematch.
- Owner-controlled access: public on/off/timer and private invitations.
- Free to run: Firebase Spark, Cloudflare free tier, GitHub Pages; no paid
  services without owner approval.
- Later: more music (F-006) and a second game, Stones (F-008), reusing the lobby
  (F-007).

## Current checkpoint — 2026-11-11

Latest work (2026-11-12): F-023 touch rotation both ways, F-024 Retro/Tones/Modern block colors, B-016; before that F-021/F-022 animations and run 5. B-004 needs the owner's two-device check. Ideas F-006 – F-008 remain in `docs/BACKLOG.md`.

### Earlier checkpoint — 2026-11-10

**Continue on `main` (since 2026-11-11; previously `feature/operating-controls`).** Work in the existing
checkout of your environment. Verify Git status and remote heads before editing;
preserve user changes. Everything is merged to `main`, which deploys https://bricks.trythis.one.
The admin Worker still deploys from `feature/operating-controls` with
`[deploy operating]` (see AGENTS publishing rule).

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

## Visual and audio refresh (2026-11-10)

Merged into `feature/operating-controls` as `89b856c` and deployed to the Worker
preview; full CI and the live preview check passed:
https://github.com/BadBagel47/bricks/actions/runs/42838139082 .
Details in `PROGRESS.md` and `CHANGELOG.md`; design rules in spec section 5.0
and ADR 0005; audio in `docs/AUDIO.md`. The owner then approved reworking admin,
lobby, settings and match screens to the sketch's behavior (backlog F-001 to
F-005, B-001). Runs 1 and 2 are done (see `PROGRESS.md`). B-002 (match start
timing) is fixed. B-003 (200 ms opponent updates) is done: the owner published the
rules on 2026-11-11, then the client was deployed to the Worker preview.

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
- Model choice is per run (see AGENTS.md). Tiers: a strong model with high
  reasoning (e.g. Claude Opus, GPT-6.1 Sol High) for multiplayer, rules or
  access work; a standard model (e.g. Claude Sonnet, GPT-6.1 Terra Medium) for focused features;
  an economical model (e.g. GPT-6 Luna) for copy or styling only. Suggested
  models per item are in `docs/BACKLOG.md`. Do not claim a model switch happened.

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

## Project rules (moved from AGENTS.md, 2026-11-11)

These are Bricks-specific. The shared agent rules (see `AGENTS.md`) apply on top;
where Bricks has an explicit exception it is stated here.

- Documentation map: [HANDOVER.md](HANDOVER.md) (start here), [docs/BACKLOG.md](docs/BACKLOG.md) (open work with `F-`/`B-`/`T-` IDs), [PROGRESS.md](PROGRESS.md) (done work), [CHANGELOG.md](CHANGELOG.md) (Keep a Changelog), [docs/adr/](docs/adr/) (decisions). At the end of every run update the backlog status, the changelog's *Unreleased* section, PROGRESS and the handover checkpoint; add an ADR for any significant new decision.
- Treat [BRICKS_SPEC.md](BRICKS_SPEC.md) as the product source of truth. Keep player-facing text in English and communicate with the owner in Swedish.
- At a new work session or milestone, read [HANDOVER.md](HANDOVER.md) first, then verify current facts in `PROGRESS.md` and follow its links to the relevant phase docs. Update the handover at each milestone checkpoint; keep durable requirements in the spec/AGENTS, not only in the handover.
- Keep gameplay rules independent from React, rendering, input, audio, persistence, and multiplayer. Prefer small, testable modules and avoid unnecessary dependencies or rewrites.
- Run relevant existing checks after meaningful changes and report only results actually observed. Keep `PROGRESS.md` current at milestone boundaries.
- Work in the existing checkout; do not create a worktree. Preserve user changes and make only changes required by the approved milestone.
- Recommend the economical suitable model at each milestone. Escalate difficult gameplay engineering only when justified; wait for approval before starting a stronger-model task if the specification requires a model switch.
- Owner update 2026-11-06: proceed with 3.7 without requiring manual review of 3.6; consolidate owner playtesting into larger playable checkpoints and use automated two-session checks between steps. This authorizes 3.7, not all later milestones.
- Owner subsequently authorized 3.8 Score Duel. Continue consolidating manual playtesting; no manual review is required before its checked deployment. Later milestones still require authorization.
- Owner authorized 3.9 Battle penalties. Consolidate manual playtesting; stage rule changes and complete automated two-session/security validation before requesting owner publication of the checked rules. No later milestone is authorized by this step.
- Owner authorized 3.10 match results and local highscores. Continue automated checks and checked publication without requiring a manual game review. Dedicated rematch coordination remains 3.11.
- Owner authorized 3.11 rematches. Keep manual testing consolidated; stage and verify new readiness/approval rules before requesting owner rule publication. Later recovery work still requires authorization.
- Owner authorized Phase 4 public deployment on 2026-11-10: publish at `https://bricks.trythis.one` using GitHub Pages with a custom domain for now (approved deviation from the spec's Firebase Hosting). Firebase remains the auth/database backend. See `docs/DEPLOYMENT.md`.
- Stop at milestone review checkpoints unless the owner has waived the relevant review. Do not begin multiplayer/Firebase or a later phase without explicit approval.
- Keep interface copy direct and functional. Retain the approved “Make room for one more.” headline; avoid decorative subheadings, slogans, menu descriptions, and footers. Keep necessary instructions, validation, and availability status.

- Owner preference: include GPT-6.1 Terra alongside Sol and Luna when recommending a model and reasoning level at each checkpoint.
- Owner direction 2026-11-08: Bricks is a hobby game for casual play with friends. Prioritize Firebase Spark quota efficiency and simple operation; advanced anti-cheat/server-authoritative competition is not a project priority. Keep normal identity and database authorization protections.

- Owner approved operating controls: separate public singleplayer/multiplayer on/off/timers, administrator play while closed, and shared private room invitations that bypass public closure but remain private when public play is on. Initialize both public modes On. Existing games finish; deny new starts/rematches after closure. Stage and test the server, rules and client before a focused Terra High review and private external setup; no paid service or billing upgrade is authorized.

- Owner approved 2026-11-10: visual refresh per spec section 5.0, new generated audio, optional Ghost piece (off by default) and Classic block colors. Keep player-facing text English.

- Owner rule 2026-11-11: new music must keep a stable BPM; express danger urgency through intensity, not tempo. Exception (owner decision 2026-11-11, T-005): the game theme *Bricks Theme* keeps its danger tempo rise (132 → 172 BPM). Music proposals and the shared test player live in `docs/music/`.

### Owner working rules

- **Replies:** Keep replies to the owner fairly short without omitting important information. Leave out technical detail the owner does not need.
- **Documentation:** Keep handoff, goals, working method, features and bugs documented and current. Follow established technical and naming standards where they exist. Documentation must be usable by any AI agent, not tied to one tool.
- **IDs:** Use the `F-`/`B-`/`T-` IDs defined in `docs/BACKLOG.md` (approved 2026-11-10).
- **Batching:** Register every requested feature or fix in `docs/BACKLOG.md` and wait for approval. Collect approved items for a joint run and start only on the owner's explicit go-ahead (e.g. “Kör”).
- **Publishing (owner decision 2026-11-11):** Unless the owner explicitly says otherwise, publish after every run by pushing to `main`; CI deploys GitHub Pages at https://bricks.trythis.one (the owner is the only tester, so temporary breakage is acceptable). When `server/operating/` or `wrangler.operating.jsonc` changes, also merge into `feature/operating-controls` with `[deploy operating]` in the merge message to deploy the admin Worker. Firebase rule changes still need owner publication before the client that depends on them.
- **Model choice:** Before every run, recommend a suitable model and reasoning level. Conserve quota without sacrificing quality; speed is not a priority unless stated. Suggest priorities and group items by suitable model and level.
- **Language:** Write documentation on GitHub and other external services in English. Communicate with the owner in Swedish. If external text exists in Swedish, ask whether it should be translated.
- **Sensitive data:** Publish personal or otherwise sensitive data only with the owner's explicit approval, stating why it is needed and the risks.
- **Workstreams (owner decision 2026-11-11):** Music is composed in a separate Claude chat (the "music studio"), which also integrates approved tracks into `src/audio/` and docs (F-006). Other agents must not change `src/audio/music.ts` or music behavior unless the owner asks. Only one agent works in the repository at a time; before starting, fetch and continue from `main` (the integration branch since 2026-11-11), never from old `feature/*` or `ccr-*` branches.
- **Owner actions:** When the owner must do something the agent cannot, provide everything needed: direct links, text to copy, exact steps. Suggest integrations that remove manual steps and flag integrations likely to be needed later.

### Differences from the shared rules (owner-approved)

- **IDs:** Bricks keeps `F-`/`B-`/`T-` (T = operational/owner task) instead of `D-`. Conversion to the shared format is not done unless the owner asks.
- **Priority:** the shared scale High / Medium / Low is used in `docs/BACKLOG.md`.
- **Publishing:** push to `main` as in the shared rules; additionally, changes to `server/operating/` or `wrangler.operating.jsonc` are merged into `feature/operating-controls` with `[deploy operating]` to deploy the admin Worker. No `auto-merge.yml` is needed because agents can push to `main`.
- **`CLAUDE.md`:** kept as a one-line import of `AGENTS.md` because Claude Code only auto-loads `CLAUDE.md`. No rules live in it.
- **Model advice:** include GPT-6.1 Terra alongside Sol and Luna.
- **Rules confirmation:** the first reply of a session states the loaded rules version.

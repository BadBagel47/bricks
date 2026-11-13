# Bricks handoff

Read this first, then `AGENTS.md` (shared rules), `BRICKS_SPEC.md` and the relevant linked
guides. Owner instructions and the specification take precedence.

## Shared rules and inventory

- **Shared rules version:** v1.6 (2026-11-13), https://raw.githubusercontent.com/BadBagel47/agent-rules/main/AGENTS.md . Adapted to v1.6 on 2026-11-13 (previously v1.3 from 2026-11-12; v1.0 before that, T-004). v1.4–v1.6 needed no approval: the branch-archive workflow now follows the shared template (never touches the default branch).
- Inventory: 2026-11-12
  - Redone because the 2026-11-11 inventory missed branches (the cloud checkout fetched only `feature/operating-controls`). Remote branches now: `main` (integration, deploys Pages) and `feature/operating-controls` (kept: admin Worker deploy trigger). Eleven older branches were archived as `archive/<branch>` tags and deleted on 2026-11-12: `ccr-308e5bf5-5nte3w`, `ccr-63fd355a-1ucin4` (its one commit, an early wording of the owner working rules, is superseded by the rules in `main`), `feature/visual-refresh`, `milestone-3.3` – `milestone-3.7`, `milestone-3.9`, `milestone-3.11`, `milestone-3.12`. No open pull requests or issues.
  - Sensitive information: git history on all branches scanned for keys, tokens and personal e-mail addresses; only test fixtures with fake service-account keys were found. The Firebase web config is public by design and protected by database rules. The repo is public.
  - Laws and regulations: brief review done; findings T-006 and T-007 in `docs/BACKLOG.md`.
- **Publishing method:** GitHub Pages from `main` via `.github/workflows/pages.yml`, custom domain https://bricks.trythis.one ; admin Worker via the `feature/operating-controls` branch (see Decisions).
- **Project language:** English for all player-facing text and the README; chat with the owner in Swedish.
- **Environment (checked 2026-11-12):** agents can push to `main` and `feature/operating-controls`; GitHub REST works through `gh api`, GraphQL (`gh pr list`, `gh issue list`) is blocked in Claude cloud sessions; setting repository variables via `gh` is blocked (owner sets them); pushing tags and writing refs through the REST API are blocked, so tags are created by `.github/workflows/archive-branches.yml` (list branches in `.github/archive-branches.txt`; it tags, verifies, then deletes). A fresh cloud checkout may fetch only one branch: run `git fetch origin '+refs/heads/*:refs/remotes/origin/*'` before comparing branches.

## Decisions

Owner decisions that adjust the shared rules for this repo. Older product decisions are in `docs/adr/` and *Project rules* below.

- **IDs (2026-11-10):** Bricks keeps `F-`/`B-`/`T-` (T = operational/owner task) instead of `D-`.
- **Publishing (2026-11-11):** push to `main` after every run (temporary breakage is acceptable, the owner is the only tester); changes to `server/operating/` or `wrangler.operating.jsonc` are also merged into `feature/operating-controls` with `[deploy operating]` to deploy the admin Worker. No `auto-merge.yml` is needed because agents can push to `main`. Firebase rule changes are published by the owner before the client that depends on them.
- **`CLAUDE.md`:** kept as a one-line import of `AGENTS.md`; no rules live in it.
- **Workstreams (2026-11-11):** music is composed in a separate "music studio" chat; other agents leave `src/audio/music.ts` and music behavior alone unless asked.
- **Music tempo (2026-11-11, T-005):** new music keeps a stable BPM; *Bricks Theme* keeps its danger tempo rise (132 → 172 BPM).
- **Opponent board (2026-11-12, B-004):** fix shipped; the owner checks it on two devices.
- **Hosting (2026-11-10):** GitHub Pages with the custom domain https://bricks.trythis.one instead of the spec's Firebase Hosting; Firebase stays the auth/database backend (`docs/DEPLOYMENT.md`).
- **Visual refresh (2026-11-10):** spec section 5.0 design, generated audio, optional Ghost piece (off by default); block colors since F-024 are Retro / Tones / Modern.
- **Operating controls (2026-11-09):** approved as described in the project rules; public modes start On.
- **Shared rules adaptation (2026-11-12):** model advice and translation follow the shared rules (only models in the agent's own environment; working documents are never translated); finished milestone authorizations and duplicated working rules were removed; old branches are kept as `archive/*` tags (restore: `git push origin archive/<branch>:refs/heads/<branch>`).

## Pending adaptation

None. The v1.2/v1.3 adaptation plan (items 1.1 – 4.1) was run on 2026-11-12: 11 old branches archived as `archive/<branch>` tags and deleted, project rules moved to `AGENTS.md` (outdated and duplicated ones removed; shared rules apply for model advice and untranslated working documents), history moved to `PROGRESS.md`.

## Current state (2026-11-12)

- Live: https://bricks.trythis.one (Pages from `main`); admin https://bricks-operating.l8p1.workers.dev/admin/ (Worker from `feature/operating-controls`).
- Latest work, newest first:
  - F-025 centred, larger logo on the 1 Player game screen; B-017 start page no longer scrolls on phones.
  - Shared agent rules v1.3 adaptation (this file, `AGENTS.md`, branch archive).
  - F-023 touch rotation both ways, F-024 Retro/Tones/Modern block colors, B-016.
  - F-021 interface animations, F-022 game effects.
  - Owner feedback fixes B-011 – B-015 (aligned top bars, Tab-only focus rings, Space-safe game over, larger menu buttons).
- Waiting on the owner: a two-device check of B-004 (opponent board); a real private two-player match on the live site (T-001) has not been confirmed in writing.
- Next: no approved runs. Ideas in `docs/BACKLOG.md`: T-006 privacy notice, T-007 Tetris look check, F-006 music, F-007 reusable lobby, F-008 Boomers (formerly Stones).
- Older checkpoints and history: `PROGRESS.md` (section *Handoff history*).

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
- Later: more music (F-006) and a second game, Boomers (F-008, formerly Stones), reusing the lobby
  (F-007).

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


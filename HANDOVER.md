# Bricks handover

Read this first when starting a new work session. It is an index and current
checkpoint, not a replacement for owner instructions or the product specification.
Verify status and commits in `PROGRESS.md`/GitHub before relying on them.

## Current checkpoint — 2026-11-06

- **Phase 3, milestone 3.6:** Countdown and shared starting state (approved).
- **Live:** https://badbagel47.github.io/bricks/?v=96f40fe
- **Deployed app source:** `96f40fe` — synchronized host-configuration waiting, 50 local shuffle-bag messages and confirmed-membership listener gating; includes previous settings, short codes and lobby corrections.
- **CI / Pages:** https://github.com/BadBagel47/bricks/actions/runs/42139135333
- **Status:** 3.6 implemented on milestone-3.6. Local lint/build and 106 unit tests passed; full branch CI passed for `7ace18f`: https://github.com/BadBagel47/bricks/actions/runs/42257292319 . Server deadline, authorization, +2-minute guest clock skew, equal starts, disconnect cancellation/restart and leave were verified. Public site remains the 3.5 release linked above.
- **Next:** Owner confirmed the countdown/lock rules published. Main activation is in progress; verify Pages CI success before marking 3.6 live. Reload both clients and review shared five-second timing, settings/approval locks, disconnect/leave cancellation and equal opening piece/preview. Ready is a read-only initialized state; gameplay controls/opponent boards are not implemented here. Stop for 3.6 review before 3.7.
- **Next model if approved:** GPT-6.1 Sol Medium for 3.7 live multiplayer controls, bounded opponent snapshots and score synchronization.

## Product direction and durable constraints

- Build Bricks as a browser Tetris-inspired game. The long-term goal is a secure,
  playable two-person multiplayer game with settings, approval, seeded play,
  Score Duel/Battle, results, rematch and honest reconnection/recovery behavior.
- Engine rules stay separate from React, rendering, input, audio, persistence and
  Firebase. The game is NES-inspired, not a cycle-accurate emulator.
- Current multiplayer has room creation, join/invite/reopen, two-player lobby,
  host handover and connection presence. It has **no match start or playable
  multiplayer yet**. An offline player may retain a slot; coordinated recovery
  and active-tab leases belong to later work.
- Stay on Firebase Spark. No paid backend/functions or billing upgrade without
  explicit owner approval. Keep application heartbeat writes out; planned game
  snapshots target at most two compact updates/second/player and must be measured
  before activation. Retain small room-code reservations to preserve ownership
  and saved links; no automatic reservation expiry is implemented.
- Only the owner can authorize entering a new milestone or changing a product
  rule. Stop at milestone review checkpoints.

## Working method and communication

- Read `AGENTS.md`, this handover, `PROGRESS.md`, and the relevant section of
  `BRICKS_SPEC.md` before changes. Phase-specific architecture and limits live in
  `docs/MULTIPLAYER.md`, `docs/FIREBASE_QUOTA.md` and `docs/FIREBASE_ACCESS.md`.
- Work in `/workspace/bricks`, on the existing checkout; no worktrees. Preserve
  user changes. Do not use parallel agents unless the owner or repo instructions
  explicitly requests them.
- Communicate in Swedish; keep player-facing UI in English, direct and useful.
  Preserve “Make room for one more.” Avoid decorative subheads and filler.
- Recommend the economical suitable model before every new milestone and at
  each stop. The owner prefers GPT-6.1 Sol Medium for difficult multiplayer
  architecture. Luna is suitable for routine UI-only work.
- Run checks appropriate to a meaningful change and report only results observed.
  At checkpoints update `PROGRESS.md`, this file, and the relevant design docs.
- GitHub Pages deploys from pushes to `main`. A source update is not live until
  its Pages workflow succeeds. Do not infer production behavior from emulator CI.

## Firebase, quota and access state

- Project `bricks-8f56b` uses Anonymous Auth and Realtime Database in
  `europe-west1`. Public web config is in GitHub Actions repository variables;
  never copy values into docs/source or expose admin credentials. The owner
  corrected an initially invalid API key; 3.2 room creation was then confirmed.
- The owner reported publishing the 3.3 rules before its main deployment. The
  runtime has no attached Google outbound identity, no Firebase admin access and
  no tool to provision an identity. Future rules deployment could use a dedicated
  GitHub Actions service account through Google Workload Identity Federation;
  bootstrap and permission caveats are in `docs/FIREBASE_ACCESS.md`.
- Current quota assumptions, retention constraints and operational thresholds
  are in `docs/FIREBASE_QUOTA.md`. Firebase's exact current pricing was not
  fetched live because the cloud proxy blocks Google docs; treat listed limits as
  planning baselines and check the console before public scale-up.

## Useful checks

```sh
npm run lint
npm run build
npm test
npm run test:browser
npm run test:firebase
```

The latest rotation correction passed lint/build, 99 unit tests and 15 Chromium
browser tests locally, then the full GitHub Actions gate and Pages deployment.
The local Database Emulator JAR downloaded, but local rule upload was cancelled
at the loopback endpoint; use CI's full emulator suite as the observed rules
verification and do not claim a local full emulator pass.

## Source of truth

1. Owner's latest instructions and approved decisions.
2. `BRICKS_SPEC.md` and `AGENTS.md` for product requirements and workflow.
3. `PROGRESS.md` for milestone state, validations, blockers and next checkpoint.
4. This file for a quick handover and pointers to detailed phase documents.

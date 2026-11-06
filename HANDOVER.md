# Bricks handover

Read this first when starting a new work session. It is an index and current
checkpoint, not a replacement for owner instructions or the product specification.
Verify status and commits in `PROGRESS.md`/GitHub before relying on them.

## Current checkpoint — 2026-11-06

- **Phase 3, milestone 3.9:** Battle penalties (authorized).
- **Live:** https://badbagel47.github.io/bricks/?v=a3db2c0 (3.8).
- **Status:** 3.9 complete on milestone-3.9, source `8a90d27`. Full branch CI passed: https://github.com/BadBagel47/bricks/actions/runs/42310387560 . Local lint/build, 119 unit tests and 15 single-player Chromium checks passed. Install checked rules before main activation; no Firebase administrator identity is attached.
- **Workflow:** Owner wants manual playtesting consolidated into larger playable checkpoints. Finish automated tests before the one required owner action: new Firebase rule publication. Later milestones still need authorization.
- **Next:** Owner installs the checked 3.9 rules from `8a90d27`, then deploy the tested client. Battle has independent penalty-hole RNG, 0/1/2/4 attacks, incoming cancellation, exactly-once prefix processing, garbage at lock boundaries and confirmed survival outcomes. Full results/highscores/recovery remain later work.
- **Next model:** GPT-6.1 Sol Medium for 3.10 match results and highscores, after 3.9 checkpoint.

## Product direction and durable constraints

- Build Bricks as a browser Tetris-inspired game. The long-term goal is a secure,
  playable two-person multiplayer game with settings, approval, seeded play,
  Score Duel/Battle, results, rematch and honest reconnection/recovery behavior.
- Engine rules stay separate from React, rendering, input, audio, persistence and
  Firebase. The game is NES-inspired, not a cycle-accurate emulator.
- Current multiplayer has room creation, join/invite/reopen, two-player lobby,
  host handover and connection presence. Published 3.7 has the countdown, live controls, opponent boards and compact snapshots. 3.8 adds Score Duel outcomes; full results/highscores and Battle penalties remain later milestones. An offline player may retain a slot; coordinated recovery
  and active-tab leases belong to later work.
- Stay on Firebase Spark. No paid backend/functions or billing upgrade without
  explicit owner approval. Keep application heartbeat writes out; planned game
  snapshots are implemented at at most two compact updates/second/player; automated tests verify the payload/rate budget. Actual billed traffic still needs production monitoring. Retain small room-code reservations to preserve ownership
  and saved links; no automatic reservation expiry is implemented.
- Only the owner can authorize entering a new milestone or changing a product
  rule. Stop at milestone checkpoints unless the owner waived the relevant manual review.

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

# Bricks backlog

Planned features, fixes and operational tasks. This file is the single list of
work that is not done yet. `PROGRESS.md` records what was done; `CHANGELOG.md`
records released changes.

## Conventions

- **IDs:** `F-###` feature, `B-###` bug, `T-###` operational task. IDs are never
  reused or renumbered. Reference them in commit messages, PRs and docs
  (for example `F-001: add admin tabs`).
- **Status:** `Idea` → `Proposed` → `Approved` → `In progress` → `Done`
  (or `Dropped`). Only the owner moves an item to `Approved`.
- **Priority:** `P1` next run, `P2` soon, `P3` later.
- **Runs:** collect approved items into one run. Start a run only after the
  owner's explicit go-ahead (for example "Kör"). Recommend a model and reasoning
  level per run before starting.
- When an item is done: set `Done`, add the commit or PR, and add a line to
  `CHANGELOG.md` under *Unreleased*.

## Overview

| ID | Type | Title | Priority | Status | Suggested model |
| --- | --- | --- | --- | --- | --- |
| F-001 | Feature | Admin page with the sketch's structure and functions | P1 | Done (run 1, 2026-11-10) | Standard |
| F-002 | Feature | Lobby with the sketch's structure and functions | P1 | Done (run 2, 2026-11-10) | Strong |
| F-003 | Feature | Settings with the sketch's structure and functions | P1 | Done (run 1, 2026-11-10) | Standard |
| F-004 | Feature | Match and 1 Player screens per the sketch | P1 | Done (run 2, 2026-11-10) | Strong |
| F-005 | Feature | Wire multiplayer sound effects | P1 | Done (run 2, 2026-11-10) | Standard |
| B-001 | Bug | Admin offers Revoke for expired invitations | P1 | Done (run 1, 2026-11-10) | Standard |
| B-002 | Bug | Pieces start falling at slightly different moments on the two devices in a match | P2 | Proposed | Strong |
| T-001 | Task | Owner check of a real private two-player match in the Worker preview | P1 | Open | — (owner) |
| T-002 | Task | Controlled public Pages activation of operating controls | P2 | Open | Strong |
| F-006 | Feature | More music tracks | P3 | Idea | Standard |
| F-007 | Feature | Extract the multiplayer lobby into a reusable module | P3 | Idea | Strong |
| F-008 | Feature | Stones: Bomberman-like game for 1–2 players | P3 | Idea | Strong |

The approved P1 items come from the owner's request of 2026-11-10: use the
sketch's layout **and behavior**, not only its look. Design reference:
"Bricks – visuell skiss" (Claude design canvas, artboards 1–5 and A1–A3).

## Proposed runs (2026-11-10)

Grouped by shared code and risk to save quota without lowering quality.

| Run | Items | Why together | Suggested model |
| --- | --- | --- | --- |
| 1 | F-001, B-001, F-003 | Self-contained screens (admin page, Settings) with their own fast tests; no multiplayer logic | Standard, medium reasoning (e.g. Claude Sonnet, GPT-6.1 Sol Medium) |
| 2 | F-002, F-004, F-005 | Share lobby/match components and the two-session Firebase tests; highest regression risk | Strong, high reasoning (e.g. Claude Opus, GPT-6.1 Terra High) |
| Later | F-006 | Music data only | Standard, medium |
| Later | F-007, then F-008 | Architecture work; plan first, then build | Strong, high |

## Details

### F-001 Admin page with the sketch's structure and functions
- Two tabs: *Public access* and *Private invitations*.
- Per mode (1 Player, 2 Players): segmented On / Off / Timer. The closing-time
  field is shown only for Timer.
- Status badge per mode: "Open", "Closed", "Open until HH:MM".
- Invitations as rows: room code, Active / Expired / Revoked badge, closing time,
  Revoke only for active ones. New-link box shows room code, link and Copy.
- Keep all API contracts, element IDs used by tests or update the tests with the
  change, CSP (`script-src 'self'`), mobile width without horizontal overflow.
- Acceptance: `npm test`, `npm run test:operating` pass; manual check on a phone.

### F-002 Lobby with the sketch's structure and functions
- Large room-code tiles with *Copy link* and *Copy code*.
- Player cards: name, Host/Guest, connection status.
- Score Duel / Battle as a segmented choice with a one-line rule explanation.
- Compact match-settings rows: starting level, Hold, guest approval.
- Keep host-draft / Apply / Cancel / approval semantics and all labels used by
  `tests/firebase.rooms.mjs`, or update those tests in the same change.
- Acceptance: full Firebase emulator suite passes in CI.

### F-003 Settings with the sketch's structure and functions
- Segmented choices where the sketch has them (block colors, touch controls).
- Live block-color preview; stepper buttons for the starting level.
- Sections: Personal, Display, 1 Player, Audio, Keyboard, Controller.
- Keep accessible labels used by `tests/browser.integration.mjs`.

### F-004 Match and 1 Player screens per the sketch
- Match header: both names and scores with the signed difference between them;
  mode and connection chips.
- Battle: incoming-garbage meter beside the player's board.
- Stats row as in the sketch; layouts must still pass all fit tests
  (320×667, 390×844, 844×390, 800×600, 1280×800).

### F-005 Wire multiplayer sound effects
- Effects already exist in `src/audio/effects.ts`: `countdownTick`,
  `countdownGo`, `garbageSent`, `garbageIncoming`, `garbageRise`, `victory`,
  `defeat`. Trigger them from match events via `BricksAudio.cue()`.

### B-001 Admin offers Revoke for expired invitations
- Observed in the admin UI code: Revoke is shown when `state === 'active'`
  even if `expiresAt` has passed. Show it only for active, unexpired invitations.

### B-002 Match start not simultaneous on both devices
- Owner observation 2026-11-10: with both devices on the same network, pieces
  begin to fall first on one screen and then on the other (same pieces, offset
  timing).
- Likely cause: each client starts its countdown/gravity locally from its own
  clock offset (`.info/serverTimeOffset`). Investigate a shared server start
  timestamp that both clients wait for, and measure the real offset in a test.
- Not a sequence bug (same seed); treat as start-timing polish. Must not weaken
  recovery/resume timing.

### T-001 Owner check of a real private two-player match
- Steps are in `HANDOVER.md` → *Next session: finish the playable preview*.

### T-002 Controlled public Pages activation
- Follow `docs/OPERATING_SETUP.md`. Never just merge to `main` and assume rollout.

### F-006 More music tracks
- Owner liked the new theme and wants more tracks later (e.g. per level range or
  for menus/results). Same four-channel style; see `docs/AUDIO.md`.

### F-007 Extract the multiplayer lobby into a reusable module
- Rooms, codes, presence, host transfer, countdown/seed, rematch, recovery,
  admin and invitations are reusable; Bricks snapshots/Battle rules are not.
  Prerequisite for F-008 lobbies.

### F-008 Stones: Bomberman-like game
- Separate game, 1 and 2 players. Real-time shared arena: use Firebase (or the
  F-007 module) only for lobby/signaling and WebRTC data channels for gameplay.
  Own name and graphics; no Bomberman names or assets.

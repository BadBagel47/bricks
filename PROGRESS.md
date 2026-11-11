# Bricks progress

- **Phase:** 3 — Multiplayer (explicitly approved by the owner)
- **Milestone:** 3.13 — Integration and security review
- **Status:** Phase 3.13 review is documented in `docs/PHASE3_REVIEW.md`. Public gameplay remains at `09a7cb6`; the separately approved operating controls are live in a Worker preview on `feature/operating-controls`. See current checkpoint below and `HANDOVER.md` for verified setup and remaining live checks.
- **Phase 4 (parallel):** Public deployment (authorized by the owner 2026-11-10)
- **Target:** https://bricks.trythis.one on GitHub Pages with a custom domain (owner-approved deviation from Firebase Hosting for now). Firebase remains the backend. See `docs/DEPLOYMENT.md`.
- **Phase 4 status:** Documentation and maintenance instructions added; no application code changed. Waiting for owner DNS, GitHub Pages custom-domain/HTTPS, Firebase Authorized domains (and API-key referrer, if restricted). Live verification checklist not yet observed; this environment cannot reach the site.
- **Previous milestones:** Phases 1 and 2 were accepted by the owner when approving Phase 3. Line-clear scoring is approved; manual drops award no points. Interface copy must remain direct and functional.

## B-003 — faster opponent board — 2026-11-11

Owner approved ("Kör b3"). Snapshot interval 500 → 200 ms (`SNAPSHOT_INTERVAL_MS`), with matching rule changes for snapshots, recovery checkpoints and Battle attacks. Docs: ADR 0002, FIREBASE_QUOTA, MULTIPLAYER. Tests: gate unit tests and the rooms budget check use 200 ms. The owner published the rules on 2026-11-11; the client was then deployed to the Worker preview.

## B-002 — shared start in Score Duel — 2026-11-10

Owner approved ("Kör b2"). Cause: Score Duel gravity started at each client's mount, i.e. when the "ready" write arrived (host first). Fix: `startCatchUp` in `src/multiplayer/match-start.ts` advances a fresh round from the shared countdown end (capped 3 s); Battle unchanged (shared frame clock), restored games unchanged. Tests: unit test in `tests/match-start.test.ts`; `tests/firebase.rooms.mjs` (clock-skew test) now checks that both first pieces are within one row. Local: unit 170 pass (6 environment-only failures as before), browser 15/15.

## Run 2 — lobby, match screens and match sounds (F-002, F-004, F-005) — 2026-11-10

Owner approved ("Kör"). Lobby, two-player match and 1 Player screens follow the sketch; multiplayer sound effects are wired without engine changes (counter deltas in `LiveGame`, countdown in `MatchStartPanel`). Test updates in `tests/firebase.rooms.mjs`: Match mode is now a radio group, and Next/Hold (`.live-previews`) moved to the side column outside *Your game*. Local: browser integration 15/15, typecheck clean; a local harness (stubbed Firebase) confirmed the match screen fits without scrolling at 320×667, 390×844, 844×390, 800×600 and 1280×800 in both modes. Firebase emulator suites are not runnable here; CI is authoritative.

## Run 1 — admin page and settings (F-001, B-001, F-003) — 2026-11-10

Owner approved ("Kör"). Admin page and Settings now follow the sketch's structure and behavior; Revoke only for active unexpired invitations. Updated `tests/operating.browser.mjs` (segmented controls, tabs, new expired-invitation check) and `tests/browser.integration.mjs` (heading "Settings", stepper, Swipe radio). Local: operating browser 3/3, browser integration 15/15, typecheck clean; six unit tests that need `firebase`/`miniflare` cannot run in this sandbox (fail identically without the change), so CI is authoritative. Remaining sketch work: F-002, F-004, F-005 (run 2).

## Visual and audio refresh — 2026-11-10

Owner approved ("Kör") a refresh based on the Claude design sketch and sound test page. Built on `feature/visual-refresh` (from `feature/operating-controls`):

- New audio from scratch: original four-channel theme (pulse lead, pulse arpeggio, triangle bass, noise drums), look-ahead scheduling, danger tempo with hysteresis, 22 named effects. See `docs/AUDIO.md`.
- New visual design (spec section 5.0): navy theme, tile logo, five-button touch row, tappable Hold box, restyled menus, settings, lobby, match and results.
- New Personal Settings: Block colors (Change by level / Classic) and Ghost piece (off by default). Two-color NES-style level palettes.
- Admin page restyled with unchanged element IDs and behavior.
- Local checks with the available toolchain: unit tests, the 15 single-player Chromium tests and the 3 operating browser tests passed against a local build. Full CI (lint, build, Firebase emulator and two-session tests) runs on GitHub.

Open follow-up work is tracked in `docs/BACKLOG.md` (F-001 to F-008, B-001, T-001, T-002).

## Reusable operating controls — current checkpoint, 2026-11-10

The authoritative current setup, resources, failure diagnoses, next steps and
environment limits are in [HANDOVER.md](HANDOVER.md). Continue on
`feature/operating-controls`; public Pages activation remains pending.

- Worker application `498c293` passed complete CI, deployment and live admin,
  game-entry and policy checks:
  https://github.com/BadBagel47/bricks/actions/runs/42533876102 .
  Preview: https://bricks-operating.l8p1.workers.dev/admin/ .
- Owner confirmed first real Mailjet login reaches settings after browser-only
  subject generation, D1 insertion and the Firebase allowlist entry. Owner has
  no local Node and chose the local HTML helper. Private values were not shared.
- Owner provisioned the EU D1 database, DB binding, Worker secrets, GitHub
  deployment token, verified sender `system@trythis.one`, Firebase publisher
  key, initial On/On policy and operating-aware rules. Actual live policy reads
  pass. Six D1 tables were confirmed in Console; detailed remote schema/index
  verification and restored Google policy readback remain pending.
- The legacy key-creation constraint required a temporary Bricks-project
  exception; owner reports restoring inheritance. The managed constraint alone
  was not the blocker. See setup guide for the exact procedure and scope.
- Live access failures were repaired with manual redirect handling and unbound
  native fetch calls, tested in actual workerd. Private invitation Not found
  was repaired by avoiding Static Assets' index.html canonical redirect.
- Latest observed local checks: 181 unit/runtime/adapter tests, lint/build pass.
  Complete feature CI passed gameplay, operating/helper and Firebase suites;
  recorded suite counts: 15, 3 and 51 respectively. Emulator private play and
  post-revocation snapshots passed; an owner-completed production private match
  has not yet been confirmed.
- Next: fresh invitation in two browsers, start a match, then production
  closure/draining/session/revocation checks before Pages rollout. Do not reset
  existing policy or remove private-room protection.
- Mailjet replaced the earlier Resend plan. Links last 1 hour, sessions 8 hours;
  cap 90 attempts/project/day. Reported provider allowance 200/day, 6,000/month
  is shared with other projects. Ordinary quota protection remains a priority.
- Architecture/reuse: [OPERATING_CONTROLS.md](docs/OPERATING_CONTROLS.md).
  Private provisioning and staged rollout: [OPERATING_SETUP.md](docs/OPERATING_SETUP.md).
  Other projects need distinct secrets/database/origins and their own adapter and
  authorization tests. No paid plan or later Phase 4 work is authorized.
- Recommended model: GPT-6.1 Sol Medium; Terra High for difficult access/rules
  issues, Luna for copy-only tasks.

## Historical milestone record

The sections below preserve observations at their original checkpoint. Statements
such as “pending”, old test counts or “not deployed” are historical; use the current
checkpoint above and HANDOVER.md for present status.

## Milestone 3.11
- Owner confirmed rules published. Main `da4009e` passed full CI and deployed Pages: https://github.com/BadBagel47/bricks/actions/runs/42403753502. App code matches tested `0ddf8c4`.
- Owner authorized rematches with consolidated manual review. Results now offer Rematch, returning to the same lobby/settings; both participants must enter that lobby before the current host can start the next countdown. A player reviewing results cannot be silently pulled into a new game.
- Added two bounded role slots for round readiness, tied to UID, exact live connection, role revision and previous match ID. Ready intent is idempotent and event-driven; results withdraw this connection's intent. Superseded async intent operations are aborted so old cleanup cannot delete a newer explicit consent.
- Fresh guest approval is bound to the previous match ID in addition to settings and role generations. Starting/cancelling an attempt consumes approval; host transfer also invalidates it. Active countdown approval remains bound to its frozen previous ID.
- New starts freeze roundVersion 1 and previousId. Server creation/readiness/approval checks block stale consent and legacy rematch bypass; readiness withdrawal cancels a countdown before gameplay. Legacy first/active matches remain supported/cancellable during rollout.
- Every new round has a different ID and seed (repeated RNG output is adjusted), with fresh engine/Battle/collector instances. Old snapshot, attack and finish records are ignored by match identity; both players' local result history remains intact. Countdown display refreshes time immediately for a subsequent attempt.
- Added unit and server tests for intent schema, exact connections/roles/rounds, approval consumption, fresh seed wrapping, stale/forged intents and protocol migration. Real two-session tests cover readiness while the peer reviews results, fresh approval, transfer between rounds, reused settings, new ID/seed, cleared Hold/board/score/penalties and preserved history. Full branch CI passed for `0ddf8c4`: https://github.com/BadBagel47/bricks/actions/runs/42402648129 . Includes real Battle rematch, one-sided readiness blocking, fresh approval, current-host handover, new ID/seed, retained defaults/history, zeroed play/Hold/attack state and all prior suites. Pages deployment was skipped as intended.

## Milestone 3.10
- Main `5744540` passed complete CI and deployed Pages: https://github.com/BadBagel47/bricks/actions/runs/42327837605 . Includes both-device archives, quota-error retry, retained results after peer exit, reload/name-change persistence, focus/mobile width checks, Battle ranking/statistics and all existing suites. Live: https://badbagel47.github.io/bricks/?v=5744540 .
- Owner authorized full match results and local highscores, with consolidated manual review. Completed Score Duel/Battle now show a full results page with both historical names, scores/levels/lines, winner/draw, point difference, Battle survival/attack counters and the relevant local ranking.
- A per-match collector emits exactly once after own final acknowledgement and the opponent's current terminal data (plus both Battle finishes). It can finish after the game view unmounts if an acknowledgement is late. Frozen results stay visible when the other participant leaves; incomplete/disconnected matches do not create records.
- Version-1 local match archive stores both participant records atomically on each device, deduplicated by match ID (individual record IDs are match+UID). Web Locks serialize same-origin tab writes where supported. Storage errors are visible and retryable; corrupt/future envelopes and quota failures do not overwrite history. No Firebase result writes/listeners/rule changes.
- Score Duel top ten includes both participants, by points, then earlier match date and record ID. Battle aggregates by UID and ranks wins, win percentage (all completed games including draws), total points, then UID; historical names remain in per-match records, with latest recorded name used only as the aggregate label.
- Added mode-specific rankings to High Scores; solo highscores remain separate. Result navigation offers Return to lobby and Main Menu; dedicated rematch/readiness/approval coordination remains 3.11.
- Added seven unit tests for partial/stale/unacknowledged finals, delayed acknowledgements, frozen names, Battle draws, duplicate/concurrent persistence, storage failure protection and ranking identity/ties. Expanded two-session tests for both-device archives, retry after quota failure, retained results after peer exit, reload/rename persistence, results focus/mobile overflow and Battle statistics/ranking. Complete main CI passed for `5744540` (https://github.com/BadBagel47/bricks/actions/runs/42327837605); publication succeeded.

## Milestone 3.9
- Main `1eaa086` passed complete CI and deployed Pages: https://github.com/BadBagel47/bricks/actions/runs/42323293594 . App code is unchanged from checked `8a90d27`. Live: https://badbagel47.github.io/bricks/?v=1eaa086 .
- Owner confirmed publication of the checked Battle rules on 2026-11-07. Proceeding with deployment of the unchanged tested client; no manual game review is required now.
- Owner authorized Battle penalties while retaining consolidated manual playtesting. Multi-clears generate 0/1/2/4 rows for 1/2/3/4 lines. Outgoing rows cancel the oldest queued incoming rows, then remaining incoming rows rise at the lock/clear boundary. No combo/T-spin/drop bonuses.
- Added pure Battle adapter over the existing engine: cumulative incoming-prefix deduplication, bounded numeric queues, overflow/collision Game Over, grey garbage with one independently seeded hole per row, and no piece-stream consumption. Inputs and gravity use a shared server-clock-anchored 60 Hz timeline; catch-up records the exact simulated elimination frame.
- Added bounded per-player attack prefixes and immutable finishes. Each row's unique identity is (match ID, sender UID, ordinal); overwritten cumulative prefixes recover skipped/coalesced updates without duplicate application or growing history. Attacks stop at the server once either participant is eliminated. Race with an opponent's final snapshot suppresses unsent rows rather than failing board synchronization.
- Both players continue to Game Over; confirmed elimination frames determine survival victory or a draw. A higher-scoring player can lose by finishing first. Basic queue/sent/applied/cancelled counters and survival outcome are shown; full result persistence/highscores/rematches remain later milestones.
- Battle protocol marker prevents old clients from silently starting Battle without penalties. Legacy starts remain cancellable and show a restart instruction in the new client. Score Duel retains its snapshot schema and existing rules; Battle allows the grey-cell encoding and adds two participant-only paths.
- Local lint/build, 119 unit tests and 15 production single-player Chromium checks passed. Complete branch CI passed for `8a90d27`: https://github.com/BadBagel47/bricks/actions/runs/42310387560 . Includes actual multi-row-clear attack emission, queued delivery, boundary application, duplicate suppression, terminal stability, survival victory despite lower score, protocol upgrade/cancellation, attack/finish authorization and all earlier suites. Pages deployment was skipped as intended. Stage on milestone-3.9; new reviewed rules must be installed before main activation. No administrator identity is attached.

## Milestone 3.8
- Main `a3db2c0` passed complete CI and deployed Pages: https://github.com/BadBagel47/bricks/actions/runs/42296466728 . Includes two-session survivor continuation, victory by points despite earlier Game Over, acknowledged final states, stable terminal snapshots, reciprocal win/loss, zero draw, fresh-match reset and keyboard exit. Live: https://badbagel47.github.io/bricks/?v=a3db2c0 .
- Owner authorized Score Duel and consolidated manual playtesting. Implemented independent continuation after the first Game Over, a waiting/saving state and win/loss/draw once both final scores are confirmed. Highest points win; survival order has no effect. No penalty rows.
- Own final score becomes eligible only after the existing snapshot write is acknowledged; opponent final score must belong to the current match/selected connection. The existing terminal snapshot rules prevent subsequent score changes. Synchronization failure or leaving/disconnection cannot create a result.
- Outcome is derived from the two existing bounded snapshots. No new database paths, writes, listeners, credentials or Firebase rules. No owner rule-publication step is needed. Final senders now stop their local polling after acknowledgement.
- Completed players can return to the lobby directly; unfinished players get an explicit confirmation before cancelling both games. Tab/Space work on the completed-match action. No local highscore is written; full results/highscores/rematches remain later milestones.
- Added 3 unit tests for incomplete/unacknowledged finals, win/loss symmetry and zero/positive draws. Added two-session coverage for a higher-scoring player who finishes first, continued survivor control, stable final snapshots, reciprocal outcomes, stale-state reset, keyboard exit and a zero-score draw with the opposite finish order.
- Local lint/build, 112 unit tests and all 15 production single-player Chromium regression tests passed. Full Firebase/two-session CI and Pages publication passed for `a3db2c0` (https://github.com/BadBagel47/bricks/actions/runs/42296466728). Firebase rules are unchanged from published 3.7.

## Milestone 3.7
- Publication retry succeeded: main `ae0f5c8` passed all tests/build and deployed Pages in run https://github.com/BadBagel47/bricks/actions/runs/42293952072 . App code is unchanged from checked `a4d5641`. The first deploy service failure did not require code, credential or rules changes.
- Main `76cc92e` passed all build/test checks, but Pages run https://github.com/BadBagel47/bricks/actions/runs/42267746304 failed in the deploy job with “Deployment failed, try again later.” No application or rules failure was reported. Retrying publication without app-code changes; production status remains unverified until a deployment succeeds.
- Owner confirmed publication of the checked 3.7 snapshot rules. Proceeding with main deployment of the unchanged tested client; no manual playtest is required at this checkpoint.
- Owner asks to consolidate manual playtesting into larger playable checkpoints; 3.7 explicitly approved without manual 3.6 review. Later competitive rules/results milestones remain separate.
- Added locally simulated multiplayer with saved keyboard/gamepad/touch/swipe controls, audio, complete own/opponent boards, score/level/lines, Next/Hold, signed score difference and Game Over status. Pure engine remains independent; no multiplayer highscores/results or Battle penalties yet.
- Opponent display protocol packs the visible 200 cells into 200 characters; strict 11-field snapshots stay below 600 bytes in tests. Changed-only writes wait at least 500 ms after acknowledgement; listeners read only the opponent path. No per-frame/key traffic, heartbeats, growing match history or paid service.
- Snapshot rules bind writes to the current ready match, participant UID, frozen connection and presence; constrain schema/ranges, monotone sequence/counters, server timestamps, 500 ms minimum intervals and terminal Game Over. Snapshots are display-only and do not provide server-authoritative anti-cheat or full recovery.
- Extra tabs cannot control an already selected connection. Disconnect cancels the session as in 3.6; complete recovery is 3.12. Esc/the saved Pause key opens a leave confirmation while both games keep running; Tab stays on the game/dialog and boards remain unfocusable.
- Shared board/touch/preview components extracted with no single-player rule changes. Local lint/build, 109 unit tests and all 15 production Chromium single-player regression tests passed. Complete branch CI passed for `a4d5641`: https://github.com/BadBagel47/bricks/actions/runs/42261496444 . Includes actual line-clear score mirroring, independent keyboard/touch play, payload/rate budget, terminal Game Over, Tab/dialog focus, mobile portrait/landscape fit, countdown clock skew/cancellation and all server authorization/rate/replay checks. Pages deployment was skipped as intended. New rules must be published before activating the main client.

## Milestone 3.6
- Owner confirmed the reviewed countdown/lock rules published. Main commit `1d97208` passed complete CI and deployed Pages: https://github.com/BadBagel47/bricks/actions/runs/42258240145 .
- Owner approved the countdown/seeded-start milestone. Added a server-timestamped five-second preparation, frozen settings/identities/role generation/connection IDs and common seed.
- Rules enforce current host authority, both selected connections, current optional approval, server deadline and immutable bundle; active preparations lock settings and room/host mutations. Stale cancellation cannot overwrite another start id.
- Fresh presence IDs after reconnect prevent old socket identities being reused. Participants cancel an interrupted preparation; explicit lobby exit cancels before leaving. Full recovery/active-control leases remain future work.
- Ready state derives identical engine initial state locally and shows opening piece/preview/score. No live multiplayer controls, snapshots, penalties or results are implemented yet.
- Lint/build and 106 unit tests passed locally. Emulator/browser tests include clock skew, approval/lock enforcement, five-second deadline, equal starts, disconnect cancellation and leave. Full branch CI passed for `7ace18f`: https://github.com/BadBagel47/bricks/actions/runs/42257292319 . Includes a guest clock skewed by two minutes, server deadline/authorization checks, equal initial state, disconnect cancellation, restart and explicit leave. Publish reviewed rules before client activation.

## Milestone 3.5
- Owner confirmed the updated editor-marker rules published. Main commit `96f40fe` passed full CI and deployed Pages: https://github.com/BadBagel47/bricks/actions/runs/42139135333 .
- Owner approved the host-configuration waiting milestone. Added current-host/role/epoch-bound per-tab editor markers, onDisconnect cleanup and guest waiting status without draft exposure.
- Apply/Cancel/transfer/leave and disconnected host presence end the relevant waiting state. Multiple host editors are independent; waiting continues if another current host tab still edits.
- Added all 50 approved spec messages, local eight-second shuffle-bag rotation, session persistence and five-message cycle boundary exclusion. No timed Firebase writes.
- Fixed an initial admission race by starting participant-only settings/presence reads after membership confirmation, and clearing admission before retries. No read rules were broadened.
- Added rule impersonation/payload tests and two-browser waiting lifecycle coverage; 103 unit tests, lint and build passed locally. Full branch CI passed for `064528b`: https://github.com/BadBagel47/bricks/actions/runs/42135488117 . Includes waiting lifecycle, real eight-second text changes, host disconnect/reconnect, editing-tab close while another host tab remains, and Leave Lobby. Rules must be published before activating the client.

## Milestone 3.4
- Owner update 2026-11-06: remove the room-code editor entirely and generate four-character random codes. Preserve legacy room links and reservations; code allocation remains atomic with bounded retries. Local lint/build and 101 unit tests passed. Full branch CI passed for `b14e533`: https://github.com/BadBagel47/bricks/actions/runs/42128209110 . Owner confirmed the updated short-code rules published. Git writes initially failed with `fatal error in commit_refs_rules`, then a normal retry succeeded without credential or permission changes. Main commit `1dd23d3` passed full CI and deployed Pages: https://github.com/BadBagel47/bricks/actions/runs/42130254615 . The underlying transient server failure was not independently diagnosed.
- Owner confirmed the new settings/approval rules published. Main commit `72da24e` passed full CI and deployed Pages: https://github.com/BadBagel47/bricks/actions/runs/42097090846 .
- Owner approved proceeding after the published 15-second guest-cleanup correction.
- Implemented private host drafts, Apply/Cancel, revisioned Score Duel/Battle mode, level 00–19, Hold and optional guest approval. No-op publication does not write or invalidate approval.
- Added guest-only approval bound to settings revision, player identities and an incrementing host-role generation; transferring twice cannot revive old approval. Old rooms treat absent roleRevision as zero.
- Added model validation tests, server authorization/revision tests and two-browser UI coverage. Lint/build and 101 unit tests passed locally; full branch CI passed for `3a0b659`: https://github.com/BadBagel47/bricks/actions/runs/42061752873 . Final branch CI also passed with the explicit published-change approval assertion for `cdebc0c`: https://github.com/BadBagel47/bricks/actions/runs/42062286973 . Stage on milestone-3.4 until the owner publishes new rules; do not activate main beforehand.
- Next checkpoint after deployment/review is 3.5, dedicated host-configuration waiting screen. Recommend GPT-6.1 Sol Medium for synchronized status and permissions (Luna Medium for isolated UI polish).

## Milestone 3.3
- Follow-up: owner reported no replacement could join after a guest closes the tab/browser. Explicit Leave Lobby replacement passed branch CI (`daa1183`, run 42057152136). Added host-driven release after 15 seconds of guest absence, protected by server rules checking every guest presence connection. The owner confirmed the updated cleanup rules published. The 15-second version passed branch CI for `5c1f00a`, then main commit `a81a25d` passed full CI and deployed Pages: https://github.com/BadBagel47/bricks/actions/runs/42058999029 . Live cleanup review remains pending. Local lint/build and 99 unit tests also passed.
- Owner confirmed the new database rules are published. Main commit `baa7b30` passed all CI gates and deployed Pages: https://github.com/BadBagel47/bricks/actions/runs/42000586479 . Live two-browser lobby review remains pending.
- Rotation review found that I/S/Z collapsed after two states, causing a one-cell pivot snap. These pieces now retain all four geometric pivot positions; targeted engine tests verify half-turn offsets and full-turn return.
- Rotation pivot correction passed `npm run lint`, `npm run build`, `npm test` (99 passed) and `npm run test:browser` (15 passed). Main commit `3b5cce9` passed full CI and deployed Pages: https://github.com/BadBagel47/bricks/actions/runs/42034248905 .
- Added root `HANDOVER.md` as the current-session index for owner-approved goals, workflow, current checkpoint/model, deployment/access state, limitations and links to detailed sources. `AGENTS.md` now requires reading and maintaining it at new sessions/checkpoints.
- Access review: no Google outbound identity is attached, and current tools cannot provision one. Recommended future deployment is a dedicated GitHub Actions identity using Google Workload Identity Federation; setup and limitations are documented in `docs/FIREBASE_ACCESS.md`. No credentials, IAM roles or billing settings were changed.
- Owner approved lobby/host-role work with explicit free-tier quota optimization.
- Added atomic host transfer, automatic handover on host leave, and last-player close; immutable reservation ownership survives role changes.
- Added participant/epoch-scoped connection status via onDisconnect with no application heartbeats, bounded per-connection presence payloads and listener/socket cleanup on lobby exit or failed entry.
- Added malicious host-transfer/presence rules checks and two-browser UI coverage for disconnect/reconnect, transfers, host departure and socket release.
- Recorded the Spark budget, monitoring and retention constraints in `docs/FIREBASE_QUOTA.md`. Current official pricing could not be refreshed (cloud proxy 403); reference limits are explicitly marked as planning baselines.
- Full branch CI passed for `096240c`: https://github.com/BadBagel47/bricks/actions/runs/41942127658 . Includes rules/security tests and real browser rooms, presence, reconnect, transfer, host departure and connection release; Pages deployment was skipped by design. Local lint/build and 98 unit tests passed; the 15 single-player browser tests passed. Local emulator rules upload is still blocked by a cancelled loopback request despite the JAR download now succeeding.
- Final branch CI passed for `cc2c9bb`, including the same-identity multiple-tab presence check: https://github.com/BadBagel47/bricks/actions/runs/41942604689 . Pages deployment was skipped. Production remains on 3.2 until the owner publishes the reviewed rules. After that, record rule deployment in a normal commit and push to main to activate Pages.
- New rules must be published before activating the client. CI runs on `milestone-3.3` without deploying Pages; main retains the working 3.2 client until the owner installs the new rules.

## Completed
- React + TypeScript + Vite foundation, first-launch player name, main menu, personal-name settings, responsive base layout and original block/text mark.
- Owner's copy review: retained “Make room for one more.”; removed decorative subheadings, greetings, slogans, menu descriptions and footers.
- Standalone immutable TypeScript engine: 10 × 20 board, all seven pieces, anchored rotations without kicks, collision, movement, spawning and locking.
- Fixed 60 Hz gravity with fractional elapsed-time accumulation and single-player pause/resume.
- Soft Drop and optional personal Hard Drop (default ON) award no points; manual falling cannot be repeated to farm score.
- One- through four-row clears, classic-inspired scores, starting levels 0–19 and documented transition thresholds/gravity through level 29+.
- Optional Hold (default OFF), once per active piece; preview consumption, swap/reset and blocked-spawn Game Over.
- Seeded xorshift32 piece stream with a single repeat/sentinel reroll, serializable version-1 game state and transition events for later UI/audio integration.
- Developer-only board/level/piece scenarios in `src/dev/scenario.ts`; no developer controls in normal menus.
- Engine rules/API and reproducible seed vectors documented in `docs/ENGINE.md`.
- Node.js built-in test runner and strict TypeScript test checks added without new dependencies; Pages CI now includes `npm test`.
- Rendered the 10 × 20 playfield with active and locked pieces, level-dependent piece palettes, next-piece preview and score/level/line HUD.
- Added keyboard movement, timed key repeat, soft drop, rotations, hard drop, pause/resume (P or Escape), visibility pause and Game Over actions.
- Added persistent, conflict-checked keyboard remapping in Settings. Hold stays inactive in gameplay until enabled in 1 Player Settings.
- Added locally persisted Personal Settings for the player's name, keyboard bindings and Hard Drop preference.
- Added 1 Player Settings for the saved starting level (00–19) and Hold preference. New games use the saved values, and the HUD shows Hold only when enabled.
- Added a versioned local top-10 highscore store, sorted by score, with run-ID duplicate protection and immutable historical usernames.
- Added the High Scores page and a Game Over result screen with final score/level/lines, rank, new-record message, score table, Play Again and Main Menu.
- Added an original looping 8-bit-style melody synthesized with Web Audio; no external tracks or assets are used.
- Added Personal Settings for Music ON/OFF and volume, plus Sound Effects ON/OFF and volume. Both default ON with volume at 70%, and are saved locally.
- Added short original tones for rotation, Hold, locking, Hard Drop, line clears and Game Over.
- Accelerates the melody from 390 ms to 230 ms per note and raises it an octave when the locked stack occupies the top five rows.
- Initializes or resumes Web Audio from the player's Start/Resume gesture, and pauses/stops game music with pause, Game Over and return to menu.
- Added responsive virtual D-Pad and A/B-style rotation buttons, Hard Drop, optional Hold and Pause controls outside the playfield. Movement buttons repeat while held.
- Added the persisted Swipe alternative: tap to rotate, horizontal swipe to move, downward swipe to soft drop and upward swipe to hard drop.
- Added saved touch-button sizing, left-handed layout and the option to hide touch controls while a gamepad is connected.
- Added generic Gamepad API polling with standard face/D-pad buttons, analog movement, held-button repeat, hot connection status and clean disconnect fallback.
- Added persistent conflict-checked controller-button remapping and Reset to Defaults for both keyboard and controller mappings.

- Completed the Phase 1 integration review in `docs/PHASE1_REVIEW.md`, including preview/palette fixes, input lifecycle and timing regressions, accessible select labels and mobile viewport corrections.
- Added reproducible production-browser integration tests using system Chromium/Chrome and `playwright-core`; Pages CI now runs them before deploying.
- The owner accepted Phase 1 by confirming the published build works.
- Added screen-reader announcements for line clears, level changes, pause/resume and Game Over; the visual board is now announced as a 10 × 20 game board instead of exposing 200 decorative cells.
- Browser coverage verifies the board's accessible name and pause/resume/Game Over announcements.
- Added predictable keyboard focus when navigating between screens and into pause/Game Over dialogs.
- The game board is not focusable. Keyboard gameplay shortcuts work regardless of focus; Tab stays on the page without focusing the board or triggering a blur pause. The logo is plain branding with no link or tab stop, and there is no Main Menu action on the playing screen. Mobile touch controls remain keyboard reachable except the Pause button, which stays out of the Tab order. Dialogs keep their own focus cycles. Keyboard instructions are plain text; P/Escape and the mobile Pause button open the pause dialog.
- Browser coverage verifies that repeated Tab presses never focus the board or blur the page, shortcuts still work, the mobile Pause button opens the dialog, and dialog focus remains contained.
- Owner follow-up checks after removing board focus: `npm test` 90 passed; `npm run test:browser` 15 passed; `npm run build` and `npm run lint` passed.
- Marked pause and Game Over overlays as modal dialogs for assistive technology, moved them outside the game page, and made the page inert while a dialog is open. Tab/Shift+Tab remain inside each dialog.
- Browser coverage verifies dialog names, the inert background, focus wrapping in both directions, and repeated Tab presses.
- Initialized music and effects gain nodes at zero before ramping to the saved volume, preventing the initial full-volume transient.
- Browser audio instrumentation verifies both output gains begin their volume ramps at zero.
- Pause and returning to the menu cancel queued effect notes and fade active music/effects out over 8 ms, stopping their oscillators after 10 ms.
- New games reset the melody and danger tempo, and cancel leftover Game Over sounds. Resume continues the melody without reviving interrupted effects.
- Volume changes preserve the melody position; muting effects cancels their queued notes.
- Deterministic audio lifecycle tests cover pause, resume, rapid replay, menu exit, the complete Game Over sound, and volume changes.
- Raised touch-button minimums to 48 × 48 px and kept the responsive control sizing within narrow screens.
- Improved the readability of mobile gameplay instructions, swipe guidance, controller status and game-stat labels.
- Added a mobile/tablet Pause button that opens the pause dialog while staying out of the normal Tab order.
- Added an isolated Firebase client with persisted anonymous identity, concurrent sign-in deduplication, strict emulator/production configuration separation and player-safe errors. The single-player app initializes no Firebase services.
- Added immutable, identity-bound room-code reservation rules. Sessions and presence remain denied pending their feature milestones.
- Added local Auth/Realtime Database emulator scripts and real permission, concurrent reservation and two-browser anonymous-authentication tests. Their CI gate is active and passed before Pages publication.
- Documented the remaining room/session data model, transactions, host ownership, state transitions, synchronization, recovery and Spark limitations in `docs/MULTIPLAYER.md`.
- Added a lazily loaded 2 Players screen with Host Game, Join Game, original-code reopening and bounded room-code validation.
- Added atomic two-player membership with complete host/owner/epoch invariants, guest leave, host close and owner-only reopening. Code changes reserve a target and close the original only while empty.
- Invitation URLs retain the actual origin and path, survive username onboarding and reload, and remain in the address bar. Copy actions include exact-text fallback when clipboard permission is denied.
- Added readable missing/closed/full/invalid/expired room errors and safe unavailable status when no Web App configuration exists. Pages build wiring accepts the public Web App fields through repository Actions variables.
- Added concurrent guest-claim and malicious-payload rule tests plus actual UI tests for host, invited guest, third-player rejection, reload, close/reopen, clipboard denial and a 320 px layout.

## Validation
- `npm test`: 97 passed, 0 failed, 0 skipped. Includes room-code normalization, invitation paths, bounded room snapshots and guest claims as well as the previous suites.
- `npm run build`: passed (TypeScript and Vite).
- `npm run lint`: passed.
- `npm run test:browser`: 15 passed, 0 failed, 0 skipped in Chromium against the production build. Covers full run/results/rename/replay, keyboard focus navigation, saved settings, touch events, simulated gamepad lifecycle, real Web Audio initialization/muting, oscillator shutdown and Game Over menu exit, frame stalls and five viewports with largest touch controls.
- Phase 2.5 checks: `npm run build` and `npm run lint` passed. `npm run test:browser`: 15 passed, 0 failed, 0 skipped, including mobile pause/resume and complete playfield/largest touch-control fit at 320 × 667, 390 × 844, 844 × 390, and 800 × 600.
- Earlier local Firebase emulator downloads failed with proxy 403. During 3.3 the official JAR downloaded successfully, but the CLI upload to the loopback rules endpoint is cancelled in this environment, including with loopback NO_PROXY entries. No local full emulator pass is claimed; complete 3.2 and 3.3 suites passed in CI.
- `npm run test:firebase:auth`: 2 passed, 1 explicitly skipped. Chromium verified unconfigured invite onboarding, two distinct anonymous identities, deduplicated sign-in and identity persistence after reload; the database ownership check was skipped by this partial command.
- Reinstalled successfully with `npm ci --cache /tmp/bricks-npm-cache`. The environment draft also saves reproducible installation/startup instructions. It does not configure a real Firebase project.
- GitHub Git read/push access was restored. The complete workflow passed for `522f4a9`, including `npm run test:firebase`, the unit/browser suites, lint, build and Pages deployment: https://github.com/BadBagel47/bricks/actions/runs/39409758196 . CI results are distinct from the blocked local database-emulator startup and from live Firebase deployment.
- Milestone 3.2: full CI and Pages deployment passed for `38d492d`: https://github.com/BadBagel47/bricks/actions/runs/39471615039 . This includes the actual room UI in separate browser sessions and the expanded concurrency/permission suite. Firebase's unsupported name regex was replaced with validated string operations before this successful run.
- Owner reports the live Firebase Realtime Database rules are published, Anonymous Auth is enabled, and all five public Firebase Web App values are configured as GitHub Actions repository variables. A Pages rebuild is needed to put those values into the hosted client bundle; live room creation still needs verification after deployment.
- When the owner retried room creation after adding the GitHub Pages domain to Authorized domains, the generic unavailable message persisted. The UI now includes a sanitized Firebase error code when present; lint and production build pass. Use the next live retry to identify the remaining setup issue.
- The live Authentication signup response identified `API_KEY_INVALID`. The owner has replaced the GitHub Actions API-key variable by copying directly from Firebase. Rebuild Pages to include the corrected value, then verify room creation again; no key value is recorded here.

## GitHub Pages
- Owner approved GitHub Pages as temporary preview hosting and enabled it for this repository.
- `.github/workflows/pages.yml` publishes on pushes to `main`; relative build URLs support `/bricks/`.
- Preview: https://badbagel47.github.io/bricks/ . The owner confirmed the builds through 1.6. The 1.7 deployment starts on push and includes the new browser-test gate.
- Milestone 1.1 publication was verified through GitHub Actions. Direct site/API requests from this cloud instance were previously blocked by network policy; required domain additions were saved in the environment draft.

## Known limitations / remaining work
- Engine mechanics are NES-inspired and documented, not cycle-accurate NES emulation.
- Chromium desktop/mobile viewport, touch-event and simulated gamepad tests passed. Physical devices and subjective audio quality remain unverified here.
- Touch and gamepad behavior should be checked on the owner's physical devices.
- Live 3.2 room creation and two-player joining are confirmed by the owner. The owner reports updated 3.3 rules published and CI deployed the new client; live lobby review remains pending.
- Published 3.10 includes live multiplayer, Score Duel/Battle outcomes, full frozen results and local mode-specific rankings. Coordinated rematches, recovery and final integration/security review remain later milestones.
- Presence and host transfer are implemented. The host releases an absent lobby guest after 15 seconds; active interruptions currently cancel the session. Snapshot schema/ownership checks are in 3.7; coordinated recovery, robust active-control leases and Battle remain later milestones.
- The graphical style does not need to be finalized before gameplay integration.

## Next recommended task
- Phase 4: owner completes the domain setup in `docs/DEPLOYMENT.md`, then a consolidated live two-device playtest against its checklist; record observed results here.
- Review the findings in `docs/PHASE3_REVIEW.md` and decide the intended level of public access, abuse resistance and trusted competition before Phase 4. Continue consolidated manual playtesting.
- Recommended model: GPT-6.1 Sol Medium for focused quota and abuse mitigation planning; GPT-6.1 Terra High for server-authoritative competitive architecture.

## Git checkpoints
- `fea6aa4`: initial foundation and Pages deployment.
- `41766b9`: simplified interface copy; owner subsequently approved 1.1.
- `2b6c6c3`: Milestone 1.2 engine, documentation, tests and CI gate.
- `e2d0e23`: Milestone 1.3 playable single-player integration.
- `1679c3b`: Milestone 1.4 settings and local highscores.
- `a2e20db`: Milestone 1.5 original Web Audio soundtrack and effects.
- `0a67fac`: Milestone 1.6 touch and gamepad controls.
- The Milestone 1.7 checkpoint contains integration fixes, Chromium tests, CI gate and the Phase 1 review report.

- 3.12 is in progress, unpublished: the client captures a compact immutable checkpoint in the same atomic update as each display snapshot. Candidate rules restrict its size, owner and session; recovery candidates are checked against snapshot identity/content and Battle stream counters. Local lint, build, 143 unit tests and 15 browser tests passed. Full Firebase emulator and two-session checks passed for checkpoint commit `ce7ce0f`: https://github.com/BadBagel47/bricks/actions/runs/42424178579 . Local rules upload was cancelled. The atomic snapshot/checkpoint test does not establish that server rules require all clients to pair writes; restores must still validate pairing. A newer pausable Battle clock is integrated but not yet connected to interruption handling. Coordinated pause, durable handoff/leases, actual restoration and two-session recovery tests are unfinished.

- 3.12 control-lease candidate: the selected initial connection acquires a participant-owned lease, and candidate rules allow takeover only once the previous connection's presence is absent. Gameplay write rules reject an old connection when a same-match lease exists, with legacy fallback for matches with no lease. These rules and concurrent-takeover tests need Firebase CI. The actual game still uses frozen start connections and cancels on interruption; this does not implement reconnection. Local lint, build and 144 unit tests passed.

- 3.12 pause candidate: CI passed for the control-lease rules and integration at `68eac6f`: https://github.com/BadBagel47/bricks/actions/runs/42425943315 . New, not yet CI-verified work creates a server-timed shared pause on a missing selected connection, freezes local input/timing and gameplay writes, and abandons after 30 seconds without recording a result. The selected game cannot resume yet: connection handoff, checkpoint restoration and resume authorization remain outstanding. Local lint, build and 145 unit tests passed.

- 3.12 pause/abandon passed Firebase rules, two-session and complete CI at `03131f6`: https://github.com/BadBagel47/bricks/actions/runs/42426380149 . New readiness logic acquires a connection lease and validates the saved state, displayed snapshot and Battle stream prefixes before writing an identity-bound confirmation; rules bound it to the paused match and server deadline. The latest readiness and two-session reconnect changes still require CI. No automatic resume exists yet.

- Recovery readiness and two-browser reconnect/confirmation passed full CI at `5b83ee2`: https://github.com/BadBagel47/bricks/actions/runs/42426765152 . A publisher can now be initialized from a validated prior snapshot to continue its sequence while respecting the interval; this helper passes locally with 146 unit tests, lint and build but is not connected to actual resume. Match resumption remains unfinished and all 3.12 work stays on the test branch.

- New resumption candidate restores both saved boards after a server transaction checks the two readiness records, leases, active connections, deadline and equal Battle frame. Snapshot sequences and Battle counters continue from acknowledged values. Firebase security and real two-session tests are awaiting CI. Current candidate only resumes while both boards are still playing; it requires equal saved Battle frames and cancels on a later interruption. Do not deploy as completed 3.12 until these limitations and race cases are addressed and tested.

- First Score Duel resumption passed full CI at `547fc90`: https://github.com/BadBagel47/bricks/actions/runs/42431654868 . Later candidate work supports finished-player snapshots/finishes and brings Battle checkpoints up to the later saved frame before delivering newer attack prefixes, with server-enforced maximum skew for two active boards. Tests for Battle and terminal recovery await CI. A second interruption still cancels and must be addressed before publication. Local lint, build and 148 unit tests passed.

- CI for terminal/Battle candidate `22b1557` failed a post-resume movement assertion: https://github.com/BadBagel47/bricks/actions/runs/42432133401 . The test could interact before the paused view changed; a later candidate waits for both clients. It also supports repeated interruption cycles with fresh readiness records and server deadlines. These changes, Battle recovery and terminal results require full Firebase/browser CI; no publication yet.

- Repeat recovery, Battle queued attacks and finished-player results passed full CI at `3253fc4`: https://github.com/BadBagel47/bricks/actions/runs/42432663844 . Subsequent candidate changes improve recovery-clock startup with delayed local presence, bound Battle catch-up for active players, and test reload and guest controls during a second interruption. The local Firebase suite passed 41 tests; targeted two-browser reload/control and Battle terminal-recovery tests passed. With the emulator JAR cached, `env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u ALL_PROXY -u all_proxy npm run test:firebase` avoids this environment's loopback proxy cancellation. Final CI still needs verification. Do not publish until the latest changes pass full CI.

- A separate two-browser test also passed locally with the host disconnected and the guest coordinating recovery. The production client remains unchanged until checked rule publication and Pages deployment.

- Full CI passed for `ac4787f`: https://github.com/BadBagel47/bricks/actions/runs/42433459138 . A subsequent guard keeps a reconnecting tab paused until its selected connection is current; targeted host, guest/reload and Battle tests passed locally. A server test also confirms that resume after the deadline is denied. Final full CI for these changes is required before the owner publishes rules.

- Final 3.12 branch CI passed for `03d97ed`: https://github.com/BadBagel47/bricks/actions/runs/42433827743 . It covers two-session host/guest recovery, repeated interruptions and reload, Battle queued attacks, finished-player results, 30-second abandonment, stale control/consent, deadlines, and the previous automated suites. Owner must publish `firebase/database.rules.json` from that commit before main deployment. Checkpoints restore the latest acknowledged state; recent actions can be lost and inconsistent or unavailable state abandons without a result. No heartbeat or paid backend was added.

- Owner confirmed checked recovery rules published. Main `09a7cb6` passed complete CI and Pages deployment: https://github.com/BadBagel47/bricks/actions/runs/42434535645 . Source matches tested `03d97ed`. Direct live HTTP access is blocked by the environment proxy (403), so no live Firebase gameplay verification is claimed.
- Live `/api/access` returned 503. Renamed Worker API-key entry from VITE_FIREBASE_API_KEY to FIREBASE_API_KEY, but this did not resolve it. Read-only GitHub health checks and fixed public stage codes isolated GOOGLE_CONNECTION_FAILED. Official Cloudflare docs confirm Workers rejects Fetch redirect:error before sending; adapters now use manual and reject non-success responses. Added real workerd coverage for OAuth, database, Mailjet and player identity requests and refusal of 3xx responses. 179 local tests, lint and build pass; correction deployment/live verification pending.

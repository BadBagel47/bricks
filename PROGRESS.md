# Bricks progress

- **Phase:** 3 — Multiplayer (explicitly approved by the owner)
- **Milestone:** 3.7 — Live boards and score synchronization
- **Status:** Owner waived manual review of 3.6 and authorized 3.7. Owner confirmed the checked snapshot rules published. 3.7 source `a4d5641` passed full branch CI; main deployment is now pending.
- **Previous milestones:** Phases 1 and 2 were accepted by the owner when approving Phase 3. Line-clear scoring is approved; manual drops award no points. Interface copy must remain direct and functional.

## Milestone 3.7
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
- Published 3.6 has the room flow/countdown and read-only starting state. Staged 3.7 adds interactive controls and live opponent boards; competitive completion/results remain later milestones.
- Presence and host transfer are implemented. The host releases an absent lobby guest after 15 seconds; active interruptions currently cancel the session. Snapshot schema/ownership checks are in 3.7; coordinated recovery, robust active-control leases and Battle remain later milestones.
- The graphical style does not need to be finalized before gameplay integration.

## Next recommended task
- Verify the 3.7 main CI and Pages deployment. Owner manual testing may wait for a larger checkpoint.
- Next milestone 3.8 is Score Duel; recommend GPT-6.1 Sol Medium.

## Git checkpoints
- `fea6aa4`: initial foundation and Pages deployment.
- `41766b9`: simplified interface copy; owner subsequently approved 1.1.
- `2b6c6c3`: Milestone 1.2 engine, documentation, tests and CI gate.
- `e2d0e23`: Milestone 1.3 playable single-player integration.
- `1679c3b`: Milestone 1.4 settings and local highscores.
- `a2e20db`: Milestone 1.5 original Web Audio soundtrack and effects.
- `0a67fac`: Milestone 1.6 touch and gamepad controls.
- The Milestone 1.7 checkpoint contains integration fixes, Chromium tests, CI gate and the Phase 1 review report.

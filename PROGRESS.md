# Bricks progress

- **Phase:** 3 — Multiplayer (explicitly approved by the owner)
- **Milestone:** 3.2 — Rooms and invitation links
- **Status:** Implemented; full emulator/CI verification in progress. Live Firebase configuration is still missing.
- **Previous milestones:** Phases 1 and 2 were accepted by the owner when approving Phase 3. Line-clear scoring is approved; manual drops award no points. Interface copy must remain direct and functional.

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
- Local `npm run test:firebase` still cannot start: the official database-emulator JAR download is blocked by the HTTP proxy (403 for `storage.googleapis.com`), even though the runtime now lists that host as allowed. No local database test is claimed as passed. The 3.1 suite passed in CI; the new 3.2 suite is pending.
- `npm run test:firebase:auth`: 2 passed, 1 explicitly skipped. Chromium verified unconfigured invite onboarding, two distinct anonymous identities, deduplicated sign-in and identity persistence after reload; the database ownership check was skipped by this partial command.
- Reinstalled successfully with `npm ci --cache /tmp/bricks-npm-cache`. The environment draft also saves reproducible installation/startup instructions. It does not configure a real Firebase project.
- GitHub Git read/push access was restored. The complete workflow passed for `522f4a9`, including `npm run test:firebase`, the unit/browser suites, lint, build and Pages deployment: https://github.com/BadBagel47/bricks/actions/runs/39409758196 . CI results are distinct from the blocked local database-emulator startup and from live Firebase deployment.

## GitHub Pages
- Owner approved GitHub Pages as temporary preview hosting and enabled it for this repository.
- `.github/workflows/pages.yml` publishes on pushes to `main`; relative build URLs support `/bricks/`.
- Preview: https://badbagel47.github.io/bricks/ . The owner confirmed the builds through 1.6. The 1.7 deployment starts on push and includes the new browser-test gate.
- Milestone 1.1 publication was verified through GitHub Actions. Direct site/API requests from this cloud instance were previously blocked by network policy; required domain additions were saved in the environment draft.

## Known limitations / remaining work
- Engine mechanics are NES-inspired and documented, not cycle-accurate NES emulation.
- Chromium desktop/mobile viewport, touch-event and simulated gamepad tests passed. Physical devices and subjective audio quality remain unverified here.
- Touch and gamepad behavior should be checked on the owner's physical devices.
- Live Firebase is not configured or deployed. No Firebase project, public Web App configuration or Google identity is attached to this environment.
- Room flows are implemented but cannot connect on the published site until a real project is configured and the reviewed rules are deployed. There is no match start or playable multiplayer yet.
- Presence/disconnect cleanup, host transfer, gameplay snapshot validation, Battle and recovery remain future milestones. Rooms can retain an offline guest slot until that identity leaves or the owner closes the room.
- The graphical style does not need to be finalized before gameplay integration.

## Next recommended task
- Finish 3.2 CI verification and review the room flow. Next is 3.3: lobby and host roles. Recommend GPT-6.1 Sol Medium for host authorization, transfer and presence work; use Luna Medium for later UI-only refinements.
- A real project's public Web App configuration is needed to enable the published room flow. Configure Anonymous Auth and Realtime Database and deploy the reviewed rules on Spark; do not infer live deployment from emulator results.
- Stop at the 3.2 review checkpoint before implementing 3.3.

## Git checkpoints
- `fea6aa4`: initial foundation and Pages deployment.
- `41766b9`: simplified interface copy; owner subsequently approved 1.1.
- `2b6c6c3`: Milestone 1.2 engine, documentation, tests and CI gate.
- `e2d0e23`: Milestone 1.3 playable single-player integration.
- `1679c3b`: Milestone 1.4 settings and local highscores.
- `a2e20db`: Milestone 1.5 original Web Audio soundtrack and effects.
- `0a67fac`: Milestone 1.6 touch and gamepad controls.
- The Milestone 1.7 checkpoint contains integration fixes, Chromium tests, CI gate and the Phase 1 review report.

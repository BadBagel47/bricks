# Bricks progress

- **Phase:** 2 — Polish
- **Milestone:** 2.1 — Accessible game feedback
- **Status:** Implemented; awaiting owner review
- **Previous milestones:** 1.1 was approved; the owner confirmed the published builds through 1.6 work. Visual refinement can continue later; interface copy must remain direct and functional.

## Completed
- React + TypeScript + Vite foundation, first-launch player name, main menu, personal-name settings, responsive base layout and original block/text mark.
- Owner's copy review: retained “Make room for one more.”; removed decorative subheadings, greetings, slogans, menu descriptions and footers.
- Standalone immutable TypeScript engine: 10 × 20 board, all seven pieces, anchored rotations without kicks, collision, movement, spawning and locking.
- Fixed 60 Hz gravity with fractional elapsed-time accumulation and single-player pause/resume.
- Soft Drop (one point per successful cell) and optional personal Hard Drop (default ON, no distance points).
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

## Validation
- `npm test`: 85 passed, 0 failed, 0 skipped. Covers engine behavior, rendering, corrupt mappings, elapsed-time repeats, persistence and audio tempo.
- `npm run build`: passed (TypeScript and Vite).
- `npm run lint`: passed.
- `npm run test:browser`: 13 passed, 0 failed, 0 skipped in Chromium against the production build. Covers full run/results/rename/replay, saved settings, touch events, simulated gamepad lifecycle, real Web Audio initialization/muting, frame stalls and five viewports with largest touch controls.

## GitHub Pages
- Owner approved GitHub Pages as temporary preview hosting and enabled it for this repository.
- `.github/workflows/pages.yml` publishes on pushes to `main`; relative build URLs support `/bricks/`.
- Preview: https://badbagel47.github.io/bricks/ . The owner confirmed the builds through 1.6. The 1.7 deployment starts on push and includes the new browser-test gate.
- Milestone 1.1 publication was verified through GitHub Actions. Direct site/API requests from this cloud instance were previously blocked by network policy; required domain additions were saved in the environment draft.

## Known limitations / remaining work
- Engine mechanics are NES-inspired and documented, not cycle-accurate NES emulation.
- Chromium desktop/mobile viewport, touch-event and simulated gamepad tests passed. Physical devices and subjective audio quality remain unverified here.
- Touch and gamepad behavior should be checked on the owner's physical devices.
- Snapshot validation for untrusted data, Battle, multiplayer and Firebase are not implemented.
- The graphical style does not need to be finalized before gameplay integration.

## Next recommended task
- The first Phase 2 polish checkpoint is ready for owner review. Continue routine polish with Luna; use Sol only for difficult gameplay engineering.
- Stop for approval before multiplayer/Firebase.

## Git checkpoints
- `fea6aa4`: initial foundation and Pages deployment.
- `41766b9`: simplified interface copy; owner subsequently approved 1.1.
- `2b6c6c3`: Milestone 1.2 engine, documentation, tests and CI gate.
- `e2d0e23`: Milestone 1.3 playable single-player integration.
- `1679c3b`: Milestone 1.4 settings and local highscores.
- `a2e20db`: Milestone 1.5 original Web Audio soundtrack and effects.
- `0a67fac`: Milestone 1.6 touch and gamepad controls.
- The Milestone 1.7 checkpoint contains integration fixes, Chromium tests, CI gate and the Phase 1 review report.

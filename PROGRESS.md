# Bricks progress

- **Phase:** 1 — Playable single-player
- **Milestone:** 1.4 — Settings and highscores
- **Status:** Implemented; awaiting milestone review
- **Previous milestones:** 1.1 was approved; the owner confirmed the 1.3 playable Pages version works. Visual refinement can continue later; interface copy must remain direct and functional.

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

## Validation
- `npm test`: 75 passed, 0 failed, 0 skipped. Includes engine behavior, keyboard defaults/remapping and settings/highscore validation, sorting, top-10 limits and duplicate protection.
- `npm run build`: passed (TypeScript and Vite).
- `npm run lint`: passed.
- Started the Vite app and checked its HTTP response and transformed gameplay module locally. No browser automation is configured, so manual visual/play testing remains for the owner.

## GitHub Pages
- Owner approved GitHub Pages as temporary preview hosting and enabled it for this repository.
- `.github/workflows/pages.yml` publishes on pushes to `main`; relative build URLs support `/bricks/`.
- Preview: https://badbagel47.github.io/bricks/ . The 1.3 playable version was confirmed by the owner. The 1.4 deployment starts on push; its live status is pending the Actions workflow.
- Milestone 1.1 publication was verified through GitHub Actions. Direct site/API requests from this cloud instance were previously blocked by network policy; required domain additions were saved in the environment draft.

## Known limitations / remaining work
- Engine mechanics are NES-inspired and documented, not cycle-accurate NES emulation.
- Browser integration was smoke-checked over HTTP but not exercised in a real browser here.
- Audio remains milestone 1.5; touch controls and gamepads remain milestone 1.6.
- Snapshot validation for untrusted data, Battle, multiplayer and Firebase are not implemented.
- The graphical style does not need to be finalized before gameplay integration.

## Next recommended task
- Stop for owner review of 1.4.
- Recommend **GPT-6 Luna, Medium** for 1.5 — music and sound effects.

## Git checkpoints
- `fea6aa4`: initial foundation and Pages deployment.
- `41766b9`: simplified interface copy; owner subsequently approved 1.1.
- `2b6c6c3`: Milestone 1.2 engine, documentation, tests and CI gate.
- `e2d0e23`: Milestone 1.3 playable single-player integration.
- The Milestone 1.4 checkpoint contains settings, local highscores, tests and this progress update.

# Bricks progress

- **Phase:** 1 — Playable single-player
- **Milestone:** 1.3 — Gameplay rendering and keyboard controls
- **Status:** Implemented; awaiting milestone review
- **Previous milestone:** 1.1 approved by the owner. Visual refinement can continue later; interface copy must remain direct and functional.

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
- Added persistent, conflict-checked keyboard remapping in Settings. Hold is shown as a configurable binding but remains disabled in gameplay until its later settings milestone.

## Validation
- `npm test`: 71 passed, 0 failed, 0 skipped. Includes engine behavior, keyboard defaults/remapping/storage parsing, conflict rejection and repeat policy.
- `npm run build`: passed (TypeScript and Vite).
- `npm run lint`: passed.
- Started the Vite app and checked its HTTP response and transformed gameplay module locally. No browser automation is configured, so manual visual/play testing remains for the owner.

## GitHub Pages
- Owner approved GitHub Pages as temporary preview hosting and enabled it for this repository.
- `.github/workflows/pages.yml` publishes on pushes to `main`; relative build URLs support `/bricks/`.
- Preview: https://badbagel47.github.io/bricks/ . This milestone adds playable single-player controls and board rendering; new deployment status is pending the Actions workflow.
- Milestone 1.1 publication was verified through GitHub Actions. Direct site/API requests from this cloud instance were previously blocked by network policy; required domain additions were saved in the environment draft.

## Known limitations / remaining work
- Engine mechanics are NES-inspired and documented, not cycle-accurate NES emulation.
- Browser integration was smoke-checked over HTTP but not exercised in a real browser here.
- High scores, saved game settings, full Hold/Hard Drop configuration and final result handling remain milestone 1.4; audio remains 1.5; touch and gamepads remain 1.6.
- Snapshot validation for untrusted data, Battle, multiplayer and Firebase are not implemented.
- The graphical style does not need to be finalized before gameplay integration.

## Next recommended task
- Stop for owner review of 1.3.
- Recommend **GPT-6 Luna, Low/Medium** for 1.4 — settings, local persistence and highscores.

## Git checkpoints
- `fea6aa4`: initial foundation and Pages deployment.
- `41766b9`: simplified interface copy; owner subsequently approved 1.1.
- `2b6c6c3`: Milestone 1.2 engine, documentation, tests and CI gate.
- The Milestone 1.3 checkpoint contains gameplay rendering, keyboard controls, tests and this progress update.

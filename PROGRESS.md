# Bricks progress

- **Phase:** 1 — Playable single-player
- **Milestone:** 1.2 — Core gameplay engine
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

## Validation
- `npm test`: 67 passed, 0 failed, 0 skipped. Includes piece geometry, collisions/rotation, gravity boundaries, cadence independence, locking, drop rules, row compaction, score/level transitions, Hold, blocked spawns, pause, seeded sequence vectors, JSON continuation and immutable inputs.
- `npm run build`: passed (TypeScript and Vite).
- `npm run lint`: passed after removing an unused test type import.
- Browser interaction/gameplay is not yet integrated or verified. Automated engine checks do not establish UI/input readiness.

## GitHub Pages
- Owner approved GitHub Pages as temporary preview hosting and enabled it for this repository.
- `.github/workflows/pages.yml` publishes on pushes to `main`; relative build URLs support `/bricks/`.
- Preview: https://badbagel47.github.io/bricks/ . Milestone 1.2 changes engine code only; the menu remains the visible UI.
- Milestone 1.1 publication was verified through GitHub Actions. Direct site/API requests from this cloud instance were previously blocked by network policy; required domain additions were saved in the environment draft.

## Known limitations / remaining work
- Engine mechanics are NES-inspired and documented, not cycle-accurate NES emulation.
- Renderer, keyboard controls, HUD, level palettes, pause/Game Over overlays and their browser integration belong to 1.3.
- Full settings/high scores, audio, touch/gestures and gamepads remain later Phase 1 milestones.
- Snapshot validation for untrusted data, Battle, multiplayer and Firebase are not implemented.
- The graphical style does not need to be finalized before gameplay integration.

## Next recommended task
- Stop for owner review of 1.2, then implement **1.3 — Gameplay rendering and keyboard controls** after approval.
- Recommend **GPT-6 Luna, Medium** for 1.3 with the tested engine; escalate to Sol only for a concrete difficult integration issue.

## Git checkpoints
- `fea6aa4`: initial foundation and Pages deployment.
- `41766b9`: simplified interface copy; owner subsequently approved 1.1.
- The Milestone 1.2 checkpoint contains this progress update, engine, documentation, tests and CI gate.

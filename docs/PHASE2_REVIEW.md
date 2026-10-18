# Phase 2 — Polish review checkpoints

## 2.1 — Accessible game feedback

The board is exposed to assistive technology as one labeled 10 × 20 game board. Its 200 visual cells no longer appear as empty grid cells in the accessibility tree.

A polite live region announces completed line clears, level changes, pause, resume, and Game Over with the final score. Piece movement and score increments are not announced, so gameplay does not produce a continuous stream of speech.

Verification:

- Browser tests verify the board's accessible name and pause, resume, and Game Over announcements.
- `npm test`: 85 passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test:browser`: 13 passed in Chromium.

Physical screen-reader behavior has not been checked.

## 2.2 — Keyboard focus navigation

Screen changes now move keyboard focus to the new page heading. Starting or replaying a game and resuming from pause return focus to the game board. The board can receive keyboard focus and keeps the existing global game controls active.

Verification:

- Browser test covers keyboard-only start, pause, resume, menu navigation, and entering Settings.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npm run test:browser`: 14 passed in Chromium.

## 2.3 — Modal dialog keyboard access

Pause and Game Over overlays now expose modal dialog roles and their visible headings as accessible names. Tab and Shift+Tab wrap between the available actions. A document-level keyboard guard also returns focus to the dialog if it reaches a background control.

Verification:

- Browser tests verify pause and Game Over dialog names, focus wrapping in both directions, and recovery after focusing a background control.
- `npm test`: 85 passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test:browser`: 14 passed in Chromium.

Review this checkpoint before continuing Phase 2. Stop before Phase 3 multiplayer/Firebase.

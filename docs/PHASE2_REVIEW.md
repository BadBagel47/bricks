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

Screen changes now move keyboard focus to the new page heading. Starting or replaying a game and resuming from pause return focus synchronously to the game board. The board is excluded from sequential Tab stops. Tab and Shift+Tab cycle through visible game controls; keyboard instructions are plain text. Navigation is handled before the browser can leave the page, preventing window blur and automatic pause. Pause remains available through the configured keyboard shortcut or Escape.

Verification:

- Browser test covers keyboard-only start, pause, resume, menu navigation, and entering Settings.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npm run test:browser`: 14 passed in Chromium.

## 2.3 — Modal dialog keyboard access

Pause and Game Over overlays now expose modal dialog roles and their visible headings as accessible names. They render outside the game page, while the page is inert until the dialog closes. Tab and Shift+Tab wrap between the available actions; a document-level keyboard guard returns focus to the dialog if it reaches a background control.

Music and effects gain nodes start at zero, then ramp to the selected output volume. This prevents the initial gain ramp from beginning at Web Audio's default full level.

Verification:

- Browser tests verify repeated Tab/Shift+Tab cycles during gameplay before and after resume, no window blur or unexpected pause across five viewports, pause and Game Over dialog names, the inert background, focus wrapping in both directions, recovery after attempting to focus a background control, repeated forward/reverse Tab cycles staying inside both dialogs, and both audio buses ramping from zero.
- `npm test`: 85 passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test:browser`: 14 passed in Chromium.

Review this checkpoint before continuing Phase 2. Stop before Phase 3 multiplayer/Firebase.

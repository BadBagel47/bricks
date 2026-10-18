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

Screen changes now move keyboard focus to the new page heading. Starting or replaying a game and resuming from pause return focus synchronously to the game board. Tab and Shift+Tab cycle through the board and visible game controls. The logo is plain branding with no link or tab stop; keyboard instructions are plain text. Navigation is handled before the browser can leave the page, preventing window blur and automatic pause. Pause remains available through the configured keyboard shortcut or Escape. The playing screen has no Main Menu action; quitting an active game requires the pause dialog. On desktop, Tab and Shift+Tab keep focus on the board.

Verification:

- Browser test covers keyboard-only start, pause, resume, exiting through the pause dialog, and entering Settings.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npm run test:browser`: 14 passed in Chromium.

## 2.3 — Modal dialog keyboard access

Pause and Game Over overlays now expose modal dialog roles and their visible headings as accessible names. They render outside the game page, while the page is inert until the dialog closes. Tab and Shift+Tab wrap between the available actions; a document-level keyboard guard returns focus to the dialog if it reaches a background control.

Music and effects gain nodes start at zero, then ramp to the selected output volume. This prevents the initial gain ramp from beginning at Web Audio's default full level.

Verification:

- Browser tests verify repeated Tab/Shift+Tab cycles during gameplay before and after resume, returning to the board in both directions, no focus on the logo, gameplay input after returning, no window blur or unexpected pause across five viewports, pause and Game Over dialog names, the inert background, focus wrapping in both directions, recovery after attempting to focus a background control, repeated forward/reverse Tab cycles staying inside both dialogs, and both audio buses ramping from zero.
- `npm test`: 85 passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test:browser`: 14 passed in Chromium.

## 2.4 — Audio playback lifecycle

Pause and menu exit now cancel pending effect notes and stop active music/effects with an 8 ms fade and oscillator shutdown after 10 ms. Resuming starts music without replaying interrupted effects. New games reset the melody and danger tempo, and cancel leftover Game Over notes. Volume changes preserve the melody position; muting effects cancels their pending notes.

Verification:

- Five deterministic audio lifecycle tests cover pause/resume, rapid replay after Game Over, menu exit, the complete Game Over sequence, and volume/mute changes.
- The production browser integration test tracks actual Web Audio oscillator endings and verifies that pause/menu exit leave no active sound or delayed notes.
- `npm test`: 90 passed.
- `npm run build` and `npm run lint`: passed.
- `npm run test:browser`: 14 passed in Chromium.

Listening on physical devices remains an owner check. Review this checkpoint before continuing Phase 2. Stop before Phase 3 multiplayer/Firebase.

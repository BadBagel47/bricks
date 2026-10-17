# Phase 1 integration review — milestone 1.7

The playable single-player implementation is ready for owner review. Phase 2 has not started. This report distinguishes automated Chromium checks from hardware and listening checks that have not been performed here.

## Defects fixed

- Next and Hold previews used the board spawn coordinates, clipping three of their four cells. They now center all four cells within the preview.
- Palettes changed only every fifth level. They now change at each level transition.
- Keyboard/controller capture could continue after leaving Settings. Capture is restricted to Settings and cancelled when leaving or resetting.
- Corrupt or partial stored mappings could assign the same key/button to two actions. Conflicting maps restore complete defaults; valid swapped maps survive reload.
- Held keys and touch timers could continue through focus loss, pause or replay. Focus loss pauses; paused touch buttons stop repeating; replay creates a fresh input session.
- Rendering stalls discarded elapsed game time, while held-key repeat depended on frame cadence. Gravity retains elapsed time and keyboard/gamepad repeats use shared elapsed-time scheduling.
- Landscape controls exceeded the viewport. Compact two-row directional controls, viewport-aware board sizing and 44 px minimum landscape targets keep all controls outside the board and inside the tested viewports.
- Select labels included option text, Hold text overflowed small buttons and the pause glyph was missing on Chromium. Explicit accessible labels and compact button text fix these issues.
- Gamepad API permission errors could break the app. They now retain keyboard/touch fallback. Finished audio oscillators disconnect their nodes.

## Observed checks

- `npm test`: 85 passed, 0 failed, 0 skipped.
- `npm run test:browser`: 13 passed, 0 failed, 0 skipped against the production build in Chromium.
- `npm run build` and `npm run lint`: passed.
- Viewports: 1280 × 800, 320 × 667, 390 × 844, 844 × 390 and 800 × 600. Largest touch sizing and Hold were enabled; board and controls fit without page overflow. Screenshots were visually reviewed for portrait and landscape controls.
- Production JS is approximately 256.5 kB / 78.8 kB gzip; CSS approximately 13.2 kB / 3.7 kB gzip. Playwright is a development dependency. Simulation stays independent of React; display updates occur on visible transitions rather than every simulation frame.

## Acceptance evidence

| Specification criteria | Evidence |
| --- | --- |
| 1–3: name, menus, start/finish | Chromium exercises signup, settings, a real Game Over, high scores and replay. |
| 4–7: seven pieces, movement/rotation, lines, score/level | Engine tests cover geometry, collision, row compaction, scores and transitions; Chromium checks movement and a complete run. |
| 8: level palettes | Regression test verifies each consecutive level changes the palette. |
| 9–11: Hard Drop, Hold, remapping | Engine and Chromium tests cover options, preview rendering, saved settings/mappings and gameplay after leaving capture. |
| 12–14: touch, gestures, gamepad | Actual Chromium touch events exercise hold and swipe; simulated Gamepad API samples exercise digital/analog input, repeat, remapping, pause and disconnect. Physical hardware remains unverified. |
| 15–16: music/effects and danger tempo | Real Web Audio initializes after Start; Chromium checks pause/resume and saved mute settings. Unit tests cover volumes, danger height, tempo and pitch. Audible output remains a listening check. |
| 17–20: results, highscores, historical names, persistence | Chromium completes a run, checks the result table and single write, replays, renames, and reloads saved settings. Unit tests cover sorting, top 10, duplicates and invalid data. |
| 21: automated engine tests | Engine and regression suite passes. |
| 22: playable preview | Existing GitHub Pages preview is owner-confirmed through 1.6; this update publishes through the same workflow, now gated by Chromium tests. |

Timing tests compare 30/60/120 Hz input repeats, irregular engine cadence, fixed gravity thresholds and a real 600 ms browser main-thread stall. Browser tests also check focus-loss pause, cleared input on replay and denied Gamepad API access. No uncaught exceptions or browser console errors occurred in the passing suite.

## Remaining owner/device checks

Physical USB/Bluetooth controllers, iOS/Android browsers and subjective audio quality cannot be established by headless Chromium. Test these on available devices before calling those device combinations verified. The engine remains documented NES-inspired gameplay, not cycle-accurate emulation. Graphical refinement may continue separately.

Stop here for Phase 1 acceptance. Multiplayer/Firebase requires explicit approval.

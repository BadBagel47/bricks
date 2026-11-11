# Music: game theme, proposals and test player

Candidate themes for Bricks and a shared test player. **None is wired into the
game.** Integration is a separate task that needs owner authorization like any
other milestone work. All themes are original compositions (no Korobeiniki or
other existing tunes).

## Files

- `engine.js` — shared Web Audio chiptune engine (`BricksMusic.createPlayer()`,
  `BricksMusic.register(theme)`). Pulse/triangle/noise voices, tremolo, vibrato,
  echo, look-ahead scheduler, danger variant, `now()` for visual sync.
- `themes/*.js` — one data file per theme: melody, chords, sections, mix,
  tempo rule, category, and a deterministic `voices(step, danger)` for
  bass/arpeggio/drums. The theme shape is documented at the top of `engine.js`.
- `player.html` — owner test page in the game's visual style, **generated**
  by `npm run music:player` (source: `src/music-player/`, build script:
  `scripts/build-music-player.mjs`). One self-contained file: plays the current
  game theme (*Bricks Theme*, through the game's own scheduler and voices in
  `src/audio/`) and every theme in `themes/` (through `engine.js`); shows a
  timeline of sections, chords and instruments with a moving playhead and
  lamps, a danger switch, a level stepper (themes that use level), volume and
  live BPM; and a ranking stored in the browser (`bricks-music-ranking`) with a
  copy button. Rebuild after changing a theme or the game music. A hosted copy
  is published for the owner as a Claude artifact.

To add a theme: create `themes/<id>.js` calling `BricksMusic.register({...})`
and run `npm run music:player` (every file in `themes/` is included). The melody must
fill exactly `chords.length × 16` sixteenth steps.

## Themes

| Theme | Category | Tempo | Danger |
|---|---|---|---|
| **Bricks Theme** (in the game, `src/audio/music.ts`) | Game music | 132 BPM, danger 172 BPM | Tempo + bass/hi-hat/arpeggio intensity |
| Previous game music (`original`, replaced 2026-11-10; shown as *Tidigare spelmusik*) | Minimal NES-slinga | ≈77 BPM (390 ms/note), danger ≈130 BPM (230 ms) | Tempo + octave up (mirrors `src/audio/`) |
| Night Shift | Mörk groove | Fixed 120 BPM | Intensity only |
| Stackline | Klassisk NES-pussel | 132 BPM, danger ×1.4 | Tempo + intensity |
| Troika | Rysk folkmusik | 150 BPM, +5 %/loop (resets after 4), +6 %/level | None |

## Owner rule: stable BPM for new themes (2026-11-11)

New themes must keep a **fixed tempo**; express danger urgency through
intensity (bass pattern, drum density, arpeggios). Stackline and Troika predate
the rule and were kept as they are. Spec §12.1 says danger music becomes
faster; confirm with the owner which behaviour applies before integrating.

## Notes for integration

- Port the chosen theme's data into a small testable module (like
  `src/audio/tempo.ts`) and play it through `BricksAudio` (`src/audio/synth.ts`)
  using the existing music gain, on/off/volume settings, pause/resume/menu fade
  lifecycle and autoplay unlock.
- Drive danger from `isDangerStack`. Music must never affect gameplay speed.
- Update `docs/AUDIO.md` and the audio tests when the current melody is replaced.

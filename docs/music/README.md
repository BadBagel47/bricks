# Music proposals (owner-provided, not integrated)

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
- `player.html` — owner test page: plays any theme, shows a timeline of
  sections, chords and each instrument with a moving playhead, shows each
  theme's music category, and lets the owner rank themes (stored in that
  browser's localStorage; "Kopiera rangordning" copies the ranking as text).
  Open it directly from this folder. A hosted copy is published for the owner.

To add a theme: create `themes/<id>.js` calling `BricksMusic.register({...})`
and add a `<script src="themes/<id>.js">` line in `player.html`. The melody must
fill exactly `chords.length × 16` sixteenth steps.

## Themes

| Theme | Category | Tempo | Danger |
|---|---|---|---|
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

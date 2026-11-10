# Proposed music (owner-provided, not integrated)

Candidate themes for Bricks, sorted by the owner into groups **A**, **B** and **C**.
**None is wired into the game.** Integration is a separate task that needs owner
authorization like any other milestone work. All are original compositions
(no Korobeiniki or other existing tunes), self-contained plain-JS Web Audio
players with a standalone `*-preview.html` listening page.

## Owner rule: stable BPM for new themes (2026-11-11)

New music proposals must keep a **fixed tempo**. Danger urgency (spec §12.1) is
expressed through intensity (bass pattern, drum density, arpeggios), not speed.
This differs from spec §12.1's "faster" wording and from the older proposals in
B and C, which the owner kept as they are; confirm with the owner before
integrating a tempo-changing theme.

## Group A

### Night Shift — `A/nightshift.js`
D minor, syncopated groove bass, square lead with dotted-eighth echo, 16 bars.
**Fixed 120 BPM.** API: `createNightShift({ volume })` → `start()`, `stop()`,
`toggle()`, `setDanger(bool)`, `setVolume(v)`, `bpm`. `setDanger(true)` switches
to pumping eighth-note bass, denser kicks/hats and constant arpeggios; can switch
mid-bar.

## Group B

### Stackline — `B/stackline.js`
Bright C-major NES puzzle theme, 16 bars, 132 BPM. `setDanger(true)` raises tempo
×1.4 plus denser bass/drums/arpeggios. API as Night Shift.

## Group C

### Troika — `C/troika.js`
Russian folk style: A harmonic minor, polka bass, balalaika-style tremolo, 16 bars,
150 BPM. Accelerates +5 % per loop (resets after 4) and per level via
`setLevel(n)`. API: `createTroika({ bpm, volume })` → `start()`, `stop()`,
`toggle()`, `setLevel(n)`, `setVolume(v)`, `bpm`.

## Notes for integration

- Port note data to a small testable module (like `src/audio/tempo.ts`) and play
  it through `BricksAudio` (`src/audio/synth.ts`) using the existing music gain,
  on/off/volume settings, pause/resume/menu fade lifecycle and autoplay unlock.
- Drive danger from `isDangerStack`. Music must never affect gameplay speed.
- Update `docs/AUDIO.md` and the audio tests when the current melody is replaced.

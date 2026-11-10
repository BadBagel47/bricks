# Proposed music: "Troika" (owner-provided, not integrated)

Added 2026-11-10 at the owner's request as a candidate replacement/extension for
the current music loop in `src/audio/`. **Not wired into the game.** Integration
is a separate task that needs owner authorization like any other milestone work.

## Files

- `troika.js` — self-contained Web Audio player (plain JS, no dependencies).
  Exposes `createTroika({ bpm, volume })` → `start()`, `stop()`, `toggle()`,
  `setLevel(n)`, `setVolume(v)`, `bpm`.
- `troika-preview.html` — standalone listening page (open in a browser, press play).

## Musical content

Original composition (not Korobeiniki or any other existing tune), Russian folk
style: A harmonic minor, 16 bars (A section + "kazachok" B section), 2-beat polka
bass on triangle, 25 % pulse lead with balalaika-style tremolo on long notes,
12.5 % pulse arpeggios in the B section, noise drums. Base tempo 150 BPM.

## Notes for integration

- The prototype accelerates per loop (+5 % per loop, resets after 4) and per
  level (`setLevel`). Spec §12.1 instead requires a faster, more urgent version
  when the stack reaches danger height, and that music speed never affects
  gameplay. When integrating, map danger state to tempo (and drop or keep the
  per-loop acceleration as the owner prefers) rather than copying the prototype
  behaviour as-is.
- Port it into `BricksAudio` (`src/audio/synth.ts`) so it uses the existing
  `musicGain`, music on/off/volume settings, pause/resume/menu fade lifecycle and
  autoplay unlock. Keep note data in a small testable module like `tempo.ts`.
- Update `docs/AUDIO.md` and the audio tests when the current melody is replaced.

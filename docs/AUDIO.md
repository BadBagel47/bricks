# Audio

Bricks generates all of its sound with the Web Audio API. Nothing is downloaded. The first Start/Resume click (or a lobby interaction in multiplayer) initializes or resumes the audio context, as browser autoplay policies require.

## Instruments

Four NES-style voices are synthesized in `src/audio/synth.ts`: two band-limited pulse waves (12.5%, 25% and 50% duty), a triangle bass and filtered white noise for drums and impacts. Music and effects have separate gain buses that share a gentle compressor.

## Music

`src/audio/music.ts` holds an original 16-bar theme in A minor (sections A and B). The loop plays it twice; the second pass adds an arpeggio layer and a lead doubling. Normal tempo is 132 BPM. A look-ahead scheduler queues notes about 120 ms ahead of the audio clock so timing stays steady.

Danger music starts when locked blocks reach the top six rows and ends once the stack is below the top nine rows (hysteresis in `src/audio/tempo.ts`). In danger the tempo rises to 172 BPM, the bass and hi-hats move to sixteenth notes and the arpeggio plays continuously. The switch happens on the next beat. Gameplay speed is never affected. In multiplayer each player's own board drives their music.

## Effects

`src/audio/effects.ts` defines 22 named effects: move, rotate, lock, hard drop, hold, 1/2/3-line clears, four-line clear, level up, menu move/select/back, pause, countdown tick/go, garbage sent/incoming/rise, Game Over, victory and defeat. Engine events trigger the gameplay effects; `BricksAudio.cue(name)` plays any effect from interface code. Multiplayer uses it for the countdown (tick at 3, 2, 1; go at 0, in `MatchStartPanel`), Battle garbage (sent when your lock produces attack rows, incoming when the opponent's attack total grows, rise when rows are applied; in `LiveGame`) and the final outcome (victory or defeat; nothing for a draw).

## Lifecycle and settings

Pause, Game Over and leaving a game stop scheduled music and pending effect notes with an 8 ms fade. Resume continues the song where it was. A new game restarts the song in calm mode. Music and effects have separate on/off and 0–100% volume settings saved locally; muting effects cancels pending effect notes, and silent settings create no sound sources.

Automated tests cover the theme structure, danger tempo and hysteresis, every effect's timing and pitch range, and the playback lifecycle. Chromium integration tests exercise real Web Audio start, pause/resume and saved mute settings. How it sounds still needs a listening check.

# 4. All audio generated with Web Audio

Date: 2026-11-10

## Status
Accepted (replaces the first single-voice synthesizer)

## Context
The spec requires original retro music and effects without copying existing game
music. The first version was a single 16-note voice; the owner asked for a full
redo and approved the new sound after a listening test.

## Decision
Synthesize everything at runtime: pulse (12.5/25/50%), triangle and noise voices,
a look-ahead scheduler and data-defined music and effects
(`src/audio/music.ts`, `src/audio/effects.ts`).

## Consequences
No audio files to host or license. New tracks are data plus a scheduler hook.
Listening checks remain manual.

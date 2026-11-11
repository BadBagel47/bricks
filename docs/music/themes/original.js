// The music currently in the game (src/audio/tempo.ts ORIGINAL_MELODY + synth.ts):
// 16 square-wave notes, 390 ms each (≈77 BPM in eighths); danger: 230 ms (≈130 BPM)
// and one octave up. Notes play for 74 % of their slot.
BricksMusic.register({
  id: 'original',
  title: 'Nuvarande spelmusik',
  category: 'Minimal NES-slinga',
  description: 'Musiken som finns i spelet idag: en enda fyrkantsvåg, 16 toner.',
  tempoLabel: '≈77 BPM, fara ≈130 BPM + oktav upp',
  tempo: ({ danger }) => 60000 / ((danger ? 230 : 390) * 2),
  leadTranspose: ({ danger }) => (danger ? 12 : 0),
  dangerMode: true,
  usesLevel: false,
  melody: [
    ['D4',1],['A4',1],['D5',1],['A4',1],['F4',1],['C5',1],['F5',1],['C5',1],
    ['D4',1],['A4',1],['E5',1],['D5',1],['F4',1],['C5',1],['G5',1],['F5',1],
  ],
  chords: ['Dm–F', 'Dm–F'],
  chordDefs: { 'Dm–F': {} },
  sections: [{ name: 'Slinga', from: 0, to: 2 }],
  mix: {
    lead: { wave: 'square', vol: 0.2, gate: 0.74 },
    bass: { vol: 0 },
    arp: { vol: 0, dangerVol: 0 },
  },
  voices: () => [],
});

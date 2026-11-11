BricksMusic.register({
  id: 'troika',
  title: 'Troika',
  category: 'Rysk folkmusik',
  description: 'A-moll (harmonisk), polkabas, balalajka-tremolo.',
  tempoLabel: '150 BPM, ökar per varv och nivå',
  // +5 % per loop (resets after 4 loops), +6 % per level, max 240.
  tempo: ({ loop, level }) => Math.min(240, 150 * (1 + 0.06 * level) * (1 + 0.05 * (loop % 5))),
  dangerMode: false,
  usesLevel: true,
  melody: [
    ['A4',2],['C5',1],['E5',1],['A5',2],['G#5',1],['A5',1],
    ['B5',1],['A5',1],['G#5',1],['F5',1],['E5',4],
    ['D5',2],['F5',1],['A5',1],['C6',2],['B5',1],['A5',1],
    ['G#5',2],['B5',1],['G#5',1],['E5',4],
    ['A5',1],['E5',1],['C5',1],['E5',1],['A5',1],['E5',1],['C5',1],['E5',1],
    ['F5',1],['D5',1],['A4',1],['D5',1],['F5',2],['A5',2],
    ['G#5',1],['F5',1],['E5',1],['D5',1],['C5',1],['B4',1],['G#4',2],
    ['A4',6],['r',2],
    ['E5',1],['E5',1],['G5',1],['E5',1],['C6',2],['G5',2],
    ['D5',1],['D5',1],['G5',1],['D5',1],['B5',2],['G5',2],
    ['C6',1],['B5',1],['A5',1],['G#5',1],['A5',1],['B5',1],['C6',1],['D6',1],
    ['E6',2],['D6',1],['C6',1],['B5',4],
    ['A5',1],['F5',1],['D5',1],['F5',1],['A5',1],['D6',1],['C6',1],['A5',1],
    ['E5',1],['A5',1],['C6',1],['A5',1],['E5',2],['C5',2],
    ['B4',1],['D5',1],['F5',1],['G#5',1],['B5',1],['A5',1],['G#5',1],['F5',1],
    ['E5',2],['G#4',2],['A4',4],
  ],
  chords: ['Am','Am','Dm','E','Am','Dm','E','Am','C','G','Am','E','Dm','Am','E','Am'],
  chordDefs: {
    Am: { root: 'A2', top: 'E3', triad: ['A4','C5','E5'] },
    Dm: { root: 'D3', top: 'A3', triad: ['D5','F5','A5'] },
    E:  { root: 'E2', top: 'B2', triad: ['E4','G#4','B4'] },
    C:  { root: 'C3', top: 'G3', triad: ['C5','E5','G5'] },
    G:  { root: 'G2', top: 'D3', triad: ['G4','B4','D5'] },
  },
  sections: [{ name: 'A', from: 0, to: 8 }, { name: 'B (kazatjok)', from: 8, to: 16 }],
  mix: {
    lead: { wave: 'pulse25', vol: 0.22, tremolo: true },
    bass: { vol: 0.5 },
    arp: { vol: 0.07, dangerVol: 0.07 },
  },
  voices(step, danger, { bar, s, ch }) {
    const v = [];
    const pat = { 0: [ch.root, 3], 4: [ch.top, 2], 8: [ch.root, 3], 12: [ch.top, 2] };
    if (pat[s]) v.push({ kind: 'bass', note: pat[s][0], len: pat[s][1] });
    if (bar >= 8) v.push({ kind: 'arp', note: ch.triad[[0, 1, 2, 1][s % 4]], len: 1 });
    const kicks = bar === 15 ? [0, 8] : bar >= 8 ? [0, 8, 11] : [0, 8];
    const snares = bar === 15 ? [4, 12, 13, 14, 15] : [4, 12];
    const hats = bar === 15 ? [2, 6, 10] : [2, 6, 10, 14];
    if (kicks.includes(s)) v.push({ kind: 'kick' });
    if (snares.includes(s)) v.push({ kind: 'snare' });
    if (hats.includes(s)) v.push({ kind: 'hat' });
    return v;
  },
});

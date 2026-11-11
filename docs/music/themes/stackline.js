BricksMusic.register({
  id: 'stackline',
  title: 'Stackline',
  category: 'Klassisk NES-pussel',
  description: 'Glad C-dur, studsig pulsmelodi med vibrato.',
  tempoLabel: '132 BPM, fara ×1,4',
  tempo: ({ danger }) => (danger ? 132 * 1.4 : 132),
  dangerMode: true,
  usesLevel: false,
  melody: [
    ['E5',1],['G5',1],['r',1],['G5',1],['A5',1],['G5',1],['E5',2],
    ['C5',1],['E5',1],['r',1],['E5',1],['D5',1],['C5',1],['A4',2],
    ['A4',1],['C5',1],['F5',1],['A5',1],['G5',2],['F5',1],['E5',1],
    ['D5',3],['B4',1],['G4',4],
    ['E5',1],['G5',1],['r',1],['G5',1],['C6',1],['B5',1],['G5',2],
    ['A5',1],['G5',1],['E5',1],['C5',1],['D5',1],['E5',1],['C5',2],
    ['F5',1],['E5',1],['D5',1],['A4',1],['F5',2],['A5',2],
    ['G5',3],['F5',1],['D5',1],['B4',1],['G4',2],
    ['C6',2],['A5',1],['F5',1],['r',1],['F5',1],['A5',1],['C6',1],
    ['B5',2],['G5',1],['D5',1],['r',1],['D5',1],['G5',1],['B5',1],
    ['G5',2],['E5',1],['B4',1],['E5',1],['G5',1],['B5',2],
    ['A5',3],['G5',1],['E5',1],['C5',1],['A4',2],
    ['F5',1],['A5',1],['C6',1],['A5',1],['F5',1],['A5',1],['C6',1],['D6',1],
    ['B5',1],['G5',1],['D5',1],['G5',1],['B5',1],['D6',1],['B5',1],['G5',1],
    ['C6',2],['G5',1],['E5',1],['C5',2],['E5',1],['G5',1],
    ['B4',1],['D5',1],['F5',1],['D5',1],['G5',4],
  ],
  chords: ['C','Am','F','G','C','Am','Dm','G','F','G','Em','Am','F','G','C','G'],
  chordDefs: {
    C:  { root: 'C3', top: 'G3', oct: 'C4', triad: ['C5','E5','G5'] },
    Am: { root: 'A2', top: 'E3', oct: 'A3', triad: ['A4','C5','E5'] },
    F:  { root: 'F2', top: 'C3', oct: 'F3', triad: ['F4','A4','C5'] },
    G:  { root: 'G2', top: 'D3', oct: 'G3', triad: ['G4','B4','D5'] },
    Dm: { root: 'D3', top: 'A3', oct: 'D4', triad: ['D5','F5','A5'] },
    Em: { root: 'E2', top: 'B2', oct: 'E3', triad: ['E4','G4','B4'] },
  },
  sections: [{ name: 'A', from: 0, to: 8 }, { name: 'B', from: 8, to: 16 }],
  mix: {
    lead: { wave: 'pulse25', vol: 0.2, vibrato: true },
    bass: { vol: 0.5 },
    arp: { vol: 0.06, dangerVol: 0.08 },
  },
  voices(step, danger, { bar, s, ch }) {
    const v = [];
    if (danger) {
      if (s % 2 === 0) v.push({ kind: 'bass', note: s % 4 === 0 ? ch.root : ch.oct, len: 1.6 });
    } else {
      const pat = { 0: [ch.root, 3], 4: [ch.top, 2], 8: [ch.root, 2], 10: [ch.oct, 2], 12: [ch.top, 2] };
      if (pat[s]) v.push({ kind: 'bass', note: pat[s][0], len: pat[s][1] });
    }
    if (danger || bar >= 8) v.push({ kind: 'arp', note: ch.triad[[0, 1, 2, 1][s % 4]], len: 1 });
    if ((danger ? [0, 6, 8, 14] : bar >= 8 ? [0, 8, 11] : [0, 8]).includes(s)) v.push({ kind: 'kick' });
    if (s === 4 || s === 12 || (bar === 15 && s >= 13)) v.push({ kind: 'snare' });
    if (danger ? s % 2 === 1 || s % 4 === 2 : s % 4 === 2) v.push({ kind: 'hat' });
    return v;
  },
});

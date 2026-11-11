BricksMusic.register({
  id: 'nightshift',
  title: 'Night Shift',
  category: 'Mörk groove',
  description: 'D-moll, synkoperad bas, fyrkantsmelodi med eko.',
  tempoLabel: 'Fast 120 BPM',
  tempo: () => 120,
  dangerMode: true,
  usesLevel: false,
  melody: [
    ['D5',1],['r',1],['F5',1],['A5',1],['r',1],['G5',1],['F5',1],['E5',1],
    ['D5',2],['A4',1],['C5',1],['D5',4],
    ['F5',1],['r',1],['D5',1],['F5',1],['Bb5',2],['A5',1],['G5',1],
    ['E5',3],['C5',1],['G5',4],
    ['D5',1],['r',1],['F5',1],['A5',1],['r',1],['C6',1],['A5',1],['G5',1],
    ['A5',2],['G5',1],['F5',1],['E5',1],['F5',1],['D5',2],
    ['D5',1],['F5',1],['Bb5',1],['D6',1],['C6',2],['Bb5',1],['A5',1],
    ['A5',3],['E5',1],['C#5',1],['E5',1],['A4',2],
    ['C6',2],['A5',1],['F5',1],['r',1],['A5',1],['C6',1],['A5',1],
    ['G5',2],['E5',1],['C5',1],['r',1],['E5',1],['G5',1],['E5',1],
    ['D5',1],['G5',1],['B5',1],['D6',1],['B5',1],['G5',1],['D5',2],
    ['F5',2],['E5',1],['D5',1],['A4',4],
    ['Bb4',1],['D5',1],['F5',1],['Bb5',1],['A5',1],['F5',1],['D5',2],
    ['C5',1],['E5',1],['G5',1],['C6',1],['Bb5',1],['G5',1],['E5',2],
    ['A5',2],['G5',1],['F5',1],['E5',2],['C#5',2],
    ['E5',1],['F5',1],['E5',1],['C#5',1],['A4',4],
  ],
  chords: ['Dm','Dm','Bb','C','Dm','Dm','Bb','A','F','C','G','Dm','Bb','C','A','A'],
  chordDefs: {
    Dm: { root: 'D2', top: 'A2', oct: 'D3', triad: ['D5','F5','A5'] },
    Bb: { root: 'Bb1', top: 'F2', oct: 'Bb2', triad: ['Bb4','D5','F5'] },
    C:  { root: 'C2', top: 'G2', oct: 'C3', triad: ['C5','E5','G5'] },
    A:  { root: 'A1', top: 'E2', oct: 'A2', triad: ['A4','C#5','E5'] },
    F:  { root: 'F2', top: 'C3', oct: 'F3', triad: ['F4','A4','C5'] },
    G:  { root: 'G2', top: 'D3', oct: 'G3', triad: ['G4','B4','D5'] },
  },
  sections: [{ name: 'A', from: 0, to: 8 }, { name: 'B', from: 8, to: 16 }],
  mix: {
    lead: { wave: 'square', vol: 0.15, echo: true },
    bass: { vol: 0.55 },
    arp: { vol: 0.05, dangerVol: 0.08 },
  },
  voices(step, danger, { bar, s, ch }) {
    const v = [];
    if (danger) {
      if (s % 2 === 0) v.push({ kind: 'bass', note: s % 4 === 0 ? ch.root : ch.oct, len: 1.5 });
    } else {
      const pat = { 0: [ch.root, 2], 3: [ch.root, 1], 6: [ch.oct, 1], 8: [ch.top, 2], 11: [ch.root, 1], 14: [ch.oct, 1] };
      if (pat[s]) v.push({ kind: 'bass', note: pat[s][0], len: pat[s][1] });
    }
    if (danger || bar >= 8) v.push({ kind: 'arp', note: ch.triad[[0, 1, 2, 1][s % 4]], len: 1 });
    if ((danger ? [0, 3, 7, 10, 14] : [0, 7, 10]).includes(s)) v.push({ kind: 'kick' });
    if (s === 4 || s === 12 || (danger && s === 15) || (bar === 15 && s >= 13)) v.push({ kind: 'snare' });
    if (danger || s % 2 === 0) v.push({ kind: 'hat' });
    return v;
  },
});

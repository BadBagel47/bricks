/*
 * Troika – rysk-inspirerat chiptune-tema för Bricks (originalkomposition).
 * Ren Web Audio, inga ljudfiler. A-moll (harmonisk), polka-bas, balalajka-tremolo
 * på långa toner, och tempot ökar för varje varv – som en folkdans som drar iväg.
 *
 * Användning:
 *   const music = createTroika();
 *   music.start();          // måste anropas från ett klick/tangenttryck (webbläsarregel)
 *   music.setLevel(level);  // snabbare tempo på högre nivå
 *   music.setVolume(0.4);   // 0–1
 *   music.stop();
 */
(function (global) {
  // [ton, längd i åttondelar] – 16 takter. "r" = paus.
  const MELODY = [
    // A-del
    ['A4',2],['C5',1],['E5',1],['A5',2],['G#5',1],['A5',1],
    ['B5',1],['A5',1],['G#5',1],['F5',1],['E5',4],
    ['D5',2],['F5',1],['A5',1],['C6',2],['B5',1],['A5',1],
    ['G#5',2],['B5',1],['G#5',1],['E5',4],
    ['A5',1],['E5',1],['C5',1],['E5',1],['A5',1],['E5',1],['C5',1],['E5',1],
    ['F5',1],['D5',1],['A4',1],['D5',1],['F5',2],['A5',2],
    ['G#5',1],['F5',1],['E5',1],['D5',1],['C5',1],['B4',1],['G#4',2],
    ['A4',6],['r',2],
    // B-del (kazatjok-känsla)
    ['E5',1],['E5',1],['G5',1],['E5',1],['C6',2],['G5',2],
    ['D5',1],['D5',1],['G5',1],['D5',1],['B5',2],['G5',2],
    ['C6',1],['B5',1],['A5',1],['G#5',1],['A5',1],['B5',1],['C6',1],['D6',1],
    ['E6',2],['D6',1],['C6',1],['B5',4],
    ['A5',1],['F5',1],['D5',1],['F5',1],['A5',1],['D6',1],['C6',1],['A5',1],
    ['E5',1],['A5',1],['C6',1],['A5',1],['E5',2],['C5',2],
    ['B4',1],['D5',1],['F5',1],['G#5',1],['B5',1],['A5',1],['G#5',1],['F5',1],
    ['E5',2],['G#4',2],['A4',4],
  ];
  const CHORDS = ['Am','Am','Dm','E','Am','Dm','E','Am','C','G','Am','E','Dm','Am','E','Am'];
  const CH = {
    Am: { root: 'A2', top: 'E3', triad: ['A4','C5','E5'] },
    Dm: { root: 'D3', top: 'A3', triad: ['D5','F5','A5'] },
    E:  { root: 'E2', top: 'B2', triad: ['E4','G#4','B4'] },
    C:  { root: 'C3', top: 'G3', triad: ['C5','E5','G5'] },
    G:  { root: 'G2', top: 'D3', triad: ['G4','B4','D5'] },
  };

  const SEMI = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  function midi(n) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
    return SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
  }
  const freq = (n) => 440 * Math.pow(2, (midi(n) - 69) / 12);

  function buildSong() {
    const ev = { lead: [], bass: [], arp: [], drums: [] };
    let t = 0;
    for (const [n, len] of MELODY) {
      if (n !== 'r') ev.lead.push({ step: t, len: len * 2, f: freq(n) });
      t += len * 2;
    }
    CHORDS.forEach((c, bar) => {
      const b = bar * 16, ch = CH[c];
      [[0, ch.root, 3], [4, ch.top, 2], [8, ch.root, 3], [12, ch.top, 2]]
        .forEach(([s, n, l]) => ev.bass.push({ step: b + s, len: l, f: freq(n) }));
      if (bar >= 8) {
        const order = [0, 1, 2, 1];
        for (let s = 0; s < 16; s++) ev.arp.push({ step: b + s, len: 1, f: freq(ch.triad[order[s % 4]]) });
      }
      const kit = bar === 15
        ? { 0:'k', 2:'h', 4:'s', 6:'h', 8:'k', 10:'h', 12:'s', 13:'s', 14:'s', 15:'s' }
        : Object.assign({ 0:'k', 2:'h', 4:'s', 6:'h', 8:'k', 10:'h', 12:'s', 14:'h' }, bar >= 8 ? { 11:'k' } : {});
      for (const s in kit) ev.drums.push({ step: b + +s, type: kit[s] });
    });
    return { length: CHORDS.length * 16, ev, melodySteps: t };
  }

  function createTroika(opts = {}) {
    const song = buildSong();
    const idx = Array.from({ length: song.length }, () => []);
    for (const k in song.ev) for (const e of song.ev[k]) idx[e.step].push([k, e]);

    let ctx, master, pulse25, pulse12, noiseBuf, timer = null;
    let step = 0, nextTime = 0, loops = 0, level = 0, playing = false;
    const baseBpm = opts.bpm || 150;
    let volume = opts.volume ?? 0.5;

    const bpm = () => Math.min(240, baseBpm * (1 + 0.06 * level) * (1 + 0.05 * loops));

    function pulseWave(d) {
      const N = 64, re = new Float32Array(N), im = new Float32Array(N);
      for (let n = 1; n < N; n++) re[n] = 4 / (n * Math.PI) * Math.sin(Math.PI * n * d);
      return ctx.createPeriodicWave(re, im);
    }

    function init() {
      if (ctx) return;
      ctx = new (global.AudioContext || global.webkitAudioContext)();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(comp); comp.connect(ctx.destination);
      pulse25 = pulseWave(0.25);
      pulse12 = pulseWave(0.125);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }

    function tone(t, dur, f, { wave, type, vol, trem }) {
      const o = ctx.createOscillator();
      if (wave) o.setPeriodicWave(wave); else o.type = type;
      o.frequency.value = f;
      const g = ctx.createGain(), end = t + dur * 0.9;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.005);
      g.gain.setTargetAtTime(vol * 0.6, t + 0.01, 0.05);
      g.gain.setTargetAtTime(0, end, 0.015);
      o.connect(g);
      if (trem) { // balalajka-tremolo
        const tg = ctx.createGain(); tg.gain.value = 0.65;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 13;
        const la = ctx.createGain(); la.gain.value = 0.35;
        lfo.connect(la); la.connect(tg.gain);
        g.connect(tg); tg.connect(master);
        lfo.start(t); lfo.stop(end + 0.1);
      } else g.connect(master);
      o.start(t); o.stop(end + 0.1);
    }

    function drum(t, type) {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      let vol, dec;
      if (type === 'k') {
        f.type = 'lowpass'; f.frequency.value = 180; vol = 0.9; dec = 0.09;
        const o = ctx.createOscillator(); o.type = 'triangle';
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.6, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.13);
      } else if (type === 's') { f.type = 'bandpass'; f.frequency.value = 1800; vol = 0.35; dec = 0.08; }
      else { f.type = 'highpass'; f.frequency.value = 7000; vol = 0.12; dec = 0.03; }
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dec);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t, Math.random() * 0.5); s.stop(t + dec + 0.02);
    }

    function tick() {
      while (nextTime < ctx.currentTime + 0.15) {
        const sixteenth = 60 / bpm() / 4;
        for (const [k, e] of idx[step]) {
          const dur = (e.len || 1) * sixteenth;
          if (k === 'lead') tone(nextTime, dur, e.f, { wave: pulse25, vol: 0.22, trem: e.len >= 8 });
          else if (k === 'bass') tone(nextTime, dur, e.f, { type: 'triangle', vol: 0.5 });
          else if (k === 'arp') tone(nextTime, dur, e.f, { wave: pulse12, vol: 0.07 });
          else drum(nextTime, e.type);
        }
        nextTime += sixteenth;
        if (++step >= song.length) { step = 0; loops = (loops + 1) % 5; } // drar iväg 4 varv, börjar om
      }
    }

    return {
      start() {
        init(); ctx.resume();
        if (playing) return;
        playing = true; step = 0; loops = 0;
        nextTime = ctx.currentTime + 0.05;
        timer = setInterval(tick, 25);
      },
      stop() { playing = false; clearInterval(timer); timer = null; },
      toggle() { playing ? this.stop() : this.start(); return playing; },
      setLevel(n) { level = Math.max(0, n | 0); },
      setVolume(v) { volume = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
      get playing() { return playing; },
      get bpm() { return Math.round(bpm()); },
      _song: song,
    };
  }

  global.createTroika = createTroika;
  if (typeof module !== 'undefined') module.exports = { createTroika };
})(typeof window !== 'undefined' ? window : globalThis);

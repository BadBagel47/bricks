/*
 * Bricks music engine – shared Web Audio chiptune player for the music proposals.
 * Themes are pure data + a deterministic voices() function (see themes/*.js) and
 * register themselves with BricksMusic.register(theme).
 *
 * Theme shape:
 *   id, title, category, description
 *   tempo({ danger, loop, level }) -> BPM;  tempoLabel: string
 *   dangerMode: bool (has an intensity variant);  usesLevel: bool
 *   melody: [[note, eighths], ...] ("r" = rest);  chords: [name per bar]
 *   chordDefs: { name: { root, top, oct, triad[3] } }
 *   sections: [{ name, from, to }] in bars
 *   mix: { lead: { wave, vol, tremolo, vibrato, echo, gate }, bass: { vol }, arp: { vol, dangerVol } }
 *   leadTranspose({ danger }) -> semitones (optional)
 *   voices(step, danger, { bar, s, ch }) -> [{ kind: 'bass'|'arp', note, len } | { kind: 'kick'|'snare'|'hat' }]
 */
(function (global) {
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(n) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
    if (!m) throw new Error('Bad note ' + n);
    return SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
  }
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const themes = [];

  function compile(t, danger) {
    const out = [];
    for (let i = 0; i < t.length; i++) {
      const bar = Math.floor(i / 16);
      const vs = t.voices(i, danger, { bar, s: i % 16, ch: t.chordDefs[t.chords[bar]] });
      out.push(vs.map((v) => (v.note ? Object.assign({}, v, { midi: midi(v.note) }) : v)));
    }
    return out;
  }

  function register(t) {
    t.length = t.chords.length * 16;
    t.lead = new Array(t.length).fill(null);
    let s = 0;
    for (const [n, l] of t.melody) {
      if (n !== 'r') t.lead[s] = { len: l * 2, midi: midi(n) };
      s += l * 2;
    }
    t.melodySteps = s;
    if (s !== t.length) console.warn(`${t.id}: melody is ${s} steps, chords ${t.length}`);
    t.normal = compile(t, false);
    t.danger = t.dangerMode ? compile(t, true) : t.normal;
    themes.push(t);
    return t;
  }

  function createPlayer() {
    let ctx, master, echoIn, echoDelay, pulse25, pulse12, noise, timer = null;
    let theme = null, step = 0, next = 0, loop = 0, playing = false;
    let danger = false, level = 0, volume = 0.6;
    const queue = [];

    function pulseWave(d) {
      const N = 64, re = new Float32Array(N), im = new Float32Array(N);
      for (let n = 1; n < N; n++) re[n] = 4 / (n * Math.PI) * Math.sin(Math.PI * n * d);
      return ctx.createPeriodicWave(re, im);
    }

    function init() {
      if (ctx) return;
      ctx = new (global.AudioContext || global.webkitAudioContext)();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain(); master.gain.value = volume;
      master.connect(comp); comp.connect(ctx.destination);
      echoIn = ctx.createGain(); echoIn.gain.value = 0.3;
      echoDelay = ctx.createDelay(2);
      const fb = ctx.createGain(); fb.gain.value = 0.35;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2500;
      echoIn.connect(echoDelay); echoDelay.connect(lp); lp.connect(fb); fb.connect(echoDelay); lp.connect(master);
      pulse25 = pulseWave(0.25); pulse12 = pulseWave(0.125);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }

    function wave(o, w) {
      if (w === 'pulse25') o.setPeriodicWave(pulse25);
      else if (w === 'pulse12') o.setPeriodicWave(pulse12);
      else o.type = w;
    }

    function tone(t, dur, m, o) {
      const osc = ctx.createOscillator(); wave(osc, o.wave);
      osc.frequency.value = hz(m);
      const g = ctx.createGain(), end = t + dur * (o.gate || 0.88);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(o.vol, t + 0.004);
      g.gain.setTargetAtTime(o.vol * 0.65, t + 0.01, 0.06);
      g.gain.setTargetAtTime(0, end, 0.012);
      osc.connect(g);
      let out = g;
      if (o.tremolo) { // balalaika-style tremolo
        const tg = ctx.createGain(); tg.gain.value = 0.65;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 13;
        const la = ctx.createGain(); la.gain.value = 0.35;
        lfo.connect(la); la.connect(tg.gain); g.connect(tg); out = tg;
        lfo.start(t); lfo.stop(end + 0.1);
      }
      if (o.vibrato) { // delayed NES-style vibrato
        const lfo = ctx.createOscillator(); lfo.frequency.value = 6;
        const dg = ctx.createGain();
        dg.gain.setValueAtTime(0, t); dg.gain.linearRampToValueAtTime(18, t + Math.min(0.25, dur * 0.5));
        lfo.connect(dg); dg.connect(osc.detune);
        lfo.start(t); lfo.stop(end + 0.1);
      }
      out.connect(master);
      if (o.echo) out.connect(echoIn);
      osc.start(t); osc.stop(end + 0.1);
    }

    function drum(t, kind) {
      const s = ctx.createBufferSource(); s.buffer = noise;
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      let vol, dec;
      if (kind === 'kick') {
        f.type = 'lowpass'; f.frequency.value = 190; vol = 0.8; dec = 0.09;
        const o = ctx.createOscillator(); o.type = 'triangle';
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.1);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.6, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.13);
      } else if (kind === 'snare') { f.type = 'bandpass'; f.frequency.value = 1800; vol = 0.32; dec = 0.08; }
      else { f.type = 'highpass'; f.frequency.value = 7500; vol = 0.1; dec = 0.028; }
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dec);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t, Math.random() * 0.5); s.stop(t + dec + 0.02);
    }

    const bpmNow = () => theme.tempo({ danger: danger && theme.dangerMode, loop, level });

    function tick() {
      while (next < ctx.currentTime + 0.12) {
        const bpm = bpmNow(), sx = 60 / bpm / 4, mix = theme.mix;
        queue.push({ step, time: next, loop, bpm });
        echoDelay.delayTime.setValueAtTime(sx * 3, next);
        const ld = theme.lead[step];
        const tr = theme.leadTranspose ? theme.leadTranspose({ danger: danger && theme.dangerMode }) : 0;
        if (ld) tone(next, ld.len * sx, ld.midi + tr, {
          wave: mix.lead.wave, vol: mix.lead.vol, echo: mix.lead.echo, gate: mix.lead.gate,
          tremolo: mix.lead.tremolo && ld.len >= 8, vibrato: mix.lead.vibrato && ld.len >= 6,
        });
        const useDanger = danger && theme.dangerMode;
        for (const v of (useDanger ? theme.danger : theme.normal)[step]) {
          if (v.kind === 'bass') tone(next, v.len * sx, v.midi, { wave: 'triangle', vol: mix.bass.vol });
          else if (v.kind === 'arp') tone(next, sx, v.midi, { wave: 'pulse12', vol: useDanger ? mix.arp.dangerVol : mix.arp.vol });
          else drum(next, v.kind);
        }
        next += sx;
        if (++step >= theme.length) { step = 0; loop++; }
      }
    }

    return {
      themes,
      load(id) {
        const wasPlaying = playing;
        this.stop();
        theme = themes.find((t) => t.id === id) || themes[0];
        step = 0; loop = 0; queue.length = 0;
        if (wasPlaying) this.start();
        return theme;
      },
      start() {
        init(); ctx.resume();
        if (playing || !theme) return;
        playing = true; queue.length = 0;
        next = ctx.currentTime + 0.06;
        timer = setInterval(tick, 25);
      },
      stop() {
        playing = false; clearInterval(timer); timer = null;
        step = 0; loop = 0; queue.length = 0;
      },
      toggle() { playing ? this.stop() : this.start(); return playing; },
      setDanger(on) { danger = !!on; },
      setLevel(n) { level = Math.max(0, n | 0); },
      setVolume(v) { volume = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
      /** What is audible right now: { step, loop, bpm } or null. */
      now() {
        if (!playing || !ctx) return null;
        let cur = null;
        while (queue.length && queue[0].time <= ctx.currentTime) cur = queue.shift();
        if (cur) { queue.unshift(cur); }
        return cur;
      },
      get theme() { return theme; },
      get playing() { return playing; },
      get danger() { return danger; },
      get bpm() { return theme ? Math.round(bpmNow()) : 0; },
    };
  }

  global.BricksMusic = { register, createPlayer, themes, midi };
})(typeof window !== 'undefined' ? window : globalThis);

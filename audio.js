/* ============================================================
   NatanAudio: every sound on the site, generated live (no audio files).
   Sections:
     1  Mixer state      (volumes, mute, saved in this browser)
     2  Engine           (context, buses, reverb returns, compressor, analyser)
     3  Voices           (tone, noise, helpers)
     4  SFX library      (grouped: ui, letter, gallery, cats, wish, cake, fireworks, theme)
     5  Event map        (site event name -> sounds + vibration)
     6  Music            (generated lullaby, or assets/music.mp3 if present)
     7  Ambience         (night, rain, space; chosen per page in Auto mode)
     8  Public API
   ============================================================ */
(() => {
  'use strict';
  const LS = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const hum = (f, c = .03) => f * (1 + rand(-c, c));
  const hz = m => 440 * 2 ** ((m - 69) / 12);

  /* ---------- 1. Mixer state ---------- */
  const DEF = { master: .85, music: .5, sfx: .8, ambience: .35, ambMode: 'auto' };
  let saved = {}; try { saved = JSON.parse(LS.get('natan.mix') || '{}') || {}; } catch {}
  const mix = Object.assign({}, DEF, saved, { muted: false });
  ['master', 'music', 'sfx', 'ambience'].forEach(k => { mix[k] = Number.isFinite(+mix[k]) ? clamp(+mix[k]) : DEF[k]; });
  if (!['auto', 'off', 'night', 'rain', 'space'].includes(mix.ambMode)) mix.ambMode = 'auto';
  const listeners = [];
  const persist = () => LS.set('natan.mix', JSON.stringify({ master: mix.master, music: mix.music, sfx: mix.sfx, ambience: mix.ambience, ambMode: mix.ambMode }));

  /* ---------- 2. Engine ---------- */
  let ac = null, nodes = {}, unlocked = false, curPage = 'home';
  const nb = {};
  function ctx() {
    if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return ac; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ac = new AC();
    const master = ac.createGain(), comp = ac.createDynamicsCompressor(), an = ac.createAnalyser();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .01; comp.release.value = .25;
    an.fftSize = 128; an.smoothingTimeConstant = .8;
    master.connect(comp); comp.connect(an); an.connect(ac.destination);
    const bus = () => { const g = ac.createGain(); g.connect(master); return g; };
    nodes = { master, an, music: bus(), sfx: bus(), ui: bus(), amb: bus(), verb: {} };
    const len = Math.floor(ac.sampleRate * 1.8), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    ['music', 'sfx', 'amb'].forEach(k => { const cv = ac.createConvolver(), ret = ac.createGain(); cv.buffer = ir; ret.gain.value = .55; cv.connect(ret); ret.connect(nodes[k]); nodes.verb[k] = cv; });
    nodes.musicGate = ac.createGain(); nodes.musicGate.gain.value = 0; nodes.musicGate.connect(nodes.music);
    const send = ac.createGain(); send.gain.value = .5; nodes.musicGate.connect(send); send.connect(nodes.verb.music);
    applyMix(true);
    return ac;
  }
  function applyMix(now) {
    if (ac) {
      const t = ac.currentTime, tc = now ? .001 : .05;
      nodes.master.gain.setTargetAtTime(mix.muted ? 0 : mix.master, t, tc);
      nodes.music.gain.setTargetAtTime(mix.music, t, tc);
      nodes.sfx.gain.setTargetAtTime(mix.sfx, t, tc);
      nodes.ui.gain.setTargetAtTime(mix.sfx * .7, t, tc);
      nodes.amb.gain.setTargetAtTime(mix.ambience, t, tc);
    }
    Music.syncFile();
  }
  function noiseBuf(kind) {
    if (nb[kind]) return nb[kind];
    const len = ac.sampleRate * 2, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'pink') { b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852; b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926; }
      else d[i] = w * .6;
    }
    return (nb[kind] = b);
  }

  /* ---------- 3. Voices ---------- */
  // Output chain for a voice: optional stereo pan, bus, optional reverb send
  function chain(o) {
    const g = ac.createGain(); let last = g;
    if (o.pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); last.connect(p); last = p; }
    const bus = o.bus || 'sfx'; last.connect(nodes[bus]);
    if (o.verb) { const s = ac.createGain(); s.gain.value = o.verb; last.connect(s); s.connect(nodes.verb[bus === 'ui' ? 'sfx' : bus]); }
    return g;
  }
  const live = () => !mix.muted && ctx();
  // tone: f, f2 (glide), dur, g, type, at, attack, bus, pan, verb, vib:{rate,depth}
  function tone(o) {
    const a = live(); if (!a) return;
    const t = a.currentTime + (o.at || 0), osc = a.createOscillator(), e = a.createGain(), at = o.attack == null ? .008 : o.attack;
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
    if (o.f2 && o.f2 !== o.f) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.dur);
    e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(o.g == null ? .08 : o.g, t + at); e.gain.exponentialRampToValueAtTime(.0001, t + o.dur);
    osc.connect(e); e.connect(chain(o));
    if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.vib.rate; lg.gain.value = o.vib.depth; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + o.dur + .05); }
    osc.start(t); osc.stop(t + o.dur + .05);
  }
  // noise: ftype, f, f2 (filter sweep), Q, dur, g, at, attack, kind (white|pink), bus, pan, verb
  function noise(o) {
    const a = live(); if (!a) return;
    const t = a.currentTime + (o.at || 0), src = a.createBufferSource(), fl = a.createBiquadFilter(), e = a.createGain();
    src.buffer = noiseBuf(o.kind || 'white'); src.loop = true;
    fl.type = o.ftype || 'bandpass'; fl.Q.value = o.Q == null ? 1 : o.Q; fl.frequency.setValueAtTime(o.f, t);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(o.g == null ? .08 : o.g, t + (o.attack == null ? .004 : o.attack)); e.gain.exponentialRampToValueAtTime(.0001, t + o.dur);
    src.connect(fl); fl.connect(e); e.connect(chain(o)); src.start(t, Math.random()); src.stop(t + o.dur + .05);
  }
  function duckMusic(depth, ms) {
    if (!ac) return; const t = ac.currentTime;
    nodes.music.gain.setTargetAtTime(mix.music * depth, t, .05);
    setTimeout(() => { if (ac) nodes.music.gain.setTargetAtTime(mix.music, ac.currentTime, .6); }, ms);
  }
  const arp = (notes, step, o) => notes.forEach((f, i) => tone(Object.assign({}, o, { f, at: (o.at || 0) + i * step })));

  // catVoice: a throat-like voice. f0, contour [[pos,mult]..], dur, g, vowel [[pos,f1,f2]..], k (pitch), pan, trill (Hz), vib {rate,depth}, breath, at, vol
  function catVoice(o) {
    const a = live(); if (!a) return;
    const t = a.currentTime + (o.at || 0), d = o.dur, k = (o.k || 1) * rand(.94, 1.06), vol = o.vol == null ? 1 : o.vol;
    const osc = a.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(o.f0 * k * o.contour[0][1], t);
    o.contour.forEach(([p, m]) => osc.frequency.linearRampToValueAtTime(o.f0 * k * m, t + d * p));
    const f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter(), g1 = a.createGain(), g2 = a.createGain(), amp = a.createGain();
    f1.type = f2.type = 'bandpass'; f1.Q.value = 5; f2.Q.value = 7; g1.gain.value = 1; g2.gain.value = .55;
    f1.frequency.setValueAtTime(o.vowel[0][1], t); f2.frequency.setValueAtTime(o.vowel[0][2], t);
    o.vowel.forEach(([p, x1, x2]) => { f1.frequency.linearRampToValueAtTime(x1, t + d * p); f2.frequency.linearRampToValueAtTime(x2, t + d * p); });
    osc.connect(f1); osc.connect(f2); f1.connect(g1); f2.connect(g2); g1.connect(amp); g2.connect(amp);
    const peak = (o.g == null ? .22 : o.g) * vol;
    amp.gain.setValueAtTime(.0001, t); amp.gain.linearRampToValueAtTime(peak, t + Math.min(.05, d * .25)); amp.gain.setValueAtTime(peak, t + d * .6); amp.gain.exponentialRampToValueAtTime(.0001, t + d);
    if (o.trill) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.trill; lg.gain.value = peak * .7; l.connect(lg); lg.connect(amp.gain); l.start(t); l.stop(t + d + .05); }
    if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.vib.rate; lg.gain.value = o.vib.depth; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + d + .05); }
    amp.connect(chain({ bus: 'sfx', pan: o.pan, verb: .12 }));
    osc.start(t); osc.stop(t + d + .05);
    if (o.breath) noise({ ftype: 'highpass', f: 3500, dur: d, g: o.breath * vol, at: o.at || 0, attack: d * .3, pan: o.pan });
  }
  const cv = (o, p) => catVoice(Object.assign({ k: o && o.k, pan: o && o.pan, vol: o && o.vol }, p));

  /* ---------- 4. SFX library ---------- */
  const SFX = {
    /* ui */
    tap() { tone({ f: hum(820), f2: hum(1240), dur: .07, g: .05, bus: 'ui' }); noise({ f: 3000, Q: .8, dur: .02, g: .02, bus: 'ui' }); },
    menuOpen() { arp([523.25, 659.25, 783.99], .05, { dur: .35, g: .05, bus: 'ui', verb: .4, type: 'triangle' }); noise({ ftype: 'highpass', f: 2000, f2: 6000, dur: .18, g: .02, bus: 'ui' }); },
    menuClose() { arp([783.99, 659.25, 523.25], .05, { dur: .25, g: .04, bus: 'ui', type: 'triangle' }); },
    nav() { noise({ f: 400, f2: 3200, Q: 2, dur: .5, g: .07, attack: .12, pan: -.3 }); tone({ f: 220, f2: 440, dur: .45, g: .03, verb: .5 }); },
    toggleOn() { arp([600, 900], .07, { dur: .1, g: .05, bus: 'ui' }); },
    toggleOff() { arp([900, 600], .07, { dur: .1, g: .05, bus: 'ui' }); },
    error() { tone({ f: 180, f2: 150, dur: .18, g: .06, type: 'square', bus: 'ui' }); },
    /* theme */
    themeDay() { arp([392, 523.25, 659.25], .09, { dur: .6, g: .045, verb: .6, type: 'triangle' }); },
    themeNight() { arp([659.25, 523.25, 392], .09, { dur: .8, g: .045, verb: .8, type: 'triangle' }); },
    /* letter */
    sealBreak() { noise({ f: 1800, Q: .6, dur: .05, g: .12 }); noise({ f: 900, Q: .8, dur: .04, g: .1, at: .06 }); noise({ f: 2400, Q: .7, dur: .03, g: .09, at: .11 }); tone({ f: 110, f2: 60, dur: .18, g: .12 }); },
    paper() { for (let i = 0; i < 6; i++) noise({ f: rand(2500, 5000), Q: .7, dur: rand(.07, .13), g: .045, at: i * .06 + rand(0, .03), pan: rand(-.5, .5) }); noise({ ftype: 'lowpass', f: 1200, dur: .5, g: .03, attack: .1, kind: 'pink' }); },
    reveal() { arp([523.25, 659.25, 783.99, 1046.5, 1318.5], .09, { dur: 1.4, g: .045, at: .1, verb: .7 }); },
    /* gallery */
    shutter() { noise({ f: 5000, Q: .5, dur: .025, g: .12 }); noise({ f: 3200, Q: .7, dur: .03, g: .1, at: .07 }); tone({ f: 180, f2: 90, dur: .06, g: .08 }); },
    slide(o) { noise({ f: 700, f2: 2600, Q: 1.5, dur: .22, g: .05, attack: .05, pan: (o && o.dir) || 0 }); },
    /* cats */
    meow(o) { cv(o, { f0: 520, contour: [[0, .8], [.25, 1.25], [.6, 1], [1, .7]], dur: rand(.5, .72), vowel: [[0, 300, 1200], [.25, 420, 2500], [.6, 700, 1500], [1, 400, 900]] }); },
    mew(o) { cv(o, { f0: 900, contour: [[0, .9], [.3, 1.3], [1, .8]], dur: .32, g: .17, vowel: [[0, 400, 2600], [1, 500, 2200]] }); },
    mrrp(o) { cv(o, { f0: 420, contour: [[0, .8], [1, 1.35]], dur: .28, trill: 28, vowel: [[0, 350, 1300], [1, 450, 1800]], g: .2 }); },
    chirp(o) { cv(o, { f0: 700, contour: [[0, .7], [1, 1.6]], dur: .16, g: .18, vowel: [[0, 450, 2000], [1, 600, 2600]] }); },
    chirp2(o) { cv(o, { f0: 700, contour: [[0, .7], [1, 1.5]], dur: .15, g: .17, vowel: [[0, 450, 2000], [1, 600, 2600]] }); cv(o, { f0: 820, contour: [[0, .7], [1, 1.7]], dur: .17, g: .17, at: .19, vowel: [[0, 450, 2000], [1, 650, 2700]] }); },
    longMeow(o) { cv(o, { f0: 480, contour: [[0, .85], [.2, 1.2], [.5, 1.1], [.8, .95], [1, .6]], dur: 1.05, vib: { rate: 5.5, depth: 9 }, vowel: [[0, 300, 1100], [.2, 430, 2400], [.55, 650, 1500], [1, 380, 900]] }); },
    question(o) { cv(o, { f0: 450, contour: [[0, .9], [.4, 1], [.7, .85], [1, 1.55]], dur: .75, vowel: [[0, 320, 1200], [.3, 650, 1500], [.7, 500, 1300], [1, 420, 2300]] }); },
    yawn(o) { cv(o, { f0: 380, contour: [[0, .9], [.5, 1.5], [.7, 1.8], [1, .7]], dur: 1, g: .13, breath: .05, vowel: [[0, 500, 1400], [.6, 700, 1700], [1, 350, 1000]] }); },
    squeak(o) { cv(o, { f0: 1500, contour: [[0, 1], [.4, 1.2], [1, .9]], dur: .14, g: .1, vowel: [[0, 700, 2800], [1, 600, 2600]] }); },
    nya(o) { cv(o, { f0: 520, contour: [[0, .85], [.3, 1.15], [1, .8]], dur: .45, vowel: [[0, 300, 1000], [.3, 600, 1500], [1, 450, 1000]] }); },
    rowr(o) { cv(o, { f0: 300, contour: [[0, .9], [.5, 1.3], [1, .8]], dur: .6, trill: 24, vowel: [[0, 400, 900], [1, 500, 1100]], g: .2 }); },
    chatter(o) { for (let i = 0; i < 5; i++) cv(o, { f0: 900, contour: [[0, 1], [1, .9]], dur: .05, g: .1, at: i * .075, vowel: [[0, 800, 2200], [1, 600, 1800]] }); noise({ f: 5000, Q: .6, dur: .03, g: .03 }); },
    purr(o) {
      const a = live(); if (!a) return;
      const t = a.currentTime, dur = (o && o.dur) || 1.8, vp = o && o.vol != null ? o.vol : 1, src = a.createBufferSource(), lp = a.createBiquadFilter(), am = a.createGain(), lfo = a.createOscillator(), lg = a.createGain(), e = a.createGain();
      src.buffer = noiseBuf('pink'); src.loop = true; lp.type = 'lowpass'; lp.frequency.value = 220; am.gain.value = .5; lfo.frequency.value = 24; lg.gain.value = .5;
      lfo.connect(lg); lg.connect(am.gain);
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.6 * vp, t + .3); e.gain.linearRampToValueAtTime(0, t + dur);
      src.connect(lp); lp.connect(am); am.connect(e); e.connect(chain({ bus: 'sfx' }));
      src.start(t); lfo.start(t); src.stop(t + dur + .05); lfo.stop(t + dur + .05);
    },
    /* wish */
    sparkle() { for (let i = 0; i < 7; i++) tone({ f: rand(1500, 4300), dur: rand(.5, .9), g: .025, at: rand(0, .35), verb: .8, pan: rand(-.8, .8) }); },
    shoot() { noise({ f: 6000, f2: 900, Q: 3, dur: 1.1, g: .07, attack: .05, verb: .4, pan: -.6 }); tone({ f: 2400, f2: 500, dur: 1, g: .03, verb: .5, pan: -.5 }); },
    wishSave() { SFX.sparkle(); SFX.chime(); },
    chime() { arp([880, 1320, 1760], .12, { dur: 1.3, g: .06, verb: .7 }); },
    /* cake */
    flame() { noise({ ftype: 'lowpass', f: 500, f2: 1800, dur: .5, g: .08, attack: .1, kind: 'pink' }); },
    blow() { noise({ ftype: 'lowpass', f: 900, f2: 300, Q: .5, dur: .9, g: .12, attack: .08, kind: 'pink' }); },
    candleOut() { noise({ ftype: 'highpass', f: 3500, dur: .25, g: .04 }); tone({ f: 300, f2: 120, dur: .15, g: .03 }); },
    tada() {
      [[523.25, 0], [659.25, .12], [783.99, .24], [1046.5, .36]].forEach(([f, at]) => { tone({ f, dur: .9, g: .06, at, type: 'triangle', verb: .6 }); tone({ f: f * 2, dur: .6, g: .02, at, verb: .6 }); });
      tone({ f: 261.63, dur: 1.4, g: .05, at: .36, type: 'triangle' }); duckMusic(.35, 2200);
    },
    /* fireworks */
    launch() { tone({ f: 400, f2: 1800, dur: .7, g: .03 }); noise({ ftype: 'highpass', f: 2000, dur: .6, g: .02 }); },
    boom(o) {
      const p = (o && o.pan) || 0;
      tone({ f: 90, f2: 30, dur: .7, g: .2, pan: p, verb: .5 }); noise({ ftype: 'lowpass', f: 900, f2: 120, dur: .8, g: .16, pan: p, verb: .6, kind: 'pink' });
      for (let i = 0; i < 8; i++) noise({ ftype: 'highpass', f: rand(4000, 7000), dur: .03, g: .04, at: .1 + i * .06 + rand(0, .05), pan: p + rand(-.2, .2) });
    },
  };
  const GROUPS = {
    UI: ['tap', 'menuOpen', 'menuClose', 'nav', 'toggleOn', 'toggleOff', 'error'],
    Theme: ['themeDay', 'themeNight'],
    Letter: ['sealBreak', 'paper', 'reveal'],
    Gallery: ['shutter', 'slide'],
    Cats: ['meow', 'mew', 'mrrp', 'chirp', 'chirp2', 'longMeow', 'question', 'yawn', 'squeak', 'nya', 'rowr', 'chatter', 'purr'],
    Wish: ['sparkle', 'shoot', 'wishSave', 'chime'],
    Cake: ['flame', 'blow', 'candleOut', 'tada'],
    Fireworks: ['launch', 'boom']
  };

  /* ---------- 5. Event map ---------- */
  const EVENTS = {
    'ui.tap': 'tap', 'menu.open': 'menuOpen', 'menu.close': 'menuClose', 'page.change': 'nav',
    'toggle.on': 'toggleOn', 'toggle.off': 'toggleOff', 'theme.day': 'themeDay', 'theme.night': 'themeNight',
    'letter.open': ['sealBreak', 'paper', 'reveal'], 'letter.close': 'paper', 'note.open': ['sealBreak', 'reveal'], 'note.close': 'paper', 'stats.done': 'sparkle',
    'photo.open': 'shutter', 'photo.slide': 'slide',
    'cat.purr': 'purr',
    'wish.save': ['wishSave', 'shoot'], 'wish.empty': 'error', 'wish.remove': 'candleOut', 'card.save': 'shutter',
    'cake.start': 'flame', 'cake.blow': 'blow', 'cake.out': 'candleOut', 'cake.done': 'tada',
    'fireworks.launch': 'launch', 'fireworks.boom': 'boom'
  };
  const HAPTIC = { 'ui.tap': [8], 'cat.pet': [15], 'letter.open': [20, 30, 20], 'cake.done': [30, 40, 30], 'wish.save': [12, 40, 12] };
  /* two cats with their own voices: a (high, chirpy) and b (low, mellow); they get chattier the more they are petted */
  let lastCat = '';
  function catPet(o) {
    o = o || {}; const n = o.pet || 0, b = o.cat === 'b', k = b ? .82 : 1.15, pan = b ? .35 : -.35;
    let pool = ['meow', 'mew', 'mrrp', 'nya'];
    if (n >= 5) pool = pool.concat(['chirp', 'chirp2', 'question', 'squeak']);
    if (n >= 12) pool = pool.concat(['rowr', 'longMeow', 'yawn', 'chatter']);
    pool = pool.filter(x => x !== lastCat && !(b && (x === 'squeak' || x === 'chirp2')) && !(!b && x === 'rowr'));
    const p = pool[Math.floor(Math.random() * pool.length)]; lastCat = p;
    sfx(p, { k, pan, vol: o.vol });
    if (Math.random() < .25) setTimeout(() => sfx(p === 'mrrp' ? 'meow' : 'mrrp', { k: k * 1.05, pan, vol: (o.vol || 1) * .8 }), 320);
  }
  function catIdle() { const b = Math.random() < .5; sfx(['mew', 'squeak', 'mrrp', 'yawn', 'nya'][Math.floor(Math.random() * 5)], { k: b ? .82 : 1.15, pan: b ? .35 : -.35, vol: .45 }); }
  function sfx(name, opts) { if (!unlocked || !SFX[name]) return; try { SFX[name](opts || {}); } catch {} }
  function emit(name, opts) {
    if (name === 'cat.pet' || name === 'cat.idle') {
      if (!unlocked) return; if (name === 'cat.pet') catPet(opts); else catIdle();
      if (name === 'cat.pet' && !mix.muted && navigator.vibrate) { try { navigator.vibrate(HAPTIC['cat.pet']); } catch {} }
      return;
    }
    const m = EVENTS[name]; if (!m || !unlocked) return;
    (Array.isArray(m) ? m : [m]).forEach((n, i) => (i ? setTimeout(() => sfx(n, opts), i * 120) : sfx(n, opts)));
    if (HAPTIC[name] && !mix.muted && navigator.vibrate) { try { navigator.vibrate(HAPTIC[name]); } catch {} }
  }

  /* ---------- 6. Music ---------- */
  const Music = (() => {
    const CH = [[48, 55, 59, 64], [45, 52, 60, 64], [41, 48, 57, 64], [43, 50, 59, 62]];
    const PAT = [0, 1, 2, 3, 2, 1, 2, 3], MEL = [72, 74, 76, 79, 81, 79, 76, 74], EIGHTH = 60 / 76 / 2;
    let timer = 0, nextT = 0, step = 0, playing = false, file = null, fileOK = null, usingFile = false;
    function mn(m, t, dur, g, type, attack = .008) {
      const o = ac.createOscillator(), e = ac.createGain();
      o.type = type; o.frequency.value = hz(m);
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + attack); e.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(e); e.connect(nodes.musicGate); o.start(t); o.stop(t + dur + .05);
    }
    function pad(m, t, dur) {
      const o = ac.createOscillator(), e = ac.createGain();
      o.type = 'triangle'; o.frequency.value = hz(m);
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.035, t + 1); e.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(e); e.connect(nodes.musicGate); o.start(t); o.stop(t + dur + .1);
    }
    function schedule() {
      while (nextT < ac.currentTime + .5) {
        const chord = CH[Math.floor(step / 8) % 4], k = step % 8;
        if (k === 0) { mn(chord[0] - 12, nextT, 3.5, .16, 'sine', .03); chord.slice(1).forEach(m => pad(m, nextT, EIGHTH * 8 + .6)); }
        mn(chord[PAT[k]] + 12, nextT, 1.9, .13, 'sine'); mn(chord[PAT[k]] + 24, nextT, .7, .03, 'sine');
        if (k % 4 === 2 && Math.floor(step / 8) % 2 === 1) mn(MEL[(step >> 1) % 8], nextT + EIGHTH * .5, 2.2, .1, 'triangle');
        nextT += EIGHTH; step++;
      }
    }
    function startSynth() {
      if (!ctx()) return false;
      nextT = ac.currentTime + .15; clearInterval(timer); timer = setInterval(schedule, 120); schedule();
      nodes.musicGate.gain.setTargetAtTime(1, ac.currentTime, .4);
      return true;
    }
    function stopSynth() { if (!ac) return; nodes.musicGate.gain.setTargetAtTime(0, ac.currentTime, .12); clearInterval(timer); }
    function tryFile() {
      return new Promise(res => {
        if (fileOK !== null) return res(fileOK);
        const a = new Audio(); a.loop = true; a.preload = 'auto';
        a.addEventListener('canplay', () => { file = a; fileOK = true; res(true); }, { once: true });
        a.addEventListener('error', () => { fileOK = false; res(false); }, { once: true });
        a.src = 'assets/NadinAmizahsemuaakudirayakan.mp3'; setTimeout(() => { if (fileOK === null) { fileOK = false; res(false); } }, 2500);
      });
    }
    async function play() {
      ctx(); playing = true;
      if (await tryFile()) { syncFile(); try { await file.play(); usingFile = true; return true; } catch { fileOK = false; } }
      usingFile = false; return startSynth();
    }
    function pause() { playing = false; if (usingFile && file) file.pause(); else stopSynth(); }
    function syncFile() { if (file) file.volume = mix.muted ? 0 : clamp(mix.master * mix.music); }
    document.addEventListener('visibilitychange', () => {
      if (!playing) return;
      if (document.hidden) { if (usingFile && file) file.pause(); else { clearInterval(timer); } }
      else if (usingFile && file) file.play().catch(() => {});
      else if (ac) { nextT = ac.currentTime + .1; timer = setInterval(schedule, 120); }
    });
    return { play, pause, syncFile, get playing() { return playing; } };
  })();

  /* ---------- 7. Ambience ---------- */
  const AMBMAP = { wish: 'night', universe: 'space', surprise: 'space', numbers: 'space', notes: 'night' };
  let ambKind = null, ambStop = null;
  function ambStart(kind) {
    const a = ctx(); if (!a) return null;
    const t0 = a.currentTime, g = a.createGain(), srcs = [], timers = [];
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(1, t0 + 2.5); g.connect(nodes.amb);
    const loopNoise = kind => { const s = a.createBufferSource(); s.buffer = noiseBuf(kind); s.loop = true; srcs.push(s); return s; };
    const lfo = (rate, depth, target) => { const o = a.createOscillator(), lg = a.createGain(); o.frequency.value = rate; lg.gain.value = depth; o.connect(lg); lg.connect(target); srcs.push(o); };
    if (kind === 'night') {
      const w = loopNoise('pink'), lp = a.createBiquadFilter(), wg = a.createGain();
      lp.type = 'lowpass'; lp.frequency.value = 420; wg.gain.value = .5; lfo(.08, 180, lp.frequency);
      w.connect(lp); lp.connect(wg); wg.connect(g);
      timers.push(setInterval(() => { const p = rand(-.8, .8), n = 3 + Math.floor(Math.random() * 3); for (let j = 0; j < n; j++) tone({ f: 4200 + rand(-200, 200), dur: .04, g: .02, at: j * .06, bus: 'amb', pan: p }); }, 1600));
    } else if (kind === 'rain') {
      const r = loopNoise('pink'), hp = a.createBiquadFilter(), lp = a.createBiquadFilter(), rg = a.createGain(), rum = loopNoise('pink'), rl = a.createBiquadFilter(), rmg = a.createGain();
      hp.type = 'highpass'; hp.frequency.value = 700; lp.type = 'lowpass'; lp.frequency.value = 9000; rg.gain.value = .55;
      r.connect(hp); hp.connect(lp); lp.connect(rg); rg.connect(g);
      rl.type = 'lowpass'; rl.frequency.value = 200; rmg.gain.value = .35; rum.connect(rl); rl.connect(rmg); rmg.connect(g);
      timers.push(setInterval(() => { if (Math.random() < .6) tone({ f: rand(1200, 3800), dur: .05, g: .012, bus: 'amb', pan: rand(-1, 1), verb: .3 }); }, 90));
    } else {
      const dg = a.createGain(), lp = a.createBiquadFilter(); dg.gain.value = .06; lp.type = 'lowpass'; lp.frequency.value = 400;
      [[55, -6], [82.41, 4], [110.2, 7]].forEach(([f, d]) => { const o = a.createOscillator(); o.frequency.value = f; o.detune.value = d; o.connect(lp); srcs.push(o); });
      lp.connect(dg); dg.connect(g); lfo(.07, .03, dg.gain);
      timers.push(setInterval(() => tone({ f: [880, 1318.5, 1760, 2093][Math.floor(Math.random() * 4)], dur: 2.5, g: .02, attack: .8, bus: 'amb', verb: .9, pan: rand(-.8, .8) }), 2600));
    }
    srcs.forEach(s => s.start());
    return () => {
      timers.forEach(clearInterval); g.gain.setTargetAtTime(0, a.currentTime, .5);
      setTimeout(() => { srcs.forEach(s => { try { s.stop(); } catch {} }); try { g.disconnect(); } catch {} }, 2500);
    };
  }
  function ambResolve() {
    let want = null;
    if (unlocked && !mix.muted && mix.ambience > 0) want = mix.ambMode === 'auto' ? (AMBMAP[curPage] || null) : (mix.ambMode === 'off' ? null : mix.ambMode);
    if (want === ambKind) return;
    if (ambStop) { ambStop(); ambStop = null; }
    ambKind = want; if (want) ambStop = ambStart(want);
  }

  /* a music-box melody with soft chords; notes: [{m: midi, t: seconds from now, d: seconds}] */
  function melody(notes, o) {
    o = o || {}; if (!live()) return 0; let end = 0;
    notes.forEach(n => {
      const f = hz(n.m), d = Math.max(.25, n.d * 1.5);
      tone({ f, dur: d, g: .1, at: n.t, verb: .6 }); tone({ f: f * 2, dur: d * .6, g: .03, at: n.t, verb: .6 }); tone({ f: f * 3.01, dur: d * .3, g: .012, at: n.t });
      end = Math.max(end, n.t + n.d);
    });
    (o.chords || []).forEach(c => c.m.forEach(m => tone({ f: hz(m), dur: c.d * 1.1, g: .03, at: c.t, type: 'triangle', attack: .06, verb: .5 })));
    if (o.duck) duckMusic(.25, end * 1000 + 600);
    return end;
  }

  /* ---------- 8. Public API ---------- */
  const notify = () => listeners.forEach(f => { try { f(); } catch {} });
  function unlock() {
    if (unlocked) { ctx(); return; }
    unlocked = true; ctx(); ambResolve();
  }
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => unlock(), { once: true, capture: true }));
  window.NatanAudio = {
    unlock, emit, sfx, melody,
    groups: GROUPS,
    music: Music,
    ambience: {
      page(id) { curPage = id; ambResolve(); },
      setMode(m) { mix.ambMode = m; persist(); ambResolve(); notify(); },
      get kind() { return ambKind; }
    },
    mixer: {
      get(k) { return mix[k]; },
      set(k, v) { mix[k] = k === 'ambMode' ? v : clamp(+v); persist(); applyMix(); if (k === 'ambience') ambResolve(); notify(); },
      setMuted(v) { mix.muted = !!v; applyMix(); ambResolve(); notify(); },
      get muted() { return mix.muted; },
      onChange(f) { listeners.push(f); }
    },
    analyser() { return ac ? nodes.an : null; }
  };
})();

/* The birthday cake experience: light the candles, sing along, blow them out, cut the cake, make a wish. */
(() => {
  'use strict';
  const App = window.NatanApp, A = window.NatanAudio, stage = document.getElementById('cakeStage');
  if (!App || !stage) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const NS = 'http://www.w3.org/2000/svg', emit = (n, o) => App.emit(n, o);
  const calm = () => App.reduce;

  /* ---------- the song (traditional melody, public domain) ---------- */
  const LINES = [
    [['Hap', 'py'], ['birth', 'day'], ['to'], ['you']],
    [['Hap', 'py'], ['birth', 'day'], ['to'], ['you']],
    [['Hap', 'py'], ['birth', 'day'], ['dear'], ['Na', 'tan']],
    [['Hap', 'py'], ['birth', 'day'], ['to'], ['you']]
  ];
  const NOTES = [
    [67, .75], [67, .25], [69, 1], [67, 1], [72, 1], [71, 2],
    [67, .75], [67, .25], [69, 1], [67, 1], [74, 1], [72, 2],
    [67, .75], [67, .25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 1],
    [77, .75], [77, .25], [76, 1], [72, 1], [74, 1], [72, 2]
  ];
  const CH = { C: [48, 52, 55], G: [43, 47, 50], F: [41, 45, 48] }, BARS = ['C', 'G', 'C', 'C', 'C', 'G', 'F', 'C'], BEAT = .62;

  /* ---------- artwork ---------- */
  function flowerSvg(x, y, r, col) {
    let s = ''; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; s += `<circle cx="${(x + Math.cos(a) * r).toFixed(1)}" cy="${(y + Math.sin(a) * r).toFixed(1)}" r="${(r * .75).toFixed(1)}" fill="${col}"/>`; }
    return s + `<circle cx="${x}" cy="${y}" r="${(r * .5).toFixed(1)}" fill="#FFFEFA"/>`;
  }
  function drips(x0, x1, y, fill) {
    let s = '';
    for (let x = x0; x < x1 - 8; x += rnd(15, 24)) { const l = rnd(8, 22); s += `<path d="M${x.toFixed(1)} ${y} v${l.toFixed(1)} a4.5 4.5 0 0 0 9 0 v-${l.toFixed(1)}z" fill="${fill}"/>`; }
    return s;
  }
  function pearls(x0, x1, y, step, r) {
    let s = ''; for (let x = x0; x <= x1; x += step) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFFEFA" stroke="#9fb5d0" stroke-width=".8"/>`;
    return s;
  }
  function sprinkles(x0, x1, y0, y1, n) {
    const cols = ['#EAF2FB', '#263F60', '#FFFEFA', '#34517a', '#d6e2f1']; let s = '';
    for (let i = 0; i < n; i++) { const x = rnd(x0, x1), y = rnd(y0, y1); s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="6" height="2.2" rx="1" fill="${pick(cols)}" transform="rotate(${Math.round(rnd(0, 180))} ${x.toFixed(1)} ${y.toFixed(1)})"/>`; }
    return s;
  }
  function gift(x, y, w, h, body, bow) {
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${body}"/><rect x="${x - 2}" y="${y}" width="${w + 4}" height="${h * .22}" rx="2" fill="${body}" stroke="#263F60" stroke-opacity=".25"/><rect x="${x + w / 2 - 3}" y="${y}" width="6" height="${h}" fill="#FFFEFA"/><path d="M${x + w / 2} ${y} q-12 -12 -14 -2 q2 8 14 2 q12 6 14 -2 q-2 -10 -14 2z" fill="${bow}" stroke="#263F60" stroke-opacity=".3"/></g>`;
  }
  function cakeArt() {
    let ph = ''; for (let i = 0; i < 44; i++) { const a = i / 44 * 6.283; ph += `<circle cx="${(180 + Math.cos(a) * 150).toFixed(1)}" cy="${(297 + Math.sin(a) * 15).toFixed(1)}" r="2.2" fill="none" stroke="#9fb5d0" stroke-width=".8"/>`; }
    return `<svg id="cakeSvg" class="cs" viewBox="0 0 360 352" role="img" aria-label="A three-tier birthday cake with number candles, a cat on each side, and presents on the table">
  <defs>
    <linearGradient id="gBase" x1="0" x2="1"><stop offset="0" stop-color="#6e91bb"/><stop offset=".5" stop-color="#8fb0d3"/><stop offset="1" stop-color="#6283ad"/></linearGradient>
    <linearGradient id="gMid" x1="0" x2="1"><stop offset="0" stop-color="#8399B3"/><stop offset=".5" stop-color="#b3c4da"/><stop offset="1" stop-color="#7388a3"/></linearGradient>
    <linearGradient id="gTop" x1="0" x2="1"><stop offset="0" stop-color="#e2ebf6"/><stop offset=".5" stop-color="#FFFEFA"/><stop offset="1" stop-color="#d6e2f1"/></linearGradient>
    <linearGradient id="gCloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF2FB"/><stop offset="1" stop-color="#b9cde4"/></linearGradient>
    <linearGradient id="gPlate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFEFA"/><stop offset="1" stop-color="#cfdcec"/></linearGradient>
    <linearGradient id="gWax" x1="0" x2="1"><stop offset="0" stop-color="#d6e2f1"/><stop offset=".45" stop-color="#FFFEFA"/><stop offset="1" stop-color="#c3d3e8"/></linearGradient>
    <radialGradient id="gGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3c8" stop-opacity=".95"/><stop offset=".35" stop-color="#ffd58a" stop-opacity=".45"/><stop offset="1" stop-color="#ffb35a" stop-opacity="0"/></radialGradient>
    <linearGradient id="gFlame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffb35a"/><stop offset=".55" stop-color="#ffe6a8"/><stop offset="1" stop-color="#FFFEFA"/></linearGradient>
    <pattern id="pStripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="3.5" height="8" fill="#7897BB" fill-opacity=".35"/></pattern>
    <filter id="fSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
    <symbol id="ctop" viewBox="0 0 44 54"><g fill="#263F60"><circle cx="20" cy="15" r="11"/><path d="M10 9 L11 -1 L19 6Z M30 9 L29 -1 L21 6Z"/><ellipse cx="20" cy="37" rx="12" ry="14"/></g><path d="M31 46 q12 -2 10 -17" fill="none" stroke="#263F60" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="14" r="1.5" fill="#FFFEFA"/><circle cx="24" cy="14" r="1.5" fill="#FFFEFA"/></symbol>
  </defs>
  <rect x="0" y="302" width="360" height="50" fill="url(#gCloth)"/>
  <path d="M0 322 H360" stroke="#7897BB" stroke-opacity=".35" stroke-dasharray="7 6"/>
  <path d="M0 340 q15 12 30 0 q15 12 30 0 q15 12 30 0 q15 12 30 0 q15 12 30 0 q15 12 30 0 q15 12 30 0 q15 12 30 0 q15 12 30 0 q15 12 30 0 q15 12 30 0 q15 12 30 0" fill="none" stroke="#7897BB" stroke-opacity=".5"/>
  <ellipse cx="180" cy="305" rx="165" ry="12" fill="#263F60" opacity=".2" filter="url(#fSoft)"/>
  ${gift(12, 312, 36, 32, '#8fb0d3', '#FFFEFA')}${gift(310, 318, 30, 26, '#b3c4da', '#7897BB')}
  <ellipse cx="180" cy="297" rx="152" ry="16" fill="url(#gPlate)" stroke="#9fb5d0"/><ellipse cx="180" cy="295" rx="126" ry="11" fill="none" stroke="#9fb5d0" stroke-opacity=".6"/>${ph}
  <rect x="46" y="236" width="268" height="58" rx="8" fill="url(#gBase)"/>${sprinkles(54, 304, 252, 288, 22)}
  <rect x="46" y="236" width="268" height="58" rx="8" fill="none" stroke="#263F60" stroke-opacity=".25"/>
  ${drips(52, 308, 236, '#FFFEFA')}<ellipse cx="180" cy="236" rx="134" ry="9" fill="#FFFEFA" stroke="#b9cde4"/>
  ${pearls(58, 302, 292, 11, 4.2)}
  <rect x="80" y="176" width="200" height="62" rx="8" fill="url(#gMid)"/>${sprinkles(88, 272, 192, 230, 16)}
  <rect x="80" y="176" width="200" height="62" rx="8" fill="none" stroke="#263F60" stroke-opacity=".25"/>
  ${drips(86, 274, 176, '#FFFEFA')}<ellipse cx="180" cy="176" rx="100" ry="7" fill="#FFFEFA" stroke="#b9cde4"/>
  ${pearls(88, 272, 236, 10, 3.6)}
  <rect x="118" y="120" width="124" height="58" rx="8" fill="url(#gTop)" stroke="#b9cde4"/>
  <rect x="118" y="120" width="124" height="58" rx="8" fill="url(#pStripe)"/>
  ${drips(122, 238, 120, '#FFFEFA')}<ellipse cx="180" cy="120" rx="62" ry="6" fill="#FFFEFA" stroke="#b9cde4"/>
  ${pearls(126, 234, 178, 9, 3.2)}
  <use href="#ctop" x="86" y="130" width="34" height="42"/><use href="#ctop" x="240" y="130" width="34" height="42" transform="translate(514 0) scale(-1 1)"/>
  <g>${flowerSvg(62, 232, 5, '#7897BB')}${flowerSvg(298, 232, 5, '#8399B3')}${flowerSvg(96, 176, 4, '#34517a')}${flowerSvg(264, 176, 4, '#5d7ea6')}</g>
  <g fill="#34517a"><circle cx="124" cy="119" r="4.6"/><circle cx="133" cy="122" r="3.8"/><circle cx="236" cy="119" r="4.6"/><circle cx="227" cy="122" r="3.8"/></g>
  <g fill="#5d7ea6"><path d="M114 122 q-9 -6 -14 2 q8 6 14 -2z"/><path d="M246 122 q9 -6 14 2 q-8 6 -14 -2z"/></g>
  <g id="candles"></g>
</svg>`;
  }
  function lights() {
    let s = '<svg class="cs-lights" viewBox="0 0 360 46" aria-hidden="true"><path d="M-4 6 Q90 50 180 18 T364 6" fill="none" stroke="#8399B3" stroke-width="1.2"/>';
    for (let i = 0; i < 15; i++) { const t = (i + .5) / 15, x = -4 + 368 * t, y = 6 + Math.sin(t * Math.PI * 2) * -2 + 40 * Math.sin(t * Math.PI) * (t < .5 ? .85 : .42) + 4; s += `<g class="bg g${i % 3}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="rgba(255,220,140,.25)"/><circle class="bulb" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4"/></g>`; }
    return s + '</svg>';
  }
  function bunting() {
    const cols = ['#7897BB', '#EAF2FB', '#8399B3', '#FFFEFA', '#5d7ea6'];
    let s = '<svg class="cs-bunting" viewBox="0 0 360 134" aria-hidden="true"><path d="M0 8 Q180 72 360 8" fill="none" stroke="#8399B3" stroke-width="1.5"/><path d="M90 64 Q180 116 270 64" fill="none" stroke="#8399B3" stroke-width="1.5"/>';
    const row = (txt, x0, w, y0, amp) => [...txt].forEach((ch, i) => {
      if (ch === ' ') return; const t = (i + .5) / txt.length, x = x0 + w * t, y = y0 + amp * t * (1 - t);
      s += `<g class="flag"><polygon points="${(x - 11).toFixed(1)},${y.toFixed(1)} ${(x + 11).toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${(y + 26).toFixed(1)}" fill="${cols[i % 5]}" stroke="#263F60" stroke-opacity=".5" stroke-width=".8"/><text x="${x.toFixed(1)}" y="${(y + 13).toFixed(1)}" text-anchor="middle" font-size="12" font-family="Libre Baskerville,serif" fill="${[1, 3].includes(i % 5) ? '#263F60' : '#FFFEFA'}">${ch}</text></g>`;
    });
    s += '<g class="cs-row r1">'; row('HAPPY BIRTHDAY', 0, 360, 8, 128); s += '</g><g class="cs-row r2">'; row('NATAN', 90, 180, 64, 104); s += '</g>';
    return s + '</svg>';
  }

  /* ---------- build the page ---------- */
  const lite = () => document.documentElement.dataset.perf === 'lite';
  let G3 = null, view = 'svg', glFailed = false;
  const want3d = () => !glFailed && !lite() && (() => { try { return localStorage.getItem('natan.cake3d') !== 'off'; } catch { return true; } })() && window.Cake3D && window.Cake3D.supported();
  const svgEl = () => $('#cakeSvg'), age = () => String(App.dateInfo().age), focusEl = () => (view === 'gl' ? $('#cake3d') : svgEl());
  function buildStage() {
    if (G3) { G3.dispose(); G3 = null; }
    view = want3d() ? 'gl' : 'svg';
    stage.innerHTML = lights() + bunting() + balloons + (view === 'gl' ? '<canvas id="cake3d" class="cs3d" tabindex="0" role="img" aria-label="A 3D birthday cake. Drag to turn it, or use the arrow keys."></canvas>' : cakeArt());
    const vb = $('#viewBtn'); if (vb) { vb.textContent = view === 'gl' ? 'Switch to 2D' : 'Switch to 3D'; vb.hidden = !(window.Cake3D && window.Cake3D.supported()) || glFailed || lite(); $('#cakeHint').hidden = view !== 'gl'; }
  }
  const balloons = ['#7897BB', '#8399B3', '#34517a', '#5d7ea6'].map((c, i) => `<i class="cs-bln b${i}" style="--c:${c}"></i>`).join('');
  stage.insertAdjacentHTML('afterend', '<div class="cs-tools"><button id="viewBtn" class="mini" data-quiet>Switch to 2D</button><span id="cakeHint" class="tiny">Drag the cake to turn it</span></div>');
  buildStage();
  const msg = $('#cakeMsg'), dim = document.createElement('div'); dim.id = 'cakeDim'; dim.setAttribute('aria-hidden', 'true'); $('#cake').appendChild(dim);
  $('#lyrics').innerHTML = LINES.map(l => `<p class="lyl">${l.map(w => `<span class="lyw">${w.map(sy => `<span class="lys">${sy}</span>`).join('')}</span>`).join(' ')}</p>`).join('');
  const syl = $$('.lys'), steps = $$('.cs-steps li');

  let state = 'unlit', timers = [], singing = false, mic = null, micCtx = null;
  const later = (f, ms) => { timers.push(setTimeout(f, ms)); };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  function setStep(n) { steps.forEach((li, i) => { li.classList.toggle('done', i < n); li.classList.toggle('cur', i === n); li.toggleAttribute('aria-current', i === n); }); }
  function buttons() {
    const show = (id, v) => { $('#' + id).hidden = !v; };
    show('lightBtn', state === 'unlit');
    show('singBtn', state === 'lit'); show('micBtn', state === 'lit'); show('blowBtn', state === 'lit');
    show('cutBtn', state === 'out'); show('relight', state === 'out'); show('cakeWish', state === 'out');
    $('#singBtn').disabled = singing; $('#singBtn').textContent = singing ? 'Singing…' : 'Sing along ♪';
  }
  function focusRing() { const r = focusEl().getBoundingClientRect(); dim.style.setProperty('--fx', (r.left + r.width / 2) + 'px'); dim.style.setProperty('--fy', (r.top + r.height * .32) + 'px'); }
  function dimOn(v) { dim.classList.toggle('on', v); stage.classList.toggle('lit', v); $('#cake').classList.toggle('room', v); if (G3) G3.room(v); if (v) focusRing(); }
  addEventListener('scroll', () => { if (state === 'lit') focusRing(); }, { passive: true });

  /* candles */
  function renderCandles() {
    if (view === 'gl') return;
    const digits = String(App.dateInfo().age).split(''), xs = digits.length === 1 ? [180] : [157, 203];
    $('#candles').innerHTML = digits.map((d, i) => { const x = xs[i];
      return `<g class="candle"><circle class="cglow" cx="${x}" cy="40" r="52" fill="url(#gGlow)"/><rect x="${x - 15}" y="64" width="30" height="56" rx="5" fill="url(#gWax)" stroke="#263F60" stroke-width="1.6"/><rect x="${x - 15}" y="64" width="30" height="56" rx="5" fill="url(#pStripe)"/><text x="${x}" y="101" text-anchor="middle" font-size="26" font-family="Libre Baskerville,serif" fill="#263F60">${d}</text><path d="M${x} 64 v-9" stroke="#263F60" stroke-width="1.6" stroke-linecap="round"/><path class="cflame" d="M${x} 56 c-7 -10 -5 -22 0 -30 c5 8 7 20 0 30z" fill="url(#gFlame)"/></g>`; }).join('');
  }
  function ensureGL() {
    if (view !== 'gl' || G3) return;
    try {
      const cv = $('#cake3d'); G3 = window.Cake3D.create(cv, { digits: age(), night: document.body.classList.contains('night'), calm,
        force: (() => { try { return localStorage.getItem('natan.cake3d') === 'force'; } catch { return false; } })(),
        onSlow: () => { glFailed = true; if (G3) G3.dispose(); G3 = null; buildStage(); if (App.page === 'cake') { enter(); msg.textContent = 'The 3D cake is slow on this device, so the 2D cake is shown.'; } } });
      cv.addEventListener('webglcontextlost', e => { e.preventDefault(); glFailed = true; G3 = null; buildStage(); enter(); });
    } catch (err) { glFailed = true; G3 = null; buildStage(); }
  }
  function enter() {
    clearTimers(); stopMic(); stopSong(); state = 'unlit'; singing = false; dimOn(false);
    ensureGL(); renderCandles();
    if (G3) { G3.setNight(document.body.classList.contains('night')); G3.reset(); G3.setDigits(age()); G3.intro(); G3.start(); }
    const sl = $('#slice'); if (sl) sl.remove();
    msg.textContent = 'Strike a match to light the candles.'; setStep(0); buttons(); $('#lyrics').classList.remove('on');
  }
  function leave() { clearTimers(); stopMic(); stopSong(); dimOn(false); if (G3) G3.stop(); }

  function light() {
    if (state !== 'unlit') return; state = 'lit';
    const n = age().length;
    for (let i = 0; i < n; i++) later(() => { if (G3) G3.light(i); else { const c = $$('.candle')[i]; if (c) c.classList.add('on'); } emit('cake.start'); }, 250 + i * 420);
    later(() => { msg.textContent = 'Make it count. Sing along, or just blow them out.'; }, 900);
    dimOn(true); setStep(1); buttons();
  }

  /* karaoke */
  function stopSong() { singing = false; syl.forEach(s => s.classList.remove('on')); }
  function sing() {
    if (state !== 'lit' || singing || !A || !A.melody) { if (!A || !A.melody) msg.textContent = 'Sound is not available here.'; return; }
    singing = true; buttons(); stopMic(); $('#lyrics').classList.add('on'); syl.forEach(s => s.classList.remove('on'));
    let t = .4, bar = 0; const notes = [];
    NOTES.forEach(([m, b], i) => { notes.push({ m, t, d: b * BEAT }); later(() => { if (syl[i]) syl[i].classList.add('on'); }, t * 1000); t += b * BEAT; });
    const chords = BARS.map((k, i) => ({ m: CH[k], t: .4 + i * 3 * BEAT, d: 3 * BEAT }));
    A.melody(notes, { chords, duck: true }); msg.textContent = 'Sing along…';
    later(() => { singing = false; if (state === 'lit') { msg.textContent = 'Now take a breath and blow them out.'; setStep(2); buttons(); } }, t * 1000 + 700);
  }

  /* blowing */
  function smoke(c) {
    if (calm()) return; const g = c.querySelector('.cflame'); if (!g) return; const b = g.getBBox();
    for (let k = 0; k < 3; k++) later(() => {
      const el = document.createElementNS(NS, 'circle'); el.setAttribute('cx', b.x + b.width / 2); el.setAttribute('cy', b.y + 8); el.setAttribute('r', 3); el.setAttribute('fill', 'rgba(150,165,185,.55)');
      el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center'; svgEl().appendChild(el);
      el.animate([{ transform: 'translate(0,0) scale(1)', opacity: .7 }, { transform: `translate(${rnd(-8, 8)}px,-52px) scale(3.2)`, opacity: 0 }], { duration: 2400, easing: 'ease-out' }).onfinish = () => el.remove();
    }, k * 280);
  }
  function confetti(n = 80) {
    if (calm()) return; const cols = ['#7897BB', '#263F60', '#8399B3', '#FFFEFA', '#EAF2FB', '#5d7ea6'];
    for (let i = 0; i < n; i++) later(() => {
      const c = document.createElement('i'); c.className = 'confetti'; c.style.left = rnd(0, 100) + 'vw'; c.style.background = pick(cols); document.body.appendChild(c);
      c.animate([{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: `translateY(${innerHeight + 40}px) translateX(${rnd(-90, 90)}px) rotate(${rnd(200, 900)}deg)`, opacity: .9 }], { duration: rnd(2600, 4800), easing: 'cubic-bezier(.3,.5,.6,1)' }).onfinish = () => c.remove();
    }, rnd(0, 1400));
  }
  function blow() {
    if (state !== 'lit') return; state = 'out'; stopMic(); stopSong(); clearTimers(); buttons(); emit('cake.blow');
    const n = age().length;
    for (let i = 0; i < n; i++) later(() => { if (G3) G3.snuff(i); else { const c = $$('.candle')[i]; if (c) { c.classList.remove('on'); c.classList.add('out'); smoke(c); } } emit('cake.out'); }, 450 + i * 380);
    later(() => { dimOn(false); msg.textContent = 'Candles out. Now make a wish ✦'; emit('cake.done'); App.fireworks(6); confetti(); setStep(3); }, 1400);
    $('#lyrics').classList.remove('on');
  }
  function stopMic() {
    if (mic) { mic.getTracks().forEach(t => t.stop()); mic = null; }
    if (micCtx) { micCtx.close().catch(() => {}); micCtx = null; }
  }
  async function listen() {
    if (mic || state !== 'lit') return;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AC = window.AudioContext || window.webkitAudioContext; micCtx = new AC();
      const an = micCtx.createAnalyser(); an.fftSize = 512; micCtx.createMediaStreamSource(mic).connect(an);
      const buf = new Uint8Array(an.fftSize); let hot = 0; msg.textContent = 'Listening… blow towards your microphone.';
      (function check() {
        if (!micCtx) return; an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) { const d = (v - 128) / 128; s += d * d; }
        hot = Math.sqrt(s / buf.length) > .2 ? hot + 1 : Math.max(0, hot - 1);
        if (hot > 4) blow(); else requestAnimationFrame(check);
      })();
    } catch { stopMic(); msg.textContent = 'No microphone available. Use the tap button instead.'; }
  }

  /* cutting the cake */
  let served = 0;
  function cut() {
    if ($('#slice') || (G3 && G3.isCut && G3.isCut())) return; served++;
    if (G3) { G3.cut(); emit('cake.done'); msg.textContent = 'A slice, saved for you ♡'; App.burst(innerWidth / 2, innerHeight * .6, ['♡', '✦', '✿']); return; }
    const g = document.createElementNS(NS, 'g'); g.id = 'slice';
    g.innerHTML = '<ellipse cx="180" cy="338" rx="50" ry="8" fill="#FFFEFA" stroke="#9fb5d0"/><rect x="150" y="318" width="60" height="18" rx="3" fill="url(#gBase)"/><rect x="158" y="302" width="44" height="18" rx="3" fill="url(#gMid)"/><rect x="164" y="288" width="32" height="16" rx="3" fill="url(#gTop)" stroke="#b9cde4"/><path d="M164 288 q8 9 16 0 q8 9 16 0" fill="none" stroke="#FFFEFA" stroke-width="3"/><circle cx="180" cy="285" r="4.4" fill="#34517a"/><path d="M222 340 l24 -20 M246 320 l5 -6 M246 320 l-1 -8" stroke="#263F60" stroke-width="2" stroke-linecap="round" fill="none"/>';
    svgEl().appendChild(g); emit('cake.done'); msg.textContent = 'A slice, saved for you ♡';
    if (!calm()) g.animate([{ transform: 'translateY(-40px) scale(.5)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' });
    App.burst(innerWidth / 2, innerHeight * .6, ['♡', '✦', '✿']);
  }
  function relight() { const sl = $('#slice'); if (sl) sl.remove(); enter(); }

  $('#lightBtn').addEventListener('click', light);
  $('#singBtn').addEventListener('click', sing);
  $('#micBtn').addEventListener('click', listen);
  $('#blowBtn').addEventListener('click', blow);
  $('#cutBtn').addEventListener('click', cut);
  $('#relight').addEventListener('click', () => { emit('cake.start'); relight(); });
  addEventListener('resize', () => { if (state === 'lit') focusRing(); });
  $('#viewBtn').addEventListener('click', () => { try { localStorage.setItem('natan.cake3d', view === 'gl' ? 'off' : 'on'); } catch {} glFailed = false; buildStage(); if (App.page === 'cake') enter(); emit('toggle.on'); });
  addEventListener('natan-perf', () => { buildStage(); if (App.page === 'cake') enter(); else renderCandles(); });

  window.NatanCake = { enter, leave };
  if (App.page === 'cake') enter(); else renderCandles();
})();

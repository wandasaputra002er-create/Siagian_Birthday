/* Scene layer: landscape, fireflies, aurora, birds, cursor light, text halo, time slider. */
(() => {
  'use strict';
  const App = window.NatanApp; if (!App) return;
  const $ = (s, r = document) => r.querySelector(s);
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- landscape ---------- */
  let trees = '';
  for (let x = -10; x < 1450; x += rnd(20, 38)) {
    const h = rnd(34, 80), w = h * .42, y = 300 + Math.sin(x / 140) * 8;
    trees += `<g class="tree"><path d="M${x.toFixed(0)} ${(y - h).toFixed(0)} l${(-w * .55).toFixed(1)} ${(h * .38).toFixed(1)} h${(w * .3).toFixed(1)} l${(-w * .75).toFixed(1)} ${(h * .34).toFixed(1)} h${(w * .4).toFixed(1)} l${(-w * .8).toFixed(1)} ${(h * .4).toFixed(1)} h${(w * 2.2).toFixed(1)} l${(-w * .8).toFixed(1)} ${(-h * .4).toFixed(1)} h${(w * .4).toFixed(1)} l${(-w * .75).toFixed(1)} ${(-h * .34).toFixed(1)} h${(w * .3).toFixed(1)}z"/></g>`;
  }
  let ffs = ''; for (let i = 0; i < 12; i++) ffs += `<i class="ff" style="left:${rnd(2, 98).toFixed(0)}%;top:${rnd(8, 95).toFixed(0)}%;--d:${rnd(11, 20).toFixed(1)}s;--dl:${(-rnd(0, 12)).toFixed(1)}s"></i>`;
  let birds = ''; for (let i = 0; i < 5; i++) birds += `<i class="bird" style="top:${rnd(8, 36).toFixed(0)}%;--d:${rnd(24, 40).toFixed(0)}s;--dl:${(-rnd(0, 30)).toFixed(0)}s"><svg viewBox="0 0 24 8"><path d="M0 6 Q6 -2 12 6 Q18 -2 24 6"/></svg></i>`;
  const html = `<div id="scene" aria-hidden="true">
    <div class="aurora"><i></i><i></i><i></i></div>
    <div class="birds">${birds}</div>
    <div class="ffs">${ffs}</div>
    <svg class="hills" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice">
      <g class="L1"><path d="M-40 230 C200 160 400 250 640 195 S1040 150 1240 215 S1420 190 1500 205 V400 H-40Z"/></g>
      <g class="L2"><path d="M-40 275 C220 225 420 305 700 255 S1100 215 1500 275 V400 H-40Z"/>${trees}</g>
      <g class="L3"><path d="M-40 335 C260 295 520 355 820 315 S1240 295 1500 335 V400 H-40Z"/>
        <g class="cabin"><rect class="wall" x="1098" y="296" width="46" height="28"/><polygon class="roof" points="1090,296 1121,274 1152,296"/><rect class="roof" x="1134" y="278" width="6" height="14"/><rect class="win" x="1109" y="303" width="10" height="10" rx="1"/><rect class="roof" x="1127" y="308" width="8" height="16"/>
          <g class="smoke"><circle cx="1137" cy="274" r="3"/><circle cx="1137" cy="274" r="3"/><circle cx="1137" cy="274" r="3"/></g></g>
      </g>
    </svg></div><div id="glow" aria-hidden="true"></div>`;
  const clouds = $('.clouds'); if (clouds) clouds.insertAdjacentHTML('afterend', html); else document.body.insertAdjacentHTML('afterbegin', html);

  /* cursor light (mouse only) */
  const glow = $('#glow');
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', e => { if (document.documentElement.dataset.perf === 'lite') return; glow.classList.add('on'); glow.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, { passive: true });
    document.addEventListener('pointerleave', () => glow.classList.remove('on'));
  }

  /* ---------- text halo around the home photo ---------- */
  const home = $('#home'), pol = $('#heroPol');
  if (home && pol) {
    let stars = ''; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, r = 214; stars += `<circle class="hs" cx="${(220 + Math.cos(a) * r).toFixed(1)}" cy="${(220 + Math.sin(a) * r).toFixed(1)}" r="${i % 3 ? 1.2 : 2}"/>`; }
    home.insertAdjacentHTML('afterbegin', `<svg class="halo" viewBox="0 0 440 440" aria-hidden="true"><defs><path id="hp" d="M220 220 m-196 0 a196 196 0 1 1 392 0 a196 196 0 1 1 -392 0"/></defs><circle class="hr" cx="220" cy="220" r="206"/><circle class="hr" cx="220" cy="220" r="184"/><text><textPath href="#hp" textLength="1226" lengthAdjust="spacing">HAPPY BIRTHDAY · NATAN · A LITTLE UNIVERSE · 03 JANUARY 2007 · </textPath></text>${stars}</svg>`);
    const halo = $('.halo', home);
    const place = () => { halo.style.top = (pol.offsetTop + pol.offsetHeight / 2) + 'px'; };
    place(); addEventListener('resize', place); App.onPage(id => { if (id === 'home') requestAnimationFrame(place); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    pol.addEventListener('load', place, true);
  }

  /* ---------- time of day slider (preview any hour) ---------- */
  const mixer = $('#mixer');
  if (mixer) {
    $('.mix-h', mixer).insertAdjacentHTML('afterend', '<div class="timerow"><span>Time of day</span><input id="mHour" type="range" min="0" max="24" step="0.25" aria-label="Preview the time of day"><button id="mNow" class="mini">Now</button></div><p id="mHourTxt" class="tiny" aria-live="polite"></p>');
    const sl = $('#mHour'), txt = $('#mHourTxt'), now = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
    const fmt = h => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
    const show = h => { txt.textContent = `${fmt(h)} · ${App.tod.label}`; };
    sl.value = now(); show(now());
    sl.addEventListener('input', () => { App.setHour(parseFloat(sl.value)); show(parseFloat(sl.value)); });
    $('#mNow').addEventListener('click', () => { App.setHour(null); sl.value = now(); show(now()); });
  }

  /* ---------- performance: automatic lite mode + manual switch ---------- */
  const root = document.documentElement, store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  let mode = ['auto', 'lite', 'full'].includes(store.get('natan.perf')) ? store.get('natan.perf') : 'auto', autoLite = false;
  function paintPerf() {
    const t = $('#perfTxt'); if (!t) return;
    [...document.querySelectorAll('[data-pm]')].forEach(b => b.setAttribute('aria-pressed', b.dataset.pm === mode));
    t.textContent = `Now: ${root.dataset.perf === 'lite' ? 'lite (lighter effects)' : 'full'}${mode === 'auto' ? ' · Auto switches to lite on slow devices' : ''}`;
  }
  function applyPerf() { root.dataset.perf = (mode === 'lite' || (mode === 'auto' && autoLite)) ? 'lite' : 'full'; window.dispatchEvent(new Event('natan-perf')); paintPerf(); }
  function measureFps(ms, cb) { let n = 0, t0 = 0; const step = t => { if (!t0) t0 = t; n++; if (t - t0 < ms) requestAnimationFrame(step); else cb(n / ((t - t0) / 1000)); }; requestAnimationFrame(step); }
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) autoLite = true; /* very low-memory phones start in lite mode; the rest is decided by measuring */
  [2500, 8000].forEach(d => setTimeout(() => { if (mode === 'auto' && !autoLite && !document.hidden) measureFps(1500, fps => { if (fps < 38) { autoLite = true; applyPerf(); } }); }, d));
  if (mixer) {
    $('#mHourTxt').insertAdjacentHTML('afterend', '<div class="timerow"><span>Performance</span><div class="seg" role="group" aria-label="Performance mode"><button class="mini" data-pm="auto">Auto</button><button class="mini" data-pm="lite">Lite</button><button class="mini" data-pm="full">Full</button></div></div><p id="perfTxt" class="tiny" aria-live="polite"></p>');
    [...document.querySelectorAll('[data-pm]')].forEach(b => b.addEventListener('click', () => { mode = b.dataset.pm; store.set('natan.perf', mode); applyPerf(); }));
  }
  applyPerf();
})();

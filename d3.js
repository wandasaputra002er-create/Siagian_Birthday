/* CSS 3D: memories ring, 3D universe, home depth. Light on the GPU: only transforms. */
(() => {
  'use strict';
  const App = window.NatanApp; if (!App) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LS = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let page = App.page;

  /* ---------- home: depth that follows the pointer or the tilt of the phone ---------- */
  const home = $('#home'); let hx = 0, hy = 0, tx = 0, ty = 0, hraf = 0;
  function homeTick() {
    hraf = 0; hx += (tx - hx) * .12; hy += (ty - hy) * .12;
    home.style.setProperty('--hx', hx.toFixed(2) + 'deg'); home.style.setProperty('--hy', hy.toFixed(2) + 'deg');
    if (Math.abs(tx - hx) + Math.abs(ty - hy) > .03 && page === 'home') hraf = requestAnimationFrame(homeTick);
  }
  const homeAim = (x, y) => { tx = x; ty = y; if (!hraf && page === 'home') hraf = requestAnimationFrame(homeTick); };
  addEventListener('pointermove', e => { if (e.pointerType === 'touch' || App.reduce || page !== 'home') return; homeAim((e.clientX / innerWidth - .5) * 10, -(e.clientY / innerHeight - .5) * 7); }, { passive: true });
  function orient(e) { if (App.reduce || page !== 'home' || e.gamma == null) return; homeAim(clamp(e.gamma * .3, -8, 8), clamp(-((e.beta || 45) - 45) * .18, -6, 6)); }
  if ('DeviceOrientationEvent' in window) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      $('.row', home).insertAdjacentHTML('afterend', '<button id="tiltBtn" class="btn ghost tiltbtn" data-quiet>Tilt with your phone</button>');
      $('#tiltBtn').addEventListener('click', async () => { try { if ((await DeviceOrientationEvent.requestPermission()) === 'granted') { addEventListener('deviceorientation', orient); $('#tiltBtn').hidden = true; } } catch {} });
    } else if (matchMedia('(pointer: coarse)').matches) addEventListener('deviceorientation', orient);
  }

  /* ---------- memories: a ring of photographs ---------- */
  const grid = $('#grid'), mem = $('#memories'), lead = $('.lead', mem);
  const wrap = document.createElement('div'); wrap.className = 'ringwrap'; grid.before(wrap); wrap.appendChild(grid);
  wrap.insertAdjacentHTML('beforeend', '<button class="ringnav l" aria-label="Previous photograph" data-quiet>‹</button><button class="ringnav r" aria-label="Next photograph" data-quiet>›</button>');
  $('#shuffleBtn').parentElement.insertAdjacentHTML('beforeend', '<button id="ringBtn" class="btn ghost" data-quiet>Grid view</button>');
  let ring = LS.get('natan.ring') !== 'off', spin = 0, vel = 0, target = null, dragging = false, moved = false, rraf = 0, lastT = 0, R = 260;
  const cards = () => $$('.flip', grid), step = () => 360 / Math.max(1, cards().length);
  function layout() {
    const cs = cards(), n = cs.length, w = cs[0] ? cs[0].offsetWidth : 190; R = Math.round(w / 2 / Math.tan(Math.PI / n) + 34);
    grid.style.transform = `translateZ(${-R}px)`;
    cs.forEach((c, i) => {
      const a = i * step() + spin, k = Math.cos(a * Math.PI / 180);
      c.style.transform = `rotateY(${a.toFixed(2)}deg) translateZ(${R}px)`; c.style.opacity = (.32 + .68 * clamp((k + .2) / 1.2, 0, 1)).toFixed(2);
      c.style.pointerEvents = k > .25 ? '' : 'none'; c.classList.toggle('front', k > .93);
    });
  }
  function rtick(now) {
    rraf = 0; const dt = Math.min(.05, (now - lastT) / 1000 || .016); lastT = now;
    if (!dragging) {
      if (Math.abs(vel) > 8) { spin += vel * dt; vel *= Math.pow(.05, dt); if (Math.abs(vel) <= 8) target = Math.round(spin / step()) * step(); }
      else if (target != null) { spin += (target - spin) * Math.min(1, dt * 7); if (Math.abs(target - spin) < .05) { spin = target; target = null; } }
    }
    layout();
    if (ring && page === 'memories' && (dragging || Math.abs(vel) > 8 || target != null)) rraf = requestAnimationFrame(rtick);
  }
  const kick = () => { if (!rraf && ring && page === 'memories') { lastT = performance.now(); rraf = requestAnimationFrame(rtick); } };
  const go = d => { vel = 0; target = (Math.round(spin / step()) - d) * step(); kick(); App.emit('photo.slide'); };
  function setRing(v) {
    ring = v; LS.set('natan.ring', v ? 'on' : 'off'); wrap.classList.toggle('ring3d', v);
    $('#ringBtn').textContent = v ? 'Grid view' : '3D ring'; $('#shuffleBtn').hidden = $('#tidyBtn').hidden = v;
    lead.textContent = v ? 'Six frames. Drag the ring (or use the arrows) and tap a photograph to turn it over and read the message behind it. Captions, dates and messages can be edited by tapping them.' : 'Six frames. Tap a photograph to turn it over and read the message behind it. Captions, dates and messages can be edited by tapping them.';
    if (v) { layout(); } else { grid.style.transform = ''; cards().forEach(c => { c.style.transform = c.style.opacity = c.style.pointerEvents = ''; c.classList.remove('front'); }); }
  }
  let sx = 0, lx = 0, lt = 0;
  wrap.addEventListener('pointerdown', e => { if (!ring || e.target.closest('.ringnav,[contenteditable],.mbtn')) return; dragging = true; moved = false; sx = lx = e.clientX; lt = performance.now(); vel = 0; target = null; });
  addEventListener('pointermove', e => {
    if (!dragging) return; const dx = e.clientX - lx, now = performance.now(); if (Math.abs(e.clientX - sx) > 8) { moved = true; wrap.classList.add('drag'); }
    if (moved) { spin += dx * .42; vel = dx * .42 / Math.max(.008, (now - lt) / 1000); layout(); }
    lx = e.clientX; lt = now;
  });
  addEventListener('pointerup', () => { if (!dragging) return; dragging = false; wrap.classList.remove('drag'); if (moved) { vel = clamp(vel, -700, 700); if (Math.abs(vel) <= 8) target = Math.round(spin / step()) * step(); } kick(); setTimeout(() => { moved = false; }, 0); });
  wrap.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);
  wrap.addEventListener('focusin', e => { const c = e.target.closest('.flip'); if (!ring || !c) return; const i = cards().indexOf(c); target = Math.round((-i * step() - spin) / 360) * 360 + (-i * step()); kick(); });
  $('.ringnav.l', wrap).addEventListener('click', () => go(-1)); $('.ringnav.r', wrap).addEventListener('click', () => go(1));
  mem.addEventListener('keydown', e => { if (!ring || e.target.closest('[contenteditable]')) return; if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); });
  $('#ringBtn').addEventListener('click', () => { setRing(!ring); App.emit('toggle.on'); });
  addEventListener('resize', () => { if (ring) layout(); });
  setRing(ring);

  /* ---------- universe: tilted, turnable ---------- */
  const orr = $('.orrery');
  if (orr) {
    const w = document.createElement('div'); w.className = 'orr3d'; while (orr.firstChild) w.appendChild(orr.firstChild); orr.appendChild(w);
    let rz = 20, tilt = 58, d = null, mv = false;
    const paint = () => { orr.style.setProperty('--rz', rz.toFixed(1) + 'deg'); orr.style.setProperty('--tilt', tilt.toFixed(1) + 'deg'); };
    orr.addEventListener('pointerdown', e => { d = { x: e.clientX, y: e.clientY, rz, tilt }; mv = false; });
    addEventListener('pointermove', e => { if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 8) mv = true; if (mv) { rz = d.rz + dx * .4; if (e.pointerType !== 'touch') tilt = clamp(d.tilt - dy * .25, 28, 76); paint(); } }, { passive: true });
    addEventListener('pointerup', () => { d = null; setTimeout(() => { mv = false; }, 0); });
    orr.addEventListener('click', e => { if (mv) { e.stopPropagation(); e.preventDefault(); } }, true);
    paint();
  }

  App.onPage(id => { page = id; if (id === 'memories' && ring) { layout(); } if (id === 'home') homeAim(0, 0); });
})();

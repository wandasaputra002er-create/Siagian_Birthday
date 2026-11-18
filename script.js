(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LS = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }
  };
  const OS_REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let reduce = OS_REDUCE || LS.get('natan.calm') === '1'; /* calm mode can change it at runtime */
  const { MEMORIES, SECRET, NOTES } = window.CONTENT; /* personal text lives in js/content.js */
  const pageHooks = [];
  /* a small, friendly safety net: one broken feature never takes the whole site down */
  const toast = (t, ms = 4200) => { const el = $('#toast'); if (!el) return; el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, ms); };
  let errCount = 0;
  addEventListener('error', e => { console.error(e.error || e.message); if (++errCount <= 2) toast('Something small went wrong, but the rest of the site still works.'); });
  addEventListener('unhandledrejection', e => { console.error(e.reason); });
  const PAGES = ['home', 'letter', 'memories', 'surprise', 'wish', 'cake', 'numbers', 'notes', 'universe'];
  let shown = false, page = 'home';



  /* ---------- Theme: Auto follows the time of day (dawn, morning, midday, afternoon, sunset, dusk, night) ---------- */
  const PHASES = [[0, 'night', 'Night', true], [4.5, 'dawn', 'Dawn', false], [6.5, 'morning', 'Morning', false], [11, 'midday', 'Midday', false],
    [15, 'afternoon', 'Afternoon', false], [17, 'sunset', 'Sunset', false], [18.5, 'dusk', 'Dusk', true], [19.5, 'night', 'Night', true]];
  const phaseAt = h => PHASES.reduce((p, x) => (h >= x[0] ? x : p), PHASES[0]);
  let previewHour = null; /* set by the time slider in the mixer */
  let themeMode = ['auto', 'light', 'dark'].includes(LS.get('natan.theme')) ? LS.get('natan.theme') : 'auto';
  let tod = { name: 'morning', label: 'Morning', night: false, h: 9 };
  function updateTod() {
    const n = new Date(), real = n.getHours() + n.getMinutes() / 60;
    let hr = previewHour !== null ? previewHour : themeMode === 'light' ? 12 : themeMode === 'dark' ? 23 : real, p = phaseAt(hr);
    if (page === 'wish' && !p[3]) { hr = 23; p = phaseAt(23); } /* the wish page is always under a night sky */
    tod = { name: p[1], label: p[2], night: p[3], h: hr };
  }
  function applyTheme() {
    updateTod();
    document.body.dataset.tod = tod.name;
    document.body.classList.toggle('night', tod.night || page === 'wish');
    const b = $('#themeBtn');
    b.textContent = { auto: '◐', light: '☀', dark: '☾' }[themeMode];
    b.setAttribute('aria-label', `Theme: ${themeMode === 'auto' ? 'follows the time of day, now ' + tod.label.toLowerCase() : themeMode}. Tap to change`);
    b.title = themeMode === 'auto' ? `Auto · ${tod.label}` : themeMode === 'light' ? 'Day' : 'Night';
    drawOnce();
  }
  $('#themeBtn').addEventListener('click', () => { themeMode = { auto: 'light', light: 'dark', dark: 'auto' }[themeMode]; LS.set('natan.theme', themeMode); applyTheme(); emit(tod.night ? 'theme.night' : 'theme.day'); });
  setInterval(() => { if (themeMode === 'auto') applyTheme(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && themeMode === 'auto') applyTheme(); });

  /* ---------- Sky canvas: stars, parallax, shooting stars, wish constellation ---------- */
  const cv = $('#sky'), cx = cv.getContext('2d');
  let W, H, D, stars = [], mx = 0, my = 0, shoots = [], wishes = [], raf = 0;
  function resize() {
    D = Math.min(devicePixelRatio || 1, 2);
    W = cv.width = Math.round(innerWidth * D); H = cv.height = Math.round(innerHeight * D);
    stars = Array.from({ length: Math.min(document.documentElement.dataset.perf === 'lite' ? 70 : 160, Math.round(innerWidth * innerHeight / 9000)) }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + .4, z: Math.random() * .9 + .1, p: Math.random() * 6.28 }));
    drawOnce();
  }
  const wishPts = () => wishes.map((_, i) => [(.12 + ((i * .618034) % 1) * .76) * W, (.1 + ((i * .414214 + .3) % 1) * .38) * H]);
  function shootNow() {
    shoots.push({ x: Math.random() * W * .5, y: Math.random() * H * .3, vx: (9 + Math.random() * 5) * D, vy: (4 + Math.random() * 3) * D, l: 60 });
    if (reduce) return; if (!raf) loop();
  }
  /* sun, moon and horizon glow that follow the time of day */
  function drawHeavens() {
    const h = tod.h, sun = h >= 5.5 && h < 18.5;
    if (tod.name === 'sunset' || tod.name === 'dawn' || tod.name === 'dusk') {
      const g = cx.createRadialGradient(W * .5, H * 1.05, 0, W * .5, H * 1.05, H * .85), c = tod.name === 'dawn' ? '255,205,190' : tod.name === 'dusk' ? '190,140,190' : '255,150,110';
      g.addColorStop(0, `rgba(${c},.38)`); g.addColorStop(1, `rgba(${c},0)`); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    }
    const p = Math.min(1, Math.max(0, sun ? (h - 5.5) / 13 : (h >= 18.5 ? h - 18.5 : h + 5.5) / 11));
    const e = Math.sin(Math.PI * p), x = W * (.1 + .8 * p), y = H * (.6 - .48 * e), R = 17 * D;
    if (sun) {
      const c = `255,${Math.round(165 + 70 * e)},${Math.round(105 + 85 * e)}`, g = cx.createRadialGradient(x, y, 0, x, y, 120 * D);
      g.addColorStop(0, `rgba(${c},.75)`); g.addColorStop(.2, `rgba(${c},.35)`); g.addColorStop(1, `rgba(${c},0)`);
      cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, 120 * D, 0, 6.283); cx.fill();
      cx.fillStyle = 'rgba(255,252,240,.95)'; cx.beginPath(); cx.arc(x, y, R, 0, 6.283); cx.fill();
    } else {
      cx.fillStyle = 'rgba(255,254,250,.92)'; cx.beginPath(); cx.arc(x, y, R, 0, 6.283); cx.fill();
      cx.globalCompositeOperation = 'destination-out'; cx.beginPath(); cx.arc(x + R * .5, y - R * .3, R * .9, 0, 6.283); cx.fill();
      cx.globalCompositeOperation = 'destination-over';
      const g = cx.createRadialGradient(x, y, 0, x, y, 80 * D); g.addColorStop(0, 'rgba(255,254,250,.28)'); g.addColorStop(1, 'rgba(255,254,250,0)');
      cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, 80 * D, 0, 6.283); cx.fill();
      cx.globalCompositeOperation = 'source-over';
    }
  }
  function draw(t) {
    cx.clearRect(0, 0, W, H);
    const night = document.body.classList.contains('night'), col = night ? '255,254,250' : '120,151,187';
    drawHeavens();
    for (const s of stars) {
      const a = (.25 + .5 * Math.abs(Math.sin(t / 1500 * s.z + s.p))) * (night ? 1 : .7);
      cx.fillStyle = `rgba(${col},${a})`;
      const x = ((s.x * W - mx * s.z * 30 * D) % W + W) % W, y = ((s.y * H - my * s.z * 30 * D) % H + H) % H;
      cx.beginPath(); cx.arc(x, y, s.r * D, 0, 6.283); cx.fill();
    }
    if (page === 'wish' && wishes.length) {
      const pts = wishPts();
      cx.strokeStyle = 'rgba(120,151,187,.55)'; cx.lineWidth = D; cx.beginPath();
      pts.forEach((p, i) => i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1])); cx.stroke();
      pts.forEach(p => {
        const g = cx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 16 * D);
        g.addColorStop(0, 'rgba(255,254,250,.95)'); g.addColorStop(1, 'rgba(255,254,250,0)');
        cx.fillStyle = g; cx.beginPath(); cx.arc(p[0], p[1], 16 * D, 0, 6.283); cx.fill();
      });
    }
    if (!reduce && Math.random() < .003) shoots.push({ x: Math.random() * W * .6, y: Math.random() * H * .3, vx: (9 + Math.random() * 5) * D, vy: (4 + Math.random() * 3) * D, l: 55 });
    shoots = shoots.filter(s => s.l > 0);
    for (const s of shoots) {
      const g = cx.createLinearGradient(s.x, s.y, s.x - s.vx * 7, s.y - s.vy * 7);
      g.addColorStop(0, `rgba(${night ? '255,254,250' : '38,63,96'},.9)`); g.addColorStop(1, 'rgba(255,254,250,0)');
      cx.strokeStyle = g; cx.lineWidth = 1.6 * D; cx.beginPath(); cx.moveTo(s.x, s.y); cx.lineTo(s.x - s.vx * 7, s.y - s.vy * 7); cx.stroke();
      s.x += s.vx; s.y += s.vy; s.l--;
    }
  }
  let lastDraw = 0;
  function loop(t = 0) {
    const lite = document.documentElement.dataset.perf === 'lite';
    if (!(lite && t - lastDraw < 33)) { lastDraw = t; draw(t); } /* lite mode draws the sky at about 30 fps */
    raf = (!document.hidden && !reduce) ? requestAnimationFrame(loop) : 0;
  }
  function drawOnce() { if (!cv.width) return; if (reduce || !raf) draw(performance.now()); }
  addEventListener('resize', resize); addEventListener('natan-perf', resize);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf && !reduce) loop(); });
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  addEventListener('scroll', () => { const h = document.documentElement; $('#progress').style.width = (scrollY / Math.max(1, h.scrollHeight - innerHeight) * 100) + '%'; }, { passive: true });

  /* ---------- Particle burst ---------- */
  function burst(x, y, glyphs = ['✦', '♡', '✧']) {
    if (reduce) return;
    for (let i = 0; i < 22; i++) {
      const s = document.createElement('span');
      s.className = 'bit'; s.textContent = glyphs[i % glyphs.length]; s.style.left = x + 'px'; s.style.top = y + 'px';
      document.body.appendChild(s);
      const a = Math.random() * 6.28, d = 60 + Math.random() * 120;
      s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 60}px) scale(.4) rotate(${Math.random() * 360}deg)`, opacity: 0 }], { duration: 1000 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
    }
  }

  /* ---------- Image fallback ---------- */
  function fallback(img) { const ph = img.parentElement; img.remove(); ph.textContent = 'Photo not found - see README'; }
  /* try the usual alternative file names (natan.jpeg, natan.png, natan.jpg.jpg…) before giving up */
  function failImg(i) {
    const alts = (i.dataset.alts || '').split('|').filter(Boolean);
    if (alts.length) { i.dataset.alts = alts.slice(1).join('|'); i.src = alts[0]; } else fallback(i);
  }
  document.addEventListener('error', e => { if (e.target.tagName === 'IMG' && e.target.id !== 'lbImg') failImg(e.target); }, true);
  $$('img').forEach(i => { if (i.complete && i.naturalWidth === 0) failImg(i); });

  /* ---------- Home: counters + tilt ---------- */
  function tick() {
    const n = new Date(), days = Math.floor((n - new Date(2007, 0, 3)) / 864e5);
    $('#daysLine').textContent = `${days.toLocaleString('en-US')} days of being Natan`;
    const today = n.getMonth() === 0 && n.getDate() === 3;
    let nb = new Date(n.getFullYear(), 0, 3); if (!today && n > nb) nb = new Date(n.getFullYear() + 1, 0, 3);
    const age = nb.getFullYear() - 2007;
    if (today) { $('#cdLine').textContent = `Turning ${age} today ♡`; return; }
    const ms = nb - n, d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
    $('#cdLine').textContent = `Turning ${age} in ${d}d ${h}h ${m}m ${s}s`;
  }
  tick(); setInterval(() => { if (page === 'home' && !document.hidden) tick(); }, 1000);
  const pol = $('#heroPol');
  pol.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || reduce) return;
    const r = pol.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    pol.style.transform = `perspective(700px) rotate(-3deg) rotateY(${x * 16}deg) rotateX(${-y * 16}deg)`;
  });
  pol.addEventListener('pointerleave', () => { pol.style.transform = ''; });

  /* ---------- Navigation (hash routing, Back button works) ---------- */
  const menu = $('#menu'), fab = $('#fab');
  function closeMenu(silent) { if (!menu.hidden && !silent) emit('menu.close'); menu.hidden = true; fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-label', 'Open menu'); }
  function openMenu() {
    $$('button', menu).forEach(b => b.classList.toggle('cur', b.dataset.go === page));
    emit('menu.open'); menu.hidden = false; fab.setAttribute('aria-expanded', 'true'); fab.setAttribute('aria-label', 'Close menu'); $('button', menu).focus();
  }
  function show(id) {
    if (!PAGES.includes(id)) id = 'home';
    page = id;
    PAGES.forEach(p => { const el = $('#' + p); el.hidden = p !== id; el.classList.toggle('on', p === id); });
    const first = !shown; if (shown) emit('page.change'); shown = true; A.ambience.page(id);
    applyTheme(); scrollTo({ top: 0, left: 0, behavior: 'instant' }); closeMenu(true);
    const h = $('h1,h2', $('#' + id)); if (h) h.focus({ preventScroll: true });
    if (id !== 'letter') closeEnvelope();
    if (id === 'home') tick();
    if (id === 'wish') setTimeout(() => $('#wishText').focus({ preventScroll: true }), 400);
    if (id !== 'cake') Cake.stopMic();
    if (id === 'cake') Cake.render();
    if (id === 'home') hello();
    closeSecret(); closeNote(); stopNumbers(); if (id === 'numbers') startNumbers();
    pageHooks.forEach(f => { try { f(id, first); } catch {} });
  }
  function go(id) { if (location.hash.slice(1) !== id) history.pushState(null, '', '#' + id); show(id); }
  addEventListener('popstate', () => show(location.hash.slice(1)));
  addEventListener('hashchange', () => show(location.hash.slice(1)));
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (b) return go(b.dataset.go);
    if (!e.target.closest('.fab-wrap')) closeMenu();
  });
  fab.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { closeMenu(); fab.focus(); }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !menu.hidden) {
      e.preventDefault(); const bs = $$('button', menu), i = bs.indexOf(document.activeElement);
      bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus();
    }
  });

  /* ---------- Letter ---------- */
  const env = $('#env'), paper = $('#paper'), lbtn = $('#letterBtns');
  $$('p', paper).forEach((p, i) => p.style.setProperty('--i', i));
  function closeEnvelope() { env.classList.remove('open'); env.setAttribute('aria-expanded', 'false'); paper.classList.remove('show', 'instant'); lbtn.hidden = true; }
  function openEnvelope() {
    env.classList.add('open'); env.setAttribute('aria-expanded', 'true'); paper.classList.add('show'); lbtn.hidden = false;
    const r = env.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); emit('letter.open');
    setTimeout(() => paper.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 700);
  }
  env.addEventListener('click', () => { if (env.classList.contains('open')) { emit('letter.close'); closeEnvelope(); } else openEnvelope(); });
  $('#skip').addEventListener('click', () => paper.classList.add('instant'));
  $('#replay').addEventListener('click', () => { closeEnvelope(); setTimeout(openEnvelope, 350); });
  const handBtn = $('#handBtn');
  const setHand = v => { paper.classList.toggle('hand', v); handBtn.setAttribute('aria-pressed', v); LS.set('natan.hand', v ? '1' : '0'); };
  handBtn.addEventListener('click', () => setHand(!paper.classList.contains('hand')));
  setHand(LS.get('natan.hand') === '1');

  /* ---------- Memories: six frames, each turns over to show a message ---------- */
  const grid = $('#grid'), TILT = ['-2.5deg', '2deg', '-1.5deg', '3deg', '-2deg', '1.5deg'];
  const lbList = MEMORIES.map((m, i) => (m.src ? i : -1)).filter(i => i >= 0);
  const lb = $('#lb'), lbImg = $('#lbImg'); let cur = 0, sx = null;
  function showLb(k) {
    cur = (k + lbList.length) % lbList.length; const m = MEMORIES[lbList[cur]];
    lbImg.src = m.src; lbImg.alt = m.caption;
    $('#lbCap').textContent = `${m.caption} · ${m.date}`; $('#lbNote').textContent = m.note;
    $('#lbCount').textContent = `${cur + 1} / ${lbList.length}`; $('#lbP').hidden = $('#lbN').hidden = lbList.length < 2;
  }
  function openLb(k) { if (k < 0) return; showLb(k); if (!lb.open) { emit('photo.open'); if (lb.showModal) lb.showModal(); else lb.setAttribute('open', ''); } }
  const slide = d => { emit('photo.slide'); showLb(cur + d); };
  MEMORIES.forEach((m, i) => {
    ['caption', 'date', 'note'].forEach(k => { const v = LS.get(`natan.${k}.${i}`); if (v) m[k] = v; });
    const card = document.createElement('div'); card.className = 'flip'; card.style.setProperty('--r', TILT[i % TILT.length]);
    card.innerHTML = '<div class="inner"><figure class="face front polaroid"><button class="pbtn" aria-label="Turn over to read the message"><div class="ph"></div></button><figcaption class="cap"></figcaption></figure>'
      + '<div class="face back polaroid" inert><p class="nlabel">Behind the photo</p><p class="note" role="textbox" aria-label="Message (tap to edit)" contenteditable="true" spellcheck="false"></p><div class="brow"><button class="mbtn turn" data-quiet>Turn back</button><button class="mbtn zoom" data-quiet>Enlarge photo</button></div></div></div>';
    const front = $('.front', card), back = $('.back', card), ph = $('.ph', card);
    if (m.src) { const img = document.createElement('img'); img.loading = 'lazy'; img.src = m.src; img.alt = m.caption; if (m.src === 'assets/natan.jpg') img.dataset.alts = $('#heroPol img') ? ($('#heroPol img').dataset.alts || '') : ''; img.addEventListener('load', () => { m.src = img.getAttribute('src'); }); ph.appendChild(img); } else ph.textContent = 'Your photo goes here';
    const cap = $('.cap', card);
    ['caption', 'date'].forEach(k => {
      const s = document.createElement('span'); s.contentEditable = 'true'; s.spellcheck = false;
      s.setAttribute('role', 'textbox'); s.setAttribute('aria-label', 'Edit ' + k); if (k === 'date') s.className = 'dt';
      s.textContent = m[k];
      s.addEventListener('input', () => { LS.set(`natan.${k}.${i}`, s.textContent); m[k] = s.textContent; });
      s.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); s.blur(); } });
      cap.appendChild(s);
    });
    const note = $('.note', card); note.textContent = m.note;
    note.addEventListener('input', () => { LS.set(`natan.note.${i}`, note.textContent); m.note = note.textContent; });
    const zoom = $('.zoom', card); zoom.hidden = !m.src;
    function flip(on) {
      card.classList.toggle('on', on); front.inert = on; back.inert = !on; emit(on ? 'photo.open' : 'photo.slide');
      setTimeout(() => (on ? $('.turn', card) : $('.pbtn', card)).focus({ preventScroll: true }), 450);
    }
    $('.pbtn', card).addEventListener('click', () => flip(true));
    $('.turn', card).addEventListener('click', () => flip(false));
    zoom.addEventListener('click', () => openLb(lbList.indexOf(i)));
    grid.appendChild(card);
  });
  $('#lbX').addEventListener('click', () => lb.close());
  $('#lbP').addEventListener('click', () => slide(-1));
  $('#lbN').addEventListener('click', () => slide(1));
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') slide(-1); if (e.key === 'ArrowRight') slide(1); });
  lb.addEventListener('pointerdown', e => { sx = e.clientX; });
  lb.addEventListener('pointerup', e => { if (sx !== null && lbList.length > 1) { const dx = e.clientX - sx; if (Math.abs(dx) > 50) slide(dx < 0 ? 1 : -1); } sx = null; });

  /* ---------- Surprise: pet the cats ---------- */
  let pets = +LS.get('natan.pets', 0) || 0;
  const petLine = () => { if (pets) $('#petLine').textContent = `The cats have been petted ${pets} time${pets === 1 ? '' : 's'}. They approve.`; };
  petLine();
  $$('.catbtn').forEach(b => b.addEventListener('click', () => {
    pets++; LS.set('natan.pets', pets); petLine(); dots(true); if (pets === SECRET.taps) setTimeout(revealSecret, 700); emit('cat.pet', { pet: pets, cat: b.classList.contains('b') ? 'b' : 'a' }); if (pets % 5 === 0) setTimeout(() => emit('cat.purr'), 450);
    const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 3, ['♡', '·', '✦']);
  }));

  /* ---------- Hidden surprise: 20 taps on the cats ---------- */
  const secret = $('#secret'), dotsEl = $('#petDots');
  for (let i = 0; i < SECRET.taps; i++) dotsEl.appendChild(document.createElement('i'));
  function dots(pop) {
    dotsEl.hidden = pets === 0;
    $$('i', dotsEl).forEach((d, i) => { d.classList.toggle('f', i < pets); d.classList.toggle('pop', !!pop && i === pets - 1); });
    $('#secretAgain').hidden = pets < SECRET.taps;
  }
  dots(false);
  function revealSecret() {
    $('#secT').textContent = SECRET.title;
    const box = $('#secLines'); box.textContent = '';
    SECRET.lines.forEach((t, i) => { const p = document.createElement('p'); p.className = 'sline'; p.style.setProperty('--i', i); p.textContent = t.replace('{age}', dateInfo().age); box.appendChild(p); });
    secret.hidden = false; emit('cake.done'); fireworks(6, true);
    setTimeout(() => $('#secretX').focus(), 300);
  }
  function closeSecret() {
    if (secret.hidden) return; secret.hidden = true; emit('menu.close');
    const c = $('.catbtn'); if (c) c.focus({ preventScroll: true });
  }
  $('#secretX').addEventListener('click', closeSecret);
  $('#secretAgain').addEventListener('click', revealSecret);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSecret(); });

  /* ---------- Wish: private constellation ---------- */
  try { wishes = JSON.parse(LS.get('natan.wishes', '[]')) || []; if (!Array.isArray(wishes)) wishes = []; } catch { wishes = []; }
  const txt = $('#wishText'), msg = $('#wishMsg'), list = $('#wishList');
  const fmt = t => new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  function renderWishes() {
    list.textContent = '';
    wishes.forEach((w, i) => {
      const li = document.createElement('li');
      const st = Object.assign(document.createElement('span'), { className: 'st', textContent: '✦' });
      const tx = document.createElement('div'); tx.className = 'tx';
      tx.append(document.createTextNode(w.t), Object.assign(document.createElement('small'), { textContent: fmt(w.d) }));
      const del = Object.assign(document.createElement('button'), { textContent: '✕', title: 'Remove this wish' });
      del.setAttribute('aria-label', 'Remove this wish');
      del.addEventListener('click', () => { emit('wish.remove'); wishes.splice(i, 1); LS.set('natan.wishes', JSON.stringify(wishes)); renderWishes(); msg.textContent = 'That star has gone back to the sky.'; drawOnce(); });
      li.append(st, tx, del); list.appendChild(li);
    });
  }
  renderWishes();
  $('#saveWish').addEventListener('click', () => {
    const v = txt.value.trim();
    if (!v) { emit('wish.empty'); msg.textContent = 'Write a little wish first.'; txt.focus(); return; }
    if (wishes.length >= 12) { emit('wish.empty'); msg.textContent = 'The sky is full: remove a wish to make room.'; return; }
    wishes.push({ t: v, d: Date.now() });
    if (!LS.set('natan.wishes', JSON.stringify(wishes))) { wishes.pop(); msg.textContent = 'This browser could not save it (private mode may be on).'; return; }
    txt.value = ''; renderWishes(); shootNow(); drawOnce(); emit('wish.save');
    msg.textContent = 'Your wish is tucked among the stars. ✦';
    const r = txt.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, ['✦', '✧']);
  });

  /* ---------- Audio glue: every sound lives in js/audio.js (window.NatanAudio) ---------- */
  const A = window.NatanAudio || {
    unlock() {}, emit() {}, sfx() {}, groups: {}, analyser: () => null,
    music: { playing: false, async play() { return false; }, pause() {} },
    ambience: { page() {}, setMode() {} },
    mixer: { get: () => .5, set() {}, setMuted() {}, muted: false, onChange() {} }
  };
  const emit = (n, o) => A.emit(n, o);
  document.addEventListener('click', e => { const el = e.target.closest('.btn,.menu button,.planet'); if (el && !el.hasAttribute('data-quiet')) emit('ui.tap'); });

  /* music button */
  const mBtn = $('#musicBtn'), mBox = $('.music'), hint = $('#musicHint');
  function syncMusicUI() {
    const on = A.music.playing;
    mBtn.classList.toggle('on', on); mBox.classList.toggle('playing', on);
    mBtn.setAttribute('aria-pressed', on); mBtn.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
  }
  async function setMusic(want) {
    hint.classList.add('gone');
    if (want) { if (!(await A.music.play())) { A.music.pause(); hint.textContent = 'Audio is not supported here'; hint.classList.remove('gone'); syncMusicUI(); return; } }
    else A.music.pause();
    syncMusicUI(); emit(A.music.playing ? 'toggle.on' : 'toggle.off');
  }
  mBtn.addEventListener('click', () => setMusic(!A.music.playing));
  setTimeout(() => hint.classList.add('gone'), 9000);

  /* mixer panel: sliders, mute, ambience mode, sound lab, live level display */
  const mixBtn = $('#mixBtn'), mixer = $('#mixer'), viz = $('#viz'), vx = viz.getContext('2d'); let vraf = 0;
  const SL = { mMaster: 'master', mMusic: 'music', mSfx: 'sfx', mAmb: 'ambience' };
  function vizLoop() {
    if (mixer.hidden || document.hidden) { vraf = 0; return; }
    vx.clearRect(0, 0, viz.width, viz.height);
    const an = A.analyser();
    if (an) { const d = new Uint8Array(an.frequencyBinCount), w = viz.width / d.length; an.getByteFrequencyData(d); vx.fillStyle = '#7897BB'; d.forEach((v, i) => { const hh = v / 255 * viz.height; vx.fillRect(i * w, viz.height - hh, w - 1, hh); }); }
    vraf = requestAnimationFrame(vizLoop);
  }
  mixBtn.addEventListener('click', () => {
    const open = mixer.hidden; mixer.hidden = !open; mixBtn.setAttribute('aria-expanded', open); emit(open ? 'menu.open' : 'menu.close');
    if (open && !vraf) vizLoop();
  });
  Object.entries(SL).forEach(([id, k]) => { const el = $('#' + id); el.value = A.mixer.get(k); el.addEventListener('input', () => A.mixer.set(k, el.value)); });
  $('#mMute').addEventListener('click', () => A.mixer.setMuted(!A.mixer.muted));
  $$('[data-amb]').forEach(b => b.addEventListener('click', () => { A.ambience.setMode(b.dataset.amb); emit('ui.tap'); }));
  function syncMixer() {
    const m = $('#mMute'); m.setAttribute('aria-pressed', A.mixer.muted); m.textContent = A.mixer.muted ? 'Unmute' : 'Mute all';
    $$('[data-amb]').forEach(b => b.setAttribute('aria-pressed', b.dataset.amb === A.mixer.get('ambMode')));
  }
  A.mixer.onChange(syncMixer); syncMixer();
  const lab = $('#lab');
  Object.entries(A.groups).forEach(([g, names]) => {
    const row = document.createElement('div'); row.className = 'grp';
    const t = document.createElement('span'); t.className = 'gn'; t.textContent = g; row.appendChild(t);
    names.forEach(n => { const b = document.createElement('button'); b.className = 'mini'; b.textContent = n; b.addEventListener('click', () => A.sfx(n)); row.appendChild(b); });
    lab.appendChild(row);
  });

  /* ---------- Comfort and data: text size, contrast, calm mode, export / delete ---------- */
  const root = document.documentElement;
  const applyFs = v => { root.style.fontSize = (16 * v) + 'px'; LS.set('natan.fs', String(v)); $$('[data-fs]').forEach(b => b.setAttribute('aria-pressed', parseFloat(b.dataset.fs) === v)); };
  $$('[data-fs]').forEach(b => b.addEventListener('click', () => applyFs(parseFloat(b.dataset.fs))));
  applyFs(parseFloat(LS.get('natan.fs', '1')) || 1);
  const sHC = $('#sHC'), sCalm = $('#sCalm');
  const applyHC = v => { root.toggleAttribute('data-hc', v); sHC.setAttribute('aria-pressed', v); sHC.textContent = v ? 'On' : 'Off'; LS.set('natan.hc', v ? '1' : '0'); };
  sHC.addEventListener('click', () => applyHC(!root.hasAttribute('data-hc')));
  applyHC(LS.get('natan.hc') === '1');
  function setCalm(v, live = true) {
    reduce = OS_REDUCE || v; LS.set('natan.calm', v ? '1' : '0'); root.toggleAttribute('data-calm', reduce);
    sCalm.setAttribute('aria-pressed', v); sCalm.textContent = v ? 'On' : 'Off';
    if (!live) return;
    if (reduce) { cancelAnimationFrame(raf); raf = 0; drawOnce(); } else if (!raf) loop();
  }
  sCalm.addEventListener('click', () => setCalm(LS.get('natan.calm') !== '1'));
  setCalm(LS.get('natan.calm') === '1', false);
  $('#sExport').addEventListener('click', () => {
    const data = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('natan.')) data[k] = localStorage.getItem(k); } } catch {}
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'natan-data.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Saved natan-data.json to this device.');
  });
  $('#sReset').addEventListener('click', () => {
    if (!confirm('Delete everything this site saved in this browser (wishes, opened envelopes, taps, edits)?')) return;
    try { Object.keys(localStorage).filter(k => k.startsWith('natan.')).forEach(k => localStorage.removeItem(k)); sessionStorage.removeItem('natan.entered'); } catch {}
    location.reload();
  });
  $('#printBtn').addEventListener('click', () => window.print());

  /* ---------- Fireworks ---------- */
  const fx = $('#fx'), fc = fx.getContext('2d'); let fp = [], fraf = 0;
  function fxLoop() {
    fc.clearRect(0, 0, fx.width, fx.height); fp = fp.filter(p => p.l > 0);
    for (const p of fp) { p.x += p.vx; p.y += p.vy; p.vy += .04; p.vx *= .985; p.l--; fc.fillStyle = `rgba(${p.c},${Math.min(1, p.l / 40)})`; fc.beginPath(); fc.arc(p.x, p.y, 2, 0, 6.283); fc.fill(); }
    if (fp.length) fraf = requestAnimationFrame(fxLoop); else { fraf = 0; fc.clearRect(0, 0, fx.width, fx.height); }
  }
  function fireworks(n = 6, bright) {
    if (reduce) return;
    fx.width = innerWidth; fx.height = innerHeight;
    const pal = (bright || document.body.classList.contains('night')) ? ['255,254,250', '120,151,187', '234,242,251'] : ['38,63,96', '120,151,187', '131,153,179'];
    for (let i = 0; i < n; i++) setTimeout(() => {
      emit('fireworks.launch'); setTimeout(() => emit('fireworks.boom'), 550);
      const x = innerWidth * (.15 + Math.random() * .7), y = innerHeight * (.15 + Math.random() * .35), c = pal[i % pal.length];
      for (let k = 0; k < 46; k++) { const a = 6.283 * k / 46, s = 1.5 + Math.random() * 3; fp.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 70 + Math.random() * 30, c }); }
      if (!fraf) fxLoop();
    }, i * 350);
  }

  /* ---------- Dates and greeting ---------- */
  function hello() {
    const hr = new Date().getHours();
    $('#hello').textContent = `${hr < 4 ? 'Hello, night owl' : hr < 11 ? 'Good morning' : hr < 15 ? 'Good afternoon' : hr < 19 ? 'Good evening' : 'Good night'}, Natan.`;
  }
  function dateInfo() {
    const n = new Date(), today = n.getMonth() === 0 && n.getDate() === 3;
    let nb = new Date(n.getFullYear(), 0, 3); if (!today && n > nb) nb = new Date(n.getFullYear() + 1, 0, 3);
    return { today, age: nb.getFullYear() - 2007 };
  }

  /* ---------- Cake: the whole experience lives in js/cake.js ---------- */
  const Cake = { render() { if (window.NatanCake) window.NatanCake.enter(); }, stopMic() { if (window.NatanCake) window.NatanCake.leave(); } };

  /* ---------- Star card: download the wish constellation as an image (stays on this device) ---------- */
  function saveCard() {
    if (!wishes.length) { emit('wish.empty'); msg.textContent = 'Make a wish first, then save its star card.'; return; }
    const cw = 1080, ch = 1350, c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const x = c.getContext('2d'); x.fillStyle = '#263F60'; x.fillRect(0, 0, cw, ch);
    let r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 170; i++) { x.fillStyle = `rgba(255,254,250,${.2 + rnd() * .7})`; x.beginPath(); x.arc(rnd() * cw, rnd() * ch, rnd() * 2.2 + .5, 0, 6.283); x.fill(); }
    x.textAlign = 'center'; x.fillStyle = '#FFFEFA'; x.font = 'italic 56px "Libre Baskerville",Georgia,serif'; x.fillText("Natan's little universe", cw / 2, 170);
    x.fillStyle = '#7897BB'; x.font = '500 24px Montserrat,sans-serif'; x.fillText('03 · JANUARY · 2007', cw / 2, 225);
    const pts = wishes.map((_, i) => [(.12 + ((i * .618034) % 1) * .76) * cw, 320 + ((i * .414214 + .3) % 1) * 360]);
    x.strokeStyle = 'rgba(120,151,187,.6)'; x.lineWidth = 2; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke();
    pts.forEach(p => { const g = x.createRadialGradient(p[0], p[1], 0, p[0], p[1], 26); g.addColorStop(0, 'rgba(255,254,250,1)'); g.addColorStop(1, 'rgba(255,254,250,0)'); x.fillStyle = g; x.beginPath(); x.arc(p[0], p[1], 26, 0, 6.283); x.fill(); });
    x.textAlign = 'left'; x.font = '30px "Libre Baskerville",Georgia,serif'; let y = 790;
    for (const w of wishes) {
      const words = w.t.split(/\s+/); let line = '✦  ';
      for (const wd of words) { if (x.measureText(line + wd).width > 880) { x.fillStyle = '#FFFEFA'; x.fillText(line, 100, y); y += 44; line = '     '; } line += wd + ' '; }
      x.fillStyle = '#FFFEFA'; x.fillText(line, 100, y); y += 62; if (y > 1270) break;
    }
    c.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'natan-star-card.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); msg.textContent = 'Star card saved to your device. ✦'; emit('card.save'); });
  }
  $('#cardBtn').addEventListener('click', saveCard);

  /* ---------- Natan in numbers: live counters, moon phases, birth facts ---------- */
  const BORN = new Date(2007, 0, 3, 0, 0, 0), SYN = 29.530588853, MOON_REF = Date.UTC(2000, 0, 6, 18, 14);
  const moonF = ms => { const x = ((ms - MOON_REF) / 864e5 / SYN) % 1; return x < 0 ? x + 1 : x; };
  function moonName(f) { return f < .03 || f > .97 ? 'New moon' : f < .22 ? 'Waxing crescent' : f < .28 ? 'First quarter' : f < .47 ? 'Waxing gibbous' : f < .53 ? 'Full moon' : f < .72 ? 'Waning gibbous' : f < .78 ? 'Last quarter' : 'Waning crescent'; }
  function moonSvg(f) {
    const a = 2 * Math.PI * f, rx = (Math.abs(Math.cos(a)) * 40).toFixed(2);
    const path = f < .5 ? `M50 10 A40 40 0 0 1 50 90 A${rx} 40 0 0 ${f < .25 ? 0 : 1} 50 10Z` : `M50 10 A40 40 0 0 0 50 90 A${rx} 40 0 0 ${f > .75 ? 1 : 0} 50 10Z`;
    return `<svg viewBox="0 0 100 100" class="moon" role="img" aria-label="${moonName(f)}"><circle cx="50" cy="50" r="40" class="mdark"/><path d="${path}" class="mlit"/></svg>`;
  }
  function paintMoons() {
    [['moonBirth', Date.UTC(2007, 0, 3, 12)], ['moonNow', Date.now()]].forEach(([id, ms]) => {
      const f = moonF(ms); $('#' + id).innerHTML = moonSvg(f);
      $('#' + id + 'Txt').textContent = `${moonName(f)} · ${Math.round((1 - Math.cos(2 * Math.PI * f)) / 2 * 100)}% lit`;
    });
  }
  $('#fDay').textContent = BORN.toLocaleDateString('en-GB', { weekday: 'long' });
  const NUM = [['nDays', v => v.days], ['nWeeks', v => v.weeks], ['nHours', v => v.hours], ['nTrips', v => v.trips, 2], ['nKm', v => v.km], ['nMoons', v => v.moons], ['nBeats', v => v.beats]];
  function numValues() { const ms = Date.now() - BORN.getTime(), d = ms / 864e5; return { days: Math.floor(d), weeks: Math.floor(d / 7), hours: Math.floor(ms / 36e5), trips: d / 365.2422, km: d * 2573000 / 1e6, moons: Math.floor(d / SYN), beats: Math.floor(ms / 6e4 * 70) }; }
  function paintNumbers(p = 1) { const v = numValues(); NUM.forEach(([id, f, dec = 0]) => { $('#' + id).textContent = (f(v) * p).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }); }
  let numRaf = 0, numTimer = 0;
  function stopNumbers() { cancelAnimationFrame(numRaf); clearInterval(numTimer); numRaf = numTimer = 0; }
  function startNumbers() {
    stopNumbers(); paintMoons();
    const live = () => { numTimer = setInterval(() => paintNumbers(1), 1000); };
    if (reduce) { paintNumbers(1); live(); return; }
    const t0 = performance.now();
    (function step(t) {
      const p = Math.min(1, (t - t0) / 1500); paintNumbers(1 - Math.pow(1 - p, 3));
      if (p < 1) numRaf = requestAnimationFrame(step); else { emit('stats.done'); live(); }
    })(t0);
  }

  let opened = []; try { opened = JSON.parse(LS.get('natan.opened', '[]')) || []; if (!Array.isArray(opened)) opened = []; } catch { opened = []; }
  const nGrid = $('#nGrid'), nView = $('#noteView');
  function paintNotes() { $('#noteCount').textContent = `${opened.length} / ${NOTES.length} opened`; $$('.nenv', nGrid).forEach((b, i) => b.classList.toggle('done', opened.includes(i))); }
  function openNote(i) {
    $('#nvWhen').textContent = NOTES[i].when; $('#nvText').textContent = NOTES[i].text; $('#nvText').style.setProperty('--i', 0);
    nView.hidden = false; emit('note.open');
    if (!opened.includes(i)) { opened.push(i); LS.set('natan.opened', JSON.stringify(opened)); paintNotes(); }
    setTimeout(() => $('#nvX').focus(), 300);
  }
  function closeNote() { if (nView.hidden) return; nView.hidden = true; emit('note.close'); }
  NOTES.forEach((n, i) => {
    const b = document.createElement('button'); b.className = 'nenv'; b.textContent = n.when;
    b.setAttribute('aria-label', n.when); b.addEventListener('click', () => openNote(i)); nGrid.appendChild(b);
  });
  $('#nvX').addEventListener('click', closeNote);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNote(); });
  paintNotes();

  /* ---------- Gate: first tap also unlocks sound ---------- */
  const gate = $('#gate'), lockEls = ['#app', '.fab-wrap', '.music', '#themeBtn'].map(s => $(s));
  const setLock = v => lockEls.forEach(el => v ? el.setAttribute('inert', '') : el.removeAttribute('inert'));
  function enter(withMusic) {
    A.unlock(); try { sessionStorage.setItem('natan.entered', '1'); } catch {}
    gate.classList.add('leave'); setLock(false); setTimeout(() => gate.remove(), 800);
    if (withMusic) setMusic(true);
    const h = $('h1,h2', $('#' + page)); if (h) h.focus({ preventScroll: true });
    if (dateInfo().today) setTimeout(() => fireworks(8), 700);
  }
  let entered = false; try { entered = sessionStorage.getItem('natan.entered') === '1'; } catch {}
  if (entered) gate.remove();
  else { setLock(true); $('#enterSound').addEventListener('click', () => enter(true)); $('#enterQuiet').addEventListener('click', () => enter(false)); $('#enterSound').focus(); }
  hello();

  /* ---------- Pointer star trail (mouse only) + offline support ---------- */
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    let lastT = 0;
    addEventListener('pointermove', e => {
      const n = performance.now(); if (n - lastT < 70 || e.pointerType === 'touch' || document.documentElement.dataset.perf === 'lite') return; lastT = n;
      const s = document.createElement('span'); s.className = 'bit trail'; s.textContent = '✦';
      s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; s.style.fontSize = (7 + Math.random() * 7) + 'px'; document.body.appendChild(s);
      s.animate([{ opacity: .8, transform: 'translate(0,0) scale(1)' }, { opacity: 0, transform: `translate(${Math.random() * 20 - 10}px,${14 + Math.random() * 16}px) scale(.3)` }], { duration: 900, easing: 'ease-out' }).onfinish = () => s.remove();
    });
  }
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});

  window.NatanApp = { emit, burst, fireworks, dateInfo, setHour: h => { previewHour = h; applyTheme(); }, get tod() { return tod; }, get reduce() { return reduce; }, onPage: f => pageHooks.push(f), get page() { return page; } };

  /* ---------- Start ---------- */
  resize(); if (!reduce) loop();
  show(location.hash.slice(1));
})();

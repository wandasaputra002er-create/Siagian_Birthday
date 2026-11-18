/* Extras: decoration, motion and small interactions per page. Loaded after script.js. */
(() => {
  'use strict';
  const App = window.NatanApp, C = window.CONTENT;
  if (!App || !C) return;
  const { emit, burst } = App; const isCalm = () => App.reduce;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const LS = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };
  const NS = 'http://www.w3.org/2000/svg', main = $('#app');
  let page = App.page, px = innerWidth * .9, py = innerHeight * .9;

  /* ---------- 1. Page transition: an iris that opens where you tapped ---------- */
  addEventListener('pointerdown', e => { px = e.clientX; py = e.clientY; }, true);
  function iris() {
    if (isCalm()) return;
    const r = main.getBoundingClientRect();
    main.style.setProperty('--cx', (px - r.left) + 'px'); main.style.setProperty('--cy', (py - r.top) + 'px');
    main.classList.remove('iris'); void main.offsetWidth; main.classList.add('iris');
  }
  main.addEventListener('animationend', e => { if (e.target === main) main.classList.remove('iris'); });

  /* parallax variables for decorations */
  let pq = false;
  addEventListener('pointermove', e => {
    if (pq) return; pq = true;
    requestAnimationFrame(() => {
      pq = false; if (document.documentElement.dataset.perf === 'lite') return;
      const x = (e.clientX / innerWidth - .5).toFixed(3), y = (e.clientY / innerHeight - .5).toFixed(3); /* only the scene and the open page, not the whole document */
      [$('#scene'), $('.page.on')].forEach(el => { if (el) { el.style.setProperty('--px', x); el.style.setProperty('--py', y); } });
    });
  }, { passive: true });

  /* little helper: a glyph that floats away */
  function particle(text, x, y, o = {}) {
    if (isCalm()) return;
    const s = document.createElement('span'); s.className = 'bit'; s.textContent = text;
    s.style.cssText = `left:${x}px;top:${y}px;font-size:${o.size || 14}px;color:${o.color || 'var(--sky)'}`;
    document.body.appendChild(s);
    s.animate([{ opacity: 1, transform: 'translate(0,0) rotate(0)' }, { opacity: 0, transform: `translate(${o.dx || 0}px,${o.dy || -50}px) rotate(${o.rot || 0}deg)` }], { duration: o.ms || 1200, easing: 'ease-out' }).onfinish = () => s.remove();
  }
  function splitTitle(el) {
    if (!el || el.dataset.split) return; el.dataset.split = '1';
    const t = el.textContent; el.setAttribute('aria-label', t); el.textContent = '';
    [...t].forEach((ch, i) => { const s = document.createElement('span'); s.className = 'ch'; s.setAttribute('aria-hidden', 'true'); s.style.setProperty('--i', i); s.textContent = ch === ' ' ? '\u00A0' : ch; el.appendChild(s); });
  }

  /* ---------- 2. Gate + home ---------- */
  splitTitle($('#gT'));
  const gate = $('#gate'); if (gate) gate.insertAdjacentHTML('afterbegin', '<i class="gring r1"></i><i class="gring r2"></i>');
  const home = $('#home');
  splitTitle($('h1', home));
  const VINE = '<path d="M35 238 C10 190 60 160 32 110 S50 40 36 4"/><path d="M32 110 q-20 -4 -24 -24 q20 2 24 24"/><path d="M44 140 q18 -6 20 -26 q-18 4 -20 26"/><path d="M30 170 q-18 -2 -22 -22 q18 0 22 22"/><path d="M38 60 q16 -6 18 -22 q-16 4 -18 22"/>';
  home.insertAdjacentHTML('afterbegin', `<svg class="vine v1" viewBox="0 0 70 240" aria-hidden="true">${VINE}</svg><svg class="vine v2" viewBox="0 0 70 240" aria-hidden="true">${VINE}</svg>`);
  let paws = ''; for (let i = 0; i < 8; i++) paws += `<svg viewBox="0 0 24 24" style="left:${4 + i * 12}%;top:${i % 2 ? 18 : 48}px;rotate:80deg;animation-delay:${(i * .7).toFixed(1)}s"><use href="#paw"/></svg>`;
  home.insertAdjacentHTML('beforeend', `<div class="pawtrail" aria-hidden="true">${paws}</div>`);
  $('.lead', home).insertAdjacentHTML('afterend', '<p class="whisper" aria-hidden="true"></p>');
  const wh = $('.whisper', home); let wi = 0;
  const whisper = () => { wh.classList.add('out'); setTimeout(() => { wh.textContent = C.WHISPERS[wi++ % C.WHISPERS.length]; wh.classList.remove('out'); }, 600); };
  wh.textContent = C.WHISPERS[wi++ % C.WHISPERS.length];
  setInterval(() => { if (page === 'home' && !document.hidden && C.WHISPERS.length > 1) whisper(); }, 4800);
  const pol = $('#heroPol');
  pol.tabIndex = 0; pol.setAttribute('role', 'button'); pol.setAttribute('aria-label', 'Photograph of Natan. Tap for a little surprise');
  function polTap() {
    emit('photo.open');
    if (!isCalm()) pol.animate([{ transform: 'rotate(-3deg) scale(1)' }, { transform: 'rotate(3deg) scale(1.05)' }, { transform: 'rotate(-6deg) scale(1.03)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(-3deg) scale(1)' }], { duration: 800, easing: 'ease-out' });
    const r = pol.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, ['♡', '✦', '✿']);
  }
  pol.addEventListener('click', polTap);
  pol.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); polTap(); } });

  /* ---------- 3. Letter: stamp, postmark, address, petals, pressed flower ---------- */
  const env = $('#env'), paper = $('#paper');
  env.insertAdjacentHTML('beforeend', '<span class="stamp" aria-hidden="true"><svg viewBox="0 0 24 24"><use href="#paw"/></svg></span><span class="postmark" aria-hidden="true">03·01·07</span><span class="addr" aria-hidden="true">For Natan ♡</span>');
  paper.insertAdjacentHTML('beforeend', '<svg class="pressed" viewBox="0 0 40 40" aria-hidden="true"><use href="#flower"/></svg>');
  function petals() {
    if (isCalm()) return;
    for (let i = 0; i < 16; i++) setTimeout(() => {
      const s = document.createElement('span'); s.className = 'bit'; s.textContent = pick(['✿', '❀', '✾']);
      s.style.cssText = `left:${rnd(0, innerWidth)}px;top:-20px;font-size:${rnd(12, 22)}px;color:var(--sky)`; document.body.appendChild(s);
      s.animate([{ transform: 'translate(0,0) rotate(0)', opacity: .9 }, { transform: `translate(${rnd(-80, 80)}px,${innerHeight * .9}px) rotate(${rnd(-300, 300)}deg)`, opacity: 0 }], { duration: rnd(4500, 7500), easing: 'ease-in-out' }).onfinish = () => s.remove();
    }, i * 180);
  }
  new MutationObserver(() => { if (env.classList.contains('open')) petals(); }).observe(env, { attributes: true, attributeFilter: ['class'] });

  /* ---------- 4. Memories: tape, stickers, shuffle, reading progress ---------- */
  const mem = $('#memories'), grid = $('#grid');
  mem.insertAdjacentHTML('afterbegin', '<svg class="deco leafy md1" aria-hidden="true"><use href="#leaf"/></svg><svg class="deco leafy md2" aria-hidden="true"><use href="#leaf"/></svg>');
  $('.lead', mem).insertAdjacentHTML('afterend', '<div class="row"><button id="shuffleBtn" class="btn ghost" data-quiet>Shuffle</button><button id="tidyBtn" class="btn ghost" data-quiet>Tidy up</button></div><p id="readCount" class="tiny"></p>');
  const flips = () => $$('.flip', grid);
  flips().forEach((c, i) => {
    c.style.setProperty('--k', i); c.classList.add('tape' + (i % 3));
    const st = document.createElement('span'); st.className = 'sticker'; st.setAttribute('aria-hidden', 'true'); st.textContent = ['✦', '♡', '✿', '☾', '★', '☁'][i % 6];
    st.style.cssText = `${i % 2 ? 'right' : 'left'}:-10px;bottom:${Math.round(rnd(14, 40))}%;rotate:${Math.round(rnd(-18, 18))}deg`; c.appendChild(st);
  });
  $('#shuffleBtn').addEventListener('click', () => { flips().forEach(c => c.style.setProperty('--r', rnd(-5, 5).toFixed(1) + 'deg')); emit('photo.slide'); });
  $('#tidyBtn').addEventListener('click', () => { flips().forEach(c => c.style.setProperty('--r', '0deg')); emit('photo.slide'); });
  let read = []; try { read = JSON.parse(LS.get('natan.read', '[]')) || []; if (!Array.isArray(read)) read = []; } catch { read = []; }
  const paintRead = () => { const n = flips().length; $('#readCount').textContent = read.length >= n ? 'You read every message ✦' : `${read.length} / ${n} messages read`; };
  paintRead();
  new MutationObserver(ms => ms.forEach(m => {
    const c = m.target; if (!c.classList || !c.classList.contains('flip') || !c.classList.contains('on')) return;
    const i = flips().indexOf(c); if (read.includes(i)) return;
    read.push(i); LS.set('natan.read', JSON.stringify(read)); paintRead();
    if (read.length === flips().length) { const r = c.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); emit('stats.done'); }
  })).observe(grid, { attributes: true, attributeFilter: ['class'], subtree: true });

  /* ---------- 5. Surprise: drifting stars, speech bubbles, highlighter, reminders ---------- */
  const sur = $('#surprise');
  let sd = ''; for (let i = 0; i < 14; i++) sd += `<span style="left:${rnd(2, 96).toFixed(0)}%;top:${rnd(4, 92).toFixed(0)}%;font-size:${Math.round(rnd(8, 20))}px;--d:${rnd(9, 18).toFixed(1)}s;--dl:${(-rnd(0, 10)).toFixed(1)}s">✦</span>`;
  sur.insertAdjacentHTML('afterbegin', `<div class="stardrift" aria-hidden="true">${sd}</div>`);
  function hl(el, phrase) {
    if (!el || el.querySelector('mark')) return; const t = el.textContent, i = t.indexOf(phrase); if (i < 0) return;
    el.textContent = ''; const m = document.createElement('mark'); m.className = 'hl'; m.textContent = phrase; el.append(t.slice(0, i), m, t.slice(i + phrase.length));
  }
  const qs = $$('.quote', sur); hl(qs[0], 'a little less ordinary'); hl(qs[1], 'matters more than you might think');
  $$('.catbtn', sur).forEach(b => b.addEventListener('click', () => {
    if (isCalm()) return;
    const r = b.getBoundingClientRect(), el = document.createElement('span'); el.className = 'bubble'; el.textContent = pick(['meow', 'mrrp', 'prrr', 'nya', '♡']);
    el.style.left = (r.left + r.width / 2) + 'px'; el.style.top = r.top + 'px'; document.body.appendChild(el);
    el.animate([{ opacity: 0, transform: 'translate(-50%,-80%) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-110%) scale(1)', offset: .2 }, { opacity: 0, transform: 'translate(-50%,-190%) scale(1)' }], { duration: 1300, easing: 'ease-out' }).onfinish = () => el.remove();
  }));
  $('#secretAgain').insertAdjacentHTML('beforebegin', '<div class="remind"><p id="remindText" class="remtext" aria-live="polite">Tap the star for a little reminder.</p><button id="remindBtn" class="btn ghost" data-quiet>✦ Draw a reminder</button></div>');
  let bag = [];
  $('#remindBtn').addEventListener('click', () => {
    if (!bag.length) bag = C.REMINDERS.slice().sort(() => Math.random() - .5);
    const t = $('#remindText'); t.classList.remove('swap'); void t.offsetWidth; t.textContent = bag.pop(); t.classList.add('swap'); emit('stats.done');
  });

  /* ---------- 6. Wish: sky lanterns, star rain, tappable sky ---------- */
  const wishList = $('#wishList'); let wcount = wishList.children.length;
  function lantern() {
    if (isCalm()) return;
    const l = document.createElement('div'); l.className = 'lantern'; l.setAttribute('aria-hidden', 'true');
    l.style.left = rnd(12, 82) + '%'; l.style.setProperty('--sway', rnd(-60, 60) + 'px'); l.innerHTML = '<i></i>'; document.body.appendChild(l); setTimeout(() => l.remove(), 10500);
  }
  new MutationObserver(() => { const n = wishList.children.length; if (n > wcount) lantern(); wcount = n; }).observe(wishList, { childList: true });
  $('#saveWish').parentElement.insertAdjacentHTML('beforeend', '<button id="rainBtn" class="btn ghost" data-quiet>Star rain</button>');
  $('#rainBtn').addEventListener('click', () => {
    emit('wish.save');
    for (let i = 0; i < 36; i++) setTimeout(() => particle(pick(['✦', '✧', '·']), rnd(0, innerWidth), -10, { dy: innerHeight * .9, dx: rnd(-40, 40), ms: rnd(2500, 4500), size: rnd(10, 22), color: 'var(--ivory)' }), i * 70);
  });
  $('#wish').addEventListener('pointerdown', e => { if (e.target.closest('textarea,button,li,label,input,a')) return; burst(e.clientX, e.clientY, ['✦', '·', '✧']); });

  /* ---------- 8. Universe: tooltips, moons, comet ---------- */
  $$('.planet').forEach(p => p.insertAdjacentHTML('beforeend', '<i class="pm" aria-hidden="true"></i>'));
  const orr = $('.orrery'); if (orr) orr.insertAdjacentHTML('beforeend', '<i class="comet" aria-hidden="true"></i>');

  /* ---------- 9. Numbers: life in months and the year ring ---------- */
  const num = $('#numbers'), BORN = new Date(2007, 0, 3);
  const lb = document.createElement('div'); lb.className = 'lifebox';
  lb.innerHTML = '<p class="nl">Life in months · each dot is one month</p><div class="lm" id="lm" aria-hidden="true"></div><p class="ntx" id="lmTxt"></p><div class="yr"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="yr0" cx="50" cy="50" r="42"/><circle class="yr1" id="yrArc" cx="50" cy="50" r="42"/></svg><div><b class="nv sm" id="yrPct"></b><span class="nl">of the way to the next birthday</span></div></div>';
  $$('.ncards', num)[1].before(lb);
  function paintLife() {
    const now = new Date(), total = App.dateInfo().age * 12, months = Math.min(total, Math.floor((now - BORN) / (864e5 * 30.4375)));
    const lm = $('#lm'); if (lm.children.length !== total) { lm.textContent = ''; for (let i = 0; i < total; i++) lm.appendChild(document.createElement('i')); }
    [...lm.children].forEach((d, i) => {
      d.className = ''; d.style.animationDelay = ''; if (i < months) { d.className = i === months - 1 ? 'f cur' : 'f'; if (!isCalm()) d.style.animationDelay = (i * 6) + 'ms'; }
    });
    $('#lmTxt').textContent = `Month ${months} of ${total}`;
    let last = new Date(now.getFullYear(), 0, 3); if (now < last) last = new Date(now.getFullYear() - 1, 0, 3);
    const next = new Date(last.getFullYear() + 1, 0, 3), pct = Math.min(1, Math.max(0, (now - last) / (next - last)));
    $('#yrPct').textContent = Math.round(pct * 100) + '%';
    const arc = $('#yrArc'); arc.style.strokeDashoffset = 263.9; requestAnimationFrame(() => requestAnimationFrame(() => { arc.style.strokeDashoffset = (263.9 * (1 - pct)).toFixed(1); }));
  }

  /* ---------- 10. Open When: icons, "surprise me", opening flap ---------- */
  $$('.nenv').forEach((b, i) => { const g = document.createElement('span'); g.className = 'ng'; g.setAttribute('aria-hidden', 'true'); g.textContent = (C.NOTES[i] && C.NOTES[i].icon) || '✦'; b.appendChild(g); });
  $('#nGrid').insertAdjacentHTML('afterend', '<button id="randEnv" class="btn ghost" data-quiet>Surprise me</button>');
  $('#randEnv').addEventListener('click', () => {
    const all = $$('.nenv'), fresh = all.filter(b => !b.classList.contains('done')), b = pick(fresh.length ? fresh : all);
    emit('ui.tap'); b.classList.add('shake'); setTimeout(() => { b.classList.remove('shake'); b.click(); }, 650);
  });
  $('.secret-card', $('#noteView')).insertAdjacentHTML('afterbegin', '<span class="nvflap" aria-hidden="true"></span>');

  /* ---------- Surprise: hold a cat to hear it purr; the cats sometimes chat on their own ---------- */
  const NA = window.NatanAudio; let holdT = 0, purrT = 0, held = false;
  const stopHold = () => { clearTimeout(holdT); clearInterval(purrT); holdT = purrT = 0; };
  $$('.catbtn', sur).forEach(b => {
    b.addEventListener('pointerdown', () => {
      stopHold(); held = false;
      holdT = setTimeout(() => {
        held = true;
        const go = () => { if (NA) NA.sfx('purr', { dur: 1.6, vol: .9 }); const r = b.getBoundingClientRect(); particle('♡', r.left + r.width / 2 + rnd(-20, 20), r.top + 10, { dy: -70, dx: rnd(-20, 20), ms: 1400, size: rnd(12, 20) }); };
        go(); purrT = setInterval(go, 1400);
      }, 550);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stopHold));
    b.addEventListener('click', ev => { if (held) { ev.stopImmediatePropagation(); held = false; } }, true);
  });
  setInterval(() => { if (page === 'surprise' && !document.hidden && Math.random() < .6) emit('cat.idle'); }, 23000);

  /* ---------- hooks ---------- */
  function onPage(id, first) { page = id; if (!first) iris(); if (id === 'numbers') paintLife(); }
  App.onPage(onPage); onPage(App.page, true);
})();

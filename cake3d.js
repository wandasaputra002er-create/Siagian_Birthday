/* cake3d.js: a real 3D birthday cake (WebGL) lit by its own candles. Drag to turn it. */
window.Cake3D = (() => {
  'use strict';
  const G = window.GL3D, PI2 = Math.PI * 2;
  const SKY = [.56, .69, .83], GRAY = [.7, .77, .85], IVO = [1, .99, .97], NAVY = [.15, .25, .38], BLUE = [.36, .49, .65], DBLUE = [.2, .32, .48], CLOTH = [.82, .88, .95], SPONGE = [.95, .92, .84], PETAL = [.47, .6, .79];
  const T = [{ r: 2.4, y0: .09, h: 1.1, col: SKY, drips: 18, pearls: 40 }, { r: 1.7, y0: 1.19, h: .95, col: GRAY, drips: 14, pearls: 30 }, { r: 1.15, y0: 2.14, h: .85, col: IVO, drips: 10, pearls: 22 }];
  const TOPY = 2.99, GAP = { a0: Math.PI / 2 - .3, a1: Math.PI / 2 + .3 };
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const inGap = a => { a = ((a % PI2) + PI2) % PI2; return a > GAP.a0 && a < GAP.a1; };

  /* seven-segment digits made of boxes, so any age can be shown on the candles */
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  function digits(str) {
    const b = new G.Builder(), W = .5, H = .95, Tk = .14, D = .15, flames = [], n = str.length;
    [...str].forEach((ch, k) => {
      const cx = (k - (n - 1) / 2) * .74, cy = TOPY + .05 + H / 2, yaw = (k % 2 ? -.07 : .07);
      const seg = { a: [0, H / 2 - Tk / 2, W, Tk], d: [0, -H / 2 + Tk / 2, W, Tk], g: [0, 0, W, Tk], f: [-W / 2 + Tk / 2, H / 4, Tk, H / 2], b: [W / 2 - Tk / 2, H / 4, Tk, H / 2], e: [-W / 2 + Tk / 2, -H / 4, Tk, H / 2], c: [W / 2 - Tk / 2, -H / 4, Tk, H / 2] };
      b.mat([1, .99, .96], .5, 30, 1);
      for (const s of (SEG[ch] || '')) { const p = seg[s], c = Math.cos(yaw), si = Math.sin(yaw); G.box(b, cx + p[0] * c, cy + p[1], p[0] * si, p[2], p[3], D, yaw); }
      b.mat([.15, .25, .38], .1, 10); G.cyl(b, cx, TOPY + .05 + H, 0, .02, .12, 6);
      flames.push([cx, TOPY + .05 + H + .24, 0]);
    });
    return { b, flames };
  }

  /* the cake. cut: null for whole, or 'main' / 'slice' once a piece has been cut from the bottom tier */
  function buildCake(cut) {
    const b = new G.Builder(), S = cut === 'slice', main = !S, cutOn = !!cut, ok = a => (S ? inGap(a) : !(cutOn && inGap(a)));
    const part = (a0, a1) => ({ a0, a1 });
    if (main) {
      b.mat([5.6, .34, 0], 0, 1, 2); G.disc(b, 0, .004, 0, 5.6, 40); /* soft contact shadow: colour fields carry radius and strength */
      b.mat(CLOTH, .05, 8); G.disc(b, 0, 0, 0, 4.8, 48);
      b.mat([.62, .73, .88], .05, 8); G.lathe(b, [[4.45, .006], [4.2, .006]], 48);
      b.mat([.95, .97, 1], .3, 20); G.torus(b, 0, .02, 0, 4.78, .06, 48, 6);
      b.mat([.96, .97, .99], .8, 70); G.lathe(b, [[0, .012], [2.6, .012], [3.0, .07], [3.25, .17], [3.18, .18], [3.0, .12], [2.6, .09], [0, .09]], 56);
      /* presents */
      b.mat(SKY, .3, 24); G.box(b, -3.55, .4, 1.55, .95, .8, .95, .4); b.mat(IVO, .4, 30); G.box(b, -3.55, .4, 1.55, .16, .82, .97, .4); G.box(b, -3.55, .4, 1.55, .97, .82, .16, .4); G.sphere(b, -3.55, .88, 1.55, .17, { sy: .55 }); G.sphere(b, -3.7, .85, 1.5, .13, { sy: .5, sx: 1.4 }); G.sphere(b, -3.4, .85, 1.6, .13, { sy: .5, sx: 1.4 });
      b.mat(GRAY, .3, 24); G.box(b, 3.5, .32, 1.45, .8, .64, .8, -.3); b.mat(PETAL, .4, 30); G.box(b, 3.5, .32, 1.45, .13, .66, .82, -.3); G.box(b, 3.5, .32, 1.45, .82, .66, .13, -.3); G.sphere(b, 3.5, .7, 1.45, .14, { sy: .55 });
    }
    T.forEach((t, ti) => {
      const y0 = t.y0, y1 = t.y0 + t.h, r = t.r, bev = .09, hasRing = ti === 0;
      if (hasRing) {
        const core = T[1].r;
        if (main) { b.mat(t.col, .25, 20); G.lathe(b, [[0, y0], [core, y0], [core, y1], [0, y1]], 48); }
        const a0 = cutOn && main ? GAP.a1 : S ? GAP.a0 : 0, a1 = cutOn && main ? GAP.a0 + PI2 : S ? GAP.a1 : PI2, sg = S ? 8 : cutOn ? 52 : 64;
        b.mat(t.col, .25, 20); G.lathe(b, [[core, y0], [r - bev, y0], [r, y0 + bev], [r, y1 - bev], [r - .04, y1], [core, y1], [core, y0]], sg, part(a0, a1));
        b.mat(IVO, .35, 24); G.lathe(b, [[r - .08, y1 + .012], [core, y1 + .012]], sg, part(a0, a1));
        if (cutOn) { b.mat(SPONGE, .05, 6); [GAP.a0, GAP.a1].forEach(a => { const c = Math.cos(a), s = Math.sin(a), mx = (core + r) / 2, nx = -s * (a === GAP.a0 ? -1 : 1), nz = c * (a === GAP.a0 ? -1 : 1);
          const q = [[core, y0], [r - .02, y0], [r - .02, y1], [core, y1]].map(p => b.vert(p[0] * c, p[1], p[0] * s, nx, 0, nz)); b.tri(q[0], q[1], q[2]); b.tri(q[0], q[2], q[3]); }); }
        b.mat(IVO, .35, 24); G.torus(b, 0, y1, 0, r - .05, .085, sg, 8, part(a0, a1));
      } else {
        b.mat(t.col, ti === 2 ? .45 : .25, ti === 2 ? 30 : 20); G.lathe(b, [[0, y0], [r - bev, y0], [r, y0 + bev], [r, y1 - bev], [r - .05, y1], [0, y1]], 56);
        b.mat(IVO, .35, 24); if (ti === 1) G.lathe(b, [[r - .08, y1 + .012], [T[2].r, y1 + .012]], 56);
        G.torus(b, 0, y1, 0, r - .05, .085, 56, 8);
      }
      /* drips and pearls */
      b.mat(IVO, .45, 30);
      for (let i = 0; i < t.drips; i++) { const a = (i + rnd(-.25, .25)) / t.drips * PI2; if (!ok(a)) continue; const len = rnd(.16, .5), x = Math.cos(a) * (r - .01), z = Math.sin(a) * (r - .01);
        G.cyl(b, x, y1 - len, z, .075, len + .02, 8); G.sphere(b, x, y1 - len, z, .075, { seg: 8, rings: 4 }); }
      for (let i = 0; i < t.pearls; i++) { const a = i / t.pearls * PI2; if (!ok(a)) continue; G.sphere(b, Math.cos(a) * (r + .03), y0 + .1, Math.sin(a) * (r + .03), .1, { seg: 8, rings: 5 }); }
      if (ti === 2) for (let i = 0; i < 12; i++) { const a = i / 12 * PI2; G.sphere(b, Math.cos(a) * (r - .12), y1 + .1, Math.sin(a) * (r - .12), .11, { seg: 8, rings: 5 }); }
      /* sprinkles on the top faces */
      if (ti < 2) { const cols = [[.15, .25, .38], [.92, .95, .99], [.2, .32, .48], [1, .99, .97]]; const R0 = ti === 0 ? T[1].r + .12 : T[2].r + .12, R1 = r - .22;
        for (let i = 0; i < 26; i++) { const a = rnd(0, PI2); if (!ok(a)) continue; const rr = rnd(R0, R1); b.mat(pick(cols), .3, 20); G.box(b, Math.cos(a) * rr, y1 + .035, Math.sin(a) * rr, .16, .03, .05, rnd(0, 3)); } }
    });
    if (main) {
      /* flowers on the bottom tier, berries and leaves on the middle tier */
      for (let i = 0; i < 7; i++) { const a = .3 + i * PI2 / 7; if (cutOn && inGap(a)) continue; const x = Math.cos(a) * 2.05, z = Math.sin(a) * 2.05, y = T[0].y0 + T[0].h + .1;
        b.mat(PETAL, .3, 20); for (let k = 0; k < 5; k++) { const p = k / 5 * PI2; G.sphere(b, x + Math.cos(p) * .13, y, z + Math.sin(p) * .13, .1, { seg: 8, rings: 4, sy: .5 }); }
        b.mat(IVO, .4, 30); G.sphere(b, x, y + .03, z, .08, { seg: 8, rings: 4 }); }
      for (let i = 0; i < 5; i++) { const a = i * PI2 / 5 + .6, x = Math.cos(a) * 1.5, z = Math.sin(a) * 1.5, y = T[1].y0 + T[1].h + .1;
        b.mat(DBLUE, .5, 40); G.sphere(b, x, y, z, .11, { seg: 8, rings: 5 }); G.sphere(b, x + .15, y - .02, z + .05, .09, { seg: 8, rings: 5 }); G.sphere(b, x - .02, y - .02, z + .16, .09, { seg: 8, rings: 5 });
        b.mat(BLUE, .2, 16); G.sphere(b, x - .18, y - .04, z - .05, .14, { seg: 8, rings: 4, sy: .22, sx: 1.3 }); }
      /* a cat on each side of the top tier */
      [-1, 1].forEach(sd => { const x = sd * 1.38, z = .55, y = T[1].y0 + T[1].h + .02;
        b.mat(NAVY, .25, 20); G.sphere(b, x, y + .3, z, .26, { sy: 1.25, seg: 10, rings: 6 }); G.sphere(b, x, y + .7, z, .2, { seg: 10, rings: 6 }); G.cone(b, x - .11, y + .82, z, .07, .17); G.cone(b, x + .11, y + .82, z, .07, .17);
        for (let k = 0; k < 5; k++) G.sphere(b, x - sd * (.22 + k * .07), y + .12 + k * .09, z - .08, .06 - k * .004, { seg: 6, rings: 4 });
        b.mat(IVO, .5, 40); G.sphere(b, x - .07, y + .72, z + .17, .028, { seg: 6, rings: 4 }); G.sphere(b, x + .07, y + .72, z + .17, .028, { seg: 6, rings: 4 }); });
    }
    return b;
  }
  function plateBits() { const b = new G.Builder(); b.mat([.96, .97, .99], .8, 70); G.lathe(b, [[.01, .01], [.8, .01], [.92, .05], [.98, .1], [.92, .1], [.8, .06], [.01, .06]], 28); return b; }

  /* ---------- the live scene ---------- */
  function create(canvas, opts = {}) {
    const R = new G.Renderer(canvas, { dpr: opts.dpr || 1.5 }), orbit = new G.Orbit(canvas, { yaw: .5, pitch: .36, dist: 14, ty: 1.85 });
    let main = R.upload(buildCake(null)), slice = null, plate = null, dig = null, flames = [], lit = [], lightT = [], room = 0, roomT = 0, night = !!opts.night;
    let add = [], alpha = [], parts = [], raf = 0, last = 0, running = false, t = 0, cutT = -1, nF = 0, acc = 0, startAt = 0;
    const calm = () => !!opts.calm && opts.calm();

    function setDigits(str) { R.free(dig); const d = digits(String(str)); dig = R.upload(d.b); flames = d.flames; lit = flames.map(() => false); lightT = flames.map(() => 0); }
    function emit(kind, p) {
      if (calm() && kind !== 'smoke') return;
      if (kind === 'flame') parts.push({ add: true, p: [p[0] + rnd(-.03, .03), p[1] - .08, p[2] + rnd(-.03, .03)], v: [rnd(-.12, .12), rnd(.7, 1.3), rnd(-.12, .12)], life: rnd(.3, .5), age: 0, s0: .24, s1: .04, c: [1, .72, .3] });
      else if (kind === 'spark') parts.push({ add: true, p: p.slice(), v: [rnd(-1, 1), rnd(.4, 1.6), rnd(-1, 1)], life: rnd(.5, .9), age: 0, s0: .09, s1: .02, c: [1, .9, .55], g: -1.6 });
      else if (kind === 'smoke') parts.push({ add: false, p: [p[0], p[1] + .1, p[2]], v: [rnd(-.1, .1), rnd(.4, .7), rnd(-.1, .1)], life: rnd(1.8, 2.6), age: 0, s0: .16, s1: .75, c: [.72, .76, .82], a: .45 });
    }
    function lights() {
      const d = room, kD = night ? [.35, .42, .6] : [.82, .8, .72], top = night ? [.26, .32, .5] : [.8, .86, .97], bot = night ? [.1, .13, .21] : [.5, .55, .68];
      const k = 1 - .72 * d, a = 1 - .62 * d, pl = [0, 1].map(i => { const f = flames[i], ii = lightT[i] * (1.5 + Math.sin(t * 13 + i * 2) * .15 + Math.sin(t * 7.3 + i) * .1); return { pos: f ? [f[0], f[1] + .1, f[2] + .15] : [0, 9, 0], col: [1 * ii, .72 * ii, .36 * ii] }; });
      return { ambTop: top.map(v => v * a), ambBot: bot.map(v => v * a), keyDir: [-.4, .8, .5], keyCol: kD.map(v => v * k), pl, rim: night ? .35 : .22 };
    }
    function frame(now) {
      raf = 0; if (!running) return;
      const raw = (now - last) / 1000 || .016, dt = Math.min(.05, raw); last = now; t += dt;
      nF++; if (nF > 8 && nF <= 28) acc += raw; if (!opts.force && opts.onSlow && ((nF === 28 && acc / 20 > .06) || (now - startAt > 3500 && nF > 3 && nF < 26))) { running = false; opts.onSlow(); return; } /* under ~16 fps: hand over to the 2D cake */
      R.resize(); orbit.update(dt, calm());
      room += (roomT - room) * Math.min(1, dt * 2.2);
      flames.forEach((f, i) => { lightT[i] += ((lit[i] ? 1 : 0) - lightT[i]) * Math.min(1, dt * 5); if (lit[i] && Math.random() < dt * 48) emit('flame', f); });
      /* particles */
      add = []; alpha = [];
      parts = parts.filter(q => { q.age += dt; if (q.age >= q.life) return false; if (q.g) q.v[1] += q.g * dt; q.p[0] += q.v[0] * dt; q.p[1] += q.v[1] * dt; q.p[2] += q.v[2] * dt;
        const u = q.age / q.life, s = q.s0 + (q.s1 - q.s0) * u, a = q.add ? (1 - u) : (q.a || .4) * (1 - u) * Math.min(1, u * 6); (q.add ? add : alpha).push(q.p[0], q.p[1], q.p[2], s, q.c[0], q.c[1], q.c[2], a); return true; });
      flames.forEach((f, i) => { const k = lightT[i]; if (k > .02) { const fl = 1 + Math.sin(t * 17 + i * 3) * .08 + Math.sin(t * 9.1 + i) * .06;
        add.push(f[0], f[1] - .02, f[2], .34 * fl, 1, .95, .8, .9 * k); add.push(f[0], f[1] + .02, f[2], 1.5 * fl, 1, .68, .32, .26 * k); add.push(f[0], f[1], f[2], 3.2 * fl, 1, .6, .25, .1 * k); } });
      R.frame(orbit, lights()); R.draw(main); if (dig) R.draw(dig);
      if (slice) { let off = [0, 0, 0], u = 0; if (cutT >= 0) { u = Math.min(1, (t - cutT) / 1.1); const e = 1 - Math.pow(1 - u, 3); off = [0, Math.sin(u * Math.PI) * .45, e * 1.05]; } R.draw(slice, off); if (plate && u > .2) R.draw(plate, [0, 0, 3.1]); }
      R.sprites(alpha, false); R.sprites(add, true);
      raf = requestAnimationFrame(frame);
    }
    const api = {
      setDigits, setNight(v) { night = !!v; },
      light(i) { if (!lit[i]) { lit[i] = true; for (let k = 0; k < 12; k++) emit('spark', flames[i]); } },
      snuff(i) { if (lit[i]) { lit[i] = false; for (let k = 0; k < 7; k++) emit('smoke', flames[i]); } },
      room(v) { roomT = v ? 1 : 0; orbit.tDist = v ? 12.4 : 14; orbit.ty = v ? 2.3 : 1.85; },
      cut() { if (slice) return; R.free(main); main = R.upload(buildCake('main')); slice = R.upload(buildCake('slice')); plate = R.upload(plateBits()); cutT = t; orbit.tyaw = 0; /* turn to face the cut */ },
      uncut() { if (!slice) return; R.free(main); R.free(slice); R.free(plate); main = R.upload(buildCake(null)); slice = plate = null; cutT = -1; },
      reset() { flames.forEach((_, i) => { lit[i] = false; lightT[i] = 0; }); parts = []; roomT = room = 0; api.uncut(); orbit.tDist = 14; orbit.ty = 1.85; },
      intro() { orbit.dist = 21; orbit.tDist = 14; orbit.yaw = -1; orbit.idle = 0; orbit.vy = 0; },
      start() { if (running) return; running = true; last = startAt = performance.now(); nF = 0; acc = 0; R.resize(); raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); },
      isCut() { return !!slice; },
      focusRect() { return canvas.getBoundingClientRect(); },
      dispose() { api.stop(); R.dispose(); }
    };
    setDigits(opts.digits || '20');
    return api;
  }
  return { create, supported: () => !!window.WebGLRenderingContext && !!window.GL3D };
})();

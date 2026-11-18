/* gl3d.js: a very small WebGL 1 engine: one lit shader, mesh builders, an orbit camera and point-sprite particles. No libraries. */
window.GL3D = (() => {
  'use strict';

  /* ---------- matrices (column-major) ---------- */
  const M4 = {
    mul(a, b) { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; },
    perspective(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; },
    lookAt(e, c, u) {
      let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
      let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
      const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
      return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
    }
  };

  /* ---------- mesh builder: position, normal, colour, material (specular, shininess, stripe flag) ---------- */
  class Builder {
    constructor() { this.v = []; this.i = []; this.n = 0; this.c = [1, 1, 1]; this.m = [.2, 16, 0]; }
    mat(col, spec = .2, shin = 16, stripe = 0) { this.c = col; this.m = [spec, shin, stripe]; return this; }
    vert(x, y, z, nx, ny, nz) { this.v.push(x, y, z, nx, ny, nz, this.c[0], this.c[1], this.c[2], this.m[0], this.m[1], this.m[2]); return this.n++; }
    tri(a, b, c) { this.i.push(a, b, c); }
  }
  /* a surface of revolution; prof = [[radius, y], ...] from bottom to top; options: a0/a1 angle range, x/y/z offset, sx/sy/sz scale */
  function lathe(b, prof, seg, o = {}) {
    const a0 = o.a0 || 0, a1 = o.a1 == null ? Math.PI * 2 : o.a1, cx = o.x || 0, cy = o.y || 0, cz = o.z || 0, sx = o.sx || 1, sy = o.sy || 1, sz = o.sz || 1;
    const np = prof.length, sn = [];
    for (let j = 0; j < np - 1; j++) { const dr = prof[j + 1][0] - prof[j][0], dy = prof[j + 1][1] - prof[j][1], l = Math.hypot(dr, dy) || 1; sn.push([dy / l, -dr / l]); }
    const cols = [], st = [], en = [];
    for (let j = 0; j < np; j++) {
      const p = sn[j - 1], q = sn[j];
      if (p && q && p[0] * q[0] + p[1] * q[1] > .5) { const nr = p[0] + q[0], ny = p[1] + q[1], l = Math.hypot(nr, ny) || 1; cols.push([prof[j][0], prof[j][1], nr / l, ny / l]); st[j] = en[j - 1] = cols.length - 1; }
      else { if (p) { cols.push([prof[j][0], prof[j][1], p[0], p[1]]); en[j - 1] = cols.length - 1; } if (q) { cols.push([prof[j][0], prof[j][1], q[0], q[1]]); st[j] = cols.length - 1; } }
    }
    const base = b.n;
    for (let k = 0; k <= seg; k++) {
      const a = a0 + (a1 - a0) * k / seg, ca = Math.cos(a), sa = Math.sin(a);
      for (const c of cols) b.vert(cx + c[0] * ca * sx, cy + c[1] * sy, cz + c[0] * sa * sz, c[2] * ca, c[3], c[2] * sa);
    }
    const nc = cols.length;
    for (let k = 0; k < seg; k++) for (let j = 0; j < np - 1; j++) {
      const A = base + k * nc + st[j], B = base + k * nc + en[j], C = base + (k + 1) * nc + st[j], D = base + (k + 1) * nc + en[j];
      b.tri(A, B, C); b.tri(B, D, C);
    }
  }
  function sphere(b, x, y, z, r, o = {}) {
    const n = o.rings || 6, prof = []; for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + Math.PI * i / n; prof.push([r * Math.cos(t), r * Math.sin(t)]); }
    lathe(b, prof, o.seg || 10, { x, y, z, sx: o.sx, sy: o.sy, sz: o.sz });
  }
  function cyl(b, x, y, z, r, h, seg = 12, rTop) { lathe(b, [[0, 0], [r, 0], [rTop == null ? r : rTop, h], [0, h]], seg, { x, y, z }); }
  function cone(b, x, y, z, r, h, seg = 8) { lathe(b, [[0, 0], [r, 0], [0, h]], seg, { x, y, z }); }
  function torus(b, x, y, z, R, r, seg = 32, rseg = 8, o = {}) {
    const prof = []; for (let i = 0; i <= rseg; i++) { const t = -Math.PI / 2 + Math.PI * 2 * i / rseg; prof.push([R + r * Math.cos(t), r * Math.sin(t)]); }
    lathe(b, prof, seg, { x, y, z, a0: o.a0, a1: o.a1 });
  }
  function box(b, x, y, z, w, h, d, yaw = 0) {
    const c = Math.cos(yaw), s = Math.sin(yaw), hw = w / 2, hh = h / 2, hd = d / 2;
    const P = (px, py, pz) => [x + px * c - pz * s, y + py, z + px * s + pz * c];
    const N = (nx, ny, nz) => [nx * c - nz * s, ny, nx * s + nz * c];
    const faces = [[[0, 0, 1], [-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]], [[0, 0, -1], [hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]],
      [[1, 0, 0], [hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]], [[-1, 0, 0], [-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]],
      [[0, 1, 0], [-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]], [[0, -1, 0], [-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]]];
    for (const f of faces) { const n = N(...f[0]), i = f.slice(1).map(p => { const q = P(...p); return b.vert(q[0], q[1], q[2], n[0], n[1], n[2]); }); b.tri(i[0], i[1], i[2]); b.tri(i[0], i[2], i[3]); }
  }
  function disc(b, x, y, z, r, seg = 40) { lathe(b, [[r, 0], [0, 0]], seg, { x, y, z }); } /* faces up */

  /* ---------- shaders ---------- */
  const VS = `attribute vec3 aPos;attribute vec3 aNor;attribute vec3 aCol;attribute vec3 aMat;uniform mat4 uVP;uniform vec3 uOff;varying vec3 vW;varying vec3 vN;varying vec3 vC;varying vec3 vM;
void main(){vec3 p=aPos+uOff;vW=p;vN=aNor;vC=aCol;vM=aMat;gl_Position=uVP*vec4(p,1.0);}`;
  const FS = `precision mediump float;varying vec3 vW;varying vec3 vN;varying vec3 vC;varying vec3 vM;
uniform vec3 uCam;uniform vec3 uAmbTop;uniform vec3 uAmbBot;uniform vec3 uKeyDir;uniform vec3 uKeyCol;uniform vec3 uPL0;uniform vec3 uPLC0;uniform vec3 uPL1;uniform vec3 uPLC1;uniform float uRim;
vec3 plight(vec3 P,vec3 C,vec3 N,vec3 V,vec3 base,float spec,float shin){vec3 d=P-vW;float d2=dot(d,d);vec3 L=d*inversesqrt(d2+0.0001);float att=1.0/(1.0+0.16*d2);float nd=max(dot(N,L),0.0);vec3 H=normalize(L+V);float sp=pow(max(dot(N,H),0.0),shin)*spec;return C*att*(base*nd+sp);}
void main(){
 if(vM.z>1.5){float a=smoothstep(1.0,0.0,length(vW.xz)/vC.x)*vC.y;gl_FragColor=vec4(0.0,0.0,0.0,a);return;}
 vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);vec3 base=vC;
 if(vM.z>0.5){float s=step(0.0,sin((vW.x+vW.z*0.6+vW.y*1.6)*14.0));base=mix(base,base*vec3(0.66,0.76,0.95),s);}
 vec3 col=mix(uAmbBot,uAmbTop,N.y*0.5+0.5)*base;
 vec3 L=normalize(uKeyDir);float nd=max(dot(N,L),0.0);col+=uKeyCol*base*nd;
 vec3 H=normalize(L+V);col+=uKeyCol*pow(max(dot(N,H),0.0),vM.y)*vM.x;
 col+=plight(uPL0,uPLC0,N,V,base,vM.x,vM.y)+plight(uPL1,uPLC1,N,V,base,vM.x,vM.y);
 col+=pow(1.0-max(dot(N,V),0.0),3.0)*uRim*base;
 gl_FragColor=vec4(min(col,vec3(1.2)),1.0);}`;
  const SVS = `attribute vec3 aPos;attribute float aSize;attribute vec4 aCol;uniform mat4 uVP;uniform float uPx;varying vec4 vCol;
void main(){vec4 p=uVP*vec4(aPos,1.0);gl_Position=p;gl_PointSize=max(1.0,aSize*uPx/p.w);vCol=aCol;}`;
  const SFS = `precision mediump float;varying vec4 vCol;uniform float uAdd;
void main(){vec2 q=gl_PointCoord*2.0-1.0;float d=dot(q,q);if(d>1.0)discard;float a=exp(-d*3.2)*vCol.a;if(uAdd>0.5)gl_FragColor=vec4(vCol.rgb*a,a*0.7);else gl_FragColor=vec4(vCol.rgb*a,a);}`;

  function program(gl, vs, fs) {
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  }

  /* ---------- renderer ---------- */
  class Renderer {
    constructor(canvas, opts = {}) {
      const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' });
      if (!gl) throw new Error('no webgl');
      this.gl = gl; this.canvas = canvas; this.dprMax = opts.dpr || 1.5;
      this.lit = program(gl, VS, FS); this.spr = program(gl, SVS, SFS);
      this.uint = !!gl.getExtension('OES_element_index_uint');
      this.sbuf = gl.createBuffer(); this.fov = .62; this.px = 1;
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0);
    }
    resize() {
      const dpr = Math.min(devicePixelRatio || 1, this.dprMax), w = Math.max(2, Math.round(this.canvas.clientWidth * dpr)), h = Math.max(2, Math.round(this.canvas.clientHeight * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      this.gl.viewport(0, 0, w, h); this.w = w; this.h = h; this.px = h / (2 * Math.tan(this.fov / 2));
    }
    upload(b) {
      const gl = this.gl; if (b.n > 65535 && !this.uint) throw new Error('mesh too large');
      const vbo = gl.createBuffer(), ibo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(b.v), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.uint ? new Uint32Array(b.i) : new Uint16Array(b.i), gl.STATIC_DRAW);
      return { vbo, ibo, count: b.i.length };
    }
    free(m) { if (m) { this.gl.deleteBuffer(m.vbo); this.gl.deleteBuffer(m.ibo); } }
    frame(cam, L) {
      const gl = this.gl, asp = this.w / this.h, cp = Math.cos(cam.pitch);
      const eye = [cam.tx + Math.sin(cam.yaw) * cp * cam.dist, cam.ty + Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist];
      this.vp = M4.mul(M4.perspective(this.fov, asp, .5, 80), M4.lookAt(eye, [cam.tx, cam.ty, cam.tz], [0, 1, 0])); this.eye = eye; this.L = L;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    draw(m, off = [0, 0, 0]) {
      const gl = this.gl, P = this.lit, u = P.u, L = this.L; gl.useProgram(P.p); gl.depthMask(true);
      gl.uniformMatrix4fv(u.uVP, false, this.vp); gl.uniform3fv(u.uCam, this.eye); gl.uniform3fv(u.uOff, off);
      gl.uniform3fv(u.uAmbTop, L.ambTop); gl.uniform3fv(u.uAmbBot, L.ambBot); gl.uniform3fv(u.uKeyDir, L.keyDir); gl.uniform3fv(u.uKeyCol, L.keyCol);
      gl.uniform3fv(u.uPL0, L.pl[0].pos); gl.uniform3fv(u.uPLC0, L.pl[0].col); gl.uniform3fv(u.uPL1, L.pl[1].pos); gl.uniform3fv(u.uPLC1, L.pl[1].col); gl.uniform1f(u.uRim, L.rim);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.vbo); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ibo);
      [['aPos', 3, 0], ['aNor', 3, 3], ['aCol', 3, 6], ['aMat', 3, 9]].forEach(([n, s, o]) => { const l = gl.getAttribLocation(P.p, n); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, s, gl.FLOAT, false, 48, o * 4); });
      gl.drawElements(gl.TRIANGLES, m.count, this.uint ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
    }
    /* list: flat [x,y,z,size,r,g,b,a, ...]; additive glow or normal alpha */
    sprites(list, add) {
      if (!list.length) return; const gl = this.gl, P = this.spr, u = P.u; gl.useProgram(P.p); gl.depthMask(false);
      gl.blendFunc(add ? gl.ONE : gl.ONE, add ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.uniformMatrix4fv(u.uVP, false, this.vp); gl.uniform1f(u.uPx, this.px); gl.uniform1f(u.uAdd, add ? 1 : 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.sbuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(list), gl.DYNAMIC_DRAW);
      [['aPos', 3, 0], ['aSize', 1, 3], ['aCol', 4, 4]].forEach(([n, s, o]) => { const l = gl.getAttribLocation(P.p, n); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, s, gl.FLOAT, false, 32, o * 4); });
      gl.drawArrays(gl.POINTS, 0, list.length / 8); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(true);
    }
    dispose() { const e = this.gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); }
  }

  /* ---------- orbit camera with inertia, drag, keys and slow auto-rotation ---------- */
  class Orbit {
    constructor(canvas, o = {}) {
      this.yaw = o.yaw || 0; this.pitch = o.pitch || .4; this.dist = o.dist || 14; this.tx = 0; this.ty = o.ty || 1.8; this.tz = 0;
      this.vy = 0; this.vp = 0; this.auto = o.auto !== false; this.idle = 0; this.drag = false; this.minP = .12; this.maxP = 1.15; this.minD = 8; this.maxD = 20; this.tDist = this.dist;
      let lx = 0, ly = 0;
      canvas.addEventListener('pointerdown', e => { this.drag = true; lx = e.clientX; ly = e.clientY; this.idle = 0; try { canvas.setPointerCapture(e.pointerId); } catch {} canvas.classList.add('grab'); });
      canvas.addEventListener('pointermove', e => { if (!this.drag) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; this.vy = this.lastvy = -dx * .006; if (e.pointerType !== 'touch') this.vp = dy * .004; this.idle = 0; });
      const up = () => { this.drag = false; this.vy = (this.lastvy || 0) * .7; canvas.classList.remove('grab'); };
      canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
      canvas.addEventListener('keydown', e => { const k = { ArrowLeft: [.35, 0], ArrowRight: [-.35, 0], ArrowUp: [0, -.1], ArrowDown: [0, .1] }[e.key]; if (k) { e.preventDefault(); this.vy = k[0] * .25; this.vp = k[1] * .25; this.idle = 0; } else if (e.key === '+' || e.key === '=') this.tDist = Math.max(this.minD, this.tDist - 1.2); else if (e.key === '-') this.tDist = Math.min(this.maxD, this.tDist + 1.2); });
      canvas.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); this.tDist = Math.min(this.maxD, Math.max(this.minD, this.tDist + e.deltaY * .01)); }, { passive: false });
    }
    update(dt, calm) {
      this.idle += dt; if (this.auto && !this.drag && this.idle > 2.2 && !calm) this.vy += (.22 - this.vy) * Math.min(1, dt * 1.2);
      this.yaw += this.vy * (this.drag ? 1 : Math.min(1, dt * 60) * 1); this.pitch = Math.min(this.maxP, Math.max(this.minP, this.pitch + this.vp));
      if (this.drag) { this.vy = 0; this.vp = 0; } else { this.vy *= Math.pow(.92, dt * 60); this.vp *= Math.pow(.85, dt * 60); if (Math.abs(this.vy) < .0004 && this.idle < 2.2) this.vy = 0; }
      this.dist += (this.tDist - this.dist) * Math.min(1, dt * 4);
      if (this.tyaw != null && !this.drag) { const d = ((this.tyaw - this.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; this.yaw += d * Math.min(1, dt * 3); this.pitch += (.4 - this.pitch) * Math.min(1, dt * 3); this.vy = 0; this.idle = 0; if (Math.abs(d) < .01) this.tyaw = null; }
    }
  }

  return { M4, Builder, lathe, sphere, cyl, cone, torus, box, disc, Renderer, Orbit };
})();

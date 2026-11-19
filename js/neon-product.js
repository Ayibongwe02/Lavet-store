/*
 * Lavet Wellness — Neon Product
 * ------------------------------------------------------------
 * A dependency-free canvas renderer that draws the Lavet dropper
 * bottle as a glowing neon line structure (gold or bright white),
 * wrapped in a rotating 4D tesseract halo.
 *
 *  - 3D: the bottle is a lathe of rings + meridians. It follows the
 *        cursor (yaw / pitch), and can be dragged to spin.
 *  - 4D: the cursor also steers the tesseract's rotation through the
 *        W axis (XW and YW planes), so the halo "folds" through itself.
 *
 * Used by the hero stage (index.html) and the loading overlay
 * (js/neon-loader.js) so both share exactly the same look.
 */
(function (root) {
  'use strict';

  var PALETTES = {
    // core = hot centre of each line, glow = the halo bleeding around it
    // Sage matches the storefront accent (--accent #5f7a61 on warm paper).
    // "gold" is kept as the key so saved palettes still resolve.
    gold:  { core: [232, 242, 228], glow: [122, 168, 124], spot: [168, 196, 158] },
    sage:  { core: [232, 242, 228], glow: [122, 168, 124], spot: [168, 196, 158] },
    white: { core: [255, 255, 255], glow: [140, 205, 255], spot: [190, 225, 255] }
  };

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var rgba = function (c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; };

  /* ---------------------------------------------------------- *
   * Geometry: Lavet dropper bottle (lathe profile)
   * ---------------------------------------------------------- */
  function buildGeometry() {
    var RING_SEGS = 40;      // segments around each ring
    var MERIDIAN_STEP = 2;   // draw a meridian every Nth angular step

    // Profile points: [radius, y, ringKind]  ringKind: 0 none, 1 ring, 2 accent ring
    var prof = [];
    var P = function (r, y, k) { prof.push([r, y, k === undefined ? 1 : k]); };
    var i, a, u;

    // flat base: radial discs
    P(0.0, -0.9, 0); P(0.15, -0.9, 1); P(0.30, -0.9, 1); P(0.45, -0.9, 1);
    // rounded base corner
    for (i = 1; i <= 8; i++) { a = (i / 8) * Math.PI / 2; P(0.45 + 0.10 * Math.sin(a), -0.8 - 0.10 * Math.cos(a), i === 8 ? 2 : 1); }
    // straight body (every other ring so it reads as clean lines)
    for (i = 1; i <= 14; i++) {
      var yy = -0.8 + 0.95 * i / 14;
      var kind = i % 2 === 0 ? 1 : 0;
      if (i === 5 || i === 9) kind = 2; // label band edges
      P(0.55, yy, kind);
    }
    // shoulder
    for (i = 1; i <= 12; i++) { u = i / 12; P(0.2 + 0.35 * Math.cos(u * Math.PI / 2), 0.15 + 0.35 * u, 1); }
    // neck
    P(0.2, 0.56, 1); P(0.2, 0.62, 2);
    // metal collar (dense ribs)
    P(0.28, 0.62, 2);
    for (i = 1; i <= 8; i++) P(0.28, 0.62 + 0.22 * i / 8, 1);
    P(0.28, 0.84, 2);
    // rubber bulb
    P(0.19, 0.84, 1);
    for (i = 1; i <= 12; i++) { a = (i / 12) * Math.PI / 2; P(0.19 * Math.cos(a), 0.84 + 0.42 * Math.sin(a), i % 2 === 0 ? 1 : 0); }

    var yMin = -0.9, yMax = 1.26, yMid = (yMin + yMax) / 2;
    var nP = prof.length, nA = RING_SEGS;

    var vx = [], vy = [], vz = [], vt = [];
    var addV = function (x, y, z, t) { vx.push(x); vy.push(y); vz.push(z); vt.push(t); return vx.length - 1; };

    // vertex grid: grid[i][j]
    var grid = [];
    for (i = 0; i < nP; i++) {
      var row = [];
      var t = (prof[i][1] - yMin) / (yMax - yMin);
      for (var j = 0; j < nA; j++) {
        var th = (j / nA) * Math.PI * 2;
        row.push(addV(prof[i][0] * Math.cos(th), prof[i][1] - yMid, prof[i][0] * Math.sin(th), t));
      }
      grid.push(row);
    }

    var sa = [], sb = [], st = [], sk = []; // segment a, b, t, kind (0 ring, 1 meridian, 2 accent, 3 floor)
    var addS = function (a, b, kind) {
      sa.push(a); sb.push(b); st.push(Math.max(vt[a], vt[b])); sk.push(kind);
    };

    // rings
    for (i = 0; i < nP; i++) {
      if (!prof[i][2] || prof[i][0] < 0.001) continue;
      for (var j2 = 0; j2 < nA; j2++) addS(grid[i][j2], grid[i][(j2 + 1) % nA], prof[i][2] === 2 ? 2 : 0);
    }
    // meridians
    for (var j3 = 0; j3 < nA; j3 += MERIDIAN_STEP) {
      for (i = 0; i < nP - 1; i++) {
        if (prof[i][0] < 0.001 && prof[i + 1][0] < 0.001) continue;
        addS(grid[i][j3], grid[i + 1][j3], 1);
      }
    }

    // floor rings (stage plate beneath the bottle)
    [0.95, 1.25].forEach(function (R) {
      var first = -1, prev = -1, n = 72;
      for (var k = 0; k <= n; k++) {
        var th2 = (k / n) * Math.PI * 2;
        var v = addV(R * Math.cos(th2), yMin - yMid - 0.08, R * Math.sin(th2), 0);
        if (prev >= 0) addS(prev, v, 3);
        else first = v;
        prev = v;
      }
    });

    return {
      nV: vx.length, nS: sa.length,
      vx: new Float32Array(vx), vy: new Float32Array(vy), vz: new Float32Array(vz), vt: new Float32Array(vt),
      sa: new Int32Array(sa), sb: new Int32Array(sb), st: new Float32Array(st), sk: new Uint8Array(sk)
    };
  }

  /* ---------------------------------------------------------- *
   * Geometry: tesseract (4D hypercube)
   * ---------------------------------------------------------- */
  function buildTesseract() {
    var V = [], E = [], i, j;
    for (i = 0; i < 16; i++) V.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1, (i & 8) ? 1 : -1]);
    for (i = 0; i < 16; i++) for (j = i + 1; j < 16; j++) {
      var x = i ^ j; // differ by exactly one bit => edge
      if (x === 1 || x === 2 || x === 4 || x === 8) E.push([i, j]);
    }
    return { V: V, E: E }; // 16 vertices, 32 edges
  }

  /* ---------------------------------------------------------- *
   * Scene
   * ---------------------------------------------------------- */
  function create(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var geo = buildGeometry();
    var tess = buildTesseract();
    var reduceMotion = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

    var S = {
      palette: PALETTES[opts.palette] ? opts.palette : 'gold',
      interactive: opts.interactive !== false,
      halo: opts.halo !== false,
      build: opts.build === undefined ? 1 : opts.build,   // 0..1 reveal from base to bulb (loader)
      spinBoost: opts.spinBoost || 0,
      zoom: opts.zoom || 1,
      spin: 0, yaw: 0, pitch: 0.28,
      a4: 0, b4: 0, c4: 0,                                 // 4D rotation angles (XW, YW, ZW)
      px: 0, py: 0, tx: 0, ty: 0,                          // pointer (normalised -1..1), smoothed + target
      sx: 0.5, sy: 0.4, stx: 0.5, sty: 0.4,                // spotlight position (0..1 of canvas)
      lastMove: -1e9, dragging: false, lastX: 0,
      w: 0, h: 0, dpr: 1, f: 1,
      time: 0
    };

    // projected scratch buffers
    var PX = new Float32Array(geo.nV), PY = new Float32Array(geo.nV), PZ = new Float32Array(geo.nV);
    var NB = 4;
    var buckets = [];
    for (var b = 0; b < NB; b++) buckets.push(new Int32Array(geo.nS));
    var counts = new Int32Array(NB);
    var accent = new Int32Array(geo.nS), nAccent = 0;
    var lead = new Int32Array(geo.nS), nLead = 0;
    var floorSegs = new Int32Array(geo.nS), nFloor = 0;

    var CAM = 4.4; // camera distance

    function resize(cssW, cssH, dpr) {
      S.dpr = dpr || 1; S.w = cssW; S.h = cssH;
      canvas.width = Math.max(1, Math.round(cssW * S.dpr));
      canvas.height = Math.max(1, Math.round(cssH * S.dpr));
      S.f = Math.min(cssH * 1.25, cssW * 1.6); // focal length in css px
    }

    function rotate3(x, y, z, cy, sy, cp, sp) {
      var x1 = x * cy + z * sy;
      var z1 = -x * sy + z * cy;
      return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
    }

    function draw() {
      var w = S.w, h = S.h, d = S.dpr, pal = PALETTES[S.palette];
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      var cx = w / 2, cy0 = h * 0.5;

      // cursor spotlight + floor glow
      var g = ctx.createRadialGradient(S.sx * w, S.sy * h, 0, S.sx * w, S.sy * h, Math.max(w, h) * 0.55);
      g.addColorStop(0, rgba(pal.spot, 0.16)); g.addColorStop(1, rgba(pal.spot, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      var fg = ctx.createRadialGradient(cx, h * 0.86, 0, cx, h * 0.86, w * 0.42);
      fg.addColorStop(0, rgba(pal.glow, 0.20 * S.build)); fg.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = fg; ctx.fillRect(0, 0, w, h);

      var cyw = Math.cos(S.yaw), syw = Math.sin(S.yaw), cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
      var f = S.f * (S.zoom || 1), i, k;

      // project bottle vertices
      var vx = geo.vx, vy = geo.vy, vz = geo.vz;
      for (i = 0; i < geo.nV; i++) {
        var x = vx[i], y = vy[i], z = vz[i];
        var x1 = x * cyw + z * syw;
        var z1 = -x * syw + z * cyw;
        var y1 = y * cp - z1 * sp;
        var z2 = y * sp + z1 * cp;
        var k2 = f / (CAM + z2);
        PX[i] = cx + x1 * k2; PY[i] = cy0 - y1 * k2; PZ[i] = z2;
      }

      // bucket segments by depth
      counts.fill(0); nAccent = 0; nLead = 0; nFloor = 0;
      var build = S.build, sa = geo.sa, sb = geo.sb, st = geo.st, sk = geo.sk, kind;
      for (i = 0; i < geo.nS; i++) {
        if (st[i] > build) continue;
        kind = sk[i];
        if (kind === 3) { floorSegs[nFloor++] = i; continue; }
        if (build < 1 && st[i] > build - 0.05) { lead[nLead++] = i; continue; }
        if (kind === 2) { accent[nAccent++] = i; continue; }
        var zav = (PZ[sa[i]] + PZ[sb[i]]) * 0.5;
        var L = clamp(0.62 - zav * 0.75, 0.05, 1);
        var bk = Math.min(NB - 1, (L * NB) | 0);
        buckets[bk][counts[bk]++] = i;
      }

      function stroke(list, n, width, color) {
        if (!n) return;
        ctx.beginPath();
        for (var q = 0; q < n; q++) {
          var s = list[q];
          ctx.moveTo(PX[sa[s]], PY[sa[s]]); ctx.lineTo(PX[sb[s]], PY[sb[s]]);
        }
        ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke();
      }

      // floor rings (dim)
      stroke(floorSegs, nFloor, 1, rgba(pal.glow, 0.28 * Math.min(1, build * 4)));

      // depth buckets: wide soft glow pass, then thin hot core
      for (var bq = 0; bq < NB; bq++) {
        var lvl = (bq + 0.5) / NB;
        stroke(buckets[bq], counts[bq], 4.2, rgba(pal.glow, 0.05 + 0.07 * lvl));
        stroke(buckets[bq], counts[bq], 1.05, rgba(pal.core, 0.16 + 0.62 * lvl));
      }

      // accent rings (label band, collar, base lip) — brightest, with true bloom
      if (nAccent) {
        ctx.save();
        ctx.shadowColor = rgba(pal.glow, 0.95); ctx.shadowBlur = 14;
        stroke(accent, nAccent, 1.6, rgba(pal.core, 0.95));
        ctx.restore();
      }
      // loader scan-edge
      if (nLead) {
        ctx.save();
        ctx.shadowColor = rgba(pal.core, 1); ctx.shadowBlur = 18;
        stroke(lead, nLead, 2.0, rgba([255, 255, 255], 1));
        ctx.restore();
      }

      // 4D halo
      var haloA = S.halo ? clamp((build - 0.78) * 4.5, 0, 1) : 0;
      if (haloA > 0.01) drawTesseract(haloA, cx, cy0, cyw, syw, cp, sp, pal);

      ctx.globalCompositeOperation = 'source-over';
    }

    function drawTesseract(alpha, cx, cy0, cyw, syw, cp, sp, pal) {
      var pts = [], V = tess.V, E = tess.E, i;
      var ca = Math.cos(S.a4), sa4 = Math.sin(S.a4), cb = Math.cos(S.b4), sb4 = Math.sin(S.b4), cc = Math.cos(S.c4), sc = Math.sin(S.c4);
      var SC = S.zoom || 1;
      for (i = 0; i < 16; i++) {
        var x = V[i][0], y = V[i][1], z = V[i][2], w = V[i][3], t;
        // rotations in the XW, YW and ZW planes — the genuinely 4D ones
        t = x * ca - w * sa4; w = x * sa4 + w * ca; x = t;
        t = y * cb - w * sb4; w = y * sb4 + w * cb; y = t;
        t = z * cc - w * sc;  w = z * sc + w * cc;  z = t;
        // 4D -> 3D perspective along W
        var k4 = 1 / (3.6 - w);
        x *= k4 * 2.5 * SC; y *= k4 * 2.5 * SC; z *= k4 * 2.5 * SC;
        // 3D view rotation (same camera as the bottle) + perspective
        var x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
        var y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        var k2 = S.f / (CAM + z2);
        pts.push([cx + x1 * k2, cy0 - y1 * k2, z2, w]);
      }
      ctx.beginPath();
      for (i = 0; i < E.length; i++) { var p = pts[E[i][0]], q = pts[E[i][1]]; ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
      ctx.lineWidth = 3.4; ctx.strokeStyle = rgba(pal.glow, 0.06 * alpha); ctx.stroke();
      ctx.lineWidth = 0.9; ctx.strokeStyle = rgba(pal.core, 0.34 * alpha); ctx.stroke();
      for (i = 0; i < 16; i++) {
        var pp = pts[i], dep = clamp(0.5 - pp[2] * 0.5, 0.25, 1);
        ctx.beginPath(); ctx.arc(pp[0], pp[1], 1.9, 0, Math.PI * 2);
        ctx.fillStyle = rgba(pal.core, 0.9 * alpha * dep); ctx.fill();
      }
    }

    /* ---------------- animation + pointer ---------------- */
    var raf = 0, last = 0, running = false, visible = true;

    function update(dt, now) {
      S.time += dt;
      var idle = (now - S.lastMove) > 2200;
      var active = S.interactive && !idle;

      // pointer -> targets; fall back to a slow sway when idle
      var tx = S.tx, ty = S.ty;
      if (!active || reduceMotion) {
        tx = reduceMotion ? 0 : Math.sin(S.time * 0.45) * 0.35;
        ty = reduceMotion ? 0 : Math.cos(S.time * 0.37) * 0.25;
      }
      var e = 1 - Math.exp(-dt * 5.5);
      S.px += (tx - S.px) * e; S.py += (ty - S.py) * e;
      S.sx += (S.stx - S.sx) * e; S.sy += (S.sty - S.sy) * e;

      // continuous slow spin (slower while the cursor is steering)
      var spinSpeed = reduceMotion ? 0 : (active ? 0.07 : 0.28) + S.spinBoost;
      S.spin += spinSpeed * dt;

      S.yaw = S.spin + S.px * 1.15;
      S.pitch = 0.30 - S.py * 0.55;

      // 4D angles: cursor steers XW / YW, slow constant drift in all three planes
      var drift = reduceMotion ? 0 : dt;
      S.a4 = S.px * 1.4 + S.time * 0.18 * (reduceMotion ? 0 : 1);
      S.b4 = S.py * 1.4 + S.time * 0.13 * (reduceMotion ? 0 : 1);
      S.c4 += 0.09 * drift;
    }

    function frame(now) {
      raf = 0;
      if (!running) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      update(dt, now);
      if (visible) draw();
      raf = root.requestAnimationFrame(frame);
    }

    function onMove(ev) {
      var r = canvas.getBoundingClientRect();
      var nx = ((ev.clientX - (r.left + r.width / 2)) / Math.max(320, r.width * 1.1));
      var ny = ((ev.clientY - (r.top + r.height / 2)) / Math.max(320, r.height * 1.1));
      S.tx = clamp(nx, -1, 1); S.ty = clamp(ny, -1, 1);
      S.stx = clamp((ev.clientX - r.left) / r.width, -0.2, 1.2);
      S.sty = clamp((ev.clientY - r.top) / r.height, -0.2, 1.2);
      S.lastMove = performance.now();
      if (S.dragging) { S.spin += (ev.clientX - S.lastX) * 0.012; S.lastX = ev.clientX; }
    }
    function onDown(ev) { S.dragging = true; S.lastX = ev.clientX; canvas.classList.add('is-dragging'); }
    function onUp() { S.dragging = false; canvas.classList.remove('is-dragging'); }

    var ro = null, io = null;
    function fit() {
      var r = canvas.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) resize(r.width, r.height, Math.min(root.devicePixelRatio || 1, 2));
    }

    function start() {
      if (running) return;
      running = true; last = 0;
      if (S.interactive) {
        root.addEventListener('pointermove', onMove, { passive: true });
        canvas.addEventListener('pointerdown', onDown);
        root.addEventListener('pointerup', onUp);
        root.addEventListener('pointercancel', onUp);
      }
      fit();
      if (root.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(canvas); } else root.addEventListener('resize', fit);
      if (root.IntersectionObserver) {
        io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 });
        io.observe(canvas);
      }
      raf = root.requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) root.cancelAnimationFrame(raf);
      root.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
      root.removeEventListener('resize', fit);
      if (ro) ro.disconnect(); if (io) io.disconnect();
    }

    return {
      state: S, start: start, stop: stop, resize: resize, draw: draw, update: update,
      setPalette: function (name) { if (PALETTES[name]) S.palette = name; },
      setBuild: function (v) { S.build = clamp(v, 0, 1); },
      setZoom: function (z) { S.zoom = z; },
      setSpinBoost: function (v) { S.spinBoost = v; },
      stats: { vertices: geo.nV, segments: geo.nS, tesseractEdges: tess.E.length }
    };
  }

  var api = { create: create, PALETTES: PALETTES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NeonProduct = api;
})(typeof window !== 'undefined' ? window : globalThis);

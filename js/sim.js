/* TT Dino Safari: the rules with no drawing, so node can run them too (tools/check.js).
   The road through the valley, the hills, trees, rocks and lakes, where every dinosaur lives and how it moves, the jeep,
   the camera behind it, each player's viewfinder, photo scoring, Froggy's photos, and the headless check:
   every dinosaur can be found and photographed on both levels, and the photo scoring does what it says. */
(function (root) {
  'use strict';
  const D = root.DINO = root.DINO || {};
  const SAB = D.sabotage = D.sabotage || {};

  // ---------- numbers you can repeat ----------
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  // ---------- the levels ----------
  // frame: the viewfinder's height as a share of the screen's. stars: points for 1, 2 and 3 stars. grow: EASY counts a dino
  // a little outside the drawn frame. magnet: EASY's frame drifts onto a dinosaur when you stop moving it.
  const LV = {
    easy: { id: 'easy', speed: 5.4, slow: 3.0, frame: 0.5, film: Infinity, stars: [0, 30, 55], minIn: 0.25, minSize: 0.04, grow: 1.2, magnet: true },
    normal: { id: 'normal', speed: 7.4, slow: 5.0, frame: 0.38, film: 30, stars: [20, 45, 70], minIn: 0.35, minSize: 0.06, grow: 1, magnet: false },
  };
  const ZOOM = 0.55; // the zoomed frame's size
  const WATER = -0.7;

  // ---------- the road: a smooth curve through these points, measured every half metre ----------
  const CP = [[0, 50], [0, 0], [0, -60], [30, -130], [20, -210], [-30, -270], [-60, -350], [-40, -430], [10, -490], [60, -560], [60, -640], [20, -700], [0, -760], [0, -820]];
  const STEP = 0.5;
  const RX = [], RZ = [];
  (function buildRoad() {
    const pts = [];
    for (let i = 1; i < CP.length - 2; i++) {
      const p0 = CP[i - 1], p1 = CP[i], p2 = CP[i + 1], p3 = CP[i + 2];
      for (let k = 0; k < 400; k++) {
        const u = k / 400, u2 = u * u, u3 = u2 * u;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
        pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    pts.push(CP[CP.length - 2]);
    let x0 = pts[0][0], z0 = pts[0][1], acc = 0;
    RX.push(x0); RZ.push(z0);
    for (let i = 1; i < pts.length; i++) {
      const x1 = pts[i][0], z1 = pts[i][1];
      let seg = Math.hypot(x1 - x0, z1 - z0);
      while (acc + seg >= STEP) {
        const t = (STEP - acc) / seg;
        x0 += (x1 - x0) * t; z0 += (z1 - z0) * t;
        RX.push(x0); RZ.push(z0);
        seg = Math.hypot(x1 - x0, z1 - z0);
        acc = 0;
      }
      acc += seg; // the distance walked since the last sample carries into the next piece
      x0 = x1; z0 = z1;
    }
  })();
  const LEN = (RX.length - 1) * STEP;
  function pathAt(s) {
    s = clamp(s, 0, LEN - 0.001);
    const i = Math.floor(s / STEP), f = s / STEP - i;
    const x = RX[i] + (RX[i + 1] - RX[i]) * f, z = RZ[i] + (RZ[i + 1] - RZ[i]) * f;
    let tx = RX[i + 1] - RX[i], tz = RZ[i + 1] - RZ[i];
    const n = Math.hypot(tx, tz) || 1;
    tx /= n; tz /= n;
    return { x, z, tx, tz };
  }
  // a point beside the road: side +1 is right of the way the jeep drives
  function beside(s, side, d) { const p = pathAt(s); return { x: p.x - p.tz * side * d, z: p.z + p.tx * side * d }; }
  // how far a point is from the road, and where along it
  function nearRoad(x, z) {
    let best = 1e9, bi = 0;
    for (let i = 0; i < RX.length; i += 8) { const d = (RX[i] - x) ** 2 + (RZ[i] - z) ** 2; if (d < best) { best = d; bi = i; } }
    for (let i = Math.max(0, bi - 8); i <= Math.min(RX.length - 1, bi + 8); i++) { const d = (RX[i] - x) ** 2 + (RZ[i] - z) ** 2; if (d < best) { best = d; bi = i; } }
    return { d: Math.sqrt(best), s: bi * STEP };
  }

  // ---------- the land ----------
  const LAKES = [{ s: 432, side: 1, d: 35, r: 23 }, { s: 492, side: -1, d: 28, r: 11 }].map((l) => Object.assign(l, beside(l.s, l.side, l.d)));
  function ground(x, z, near) {
    const q = near || nearRoad(x, z);
    const flat = smooth(6, 16, q.d);
    let h = (1.1 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.037) + 0.6 * Math.sin((x - z) * 0.071 + 0.4)) * flat;
    h += smooth(44, 125, q.d) * 30 * (0.75 + 0.25 * Math.sin(z * 0.02 + x * 0.013));
    for (const lk of LAKES) { const r = Math.hypot(x - lk.x, z - lk.z); h -= 2.8 * (1 - smooth(lk.r - 7, lk.r + 1, r)) * flat; }
    return h;
  }
  function zoneAt(s) { let z = D.ZONES[0]; for (const q of D.ZONES) if (s >= q.s) z = q; return z; }

  // ---------- where each dinosaur lives ----------
  function anchors() {
    const out = [];
    for (const sp of D.SPECIES) {
      sp.inst.forEach((o, i) => {
        let d = o.d;
        if (SAB.hideRex && sp.id === 'trex') d = 150; // sabotage: the T. rex lives far outside the valley
        const a = beside(o.s, o.side, d), p = pathAt(o.s);
        out.push({ sp, i, o, ax: a.x, az: a.z, s: o.s, side: o.side, road: p, sc: o.scale || 1 });
      });
    }
    return out;
  }

  // ---------- trees and rocks (seeded: the art draws exactly these, the check looks through exactly these) ----------
  function segDist(px, pz, ax, az, bx, bz) {
    const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz || 1;
    const t = clamp(((px - ax) * vx + (pz - az) * vz) / L2, 0, 1);
    return Math.hypot(px - ax - vx * t, pz - az - vz * t);
  }
  const TREE_ZONE = { plains: 0.1, forest: 0.62, lake: 0.18, hills: 0.14, volcano: 0.08, rocks: 0.06 };
  const KIND = { plains: ['palm', 'cycad'], forest: ['round', 'pine', 'round'], lake: ['palm', 'round'], hills: ['pine', 'pine', 'cycad'], volcano: ['pine', 'palm'], rocks: ['palm', 'cycad'] };
  function buildWorld() {
    const R = rng(7), A = anchors();
    const trees = [], rocks = [];
    // no tree right where a dinosaur walks or flies, or on the lines the camera looks at it along
    const keepOut = [];
    for (const a of A) {
      const sp = a.sp;
      let r = sp.L * 0.55 * a.sc + 4;
      if (sp.move === 'wander') r += sp.r;
      if (sp.move === 'circle' || sp.move === 'fly') r = sp.r + sp.L + 6;
      if (sp.move === 'bonk') r = 12;
      keepOut.push({ x: a.ax, z: a.az, r });
    }
    const sight = [];
    for (const sp of D.SPECIES) {
      const a = A.find((q) => q.sp === sp);
      for (const k of [10, 22, 36, 52, 70]) { const c = pathAt(a.s - k - 6); sight.push([c.x, c.z, a.ax, a.az]); }
    }
    const ok = (x, z, rad) => {
      const q = nearRoad(x, z);
      if (q.d < 9 + rad) return false;
      if (ground(x, z, q) < WATER + 0.4) return false;
      for (const k of keepOut) if (Math.hypot(x - k.x, z - k.z) < k.r + rad) return false;
      for (const l of sight) if (segDist(x, z, l[0], l[1], l[2], l[3]) < 2.5 + rad) return false;
      return true;
    };
    const addTree = (x, z, kind, big) => {
      const h = (kind === 'palm' ? 7 : kind === 'pine' ? 6 : kind === 'cycad' ? 2.2 : 5) * big;
      const cr = (kind === 'palm' ? 3 : kind === 'pine' ? 2.6 : kind === 'cycad' ? 1.8 : 3.6) * big;
      const y = ground(x, z);
      trees.push({ x, z, y, kind, big, r: 0.35 * big + 0.1, h: y + h, cr, cy: y + h + (kind === 'pine' ? cr * 0.9 : kind === 'cycad' ? 0.6 : cr * 0.55) });
    };
    for (let s = 0; s < LEN; s += 4) {
      const zone = zoneAt(s).id;
      for (const side of [-1, 1]) {
        if (R() > TREE_ZONE[zone]) continue;
        const d = 11 + R() * 40, p = beside(s + R() * 4, side, d);
        const kind = KIND[zone][Math.floor(R() * KIND[zone].length)], big = 0.8 + R() * 0.6;
        if (ok(p.x, p.z, 3.6 * big)) addTree(p.x, p.z, kind, big);
      }
      // the far slopes: trees for the view
      if (R() < 0.7) {
        const side = R() < 0.5 ? -1 : 1, p = beside(s, side, 55 + R() * 50);
        const kind = KIND[zone][Math.floor(R() * KIND[zone].length)];
        addTree(p.x, p.z, kind, 0.9 + R() * 0.7);
      }
      // boulders: more of them in the hills and the big rocks
      const rp = { plains: 0.06, forest: 0.08, lake: 0.1, hills: 0.35, volcano: 0.3, rocks: 0.5 }[zone];
      if (R() < rp) {
        const side = R() < 0.5 ? -1 : 1, d = 10 + R() * 42, p = beside(s, side, d), r = 0.8 + R() * 1.8;
        if (ok(p.x, p.z, r)) rocks.push({ x: p.x, z: p.z, y: ground(p.x, p.z) + r * 0.45, r });
      }
    }
    // a tall tree for the Brachiosaurus to eat from, behind it (seen from the road)
    const br = A.find((a) => a.sp.id === 'brachio');
    { const p = beside(br.s + 6, -1, br.o.d + 9); addTree(p.x, p.z, 'round', 2.2); trees[trees.length - 1].snack = true; }
    if (SAB.treeWall) {
      // sabotage: a big tree between the road and every dinosaur
      for (const sp of D.SPECIES) for (const a of A.filter((q) => q.sp === sp)) {
        for (const k of [0, 0.25, 0.5]) {
          const c = pathAt(a.s - 12 - k * 30), mx = c.x + (a.ax - c.x) * 0.45, mz = c.z + (a.az - c.z) * 0.45;
          addTree(mx, mz, 'round', 2.4);
        }
      }
    }
    // trees by 16 m square, so looking along a line only tests the trees near it
    const grid = new Map(), G = 16;
    for (const tr of trees) {
      for (let gx = Math.floor((tr.x - tr.cr) / G); gx <= Math.floor((tr.x + tr.cr) / G); gx++) {
        for (let gz = Math.floor((tr.z - tr.cr) / G); gz <= Math.floor((tr.z + tr.cr) / G); gz++) {
          const k = gx * 10007 + gz;
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(tr);
        }
      }
    }
    return { trees, rocks, lakes: LAKES, grid, G };
  }
  let WORLD = null;
  const world = () => WORLD || (WORLD = buildWorld());

  // is the straight line from the camera to a point blocked by a tree or a rock?
  function blocked(w, cx, cy, cz, px, py, pz) {
    const vx = px - cx, vy = py - cy, vz = pz - cz, L2 = vx * vx + vy * vy + vz * vz;
    const minX = Math.min(cx, px), maxX = Math.max(cx, px), minZ = Math.min(cz, pz), maxZ = Math.max(cz, pz);
    const hit = (sx, sy, sz, r) => {
      const t = ((sx - cx) * vx + (sy - cy) * vy + (sz - cz) * vz) / L2;
      if (t <= 0 || t >= 0.97) return false;
      return (cx + vx * t - sx) ** 2 + (cy + vy * t - sy) ** 2 + (cz + vz * t - sz) ** 2 < r * r;
    };
    const near = [];
    if (w.grid) {
      const G = w.G, seenT = new Set();
      for (let gx = Math.floor(minX / G); gx <= Math.floor(maxX / G); gx++) {
        for (let gz = Math.floor(minZ / G); gz <= Math.floor(maxZ / G); gz++) {
          const l = w.grid.get(gx * 10007 + gz);
          if (l) for (const tr of l) if (!seenT.has(tr)) { seenT.add(tr); near.push(tr); }
        }
      }
    }
    for (const tr of (w.grid ? near : w.trees)) {
      if (tr.x < minX - tr.cr || tr.x > maxX + tr.cr || tr.z < minZ - tr.cr || tr.z > maxZ + tr.cr) continue;
      if (hit(tr.x, tr.cy, tr.z, tr.cr * 0.85)) return true;
      // the trunk: closest approach in plan, then the height there
      const L2p = vx * vx + vz * vz || 1, t = ((tr.x - cx) * vx + (tr.z - cz) * vz) / L2p;
      if (t > 0 && t < 0.97 && Math.hypot(cx + vx * t - tr.x, cz + vz * t - tr.z) < tr.r) { const y = cy + vy * t; if (y > tr.y && y < tr.h) return true; }
    }
    for (const r of w.rocks) {
      if (r.x < minX - r.r || r.x > maxX + r.r || r.z < minZ - r.r || r.z > maxZ + r.r) continue;
      if (hit(r.x, r.y, r.z, r.r)) return true;
    }
    return false;
  }

  // ---------- the camera: behind and above the jeep, looking along the road ----------
  function vfovFor(aspect) {
    let v = 52 * Math.PI / 180;
    const minH = 68 * Math.PI / 180;
    if (2 * Math.atan(Math.tan(v / 2) * aspect) < minH) v = 2 * Math.atan(Math.tan(minH / 2) / aspect);
    return v;
  }
  function camAt(s, aspect) {
    const a = pathAt(Math.max(0, s - 6)), b = pathAt(Math.min(LEN, s + 14)), p = pathAt(s);
    let dx = b.x - a.x, dz = b.z - a.z;
    const n = Math.hypot(dx, dz) || 1;
    dx /= n; dz /= n;
    return makeCam(p.x - dx * 6.5, 3.6, p.z - dz * 6.5, dx, dz, -0.1, aspect);
  }
  function makeCam(x, y, z, dx, dz, pitch, aspect) {
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const vfov = vfovFor(aspect), th = Math.tan(vfov / 2);
    return {
      x, y, z, dx, dz, pitch, aspect, vfov, th, tw: th * aspect,
      f: [dx * cp, sp, dz * cp], r: [-dz, 0, dx], u: [-dx * sp, cp, -dz * sp],
    };
  }
  function project(c, x, y, z) {
    const vx = x - c.x, vy = y - c.y, vz = z - c.z;
    const zc = vx * c.f[0] + vy * c.f[1] + vz * c.f[2];
    const xc = vx * c.r[0] + vz * c.r[2];
    const yc = vx * c.u[0] + vy * c.u[1] + vz * c.u[2];
    return { x: xc / (zc * c.tw), y: yc / (zc * c.th), z: zc };
  }

  // ---------- the dinosaurs move ----------
  function makeDinos() {
    return anchors().map((a, k) => {
      const sp = a.sp, o = a.o;
      const toRoad = Math.atan2(a.road.z - a.az, a.road.x - a.ax);
      const back = Math.atan2(-a.road.tz, -a.road.tx); // facing down the road, toward the jeep coming
      return {
        k, sp, id: sp.id, sc: a.sc, ax: a.ax, az: a.az, s: a.s, side: a.side, road: a.road,
        x: a.ax, z: a.az, y: ground(a.ax, a.az), y0: 0, h: toRoad + wrapA(back - toRoad) / 2, spd: 0,
        th: (o.phase || 0) + k * 0.7, clock: o.phase || 0, act: false, actT: 0, hide: sp.move === 'popup' ? 1 : 0,
        baby: !!o.baby, pair: o.pair, phase: o.phase || 0, jump: 0, gap: 4, faceRoad: toRoad,
      };
    });
  }
  function turnTo(di, target, rate, dt) { di.h += clamp(wrapA(target - di.h), -rate * dt, rate * dt); }
  function stepDino(di, dt, ride) {
    const sp = di.sp, cam = ride.cam;
    di.clock += dt;
    const cyc = sp.every ? (di.clock % sp.every) : 0;
    const wasAct = di.act;
    di.act = !!sp.every && cyc < sp.lasts;
    if (di.act && !wasAct) di.actT = 0;
    di.actT += dt;
    const faceCam = Math.atan2(cam.z - di.z, cam.x - di.x);
    const g = ground(di.x, di.z);
    if (sp.move === 'wander') {
      if (!di.act) di.th += sp.w * dt;
      const x = di.ax + Math.cos(di.th) * sp.r, z = di.az + Math.sin(di.th) * sp.r;
      di.spd = di.act ? 0 : sp.w * sp.r;
      di.x = x; di.z = z;
      turnTo(di, di.act ? faceCam : di.th + Math.PI / 2, 1.6, dt);
      di.y = sp.water ? Math.max(g, WATER - 2.1) : g;
    } else if (sp.move === 'circle' || sp.move === 'fly') {
      di.th = di.phase + (sp.speed / sp.r) * di.clock;
      di.x = di.ax + Math.cos(di.th) * sp.r;
      di.z = di.az + Math.sin(di.th) * sp.r;
      di.h = di.th + Math.PI / 2;
      di.spd = sp.speed;
      const hop = di.act ? Math.sin(Math.PI * clamp(cyc / sp.lasts, 0, 1)) : 0;
      if (sp.move === 'circle') di.y = g + hop * 1.1;
      else di.y = g + sp.alt + 1.4 * Math.sin(di.clock * 0.7 + di.phase) - hop * 3.2;
    } else if (sp.move === 'popup') {
      const near = Math.hypot(cam.x - di.x, cam.z - di.z) < 60;
      if (!near) di.clock = di.phase; // its peekaboo starts when the jeep comes near
      const c = di.clock % 9;
      const up = near && c < 7;
      di.hide = clamp(di.hide + (up ? -dt : dt) / 0.3, 0, 1);
      di.act = up && c < 1.6;
      if (SAB.noHide) di.hide = 0;
      turnTo(di, faceCam, 3, dt);
      di.y = g;
      di.spd = 0;
    } else if (sp.move === 'bonk') {
      const c = di.clock % sp.every;
      let gap;
      if (c < 1.6) gap = 1.3 + 2.7 * (c / 1.6);
      else if (c < 3.2) gap = 4;
      else if (c < 3.8) gap = 4 - 2.7 * ((c - 3.2) / 0.6);
      else gap = 1.3;
      di.act = c >= 3.8;
      di.spd = c < 1.6 ? 1.7 : c >= 3.2 && c < 3.8 ? 4.5 : 0;
      const ax = di.road.tx, az = di.road.tz, sgn = di.pair ? 1 : -1, off = gap + sp.L * 0.45;
      di.x = di.ax + ax * off * sgn;
      di.z = di.az + az * off * sgn;
      di.h = Math.atan2(-az * sgn, -ax * sgn); // facing the other one
      di.y = g;
      di.gap = gap;
    } else if (sp.move === 'nest') {
      if (di.baby) {
        di.y = g + (di.act ? Math.abs(Math.sin(di.actT * 7 + di.phase)) * 0.25 : 0);
        turnTo(di, faceCam, 2, dt);
      } else {
        di.x = di.ax + Math.sin(di.clock * 0.3) * 0.8;
        di.y = g;
        turnTo(di, di.act ? faceCam : di.faceRoad + 0.6, 1.2, dt);
      }
      di.spd = 0;
    }
    di.y0 = sp.water ? Math.max(di.y, WATER) : di.y;
  }

  // ---------- photos ----------
  // the eight corners of a dinosaur's box, on the screen
  function dinoBox(cam, di) {
    const sp = di.sp, L = sp.L * di.sc / 2, W = sp.W * di.sc / 2;
    const top = di.y + sp.H * di.sc - (di.hide * sp.H * di.sc * 1.15), y0 = Math.max(di.y0, di.y - di.hide * sp.H * di.sc * 1.15);
    const ch = Math.cos(di.h), sh = Math.sin(di.h);
    let x0 = 9, x1 = -9, y0n = 9, y1n = -9;
    for (const a of [-1, 1]) for (const b of [-1, 1]) for (const yy of [y0, top]) {
      const px = di.x + ch * L * a - sh * W * b, pz = di.z + sh * L * a + ch * W * b;
      const q = project(cam, px, yy, pz);
      if (q.z < 0.6) return null;
      x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0n = Math.min(y0n, q.y); y1n = Math.max(y1n, q.y);
    }
    if (top <= y0 + 0.05) return null;
    return { x0, x1, y0: y0n, y1: y1n, cx: (x0 + x1) / 2, cy: (y0n + y1n) / 2, w: x1 - x0, h: y1n - y0n };
  }
  // how much of a dinosaur the camera can see past trees and rocks: 1, 0.8 (half hidden) or 0
  function seen(w, cam, di) {
    if (SAB.noOcclusion) return 1;
    const sp = di.sp, Hs = sp.H * di.sc, L = sp.L * di.sc;
    const yb = di.y0 + Math.max(0.2, (di.y + Hs - di.y0) * 0.5);
    const a = blocked(w, cam.x, cam.y, cam.z, di.x, yb, di.z);
    const b = blocked(w, cam.x, cam.y, cam.z, di.x + Math.cos(di.h) * L * 0.38, di.y + Hs * 0.82, di.z + Math.sin(di.h) * L * 0.38);
    return a && b ? 0 : a || b ? 0.8 : 1;
  }
  // the boxes and the look-past-trees answers, worked out once per camera position
  function boxesFor(ride, cam) {
    if (ride._bc !== cam) { ride._bc = cam; ride._boxes = ride.dinos.map((di) => dinoBox(cam, di)); ride._seen = []; }
    return ride._boxes;
  }
  function seenC(ride, cam, i) {
    boxesFor(ride, cam);
    if (ride._seen[i] === undefined) ride._seen[i] = seen(ride.world, cam, ride.dinos[i]);
    return ride._seen[i];
  }
  function frameRect(view, lv, zoom) {
    let fh = lv.frame * view.H * (zoom ? ZOOM : 1), fw = fh * 4 / 3;
    if (fw > view.W * 0.62) { fw = view.W * 0.62; fh = fw * 0.75; } // a phone held upright: narrower, so it can still move
    return { hw: fw / view.W, hh: fh / view.H };
  }
  // keep a frame on the screen, and clear of the kit's buttons on the left edge
  function clampFrame(view, f) {
    const g = 2 * (view.gutter || 0) / view.W;
    f.x = clamp(f.x, -1 + g + f.hw, 1 - f.hw);
    f.y = clamp(f.y, -1 + f.hh, 1 - f.hh);
    return f;
  }
  // score one photo: the frame is { x, y, hw, hh } on the screen (-1..1 both ways)
  function shot(ride, cam, fr, lvId) {
    const lv = LV[lvId];
    const g = lv.grow, F = SAB.noFrame ? { x: 0, y: 0, hw: 1, hh: 1 } : { x: fr.x, y: fr.y, hw: fr.hw * g, hh: fr.hh * g };
    let best = null, why = 'empty';
    const elig = [];
    const boxes = boxesFor(ride, cam);
    for (let i = 0; i < ride.dinos.length; i++) {
      const di = ride.dinos[i], b = boxes[i];
      if (!b) continue;
      const ix = Math.max(0, Math.min(b.x1, F.x + F.hw) - Math.max(b.x0, F.x - F.hw));
      const iy = Math.max(0, Math.min(b.y1, F.y + F.hh) - Math.max(b.y0, F.y - F.hh));
      const inFrac = (ix * iy) / Math.max(1e-6, b.w * b.h);
      if (inFrac <= 0.02) continue;
      if (di.hide > 0.5) { if (why === 'empty') why = 'hiding'; continue; }
      const size = Math.max(b.w / (2 * fr.hw), b.h / (2 * fr.hh));
      if (inFrac < lv.minIn) { if (why === 'empty' || why === 'hiding') why = 'edge'; continue; }
      if (size < lv.minSize) { if (why !== 'blocked') why = 'far'; continue; }
      const vis = seenC(ride, cam, i);
      if (!vis) { why = 'blocked'; continue; }
      // big enough matters most: a tiny dinosaur far away is a 1-star photo however nicely it's framed
      const sizeS = size < 0.4 ? Math.pow(clamp((size - 0.03) / 0.37, 0, 1), 0.7) : size <= 1.05 ? 1 : Math.max(0.4, 1 - (size - 1.05) * 0.8);
      const dist = Math.hypot((b.cx - F.x) / F.hw, (b.cy - F.y) / F.hh) / Math.SQRT2;
      const centre = 1 - Math.min(1, dist);
      const tcx = cam.x - di.x, tcz = cam.z - di.z, tn = Math.hypot(tcx, tcz) || 1;
      const fd = (Math.cos(di.h) * tcx + Math.sin(di.h) * tcz) / tn;
      const facing = SAB.noFacing ? 1 : fd > 0.35 ? 1 : fd > -0.35 ? 0.8 : 0.5;
      const raw = 85 * Math.min(1, inFrac) * sizeS * (0.5 + 0.25 * centre + 0.25 * facing) * vis;
      // the photo is of the dinosaur nearest the middle of the frame (a bigger one wins a near tie)
      const e = { di, raw, inFrac, size, centre, facing, vis, pick: centre + 0.25 * Math.min(1, size) };
      elig.push(e);
      if (!best || e.pick > best.pick) best = e;
    }
    if (!best) return { score: 0, stars: 0, why, sp: null };
    const friends = Math.min(2, elig.filter((e) => e !== best && e.di.sp === best.di.sp).length);
    const bonus = (best.di.act ? 15 : 0) + friends * 5;
    const score = Math.min(100, Math.round(best.raw + bonus));
    const st = lv.stars;
    const stars = score >= st[2] ? 3 : score >= st[1] ? 2 : score >= st[0] ? 1 : 0;
    return {
      score, stars, why: stars ? 'ok' : 'far', sp: best.di.sp.id, k: best.di.k, act: best.di.act, tag: best.di.act ? best.di.sp.act : '', friends,
      parts: { inFrac: +best.inFrac.toFixed(2), size: +best.size.toFixed(2), centre: +best.centre.toFixed(2), facing: best.facing, seen: best.vis },
    };
  }
  // dinosaurs you could photograph right now (on the screen, out in the open), with their box on the screen
  function visible(ride, cam) {
    const out = [], boxes = boxesFor(ride, cam);
    for (let i = 0; i < ride.dinos.length; i++) {
      const di = ride.dinos[i], b = boxes[i];
      if (di.hide > 0.5) continue;
      if (!b || b.x1 < -1 || b.x0 > 1 || b.y1 < -1 || b.y0 > 1) continue;
      if (Math.max(b.w, b.h) < 0.03) continue;
      if (!seenC(ride, cam, i)) continue;
      out.push({ di, b });
    }
    return out;
  }

  // ---------- a ride ----------
  // players: [{ id: 'teddy', level: 'easy' }, ...]. view: { W, H, gutter } in screen pixels.
  function newRide(o) {
    const view = Object.assign({ W: 1200, H: 750, gutter: 56 }, o.view || {});
    view.aspect = view.W / view.H;
    const ride = {
      t: 0, s: 0, v: 0, phase: o.count === 0 ? 'go' : 'ready', readyT: o.count === 0 ? 0 : 1.6, view, world: o.world || world(),
      dinos: makeDinos(), events: [], zone: D.ZONES[0].id, noSlow: !!o.noSlow, seed: o.seed || 1, R: rng(o.seed || 1), vis: [],
      players: o.players.map((p, i) => ({
        i, id: p.id, level: p.level, x: o.players.length === 2 ? (i ? 0.35 : -0.35) : 0, y: 0.05, zoom: false, film: LV[p.level].film, cool: 0,
        best: {}, points: 0, snaps: 0, manualT: 9, aim: null, hfT: -9,
      })),
      cpu: o.cpu ? { id: 'froggy', best: {}, points: 0, next: 3, skip: {}, snaps: 0 } : null,
    };
    if (ride.cpu) for (const sp of D.SPECIES) ride.cpu.skip[sp.id] = ride.R() < (o.cpu === 'easy' ? 0.35 : 0.08);
    ride.cam = camAt(0, view.aspect);
    for (const pl of ride.players) Object.assign(pl, clampFrame(view, Object.assign({ x: pl.x, y: pl.y }, frameRect(view, LV[pl.level], false))));
    return ride;
  }
  function setView(ride, W, H, gutter) {
    Object.assign(ride.view, { W, H, gutter: gutter == null ? ride.view.gutter : gutter, aspect: W / H });
    ride.cam = camAt(ride.s, ride.view.aspect);
    for (const pl of ride.players) Object.assign(pl, frameRect(ride.view, LV[pl.level], pl.zoom)), clampFrame(ride.view, pl);
  }
  const jeepLevel = (ride) => (ride.players.some((p) => p.level === 'easy') ? LV.easy : LV.normal);

  // the brother points the camera: at the best dinosaur on the screen you haven't got 3 stars of, or the next one coming
  function pickTarget(ride, pl) {
    const want = (di) => !pl.best[di.sp.id] || pl.best[di.sp.id].stars < 3;
    let best = null;
    for (const v of ride.vis) if (want(v.di) && (!best || Math.max(v.b.w, v.b.h) > Math.max(best.b.w, best.b.h))) best = v;
    if (best) return { di: best.di, visible: true };
    let next = null;
    for (const di of ride.dinos) if (!di.baby && want(di) && di.s > ride.s - 5 && (!next || di.s < next.s)) next = di;
    return next ? { di: next, visible: false } : null;
  }
  function buddyAim(ride, p, secs) {
    const pl = ride.players[p];
    const t = pickTarget(ride, pl);
    pl.aim = t ? { di: t.di, t: secs || 5 } : null;
    return t ? { sp: t.di.sp.id, visible: t.visible } : null;
  }

  function stepRide(ride, dt, inputs) {
    ride.t += dt;
    const lvJ = jeepLevel(ride);
    if (ride.phase === 'ready') {
      ride.readyT -= dt;
      if (ride.readyT <= 0) { ride.phase = 'go'; ride.events.push({ type: 'go' }); }
    } else if (ride.phase === 'go') {
      let want = lvJ.speed;
      if (!ride.noSlow) {
        const cam = ride.cam;
        const need = ride.vis.some((v) => !v.di.baby && ride.players.some((pl) => !pl.best[v.di.sp.id]) && Math.hypot(v.di.x - cam.x, v.di.z - cam.z) < 70);
        if (need || ride.players.some((pl) => pl.aim)) want = lvJ.slow;
      }
      if (SAB.fastJeep) want *= 3;
      ride.v += (want - ride.v) * Math.min(1, dt * 1.2);
      ride.s += ride.v * dt;
      if (ride.s >= LEN - 1) { ride.s = LEN - 1; ride.v = 0; ride.phase = 'done'; ride.events.push({ type: 'done' }); }
    }
    ride.cam = camAt(ride.s, ride.view.aspect);
    const z = zoneAt(ride.s).id;
    if (z !== ride.zone) { ride.zone = z; ride.events.push({ type: 'zone', zone: z }); }
    for (const di of ride.dinos) stepDino(di, dt, ride);
    ride.vis = visible(ride, ride.cam);

    const view = ride.view, asp = view.aspect;
    ride.players.forEach((pl, i) => {
      const inp = (inputs && inputs[i]) || {};
      const lv = LV[pl.level];
      if (inp.zoom) { pl.zoom = !pl.zoom; inp.zoom = false; }
      Object.assign(pl, frameRect(view, lv, pl.zoom));
      pl.cool -= dt;
      const manual = inp.target || inp.ax || inp.ay;
      if (manual) { pl.manualT = 0; pl.aim = null; } else pl.manualT += dt;
      if (inp.target) { const k = Math.min(1, dt * 20); pl.x += (inp.target.x - pl.x) * k; pl.y += (inp.target.y - pl.y) * k; }
      else if (inp.ax || inp.ay) { pl.x += (inp.ax || 0) * 1.7 / asp * dt; pl.y += (inp.ay || 0) * 1.7 * dt; }
      if (pl.aim) {
        // the brother's hands on the camera
        pl.aim.t -= dt;
        const di = pl.aim.di, b = dinoBox(ride.cam, di);
        let tx = null, ty = null;
        if (b && b.x1 > -1 && b.x0 < 1 && b.y1 > -1 && b.y0 < 1) { tx = b.cx; ty = b.cy; }
        else { const q = project(ride.cam, di.ax, ground(di.ax, di.az) + di.sp.H * di.sc * 0.5, di.az); if (q.z > 1) { tx = clamp(q.x, -1, 1); ty = clamp(q.y, -1, 1); } }
        if (tx != null) { const k = Math.min(1, dt * 6); pl.x += (tx - pl.x) * k; pl.y += (ty - pl.y) * k; }
        if (pl.aim.t <= 0 || (pl.best[di.sp.id] && pl.best[di.sp.id].stars >= 3)) pl.aim = null;
      } else if (lv.magnet && pl.manualT > 0.35) {
        // EASY: a frame left alone drifts onto the nearest dinosaur
        let best = null, bd = 1.9;
        for (const v of ride.vis) {
          const d = Math.hypot((v.b.cx - pl.x) / pl.hw, (v.b.cy - pl.y) / pl.hh);
          if (d < bd) { bd = d; best = v; }
        }
        if (best) { const k = Math.min(1, dt * 2.6); pl.x += (best.b.cx - pl.x) * k; pl.y += (best.b.cy - pl.y) * k; }
      }
      clampFrame(view, pl);
      if (inp.snap) {
        inp.snap = false;
        if (pl.cool <= 0 && pl.film > 0 && ride.phase !== 'done') {
          pl.cool = 0.45;
          pl.film -= 1;
          pl.snaps++;
          const r = shot(ride, ride.cam, pl, pl.level);
          const prev = r.sp && pl.best[r.sp];
          r.isNew = !!(r.stars && !prev);
          r.better = !!(r.stars && prev && r.score > prev.score);
          if (r.stars && (!prev || r.score > prev.score)) pl.best[r.sp] = { score: r.score, stars: r.stars, tag: r.tag };
          pl.points = Object.values(pl.best).reduce((a, b) => a + b.score, 0);
          ride.events.push({ type: 'snap', p: i, shot: r, frame: { x: pl.x, y: pl.y, hw: pl.hw, hh: pl.hh } });
        }
      }
    });

    // Froggy takes photos too (1 player): one good try at each dinosaur he likes
    const cpu = ride.cpu;
    if (cpu && ride.phase === 'go') {
      cpu.next -= dt;
      if (cpu.next <= 0) {
        cpu.next = 0.5;
        const easy = lvJ.id === 'easy';
        let pick = null;
        for (const v of ride.vis) {
          if (cpu.best[v.di.sp.id] || cpu.skip[v.di.sp.id] || v.di.baby) continue;
          if (Math.max(v.b.w, v.b.h) < (easy ? 0.16 : 0.1)) continue;
          if (!pick || Math.max(v.b.w, v.b.h) > Math.max(pick.b.w, pick.b.h)) pick = v;
        }
        if (pick) {
          const fr = frameRect(view, LV.normal, false);
          const gs = () => (ride.R() + ride.R() + ride.R() - 1.5) * 1.4;
          const noise = easy ? 0.75 : 0.4;
          const f = clampFrame(view, { x: pick.b.cx + gs() * noise * fr.hw, y: pick.b.cy + gs() * noise * fr.hh, hw: fr.hw, hh: fr.hh });
          const r = shot(ride, ride.cam, f, 'normal');
          cpu.snaps++;
          if (r.stars) {
            if (easy) r.score = Math.round(r.score * 0.7); // on EASY Froggy is still learning
            cpu.best[r.sp] = { score: r.score, stars: r.stars };
            cpu.points = Object.values(cpu.best).reduce((a, b) => a + b.score, 0);
          } else cpu.skip[pick.di.sp.id] = ride.R() < 0.5;
          ride.events.push({ type: 'cpu', shot: r, frame: f });
          cpu.next = 2.2 + ride.R() * 2.5;
        }
      }
    }
  }

  // ---------- the headless check ----------
  const VIEWS = { wide: { W: 1200, H: 750 }, phoneWide: { W: 740, H: 360 }, phoneTall: { W: 390, H: 844 } };
  // every dinosaur can be found: ride the whole valley with the jeep never slowing down, and at every moment ask, for each
  // kind of dinosaur, "if you put the frame right on it now, would the photo get a star?"
  function findable(level, viewName) {
    const v = VIEWS[viewName];
    const ride = newRide({ players: [{ id: 'teddy', level }], view: { W: v.W, H: v.H, gutter: 56 }, count: 0, noSlow: true });
    const out = {};
    for (const sp of D.SPECIES) out[sp.id] = { time: 0, stars: 0, score: 0 };
    const dt = 1 / 15;
    let n = 0;
    while (ride.phase !== 'done' && n++ < 15 * 400) {
      stepRide(ride, dt, null);
      const pl = ride.players[0];
      const got = {};
      const boxes = boxesFor(ride, ride.cam);
      for (let i = 0; i < ride.dinos.length; i++) {
        const di = ride.dinos[i], b = boxes[i];
        if (!b || b.x1 < -1 || b.x0 > 1 || b.y1 < -1 || b.y0 > 1) continue;
        for (const zoom of [false, true]) {
          const f = clampFrame(ride.view, Object.assign({ x: b.cx, y: b.cy }, frameRect(ride.view, LV[level], zoom)));
          const r = shot(ride, ride.cam, f, level);
          if (r.stars && r.sp === di.sp.id) { const o = got[r.sp]; if (!o || r.score > o.score) got[r.sp] = r; }
          if (r.stars === 3 || (r.parts && r.parts.size > 0.5)) break; // zooming in can't help
        }
      }
      for (const id in got) { const o = out[id]; o.time += dt; if (got[id].score > o.score) { o.score = got[id].score; o.stars = got[id].stars; } }
      void pl;
    }
    return { out, t: ride.t, done: ride.phase === 'done' };
  }
  // a photographer bot: puts the frame on the biggest dinosaur it hasn't got yet and presses the button
  function botRide(level, o) {
    o = o || {};
    const v = VIEWS[o.view || 'wide'];
    const ride = newRide({ players: [{ id: 'tommy', level }], view: { W: v.W, H: v.H, gutter: 56 }, count: 0, cpu: o.cpu ? level : null, seed: o.seed || 1 });
    const R = rng((o.seed || 1) * 977);
    const inp = [{}];
    let wait = 1, n = 0;
    const kid = o.kid; // a 5-year-old: slow, wobbly aim, presses whenever a dinosaur is about
    while (ride.phase !== 'done' && n++ < 30 * 400) {
      const pl = ride.players[0];
      inp[0].target = null;
      wait -= 1 / 30;
      let tgt = null;
      for (const vv of ride.vis) {
        if (vv.di.baby && !kid) continue;
        const have = pl.best[vv.di.sp.id];
        if (!kid && have && (have.stars >= 3 || level === 'normal')) continue;
        if (kid && have && have.stars >= 2) continue;
        if (!tgt || Math.max(vv.b.w, vv.b.h) > Math.max(tgt.b.w, tgt.b.h)) tgt = vv;
      }
      if (tgt && !kid) inp[0].target = { x: tgt.b.cx, y: tgt.b.cy };
      if (tgt && kid && wait < 0.6 && !pl.kidAim) pl.kidAim = { x: tgt.b.cx + (R() - 0.5) * pl.hw * 1.6, y: tgt.b.cy + (R() - 0.5) * pl.hh * 1.6 };
      if (kid && pl.kidAim && wait > 0.3) inp[0].target = pl.kidAim;
      if (tgt && wait <= 0) {
        const would = shot(ride, ride.cam, pl, level);
        if (kid || (would.sp === tgt.di.sp.id && would.stars >= (level === 'normal' ? 2 : 1))) { inp[0].snap = true; wait = kid ? 1.5 + R() * 1.5 : 0.8; pl.kidAim = null; }
      }
      stepRide(ride, 1 / 30, inp);
    }
    return ride;
  }

  function check() {
    const tests = [];
    const T = (name, ok, detail) => tests.push({ name, ok: !!ok, detail });
    // 1. every dinosaur findable, on both levels and three screen shapes, even if the jeep never slows down
    const need = { easy: { wide: [3, 3], phoneWide: [3, 3], phoneTall: [2, 2] }, normal: { wide: [2, 3], phoneWide: [2, 3], phoneTall: [1, 1] } };
    const finds = {};
    for (const level of ['easy', 'normal']) for (const vn of Object.keys(VIEWS)) {
      const f = findable(level, vn), [secs, stars] = need[level][vn];
      finds[level + ' ' + vn] = f;
      const bad = D.SPECIES.filter((sp) => f.out[sp.id].time < secs || f.out[sp.id].stars < stars);
      const shortest = D.SPECIES.map((sp) => [sp.id, f.out[sp.id].time]).sort((a, b) => a[1] - b[1])[0];
      T(`findable ${level} ${vn}`, f.done && !bad.length,
        bad.length ? 'not findable: ' + bad.map((sp) => `${sp.id} ${f.out[sp.id].time.toFixed(1)} s ${f.out[sp.id].stars}★`).join(', ')
          : `all ${D.SPECIES.length} kinds, each in view for ${secs}+ s with ${stars}★ possible (shortest: ${shortest[0]} ${shortest[1].toFixed(1)} s; ride ${f.t.toFixed(0)} s)`);
    }
    // 2. a photographer who aims at what it hasn't got fills the whole book, on both levels (NORMAL: within the film)
    for (const level of ['easy', 'normal']) {
      const r = botRide(level);
      const pl = r.players[0], got = Object.keys(pl.best);
      const three = got.filter((id) => pl.best[id].stars === 3).length;
      T(`book fills ${level}`, got.length === D.SPECIES.length, `${got.length}/${D.SPECIES.length} kinds (${three} with 3★) in ${pl.snaps} photos, ${r.t.toFixed(0)} s` + (got.length < D.SPECIES.length ? '; missing ' + D.SPECIES.filter((sp) => !pl.best[sp.id]).map((sp) => sp.id).join(' ') : ''));
    }
    // 3. photo scoring, in a little photo lab: one dinosaur, a camera at a known spot
    const lab = labTests();
    for (const t of lab) tests.push(t);
    // 4. on EASY a 5-year-old pressing the button whenever he sees a dinosaur beats Froggy
    let kidWins = 0, minGap = 1e9;
    for (let seed = 1; seed <= 12; seed++) {
      const r = botRide('easy', { kid: true, cpu: true, seed });
      const k = r.players[0].points, c = r.cpu.points;
      if (k > c) kidWins++;
      minGap = Math.min(minGap, k - c);
    }
    T('easy kid beats Froggy', kidWins === 12, `${kidWins}/12 rides (closest: ${minGap} points ahead)`);
    return { ok: tests.every((t) => t.ok), tests, finds };
  }

  function labTests() {
    const out = [];
    const T = (name, ok, detail) => out.push({ name, ok: !!ok, detail });
    const view = { W: 1200, H: 750, gutter: 0 };
    const cam = makeCam(0, 2, 0, 0, -1, 0, view.W / view.H);
    const fr = (x, y, zoom, lv) => Object.assign({ x, y }, frameRect(view, LV[lv || 'normal'], zoom));
    const dino = (id, x, z, h, o) => Object.assign({ k: 0, sp: D.SP[id], id, sc: 1, x, z, y: 0, y0: 0, h, act: false, hide: 0, baby: false, ax: x, az: z, s: 0 }, o || {});
    const lab = (dinos, trees) => ({ dinos, world: { trees: trees || [], rocks: [] } });
    const FACE = Math.PI / 2; // facing +z: toward the camera
    // where the trike fills about 70% of the frame
    const centreOf = (di) => { const b = dinoBox(cam, di); return { x: b.cx, y: b.cy }; };
    const trike = dino('trike', 0, -26, FACE + 0.9);
    const c = centreOf(trike);
    const perfect = shot(lab([trike]), cam, fr(c.x, c.y), 'normal');
    T('score: a big, centred dinosaur facing you gets 3★', perfect.stars === 3 && perfect.sp === 'trike', `${perfect.score} points, ${perfect.stars}★ ${JSON.stringify(perfect.parts)}`);
    const edge = shot(lab([trike]), cam, fr(c.x + fr(0, 0).hw * 1.4, c.y), 'normal');
    T('score: half out of the frame scores less', edge.score < perfect.score - 20 && edge.stars < perfect.stars, `${edge.score} points ${edge.stars}★ (centred ${perfect.score})`);
    const empty = shot(lab([trike]), cam, fr(c.x, 0.75), 'normal');
    T('score: a photo of the sky has no dinosaur', empty.stars === 0 && empty.sp === null && empty.why === 'empty', `${empty.score} points, why: ${empty.why}`);
    const far = dino('trike', 0, -190, FACE);
    const cf = centreOf(far);
    const farS = shot(lab([far]), cam, fr(cf.x, cf.y), 'normal');
    const farZ = shot(lab([far]), cam, fr(cf.x, cf.y, true), 'normal');
    T('score: a dinosaur far away gets at most 1★', farS.stars <= 1, `${farS.score} points ${farS.stars}★, size ${farS.parts ? farS.parts.size : '-'}, why: ${farS.why}`);
    T('score: zooming in on a far dinosaur scores more', farZ.score > farS.score, `zoomed ${farZ.score} vs ${farS.score}`);
    const back = shot(lab([dino('trike', 0, -26, -FACE + 0.9)]), cam, fr(c.x, c.y), 'normal');
    T('score: its tail end scores less than its face', back.score < perfect.score - 8, `back ${back.score} vs face ${perfect.score}`);
    const act = shot(lab([Object.assign({}, trike, { act: true })]), cam, fr(c.x, c.y), 'normal');
    T('score: snapping its special move gives a bonus', act.score > Math.min(85, perfect.score) && act.tag === 'MUNCH!', `${act.score} with "${act.tag}" vs ${perfect.score}`);
    const tree = { x: 0, z: -12, y: 0, r: 0.6, h: 5, cr: 3.5, cy: 3 };
    const hid = shot(lab([trike], [tree]), cam, fr(c.x, c.y), 'normal');
    T('score: a dinosaur behind a tree does not count', hid.stars === 0 && hid.why === 'blocked', `${hid.score} points, why: ${hid.why}`);
    // the Compsognathus hides in the grass until the jeep comes near, then peeks out
    const compy = dino('compy', 0, -5, FACE, { hide: 1, sp: D.SP.compy, clock: 0, phase: 0, move: 'popup' });
    const cl = lab([compy]);
    cl.cam = makeCam(0, 2, 300, 0, -1, 0, cam.aspect); // the jeep far away
    for (let i = 0; i < 30; i++) stepDino(compy, 1 / 30, cl);
    const cb = dinoBox(cam, Object.assign({}, compy, { hide: 0 })); // aim where it would stand
    const peek = shot(cl, cam, fr(cb.cx, cb.cy, true), 'easy');
    cl.cam = cam; // the jeep close by
    for (let i = 0; i < 30; i++) stepDino(compy, 1 / 30, cl);
    cl._bc = null;
    const up = shot(cl, cam, fr(cb.cx, cb.cy, true), 'easy');
    T('score: a dinosaur hiding in the grass does not count', peek.stars === 0 && up.stars >= 1, `hiding: ${peek.score} points (${peek.why}); peeking out: ${up.stars}★`);
    const behind = shot(lab([dino('trike', 0, 26, FACE)]), cam, fr(0, 0), 'easy');
    T('score: a dinosaur behind the camera does not count', behind.stars === 0, `${behind.score} points`);
    const two = shot(lab([trike, dino('trike', 7, -34, FACE, { k: 1, sc: 0.6 })]), cam, fr(c.x, c.y), 'normal');
    T('score: two of the same kind in one photo gives a bonus', two.score >= perfect.score && two.friends === 1, `${two.score} with ${two.friends} friend vs ${perfect.score}`);
    // EASY is kinder: never fewer stars than NORMAL for the same photo
    const R = rng(42);
    let kinder = true, worst = '';
    for (let i = 0; i < 300; i++) {
      const d = dino('stego', (R() - 0.5) * 40, -10 - R() * 80, R() * 6.28);
      const b = dinoBox(cam, d);
      if (!b) continue;
      const f = fr(b.cx + (R() - 0.5), b.cy + (R() - 0.5) * 0.6);
      const e = shot(lab([d]), cam, f, 'easy'), nn = shot(lab([d]), cam, f, 'normal');
      if (e.stars < nn.stars) { kinder = false; worst = `easy ${e.stars}★ vs normal ${nn.stars}★`; }
    }
    T('score: EASY never gives fewer stars than NORMAL', kinder, kinder ? '300 random photos' : worst);
    return out;
  }

  // proves the check can fail: break one rule at a time and see the check catch it
  function checkFails() {
    const cases = [
      ['hideRex', 'the T. rex lives far outside the valley', /findable/],
      ['treeWall', 'a big tree stands between the road and every dinosaur', /findable/],
      ['fastJeep', 'the jeep drives three times as fast', /findable easy/],
      ['noFrame', 'the score ignores where the frame is', /half out|sky/],
      ['noOcclusion', 'trees and rocks never hide anything', /behind a tree/],
      ['noFacing', 'which way it faces makes no difference', /tail end/],
      ['noHide', 'the Compsognathus never hides', /hiding/],
    ];
    const out = [];
    for (const [name, what, expect] of cases) {
      for (const k in SAB) delete SAB[k];
      SAB[name] = true;
      WORLD = null;
      const res = name === 'noFrame' || name === 'noOcclusion' || name === 'noFacing' || name === 'noHide' ? { tests: labTests() } : check();
      const failed = res.tests.filter((t) => !t.ok);
      const hit = failed.find((t) => expect.test(t.name));
      out.push({ sabotage: name, what, caught: !!hit, test: hit ? hit.name : failed.map((t) => t.name).join(', ') || '(nothing failed)', detail: hit ? hit.detail : '' });
    }
    for (const k in SAB) delete SAB[k];
    WORLD = null;
    return { ok: out.every((o) => o.caught), out };
  }

  D.sim = {
    LV, ZOOM, WATER, LEN, STEP, RX, RZ, rng, pathAt, beside, nearRoad, ground, zoneAt, world, buildWorld, camAt, makeCam, project, vfovFor,
    newRide, setView, stepRide, shot, frameRect, clampFrame, dinoBox, visible, buddyAim, pickTarget, check, checkFails, findable, botRide, labTests,
  };
})(typeof window !== 'undefined' ? window : globalThis);

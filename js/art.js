/* TT Dino Safari: the pictures. The valley (hills, the dirt road, lakes, trees, rocks, ferns, the volcano), the twelve
   dinosaurs built from balls, tubes and boxes, the jeep with Foxy driving and the photographers standing in the back,
   sparkles and splashes, and the camera. Where everything is comes from js/sim.js, so what you see is what the
   photo scoring sees. */
(function () {
  'use strict';
  const D = window.DINO, S = D.sim, T = THREE, G = Kit.gfx, L = Kit.lang;
  let renderer, scene, camera, sun, hemi;
  const fx = [];
  const signs = [];

  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.outputEncoding = T.sRGBEncoding;
    const dpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(Math.min(innerWidth * innerHeight * dpr * dpr > 3.6e6 ? 1.5 : 2, dpr));
    scene = new T.Scene();
    scene.background = skyTexture();
    scene.fog = new T.Fog('#d6eef2', 150, 560);
    hemi = new T.HemisphereLight('#ffffff', '#7a6a50', 0.82);
    scene.add(hemi);
    sun = new T.DirectionalLight('#fff4dc', 0.95);
    sun.position.set(-40, 90, 30);
    scene.add(sun);
    camera = new T.PerspectiveCamera(52, 1, 0.3, 1200);
    buildValley();
    L.onChange(drawSigns);
    return { renderer, scene };
  }

  // ---------- textures ----------
  function skyTexture() {
    const [c, g] = G.makeCanvas(4, 256);
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#5fb8ec');
    gr.addColorStop(0.55, '#a9dcf3');
    gr.addColorStop(1, '#e8f6ee');
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 256);
    return G.toTexture(c);
  }
  function roadTexture() {
    const [c, g] = G.makeCanvas(128, 256);
    g.fillStyle = '#d6b478';
    g.fillRect(0, 0, 128, 256);
    const R = S.rng(3);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = R() < 0.5 ? 'rgba(120,84,40,0.18)' : 'rgba(255,240,200,0.22)';
      g.fillRect(R() * 128, R() * 256, 1 + R() * 3, 1 + R() * 3);
    }
    // two tyre tracks
    g.fillStyle = 'rgba(110,76,36,0.28)';
    g.fillRect(26, 0, 16, 256);
    g.fillRect(86, 0, 16, 256);
    // grassy edges
    const eg = g.createLinearGradient(0, 0, 128, 0);
    eg.addColorStop(0, 'rgba(110,170,70,0.9)');
    eg.addColorStop(0.1, 'rgba(110,170,70,0)');
    eg.addColorStop(0.9, 'rgba(110,170,70,0)');
    eg.addColorStop(1, 'rgba(110,170,70,0.9)');
    g.fillStyle = eg;
    g.fillRect(0, 0, 128, 256);
    const t = G.toTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }

  // ---------- the valley ----------
  const ZCOL = { plains: '#93cf5c', forest: '#62a84a', lake: '#86c86a', hills: '#a9b46a', volcano: '#a8875e', rocks: '#b79e74' };
  function zoneColor(s, out) {
    const c = out.set(ZCOL[D.ZONES[0].id]);
    const tmp = new T.Color();
    for (let i = 1; i < D.ZONES.length; i++) {
      const z = D.ZONES[i], k = Math.min(1, Math.max(0, (s - (z.s - 25)) / 50));
      if (k > 0) c.lerp(tmp.set(ZCOL[z.id]), k);
    }
    return c;
  }
  function buildValley() {
    const W = S.world();
    // the land: a grid of heights from S.ground, coloured by the part of the valley and how high it is
    const X0 = -240, X1 = 260, Z0 = -960, Z1 = 160, STEP = 4;
    const nx = Math.round((X1 - X0) / STEP), nz = Math.round((Z1 - Z0) / STEP);
    const geo = new T.PlaneGeometry(X1 - X0, Z1 - Z0, nx, nz);
    geo.rotateX(-Math.PI / 2);
    geo.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
    const c = new T.Color(), rock = new T.Color('#9a8a6c'), sand = new T.Color('#dcc890'), dirt = new T.Color('#cfae74'), snow = new T.Color('#8f8a78');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), q = S.nearRoad(x, z);
      const h = S.ground(x, z, q);
      pos.setY(i, h);
      zoneColor(q.s, c);
      if (h > 5) c.lerp(rock, Math.min(1, (h - 5) / 14));
      if (h > 24) c.lerp(snow, Math.min(1, (h - 24) / 8));
      if (h < S.WATER + 0.5) c.lerp(sand, Math.min(1, (S.WATER + 0.5 - h) / 0.8 + 0.5));
      if (q.d < 5.5) c.lerp(dirt, 0.6);
      const n = 0.93 + 0.07 * Math.sin(x * 0.31 + z * 0.17) * Math.cos(z * 0.23 - x * 0.11);
      cols[i * 3] = c.r * n; cols[i * 3 + 1] = c.g * n; cols[i * 3 + 2] = c.b * n;
    }
    geo.setAttribute('color', new T.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    scene.add(new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })));

    // the dirt road, a ribbon laid on the land
    const rp = [], ru = [], ri = [];
    let n = 0;
    for (let s = 0; s <= S.LEN; s += 2, n++) {
      const p = S.pathAt(s);
      for (const side of [-1, 1]) {
        const x = p.x - p.tz * side * 3.4, z = p.z + p.tx * side * 3.4;
        rp.push(x, S.ground(x, z) + 0.06, z);
        ru.push(side < 0 ? 0 : 1, s / 7);
      }
      if (n) { const a = (n - 1) * 2; ri.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const rg = new T.BufferGeometry();
    rg.setAttribute('position', new T.Float32BufferAttribute(rp, 3));
    rg.setAttribute('uv', new T.Float32BufferAttribute(ru, 2));
    rg.setIndex(ri);
    rg.computeVertexNormals();
    const road = new T.Mesh(rg, new T.MeshStandardMaterial({ map: roadTexture(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
    scene.add(road);

    // lakes
    for (const lk of W.lakes) {
      const w = new T.Mesh(new T.CircleGeometry(lk.r + 2, 40), new T.MeshStandardMaterial({ color: '#3fa6d8', roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.86 }));
      w.rotation.x = -Math.PI / 2;
      w.position.set(lk.x, S.WATER, lk.z);
      scene.add(w);
      // lily pads
      const R = S.rng(Math.round(lk.r * 10));
      for (let i = 0; i < 8; i++) {
        const a = R() * 6.28, r = lk.r * (0.3 + R() * 0.55);
        const pad = new T.Mesh(new T.CircleGeometry(0.6 + R() * 0.4, 10), G.std('#4fae4a'));
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(lk.x + Math.cos(a) * r, S.WATER + 0.03, lk.z + Math.sin(a) * r);
        scene.add(pad);
      }
    }

    trees(W.trees);
    rocks(W.rocks);
    groundCover();
  }
  function trees(list) {
    const parts = {
      palmTrunk: { geo: new T.CylinderGeometry(0.22, 0.38, 1, 7), mat: G.std('#9a6a3e') },
      palmTop: { geo: new T.ConeGeometry(1, 0.55, 7), mat: G.std('#3f9e3e') },
      pineTrunk: { geo: new T.CylinderGeometry(0.25, 0.35, 1, 6), mat: G.std('#7a4f2e') },
      pineTop: { geo: new T.ConeGeometry(1, 2.2, 8), mat: G.std('#2f7d4a') },
      roundTrunk: { geo: new T.CylinderGeometry(0.3, 0.45, 1, 7), mat: G.std('#8a5a34') },
      roundTop: { geo: new T.IcosahedronGeometry(1, 1), mat: G.std('#4f9a3c', { flatShading: true }) },
      cycad: { geo: new T.ConeGeometry(1, 0.9, 8), mat: G.std('#5bb04a') },
      cycadTrunk: { geo: new T.CylinderGeometry(0.35, 0.45, 1, 7), mat: G.std('#8d6a3a') },
    };
    const buckets = {};
    const put = (k, m) => (buckets[k] = buckets[k] || []).push(m);
    const M = new T.Matrix4(), Q = new T.Quaternion(), P = new T.Vector3(), SC = new T.Vector3(), E = new T.Euler();
    const mk = (x, y, z, sx, sy, sz, ry, rx) => { E.set(rx || 0, ry || 0, 0); Q.setFromEuler(E); P.set(x, y, z); SC.set(sx, sy, sz); return M.clone().compose(P, Q, SC); };
    for (const t of list) {
      const th = t.h - t.y, ry = (t.x * 13.7 + t.z) % 6.28;
      if (t.kind === 'palm') {
        put('palmTrunk', mk(t.x, t.y + th / 2, t.z, t.big, th, t.big, 0, 0.06));
        for (let i = 0; i < 2; i++) put('palmTop', mk(t.x, t.h + i * 0.25, t.z, t.cr * (1 - i * 0.3), t.big * 1.1, t.cr * (1 - i * 0.3), ry + i));
      } else if (t.kind === 'pine') {
        put('pineTrunk', mk(t.x, t.y + th / 2, t.z, t.big, th, t.big));
        put('pineTop', mk(t.x, t.cy, t.z, t.cr, t.cr * 0.95, t.cr, ry));
        put('pineTop', mk(t.x, t.cy + t.cr * 0.9, t.z, t.cr * 0.7, t.cr * 0.7, t.cr * 0.7, ry));
      } else if (t.kind === 'cycad') {
        put('cycadTrunk', mk(t.x, t.y + th / 2, t.z, t.big, th, t.big));
        put('cycad', mk(t.x, t.h + 0.2, t.z, t.cr, t.big, t.cr, ry, Math.PI));
      } else {
        put('roundTrunk', mk(t.x, t.y + th / 2, t.z, t.big, th, t.big));
        put('roundTop', mk(t.x, t.cy, t.z, t.cr, t.cr * 0.85, t.cr, ry));
        put('roundTop', mk(t.x + t.cr * 0.5, t.cy - t.cr * 0.3, t.z + t.cr * 0.2, t.cr * 0.6, t.cr * 0.55, t.cr * 0.6, ry));
      }
    }
    for (const k in buckets) {
      const im = new T.InstancedMesh(parts[k].geo, parts[k].mat, buckets[k].length);
      buckets[k].forEach((m, i) => im.setMatrixAt(i, m));
      scene.add(im);
    }
  }
  function rocks(list) {
    const im = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), G.std('#9c9286', { flatShading: true }), list.length);
    const M = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler();
    list.forEach((r, i) => { E.set(r.x, r.z, 0); Q.setFromEuler(E); im.setMatrixAt(i, M.compose(new T.Vector3(r.x, r.y, r.z), Q, new T.Vector3(r.r, r.r * 0.8, r.r))); });
    scene.add(im);
  }
  // ferns, grass, flowers; the tall grass the Compsognathus hide in; the nest; the volcano; mountains; clouds; signs; camps
  function groundCover() {
    const R = S.rng(11);
    const fern = [], grass = [], flower = [];
    const M = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler();
    const add = (arr, x, y, z, s, sy, ry) => { E.set(0, ry, 0); Q.setFromEuler(E); arr.push(M.clone().compose(new T.Vector3(x, y, z), Q, new T.Vector3(s, sy, s))); };
    for (let s = 0; s < S.LEN; s += 1.2) {
      for (let k = 0; k < 3; k++) {
        const side = R() < 0.5 ? -1 : 1, d = 4.5 + R() * R() * 45, p = S.beside(s + R(), side, d), y = S.ground(p.x, p.z);
        if (y < S.WATER + 0.2) continue;
        const r = R();
        if (r < 0.45) add(grass, p.x, y, p.z, 0.25 + R() * 0.25, 0.5 + R() * 0.5, R() * 6);
        else if (r < 0.8) add(fern, p.x, y, p.z, 0.6 + R() * 0.7, 0.5 + R() * 0.4, R() * 6);
        else add(flower, p.x, y + 0.25, p.z, 0.14, 0.14, 0);
      }
    }
    // tall grass around the Compsognathus
    for (const sp of [D.SP.compy]) for (const o of sp.inst) {
      const a = S.beside(o.s, o.side, o.d);
      for (let i = 0; i < 70; i++) {
        const ang = R() * 6.28, r = Math.sqrt(R()) * 2.6, x = a.x + Math.cos(ang) * r, z = a.z + Math.sin(ang) * r;
        add(grass, x, S.ground(x, z), z, 0.22, 1.5 + R() * 0.5, R() * 6);
      }
    }
    const inst = (geo, mat, arr) => { const im = new T.InstancedMesh(geo, mat, arr.length); arr.forEach((m, i) => im.setMatrixAt(i, m)); scene.add(im); };
    inst(new T.ConeGeometry(0.5, 1, 4), G.std('#7fc45a', { flatShading: true }), grass);
    const fg = new T.ConeGeometry(1, 0.8, 6, 1, true);
    fg.translate(0, 0.4, 0);
    inst(fg, G.std('#3f9a46', { side: T.DoubleSide, flatShading: true }), fern);
    inst(new T.IcosahedronGeometry(1, 0), G.std('#ffd34a'), flower);

    // the Maiasaura's nest
    const ms = D.SP.maia;
    const babies = ms.inst.filter((o) => o.baby).map((o) => S.beside(o.s, o.side, o.d));
    const nx = babies.reduce((a, b) => a + b.x, 0) / babies.length, nz = babies.reduce((a, b) => a + b.z, 0) / babies.length;
    const nest = new T.Mesh(new T.TorusGeometry(1.6, 0.45, 8, 18), G.std('#8a6a40', { flatShading: true }));
    nest.rotation.x = -Math.PI / 2;
    nest.position.set(nx, S.ground(nx, nz) + 0.25, nz);
    scene.add(nest);
    for (let i = 0; i < 3; i++) {
      const e = new T.Mesh(new T.SphereGeometry(0.22, 10, 8), G.std('#f6f0e0'));
      e.scale.y = 1.3;
      e.position.set(nx + Math.cos(i * 2.1 + 1) * 0.9, S.ground(nx, nz) + 0.25, nz + Math.sin(i * 2.1 + 1) * 0.9);
      scene.add(e);
    }

    // mountains all round, and the volcano
    const mtn = G.std('#8f9a7c', { flatShading: true });
    for (let i = 0; i < 26; i++) {
      const s = (i / 26) * S.LEN, side = i % 2 ? 1 : -1, p = S.beside(s, side, 175 + (i * 37) % 60);
      const h = 40 + (i * 53) % 45, r = 55 + (i * 29) % 40;
      const m = new T.Mesh(new T.ConeGeometry(r, h, 7), mtn);
      m.position.set(p.x, h / 2 + 10, p.z);
      m.rotation.y = i;
      scene.add(m);
    }
    const vp = S.beside(690, 1, 190);
    const volcano = new T.Mesh(new T.CylinderGeometry(14, 70, 85, 12, 1, true), G.std('#7a5a48', { flatShading: true }));
    volcano.position.set(vp.x, 42, vp.z);
    scene.add(volcano);
    const lava = new T.Mesh(new T.CircleGeometry(14, 12), new T.MeshBasicMaterial({ color: '#ff6a2a' }));
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(vp.x, 84, vp.z);
    scene.add(lava);
    VOLCANO = { x: vp.x, y: 86, z: vp.z, t: 0 };

    // clouds
    const cm = new T.SpriteMaterial({ map: G.dotTexture(), color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false, fog: false });
    for (let i = 0; i < 26; i++) {
      const p = S.beside(R() * S.LEN, R() < 0.5 ? -1 : 1, 40 + R() * 220);
      for (let k = 0; k < 4; k++) {
        const c = new T.Sprite(cm);
        c.position.set(p.x + k * 9 - 13, 70 + R() * 30 + (k % 2) * 4, p.z + R() * 8);
        c.scale.set(26, 13, 1);
        scene.add(c);
      }
    }

    // a sign at the start of each part of the valley
    const post = G.std('#7a4f2e');
    for (const z of D.ZONES) {
      const p = S.beside(z.s + 8, -1, 5.2), y = S.ground(p.x, p.z), tp = S.pathAt(z.s + 8);
      const g = new T.Group();
      g.position.set(p.x, y, p.z);
      g.rotation.y = -Math.atan2(tp.tz, tp.tx) + Math.PI / 2 + 0.35;
      for (const sx of [-1.3, 1.3]) G.mesh(new T.BoxGeometry(0.18, 2.6, 0.18), post, sx, 1.3, 0, g, false);
      const [cv] = G.makeCanvas(512, 160);
      const tex = G.toTexture(cv);
      const board = G.mesh(new T.BoxGeometry(3.4, 1.1, 0.12), [post, post, post, post, new T.MeshStandardMaterial({ map: tex, roughness: 0.9 }), post], 0, 2.2, 0, g, false);
      void board;
      scene.add(g);
      signs.push({ cv, tex, zone: z });
    }
    drawSigns();

    // the camps at both ends of the road
    camp(0, false);
    camp(S.LEN - 1, true);
  }
  const ZEMO = { plains: '🌿', forest: '🌳', lake: '💧', hills: '⛰️', volcano: '🌋', rocks: '🪨' };
  function drawSigns() {
    for (const s of signs) {
      const g = s.cv.getContext('2d');
      g.fillStyle = '#f2d39a';
      g.fillRect(0, 0, 512, 160);
      g.strokeStyle = '#7a4f2e';
      g.lineWidth = 14;
      g.strokeRect(7, 7, 498, 146);
      g.font = `64px ${G.EMOJI_FONT}`;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(ZEMO[s.zone.id], 26, 84);
      g.fillStyle = '#4a2f18';
      const txt = L.t(s.zone.name);
      let fs = 54;
      g.font = `${fs}px ${G.FONT}`;
      while (g.measureText(txt).width > 380 && fs > 24) { fs -= 2; g.font = `${fs}px ${G.FONT}`; }
      g.fillText(txt, 110, 86);
      s.tex.needsUpdate = true;
    }
  }
  let VOLCANO = null;
  function camp(s, end) {
    const p = S.pathAt(s), g = new T.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = -Math.atan2(p.tz, p.tx);
    const tentM = [G.std('#ff8a3c', { flatShading: true }), G.std('#4ab0e8', { flatShading: true }), G.std('#ffd34a', { flatShading: true })];
    for (let i = 0; i < 3; i++) {
      const t = G.mesh(new T.ConeGeometry(2.4, 2.8, 4), tentM[i], (end ? 8 : -10) + i * 4.5, 1.4, (i % 2 ? 1 : -1) * 9, g, false);
      t.rotation.y = 0.8;
    }
    // an arch over the road with the game's name
    const wood = G.std('#7a4f2e');
    for (const z of [-4.2, 4.2]) G.mesh(new T.BoxGeometry(0.35, 5, 0.35), wood, end ? -7 : 2, 2.5, z, g, false);
    const [cv, cg] = G.makeCanvas(512, 96);
    cg.fillStyle = '#ffd400';
    cg.fillRect(0, 0, 512, 96);
    cg.strokeStyle = '#14121f';
    cg.lineWidth = 10;
    cg.strokeRect(5, 5, 502, 86);
    cg.fillStyle = '#14121f';
    cg.font = `52px ${G.FONT}`;
    cg.textAlign = 'center';
    cg.textBaseline = 'middle';
    cg.fillText((end ? '🏁 ' : '🦖 ') + D.TITLE, 256, 52);
    const ban = G.mesh(new T.BoxGeometry(0.2, 1.4, 8.4), [new T.MeshStandardMaterial({ map: G.toTexture(cv) }), new T.MeshStandardMaterial({ map: G.toTexture(cv) }), wood, wood, wood, wood], end ? -7 : 2, 4.6, 0, g, false);
    ban.material[0].map.center.set(0.5, 0.5);
    ban.material[1].map.center.set(0.5, 0.5);
    ban.material[1].map.repeat.set(-1, 1);
    // flags
    for (let i = 0; i < 6; i++) {
      const f = G.mesh(new T.ConeGeometry(0.3, 0.6, 3), tentM[i % 3], end ? -7 : 2, 4, -3.6 + i * 1.45, g, false);
      f.rotation.x = Math.PI;
    }
    scene.add(g);
  }

  // ---------- the dinosaurs ----------
  const SPH = new T.SphereGeometry(1, 14, 10), BOXG = new T.BoxGeometry(1, 1, 1), CONEG = new T.ConeGeometry(1, 1, 10);
  const WHITE = G.std('#ffffff', { roughness: 0.4 }), BLACK = G.std('#14121f', { roughness: 0.3 }), CREAM = G.std('#fff6dc');
  const V = (x, y, z) => new T.Vector3(x, y, z);
  function ell(p, m, x, y, z, rx, ry, rz) { const o = new T.Mesh(SPH, m); o.position.set(x, y, z); o.scale.set(rx, ry, rz); p.add(o); return o; }
  function box(p, m, x, y, z, sx, sy, sz) { const o = new T.Mesh(BOXG, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); p.add(o); return o; }
  function cone(p, m, x, y, z, r, h, rz, rx) { const o = new T.Mesh(CONEG, m); o.position.set(x, y, z); o.scale.set(r, h, r); o.rotation.set(rx || 0, 0, rz || 0); p.add(o); return o; }
  // a tube from a to b, radius ra at a and rb at b
  function rod(p, m, a, b, ra, rb) {
    const d = b.clone().sub(a), len = d.length();
    const o = new T.Mesh(new T.CylinderGeometry(rb, ra, len, 10), m);
    o.position.copy(a).addScaledVector(d, 0.5);
    o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    p.add(o);
    return o;
  }
  function pivot(p, x, y, z) { const g = new T.Group(); g.position.set(x, y, z); p.add(g); return g; }
  function eyes(head, x, y, z, r) {
    for (const s of [-1, 1]) {
      ell(head, WHITE, x, y, s * z, r, r, r * 0.8);
      ell(head, BLACK, x + r * 0.35, y + r * 0.1, s * (z + r * 0.5), r * 0.55, r * 0.6, r * 0.45);
      ell(head, WHITE, x + r * 0.55, y + r * 0.35, s * (z + r * 0.75), r * 0.16, r * 0.16, r * 0.12);
    }
  }
  function leg(p, m, x, z, len, th) {
    const g = pivot(p, x, len, z);
    ell(g, m, 0, -len * 0.25, 0, th * 1.15, len * 0.36, th);
    rod(g, m, V(0, -len * 0.45, 0), V(0, -len + th * 0.3, 0), th * 0.62, th * 0.5);
    box(g, m, th * 0.35, -len + th * 0.22, 0, th * 1.6, th * 0.44, th * 1.15);
    return g;
  }
  // a tail: a chain of tapering tubes going backwards (-x), each one a joint that can wag
  function tail(p, m, x, y, lens, rs, droop) {
    const segs = [];
    let par = p, px = x, py = y;
    lens.forEach((len, i) => {
      const g = pivot(par, px, py, 0);
      g.rotation.z = droop || 0;
      rod(g, m, V(0, 0, 0), V(-len, 0, 0), rs[i], rs[i + 1]);
      segs.push(g);
      par = g; px = -len; py = 0;
    });
    return segs;
  }
  function neck(p, m, x, y, ang, len, r0, r1) {
    const g = pivot(p, x, y, 0);
    g.rotation.z = ang;
    rod(g, m, V(0, 0, 0), V(len, 0, 0), r0, r1);
    const head = pivot(g, len, 0, 0);
    head.rotation.z = -ang;
    return { neck: g, head, ang };
  }

  const BUILD = {
    trex(M, B, St) {
      const g = new T.Group(), P = { legs: [], arms: [] };
      ell(g, M, 0.2, 3.0, 0, 2.6, 1.25, 1.05);
      ell(g, B, 0.6, 2.65, 0, 2.0, 0.85, 0.92);
      for (const z of [-0.8, 0.8]) P.legs.push(leg(g, M, -0.1, z, 2.6, 0.55));
      for (const z of [-0.6, 0.6]) P.arms.push(rod(g, M, V(2.2, 2.9, z), V(2.65, 2.45, z * 1.1), 0.13, 0.08));
      const n = neck(g, M, 2.4, 3.4, 0.35, 1.2, 0.72, 0.62);
      Object.assign(P, n);
      ell(n.head, M, 0.9, 0.15, 0, 1.2, 0.68, 0.62);
      box(n.head, M, 1.5, 0.05, 0, 1.3, 0.5, 0.9);
      P.jaw = pivot(n.head, 0.3, -0.3, 0);
      box(P.jaw, B, 0.85, -0.12, 0, 1.6, 0.26, 0.82);
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) cone(n.head, WHITE, 1.0 + i * 0.32, -0.27, s * 0.38, 0.07, 0.2, Math.PI);
      eyes(n.head, 1.05, 0.45, 0.5, 0.2);
      box(n.head, St, 1.0, 0.68, 0, 0.6, 0.12, 0.9);
      P.tail = tail(g, M, -2.3, 3.1, [1.7, 1.6, 1.5], [0.85, 0.6, 0.35, 0.08], 0.05);
      return [g, P];
    },
    trike(M, B, St) {
      const g = new T.Group(), P = { legs: [] };
      ell(g, M, -0.2, 1.75, 0, 2.3, 1.15, 1.2);
      ell(g, B, 0, 1.4, 0, 1.9, 0.8, 1.05);
      for (const [x, len, th] of [[1.4, 1.25, 0.4], [-1.5, 1.35, 0.5]]) for (const z of [-0.75, 0.75]) P.legs.push(leg(g, M, x, z, len, th));
      const n = neck(g, M, 2.0, 1.75, -0.15, 0.6, 0.62, 0.56);
      Object.assign(P, n);
      ell(n.head, M, 0.55, 0, 0, 0.75, 0.55, 0.55);
      cone(n.head, B, 1.35, -0.1, 0, 0.26, 0.5, -Math.PI / 2);
      const frill = new T.Mesh(new T.CylinderGeometry(1.25, 1.25, 0.14, 22), St);
      frill.rotation.z = Math.PI / 2 + 0.55;
      frill.position.set(0.05, 0.55, 0);
      n.head.add(frill);
      for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3; ell(n.head, B, 0.05 - Math.sin(0.55) * Math.cos(a) * 1.25 - 0.05, 0.55 + Math.cos(0.55) * Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0.14, 0.14, 0.14); }
      for (const s of [-1, 1]) cone(n.head, CREAM, 0.85, 0.48, s * 0.28, 0.13, 1.05, -1.1);
      cone(n.head, CREAM, 1.15, 0.35, 0, 0.1, 0.38, -0.45);
      eyes(n.head, 0.78, 0.22, 0.43, 0.13);
      P.tail = tail(g, M, -2.4, 1.8, [1.0, 0.9, 0.8], [0.6, 0.4, 0.22, 0.05], 0.12);
      return [g, P];
    },
    raptor(M, B, St) {
      const g = new T.Group(), P = { legs: [], arms: [] };
      ell(g, M, 0, 0.62, 0, 0.4, 0.2, 0.17);
      ell(g, B, 0.05, 0.55, 0, 0.32, 0.14, 0.14);
      for (const z of [-0.13, 0.13]) { const l = leg(g, M, -0.05, z, 0.55, 0.1); P.legs.push(l); cone(l, G.std('#e03a3a'), 0.12, -0.5, 0, 0.025, 0.09, -0.8); }
      for (const z of [-0.15, 0.15]) { P.arms.push(rod(g, M, V(0.28, 0.62, z), V(0.45, 0.5, z * 1.3), 0.05, 0.03)); box(g, St, 0.36, 0.52, z * 1.4, 0.2, 0.04, 0.14); }
      const n = neck(g, M, 0.32, 0.7, 0.9, 0.25, 0.08, 0.065);
      Object.assign(P, n);
      ell(n.head, M, 0.13, 0, 0, 0.17, 0.085, 0.08);
      box(n.head, B, 0.22, -0.04, 0, 0.16, 0.04, 0.1);
      eyes(n.head, 0.13, 0.04, 0.065, 0.035);
      for (let i = 0; i < 3; i++) box(n.head, St, 0.0 - i * 0.05, 0.08 + i * 0.015, 0, 0.06, 0.08, 0.02);
      P.tail = tail(g, M, -0.38, 0.66, [0.35, 0.35, 0.3], [0.12, 0.07, 0.04, 0.015], -0.03);
      box(P.tail[2], St, -0.25, 0, 0, 0.3, 0.03, 0.2);
      return [g, P];
    },
    brachio(M, B, St) {
      const g = new T.Group(), P = { legs: [] };
      const body = ell(g, M, 0, 5.4, 0, 3.8, 2.2, 1.9);
      body.rotation.z = 0.12;
      ell(g, B, 0.2, 4.6, 0, 3.0, 1.4, 1.6).rotation.z = 0.12;
      for (const [x, len, th] of [[2.4, 4.6, 0.75], [-2.2, 3.8, 0.85]]) for (const z of [-1.1, 1.1]) P.legs.push(leg(g, M, x, z, len, th));
      const n = neck(g, M, 3.0, 6.6, 1.05, 6.5, 0.8, 0.42);
      Object.assign(P, n);
      ell(n.head, M, 0.45, 0.1, 0, 0.75, 0.42, 0.42);
      ell(n.head, St, 0.25, 0.42, 0, 0.36, 0.3, 0.3);
      eyes(n.head, 0.55, 0.25, 0.32, 0.13);
      for (let i = 0; i < 6; i++) ell(g, St, 2.2 - i * 1.1, 7.45 - i * 0.15, 0, 0.35, 0.25, 0.3);
      P.tail = tail(g, M, -3.6, 5.6, [2.6, 2.4, 2.2], [1.1, 0.7, 0.35, 0.08], 0.12);
      return [g, P];
    },
    stego(M, B, St) {
      const g = new T.Group(), P = { legs: [] };
      const body = ell(g, M, 0, 2.3, 0, 2.4, 1.35, 1.15);
      body.rotation.z = -0.1;
      ell(g, B, 0.1, 1.85, 0, 2.0, 0.85, 1.0);
      for (const [x, len, th] of [[1.5, 1.3, 0.4], [-1.4, 1.9, 0.55]]) for (const z of [-0.75, 0.75]) P.legs.push(leg(g, M, x, z, len, th));
      const n = neck(g, M, 2.2, 1.95, -0.35, 0.9, 0.45, 0.3);
      Object.assign(P, n);
      ell(n.head, M, 0.35, 0, 0, 0.5, 0.3, 0.3);
      cone(n.head, B, 0.85, -0.05, 0, 0.14, 0.25, -Math.PI / 2);
      eyes(n.head, 0.45, 0.12, 0.24, 0.1);
      for (let i = 0; i < 9; i++) {
        const x = 1.7 - i * 0.5, k = 0.55 + 0.55 * Math.sin(Math.PI * (i + 0.5) / 9);
        const top = 2.3 + 1.35 * Math.sqrt(Math.max(0, 1 - (x / 2.4) ** 2)) - 0.1 * x / 2.4 * 2.4 * 0.1;
        const pl = box(g, St, x, top + 0.3 * k, (i % 2 ? 0.14 : -0.14), 0.8 * k, 0.8 * k, 0.08);
        pl.rotation.z = Math.PI / 4;
      }
      P.tail = tail(g, M, -2.3, 2.65, [1.2, 1.1, 1.0], [0.6, 0.4, 0.2, 0.05], 0.1);
      for (const [x, s] of [[-0.3, 1], [-0.3, -1], [-0.75, 1], [-0.75, -1]]) cone(P.tail[2], CREAM, x, 0.15, s * 0.12, 0.08, 0.8, 0.5, s * 1.0);
      return [g, P];
    },
    pachy(M, B, St) {
      const g = new T.Group(), P = { legs: [], arms: [] };
      ell(g, M, 0, 1.25, 0, 0.95, 0.55, 0.45).rotation.z = 0.15;
      ell(g, B, 0.1, 1.1, 0, 0.75, 0.4, 0.4);
      for (const z of [-0.3, 0.3]) P.legs.push(leg(g, M, -0.1, z, 1.0, 0.25));
      for (const z of [-0.3, 0.3]) P.arms.push(rod(g, M, V(0.6, 1.3, z), V(0.8, 1.05, z * 1.2), 0.08, 0.05));
      const n = neck(g, M, 0.8, 1.45, 0.6, 0.4, 0.26, 0.24);
      Object.assign(P, n);
      ell(n.head, M, 0.25, 0, 0, 0.36, 0.28, 0.3);
      ell(n.head, St, 0.12, 0.2, 0, 0.38, 0.34, 0.36);
      for (let i = 0; i < 7; i++) { const a = -1.4 + i * 0.47; cone(n.head, B, -0.12 + Math.cos(a) * 0.05, 0.12, Math.sin(a) * 0.36, 0.05, 0.14, 0.4, Math.sin(a) * 1.2); }
      eyes(n.head, 0.35, 0.06, 0.24, 0.09);
      P.tail = tail(g, M, -0.9, 1.25, [0.6, 0.6, 0.5], [0.35, 0.2, 0.1, 0.03], 0.08);
      return [g, P];
    },
    spino(M, B, St) {
      const g = new T.Group(), P = { legs: [], arms: [] };
      ell(g, M, 0, 3.0, 0, 2.6, 1.15, 0.95).rotation.z = 0.08;
      ell(g, B, 0.3, 2.7, 0, 2.0, 0.8, 0.85);
      const sail = new T.Mesh(new T.CircleGeometry(2.3, 18, 0, Math.PI), new T.MeshStandardMaterial({ color: St.color, side: T.DoubleSide, roughness: 0.7 }));
      sail.scale.x = 1.25;
      sail.position.set(-0.3, 3.7, 0);
      g.add(sail);
      for (let i = 0; i < 7; i++) { const a = 0.25 + i * 0.44; rod(g, B, V(-0.3, 3.7, 0), V(-0.3 + Math.cos(a) * 2.8, 3.7 + Math.sin(a) * 2.2, 0), 0.06, 0.03); }
      for (const z of [-0.7, 0.7]) P.legs.push(leg(g, M, -0.4, z, 2.3, 0.5));
      for (const z of [-0.55, 0.55]) P.arms.push(rod(g, M, V(1.9, 2.8, z), V(2.4, 2.1, z * 1.1), 0.16, 0.1));
      const n = neck(g, M, 2.4, 3.5, 0.45, 1.1, 0.55, 0.42);
      Object.assign(P, n);
      ell(n.head, M, 0.9, 0.05, 0, 1.4, 0.36, 0.35);
      P.jaw = pivot(n.head, 0.2, -0.15, 0);
      box(P.jaw, B, 0.95, -0.08, 0, 1.8, 0.16, 0.42);
      eyes(n.head, 0.45, 0.28, 0.28, 0.13);
      P.tail = tail(g, M, -2.5, 3.0, [1.8, 1.8, 1.7], [0.75, 0.5, 0.3, 0.06], 0.06);
      return [g, P];
    },
    para(M, B, St, o) {
      const g = new T.Group(), P = { legs: [], arms: [] };
      ell(g, M, 0, 2.4, 0, 2.2, 1.15, 1.0).rotation.z = 0.12;
      ell(g, B, 0.2, 2.05, 0, 1.8, 0.8, 0.88);
      for (const z of [-0.65, 0.65]) P.legs.push(leg(g, M, -0.3, z, 1.8, 0.5));
      for (const z of [-0.5, 0.5]) P.arms.push(rod(g, M, V(1.6, 2.4, z), V(2.0, 1.6, z * 1.1), 0.15, 0.1));
      const n = neck(g, M, 2.0, 2.9, 0.7, 1.1, 0.5, 0.36);
      Object.assign(P, n);
      ell(n.head, M, 0.45, 0, 0, 0.6, 0.35, 0.33);
      ell(n.head, CREAM, 1.0, -0.12, 0, 0.38, 0.14, 0.3);
      eyes(n.head, 0.55, 0.15, 0.27, 0.12 * (o.baby ? 1.5 : 1));
      if (!o.noCrest) {
        rod(n.head, St, V(0.25, 0.25, 0), V(-1.3, 1.1, 0), 0.15, 0.13);
        ell(n.head, St, -1.3, 1.1, 0, 0.14, 0.14, 0.14);
        P.crestTip = V(-1.3, 1.1, 0);
      } else ell(n.head, St, 0.4, 0.35, 0, 0.22, 0.12, 0.1);
      P.tail = tail(g, M, -2.2, 2.55, [1.3, 1.2, 1.0], [0.6, 0.4, 0.2, 0.05], 0.1);
      return [g, P];
    },
    maia(M, B, St, o) { return BUILD.para(M, B, St, Object.assign({ noCrest: true }, o)); },
    ankylo(M, B, St) {
      const g = new T.Group(), P = { legs: [] };
      ell(g, M, 0, 1.3, 0, 2.2, 0.8, 1.35);
      ell(g, B, 0.1, 1.0, 0, 1.9, 0.5, 1.15);
      for (let x = -1.6; x <= 1.65; x += 0.55) for (let z = -1.0; z <= 1.01; z += 0.5) {
        const e = (x / 2.2) ** 2 + (z / 1.35) ** 2;
        if (e > 0.85) continue;
        cone(g, St, x, 1.3 + 0.8 * Math.sqrt(1 - e) - 0.02, z, 0.13, 0.26);
      }
      for (let x = -1.4; x <= 1.5; x += 0.7) for (const s of [-1, 1]) cone(g, CREAM, x, 1.2, s * 1.3, 0.1, 0.4, 0, s * Math.PI / 2);
      for (const [x, len] of [[1.3, 0.8], [-1.3, 0.85]]) for (const z of [-0.8, 0.8]) P.legs.push(leg(g, M, x, z, len, 0.35));
      const n = neck(g, M, 2.0, 1.2, -0.1, 0.4, 0.45, 0.42);
      Object.assign(P, n);
      ell(n.head, M, 0.35, 0, 0, 0.55, 0.38, 0.55);
      for (const s of [-1, 1]) cone(n.head, CREAM, 0.05, 0.2, s * 0.5, 0.08, 0.3, 0, s * 1.4);
      eyes(n.head, 0.55, 0.12, 0.4, 0.11);
      P.tail = tail(g, M, -2.1, 1.3, [1.0, 0.9, 0.8], [0.45, 0.3, 0.18, 0.12], 0.05);
      for (const s of [-1, 1]) ell(P.tail[2], St, -0.85, 0, s * 0.25, 0.4, 0.3, 0.32);
      return [g, P];
    },
    ptera(M, B, St) {
      const g = new T.Group(), P = { wings: [] };
      ell(g, M, 0, 0.5, 0, 0.55, 0.22, 0.22);
      ell(g, M, 0.75, 0.62, 0, 0.25, 0.17, 0.15);
      cone(g, CREAM, 1.25, 0.58, 0, 0.09, 0.8, -Math.PI / 2);
      cone(g, St, 0.45, 0.78, 0, 0.08, 0.75, Math.PI / 2 + 0.5);
      eyes(g, 0.85, 0.7, 0.11, 0.06);
      const wm = new T.MeshStandardMaterial({ color: St.color, side: T.DoubleSide, roughness: 0.7 });
      for (const s of [-1, 1]) {
        const w = pivot(g, 0.15, 0.58, s * 0.18);
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.Float32BufferAttribute([0.45, 0, 0, -0.65, 0, 0, -0.15, 0, s * 3.2, 0.45, 0, 0, -0.15, 0, s * 3.2, 0.3, 0, s * 1.6], 3));
        geo.computeVertexNormals();
        w.add(new T.Mesh(geo, wm));
        P.wings.push(w);
      }
      return [g, P];
    },
    compy(M, B, St) {
      const g = new T.Group(), P = { legs: [] };
      ell(g, M, 0, 0.38, 0, 0.3, 0.15, 0.13);
      for (let i = 0; i < 3; i++) box(g, St, -0.12 + i * 0.12, 0.52, 0, 0.05, 0.03, 0.12);
      for (const z of [-0.07, 0.07]) P.legs.push(leg(g, M, -0.02, z, 0.33, 0.06));
      const n = neck(g, M, 0.25, 0.45, 0.9, 0.15, 0.06, 0.05);
      Object.assign(P, n);
      ell(n.head, M, 0.1, 0, 0, 0.13, 0.07, 0.07);
      eyes(n.head, 0.11, 0.03, 0.055, 0.035);
      P.tail = tail(g, M, -0.28, 0.42, [0.25, 0.25, 0.2], [0.08, 0.05, 0.03, 0.01], 0.05);
      return [g, P];
    },
  };

  const models = [];
  function makeDinoModel(sp, o) {
    o = o || {};
    const M = G.std(sp.color), B = G.std(sp.belly), St = G.std(sp.stripe);
    const [g, P] = BUILD[sp.id](M, B, St, o);
    if (o.baby) { const h = P.head; if (h) h.scale.setScalar(1.35); }
    // centre it on the box the rules use (js/sim.js): nose to tail around 0, feet (or belly) at 0
    const bb = new T.Box3().setFromObject(g);
    g.position.set(-(bb.min.x + bb.max.x) / 2, -bb.min.y, 0);
    const root = new T.Group();
    root.add(g);
    // a soft shadow on the ground
    const shadow = new T.Mesh(new T.CircleGeometry(1, 16), new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.2, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(sp.L * 0.42, sp.W * 0.5 + 0.2, 1);
    shadow.renderOrder = 1;
    return { root, g, P, shadow, sp, ph: Math.random() * 6, t: 0, nb: P.neck ? P.neck.rotation.z : 0, hb: P.head ? P.head.rotation.z : 0, star: null, wasAct: false };
  }
  // the dinosaurs of a ride
  function setDinos(dinos) {
    for (const m of models) { scene.remove(m.root); scene.remove(m.shadow); }
    models.length = 0;
    for (const di of dinos) {
      const m = makeDinoModel(di.sp, { baby: di.baby });
      m.root.scale.setScalar(di.sc);
      m.shadow.scale.multiplyScalar(di.sc);
      m.star = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture('✨'), depthWrite: false, transparent: true }));
      m.star.visible = false;
      scene.add(m.star);
      scene.add(m.root);
      if (di.sp.move !== 'fly') scene.add(m.shadow);
      models.push(m);
    }
  }
  const _v = new T.Vector3();
  function headWorld(m, out) { if (!m.P.head) return m.root.getWorldPosition(out); m.P.head.updateWorldMatrix(true, false); return m.P.head.localToWorld(out.set(0.6, 0.1, 0)); }
  function updateDinos(dinos, dt) {
    dinos.forEach((di, i) => {
      const m = models[i];
      if (!m) return;
      const sp = di.sp, P = m.P;
      m.t += dt;
      const sink = di.hide * sp.H * di.sc * 1.15;
      m.root.position.set(di.x, di.y - sink, di.z);
      m.root.rotation.y = -di.h;
      m.root.visible = di.hide < 0.98;
      m.shadow.position.set(di.x, S.ground(di.x, di.z) + 0.05, di.z);
      m.shadow.visible = di.hide < 0.5 && di.y < S.ground(di.x, di.z) + 1;
      // walking
      const legLen = sp.H * 0.35;
      m.ph += dt * di.spd * 2.4 / Math.max(0.2, legLen * di.sc) * 0.5;
      const sw = Math.min(1, di.spd * 0.8) * (sp.move === 'circle' ? 0.8 : 0.45);
      (P.legs || []).forEach((l, k) => { l.rotation.z = Math.sin(m.ph + (k % 2 ? Math.PI : 0) + (k >= 2 ? Math.PI : 0)) * sw; });
      (P.tail || []).forEach((s, k) => { s.rotation.y = Math.sin(m.t * 1.7 + k * 0.7) * 0.12; });
      const act = di.act, a = di.actT;
      let nz = 0, hz = 0, jaw = 0;
      if (sp.id === 'trex') { if (act) { nz = 0.35; hz = 0.25 + Math.sin(a * 30) * 0.03; jaw = 0.65; } else hz = Math.sin(m.t * 1.3) * 0.04; }
      else if (sp.id === 'trike') { nz = act ? -0.45 : 0; hz = act ? -0.25 + Math.sin(a * 9) * 0.06 : Math.sin(m.t) * 0.05; }
      else if (sp.id === 'brachio') { nz = act ? 0.22 : Math.sin(m.t * 0.5) * 0.04; hz = act ? Math.sin(a * 8) * 0.12 : 0; }
      else if (sp.id === 'stego') { if (act) (P.tail || []).forEach((s, k) => { s.rotation.y = Math.sin(a * 7) * (0.35 + k * 0.15); }); }
      else if (sp.id === 'ankylo') { if (act) (P.tail || []).forEach((s, k) => { s.rotation.y = Math.sin(a * 6) * (0.3 + k * 0.2); }); }
      else if (sp.id === 'pachy') { nz = di.spd > 3 || act ? -0.5 : 0; hz = -0.35 * (di.spd > 3 || act ? 1 : 0); }
      else if (sp.id === 'spino') { const d = act ? Math.sin(Math.PI * Math.min(1, a / sp.lasts)) : 0; nz = -0.7 * d; hz = -0.5 * d; jaw = act ? 0.3 : 0; }
      else if (sp.id === 'para') { nz = act ? 0.35 : 0; hz = act ? 0.3 : 0; }
      else if (sp.id === 'maia') { if (!di.baby) { nz = act ? -0.55 : 0; hz = act ? -0.2 : 0; } else hz = Math.sin(m.t * 3 + i) * 0.1; }
      else if (sp.id === 'compy' || sp.id === 'raptor') { hz = Math.sin(m.t * 4 + i) * 0.1; if (sp.id === 'raptor' && act) (P.legs || []).forEach((l) => { l.rotation.z = 0.7; }); }
      if (P.neck) P.neck.rotation.z += (m.nb + nz - P.neck.rotation.z) * Math.min(1, dt * 6);
      if (P.head) P.head.rotation.z += (m.hb + hz - P.head.rotation.z) * Math.min(1, dt * 8);
      if (P.jaw) P.jaw.rotation.z += (-jaw - P.jaw.rotation.z) * Math.min(1, dt * 10);
      if (P.wings) {
        const flap = act ? 0.15 : Math.sin(m.t * 5 + i) * 0.55;
        P.wings[0].rotation.x = -flap; P.wings[1].rotation.x = flap;
        m.root.rotation.z = act ? -0.3 : 0;
        m.g.rotation.x = 0.25; // banking into the turn
      }
      // the sparkle that says "snap now!", and the special move's splash, notes or stars
      m.star.visible = act && di.hide < 0.5;
      if (m.star.visible) {
        const top = di.y + sp.H * di.sc + 0.6 + di.sc * 0.4;
        m.star.position.set(di.x, top, di.z);
        const k = (0.9 + 0.25 * Math.sin(m.t * 10)) * Math.max(0.9, sp.H * di.sc * 0.28);
        m.star.scale.set(k, k, 1);
      }
      if (act && !m.wasAct) {
        const hp = headWorld(m, _v);
        if (sp.id === 'spino') { puff(hp.x, S.WATER + 0.3, hp.z, '#ffffff', 14, 2.5); later(0.8, () => { const q = headWorld(m, _v); toss('🐟', { x: q.x, y: q.y, z: q.z }, { x: q.x, y: q.y + 1.5, z: q.z }, 0.6); }); }
        else if (sp.id === 'para') for (let k = 0; k < 3; k++) later(k * 0.4, () => { const q = headWorld(m, _v); floatUp(k % 2 ? '🎵' : '🎶', q.x, q.y + 1, q.z, 1.2); });
        else if (sp.id === 'pachy' && di.pair === 0) later(0.05, () => { const q = headWorld(m, _v); floatUp('💫', q.x, q.y + 0.8, q.z, 1.1); });
        else if (sp.id === 'trex') { puff(hp.x, hp.y, hp.z, '#ffffff', 8, 1.8); }
        else if (sp.id === 'brachio') for (let k = 0; k < 4; k++) later(k * 0.5, () => { const q = headWorld(m, _v); floatUp('🍃', q.x, q.y, q.z, 1); });
        else if (sp.id === 'compy') puff(di.x, di.y + 0.2, di.z, '#a6e07a', 6, 0.8);
      }
      m.wasAct = act;
    });
  }
  const timers = [];
  function later(sec, fn) { timers.push({ t: sec, fn }); }

  // ---------- the jeep and the people in it ----------
  const LOOKS = {
    foxy: { head: 'human', skin: '#ff8a3c', top: '#2f6bff', bottom: '#1d2a55', shoes: '#14121f', shirt: 'jacket', print: 'star' },
    froggy: { head: 'human', skin: '#69c94e', top: '#ffd400', bottom: '#2f7d4f', shoes: '#14121f', shirt: 'jacket', print: 'bolt' },
  };
  // a fox's or a frog's head in place of the boy's (from TT BMX)
  function animalHead(kind, head) {
    head.children.forEach((c) => { c.visible = false; });
    const fur = G.std(kind === 'foxy' ? '#ff8a3c' : '#69c94e'), dark = G.std('#1b1a22'), white = G.std('#ffffff');
    const bx = (w, h, d, m, x, y, z) => G.mesh(new T.BoxGeometry(w, h, d), m, x, y, z, head, false);
    bx(0.54, 0.48, 0.48, fur, 0, 0, 0);
    for (const s of [-1, 1]) {
      bx(0.08, 0.1, 0.03, dark, s * 0.12, 0.06, -0.25);
      bx(0.03, 0.03, 0.02, white, s * 0.1, 0.09, -0.27);
      if (kind === 'foxy') {
        bx(0.17, 0.17, 0.07, fur, s * 0.19, 0.27, 0).rotation.z = Math.PI / 4;
        bx(0.09, 0.09, 0.02, dark, s * 0.19, 0.27, -0.04).rotation.z = Math.PI / 4;
      } else {
        bx(0.17, 0.13, 0.17, fur, s * 0.15, 0.27, -0.06);
        bx(0.08, 0.08, 0.03, dark, s * 0.15, 0.29, -0.15);
        bx(0.035, 0.035, 0.02, white, s * 0.14, 0.31, -0.17);
      }
    }
    if (kind === 'foxy') {
      bx(0.24, 0.16, 0.14, G.std('#fff1e0'), 0, -0.1, -0.29);
      bx(0.08, 0.06, 0.04, dark, 0, -0.05, -0.37);
    } else bx(0.36, 0.04, 0.02, G.std('#2a6a1f'), 0, -0.12, -0.245);
    // a safari hat
    bx(0.7, 0.05, 0.64, G.std('#d9c38a'), 0, 0.25, 0);
    bx(0.5, 0.16, 0.46, G.std('#d9c38a'), 0, 0.33, 0);
  }
  function person(id, scale) {
    const look = LOOKS[id] || Kit.roster.get(id).look;
    const p = Kit.people.build(Object.assign({}, look, { peace: true }));
    if (LOOKS[id]) animalHead(id, p.head);
    p.root.scale.setScalar(scale);
    return p;
  }
  function photoCamera() {
    const c = new T.Group();
    box(c, G.std('#22212a'), 0, 0, 0, 0.34, 0.22, 0.16);
    const lens = new T.Mesh(new T.CylinderGeometry(0.08, 0.09, 0.14, 12), G.std('#3a3946'));
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0, -0.14);
    c.add(lens);
    box(c, G.std('#ffd400'), 0.1, 0.13, 0, 0.08, 0.04, 0.06);
    return c;
  }
  let jeep = null;
  function makeJeep() {
    const g = new T.Group(), body = new T.Group();
    g.add(body);
    const paint = G.std('#f2c230'), dark = G.std('#2d2b33'), trim = G.std('#3f8a3a'), seat = G.std('#8a4f2e'), glass = new T.MeshStandardMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.45, roughness: 0.1 });
    box(body, dark, 0, 0.55, 0, 4.2, 0.25, 1.9);
    box(body, paint, 0, 0.95, 0, 4.0, 0.6, 2.0);
    box(body, trim, 0, 1.0, 1.01, 4.0, 0.14, 0.02);
    box(body, trim, 0, 1.0, -1.01, 4.0, 0.14, 0.02);
    box(body, paint, 1.45, 1.35, 0, 1.1, 0.22, 1.9); // the bonnet
    box(body, dark, 2.02, 1.0, 0, 0.06, 0.5, 1.5); // grille
    for (const z of [-0.65, 0.65]) ell(body, G.std('#fffbe0', { emissive: '#665c20' }), 2.04, 1.12, z, 0.06, 0.13, 0.13);
    box(body, dark, 0.86, 1.75, 0, 0.08, 0.7, 1.9); // windscreen frame
    box(body, glass, 0.88, 1.75, 0, 0.03, 0.6, 1.7);
    for (const z of [-0.9, 0.9]) box(body, dark, -1.2, 2.0, z, 0.1, 1.4, 0.1); // roll bar
    box(body, dark, -1.2, 2.68, 0, 0.1, 0.1, 1.9);
    for (const [x, z] of [[0.2, -0.45], [0.2, 0.45]]) { box(body, seat, x, 1.32, z, 0.6, 0.18, 0.7); box(body, seat, x - 0.3, 1.65, z, 0.12, 0.6, 0.7); }
    box(body, seat, -1.2, 1.32, 0, 0.9, 0.12, 1.8); // the back, where the photographers stand
    const steer = new T.Mesh(new T.TorusGeometry(0.2, 0.035, 6, 14), dark);
    steer.position.set(0.62, 1.7, -0.45);
    steer.rotation.y = Math.PI / 2;
    steer.rotation.x = 0.4;
    body.add(steer);
    const spare = new T.Mesh(new T.TorusGeometry(0.36, 0.16, 8, 16), dark);
    spare.position.set(-2.12, 1.1, 0);
    spare.rotation.y = Math.PI / 2;
    body.add(spare);
    // a little flag on an aerial
    rod(body, dark, V(-1.7, 1.2, -0.95), V(-1.7, 2.9, -0.95), 0.025, 0.02);
    const flag = box(body, G.std('#ff3d7f'), -1.85, 2.75, -0.95, 0.3, 0.2, 0.02);
    const wheels = [];
    const wg = new T.CylinderGeometry(0.46, 0.46, 0.36, 16), hub = G.std('#d0d0d0');
    for (const [x, z] of [[1.35, -1.0], [1.35, 1.0], [-1.35, -1.0], [-1.35, 1.0]]) {
      const w = new T.Group();
      w.position.set(x, 0.46, z);
      const tyre = new T.Mesh(wg, dark);
      tyre.rotation.x = Math.PI / 2;
      w.add(tyre);
      box(w, hub, 0, 0, z > 0 ? 0.19 : -0.19, 0.3, 0.3, 0.02);
      g.add(w);
      wheels.push(w);
    }
    const shadow = new T.Mesh(new T.CircleGeometry(1, 20), new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.25, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(2.6, 1.4, 1);
    shadow.position.y = 0.08;
    g.add(shadow);
    scene.add(g);
    jeep = { g, body, wheels, flag, crew: {}, roll: 0 };
    return jeep;
  }
  // who rides: 1 player: Foxy drives, the photographer stands at the back on the left and Froggy on the right.
  // 2 players: Teddy and Tommy at the back.
  const SPOTS = { driver: [0.25, 1.05, -0.45], back0: [-1.15, 1.38, -0.5], back1: [-1.15, 1.38, 0.5], hood: [1.45, 1.47, 0], tail: [-1.85, 1.38, 0] };
  function setCrew(list) {
    if (!jeep) makeJeep();
    for (const k in jeep.crew) jeep.body.remove(jeep.crew[k].p.root);
    jeep.crew = {};
    for (const c of list) {
      const sc = c.id === 'tommy' ? 0.52 : c.id === 'teddy' ? 0.6 : 0.58;
      const p = person(c.id, sc);
      const at = SPOTS[c.spot];
      p.root.position.set(at[0], at[1] - (c.spot === 'driver' ? 0.0 : 0), at[2]);
      p.root.rotation.y = -Math.PI / 2;
      let cam = null;
      if (c.camera) { cam = photoCamera(); cam.position.set(0, 0.02, -0.42); cam.scale.setScalar(1.25); p.head.add(cam); }
      jeep.body.add(p.root);
      jeep.crew[c.key || c.id] = { id: c.id, p, spot: c.spot, cam, sc, ph: 0 };
      if (c.spot === 'driver') { p.legL.rotation.x = p.legR.rotation.x = 1.5; p.armL.rotation.x = p.armR.rotation.x = 1.25; p.root.position.y = at[1] - 0.48 * sc / 0.58; }
    }
    return jeep.crew;
  }
  function placeJeep(s, v, dt) {
    const p = S.pathAt(s), q = S.pathAt(Math.min(S.LEN, s + 2));
    const h = Math.atan2(q.z - p.z + (q.z - p.z === 0 ? p.tz : 0), q.x - p.x + (q.x - p.x === 0 ? p.tx : 0));
    jeep.g.position.set(p.x, S.ground(p.x, p.z) + 0.02, p.z);
    jeep.g.rotation.y = -h;
    jeep.roll += v * dt / 0.46;
    for (const w of jeep.wheels) w.rotation.z = -jeep.roll;
    jeep.body.position.y = Math.abs(Math.sin(jeep.roll * 0.7)) * 0.04 * Math.min(1, v / 3);
    jeep.flag.rotation.y = Math.sin(performance.now() * 0.006) * 0.3;
  }
  // a photographer turns to look through his camera at the frame
  function aimPerson(c, fx, fy, cam, k) {
    const yaw = Math.atan(fx * Math.tan(cam.vfov / 2) * cam.aspect), pitch = Math.atan(fy * Math.tan(cam.vfov / 2)) - 0.05;
    const p = c.p;
    p.root.rotation.y += ((-Math.PI / 2 - yaw * 0.95) - p.root.rotation.y) * k;
    p.head.rotation.x += (-pitch * 0.7 - p.head.rotation.x) * k;
    p.armL.rotation.x += (1.95 - p.armL.rotation.x) * k;
    p.armR.rotation.x += (1.95 - p.armR.rotation.x) * k;
    p.armL.rotation.z += (0.42 - p.armL.rotation.z) * k;
    p.armR.rotation.z += (-0.42 - p.armR.rotation.z) * k;
    p.hips.rotation.x += (-0.05 - p.hips.rotation.x) * k;
    if (c.cam) c.cam.visible = true;
  }

  // ---------- effects ----------
  function sprite(emoji, x, y, z, size) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture(emoji), depthWrite: false, transparent: true }));
    s.position.set(x, y, z);
    s.scale.set(size, size, 1);
    scene.add(s);
    return s;
  }
  function drop(o) { scene.remove(o); if (o.material) o.material.dispose(); }
  function puff(x, y, z, color, n, spread) {
    const mat = new T.SpriteMaterial({ map: G.dotTexture(), color, transparent: true, depthWrite: false });
    for (let i = 0; i < n; i++) {
      const s = new T.Sprite(mat.clone());
      s.position.set(x, y, z);
      const k = 0.4 + Math.random() * 0.5;
      s.scale.set(k * spread * 0.5, k * spread * 0.5, 1);
      scene.add(s);
      fx.push({ obj: s, vx: (Math.random() - 0.5) * spread * 2, vy: Math.random() * spread * 1.5, vz: (Math.random() - 0.5) * spread * 2, life: 0.8, max: 0.8, grav: -3, fade: true, grow: 1.6 });
    }
  }
  function confetti(x, y, z, n) {
    const cols = ['#ffd400', '#ff3d7f', '#18d4ff', '#7ed957', '#ff8a1f', '#9b6bff'];
    for (let i = 0; i < n; i++) {
      const m = new T.Mesh(new T.PlaneGeometry(0.16, 0.24), new T.MeshBasicMaterial({ color: cols[i % cols.length], side: T.DoubleSide, transparent: true }));
      m.position.set(x, y, z);
      scene.add(m);
      fx.push({ obj: m, vx: (Math.random() - 0.5) * 7, vy: 4 + Math.random() * 6, vz: (Math.random() - 0.5) * 7, life: 2.4, max: 2.4, grav: 7, spin: 8, fade: true });
    }
  }
  function floatUp(emoji, x, y, z, size) {
    const s = sprite(emoji, x, y, z, size);
    fx.push({ obj: s, vx: (Math.random() - 0.5) * 0.6, vy: 1.6, vz: (Math.random() - 0.5) * 0.6, life: 1.4, max: 1.4, grav: 0, fade: true });
  }
  // something flying in an arc from one place to another (the brother's treat)
  function toss(emoji, from, to, dur, onLand) {
    const s = sprite(emoji, from.x, from.y, from.z, 0.7);
    fx.push({ obj: s, toss: { from, to, dur, t: 0, onLand }, life: dur + 0.05, max: dur + 0.05 });
  }
  function updateFx(dt) {
    for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.life -= dt;
      if (f.toss) {
        const q = f.toss, to = typeof q.to === 'function' ? q.to() : q.to;
        q.t += dt;
        const u = Math.min(1, q.t / q.dur);
        f.obj.position.set(q.from.x + (to.x - q.from.x) * u, q.from.y + (to.y - q.from.y) * u + Math.sin(Math.PI * u) * 1.4, q.from.z + (to.z - q.from.z) * u);
        if (u >= 1) { if (q.onLand) q.onLand(); drop(f.obj); fx.splice(i, 1); }
        continue;
      }
      f.vy -= (f.grav || 0) * dt;
      f.obj.position.x += f.vx * dt; f.obj.position.y += f.vy * dt; f.obj.position.z += f.vz * dt;
      if (f.spin) { f.obj.rotation.x += f.spin * dt; f.obj.rotation.y += f.spin * 0.7 * dt; }
      if (f.grow) f.obj.scale.multiplyScalar(1 + f.grow * dt);
      if (f.fade) f.obj.material.opacity = Math.max(0, f.life / f.max);
      if (f.life <= 0) { drop(f.obj); fx.splice(i, 1); }
    }
    if (VOLCANO) {
      VOLCANO.t -= dt;
      if (VOLCANO.t <= 0) {
        VOLCANO.t = 0.5;
        const s = new T.Sprite(new T.SpriteMaterial({ map: G.dotTexture(), color: '#8a8a8a', transparent: true, opacity: 0.7, depthWrite: false }));
        s.position.set(VOLCANO.x + (Math.random() - 0.5) * 8, VOLCANO.y, VOLCANO.z);
        s.scale.set(12, 12, 1);
        scene.add(s);
        fx.push({ obj: s, vx: 2, vy: 5, vz: 0, life: 9, max: 9, grav: 0, fade: true, grow: 0.12 });
      }
    }
  }
  function clearFx() { for (const f of fx) drop(f.obj); fx.length = 0; timers.length = 0; }

  // ---------- the camera ----------
  function setCam(c) {
    camera.fov = c.vfov * 180 / Math.PI;
    camera.aspect = c.aspect;
    camera.position.set(c.x, c.y, c.z);
    camera.lookAt(c.x + c.f[0], c.y + c.f[1], c.z + c.f[2]);
    camera.updateProjectionMatrix();
  }
  function lookAt(px, py, pz, tx, ty, tz, aspect) {
    camera.fov = S.vfovFor(aspect) * 180 / Math.PI;
    camera.aspect = aspect;
    camera.position.set(px, py, pz);
    camera.lookAt(tx, ty, tz);
    camera.updateProjectionMatrix();
  }
  function render() { renderer.render(scene, camera); }
  function resize(w, h) { renderer.setSize(w, h, false); }

  // small pictures of each dinosaur, for the HUD and the dino book (made once at the start)
  function icons(size) {
    const W = size || 160, H = Math.round(W * 0.75);
    const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(W, H, false);
    r.outputEncoding = T.sRGBEncoding;
    const sc = new T.Scene();
    sc.add(new T.HemisphereLight('#ffffff', '#806a50', 0.95));
    const dl = new T.DirectionalLight('#ffffff', 0.8);
    dl.position.set(3, 5, 6);
    sc.add(dl);
    const cam = new T.PerspectiveCamera(30, W / H, 0.1, 500);
    const out = {}, sizes = {};
    for (const sp of D.SPECIES) {
      const m = makeDinoModel(sp, {});
      if (m.P.wings) { m.P.wings[0].rotation.x = -0.3; m.P.wings[1].rotation.x = 0.3; }
      m.root.rotation.y = -0.55;
      sc.add(m.root);
      const bb = new T.Box3().setFromObject(m.root);
      const sz = bb.getSize(new T.Vector3()), c = bb.getCenter(new T.Vector3());
      const unrot = new T.Box3().setFromObject(m.g);
      void unrot;
      m.root.rotation.y = 0;
      const b0 = new T.Box3().setFromObject(m.root), s0 = b0.getSize(new T.Vector3());
      sizes[sp.id] = { L: +s0.x.toFixed(2), H: +b0.max.y.toFixed(2), W: +s0.z.toFixed(2) };
      m.root.rotation.y = -0.55;
      const dist = Math.max(sz.x * 1.0, sz.y * 1.35, sz.z) / (2 * Math.tan(15 * Math.PI / 180)) * 1.05;
      cam.position.set(c.x + dist * 0.25, c.y + dist * 0.12, c.z + dist);
      cam.lookAt(c);
      r.render(sc, cam);
      out[sp.id] = r.domElement.toDataURL('image/png');
      sc.remove(m.root);
    }
    r.dispose();
    try { r.forceContextLoss(); } catch (e) { /* fine */ }
    out._sizes = sizes;
    return out;
  }

  D.art = {
    init, setDinos, updateDinos, makeJeep, setCrew, placeJeep, aimPerson, person, sprite, puff, confetti, floatUp, toss, updateFx, clearFx,
    setCam, lookAt, render, resize, icons, later, drawSigns, SPOTS,
    get jeep() { return jeep; }, get scene() { return scene; }, get renderer() { return renderer; }, get camera() { return camera; }, models,
  };
})();

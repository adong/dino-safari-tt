/* TT Dino Safari: the game. Screens (title, pick, ride, results, the dino book), keys, mouse and touch, the
   viewfinders and the HUD, photos (the picture inside your frame, kept in the dino book), the brother who comes when
   you call him (a treat, then he points the camera for you), the high five in 2 players, the winner's celebration,
   and window.game for tests. The rules live in js/sim.js and the pictures in js/art.js. */
(function () {
  'use strict';
  const D = window.DINO, A = D.art, SIM = D.sim, K = Kit.sound, L = Kit.lang;
  const $ = (s) => document.querySelector(s), $$ = (s) => Array.from(document.querySelectorAll(s));
  const STORE = 'dinoSafariTT.v1';
  const TREATS = ['🍦', '💧', '🧃', '🍪', '🍉', '🍌'];
  const NAMES = { teddy: 'TEDDY', tommy: 'TOMMY', foxy: 'FOXY', froggy: 'FROGGY' };
  const GUTTER = 56; // the kit's ? / A文 / sound buttons on the left edge: the frames stay clear of them
  const stars = (n) => '⭐'.repeat(n) + '☆'.repeat(3 - n);
  const spName = (id) => D.SP[id].short || D.SP[id].name;

  // ---------- saved choices, the dino book, best scores, wins ----------
  const DEF = () => ({ level: 'easy', who: 'tommy', p1: 'teddy', lv: { teddy: 'normal', tommy: 'easy' }, book: {}, best: { easy: 0, normal: 0 }, wins: { teddy: 0, tommy: 0, froggy: 0 } });
  let save = DEF();
  try { save = Object.assign(DEF(), JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) { /* private mode: defaults */ }
  const store = () => { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch (e) { /* full or no storage: the book stays for this visit */ } };

  const S = {
    screen: 'loading', mode: 'safari', ride: null, demo: false, paused: false, held: false, time: 0, crew: null,
    buddy: null, celebrate: null, pending: [], photos: [[], []], newInBook: 0, hfAt: -9, icons: {}, toastHold: 0,
  };
  let PORTRAIT = {};

  // ---------- input ----------
  const mkIn = () => ({ ax: 0, ay: 0, target: null, snap: false, zoom: false });
  const inputs = [mkIn(), mkIn()];
  const held = [new Set(), new Set()];
  const DIRS = { KeyW: [0, 0, 1], KeyS: [0, 0, -1], KeyA: [0, -1, 0], KeyD: [0, 1, 0], ArrowUp: [1, 0, 1], ArrowDown: [1, 0, -1], ArrowLeft: [1, -1, 0], ArrowRight: [1, 1, 0] };
  const two = () => S.mode === '2p';
  const slotFor = (s) => (two() ? s : 0);
  function axes() {
    for (let s = 0; s < 2; s++) { inputs[s].ax = 0; inputs[s].ay = 0; }
    for (let s = 0; s < 2; s++) for (const c of held[s]) { const d = DIRS[c]; const t = slotFor(d[0]); inputs[t].ax += d[1]; inputs[t].ay += d[2]; }
    for (let s = 0; s < 2; s++) { inputs[s].ax = Math.max(-1, Math.min(1, inputs[s].ax)); inputs[s].ay = Math.max(-1, Math.min(1, inputs[s].ay)); }
  }
  function releaseAll() { held[0].clear(); held[1].clear(); axes(); for (const i of inputs) { i.target = null; } pointers.clear(); }

  let soundOn = false;
  function wake() {
    if (soundOn) return;
    soundOn = true;
    K.init();
    K.music(S.screen === 'ride' ? 'play' : 'title');
  }

  addEventListener('keydown', (e) => {
    wake();
    const c = e.code, scr = S.screen;
    if (c === 'KeyM') { K.toggleMute(); return; }
    if (scr === 'ride') {
      if (c === 'KeyP' || c === 'Escape') { e.preventDefault(); pause(); return; }
      if (DIRS[c]) { e.preventDefault(); held[DIRS[c][0]].add(c); axes(); return; }
      if (e.repeat) return;
      if (c === 'Space' || c === 'KeyF') { e.preventDefault(); snap(0); }
      else if (c === 'Enter' || c === 'NumpadEnter') { e.preventDefault(); snap(slotFor(1)); }
      else if (c === 'KeyQ') inputs[0].zoom = true;
      else if (c === 'Slash' || c === 'Period') inputs[slotFor(1)].zoom = true;
      else if (c === 'KeyT') callBrother(0);
      return;
    }
    if (e.repeat) return;
    if (scr === 'paused') {
      if (c === 'KeyP' || c === 'Escape' || c === 'Space' || c === 'Enter') { e.preventDefault(); resume(); } else if (c === 'KeyQ') toMenu();
    } else if (scr === 'title') {
      if (c === 'Digit1' || c === 'Enter' || c === 'Space') { e.preventDefault(); choose('safari'); }
      else if (c === 'Digit2') choose('2p');
      else if (c === 'KeyB' || c === 'Digit3') openBook();
      else if (c === 'KeyE') setLevel(save.level === 'easy' ? 'normal' : 'easy');
    } else if (scr === 'select') {
      if (c === 'Enter' || c === 'Space') { e.preventDefault(); go(); }
      else if (c === 'Escape') show('title');
      else if (c.startsWith('Arrow')) { const k = two() ? 'p1' : 'who'; save[k] = save[k] === 'teddy' ? 'tommy' : 'teddy'; K.click(); buildSelect(); }
    } else if (scr === 'results' || scr === 'celebrate') {
      if (c === 'Enter' || c === 'Space') { e.preventDefault(); again(); }
      else if (c === 'KeyB') openBook();
      else if (c === 'Escape') toMenu();
    } else if (scr === 'book') {
      if (c === 'Escape' || c === 'KeyB' || c === 'Backspace') closeBook();
    }
  });
  addEventListener('keyup', (e) => { if (DIRS[e.code]) { held[DIRS[e.code][0]].delete(e.code); axes(); } });
  addEventListener('blur', releaseAll);

  // mouse and touch on the valley: the frame follows; a click, or lifting your finger, takes the photo
  const cv = $('#game');
  const pointers = new Map();
  const ndc = (e) => ({ x: (e.clientX / innerWidth) * 2 - 1, y: 1 - (e.clientY / innerHeight) * 2 });
  const slotOf = (e) => (two() && e.clientX > innerWidth / 2 ? 1 : 0);
  let mouseT = -9;
  cv.addEventListener('pointerdown', (e) => {
    wake();
    if (S.screen !== 'ride') return;
    e.preventDefault();
    const slot = slotOf(e);
    pointers.set(e.pointerId, { slot, touch: e.pointerType !== 'mouse' });
    inputs[slot].target = ndc(e);
    try { cv.setPointerCapture(e.pointerId); } catch (er) { /* synthetic */ }
    if (e.pointerType === 'mouse') { snapAfterAim(slot); }
  });
  cv.addEventListener('pointermove', (e) => {
    if (S.screen !== 'ride') return;
    const p = pointers.get(e.pointerId);
    if (p) { inputs[p.slot].target = ndc(e); return; }
    if (e.pointerType === 'mouse') { inputs[0].target = ndc(e); mouseT = S.time; }
  });
  const lift = (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    pointers.delete(e.pointerId);
    if (p.touch && S.screen === 'ride' && e.type === 'pointerup') snapAfterAim(p.slot);
    if (p.touch) inputs[p.slot].target = null;
  };
  cv.addEventListener('pointerup', lift);
  cv.addEventListener('pointercancel', lift);
  // the frame glides to your finger in a moment; take the photo once it's there
  function snapAfterAim(slot) {
    const t = inputs[slot].target, r = S.ride;
    if (t && r) { const pl = r.players[slot]; if (pl) { pl.x = t.x; pl.y = t.y; SIM.clampFrame(r.view, pl); } }
    snap(slot);
  }
  const isTouch = () => 'ontouchstart' in window || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
  if (isTouch()) document.body.classList.add('touch');
  addEventListener('pointerdown', (e) => { wake(); if (e.pointerType === 'touch') document.body.classList.add('touch'); }, true);
  $$('.zbtn').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); inputs[slotFor(+b.dataset.zoom)].zoom = true; K.click(); }));
  $('#bud').addEventListener('click', () => callBrother(0));

  function snap(slot) { if (S.screen === 'ride' && S.ride && S.ride.players[slot]) inputs[slot].snap = true; }

  // ---------- screens ----------
  function show(name) {
    S.screen = name;
    for (const id of ['title', 'select', 'pause', 'results', 'book']) $('#' + id).classList.toggle('hidden', id !== (name === 'paused' ? 'pause' : name));
    const riding = name === 'ride' || name === 'paused';
    $('#hud').classList.toggle('hidden', !riding);
    $('#f0').classList.toggle('hidden', !riding);
    $('#f1').classList.toggle('hidden', !(riding && two()));
    $('#menuMute').classList.toggle('hidden', riding || name === 'celebrate' || name === 'loading');
    document.body.classList.toggle('riding', riding);
    document.body.classList.toggle('duo', two());
    if (name === 'title') { buildTitle(); if (!S.demo) startDemo(); }
    if (name === 'select') buildSelect();
    if (soundOn) K.music(name === 'ride' ? 'play' : name === 'paused' ? 'pause' : name === 'results' || name === 'celebrate' ? 'over' : 'title');
  }
  function bookCount() { return D.SPECIES.filter((sp) => save.book[sp.id]).length; }
  function buildTitle() {
    $('#logoText').textContent = D.TITLE;
    $('#tagline').textContent = D.TAGLINE;
    $('#bookCount').textContent = `${bookCount()} of ${D.SPECIES.length} dinosaurs`;
    $$('[data-level]').forEach((b) => { const on = b.dataset.level === save.level; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  }
  function setLevel(lv) { save.level = lv; store(); buildTitle(); K.click(); }
  function choose(mode) {
    if (mode === 'book') { openBook(); return; }
    S.mode = mode;
    K.click();
    show('select');
  }
  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.mode)));
  $$('[data-level]').forEach((b) => b.addEventListener('click', () => setLevel(b.dataset.level)));

  function buildSelect() {
    const duo = two();
    $('#selTitle').textContent = duo ? 'WHO IS PLAYER 1?' : 'WHO IS TAKING PHOTOS?';
    const box = $('#who');
    box.innerHTML = '';
    const sel = duo ? save.p1 : save.who;
    for (const id of ['teddy', 'tommy']) {
      const b = document.createElement('button');
      b.className = 'card' + (id === sel ? ' on' : '');
      b.setAttribute('role', 'option');
      b.innerHTML = `<img alt=""><b>${NAMES[id]}</b><small>${id === 'teddy' ? 'boxing and hoops' : 'peace and love'}</small>`;
      b.querySelector('img').src = PORTRAIT[id] || '';
      if (duo) { const w = document.createElement('span'); w.className = 'who' + (id === sel ? '' : ' p2'); w.textContent = id === sel ? 'P1' : 'P2'; b.appendChild(w); }
      b.onclick = () => { if (duo) save.p1 = id; else save.who = id; K.click(); buildSelect(); };
      box.appendChild(b);
    }
    const lv = $('#lvl2');
    lv.innerHTML = '';
    if (duo) {
      for (const id of ['teddy', 'tommy']) {
        for (const l of ['easy', 'normal']) {
          const b = document.createElement('button');
          b.className = 'opt' + (save.lv[id] === l ? ' on' : '');
          b.innerHTML = `<span class="e">${l === 'easy' ? '🐣' : '🔥'}</span><span><b>${l === 'easy' ? 'EASY' : 'NORMAL'}</b><small>${NAMES[id]}</small></span>`;
          b.onclick = () => { save.lv[id] = l; K.click(); buildSelect(); };
          lv.appendChild(b);
        }
      }
    }
  }
  $('#selBack').onclick = () => show('title');
  $('#selGo').onclick = () => go();
  function go() { store(); startRide({}); }

  // ---------- a ride ----------
  function crewFor(mode, players) {
    const list = [{ id: 'foxy', spot: 'driver' }];
    if (mode === '2p') { list.push({ id: players[0].id, spot: 'back0', camera: true, key: 'p0' }, { id: players[1].id, spot: 'back1', camera: true, key: 'p1' }); }
    else { list.push({ id: players[0].id, spot: 'back0', camera: true, key: 'p0' }); if (mode === 'safari') list.push({ id: 'froggy', spot: 'back1', camera: true, key: 'cpu' }); }
    return list;
  }
  function clearRide() {
    removeBuddy();
    A.clearFx();
    S.celebrate = null;
    S.pending.length = 0;
    releaseAll();
  }
  function startRide(o) {
    clearRide();
    S.demo = false;
    if (o.mode) S.mode = o.mode;
    const duo = two();
    let players;
    if (duo) { const p1 = o.p1 || save.p1, p2 = Kit.roster.buddyFor(p1); players = [{ id: p1, level: (o.lv && o.lv[p1]) || save.lv[p1] }, { id: p2, level: (o.lv && o.lv[p2]) || save.lv[p2] }]; }
    else players = [{ id: o.who || save.who, level: o.level || save.level }];
    S.ride = SIM.newRide({ players, view: { W: innerWidth, H: innerHeight, gutter: GUTTER }, count: o.count, cpu: duo ? null : players[0].level, seed: (Math.random() * 1e6) | 0 });
    S.crew = A.setCrew(crewFor(S.mode, players));
    A.setDinos(S.ride.dinos);
    S.photos = [[], []];
    S.newInBook = 0;
    S.bestBefore = save.best[players[0].level] || 0;
    setupHud();
    show('ride');
    S.paused = false;
    if (S.ride.phase === 'ready') { count('READY?'); A.later(0.9, () => count('')); }
    $('#hint2').style.opacity = 1;
    A.later(7, () => { $('#hint2').style.opacity = 0; });
  }
  function startDemo() {
    clearRide();
    S.demo = true;
    S.ride = SIM.newRide({ players: [{ id: 'tommy', level: 'easy' }], view: { W: innerWidth, H: innerHeight, gutter: GUTTER }, count: 0, noSlow: true });
    S.ride.s = 30;
    S.crew = A.setCrew([{ id: 'foxy', spot: 'driver' }, { id: 'teddy', spot: 'back0', camera: true, key: 'p0' }, { id: 'tommy', spot: 'back1', camera: true, key: 'p1' }]);
    A.setDinos(S.ride.dinos);
  }
  function count(t) { const el = $('#count'); el.textContent = t; el.classList.toggle('show', !!t); }

  function setupHud() {
    const r = S.ride, duo = two();
    const b0 = $('.pbox.b0'), b1 = $('.pbox.b1');
    b0.querySelector('img').src = PORTRAIT[r.players[0].id] || '';
    b0.querySelector('.nm').textContent = NAMES[r.players[0].id];
    b1.classList.toggle('hidden', !duo && !r.cpu);
    b1.classList.toggle('cpu', !duo);
    b1.querySelector('img').style.display = duo ? '' : 'none';
    b1.querySelector('.em').style.display = duo ? 'none' : '';
    if (duo) { b1.querySelector('img').src = PORTRAIT[r.players[1].id] || ''; b1.querySelector('.nm').textContent = NAMES[r.players[1].id]; }
    else b1.querySelector('.nm').textContent = 'FROGGY';
    const strip = $('#strip');
    strip.innerHTML = '';
    for (const sp of D.SPECIES) { const im = document.createElement('img'); im.src = S.icons[sp.id] || ''; im.alt = ''; im.dataset.sp = sp.id; strip.appendChild(im); }
    const bud = $('#bud'), me = r.players[0].id, other = Kit.roster.buddyFor(me);
    bud.classList.toggle('hf', duo);
    bud.querySelector('img').src = duo ? (PORTRAIT[other] || '') : (PORTRAIT[other] || '');
    bud.querySelector('.lbl').firstChild.textContent = duo ? 'HIGH FIVE' : 'CALL';
    bud.querySelector('.lbl b').textContent = duo ? '✋' : NAMES[other];
    for (let i = 0; i < 2; i++) {
      const f = $('#f' + i), pl = r.players[i];
      if (pl) f.querySelector('.who').textContent = NAMES[pl.id];
    }
    $$('.polaroid').forEach((p) => p.classList.remove('show'));
    $('.zone').classList.remove('show');
    $('.cpumsg').classList.remove('show');
    toast('', '');
  }

  // ---------- the brother: pops in, does his move, tosses a treat, then points the camera for you ----------
  function removeBuddy() {
    if (S.buddy && A.jeep) A.jeep.body.remove(S.buddy.p.root);
    S.buddy = null;
  }
  function callBrother(slot) {
    const r = S.ride;
    if (S.screen !== 'ride' || !r || r.phase === 'done') return;
    if (two()) { highFive(); return; }
    const me = r.players[0], id = Kit.roster.buddyFor(me.id), e = Kit.roster.get(id);
    const b = S.buddy;
    if (b && b.t < 1.6) return; // he's still saying hello
    if (!b) {
      const p = A.person(id, (id === 'tommy' ? 0.52 : 0.6) * e.buddyScale / 0.85 * 0.85);
      const at = A.SPOTS.tail; // the back edge of the jeep, nearest you
      p.root.position.set(at[0], at[1], at[2]);
      p.root.rotation.y = Math.PI / 2; // facing back, toward you and the camera
      A.jeep.body.add(p.root);
      S.buddy = { id, p, sc: p.root.scale.x, t: 0 };
    } else S.buddy.t = 0.36;
    Object.assign(S.buddy, { treat: TREATS[(Math.random() * TREATS.length) | 0], tossed: false, aimed: false, ball: false, bye: false });
    K.swish();
    toast(`${NAMES[id]}!`, 'cool', 'here I come!');
    void slot;
  }
  const _w = new THREE.Vector3();
  function updateBuddy(dt) {
    const b = S.buddy, r = S.ride;
    if (!b || !r) return;
    b.t += dt;
    const t = b.t, p = b.p, pl = r.players[0];
    const pop = t < 0.35 ? easeOutBack(Math.min(1, t / 0.35)) : t > 8.6 ? Math.max(0.001, 1 - (t - 8.6) / 0.35) : 1;
    p.root.scale.setScalar(b.sc * Math.max(0.001, pop));
    const k = 1 - Math.exp(-18 * dt);
    if (t < 1.6) {
      // hello: his signature move, facing you
      p.root.rotation.y += (Math.PI / 2 - p.root.rotation.y) * k;
      if (b.id === 'teddy') {
        const mode = t < 1.0 ? 'boxing' : 'jumpshot';
        Kit.people.pose(p, t * 8, mode, k);
        if (mode === 'jumpshot' && !b.ball) { b.ball = true; p.root.updateMatrixWorld(true); const w = Kit.people.handWorld(p, 1, _w); A.toss('🏀', { x: w.x, y: w.y, z: w.z }, { x: w.x, y: w.y + 3, z: w.z }, 0.7); }
      } else Kit.people.pose(p, t * 6, 'peace', k);
    } else if (t < 2.3) {
      Kit.people.pose(p, t * 6, 'give', k);
      if (!b.tossed) {
        b.tossed = true;
        const treat = b.treat, me = S.crew.p0.p;
        p.root.updateMatrixWorld(true);
        const from = Kit.people.handWorld(p, 1, new THREE.Vector3());
        A.toss(treat, { x: from.x, y: from.y, z: from.z }, () => { me.head.updateWorldMatrix(true, false); const w = me.head.getWorldPosition(new THREE.Vector3()); return { x: w.x, y: w.y, z: w.z }; }, 0.5, () => { K.coin(3); toast(`${treat} YUM!`, 'good'); });
      }
    } else if (t < 8.4) {
      // he takes the camera and points it at a dinosaur for you
      if (!b.aimed) {
        b.aimed = true;
        const got = SIM.buddyAim(r, 0, 6);
        K.powerup();
        if (got) toast(`${NAMES[b.id]} SAYS: ${got.visible ? 'SNAP IT NOW!' : 'ONE IS COMING!'}`, 'good', got.visible ? `the frame is on the ${spName(got.sp)}` : 'get ready to snap', 1.6);
        else toast(`${NAMES[b.id]} SAYS: WE GOT THEM ALL!`, 'good', '', 1.4);
      }
      // he points where the frame is
      const cam = r.cam;
      const yaw = Math.atan(pl.x * Math.tan(cam.vfov / 2) * cam.aspect);
      p.root.rotation.y += ((-Math.PI / 2 - yaw) - p.root.rotation.y) * k;
      Kit.people.pose(p, t * 6, 'give', k);
      p.armR.rotation.x += (1.75 + pl.y * 0.6 - p.armR.rotation.x) * k;
    } else {
      p.root.rotation.y += (Math.PI / 2 - p.root.rotation.y) * k;
      Kit.people.pose(p, t * 8, 'wave', k);
      if (t > 8.95) removeBuddy();
    }
  }
  const easeOutBack = (u) => { const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };

  // 2 players: a high five in the jeep
  function highFive() {
    if (S.time - S.hfAt < 0.8) return;
    S.hfAt = S.time;
    K.punch();
    K.coin(5);
    toast('✋ HIGH FIVE!', 'cool', 'great team!', 1);
    S.hf = 0.9;
    if (A.jeep) { const j = A.jeep.g.position; A.confetti(j.x, j.y + 2.6, j.z, 30); }
  }

  // ---------- messages ----------
  function toast(text, cls, small, prio) {
    const el = $('#hud .msg');
    if (!text) { el.classList.remove('show'); return; }
    if (!prio && S.time < S.toastHold) return;
    if (prio) S.toastHold = S.time + prio;
    el.className = 'msg' + (cls ? ' ' + cls : '');
    el.textContent = text;
    if (small) { const sm = document.createElement('small'); sm.textContent = small; el.appendChild(sm); }
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), prio ? Math.max(1600, prio * 1000 + 600) : 1600);
  }
  function zoneBanner(id) {
    const z = D.ZONES.find((q) => q.id === id), el = $('.zone');
    el.textContent = { plains: '🌿', forest: '🌳', lake: '💧', hills: '⛰️', volcano: '🌋', rocks: '🪨' }[id] + ' ' + z.name;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3200);
  }

  // speaking the facts aloud (for a 5-year-old who can't read them yet); quiet whenever the sound is off
  function speak(text) {
    if (!window.speechSynthesis || K.isMuted() || !soundOn) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = L.is('zh') ? 'zh-CN' : 'en-US';
      u.rate = 0.95;
      speechSynthesis.speak(u);
    } catch (e) { /* no voices */ }
  }
  K.onMute((m) => { if (m && window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { /* fine */ } });
  const factFor = (id) => L.t(D.SP[id].fact);

  // dinosaur noises, made with the kit's synth
  function dinoSound(id) {
    if (id === 'trex') { K.tone({ type: 'sawtooth', f: 160, to: 55, dur: 0.9, vol: 0.18, lp: 700 }); K.hiss({ filter: 'lowpass', f: 900, to: 200, dur: 0.8, vol: 0.18 }); }
    else if (id === 'para') { K.tone({ type: 'square', f: 233, to: 262, dur: 0.5, vol: 0.06, lp: 1200 }); K.tone({ type: 'square', f: 349, dur: 0.4, vol: 0.04, lp: 1400, at: 0.1 }); }
    else if (id === 'spino') K.hiss({ filter: 'lowpass', f: 2000, to: 300, dur: 0.5, vol: 0.2 });
    else if (id === 'pachy') K.punch();
    else if (id === 'compy') K.tone({ type: 'triangle', f: 1200, to: 1700, dur: 0.12, vol: 0.08 });
    else if (id === 'ptera') K.tone({ type: 'triangle', f: 900, to: 600, dur: 0.3, vol: 0.06 });
  }
  function shutter() { K.hiss({ filter: 'highpass', f: 3500, dur: 0.05, vol: 0.22 }); K.tone({ type: 'square', f: 1500, dur: 0.03, vol: 0.04, at: 0.07 }); K.hiss({ filter: 'highpass', f: 2500, dur: 0.04, vol: 0.16, at: 0.09 }); }

  // ---------- what happened this frame ----------
  function handleEvents() {
    const r = S.ride;
    for (const e of r.events) {
      if (S.demo) continue;
      if (e.type === 'go') { toast("LET'S GO!", 'good', 'snap every dinosaur you see'); K.horn(1); }
      else if (e.type === 'zone') zoneBanner(e.zone);
      else if (e.type === 'snap') onSnap(e);
      else if (e.type === 'cpu') onCpu(e);
      else if (e.type === 'done') startCelebration();
    }
    r.events.length = 0;
    // a dinosaur starting its special move makes its noise when you can see it
    for (const di of r.dinos) {
      if (di.act && !di._was && !S.demo && r.vis.some((v) => v.di === di) && !di.baby) dinoSound(di.id);
      di._was = di.act;
    }
  }
  function onSnap(e) {
    const r = S.ride, sh = e.shot, pl = r.players[e.p];
    S._lastShot = sh;
    shutter();
    const f = $('#f' + e.p);
    f.classList.remove('flash');
    void f.offsetWidth;
    f.classList.add('flash');
    S.pending.push(e);
    const who = two() ? NAMES[pl.id] + ': ' : '';
    if (!sh.stars) {
      const MSG = { empty: ['NO DINO! 🙈', 'put the frame on a dinosaur'], far: ['TOO FAR!', 'zoom in with 🔍, or wait till it is closer'], hiding: ["IT'S HIDING!", 'wait for it to peek out'], blocked: ['A TREE IS IN THE WAY!', 'wait for a clear look'], edge: ['ALMOST!', 'put it in the middle of the frame'] };
      const m = MSG[sh.why] || MSG.empty;
      toast(who + m[0], 'ouch', m[1]);
      K.bump();
    } else {
      K.coin(sh.stars * 4);
      const name = spName(sh.sp);
      if (sh.isNew) {
        K.powerup();
        toast(`${who}NEW! ${name}`, 'good', factFor(sh.sp), 2.6);
        speak(L.t(name) + '! ' + factFor(sh.sp));
      } else if (sh.better) toast(`${who}${stars(sh.stars)} BETTER PHOTO!`, 'cool', sh.tag ? `+ ${sh.tag}` : '');
      else toast(`${who}${stars(sh.stars)} ${name}`, 'cool', sh.tag ? `+ ${sh.tag}` : '');
      const im = $(`#strip img[data-sp="${sh.sp}"]`);
      if (im && !im.classList.contains('got')) { im.classList.add('got', 'pop'); setTimeout(() => im.classList.remove('pop'), 400); }
    }
  }
  function onCpu(e) {
    const f = $('#fcpu'), sh = e.shot, r = S.ride;
    placeFrame(f, e.frame, r.view);
    f.classList.add('on');
    setTimeout(() => f.classList.remove('on'), 650);
    const el = $('.cpumsg');
    el.textContent = sh.stars ? `🐸 📸 ${spName(sh.sp)} ${stars(sh.stars)}` : '🐸 📸 OOPS!';
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 1800);
    const c = S.crew && S.crew.cpu;
    if (c) c.snapT = 0.4;
  }
  // after drawing: the picture inside each frame that just took a photo
  const cropC = document.createElement('canvas');
  cropC.width = 240; cropC.height = 180;
  function capture() {
    if (!S.pending.length) return;
    // the photo is of the valley, not of our own jeep: draw once without it
    A.jeep.g.visible = false;
    A.render();
    const gl = A.renderer.domElement, W = gl.width, H = gl.height, g = cropC.getContext('2d');
    for (const e of S.pending) {
      const f = e.frame, w = f.hw * W, h = f.hh * H, cx = (f.x + 1) / 2 * W, cy = (1 - f.y) / 2 * H;
      let url = '';
      try { g.drawImage(gl, cx - w / 2, cy - h / 2, w, h, 0, 0, 240, 180); url = cropC.toDataURL('image/jpeg', 0.72); } catch (er) { url = ''; }
      const sh = e.shot, pl = S.ride.players[e.p];
      const pol = $('.polaroid.p' + e.p);
      pol.querySelector('img').src = url;
      pol.querySelector('.stars').textContent = sh.stars ? stars(sh.stars) : '🙈';
      pol.querySelector('.cap').textContent = sh.stars ? spName(sh.sp) + (sh.tag ? ' · ' + sh.tag : '') : 'NO DINO!';
      pol.classList.remove('show');
      void pol.offsetWidth;
      pol.classList.add('show');
      clearTimeout(pol._t);
      pol._t = setTimeout(() => pol.classList.remove('show'), 3500);
      if (!sh.stars) continue;
      // this ride's best photo of it, for the results
      const list = S.photos[e.p], old = list.find((q) => q.sp === sh.sp);
      if (!old) list.push({ sp: sh.sp, score: sh.score, stars: sh.stars, img: url, tag: sh.tag });
      else if (sh.score > old.score) Object.assign(old, { score: sh.score, stars: sh.stars, img: url, tag: sh.tag });
      // the dino book keeps the best photo ever of each one
      const b = save.book[sh.sp];
      if (!b || sh.score > b.score) {
        if (!b) S.newInBook++;
        save.book[sh.sp] = { score: sh.score, stars: sh.stars, img: url, who: pl.id, level: pl.level };
        store();
      }
    }
    S.pending.length = 0;
    A.jeep.g.visible = true;
    A.render();
  }

  // ---------- the end: the winner's move, then the results ----------
  function startCelebration() {
    const r = S.ride, pls = r.players;
    let win;
    if (two()) win = pls[0].points === pls[1].points ? 'both' : pls[0].points > pls[1].points ? pls[0].id : pls[1].id;
    else win = pls[0].points >= r.cpu.points ? pls[0].id : 'froggy';
    removeBuddy();
    S.celebrate = { win, t: 0, burst: 0, ball: false };
    show('celebrate');
    toast('', '');
    K.powerup();
    // the winner climbs onto the bonnet and faces the camera
    const ids = win === 'both' ? ['p0', 'p1'] : [Object.keys(S.crew).find((k) => S.crew[k].id === win)];
    S.celebrate.who = ids.filter(Boolean).map((k, i) => {
      const c = S.crew[k];
      c.p.root.position.set(1.35, 1.48, ids.length === 2 ? (i ? 0.45 : -0.45) : 0);
      c.p.root.rotation.y = -Math.PI / 2;
      if (c.cam) c.cam.visible = false;
      return c;
    });
  }
  function updateCelebration(dt) {
    const c = S.celebrate;
    if (!c) return;
    c.t += dt;
    const k = 1 - Math.exp(-16 * dt);
    for (const w of c.who) {
      w.p.head.rotation.x += (0 - w.p.head.rotation.x) * k;
      if (w.id === 'teddy') {
        const mode = c.t < 1.6 ? 'boxing' : 'jumpshot';
        Kit.people.pose(w.p, c.t * 8, mode, k);
        w.p.root.position.y = 1.48 + (mode === 'jumpshot' ? Math.max(0, Math.sin((c.t - 1.6) * 5)) * 0.35 : 0);
        if (mode === 'jumpshot' && !c.ball) { c.ball = true; w.p.root.updateMatrixWorld(true); const h = Kit.people.handWorld(w.p, 1, _w); A.toss('🏀', { x: h.x, y: h.y, z: h.z }, { x: h.x, y: h.y + 4, z: h.z }, 0.8); }
      } else if (w.id === 'tommy') Kit.people.pose(w.p, c.t * 6, 'peace', k);
      else { Kit.people.pose(w.p, c.t * 8, 'jump', k); w.p.root.position.y = 1.48 + Math.abs(Math.sin(c.t * 5)) * 0.5; } // Froggy hops
    }
    c.burst -= dt;
    if (c.burst <= 0 && c.t < 3) { c.burst = 0.55; const j = A.jeep.g.position; A.confetti(j.x, j.y + 3, j.z, 34); K.coin(6); }
    if (c.t > 3.4 && S.screen === 'celebrate') showResults();
  }
  function showResults() {
    const r = S.ride, c = S.celebrate, pls = r.players, duo = two();
    // best score and wins
    const lv = pls[0].level;
    const newBest = !duo && pls[0].points > (save.best[lv] || 0);
    if (!duo && newBest) save.best[lv] = pls[0].points;
    if (c.win !== 'both') save.wins[c.win] = (save.wins[c.win] || 0) + 1;
    store();
    const title = $('#resTitle');
    title.textContent = c.win === 'both' ? 'A TIE! HIGH FIVE!' : `${NAMES[c.win]} WINS!`;
    title.classList.toggle('win', c.win !== 'froggy');
    const sub = [];
    if (S.newInBook) sub.push(`📖 ${S.newInBook} NEW IN THE DINO BOOK`);
    sub.push(`📖 ${bookCount()} / ${D.SPECIES.length}`);
    $('#resSub').textContent = sub.join(' · ');
    const rows = duo ? pls.map((p) => ({ id: p.id, pts: p.points, kinds: Object.keys(p.best).length, st: Object.values(p.best).reduce((a, b) => a + b.stars, 0), lv: p.level }))
      : [{ id: pls[0].id, pts: pls[0].points, kinds: Object.keys(pls[0].best).length, st: Object.values(pls[0].best).reduce((a, b) => a + b.stars, 0), lv: pls[0].level },
        { id: 'froggy', pts: r.cpu.points, kinds: Object.keys(r.cpu.best).length, st: Object.values(r.cpu.best).reduce((a, b) => a + b.stars, 0) }];
    rows.sort((a, b) => b.pts - a.pts);
    const tb = $('#resTable');
    tb.innerHTML = '';
    const head = document.createElement('tr');
    for (const h of ['PHOTOGRAPHER', 'POINTS', 'DINOSAURS', 'STARS']) { const th = document.createElement('th'); th.textContent = h; head.appendChild(th); }
    tb.appendChild(head);
    for (const row of rows) {
      const tr = document.createElement('tr');
      const td0 = document.createElement('td');
      td0.className = 'who';
      if (PORTRAIT[row.id]) { const im = document.createElement('img'); im.src = PORTRAIT[row.id]; im.alt = ''; td0.appendChild(im); } else td0.appendChild(document.createTextNode('🐸 '));
      td0.appendChild(document.createTextNode(NAMES[row.id]));
      tr.appendChild(td0);
      for (const v of [`📸 ${row.pts}`, `🦕 ${row.kinds} / ${D.SPECIES.length}`, `⭐ ${row.st}`]) { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }
      tb.appendChild(tr);
    }
    if (!duo) {
      const tr = document.createElement('tr'), td = document.createElement('td');
      td.colSpan = 4;
      td.className = newBest ? 'new' : '';
      td.textContent = newBest ? `🏆 NEW BEST: ${pls[0].points}` : `🏆 BEST: ${save.best[lv] || 0}`;
      tr.appendChild(td);
      tb.appendChild(tr);
    }
    const ph = $('#resPhotos');
    ph.innerHTML = '';
    const order = (id) => D.SPECIES.findIndex((sp) => sp.id === id);
    const list = duo ? S.photos[0].concat(S.photos[1]) : S.photos[0];
    for (const p of list.slice().sort((a, b) => order(a.sp) - order(b.sp)).slice(0, 14)) {
      const d = document.createElement('div');
      d.className = 'photo';
      d.innerHTML = '<img alt=""><b></b><span></span>';
      d.querySelector('img').src = p.img;
      d.querySelector('b').textContent = spName(p.sp);
      d.querySelector('span').textContent = stars(p.stars);
      ph.appendChild(d);
    }
    show('results');
  }
  function again() { if (S.ride && !S.demo) startRide({ mode: S.mode }); }
  function toMenu() { clearRide(); show('title'); }
  $('#againBtn').onclick = again;
  $('#menuBtn').onclick = toMenu;
  $('#resBook').onclick = () => openBook();
  $('#pauseBtn').onclick = () => pause();
  $('#resumeBtn').onclick = () => resume();
  $('#restartBtn').onclick = () => { S.paused = false; startRide({ mode: S.mode }); };
  $('#quitBtn').onclick = () => { S.paused = false; toMenu(); };
  function pause() { if (S.screen !== 'ride') return; S.paused = true; releaseAll(); show('paused'); }
  function resume() { if (S.screen !== 'paused') return; S.paused = false; show('ride'); }
  document.addEventListener('visibilitychange', () => { if (document.hidden && window.game.autoPause) pause(); });

  // ---------- the dino book ----------
  let bookFrom = 'title';
  function openBook() {
    bookFrom = S.screen === 'results' ? 'results' : 'title';
    K.click();
    buildBook();
    show('book');
  }
  function closeBook() { if (bookFrom === 'results') show('results'); else { S.screen = 'title'; show('title'); } }
  $('#bookBack').onclick = closeBook;
  function buildBook() {
    $('#bookProg').textContent = `${bookCount()} of ${D.SPECIES.length} dinosaurs`;
    const grid = $('#bookGrid');
    grid.innerHTML = '';
    for (const sp of D.SPECIES) {
      const b = save.book[sp.id];
      const d = document.createElement('div');
      d.className = 'page' + (b ? '' : ' locked');
      const pic = document.createElement('div');
      pic.className = 'pic';
      const im = document.createElement('img');
      im.alt = '';
      if (b && b.img) im.src = b.img; else { im.src = S.icons[sp.id] || ''; im.className = 'sil'; }
      pic.appendChild(im);
      if (!b) { const q = document.createElement('span'); q.className = 'q'; q.textContent = '?'; pic.appendChild(q); }
      d.appendChild(pic);
      const nm = document.createElement('b');
      nm.textContent = b ? sp.name : '???';
      d.appendChild(nm);
      if (b) { const st = document.createElement('span'); st.className = 'stars'; st.textContent = stars(b.stars); d.appendChild(st); }
      const p = document.createElement('p');
      p.textContent = b ? sp.fact : 'Where to look: ' + sp.hint + '.';
      d.appendChild(p);
      if (b) {
        const by = document.createElement('span');
        by.className = 'by';
        by.textContent = `📸 ${NAMES[b.who] || ''} · ${b.score} POINTS`;
        d.appendChild(by);
        const say = document.createElement('button');
        say.className = 'say';
        say.textContent = '🔈';
        say.setAttribute('aria-label', 'Read it to me');
        say.onclick = () => { wake(); speak(L.t(sp.name) + '. ' + L.t(sp.fact)); };
        d.appendChild(say);
      }
      grid.appendChild(d);
    }
  }

  // ---------- HUD ----------
  function placeFrame(el, f, view) {
    const W = innerWidth, H = innerHeight, w = f.hw * W, h = f.hh * H;
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.transform = `translate(${(f.x + 1) / 2 * W - w / 2}px, ${(1 - f.y) / 2 * H - h / 2}px)`;
    void view;
  }
  function hud() {
    const r = S.ride;
    if (!r || S.demo) return;
    r.players.forEach((pl, i) => {
      const f = $('#f' + i);
      placeFrame(f, pl, r.view);
      f.classList.toggle('helped', !!pl.aim);
      f.querySelector('.zoom').classList.toggle('hidden', !pl.zoom);
      const box = $('.pbox.b' + i), film = pl.film === Infinity ? '' : ` · 🎞️ ${pl.film}`;
      box.querySelector('.st').innerHTML = '';
      box.querySelector('.st').textContent = `📸 ${pl.points} · 🦕 ${Object.keys(pl.best).length}${film}`;
    });
    $$('.zbtn').forEach((b) => b.classList.toggle('on', !!(r.players[slotFor(+b.dataset.zoom)] || {}).zoom));
    if (!two() && r.cpu) $('.pbox.b1 .st').textContent = `📸 ${r.cpu.points} · 🦕 ${Object.keys(r.cpu.best).length}`;
    $('#bud').classList.toggle('on', !!S.buddy);
  }

  // ---------- the jeep's crew and the cameras ----------
  function updateCrew(dt) {
    const r = S.ride, crew = S.crew;
    if (!r || !crew) return;
    const k = 1 - Math.exp(-10 * dt);
    if (S.celebrate) return;
    for (const key of ['p0', 'p1']) {
      const c = crew[key];
      if (!c) continue;
      const pl = S.demo ? { x: key === 'p0' ? -0.4 : 0.4, y: 0.05 } : r.players[key === 'p0' ? 0 : 1];
      if (!pl) continue;
      if (S.hf > 0) {
        // high five: turn to each other, hands up
        c.p.root.rotation.y += ((key === 'p0' ? 0 : Math.PI) - c.p.root.rotation.y) * k;
        Kit.people.pose(c.p, 0, 'jumpshot', k);
        continue;
      }
      A.aimPerson(c, pl.x, pl.y, r.cam, k);
    }
    const cpu = crew.cpu;
    if (cpu) {
      cpu.snapT = Math.max(0, (cpu.snapT || 0) - dt);
      const t = performance.now() / 1000;
      A.aimPerson(cpu, 0.45 + Math.sin(t * 0.4) * 0.25, 0.05 + Math.sin(t * 0.7) * 0.05, r.cam, k * 0.5);
      if (cpu.snapT > 0) cpu.p.root.position.y = A.SPOTS.back1[1] + 0.05;
      else cpu.p.root.position.y = A.SPOTS.back1[1];
    }
    if (S.hf > 0) S.hf -= dt;
  }
  function cameras() {
    const r = S.ride;
    if (!r) return;
    if (S.peek) { const q = S.peek; A.lookAt(q[0], q[1], q[2], q[3], q[4], q[5], r.view.aspect); return; } // tests: a close look
    const c = S.celebrate;
    if (c) {
      // swing round to the front of the jeep
      const j = A.jeep.g.position, h = -A.jeep.g.rotation.y, u = Math.min(1, c.t / 1.4), e = u * u * (3 - 2 * u);
      const back = { x: r.cam.x, y: r.cam.y, z: r.cam.z };
      const front = { x: j.x + Math.cos(h) * 7.5 + Math.sin(h) * 2, y: j.y + 2.6, z: j.z + Math.sin(h) * 7.5 - Math.cos(h) * 2 };
      const px = back.x + (front.x - back.x) * e, py = back.y + (front.y - back.y) * e, pz = back.z + (front.z - back.z) * e;
      A.lookAt(px, py, pz, j.x, j.y + 1.9, j.z, r.view.aspect);
      return;
    }
    A.setCam(r.cam);
  }

  function update(dt) {
    S.time += dt;
    const r = S.ride;
    if (r && !S.paused && S.screen !== 'loading') {
      if (S.demo && r.phase === 'done') startDemo();
      const rr = S.ride;
      // a mouse that stops moving lets EASY's frame drift onto a dinosaur
      if (inputs[0].target && !pointers.size && S.time - mouseT > 0.25) inputs[0].target = null;
      SIM.stepRide(rr, dt, S.demo ? null : inputs);
      handleEvents();
      A.placeJeep(rr.s, rr.v, dt);
      A.updateDinos(rr.dinos, dt);
      updateBuddy(dt);
      updateCrew(dt);
      updateCelebration(dt);
    }
    if (!S.paused) A.updateFx(dt);
    cameras();
    hud();
  }
  function draw() { A.render(); capture(); }

  function resize() {
    A.resize(innerWidth, innerHeight);
    if (S.ride) SIM.setView(S.ride, innerWidth, innerHeight, GUTTER);
    cameras();
  }
  addEventListener('resize', resize);

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (S.held) return;
    update(dt);
    draw();
  }

  // ---------- sound button text ----------
  function muteText() { $$('.muteBtn').forEach((b) => { b.textContent = K.isMuted() ? '🔇' : '🔊'; }); }
  $$('.muteBtn').forEach((b) => b.addEventListener('click', () => { wake(); K.toggleMute(); }));
  K.onMute(muteText);

  // ---------- start ----------
  function boot() {
    A.init(cv);
    try { PORTRAIT = Kit.portraits([Kit.roster.get('teddy'), Kit.roster.get('tommy')], { size: 128 }); } catch (e) { PORTRAIT = {}; }
    try { S.icons = A.icons(160); } catch (e) { S.icons = {}; }
    muteText();
    resize();
    $('#loading').classList.add('hidden');
    show('title');
    requestAnimationFrame(frame);
  }

  // ---------- for tests (and curious dads) ----------
  function info() {
    const r = S.ride;
    return {
      screen: S.screen, mode: S.mode, demo: S.demo, phase: r && r.phase, t: r ? +r.t.toFixed(2) : 0, s: r ? +r.s.toFixed(1) : 0, v: r ? +r.v.toFixed(2) : 0, zone: r && r.zone,
      players: r ? r.players.map((p) => ({ id: p.id, level: p.level, x: +p.x.toFixed(3), y: +p.y.toFixed(3), zoom: p.zoom, film: p.film === Infinity ? 'unlimited' : p.film, points: p.points, kinds: Object.keys(p.best), aim: p.aim ? p.aim.di.id : null })) : [],
      cpu: r && r.cpu ? { points: r.cpu.points, kinds: Object.keys(r.cpu.best) } : null,
      visible: r ? r.vis.map((v) => v.di.id + (v.di.k ? '#' + v.di.k : '')) : [],
      buddy: S.buddy ? { id: S.buddy.id, t: +S.buddy.t.toFixed(2) } : null,
      celebrate: S.celebrate ? { win: S.celebrate.win, t: +S.celebrate.t.toFixed(2) } : null,
      book: bookCount(),
    };
  }
  window.game = {
    autoPause: true,
    start(o) { wake(); startRide(Object.assign({ count: 0 }, o || {})); return info(); },
    // tick the game by `sec` seconds in 1/60 s frames, then draw once
    step(sec) { const n = Math.max(1, Math.round((sec || 0) * 60)); for (let i = 0; i < n; i++) { update(1 / 60); if (S.pending.length) draw(); } draw(); return info(); },
    hold(v) { S.held = v !== false; return S.held; },
    info,
    press(code, down) { const ev = new KeyboardEvent(down === false ? 'keyup' : 'keydown', { code, bubbles: true }); dispatchEvent(ev); return info(); },
    aim(slot, x, y) { const pl = S.ride.players[slot || 0]; pl.x = x; pl.y = y; SIM.clampFrame(S.ride.view, pl); return info(); },
    // put a player's frame on a dinosaur (for tests): returns the box it aimed at
    aimAt(slot, id) { const r = S.ride, di = r.dinos.find((d) => d.id === id && !d.baby); const b = di && SIM.dinoBox(r.cam, di); if (!b) return null; const pl = r.players[slot || 0]; pl.x = b.cx; pl.y = b.cy; SIM.clampFrame(r.view, pl); return { box: b, frame: { x: pl.x, y: pl.y } }; },
    snap(slot) { snap(slot || 0); return info(); },
    // tests: look at one dinosaur up close (null: back to the jeep's camera)
    peek(id, k, ang) {
      if (!id) { S.peek = null; return null; }
      const r = S.ride, di = r.dinos.filter((d) => d.id === id)[k || 0], sp = di.sp, d = Math.max(sp.L, sp.H) * 1.2 * di.sc + 3, a = di.h + (ang == null ? 0.9 : ang);
      S.peek = [di.x + Math.cos(a) * d, di.y + sp.H * di.sc * 0.7 + 1, di.z + Math.sin(a) * d, di.x, di.y + sp.H * di.sc * 0.45, di.z];
      return { act: di.act, x: di.x, z: di.z };
    },
    call(slot) { callBrother(slot || 0); return info(); },
    warp(s) { S.ride.s = s; return info(); },
    show(name) { if (name === 'select') show('select'); else if (name === 'title') toMenu(); else if (name === 'pause') pause(); else if (name === 'book') openBook(); return S.screen; },
    choose,
    lastShot() { return S._lastShot || null; },
    check() { const c = SIM.check(); return { ok: c.ok, tests: c.tests.map((t) => `${t.ok ? 'ok' : 'FAIL'} ${t.name}: ${t.detail}`) }; },
    checkFails() { return SIM.checkFails(); },
    save: () => save,
    get S() { return S; },
  };
  boot();
})();

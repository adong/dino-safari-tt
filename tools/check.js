#!/usr/bin/env node
/* The headless check, in node: the same rules the page runs (js/dinos.js + js/sim.js), no browser.
     node tools/check.js              every dinosaur findable on both levels and three screen shapes; photo scoring; the book fills
     node tools/check.js --finds      plus how long each kind of dinosaur is in view, and its best photo
     node tools/check.js --fails      proves the check can fail: each sabotage must be caught
     node tools/check.js --sabotage hideRex|rockWall|fastJeep|noFrame|noOcclusion|noFacing|noHide   run the check with one thing broken */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console, Math, Number, JSON, Object, Array, Float32Array, Infinity, NaN, RegExp };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['js/title.js', 'js/dinos.js', 'js/sim.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
const D = ctx.DINO;
const args = process.argv.slice(2);
const i = args.indexOf('--sabotage');
if (i >= 0) D.sabotage[args[i + 1]] = true;

const t0 = Date.now();
if (args.includes('--fails')) {
  const f = D.sim.checkFails();
  for (const o of f.out) console.log(`${o.caught ? 'caught ' : 'MISSED '} ${o.sabotage} (${o.what}) -> ${o.test}: ${o.detail}`);
  console.log(f.ok ? 'OK: every sabotage was caught' : 'FAIL: a sabotage got through');
  process.exit(f.ok ? 0 : 1);
}
const res = D.sim.check();
if (args.includes('--finds')) {
  for (const k in res.finds) {
    console.log(k.padEnd(18) + D.SPECIES.map((sp) => { const o = res.finds[k].out[sp.id]; return `${sp.id} ${o.time.toFixed(1)}s ${o.stars}★${o.score}`; }).join('  '));
  }
}
for (const t of res.tests) console.log(`${t.ok ? 'ok  ' : 'FAIL'} ${t.name}: ${t.detail}`);
console.log(`${res.ok ? 'OK' : 'FAIL'} (${res.tests.length} tests, ${Date.now() - t0} ms)`);
process.exit(res.ok ? 0 : 1);

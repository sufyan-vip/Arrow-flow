// Track-animation tests — extract the REAL shipped methods from index.html
// and drive them with a fake renderer context (no DOM needed).
const fs = require('fs'), path = require('path');
require('./extract-pure.cjs');
const LV = globalThis.__LV;
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function grab(name) {
  const m = html.match(new RegExp('Renderer\\.prototype\\.' + name + '=function\\(a(?:,d)?\\)\\{[\\s\\S]*?\\n\\};'));
  if (!m) throw new Error('method not found: ' + name);
  return m[0];
}
const cell = 40;
const R = { cell: cell, ox: 0, oy: 0 };
R.center = function (cx, cy) { return { x: this.ox + (cx + 0.5) * this.cell, y: this.oy + (cy + 0.5) * this.cell } };
global.Renderer = function () {}; Renderer.prototype = {};
global.LV = LV; // extracted methods reference bare LV
(0, eval)(grab('buildTrack')); (0, eval)(grab('trackMap'));
R.buildTrack = Renderer.prototype.buildTrack; R.trackMap = Renderer.prototype.trackMap;
function simulate(lv, arrow) {
  const rt = { id: arrow.id, dir: arrow.dir, cells: arrow.cells, track: null };
  rt.flyDist = (arrow.ray.length + (rt.cells.length - 1) + 2.6) * cell;
  return { map: d => R.trackMap(rt, d), flyDist: rt.flyDist, getTrack: () => rt.track, a: arrow };
}

// ---- bent arrow from a real campaign level
let lv = null, bent = null;
for (let id = 26; id < 400 && !bent; id++) { lv = LV.getLevel('camp', id); bent = lv.arrows.find(a => a.k >= 2 && a.cells.length >= 3); }
console.log('level', lv.id, '| bent arrow', bent.id, '| cells', JSON.stringify(bent.cells), '| dir', bent.dir, '| segs', bent.k);
const S = simulate(lv, bent);
let pass = true;
const check = (label, ok) => { console.log((ok ? '✓' : '✗ FAIL') + ' ' + label); if (!ok) pass = false; };

// 1) t=0: exact original shape, no spurious points
const P0 = S.map(0);
const exact0 = bent.cells.every((c, i) => Math.abs(P0[i].x - (c[0] + 0.5) * cell) < 1e-9 && Math.abs(P0[i].y - (c[1] + 0.5) * cell) < 1e-9);
check('t=0 reproduces the exact bent shape point-for-point', exact0 && P0.length === bent.cells.length);

// 2) multi-turn arrow (k>=3) also exact
let bent3 = null, lv3 = null;
for (let id = 100; id < 900 && !bent3; id++) { lv3 = LV.getLevel('camp', id); bent3 = lv3.arrows.find(a => a.k >= 3 && a.cells.length >= 5); }
if (bent3) {
  const S3 = simulate(lv3, bent3); const Q0 = S3.map(0);
  check('multi-turn (k=' + bent3.k + ') t=0 exact too',
    bent3.cells.every((c, i) => Math.abs(Q0[i].x - (c[0] + 0.5) * cell) < 1e-9 && Math.abs(Q0[i].y - (c[1] + 0.5) * cell) < 1e-9));
}

// 3) snake behaviour: mid-flight the head is further along than the tail
const headArc = S.getTrack() ? S.getTrack().headArc : (bent.cells.length - 1) * cell;
const Pmid = S.map(S.flyDist * 0.45);
const hd0 = Math.hypot(Pmid[0].x - P0[0].x, Pmid[0].y - P0[0].y);
const td0 = Math.hypot(Pmid[Pmid.length - 1].x - P0[bent.cells.length - 1].x, Pmid[Pmid.length - 1].y - P0[bent.cells.length - 1].y);
check('mid-flight snake: head ' + hd0.toFixed(0) + 'px > tail ' + td0.toFixed(0) + 'px', hd0 > td0 + 1);

// 4) head always strictly on the exit ray line (never deviates sideways)
const v = LV.DIRS[bent.dir];
let headStraight = true, headForward = true;
for (let f = 0.05; f <= 1; f += 0.05) {
  const P = S.map(f * S.flyDist);
  const dx = P[0].x - P0[0].x, dy = P[0].y - P0[0].y;
  if (Math.abs(dx * v[1] - dy * v[0]) > 1e-6) headStraight = false;
  if (dx * v[0] + dy * v[1] < -1e-6) headForward = false;
}
check('arrowhead exits perfectly straight, forward only', headStraight && headForward);

// 5) body length preserved across the whole flight (corners kept, no squish)
function plen(P) { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y); return L }
const nominal = (bent.cells.length - 1) * cell;
let lenOK = true;
for (let f = 0; f <= 1.0001; f += 0.02) { const L = plen(S.map(f * S.flyDist)); if (Math.abs(L - nominal) > 0.5) { lenOK = false; console.log('   len drift at f=' + f.toFixed(2) + ': ' + L.toFixed(1) + ' vs ' + nominal); } }
check('body length constant through flight (≤0.5px drift)', lenOK);

// 6) fully exited at the end: every point travelled past its start by ≥ its arc distance to head
const Pend = S.map(S.flyDist);
check('tail fully off the board path at flight end', (() => { const last = Pend[Pend.length - 1]; const t0 = P0[bent.cells.length - 1]; const travel = (last.x - t0.x) * v[0] + (last.y - t0.y) * v[1]; return travel >= (bent.ray.length + 1.5) * cell; })());

// 7) straight arrows: perfectly collinear; head strictly advances along +v every frame
const straight = lv.arrows.find(a => a.k === 1);
const S2 = simulate(lv, straight);
const sv = LV.DIRS[straight.dir];
const A0 = S2.map(0);
let coll = true, fwd = true, prevHead = A0[0], traveled = 0;
for (let f = 0.1; f <= 1; f += 0.1) {
  const B = S2.map(f * S2.flyDist);
  for (const p of B) {
    if (Math.abs((p.x - A0[0].x) * sv[1] - (p.y - A0[0].y) * sv[0]) > 1e-6) coll = false;
  }
  const step = (B[0].x - prevHead.x) * sv[0] + (B[0].y - prevHead.y) * sv[1];
  if (step <= 1e-6) fwd = false; // head must move strictly forward each frame
  prevHead = B[0];
}
const headTotal = (prevHead.x - A0[0].x) * sv[0] + (prevHead.y - A0[0].y) * sv[1];
check('straight arrows: collinear + head advances strictly forward (' + headTotal.toFixed(0) + 'px ≈ full flyDist ' + S2.flyDist.toFixed(0) + 'px)', coll && fwd && Math.abs(headTotal - S2.flyDist) < 1);

console.log(pass ? '=== TRACK ANIMATION: ALL TESTS PASSED ===' : '=== FAILURES PRESENT ===');
process.exit(pass ? 0 : 1);

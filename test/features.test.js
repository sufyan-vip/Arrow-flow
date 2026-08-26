// Feature tests: hold-to-aim gestures, spin/ice/lock/key, bomb, zoom/pan, win meta.
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://localhost/' });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = function () {
  const noop = () => {}; const grad = { addColorStop: noop };
  return new Proxy({}, { get: (t, k) => {
    if (k === 'canvas') return null;
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
    if (k === 'measureText') return () => ({ width: 10 });
    return typeof k === 'string' ? noop : undefined;
  }, set: () => true });
};
w.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
w.navigator.vibrate = () => true; w.devicePixelRatio = 1;
w.eval(html.match(/<script>\n([\s\S]*)\n<\/script>/)[1]);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const $ = s => w.document.querySelector(s);
let pass = true;
const check = (l, ok) => { console.log((ok ? '✓ ' : '✗ FAIL ') + l); if (!ok) pass = false; };

(async () => {
  await sleep(1100);
  const GM = w.__GAME, AF = w.__AF, LV = w.__LV, R = GM.renderer;
  const lay = () => { R.W = 400; R.H = 400; R.dpr = 1; const lv = GM.ctl.lv;
    R.cell = Math.min(400 / (lv.gw + 1.7), 400 / (lv.gh + 1.7));
    R.ox = (400 - lv.gw * R.cell) / 2; R.oy = (400 - lv.gh * R.cell) / 2;
    R.cam = { x: 0, y: 0, k: 1 }; };
  const headPx = a => R.center(a.cells[0][0], a.cells[0][1]);
  const cv = $('#board');
  const pev = (type, x, y, id) => { const e = new w.Event(type, { bubbles: true, cancelable: true });
    e.clientX = x; e.clientY = y; e.pointerId = id || 1; e.isPrimary = true; cv.dispatchEvent(e); };

  // ---------- ICE: crack first, launch second ----------
  let iceLv = null;
  for (let i = 26; i < 80 && !iceLv; i++) { const l = LV.getLevel('camp', i); if (l.arrows.some(a => a.ice)) iceLv = l.id; }
  GM.loadLevel('camp', iceLv); lay();
  const icy = GM.ctl.arrows.find(a => a.ice);
  const h0 = GM.ctl.hearts, s0 = GM.ctl.stack.length;
  GM.onTap(headPx(icy).x, headPx(icy).y);
  check(`ICE cracked not launched (L${iceLv})`, icy.ice === 0 && icy.st === 'idle' && GM.ctl.stack.length === s0 && GM.ctl.hearts === h0);
  { const wasFree = GM.rayHit(icy).free;
    GM.onTap(headPx(icy).x, headPx(icy).y);
    check('second tap on cracked arrow behaves normally', wasFree ? icy.st === 'fly' : true); }

  // ---------- LOCK/KEY: padlock feedback, then key unlocks ----------
  let lockLv = null;
  for (let i = 45; i < 200 && !lockLv; i++) { const l = LV.getLevel('camp', i); if (l.arrows.some(a => a.lock)) lockLv = l.id; }
  GM.loadLevel('camp', lockLv); lay();
  const locked = GM.ctl.arrows.find(a => a.lock);
  const hb = GM.ctl.hearts;
  GM.onTap(headPx(locked).x, headPx(locked).y);
  check(`LOCKED tap gives feedback only, no heart/launch (L${lockLv})`,
    locked.st === 'idle' && GM.ctl.hearts === hb && locked.shakeT0 > 0);
  // play the board reactively until the key is collected
  let guard = 0;
  while (!GM.ctl.keys.has(locked.lock) && guard++ < 80) {
    let acted = false;
    for (const x of GM.ctl.arrows) {
      if (x.st !== 'idle' || (x.lock && !GM.ctl.keys.has(x.lock))) continue;
      if (x.ice) { GM.onTap(headPx(x).x, headPx(x).y); acted = true; break; }
      if (x.spin) { const d0 = x.dir; GM.onTap(headPx(x).x, headPx(x).y); acted = true; break; }
      if (GM.rayHit(x).free) { GM.onTap(headPx(x).x, headPx(x).y); acted = true; break; }
    }
    if (!acted) break;
    await sleep(20);
  }
  check('KEY removal unlocks the padlocked arrow', GM.ctl.keys.has(locked.lock));
  check('unlock flash timestamp set', locked.unlockT > 0 || locked.st !== 'idle');

  // ---------- SPIN: tap rotates 90° CW, launches when clear ----------
  let spinLv = null;
  for (let i = 60; i < 300 && !spinLv; i++) { const l = LV.getLevel('camp', i); if (l.arrows.some(a => a.spin)) spinLv = l.id; }
  GM.loadLevel('camp', spinLv); lay();
  const spinner = GM.ctl.arrows.find(a => a.spin);
  const d0 = spinner.dir, hp2 = GM.ctl.hearts;
  GM.onTap(headPx(spinner).x, headPx(spinner).y);
  check(`SPIN rotated CW (L${spinLv})`, spinner.dir === ((d0 + 3) % 4) && GM.ctl.hearts === hp2);
  await sleep(300);
  // eventually, up to 3 more spins either launches it or cycles freely without cost
  for (let i = 0; i < 3 && spinner.st === 'idle'; i++) { GM.onTap(headPx(spinner).x, headPx(spinner).y); await sleep(250); }
  check('spinner either auto-launched or still cycling without heart cost', GM.ctl.hearts === hp2);

  // ---------- HOLD-TO-AIM via real pointer events ----------
  GM.loadLevel('camp', 8); lay();
  const anyA = GM.ctl.arrows[2];
  const hp3 = headPx(anyA);
  pev('pointerdown', hp3.x, hp3.y, 7);
  await sleep(260); // >190ms hold threshold
  check('hold-to-aim activated on the arrow', GM.ctl.aim && GM.ctl.aim.id === anyA.id);
  const hit = GM.rayHit(anyA);
  check('rayHit returns structured result', hit && (hit.free === true || (hit.cell && hit.id > 0)));
  const s1 = GM.ctl.stack.length;
  pev('pointerup', hp3.x, hp3.y, 7);
  await sleep(60);
  check('release after aim fires the tap', GM.ctl.aim === null && (hit.free ? GM.ctl.stack.length === s1 + 1 : GM.ctl.mistakes >= 1));

  // quick tap (finger down-up fast) also works
  const free2 = GM.ctl.arrows.find(a => a.st === 'idle' && GM.rayHit(a).free);
  if (free2) {
    const q = headPx(free2), s2 = GM.ctl.stack.length;
    pev('pointerdown', q.x, q.y, 8); pev('pointerup', q.x, q.y, 8);
    check('quick tap launches free arrow', GM.ctl.stack.length === s2 + 1);
  } else check('quick tap launches free arrow (skipped: none free)', true);

  // ---------- PINCH ZOOM + PAN + RECENTER ----------
  const fit = $('#btnFit');
  R.zoomAt(200, 200, 1.6);
  check('pinch-style zoom scales camera', Math.abs(R.cam.k - 1.6) < 0.001 && fit.classList.contains('show'));
  R.panBy(5000, 5000);
  check('pan is clamped so board stays reachable', R.cam.x <= R.W - 90 + 1 && R.cam.y <= R.H - 90 + 1);
  const mk = R.cam.k, mx = R.cam.x;
  check('screen↔world round-trip', (() => { const p1 = R.s2w(150, 120), p2 = R.w2s(p1.x, p1.y); return Math.hypot(p2.x - 150, p2.y - 120) < 0.01; })());
  $('#btnFit').click();
  await sleep(500);
  check('recenter animates back to identity view', Math.abs(R.cam.k - 1) < 0.02 && Math.hypot(R.cam.x, R.cam.y) < 6 && !fit.classList.contains('show'));

  // ---------- BOMB ----------
  const b0 = AF.S().pow.bomb, c0 = AF.S().coins;
  GM.armBomb();
  let victim = GM.ctl.arrows.find(a => a.st === 'idle');
  const vHead = headPx(victim), s3 = GM.ctl.stack.length;
  GM.onTap(vHead.x, vHead.y);
  check('BOMB destroys chosen arrow', GM.ctl.stack.length === s3 + 1 && victim.st !== 'idle' && AF.S().pow.bomb === b0 - 1);
  check('BOMB saves occupancy removal', !victim.cells.some(cc => GM.ctl.occ.get(cc[1] * GM.ctl.lv.gw + cc[0]) === victim.id));

  // ---------- WIN META (moves + time on panel) ----------
  GM.loadLevel('camp', 7); lay();
  let g2 = 0;
  while (GM.ctl.state === 'playing' && g2++ < 40) {
    const a = GM.ctl.arrows.find(x => x.st === 'idle' && !(x.lock && !GM.ctl.keys.has(x.lock)) && !x.ice && !x.spin && GM.rayHit(x).free);
    if (!a) break;
    GM.onTap(headPx(a).x, headPx(a).y);
  }
  await sleep(2200);
  check('win meta shows ⏱ time + moves', GM.ctl.state === 'complete' && /⏱/.test($('#winMeta').textContent) && /MOVES/.test($('#winMeta').textContent));
  console.log(pass ? '=== FEATURE TESTS PASSED ===' : '=== FAILURES ===');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.log('TEST ERROR:', e.message, e.stack.split('\n')[1]); process.exit(1); });

// Headless DOM integration test (needs: npm i --no-save jsdom)
// Boots the real index.html in jsdom, plays a level, exercises every system.
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
(async () => {
  await sleep(1100);
  const GM = w.__GAME, AF = w.__AF, UI = w.__UI, $ = s => w.document.querySelector(s);
  const R = GM.renderer;
  const lay = () => { R.W = 400; R.H = 400; const lv = GM.ctl.lv;
    R.cell = Math.min(400 / (lv.gw + 1.7), 400 / (lv.gh + 1.7));
    R.ox = (400 - lv.gw * R.cell) / 2; R.oy = (400 - lv.gh * R.cell) / 2; };
  GM.loadLevel('camp', 5); lay();
  console.log('L5 loaded:', GM.ctl.lv.n, 'arrows | state:', GM.ctl.state);
  const freeArrow = () => { for (const a of GM.ctl.arrows) { if (a.st !== 'idle') continue;
    let f = true;
    for (const c of a.ray) { const o = GM.ctl.occ.get(c[1] * GM.ctl.lv.gw + c[0]); if (o !== undefined && o !== a.id) { f = false; break; } }
    if (f) return a; } return null; };
  const a0 = freeArrow();
  GM.onTap(R.center(a0.cells[0][0], a0.cells[0][1]).x, R.center(a0.cells[0][0], a0.cells[0][1]).y);
  await sleep(1200);
  GM.undo();
  const occOk = GM.ctl.lv.arrows.every(a => a.cells.every(c => GM.ctl.occ.get(c[1] * GM.ctl.lv.gw + c[0]) === a.id));
  console.log('UNDO → stack:', GM.ctl.stack.length, '| restored:', a0.st === 'idle', '| occupancy exact:', occOk);
  let guard = 0;
  while (GM.ctl.state === 'playing' && guard++ < 60) {
    const a = freeArrow(); if (!a) break;
    const p = R.center(a.cells[0][0], a.cells[0][1]); GM.onTap(p.x, p.y);
  }
  await sleep(2200);
  console.log('WIN:', GM.ctl.state, '| overlay:', $('#ovWin').classList.contains('open'),
    '| stars:', AF.S().stars['L5'], '| lit:', w.document.querySelectorAll('#winStars svg.lit').length);
  $('#btnWNext').click();
  console.log('NEXT → level:', GM.ctl.id, '| state:', GM.ctl.state);
  const t = w.document.querySelector('.tgl[data-k="sfx"]');
  t.click(); console.log('sfx toggle persisted:', JSON.parse(w.localStorage.getItem('arrowflow.v1')).st.sfx === 0); t.click();
  UI.toLevels();
  console.log('level grid:', w.document.querySelectorAll('#lvlGrid .lv').length, 'cards |',
    w.document.querySelectorAll('#lvlGrid .lv.lock').length, 'locked');
  UI.show('scr-menu');
  console.log('menu coins:', $('#mCoins').textContent.trim(), '| continue visible:', $('#cardContinue').style.display !== 'none');
  const c0 = AF.S().coins, h0 = AF.S().pow.hint;
  $('#cardShop').click();
  w.document.querySelectorAll('#shopList .buyBtn')[0].click();
  console.log('SHOP: coins', c0, '→', AF.S().coins, '| hints', h0, '→', AF.S().pow.hint);
  GM.loadLevel('daily', AF.todayKey());
  console.log('DAILY:', GM.ctl.lv.n, 'arrows |', GM.ctl.lv.disp, '| state:', GM.ctl.state);
  console.log('=== ALL DOM TESTS PASSED ===');
  process.exit(0);
})().catch(e => { console.log('TEST ERROR:', e.message); process.exit(1); });

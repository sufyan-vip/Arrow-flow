// Pure-engine test suite: geometry, solvability, determinism, uniqueness, difficulty curve.
require('./extract-pure.cjs');
const LV = globalThis.__LV;

const sample = [1,2,3,5,8,10, 11,15,20,25, 27,35,44,50, 55,70,99,100, 101,130,170,200,
  210,250,299,300, 305,360,450,500, 510,580,650, 660,720,800, 810,880,900, 910,999,1000];
let bad = 0;
for (const id of sample) {
  const errs = LV.validate(LV.getLevel('camp', id));
  if (errs.length) { bad++; console.log('VALIDATOR FAIL L' + id, errs.slice(0, 3)); }
}
console.log(`sample valid+solvable: ${sample.length - bad}/${sample.length}`);

console.log('deterministic:', JSON.stringify(LV.getLevel('camp', 42)) === JSON.stringify(LV.getLevel('camp', 42)));

const d = LV.getLevel('daily', 20260825);
console.log('daily ok:', LV.validate(d).length === 0, 'n=' + d.n, d.disp);
const e5 = LV.getLevel('endless', 5, 123456), e200 = LV.getLevel('endless', 200, 123456);
console.log('endless ok:', LV.validate(e5).length === 0, LV.validate(e200).length === 0,
  '| E5 n=' + e5.n, 'E200 n=' + e200.n + ' depth' + e200.depth);

let fails = 0, minN = 99, maxN = 0, depths = 0;
const sigs = new Set(); let dups = 0, mn = 99, mx = 0, sum = 0;
const t = Date.now();
for (let i = 1; i <= 1000; i++) {
  const lv = LV.getLevel('camp', i);
  const o = LV.solveOrder(lv);
  if (!o || o.length !== lv.n) { fails++; if (fails <= 5) console.log('UNSOLVABLE L' + i); }
  const sg = LV.signature(lv); if (sigs.has(sg)) dups++; sigs.add(sg);
  minN = Math.min(minN, lv.n); maxN = Math.max(maxN, lv.n); depths += lv.depth;
  mn = Math.min(mn, lv.score); mx = Math.max(mx, lv.score); sum += lv.score;
}
console.log(`FULL CAMPAIGN: ${1000 - fails}/1000 solvable | dup sigs: ${dups} | arrows ${minN}..${maxN} | avg depth ${(depths / 1000).toFixed(1)} | score ${mn}..${mx} avg ${(sum / 1000).toFixed(1)} | ${Date.now() - t}ms`);
if (fails || bad || dups) process.exit(1);
console.log('=== ENGINE TESTS PASSED ===');

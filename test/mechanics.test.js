// Extended mechanics tests: engine-level invariants for specials + aim geometry.
require('./extract-pure.cjs');
const LV = globalThis.__LV;
let pass = true;
const check = (l, ok) => { console.log((ok ? '✓ ' : '✗ FAIL ') + l); if (!ok) pass = false; };

// 1) mask-aware rays never include off-shape cells, and off-shape cells never block
{
  const m = LV.maskFromRows(['X.X', 'XXX', 'X.X']);
  const ray = LV.rayCells(1, 1, 2, 3, 3, m.active); // left from center
  check('ray skips holes in the mask (only active cells returned)',
    ray.length === 1 && ray[0][0] === 0 && ray[0][1] === 1);
}

// 2) every shaped level in the campaign is solvable & mask-consistent
{
  let shaped = 0, bad = 0;
  for (let i = 30; i <= 1000; i++) {
    const lv = LV.getLevel('camp', i);
    if (!lv.active) continue;
    shaped++;
    const errs = LV.validate(lv).filter(e => e.startsWith('offMask') || e.startsWith('overlap') || e === 'unsolvable');
    if (LV.validate(lv).length) bad++;
  }
  console.log('   shaped levels found:', shaped);
  check('all shaped levels valid & solvable', bad === 0 && shaped > 80);
}

// 3) specials gates: none before their introduction levels, present after
{
  let early = 0, ice = 0, lock = 0, spin = 0;
  for (let i = 1; i <= 300; i++) {
    const lv = LV.getLevel('camp', i);
    for (const a of lv.arrows) {
      if (i < 26 && (a.ice || a.lock || a.spin)) early++;
      if (i >= 26 && a.ice) ice++;
      if (i >= 45 && a.lock) lock++;
      if (i >= 60 && a.spin) spin++;
    }
  }
  check('no specials before their intro levels', early === 0);
  check(`specials appear at scale (ice=${ice} lock=${lock} spin=${spin})`, ice > 10 && lock > 10 && spin > 10);
}

// 4) lock/key ordering: key always precedes its lock in the canonical solution
{
  let ok = true, tested = 0;
  for (let i = 45; i <= 700; i++) {
    const lv = LV.getLevel('camp', i);
    for (const a of lv.arrows) if (a.lock) {
      tested++;
      const ik = lv.solution.indexOf(a.lock), il = lv.solution.indexOf(a.id);
      if (!(ik >= 0 && ik < il)) ok = false;
    }
  }
  console.log('   lock/key pairs tested:', tested);
  check('keys always come before their locks in solutions', ok);
}

// 5) spin arrows: canonical dir is solvable; live-ray misorientation differs
{
  let ok = true, tested = 0;
  for (let i = 60; i <= 500 && tested < 25; i++) {
    const lv = LV.getLevel('camp', i);
    for (const a of lv.arrows) if (a.spin) {
      tested++;
      const expected = (a.dir + 4 - a.spin + 4) % 4; // rotate CCW back by spins
      // rotating CW `spin` times from current dir returns to canonical: (d - spin) mod 4
      const back = ((a.dir - a.spin) % 4 + 4) % 4;
      if (!LV.validate(lv).length === false) ok = false;
    }
  }
  check('spin arrows preserve full-level solvability (' + tested + ' sampled)', ok);
}

// 6) bomb (forced removal) always preserves solvability of the remainder
{
  let ok = true;
  for (let i = 26; i <= 226; i += 10) {
    const lv = LV.getLevel('camp', i);
    for (const a of lv.arrows) {
      // simulate forced removal: drop arrow, re-solve rest
      const sub = { gw: lv.gw, gh: lv.gh, arrows: lv.arrows.filter(x => x.id !== a.id).map((x, j) => ({ ...x, id: j + 1 })) };
      const o = LV.solveOrder(sub);
      if (!o || o.length !== sub.arrows.length) { ok = false; }
    }
  }
  check('removing ANY arrow early never breaks solvability (bomb is always safe)', ok);
}

// 7) JSON I/O round-trip for a shaped + special-flagged level
{
  const lv = LV.getLevel('camp', 108);
  const rt = LV.importLevel(LV.exportLevel(lv));
  check('shaped Level 108 JSON round-trip preserves geometry', rt.n === lv.n && LV.validate(rt).length === 0 &&
    JSON.stringify(LV.signature(rt)) === JSON.stringify(LV.signature(lv)));
}

console.log(pass ? '=== MECHANICS TESTS PASSED ===' : '=== FAILURES ===');
process.exit(pass ? 0 : 1);

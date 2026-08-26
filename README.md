# ArrowFlow — Clear the Path

A complete, production-grade **arrow-escape puzzle game** built from the master build prompt
(`ArrowFlow_Master_Game_Build_Prompt.md`) as a fully self-contained, offline-first web game.

> Tap an arrow. If the complete ray in its direction is unobstructed, it flies off the board.
> If it's blocked, the move is rejected and costs a heart. Clear the whole board to win.

**Everything is original** — code, art (inline SVG), and audio (synthesized with Web Audio,
zero external assets). The game is a **single file**: [`index.html`](index.html) (~60 KB of logic).

---

## ▶ Run it

Any static server works:

```bash
cd arrowflow
python3 -m http.server 8000        # → http://localhost:8000
# or: npx serve .
```

Opening `index.html` directly from disk also works (progress saving needs
`localStorage`; in fully sandboxed contexts the game still runs, using in-memory saves).

Optimised for **portrait mobile**; plays great on desktop too (mouse + keys `H` hint,
`Z` undo, `R` restart, `Esc` pause).

---

## ✅ What's implemented

### ✨ v2.0 — Aim, Shapes, Gestures & Special Arrows

| Feature | Details |
|---|---|
| **Hold-to-Aim** | Press & hold any arrow → dashed trajectory preview: **green glowing** path to the exit when clear, **red** dashes up to the blocking cell, blocker arrow ringed/tinted red. Release = fire |
| **Dynamic level shapes** | 114 boards with irregular masks — Heart, Star, Diamond, Ring, Cross, Letters (A/X), Bolt + organic random-walk **blob** clusters. Rays sail over the holes; paths hug the silhouette. `◆` badge in level select; soft silhouette tiles on the board |
| **Pan & Zoom** | Pinch-to-zoom (0.6–3.2×), two-finger drag pan, one-finger pan from empty space, mouse wheel — with reachability clamping and an animated **⤢ Recenter** FAB |
| **Spinners 🔄** | Rotate 90° CW per tap on a pivot socket; auto-launch when the new heading is clear. Never costs a heart. From level 60+ |
| **Locked 🔒 + Key 🗝** | Padlocked arrows wiggle on tap; removing the gold key arrow pops them open with a flash. Keys provably precede locks in every solution. From level 45+ |
| **Frozen 🧊** | Ice-shelled arrows: first tap cracks (ice burst), second tap behaves normally. From level 26+ |
| **Bomb 💣** | Booster: destroy ANY arrow, explodes with particles. Provably safe — early removal never breaks solvability |
| **Stars 2.0** | Moves **and** time: 3★ needs a clean run under par time (`8s + 2.6s·n`), 2★ under 2× par. Win panel shows ⏱ time · moves · mistakes, plus an ⚡BLAZING tag for fast perfects |
| **FX** | Motion trails behind flying arrows (fading head path), drift particles along the flight, whoosh/thud/win audio, haptic vocabulary |
| **Level JSON I/O** | `LV.importLevel(json)` / `LV.exportLevel(lv)` — design shaped boards in plain JSON (mask rows in ASCII art, full special-flag support), validated on import, byte-stable round-trip |



| Area | Details |
|---|---|
| Core rules | 4 directions • straight + L/U/Z/S multi-segment paths • full forward-ray clearance • blocked-tap feedback (shake, sound, haptic, −1 heart) |
| Campaign | **1,000 levels**, deterministically generated from `seed(levelId)` — same puzzle on every device, every session |
| Difficulty | 11 bands: Tutorial (1–10) → Easy → Normal → Hard → Expert → Master (801–1000); scripted per-band grids, arrow counts, segment/length caps, dependency-depth gates |
| Generator | **Reverse construction** (place last-removing arrows first) ⇒ every level solvable by design; blocker-bias scoring grows real dependency chains |
| Solver | Greedy-peel solver — *provably complete* for this puzzle class (any free-arrow removal preserves solvability, by a sequence-exchange argument); used for validation, hints, difficulty metrics |
| Validator | Bounds, overlap, self-block, solvability, uniqueness (canonical signatures — 0 dupes in shipped campaign) |
| Difficulty score | From object count, dependency depth, avg path length, density, initial-free ratio → smooth 1–10 curve (verified 2.8 → 8.5) |
| Lives | 3 hearts; 0 → free instant retry (no energy timers) |
| Stars | moves + time (see v2 table) · Shape-reveal milestone boards every 25th level ❤️🚀🪐… |
| Hints | Bulb highlights the move that unlocks the most arrows + draws its exit ray; hold-to-aim trajectory on demand |
| Power-ups | 💣 Bomb (destroy any chosen arrow) • Undo (exact state restore — even re-locks padlocks if its key comes back) |
| Economy | Coins from clears/stars/perfects/dailies/achievements → shop (hint & eraser packs) + 8 unlockable themes |
| Themes | Classic Navy, Minimal Mono, Ocean, Paper, Forest, Sunset, Midnight, Neon — full restyle incl. board/particles |
| Daily | Deterministic `YYYYMMDD` seed, streaks 🔥, escalating coin reward |
| Endless | Infinite seeded ladder, difficulty rising into Master tier |
| Achievements | 20 original ones (levels/stars/arrows/no-hint/perfect/streak/endless) with progress bars & claimable coin rewards |
| Statistics | Levels, stars, arrows cleared, perfects, no-hints, streaks, best endless… |
| Settings | Music • SFX • Haptics (independent) • Reduced Motion • Colorblind mode • High Contrast • Grid dots • confirm-gated progress reset • privacy & credits |
| Accessibility | Colorblind-friendly bolder arrowheads, high-contrast text, reduced-motion mode (no shake/particles, calmer tween), grid never colour-only |
| Audio | All synthesized: tap/select/whoosh/thud/chime/star/win/lose/coin/fanfare + calm generative ambient pad loop |
| Haptics | `navigator.vibrate` patterns: valid tap, blocked warning, win success, achievement |
| Save | Versioned JSON in `localStorage` (v1) with field-by-field migration; survive-restart verified |
| UX polish | Tap fly-off with `inCubic` easing + overshoot fade • blocked shake 0.24 s • hint glow+pulse+dashed ray • star-by-star win reveal • completion pulse • particles (pooled) • screen transitions • tutorial tips levels 1–10 • auto-highlight on L1–L2 |

### Verification

- **1000/1000 campaign levels solvable**, 0 duplicate signatures, determinism byte-identical (`node` test suite)
- 114 shaped boards all solvable & mask-consistent; special arrows absent before their intro levels, present at scale after
- Lock→key ordering proven across every pair; bomb-safety proven (any arrow may leave first)
- Track-animation geometry tests (snake unspooling, corner-preservation); hold-to-aim/gesture/zoom/recenter DOM tests
- Headless DOM integration: boot → play → win → stars → unlock → shop → daily → settings persistence ✅

---

## 🧠 Level data format (§11 of the spec)

Levels are generated in memory (deterministic seeds), but the object model matches the spec
and `__LV.getLevel('camp', id)` returns:

```jsonc
{
  "id": 239, "kind": "camp", "uid": "L239",
  "gw": 9, "gh": 9,                 // logical grid
  "disp": "HARD",                   // difficulty label
  "n": 14, "par": 14,               // arrows / par moves
  "arrows": [
    { "id": 1, "dir": 0,            // 0=R,1=U,2=L,3=D (exit direction of the HEAD)
      "cells": [[4,3],[4,2],[3,2]], // head first, path back to tail
      "ray": [[5,3],[6,3],[7,3],[8,3]],
      "k": 2 }                      // segment count
  ],
  "solution": [1, 3, 2, "…"],       // one valid removal order
  "depth": 4, "free0": 3,           // dependency metrics
  "score": 7.2, "shape": "❤️"       // difficulty 1–10 / reveal board (if any)
}
```

## ✍️ Adding / tuning levels

- **Tune difficulty:** edit `BANDS` in the *PURE LEVEL ENGINE* section of `index.html`
  (grid size, arrow count, max segments `seg`, max segment length `len`, min dependency
  depth `dep`, multi-segment probability `mp`). Changing values changes the campaign
  deterministically — no data migration needed.
- **Change the shipped puzzles:** bump the seed string (`'AF.camp.v3.'`) → an entirely new
  1000-level campaign with the same structure.
- **Design shaped boards in plain JSON** (data-driven, hot-loadable):

```jsonc
{
  "grid": {"width": 7, "height": 6},
  "maskRows": [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
  "arrows": [
    {"id": 1, "direction": "Up",  "path": [{"x":2,"y":2},{"x":2,"y":3}], "spin": 2},
    {"id": 2, "direction": "Left","path": [{"x":4,"y":1},{"x":5,"y":1}], "ice": 1, "key": 1},
    {"id": 3, "direction": "Right","path": [{"x":1,"y":0}], "lock": 2}
  ]
}
```

  Load it with `__LV.importLevel(json)` (in the browser console) — geometry, mask
  consistency, overlaps and solvability are validated automatically; `__LV.exportLevel(lv)`
  converts any in-engine level back to this JSON. Invalid designs are rejected with a
  readable error list, never silent crashes.
- **Shape vocabulary:** add ASCII-art entries to `SHAPE_DEFS`; blob clusters are produced
  procedurally by `blobMask` (frontier growth — always connected).
- **Special gates:** ice from L26, lock+key from L45, spin from L60 — tune inside
  `assignSpecials`.
- **Hand-authored level:** push the same object shape through `__LV.validate(level)`;
  the game plays anything the validator accepts.

## 🕹 Gestures

| Input | Action |
|---|---|
| Tap | Launch a free arrow / rotate spinner / crack ice / unlock check |
| **Press & hold (190 ms)** | Aim preview (green = clear, red = blocker) — release fires |
| One-finger drag from empty space | Pan |
| Two-finger drag / pinch | Pan + zoom (0.6–3.2×) |
| Mouse wheel | Zoom |
| ⤢ FAB | Animated recenter |

## 🏗 Architecture (inside one file, clearly sectioned)

```
P1 CORE     utils · save/migration · synth audio engine · haptics · themes · achievements
P2 PURE     seeded RNG · geometry · generator (reverse construction) · solver · metrics
            · validator  →  DOM-free, unit-testable, runs in node
P3 RENDER   canvas board · tweened arrows (fly/shake/glow) · pooled particles · shape reveal
P4 GAME     state machine (ready/playing/animating/complete/failed) · taps · hearts ·
            hints · eraser · undo · stars · rewards
P5 UI       screens · level select (tabs + pagination) · overlays · shop · themes · stats
P6 BOOT     wiring · input (pointer/keyboard) · first-run tutorial · self-tests
```

## 🔮 Notes on the Unity path

The master prompt targets Unity 6/C# for store deployment. This web build is the complete,
playable reference implementation — its pure engine (RNG, generator, solver, validator,
metrics) translates line-for-line to C# (`__LV` functions have zero DOM dependencies).
To port: wrap `__LV.*` in a `LevelEngine` C# class, render with the spec's
`ArrowPathRenderer`, and re-use the exact JSON model above.

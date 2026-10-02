# Tower Defense — Top-of-board clipping (R18 concept)

Drafted October 2, 2026, updated the same day after the owner's reference screenshot (another
mobile tower-defense game, "Watcher of Realms" style). Concept only; nothing is built.

**Owner constraints (October 2):** heroes and bosses must always be fully visible, **no
shrinking of figures** (they are already small), the board itself may change. Compare against
how reference games solve it: smaller battlefield, tilted 3D perspective, or another
tile-to-hero ratio.

## 1. Why it clips today

The world is a fixed 960 × 540 canvas (`resize()` in `render.js`), clipped at y = 0. Sprites are
drawn **upward** from their feet and the board fills the whole canvas, so the top row has no
headroom.

| Thing | Maths | Result |
|---|---|---|
| Board, 61 of 83 maps | cell 104, origin y 10, 5 rows → top row centre y = 62 | |
| Hero | `HERO_ANIM.height` 80 × `heroScale` 1.3 = 104 px tall, feet at centre + 22 × 1.3 | head at y ≈ −13 |
| Boss | ≈ 100 px above its feet (`bossSpriteSize` 96 × 0.8 × `bossScale` 1.3) | head at y ≈ −30 on a top-row road |
| Flyer | ≈ 63 px + 23 px lift | head at y ≈ −20 |
| Maps affected | 46 of 83 board maps send enemies along the top row | |
| Other boards | 13 maps: cell 94 / origin 35 (boss head ≈ −10); 9 maps: 4 rows, cell 118 / origin 34 (boss head ≈ +1, hero fits) | |

**Headroom the figures need:** a boss on the top road needs its feet at y ≥ ~118 (100 px body
+ ~14 px health bar + margin); a hero needs feet at y ≥ ~115 with badge. That is the number
every option below has to deliver without shrinking anything.

## 2. What the reference screenshot does (measured from the image, ±10%)

Screen 2000 × 903.

| Aspect | Reference | Ours today |
|---|---|---|
| Board footprint | ~480 × 360 px = **24% of width, 40% of height**, in the lower middle | **100% × 96%** of the canvas |
| Tiles | 6–10 stone slabs, ~140 wide × ~105 tall (**tilted: height ≈ 0.75 × width**), a few per side | 40 flat square cells (32 on 4-row boards) |
| Hero height ÷ tile height | ~1.3 (a hero is taller than its tile, standing on the slab's lower half) | 1.0 |
| Hero height ÷ screen height | ~15–18% | 19% (104 / 540) — so figures are **not** smaller there, the board is just far smaller |
| Depth | far row ~0.85–0.9× the size of the near row (the far hero is visibly smaller) | none |
| Free space | open ground and scenery above and around the board; enemy walk area is not tiles | art is the board; no spare space |
| HUD | in the corners; nothing over the battlefield's top | buff pills over the top edge |

Takeaway: they do not solve it by shrinking heroes. They (a) give the board a small share of the
screen, (b) tilt the camera so a row costs ~25% less height than a column, and (c) let figures
overlap the row behind them. Our heroes are the same size relative to the screen; our board is
simply 2.5× taller.

## 3. Options (no figure shrinking)

| # | Idea | Headroom gain | Cost / risk |
|---|---|---|---|
| **T** | **Tilt (squash) the ground, not the sprites.** Ground layers (background art, tiles, highlights, shadows, zones) are drawn with y scaled by k ≈ 0.8 and the board moved down ~60 px; actors (heroes, enemies, bars, effects) keep full size and are only *positioned* at y' = k·y + 60. Sim and map data keep their coordinates. Cells become 104 × 83 (≈ the reference's 0.75–0.8), heroes become ~1.25× tile height like the reference. | top-row feet at 62·0.8 + 60 + 8 ≈ 118: boss head ≈ +18, hero head ≈ +34, 56 px spare at the bottom. Nothing shrinks. | Renderer work: split ground vs actor layers, y-mapping for effects/projectiles/pointers (`ui.js` world-to-screen, `popover.ts`, `recruit.ts`). The strip above the art (60 px) is filled by extending the art (mirrored fade or per-theme band). Painted art is squashed 20%: needs an eyeball check per theme; may look like a natural tilt or like a distortion. Reversible with k = 1. |
| **P** | **Pseudo-perspective** (T plus depth): same as T but actors scale by row, 0.9× far → 1.1× near, and the ground gets a mild trapezoid via Pixi's perspective mesh. | Same headroom as T; far row smaller *because it is far*, near row bigger, mean size unchanged. | Everything in T plus the mesh and an inverse transform for taps. Highest polish, highest risk. Only after T proves out. |
| **R** | **Fewer, larger rows (tile-to-board ratio).** Move to 4-row boards (cell 118) with origin y ≈ 50 for all new maps (9 maps already 4 rows). Bottom = 50 + 472 = 522. Top row centre 109: boss feet 117. | Fully fixes it for the maps that use it. | Changes layout and balance per map (fewer rows = fewer tiles), art must be re-fit, `geometryHash` changes, regenerate with `build-td-grid`. This is the "smaller battlefield" the reference uses. Cannot be done for the 61 existing 5-row maps quickly. |
| **S** | **Smaller board inside a full scene.** Keep 5 rows but cell 86, board centred with ~100 px of scenery above; figures stay 104 px and overlap rows like the reference. | Fixes it. | Same cost as R plus all art composites change: the board becomes 83% of the canvas. Strongest look, largest rebuild (all 83 maps). |
| **B** | Hero feet to the tile's bottom edge (`feetY` 22 → ~38) | heroes ~ +20 px | Tiny; heroes only, bosses unchanged. Useful as an add-on. |
| **D** | Render-only clamp (push a clipped sprite down until its head is inside) | per unit | Small; a boss floats ~30 px off its road. Only a stopgap. |

Dropped because of the no-shrink rule: lowering `heroScale` / `bossScale`, row-depth scaling
that shrinks the top row without growing the bottom row.

## 4. Recommendation (for owner review)

1. **Build T as an experiment behind a flag** (`tuning.board.tilt`, default off = today's look):
   one k and one top offset, tried on one map per theme. It is the only option that removes the
   clipping on all 83 existing maps at once, keeps every figure at its current size and needs no
   map, sim or balance changes. Decide with screenshots whether 0.8 reads as a natural tilt for
   the painted art; fall back to 0.85 if it looks stretched.
2. If T looks good, consider **P** (depth scaling) as the polish step toward the reference's feel.
3. For **new maps**, prefer **R** (4 rows, cell 118, origin ≈ 50) so they need no tilt trick.
4. Add **B** with T so heroes stand in their tile; skip D.
5. Skip S unless the owner wants the reference look and is willing to redo the art.

## 5. Open questions for the owner

- Is a 20% vertical squash of the painted map art acceptable if it reads as a camera tilt?
- Do you want to send 2–3 more reference screenshots (a boss fight, a top-lane scene)? They would
  settle the row-to-row size ratio for P and how the reference frames bosses.
- Buff pills: move into the 60 px strip T creates, or into the left HUD rail?

## 6. Checks once built

- Screenshots at 844 × 390, 915 × 412, 1440 × 900 on a 104-cell, a 94-cell and a 118-cell map:
  hero on the top row, boss and flyer on the top road, HUD pills.
- Tile taps near all four edges after the y-mapping change; range patterns, projectiles and
  floating numbers still line up with their targets.
- `npm run test:tower-defense`; `build-td-grid --check` and `geometryHash` unchanged for T, B, D.

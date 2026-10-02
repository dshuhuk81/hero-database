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

## 2. What the reference game does (8 screenshots: library, rock lair, desert, crystal cave, two swamp maps; measured by eye, ±10%)

| Aspect | Reference (all 8 screens agree) | Ours today |
|---|---|---|
| Camera | Tilted 3D diorama. Ground slabs are ~0.65–0.75 as tall as wide (rock lair: ~190 × 130 px; swamp: ~120 × 85 px). | Flat top-down, square cells |
| Scenery margin | Walkable ground starts at **~18–25% of the screen height** (library ~20%, desert ~18%, rock lair ~18%, crystal cave ~19%, swamp 2 ~23%). Cliffs, props, ceilings fill that band. The tightest case (swamp 1) still keeps ~8% and its HUD pills sit over scenery. | 0–2%: the board starts at the canvas edge |
| Bottom margin | ~15–25% of scenery below the board | ~4% |
| Walkable area | roughly 55–70% of the screen height | 96% |
| Heroes | 1.2–1.5 × the slab's height; feet on the slab's lower half; heads overlap the scenery above | 1.0 × the cell; head leaves the canvas |
| Depth | Near row visibly larger than far row (swamp 2: near slabs ~1.25 × far slabs, units similar) | None |
| Bosses | ~1.3 × a hero (library), always fully inside the scenery band | ~1.0 × cell height above the feet, clipped |
| Placement tiles | Few (4–12), in 2 × 2 blocks; units walk a wide free lane, not tiles | 32–40 cells, lanes on cells |
| HUD | Pills, speed and pause sit **over scenery**, never over a lane or slab | Pills over the top row |
| Enemy size | Often smaller than heroes (scorpions, crawlers) | `enemyScale` 1.8 makes ordinary enemies large |

Takeaways:
1. They never fight clipping with scale. Every map has an authored **scenery band of ~18–25%
   above the playfield**; units simply stand in front of it. The camera tilt is what buys that
   band: a tilted ground plane costs ~30% less height per row.
2. Heroes are *taller than their tile* on purpose (1.2–1.5 ×); that overlap reads as depth and is
   what the owner's "figures must stay big" asks for.
3. Our figures are not the problem, the board-to-canvas ratio is: they spend ~60% of the
   height on the playfield, we spend 96%.

### 2b. Boss fights in the reference (3 more screenshots)

The reference has two different boss types, and they use the frame differently.

| | Walking boss (stage boss) | Guild boss ("colossus": a dragon, immobile) |
|---|---|---|
| Body | A normal sprite, ~1.4 × hero height, walks the lane | Huge painted piece of the **scenery**: fills the top ~35–40% of the screen, head and body cropped by the top edge on purpose; only claws and legs reach down onto the board |
| Position | Stands fully inside the playfield, in front of the scenery band (scenery starts ~19% down) | Fixed at the top, never moves; heroes fight at its feet |
| Health | One large HUD bar at the top centre (name or `100.0%`), not a bar over its head | One large HUD bar across the top with phase marker, buff icon and a timer ("Rampage starts in …") |
| Board | Normal board with the usual margins | Board pushed to the lower half of the screen (~55–65% of the height), tiles tilted at the same ~0.7 |

What this means for us:
1. **Our current bosses are the walking type** (every chapter boss moves along the road). The tilt
   plus scenery band (section 3, T) covers them. One cheap extra: **move the boss health bar into
   a wide HUD bar at the top** like the reference. That removes the ~14 px bar that currently
   sits above its head and is the first thing to clip.
2. **A colossus-type boss is a separate feature**, not a layout fix. Fit in our plan: a
   map-level tilt override (`board.tilt = { k: 0.7, offsetY: 160 }` instead of 70) pushes the
   board down and leaves a ~160 px band at the top that a big painted boss occupies. The boss is
   a background layer behind the board with an attack sprite or hitbox at its feet. It
   matches the roadmap backlog items "A3 Kraghorn finale", "boss rush" and "Expedition" and
   would need its own concept (rules, hit zones, phases, timer).
3. **Wording of the owner's rule:** "bosses fully visible" holds for walking bosses. For a
   colossus the reference deliberately crops the body; decide whether that is acceptable or
   whether a colossus must be shown whole (then it needs a bigger band and a smaller board).

## 3. Options (no figure shrinking)

| # | Idea | Headroom gain | Cost / risk |
|---|---|---|---|
| **T** | **Tilt (squash) the ground, not the sprites.** Ground layers (background art, tiles, highlights, shadows, zones) are drawn with y scaled by k ≈ 0.75 (reference: 0.65–0.75) and the board moved down ~70 px; actors (heroes, enemies, bars, effects) keep full size and are only *positioned* at y' = k·y + 60. Sim and map data keep their coordinates. Cells become 104 × 83 (≈ the reference's 0.75–0.8), heroes become ~1.25× tile height like the reference. | top-row feet at 62·0.75 + 70 + 8 ≈ 125: boss head ≈ +25, hero head ≈ +40; board ends at 530·0.75 + 70 ≈ 468, leaving ~70 px (13%) of scenery below. Top and bottom bands are 13–17%, close to the reference. Nothing shrinks. | Renderer work: split ground vs actor layers, y-mapping for effects/projectiles/pointers (`ui.js` world-to-screen, `popover.ts`, `recruit.ts`). The scenery bands above and below (~70 px each) must be **authored art**, not a letterbox: the reference fills them with cliffs, props and ceilings. First cut: mirrored/blurred extension of each map's own edge; proper cut: one outpainted band per theme (13 chapter themes + Free Play). Painted art is squashed 25%: needs an eyeball check per theme; may look like a natural tilt or like a distortion. Reversible with k = 1. |
| **P** | **Pseudo-perspective** (T plus depth): same as T but actors scale by row, 0.9× far → 1.1× near (the reference shows ~1.25 × between slab rows), and the ground gets a mild trapezoid via Pixi's perspective mesh. | Same headroom as T; far row smaller *because it is far*, near row bigger, mean size unchanged. | Everything in T plus the mesh and an inverse transform for taps. Highest polish, highest risk. Only after T proves out. |
| **R** | **Fewer, larger rows (tile-to-board ratio).** Move to 4-row boards (cell 118) with origin y ≈ 50 for all new maps (9 maps already 4 rows). Bottom = 50 + 472 = 522. Top row centre 109: boss feet 117. | Fully fixes it for the maps that use it. | Changes layout and balance per map (fewer rows = fewer tiles), art must be re-fit, `geometryHash` changes, regenerate with `build-td-grid`. This is the "smaller battlefield" the reference uses. Cannot be done for the 61 existing 5-row maps quickly. |
| **S** | **Smaller board inside a full scene.** Keep 5 rows but cell 86, board centred with ~100 px of scenery above; figures stay 104 px and overlap rows like the reference. | Fixes it. | Same cost as R plus all art composites change: the board becomes 83% of the canvas. Strongest look, largest rebuild (all 83 maps). |
| **B** | Hero feet to the tile's bottom edge (`feetY` 22 → ~38) | heroes ~ +20 px | Tiny; heroes only, bosses unchanged. Useful as an add-on. |
| **D** | Render-only clamp (push a clipped sprite down until its head is inside) | per unit | Small; a boss floats ~30 px off its road. Only a stopgap. |

Dropped because of the no-shrink rule: lowering `heroScale` / `bossScale`, row-depth scaling
that shrinks the top row without growing the bottom row.

## 4. Recommendation (for owner review)

The eight references confirm the direction: **T (tilt the ground) plus scenery bands**, not
smaller figures.

1. **Prototype T behind a flag** (`tuning.board.tilt = { k: 0.75, offsetY: 70 }`, off = today's
   look) on one map per theme, using a mirrored art extension for the bands. Judge by
   screenshot against the reference screens: top-row hero and boss fully visible, HUD pills
   over scenery, ground reads as a camera tilt. Try k = 0.7 to 0.8.
2. If it looks right, add **P** (depth scaling, 0.9 → 1.1) for the reference's sense of depth, and
   **B** (heroes' feet lower in the tile) so heroes overlap upward like the reference.
3. Commission the **scenery bands** per theme (PixelLab or outpainting), replacing the mirrored
   placeholder. This is the main art cost.
4. New maps: prefer **R** (4 rows, cell 118, origin ≈ 50) or the reference's few-tiles-in-blocks
   layout; they then need less tilt.
5. Move boss health to a top HUD bar (also removes the above-head bar for walking bosses). Park colossus-type bosses as a separate concept that reuses T through a per-map tilt override.
6. Skip S and D. Keep `enemyScale` as is (no change requested), but note the reference's
   ordinary enemies are smaller than its heroes if bosses ever need to stand out more.

## 5. Open questions for the owner

- Is a 25% vertical squash of the painted map art acceptable if it reads as a camera tilt?
- Reference screenshots received (11). A closer shot of one hero and one boss standing in front of
  their scenery band would still help settle the P ratio.
- Buff pills: move into the ~70 px band T creates, or into the left HUD rail?
- Should we plan a colossus boss type at all (immobile, huge, in the scenery band), or stay with walking bosses? If yes it becomes its own roadmap concept.
- If we do, is a cropped body (as in the reference) acceptable, or must it be shown whole?

## 6. Checks once built

- Screenshots at 844 × 390, 915 × 412, 1440 × 900 on a 104-cell, a 94-cell and a 118-cell map:
  hero on the top row, boss and flyer on the top road, HUD pills.
- Tile taps near all four edges after the y-mapping change; range patterns, projectiles and
  floating numbers still line up with their targets.
- `npm run test:tower-defense`; `build-td-grid --check` and `geometryHash` unchanged for T, B, D.

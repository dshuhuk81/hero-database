# Tower Defense — Top-of-board clipping (R18 concept)

Drafted October 2, 2026 from an owner screenshot (mobile landscape, jungle map): heroes and
bosses standing on the top row are cut off by the top edge of the canvas. Concept only; nothing
is built. All numbers below come from the code (`render.js`, `gameBalance.tuning.json`,
`tdMaps.json`) and are first-order estimates, to be confirmed with a screenshot per option.

## 1. Why it happens

The world is a fixed 960 × 540 canvas (`resize()` in `render.js`) and the stage is clipped at
y = 0. Sprites are drawn **upward** from their feet, and the board was laid out to fill the whole
canvas, so the top row has no headroom.

| Thing | Maths | Result |
|---|---|---|
| Board, 61 of 83 maps | cell 104, origin y 10, 5 rows → top row centre y = 62 | |
| Hero | `HERO_ANIM.height` 80 × `heroScale` 1.3 = **104 px tall**; feet at centre + 22 × 1.3 = y 91 | head at **y ≈ −13**: clipped by ~13 px (more with the level badge and bars) |
| Other boards (cell 94, origin 35 / cell 118, origin 34) | top row centre 82 / 93 | head at y ≈ +7 / +18: fits, barely |
| Boss | body ≈ 96 × 0.8 × `bossScale` 1.3 ≈ **100 px** above its feet (`FULL_SPRITE_FEET` 6) | on a top-row road: head at y ≈ −30 |
| Ordinary enemy | 44 × 0.8 × `enemyScale` 1.8 ≈ 63 px, flyers +18 × 1.8 lift | flyers on the top row: head at y ≈ −20 |
| Maps affected | 46 of 83 board maps route enemies along the top row | the boss and flyers are the common case |

On top of that the buff pills (`+10%`, `!`) sit over the top edge of the canvas in the UI, so
the top ~50 px are crowded even when a sprite fits.

## 2. Options

| # | Idea | Fixes | Cost / risk |
|---|---|---|---|
| A | **Headroom strip.** Make the world 960 × ~590: shift the stage down 50 px, keep sim coordinates and board origins untouched. The strip is filled by extending the map art upward (dark vignette fade, or a "sky/wall" band per theme) and also hosts the buff pills. | heroes, bosses, flyers, pills; every map at once | Board shrinks by ~8% on phones (height is the limiting side in landscape: 540/590). Touches `fitRect`, `resize`, pointer-to-world mapping, `WORLD_HEIGHT` users. Need one strip fill per theme or a generic fade. Sim, maps and tests unchanged. |
| B | **Feet lower in the tile.** Raise `HERO_ANIM.feetY` so the hero stands at the tile's lower edge (22 → ~38, feet y ≈ 110, head y ≈ +6). Hero height (104) then equals the cell, so a hero fills exactly the tile it occupies. | heroes only | One constant, trivially reversible. Heroes sit lower in their tile and overlap the row below slightly; shadow/halo/pattern highlights use `feetY` and move with it. Does nothing for bosses or flyers. |
| C | **Row-depth scaling.** Draw units on the top row at ~80–85% scale (depth cue: further away), growing to 100% on the bottom row. | heroes and enemies | Looks intentional and gives depth, but changes how big the same hero looks from tile to tile; hit/pattern readability is unchanged. Needs scale applied to bars, badges, ice shell, effects. Medium. |
| D | **Clamp to the canvas.** Render-only: if a sprite's top would leave the canvas, push the sprite down (and shrink the foot offset) until the head is at y ≈ 4. Bars/names follow. | whichever unit is clipped | Small code, no layout change. A clamped boss floats slightly off its road line, and a hero off its tile centre; noticeable on bosses (30 px) but harmless on heroes (13 px). Can be limited to bosses/flyers. |
| E | **Move the board down in the art.** Regenerate maps with origin y ≈ 60 and a 4-row board, or shift the authored art. | root cause | Largest: 83 maps, `geometryHash` changes, `build-td-grid`, art re-compositing, balance impact from fewer rows. Not recommended now. |
| F | **Smaller figures.** Lower `heroScale` 1.3 → ~1.1, `bossScale` 1.3 → ~1.1. | heroes mostly | One number each, but heroes are the readability the owner tuned by eye; a boss still needs ~85 px. Works best combined with B. |

## 3. Recommendation (for owner review)

1. **B + D first** (small, safe, reversible; one afternoon): feet lower for heroes so they fill
   their tile, and a render-only clamp for bosses and flyers on the top row. This removes the
   visible clipping on all current maps without touching sim, map data or art.
2. **A as the real fix** if the clamp still looks off on bosses: a 50 px headroom strip with
   the buff pills moved into it. Decision needed on the ~8% smaller board on phones.
3. Keep C as an optional look pass; skip E.

## 4. Open questions for the owner

- Is a slightly smaller board on phones (option A) acceptable, or is board size sacred?
- Should buff pills move into the headroom strip or into the left HUD rail (which has free space
  in your screenshot)? Moving them to the left rail also frees the top edge today, with no layout
  change at all.
- Do bosses need to be fully visible on the top lane, or is a "head leaves the frame slightly"
  look acceptable on tall bosses?

## 5. Checks once built

- Screenshots at 844 × 390, 915 × 412, 1440 × 900 on one 104-cell map, one 94-cell map and one
  118-cell map: hero on the top row, boss and flyer on the top road, HUD pills.
- `npm run test:tower-defense` (UI and sim tests must stay green); pointer hit-test for tile
  taps near the top edge if option A shifts the stage.
- No change to `geometryHash` or `build-td-grid --check` for options B, C, D, F.

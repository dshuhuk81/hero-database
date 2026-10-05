# Tower Defense — Tilted Board and Landscape HUD (R18)

Drafted October 2, 2026; implementation record updated October 5, 2026 after the owner's
real-device reviews and comparison material from another mobile tower-defense game ("Watcher of
Realms" style).

**Status:** the approved presentation is implemented across all 82 current Campaign stages and is
inherited by future Campaign stages. Free Play remains explicit through `tuning.board.tilt.maps`;
the hidden `proto-slabs` map remains available with `?proto=1`. All 14 current themes now have
authored panoramas; phone acceptance of their transitions remains pending. Asset assignments,
integration and generation prompts: **[Theme Landscape Panoramas](docs/theme-panoramas.md)**.
The canonical priority list is **[Tower Defense Roadmap](TOWER_DEFENSE_ROADMAP.md)**;
the current game rules are in [Tower Defense Specification](TOWER_DEFENSE_SPEC.md). The rollout
boundary is specified in **[Campaign R18 Rollout and Stage-Load Audit
Design](docs/superpowers/specs/2026-10-04-campaign-r18-stage-load-design.md)**.

**Owner constraints (October 2):** heroes and bosses must always be fully visible, **no
shrinking of figures** (they are already small), the board itself may change. Compare against
how reference games solve it: smaller battlefield, tilted 3D perspective, or another
tile-to-hero ratio.

## Owner decisions (October 2, 2026)

- **Approved direction: tilt the ground only** (T). Heroes and bosses keep full size; ground art
  and tiles are squashed to about 75% height; the board moves down about 70 px. Prototype behind
  `tuning.board.tilt` on one map per theme, trying k = 0.7 to 0.8.
- **Polish steps after the tilt works:** depth scaling (far row ~0.9, near row ~1.1) and heroes'
  feet lower in the tile (B).
- **Art:** the top and bottom bands are real scenery, not bars. First cut mirrors and blurs each
  map's own edge; the proper version is one band per theme.
- **Bosses:** only walking bosses exist and only they are in scope. The immobile colossus type
  (section 2b) is a possible future feature, not planned now.
- **Boss health bar** moves into a wide HUD bar at the top (also removes the above-head bar).
- **Buff pills** (agent's choice): they move into the top scenery band, left of centre, in a
  single row under the wave/lives counters' height. The band is HUD-only space like in the
  reference, so nothing covers a lane, and the left rail stays free for gold, lives, wave, goal
  and the speed buttons.

## Initial prototype status (October 2, 2026)

Built for **one map only**, `jungle-heart-temple` (campaign 3-6), for owner review. Nothing else
changes; remove `tuning.board.tilt` to switch it off everywhere.

- **Where:** `tuning.board.tilt = { k: 0.75, offsetY: 70, maps: ["jungle-heart-temple"] }` in
  `gameBalance.tuning.json`. Code: `render.js` (all layers live in a squashed `tiltRoot`; hero and
  enemy containers are counter-scaled by 1/k so figures keep their size; damage numbers too),
  `ui.js` (`tiltView`, used by `worldToLocal`) and `canvasPoint` (inverse mapping for taps).
  Sim, map data and `geometryHash` are untouched.
- **Try it:** open the campaign (DBG → All stages playable → Chapter 3 → 3-6). URL switches on the
  page: `?tilt=off` (today's look), `?tilt=0.7` (any k from 0.5 to 1).
- **Screenshots** (same map, six heroes, boss and flyer at the top spawn, tilt off vs on) in
  `artifacts/td-tilt-prototype/`: `tilt-off-*.png` / `tilt-on-*.png`, at 1280 × 640 and 844 × 390.
  Result: the top-row hero that touches the canvas edge with tilt off stands fully inside with tilt on.
- **Portal overlap fix (owner feedback):** the squashed ground flattened the painted spawn gates and drew them over everything, so heroes next to a gate were covered. Gates and labels are now counter-scaled (upright, full size). The complete painted gate stays in the structure layer behind all combatants; placing the opaque image in the sortable unit layer hid enemies on their first spawn frame. Before/after crops from the first correction: `artifacts/td-tilt-prototype/portal-overlap-*.png`. The Heart Temple (base) stays behind units as before and is also counter-scaled.
- **Not in the prototype:** buff pills and the boss health bar are not moved yet; the bands are
  the first-cut blurred copy of the map art; HP bars, rings and status icons are squashed with the
  ground (bars ~25% thinner); portal labels are squashed; no depth scaling and no lower hero feet.
- **Known to check on review:** the seam where ground meets band, how the 25% squash reads on the
  painted art, tap accuracy near the top and bottom edges on a real phone.

## Prototype round 2 (October 3, 2026): slabs (A), depth cues (B), full-bleed (D)

Owner direction: A first on one prototype level only, then B, D yes, C no (keep our gates), E skipped.
One new dev-only map, **`proto-slabs`** ("Prototype Slabs"), listed in Free Play on the dev server
only (`prototype` + `campaignOnly`). Campaign maps are untouched. Tilt is on for it
(`tuning.board.tilt.maps`). Screenshots in `artifacts/td-tilt-prototype/slabs-*.png`.

- **A, bigger slabs, fewer tiles:** new generator size `6x3` (`BOARD_SIZES` in
  `map-generator-board.js`): cell **157 px** (was 104), 6 road + 8 platform tiles (was 19 to 40
  cells). Generated with the normal board-v1 generator (seed 1, 1 gate), `generate-td-board --check`,
  `build-td-grid --check` and the sim/board tests pass. A hero is now about half a slab wide, the
  open field feels bigger. Heroes' pattern reach is measured in cells, so it now covers more ground;
  not balanced (prototype).
- **B, depth cues (tilt maps only):** platform tiles are drawn as raised stone slabs (top face,
  darker front face, drop shadow) instead of outlines; heroes and enemies get an extra long soft
  shadow to the lower right.
- **D, full-bleed (tilt maps only):** `render.js` sets `data-bleed` on the play screen; the canvas is
  sized against the whole play screen and centred on it, the top and bottom bars float over it with a
  gradient, and a blurred copy of the terrain fills the space around the board (`td.css`, "R18
  prototype (D)"). Landscape phones keep the side rails clear, so the gain there is vertical only.
- **Open / next:** the side bands are still the blurred terrain copy; slab stone colour is the theme's
  stone grey-green and needs a texture; no depth scaling yet; free enemy paths (E) are a separate
  concept; phone portrait not checked.

### Testing prototypes on a phone (no merge to main)

- **Prototype maps on any build:** open `/games/tower-defense/?proto=1`; Free Play then also lists the
  hidden prototype maps (`prototype: true` in `tdMaps.json`), e.g. "Prototype Slabs". Without the flag
  they stay hidden on non-dev builds, so players never see them.
- **Cloudflare preview deployment:** every push to a non-main branch can build a preview (Pages →
  *Deployments* → *Preview*; the branch alias is `<branch>.<project>.pages.dev`, slashes become dashes).
  The agent pushes the branch; open the preview URL with `?proto=1` on the phone.
- **Cloudflare needs Node 22.12 or newer for previews** (Astro 7). Set `NODE_VERSION` = `24` for the
  *Preview* environment too (Pages → Settings → Variables and secrets); the repo's `.node-version`
  and `.nvmrc` already say 24. A preview build that installs Node 20.20.0 fails in under a minute.
- **Same Wi-Fi, no push at all:** `npm run dev -- --host`, then on the phone
  `http://<laptop-ip>:4321/games/tower-defense/?proto=1` (`ipconfig getifaddr en0` on macOS).

### Scale audit on a 797 × 360 phone (owner annotation, October 3, 2026)

Reference screen annotated by the owner (797 × 360): hero 50 × 66, slab block 62 × 68 (the left stack
of two slabs; one slab is about 62 × 34 to 44), top counter pill 130 × 30, round buttons 30 × 30,
portrait circles 50 × 50, deck cards 60 × 60. Ours measured at the same size on `proto-slabs`
(dev server, Playwright, `worldScale` 0.647):

| | Reference | Ours now | Ours with the old 104 cell |
|---|---|---|---|
| Hero height | 66 (18% of screen height) | **67** (19%) | 67 |
| One slab (width × height) | ~62 × 34 to 44 | **102 × 76** (cell 157, tilt 0.75) | 67 × 50 |
| Slab height ÷ hero height | ~0.5 to 0.67 | 1.13 | 0.75 |
| Playfield width | whole screen, HUD floats | 621 of 797 (78%); rails 88 px each side | same |
| Stats | one pill 130 × 30 on top | stacked in left rail, 72 × 41 each | same |
| Round buttons | 30 × 30 | 34 × 34 | same |
| Deck | cards 60 × 60, portrait circles 50 × 50 | 40 × 40 in the right rail | same |

Findings:
1. **Hero scale already matches** (67 vs 66 px on this phone). No hero resizing needed.
2. **The slab prototype overshot.** The 157 px cell is about 1.7 × the reference slab. The old 104 px cell
   (67 × 50 on screen) is much closer. Correction to the video analysis above: the "190 px slabs" were
   groups of slabs, so the lever is **fewer tiles in a smaller board on a larger scene**, not bigger tiles.
   Proposed values for the next round: cell about 96 to 100, tilt k 0.7, a board of 6 x 3 cells (about
   600 x 300 world px) centred in the 960 x 540 world with scenery around it.
3. **Deck and HUD are smaller than the reference** (40 vs 60 px cards) and sit in 88 px rails that take
   22% of the width. The reference has no rails: a 130 x 30 pill at the top, buttons top right, ultimates
   bottom left, deck bottom right, all floating over the scene.

### Prototype round 3 (October 3, 2026): matched to the 797 x 360 reference

Owner confirmed 62 x 68 is **one** slab (top face plus stone thickness). `proto-slabs` was rebuilt:
cell **96** (generator size `6x3` now has `maxCell: 96`), a 576 x 288 board centred in the world with
scenery all round, tilt **k 0.85 / offsetY 40 for this map** (`tuning.board.tilt.perMap`), and slabs
with a front face 0.3 cell tall drawn below the top face, tiles drawn top to bottom so the face
overlaps the tile beneath. At 797 x 360 that is a slab of **62 px wide** (reference 62) and about
62 x 53 top face plus ~18 px of stone front, i.e. ~68 px tall (reference 68); hero 67 px (reference 66).
Because the board is small, the top row has about 120 world px of headroom, so the clipping is gone
without needing a strong squash. Screenshots: `artifacts/td-tilt-prototype/slabs-v2-*.png`.

### Prototype round 4 (October 3, 2026): HUD, bars, depth (tilt maps only)

Owner feedback: the look works, heroes missing in the preview were R2 CORS (fixed in Cloudflare).
- **Bars:** hero health and ultimate bars now sit **above the head** like the enemy bars and are
  drawn in the topmost layer above every hero and enemy; bars, rings and status icons are
  un-squashed (own graphics per unit, `gFor` in `drawBars`).
- **Depth scaling:** units on the far row are drawn up to 8% smaller, on the near row up to 8%
  larger (`depthScale`, 0.92 to 1.08 across the board).
- **Floating landscape HUD:** no side rails; stats and buttons in a thin row on top, deck and wave
  button along the bottom, both on a gradient over the scenery; the world is scaled so its height
  is about the screen height (`playH / 556`), which keeps a hero at ~18% of the screen height.
- **Road sockets** are recessed (inner shadow) next to the raised slabs.
- Screenshots: `artifacts/td-tilt-prototype/slabs-v4-*.png`.
- **Known:** the blurred terrain backdrop at the sides is dark and has a hard edge against the
  battlefield; portrait phones untouched; no real device test of the tap mapping yet.

### Prototype round 5 (October 3, 2026): ultrawide landscape phone polish

The owner's real-phone screenshot confirmed the height-led world and unit scale, but exposed the
fixed 16:9 canvas as a dark, hard-edged rectangle on a wider display. Landscape tilt maps now use a
brighter, slightly enlarged terrain backdrop and feather the canvas's outer 28 px into it. This is a
render-only blend: the canvas rectangle, world coordinates and tap mapping do not change.

The bottom deck now targets a 52 px card with a 50 px inner portrait at the 360 px reference height,
using a height-based clamp on shorter screens. HUD gaps and padding contract with width, and the deck
may scroll horizontally instead of shrinking the portraits. Portrait orientation remains unchanged.
The phone check also showed enemies hidden behind the opaque spawn-gate painting. Full painted gates
now remain behind all units; a future doorway-front occluder would need its own transparent asset.
Deployment notices on short landscape screens now appear below the top HUD instead of over the
bottom action dock. The dock gets a small bottom/right safe inset and the portrait deck sits 3 px
higher; portrait orientation is still unchanged.

The Jungle theme now uses `jungle-terrain-wide-v1.png`, an authored 2.44:1 panoramic backdrop,
behind the unchanged 16:9 gameplay canvas. The wide art supplies real ruins, vegetation and water
at the sides instead of the blurred terrain copy; other themes continue to fall back to their
ordinary terrain image until they receive their own panoramic backdrop.

Touch selection now measures slot distance in the visibly tilted plane instead of the unsquashed
world. This keeps the intended 28 px touch halo above and below a tile, where it was previously
reduced by the tilt factor. The UI regression check covers the four board edges on representative
6x3, 8x4 and 9x5 boards, both 0.7 and 0.85 tilt settings, and the 797x360, 844x390 and 915x412
landscape-phone sizes. Theme art does not affect the coordinate mapping.

The placement hierarchy is quieter across authored and fallback maps: empty tiles use the subdued
idle treatment even while deployment capacity remains, instead of keeping the whole board brightly
outlined. Tapping or keyboard-focusing a tile still gives it the full selected treatment. Choosing
a fallen hero from the deck brightens every legal tile of that hero's type and further dims the
wrong type; occupied and special-ring states remain distinct.

Melee contact now happens 24 world px from a road hero instead of 42. On the 96 px prototype tile,
the old value put an enemy only 6 px past the tile boundary (about 3 visible phone pixels after tilt
and scaling); the new value moves its foot point 24 px into the hero's tile. Ground heroes and
enemies also share one y-based depth plane, so whichever has the lower foot point draws in front;
heroes win only an exact-position tie, and flyers remain above the ground battle. Bars stay in the
separate top layer.

Enemy groups now use a wider seven-position formation instead of the narrow centre-line sway. Its
width follows the map's cell size and is capped just inside melee contact range, so the outer units
remain blockable. Each spawn gate advances its own symmetric formation; two-gate maps therefore no
longer bias one lane to the left and the other to the right. Summoned enemies reuse the same spacing.

Combat readability now distinguishes units without adding more decoration: enemies use thin red
health bars, heroes use green health plus a shorter purple ultimate bar, and only three static
status pips can occupy a unit's bar. Rapid matching hits merge briefly while critical and shield
hits remain separate; remaining numbers alternate around the target. Boss health has moved from the
unit into a centred HUD bar (including shield or Valor when present), and spawn text hides while a
wave is running. The raised platform lip is 0.15 cell instead of 0.3 cell, cutting its visible height
in half without changing tile positions, hit areas or gameplay. On October 5 it was cut a further
25% to 0.1125 cell (owner: platform and its shadow still looked too tall; the art style may add to it).

### Current acceptance boundary (October 4, 2026)

The following is the approved visual baseline, not a one-map experiment to be redesigned again:

- heroes remain approximately 18% of landscape-phone height; deck portraits target 50 px;
- the landscape HUD floats over scenery, with no permanent side rails;
- ground and tiles may tilt, while unit bars, rings, icons and actors retain readable thickness;
- far units may be up to 8% smaller and near units up to 8% larger;
- enemies stop in front of blocking heroes, share the ground depth plane and use a cell-aware
  seven-position formation;
- platforms are raised but use the reduced 0.1125-cell front lip; road tiles read as recessed;
- boss health belongs in the centred HUD; ordinary enemies and heroes keep compact overhead bars;
- tall spawn art stays behind units and its label is hidden during an active wave.
- map/rule labels use a compact single line; transient battle notices use at most two compact
  lines at the upper right and do not occupy the top centre;
- phones in portrait are blocked by the orientation gate and asked to rotate; there is no portrait
  gameplay layout.

The approval matrix was `proto-slabs` (6x3), `moonlit-pass` (8x4, one gate), `sunscar-ruins`
(8x4, two gates), `sunscar-basin` (9x5, one gate) and `jungle-flooded-court` (9x5, two gates).
That renderer path now applies to every Campaign stage by run context, including 10x5 finales;
Free Play still requires explicit map membership. New Campaign layouts inherit the behavior and
use per-map overrides only where geometry or art requires them. See the prioritized checklist in the
[Tower Defense Roadmap](TOWER_DEFENSE_ROADMAP.md#to-do--next-sensible-steps).

October 5 follow-up: shared landscape overlay collision fixes and target-following damage
numbers are implemented. The original Lerna walk frames lack clear leg articulation; the cadence
change alone does not solve that asset defect. Evidence, checks and remaining acceptance work:
**[Campaign Landscape Phone Review — October 5, 2026](docs/audits/2026-10-05-campaign-phone-review.md)**.

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

### 2c. Reference gameplay video (owner recording, October 3, 2026; frames read every 6 s)

One desert map, a 47 s run in the reference game, measured by eye on a 1200 × 540 frame:

| Aspect | Reference video | Ours (tilt prototype) |
|---|---|---|
| Placement tiles | **3 slabs in total**, in an L shape, each ~190 × 70 px, i.e. ~4 hero widths wide | 30+ cells, each about as wide as a hero is tall |
| Hero height | ~65 px = **~12% of the screen height**; a hero stands on a slab with room to spare | 104 px = ~19%; fills its cell |
| Enemies | Same size as heroes (~60–70 px), 5–8 on screen, **walk freely** across a wide open field in loose groups | Snap to the road cells in a column, much larger (`enemyScale` 1.8) |
| Spawn / exit | Spawn is a red rune decal on the ground (two of them), the exit is a blue portal. No tall gate prop | Tall painted gates and a temple prop |
| Field | The whole screen is ground and scenery; the card bar overlays the bottom ~17%, the HUD pills sit over rocks | Framed rectangle with panels around it |
| Look | Real 3D render: rocks with visible side faces, long soft shadows under every unit, warm directional light | Flat painting, squashed; flat tile outlines; no unit shadows beyond a small ellipse |
| Telegraphs | Thin glowing red path line along the enemies' lane | Tile outlines and rings |

What the video adds to the earlier analysis:
1. **Scale is the quiet difference.** Their heroes are ~12% of the screen height, ours ~19%. The tilt
   gave us room, but a tile that is four heroes wide is a different feeling than a cell exactly one
   hero big. The owner does not want smaller figures, so the lever is the tile/board, not the units:
   **bigger slabs and fewer of them.**
2. **Enemies move through open ground, not along cells.** Free paths with loose groups look alive;
   a column on a cell road looks like a grid. (Gameplay change; out of scope for the rendering fix.)
3. **Depth cues do the 3D work:** long shadows, visible stone thickness, rocks with side faces. These
   are cheap to approximate: a directional drop shadow per unit and per slab, a darker bottom edge
   on tiles, and a slight vertical gradient over the ground.
4. **No gate props.** A red ground decal for the spawn removes the portal overlap problem and the
   upright-vs-ground depth conflict entirely.

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

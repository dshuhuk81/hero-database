# Tower defense map art audit

September 25, 2026. Scope: parallel audit of rendering, map endpoints, and art direction in the current working tree, including existing uncommitted sprite changes. This is an implementation brief; the game has not been modified by this audit.

**Recommendation:** build two authored, dimensional battlefields in the existing Pixi renderer. Start with a visible invasion gate and a celestial sanctuary base, then complete Moonlit Pass as the visual reference for the second map. The largest improvement will come from consistent scale, materials, lighting, and a destination worth defending.

“Haptic” is interpreted here as tangible weight and audiovisual response. Device vibration is not required for this direction.

## Findings

| Priority | Current behavior | Impact and action |
| --- | --- | --- |
| P0 | Both paths start at x=-30 and finish at x=990 on a 960×540 board. Existing entrance/exit rings have a radius of only 30. | Endpoint markers are almost entirely clipped. Put recognizable spawn and base structures inside the board and align their apertures with enemy movement. |
| P1 | Both maps use the same cropped continent illustration, with a uniform 38% black overlay. | Mountains and cities underneath person-sized units make the scene read as a diagram. Author local ground environments around the actual route and deployment slots. |
| P1 | `THEMES` is declared but unused by the renderer. | Moonlit and Verdant differ in route and music, but lack distinct environmental identities. Resolve terrain, props, structures, and ambient colors from each map's art definition. |
| P1 | The road is one repeating texture clipped to a uniform 74px stroke, surrounded by gold and bisected by a continuous gold centerline. | It reads as a ribbon laid over the background. Add road bedding, broken shoulders, curbs, dirt/moss transitions, and occasional embedded runes. |
| P1 | Endpoint structures have no physical presence or damage response. Removed enemies enter the same fade pool regardless of removal reason. | A leak looks like leaving the screen. Make enemies pass through a base threshold; distinguish base entry from combat death. |
| P2 | Deployment artwork is detailed but displayed at 64/72px with persistent glow, then faded when occupied. | Preserve the stone/gold material language but give pads grounded sidewalls and contact shadows; reserve stronger light for interaction. |
| P2 | Units have no depth ordering against scenery, and existing portals live in the top HUD layer. | A full gate sprite added there would obscure combat. Split structures into ground/rear and foreground parts, with units between them. |
| P2 | Slots, ranges, and links are rebuilt every frame; removed children are not explicitly disposed during these rebuilds. | Retain containers and update changing properties before adding more animated scenery. Profile allocation and frame time; this audit does not establish a measured memory leak. |
| P2 | Core art loads asynchronously, with failures swallowed. Full-body enemy art is selected at container creation; the late texture upgrade branch does not cover those full-body assets. | Preload the essential map set before dismissing the loading screen; keep a fallback, report failures during development, and ensure late loads converge to a consistent visual style. |

Evidence: [map definitions](../src/data/tdMaps.json), [renderer](../src/game/td/render.js) at `THEMES`, `buildBg`, `buildBgTexture`, `drawSlot`, `buildPortals`, `syncEnemies`, `updateEnemyContainer`, and `draw`; [simulation](../src/game/td/sim.js) at enemy movement/leaks and `startQuest`.

The existing roadmap's statement that there are no shadows is stale: the current hero tokens and full-body enemies already have ground shadows. The next work is to ground terrain and structures consistently with them.

## Art direction

Use a painterly, slightly elevated battlefield view, with thick carved stone, worn gold ornament, cool shadows, and selective magical light. Keep ground contrast quieter than enemy silhouettes and hero tokens. Establish one consistent light direction and prop perspective across both maps.

The following references already exist locally and were visually inspected:

- [Celestial gateway](../public/bgNew.png): monumental gold architecture, indigo stone, mist, and a carved approach bridge. Useful for the base silhouette and lighting.
- [Labyrinth environment](../public/images/guides/infinite-labyrinth/A_UI_BagBattle_Background_Chapter_Bg.png): weathered astrolabe, massive stone, broken edges, and cyan depths. Useful for materials and adventure landmarks.
- [Road material](../public/td/spriteRoad.png), [road pad](../public/td/spritePlatform.png), and [platform pad](../public/td/sprite.png): existing reusable material references.
- [Current world map](../public/td/bg/worldmap.jpg): suitable for choosing a destination; its continent scale is the wrong scale for combat ground.

These are visual references, not evidence that the proposed locations are canonical MOTTO IMMORTAL environments.

| Map | Ground and route | Adventure landmark | Spawn | Base |
| --- | --- | --- | --- | --- |
| Moonlit Pass | Blue-black cliff shelf, worn temple slabs, broken parapets, patches of moonlit rock | Ruined observatory with a broken celestial ring beside a misty chasm | Cracked stone arch with a violet breach | Astral Sanctuary: stepped foundation, gilded celestial ring, warm protected doorway |
| Verdant Crossing | Moss-covered causeway, roots, shallow water, dark jade vegetation | Fallen guardian statue beside an overgrown shrine | Root-bound corrupted arch | Living shrine with weathered stone, gold core, and protective light |

Compose scenery around combat. Large rocks and ruin walls belong in unused pockets; low vegetation and decals can approach the road. Keep tall silhouettes out of deployment targets, health bars, and narrow spaces between parallel lanes. Reserve a few strong landmarks rather than scattering equally detailed props everywhere.

## Spawn and base specification

Suggested initial placement in logical board coordinates:

| Map | Spawn aperture | Base threshold | Initial structure bounds |
| --- | --- | --- | --- |
| Moonlit Pass | (48, 118) | (880, 420) | Spawn about 84×96; base about 108×112 |
| Verdant Crossing | (48, 90) | (880, 430) | Spawn about 84×96; base about 108×112 |

The dimensions are layout targets, not final art measurements. The art anchor and doorway anchor must be separately defined. Spawn faces right into the route; the base receives enemies from its left. Draw the full footprint inside the field. On Moonlit Pass, the last road slot is (790,420); the proposed base starts near x=826, leaving little room for extra ornament. Validate full hero token bounds and the existing 38px slot selection radius before finalizing the footprint.

Add map metadata for `spawn`, `base`, and `art`: doorway position, art anchor, facing, bounds, asset keys, and any foreground occlusion piece. Use the doorway position as the authoritative route endpoint so data cannot drift between visual and simulation coordinates. Keep deployment-slot positions stable initially.

Enemy sequence:

1. A wave-start pulse opens the invasion arch; units emerge through its aperture. Avoid a large flash for every grunt.
2. Enemies traverse the existing route and enter the sanctuary threshold.
3. Entry removes the enemy through doorway occlusion, applies its existing life damage, and emits a distinct `baseHit` event with position, damage, and enemy identity.
4. Show a brief shield ripple, local recoil or glow reaction, dust, and an impact sound. Damage to base integrity is the same state as existing `game.lives`.
5. Show increasingly damaged stone or weaker protection at integrity thresholds relative to the run's initial lives. Restore the structure fully on restart.

Do not introduce a second base-health system. Preserve `noLeaks` quest failure, leak statistics, invincible debug behavior, defeat at zero lives, and the final hit's visible feedback. Several simultaneous leaks should retain correct damage but combine excessive sound/flash feedback. Keep combat death fading separate from base ingress.

Moving path endpoints to these coordinates shortens each route by 188 pixels:

| Map | Current length | Proposed length | Reduction |
| --- | --- | --- | --- |
| Moonlit Pass | 1,762 | 1,574 | 10.7% |
| Verdant Crossing | 2,480 | 2,292 | 7.6% |

That affects travel time, time under fire, and the speed-clear quest deadline calculated from path length. Treat it as a gameplay change and compare the existing balance harness before/after. Do not automatically compensate with a global enemy-speed change, which would affect blocking and combat too. If needed, recover route length through a deliberate route revision after inspecting results.

A presentation-only interim pass can draw edge structures while keeping the old simulation endpoints, but damage would still happen offscreen. It would not fully meet the intended visible-base behavior.

## Tiles, depth, and tactile feedback

For two fixed maps, use a ground painting per map plus modular road materials, decals, and props. Keep the existing route as authoritative geometry. A complete tile editor or engine migration would add scope without solving the current visual mismatch.

Build road depth with a dark bedding layer, the main stone surface, irregular shoulders, and localized curb highlights. Add several crack, missing-stone, moss, and damp variants. Avoid random rotations of art with baked directional lighting. Keep the center of the route readable, replacing the continuous gold centerline with sparse engraved direction marks.

Give deployment pads a visible stone sidewall, contact shadow, and subtle material color matching the biome. A placement can settle the pad briefly, emit a little stone dust, and play a short material sound. Selection can illuminate its runes without making every empty slot equally bright.

Suggested render ordering:

```text
ground painting and static lighting
road bedding, road surface, shoulders, flat decals
foundations and ground shadows
units and upright props ordered by ground-contact y
explicit foreground pieces at gate/base apertures
ranges, target markers, health bars, combat effects, HUD
```

Keep interaction overlays legible even when scenery overlaps their world positions. For tall props, depth-sort by ground contact, not the top edge of the image. Match current character perspective; test the large boss at both doorways.

Add restrained environmental movement after composition is coherent: low fog in the chasm, a few fireflies in sheltered areas, a breathing sanctuary light, and slight foliage motion. Honor reduced motion by keeping static damage states and clear light changes while suppressing recoil, shake, and drifting particles. The existing reduced-motion and effect-tier systems provide integration points.

## Asset and renderer work

Minimum cohesive asset set:

| Asset | Initial scope | Requirements |
| --- | --- | --- |
| Ground scene | One per map, authored at 1920×1080 for the 960×540 board | Compose with route/slot overlays; no baked units, UI, or temporary effects |
| Road surface | Shared stone material with biome variation | Consistent scale, no visible seams, shoulder/edge treatment |
| Decals | Small set of cracks, moss, dirt, missing stones, water stains | Transparent, quiet contrast, reusable |
| Deployment pads | Road and platform variants | Grounded foundation and separate interaction light |
| Spawn/base structures | Shared architecture with biome dressing | Separate foundation/rear and foreground pieces; explicit doorway anchors |
| Environment props | About 8–12 across both maps | Consistent viewpoint/light, ground-contact anchor, conservative footprint |
| Ambient/impact atlas | Fog/wisps, dust, fireflies, shield ripple | Small reusable textures and bounded particles |

Art production should begin with one full Moonlit composition containing route, slots, spawn, base, and several existing hero/enemy silhouettes at actual display size. Review readability before producing the entire prop set.

Use versioned asset names and an explicit manifest linking source art to delivered WebP files. The renderer currently requests remote WebP names while local originals are PNG/JPG; `scripts/upload-to-r2.mjs` uploads exact filenames and does not perform that conversion. Core map textures should finish loading before the “Preparing battlefield” state ends. Distinguish loading from a permanent missing-asset fallback in development diagnostics.

Retain static scene objects. Pack related prop images into atlases; consider caching complex static terrain groups after profiling. Avoid adding a full-screen filter stack as the first art improvement. Pixi's official guidance recommends spritesheets, avoiding constantly modified graphics, and restraint with filters: [performance tips](https://pixijs.com/8.x/guides/concepts/performance-tips). Static-container caching is already supported: [cache as texture](https://pixijs.com/8.x/guides/components/scene-objects/container/cache-as-texture). These capabilities fit the existing renderer; no new production dependency is proposed.

## Delivery sequence and acceptance

1. **Visible objective:** implement spawn/base metadata, inboard thresholds, structure layers, distinct ingress, and base damage feedback. Compare path-related balance and quest behavior.
2. **One complete battlefield:** finish Moonlit ground, worn road edges, grounded pads, one adventure landmark, and a few restrained props. Judge it with existing units in combat.
3. **Second map identity:** adapt the same art/rendering contract to Verdant with its own ground, landmark, and biome dressing.
4. **Polish and performance:** add ambient accents, align lobby previews with actual map identity, check small-screen readability, and profile dense combat at 1×/2×/4×.

Acceptance checks for implementation:

- Both entrances and bases are recognizable without labels; thresholds and structures stay within the board.
- Enemies emerge from a visible source and disappear inside the base, including flying enemies and the boss.
- Life loss coincides with base impact; no duplicate damage, kill credit, or death animation on entry.
- Every existing deployment target stays selectable and its hero remains readable.
- No tall prop hides the route, boss, health bars, or crucial selection feedback.
- Map restart, map switch, final-life defeat, simultaneous leaks, reduced motion, and slow/missing assets behave coherently.
- Run `npm run test:tower-defense` and `npm run test:td-balance` after implementing endpoint/gameplay changes. Add only focused coverage for new ingress/damage behavior if existing checks do not cover it. The user runs the production build.

Audit validation includes source inspection, local reference-image inspection, and desktop browser inspection of both maps on the current workspace development server at port 4321. The preview showed fallback geometry before asynchronous textures appeared. The background, road, and both pad WebP requests subsequently returned HTTP 200; the background texture decoded successfully at width 2048. This supports improving loading readiness, rather than claiming those remote assets are missing. An older scratch preview on port 4322 was excluded from the current-state conclusions. No gameplay test results or mobile performance measurements are claimed by this audit.

## Moonlit prototype implementation status

Following the audit, Moonlit now has an explicit spawn at `(48,118)`, sanctuary at `(880,420)`, and matching inboard path endpoints. Sanctuary entry emits a distinct impact before defeat, preserves leak statistics, and reports actual integrity loss, including zero damage in invincible mode. Positive damage uses the existing throttled heavy-impact sound. Verdant retains its existing geometry and behavior.

The simulation suite and focused regressions for doorway crossing, single damage, final-life impact, invincibility, and legacy-map behavior pass. The existing balance harness also passes, but its seed-99 Moonlit results show a material difficulty change:

| Squad | Before | After |
| --- | --- | --- |
| Balanced S-tier core | Win, 7 lives, 16 leaks, 454 seconds | Loss, 0 lives, 23 leaks, 409 seconds |
| Budget D-tier | Loss, 0 lives, 23 leaks, 371 seconds | Loss, 0 lives, 23 leaks, 362 seconds |
| Road wall | Loss, 0 lives, 25 leaks, 210 seconds | Loss, 0 lives, 23 leaks, 234 seconds |
| All platform | Win, 16 lives, 4 leaks, 405 seconds | Win, 16 lives, 4 leaks, 373 seconds |
| Glass cannon | Win, 13 lives, 9 leaks, 405 seconds | Win, 2 lives, 19 leaks, 455 seconds |

Verdant's harness results are identical before and after. The prototype keeps the proposed geometry without blanket balance compensation; the 10.7% shorter Moonlit route needs a separate balance decision after visual review. No production build was run.

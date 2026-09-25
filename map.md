# Tower defense maps and required art assets

Last updated: September 25, 2026.

## Instructions for agents creating or updating maps

**Use the existing assets assigned to each map below.** These are the selected painted assets, not placeholders. In particular, when implementing Map 3, Sunscar Ruins, use all five `sunscar-*-v1.png` files. Do not substitute Moonlit/Verdant art, procedural replacement artwork, or newly generated images unless the user requests an art change.

All files live in `public/td/maps/`. Their runtime URLs start with `/td/maps/` (omit `public`). Map geometry lives in [src/data/tdMaps.json](src/data/tdMaps.json); scene settings and asset mappings live in [src/game/td/map-scene.js](src/game/td/map-scene.js), under `MAP_SCENES[map.art]`.

## Asset assignments

| Purpose / asset key | Map 1: Moonlit Pass | Map 2: Verdant Crossing | Map 3: Sunscar Ruins |
| --- | --- | --- | --- |
| Ground painting / `terrain` | [moonlit-terrain-v1.png](public/td/maps/moonlit-terrain-v1.png) | [verdant-terrain-v2.png](public/td/maps/verdant-terrain-v2.png) | [sunscar-terrain-v1.png](public/td/maps/sunscar-terrain-v1.png) |
| Enemy entrance / `spawn` | [moonlit-spawn-v1.png](public/td/maps/moonlit-spawn-v1.png) | [verdant-spawn-v2.png](public/td/maps/verdant-spawn-v2.png) | [sunscar-spawn-v1.png](public/td/maps/sunscar-spawn-v1.png) |
| Defended sanctuary / `base` | [moonlit-base-v1.png](public/td/maps/moonlit-base-v1.png) | [verdant-base-v2.png](public/td/maps/verdant-base-v2.png) | [sunscar-base-v1.png](public/td/maps/sunscar-base-v1.png) |
| Repeating road surface / `road` | [moonlit-road-v1.png](public/td/maps/moonlit-road-v1.png) | [verdant-road-v2.png](public/td/maps/verdant-road-v2.png) | [sunscar-road-v1.png](public/td/maps/sunscar-road-v1.png) |
| Hero deployment tile / `pad` | [moonlit-pad-v1.png](public/td/maps/moonlit-pad-v1.png) | [verdant-pad-v2.png](public/td/maps/verdant-pad-v2.png) | [sunscar-pad-v1.png](public/td/maps/sunscar-pad-v1.png) |

## Current map status

- **Map 1 — Moonlit Pass:** implemented, map id `moonlit-pass`, art key `moonlit-sanctuary-v1`. Cool moonlit stone and celestial ruins. Keep its v1 art assignment.
- **Map 2 — Verdant Crossing:** implemented, map id `verdant-crossing`, art key still `verdant-shrine-v1`, but its active images are **v2**. The art key is not the asset version. The `verdant-*-v1.png` files are historical procedural adaptations; do not reconnect them. The painted guardian is already in the v2 background, and roots are in the building sprites. Do not add the old vector guardian/root overlays on top.
- **Map 3 - Sunscar Ruins:** implemented, map id `sunscar-ruins`, art key `sunscar-sanctuary-v1`. Desert solar ruins, sandstone, windblown sand and aged gold; the solar astrolabe is painted into the upper-right background corner. First map with **two entrances**: gates at (80, 140) and (80, 320) on the west edge, between the painted pillars. Both lanes run east and meet head-on at the junction (470, 230), then share one trunk that zigzags to the sanctuary at (860, 340). Spawns alternate between the gates. A central island between the lanes holds two platforms that reach both lanes with average range (~90). Boss and music reuse Map 1 (Baphomet, `bg_music_map1`) until dedicated ones exist.

## Multi-entrance maps (`lanes`)

A map with more than one entrance replaces top-level `spawn` + `path` with `lanes: [{ spawn, path }, ...]` ([src/game/td/lanes.js](src/game/td/lanes.js) `mapLanes`). Rules, checked by `test-td-sim.mjs`:

- Every lane is a full route from its own gate to `base` and all lanes must be exactly the same length (targeting ranks enemies by distance walked).
- Lanes merge into a shared tail; `routeStrokes` draws that shared part once, so the road is not painted twice.
- The wave's spawn queue alternates lanes, so each gate sends an even share.

## Map 3 asset mapping (implemented)

Add a Sunscar scene entry using the existing scene contract and connect the new map's `art` value to that entry. Suggested identifiers are `sunscar-ruins` for the map and `sunscar-sanctuary-v1` for the scene; these identifiers are proposed, not existing registrations.

```js
assets: {
  terrain: "/td/maps/sunscar-terrain-v1.png",
  spawn: "/td/maps/sunscar-spawn-v1.png",
  base: "/td/maps/sunscar-base-v1.png",
  road: "/td/maps/sunscar-road-v1.png",
  pad: "/td/maps/sunscar-pad-v1.png",
}
```

Compose the route and slots on the quiet floor of the 960×540 logical board. Keep them clear of perimeter masonry and the upper-right astrolabe. Coordinates were chosen from a grid overlay of the terrain; the encoded positions are in `tdMaps.json`. Preserve sprite transparency and aspect ratio, and align visible doorway thresholds with simulation endpoints. Use biome-appropriate tinting so sandstone does not inherit Verdant's green grade.

Validate road repeats, building scale, hero readability and selection clearance in the rendered map. The Sunscar PNGs have been visually inspected and decoded, and the three isolated sprites have real alpha; a static composite of the layout was checked; live in-game rendering still needs a look in the browser. If adding a playable map or changing geometry, follow the gameplay checks in the art audit. The user runs the production build.

## Production references

- [Map art audit and acceptance criteria](docs/tower-defense-map-art-audit.md)
- [Moonlit terrain and buildings](docs/moonlit-art-prompts.md), [Moonlit road and pad](docs/moonlit-surface-prompts.md)
- [Verdant v2 assets and prompts](docs/verdant-art-v2.md)
- [Sunscar assets, source files and exact prompts](docs/sunscar-art-prompts.md)

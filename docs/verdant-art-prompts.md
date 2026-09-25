# Verdant Crossing assets

September 25, 2026. The image-generation tool used for Moonlit was not available in this session, so the v1 set is **derived**, not newly painted: `scripts/build-td-verdant-art.py` (Pillow + numpy, deterministic) re-grades Moonlit's painted materials and adds moss, water, foliage and roots composed around Verdant's route and slots. Rebuild with `python3 scripts/build-td-verdant-art.py` after a route or slot change.

| File | Source | What the script does |
| --- | --- | --- |
| `verdant-terrain-v1.png` (1920×1080) | Moonlit floor crop | Moss-green grading, moss in cracks, three shallow pools, shaded jade leaf clumps on the borders and pockets, roots. Keeps the route, slots, spawn and base clear. |
| `verdant-road-v1.png` | `moonlit-road-v1.png` | Grey-green stone, moss in the mortar joints, damp patches. Still tiles seamlessly. |
| `verdant-pad-v1.png` | `moonlit-pad-v1.png` | Grey-green stone, moss on the rim, gold inlay kept. |
| `verdant-spawn-v1.png` | `moonlit-spawn-v1.png` | Violet breach recolored to a blighted crimson, moss, roots binding the arch. |
| `verdant-base-v1.png` | `moonlit-base-v1.png` | Mossy stone, a warm gold core instead of Moonlit's ivory-cyan, vines on the pillars. |

The fallen guardian (top-right thicket), the corrupted roots at the spawn, the pool glints and the fireflies are drawn in-engine by `decorateVerdant` in `src/game/td/map-scene.js`.

## Painted replacements (v2)

To replace any file with painted art, save it as `verdant-<part>-v2.png` and update `MAP_SCENES["verdant-shrine-v1"].assets` in `map-scene.js`. The sizes and anchors match Moonlit's: the spawn is drawn at 96×110 and the base at 118×125, both centered on the map's `spawn`/`base` point. Write the prompts in the same style as `moonlit-art-prompts.md`:

- **Terrain:** an overgrown sacred causeway at human scale, viewed almost from overhead. Mossy grey-green flagstones, roots, dark jade vegetation only on the borders, shallow pools at logical (887,303), (62,478) and (430,331), and a fallen guardian statue at the top right around (893,62). Keep the 74px route `[(48,90),(760,90),(760,230),(200,230),(200,430),(880,430)]` and the slots at `(380,90),(760,160),(480,230),(200,330),(420,430),(720,430),(300,160),(560,160),(300,330),(560,330),(860,160),(120,320)` as quiet open ground. Leave the top-left and bottom-right open for the spawn and base sprites. No road, markings, characters or UI.
- **Spawn:** a compact, corrupted, root-bound stone arch on a weathered octagonal foundation. It has a blighted crimson rift that opens to the right, the same three-quarter top-down view as the Moonlit gate, a transparent background and a 15% margin.
- **Base:** a living celestial shrine in mossy stone, with vines on the pillars, a warm golden core open toward the left, tarnished gold rings and a transparent background.
- **Road and pad:** Moonlit's road and pad prompts, changed to "mossy grey-green stone, moss in the joints".

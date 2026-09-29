# Tower defense map generator plan

Last updated: September 29, 2026.

## Recommendation

Build a deterministic map compiler that generates many candidates during development, validates and simulates them, and publishes approved candidates as ordinary map records. Keep layout generation, visual skin, and mode selection as separate concerns.

The first release should not generate an unknown battlefield when a player starts a run. It should ship a checked-in catalog of generated maps with stable IDs. This preserves save compatibility, Daily fairness, Expedition reproducibility, balance review, and the current renderer contract. The same recipes can support live seeded maps later after the validator and difficulty model have enough evidence.

The target pipeline is:

```text
seed + generator version + topology request
                    |
                    v
          integer route recipe
                    |
                    v
        geometry and slot validation
                    |
                    v
       buildGrid() derives placements
                    |
                    v
       analysis and bot fingerprinting
                    |
                    v
        layout + compatible skin pair
                    |
                    v
        reviewed, checked-in map entry
                    |
          +---------+---------+
          |                   |
          v                   v
  shared preview model    battle simulation
          |                   |
          +---------+---------+
                    |
                    v
     existing Campaign / Daily / Expedition
```

This approach turns option 4 into a content tool first. It can produce option 3 immediately, multiply those layouts with option 2 through skins, and eventually support runtime procedural maps.

## Why the current game is ready

The existing code already provides most of the lower half of the pipeline:

- `tdMaps.json` treats map geometry as data. A map has a spawn and path, or equal-length lanes that merge, plus a base and grid settings.
- `buildGrid(map)` deterministically derives road slots, platform slots, and special rings from route geometry.
- `map-scene.js` separates terrain, road, spawn, and base artwork from simulation geometry.
- `mapLanes()` gives single- and multi-entry maps one simulation interface.
- Daily and Expedition already select stable map IDs from a pool.
- The simulation and balance scripts can exercise a candidate without rendering it.

The missing layer is a reliable producer and curator of map data. At present, route points, endpoint positions, exclusions, and art assignments are authored together in `tdMaps.json`.

## Product boundaries for the first version

The first generator supports the 960×540 battlefield, axis-aligned roads, the existing 70-pixel road width, existing gate/base footprints, and the current square placement system. It produces:

- one entrance and one exit;
- orthogonal routes with several bends;
- existing road and platform placements through `buildGrid()`;
- one high-ground ring, one cursed ring, and one shrine ring;
- a compatible Moonlit, Verdant, or Sunscar skin;
- a stable name, ID, recipe, geometry hash, and difficulty fingerprint.

Multi-entry split-and-merge maps come after single-lane maps. Dynamic forks, destructible shortcuts, moving exits, curved roads, and skin-specific topology remain later features because they change simulation or art contracts.

## Data model

### Recipe

A recipe is the small reproducible source of a generated layout. All geometry should use integers so the same version and seed produce identical output on every device.

```json
{
  "generator": "orthogonal-v1",
  "ruleset": 1,
  "seed": 304981722,
  "topology": "single-lane",
  "difficultyBand": "standard",
  "parameters": {
    "turns": [5, 7],
    "length": [1500, 2100],
    "coverageGap": [0.05, 0.18]
  }
}
```

The recipe does not contain a skin. A layout can be tested against several skins without changing its movement, placement, or balance.

### Materialized layout

The compiler turns a recipe into the same geometry the game already understands:

```json
{
  "layoutId": "orthogonal-v1-6f28c18b",
  "recipe": { "generator": "orthogonal-v1", "ruleset": 1, "seed": 304981722 },
  "geometryHash": "6f28c18b",
  "spawn": { "x": 48, "y": 120 },
  "base": { "x": 880, "y": 420 },
  "path": [[48,120],[210,120],[210,360],[430,360],[430,180],[690,180],[690,420],[880,420]],
  "grid": {
    "bounds": [40,70,920,480],
    "exclude": [],
    "rings": []
  }
}
```

`buildGrid()` then adds `roadSlots`, `platformSlots`, and `rings`. The geometry hash covers canonical endpoint, path, lane, grid, and derived-slot data. It catches generator or grid drift.

### Skin

Rename the conceptual role of `MAP_SCENES` to a skin registry over time. A skin keeps its existing artwork and color settings, then adds generation constraints:

```js
{
  id: "moonlit-sanctuary-v1",
  assets: { terrain, road, spawn, base },
  routeBounds: [40, 70, 920, 480],
  routeExclude: [[770, 0, 190, 120]],
  endpointSides: { spawn: ["left"], base: ["right"] },
  topologies: ["single-lane", "split-merge"],
  road: { width: 70, turns: "orthogonal" }
}
```

For the MVP, a skin is cosmetic and may reject incompatible layouts. It never changes route geometry. A published player-facing map combines a layout and skin:

```json
{
  "id": "generated-6f28c18b-moonlit",
  "layoutId": "orthogonal-v1-6f28c18b",
  "skinId": "moonlit-sanctuary-v1",
  "name": "Moonlit Switchback",
  "art": "moonlit-sanctuary-v1",
  "boss": "baphomet"
}
```

Initially the publishing script should materialize the complete record into `tdMaps.json`. That avoids adding a new runtime map-loading path across the many current JSON consumers. The recipe and analysis fields can remain on the record as ignored provenance.

### Resolved preview model

Every map preview must be created from the final materialized map record, after layout and skin resolution. The preview and the battle therefore consume the same `path` or `lanes`, spawn points, base point, and `art` key.

Add one pure `mapPreviewModel(map)` helper that returns:

```js
{
  id: map.id,
  name: map.name,
  terrain: mapSceneFor(map).assets.terrain,
  road: mapSceneFor(map).assets.road,
  spawnArt: mapSceneFor(map).assets.spawn,
  baseArt: mapSceneFor(map).assets.base,
  routes: routeStrokes(map),
  spawns: mapLanes(map).map(lane => lane.spawn),
  base: map.base,
  geometryHash: map.geometryHash,
  skinId: map.skinId ?? map.art
}
```

Free Play map cards and Campaign stage details currently draw terrain, route polylines, gates, and the base independently. Expedition route cards currently show terrain only. Move their geometry selection into this shared model, then let each screen choose an appropriate presentation size. Daily should use the same preview whenever it shows more than the battlefield name.

The preview contract is:

- the terrain and structures come from the resolved skin;
- route strokes come from the resolved layout, including every entrance and one copy of a shared lane tail;
- gate and base anchors use the same coordinates and sprite footprints as combat;
- selecting another layout or skin replaces the complete preview model;
- a preview cache key includes `geometryHash`, `skinId`, and a preview renderer version;
- previews never use a separately maintained route thumbnail or stale screenshot;
- missing art uses the same fallback policy as the battlefield and still draws its route and endpoints;
- generated decorative props may be omitted initially, but anything affecting clearance or navigation must appear.

For the first version, keep the current lightweight SVG composition. It already matches the 960×540 coordinate system and avoids generating image files for every layout-skin pair. If the catalog grows large, group maps by campaign chapter or generated pack and render cards on demand rather than placing every generated candidate in the player-facing Free Play list. The development atlas may contain hundreds of candidates; the game should expose only the approved catalog.

## Generation algorithm

### Orthogonal v1

Use a bounded randomized search on a coarse integer lattice. A 30-pixel lattice aligns naturally with the existing 60-pixel placement spacing while still allowing varied paths.

1. Choose entrance and exit anchors from skin-compatible board edges.
2. Reserve the gate, base, terrain exclusions, board margins, and a final approach corridor.
3. Build a self-avoiding route as a sequence of horizontal and vertical segments.
4. Reject short segments, immediate reversals, self-intersections, near-parallel road overlaps, and routes that enter protected rectangles.
5. Simplify collinear points and materialize pixel coordinates.
6. Run `buildGrid()` and reject layouts without enough road and platform slots.
7. Place special rings from geometry features such as a bend pocket, shared coverage basin, or late defense line.
8. Analyze the candidate and accept it only when it falls inside the requested difficulty band.

Every seed gets a fixed maximum number of attempts. Rejections use stable reason codes such as `PATH_SELF_INTERSECTION`, `SEGMENT_TOO_SHORT`, `ENDPOINT_CLEARANCE`, `PLATFORM_COUNT`, `COVERAGE_GAP`, and `SKIN_EXCLUSION`. A failed seed ends cleanly and appears in the atlas instead of retrying forever.

### Split-and-merge v2

Add a shared trunk first, then create two entrance branches with the same total length. Preserve the invariants already checked by `test-td-sim.mjs`:

- every path begins at its own visible gate and ends at the base;
- lane lengths are exactly equal;
- lanes share an identical tail after the merge;
- roads and platform tiles remain clear and selectable.

Use integer segment lengths and compensate the shorter branch before materializing it. Do not correct lane length with hidden movement multipliers.

## Validation and scoring

### Hard validation

A candidate cannot publish unless all of these pass:

- Coordinates are finite integers inside the world and permitted skin area.
- Every route begins at its spawn and ends at the base.
- Every segment has nonzero length and matches the supported road orientation.
- Non-neighboring segments do not cross or approach closely enough to merge visually.
- Gates, base, and their clearances do not overlap roads, placements, or exclusions.
- `buildGrid()` succeeds and regenerates exactly the committed slots.
- The map has at least 15 road slots and 20 platform slots, matching current test expectations.
- Placement footprints do not overlap one another or protected art.
- Multi-entry lanes meet the existing equal-length and shared-tail rules.
- The selected skin declares support for the topology and endpoint directions.

### Tactical analysis

Create a pure `analyzeMap(map)` function before creating the generator. It should report:

- total and per-lane path length;
- segment count, turn count, and distance before the first turn;
- road and platform slot counts;
- path distance visible from each platform at representative ranges;
- uncovered route percentage;
- early, middle, and late route coverage;
- number and strength of multi-segment coverage pockets;
- road-blocking density and distance from blockers to nearby platform support;
- merge position and shared-tail length for multi-entry maps;
- dominant-slot warnings where one platform covers too much of the route.

Run it on Moonlit Pass, Verdant Crossing, and Sunscar Ruins first. Those results establish descriptive baselines. They are not automatically ideal targets because the current maps already differ materially in length and difficulty.

### Bot fingerprint

Use existing headless simulation tools to measure each valid candidate with several seeds and representative squads. Record:

- win rate and lives remaining;
- first leak and defeat wave;
- run duration;
- class-removal sensitivity;
- differences between at least two placement policies;
- lane usage and kill location distribution.

The fingerprint assigns labels such as `standard`, `coverage-heavy`, `blocker-heavy`, or `high-variance`. It informs curation rather than declaring a map balanced by itself. Human review remains required until observed player outcomes track the predicted bands.

## Named landmarks

Give each accepted layout one tactical identity detected from its geometry. This makes generated maps memorable and gives the lobby a useful description.

| Landmark | Geometry rule | Player-facing meaning |
| --- | --- | --- |
| Defense Basin | Several segments enter one strong platform coverage pocket | Build a central damage hub |
| Long Watch | A long straight has sparse nearby platforms | Prepare for a weak approach |
| Last Stand | Most coverage and road slots sit in the final third | Defense concentrates near the base |
| Switchback | Repeated alternating bends create overlapping range windows | Placement can cover several route moments |
| Twin Gate | Equal entrance branches merge into a shared trunk | Split early defense, consolidate later |

In the first release, landmarks provide a name, icon, and short description. Encounter modifiers or bonus rewards can use them later after the base layouts are proven.

## Development atlas

Add a development-only atlas that renders every candidate as a small board preview with:

- seed, generator version, geometry hash, and skin;
- route, endpoints, placements, rings, and excluded areas;
- validation failures or warnings;
- tactical metrics and bot fingerprint;
- approve, reject, and notes fields stored in a small curation file.

The atlas can be built with the project's existing SVG/HTML and Node tools. No production dependency is needed. Approved recipes are materialized into the checked-in map catalog; rejected seeds remain reproducible without entering the game.

## Delivery phases

### Phase 0: measure the authored maps

Add `analyzeMap(map)` and a CLI report. Run it against all three maps and record the baseline metrics. This is the first concrete implementation step because it defines what the generator must preserve before random geometry exists.

Exit condition: the report explains obvious structural differences among Moonlit, Verdant, and Sunscar and returns stable results across repeated runs.

### Phase 1: one generated vertical slice

Implement `orthogonal-v1`, recipe serialization, bounded attempts, hard validation, canonical hashing, `buildGrid()` integration, and the shared preview model. Generate one single-lane layout, pair it with one compatible skin, and run it through Free Play as a normal checked-in map.

Exit condition: the same recipe recreates byte-equivalent geometry and slots; its Free Play and Campaign previews show the exact terrain, route, entrances, and base used in battle; restart and map switching work; the existing tower-defense suite passes; visual review shows no route or placement collision.

### Phase 2: candidate batches and atlas

Generate hundreds of candidates offline, show accepted and rejected results in the atlas, and support approval into a catalog. Add layout-skin compatibility checks and render approved layouts under all valid existing skins.

Exit condition: a reviewer can choose a candidate from its preview and metrics, regenerate it from the recipe, and publish it without hand-editing coordinates.

### Phase 3: balance fingerprinting

Connect accepted candidates to multi-seed bot simulations. Establish broad difficulty bands from geometry and combat results, then select a small first pack of three to six generated maps.

Exit condition: every published map has a validation record, visual review, bot fingerprint, named landmark, and explicit boss/music assignment.

### Phase 4: mode integration

Add generated catalog entries to Free Play first. Let Expedition sample them only after its route pool can filter by difficulty band. Add them to Daily after each Daily setup pins the stable published map ID. Campaign continues to use deliberately selected maps.

Exit condition: adding generated maps increases variety without changing Expedition length, invalidating saves, or silently changing a Daily battlefield.

### Phase 5: split-and-merge and skin packs

Implement the second topology, then add new skins that satisfy the skin capability contract. A skin pack needs terrain, road, gate, base, palette, safe bounds, exclusions, and endpoint support; it does not need new gameplay geometry.

Exit condition: at least one generated two-entry map meets equal-lane rules, and one approved layout can use two skins without changing its geometry hash or combat results.

### Phase 6: optional live seeded generation

Consider live generation only after published generated maps show that validation scores and bot fingerprints predict real outcomes. Pin generator version, ruleset, seed, skin, and geometry hash in every event or saved run. Retain old generator implementations while anything still references them, and keep a small fallback catalog of prevalidated recipes.

Exit condition: a saved or shared seed reproduces exactly after a deployment, failed generation has a bounded fallback, and a rules update cannot alter an active Daily or Expedition run.

## Files likely to change during implementation

| Area | Proposed responsibility |
| --- | --- |
| `src/game/td/map-analysis.js` | Pure geometry metrics and landmark detection |
| `src/game/td/map-generator.js` | Versioned recipe-to-layout compilers and bounded search |
| `src/game/td/map-validation.js` | Hard rules, warnings, and stable rejection codes |
| `src/game/td/map-skins.js` | Skin assets, palette, safe regions, and capabilities; later extracted from `map-scene.js` |
| `src/game/td/map-preview.js` | Shared preview model built from a resolved runtime map |
| `scripts/generate-td-maps.mjs` | Batch generation, hashing, catalog materialization, and `--check` mode |
| `scripts/report-td-maps.mjs` | Authored/generated analysis and fingerprints |
| `src/pages/previews/td-map-atlas.astro` | Development-only visual curation surface |
| `src/data/tdMaps.json` | Runtime-ready authored and approved generated entries |

Keep `grid.js`, `lanes.js`, the simulation, and mode consumers as the stable downstream contract during the early phases.

## Acceptance criteria for the first generated pack

- Each published map regenerates from its recipe with the same geometry and slot hash.
- Generation has fixed attempt bounds and reports why a seed failed.
- Existing authored maps remain byte-for-byte unchanged unless a separate change requires it.
- Every route is clear over its selected terrain at 960×540 and at the smallest supported viewport.
- Free Play, Campaign, Daily, and Expedition preview surfaces resolve the same layout and skin as the battle they launch.
- Preview routes include every entrance, merge correctly, and terminate at the displayed base.
- Switching a selected map updates terrain, route, gates, base, name, and boss together without retaining pieces from the previous map.
- Gate and base sprites align with movement thresholds.
- Every placement is selectable and units remain readable during dense waves.
- Map restart, map switching, Free Play records, Daily selection, and Expedition save sanitization behave with stable map IDs.
- Geometry checks, the tower-defense test suite, and targeted balance runs pass. The production build remains user-run per repository instructions.
- No new production dependency is introduced.

## Exploration record

The plan came from a broad architecture pass. Scores use novelty, viability, and fit on a 0–10 scale.

### Reproducibility and operations

- Signed, versioned recipes with geometry hashes `[N7 V10 F10]`
- Bounded search with rejection reason ledgers `[N7 V10 F9]`
- Immutable event epochs for generated content `[N7 V7 F7]`
- Emergency cassette of prevalidated recipes `[N7 V8 F8]`
- Shadow generation before player-visible activation `[N8 V6 F7]`
- Skin capability declarations `[N7 V9 F9]`

### Player-facing variety

- Pre-battle choice among topology cards `[N8 V7 F8]`
- Named tactical landmarks `[N8 V9 F9]`
- Difficulty budgets that spend points on geometry pressure `[N8 V8 F10]`
- Triggered mid-run shortcut gates `[N8 V5 F6]`
- Mirrored seed families with comparable timing `[N7 V6 F7]`
- Expedition fragments collected into future layouts `[N9 V4 F6]`

### Alternate representations

- Signed-distance or flow-field routes `[N10 V3 F7]`
- Reversible construction transcripts `[N9 V8 F9]`
- Offline candidate atlas with bot curation `[N7 V10 F10]`
- Tactical sentences compiled into geometry `[N9 V5 F7]`
- Skins that distort topology `[N9 V4 F7]`
- Solve geometry backward from arrival schedules `[N10 V3 F7]`

The shortlist was versioned recipes, an offline curated atlas, and tactical difficulty budgets with landmarks. Together they form the recommended architecture.

### Traps deferred from the core plan

- Runtime-only generation would expose players to geometry that has not had visual or balance review and would complicate saves immediately.
- Flow fields would require movement, drawing, slot generation, and targeting assumptions to change together.
- Skin-driven topology would make a cosmetic selection alter balance and reduce layout reuse.
- Dynamic shortcut gates would require enemies, targeting progress, road rendering, and wave balance to handle route changes mid-run.
- A player-owned fragment collection is an additional progression system before the generator itself is trustworthy.
- Solving routes backward from combat timings is powerful but needs a validated difficulty model that does not exist yet.

## Provocation

Once the atlas exists, maps can become a form of authored content language: a designer could request “late defense, two strong crossfire pockets, weak opening, Sunscar skin,” then browse several validated layouts rather than place every waypoint by hand. The generator's best long-term role may be a designer copilot rather than invisible runtime randomness.

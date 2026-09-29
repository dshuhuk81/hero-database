# Tower defense map system — AI agent runbook

Use this document when delegating tower-defense map work to an AI coding agent in this repository.

## Delegation prompt

> Follow `docs/tower-defense-map-agent-runbook.md`. Continue the map-system work in small, verified steps. Inspect the current working tree first, preserve unrelated changes, complete one bounded milestone at a time, and report what is usable before moving to the next milestone. Do not run `npm run build`; the user runs production builds.

## Objective

Develop a data-driven tower-defense map system that can:

- store fixed layouts and deterministic generator recipes;
- reuse layouts with compatible visual skins;
- generate valid paths, entrances, exits, deployment slots, and special rings;
- show the exact resolved battlefield in every preview pane;
- assign stable layouts to Campaign stages and progression bands;
- validate and analyze maps before they become playable;
- publish approved generated maps through the existing runtime map contract.

Generated Campaign maps must remain stable. A published stage always resolves to the same layout, skin, entrances, base, placements, and geometry hash.

## Read first

Before changing code, inspect:

- `AGENTS.md`
- `docs/tower-defense-map-generator-plan.md`
- `map.md`
- `src/data/tdMaps.json`
- `src/data/tdCampaign.json`
- `src/game/td/grid.js`
- `src/game/td/lanes.js`
- `src/game/td/map-analysis.js`
- `src/game/td/map-validation.js`
- `src/game/td/map-preview.js`
- `src/game/td/map-scene.js`
- `scripts/build-td-grid.mjs`
- `scripts/report-td-maps.mjs`

Also run `git status --short`. Existing changes belong to the user or another active task. Do not overwrite or revert them.

## Current implementation

The repository currently has three runtime maps:

- `moonlit-pass`
- `verdant-crossing`
- `sunscar-ruins`

The runtime map format already supports:

- one entrance through top-level `spawn` and `path`;
- multiple entrances through `lanes`;
- a visible `base` endpoint;
- generated road and platform placements;
- map-specific scene art;
- Free Play, Campaign, Daily, and Expedition consumers.

The following map-system foundations are implemented:

- `analyzeMap(map)` reports deterministic route, lane, placement, coverage, support, and landmark metrics.
- `validateMap(map)` returns stable error codes for invalid geometry, endpoints, lanes, grids, and slot counts.
- `mapPreviewModel(map)` resolves terrain, route strokes, entrances, base, skin ID, and geometry hash from the same map object used by combat.
- Free Play and Campaign full-map previews use the shared preview model.
- `npm run td:maps` prints analysis and validation for the current catalog.

`orthogonal-v1` is implemented (September 29, 2026): `src/game/td/map-generator.js`, CLI `scripts/generate-td-map.mjs` (`npm run td:generate-map`), tests `scripts/test-td-map-generator.mjs`. First published map: `sunscar-basin` (Campaign Chapter 2). Details in `TOWER_DEFENSE_SPEC.md` section 7. Next bounded step: batch candidate generation and a development atlas (the per-seed PNG overlay used to pick seed 3 was a throwaway script).

## Existing-map workflow

When adding or modifying a map manually:

1. Add or edit the map record in `src/data/tdMaps.json`.
2. Set `id`, `name`, `art`, `boss`, and `music`.
3. Define `spawn`, `base`, and `path`, or define `lanes` for multiple entrances.
4. Define `grid.bounds`, optional `grid.exclude`, special-ring anchors, and optional authored platform positions.
5. Generate placements:

   ```bash
   node scripts/build-td-grid.mjs
   ```

6. Analyze and validate all maps:

   ```bash
   npm run td:maps
   npm run td:maps -- --json
   ```

7. Confirm every published map reports `valid: yes`.
8. Inspect the Free Play and Campaign previews in the browser.
9. Run appropriate gameplay checks:

   ```bash
   npm run test:tower-defense
   npm run test:td-balance
   ```

Do not run `npm run build`.

## Runtime map invariants

Every map must satisfy these rules:

- The world is 960×540 logical pixels.
- Route coordinates are finite integers.
- Initial generated roads use horizontal and vertical segments.
- A route starts exactly at its visible spawn aperture.
- Every route ends exactly at the visible base threshold.
- No route contains a zero-length, short, diagonal, or self-intersecting segment.
- `buildGrid(map)` must reproduce committed `roadSlots`, `platformSlots`, and `rings` exactly.
- A map has at least 15 road slots and 20 platform slots unless the game design and validator are deliberately changed together.
- Entrances, the base, routes, placements, and tall terrain features remain visually clear.
- Multi-entry lanes have exactly equal travel length.
- Multi-entry lanes merge into an identical shared final segment.
- A skin must explicitly support the route topology and endpoint directions.

Do not hide lane differences behind enemy speed multipliers.

## Preview contract

Every preview pane must use the same resolved map object as combat.

The shared preview model supplies:

- terrain from the resolved skin;
- route strokes from the resolved layout;
- every entrance and its gate sprite;
- the base position and structure sprite;
- `geometryHash` and `skinId` provenance.

When map selection changes, update these together:

- terrain;
- route;
- gates;
- base;
- name;
- boss.

Do not create separately maintained route thumbnails. Lightweight SVG previews are the current approach. A cache key must eventually include `geometryHash`, `skinId`, and a preview renderer version.

Free Play and Campaign already use the shared model. Review Expedition and Daily before claiming preview integration is complete; their compact surfaces may need a smaller presentation of the same preview model.

## Planned source catalogs

Keep these responsibilities separate:

```text
tdMapLayouts.json     fixed geometry and deterministic recipes
tdMapSkins.json       art, endpoint support, safe regions and capabilities
tdWaveProfiles.json   reusable enemy and wave compositions
tdCampaign.json       stages, progression bands, rewards and overrides
          |
          v
compiled tdMaps.json + resolved Campaign data
```

For early milestones, `tdMaps.json` remains the runtime-ready output so existing consumers do not need a second loading path.

### Layouts

A layout owns gameplay geometry:

- `layoutId`
- fixed points or a versioned recipe;
- topology;
- spawn and base geometry;
- grid rules;
- geometry hash;
- analysis fingerprint;
- validation result;
- landmark classification.

### Skins

A skin owns presentation and compatibility:

- terrain, road, gate, base, and optional pad assets;
- palette and scene settings;
- permitted route bounds and excluded regions;
- supported endpoint sides;
- supported topologies and road orientations.

A skin must not change gameplay geometry in the first implementation.

### Campaign progression bands

Use non-overlapping level ranges:

- levels 1–10;
- levels 11–20;
- levels 21–30;
- levels 31–40;
- later bands as needed.

A band supplies defaults such as layout pool, skin pool, wave profile, lives, and health scaling. A published Campaign stage stores its selected layout and skin IDs and may override any band default. Tutorial stages and bosses should remain explicitly authored.

## Milestone `orthogonal-v1` (done September 29, 2026)

Kept below as the reference for what it had to do. Deviations: the lattice is anchored at the gate (corner x values step by 30 from x 48), and skin safe regions travel in `recipe.constraints.exclude` so a published recipe regenerates without the skin catalog.

Implement one deterministic single-lane generator before adding catalogs or Campaign expansion.

### Input recipe

Use a compact versioned recipe similar to:

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

### Algorithm

1. Use integer geometry and the existing deterministic RNG approach.
2. Choose compatible entrance and base anchors.
3. Generate a self-avoiding route on a coarse lattice, initially 30 pixels.
4. Use a fixed maximum attempt count.
5. Reject invalid candidates with stable validation codes.
6. Run `buildGrid()` to derive placements and special rings.
7. Run `analyzeMap()` and require metrics within the requested band.
8. Create a canonical geometry hash covering endpoints, route, grid, placements, and rings.
9. Return a complete runtime-compatible map record plus its recipe and provenance.

The generator must be pure: the same recipe and generator version always produce byte-equivalent geometry and placements.

### First vertical-slice acceptance

- One seed produces one valid single-lane map.
- Repeated generation produces the same output and geometry hash.
- A deliberately invalid seed or impossible parameter set fails within the attempt bound and reports rejection reasons.
- `buildGrid()` regenerates the committed slots exactly.
- `npm run td:maps` accepts the candidate.
- The shared preview shows the same terrain, route, gate, and base used in combat.
- The candidate can run in Free Play as an ordinary checked-in map.
- Existing authored maps remain unchanged.

Do not implement live runtime generation in this milestone.

## Subsequent milestones

Complete these one at a time:

1. `orthogonal-v1` deterministic vertical slice.
2. Batch candidate generation and a development atlas.
3. Layout and skin catalogs with a build-time compiler.
4. Bot difficulty fingerprints and approval workflow.
5. First reviewed pack of three to six generated maps.
6. Campaign progression bands and reusable wave profiles.
7. Expedition and Daily integration using stable published map IDs.
8. Equal-length split-and-merge generation.
9. Optional live seeded generation after validation predicts real outcomes reliably.

## Small-step working agreement

For every delegated session:

1. Choose one bounded milestone.
2. State what will and will not change.
3. Implement the smallest complete vertical slice.
4. Run focused syntax and behavior checks.
5. Run broader tests only when the change affects gameplay or integration.
6. Inspect `git status --short` and preserve unrelated changes.
7. Report files changed, commands run, results, and remaining limitations.
8. Stop at the milestone boundary if usage is constrained or the next step would mix separate risks.

If the usage meter is unavailable to the agent, say so directly. Use the user-provided remaining percentage and the observed scope to decide whether one more bounded milestone is reasonable.

## Verification guidance

Focused checks currently available:

```bash
node --check src/game/td/map-analysis.js
node --check src/game/td/map-validation.js
node --check src/game/td/map-preview.js
node --check scripts/report-td-maps.mjs
npm run td:maps
node scripts/build-td-grid.mjs --check
git diff --check
```

`npm run check` may report unrelated repository-wide diagnostics. Record its result accurately and distinguish new errors in touched files from existing failures. Do not repair unrelated diagnostics unless the user expands the task.

For map geometry or gameplay changes, also run:

```bash
npm run test:tower-defense
npm run test:td-balance
```

For visual integration, inspect at least:

- Free Play battlefield selection;
- selected-map mode screen;
- Campaign stage preview;
- the loaded battle;
- multi-entry rendering;
- small viewport readability.

## Completion reporting template

Use this structure at the end of a delegated milestone:

```text
Completed:
- ...

Verified:
- command — result
- visual surface — result

Known limitations:
- ...

Next bounded step:
- ...
```


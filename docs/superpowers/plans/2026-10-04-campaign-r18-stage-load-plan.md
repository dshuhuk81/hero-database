# Campaign R18 Rollout and Stage-Load Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the approved R18 presentation for every Campaign run and add a deterministic WoR-inspired Campaign load report without automatically changing balance values.

**Architecture:** Campaign context flows from the existing session controller into one pure tilt-resolution helper used by the renderer; explicit Free Play map flags and per-map overrides remain intact. A separate pure Campaign load module drives a CLI report by using the simulator’s own wave shaping, spawn queue and enemy stat calculation, so analytics cannot drift from runtime combat rules.

**Tech Stack:** Astro 7, plain TypeScript/JavaScript ESM, JSON tuning data, Node 22+ scripts and `node:assert` tests.

**Spec:** `docs/superpowers/specs/2026-10-04-campaign-r18-stage-load-design.md`

## Global Constraints

- Do not run `npm run build`; production builds belong to the owner.
- Do not hand-edit generated `roadSlots`, `platformSlots`, `rings` or `geometryHash` data.
- Do not add production dependencies.
- Do not copy raw WoR values into game data or add WoR files as runtime/build dependencies.
- Do not automatically edit `tdCampaign.json`; the audit emits evidence and recommendations only.
- Preserve the portrait-phone orientation gate; there is no portrait gameplay layout.
- Preserve unrelated uncommitted work already present in the checkout.

## Review Focus

- A map shared by Campaign and Free Play must tilt in Campaign while remaining governed by its explicit map flag in Free Play.
- `?tilt=off`, numeric tilt overrides and `perMap` values must retain their current precedence.
- 10x5 Campaign finales must use R18 even though the first public review matrix covered only 6x3, 8x4 and 9x5.
- Stage-load metrics must account for wave shaping, gate splitting and minimum spawn spacing exactly once.
- Boss overrides and summoned children must not silently inflate authored wave load; children are reported separately.

---

### Task 1: Resolve R18 from run context

**Files:**
- Modify: `scripts/test-td-ui.mjs`
- Modify: `src/game/td/render.js`
- Modify: `src/game/td/page/session.ts`
- Modify: `src/data/gameBalance.tuning.json`

**Interfaces:**
- Produces: `resolveTilt(map, tiltConfig, { campaign, param }) -> { enabled, k, offsetY }`
- Produces: `createRenderer(canvas, game, { boss, campaign })`
- Consumes: existing `tuning.board.tilt.maps`, `perMap`, `k`, `offsetY` and URL override semantics.

- [ ] **Step 1: Write failing tilt-resolution tests**

Add assertions for an explicitly enabled Free Play map, an unlisted Free Play control map, the
same control map in Campaign context, an 8x4 stage, a 9x5 stage, a 10x5 finale, `?tilt=off`, a
numeric override and the `proto-slabs` per-map override. Assert that every current Campaign stage
resolves to `enabled: true` when `campaign: true`.

- [ ] **Step 2: Run the UI test and verify RED**

Run: `node scripts/test-td-ui.mjs`

Expected: FAIL because `resolveTilt` or the Campaign-wide flag does not exist.

- [ ] **Step 3: Implement the pure resolver**

Export `resolveTilt(map, tiltConfig, { campaign = false, param = null } = {})` from
`src/game/td/render.js`. Enable when the map is explicit or the run is Campaign and
`tiltConfig.campaign` is true. Return the clamped numeric factor and the winning per-map/shared
offset without reading browser globals inside the helper.

- [ ] **Step 4: Pass Campaign context to the renderer**

In `session.ts`, call `createRenderer` with `campaign: Boolean(campaignStage)`. In `createRenderer`,
read the URL parameter once, call `resolveTilt`, and use its result for `tiltView`, `tiltRoot` and
`data-bleed`.

- [ ] **Step 5: Enable the Campaign default**

Add `"campaign": true` to `tuning.board.tilt`. Keep the existing explicit map list and
`proto-slabs` override unchanged.

- [ ] **Step 6: Run focused verification**

Run: `node scripts/test-td-ui.mjs && node scripts/test-td-sim.mjs && node scripts/test-td-skin.mjs && node scripts/test-td-map-generator.mjs`

Expected: all commands exit 0.

- [ ] **Step 7: Commit Task 1**

Commit only Task 1 files with message `feat: enable R18 across campaign`.

---

### Task 2: Calculate effective Campaign stage load

**Files:**
- Create: `src/game/td/campaign-load.js`
- Create: `scripts/test-td-campaign-load.mjs`

**Interfaces:**
- Produces: `stageLoad({ stage, map, tuning }) -> StageLoadRow`
- Produces: `campaignLoadRows({ campaign, maps, tuning }) -> StageLoadRow[]`
- `StageLoadRow` fields: `stageId`, `chapter`, `mapId`, `theme`, `board`, `gates`,
  `spawnGroups`, `enemyCount`, `enemyTypes`, `lastSpawnMs`, `spawnWindowMs`,
  `enemiesPerSecond`, `totalHp`, `totalAtk`, `avgArmor`, `avgMres`, `maxHp`, `maxAtk`,
  `hpLoad`, `atkLoad`, `compositeLoad`, `hpScale`, `lives`, `hasBoss`,
  `summonedKinds`, `diagnostics`.

- [ ] **Step 1: Write a failing controlled-load test**

Use a small two-wave, two-gate fixture with one shaped normal group and one boss. Assert effective
count, queue-derived last spawn, stage health scale, total HP/ATK, weighted armor/MRES, maxima,
boss presence and that summoned kinds are named but excluded from authored totals.

- [ ] **Step 2: Verify the controlled test is RED**

Run: `node scripts/test-td-campaign-load.mjs`

Expected: FAIL because `campaign-load.js` does not exist.

- [ ] **Step 3: Implement `stageLoad` through simulator behavior**

For each wave, create an isolated `TowerDefenseGame` with the stage’s map, waves and `hpScale`.
Advance to the requested wave with `startWave()`, use its planned `spawnQueue`, and call
`spawnEnemy` for each queue entry to obtain the same effective health, attack, armor and magic
resistance as runtime. Aggregate only the returned authored enemy; record boss-configured summon
kinds separately. Never step combat or mutate imported inputs.

- [ ] **Step 4: Implement Campaign normalization**

`campaignLoadRows` resolves all authored stages in order, validates their maps, calculates the
rows, then normalizes HP and ATK against stage 1-1 and calculates
`compositeLoad = sqrt(hpLoad * atkLoad)`. Return finite zero-safe values and explicit diagnostics
for missing maps, enemy kinds or empty effective groups.

- [ ] **Step 5: Add full Campaign invariants**

Assert one stable row per authored stage, unique stage ids, finite non-negative metrics, 1-1 loads
equal to 1, all current board-size/gate combinations represented, stable input objects before and
after analysis, and deterministic repeated output.

- [ ] **Step 6: Run analyzer and simulator tests**

Run: `node scripts/test-td-campaign-load.mjs && node scripts/test-td-sim.mjs`

Expected: both commands exit 0.

- [ ] **Step 7: Commit Task 2**

Commit only Task 2 files with message `feat: calculate campaign stage load`.

---

### Task 3: Add the Campaign load report

**Files:**
- Create: `scripts/td-campaign-load.mjs`
- Modify: `scripts/test-td-campaign-load.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run td:campaign-load`
- Accepts: optional `--csv=<path>` and optional `--chapter=<number>` filters.
- Consumes: `campaignLoadRows(...)` from Task 2.

- [ ] **Step 1: Write failing formatter and CLI-contract tests**

Assert the fixed CSV header order from the spec, correctly quoted names/diagnostics, deterministic
rows, a concise Markdown summary, the four progression bands and adjacent-stage review flags for
large changes in composite load, count, spawn pressure or resistance mix.

- [ ] **Step 2: Verify RED**

Run: `node scripts/test-td-campaign-load.mjs`

Expected: FAIL because the report formatters and command do not exist.

- [ ] **Step 3: Implement the CLI and package command**

Create `scripts/td-campaign-load.mjs`, export formatter helpers for tests, print Markdown to stdout,
write CSV only when `--csv` is supplied, and add `"td:campaign-load": "node scripts/td-campaign-load.mjs"`
to `package.json`. Invalid chapter numbers or unwritable CSV paths must exit non-zero with a concise
message.

- [ ] **Step 4: Add recommendation attribution**

Each flagged row names the primary review lever: `hpScale`, composition, count, `gapMs`/group order,
resistance mix or lives. Do not emit a replacement number and never write `tdCampaign.json`.

- [ ] **Step 5: Verify the report**

Run: `node scripts/test-td-campaign-load.mjs`

Run: `npm run td:campaign-load -- --chapter=1`

Run: `npm run td:campaign-load -- --chapter=1 --csv=/tmp/td-campaign-load.csv`

Expected: tests exit 0, Markdown includes all Chapter 1 stages, and the CSV has the fixed header plus
one row per Chapter 1 stage.

- [ ] **Step 6: Commit Task 3**

Commit only Task 3 files with message `feat: report campaign stage load`.

---

### Task 4: Synchronize the design documentation

**Files:**
- Modify: `TOWER_DEFENSE_ROADMAP.md`
- Modify: `TOWER_DEFENSE_SPEC.md`
- Modify: `TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md`

**Interfaces:**
- Consumes: completed behavior and command names from Tasks 1–3.
- Produces: one canonical current-state description with named cross-links.

- [ ] **Step 1: Update current state and links**

Mark Campaign-wide R18 complete, explain that Free Play remains explicit, document the fallback art
behavior, add `td:campaign-load` to the tools table, and link the design specification by name.

- [ ] **Step 2: Separate evidence from tuning decisions**

State that the load report supplies balance evidence while `td-board-tune`, Campaign simulation and
owner review still decide actual data changes. Do not copy external WoR numbers into the current
game specification.

- [ ] **Step 3: Verify documentation integrity**

Run: `git diff --check`

Run a local Markdown-link existence check for the three updated documents and the specification.

Expected: no whitespace errors and all repository-local links resolve.

- [ ] **Step 4: Commit Task 4**

Commit only the documentation files with message `docs: record campaign R18 and load audit`.

---

### Task 5: Final verification

**Files:** none expected.

**Interfaces:** consumes every prior task.

- [ ] **Step 1: Run the complete focused verification set**

Run: `node scripts/test-td-ui.mjs && node scripts/test-td-campaign-load.mjs && node scripts/test-td-sim.mjs && node scripts/test-td-skin.mjs && node scripts/test-td-map-generator.mjs`

Expected: all commands exit 0.

- [ ] **Step 2: Run the repository TD suite without hiding known failures**

Run: `npm run test:tower-defense`

Expected: report the actual result. Do not change Campaign balance values merely to make this task
green; any existing balance failure remains a separate reviewed tuning action.

- [ ] **Step 3: Run the report over all stages**

Run: `npm run td:campaign-load -- --csv=/tmp/td-campaign-load.csv`

Expected: 82 deterministic data rows plus one header, no missing-map or missing-enemy diagnostics,
and no source-file modifications.

- [ ] **Step 4: Audit the final diff**

Confirm that no generated geometry, hero data, economy, rewards, summon configuration or Campaign
balance values changed. Confirm the pre-existing uncommitted files are preserved.

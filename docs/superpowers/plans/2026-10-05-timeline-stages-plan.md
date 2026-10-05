# Timeline Stages (no more waves) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wave system of the Tower Defense game with one timeline of spawn groups per stage or map (Watcher of Realms style), show the defeated-enemy count instead of waves, and remove every wave concept from code, data, tests, scripts and docs.

**Architecture:** A pure module `src/game/td/timeline.js` expands a stage's `timeline` (spawn groups with `startMs`, `count`, `repeat`, `everyMs`) into a time-ordered spawn queue. `sim.js` starts that queue once (`start()`), ends the run when the queue and the field are empty, and offers run blessings at defeat milestones. All data (`tdCampaign.json`, `tdMaps.json`) is converted once by a script that follows the WoR chapter table. UI, modes, save data, tools and docs are re-keyed from waves to enemies defeated.

**Tech Stack:** Plain ES modules (`src/game/td/*.js`), TypeScript page modules (`src/game/td/page/*.ts`), Astro components, Node test scripts (`scripts/test-td-*.mjs`, run with `npm run test:tower-defense`), PixiJS renderer.

**Spec:** [Timeline Stages: no more waves](../specs/2026-10-05-timeline-stages-design.md). Read it first: it holds the data model (section 2), the WoR table (section 3) and the decision for every wave-bound feature (section 4). Related: [Campaign Encounter Pacing](../specs/2026-10-05-campaign-encounter-pacing-design.md), [Tower Defense Roadmap](../../../TOWER_DEFENSE_ROADMAP.md), [TOWER_DEFENSE_SPEC.md](../../../TOWER_DEFENSE_SPEC.md) (current rules; code wins on disagreement).

## Global Constraints

- Never write a double dash in visible UI text or prose; use a single hyphen (owner rule). This applies to docs, notices and chips.
- All UI follows `design-system/STYLE_GUIDELINES.md`; do not run Playwright for UI-only changes, the owner checks visuals on the dev build.
- Docs and code comments are English; user-facing strings are English.
- After each implemented task update `TOWER_DEFENSE_SPEC.md` (the current-state reference) and, for roadmap topics, `TOWER_DEFENSE_ROADMAP.md`.
- Simulation time only: the timeline never reads the wall clock, so pause, 1x/2x/4x speed and seeded replays stay exact and deterministic.
- Do not edit or "clean up" files you did not touch; check `git status` first (another agent is changing the economy and removing the hero upgrade system, see Task 0).
- `npm run test:tower-defense` must pass at the end of every task that touches game code. `npm run check` (astro check) must show no new errors in `src/game/td/**`.
- Commit attribution: end commit messages with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Existing tuning names are kept where the meaning does not change (`placementPerSecond`, `blocking`, `interventions`, `bosses`, `enemies`).

## Review Focus

Failure modes the spec implies but no feature task would otherwise test:

1. **Old saves.** A save with `bestWave`, `mapTop` keys like `moonlit-pass@long` and a daily record `bestWave` must load without errors and without losing the player's score records (Task 6 pins it).
2. **Boss waiting for ever.** A boss group must still spawn when a leftover enemy can never die (an enemy held far from every hero) after `bossWaitMs`, and the stage must not deadlock (Task 3).
3. **Two gates, one enemy.** A group with `count: 1` (or fewer enemies than gates) on a two-gate map spawns at gate 0, and counts alternate across groups so one gate is not always the first (Task 1).
4. **Deterministic replays.** The same seed and timeline at 1x and at 4x speed give the same spawn times and enemy ids (Task 3).
5. **The last enemy is a summon or a brood split.** Win must wait for summoned children and must not count them toward `total` or `down` (Task 3).

---

### Task 0: Prerequisite and branch

The economy rework and the removal of the hero upgrade system are being done by another agent in the same files (`sim.js`, `hud.ts`, `session.ts`, `results.ts`, most `scripts/test-td-*.mjs`). Starting before it lands means constant conflicts.

**Files:**
- No code. Creates the branch `td-timeline`.

**Interfaces:**
- Produces: a clean base commit that already contains the upgrade removal and the placement economy.

- [ ] **Step 1: Check the working tree**

Run: `git status --short | grep -v '^??' | wc -l`
Expected: `0` (everything of the other agent is committed). If not, stop and ask the owner to commit or tell you which files are theirs.

- [ ] **Step 2: Run the baseline suite**

Run: `npm run test:tower-defense`
Expected: PASS. Record any pre-existing failure in the final report instead of fixing it here.

- [ ] **Step 3: Create the branch**

Run: `git switch -c td-timeline`
Expected: `Switched to a new branch 'td-timeline'`

- [ ] **Step 4: Inventory the wave references (the work list for Task 12)**

Run: `grep -rniE '\bwaves?\b' src scripts --include='*.js' --include='*.ts' --include='*.astro' --include='*.mjs' --include='*.json' --include='*.css' -l | sort > /tmp/wave-files.txt; wc -l /tmp/wave-files.txt`
Expected: a file count (about 80 on October 5). Keep the list; Task 12 shrinks it to the allowed leftovers.

---

### Task 1: The timeline module

**Files:**
- Create: `src/game/td/timeline.js`
- Create: `scripts/test-td-timeline.mjs`
- Modify: `package.json` (add the script to the `test:tower-defense` chain)

**Interfaces:**
- Produces:
  - `DEFAULT_SPACING_MS = 700`
  - `expandTimeline(timeline, { gates = 1, spacingMs = DEFAULT_SPACING_MS } = {}) -> Array<{ at: number, kind: string, lane: number, group: number }>` sorted by `at` (seconds, stable by group then index). Gate choice alternates across the whole timeline (a shared counter), so a count of 1 does not always use gate 0.
  - `timelineTotals(timeline) -> { total: number, counts: Record<string, number>, lastAt: number, groups: number }` (`lastAt` in seconds of the last spawn without gate spacing).
  - `validateTimeline(timeline) -> string[]` (empty when valid; messages for non-array, negative `startMs`, `count < 1`, `repeat > 1` without `everyMs`, unknown shape).

- [ ] **Step 1: Write the failing test**

```js
// scripts/test-td-timeline.mjs
import assert from "node:assert/strict";
import { expandTimeline, timelineTotals, validateTimeline } from "../src/game/td/timeline.js";

const timeline = [
  { startMs: 3000, kind: "grunt", count: 2, repeat: 3, everyMs: 4000 },
  { startMs: 21000, kind: "flyer", count: 1 },
  { startMs: 40000, kind: "boss", count: 1 },
];

// Totals: 2 x 3 + 1 + 1.
assert.deepEqual(timelineTotals(timeline), { total: 8, counts: { grunt: 6, flyer: 1, boss: 1 }, lastAt: 40, groups: 3 });

// Expansion: repeats at 3 s, 7 s, 11 s; two enemies per repeat 700 ms apart; sorted by time.
const queue = expandTimeline(timeline, { gates: 1, spacingMs: 700 });
assert.equal(queue.length, 8);
assert.deepEqual(queue.slice(0, 4).map((e) => e.at), [3, 3.7, 7, 7.7]);
assert.deepEqual(queue.map((e) => e.at), [...queue.map((e) => e.at)].sort((a, b) => a - b), "sorted by time");
assert.equal(queue.at(-1).kind, "boss");

// Gates alternate across the whole timeline, so single-enemy groups use both gates.
const two = expandTimeline([{ startMs: 0, kind: "flyer", count: 1, repeat: 4, everyMs: 1000 }], { gates: 2 });
assert.deepEqual(two.map((e) => e.lane), [0, 1, 0, 1], "one enemy per repeat alternates gates");
const pair = expandTimeline([{ startMs: 0, kind: "grunt", count: 2 }, { startMs: 5000, kind: "grunt", count: 3 }], { gates: 2 });
assert.deepEqual(pair.map((e) => e.lane), [0, 1, 0, 1, 0], "the gate counter continues across groups");

// Validation.
assert.deepEqual(validateTimeline(timeline), []);
assert.ok(validateTimeline("x").length, "non-array is rejected");
assert.ok(validateTimeline([{ startMs: -1, kind: "grunt", count: 1 }]).some((m) => m.includes("startMs")), "negative start");
assert.ok(validateTimeline([{ startMs: 0, kind: "grunt", count: 0 }]).some((m) => m.includes("count")), "zero count");
assert.ok(validateTimeline([{ startMs: 0, kind: "grunt", count: 1, repeat: 2 }]).some((m) => m.includes("everyMs")), "repeat needs everyMs");
console.log("Timeline checks passed.");
```

- [ ] **Step 2: Run it to see it fail**

Run: `node scripts/test-td-timeline.mjs`
Expected: FAIL with `Cannot find module '../src/game/td/timeline.js'`.

- [ ] **Step 3: Write the module**

```js
// src/game/td/timeline.js
// A stage's enemies as one timeline of spawn groups (Watcher of Realms style) instead of waves.
// group = { startMs, kind, count, repeat = 1, everyMs = 0 }: `count` enemies at startMs (one every spacingMs),
// repeated `repeat` times every `everyMs`. Pure and deterministic. See
// docs/superpowers/specs/2026-10-05-timeline-stages-design.md.
export const DEFAULT_SPACING_MS = 700;

export function validateTimeline(timeline) {
  if (!Array.isArray(timeline)) return ["timeline must be an array"];
  const errors = [];
  timeline.forEach((group, i) => {
    const at = `group ${i + 1}`;
    if (!group || typeof group.kind !== "string") errors.push(`${at}: kind missing`);
    if (!(group?.startMs >= 0)) errors.push(`${at}: startMs must be 0 or more`);
    if (!(group?.count >= 1)) errors.push(`${at}: count must be 1 or more`);
    if ((group?.repeat ?? 1) > 1 && !(group?.everyMs > 0)) errors.push(`${at}: repeat needs everyMs`);
  });
  return errors;
}

export function timelineTotals(timeline) {
  const counts = {};
  let total = 0;
  let lastAt = 0;
  for (const group of timeline) {
    const repeat = group.repeat ?? 1;
    const n = group.count * repeat;
    counts[group.kind] = (counts[group.kind] ?? 0) + n;
    total += n;
    lastAt = Math.max(lastAt, (group.startMs + (repeat - 1) * (group.everyMs ?? 0)) / 1000);
  }
  return { total, counts, lastAt, groups: timeline.length };
}

export function expandTimeline(timeline, { gates = 1, spacingMs = DEFAULT_SPACING_MS } = {}) {
  const queue = [];
  let turn = 0; // one counter for the whole timeline: gates take turns across groups
  timeline.forEach((group, groupIndex) => {
    const repeat = group.repeat ?? 1;
    for (let r = 0; r < repeat; r += 1) {
      for (let i = 0; i < group.count; i += 1) {
        const at = (group.startMs + r * (group.everyMs ?? 0) + i * spacingMs) / 1000;
        queue.push({ at: Math.round(at * 1000) / 1000, kind: group.kind, lane: turn++ % Math.max(1, gates), group: groupIndex });
      }
    }
  });
  return queue.sort((a, b) => a.at - b.at || a.group - b.group);
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `node scripts/test-td-timeline.mjs`
Expected: `Timeline checks passed.`

- [ ] **Step 5: Register the test and commit**

In `package.json` insert `node scripts/test-td-timeline.mjs && ` right after `node scripts/build-game-balance.mjs --check && ` in `test:tower-defense`.

```bash
git add src/game/td/timeline.js scripts/test-td-timeline.mjs package.json
git commit -m "feat(td): timeline module for wave-free stages"
```

---

### Task 2: Converter, WoR chapter table and the data migration

**Files:**
- Create: `scripts/td-stage-convert.mjs`
- Create: `src/game/td/timeline-targets.js`
- Create: `scripts/test-td-timeline-targets.mjs`
- Modify: `src/data/gameBalance.tuning.json` (add `timeline` block)
- Modify: `src/data/tdCampaign.json` (every stage: `waves` becomes `timeline`, `hpScale` adjusted)
- Modify: `src/data/tdMaps.json` (maps not used by a stage get a `timeline`; all maps keep an optional `timeline` for Free Play)
- Delete (end of Task 4, not here): `src/data/tdWaves.json`

**Interfaces:**
- Consumes: `timelineTotals`, `validateTimeline` from Task 1.
- Produces:
  - `chapterTarget(chapter, position) -> { enemies: number, groups: number, lastSpawnS: number }` in `timeline-targets.js`; `position` is 0 for the chapter's first stage and 1 for its last. Rows are the WoR table of the spec (section 3), chapters above 11 use row 11, ramp 0.8x to 1.2x.
  - `convertStage({ stage, chapter, index, count, gates, shape }) -> { timeline, hpScale }` in the script (exported for the test).
  - tuning: `"timeline": { "spacingMs": 700, "bossWaitMs": 30000, "chapterTargets": [...] }` mirrors the spec table (the module reads the tuning rows; the JSON is the single source).

- [ ] **Step 1: Add the tuning block**

Add to `src/data/gameBalance.tuning.json` (top level):

```json
"timeline": {
  "spacingMs": 700,
  "bossWaitMs": 30000,
  "chapterTargets": [
    { "chapter": 1,  "enemies": 11, "groups": 9,  "lastSpawnS": 53 },
    { "chapter": 2,  "enemies": 25, "groups": 15, "lastSpawnS": 97 },
    { "chapter": 3,  "enemies": 27, "groups": 15, "lastSpawnS": 138 },
    { "chapter": 4,  "enemies": 32, "groups": 22, "lastSpawnS": 155 },
    { "chapter": 5,  "enemies": 32, "groups": 21, "lastSpawnS": 150 },
    { "chapter": 6,  "enemies": 32, "groups": 18, "lastSpawnS": 167 },
    { "chapter": 7,  "enemies": 37, "groups": 18, "lastSpawnS": 178 },
    { "chapter": 8,  "enemies": 40, "groups": 19, "lastSpawnS": 200 },
    { "chapter": 9,  "enemies": 22, "groups": 16, "lastSpawnS": 220 },
    { "chapter": 10, "enemies": 30, "groups": 23, "lastSpawnS": 218 },
    { "chapter": 11, "enemies": 38, "groups": 29, "lastSpawnS": 234 }
  ]
}
```

- [ ] **Step 2: Write the failing test for the targets**

```js
// scripts/test-td-timeline-targets.mjs
import assert from "node:assert/strict";
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { chapterTarget } from "../src/game/td/timeline-targets.js";

const first = chapterTarget(tuning, 1, 0), last = chapterTarget(tuning, 1, 1);
assert.deepEqual(first, { enemies: 9, groups: 7, lastSpawnS: 42 }, "chapter 1 starts at 0.8x");
assert.deepEqual(last, { enemies: 13, groups: 11, lastSpawnS: 64 }, "chapter 1 ends at 1.2x");
assert.deepEqual(chapterTarget(tuning, 13, 0.5), chapterTarget(tuning, 11, 0.5), "chapters above 11 reuse row 11");
assert.ok(chapterTarget(tuning, 4, 0.5).enemies === 32, "the middle of a chapter is the row itself");
console.log("Timeline target checks passed.");
```

- [ ] **Step 3: Run it to see it fail**

Run: `node scripts/test-td-timeline-targets.mjs`
Expected: FAIL (`Cannot find module`).

- [ ] **Step 4: Write `timeline-targets.js`**

```js
// src/game/td/timeline-targets.js
// Per-stage enemy count, group count and spawn window, from the WoR chapter table in tuning.timeline.
export function chapterTarget(tuning, chapter, position = 0.5) {
  const rows = tuning.timeline.chapterTargets;
  const row = rows.find((entry) => entry.chapter === chapter) ?? rows.at(-1);
  const factor = 0.8 + 0.4 * Math.min(1, Math.max(0, position));
  return { enemies: Math.round(row.enemies * factor), groups: Math.round(row.groups * factor), lastSpawnS: Math.round(row.lastSpawnS * factor) };
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `node scripts/test-td-timeline-targets.mjs`
Expected: `Timeline target checks passed.`

- [ ] **Step 6: Write the converter**

The converter reads the current authored waves, keeps their order and composition, scales the counts so the stage total lands on the chapter target, and lays the groups on a WoR-like cadence: each former wave becomes a cluster of groups, clusters are spread evenly over the target spawn window, and the boss closes the stage.

```js
// scripts/td-stage-convert.mjs
// One-off migration: stage.waves -> stage.timeline following the WoR chapter table (docs/superpowers/specs/2026-10-05-timeline-stages-design.md).
// Usage: node scripts/td-stage-convert.mjs [--write]   (default: print a report only)
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { chapterTarget } from "../src/game/td/timeline-targets.js";
import { timelineTotals, validateTimeline } from "../src/game/td/timeline.js";

const SHAPE_COUNT = (kind) => (["grunt", "runner", "flyer"].includes(kind) ? 0.4 : 0.2); // the old board.waveShape counts

// Scale the authored groups so the shaped total hits the target, keep each kind's share, min 1 per surviving group.
export function convertStage({ stage, chapter, index, count, gates = 1 }) {
  const target = chapterTarget(tuning, chapter, count > 1 ? index / (count - 1) : 0);
  const groups = stage.waves.flatMap((wave, w) => wave.spawns.map((spawn) => ({ ...spawn, w })));
  const shaped = (spawn) => (spawn.kind === "boss" ? 1 : Math.max(1, Math.round(spawn.count * SHAPE_COUNT(spawn.kind))));
  const oldTotal = groups.reduce((sum, spawn) => sum + shaped(spawn), 0);
  const nonBoss = groups.filter((spawn) => spawn.kind !== "boss");
  const bossCount = groups.length - nonBoss.length;
  const budget = Math.max(nonBoss.length, target.enemies - bossCount);
  const scale = budget / Math.max(1, oldTotal - bossCount);
  // Cluster per former wave: groups of 1 to 3 enemies, repeated, spread over the target window.
  const clusters = stage.waves.map((wave) => wave.spawns.filter((spawn) => spawn.kind !== "boss"));
  const window = target.lastSpawnS * 1000;
  const lead = 3000;
  const timeline = [];
  clusters.forEach((cluster, c) => {
    const clusterStart = lead + Math.round(((window - lead) * c) / Math.max(1, clusters.length));
    cluster.forEach((spawn, s) => {
      const total = Math.max(1, Math.round(shaped(spawn) * scale));
      const perRepeat = Math.min(total, spawn.kind === "brute" || spawn.kind === "broodcaller" ? 1 : Math.max(1, Math.ceil(total / 3)));
      const repeat = Math.ceil(total / perRepeat);
      timeline.push({ startMs: clusterStart + s * 2500, kind: spawn.kind, count: perRepeat, ...(repeat > 1 && { repeat, everyMs: Math.max(2500, Math.round(window / Math.max(1, clusters.length) / repeat)) }) });
    });
  });
  for (const spawn of groups.filter((entry) => entry.kind === "boss")) timeline.push({ startMs: window, kind: "boss", count: 1 });
  timeline.sort((a, b) => a.startMs - b.startMs);
  const newTotal = timelineTotals(timeline).total;
  // Fewer, tougher enemies are harder at equal total health (bot measurement, Oct 5): keep 0.8 of the lost health.
  const hpScale = Math.round((stage.hpScale ?? 1) * Math.min(2.5, Math.max(1, (oldTotal / newTotal) * 0.8)) * 100) / 100;
  return { timeline, hpScale, report: { old: oldTotal, now: newTotal, target: target.enemies, errors: validateTimeline(timeline), gates } };
}

function main() {
  const path = new URL("../src/data/tdCampaign.json", import.meta.url);
  const campaign = JSON.parse(readFileSync(path, "utf8"));
  const rows = [];
  for (const chapter of campaign.chapters) {
    chapter.stages.forEach((stage, index) => {
      if (!stage.waves) return;
      const result = convertStage({ stage, chapter: chapter.id, index, count: chapter.stages.length });
      rows.push(`${stage.id}: ${result.report.old} -> ${result.report.now} enemies (target ${result.report.target}), hpScale ${stage.hpScale} -> ${result.hpScale}${result.report.errors.length ? ` ERRORS ${result.report.errors}` : ""}`);
      stage.timeline = result.timeline;
      stage.hpScale = result.hpScale;
      delete stage.waves;
    });
  }
  console.log(rows.join("\n"));
  if (process.argv.includes("--write")) writeFileSync(path, `${JSON.stringify(campaign, null, 2)}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
```

- [ ] **Step 7: Run it as a report and read it**

Run: `node scripts/td-stage-convert.mjs | head -30`
Expected: one line per stage, `new` close to `target`, no `ERRORS`. If a stage is far from its target, adjust only the converter heuristics (cluster size, `everyMs`), never hand-edit a single stage here.

- [ ] **Step 8: Normalise JSON formatting before writing**

`tdCampaign.json` does not round-trip through `JSON.stringify` unchanged. First commit a formatting-only pass so the data diff stays readable:

Run: `node -e "const fs=require('fs');const p='src/data/tdCampaign.json';fs.writeFileSync(p,JSON.stringify(JSON.parse(fs.readFileSync(p,'utf8')),null,2)+'\n')" && git diff --stat src/data/tdCampaign.json`
Then: `git add src/data/tdCampaign.json && git commit -m "chore(td): normalise tdCampaign.json formatting"`

- [ ] **Step 9: Write the data and add the non-campaign maps**

Run: `node scripts/td-stage-convert.mjs --write`

Then give each map that no stage uses a `timeline` (copy the timeline of the stage whose map has the closest `enemyHp`), and for Free Play give every campaign map access to its stage's timeline through `stageForMap` (Task 4). Check: `node -e "const c=require('./src/data/tdCampaign.json');const m=require('./src/data/tdMaps.json');const used=new Set(c.chapters.flatMap(x=>x.stages.map(s=>s.mapId)));console.log(m.filter(x=>!used.has(x.id)).map(x=>x.id))"` lists the maps that need an explicit `timeline` in `tdMaps.json`.

- [ ] **Step 10: Verify and commit**

Run: `node scripts/test-td-timeline-targets.mjs && node scripts/test-td-timeline.mjs`
Expected: both pass. (`test-td-campaign` is expected to fail until Task 3 and Task 5 land; do not run the full suite here.)

```bash
git add scripts/td-stage-convert.mjs scripts/test-td-timeline-targets.mjs src/game/td/timeline-targets.js src/data/gameBalance.tuning.json src/data/tdCampaign.json src/data/tdMaps.json package.json
git commit -m "feat(td): convert campaign stages to WoR-style timelines"
```

---

### Task 3: Simulation core

**Files:**
- Modify: `src/game/td/sim.js`
- Create: `scripts/test-td-timeline-sim.mjs`
- Modify: `scripts/lib/td-runner.mjs`

**Interfaces:**
- Consumes: `expandTimeline`, `timelineTotals` (Task 1); `tuning.timeline` (Task 2).
- Produces (public sim API used by every later task):
  - constructor option `timeline` (array, required for a run) replaces `waves`, `mode` and `tier` stays.
  - `game.start() -> boolean`: starts the clock and fills the queue; false when running, complete or no timeline.
  - `game.started` (boolean), `game.running` (true from `start()` until the end), `game.complete`, `game.won`.
  - `game.stageForecast(maxGroups = 3) -> { total, counts, down, ahead: Array<{ kind, count, eta }> }` with a live `eta` (seconds until the group's next spawn, from `spawnClock`).
  - `game.stageStats` (`{ kills, leaks, heroDeaths, placementEarned, leakKinds }`, one object for the whole stage, replaces `waveStats`).
  - `game.enemiesDown` (killed or leaked authored enemies, summons excluded).
  - `game.milestones` and `game.offerAt(fraction)` hooks: blessing offers at `tuning.run.offerCount` evenly spaced fractions, via the existing `offerVirtues()`.
  - removed: `wave`, `waves`, `totalWaves`, `startWave`, `wavePreview`, `waveTotalHp`, `waveStats`, `rollQuest` and the quest state, `offerMutators`, `mutatorWaves`, `waveHeroes`, `endlessRamp`, `buildWave`/`MODE_WAVES` imports.

- [ ] **Step 1: Write the failing sim test**

```js
// scripts/test-td-timeline-sim.mjs
import assert from "node:assert/strict";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { TowerDefenseGame } from "../src/game/td/sim.js";
import { maps } from "./lib/td-runner.mjs";

const map = maps.find((m) => (m.lanes?.length ?? 1) === 2) ?? maps[0];
const timeline = [
  { startMs: 1000, kind: "grunt", count: 2 },
  { startMs: 4000, kind: "flyer", count: 1 },
  { startMs: 6000, kind: "boss", count: 1 },
];
const make = (extra = {}) => new TowerDefenseGame({ heroes, tuning, map, timeline, seed: 7, hpScale: 0.01, ...extra });

// start() once, no waves left on the object.
{
  const g = make();
  assert.equal(g.started, false);
  assert.equal(g.start(), true);
  assert.equal(g.started && g.running, true);
  assert.equal(g.start(), false, "a running stage cannot be started again");
  for (const key of ["wave", "waves", "totalWaves", "startWave", "wavePreview", "waveStats"]) assert.equal(key in g, false, `${key} is gone`);
}

// Forecast: total, live ETA, counter.
{
  const g = make();
  const before = g.stageForecast();
  assert.equal(before.total, 4);
  assert.equal(before.down, 0);
  assert.equal(g.start(), true);
  assert.equal(g.stageForecast().ahead[0].eta, 1, "first group in 1 s");
  g.step(1.5);
  assert.ok(g.stageForecast().ahead[0].eta <= 3, "ETA ticks down with the simulation clock");
}

// A deterministic run: same spawn times and ids at 1x and at 4x speed.
{
  const spawnLog = (stepsPerFrame) => {
    const g = make();
    g.start();
    const log = [];
    const seen = new Set();
    for (let i = 0; i < 60 * 60 && !g.complete; i += stepsPerFrame) {
      g.advance(stepsPerFrame / 60);
      for (const e of g.enemies) if (!seen.has(e.entityId)) { seen.add(e.entityId); log.push([e.kind, Math.round(g.time * 10) / 10]); }
    }
    return log;
  };
  assert.deepEqual(spawnLog(1), spawnLog(4), "speed does not change the spawn schedule");
}

// Win waits for the last enemy; summons and splits never count toward the total.
{
  const g = make({ hpScale: 0.001 });
  g.start();
  for (let i = 0; i < 60 * 120 && !g.complete; i += 1) g.step(1 / 60);
  assert.equal(g.complete, true, "the stage ends");
  assert.ok(g.enemiesDown <= g.stageForecast().total, "defeated never exceeds the authored total");
}

// Boss spawns after bossWaitMs even when another enemy never dies.
{
  const t = structuredClone(tuning);
  t.timeline.bossWaitMs = 5000;
  const g = new TowerDefenseGame({ heroes, tuning: t, map, timeline: [{ startMs: 0, kind: "brute", count: 1 }, { startMs: 1000, kind: "boss", count: 1 }], seed: 3, hpScale: 1e6 });
  g.start();
  for (let i = 0; i < 60 * 30 && !g.enemies.some((e) => e.kind === "boss"); i += 1) g.step(1 / 60);
  assert.ok(g.enemies.some((e) => e.kind === "boss"), "boss spawned although a brute is still alive");
}

console.log("Timeline sim checks passed.");
```

- [ ] **Step 2: Run it to see it fail**

Run: `node scripts/test-td-timeline-sim.mjs`
Expected: FAIL (`g.start is not a function`).

- [ ] **Step 3: Replace the wave loop in `sim.js`**

Make these edits (search for the quoted names; line numbers move):

1. Imports: replace `import { buildWave, MODE_WAVES, isRunMode, wavesForMode } from "./waves.js";` with `import { expandTimeline, timelineTotals } from "./timeline.js";`.
2. Constructor: take `timeline` instead of `waves`; drop `this.waves`, `this.baseWaves`, `this.totalWaves`, `this.wave`; set `this.timeline = timeline ?? []`, `this.started = false`; keep `mode` only if other modules still read it (Task 4 removes it).
3. Replace `startWave()` with:

```js
  // Starts the stage clock: the whole timeline becomes one spawn queue (no waves, no pauses).
  start() {
    if (this.running || this.complete || !this.timeline.length) return false;
    const spacingMs = this.tuning.timeline?.spacingMs ?? 700;
    this.spawnQueue = expandTimeline(this.timeline, { gates: this.lanes.length, spacingMs })
      .map((entry) => ({ ...entry, sway: 0, scale: 1 }));
    const laneSpawned = this.lanes.map(() => 0);
    for (const entry of this.spawnQueue) entry.sway = this.formationSway(laneSpawned[entry.lane]++);
    // The boss closes the stage: it waits for the field to clear, at most tuning.timeline.bossWaitMs.
    this.spawnQueue = [...this.spawnQueue.filter((e) => e.kind !== "boss"), ...this.spawnQueue.filter((e) => e.kind === "boss")];
    this.stageStats = { kills: 0, leaks: 0, placementEarned: 0, heroDeaths: 0, leakKinds: {} };
    this.milestones = this.milestoneFractions();
    this.spawnClock = 0;
    this.started = true;
    this.running = true;
    this.paused = false;
    this.onChange("start", this);
    return true;
  }
```

4. In `step()` replace the spawn loop condition so a boss waits for an empty field **or** for `bossWaitMs` after its scheduled time:

```js
    this.spawnClock += dt;
    while (this.spawnQueue.length) {
      const next = this.spawnQueue[0];
      const bossHeld = next.kind === "boss" && this.fieldHasMinions() && this.spawnClock < next.at + (this.tuning.timeline?.bossWaitMs ?? 30000) / 1000;
      if (next.at > this.spawnClock || bossHeld) break;
      this.spawnQueue.shift();
      this.spawnEnemy(next.kind, { statScale: next.scale ?? 1, lane: next.lane ?? 0, sway: next.sway ?? 0 });
    }
```

5. Replace the end-of-wave block (`if (this.running && !this.spawnQueue.length && !this.enemies.length) { ... }`) with:

```js
    if (this.running && !this.spawnQueue.length && !this.enemies.length) {
      this.running = false;
      for (const hero of this.heroes) (this.insightLog[hero.class] ||= { stages: 0, kills: 0 }).stages = 1; // one Insight point per class that stood on the field
      this.finish(true);
    }
    this.checkMilestones();
```

6. Add the milestone helpers next to `offerVirtues`:

```js
  milestoneFractions() {
    const n = this.tuning.run.offerCount ?? 5;
    return Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
  }

  // Run blessings are offered as the stage's defeat counter crosses each milestone.
  checkMilestones() {
    if (!this.milestones?.length || this.virtueOffer) return;
    const { total } = timelineTotals(this.timeline);
    if (this.enemiesDown / total >= this.milestones[0]) { this.milestones.shift(); this.offerVirtues(); this.onChange("offer", this); }
  }
```

7. Replace `stageForecast` (added October 5) with the timeline version:

```js
  stageForecast(maxGroups = 3) {
    if (!this.timeline.length) return null;
    const { total, counts } = timelineTotals(this.timeline);
    const ahead = [];
    for (const entry of this.started ? this.spawnQueue : expandTimeline(this.timeline, { gates: this.lanes.length, spacingMs: this.tuning.timeline?.spacingMs ?? 700 })) {
      const last = ahead.at(-1);
      const eta = Math.max(0, Math.round(entry.at - (this.started ? this.spawnClock : 0)));
      if (last && last.kind === entry.kind && eta - last.eta <= 3) last.count += 1;
      else ahead.push({ kind: entry.kind, count: 1, eta });
    }
    return { total, counts, down: Math.min(total, this.enemiesDown), ahead: ahead.slice(0, maxGroups) };
  }
```

8. Delete `wavePreview`, `waveTotalHp`, `endlessRamp`, `rollQuest`, `completeQuest`, `failQuest`, `checkQuestClock`, `offerMutators` and its helpers, `waveShape` count/gap use in `shapedGroup` (keep `waveShape(kind)` for the `hp`/`attack`/`leak`/`power` multipliers with `count` and `gap` fixed at 1; remove `shapedGroup`), `waveStats` references (rename to `stageStats`), `this.wave` in `shieldWave` (Task 4 handles the shield), `waveHeroes`, `mutatorWaves`.
9. `finish()` must still set `won`/`complete`; do not touch it.
10. In `scripts/lib/td-runner.mjs`: `playRun` loops `while (!g.complete && g.wave < maxWave)` and calls `g.startWave()`; replace with `g.start()` once and `while (!g.complete && g.time < maxSeconds)` (default 1800), keeping the hero-deploy logic inside the loop. Replace `perfectWaves` with `perfect` (no leaks at the end).

- [ ] **Step 4: Run the new test**

Run: `node scripts/test-td-timeline-sim.mjs`
Expected: `Timeline sim checks passed.` Fix `sim.js` until it does; do not loosen the test.

- [ ] **Step 5: Run the old sim suite to find what the rewrite broke**

Run: `node scripts/test-td-sim.mjs 2>&1 | head -20`
Expected: many failures (`startWave`, `waves`). Do not fix them here; Task 10 migrates the tests. Record the first failing assertion only to confirm the failure is a removed API, not a logic regression.

- [ ] **Step 6: Commit**

```bash
git add src/game/td/sim.js scripts/lib/td-runner.mjs scripts/test-td-timeline-sim.mjs
git commit -m "feat(td): run a stage as one timeline instead of waves"
```

---

### Task 4: Modes, tuning and shared rules

**Files:**
- Modify: `src/game/td/waves.js` (delete), `src/game/td/campaign.js`, `src/game/td/page/session.ts`, `src/game/td/page/home.ts`, `src/game/td/page/context.ts`, `src/components/td/TdLobby.astro`, `src/data/gameBalance.tuning.json`, `src/data/tdMaps.json`
- Delete: `src/data/tdWaves.json`, `src/game/td/waves.js`, `src/game/td/wave-variants.js`
- Create: `src/game/td/stage-for-map.js`
- Test: extend `scripts/test-td-timeline-sim.mjs`

**Interfaces:**
- Consumes: Task 3's sim API.
- Produces:
  - `timelineForMap(map, campaign) -> timeline` in `stage-for-map.js`: a map's own `timeline` if present, else the timeline of the campaign stage whose `mapId` equals `map.id`; throws if neither exists.
  - `RunMode`/lobby mode picker removed; `state.selectedMode` removed from `context.ts`.
  - tuning: `board.waveShape.count` and `.gap` removed (hp/attack/leak/power kept); `difficulty.waveHpScale`, `waveGen.endlessRamp`, `waveGen.bossEvery`, `midBossScale`, `countGrowth`, `gapShrink`, `gapFloor` removed (keep `waveGen.minSpacing` renamed `timeline.minSpacingPx` and `laneSpread` renamed `timeline.laneSpread`); `interventions.shield.oncePerWave` replaced by `cooldownSeconds: 60`.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/test-td-timeline-sim.mjs` before the final `console.log`:

```js
// Free Play: a map plays its own timeline, or its campaign stage's.
{
  const { timelineForMap } = await import("../src/game/td/stage-for-map.js");
  const campaign = (await import("../src/data/tdCampaign.json", { with: { type: "json" } })).default;
  const stage = campaign.chapters[0].stages[0];
  const m = maps.find((x) => x.id === stage.mapId);
  assert.deepEqual(timelineForMap(m, campaign), stage.timeline);
  assert.throws(() => timelineForMap({ id: "no-such-map" }, campaign), /no timeline/);
}

// The shield is time-gated, not wave-gated.
{
  const g = make({ interventions: ["shield"] });
  g.start();
  g.step(1 / 60);
  g.interventions.shield.charge = g.interventionMax("shield");
  assert.ok(g.tuning.interventions.shield.cooldownSeconds > 0, "shield has a cooldown");
  assert.equal("oncePerWave" in g.tuning.interventions.shield, false);
}
```

- [ ] **Step 2: Run to see it fail**

Run: `node scripts/test-td-timeline-sim.mjs`
Expected: FAIL (`Cannot find module '../src/game/td/stage-for-map.js'`).

- [ ] **Step 3: Implement**

```js
// src/game/td/stage-for-map.js
// Free Play plays a map's own timeline, or the timeline of the campaign stage built on that map.
export function timelineForMap(map, campaign) {
  if (map?.timeline?.length) return map.timeline;
  const stage = campaign.chapters.flatMap((chapter) => chapter.stages).find((entry) => entry.mapId === map?.id);
  if (stage?.timeline?.length) return stage.timeline;
  throw new Error(`Map ${map?.id} has no timeline`);
}
```

Then:
1. `session.ts`: build the game with `timeline: campaignStage?.timeline ?? expedition?.timeline ?? daily?.timeline ?? timelineForMap(map, campaignData)` and no `mode`; remove the `?lean` experiment and its imports; remove the `mightEnemyScale` call only if the other agent already removed Might (otherwise keep it).
2. `home.ts`, `context.ts`, `TdLobby.astro`: remove the run-mode picker (10 waves / 20 waves / Endless) and `selectedMode`; the Free Play start button starts the map's timeline.
3. Interventions: in `sim.js` `interventionState` replace `usedThisWave` with `cooldownUntil` (`this.shieldUntilReady = this.time + cfg.cooldownSeconds` on cast; `ready` requires `this.time >= (this.shieldUntilReady ?? 0)`); update the tuning entry and the HUD text that says "once per wave".
4. Tuning cleanup as listed in Interfaces; run `grep -n 'waveGen\|waveShape\|waveHpScale\|endlessRamp' src -r` and remove or rename every hit.
5. Delete `waves.js`, `wave-variants.js`, `tdWaves.json`; remove the imports (`grep -rn 'waves.js\|tdWaves\|wave-variants' src scripts`).

- [ ] **Step 4: Run the new test and the type check**

Run: `node scripts/test-td-timeline-sim.mjs && npm run check 2>&1 | grep -E 'src/game/td' | head`
Expected: pass, and no type errors in `src/game/td`.

- [ ] **Step 5: Commit**

```bash
git add -A src/game/td src/data src/components/td/TdLobby.astro scripts/test-td-timeline-sim.mjs
git commit -m "feat(td): remove run modes and wave tuning, free play plays the map timeline"
```

---

### Task 5: Campaign, Expedition, Daily Trial, Challenges, rewards

**Files:**
- Modify: `src/game/td/campaign.js`, `src/game/td/expedition.js`, `src/game/td/daily.js`, `src/game/td/challenges.js`, `src/game/td/favor.js`, `src/game/td/quests.js`, `src/data/tdCampaign.json` (reward keys), `src/data/gameBalance.tuning.json`
- Test: `scripts/test-td-campaign.mjs`, `scripts/test-td-daily.mjs`, `scripts/test-td-expedition.mjs`, `scripts/test-td-challenges.mjs`, `scripts/test-td-favor.mjs`

**Interfaces:**
- Consumes: `game.enemiesDown`, `game.stageForecast().total`, `game.stageStats`.
- Produces:
  - `stageGameOptions(stage, squad, seed, heroes?) -> { timeline: stage.timeline, ... }` (no `waves`, no `mode`).
  - `clearedShare(game) -> number` in `campaign.js`: `enemiesDown / total`, 1 on a win.
  - Daily: `DAILY.goalDefeated` (default 20, tuned so the simple bot reaches it on about 40% of days like the old wave goal), `recordDaily` stores `bestDefeated`; `dailyGoalText(setup) = "Defeat ${setup.goal} enemies"`.
  - Favor: `computeFavor({ share, perfect, bossKilled, livesLeft })` pays `earn.perStage * share` instead of `perWave`; `shardEligible(share, tuning)` uses `shards.minDefeatedShare` (default 0.5).
  - Collection reward: `collectionReward(campaign, defeated)` pays `perDefeated * min(defeated, maxDefeated)`.
  - Expedition: each stage's timeline from `chapterTarget(tuning, 1 + stageIndex, 0.5)` using a seeded generator (`makeExpeditionTimeline(seed, stageIndex, tuning)` in `expedition.js`, same kinds as the base game, boss last on the final stage).

- [ ] **Step 1: Write the failing test for `stageGameOptions` and the reward re-key**

Add to `scripts/test-td-campaign.mjs`:

```js
{
  const stage = allStages(campaign)[0];
  const options = stageGameOptions(stage, campaign.starters.slice(0, 6), 1, null);
  assert.deepEqual(options.timeline, stage.timeline, "stage options carry the timeline");
  assert.equal("waves" in options, false);
  assert.equal(collectionReward(campaign, 0).length, 0);
  assert.ok(collectionReward(campaign, 12).length > 0, "rewards follow enemies defeated");
}
```

- [ ] **Step 2: Run to see it fail**

Run: `node scripts/test-td-campaign.mjs 2>&1 | head -5`
Expected: FAIL (`options.timeline` undefined or `waves` present).

- [ ] **Step 3: Implement per module**

- `campaign.js`: `stageGameOptions` returns `timeline: stage.timeline` (drop `waves`, `mode`); rename `collectionRewards.perWave/maxWaves` in `tdCampaign.json` to `perDefeated/maxDefeated` (divide the old numbers by 6 so a full 40-enemy stage pays like 6-7 old waves); `collectionReward(campaign, defeated)` reads the new keys; add `clearedShare`.
- `daily.js`: replace `goalWave` with `goalDefeated`; replace `clearedWaves` with `game.enemiesDown`; `recordDaily` and `sanitizeDaily` keep `bestWave` as an ignored legacy field and write `bestDefeated`; `dailySetup` builds the timeline from the map via `timelineForMap` plus the two preset mutators.
- `expedition.js`: `makeExpeditionTimeline`; the header comment "10-wave stages" becomes "timeline stages"; `stageGameOptions(state)` returns `timeline`.
- `challenges.js`: reword every condition in enemies defeated and battle time (`SWIFT_SECONDS`, `HOARDER_PLACEMENT` keyed by mode `classic`/`long` become single values; remove the `long` entries and the quest challenge fields).
- `favor.js`: `computeFavor` and `computeInsight` per the Interfaces (`insightLog[cls].stages`), `shardEligible`.
- `quests.js`: rename `QUEST_WAVE` to `QUEST_DEFEATED = 40` and the `free-wave10` id to `free-defeat40` (add a save migration alias in Task 6).
- Tuning: add `favorEarn.perStage`, `shards.minDefeatedShare`, `daily.goalDefeated`; remove `favorEarn.perWave`, `perPerfectWave`, `shards.minWave`.

- [ ] **Step 4: Run each module's test and fix**

Run: `for t in campaign daily expedition challenges favor; do node scripts/test-td-$t.mjs 2>&1 | tail -3; done`
Expected: each ends with its `... checks passed.` line. Tests that still mention waves are migrated in Task 10; here only fix tests for code this task changed, using the helper from Task 10 if it already exists.

- [ ] **Step 5: Commit**

```bash
git add -A src/game/td src/data scripts
git commit -m "feat(td): campaign, expedition, daily and rewards use enemies defeated"
```

---

### Task 6: Save data migration

**Files:**
- Modify: `src/game/td/page/save.ts`, `src/game/td/campaign.js` (`sanitizeCampaign`, save version)
- Test: `scripts/test-td-save.mjs`

**Interfaces:**
- Produces: save version bump (`CAMPAIGN_SAVE_VERSION + 1` and the main save version); `MapRun = { score, defeated, duration, lives, leaks, mutators? }`; `mapTop: Record<mapId, { score, defeated }>`; `bestDefeated` replaces `bestWave` (legacy `bestWave` read and dropped on load); keys `mapId@mode` are merged into `mapId` (keep the higher score).

- [ ] **Step 1: Write the failing test (Review Focus 1)**

```js
// in scripts/test-td-save.mjs
{
  const legacy = { version: 8, bestScore: 5000, bestWave: 12, mapTop: { "moonlit-pass": { score: 3000, wave: 8 }, "moonlit-pass@long": { score: 4200, wave: 15 }, "sunscar-ruins@endless": { score: 900, wave: 20 } },
    daily: [{ date: "2026-10-01", bestWave: 4, bestScore: 700, goalReached: false }], quests: { done: ["free-wave10"] } };
  const clean = sanitizeSave(legacy);
  assert.equal(clean.bestScore, 5000, "score record survives");
  assert.equal("bestWave" in clean, false, "legacy field dropped");
  assert.deepEqual(clean.mapTop["moonlit-pass"], { score: 4200, defeated: 0 }, "mode suffix merged, higher score kept");
  assert.equal(clean.mapTop["sunscar-ruins"].score, 900);
  assert.equal(clean.daily[0].bestDefeated, 0);
  assert.ok(clean.quests.done.includes("free-defeat40"), "renamed quest id migrated");
}
```

(`sanitizeSave` is the existing sanitiser export in `save.ts`; if the export has another name, use it.)

- [ ] **Step 2: Run to see it fail**

Run: `node scripts/test-td-save.mjs 2>&1 | head -5`
Expected: FAIL on the new assertions.

- [ ] **Step 3: Implement the migration and bump the version**

In `sanitize...` handle: `mapTop` key merge (strip `@...`, keep max score, `defeated: 0`), drop `bestWave`, add `bestDefeated: Number(candidate.bestDefeated) || 0`, daily record `bestWave` ignored and `bestDefeated` defaulted, quest id alias map `{ "free-wave10": "free-defeat40" }`. Update the `MapRun` type and every writer (`results.ts` in Task 7).

- [ ] **Step 4: Run and commit**

Run: `node scripts/test-td-save.mjs`
Expected: `... checks passed.`

```bash
git add src/game/td/page/save.ts src/game/td/campaign.js scripts/test-td-save.mjs
git commit -m "feat(td): migrate saves from waves to enemies defeated"
```

---

### Task 7: UI: stats, controls, chips, notices, results

**Files:**
- Modify: `src/components/td/TdPlayScreen.astro`, `src/components/td/TdOverlays.astro`, `src/components/td/TdPanels.astro`, `src/components/td/TdDebugPanel.astro`, `src/components/td/TdGlossaryContent.astro`, `src/game/td/page/hud.ts`, `src/game/td/page/results.ts`, `src/game/td/page/daily.ts`, `src/game/td/page/session.ts`, `src/game/td/page/debug.ts`, `src/game/td/page/boons.ts`, `src/game/td/page/challenges.ts`, `src/game/td/page/campaign.ts`, `src/game/td/ui.js`, `src/styles/td.css`
- Test: `scripts/test-td-ui.mjs`

**Interfaces:**
- Consumes: `game.start()`, `game.stageForecast()`, `game.stageStats`, `game.enemiesDown`.
- Produces: no new exports; behaviour:
  - Stats row: `Defeated x/total` replaces `Wave x/y` (remove `[data-td-wave]`, `[data-td-wave-total]`).
  - Main action: `Start` (idle) then hidden or disabled while the stage runs; remove the auto-next countdown, its storage key `td:autonext` and the Auto button's wave wording (the Auto button now means "auto-use Divine Interventions" only if that exists; otherwise remove the button and its CSS).
  - Preview strip: `Stage summary` chip before start; during the stage a live strip with the next two groups and a ticking ETA (`in 12s 2x Flyers`), redrawn once per second (`setInterval` cleared with the session).
  - Notices: first spawn of flyers or archers in the run, and the boss spawn ("<boss> has entered <map>").
  - Results: "Enemies defeated x/total", battle time, leaks; `lossReport(stageStats)` reports the kind that cost the most lives over the stage (rename `wave` field to `share`/`kinds` only, remove the "Wave N:" wording).
  - Daily screens: "Defeat N enemies" and "x enemies defeated" texts.

- [ ] **Step 1: Write the failing UI test**

```js
// in scripts/test-td-ui.mjs
{
  const { lossReport } = await import("../src/game/td/ui.js");
  const report = lossReport({ leakKinds: { runner: 3, grunt: 1 } });
  assert.equal(report.kind, "runner");
  assert.equal("wave" in report, false, "no wave number in the loss report");
}
```

- [ ] **Step 2: Run to see it fail**

Run: `node scripts/test-td-ui.mjs 2>&1 | tail -3`
Expected: FAIL (`wave` is present).

- [ ] **Step 3: Implement**

Work through the files by grep, one file at a time, replacing wave wording and logic as listed in Interfaces:

Run: `grep -nEi 'wave' src/components/td/*.astro src/game/td/page/*.ts src/game/td/ui.js | cut -c1-140`

For each hit decide: remove (countdown, quest chip, next-wave chips, wave notices), re-key (counter, results, daily), or reword (help text, glossary). The quest chip function `questChip` and `QUEST_NAMES` are deleted. Keep the landscape HUD CSS rules but delete selectors for removed elements (`.td-wave-chip--pending`, `.td-quest-chip`, the auto-next UI) after `grep -n 'td-quest-chip\|td-wave' src/styles/td.css`.

Live ETA strip (in `hud.ts`):

```ts
  let stripTimer = 0;
  function startStrip() {
    window.clearInterval(stripTimer);
    stripTimer = window.setInterval(() => renderPreview(), 1000);
  }
  function renderPreview() {
    const game = state.session?.game;
    const forecast = game?.stageForecast?.(3);
    if (!forecast) { previewEl.hidden = true; return; }
    const summary = !game.started
      ? `<span class="td-wave-chip td-wave-chip--summary" title="${Object.entries(forecast.counts).map(([k, n]) => `${n} ${KIND_NAMES[k] ?? k}`).join(", ")}"><b>${forecast.total}</b> enemies</span>`
      : "";
    const ahead = forecast.ahead.slice(0, 2).map((g: any) => `<span class="td-wave-chip td-wave-chip--incoming">${g.eta > 0 ? `in ${g.eta}s ` : ""}${g.count}x <b>${g.kind === "boss" ? bossName() : KIND_NAMES[g.kind] ?? g.kind}</b></span>`).join("");
    previewEl.hidden = false;
    previewEl.innerHTML = summary + ahead;
  }
```

(`startStrip()` runs when the stage starts; `clearInterval` on session end in `session.ts` cleanup.)

- [ ] **Step 4: Run tests and the type check**

Run: `node scripts/test-td-ui.mjs && npm run check 2>&1 | grep -E 'src/game/td|src/components/td' | head`
Expected: pass and no type errors.

- [ ] **Step 5: Commit**

```bash
git add -A src/components/td src/game/td src/styles/td.css scripts/test-td-ui.mjs
git commit -m "feat(td): show enemies defeated instead of waves in the UI"
```

---

### Task 8: Renderer and map scene

**Files:**
- Modify: `src/game/td/render.js`, `src/game/td/map-scene.js`, `src/game/td/environments.js`, `src/data/tdEnvironments.json`

**Interfaces:**
- Consumes: `game.started`, `game.running`, `game.time`.
- Produces: no new API.

- [ ] **Step 1: Find the wave uses**

Run: `grep -nEi 'wave' src/game/td/render.js src/game/td/map-scene.js src/game/td/environments.js src/data/tdEnvironments.json | cut -c1-150`
Expected: a short list (the spawn label hides "during an active wave", `wave`-dependent environment multipliers such as `enemySpeed` by wave).

- [ ] **Step 2: Re-key each hit**

- `spawnLabelVisible(game)` (`map-scene.js`): hide the label while `game.running`, show before start (the test in `scripts/test-td-ui.mjs` that asserts "spawn label hidden during a wave" is reworded to `started`).
- Environment rules that scale by wave number (`environment("enemySpeed", ...)` with `wave`): change the rule data to scale by **elapsed share** (`game.time / lastSpawnTime`, clamped 0..1) via a helper `game.stageProgress()` in `sim.js` (`min(1, time / timelineTotals(timeline).lastAt)`).

- [ ] **Step 3: Test**

Run: `node scripts/test-td-environments.mjs && node scripts/test-td-ui.mjs`
Expected: pass (after updating the wave-number cases in `test-td-environments.mjs` to elapsed-share cases).

- [ ] **Step 4: Commit**

```bash
git add -A src/game/td src/data/tdEnvironments.json scripts
git commit -m "feat(td): environments and spawn labels follow stage progress, not waves"
```

---

### Task 9: Tools: lint, load audit, balance scripts

**Files:**
- Modify: `src/game/td/stage-lint.js`, `scripts/td-stage-lint.mjs`, `src/game/td/campaign-load.js`, `scripts/td-campaign-load.mjs`, `scripts/test-td-campaign-load.mjs`, `scripts/td-wor-compare.mjs`, `scripts/td-balance-sweep.mjs`, `scripts/td-economy.mjs`, `scripts/td-progression.mjs`, `scripts/td-layout-compare.mjs`, `scripts/lib/td-class-matrix.mjs`, `scripts/test-td-balance.mjs`
- Delete: `scripts/td-wave-shape.mjs`, `scripts/td-wave-variants.mjs`, `scripts/td-chapter-length.mjs`
- Modify: `package.json` (remove `td:wave-variants`, `td:wave-shape`, `td:chapter-length`)

**Interfaces:**
- Consumes: `expandTimeline`, `timelineTotals`, `chapterTarget`.
- Produces: `lintStage` reports `{ stageId, total, groups, lastSpawnS, pressure, flags }` with the rules: total within 0.75x..1.25x of `chapterTarget`, spawn window within 0.75x..1.25x, groups at least 60% of target, at most 3 kinds in any 20 s window, flyers at most 6 in any 20 s window, no more than 2 enemies per gate in the first 10 s of the stage.

- [ ] **Step 1: Write the failing lint test**

```js
// scripts/test-td-stage-lint.mjs
import assert from "node:assert/strict";
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { lintTimeline } from "../src/game/td/stage-lint.js";

const ok = lintTimeline({ timeline: [{ startMs: 3000, kind: "grunt", count: 2, repeat: 5, everyMs: 6000 }], chapter: 1, position: 0.5, gates: 1, tuning });
assert.deepEqual(ok.flags, [], "a WoR-shaped stage is clean");
const flood = lintTimeline({ timeline: [{ startMs: 0, kind: "flyer", count: 12 }], chapter: 1, position: 0.5, gates: 2, tuning });
assert.ok(flood.flags.some((f) => f.includes("flyers")), "twelve flyers at once is flagged");
assert.ok(flood.flags.some((f) => f.includes("first 10 s")), "per-gate opening rule is flagged");
console.log("Stage lint checks passed.");
```

- [ ] **Step 2: Run to see it fail, implement `lintTimeline`, run to see it pass**

Run: `node scripts/test-td-stage-lint.mjs`
Expected: first FAIL (`lintTimeline` missing), after implementing the rules above in `stage-lint.js` (reuse `expandTimeline` for the 20 s windows): `Stage lint checks passed.`

- [ ] **Step 3: Re-key the other scripts**

For each script grep `wave` and: `campaign-load.js` builds one queue with `expandTimeline` instead of one game per wave (`enemiesPerSecond = total / lastSpawnS`, drop `spawnGroups` per wave); `td-wor-compare.mjs` compares group count, last spawn time and enemies/s per decile directly against the WoR CSV (no more spawn-window approximation); `td-balance-sweep.mjs`, `td-economy.mjs`, `td-progression.mjs`, `td-class-matrix.mjs` use `playRun` from the new runner and report per stage, not per wave; delete the three obsolete scripts and their `package.json` entries.

- [ ] **Step 4: Run**

Run: `npm run td:stage-lint | tail -3 && npm run td:campaign-load | head -8 && npm run td:wor-compare | head -20`
Expected: each prints a table; the stage lint shows the converted campaign (flags allowed at this point, listed for Task 11).

- [ ] **Step 5: Commit**

```bash
git add -A scripts package.json src/game/td
git commit -m "feat(td): lint, load audit and sweeps work on timelines"
```

---

### Task 10: Migrate the test suite

**Files:**
- Modify: every `scripts/test-td-*.mjs` that still mentions `waves`, `startWave`, `mode`; `scripts/test-td-sim.mjs` is the bulk (about 290 wave references).
- Create: `scripts/lib/td-legacy-timeline.mjs`

**Interfaces:**
- Produces: `legacyTimeline(waves, { gapS = 12 } = {}) -> timeline` that turns an old `[{ wave, spawns: [{ kind, count, gapMs }] }]` list into a single timeline (each old wave starts `gapS` seconds after the previous wave's last spawn, each old group becomes a `{ startMs, kind, count: 1, repeat: count, everyMs: gapMs }`), so a test that only needs "some enemies" keeps its fixtures.

- [ ] **Step 1: Write the helper and its test**

```js
// scripts/lib/td-legacy-timeline.mjs
// Test helper: old wave fixtures -> one timeline. Not used by game code.
export function legacyTimeline(waves, { gapS = 12 } = {}) {
  const timeline = [];
  let cursor = 0;
  for (const wave of waves) {
    let waveEnd = cursor;
    for (const group of wave.spawns) {
      const everyMs = Math.max(1, group.gapMs ?? 700);
      timeline.push({ startMs: cursor, kind: group.kind, count: 1, ...(group.count > 1 && { repeat: group.count, everyMs }) });
      waveEnd = Math.max(waveEnd, cursor + (group.count - 1) * everyMs);
    }
    cursor = waveEnd + gapS * 1000;
  }
  return timeline;
}
```

- [ ] **Step 2: Migrate file by file, in this order**

`test-td-timeline*.mjs` (done) → `test-td-ui.mjs` → `test-td-save.mjs` → `test-td-favor.mjs` → `test-td-difficulty.mjs` → `test-td-environments.mjs` → `test-td-challenges.mjs` → `test-td-daily.mjs` → `test-td-expedition.mjs` → `test-td-campaign.mjs` → `test-td-campaign-load.mjs` → `test-td-board-classes.mjs` → `test-td-balance.mjs` → `test-td-sim.mjs`. For each: replace `waves` fixtures by `legacyTimeline(waves)` (or a literal timeline), `g.startWave()` by `g.start()`, loops over `g.wave` by `g.time` or `g.enemiesDown`, and **delete** assertions about removed features (wave clear bonus, quests, mutator offers, endless ramp, run modes). Every deleted assertion is listed in the commit message so the owner can see what coverage was dropped on purpose.

- [ ] **Step 3: Run each file after migrating it**

Run: `node scripts/test-td-<name>.mjs 2>&1 | tail -3`
Expected: the file's `... checks passed.` line.

- [ ] **Step 4: Run the whole suite**

Run: `npm run test:tower-defense`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A scripts
git commit -m "test(td): migrate the suite from waves to timelines"
```

---

### Task 11: Rebalance pass and owner playtest list

**Files:**
- Modify: `src/data/tdCampaign.json` (`hpScale` per stage), `TOWER_DEFENSE_ROADMAP.md`
- Test: `npm run td:stage-lint`, `npm run td:campaign-load`, `node scripts/td-board-tune.mjs --chapters=1`

**Interfaces:**
- Consumes: Task 2's converted data, Task 9's lint.

- [ ] **Step 1: Run the lint and fix by editing the converter, not the stages**

Run: `npm run td:stage-lint | grep -v '| ok |' | head -40`
Expected: a short list. For systematic flags change `convertStage` heuristics in `scripts/td-stage-convert.mjs`, restore `tdCampaign.json` from the pre-conversion commit (`git show <hash>:src/data/tdCampaign.json`), and rerun the converter. Hand edits are allowed only for individual stages the owner names.

- [ ] **Step 2: Bot check of the old walls**

Run: `node scripts/td-board-tune.mjs --chapters=1 --sample=14 --steps=6 2>&1 | tail -12`
Expected: for 1-4, 1-7, 1-9 and 1-10 the bot's `hpScale` for a 50% win rate is not lower than before the conversion (the earlier pilot had 0.65, 0.89, 0.67, 0.42). Keep the authored `hpScale` the converter chose unless the bot disagrees by more than 2x; the owner's playtest decides the rest.

- [ ] **Step 3: Write the playtest checklist into the roadmap**

Add to `TOWER_DEFENSE_ROADMAP.md` under the Encounter Pacing section: play 1-1 to 1-10 and one stage each of chapters 2 to 4; for 1-10 with a mixed squad (2 platform, 4 ground) and with 1 platform, 1 healer and 4 ground; note whether the Defeated counter and the timeline strip are enough to plan placement, and whether any stage spawns too fast or too slowly.

- [ ] **Step 4: Commit**

```bash
git add -A src/data scripts TOWER_DEFENSE_ROADMAP.md
git commit -m "feat(td): balance the converted timelines and add the playtest checklist"
```

---

### Task 12: Remove the leftovers and update the docs

**Files:**
- Modify: `TOWER_DEFENSE_SPEC.md`, `TOWER_DEFENSE_ROADMAP.md`, `TOWER_DEFENSE_MECHANICS_OVERVIEW.md`, `TOWER_DEFENSE_GAMEPLAY_IDEAS.md`, `src/pages/games/tower-defense/overview.astro`, `docs/tower-defense-ui-plan.md`, `docs/tower-defense-board-plan.md`, `src/game/td/sprite-spec-for-ai.md`
- Move: wave-era sections to `TOWER_DEFENSE_ARCHIVE.md` ("Wave system, removed October 2026")

**Interfaces:** none.

- [ ] **Step 1: List what is left**

Run: `grep -rniE '\bwaves?\b' src scripts --include='*.js' --include='*.ts' --include='*.astro' --include='*.mjs' --include='*.json' --include='*.css' | grep -viE 'shockwave|wavefront' | cut -c1-140`
Expected: only intentional leftovers remain (see Step 3). Everything else is removed or reworded in this step.

- [ ] **Step 2: Rewrite the docs**

`TOWER_DEFENSE_SPEC.md`: replace the wave sections (modes, wave shape, quests, mutator offers, wave interest, clear bonus) by "Stage timeline" (data model of the design spec section 2, boss rule, milestones for blessing offers, forecast and counter). `TOWER_DEFENSE_MECHANICS_OVERVIEW.md`: section 3 and 5 re-keyed (no run modes, tiers stay), section 7 lever table (`timeline.chapterTargets`, `timeline.spacingMs`). Roadmap: the Encounter Pacing section gets a "Superseded by Timeline Stages" note; open items reference the playtest list. Move the old wave text to the archive, not to the trash.

- [ ] **Step 3: Allowed leftovers**

Only these may still contain the word: the archive, the two spec documents (history), the migration code in `save.ts` (`bestWave` legacy read, `free-wave10` alias), and `quests.js` alias comments. The check is:

Run: `grep -rniE '\bwaves?\b' src scripts | grep -viE 'shockwave|archive|save\.ts|quests\.js' | wc -l`
Expected: `0`.

- [ ] **Step 4: Final verification**

Run: `npm run test:tower-defense && npm run check 2>&1 | tail -5`
Expected: PASS; no new type errors in `src/game/td`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs(td): timeline stages replace waves everywhere"
```

---

## Self-Review

**Spec coverage:** model (Task 1, 3), WoR numbers (Task 2), every row of the spec's section 4 table: run modes and `tdWaves.json` (Task 4), `waveShape` and `waveHpScale` (Task 3 step 8, Task 4), quests (Task 3 deletes, Task 7 UI, Task 5 `quests.js`), blessing offers (Task 3 milestones), mutators (Task 3, Task 5 Daily presets), shield (Task 4), Insight/Favor/shards/collection (Task 5), Daily and Expedition and Challenges (Task 5), notices and chips and stats (Task 7), saves (Task 6), environment rules (Task 8), tools (Task 9), tests (Task 10), balance (Task 11), docs and cleanup (Task 12). Gap check: the `Auto` button semantics are decided in Task 7 (remove unless it controls something else).

**Placeholder scan:** Tasks 5, 7, 8 and 9 give exact file lists, grep commands and code for the new interfaces, but the per-line wave-wording edits in UI files are by instruction ("work through the files by grep") because their count (about 120 lines) is too large to quote; each such step ends with a measurable check (the grep count in Task 12).

**Type consistency:** `expandTimeline`, `timelineTotals`, `validateTimeline` (Task 1) are used with the same signatures in Tasks 3, 9. `chapterTarget(tuning, chapter, position)` (Task 2) is called the same way in Tasks 5, 9. `stageForecast()` fields `total`, `counts`, `down`, `ahead[{kind,count,eta}]` match between Task 3 and Task 7. `stageStats` replaces `waveStats` in Tasks 3 and 7. `clearedShare` (Task 5) is used by Favor in the same task. `enemiesDown` in Tasks 3, 5, 7.

**Review Focus:** items 1 to 5 map to the tests in Tasks 6 (old saves), 3 (boss wait, determinism, last summon), and 1 (two gates, count 1).

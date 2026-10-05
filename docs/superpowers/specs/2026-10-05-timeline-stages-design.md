# Timeline Stages: no more waves

Status: design for owner review, October 5, 2026. Nothing in this document is implemented yet.
Priority list and decision history: [Tower Defense Roadmap](../../../TOWER_DEFENSE_ROADMAP.md).
Implementation plan: [Timeline Stages Implementation Plan](../plans/2026-10-05-timeline-stages-plan.md).
Supersedes phases 3 to 5 of [Campaign Encounter Pacing](2026-10-05-campaign-encounter-pacing-design.md): that plan's Option B
(a continuous timeline like Watcher of Realms, WoR) is now the chosen model. Phases 0 to 2 of that plan stay valid.

## 1. Owner request (October 5, 2026)

"Change it so that we have no waves any more. Per map we define a number of enemies, like Watcher of Realms, which then fill the
stage one after another. Follow roughly the timings and counts WoR uses. Remove waves. We no longer have an upgrade system for
heroes, so we no longer need waves. The number of enemies appears in the UI instead of the waves. Clean the waves out of the files."

## 2. The model

A stage (Campaign), a map's default encounter (Free Play) and an Expedition stage each carry one **timeline** instead of a `waves`
list. A timeline is a list of spawn groups; it mirrors WoR's `StageWave` rows (`StartTime`, `MonsterNum`, `WaveCount`, `RefreshTime`):

```json
"timeline": [
  { "startMs": 3000,  "kind": "grunt",  "count": 2, "repeat": 3, "everyMs": 4000 },
  { "startMs": 21000, "kind": "flyer",  "count": 2 },
  { "startMs": 40000, "kind": "boss",   "count": 1 }
]
```

- `count` enemies spawn at `startMs`, one every `spacingMs` (tuning `timeline.spacingMs`, default 700 ms), alternating between gates.
- `repeat` (default 1) repeats the group every `everyMs`; the stage total is the sum of `count x repeat` over all groups.
- The stage starts when the player presses **Start** and the clock runs on simulation time (pause, speed and replays stay exact).
- It ends in a win when every group has spawned and no enemy is left; in a loss when lives reach 0.
- A `boss` group spawns after its `startMs` once no other enemy is on the field, or after `timeline.bossWaitMs` (default 30 s), so a stuck
  enemy cannot block it for ever.
- There is no wave number, no pause between waves, no "Start wave" button and no auto-start countdown.

## 3. Numbers from WoR (shape, never raw copies)

WoR normal chapters, medians per chapter (from `wor_campaign_scaling.csv`, 152 stages): enemies per stage, spawn groups, and the time
of the last spawn.

| Chapter | Enemies | Groups | Last spawn |
|---:|---:|---:|---:|
| 1 | 11 | 9 | 53 s |
| 2 | 25 | 15 | 97 s |
| 3 | 27 | 15 | 138 s |
| 4 | 32 | 22 | 155 s |
| 5 | 32 | 21 | 150 s |
| 6 | 32 | 18 | 167 s |
| 7 | 37 | 18 | 178 s |
| 8 | 40 | 19 | 200 s |
| 9 | 22 | 16 | 220 s |
| 10 | 30 | 23 | 218 s |
| 11 | 38 | 29 | 234 s |

Our 13 chapters use these rows for chapters 1 to 11 and repeat row 11 (38 enemies, 29 groups, 234 s) for chapters 12 and 13. Inside a
chapter the target ramps from 0.8x (first stage) to 1.2x (last stage) of the row. Spawn pressure therefore falls into WoR's 0.1 to
0.26 enemies/s. These targets live in `tuning.timeline.chapterTargets` and drive the converter and the lint.

## 4. What happens to everything that hung on waves

Defaults below are the plan's decisions; the owner may overrule any of them in review.

| Wave-bound feature today | Decision |
|---|---|
| Run modes 10 waves / 20 waves / Endless (`waves.js`, lobby, map records) | Removed. Free Play plays the map's timeline once. Endless is dropped (it needs waves); a looping "Siege" mode can be designed later |
| `tdWaves.json` (Free Play waves for every map) | Deleted. Every map carries its own `timeline` in `tdMaps.json`; campaign stages keep theirs in `tdCampaign.json` |
| `board.waveShape` (count x0.4 / x0.2, gap x2.5) | The converter bakes the count shaping into the timeline; the runtime keeps only the per-kind `hp`, `attack`, `leak`, `power` multipliers (count 1, gap 1) |
| `difficulty.waveHpScale` (+15% enemy HP per wave) | Removed; a stage's `hpScale` is the only health lever |
| Wave-clear placement bonus (`favor.clearPlacement`), wave interest | Removed |
| In-run quests (one per wave) | Removed together with their HUD chip, `quests` bookkeeping in the sim and the challenge fields that read them |
| Run blessing offers (virtues and boons) after each wave | Offered at evenly spaced **defeat milestones**: `tuning.run.offerCount` (default 5) offers at k/(n+1) of the stage's enemies defeated |
| Mutator offers (Endless) | Removed; Daily Trial keeps its two preset mutators from the start |
| Shield of the Crossing "once per wave" | "Once per `shieldCooldownSeconds`" (default 60 s) |
| Insight (one per class per wave on the field) | One per class that stood on the field at stage end, plus the existing kill points |
| Favor earn `perWave`, `perPerfectWave`, shard `minWave` | Re-keyed to the share of the stage defeated (`perStage` x share) and `minDefeatedShare` |
| Collection reward `perWave` / `maxWaves` | Re-keyed to enemies defeated (`perDefeated`, `maxDefeated`) |
| Daily Trial goal "clear wave 5" and `bestWave` | Goal "defeat N enemies" (`goalDefeated`), record `bestDefeated` |
| Expedition "10-wave stages" | Stages carry timelines generated per stage from the same chapter table |
| Challenges worded in waves | Reworded in enemies defeated and battle time |
| R10 daily quest "free-wave10" | Becomes "Defeat 40 enemies in Free Play" (name and counter updated in `quests.js`) |
| Boss wave notice, "Wave N incoming", flyer and archer hints | A notice when a group of that kind spawns for the first time in the run and when the boss spawns |
| Next-wave preview chips, stage summary chip, incoming chips | Summary stays; the incoming chips become a live timeline strip with a ticking ETA |
| `Wave 2/7` stat | `Defeated x/total` replaces it (already built as the stage counter) |
| Saved records (`bestWave`, `mapTop[..].wave`, keys `mapId@mode`) | Migrated: `bestWave` kept as a legacy field and ignored, new `bestDefeated`; `mapTop` keys lose the `@mode` suffix |

## 5. Out of scope

Hero kits, class block limits, boss mechanics, the R18 presentation, the placement economy and the removal of the hero upgrade system
(a separate piece of work that must land first, see the plan's Task 0).

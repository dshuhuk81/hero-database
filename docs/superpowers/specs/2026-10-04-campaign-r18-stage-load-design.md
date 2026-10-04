# Campaign R18 Rollout and Stage-Load Audit Design

## Goal

Apply the approved R18 battlefield presentation to every current and future Campaign stage,
then add a Watcher-of-Realms-inspired Campaign load audit that separates enemy stats,
composition and spawn pressure without replacing the existing simulator or automatically
rewriting balance values.

## Source documents

- Current visual implementation and accepted phone behavior:
  [Tower Defense — Tilted Board and Landscape HUD](../../../TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md)
- Current priorities: [Tower Defense Roadmap](../../../TOWER_DEFENSE_ROADMAP.md)
- Current game rules: [Tower Defense Specification](../../../TOWER_DEFENSE_SPEC.md)
- External reference, named by the owner:
  [Watcher of Realms – Kampagnen-, Wave- und Scaling-Analyse](</Users/daschultheiss/Documents/Codex/2026-10-04/referenced-chatgpt-conversation-this-is-an/outputs/watcher_of_realms_campaign_analysis.md>)
- External source table:
  [Watcher of Realms Campaign Scaling CSV](</Users/daschultheiss/Documents/Codex/2026-10-04/referenced-chatgpt-conversation-this-is-an/outputs/wor_campaign_scaling.csv>)

The external files are research inputs, not runtime or build dependencies. The repository must
remain usable when those absolute local paths are unavailable.

## Scope and sequence

Implementation has two independently verifiable phases and follows this order:

1. Campaign-wide R18 presentation.
2. Campaign stage-load audit and recommendations.

No production build is part of either phase. Phones in portrait remain blocked by the existing
orientation modal and are asked to rotate to landscape.

## Phase 1: Campaign-wide R18 presentation

### Behavior

Every Campaign battle uses the shared R18 renderer and landscape HUD, including all 82 current
stages and any Campaign stages added later. This applies independently of board dimensions,
theme, gate count or whether the same map is also selectable in Free Play.

Free Play behavior remains explicit: maps already named in `tuning.board.tilt.maps` stay tilted;
other Free Play maps do not become tilted merely because Campaign has a global default.

### Configuration and data flow

Add `tuning.board.tilt.campaign: true`. The session controller already knows whether it is
starting a Campaign stage and passes that run context to `createRenderer`. A small exported
predicate decides whether tilt is active:

- explicit map membership enables R18 in every mode;
- `campaign: true` enables R18 for a Campaign run;
- `?tilt=off` remains the developer escape hatch;
- a numeric `?tilt=` value continues to override the vertical factor;
- `perMap` overrides continue to win for unusual geometry.

This avoids an 82-entry list, makes future Campaign stages inherit R18 automatically and does not
change `tdMaps.json`, generated geometry, simulation coordinates or `geometryHash`.

### Visual fallback

Jungle keeps its authored panorama. Themes without an authored wide panorama use their existing
terrain fallback. The rollout does not fabricate or substitute painted map assets. Theme panorama
production remains a separate art task.

### Verification

UI tests cover Campaign context on 8x4, 9x5 and 10x5 maps, one- and two-gate maps, explicit
Free Play enablement, an untilted Free Play control map, `perMap` overrides and `?tilt=off` at the
predicate level. Existing touch-coordinate, map-generator, skin and simulation checks remain green.

## Phase 2: WoR-inspired Campaign stage-load audit

### Principle

WoR demonstrates that difficulty is not one HP multiplier. Its useful transferable model has
three independent layers:

1. enemy attributes;
2. composition and count;
3. spawn timing and concentration.

The project keeps its current authored waves, enemy definitions, `hpScale`, player progression and
bot simulations. It does not add a WoR-style runtime `stageLevel`, copy raw WoR values or infer
Motto Immortal game facts from the external data.

### Shared analysis model

Add a pure stage-load analyzer used by both tests and a CLI report. It evaluates the same effective
normal-tier wave data as the simulator, including board wave shaping, multiple gates, group scale,
wave HP growth, stage `hpScale`, map environment modifiers and boss stat overrides.

Each stage row contains:

- stage, chapter, map, board size, gate count and theme;
- authored spawn groups and effective enemy count;
- number of enemy kinds;
- first spawn, last spawn and effective spawn window;
- effective enemies per second as a pressure indicator;
- total effective HP and ATK;
- weighted average armor and magic resistance;
- maximum single-enemy HP and ATK;
- HP load, ATK load and `sqrt(hpLoad * atkLoad)` composite load relative to stage 1-1;
- existing `hpScale`, lives and boss presence;
- bot win-rate fields when a pacing result is supplied, otherwise blank.

Summoned children are reported separately from authored wave load because their count depends on
combat state. Sentinel times are not part of this project’s data model. Empty or scripted groups
must produce an explicit diagnostic rather than silent zeroes.

### Outputs

Add `npm run td:campaign-load`. By default it prints a concise Markdown table and summary to
stdout. `--csv=<path>` writes the full deterministic CSV for comparison or spreadsheet work.
Generated reports are outputs, not source data, and are not required by the runtime.

The summary groups stages into four reading bands without imposing a new formula:

- introduction: Chapter 1;
- early progression: Chapters 2–4;
- mid progression: Chapters 5–8;
- endgame: Chapters 9–13.

Within each chapter it flags abrupt adjacent-stage changes in composite load, enemy count, spawn
pressure or resistance mix. These are review flags, not automatic failures: boss stages, swarm
stages and teaching stages may intentionally break the local curve.

### Recommendations, not automatic writes

The audit never edits `tdCampaign.json`. It reports which lever caused an outlier:

- `hpScale` for excessive or insufficient health load;
- enemy composition for armor/MRES or role pressure;
- counts for battlefield density;
- `gapMs` and group order for spawn concentration;
- lives only when leak tolerance, rather than combat load, is the intended change.

`td-board-tune.mjs` and `test-td-campaign.mjs` remain the authority for actual playability. A later
balance pass may apply reviewed recommendations, but only after comparing stage load, bot win rate,
expected clear time and the intended teaching or boss role.

### Verification

Unit tests compare analyzer results with a controlled simulator fixture, including wave shaping,
two gates, a boss override and a stage health scale. Campaign tests require one deterministic row
for every authored stage, finite non-negative metrics, correct 1-1 normalization and stable CSV
column order. The report must not mutate imported Campaign, map or tuning data.

## Non-goals

- No automatic balance rewrite.
- No new runtime `stageLevel` or enemy growth curves.
- No direct scaling from WoR numbers.
- No changes to hero progression, rewards, economy or summon rates.
- No portrait gameplay layout.
- No new panorama generation or painted map substitution.
- No generated board-geometry edits.

## Documentation ownership

After implementation:

- `TOWER_DEFENSE_SPEC.md` describes the Campaign-wide R18 rule and the available stage-load audit;
- `TOWER_DEFENSE_ROADMAP.md` marks the Campaign rollout complete and points balance work to the
  audit rather than duplicating its metrics;
- `TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md` records the Campaign-wide rollout and retains the visual
  decision history;
- the external WoR analysis remains linked by its full name from this design document.

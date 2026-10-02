# Tower Defense: adopting the compact board

**Status October 2, 2026: finished.** All six steps are done, plus lives per leak, three-gate
boards, signature patterns and pattern-shaped ultimates. Open work continues in
[TOWER_DEFENSE_ROADMAP.md](../TOWER_DEFENSE_ROADMAP.md) ("Open work after the board rewrite").

Written October 1, 2026, after the owner played the prototype board (`proto-board`) and
decided to keep the direction. Background, measurements and the prototype itself:
[TOWER_DEFENSE_GAMEPLAY_IDEAS.md](../TOWER_DEFENSE_GAMEPLAY_IDEAS.md) section F.

The goal is to make the compact board, tile attack patterns and fewer, stronger enemies the
way every battle plays, on every map, without breaking saves, campaign progress or the 13
chapters of content already authored.

## Owner requirements (October 1, 2026)

- **A. All maps move to the board.** Today there are 80 maps: 75 `lattice-v2`, 1
  `orthogonal-v1` and 4 hand-authored, in 14 themes, used by 82 campaign stages in 13 chapters
  and 10 Free Play battlefields.
- **B. No two maps share a layout.** Today three maps serve two stages each (`moonlit-pass`
  1-1 and 1-5, `verdant-crossing` 1-2 and 1-10, `sunscar-ruins` 1-7 and 1-9).
- **C. Range upgrades go.** Decide whether range can still grow at all, or only outside battle.
- **D. Hero and enemy sizes** need rebalancing for the larger tiles. The owner refines these
  by eye; the code should make them easy to tune.

## Owner decisions (October 1, 2026)

- **Range:** upgrades stay, but never during battle. Range leaves focus, training and the
  blessing tree; reach grows only in discrete steps on the Heroes screen, plus the high ground
  tile's positional step (decision 1 below).
- **Board sizes, shared rule set, plan order:** accepted as recommended below.

## Still open

1. **In-battle upgrades in general.** Decided (October 1, 2026): hero upgrades belong outside
   battle. For now the economy stays as is: levels, focus (attack or health), class paths,
   Awakening and training remain in battle until the gold economy is redesigned; only range
   left in step 1.
2. **Map freeze (decision 4):** settled. The owner's map workflow is finished and was merged
   into this branch before step 1, so no freeze is needed.
3. **Reach ladder cost:** default chosen in step 5: stars (+1 step at 3 stars, +2 at 5). Can
   move to Evolution or its own upgrade later (`heroStars.reachSteps`).
4. **Patterns per class or per hero:** started (October 2, 2026): classes keep their pattern
   and four heroes have a signature pattern with the same tile count
   (`tuning.board.heroPatterns`: Aegir, Stheno, Skadi, Boreas). Ultimate areas now
   follow patterns too (spec section 6). More signatures are one tuning line each.
5. **Manual ultimates:** dropped by the owner (October 2, 2026). Ultimates stay automatic.
6. **Deploy economy:** the plan keeps gold. The Watcher of Realms style regenerating deploy
   counter stays rejected unless playtests say otherwise.
7. **From the earlier ideas list:** built on October 2, 2026, without a balance pass (the
   owner asked to balance later), with these defaults for the ideas document's open questions:
   - Global stats: collection upgrades apply in every mode, the Daily Trial included.
   - Divine Interventions: two powers with their own charge (Thunderfall, Shield of the
     Crossing), in Free Play, Campaign and Expedition, off in the Daily Trial. Blessing tree
     upgrades for them are not built.
   - Pantheon bonds: added on top of tag synergy, which stays as a hidden layer.
   - Wave interest instead of early call (early call needs overlapping waves, which clash with
     the between-wave blessing offers).
   - Heroic campaign: pays Divine Seals only, no separate laurels.

## Decisions for the owner

Each has a recommendation; the plan below assumes it.

### 1. What happens to range (requirement C)

Range is a percentage today, and a pattern is a set of cells, so a +8% range buy has no
meaning on a board. Range currently grows in eight places:

| Source | Today | Recommendation |
|---|---|---|
| In-battle focus at rank III | attack +10%, health +25% or range +20% | Remove range; focus becomes attack or health |
| In-battle training | attack, health or range (range max 3 buys) | Remove range; training keeps attack and health |
| Blessing tree, six class nodes `*_reach` | +x% range per class | Replace with other class bonuses; refund spent Insight on load |
| Blessing trunk `atlas_wall` | road blockers +x px contact range | Keep: it is about blocking contact, not patterns |
| High ground tile | +20% range | Becomes "+1 reach step" while a hero stands on it |
| Stormpeak environment | platform range −10%, high ground shelters | Becomes "platform patterns lose their outer ring, except on high ground" |
| Class kits, hero rows | base range in px | Kept only for ultimates and auras until they move to patterns |
| Assassin dash reach | px | Kept as is |

**Recommendation: no range upgrades in battle. Reach grows in two discrete ways only:**

- **Outside battle, permanently:** each class gets a short pattern ladder of two or three
  steps (for example Mage `diamond2` → `diamond2` plus the four cells three steps out). The step
  is a hero upgrade in the Heroes screen, tied to Evolution or a skill rank, so it shows on
  the hero and costs collection resources.
- **In battle, by position:** a high ground tile gives +1 step while the hero stands there.
  That keeps a placement decision without a gold buy.

In-battle levels, focus (attack or health), class paths, Awakening and training all stay.
They are the run's gold sink and its between-wave decisions. Removing in-battle upgrades
entirely, as Watcher of Realms does, would also remove the gold economy and the run-to-run
variety; that is a bigger change and not needed for the board.

### 2. Board size

**Recommendation:** three sizes. 8 x 4 cells (118 px) for Chapter 1 and the tutorial stages,
9 x 5 (104 px) for everything else, and 10 x 5 (94 px) for chapter finales and a few late
Free Play maps. More sizes make 83 distinct layouts easier to reach and let early maps feel
calmer.

### 3. One rule set for every board

The prototype keeps its rules (`waveShape`, `focus`, `patterns`) on the map entry. For all
maps they move into one `tuning.board` block, and a map only overrides what it needs.
**Recommendation:** do this in step 1.

### 4. Map work during the migration

The migration rewrites every entry in `tdMaps.json`, the file where new maps also land on
`main`. **Recommendation:** pause map edits on `main` while steps 3 and 4 run, or do those
two steps on `main` right after this branch is merged.

## Plan

Sizes: S is a day or less, M a few days, L a week or more.

### Step 1: make the board a first-class mode (M)

Status (October 1, 2026): done. `test-td-sim.mjs` covers the focus and training pickers
without range, pattern reach, shaped waves (one enemy per gate, split strength) and that maps
without a board keep circles and today's waves. Range left the battle
on every map, not only on boards. Owner direction recorded: hero upgrades belong outside
battle; the in-battle gold economy stays as is until it is redesigned.


- `tuning.board` holds the wave shape, Mage focus and class patterns; any map with
  `grid.board` uses it, map `rules` override single values.
- Remove range from focus and training (decision 1); the training and focus pickers lose
  the option.
- Recruit card: replace the range number with a small pattern grid.
- Bot tile ranking (`rankedTiles`) scores tiles by the route cells their pattern covers.
- Size knobs for requirement D: `board.heroScale` and `board.enemyScale` (figures, tokens,
  enemy sprites, boss) so the owner tunes sizes in data without code changes.
- Tests: pattern targeting, shaped waves, one-enemy-per-gate, no range options in the
  focus and training pickers on boards.

### Step 2: board map generator (L)

Status (October 1, 2026): done. `src/game/td/map-generator-board.js` (`board-v1`), CLI
`npm run td:board` (`scripts/generate-td-board.mjs`), tests in `test-td-map-generator.mjs`.

- Sizes: 8 x 4 at 118 px cells, 9 x 5 at 104 px, 10 x 5 at 94 px (the largest square cell
  that fits the 960 x 540 world with a margin; the earlier 120 / 96 px estimates do not fit).
- One or two gates work reliably (two gates succeed for 53-90% of seeds; the CLI just tries
  more). Three gates use two merge points (A and B meet at J1, C joins at J2) and lanes of
  different lengths, which the sim handles by ranking targets by distance still to go;
  11-17% of seeds succeed per size (October 2, 2026).
- The road is one cell wide: road cells side by side are always consecutive on a lane.
- Special tiles: every map gets high ground and cursed on platforms and a shrine on the road.
- Uniqueness: `layoutConflict()` compares two maps of the same size under the four
  symmetries (as is, mirrored left-right, mirrored top-bottom, half turn) and rejects
  identical cells or more than 70% of the road shared. `generateBoardMap(..., { avoid })`
  skips layouts that conflict with existing maps; the test fails when two board maps in
  `tdMaps.json` share a layout.
- Capacity: 83 mutually unique maps (10 at 8 x 4, 60 at 9 x 5, 13 at 10 x 5, a third with
  two gates) came from 88 recipes in half a second.
- Atlas: `npm run td:board -- --size=9x5 --gates=2 --theme=jungle --count=24` writes
  `public/td-local/board-atlas-<theme>-<size>-<gates>g.html` (open it through `npm run dev`
  at `/td-local/...` so the theme art loads); `--check` regenerates every board-v1 map and
  checks uniqueness.

Original step description:

A `board-v1` generator next to `lattice-v2`, same recipe and `geometryHash` contract:

- Inputs: board size, number of spawn gates (1-3), gate edges, base position, number of
  platform blocks and their shapes (2 x 2, L, row of 3, single), seed.
- Rules: lanes merging before the base (equal length dropped on October 2, 2026); every lane passes at least two
  platform blocks; at least one road choke point next to a block; no platform tile without a
  road cell in reach of the shortest pattern.
- **Uniqueness (requirement B):** a layout signature built from road cells, platform cells,
  gates and base. A candidate is rejected when its signature, or the signature of its
  horizontal or vertical mirror image, matches any existing map, and also when it shares more
  than 70% of its road cells with an existing map of the same board size. A test checks every
  map in `tdMaps.json` against every other.
- Output: a development atlas page with all candidates, so the owner picks per chapter.

### Step 3: migrate every map (L)

Status (October 1, 2026): done. `scripts/migrate-td-boards.mjs` regenerated all 79 maps and
added `moonlit-horned-gate` (1-5), `sunscar-eve` (1-9) and `verdant-last-crossing` (1-10): 82
stage maps, each its own layout, plus `proto-board`. Chapter 1 is 8 x 4, finales 10 x 5, the
rest 9 x 5; maps that had two lanes, every finale and stage 3 of chapters 2-13 have two gates.
High ground gives +1 reach step, Stormpeak takes one step off platform heroes unless they
stand on high ground; texts changed accordingly. Rule tests that need range circles run on
the pre-board maps kept as `scripts/fixtures/td-classic-maps.json`. The old grid code path
stays for that fixture. Review page: `npm run td:board -- --current`.

- Regenerate all 80 maps as boards, keeping ids, names, themes, art, music, bosses and
  environment, so campaign stages, saves and Free Play bests need no migration.
- Give the three shared maps a second map each, so every one of the 82 stages has its own
  layout: 83 maps in total.
- Special tiles on boards: high ground (+1 reach step), shrine and cursed as today;
  Frostbound keeps its shrine rule, Stormpeak gets the pattern rule from decision 1.
- Retire the old grid code path (`buildGrid` segment rows, authored `grid.platforms`) once no
  map uses it.

### Step 4: rebalance the campaign (L)

Status (October 1, 2026): done. `test-td-balance.mjs` passes: on the 10 Free Play boards every
map has winners, 20-wave runs have winners and losers, Endless gets past wave 20, and starters
win on 8 of 10 maps. Its per-map checks now cover Free Play maps only (campaign boards are
checked by `test-td-campaign.mjs`), and the class kit check runs on the classic fixture map.
The board class matrix it prints shows the Tank as the best blocker on 8 of 9 wave types
(Warrior on summoners) and Mage ahead of Archer on most ground types, with Archer best on
flyers, summoners and hexers: road class variety is the next balance topic. `scripts/td-board-tune.mjs` searched every
stage's `hpScale` against the campaign viability setup (35 sampled squads at the levels the
chapter's first clears buy) with targets 90% (1-1), 65% (Chapter 1), 50% (regular), 35%
(finales); every stage landed within 0.11 of its target, none under the 20% floor, and
`test-td-campaign.mjs` passes (including 3-6, which failed before the boards). 1-1 wins every
run even at 3.9x health, so it is set to 2.0. Free Play maps got their own `enemyHp` (bots win
7-9 of 12 runs). Leak damage is rounded to whole lives (shaped flyers cost 3).

- Campaign waves stay as authored; the wave shape converts them. Each stage's `hpScale` and
  lives get retuned with `test-td-campaign.mjs` (the viability floor) and the campaign sweep,
  chapter by chapter.
- Free Play tiers, Long and Endless on boards; each boss on a board (Baphomet, Lilith,
  Ochenta), including whether Ochenta's 80 px stun radius should become cells.
- Watch the Tank payoff (still open in the prototype numbers) and decide on Kraghorn.

### Step 5: ultimates, auras and polish (M)

Status (October 1, 2026): done in a general form rather than hero by hero. On a board a hero's
`range` is the radius of a circle with its pattern's area, so every ultimate area and scaled
reach fits the board, and every check of the form "ally or enemy in range" (heals, auras,
buffs, ultimates without a multiplier) uses the pattern cells (`sim.inReach`). Cone and
multiplied areas (1.8x, 2.5x range) stay circles of the new radius. Permanent reach steps come
from stars (open question 3, default chosen: +1 step at 3 stars, +2 at 5). Glossary ("Reach"
with the pattern name), How to play, class hints and the spec describe patterns. Sizes stay at
`heroScale` / `enemyScale` 1 for the owner's refinement.

- Ultimates, Support auras and heals move from range circles to patterns, hero by hero,
  starting with the ones whose area is drawn on the board.
- Hero and enemy sizes per the owner's refinement (requirement D).
- Glossary, How to play and stage texts: patterns instead of range, the environment texts
  that mention range.
- Spec and mechanics overview updated to the board as the only mode.

### Step 6: blessing tree cleanup (S)

Status (October 1, 2026): done without a save migration: the six `*_reach` nodes keep their
ids and bought levels and now give Tank guard, Warrior / Assassin / Archer crit and Mage /
Support ultimate charge, so nothing has to be refunded.

- Replace the six `*_reach` nodes with new class bonuses; save migration refunds Insight
  spent on them.

## Order and dependencies

Step 1 first, because every later step builds on the shared rules and the size knobs. Step 2
can start in parallel. Steps 3 and 4 run chapter by chapter, so each chapter is playable on
boards before the next starts. Steps 5 and 6 can follow in any order.

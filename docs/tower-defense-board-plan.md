# Tower Defense: adopting the compact board

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
3. **Reach ladder cost:** which resource buys a reach step on the Heroes screen: an Evolution
   tier, a skill rank, or its own upgrade with Gold and Seal Dust.
4. **Patterns per class or per hero:** the prototype gives each class one pattern. Per-hero
   patterns give heroes more identity but cost a balance pass per hero.
5. **Manual ultimates:** the Auto switch and tap-to-cast from section F step 3 of the ideas
   document are not built yet. Build them with step 1 or later?
6. **Deploy economy:** the plan keeps gold. The Watcher of Realms style regenerating deploy
   counter stays rejected unless playtests say otherwise.
7. **Open from the earlier ideas list:** Divine Interventions (possibly unnecessary with
   manual ultimates), pantheon bonds, early call or wave interest, Heroic campaign.

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

**Recommendation:** three sizes. 8 x 4 cells (120 px) for Chapter 1 and the tutorial stages,
9 x 5 (104 px) for everything else, and 10 x 5 (96 px) for chapter finales and a few late
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

Status (October 1, 2026): done except the step-1 tests listed last, which exist for patterns,
shaped waves and the focus and training pickers (`test-td-sim.mjs`). Range left the battle
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

A `board-v1` generator next to `lattice-v2`, same recipe and `geometryHash` contract:

- Inputs: board size, number of spawn gates (1-3), gate edges, base position, number of
  platform blocks and their shapes (2 x 2, L, row of 3, single), seed.
- Rules: lanes of equal length merging before the base; every lane passes at least two
  platform blocks; at least one road choke point next to a block; no platform tile without a
  road cell in reach of the shortest pattern.
- **Uniqueness (requirement B):** a layout signature built from road cells, platform cells,
  gates and base. A candidate is rejected when its signature, or the signature of its
  horizontal or vertical mirror image, matches any existing map, and also when it shares more
  than 70% of its road cells with an existing map of the same board size. A test checks every
  map in `tdMaps.json` against every other.
- Output: a development atlas page with all candidates, so the owner picks per chapter.

### Step 3: migrate every map (L)

- Regenerate all 80 maps as boards, keeping ids, names, themes, art, music, bosses and
  environment, so campaign stages, saves and Free Play bests need no migration.
- Give the three shared maps a second map each, so every one of the 82 stages has its own
  layout: 83 maps in total.
- Special tiles on boards: high ground (+1 reach step), shrine and cursed as today;
  Frostbound keeps its shrine rule, Stormpeak gets the pattern rule from decision 1.
- Retire the old grid code path (`buildGrid` segment rows, authored `grid.platforms`) once no
  map uses it.

### Step 4: rebalance the campaign (L)

- Campaign waves stay as authored; the wave shape converts them. Each stage's `hpScale` and
  lives get retuned with `test-td-campaign.mjs` (the viability floor) and the campaign sweep,
  chapter by chapter.
- Free Play tiers, Long and Endless on boards; each boss on a board (Baphomet, Lilith,
  Ochenta), including whether Ochenta's 80 px stun radius should become cells.
- Watch the Tank payoff (still open in the prototype numbers) and decide on Kraghorn.

### Step 5: ultimates, auras and polish (M)

- Ultimates, Support auras and heals move from range circles to patterns, hero by hero,
  starting with the ones whose area is drawn on the board.
- Hero and enemy sizes per the owner's refinement (requirement D).
- Glossary, How to play and stage texts: patterns instead of range, the environment texts
  that mention range.
- Spec and mechanics overview updated to the board as the only mode.

### Step 6: blessing tree cleanup (S)

- Replace the six `*_reach` nodes with new class bonuses; save migration refunds Insight
  spent on them.

## Order and dependencies

Step 1 first, because every later step builds on the shared rules and the size knobs. Step 2
can start in parallel. Steps 3 and 4 run chapter by chapter, so each chapter is playable on
boards before the next starts. Steps 5 and 6 can follow in any order.

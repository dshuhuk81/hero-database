# Tower Defense - Current Design Reference

Last updated: October 4, 2026, after every battlefield moved to compact boards and the first
tilted-board landscape presentation was approved on a real device.

This file describes what the game **is** today, so that new work can start from it. It is
the current-state reference: when code and this file disagree, the code wins, and the change
that finds the difference fixes this file. History, measurements from earlier versions and
the full previous text of this spec live in [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md)
("Spec before the board rewrite").

How to read it: section 2 explains the battle model in plain words; sections 3 to 9 give the
rules and data of each system; sections 10 to 13 cover the screens around the battle,
progression and saves; sections 14 to 16 are the working tools: checklists for new content,
tests and the open items.

Related documents:
- Open work and priorities: [TOWER_DEFENSE_ROADMAP.md](TOWER_DEFENSE_ROADMAP.md)
- Board adoption plan, decisions and status: [docs/tower-defense-board-plan.md](docs/tower-defense-board-plan.md)
- Tilted board, landscape HUD and phone-review implementation record:
  [TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md](TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md)
- Campaign-wide R18 rollout and WoR-inspired load-audit design:
  [docs/superpowers/specs/2026-10-04-campaign-r18-stage-load-design.md](docs/superpowers/specs/2026-10-04-campaign-r18-stage-load-design.md)
- Why the game moved to boards (analysis and bot measurements): [TOWER_DEFENSE_GAMEPLAY_IDEAS.md](TOWER_DEFENSE_GAMEPLAY_IDEAS.md), section F
- Currencies, upgrade layers and balance levers: [TOWER_DEFENSE_MECHANICS_OVERVIEW.md](TOWER_DEFENSE_MECHANICS_OVERVIEW.md)
- Hero ultimates and kits: [TOWER_DEFENSE_HERO_SKILLS.md](TOWER_DEFENSE_HERO_SKILLS.md)
- Player-facing hero identities: [TOWER_DEFENSE_MYTHIC_HEROES.md](TOWER_DEFENSE_MYTHIC_HEROES.md)
- Blessing tree design: [docs/tower-defense-blessings-research.md](docs/tower-defense-blessings-research.md)
- Summon duplicates, Stars and Evolution: [docs/tower-defense-summon-duplicates-plan.md](docs/tower-defense-summon-duplicates-plan.md)
- Home screen: [docs/tower-defense-home-camp-plan.md](docs/tower-defense-home-camp-plan.md)
- Asset pipeline: [docs/td-asset-pipeline.md](docs/td-asset-pipeline.md); map art assignments: [map.md](map.md)

---

## 1. Scope

- Route `/games/tower-defense` (plus `/games/tower-defense/glossary`). Public, not in
  `LOCAL_ONLY_ROUTES`, no entry in `src/data/nav.ts`. The site home page (`HomePage.astro`)
  links it through an "Alpha" teaser card ("The Last Crossing", camp art
  `td/ui/camp-home.webp`). It has no links to database hero pages, because the TD heroes are
  not the Motto Immortal heroes.
- Fully client side on the static Cloudflare build: no backend, no accounts, no server
  leaderboard, no replays. One exception: the community hero submission form (section 4).
- English only, route not localized.
- Non-goals: map editor, shared leaderboard (needs an anti-tamper design first).

## 2. The battle model in one page

A battle is played on a **board**: a coarse grid of large square tiles laid over themed
terrain. Every battlefield in the game is a board; there are three sizes, 8 x 4, 9 x 5 and
10 x 5 tiles. The road runs from one to three spawn gates, tile by tile, to the base. Road
tiles take blocking heroes (Tank, Warrior, Assassin); platform tiles, grouped in a few blocks
beside the road, take ranged heroes (Mage, Archer, Support).

A hero attacks a **pattern** of tiles around its own tile instead of a circle: Tanks and
Assassins the four tiles next to them, Warriors and Supports a 3 x 3 square, Mages a
diamond two steps out, Archers a long cross. A few heroes have a signature pattern of their
own with the same number of tiles. Placing or selecting a hero lights its pattern
up green. Where a hero stands therefore decides which part of the road it covers, and two
neighbouring tiles can cover very different ground.

A stage brings **fewer, stronger enemies**: timelines carry the final, small counts and each enemy
is stronger than the old horde units (five times the health and gold, two and a half times the attack,
and one shown life lost per leak). Flyers, which ignore blockers, are gentler (1.3 times the health,
also one shown life per leak). Each enemy is
readable and matters; area damage loses some of its value, which is why Mages carry a
**focus** rule (splash that finds no neighbour hits the main target instead).

**Reach** is the size of a pattern. It never changes through upgrades bought in battle. It
grows in steps: a high ground tile gives one step up the class's pattern ladder while the
hero stands there, a hostile environment (Stormpeak) can take one step away, and stars
bought outside battle give permanent steps (3 and 5 stars).

Around the battle: battle placement points buy deploys only (section 9); Gold is only for levelling heroes outside the battle. Hero power
comes from the persistent collection (levels, stars, Evolution, skills), summons and Divine
Blessings, all outside the battle (R4, October 2, 2026).

Why: before boards, heroes covered almost the same road from any tile, Mages were required
in every squad, and a squad without blockers won as often as any other. With boards, tile
choice matters, road heroes are necessary, neither Mages nor Archers are required, and no
one-class squad wins. The measurements are in the ideas document, section F.

## 3. Data policy and white label

Invented tuning numbers are allowed and live only in TD files:

| File | Role |
|---|---|
| `src/data/gameBalance.tuning.json` | Hand-authored knobs: classes, enemies, bosses, run, modes, systems, and the `board` rules (section 6) |
| `src/data/gameBalance.json` | Generated per-hero stats. `npm run build:game-balance` |
| `src/data/tdMaps.json` | Battlefields (boards). Tiles written by `scripts/build-td-grid.mjs` |
| `src/data/tdCampaign.json` | Campaign chapters, stages (own timelines), squad, hero levels, stars, evolution, rewards |
| `src/data/tdSummon.json` | Summon banner, rarity weights, dust |
| `src/data/tdEnvironments.json` | Chapter environments: art direction and one gameplay rule each |
| `src/data/blessingTree.json` | Divine Blessings tree (Favor trunk, Insight class branches) |
| `src/data/tdBosses.json` | Names of TD-original bosses (database bosses come from `bosses.json`) |
| `src/data/tdSkinMythic.json` | Player-facing hero names, titles, ultimate names, art and sound versions |
| `src/data/tdAudioLevels.json` | Per-file gains. `node scripts/td-audio-levels.mjs` |

Hard rules:
- Never write TD numbers back into `src/data/heroes/*.json`, `hero-ratings.json`,
  `bosses.json` or any CN block. `npm run db:merge` stays unaware of TD files.
- **White label:** the player never sees database hero art, names or sounds.
  `src/game/td/skin.js` gives each hero its mythic persona (title, art, sounds, ultimate
  name) from `tdSkinMythic.json`, with TD-owned art on R2 `td/heroes-alt/` and sounds on
  `td/sfx/mythic-*`. UI code must go through `skin.js`. Sound files are
  `mythic-{id}-{version}_{attack|ultimate}.ogg` (`v4` by default; a replaced sound gets a new
  version in the hero's skin entry). Owner review page: `/games/tower-defense/sound-review`.
  Numbers overview (local only, R13): `/games/tower-defense/overview` shows battle economy,
  collection upgrade costs, powers and bonds, enemies, bosses, heroes with reach patterns and
  all campaign stages, read from the data files at build time.
- **Hero ids are the mythic names** (`odin`, `atlas`, `surtr`, ...) in code, data, tests,
  file names and blessing node ids. Database ids appear only in `tuning.statSource` (which
  database hero seeds a row's stats) and in `LEGACY_HERO_IDS` (`page/save.ts`, for old saves).
  Redrawn heroes carry `"art": "v2"` (etc.) in `tdSkinMythic.json`; files become
  `{id}-{art}-{card-240|thumb-96|token-192}.webp`, because R2 caches immutably.
- **Hero board figures:** every hero stands on its tile as an animated PixelLab figure (idle,
  attack, ultimate; `HERO_FIGURES` in `assets.js`, drawn by `updateHeroAnim` in `render.js`;
  recruits share one figure per class). Until a sheet loads, or with `?figures=off` /
  `?anim=off`, a round token shows. Presentation only. Everything tied to a hero (HP bar,
  tile glow, aura ring, silence and hex warnings) sits on the ground plane at its feet.
  Workflow: `docs/td-asset-pipeline.md` part D.
- Page disclaimer (lobby and glossary): "Not affiliated with GOAT Games or Motto Immortal.
  Heroes, art and text are original; music and sounds are CC0."

## 4. Code layout

- Page: `src/pages/games/tower-defense.astro` -> `src/components/pages/TowerDefensePage.astro`
  (wiring only). Markup in `src/components/td/` (`TdLobby`, `TdHome`, `TdPlayScreen`,
  `TdPanels`, `TdOverlays`, `TdGlossary*`, `TdEnemyCard`, `TdSoundControls`, `TdDebugPanel`).
- Page logic: `src/game/td/page/`. One shared `PageContext` (`context.ts`); modules call each
  other only through `ctx.actions`. Screens are a stack mirrored in browser history (`nav.ts`).
- **Rules (pure, headless-testable):**

| Module | Responsibility |
|---|---|
| `sim.js` | The battle: fixed-step simulation, targeting, damage, blocking, ultimates, the stage timeline, board rules |
| `board.js` | Board helpers: cells, named patterns, reach steps, pattern radius, pattern grid SVG |
| `timeline.js` | Stage timelines: expansion into a spawn queue, totals, validation |
| `timeline-targets.js` | Per-chapter enemy, group and spawn-window targets from the WoR table |
| `stage-for-map.js` | A map's own timeline or the one of its campaign stage (Daily Trial, Expedition) |
| `stage-lint.js` | Pacing lint for timelines (`npm run td:stage-lint`) |
| `lanes.js` | Lanes of a map (one path or several) |
| `grid.js` | Tiles of a map (`buildGrid`), bot tile ranking (`rankedTiles`) |
| `map-generator-board.js` | `board-v1` generator and layout uniqueness (section 7) |
| `map-generator.js`, `map-generator-v2.js` | Legacy route generators (`orthogonal-v1`, `lattice-v2`), kept for history and tests |
| `map-validation.js`, `map-analysis.js`, `map-preview.js` | Map contract checks, geometry metrics, preview model |
| `environments.js` | Chapter environment multipliers |
| `campaign.js`, `expedition.js`, `daily.js`, `favor.js`, `skills.js` | Mode and progression rules, texts |

- **Presentation:** `render.js` (PixiJS 8.21.0 and filter-glow 5.2.1 from jsDelivr, exact
  versions pinned; bump deliberately), `map-scene.js`, `fx-kit.js`, `hero-fx.js`,
  `status-fx.js`, `odin-fx.js`, `skin.js`, `audio.ts`, `ui.js`. Presentation never affects
  combat or consumes combat RNG.
- Styles: `src/styles/td.css`, `td-*` classes. Assets: Cloudflare R2 under `td/`, resolved by
  `assets.js` (R2 public URL in production, `/r2` dev proxy locally; the proxy sends `no-cache` and dev sound fetches revalidate, so files replaced on R2 show up locally).
- Community hero submissions: public form `/games/tower-defense/submit-hero` posts to the
  Pages Function `functions/api/hero-submission.js`, which forwards each entry to a private
  Discord channel (Cloudflare secret `DISCORD_HERO_WEBHOOK`; without it the endpoint answers
  503). Spam traps: hidden `website` field and a 4-second minimum fill time.

## 5. Roster and hero stats

34 heroes, literal array `roster` in the tuning file: 21 database heroes, 12
hand-authored common recruits (`recruit-*`, `TOWER_DEFENSE_FILLER_HEROES.md`) and Isis, the
first Lord (hand-authored row, no database entry, so the generator keeps it as written).

| Class | Tile | Pattern | Heroes (internal ids) |
|---|---|---|---|
| Tank | road | `plus` (5 tiles) | `atlas`, `ymir`, `heimdall` |
| Warrior | road | `block` (3 x 3) | `aegir`, `helios`, `surtr`, `fenrir` |
| Assassin | road | `plus` (5 tiles) | `nott`, `hecate`, `vidar`, `thanatos` |
| Mage | platform | `diamond2` (13 tiles) | `odin`, `hephaestus`, `boreas` |
| Archer | platform | `cross3` (17 tiles) | `skadi`, `atalanta`, `stheno` |
| Support | platform | `block` (3 x 3) | `plutus`, `harmonia`, `asclepius`, `gaia` |

Signature patterns (`tuning.board.heroPatterns`) replace the class pattern for one hero and
keep its tile count: Aegir `cross2` (pushes along the road), Stheno `lance` (a sniper's long
lines), Skadi `star3` (her barrage spreads), Boreas `blockPlus` (his shockwave fills it).
Isis uses `row4`, a straight horizontal line (see Lords below). Every other hero, recruits included, uses the class pattern. Line shapes on platform heroes
cover less road than diamonds: a trial with Boreas on `longPlus` and Plutus on `cross2` cut
the 1-10 bot win rate from 0.29 to 0.17, so both were dropped (October 2, 2026).

Gaia is a Support in TD only: `tuning.classOverrides` swaps a database hero's class before
the generator runs. Recruits are two per class.

**Stable baselines:** ranks are taken against the fixed set `tuning.balanceReference` (the 21
database heroes, stats from their `tuning.statSource`), so adding a hero never changes an
existing row. `npm run build:game-balance -- --propose=<id>` prints a new hero's row next to
its class peers; `--check` runs first in `npm run test:tower-defense`.

### Generator (`scripts/build-game-balance.mjs`)

`rank(x)` = percentile rank within the reference set.

```
aps          = clamp(baseAttackRate, 0.5, 2.2)
dps          = lerp(18, 55, rank(atk * baseAttackRate)),  atk = dps / aps
hp           = lerp(340, 880, rank(stats.hp))
armor/mres   = lerp(30, 230, rank(stats.armor / stats.magicRes))
critChance   = stats.critRate / 100
ultCooldown  = 90 / bossUltimatesPer90s
ultPower     = tierUltPower[tier]   // S+ 1.6, S 1.45, A+ 1.3, A 1.15, B 1.05, C/D 1.0
damageType   = skills[0].damageType normalized (magic -> magical, else physical)
```

Cost is value-based, ranked within each slot type, mapped to 85..150 and rounded to 5:
`value_road = 0.30 rank(effDps) + 0.50 rank(effHp) + 0.20 rank(ultValue)`,
`value_platform = 0.65 rank(effDps) + 0.10 rank(effHp) + 0.25 rank(ultValue)`. Cost does not
track the tier badge on purpose: tier reflects real-game skill strength and feeds `ultPower`.
After pricing, class kits apply (`hpMult`, `armorMult`, `apsMult`/`maxAps`, `dpsMult`, forced
`damageType`, `crit`). Class crit is baked into each row here, so a runtime change of a class
kit's `crit` has no effect.

Each row still carries a `range` in pixels. On a board it is replaced at deploy time by the
radius of the hero's pattern (section 6); it only matters on the classic test maps.

## 6. Boards, patterns and reach (`board.js`, `tuning.board`)

### Board geometry

A battlefield is a board when its `grid.board` block exists:

```json
"grid": { "board": { "cell": 104, "cols": 9, "rows": 5, "origin": [12, 10],
  "road": [[c, r], ...], "platforms": [[c, r], ...],
  "rings": [{ "type": "platform", "cell": [c, r], "kind": "highground" }, ...] } }
```

The world stays 960 x 540. Cells are squares; `origin` is the board's top left corner. Sizes
in use (the largest square cell that fits with a margin): 8 x 4 at 118 px, 9 x 5 at 104 px,
10 x 5 at 94 px. `buildGrid` turns the listed cells into `roadSlots` / `platformSlots` (cell
centres) and `rings` (special tiles keyed `type:index`). Never hand-edit those derived arrays;
run `node scripts/build-td-grid.mjs`.

The road (`path` or `lanes`) runs through cell centres. A road cell is a tile unless it is a
gate cell or the base cell. Enemies still walk the path in pixels; a hero's pattern is
checked against the cell an enemy is in.

### Watcher of Realms Reference Data
`/Users/daschultheiss/hero-database/src/game/td/data-sammlung` contains all hero data gathered from Watch of Realms. This can be used to maybe add depth to our game system, or if we want to compare our hero data or enemy data with this game. There is a lot of information in there - so when we try to implmenent a new game mode or balance the game, we could look up data here first.

#### Hero growth calibrated against WoR (2026-10-05)
`npm run td:wor-progression` compares our curves with the WoR data (`scripts/td-wor-progression.mjs`). Findings and what changed:
- Emulator measurements (flat green bonuses excluded): Rex Lv 1 -> 30 grows x10.84 in all four stats, Kassandra (6 stars) Lv 1 -> 60 grows x10.14. WoR sizes the whole climb to about x10; all stats share one curve.
- We had `heroLevels.statPerLevel` banded 6/3/2/1.5/1.5/1 % per level (x2.44 at Lv 60, x3.66 with 5 stars). It is now a flat +9.6 % of base per level in every band (`tdCampaign.json`): x6.66 at Lv 60, x10 with 5 stars (`starScale` stays +10 % per star). `test-td-campaign.mjs` asserts this.
- At the levels heroes have in chapter 1 the new curve barely moves the bot win rate (it matters from about Lv 15 on). The stage `hpScale` values were already off target (several chapter 1 stages at 0 % bot wins against a 65 % goal) and were re-tuned with `scripts/td-board-tune.mjs`.
- WoR enemies barely grow in chapter 1 (Dune Zrak 479 HP at Lv 1, about x1.6 by StageLv 12); player power there comes almost entirely from hero levels.
- Hit size (2026-10-05): WoR basic attacks are slow and heavy (ATK interval 2.1-2.6 s for Rex, Voltus, Kassandra), ours were fast and small (Fenrir 37 ATK at 1.59 attacks/s). `gameBalance.tuning.json` classes now cap the attack rate (Tank, Warrior 0.48/s, Mage, Archer 0.5/s) with `apsMult`/`maxAps`; DPS stays the same (`atk = dps / aps`), so balance and costs are unchanged but hits are 1.3-3.5x heavier (Fenrir 37 -> 123, Atlas 18 -> 64, Helios 49 -> 143). Assassin and Support keep their rhythm. The authored recruit Tanks and Warriors were set to 0.45/s by hand. The hand-edited test values from e3d1af31 (Atalanta 366 ATK, Fenrir 1862 HP / 356 armor) were replaced by the generated rows.
- Hero multipliers (2026-10-05, owner: values were far too low): `heroMultipliers` in `gameBalance.tuning.json` scales ATK (and DPS), HP, armor and magic resistance at runtime, no rebuild needed: `{ atk, hp, armor, magicRes, byClass: { Warrior: { atk } }, byHero: { fenrir: { hp } } }`, all factors multiply. Implemented in `src/game/td/hero-multipliers.js` and applied through `skinHeroes(heroes, base, tuning)` (game page, overview, glossary) and in the balance scripts (`td-runner`, `td-class-matrix`, `td-board-tune`, `td-upgrade-sweep`, `test-td-campaign`). `gameBalance.json` holds the unscaled base rows again. Armor and magic resistance default to 1 because the damage formula (`sim.js` K = 260) works on their absolute size. Enemies are not scaled; the stage `hpScale` values were tuned with `td-board-tune.mjs --max=12` for x2.5 and need a re-tune when the multiplier changes.
- Lv 1 reference stats (not the same scale as ours): Rex HP 1702 / ATK 164 / DEF 213 / M.RES 50, ATK interval 2.1 s; Voltus 597 / 264 / 42 / 138, 2.2 s; Kassandra (Fighter, quality 5) 2927 / 653 / 217 / 46, 2.6 s. Hit size is addressed by the attack-rate caps above; absolute ATK and HP stay on our own scale.

#### Spawn groups of 5 (2026-10-05)
Stages with more than 10 enemies (79 of 82) were a steady drip of single enemies (max 6 per 8 s, spawn window 40-280 s). `scripts/td-regroup-timelines.mjs` (`--size=5 --pause=3000 --min=10 --write`) regrouped them: groups of 5 enemies one `spacingMs` (700) apart, then a pause after the last spawn of the group (3000 ms first, 12000 ms since the first playtest: at 3000 ms three to four groups overlapped on the field because enemies need 20-25 s to cross), then the next group. Kinds, order and totals are unchanged; a leftover group under 3 joins the previous one; the boss follows the last group after one pause. Spawn windows with the 12000 ms pause: chapter 2 about 40-70 s, chapter 13 up to 136 s (originally 77-283 s). All `hpScale` values were re-tuned. The pause is still a guess: `node scripts/td-regroup-timelines.mjs --pause=<ms> --write` regroups the current timelines again, then re-run `td-board-tune`. `td:stage-lint` now flags 79 stages (last spawn far below the WoR chapter target, up to 9 kinds within 20 s); it is a report only.

#### Progression sharpening (2026-10-05)
- **Starters:** `gaia`, `fenrir`, `vidar`, `atalanta`, `asclepius` (epic) and `recruit-bram` (common Tank): only common and epic, six heroes for `squadSize` 6. The first legendary is the Stage 1-5 gift: `boreas` (Mage; it was `plutus`, who still comes at 8-3 and 8-6). The second legendary, `odin`, follows at 1-10.
- **Rarity strength (WoR quality 3 / 4 / 5, Adv 1-6 totals, medians):** HP 2150 / 3150 / 5429, ATK 691 / 1135 / 1599, so a legendary is about 1.4-1.7x an epic and an epic about 1.5x a common. `heroMultipliers.byRarity` in `gameBalance.tuning.json` now gives legendary x1.6 ATK and HP on top of the global factor (epic and common x1).
- **Enemy ramp:** `ENEMY_RAMP` in `scripts/td-regroup-timelines.mjs` caps the enemies per stage (boss excluded), first to last stage of a chapter: ch1 8-12, ch2 12-16, ch3 14-18, ch4 16-21, ch5 17-22, ch6 18-24, ch7 20-26, ch8 22-28, ch9 16-22, ch10 18-24, ch11-12 20-26, ch13 22-28 (was 11-48). `node scripts/td-regroup-timelines.mjs --thin --write` thins evenly spread enemies (kinds keep their mix), then groups of 5 with the 12000 ms pause.
- **Difficulty targets** (`td-board-tune.mjs`, bot win rate at the expected levels): 1-1 95 %, rest of chapter 1 85 % (finale 70 %), chapter 2 60 % (finale 45 %), later 50 % (finale 35 %). Chapter 1 is meant to be easy with the starters; from chapter 2 levelling and new heroes carry the player. `hpScale` of all 82 stages was re-tuned.
- **WoR progression facts (for later work):** hero level cost per level 200 (Lv 2-10), 750 (Lv 20), 5750 (Lv 30), 17250 (Lv 50), 54750 (Lv 60); cumulative 1800 / 7050 / 42050 / 270300 / 625300 at Lv 10 / 20 / 30 / 50 / 60 (15x between Lv 30 and 60), far steeper than our linear 100 + 50 per level. Our whole campaign pays about 297k Gold, enough for Lv 15-25 on a squad of six. Growth Lv 1 -> cap is about x10 for every quality (Rex Lv 30, Kassandra Lv 60); common heroes cap at Lv 30 and 3 stars, legendary at Lv 60 and 6 stars (Q4 cap not measured). We did not copy the cost curve: income, not cost, limits our levels, so it would change little.

The only hero the campaign gives away is `boreas` at Stage 1-5 (owner, 2026-10-05); every other hero comes from summons. `td-board-tune.mjs` therefore plays the whole campaign with the six starters plus Boreas, levelled evenly, and `hpScale` was re-tuned for that. The WoR campaign analysis (`watcher_of_realms_campaign_analysis.md`) describes enemy strength as one Stage Level that picks HP and ATK from per-enemy curves (Dune Zrak: HP 479 / 2850 / 5245 and ATK 122 / 725 / 1335 at Lv 1 / 100 / 200); ours only scales enemy HP per stage (`hpScale`), enemy attack stays at its base value. Open idea: a per-stage attack scale.

#### Enemy attack scale and enemy battle power (2026-10-05)
- **Battle XP (October 6, 2026, owner; WoR reference):** every hero fielded in a campaign fight earns a share of the stage's Hero XP reward afterwards: `campaign.battleXp.win` 0.2 for a win, `.loss` 0.08 for a loss (`grantBattleXp` in `campaign.js`, called by `finishCampaignRun`). A full bar (the Hero XP cost of the next level) raises the level for free, up to the cap its Stars allow; at the cap the bar stays empty. Heroes that sat out earn nothing. Saved as `progress.xp` (campaign save version 11). The result text lists the XP and any level reached. Not shown yet on the hero tiles. WoR reference: a WoR account that never levels by hand (the tutorial asks for two upgrades to level 10) still reaches the middle of campaign 2 easily, so the passive trickle is part of the intended power curve.
- **Squad roster and enemy bars (October 6, 2026):** the squad screen lists only owned heroes and fills the rest of the two rows with empty placeholder cards (`fillRosterPlaceholders` in `page/campaign.ts`, redone on resize). Enemy health bars appear only after the enemy first takes damage and then stay (`enemyHurt` in `render.js`; shield damage counts).
- **Chapter 1 pacing (October 6, 2026, owner):** unlevelled starters should stall around 1-5, rewards spent on levels carry a little further, and the rest comes from summons, Stars and replays. `hpScale` of 1-1 to 1-10 was re-derived with `npm run td:ch1-pacing -- --measure`: it finds, per stage, the largest `hpScale` the bot still wins half its runs at with (a) the unlevelled heroes owned at that point and (b) the same heroes with every earlier first-clear reward spent on levels (win rate against `hpScale` is a cliff, so it scans a x1.1 grid). The shipped value is `H x cliff x g` with `H` = 3.5 (how much stronger the owner plays than the bot; the owner cleared 1-5 at 3.14 x the bot's cliff, so 3.14 is the floor) and `g` the stage's position on the curve: unlevelled cliff for 1-1..1-5 (0.45, 0.6, 0.75, 0.95, 1.15), levelled cliff for 1-6..1-10 (0.8, 0.85, 0.9, 0.95, 1.0). If the owner stalls earlier or later than 1-5, scale every value by one factor (`H`) rather than editing single stages. Re-measured after Battle XP was added (all owned heroes earn it in the measurement, so the cliffs rose): shipped values 1-1 to 1-10 are 1-1 6.82, 1-2 19.47, 1-3 2.26, 1-4 11.9, 1-5 3.78, 1-6 10.02, 1-7 9.67, 1-8 8.47, 1-9 3.79, 1-10 4.83. The bot itself now wins none of these (it plays about 3x weaker than the owner), so `test-td-campaign` only checks structure here.
- **`atkScale`** per campaign stage in `tdCampaign.json` multiplies the enemies' attack (sim `atkScale`, passed by `stageGameOptions`; 1 everywhere else). It rises from 1.0 at 1-1 to 1.3 (end of chapter 1), 1.7, 2.2, 3.2, 4.2, 5.2, 6.5, 8, 9, 10, 11, 12, 13 at the end of chapters 2-13, linear inside a chapter. The shape follows the WoR per-enemy attack growth by chapter (x1.8 / 2.3 / 2.7 / 4.9 / 7.1 / 7.9 / 14.1 / 14.9 for N1-N8, relative to N1-1), softened; WoR's N9+ gate jump is not copied.
- **Summon reveal details, Expedition air cover, pause menu (October 6, 2026):** the summon reveal stage (`page/summon-reveal.ts`) shows a detail panel under the cards for the last hero flipped or tapped: name, class and Road/Platform role, title (or the class `ROLE_HINTS` line), Star rank and "New hero" / "Spare copy (n spare)". A new Expedition's platform hero is now a Mage or Archer when one is owned (a Support there barely hurts flyers; only platform heroes reach them), and a camp offers a Mage or Archer first when the roster has none. The pause menu no longer shows the Synergies count (players did not know it; the bond/synergy numbers stay in hero popovers).

- **Expected Stars:** `expectedStars` in `tdCampaign.json` is a balance assumption, not a rule: the owned heroes have 0 / 0 / 0 / 1 / 1 / 1 / 2 / 2 / 2 / 3 / 3 / 3 / 3 Stars in chapters 1-13 (copies come from summons, which `td-board-tune.mjs` does not simulate). Without it the tool's heroes sat at the 0-star level cap of 10 from chapter 3 on and all later chapters were calibrated for Lv 10 heroes. With it the bot's heroes reach about Lv 40 in chapter 13.
- **Enemy battle power:** `recommendedMight` per stage = the median Might of the squads the stage was balanced for (`scripts/td-stage-power.mjs --write`, run after `td-board-tune.mjs`): about 6 700 at 1-1, 12 600 at 3-4, 20 000 at chapter 6, 41 600 at 13-6. The squad screen shows it next to the squad's own Might (`Enemy 12,570`, green when the squad reaches it, gold when below); the stage drawer shows it as "Enemy battle power". It is the number the stage was balanced for, not a guarantee: heroes with Stars from lucky summons or focused levelling are stronger than the model.
- Re-run order after any change to heroes, `heroMultipliers`, timelines, `atkScale` or `expectedStars`: `td-board-tune.mjs` per chapter (`--max=12`), write `hpScale`, then `td-stage-power.mjs --write`.

### Shared board rules

`tuning.board` holds the rules every board uses; a map's own `rules` block can override single
values (`boardRules(map, tuning)`, one level deep; available in the sim as `game.boardRules`).
Maps without `grid.board` get `null` and play the classic way (only the test fixture does).

| Key | Value today | Meaning |
|---|---|---|
| `patterns` | Tank `plus`, Warrior `block`, Assassin `plus`, Mage `diamond2`, Archer `cross3`, Support `block` | Class attack patterns |
| `heroPatterns` | `aegir` `cross2`, `stheno` `lance`, `skadi` `star3`, `boreas` `blockPlus` | Signature patterns by hero id (section 5) |
| `waveShape` | count 0.2, gap 2.5, hp 5, attack 2.5; grunts/runners count 0.4, hp 2.5, attack 1.25; flyers count 0.4, hp 1.3, attack 1 | Fewer, stronger enemies and road class variety (section 8) |
| `focus` | slots 2, share 1 | Mage focus rule (section 7) |
| `heroScale`, `enemyScale`, `bossScale` | 1.3, 1.5, 1.5 | Unit size on boards. Bars render in their own top layer. Boss source art and scale are handled separately from ordinary enemies |

### Tilted-board landscape presentation

`tuning.board.tilt` enables the R18 presentation without changing simulation geometry or the
generated `geometryHash`. `tilt.campaign: true` makes it the default for every Campaign run,
including future stages and current 8x4, 9x5 and 10x5 layouts. Daily Trial and Expedition stay explicit and only
use R18 for maps in `tilt.maps`: `jungle-heart-temple`, `proto-slabs`, `moonlit-pass`,
`sunscar-ruins`, `sunscar-basin` and `jungle-flooded-court`. `proto-slabs` has its own 0.85 / 40
override while the shared values are 0.75 / 70. `?tilt=off` disables it for development and a
numeric `?tilt=` overrides the vertical factor.
The full decision history and rollout boundary are in
[TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md](TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md).

- the ground, tiles and board-aligned art are vertically tilted; actors and readability graphics
  keep their normal thickness;
- unit scale changes by depth from about 0.90 on the far row to 1.10 on the near row;
- landscape HUD rows float over the scenery and the deck targets a 50 px inner portrait at the
  360 px reference height; portrait phones are blocked by a modal orientation gate, pause and
  continue after the player rotates to landscape;
- map/environment labels are single-line chips and transient battle notices are compact two-line
  toasts at the upper right, leaving the upper centre available for combat and boss health;
- landscape overlay row one reserves separate areas for stage identity, centred boss health
  and notices; row two separates preview/quest chips from horizontally scrollable buffs;
  reaction-discovery toasts name the reaction only, with full explanations in the glossary;
- damage numbers follow their living target and avoid nearby labels using bounded vertical
  lanes; very dense saturation may still overlap rather than detach a number from its owner;
- melee enemies held by a road hero are drawn just outside that hero's tile (0.62 cells from its
  centre, presentation only; simulation positions and the block limit are unchanged), so they never
  stand on a hero's tile;
- health, shield, valor and ultimate bars sit at their unit's depth in the unit layer (a unit lower
  on the board draws in front of the bars behind it, so hero bars beat an enemy's above them);
  rings and warnings stay in a top graphics layer; heroes use green health plus a
  shorter purple ultimate bar, enemies use thin red health bars and bosses use a centred HUD bar;
- readability pass (Oct 5): lanes get a darker open-ground layer with soft white flow chevrons,
  slabs a dark outline, enemy spawns a pulsing red portal glow, the ground a side vignette
  (32 strips, up to 0.34 black), level badges shrink to 0.72 on tilted boards and hero ground
  shadows are larger and darker (`heroScale` 1.15 to 1.3);
- second pass (Oct 5): slabs cast one thin contact shadow under the front face instead of a halo;
  hero figures stand near the tile centre (`HERO_ANIM.feetY` 22 to 6, hero bars moved up to match);
  ground enemies grow from 55 % and fade in over their first 70 road px (`EMERGE_DISTANCE`) so they
  step out of the portal; the incoming-wave chips ("in 9s 2x Grunts") are removed, only the
  pre-start summary chip stays;
- ground heroes and enemies sort by foot position, flyers stay above them, and tall gate art stays
  behind units; spawn labels hide while a stage runs;
- taps are inverse-mapped through the visible tilt and checked in that plane, including the edge
  halo on 6x3, 8x4 and 9x5 boards;
- All 14 current themes use their own authored `*-terrain-wide-v1.png` panoramas behind the
  unchanged gameplay terrain. Shared architecture never supplies another theme's panorama;
  future environments without a registered panorama retain their own terrain fallback.
  Sources, prompts and checks: [Theme Landscape Panoramas](docs/theme-panoramas.md).

### Patterns and reach steps

Named patterns are cell offsets from the hero's own cell, all symmetric because heroes do not
turn (`PATTERNS` in `board.js`):

| Pattern | Tiles | Shape |
|---|---:|---|
| `plus` | 5 | own tile and the four next to it |
| `block` | 9 | 3 x 3 |
| `blockPlus` | 13 | 3 x 3 and one more tile in each straight line |
| `diamond2` | 13 | every tile within two steps |
| `star3` | 17 | `diamond2` and one more tile in each straight line |
| `cross3` | 17 | three tiles in each straight line over a 3 x 3 core |
| `cross4` | 21 | four tiles in each straight line over a 3 x 3 core |
| `diamond3` | 25 | every tile within three steps |
| `block2` | 25 | 5 x 5 (unused) |
| `cross2` | 9 | two tiles in each straight line (signature) |
| `longPlus` | 13 | three tiles in each straight line (ladder step of `cross2`) |
| `lance` | 17 | four tiles in each straight line (signature) |
| `row2` .. `row5` | 5 / 7 / 9 / 11 | the own tile and 2 .. 5 tiles to the left and right only, never up or down (Isis uses `row4`; ladder `row2 <-> row3 <-> row4 <-> row5`) |

A **reach step** moves a pattern along a fixed ladder (`steppedPattern`): up is
`plus -> block -> blockPlus -> diamond3`, `diamond2 -> star3 -> diamond3`,
`cross3 -> cross4`, `cross2 -> longPlus -> lance -> cross4`; down is the reverse
(`diamond2` and `block` step down to `block` and `plus`, `cross3` to `blockPlus`, `cross2`
to `plus`). A hero's pattern on a tile (`game.patternAt(hero, slotType, slotIndex)` with
`hero = { id, class, reachSteps }`, `game.patternOf(hero)`) is its signature or class
pattern plus:

- +1 step on a **high ground** tile;
- -1 step when the map's environment cuts platform range (Stormpeak's Headwinds) and the
  tile is not high ground;
- the hero's permanent **reach steps** (`reachSteps` on the hero row): +1 at 3 stars, +2 at 5
  stars (`tdCampaign.json` `heroStars.reachSteps`, every mode, shown on the Stars tab).

Range is never upgraded in battle; nothing about a hero is upgraded in battle (section 9).

### What reach decides

- **Basic attacks** hit only enemies inside the pattern cells (`game.reaches`), with every
  target priority. Assassins can still dash to a loose enemy within their dash distance.
- **Allies and enemies "in range"** of heals, auras, buffs, purifies and ultimates are those
  inside the pattern cells (`game.inReach(hero, unit)`).
- **Ultimate areas follow patterns** (`game.inUltArea(hero, unit, scale)`): an area tuned
  as a multiple of range is the hero's pattern stepped up by area, 1.8x -> two steps (Tank
  hold, Atlas, Ymir, class taunts), 2.5x -> three and 3.5x -> four (Heimdall). Cones and
  volleys (Stheno's gaze, Skadi's barrage, class volleys) pick enemies inside the pattern in
  the 120 degree wedge the hero faces; an enemy on the hero's own tile always counts as in front.
- **Close areas** (`game.nearPoint(point, unit, radius)`): cleaves around the hero and blasts
  around a target cover a plus of tiles when tuned up to 80 px and a 3 x 3 block when larger
  (Hephaestus and Elm awakened, Hecate awakened, Fenrir awakened). Odin's bounce distance,
  Atalanta's piercing line and basic-attack splash stay in pixels.
- On a board a hero's `range` is the radius of the circle with its pattern's area
  (`patternRadius`: cell x sqrt(tiles / pi)); it remains for effects drawn as circles.
- Bots rank tiles by how many route cells the pattern covers (`rankedTiles(map, type, range,
  pattern)`).

### What the player sees

- Placing a hero (recruit preview) or selecting one lights its pattern cells up green in
  place of the range ring (`drawReach` in `render.js`).
- The recruit card and the hero panel show the pattern as a small grid labelled "Reach"
  (`patternSvg`): the hero's tile in gold, reached tiles in green. The glossary names each
  hero's pattern ("Diamond, 13 tiles", `patternLabel`).
- Taps pick the tile under the pointer: a point inside a board cell always selects that cell
  (`nearestSlot`).

## 7. Combat rules (`sim.js`)

- **Lords** (`tuning.lords`, `lordFx`, `stepLord`, `lordMark` in `sim.js`; text from `lordText` in
  `skills.js`). A Lord is a hero row with `"lord": true` whose tuning entry names a faction
  (`members`: hero ids; the Lord belongs to it herself). While she stands on the field:
  members get +15% attack and +15% effective health (damage taken / 1.15); every
  `baseInterval - perMember * members on the field` seconds (50 s alone, 6 s less per member,
  never below 30 s; the clock only runs while no bonus is active) they deal +50% damage and
  their heals are +50% for 20 s; after the Lord's direct damage (basic attack or ultimate) one
  enemy is marked and takes +20% from her faction for 3 s. Damage over time does not mark. The
  first Lord is Isis, faction "Egyptian": Helios, Hecate, Vidar, Thanatos (the heroes seeded from
  Egyptian gods; the white-label pantheon column of the mythic doc is unrelated).
- **Isis, Light of the Hidden Sun** (variant `sun_beam`, basic `beam`, Mage / platform,
  pattern `row4`). Reach is her own row only. The basic attack hits its target fully and every other
  enemy on the line (nearest first, up to 8, also those in front of the target) for the Mage splash share; the ultimate fires a beam to the left or
  right (side with more enemies on the row, the target's side on a tie) and hits up to 8 enemies
  on it once for 100% (12 awakened). Off boards the row is a +/-24 px band. Ultimate skill levels
  already add +5% damage each (`heroSkillLevels.ultimatePowerPerLevel`). Effect event `ult`
  carries `beamDir`, `beamLength`, `beamHits` for `hero-fx.js`. Plan for the generated particle
  art: `docs/td-isis-ultimate-fx-plan.md`. Test: `scripts/test-td-lord-isis.mjs`.

- Fixed step 60/s, accumulator loop, deterministic, seeded RNG. The speed toggle scales steps
  per frame, never step size. World space 960 x 540, canvas CSS-scaled.
- Damage: `mitigation = res / (res + 260)`; `dmg = atk * (1 - mitigation) * (crit ? 1.5 : 1)`.
  True damage skips mitigation.
- **Placement:** road tiles take Tank / Warrior / Assassin, platform tiles take Mage / Archer /
  Support. Flyers can only be hit by platform heroes. Tile look (`map-scene.js` `drawSlot`):
  road tiles are recessed sockets with corner brackets and a shield glyph, platform tiles
  raised bevelled plates with a double chevron; on boards they are drawn at the cell size. On
  tilted boards the platform front lip is 0.0788 cell high (the prototype's 0.3 cell, halved, reduced by 25%, then by another 30% on Oct 5).
  Placement states (`render.js` `slotMode`): while a fallen hero is picked, tiles of its
  type glow and the others fade; with a full team empty tiles go quiet.
- **Placing heroes** (`page/recruit.ts`, `page/hud.ts`, `page/powers.ts`): the bottom bar has no
  Start, Deploy or Blessings button. Bottom left: the two Divine Interventions as round buttons
  (gold ring = charge, percentage in the middle, a bolt/shield glyph once ready), then one round
  portrait per fielded hero (tap = hero panel). Bottom right: the deck with every hero still to
  place (never fielded, or fallen; gold border, price badge, dimmed when too expensive). A hero
  leaves the deck when placed and returns to it when it dies or is sold. Press a deck hero and
  pull it more than 6 px: a ghost follows the pointer (lifted 56 px above a finger), the battle
  pauses (`pause` reason `drag`), tiles of the hero's type glow and the tile under the pointer
  shows the range preview (`game.uiPlacement`). Releasing over a free tile of the right type
  calls `game.place()`; releasing elsewhere, Escape or a cancelled pointer drops it. Failures
  name the reason. A tap on a deck hero then a tap on an empty tile also places it (keyboard
  fallback, `state.deployHeroId`). The stage waits (nothing spawns) until the first hero is
  placed; that placement calls `startStage()` (`hud.ts`), resets speed to 1x and starts the
  timeline. Tapping an empty tile with nothing picked only hints at the drag. The old recruit
  sheet is still in the code but no tile opens it.
- **Blocking:** `blockLimit` Tank 3, Warrior 2, Assassin 1, contact 24 px. Held enemies take
  +20% damage; enemies passing a full blocker are slowed.
- **Class archetypes** (`tuning.classes`): Tank `taunt` (guard: shrugs off part of each hit),
  Warrior `cleave`, Assassin `execute` (dash to loose enemies, veil), Mage `nuke` (splash,
  chain), Archer `volley` (pierce, targets the strongest, +100% vs flyers), Support aura and
  heal (+35% passive attack to allies in reach, heals the most injured ally in reach).
- **Mage focus** (`classes.Mage.focus` set from `tuning.board.focus`; `sim.focusShare`):
  splash shares that find no neighbour (2 expected) fold into the main target, so a lone
  target takes up to 1.7x; a chaining Mage folds in its unused bounces.
- **Ultimates:** per-hero variants in `tuning.heroSkills`, texts in `skills.js`,
  ~250% x tier ult power plus class add-ons; collection Evolution V awakens them
  (`awakenedUlt`, section 11).
  `sim.faceTarget()` turns a hero to its target every step and at cast, so cones and spreads
  centre on the target. Heroes never move on attack; only the attack clip plays.
- **Statuses:** wet, burn, poison, chill, with reactions `conduct`, `steam`, `blight`,
  `freeze`, `harvest`. Class Infusion blessings let any class apply a status.
- **Exposed** (`enemy.exposed`, end time): +20% damage taken. Reapplying keeps the later end.
- **Special tiles** (`rings`): high ground (+1 reach step on boards), shrine (+30% ultimate
  charge), cursed (+30% attack, -20% attack speed). Every generated board has one of each.
- **Synergy:** each `synergies` tag shared by 2+ deployed heroes within 250 px gives +8%
  attack, capped at +24%.
- **Divine Interventions** (`tuning.interventions`, `page/powers.ts`): two player powers in
  the bottom bar. Each charges during the stage (1 point per second plus 1 per kill) and is ready
  at its `charge` (Thunderfall 45, Shield 90); casting spends it all. **Thunderfall**
  (unlocked by clearing 1-3): arm the button, tap the map; 0.8 s later a bolt hits the cells
  around the spot (`nearPoint`, 90 px: a 3 x 3 block on boards) for 35% of each enemy's max
  health as true damage (8% for bosses; shields absorb first). **Shield of the Crossing**
  (unlocked by 1-6): for 6 s leaks cost no lives (they still count as leaks), then a 60 s recovery (`cooldownSeconds`).
  Available in Campaign and Expedition, not in the Daily Trial (`session.ts`
  passes the unlocked list as `interventions`). Upgrades sit on trunk row 4 of the blessing
  tree (needs 32 trunk points; R5): Storm Caller (`odin_tempest`, Thunderfall charges 8% faster
  per level, 5 levels), Wrath of the Sky (`helios_wrath`, Thunderfall area 3 x 3, then 13, then
  17 tiles: `block` / `blockPlus` / `star3`; 2 levels), Bulwark Vigil (`atlas_vigil`, Shield
  charges 8% faster per level, 5 levels), Long Vigil (`ymir_endurance`, Shield +1 s per level,
  3 levels). Charge cuts stop at 75% (`sim.interventionMax`). New node ids need no save
  migration: saves keep every bought level by id.
  Visuals (R5, `render.js drawPowerEffect`): while Thunderfall is armed, the tiles under the
  mouse light up blue (`game.uiAim`, `sim.thunderArea`); after the tap they pulse during the delay
  (`thunderWarn`); the strike draws a jagged bolt from the top edge, flashes the cells, throws
  sparks and shakes the board briefly (`thunderStrike`, sound: Odin's ultimate plus the heavy
  hit). The Shield raises a blue-gold dome over the base for its duration (`shieldUp`), and
  each leak it stops shows a "Blocked" pop (`shieldBlock`).
- **Reactions on the squad screen** (`reactions.js`): a line under the hint names the element
  reactions the lineup can trigger (Steam, Freeze, Blight, Conduct, Harvest) and the heroes behind
  each; both halves must be in the squad. The line keeps its height when empty.
- **Pantheon bonds** (`bonds.js`, `tuning.bonds`): heroes of one pantheon standing on the
  field together unlock a tier. Norse (Odin, Ymir, Heimdall, Aegir, Surtr, Fenrir, Nott,
  Vidar, Skadi) 2: +6% attack, 4: +12% attack and ultimates charge 10% faster. Greek (Atlas,
  Helios, Hecate, Thanatos, Hephaestus, Boreas, Atalanta, Stheno, Plutus, Harmonia,
  Asclepius, Gaia) 2: 7% less damage taken, 4: 13% less and heals 15% stronger (the healer's
  bond counts). Recruits are wildcards: each joins the set with more of its own heroes on the
  field (Norse on a tie) and shares its bonus. The squad screen lists the bonds a squad
  brings; in battle active bonds show as gold chips in the bar on the map. Tag synergy stays
  underneath as before; `synergy.bonusPerTag: 0` would retire it.
- **Hero panel** (`page/popover.ts`): stars and Evolution badge, stats (attack, speed, reach
  grid, crit), target priority, collapsed details, and a pinned footer with the permanent
  progress line (collection level and skill levels, `ui.js heroProgress()`; heroes without
  campaign data show level 1), the relocation preview, Relocate with its cost (2/3 width) and
  Sell (1/3). Relocate closes the panel and highlights the empty tiles of the hero's type
  (`state.relocateEntityId`, `game.uiDeploySlot`); the next compatible tile moves the hero, an
  invalid tile keeps the mode, and tapping the hero again, Escape, an empty map tap, the stage
  start or the run end cancel it. Deck and board badges show the collection level.
- **Boss warnings** (`page/hud.ts`): "<boss> has entered <map>" and the boss nameplate appear when the boss
  group spawns.

Hero-specific rules worth knowing when touching their kits: Boreas `ice_shockwave` (140% per
enemy around him, 10% freeze chance), Gaia `rooted_sanctuary` (heals allies in reach for 30% of
her max health and wards them for 30% less damage over 8 s), Atalanta `limitless_shots`
(Idril's Limitless Shots). Details in `TOWER_DEFENSE_HERO_SKILLS.md` and the archived spec.

**Ultimate windows (2026-10-06, WoR comparison):** most Watcher of Realms ultimates are timed states,
not one-off bursts. Five heroes now work that way, tuned in `tuning.heroSkills` (`seconds`,
`awakenSeconds`, `share`, ...); texts in `skills.js`. The old variants stay for the recruits.
- `limitless_shots` (Atalanta, replaces `burning_volley`): 6 s (8 awakened), every basic attack
  looses 3 arrows (5 awakened) at its target, the extras for 50% each and burning; reach +1 step
  (`hero.win.reach`, read in `patternAt`).
- `flurry` (Vidar, replaces `rapid_strike`): 4 s (6), every basic attack strikes 3 times (5) at 60% per extra.
- `solar_rush` (Helios, replaces `war_cry` for him): 60% cleave plus slow, then 5 s (8) of +30% attack speed,
  +20% attack and a second strike (70%) per attack.
- `bifrost_ward` (Heimdall, replaces `mass_taunt` for him): allies in reach take 25% (35%) less damage for 4 s
  (6 s) via `wardCut`/`wardUntil`; scaled by control power. The Tank class hold still pins foes.
- `molten_ground` (Hephaestus, replaces `rebirth_flame` for him): a ground zone (`game.zones`, stepped in
  `step`) at the target for 4 s (5): 50% of power per second, 80 px (110), slows ground enemies.
Extra strikes live in `basicAttack` (`hero.win = { until, extra, share, reach, burnShare }`); the
per-second damage and zone pulses are presentation-light (a gold splash ring every 0.5 s).
Flat ground effects (every `groundRing`, lava pool, window rings, ward rim) draw on a second fx kit (`groundFxKit`, `layerGroundFx` in `render.js`) below the units, so they never cover an enemy; particles and bursts stay on the main kit above.
Effects (`hero-fx.js`, `update(game)` reads the state every frame): a ground ring plus drifting
particles at the feet of a hero with a running `win` (Atalanta wind and leaves, Vidar afterimages and
streaks, Helios heat ring and embers), a lava pool with magma veins, embers and flames for each zone,
and a bridge-coloured rim on allies under `wardFx: "bifrost"`. Every running state blinks in its last
1.5 s and shrinks (lava) so the end is readable. Extra window strikes emit an `extra` effect (fanned
arrows, crossed dagger glints, a mirrored sun arc) and ward hits emit `wardhit` (a bridge-coloured
twinkle). Heimdall's and Atalanta's cast effects were redrawn to match their new ultimates.
Tests: `scripts/test-td-sim.mjs` (windows, lava), `scripts/test-td-ultimate-upgrades.mjs` (Heimdall ward).

## 8. Enemies, bosses and the stage timeline

### Enemies

Kinds: `grunt`, `runner`, `flyer`, `archer`, `brute`, `brood`, `mender`, `shieldbearer`,
`broodcaller`, `imp`, `hexer`, the chapter creatures, plus `boss`. Stats in `tuning.enemies` (real Normal values;
`difficulty.enemyHp` is 1 and only a debug knob).

- Enemy archers stop at 110 px and shoot for 8 s, then close in; with no road hero in reach
  they shoot the nearest platform hero for half their attack (amber brackets mark the target).
  Other enemies never hit platform heroes directly (Baphomet's mark and hexers still affect them).
- Brutes and bosses are armoured but weak to magic; shieldbearers carry a regrowing shield
  that many quick hits break; menders heal nearby enemies; broodcallers summon imps; hexers
  resist magic and hex the nearest hero.
- **Chapter creatures** (October 6, 2026, A4 of the gameplay ideas; `burrower`, `vinebinder`, `jaguar`,
  `sporeling` in `tuning.enemies`; Chapter 2 and 3 timelines swap some grunts and runners for them,
  introduced stage by stage; the totals per stage are unchanged):
  **Burrower** dives for 3 s when hit (untargetable, walks under blockers), then waits 6 s;
  **Vinebinder** roots the road hero it fights for 4 s every 7 s (the hero cannot attack, still blocks,
  its ultimate keeps charging; veiled heroes are immune); **Jaguar** leaps 110 px over the first
  blocker it meets, once; **Sporeling** leaves spores on death: heroes within 70 attack 25% slower
  for 4 s. Burrower, jaguar and sporeling use the grunt/runner enemy shape. Each has its own still
  (`enemies/sprites/{kind}-v1`, source `artifacts/td-chapter-enemies-v1/`) and animation sheet
  (`enemies/clips/{kind}-v1`, PixelLab clips, 110 px frames); the files are local and **not on R2
  yet**. Numbers are first guesses.

### Fewer, stronger enemies (`tuning.board.enemyShape`)

Timelines carry the final counts; `game.enemyShape(kind)` gives each spawned enemy the strength of the horde
units it replaces:

- A normal group enemy has 5x health, 5x gold, 2.5x attack and loses 5 lives on a leak (`power` 5).
- Grunts and runners carry 2.5x health and gold and 1.25x attack (5 lives per leak): more, smaller bodies give
  Warrior cleave and Assassin interception enough targets.
- Flyers use their own values: 1.3x health, normal attack, 2.5x gold, 5 lives lost on a leak (leak damage is
  rounded to whole lives).
- **Shown lives:** the battle keeps its internal lives; the UI shows them in units of
  `tuning.board.lifeUnit` (5) via `shownLives()` in `board.js`, so a regular leak costs one
  shown life and the run ends when the shown count reaches 0. Bosses and their children keep
  their own leak damage and can cost a fraction of a shown life.
- Bosses and summoned children (imps, Lilith's brood) are never shaped.
- The stage forecast and the HUD show the timeline's real counts.

Values live in data, so a map can override them in its `rules`.

### Bosses

- `baphomet` (marks the highest recent damage dealer: silence plus 10% health; defensive
  stance) and `lilith` (summons brood, enrages below 50%).
- `ochenta`, the Proud Commander (final boss of Heart Temple and stage 3-6): Valor
  (every direct hit adds 1; at 80 a stun shockwave and 4 s of speed and crowd-control
  resistance), Resolve (permanent steps at 80/60/40/20% health), The Final Eight (cannot fall
  below 1 HP for 8 s at 8% health). Numbers in `tuning.bosses.ochenta`; first guesses.
- TD-original bosses prepared without rules yet: `lerna`, `kraghorn`, `vorruk` (art and
  sheets exist; they fight as the plain boss). Concepts: `TOWER_DEFENSE_BOSS_CONCEPTS.md`.
- The boss closes the stage: its group waits until no regular enemy is left, or `timeline.bossWaitMs` (30 s) after its scheduled time.
- Each map names its boss; a campaign stage can replace it with `"boss": "<id>"`.
- Adding a boss: still and animation sheet on R2, name in `tdBosses.json`, placement on a
  stage or map, optional `tuning.bosses[id]` rules plus sim code and glossary text, then
  `npm run test:tower-defense` and a look in the browser.

### The stage timeline (no waves)

There are no waves. A stage, a map's default encounter (Daily Trial) and an Expedition stage each carry one
**timeline** of spawn groups, like Watcher of Realms' `StageWave` rows (`src/game/td/timeline.js`):

```json
"timeline": [
  { "startMs": 3000,  "kind": "grunt", "count": 2, "repeat": 3, "everyMs": 4000 },
  { "startMs": 21000, "kind": "flyer", "count": 2 },
  { "startMs": 40000, "kind": "boss",  "count": 1 }
]
```

- `count` enemies spawn at `startMs`, one every `timeline.spacingMs` (700 ms), alternating between the gates across
  the whole timeline; `repeat` repeats the group every `everyMs`. The stage total is the sum of `count x repeat`.
- The stage starts when the player presses Start (`sim.start()`), runs on simulation time (pause, speed and replays
  stay exact), is won when everything has spawned and nothing is left, and lost when lives reach 0.
- Campaign stages keep their timeline in `tdCampaign.json`; every other map in `tdMaps.json` (`timeline`) or through
  its campaign stage (`timelineForMap`). The Daily Trial and Expedition play that timeline once; there are no run lengths and no Endless.
- Targets follow the WoR chapter table (`tuning.timeline.chapterTargets`: about 11 enemies and 53 s in chapter 1, up
  to 38 enemies, 29 groups and 234 s later), ramping 0.8x to 1.2x inside a chapter. `npm run td:stage-lint` checks
  every stage against them; `npm run td:wor-compare` compares the shape with the WoR analysis.
- Nothing is picked during a battle (Oct 5, 2026): no milestone blessing offers, virtues, virtue pairs or virtue shard.
  Hero skill buffs (Skadi, Plutus, Support `aura` timed attack buff, Atalanta rapid fire) stay.
- Environment phase rules alternate every `timeline.phaseSeconds` (20 s): odd phases, even phases.
- Difficulty tiers: Normal, Heroic (enemy health x2, attack x1.3, Favor x1.3),
  Mythic (x3.2, x1.6, x1.6).
- Mutators (fortified, haste, warded, horde, ironclad, elites) are preset in the Daily Trial and active from the start;
  each raises Favor in proportion to the share of the stage defeated.
- Map and stage health: a map's optional `enemyHp` scales enemy health in open modes; a
  campaign stage's `hpScale` or an Expedition stage's scale replaces it.
- Collection health (R12): in Expedition, enemy health is also multiplied by `mightEnemyScale` (`campaign.js`):
  the strongest 7 pool heroes' Might over the same heroes un-upgraded, to the power `heroMight.enemyHpExponent` (0.6), at most
  `heroMight.enemyHpCap` (4). Campaign stages and the Daily Trial are unaffected.

### Enemy art and motion

Full-body sprites from R2 `td/enemies/sprites/` and animation sheets from
`td/enemies/clips/` (`ENEMY_SPRITE_VERSIONS`, `ENEMY_SHEETS` in `assets.js`); procedural
walk, swing, hurt and death motion when a kind has no sheet (`animateEnemy` in `render.js`).
Reduced motion or `?anim=off` turns motion off. Versioning, the PixelLab clip workflow and
build scripts: `docs/td-asset-pipeline.md` and section 15.

Lerna (`boss-lerna-v1`) plays the remade sheet `boss-lerna-v1b` (October 6, 2026): her four clawed legs lift one after the
other (standard ~110 px frames; not on R2 yet).

Lilith (`boss-lilith-v4`) plays the remade sheet `boss-lilith-v4b` (October 6, 2026; `ENEMY_SHEET_REMAKES`
in `assets.js`): her taloned feet step one after the other. Unlike the other ~100 px sheets it is
built sharp (`TD_CLIP_TARGET=160 python3 scripts/td-warp-anim.py ...`, frames ~196 px, ~340 KB),
because she used to keep the static 256 px still. The PixelLab frames came with a flat grey
background (132,130,128 / 126,126,125) that had to be keyed out before packing. Not on R2 yet.

## 9. Battle economy

- **Placement points replace in-battle gold (October 5, 2026).** There is no gold in a run:
  no kill rewards, clear bonus or interest. A run starts with `run.startingPlacement` (30)
  points and gains `run.placementPerSecond` (1) per second of battle time (while the stage runs). Gold only exists outside the battle, for hero levels and stars.
  `sim.placement` is the counter; `addPlacement()` pays extra points and tracks
  `totalPlacementEarned` / `stageStats.placementEarned`; `totalPlacementSpent` tracks spending.
- Standard run (Daily Trial, Expedition stage): 25 lives (5 shown), deploy cap 7. Each hero has a placement cost (`cost` in
  `gameBalance.json`, 11 for the cheapest recruits up to 25 for the strongest; tuned by hand,
  `build-game-balance.mjs` keeps an existing cost). Other sources of placement: the Soul Reaper boon (`placement` 3 per
  10 kills), awakened Plutus Fortune Shower (+3), Favor nodes (`startingPlacement`, `placementRate`) and the
  Necropolis / Autumn environments (`placementRate` x1.2 / x1.15).
- Placement points buy two things:
  - **Deploy** a hero for its placement cost (`sim.deployCost()`): the hero's cost minus the
    global Master Smith discount (3% per level) and the class Swift Muster discount (10%),
    added together, capped at 50%, minimum 1. A fallen hero is redeployed the same way
    (`blocking.redeployCostFactor`).
  - **Relocate** a deployed hero at any time (`sim.relocationInfo()` / `relocate()`): free by
    default (`run.relocationCost` 0; a share of the deploy cost if set), then `run.relocationCooldownSeconds` (8) before
    that hero can move again, minus the class Divine
    Rite discount. It must end on an empty tile of the hero's slot type. The hero keeps its entity
    id, health, ultimate charge and cooldowns. `game.relocations` counts moves.
- **Sell** works anytime and refunds the full placement cost paid (`run.sellRefund` 1).
- No battle ranks, focus, class paths, Awakening or training. A placed hero uses its
  collection stats (`collectionHeroes()`), times Favor hero health,
  class Apotheosis +15% attack and health, Expedition veterans +10%.
- Expedition relics (rare / epic boons) stay; the run-end shard pays Favor only (the Placement shard went with Free Play). Virtue blessings are gone.

## 10. Battlefields (`tdMaps.json`)

### The maps today

83 boards: 82 campaign stage maps, each with its own layout, plus the dev-only `proto-board`.
Ids, names, themes, art, music and bosses are those of the maps they replaced.

| Group | Board | Gates |
|---|---|---|
| Chapter 1 stages 1-1 to 1-9 | 8 x 4 | 1; 2 on 1-7 and 1-9 |
| Chapter finales (1-10, 2-6, ..., 13-6) | 10 x 5 | 2 |
| Every other stage | 9 x 5 | 1; 2 on stage 3 of chapters 2-13 |

Open battlefields (maps without `campaignOnly`, used by the Daily Trial and Expedition): `moonlit-pass`, `verdant-crossing`,
`sunscar-ruins`, `sunscar-basin` and six `jungle-*` maps. Each carries an `enemyHp` for open
modes (0.5 Heart Temple to 1.25 Verdant Crossing), set so bot squads win about 7-9 of 12
runs. `campaignOnly: true` keeps a map out of the Daily Trial and Expedition
pools. `prototype: true` maps (only `proto-board`) are dev-only. `npm run td:board -- --current` draws every map on one page for review.

### The map record

Each map: identity (`id`, `name`, `theme`, `art`, `music`, `boss`, flags such as
`campaignOnly`, optional `enemyHp`), geometry (`spawn` + `path` or `lanes`, `base`, `grid`),
derived tiles (`roadSlots`, `platformSlots`, `rings`) and provenance (`recipe`,
`geometryHash`). Contract (`validateMap`):

- Every path begins exactly at its gate and ends exactly at the base; segments are
  horizontal or vertical, at least 60 px, without self-intersection.
- Several lanes share their final segment. They may differ in length: targeting ranks
  enemies by distance still to go to the base (`progress()` in `sim.js`), so an enemy on a
  short lane is never treated as further behind than one on a long lane.
- Boards need at least 6 road and 8 platform tiles (classic maps 15 and 20).
- Committed tiles must equal `buildGrid(map)`.

### Board generator `board-v1` (`map-generator-board.js`)

`generateBoardMap(recipe, identity)` builds one deterministic board from
`{ generator: "board-v1", ruleset: 1, seed, size: "8x4" | "9x5" | "10x5", gates: 1 | 2 | 3,
entry: ["left", "top", "bottom"] }`:

- Gates on the left edge or the left half of the top or bottom edge; the first step goes
  straight into the board. The base sits in the two right-hand columns.
- The road is one tile wide: two road tiles side by side are always consecutive on a lane,
  and a lane reaches the cell next to its end only to step into it.
- Two gates: a tail from a junction to the base with at least one corner, then two branches
  of exactly the same length from the gates to the junction, entering it from different
  sides.
- Three gates: two merge points. Gates A and B meet at junction J1, a middle road runs
  J1 -> J2, gate C joins at J2, and a tail with a corner runs J2 -> base. Each branch walks
  a length range from its gate (straight distance + 1 to + 5 tiles), so the three lanes
  usually differ in length; each junction is entered from three different sides, and no gate
  sits next to another lane. About one seed in eight succeeds; the CLI tries more seeds.
- Platform blocks (2 x 2, row of 3, L, pair, single) beside the road, never touching each
  other edge to edge; every lane passes at least two blocks, and at least one road tile has
  three platform tiles around it (a choke point). Tile counts per size: 8-12, 10-15, 12-17.
- Special tiles: high ground and cursed on platform tiles, a shrine on a road tile.
- Lane length in tiles: 8-13, 10-17, 11-19 per size; two gates may run two tiles longer,
  three gates four.
- The result passes `validateMap`; `geometryHash` is FNV-1a over the geometry.

**Uniqueness** (`layoutConflict(a, b)`): two maps of the same size share a layout when their
road, platform, gate and base cells are identical, or more than 70% of their road tiles
match, in any of the four symmetries (as is, mirrored left-right, mirrored top-bottom, half
turn). `test-td-map-generator.mjs` fails when two maps in `tdMaps.json` share a layout.
Recipes are generated without knowledge of other maps; a tool that needs a unique map skips
to the next seed, so every map regenerates from its recipe alone.

### Map preview contract

Every preview consumes the same map record as combat. The Campaign
stage drawer uses `mapPreviewModel(map)` and draw terrain, route strokes, gates and base as
light SVG. Do not maintain separate thumbnails.

### Themes and environments

A map is a theme (background art, gate and base sprites, palette, decorations; `map-scene.js`
`MAP_SCENES`, keyed by `art`) plus a board on top; `map-scene.js` draws the road at the board's
cell width, so any theme takes any board. Chapters 4-13 each have an environment
(`tdEnvironments.json`, `environments.js`) with one gameplay rule:

| Environment | Rule |
|---|---|
| Frostbound | Enemies 12% slower; heroes attack 8% slower except on shrine tiles |
| Ashen Forge | Road heroes +15% damage, -20% healing received |
| Stormpeak | Flyers 20% slower; platform heroes reach one step less unless on high ground |
| Tidal Ruins | Enemies 15% slower for 20 s, then 10% faster for 20 s, repeating |
| Mycelium Hollow | Heroes +25% healing received; enemies +10% health |
| Crystal Vault | Magical heroes +15% damage; physical heroes +10% attack speed |
| Haunted Necropolis | Placement regrows 20% faster; heroes -15% healing received |
| Autumn Sanctuary | Placement regrows 15% faster; road heroes charge ultimates 15% faster |
| Celestial Observatory | Ultimates charge 20% faster for 20 s, then heroes attack 10% faster for 20 s, repeating |
| Clockwork Citadel | Heroes attack 15% faster; enemies move 10% faster |

### Classic maps and legacy generators

Before October 1, 2026 battlefields were long winding routes with a row of tiles on each side
and circular range (`orthogonal-v1`, `lattice-v2`, hand-authored maps). Their code stays for
history and tests: the rule tests in `test-td-sim.mjs`, `test-td-difficulty.mjs`,
`test-td-favor.mjs` and `test-td-environments.mjs` run on the pre-board versions of four maps
(`scripts/fixtures/td-classic-maps.json`), because they check rules that need the circle
geometry. No game mode uses classic maps.

## 11. Game modes

| Mode | Rules | Source |
|---|---|---|
| Campaign | 13 chapters, 82 authored stages, squad of up to 6 owned heroes, stage lives and `hpScale`, first-clear rewards (replays pay 25%), campaign hero upgrades apply. **Heroic:** once a chapter is cleared, each of its stages can be played on the Heroic tier (2x enemy health, 1.3x attack); the first Heroic clear pays the stage's first-clear Divine Seals again (`heroic.sealShare` 1, at least `minSeals` 50), and every Heroic clear, repeats included, pays `heroic.currencyShare` (0.5) of the stage's Gold and Hero XP; no laurels or milestones (`heroicUnlocked`, `heroicRewards`, save version 9 `heroic`) | `campaign.js`, `tdCampaign.json` |
| Daily Trial | One UTC-day seed: map, allowed heroes, 2 mutators, goal: defeat 60% of the stage's enemies (`DAILY.goalShare`). One stage at Normal, no blessings or boosts; +15 Divine Seals for the goal, plus Gold and Hero XP per enemy defeated (`collectionReward`, 2 Gold + 1 Hero XP, up to 120) | `daily.js` |
| Expedition | Chain of stages (each plays its battlefield's timeline) on 3 random open maps with rising health; starts with 3 random owned heroes; camp after each win (hero, relic or veteran: veterans get +10% attack and health for the rest of the expedition, `heroBonuses`, save field `veterans`); lives carry over; Divine Blessings apply; +60 Divine Seals on completion | `expedition.js` |

Restricted rosters (Campaign squad, Daily, Expedition) also cap `deployCap()`.

**One hero collection:** heroes are owned and upgraded through the campaign (save key
`campaign`), and every mode except the Daily Trial uses the owned heroes (`ownedHeroes()`).
Collection upgrades (levels, stars, evolution, skills, reach steps; `collectionHeroes()`) are
global stats: they apply in every mode, the Daily Trial included (unowned trial heroes play
at base stats). `session.ts` builds the hero list once per battle. Divine Blessings apply in
Expedition only.

**Free Play removed (October 2026).** The game has Campaign, Daily Trial and Expedition. The Free
Play home entry, the battlefield and difficulty screens, the per-map Challenges, the Placement shard
and the two daily quests tied to them (Clear a Challenge, Defeat 40 enemies in Free Play) are gone;
the quest list has eight tasks (110 activity, the bar pays up to 100). Old saves still load: the
legacy fields `bestScore`, `bestDefeated`, `mapBests`, `mapTop` and `nextRunBoost` are kept but never
written, `challenges` and a `free` home mode are dropped on load.

**Campaign chapters:** 1 The Road to the Crossing (10 stages), 2 The Sunscar March,
3 The Emerald Deep, 4 The Frozen Covenant, 5 The Cinder Oath, 6 The Thunder Stair,
7 The Drowned Crown, 8 The Spore Lanterns, 9 The Shattered Prism, 10 The Silent Procession,
11 The Last Harvest, 12 The Astral Meridian, 13 The Brass Reckoning (6 stages each). Starters:
`gaia`, `fenrir`, `vidar`, `boreas`, `atalanta`, `asclepius`; stage rewards add heroes.

**Campaign difficulty on boards:** each stage's `hpScale` is tuned with
`node scripts/td-board-tune.mjs` against the campaign viability setup (heroes owned by then,
levelled with the chapter's first-clear currencies, up to 35 sampled squads): target bot win
rate 90% on 1-1, 65% on other Chapter 1 stages, 50% on regular stages, 35% on finales.
`test-td-campaign.mjs` keeps every stage above a 20% floor.

`npm run td:campaign-load` adds a deterministic evidence layer inspired by the external Watcher of
Realms campaign analysis. It runs authored timelines through the simulator's own shaping, gates,
spawn spacing, environment modifiers, stage scaling and boss overrides, then reports effective
count, spawn pressure, HP, attack and resistance mix. `--chapter=<n>` filters the Markdown output;
`--csv=<path>` writes the stable full table. Summoned children are named separately because their
count depends on combat state. Review flags are not failures and the command never edits Campaign
data. `td-board-tune.mjs`, Campaign simulation and owner review remain responsible for actual
changes to `hpScale`, composition, counts, timing, resistances or lives.

## 12. Campaign and collection screens

### Navigation

Play on the home screen (Campaign selected) opens the stage list; Heroes and Summon sit on the
home dock. Back returns home.

- **Campaign stages:** one row of full-height stage cards for the current chapter (swiped
  sideways, scrolled to the next stage), the rating track on one line below, chapter tabs.
  Cleared cards fade with a green check, the next stage glows with a gold play badge, locked
  ones go grey. Tapping a stage opens a drawer: stage id and name, the board preview, about
  text, facts (battlefield, enemies, lives, boss, best), goals, first-clear and replay rewards,
  recommended Might and the last squad's Might, and "Choose squad" / "Replay stage".
- **Squad selection:** roster top (two rows of 50 x 75 art cards scrolling sideways, class
  icon, check when picked, "Lv N"), lineup bottom (6 slots of 84 x 84, gold cost under each;
  tap or drag to remove, drag to swap), one hint line (or a flyer warning when the stage has
  flyers and the squad no Mage or Archer), Might against the recommended Might, and Start.
  The screen fits the 844 x 390 menu frame without scrolling; roster top, slots bottom is fixed.

### Heroes screen

Four columns inside the menu frame: a narrow scrollable roster of portrait cards (face
close-up, class icon, Evolution badge, level and stars; locked heroes greyed with their unlock
source; sorted by Might; badge layout shared with the squad slots and roster: mythology groups
stacked down the left edge (Lord crown last), class top right as a white glyph on a translucent
disc, Evolution badge below it), the selected hero's art with name, class, role, Might, stars and
copies, a 250 px upgrade flyout with a pinned button, and a vertical tab rail:

- **Level:** level / cap, the current 10-level band, attack and health now and next, deploy
  cost, Level up.
- **Stars:** stars, the reach steps they give ("Reach: +1 step, +2 at 5 stars"), material
  slots for duplicate copies, attack and health preview, Star up.
- **Evolution:** five tiers with their bonus, two material slots (a copy or 150 Seal Dust),
  Evolve, and "1 copy -> 30 Dust".
- **Skills:** ultimate and class passives, each upgraded separately.

A red dot on a roster card means a level-up is affordable or the hero has a copy for Evolution.

### Hero upgrades outside battle (campaign only)

Numbers in `tdCampaign.json` (`heroLevels`, `heroStars`, `heroEvolution`, `heroSkillLevels`)
and `tdSummon.json` (`dust`). Every upgrade is chosen by the player.

- **Levels 1-60:** cost Gold 100 + 50 per level and Hero XP 50 + 25 per level; gain per
  level by band +6% (2-10), +3%, +2%, +1.5%, +1.5%, +1% (Lv 60 = +144% attack and health).
  Stars cap the level: 0-5 stars -> 10 / 20 / 30 / 40 / 50 / 60.
- **Stars 0-5:** 1 / 1 / 2 / 3 / 4 duplicate copies plus 100 / 200 / 400 / 600 / 800 Gold;
  +10% attack and health per star; reach steps at 3 and 5 stars.
- **Evolution I-V:** a copy or 150 Seal Dust per tier: ultimate +20%, crit +10%, ultimate
  cooldown -15%, ultimate +25%, and V: the ultimate starts awakened.
- **Skills:** ultimate and class passives, the final rank costs 150 Seal Dust.
- **Might:** (base attack + health) x level scale x star scale x (1 + 0.06 x evolution tier);
  sorts the roster and is compared with each stage's recommended Might.

### Stage rating and chapter rewards

- Every cleared stage has a rating of 0-3 laurels: a clear, keeping at least 50% of the
  stage's shown lives (rounded up; `campaign.laurels.lifeUnit` 5), and the **stage goal**
  (October 6, 2026, A1 of the gameplay ideas). Every stage carries a `goal` in `tdCampaign.json`
  that asks a different question of the squad: `noClass` (win without a Mage, Archer, ...),
  `maxHeroes` (at most 4 or 5 heroes fielded, sold and fallen ones included), `noFall` (no hero
  falls) and `noLeakKind` (no flyer or runner reaches the base). The run reports `fieldedIds` and
  `stageStats` (`runFacts` in `campaign.js`); a met goal is saved in the cleared entry (`goal`)
  and is never lost. The goal laurel is independent of the lives kept; the goals are first
  guesses (Chapter 1 hand-picked, later chapters rotated and flyer-heavy stages asking for no
  leaking flyer), to be tuned from playtests. Saves from before goals keep a laurel they earned by
  keeping 90% of the lives. The stage drawer lists all three goals; the Stage Clear screen fills
  only the laurels that were earned.
- **Stage rules** (October 6, 2026, A2 of the gameplay ideas): 53 of the 82 stages carry a `rule`
  naming an entry of `tdStageRules.json` (Nightfall, Forced March, Hardened Hides, Lean Supplies,
  Quickened, Blessed Ground, Rich Camp). A rule is a bundle of the same multipliers a chapter
  environment uses (`mods`, `modsMultiplier` in `environments.js`) and stacks with it in
  `sim.environment()`. The first three stages and every third stage stay plain. The rule shows in
  the stage drawer and, after the environment rule, in the battle chip. Values are first guesses;
  no recommended Might was re-measured.
- Chapter milestones at 10 / 20 / 30 rating points pay Gold and Hero XP / Divine Seals /
  Divine Seals and Seal Dust, once (`payMilestones`).

### Summoning

`tdSummon.json`: banner "Ember at the Crossing", 60 Divine Seals per summon, x1 or x10 (600),
one featured hero for 14 days (rotation `surtr`, `nott`, `hephaestus`, `hecate`; weight x2),
rarity weights lord 0.5 / legendary 1 / epic 2 / common 10 (retuned October 6, 2026, owner: legendaries and the
Lord came too often; the old 1.8 / 6 / 4 / 10 gave 16% legendary and 0.8% Lord per summon. Now about 3.8% legendary,
20% epic, 76% common and 0.3% for one Lord with the current pool; the weight is per hero, so a second Lord adds
another 0.3%; legendary = tiers S/A, epic = B/C,
common = D and all recruits), new-hero pity on x10 (a full x10 without a new hero replaces the
last duplicate with an unowned hero). Pool: every hero the player owns or can summon; owned
heroes return as spare copies. The banner shows per-rarity rates computed by `summonRates()`
from the same weights `summonMany()` uses.

**Availability (hand-authored).** `banner.availability` in `tdSummon.json` is a list of
`{ hero, from, until }` (ISO dates, `null` = open on that side). A listed hero is in the banner's
pool only inside its window; a hero that is not listed is always in the pool. `bannerPool`,
`summonRates`, `featuredChance`, `canSummon`, `multiSummonCount` and `summonMany` all take an
optional `now`, so the shown rates and the real draw agree. Today only Isis is listed, with an
open window, as the template to extend.

**Summon screen** (`.td-sm`, markup in `TdLobby.astro`, logic `renderSummon` in `page/campaign.ts`):
left, a tab per banner (`summonCfg.banners`, the tab shows the time until the featured hero changes)
and the Seal Dust exchange; centre, the featured hero with name plate, class, and the Summon x1 and
x10 buttons with their price; right, the featured rotation (the current hero and the
coming ones with "in Nd", from `featuredRotation`) and an info button whose popover holds the chances
(featured rate, rarity chips Lord / Legendary / Epic / Common), pool, pity and where Seals come from.
Currencies are not repeated here (the header shows them). The centre uses the hero's splash art
(`{file}-splash-720.webp`, `scripts/td-hero-splash.mjs`), falling back to the 240 px card for heroes
without a master (the 12 recruits). A second banner in
`banners` appears as a new tab with no code change.

Divine Seal sources: campaign first clears and a quarter on replays, chapter milestones, the
Daily Trial goal (+15) and a finished Expedition (+60). Seal Dust: 1 spare copy -> 30 dust;
2 dust -> 1 seal; 100 dust -> 1 copy of an owned hero.

The Summon screen centres on the featured hero (art, rotation time, seal balance, Summon x1 /
x10, skip-animation toggle, odds popover, pool, Seal Dust panel). The reveal
(`page/summon-reveal.ts`) deals cards face down with a rarity glow, flips on tap, and offers
Summon again or Close.

### Currencies and wallet

Currencies show as icon + value (`currency-icons.js`, item icons on R2 `td/icons/items/`;
Favor uses a star glyph); names are in tooltips and labels. One global wallet button on every
menu screen (`page/wallet.ts`) shows the currencies that matter on the open screen and opens
an inventory with where each is earned and spent. Debug tools (the campaign debug panel that
adds currencies, and the battle debug panel with difficulty knobs) are always available in
local dev; in production they appear only with `?debug=1` in the URL. Every build ships their
markup (`data-td-debug-gate`); the page removes it otherwise. Runs changed by debug knobs are
not recorded.

### Results screen

The result covers the play screen. A won stage plays three scenes (Victory with laurels and
MVP, Hero contribution, Rewards), 2 s each, then shows the footer (Back to Camp, Stats, Spend
Favor, Continue, Retry). Losses and Endless runs open the detailed report. After a campaign
stage the footer offers Retry, Next stage or Change squad, and Campaign.

Hero portrait backdrops: every hero portrait `<img>` carries `data-rarity` (from the hero's `rarity`); `td.css` paints common green, epic purple, legendary gold via `--rarity-*-bg` tokens in `tokens.css`. New portrait templates must set the attribute.

## 13. Meta progression and persistence

### Meta progression

- **Favor:** earned per stage (`favorEarn.perStage` x the share of enemies defeated), a perfect-run bonus, boss
  kill and lives left, scaled by tier and mutators; spent on the Divine Blessings trunk. Allowed anytime; applies on the next run.
- **Insight:** per-class currency for the class branches. The six Mythic `*_reach` nodes no
  longer raise range; they keep their ids and bought levels but give Iron Hide (Tank guard
  +2% per level), Keen Edge (Warrior crit +2%), Killer Instinct (Assassin crit +3%), Focused
  Mind (Mage ultimate charge +3%), Steady Aim (Archer crit +2%) and Swift Grace (Support
  ultimate charge +3%), so saves need no refund. Since R4 the class Divine I / IV / V nodes
  keep their ids too: `*_ascension` is Swift Muster (deploy 10% cheaper), `*_rite` Divine
  Rite (relocation 30% cheaper), `*_apotheosis` Apotheosis (+15% attack and health, always
  on); trunk `odin_dominion` Master Smith lowers deployment costs 3% per level.
- **Favor shard** (a run that defeats half the stage): extra Favor, granted with the run's Favor.
- **Hero collection:** see section 11.

### Persistence

`localStorage` key `td:v1`, one JSON blob sanitized on load (`save.ts`): bad fields are
dropped, a corrupt blob starts fresh, unknown hero ids are removed, ids from before the mythic
rename are renamed first (`LEGACY_HERO_IDS`).

Fields: `bestScore`, `bestWave`, `lastTeam`, `perfectDefense`, `favor`, `favLevels`,
`insight`, `resetSpent`, `refundNotice`, `treeVersion`, `repriceNotice`, `mapBests`,
`mapTop`, `nextRunBoost`, `daily`, `expedition`, `expeditionBest`, `campaign`
(the hero collection), `ui` (`homeMode`).

The `campaign` section is versioned (`CAMPAIGN_SAVE_VERSION` 8): `owned`, `cleared`,
`lastSquad`, `currencies` (Gold, Hero XP, Divine Seals, Seal Dust), `levels`, `summons`,
`copies`, `stars`, `evolution`, `skillLevels`, `milestones`. Older versions migrate on load.
The board migration changed no save field: map ids stayed, and the three new maps belong to
stages whose progress is stored by stage id.

Legacy per-map records key as `mapId`, `mapId@long`, `mapId#heroic`, `mapId@long#mythic` (read-only, see above).
Export / import: save code (`TD1:` prefix) or file. Audio volume and mute have their own keys.

## 14. Content checklists

Content is not JSON-only. Before shipping, walk the matching list.

**New hero**
1. `npm run build:game-balance -- --propose=<id>`; compare with the class peers.
2. Add the id to `tuning.roster`, run `npm run build:game-balance`, check that one row is
   added and none changes.
3. `heroSkills.<id>` in the tuning; names in `tdSkinMythic.json`.
4. Art and sound on R2 (new file names), `tdAudioLevels.json`, effects in `hero-fx.js`.
5. Acquisition: summon pool by default; a stage-reward hero also goes into a stage's rewards.
6. Its class pattern comes from `tuning.board.patterns`; a signature pattern is one entry in
   `tuning.board.heroPatterns` (a new shape is one line in `PATTERNS` plus its ladder steps).
7. `npm run test:tower-defense`, `npm run test:td-balance`, `npm run td:upgrade-sweep`.

**New campaign stage or chapter**
1. Generate the stage's own board (below); every stage has its own map.
2. Stage in `tdCampaign.json`: `unlockAfter`, `mapId`, lives, `hpScale`, `timeline`, rewards (check with `npm run td:stage-lint`).
3. Tune `hpScale`: `node scripts/td-board-tune.mjs --chapters=<n>` and copy the values.
4. `test-td-campaign.mjs` (floor 20%) and `npm run td:pacing -- --only=campaign`.

**New battlefield (board)**
1. Pick the theme and size; preview candidates with
   `npm run td:board -- --size=9x5 --gates=1 --theme=<theme> --count=24` (page in
   `public/td-local/`, open it through `npm run dev`). Candidates are already unique.
2. Publish the chosen seed into `tdMaps.json` with its identity (the migration script
   `scripts/migrate-td-boards.mjs` shows the pattern), then `node scripts/build-td-grid.mjs`.
3. `npm run td:board -- --check` (recipes regenerate, layouts unique) and
   `npm run test:tower-defense`.
4. Open maps (Daily Trial, Expedition): set `enemyHp` so bot squads win about two thirds of their runs.
5. Look at it in Chromium at phone and desktop size.

**New theme or environment**
1. Art per `map.md`, a `MAP_SCENES` entry in `map-scene.js` (or an environment in
   `tdEnvironments.json`, which registers its scene).
2. An environment rule needs a case in `environmentMultiplier`; a rule about reach belongs in
   `game.patternAt` (as Stormpeak's does).

## 15. Tests and tools

| Command | Covers |
|---|---|
| `npm run test:tower-defense` | Balance file check, UI helpers, favor, difficulty, skin, save, sim (board rules included), daily, expedition, campaign, summon, map generators |
| `node scripts/test-td-lord-isis.mjs` | Isis: line pattern, beam direction and cap, Lord bonuses (part of `test:tower-defense`) |
| `npm run test:td-balance` | Bot squads on every map; class matrix |
| `npm run td:board -- --size --gates --theme --count` | Unique board candidates as an HTML atlas |
| `npm run td:board -- --current` / `--check` | Every board on one page / recipes regenerate and layouts are unique |
| `node scripts/td-board-tune.mjs --chapters=1,2` | Campaign `hpScale` search against bot win-rate targets (JSON to stdout) |
| `npm run td:campaign-load -- [--chapter=<n>] [--csv=<path>]` | Effective Campaign stage load from simulator enemy shaping, gates, stats and spawn pressure; evidence only, no data writes |
| `node scripts/migrate-td-boards.mjs [--dry]` | The one-time migration of every map to boards (reference for publishing) |
| `npm run td:stage-lint -- [--chapter=<n>] [--stage=<id>]` | Pacing lint: enemies, groups, spawn window and mix per stage against the WoR chapter table; report only |
| `npm run td:sweep`, `td:classes`, `td:pacing`, `td:economy`, `td:upgrade-sweep`, `td:progression` | Difficulty, class, pacing, gold and summon reports |
| `npm run td:maps` | Map geometry metrics and validation |
| `npm run td:generate-map -- --check` | Legacy generators (classic maps) |
| `npm run build:game-balance` / `node scripts/build-td-grid.mjs` / `node scripts/td-audio-levels.mjs` | Regenerate hero stats / tiles / audio gains |
| Asset scripts | `build-td-enemy-sprites.mjs`, `td-pixellab-clips.mjs`, `build-td-enemy-anims.mjs`, `td-hero-assets.mjs`, `upload-to-r2.mjs`; runbook `docs/td-asset-pipeline.md` |

Test fixtures: `scripts/fixtures/td-classic-maps.json` (pre-board maps for rule tests),
`scripts/fixtures/td-legacy-rings.json` (ring positions for those tests).

Invariants worth keeping under test: determinism (same seed, same result), placement paid once
per source, no deadlock with every road tile filled, flyers reach the base past blockers, the
accumulator clamps long tab-away gaps, a loss wins a same-tick tie, every board map is unique
and regenerates from its recipe, a hero's pattern decides its basic-attack reach.

## 16. Open items and known gaps

The order and dependencies of the open work live in
[TOWER_DEFENSE_ROADMAP.md](TOWER_DEFENSE_ROADMAP.md) (steps R1-R11); this list names the gaps.

- **Balance pass pending** for global stats in Expedition and the Daily Trial,
  pantheon bonds, Divine Interventions and Heroic stage difficulty: built with
  first-guess numbers; the owner balances later.
- **Divine Intervention upgrades** (cooldown, area) on the blessing tree are not built.
- **Stage counter and forecast:** the stats row shows `Defeated x/total` (`stageForecast()` in `sim.js`: the timeline's total,
  enemies killed or through the gates, the next groups with their ETA); a summary chip before the start gives the total (the
  HUD no longer shows the incoming chips). There is no auto-start countdown and no Start button: placing the first
  hero begins the stage.
- **Campaign viability check:** `test-td-campaign` prints the bot win rate per stage and notes stages below 20%, but
  no longer fails on it (October 5: the bot has no focus targeting or relocation and underrates a human player).
- **Bosses:** Lerna, Kraghorn and Vorruk have no rules yet; Ochenta's numbers are untested.

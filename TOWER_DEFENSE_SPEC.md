# Tower Defense Minigame - Spec and Task Split

Status: proposal, not implemented. Reference: https://fastidious.gg/games/tower-defense

## 1. Goal

Playable browser tower defense on `/games/tower-defense`, using the real hero roster,
real hero stats, and real boss art from this project. Fully client side, works on the
static Cloudflare build, no backend.

### Non-goals (MVP)

- No accounts, no server leaderboard, no replays, no live channels (fastidious.gg needs
  Laravel for those; we have no runtime server in production).
- No custom map editor.
- No per-hero hand-authored skill scripting. Abilities are class archetypes in MVP.
- No i18n. English only. Route is not localized.

## 2. Data policy

Invented tuning numbers are allowed here. They live in exactly two files and never
touch player-facing data:

- `src/data/gameBalance.tuning.json` - hand-authored knobs (class ranges, cost curve,
  ability archetypes, enemy stats). Committed, human edited.
- `src/data/gameBalance.json` - generated, derived from `all_heroes_db.json` plus the
  tuning file. Regenerated with `npm run build:game-balance`.

Hard rules:
- Never write game numbers back into `src/data/heroes/*.json`, `hero-ratings.json`,
  `bosses.json`, or any CN block.
- `npm run db:merge` must stay unaware of these files.
- The page must not present any invented number as a game fact. Add a one-line
  disclaimer in the page footer: "Minigame balance values are made up for fun and do
  not reflect in-game numbers."

## 3. What the reference game does

Confirmed from the live page and its bundles:

- Canvas `768x480`, hidden below the `sm` breakpoint (desktop only).
- React + Inertia + Laravel. TD page is a thin wrapper passing `mode: "defense"` into a
  shared `game-page` component, so TD is one mode of a game platform.
- Shared modules: `sim`, `replay`, `combat-stats`, `wave-preview`, `game-call-popups`,
  `echo` (websockets), custom maps gated behind sign-in.
- 20 waves, 25 lives, 260 starting gold, hero cost 90-150.
- Pre-pick 5 heroes, then buy more mid-run from kill gold.
- Melee block on road tiles, ranged sit on platforms. Placement is class gated.
- Rotate facing with `R`.
- Skills auto-charge and auto-cast at full.
- Wave 4 flyers, wave 5 enemy archers, boss every 5th wave.
- 5 maps: Serpentine, Ramparts, Crossroads, Pincer, Sand Road.

We copy the loop, not the platform.

## 4. Roster (locked: 20 heroes)

MVP roster is the Divine Throne subset, hand-trimmed to 20. Source of the pool:
`src/data/divine-throne.json` -> `heroes` (36 entries).

All 36 were checked against `all_heroes_db.json`: every one is released, has non-null
`stats`, and has a rating. Three (`dionysus`, `ullr`, `yanluo`) lack **both**
`baseAttackRate` and `bossUltimatesPer90s`, so they are excluded from the 20 rather than
needing fallbacks.

The locked 20, verified complete (all Legendary, all rated, all have `baseAttackRate`
and `bossUltimatesPer90s`):

| Class | Slot | Heroes |
|---|---|---|
| Tank | road | `nuwa` (S), `prometheus` (A), `momus` (A+), `demeter` (D) |
| Warrior | road | `poseidon` (S+), `amunra` (S), `set` (A+), `jormungandr` (B) |
| Assassin | road | `nyx` (S), `bastet` (A+), `horus` (D) |
| Mage | platform | `zeus` (S+), `phoenix` (A+), `fengyi` (D) |
| Archer | platform | `diana` (A), `artemis` (D), `medusa` (D) |
| Support | platform | `caishen` (S+), `yuelao` (S), `freya` (D) |

11 road blockers, 9 platform units. Tier spread S+ x3, S x4, A+ x4, A x2, B x1, D x6, so
the cost curve has real range. The list is a literal array in
`gameBalance.tuning.json` under `roster` - no filtering logic, no dev/prod difference,
no unreleased-hero edge cases.

Because all 20 are Legendary, the `rarity` term in the cost formula is dead. Cost is
derived from in-game value instead (see section 5).

### Full-roster stat survey (why the formulas look the way they do)

Measured across all 74 non-Common heroes with stats:

| Stat | Legendary | Epic | Usable? |
|---|---|---|---|
| `hp` | 1,615,947 - 3,366,556 | 1,157,784 - 2,962,569 | yes |
| `atk` | 150,629 - 304,336 | 120,920 - 159,838 | yes |
| `armor` / `magicRes` | 10 - 79,503 (median 37,031) | same field | yes |
| `critRate` | 0 - 10 | 0 - 10 | yes, already a percent |
| `atkSpdBonus` | all 0 | all 0 | **no, dead field** |
| `cooldownHaste` | all 0 | all 0 | **no, dead field** |
| `baseAttackRate` | 0.364 - 4.956, median 0.787 | same | yes, 11 of 74 missing |
| `bossUltimatesPer90s` | 2 - 10, median 4 | same | yes, real ult cadence |

Two useful finds:
- `bossUltimatesPer90s` gives a **real** ultimate cooldown: `90 / bossUltimatesPer90s`
  = 9s to 45s. No invention needed for cast cadence.
- `atkSpdBonus` and `cooldownHaste` are zero for every hero, so attack rate must come
  from `baseAttackRate` only.

### Data quality issue found (separate from this project)

`skills[0].damageType` on the playable roster is inconsistent:
`Physical` 29, `Magical` 20, `""` 20, `magical` 1, `Magic` 1, `Support` 1, `null` 1,
`undefined` 1. The sim needs a normalizer (lowercase, map `magic` -> `magical`, fall
back to a class default). This is worth fixing in the real hero JSONs too, since
CLAUDE.md requires `damageType` on all 4 skills - tracked separately, not part of this
task list.

## 5. Balance math

All formulas live in `scripts/build-game-balance.mjs`. `rank(x)` = percentile rank in
`[0,1]` **across the 20-hero roster only** (percentile, not min-max, so single outliers
like `baseAttackRate: 4.956` do not squash everyone else). Ranking within the 20 keeps
the playable spread wide - ranking within all 74 would bunch the picked heroes together.

Prototyped and verified on the real 20 (see the output table below), not hypothetical.

```
aps          = clamp(hero.baseAttackRate, 0.5, 2.2)
rawDps       = hero.stats.atk * hero.baseAttackRate

gameDps      = lerp(18, 55, rank(rawDps))        // 3x band, keeps tiers readable
gameAtk      = round(gameDps / aps)

gameHp       = round(lerp(340, 880, rank(hero.stats.hp)))
gameArmor    = round(lerp(30, 230, rank(hero.stats.armor)))
gameMagicRes = round(lerp(30, 230, rank(hero.stats.magicRes)))
critChance   = hero.stats.critRate / 100                      // already a percent
ultCooldown  = 90 / hero.bossUltimatesPer90s                  // 9s..45s, real cadence
ultPower     = tierUltPower[rating.overall]                   // tier drives ULT, not cost
```

Bands are `30..230` and `340..880`, not `0..260` and `300..900`, on purpose. Percentile
rank puts the min at exactly `0` and the max at exactly `1`, so open-ended bands produced
degenerate extremes: `medusa` at `armor: 0` (zero mitigation) and `nuwa` at `armor: 260`
(the 50% mitigation wall). Compressed bands give a clean `10%..47%` mitigation range.

Damage resolution (game units, `K = 260`):

```
mitigation = res / (res + K)          // res = armor for physical, magicRes for magical
                                      // roster range 10%..47%, median ~35%
dmg = atk * (1 - mitigation) * (crit ? 1.5 : 1.0)
true damage skips mitigation entirely
```

Invented per class (`gameBalance.tuning.json`):

| Class | Slot | Range (px) | Ability archetype |
|---|---|---|---|
| Tank | road (blocker) | 60 | `taunt` - slows enemies in radius |
| Warrior | road (blocker) | 70 | `cleave` - AoE around self |
| Assassin | road (blocker) | 90 | `execute` - bonus damage below 35% hp |
| Mage | platform | 160 | `nuke` - AoE burst at densest cluster |
| Support | platform | 150 | `aura` - `+25%` atk to allies in radius, or `heal` if hero has `TEAM_HEAL` in `synergies` |
| Archer | platform | 190 | `volley` - 3 rapid single-target shots |

Ability archetype is picked from `class`, refined by `synergies` tags that already exist
in `tags.json` (`TEAM_HEAL`, `TEAM_SHIELD`, `ENEMY_TAUNT`, `TEAM_BUFF`). Skill prose is
never parsed.

### Cost curve, and the trap it avoids

The obvious design - price heroes by their tier rating - was prototyped first and is
**broken**. Tier rating reflects real-game strength, which comes from skill effects, not
from raw `atk` and `baseAttackRate`. So pricing by tier while computing damage from stats
made cost and power uncorrelated, and the cheapest heroes came out strictly best:

```
tier-priced prototype, dps per 100 gold:
  artemis (D, 85g)  = 52.9   <- best in game
  poseidon (S+,150g)= 18.7   <- worst in game
```

Every S+ hero was a trap and every D hero was optimal. Discarded.

Cost is instead derived from **in-game value**, weighted by what the slot actually does,
then mapped onto `85..150` gold and rounded to 5:

```
effHp     = hp / (1 - (mitigation(armor) + mitigation(magicRes)) / 2)
ultValue  = (90 / ultCooldown) * ultPower

value_road     = 0.30 * rank(dps) + 0.50 * rank(effHp) + 0.20 * rank(ultValue)
value_platform = 0.65 * rank(dps) + 0.10 * rank(effHp) + 0.25 * rank(ultValue)

cost = round5(lerp(85, 150, rank(value)))
```

Tier rating now feeds `ultPower` instead of cost, which is where real-game strength
actually lives:

```
tierUltPower = { "S+": 1.6, S: 1.45, "A+": 1.3, A: 1.15, B: 1.05, C: 1.0, D: 1.0 }
```

Rating comes from `src/data/ratings/hero-ratings.json` via `withRatings.js`. Range values
like `A~S` take the lower grade. All 20 roster heroes have a rating, so no default is
needed, but keep one (`C`) for safety.

Result: efficiency is roughly flat within a slot type, and the premium heroes trade raw
efficiency for a stronger ultimate. That is a real decision instead of a trap.

```
road, effHp per gold:      12.4 (prometheus) .. 6.4 (bastet)
platform, dps per 100g:    39.1 (artemis)    .. 21.2 (freya)
```

**Consequence to surface in the UI**: cost no longer tracks the tier badge. `demeter` is
D tier but the 3rd most expensive road unit, because she is the second-best wall in game
terms. Players who know the tier list will find that odd, so the hero picker shows the
real tier badge **and** the minigame cost side by side, with the section 2 disclaimer
nearby. Honest, and it is the point of the disclaimer.

### Verified output on the locked 20

Generated by the prototype against live data. These are the expected `gameBalance.json`
values, sorted by cost.

```
id           class    tier slot      cost  atk  aps   dps  hp   arm  mres  effHp  ultCd  ultPwr
phoenix      Mage     A+   platform  150   25   2.2   55   539  72   83    699    15     1.3
amunra       Warrior  S    road      145   35   1.4   49   823  188  219   1466   18     1.45
nyx          Assassin S    road      145   25   2.13  53   738  209  167   1269   15     1.45
nuwa         Tank     S    road      140   30   1.72  51   766  230  230   1444   22.5   1.45
demeter      Tank     D    road      135   39   0.56  22   852  198  198   1501   18     1
zeus         Mage     S+   platform  135   41   1.16  47   624  41   114   801    18     1.6
poseidon     Warrior  S+   road      130   35   0.79  28   653  104  62    858    11.3   1.6
jormungandr  Warrior  B    road      125   26   1.59  41   709  135  125   1063   22.5   1.05
prometheus   Tank     A    road      120   35   0.74  26   880  219  146   1488   45     1.15
bastet       Assassin A+   road      120   26   1.64  43   511  156  104   763    15     1.3
artemis      Archer   D    platform  115   29   1.57  45   454  51   30    524    18     1
momus        Tank     A+   road      110   38   0.52  20   795  167  198   1351   22.5   1.3
caishen      Support  S+   platform  110   32   0.94  30   482  177  188   820    9      1.6
set          Warrior  A+   road      105   36   0.88  32   653  114  41    838    22.5   1.3
diana        Archer   A    platform  100   37   0.9   34   539  62   72    678    18     1.15
medusa       Archer   D    platform  100   34   1.16  39   340  30   51    392    18     1
fengyi       Mage     D    platform  95    40   0.93  37   368  83   93    492    18     1
horus        Assassin D    road      90    38   0.94  36   425  93   135   609    15     1
yuelao       Support  S    platform  90    47   0.5   24   596  146  177   965    22.5   1.45
freya        Support  D    platform  85    36   0.5   18   397  125  146   603    30     1
```

Sanity checks that pass: no `NaN`, cost spans the full `85..150`, both slot types cover
the range, `prometheus` is the tankiest (effHp 1488, 45s ult), `phoenix` is the glassiest
carry (55 dps, 2.2 aps, 699 effHp), `caishen` has the fastest ult (9s) matching his real
`bossUltimatesPer90s: 10`.

Synergy team bonus: for each `synergies` tag shared by 2+ deployed heroes, all heroes
holding that tag get `+8%` atk, capped at `+24%`. Reuses `src/utils/synergyTags.js`.

## 6. Sim spec

- Fixed step `1/60s`, accumulator loop, decoupled from render. Deterministic.
- Seeded RNG (mulberry32) - same seed plus same inputs equals same run. Enables the
  headless test harness and a later replay feature.
- Internal coordinate space fixed at `960x540`. Canvas is CSS-scaled to fit, so mobile
  gets the same sim, just smaller pixels. No desktop-only cop-out.
- Entities: `enemy`, `hero`, `projectile`, `effect`.
- Enemy pathing: polyline follow with a per-enemy lateral offset so crowds do not stack
  into one pixel. Flyers ignore blockers and cut corners.
- Blocking: a road-slot hero occupies its tile; ground enemies stop at contact range and
  melee it. Blocker death frees the tile and enemies resume.
- Targeting: `first` (furthest along path) by default; `lowest-hp` for `execute` heroes.
- Facing/rotation: `R` on a selected hero. Only affects cone abilities (`cleave`,
  `volley` spread), not basic attacks.

## 7. Maps and waves

`src/data/tdMaps.json` - array of `{ id, name, path: [[x,y],...], roadSlots: [[x,y],...],
platformSlots: [[x,y],...] }` in the `960x540` space. MVP: 2 maps.

`src/data/tdWaves.json` - array of `{ wave, spawns: [{ kind, count, gapMs }], startDelayMs }`.
MVP: 10 waves, boss at 10.

Enemy kinds (invented stats in tuning file): `grunt`, `runner`, `flyer`, `archer`,
`brute`, `boss`. Boss uses a real boss from `src/data/bosses.json` for name and R2 art
(8 available, e.g. `baphomet`), with invented hp/speed. Boss `mechanics[]` text is shown
in a pre-wave warning popup - real text, invented numbers, no conflict.

Run params: **10 waves**, 25 lives, 260 starting gold, pre-pick 5 heroes from the 20, gold
from kills, buy between waves. Boss on wave 10 only (the reference's every-5th-wave boss
does not fit a 10-wave run; wave 5 gets a `brute` pack instead).

Wave schedule, condensed from the reference's 20-wave curve:

| Wave | Introduces |
|---|---|
| 1-2 | `grunt` |
| 3 | `runner` |
| 4 | `flyer` (forces at least one platform unit) |
| 5 | `brute` pack (mini-spike) |
| 6 | `archer` (can kill blockers, forces support or rotation) |
| 7-9 | mixed, rising counts |
| 10 | boss + escort |

## 8. Rendering

- Sprites: `https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev/heroes/thumbs/{id}-96.webp`
  - already on R2 and verified reachable (200 for zeus/athena/nezha). **No new asset
  pipeline needed.** Local fallback `public/heroes/thumbs/` is nearly empty, so preload
  from R2 and cache in an `Image` map.
- Bosses: `bosses.json` already carries absolute R2 `image` URLs.
- Everything else (path, tiles, hp bars, projectiles) is drawn with canvas primitives
  using `tokens.css` colors read via `getComputedStyle` on `:root`, so the game matches
  site theming: `--bg-surface`, `--accent-gold`, `--accent-purple`, `--border-medium`.
- Sprite draw at `48x48` on the `960x540` field. `devicePixelRatio` aware backing store.

## 9. UI

Astro page + one client island. No React - deps are currently `astro` + `express` only
and it stays that way. Follows the `virtue-wizard.astro` pattern exactly: server-render
the shell, ship data via `<script type="application/json">`, one `<script>` module for
logic.

HUD: gold, lives, wave `n/10`, score, speed toggle (`1x`/`2x`), start/pause/restart.
Panels: hero picker (grouped by class, shows **cost + tier badge together** - see the
cost-curve consequence in section 5), selected-hero inspector, between-wave upgrade choice.

Upgrades between waves: 3 random picks drawn from `src/data/virtues.json` 2-piece set
bonuses. Real set names and real bonus text, hand-mapped to a sim effect in the tuning
file (about 12 sets is enough for MVP).

CSS: all new classes go in `src/styles/components.css` under a `td-*` prefix. No inline
styles, no per-page `<style>` block.

Route: `/games/tower-defense`, implemented as `src/pages/games/tower-defense.astro`.
Leaves `/games/` free as a hub if more minigames follow. Public - do **not** add to
`LOCAL_ONLY_ROUTES`.

Nav: new `src/data/nav.ts` entry, `group: "tools"`, `teaser: true`, badge "New".

### Persistence (deliberately the easiest thing that works)

`localStorage` only. One key, one JSON blob, no backend, no Worker, no D1:

```
key:   "td:v1"
value: { bestScore: number, bestWave: number, lastTeam: string[] }
```

Read on mount inside a `try/catch` (private-mode browsers throw on access). On any parse
error or shape mismatch, discard and start fresh - never crash the page for a bad blob.
`lastTeam` entries are validated against the locked 20 and silently dropped if unknown,
so changing the roster later cannot break a returning player.

A shared leaderboard is explicitly out of scope. If it is ever wanted, the natural path is
a Cloudflare Worker plus D1 keyed on a signed score payload - but that needs
anti-tamper thought, and a client-authoritative score endpoint would just be a
cheat-submission form. Not worth it for a minigame.

## 10. Task split

Six tasks, each under the 10-file limit. Each is independently reviewable and the sim
tasks are testable headless before any pixel is drawn.

### T1 - Balance data layer (4 files)
- `src/data/gameBalance.tuning.json` (new, hand-authored)
- `scripts/build-game-balance.mjs` (new)
- `src/data/gameBalance.json` (generated)
- `package.json` (add `build:game-balance`)

Exit: `npm run build:game-balance` writes **20** hero entries matching the verified table
in section 5; printed summary shows cost spanning `85..150` with no NaN and no zero-dps
hero. Prototype already exists and produces this output, so T1 is mostly transcription.

### T2 - Sim core, headless (4 files)
- `src/game/td/rng.js`, `src/game/td/entities.js`, `src/game/td/sim.js` (new)
- `scripts/test-td-sim.mjs` (new)

Exit: headless run of a scripted 10-wave scenario completes; same seed gives byte-identical
event log twice.

### T3 - Maps, paths, waves (3 files)
- `src/data/tdMaps.json`, `src/data/tdWaves.json` (new)
- `src/game/td/path.js` (new)

Exit: every `roadSlot` sits on the path polyline; no `platformSlot` does; enemy walk from
spawn to exit takes the intended time on both maps.

### T4 - Renderer (2 files)
- `src/game/td/render.js`, `src/game/td/sprites.js` (new)

Exit: 60fps with 80 enemies on screen on a mid laptop; sprites load from R2 with a
placeholder shown until decoded.

### T5 - Page, HUD, nav (4 files)
- `src/pages/games/tower-defense.astro` (new)
- `src/components/pages/TowerDefensePage.astro` (new)
- `src/styles/components.css` (edit, `td-*` block)
- `src/data/nav.ts` (edit)

Exit: full run playable start to finish on desktop and on a 390px-wide phone; `npm run build`
clean; page in nav and teaser grid.

### T6 - Upgrades, synergy bonus, score (3 files)
- `src/game/td/upgrades.js` (new)
- `src/game/td/sim.js` (edit, hook effects)
- `src/data/gameBalance.tuning.json` (edit, virtue-set effect map)

Exit: 3 upgrade choices per wave gap apply visibly; synergy bonus shows in the hero
inspector; best score survives reload.

## 11. Edge cases

Data - the locked 20 eliminates most of these by construction. Remaining:

1. A roster id is renamed or removed from `all_heroes_db.json` - the balance build must
   **fail loudly**, not silently emit 19 heroes. Assert `roster.length === 20`.
2. `damageType` casing chaos (`Magic`, `magical`, `""`, `null`, `Support`) - normalizer
   plus class default. Still live: several of the 20 are affected.
3. `critRate: 0` heroes (`nuwa`, `prometheus`, `demeter`, `momus` - all Tanks) - crit path
   must not divide by zero or skip the attack.
4. Percentile rank on a 20-element set gives exact `0` and `1` at the extremes - bands
   must stay compressed (`30..230`, `340..880`) or mitigation hits a hard wall.
5. Rating is a range (`A~S`) - take the lower grade. None of the 20 currently is, but the
   ratings file is hand-edited, so handle it.
6. Two roster heroes tie on a ranked stat - `indexOf` on the sorted array returns the
   first index for both, so ties get an identical rank. Acceptable, but the ranker must
   not return `undefined` (`indexOf` miss on a float mutated by rounding). Rank by index
   in the sorted array, not by `indexOf` of the value.

Already eliminated by the locked roster: `stats === null`, missing `baseAttackRate`,
missing `bossUltimatesPer90s`, missing rating, dev-versus-prod roster differences,
unreleased heroes. All 20 were verified complete.

Sim
9. All road slots filled - enemies must still resolve, not deadlock.
10. Blocker dies mid-melee - enemies must re-path, not freeze at the empty tile.
11. Flyers with zero valid platform heroes - run must be losable, not softlocked.
12. Two heroes kill the same enemy on the same tick - gold awarded once.
13. Projectile in flight when its target dies - retarget or expire, no null deref.
14. Wave cleared while a `cleave` effect is mid-animation.
15. Tab backgrounded for 5 minutes - accumulator must clamp, not run 18000 catch-up ticks.
16. Speed toggle flipped mid-tick - determinism must hold (scale render, not step size).
17. Gold exactly equal to a hero cost - purchase allowed (`>=` not `>`).
18. Lives hit zero on the same tick as the last enemy dies - define the winner (loss wins).

UI
19. R2 sprite 404 for a new hero - placeholder silhouette, no broken canvas.
20. Canvas on a 320px-wide phone - internal `960x540` must letterbox, not distort.
21. Tap versus drag on touch - place on tap, no accidental placement while scrolling.
22. `prefers-reduced-motion` - offer a no-screenshake, no-particle mode.
23. Keyboard-only play - hero picker and slots reachable by tab, `R` rotate documented on screen.

## 12. Test cases

Headless (`scripts/test-td-sim.mjs`, plain node, no framework, same style as
`scripts/test-tag-rules.mjs`):

1. `damage_physical_mitigation` - atk 100 vs armor 260 equals 50 damage.
2. `damage_true_ignores_res` - true damage vs armor 79503 equals full atk.
3. `damage_magical_uses_magicres` - physical armor does not reduce magical damage.
4. `crit_deterministic` - fixed seed produces the exact expected crit sequence.
5. `determinism` - two runs, same seed and inputs, identical event log hash.
6. `no_deadlock` - 10 waves with every road slot filled always terminates.
7. `gold_once` - simultaneous killing blows award gold exactly once.
8. `ult_cadence` - hero with `bossUltimatesPer90s: 4` casts 4 times in 90 sim-seconds (+/-1).
9. `flyer_ignores_blockers` - flyer reaches exit with all road slots filled.
10. `accumulator_clamp` - a 300s `dt` spike advances at most 5 sim-seconds.

Balance build (`npm run build:game-balance --check`):

11. Exactly 20 entries, all ids resolve in `all_heroes_db.json`, no `NaN`, no `null`.
12. `gameDps` inside `[18, 55]`, `aps` inside `[0.5, 2.2]`, `cost` inside `[85, 150]`.
13. Every class has a range, a slot type, and an ability archetype.
14. Every ability archetype named in the balance file is implemented in the sim (guards
    against a tuning-file typo shipping a hero with a dead ultimate).
15. Slot balance holds: 11 road, 9 platform. A map with fewer than 11 road slots is still
    playable, but the picker must never offer a slot type the map lacks.
16. Cost is not monotonic in tier (regression guard, not a bug): assert at least one D-tier
    hero costs more than at least one S-tier hero, so a future refactor cannot silently
    revert to the tier-priced model rejected in section 5.

Manual
17. Full 10-wave win on both maps.
18. Full loss run - lives to zero, restart works, best score persists across reload.
19. Mobile portrait 390px, one full run.
20. `localStorage` blob hand-corrupted to `"{"` - page still loads and starts fresh.
21. `npm run build` then check `dist/games/tower-defense/index.html` exists and the page
    is in `sitemap-0.xml`.

## 13. Decisions (locked)

| # | Decision |
|---|---|
| 1 | Route `/games/tower-defense`, leaving `/games/` free as a future hub |
| 2 | Roster: 20 heroes from the Divine Throne subset, hand-picked, listed in section 4 |
| 3 | 10 waves, single boss on wave 10 |
| 4 | Persistence: `localStorage` only, one `td:v1` key. No leaderboard, no Worker, no D1 |

Nothing is blocking. T1 is ready to implement and its output is already verified against
live data (section 5).

### Deferred, not rejected

- More maps beyond the 2 in MVP.
- The remaining 16 Divine Throne heroes, then the wider 74.
- 20-wave mode with a boss every 5th wave, matching the reference.
- Shared leaderboard - needs anti-tamper design first (see section 9).
- Replays. The sim is already deterministic and seeded, so this stays cheap to add later.

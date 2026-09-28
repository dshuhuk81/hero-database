# Tower Defense - Current Design Reference

Last verified against code: September 28, 2026.

This file describes what the game **is** today. It is not a plan.
- Open work and priorities: [TOWER_DEFENSE_ROADMAP.md](TOWER_DEFENSE_ROADMAP.md)
- Finished milestones: [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md)
- Hero ultimates and kits: [TOWER_DEFENSE_HERO_SKILLS.md](TOWER_DEFENSE_HERO_SKILLS.md)
- Mechanics and economy overview (currencies, upgrade layers, balance levers): [TOWER_DEFENSE_MECHANICS_OVERVIEW.md](TOWER_DEFENSE_MECHANICS_OVERVIEW.md)
- Player-facing hero identities: [TOWER_DEFENSE_MYTHIC_HEROES.md](TOWER_DEFENSE_MYTHIC_HEROES.md)
- UI plan: [docs/tower-defense-ui-plan.md](docs/tower-defense-ui-plan.md)
- Blessing tree design: [docs/tower-defense-blessings-research.md](docs/tower-defense-blessings-research.md)
- Summon duplicates, Stars and Evolution: [docs/tower-defense-summon-duplicates-plan.md](docs/tower-defense-summon-duplicates-plan.md)

The original September 2026 MVP spec (20-hero lock, prototype cost table, T1-T6 task
split) lives in git history (last version at commit `5e788d86`).

When code and this file disagree, the code wins. Update this file in the same change.

## 1. Scope

- Route `/games/tower-defense` (plus `/games/tower-defense/glossary`). Public, not in
  `LOCAL_ONLY_ROUTES`. There is currently no entry in `src/data/nav.ts`.
- Fully client side on the static Cloudflare build. No backend, no accounts, no server
  leaderboard, no replays.
- English only, route not localized.
- Non-goals: map editor, shared leaderboard (needs anti-tamper design first).

## 2. Data policy and white label

Invented tuning numbers are allowed, and live only in TD files:

| File | Role |
|---|---|
| `src/data/gameBalance.tuning.json` | Hand-authored knobs (classes, enemies, bosses, run, modes, systems) |
| `src/data/gameBalance.json` | Generated per-hero stats. `npm run build:game-balance` |
| `src/data/tdMaps.json` | Maps. Tiles written by `scripts/build-td-grid.mjs` |
| `src/data/tdWaves.json` | 10 base waves |
| `src/data/tdCampaign.json` | Campaign chapters, stages, squad and hero-level rules |
| `src/data/tdSummon.json` | Summon banners |
| `src/data/blessingTree.json` | Divine Blessings tree (Favor trunk, Insight class branches) |
| `src/data/tdSkinMythic.json` | Player-facing hero names, titles, ultimate names |
| `src/data/tdAudioLevels.json` | Per-file gains. `node scripts/td-audio-levels.mjs` |

Hard rules:
- Never write TD numbers back into `src/data/heroes/*.json`, `hero-ratings.json`,
  `bosses.json` or any CN block. `npm run db:merge` stays unaware of TD files.
- **White label (M24):** the player never sees database hero art, names or sounds.
  `src/game/td/skin.js` maps each internal id (`nuwa`, `zeus`, ...) to a mythic persona
  (e.g. `nuwa` -> Atlas) with TD-owned art on R2 `td/heroes-alt/` and sounds on
  `td/sfx/mythic-*`. Internal ids, stats and rules are unchanged. `gameBalance.json`
  still carries DB names and thumb URLs; UI code must go through `skin.js`.
- Page disclaimer (lobby and glossary): "Not affiliated with GOAT Games or Motto
  Immortal. Heroes, art and text are original; music and sounds are CC0."

## 3. Code layout

- Page: `src/pages/games/tower-defense.astro` -> `src/components/pages/TowerDefensePage.astro`
  (wiring only). Markup in `src/components/td/` (`TdLobby`, `TdPlayScreen`, `TdPanels`,
  `TdOverlays`, `TdGlossary*`, `TdEnemyCard`, `TdSoundControls`, `TdDebugPanel`).
- Page logic: `src/game/td/page/`. One shared `PageContext` (`context.ts`); modules call
  each other only through `ctx.actions`. Screens are a stack mirrored in browser history
  (`nav.ts`). The summon reveal dialog is `summon-reveal.ts`, driven by `campaign.ts`.
- Portrait phone hint: on page load, if `(orientation: portrait) and (pointer: coarse) and
  (max-width: 767px)` matches, a native `<dialog>` (`data-td-orient-dialog`, in
  `TowerDefensePage.astro`) asks the player to go full screen and rotate to landscape.
  One "Okay" button closes it. Shown on every landing, no saved dismissal.
- Rules (pure, headless-testable): `sim.js`, `waves.js`, `lanes.js`, `grid.js`,
  `campaign.js`, `expedition.js`, `daily.js`, `challenges.js`, `favor.js`, `skills.js`.
- Presentation: `render.js` (PixiJS v8 from jsDelivr), `map-scene.js`, `fx-kit.js`,
  `hero-fx.js`, `status-fx.js`, `zeus-fx.js`, `skin.js`, `audio.ts`, `ui.js`.
  Presentation never affects combat or consumes combat RNG.
- Styles: `src/styles/td.css`, `td-*` classes.
- Assets: Cloudflare R2 under `td/`, resolved by `assets.js` (R2 public URL in
  production, `/r2` dev proxy locally).

## 4. Roster and hero stats

21 heroes, literal array `roster` in the tuning file:

| Class | Slot | Heroes (internal ids) |
|---|---|---|
| Tank | road | `nuwa`, `prometheus`, `momus`, `demeter` |
| Warrior | road | `poseidon`, `amunra`, `set`, `jormungandr` |
| Assassin | road | `nyx`, `bastet`, `horus`, `anubis` |
| Mage | platform | `zeus`, `phoenix`, `fengyi` |
| Archer | platform | `diana`, `artemis`, `medusa` |
| Support | platform | `caishen`, `yuelao`, `freya` |

12 road, 9 platform. The build fails on a missing id or missing `stats`,
`baseAttackRate` or `bossUltimatesPer90s`.

### Generator (`scripts/build-game-balance.mjs`)

`rank(x)` = percentile rank across the roster (ties share the lowest index).

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

Cost is value-based, ranked **within each slot type**, mapped to `85..150`, rounded to 5:

```
effDps     = rawDps * classes[class].valueDps
value_road     = 0.30 rank(effDps) + 0.50 rank(effHp) + 0.20 rank(ultValue)
value_platform = 0.65 rank(effDps) + 0.10 rank(effHp) + 0.25 rank(ultValue)
```

Why not price by tier: tier reflects real-game skill strength, not raw stats, so tier
pricing made D heroes strictly best per gold. Tier feeds `ultPower` instead. Cost
therefore does not track the tier badge; that is intended.

After pricing, class kits apply (`hpMult`, `armorMult`, `apsMult`/`maxAps`, `dpsMult`,
forced `damageType`, `crit`), shifting a whole class without re-ranking cost.

## 5. Combat rules (`sim.js`)

- Fixed step 60/s, accumulator loop, deterministic, seeded RNG. Speed toggle scales
  steps per frame, never step size. World space `960x540`, canvas CSS-scaled.
- Damage: `mitigation = res / (res + 260)`; `dmg = atk * (1 - mitigation) * (crit ? 1.5 : 1)`.
  True damage skips mitigation.
- Placement: square tiles (`grid.js`, cell 60) on the road (blockers) and in rows beside
  it (ranged). Road tiles take Tank/Warrior/Assassin, platform tiles take
  Mage/Archer/Support. Flyers can only be hit by platform heroes.
- Recruiting (`page/recruit.ts`): tapping an empty tile opens the sheet. Choosing a card
  (tap, click, Enter or keyboard focus; hover does not) only inspects that hero: role line,
  ground/flying reach, range on this tile, ultimate text, and collapsed Details (attack,
  health, speed, crit, class rule, tile bonus, campaign level). Numbers come from
  `sim.deployPreview()`, the same maths as `place()`. Only the footer button
  "Deploy <hero> · <cost> gold" places. Unaffordable or deployed heroes stay inspectable;
  Deploy is then disabled with the reason. The recruit pause is unchanged.
- Blocking: `blockLimit` Tank 3, Warrior 2, Assassin 1. Held enemies take `+20%`
  damage; enemies passing a full blocker are slowed.
- Class archetypes: Tank `taunt`, Warrior `cleave`, Assassin `execute` (dash, veil),
  Mage `nuke` (splash, chain), Archer `volley`, Support `aura`/heal. Per-hero
  ultimates and variants: `heroSkills` in tuning, text in `skills.js`.
- Special tiles (`rings`): `highground` +20% range, `shrine` +30% ult charge,
  `cursed` +30% atk / -20% aps.
  Visuals (`render.js`, built once, animated by transforms only): soft additive ground
  light about twice the tile size under the slot art (`layerSlotAuras`); gold motes, cyan
  mist or red wisps drifting above the heroes (`layerSlotAurasTop`, fainter when occupied);
  the hero on the tile gets an underglow plus a rim (rotating gold arcs, pulsing cyan
  double ring, flickering red ring). Reduced motion: static glow and rim, no drifting parts.
- Hero actions: upgrade Lv1-4 (costs 80/120/160; Lv3 focus, Lv4 class path such as
  Mage wildfire/frost/arc), awakening, training, target mode, sell (50% refund).
  No player rotation (M24): `sim.faceTarget()` turns a hero to its current target every
  step and to the ultimate's primary target at cast, so cones (cleave, knockback, petrify)
  and spreads (volley, moon barrage) centre on that target. `rotation` remains as internal
  combat/effect state; no facing tick is drawn.
- Hero panel (`page/popover.ts`): Details starts collapsed on phones (max-width 600px or
  max-height 560px) and open on larger screens; the player's toggle is kept for the session.
- Statuses: wet, burn, poison, chill, with reactions `conduct`, `steam`, `blight`,
  `freeze`, `harvest`.
- Synergy: each `synergies` tag shared by 2+ deployed heroes within 250px gives `+8%`
  atk, capped at `+24%`.

## 6. Enemies, bosses, waves

- Enemy kinds: `grunt`, `runner`, `flyer`, `archer`, `brute`, `brood`, `mender`,
  `shieldbearer`, `broodcaller`, `imp`, `hexer`, plus `boss`. Stats in `tuning.enemies`.
- Bosses: `baphomet` (mark, stance) and `lilith` (summons brood, enrages below 50%).
  Each map names its boss.
- Enemy art: full-body sprites from R2 `td/enemies/sprites/` (`render.js`), loaded with
  the `?v=cors1` cache bust like hero thumbs. The same files appear in plain `<img>`
  tags (lobby, boss plate, glossary), and a cached non-CORS copy would make WebGL reject
  the texture and drop the enemy to the 8x8 Kenney tile fallback.
- Base waves (`tdWaves.json`): 1-2 grunt, 3 +runner, 4 flyer, 5 brute/mender/runner,
  6 shieldbearer/archer, 7 runner/hexer/brute, 8 flyer/broodcaller/archer,
  9 brute/mender/shieldbearer/runner, 10 boss + escort.
- Run lengths (`waves.js`): `classic` 10 waves (boss on 10), `long` 20, `endless`.
  Long and endless reuse waves 1-10 plus a mid-boss on 5, then generate waves with a
  boss every 5 (`waveGen`).
- Tiers: Normal, Heroic (enemy hp x2, attack x1.3, Favor x1.3), Mythic (x3.2, x1.6,
  x1.6). Global `difficulty.enemyHp` 3.75 applies on top.
- Mutators: every 10 waves pick 1 of 3 (fortified, haste, warded, horde, ironclad,
  elites), each raising Favor.

## 7. Maps (`tdMaps.json`)

| id | Name | Routes | Boss |
|---|---|---|---|
| `moonlit-pass` | Moonlit Pass | one path | `baphomet` |
| `verdant-crossing` | Verdant Crossing | one path | `lilith` |
| `sunscar-ruins` | Sunscar Ruins | 2 `lanes`, one base | `baphomet` |

Each map: `theme`, `art`, `music`, `path` or `lanes`, `base`, generated `roadSlots`,
`platformSlots`, `rings`, `grid`. Asset assignments: [map.md](map.md).

Optional `enemyHp` scales enemy health on that map in open modes (Free play, Daily Trial,
Endless). Verdant Crossing uses 1.25 (September 28, 2026) because it was the easiest map for
every squad. Modes with their own stage scale (`hpScale` from Campaign stages or Expedition)
replace the map value, so tuned stages keep their numbers.

## 8. Game modes

| Mode | Rules | Source |
|---|---|---|
| Free play | Any map, run length and tier. Starting gold 340, 25 lives, deploy cap 7, wave-clear bonus 100 + 20/wave | `sim.js`, `waves.js` |
| Campaign | Chapter 1 "The Road to the Crossing", 10 authored stages across all 3 maps. Campaign opens on a headquarters hub; stages are one screen deeper. Squad of up to 4 owned heroes, 6 starters, stage lives and hp scale, first-clear rewards (repeat pays 25%). Hero levels 1-10 bought with Gold + Hero XP (+6% stats/level); Stars 1-5 and Evolution I-V from spare copies (campaign stages only) | `campaign.js`, `tdCampaign.json` |
| Summon | Banner "Ember at the Crossing", 60 Divine Seals per summon, x1 or x10 (600), duplicates become spare copies, 14-day featured rotation, featured hero weighted 5x | `campaign.js`, `tdSummon.json` |
| Expedition | Roguelite chain of 10-wave stages, starts with 3 random heroes, camp offers hero / relic / veteran after each win, lives carry over | `expedition.js` |
| Daily Trial | One UTC-day seed: map, allowed heroes, 2 mutators, goal wave. Endless, Normal, no blessings or boosts | `daily.js` |
| Challenges | Optional per-map, per-length goals checked on a won 10/20-wave run; one-time Favor reward | `challenges.js` |

Restricted rosters (Campaign squad, Daily, Expedition) also cap `deployCap()`.

### Campaign navigation and screens

Campaign is a small screen hierarchy rather than a stage list with utility buttons:

1. **Campaign headquarters** is the Campaign entry screen. It shows compact Gold,
   Hero XP and Divine Seal balances inside the headquarters banner, the last deployed
   squad (or the starter company), and three activity cards: Journey, Heroes and
   Summoning.
2. **Campaign stages** opens from Journey / Venture forth. It owns the chapter route,
   next-stage preview, stage cards and the transition into squad selection.
3. **Squad selection** remains between a stage and the run. Browser/app Back returns to
   Campaign stages; exiting a campaign run also resolves through this hierarchy.
   Layout (top to bottom): compact stage head (name, map · waves · lives · boss, rewards;
   the stage text is a tooltip), a roster strip of small tiles, max 2 rows, swipe/scroll
   sideways for the rest (portrait, name, class icon,
   level; locked heroes trail dimmed with their unlock source), then a sticky panel with
   the 4 squad slots (portrait, class · lane, level, battle gold cost; tap to remove),
   coverage line, hint/flyer warning and Quick pick. Footer: count, power vs. recommended,
   Start. Role hints and skill names live in tile tooltips and on the Heroes screen.
   Drag and drop (pointer events, mouse + touch): tile -> slot places or replaces, slot ->
   slot swaps, slot dropped outside the lineup removes. Tap still toggles. On touch a
   roster tile drags only on a mostly vertical pull, so sideways swipes keep scrolling.

Heroes and Summoning are campaign activities, so they are cards on the headquarters
screen rather than persistent footer navigation buttons.

The **Heroes** screen uses a master-detail collection layout. A scrollable two-column
roster sits on the left; the first owned hero is selected by default. Owned heroes are
selectable and locked heroes remain visible with their unlock source. The selected hero
fills the right panel with large art, class and placement role, role hint, campaign level,
stars, Evolution badge and spare copies, then three tabs:

- **Level**: level pips, current and next-level Attack/Health, deploy cost, Level up.
- **Stars**: current stars, Attack/Health now and at the next star, fodder slots, the
  other heroes' spare copies to tap into them, Quick add and Star up.
- **Evolution**: the five tiers (done / next / locked) with their bonus, two material
  slots (a copy of this hero, Divine Essence), Evolve, and "1 copy -> 30 Dust".

The detail column scrolls inside its panel. A small red dot on a roster tile means a
level-up is affordable or the hero has its own copy for Evolution. On narrow screens the
roster stacks above the detail panel while retaining its own scroll.

### Summoning rules and screen

`tdSummon.json` authors the banner, seal sources and dust rates. The current banner uses:

- rotation: `set` (Surtr), `nyx` (Nott), `phoenix` (Hephaestus), `bastet` (Hecate);
- one featured hero for 14 days, calculated from `rotationEpoch`;
- featured weight 5, every other hero weight 1;
- 60 Divine Seals per summon; x10 (`multiCount`) costs 600 and always gives 10;
- pool `"all"`: every hero the player owns or can summon, drawn with replacement. A hero
  not owned yet joins; an owned one becomes a spare copy (`copies[heroId]`);
- stage-reward heroes join the pool only after their stage's first clear, so a summon never
  takes a stage's reward first. (`"locked"`, new heroes only, is still supported.)

With `N` heroes in the pool the featured chance is `5 / (5 + N - 1)`, each other hero
`1 / (5 + N - 1)`. The UI calculates the rate from the same rules function used by
`summonMany()`, so the displayed chance cannot drift from selection behavior. New heroes
are meant to stay hard to get (owner, September 28, 2026): the campaign's 600 seals spent
as one x10 at the end give about 4 new heroes and 6 copies; there is no new-hero boost.

Divine Seal sources: campaign first clears (600 in Chapter 1, enough for one full x10),
the Daily Trial goal (+15, once per day) and a finished Expedition (+60).

The Summon screen is centered on the featured target: large art, name/title, remaining
rotation time, exact featured chance, Divine Seal balance, Summon x1 / Summon x10 and a
Skip animation toggle (per browser, `td:summonSkip`). The pool below shows each hero as
New or with its stars and spare copies. A Seal Dust panel exchanges dust for seals or
Divine Essence.

**Reveal** (`page/summon-reveal.ts`): a full-screen `<dialog>` over the Summon screen.
The summon is paid and saved before it opens. Cards deal in face down (10 cards as 3/4/3)
with the wolf card back (`public/td/summon-card-back-wolf.webp`); the back's glow shows
the tier before the flip: gold = featured hero, purple = S or A tier, none = the rest. Tap
flips a card, Reveal all flips the rest, the featured hero bursts. Face-up cards say
"New" or "+1 copy". The result bar offers Summon again, Build squad and Close; Escape
closes only the dialog. Reduced motion fades instead of flipping.

### Stars, Evolution and Seal Dust (campaign only)

Numbers live in `tdCampaign.json` (`heroStars`, `heroEvolution`) and `tdSummon.json`
(`dust`); design and review notes in `docs/tower-defense-summon-duplicates-plan.md`.
Every upgrade is chosen and confirmed by the player; nothing is spent automatically.

- **Stars 1-5**: star n -> n+1 costs n spare copies of *other* heroes (1/2/3/4, 10 in all)
  plus 200/400/600/800 Gold; +10% attack and health per star, multiplied with the level
  bonus. A hero's own copies are never star fodder (they are its Evolution material).
  Quick add takes surplus copies (beyond what their hero's Evolution still needs) first,
  then the largest piles.
- **Evolution I-V**: each tier costs 1 copy of the same hero or 1 Divine Essence; the
  player taps the material, then Evolve. Tiers: ultimate +20%, crit +10%, ultimate cooldown
  -15%, ultimate +25%, and V: the ultimate starts with its awakened upgrade (the same
  per-ultimate upgrade the in-run Awaken unlocks; `hero.awakenedUlt` in `sim.js`).
- **Seal Dust**: 1 spare copy -> 30 dust (by hand); 2 dust -> 1 Divine Seal; 150 dust ->
  1 Divine Essence.
- `campaignHeroes()` applies level x stars to attack/health and Evolution to
  `ultPower`, `critChance`, `ultCooldown` and `awakenedUlt`.

Measured with `npm run td:upgrade-sweep` (20 squads per stage at the expected levels):
base 25% on 1-8 and 1-10; 3 stars about +20 points; Evolution V alone about +35;
5 stars + Evolution V reach 70%. Every stage stays winnable without upgrades.

### Results screen

A campaign stage's result screen offers Retry, the follow-up (Next: stage X after a win,
Change squad after a loss) and **Campaign** (back to the Campaign headquarters) instead of
Main menu. Spend Favor is hidden after campaign stages (they earn no Favor).

## 9. Meta progression

- **Favor**: earned per wave, perfect wave, boss kill, remaining lives (`favorEarn`),
  scaled by tier and mutators. Spent in the Divine Blessings tree.
- **Insight**: per-class currency for the class branches of the tree.
- **Virtue blessings**: between-wave offers from 12 virtues (Wildness, Desire, ...),
  with virtue pairs (e.g. Storm Bond) granting extra run effects. Run boons (rare/epic)
  can roll with requirements such as `chain` or `wet`.
- **Shards / next-run boost**: gold or virtue boost for the next run.
- Favor purchases are allowed anytime and apply on the next run.

## 10. Persistence

`localStorage` key `td:v1`, one JSON blob, sanitized on load (`save.ts`): any bad field
is dropped, a corrupt blob starts fresh, unknown hero ids are removed.

Fields: `bestScore`, `bestWave`, `lastTeam`, `perfectDefense`, `favor`, `favLevels`,
`insight`, `resetSpent`, `refundNotice`, `treeVersion`, `repriceNotice`, `mapBests`,
`mapTop`, `challenges`, `nextRunBoost`, `daily`, `expedition`, `expeditionBest`,
`campaign`.

The `campaign` section is versioned (`CAMPAIGN_SAVE_VERSION` 4): `owned`, `cleared`,
`lastSquad`, `currencies` (Gold, Hero XP, Divine Seals, Seal Dust, Divine Essence),
`levels`, `summons`, `copies`, `stars`, `evolution`. Older versions migrate on load
(version 3 gets empty copies, stars and Evolution).

Per-map records key as `mapId`, `mapId@long`, `mapId#heroic`, `mapId@long#mythic`, so
older builds can still read `td:v1`. Export/import: save code (`TD1:` prefix) or file.
Audio volume and mute have their own keys.

## 11. Tests and tools

| Command | Covers |
|---|---|
| `npm run test:tower-defense` | UI helpers, favor, difficulty, skin, save, sim, daily, challenges, expedition, campaign, summon |
| `npm run test:td-balance` | Balance harness |
| `npm run td:sweep` | Difficulty sweep |
| `npm run td:upgrade-sweep` | Campaign win rates by Stars / Evolution, summon economy |
| `npm run td:classes` / `td:progression` | Class and progression reports |
| `npm run td:economy` | In-run gold ledger: income by source vs. spend by sink, per mode/tier |
| `npm run td:pacing` | Balance and pacing report with two bot policies (`cheapest`, `carry` in `scripts/lib/td-runner.mjs`) |
| `npm run build:game-balance` | Regenerate `gameBalance.json` |
| `node scripts/build-td-grid.mjs` | Regenerate map tiles |
| `node scripts/td-audio-levels.mjs` | Regenerate audio gains |

Invariants worth keeping under test: determinism (same seed = same log), gold awarded
once per kill, no deadlock with every road tile filled, flyers reach the base past
blockers, accumulator clamps long tab-away gaps, loss wins a same-tick tie, cost is not
monotonic in tier.

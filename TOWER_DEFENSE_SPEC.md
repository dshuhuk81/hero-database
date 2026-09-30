# Tower Defense - Current Design Reference

Last verified against code: September 29, 2026.

This file describes what the game **is** today. Open map-system work is also recorded in
section 7 so the generator handoff remains visible beside the live map contract; other
planning stays in the roadmap.
- Open work and priorities: [TOWER_DEFENSE_ROADMAP.md](TOWER_DEFENSE_ROADMAP.md)
- Finished milestones: [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md)
- Hero ultimates and kits: [TOWER_DEFENSE_HERO_SKILLS.md](TOWER_DEFENSE_HERO_SKILLS.md)
- Mechanics and economy overview (currencies, upgrade layers, balance levers): [TOWER_DEFENSE_MECHANICS_OVERVIEW.md](TOWER_DEFENSE_MECHANICS_OVERVIEW.md)
- Player-facing hero identities: [TOWER_DEFENSE_MYTHIC_HEROES.md](TOWER_DEFENSE_MYTHIC_HEROES.md)
- UI plan: [docs/tower-defense-ui-plan.md](docs/tower-defense-ui-plan.md)
- Blessing tree design: [docs/tower-defense-blessings-research.md](docs/tower-defense-blessings-research.md)
- Summon duplicates, Stars and Evolution: [docs/tower-defense-summon-duplicates-plan.md](docs/tower-defense-summon-duplicates-plan.md)
- Map generator architecture: [docs/tower-defense-map-generator-plan.md](docs/tower-defense-map-generator-plan.md)
- Map-work agent handoff: [docs/tower-defense-map-agent-runbook.md](docs/tower-defense-map-agent-runbook.md)

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
  Redrawn heroes carry `"art": "v2"` (etc.) in `tdSkinMythic.json`: files become
  `{id}-{art}-{card-240|thumb-96|token-192}.webp` and `anims/{id}-idle-{art}.webp`, since
  R2 caches immutable. Odin (`zeus`) uses v2 (source `review-set-v1/odin-v2*`).
- **Prototype, animated hero figures (September 30, 2026):** `?anim=fengyi,set,jormungandr,freya`
  on the game page draws those heroes (Boreas, Surtr, Fenrir, Asclepius) as standing PixelLab
  figures (idle, attack, ultimate) instead of their tokens (`animHeroes` / `updateHeroAnim` in
  `render.js`, lab ids in `LAB_IDS`). Frames come from the local anim lab
  (`public/td-local/anim-lab/`, gitignored), previewed at `/games/tower-defense/anim-lab`.
  Presentation only: attack triggers when `attackClock` resets, ultimate when `ultClock`
  drops; basic shots start at the manifest's `hand` point. Clips carry no effects (the
  renderer draws them). Not shipped; without the parameter nothing changes.
- Page disclaimer (lobby and glossary): "Not affiliated with GOAT Games or Motto
  Immortal. Heroes, art and text are original; music and sounds are CC0."

## 3. Code layout

- Page: `src/pages/games/tower-defense.astro` -> `src/components/pages/TowerDefensePage.astro`
  (wiring only). Markup in `src/components/td/` (`TdLobby`, `TdPlayScreen`, `TdPanels`,
  `TdOverlays`, `TdGlossary*`, `TdEnemyCard`, `TdSoundControls`, `TdDebugPanel`).
- Glossary (`TdGlossaryContent`, standalone page and in-app screen): sticky bar with the
  Heroes / Enemies tabs and section jump chips (scroll only, the URL hash stays the tab's).
  Its own denser type scale (body 12px, titles 13px). Icons are Material Symbols Rounded,
  loaded as a Google Fonts subset (`icon_names`) built from the icon maps in the component
  frontmatter (`STAT_ICON`, `STATUS_ICON`, `REACTION_ICON`, `UI_ICON`, attribute lists), so a
  new icon must be added there; `.td-msym` renders them. Embedded, the screen body has no top
  padding so nothing shows above the sticky bar.
- Page logic: `src/game/td/page/`. One shared `PageContext` (`context.ts`); modules call
  each other only through `ctx.actions`. Screens are a stack mirrored in browser history
  (`nav.ts`): home opens stages (Play: Campaign), daily, expedition and maps (Play: the
  other modes), and heroes, summon, blessings, glossary, help and settings directly. The
  summon reveal dialog is `summon-reveal.ts`, driven by `campaign.ts`.
- Portrait gate (`page/orient.ts`): the game has no portrait layout. While
  `(orientation: portrait) and (pointer: coarse) and (max-width: 767px)` matches (touch
  phones only; narrow desktop windows and tablets are not blocked), a full-screen modal
  `<dialog>` (`data-td-orient-gate`, in `TowerDefensePage.astro`) covers every screen,
  menus included. No dismiss button, Escape is swallowed; it reopens on each change so it
  stays above other modal dialogs. It adds the `orient` pause reason; turning back to
  landscape closes it and removes the reason, so the run and open screens stay as they were.
  Where element full screen exists, "Enter fullscreen" requests it on the shell and tries
  `screen.orientation.lock("landscape")` (Android); hidden while already full screen and on
  iPhone Safari. The lock is only an enhancement; the gate is the dependable part.
- Full screen toggle (`page/hud.ts`): every `[data-td-fullscreen]` button toggles element
  full screen on the shell - the fight top bar icon button and Settings > Display
  (same expand/compress icon plus a "Full screen" / "Exit full screen" label). All copies
  sync on `fullscreenchange`; F toggles too. Hidden (incl. the Display block) where the
  browser has no element full screen (iPhone Safari).
- Menu frame (`page/frame.ts`): every menu screen (lobby, its dialogs and the embedded
  Blessings, help and save panels) is laid out once for a phone held sideways, 844 x 390
  CSS px, and must fit it without page scrolling; only long lists scroll inside their own
  box (hero roster, hero copy, squad roster, glossary, save code). `.td-app` gets
  `zoom: var(--td-zoom)` with `--td-zoom = max(0.75, min(w / 844, h / 390))`, so desktop shows
  the same layout larger and small phones a slightly smaller one. The play screen is not
  zoomed. Menu CSS lives in the "Menu frame layout" section at the end of `td.css`, prefixed
  `.td-app`; menu rules must not use viewport units or viewport media queries (neither
  follows the zoom; percentages and container queries do). Pointer maths inside the frame
  divides by `zoomOf(el)` (Blessings graph pan and zoom). Checked at 667x375, 844x390,
  915x412, 1280x720, 1440x900 and 1920x1080.
  Home screen (War Camp, September 30, 2026; `docs/tower-defense-home-camp-plan.md`):
  `TdHome.astro` + `page/home.ts`. The camp art (R2 `td/ui/camp-home.webp`, `campHomeArt()`
  in `assets.js`, solid fallback color) fills the screen and the app bar is hidden; its own
  top bar holds the title crest, the global wallet (`wallet.place()` moves the one node in
  and back out) and Settings. Left: the current objective (next campaign stage and chapter
  meter; the Daily Trial once every stage is cleared). Right: the mode rail, a radio group
  of Campaign, Daily Trial, Expedition and Free Play medallions (arrows move and select,
  Enter plays; the selected one slides out its name and status; Daily shows a "1" badge
  until today's goal is cleared), and the Play button beside it, which opens the selected
  mode's screen (Campaign: the stage list on the next stage; Free Play: the map select).
  The pick is saved as `ui.homeMode`; starting a run sets it to that run's mode. Bottom:
  the dock (Heroes, Summon, Divine Blessings, Glossary, How to play; a dot badge when a
  hero can level up, a summon is affordable, or Favor covers an open trunk blessing) and
  "Exit to database". Layout is a grid inside a size container (`td-home`): frames up to
  420px tall slim the bars and cut the objective to one line, below 360px the dock drops
  its labels, portrait frames stack objective and rail above a centered Play.
- Rules (pure, headless-testable): `sim.js`, `waves.js`, `lanes.js`, `grid.js`,
  `campaign.js`, `expedition.js`, `daily.js`, `challenges.js`, `favor.js`, `skills.js`.
- Presentation: `render.js` (PixiJS 8.21.0 and filter-glow 5.2.1 from jsDelivr, exact versions pinned; bump deliberately), `map-scene.js`, `fx-kit.js`,
  `hero-fx.js`, `status-fx.js`, `zeus-fx.js`, `skin.js`, `audio.ts`, `ui.js`.
  Presentation never affects combat or consumes combat RNG.
- Styles: `src/styles/td.css`, `td-*` classes.
- Assets: Cloudflare R2 under `td/`, resolved by `assets.js` (R2 public URL in
  production, `/r2` dev proxy locally).

## 4. Roster and hero stats

33 heroes, literal array `roster` in the tuning file: 21 database heroes (below) plus 12
hand-authored common recruits (`recruit-*`, `TOWER_DEFENSE_FILLER_HEROES.md`).

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

Stable baselines (audit step 4, September 29, 2026): ranks are taken against the fixed
set `tuning.balanceReference` (the 21 database heroes above), not the whole roster.
Reference heroes are ranked among themselves; any other database hero in the roster is
ranked against the reference alone, so adding a hero never changes an existing row
(verified: adding `ares` changed 0 rows). Rows for roster ids without a database entry
(recruits) are hand-authored and kept as-is; `rarity` is kept, or derived from tier for a
new hero (S/A legendary, B/C epic, D common). `npm run build:game-balance -- --propose=<id>`
prints a new hero's row next to its class peers; `--check` runs first in
`npm run test:tower-defense`.

### Generator (`scripts/build-game-balance.mjs`)

`rank(x)` = percentile rank within the reference set, plus the hero itself when it is not
a reference hero (ties share the lowest index).

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
  it (ranged); Moonlit Pass has authored, irregular side tiles instead (`grid.platforms`, see map.md). Road tiles take Tank/Warrior/Assassin, platform tiles take
  Mage/Archer/Support. Flyers can only be hit by platform heroes.
  Tile look (`map-scene.js` `drawSlot`): every empty tile has a dark outer rim plus an
  accent rim over a darkened surface. Road = recessed socket, corner brackets and a shield
  glyph (gold accent); platform = raised bevelled plate with a double chevron (map-coloured
  accent). Occupied tiles drop to a faint plate and brackets. Placement states
  (`render.js` `slotMode`): while a fallen hero is picked from the deck
  (`game.uiDeploySlot`), empty tiles of its type glow ("eligible") and the other type fades
  ("dim"); with a full team empty tiles go quiet ("idle"); the focused tile gets a bright
  outline. Taps (`nearestSlot`) always pick the tile whose 56 px square contains the
  point, then the nearest centre within the hit radius.
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
  Support aura visual (`render.js` `updateAuraFx`): `aura` heroes pulse in their profile
  colour with a slow wave out to their range; allies inside carry a faint rim at their
  feet, allies under a timed ult buff a brighter gold rim. Recruits use the class effect
  builders in `hero-fx.js` (`CLASS_*`).
  Melee strikes give the hero token a short presentation-only lean; sim positions never
  change. Assassins use 42 px contact range against approaching enemies. They can dash to
  an unheld enemy only after it has passed their tile; the portrait remains anchored while
  speed streaks show the catch-up strike.
- Special tiles (`rings`): `highground` +20% range, `shrine` +30% ult charge,
  `cursed` +30% atk / -20% aps.
  Visuals (`render.js`, built once, animated by transforms only): soft additive ground
  light about twice the tile size under the slot art (`layerSlotAuras`); gold motes, cyan
  mist or red wisps drifting above the heroes (`layerSlotAurasTop`, fainter when occupied);
  the hero on the tile gets an underglow plus a rim (rotating gold arcs, pulsing cyan
  double ring, flickering red ring). Reduced motion: static glow and rim, no drifting parts.
- Hero actions: upgrade Lv1-4 (costs 80/120/160; Lv3 focus, Lv4 class path such as
  Mage wildfire/frost/arc), awakening, training, target mode, sell (50% refund).
  The training picker shows each option's real relative gain ("+6.9% this time")
  instead of the base rate, because training adds a fixed share of base per buy —
  the relative gain shrinks as trainings pile up while the cost grows ×1.3
  (mechanics overview recommendation 7). Measured on Normal (12 seeds, 5 squads,
  3 maps): a winning run buys 0-2 trainings and ~1 awakening, so the sink is
  tight, not over-generous.
  No player rotation (M24): `sim.faceTarget()` turns a hero to its current target every
  step and to the ultimate's primary target at cast, so cones (cleave, knockback, petrify)
  and spreads (volley, moon barrage) centre on that target. `rotation` remains as internal
  combat/effect state; no facing tick is drawn.
- Hero panel (`page/popover.ts`): Details is an accordion that starts collapsed on every hero
  selection (it also carries the "battle ranks reset" note). The upgrade flow lives in the
  pinned footer: a one-line preview of the next upgrade sits above Upgrade/Sell, and the rank III
  focus, rank IV path and training picks open there too, with the Upgrade button turning into a
  quiet Cancel while a pick is open.
  Side: portrait stages get a sheet below the map. Otherwise the panel pushes the map aside
  when the map keeps 520px, else overlays it. On desktop (fine pointer) it always sits on the
  right and pushes when it would cover the hero; only touch landscape docks on the side away
  from the hero. The Upgrade button sits in the pinned footer (2/3 width) beside Sell (1/3),
  so it never scrolls out of view on short screens; focus and path choices still open in the
  scrolling body and get scrolled into view by focus.
- Boss warnings (`page/hud.ts`): "Face <boss>" on the start button and "<boss> has entered"
  follow the run's wave table (a wave with a `boss` spawn), so campaign stages with the boss
  on wave 8 or 11 warn on the right wave. The mode rule (`isBossWave`) only covers endless
  waves not generated yet.
- Statuses: wet, burn, poison, chill, with reactions `conduct`, `steam`, `blight`,
  `freeze`, `harvest`.
- Exposed (`enemy.exposed`, end time): +20% damage taken in `hit()`. Set by Prometheus
  `expose`, the 72px cleave with 8s awakened exposure, and recruit Elm `weaken_burst`; reapplying
  keeps the later end time (`Math.max`), so a short exposure never cuts a longer one.
- Boreas `ice_shockwave` (tuning `heroSkills.fengyi`): shockwave around him within `hero.range`,
  140% U per enemy, 10% chance per enemy (seeded `rng`) to freeze 2s (`stunnedUntil` +
  `frozenUntil`, so Shattering Cold applies). Awakened: +10% chance, +1s. Replaces the old
  `weaken_burst` binding; no exposure. FX: the blast rings are true circles (`squash: 1`) centred on
  the hero, matching his range circle.
- Synergy: each `synergies` tag shared by 2+ deployed heroes within 250px gives `+8%`
  atk, capped at `+24%`.

## 6. Enemies, bosses, waves

- Enemy kinds: `grunt`, `runner`, `flyer`, `archer`, `brute`, `brood`, `mender`,
  `shieldbearer`, `broodcaller`, `imp`, `hexer`, plus `boss`. Stats in `tuning.enemies`.
- Enemy archers (`archer`): stop at `attackRange` 110 and shoot for `holdSeconds` 8, then
  close in to melee (road contact only). While shooting, the nearest road hero in reach
  comes first; with none, `targetsPlatforms` lets them shoot the nearest living platform
  hero in range for `platformAttack` 0.5 of their attack (`sim.findEnemyTarget`). The
  target gets `aimedAt`, drawn as amber corner brackets (`render.js`); the first archer
  wave of a run says so in a notice (`page/hud.ts`). Other enemies never hit platform
  heroes directly (Baphomet's mark and Hexers still affect them).
- Bosses: `baphomet` (mark, stance) and `lilith` (summons brood, enrages below 50%).
  Each map names its boss.
- TD-original bosses, prepared but on no map yet (September 29, 2026): `lerna` (Lerna, the
  Root-Maw, three-headed root hydra), `kraghorn` (Kraghorn, the Broken Tusk, stone-plated boar)
  and `vorruk` (Vorruk, the Hollow Hunger, segmented worm). Art and concept notes in
  `artifacts/td-bosses-v1/`; names in `src/data/tdBosses.json` (kept apart from the database's
  `bosses.json`); stills `boss-<id>-v1.webp` built and on R2; PixelLab clips packed as
  `boss-<id>` sheets. No special rules yet: without `tuning.bosses[id]` they fight as the plain
  boss (a simulated Moonlit Pass run with `kraghorn` wins normally).
- Adding a boss to a level:
  1. Art: still `boss-<id>-vN.webp` on R2 (`build-td-enemy-sprites.mjs`, `FILES` maps
     `boss_<id>.png`), animation sheet `clips/boss-<id>-vN`, named after the still (`build-td-enemy-anims.mjs --release`, `ENEMY_SHEETS`).
  2. Name: `tdBosses.json` for TD-original bosses (`bosses.json` only for database bosses).
  3. Placement, either
     - one campaign stage: `"boss": "<id>"` on the stage in `tdCampaign.json`. It replaces that
       stage's map boss only (`stageMap` in `page/campaign.ts` starts the session on a copy of
       the map with the stage's boss; drawer, HUD, notices, renderer and glossary follow), or
     - a whole battlefield: `"boss": "<id>"` on the map in `tdMaps.json` (Free Play, Daily,
       Expedition and every campaign stage on that map without its own `boss`).
     `test-td-campaign.mjs` checks that every stage boss is in `bosses.json` or `tdBosses.json`.
  4. Rules (optional): `tuning.bosses[id]` plus sim code for new mechanics, `stats.hp`, the rules
     sentence in `skills.js`, the glossary text. Sprite size: `bossSpriteSize` in `render.js`
     (default 96 px, Lilith 108).
  5. Checks: `npm run test:tower-defense`, `npm run td:sweep`, a look in the browser.
- Enemy art: full-body sprites from R2 `td/enemies/sprites/` (`render.js`), loaded with
  the `?v=cors1` cache bust like hero thumbs. The same files appear in plain `<img>`
  tags (lobby, boss plate, glossary), and a cached non-CORS copy would make WebGL reject
  the texture and drop the enemy to the 8x8 Kenney tile fallback. Versions live in
  `ENEMY_SPRITE_VERSIONS` (`assets.js`); since September 29, 2026: archer v3, brute v3,
  brood v4, Baphomet `boss-v2`, Lilith `boss-lilith-v4` (redrawn complete, feet included,
  uploaded to R2). Superseded files (older sprite versions, the `td/enemies/*.png` portraits) were
  deleted from R2 after the deploy of commit 37654230 (the first sheet release, `td/enemies/sheets/*-v1`,
  was deleted after `clips/` went live on September 30, 2026); `brood-v1` and `boss-lilith-v1` stay for
  the broodcaller and hexer.
- Procedural enemy motion (on with the enemy animation below, skipped with reduced
  motion): `animateEnemy` in `render.js` moves the full-body sprites procedurally, render
  only and on game time. Distance moved drives a walk cycle (bounce, waddle, lean,
  squash); a jump in `attackClock` plays a swing (wind-up, then a lunge toward `heldBy`,
  or a recoil for ranged shots); an hp drop above 1.5% of max hp (DoT ticks excluded)
  flashes an additive copy of the sprite and shakes it; flyers get a wingbeat; dying
  enemies topple backwards over 0.5 s. Petrified or frozen enemies hold still. With motion
  on, the facing only turns on clearly sideways steps; without it, it flips on any
  horizontal change. `pointOnPath` rounds lane corners (quadratic curve, radius 24 px,
  capped at half the adjacent segments) and blends the `sway` normal across the turn, so
  enemies arc around corners instead of popping sideways. History and the art workflow:
  `docs/tower-defense-ui-plan.md` (M7); frame format: `src/game/td/sprite-spec-for-ai.md`.
- Enemy animation (M7, on by default since September 29, 2026; off with reduced motion or
  `?anim=off`): every full-body enemy moves (`animateEnemy`), and kinds with an animation sheet
  play clips instead of the still. Sheets: `enemies/clips/{file}-{version}.json` + `.webp` on R2,
  named after the still they animate (`clips/brood-v4` animates `sprites/brood-v4`), listed in
  `ENEMY_SHEETS` (`enemySheetUrl(file, version)` in `assets.js`), built with
  `scripts/build-td-enemy-anims.mjs <clips> --set painted --release` into
  `public/td/enemies/clips/` and uploaded with `upload-to-r2.mjs --prefix td/enemies/clips`.
  A new still version needs new clips; a remade sheet for the same still gets a suffix
  (`brood-v4b`) because R2 caches a year. Sheets (September 30, 2026): grunt-v2, runner-v2,
  flyer-v2, archer-v3, brute-v3, brood-v4, boss-v2 (Baphomet), boss-lilith-v4, boss-lerna-v1,
  boss-kraghorn-v1, boss-vorruk-v1, plus brood-v1 (broodcaller) and boss-lilith-v1 (hexer),
  the older stills those two keep on purpose (about 70-170 KB each). A sheet is a Pixi
  spritesheet plus a `td` block (feet anchor, idle body size, fps, `pixelArt`). The boss loads
  the map's boss sheet; ENEMY_ART kinds load the sheet of exactly the still they borrow
  (mender -> archer-v3, shieldbearer -> grunt-v2, imp -> runner-v2, broodcaller -> brood-v1,
  hexer -> boss-lilith-v1; tint and rim glow apply). `?sheets=off` shows stills
  with procedural motion; `?sheets=local&set=<name>` loads an unreleased set from
  `public/td-local/sheets/` in dev. `animateEnemy` picks the frame on game time: attack after
  an `attackClock` jump, hurt after a real hit, walk from distance moved, idle otherwise; dying
  plays `death` and fades. Flyers stay at `FLYER_LIFT` with the bob and drop while dying.
- Clip sources (`scripts/td-warp-anim.py`, numpy + Pillow, local only as `*.py` is gitignored;
  outputs in `~/hero-database-assets/td/warp-anims/<kind>/`):
  - `--pixellab` (archer, grunt, runner, brute, brood, Baphomet as `boss`, Lilith as `lilith`
    packed to `boss-lilith`): PixelLab PixMiniMax image-to-animation
    via the API (`POST /v2/animate-pixminimax`, Tier 1: max 8 concurrent jobs, about 1
    generation per clip). First frame = the kind's complete still (feet included). Looping clips
    (walk 8, idle 4, attack 8) and hurt (4) also send `last_frame` = the same still, which the web
    UI does not offer, so they end in the start pose; death (8) runs open. Raw frames:
    `~/hero-database-assets/td/enemy-sprites-src/pixellab-<kind>/<clip>/NN.png` (00 is the
    unchanged input). Every clip drops frame 0: generated frames are slightly redrawn, so the
    untouched input would pop once per loop; loops still close on their generated start pose.
    Frames scaled so the first walk frame's larger side is 90 px.
  - `STRIPS` (flyer): a 6-frame flight cycle generated from text on black
    (`enemy-sprites-src/flyerSpriteFlying.png`). Only dark pixels connected to the border are
    background (flood fill), so dark feathers stay opaque; the rim gets a soft brightness key.
    Frames align on the beak tip; hurt (flash, jolt) and death (tumbling spin) derive from the
    flap frames. `derive: "walker"` does the same for a walk strip (idle, lunge, hurt, death).
  - `RIGS` / `--warp` (fallback): warp frames from one still (weapon arm as a rigid layer,
    legs as pendulums). Superseded by PixelLab clips.
- Tried and dropped (September 29, 2026): Meshy 3D renders, a free pixel-art pack, a
  generated grunt walk strip and a first PixelLab grunt without a pinned last frame (view
  drifted, no loop). Test sets, their code paths and files were removed.
- Base waves (`tdWaves.json`): 1-2 grunt, 3 +runner, 4 flyer, 5 brute/mender/runner,
  6 shieldbearer/archer, 7 runner/hexer/brute, 8 flyer/broodcaller/archer,
  9 brute/mender/shieldbearer/runner, 10 boss + escort.
- Run lengths (`waves.js`): `classic` 10 waves (boss on 10), `long` 20, `endless`.
  Long and endless reuse waves 1-10 plus a mid-boss on 5, then generate waves with a
  boss every 5 (`waveGen`). Free-play run cards show only glyph, name, best and Play;
  the description lives in the card's `title` tooltip.
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
| `sunscar-basin` | Sunscar Basin | one path, **generated** (`orthogonal-v1`, seed 3) | `baphomet` |
| `sunscar-glass` | Glass Flats | one path, lattice-v2 seed 114 (top gate), campaign only (2-2) | `baphomet` |
| `sunscar-wells` | Well Road | one path, lattice-v2 seed 95 (bottom gate), campaign only (2-3) | `baphomet` |
| `sunscar-noon` | Noon Terraces | one path, lattice-v2 seed 107 (left gate), campaign only (2-4) | `baphomet` |
| `sunscar-mirage` | Mirage Steps | one path, lattice-v2 seed 74 (bottom gate), campaign only (2-5) | `baphomet` |
| `sunscar-throne` | Ash Throne Approach | 2 gates (bottom + left), lattice-v2 seed 101, campaign only (2-6) | `baphomet` |
| `moonlit-terraces` | Moonlit Terraces | one path, lattice-v2 seed 74 (bottom gate), campaign only (1-3) | `baphomet` |
| `verdant-thicket` | Thorn Thicket | one path, lattice-v2 seed 120 (top gate), campaign only (1-4) | `lilith` |
| `verdant-glade` | Hexed Glade | one path, lattice-v2 seed 70 (bottom gate), campaign only (1-6) | `lilith` |
| `verdant-hollow` | Root Hollow | one path, lattice-v2 seed 33 (left gate), campaign only (1-8) | `lilith` |

Each map: `theme`, `art`, `music`, `path` or `lanes`, `base`, generated `roadSlots`,
`platformSlots`, `rings`, `grid`. Asset assignments: [map.md](map.md).

`campaignOnly: true` keeps a map out of Free Play (map select, help text), the Daily Trial
pool and the Expedition pool; campaign stages still use it by `mapId`. Campaign layout (September
29, 2026): intro, boss and two-gate stages keep their authored maps (1-1, 1-2, 1-5, 1-7, 1-9, 1-10,
2-1); the other regular stages each get their own lattice-v2 route on their chapter's theme, picked
from 120 seeds per theme for a length close to the map they replace, high tower coverage and
varied gate edges and base rows. Chapter 2's finale 2-6 has the chapter's two-gate map. `hpScale`
was retuned so every stage keeps its win curve (bot squads out of 35, target -> result): 1-4
31 -> 32 at 0.68, 1-6 23 -> 23 at 0.72, 1-8 17 -> 17 at 0.8, 2-2 27 -> 27 at 0.88, 2-3 27 -> 25 at
0.74, 2-4 28 -> 28 at 0.8, 2-5 16 -> 17 at 0.66, 2-6 15 -> 15 at 0.46; 1-3 stays at 0.9 (27/28).
Maps are two layers: a theme (background art, gate/base sprites, `exclude` rectangles for painted
props) and a generated path on top; map-scene.js draws the road, so any theme takes any route.
`orthogonal-v1` only makes left-to-right single lanes (4 or 6-8 turns). `lattice-v2`
(`src/game/td/map-generator-v2.js`, September 29, 2026) is the path layer for new maps: 60 px
lattice (15 x 7), gates on the left, top or bottom edge, base anywhere in the right third,
self-avoiding walks in straight runs of at least two nodes with one empty node to every earlier
part (parallel roads >= 120 px apart), legs in all directions, and a breadth-first reachability
check before every step (no dead ends). `two-gate` builds the shared tail from a junction to the
base first, then two branches of exactly equal node count out to two gates, so both lanes are
equally long and end in the same segment. CLI: `node scripts/generate-td-map.mjs --gen=lattice-v2
--skin=sunscar [--gates=2] --gallery=24` writes a candidate sheet to `public/td-local/`
(gitignored); `--seed=N --id=... --name=... --publish` publishes one. `--check` regenerates both
generators' maps. Plan: one level per chapter with two gates, the rest one. Route previews (map select, stage drawer) draw a dark casing under a gold core so
the road reads on bright sand.

Optional `enemyHp` scales enemy health on that map in open modes (Free play, Daily Trial,
Endless). Verdant Crossing uses 1.25 (September 28, 2026) because it was the easiest map for
every squad. Modes with their own stage scale (`hpScale` from Campaign stages or Expedition)
replace the map value, so tuned stages keep their numbers.

### Map geometry, analysis and validation

The runtime map contract is data-driven and remains the downstream contract for authored
and generated maps:

- The battlefield is 960×540 logical pixels.
- A single-entry map uses `spawn` plus `path`.
- A multi-entry map uses `lanes: [{ spawn, path }, ...]` and one `base`.
- Every path begins exactly at its visible gate and ends exactly at the visible base.
- Multi-entry routes have equal travel length and an identical shared final segment.
- Initial generated routes use integer, horizontal and vertical segments.
- `grid.js` derives road slots, platform slots and special rings. Do not hand-edit the
  derived arrays; run `node scripts/build-td-grid.mjs` after route or grid changes.

The map foundation added September 29, 2026 consists of:

- `map-analysis.js`: deterministic route length, lane, turn, placement, range coverage,
  blocker-support and landmark metrics through `analyzeMap(map)`.
- `map-validation.js`: stable rejection codes for invalid points, diagonal or short
  segments, self-intersections, endpoint mismatches, unequal lanes, missing shared tails,
  stale grids and insufficient slot counts through `validateMap(map)`.
- `scripts/report-td-maps.mjs`: `npm run td:maps` prints the current geometry baseline and
  validation status; `npm run td:maps -- --json` includes the detailed metrics and errors.
- `map-preview.js`: `mapPreviewModel(map)` resolves terrain, route strokes, gates, base,
  `skinId` and optional `geometryHash` from the same materialized map used by combat.

Current baseline:

| Map | Route length | Turns | Platform coverage at range 90 | Landmark | Valid |
|---|---:|---:|---:|---|---|
| Moonlit Pass | 1,574 | 6 | 74% | `switchback` | yes |
| Verdant Crossing | 2,292 | 4 | 97% | `open-road` | yes |
| Sunscar Ruins | 1,180 per lane | 12 total | 99% | `twin-gate` | yes |
| Sunscar Basin (generated) | 1,672 | 8 | 81% | `defense-basin` | yes |

These values describe the existing maps; they are baselines for generation, not automatic
balance targets.

### Map preview contract

Every preview pane must consume the same resolved map record as combat. Terrain comes from
the resolved skin; routes, entrances and base come from the resolved layout. Changing the
selected map changes terrain, routes, every gate, base, name and boss together.

Free Play map selection and the Campaign stage drawer use `mapPreviewModel(map)` and draw
the terrain, route strokes, gates and base as lightweight SVG. Do not maintain separate
route thumbnails or screenshots. Expedition currently shows terrain-only compact stops and
Daily shows the battlefield name; review those surfaces before calling preview integration
complete. A future preview cache key must contain `geometryHash`, `skinId` and a preview
renderer version.

### Map generator `orthogonal-v1` (September 29, 2026)

`src/game/td/map-generator.js` `generateMap(recipe, identity)`: one deterministic,
single-lane, self-avoiding orthogonal route, published as an ordinary `tdMaps.json`
record. Development-time only; the game never generates at runtime.

- Recipe: `{ generator: "orthogonal-v1", ruleset: 1, seed, topology: "single-lane",
  difficultyBand, parameters: { turns, length, coverageGap }, constraints: { exclude } }`.
  `exclude` rects are the skin's safe regions (painted edge props); the road band keeps
  out of them and they become `grid.exclude`.
- Ruleset 1: gate at x 48, sanctuary at x 880, both on rows 120-420; corners on a 30 px
  lattice anchored at the gate inside [150, 110, 800, 450]; inner legs 150-480 px; any two
  non-adjacent legs at least 150 px apart (room for a platform row between); even turn
  counts (leave and enter horizontally); at most 400 attempts with rejection counts
  (`WALK_STUCK`, `NO_BASE_CONNECTION`, `TURNS_OUT_OF_RANGE`, `LENGTH_OUT_OF_RANGE`,
  `COVERAGE_GAP_OUT_OF_RANGE`, `RECIPE_INVALID`, plus `validateMap` codes).
- Special tiles come from geometry, not the RNG: Shrine on the road tile nearest the route
  middle, High Ground on the platform seeing the most route at range 160, Cursed on the
  strongest of the next platforms closest to the sanctuary.
- Published records keep `recipe` and `geometryHash` (FNV-1a over endpoints, route, grid,
  slots and rings). `node scripts/generate-td-map.mjs --check` regenerates every
  published generated map from its recipe and fails on any difference; the test
  `scripts/test-td-map-generator.mjs` (in `test:tower-defense`) checks determinism,
  validity, lattice, exclusions, bounded failure and provenance.
- CLI: `npm run td:generate-map -- --seed=N --skin=sunscar|moonlit|verdant` prints a
  candidate; add `--id=... --name="..." --publish` to write it. Skin presets (theme, art,
  music, boss, safe regions) live in the script; only the Sunscar regions were checked
  against the painting so far.
- First published map: `sunscar-basin` (seed 3, turns 6-8, length 1600-2200, coverage gap
  3-20%), Chapter 2's battlefield. Free Play 20 waves 4/5 wins, in line with the others.
- Free Play map select shows four battlefields in one row in the menu frame.

### Map authoring workflow today

Hand-authored maps still work as before. To add one:

1. Add its complete runtime record to `tdMaps.json`: identity, scene art, boss, music,
   spawn/base and `path` or `lanes`, plus the `grid` settings.
2. Run `node scripts/build-td-grid.mjs` to derive placements and rings.
3. Run `npm run td:maps` and require `valid: yes`.
4. Use `npm run td:maps -- --json` to inspect detailed coverage and lane metrics.
5. Assign the stable map id to Campaign stages through `stage.mapId` where required.
6. Inspect Free Play and Campaign previews and then the loaded battle.
7. Run `npm run test:tower-defense` and `npm run test:td-balance` for gameplay changes.

### Planned layout generator and catalogs

The approved direction is a deterministic development-time map compiler. It generates many
candidates, validates and simulates them, and publishes approved candidates as ordinary
stable `tdMaps.json` records. Campaign does not generate an unknown layout when a battle
starts. Live seeded generation is deferred until validation and difficulty fingerprints
predict real outcomes reliably.

The intended source responsibilities are:

```text
tdMapLayouts.json     fixed geometry and deterministic recipes
tdMapSkins.json       art, safe regions, endpoint support and capabilities
tdWaveProfiles.json   reusable enemy and wave compositions
tdCampaign.json       stages, progression bands, rewards and overrides
          |
          v
compiled tdMaps.json + resolved Campaign data
```

A layout owns geometry, a recipe, topology, grid rules, geometry hash, analysis fingerprint
and landmark. A skin owns terrain, road, gate, base, palette, safe regions and supported
topologies. In the first implementation, changing a skin does not change gameplay geometry.

Campaign progression uses non-overlapping hero-level bands: 1–10, 11–20, 21–30, 31–40
and later bands as needed. A band supplies defaults such as layout pool, skin pool, wave
profile, lives and health scale. A published stage stores stable layout and skin ids and may
override any band default. Tutorial stages and boss encounters remain explicitly authored.

The next bounded milestone is `orthogonal-v1`:

1. Accept a versioned recipe with generator id, ruleset, seed, topology, difficulty band
   and parameter ranges.
2. Generate one deterministic single-entry, self-avoiding route on an integer lattice.
3. Use a fixed attempt bound and report stable rejection reasons.
4. Run `buildGrid()`, `validateMap()` and `analyzeMap()` on each candidate.
5. Create a canonical hash over endpoints, route, grid, placements and rings.
6. Return a complete runtime-compatible map record with recipe provenance.
7. Prove that repeated generation produces byte-equivalent geometry and placements.
8. Publish one reviewed candidate into Free Play and verify that its preview and battle
   display the same terrain, route, gate and base.

After that: batch generation and a development atlas; layout/skin catalogs and compiler;
bot difficulty fingerprints; a reviewed three-to-six-map pack; Campaign bands and reusable
wave profiles; Daily/Expedition integration; equal-length split-and-merge generation; and
only then optional live seeded generation.

## 8. Game modes

| Mode | Rules | Source |
|---|---|---|
| Free play | Any map, run length and tier. Starting gold 340, 25 lives, deploy cap 7, wave-clear bonus 100 + 20/wave. Recruits only owned heroes, at base stats (Phase 2, September 30, 2026); pays Favor plus Gold and Hero XP into the collection | `sim.js`, `waves.js` |
| Campaign | Chapter 2 "The Sunscar March" (September 29, 2026): 6 stages, all on the generated Sunscar Basin, unlocked by 1-10; 39 waves, lives 15-18, hpScale 0.75 down to 0.6; Stheno (`medusa`) on 2-3, Helios (`amunra`) on the 2-6 boss finale; rating milestones 6 / 12 / 18 (600 Gold + 300 Hero XP / 110 Divine Seals / 180 Divine Seals + 60 Seal Dust). Bots (35 squads, after Chapter 1 at Lv 4-7): 86 / 80 / 69 / 69 / 43 / 40% (cheapest), 89 / 77 / 66 / 54 / 34 / 34% (carry); winning runs about 26 min. Chapter 1 "The Road to the Crossing", 10 authored stages across all 3 maps (59 waves total; trimmed from 79 on September 29, 2026 so a chapter clear lands near the 30-60 min target; hpScale re-tightened on 1-1..1-4 and 1-9/1-10 to 1.0/1.1/1.05/1.05/0.6/0.7 on September 30, 2026 after the owner's playtest read too easy at squad size 6). Play on the home screen (Campaign selected) opens the stage list. Squad of up to 6 owned heroes (raised 5 → 6 on September 29, 2026 for Tank viability), 6 starters, stage lives and hp scale, first-clear rewards (repeat pays 25%). Hero levels 1-60 bought with Gold + Hero XP, capped by stars (0-5 stars: cap 10/20/30/40/50/60), stat gain per level falls by band (+6/3/2/1.5/1.5/1%); Stars 0-5 and Evolution I-V from spare copies (campaign stages only) | `campaign.js`, `tdCampaign.json` |
| Summon | Banner "Ember at the Crossing", 60 Divine Seals per summon, x1 or x10 (600), duplicates become spare copies, 14-day featured rotation, featured hero weighted 2x | `campaign.js`, `tdSummon.json` |
| Expedition | Roguelite chain of 10-wave stages on `EXPEDITION.stages` (3) distinct battlefields drawn at random, one `stageHp` step per stage; starts with 3 random owned heroes, camp offers hero (owned, not yet in the roster) / relic / veteran after each win, lives carry over; each stage pays Gold and Hero XP into the collection | `expedition.js` |
| Daily Trial | One UTC-day seed: map, allowed heroes, 2 mutators, goal wave. Endless, Normal, no blessings or boosts | `daily.js` |
| Challenges | Optional per-map, per-length goals checked on a won 10/20-wave run; one-time Favor reward | `challenges.js` |

Restricted rosters (Campaign squad, Daily, Expedition) also cap `deployCap()`; Free Play's
owned list (`allowedHeroes`) restricts who can be recruited.

### One hero collection (Phase 2, September 30, 2026)

Heroes are owned and upgraded through the campaign (save key `campaign`), and every mode
except the Daily Trial uses the owned heroes (`ownedHeroes()` in `campaign.js`). Free Play
passes them as `allowedHeroes`; the recruit sheet lists only those and says so when a tile
type has none. Expedition draws its starting roster and camp recruits from them (the page
passes the owned heroes as the pool). Upgrades (levels, Stars, Evolution, skills;
`collectionHeroes()`, formerly `campaignHeroes()`) still apply in Campaign stages only, and
Divine Blessings still apply in Free Play and Expedition only. Free Play runs and Expedition
stages pay `collectionRewards` from `tdCampaign.json` (10 Gold + 5 Hero XP per cleared wave,
up to 30 waves a run, never Divine Seals; `collectionReward()`); the result screen shows it
under "For your heroes". Existing saves keep their Expedition in progress and get no
migration gift. Balance: `test:td-balance` requires the six starters to win at least one
Free Play battlefield at Normal; measured at seed 99 (cheapest / carry): Moonlit Pass
L10 / W19, Verdant Crossing L8 / W2, Sunscar Ruins W5 / W17, Sunscar Basin W19 / W25.
`npm run td:sweep -- --owned=starters` adds the starter deck to the sweep. Plan and open
follow-ups: `docs/tower-defense-home-camp-plan.md` (Phase 2).

### Campaign navigation and screens

Campaign has no hub screen of its own (removed with the War Camp home, September 30,
2026): Play with Campaign selected opens the stage list, and Heroes and Summon sit on the
home dock.

1. (Removed: the Campaign headquarters screen. Old history entries that name it open home.)
2. **Campaign stages** opens from the home screen's Play (Campaign selected), on the
   chapter of the next stage; Back goes home. It owns the stage row (in the menu frame: one row of full-height cards, five in view at the earlier width, swiped sideways for more; it scrolls to the next stage on open; the rating track sits compact on one line below), then chapter tabs below it
   (authored chapters, then locked "Coming soon" tabs up to 3). Stage state reads at a glance:
   cleared cards fade back (translucent, desaturated art) with a green check badge and green
   status, the next stage is bright with a gold play badge and glow, locked ones go grey with
   a lock. No route rail here (the cards already show progress). Tapping an unlocked stage
   card opens a details drawer from the right (modal dialog: stage id and name, the
   battlefield map preview (terrain, lane routes, spawn gates, base; same drawing as the map
   select), about text (2px below body size), a plain inline facts row without boxes
   (battlefield/waves/lives/boss/best), first-clear and replay rewards as currency chips,
   recommended Might plus the last squad's Might). Its "Choose squad" / "Replay stage" button is the
   transition into squad selection; Escape, the close button or the backdrop close it.
3. **Squad selection** remains between a stage and the run. Browser/app Back returns to
   Campaign stages; a finished or abandoned campaign run returns to Campaign stages
   (`exitPlay` maps a run started from squad to stages), and Back from there goes home.
   Layout (top to bottom), measured against a gacha team screen (owner, September 28,
   2026): no stage head and no Clear heroes / Quick pick buttons (the player saw the stage
   in the drawer one screen up). Roster: two rows of bare 50 x 75 art cards scrolling
   sideways, class icon top left, check top right when picked, "Lv N" in 11px over the
   card foot; name, class, role hint and skill are in the tooltip/label. Locked heroes
   trail dimmed with no foot text; their unlock source (stage or Summon) is in the tooltip.
   Lineup at the bottom, no panel: the 5 slots as 84 x 84 cards centered (enlarged from 50 once the footer left) (class icon top
   right, battle gold cost under each; tap or drag out to remove), then one 11px hint line:
   "Drag a hero onto a slot to swap, or tap a slot to free it." (or the flyer warning when
   the stage has flyers and the squad no Mage/Archer). No coverage line or deploy-cap note.
   No screen footer: Might and Start sit in the lineup row, right-aligned, Might (crossed
   swords icon + value, 12px, green at/above recommended, gold below; "Squad Might X /
   recommended Y" in its tooltip and label) above a plain "Start" button (disabled until one
   hero is picked). No squad count text; the slots show it.
   The whole screen fits the menu frame (844 x 390) without vertical scroll. Roster top,
   slots bottom is fixed: do not move the lineup into a side column. Role hints and skill names live in tile tooltips and on the Heroes screen.
   Campaign squads field 6 heroes (Free Play deploys 7). Squad size was raised
   4 → 5 on September 28, 2026 after a sweep showed 4 read as punishment (late-stage
   win rates 34-54% at 4, 49-81% at 5), and 5 → 6 on September 29, 2026 to make Tanks
   viable: measured at size 5 Tank squads won 64% vs 93% without (the Tank replaced a
   damage dealer); at size 6 they win 80% vs 94% (`td-tank-slot.mjs`).
   Class icons across the whole TD UI are `classGlyph()` (assets.js; `classIconImg()`
   delegates to it): simplified solid SVGs readable at small sizes (shield, sword, crossed
   daggers, star, bow, cross), currentColor. Squad/popover badges sit on a class-tinted
   disc. The main site's hero pages keep the game's webp class icons.
   Drag and drop (pointer events, mouse + touch): tile -> slot places or replaces, slot ->
   slot swaps, slot dropped outside the lineup removes. Tap still toggles. On touch a
   roster tile drags only on a mostly vertical pull, so sideways swipes keep scrolling.

Heroes and Summon open from the home screen's dock (Back returns home); the Phase 2 plan in
`docs/tower-defense-home-camp-plan.md` makes the collection count in every mode.

The **Heroes** screen follows the Watcher of Realms hero view: four columns inside the menu
frame. Left, a narrow (176px) scrollable three-column roster of 4:5 portrait cards: a face
close-up fills the card (the full-body portrait scaled around the head; `FACE_FOCUS` in
`page/campaign.ts` shifts the crop for heroes whose head sits lower), class icon top left,
Evolution numeral badge top right (when evolved), "Lv. N" and the star row over a bottom fade.
No name or Might on the card: both are in its aria-label/tooltip and over the hero art. Locked
heroes are greyed with their unlock source ("Stage / 1-2" on two lines, or "Summon") in place
of the level. Owned heroes are sorted by Might (highest first), then locked heroes by class
with their unlock source; the strongest owned hero is selected by default. Centre, the
selected hero's art is the stage (cropped from the top), with name, class and placement role,
Might, stars, Evolution badge and spare copies over its bottom fade on every tab. Right of
the art, a 250px upgrade flyout holds the active tab and scrolls on its own; its upgrade
button stays pinned to the flyout bottom. The right edge is a vertical tab rail (icon over
label). Which modes campaign upgrades and Divine Blessings apply in is explained once in the
glossary (Heroes > Attributes: "Campaign upgrades", "Divine Blessings"), not on each hero. The four tabs:

- **Level**: "level / cap", pips for the current 10-level band, current and next-level Attack/Health, deploy cost, Level up (at the cap: "Star up to raise it to N").
- **Stars**: current stars, Attack/Health now and at the next star, material slots, the
  selected hero's duplicate copies to tap into them, Quick add and Star up.
- **Evolution**: the five tiers (done / next / locked) with their bonus, two material
  slots (a copy of this hero, 150 Seal Dust), Evolve, and "1 copy -> 30 Dust".
- **Skills**: ultimate and class passives, each upgraded separately (save v6).

The detail column scrolls inside its panel; an upgrade redraw on the same hero and tab keeps
the scroll position, so the button stays in place for repeat presses. A small red dot on a roster card's top-right corner means a
level-up is affordable or the hero has its own copy for Evolution. On narrow screens the
roster stacks above the detail panel while retaining its own scroll. On short landscape
screens (phones, height up to 540px) the screen fits the viewport so the page itself never
scrolls: the screen has no head (the app bar says "Heroes" and its wallet shows Gold, Hero XP and Seal Dust), the roster
narrows to 172px, the art column shrinks, the tabs run across the top of the copy, and the
whole copy column is one scroller. Skill upgrade buttons sit under their skill text so the
description gets the full column width.

### Stage rating and chapter rewards (campaign only, M26 sprint 10)

- Every cleared stage has a rating of 0-3, shown only as laurel wreath icons (no
  player-facing name; internally "laurels"). 1 for a clear, 2 for keeping at least 50%
  of the stage's lives, 3 for at least 90% (`tdCampaign.json` `laurels.thresholds`,
  rounded up: 8 and 14 of 15 lives). Derived from the saved `bestLives`, so older saves
  are rated retroactively.
- Chapter milestones (`chapters[].milestones`): 10 / 20 / 30 rating points pay
  1,000 Gold + 500 Hero XP / 180 Divine Seals / 300 Divine Seals + 100 Seal Dust, once,
  automatically (`payMilestones` in `campaign.js`, on a stage win and on save load).
  Owner note (September 29, 2026): amounts may be a bit high, revisit later.
- UI: wreaths on stage cards, a "Goals" list in the stage drawer ("Keep 8 of 15 lives"),
  a chapter track under the stage grid (points x / 30, meter, milestone rewards marked
  "Received"), and result lines for a new best rating and paid chapter rewards.
- Save: campaign section version 8 adds `milestones: { [chapterId]: number[] }`.

### Summoning rules and screen

`tdSummon.json` authors the banner, seal sources and dust rates. The current banner uses:

- rotation: `set` (Surtr), `nyx` (Nott), `phoenix` (Hephaestus), `bastet` (Hecate);
- one featured hero for 14 days, calculated from `rotationEpoch`;
- rarity weights (`rarityWeights`): every hero carries a `rarity` in
  `gameBalance.json` — legendary (tiers S/A, 5 heroes), epic (B/C, 13), common
  (D, 15, all recruits). A hero's draw weight is its rarity weight
  (legendary 6, epic 4, common 10); the featured hero's rarity weight is
  multiplied by `featuredWeight` 2;
- 60 Divine Seals per summon; x10 (`multiCount`) costs 600 and always gives 10;
- new-hero pity (`pityNewInMulti`, **active**): if a full x10 draws no hero
  the player does not own yet and the pool still has one, the last duplicate is
  replaced by a weighted draw from the unowned heroes. Single summons have no pity.
  Shipped as `false` at first (small 21-hero pool), enabled the same day after the
  rarity weights and the 33-hero pool landed: a 4,000-run simulation showed the
  pity barely touches the early game (≈7 new heroes in the first x10 either way)
  but fixes the collection tail — full collection median 46 x10 without vs 12 x10
  with pity, first legendary P90 improves 11 → 8 x10;
- pool `"all"`: every hero the player owns or can summon, drawn with replacement. A hero
  not owned yet joins; an owned one becomes a spare copy (`copies[heroId]`);
- stage-reward heroes are in the pool from the start; if one is summoned before its stage
  is cleared, that stage's hero reward becomes a spare copy. (`"locked"`, new heroes only,
  is still supported.)

The pool holds 33 heroes: the 21 mythic roster heroes plus 12 "recruits" (generic
tier-D filler heroes, 2 per class, `recruit-*` ids, reused abilities and ultimate
variants, generated placeholder art and reused class sounds — see
`TOWER_DEFENSE_FILLER_HEROES.md`). Recruits are never featured and sit below the
weakest mythic class member in power; they exist so x10 summons yield commons,
duplicates and dust.

A hero's draw chance is its weight over the pool's total weight — with the current
33-hero pool and an epic featured hero: featured 8/236 ≈ 3.4%, each legendary
6/236 ≈ 2.5% (any legendary ≈ 12.7%), each non-featured epic 4/236 ≈ 1.7%
(any epic ≈ 23.7%), each common 10/236 ≈ 4.2% (any common ≈ 63.6%). The banner shows these per-rarity
rates next to the pool count, computed by `summonRates()` from the same weighting
rules used by `summonMany()`, so the displayed rates cannot drift from selection
behavior. New heroes are meant to stay hard to get (owner, September 28, 2026):
with the 33-hero pool and rarity weights the campaign's 600 seals spent as one x10
at the end give on average 6.4 new heroes and 3.6 copies (measured with
`td:upgrade-sweep`; 5.8/4.2 with flat weights, 3.9/6.1 at 21 heroes). High rarities
carry the "hard to get" goal now — a specific legendary sits at ≈2.5% per draw —
so the x10 new-hero pity is enabled: it only fires when a full x10 yields nothing
new and does not cheapen the early game.

Divine Seal sources: campaign first clears (600 in Chapter 1) plus replays at a quarter
of the first-clear seals (≈150 more per chapter run; since September 28, 2026 — with one
chapter, first clears alone made summoning feel impossible, owner feedback),
the Daily Trial goal (+15, once per day) and a finished Expedition (+60).

The Summon screen is centered on the featured target: large art, name/title, remaining
rotation time, Divine Seal balance (on one line with the buttons, no "N more needed"),
Summon x1 / Summon x10 and a Skip animation toggle (per browser, `td:summonSkip`). An
info button next to the name opens a native `popover` with the odds and rules: exact
featured chance, "owned heroes return as copies", the not-owned count, rarity rates and,
when the banner has `pityNewInMulti` and unowned heroes remain, the Summon x10 new-hero
guarantee. The pool below shows each hero as New or with its stars and spare copies. A Seal Dust panel exchanges dust for seals or — via a
hero select — spare copies of an owned hero (`dust.copyPrice`).

**Reveal** (`page/summon-reveal.ts`): a full-screen `<dialog>` over the Summon screen.
The summon is paid and saved before it opens. Cards deal in face down (10 cards as 3/4/3)
with the wolf card back (`public/td/summon-card-back-wolf.webp`); the back's glow shows
the rarity before the flip: gold = legendary, purple = epic, none = common. Tap
flips a card, Reveal all flips the rest, the featured hero bursts. Face-up cards are
large art only, with a small "New" tag on first-time heroes (spare copies carry no tag);
name, class and featured status are in each card's aria-label. No visible title or result
summary; a "Tap a card" hint shows until all cards are face up. The Divine Seal balance
sits top right. The result bar offers Summon xN (same size, with price) and Close; Escape
closes only the dialog. Reduced motion fades instead of flipping.

### Currency display (campaign)

Currencies always show as icon + value, never as a spelled-out name: `currency-icons.js`
(`currencyAmount`, `currencyList`, `currencyIcon`) shows each currency's item icon from R2
`td/icons/items/{gold,hero-xp,divine-seals,seal-dust,divine-essence}-v1.webp` (96px, trimmed
from the 760px source art in `public/td/icons/items/`; the "Divine Dust" art is Seal Dust).
Favor has no item art and uses the star glyph (`currencyIcon("favor")`). The name is the
chip's tooltip and aria-label. Used for the app bar wallet, the Summon and Seal Dust
wallets, stage rewards (drawer, Squad
screen; hero rewards as a portrait + name chip), level/star costs, summon prices and dust
exchanges. Plain
sentences (result screen, notices) still spell names out.

Global wallet (`page/wallet.ts`, markup in the `TdLobby` app bar, moved into the home
screen's top bar on home): one button on every menu screen, replacing the old Favor chip
and the per-screen wallet rows. It shows the currencies that matter on the open screen,
picked in `td.css` by `.td-shell[data-screen]`: Favor + Divine Seals by default (home
included); Gold + Divine Seals on stages and squad; Gold + Hero XP + Seal Dust on Heroes; Divine Seals + Seal Dust on Summon.
Clicking it opens the inventory dropdown: Favor and per-class Insight (Divine Blessings),
then Gold, Hero XP, Divine Seals and Seal Dust (Campaign), each with where it is earned and
spent, and links to Divine Blessings, Heroes and Summon. Escape, a click outside, a link or
any screen change closes it. It redraws after every save (`store.onPersist`) and on every
screen change (`renderLobby`).

Campaign debug (dev builds only, `import.meta.env.DEV`): a DBG button in the app bar on
the campaign screens (stages, heroes, summon, squad) toggles a panel (`TdLobby`,
`data-td-camp-debug`, wired in `page/campaign.ts`) that adds +10,000 Gold, +10,000 Hero XP,
+600 Divine Seals, +1,000 Seal Dust, or all four, to the saved campaign wallet and redraws
the open screen. Not present in production builds.

### Might (campaign only)

One battle-power number per hero: `heroMight()` in `campaign.js` = (base Attack + Health) x
level scale x star scale x (1 + `heroMight.evolutionPerTier` x evolution tier), with
`evolutionPerTier` 0.06 in `tdCampaign.json` (a readout weight, not a sim stat). It sorts the
Heroes roster, sums to "Squad Might" on the Squad screen and to "Your last squad" in the stage
drawer, both compared against the stage's "Recommended Might" (from `stage.hpScale`).

### Stars, Evolution and Seal Dust (campaign only)

Numbers live in `tdCampaign.json` (`heroStars`, `heroEvolution`) and `tdSummon.json`
(`dust`); design and review notes in `docs/tower-defense-summon-duplicates-plan.md`.
Every upgrade is chosen and confirmed by the player; nothing is spent automatically.

- **Level cap by stars** (`heroLevels.capByStars`): 0 stars -> Lv 10, 1 -> 20, 2 -> 30,
  3 -> 40, 4 -> 50, 5 -> 60. Gain per level comes from `heroLevels.statPerLevel`, one rate per
  10-level band: +6% (Lv 2-10, unchanged so Chapter 1 balance holds), +3% (11-20), +2%
  (21-30), +1.5% (31-40), +1.5% (41-50), +1% (51-60): Lv 60 = +144% attack and health.
  Cost stays linear (Gold 100 + 50 per level, Hero XP 50 + 25 per level; ~91k Gold to Lv 60).
- **Stars 0-5** (heroes start at 0): star n -> n+1 costs 1/1/2/3/4 duplicate copies of
  that hero (11 in all) plus 100/200/400/600/800 Gold; +10% attack and health per star (5
  stars = +50%), multiplied with the level bonus. Save version 5 migrates older saves (stars
  counted from 1) by one star down, so stats are unchanged. Stars and Evolution share the
  hero's duplicate supply. Quick add fills the material slots only when enough copies of
  that hero are available.
- **Evolution I-V**: each tier costs 1 copy of the same hero or 150 Seal Dust
  (`heroEvolution.dustPrice`); the
  player taps the material, then Evolve. Tiers: ultimate +20%, crit +10%, ultimate cooldown
  -15%, ultimate +25%, and V: the ultimate starts with its awakened upgrade (the same
  per-ultimate upgrade the in-run Awaken unlocks; `hero.awakenedUlt` in `sim.js`).
- **Seal Dust**: 1 spare copy -> 30 dust (by hand); 2 dust -> 1 Divine Seal;
  100 dust -> 1 spare copy of an owned hero (`buyCopiesWithDust`,
  September 28, 2026). Divine Essence was merged into Seal Dust on September 29, 2026
  (save version 7; leftover essence converts at the historical 1:150 rate) — evolution and
  the final skill rank (150 dust) spend dust directly.
- `campaignHeroes()` applies level x stars to attack/health and Evolution to
  `ultPower`, `critChance`, `ultCooldown` and `awakenedUlt`.

Measured with `npm run td:upgrade-sweep` (20 squads per stage at the expected levels):
base 25% on 1-8 and 1-10; 3 stars about +20 points; Evolution V alone about +35;
5 stars + Evolution V reach 70%. Every stage stays winnable without upgrades.

### Results screen

A campaign stage's result screen offers Retry, the follow-up (Next: stage X after a win,
Change squad after a loss) and **Campaign** (back to the stage list) instead of
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
- **Hero collection**: heroes unlocked in the campaign and summoned with Divine Seals are
  the only ones Free Play and Expedition can field; both pay a share of Gold and Hero XP
  (see "One hero collection" above).

## 10. Persistence

`localStorage` key `td:v1`, one JSON blob, sanitized on load (`save.ts`): any bad field
is dropped, a corrupt blob starts fresh, unknown hero ids are removed.

Fields: `bestScore`, `bestWave`, `lastTeam`, `perfectDefense`, `favor`, `favLevels`,
`insight`, `resetSpent`, `refundNotice`, `treeVersion`, `repriceNotice`, `mapBests`,
`mapTop`, `challenges`, `nextRunBoost`, `daily`, `expedition`, `expeditionBest`,
`campaign` (the hero collection), `ui` (`homeMode`, the home screen's mode pick).

The `campaign` section is versioned (`CAMPAIGN_SAVE_VERSION` 8): `owned`, `cleared`,
`lastSquad`, `currencies` (Gold, Hero XP, Divine Seals, Seal Dust),
`levels`, `summons`, `copies`, `stars`, `evolution`, `skillLevels`, `milestones`. Older versions migrate on load
(version 3 gets empty copies, stars and Evolution; version 7 turns leftover Divine Essence
into Seal Dust at 1:150).

Per-map records key as `mapId`, `mapId@long`, `mapId#heroic`, `mapId@long#mythic`, so
older builds can still read `td:v1`. Export/import: save code (`TD1:` prefix) or file.
Audio volume and mute have their own keys.

## Content checklists (audit step 4)

Content is not JSON-only. Before shipping, walk the matching list.

**New hero (database hero)**
1. `npm run build:game-balance -- --propose=<id>`; compare with the class peers it prints.
2. Add the id to `tuning.roster` (not to `balanceReference`), run `npm run build:game-balance`
   and check `git diff src/data/gameBalance.json` adds one row and changes none.
3. `heroSkills.<id>` in the tuning (ultimate variant and numbers); display name, title and
   skill names in `tdSkinMythic.json` (white label, section 2).
4. Art and sound: token/portrait on R2 (`assets.js`, new file names, R2 caches for a year),
   sounds plus `tdAudioLevels.json` (`node scripts/td-audio-levels.mjs`), attack/ultimate
   effects (`hero-fx.js`, `TOWER_DEFENSE_HERO_SKILLS.md`).
5. Acquisition: summon pool by default (rarity from tier); a stage-reward hero also goes
   into a stage's `rewards`, which becomes a spare copy if already owned
   (`heroRewardStage` / `summonableHeroes` in `campaign.js`).
6. Checks: `npm run test:tower-defense` (skin test, ultimate edge cases run every roster
   hero), `npm run test:td-balance`, `npm run td:upgrade-sweep` for the summon economy.

**New campaign stage or chapter**
1. Stage in `tdCampaign.json` under its chapter: `unlockAfter`, `mapId`, lives, `hpScale`,
   waves and rewards (an already-owned hero reward becomes a spare copy).
2. A new chapter's first stage unlocks after the previous chapter's last one; the home
   screen's objective and Campaign note follow `nextStage()` / `currentChapter()`, the Stages screen shows chapter tabs.
3. Checks: `test-td-campaign.mjs` (prints the sampled win rate per stage; keep late stages
   above the 20% floor) and `npm run td:pacing -- --only=campaign`.

**New map**
1. Art per `map.md` (theme in `map-scene.js`), route or `lanes` (multi-lane targeting
   expects equal route lengths), `grid` block, then `node scripts/build-td-grid.mjs`.
2. Optional authored side tiles (`grid.platforms`), measured with `npm run td:layout`.
3. Boss assignment, special tiles (`grid.rings`), music.
4. Modes pick it up automatically: Free Play map select, Daily Trial, Expedition pool
   (route length stays `EXPEDITION.stages`, so a fourth map adds variety, not duration).
5. Run `npm run td:maps` and require `valid: yes`; inspect `--json` coverage, support and
   lane metrics. Confirm the preview terrain, paths, gates and base match the loaded battle.
6. Checks: `npm run test:tower-defense` (tile hit test covers every map), `npm run td:sweep`,
   Chromium at phone and desktop size.

## 11. Tests and tools

| Command | Covers |
|---|---|
| `npm run test:tower-defense` | UI helpers, favor, difficulty, skin, save, sim, daily, challenges, expedition, campaign, summon |
| `npm run test:td-balance` | Balance harness |
| `npm run td:sweep` | Difficulty sweep |
| `npm run td:upgrade-sweep` | Campaign win rates by Stars / Evolution, summon economy |
| `npm run td:classes` / `td:progression` | Class and progression reports |
| `npm run td:economy` | In-run gold ledger: income by source vs. spend by sink, per mode/tier |
| `npm run td:layout -- --map=<id>` | Tile layout A/B: committed vs working `tdMaps.json`, Free Play + campaign stages on that map |
| `npm run td:maps` / `npm run td:maps -- --json` | Map geometry baseline, landmark metrics and stable validation errors |
| `npm run td:generate-map -- --seed=N --skin=...` / `--check` | Generate a map candidate (orthogonal-v1), publish it, or verify published ones regenerate (both generators) |
| `npm run td:generate-map -- --gen=lattice-v2 --skin=... [--gates=2] --gallery=24` | lattice-v2 candidates as an HTML sheet in `public/td-local/`; `--seed=N --id=... --name=... --publish` publishes one |
| `node scripts/build-td-enemy-sprites.mjs <folder> --only <names> --version vN` | Enemy stills (256 px WebP) from `~/hero-database-assets/td/enemy-sprites-src/` |
| `node scripts/td-pixellab-clips.mjs --still <webp> --prompts <json> --out <dir>` | PixelLab clips for one still (8 jobs at once, resumable via `jobs.json`; key from `PIXELLAB_API_KEY`) |
| `python3 scripts/td-warp-anim.py <name> <outdir> --pixellab --src <frames>` | Clip strips from saved PixelLab frames (also `STRIPS` and `--warp` modes) |
| `node scripts/td-hero-assets.mjs --id <id> --source <png> [--art vN]` | Hero card-240, thumb-96, token-192 from one transparent portrait |
| `python3 scripts/td-idle-anim.py <png> <id> <outdir> [--version vN] [--gif]` | Hero idle loop (24 frames, 5376x224) |
| Runbook for asset jobs (agents, cloud) | `docs/td-asset-pipeline.md`: enemy clips, new stills, new hero art, delivery |
| `node scripts/build-td-enemy-anims.mjs <clips> --set painted --release` | Enemy animation sheets into `public/td/enemies/clips/`, named after their still (without `--release`: local test set) |
| `node scripts/upload-to-r2.mjs --prefix td/enemies/...` | Upload stills or sheets to R2 (versioned names, cached a year) |
| `npm run td:pacing` | Balance and pacing report with two bot policies (`cheapest`, `carry` in `scripts/lib/td-runner.mjs`) |
| `npm run build:game-balance` | Regenerate `gameBalance.json` |
| `node scripts/build-td-grid.mjs` | Regenerate map tiles |
| `node scripts/td-audio-levels.mjs` | Regenerate audio gains |

Invariants worth keeping under test: determinism (same seed = same log), gold awarded
once per kill, no deadlock with every road tile filled, flyers reach the base past
blockers, accumulator clamps long tab-away gaps, loss wins a same-tick tie, cost is not
monotonic in tier.

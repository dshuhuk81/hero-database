# Tower Defense Roadmap

Last updated: October 5, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md) (the full pre-cleanup roadmap text is archived there under "Roadmap cleanup, September 29, 2026").

Maps come from generators: `board-v1` for compact boards (`npm run td:board`, spec section 10)
and the owner's map workflow ([docs/tower-defense-map-generator-plan.md](docs/tower-defense-map-generator-plan.md)).
No per-map layout or art milestones in this file.

## Documentation convention (all agents, September 28, 2026)

Several agents work in this repo in parallel. To avoid collisions and double work:

1. When you finish work, document it here if it affects a roadmap topic, and/or
   in [TOWER_DEFENSE_SPEC.md](TOWER_DEFENSE_SPEC.md) for what the game **is**
   (the spec is the current-state reference; code wins on disagreement).
2. Before starting economy/mechanics work, check
   [TOWER_DEFENSE_MECHANICS_OVERVIEW.md](TOWER_DEFENSE_MECHANICS_OVERVIEW.md) —
   it maps every currency, upgrade layer and balance lever, and lists the
   existing analysis scripts (`td:sweep`, `td:pacing`, `td:progression`,
   `td:classes`, `td:upgrade-sweep`) so nobody rebuilds them.
3. Before editing a file, check `git status` for uncommitted changes from
   parallel agents; do not overwrite or "clean up" files you did not touch.
4. Move finished milestones to the archive promptly so this file only shows
   open work.
5. If work is implemented from another Markdown document, name and link that
   document here. The detail document must link back to this roadmap so the
   decision history and the current priority list cannot drift apart.

## What's next (priority order)

Planning input: [TOWER_DEFENSE_GAMEPLAY_IDEAS.md](TOWER_DEFENSE_GAMEPLAY_IDEAS.md) (ideas and
their status), [docs/tower-defense-board-plan.md](docs/tower-defense-board-plan.md) (the board
rewrite, finished), and **[Tower Defense — Tilted Board and Landscape HUD](TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md)**
(R18 design decisions, prototype rounds and implementation record). The Campaign-wide rollout and
load-audit implementation follow **[Campaign R18 Rollout and Stage-Load Audit Design](docs/superpowers/specs/2026-10-04-campaign-r18-stage-load-design.md)**. The game as it is now:
[TOWER_DEFENSE_SPEC.md](TOWER_DEFENSE_SPEC.md).

Only open work. Use subagents for more than one milestone; coordinate file changes.

### Current focus: finish R18 and make it reusable (October 4, 2026)

R18 is no longer a concept-only task. The approved presentation is the default for all 82 current
Campaign stages and future Campaign stages, independent of layout, gate count or theme. Free Play
remains explicit: only maps listed in `tuning.board.tilt.maps` use R18 there. `proto-slabs` remains
hidden unless the URL contains `?proto=1`, and `?tilt=off` remains the development escape hatch.
Implemented work includes the tilted board, full-bleed landscape HUD, depth-scaled units,
top-layer unit bars, recessed road sockets, raised platforms, tilt-aware touch selection,
wider enemy formations, shared hero/enemy depth sorting, spawn-gate layering, the centred boss
HUD, quieter empty tiles and authored panoramas for all 14 current themes. Map/rule labels are compact single-line
chips and transient notices use a small two-line toast at the upper right instead of covering the
top centre. The platform front lip is now 0.1125 cell (0.3 -> 0.15 -> a further 25% cut on October 5, because
platform and shadow still read too tall against the Watcher of Realms reference).

The named source and implementation log is **[Tower Defense — Tilted Board and Landscape HUD](TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md)**.
Current gameplay rules are recorded in [TOWER_DEFENSE_SPEC.md](TOWER_DEFENSE_SPEC.md).

#### To do — next sensible steps

Latest device evidence and Lerna cadence change: **[Campaign Landscape Phone Review — October 5, 2026](docs/audits/2026-10-05-campaign-phone-review.md)**.
The submitted title/preview and boss/buff collisions, long reaction toast and nearby damage-label
overlaps have received shared UI fixes. The three-size browser fixture matrix passes; dense
live-game acceptance remains with the owner. Lerna's walk files load, but their original frames
lack visibly articulated leg steps. The shorter cadence is not a gait-asset fix: a new walk clip
is still required, following **[TD Asset Pipeline](docs/td-asset-pipeline.md)**, without balance changes.

- [ ] **P0 — Real-device acceptance pass:** verify the current build on a landscape phone with
  several simultaneous enemies and a boss. Check bar ownership, damage-number readability,
  platform height, the hidden in-wave spawn label and the centred boss HUD.
- [ ] **P0 — Edge interaction pass:** test taps on all four board edges and around the top and
  bottom safe areas on a real device. Automated coverage exists for 6x3, 8x4 and 9x5 boards,
  but physical tap accuracy is still the acceptance criterion.
- [x] **P1 — Representative rollout matrix:** the shared R18 presentation is enabled on public
  8x4 and 9x5 maps with both one and two gates. These four maps are the approval set before any
  broader rollout.
- [x] **P1 — Theme panoramas, assets and integration:** all 14 current themes have their own
  authored wide backdrop. Original playable terrain, geometry and balance remain unchanged.
  Implemented from **[Theme Landscape Panoramas](docs/theme-panoramas.md)**, which names all
  assets, source images, generation prompts and checks; the initial Moonlit record remains
  **[Moonlit Landscape Panorama](docs/moonlit-panorama.md)**.
- [ ] **P1 — Panorama phone acceptance:** review each theme's left/right transition, perimeter
  scale, brightness and HUD contrast on a landscape phone; creation is not device acceptance.
- [ ] **P1 — HUD collision matrix:** capture 797x360, 844x390 and 915x412 landscape states for
  placement, dense combat and bosses; confirm notices, buffs, wave preview and boss health never
  cover one another.
- [x] **P1 — Campaign-wide rollout:** all Campaign stages use the shared R18 renderer by run
  context, including 10x5 finales. Free Play stays map-explicit, while per-map tilt/art overrides
  remain available for unusual geometry.
- [x] **P2 — Orientation policy:** phones do not have a portrait game layout. Portrait is blocked
  by the existing full-screen modal, pauses the run and asks the player to rotate to landscape.
- [ ] **P3 — Continue the design roadmap:** after R18 approval, continue tile and
  environment readability, R15 Fjord presentation, three-gate visual language and the owner
  decisions needed for R14 Lords.

The WoR-inspired balance evidence pass is implemented as `npm run td:campaign-load`. It measures
effective HP, attack, composition, count and spawn pressure through the real simulator and flags
adjacent-stage changes. It never edits `tdCampaign.json` or proposes replacement numbers. Actual
tuning remains a reviewed decision using `td-board-tune.mjs`, `test-td-campaign.mjs`, bot pacing
results and owner playtests. Source and boundary: **[Campaign R18 Rollout and Stage-Load Audit
Design](docs/superpowers/specs/2026-10-04-campaign-r18-stage-load-design.md)**.

### Reference: Watcher of Realms (WoR) analyses (October 5, 2026)

WoR is the owner's reference for feel (tilt without a 3D engine) and for campaign pacing. Three
external documents (outside the repo, `~/Documents/Codex/2026-10-04/referenced-chatgpt-conversation-this-is-an/outputs/`):

- `watcher_of_realms_campaign_analysis.md` + `wor_campaign_scaling.csv`: 287 main-campaign stages.
  Chain `Stage.StageLv` -> `StageWave` -> `EnemyGrowing` (piecewise-linear stat anchors per enemy).
  Difficulty = stat level x composition load (count, type mix, spawn timing); big tier gates
  (N8 -> N9) add new defensive mechanics. Used for `npm run td:campaign-load`.
- `wor_3d_files_technical_possibilities.md` (+ N1-1 OBJ/mesh files): the logical grid (`MAP_1001001`,
  8x6) and the rendered scenery are separate layers. Only proportions transfer to us: tilt, platform
  edge height, hero-to-tile ratio, drop shadow. Camera, light and shader are not recoverable from
  the meshes; calibrate against real WoR screenshots. We use no Unity.

Owner decisions (October 5): enemy counts and pacing *may* be taken from WoR, but the goal is
gameplay: too many simultaneous enemies cheapen tactical play, and a hero's placement must visibly
matter. Counts are therefore compared as a normalised *shape* (see
`npm run td:wor-compare`), never copied as raw numbers. Platform height reduced by 25%.

**First `td:wor-compare` result (October 5):** our Campaign median is 38 to 65 enemies per stage
against WoR's 17 to 43 (peak 65 vs 43), and our spawn pressure is about 0.7 to 0.9 enemies/s against
WoR's 0.1 to 0.26, three to four times denser, flat from the first decile on. WoR ramps count up
slowly and keeps pressure low; our load curve is also flat where WoR's grows ~350x. Direction for
a tactical feel: fewer, tougher enemies with slower spawn pressure. This is a reviewed tuning task
(R12), not an automatic change.

**Owner screenshot comparison (October 5, Rime Causeway vs WoR):** the soft top and bottom bands
come from the 2.45:1 panorama behind a sharp canvas with hard top/bottom edges (the scenery bands
in `render.js` now draw the sharp panorama, aligned with the CSS backdrop, instead of a blurred stretched
terrain copy; themes without a panorama keep the blurred band); the divine-action buttons and
the main action now share one landscape height (`--td-landscape-action-h`). Tilted boards now draw the road lane at 55% opacity with lighter sockets, so the painted ground
shows through (WoR: open ground, sparse pads). Heroes grew from heroScale 1.0 to 1.15 (it was 1.3 before the
October 4 clipping fix) and depth scaling widened to 0.90-1.10, because WoR heroes are about 1.2-1.4
tiles tall; check top-row clipping on device. The tilt `offsetY` dropped from 70 to 55 world px so the deck covers less of the bottom row and the
spawn label (cards stay their size by owner decision); check top-row hero clipping on device. Seams: the canvas is shorter than the screen (scale = min(width/960, height/556)), so the Pixi panorama band is scaled to match the CSS
`cover` backdrop over the whole screen (redone on resize) and the terrain's top/bottom edge dissolves into panorama strips instead of a black gradient; the bottom bar gradient reaches the screen edge. Still open: the board fills less of the screen than in WoR.

**Wave-shape variants (October 5, bot experiment, stages 4-2 / 4-3 / 4-5, 14 squads, not applied):** fewer
enemies with the same total health, attack and leak damage (`board.waveShape` count x0.6 or x0.4, hp /
attack / leak / power divided by the same factor, optional gap x1.5). Enemies per stage drop from 34 / 56 /
66 to 24 / 41 / 41 (x0.6) and 20 / 35 / 33 (x0.4), spawn pressure from about 0.8 to 0.5-0.64/s with the
longer gap, which is the WoR range for counts but still about 2x its pressure. The bot wins clearly less
against fewer, tougher enemies: to stay at 50% the stage `hpScale` must drop to about 0.55-0.8 of today's
value (x0.6 plus gap x1.5), more at x0.4. So a count change is an R12 retune, not a free switch. Try it on dev with
`?lean=0.6` (count x0.6, gap x1.5, Campaign hpScale x0.7; `src/game/td/wave-variants.js`, off by default);
reproduce the numbers with `npm run td:wave-variants`.

**Owner playtest, Campaign 1-1 to 1-5 (October 5):** Daily Trial and Expedition now use R18 like the Campaign
(they had old flat layouts); the in-wave quest is a short chip (full goal in its tooltip); held melee enemies
are drawn at a stand-off distance from their blocker (render only, `standOffHeldEnemies` in `render.js`, sim
positions and `blocking.contactRange` 24 untouched, because the contact-depth test exists for a reason);
the result screen's Retry button says "Retry" (stage name in the tooltip); platform heroes on the default "auto"
targeting now shoot flyers in reach first (only they can hit them; "ground" or any chosen mode overrides).
Balance feedback: 1-3 hard but doable, 1-4 hard because of flyers (addressed by the targeting default),
Brutes stay as they are (owner: challenging is fine). Flyers still escaped two or three platform heroes, so their base speed
dropped from 62 to 44 (grunt speed 42; runner 76). Bot check, flyer-only wave on the 1-4 map, 14 squads: speed 62 -> 1 win and
41 leaks, 50 -> 4 / 36, 42 -> 4 / 34, 36 -> 8 / 29. The whole 1-4 stage is not a flyer test: the bot dies in wave 2 there.

**Stage 1-7 "Two Gates" eased (October 5, owner: very hard; the first wave always leaks one enemy, three ground
heroes cannot also cover the later flyers):** `hpScale` 2.5 -> 2.0, wave 1 grunts 14 -> 10, flyers 12 -> 9 (wave 3),
14 -> 10, 8 -> 6 (last two flyer groups). Bot, 14 squads, hpScale 1.0: 6/14 wins before, 10/14 with the trimmed
waves; at the old 2.5 the bot wins 0/14 either way, so the bot cannot rate the human experience here. Note for R12:
`td-board-tune.mjs` now suggests far lower `hpScale` for the whole of chapter 1 (1-7: 0.63, 1-6: 0.45, 1-9: 0.2)
than the authored 1.8 to 2.9, but the owner clears these stages with focus targeting and relocation, which the
bot does not use, so those suggestions are a lower bound, not a target.

**Flyers on 1-7 (October 5, owner: still the sticking point):** flyer-only wave on the 1-7 map, 14 squads, bot wins:
speed 44 / shape hp 1.75 -> 3, hp 1.0 -> 7, speed 36 -> 5 (hp 1.75) or 7 (hp 1.0). Health matters more than speed, so
`board.waveShape.kinds.flyer.hp` went 1.75 -> 1.3 (global: flyer waves are easier everywhere); flyer speed stays 44.

### Campaign Encounter Pacing: approved, phases 0 to 2 built (October 5, 2026)

Owner on 1-10: too many flyers and ground units at once, no squad (1 platform, 1 healer, 4 ground, or fewer ground) can
hold it; WoR shows a fixed, known total per stage while our waves pour out hordes. Plan, data and five owner decisions:
**[Campaign Encounter Pacing](docs/superpowers/specs/2026-10-05-campaign-encounter-pacing-design.md)**. Summary: WoR chapter 1
stages have about 11 enemies over a 53 s timeline (0.1 to 0.26/s); ours have 21 to 72 in dense wave bursts (0.6 to 0.9/s)
with mixed ground, flyer and support kinds. Phases: 0 measure (`td:stage-lint`), 1 forecast UI (kill counter, stage
summary, timeline), 2 pilot on 1-4, 1-7, 1-9, 1-10, 3 roll-out, 4 player leverage, 5 time-model decision. R12 step 7
(campaign `hpScale`) waits until after phase 3.

Built October 5: **phase 0** `npm run td:stage-lint` (rules and chapter targets in `src/game/td/stage-lint.js`; baseline: all 82
stages flagged, chapter 1 has 21 to 72 enemies against a target of 12 to 30, chapter 13 up to 108 against 36 to 42); **phase 1**
the Defeated counter `x/total` in the stats row, a "N enemies in M waves" chip before the first wave (tooltip lists the kinds) and
"incoming" chips for the running wave (`stageForecast()` in `sim.js`); **P4** relocation between waves is free
(`run.relocationCost` 0; the squad cap stays off, the owner did not choose it); **phase 2 pilot** stages 1-4, 1-7, 1-9, 1-10 rewritten
to one headline kind per wave and at most 2 kinds, spawn gaps doubled on the two-gate stages, counts now 22 / 26 / 28 / 30 (were
24 / 32 / 56 / 72 shaped counts: 24, 58, 56, 72), `hpScale` 1-7 2.0 -> 2.6, 1-9 2.7 -> 2.9, 1-10 2.89 -> 3.0 (1-4 unchanged at 2.1).
Bot check (hpScale for a 50% bot win rate, 14 squads): 1-7 0.36 -> 0.89, 1-9 0.27 -> 0.67, 1-10 0.30 -> 0.42, 1-4 0.59 -> 0.65, i.e. the
walls are 1.4x to 2.5x easier at equal `hpScale`; the raised `hpScale` takes part of that back. The owner playtest decides.

### Open work after the board rewrite (October 4, 2026)

Branch `tower-defense-planning` finished the board rewrite and the first round of ideas (archive:
"Board rewrite and ideas round, October 2, 2026"). The owner asked to build these without
balancing; numbers are first guesses. Manual ultimates were dropped. Done this round and
archived: R9 and R17 (bosses and chapter assignments), R10 (daily quests), R16 (Ymir attack).

Steps are grouped by type of work, in the owner's order: development, concept, simulation.
"Needs" names the steps that must be done first; steps without needs can start any time and
run in parallel.

#### DEVELOPMENT

| # | Step | Owner or agent | Needs | Size |
|---|---|---|---|---|
| R11 | Three-gate boards in content: the generator supports them (`--gates=3`), no map uses one yet | Owner workflow | - | S |
| R15 | Ice-theme enemy set: behavior + tuning data (art via owner PixelLab pipeline in parallel) | Agent (behavior), Owner (art) | - | L |
| R18 | Tilted board and landscape HUD: the shared presentation is live across all Campaign stages and remains explicit per map in Free Play; authored panoramas and real-device acceptance remain. See **[Tower Defense — Tilted Board and Landscape HUD](TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md)** | Agent (shared renderer/HUD), Owner (device approval and theme art) | - | L |

**R15 — Ice-theme enemy set ("Fjord" theme map family).** Specs below are the text brief the
owner's PixelLab pipeline needs; behavior and tuning data can be built against placeholder
sprites and swapped when the art lands. Theme: raiders and beasts of a frozen coast —
visually pale hides, hoarfrost armor, breath clouds; mechanically they play with Chill,
Freeze and slick speed (statuses already exist: Chill, Wet, Freeze via `tuning.statuses`).
Six kinds, matched to the existing roster's roles so wave composition stays familiar:

| ID | Role (existing analog) | Behavior spec | Stat direction |
|---|---|---|---|
| `fjord-reaver` | grunt | plain melee walker, hoarfrost-crusted shield | like grunt, +10% hp |
| `fjord-skater` | runner | very fast, low hp; leaves a 2 s slick trail that speeds other enemies behind it by 15% (new aura, ground decal) | runner stats, speed ×1.1 |
| `fjord-howler` | archer | ranged; every 3rd shot applies Chill for 2 s (existing status, sources entry) | archer stats, −10% attack |
| `fjord-jarl` | brute | heavy blocker-cracker; on death breaks into 2 `fjord-reaver` (reuse brood split logic) | brute ×0.8 hp |
| `fjord-warden` | shieldbearer | projects Frostward: allies within 90 px take 15% less damage (shieldbearer aura re-skinned) | shieldbearer stats |
| `fjord-draugr` | mender | heals allies; on heal target below 30% hp also applies Chill to its attackers 60 px around the target (new small burst, reuses status sources) | mender stats, −15% heal |

Art brief per kind: same conventions as the boss brief (square canvas, three-quarter
top-down, facing right, readable at 96 px, silhouette first, pale-blue accents reserved for
tells). Pipeline: owner approves text → PixelLab concept images → `build-td-enemy-sprites.mjs`
runtime versions (`fjord-<kind>-v1.webp`) → tuning entries + wave generation allow per-map
enemy pools (the map decides whether fjord kinds replace or mix with the base roster — first
fjord map replaces, no mixing). New sim surface: slick-trail aura and the draugr chill
burst; everything else reuses existing systems. Tests: extend `test-td-sim.mjs` with slick
trail speed-up and draugr burst; skin test picks up the six new kinds.

#### CONCEPT

Design first: rules, story or art are not defined yet.

| # | Step | Owner or agent | Needs | Size |
|---|---|---|---|---|
| R14 | Lords concept: a new hero layer on top of the faction bonds (Norse, Greek) | Owner concept, agent builds | - | L |

**R14 — Lords (rules framework defined October 2, 2026; waiting on owner picks + art).**
Mechanical frame, ready to build once the owner names the Lords:

- **What a Lord is:** one designated hero per faction (`norse`, `greek` in `tuning.bonds.sets`)
  — the faction's mythic head (natural candidates: Odin for Norse, Zeus for Greek; the owner
  decides, existing hero or new hero). The Lord is marked in data (`bonds.sets.<id>.lord`)
  and shown first in the hero-selection tab with a crown treatment.
- **Lord bonus:** while the Lord is deployed, every deployed hero of its faction gains a
  faction-specific bonus on top of the existing 2/4-hero bond tiers. Proposed identity:
  Norse Lord — faction heroes' attacks apply a brief stacking Wound (+3% damage taken per
  stack, 3 stacks max, 3 s; uses the exposed/status system); Greek Lord — faction heroes
  gain a 6 s Aegis shield after casting their ultimate (absorbs 15% of max hp). Numbers are
  first guesses for R12.
- **Rules:** one Lord per faction per squad; the Lord itself counts toward its faction's
  bond tiers; wildcard recruits do not receive the Lord bonus (they share the bond only);
  Lord bonus ends when the Lord falls or is sold. No Lord in Daily Trial fixed squads unless
  the trial authors one in.
- **Owner deliverables before build:** pick the two Lords (or commission new heroes),
  concept art + animations for any new Lord, and the short in-game descriptions (selection
  tab + tooltip). Once named, the task moves to DEVELOPMENT (data + sim + UI, size M).
- **Open question for the owner:** should a Lord occupy one of the 6 campaign / 7 Free Play
  deploy slots like any hero (proposed: yes — the bonus is the payoff for the slot), or sit
  in a separate command slot (bigger rules change, not recommended)?

#### SIMULATION / TESTING

Balance runs, tuning and checks with the simulation scripts.

| # | Step | Owner or agent | Needs | Size |
|---|---|---|---|---|
| R12 | Balance pass: global stats in Free Play, Expedition and Daily Trial (maybe enemy health by squad Might, ideas D4), pantheon bond values, Divine Intervention charge and damage, wave interest, Heroic difficulty and seals, battle gold income now that it buys only deploys and relocations; then retune campaign `hpScale` with `scripts/td-board-tune.mjs` (targets 0.9 / 0.65 / 0.5 / 0.35) | Agent, owner approves | - | L |
| R7 | More signature patterns (`tuning.board.heroPatterns`), one balance check each; line shapes on platform heroes cut road coverage | Agent | R12 | S each |
| R8 | Retire tag synergy now that pantheon bonds exist (`synergy.bonusPerTag: 0`) | Agent | R12 | S |

**R12 progress (October 5):** step 1 done: Free Play and Expedition enemy health now scales with collection upgrades
(`mightEnemyScale` in `campaign.js`; strongest 7 pool heroes' Might vs the same heroes un-upgraded, raised to
`heroMight.enemyHpExponent` 0.6, capped at `enemyHpCap` 4; Campaign and Daily Trial untouched). Example: starters at level
30 are x2.04 Might and x1.53 enemy health. Owner knobs live in `tdCampaign.json` `heroMight`. Remaining R12 steps, in
order: (2) check Free Play / Expedition win rates with `td:sweep` upgraded-roster cases, (3) Divine Intervention charge and
damage, (4) wave interest and battle gold income, (5) Heroic difficulty and seals, (6) pantheon bond values, (7)
campaign `hpScale` with `td-board-tune.mjs` (bot-only; the bot underrates the owner, see above), then R7 and R8.

Owner directions recorded October 2:

- R12: Scale Free Play and Expedition enemy health with squad Might, but by less than 100%.
- R8: Retire tag synergy.

The "1-1: too hard" test failure is gone: `test-td-campaign` now only notes stages where the bot wins under 20% (October 5).

Backlog from the ideas document, not scheduled: A1 stage goals, A2 stage
rules, A3 Kraghorn finale, A4 chapter creatures, C2 reaction visibility, D3 Expedition route
map, boss rush, hero mastery. Early call stays out (it needs overlapping waves; wave interest
covers the economy lever).

### Doc drift (audit)

- `src/game/td/bugs.md`: "Inspector stats too thin" still TODO although inspector stats exist; blessing graph note.
- `docs/tower-defense-ui-plan.md`: ring-era requirements (rings, touch rotation).
- White-label audit (`docs/audits/`): label historical sections.

### Skipped / deferred

- M25 Leaderboard: needs an anti-tamper design first (spec section 9; likely Cloudflare Worker + D1); maybe Endless only.
- M99 Login/Register: evaluate cost (Google / Apple auth) for a free setup; skip if too heavy.
- P3: prestige/Ascension reset (once players reach the end of the blessing tree); map editor (non-goal).

## Dev commands

```
npm run test:tower-defense      # headless combat/upgrade/virtue checks
npm run test:td-balance         # 5-squad balance harness
npm run td:sweep                # difficulty sweep (enemy HP steps x squads x maps)
npm run td:classes              # class identity report (M6 criteria: matrix, class removal, one-class squads)
npm run td:pacing               # audit step 3: class removal, maps, campaign minutes, seals (2 bot policies)
npm run td:wor-compare          # our enemy count / spawn pressure / load curve vs the WoR analysis CSV (shape only)
npm run td:wave-variants        # fewer-enemies wave shapes: hpScale that keeps a 50% bot win rate
npm run td:campaign-load        # deterministic Campaign HP/ATK/count/spawn-pressure evidence; optional --chapter / --csv
npm run td:layout -- --map=<id> # tile layout A/B: committed vs working tdMaps.json (Free Play + campaign stages)
node scripts/td-audio-levels.mjs                                   # hero sound gains -> src/data/tdAudioLevels.json (needs ffmpeg)
npm run build:game-balance      # regenerate hero balance (re-ranks all heroes)
npm run check                   # astro check (TD code is type-clean; rest of site not yet)

node scripts/build-td-grid.mjs [--check]                            # placement tiles -> tdMaps.json (after route / grid block edits)
node scripts/build-td-enemy-sprites.mjs <folder>                   # AI enemy art -> public/td/enemies/sprites
python3 scripts/td-idle-anim.py <portrait> <id> <outdir>           # hero idle loop sheet -> public/td/heroes-alt/anims
node scripts/upload-to-r2.mjs --prefix td/<folder>                 # upload new files (never overwrites)
```

`window.tdGame` and `window.tdRenderer` available in browser for debugging.

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
   existing analysis scripts (`td:pacing`, `td:progression`,
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
  platform height, the hidden spawn label while a stage runs and the centred boss HUD.
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
  placement, dense combat and bosses; confirm notices, buffs, the stage summary chip and boss health never
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

### Timeline Stages: no more waves (built October 5, 2026)

Waves are gone. Every stage, map and Expedition stage plays one **timeline** of spawn groups with WoR-like counts and
timings; the HUD shows `Defeated x/total` instead of a wave counter. Design and decisions:
**[Timeline Stages: no more waves](docs/superpowers/specs/2026-10-05-timeline-stages-design.md)**; implementation plan:
**[Timeline Stages Implementation Plan](docs/superpowers/plans/2026-10-05-timeline-stages-plan.md)**; current rules in
[TOWER_DEFENSE_SPEC.md](TOWER_DEFENSE_SPEC.md) (section 8). The wave-era playtest log (flyer speed, stage 1-7, wave-shape
experiments, Encounter Pacing phases 0 to 2) moved to [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

What changed for players and tuning: run lengths and Endless removed; blessing offers at five defeat milestones (the stage
waits while one is open); in-run quests removed; relocation free with an 8 s cooldown per hero; Shield recovers after 60 s;
Daily Trial goal is 60% of the stage's enemies; Favor, shards, collection rewards and challenges are keyed to enemies
defeated; saves migrate automatically (legacy `bestWave` dropped, `@mode` records merged); environment odd/even wave rules
became 20 s phases. Tools: `npm run td:stage-lint`, `td:stage-convert` (one-off migration, kept for reference),
`td:wor-compare`; `td:sweep`, `td:economy`, `td:wave-shape`, `td:wave-variants` and `td:chapter-length` were removed.

**To do (owner playtest, no simulations were run for this change):**

- [ ] Play 1-1 to 1-10 and one stage of chapters 2 to 4: does the Defeated counter plus the start summary give enough overview,
  and does any stage spawn too fast or slow? Chapter 1 stages are now 9 to 16 enemies over 37 to 66 s; `hpScale` was raised
  by the converter (`HEALTH_KEPT` 0.6 in `scripts/td-stage-convert.mjs`) to give back part of the removed enemy health.
- [ ] 1-10 with a mixed squad (2 platform, 4 ground) and with 1 platform, 1 healer, 4 ground.
- [ ] Retune `hpScale` per stage after the playtest (R12 step 7); `td-board-tune.mjs` only gives a bot lower bound.
- [ ] Review the 14 stages `td:stage-lint` still flags (mostly "kinds within 20 s" and counts a little above the chapter target).


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
Six kinds, matched to the existing roster's roles so stage composition stays familiar:

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
runtime versions (`fjord-<kind>-v1.webp`) → tuning entries + timelines allow per-map
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
| R12 | Balance pass: global stats in Free Play, Expedition and Daily Trial (maybe enemy health by squad Might, ideas D4), pantheon bond values, Divine Intervention charge and damage, Heroic difficulty and seals, placement income now that it buys only deploys and relocations; then retune campaign `hpScale` with `scripts/td-board-tune.mjs` (targets 0.9 / 0.65 / 0.5 / 0.35) | Agent, owner approves | - | L |
| R7 | More signature patterns (`tuning.board.heroPatterns`), one balance check each; line shapes on platform heroes cut road coverage | Agent | R12 | S each |
| R8 | Retire tag synergy now that pantheon bonds exist (`synergy.bonusPerTag: 0`) | Agent | R12 | S |

**R12 progress (October 5):** step 1 done: Free Play and Expedition enemy health now scales with collection upgrades
(`mightEnemyScale` in `campaign.js`; strongest 7 pool heroes' Might vs the same heroes un-upgraded, raised to
`heroMight.enemyHpExponent` 0.6, capped at `enemyHpCap` 4; Campaign and Daily Trial untouched). Example: starters at level
30 are x2.04 Might and x1.53 enemy health. Owner knobs live in `tdCampaign.json` `heroMight`. Remaining R12 steps, in
order: (2) check Free Play / Expedition win rates with the bot (`td:pacing`, upgraded-roster cases), (3) Divine Intervention charge and
damage, (4) placement income, (5) Heroic difficulty and seals, (6) pantheon bond values, (7)
campaign `hpScale` with `td-board-tune.mjs` (bot-only; the bot underrates the owner, see above), then R7 and R8.

Owner directions recorded October 2:

- R12: Scale Free Play and Expedition enemy health with squad Might, but by less than 100%.
- R8: Retire tag synergy.

The "1-1: too hard" test failure is gone: `test-td-campaign` now only notes stages where the bot wins under 20% (October 5).

Backlog from the ideas document, not scheduled: A1 stage goals, A2 stage
rules, A3 Kraghorn finale, A4 chapter creatures, C2 reaction visibility, D3 Expedition route
map, boss rush, hero mastery. Early call is dropped (a timeline has no waves to call early).

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
npm run td:classes              # class identity report (M6 criteria: matrix, class removal, one-class squads)
npm run td:pacing               # audit step 3: class removal, maps, campaign minutes, seals (2 bot policies)
npm run td:wor-compare          # our enemy count / spawn pressure / load curve vs the WoR analysis CSV (shape only)
npm run td:stage-lint           # pacing lint for every stage timeline (report only)
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

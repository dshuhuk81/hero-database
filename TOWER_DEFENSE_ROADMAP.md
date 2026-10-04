# Tower Defense Roadmap

Last updated: October 4, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md) (the full pre-cleanup roadmap text is archived there under "Roadmap cleanup, September 29, 2026").

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
HUD, quieter empty tiles and the authored Jungle panorama. Map/rule labels are compact single-line
chips and transient notices use a small two-line toast at the upper right instead of covering the
top centre. The platform front lip is now 0.15 cell, half its former visible height.

The named source and implementation log is **[Tower Defense — Tilted Board and Landscape HUD](TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md)**.
Current gameplay rules are recorded in [TOWER_DEFENSE_SPEC.md](TOWER_DEFENSE_SPEC.md).

#### To do — next sensible steps

- [ ] **P0 — Real-device acceptance pass:** verify the current build on a landscape phone with
  several simultaneous enemies and a boss. Check bar ownership, damage-number readability,
  platform height, the hidden in-wave spawn label and the centred boss HUD.
- [ ] **P0 — Edge interaction pass:** test taps on all four board edges and around the top and
  bottom safe areas on a real device. Automated coverage exists for 6x3, 8x4 and 9x5 boards,
  but physical tap accuracy is still the acceptance criterion.
- [x] **P1 — Representative rollout matrix:** the shared R18 presentation is enabled on public
  8x4 and 9x5 maps with both one and two gates. These four maps are the approval set before any
  broader rollout.
- [ ] **P1 — Theme panoramas:** create an authored wide backdrop for each approved theme and
  replace the ordinary-terrain fallback. Jungle already uses `jungle-terrain-wide-v1.png`.
- [ ] **P1 — HUD collision matrix:** capture 797x360, 844x390 and 915x412 landscape states for
  placement, dense combat and bosses; confirm notices, buffs, wave preview and boss health never
  cover one another.
- [x] **P1 — Campaign-wide rollout:** all Campaign stages use the shared R18 renderer by run
  context, including 10x5 finales. Free Play stays map-explicit, while per-map tilt/art overrides
  remain available for unusual geometry.
- [x] **P2 — Orientation policy:** phones do not have a portrait game layout. Portrait is blocked
  by the existing full-screen modal, pauses the run and asks the player to rotate to landscape.
- [ ] **P3 — Continue the design roadmap:** after R18 approval, continue theme panoramas, tile and
  environment readability, R15 Fjord presentation, three-gate visual language and the owner
  decisions needed for R14 Lords.

The WoR-inspired balance evidence pass is implemented as `npm run td:campaign-load`. It measures
effective HP, attack, composition, count and spawn pressure through the real simulator and flags
adjacent-stage changes. It never edits `tdCampaign.json` or proposes replacement numbers. Actual
tuning remains a reviewed decision using `td-board-tune.mjs`, `test-td-campaign.mjs`, bot pacing
results and owner playtests. Source and boundary: **[Campaign R18 Rollout and Stage-Load Audit
Design](docs/superpowers/specs/2026-10-04-campaign-r18-stage-load-design.md)**.

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

Owner directions recorded October 2:

- R12: Scale Free Play and Expedition enemy health with squad Might, but by less than 100%.
- R8: Retire tag synergy.

Known failing test: `test-td-campaign` ("1-1: too hard"), already failing before R4; part of R12.

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

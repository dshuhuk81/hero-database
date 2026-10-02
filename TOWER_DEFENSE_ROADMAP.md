# Tower Defense Roadmap

Last updated: October 2, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md) (the full pre-cleanup roadmap text is archived there under "Roadmap cleanup, September 29, 2026").

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

## What's next (priority order)

Planning input: [TOWER_DEFENSE_GAMEPLAY_IDEAS.md](TOWER_DEFENSE_GAMEPLAY_IDEAS.md) (ideas and
their status), [docs/tower-defense-board-plan.md](docs/tower-defense-board-plan.md) (the board
rewrite, finished). The game as it is now: [TOWER_DEFENSE_SPEC.md](TOWER_DEFENSE_SPEC.md).

Only open work. Use subagents for more than one milestone; coordinate file changes.

### Bugs / Enhancements
- [x] Fixed: The Stars panel now opens directly on large material slots and a full-width copy picker. Fill all slots lives inside the material box, the sticky footer contains only Star up, and the stat/level-cap preview appears after the first copy is selected.
- [x] Fixed: Hero roster portraits use a gentler crop and sit lower in their tiles so heads remain inside the visible area.
- [x] Fixed: Generic recruit art now uses a dedicated full-body fit in both roster tiles and the main hero view, keeping every recruit visible instead of applying the named-hero close-up crop.

### Open work after the board rewrite (October 2, 2026)

Branch `tower-defense-planning` finished the board rewrite and the first round of ideas: all
maps on compact boards with unique layouts, attack patterns and reach steps, fewer and
stronger enemies, one shown life per leak, three-gate boards, signature patterns and
pattern-shaped ultimates, global hero stats, wave interest, pantheon bonds, Heroic campaign
and Divine Interventions (archive: "Board rewrite and ideas round, October 2, 2026"). The
owner asked to build these without balancing; numbers are first guesses. Manual ultimates
were dropped.

Steps in order. "Needs" names the steps that must be done first; steps without needs can
start any time and run in parallel.

| # | Step | Owner or agent | Needs | Size |
|---|---|---|---|---|
| R5 | Divine Intervention upgrades on the Favor trunk of the blessing tree (cooldown, area); needs a save migration for new nodes. Add visible in-game effects that reflect each action. | Agent | - | M |
| R6 | Fix stale SFX on localhost; R2 and production play the correct audio | Agent | - | S |
| R6b | Allow debug mode in production behind an explicit URL query parameter | Agent | - | S |
| R7 | More signature patterns (`tuning.board.heroPatterns`), one balance check each; line shapes on platform heroes cut road coverage | Agent | R12 | S each |
| R8 | Retire tag synergy now that pantheon bonds exist (`synergy.bonusPerTag: 0`) | Agent | R12 | S |
| R9 | Bosses: rules for Lerna, Kraghorn and Vorruk | Agent | - | M |
| R10 | Daily quests (M26 Sprint 11, below); can count Interventions, bonds and Heroic clears | Agent | - | M |
| R11 | Three-gate boards in content: the generator supports them (`--gates=3`), no map uses one yet | Owner workflow | - | S |
| R12 | Balance pass: global stats in Free Play, Expedition and Daily Trial (maybe enemy health by squad Might, ideas D4), pantheon bond values, Divine Intervention charge and damage, wave interest, Heroic difficulty and seals, battle gold income now that it buys only deploys and relocations (R4 done); then retune campaign `hpScale` with `scripts/td-board-tune.mjs` (targets 0.9 / 0.65 / 0.5 / 0.35) | Agent, owner approves | - | L |
| R13 | Create a local overview: Create a overview page with all stages, all bosses and the most important settings. That overview page should display the core features of the game that are relevant in order to see them at a glance and make desicions from there. That also includes costs for upgrades, skills and everything we can tune in the game. also heroes, their "attack scheme tile range", their attributes and hp as well as enemy infos. Reason: game files have too many informations all over the place and its hard for me to track that in a overview. | Agent | M |
| R14 | Currently they are faction like bonuses (Norse, Greek) - but maybe we should add a new hero class in addition. Its "Lords". Each faction has its own lord. We dont have one yet. We need a concept.
When a lord is placed (he will be always placed first) in the selection tab and then specific faction bonuses will be applied. each hero from the same faction then gets these bonuses. Prerequisites are of course 1 Lord for each faction to be defined, we need concept art, animations and descriptions | L |

Owner directions recorded October 2:

- R12: Scale Free Play and Expedition enemy health with squad Might, but by less than 100%.
- R8: Retire tag synergy.

R2 is done (October 2, 2026): the summon test now expects each Evolution tier's authored copy
cost (1/1/2/2/3), and Tilda's ultimate uses the v4 sound again (the owner deleted v5 and
copied Sable's new v4 ultimate to Tilda). `test-td-campaign` ("1-1: too hard") still fails and
was already failing before R4; it belongs to R12.

R4 is done (October 2, 2026): battle gold buys deploys and relocations; battle ranks, focus,
class paths, Awakening and training are gone; the hero panel shows collection progress with
Relocate and Sell; blessing nodes, Expedition veterans and the Hold Position challenge were
migrated in place (spec section 9, archive). The owner tests on dev and runs the simulations.

Backlog from the ideas document, not scheduled: A1 stage goals, A2 stage
rules, A3 Kraghorn finale, A4 chapter creatures, C2 reaction visibility, D3 Expedition route
map, boss rush, hero mastery. Early call stays out (it needs overlapping waves; wave interest
covers the economy lever).

### 4. Doc drift (audit)

- `src/game/td/bugs.md`: "Inspector stats too thin" still TODO although inspector stats exist; blessing graph note.
- `docs/tower-defense-ui-plan.md`: ring-era requirements (rings, touch rotation).
- White-label audit (`docs/audits/`): label historical sections.


### 6. M26 Sprint 11 - Quests

- We already have some "achievements" but not quests. Quests or lets say daily quests should be part of the home screen. list of 10 daily "tasks" that players can achieve due to playing. they ll get rewards when doing so.
- need: new quest entry point on the home screen. Quest screen. Rewards. Reset daily.

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

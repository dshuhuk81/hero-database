# Tower Defense Roadmap

Last updated: September 29, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md) (the full pre-cleanup roadmap text is archived there under "Roadmap cleanup, September 29, 2026").

Maps are out of scope here: the owner is building a procedural map generator
([docs/tower-defense-map-generator-plan.md](docs/tower-defense-map-generator-plan.md)).
No new-map, layout or per-map art milestones in this file.

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

Planning input (October 1, 2026): [TOWER_DEFENSE_GAMEPLAY_IDEAS.md](TOWER_DEFENSE_GAMEPLAY_IDEAS.md)
analyses the current state and proposes gameplay ideas with a suggested order. Not approved work.

Only open work. Use subagents for more than one milestone; coordinate file changes.

### Bugs / Enhancements
- [x] Fixed: The Stars panel now opens directly on large material slots and a full-width copy picker. Fill all slots lives inside the material box, the sticky footer contains only Star up, and the stat/level-cap preview appears after the first copy is selected.
- [x] Fixed: Hero roster portraits use a gentler crop and sit lower in their tiles so heads remain inside the visible area.
- [x] Fixed: Generic recruit art now uses a dedicated full-body fit in both roster tiles and the main hero view, keeping every recruit visible instead of applying the named-hero close-up crop.

### Compact board adoption (owner, October 1, 2026)

The owner kept the compact board direction (prototype `proto-board`, dev builds only). Plan,
open decisions and steps: [docs/tower-defense-board-plan.md](docs/tower-defense-board-plan.md).
All maps move to boards, no two maps share a layout, range upgrades leave the battle, hero and
enemy sizes get rebalanced.

### 4. Doc drift (audit)

- `PROJECT_MEMORY.md`: still says the page is one `is:inline` script (split into `src/game/td/page/` long ago).
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

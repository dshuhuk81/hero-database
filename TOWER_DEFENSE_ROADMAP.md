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

Only open work. Use subagents for more than one milestone; coordinate file changes.

### 1. Balance decisions (owner call; measurements ready)

From audit step 3 (numbers in the archive). Each needs a yes/no, then a small data change:
- (d) 1-10 health: APPROVED + DONE September 29, 2026 (combo with e). Shipped: 1-9 hpScale 0.57 -> 0.50, 1-10 0.67 -> 0.60. Post-change campaign sweep: 1-9 27/35, 1-10 27/35 (was 21/35 and 23/35); `td-chapter-length.mjs --variant=0` confirms the measured values (1-9 86% / 71%, 1-10 76% / 67%).
- (e) Chapter 1 length: APPROVED + DONE September 29, 2026 (combo: waves x0.7 + hp relief). Every stage trimmed to ~70% waves (first and last wave kept), 79 -> 59 waves total. Measured after the change: winning runs 51 min, expected with retries 70-74 min (was 103-131), inside/near the 30-60 min target for wins.
- Tanks: worst class in 4-5-hero campaign squads (buffs tried, none helped; cause is lost damage slots). Accept Tanks as a 7-hero (Free Play / Endless) class, or give squads a reason (e.g. an extra road place, stages that punish road leaks).
- Free Play difficulty since tiles + deploy cap 7 (M22b): 20 waves 4/5 wins vs 2/5 before. Retune enemy health with `td:sweep` or lower the cap. Re-check once generated maps land.
- Tooling fix before class tuning: `td:pacing` class removal needs same-slot replacements (7-hero squad per class); the current "without Mages -17" is a test artefact.

### 2. M26 Sprint 10 - Stage rating and chapter milestones (done September 29, 2026)

Owner decisions: no player-facing name (wreath icons only, internally "laurels"), rule 1 / 50% / 90% lives, rewards as proposed (may be a bit high, revisit later), automatic payout. Shipped: `laurelLives` / `stageLaurels` / `chapterLaurels` / `payMilestones` in `campaign.js`, `laurels.thresholds` and chapter `milestones` in `tdCampaign.json`, save v8 (`milestones`; reached ones are paid once on load), wreaths on stage cards, drawer "Goals", chapter track under the stage grid, result lines. Tests: new block in `test-td-campaign.mjs` (thresholds, automatic payout once, idempotence, v7 -> v8), stale version asserts in `test-td-summon.mjs` now use `CAMPAIGN_SAVE_VERSION`. Checks: full suite, no new TD type errors, Chromium 1440x900 and 390x844 with a seeded v7 save (12 / 30, first milestone paid), no overflow or page errors. Proposal and measurements: [docs/tower-defense-stage-laurels-plan.md](docs/tower-defense-stage-laurels-plan.md). Open: look in play; stage 1-3 may need +2 lives if 3 wreaths stay out of reach. Move to the archive after that.

### 2b. Class audit (owner request, September 29, 2026)

Check that each class looks and plays like its fantasy.
- Assassins (done September 29, 2026): they hit up to 90 px away (170 px dashing to loose enemies) while the token stood still, and the dash drew a row of glow dots, so they read as ranged. Now the token itself dashes to the enemy and back on every strike (`render.js` `scanLunges` / `lungeOffset`, sim time, off with reduced motion), the dash path shows speed streaks, and every assassin hit adds a dagger glint (`hero-fx.js` `daggerGlint`, `kind: "assassin"` on all six). Tanks and Warriors lean in a little when they strike. Mechanics unchanged. Checks: full suite, Chromium frame sequence on Moonlit (Nott, Ash, Bram, Kellan), no page errors.
- Open: go through Tank, Warrior, Mage, Archer, Support the same way (look in play, list mismatches). Known: several Tank hold circles at once fill large areas. Class balance itself (Tanks) is under 1. Balance decisions.

### 3. M24d - New boss to replace Lilith

Lilith is a Motto Immortal character (white-label rule); she is the Verdant boss (`tdMaps.json` `boss`, `tuning.bosses.lilith`, sprites `boss-lilith-v1` / `brood-v1`). Idea from the owner: a Greek mythology monster. Needs: name and mechanic (keep or replace the brood summon), stats, sprite, glossary/skin text, effects, tests. Boss selection may move to the map generator; agree where bosses are assigned first. (Common recruit heroes from M24d are done.)

### 4. Doc drift (audit)

- `PROJECT_MEMORY.md`: still says the page is one `is:inline` script (split into `src/game/td/page/` long ago).
- `src/game/td/bugs.md`: "Inspector stats too thin" still TODO although inspector stats exist; blessing graph note.
- `docs/tower-defense-ui-plan.md`: ring-era requirements (rings, touch rotation).
- White-label audit (`docs/audits/`): label historical sections.

### 5. Playtest follow-ups (owner)

- Archer platform shots (`tuning.enemies.archer.platformAttack` 0.5): manual phone play; raise it or add archers to more waves only after that.
- M24c effects second pass (support auras, recruit effects): look in play.
- Sprint 9 summon/Stars/Evolution numbers: under review in play. Optional: reveal flags "Evolution ready" when a copy makes an upgrade affordable.

### 6. M26 Sprint 11 - Quests

Only once enough systems exist to reference.

### Skipped / deferred

- M23 Tutorial stage: skipped (owner, September 27, 2026).
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

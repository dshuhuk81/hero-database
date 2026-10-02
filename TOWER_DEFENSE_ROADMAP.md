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

### Open work after the board rewrite (October 2, 2026)

Branch `tower-defense-planning` finished the board rewrite and the first round of ideas: all
maps on compact boards with unique layouts, attack patterns and reach steps, fewer and
stronger enemies, one shown life per leak, three-gate boards, signature patterns and
pattern-shaped ultimates, global hero stats, wave interest, pantheon bonds, Heroic campaign
and Divine Interventions (archive: "Board rewrite and ideas round, October 2, 2026"). The
owner asked to build these without balancing; numbers are first guesses. Manual ultimates
were dropped.

Steps grouped by type of work, in the owner's order: development, concept, simulation. "Needs" names the steps that must be done first; steps without
needs can start any time and run in parallel.

#### DEVELOPMENT

Build work with a clear scope.

| # | Step | Owner or agent | Needs | Size |
|---|---|---|---|---|
| R10 | Daily quests (M26 Sprint 11, below); can count Interventions, bonds and Heroic clears | Agent | - | M |
| R11 | Three-gate boards in content: the generator supports them (`--gates=3`), no map uses one yet | Owner workflow | - | S |
| R9 | Bosses Lerna, Kraghorn, Vorruk: implement the three fights | Agent | - | L |
| R15 | Ice-theme enemy set: behavior + tuning data (art via owner PixelLab pipeline in parallel) | Agent (behavior), Owner (art) | - | L |
| R16 | Ymir default-attack animation: hammer swing via PixelLab pipeline | Agent | - | S |

**R9 — Bosses Lerna, Kraghorn, Vorruk.** The full design is written and owner-reviewed in
[TOWER_DEFENSE_BOSS_CONCEPTS.md](TOWER_DEFENSE_BOSS_CONCEPTS.md) (September 29, 2026):
rules, numbers (multipliers of the ordinary boss H/A/S), warnings, counterplay, tooltips,
rollout order and the required-checks list. Sprites already exist (`boss-lerna-v1`,
`boss-kraghorn-v1`, `boss-vorruk-v1`, see archive September 29). Build scope, in rollout
order:

1. **Lerna** : threshold ultimate at 70%/35%
   health (one-shot queue, never re-arms), interruptible 2 s wind-up + 4 s healing channel
   (1.5% max hp/s, 6% budget per cast, canceled by 4% max hp accumulated damage, stun or
   petrify; burn suppresses healing ticks), Tender Growth exposure window (+20% damage
   taken, 5 s) after each cast, and the Bitter Seep ground pool (10 s cooldown, 1.5 s
   warning, 48 px radius, 4 s, 20% A magic per second, one pool max).
2. **Kraghorn** : path-distance charge every 18 s (2.5 s hoof-scrape
   warning marking 140 px of its own path, 3× speed, stops at and hits the first living road
   hero for 180% A, canceled by stun/petrify/knockback), Cracked Hide recovery (4 s, armor
   halved), Stones from the Hide fragment attack (12 s, 3 fragments, 45% A each), high
   armor / low magic resistance profile.
3. **Vorruk** : burrow ultimate every 20 s (2 s jagged-ring warning on a fixed
   platform or road slot, 2 s untargetable underground — road progress paused, block
   released, damage-over-time keeps ticking, health bar stays visible — then eruption: 90% A
   in 60 px at the marked spot, Open Throat exposure 5 s), Grit Lance platform poke (9 s,
   1.5 s lock-on line, 65% A single target, no retarget).

Cross-cutting: extend `sim.js`/tuning `bosses.*` with the per-boss skill blocks; warnings
must use shape + color and pause with combat; killing a boss mid-warning grants one reward
and cancels pending zones; deterministic at all sim speeds. Tests: one `test-td-bosses.mjs`
covering every bullet of the concept doc's "Required checks" list, plus a simulated win per
boss with the mixed roster. Balance numbers stay first guesses until R12.

**R9 campaign placement (OWNER DECISION, October 2, 2026).** The concept doc's free-map
suggestions stay untouched. The owner fixed one finale boss per chapter; every chapter
finale wave names its boss (spawn kind `lilith` / `lerna` / `kraghorn` / `vorruk` /
`ochenta` / `baphomet` / a new id) instead of the generic `boss`:

| Chapter | Finale boss | Status |
|---|---|---|
| 1 The Road to the Crossing | Lilith | change: drop Baphomet, only Lilith |
| 2 The Sunscar March | Vorruk | new (R9) |
| 3 The Emerald Deep | Lerna | new (R9) |
| 4 The Frozen Covenant | new boss, topic **Ice** | concept needed (R17) |
| 5 The Cinder Oath | Ochenta | existing |
| 6 The Thunder Stair | new boss, topic **Thunder/Lightning** | concept needed (R17) |
| 7 The Drowned Crown | new boss, topic **Water** | concept needed (R17) |
| 8 The Spore Lanterns | new boss, topic **Poison** | concept needed (R17) |
| 9 The Shattered Prism | new boss, topic **Aetheral** | concept needed (R17) |
| 10 The Silent Procession | new boss, topic **Death** | concept needed (R17) |
| 11 The Last Harvest | Kraghorn | new (R9) |
| 12 The Astral Meridian | new boss, topic **Star/Galaxy** | concept needed (R17) |
| 13 The Brass Reckoning | new boss, topic **Steampunk/Mechanical** | concept needed (R17) |

Implementation note for R9: chapter finales need a named-boss field on the finale wave; the
generic `boss` stays the fallback. Chapters 2, 3, 11 and the Lilith change on chapter 1 are
part of R9's build; the eight new theme bosses are R17 (concept first, see CONCEPT).

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

Boss Rework for all Campaign Stages:

**R16 — Ymir hammer swing.** His default attack currently has no dedicated animation; the
checklist in the archive lists him as done for voice/attack/ultimate, but the attack uses a
generic strike. Produce a hammer-swing attack clip via the PixelLab pipeline: 3-4 frames
wind-up (hammer raised over the right shoulder), 2 frames swing across the body toward the
facing direction, 1 frame recover; impact frame must line up with the existing attack event
timing (attackPeriod from tuning; the damage frame is the swing's second frame). Follow the
existing hero animation export path (`td-spine` / atlas pipeline, `scripts/td-pixellab-clips.mjs`),
register as `ymir` attack clip, verify in the anim lab (`anim-lab.astro`). No sim changes.

**R17 - Campaign Stage Changes.** 1. The Road to the Crossing needs a change cause its Mixing themes. Every Campaign Chapter should only have 1 theme.
Every Campaign Chapter should also have only 1 boss. Bosses should not be duplicate. Therefore we here is an audit for existing bosses at the moment:
1. The Road to the Crossing (Baphomet, Lilith) -> change to only Lilith
2. The Sunscar March (Vorruk)
3. The Emerald Deep (Lerna)
4. The Frozen Covenant (Baphomet) -> new Boss needed - topic: Ice
5. The Cinder Oath (Baphomet) -> new Boss Ochenta
6. The Thunder Stair (Ochenta) -> new Boss needed - topic: Thunder, Lightning
7. The Drowned Crown (Lilith) -> new Boss needed - topic: Water
8. The Spore Lanterns (Lilith) -> new Boss needed - topic: Poison
9. The Shattered Prism (Baphomet) -> new Boss needed - topic: Aetheral
10. The Silent Procession (Lilith) -> new Boss needed - topic: death
11. The Last Harvest (Ochenta) -> new Boss: Kraghorn
12. The Astral Meridian (Lilith) -> new Boss needed - topic: Star, Galaxy
13. The Brass Reckoning (Ochenta) -> new Boss needed - topic: Steampunk, mechanical

#### CONCEPT

Design first: rules, story or art are not defined yet.

| # | Step | Owner or agent | Needs | Size |
|---|---|---|---|---|
| R14 | Lords concept: a new hero layer on top of the faction bonds (Norse, Greek) | Owner concept, agent builds | - | L |
| R17 | Eight new theme bosses for chapters 4, 6, 7, 8, 9, 10, 12, 13 (owner assignment, October 2, 2026): write one concept doc in the shape of TOWER_DEFENSE_BOSS_CONCEPTS.md — name, story, silhouette + art brief, stat profile as H/A/S multipliers, basic attack, one special, one ultimate with warning + counterplay + recovery window, boss tooltip, required-checks list per boss. Topics: Ice (4), Thunder/Lightning (6), Water (7), Poison (8), Aetheral (9), Death (10), Star/Galaxy (12), Steampunk/Mechanical (13). Each fight must test a different defensive habit than Lerna (sustain), Kraghorn (blocking) and Vorruk (spacing) and reuse existing statuses/systems where possible. Moves to DEVELOPMENT per boss after owner review; art via the PixelLab pipeline like the first three | Agent concept, owner reviews | - | L |

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

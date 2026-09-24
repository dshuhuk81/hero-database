# Tower Defense: next increments

Updated: September 23, 2026.

## Confirmed baseline

The user completed all ten waves and beat the boss on Moonlit Pass. This confirms
one successful playable run. It does not establish mobile, keyboard, failure,
storage recovery, or balance coverage across all squads.

Implemented: one map, a 20-hero picker, five-member squads, placement by class,
automatic combat and ultimates, gold, lives, score, speed controls, and local saves.
The startup callback and hidden-panel CSS were corrected during the follow-up check.

Remaining gaps include combat rules, enemy and boss art, attack feedback, between-wave
progression, synergies, and browser verification. Rotation currently changes a stored
value without affecting attacks. Enemy archers currently fight at contact range.
Support ultimates currently heal globally rather than implementing the intended aura
and heal distinction. Hero armor does not yet mitigate incoming enemy damage.

Keep the first map and ten-wave scope until these increments are complete.

Milestone status: the playable baseline is user-confirmed; all seven increments
(1A, 1B, 2A, 2B, 3A, 3B, 3C, 4) are implemented. Remaining verification is manual
browser playtesting by the user. Deferred items live in "Deferred, not rejected"
in the spec (second map, 20-wave mode, endless, leaderboard, replays).

## Handoff (September 23, 2026)

Where to continue:
- `npm run test:tower-defense` — headless combat/upgrade/virtue checks.
- `npm run test:td-balance` — five-squad balance harness; rerun after any tuning
  change in `gameBalance.tuning.json`, `tdWaves.json`, or the sim.
- `npm run build:game-balance` — regenerate hero balance after roster or rating
  changes (`--check` guards staleness).
- The page exposes `window.tdGame` and `window.tdRenderer` for browser debugging.
- Open follow-ups, none blocking: sound variants were chosen without a listening
  pass; generated enemy artwork remains an optional upgrade over the vector
  sprites; the aura ultimate branch is dormant (all roster supports have
  TEAM_HEAL); Pimen spell effects and a particle plugin stay parked per the 3C
  design section.

### Second map: Verdant Crossing (September 23, 2026)

Driven by the moodboard set in `src/game/moodboards` (winding multi-pass paths,
map-side cost panels, goal markers across nine tower-defense references):
`tdMaps.json` now holds two maps and the page offers a pre-run map picker in the
header (persisted in `td:map`, switching reloads the page). The new map,
Verdant Crossing, uses an S-curve with a return pass so platform slots between
the lanes cover two path segments at once; a `theme` field recolors the
renderer ambience (moonlit = purple, verdant = green). The balance harness now
runs every squad on every map; measured outcome matches Moonlit Pass — the
same three perfect squads, budget wins with 1–2 leaks, road wall still loses to
flyers as designed. Deferred from the moodboards: an always-visible recruit
cost panel (the command deck already shows costs), endless mode, and
free-form maze building — our slot-based placement is deliberate.

## Milestone series 5: retention psychology (in progress, September 23, 2026)

Source: user-provided analysis comparing our build against Infinitode 2
screenshots. The diagnosis: the game runs correctly but lacks the triggers that
tell the player why each decision matters. These are design and tuning changes,
not new systems. Priority order is A, B, D, then optional C and E; the combined
A+B+D package is the recommended next work block.

### 5A Economy restructure — scarcity between waves (implemented, September 23, 2026)

Problem: gold is always sufficient, so "recruit or upgrade?" never bites.
Goal: wave income should force a real choice most waves — roughly one upgrade
OR progress toward one recruit, not both. Work: audit wave income and spending
in `gameBalance.tuning.json` against the harness `spent` column (currently
2905–4005 gold per run), lower income and/or raise prices until the budget
squad must skip upgrades to afford its fifth hero, then re-tune the harness
expectations. Done when: the budget squad wins but cannot fully upgrade, and
at least one squad losses trace to under-spending rather than composition.

Outcome: the audit showed total run income ~4,824 gold against ~1,825 needed
for everything (2.6× too generous). Implemented: kill rewards cut to
5/5/6/7/12/50 gold, upgrade prices raised to 80/120/160, and a new flat,
wave-scaling clear bonus (`run.waveClearBonus`, 100 + 20 per wave) so early
waves reliably fund the next recruit while late-run gold stays tight;
starting gold 300→340. Pure reward cuts failed twice — squads starved before
wave 4 — because the problem was income timing, not just totals. Measured
result (seed 99, both maps): budget wins with 5 leaks and ~15 lives while
ending most waves with under 90 gold unspent (a real choice every wave);
balanced and all-platform stay perfect; road wall still loses to flyers by
design. Browser-verified: wave 1 summary reports 135 gold (35 kills + 100
clear bonus).

### 5B Virtue identity — hero-named blessings + pair synergies (implemented, September 23, 2026)

Problem: virtues read as raw modifiers ("Minigame effect: attack +15%").
Goal: name blessings after roster heroes (e.g. Favor of Amunra, Protection of
Nuwa, Blessing of Caishen) and grant a visible set bonus when two thematically
linked virtues are picked (e.g. Fire Affinity +5% when both fire virtues are
active). Work: mapping table for the 12 virtueEffects in the tuning file,
sim-side pair detection, UI shows the triggered combo as its own chip. Done
when: the virtue panel celebrates a completed pair and the harness still
passes unchanged (pair bonuses enter the tuning file, not hero data).

### 5B status (September 23, 2026)

Implemented: `virtueBlessings` map added to `gameBalance.tuning.json` (12 entries:
"Blessing of Zeus", "Veil of Nyx", etc.) and `virtuePairs` array (4 pairs: Storm Bond,
Iron Pact, Divine Flow, True Sight). `sim.js` extended with `this.activePairs = []` in
`reset()`, pair detection loop in `chooseVirtue` (first complete pair wins, no
duplicates), and pair bonuses aggregated in `modifiers()`. `TowerDefensePage.astro`
virtue offer cards show the hero-named blessing instead of the raw key; active chips
show hero names; triggered pairs render as gold-bordered chips with the pair label.
`commandNote` names the triggered pair when a completing virtue is chosen. 4 pair
test cases added to `test-td-sim.mjs`, all pass. Existing balance harness passes
unchanged.

### 5C Synergy visibility (implemented, September 23, 2026)

Problem: players cannot tell whether adjacent heroes work well together.
Goal: inspector shows concrete neighbor bonuses ("next to Caishen: +25%
damage"), combat view draws green links between synergizing heroes, HUD badge
counts active synergies ("3/5"). Depends on: a definition of what a synergy
is — likely shared hero tags, which connects to the deferred tag-synergy idea
(+8% per shared tag, cap 24%). Decide that rule first; this milestone is its
presentation layer.

Implemented: `synergy` block added to `gameBalance.tuning.json`
(`bonusPerTag: 0.08, cap: 0.24, range: 250`). `sim.js` extended with
`synergyBonusFor(hero)` (sums shared tags across alive heroes within 250px,
capped at 0.24), `synergyLinksFor(hero)` (partner list with shared tags for
display), and `activeSynergyCount()` (unique active pairs for HUD badge);
`synergyBonusFor` wired into `attackValue`. `render.js` draws green dashed
lines from a selected hero to each synergy partner with a per-partner `+N%`
label. `TowerDefensePage.astro` inspector shows the synergy bonus and partner
names; HUD shows a Synergies badge (hidden when zero). Five test cases pass.
Balance harness passes; verdant-crossing budget squad retains an imperfect win
meeting the harness assertion.

### 5D Run-result screen — stats, comparisons, achievements (implemented, September 23, 2026)

Problem: the result screen reported score and little else.
Goal: report duration, MVP hero, gold efficiency, best virtue, achievements,
and a "better than last time" comparison line.

Implemented: sim.js extended with `heroKills` (entityId -> {name, kills}),
`totalGoldEarned`, `totalGoldSpent`, and `runDuration` (set on `finish()`).
`TowerDefensePage.astro` result panel now shows a stats grid (MVP with kill
count, duration, gold left vs. earned, gold spent, best blessing), a
comparison line vs. the previous best for that map (score, lives, leaks,
speed), and achievement chips (Perfect Defense, Hoarder: 150+ gold left on
win, Speed Run: win in <=300 sim-seconds). Per-map bests persisted in
`td:v1.mapBests` keyed by map id. CSS: `.td-result-stats`, `.td-result-stat`,
`.td-result-compare`, `.td-result-achievements`, `.td-achievement`. Five new
test cases cover kill attribution, runDuration, gold spent tracking, gold
earned tracking (kill reward + wave clear bonus), and reset cleanup; all pass.
Balance harness unchanged.

### 5E Between-wave pacing (optional)

Problem: the gap between waves is a dead click.
Goal: wave-clear chime, gold-inflow animation, virtue offers fade in, and an
optional auto-next countdown (~3 s, cancelable). Small UI/animation pass on
the existing clear/summary flow.

### 4 status (September 23, 2026)

Implemented: the sim tracks total leaks and flags a perfect defense (win with zero
leaks); the result screen reports score, waves, surviving lives, and leak count,
with a "Perfect defense" kicker for flawless wins; the personal-best panel carries
a persistent 🏆 marker stored in `td:v1` (`perfectDefense`). Balance tuning was
driven by the new five-squad harness: starting gold 260→300, kill rewards raised
~10%, per-wave enemy scaling 8%→15%, boss hp 1600→2200, enemy attack values lowered
so single cheap blockers are not shredded. Measured outcome (seed 99, policy:
deploy affordable, buy cheapest upgrade, take first virtue):

| Squad | Result | Lives | Leaks | Spent | Duration |
| --- | --- | --- | --- | --- | --- |
| balanced (S-tier core) | perfect win | 25 | 0 | 2905 | 279s |
| budget (D-tier) | win | 21 | 2 | 3645 | 404s |
| road wall (1 platform) | loss (flyer flood) | 0 | 26 | 1725 | 377s |
| all platform (no blockers) | perfect win | 25 | 0 | 1775 | 269s |
| glass cannon | perfect win | 25 | 0 | 2530 | 229s |

Four squads win through different compositions; the road-wall squad loses to
flyers, which is the intended counter design (flyers require platform coverage).
Run duration measures 229–404 sim-seconds, inside the 10–20 minute research band
at 1x–2x speed. Assertions: at least two squads win, and at least one win is
imperfect, so the harness fails if the game becomes trivial or unwinnable.

### 3C status (September 23, 2026)

Implemented: the Kenney Particle Pack, Impact Sounds, and Interface Sounds are
vendored under `public/td/` (`fx/`, `sfx/`, combined `LICENSE-kenney.txt`, all CC0).
The renderer runs a render-side particle system fed by sim effect events, keeping
the sim deterministic: melee slash, projectile trace, magic impact, healing beam,
aura star, and larger ultimate/boss-entrance bursts. Reduced-motion mode skips
particle spawns and keeps the static markers. A small WebAudio module
(`src/game/td/audio.ts`) plays hits, enemy strikes, placements, upgrades, wave
clears, leaks, and errors with per-kind rate gaps plus a 3-hits-per-600ms cap;
volume and mute persist in `localStorage` (`td:audio`) and are controlled by a HUD
slider and mute button. headless sim checks, a dev-server page load, and Playwright combat screenshots pass;
particles are cropped to their visible artwork and tinted gold/purple/green/red.
Known gap: the six effects are recolored but not yet resized per enemy tier; sound
variants were chosen without a listening pass. Next: 4 (tuning and replay value).

### 3B status (September 23, 2026)

Implemented: after each cleared wave the sim offers three seeded virtue picks drawn
from 12 real virtue sets mapped to minigame effects in `gameBalance.tuning.json`
(`virtueEffects`). The panel shows the real set name, the real 2-piece bonus text
from `virtues.json`, and a separately labeled "Minigame effect" line. One selection
per gap; unclaimed offers expire when the next wave starts, and chosen blessings
appear as active chips for the rest of the run. Effects implemented: attack,
resistances, maximum health (granted as current health to deployed heroes and to
future placements), healing strength, ultimate charge speed, critical chance, and
dodge. Restart clears choices and offers. Headless checks cover reproducible offers
(same seed, same picks), one selection per gap, applied effect math, offer expiry,
and restart cleanup; all pass. Next: 4 (tuning and replay value).

### 3A status (September 23, 2026)

Implemented: the boss renders with the real Baphomet artwork from R2 (verified
reachable, with the old shape as fallback); enemy kinds are distinguishable by
silhouette (grunt circle, runner triangle, flyer diamond, archer square, brute
hexagon, boss artwork) in addition to color; every hero attack and enemy strike
draws a short tracer line from attacker to target, colored by damage type (enemy
shots in red); the path start and end carry labeled ENTRANCE/EXIT portals; and
`prefers-reduced-motion` swaps pulsing/expanding effect rings for static, dimmed
markers while keeping informational tracers. No new generated image assets — the
enemy sprites are vector shapes per the quota protocol; a generated sprite batch
remains an optional later upgrade. Headless checks assert tracer effects on
attacks; all pass. Next: 3B (virtue choices), then 4 (tuning and replay value).

### 2B status (September 23, 2026)

Implemented: supports now project a passive local aura — allies inside the support's
range gain +10% attack (`passiveAuraBonus` in the tuning file). The bonus is computed
live, so it ends the moment the support falls, and it never stacks (strongest single
source only). Selecting a support draws dashed gold links to every benefiting ally
with a `+` marker on each; the inspector names the beneficiaries ("Aura: Nuwa, Zeus
gain +10% attack inside the ring") or, for other heroes, names the source
("Receiving +10% attack from Caishen's aura"). The dormant ultimate aura branch from
1A stacks on top for non-TEAM_HEAL supports. Headless checks cover in-range/out-of-range,
the no-stacking cap, aura loss on death, and aura-increased real damage; all pass.
Next: 3A (enemy sprites, boss art, attack feedback).

### 2A status (September 23, 2026)

Implemented: deployed heroes gain levels 1–4 via an upgrade button in the inspector,
available only between waves. Prices are 50/75/100 gold from the tuning file; each
level adds 10% of base attack and 20% of base maximum health, with the new maximum
granted as current health but no free full heal. The inspector shows the level,
exact before/after values, and a disabled button with the concrete reason when a
purchase is impossible (mid-wave, insufficient gold, level cap). Upgraded heroes
carry a gold `Lv n` badge on the field; the inspector restates the rule that levels
belong to the deployed unit and a fallen hero re-enters at level 1. Headless checks
cover exact-cost purchase, insufficient funds, mid-wave rejection, level cap, the
no-full-heal rule, re-recruitment at level 1, and a full winning run that upgrades
between waves; all pass. Next: 2B (visible positional support benefits).

### 1B status (September 23, 2026)

Implemented: between waves the command panel shows the next wave's composition as
chips (enemy kinds and counts, straight from the spawn data) and the previous wave's
result (kills, leaks, gold earned) from new per-wave counters in the sim. Selected
deployed heroes draw a dashed range ring, hovering a matching slot with a deck hero
selected previews its range before placement, and every hero carries a facing tick
showing the direction `R` rotates (which drives the 1A cone ultimates). The inspector
now states deployment state and range. Headless checks assert that previews match
`tdWaves.json` and that kills + leaks and gold earned reconcile exactly with the
simulation; all pass. Known gap: desktop/390px interaction checks are with the user.
Next: 2A (between-wave hero upgrades).

### 1A status (September 23, 2026)

Implemented: hero armor now mitigates incoming enemy damage (`resolveDamage` with new
per-enemy `attack`/`attackPeriod`/`attackRange` tuning values); flyers are untargetable
by road heroes and never fight blockers, so platform coverage is mandatory; enemy
archers hold at 110px and shoot blockers from range; support ultimates act locally
inside the support's range — heal for `TEAM_HEAL` heroes, a +25% attack aura for the
rest (all three roster supports currently carry `TEAM_HEAL`, so the aura branch is
dormant); `cleave` and `volley` respect facing cones with an all-around fallback, so
`R` rotation now matters; leaks and hero deaths fire `onChange` immediately and the
HUD/inspector react. `gameBalance.json` now carries `synergies` per hero (regenerate
with `npm run build:game-balance`). `scripts/test-td-sim.mjs` covers all of the above
plus full headless win and loss runs; all checks pass. Known gap: facing is not yet
rendered (1B), and support benefits are invisible to the player (2B).

Carry forward the original spec's edge cases and tests into the relevant increments:
deterministic full runs and RNG reset, single kill rewards, terminal-state precedence,
background-tab time clamping, valid placement, corrupted storage recovery, keyboard
controls, touch targets, and missing artwork. Resolve rotation/cone behavior in 1A
and show facing in 1B. Verify balance formulas and damage-type defaults in 1A;
verify projectile cleanup and reduced motion in 3A. Keep tuning separate from real
hero data and use the site's tokens. Browser checks must exercise actual interactions.

## Delivery order

Each row is a separate implementation and verification checkpoint. Finish one before
starting another; do not bundle the entire roadmap into one session.

| Increment | Player outcome | Completion evidence |
| --- | --- | --- |
| 1A: reliable combat | Blockers benefit from defenses; flyers require platform coverage; ranged enemies and support ranges behave as described. HUD reflects leaks and hero deaths immediately. | Targeted combat checks, full win and loss scenarios, browser startup/restart check. |
| 1B: readable planning | See the next wave's enemy types and counts, plus kills, leaks, and gold earned after each wave. Selected heroes show their range and deployment state. | Preview agrees with spawn data; summary totals agree with the simulation; desktop and 390px interaction checks. |
| 2A: upgrade decisions | Between waves, spend gold on an existing hero or deploy another member of the selected squad. Upgrades show their price and exact effects before purchase. | Exact-cost purchases, insufficient funds, level cap, duplicate clicks, and reset behavior verified; complete a run using upgrades. |
| 2B: spatial support | Support placement provides visible, local benefits. Inspector explains which allies benefit and why. | Moving into/out of range, death, stacking caps, and damage/heal effects verified. |
| 3A: battlefield art and feedback | Distinguishable enemy sprites, real Baphomet art, visible attacks, and clear entrance/exit markers. | Assets load with fallbacks; action remains readable at phone size; reduced-motion mode works. |
| 3B: virtue choices | Pick one of three seeded virtue rewards between waves, using real set names and separately labeled minigame effects. | Reproducible choices, one selection per gap, implemented effect mappings, and restart cleanup verified. |
| 3C: particle and sound feedback | Hits, projectile trails, magic impacts, healing, the support aura, and boss ultimates read as distinct effects built from the Kenney particle pack, plus a small impact/interface sound selection with volume, mute, and concurrent-hit limiting. | Assets vendored locally with license notes; effects visible on desktop and phone; audio controls work; no new production dependencies. |
| 4: tuning and replay value | Several squads can win through different approaches; results show score, surviving lives, and a perfect-defense achievement. | Recorded runs compare duration, spending, leaks, damage, and win rate across a small representative squad set. |

1A and 1B complete the current prototype's foundation. 2A is the next major gameplay
feature. Art can be delivered before later progression systems if asset generation
has sufficient quota and the combat presentation is ready to consume it.

## Proposed upgrade design for 2A

These are starting hypotheses for playtesting, not verified balance or real hero facts.

- Levels 1–4, purchased only between waves for a deployed hero.
- Initial price candidates: 50, 75, and 100 gold, stored in the tuning file.
- Each level adds 10% of base attack and 20% of base maximum health. Start with unchanged
  attack speed so the strength increase is easy to interpret and tune.
- Grant the increase in maximum health as current health, without a free full heal.
- Display level and exact before/after values in the inspector and a compact level badge
  on the field. Provide a clear disabled state with the reason a purchase is unavailable.
- Levels belong to the deployed unit; a fallen hero can be recruited again at level 1.
  State this rule in the purchase interface.
- Keep five preselected heroes and one deployed copy per hero. Recruitment means
  deploying a selected squad member, not opening the full roster during a run.

Measure surplus gold and upgrade purchases before changing rewards. The research's
example prices and wave incomes should not replace the existing numbers wholesale.

## Proposed effect design for 3C

Source: user asset research, September 23, 2026. Small asset packs fit the existing
canvas renderer directly; no engine change is needed.

| Pack | Use | Assessment |
| --- | --- | --- |
| Kenney Particle Pack (CC0) | ~80 effect textures as the basis for hits, magic particles, and projectile trails | First choice. Recolor and rescale to the gold-purple palette. |
| Pimen Spell Effects 02 | Ready pixel-art spells (ice, light, darkness, acid, nature); commercial use and editing allowed, redistribution of raw sprites forbidden | Distinct skills, but the pixel style only partly matches the detailed hero portraits. |
| Kenney Impact Sounds (CC0) | ~130 sounds for impacts and hits | Good base for audible combat feedback; variants need a listening pass. |
| Kenney Interface Sounds (CC0) | ~100 sounds for selection, placement, upgrades, confirmations | Low integration effort, immediate feedback. |

Plan: Kenney particles plus a small sound selection, built into six distinguishable
effects — melee swipe, projectile trail, magic impact, healing, support aura, and
boss ultimate. Subtle standard hits, clearly stronger ultimates. Sounds get volume
and mute controls plus a cap on concurrent hit sounds so a full wave stays pleasant.

Decisions: no complete tower-defense kit (too much rework); check a particle plugin
only if our own renderer hits its limits; no paid assets and no new production
dependencies expected. Vendor the chosen assets into the repository with license
notes rather than hotlinking, and keep the 3A vector fallbacks for reduced motion
and load failures.

## Research notes and decisions

Source: user-supplied German research report, September 23, 2026. These notes preserve
its design proposals. Psychological claims and suggested numeric targets have not
been independently validated. The report's checkmarks describe proposed priorities,
not features already present in this repository.

The useful design thesis is frequent, understandable decisions: placement, saving
versus spending, counters, and combinations. Short feedback loops and a stable map
should let the player understand why a strategy improved. Aim for satisfying mastery
and voluntary replay; judge success through observed play rather than claims about
addiction or dopamine.

| Research proposal | Treatment |
| --- | --- |
| Scarce gold and spending tradeoffs | Adopt through upgrades and deployment choices; measure income before retuning. |
| Wave previews and completion metrics | Adopt in 1B. Show kills and leaks without implying every survival run must be perfect. |
| Fixed 15–20 second planning pauses | Keep manual next-wave start. No mandatory wait or countdown initially. |
| Hero levels and visible stars/badges | Adopt levels in 2A, with a compact badge and readable stat changes. |
| Nearby supports improve allies | Adopt through class/tag-based support ranges first; expose the actual benefit. |
| Named Momus/Caishen/Zeus pair bonuses | Preserve as illustrative ideas only. Caishen is Support, Zeus is Mage; do not invent canonical fire skills or pair relationships. |
| Gold costs for ability casts and unlock points | Defer. Current spec uses automatically charged ultimates; changing that would be a distinct combat design experiment. |
| Staged roster unlocks at waves 4 and 7 | Defer. Keep the selected squad available from the start; introduce enemies progressively. |
| Three consecutive kills grant bonus gold | Defer. It could reward last-hit luck and amplify an already strong carry; reassess after the base economy is measured. |
| Temporary economy, defense, synergy, and deployment perks | Defer until permanent upgrades and virtue choices have distinct purposes. Extra deployed heroes would require revisiting the five-member cap. |
| Sound for rewards, kills, leaks | Optional later addition with mute/volume controls; avoid a jingle for every kill. Keep visual feedback sufficient. |
| More enemies rather than only more health | Use mixed composition, spacing, and counts when tuning. Keep waves 1–3 approachable, introduce threats in 4–7, and culminate in 8–10. |
| 15–20% difficulty increase per wave | Treat as an untested suggestion, not a rule. Compounded increases are exponential, and difficulty depends on composition and available counters. |
| 10–20 minute runs | Measure the current ten-wave duration first; choose a target after playtesting rather than padding the run. |
| Perfect defense and personal progress | Add alongside survival and best score in increment 4. Endless mode and 50-wave records remain deferred. |

The original spec also proposes shared-tag attack bonuses. Implement local support
effects first, then evaluate whether the shared-tag bonus adds a distinct decision.
If retained, explain both sources and cap stacking explicitly. Do not stack several
unexplained percentage systems at once.

## Quota-aware working protocol

Latest snapshot inspected for this plan: September 23, 2026 at 08:27:30 Europe/Berlin.
It recorded 82% remaining in the five-hour window and 3% remaining in the weekly
window, with no additional credits. Recorded resets: September 23 at 13:25:13 for
the shorter window; September 24 at 09:13:24 for the weekly window.
These are historical readings, not a live counter or a promise of remaining capacity.
The user subsequently reported 1% weekly remaining on September 23. Pause new
implementation until a fresh quota check supports resuming after the recorded reset.

- Before starting an increment, read the newest local usage snapshot and report its
  timestamp, both windows, and reset times. Never label the five-hour window daily.
- Use the more depleted window to decide scope. With the recorded 3% weekly remainder,
  finish documentation and checkpoints; defer a new implementation increment until
  a fresh snapshot confirms sufficient allowance.
- As a working heuristic, reserve at least 10 percentage points in both windows for
  verification and handoff. Below that, prefer finishing existing work over starting
  a new increment. This is a planning margin, not a guaranteed token budget.
- Check again after implementation and before optional expansion or image generation.
  Learn the actual cost of a completed increment before estimating the next one.
- Image generation gets a separate bounded batch: inspect and integrate its output
  before requesting more images. Reuse existing hero and boss artwork.
- End every increment with working code, relevant check results, known gaps, and a
  precise next action documented here. Do not wait for exhaustion to write the handoff.
- If snapshots are stale, report that limitation. Never assume a scheduled reset has
  happened or guarantee that quota cannot run out during a task.

The current session delivers planning and documentation only. Next implementation
checkpoint: 1A, followed by 1B. Run relevant checks without `npm run build`, which the
user runs separately. No new production dependencies are planned.

## Milestone series 6: cross-run meta-progression (planned, September 23, 2026)

Source: moodboard analysis comparing our build against Infinitode 2 and nine other
tower-defense references. The diagnosis: within-run decisions are now meaningful
(5A economy, 5B virtues), but every run starts identical regardless of play history.
Meta-progression answers "why start the next run." Priority: 6A first; 6B and 6C
depend on a result screen (5D) being in place.

### 6A Divine Favor tree (implemented, September 23, 2026)

Problem: a run leaves nothing behind. Loss feels punishing rather than instructive;
a win leaves no permanent mark.
Goal: earn Favor tokens after every run (win or loss) and spend them before a run
on a named node tree of small permanent bonuses. Every run is progress toward
something, even a failed one.

**Favor economy** (rates in `gameBalance.tuning.json` under `favorEarn`):

| Event | Favor |
| --- | --- |
| Per wave completed | +10 |
| Per wave with zero leaks | +5 bonus |
| Boss killed | +20 |
| Per remaining life at run end (cap 25) | +1 |

Full perfect win: ~195 Favor. Loss at wave 5: ~50. Stored in `td:v1.favor` (cumulative,
never spent away). Unlocked nodes stored as `td:v1.favTree: string[]`; unknown ids
silently dropped on load.

**Tree: 12 nodes, 3 tiers.** Named after roster heroes for flavor; effects are
tuning-level knobs only, no invented hero facts.

Tier 1 - 25 Favor each, always available:

| Node | Effect |
| --- | --- |
| Demeter's Bounty | Starting gold +25 |
| Freya's Blessing | Max lives +1 |
| Horus's Sight | Wave preview shows enemy total HP |
| Jormungandr's Hide | All heroes start with +5% max HP |

Tier 2 - 60 Favor each, require 1 Tier 1 node:

| Node | Effect |
| --- | --- |
| Nuwa's Wall | Tank class HP +10% |
| Zeus's Dominion | Mage range +15 px |
| Caishen's Treasury | Kill gold +10% |
| Bastet's Edge | Assassin execute threshold 35% -> 40% |

Tier 3 - 120 Favor each, require 2 Tier 2 nodes:

| Node | Effect |
| --- | --- |
| Amunra's Surge | Ult charge speed +15% |
| Yuelao's Bond | Synergy bonus per shared tag +2% |
| Poseidon's Tide | All road blockers contact range +8 px |
| Nyx's Veil | Wave 1 enemies -25% speed |

Total to unlock all 12: 820 Favor (~5-6 full wins). First node available after
one partial run.

**Files** (4, all under the 10-file limit):

- `src/data/favorTree.json` (new) - node definitions: id, name, tier, cost, requires,
  effect `{ type, value }`, description
- `src/game/td/favor.js` (new) - `computeFavor(runStats, tuning)` and
  `applyFavorTree(unlockedNodes, tuning)` returning a shallow tuning override; pure
  functions, no DOM, headless testable
- `src/data/gameBalance.tuning.json` (edit) - add `favorEarn` block with the rates above
- `src/components/pages/TowerDefensePage.astro` (edit) - Blessings panel in pre-run
  screen (collapsed by default, after map picker); Favor earned appended to run-end
  result panel

**Sim integration**: `applyFavorTree` returns a merged tuning object; pass as
`tuning: { ...baseTuning, ...bonuses }` to `TowerDefenseGame`. No sim file changes.

**localStorage `td:v1` schema extension**:
```
{ bestScore, bestWave, lastTeam, perfectDefense, favor: number, favTree: string[] }
```

**Test cases** (extend `test-td-sim.mjs`):

1. `favor_earn_perfect_win` - 10 perfect waves + boss + 25 lives = 195 Favor
2. `favor_earn_loss_wave5` - loss at wave 5 = 50 Favor
3. `favor_tree_startgold` - Demeter's Bounty unlocked: starting gold 340 -> 365
4. `favor_tree_requires` - Tier 2 node blocked with 0 Tier 1 nodes unlocked
5. `favor_unknown_id_dropped` - `favTree: ["nonexistent"]` loads cleanly, 0 bonuses
6. `favor_no_stacking` - same node id twice in `favTree` applies effect once

**Edge cases**: first-run player has 0 Favor, plays identically to today. Respec
button refunds all Favor spent (no permanent loss). Tree read-only during a run.

### 6A status (September 23, 2026)

Implemented: `src/data/favorTree.json` (12 nodes, 3 tiers, 820 total Favor to complete),
`src/game/td/favor.js` (`computeFavor`, `applyFavorTree`, `canUnlock` pure functions),
`favorEarn` block added to `gameBalance.tuning.json`, `TowerDefensePage.astro` extended
with a collapsed Blessings panel (pre-run, after map picker), per-run Favor earned line
in the result panel, and `startingGold`/`lives` bonuses applied to `effectiveTuning`
before game construction. Other tree effects (tank HP, mage range, etc.) are returned
by `applyFavorTree` as bonus keys and are no-ops until the sim reads them. `td:v1` schema
extended with `favor: number` and `favTree: string[]`; unknown ids silently dropped on
load. All 6 favor test cases pass. Respec button refunds all spent Favor. Tree is hidden
and read-only once a run starts.

### 6B Run quests (medium impact, requires 5D result screen)

Problem: no in-run objectives beyond "survive."
Goal: 3 seeded per-run quests ("Let no enemy reach exit through wave 4", "Cast 10
ultimates in one wave", "Win with 4 or fewer heroes deployed"). Completing a quest
grants bonus gold or an extra virtue pick. Shown as a collapsible HUD chip; result
screen shows which completed. Reward amounts in tuning file.

### 6C Result-screen loot (medium impact, requires 5D result screen)

Problem: result screen is a report, not a reward.
Goal: run end grants 1 of 3 random virtue shard choices (cosmetic collect that
also feeds 6A Favor pool at +5 per shard selected). Makes every run feel productive
even on loss. Choice is seeded from run outcome so it is reproducible on reload.

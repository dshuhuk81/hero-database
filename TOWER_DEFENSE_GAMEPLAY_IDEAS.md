# Tower Defense: state analysis and gameplay ideas

Written October 1, 2026, on branch `tower-defense-planning`. Planning input only: nothing here
is approved or built. Sources: the spec, roadmap, mechanics overview, progress audit, boss
concepts, home camp plan, `tdCampaign.json`, `gameBalance.tuning.json`, `sim.js`, and two fresh
reports (`npm run td:classes`, `npm run td:economy`).

The game has more systems than most finished tower defense games, and its combat is deep. What it
lacks is **variety after the first hour** and **things for the player to do while a wave runs**.
Chapters 2 and 3 add maps and harder numbers but no new questions, and once heroes are placed the
player mostly watches. The ideas below target those two gaps first, and reuse existing engines
(stage data, challenges, quests, boons, blessings) wherever possible so they add depth without
adding a new layer to learn.

---

## 1. Where the game stands

### What is strong

The combat core is finished and testable: deterministic simulation, six classes with distinct
jobs, 21 unique ultimates, statuses with five reactions, blocking, special tiles, and four enemy
counters (shields, healers, summoners, hexers). Around it sit four modes (Campaign, Free Play,
Daily Trial, Expedition), a 74-node blessing tree, a summon banner with rarity and pity, hero
levels, stars and evolution, laurel ratings and chapter milestones. Three campaign chapters exist
with 22 stages.

### Gap 1: enemy variety stops after Chapter 1

All 11 enemy kinds are introduced by stage 1-8. Chapters 2 and 3 reuse exactly the same kinds,
only in larger numbers:

| Chapter | Theme | New enemy kinds | Finale boss |
|---|---|---|---|
| 1 The Road to the Crossing | moonlit / verdant | all 11 | Lilith (1-10), Baphomet (1-5) |
| 2 The Sunscar March | desert | none | Baphomet again (2-6) |
| 3 The Emerald Deep | jungle | none | Ochenta (3-6) |

Stage 3-6 fields 64 runners and 60 flyers where 1-1 had 14 runners. That is a harder version of
the same test. The desert and jungle themes have no creatures of their own, and the three
prepared bosses (Lerna, Kraghorn, Vorruk) have art, animation sheets and a full design in
`TOWER_DEFENSE_BOSS_CONCEPTS.md`, but no rules. They fight as a plain boss.

### Gap 2: stages differ only in map and numbers

A stage is a map, a wave list, lives and an HP scale. There are no stage rules. The three laurel
goals are the same everywhere (clear, keep 50% of lives, keep 90%), so replaying a stage never
asks for a different squad or strategy. The Free Play challenge system (`challenges.js`) already
evaluates goals such as "win with 3 heroes" or "finish under 5 minutes", but campaign stages do
not use it.

### Gap 3: little to do during a wave

Heroes attack and cast ultimates on their own. During a wave the player can upgrade, sell and
change target priority, but has no active tool. `startWave()` refuses to start while a wave runs,
so there is no early call either. Most decisions happen between waves; the wave itself is
spectating. The genre's best examples (Kingdom Rush, Bloons, Arknights) all give the player one or
two active levers during the fight.

### Gap 4: class balance leans on Mages

The class report (fresh run, October 1) shows Mages as the best or near-best platform answer for
swarms, armor, runners, shields and summoners:

| Wave type | Best road | Best platform |
|---|---|---|
| swarm | Warrior 35% | Mage 43% |
| armored | Tank 50% | Mage 51% |
| runner | Assassin 35% | Mage 50% |
| flyer | none (road 0%) | Archer 62% |
| boss | all road 100% stopped | Archer 35% |
| shield | Warrior 26% | Mage 31% |
| summoner | Warrior 33% | Archer 72% |

The September audit measured the effect: removing Mages drops the mean Endless wave from 30.7 to
13.2, while removing Tanks raised it to 33.8. Squad size 6 helped Tanks in the campaign, but no
enemy yet makes a Tank the clear answer. New enemies are the cleanest fix, because they add
reasons to pick a class instead of nerfing the one that works.

### Gap 5: synergy is invisible

Synergy gives +8% attack per shared tag between nearby heroes, capped at +24%. The tags are the
database's technical ability tags (Hephaestus alone carries 11, such as `SELF_ENERGY_RESTORE`).
Almost any two heroes share several, so the bonus is usually at its cap and the player cannot plan
around it. It is a free stat, not a decision.

### Gap 6: the economy leaves gold idle in short runs

`td:economy` on classic Normal shows ~350 gold left at the end of a run and only ~90 gold per run
on awakening and training. Long and Endless use those sinks fully (40-57% of spending). In a
10-wave run the late-game choices barely appear.

### Gap 7: open meta items

Daily quests are the next roadmap item (M26 sprint 11). Campaign upgrades still apply only in
Campaign (home plan decision 1a is open). Divine Seal income after first clears is thin (replays
pay a quarter; daily goal 15). Leaderboard, accounts and prestige are deferred.

---

## 2. Ideas, ranked by value for effort

Each idea lists what it adds, how it fits the current code, and a rough size (S: a day or less,
M: a few days, L: a week or more).

### A. Make each stage ask a new question

**A1. Stage goals for the third laurel (S-M, highest value).** Keep laurel 1 (clear) and laurel 2
(keep 50% of lives). Make laurel 3 a stage-specific goal authored in `tdCampaign.json`, using the
checks `challenges.js` already computes from `runFacts()`:

- "Win with at most 4 heroes" (1-4 Shield Wall)
- "No hero falls" (1-6 Hexfire, where hexers punish exposed platforms)
- "Defeat the Horned Warden within 60 seconds of its arrival" (1-5)
- "Win without a Mage" (2-3 Serpent Wells, armor plus healers, pushes Warrior and Tank)
- "Let no flyer through" (2-5 Mirage Gate, 44 flyers)

Players replay stages with a different squad to earn the third laurel, which feeds the existing
milestones. Older saves keep their rating through `bestLives` for laurels 1-2; laurel 3 needs a
new `goals` record per stage (save version bump, default empty).

**A2. Stage rules (M).** An optional `rules` block on a stage that the session passes into the
simulation. A few rules cover a lot of ground:

| Rule | Effect | Fits |
|---|---|---|
| `nightfall` | platform range −20%; high ground tiles cancel it | moonlit stages |
| `sandstorm` | every third wave, flyers and ranged enemies hidden until 200 px from the base | Sunscar |
| `startingGold` / `noSell` | tighter or looser economy | puzzle stages |
| `fixedHero` | one guest hero is always in the squad | story stages, trying heroes before owning them |
| `bannedClass` | one class unavailable | late-chapter twists |
| `overgrowth` | one road tile per wave becomes blocked by roots until a road hero clears it | Emerald Deep |

The rule name and one sentence appear in the stage drawer and on the HUD. Rules stay data; each
needs one small hook in `sim.js`.

**A3. Give the prepared bosses their rules (M each).** `TOWER_DEFENSE_BOSS_CONCEPTS.md` already
specifies stats, attacks and counterplay for all three. Suggested placement: Kraghorn replaces
Baphomet as the 2-6 finale (Chapter 2 currently reuses the 1-5 boss), Lerna becomes a Chapter 3
mid-boss (3-3 Flooded Court, which suits its overgrown theme), and Vorruk, the most complex, opens
Chapter 4 on a Sunscar-style map as the concept doc suggests. The concept doc builds Lerna first
because it needs the least new code; Kraghorn first is argued here because it fixes a balance
problem: its charge stops at the first living road hero, then its armor halves for 4 seconds.
A healthy Tank at a choke point is the reliable answer, which is the clear Tank payoff the audit
asked for.

**A4. A creature family per chapter (L).** Two new enemies per chapter, introduced in the
chapter's first stages, each answered best by a class other than Mage:

| Chapter | Enemy | Behavior | Best answer |
|---|---|---|---|
| 2 Sunscar | Burrower | dives underground for 3 s after taking damage, passing under blockers | Assassin (hits on surfacing), Tank (block 3 catches it) |
| 2 Sunscar | Glass Warden | aura: nearby enemies reflect 30% of magic damage | Archer, Warrior |
| 3 Emerald | Vinebinder | roots the road hero it touches; a rooted hero cannot attack for 4 s but still blocks | Support (cleanse/heal), Tank (survives it) |
| 3 Emerald | Jaguar | leaps over the first blocker it meets | second-line Tank, Archer focus |
| 3 Emerald | Sporeling | on death leaves a cloud that slows hero attack speed 25% | Archer (kills it far from heroes) |

Art can come through the existing PixelLab pipeline. Each kind needs a glossary entry, a
`tuning.enemies` row and an enemy card.

### B. Give the player something to do during a wave

**B1. Call the next wave early (M).** A button while a wave is still spawning or clearing:
calling early pays bonus gold scaled by the time skipped (Kingdom Rush style) and +1 Favor. This
uses the leftover gold problem: confident players earn more, cautious ones lose nothing. Needs
`startWave()` to allow overlapping waves (spawn queue append, wave stats per wave). Endless
benefits most.

**B2. Divine Interventions, two active powers (M-L, high value).** Two buttons on the HUD with
cooldowns, charged by kills like ultimates:

- **Thunderfall**: tap a spot, 0.8 s later a bolt hits all enemies in 90 px for true damage.
  Answers a leak and gives a use for the brief panic moment.
- **Shield of the Crossing**: for 6 s, enemies that reach the base cost no lives. One use per
  wave.

Unlocked at stage 1-3 (Thunderfall) and 1-6 (Shield) so the first stages stay simple. Upgrades
sit on the Favor trunk of the blessing tree (cooldown, radius), which gives Favor a new sink.
Daily Trial disables them like other blessings, keeping scores comparable. Touch: tap power, then
tap the map; the same placement hit test as tiles.

**B3. Hero relocation (S).** Move a deployed hero to an empty tile of the same type for 25% of
its deploy cost, available between waves. Today misplacement costs half of everything invested,
which punishes learning. This is the cheapest way to make placement experimentation feel safe.

### C. Make squad building a decision

**C1. Pantheon bonds instead of hidden tags (M).** Replace tag synergy with readable sets based on
the mythic identities. The roster splits cleanly into 9 Norse heroes (Odin, Ymir, Heimdall,
Aegir, Surtr, Fenrir, Nott, Vidar, Skadi) and 12 Greek heroes (Atlas, Helios, Hecate, Thanatos,
Hephaestus, Boreas, Atalanta, Stheno, Plutus, Harmonia, Asclepius, Gaia):

- Norse 2 / 4: +6% attack / +12% attack and ultimates charge 10% faster
- Greek 2 / 4: +8% health / +15% health and heals 15% stronger
- Recruits count as a wildcard for one set

Norse has no Support, so a 4-Norse squad trades healing for damage, which is a real choice. The
squad screen shows active bonds under the lineup; the battlefield shows a small bond icon. Keep
the +24% cap from today so balance shifts little, then tune with `td:sweep`. Later pantheons
(Egyptian, Eastern) give new heroes a home.

**C2. Element reactions as a squad goal (S).** Reactions already exist but only five heroes apply
statuses. Show on the squad screen which reactions the lineup can trigger ("Steam: Aegir +
Hephaestus"). No new mechanics, only visibility of an existing reward.

### D. Retention and long-term goals

**D1. Daily quests (M, already on the roadmap).** Ten small tasks per day, three rewarded steps
(3 / 6 / 10 done) so nobody needs all ten:

- Clear any 2 campaign stages
- Win a Free Play run
- Trigger 5 reactions
- Kill 300 enemies
- Upgrade a hero to rank IV in battle
- Level up a hero
- Summon once
- Earn 3 laurels
- Play the Daily Trial
- Deploy a hero of every class in one run

Rewards: Divine Seals (the scarce currency), Gold, Seal Dust. Counters come from the existing
`runFacts()` and results flow; reset at UTC midnight like the Daily Trial. Entry point: a scroll
on the War Camp home screen with a progress badge.

**D2. Heroic campaign (M).** After a chapter is cleared, unlock a Heroic version of each stage
(the existing Heroic tier: HP ×2, attack ×1.3) with its own first-clear reward of Divine Seals.
This doubles campaign content with no new maps and fixes the seal shortage the owner reported,
with income tied to skill.

**D3. Expedition route map (L).** Replace "three stages in a row" with a short branching route:
battle, elite battle (better camp card), shrine (free relic), merchant (spend leftover gold from
the previous stage on a relic), boss. Choices between nodes give the roguelite mode its missing
strategic layer. All node types reuse existing camp cards.

**D4. Campaign upgrades in Free Play and Expedition (M).** Home plan decision 1a: apply levels and
stars in those modes and scale enemy HP by squad Might. It makes the collection matter
everywhere. Measure with `td:sweep` upgraded-roster cases before shipping.

### E. Smaller ideas worth keeping

- **Wave interest**: 5% of unspent gold (cap 50) at wave clear. Adds a save-or-spend choice in
  classic. Conflicts with B1 in spirit; pick one.
- **Manual ultimate option**: per-hero toggle to hold the ultimate until tapped. Off by default.
  Good for bosses, heavy on phones.
- **Map levers**: a gate that switches the path between two routes once per wave, on a new
  generated map. Depends on the map generator work, so park it until maps are back in scope.
- **Boss rush**: weekly mode with the four bosses back to back and a fixed squad.
- **Hero mastery**: a per-hero counter (kills, stages won) that unlocks a cosmetic frame and a
  title. Cheap, rewards playing favorites.

---

### F. Combat model change: tile patterns, fewer and stronger enemies (owner idea)

Owner proposal (October 1, 2026), modelled on Watcher of Realms: each hero attacks a pattern of
tiles instead of a circle, waves bring far fewer enemies with much more health, and ultimates
can fire automatically or by hand.

**Verdict: worth doing, and it fixes several gaps at once, but it is a combat redesign.** It
should be built as a prototype behind a flag and measured before the campaign moves over.

What it solves:

- **Mage dominance (gap 4).** Splash, chain and pierce get their value from crowds. With a third
  as many enemies, single-target damage (Assassin execute, Archer crit) gains value and area
  damage loses some, without nerfing Mages directly.
- **Readable enemies.** Ten strong enemies with abilities can each be read and answered. Sixty
  runners cannot. The new creature families (A4) and boss rules (A3) need this kind of space to
  show.
- **Placement becomes the puzzle.** A circle of 140 px covers almost the same road from any
  nearby tile. A pattern (a cross, a line of three, a 3x3 block) makes the exact tile matter,
  and gives each class a visible identity on the board.
- **Manual ultimates (B2's goal).** With few enemies, timing an ultimate on the boss or a healer
  is a real decision. That covers the "nothing to do during a wave" gap with the heroes the player
  already owns, and may make Divine Interventions unnecessary.
- **Phones.** Fewer sprites and effects at once, and bigger figures fit better.

Grid check (measured from `tdMaps.json`). Every tile is drawn the same size (56 px on a 60 px
cell). The difference is alignment:

| Maps | Layout | Nearest neighbour |
|---|---|---|
| 15 `lattice-v2` maps (all campaign-only stages from 1-3 on, Chapters 2-3) | true 60 px lattice, 15 x 7 nodes | 60 px |
| `verdant-crossing`, `sunscar-ruins`, `sunscar-basin` | tiles spaced along each road segment, centred per segment, so rows on different segments do not line up | 60-91 px |
| `moonlit-pass` | hand-placed side tiles (M24 layout trial) | 60-82 px, 20 different x offsets |

Tile patterns need a lattice, so the 15 lattice maps could take patterns as they are (but see
the reference screens below: a coarser lattice is the better target). The four
older maps (used by 1-1, 1-2, 1-5, 1-7, 1-9, 1-10 and Free Play) would need regenerating on the
lattice or retiring. If tiles also look different in size on screen, that comes from the map art
or the canvas scaling, and needs a screenshot of the affected map to check.

What it costs:

- `sim.js` checks circular range in about 45 places (targeting, auras, dashes, ult areas, archer
  reach). Patterns replace basic-attack range; ultimates can keep radius areas at first.
- Facing: the game removed hero rotation in M24 for touch reasons, so patterns should be
  symmetric (cross, diamond, ring, block) and need no turning.
- All 22 campaign stages need their waves re-authored, and every bot script (`td:sweep`,
  `td:classes`, `td:pacing`) must be re-baselined. The economy shifts too: kill rewards rise per
  enemy, wave quests and the training sink need new numbers.
- Statuses and reactions lose some value when fewer enemies stand together; Steam and Conduct may
  need larger radii.

#### Reference screens (owner, October 1, 2026)

Five Watcher of Realms battle screens (jungle, desert and cave boards) compared with our game:

| Aspect | Watcher of Realms (screens) | The Last Crossing today |
|---|---|---|
| Board | about 8-9 columns by 5 rows, every tile on one lattice | 15 x 7 lattice of 60 px (lattice-v2), older maps off-lattice |
| Tile size | about a ninth of the screen width; hero figures fill a tile | 56 px in a 960 px world, about a seventeenth; 80 px figures reach into the tile above |
| Ranged tiles | a few raised stone blocks (2x2, L shapes, rows of 3) at chosen spots | one row on each side of almost every road segment, 27-43 per map |
| Road | wide, short, enemies cross the board in seconds; melee heroes stand on road tiles | one long winding path from edge to edge |
| Spawns and exits | two to three red spawn portals and one or two blue exit portals per board | one gate (two on a few maps), one sanctuary |
| Range display | the covered tiles light up green when a hero is placed or selected | a circle |
| Enemies per stage | 11, 21, 24, 38, 40 (counter "4/38") | 53 (1-1) to 280 (3-6) |
| Lives | 3-5 | 14-20 |
| Deploy resource | a regenerating cost counter ("19") plus a deploy limit ("Deployable: 6") | gold from kills and wave bonuses, deploy cap 6-7 |
| Ultimates | ready marker above the hero; auto and manual | automatic |

What follows for our game:

- **The scale gap is bigger than the first estimate.** Their stages have about a fifth to a
  seventh of our enemy count and a quarter of our lives, so every leak hurts. Prototype step 1
  below uses ×0.2 instead of ×0.35, with lives cut to 5.
- **Bigger tiles, fewer of them.** A 9 x 5 lattice of about 106 px fits the 960 x 540 world
  and holds an 80 px figure inside its own tile. This replaces the 60 px lattice in
  `map-generator-v2.js` (`cols: 15, rows: 7`), so every lattice map is regenerated, not only the
  four older ones. Patterns of 1-2 tiles then cover meaningful ground.
- **Ranged tiles as blocks, not rows.** Two to four stone blocks per board make placement a
  real choice; today a player can almost always find a platform beside any spot on the road.
- **Compact boards with several portals.** Short routes from two or three spawns into one or
  two exits put the fight in the middle of the board, where patterns overlap. This is map
  generator work, so it belongs in `docs/tower-defense-map-generator-plan.md` as a new layout
  family.
- **Keep gold and the upgrade layer.** Their regenerating deploy counter replaces our in-run
  economy entirely. Our levels, focus, class paths, awakening and training are a distinct part of
  the game; keep them and raise gold per kill instead. Revisit only if the prototype feels slow.
- **Show the pattern in green tiles**, exactly like their placement view, during the recruit
  sheet preview and on selection.

Prototype plan, smallest first:

1. **Fewer, stronger enemies alone** (S). One wave transform in the simulation: count ×0.2, HP
   and reward ×5, so total health and gold per wave stay equal; lives 5. Run `td:classes` and
   `td:sweep` with it on and off. This shows the class shift before any grid work.
2. **Patterns on one compact 9 x 5 board** (M). A `pattern` per class (later per hero) as tile offsets;
   an enemy counts as in range when its current lattice cell is in the pattern. Show the covered
   tiles when a hero is selected or being placed, in place of the range circle.
3. **Manual ultimate toggle** (S-M). A global Auto switch on the HUD (on by default) and a tap
   on a hero's portrait in the deck to cast when charged.
4. Decide from steps 1-3 whether the campaign moves over. If yes: regenerate the four old maps on
   the lattice, re-author waves chapter by chapter, keep Free Play Endless on the old model until
   the new one is balanced.

#### Step 1 results (October 1, 2026)

Built as `tuning.waveShape` (off by default; `enabled: true` turns it on) in `sim.js`: every
non-boss wave group spawns `count` times as many enemies, each with `hp`, `reward`, `attack` and
`leak` (lives lost on a leak) multiplied, spawn gaps multiplied by `gap`. Bosses and summoned
children are unchanged. Report: `npm run td:wave-shape` (class matrix, five bot squads, the
balanced squad without each class, one-class squads; 10 Free Play maps, both bot policies; one
seed for these numbers). Raw output: `docs/audits/td-2026-10-01-wave-shape/`.

Two variants, both with 0.2× enemies, 5× gold and leak damage, and 2.5× spawn gap:

| | Today | A: 5× health, 5× attack | B: 3.5× health, 2.5× attack |
|---|---|---|---|
| Balanced squad wins | 18/20 | 7/20 | 16/20 |
| Budget squad wins | 18/20 | 4/20 | 17/20 |
| All platform, no blockers | 20/20 | 1/20 | 12/20 |
| Glass cannon | 14/20 | 0/20 | 6/20 |
| Balanced without Mage | 15/20, 37% lives | 5/20 | 14/20, 56% lives |
| Balanced without Archer | 13/20 | 0/20 | 1/20 |
| Balanced without Support | 15/20 | 0/20 | 7/20 |
| Best road class (7 wave types; flyer and boss are ties) | Warrior 4, Tank 2, Assassin 1 | Tank 5, Warrior 1, Assassin 1 | Tank 6, Warrior 1 |
| Best platform class (9 wave types) | Archer 5, Mage 4 | Archer 9 | Archer 9 (swarm, runner and shield by 1-3 points) |

What this shows:

1. **Equal totals are not equal difficulty.** Variant A keeps total health, gold and attack the
   same and the game becomes far harder: area damage hits a fifth of the bodies, and a single
   enemy with 5× attack kills a Warrior or Assassin before it dies (Warrior holds 0% of swarm,
   armored and shield waves). Variant B is close to today's difficulty for normal squads.
2. **Mage dependence goes away.** Without Mages the balanced squad now wins as often as with
   them and keeps more lives (56% vs 37% today). Mage platform scores drop on armored (51% to
   24%), healer (75% to 47%) and flyer (47% to 18%) waves.
3. **Tanks get their payoff, and blockers matter.** In variant B the Tank is the best road class in 6 of the
   7 wave types that are not ties, and holds 100% of armored, runner, healer, shield and hexer
   waves. The no-blocker squad drops
   from 20/20 to 12/20, so road heroes are no longer optional.
4. **Archers become the new must-have.** Archer is the best platform class on every wave type,
   and the balanced squad without Archers falls from 13/20 to 1/20. Their single-target crit and
   "targets strongest" fit tanky enemies exactly. Supports also matter more (15/20 to 7/20
   without).
5. **Runs get shorter.** The balanced squad's classic run drops from 10.1 to 8.0 minutes.

Conclusion: the direction does what it should for Tanks, blockers and Mage reliance, but the
balance point moves from Mages to Archers. Before step 2, Mages need a single-target role in the
new model (for example a stronger main-target hit with splash as a bonus, or magic damage that
ignores the high armor of strong enemies), and Archer crit should be checked. Variant B
(`"hp": 3.5, "attack": 2.5`) is the better baseline for further tests.

#### Three seeds and the Mage focus rule (October 1, 2026)

**Three seeds confirm variant B.** Seeds 99-101 (60 runs per row) match the one-seed numbers
within a few points: balanced squad 54/60 today vs 46/60 shaped, no-blocker squad 57/60 vs
39/60, without Archers 38/60 vs 6/60, without Mages 41/60 vs 38/60.

**Mage focus rule.** Built as `classes.Mage.focus` (`sim.focusShare`, absent from the live
tuning): splash shares that find no neighbour fold into the main target (2 expected neighbours,
so a lone target takes up to 1.7×), and a chaining Mage folds in its unused bounces. Test with
`npm run td:wave-shape -- --hp=3.5 --attack=2.5 --focus=1`.

| Variant B, 3 seeds (60 runs) | Today | Shaped | Shaped + focus |
|---|---|---|---|
| Balanced squad | 54/60 | 46/60 | 47/60 |
| Budget squad | 54/60 | 51/60 | 53/60 |
| All platform, no blockers | 57/60 | 39/60 | 52/60 |
| Glass cannon | 42/60 | 21/60 | 43/60 |
| Balanced without Mage | 41/60, 39% lives | 38/60, 55% | 38/60, 55% |
| Balanced without Archer | 38/60, 39% lives | 6/60 | 19/60, 59% |
| Balanced without Support | 44/60 | 29/60 | 42/60 |
| Mage platform score: armored / boss / healer | 51 / 20 / 75% | 24 / 20 / 47% | 38 / 32 / 70% |
| Best platform class (9 wave types) | Archer 5, Mage 4 | Archer 9 | Archer 7, Mage 2 |

What the focus rule does:

1. **Mages get a role back without becoming required again.** Mage scores on armored, healer and
   boss waves recover most of the way, and Mage is again the best ranged answer to runners and
   shields. Removing Mages still costs nothing (38/60 either way), so the old Mage dependence
   stays gone.
2. **Archer dependence is cut by more than half**, from 6/60 to 19/60 wins without Archers, and
   the squads that lose Archers keep more lives. Archers stay the strongest ranged class, which
   fits their design as the boss and flyer answer, but not a must-have to the old Mage degree.
3. **The cost: blockers matter less again.** The no-blocker squad climbs back from 39/60 to
   52/60. That is still below today's 57/60, but most of the gain for road heroes is gone. In the
   real redesign, tile patterns (step 2) and enemies that attack platform heroes would restore
   it; a stronger shaped attack (3×) is the quick knob to test first.
4. **On today's waves the focus rule changes little** (one seed): Mage-only squads win 8/20
   instead of 4/20 and Mage boss damage rises from 20% to 32%; every mixed squad stays within one
   win. It belongs to the shaped model, so it stays off in the live game.

#### Attack, Archer and flyer tests (October 1, 2026)

All runs: 3 seeds, 60 runs per row, Mage focus on, 0.2× ground enemies, 2.5× attack unless
stated. Raw output in `docs/audits/td-2026-10-01-wave-shape/`.

- **Stronger enemy attack does not make blockers necessary.** At 3× and 3.5× attack the
  no-blocker squad still wins 52/60 and 54/60. Enemies only fight the heroes holding them, so a
  squad without blockers never meets that attack.
- **Archer numbers are not the cause.** Armor pierce 0.35 → 0.2 changes nothing measurable
  (19/60 without Archers either way). The crit test changed nothing because Archer crit is
  baked into `gameBalance.json` by the generator; the runtime kit value is not read.
- **Flyers are the cause.** Counting lives lost by enemy kind (balanced squad, 60 runs): every
  life is lost to flyers, 270 with the full squad, 1,040 without Archers, 870 without Mages.
  Flyers skip blockers, and in the shaped model each flyer costs 5 lives. Ground enemies die
  before the base even without blockers, which is why the no-blocker squad keeps winning.

So flyers got their own shape (`waveShape.kinds.flyer`, report flag `--flyer=count:hp`):
0.4× count and 1.75× health, so they come in pairs and cost 2.5 lives each. Two ground variants:

| 3 seeds, 60 runs | Today | Ground 3.5× health | Ground 5× health |
|---|---|---|---|
| Balanced squad | 54/60, 85% lives | 48/60, 93% | 42/60, 92% |
| Budget squad | 54/60 | 54/60 | 48/60 |
| All platform, no blockers | 57/60 | 55/60 | **24/60** |
| Balanced without Mage | 41/60 | 44/60 | 35/60 |
| Balanced without Archer | 38/60 | 38/60 | 31/60 |
| Balanced without Support | 44/60 | 43/60 | **23/60** |
| Balanced without Tank | 54/60 | 54/60 | 54/60 |
| Best one-class squad | Archer 26/60, Mage 12/60 | Archer 6/60 | none (0/60) |

**Ground 5× with separate flyers is the most promising shape so far.** Road heroes become
necessary (no-blocker squad 57/60 → 24/60), neither Mages nor Archers are required (35/60 and
31/60 without them, close to the full squad's 42/60), Supports become important (23/60 without),
and no one-class squad wins. Overall difficulty rises a little (balanced 54 → 42, budget
54 → 48), which campaign tuning can absorb. Tanks are the open item: removing the Tank still does
not hurt, because the bot then deploys another damage dealer in that slot. The Kraghorn boss
(A3) and tile patterns that reward holding a choke point are the planned answers.

Current best prototype settings:

```json
"waveShape": { "enabled": true, "count": 0.2, "gap": 2.5, "hp": 5, "attack": 2.5,
  "kinds": { "flyer": { "count": 0.4, "hp": 1.75, "attack": 1, "power": 2.5 } } }
```

plus `"focus": { "slots": 2, "share": 1 }` in `classes.Mage`.

#### Step 2 built: compact board with tile patterns (October 1, 2026)

A playable prototype map, `proto-board` ("Prototype Board"), in dev builds: run `npm run dev`,
open Free Play and pick it at the end of the map list. It is a 9 x 5 board of 104 px cells, two
spawn lanes along the top and bottom rows that merge in the middle row and run to the base on
the right, 10 road tiles and 13 platform tiles in blocks (two 2 x 2 blocks, a column of three
between the lanes, two single tiles by the base). Its own `rules` turn on the best wave shape
above, the Mage focus rule and these class patterns:

| Class | Pattern | Cells |
|---|---|---|
| Tank, Assassin | `plus`: own cell and the four next to it | 5 |
| Warrior, Support | `block`: 3 x 3 | 9 |
| Mage | `diamond2`: every cell within two steps | 13 |
| Archer | `cross3`: three cells in each straight direction over a 3 x 3 core | 17 |

Screenshots: `docs/audits/td-2026-10-01-wave-shape/board-mage-pattern.jpg`,
`board-archer-pattern.jpg`, `board-wave-1.jpg` (hero and enemy art is missing in these
because the screenshot sandbox cannot reach R2; tokens show instead).

Bot results on the board (seeds 99-101, both policies, 6 runs each, `enemyHp` 0.75): starters,
balanced, budget and glass cannon squads 6/6; the no-blocker squad 0/6. Without the per-gate
strength split the starters lost every run, because small groups doubled at full strength.
On the same board with circles instead of patterns the bots did worse (balanced 2/6 vs 3/6,
budget 0/6 vs 4/6 at `enemyHp` 1), so patterns as set here are slightly more generous than
circles.

What is still circles or open: ultimates, Support auras and heals, Assassin dash reach and the
bot's tile ranking still use the range radius. Recruit-sheet stats still list a range number.
Free Play difficulty tiers, Endless and the boss on this board are untuned. Next: play it by
hand, then decide on per-hero patterns, pattern-shaped ultimates, and whether the generator
should build compact boards.

Earlier next steps (kept for history): test shaped attack 3× with focus to win back the blocker gain,
then look at Archer `target: "strongest"` and crit against tanky single enemies. After that,
step 2 (tile patterns on a compact board) can start from these numbers. Raw output:
`docs/audits/td-2026-10-01-wave-shape/variant-b-3-seeds.txt`,
`variant-b-mage-focus-3-seeds.txt`, `mage-focus-today-1-seed.txt`.

## 3. Suggested order

The audit's warning still holds: the game is at risk of too many layers to learn. Every idea
below changes how a stage plays rather than adding a menu, and each new thing is introduced by
one stage.

| Step | Build | Why first | Size |
|---|---|---|---|
| 1 | A1 stage goals, B3 relocation | Replay value and safer experimentation with almost no new code | S-M |
| 2 | A3 Kraghorn as 2-6 finale | Ends the repeated boss, gives Tanks their payoff | M |
| 3 | B2 Divine Interventions (Thunderfall first) | Fixes the spectating gap; new Favor sink | M-L |
| 4 | D1 daily quests | Already planned; draws on the new goals and powers | M |
| 5 | A4 Sunscar creatures, then A2 stage rules | Chapters 2-3 get their own identity | L |
| 6 | C1 pantheon bonds | Squad decision; replaces an invisible bonus | M |
| 7 | D2 Heroic campaign, B1 early call | Seal income and depth for experienced players | M |

Each step should pass `npm run test:tower-defense`, update the spec in the same change, and get a
`td:sweep` or `td:classes` run when it touches balance. A1 and C1 need a save version bump.

## 4. Open questions for the owner

1. Divine Interventions: two powers on a cooldown, or one power with charges? Should they be
   allowed in Expedition?
2. Pantheon bonds: replace tag synergy completely, or keep tags as a hidden layer underneath?
3. Early call (B1) or wave interest (E): which economy lever fits the game better?
4. Heroic campaign: separate laurels, or does Heroic only pay seals?

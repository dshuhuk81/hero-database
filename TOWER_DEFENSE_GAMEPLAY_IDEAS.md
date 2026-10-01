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

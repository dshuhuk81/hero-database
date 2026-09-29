# The Last Crossing — Three New Monster Bosses

Design proposal · 29 September 2026 · No images or gameplay changes made

## Direction and fit with the existing game

The roster gains three distinct monster fights: **Lerna, the Root-Maw** tests sustained pressure against regeneration; **Kraghorn, the Broken Tusk** tests blocking and interruption; **Vorruk, the Hollow Hunger** tests formation spacing and recovery between attacks.

These concepts follow the current TD enemy sprites, rather than the tall hero portraits: richly colored painted dark fantasy, clear anatomy, substantial material texture, sharp edges and selective dramatic rim light. I inspected `boss-v2.webp` (Baphomet), `boss-lilith-v4.webp` (Lilith), and `brute-v3.webp`, alongside `src/game/td/sprite-spec-for-ai.md`.

The existing fights already cover Baphomet's defensive stance and damage-dealer mark, and Lilith's invulnerable body with damage-sharing summoned children. The new bosses each have a directly attackable main body during ordinary combat and introduce different decisions. The roadmap's proposed Verdant boss replacement makes Lerna the strongest first candidate.

| Name | Proposed ID | Boss class | Monster form | Suggested home | Main counter |
|---|---|---|---|---|---|
| Lerna, the Root-Maw | `lerna` | Regenerator | Three-headed swamp serpent | Verdant Crossing | Sustain pressure through regrowth; burn helps |
| Kraghorn, the Broken Tusk | `kraghorn` | Siege Beast | Massive stone-plated boar | Moonlit Pass | Block the charge or interrupt its warning |
| Vorruk, the Hollow Hunger | `vorruk` | Ambusher | Armored burrowing sand worm | Sunscar Ruins / Basin | Spread defenders; exploit its emergence |

Boss classes are descriptive enemy archetypes. They do not inherit playable Tank, Warrior, Assassin, or Mage passives. All three are ground bosses and use the existing road paths, blocking, boss health bar, and single boss defeat reward.

## Shared art brief

- **Board composition:** Full monster body, slight three-quarter top-down view, facing right. Center the complete silhouette inside a square canvas, with approximately 20% total breathing room. Final sprite: 256 × 256 with alpha, readable around 96 px in play.
- **Shape first:** Lerna has a low body and three separated necks; Kraghorn is a forward-heavy wedge; Vorruk is a tall hooked curve above a compact folded body. The silhouette must identify the boss without relying on glow color.
- **Materials:** Painted scales, chipped stone, horn, chitin, wet skin, worn bone. Large surfaces carry the detail; small jewelry and dense ornament add little at this scale.
- **Lighting:** Consistent upper-left light and a restrained rim. Reserve the brightest accents for mouths, cracks, and attack tells. Match the maps' earthy values so the monsters feel present on the board.
- **Clarity:** Complete feet, tail, mandibles, or coils; no cropped extremities. Avoid broad smoke clouds, giant wing spans, or baked environmental effects that obscure road slots. Ground shadows and attack zones are drawn by the game.
- **Future source art:** Original text-led designs, no borrowed game portraits. Transparent background; no floor, landscape, text, frame, or UI. No images are requested or generated in this pass.

The names, titles, story hooks, and abilities below are original game copy. Mythological anchors are called out separately from invented anatomy and mechanics.

## Combat conventions for this draft

Numbers below are starting proposals for playtesting, not calibrated balance or implemented features. Let **H** be the current ordinary boss's maximum health after normal map/difficulty scaling, **A** its attack, and **S** its road speed. Apply each listed multiplier once. Attack percentages refer to raw physical or magical damage before normal defenses.

Cooldowns run in simulation seconds. The first periodic skill becomes eligible after its listed cooldown; later cooldowns begin when that skill's action and recovery end. A boss cannot overlap its own special attacks. A queued ultimate takes priority over a periodic skill; ordinary attacks pause during all special wind-ups, channels, and recovery windows. Stun and petrify prevent starting an action and interrupt an interruptible wind-up. Ordinary slow affects movement rather than canceling a cast.

Warnings must mark the actual affected area, use a shape as well as color, and remain readable with reduced motion. Combat remains automatic: players respond primarily through recruitment, placement, targeting priorities, upgrades, and team composition. No manual ultimate timing, hero dragging, or new dodge button is required.

Poison-colored effects and fire-themed art do not introduce new damage types. Use the existing physical/magical damage system. Any new enemy-applied debuff is explicitly described below.

## 1. Lerna, the Root-Maw

**Class:** Regenerator · **Placement:** ground · **Identity:** patient attrition monster

**Myth anchor:** Inspired by the Lernaean Hydra's multiple heads and regeneration, with fire preventing regrowth in the Heracles story. Three visible heads, root-like scales, and the crossing setting are this game's adaptation. [Myth reference: Lernaean Hydra](https://www.theoi.com/Ther/DrakonHydra.html).

**Short description:** “A swamp beast that drinks strength from its own wounds. Keep striking while its new flesh is still soft.”

**Story:** Roots have knotted around something alive beneath the crossing. When the road begins to break, three heads rise from the water and taste the travelers' footsteps. Lerna wants the passage flooded and quiet again.

### Art and silhouette

A huge low-slung reptile with four short muscular legs, a thick tapered tail, and three long necks arranged as a staggered fan. The middle head is largest; the other two remain visibly separate at 96 px. Each has a broad crocodilian jaw and bone-colored cheek spurs. Rough root-like ridges cross dark swamp-green scales; the underside is pale, damp and vulnerable. Amber eyes and a small yellow-green throat glow indicate venom.

**Palette:** peat black, deep moss green, muddy olive, pale bone, limited amber. Keep the necks compact and the tail curled inward. No wings, humanoid torso, crowns, detached heads, or swarm of tiny snakes. Regrowth is shown through luminous seams and swelling neck ridges, without gore.

### Starting profile

- Health: **1.10H**. Speed: **0.85S**.
- Armor and magic resistance: **0.8×** the ordinary boss values.
- Basic attack interval: **1.8 seconds**. No passive healing outside its specified ultimate.

### Basic attack — Three Mouths, One Hunger

Bite the currently blocking hero for **100% A physical damage**. The three heads alternate visually; this is one damage event per attack, not three hidden hits. Without a blocker, continue walking.

### Special attack — Bitter Seep

Every **10 seconds**, choose the nearest road hero within **140 px**. Warn for **1.5 seconds** with a toothed puddle outline at that hero's fixed position, then spit a pool with **48 px radius** lasting **4 seconds**. Deal **20% A magical damage once per second** to heroes inside it, including a platform hero if its position overlaps the pool. No valid road target means the skill stays ready.

At most one pool exists per Lerna; it disappears on boss death. Its ticks do not stack with themselves. Interrupting the warning cancels the pool and restarts the skill cooldown. Once a pool is placed, stopping Lerna does not remove it.

### Ultimate — The Wound Remembers

Triggers **once at 70% health and once at 35% health**, checked after damage. If one hit crosses both thresholds, consume both triggers and perform only one ultimate; if killed, perform none. Thresholds never rearm after healing.

Lerna stops moving, spreads its heads, and shows a filling neck-shaped cast indicator for **2 seconds**. If uninterrupted, it channels for **4 seconds**, attempting to heal **1.5% of maximum health each second**, up to **6% per cast**. A channeling Lerna stays targetable and cannot attack. All three heads share one health pool.

Any damage equal to **4% of its maximum health**, accumulated after mitigation from the start of the warning through the channel, cancels the cast. Stun or petrify also cancels it. A canceled threshold cast is consumed, not retried. Existing burn suppresses healing ticks while burn is active; damage-over-time counts toward the damage interruption threshold. Burn is helpful but never required.

After completion or interruption, Lerna suffers **Tender Growth** for **5 seconds**: takes **20% more damage**. This uses the existing exposed magnitude and refreshes rather than stacks with other exposure effects. The maximum possible healing across the fight is 12% of boss maximum health.

### Player counterplay

Keep a durable blocker in front and enough sustained damage on the boss to break regrowth. Basic attacks, damage-over-time, and automated control all provide answers. Keep the healer's platform outside the blocker's puddle radius where the map permits. Mages help clear escorts so attacks reach the boss; burn shortens the regeneration threat.

**Readable weakness:** pale open neck seams during Tender Growth. This is a whole-boss damage window; no head clicking or directional targeting is needed.

**Boss tooltip:** “Regrows at 70% and 35% health. Damage or hard control interrupts it; burn prevents healing ticks. Takes extra damage after regrowth.”

**New implementation needed:** one-shot threshold queue, interruptible healing channel, finite healing budget, marked ground pool, and burn-aware healing suppression. Existing healing, exposure, burn, and control systems are reusable foundations. This replaces Lilith's summon-shield encounter concept rather than simply renaming her children.

## 2. Kraghorn, the Broken Tusk

**Class:** Siege Beast · **Placement:** ground · **Identity:** frontline collision monster

**Myth anchor:** Loosely inspired by the destructive scale of the Calydonian Boar. Kraghorn's name, stone plates, broken tusk, and attacks are original. [Myth reference: Calydonian Boar](https://www.theoi.com/Ther/HusKalydonios.html).

**Short description:** “A living battering ram with a cracked flank. Hold its charge, then strike while it finds its feet.”

**Story:** Kraghorn has learned that every wall eventually opens. Stone from the barriers it has shattered clings to its hide. It follows the road toward the next gate with one tusk lowered and the other broken short.

### Art and silhouette

A gigantic quadruped boar, head low and shoulders higher than its hindquarters. Two oversized tusks form a clear front silhouette, one broken halfway. Heavy natural shale plates run down its shoulders and spine, separated by broad rusty cracks. Sparse black bristles project from the plates, and the lower belly is rough leathery hide. Four heavy cloven hooves remain clearly visible.

**Palette:** blue-grey shale, charcoal fur, rust-brown seams, ivory tusks, small copper-orange eyes. Use a physical shoulder mass rather than an aura. No humanoid pose, metal crown, ornamental harness, hammer, or troll anatomy.

### Starting profile

- Health: **0.95H**. Speed: **1.0S** outside charges.
- Armor: **1.5×** ordinary boss armor. Magic resistance: **0.7×** ordinary boss magic resistance.
- Basic attack interval: **2 seconds**. No additional permanent damage-reduction multiplier.

### Basic attack — Gatebreaker Gore

Gore the blocking hero for **110% A physical damage**. The hit has a short visible head-lowering anticipation within the attack animation. It does not displace the hero or remove its slot.

### Special attack — Stones from the Hide

Every **12 seconds**, warn for **1.5 seconds**, then shake off three large stone fragments. Hit up to **3 distinct road heroes within 90 px** for **45% A physical damage each**. Prefer the blocker, then nearest eligible heroes. Each hero takes at most one fragment; unused fragments do no damage. Interrupting the warning cancels the attack and restarts its cooldown.

### Ultimate — Break the Crossing

Every **18 seconds**, Kraghorn stops and scrapes its hooves for **2.5 seconds**. Mark the next **140 px of its own path** with a broad arrow, following corners and stopping before the exit.

If the warning completes, charge at **3× normal movement speed** along that marked segment. The charge stops at the **first living road hero encountered**, including one already blocking Kraghorn at the start; a blocker is not skipped because its normal block capacity is full. Hit that hero once for **180% A physical damage**. Reaching the segment's end without collision deals no impact damage.

A charge never changes lane, hits platform heroes, teleports past a defender, or crosses the exit. During warning and travel, stun or petrify cancels it; knockback also cancels it and then applies normally. Slows reduce charge speed normally. If every road defender is gone, Kraghorn simply covers the marked distance before recovering.

After a collision, interruption, or missed charge, enter **Cracked Hide** for **4 seconds**: stop movement and attacks, and reduce armor to **50% of Kraghorn's normal armor**. This modifies resistance rather than multiplying damage; it is not immunity to magic or a requirement to attack from behind.

### Player counterplay

Place a Tank at a useful choke and support it with healing. Automated stun, petrify, and knockback can interrupt the charge, while a healthy blocker provides the reliable fallback. Magic is effective against the intact shell; physical damage becomes more effective during Cracked Hide. Avoid clustering several melee heroes inside the stone-shake radius unless they have enough healing.

**Readable weakness:** shoulder plates lift and reveal broad pale cracks during recovery. The entire unit uses the reduced armor value.

**Boss tooltip:** “Charges the next defender on its road. Block or interrupt the rush. Its armor drops while it recovers.”

**New implementation needed:** path-distance charge state, swept collision with the first road defender, charge cancellation hooks, telegraphed fragment attack, temporary armor modifier. Existing path movement, damage, blocking contacts, knockback, and controls can be reused.

## 3. Vorruk, the Hollow Hunger

**Class:** Ambusher · **Placement:** ground · **Identity:** platform-pressure monster

**Myth anchor:** Original monster for this setting, drawing on broad burrowing-worm folklore imagery without claiming to represent a particular traditional creature.

**Short description:** “The road hides its body, but its jaws still reach the watchtowers. Spread the defense and punish each emergence.”

**Story:** Vorruk has followed the buried foundations of Sunscar for centuries. Every fallen tower gives it another hollow to nest beneath. The crossing's new watchfires tell it that the ruins are inhabited again.

### Art and silhouette

An immense segmented worm with a compact rear coil and a raised front third forming a hooked curve. Its head has four thick inward-closing mandibles around a dark circular mouth; no human face or eyes are necessary. Broad sandstone-colored chitin plates overlap like broken roof tiles. Between them, muted dark-violet soft tissue provides contrast. A pale fleshy throat becomes visible when the mouth opens.

**Palette:** ochre sandstone, burnt umber, dusty bone, subdued violet flesh. Keep the coil within one boss footprint; avoid a giant ring mouth that occupies the whole canvas. No wings, tentacles, mechanical drill, sandstorm, or baked dune. Underground mode is communicated by a separate small disturbed-road marker and game effects.

### Starting profile

- Health: **0.90H**. Speed: **0.9S** while surfaced.
- Armor: **0.8×** ordinary boss armor. Magic resistance: **1.2×** ordinary boss magic resistance.
- Basic attack interval: **2.2 seconds**. Still a ground unit, even during attacks on platforms.

### Basic attack — Foundation Bite

Bite the blocking hero for **100% A physical damage**. Without a blocker, continue along the road. The basic attack cannot reach a platform.

### Special attack — Grit Lance

Every **9 seconds**, target the nearest platform hero within **180 px**; if none exists, use the nearest road hero within that distance. With no target, keep the ability ready. Lock a thin aiming line for **1.5 seconds**, then deal **65% A physical damage** to that selected hero if it still exists and is targetable. No retarget on release. A sold, defeated, or veiled target causes a miss; hard control cancels the wind-up and restarts the cooldown.

This is a single-target hit. It does not silence Supports or drain ultimate charge.

### Ultimate — Beneath the Watch

Every **20 seconds**, mark one occupied platform slot within **180 px**, preferring the slot with the most allied heroes within **60 px**, then the nearest on ties. If none exists, choose an occupied road slot within range. With no target, keep the ultimate ready.

Warn for **2 seconds** using a jagged ring with a visible countdown. The marked location stays fixed. If interrupted during this warning, skip the attack and enter the recovery window below. Otherwise Vorruk withdraws underground for **2 seconds**: becomes untargetable, pauses road progress, releases its current block, and performs no other attack. Existing damage-over-time continues ticking; underground does not cleanse statuses. The health bar and a road marker remain visible.

Then erupt at its **original road position**, while a separate ground spike strikes the marked location. Deal **90% A physical damage once** to each hero within **60 px** of that marker. It never teleports onto a platform or advances secretly underground. Dead or empty marked slots remain the target, and a hero placed there during the warning can be hit. Veiled heroes are excluded.

After emerging, enter **Open Throat** for **5 seconds**: targetable, stationary, unable to attack, and taking **20% more damage** through the normal non-stacking exposure effect. Resolve blocking again at its current road position. Even a missed attack produces this window. If damage-over-time kills Vorruk underground, cancel the pending eruption and grant the normal defeat reward once.

### Player counterplay

Spread valuable platform heroes across available slots so the eruption catches fewer allies. Keep healers healthy enough to recover from Grit Lance. Physical attackers exploit its lower armor, and all damage benefits from Open Throat. A compact formation remains playable if it invests in enough health and healing; the boss never requires abandoning a slot at the last instant.

**Readable weakness:** pale inner jaw visibly opens during recovery, paired with an exposed-status icon. No precision click on the mouth is needed.

**Boss tooltip:** “Marks clustered defenders before burrowing. It cannot advance underground. Spread allies and strike its exposed throat after it emerges.”

**New implementation needed:** platform-threat targeting, fixed-location warning, finite burrow state, blocking release/reacquisition, delayed ground strike, untargetability with damage-over-time preserved. Existing targeting and death handling must explicitly cover an underground boss.

## Encounter placement and rollout

**First: Lerna on Verdant Crossing.** It gives the planned Lilith replacement a distinct encounter, suits the overgrown environment, and connects regeneration to statuses already present in the game. It does not require separate targetable heads or new minion units.

**Second: Kraghorn as a Moonlit Pass alternate.** Introduce its first charge with few or no escorts so the arrow and collision are readable. Later pair it with ordinary grunts or a small ranged escort. Its job is to test a prepared frontline, not to slip past that frontline invisibly.

**Third: Vorruk on a Sunscar map.** Introduce it on a layout with at least two viable platform groupings farther than 60 px apart. Keep its first encounter free of simultaneous Hexer pressure so players can understand the targeting marker. The worm needs the most new state handling and should follow the simpler fights.

These are suggested placements, not changes to `tdMaps.json`. A future boss selector could choose variants per compatible map; map availability should respect the counterplay each fight needs.

## Required checks when implemented

- All mechanics remain deterministic at every simulation speed and pause correctly. Warning effects do not expire in wall-clock time while combat is paused.
- Lerna cannot repeatedly heal by crossing the same health threshold; high burst cannot queue two immediate heals; burn is useful but a team without burn can still win.
- Kraghorn follows bends and lane membership, hits only the first defender even with a large simulation step, respects interruption, and never charges through the exit.
- Vorruk always resurfaces on schedule, keeps its health bar visible, cannot leave a blocked hero stuck, and cancels pending damage if it dies. Its marker does not switch targets at impact.
- Killing a boss during a warning or recovery grants one reward and cancels all of its pending attacks and persistent zones.
- No boss receives blanket control immunity in this draft. Check repeated-control uptime with real teams before introducing any shared resistance rule.
- Test a mixed basic roster and specialized teams against each fight. Tune damage, healing budget, and warning cadence together; the proposed ratios are not evidence that the encounters are balanced.

## Art and content deliverables for the later asset pass

Each boss needs one approved full-body still; a matching HUD/glossary crop; idle, movement, attack, special, ultimate, hurt, and death presentation; and clear warning/recovery effects. Lerna needs three-head motion and regrowth seams, Kraghorn needs charge/recovery poses, and Vorruk needs burrow/emergence states. Keep hitboxes and path position independent of dramatic animation offsets.

Suggested source filenames: `boss_lerna.png`, `boss_kraghorn.png`, `boss_vorruk.png`. Runtime versions should follow the existing `boss-<id>-vN.webp` convention after checking the loader mappings. This document provides the concept and text brief only; no source art, sprite, animation, or live configuration has been created.

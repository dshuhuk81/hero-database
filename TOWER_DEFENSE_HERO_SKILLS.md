# Tower Defense: hero skill and visual design

Source: in-game skill descriptions from `src/data/heroes/*.json`, September 24, 2026.
Scope: the 20-hero TD roster, excluding Zeus (separate test case by the user).
These are design proposals for the minigame — simplified translations of the real
skills into our road/platform combat model, not canonical hero facts. Numbers
belong in `gameBalance.tuning.json` once implemented.

Terminology note: this document uses `class` from the hero JSON files for TD
mechanics and placement. The JSON `role` field (`Arcane`, `Nimble`, `Hefty`,
etc.) is a separate Motto Immortal internal category and is not used for
road/platform placement.

Visual building blocks already available: Kenney particle textures tinted
gold / purple / green / red, attack tracers, range rings, slot highlights,
aura links, screen-local bursts for ultimates.

## Implemented visual pass (September 24, 2026)

`src/game/td/hero-fx.js` now defines basic attack, impact, ultimate, heal,
and buff presentation for all 19 heroes below. Zeus keeps his separate renderer.
The pass combines the existing Kenney particle PNGs with small runtime-generated
petal, leaf, heart, ingot, shard, droplet, arrow, and falcon-eye textures.
No additional package or production dependency is required.

Except for Medusa's implemented update below, the sections remain proposals for combat mechanics. This visual pass follows
the **currently implemented simulation**: it does not add their proposed passives,
channels, status durations, summons, dashes, or damage rules. Cast animations last
roughly a second; a lingering visual is not a gameplay status indicator. Hero
portraits stay in their slots; arcs and streaks suggest movement around them.

| Hero | Basic / impact treatment | Ultimate presentation in the current game |
|---|---|---|
| Nuwa | Amber clay strike and shard puffs | Amber wall with rising light columns at the caster; gold-toned healing motes on recipients |
| Prometheus | Dashed chain stroke and embers | Flame wreath and directional fire bursts |
| Momus | Violet jab and star sparks | Three staggered orange-violet bursts with confetti around the caster's facing |
| Demeter | Waving vine and leaves | Thorn ring with inward leaf motes and self-heal glow |
| Poseidon | Blue three-pronged thrust and spray | Broad foam-white / blue wave toward the target and spray impact |
| Amunra | Gold solar slash and flare | Sun halo, three converging rays and solar slashes |
| Set | Sand-colored sweep and dust shards | Three offset sand streaks and cuts, with a larger final slash |
| Jormungandr | Green fangs and downward poison droplets | Rotating green mist and a spreading venom ring |
| Nyx | Paired violet slashes | Source shadow flash, four alternating target slashes and a final dark magic burst |
| Bastet | Three pink-purple claw streaks | Arcing light to the target, three spinning cuts and a return arc |
| Horus | Sharp amber slash and sparks | Brief falcon-eye cast marker and three rapid impact flashes |
| Phoenix | Ember projectile and fire fragments | Layered flame wings travelling to the target, then a fire burst and warm self-heal |
| Fengyi | Spinning cyan projectile | Layered rotating vortex and circling leaf debris |
| Diana | Silver-blue arrow and star impact | Three moonlight rays and a broad crescent slash; silver buff motes on allies |
| Artemis | Green arrow and light trail | Extended piercing line and arrow through the target |
| Medusa | Green bow arrow with a light trail and small hit sparks | Eye flashes and gaze beams to up to three enemies in her facing cone; cracked stone shells persist for the actual three-second paralysis |
| Caishen | Arcing gold ingot and glitter | Three orbiting ingots; golden showers at actual heal/buff recipients |
| Yuelao | Thin waving red thread and hearts | Six spreading hearts; curved threads and travelling hearts to healed allies |
| Freya | Pink petal dart | Pink-green blossom wave; rising petals at healed or revived allies |

Medusa's bow attack and petrifying gaze are now implemented: `petrifyTargets`
and `petrifyDuration` in `gameBalance.tuning.json` default to 3 targets and 3 seconds.
Gaze hits each distinct target once, prioritizing enemies furthest along the path
within range and facing cone. It keeps its per-target damage and stops both movement
and attacks. With no valid target in the cone, the ultimate stays charged. A repeat
gaze refreshes the stone timer. Bosses and flying enemies can also be petrified.
Freya still revives or heals rather than channels, and Horus's eye is a brief cast accent rather than a
ten-second debuff. These differences can be revisited with the combat redesign.
Animation pauses with the game, follows simulation speed during waves, finishes
its decorative tails between waves, and uses fewer stationary particles with
reduced motion. Finished effect containers are destroyed and concurrent effects
are capped. This pass has not been tested or built; testing is left to the user.

---

## Tanks (road)

### Nuwa
- **In-game reference:** Law of Creation (Bulwark Figurine + barrier), Divine Embrace (ally shields), Children of the Clay / Sky Salvation (summons).
- **Basic attack:** Clay strike — a short melee blow with a small stagger chance (0.5 s stun on ~10% of hits), echoing her figurines' stuns.
- **Ultimate — Earthen Bulwark:** Nuwa raises a clay shield wall across her road segment for 6 s: enemies touching it are slowed 40%, and Nuwa gains a shield equal to a share of her max HP. This keeps her barrier-plus-figurine fantasy in TD form without adding a separate summon/minion layer.
- **Visuals:** basic attack gets a short gold tracer with dust-colored impact puffs. Ultimate: a glowing amber wall segment on the path (two vertical particle columns + a shimmering band between them), small clay shards drifting off enemies while slowed.

### Prometheus
- **In-game reference:** Fetters of Defiance (Bound state, frontal pulses, shield), Theft of Embers (charge + knockback), Titan's Resolve (damage reduction).
- **Basic attack:** Heavy chain swing — slow, hard melee hit with a brief flame ember on impact.
- **Ultimate — Bound Unleashed:** Prometheus enters the Bound state for 8 s: gains a shield, takes reduced damage, and emits a fire pulse every 2 s that damages all enemies in a short cone ahead of his facing. Rotation (R) matters — the player aims the pulses.
- **Visuals:** ember-red hit sparks on basics. Ultimate: Prometheus ringed in flickering red-gold flame particles, rhythmic cone-shaped flame bursts in his facing direction, chain links implied by short dashed tracers.

### Momus
- **In-game reference:** Come at Me! (leap + taunt), Sweet Pain (counter AoE when hurt), Bomb Party (bouncing bomb, knockdown).
- **Basic attack:** Mocking jab — quick melee hit; every third hit throws a small bomb that deals minor splash damage to adjacent enemies.
- **Ultimate — Bomb Party:** Momus taunts nearby enemies, then lobs a cluster of bouncing bombs down the path: three explosions in sequence, each damaging and briefly knocking down (stopping) enemies in a small radius. A disruption ultimate that keeps his mockery-tank identity instead of turning him into a pure bomb caster.
- **Visuals:** basics are quick purple tracers. Ultimate: three expanding gold-red blast rings hopping along the path away from Momus, with confetti-like spark particles — theatrical, matching his trickster theme.

### Demeter
- **In-game reference:** The Earth's Vigor (root + restrain + self-heal per enemy), Sprawling Thorns (vine restraint), Harvest's Blessing (shields).
- **Basic attack:** Vine lash — melee hit with a 15% chance to root the target for 1 s.
- **Ultimate — The Earth's Vigor:** Demeter roots herself for 3 s: thorn vines erupt around her, restraining all enemies in her range for the duration while she heals per restrained enemy. A hold-the-line ultimate that rewards being swarmed.
- **Visuals:** green tracer with leaf particles on basics. Ultimate: a ring of green vine bursts around her slot, enemies caught get small root markers at their feet, soft green heal motes drifting back into Demeter.

## Warriors (road)

### Poseidon
- **In-game reference:** Rogue Wave (two tidal waves pushing enemies), Waterspout (targeted wave, knockdown), Tidal Trident (every third attack empowered).
- **Basic attack:** Trident thrust — every third attack is charged, dealing bonus damage in a small splash around the target (Tidal Trident translated directly).
- **Ultimate — Rogue Wave:** Poseidon sends a tidal wave rolling backward along the path from his position: enemies caught take damage and are pushed back a fixed distance toward the entrance. A rare repositioning tool — buys time without killing.
- **Visuals:** basics are blue-tinted tracers (new tint: deep sea blue) with a brighter flash on every third hit. Ultimate: a broad horizontal band of foam-white and blue particles sweeping down-lane, affected enemies show spray bursts.

### Amunra
- **In-game reference:** Aten's Radiance (rising solar blades), Blinding Sun-Disk (aura that damages and weakens), The Dawn on Benben (ally defenses).
- **Basic attack:** Solar slash — melee hit with a warm glow; every third hit releases a small sun-disc pulse that weakens nearby enemies' attack for a short duration.
- **Ultimate — Aten's Radiance:** Amunra rises briefly and fires three solar blades in sequence at the nearest enemies in range, each dealing area damage on impact and refreshing the attack-reduction pulse. His sustained-channel ult becomes three discrete volleys to fit the TD cadence while preserving the Solar Aura identity.
- **Visuals:** basics use the gold tracer with a white-hot core. Ultimate: Amunra lifts a few pixels with a sun-disc halo behind him, three converging gold beams with bright impact flares — deliberately one of the most radiant effects in the game.

### Set
- **In-game reference:** Frenzied Sand Whirl (triple dash strike), Sand Burial (nearby AoE), Dunes' Bloodrage (team lifesteal), Khamsin's Shelter (protective leap).
- **Basic attack:** Spear sweep — hits the target plus one adjacent enemy for reduced damage (small cleave from Sand Burial).
- **Ultimate — Frenzied Sand Whirl:** Set dashes forward along the path and back, striking all enemies he passes through three times in quick succession; the final pass deals heavy damage. His triple-strike ult compressed into a there-and-back dash.
- **Visuals:** sandy-orange tracers on basics (new tint: sand). Ultimate: a fast afterimage streak along the path (two offset ghost silhouettes), dust clouds at each strike point, the third hit a larger sand burst.

### Jormungandr
- **In-game reference:** Venom Spray (poison mist aura), Serpent's Gnawing (snake rain), Serpent's Molt (lethal-damage revenge burst).
- **Basic attack:** Venomous bite — melee hit that applies a short poison (damage over 3 s, small stacks).
- **Ultimate — Serpent's Molt:** for the next 5 s Jormungandr stores a share of all damage he takes, then releases it as a poison shockwave around him. The shockwave has a small guaranteed base hit, so the ultimate still matters if enemies are briefly out of contact; stored damage makes it much stronger when he is under pressure.
- **Visuals:** basics leave small green poison drips on enemies. Ultimate: Jormungandr wrapped in a deepening green mist while storing (intensity grows with stored damage), then a single large green ring burst with snake-shaped particle streaks.

## Assassins (road)

### Nyx
- **In-game reference:** Evernight Raid (blink behind target, stun, energy denial), Nocturnal Judgment (untargetable 4-hit combo), Encroaching Nightfall (dark domain strikes).
- **Basic attack:** Twin shadow blades — fast double-hit (two small damage ticks per attack), reflecting her combo style.
- **Ultimate — Evernight Raid:** Nyx vanishes and strikes the strongest enemy in her range (highest current HP) with a 4-hit combo, ending in a 2 s stun. Her assassination identity aimed at brutes and the boss escort.
- **Visuals:** basics are paired purple tracers. Ultimate: Nyx's sprite fades out, four violet slash flashes appear in sequence over the target, then a dark-purple impact burst as she reappears — the most "disappearing act" ultimate on the roster.

### Bastet
- **In-game reference:** Nile Dance (leaps to highest-ATK enemy, landing AoE), Bastet's Spin (3-hit spin, hit-rate reduction), Furball (orbiting orbs).
- **Basic attack:** Claw flurry — quick melee hit; passively surrounded by two faint orbiting orbs that deal tiny damage to adjacent enemies (Furball made ambient).
- **Ultimate — Nile Dance:** Bastet leaps to the densest enemy cluster in her range, dealing landing damage, then spins for three rapid hits on all adjacent enemies before returning to her slot. Keeps her mobile-dancer identity without leaving the defense permanently.
- **Visuals:** soft pink-purple tracers with orbiting dot particles around her slot. Ultimate: a graceful arc tracer to the cluster, three circular slash rings, and a return arc — reads as a dance figure.

### Horus
- **In-game reference:** Vengeful Bloodbath (mark highest-ATK enemy, empowered focused attacks), Frenzied Blade (nearby AoE + armor reduction), Raptor's Rage (attack speed).
- **Basic attack:** Raptor strike — fast melee hit with +15% attack speed baseline (his passive, built in).
- **Ultimate — Eye of Vengeance:** Horus marks the highest-threat enemy in range for 10 s: his attacks against it gain 100% crit chance and each strike reduces its armor by a small stacking amount. In TD, "highest threat" should resolve to boss/brute/high-current-HP targets, standing in for the real kit's highest-ATK targeting.
- **Visuals:** basics are sharp gold tracers. Ultimate: a glowing falcon-eye marker above the marked enemy, Horus's tracers turn deeper orange, each crit shows a small radiating flash, armor shred shown as tiny shield-shard particles breaking off.

## Mages (platform)

### Phoenix
- **In-game reference:** Flaming Rebirth (revive from ashes), Ashes to Everflame (sacrifice HP for a striking phoenix), Blazing Feather (attacks apply stacking Soul Burn).
- **Basic attack:** Ember bolt — ranged fire bolt that applies a small stacking burn (damage over time, max 3 stacks). This is a deliberately compressed Soul Burn stack count for TD readability; the real kit stacks higher.
- **Ultimate — Ashes to Everflame:** Phoenix sacrifices a share of her current HP and sends a fire phoenix flying down the longest path line in her range, damaging every enemy it passes through. High risk, high line-clear value.
- **Visuals:** basics are small orange-red bolts with trailing embers. Ultimate: a large bird-shaped flame silhouette (built from layered flame particles) sweeping along the path, leaving a short burning trail; Phoenix herself flashes white at the sacrifice moment.

### Fengyi
- **In-game reference:** Great Rising Gale (consume whirlwinds for big AoE), Billowing Sleeves (line tornado), Slumbering Breeze (whirlwind charges grant ATK).
- **Basic attack:** Sleeve tornado — a narrow tornado projectile that damages all enemies in a straight line up to her range (Billowing Sleeves as her basic pattern).
- **Ultimate — Great Rising Gale:** Fengyi consumes her accumulated whirlwinds (one gained per wave cleared, up to 4) to unleash a large storm over the densest path area in range — damage scales with whirlwinds stored. Rewards patience: fire early for relief or save for wave 9–10.
- **Visuals:** basics are slim cyan-white spiral projectiles. Small orbiting wind wisps around Fengyi show her stored whirlwinds (visible count = stored charge). Ultimate: a wide spinning vortex of white-cyan particles on the path, enemies lifted slightly with leaf-like debris.

## Archers (platform)

### Diana
- **In-game reference:** Lunar Illumination (line shockwave), Waxing Blessing (team haste), Crescent's Mark (armor reduction on toughest), Moonlit Ambush (3-shot combo).
- **Basic attack:** Moonlit volley — every third attack is a 3-arrow quick combo at the same target (Moonlit Ambush compressed into her rhythm).
- **Ultimate — Lunar Illumination:** Diana fires a moonlight shockwave in a straight line along the path direction she faces, damaging all enemies on that line and reducing their armor for 8 s (Crescent's Mark folded in). Aimed with R — one of the clearest rotation payoffs.
- **Visuals:** basics are pale silver-blue arrows; the combo shows a triple streak. Ultimate: a bright horizontal moonbeam with a lingering silver trail, affected enemies carry a dim crescent marker while their armor is down.

### Artemis
- **In-game reference:** Gale-Force Shot (mobile rapid fire, piercing), Steadied Shot (net + damage), Cloud-Piercer (piercing arrows at weakest).
- **Basic attack:** Piercing arrow — her shots pass through the first target and hit the enemy behind it for reduced damage (Cloud-Piercer as baseline).
- **Ultimate — Gale-Force Shot:** for 8 s Artemis fires a rapid piercing shot every 0.7 s at the most vulnerable enemy in range (lowest HP), each shot pinning the target briefly (0.5 s slow). Her mobile barrage becomes a stationary focus-fire mode — platform heroes don't move in our model.
- **Visuals:** basics are slim green-tinted arrows with a faint through-line on pierce. Ultimate: Artemis's rate visibly accelerates, arrows leave short green streaks, targets show a small net marker when slowed (nod to Steadied Shot).

### Medusa
- **In-game reference:** Petrifying Gaze (beam + petrify), Arcane Serpent (bouncing snake, M-RES reduction), Snake Hair (every 2 attacks trigger the snake).
- **Basic attack (implemented):** Bow shot — a green-tinted arrow with a faint light trail and a small spark on impact; uses her existing basic-attack damage and cadence.
- **Ultimate — Petrifying Gaze (implemented):** Medusa looks at up to 3 distinct enemies within her range and facing cone, prioritizing those furthest along the path. Each takes one hit and is petrified for 3 s, unable to move or attack. Both count and duration are configurable. Aim with R; no valid target means she keeps her ultimate charged.
- **Visuals:** basics use arrow sprites. Ultimate: two eye flashes send pale stone-colored gaze beams to the selected enemies, with stone shards on impact. Grey cracked shells remain on surviving victims for the full paralysis duration and disappear when they recover.

## Supports (platform)

### Caishen
- **In-game reference:** Golden Rejuvenation (damage + energy), Rollin' in Riches (area energy), Endless Fortune (ingots heal allies below 50% HP).
- **Basic attack:** Ingot toss — a thrown gold ingot with modest damage. If the fortune theme becomes gameplay, keep it as a capped per-wave bonus rather than an uncapped random gold proc, because economy snowballing is much harder to balance than damage or healing.
- **Ultimate — Endless Fortune:** Caishen releases his golden ingots: for the next 10 s, any ally in his range whose HP drops below 50% instantly receives a heal (per-ally cooldown applies). His reactive heal becomes a timed safety net for the whole ring.
- **Visuals:** basics are glittering gold coin projectiles with a small hit sparkle. Ultimate: three ingots orbit Caishen, allies below half health get a golden shower burst and a small ingot icon flash above them.

### Yuelao
- **In-game reference:** Fated Affection (sequential heals, linked units share), Red Thread of Fate (link two allies, share stats), Bond of Fated Pair (ATK boost + energy to linked allies).
- **Basic attack:** Thread snap — a thin red thread projectile; modest damage, and her passive aura also grants linked allies a small shared-defense bonus (red thread made ambient between her two nearest allies).
- **Ultimate — Fated Affection:** Yuelao sends six healing pulses in sequence to the most wounded allies in her range; allies connected by her red thread are healed together. A burst version of her sequential heal.
- **Visuals:** basics are thin red thread tracers. A faint red thread line constantly connects her two nearest allies (reuses the aura-link rendering, red instead of gold). Ultimate: six soft red-gold heart-shaped pulses travelling along the thread lines.

### Freya
- **In-game reference:** Splendor of Love (8 s channel, heal all per second), Flower Whispers (heal + regen), Lethal Petal (stun + damage).
- **Basic attack:** Petal dart — a flower petal projectile with a 10% chance to stun for 1 s (Lethal Petal folded into her basic rhythm).
- **Ultimate — Splendor of Love:** Freya channels for 8 s, releasing a healing wave every second that restores all allies in her range. A direct translation of her real ultimate — the classic "stand inside the garden" support moment.
- **Visuals:** basics are soft pink petals with a small flash on stun procs. Ultimate: an expanding ring of pink-green blossoms pulsing outward from Freya each second, healed allies get rising petal motes — deliberately the calmest, warmest effect in the kit.

---

## Cross-cutting notes

- **Facing matters:** Prometheus, Diana, and Medusa have cone/line ultimates aimed with the existing R rotation — these become the showcase heroes for the rotation mechanic.
- **Damage over time:** Jormungandr, Phoenix, and Medusa introduce poison/burn. One shared DoT system with per-source stacks keeps the sim simple; visuals reuse the tinted particle drip.
- **Crowd control ladder:** slows (Nuwa, Artemis) < roots/restrains (Demeter) < stuns (Nyx, Momus, Freya procs) < petrify (Medusa). One status icon per tier keeps readability.
- **New tints needed:** sea blue (Poseidon), sand (Set), stone grey (Medusa), pink/red thread (Freya/Yuelao) — all from the existing Kenney textures, no new assets.
- **Not translated:** energy systems, revive mechanics (Phoenix's rebirth), and summon figurines (Nuwa) are simplified away — the TD has no minion layer, and revive would fight the "fallen heroes re-enter at level 1" rule.

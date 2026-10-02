# The Last Crossing — Eight Campaign Bosses

Owner-approved concepts · October 2, 2026 · Roadmap R17, following R9

> **Current decision:** the eight bosses ship with standard boss combat behavior. All specials and ultimates below are retained as historical concept work only and are not planned for implementation. Boss ultimates are descoped from the tower-defense campaign going forward.

## Scope and current status

The owner requested complete theoretical definitions, review, then one artwork per approved boss, then stop. The owner approved this roster and the concepts on October 2, 2026. Eight still artworks are delivered in [artifacts/td-campaign-bosses-v1/README.md](artifacts/td-campaign-bosses-v1/README.md), with sources, PNG/WebP exports and exact prompts. This pass changes no gameplay, campaign placements, registries, or existing published artwork. These are original creatures and invented story hooks for The Last Crossing, not facts or bosses from Motto Immortal or claims about traditional mythology.

The October 2 roadmap assigns Lilith to chapter 1, Vorruk to 2, Lerna to 3, Ochenta to 5, and Kraghorn to 11. R9 covers implementing Lerna, Kraghorn and Vorruk; their stills and clips exist, but their special mechanics are not implemented in the current tuning. R17 covers the eight remaining themes below. The existing campaign still uses generic boss spawns and inherited map assignments; the owner's new assignment is a design decision awaiting implementation.

## Roster and encounter identity

| Chapter / finale | Boss / proposed ID | Form | Defensive habit tested |
|---|---|---|---|
| 4 The Frozen Covenant / Covenant Spire | Skeld, the Oathfrost · `skeld` | Giant ice-armored tortoise | Keep several damage sources effective through temporary loss of attack speed |
| 6 The Thunder Stair / Storm Crown | Thyrak, the Storm Antler · `thyrak` | Wingless stag-dragon | Protect fast attackers from bounded electrical backlash |
| 7 The Drowned Crown / Drowned Throne | Neressa, the Undertow Queen · `neressa` | Nautilus-backed crustacean | Protect the healer and avoid depending on one source of recovery |
| 8 The Spore Lanterns / Spore Heart | Morthul, the Bitter Bloom · `morthul` | Fungal toad with a folded cap | Manage a finite poison burden and finish before repeated doses accumulate |
| 9 The Shattered Prism / Crystal Crown | Ilyr, the Broken Reflection · `ilyr` | Faceted floating manta | Bring complementary physical and magical damage |
| 10 The Silent Procession / Grave Throne | Eidros, the Last Bell · `eidros` | Skeletal bell-bearing mourner | Give a dangerous summoned objective priority over boss damage |
| 12 The Astral Meridian / Zenith Crown | Astreon, the Hollow Star · `astreon` | Star-cored feline | Keep ultimate generation distributed across the squad |
| 13 The Brass Reckoning / Clockwork Heart | Brontax, the Brass Adjudicator · `brontax` | Boiler-backed mechanical ape | Use a varied class roster against a machine that calibrates to the largest class |

Lerna's regeneration, Kraghorn's charge collision and Vorruk's cluster strike remain their own identities. These new bosses have neither compulsory regeneration races, charge-block puzzles, nor cluster-targeted eruptions. Some supporting tools naturally overlap: healing, shielding and automated control remain useful throughout the game.

## Shared combat contract

All eight are **ground bosses**, move along their assigned road, can be blocked, use one main health pool and award the normal boss reward once. Ilyr floats visually and Astreon's feet hover slightly; neither uses flyer pathing. Boss classes below describe encounters and do not grant playable class passives.

Numbers are proposals for later R12 tuning. **H, A, S, R, M** mean the ordinary boss's maximum health, attack, speed, armor and magic resistance after ordinary difficulty and stage scaling. For reference, the current base row is 8,250 HP, 85 attack, 20 speed, 200 armor and 90 magic resistance. Use the scaled values, not these reference constants. Apply profile multipliers once, followed by ordinary environment modifiers once. Damage percentages use A before defense. No extra reward or leak multiplier is proposed.

Every boss has one basic attack, one periodic special and one periodic ultimate. First eligibility is after the listed cooldown from spawn; subsequent cooldowns begin after the action and recovery finish. Ready ultimates take priority over specials. Casts do not overlap. Basic attacks and road movement pause during warnings, channels and recovery unless an ability explicitly says otherwise. Existing poison and burn continue damaging a casting boss. Controls delay an idle boss's next action; there is no blanket status immunity.

All warnings are interruptible by stun or petrify. Knockback moves a boss normally but does not cancel a spell unless specified. Interrupted casts are consumed and restart their cooldown; specials have no recovery unless specified, ultimates enter their stated recovery even when interrupted. After a special resolves, ordinary movement and attacks resume; its timed buff or debuff is not a channel. Once a projectile, hero debuff or summon has resolved, later control does not undo it. Targets are selected and locked at warning start. A defeated, sold or untargetable hero is skipped at resolution; no replacement target is chosen. Equal target scores break by deployment entity ID. With no eligible target, a targeted skill stays ready rather than casting into nothing; self-buffs and Eidros's summon need no hero target.

Target ranges use **Manhattan cell distance**, capped by the actual board bounds, measured from the boss's current cell. A range of 3 means at most three steps. A boss on a cell boundary uses its current path cell. Descriptions that say all deployed heroes explicitly ignore distance. Marks follow locked hero identities; only Eidros's bell is a fixed-position target. Warning shapes are paired with symbols, countdowns and text; color alone never carries the rule.

Warnings and periodic damage use simulation time and pause with combat. All timed effects expire correctly at every sim speed. Boss death cancels its pending attacks, summons and debuffs; one boss cannot leave a fight unwinnable after dying. Ordinary boss death takes priority over skill resolution on the same step. Combat remains automatic: no manual ultimate timing, dragging, in-combat relocation, precision clicks or mandatory Divine Intervention.

### New hero effects are explicit

Current Wet/Chill/Burn/Poison reactions primarily operate on enemies. Reusing their names or visuals does **not** make hero versions exist. Rime, Backlash, Brine, Venom, charge siphoning and Calibration below require separate hero-side handling. None silently grants enemy reactions to heroes. Burn, poison, Wet and Chill applied **to these bosses** work normally; a poison-themed boss is not poison-immune.

Attack-speed modifiers multiply with the environment. Multiple Rime applications use the strongest reduction and refresh duration. Outgoing healing modifiers multiply with recipient healing modifiers. Exposure uses the strongest active magnitude, not additive stacking; weaker effects keep their own expiry. Resistance reductions multiply the boss's profile resistance. Shield absorption uses existing damage handling. No new damage type is introduced.

## 1. Skeld, the Oathfrost — Ice

**Chapter:** 4 · **Map:** `frostbound-6` · **Class:** Tempo Warden

**Story:** A covenant was carved into glacier stone to keep the mountain pass open. Skeld grew around the buried seal and now treats every traveler as a broken promise. Its shell carries the gate's frost-covered pillars; its breath stills the hands of those who approach.

**Selection text:** “The keeper of a frozen oath. Its breath slows your strongest attackers, but every great exhalation leaves the shell open.”

### Silhouette and art brief

A massive terrestrial tortoise with exactly four squat clawed legs, a broad blunt head, a short visible tail and a high asymmetric glacier shell. Three large ice slabs rise from the shell like broken rune pillars. Heavy slate scales remain visible beneath translucent frost plates; the throat is pale and creased. An open amber eye distinguishes its face from the ice. The head points right and all four feet stay inside the canvas. Shell cracks provide pale cyan accents without a surrounding snow cloud.

**Palette:** slate blue, chalk white, muted cyan, small amber eye. **Avoid:** snowman anatomy, long spikes, mammoth tusks, extra legs, mountains or ground baked into the sprite. The silhouette is a dome, distinct from Kraghorn's forward-heavy boar.

### Profile and attacks

**Profile:** 1.05H, 0.80S, 1.20R, 0.80M. Basic interval 2.2 s.

**Basic — Covenant Bite:** 100% A physical to the blocker, one hit. Otherwise walk.

**Special — Rime Breath:** Every 11 s, select the deployed hero with the highest current basic attack rate within 3 steps. A snowflake-shaped target bracket warns for 1.5 s. Deal 55% A magical and apply **Rime: −25% attack speed for 4 s**. No stun, movement restriction, charge drain or effect on healing. The snapshot chooses the target; it does not keep changing as attack rates change.

**Ultimate — Winter's Held Breath:** Every 22 s, mark the two highest-rate heroes within 3 steps, or the single eligible hero. Warn for 2.5 s with two frost brackets and a visible shell-opening cast bar. Deal 85% A magical to each and apply Rime at −35% attack speed for 5 s. Each target takes one hit; reduced attack speed does not repeatedly retrigger this attack. After completion or interruption, **Thawing Seams** lasts 6 s: stationary, no attacks, +20% damage taken.

### Counterplay and map fit

Keep more than one effective damage source in reach. A shield or healthy attacker can absorb the breath while unaffected teammates maintain damage. Hard control can interrupt it. Shrine tiles remove the map's ordinary attack-speed penalty; they do not cleanse Rime. Rime does not suppress automated ultimates, so charge-focused allies provide another answer. Skeld never freezes the entire team or needs a dedicated cleanse hero.

**Tooltip:** “Slows your fastest attackers. Share damage across the squad and strike its open shell after the great breath.”

**Needed later:** hero attack-rate debuff, rate snapshot targeting, two-target frost tells; existing damage, control and exposure support the rest.

**Required checks:** strongest Rime refreshes without stacking; repeated casts cannot perpetually disable an attacker; environment and shrine modifiers apply once; ultimate hits each selected hero once; interruption opens the shell; a varied starter roster can win without cleanse or burn.

## 2. Thyrak, the Storm Antler — Thunder / Lightning

**Chapter:** 6 · **Map:** `stormpeak-6` · **Class:** Conductor

**Story:** Lightning rods on the Thunder Stair once carried storms safely into the mountain. Thyrak tore them free and grew their shapes into its antlers. It now feeds the storm back into anyone who strikes too eagerly.

**Selection text:** “An antlered beast carrying a storm. Marked attackers hurt themselves when they strike; shields give them time to keep fighting.”

### Silhouette and art brief

A tall wingless stag-dragon with exactly four lean hooved legs, a long reptilian neck, one narrow dragon head and a compact tapering tail. Two swept-back antlers each split into three thick lightning-rod prongs. Dark wet hide transitions into broad overlapping scales at the shoulders. A few dull silver bands are embedded in the antler bases; bright electric-blue seams stay inside the horns and chest. Show a grounded stalking pose, not a leap.

**Palette:** rain-black, storm violet, dull silver, limited electric blue. **Avoid:** wings, extra heads, huge branching trees of antlers, external lightning bolts or smoke. Readable tall neck and forked crown, not a second boar or a storm cloud.

### Profile and attacks

**Profile:** 0.95H, 1.00S, 0.80R, 1.10M. Basic interval 1.8 s.

**Basic — Rod-Tip Gore:** 100% A physical to the blocker.

**Special — Conductive Brand:** Every 12 s, mark the highest-rate attacker within 3 steps for a 1.5 s warning. Deal 40% A magical, then apply **Backlash for 4 s**. The hero's first direct damaging attack or damaging ultimate in each 1 s interval causes 12% A magical damage to that hero. Maximum four backlash hits. Multi-hit attacks, area targets and damage-over-time cannot multiply the charge; healing actions do not trigger it. Backlash damage cannot recursively trigger attacks, reactions or another backlash.

**Ultimate — Closed Circuit:** Every 24 s, lock the two highest-rate attackers within 3 steps. A forked lightning bracket warns for 2.5 s. Deal 60% A magical to each and give Backlash for 5 s, at 15% A per eligible hit, maximum five hits per target. Each target's timer is independent; heroes are not linked by distance and there is no chain splash. Replace a weaker active Backlash and refresh; never run two copies. Completion or interruption causes **Discharged Antlers** for 5 s: stationary, no attacks, magic resistance at 50% of its profile value.

### Counterplay and map fit

Give the attackers likely to be marked enough health, shields or recovery. Hard control interrupts the cast; several slower, heavier hitters remain effective without requiring the player to switch attacks off. A fast hero is still viable because backlash is capped per second, not per projectile. The mountaintop's flyer penalty does not affect this ground boss. Platform reach still matters for dealing damage during its recovery.

**Tooltip:** “Brands fast attackers with bounded lightning backlash. Protect them with shields and punish its discharged antlers.”

**Needed later:** capped hero-on-attack feedback status, per-target tick budget, non-recursive damage provenance; this is separate from Ochenta's incoming-hit counter and Baphomet's damage-leader silence.

**Required checks:** one area attack triggers one backlash; poison ticks never trigger it; shields absorb feedback normally; hits cannot recurse; no more than four/five procs; loss of target causes no transfer; a fast-attacker team remains playable with defensive support.

## 3. Neressa, the Undertow Queen — Water

**Chapter:** 7 · **Map:** `tidal-6` · **Class:** Support Hunter

**Story:** A drowned temple kept its healing springs inside sealed chambers. Neressa made the chambers her shell. She recognizes every restorative prayer as a trespass upon the water she claims.

**Selection text:** “The drowned crown reaches for the hands that heal. Guard your support; her open shell is the chance to end the tide.”

### Silhouette and art brief

A huge low crustacean with exactly six walking legs and two front pincers, one broad defensive claw and one slender hooked claw. A compact nautilus spiral forms the back shell; three broken sandstone crown points are part of its rim. A single small head with two short stalk eyes is clearly separate from the shell. Teal flesh, coral-crusted seams and a pale underside contrast with the worn stone shell. Both claws and all leg tips stay visible, pointing right.

**Palette:** deep teal, weathered cream sandstone, muted coral pink, seafoam highlights. **Avoid:** mermaid torso, human crown, tentacle skirt, water surrounding the body, extra claws or legs. Shell and claw asymmetry define it at small size.

### Profile and attacks

**Profile:** 1.00H, 0.85S, 1.10R, 0.90M. Basic interval 2.0 s.

**Basic — Breakwater Claw:** 110% A physical to the blocker.

**Healing target rule:** Among heroes within 3 steps, prefer the one that restored the most actual missing health during the last 8 s. Count credited effective healing to itself or allies; exclude overheal and shields. If all scores are zero, prefer Supports, then the nearest hero. Ties use entity ID. This score is used only at warning start.

**Special — Salt in the Spring:** Every 10 s, warn the healing target for 1.5 s with a hooked wave bracket. Deal 70% A magical. This is single-target and cannot splash onto the healed ally.

**Ultimate — The Crown Drinks:** Every 22 s, warn the healing target for 2.5 s with a spiral-shell seal. Deal 95% A magical and apply **Brine for 4 s: outgoing healing ×0.60**. It does not reduce incoming healing, shields or damage dealt, and does not silence skills. Brine refreshes without stacking. Completion or interruption opens **Empty Chamber** for 5 s: stationary, no attacks, armor at 50% of its profile value.

### Counterplay and map fit

Protect the productive healer through health, shields or another support. Damage reduction and shielding keep working through Brine. A team with no healer is legal: the target rule falls back to an ordinary hero and its healing penalty may have no effect. The tidal odd/even movement rule affects road speed normally; it never shortens the warning. This fight attacks the recovery provider rather than giving the boss Lerna's regeneration.

**Tooltip:** “Targets the hero restoring the most health. Shields still work when its salt weakens healing. Strike the opened shell.”

**Needed later:** rolling credited-healing ledger and outgoing healing debuff. Recipient healing modifiers, shields, control and armor reductions already provide foundations.

**Required checks:** overheal cannot draw aggro; healing attribution is correct for area and self-heals; locked marks do not jump to another healer; Brine and map healing modifiers multiply once; shields remain normal; no-support and two-support teams both have viable answers.

## 4. Morthul, the Bitter Bloom — Poison

**Chapter:** 8 · **Map:** `mycelium-6` · **Class:** Dose Keeper

**Story:** The Spore Lanterns grew around a guardian that once ate the cavern's decay. Morthul has swallowed too much. Its lantern cap now opens to release the poison it can no longer digest.

**Selection text:** “A bloated keeper of bitter spores. Each dose fades, but repeated exposure can overwhelm a careless defense.”

### Silhouette and art brief

An enormous squat toad with exactly four limbs, heavy rear haunches and two planted forefeet. A single thick mushroom cap folds over its back like a mantle, with three broad lobe tips. The head has one wide mouth and two small copper eyes. Large plum-colored warts and mint fungal gills give texture; an ivory belly stays visible. Small dim lantern nodules are attached to the cap, not floating around it.

**Palette:** bruised plum, damp umber, ivory, restrained mint. **Avoid:** snake heads, many tiny mushrooms, scattered spores, gore, tentacles or a poison cloud baked into the still. A squat oval with a folded canopy differentiates it from Lerna.

### Profile and attacks

**Profile:** 0.90H, 0.90S, 0.80R, 0.80M. Basic interval 2.0 s. No passive healing or poison immunity.

**Basic — Bitter Jaw:** 95% A physical to the blocker. Applies no hidden poison.

**Hero Venom:** Each dose lasts 4 s independently and deals 5% A magical at ages 1, 2, 3 and 4 s. At most three doses per hero: a new fourth replaces the oldest remaining dose and starts a new four-tick lifetime. Each tick uses ordinary magic defense and shields. Venom does not trigger enemy poison reactions, reduce healing, jump on death or tick after boss death.

**Special — Measured Dose:** Every 10 s, choose the nearest hero within 3 steps, warn for 1.5 s with a single droplet bracket, deal 35% A magical and add one Venom dose. Road/platform status does not change its damage.

**Ultimate — Unfurl the Bitter Bloom:** Every 23 s, mark up to three heroes within 3 steps, prioritizing the most active Venom doses, then nearest distance. Warn for 2.5 s with a three-lobed cap icon above each. Deal 55% A magical and add two doses to each locked target. This is a list of individual targets, not a cluster-radius attack. No eligible hero is hit twice. Completion or interruption produces **Spent Gills** for 6 s: stationary, no attacks, +20% damage taken.

### Counterplay and map fit

Maintain enough recovery to cover the finite doses, use shields, and avoid extending the fight unnecessarily. Damage and automated control reduce the number of casts. The map's +25% received healing helps offset this pressure while its enemy health bonus lengthens the encounter. Poison never becomes an infinite stack or a compulsory cleansing puzzle. Player poison and burn are still useful against Morthul.

**Tooltip:** “Applies up to three fading poison doses. Shields and healing cover them; its spent bloom takes extra damage.”

**Needed later:** capped independent hero damage-over-time doses and visible dose count. Existing enemy poison is a model, not a drop-in hero implementation.

**Required checks:** exact tick count and lifetime; oldest-dose replacement; cap three under overlapping special/ultimate hits; low/high sim speeds yield equal damage; no poison reaction on heroes; death clears doses; healing-focused and damage-focused rosters can both win without cleanse.

## 5. Ilyr, the Broken Reflection — Aetheral

**Chapter:** 9 · **Map:** `crystal-6` · **Class:** Prism Adaptor

**Story:** A spell intended to reflect intruders fractured into a living thing. Ilyr remembers the last weapon used against it and grows a matching facet. Its imperfect reflection always leaves another angle open.

**Selection text:** “A living prism that learns one kind of harm at a time. A varied offense can crack its greatest ward.”

### Silhouette and art brief

A compact manta-shaped creature with two broad swept-back fins, one narrow curled tail and a short pointed head facing right. Its solid body consists of dark translucent facets around a pale central core. The two fins have different large chipped edges, and a small lower keel anchors the silhouette. It floats low but has a coherent physical body; the image is not an indistinct ghost cloud. Keep both fin tips and the inward-curled tail inside the square.

**Palette:** deep indigo, translucent amethyst, aquamarine, pale core. **Avoid:** human face, star field, orbiting shards, detached targetable pieces, huge wings or mirror background. Glassy material distinguishes Aether from Astreon's organic night sky body.

### Profile and attacks

**Profile:** 0.95H, 0.90S, 0.90R, 0.90M. Basic interval 2.1 s.

**Basic — Facet Edge:** 95% A magical to the blocker.

**Special — Learn the Wound:** Every 12 s, total the actual post-defense physical and magical damage taken in the preceding 6 s. Include credited damage-over-time; ignore true damage, prevented damage and self-effects. Warn for 1.5 s with a visible sword or staff symbol. For 6 s, reduce incoming damage of the higher total type by 30%; the other type and true damage stay normal. Equal totals select physical, alternating only if both totals are zero. This is a flat typed reduction after ordinary resistance, not immunity or a second armor multiplier. Expire the adaptation on ultimate warning start.

**Ultimate — The Impossible Facet:** Every 25 s, lock the two nearest heroes within 3 steps and warn for 3 s. During warning, track actual physical and magical damage taken. Crack the ward if **each type reaches 2% of Ilyr's maximum HP**, or **their combined damage reaches 7%**. True damage hurts it but does not count toward this test. On cracking, cancel the outgoing attack. Otherwise deal 90% A magical once to each locked hero. All outcomes enter **Unmade** for 5 s: stationary, no attacks, +20% damage taken. The warning grants no extra damage reduction or invulnerability.

### Counterplay and map fit

Mix physical and magical attackers to sidestep adaptation and reach the lower two-type break threshold. A single-type team can still meet the 7% fallback, interrupt with hard control, or survive the attack and use Unmade. The Crystal Vault already rewards both damage types through different bonuses. No particular hero, elemental reaction or manual burst timing is required.

**Tooltip:** “Adapts to your dominant damage type. Physical and magical hits together crack its ward; its broken form is vulnerable.”

**Needed later:** typed recent-damage accounting, temporary typed reduction, dual-channel warning meter. Existing defenses, hit attribution and exposure are reusable.

**Required checks:** both counters use mitigated damage; adaptation cannot stack; no mixed-hit double counting; fatal hits prevent the ultimate; one damage event crossing the requirement breaks once; true damage never fills the meters; single-type teams retain a viable fallback.

## 6. Eidros, the Last Bell — Death

**Chapter:** 10 · **Map:** `necropolis-6` · **Class:** Funeral Herald

**Story:** Every procession through the necropolis once ended at a bell. Eidros was left to ring it after the mourners disappeared. Now it calls the living by name and carries a coffin for the answer.

**Selection text:** “A mourner that rings for the living. Break its summoned bell before the final toll reaches the whole defense.”

### Silhouette and art brief

A tall skeletal mourner with exactly two arms and two clearly visible legs beneath a split charcoal robe. Its bowed skull is enclosed by a blunt bone hood. One arm carries a large cracked bronze handbell; the other supports a compact coffin-shaped reliquary against the shoulder. The bell and coffin are plain large forms, not tiny ornament. Pale ribs show at the chest, with faint green light between them. A hunched forward pose faces right and keeps feet, bell and coffin corners inside the frame.

**Palette:** charcoal cloth, yellowed bone, tarnished bronze, faint grave green. **Avoid:** scythe, wings, horse, extra limbs, trailing robe cloud, detailed writing or separate corpses. The bell-bearing figure remains clearly different from playable Thanatos.

### Profile and attacks

**Profile:** 0.90H, 0.85S, 0.70R, 1.10M. Basic interval 2.2 s.

**Basic — Pallbearer's Hand:** 100% A physical to the blocker.

**Special — Name the Living:** Every 11 s, select the hero with the lowest current health fraction within 3 steps. A small bell-shaped mark warns for 1.5 s, then deals 55% A magical. There is no instant execution, resurrection denial or permanent injury.

**Ultimate — The Unanswered Toll:** Every 24 s, warn for 2 s with a coffin-outline cast indicator. Summon exactly one **Grave Bell**, an enemy objective with 4% H, zero armor/resistance, no attack or movement, positioned one quarter cell ahead on Eidros's own path, clamped before the exit. It is targetable and damageable by ordinary hero patterns, takes a separate entity ID, never blocks defenders and does not count as a wave enemy or boss. Its 6 s countdown is a second warning, displayed above it and on the boss HUD. Eidros remains targetable but stationary and unable to attack during this countdown.

If the bell dies, cancel the toll. If it survives, deal 70% A magical once to every deployed targetable hero, then remove it. Either result enters **Silenced Bell** for 5 s: stationary, no attacks, +20% damage taken. Interrupting the initial 2 s cast skips the summon and enters recovery. After spawning, stunning Eidros alone does not stop the countdown; destroy the objective or kill the boss. The bell awards no gold, experience, kill progress, harvest charge or other kill-trigger benefit. At most one exists, and it never survives its owner.

The bell uses a simple rendered coffin/bell marker; it does not require a ninth creature artwork. Its tooltip must explain its timer and no-reward status. Its placement ahead of the boss should allow ordinary First targeting to pick it; validate real routes and supported targeting priorities before rollout.

### Counterplay and map fit

Cover the boss's road with more than one attack pattern and prioritize the bell when it appears. Strong burst, area damage or ordinary First targeting can break it. A durable squad may absorb a missed toll. Grave Tribute's reduced healing makes repeatedly ignoring the bell costly; summon farming must never benefit from its gold bonus. This differs from Lilith: Eidros is never invulnerable and does not share damage with the summon.

**Tooltip:** “Summons a bell that threatens the whole squad. Destroy it before the toll. Its owner stays vulnerable.”

**Needed later:** timed targetable objective, reward/quest exclusions, boss-owned summon cleanup and explicit countdown phase; normal attacks and targeting remain the means of destruction.

**Required checks:** First targeting can acquire the bell on the actual finale layout; it receives valid AoE and direct hits; no body invulnerability; countdown pauses; boss/bell deaths cancel the toll once; zero farming payouts or kill triggers; no deadlock at a path bend or exit; teams without precision targeting can win.

## 7. Astreon, the Hollow Star — Star / Galaxy

**Chapter:** 12 · **Map:** `celestial-6` · **Class:** Charge Harvester

**Story:** The observatory traced a constellation that did not belong to the sky. It stepped down onto the meridian as Astreon. The light gathering around the defenders is the same light missing from its hollow chest.

**Selection text:** “A constellation hunting gathered power. It steals a little charge from your brightest heroes, never their entire ultimate.”

### Silhouette and art brief

A large long-legged feline with exactly four paws, a narrow predatory head and a short thick tail curled forward. Its deep midnight body is solid and muscular; a few large pale-gold star nodes sit at its joints. The chest has a single hollow oval core surrounded by rib-like silver plates. A compact crescent crest grows along the shoulders rather than orbiting outside them. Face right in a stalking pose with the body and all paws visible.

**Palette:** midnight blue, indigo, pale silver, restrained gold. **Avoid:** galaxy background, constellation diagram, external orbit rings, smoke body, wings or extra eyes. Broad feline anatomy and a hollow chest carry the idea at 96 px.

### Profile and attacks

**Profile:** 0.95H, 1.00S, 0.90R, 1.00M. Basic interval 1.9 s.

**Basic — Meridian Claw:** 100% A physical to the blocker.

**Special — Far Star:** Every 12 s, choose the farthest hero within 3 steps, warn for 1.5 s with a four-point star mark and deal 65% A magical. It is a single hit with no radius or retarget, giving the backline a reason to retain some defense.

**Ultimate — Borrowed Constellation:** Every 25 s, mark up to two heroes within 3 steps with the highest current normalized ultimate charge. A hollow star bracket warns for 2.5 s. At resolution siphon **up to 15% of a full ultimate charge** from each, clamped to its available charge. A hero that already cast automatically may have zero left and loses nothing; already-fired ultimates are never canceled, cooldowns never reset, and the mark never switches targets.

Immediately deal to each marked hero **60% A + up to 40% A magical**, proportional to the fraction of the 15% budget actually stolen from that hero. This damage uses charge stolen from that same hero, not a pooled multiplier. Completion or interruption gives **Dimmed Core** for 6 s: stationary, no attacks, magic resistance at 50% of its profile value. Stolen charge disappears; it grants Astreon no heal, shield or additional cast.

### Counterplay and map fit

Spread ultimate generation across useful allies instead of making one charged carry essential. Automated casts can naturally empty a mark before resolution. Shields and ordinary damage continue working, and hard control prevents the siphon. On odd waves Astral Convergence replenishes charge faster; its modifier remains normal and does not amplify the stolen amount. There is no charge reset or mandatory manual ultimate button.

**Tooltip:** “Marks the most charged heroes and steals a small, capped amount. Casts already released are safe. Strike its dimmed core.”

**Needed later:** charge snapshot ranking, bounded subtraction in the game's actual charge units, per-target siphon-scaled hit. Existing automatic ultimate dispatch order must be documented for same-step casts and resolution.

**Required checks:** compare normalized charge, not differing cooldowns; zero charge yields base damage only; cap subtraction at 15%; resolve automatic ultimates before siphoning on the same step; never cancel a released ultimate; map charge bonuses remain normal; interruption/death subtract nothing.

## 8. Brontax, the Brass Adjudicator — Steampunk / Mechanical

**Chapter:** 13 · **Map:** `clockwork-6` · **Class:** Formation Analyst

**Story:** The citadel built an adjudicator to identify and dismantle invading armies. With no master left, Brontax still classifies every visitor as an army. Its furnace changes pressure whenever the same fighting style appears too often.

**Selection text:** “A machine that calibrates against your largest class. A varied squad keeps its answer incomplete.”

### Silhouette and art brief

A heavy mechanical ape with exactly two short piston legs and two long arms. One arm ends in a broad riveted fist, the other in a compact three-finger tool hand. A squat pressure boiler rises behind the shoulders; two short capped exhaust pipes remain within the silhouette. Its single recessed head has a horizontal turquoise inspection slit. Exposed dark-iron joints and large brass shoulder plates show how it moves; an orange furnace window sits low in the chest. Both planted feet and knuckles stay visible in a right-facing hunched stance.

**Palette:** tarnished brass, black iron, dull copper, a small turquoise slit and ember window. **Avoid:** readable lettering, many tiny gears, huge chimneys, external steam clouds, tank treads, additional arms or weapons. Animation should move the joints, with effects left to the renderer.

### Profile and attacks

**Profile:** 1.10H, 0.80S, 1.30R, 0.80M. Basic interval 2.3 s.

**Basic — Riveted Verdict:** 110% A physical to the blocker.

**Special — Shear the Guard:** Every 12 s, prefer its current blocker, otherwise the nearest road hero within 2 steps. Warn with a broken-shield bracket for 1.5 s, deal 65% A physical and reduce that hero's armor by 25% for 4 s. Zero armor stays zero; reduction does not become negative or affect magic resistance. Same-source reapplications refresh rather than stack.

**Ultimate — Countermeasure Protocol:** Every 26 s, count living deployed heroes in each playable class across the board. Select the largest class; ties follow the fixed order Tank, Warrior, Assassin, Mage, Support. Lock the entity IDs in that class and warn for 3 s, showing its actual class icon and name over the boiler and the marked heroes.

Apply **Calibration for 6 s: outgoing attack damage ×0.70** to surviving, targetable locked heroes. It affects basic and ultimate damage credited to those heroes; existing damage-over-time snapshots remain unchanged, and newly applied damage-over-time uses the weakened hit normally. Healing, shields, attack speed, ultimate charge, control duration and true damage based on enemy maximum HP remain normal. No immediate ultimate damage or global silence accompanies Calibration. Heroes deployed after the warning are not added retroactively. On completion or interruption, **Pressure Vent** lasts 6 s: stationary, no attacks, armor and magic resistance at 60% of their profile values. Calibration persists through this recovery on a completed cast, so unmarked classes have the strongest window.

### Counterplay and map fit

Mix useful classes so the machine's largest group is small. Unmarked allies exploit Pressure Vent while marked heroes still supply reduced damage, full control, shielding and healing. A single-class team remains legal and can use the window, hard control and its 70% residual damage; the machine never removes a class's ability to act. Overdrive's faster hero attacks apply normally, and the ground speed bonus cannot shorten warnings. This tests roster breadth rather than stopping Kraghorn's charge or waiting out Ochenta's final immortality.

**Tooltip:** “Weakens damage from your largest class. Other classes keep full strength; all can punish its venting armor.”

**Needed later:** fixed-order class census, locked-group damage modifier, temporary hero armor reduction and clearly labeled class warning. No new playable class or permanent adaptation is required.

**Required checks:** tie order deterministic; a dead/sold target loses the effect and replacement deployments are not marked; Calibration changes credited attack damage once; heals/shields/control retain full values; armor never goes negative; map attack-speed bonus stays normal; varied and single-class teams both have viable answers.

## Shared required checks for the future build

- Verify actual campaign board coverage and road contacts for every targeting range; do not hand-edit generated geometry to rescue a fight.
- Resolve profiles, environment modifiers, damage attribution and each modifier exactly once. Preserve the ordinary one-boss reward and leak rules.
- Each warning names the locked targets, countdown and affected area or action. Effects remain readable behind units and outside the HUD layer, at normal and reduced motion.
- Controls, pauses, death, simultaneous hits and high sim speed cannot cause duplicated attacks, stuck block contacts, infinite debuffs, deferred post-death kills or extra rewards.
- Dead/sold/veiled targets follow the shared miss rule. Newly deployed heroes cannot inherit another entity's marks.
- Keep targeting and presentation independent of sprite offsets. No boss silently becomes a flyer, teleports, advances while paused or ignores its road.
- Use mixed basic rosters and plausible specialized rosters. No named rare hero, cleanse, manual ultimate, paid Intervention or mid-fight relocation is a required solution.
- Review each encounter with the chapter's environment rule and actual final-wave number. Numerical proposals here are not evidence of balanced or achievable fights.
- Finales eventually name the owner-approved boss explicitly; generic `boss` remains a fallback. This document does not perform those campaign edits.

## Artwork pass after owner approval

Create **one full-body still for each approved boss**, from its original text brief. Match the current painted enemy sprites: crisp dark fantasy materials, strong anatomy, upper-left lighting, slight three-quarter top-down angle, facing right. Square transparent canvas, complete extremities, roughly 20% total breathing room, readable at 96 px and suitable for fitting into the existing 256 × 256 sprite format. No floor, cast shadow, terrain, text, UI, baked attack effects or animation sheet.

Proposed source names: `boss_skeld.png`, `boss_thyrak.png`, `boss_neressa.png`, `boss_morthul.png`, `boss_ilyr.png`, `boss_eidros.png`, `boss_astreon.png`, `boss_brontax.png`. Keep original generation output and exact prompts in a new versioned artifact folder, provisionally `artifacts/td-campaign-bosses-v1/`; never overwrite existing published files. Inspect every result for silhouette, anatomy, transparency, clipping and small-size readability.

The later PixelLab animation pipeline can use the approved stills, with motions preserving exact anatomy and no generated attack effects. **This assignment stops after the eight still artworks and their handoff.** It does not include animation generation, uploads, runtime registration, stat implementation, campaign edits or a balance pass.

## Owner review and delivery status

The owner approved the roster, names, monster forms and visual identities. The proposed bespoke mechanics remain below as historical design notes, but were superseded by the decision to use standard boss combat behavior. The eight still artworks and all 40 animation clips are saved, inspected and approved.

**Subsequent owner request — animation review:** The owner authorized the same five PixelLab clips as the existing bosses for all eight new bosses, then approved all 40 clips on October 2, 2026, with no correction reruns requested. See [animation review](artifacts/td-campaign-bosses-v1/animation-review/index.html) and [inspection notes](artifacts/td-campaign-bosses-v1/animation-review/REVIEW.md). The assets are registered, uploaded to R2 and assigned to every campaign map in their chapters. The owner subsequently descoped all proposed special and ultimate mechanics; these bosses use standard combat behavior.

# Tower Defense — Mythic Hero Content

Content draft · 26 September 2026 · English · All 21 TD roster slots

This is the proposed replacement text pack for parts **a) heroes** and **b) text** of the white-label work. Each hero is an original game interpretation of a Greek or Norse mythological figure. The biographies, titles, skill names, flavor, and dialogue below are newly written. Images are deferred.

This file supplements `TOWER_DEFENSE_WHITELABEL_PLAN.md`. For hero identities and text, use this draft in preference to its preliminary briefs. It does not apply changes to the game or original hero database. Internal IDs, class assignments, stats, costs, cooldowns, and combat variants remain compatible with the existing roster.

## Creative direction

**Roster premise — The Last Crossing:**

> The roads between the worlds are breaking. At the last crossing, gods, monsters, and mortal champions keep a passage open for those still fleeing. Old enemies share the watch. Each brings a different reason to hold the road until morning.

This alliance, its setting, each hero's motivation here, and all battlefield powers are game fiction. The **Myth anchor** in each entry identifies the traditional foundation separately. The premise allows Fenrir, Odin, and Vidar to share a roster without pretending their alliance belongs to the old stories.

Names use readable English spellings: Aegir, Skadi, Vidar, Nott, Hephaestus, Asclepius, and Hecate. Search aliases may include Ægir, Skaði, Víðarr, Nótt, Hephaistos, Asklepios, and Hekate. Aliases are search metadata, not additional heroes.

Two changes from the earlier plan: **Asclepius replaces Sif** for `freya`, since medicine and restoration fit the implemented revival ability; **Harmonia replaces Aphrodite** for `yuelao`, since concord fits collective recovery and readiness without borrowing Yuelao's red-thread identity.

## Roster map

| Internal ID | Display name | Original title | Tradition | Class / placement | Ultimate |
|---|---|---|---|---|---|
| `nuwa` | Atlas | Shoulder of the Crossing | Greek | Tank / road | A Place to Stand |
| `prometheus` | Ymir | Memory of the First Frost | Norse | Tank / road | Faults Beneath the Ice |
| `momus` | Heimdall | Watchman at the World-Seam | Norse | Tank / road | The Gate Hears You |
| `demeter` | Gaia | Ground Beneath the Refuge | Greek | Tank / road | Borrowed from Bedrock |
| `poseidon` | Aegir | Host of the Deep Hall | Norse | Warrior / road | The Sea Takes a Step |
| `amunra` | Helios | Keeper of the Eastern Road | Greek | Warrior / road | Noon at the Narrow Gate |
| `set` | Surtr | Ember at the Boundary | Norse | Warrior / road | Fuel for the Last Fire |
| `jormungandr` | Fenrir | The Unfastened Jaw | Norse | Warrior / road | Leave the Wound Open |
| `nyx` | Nott | Rider Between Watchfires | Norse | Assassin / road | Where the Lantern Ends |
| `bastet` | Hecate | Keeper of the Third Turning | Greek | Assassin / road | Every Exit Is Mine |
| `horus` | Vidar | Answer Without a Word | Norse | Assassin / road | The Debt Comes Due |
| `anubis` | Thanatos | Witness of the Final Breath | Greek | Assassin / road | One Breath Remaining |
| `zeus` | Odin | Reader of Unfinished Roads | Norse | Mage / platform | The Answer Travels |
| `phoenix` | Hephaestus | Smith of the Refuge Gate | Greek | Mage / platform | Work the Living Furnace |
| `fengyi` | Boreas | Winter at the Open Door | Greek | Mage / platform | Wind Finds the Weakness |
| `diana` | Skadi | Hunter Above the Pass | Norse | Archer / platform | Follow My Arrow |
| `artemis` | Atalanta | First Through the Brambles | Greek | Archer / platform | A Path Through the Pack |
| `medusa` | Stheno | Stillness at the Threshold | Greek | Archer / platform | Hold That Last Step |
| `caishen` | Plutus | Keeper of the Common Store | Greek | Support / platform | Enough for Everyone |
| `yuelao` | Harmonia | The Meeting of Many Hands | Greek | Support / platform | Together, Once More |
| `freya` | Asclepius | Physician of the Last Watch | Greek | Support / platform | There Is Still a Pulse |

## How to use the copy

Each entry supplies a title, recruit-card summary, biography, named basic action, named class trait, ultimate flavor and rules, awakening name and rules, and three optional dialogue lines. Titles and awakening names are new editorial fields; the current interface need not display all of them. Dialogue is text only and does not require audio. Myth anchors and implementation notes are editorial metadata, not tooltip text.

The rules reflect `src/game/td/sim.js` and `src/data/gameBalance.tuning.json` as read on this date, including local working-tree changes. The earlier skill-design document contains unimplemented proposals; these entries do not advertise those proposals. Runtime values should eventually populate numerical text so tuning changes cannot leave stale tooltips.

**Shared combat terminology:**

- **Ultimate strength (U):** 2.5 × current attack × hero ultimate-power multiplier × class ultimate bonus. Percentages of U below are raw damage before resistance and other combat modifiers. An ultimate deals damage only where its entry explicitly says so.
- **Range:** the deployed hero's current range. Distances in px are game-world units, independent of screen size.
- **Exposed:** takes 20% more damage. This does not remove armor.
- **Wounded execution threshold:** normally below 35% maximum health; use the runtime threshold if upgrades modify it.
- **Allies in range:** includes the caster where the simulation includes them. Healing cannot exceed maximum health.
- **Facing:** warrior area ultimates first use eligible enemies in the forward cone; if there are none, they use eligible enemies around the caster. Ground heroes cannot hit flying enemies.
- **Placement, targeting, and cooldown:** preserve the current rules. These names introduce no additional damage types, movement, status effects, summons, or resource costs.

**Class trait copy**, shared by the individually named traits below:

| Class | Complete base trait text |
|---|---|
| Tank | Blocks up to 3 ground enemies and reduces incoming damage by 30%. Casting an ultimate also stops ground enemies within 1.8× range from moving or attacking for 2 seconds. |
| Warrior | Blocks up to 2 ground enemies. Basic attacks also strike up to 5 eligible enemies within 65 px of the target for 70% damage. |
| Assassin | Blocks 1 ground enemy and can reach beyond normal attack range to catch escaping enemies. Deals bonus basic damage to unblocked enemies, with a larger bonus against faster targets. After an ultimate, becomes untargetable for 3 seconds; basic attacks during this time can hit 1 additional enemy. |
| Mage | Basic attacks deal magic damage and splash nearby enemies for 35% damage within 42 px. Odin uses a chain instead of splash. |
| Archer | Basic attacks ignore 35% of the target's relevant resistance and deal double damage to flying enemies. Default targeting favors the enemy with the most current health. |
| Support | Basic actions heal the ally in range with the lowest health percentage for 180% of current attack. If no healing is needed, attacks deal 35% of current attack. Nearby other allies receive a 35% attack aura; overlapping support auras do not add together. |

Class upgrades and run bonuses can modify these base values. Support ultimate healing starts at 18% of recipient maximum health and scales with the existing healing bonuses. Temporary attack buffs start at +25% and use the existing buff calculation. The basic-action text in each entry is combined with its class rules, not an additional attack or passive.

## Tanks

### 01. Atlas — Shoulder of the Crossing

**Binding:** `nuwa` · `shield_wall` · Tank · road · he/him

**Myth anchor:** Atlas bears the heavens in Greek tradition. He is not carrying the planet. [Source: Atlas](https://www.theoi.com/Titan/TitanAtlas.html).

**Card:** Holds the road and restores nearby frontline allies.

**Biography:** Atlas knows the difference between a weight endured and a burden shared. At the crossing, he lowers one shoulder beneath the fractured arch and makes room for others to brace beside him. He counts the people passing under it. Every one gives him another reason to remain.

**Basic — Stone at the Heel:** Atlas drives a short, heavy blow into one enemy.

**Trait — Room Beneath the Sky:** Uses the Tank trait.

**Ultimate — A Place to Stand**

- Flavor: “For a moment, the whole line finds its footing.”
- Rules: Slow eligible enemies within 1.8× range for 3 seconds. Restore 15% maximum health to road allies within range. Also apply the Tank ultimate stop.

**Awakening — The Weight Is Shared:** Road-ally healing becomes 30% maximum health. The slow lasts 4 seconds.

**Dialogue:** Recruit: “There is room beneath my shoulder.” · Ultimate: “Stand with me.” · Defeat: “Take the weight.”

### 02. Ymir — Memory of the First Frost

**Binding:** `prometheus` · `expose` · Tank · road · he/him

**Myth anchor:** Ymir is the primordial giant whose body becomes the world. [Source: Prose Edda, Creation](https://www.gutenberg.org/files/18947/18947-h/18947-h.htm).

**Card:** Holds enemies in place and makes them take more damage.

**Biography:** The crossing remembers a world before its roads, and that memory has taken Ymir's shape. He feels each footfall like a knock against an old door. For now, he answers by standing in the breach. Even a creature made from the beginning can choose what survives the end.

**Basic — First Ice:** Ymir strikes one enemy with the weight of ancient frost.

**Trait — Before the Mountains:** Uses the Tank trait.

**Ultimate — Faults Beneath the Ice**

- Flavor: “Everything has a fracture. Winter remembers where.”
- Rules: Slow eligible enemies within 1.8× range for 3 seconds and expose them for 4 seconds. Also apply the Tank ultimate stop.

**Awakening — The Deep Crack:** Exposure lasts 7 seconds.

**Dialogue:** Recruit: “I remember when this was silence.” · Ultimate: “Split.” · Defeat: “Build something from this.”

### 03. Heimdall — Watchman at the World-Seam

**Binding:** `momus` · `mass_taunt` · Tank · road · he/him

**Myth anchor:** Heimdall guards Bifrost and bears Gjallarhorn. [Source: Prose Edda](https://www.gutenberg.org/files/18947/18947-h/18947-h.htm).

**Card:** Disrupts a wide approach so the defense can catch up.

**Biography:** Heimdall hears the loose buckle before he sees the fleeing child. He hears the marching host behind her, too. At the crossing, vigilance means knowing which footsteps need a warning and which need a welcome. His horn makes the distinction clear.

**Basic — Watchman's Measure:** Heimdall strikes one enemy with a measured weapon blow.

**Trait — No Unwatched Step:** Uses the Tank trait.

**Ultimate — The Gate Hears You**

- Flavor: “The warning reaches farther than the wall.”
- Rules: Slow eligible enemies within 2.5× range for 3 seconds. Also apply the Tank ultimate stop within its separate 1.8× range.

**Awakening — Heard Across the Gap:** The slow reaches 3.5× range and lasts 5 seconds.

**Dialogue:** Recruit: “I heard you coming.” · Ultimate: “The watch is awake.” · Defeat: “Someone take the horn.”

### 04. Gaia — Ground Beneath the Refuge

**Binding:** `demeter` · `drain_field` · Tank · road · she/her

**Myth anchor:** Gaia personifies the earth and belongs to the earliest Greek divine generations. [Source: Gaia](https://www.theoi.com/Protogenos/Gaia.html).

**Card:** Stops nearby enemies and restores her own health.

**Biography:** Gaia presses her palm into the road and feels what the travelers have carried: seed, ash, broken tools, the weight of children asleep. She gathers their scattered earth into a foundation. If this is the last place left to stand, she will make it deep enough to hold them.

**Basic — Knuckle of Earth:** Gaia lands a single crushing blow.

**Trait — Deep Enough to Hold:** Uses the Tank trait.

**Ultimate — Borrowed from Bedrock**

- Flavor: “The road gives back what its guardian needs.”
- Rules: Slow eligible enemies within 1.8× range for 3 seconds and restore 15% of Gaia's maximum health. Also apply the Tank ultimate stop.

**Awakening — The Ground Remembers:** Self-healing becomes 35% maximum health.

**Dialogue:** Recruit: “Put your feet here.” · Ultimate: “Down to the roots.” · Defeat: “Keep something growing.”

## Warriors

### 05. Aegir — Host of the Deep Hall

**Binding:** `poseidon` · `knockback` · Warrior · road · he/him

**Myth anchor:** Aegir is associated with the sea and feasts for the gods. [Source: Prose Edda, Aegir's Feast](https://www.gutenberg.org/files/18947/18947-h/18947-h.htm).

**Card:** Pushes advancing enemies back along the road.

**Biography:** Aegir has prepared a table for people who may never reach it. Until they do, he stands at the crossing with the patience of a host keeping supper warm. The sea gathers at his feet. Uninvited guests will find the approach much longer than they expected.

**Basic — Breakwater Blow:** Aegir strikes the target and nearby enemies with a sweeping impact.

**Trait — A Host Makes Space:** Uses the Warrior trait.

**Ultimate — The Sea Takes a Step**

- Flavor: “The shore moves. The enemy moves with it.”
- Rules: Strike up to 3 eligible enemies within 72 px for 100% U each, prioritizing those furthest along the path. Push them back 80 px. Use the shared warrior facing rule.

**Awakening — Another Pace Inland:** Strike up to 5 enemies and push them back 140 px.

**Dialogue:** Recruit: “I have set a place for you.” · Ultimate: “Back beyond the shore.” · Defeat: “Keep the table ready.”

### 06. Helios — Keeper of the Eastern Road

**Binding:** `amunra` · `war_cry` · Warrior · road · he/him

**Myth anchor:** Helios drives the sun's chariot across the sky. [Source: Helios](https://www.theoi.com/Titan/Helios.html).

**Card:** Sweeps nearby enemies and slows their advance.

**Biography:** From above, Helios has watched every road arrive somewhere. The crossing is the first he has seen that might end in nothing. He leaves its far side lit for the travelers and descends to defend the near side himself. Morning will have an address as long as he can keep it.

**Basic — Rim of the Sun:** Helios swings a bright weapon stroke through the target's group.

**Trait — Broad Daylight:** Uses the Warrior trait.

**Ultimate — Noon at the Narrow Gate**

- Flavor: “A single bright instant stretches across the road.”
- Rules: Strike eligible enemies within 72 px for 100% U each and slow them for 2 seconds. Use the shared warrior facing rule.

**Awakening — The Longest Noon:** Damage becomes 150% U and the slow lasts 4 seconds.

**Dialogue:** Recruit: “I will keep the far road lit.” · Ultimate: “Eyes to the dawn.” · Defeat: “Carry a little light.”

### 07. Surtr — Ember at the Boundary

**Binding:** `set` · `lifesteal_cleave` · Warrior · road · he/him

**Myth anchor:** Surtr bears a fiery sword and is a destructive force at Ragnarok. [Source: Prose Edda, Ragnarok](https://www.gutenberg.org/files/18947/18947-h/18947-h.htm).

**Card:** Cuts through groups and recovers health for each enemy struck.

**Biography:** Surtr has heard enough promises about how the world must end. At the crossing, he plants his sword across the invaders' road and grants the fleeing crowd another hour. He offers no explanation. For once, his fire is something people can stand behind.

**Basic — Coal-Edge Stroke:** Surtr's broad sword catches the target and nearby enemies.

**Trait — The Fire Has Width:** Uses the Warrior trait.

**Ultimate — Fuel for the Last Fire**

- Flavor: “Each body checked at the boundary feeds the ember holding it.”
- Rules: Strike eligible enemies within 72 px for 100% U each. Restore health equal to 15% U per enemy struck. Use the shared warrior facing rule. Healing is based on raw ultimate strength, not the damage remaining after resistance.

**Awakening — An Ember Refuses:** Healing becomes 30% U per enemy struck.

**Dialogue:** Recruit: “The ending can wait.” · Ultimate: “Feed the fire.” · Defeat: “Something still burns.”

### 08. Fenrir — The Unfastened Jaw

**Binding:** `jormungandr` · `venom_cleave` · Warrior · road · he/him

**Myth anchor:** Fenrir is the great wolf bound by the gods with Gleipnir. [Source: Prose Edda, Loki and His Offspring](https://www.gutenberg.org/files/18947/18947-h/18947-h.htm).

**Card:** Tears through a group and leaves it vulnerable to follow-up damage.

**Biography:** Fenrir agrees to guard the crossing on one condition: nobody fastens anything around his neck. He patrols the approach with his nose low and his eyes on the hands behind him. The refugees keep their distance. They also leave a clear path for him to return.

**Basic — Jaw Across the Road:** Fenrir bites through the target's group.

**Trait — No Chain Between Us:** Uses the Warrior trait.

**Ultimate — Leave the Wound Open**

- Flavor: “The pack behind him finds the opening he leaves.”
- Rules: Strike eligible enemies within 72 px for 100% U each and expose them for 4 seconds. Use the shared warrior facing rule. This skill does not apply poison or bleed.

**Awakening — Wider Than the Fetter:** Radius becomes 100 px and exposure lasts 8 seconds.

**Dialogue:** Recruit: “Leave the way back open.” · Ultimate: “Now. Through the gap.” · Defeat: “No collar.”

## Assassins

### 09. Nott — Rider Between Watchfires

**Binding:** `nyx` · `shadow_step` · Assassin · road · she/her

**Myth anchor:** Nott personifies night and rides across the sky on Hrimfaxi. [Source: Prose Edda](https://www.gutenberg.org/files/18947/18947-h/18947-h.htm).

**Card:** Reaches a vulnerable enemy across the battlefield and disrupts its group.

**Biography:** Nott rides the spaces the watchfires cannot reach. She learns the names of the sentries and the places where they grow afraid to look. When something slips through the light, she meets it in the dark. The next lantern keeps burning without knowing why.

**Basic — Between Hoofbeats:** Nott delivers a quick strike to one enemy.

**Trait — Unlit Ground:** Uses the Assassin trait.

**Ultimate — Where the Lantern Ends**

- Flavor: “Night is already waiting at the escape route.”
- Rules: Reach the weakest eligible ground enemy anywhere on the map. Deal 100% U, increased to 180% U below the execution threshold. Slow surviving eligible enemies within 70 px of the victim for 2 seconds. Also activate the Assassin veil.

**Awakening — The Next Darkness:** Also strike the second-weakest eligible enemy, with the same execution and nearby slow rules.

**Dialogue:** Recruit: “I will take the unlit stretch.” · Ultimate: “You have run into night.” · Defeat: “Tend the lamps.”

### 10. Hecate — Keeper of the Third Turning

**Binding:** `bastet` · `claw_sweep` · Assassin · road · she/her

**Myth anchor:** Hecate is associated with crossroads, torches, and magic. [Source: Hecate](https://www.theoi.com/Khthonios/Hekate.html).

**Card:** Finishes wounded enemies clustered around her target.

**Biography:** Hecate marks the safe turn with a small lamp that never quite goes out. Those she guides find a road through the ruins. Those who hunt them discover that every turning has brought them back to her. She has been waiting long enough to learn their footsteps.

**Basic — Key at the Turning:** Hecate strikes one enemy with a short blade.

**Trait — A Road Behind the Road:** Uses the Assassin trait.

**Ultimate — Every Exit Is Mine**

- Flavor: “Three roads meet at the same sharp answer.”
- Rules: Hit the target for 100% U, or 180% U below the execution threshold. Hit other eligible enemies within 55 px of it for 70% U each, or 180% U each below that threshold. Also activate the Assassin veil.

**Awakening — No Unmarked Turning:** The surrounding strike radius becomes 90 px.

**Dialogue:** Recruit: “Follow the smaller light.” · Ultimate: “You have tried this road.” · Defeat: “Keep the lamp low.”

### 11. Vidar — Answer Without a Word

**Binding:** `horus` · `rapid_strike` · Assassin · road · he/him

**Myth anchor:** Vidar is the silent god who avenges Odin against Fenrir. [Source: Prose Edda](https://www.gutenberg.org/files/18947/18947-h/18947-h.htm).

**Card:** Concentrates several rapid hits on one enemy.

**Biography:** Vidar takes the watch nobody volunteers for. He checks the footing, tightens his grip, and waits. At the crossing, his silence becomes useful: others can hear a loose stone, a frightened voice, an approaching runner. When he finally moves, everyone knows where to look.

**Basic — Measured Answer:** Vidar makes one precise close-range strike.

**Trait — The Quiet Pursuit:** Uses the Assassin trait.

**Ultimate — The Debt Comes Due**

- Flavor: “One answer, delivered without interruption.”
- Rules: Strike the target up to 3 times for 50% U per hit. Stop if the target dies. Also activate the Assassin veil.

**Awakening — Nothing Left Unanswered:** Strike up to 5 times.

**Dialogue:** Recruit: “Here.” · Ultimate: “Enough.” · Defeat: “Your watch.”

### 12. Thanatos — Witness of the Final Breath

**Binding:** `anubis` · `soul_drain` · Assassin · road · he/him

**Myth anchor:** Thanatos personifies death in Greek mythology. [Source: Thanatos](https://www.theoi.com/Daimon/Thanatos.html).

**Card:** Delivers a heavy finishing blow; a kill rapidly recharges the skill.

**Biography:** Thanatos walks beside the evacuation without hurrying it. He has no need to chase the frightened and no wish to make their last moments smaller. At the rear of the column, he turns toward its pursuers. Some endings can serve the people still carrying a future.

**Basic — Quiet Touch:** Thanatos lands a single close-range strike.

**Trait — An Unhurried Arrival:** Uses the Assassin trait.

**Ultimate — One Breath Remaining**

- Flavor: “The road grows quiet around a single heartbeat.”
- Rules: Strike the weakest enemy in range for 180% U. Stun a surviving target for 2 seconds. A kill restores 60% ultimate charge. Also activate the Assassin veil.

**Awakening — The Silence Continues:** The stun lasts 3 seconds and a kill restores 80% charge.

**Dialogue:** Recruit: “Let them finish their journey.” · Ultimate: “This is where yours ends.” · Defeat: “I know the way.”

## Mages

### 13. Odin — Reader of Unfinished Roads

**Binding:** `zeus` · `chain_lightning` · basic override `chain` · Mage · platform · he/him

**Myth anchor:** Odin seeks wisdom, sacrifices an eye, and is associated with ravens and the spear Gungnir. [Source: Prose Edda](https://www.gutenberg.org/files/18947/18947-h/18947-h.htm).

**Card:** Links enemies with successive magical strikes.

**Biography:** Odin reads the broken roads as though they are lines missing from a poem. Every traveler brings another fragment. He listens, scratches a sign into his spear shaft, and tests a new answer against the approaching host. The crossing has not yet told him how its story ends.

**Basic — A Thought Passed On:** A spear-borne spell strikes the target, then jumps to up to 2 unhit enemies, dealing 60% and 35% basic damage. Each jump reaches 110 px from the previous victim.

**Trait — One Question Leads On:** Uses the Mage rules with chain basics instead of splash.

**Ultimate — The Answer Travels**

- Flavor: “A hard-won answer passes from one foe to the next.”
- Rules: Deal 100% U to eligible enemies within 72 px of the target. Then jump to up to 2 additional unhit enemies for 70% and 45% U, with each jump reaching 140 px from the previous victim.

**Awakening — Two More Questions:** The chain can make 4 jumps, adding hits for 30% and 20% U.

**Dialogue:** Recruit: “There is a road we have not tried.” · Ultimate: “Pass the answer on.” · Defeat: “Remember what this cost.”

**Adaptation note:** Linked rune magic is invented game expression; it is not a claim that Gungnir traditionally casts lightning. Includes the formerly separate Zeus slot in this text draft.

### 14. Hephaestus — Smith of the Refuge Gate

**Binding:** `phoenix` · `rebirth_flame` · Mage · platform · he/him

**Myth anchor:** Hephaestus is the Greek god of metalworking and divine craftsmanship. [Source: Hephaestus](https://www.theoi.com/Olympios/Hephaistos.html).

**Card:** Blasts a group and restores his own health.

**Biography:** Hephaestus makes a forge from the crossing's broken hinges. Travelers bring him cracked buckles and bent nails; he sends them onward with something that works. When the host approaches, he turns the bellows toward the road. There is still useful heat in everything they tried to break.

**Basic — Scale from the Anvil:** Hephaestus casts a hot fragment that damages the target and splashes nearby enemies.

**Trait — A Smith's Reach:** Uses the Mage trait.

**Ultimate — Work the Living Furnace**

- Flavor: “He draws strength from the same heat that checks the assault.”
- Rules: Deal 100% U to eligible enemies within 72 px of the target. Restore 20% of Hephaestus's maximum health.

**Awakening — Heat Worth Keeping:** Blast radius becomes 110 px and self-healing becomes 40% maximum health.

**Dialogue:** Recruit: “Bring me what is broken.” · Ultimate: “Open the furnace.” · Defeat: “The tools are still good.”

**Adaptation note:** Furnace healing is a game invention. This kit has no sacrifice cost, burn stacks, phoenix transformation, or resurrection.

### 15. Boreas — Winter at the Open Door

**Binding:** `fengyi` · `weaken_burst` · Mage · platform · he/him

**Myth anchor:** Boreas personifies the north wind. [Source: Boreas](https://www.theoi.com/Titan/AnemosBoreas.html).

**Card:** Blasts a cluster and increases the damage it takes.

**Biography:** Boreas arrives through the smallest gap in the barricade and complains about the workmanship. Then he turns outward. He knows every loose fastening in the enemy line, every raised shield that leaves a seam beneath it. The defenders learn to strike where the cold has already entered.

**Basic — Sleet Through the Gap:** A compact gust hits the target and splashes nearby enemies.

**Trait — Air Finds a Way:** Uses the Mage trait.

**Ultimate — Wind Finds the Weakness**

- Flavor: “No shield is fitted closely enough for winter.”
- Rules: Deal 100% U to eligible enemies within 72 px of the target and expose them for 4 seconds.

**Awakening — A Wider Weather:** Blast radius becomes 110 px.

**Dialogue:** Recruit: “You have left a gap.” · Ultimate: “Feel where it opens.” · Defeat: “Close the door behind me.”

## Archers

### 16. Skadi — Hunter Above the Pass

**Binding:** `diana` · `moon_barrage` · Archer · platform · she/her

**Myth anchor:** Skadi is associated with mountains, skiing, and hunting. [Source: Prose Edda](https://www.gutenberg.org/files/18947/18947-h/18947-h.htm).

**Card:** Fires a volley and strengthens nearby allies' attacks.

**Biography:** Skadi climbs above the crossing before anyone has decided who should command it. From there, she sees the weak stretch in the march and the defenders with a clear shot at it. Her first arrow makes the invitation. The next two make the argument difficult to refuse.

**Basic — Ridge-Line Arrow:** Skadi fires one deliberate shot.

**Trait — The High Ground Watches:** Uses the Archer trait.

**Ultimate — Follow My Arrow**

- Flavor: “The first shot shows the opening. The line answers.”
- Rules: Fire up to 3 shots at 55% U each, distributing them across the target and eligible enemies in the forward cone. With fewer targets, shots can repeat; shots assigned to dead targets are skipped. Give allies within range +25% attack for 5 seconds.

**Awakening — The Whole Ridge Answers:** Fire up to 5 shots; the attack buff lasts 8 seconds.

**Dialogue:** Recruit: “I can see the whole approach.” · Ultimate: “There. Follow it.” · Defeat: “Take the higher path.”

### 17. Atalanta — First Through the Brambles

**Binding:** `artemis` · `piercing_shot` · Archer · platform · she/her

**Myth anchor:** Atalanta is a renowned huntress associated with the Calydonian boar hunt and a footrace. [Source: Atalanta](https://www.theoi.com/Heroine/Atalanta.html).

**Card:** Sends one shot through a long line of enemies.

**Biography:** Atalanta reaches the crossing ahead of the scouts and immediately asks where the next runner is needed. When the road closes behind the refugees, she takes up her bow. She studies the press of bodies until a narrow line appears through it. That is all the space she requires.

**Basic — The Clear Shot:** Atalanta fires a single aimed arrow.

**Trait — An Eye for the Opening:** Uses the Archer trait. Ordinary shots do not pierce multiple enemies.

**Ultimate — A Path Through the Pack**

- Flavor: “One narrow opening is enough for the whole arrow.”
- Rules: Shoot along the line through the target, hitting eligible enemies within 18 px of that line for 55% U each, out to 1.5× range.

**Awakening — Clear to the Far Side:** Damage becomes 90% U per enemy and reach becomes 2× hero range.

**Dialogue:** Recruit: “Show me the narrow way.” · Ultimate: “One opening.” · Defeat: “Keep moving.”

### 18. Stheno — Stillness at the Threshold

**Binding:** `medusa` · `petrify_shot` · Archer · platform · she/her

**Myth anchor:** Stheno is one of the immortal Gorgon sisters; Gorgon traditions include a petrifying gaze. [Source: Gorgons](https://www.theoi.com/Pontios/Gorgones.html).

**Card:** Stops several advancing enemies with a petrifying gaze.

**Biography:** Stheno chooses a post facing away from the refugees. They learn to announce themselves before approaching and to trust the stillness beyond her parapet. She has spent enough years being someone's warning. At the crossing, she decides who receives it.

**Basic — Arrow from the Parapet:** Stheno fires one bow shot.

**Trait — Nothing Crosses Unseen:** Uses the Archer trait.

**Ultimate — Hold That Last Step**

- Flavor: “The next footfall never reaches the ground.”
- Rules: Hit up to 3 distinct eligible enemies within range and the facing cone for 55% U each, prioritizing those furthest along the path. Petrify survivors for 3 seconds, preventing movement and attacks. Keep the ultimate ready if no valid target is faced. A repeat gaze refreshes its duration; bosses and flyers are eligible.

**Awakening — A Longer Stillness:** Affect up to 5 enemies and petrify them for 4 seconds.

**Dialogue:** Recruit: “Stand behind me when you speak.” · Ultimate: “Stay.” · Defeat: “Look toward the road.”

**Adaptation note:** Her bow, defensive duty, and selective battlefield gaze are original game choices.

## Supports

### 19. Plutus — Keeper of the Common Store

**Binding:** `caishen` · `fortune_shower` · Support · platform · he/him

**Myth anchor:** Plutus represents wealth and agricultural abundance. [Source: Plutus](https://www.theoi.com/Georgikos/Ploutos.html).

**Card:** Heals the defense and strengthens its next attacks.

**Biography:** Plutus weighs the refuge's wealth in meals remaining and bandages ready. He opens the store before anyone thinks to lock it. At the crossing, a full chest has little value unless its contents reach the hands that need them. He intends to finish the watch with empty shelves and living neighbors.

**Basic — A Portion Set Aside:** Restore the most injured ally in range; if nobody needs healing, cast a small magical token at an enemy.

**Trait — The Store Is Open:** Uses the Support trait.

**Ultimate — Enough for Everyone**

- Flavor: “Every outstretched hand finds something useful.”
- Rules: Heal allies within range for the current support-healing fraction, initially 18% maximum health, and grant +25% attack for 5 seconds.

**Awakening — Something Left to Give:** The attack buff lasts 8 seconds. Each cast also grants 15 gold.

**Dialogue:** Recruit: “What do you need first?” · Ultimate: “There is enough.” · Defeat: “The keys are yours.”

### 20. Harmonia — The Meeting of Many Hands

**Binding:** `yuelao` · `fate_link` · Support · platform · she/her

**Myth anchor:** Harmonia personifies harmony and concord. [Source: Harmonia](https://www.theoi.com/Ouranios/Harmonia.html).

**Card:** Heals allies and helps their ultimates become ready sooner.

**Biography:** Harmonia listens to the defenders argue until she hears what each is afraid of losing. She gives them a task they can complete together. By the next assault, their breathing has found a common rhythm. The crossing holds for another minute, assembled from a hundred small agreements.

**Basic — Set the Breath:** Restore the most injured ally in range; if nobody needs healing, send a small pulse at an enemy.

**Trait — A Place in the Chorus:** Uses the Support trait.

**Ultimate — Together, Once More**

- Flavor: “The scattered line finds the strength to answer as one.”
- Rules: Heal allies within range for the current support-healing fraction, initially 18% maximum health, and add 30% of a full ultimate charge to their meters, capped at full.

**Awakening — Ready on the Same Breath:** Add 60% ultimate charge instead of 30%.

**Dialogue:** Recruit: “Tell me what you can carry.” · Ultimate: “Breathe. Again. Together.” · Defeat: “Keep listening to each other.”

### 21. Asclepius — Physician of the Last Watch

**Binding:** `freya` · `valkyrie_call` · Support · platform · he/him

**Myth anchor:** Asclepius is associated with medicine; myths describe him restoring the dead to life. [Source: Asclepius](https://www.theoi.com/Ouranios/Asklepios.html).

**Card:** Returns an eligible fallen defender to the field, or heals nearby allies.

**Biography:** Asclepius establishes his treatment bench where the retreating wounded can still hear the defenders. He asks for clean water, steady hands, and someone to remember each patient's name. When the watch falls silent around one empty post, he checks whether its keeper has truly finished their work.

**Basic — Steady Hands:** Restore the most injured ally in range; if nobody needs healing, send a small staff-borne pulse at an enemy.

**Trait — The Physician Stays:** Uses the Support trait.

**Ultimate — There Is Still a Pulse**

- Flavor: “One more breath becomes one more chance to stand.”
- Rules: Revive the most recently fallen eligible hero on its original free ring at level 1 with 50% health. The hero must not already be deployed, and the team must have room. If nobody is eligible, heal allies within range for the current support-healing fraction, initially 18% maximum health.

**Awakening — Back on Your Feet:** Revived heroes return with full health. Their level still resets to 1.

**Dialogue:** Recruit: “Water first. Then tell me who fell.” · Ultimate: “Stay with us.” · Defeat: “Someone else must take my hands.”

## Related hero text outside the cards

These substitutions cover the hero names embedded in the existing blessing system. Internal virtue keys and effects stay unchanged. The labels are written for the new setting and do not require the virtues to become mythology claims.

| Internal virtue | New blessing label | Effect copy at current base tuning |
|---|---|---|
| `Wildness` | Odin's Hard-Won Counsel | All heroes gain 15% attack. |
| `Desire` | Atalanta's Clear Opening | All heroes gain 10% attack. |
| `Resolve` | Skadi's Steady Aim | All heroes gain 5% attack. |
| `Oblivion` | Atlas's Shared Burden | All heroes gain 30% armor and magic resistance. |
| `Humility` | Vidar's Patient Guard | All heroes gain 5% armor and magic resistance. |
| `Defiance` | Fenrir's Unbroken Stride | All heroes gain 15% maximum health. |
| `Sacrifice` | Aegir's Open Hall | All heroes gain 10% maximum health. |
| `Mercy` | Asclepius's Second Chance | All heroes gain 5% maximum health. |
| `Grace` | Plutus's Ready Supplies | Support healing is 15% stronger. |
| `Fervor` | Helios's Early Start | Ultimates charge 10% faster. |
| `Insight` | Hecate's Unseen Opening | All heroes gain 10 percentage points of critical chance. |
| `Gnosis` | Nott's Sheltering Dark | Heroes gain an 8% chance to dodge incoming hits. |

| Internal pair | New pair name | New pair description |
|---|---|---|
| `Wildness` + `Desire` | The Road Foreseen | Odin and Atalanta: all heroes gain 5% attack. |
| `Oblivion` + `Defiance` | Weight and Will | Atlas and Fenrir: all heroes gain 5% maximum health. |
| `Grace` + `Fervor` | Ready Before Dawn | Plutus and Helios: ultimates charge 10% faster. |
| `Insight` + `Gnosis` | Keepers of the Unlit Way | Hecate and Nott: all heroes gain 5 percentage points of critical chance. |

**Reusable interface strings:**

- Recruit preview: `{name} — {class} · {cost} gold`
- Skill heading: `Ultimate: {ultimateName}`
- Trait heading: `Trait: {traitName}`
- Awakening heading: `Awakening: {awakeningName}`
- Awakening notice: `{name} has awakened.`
- Upgrade notice: `{name} reached level {level}.`
- Recovery notice: `{healerName} returned {heroName} to the watch.`
- Synergy detail: `{name} shares {count} bonds with nearby allies.`
- Support aura: `Allies inside {name}'s range gain {percent}% attack.`
- Empty support aura: `Bring an ally inside {name}'s range to receive the attack bonus.`
- Mage class summary: `Magic attacks strike groups. Odin's basic spell jumps between enemies; other Mages splash around their target.`

All names in battle notices, results, glossary entries, recruitment previews, accessibility labels, saved-run displays, and tutorials should resolve through the new display-name map. Use blank alt text for decorative repeated portraits; when an image is the only identity cue, use `{name}, {title}`. This supplies naming copy for later assets without specifying or creating images.

Greek and Norse are **background metadata**, not new gameplay factions. Keep class labels and existing balance fields. Do not import the original game's biographies, relic descriptions, skill quotations, promotional slogans, faction branding, or progression titles into these profiles. The TD kit needs one basic action, one shared class trait, one ultimate, and an awakening upgrade; four source-game skills or a relic entry would describe systems this minigame does not have.

Existing synergy memberships stay internal to preserve balance. If tag labels become visible, describe them as bond categories, not promises of extra abilities: the membership data does not necessarily match the implemented combat kit.

## Implementation notes for a later text pass

1. Create a TD-owned content map keyed by the 21 existing IDs. Read display names, biographies, titles, basic-action names, trait names, skill names, and awakening text from that map. Preserve the original database files.
2. Route hero name and skill-name consumers through the new map, including the unit records used by notices and results. Replace gendered skill text where the identity changes; prefer names or neutral phrasing.
3. Apply the blessing and pair labels above. Update the Mage class exception from Zeus to Odin. Search TD pages, glossary content, audio captions, and accessibility strings for remaining old display names.
4. Keep numerical descriptions tied to runtime values. Source code takes precedence over old prose. In particular: Surtr heals from raw ultimate strength; Hecate's low-health splash is 180% U, not 70% × 1.8; Atalanta's awakened reach is 2× hero range, not twice her previous ultimate reach; support healing and aura strength can be modified.
5. Keep images, animation, effects, and recorded voice replacement as a separate asset pass. Text replacement alone does not complete the wider white-label migration. Boss identities and their copy need their own roster treatment.

No additional mechanics are proposed in this pack. A spell's name or fictional description does not imply a damage-over-time effect, shield, teleport movement, channel, summon, or targeting rule absent from its rules text.

## Editorial checks

- 21 unique internal IDs, matching the current TD roster; all include an ultimate and awakening.
- Greek/Norse scope retained from the plan; each entry has an explicit myth anchor and source.
- All biographies and dialogue belong to the invented crossing setting. They are not translations or quotations from the linked sources.
- Source links support mythological foundations only. The combat abilities, alliance, motivations, and titles are original adaptations.
- Current mechanics are the basis for skill text, including class effects; the obsolete proposal kits are not treated as implemented.
- Images deferred. No game code, hero JSON, balance data, or original plan is changed by this document.

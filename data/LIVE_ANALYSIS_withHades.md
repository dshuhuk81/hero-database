# Heket with Hades — complete live battle analysis and hero guide

Date: 2026-08-12  
Client: global `com.goatgames.mot.gb.gp`  
Identity: Heket, hero `3012`, skin `301201`, runtime `H_HaiKuiTe`  
Frog identity: `H_HaiKuiTe_Frog`  
Changed ally: Hades, runtime `H_HaDiSi`  
Capture: one 29.815-second fight, 253 runtime events

## Result

Heket is a summon-specialist Support whose real resource is **live frog count**.
She builds and refreshes a frontline of durable frogs; each living frog raises
the ATK and periodic healing of Heket and every eligible friendly summon. The
frogs also absorb attacks, synchronize area croaks that lower Hit Rate, receive
summon shields, and can be sacrificed to prevent Heket's death.

The Hades substitution creates a useful but mostly **one-way synergy**. Hades is
a deity/Warrior, not a summon, so Heket's summon selector does not directly give
normal Hades Symbiotic Blessing's ATK, healing, or the shared summon shield.
Hades, however, gains souls whenever units die: one soul for a summon and three
for a deity. Heket continually supplies expendable frogs through enemy kills,
cap replacement, and Toad Pact sacrifice. Those deaths can accelerate Hades's
soul economy, increasing Soul Storm damage and, at the equipped tiers described
in the database/Lua, his self-sustain. This capture watches Heket rather than
Hades, so the soul receipts and Hades's damage are an implementation-supported
interaction, not measured Hades output.

The automatic total includes only Heket herself: **402,463,146** across seven
physical calculator events. Frog callbacks add **278,755,874** across eight
landed croak target hits, giving a minimum Heket ecosystem total of
**681,219,020**. Frogs supplied 40.92% of that observed total—materially more
than their 25.92% share in the longer reference run, although the fights are
not duration-, roster-, or state-matched benchmarks.

Toad Pact again activated conclusively. At 18.090 seconds, an incoming Diana
calculator hit of **5,602,341,893** reached Heket; the `canDead` callback changed
Toad Pact from ready to its full 30-second cooldown and frog count fell from
three to two. A frog was sacrificed and Heket survived that lethal check.

## Battle round-up

| Metric | Observed result |
|---|---:|
| Battle duration covered | 29.815 s |
| Runtime events | 253 |
| Heket direct physical events | 7 |
| Heket direct damage | 402,463,146 |
| Landed frog croak target hits | 8 |
| Frog croak damage | 278,755,874 |
| **Minimum Heket ecosystem damage** | **681,219,020** |
| Frog croak skill starts | 3 |
| Heket active summon starts (`skill3`) | 1 |
| Generic `skill2` lifecycle | 1; not a death save |
| Toad Pact activations | 1 confirmed |
| Lethal incoming hit intercepted | 5,602,341,893 |
| Frog feature instances constructed | 6 |
| Configured simultaneous frog cap | 3 |
| Friendly-summon creation callbacks | 16 |
| True Damage events | 0 |

### Damage composition

| Source | Events | Damage | Share |
|---|---:|---:|---:|
| Heket | 7 | 402,463,146 | 59.08% |
| Frogs | 8 | 278,755,874 | 40.92% |
| **Captured minimum** | **15** | **681,219,020** | **100%** |

All seven direct Heket attacks hit Prometheus. Frog croaks hit both Prometheus
and Diana:

| Frog target | Hits | Damage | Frog share |
|---|---:|---:|---:|
| Diana (`H_MDTianCheng`) | 3 | 159,316,029 | 57.15% |
| Prometheus (`H_PuLuoMiXiuSi`) | 5 | 119,439,845 | 42.85% |

Heket's direct level coefficient remained `687 / 1024`, or approximately
67.09%, on every outgoing calculator call. Diana's hit into Heket used
`1392 / 1024`, or approximately 135.94%. This was therefore a strongly
level-suppressed test for Heket, not an equal-level damage benchmark. Frog
calculator calls were outside the hook, so no frog coefficient is available.

## Fight sequence

- **0 s:** Heket initializes with a three-frog cap, Toad Pact ready, and
  Symbiotic Blessing parameters of `409/1024` ATK and `307/1024` healing per
  frog on a `2048/1024`-second interval.
- **1.943 s:** Heket's first recorded attack hits Prometheus for 31,362,578
  while the sampled frog count is zero.
- **4.422 s:** the first identifiable frog feature is constructed. Heket's
  sampled frog count becomes one by 6.097 seconds.
- **6.432–11.926 s:** Heket lands three 59,814,476 attacks while one frog is
  recorded. The first natural frog croak starts at 9.916 seconds.
- **10.385–10.452 s:** Heket's generic `skill2` animation lifecycle occurs.
  Toad Pact remains ready; without a `canDead` callback this is not a relic
  activation.
- **10.519 s:** the first croak lands on Prometheus for 7,925,657 and Diana for
  15,381,919.
- **15.075 s:** a second frog feature is constructed. Three friendly-summon
  creation callbacks occur together at 15.477 seconds, but the logger omits
  their identities; they must not be assigned to Hades or to frogs by guess.
- **16.750–17.018 s:** the sampled frog count is two and Heket's attack rises to
  85,110,872, consistent with the per-frog ATK engine being stronger at higher
  frog count, though enemy state and other buffs prevent a clean isolation.
- **17.487 s:** Heket starts her active summon skill and two frog feature
  instances are created immediately; another appears at 17.889 seconds as cap
  maintenance/replacement continues. The sampled count reaches three.
- **18.090 s:** Diana calculates 5,602,341,893 into Heket. Toad Pact changes
  from `cdTime:0` to `cdTime:30720`, sacrifices the lowest-HP frog, adds its
  shield, and vetoes Heket's death. The same enemy attack also records two frog
  victims for 2,801,170,911 each; this is heavy area pressure on the board.
- **18.492–22.445 s:** Prometheus continues damaging frog instances. By 20.502
  seconds Heket's sampled frog count is two and Toad Pact is cooling down.
- **22.914–23.718 s:** a frog initiates a croak and synchronized resolution
  produces three target hits: two Prometheus hits and one Diana hit, totaling
  127,724,149.
- **25.594–26.331 s:** another natural croak produces three same-timestamp frog
  resolutions, again totaling 127,724,149. This is the clearest synchronized
  croak evidence in the run.
- **27.805 s:** another frog feature is constructed; by 29.748 seconds the
  sampled count is back to three.
- **29.815 s:** the final captured friendly-summon callback occurs. The log ends
  before Toad Pact can come off cooldown.

## What the kit does

### Croaking Calamity — frog creation and protection stock

The displayed ultimate creates a frog inheriting part of Heket's ATK and a
large part of her Max HP. Its cast has no immediate damage event. Its value is
the body it adds to five later systems:

1. frontline occupancy and target diversion;
2. another synchronized croak source;
3. another Symbiotic Blessing stack;
4. another recipient of summon shields and healing;
5. another life Toad Pact can trade for Heket's survival.

The generic logger does not expose a distinct Heket `skill1` model. Six frog
feature constructions are directly observed, but only those aligned to a
known summon cast can safely be assigned to that cast. At cap, new creation
does not simply fail: Heket's Lua selects the lowest-current-HP existing frog,
force-kills it, and retains the newly created one. This is refresh and death
generation as well as summoning.

For Hades, that replacement behavior is relevant. Each forced frog death is a
summon death and therefore qualifies for one soul under Hades's implementation.
The report cannot count credited souls because Hades callbacks were not hooked,
and simultaneous enemy damage makes cause-of-death attribution incomplete.

### Ten Thousand Toads — summon engine and shared shield

The live `H_HaiKuiTe_skill3_Model` exposes `maxCount=3`. It marks Heket with
`MarkAsSummoner`, allowing her to remain a normal deity for victory/revival
rules while qualifying for summon-directed effects. Its global creation
listener broadcasts every allied summon creation to Heket's feature network,
but only a summon whose master equals Heket is counted as her frog and subjected
to the three-frog replacement rule.

One active lifecycle starts at 17.487 and ends at 19.765 seconds. It constructs
two frog features immediately, followed by another feature at 17.889 as the
board is reconciled. Because the fight ends at 29.815 seconds, there is no room
to observe a second roughly 18-second cycle.

The active grants a shield to **all friendly summons**, not only frogs. Heket
herself qualifies due to `MarkAsSummoner`; summons belonging to other allied
heroes qualify through `findPlayerByFriendSummon`. Normal-form Hades does not.
Neither Hades's database description nor his extracted implementation marks him
as a summon, and his Underworld Divinity is explicitly still a deity created by
an in-place revive. Therefore the Hades swap does not add a direct shield target.

The manifest's external description says the equipped shield is 400% ATK at
the represented skill tier, while the extracted Lua comments describe a
different revision. No shield-value event was logged, so the safe conclusion is
eligibility and behavior, not a measured coefficient.

### Frog croak network — AoE and stacking Hit Rate suppression

Each `H_HaiKuiTe_Frog_skill1_Model` implements the active croak. On a natural
`skillStart`, it iterates over the other living frogs and force-orders their
croak skill. Forced croaks do not call `skillStart` recursively, preventing an
infinite chain.

Three natural starts produced eight target-hit callbacks totaling 278,755,874.
A target hit is not the same as a casting frog: one area croak can hit both
enemies, synchronized frogs can resolve together, and a frog can die before its
animation lands.

| Time cluster | Target hits | Damage | Interpretation |
|---|---:|---:|---|
| 10.519 s | 2 | 23,307,576 | one early frog hits two enemies |
| 23.651–23.718 s | 3 | 127,724,149 | synchronized multi-frog resolution |
| 26.331 s | 3 | 127,724,149 | synchronized multi-frog resolution |

Croaks affect enemies within three meters, deal physical damage, reduce Hit
Rate for five seconds, and can stack that debuff up to five times. This is soft
control rather than stun. It rewards close enemy clustering and dodge-based
allies. Hades gains 30% Dodge during Soul Storm, so overlapping Heket croaks can
make that temporary dodge window more reliable against ordinary hit-checked
attacks. It does nothing against guaranteed-hit or unavoidable damage.

Frogs do not basic attack. Their jobs are movement toward the nearest enemy,
HP storage, proximity debuffing, body blocking, and sacrificial death. Their
40.92% observed ecosystem damage share in this short fight is valuable, but it
does not change that support/attrition purpose.

### Symbiotic Blessing — the per-frog scaling engine

The live `H_HaiKuiTe_skill0_Model` exposes:

- ATK buff ID `30124103`;
- `atkRate=409 / 1024` = **39.94% ATK per live frog**;
- `cureRate=307 / 1024` = **29.98% of Heket's current ATK per live frog**;
- interval `2048 / 1024` = **2 seconds**.

When Heket's own frog count changes, the model recalculates a single dynamic
buff on Heket and all friendly summons. At the three-frog cap:

- ATK: `3 × 39.94%` = approximately **119.82% additional ATK**;
- periodic healing basis: `3 × 29.98%` = approximately **89.94% of Heket's
  current ATK every two seconds**.

The direct Heket power field rose from 192,074,052 at sampled count zero, to
251,096,056 at one frog, and 310,118,060 at two frogs. That sequence is strong
live evidence of frog-count scaling. Later power values are not monotonic
because buffs, target state, and the death-save sequence also change.

Hades does **not** receive this ATK or heal in normal form. Underworld Divinity
also remains the same deity player after an auto-revive; it is not constructed
as an `EPlayerType.Summoner`. The cross-hero value therefore runs through frog
deaths feeding Hades souls and croaks helping his temporary Dodge—not through
direct Symbiotic Blessing stats.

No cure amounts or recipients are serialized. Rates, cadence, and selectors
are implementation/runtime evidence; effective healing after missing-HP caps,
anti-heal, and healing modifiers is unavailable.

### Toad Pact — frog-for-life exchange

The live `H_HaiKuiTe_skill2_Model` exposes shield buff `30123104` and cooldown
`30720 / 1024` = **30 seconds**. On a lethal check it:

1. refuses to trigger if cooling down;
2. requires at least one living Heket frog;
3. selects the frog with the lowest current HP;
4. adds the emergency shield to Heket;
5. force-kills that frog;
6. returns `false` from `canDead`, vetoing Heket's death.

All six steps relevant to activation are consistent with the 18.090-second
trace: count three before the hit, cooldown zero on entry and 30,720 on exit,
count two at the next sample, and Heket continues acting. The exact absorbed
shield amount and Heket's pre-hit HP are not logged.

The sacrificed frog is also a potential one-soul event for Hades. This makes
the pairing tactically coherent under pressure: Heket converts a frog into her
own survival, while Hades can convert that unit death into future Soul Storm
scaling. It is not free value—Heket temporarily loses one ATK/heal stack and one
croak body—so rapid frog reconstruction remains essential.

## The four required guide questions

### 1. Who enabled Heket most?

The strongest **measured** enabler was Heket's own frog board. It supplied up
to approximately +119.82% ATK, up to an 89.94%-ATK healing basis every two
seconds, synchronized debuffs, frontline bodies, and the life exchanged against
Diana's 5.602B lethal check.

Hades cannot be ranked as Heket's direct enabler from this capture. His own
events were not hooked, and his documented kit is self-oriented: soul-based
damage, self-shield, self-heal, temporary Dodge, a pull/root, and Underworld
Divinity. It contains no team heal, team shield, energy grant, or direct Heket
amplifier. His root/pull can theoretically bring a distant target into frog
croak range, but positions and control applications were not logged.

The 16 allied-summon creation callbacks do not identify masters. Six coincide
with identifiable frog feature constructions; the remaining callbacks prove
other allied summon traffic but cannot be assigned hero-by-hero. In particular,
they are not evidence that Hades summoned units: his Lua uses soul projectiles
and an in-place revive, not the summoner manager.

### 2. What did Heket give teammates?

- **Heket's frogs and other friendly summons:** per-frog ATK, per-frog periodic
  healing, and the active shared summon shield.
- **Hades:** no direct summon-only ATK/heal/shield. He can gain souls from frog
  deaths; croak Hit Rate reduction can complement his Soul Storm Dodge; and his
  melee dive benefits from frogs occupying the same dense enemy area.
- **Dodge-based teammates:** indirect survival from stacked enemy Hit Rate loss.
- **The whole team:** targeting relief, collision/frontline occupancy, and
  enemy pressure supplied by disposable frog bodies.
- **Ordinary non-summon deities:** no direct Symbiotic Blessing recipient status
  is established; they receive only the indirect benefits above.

Actual buff, heal, shield, soul, and target identities were not serialized, so
this report does not invent teammate-level quantities.

### 3. What dealt the most damage, and how should it be amplified?

Heket's ordinary direct path was largest at **402.463M (59.08%)**. The unique
kit damage was the frog croak network at **278.756M (40.92%)**. Direct attacks
were single-target into Prometheus; croaks reached two enemies and therefore
scaled with density.

The best amplification levers are:

1. keep three frogs alive for maximum inherited board presence and synchronized
   casts;
2. increase Heket's ATK, which feeds her support formulas and frog inheritance;
3. group enemies inside the three-meter croak radius—Hades's farthest-target
   pull can assist if it resolves near the frog/Hades contact zone;
4. apply physical-defense reduction or physical vulnerability;
5. protect frogs until synchronized animations resolve;
6. rebuild promptly after Toad Pact or area damage consumes a frog.

Do not compare the 681.219M minimum directly with settlement damage. Hades and
other allies are absent, frog calculator calls are absent, and no settlement
screen was captured. The `687/1024` suppression also makes this unsuitable for
raw cross-fight DPS ranking.

### 4. What is Heket's support specialty and ideal use case?

Heket is a **summon-board amplifier and attrition support**. Her best encounter
is a prolonged, clustered fight with summon-producing allies, where repeated
healing, summon shields, accuracy suppression, replacements, and disposable
bodies compound.

Hades is a complementary partner, not her ideal direct beneficiary. He likes
the death stream and can use his pull and Dodge window alongside the frog
frontline, but he does not multiply the direct summon-only package. If choosing
solely to maximize Heket, a true allied summoner extracts more of her ATK,
healing, and shielding. If choosing a broader death-engine formation, Hades
turns the unavoidable loss/replacement of frogs into offensive soul value.

Heket does not provide cleanse, broad energy restoration, CC immunity, or a
general full-team heal. She is weak when area damage erases all frogs, enemies
ignore hit checks, healing is blocked, or the battle ends before the board
stabilizes.

## Purpose, positioning, and resource economy

Heket should remain behind the frog/Hades contact line. Frogs seek the nearest
enemy; Hades leaps toward dense enemy areas. That can concentrate both heroes'
AoE value, but it also exposes frogs to the same hostile area damage. The
18.090-second Diana event demonstrates the risk: Heket needed Toad Pact while
two frog instances simultaneously recorded enormous incoming damage.

Her three coupled resources are:

1. **frog count** — ATK/healing multiplier, croak concurrency, body count, and
   death-prevention stock;
2. **frog HP** — determines which body cap replacement and Toad Pact consume;
3. **Toad Pact cooldown** — determines whether a frog can become another life.

With Hades, frog deaths form a fourth team-level resource: **souls**. A summon
death is worth one soul, a deity death three, up to Hades's configured cap.
Hades's database describes a 25-soul current version while the extracted Lua
comments describe an earlier 20-soul revision; live Hades parameters were not
captured, so this report does not choose an unobserved cap.

## Synergies, builds, and counters

### Hades pairing verdict

The pairing has three positive links:

- frog deaths can feed Hades one soul each;
- Hades's root/pull can compress enemy positioning for three-meter croaks;
- croak Hit Rate reduction complements Hades's 30% Soul Storm Dodge.

It also has clear limitations:

- Hades is not a summon and receives none of Heket's direct summon package;
- both want to operate near clustered enemies and can be punished by the same
  area burst;
- Toad Pact and cap refresh generate Hades value only by temporarily reducing
  Heket's own frog engine;
- Hades's observed benefit cannot be quantified without his callbacks or the
  settlement screen.

### Strong partner archetypes

- **True summoners:** their units receive Heket's ATK/heal/shield package.
- **Death-payoff heroes such as Hades:** turn frog churn into another resource.
- **Dodge tanks/divers:** exploit enemy Hit Rate reduction.
- **Controllers/groupers:** keep enemies in croak range.
- **Energy/cooldown supports:** accelerate board reconstruction.
- **Universal healers and damage reducers:** cover ordinary deities and Toad
  Pact downtime, which Heket's summon-only sustain does not.

### Build priorities

1. enough durability to avoid spending Toad Pact immediately;
2. energy generation and applicable cooldown haste for frog uptime;
3. ATK, because healing, shield formulas, personal attacks, and frog inheritance
   all refer to it;
4. healing effectiveness where it modifies `cureExt`;
5. defensive stats for long attrition windows.

Pure personal damage remains secondary. Maintaining three frogs multiplies
value across every eligible summon and also creates future Hades soul stock.

### Counters and failure modes

- area burst can remove several frogs and collapse multiple systems at once;
- anti-heal suppresses the two-second sustain loop;
- must-hit/unavoidable damage bypasses croak accuracy pressure;
- a second lethal attack during the 30-second Toad Pact cooldown kills Heket if
  no other protection intervenes;
- silence or hard control can delay summon reconstruction and natural croaks;
- spread formations deny multi-target croaks and reduce Hades pull/dive value;
- summon execution/banishment attacks Heket's resource directly;
- low-death encounters slow Hades's side of the pairing;
- non-summon rosters waste much of Heket's direct support budget.

## Investment meaning

Heket's important breakpoints are mechanical:

- frog-creation upgrades improve inherited ATK/HP and therefore body quality;
- Ten Thousand Toads upgrades increase the summon shield and eventually the
  number of frogs created per cast;
- Primordial Molt improves opening count/cap or relevant cadence, depending on
  tier/revision;
- Symbiotic Blessing upgrades raise per-frog ATK and healing—the live values in
  this fight are the authoritative `409` and `307` fixed-point parameters;
- Toad Pact upgrades raise the post-sacrifice shield, while the 30-second
  trigger behavior is directly proven here.

For the Hades pairing, higher frog creation and durability have competing but
manageable effects: durable frogs preserve Heket's maximum board, while
replacement/death cadence feeds Hades. Do not intentionally throw away a full
frog board merely to farm souls unless Hades's resulting breakpoint outweighs
the lost Heket stacks and protection stock.

## Evidence boundaries and settlement coverage

- Heket's seven calculator events total 402,463,146 directly.
- Eight frog target-hit callbacks total 278,755,874 directly.
- The combined 681,219,020 is a minimum ecosystem total, not settlement total.
- One Toad Pact activation and the 5,602,341,893 triggering Diana calculation
  are directly observed.
- The three-frog cap, 39.94% ATK rate, 29.98% healing rate, two-second interval,
  and 30-second relic cooldown are live runtime parameters.
- Six frog feature constructions are identifiable. They are lifetime instances,
  not simultaneous frogs; the cap is three and replacements create new ones.
- Sixteen friendly-summon creation callbacks include every allied summoner
  event seen by Heket's global listener. They do not identify master or unit.
- Hades's presence comes from the stated lineup change. His mechanics come from
  `all_heroes_db.json` and extracted `H_HaDiSi` Lua, but his soul gain, damage,
  healing, shielding, control, death, and transformation were not logged.
- No actual cure amount, shield value, buff recipient, energy change, HP bar,
  position, crowd-control application, summon master ID, or settlement result
  was captured.
- The event log ends at 29.815 seconds; it does not prove the fight itself ended
  at exactly that timestamp, only that captured activity did.
- Heket's outgoing damage is level-suppressed and roster/state differences make
  comparisons with the earlier Heket fights descriptive, not causal.

The decisive conclusion from the Hades variant is therefore narrower and more
useful than “Hades is a summon partner.” He is not. Heket directly powers her
frogs and other real summons; Hades harvests the deaths those frogs inevitably
produce and can help keep enemies inside their accuracy-reducing AoE. The run
still proves Heket's complete core loop—three-frog scaling, synchronized croaks,
lowest-HP replacement, two-second summon sustain, and frog-for-life protection—
while the swapped ally adds a credible death-economy layer rather than a direct
summon-buff beneficiary.

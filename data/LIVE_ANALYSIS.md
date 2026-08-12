# Heket — complete live battle analysis and hero guide

Date: 2026-08-12  
Client: global `com.goatgames.mot.gb.gp`  
Identity: Heket, hero `3012`, skin `301201`, runtime `H_HaiKuiTe`  
Frog identity: `H_HaiKuiTe_Frog`  
Capture: one 48.910-second fight, 465 runtime events

## Result

Heket is a summon-specialist Support whose real resource is **live frog count**.
She builds and refreshes a small frontline of very durable frogs, and every
frog simultaneously increases the offensive and restorative value of her
entire summon ecosystem. Her frogs absorb enemy attacks, synchronize area
croaks that lower Hit Rate, receive and distribute summon-focused shields, and
can be sacrificed to prevent Heket's death.

She is not primarily a healer for ordinary deity teammates. Her specialty is
supporting **friendly summons**, including herself because her live skill marks
Heket as both a deity and a summon. At the captured skill tier, each live frog
provided approximately **40% ATK** to Heket and all friendly summons. Every two
seconds, each frog also contributed a heal equal to approximately **30% of
Heket's current ATK** to Heket and every friendly summon. With three frogs,
that means approximately **+120% ATK** and a periodic heal based on **90% of
Heket's current ATK** for every eligible summon.

The automatic report counted only Heket's own calculator output:
**840,717,422** from 13 physical events. Frog callbacks add another directly
observed **294,228,504** across 10 landed croaks, producing a minimum captured
Heket ecosystem total of **1,134,945,926**. Damage is secondary to her utility,
but the distinction matters because summon damage was excluded by the original
runtime-identity filter.

Most importantly, the fight directly caught Toad Pact saving Heket from a
**5,310,802,185** incoming Diana hit at 17.219 seconds. The live `canDead`
callback changed Toad Pact from ready to its full 30-second cooldown, proving
that a frog was available and the lethal-damage replacement activated.

## Battle round-up

| Metric | Observed result |
|---|---:|
| Battle duration covered | 48.910 s |
| Heket direct physical events | 13 |
| Heket direct damage | 840,717,422 |
| Landed frog croaks | 10 |
| Frog croak damage | 294,228,504 |
| Minimum ecosystem damage | 1,134,945,926 |
| Frog croak skill starts | 6 |
| Heket summon-skill starts (`skill3`) | 2 |
| Toad Pact activation | 1 confirmed |
| Lethal incoming hit intercepted | 5,310,802,185 |
| Frog feature instances constructed | 10 |
| Configured simultaneous frog cap | 3 |
| Friendly-summon creation callbacks | 39 |
| True Damage events | 0 |

### Damage composition

| Source | Events | Damage | Share |
|---|---:|---:|---:|
| Heket | 13 | 840,717,422 | 74.08% |
| Frogs | 10 | 294,228,504 | 25.92% |
| **Captured minimum** | **23** | **1,134,945,926** | **100%** |

Every captured outgoing hit targeted Prometheus. Heket's own level coefficient
was `687 / 1024`, or approximately 67.1%; she was dealing level-suppressed
damage, but less severely than Bastet and Eris in the earlier tests. The frog
calculator calls were not captured, so their coefficients cannot be stated.

## Fight sequence

- **0 s:** Heket initializes with a three-frog cap, Toad Pact ready, and
  Symbiotic Blessing configured at roughly 40% ATK and 30% healing per frog.
- **4.422 s:** first captured frog feature is constructed.
- **9.983 s:** a frog initiates the first recorded croak sequence.
- **10.586 s:** one frog croak lands for 7,925,657.
- **11.591 s:** a frog receives a lethal check and later summon creation
  callbacks show the board continuing to refresh.
- **15.075 s:** another frog feature is constructed.
- **17.219 s:** Diana's 5.311B hit reaches Heket; Toad Pact changes from ready
  to 30-second cooldown and prevents death by sacrificing a live frog.
- **17.286 s:** Heket begins the first recorded active frog-summoning skill.
  Two frog features are constructed at the same timestamp, followed by further
  replacements as the cap is maintained.
- **22.847–25.058 s:** two frog croak initiations overlap; four croaks land
  between 23.450 and 25.795 seconds, direct evidence of synchronized response.
- **32.294 s:** a second generic Heket `skill2` lifecycle starts while Toad Pact
  still has approximately 14.66 seconds remaining. This lifecycle is not a
  second death save; `canDead` does not fire here.
- **33.165 s:** another frog begins croaking.
- **34.840 s:** Heket begins her second active frog-summoning skill, about
  17.55 seconds after the first, and two frog features are constructed.
- **40.401 and 43.081 s:** two further frog croak initiations. The later chain
  produces four landed croaks at 41.138, 41.205, and twice at 43.818 seconds.
- **48.910 s:** final friendly-summon creation callback and end of captured
  activity.

## What the kit does

### Croaking Calamity — frog creation and protection stock

The displayed ultimate summons a frog that inherits a portion of Heket's ATK
and a large portion of her Max HP. Its immediate numerical damage is zero; its
value is the future contribution of the new body:

1. another durable frontline target;
2. another possible synchronized croak;
3. another stack powering Symbiotic Blessing;
4. another body eligible for Heket's summon shields;
5. another life that Toad Pact can exchange for Heket's survival.

The generic capture does not expose a distinct Heket-side `skill1` feature for
this ultimate. Frog construction is nevertheless directly observed, while the
external kit and animation data establish the intended summon action. Because
multiple skills and replacement rules create frogs, individual construction
events should not be assigned to Croaking Calamity unless they coincide with a
known cast.

This skill is best understood as an **engine-maintenance ultimate**, not a
burst ultimate. Casting it when the frog board is depleted restores offense,
healing, frontline occupancy, synchronized debuffs, and a potential extra
life. Casting while already capped may instead refresh the lowest-HP frog,
which exchanges a damaged body for a healthier one.

### Ten Thousand Toads — summon engine, shared shield, and croak network

The live `H_HaiKuiTe_skill3_Model` had `maxCount=3`. It marks Heket with
`MarkAsSummoner`, so she remains a deity for normal battle rules while also
qualifying for summon effects. On every friendly summon creation, it broadcasts
the event into Heket's feature network. When one of Heket's own frogs is created
beyond the cap, it selects the lowest-HP existing frog and force-kills it.

That replacement rule matters. Heket does not simply fail to summon at cap;
she continuously converts the weakest frog into a fresh body. This preserves a
three-frog formation and can deliberately trigger summon-death interactions in
other kits.

Two active summon lifecycles began at 17.286 and 34.840 seconds, an observed
gap of about 17.55 seconds. The displayed cycle cooldown is 18 seconds, which
fits the live timing after fixed-step scheduling. Both casts created/replaced
frogs while maintaining the three-frog cap.

The active also grants shields to **all friendly summons**, not merely Heket's
frogs. Since Heket is flagged as a summon, she should be included by the same
summon targeting rules. The exact shield coefficient was not exposed in the
feature's primitive state and no shield-value event was captured; the equipped
external description gives 400% ATK at skill level 3, but this report does not
claim a measured shield amount.

### Frog croak network — damage and stacking accuracy suppression

Each frog's `H_HaiKuiTe_Frog_skill1_Model` implements the active croak. When
one frog begins the skill, it loops over all other living frogs and forcibly
orders their synchronized skill. The synchronized skill does not recursively
trigger another chain, preventing an infinite loop.

Six frog skill starts produced ten landed damage callbacks totaling
294,228,504. The relationship is not one start to one hit because one natural
croak can force multiple other frogs, some frogs can die or be replaced before
landing, and the instrumentation sees only feature instances that existed
after injection.

The clearest synchronized clusters were:

| Time cluster | Landed croaks | Damage |
|---|---:|---:|
| 23.450–23.517 s | 3 | 75,268,426 |
| 41.138–41.205 s | 2 | 93,524,443 |
| 43.818 s | 2 | 93,524,443 |

Croaks also reduce nearby enemies' Hit Rate for five seconds and can stack up
to five times. This is Heket's principal control contribution: it is soft
control rather than stun, but repeated synchronized croaks make the nearby
enemy formation increasingly unreliable. Dodge-oriented allies benefit most
because lowering enemy Hit Rate increases the practical value of their Dodge.

The frogs move toward the nearest enemy and do not perform normal attacks, so
their purpose is to carry HP, occupy space, deliver proximity croaks, and act
as sacrificial resources. Their damage is useful but not their primary value.

### Symbiotic Blessing — the core scaling engine

The live feature was internally `H_HaiKuiTe_skill0_Model` and exposed:

- ATK buff ID `30124103`;
- `atkRate=409 / 1024` = **39.94% ATK per live frog**;
- `cureRate=307 / 1024` = **29.98% of Heket's current ATK per frog**;
- interval `2048 / 1024` = **2 seconds**.

Whenever Heket's frog count changes, the feature recalculates one dynamic buff
for Heket and every friendly summon. It upgrades the existing buff rather than
blindly stacking separate copies. With the three-frog cap filled, the formula
is:

- ATK: `3 × 39.94%` ≈ **119.82% additional ATK**;
- periodic healing basis: `3 × 29.98%` ≈ **89.94% of Heket's current ATK every
  two seconds**.

The same periodic cure is applied to Heket and every friendly summon. This is
not a general full-team heal: ordinary deity teammates who are not treated as
summons are outside the target selector. Conversely, allied summons from other
heroes can receive both the ATK scaling and repeated healing, making Heket a
specialist centerpiece for summon-heavy formations.

No numeric cure events were written by this version of the generic logger, so
the rate, interval, and eligibility are direct implementation/runtime-parameter
evidence, while actual effective healing after missing-HP caps and healing
modifiers is unavailable for this fight.

### Toad Pact — frog-for-life exchange

The live `H_HaiKuiTe_skill2_Model` exposed:

- shield buff ID `30123104`;
- cooldown `30720 / 1024` = **30 seconds**.

When lethal damage arrives and the cooldown is ready, it searches Heket's live
frogs, selects the one with the lowest current HP, applies the shield buff to
Heket, force-kills that frog, and returns `false` from `canDead` to prevent
Heket's death.

This happened at 17.219 seconds. Immediately before the callback, cooldown was
zero; afterward it was 30,720 fixed-point units. Diana's direct calculator
output against Heket was 5,310,802,185. The capture therefore proves the
activation and the lethal threat that caused it, although it cannot state how
much of that hit exceeded Heket's remaining HP.

Toad Pact turns frog count into an emergency survival reserve. Its counterplay
is equally clear: kill all frogs before bursting Heket, or force the protection
early and attack again during the 30-second cooldown. The active summon skill
helps rebuild the frog that was spent, but it does not reset Toad Pact's
cooldown in this equipped implementation.

## The four guide questions

### A. Which hero benefited Heket the most?

No allied hero can be ranked from this capture. The logger recorded 39
friendly-summon creation callbacks but did not serialize their master/hero
identity, and it did not record heal recipients, buff recipients, or shield
values. Naming a specific allied hero would therefore be fabricated.

The strongest **recorded enabler** of Heket was her own frog formation:

- frogs supplied up to roughly +120% ATK through Symbiotic Blessing;
- frogs powered healing every two seconds;
- frogs occupied enemies and delivered Hit Rate reduction;
- one frog was exchanged to save Heket from the 5.311B Diana hit.

Among external heroes, the best theoretical enablers are those that keep Heket
alive while her frog engine develops, restore energy for more frog creation,
or themselves create summons that benefit from her ATK/healing/shield package.
That is a guide recommendation derived from her implementation, not measured
ally attribution from this run.

### B. What benefits did Heket give teammates?

Her benefits are selective rather than universal:

- **Friendly summons:** dynamic ATK per frog, periodic healing per frog, and
  the active skill's shared summon shield.
- **Dodge-based allies:** indirect benefit from stacked enemy Hit Rate
  reduction created by synchronized croaks.
- **The whole team:** indirect protection from frog bodies absorbing attacks,
  occupying melee enemies, and lowering nearby enemy accuracy.
- **Ordinary non-summon deities:** no direct Symbiotic Blessing ATK/heal is
  proven; they primarily receive the indirect benefits above.

The exact teammate-by-teammate recipient table is unavailable because this
capture predates serialized buff/heal provenance. Future reports should rank
actual recipients once those events are present rather than assume every ally
received summon-only effects.

### C. What dealt the most damage, and how can it be boosted?

Heket herself dealt **74.08%** of the minimum captured ecosystem damage and
frogs dealt **25.92%**. This does not make her a damage carry: the capture
omitted other allies and settlement coverage, and her utility is the reason to
field her.

Among unique kit mechanics, synchronized frog croaks are her identifiable
damage contribution. They can be strengthened by:

1. maintaining three live frogs so more synchronized croaks can land;
2. increasing Heket's ATK, because frog inherited ATK and Heket-based summon
   buffs scale from her;
3. using Attack Speed/haste or cooldown support only where it actually shortens
   frog action cycles or summon reconstruction;
4. grouping enemies around the frogs so each area croak hits more targets;
5. applying physical-defense reduction or physical vulnerability to enemies;
6. preventing frog deaths before the synchronized animations resolve.

The most important “damage boost” is uptime: a full, living frog board carries
more ATK amplification, more croak sources, and more bodies. Raw offensive
stats on Heket should not come at the expense of the durability and energy
needed to keep that engine active.

### D. What is Heket's support specialty and use case?

Heket is a **summon-board amplifier and attrition support**. Her ideal use case
is a prolonged fight with one or more summon-producing allies, where frogs can
remain near enemies and the team can exploit repeated ATK scaling, periodic
healing, shared shields, accuracy reduction, and sacrificial death prevention.

She is especially attractive when:

- allied damage comes substantially from summons;
- the enemy relies on ordinary hit checks rather than unavoidable damage;
- a long boss or frontline fight allows repeated two-second healing cycles;
- disposable bodies can redirect or absorb dangerous single-target attacks;
- the team can protect Heket from a second lethal sequence during Toad Pact CD.

She is less suitable when the team has no summons, enemies erase summons with
large area damage, attacks are guaranteed to hit, healing is blocked, or the
fight ends before frog count and periodic value accumulate. She does not
replace a universal healer or cleanser: her direct ATK/heal engine targets
summons, and no cleanse, broad energy restore, immunity, or general deity buff
was observed in her own kit.

## Purpose, positioning, and resource economy

Heket should generally remain behind her frog line. Frogs move toward the
nearest enemy and establish the contact zone where croaks deal area damage and
reduce Hit Rate. Heket's position matters less for her periodic summon support,
which uses relationship selectors, but exposing her needlessly risks consuming
Toad Pact early.

Her combat economy has three coupled states:

1. **frog count**, controlling ATK, healing, croak concurrency, and emergency
   life stock;
2. **frog HP**, controlling which body is replaced or sacrificed;
3. **Toad Pact cooldown**, controlling whether frog stock can become Heket
   survival.

At cap, creating a new frog refreshes the lowest-HP old frog. Under lethal
pressure, Toad Pact also selects the lowest-HP frog. Both mechanics intelligently
spend the least healthy body rather than destroying a full-health one.

## Synergies, builds, and counters

### Strong partner archetypes

- **Summoners:** receive the direct ATK, healing, and shield package on their
  summoned units; this is Heket's most distinctive synergy.
- **Dodge tanks/assassins:** capitalize on frog-applied Hit Rate reduction.
- **Energy supports:** help Heket rebuild or refresh frogs more frequently.
- **Controllers/groupers:** keep multiple enemies inside the frogs' three-meter
  croak radius.
- **Damage-reduction and universal-heal supports:** cover Heket's ordinary
  deity allies, whom her summon-only periodic healing does not necessarily
  reach, and protect her during Toad Pact downtime.
- **Summon-death payoff heroes:** may benefit from Heket intentionally replacing
  or sacrificing frogs, subject to each skill's summon-type filters.

### Build priorities

Heket's build should prioritize the stats that scale or preserve her engine:

1. survival sufficient to avoid consuming Toad Pact immediately;
2. energy generation and relevant cooldown haste for summon uptime;
3. ATK, because her healing, shields, inherited frog offense, and frog-related
   scaling refer back to ATK;
4. healing effectiveness where it modifies `cureExt` output;
5. defensive stats for a long attrition window.

Pure personal damage is a secondary goal. Her value is multiplicative across
eligible summons, so an apparently smaller personal upgrade can outperform a
damage-focused build when applied to an entire summon board.

### Counters and failure modes

- fast area damage can clear multiple frogs and collapse ATK/healing stacks;
- anti-heal suppresses the two-second sustain engine;
- must-hit/unavoidable attacks bypass the practical value of Hit Rate debuffs;
- burst after Toad Pact activation exploits its 30-second cooldown;
- silence/control can interrupt frog croaks or Heket's reconstruction timing;
- non-summon teams waste much of her direct support budget;
- spreading enemies outside frog proximity reduces both damage and accuracy
  pressure;
- summon-specific execution or banishment effects attack her core resource
  directly.

## Investment meaning

Heket's valuable breakpoints are mechanical:

- Croaking Calamity increases frog inheritance, making each summoned body more
  durable and useful.
- Ten Thousand Toads upgrades improve the shared summon shield and eventually
  summon more frogs per active use.
- Primordial Molt reduces the relevant summon cycle and increases starting
  frogs/cap at its highest tier, accelerating the engine.
- Symbiotic Blessing raises the per-frog ATK multiplier and periodic healing.
  The live values here were approximately 40% ATK and 30% healing per frog.
- Toad Pact upgrades increase the emergency shield after a frog is sacrificed;
  the live capture proves its 30-second trigger but not the equipped shield
  coefficient.

The captured feature naming does not expose level suffixes for Heket's core
models, so live primitive parameters are more reliable than guessing tiers
from class names. The manifest's external descriptions and historical Lua
comments sometimes use different coefficients. This report uses live values
where available and labels external-only values accordingly.

## Level suppression and limitations

Heket's direct outgoing coefficient was consistently `687 / 1024` (~67.1%).
Diana's incoming hit against Heket used `1392 / 1024` (~135.9%), confirming an
enemy level advantage. This fight is not an equal-level or unsuppressed damage
benchmark.

Evidence boundaries:

- Heket's 13 direct damage calls and the 10 frog damage callbacks are directly
  observed.
- The combined 1.135B is a minimum ecosystem total, not settlement coverage.
- The 5.311B incoming Diana calculation and Toad Pact's 0→30s transition are
  direct proof of one death-prevention activation.
- The three-frog cap and Symbiotic Blessing's live rates/interval are direct
  runtime parameters.
- The logger did not capture actual cure amounts, shield values, buff targets,
  energy, HP bars, positions, settlement totals, or summon master identities.
- Thirty-nine friendly summon-creation callbacks include all qualifying allied
  summons observed by Heket's global listener, not 39 Heket frogs. Ten frog
  feature constructions are directly identifiable; replacements mean they
  were not simultaneously alive.
- A specific allied hero cannot be named as Heket's largest beneficiary or
  enabler from this run.
- Toad Pact activation is proven, but the exact shield absorbed afterward is
  not measured.

For a publication-grade follow-up, serialize source and target identity for
`cureExt`, buff creation/upgrades, shields, summon master IDs, and energy
changes; record the full allied roster and settlement screen; and compare a
summon-heavy team with a non-summon control. The current fight already proves
Heket's core identity: three-frog board management, per-frog summon scaling,
two-second summon sustain, synchronized accuracy-reducing croaks, lowest-HP
frog replacement, and frog-for-life death prevention.

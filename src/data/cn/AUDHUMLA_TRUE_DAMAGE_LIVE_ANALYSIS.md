# Audhumla true-damage live analysis (global client)

Date: 2026-08-05  
Client: global `com.goatgames.mot.gb.gp`, live client 1.3.15  
Runtime identity: `H_ODeMuBuLa` (hero 2012, skin 201201)

## Result

Audhumla's skill 3 is genuine True Damage in the global client. It calls the
dedicated `calRealDamageByPower` path; her ordinary attacks and damaging active
skill call `calDamageByPower` instead.

Two different battle conditions were deliberately observed and must not be
mixed:

| Run | Levels reported by combat runtime | True-damage level coefficient | Use |
|---|---|---:|---|
| Grim Surge boss | Audhumla 397 vs boss 1 | `1024` = 1.0 | Unsuppressed boss control |
| Odyssey 45-39 | Audhumla 397 vs enemies 486-487 | 89-90 level deficit | Suppressed PvE result |

The boss mode did **not** apply the campaign level suppression to Audhumla's
outgoing True Damage. The authoritative reason is mode configuration, not just
the observed `1024` coefficient: `battle_mode.json` enables `lv_pressing` only
for mode 1 (`STAGE`, Odyssey/campaign) and mode 2 (`TOWER`, the main Spire).
Grim Surge and the game's other boss modes use different mode IDs, causing
`DamageUtil.setLvPressingData()` to clear the suppression table when the fight
is entered. The boss's runtime level 1 would also produce a 1.0 coefficient on
its own, so that coefficient is supporting evidence but cannot by itself prove
that the feature was disabled.

The boss results prove that skill 3 fires and measure its unsuppressed cadence
and contribution. They must not be used as the expected damage share in
campaign.

### Direct comparison

| Battle | Normal/physical | True | Captured total | True share |
|---|---:|---:|---:|---:|
| Grim Surge, unsuppressed | 2,577,684,543,047 | 2,182,895,489,075 | 4,760,580,032,122 | **45.85%** |
| Odyssey 45-39, suppressed | 32,033,675,661 | 2,941,680,296 | 34,975,355,957 | **8.41%** |

The Grim Surge settlement displayed **4,917M** damage for MVP Audhumla. The
calculator capture covered 96.82% of that result. True Damage alone was 44.39%
of the displayed settlement total, so the practical boss result is about
**44%-46% True Damage** depending on whether the denominator is the full UI
total or only calculator-attributed damage.

### Chinese-client campaign validation

A subsequent live campaign run used the same combined probe on the Chinese
package `com.tencent.tmgp.seayoo.zero`:

| Damage path | Events | Damage | Coefficient | Captured share |
|---|---:|---:|---:|---:|
| Normal/physical | 20 | 19,278,162,178 | `666`-`676` (65.0%-66.0%) | 52.87% |
| True | 6 | 17,185,223,207 | **`1024` (100%)** | **47.13%** |
| Total | 26 | 36,463,385,385 | — | 100% |

The CN settlement showed `3915万` for Audhumla (39.15B in the calculator's
internal scale), so the hook covered 93.14% of her displayed result. Confirmed
True Damage was 43.90% of that full settlement total.

This is direct runtime proof of the client difference. Level suppression was
definitely active in the CN campaign fight because normal damage received only
65%-66%. Nevertheless, every call to `getLvPressingRealDamageCoef` returned
100%, and `calRealDamageByPower` returned its input unchanged. In the global
campaign run, equivalent True Damage returned only about 22% of its input after
the special global reduction and remaining final modifiers.

The CN stage did not have the same level deficit as global Odyssey 45-39, so
the two percentages are not a perfectly controlled same-stage A/B comparison.
The coefficient comparison is still conclusive: CN suppresses normal damage in
campaign but does not apply the additional True Damage suppression.

In the measured Odyssey 45-39 fight (Audhumla level 397, enemies level
486-487), the directly captured Audhumla calculator output was:

| Damage path | Events | Damage | Share of captured damage |
|---|---:|---:|---:|
| Normal/physical | 33 | 32,033,675,661 | 91.59% |
| True (`Triple-Fate Verdict`) | 4 | 2,941,680,296 | 8.41% |
| Total | 37 | 34,975,355,957 | 100% |

The settlement screen showed 37,329K damage for Audhumla. The hooked calculator
covered 93.69% of that displayed total. Relative to the settlement total, the
four directly observed true-damage events account for about **7.88%**. The small
unhooked remainder is damage applied outside `calDamageByPower` (secondary or
already-calculated effects), so 8.41% is the clean calculator-path split and
7.88% is the conservative share of the whole UI total.

## What happened per proc

Observed true-damage outputs:

| Target | Pre-final `power` | Final output |
|---|---:|---:|
| Jormungandr | 3,712,289,684 | 839,709,690 |
| Anubis | 3,132,747,640 | 703,719,180 |
| Anubis | 3,132,747,640 | 703,719,180 |
| Anubis | 3,132,747,640 | 694,532,246 |

The final output was only 22.17%-22.62% of the value passed into the true-damage
calculator. This agrees with the global client's special level-gap treatment:
at a 90-level deficit, `lv_pressing.json` has `real_reduce_damage = 0.8`
(80% reduction, leaving 20%) before the remaining combat modifiers.

## Cadence and skill distinction

The Grim Surge boss control run (level coefficient `1024`, therefore
unsuppressed) logged 11 calls from
Audhumla to the true-damage calculator. Every one was attributed to
`H_ODeMuBuLa`; no other allied hero entered that path. The calls appeared among
successive normal hits, consistent with the stated every-third-consecutive-hit
trigger. The Odyssey run also shows target switching matters: only one proc was
recorded on Jormungandr before the target changed, then the sequence restarted
on Anubis and produced three more procs.

The normal stream contains two recognizable groups:

- Repeated low-power events around 1.17B-1.52B are normal/basic attacks.
- Large 5.60B-6.96B multi-target events are Primordial Repulsion/laser damage.
- True events are unambiguous because they use `calRealDamageByPower`; they are
  not a hidden component merged into the physical hit.

## Interpretation

“18% of target Max HP” is the proc's uncapped basis at skill level 4, not its
share of Audhumla's total fight damage. Its practical share is reduced by:

1. triggering only after three consecutive normal attacks on one target;
2. resetting the sequence when Audhumla switches targets;
3. the own-ATK cap (1800%, or 4000% with relic level 4);
4. the global client's separate True Damage level penalty;
5. her rapidly accelerating ordinary attacks and physical active-skill hits,
   which continue adding to the denominator.

For the level-397 versus level-487 battle, Triple-Fate Verdict contributed
roughly **8%**, not 18% or 25%, of Audhumla's real fight damage. Against an
equal/lower-level durable single target, its share should be materially higher
because the 80% special True Damage reduction disappears and target switching
is less likely. The full Grim Surge capture confirms this prediction: against
one durable unsuppressed target, its share rose to approximately **46%**.

This 8% result is specifically a **suppressed PvE campaign result**. The
unsuppressed Grim Surge result is about **44%-46%**. Suppression therefore
changed Triple-Fate Verdict from nearly half of Audhumla's output in the boss
control to less than one tenth in campaign.

## Instrumentation

- `frida_true_damage_probe.py`: verified true/normal route, attacker/target,
  level coefficient, input power and true output.
- `frida_audhumla_damage_probe.py`: captured and summed Audhumla-only normal and
  true calculator output.
- `fights/audhumla_grim_surge_unsuppressed.log`: complete unsuppressed boss
  capture (115 normal-path events, 37 true events).
- `fights/audhumla_cn_campaign.log`: Chinese-client campaign capture, including
  separate normal and true level coefficients.
- `capture_dmglog.py`: attached successfully but this battle mode did not emit
  its UI-side `DamageLog.getFLoatValue` events; it was not used for totals.

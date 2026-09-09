# Hebo — hero evidence report

Selected camp: 1; instances: 10522460938-1788936991562-iKAZII.
Observed battle clock: 31.490 seconds.

## Evidence quality

- Damage totals are calculator output, not settlement damage or effective HP loss.
- Cast end callbacks do not prove completion; effect/interrupt hooks are required.
- Buff applications are not uptime, stacks, or attributable damage amplification.
- Missing observations mean unknown, not zero contribution.
- Team share depends on co-DPS, support, enemy HP and encounter duration.

## Reference kit

Reference descriptions, not measured investment or verified runtime parameters.
Source: /Users/daschultheiss/hero-database/src/data/heroes/hebo.json

- Raging Torrent: Deals DMG equal to 500% ATK to enemies in a dense cluster within a 3-meter radius. Deals 30% increased DMG to enemies with HP below 50%.
- Wave-Chasing Slash: Dashes through the enemy 4 times consecutively. The first 3 hits deal 120%, 150%, and 180% ATK as DMG respectively. The final hit deals DMG equal to 250% ATK and knocks down hit enemies.
- Wave-Surge Blade: Passive: Each time [Wave-Chasing Slash] deals DMG, Hebo gains one stack of [Surge]. Each stack of [Surge] increases his Crit Rate by 6% for 10s.
- Mirror of Still Water: Passive: While Hebo is casting [Wave-Chasing Slash], DMG taken is reduced by 40% and increases by 5% every 2s. After [Wave-Chasing Slash] ends, the DMG reduction effect is retained for 3s.

Relic: {"name": "Return to the Vast Deep", "description": "[Wave-Chasing Slash] restores 200 Energy each time it is fully cast.", "upgrades": {"level2": "[Wave-Chasing Slash] permanently increases Hebo's ATK by 25% each time it is fully cast, stacking up to 3 times.", "level3": "[Wave-Chasing Slash] restores 300 Energy each time it is fully cast.", "level4": "[Wave-Chasing Slash] permanently increases Hebo's ATK by 40% each time it is fully cast, stacking up to 3 times."}}


## Investment and battlefield roster

| Instance | Hero | Camp | Preset development |
|---|---|---|---|
| attacker_main_player | H_MainPlayer | 1 | Unknown |
| defender_main_player | H_MainPlayer | -1 | Unknown |
| 10522460938-1769152297934-mKrZQ3 | H_MoMoSi | 1 | Unknown |
| 10522460938-1768896764271-8gU4q7 | H_CaiShen | 1 | Unknown |
| 10522460938-1768992979951-bVTN6G | H_YueLao | 1 | Unknown |
| 10522460938-1778065130640-UOSTHE | H_HeHuaiSiTuoSi | 1 | Unknown |
| 10522460938-1788936991562-iKAZII | H_HeBo | 1 | Unknown |
| 30628-1 | H_DeMoTeEr | -1 | Unknown |
| 30628-2 | H_SaiHeMaiTe | -1 | Unknown |
| 30628-3 | H_SaiHeMaiTe | -1 | Unknown |
| 30628-4 | H_SheShou | -1 | Unknown |
| 30628-5 | H_AErTeMiSi | -1 | Unknown |
| 10522460938-1778065130640-UOSTHE-0 | H_HeHuaiSiTuoSi_JiXie | 1 | Unknown |
| 10522460938-1778065130640-UOSTHE-1 | H_HeHuaiSiTuoSi_JiXie | 1 | Unknown |
| 10522460938-1778065130640-UOSTHE-2 | H_HeHuaiSiTuoSi_JiXie | 1 | Unknown |

## Performance

| Measure | Observed |
|---|---:|
| calculator_damage | 39,500,690,829.0000 |
| incoming_calculator | 37,012,798,780.0000 |
| damage_events | 16.0000 |
| team_share | 0.7611 |
| energy_gained | 2,330,632.0000 |
| energy_spent | 2,048,000.0000 |
| deaths | 1.0000 |

Outgoing level coefficients (raw fixed-point): {'205': 16}

## Skill timing and damage

| Skill ID | Starts | End callbacks | Start times (s) | Calculator output | Hit events |
|---|---:|---:|---|---:|---:|
| 101314 | 2 | 2 | [15.276, 27.135] | 30,366,359,272 | 5 |
| 101324 | 4 | 4 | [3.082, 8.576, 21.708, 29.413] | 8,952,202,227 | 10 |
| 101351 | 2 | 2 | [1.206, 27.135] | 182,129,330 | 1 |

## Teammate contributions

| Direction | Peer | Effective healing | Buff applications | Healing skill IDs |
|---|---|---:|---:|---|
| received | H_CaiShen (10522460938-1768896764271-8gU4q7) | 4,285,595,517 | 1 | ['400224'] |
| received | H_YueLao (10522460938-1768992979951-bVTN6G) | 4,971,313,723 | 5 | ['400414', '400434'] |
| received | H_MoMoSi (10522460938-1769152297934-mKrZQ3) | 0 | 5 | [] |
| received | H_HeHuaiSiTuoSi_JiXie (10522460938-1778065130640-UOSTHE-1) | 4,141,770,536 | 2 | ['4011144'] |
| received | H_HeHuaiSiTuoSi_JiXie (10522460938-1778065130640-UOSTHE-2) | 1,035,442,634 | 116 | ['4011144'] |
| received | H_HeBo (10522460938-1788936991562-iKAZII) | 0 | 21 | [] |
| received | H_DeMoTeEr (30628-1) | 0 | 1 | [] |
| received | H_SaiHeMaiTe (30628-2) | 0 | 4 | [] |
| received | H_SaiHeMaiTe (30628-3) | 0 | 6 | [] |
| received | H_SheShou (30628-4) | 0 | 2 | [] |
| received | H_AErTeMiSi (30628-5) | 0 | 6 | [] |
| given | H_CaiShen (10522460938-1768896764271-8gU4q7) | 5,363,509,747 | 1 | ['4004612'] |
| given | H_HeBo (10522460938-1788936991562-iKAZII) | 0 | 21 | [] |

Healing credit records the immediate engine source. Borrowed/link mechanics require the listed skill implementation to identify the enabling hero.

## Effects: buffs, debuffs and shields

| Effect | Source → recipient | Types | Applications | First (s) |
|---|---|---|---:|---:|
| 10086101 | 10522460938-1769152297934-mKrZQ3 → 10522460938-1788936991562-iKAZII | ['Shield'] | 5 | 12.261 |
| 10132101 | 10522460938-1788936991562-iKAZII → 10522460938-1788936991562-iKAZII | ['Empty'] | 4 | 3.082 |
| 10132301 | 10522460938-1788936991562-iKAZII → 10522460938-1788936991562-iKAZII | ['Data'] | 1 | 15.008 |
| 10133101 | 10522460938-1788936991562-iKAZII → 10522460938-1788936991562-iKAZII | ['Data'] | 4 | 3.484 |
| 10133301 | 10522460938-1788936991562-iKAZII → 10522460938-1788936991562-iKAZII | ['Shield'] | 1 | 15.008 |
| 10134401 | 10522460938-1788936991562-iKAZII → 10522460938-1788936991562-iKAZII | ['Data'] | 10 | 3.283 |
| 118 | 10522460938-1788936991562-iKAZII → 10522460938-1788936991562-iKAZII | ['Invincible'] | 1 | 0.0 |
| 20014402 | 30628-2 → 10522460938-1788936991562-iKAZII | ['Imprison'] | 4 | 26.264 |
| 20014402 | 30628-3 → 10522460938-1788936991562-iKAZII | ['Imprison'] | 6 | 25.929 |
| 2031201 | 30628-4 → 10522460938-1788936991562-iKAZII | ['Data'] | 2 | 16.013 |
| 30031102 | 30628-1 → 10522460938-1788936991562-iKAZII | ['Imprison'] | 1 | 18.358 |
| 30052101 | 30628-5 → 10522460938-1788936991562-iKAZII | ['Imprison'] | 3 | 3.484 |
| 30052301 | 30628-5 → 10522460938-1788936991562-iKAZII | ['Data'] | 3 | 3.484 |
| 40041301 | 10522460938-1768992979951-bVTN6G → 10522460938-1788936991562-iKAZII | ['Data', 'unknown'] | 2 | 20.77 |
| 40042401 | 10522460938-1768896764271-8gU4q7 → 10522460938-1788936991562-iKAZII | ['DataGive'] | 1 | 2.278 |
| 40042401 | 10522460938-1788936991562-iKAZII → 10522460938-1768896764271-8gU4q7 | ['DataGive'] | 1 | 2.278 |
| 40043301 | 10522460938-1768992979951-bVTN6G → 10522460938-1788936991562-iKAZII | ['Data'] | 1 | 9.782 |
| 40044301 | 10522460938-1768992979951-bVTN6G → 10522460938-1788936991562-iKAZII | ['AddEnergy'] | 1 | 4.891 |
| 40044401 | 10522460938-1768992979951-bVTN6G → 10522460938-1788936991562-iKAZII | ['Data'] | 1 | 4.891 |
| 40111302 | 10522460938-1778065130640-UOSTHE-1 → 10522460938-1788936991562-iKAZII | ['AddBlood'] | 1 | 13.065 |
| 40111302 | 10522460938-1778065130640-UOSTHE-2 → 10522460938-1788936991562-iKAZII | ['AddBlood', 'unknown'] | 114 | 16.147 |
| 40111303 | 10522460938-1778065130640-UOSTHE-1 → 10522460938-1788936991562-iKAZII | ['AddEnergy'] | 1 | 13.065 |
| 40111303 | 10522460938-1778065130640-UOSTHE-2 → 10522460938-1788936991562-iKAZII | ['AddEnergy'] | 2 | 23.651 |

Full effect values and captured parameters are in HERO_ANALYSIS.json. Shield applications are distinct from absorption.

## Survivability

Observed maximum HP values: [11736049295.0, 14294624787.0]
Explicit shield applications: 6; values and sources in JSON.
Death at 31.423s; 93 preceding events in JSON. Review damage, control, shields and healing before attributing a cause.

## Ultimate access

Detected from ultimate_clear energy events. Readiness, completion and interruptions remain unverified.

| Spend time (s) | Matched skill | Energy spent | Next attributed hit (s) |
|---:|---|---:|---:|
| 15.276 | 101314 | 1024000.0 | 15.611 |
| 27.135 | 101351 | 1024000.0 | None |

## Battlefield opportunity

| Window starts (s) | Known enemies alive | Calculator output |
|---:|---:|---:|
| 0.0 | 5 | 635,654,912 |
| 10.0 | 5 | 27,664,936,830 |
| 20.0 | 5 | 11,200,099,087 |
| 30.0 | 5 | 0 |

Enemy counts use observed roster and deaths; unseen spawns/revives can invalidate counts.

## Observed effect lifetimes

Add-to-remove intervals in JSON are coverage evidence, not exact control duration. Missing removal is marked censored; refreshes and simultaneous buff instances may be ambiguous.

## Guide conclusions and next tests

This report establishes observations, not a pull recommendation. Verify trial/owned investment and review effects before assigning native capabilities.
Compare identical encounters for investment or partner tests. A solo carry and a co-DPS have different damage opportunities. Shared time alone does not control enemy survival.
Unresolved: actual HP/shield damage split, complete control uptime, ultimate readiness/completion, overkill, settlement reconciliation, and causal partner amplification unless separately captured.

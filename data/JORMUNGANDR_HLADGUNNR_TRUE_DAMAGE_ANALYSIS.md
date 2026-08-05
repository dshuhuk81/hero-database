# Jormungandr and Hladgunnr — True Damage audit

Date: 2026-08-05  
Evidence: global/CN Lua dumps, current hero configuration and previous live
True Damage findings

## Short conclusion

- Jormungandr **does have True Damage** in the playable kit. It is emitted by
  the internally summoned death-state unit `H_YeMengJiaDeST`, not by the base
  runtime unit `H_YeMengJiaDe`.
- Global and CN contain the same Jormungandr death-state implementation. The
  client difference is the campaign/Spire True Damage coefficient, not the
  existence of the skill.
- Hladgunnr's exclusive-equipment effect is a real damage conversion. It removes
  part of each qualifying normal-damage event and re-emits that part through
  `hitRealDamage` after the required number of ultimate casts.
- Hladgunnr's implementation is also identical in global and CN. In global
  Odyssey/main Spire, the converted portion is additionally level-suppressed;
  in CN it is not.

## Jormungandr: what the files actually do

Hero 3004 uses `H_YeMengJiaDe_skill0_Model` for the death passive. When the base
hero is killed, this feature:

1. sets the passive as the forced skill configuration;
2. invokes `SummonPlayer`;
3. creates the internal revenge/corpse unit;
4. broadcasts the death-state message.

The summoned unit has skin/runtime template `H_YeMengJiaDeST`. Its
`H_YeMengJiaDeST_skill0_Model` accumulates damage received during the revenge
window, applies the configured return percentage and own-ATK cap, finds nearby
enemies and then executes:

```lua
targetPlayer:hitRealDamage(damage, self.player, self.skill)
```

It then enters final death. This is unequivocally the game's True Damage path.

### Why the earlier live conclusion was wrong

The earlier report stated that every attack from the playable version was
normal and that the True Damage belonged to a separate version. The first half
was true but incomplete: ordinary attacks from `H_YeMengJiaDe` are normal. The
death detonation is attributed to `H_YeMengJiaDeST`, however. A source filter or
counter watching only the base template necessarily misses it.

`ST` is a separate runtime entity but not a separately selected playable hero.
It is the summoned second phase of the playable hero's passive. A correct live
probe must group both templates under Jormungandr:

- `H_YeMengJiaDe`
- `H_YeMengJiaDeST`

It must also keep recording until the revenge timer expires after lethal damage.

## Jormungandr: global versus CN

The relevant global and CN Lua files are byte-for-byte equivalent in the
current dumps, including the call to `hitRealDamage`. Hero 3004 also has the
same skill IDs and principal combat coefficients in both configurations.

Therefore:

- Outside Odyssey/main Spire: the detonation should behave equivalently in both
  clients, subject to ordinary team/buff differences.
- In Odyssey/main Spire with a level deficit: global applies
  `real_reduce_damage` to the detonation; CN returns a True Damage coefficient
  of 100%.
- The detonation can still appear absent if the corpse phase is not created,
  has accumulated no qualifying damage, has no living enemy in its radius, or
  the capture stops before its timer expires.

### Global live capture (2026-08-05)

A controlled Global campaign fight confirmed the execution chain. The second
run was calculated as a delta because the first fight's counters persisted in
the same game process:

| Damage source | Events | Calculator output |
|---|---:|---:|
| Base `H_YeMengJiaDe` regular damage | 39 | 6,154,131,801 |
| Base-form True Damage | 0 | 0 |
| Death-state `H_YeMengJiaDeST` True Damage | 2 | 4,355,690,072 |

Both death-state events used raw power `10,878,601,545` and produced
`2,177,845,036` damage, hitting `H_PuLuoMiXiuSi` and `H_DiAnNa`. The captured
True Damage coefficient was `205 / 1024`, or about 20.02%, demonstrating an
approximately 80% Global True Damage reduction in this matchup. Regular damage
used `308 / 1024`, or about 30.08%.

Within the captured calculator output for this fight, the death detonation was
about 41.44% of Jormungandr's total (`4.356B / 10.510B`). This is not a fixed
skill ratio: it depends on stored revenge-state damage, the return rate and ATK
cap, surviving targets, and the applicable suppression row.

### CN live comparison (2026-08-05)

The matching two-template probe on CN captured:

| Client | Ascension | Rarity | Throne | ATK | Might |
|---|---:|---:|---:|---:|---:|
| Global | Divine 3 | R10 | 0 | 669,795 | 2.2M |
| CN | Divine 2 | R10 | 1 | 308,800 | 1.1M |

| Damage source | Events | Calculator output |
|---|---:|---:|
| Base `H_YeMengJiaDe` regular damage | 21 | 5,629,230,204 |
| Base-form True Damage | 0 | 0 |
| Death-state `H_YeMengJiaDeST` True Damage | 3 | 17,733,219,762 |

Each CN death-state event had raw power `5,911,073,254` and delivered the full
`5,911,073,254`, with coefficient `1024 / 1024` (100%). The three targets were
`H_PuLuoMiXiuSi`, `H_MDTianCheng`, and `H_DiAnNa`. Regular damage used
`666 / 1024`, about 65.04%.

The CN detonation contributed about 75.90% of captured Jormungandr output
(`17.733B / 23.362B`). Global's measured True Damage coefficient was only
`205 / 1024` (20.02%), so an otherwise identical raw detonation would deliver
about five times as much damage on CN. Absolute totals are not directly
comparable because Global Jormungandr had about 2.17 times the listed ATK and
twice the Might of the CN build, while the detonation hit two Global targets
versus three CN targets. The coefficient comparison is the controlled evidence
of the client difference.

## Hladgunnr: how the conversion works

Hero 4009's exclusive-equipment feature is
`H_HeLaDeGuNa_skill4_1_Model`. It counts ultimate starts. Once the configured
threshold is reached, every qualifying event whose attack type is normal damage
is split:

```lua
realDamage = damage * damageRate
normalDamage = damage - realDamage
victim:hitRealDamage(realDamage, killer, skillConfig)
```

This is a conversion, not an additional duplicate hit. For example, at a 30%
conversion rate an original 100 damage event becomes 70 normal plus 30 True
before the two paths receive their respective final handling.

The user-facing exclusive-equipment text currently says:

- initial unlock: after three ultimate casts, 10% of Hladgunnr's damage is
  converted to True Damage;
- next upgrade: one fewer ultimate cast is required;
- next upgrade: conversion rises to 30%;
- final upgrade: Super Armor for six seconds after each ultimate.

The Lua feature reads conversion rate and cast threshold from skill parameters,
so those live parameters—not historical comments inside the source—are
authoritative for a particular equipment level.

### Important limitations

- The conversion is inactive before the required ultimate count.
- It only processes events marked `EBattleDamageType.Normal`.
- Hladgunnr must still be alive when the conversion feature processes damage.
- Short fights may end before the mechanic ever activates.
- Because the converted part is sent through `hitRealDamage`, global
  Odyssey/main Spire suppression can dramatically reduce that portion instead
  of preserving the original combined damage.

## Hladgunnr: global versus CN consequence

The conversion Lua implementation is the same in both clients. The difference
arises downstream:

- **CN campaign/Spire:** normal portion receives normal level suppression; the
  converted True portion receives coefficient 100%.
- **Global campaign/Spire:** normal portion receives normal level suppression;
  the converted True portion receives the separate, often harsher
  `real_reduce_damage` coefficient.
- **Boss and other modes without `lv_pressing`:** both clients should preserve
  the intended conversion much more closely.

This makes global Hladgunnr potentially worse after conversion in high-gap
Odyssey/Spire: damage is removed from the normal event and transferred into a
True path that can lose up to 90% to the global-only penalty. The following
live run quantifies the observed 30% conversion tier in one campaign matchup.

### Hladgunnr Global live capture (2026-08-05)

The Global campaign probe confirmed that the conversion activates. It captured
seven regular calculator events and six True Damage events:

| Damage path | Events | Calculator output |
|---|---:|---:|
| Regular | 7 | 19,700,185,661 |
| True | 6 | 3,390,121,355 |
| Combined | 13 | 23,090,307,016 |

The paired pre-suppression powers show the 30% conversion tier. For example,
one split was `6,349,660,514` regular plus `2,718,752,828` True; the True part
is 29.98% of their combined value (rounding explains the small deviation).

Regular damage used coefficient `308 / 1024` (30.08%), while every True event
used `205 / 1024` (20.02%). True Damage consequently represented only 14.68%
of delivered calculator output in this fight despite being 30% of each
qualifying split before downstream processing. This proves activation, but the
fight total also includes at least one regular event without a paired True
event, consistent with the mechanic only converting qualifying Normal events
after its ultimate-count condition is met.

### Hladgunnr CN live comparison (2026-08-05)

The verified CN campaign run also activated True Damage:

| Client | Ascension | Rarity | ATK | Might |
|---|---:|---:|---:|---:|
| Global | Divine 3 | R20 | 774,500 | 2.5M |
| CN | Exalted+ | R20 | 267,000 | not provided |

| Damage path | Events | Calculator output |
|---|---:|---:|
| Regular | 6 | 3,629,112,019 |
| True | 4 | 4,401,017,655 |
| Combined | 10 | 8,030,129,674 |

CN used `666 / 1024` (65.04%) for regular damage and `1024 / 1024` (100%)
for every True Damage event. The observed build was at an approximately 50%
conversion tier: qualifying paired pre-suppression values were equal apart from
rounding, for example `1,170,636,331` regular plus `1,170,636,331` True, and
`1,371,298,168` regular plus `1,371,298,169` True.

True Damage was 54.81% of delivered calculator output in the CN fight, compared
with 14.68% in the Global fight. This gap combines two effects: the observed CN
build converted about 50% while the Global build converted about 30%, and CN
delivered the converted portion at 100% instead of Global's 20.02%. Hero and
exclusive-equipment details are required before treating the 50% versus 30%
conversion tier as a regional client difference rather than a build difference.

Global had about 2.90 times the listed ATK of CN. That explains why absolute
damage totals cannot be compared directly, but it does not explain the split
ratio: ATK scales the magnitude of both portions, whereas the observed 30% and
50% fractions are selected by the conversion skill parameter. Both heroes were
R20, but their ascension levels differed; without an explicit exclusive-
equipment/relic tier readout, the live evidence alone cannot assign the split
difference exclusively to region or progression.

## Source files

- `global_lua_dump/LuaScripts_Battle_Ply_SkillFeatures_H_YeMengJiaDe_skill0_Model.lua.lua`
- `global_lua_dump/LuaScripts_Battle_Ply_SkillFeatures_H_YeMengJiaDeST_skill0_Model.lua.lua`
- `cn_lua_dump/LuaScripts_Battle_Ply_SkillFeatures_H_YeMengJiaDeST_skill0_Model.lua.lua`
- `global_lua_dump/LuaScripts_Battle_Ply_SkillFeatures_H_HeLaDeGuNa_skill4_1_Model.lua.lua`
- `cn_lua_dump/LuaScripts_Battle_Ply_SkillFeatures_H_HeLaDeGuNa_skill4_1_Model.lua.lua`

# Yaoji (瑶姬) — Evidence-Based Hero & CN Meta Analysis
**Game:** 不朽箴言 / Motto Immortal  |  **Research date:** 2026-10-14  |  **Status:** Source-grounded analysis; unresolved questions explicitly disclosed  |  **Combat logs:** Excluded

> **Evidence key:** **[GAME DATA]** = supplied `yaoji.json` skill/relic text, not independently verified against a current live client. **[CN PLAYER]** = cited individual community report, not universal consensus. **[DERIVED]** = transparent arithmetic or mechanical interpretation of game text. **[UNKNOWN]** = cannot be established from available evidence. Ratings are not invented.

## 1. Hero profile
- **Hero:** Yaoji / 瑶姬; internal ID `3014`; **faction:** Clubs; **class:** Support; **role:** Arcane; rarity: Legendary. [GAME DATA]
- **Reference state:** Lv 300, Divine V; HP 1,644,803, ATK 226,617, Armor 34,627, Magic RES 34,627, Might 632,000. These are one supplied snapshot, not level-1/base stats. [GAME DATA]
- **Gameplay identity:** Possesses the frontmost ally, becomes untargetable while possessing, applies an area enemy damage-taken amplification / damage-over-time stack, weakens enemy ATK and healing, and shields the host via damage reduction and periodic HP restoration. [GAME DATA]

## 2. Complete supplied skill text and upgrades
### 1. Clouds and Rain of Wushan — Ultimate
> Yaoji stirs up the clouds and rain of Wushan, expanding the AoE of Miasmic Field to the entire battlefield for 8s. When cast, immediately inflicts 1 stack of Blossom & Blight to enemies within the field's AoE, and then inflicts 1 stack of Blossom & Blight to enemies within the field every 2s. (Blossom & Blight: Each stack increases DMG taken by the target by 3% and deals DMG equal to 25% of Yaoji's ATK per second. Stacks up to 10 times and lasts 30s.) This Ultimate can only be cast while possessing a host. If Yaoji is not possessing a host when cast, she immediately possesses the frontmost ally, then casts the Ultimate.
- **level2:** Increases DMG per second of Blossom & Blight to 40%.
- **level3:** Duration extends to 10s.
- **level4:** Each stack of Blossom & Blight increases DMG taken by enemies by 5%.
- **Damage type:** Magic.
**Evidence:** [GAME DATA].

### 2. Twining Clouds
> Passive: At the start of battle, Yaoji possesses the frontmost ally and becomes Untargetable. While possessing a host, she creates a Miasmic Field in a 4-meter radius around the host. Possession lasts 12s. After leaving the host, she takes 50% less DMG for 5s. When actively cast, deals DMG equal to 150% of ATK to all enemies within the Miasmic Field and inflicts 1 stack of Blossom & Blight.
- **level2:** When actively cast, deals DMG equal to 180% of ATK.
- **level3:** When actively cast, deals DMG equal to 210% of ATK.
- **level4:** Active cast CD is reduced by 30%.
- **Damage type:** Magic.
**Evidence:** [GAME DATA].

### 3. Mistborne Erosion
> Passive: Reduces ATK of enemies within the Miasmic Field by 15% and their healing effects received by 30%.
- **level2:** Reduces ATK of enemies within the Miasmic Field by 20%.
- **level3:** Reduces healing effects received by enemies within the Miasmic Field by 60%.
- **level4:** Reduces ATK of enemies within the Miasmic Field by 25%.
**Evidence:** [GAME DATA].

### 4. Cloudveil Shelter
> The host takes 30% less DMG for the next 5s and restores 3% of max HP per second. This skill can only be cast while possessing a host.
- **level2:** Takes 40% less DMG for the next 5s.
- **level3:** Restores 5% of max HP per second.
- **level4:** Duration extends to 6s.
**Evidence:** [GAME DATA].

## 3. Relic — Last Petals Fallen
> When Blossom & Blight on each enemy first reaches 10 stacks, inflicts Blight on the target. (Blight: Loses 3% of max HP per second, ATK SPD reduced by 30%, and ATK reduced by 30% for 5s.)
- **level2:** Each time the host loses 40% of max HP, immediately casts an additional Twining Clouds on enemies within the Miasmic Field.
- **level3:** When Blossom & Blight on each enemy first reaches 10 stacks, inflicts Blight on the target. (Blight: Loses 5% of max HP per second, ATK SPD reduced by 50%, and ATK reduced by 50% for 5s.)
- **level4:** Each time the host loses 30% of max HP, immediately casts an additional Twining Clouds on enemies within the Miasmic Field.
**Important:** The JSON labels its relic rows as a base description plus `level2`–`level4`; the mapping to player-facing Relic 0/10/20/30 is *not explicitly stored in this file*. Avoid representing it as independently verified until checked in-game. [GAME DATA / UNKNOWN]

## 4. Numerical mechanics and breakpoints
| Mechanic | Base | Fully upgraded skill/relic | Confidence |
|---|---|---|---|
| Blossom & Blight damage taken per stack | +3% | +5% | GAME DATA |
| Blossom & Blight damage per stack per second | 25% Yaoji ATK | 40% Yaoji ATK | GAME DATA |
| Blossom & Blight max stacks / debuff duration | 10 / 30 s | 10 / 30 s | GAME DATA |
| Ultimate field duration | 8 s | 10 s | GAME DATA |
| Twining Clouds active hit | 150% ATK | 210% ATK, cooldown reduced 30% | GAME DATA |
| Enemy ATK reduction within Miasmic Field | 15% | 25% | GAME DATA |
| Enemy healing received reduction | 30% | 60% | GAME DATA |
| Host damage reduction | 30% for 5 s | 40% for 6 s | GAME DATA |
| Host healing | 3% max HP/s for 5 s | 5% max HP/s for 6 s | GAME DATA |
| Blight on FIRST reaching 10 stacks | 3% max HP/s, -30% ATK/SPD, 5 s | 5% max HP/s, -50% ATK/SPD, 5 s at relic upgrade 3 | GAME DATA |
| Extra Twining Clouds when host loses max HP | 40% threshold at relic upgrade 2 | 30% threshold at relic upgrade 4 | GAME DATA; trigger accounting UNKNOWN |

### 4.1 Ten-stack problem — central to her real-world value
- At maximum Ultimate duration (10 s), one initial stack at t=0 and additional stacks at t=2,4,6,8,10 yields **six stacks** if all applications occur through t=10. At its 8-second base duration the analogous count is five. [DERIVED; boundary at exactly 8/10 s may depend on engine tick ordering]
- Her Ultimate **alone** therefore cannot be assumed to trigger the relic’s first-10-stack Blight in a fresh fight. More Twining Clouds applications, previously existing stacks, and/or subsequent casts are needed. [DERIVED]
- Ten stacks at upgraded Skill 1 imply **+50 percentage points** of target damage taken and a **nominal 400% of Yaoji ATK per second** from Blossom & Blight if all individual DoT contributions add linearly. Actual multipliers, snapshotting, caps and mitigation have not been measured. [DERIVED / UNKNOWN]
- Upgraded Cloudveil Shelter yields up to **30% of host max HP** restored during its full 6 seconds (6 × 5%); overheal, healing reduction and interruptions can reduce realized healing. [DERIVED]
- Upgraded Blight implies a nominal **25% max HP total loss in five seconds** versus **15%** initially; whether boss modifiers/caps, immunity or damage-taken amplifiers affect it is unknown. [DERIVED / UNKNOWN]
- Do **not** interpret -50% ATK and -50% attack speed as proof of 75% effective enemy DPS reduction: interaction order, floors and spell damage patterns are unverified. [UNKNOWN]

### 4.2 Relic resource spikes
- **Activation/base effect:** Unlocks Blight when a target first reaches ten stacks. [GAME DATA]
- **Upgrade 2:** Additional Twining Clouds casts in response to large host HP losses, potentially accelerating stacking. The exact HP-loss accumulator and recast behavior are unknown. [GAME DATA / DERIVED]
- **Upgrade 3:** Material improvement of Blight’s ATK and attack-speed suppression and max-HP drain, but still contingent on reaching ten stacks. [GAME DATA / DERIVED]
- **Upgrade 4:** Lowers the stated host HP-loss trigger from 40% to 30%; practical value depends on trigger frequency and survivability. [GAME DATA / DERIVED]

## 5. Chinese player evidence
| Source / author | Date | Verbatim excerpt (brief) | Translation / finding | Weight |
|---|---|---|---|---|
| [TapTap guide — 兮兮（如烟是我的女王）](https://www.taptap.cn/moment/774571413246837292) | 2026-06-14 update; page revised 2026-07-12 | `瑶姬：非常强的辅助，最低神话30神器` | “Yaoji: very strong support; at least Mythic and relic 30.” Continuation recommends Divine V if resources permit, and names Heracles and Nyx as partners. | Direct community recommendation, not independent match test |
| [TapTap forum, User427852862佛系摸鱼](https://www.taptap.cn/app/708799/topic?os=ios&page=46) | 2026-06-13 | `瑶姬配尼克斯有点意思` | “Yaoji with Nyx is interesting”; appears in Spire floor 325 post. | Anecdotal combination, no controlled comparator |
| [TapTap beginner guide — author not reliably retrieved](https://www.taptap.cn/moment/796166544978611881) | Page shown updated July 21; year not independently visible | `♣️梅花 1玄女 2青蛙 3大蛇 4瑶姬` | Clubs-faction wishlist lists Yaoji fourth. | A player wishlist preference, not a tier score |
| [TapTap – 甜椒, quoted in discussion listing](https://www.taptap.cn/moment/844705259317101771) | Date unconfirmed | `金色羽毛把关键主c(灶神 雪女 九天玄女 大力神 瑶姬）抽到神话` | Advises summoning selected key units including Yaoji to Mythic. The text calls the group “main carries”; that does NOT change Yaoji’s verified Support class. | Community account, exact underlying post not checked |

**Community consensus caution:** Several search hits reproduce the *same* 兮兮 guide as a sidebar preview. These are not independent endorsements. The 100-comment-per-thread requirement could not be fulfilled from exposed source content; no claim of 100 comments read is made. No verifiable Bilibili/NGA/9game/Huya Yaoji-specific build was obtained in this pass.

## 6. Teams and synergies — evidence first
| Partner | What is actually documented | Status |
|---|---|---|
| **Nyx** | Named by 兮兮, separately mentioned in Spire 325 player note | CN-reported pairing; exact interaction not established |
| **Heracles** | Named by 兮兮 | CN-recommended pairing; exact interaction not established |
| **“黑鬼”** | Named by 兮兮 in same sentence | Chinese nickname; identity not validated; do not map to a specific hero |
| **cancer** | Listed in supplied `synergyPartners` metadata with tags TEAM_DAMAGE_REDUCTION, TEAM_DEBUFF_CLEANSE, TEAM_ENERGY_RESTORE, TEAM_HEAL, TEAM_SHIELD, TEAM_CC_IMMUNITY | Database-generated/curated metadata only; no two-sided skill verification, **not** independently confirmed synergy |
| **dionysus** | Listed in supplied `synergyPartners` metadata with tags TEAM_CC_IMMUNITY, TEAM_DAMAGE_REDUCTION, TEAM_DEBUFF_CLEANSE, TEAM_ENERGY_RESTORE, TEAM_HEAL, TEAM_SHIELD | Database-generated/curated metadata only; no two-sided skill verification, **not** independently confirmed synergy |
| **tefnut** | Listed in supplied `synergyPartners` metadata with tags TEAM_DEBUFF_CLEANSE, TEAM_HEAL, TEAM_SHIELD, TEAM_DAMAGE_REDUCTION | Database-generated/curated metadata only; no two-sided skill verification, **not** independently confirmed synergy |
| **mengpo** | Listed in supplied `synergyPartners` metadata with tags TEAM_DEBUFF_CLEANSE, TEAM_HEAL, TEAM_ENERGY_RESTORE | Database-generated/curated metadata only; no two-sided skill verification, **not** independently confirmed synergy |
| **meret** | Listed in supplied `synergyPartners` metadata with tags TEAM_DAMAGE_REDUCTION, TEAM_HEAL, TEAM_SHIELD | Database-generated/curated metadata only; no two-sided skill verification, **not** independently confirmed synergy |

**Positioning:** With the supplied wording, her opening possession picks the **frontmost allied unit**, not the highest-ATK carry. Put the intended host in the foremost eligible position, while respecting opponent dive/area damage and the host’s ability to survive. This is a positioning consequence of Skill 2, not a validated optimal layout. [GAME DATA / DERIVED]

**Team construction constraint:** No 10–15 “confirmed” synergy pairs or full high-level five-hero lineups are supplied by these sources. Inventing them would fail the evidence-first requirement.

## 7. Strengths, weaknesses, counterplay
**Strengths supported by text:** 10-stack damage-taken amplification; field-wide coverage during Ultimate; enemy ATK and healing reduction inside the field; self-untargetability during possession; defensive healing and damage reduction for host; relic suppression after 10 stacks. [GAME DATA]

**Limits supported by text:** Ultimate requires a host (or possesses the frontmost ally immediately); Cloudveil Shelter requires possession; several strong effects require enemies to remain in the field and/or build 10 stacks; possession has a stated 12-second duration. [GAME DATA]

**Possible counterplay — mechanical hypotheses, not tested counters:** Disrupt/kill the host before stacking; deny long fights; avoid clustering in the host’s 4 m field outside Ultimate; cleanse/remove stacks if the particular effect is cleanseable (not established); disable healing. No named hero is verified as a Yaoji counter. [DERIVED / UNKNOWN]

## 8. Gear, virtues, ranks, PvE / PvP rating
- **Gear/stat priority:** No verified CN endgame stat thresholds or exact optimal sets found. Attack plausibly influences Yaoji’s DoT and Twining Clouds damage, but an ATK-first prescription is not established. HP, defenses, cooldown haste or energy regeneration cannot be ranked from available evidence. [GAME DATA / UNKNOWN]
- **Virtues:** Supplied JSON contains `Stoic (4)` as a placeholder/recommendation without explanation. It is **not validated** as the meta-best set. [GAME DATA metadata]
- **Rank:** CN player says Mythic + Relic 30 minimum, Divine V if resourced. No quantitative dupe-by-dupe breakpoint or low-rank test is available. [CN PLAYER]
- **PvE rating / PvP rating / overall / S–SSS tier:** **Unrated — insufficient independently verifiable outcomes.** No invented tier letters or scoring. [UNKNOWN]
- **Early versus endgame:** The sourced recommendation is explicitly investment-heavy, but relative early-game performance has not been tested. [CN PLAYER / UNKNOWN]

## 9. Unresolved verification checklist (not blockers to this document)
1. Validate relic upgrade rows against visible 0/10/20/30 in-game thresholds.
2. Establish if and how Yaoji re-possesses after initial 12 s and how Energy / Ult timing works.
3. Determine Blossom & Blight stack refresh, per-stack DoT handling, dispellability, timing and damage multiplier stacking.
4. Verify how host HP-loss thresholds count cumulative damage, healing, simultaneous hits and multiple procs.
5. Verify whether percent-max-HP Blight is capped or changed against PvE bosses.
6. Acquire genuine five-hero Yaoji teams and controlled PvP/PvE comparisons from CN posts.
7. Verify whether player nickname “黑鬼” corresponds to a specific in-game hero; do not guess.
8. Verify optimal gear, virtue set and Divine-rank performance with documented player evidence.
9. Check 100+ comments per relevant TapTap thread where accessible; current accessible view does not permit the claim.

## 10. Evidence-bound conclusion
Yaoji’s **documented** strength is the combination of host protection with powerful enemy-wide pressure during her Ultimate, notably a *potential* 50% damage-taken amplification at ten Blossom & Blight stacks and a relic-locked Blight debuff. The decisive practical variable is whether she can actually reach ten stacks reliably before battles end, and how long possession/host survival persists. The available CN guide calls her a very strong support and advocates Mythic + relic 30, with Divine V as the long-term investment; this is a player recommendation, not a universal performance proof. At present no defensible exact PvE/PvP tier or build stat priority can be asserted.

## Sources and provenance
- Primary mechanics: user-provided `yaoji.json` (four skills, all upgrades, relic, hero profile), October 2026. Supplied project data, not a separately authenticated game-client export.
- https://www.taptap.cn/moment/774571413246837292 — 兮兮 guide; Yaoji paragraph dated 2026-06-14; page version crawled as 2026-07-12.
- https://www.taptap.cn/app/708799/topic?os=ios&page=46 — 2026-06-13 Spire 325 + Nyx mention.
- https://www.taptap.cn/moment/796166544978611881 — beginner Clubs wishlist (search snippet; direct page fetch incomplete).
- https://www.taptap.cn/moment/844705259317101771 — listing excerpt attributed to 甜椒 (secondary surfaced snippet).


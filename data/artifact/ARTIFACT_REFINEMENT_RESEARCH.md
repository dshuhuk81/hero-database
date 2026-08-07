# Artifact **Refinement Effect** — Data Mining Report

Companion to [ARTIFACT_AWAKENING_RESEARCH.md](ARTIFACT_AWAKENING_RESEARCH.md), which covers the
Awaken/Enhance (Hammer) half. This document is the **Refine** half: *which* stats you end up with,
which materials move the odds, and how much of each you need.

**Client:** GLOBAL (`com.goatgames.mot.gb.gp`) — verified.
**Config:** `live_extractions/20260807_093439/unpacked/region_02/client/config/`
**Logic:** `live_extractions/20260731_115343/unpacked/region_04/client/dist/default/equipment/equip-awake/`
(the 0807 run ships no `dist/`; 0731 is the newest that does)

> **Cross-client.** `equip_awake*.json` and `equip/equip_detail.json` are byte-identical in every Global
> run since 2026-06-12 **and** in the CN client. `UIEquipmentAwakeAttrsRefresh.js` — including the bug in
> §7 — is identical in Global and CN. **Every number below is the shared Global+CN ruleset**, not a
> Global-only snapshot.

Machine-readable companion: **`artifact_refinement_data.json`**.

---

## 0. TL;DR — and three corrections to the awakening report

1. **The 12-stat pool is fixed by the artifact's EQUIP SLOT (1–4), not by the awakened-effect index and
   not by the Tier.** The awakening report's §3 read the four `random_attr` lists as "slot 1 / slot 2 /
   slot 3 / slot 4 *of the effect list*". They are the pools of the four *artifact* slots
   (Wind / Water / Flame / Terra). All 1–4 effects on one artifact draw from that one 12-stat pool.
   This is what your "you can't have CRIT % on slot 2" observation actually is: the **Water** artifact's
   pool has no CRIT Rate, at any Tier, for all three types.
2. **The `reduce` column on the 120 refine stones never applies** — the client keys it by array index
   instead of attribute id (§7). Every "×k → 100 %" figure in the awakening report's §6.2 was computed
   assuming `reduce` works; the real client numbers are **much** worse (a q13 stone still guarantees, but
   q10 ×3 is 69 % not 100 %). Corrected tables in §8.
3. **Refining the *last* open slot costs ~10× more than the first three.** With `k` unlocked effects a
   stat is pinned at 100 % once its weight reaches `11000/(k−1)`; at `k = 1` that formula diverges and the
   only route is the 1 % floor, which needs weight **89 001**. Consequence: *never lock down to one open
   slot if you can avoid it* (§10).

Live-verified: the model reproduces your in-game `All possible stats and rates` panel **exactly, 12/12**
(§6.3).

---

## 1. Feature shape

```
Awakened artifact (Tier 1-4)  ──▶  REFINEMENT EFFECT
    │                                  │
    │  Tier N  =  N Awakened Effects   ├─ pick a target stat  (filter button)
    │                                  ├─ load materials      (stones and/or spare artifacts)
    │                                  ├─ pay 1x Refining Stone (item 1034)
    │                                  ├─ ALL unlocked effects re-roll in one go
    │                                  └─ Save / Give up   (you may reject the result)
    │
    └─ Fate lock (item 1035) freezes an effect: p = 1, excluded from the roll
```

Confirmed UI strings (RAM harvest + live client):

| Control | EN text |
|---|---|
| Screen | `Refinement Effect` · `Rate Preview` · `Rate Increase` · `Refine` |
| Detail toggle | `Info` → `All possible stats and rates` ; off → `High-Chance Stat` |
| Help | *"Some materials will boost the chance of gaining certain stats. If not locked, all of the above types will be refined in one go."* |
| Confirm | *"Are you sure you want to consume these for refinement? It cannot be undone."* |
| Errors | `No available effect to increase refinement rate.` · `No refinement available.` |
| Lock | `Fate lock` — *"Lock the effect so that it won't change when refined. If you cancel before refining, all materials will be refunded."* |

Cost per refine: **1× `1034` Refining Stone** + **every material you loaded** (all consumed, win or lose).
Rejecting the result (`keep_new_attr = false`) does **not** refund them.

---

## 2. What the "grades" are

Your "divinations / grades" are the artifact **type** — `equip_detail.type`, EN names harvested from RAM:

| type | EN | icon token | 中文 |
|---:|---|---|---|
| 1 | **Hefty** | `Thick` | 力量 |
| 2 | **Nimble** | `Swift` | 敏捷 |
| 3 | **Arcane** | `Mystery` | 智力 |

The **slot** is encoded as an element in the icon:

| pos | element token | this is the artifact slot |
|---:|---|---|
| 1 | `Wind` | slot 1 |
| 2 | `Water` | slot 2 |
| 3 | `Flame` | slot 3 |
| 4 | `Terra` | slot 4 |

So `A_UI_Equipment_Wind_Swift_Grade13` = **Nimble, slot 1, quality 13**.
156 equips = 3 types × 4 slots × 13 qualities.

Not to be confused: `Oracle Divination` is a separate system, and `Suit Bonus`
(Spades / Diamonds / Clubs / Hearts / Celestial) is the `race` roll that must match the hero before an
artifact can be awakened at all.

---

## 3. The stat pools — **by artifact slot**

`equip_awake.json` has 48 rows (3 types × 4 slots × 4 tiers). `random_attr` is **identical for all three
types and all four tiers**; only `pos` changes it. Tier changes only `num_attr` (1 → 4).

| # | **Slot 1 — Wind** | **Slot 2 — Water** | **Slot 3 — Flame** | **Slot 4 — Terra** |
|---|---|---|---|---|
| 1 | ATK % *(1901)* | HP % *(1902)* | ATK % *(1901)* | HP % *(1902)* |
| 2 | Hit Bonus *(905)* | Armor % *(1941)* | M-RES % *(1942)* | Armor % *(1941)* |
| 3 | CRIT Rate *(906)* | M-RES % *(1942)* | Dodge Rate *(904)* | Hit Bonus *(905)* |
| 4 | Lifesteal Eff. *(918)* | Dodge Rate *(904)* | CRIT RES *(907)* | CRIT Rate *(906)* |
| 5 | CRIT DMG Bonus *(919)* | CRIT RES *(907)* | M-DMG RED *(908)* | CRIT DMG Bonus *(919)* |
| 6 | M-DMG Bonus *(924)* | M-DMG RED *(908)* | P-DMG RED *(909)* | M-DMG Bonus *(924)* |
| 7 | P-DMG Bonus *(925)* | P-DMG RED *(909)* | Lifesteal Eff. *(918)* | P-DMG Bonus *(925)* |
| 8 | Cooldown Haste *(926)* | Healing Eff. *(927)* | Cooldown Haste *(926)* | Healing Eff. *(927)* |
| 9 | Control Bonus *(932)* | Recharge Eff. *(928)* | Control Bonus *(932)* | Recharge Eff. *(928)* |
| 10 | Effect Hit *(945)* | Control RES *(929)* | CRIT DMG RED *(940)* | Control RES *(929)* |
| 11 | ATK SPD Bonus *(915)* | CRIT DMG RED *(940)* | Effect Hit *(945)* | Effect RES *(944)* |
| 12 | Ultimate Power *(949)* | Effect RES *(944)* | Ultimate Power *(949)* | ATK SPD Bonus *(915)* |

**Where a stat can live at all** (this is the first thing to check before planning anything):

| stat | ceiling @Lv20 | available on slots |
|---|---:|---|
| **CRIT DMG Bonus** | 50 % | **1, 4** |
| Control Bonus / Effect Hit | 50 % | 1, 3 |
| Control RES / CRIT DMG RED / Effect RES | 50 % | 2, 3 or 2, 4 |
| **CRIT Rate** | 40 % | **1, 4** |
| Hit Bonus | 40 % | 1, 4 |
| Lifesteal Effectiveness | 40 % | 1, 3 |
| Dodge / CRIT RES | 40 % | 2, 3 |
| Healing / Recharge Eff. | 40 % | 2, 4 |
| **P-DMG Bonus / M-DMG Bonus** | 30 % | **1, 4** |
| Armor % / M-RES % / P-DMG RED / M-DMG RED | 30 % | 2,4 / 2,3 |
| **ATK %** | 20 % | **1, 3** |
| Cooldown Haste / Ultimate Power | 20 % | 1, 3 |
| ATK SPD Bonus | 20 % | 1, 4 |
| HP % | 20 % | 2, 4 |

Read: **slot 1 (Wind) is the only slot that carries ATK %, CRIT Rate, CRIT DMG and P-DMG at the same
time.** Slot 4 (Terra) carries CRIT Rate + CRIT DMG + P-DMG but *not* ATK %. Slots 2 and 3 cannot hold a
CRIT stat at all.

---

## 4. Material catalogue A — spare artifacts (equips)

Every equip carries an `affect_weight` list over all 24 stats. There are only **12 distinct profiles**,
one per (type, slot); the 13 qualities of a family are the *same* profile scaled.

Shape is rigid and complete: **each of the 24 stats is `+2w` on exactly one family, `+w` on exactly one
other, `−2w` on exactly one other, and generic on the remaining nine.**

### 4.1 Master table — what each artifact does as refine fodder

| Artifact | q13 id | **++ (+200)** | **+ (+100)** | **−− (−200)** |
|---|---:|---|---|---|
| Hefty · Wind (1) | 130101 | Lifesteal, Cooldown Haste | CRIT Rate, Control RES | Hit Bonus, CRIT DMG |
| Hefty · Water (2) | 130102 | HP %, M-DMG RED | Healing, Recharge | CRIT Rate, ATK SPD |
| Hefty · Flame (3) | 130103 | M-RES %, Hit Bonus | Lifesteal, CRIT DMG RED | Cooldown Haste, Effect RES |
| Hefty · Terra (4) | 130104 | Armor %, CRIT RES | HP %, P-DMG RED | **ATK %**, Ultimate Power |
| **Nimble · Wind (1)** | **130201** | **ATK %, P-DMG Bonus** | Cooldown Haste, ATK SPD | M-RES %, M-DMG Bonus |
| Nimble · Water (2) | 130202 | Dodge, Healing | P-DMG Bonus, Control Bonus | M-DMG RED, Control RES |
| Nimble · Flame (3) | 130203 | Recharge, ATK SPD | Hit Bonus, CRIT DMG | HP %, CRIT RES |
| Nimble · Terra (4) | 130204 | P-DMG RED, CRIT DMG RED | Armor %, Effect Hit | Healing, Recharge |
| **Arcane · Wind (1)** | **130301** | **CRIT Rate, Ultimate Power** | ATK %, M-DMG Bonus | Armor %, **P-DMG Bonus** |
| Arcane · Water (2) | 130302 | Control RES, Effect Hit | Dodge, Effect RES | Control Bonus, CRIT DMG RED |
| **Arcane · Flame (3)** | **130303** | **CRIT DMG, M-DMG Bonus** | M-RES %, Ultimate Power | P-DMG RED, Lifesteal |
| Arcane · Terra (4) | 130304 | Control Bonus, Effect RES | CRIT RES, M-DMG RED | Dodge, Effect Hit |

Lower qualities use the same six stats with smaller numbers:

| quality | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | **13** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `+2w` | 2 | 4 | 6 | 8 | 10 | 20 | 30 | 40 | 60 | 80 | 100 | 150 | **200** |
| `+w` | 1 | 2 | 3 | 4 | 5 | 10 | 15 | 20 | 30 | 40 | 50 | 75 | **100** |
| `−2w` | −2 | −4 | −6 | −8 | −10 | −20 | −30 | −40 | −60 | −80 | −100 | −150 | **−200** |
| generic | 0 | 0 | 0 | −1 | −2 | −4 | −6 | −8 | −12 | −16 | −20 | −30 | **−40** |

Against a base weight of 1000, **anything below quality 10 is statistical noise** — a q8 artifact moves a
stat by 4 %. Only quality 12–13 fodder is worth the inventory space.

### 4.2 Reverse lookup — which artifact to farm for the stat you want

| target stat | **+200 from** | +100 from | avoid (−200) |
|---|---|---|---|
| ATK % | **Nimble · Wind** | Arcane · Wind | Hefty · Terra |
| CRIT Rate | **Arcane · Wind** | Hefty · Wind | Hefty · Water |
| CRIT DMG Bonus | **Arcane · Flame** | Nimble · Flame | Hefty · Wind |
| P-DMG Bonus | **Nimble · Wind** | Nimble · Water | Arcane · Wind |
| M-DMG Bonus | **Arcane · Flame** | Arcane · Wind | Nimble · Wind |
| ATK SPD Bonus | **Nimble · Flame** | Nimble · Wind | Hefty · Water |
| Cooldown Haste | **Hefty · Wind** | Nimble · Wind | Hefty · Flame |
| Ultimate Power | **Arcane · Wind** | Arcane · Flame | Hefty · Terra |
| Hit Bonus | **Hefty · Flame** | Nimble · Flame | Hefty · Wind |
| Lifesteal Effectiveness | **Hefty · Wind** | Hefty · Flame | Arcane · Flame |
| Control Bonus | **Arcane · Terra** | Nimble · Water | Arcane · Water |
| Effect Hit | **Arcane · Water** | Nimble · Terra | Arcane · Terra |
| HP % | **Hefty · Water** | Hefty · Terra | Nimble · Flame |
| Armor % | **Hefty · Terra** | Nimble · Terra | Arcane · Wind |
| M-RES % | **Hefty · Flame** | Arcane · Flame | Nimble · Wind |
| Dodge Rate | **Nimble · Water** | Arcane · Water | Arcane · Terra |
| CRIT RES | **Hefty · Terra** | Arcane · Terra | Nimble · Flame |
| M-DMG RED Rate | **Hefty · Water** | Arcane · Terra | Nimble · Water |
| P-DMG RED Rate | **Nimble · Terra** | Hefty · Terra | Arcane · Flame |
| Healing Effectiveness | **Nimble · Water** | Hefty · Water | Nimble · Terra |
| Recharge Effectiveness | **Nimble · Flame** | Hefty · Water | Nimble · Terra |
| Control RES | **Arcane · Water** | Hefty · Wind | Nimble · Water |
| CRIT DMG RED | **Nimble · Terra** | Hefty · Flame | Arcane · Water |
| Effect RES | **Arcane · Terra** | Arcane · Water | Hefty · Flame |

**Two important consequences of the rigid design:**

* **`Nimble · Wind` is the single cleanest fodder for a physical DPS slot-1 artifact** — it pushes
  ATK % *and* P-DMG up by +200 each, and its two −200s (M-RES %, M-DMG Bonus) are either outside the
  slot-1 pool or a stat you didn't want anyway.
* **CRIT Rate and P-DMG fight each other.** `Arcane · Wind` is the only +200 source for CRIT Rate and it
  is −200 on P-DMG. The alternative (`Hefty · Wind`, +100 CRIT Rate) is −200 on CRIT DMG. There is no
  fodder that raises CRIT Rate without hurting one of your other crit-DPS stats.

### 4.3 Which artifacts even show up in the list

`rebuildMaterialList` keeps an equip only if at least one of its **positive** weights lands in the
target artifact's pool. So when refining a Water (slot 2) artifact you will not see `Nimble · Wind`
at all — its positives are ATK %/P-DMG/Cooldown/ATK SPD, none of which exist on slot 2.

Quality-13 artifacts **can** be used as refine fodder — this is confirmed live (§6.3), and is different
from the level-up feeder rule (*"Artifacts of 'Divine' rarity cannot be used as upgrade mats."*).

---

## 5. Material catalogue B — the 120 refine stones

`item.json`, `type == 6` (`ENormalItemType.EquipAwakeMaterial`), icon `A_UI_Props_WanOu` (all 120 share
one icon; the corner badge is the stat).
`effect[0] = "attrId|addWeight|reduceWeightOnAllOthers"`.

| id block | quality | EN name | **add to target** | reduce (see §7 — **dead**) |
|---|---:|---|---:|---:|
| 4101–4124 | 4 | `T1 <Stat> Stone` | **+1 000** | −50 |
| 4201–4224 | 6 | `T2 <Stat> Stone` | **+2 000** | −100 |
| 4301–4324 | 8 | `T3 <Stat> Stone` | **+4 000** | −200 |
| 4401–4424 | 10 | `T4 <Stat> Stone` | **+8 000** | −400 |
| 4501–4524 | 13 | `T5 <Stat> Stone` | **+100 000** | 0 |

Stat order in each block: `1901, 1902, 1941, 1942, 904, 905, 906, 907, 908, 909, 918, 919, 924, 925,
926, 927, 928, 929, 932, 940, 944, 945, 915, 949` (so `4101→ATK%`, `4107→CRIT Rate`, `4112→CRIT DMG`,
`4114→P-DMG`, `4124→Ultimate`, and `+100` per tier).

Only 12 of the 24 stat lines are usable on any one artifact slot — the panel filters the rest out:

| slot | T1 stone ids offered (add 100/200/300/400 for T2–T5) |
|---|---|
| 1 Wind | `4101 4106 4107 4111 4112 4113 4114 4115 4119 4122 4123 4124` |
| 2 Water | `4102 4103 4104 4105 4108 4109 4110 4116 4117 4118 4120 4121` |
| 3 Flame | `4101 4104 4105 4108 4109 4110 4111 4115 4119 4120 4122 4124` |
| 4 Terra | `4102 4103 4106 4107 4112 4113 4114 4116 4117 4118 4121 4123` |

The four stats a DPS cares about, by id:

| stat | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|
| ATK % | 4101 | 4201 | 4301 | 4401 | 4501 |
| CRIT Rate | 4107 | 4207 | 4307 | 4407 | 4507 |
| CRIT DMG Bonus | 4112 | 4212 | 4312 | 4412 | 4512 |
| P-DMG Bonus | 4114 | 4214 | 4314 | 4414 | 4514 |

### 5.0 ⚠ Two different item families are both called "T1–T4 stones"

This trips everyone, including this report at one point. They share nothing but the naming scheme:

| | **Awakening Stone** `1201–1224` | **Refine Stone** `4101–4524` |
|---|---|---|
| In-game name | `T2 Hefty Awakening Stone` | `T2 CRIT Stone` |
| Icon | `A_UI_Props_AwakeThick02` (Hefty), `…AwakeSwift…`, `…AwakeMystery…` | `A_UI_Props_WanOu` — one icon for all 120 |
| Varies by | artifact **type** (Hefty/Nimble/Arcane) × tier | **stat** × tier |
| What it does | **Tier up the artifact = unlock one more Awakened Effect slot.** 1× per tier | Adds weight to one stat in a refine |
| Used when refining | **never** | only there |
| Source | idle drops, Conquest auction, crafting — §5.2 | **unknown** — §5.1 |

`equip_awake.json.awake_cost` is always `[103, 12xx, 1]`. Confirmed live from the Awakening screen:
*"Spend 🔺 T2 Hefty Awakening Stone x1 to Awaken Artifact Tier 2 — Owned 3"*.

### 5.1 Where the *refine* stones come from — **still unknown**

The shipped config contains **no grant of items 4101–4524 anywhere**. Verified twice, both directions:

* Reward-shape scan (`[103, 4xxx, n]`, `{type:103, id:4xxx, num:…}`) across all 13 snapshots
  (11 Global + 2 CN): **0 hits**. Not craftable — `item_synthesis.json` holds only the 1201–1224
  awakening-stone chain.
* Exhaustive integer scan of every config file for the 120 ids, then classified by field name. Every
  hit is a numeric collision with something else — stage ids, wave ids, shrine levels, shop row ids.
  The three that looked promising all resolve to non-stones:

  | table | field | what it actually is |
  |---|---|---|
  | `alliance/alliance_wandering_shop.json` | `goods: [4101,4201,4301,4401]` | `shop_goods_info` **row ids** |
  | `shop/shop_goods_info.json` | `id: 4101…4424` | rows that grant `[107, 0, 80]` = **80 gems** |
  | `active/active_mystery_shop/active_gacha_mystery_*.json` | `goods_id: 4111…` | mystery-shop **row ids**, reward is item 1013 |

* Odyssey (the `bag-battle` feature) was checked specifically, because of an initial report that stones
  drop there. Its entire reward surface is **items 1009, 1010, 1013, 1025 and gems** —
  `bag_battle_wave.rewards` has exactly five distinct entries, none a 4xxx stone, and
  `bag_battle_chapter.json` carries no reward field. **That report turned out to be about the
  Awakening Stones of §5.0, not these.**

**Conclusion: no source is known for any of the 120 refine stones.** Per the CLAUDE.md caveat a missing
reward entry is not proof the source does not exist — but nothing confirms one either. Until a player
observes one dropping, treat §8's stone tables as *what the stones would do*, and §8.4's spare-artifact
numbers as what you can actually reach today. See R2 in §12.

### 5.2 Where the *awakening* stones come from — resolved

| Route | Detail |
|---|---|
| **Idle / AFK drops** | via the chest items `1714–1717` (`Random T1–T4 Awakening Stone`, icon `A_UI_Props_EquipAwakeChest1–4`), each granting 1 random stone of the three types at equal odds. Gated by campaign stage — see below |
| **Alliance Conquest auction** | `conquest_auction_rewards` rows `421301–421403` — **T1 only** (1201 / 1211 / 1221) |
| **Crafting** | `item_synthesis.json`: **3× lower tier + 3× catalyst (1814 / 1815 / 1816) → 1× next tier** |

Idle-drop unlock stages (`idle/stage_idle_show.json`):

| Item | First appears at campaign stage |
|---|---:|
| **Refining Stone** `1034` — the refine cost | **3001** |
| `Random T1 Awakening Stone` `1714` | **3001** |
| `Random T2 Awakening Stone` `1715` | **4001** |
| `Random T3 Awakening Stone` `1716` | **4801** |
| `Random T4 Awakening Stone` `1717` | **5401** |

Note the first row: **item 1034 is an idle drop**, which the awakening report's §8 missed — it listed
only the two shop rows and the auction. Refining Stones are farmable from stage 3001 onward, which
makes the retry policies in §10.2 considerably more attractive than their gem price suggests.

Shrine level also gates the tier-ups themselves: `EQUIP_AWAKE_SHRINE_LEVEL_LIMIT = [0, 22, 25, 27]`,
indexed by current tier. Confirmed live: *"T3 Awakening is unlocked at Shrine Lv.25."* on a Tier-2
artifact.

---

## 6. The math

### 6.1 The algorithm (`EquipAwakeAttrProbCalculator.calcInner`) — confirmed

```
w[a] = 1000                                        for every candidate a of the slot
w[a] += Σ(material deltas)  , clamped at >= 0
drop every key that is not in the slot's 12-stat pool
locked stats: p = 1, removed from the pool
k = number of UNLOCKED awakened effects

loop while k > 0:
    for a: if w[a]*k / Σw < 0.01  -> drop a from the pool          # MIN_PROB floor
    for a: if w[a]*k / Σw >= 1.0  -> p[a] = 1, remove, k -= 1, restart loop   # MAX_PROB pin
    otherwise: p[a] = w[a]*k / Σw for all remaining, done
```

`k` is `attrs.length − lockedCount`, i.e. **your Awakened Tier minus how many effects you locked**.
Probabilities always sum to `k`.

### 6.2 The two thresholds that drive everything

With an untouched 12-stat pool (rivals at 1000 each, `Σ_rivals = 11000`) and one target of weight `W`:

| | condition | needed `W` |
|---|---|---:|
| **Pin at 100 %, `k ≥ 2`** | `W·k/(W+11000) ≥ 1` | `W ≥ 11000/(k−1)` |
| **Pin at 100 %, `k = 1`** | impossible above; only the 1 % floor works: `1000/(W+11000) < 0.01` | `W ≥ 89 001` |

| k (open slots) | `W` needed | stones needed on top of the base 1000 |
|---:|---:|---|
| 4 | 3 667 | T1 ×3 · T2 ×2 · T3 ×1 · T4 ×1 · T5 ×1 |
| 3 | 5 500 | T1 ×5 · T2 ×3 · T3 ×2 · T4 ×1 · T5 ×1 |
| 2 | 11 000 | T1 ×10 · T2 ×5 · T3 ×3 · T4 ×2 · T5 ×1 |
| **1** | **89 001** | **T1 ×89 · T2 ×45 · T3 ×23 · T4 ×12 · T5 ×1** |

**That `k = 1` row is the whole strategy problem.** Guaranteeing the fourth stat costs 24× what
guaranteeing the first one costs.

### 6.3 Live verification — exact

Your screenshots, reproduced by the model to the last digit. Tier-1 artifact in **slot 4**, one unlocked
effect (`k = 1`), **4× quality-13 `Hefty · Water` (equip 130102)** loaded:

| stat | weight | model | **panel** |
|---|---:|---:|---:|
| HP % | 1000 + 4×200 = **1800** | 16.544 % | **16.5 %** |
| Healing Eff. | 1000 + 4×100 = **1400** | 12.868 % | **12.9 %** |
| Recharge Eff. | **1400** | 12.868 % | **12.9 %** |
| Armor %, Hit Bonus, CRIT DMG, M-DMG, P-DMG, Control RES, Effect RES | 1000 − 4×40 = **840** | 7.721 % | **7.7 %** |
| CRIT Rate | 1000 − 4×200 = **200** | 1.838 % | **1.8 %** |
| ATK SPD Bonus | **200** | 1.838 % | **1.8 %** |

12/12 match. The empty-material screenshot (`8.3 %` across the board = 1/12) matches too. The
`Info` toggle simply swaps the full 12-row `All possible stats and rates` panel for the top-4
`High-Chance Stat` view (`sortedTotalAttrIds`, sorted by probability descending) plus your current
effect at the top.

---

## 7. ⚠ The `reduce` column of the 120 stones is dead code

`ui/UIEquipmentAwakeAttrsRefresh.js:454` (0731 build; :421 in every other Global and CN build):

```js
store.detailResultAttrNodes.forEach((_, id) => id !== attrId && reduceWeights.set(id, reduceWeight));
```

`detailResultAttrNodes` is an **Array**, so `forEach`'s second argument is the array **index 0…11**, not
the attribute id. `reduceWeights` therefore comes out keyed `{0: −50, 1: −50, …}`. `calcInner` then does
`weights.forEach((_, attrId) => !attrIds.includes(attrId) && weights.delete(attrId))` and throws all of
it away.

**Net effect: a refine stone only adds to its own stat; it never suppresses the other eleven.**

* Present in **every** build inspected — Global `20260618`, `20260713`, `20260720`, `20260731`, and CN
  `20260731`, `20260807`. Not a recent regression.
* **Equip materials are not affected** — they build `reduceWeights` from `affect_weight`'s real ids, and
  §6.3 proves their negatives land.
* This invalidates two claims in the awakening report's §6.2: *"the `reduce` clamp at weight 0 also
  guarantees — q10 ×3, q8 ×5, q6 ×10, q4 ×20"* is false on the shipped client. Only the `+100 000`
  T5 stone still guarantees at `k = 1`, and it does so through the 1 % floor, not through `reduce`.

Both models are tabulated below and both are in the JSON, because **the server side is untested** —
see R1 in §12 for the one-item experiment that settles it.

---

## 8. Probability tables

### 8.1 One target, stones only, **1 open slot** (Tier 1, or Tier 2–4 with everything else locked)

`shipped` = what the game computes today. `designed` = if `reduce` worked.

| stones | T1 | T2 | T3 | T4 | T5 | ‖ | T1\* | T2\* | T3\* | T4\* |
|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| 0 | 8.3 % | 8.3 % | 8.3 % | 8.3 % | 8.3 % | | 8.3 % | 8.3 % | 8.3 % | 8.3 % |
| 1 | 15.4 % | 21.4 % | 31.3 % | 45.0 % | **100 %** | | 16.1 % | 23.3 % | 36.2 % | 57.7 % |
| 2 | 21.4 % | 31.3 % | 45.0 % | 60.7 % | 100 % | | 23.3 % | 36.2 % | 57.7 % | 88.5 % |
| 3 | 26.7 % | 38.9 % | 54.2 % | 69.4 % | 100 % | | 30.0 % | 47.6 % | 74.7 % | **100 %** |
| 4 | 31.3 % | 45.0 % | 60.7 % | 75.0 % | 100 % | | 36.2 % | 57.7 % | 88.5 % | 100 % |
| 5 | 35.3 % | 50.0 % | 65.6 % | 78.8 % | 100 % | | 42.1 % | 66.7 % | **100 %** | 100 % |
| 8 | 45.0 % | 60.7 % | 75.0 % | 85.5 % | 100 % | | 57.7 % | 88.5 % | 100 % | 100 % |
| 10 | 50.0 % | 65.6 % | 78.8 % | 88.0 % | 100 % | | 66.7 % | **100 %** | 100 % | 100 % |
| 12 | 54.2 % | 69.4 % | 81.7 % | **100 %** | 100 % | | 74.7 % | 100 % | 100 % | 100 % |
| 17 | 62.1 % | 76.1 % | 86.3 % | 100 % | 100 % | | **100 %** | 100 % | 100 % | 100 % |
| 23 | 68.6 % | 81.0 % | **100 %** | 100 % | 100 % | | 100 % | 100 % | 100 % | 100 % |
| 45 | 78.8 % | **100 %** | 100 % | 100 % | 100 % | | 100 % | 100 % | 100 % | 100 % |
| 89 | **100 %** | 100 % | 100 % | 100 % | 100 % | | 100 % | 100 % | 100 % | 100 % |

The jumps to 100 % are the 1 % floor firing, not a smooth approach — right up to the threshold the curve
is still in the 70–80 % range.

### 8.2 One target, stones only, by open slots (shipped model)

| stones | k=1 | k=2 | k=3 | k=4 | | k=1 | k=2 | k=3 | k=4 |
|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| | **T1** | | | | | **T4** | | | |
| 0 | 8.3 % | 16.7 % | 25.0 % | 33.3 % | | 8.3 % | 16.7 % | 25.0 % | 33.3 % |
| 1 | 15.4 % | 30.8 % | 46.2 % | 61.5 % | | 45.0 % | 90.0 % | **100 %** | **100 %** |
| 2 | 21.4 % | 42.9 % | 64.3 % | 85.7 % | | 60.7 % | **100 %** | 100 % | 100 % |
| 3 | 26.7 % | 53.3 % | 80.0 % | **100 %** | | 69.4 % | 100 % | 100 % | 100 % |
| 5 | 35.3 % | 70.6 % | **100 %** | 100 % | | 78.8 % | 100 % | 100 % | 100 % |
| 10 | 50.0 % | **100 %** | 100 % | 100 % | | 88.0 % | 100 % | 100 % | 100 % |
| 12 | 54.2 % | 100 % | 100 % | 100 % | | **100 %** | 100 % | 100 % | 100 % |

### 8.3 Stones **per target** to pin `m` stats at 100 % with `k` open slots (shipped model)

| k | m | T1 | T2 | T3 | T4 | T5 |
|---:|---:|---:|---:|---:|---:|---:|
| 4 | 1 | 3 | 2 | 1 | 1 | 1 |
| 4 | 2 | 4 | 2 | 1 | 1 | 1 |
| 4 | 3 | 8 | 4 | 2 | 1 | 1 |
| 4 | **4** | **98** | **49** | **25** | **13** | **1** |
| 3 | 1 | 5 | 3 | 2 | 1 | 1 |
| 3 | 2 | 9 | 5 | 3 | 2 | 1 |
| 3 | **3** | **97** | **49** | **25** | **13** | **1** |
| 2 | 1 | 10 | 5 | 3 | 2 | 1 |
| 2 | **2** | **95** | **48** | **24** | **12** | **1** |
| 1 | **1** | **89** | **45** | **23** | **12** | **1** |

**Read the bold rows.** Pinning *all* your open slots is always ~10–25× the cost of pinning all but one,
because the last one has to be forced through the 1 % floor.

### 8.4 Spare artifacts only, no stones

`n` copies of the `+200` family for the target (quality 13):

| n | k=1 | k=2 | k=3 | k=4 |
|---:|---:|---:|---:|---:|
| 1 | 9.9 % | 19.8 % | 29.7 % | 39.6 % |
| 2 | 11.4 % | 22.9 % | 34.3 % | 45.8 % |
| 3 | 12.9 % | 25.9 % | 38.8 % | 51.8 % |
| 5 | 15.9 % | 31.7 % | 47.6 % | 63.5 % |
| 10 | 21.1 % | 42.3 % | 63.4 % | 84.5 % |
| 20 | 28.7 % | 57.5 % | 86.2 % | **100 %** |
| 30 | 31.8 % | 63.6 % | 95.5 % | 100 % |

(exact per-slot/per-stat values are in the JSON; they vary by ±3 points depending on how many of the
family's `−200`s land inside that slot's pool)

A mixed loadout beats a single family, but not by much. Best 4-target loadouts for
**slot 1 / Tier 4 / ATK % + CRIT Rate + CRIT DMG + P-DMG**:

| loadout (q13 fodder) | ATK % | CRIT Rate | CRIT DMG | P-DMG | E[targets hit of 4] |
|---|---:|---:|---:|---:|---:|
| nothing | 33.3 | 33.3 | 33.3 | 33.3 | 1.33 |
| 10× Nimble·Wind | 84.5 | 16.9 | 16.9 | 84.5 | 2.03 |
| 4× Nimble·Wind + 4× Arcane·Flame | 52.9 | 21.9 | 52.9 | 52.9 | 1.81 |
| 8× Nimble·Wind + 8× Arcane·Flame + 4× Arcane·Wind | 74.7 | 32.3 | 59.1 | 41.2 | **2.07** |

**Twenty quality-13 artifacts buy you 0.7 extra hits out of 4.** Spare artifacts are a nudge; the stones
are the actual tool. Plan accordingly.

### 8.5 Marginals vs. the joint outcome

`calcInner` returns **marginals**. How the server turns `k` marginals into `k` distinct stats is not in
the client. Any stat the calculator pins at `p = 1` is deterministic under every scheme, so §8.3 is
model-independent — but the sub-100 % numbers are not:

| slot 1, Tier 4, T4 stone ×2 on each of 4 targets | value |
|---|---:|
| marginal the client displays | 89.5 % |
| marginal under weighted sampling *without replacement* | 83.2 % |
| P(all four targets land in one roll) | **42.6 %** |

Do not read "89 % each" as "89 % chance of the set". The set probability with 8 T4 stones is 43 %.

---

## 9. Levels are re-rolled too

Carried over from the awakening report §6.5 and unchanged here: **a refined effect does not keep its
enhancement level.** Working model from 7 live samples — the new level is drawn uniformly from
`1 … current level`, i.e. a refine **halves your invested Hammer levels in expectation** and can never
raise them.

This is what makes the order of operations non-negotiable: **refine first, enhance second.**

---

## 10. The playbook

### 10.1 Order of operations

```
1. Get the artifact to Tier 4 FIRST.                 (4 open slots = cheapest refining)
2. Refine at k = 4 with materials on THREE targets.  (T4 x1 each = 3 stones -> all three at 100%)
   The 4th effect is a free random draw from the remaining nine.
   -> Give up / Save: you may reject the roll and keep what you had.
3. Fate-lock the three you pinned. (3x item 1035, refunded when you unlock)
4. Refine again at k = 1 for the fourth stat.        (the expensive one: T4 x12 or T5 x1)
5. ONLY NOW spend Hammers (item 1200) on levels.
```

Cost of the full "four chosen stats on one slot-1 artifact", stones only:

| stone tier used | one refine, pin all 4 | **staged (pin 3 → lock 3 → pin 1)** |
|---|---:|---:|
| T1 | 392 stones, 1 Refining Stone | **113 stones**, 2 Refining Stones, 3 locks |
| T2 | 196 | **57** |
| T3 | 100 | **29** |
| T4 | 52 | **15** |
| T5 | 4 | 4 |

The staged route is **3.5× cheaper** at every tier below T5.

### 10.1b The plan if refine stones turn out to be obtainable — **T3 example**

No source is confirmed for any refine stone (§5.1). If they do exist on your account, this is the
shape to follow; T3 is used as the worked example. If they don't, skip to §10.1c.

| step | k | materials | outcome |
|---|---:|---|---|
| 1. Tier the artifact to 4 | — | awakening stones | 4 open effects |
| 2. Refine | 4 | **2× T3 stone on each of 3 targets = 6 stones** + 1× Refining Stone | those 3 land at **100 %** |
| 3. Fate-lock those 3 | — | 3× item 1035 (refunded on unlock) | k drops to 1 |
| 4. Refine for the 4th | 1 | **23× T3 stone** guaranteed — *or* retry cheaply, below | 4th stat |
| 5. Hammers | — | item 1200 | levels |

**Guaranteed total: 29 T3 stones, 2 Refining Stones, 3 Fate locks.**

### 10.2 Step 4 the cheap way — retry instead of guarantee

At `k = 1` you can trade stones for Refining Stones. Reject-and-retry is legal (`Give up.` on the
confirm window), so per attempt: `n` stones + 1× Refining Stone (item 1034, **1 200 gems**).

| T3 stones per attempt | hit rate | E[T3 stones] to succeed | E[Refining Stones] |
|---:|---:|---:|---:|
| **1** | 31.3 % | **3.2** | 3.20 |
| 2 | 45.0 % | 4.4 | 2.22 |
| 3 | 54.2 % | 5.5 | 1.85 |
| 5 | 65.6 % | 7.6 | 1.52 |
| 8 | 75.0 % | 10.7 | 1.33 |
| 12 | 81.7 % | 14.7 | 1.22 |
| **23** | **100 %** | 23.0 | 1.00 |

The two resources pull in opposite directions: **stones-per-success is minimised at n = 1, Refining-
Stones-per-success is minimised by stacking.** Pick by whichever is scarcer for you. Full staged cost:

| step-4 policy | T3 stones (total incl. step 2) | Refining Stones |
|---|---:|---:|
| 1 stone/attempt | **9.2** | 4.2 |
| 3 stones/attempt | 11.5 | 2.9 |
| 8 stones/attempt | 16.7 | 2.3 |
| guarantee (23) | 29.0 | 2.0 |

Same shape at the other tiers: T2 → 16.7 stones + 5.7 Refining Stones on the n=1 policy (vs 57
guaranteed); T1 → 30.5 + 7.5 (vs 113).

This mirrors the Hammer result in the awakening report — but note the **opposite** conclusion: hammers
want you to stack to ≈75–80 %, refines want you to stack only if Refining Stones are your bottleneck.
The difference is that a failed refine costs you nothing but the materials, while a failed enhance
costs a level.

### 10.1c The plan with **no refine stones at all** — spare artifacts only

This is the version everyone can run today. Stones aside, the two structural facts still do all the work:
Tier 4 first, and don't lock early.

1. **Tier to 4.** Idle drops give you the Awakening Stones (§5.2); craft upward 3:1 if you are short.
2. **Refine at k = 4 with fodder, never at k = 1.** Four open slots quadruple every stat's chance for
   free — a target sits at 33.3 % before you add a single material, versus 8.3 % at Tier 1.
3. **Feed only quality 12–13 fodder, and only families that don't fight each other.** For a slot-1
   physical DPS that is `Nimble · Wind` — it is +200 on both ATK % and P-DMG and its two penalties miss
   everything you want. Ten of them puts ATK % and P-DMG at **84.5 % each** with 4 slots open (§8.4).
4. **Reject bad rolls.** Rejecting costs the materials, not a Refining Stone's worth of progress, and
   1034 is an idle drop from stage 3001 — retrying is cheap on this route.
5. **Lock only what you are keeping, and only once you stop refining that artifact.**

Realistic expectation: you will land **two of four** target stats reliably (E[hits] ≈ 2.07 with 20 q13
artifacts) and grind the rest. That is the honest ceiling without stones.

### 10.2b If you ever get T4/T5 stones

Same staged shape, one order of magnitude cheaper: **3× T4 (pin three at k=4) + 12× T4 or 1× T5
(pin the fourth at k=1)** = 15 T4 stones, or 4 stones flat if all five tiers are available.
On the retry policy, T4 ×1 per attempt at 45.0 % costs E = 2.2 T4 stones + 2.2 Refining Stones for
step 4 — so the whole artifact lands at ~5 T4 stones expected.

### 10.3 Target sets worth building

| hero role | artifact slot | the four to pin |
|---|---|---|
| Physical DPS | **1 · Wind** | ATK %, CRIT Rate, CRIT DMG Bonus, P-DMG Bonus |
| Physical DPS | 4 · Terra | CRIT Rate, CRIT DMG Bonus, P-DMG Bonus, ATK SPD Bonus *(no ATK % on slot 4)* |
| Magic DPS | 1 · Wind | ATK %, CRIT Rate, CRIT DMG Bonus, M-DMG Bonus |
| Magic DPS | 4 · Terra | CRIT Rate, CRIT DMG Bonus, M-DMG Bonus, Hit Bonus |
| Ult-cycler | 1 · Wind or 3 · Flame | Ultimate Power, Cooldown Haste, ATK %, Effect Hit |
| Controller | 3 · Flame | Control Bonus, Effect Hit, ATK %, Cooldown Haste |
| Tank | 2 · Water | HP %, Armor %, M-RES %, CRIT DMG RED |
| Healer | 2 · Water | Healing Eff., Recharge Eff., HP %, Control RES |

Note **CRIT DMG Bonus caps at 50 % @Lv20 while ATK % caps at 20 %** — if you can only force three stats,
drop ATK % (20 % ceiling, growth tier D) before dropping CRIT DMG (50 %, tier A).

### 10.4 Do not

* **Do not lock before you have to.** Every Fate lock removes an effect from the pool and drops `k` by 1,
  which makes the *remaining* rolls dramatically more expensive (§6.2). Lock only between the staged
  refines in §10.1.
* **Do not refine a well-enhanced artifact.** Levels are re-rolled (§9).
* **Do not feed sub-quality-12 spare artifacts.** A q8 artifact moves the odds by ~1 point.
* **Do not feed `Arcane · Wind` when you want P-DMG** (−200) or `Hefty · Wind` when you want CRIT DMG
  (−200). The `Quick Apply` / `Fill` button does not know your other three targets — it only optimises
  the currently filtered stat and will happily wreck the rest.

---

## 11. Economy

| Item | Role | Sources found in config |
|---|---|---|
| **1034** Refining Stone | 1 per refine attempt | **Idle drops from campaign stage 3001**; Shop `100018` (1× / **1 200 gems**), `100019` (1× / **20 000 000 gold**); Alliance Conquest auction (2×, 3×); weekly mini-game exchange (5×) |
| **1035** Fate lock | 1 per locked effect, **refunded on unlock** | Shop `100023` (1× / **7 500 gems**) |
| **1201–1224** Awakening Stones | tier up = unlock a slot; **not** a refine material | Idle drops via chests `1714–1717` (T1 @ 3001, T2 @ 4001, T3 @ 4801, T4 @ 5401); Conquest auction (T1); craft 3:1 + catalyst |
| **4101–4524** refine stones | the precision tool, if it is obtainable | **no source in any of the 13 snapshots** |
| **1200** Artifact Enhancement Stone | the Hammer, see the awakening report | Shop `100020/21/22`, Shrine tasks, Conquest auction, mini-games |

Currency ids (`ERewardType`): **104 = COIN** (gold), **107 = DIAMOND** (gems), 103 = ITEM, 102 = EQUIPS.

At list price the staged §10.1 route costs **2× 1034 (2 400 gems) + 3× 1035 (22 500 gems, refundable)**
on top of whatever the 4xxx stones turn out to cost. The lock refund makes locking effectively free in
gems, only gated by owning three of them at once.

---

## 12. Open questions

**R1 — does the SERVER apply the stones' `reduce` column?** The client provably cannot (§7). One
cheap experiment settles it: on a **Tier-1** artifact, load **exactly one T1 stone** for any stat in
that slot's pool and read the panel.
`15.4 %` ⇒ the shipped/no-reduce model is what the game uses.
`16.1 %` ⇒ the client is somehow applying reduce after all and §7 is wrong.
Everything in §8 is tabulated under both models, so this flips a column, not the report.

**R2 — where do items 4101–4524 come from? STILL OPEN — see §5.1.**
An earlier draft of this report recorded them as an Odyssey drop. That was a naming collision: the
player report was about the **Awakening Stones** `1201–1224` (§5.0), which tier the artifact up and are
never used in a refine. Their source is now resolved (§5.2). The *refine* stones remain sourceless:
zero reward-shaped references in 13 snapshots, not craftable, and every integer hit in every config
file is a collision with a stage id, shop row id or level number.

Practical stance until one is observed: **the 120 refine stones may not be obtainable at all.** Plan
with spare artifacts (§8.4) and treat the stone tables as the ceiling of what the system permits.

**~~R2b — where do the awakening stones come from?~~ RESOLVED — see §5.2.**
Idle/AFK drops via chest items `1714–1717`, gated by campaign stage (T1 at 3001 → T4 at 5401);
Conquest auction for T1; craftable 3:1 upward. Same scan turned up that **Refining Stone `1034`
is also an idle drop from stage 3001**.

**R3 — EN display names of the 12 artifact families.** The RAM harvest is alphabetically sorted, so
`tid#EquipName1301xx` can't be mapped from it. Candidate strings are present
(`Chalice of Divine Grace`, `Beads of Divine Guarding`, `Coronet of Oath`, `Horn of Desire`,
`Hammer of Golden Touch`, `Diadem of Twin Souls`, `Branch of Sylvan Myriads`, …) but unassigned.
One `set_text` capture on the refine material list fixes this.

**R4 — the sampling scheme behind the marginals** (§8.5). Only affects sub-100 % planning; the pin
thresholds hold regardless. Distinguishable by logging ~50 multi-slot refine outcomes.

---

## 13. Files

| File | Contents |
|---|---|
| `ARTIFACT_REFINEMENT_RESEARCH.md` | this document |
| `artifact_refinement_data.json` | pools by slot, 12 equip families with full weights and all 13 quality ids, 24-stat index (ceiling, slots, ±families, all 5 stone ids), all 120 stones, the calcInner port's output tables (shipped + designed) for k=1…4 and n=0…25, pin thresholds, equip-only curves per slot and stat, route costs, the live verification record, open questions |
| `ARTIFACT_AWAKENING_RESEARCH.md` | the Awaken/Enhance half (Hammers, level table, success ladder) |
| `artifact_awakening_data.json` | its companion — note §0 corrections apply to its §3 and §6.2 |

Raw sources — config (`20260807_093439`, `region_02`):
`client/config/equip_awake/{equip_awake,equip_awake_attr,equip_awake_constant}.json`,
`client/config/equip/equip_detail.json`, `client/config/item.json`, `client/config/item_synthesis.json`.
Client logic (`20260731_115343`, `region_04`):
`client/dist/default/equipment/equip-awake/EquipAwakeAttrProbCalculator.js`,
`ui/UIEquipmentAwakeAttrsRefresh.js`, `ui/EquipmentAwakeRefreshMaterialCell.js`,
`ui/UIEquipmentAwakeRefreshConfirm.js`, `EquipmentAwakeSystem.js`.

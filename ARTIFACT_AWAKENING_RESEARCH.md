# Artifact Awakening / Enhancement / Refinement — Data Mining Report

**Purpose:** everything needed to build an interactive *Artifact Enhancement Stone (Hammer)* calculator,
plus the surrounding Awaken/Refine systems it depends on.

**Client:** GLOBAL (`com.goatgames.mot.gb.gp`) — verified.
**Config source:** `live_extractions/20260807_093439/unpacked/region_02/client/config/`
**Logic source:** `live_extractions/20260731_115343/unpacked/region_04/client/dist/default/equipment/equip-awake/`
(the 0807 run has no `dist/`; the 0731 run is the newest one that does)

> **Cross-client note.** `equip_awake.json` and `equip_awake_attr.json` are **byte-identical in every
> Global run since 2026-06-12 *and* byte-identical in the CN client** — every number in §2–§5 is the shared
> Global+CN ruleset, not a Global-only snapshot.
> `equip_awake_constant.json` differs by exactly **one key**: Global carries
> `EQUIP_AWAKE_REFRESH_MAX_PROB: 1`, CN does not (CN hardcodes the same `1` in the calculator).
> One behavioural divergence follows from that split — see §5.5.

> **Housekeeping:** `CLAUDE.md` still says `latest → 20260731_115343 / region_04`. The symlink has moved to
> `20260807_093439 / region_02`. Config tree found via `client/config/hero_detail.json` as documented.

Machine-readable companion: **`artifact_awakening_data.json`** (all tables below, plus all 156 equips and
all 120 refine materials, in one file).

---

## 1. The feature chain

```
Artifact (equip)  ──lv 5 + quality 13 + race match──▶  AWAKEN (Tier 1)
      │                                                    │
      │                                     Tier 1→2→3→4 (Shrine-gated, costs Awaken items)
      │                                                    │
      │                                         each Tier = +1 Awakened Effect slot
      │                                                    │
      │                          ┌─────────────────────────┴──────────────────────────┐
      │                          ▼                                                     ▼
      │              ENHANCED EFFECT (Hammers)                              REFINEMENT EFFECT
      │              raise one stat's LEVEL 1→20                            re-roll WHICH stats you have
      │              fail ⇒ level −1                                        weights pushed by materials
```

UI strings (captured live from the Global client, `set_text` hook):

| Screen / control | EN text |
|---|---|
| Awaken entry button on the artifact popup | `Awaken` |
| Awaken screen | `Artifact Awakening` |
| Tier row | `Awakened Tier` · `Tier 1` → `Tier 2` · `Tier 2 (Awakened)` |
| Rolled stats block | `Awakened Effect` · `Awaken to Tier 2/3/4 to unlock effect.` |
| Hammer screen | `Enhanced Effect` · `Enhancement Explanation` · `Success Rate: NN%` |
| Refine screen | `Refinement Effect` · `Rate Preview` · `All possible stats and rates` · `Rate Increase` · `Quick Apply` · `Refine` |
| Refine help text | *"Some materials will boost the chance of gaining certain stats. If not locked, all of the above types will be refined in one go."* |
| Enhance warning | *"When enhancing, unlocked Awakened Effects may change."* |
| Item 1200 tooltip | *"Used to enhance Awakened Artifact. Each enhancement attempt has a chance to fail. On failure, the affected attribute's level −1."* |

---

## 2. Awakening (prerequisite layer)

`equip_awake/equip_awake.json` — 48 rows = **3 artifact types × 4 slots × 4 tiers**.

Unlock conditions (`equip-awake/Public.js`):
* equip template has an `awake_id`
* `equip.lv >= template.lv_limit` → **level 5**
* equip **race** (`Suit Bonus`, rolled per instance) == hero's race
* equip quality ≥ `UNLOCK_EQUIP_AWAKE_QUALITY` = **13** (only the 12 quality-13 equips `130101…130304` carry `awake_id`)
* once awakened the artifact is **bound to that hero** (`awake.hero_id`)

| Tier (`quality`) | Awakened Effect slots (`num_attr`) | Shrine level required to reach it |
|---|---|---|
| 1 | 1 | — (0) |
| 2 | 2 | **22** |
| 3 | 3 | **25** |
| 4 | 4 | **27** |

`EQUIP_AWAKE_SHRINE_LEVEL_LIMIT = [0, 22, 25, 27]`, indexed by the *current* tier.

Tier-up cost — one item per type/tier (`awake_cost`, always ×1):

| Artifact type | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| 1 `Heavy` (力量) | 1201 | 1202 | 1203 | 1204 |
| 2 `Clever` → EN **"Nimble"** (敏捷) | 1211 | 1212 | 1213 | 1214 |
| 3 `Wisdom` (智力) | 1221 | 1222 | 1223 | 1224 |

Craftable upward (`item_synthesis.json`): **3× lower-tier item + 3× catalyst (1814 / 1815 / 1816) → 1× next tier**.

**First awakening rolls the starting stat automatically** — uniformly over the slot's 12 candidates
(no material input possible at that point), at **level 1**.

Base stats also scale with tier (example, type 2 / slot 1):
`Tier 1 = ATK 180000, CRIT Rate 14.4%, P-DMG Bonus 7.5%` → `Tier 2 = ATK 270000, …`
(full `base_attr` per tier in the JSON bundle).

---

## 3. The 24 Awakened-Effect stats

Every slot has a **fixed pool of 12 candidates**. Slots 1 & 3 share the "offensive" 12, slots 2 & 4 the
"defensive" 12 — but the two halves are **not** identical between slot 1 and slot 3 (see JSON).

**Slot 1 & 2 pools, in the exact order the game lists them** (verified 1:1 against the live
`All possible stats and rates` panel):

| # | Slot 1 / 3 pool | id | Slot 2 / 4 pool | id |
|---|---|---|---|---|
| 1 | ATK (%) | 1901 | HP (%) | 1902 |
| 2 | Hit Bonus | 905 | Armor (%) | 1941 |
| 3 | CRIT Rate | 906 | M-RES (%) | 1942 |
| 4 | Lifesteal Effectiveness | 918 | Dodge Rate | 904 |
| 5 | CRIT DMG Bonus | 919 | CRIT RES | 907 |
| 6 | M-DMG Bonus | 924 | M-DMG RED Rate | 908 |
| 7 | P-DMG Bonus | 925 | P-DMG RED Rate | 909 |
| 8 | Cooldown Haste | 926 | Healing Effectiveness | 927 |
| 9 | Control Bonus | 932 | Recharge Effectiveness | 928 |
| 10 | Effect Hit | 945 | Control RES | 929 |
| 11 | ATK SPD Bonus | 915 | CRIT DMG RED | 940 |
| 12 | Ultimate Power | 949 | Effect RES | 944 |

Exact per-slot pools (`random_attr` in `equip_awake.json`):

* **pos 1** — `1901, 905, 906, 918, 919, 924, 925, 926, 932, 945, 915, 949`
* **pos 2** — `1902, 1941, 1942, 904, 907, 908, 909, 927, 928, 929, 940, 944`
* **pos 3** — `1901, 1942, 904, 907, 908, 909, 918, 926, 932, 940, 945, 949`
* **pos 4** — `1902, 1941, 905, 906, 919, 924, 925, 927, 928, 929, 944, 915`

All stats are percentages. `1901/1902/1941/1942` are the *percent* variants of ATK/HP/Armor/M-RES
(`base_on_id` 901/902/941/942).

---

## 4. Level → value table (`equip_awake_attr.json`)

**Max level = 20.** Every stat starts at level 1 = 1.0 %. The stats fall into **four growth tiers**:

| Tier | Max @ Lv20 | Stats |
|---|---|---|
| **A** | 50 % | CRIT DMG Bonus 919, Control RES 929, Control Bonus 932, CRIT DMG RED 940, Effect RES 944, Effect Hit 945 |
| **B** | 40 % | Dodge 904, Hit Bonus 905, CRIT Rate 906, CRIT RES 907, Lifesteal 918, Healing 927, Recharge 928 |
| **C** | 30 % | M-DMG RED 908, P-DMG RED 909, M-DMG Bonus 924, P-DMG Bonus 925, Armor% 1941, M-RES% 1942 |
| **D** | 20 % | ATK SPD 915, Cooldown Haste 926, Ultimate Power 949, **ATK% 1901**, **HP% 1902** |

| Lv | **Success %** (base, 1 stone) | A | B | C | D |
|---:|---:|---:|---:|---:|---:|
| 1 | 100 | 1.0 | 1.0 | 1.0 | 1.0 |
| 2 | 100 | 1.2 | 1.2 | 1.2 | 1.2 |
| 3 | 100 | 1.5 | 1.5 | 1.5 | 1.5 |
| 4 | 95 | 2.0 | 2.0 | 2.0 | 2.0 |
| 5 | 95 | 2.5 | 2.5 | 2.5 | 2.5 |
| 6 | 90 | 4.5 | 4.0 | 3.5 | 3.0 |
| 7 | 80 | 6.5 | 5.5 | 4.5 | 3.5 |
| 8 | 70 | 8.5 | 7.0 | 5.5 | 4.0 |
| 9 | 60 | 10.5 | 8.5 | 6.5 | 4.5 |
| 10 | 50 | 12.5 | 10.0 | 7.5 | 5.0 |
| 11 | 40 | 15.0 | 12.0 | 9.0 | 6.0 |
| 12 | 35 | 17.5 | 14.0 | 10.5 | 7.0 |
| 13 | 30 | 20.0 | 16.0 | 12.0 | 8.0 |
| 14 | 25 | 22.5 | 18.0 | 13.5 | 9.0 |
| 15 | 20 | 25.0 | 20.0 | 15.0 | 10.0 |
| 16 | 16 | 30.0 | 24.0 | 18.0 | 12.0 |
| 17 | 12 | 35.0 | 28.0 | 21.0 | 14.0 |
| 18 | 8 | 40.0 | 32.0 | 24.0 | 16.0 |
| 19 | 4 | 45.0 | 36.0 | 27.0 | 18.0 |
| 20 | **0** | 50.0 | 40.0 | 30.0 | 20.0 |

`success` at level 20 is `0` = terminal; the UI hides the button and shows `EQUIP_AWAKE_ATTR_UPGRADE_MAX_LEVEL_TIPS`.

The table also carries the rarity colours per level (`top_color` / `bottom_color` / `deep_*`) —
grey `#b8b8b8` (Lv1–2), green `#7cd286` (Lv3–4), blue `#9dabff` (Lv5+…) — in the JSON bundle if the tool wants them.

---

## 5. ENHANCE — the Hammer mechanic ★ core of the requested calculator

**Item:** `1200` — **Artifact Enhancement Stone**, `EQUIP_AWAKE_UPGRADE_ITEM = [103, 1200, 1]`,
icon `A_UI_Props_StrengthenStone`, quality 12, no hold cap.

### 5.1 Success formula — CONFIRMED

`equip-awake/Private.js`:

```js
function getUpgradeAwakeProb(level, enhancedItemNum) {
    let x = DTEquipAwakeAttr.getTemplate(level).success / 100;
    return (1 - Math.pow(1 - x, enhancedItemNum)) * 100;
}
```

> **P(success) = 1 − (1 − success[level]/100)^n**, where `n` = stones committed to **one** attempt.

Stones are *not* separate attempts — the client sends **one** `C2SEquipUpgradeAttrRequest{attr_index, item_num}`
and gets **one** result back.

### 5.2 Live verification (emulator, Global, attr = ATK% @ Lv15, base 20 %)

| n | in-game display | `1−0.8ⁿ` (exact) | float value the client computes |
|---:|---:|---:|---|
| 1 | **19 %** | 20.000 | `19.999999999999996` |
| 2 | **35 %** | 36.000 | `35.999999999999986` |
| 3 | 48 % | 48.800 | `48.79999999999999` |
| 4 | 59 % | 59.040 | `59.03999999999999` |
| 5 | 67 % | 67.232 | `67.23199999999999` |
| 6 | 73 % | 73.786 | `73.78559999999999` |
| 7 | 79 % | 79.028 | … |
| 8 | 83 % | 83.223 | … |
| 9 | 86 % | 86.578 | … |
| 10 | 89 % | 89.263 | … |
| 11 | 91 % | 91.410 | … |

All 11 data points match the formula exactly.

> ⚠️ **Display quirk worth reproducing (or deliberately not reproducing) in the tool:**
> the client **truncates** the rate, and IEEE-754 `1 − (1−0.2)ⁿ` lands just *below* the round number.
> That is why **20 % is shown as "19 %"** and **36 % as "35 %"**. The real server probability is 20 % / 36 %.
> This is exactly the `19%` in the user's screenshot — not a hidden modifier.

`n` is clamped to `[1, max(owned, 1)]`. On **Global** the `+` button's `isProbMax` guard is `prob >= 100`,
which for any level below 4 (`success < 100`) is never reached — the float only approaches 100 asymptotically.
So on Global the stacker is limited **only by how many stones you own**, and the screen can legitimately
display `99%`. CN behaves differently — see §5.5.

### 5.3 Failure — CONFIRMED BY LIVE TEST

**A failed attempt costs exactly one level, no matter how many stones were committed.**
Level 1 is the floor (`MIN_LEVEL = 1`). All stones are consumed either way.

Tested on the Global client (Control Bonus 932, tier A):

| stones in the attempt | before | after | Δ level |
|---:|---|---|---|
| 1 | 12.5 % (Lv10) | 10.5 % (Lv9) | −1 |
| **2** | **15.0 % (Lv11)** | **12.5 % (Lv10)** | **−1** |

This rules out the "server rolls once per stone, all-fail costs n levels" model, which would have shown
15.0 % → 10.5 % on the 2-stone attempt. `n` stones = **one atomic attempt** with
`P = 1 − (1 − p)ⁿ`, one outcome, ±1 level. The expected-cost numbers in §5.4 therefore hold as printed.

### 5.4 Optimal strategy (the actual answer to the feature request)

With "success ⇒ +1, failure ⇒ −1, cost = n" this is a birth–death Markov chain. Expected stones from
level `L` to a target `T`:

```
E[T] = 0
E[L] = n + P(L,n)·E[L+1] + (1 − P(L,n))·E[L−1]        for 1 < L < T
E[1] = ( n + P(1,n)·E[2] ) / P(1,n)                    (reflecting floor at level 1)
P(L,n) = 1 − (1 − success[L]/100)^n
```

Solving the MDP (choose `n` per level to minimise total expected stones):

| Lv | base % | **optimal n** | resulting P | E[stones] Lv→20 |
|---:|---:|---:|---:|---:|
| 1–8 | 100…70 | **1** | 100…70 % | 170.8 … 162.8 |
| 9 | 60 | 2 | 84.0 % | 160.7 |
| 10 | 50 | 2 | 75.0 % | 157.9 |
| 11 | 40 | 3 | 78.4 % | 154.3 |
| 12 | 35 | 4 | 82.1 % | 149.5 |
| 13 | 30 | 4 | 76.0 % | 143.6 |
| 14 | 25 | 5 | 76.3 % | 136.4 |
| 15 | 20 | **7** | 79.0 % | 127.7 |
| 16 | 16 | 9 | 79.2 % | 116.5 |
| 17 | 12 | 11 | 75.5 % | 102.2 |
| 18 | 8 | 17 | 75.8 % | 83.0 |
| 19 | 4 | **30** | 70.6 % | 54.4 |

**Rule of thumb the tool can surface: stack stones until the attempt sits at ≈ 75–80 % success.**
Below that you bleed levels; above that you overpay for certainty.

Total expected cost, level 1 → target:

| Target | optimal policy | naive "always 1 stone" |
|---:|---:|---:|
| 10 | **12.9** | 13.2 |
| 13 | **27.2** | 49.9 |
| 15 | **43.1** | 268.9 |
| 16 | **54.3** | 935 |
| 17 | **68.6** | 4 438 |
| 18 | **87.8** | 30 134 |
| 19 | **116.4** | 230 316 |
| 20 | **170.8** | 389 416 |

(These assume the O1 semantics below. Values are expectations, not medians — the distribution is heavy-tailed,
so the tool should also show percentiles / a Monte-Carlo run.)

### 5.5 `EQUIP_AWAKE_UPGRADE_MUST_PROB = 0.99` — resolved, and it is a Global↔CN divergence

The constant is **not** a server-side pity. It is the **UI cap on the stone stacker**, and the two clients
have drifted apart:

| | Global (current) | CN (current) |
|---|---|---|
| `+` button guard | `prob >= 100` | `prob >= MUST_PROB*100` = **99** |
| displayed rate | raw truncated value | `isProbMax ? 100 : prob` — **shows "100%"** once the true value passes 99 % |
| effective stone cap | none (only your stock) | stops at the first `n` reaching 99 % |
| constant is | **dead code** in the enhance path | live |

History: in the June Global build (`20260618_124621`) `EQUIP_AWAKE_UPGRADE_MUST_PROB` was still used as the
`maxProb` of the *refine* calculator. Global later split that into its own key
(`EQUIP_AWAKE_REFRESH_MAX_PROB: 1`) and rewired the enhance guard to a literal `100`, leaving `MUST_PROB`
orphaned. CN never made that change.

Practical effect for a calculator: **on Global there is no 99 % ceiling** — spending more stones keeps
raising the true probability, it just never displays as 100 %. A CN-facing tool should cap the stacker at
the first `n` where `1 − (1−p)ⁿ ≥ 0.99` and label it "100 %".

The refine math itself is **functionally identical** in both clients (CN hardcodes `>= 1` where Global reads
the constant); Global only adds a debug entry point (`debugServerDataCalcEquipAwakeAttrProbPool`).

---

## 6. REFINE — changing *which* stat you have

Cost per refine: **1× item `1034`** (`EQUIP_AWAKE_REFRESH_ITEM`, icon `A_UI_Props_RefreshStone`)
**plus all materials you loaded in** (they are consumed).

### 6.1 Weight model — CONFIRMED (`EquipAwakeAttrProbCalculator.js`)

* every candidate stat of the slot starts at weight **`EQUIP_AWAKE_ATTR_WEIGHT = 1000`**
* each material adds its `addWeights` / `reduceWeights` deltas × quantity
* weights are clamped at ≥ 0; stats outside the slot's 12-stat pool are discarded
* **locked** stats get `p = 1` and are removed from the pool; `randomAttrNum` = number of *unlocked* slots
* then iteratively:
  * `p = w · randomAttrNum / Σw`; if `p < EQUIP_AWAKE_REFRESH_MIN_PROB (0.01)` the stat is **dropped**
  * if `p ≥ EQUIP_AWAKE_REFRESH_MAX_PROB (1)` the stat is **locked in** (`p = 1`), removed, `randomAttrNum--`, loop again
  * otherwise assign all remaining `p` and stop

**Live verification:** Tier-1 Chalice (slot 2, 1 unlocked slot), no materials → every stat `8.3 %` (= 1/12).
Adding **one** equip `130101` (quality 13; `+100` on Control RES 929, `−40` on everything else in that pool)
→ Control RES `9.4 %`, all others `8.2 %`.
Computed: `1100/11660 = 9.434 %` and `960/11660 = 8.233 %`. Match.

### 6.2 Material type A — dedicated refine items (120 of them)

`item.json`, `type == 6` (`ENormalItemType.EquipAwakeMaterial`), `effect[0] = "attrId|addWeight|reduceWeightOnAllOthers"`.
**5 quality tiers × the same 24 stats** — one item per stat per tier:

| Item id range | quality | add to target | reduce to *every other* stat in the pool |
|---|---:|---:|---:|
| 4101–4124 | 4 | +1 000 | −50 |
| 4201–4224 | 6 | +2 000 | −100 |
| 4301–4324 | 8 | +4 000 | −200 |
| 4401–4424 | 10 | +8 000 | −400 |
| 4501–4524 | 13 | **+100 000** | 0 |

Stat order within each block is always: `1901, 1902, 1941, 1942, 904, 905, 906, 907, 908, 909, 918, 919, 924, 925, 926, 927, 928, 929, 932, 940, 944, 945, 915, 949`
(i.e. `4101→1901`, `4105→904`, `4123→915`, `4124→949`, and `+100` per tier).

Single-stat probability with `k` items of one tier — 12-stat pool, **1 open slot**
(computed with a faithful re-implementation of `calcInner`, incl. the min/max-prob loop — use these as
unit-test fixtures):

| tier | k=1 | k=2 | k=3 | k=4 | k=5 | k=6 | k=8 | k=10 | k=20 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| q4 (+1000/−50) | 16.1 % | 23.3 % | 30.0 % | 36.2 % | 42.1 % | 47.6 % | 57.7 % | 66.7 % | **100 %** |
| q6 (+2000/−100) | 23.3 % | 36.2 % | 47.6 % | 57.7 % | 66.7 % | 74.7 % | 88.5 % | **100 %** | 100 % |
| q8 (+4000/−200) | 36.2 % | 57.7 % | 74.7 % | 88.5 % | **100 %** | 100 % | 100 % | 100 % | 100 % |
| q10 (+8000/−400) | 57.7 % | 88.5 % | **100 %** | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % |
| q13 (+100 000/0) | **100 %** | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % |

Two non-obvious consequences the tool **must** model — both come from the min/max clamp loop, not from
the raw weight ratio:

1. **A single q13 item is a hard guarantee.** With `+100 000` the other eleven stats sit at
   `1000/112 000 = 0.89 % < EQUIP_AWAKE_REFRESH_MIN_PROB (1 %)`, so they are *dropped from the pool
   entirely* and the target goes to 100 %. It does not need `reduce` at all.
2. **The `reduce` clamp at weight 0 also guarantees.** q10 ×3 → others at `1000 − 1200 → 0`;
   q8 ×5, q6 ×10, q4 ×20 do the same. So the cheap items are a guarantee too, just in bulk.

With **more than one open slot** (Tier 2–4) the clamps behave differently: `p = w · openSlots / Σw`, so one
q13 item still pins its stat at 100 %, but the remaining eleven stay in the pool at
`9.1 % / 18.2 % / 27.3 %` for 2 / 3 / 4 open slots — they no longer fall under the 1 % floor.

### 6.3 Material type B — spare artifacts (equips) from the backpack

Every one of the 156 equips carries an `affect_weight` list over all 24 stats. Shape is uniform:
**2 stats at +2w, 2 at +w, 2 at −2w, the remaining 18 at −0.4w**, where `w` scales with quality:

| quality | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `+2w` | 2 | 4 | 6 | 8 | 10 | 20 | 30 | 40 | 60 | 80 | 100 | 150 | 200 |
| `+w` | 1 | 2 | 3 | 4 | 5 | 10 | 15 | 20 | 30 | 40 | 50 | 75 | 100 |
| `−2w` | −2 | −4 | −6 | −8 | −10 | −20 | −30 | −40 | −60 | −80 | −100 | −150 | −200 |
| generic | 0 | 0 | 0 | −1 | −2 | −4 | −6 | −8 | −12 | −16 | −20 | −30 | −40 |

So **each artifact "supports" 4 specific stats** (2 strong, 2 weak) and actively pushes 2 stats *down*.
Against the default weight of 1000 even a quality-13 equip is only ±20 % / ±10 % — dedicated items are
an order of magnitude stronger. Equips are the cheap, wide nudge; items are the precision tool.

Example (`130101`, Heavy/slot 1, q13): `+200` Lifesteal 918, `+200` Cooldown Haste 926,
`+100` CRIT Rate 906, `+100` Control RES 929, `−200` Hit Bonus 905, `−200` CRIT DMG Bonus 919, `−40` all the rest.
Full table for all 156 equips in the JSON bundle.

### 6.4 Refine result flow

1. `C2SEquipRefreshAttrRequest{cost_items, cost_equips, prob}` — the client sends its computed prob map too
2. result lands in `awake.temp_attrs` (**not** applied yet)
3. `UIEquipmentAwakeRefreshConfirm` shows *old vs new* side by side
4. `C2SEquipConfirmRefreshAttrRequest{keep_new_attr: bool}` — **you may reject the roll and keep the old stats**
5. while `temp_attrs` is non-empty, locking and further refines are blocked

`temp_attrs` entries carry `{attr_id, level, locked}` — the confirm screen treats an entry as "was locked"
only if **both** `attr_id` *and* `level` are unchanged.

### 6.5 ⚠ Refine also re-rolls the LEVEL — live-confirmed

**A refined stat does not keep its level, and does not come back at level 1 either. The level is randomised.**
This is server-side: nothing in `equip_awake_attr.json` or the client bundle describes the draw.

Observed on the Global client (single artifact, slot 3, Tier 1 — read off the `Give up.` / `Save` confirm
window, every roll rejected so the source state stayed constant):

| # | source stat | source lv | refined into | tier | value | **new lv** |
|---|---|---:|---|:-:|---:|---:|
| 1 | Control Bonus (932) | 10 | Dodge Rate (904) | B | 10.0 % | **10** |
| 2 | Dodge Rate (904) | 10 | CRIT RES (907) | B | 2.5 % | **5** |
| 3 | Dodge Rate (904) | 10 | Lifesteal Effectiveness (918) | B | 1.0 % | **1** |
| 4 | Dodge Rate (904) | 10 | Ultimate Power (949) | D | 2.0 % | **4** |
| 5 | Dodge Rate (904) | 10 | **Dodge Rate (904)** | B | 1.2 % | **2** |
| 6 | Dodge Rate (904) | 10 | Effect Hit (945) | A | 1.2 % | **2** |
| 7 | Dodge Rate (904) | 10 | M-RES (1942) | C | 7.5 % | **10** |

*(levels 1–5 are `1.0 / 1.2 / 1.5 / 2.0 / 2.5` in every growth tier, so those readings are tier-independent)*

**#2 vs #3 vs #5** start from an identical state and land on different levels ⇒ the level draw is random.
**#5** also shows the current stat is **not excluded** from the pool — it can re-roll into itself at a
different level, exactly as the 8.3 % / 12-candidate prob pool implies.

Two hypotheses were on the table:

* **H1** — uniform over 1…20, independent of the current level
* **H2** — uniform over 1…(current level); a refine can never raise the level

All 7 samples came from a **level 10** source and **none exceeded 10**.
Under H1 that has probability `0.5⁷ = 0.78 %`; likelihood ratio **H2 : H1 ≈ 128 : 1**.
Sample mean 4.86 against 5.5 expected for uniform 1…10.

> **Working model: the new level is drawn uniformly from 1 … current level.**
> Well supported for the *cap*; with n=7 the exact *shape* inside the range is not pinned down
> (a triangular or low-weighted distribution bounded by 10 would fit almost as well).
> Sampling stopped here — item 1034 is scarce on a live account.

**Consequence for the calculator:** refine is not a pure "swap the stat" operation — it gambles the invested
enhancement levels too, and in expectation **halves** them. A player sitting on a well-enhanced stat should
lock it (item 1035) before refining anything else on the same artifact. The tool should show the expected
level loss next to the stat-hit probability, and should treat "refine first, enhance second" as the correct
order of operations.

### 6.5 Locking

* `EQUIP_AWAKE_LOCK_ITEM = [103, 1035, 1]` (icon `A_UI_Props_EntryLock`) — 1 item per locked stat
* locked stats are excluded from the roll (`p = 1`)
* **unlocking refunds the item** (`EQUIP_AWAKE_LOCK_ITEM_RETURN_TIPS`, and `S2CEquipSetAttrLockResponse`
  carries an optional `reward`)
* `EQUIP_AWAKE_UPGRADE_MUST_PROB = 0.99` — present in the constants, **no reference anywhere in the client
  bundle**; likely a server-side pity/guarantee threshold. Unresolved.

---

## 7. Protocol (`proto/code-zero.proto`)

```proto
message Equip { int32 id; int32 oid; int32 exp; int32 lv; int32 race; optional EquipAwake awake = 7; }
message EquipAwake     { int32 awake_id; int32 hero_id; repeated EquipAwakeAttr attrs; repeated EquipAwakeAttr temp_attrs; }
message EquipAwakeAttr { int32 attr_id; int32 level; bool locked; }

C2SEquipUnlockAwakeRequest       { hero_oid, equip_oid }                                  // first awaken
C2SEquipUpgradeAwakeRequest      { hero_oid, equip_oid }                                  // tier up
C2SEquipUpgradeAttrRequest       { hero_oid, equip_oid, attr_index, item_num }            // ← HAMMERS
C2SEquipSetAttrLockRequest       { hero_oid, equip_oid, attr_index, locked }
C2SEquipRefreshAttrRequest       { hero_oid, equip_oid, map cost_items, repeated cost_equips, map<int32,float> prob }
C2SEquipConfirmRefreshAttrRequest{ hero_oid, equip_oid, keep_new_attr }
```

All responses carry only a `Code` — the new state arrives via the normal `Equip` sync.

---

## 8. Economy — where the currencies come from

| Item | Role | Sources found in config |
|---|---|---|
| **1200** Artifact Enhancement Stone | enhance | Shop `100020` (5× / **3000 gems**, `discount: 80`), `100021` (2× / **1500 gems**), `100022` (1× / **10 000 000 gold**); Shrine tasks `102501…103001` (1× each); Alliance Conquest auction (2/4/6/8/10); weekly mini-game exchanges (`200320001/2/3` → 5× and 10×) |
| **1034** Refine stone | refine | Shop `100018` (1× / **1200 gems**), `100019` (1× / **20 000 000 gold**); Conquest auction (2×, 3×); mini-game exchange (5×) |
| **1035** Lock | lock a stat | Shop `100023` (1× / **7500 gems**) — refunded on unlock |
| 1201–1224 | tier-up | craftable 3:1 from the tier below + catalyst 1814/1815/1816 |
| 4101–4524 | refine bias | **no source in any of the 13 snapshots** — see O4b |

Currency ids from `ERewardType`: **104 = COIN** (gold), **107 = DIAMOND** (gems), 103 = ITEM, 102 = EQUIPS.

Gem cost per enhancement stone: `100021` = 750 ea., `100020` = 600 ea. at list price (480 ea. if
`discount: 80` means "pay 80 %"). At the optimal-policy cost of **~171 stones for level 1 → 20**, a fully
bought-out stat is roughly **82 000–103 000 gems**.

---

## 9. Open questions — need a decision or a live test

**~~O1 — failure semantics with n > 1 stones.~~ RESOLVED — see §5.3.**
Live-tested: a failed 2-stone attempt dropped exactly one level (15.0 % → 12.5 %, Lv11 → Lv10).
`n` stones buy one atomic attempt; failure is always −1.

**O2 — what happens to the LEVEL of a stat when it gets refined away. RESOLVED (working model) — see §6.5.**
Not level 1, not preserved: **the level is re-rolled, capped at the current level.** 7 live samples from a
Lv10 source, none above 10 (`p = 0.78 %` under an uncapped 1…20 draw). Use **uniform 1…currentLevel**.
Only the exact shape inside the range is unconfirmed; more samples were not worth the item cost.

**~~O3 — `EQUIP_AWAKE_UPGRADE_MUST_PROB = 0.99`.~~ RESOLVED — see §5.5.**
Not a pity mechanic: it is the `+`-button cap on the enhance screen. Dead code on current Global
(guard rewired to a literal `100`), still live on CN where it also forces the display to read "100%".

**~~O4a — currency ids.~~ RESOLVED.** `ERewardType`: **104 = COIN** (gold), **107 = DIAMOND** (gems),
103 = ITEM, 102 = EQUIPS. Shop prices in §8 are now readable.

**O4b — acquisition path for the 4101–4524 refine items. NOT IN ANY CONFIG.**
Scanned all 13 snapshots (11 Global + 2 CN) for `[103, 4xxx, n]` and `{type:103, id:4xxx}` reward shapes —
**zero hits**. The items exist in `item.json` but no shop, exchange, quest, stage, auction or gacha table
grants them. Either server-granted only (mail / event rotation not in the delivered patch), or a not yet
shipped source. Per the CLAUDE.md caveat, a missing reward entry is not proof the source does not exist.

**~~O5 — EN item names.~~ RESOLVED — see §11.**
Harvested from RAM (`harvest_l10n_global.py`). 67 of the 120 refine-material names read directly, the
remaining 53 follow the same rigid `T{n} {Stat} Stone` scheme and are extrapolated. All 12 awakening
stones and item 1200 / 1034 read directly. Item **1035 = "Fate lock"** was supplied from the live client
(not resident during the dump — capitalisation unverified).

---

## 10. Reference implementation (drop-in for the calculator repo)

```js
// ---- ENHANCE ---------------------------------------------------------------
const SUCCESS = {1:100,2:100,3:100,4:95,5:95,6:90,7:80,8:70,9:60,10:50,
                 11:40,12:35,13:30,14:25,15:20,16:16,17:12,18:8,19:4,20:0};
const MIN_LEVEL = 1, MAX_LEVEL = 20;  // level 20 has success 0 -> terminal

/** exact probability of one attempt that spends `n` stones at `level` */
function enhanceProb(level, n) {
  const x = SUCCESS[level] / 100;
  return 1 - Math.pow(1 - x, n);          // 0..1
}
/** what the GAME shows (truncated, reproduces the "19%" instead of "20%") */
function enhanceProbAsShown(level, n) {
  return Math.trunc((1 - Math.pow(1 - SUCCESS[level] / 100, n)) * 100);
}

// ---- REFINE ----------------------------------------------------------------
const DEFAULT_WEIGHT = 1000, MIN_PROB = 0.01, MAX_PROB = 1.0;

/**
 * @param attrIds      the slot's 12 candidate stat ids
 * @param weightDeltas Map<attrId, delta>  (materials, already multiplied by count)
 * @param lockedIds    stat ids locked with item 1035
 * @param openSlots    number of UNLOCKED awakened-effect slots
 * @returns Map<attrId, probability 0..1>
 */
function refineProbPool(attrIds, weightDeltas, lockedIds, openSlots) {
  const weights = new Map(attrIds.map(a => [a, DEFAULT_WEIGHT]));
  weightDeltas.forEach((d, a) => { if (weights.has(a)) weights.set(a, Math.max(weights.get(a) + d, 0)); });

  const pool = new Map();
  let total = 0;
  weights.forEach((w, a) => {
    if (lockedIds.includes(a)) { pool.set(a, 1); weights.delete(a); return; }
    total += w;
  });

  while (openSlots > 0) {
    let found = false;
    const snapshot = total;
    for (const [a, w] of weights)                       // drop everything under the 1% floor
      if ((w * openSlots) / snapshot < MIN_PROB) { weights.delete(a); total -= w; }
    for (const [a, w] of weights)                       // lock in anything at/over 100%
      if ((w * openSlots) / total >= MAX_PROB) {
        pool.set(a, 1); weights.delete(a); total -= w; openSlots--; found = true; break;
      }
    if (found) continue;
    weights.forEach((w, a) => pool.set(a, (w * openSlots) / total));
    break;
  }
  return pool;
}
```

Expected-cost solver for the "how many hammers do I need" answer (Gauss–Seidel on the birth–death chain,
converges in a few hundred sweeps):

```js
function expectedStones(fromLevel, targetLevel, nAt /* fn(level)->stones */) {
  const E = {}; for (let L = 1; L <= targetLevel; L++) E[L] = 0;
  for (let it = 0; it < 5000; it++) {
    let delta = 0;
    for (let L = targetLevel - 1; L >= 1; L--) {
      const n = nAt(L), P = enhanceProb(L, n);
      const v = L === 1 ? (n + P * E[2]) / P                     // reflecting floor
                        : n + P * E[L + 1] + (1 - P) * E[L - 1];
      delta = Math.max(delta, Math.abs(v - E[L])); E[L] = v;
    }
    if (delta < 1e-10) break;
  }
  return E[fromLevel];
}
```

Swap `nAt` for a per-level argmin over `n` to get the optimal policy in §5.4.

---

## 11. EN item names (harvested from RAM)

The L10N table is not in the APK, but the decrypted strings sit in the game's heap. `harvest_l10n_global.py`
locates the heap ranges holding known localized strings and dumps every printable run — **35 377 unique EN
strings** for the whole game, saved as `captured_en_strings_20260807.json`.

**Artifact type names:** type 1 = **Hefty**, type 2 = **Nimble**, type 3 = **Arcane**.
(Confirmed twice: the harvested item names and the in-game popup `Artifact Type: Nimble`.)

| id(s) | EN name | note |
|---|---|---|
| 1200 | **Artifact Enhancement Stone** | *"Used to enhance Awakened Artifact. Each enhancement attempt has a chance to fail. On failure, the affected attribute's level −1."* |
| 1034 | **Refining Stone** | the refine cost |
| 1035 | **Fate lock** | read off the live client (not resident during the RAM dump, so the exact capitalisation is unverified). Icon `A_UI_Props_EntryLock`, tooltip: *"Lock the effect so that it won't change when refined. If you cancel before refining, all materials will be refunded."* |
| 1201–1204 | **T1–T4 Hefty Awakening Stone** | all four observed |
| 1211–1214 | **T1–T4 Nimble Awakening Stone** | all four observed |
| 1221–1224 | **T1–T4 Arcane Awakening Stone** | all four observed |
| 4101–4524 | **T1–T5 `<Stat>` Stone** | 67 read directly, 53 extrapolated |

Refine materials follow `T{tier} {Stat} Stone`, where tier is `4101→T1, 4201→T2, 4301→T3, 4401→T4, 4501→T5`.
The stat token differs slightly from the stat's own display name:

| item suffix | attr | display name | item suffix | attr | display name |
|---|---:|---|---|---:|---|
| ATK | 1901 | ATK | Lifesteal | 918 | Lifesteal Effectiveness |
| HP | 1902 | HP | CRIT DMG | 919 | CRIT DMG Bonus |
| Armor | 1941 | Armor | Magical DMG Bonus | 924 | M-DMG Bonus |
| Magical RES | 1942 | M-RES | Physical DMG Bonus | 925 | P-DMG Bonus |
| Dodge | 904 | Dodge Rate | Skill Cooldown | 926 | Cooldown Haste |
| Hit Rate | 905 | Hit Bonus | Healing | 927 | Healing Effectiveness |
| CRIT | 906 | CRIT Rate | Recharge | 928 | Recharge Effectiveness |
| CRIT RES | 907 | CRIT RES | Control RES | 929 | Control RES |
| Magical DMG RED | 908 | M-DMG RED Rate | Control Bonus | 932 | Control Bonus |
| Physical DMG RED | 909 | P-DMG RED Rate | CRIT DMG RED | 940 | CRIT DMG RED |
| Effect RES | 944 | Effect RES | Effect Hit Rate | 945 | Effect Hit |
| ATK SPD | 915 | ATK SPD Bonus | Ultimate | 949 | Ultimate Power |

Full id → name map (with an `observed_in_ram` flag per entry) is in `artifact_awakening_data.json`
under `item_names_en`.

The harvest also confirmed the crafting chain wording from the game itself:
*"Used to awaken Nimble Artifacts of **Divine rarity**. A T2 Awakening Stone is crafted from 3 T1 Awakening
Stones."* — "Divine rarity" = the quality-13 gate from §2.

---

## 12. Files produced

| File | Contents |
|---|---|
| `ARTIFACT_AWAKENING_RESEARCH.md` | this document |
| `artifact_awakening_data.json` | all tables machine-readable: constants, 20 levels × 24 stats, growth tiers, 48 awake templates, 120 refine items, 156 equips with `affect_weight`, attribute id ↔ EN ↔ ZH ↔ `user_key` map, `item_names_en`, `observations_live` (every live data point), formula strings |
| `captured_en_strings_20260807.json` | **35 377 unique EN strings** for the whole game, harvested from RAM — useful far beyond this feature |
| `harvest_l10n_global.py` | the harvester: anchors on known localized strings, dumps every printable run in the heap ranges that hold them |

Raw config paths (Global, run `20260807_093439`, `region_02`):
`client/config/equip_awake/{equip_awake,equip_awake_attr,equip_awake_constant}.json`,
`client/config/equip/equip_detail.json`, `client/config/item.json`, `client/config/item_synthesis.json`,
`client/config/hero_enumeration.json`, `client/proto/code-zero.proto`.
Client logic (run `20260731_115343`, `region_04`):
`client/dist/default/equipment/equip-awake/` — `Private.js` (success formula),
`EquipAwakeAttrProbCalculator.js` (refine weights), `EquipmentAwakeSystem.js` (requests),
`ui/UIEquipmentAwakeAttrUpgradeConfirm.js`, `ui/UIEquipmentAwakeAttrsRefresh.js`, `ui/UIEquipmentAwake.js`.

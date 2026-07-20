# Water Game — Complete Guide (Data-Mined)

> Internal mode name: **`water_game`**. Theme: **River / Fish offerings** (big & little fish, offerings floated on water).
> One of three rotating **Weekly Activity** gacha mini-games. Siblings: **Golden Arcanum (`alchemy`)** and **Gold Miner (`gold_miner`)**.
> Source: extracted global client `region_7584e4b000`, cross-checked vs live `20260713_104826`.

---

## 1. Identity & Keys

| Field | Value |
|---|---|
| Internal mode | `water_game` |
| `func_id` | **200320003** |
| Entry ticket (item to play) | item **1045** (`WATER_GAME_COST`) |
| Shop currency earned | reward type **192** = `WATER_GAME_COIN` |
| Round timer | **60 s** (`water_game_time`) |
| Title L10N key | `weekly_water_game` (name `weekly_water_game_name`) |
| One-play restrict tip | `weekly_water_game_gacha1` |
| Red-dot id | 200151 |

---

## 2. How the Mode Works

**Gacha dressed as a floating-offering / current game.** Each play = 1 ticket = 1 pull = 1 chest. UI: **Summon×1** / **Summon×10** (`SummonOnce_Btn`, `SummonTen_Btn`) + grab-all fast-skip.

### Core loop (verified from compiled logic)
`WaterGameSceneLogicSystem.js`:
1. Chests float on a water surface at fixed positions (`water_game_chest_pos`, 16 slots, small world-space coords).
2. **Water forces / currents** are applied from a force template (`water_game_id` per round → `force1`/`force2` sets). Forces push floating objects around with turbulence.
3. You interact → a chest is grabbed (`grab chest oid` → `gainTreasureOids.push`), **run ends** (one chest per pull). A `GameOver` event tears down the scene at time-out.
4. Timer **60 s**. Uses a native C# side (`csWaterGame`) for the fluid/force simulation.

### Water force templates (`weekly_activities_water_force.json`)
| id | life_time | radius | strength | speed | noise X | noise Y | decay (r/s/str) | path_id |
|---|---|---|---|---|---|---|---|---|
| 1 | 3 | 3 | 20–30 | 20 | 10–20 | 15–30 | 1 / 2 / 2 | 9 |
| 2 | 3 | 3 | 20–30 | 20 | 10–20 | 15–30 | 1 / 2 / 2 | 10 |

`weekly_activities_water_game.json`: game `1` → `force1:[1]`, `force2:[2]` (two current fields, mirrored spline paths 9 & 10).

### Engine constants
| Constant | Value |
|---|---|
| `water_game_time` | 60 |
| `water_game_chest_scale` | half 1 × 1 (world units) |
| `water_game_tip_chest_min_scale` | 0.5 |
| `water_game_force_effect` | `Fx_UI_PB_S_WaterGame_004_Hyh.prefab` |
| `skip_grab_all_chest_anim_limit_times` | 100 (fast-forward threshold) |

---

## 3. Chests & Currency (`weekly_activities_chest.json`, ids 9–12)

| Chest id | Quality | Gives | Prefab |
|---|---|---|---|
| 9 | 1 | **1× WATER_GAME_COIN (192)** | `WaterGameChestFish` |
| 10 | 2 | **2× WATER_GAME_COIN** | `WaterGameChestSheep` |
| 11 | 3 | **3× WATER_GAME_COIN** | `WaterGameChestCattle` |
| 12 | 4 | **self-select reward** (§5) | `WaterGameChestShip` |

> Chest skins escalate Fish → Sheep → Cattle → Ship (river-offering motif). Same "smaller value → more coins" inversion; Ship = optional/self-select.

**Reward pool** (`weekly_activities_reward_pool.json` → `200320003`): **51 round layouts**. Typical board: `chest_num 10`, mix `{id9:3, id10:4, id11:2, id12:1}`, `water_game_id` set per round. Full data in `data/`.

---

## 4. Rank Rewards (`weekly_activities_rank.json` → `200320003`)

Leaderboard top 200. Currencies: **1034 / 1013 / 1200** + **1043** (Gold-Miner ticket).

| Rank | 1034 | 1013 | 1200 | 1043 |
|---|---|---|---|---|
| 1 | 10 | 40 | 20 | 50 |
| 2 | 5 | 20 | 15 | 45 |
| 3 | 2 | 16 | 10 | 40 |
| 4–10 | 1 | 14 | 9 | 35 |
| 11–20 | — | 12 | 8 | 25 |
| 21–50 | — | 8 | 7 | 18 |
| 51–100 | — | 4 | 6 | 14 |
| 101–200 | — | — | 5 | 12 |
| 201–500 | — | — | 3 | 10 |
| 501–1000 | — | — | 1 | 9 |
| 1001–1500 | — | — | — | 8 |
| 1501–2000 | — | — | — | 7 |
| 2001–3000 | — | — | — | 6 |
| 3001–4000 | — | — | — | 5 |
| 4001–5000 | — | — | — | 4 |
| 5001–7500 | — | — | — | 3 |
| 7501–10000 | — | — | — | 2 |
| 10001+ | — | — | — | 1 |

> Note: 1200 (q12) and 1034 appear as **rank** rewards here — higher value than the other modes' rank tables.

---

## 5. Optional / Self-Select Chest (`weekly_reward_self.json` → `200320003`)

| Tier (quality_id) | Choose from |
|---|---|
| 4 | 1009 ×1, 1001 ×20, 1008 ×10 |
| 10 | + 1111 ×5 |
| 12 | + 1112 ×3 |
| 14 | + 1113 ×2 |

---

## 6. Exchange Shop (`active_exchange.json` → group `200320003`)

**Currency: WATER_GAME_COIN (192).** 28 entries, `limit_times: 1`. **Items 5–28 identical to Alchemy & Gold Miner** — only the 4 heroes differ.

### Headline — Heroes (type 101), 50 coin each
| Shop id | Hero id | Hero | Class / Faction |
|---|---|---|---|
| 1 | 1005 | **Nemesis** | Assassin |
| 2 | 2008 | *(unmapped — newer hero)* | — |
| 3 | 3004 | **Jormungandr** | Warrior / Clubs |
| 4 | 4006 | *(unmapped — newer hero)* | — |

### Shared item rows (same in all 3 modes)
| id | Reward | Rarity | Cost | Gate |
|---|---|---|---|---|
| 5 | 1601 ×1 | q6 equip | 100 | buy≥150 |
| 6 | 1031 ×20 | q6 | 80 | buy≥150 |
| 7 | 1112 ×50 | q8 mat | 75 | buy≥150 |
| 8 | 1111 ×100 | q6 mat | 60 | buy≥150 |
| 9–12 | 1013 ×10/8/7/5 | q6 | 50 ea | gate 1903, buy≥200 |
| 13 | 1814 ×1 | **q13 mythic equip** | 100 | gate 3001, buy≥400 |
| 14 | 1034 ×5 | q6 | 100 | gate 3001, buy≥400 |
| 15 | 1200 ×10 | **q12 top mat** | 100 | gate 3001, buy≥400 |
| 16 | 1200 ×5 | q12 | 100 | gate 3001, buy≥400 |
| 17–20 | 1009 ×10/8/7/5 | q4 | 30 ea | — |
| 21 | 1515 ×1 | q4 | 10 | — |
| 22 | 1503 ×1 | q4 | 10 | — |
| 23 | 1507 ×1 | q4 | 10 | — |
| 24 | 1511 ×1 | q4 | 10 | — |
| 25–28 | 1522 ×5/4/3/2 | q3 | 5 ea | — |

**Full clear cost:** **1,285 WATER_GAME_COIN.**

**Priority:** heroes → 1200/1814 mythic once `3001` gate opens → 1112/1111 bulk → cheap fillers.

---

## 7. Assets (`assets/`)
- `icons/` — **Offerings01–04** (floated items), Summon×1/×10 buttons, water mask, packed atlas
- `ui/` — scene layers: `SceneObject_BigFish`, `LittleFish`, `Foreground`, `MediumShot`, `BigBackground_Bg`, `Illustration01–03`, `Help01`, lobby MenuItem/MarqueeItem
- `chests/` — WaterGame chest textures (Fish/Sheep/Cattle/Ship) + UI
- `data/` — raw config JSON

## 8. Open / Unverified
- Heroes **2008, 4006** not in the 49-hero mapping (newer/unreleased).
- Exact interaction (tap-to-throw vs drift-into-zone) handled by native `csWaterGame` — config confirms forces/paths but the input verb isn't in the TS layer.
- `buy_condition type 2` / `show_condition type 1` gates as in the other modes.
- Item display names baked in L10N textures (ID + rarity given). OCR available on request.

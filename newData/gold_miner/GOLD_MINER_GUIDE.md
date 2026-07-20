# Gold Miner — Complete Guide (Data-Mined)

> Internal mode name: **`gold_miner`**. Theme: **Lantern Festival / Fireworks** (hook launches lanterns & rockets).
> One of three rotating **Weekly Activity** gacha mini-games. Siblings: **Golden Arcanum (`alchemy`)** and **Water Game (`water_game`)**.
> Source: extracted global client `region_7584e4b000`, cross-checked vs live `20260713_104826`.

---

## 1. Identity & Keys

| Field | Value |
|---|---|
| Internal mode | `gold_miner` |
| `func_id` | **200320001** |
| Entry ticket (item to play) | item **1043** (`GOLDMINER_COST`) |
| Shop currency earned | reward type **188** = `GOLDMINER_COIN` |
| Round timer | **30 s** (`gold_mine_game_time`) — shortest of the three |
| Title L10N key | `WEEKLY_ACTIVITIES_GOLD_MINER` |
| One-play restrict tip | `WEEKLY_ACTIVITIES_ONE_TIMES_GOLDEN` |
| Red-dot id | 200121 |

---

## 2. How the Mode Works

**It's a gacha dressed as the classic "Gold Miner / claw" arcade game.** Each play = 1 ticket = 1 pull = 1 chest. UI has **Summon×1** and **Summon×10** buttons (`SummonOnce_Btn`, `SummonTen_Btn`) + a "grab all" fast-skip.

### Core loop (verified from compiled logic)
`GoldMinerSceneLogicSystem.js` + `chest-hook/ChestHookLogicSystem.js`:
1. A **hook** sits at the bottom (`hook_pos` 0,−800), pivoting a launcher at (0, 205).
2. **Idle state:** the hook **swings like a pendulum** between `90 − max_angle` and `90 + max_angle`, at `angle_speed` (rotation_speed).
3. You tap → **Extend state:** hook shoots out along its current angle at `move_speed` **1000**.
4. The hook's sphere (radius from tier) collides with a chest → `onHitChest` grabs it, pushes to `gainTreasureOids`, **run ends** (one chest per pull).
5. Timer **30 s**.

### Hook tiers (`weekly_activities_hook.json`)
Higher round pool → faster/harder swing.

| Hook id | max_angle | angle_speed | move_speed | sphere_radius | Projectile art |
|---|---|---|---|---|---|
| 1 | 60° | 30 | 1000 | 14 | `RocketFireworks` |
| 2 | 60° | 50 | 1000 | 14 | `RocketFireworks` |
| 3 | 60° | 70 | 1000 | 14 | `RocketFireworks` |
| 4 | 60° | 90 | 1000 | 14 | `RocketFireworks` |

> Materials/projectiles in the atlas: **Lantern01–04** + **RocketFireworks** (the swinging pickups — the Lantern-Festival skin you spotted).

### Engine constants
| Constant | Value |
|---|---|
| `gold_mine_game_time` | 30 |
| `chest_spawner_pos` | (−500, −80) |
| `max_num_chest_line` | 4 |
| `gold_mine_chest_pos` | 20 fixed slots (see data) |
| `gold_mine_chest_scale` | half 72.5 × 145.5 |

---

## 3. Chests & Currency (`weekly_activities_chest.json`, ids 1–4)

| Chest id | Quality | Gives | Prefab |
|---|---|---|---|
| 1 | 1 (Big) | **1× GOLDMINER_COIN (188)** | `GoldenChestBig` |
| 2 | 2 (Middle) | **2× GOLDMINER_COIN** | `GoldenChestMiddle` |
| 3 | 3 (Small) | **3× GOLDMINER_COIN** | `GoldenChestSamll` (sic) |
| 4 | 4 (Optional) | **self-select reward** (§5) | `GoldenChestOptional` |

Same inversion as the other modes: small chest = more coins.

**Reward pool** (`weekly_activities_reward_pool.json` → `200320001`): **51 round layouts**. Typical board: `chest_num 10`, mix `{id1:3, id2:4, id3:2, id4:1}`, `hook_id` escalates with progress. Full data in `data/`.

---

## 4. Rank Rewards (`weekly_activities_rank.json` → `200320001`)

Leaderboard top 200. Currencies: **1011 / 1010 / 1009** + **1044** (Alchemy ticket).

| Rank | 1011 | 1010 | 1009 | 1044 |
|---|---|---|---|---|
| 1 | 40 | 20 | 20 | 50 |
| 2 | 20 | 10 | 15 | 45 |
| 3 | 10 | 8 | 10 | 40 |
| 4–10 | 5 | 7 | 10 | 35 |
| 11–20 | — | 6 | 9 | 25 |
| 21–50 | — | 4 | 8 | 18 |
| 51–100 | — | 2 | 7 | 14 |
| 101–200 | — | — | 6 | 12 |
| 201–500 | — | — | 4 | 10 |
| 501–1000 | — | — | 2 | 9 |
| 1001–1500 | — | — | — | 8 |
| 1501–2000 | — | — | — | 7 |
| 2001–3000 | — | — | — | 6 |
| 3001–4000 | — | — | — | 5 |
| 4001–5000 | — | — | — | 4 |
| 5001–7500 | — | — | — | 3 |
| 7501–10000 | — | — | — | 2 |
| 10001+ | — | — | — | 1 |

---

## 5. Optional / Self-Select Chest (`weekly_reward_self.json` → `200320001`)

| Tier (quality_id) | Choose from |
|---|---|
| 4 | 1009 ×1, 1001 ×20, 1008 ×10 |
| 10 | + 1111 ×5 |
| 12 | + 1112 ×3 |
| 14 | + 1113 ×2 |

---

## 6. Exchange Shop (`active_exchange.json` → group `200320001`)

**Currency: GOLDMINER_COIN (188).** 28 entries, each `limit_times: 1`. **Items 5–28 are identical to the Alchemy and Water shops** — only the 4 heroes differ.

### Headline — Heroes (type 101), 50 coin each
| Shop id | Hero id | Hero | Class / Faction |
|---|---|---|---|
| 1 | 1004 | **Poseidon** | Warrior |
| 2 | 2006 | *(unmapped — newer hero)* | — |
| 3 | 3007 | **Diana** | Ranger / Clubs |
| 4 | 4003 | **Yanluo** | Warrior / Hearts |

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

**Full clear cost:** **1,285 GOLDMINER_COIN.**

**Priority:** heroes (200 for 4 units) → 1200/1814 mythic mats once `3001` gate opens → 1112/1111 bulk → cheap fillers.

---

## 7. Assets (`assets/`)
- `icons/` — **Lantern01–04**, **RocketFireworks** (hook projectiles), Summon×1/×10 buttons, BottomTab icons (MiniGame/Task/Gift), Purchase buttons/bg, packed atlas
- `ui/` — `Bg_Bg` background, `FireworksDecoration`, `Illustration01–03`, `Help01`, `Title` (L10N), lobby MenuItem/MarqueeItem
- `chests/` — GoldenChest Big/Middle/Optional/Small textures
- `data/` — raw config JSON

## 8. Open / Unverified
- Hero **2006** not in the 49-hero mapping (newer/unreleased) — resolve later.
- `buy_condition type 2` (100/150/200/400) = event-score threshold; `show_condition type 1` (1903/3001) = progression gate revealing rows 9–16. Exact meaning server-side.
- Item display names baked in L10N textures (listed by ID + rarity). OCR available on request.

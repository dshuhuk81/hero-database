# Totem Rank · Relic Awakening Rank · Golden Eye

**Client:** GLOBAL (`com.goatgames.mot.gb.gp`)
**Snapshot:** `live_extractions/20260925_074413` (config in `region_02`, verified via `language.json`)
**Client logic:** `live_extractions/20260731_115343/.../dist/default/ranking-rush/` (patch 94792, most recent run with `dist/`)
**Player-facing text:** not available. All EN strings are `tid#` keys in the encrypted L10N package, and the RAM harvest from 2026-08-07 predates these events. Mechanics below come from config tables, proto, and client JS. Chinese dev comments in the configs are translated where they help. Anything marked *(inferred)* is my reading of the data and not confirmed by text.

| # | Key | Name | Activity ID | Global window |
|---|---|---|---|---|
| 1 | `active_rank3_1` | Totem Rank (图腾榜) | 201110001 | 2026-10-14 → 2026-10-20 (7 days) |
| 2 | `active_rank5_1` | Relic Awakening Rank (圣器觉醒榜) | 201130001 | 2026-10-21 → 2026-10-27 (7 days) |
| 3 | `active_gem_creation` | Golden Eye (黄金眼) | 201400001 | 2026-11-02 → 2026-11-13 (12 days) |

**History:** In every earlier Global snapshot, both rank events had the placeholder date `2040-04-03`, so they were dormant. The 20260925 runs are the first to give them real dates. Golden Eye appears for the first time in Global in this snapshot. Before that it only showed up in CN runs (`20260713_104826`, `20260821_102324`; CN start 2026-08-05). Global is therefore about 3 months behind CN for Golden Eye.

---

## 1 + 2: Ranking Rush events (Totem Rank, Relic Awakening Rank)

Both events belong to one framework, the **Ranking Rush** system (`RankingRushSystem`, entry `OPEN_ID 20108`, sub-open IDs 20109–20113). Client enum `ERankingRushType`:

| Type | Activity ID | Meaning |
|---|---|---|
| Recharge | 201100001 | Spending rank |
| **Totem** | **201110001** | Totem Rank |
| Collection | 201120001 | Virtue/collection rank |
| **Equipment** | **201130001** | **Relic Awakening = artifact awakening** |

Each event has 3 tabs (`ERankingRushContentType`):

1. **Leaderboard.** A server-side ranking. The client loads it page by page (`C2SGetActiveRankLeaderboardDataRequest`) and shows `rank_player_num = 500` entries. Rewards pay out to places 1–200 and arrive by mail after the event ends (`ACTIVE_RANK_IS_SETTLEMENT`).
2. **Tasks.** 20 milestones on your own event score. They are not competitive.
3. **Gift packs.** One free pack, one pack for 500 diamonds, and 6 paid packs. Each pack can be bought once.

There is also a help screen that lists "where to gain points". These are the `improvement_id` entries, and each has a button that takes you to the right game feature.

### 1. Totem Rank: what to do

**Upgrade totems during the event.** Each totem level-up earns points, and higher-quality totems earn far more. Totem bond (fetter) levels also earn points. This event has a points table in its help screen (`enable_excel = true`), with columns *Totem level | Quality | Points*:

| Level | Rare (q3) | Elite (q4) | Epic (q6) | Bond level | Points |
|---|---|---|---|---|---|
| 1 | 1 | 5 | 50 | 1 | 10 |
| 2 | 2 | 10 | 100 | 2 | 30 |
| 3 | 4 | 20 | 200 | 3 | 70 |
| 4 | 8 | 35 | 350 | 4 | 130 |
| 5 | 14 | 55 | 550 | 5 | 210 |
| 6 | 22 | 80 | 800 | 6 | 310 |
| 7 | 32 | 110 | 1 100 | 7 | 430 |
| 8 | 44 | 145 | 1 450 | 8 | 570 |
| 9 | 58 | 185 | 1 850 | 9 | 730 |
| 10 | 74 | 230 | 2 300 | 10 | 910 |
| 11 | 92 | 280 | 2 800 | | |
| 12 | 112 | 335 | 3 350 | | |
| 13 | 134 | 395 | 3 950 | | |
| 14 | 158 | 460 | 4 600 | | |
| 15 | 184 | 530 | 5 300 | | |

*(inferred)* Each value is the points for **reaching** that level, so each upgrade scores separately. The Epic column is 10× Elite at low levels. That means one Epic totem level-up is worth more than a whole Rare totem taken to level 15. **Put your shards into Epic totems.**

The one q8 totem (1002, the "LifeFlower" icon) has no row in the table. Whether it scores is unclear. Its shards (201002) are the top leaderboard reward.

Help-screen shortcuts (`improvement` 301/302): both need stage 1803 and go to open condition 10077. This is most likely totem gacha and totem upgrade.

**Tasks** (quest `target_type 86`, score thresholds): 20 · 30 · 50 · 100 · 150 · 200 · 250 · 300 · 400 · 500 · 600 · 700 · 800 · 900 · 1 000 · 1 200 · 1 400 · 1 600 · 1 800 · **2 000**.
All 20 tasks together give **5 000 diamonds**, 60× purple totem selector (201100) at tasks 1–8, 60× golden totem selector (201000) at tasks 9–20, and resource boxes 1522/1523.

**Leaderboard rewards:**

| Place | Epic shard 201002 | Totem gacha ticket 1013 | Purple selector 201100 | Diamonds |
|---|---|---|---|---|
| 1 | 25 | 50 | 30 | 4 000 |
| 2 | 20 | 40 | 25 | 3 000 |
| 3 | 15 | 30 | 20 | 2 000 |
| 4–10 | 10 | 20 | 15 | 1 000 |
| 11–20 | 5 | 10 | 10 | 600 |
| 21–50 | – | 5 | 5 | 400 |
| 51–100 | – | – | 5 | 300 |
| 101–200 | – | – | – | 200 |

**Gift packs:** free = 1 totem ticket. 500 diamonds = 2 tickets. Paid tiers (charge IDs 230101–230106) = 10/20/30/40/60/100 tickets plus 300–6 480 diamonds. The packs sell **totem gacha tickets**, which is the raw material for scoring. This is the pay-to-rank lever.

### 2. Relic Awakening Rank: what to do

**Enhance, refine, and lock awakened artifacts during the event.** The client calls this rank `Equipment`. The quest names are `Quest_Active_Rank_Equip_Awake_*`, and every reward is an awakening material:

| Item | Meaning |
|---|---|
| 1200 | Artifact Enhancement Stone (enhance) |
| 1034 | Refining Stone (refine) |
| 1035 | Lock (locks a stat during refine) |
| 1814 | Artifact awakening chest |
| 1823 | Large equipment chest |

There is no points table for this event (`enable_excel = false`). The score formula is server-side. Help shortcuts 501/502 need stage 2945 and go to open condition 10010 (artifact screen).

**Tasks** (`target_type 88`, `target_id 1`): 25 · 50 · 75 · … in steps of 25 up to **500**.
*(inferred)* `target_id 1` with values up to 500 suggests the score counts awakening actions, such as enhance attempts. This is not confirmed.
All 20 tasks together give **5 000 diamonds**, 1200 stones (5→30 per task), 7× 1823 chest (tasks 4, 8, 12, 16, 20), and resource boxes 1522/1523.

**Leaderboard rewards:**

| Place | Lock 1035 | Refining Stone 1034 | Enhance Stone 1200 | Diamonds |
|---|---|---|---|---|
| 1 | 25 | 30 | 50 | 4 000 |
| 2 | 20 | 25 | 40 | 4 000 |
| 3 | 15 | 20 | 30 | 4 000 |
| 4–10 | 10 | 15 | 20 | 4 000 |
| 11–20 | 5 | 10 | 20 | 4 000 |
| 21–50 | – | 5 | 15 | 400 |
| 51–100 | – | – | 10 | 300 |
| 101–200 | – | – | – | 200 |

Places 1–20 all get 4 000 diamonds in this event. In Totem Rank, the diamond reward drops with each place. This could be a config slip. Watch whether it changes in a later patch.
25 locks for 1st place is a lot: one lock costs 7 500 gems in the shop (see `ARTIFACT_AWAKENING_RESEARCH.md`).

**Gift packs:** free = 1× 1200. 500 diamonds = 1× 1034. Paid tiers (250101–250106) mix 1814 chests, 1034, 1200, and 2× 1035 with 300–6 480 diamonds.

**Tip:** Save 1200/1034 before 2026-10-21 and spend them during the event, so the same materials also count toward the rank. Refine strategy (lock first, refine before enhancing) is covered in [ARTIFACT_AWAKENING_RESEARCH.md](../ARTIFACT_AWAKENING_RESEARCH.md).

---

## 3. Golden Eye (`active_gem_creation`): what to do

A standalone crafting and auction mini-game that lasts **12 days**. It has its own lobby button (`UIGemCreation`), tasks, a battle pass, a gacha, a shop, and 3 leaderboards. It has nothing to do with the in-game gem currency. Internally, the crafted objects are called treasures (宝具).

### Core loop

```
Energy ──► craft a treasure (5 energy) ──► random type + quality + score
                                            │
                                            ▼
            enter a treasure into a room (5-min round, up to 50 seats)
                                            │
                  place in the room by score ──► rank points + currency 410002
                                            │
               410002 ──► upgrade buildings ──► better treasures ──► …
```

1. **Craft treasures.** Each craft costs 5 energy. You start with 100 energy, and it regenerates over time.
2. **Enter them into rooms (arena).** A room runs a 5-minute countdown and ranks every submitted treasure by score. Placement gives points:

   | Room | Needs player level | 1st | 2nd | 3rd | 4th | 5th–50th |
   |---|---|---|---|---|---|---|
   | Beginner | 1 | 100 | 50 | 25 | 10 | 5 |
   | Intermediate | 2 | 300 | 150 | 75 | 40 | 20 |
   | Advanced | 3 | 1 000 | 500 | 250 | 100 | 50 |

   How many treasures you may submit per round depends on the Workshop level: 6 → 8 → 12 → 16 → 20. Auto-deploy exists: you set how many treasures, which quality, whether to go ascending or descending, and whether partial fills are allowed.
3. **Upgrade buildings with coin 410002**, which you earn from rounds (`match_reward`).

### Treasures

4 types (the paid-skill descriptions call them sword, spear, staff, and dagger; the icons show Potion, Pill, Ore, and Machine) × 7 qualities:

| Q | Colour | Score |
|---|---|---|
| 1 | Green | 20–100 |
| 2 | Blue | 100–180 |
| 3 | Purple | 180–300 |
| 4 | Orange | 300–460 |
| 5 | Red | 460–650 |
| 6 | Diamond | 650–900 |
| 7 | Rainbow | 900–1 200 |

Base quality chance depends on your **player level** in the event. You gain XP by crafting and playing, and each level also unlocks the next room:

| Lv | XP needed | Green / Blue / Purple / Orange / Red | Dev note |
|---|---|---|---|
| 1 | 0 | 60 / 30 / 10 / – / – | "F2P: first ~2 days in the beginner room" |
| 2 | 10 000 | 40 / 30 / 20 / 10 / – | "F2P: days 3–5 in the intermediate room" |
| 3 | 80 000 | 20 / 20 / 30 / 20 / 10 | "F2P: advanced room from ~day 6; Diamond/Rainbow never drop naturally" |

**Diamond and Rainbow only come from the Golden Eye building.**

### Buildings (`GemCreationBuildType`)

| Building | Levels | Effect | Cost |
|---|---|---|---|
| **Workshop** | 1–5 | Caps the level of every other building. Raises submissions per round (6→20). | 410002: 1k / 3k / 10k / 20k |
| **Golden Eye** | 1–10 | Gives a chance to **promote a crafted treasure one quality up** (`is_used_eye`). | **410001** (premium): 50 → 1 500 per level |
| **Anvil** | 1–5 | Raises the minimum score within a quality by +0/20/40/60/80. | 410002: 1k / 5k / 25k / 150k |
| **Rest house** | 1–5 | Energy cap 100/120/140/160/200. Regen +10/12/14/16/20 per hour. | 410002: 1.5k / 4.5k / 15k / 50k |
| **Forge** ×4 (one per type) | 1–5 | Raises the chance of that type (≈25/35/50/65/85%). With all 4 forges at level 5, you can **choose** the type. | 410002: 500 / 1k / 1.5k / 2k each |

Golden Eye promotion chance (weight out of 10 000, *(inferred)* = percent × 100):

| Eye Lv | G→B | B→P | P→O | O→R | R→Diamond | Diamond→Rainbow |
|---|---|---|---|---|---|---|
| 1 | 20% | 10% | 5% | 0 | – | – |
| 3 | 80% | 50% | 20% | 10% | 1% | – |
| 5 | 100% | 100% | 40% | 25% | 4% | – |
| 6 | 100% | 100% | 50% | 30% | 7% | 1% |
| 8 | 100% | 100% | 80% | 40% | 15% | 5% |
| 10 | 100% | 100% | 100% | 80% | 50% | **30%** |

The Eye requires Workshop 1/2/3/4 for Eye levels 5/7/9/10. The dev note on Workshop 2 advises: *"prioritise Rest house, Anvil, and talents first; hold off on the Eye."*

### Hidden progression

- **Proficiency per type (0–10).** XP equals the final score of treasures of that type. It shifts where your score lands inside the quality band: at level 0 all five 20%-steps are equally likely, and at level 10 you get 80% chance of the top step and 20% of the next one down. **Stick to one or two types.**
- **Collection (0–7).** Every distinct type × quality combination counts, 28 in total. At 4/8/12/16/20/24/28 collected, all scores get **+1 / 2 / 4 / 8 / 12 / 16 / 20 %**.
- **Rare drop.** A craft can drop 410001 (`rare_drop_rate 10`).

### Paid tools (usable inside a room)

| Item | Effect |
|---|---|
| 410005 Double Prism | Doubles the score of your best treasure in that room. |
| 410007 Quality Eye | Shows the room's average quality. |
| 410006 Score Eye | Shows the room's average score. |
| 410004 Insight Lens | For 15 minutes, shows the quality and score of every treasure of one type across all rooms. |

Using the tools well is the real skill in this event. Scout the average first, then enter where your treasure places top 3.

### Currencies

| Item | Role |
|---|---|
| 410001 (q8, Coin 1) | Premium. Used for Golden Eye upgrades and energy purchases (5 per +10 energy; daily cap 200). |
| 410002 (Coin 2) | Earned from rounds. Used for all other buildings. The leaderboard uses this icon. |
| 410003 (Coin 3) | Battle-pass points, earned from tasks. |
| 410008 | Ticket for the event gacha (`active_gacha_optional`, pity at 40 pulls, 1 free pull). |
| 410009 | Energy item. |

### Tasks (70, one-time)

| Target type | What it counts *(inferred from values)* | Range |
|---|---|---|
| 614 | Total score | 500 → 1 000 000 (19 steps; bonus 410001 ×1/10/100/200 at 4k/45k/280k/1M) |
| 615 | Craft N treasures of quality X (`target_id` = quality) | 10 each for Q1–4; 5 and 10 for Q5–7 (up to 100× 410001) |
| 618 | Building level (`target_id` 1 = Workshop, 2 = Anvil, 3 = Rest, 4 = Eye) | Level 2–5 (Eye up to 10; pays the paid tools) |
| 619 | Collection level | 2 → 7 |
| 620 | Unknown. Values 2–16; could be rounds or top finishes | – |

**Battle pass:** 33 quests (8 daily-style, 25 progress). There is a free track and a paid track.

### Leaderboards (3 tabs)

| Tab | Rank type | Reward table | 1st place | Places 1001–9999 |
|---|---|---|---|---|
| 1 | 3 (group 1) | 1 | 15× 1115 + 25× 1114 + 20× 410001 | 5× 1114 |
| 2 | 4 (group 1) | 2 | same as tab 1 | same |
| 3 (shown first) | 5 (group 2) | 3 | **5× 1116 + 100× 1115 + 200× 1114** | 5× 1114 |

1114 / 1115 / 1116 are **Throne equipment materials** (level material Rare 1, level material Rare 2, and protect material). So Golden Eye is the main source of Throne-equipment materials in its window. Rewards reach place 9 999, so any participation pays something.
*(inferred)* Group 2 (tab 3) is the larger scope, cross-server or total ranking, and tabs 1–2 are the smaller personal or server scopes.

### Short player guide

1. **Days 1–2:** Craft everything, level the Rest house and Anvil, and enter the beginner room. Collect all 4 types in Green, Blue, and Purple for the collection bonus.
2. **Days 3–5:** Once you reach player level 2, move to the intermediate room. Level the Workshop to raise submissions, then level the Forges of your one or two main types.
3. **Day 6+:** Advanced room, where 1st place pays 1 000 points versus 100 in the beginner room. Put 410001 into the Golden Eye; at level 6 or higher, Diamond → Rainbow becomes possible.
4. In each round, check the average with the Quality or Score Eye first. Enter where you can take the top 3, and keep Double Prism for your best treasure in an Advanced round.
5. Spend energy before it caps. The Rest house cap is 100–200.

---

## Open questions

- Exact scoring for the Relic Rank (`target_type 88`) and for Golden Eye tasks 614/620. This needs the server or a Frida hook on quest progress.
- EN names, descriptions, and help texts (help IDs 10088/10089/10090). Get them with `harvest_l10n_global.py` once the events are live.
- Whether the q8 totem 1002 scores in Totem Rank.

## Sources (all GLOBAL, 20260925_074413 / region_02)

`active/active.json`, `active/active-rank/*`, `active/active_quest.json`, `active/active_recharge_shop.json`,
`active/gem_creation/*`, `active/active_leaderboard_type.json`, `active/active_leaderboard_reward.json`,
`active/active_recurring_quest_detail.json`, `active/active_festival/active_festival.json`,
`charge/battlepass/battlepass_quest.json`, `item.json`, `totem/totem.json`, `proto/code-zero.proto` (GemCreation*),
JS `ranking-rush/RankingRushSystem.js`, `ranking-rush/ui/UIRankingRushHelper.js` (94792).

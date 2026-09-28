# Tower Defense: mechanics and economy overview

Compiled September 28, 2026, from `gameBalance.tuning.json`, `sim.js`, `favor.js`,
`campaign.js`, `waves.js`, `skills.js`, `tdSummon.json`, and `tdCampaign.json`.
Purpose: one reference for what each system is for, how the currencies flow, and
where the balance levers live — plus recommendations at the end.

---

## 1. The two layers

The game is a **single-run tower defense roguelite** wrapped in a **persistent
gacha meta-game**.

- **Inside a run** everything is temporary: gold, levels, focus, paths, awakening,
  training, virtues, boons. Falling in battle or ending the run wipes them.
- **Outside a run** everything accumulates: Favor, class Insight, campaign
  currencies, owned heroes, hero levels/stars/evolution, blessing tree nodes.

The connection between the layers is the reward loop: runs pay out Favor,
Insight, shards, campaign currencies and Divine Seals; the meta layer feeds back
as starting bonuses (blessings), stronger heroes (campaign levels/stars), and
more heroes to pick (summons).

## 2. Currency map — what we use for what

| Currency | Layer | Earned by | Spent on | Tuning location |
| --- | --- | --- | --- | --- |
| **Gold (in-run)** | run | starting 340, kill rewards (10–100), wave-clear bonus (50 + 10/wave), quests (~40+10/wave), Soul Reaper boon, selling (50% refund) | deploys (85–150), upgrades L2–4 (80/120/160), awakening (220), training (120 × 1.3ⁿ) | `run`, `enemies.*.reward`, `upgrades`, `awakening`, `training`, `quests` |
| **Favor** | meta | every run: 10/wave + 5/perfect wave + 20 boss + 1/life left; challenges (40/60 × tier); daily goal (100); expedition finish (300) | blessing tree trunk nodes | `favorEarn`, `blessingTree.json` |
| **Class Insight** | meta | per class: 1/wave with that class deployed + 1 per N kills | class branches of the blessing tree (incl. Infusion status effects) | `blessingTree.json` |
| **Shards** | run-start boost | runs reaching wave 3+: pick gold (+60), a starting virtue, or bonus Favor (10% of run Favor, min 5) | consumed on the next run | `shards` |
| **Campaign Gold** | meta | stage clears (replays pay 25%) | campaign hero levels, star promotions | `tdCampaign.json` |
| **Hero XP** | meta | stage clears | campaign hero levels | `tdCampaign.json` |
| **Divine Seals** | meta | first stage clears, daily trial goal (15), expedition complete (60) | summons (60 per pull, 10-pulls) | `tdSummon.json` |
| **Seal Dust** | meta | 30 per duplicate copy, 2 per seal | (conversion currency) | `tdSummon.json` |
| **Divine Essence** | meta | 150 per dust conversion / late stages | hero evolution tiers | `tdSummon.json`, `tdCampaign.json` |

## 3. In-run economy (Free Play)

**Income per 10-wave classic run:** ~340 start + ~2,200 kill rewards + ~950
clear bonuses + quests ≈ **3,800–4,000 gold**. Kill rewards are the dominant
source (~59% since September 28, 2026 — previously the clear bonus dominated
at ~48%); every leaked enemy is now visibly lost income.

**Sinks:** a full 5-hero deployment costs ~500–700. Level 4 on one hero costs
360; awakening 220; training escalates 120 → 156 → 203 → … (×1.3 per purchase,
any stat). Fully maxing one hero (L4 + awaken + a few trainings) costs
~800–1,200 — so a run's income supports roughly **2–3 heavily invested heroes
or 4–5 moderately upgraded ones**. Selling refunds 50% of everything invested,
which is the pressure valve for misplacement.

**Progression steps per hero (all in-run, all lost when the hero falls):**

1. **Levels 1→4** — +10% attack, +20% max HP per level (80/120/160 gold).
2. **Focus (at L3)** — pick attack +10%, health +25%, or range +20%.
3. **Class path (at L4)** — one of three class-defining passives (e.g. Tank:
   Bulwark/Thorns/Warden; Mage: Wildfire/Frost/Arc).
4. **Awakening (past L4, 220 gold)** — +15% attack, +25% HP, and a stronger
   ultimate (per-hero awaken text in `skills.js`).
5. **Training (after awakening)** — repeatable +8% attack / +12% HP / +8% range
   (range capped at 3 buys), price grows ×1.3 per buy — the infinite gold sink.

## 4. Combat mechanics stack

- **Blocking:** road heroes hold enemies (Tank 3, Warrior 2, Assassin 1);
  held enemies take +20% damage; enemies slipping past a full blocker are
  slowed 20% for 1.5 s.
- **Classes:** Tank (taunt ult), Warrior (cleave), Assassin (dash to loose
  enemies, execute below 35%), Mage (slow, splash/chain, magical), Archer
  (long range, pierce, crit, +100% vs air, targets strongest), Support
  (heals, +35% passive attack aura on allies in range).
- **Hero ultimates:** 21 unique variants (`heroSkills`), each ~250% × tier
  ult power, plus class add-ons; awakened versions are ~30–50% stronger.
- **Statuses & reactions:** Poseidon→wet, Phoenix→burn, Medusa/Jormungandr→
  poison, Prometheus→chill. Pairs react: Conduct (wet+chain), Steam (wet+burn),
  Blight (poison+burn), Freeze (wet+chill), Soul Harvest (poison+soul drain).
  Class Infusion blessings let any class apply a status.
- **Virtues:** 12 common stat blessings with hero-flavored names + 4 pair
  combos; **run boons**: 8 rare/epic mechanic modifiers (Storm Surge … Soul
  Reaper) offered when the deployed team can actually use them.
- **Synergy:** +8% attack per shared tag between nearby heroes (250px), cap 24%.
- **Rings:** special map tiles (high ground +20% range, shrine +30% ult
  charge, cursed +30% atk / −20% speed).
- **Enemies & counters:** 12 kinds. Flyers need platforms; brutes/bosses are
  physical-armored but magic-weak; shieldbearers want many fast hits; menders
  want splash/priority; broodcallers (summon imps) and hexers resist magic and
  want archers; Lilith is immune while her children stand.
- **Bosses:** Baphomet (marks the highest recent damage dealer — silence +
  10% HP; defensive stance) and Lilith (summons brood, enrages below 50%).

## 5. Run modes and difficulty

| Mode | Waves | Notes |
| --- | --- | --- |
| Classic | 10 | authored `tdWaves.json`, boss on 10 |
| Long | 20 | base waves + generated, mid-boss at 40% on wave 5/15 |
| Endless | ∞ | boss every 5 waves, counts +2%/wave, gaps −2%/wave (floor 55%) |

**Difficulty tiers:** Normal ×1 / Heroic ×2 HP, ×1.3 atk / Mythic ×3.2 HP,
×1.6 atk — with ×1/×1.3/×1.6 Favor payout. On top sits a global
`difficulty.enemyHp: 3.75` multiplier and per-mode HP scalars (expedition
stages +35/50/65%). **Mutators** (endless/daily, pick 1 of 3 every 10 waves):
Fortified, Haste, Warded, Horde, Ironclad, Elites — each pays bonus Favor.

**Side modes:** Daily Trial (seeded fixed setup, no blessings, comparable
scores), Expedition (roguelite chain: 3 random starters, camp cards after each
stage, lives carry over), Challenges (per-map conditional goals paying Favor).

## 6. Campaign and gacha (the persistent half)

- **Structure:** chapters of authored stages on the existing maps; squad of up
  to 4 owned heroes; win to unlock the next stage. First clears pay full
  rewards, replays 25% (Divine Seals are first-clear only).
- **Starters:** demeter, jormungandr, horus, fengyi, artemis, freya.
- **Campaign hero levels:** 1–10, +6% atk/HP per level, costing campaign Gold
  (100 + 50/level) and Hero XP (50 + 25/level) — **campaign stages only**.
- **Stars:** duplicates become copies; heroes start at 0 stars; 1/1/2/3/4
  copies + 100/200/400/600/800 Gold promote to 1–5 stars at +10% stats each.
- **Level cap:** 0–5 stars cap levels at 10/20/30/40/50/60. Per-level gain
  drops by band: +6% (2–10), +3%, +2%, +1.5%, +1.5%, +1% (Lv 60 = +144%).
- **Evolution:** Divine Essence buys tiers (Evolved I: +20% ult damage, II:
  +10% crit, III: −15% ult cooldown, …).
- **Might:** one battle-power number per hero, (Attack + Health) × level ×
  stars × (1 + 0.06 per evolution tier). Sorts the Heroes roster; squad Might
  is compared to each stage's recommended Might (from its hp scale).
- **Summons:** one banner ("Ember at the Crossing"), 60 Divine Seals per pull,
  10-pull option, pool = full roster, featured 4 heroes rotate every 14 days
  at 5× weight. Duplicates → copies + 30 Seal Dust; dust converts to Divine
  Essence at 150.
- **Seal income:** daily goal 15, expedition complete 60, first clears —
  so a free player earns roughly **one pull every 4 days** from the daily
  alone, faster with expeditions and campaign progress.

## 7. Where every balance lever lives

| Lever | File | Key |
| --- | --- | --- |
| Hero base stats/costs | `gameBalance.json` (generated by `build:game-balance`) | per hero |
| Class multipliers | tuning | `classes.*` (hpMult, dpsMult, valueDps…) |
| Global difficulty | tuning | `difficulty.enemyHp` (1 = off; debug-panel knob only) |
| Tier difficulty | tuning | `tiers.*` |
| Enemy stats | tuning | `enemies.*`, `bosses.*` |
| In-run economy | tuning | `run`, `upgrades`, `awakening`, `training`, `quests` |
| Meta earn rates | tuning + modules | `favorEarn`, `daily.js`, `expedition.js`, `challenges.js` |
| Gacha | `tdSummon.json` | banner cost, weights, dust |
| Campaign progression | `tdCampaign.json` | heroLevels, heroStars, evolution, heroMight, repeatShare |
| Verification | `scripts/test-td-*.mjs` | sim checks, balance harness, daily bot |

---

## 8. Recommendations

Ordered by impact on a solid TD-gacha experience.

**1. Use the existing analysis suite before touching numbers — and close its
one gap.** The systems above interlock through ~8 multiplicative layers
(atkFor alone chains base × level × virtues × favor × class bonus × awakening
× focus × training). Nobody can balance that by feel. The repo already has
most of the measurement tooling — do not rebuild it:

| Script | Covers |
| --- | --- |
| `npm run td:sweep` | win/loss per squad, map, mode across enemy-HP multipliers |
| `npm run td:progression` | Favor/Insight income over a bot account's lifetime; blessing impact |
| `npm run td:pacing` | class payoffs, per-map win rates, campaign pacing, seal income |
| `npm run td:classes` | class-vs-enemy matrix, mono-class squads |
| `npm run td:upgrade-sweep` | campaign win rates by stars/evolution; summon economy |

The remaining gap — the **in-run gold ledger** — is now closed by
`npm run td:economy` (September 28, 2026): income by source (starting gold,
kills, clear bonus + boons, quests, sell refunds) against spend by sink
(deploys, levels, awakening, training) per mode and tier. First measurements
(Normal, moonlit-pass, cheapest policy): clear bonus + boons supply 48–59% of
income vs. 25–31% from kills; in classic, 70% of spending goes to levels 2–4
and awakening/training barely engage (~90 gold/run) — the deep sink only
activates in long (62% awakening+training) and endless (76%). Runs end with
~200–370 gold left over. Use this table to validate recommendation 3 (kill
reward visibility) and recommendation 7 (training sink health).

**2. Unify the difficulty multipliers.** *(Implemented September 28, 2026.)*
The global 3.75× multiplier is folded into the enemy table: `tuning.enemies`
now shows real Normal HP (grunt 337.5, boss 8250, Lilith 9750) and
`difficulty.enemyHp` is 1 (kept only as a debug-panel knob). The remaining
layers are semantic and stay: wave ramp (0.15/wave), map scale (`map.enemyHp`),
difficulty tiers, endless ramp, expedition stage ease-in. Verified
bit-near-identical: sweep at hp=1 unchanged (3/5 wins), classic gold ledger
identical, campaign win rates within noise.

**3. Make kill rewards matter or hide them.** *(Implemented September 28,
2026.)* Kill rewards were doubled across all enemy kinds and the wave-clear
bonus halved (50 + 10/wave). Measured with `td:economy` (classic): kills went
from 31% to 59% of run income, the clear bonus from 48% to 23%, total income
rose ~7% and end-of-run leftover from ~184 to ~292 gold. Leaks now visibly
cost gold, which was the goal. If the extra ~300 gold proves too generous in
play, trim the clear bonus to 40 + 8/wave rather than touching kill rewards
again.

**4. Add pity and a dust sink to the gacha.** *(Implemented September
28, 2026, logic and UI; pity enabled the same day after the rarity weights
landed.)* (a) `pityNewInMulti`: a full x10 that draws no new hero replaces the
last duplicate with a weighted draw from the unowned pool — duplicates in a
x10 always convert into at least one collection entry until the pool is
exhausted. Initially shipped disabled (21-hero pool, no fillers); enabled once
the rarity weights and 33-hero pool were in, after a 4,000-run simulation
showed no early-game effect (≈7 new in the first x10 either way) but a fixed
collection tail (full collection median 46 → 12 x10, first legendary P90
11 → 8). (b) `buyCopiesWithDust`: 100 Seal
Dust buys 1 spare copy of an owned hero (`dust.copyPrice`), a targeted sink
for duplicate income — active and visible on the Summon screen. (c) Rarity
odds, added on the owner's "legendary / epic / common"
direction: every hero carries `rarity` (legendary = tiers S/A, epic = B/C,
common = D/recruits) and the banner weights draws legendary 1 / epic 4 /
common 10 with the featured hero at 5× its rarity weight; per-rarity rates
show on the banner.

**5. Separate the three progression identities clearly.** *(Implemented
September 28, 2026.)* A hero's strength comes from in-run levels (temporary),
campaign levels/stars/evolution/skills (permanent, campaign-only), and Divine
Blessings (permanent, Free Play and Expeditions). The campaign hero panel now
shows a progression-layers block: the campaign power multiplier with its
Level / Stars / Evolution / Skills breakdown, one line each for the two
non-campaign layers, and the scope note that campaign upgrades apply in
Campaign stages only. The Blessings screen carries the mirror note. Campaign
levels deliberately stay out of Free Play — daily/trial comparability is
preserved.

**6. Watch the deploy-cap asymmetry.** *(Implemented September 28, 2026.)*
Free Play fields up to 7 (deploy cap); campaign squads were 4, which read as
punishment for the mode that gates heroes. A sweep (35 sampled squads per
stage) showed late-stage win rates of 34-54% at squad 4, 49-81% at 5, and
near-Free-Play ease at 6 — squad size was raised to 5 and the squad screen
now names the remaining gap: "Campaign squads field 5 heroes — a tighter
fight than Free Play's 7. Your levels, stars and evolution carry you here."

**7. Training is your best sink — protect it.** *(Implemented September 28,
2026.)* Measured first (12 seeds × 5 squads × 3 maps, classic Normal): a
winning run buys 0-2 trainings and ~1 awakening — well under the 4-buy
warning line, so the early game is not too generous and the ×1.3 cost growth
stays as is. The training picker now shows each option's real relative gain
("+6.9% this time") instead of the flat base rate, so diminishing returns are
honest: the additive per-buy share of base shrinks relatively while the cost
compounds.

**8. Small currency cleanup.** Nine currencies is a lot. Seal Dust and Divine
Essence can merge into one conversion currency unless evolution is meant to
gate behind two steps. Similarly, shards (run-start boost) are subtle enough
that many players will never notice them — surface the pick on the pre-run
screen with a one-line explanation, or fold the gold shard into starting gold
and drop the system.

**Suggested first step:** the in-run gold ledger (the one gap in the existing
suite), then recommendation 2 (multiplier cleanup) — together they make every
future tuning decision measurable instead of guessed.

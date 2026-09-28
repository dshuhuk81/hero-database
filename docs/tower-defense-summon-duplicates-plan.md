# Tower Defense: duplicates, Stars and Evolution plan

Status: built (M26 sprint 9) with the numbers below; the numbers are under review. Re-check with `npm run td:upgrade-sweep`. Campaign only: nothing here touches Free Play, the Daily Trial or the Expedition.
All numbers are invented minigame balance. They live in `tdCampaign.json` / `tdSummon.json`, never in the hero database.

## Why duplicates are needed

- The TD roster is 21 heroes: 6 starters, 5 stage-reward heroes and 10 that can be summoned. Without duplicates, a x10 pull gives the whole pool and the featured odds mean nothing.
- Once the pool is empty, Divine Seals have no use.
- A full x10 at the end of the campaign only works for players who never did a single pull.

## Two upgrade paths on top of levels

The reference game has Stars (Aufstieg) and Awaken (Erwecken). The TD game already uses "Awaken" for the gold upgrade during a battle (`tuning.awakening` in sim.js), so the campaign version is called **Evolution**.

| Path | Input | Result |
|---|---|---|
| Level (exists) | Gold + Hero XP | +6% attack and health per level, up to level 10 |
| **Stars** (1 to 5) | Copies of **any** hero + Gold | Higher base stats |
| **Evolution** (I to V) | A copy of the **same** hero, or 1 Divine Essence | Better skill values |

### Stars: higher attributes
- A hero starts at 0 stars (changed 2026-09-28, was 1). Star n to n+1 costs 1/1/2/3/4 spare copies of any hero plus 100/200/400/600/800 Gold: 0 to 5 stars is 11 copies and 2100 Gold. Stars also raise the level cap (0 stars: Lv 10, +10 per star, 5 stars: Lv 60).
- Each star gives **+10% attack and health**. This multiplies with the level bonus in `campaignHeroes`.
- Picking fodder works like the reference: a panel lists spare copies, with a **Quick add** button that uses the most common copies first. Copies the player might want for Evolution are never quick-added. Picking them by hand still works.

### Evolution: better skills
Each tier costs 1 copy of the same hero, or 1 **Divine Essence**. Divine Essence is the wildcard material, like the purple item in the reference. The tiers change hero fields the simulation already reads:

| Tier | Bonus | Sim field |
|---|---|---|
| I | Ultimate power +20% | `ultPower` |
| II | Crit chance +10% | `critChance` |
| III | Ultimate cooldown -15% | `ultCooldown` |
| IV | Ultimate power +25% | `ultPower` |
| V | Ultimate starts with its awakened upgrade (the in-run Awaken per-ultimate upgrade) | `awakenedUlt` |

Tier V is the only one that needs new sim code. Tiers I to IV only change numbers in `campaignHeroes`.

### Duplicates and Seal Dust
- A summoned copy of a hero you own goes into `copies[heroId]`.
- A spare copy can be turned into **30 Seal Dust** by hand.
- Seal Dust can be exchanged for Divine Seals (**2 dust = 1 seal**), or crafted into **Divine Essence (150 dust)**. Divine Essence works as pity, so an unlucky player can still evolve the hero they want.
- Copies of a hero that is at 5 stars and Evolution V are still useful as star fodder for other heroes. Nothing turns into dust automatically.

## Summon changes
- **Banner:** `pool: "all"` makes every hero summonable, owned or not. Stage-reward heroes join the pool only after their stage is cleared, so a summon never takes a stage's reward first. Weights stay the same: the featured hero `featuredWeight`, everyone else 1.
- **`summonMany`:** draws with replacement. Each result is `{ heroId, isNew }`, and multi summon is always the full `multiCount`.
- **Reveal card:**
  - A new hero gets a "New" ribbon.
  - A duplicate gets "+1 copy", plus "Evolution ready" or "Star up ready" when that is now affordable.
- **Summon screen:**
  - The terms change from "No duplicates" to "Duplicates become copies".
  - Add a Seal Dust wallet and an Exchange panel (dust to seals, dust to Divine Essence).

## Save (campaign section, version 4)
| Field | Meaning |
|---|---|
| `copies: { heroId: n }` | Spare copies |
| `stars: { heroId: 1..5 }` | Stars (missing = 1) |
| `evolution: { heroId: 0..5 }` | Evolution tier (missing = 0) |
| `currencies.sealDust`, `currencies.divineEssence` | New currencies |

The migration from version 3 fills these with empty or zero values.

## UI
- **Heroes screen:** hero detail gets **Stars** and **Evolution** tabs next to Level, following the reference: current tier and its bonus, the list of tiers with locks, a material slot, and a confirm button. Hero cards show stars and an Evolution badge.
- **Home and Heroes card:** a dot when a Star up or Evolution is affordable.

## Code touch points
- `campaign.js`: `summonMany` with replacement, `starUp`, `evolve`, `convertCopy`, `exchangeDust`, `craftEssence`, star and Evolution scaling in `campaignHeroes`, version 4 in `sanitizeCampaign`.
- `tdCampaign.json`: `heroStars { max, statPerStar, copies, gold }`, `heroEvolution { tiers: [...] }`.
- `tdSummon.json`: `pool: "all"`, `dustPerCopy`, `dustPerSeal`, `essenceDust`.
- `page/campaign.ts`: the Stars and Evolution tabs, and dust on the Summon screen.
- `page/summon-reveal.ts`: New / copy badges on the card front.
- `sim.js`: Tier V empowered abilities only.
- Tests: duplicate draws, star and Evolution costs and bonuses, dust and essence, the version 3 to 4 migration, and the balance check (`test:td-balance`, `td:sweep`) with maxed heroes.

## Economy check (proposed numbers)
- One hero at 5 stars and Evolution V needs 10 copies of any hero plus 5 copies of that hero or Divine Essence.
- Each pull is a duplicate once the collection is complete. The chance of a given non-featured hero is about 1 in 25.
- Five copies of one hero by luck alone takes about 125 pulls. Divine Essence caps that: 5 Essence = 750 dust = 25 spare copies.
- The build rebalances seal income against these costs, and the td:sweep run checks that campaign stages stay beatable without Stars and Evolution.

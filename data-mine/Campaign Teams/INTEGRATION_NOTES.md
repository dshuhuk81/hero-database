# CN Campaign Teams -- Integration Notes
Date: 2026-04-08
Source: Chinese server community image set (6 .webp files in this folder)

---

## Source Material

Six images from the CN server documenting campaign team compositions.
Each image shows: Core Hero + Team members | Matchup Targets | Recommended Totem | Star Rating (1-5) | Description.

| Image | CN Team Name | Core Hero |
|---|---|---|
| drittes Team.webp | San Xiang / Three Phase Sweep | Meret (not yet in DB) |
| hercules.webp | Da Li Shen / Heracles Team | Heracles |
| hladhgunnr team.webp | Swan Valkyrie Team | Hladgunnr |
| nezha team.webp | Nezha Solo God Team | Nezha |
| skadi team.webp | Ice Queen Control Team | Skadi |
| sonstiges team.webp | National Team | Multiple (incl. Nut, not yet in DB) |

---

## Heroes Not Yet in DB (seen in these images)

These heroes appear in curated team comps but have no JSON entry yet.
They display as empty slots in HeroCompositions until added.

| Hero | CN Name | Role | Note |
|---|---|---|---|
| Meret | Mai Er Te | Support | Appears in 3 different teams. Most-needed missing hero from this data. Guides file: guides/meret-guide.md |
| Nut | Nu Te | Mage | Appears in Hladgunnr Ultimate + National Team. guides/nut-guide.md |
| Eris | E Li Si | Archer | Finisher role in Heracles team. guides/eris-guide.md |
| Serket | Sai Er Kai Te | Warrior | Second DPS core in Heracles Dual Core variant. guides/serket-guide.md |
| Hera | He La | Support | Charm Support in Hladgunnr Charm variant. guides/hera-guide.md |

---

## Changes Made to the Database

### 1. Rating Updates

| Hero | Field | Before | After | Reason |
|---|---|---|---|---|
| Jormungandr | pve | S | SS | Key enabler in Heracles Corpse Explosion and Hladgunnr Snake/Ultimate variants (both 4-5 star) |
| Jormungandr | overall | S | SS | Reflects corrected pve impact |
| Hephaestus | pve | A | S | CN Standard Nezha team with Hephaestus beats almost all campaign teams (4 stars) |

Files changed: `src/data/heroes/jormungandr.json`, `src/data/heroes/hephaestus.json`

---

### 2. Curated PvE Team Comps Added

Stored in `teamComps.pve[]` array inside each hero JSON.
The `scripts/generator.js` now reads this field and injects entries with `label: "curated"` at the top of the pve list in `src/data/derived/teamCompsByHeroId.json`.

#### Heracles -- 5 Variants (hercules.webp)

| Label | Stars | Targets | Key Heroes |
|---|---|---|---|
| Basic | 3 | General | Heracles + any 4 supports |
| Finisher | 4 | General | + Eris (execute), Meret |
| Dual Core | 5 | General | + Serket (2nd DPS), Meret, Eris |
| Corpse Explosion | 4 | Treant | + Jormungandr (simultaneous explosion) |
| Corpse Explosion Advanced | 5 | Treant + General | + Jormungandr, Nut, Meret |

File changed: `src/data/heroes/heracles.json`

#### Nezha -- 4 Variants (nezha team.webp)

| Label | Stars | Targets | Key Heroes |
|---|---|---|---|
| Rush | 1 | Weak enemies / early game | Nezha + 4 throwaway units |
| Standard | 4 | General (not Jormungandr) | + Hephaestus, Meret (4 buff supports) |
| Three Phase Variant | 5 | General | + Meret (Nezha as sweep core) |
| Heracles Variant | 5 | General | + Heracles (crowd-gather), Meret |

File changed: `src/data/heroes/nezha.json`

#### Skadi -- 2 Variants (skadi team.webp)

Teams confirmed by user: Skadi | Poseidon | Khepri | Pan | Nuba/Cronus

| Label | Stars | Targets | Key Heroes |
|---|---|---|---|
| Standard | 4 | General (hardest matchups) | Skadi, Poseidon, Khepri, Pan, Nuba |
| Ultimate | 5 | Dog-heads + Treant | Skadi, Poseidon, Khepri, Pan, Cronus |

File changed: `src/data/heroes/skadi.json`

#### Hladgunnr -- 4 Variants (hladhgunnr team.webp)

| Label | Stars | Targets | Key Heroes |
|---|---|---|---|
| Basic | 1 | Early Campaign | Hladgunnr + generic frontline |
| Charm | 5 | General | + Hera (charm synergy), Nut |
| Snake | 2 | General | + Jormungandr (needs 3+ explosions, unreliable) |
| Ultimate | 5 | General | + Jormungandr, Nut (clears screen, Hladgunnr finishes survivors) |

File changed: `src/data/heroes/hladgunnr.json`

---

### 3. Infrastructure Changes

#### scripts/generator.js
Added function `buildCuratedComps(anchor, mode)` that:
- Reads `hero.teamComps[mode]` array from each hero JSON
- Builds a structured comp entry with `label: "curated"`, `curatedLabel`, `description`, `stars`, `targets`
- Injects these at the top of the pve output list (before algo-generated comps)
- Heroes not yet in DB are represented by a minimal stub object so the comp still renders

Output assignment changed from `pve: buildCompsForMode("pve")` to `pve: [...buildCuratedComps(anchor, "pve"), ...buildCompsForMode("pve")]`.

#### src/components/HeroCompositions.astro
- Header now shows `curatedLabel` text + star rating (gold) instead of numeric score for curated comps
- Faction bonus pill replaced with gold "vs: TARGET" pill for curated comps
- Description block added below formation grid (italic, gold left border) for curated comps
- CSS added: `.curated-stars`, `.curated-pill`, `.curated-description`

---

## Totems (Not Integrated)

The CN images show recommended totems per team variant. These were NOT added to the database because:
1. The totem icon types in the images could not be reliably identified without the full icon mapping
2. No `recommendedTotem` field exists in the hero JSON schema yet

If you want to add totem recommendations later, a new optional field `totem` in each `teamComps.pve[]` entry would be the right approach.

---

## National Team (sonstiges team.webp) -- Not Yet Integrated

The "National Team" image shows 6 alternative support combinations for a single core carry.
The core is not identifiable from the image alone, and multiple heroes in this team are not yet in the DB (Nut).
Description: "Strongest team in Buxiu Zhenyan -- 4 god supports for the carry."
Totem: Sunflower pattern (single totem icon visible).
This will be actionable once Nut is added to the database.

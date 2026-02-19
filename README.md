# Hero Database

## Ranking Score (2026-02 Update)

The global ranking score now combines three parts:

1. **Class-weighted base stats** from Divine 5 raw in-game stats (no normalization): HP, ATK, Armor, M-Res.
2. **Percent stats bonus** from selected % stats (e.g. Crit, Dodge, ATK SPD).
3. **Synergy potential bonus** based on synergy tags.

The same score is used in the rankings page and the hero detail page:
- [src/pages/rankings.astro](src/pages/rankings.astro)
- [src/pages/heroes/[id].astro](src/pages/heroes/%5Bid%5D.astro)

### Formula (High-Level)

Let base stats be weighted by class, then add percent stats and synergy bonus:

$$
	ext{Score} = \text{BaseScore(class)} + \text{PercentScore(class)} + \text{SynergyScore}
$$

Where:
- **BaseScore** uses HP/ATK/Armor/M-Res scaled as before, then multiplied by class weights.
- **PercentScore** sums selected percent stats, then applies a global weight and a class multiplier.
- **SynergyScore** is `synergyPotential * SYNERGY_WEIGHT`.

## How To Adjust (Tuning)

### 1) Class Weights

Edit `CLASS_WEIGHTS` in:
- [src/utils/rankingScore.js](src/utils/rankingScore.js)

Example:

```js
const CLASS_WEIGHTS = {
	Tank: { hp: 1.2, atk: 0.9, def: 1.2, pct: 0.8 },
	Warrior: { hp: 1.05, atk: 1.05, def: 1.0, pct: 0.95 },
	Mage: { hp: 0.85, atk: 1.15, def: 0.9, pct: 1.05 },
	Archer: { hp: 0.9, atk: 1.1, def: 0.85, pct: 1.2 },
	Assassin: { hp: 0.85, atk: 1.2, def: 0.8, pct: 1.2 },
	Support: { hp: 1.0, atk: 0.95, def: 1.05, pct: 1.1 },
};
```

### 2) Percent Stats Used

Edit `PERCENT_STATS_FOR_SCORE`:
- [src/utils/rankingScore.js](src/utils/rankingScore.js)

Add or remove keys like `critRate`, `dodgeRate`, `atkSpdBonus`.

### 3) Global Weights

Adjust these constants in:

```js
const PERCENT_STAT_WEIGHT = 8;
const SYNERGY_WEIGHT = 1;
```

Larger values increase the impact of percent stats or synergy on the final score.

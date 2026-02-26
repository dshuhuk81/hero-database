# 📊 HERACLES SKILL POWER ANALYSIS REPORT

**Hero:** Heracles  
**Class:** Warrior | **Role:** Nimble  
**Rarity:** Legendary | **Rating:** SS (PvP: SS, PvE: S)

---

## Summary

Heracles has **weak skill power scores** not because his skills are weak in-game, but because **his skill descriptions lack specific damage multipliers**. The new skill analyzer requires explicit percentages (e.g., "120% ATK damage") to rate skill quality, and Heracles' descriptions are too vague.

---

## Skill Breakdown

### 1️⃣ Scarred Fury
**Type:** Damage + Shield | **Upgrades:** Yes (4 levels)

```
"Stores a portion of DMG taken and then releases it, dealing DMG to surrounding 
units and gaining a shield."
```

**Analysis:**
- ❌ **No extractable damage %** - "dealing DMG" is not quantified
- ✅ **AoE:** "surrounding units" detected (+1.0x)
- ✅ **Utility:** "shield" keyword detected (+0.3 component)
- ✅ **Maturity:** Has 4 upgrades (+10% bonus)
- **Warrior Weight:** damage × 1.5, aoe × 1.2, utility × 1.0

**Estimated Score:** ~2.1-2.4

**Why Low:** No concrete damage multiplier means it scores as "basic" tier (0.7 pts base).

---

### 2️⃣ Worldshaker
**Type:** Crowd Control + Area Damage | **Upgrades:** Yes (4 levels)

```
"Grapples a target, dashes to the most enemy-clustered area, and deals AoE DMG."
```

**Analysis:**
- ❌ **No extractable damage %** - "deals AoE DMG" is vague
- ✅ **AoE:** "enemy-clustered area" detected (+1.0x)
- ✅ **CC:** "Grapple" is not in keyword list, but skill effect suggests control
- ✅ **Maturity:** Has 4 upgrades (+10% bonus)

**Estimated Score:** ~1.8-2.1

**Why Low:** No explicit damage %, CC effect not properly detected by keyword system.

---

### 3️⃣ Savage Smash
**Type:** Crowd Control + Utility | **Upgrades:** Yes (4 levels)

```
"Deals DMG and knocks down units in a cone. Gains a shield and restores HP."
```

**Analysis:**
- ❌ **No extractable damage %** - "Deals DMG" not quantified
- ✅ **AoE:** "cone" detected (+1.0x)
- ✅ **CC:** "knockdown" is NOT in keyword list (missing: knockdown, knockback synonym issue)
- ✅ **Utility:** "shield" + "restores" detected (+0.6 component)
- ✅ **Healing:** "restores HP" detected (+utility scaling)
- ✅ **Maturity:** Has 4 upgrades (+10% bonus)

**Estimated Score:** ~2.2-2.5

**Why Low:** Damage multiplier extraction fails; CC keyword detection misses "knockdown".

---

### 4️⃣ Godhood Ascension (Ultimate)
**Type:** Transformation | **Upgrades:** Yes (4 levels)

```
"Heracles increases his max HP and converts his ATK into max HP."
```

**Analysis:**
- ❌ **No extractable damage %** - Conversion mechanic, not damage-based
- ✗ **AoE:** No
- ✗ **CC:** No
- ✅ **Utility:** "increases" keyword detected (+0.3 component)
- ✅ **Warrior Weight:** Utility × 1.0 (Warriors value utility 1.0x, not 2.5x like Support)
- ✅ **Ultimate Bonus:** +15% (4th skill, 4+ skills = qualifies)
- ✅ **Maturity:** Has 4 upgrades (+10% bonus)

**Estimated Score:** ~1.5-1.8

**Why Lowest:** Transformation skill has no damage multiplier and limited utility keywords.

---

## Why Heracles Scores Low: Root Causes

### 1. **Data Description Issue** (Primary Problem)
Heracles' skill descriptions lack **specific percentage multipliers**. Compare:

| Hero | Skill Description (Current) | Better Description |
|------|--------------------------|-------------------|
| **Heracles** | "Deals DMG to surrounding units" | "Deals DMG equal to 250% ATK to all surrounding units" |
| **Nuwa** | "Bulwark Figurine attacks, dealing DMG equal to **270% of ATK**..." | ✅ Specific |
| **Dionysus** | "Restoring HP equal to **120% of ATK**..." | ✅ Specific |

The analyzer **cannot estimate** damage tiers when descriptions are vague.

### 2. **Keyword Detection Gaps**
- ❌ "Grapple" not recognized as CC (similar to "grab", "pull")
- ❌ "Knockdown" missing from CC_KEYWORDS (only has "knockback")
- ⚠️ Conversion mechanics (ATK → HP) don't fit any damage/utility category

### 3. **Class Weight Mismatch**
Heracles is **Warrior**, which has moderate weight distribution:
```javascript
Warrior: { 
  damage: 1.5,      // Not as high as Mage (2.5) or Assassin (2.6)
  aoe: 1.2,
  cc: 1.0,
  utility: 1.0,
  healing: 0.8
}
```

Even with AoE + shield + healing, Warriors get less multiplier than pure DPS classes.

### 4. **No Team-Wide Effects**
Heracles' skills are **personal/selfish**:
- Scarred Fury → Self shield
- Worldshaker → Single target grapple
- Savage Smash → Self shield + heal
- Godhood Ascension → Self buffing

**No "all allies" keywords detected** = No 3.0x or 5.0x multipliers (unlike Dionysus or Amunra).

---

## Comparison: Heracles vs Top-Tier Skills

### Heracles Skill (Generic)
```
"Deals DMG to surrounding units"
- Extracted damage: 0% (FAIL)
- Score: 0.7 damage + 1.0 aoe + 0.0 cc = 1.7 base
- Warrior multiplier: 1.7 × {1.5 damage + 1.2 aoe} = ~2.1 final
```

### Dionysus Skill (Team-Wide)
```
"Grants all allies ATK SPD +50%, Energy Regen +30%, Skill CD -30%"
- Team multiplier: 5.0x (keywords: "all allies" + "state")
- Utility keywords: 3 (energy, cooldown, increase)
- Support class weight: 2.5x for utility
- Score: ~11.76 (3x higher)
```

### Nuwa Skill (Specific Damage + Scaling)
```
"Summons a Bulwark Figurine, dealing DMG equal to 270% of ATK"
- Extracted damage: 270% → Quality tier: 1.8 (strong)
- AoE: Yes → +1.0
- Scaling: "persistent until battle end" → 5.0x team multiplier
- Tank class weight: 1.2x damage + 1.5x utility
- Score: Much higher than vague descriptions
```

---

## Recommendations

### For Better Skill Power Score (Data Fixes)

Update Heracles' skill descriptions to be more specific:

**Current:** `"Deals DMG to surrounding units and gaining a shield."`  
**Better:** `"Deals DMG equal to 200% ATK to all surrounding units and gains a shield equal to 200% ATK."`

**Current:** `"Grapples a target, dashes to the most enemy-clustered area, and deals AoE DMG."`  
**Better:** `"Grapples a target, dashes to the most enemy-clustered area, and deals AoE DMG equal to 180% ATK to all enemies in the area."`

### For Better Skill Analyzer Detection

1. **Add missing CC keywords:**
   - "grapple", "grab", "pull", "knockdown" (in addition to "knockback")

2. **Improve conversion skill detection:**
   - Recognize "convert" mechanics (ATK→HP, ATK→Shield) as defensive utility

3. **Better describe ultimates:**
   - Heracles' "Godhood Ascension" is a transformation ultimate but scores poorly
   - Could have phrases like "Permanent state" or "Multiplies survivability" to detect scaling

---

## Conclusion

**Heracles isn't weak—his skill descriptions are incomplete.**

- ✅ In-game: SS-rated Warrior with solid utility (shields, healing, CC)
- ❌ Skill Power Score: Low due to vague descriptions lacking damage multipliers
- 📝 **Fix:** Add specific % multipliers to all skill descriptions
- 🔧 **Analyzer:** Expand keyword detection for grapples, knockdowns, and conversion mechanics

Once descriptions are updated with concrete damage/healing percentages, Heracles' skill power will accurately reflect his legendary status.

---

**Impact:** This is likely a **data quality issue affecting many Legendary heroes** whose skill descriptions lack specific percentages. A pass through all hero descriptions to add concrete multipliers would improve accuracy across the board.

# Boss DPS Test Analysis & Score Adjustments
**Date:** March 2, 2026  
**Test Source:** Google Sheets boss damage comparison

## Test Setup
- **Totem:** Keystone of Wonders Level 1
- **Target:** Single-target boss
- **Method:** Two testing approaches:
  1. **DPS Carry Test:** Fixed optimal support (Yuelao, Dionysus, Cashien, Tefnut), swap carries
  2. **Support Test:** Fixed carry (Isis Divine 1), swap individual support heroes with Athena

---

## Test Results Summary

### Carry DPS Test (Fixed Support Team)

| Carry | Evolution | Might | Avg DMG (M) | vs Isis |
|-------|-----------|-------|-------------|---------|
| **Isis** | Divine 1 | 1229K | **1101** | Baseline |
| Hladgunnr | Divine 3 | 1455K (+18%) | 513 | **-53%** |
| Phoenix | Mythic | 828K | 400 | -64% |
| Anubis | Mythic | 795K | 190 | -83% |

**Key Finding:** Isis with **lower might** (1229K) deals **2.1x damage** vs Hladgunnr (1455K).  
→ **Max-HP damage mechanics dominate traditional stat scaling**

### Support Hero Test (Fixed Carry: Isis)

| Changed Slot | Replaced Hero | With | Avg DMG (M) | Impact |
|--------------|---------------|------|-------------|--------|
| *Baseline* | - | Yuelao/Dionysus/Cashien/Tefnut | **1101** | - |
| Slot 4 | **Tefnut** | Athena | 954 | **-13%** |
| Slot 1 | **Yuelao** | Athena | 790 | **-28%** |
| Slot 2 | **Dionysus** | Athena | 718 | **-35%** |
| Slot 3 | **Cashien** | Athena | 733 | **-33%** |

**Key Findings:**
1. **Yuelao** (ENERGY_RESTORE_TEAM + CDR): -28% loss → **Critical for ultimate uptime**
2. **Dionysus** (ATK_SPD_UP): -35% loss → **Most critical force multiplier**
3. **Cashien** (ATK_UP + REMOVES_ARMOR): -33% loss → **Essential for max-HP damage amplification**
4. **Tefnut** (defensive utility): -13% loss → **Least critical for pure DPS**

---

## Key Insights for Ranking System

### 1. Max-HP Damage is Severely Undervalued
**Problem:** Current `rateMaxHpDamageQuality()` returns 3.5 points for 15%+ max-HP damage.  
**Reality:** Isis (15% max-HP) deals **2.1x damage** vs stat-based DPS (Hladgunnr).

**Action Taken:**
- Increased max-HP quality rating: 15%+ now gives **8.0 points** (up from 3.5)
- This better reflects the 2x+ performance advantage in boss scenarios

### 2. Force Multiplier Support Hierarchy Confirmed
The support test reveals a clear damage multiplier hierarchy:

| Support Type | Example | Tag | DPS Impact | New Weight |
|--------------|---------|-----|------------|------------|
| **ATK Speed** | Dionysus | ATK_SPD_UP | -35% | 32 (↑ from 25) |
| **Energy/CDR** | Yuelao | ENERGY_RESTORE_TEAM | -28% | 30 (↑ from 23) |
| **ATK Buffs** | Cashien | ATK_UP, REMOVES_ARMOR | -33% | 25-26 (↑ from 20-22) |
| **Defensive** | Tefnut | HEAL_TEAM, SHIELD_TEAM | -13% | 7-8 (↓ from 6-8) |

**Action Taken:**
- Raised force-multiplier tag weights by 20-30%
- Confirmed defensive utility gets lower weight for boss DPS scenarios

### 3. Synergy is Multiplicative, Not Just Additive
**Observation:** Losing one support (e.g., Dionysus = -35%) is worse than naively expected.  
This suggests the 3-support core (Yuelao + Dionysus + Cashien) creates **multiplicative synergies**.

**Action Taken:**
- Reduced overlap penalties for critical force-multipliers
- Increased bonus for complementary buffs (e.g., ATK SPD + ATK UP combo)

### 4. Evolution/Might Doesn't Override Mechanics
**Observation:** Hladgunnr (Divine 3, 1455K might) < Isis (Divine 1, 1229K might) by 53%.  
Traditional stat-scaling completely fails to predict real performance.

**Lesson:** Skill analyzer mechanics detection (max-HP damage, carry-targeted buffs) is **critical** for accuracy.

---

## Changes Implemented

### skillAnalyzer.js
**Updated:** `rateMaxHpDamageQuality()`
```javascript
// OLD: 15%+ = 3.5 points
// NEW: 15%+ = 8.0 points (2.3x increase)
if (maxHpPercent < 5) return 1.2;   // was 0.8
if (maxHpPercent < 10) return 2.0;  // was 1.5
if (maxHpPercent < 15) return 4.5;  // was 2.5
return 8.0;                         // was 3.5
```

### scenarios.js (Boss Scenario)
**Updated:** `specificTagWeights`
```javascript
// TIER 1: Force Multipliers
'ATK_SPD_UP': 32,           // ↑ from 25 (+28%)
'ENERGY_RESTORE_TEAM': 30,  // ↑ from 23 (+30%)
'CDR_TEAM': 28,             // ↑ from 22 (+27%)
'ATK_UP': 25,               // ↑ from 20 (+25%)
'REMOVES_ARMOR': 26,        // ↑ from 22 (+18%)
'ENEMY_VULNERABILITY': 28,  // ↑ from 25 (+12%)

// TIER 2: Survival (modest increases)
'HEAL_TEAM': 7,             // ↑ from 6
'SHIELD_TEAM': 8,           // ↑ from 7
```

### rankingScore.js (Team Context Logic)
**Updated:** `getCarryAmplificationBonus()`
```javascript
// Max-HP carries scale EXTREMELY well with support buffs
if (carryHasMaxHpDamage && tagSet.has("ATK_UP"))
  bonus += 16;  // ↑ from 10 (+60%)

if (carryHasMaxHpDamage && (ENERGY_RESTORE_TEAM || CDR_TEAM))
  bonus += 14;  // ↑ from 8 (+75%)
```

**Updated:** Overlap penalties (reduced for critical buffs)
```javascript
// ATK SPD overlap: 0.09 (was 0.14) - stacking still valuable
// Energy overlap: 0.05 (was 0.08) - always useful
// Sustain overlap: 0.06 (unchanged) - true diminishing returns
```

---

## Expected Impact

### Hero Rankings Changes
1. **Isis:** Boss score should increase significantly (~15-20%)
2. **Max-HP DPS heroes:** (Heracles, Phoenix with max-HP upgrades) should rise
3. **Energy support:** Yuelao, heroes with ENERGY_RESTORE_TEAM should rank higher in Boss (Ctx)
4. **ATK SPD support:** Dionysus, heroes with ATK_SPD_UP should be top-tier boss supports
5. **Defensive tanks:** Tefnut-style heroes should rank lower in pure boss DPS context (still valuable for survival)

### Team Context Mode
With Isis as carry:
- **Yuelao** should rank very high (energy for ultimate spam)
- **Dionysus** should rank #1-2 (ATK SPD multiplier)
- **Cashien** should rank high (ATK buffs + armor shred)
- **Tefnut** should rank lower (defensive utility less critical in context)

This aligns with the real test results showing 28-35% DPS loss when losing core supports.

---

## Validation TODO
- [ ] Check Isis boss score increased appropriately
- [ ] Verify Yuelao/Dionysus rank highly in Team Context mode with Isis carry
- [ ] Confirm Hladgunnr doesn't inappropriately outrank Isis despite higher might
- [ ] Test with other max-HP carries (Heracles, Phoenix upgrades)
- [ ] Verify defensive supports (Tefnut) still valued in non-DPS scenarios

---

## Future Testing Recommendations

### Additional Carry Testing
- **Heracles** (max-HP damage warrior)
- **Phoenix** with max-HP upgrade paths
- Pure stat-based carries (Artemis, Ares) for baseline comparison

### Support Synergy Testing
- Test **double ATK SPD** (Dionysus + another ATK_SPD_UP hero)
- Test **double energy** (Yuelao + another ENERGY_RESTORE_TEAM hero)
- Quantify diminishing returns curves

### Context-Specific Testing
- Low-armor boss vs high-armor boss (test REMOVES_ARMOR value)
- Short fight vs long fight (test sustain vs burst mechanics)
- Boss with CC resistance vs none (test control utility value)

---

## Conclusion

The boss DPS test data **validates** the force-multiplier approach to boss scoring but reveals we were **significantly undervaluing**:

1. **Max-HP damage mechanics** (2.1x performance gap)
2. **Critical force-multiplier supports** (28-35% DPS loss when removed)
3. **Multiplicative synergy** between core supports

The adjustments implement a **data-driven recalibration** that should significantly improve boss scenario accuracy, particularly for:
- Max-HP damage carries (Isis, Heracles)
- Energy/CDR supports (Yuelao, Cashien)
- ATK Speed supports (Dionysus)
- Team Context scoring fidelity

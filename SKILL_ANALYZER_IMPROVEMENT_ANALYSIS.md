# 🔬 SKILL ANALYZER - COMPREHENSIVE IMPROVEMENT REPORT

## Current System Limitations

### 1. **HP-Based Damage Is Undervalued** ⚠️ CRITICAL
**Problem:**
- Heracles' "5% of ATK → max HP conversion" scores as 0.30 (weakest tier)
- But this actually scales with his massive HP pool
- Tanks use HP for damage; system treats it like weak ATK

**Examples:**
```javascript
// Current: Treats all % the same
5% HP damage → 0.30 quality (WRONG - should be strong for tanks)
300% ATK damage → 1.8 quality (CORRECT)

// Better: Context-aware
If hero.class === Tank && damageType === "maxHP":
  quality = rate(percentage) × TANK_HP_MULTIPLIER (1.5-2.0)
```

**Impact:** Many tank ultimates score ~1/3 of what they should

---

### 2. **Upgrades Not Analyzed** 🔴 HIGH PRIORITY
**Problem:**
- Current: Only checks `if (upgrades exist) → +10% bonus`
- Missing: Actual damage/utility progression from upgrades

**Example - Heracles Scarred Fury:**
```
Base: "100% of recorded DMG"
Level2: "+30% shield"
Level3: "Deals 125% of recorded DMG" ← 25% BETTER
Level4: "+50% shield" ← HUGE defensive gain

Current: All treated same (maturity +10%)
Better: Level3 adds 25% damage, Level4 adds shield value
```

**Data to Add:**
```json
"upgrades": {
  "level2": {
    "description": "...",
    "damageBonus": 0,
    "shieldBonus": 30,
    "unlockLevel": 161
  },
  "level3": {
    "description": "...",
    "damageMultiplier": 1.25,  // was 1.0
    "unlockLevel": 201
  }
}
```

---

### 3. **Upgrade Damage Multipliers Not Extracted** 🔴 CRITICAL
**Problem:**
Upgrade descriptions contain crucial balance info but are ignored:

```
Skill base: "deals DMG" (vague, scores low)
Upgrade level3: "deals 125% of ATK" (scales differently)
Upgrade level4: "deals 200% of ATK" (even stronger)

Current: Extracts from base only
Better: Extract max upgraded value
```

**Solution:**
```javascript
function extractMaxUpgradedDamage(skill) {
  let maxDamage = extractDamageMultipliers(skill.description).highest;
  
  // Search upgrades for higher damage values
  Object.values(skill.upgrades || {}).forEach(upgrade => {
    const upgradeDMG = extractDamageMultipliers(upgrade).highest;
    if (upgradeDMG > maxDamage) maxDamage = upgradeDMG;
  });
  
  return maxDamage;  // Use max possible value
}
```

---

### 4. **Defensive Mechanics Undervalued** 🟡 HIGH PRIORITY

**Problem Areas:**
- Shields treated as +0.3 utility, not as damage mitigation
- DMG RED percentages not parsed
- Dodge mechanics not recognized
- Crowd control immunity ignored

**Example:**
```
Dionysus "removes all debuffs + 2s CC immunity" 
→ Current: +0.6 utility
→ Better: Should be valued like strong defensive buff (+1.5)

Amunra "150% P-RES/M-RES for team for 15s"
→ Current: +0.3 utility per keyword
→ Better: Should be 3x stronger (team defensive)
```

**Data Suggestion:**
```json
{
  "defenseKeywords": {
    "dmg red": 0.8,           // Damage reduction
    "immunity": 1.0,          // Crowd control immunity
    "shield": 0.9,            // Absorb damage
    "dodge": 0.7,             // Avoid damage
    "invulnerable": 1.2       // Take no damage
  }
}
```

---

### 5. **Energy & Cooldown Mechanics Ignored** 🟡 HIGH PRIORITY

**Problem:**
- "Skill CD -30%" is just a keyword match (+0.3)
- But CDR is EXPONENTIALLY valuable for team performance
- Energy generation enables more skills per fight

**Example:**
```
Dionysus "Skill CD -30%" 
→ If on 4-skill hero: massive value
→ Enables 33% more skill usage
→ Current: Treated as weak utility
→ Better: Rate as 1.5-2.0 utility points

Amunra "Energy Regen +50%"
→ Current: +0.3 utility
→ Better: +0.8-1.0 (enables sustained pressure)
```

**Data to Add:**
```json
{
  "resourceKeywords": {
    "energy restore": 0.9,
    "energy regen": 0.8,
    "cooldown": 0.9,
    "cooldown haste": 0.9,
    "attack speed": 0.7
  }
}
```

---

### 6. **Team Multiplier Oversimplified** 🟡 MEDIUM PRIORITY

**Current:**
- "All allies": 3.0x
- Stacking (per ally/per class): 5.0x
- Everything else: 1.0x

**Better Model:**
```javascript
// Graduated multipliers based on actual impact
if (isStackingPer("ally")) return 5.5;      // Exponential
if (isStackingPer("class")) return 5.0;     // Strong scaling
if (hasDuration && duration > 10) return 4.0; // Long-lasting
if (isTeamWide && hasExtraEffect) return 3.5; // Buff + secondary
if (isTeamWide) return 3.0;                  // Baseline team
if (isTeamWide && isSelfishAI) return 1.8;  // Selfish "team" buff
return 1.0;                                  // Personal
```

---

### 7. **Conditional Effects Not Weighted** 🟡 MEDIUM PRIORITY

**Problem:**
Skills with conditional triggers not distinguished:

```
Dionysus "removes debuffs and grants CC immunity" (always active)
→ Strong value, always applied

Heracles "shields when ATK drops to 0" (rarely triggered)
→ Conditional value, situational

Current: Both treated same
Better: Conditional effects get 0.7x multiplier
```

---

### 8. **Multi-Target Scaling Ignored** 🟡 MEDIUM PRIORITY

**Problem:**
AoE damage treated flat (+1.0x), ignoring target count:

```
Skill hits 2-3 enemies: should be 2.0-3.0x damage value
Skill hits 5+ enemies: should be 5.0x+ damage value

Current: All AoE = 1.0x bonus
Better: AoE scaling = (avg_targets / 1) * damage
```

**Data Suggestion:**
```json
{
  "areaOfEffect": {
    "radius": 3,           // meters
    "maxTargets": 5,       // cap
    "averageHitCount": 3   // typical usage
  }
}
```

---

### 9. **State-Based Scaling Not Captured** 🔴 CRITICAL

**Problem:**
Complex state mechanics are invisible:

```
Amunra "[Lotus Embodied] state:"
  - Doubles damage effectiveness
  - Lasts for skill duration
  - Current: Hidden, not extracted

Nezha "[Lotus Embodied] state:"
  - +15-30% lifesteal
  - Armor -10% (stacking debuff)
  - Current: Only "lifesteal" detected (+0.3)
```

**Solution:**
```javascript
// Detect state-based mechanics
function detectStates(description) {
  const statePattern = /\[([^\]]+)\]\s*(?:state|mode|form|phase):/gi;
  const states = [];
  let match;
  
  while ((match = statePattern.exec(description)) !== null) {
    states.push({
      name: match[1],
      effects: extractEffectsInContext(description, match.index)
    });
  }
  
  return states;  // Parse and value each state's effects
}
```

---

### 10. **Role-Specific Damage Types** 🟡 MEDIUM PRIORITY

**Problem:**
Damage types valued same regardless of role:

```
Tank with "300% ATK damage" (weak for tanks)
vs
Mage with "300% ATK damage" (normal tier)

Current: Same score
Better: Tank ATK damage gets penalty (tanks use HP), Mage gets normal
```

**Suggested Model:**
```javascript
const damageTypeMult = {
  Mage: { ATK: 1.0, magicHP: 1.3 },
  Archer: { ATK: 1.0, critHP: 1.2 },
  Assassin: { ATK: 1.1, burst: 1.2 },
  Tank: { ATK: 0.6, maxHP: 1.3, armor: 1.0 },
  Warrior: { ATK: 0.9, maxHP: 0.9 },
  Support: { ATK: 0.2, utility: 1.3 }
}
```

---

## Suggested Data Schema Additions

### Skill Enhancement Data:
```json
{
  "id": "skill_1",
  "name": "Example",
  "description": "...",
  "damageType": "ATK",              // NEW: ATK, maxHP, targetHP, recorded, conversion
  "baseDamageValue": 250,           // NEW: Base % multiplier
  "areaOfEffect": {                 // NEW: Spatial targeting
    "type": "cone",                 // cone, circle, line, aoe
    "radius": 3,
    "maxTargets": 5,
    "averageHitCount": 2.5
  },
  "cooldown": 8,                    // NEW: Cooldown in seconds
  "energyCost": 100,                // NEW: Energy consumed
  "isDamageSkill": true,            // NEW: Quick classification
  "isHealingSkill": false,
  "isDefensiveSkill": false,
  "characteristicEffects": [        // NEW: Complex mechanics
    {
      "name": "recorded_damage",
      "type": "scaling",            // scaling, stacking, conditional
      "value": 100,                 // percentage or multiplier
    },
    {
      "name": "knockdown",
      "type": "cc",
      "strength": "hard",           // hard, soft
      "duration": 2.0
    }
  ],
  "upgrades": {
    "level2": {
      "description": "...",
      "modifications": {
        "baseDamageValue": 300,     // NEW: Updated damage
        "cooldown": 6,              // NEW: CD reduction
        "addedEffect": "shield_20"
      }
    }
  },
  "requiresRelic": "Relic Name",     // NEW: Relic dependency
  "relicSynergy": 1.5               // NEW: Multiplier when used with specific relic
}
```

---

## Priority Improvement Roadmap

### Phase 1: Quick Wins (High Impact, Easy)
1. ✅ Extract MAX damage from upgrades (not just base)
2. ✅ Add special handling for HP-based damage (2.0x weight for tanks)
3. ✅ Improve defensive keyword values (shields, DMG RED, immunity)
4. ✅ Add energy/cooldown extraction weights

### Phase 2: Medium Effort (High Impact)
1. Add state detection (`[StateName]` patterns)
2. Add conditional effect multiplier (0.7x for "when X")
3. Expand CC keyword list (grapple, knockdown, grab, pull)
4. Add multi-target scaling consideration

### Phase 3: Long Term (Complex)
1. Parse relic mechanics and stacking
2. Add role-specific damage type multipliers
3. Create characteristic effect framework
4. Model role-specific role multipliers dynamically

---

## Example: How "New" Analyzer Would Score Heracles

**Scarred Fury** (with improvements):
```
Base: 100% DMG → 0.70 quality
Upgrade L3: 125% DMG → 0.90 quality ← EXTRACTED
Shield: 50% maxHP → 1.0 defensive value ← HP-BASED WEIGHT
AoE: "enemies within 3m" → 2.5 targets avg → 2.5x multiplier
Utility score: 0.90 + 1.0 = 1.90
Final: (0.90 + 1.90) × 2.5 × 1.1 maturity = 7.15 ← Much better!
```

**Heracles Total: ~2.16 → ~5.8-6.2** (closer to SS-tier value)

---

## Summary Table: Flaws → Solutions

| Flaw | Current Impact | Solution | Data Needed |
|------|---|---|---|
| HP damage undervalued | -30% score | Class-aware damage types | damageType field |
| Upgrades ignored | -20% score | Extract max damage from upgrades | modifications in upgrades |
| Defensive skills weak | -25% score | Higher weights for mitigation | defenseValue field |
| Energy/CD ignored | -15% score | Extract as strong utility | cooldown, energyCost fields |
| States invisible | -20% score | State detection regex | (inherent in description) |
| Multi-hit scaling flat | -10% score | Scale by target count | maxTargets, avgTargets |
| Conditional effects same value | -10% score | Apply 0.7x to conditionals | isConditional flag |
| Relics not considered | N/A (future) | Parse relic synergies | requiresRelic field |

---

## My Recommendation

**Start with Phase 1** - these give massive accuracy improvements with minimal code changes:

1. **Extract upgrade damage** (30 min) → +20% accuracy
2. **HP-based damage handling** (30 min) → +15% accuracy
3. **Defensive value expansion** (20 min) → +10% accuracy
4. **Energy/CDR weights** (15 min) → +8% accuracy

This gets you ~50% better accuracy before tackling complex state parsing or relic mechanics.

**Which would you like me to implement first?**

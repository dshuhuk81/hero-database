# Tag Synchronization Audit Report

## Executive Summary
Found **1 semantic inconsistency** and **2 files with hardcoded fallback tags** that could fall out of sync with the master tag list.

---

## 🔴 Critical Issue: Tag Name Mismatch

### Tag: `REMOVES_ARMOR` vs Game Description "Reduces Armor"

**Problem:**
- Tag name in system: `REMOVES_ARMOR`
- Game skill descriptions use: "Reduces Armor" / "Reduces Armor by X%"
- UI displays as: "REMOVES ARMOR" (underscore converted to space)

**Examples of Discrepancy:**
- [src/data/heroes/ares.json](src/data/heroes/ares.json#L75): "Reduces Armor by 15% for 6s"
- [src/data/heroes/diana.json](src/data/heroes/diana.json#L56): "Reduces the Armor of hit enemies by 20%"
- [src/data/heroes/leo.json](src/data/heroes/leo.json#L75): "Reduces Armor by 40%"
- [src/data/all_heroes_db.json](src/data/all_heroes_db.json#L347): Multiple occurrences of "reduces their Armor"

**Recommendation:** 
Consider renaming `REMOVES_ARMOR` → `REDUCES_ARMOR` to match game mechanics terminology. This would be more semantically accurate as the effect reduces armor percentage, not removes it entirely.

---

## 🟡 Synchronization Issues

### Issue #1: Hardcoded Fallback Tags in `synergyTags.js`

**File:** [src/utils/synergyTags.js](src/utils/synergyTags.js#L25-L69)

**Problem:** Contains hardcoded fallback tags (lines 25-69) that are used if `tags.json` file doesn't exist. This provides backward compatibility but creates a secondary source of truth.

**Current Status:** ✅ In sync with [src/data/tags.json](src/data/tags.json)

**Risk:** If someone updates tags.json via the tag manager, this fallback won't update. If tags.json is deleted or missing, the system uses this hardcoded list.

---

### Issue #2: Hardcoded Fallback Tags in `tag-manager-server.js`

**File:** [scripts/tag-manager-server.js](scripts/tag-manager-server.js#L31-L60)

**Problem:** Contains identical hardcoded fallback tags (lines 31-60) with same sync dependency as above.

**Current Status:** ✅ In sync with [src/data/tags.json](src/data/tags.json)

**Risk:** Same as Issue #1 - secondary source of truth that could drift.

---

## ✅ Properly Synchronized Files

| File | Status | Notes |
|------|--------|-------|
| [tag-manager-frontend/index.html](tag-manager-frontend/index.html) | ✅ Dynamic | Loads tags from API at `http://localhost:3000/api/tags` |
| [src/data/tags.json](src/data/tags.json) | ✅ Master | Source of truth for tag management |
| [scripts/tag-manager-server.js](scripts/tag-manager-server.js) | ⚠️ Fallback + API Loader | Loads from `tags.json` at startup (lines 27-29) |
| [src/utils/synergyTags.js](src/utils/synergyTags.js) | ⚠️ Fallback + Dynamic Loader | Loads from `tags.json` on demand (lines 11-25) |

---

## Tag List Verification

### Total Tags: 33

**A) Team Support (9 tags)** ✅
- ATK_SPD_UP, BUFF_TEAM, CC_IMMUNITY_TEAM, CDR_TEAM, DAMAGE_REDUCTION_TEAM, DEBUFF_CLEANSE_TEAM, ENERGY_RESTORE_TEAM, HEAL_TEAM, SHIELD_TEAM

**B) Enemy Debuff (9 tags)** ⚠️ **SEMANTIC ISSUE**
- ATK_DOWN, ATK_SPD_DOWN, BUFF_DISPEL, CROWD_CONTROL, ENEMY_VULNERABILITY, ENERGY_DRAIN, REDUCES_ATTRIBUTES, **REMOVES_ARMOR** ← Mismatch with "Reduces Armor", TAUNT

**C) Playstyle (2 tags)** ✅
- AREA_DAMAGE_DEALER, BASIC_ATTACK_SCALER

**D) Self Buffs (13 tags)** ✅
- ATK_SPEED, ATK_UP, CC_RESISTANCE, DMG_RED, DODGE_BUFF, ENERGY_RESTORE, GAIN_ARMOR, HEAL, HEAL_EFFECT_UP, HIT_AVOID, HP_UP, LIFE_STEAL_UP, SHIELD

---

## Recommendations

### 1. **HIGH PRIORITY**: Resolve Semantic Mismatch
```bash
# Option A: Rename tag in system
PUT /api/tags/REMOVES_ARMOR
{ "newTag": "REDUCES_ARMOR" }

# Option B: Update game descriptions to say "Removes Armor" (not recommended)
```

### 2. **MEDIUM PRIORITY**: Consolidate Tag Source of Truth
Replace hardcoded fallback arrays in both files with a runtime check:
```javascript
// Instead of hardcoded fallback, ensure tags.json error handling
async function loadTagsOrFail() {
  const data = await fs.readFile(TAGS_FILE, 'utf-8');
  return JSON.parse(data); // No fallback - fail explicitly if file missing
}
```

### 3. **MEDIUM PRIORITY**: Add Sync Validation
Create a script to verify fallback arrays match tags.json:
```bash
node scripts/validate-tag-sync.js
```

---

## Files Affected by Rename (if pursued)

If renaming `REMOVES_ARMOR` → `REDUCES_ARMOR`:

1. **Automatic** (via API):
   - [src/data/tags.json](src/data/tags.json)
   - All hero JSON files in [src/data/heroes/](src/data/heroes/)
   - [src/data/all_heroes_db.json](src/data/all_heroes_db.json)

2. **Manual updates needed**:
   - [src/utils/synergyTags.js](src/utils/synergyTags.js#L49) - Update fallback default
   - [scripts/tag-manager-server.js](scripts/tag-manager-server.js#L52) - Update fallback default
   - [tag-manager-frontend/index.html](tag-manager-frontend/index.html#L909) - Auto-syncs via API

---

## Conclusion

✅ **Frontend & API are well-synchronized** - they dynamically load from values from the tag manager server.

⚠️ **Hardcoded fallbacks exist in 2 utility files** - they're currently in sync but represent technical debt.

🔴 **Semantic issue found** - `REMOVES_ARMOR` tag contradicts game descriptions saying "Reduces Armor".

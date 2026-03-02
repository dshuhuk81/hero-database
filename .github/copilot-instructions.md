# Hero Database – Copilot Instructions

## Project Overview
Statistical database and web frontend for "MOTTO IMMORTAL" mobile game. Tracks 89 heroes with game stats, skills, synergy relationships, and PvE/PvP ratings. Built with **Astro** (static site generator) and **Node.js** scripts for data processing.

## Core Architecture

### Data Flow
1. **Hero Source Files** → `src/data/heroes/*.json` (individual hero definitions)
2. **Merged Database** → `src/data/all_heroes_db.json` (generated aggregation)
3. **Synergy Tags** → `src/data/tags.json` (SINGLE SOURCE OF TRUTH for all tag categories)
4. **Derived Data** → `src/data/derived/teamCompsByHeroId.json` (computed team compositions)

### Critical Systems

#### Ranking Score System (`src/utils/rankingScore.js`)
- **Multi-factor formula**: Base stats (class-weighted) + Percent stats + Synergy bonus + Skill rating
- **Class Weights**: Different damage multipliers per hero class (Tank weights HP/DEF heavily; Archer weights ATK/Crit)
- **Key Constants**: 
  - `CLASS_WEIGHTS` (hp/atk/def/pct multipliers by class)
  - `PERCENT_STATS_FOR_SCORE` (which % stats contribute to scoring)
  - `SYNERGY_WEIGHT=12`, `SKILL_WEIGHT=100` (impact relative to stats)
- **Tuning**: Edit constants directly in rankingScore.js; no config file

#### Synergy Tag System (`src/utils/synergyTags.js`, `src/data/tags.json`)
- **Tag Categories** (defined in `TAG_CATEGORIES` in synergyTags.js):
  - **TEAM_SUPPORT** (ATK_SPD_UP, HEAL_TEAM, BUFF_TEAM, etc.)
  - **ENEMY_DEBUFF** (CROWD_CONTROL, ATK_DOWN, VULNERABLE, etc.)
  - **PERSONAL_UTILITY** (DODGE_SELF, SHIELD_SELF, SUSTAIN, etc.)
  - **POSITIONING** (BACKLINE, FRONTLINE, etc.)
- **tags.json is array, not object**: All tags in single array format
- **Tag Manager CMS**: Run `npm run tag-manager` to start Express UI for assigning tags to heroes
- **Hero-to-Tag Mapping**: Each hero has `.synergies` array in their JSON file

#### Skill Analyzer (`src/utils/skillAnalyzer.js`)
- Evaluates skill quality without manual ratings (auto-detection)
- **Scoring factors**:
  - Damage tiers (weak: 50-150%, normal: 150-250%, strong: 250%+)
  - Scale keywords (stack, per ally, scales with) = exponential value
  - Team keywords (all allies, entire team) = multiply by 3-5x
  - Role-specific value (DPS prioritizes damage; Support prioritizes utility)
- **Keyword Dictionaries**: CC_KEYWORDS, UTILITY_KEYWORDS, SCALING_KEYWORDS, AOE_KEYWORDS, CARRY_KEYWORDS

## File Conventions

### Hero Data (`src/data/heroes/*.json`)
```json
{
  "id": "lowercase_name",
  "name": "Display Name",
  "image": "/heroes/lowercase_name.webp",
  "faction": "Starglint|Wildfire|Deepwater",
  "role": "Physical|Magical|Hybrid|Support|Arcane",
  "class": "Tank|Warrior|Mage|Archer|Assassin|Support",
  "rarity": "Common|Rare|Epic|Legendary",
  "description": "Hero description text",
  "ratings": { 
    "overall": "SSS|SS|S|A|B|C", 
    "pvp": "SSS|SS|...", 
    "pve": "SSS|SS|...",
    "grimSurge": "",
    "delusionsDen": "",
    "torrentRift": ""
  },
  "recommendedRelicLevel": 30,
  "evolution": "Divine V",
  "level": 300,
  "stats": { /* 26 stat fields: hp, atk, armor, magicRes, dodgeRate, critRate, cooldownHaste, atkSpdBonus, etc. */ },
  "skills": [
    {
      "id": "skill_1",
      "name": "Skill Name",
      "description": "Base skill description with % values",
      "upgrades": { "level2": "...", "level3": "...", "level4": "..." },
      "image": "/skills/hero_id_skill_1.webp"
    }
  ],
  "relic": {
    "name": "Relic Name",
    "description": "Relic effect",
    "upgrades": { "level2": "...", "level3": "...", "level4": "..." },
    "image": "/skills/hero_id_relic.webp"
  },
  "synergies": ["TAG_NAME", "TAG_NAME"],
  "teamComps": {
    "pvp": { "title": "...", "formation": [{ "heroId": "zip", "position": "front-center" }] },
    "pve": { "title": "...", "formation": [...] }
  }
}
```

**Required Fields**: id, name, class, role, faction, rarity, evolution, level, stats (all 26 fields), ratings (all 5 fields), skills (4 skills), synergies array
**Optional**: description, recommendedRelicLevel, relic, teamComps, content-creator, image
**Rating Strings**: SSS, SS, S, A, B, C (not numbers)
**Formation Positions**: back-left, back-right, front-left, front-center, front-right

### Synergy Tags (`src/data/tags.json`)
- Simple JSON array: `["ATK_SPD_UP", "HEAL_TEAM", "CROWD_CONTROL", ...]`
- Used by tag-manager-server.js as the authoritative source
- When adding tags, ensure they're defined in `TAG_CATEGORIES` object in synergyTags.js

## Common Workflows

### Add New Hero
1. Create `src/data/heroes/{hero_id}.json` with all required fields (26 stats, 4 skills, 5 rating fields)
2. Copy structure from existing hero (e.g., `zeus.json`)
3. Run `node scripts/merge-heroes-db.js` to regenerate all_heroes_db.json
4. Run `npm run build` to regenerate rankings
5. Hero appears on `/heroes` page

### Add/Update Hero Stats
1. Edit `src/data/heroes/{hero_id}.json` with Divine V game stats
2. Run build: `npm run build`
3. Stats automatically contribute to ranking score on next computation

### Update Hero Rating
1. Edit `ratings` object in `src/data/heroes/{hero_id}.json` (use SSS/SS/S/A/B/C)
2. Update both `overall` and scenario ratings (pvp, pve, grimSurge, delusionsDen, torrentRift)
3. Run `npm run build` to regenerate rankings

### Tune Ranking Scores
1. Open `src/utils/rankingScore.js`
2. Adjust `CLASS_WEIGHTS`, `PERCENT_STATS_FOR_SCORE`, or weight constants
3. Run `npm run build` or `npm run dev` to regenerate rankings

### Manage Synergy Tags (CMS)
1. Start server: `npm run tag-manager`
2. Open http://localhost:3000 in browser
3. Assign tags to heroes via UI
4. Tags persist to `src/data/tags.json` and per-hero JSON files

### Validate Data
- `node validate-bosses.js` – Check boss data consistency
- `node validate-pvp-ratings.js` – Check PvP rating format
- `node scripts/test-hero-tags.js` – Validate synergy tags exist

### Generate Derived Data
- `node scripts/generator.js` – Regenerates teamCompsByHeroId.json from all hero files
- `node scripts/merge-heroes-db.js` – Merges individual hero JSON files into all_heroes_db.json

## Key Decision Points

- **Class-Based Weighting**: Different hero classes (Tank, DPS, Support) score differently using `CLASS_WEIGHTS` multipliers (not separate tiers)
- **Manual vs Auto Tagging**: Synergies are manually assigned in JSON; skill quality is auto-detected
- **Static Generation**: Astro builds at deploy time; runtime score changes require rebuild
- **Divine V Only**: All stats represent max-level hero (no scaling by player level)

## Integration Points

- **Astro Pages** consume `all_heroes_db.json` and ratings at build time
- **Scripts** modify hero JSON files directly (no database)
- **Tag Manager** is standalone Express app; edits tags.json and hero files
- **Hero Adapter** resolves per-hero stats against class base-stats (heroAdapter.js)

## Development Tools

### Analysis Scripts
These are one-off debugging tools in root directory (not part of automated build):

- **`analyze-outliers.js`**: Deep-dive into individual hero scores
  - Shows base stats, skill power, synergy potential, and scenario-specific scores
  - Usage: `node analyze-outliers.js` (searches by name)
  - Useful for: Understanding why a hero scores unexpectedly high/low

- **`debug-ranking.js`**: Compare hero stats and component scores side-by-side
  - Shows HP, ATK, DEF, skill power, synergy, total score
  - Useful for: Quick comparative analysis and debugging class weight tuning

- **`analyze-boss-dps-heroes.js`**: Identifies DPS heroes effective in boss scenarios
  - Useful for: Validating boss rating assignments

## Debugging Tips

- **Scores Look Wrong**: 
  - Use `node analyze-outliers.js` with hero name to see component breakdown
  - Check `CLASS_WEIGHTS` and constant multipliers in rankingScore.js
  - Check if hero has proper `synergies` array assigned

- **Tags Not Appearing**: 
  - Verify tag exists in `tags.json` array (must be exact SNAKE_CASE)
  - Verify tag is defined in `TAG_CATEGORIES` object in synergyTags.js
  - Check hero's `.synergies` array contains the tag name

- **Build Fails**: 
  - Check all_heroes_db.json JSON syntax with online validator
  - Run validator scripts first: `node validate-bosses.js`
  - Ensure all hero files are valid JSON

- **Script Fails**: 
  - Ensure file paths use `src/data/` relative to workspace root
  - For analysis scripts: hero names must match exactly (case-insensitive match in code)

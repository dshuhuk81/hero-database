# Hero Database – Copilot Instructions

## Project Overview
Statistical database and web frontend for "MOTTO IMMORTAL" mobile game. Tracks all heroes with game stats, skills, synergy relationships, and PvE/PvP ratings. Built with **Astro** (SSR via `output: 'server'`) deployed on **Vercel** (Hobby plan) with **Supabase** for auth and user data, plus **Node.js** scripts for data processing.

## Tokens
For creating new content use the design foundation laid out in styles/tokens.css. There is also a overview of the system in design-system.astro.

## CSS
Dont use inline css styles. Add new css styles to the global stylesheet at src/styles/components.css and use class names to apply them. If you need a new utility class, add it to the utilities section of components.css and follow the existing naming conventions.


## Game leaked data
unter data-mine/game_extracted there are a ton of ingame infos. maybe we can use something here. an explanation what was done to achieve that is within @Extraction_Progress.md

## Plan
Do not make any changes until you have 95% confidence in what you need to build. Ask me follow up questions until you reach that confidence.

## General To-Dos
Before writing any code, describe your approach and wait for approval.

If the requirements I give you are ambigous ask clarifying questinos before writing any code.
After you finish writing any code, list the edge cases and suggest test cases to cover them.
If a task requires changes to more than 10 files, stop and break it into smaller tasks first.
When there is a bug, start by writing a test that reproduces itm then fix it until the test passes.
Every time I correct you, reflect on what you did wrong and come up with a plan to never make the same mistake again.
Dont invent stuff or create new info that is not in the project. Use only data that is included in the project files, the json or md files. If youre missing data, ask.

## Boss DMG Data
I have a Google Sheet with boss damage data that I want to integrate into the project. This data should be used to identify good boss dmg dps heroes and support heroes that are worth using for this kind of content.
URL: https://docs.google.com/spreadsheets/d/1fGSqpG8d3dH576k6Ws6LegNRKXBuawltaRe6EMqSLMw/edit?usp=sharing

### Images of Heroes
- All hero images must be in `src/assets/heroes/` directory, named `{hero_id}.webp`
- All skill images must be in `src/assets/skills/` directory, named `{hero_id}_skill_{skill_number}.webp`
- All relic images must be in `src/assets/skills/` directory, named `{hero_id}_relic.webp`
- Image format must be WebP, 512x512 pixels, with transparent background
- Hero Images are really large. Therefore dont just use an <img> tag with src. Try to use CSS background-image on a div with fixed dimensions and `background-size: cover` to optimize loading and display.

### Emojis and Non-ASCII Characters
- Do not use emojis or any non-ASCII characters in code, comments, or documentation.

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
  - `SYNERGY_WEIGHT=11`, `SKILL_WEIGHT=92` (impact relative to stats)
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

#### Virtue System (`src/data/virtues.json`)
- **What**: Tetris-shaped upgrade pieces earned via AFK farming (Realm Rover Lost Coins), diamond cube summons, or events. Equippable per hero in a limited grid that scales with Ascension (Divine I = small, Divine V = max slots).
- **Types**:
  - `"singular"`: stat boost only, no set bonus. No duplicate of same singular per hero.
  - `"set"`: belongs to a named set; unlocks 2-piece and/or 4-piece bonuses. No duplicate of same piece per hero.
- **Rarities**: `"blue"` / `"purple"` / `"gold"` / `"red"` (Legendary). Sets exist in purple (2-piece only) and gold/red (2+4-piece). No 3-piece sets.
- **Crafting**: 5 Shards = 1 whole Virtue. Enhance upgrades stats (using shards or other Virtues as material). Ascend raises level cap. Full refund on destroy.
- **Data file**: `src/data/virtues.json` - single source of truth, array of all Virtue objects.
- **Structure per Virtue**:
  - `id`: snake_case unique identifier (e.g. `"oblivion_1"`)
  - `name`: display name (e.g. `"Oblivion I"`)
  - `set`: set name shared by all members (e.g. `"Oblivion"`) - omit for singulars
  - `rarity`: `"blue"` | `"purple"` | `"gold"` | `"red"`
  - `type`: `"set"` | `"singular"`
  - `bp`: Battle Power contribution (integer)
  - `stats`: array of `{ key, base, bonus }` - key matches hero stat keys; `bonus` is upgrade value (0 if not upgraded)
  - `setBonuses`: `{ "2": "...", "4": "..." }` - effect text (set type only)
- **Hero assignment**: Each hero JSON has optional `"virtues": ["virtue_id", ...]` array (manually curated, all optional).
- **Shape**: Tetris shape intentionally omitted for now - will be added as matrix `[[1,1],[1,0]]` when a visual grid page is built.
- **Display**: Hero detail page shows Virtue cards under "Recommended Virtues" section (color-coded by rarity) if any are assigned.
- **Known Sets (partial)**: Sacrifice (gold, 2-piece: +10% HP at combat start), Far 2 / Far 3 (Realm Rover shop, 2-piece: +10% Energy Regen at combat start - considered meta for energy-dependent carries)

#### Skill Analyzer (`src/utils/skillAnalyzer.js`)
- Evaluates skill quality without manual ratings (auto-detection)
- **Scoring factors**:
  - Damage tiers (weak: 50-150%, normal: 150-250%, strong: 250%+)
  - Scale keywords (stack, per ally, scales with) = exponential value
  - Team keywords (all allies, entire team) = multiply by 3-5x
  - Role-specific value (DPS prioritizes damage; Support prioritizes utility)
- **Keyword Dictionaries**: CC_KEYWORDS, UTILITY_KEYWORDS, SCALING_KEYWORDS, AOE_KEYWORDS, CARRY_KEYWORDS

#### Skill Value Comparator (`src/pages/calculator.astro`)
- **Purpose**: Interactive damage calculator letting players compare hero skills head-to-head
- **Hero Selection**: Primary hero always shown; optional comparison hero for side-by-side and damage mitigation estimates
- **Damage Calculation Features**:
  - **Stat-Bound Parsing**: Regex-replaces `X% ATK`, `X% of Max HP`, `X% of Current HP` in skill descriptions with calculated absolute values
  - **Multi-Hit Detection**: Extracts hit counts from skill text (e.g. "striking 3 times") and shows per-hit + total rows
  - **ATK% Extraction**: Parses normal and conditional damage variants from skill descriptions and upgrade text
  - **Current HP Tick Simulation**: Geometric decay simulation for %CurrentHP DoT skills over configurable duration
- **Match Types & Timelines**:
  - **PvP / Quick Match (30s)**: Splits math into Phase 1 (~15s setup of normal attacks + auto-skills) and Phase 2 (Ultimate execution).
  - **Boss / Sustained (90s)**: Leverages real-world imported tracking data. Phase 1 scales `baseAttackRate` over 90s (which intrinsically includes auto-skills, preventing double-dipping). Phase 2 multiplies the Ultimate payload by `bossUltimatesPer90s`.
- **Mitigation Models**:
  - **Model A** (default): `DR = Armor / (Armor + K)` with K presets (Balanced=52000, Low=100000, High=28600, Custom)
  - **Model B**: `Mitigated = Raw * (ATK / (ATK + Armor * C))` with configurable C factor
  - **Extra Physical Reduction**: 0-60% slider for item/buff DR stacking
- **HP% Impact System**: Each damage row shows a colored progress bar indicating % of target HP consumed
  - Impact tiers: LETHAL (>=50%), DEVASTATING (>=30%), HEAVY (>=15%), SOLID (>=5%), LIGHT (<5%)
  - Only shown when comparison hero is selected (needs target HP)
- **Full Rotation Burst Summary** (below skill cards):
  - Per-skill breakdown: best-variant damage per skill with HP% shown
  - Normal burst total (Raw + Estimated across all skills)
  - All-Crit burst total (factoring hero's critDmgBonus into crit multiplier)
  - HP% impact bars for both normal and crit scenarios
  - Rotations to Kill: how many full rotations needed, with crit-weighted average
- **Effective HP Card**: Shows hero's EHP vs Physical and vs Magical, with damage reduction %
- **Hero Stats Grid**: Displays ATK, HP, Armor, M-Res, Crit Rate, Crit DMG alongside class/role/faction identity cards
- **Encoding Rule**: All text in calculator.astro must use ASCII-only characters (no Unicode emojis, no em dashes, no multiplication signs). Use SVG icons, `--`, and `x` instead.
- **Key Functions**:
  - `replaceStatBoundPercents()` – Inline damage value annotation
  - `extractAtkPercents()` – Parses normal/conditional ATK% from skill + upgrades
  - `extractHitCount()` – Multi-hit detection from description text
  - `renderSkillNumbers()` – Per-skill damage rows with HP% impact bars
  - `renderBurstSummary()` – Full rotation burst + EHP card
  - `applyMitigation()` – Armor-based damage reduction (Model A or B)
  - `computeEHP()` – Effective HP calculation for physical and magical
  - `getCritMultiplier()` – Base 1.5x + hero's critDmgBonus

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
  "baseAttackRate": 1.401,
  "bossUltimatesPer90s": 5,
  "stats": { /* 26 stat fields: hp, atk, armor, magicRes, dodgeRate, critRate, cooldownHaste, atkSpdBonus, etc. */ },
  "skills": [
    {
      "id": "skill_1",
      "name": "Skill Name",
      "description": "Base skill description with % values",
      "upgrades": { "level2": "...", "level3": "...", "level4": "..." },
      "image": "/skills/hero_id_skill_1.webp",
      "damageType": "physical|magical|true (optional, overrides hero-level damageType for this skill)"
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

**Required Fields**: id, name, class, role, faction, rarity, evolution, level, stats (all 26 fields), ratings (all 5 fields), skills (4 skills with damageType each), synergies array
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

### Import Boss Damage Tracking Data
1. Export Google Sheet to CSV (Publish to web)
2. Run `node scripts/import-attack-rates.cjs`
3. Automatically maps `baseAttackRate` and `bossUltimatesPer90s` directly into hero JSON files
4. Powers the Phase 1 & Phase 2 scaling in the Calculator's Boss mode

### Validate Data
- `node validate-bosses.js` – Check boss data consistency
- `node validate-pvp-ratings.js` – Check PvP rating format
- `node scripts/test-hero-tags.js` – Validate synergy tags exist

### Generate Derived Data
- `node scripts/generator.js` – Regenerates teamCompsByHeroId.json from all hero files
- `node scripts/merge-heroes-db.js` – Merges individual hero JSON files into all_heroes_db.json

### Add Skill Preview Video
See memory file for full details: `memory/project_skill_videos.md`
1. Record gameplay clip, note skill start time and crop coordinates
2. Convert with ffmpeg (static binary at `/tmp/ffmpeg-bin/ffmpeg`):
   `ffmpeg -y -i source.mp4 -ss [START] -t [DURATION] -vf "crop=W:H:X:Y,scale=480:-1" -c:v libvpx-vp9 -b:v 0 -crf 35 -an public/skills/{hero_id}_skill_{n}.webm`
3. Set `"video": "{hero_id}_skill_{n}.webm"` in hero JSON skill entry
4. Upload `.webm` to R2 bucket under `skills/` for production
5. Test coordinates: die koordinaten sollten sein: A (110/700 )(oben links), B (610/1110) (unten rechts). oder brauchst du. noch mehr ?
Das rechteck hat 500x410 abmaße innerhalb des 720x1600 videos.

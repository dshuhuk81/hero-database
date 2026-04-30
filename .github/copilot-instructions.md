# Hero Database – Copilot Instructions

## Game leaked data
unter data-mine/game_extracted there are a ton of ingame infos. maybe we can use something here. an explanation what was done to achieve that is within @Extraction_Progress.md

## New Heroes
When a hero is added, we need to run this script to merge all individual hero JSON files into a single `all_heroes_db.json` that the frontend consumes. This also regenerates the ranking scores based on the new hero's stats and synergies.

```bash
node scripts/merge-heroes-db.js

## Project Overview
Statistical database and web frontend for "MOTTO IMMORTAL" mobile game. Tracks all heroes with game stats, skills, synergy relationships, and PvE/PvP ratings. Built with **Astro** (SSR via `output: 'server'`) deployed on **Vercel** (Hobby plan) with **Supabase** for auth and user data, plus **Node.js** scripts for data processing.

## General To-Dos
Before writing any code, describe your approach and wait for approval.

If the requirements I give you are ambigous ask clarifying questinos before writing any code.

After you finish writing any code, list the edge cases and suggest test cases to cover them.

If a task requires changes to more than 3 files, stop and break it into smaller tasks first.

When there is a bug, start by writing a test that reproduces itm then fix it until the test passes.

Every time I correct you, reflect on what you did wrong and come up with a plan to never make the same mistake again.

Dont invent stuff or create new info that is not in the project. Use only data that is included in the project files, the json or md files. If youre missing data, ask.

## Boss DMG Data
I have a Google Sheet with boss damage data that I want to integrate into the project. This data should be used to identify good boss dmg dps heroes and support heroes that are worth using for this kind of content.
URL: https://docs.google.com/spreadsheets/d/1fGSqpG8d3dH576k6Ws6LegNRKXBuawltaRe6EMqSLMw/edit?usp=sharing

## Infos about new unreleased heroes
You can have skill descriptions in german and englisch in this file: `newHeroes.md. Use this file to get the skill descriptions for the new unreleased heroes. For stats and ratings of these heroes, ask me directly.

## Ratings explanation
There is a rating explanation for all grades either for overall tier ratings or specific content ratings. Its stored in `how-ratings-work.md` file. You can use this information to understand the meaning of each rating and the criteria for assigning them. This is important for maintaining consistency and accuracy when updating hero ratings or adding new heroes to the database.

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

#### User Heroes & Sharing System (`src/pages/myheroes.astro`, `src/pages/shared-heroes/[id].astro`)
- **Authentication**: Logged-in users can select and organize heroes in "My Heroes" page
- **User Heroes Table** (`user_heroes` in Supabase):
  - `user_id` (references auth.users)
  - `hero_id` (hero identifier)
  - `evolution` (1-15 integer tracking power level)
  - `is_favorited` (boolean, currently unused)
- **Shared Setups** (`shared_hero_configs` in Supabase):
  - `share_id` (8-character unique ID for public sharing)
  - `user_id` (setup creator)
  - `heroes_data` (JSON array with hero_id + evolution for each selected hero)
  - `created_at` (timestamp)
- **Fight Outcomes** (`fight_outcomes` in Supabase):
  - `user_id`, `team_player`, `team_enemy`, `bp_player`, `bp_enemy`
  - `winner` ("player" or "enemy"), `predicted_win_rate`, `mode`, `notes`
- **Evolution Levels** (1-15 mapping):
  - 1: Elite, 2: Elite+, 3: Epic, 4: Epic+, 5: Legendary
  - 6: Legendary+, 7: Exalted, 8: Exalted+, 9: Mythic
  - 10: Divine, 11-15: Divine I through Divine V
- **Frontend Features**:
  - Hero card grid with background images (portraits)
  - Per-hero evolution stepper (◀ Level ▶)
  - Faction grouping with icons
  - Share button generates public link automatically
  - Non-selected heroes displayed at 50% opacity
- **API Endpoints** (Astro SSR routes in `src/pages/api/`):
  - `POST /api/auth/login` – Login with email/password, sets HTTP-only cookie
  - `POST /api/auth/register` – Create account with email/password
  - `POST /api/auth/logout` – Clear auth cookie
  - `GET /api/health/auth` – Health check for Supabase connectivity
  - `POST /api/user/heroes/share` (auth required) – Create shareable setup link
  - `GET /api/shared-heroes/:shareId` (public) – Retrieve shared setup data
  - `POST /api/user/heroes` (auth required) – Add hero to user collection
  - `PATCH /api/user/heroes/:heroId` (auth required) – Update hero evolution or favorite status
  - `DELETE /api/user/heroes/:heroId` (auth required) – Remove hero from collection
  - `GET /api/user/heroes` (auth required) – Fetch all user's selected heroes
  - `GET /api/user/battles` (auth required) – Fetch fight history with pagination
  - `POST /api/user/battles` (auth required) – Submit fight outcome

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

### Use My Heroes Feature
1. **Setup**: User must be logged in via `/login` or `/register`
2. **Select Heroes**: Navigate to `/myheroes` → click hero cards to select/deselect
3. **Manage Evolution**: Use ◀ ▶ buttons next to each selected hero to adjust level (1-15)
4. **Share Setup**: Click "Share Setup" button → link auto-copied to clipboard
5. **View Shared**: Anyone can access `/shared-heroes/{shareId}` to see the public setup

### Test Sharing Locally
1. Create account via `/register`
2. Add heroes on `/myheroes`
3. Click "Share Setup" → get link like `http://localhost:4322/shared-heroes/abc12def`
4. Open link in incognito/different browser → should show public view
5. Verify RLS policies in Supabase allow public read access to `shared_hero_configs`

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
- **Hybrid Rendering**: Most pages are prerendered (`export const prerender = true`); API routes and dynamic pages use SSR via a single Vercel serverless function
- **Divine V Only**: All stats represent max-level hero (no scaling by player level)

## Integration Points

- **Astro Pages** consume `all_heroes_db.json` and ratings at build time
- **Astro API Routes** (`src/pages/api/`) handle auth, user data, and battles via Supabase (SSR, not prerendered)
- **Auth Helper** (`src/lib/auth.ts`) provides `requireUser(request)` and `jsonResponse()` for all protected API routes
- **Supabase Client** (`src/lib/supabase.js`) exports `supabaseClient` (anon) and `supabaseAdmin` (service role)
- **Scripts** modify hero JSON files directly (no database)
- **Tag Manager** is standalone Express app; edits tags.json and hero files
- **Hero Adapter** resolves per-hero stats against class base-stats (heroAdapter.js)
- **Skill Value Comparator** (`calculator.astro`) – Client-side skill damage calculator; parses skill descriptions at runtime, no server dependency
- **My Heroes Page** (`myheroes.astro`) – Authenticated feature; interacts with API routes for user-specific data
- **Shared Heroes Page** (`shared-heroes/[id].astro`) – Public-facing; fetches from API endpoint, no auth required
- **Battle Sim Page** (`battle-sim.astro`) – PvP battle simulator with fight outcome submission to `/api/user/battles`

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
  - Check that all hero JSON `relic.upgrades` keys are correctly spelled (not `uogrades`, etc.)

- **Deployment**:
  - Deploy command: `npm run build && npx vercel deploy --prebuilt --prod --yes`
  - Vercel Hobby plan limits to 12 serverless functions; all API routes use Astro SSR (single function)
  - New pages must include `export const prerender = true` unless they need SSR
  - API routes in `src/pages/api/` must NOT have `prerender = true`
  - Do NOT use global ISR config in astro.config.mjs (breaks POST requests and auth)

- **Script Fails**: 
  - Ensure file paths use `src/data/` relative to workspace root
  - For analysis scripts: hero names must match exactly (case-insensitive match in code)

- **Calculator Issues**:
  - **Garbled characters (e.g. `Â·`, `â€"`)**: Non-ASCII characters in calculator.astro. All text must be ASCII-only. Use `LC_ALL=C grep -n '[^ -~]' src/pages/calculator.astro` to find offenders.
  - **Damage shows 0 or NaN**: Skill description doesn't match regex patterns in `extractAtkPercents()`. Check for unusual phrasing.
  - **HP% bars not showing**: Comparison hero not selected, or target HP is 0.
  - **Multi-hit not detected**: Skill description doesn't match `extractHitCount()` patterns. Add new regex pattern if needed.
  - **Burst summary empty**: No skills have parseable ATK% values.

- **My Heroes Feature Issues**:
  - **Share button not showing**: User must be logged in (check `authToken` in localStorage)
  - **"Error: Failed to create share link" on click**: Check Vercel function logs (`vercel logs`)
  - **Shared link returns 404**: Verify `shared_hero_configs` table exists in Supabase with correct schema
  - **Shared heroes not showing**: Confirm RLS policies are set correctly (SELECT policy should allow `true`)
  - **Evolution not updating**: Ensure `PATCH /api/user/heroes/:heroId` includes `evolution` field (1-15 range)
  - **Heroes missing from user's collection**: Check if `user_id` in `user_heroes` table matches `auth.uid()` from token

- **API Route Issues**:
  - **401 with non-JSON response**: Supabase `getUser()` may throw `AuthApiError` instead of returning error object; `src/lib/auth.ts` has try/catch for this
  - **FUNCTION_INVOCATION_FAILED**: Check Vercel function logs; usually an unhandled exception in the route handler
  - **API returns 404**: Ensure the route file exists in `src/pages/api/` and does NOT have `export const prerender = true`
  - **API returns HTML instead of JSON**: Route may be falling through to Astro's page renderer; ensure correct HTTP method exports (GET, POST, etc.)

# Hero Database - Copilot Instructions

## Project Overview
Statistical database and web frontend for the "MOTTO IMMORTAL" mobile game. Tracks all heroes with game stats, skills, synergy relationships, and PvE/PvP ratings. Built with **Astro** (static build, `output: 'static'`) deployed on **Vercel** (Hobby plan), plus **Node.js** scripts for data processing.

A separate Express server (`api-server.js`, started via `npm run dev:api`) uses **Supabase** for auth and user-roster storage. It is dev tooling only: the public site never calls it. Its only consumer is the local-only `/status` admin CMS page. The public `/my-roster` page is pure localStorage and shares rosters via URL, no backend.

## Tokens
For creating new content use the design foundation laid out in src/styles/tokens.css. There is also an overview of the system in src/pages/design-system.astro.

## CSS
Dont use inline css styles. Add new css styles to the global stylesheet at src/styles/components.css and use class names to apply them. If you need a new utility class, add it to the utilities section of components.css and follow the existing naming conventions.

Known debt: older pages (tips.astro especially) still carry inline styles and per-page `<style>` blocks. When touching such a page, migrate the styles you touch into components.css instead of adding more.

## Game leaked data
unter data-mine/ there are a ton of ingame infos (md files, xlsx, screenshots, json dumps). maybe we can use something here. an explanation what was done to achieve that is within data-mine/EXTRACTION_PROGRESS.md

## Plan
Do not make any changes until you have 95% confidence in what you need to build. Ask me follow up questions until you reach that confidence.

## General To-Dos
Before writing any code, describe your approach and wait for approval.

If the requirements I give you are ambigous ask clarifying questinos before writing any code.
After you finish writing any code, list the edge cases and suggest test cases to cover them.
If a task requires changes to more than 10 files, stop and break it into smaller tasks first.
When there is a bug, start by writing a test that reproduces it, then fix it until the test passes.
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
- Production assets are served from Cloudflare R2 (`https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev`). Upload via `npm run upload-assets`.

### Emojis and Non-ASCII Characters
- Do not use emojis or any non-ASCII characters in code, comments, or documentation.

## Core Architecture

### Data Flow
1. **Hero Source Files** -> `src/data/heroes/*.json` (individual hero definitions, NO ratings inside)
2. **Merged Database** -> `src/data/all_heroes_db.json` (generated aggregation, regenerate with `npm run db:merge`)
3. **Ratings Layer** -> `src/data/ratings/hero-ratings.json` (SINGLE SOURCE OF TRUTH for tier ratings, merged at runtime by `src/data/heroes/withRatings.js`)
4. **Synergy Tags** -> `src/data/tags.json` (flat array of all tag names) + `src/data/tagCategories.json` (category grouping, loaded by `src/utils/synergyTags.js`)

A pre-commit hook (`.githooks/pre-commit`, activated via `npm run prepare`) blocks commits where hero source JSON changed but `all_heroes_db.json` was not regenerated/staged.

> NOTE: The old computed Ranking Score System and the Skill Value Comparator (`calculator.astro`, `skillAnalyzer.js`) were REMOVED. Heroes are ranked purely by the manual rating strings in `hero-ratings.json`.

### Ratings System
- Ratings live in `src/data/ratings/hero-ratings.json`, keyed by hero id, NOT in the hero JSON files.
- Shape per hero: `{ "name", "overall", "pvp", "pve", "pveEarly", "pveLate" }`
- Scale in actual use: `S+ | S | A+ | A | B | C | D` (range values like `A~S` also occur).
- `src/data/heroes/withRatings.js` exposes `heroes` / `getHeroById` with the ratings merged in - pages that need ratings import from there, not from `index.js`.
- Investment guidance per hero lives in `src/data/ratings/invest.json` (rendered as "Investment" section on hero detail).
- Edit ratings via the `/status` admin CMS (dev only, needs `npm run dev:api`) or directly in the JSON.

### Release Flag
- Heroes carry `"release": true | false`. Unreleased heroes are hidden in production, visible in dev.
- Use the existing pattern `import.meta.env.DEV || hero.release !== false` when filtering.

### Navigation (`src/data/nav.ts`)
- SINGLE SOURCE OF TRUTH for site navigation. The index.astro teaser grid and Sidebar.astro rail/mobile bar are both derived from this one array. Never edit nav in two places.
- Entries have `group` (primary/content/meta), optional `teaser`, `badge`, `status` (maintenance), `localOnly` (dev-only routes, e.g. /status).

### Local-only routes
- `astro.config.mjs` contains a `localOnlyRoutes()` build hook that deletes `LOCAL_ONLY_ROUTES` (currently `/status`) from the production build output and the sitemap. Dev-only tooling pages must be registered there AND flagged `localOnly: true` in nav.ts.

### Pages
- `/heroes` - hero list with card grid + sortable table view incl. tier badges (this IS the tier list view)
- `/heroes/[id]` - hero detail (profile, skills, CN diff, ratings, stats, synergies, investment, virtues)
- `/hero-stats` - stat comparison table
- `/cn-preview` - CN vs Global divergence hub
- `/virtues`, `/totems`, `/bosses`, `/events`, `/delusions-den`, `/tips`, `/summon-calendar` - content/guide pages
- `/my-roster` - localStorage roster tool with share links
- `/status` - dev-only admin dashboard + CMS (talks to api-server.js)
- `/changelog`, `/about`, `/privacy`, `/design-system`

### Critical Systems

#### Synergy Tag System (`src/utils/synergyTags.js`, `src/data/tags.json`, `src/data/tagCategories.json`)
- **tags.json**: flat JSON array of all tag names (`TEAM_*`, `ENEMY_*`, `SELF_*`, `PLAYSTYLE_*`, ...)
- **tagCategories.json**: array of `{ id, label, tags }` category objects; `synergyTags.js` loads it at startup
- **Tag Manager CMS**: `npm run tag-manager` starts an Express UI on http://localhost:3000 for assigning tags to heroes
- **Hero-to-Tag Mapping**: each hero JSON has a `synergies` array
- Derived fields written into hero JSON by tooling: `synergyPartners` (per-hero partner list with shared tags), `synergyLinks`

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
- **Hero assignment**: hero JSON field is `"virtueSets"` - an array of `{ label, comment, virtues: [virtue_id, ...] }` recommendation groups (NOT a flat `virtues` array).
- **Shape**: Tetris shape intentionally omitted for now - will be added as matrix `[[1,1],[1,0]]` when a visual grid page is built.
- **Display**: Hero detail page shows Virtue cards under "Recommended Virtues" section (color-coded by rarity) if any are assigned.
- **Known Sets (partial)**: Sacrifice (gold, 2-piece: +10% HP at combat start), Far 2 / Far 3 (Realm Rover shop, 2-piece: +10% Energy Regen at combat start - considered meta for energy-dependent carries)

#### CN vs Global Comparison System (`src/utils/cnDiff.js`, `src/pages/cn-preview.astro`)
- **Purpose**: Show where the Global build diverges from the original Chinese (CN) version. CN is the canonical base and never "changes"; Global is a copy that lags or diverges. The feature forecasts pending Global balance fixes and surfaces undertuned/overtuned heroes.
- **Data source**: Optional `cn` block manually curated into each `src/data/heroes/{hero_id}.json`. Ingestion input is per-hero CN skill text dropped at `data-mine/cn/{hero_id}.json` (hero stats + CN/EN skill text + leveled upgrades). Screenshots were tried and rejected (vision misreads digits - produced a false positive); extracted text is the proven pipeline. Numbers are language-agnostic so Chinese text is never displayed.
- **Mapping rule**: CN files use their own skill ordering and EN names that differ from Global. Map CN skill -> Global skill by CONTENT (description + values + upgrade structure), never by id or en-name. Display name always comes from the Global hero JSON (English); CN `cnName` is stored for reference only and never rendered.
- **`cn` block shape** (additive, Global data untouched):
  ```json
  "cn": {
    "captured": "YYYY-MM-DD",
    "source": "CN client extracted skill text",
    "skills": [
      { "id": "<global skill id: skill_1..4 or relic>",
        "cnName": "<chinese, reference only>",
        "values": [
          { "label": "...", "field": "atkPct|pct|seconds|count|meters|damageType",
            "global": <value>, "cn": <value>, "unit": "%|s|x|m|",
            "change": "buff|nerf|diff|neutral", "verified": false }
        ],
        "notes": ["..."] }
    ]
  }
  ```
- **`change` semantics (authoritative)**: describes GLOBAL relative to the CN base, by player benefit. `buff` = Global BETTER than CN. `nerf` = Global WORSE than CN. `diff` = non-numeric / direction-ambiguous (e.g. damageType). `neutral` = equal. Direction is stat-aware (more good-effect = better; higher cooldown / longer self-debuff = worse). The ingestion step decides per row.
- **Text-only differences excluded**: Wording/description diffs (e.g. "evasion" vs "Dodge Rate") do NOT create value rows. Exception: damageType changes always included (e.g. "Physical" vs "Passive"). Structural/label differences go in the `notes` array instead.
- **`verified: false`**: marks an uncertain row (e.g. a type difference that may be a Global JSON error rather than a real divergence). Renders an "Unconfirmed" tag. Resolve by either fixing the Global value (row auto-drops to neutral) or setting `verified: true`. Never mutate Global combat data from inference alone.
- **No-diff rendering**: Heroes with zero divergences (all `neutral` rows, no `buff`/`nerf`/`diff`) do NOT render a CN section on detail page. Hub shows "Matches Global" badge instead of a diff table.
- **Engine**: `src/utils/cnDiff.js` - pure functions only, never invents data. `getCnSummary(hero)`, `getCnHeroes(heroes)`, `getCnOverview(...)`, `formatCnValue(...)`. Header comment in that file is the source of truth for semantics.
- **UI**: `/cn-preview` hub (every tracked hero, sorted by change count, ASCII-only, styled via `components.css` `.cn-*` classes) + a "CN vs Global" section on the hero detail page (`#section-cn`, dot-nav entry, changed rows only) - both render only when a `cn` block exists and has at least one change.
- **damageType caveat**: per-skill damage element is NOT reliably in APK configs (effect-chain indirection + missing skill name->ID mapping). Only resolvable empirically (true ignores Armor + M-Res). Treat type diffs as advisory (`verified:false`) until in-game tested. damageType is an exception to the text-only rule and always shown.

## File Conventions

### Hero Data (`src/data/heroes/*.json`)
```json
{
  "id": "lowercase_name",
  "name": "Display Name",
  "image": "/heroes/lowercase_name.webp",
  "release": true,
  "faction": "Hearts|Clubs|Diamonds|Spades|Starglint",
  "role": "Nimble|Arcane|Hefty",
  "class": "Tank|Warrior|Mage|Archer|Assassin|Support",
  "rarity": "Common|Epic|Legendary",
  "description": "Hero description text",
  "recommendedRelicLevel": 30,
  "evolution": "Divine V",
  "level": 300,
  "baseAttackRate": 1.401,
  "bossUltimatesPer90s": 5,
  "stats": { /* ~28 stat fields: hp, atk, armor, magicRes, dodgeRate, critRate, cooldownHaste, atkSpdBonus, etc. */ },
  "skills": [
    {
      "id": "skill_1",
      "name": "Skill Name",
      "description": "Base skill description with % values",
      "upgrades": { "level2": "...", "level3": "...", "level4": "..." },
      "image": "/skills/hero_id_skill_1.webp",
      "video": "hero_id_skill_1.webm (optional)",
      "damageType": "physical|magical|true"
    }
  ],
  "relic": {
    "name": "Relic Name",
    "description": "Relic effect",
    "upgrades": { "level2": "...", "level3": "...", "level4": "..." },
    "image": "/skills/hero_id_relic.webp"
  },
  "synergies": ["TAG_NAME", "TAG_NAME"],
  "synergyPartners": [{ "heroId": "nezha", "via": ["TAG_NAME"] }],
  "coreMechanic": { "summary": "..." },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "virtueSets": [{ "label": "Desire", "comment": "", "virtues": ["desire_1"] }],
  "cn": { /* optional CN comparison block, see above */ }
}
```

**Required Fields**: id, name, release, class, role, faction, rarity, evolution, level, stats, skills (4 skills with damageType each), synergies array
**Optional**: description, recommendedRelicLevel, relic, image, baseAttackRate, bossUltimatesPer90s, coreMechanic, strengths, weaknesses, synergyPartners, synergyLinks, virtueSets, cn
**Ratings DO NOT live here** - they live in `src/data/ratings/hero-ratings.json` (see Ratings System).

## Common Workflows

### Add New Hero
1. Create `src/data/heroes/{hero_id}.json` with all required fields (copy structure from existing hero, e.g. `zeus.json`)
2. Add a ratings entry in `src/data/ratings/hero-ratings.json`
3. Run `npm run db:merge` to regenerate all_heroes_db.json
4. Run `npm run build`
5. Hero appears on `/heroes` page

### Add/Update Hero Stats
1. Edit `src/data/heroes/{hero_id}.json` with Divine V game stats
2. Run `npm run db:merge` then `npm run build`

### Update Hero Rating
1. Edit the hero's entry in `src/data/ratings/hero-ratings.json` (scale: S+/S/A+/A/B/C/D)
2. Or use the `/status` CMS in dev (`npm run dev:all`)
3. No db:merge needed - ratings merge at runtime via withRatings.js

### Manage Synergy Tags (CMS)
1. Start server: `npm run tag-manager`
2. Open http://localhost:3000 in browser
3. Assign tags to heroes via UI
4. Tags persist to `src/data/tags.json` and per-hero JSON files

### Import Boss Damage Tracking Data
1. Export Google Sheet to CSV (Publish to web)
2. Run `npm run import-attack-rates`
3. Maps `baseAttackRate` and `bossUltimatesPer90s` directly into hero JSON files

### Ingest CN vs Global Data
1. Drop per-hero CN skill text at `data-mine/cn/{hero_id}.json` (hero stats + CN/EN skill text + leveled upgrades)
2. Map each CN skill to the Global skill by CONTENT (not id/en-name); confirm stats match Global as a sanity check
3. Diff numeric values; write a `cn` block into `src/data/heroes/{hero_id}.json` (see CN vs Global Comparison System for shape + `change` semantics)
4. **Exclude text-only differences** - wording/label diffs do not create value rows; put them in the `notes` array instead. Exception: damageType changes always included as rows.
5. Flag uncertain/non-numeric diffs with `verified: false`
6. Log the hero + skill mapping + result in `data-mine/cn/_manifest.json`
7. Run `npm run db:merge` then `npm run build`; verify `/cn-preview` and the hero detail `#section-cn`. Heroes with zero changes render "Matches Global" badge; no CN table shown.

### Validate Data
- `npm run validate:all` - bosses + hero tags + tag/virtue/comp rule tests
- `npm run validate:tags` - validate synergy tags exist
- (`validate:hero-detail-stats` is broken - depends on deleted `leak/game_extracted/` dir)

### Generate Merged DB
- `npm run db:merge` - merges individual hero JSON files into all_heroes_db.json
- Convenience chains: `npm run after:hero-edit`, `npm run after:tags`, `npm run after:boss-import`

### Upload Assets to R2
- `npm run upload-assets`, force re-upload: `npm run upload-assets:force`
- Hero image variants: `npm run prepare-hero-variants` then `npm run upload-hero-variants`

### Add Skill Preview Video
See memory file for full details: `memory/project_skill_videos.md`
1. Record gameplay clip, note skill start time and crop coordinates
2. Convert with ffmpeg (static binary at `/tmp/ffmpeg-bin/ffmpeg`):
   `ffmpeg -y -i source.mp4 -ss [START] -t [DURATION] -vf "crop=W:H:X:Y,scale=480:-1" -c:v libvpx-vp9 -b:v 0 -crf 35 -an public/skills/{hero_id}_skill_{n}.webm`
3. Set `"video": "{hero_id}_skill_{n}.webm"` in hero JSON skill entry
4. Upload `.webm` to R2 bucket under `skills/` for production
5. Crop coordinates within the 720x1600 source video: A (110/700) top-left, B (610/1110) bottom-right; the rectangle is 500x410.

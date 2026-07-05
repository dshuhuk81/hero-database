# Project Memory: Hero Database

Last reviewed: 2026-05-07

This file is a working memory for future agents. It summarizes the current project from the repository as it exists now, and calls out stale notes where older docs disagree with source code.

## What This Project Is

This is a fan database and guide site for the mobile gacha game **Motto Immortal**. The site focuses on heroes, stats, skills, relics, synergy tags, tier ratings, team compositions, bosses, Delusions Den, virtues, totems, upgrade advice, events, and guide content.

The project is content-heavy. Game knowledge matters as much as code knowledge. When changing behavior, avoid inventing game facts. Prefer existing JSON, markdown guides, extracted game files, or clearly marked community data.

## Current Tech Stack

- Astro 5 site.
- `astro.config.mjs` currently sets `output: "static"`.
- Cloudflare hosting with Astro output directory `dist`.
- Node 20 per `package.json`.
- Runtime dependencies are small: Astro and Express.
- Express is used for local utility servers such as the tag manager and API server.
- No current Supabase dependency is present in `package.json`, even though older docs mention Supabase.
- No frontend framework dependency like React or Vue is currently used.
- Styling is mostly plain Astro, CSS, and global CSS token files.
- Assets are mostly served from Cloudflare R2 URLs plus some files under `public/`.

## Important Existing Docs

- `WORKFLOWS.md`: operational workflow notes. Useful, but partly stale in script details.
- `design-system/INVENTORY.md`: design audit and current design direction.
- `design-system/COMPONENTS_PLAN.md`: design system planning.
- `guides/GUIDE_TEMPLATE.md`: guide structure.
- `guides/Prompt.md`: German/Chinese research prompt for deep hero analysis.
- `leak/EXTRACTION_PROGRESS.md`, `leak/EXTRACTION_SUMMARY.md`, `leak/COMPLETE_EXTRACTION_GUIDE.md`: data extraction history and source context.

Tracked but currently deleted in this working tree:

- `GEMINI.md`: broad project instructions and older architecture notes. It was readable earlier in this review, but is now deleted in git status. If restored, treat it as helpful but partly stale.
- `delusiondenassets/generalhints.md`: tracked file, currently deleted in git status.

Treat `WORKFLOWS.md` as helpful background, not guaranteed truth. Cross-check against `package.json`, `astro.config.mjs`, scripts, and actual data files before acting.

## Known Documentation Drift

These differences were observed on 2026-05-05 while `GEMINI.md` was still readable:

- Earlier `GEMINI.md` content said Astro SSR/server output, but `astro.config.mjs` uses static output.
- Earlier `GEMINI.md` content mentioned Supabase, but no Supabase package is present.
- Earlier `GEMINI.md` content described `src/data/derived/teamCompsByHeroId.json`, but that file does not exist in the current tree.
- `WORKFLOWS.md` mentions `generator.js`, but no `generator.js` was found.
- `package.json` has `validate:all` calling `node validate-pvp-ratings.js`, but that file was not found.
- `scripts/test-hero-tags.js` currently prints keyword diagnostics for a few heroes; it does not appear to validate every assigned synergy tag against `tags.json`.
- `src/data/heroAdapter.js` imports `./base-stats.json`, but the actual base stats file is under `src/data/stats/base-stats.json`.
- Some docs mention `src/assets/heroes` and `src/assets/skills`, but current UI primarily uses R2 URLs and `public/` assets.

## Repository Shape

Main areas:

- `src/pages/`: Astro pages.
- `src/pages/heroes/[id].astro`: static hero detail pages.
- `src/components/`: reusable Astro components.
- `src/layouts/Base.astro`: site shell, sidebar, footer, metadata, analytics, global styles.
- `src/styles/`: global CSS, design tokens, components, compositions, events.
- `src/data/`: game data and site content data.
- `src/data/heroes/*.json`: individual hero source files.
- `src/data/heroes/index.js`: imports/adapts heroes and computes rankings/synergy data for pages.
- `src/content/spotlights/*.md`: spotlight content. There are currently 40 files.
- `guides/`: authored guide drafts and completed guides.
- `scripts/`: data, asset, upload, analysis, and helper scripts.
- `leak/`: extracted/datamined game files and extraction scripts.
- `public/`: static assets and client-side `i18n.js`.

## Pages And Product Surface

Current top-level pages include:

- `/`: homepage.
- `/heros`: hero list. Note the spelling is `heros`, not `heroes`.
- `/heroes/[id]`: hero detail pages.
- `/calculator`: skill/damage comparison calculator.
- `/bosses`: PvE boss page with mechanics and recommended comps.
- `/delusions-den`: wave-based challenge guide and buff priorities.
- `/tower` and `/tower-west`: tower content.
- `/virtues`: virtue system guide.
- `/totems`: team totem guide.
- `/summon-calendar`: calendar content.
- `/events`: events content.
- `/guides`: hero guide content.
- `/tips`: general tips.
- `/hero-upgrades`: progression and upgrade guidance.
- `/changelog`: changelog page.
- `/design-system`: design system preview.

There is also `src/pages/tips copy.astro`, currently untracked in git status. Do not assume it is intentional without asking.

## Data Model: Heroes

There are currently 75 hero JSON files in `src/data/heroes`.

Current counts:

- Released heroes: 67.
- Unreleased heroes: `audhumla`, `eris`, `hephaestus`, `hera`, `idun`, `jiutian-xuannv`, `nut`, `serket`.
- Factions: Starglint 8, Clubs 16, Spades 17, Diamonds 17, Hearts 17.
- Classes: Warrior 18, Assassin 8, Tank 10, Archer 10, Support 19, Mage 10.
- Roles: Arcane 32, Nimble 19, Hefty 24.
- Rarities: Legendary 54, Epic 13, Common 8.

Important hero fields:

- `id`, `name`, `image`, `release`.
- `faction`, `role`, `class`, `rarity`.
- `description`.
- `ratings`: often `overall`, `pvp`, `pve`.
- `recommendedRelicLevel`, `evolution`, `level`.
- `stats`: raw in-game stats, usually Divine V for mature data.
- `skills`: usually 4 skills. `skill_1` is generally the ultimate.
- `relic`: relic name, description, upgrades, image.
- `synergies`: manual synergy tags.
- `baseAttackRate`, `bossUltimatesPer90s`: boss calculator / sustained DPS fields.
- `coreMechanic`, `synergyLinks`, `relicBreakpoints`, `activeBug`, `activeBugNotes`.
- `f2pInvestment`.
- `virtues` and/or `virtueSets`.
- `content-creator`: linked videos/guides.

`src/data/heroes/index.js` is the active adapter for the frontend. It imports all hero JSON files with `import.meta.glob`, overlays centralized ratings from `src/data/ratings/hero-ratings.json`, computes stat rankings/maxima, and attaches synergy info from `src/utils/synergyTags.js`.

## Ratings

There are ratings in hero JSON files and centralized ratings in:

- `src/data/ratings/hero-ratings.json`
- `src/data/ratings/invest.json`

The active hero adapter prefers centralized ratings from `hero-ratings.json` over each hero JSON's own `ratings`. When changing ratings, check which source the relevant page actually reads.

Rating strings are tier labels such as `SSS`, `SS`, `S`, `A`, `B`, `C`.

## Synergy Tags

Current tag count: 36 in `src/data/tags.json`.

Important files:

- `src/data/tags.json`: canonical tag list.
- `src/data/tagCategories.json`: shared category, order, and grouping metadata for tags.
- `src/utils/synergyTags.js`: reads shared category metadata and computes synergy potential.
- `src/components/filter.astro`: renders public tag filters from the shared category ordering.
- `scripts/tag-manager-server.js`: local tag manager server; serves `/api/tags` and `/api/tag-categories`.
- `tag-manager-frontend/index.html`: tag manager UI; loads tag/category data from the backend instead of hard-coded tag lists.

Current synergy tags are manually assigned in each hero's `synergies` array. `synergyTags.js` no longer auto-detects tags from skill text for the frontend profile; it reads the manual array and generates display/evidence from that.

Current categories in `src/data/tagCategories.json`:

- `TEAM_SUPPORT`: examples include `ATK_SPD_UP`, `BUFF_TEAM`, `CDR_TEAM`, `ENERGY_RESTORE_TEAM`, `HEAL_TEAM`, `SHIELD_TEAM`.
- `ENEMY_DEBUFF`: examples include `ATK_DOWN`, `CROWD_CONTROL`, `ENERGY_DRAIN`, `REMOVES_ARMOR`, `TAUNT`.
- `SELF_BUFFS`: examples include `ATK_SPEED`, `ATK_UP`, `DMG_RED`, `DODGE_BUFF`, `ENERGY_RESTORE`, `HEAL`, `SHIELD`.
- `PLAYSTYLE`: `AREA_DAMAGE_DEALER`, `BASIC_ATTACK_SCALER`.
- `UTILITY`: `REVIVE`, `SUMMON`, `SELF_SUSTAIN`.

When adding, renaming, deleting, or reordering tags, keep `tags.json` and `tagCategories.json` in sync. The tag-manager backend updates category metadata on rename/delete, and uncategorized tags fall back to `Custom Tags` in the manager response.

The synergy potential score currently only rewards team support tags, with especially high value for team energy restore and cooldown reduction.

## Game Systems Captured

### Equipment and Stat Upgrades
Each hero equips **4 Artifact slots**. Every slot has one **reforge stat** (also called "enchant") that can be leveled from 1 to 20. Leveling costs Hammers; the higher the current level, the more Hammers a single upgrade attempt costs, and the lower the base success chance. It is essential to maximize damage and survivability for your hero. This system is explained here: 
`data-mine/Reforge_Stats.md`

### Heroes

Heroes are the primary database object. The site tracks stats, classes, factions, roles, rarity, skill text, skill upgrades, relic effects, synergy tags, investment hints, videos, virtues, and relationships to other heroes.

Important gameplay concepts:

- Skill 1 is usually the ultimate.
- Relic level breakpoints matter, often level 20 or 30.
- Team comps are usually 5 heroes.
- Common mode split: PvP, PvE, boss fights, tower/progression, Delusions Den.
- The project values concrete in-game text and community-tested teams over invented theory.

### Factions, Roles, Classes

Current factions are card-suit themed plus Starglint:

- Clubs
- Spades
- Diamonds
- Hearts
- Starglint

Current classes:

- Tank
- Warrior
- Mage
- Archer
- Assassin
- Support

Current roles:

- Arcane
- Nimble
- Hefty

Older docs mention `Wildfire` and `Deepwater`; current hero data does not use those as factions.

### Bosses

Important files:

- `src/data/bosses.json`
- `src/pages/bosses.astro`
- `src/utils/bossAutoComp.js`
- `src/data/communityComps.json`

Current boss count: 8.

Boss entries include:

- `id`, `name`, `mode`, `battlepower`, `faction`, `class`, `image`.
- `summary`, `strategyNotes`.
- `mechanics` and `mechanicTags`.
- `skills`.
- `recommendedComps`.

`bosses.astro` turns mechanic tags into player-friendly labels and tips. Boss guide content currently combines authored strategy with community comp data.

Notable boss mechanic tags include energy drain, silence, damage reduction phases, target top DPS, percent HP damage, ramping aura, charge attack, frontal damage, berserk scaling, summons, untargetable main boss, freeze/petrify/root, heal reduction, and multi-part boss logic.

### Damage Calculator

Important file:

- `src/pages/calculator.astro`

Important data/utilities:

- `src/data/accountBonuses.json`
- `src/utils/applyBonuses.js`

The calculator compares hero skills and damage estimates. It parses skill descriptions for stat-bound percentages like ATK, max HP, current HP, multi-hit descriptions, and conditional damage variants. It supports match contexts such as quick PvP and sustained boss fights.

Boss mode uses:

- `baseAttackRate`
- `bossUltimatesPer90s`

It also supports mitigation models, armor/M-Res based estimates, physical reduction, HP impact bars, burst summaries, crit handling, and account stat presets.

### CN vs Global Comparison

Important files:

- `src/pages/cn-preview.astro` (hub page at `/cn-preview`)
- `src/utils/cnDiff.js` (pure diff engine + semantics doc in its header)
- `src/styles/components.css` (`.cn-*` classes)
- `src/pages/heroes/[id].astro` (`#section-cn` block on hero detail pages)
- `src/data/heroes/<id>.json` optional `cn` block (additive, Global data untouched)
- `data-mine/cn/<hero>.json` per-hero CN skill text ingestion input
- `data-mine/cn/_manifest.json` ingest log (capture date, skill mapping, result summary per hero)
- `.claude/CLAUDE.md` "CN vs Global Comparison System" section is the authoritative spec

Premise: CN is the canonical base and never "changes"; Global is a copy that lags or diverges. The feature surfaces where Global differs from the CN source to forecast pending balance fixes and identify undertuned heroes.

Key rules:

- Map CN skill to Global skill by CONTENT, never by id or en-name (CN files use their own skill ordering and EN names).
- Only English names render in the UI; CN `cnName` is stored for reference and never displayed.
- **Text-only diffs excluded** – wording/label differences (e.g. "evasion" vs "Dodge Rate") do NOT create value rows. Exception: damageType changes always included as rows.
- `change` semantics describe GLOBAL relative to the CN base: `buff` = Global better than CN, `nerf` = Global worse than CN, `diff` = non-numeric / direction-ambiguous, `neutral` = equal.
- Numbers are language-agnostic; screenshot/vision ingestion was tried and rejected (digit misread produced a false positive). Extracted text is the proven pipeline.
- `verified: false` flags uncertain rows (often damageType differences that may be a Global JSON error rather than a real divergence). Never mutate Global combat data from inference alone.
- **No-diff rendering** – heroes with zero divergences (all neutral rows, no buff/nerf/diff) show "Matches Global" badge, not a CN table.
- Hero detail section and hub render only when a `cn` block exists and has at least one change; detail shows changed rows only.

Workflow: drop `data-mine/cn/<hero>.json`, write a `cn` block into the matching `src/data/heroes/<hero>.json`, log the mapping + result in `_manifest.json`, run `npm run db:merge` then `npm run build`, verify `/cn-preview` and the detail `#section-cn`.

### Delusions Den

Important files:

- `src/pages/delusions-den.astro`
- `src/data/delusions-den.json`

Current data:

- 5 blessings.
- 55 buffs.

Delusions Den is represented as a wave-based challenge mode: choose a blessing, fight through 7 waves, draft buffs between waves, then maximize final score. The page includes blessing explanations, buff priority, and concrete compositions such as Megafungus/Phoenix, Mask of Sorrow basic attack core, Divine Nectar Skadi/Hladgunnr, and Horn of Doom beginner setup.

### Virtues

Important files:

- `src/data/virtues.json`
- `src/pages/virtues.astro`
- hero detail page virtue sections.

Current virtue count: 69.

Virtues are equipment-like upgrade pieces. They can be singular stat pieces or set pieces. Sets use 2-piece and/or 4-piece bonuses. Hero JSON can recommend virtue sets through `virtueSets`, each listing virtue ids.

### Totems

Important files:

- `src/data/totems.json`
- `src/pages/totems.astro`

Totems are team-wide equipment: one totem per team, effects apply to all 5 heroes. Data includes rarity, ratings, archetypes, meta flag, summary, effects by level, and images.

Important totem archetypes include burst, opening, sustain, progression, scaling, carry, and mixed.

### Guides And Spotlights

Guide sources:

- `guides/*.md`
- `guides/done/*.md`
- `src/data/hero-guides.json`
- `src/content/spotlights/*.md`

`src/data/hero-guides.json` contains richer authored guide data with hero guide entries, quotes, tags, comps, reasons, and notes. These often encode high-value meta knowledge and should be read before changing guide pages or hero recommendations.

`guides/Prompt.md` is a research prompt for building new hero analyses. It stresses:

- Use Motto Immortal sources only.
- Prefer real data, skill text, relic text, CN posts, screenshots, and datamining.
- Mark uncertain information clearly.
- Search CN communities such as TapTap, Bilibili, NGA, 9game, Huya.

## Data Sources And Asset Pipeline

Important data extraction area:

- `leak/`
- `leak/game_extracted/`
- `leak/game_graphics/` if present.
- `src/data/game_id_mapping.json`.

The project has extracted game data and graphics. Use these files for factual game verification when possible. Do not assume external wiki data is correct unless verified.

Asset workflow from existing docs:

- `src/data/game_id_mapping.json` maps project hero ids to internal game ids.
- `scripts/convert-game-assets.mjs` converts extracted portraits and skill icons to WebP.
- `scripts/upload-to-r2.mjs` uploads assets to Cloudflare R2.
- `scripts/validate-hero-detail-stats.mjs` compares Divine V stats against extracted `hero_detail.json`.

Common image paths in current data are R2 URLs:

- Heroes: `https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev/heroes/{hero_id}.webp`
- Skills: `https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev/skills/{hero_id}_skill_{n}.webp`
- Relics: `https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev/skills/{hero_id}_relic.webp`
- Icons: R2 folders such as `icons/factions`, `icons/roles`, `icons/classes`, `icons/totems`.

## Scripts

Scripts from `package.json`:

- `npm run dev`: Astro dev server.
- `npm run dev:api`: Node API server.
- `npm run dev:all`: runs Astro and API server together.
- `npm run build`: Astro production build.
- `npm run preview`: Astro preview.
- `npm run tag-manager`: Express tag manager at local port 3000.
- `npm run db:merge` or `npm run mergeHeroes`: regenerate `src/data/all_heroes_db.json`.
- `npm run after:hero-edit`: merge heroes and run `scripts/test-hero-tags.js`.
- `npm run after:tags`: run tag script and merge heroes.
- `npm run after:boss-import`: merge heroes after importing attack rates.
- `npm run import-attack-rates`: import boss attack rates.
- `npm run validate:hero-detail-stats`: compare hero detail stats against extracted game data.
- `npm run upload-assets`, `upload-assets:dry`, `upload-assets:force`: Cloudflare R2 upload pipeline.
- Production deploy: handled by Cloudflare outside npm scripts.

Be careful: some workflow docs mention scripts or generated files that are no longer present. Check `package.json` and `scripts/` before relying on old workflow text.

## Build And Validation Notes

For code or content changes:

- Run `npm run build` for page/build validation when practical.
- Run `npm run db:merge` after editing `src/data/heroes/*.json` if `all_heroes_db.json` needs to stay in sync.
- Run `npm run validate:hero-detail-stats` when changing Divine V stats.
- Run `npm run tag-manager` for manual tag editing.

Known caveat: `npm run validate:all` currently references a missing `validate-pvp-ratings.js`, so it may fail unless that file is restored or the script is updated.

## Design System And UI Style

Global style files:

- `src/styles/tokens.css`: design token source of truth.
- `src/styles/reset.css`
- `src/styles/base.css`
- `src/styles/components.css`
- `src/styles/compositions.css`
- `src/styles/events.css`

Design tone:

- Dark fantasy database UI.
- Gold, purple, teal, and dark surfaces.
- Rarity and tier colors are tokenized.
- Hero pages use cinematic portrait sections and faction-based accent colors.
- Hero list supports grid/list view and extensive filtering.
- Boss pages use a visual slide plus information panel pattern.

Important components:

- `Base.astro`: page shell, SEO, analytics, global styles.
- `Sidebar.astro`: site navigation.
- `Footer.astro`.
- `PageHero.astro`: page headers/hero bands.
- `HeroCard.astro`: hero cards.
- `filter.astro`: hero filters.
- `Accordion.astro`: image accordion behavior.
- `HeroCompositions.astro`: hero team compositions.
- `RelicInvestment.astro`: relic investment section.
- `F2pInvestment.astro`: F2P investment section.

When adding UI, prefer tokens from `src/styles/tokens.css` and established page patterns. `design-system/INVENTORY.md` says `guides.astro`, `heroes/[id].astro`, `heros.astro`, and `bosses.astro` are more useful references than `tips.astro`, which is marked as a refactor target.

## Internationalization

There is a simple client-side i18n setup:

- `public/i18n.js`
- `src/i18n/translations.js`
- `data-i18n` attributes in templates.

The default language is loaded from `localStorage.getItem("lang") || "en"` and written to `document.documentElement.dataset.lang`.

## Current Git Worktree Note

At review time, git status showed:

- Modified: `.claude/settings.json`
- Modified: `.gitignore`
- Untracked: `src/pages/tips copy.astro`

These were pre-existing changes. Do not revert them unless explicitly asked.

## Rules For Future Work

- Read the relevant data file before changing game recommendations.
- Do not invent hero mechanics, skills, relic effects, or meta claims.
- Prefer existing JSON and markdown guide content over memory.
- If external research is needed, use reliable current sources and cite them.
- For data changes, keep generated/merged files in sync when the repo expects it.
- For UI changes, follow `tokens.css` and current Astro/CSS patterns.
- Be skeptical of older docs when they conflict with source code.
- Use ASCII in code and documentation unless a specific file already requires non-ASCII.
- Preserve user edits in the working tree.

## Quick Exploration Checklist

When starting a new task:

1. Check `git status --short`.
2. Read this file.
3. Read `package.json`, `astro.config.mjs`, and the exact page/component/data file involved.
4. If game content is involved, read the relevant hero JSON, guide JSON/markdown, boss/virtue/totem data, and extracted files if needed.
5. Cross-check existing workflow docs against actual scripts.
6. Make a narrow change and run the smallest useful validation.

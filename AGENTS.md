# AGENTS.md

Guidance for AI coding agents working in this repository. Read this before making changes.

## Project overview

This is a fan-made database and guide site for the mobile gacha game **Motto Immortal**, published at `https://motto-immortal-db.com`. It is a content-heavy static site: heroes, stats, skills, relics, synergy tags, tier ratings, team compositions, bosses, virtues, totems, events, written guides, and a client-side tower-defense mini game.

The project is built with **Astro 7** (`output: 'static'`) and plain TypeScript/JavaScript — there is no React, Vue, or other frontend framework. Styling is plain CSS and global CSS token files. The site is deployed to **Cloudflare Pages** from the `dist/` output; build and deploy are handled by Cloudflare (no CI deploy workflow in this repo). Static assets (hero images, skill icons) are served from **Cloudflare R2** (`pub-a33abfbc3135413881a1d8eb86543559.r2.dev`), with some files under `public/`. In dev, requests to `/r2/*` are proxied to R2 by the Vite config so the browser revalidates assets (`astro.config.mjs`).

Game knowledge matters as much as code knowledge here. Do not invent game facts. Prefer existing JSON data, markdown guides in `docs/`, `data-mine/`, or clearly marked community data.

Several root-level markdown files are design docs and working memory, not code: `TOWER_DEFENSE_*.md`, `PROJECT_MEMORY.md` (agent working memory, notes documentation drift), `STATUS_DASHBOARD.md`, `WORKFLOWS.md` (German, operational workflows — helpful background but cross-check against `package.json` and the actual scripts before acting), `map.md` (TD map art assignments).

## Technology stack

- Astro 7, static output, sitemap integration, strict TypeScript (`tsconfig.json` extends `astro/tsconfigs/strict`).
- Node >= 22.12 (see `package.json` engines and `.nvmrc`). The repo is ESM (`"type": "module"`); most scripts are `.mjs`/`.js`, a few are `.cjs` or Python (3.14).
- Runtime dependencies are intentionally small: `astro`, `express`, `cookie`, `dotenv`. Express powers local utility servers (`api-server.js`, `scripts/tag-manager-server.js`) — it is not part of the deployed site.
- One **Cloudflare Pages Function** lives in `functions/api/hero-submission.js` (POST endpoint forwarding a community hero form to a Discord webhook via the `DISCORD_HERO_WEBHOOK` secret).
- `api-server.js` uses Supabase (`@supabase/supabase-js`), but that package is not declared in `package.json` — it resolves from `node_modules`. Treat this as technical debt; do not extend it without flagging it.
- i18n: locales `en`, `de`, `es`, `ru`, `zh` (`src/i18n/config.ts`). Only a subset of routes is localized under `src/pages/[locale]/` (note the existing typo: the wishlist page and its route are spelled `wishlisht` — keep URLs stable, do not "fix" the public path).

## Repository layout

- `src/pages/` — Astro routes. Top level holds the main site pages (`heroes`, `tierlist`, `bosses`, `virtues`, `artifacts`, `events`, `summon-calculator`, `status`, `games/tower-defense/*`...). `src/pages/[locale]/` holds localized variants. `src/pages/heroes/[id].astro` generates one static page per hero from the JSON data.
- `src/components/` — Astro components, grouped by area: page-level components in `pages/`, reusable UI primitives in `ui/`, tower-defense screens in `td/`, plus shared layout pieces (`Sidebar.astro`, `Footer.astro`, `filter.astro`).
- `src/layouts/` — `Base.astro` and `GameLayout.astro`.
- `src/data/` — the content core. `heroes/*.json` (one file per hero, ~90 heroes — this is the source of truth for hero data), `all_heroes_db.json` (generated merge of all hero files), `tags.json` + `tagRules.json`, `virtues.json` + `virtueRules.json`, `compRules.json`, `ratings/` (rating system code + data), `bosses.json`, `td*.json` (tower-defense game data), `guides.ts`, `nav.ts`, `eventsGlobal.ts`, `game_id_mapping.json` (maps project hero ids to internal game data ids).
- `src/game/td/` — the tower-defense game engine, plain JS modules (`sim.js`, `waves.js`, `skills.js`, `render.js`, `grid.js`, `map-generator*.js`, `save.js` via `page/save.ts`, ...). `src/game/td/page/` holds the page-level controller modules. `src/game/media/`, `src/game/moodboards/` hold art direction assets.
- `src/i18n/`, `src/utils/` (`heroTags.js`, `synergyTags.js`, `ratingScale.ts`, `projectStatus.js`), `src/styles/`.
- `public/` — static assets served as-is (`heroes/`, `skills/`, `td/`, `td-local/`, banners, ...).
- `scripts/` — ~80 Node/Python tools: data merge and validation, imports, R2 upload/download, image variant generation, tower-defense balance/build/test/report tools, and the tag-manager server. `scripts/lib/` holds shared TD helpers (`td-runner.mjs`, `td-class-matrix.mjs`), `scripts/fixtures/` test fixtures.
- `tests/` — `rating-system.test.mjs` (node:test) and `test_combat_analysis.py` (unittest; imports `combat_analysis.py` from the repo root).
- `functions/api/` — the Cloudflare Pages Function.
- `extracted/`, `artifacts/`, `assets/`, `data-mine/`, `outputs/`, `design-system/` — extracted game assets, generated art, research notes, and design-system docs. Mostly inputs/outputs of asset pipelines, not application code.

## Build and run commands

- `npm run dev` — Astro dev server.
- `npm run dev:all` — dev server plus the local Express API server (`api-server.js`, port 3001, requires `.env.local` with Supabase keys).
- `npm run tag-manager` — local admin/tag-manager server on port 3000. The `/status` dashboard (dev-only) uses it to write hero data, ratings, investment, and synergy tags. See `STATUS_DASHBOARD.md`.
- `npm run build` — production build into `dist/`.
- `npm run preview` — preview the built site.
- `npm run check` — `astro check` (TypeScript).

**Do not run `npm run build` on your own initiative.** The user runs builds themselves and will ask you to inspect failures.

## Data workflows (run these after editing data)

The rule: after changing hero source data, regenerate the derived files and validate, or the pre-commit hook will block the commit.

- Edit `src/data/heroes/*.json` → `npm run after:hero-edit` (merges `all_heroes_db.json`, validates tags).
- Edit `src/data/tags.json` (e.g. after a tag-manager session) → `npm run after:tags`.
- Import boss data (`npm run import-attack-rates`) → `npm run after:boss-import`.
- Broader checks: `npm run validate:all`.

The pre-commit hook (`.githooks/pre-commit`) rejects commits where hero JSON or `tags.json` changed but `src/data/all_heroes_db.json` was not regenerated and staged. Fix by running the workflow above, `git add` the generated file, and commit again. Emergency escape: `git commit --no-verify`.

## Testing

Tests are plain `node --test` runner scripts and Python `unittest` — no Jest/Vitest/pytest.

- `npm run test:ratings` — rating system unit tests (`tests/rating-system.test.mjs`).
- `npm run test:tower-defense` — the big TD suite: balance check plus simulation, UI, save, skin, board-classes, map-generator, daily, challenges, expedition, campaign, summon tests (`scripts/test-td-*.mjs`).
- `npm run validate:all` — data quality validation (tags, virtue rules, comp rules, bosses).
- `npm run validate:ratings` / `ratings:report` — rating data checks.
- Python: `python -m unittest tests.test_combat_analysis` (needs repo root on `PYTHONPATH` for `combat_analysis.py`).

Run the tests that cover what you changed; do not re-run the full suite after unrelated edits. Do not write tests for reversible, low-impact changes that merely mirror the implementation.

## Code and contribution conventions

- Generated data files (`src/data/all_heroes_db.json`) must stay in sync with their sources — see the pre-commit hook above.
- Several docs mention files that no longer exist (`generator.js`, `validate-pvp-ratings.js`, `src/data/derived/`). Treat `WORKFLOWS.md` and `PROJECT_MEMORY.md` as background; verify script names against `package.json` before running them.
- TD map geometry is generated, not hand-edited: `roadSlots`, `platformSlots`, and `rings` in `src/data/tdMaps.json` come from `node scripts/build-td-grid.mjs`, and `test-td-sim.mjs` fails when the file is stale. Map art assignments are documented in `map.md` — do not substitute painted assets.
- Keep public URLs stable (including the `wishlisht` typo).
- Ask for confirmation before adding new production dependencies.

## Security and secrets

- Never commit secrets. Cloudflare secrets (e.g. `DISCORD_HERO_WEBHOOK`) live in the Cloudflare dashboard; local equivalents go in `.env.local` / `.dev.vars`, which are gitignored.
- `.env.r2` holds R2 credentials for the upload/download scripts.
- The `/status` dashboard and tag manager are local-only: the production build deletes `/status` via the `localOnlyRoutes` integration in `astro.config.mjs`, which also strips local-only routes from the sitemap.
- The GitHub workflow `.github/workflows/supabase-keepalive.yml` pings Supabase on a schedule and uses repository secrets only.

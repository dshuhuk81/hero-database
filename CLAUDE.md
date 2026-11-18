# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` is the canonical, checked-in guidance for this repo (project overview, layout, data workflows, security). Read it first; this file only adds the commands and architecture notes needed to get productive quickly. Where the two disagree, verify against `package.json` and the scripts.

## Commands

- `npm run dev` — Astro dev server. `npm run dev:all` also starts `api-server.js` (port 3001, needs `.env.local`). `npm run tag-manager` — local admin server (port 3000) behind the dev-only `/status` dashboard.
- `npm run check` — `astro check` (strict TS).
- **Never run `npm run build` on your own initiative** (the user builds and reports failures). `npm run build` goes through `scripts/build-with-supported-node.mjs`.
- After editing `src/data/heroes/*.json`: `npm run after:hero-edit`. After editing `src/data/tags.json`: `npm run after:tags`. After a boss import: `npm run after:boss-import`. Then stage the regenerated `src/data/all_heroes_db.json`, or `.githooks/pre-commit` rejects the commit.
- Validation: `npm run validate:all` (bosses, tags, tag/virtue/comp rules), or individually `validate:tags`, `validate:tag-rules`, `validate:virtue-rules`, `validate:comp-rules`, `validate:ratings`.
- Tests (node:test, no Jest/Vitest): `npm run test:ratings`. Single file/test: `node --test tests/rating-system.test.mjs` or add `--test-name-pattern="<name>"`. Rule tests live in `scripts/test-*-rules.mjs` and run via the `validate:*-rules` scripts. Python: `python -m unittest tests.test_combat_analysis` (repo root on `PYTHONPATH`).
- Assets: `npm run upload-assets[:changed|:force]` pushes to R2; `sync:r2-heroes-down` + `build:hero-variants` regenerate hero image variants (`prepare-hero-variants` does both). R2 credentials come from `.env.r2`.

## Architecture notes

**Hero data pipeline.** `src/data/heroes/<id>.json` is the source of truth. `scripts/merge-heroes-db.js` merges them (keyed by `id`) into the generated `src/data/all_heroes_db.json`; never hand-edit that file. `src/pages/heroes/[id].astro` builds one static page per hero from this data. `game_id_mapping.json` maps project hero ids to internal game ids for the `data-mine/` extractions.

**Rule-driven derived data.** Synergy tags (`tags.json` is the single source of truth for tag categories, with `tagRules.json`), virtues (`virtues.json` + `virtueRules.json`) and team comps (`compRules.json`) are declarative rule files. Helpers in `src/utils/` (`heroTags.js`, `synergyTags.js`) compute from them at build time, and the `scripts/test-*` validators enforce consistency. The `suggest:*` scripts propose tags/virtues/comps from the rules. Changing a rule file usually means re-running its validator.

**Ratings.** `src/data/ratings/` (`ratingSystem.js`, `heroRatingFields.js`, `hero-ratings.json`, `invest.json`, see its `README.md`) plus `src/utils/ratingScale.ts` drive tier lists and scores. `import-ratings` / `import-investment` populate them; `tests/rating-system.test.mjs` covers the logic.

**Local-only tooling vs. deployed site.** `/status`, `api-server.js` and `scripts/tag-manager-server.js` are local Express utilities that write data files; `astro.config.mjs` (`localOnlyRoutes`) strips `/status` from the production build and sitemap. Only the Cloudflare Pages Function `functions/api/hero-submission.js` runs server-side in production.

**i18n.** Locales `en/de/es/ru/zh` (`src/i18n/`). Only some routes are duplicated under `src/pages/[locale]/`; UI strings in `src/i18n/ui.ts`, tag labels in `tags.ts`. Keep public URLs stable, including the `wishlisht` typo.

**Images.** Served from Cloudflare R2 (dev proxies `/r2/*` via the Vite config) with some under `public/`. Hero art is large: prefer the generated card/thumb variants and CSS `background-image` with fixed dimensions and `background-size: cover` over a bare `<img>` of the full image.

**Game data from Android clients (from `.claude/claude.md`).** Release dates, events and hero art come from the Android game clients. Scripts live in `tools/android/` (see its README); heavy data (APKs, dumps, extracted art, `out/`) stays outside the repo in `~/Downloads/Sites/android` (`ANDROID_DATA_DIR`). Run with `tools/android/run.sh <script> [args]`. Flow: `emu_status.py --pull` -> `unpack_config.py` -> export scripts write `out/site_data/*.json` -> `npm run import:game-data` validates and copies them into `src/data/generated/` (committed). Contract: `docs/superpowers/specs/2026-10-28-phase1-data-contract-design.md`. Hero images need transparent backgrounds; `art_global`/`art_cn` portraits are opaque white, so use `art_new_*` or `extracted/UI_Hero_Portraits`.

**Tower defense is out of this repo.** "The Last Crossing" lives in `~/the-last-crossing`; do game work there, not here.

## Style rules (from `.github/copilot-instructions.md`)

- Full design guidelines: `design-system/STYLE_GUIDELINES.md`.
- No inline CSS. Add styles to `src/styles/components.css` (utility classes go in its utilities section) and reuse the design tokens in `src/styles/tokens.css` (overview in `design-system.astro`).
- No emojis or other non-ASCII characters in code, comments or docs.
- Do not invent game facts or data; use only what is in the project JSON/markdown or `data-mine/`, and ask if data is missing.
- Some of that file is stale (it references `src/data/derived/` and `src/assets/heroes/`, which do not match the current layout); trust the repo over it.

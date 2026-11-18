# claude.md

## Project Overview
Motto Immortal Database is your fan-made companion website for Motto Immortal, helping players explore heroes, compare ratings, plan upgrades, and improve their teams. It brings together detailed hero information, tier lists, guides, event schedules, summon calculators, and equipment recommendations.
Built with Astro and structured game data, it’s a solo passion project focused on making useful game knowledge accessible to the community.

## Style and Design
For more info read the Design Guidelines here `design-system/STYLE_GUIDELINES.md`

## Hero Data
All the information for the heroes in this game is saved here `src/data/heroes`

### Tower Defense
The tower defense game "The Last Crossing" moved out of this repo on 2026-10-12. It lives in `~/the-last-crossing` (GitHub `dshuhuk81/the-last-crossing`), runs at https://tower.motto-immortal-db.com with its own R2 bucket, and `public/_redirects` sends old `/games/tower-defense` URLs there. Do game work in that repo, not here.

## Game data pipeline
Release dates, events and hero art come from the Android game clients. The scripts live in `tools/android/` (see its README); the heavy data (APKs, client dumps, extracted art, `out/`) stays in `~/Downloads/Sites/android` (`ANDROID_DATA_DIR`), whose `scripts` entry is a symlink to `tools/android/scripts`. Run them with `tools/android/run.sh <script> [args]`.
Flow: `emu_status.py --pull`, `unpack_config.py`, then the export scripts write `out/site_data/*.json` there, `npm run import:game-data` validates and copies them into `src/data/generated/` (committed). Contract: `docs/superpowers/specs/2026-10-28-phase1-data-contract-design.md`. Open requests for the agent working in the data directory: `docs/agent-message-android.md`.
Hero images must have a transparent background (hall backdrop is behind them); `art_global`/`art_cn` portraits are opaque white, use `art_new_*` or `extracted/UI_Hero_Portraits`.

## Images and cloud storage
We use Cloudflare Pages and R2 as depository for our assets and build generation.

### AI ASSETS
Under this link youll have a complete overview of all pixellab tools to use - this will allow you to Generate animated pixel art characters and tilesets directly : `https://api.pixellab.ai/mcp/docs`
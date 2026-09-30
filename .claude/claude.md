# claude.md

## Project Overview
Motto Immortal Database is your fan-made companion website for Motto Immortal, helping players explore heroes, compare ratings, plan upgrades, and improve their teams. It brings together detailed hero information, tier lists, guides, event schedules, summon calculators, and equipment recommendations, alongside a playable tower defense game.
Built with Astro and structured game data, it’s a solo passion project focused on making useful game knowledge accessible to the community.

## Style and Design
For more info read the Design Guidelines here `design-system/STYLE_GUIDELINES.md`

## Hero Data
All the information for the heroes in this game is saved here `src/data/heroes`

### Tower Defense
There is a tower defense game I created and its saved in `src/game/td`
- Page: `src/pages/games/tower-defense.astro` -> `src/components/pages/TowerDefensePage.astro` (wiring only) with markup in `src/components/td/` and page logic in `src/game/td/page/` (shared `context.ts`; modules call each other through `ctx.actions`).
- Simulation `sim.js`, renderer `render.js`, styles `src/styles/td.css`. Assets load from R2 under `td/` (`assets.js`).
- Tests: `npm run test:tower-defense`, `npm run test:td-balance`; difficulty sweep `npm run td:sweep`; plan and open items in `docs/tower-defense-ui-plan.md`.
- Asset jobs (enemy clips, new stills, new hero art): follow `docs/td-asset-pipeline.md` step by step.
- Enemy animations (live): PixelLab clips -> `scripts/td-warp-anim.py --pixellab` -> `scripts/build-td-enemy-anims.mjs --release` -> R2 `td/enemies/clips/{still}.json` (named after the still it animates); workflow in `src/game/td/sprite-spec-for-ai.md` ("Animation frames").
- Maps are theme (art) + generated route: `scripts/generate-td-map.mjs --gen=lattice-v2` (`src/game/td/map-generator-v2.js`); see `docs/tower-defense-map-generator-plan.md` ("Lattice v2").
- After each implementation, update the .md Documentation to keep our source of truth up to date:
`/Users/daschultheiss/hero-database/TOWER_DEFENSE_SPEC.md`

## Images and cloud storage
We use Cloudflare Pages and R2 as depository for our assets and build generation.

### AI ASSETS
Under this link youll have a complete overview of all pixellab tools to use - this will allow you to Generate animated pixel art characters and tilesets directly : `https://api.pixellab.ai/mcp/docs`
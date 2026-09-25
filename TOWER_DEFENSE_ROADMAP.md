# Tower Defense Roadmap

Last updated: September 25, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

## What's next (priority order)

| # | Item | Why |
|---|------|-----|
| 1 | **P3 Two new maps** skip | Crimson Forge (parallel lanes) + Frozen Citadel (spiral); add to `tdMaps.json` |
| 2 | **AI sprites** done (tokens + enemy art) | Hand spec at `src/game/td/sprite-spec-for-ai.md` to AI agent or finde a workflow to create 2d sprite assets to use from the original game 3d art images (like the ones we use for portraits on the r2 server); drop into `public/td/enemies/` or use `https://comfy.org/workflows/templates-sprite_sheet-fe5600667e2c/` or `https://giventofly.github.io/pixelit/` |
| 3 | **Map Art and Map Upgrades** answered, deferred | No engine switch needed (see below). Ignored for now as agreed |
| 4 | **Map Changes** We could think about having a) a new Entry Tile (not just entering from the left) and a base tile.b)  Also upcoming maps could have multiple 2-3 spawn points which could make a new difficulty level. But having 2-3 spawn would consider a good balance of the game before doing so. Also we know we dont need another engine but how could we make the map look better? maybe more 3d or more pleasing in terms of art style like a ingame motto immortal environment ?|

## Research notes (September 25, 2026)

**Map art: no new engine.** PixiJS 8 is already a full WebGL 2D renderer. Phaser would add scenes, physics and input helpers, none of which are the gap, and would mean rewriting `render.js` (about 1,000 lines). The flat look comes from the art setup: both maps share one world-map image, the path is a uniform tiled cobble band with a gold halo and a centerline, there are no shadows, props or ambient motion. Possible upgrades inside Pixi when this comes back: one background per map, a soft drop shadow and worn edges on the path (blurred mask), scenery sprites along the path sorted by y, unit drop shadows, ambient particles (mist, fireflies, embers), color grading per map (`pixi-filters` AdjustmentFilter, Godray, Bloom), animated portals.

**Sprites from game art** (all three options done, September 25, 2026):

1. Hero tokens shipped: `scripts/build-td-tokens.mjs` crops head-and-shoulders cutouts from the full-body hero art on R2 (already transparent, no background removal needed), per-hero crop fixes in `src/data/tdTokenCrops.json`, output `public/td/tokens/{id}-v1.webp`, uploaded to R2 `td/tokens/`. The board draws them with the head overlapping the level ring and a ground shadow; heroes without a token keep the circle portrait.
2. AI enemy sprites: done. Generated with Coplay (`gpt_image_1`, medium quality, transparent background, about $0.04 each; needs a running Unity Editor with the Coplay package, for example `~/android/assetripper/newtry/ExportedProject`; the Gemini provider returned 404). Sources in that project under `Assets/td_sprites/`, sprites uploaded to R2 `td/enemies/sprites/`. Prompts need "entire body visible, wide empty margin" or the subject gets cropped. Prompt template and steps in `src/game/td/sprite-spec-for-ai.md`; `scripts/build-td-enemy-sprites.mjs <folder>` normalizes the images to `public/td/enemies/sprites/{kind}-v1.webp`; the renderer prefers them over portraits (unmasked, ground shadow, faces its direction of travel). Only the 5 enemy kinds and Baphomet are needed.
3. Game Spine data: cracked. The skeleton bundles are not encrypted, only prefixed with a 46-byte decoy UnityFS header; `~/android/extract_spine_bundle.py` extracts skeleton (Spine 4.0.51 binary), atlas and textures. Verified with Ares and Poseidon, rendered with the Spine 4.0 web player. Limits: hero spines only have showcase animations (`entry`, `idle`, `interaction`), no combat moves, and enemies and bosses are 3D models in the game (no Spine). The official Pixi 8 Spine runtime needs Spine 4.2, so the practical route is pre-rendering the idle loop to sprite sheets offline. Open question before building it: full-body heroes are hard to read at board size (about 60px), so this fits the recruit sheet, lobby or result screen better than the board.

## Dev commands

```
npm run test:tower-defense      # headless combat/upgrade/virtue checks
npm run test:td-balance         # 5-squad balance harness
npm run build:game-balance      # regenerate hero balance
```

`window.tdGame` and `window.tdRenderer` available in browser for debugging.

## Known gaps / deferred

- Favor tree effects beyond startingGold/lives are returned by applyFavorTree but some are no-ops until sim reads them (tank HP, mage range, etc.)
- Sound variants not listening-pass verified
- Kill-count quest type was offered and not picked
- Mobile / landscape layout (large scope, deferred)
- Endless mode, 20-wave mode, leaderboard, replays (deferred per original spec)

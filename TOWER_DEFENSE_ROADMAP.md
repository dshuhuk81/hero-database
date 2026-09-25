# Tower Defense Roadmap

Last updated: September 25, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

## What's next (priority order)

Map work is handled separately and archived. Shipped today (see archive): Slayer quest, landscape re-check, Lilith, level-3 focus, Divine Blessings 2.0. Milestones below are in priority order; each one lists what "done" means.

**Paused September 25, 2026.** All work of this session is uncommitted (Slayer share 0.6, Lilith, level focus, Blessings 2.0 incl. deleted `favorTree.json` and new `blessingTree.json`, `page/blessings.ts`, research doc). `npm run test:tower-defense`, `npm run test:td-balance` and the TD type check pass. Resume with M1 (in parallel) and M4 once endless mode lands.

### M1: 20-wave and endless mode (medium, done, uncommitted)

- Goal: longer runs beyond the current wave count; 20-wave mode with a boss every 5th wave, then endless as an extension.
- Scope: wave generator scaling past the current table, boss cadence, mode picker on the start screen, local best score per mode in the existing `td:v1` save.
- Done when: both modes finish a headless sweep without runaway or trivial difficulty, and the save stays backward compatible.
- Done (September 25, 2026): `src/game/td/waves.js` builds the tables (modes `classic`, `long`, `endless`; classic is `tdWaves.json` unchanged). Longer modes add a boss every 5th wave; bosses before the last are scaled by `tuning.waveGen.midBossScale` (0.4, HP and attack, Lilith's children too), the wave-20 boss and endless bosses from wave 20 are full strength. Waves past 10 cycle base waves 6-9 with +2% enemies and -2% gaps per wave (gap floor 55%); the sim appends endless waves as it goes. Play opens a run length step for the selected map (panel `mode`, each length with that map's best; last pick remembered in `td:mode` and focused), HUD wave total (∞ in endless), boss label and notice on every boss wave. Per-mode records live in `mapTop`/`mapBests` under `map@mode` keys (classic keeps the plain map id, `bestScore` stays the classic record), so old saves load unchanged. Sweep: `npm run td:sweep -- --mode=long|endless`; `test:td-balance` now asserts 20 waves has winners and losers per map and endless ends before the 150-wave guard with a run past wave 20. Results (seed 99-102, no blessings): 20 waves 15/40 wins; endless best squads reach 22-26, with every blessing maxed 30-40.
- Open: endless earns Favor per wave with no cap (farmable); decide with M4 pacing.

### M2: Leaderboard (large, needs design first)

- Goal: shared scores across players.
- Blocker: needs an anti-tamper design before any code (see spec section 9); a plain client-submitted score endpoint would be a cheat form. Likely path is a Cloudflare Worker plus D1.
- Done when: the anti-tamper approach is agreed, then built.
- Only in Endless Mode maybe?

### M3: Sound variant listening pass (postponed)

- Postponed until all hero sounds are in. The in-game sound files still carry internal game names, so they have to be sorted and renamed by hand first, then 1 attack and 1 ultimate sound picked per hero from about 8 files.
- Goal: every sound variant in `src/game/td/audio.ts` has been heard in a real run and judged OK.
- Scope: play through both maps, trigger each variant, note clipping, volume jumps or repetitive-sounding picks; fix or drop bad variants.
- Done when: each variant is marked verified (or removed), and the known gap is closed.

### M4: Divine Blessings tuning (after M1)

- The tree itself shipped (archive, [docs/tower-defense-blessings-research.md](docs/tower-defense-blessings-research.md) section 7). This milestone is the follow-up once endless mode exists.
- Goal: full progression is needed somewhere. Today the full tree wins at about 4 to 5x enemy HP while the 10-wave mode runs at 2x.
- Scope: balance bots that buy blessings (so `td:sweep` measures real progression), pacing check (trunk about 128 runs, a class branch 11 to 21 runs with two heroes), endless waves as the power sink, maybe a cap on vertical bonuses. Later, if class branches feel alike: per-hero capstones.
- Done when: a sweep with bought blessings shows endless runs getting longer with progression, and the 10-wave mode is not trivial before about half the trunk.

## Research notes (September 25, 2026)

**Sprites from game art** (all three options done, September 25, 2026):

1. Hero tokens shipped: `scripts/build-td-tokens.mjs` crops head-and-shoulders cutouts from the full-body hero art on R2 (already transparent, no background removal needed), per-hero crop fixes in `src/data/tdTokenCrops.json`, output `public/td/tokens/{id}-v1.webp`, uploaded to R2 `td/tokens/`. The board draws them with the head overlapping the level ring and a ground shadow; heroes without a token keep the circle portrait.
2. AI enemy sprites: done. Generated with Coplay (`gpt_image_1`, medium quality, transparent background, about $0.04 each; needs a running Unity Editor with the Coplay package, for example `~/android/assetripper/newtry/ExportedProject`; the Gemini provider returned 404). Sources in that project under `Assets/td_sprites/`, sprites uploaded to R2 `td/enemies/sprites/`. Prompts need "entire body visible, wide empty margin" or the subject gets cropped. Prompt template and steps in `src/game/td/sprite-spec-for-ai.md`; `scripts/build-td-enemy-sprites.mjs <folder>` normalizes the images to `public/td/enemies/sprites/{kind}-v1.webp`; the renderer prefers them over portraits (unmasked, ground shadow, faces its direction of travel). In the game: the 5 enemy kinds, Baphomet (`boss-v1`), Lilith (`boss-lilith-v1`) and her children (`brood-v1`); the renderer loads the map's boss sprite.
3. Game Spine data: cracked. The skeleton bundles are not encrypted, only prefixed with a 46-byte decoy UnityFS header; `~/android/extract_spine_bundle.py` extracts skeleton (Spine 4.0.51 binary), atlas and textures. Verified with Ares and Poseidon, rendered with the Spine 4.0 web player. Limits: hero spines only have showcase animations (`entry`, `idle`, `interaction`), no combat moves, and enemies and bosses are 3D models in the game (no Spine). The official Pixi 8 Spine runtime needs Spine 4.2, so the practical route is pre-rendering the idle loop to sprite sheets offline. Shipped September 25, 2026: the recruit sheet shows the hovered or focused hero's idle loop (24-frame sprite sheets in R2 `td/anims/`, loop lengths in `src/data/tdHeroAnims.json`). Pipeline: `scripts/td-spine/` (extractor copy, `heroes.json` TD id -> bundle name, `render-sheets.cjs` renders frames with the Spine 4.0 player in headless Chromium). One skeleton (Jormungandr) is JSON instead of binary.

## Dev commands

```
npm run test:tower-defense      # headless combat/upgrade/virtue checks
npm run test:td-balance         # 5-squad balance harness
npm run td:sweep                # difficulty sweep (enemy HP steps x squads x maps)
npm run build:game-balance      # regenerate hero balance (re-ranks all heroes)
npm run check                   # astro check (TD code is type-clean; rest of site not yet)

node scripts/build-td-tokens.mjs [--only id] [--sheet out.png]   # board tokens -> public/td/tokens
node scripts/build-td-enemy-sprites.mjs <folder>                   # AI enemy art -> public/td/enemies/sprites
PW=<playwright dir> node scripts/td-spine/render-sheets.cjs        # hero idle loops -> public/td/anims
node scripts/upload-to-r2.mjs --prefix td/<folder>                 # upload new files (never overwrites)
```

`window.tdGame` and `window.tdRenderer` available in browser for debugging.

## Known gaps / deferred

Former gaps are now milestones above (M1 to M3); the kill-count quest shipped as the Slayer quest and the landscape layout was re-verified (see archive). Replays were dropped (September 25, 2026).

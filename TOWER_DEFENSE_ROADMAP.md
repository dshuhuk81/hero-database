# Tower Defense Roadmap

Last updated: September 25, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

## What's next (priority order)

Map work is handled separately and archived. Awakening shipped (see archive). Milestones below are ordered by size and risk; each one lists what "done" means. Nothing here is started.

### M1: Mobile landscape layout (large, top priority)

- Goal: the game is playable on a landscape phone without hiding rings, entrances or exits.
- Scope: follow the layout plan in `docs/tower-defense-ui-plan.md` (fit the board to available height, side rails on short screens, no horizontal-scroll HUD).
- Done when: the checklist sizes in that plan pass (667x375 up to 1440x900) plus one real landscape phone with browser chrome visible.

### M2: Kill-count quest decision (small)

- Goal: decide whether the kill-count quest type joins `noLeaks`, `heroSurvival` and `speedClear`, then ship or drop it.
- Scope: confirm the rule and reward with the user first (player-facing gate); if yes, add the type in `sim.js` quest roll, name and text in `page/hud.ts`, and a headless check in `npm run test:tower-defense`.
- Done when: the quest is live and tested, or the idea is recorded as rejected in the archive.

### M3: Level-3 focus choice (unscheduled, conditional)

- Trigger: only start if runs feel samey after Awakening.
- Goal: at hero level 3 the player picks one focus: attack, health or a small range bonus.
- Scope: pick UI, sim stat hook, balance check with `npm run test:td-balance` and `npm run td:sweep` so no focus is a clear best pick.
- Done when: the choice is in the upgrade flow, balance numbers stay inside the current difficulty bands, and the tests cover all three focuses.

### M4: 20-wave and endless mode (medium)

- Goal: longer runs beyond the current wave count; 20-wave mode with a boss every 5th wave, then endless as an extension.
- Scope: wave generator scaling past the current table, boss cadence, mode picker on the start screen, local best score per mode in the existing `td:v1` save.
- Done when: both modes finish a headless sweep without runaway or trivial difficulty, and the save stays backward compatible.

### M5: Replays (medium)

- Goal: watch a finished run again.
- Scope: the sim is already deterministic and seeded, so store seed plus player inputs per run and play them back through `sim.js` and `render.js`; keep the last few runs in local storage.
- Done when: a replay of a recorded run ends with the same score and wave as the original, verified by a headless test.

### M6: Leaderboard (large, needs design first)

- Goal: shared scores across players.
- Blocker: needs an anti-tamper design before any code (see spec section 9); a plain client-submitted score endpoint would be a cheat form. Likely path is a Cloudflare Worker plus D1, ideally validating scores by re-running M5 replays server side.
- Done when: the anti-tamper approach is agreed, then built. Depends on M5.

### M7: New Bosses

- We can add new Motto Immortal Bosses other than only Baphomet.
We have Lilith, Ishtar, Typhoon, Nian Beast, Spirit of the Night Hag. All bosses are listed in `src/data/bosses.json`. 
- Bosse could also have Ultimate Abilities. Those are also listed in there. Currently the bosses dont have that.

## Research notes (September 25, 2026)

**Sprites from game art** (all three options done, September 25, 2026):

1. Hero tokens shipped: `scripts/build-td-tokens.mjs` crops head-and-shoulders cutouts from the full-body hero art on R2 (already transparent, no background removal needed), per-hero crop fixes in `src/data/tdTokenCrops.json`, output `public/td/tokens/{id}-v1.webp`, uploaded to R2 `td/tokens/`. The board draws them with the head overlapping the level ring and a ground shadow; heroes without a token keep the circle portrait.
2. AI enemy sprites: done. Generated with Coplay (`gpt_image_1`, medium quality, transparent background, about $0.04 each; needs a running Unity Editor with the Coplay package, for example `~/android/assetripper/newtry/ExportedProject`; the Gemini provider returned 404). Sources in that project under `Assets/td_sprites/`, sprites uploaded to R2 `td/enemies/sprites/`. Prompts need "entire body visible, wide empty margin" or the subject gets cropped. Prompt template and steps in `src/game/td/sprite-spec-for-ai.md`; `scripts/build-td-enemy-sprites.mjs <folder>` normalizes the images to `public/td/enemies/sprites/{kind}-v1.webp`; the renderer prefers them over portraits (unmasked, ground shadow, faces its direction of travel). Only the 5 enemy kinds and Baphomet are needed.
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

All former gaps are now milestones above (M1, M2, M4 to M7).

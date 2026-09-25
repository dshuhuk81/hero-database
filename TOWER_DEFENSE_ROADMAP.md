# Tower Defense Roadmap

Last updated: September 25, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

## What's next (priority order)

Map work is handled separately and archived. Awakening shipped (see archive). Milestones below are ordered by size and risk; each one lists what "done" means. Nothing here is started.

### M1: Level-3 focus choice (unscheduled, conditional)

- Trigger: only start if runs feel samey after Awakening.
- Goal: at hero level 3 the player picks one focus: attack, health or a small range bonus.
- Scope: pick UI, sim stat hook, balance check with `npm run test:td-balance` and `npm run td:sweep` so no focus is a clear best pick.
- Done when: the choice is in the upgrade flow, balance numbers stay inside the current difficulty bands, and the tests cover all three focuses.

### M2: 20-wave and endless mode (medium)

- Goal: longer runs beyond the current wave count; 20-wave mode with a boss every 5th wave, then endless as an extension.
- Scope: wave generator scaling past the current table, boss cadence, mode picker on the start screen, local best score per mode in the existing `td:v1` save.
- Done when: both modes finish a headless sweep without runaway or trivial difficulty, and the save stays backward compatible.

### M3: Leaderboard (large, needs design first)

- Goal: shared scores across players.
- Blocker: needs an anti-tamper design before any code (see spec section 9); a plain client-submitted score endpoint would be a cheat form. Likely path is a Cloudflare Worker plus D1.
- Done when: the anti-tamper approach is agreed, then built.

### M4: New Bosses (in progress)

- We can add new Motto Immortal Bosses other than only Baphomet.
We have Lilith, Ishtar, Typhoon, Nian Beast, Spirit of the Night Hag. All bosses are listed in `src/data/bosses.json`. 
- Bosse could also have Ultimate Abilities. Those are also listed in there. Currently the bosses dont have that.
- Done (September 25, 2026): boss per map (`tdMaps.json` `"boss"`, default Baphomet). Lilith is the final boss of Verdant Crossing: HP 2600 (Baphomet 2200); Garden of Flesh summons 3 children on entry (HP 600% of her ATK, attack 100%); she cannot be hit while summoning, damage her children take also hits her; Flesh Growth re-summons them at 60% when all have fallen. Config in `tuning.bosses.lilith` and `enemies.brood`. Balance: Verdant wins 13/20 with Lilith vs 15/20 with Baphomet (5 squads x 4 seeds).
- Done (September 25, 2026): Lilith and children sprites (Coplay `gpt_image_1`, sources in the Unity project `Assets/td_sprites/`), built to `boss-lilith-v1.webp` and `brood-v1.webp`, uploaded to R2. Renderer keeps the boss and children above the escort; children have a violet rim and spread ahead of and behind her.
- Open: End of All (children +200% attack speed) as Lilith's ultimate, other bosses.

### M5: Sound variant listening pass (postponed)

- Postponed until all hero sounds are in. The in-game sound files still carry internal game names, so they have to be sorted and renamed by hand first, then 1 attack and 1 ultimate sound picked per hero from about 8 files.
- Goal: every sound variant in `src/game/td/audio.ts` has been heard in a real run and judged OK.
- Scope: play through both maps, trigger each variant, note clipping, volume jumps or repetitive-sounding picks; fix or drop bad variants.
- Done when: each variant is marked verified (or removed), and the known gap is closed.

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

Former gaps are now milestones above (M2, M3, M5); the kill-count quest shipped as the Slayer quest and the landscape layout was re-verified (see archive). Replays were dropped (September 25, 2026).

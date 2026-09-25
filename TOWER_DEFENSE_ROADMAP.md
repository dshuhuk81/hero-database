# Tower Defense Roadmap

Last updated: September 25, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

Map implementation must use the asset assignments in [map.md](map.md), including the prepared Sunscar Ruins art for Map 3.

## What's next (priority order)

Map work is handled separately and archived. Only open work is listed here; done milestones move to the archive. Milestones below are in priority order; each one lists what "done" means.

### M3: Divine Blessings tuning (next)

- The tree itself shipped (archive, [docs/tower-defense-blessings-research.md](docs/tower-defense-blessings-research.md) section 7). This milestone is the follow-up once endless mode exists.
- Goal: full progression is needed somewhere. Today the full tree wins at about 4 to 5x enemy HP while the 10-wave mode runs at 2x.
- Scope: balance bots that buy blessings (so `td:sweep` measures real progression), pacing check (trunk about 128 runs, a class branch 11 to 21 runs with two heroes), endless waves as the power sink, maybe a cap on vertical bonuses. Later, if class branches feel alike: per-hero capstones.
- Done when: a sweep with bought blessings shows endless runs getting longer with progression, and the 10-wave mode is not trivial before about half the trunk.
- Also decide: endless earns Favor per wave with no cap (farmable), left open by M1.

### M4: Leaderboard (large, needs design first)

- Goal: shared scores across players.
- Blocker: needs an anti-tamper design before any code (see spec section 9); a plain client-submitted score endpoint would be a cheat form. Likely path is a Cloudflare Worker plus D1.
- Done when: the anti-tamper approach is agreed, then built.
- Only in Endless Mode maybe?

### M5: Sound variant listening pass (ready for listening)

- Goal: every hero sound (voice on placement, attack, ultimate) has been heard in a real run and judged OK.
- Done when: every hero below is ticked, or a bad file is swapped for another pick from the source folders ([docs/td-hero-audio-map.md](docs/td-hero-audio-map.md)).
- Done by tooling (September 25, 2026):
  - All 21 roster heroes have voice, attack and ultimate in `HERO_SOUNDS` (`audio.ts`); all 63 files exist in `public/td/sfx` and on R2 `td/sfx`.
  - Loudness evened out: `node scripts/td-audio-levels.mjs` measures every file with ffmpeg (EBU R128) and writes per-file gains to `src/data/tdAudioLevels.json` (targets: voice -17, attack -20, ultimate -17 LUFS; boosts capped at -1 dB peak). Before: attacks spread from -15.5 (Bastet, Anubis, Momus) to -22.8 LUFS (Zeus, Caishen). Rerun it after adding or swapping a file.
  - Clipping: 2 to 4 full-scale samples per file at most, not audible.
  - Attack sounds were unthrottled (one per hit, every hero). Now each hero plays at most one attack sound per 0.7 s, and all heroes together at most 4 per second.
- Listen for (things ffmpeg can't judge): wrong character or wrong skill, cut-off starts or ends, and long files that may drag: attacks Fengyi 3.6 s, Phoenix 2.7 s, Medusa 2.3 s, Amunra 2.1 s; ultimates Freya 8.8 s, Set 8.1 s, Momus 7.6 s.
- Quick way: Play, open DBG, `tdGame.gold = 99999`, place heroes, then `tdGame.castUltimate(tdGame.heroes[0], tdGame.enemies[0])` during a wave.
- Checklist (voice / attack / ultimate): amunra, anubis, artemis, bastet, caishen, demeter, diana, fengyi, freya, horus, jormungandr, medusa, momus, nuwa, nyx, phoenix, poseidon, prometheus, set, yuelao, zeus.

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
npm run td:classes              # class identity report (M6 criteria: matrix, class removal, one-class squads)
node scripts/td-audio-levels.mjs                                   # hero sound gains -> src/data/tdAudioLevels.json (needs ffmpeg)
npm run build:game-balance      # regenerate hero balance (re-ranks all heroes)
npm run check                   # astro check (TD code is type-clean; rest of site not yet)

node scripts/build-td-tokens.mjs [--only id] [--sheet out.png]   # board tokens -> public/td/tokens
node scripts/build-td-enemy-sprites.mjs <folder>                   # AI enemy art -> public/td/enemies/sprites
PW=<playwright dir> node scripts/td-spine/render-sheets.cjs        # hero idle loops -> public/td/anims
node scripts/upload-to-r2.mjs --prefix td/<folder>                 # upload new files (never overwrites)
```

`window.tdGame` and `window.tdRenderer` available in browser for debugging.

## Known gaps / deferred

Replays were dropped (September 25, 2026). Open items left by archived milestones:

- M6 criterion 2: the mixed squad does as well without Warriors (endless 28.5 vs 28.0). Give Warriors something only they do in full runs, e.g. more swarm pressure, or cleave that also hits enemies held by neighbouring blockers. Check with `npm run td:classes`.
- M6 criterion 3: three Mages alone win Verdant on every seed; Verdant is the easiest map for every squad and needs its own tuning.

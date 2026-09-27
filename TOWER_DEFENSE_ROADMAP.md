# Tower Defense Roadmap

Last updated: September 27, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

Map implementation must use the asset assignments in [map.md](map.md), including the prepared Sunscar Ruins art for Map 3.

## What's next (priority order)

Map work is handled separately and archived. Only open work is listed here; done milestones move to the archive. Milestones below are in priority order; each one lists what "done" means.

## Use subagents for tackling more than one task

Use subagents for doing more than 1 milestone. Coordinate well when changing files though.

Deferred (P3, not needed yet): prestige/Ascension reset (only once players hit the end of the blessing tree), map editor (non-goal in spec section 1).

### M23: Tutorial Stage (skip)

- We should have a tutorial stage where players get an onboarding into all our mechanics and game play. that should cover minimalistic stages with the most important topics to deal in an onboarding scenario like most gacha or tower defense games do. we have to define what we want to do and what should be displayed. most apps just create simple scenarios with tooltips that pause the game and players need to follow a tutorial.
- players should be introduced to basic mechanics, status effects
upgrades and such.

### M24 leftovers (white label)
- Enemy sprites done (archive "M24 leftovers"). Open for the owner:
  - Delete the unused local files (list in `TOWER_DEFENSE_WHITELABEL_AUDIT.md` item 8: `public/td/sprite.png`, `spritePlatform.png`, `spriteRoad.png`, `bg/*.png` and the replaced enemy sprites); the agent was not allowed to delete them.
  - Decide on `public/td/sprite_backgrounds.png` (9 painted landscapes, origin unknown, unused).
  - Promo thumbnail `public/td/promotional/motto-tower-defense-youtube-v1.*` says "MOTTO TOWER DEFENSE" and shows the game's Zeus and Lilith: replace or delete.
  - Old R2 keys nothing loads: list in audit item 8.

### M24c - New Effects due to hero change
- we should render new effects for our heroes after we swapped them.
- check what kind of hero we have, then look what we can do with a solid type of effect in the game
- if a hero uses lightning, the lightning should look good
- if a hero uses poison, we should see poison bubbles happening
- i dont want any "just straight line as damage" anymore in the game
- Progress (Sep 27): done in a first pass. New pooled effect kit (`fx-kit.js`) plus status visuals (`status-fx.js`); every hero has a themed attack, impact and ultimate for its mythic identity (table in `TOWER_DEFENSE_HERO_SKILLS.md`); Odin's lightning forks and re-strikes with a rune circle ultimate; poison bubbles, burn flames, chill frost, wet drips and a frozen ice shell show on enemies; all tracer lines (hero shots, enemy shots, hexes, dashes, heal beams) replaced by travelling projectiles, arcs and curved flows. Open: Ymir shows Burn although he is a frost giant (tuning decision).

### M25: Leaderboard (large, needs design first - skip)

- Goal: shared scores across players.
- Blocker: needs an anti-tamper design before any code (see spec section 9); a plain client-submitted score endpoint would be a cheat form. Likely path is a Cloudflare Worker plus D1.
- Done when: the anti-tamper approach is agreed, then built.
- Only in Endless Mode maybe?

### M26: Campaign (next sprints)

Concept: `TOWER_DEFENSE_NEXT_STEPS.md`. Sprints 0-8 are done (archive "Roadmap M26 sprints 0-8": 10-stage Chapter 1, squads of 4, Gold / Hero XP / Divine Seals, hero levels, one summon banner).
- Sprint 9: duplicates and ranks (summons can return owned heroes; copies raise rank 1-3).
- Sprint 10: stars per stage and chapter milestones (replay reasons).
- Sprint 11: quests (only once enough systems exist to reference).
- Open balance points from sprints 7-8:
  - Tanks do worst in 4-hero squads on late stages (Gaia 1/14 winning squads on 1-9, Atlas 2/13 on 1-10).
  - 1-9 and 1-10 react strongly to enemy health (1-10: hpScale 0.64 -> 0.69 moved bot wins 49% -> 26%); about 10 points above the test's 20% floor.
  - Chapter 1 pays 600 Divine Seals = 6 of the 10 summonable heroes; the rest need a Chapter 2 or other seal sources.
  - Play time about 65 minutes of winning bot play, over the concept's 30-60; 1-10 alone takes 10-12 minutes.

  ### M27a: Menu design
  - Most menues are really boring to watch. We have a really nice looking main menu screen at the moment. But all screen within a game mode looks like a text menu. 
  - campaign should also have cards. summon is only a button. rethink and restructure this.

  ### M27b: Rethink Summon Mode
  - summon should be as to when a user requires to have x amount of a material to summon 1 hero, and XX amound of material to do a 10 pull summon.
  - summons should contain not good heroes (60% chance of dropping), medium heroes (38%) and the best heroes (2%) chance. 
  - for this we might require more heroes and put them to qualities like: common, rare and epic heroes.

### M99: Login/Register
- what would we need to provide auth / login / register to dave players progress ? gmail auth ? apple auth ?
- goal: all achieved things from players should be saved
- if requirements are too large or harsh (for a free environment), we skip this entirely.

## Research notes (September 25, 2026)

Superseded September 27, 2026 (M24 white label): the database tokens, Spine idle loops and their scripts below were removed from the game; heroes now use the mythic skin (see the white-label audit). Kept here as history.

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

node scripts/build-td-grid.mjs [--check]                            # placement tiles -> tdMaps.json (after route / grid block edits)
node scripts/build-td-enemy-sprites.mjs <folder>                   # AI enemy art -> public/td/enemies/sprites
python3 scripts/td-idle-anim.py <portrait> <id> <outdir>           # hero idle loop sheet -> public/td/heroes-alt/anims
node scripts/upload-to-r2.mjs --prefix td/<folder>                 # upload new files (never overwrites)
```

`window.tdGame` and `window.tdRenderer` available in browser for debugging.

## Known gaps / deferred

Replays were dropped (September 25, 2026). Open items left by archived milestones:

- M22b (tiles + deploy cap 7): Free Play runs are easier than with the old rings (20 waves 4/5 wins vs 2/5; all-platform squads now win). Retune enemy health with `npm run td:sweep` or lower the cap if that is too much.

- M6 criterion 2: closed September 25, 2026 by the Support change below (endless without Warriors 16.3 vs 20.7 with them). Without Tanks is still close (20.3); check with `npm run td:classes`.
- M6 criterion 3: three Mages alone win Verdant on every seed; Verdant is the easiest map for every squad and needs its own tuning.

**Player feedback (September 25, 2026):**

- "Can't stop these enemies": they were flyers, which pass over blockers by design but looked like ground units. Flyers now hover above a faint shadow and bob, and the first flyer wave of a run says that only platform heroes can hit them. Rule unchanged.
- "Support heals too strong, range too big": Support range 220 -> 170 (just above Mages, below Archers), heal per attack 3x -> 1.8x attack (Caishen about 93 -> 56 health per second). Mixed squad endless 24.2 -> 20.7; Supports still count (without them 19.7).

# Tower Defense Roadmap

Last updated: September 26, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

Map implementation must use the asset assignments in [map.md](map.md), including the prepared Sunscar Ruins art for Map 3.

## What's next (priority order)

Map work is handled separately and archived. Only open work is listed here; done milestones move to the archive. Milestones below are in priority order; each one lists what "done" means.

## Use subagents for tackling more than one task

Use subagents for doing more than 1 milestone. Coordinate well when changing files though.

### M19: Daily Trial (gap check, P2)

- [ ] Fixed daily setup from the date as seed: map, 3 to 5 allowed heroes, 2 modifiers, goal (for example reach wave 30). Fully client side; local best per day.
- [ ] Later shares the M4 leaderboard (same setup for everyone makes scores comparable).

### M20: Challenge goals per map (gap check, P2)

- [ ] Optional goals per map and mode: perfect defense (no lives lost), limited roster (max 3 heroes), one class only, no upgrades, speed clear, finish with X gold. Show as badges on the map card.
- Reuse the achievement and quest code where possible.

### M21: Expedition mode (gap check, P3)

- [ ] Roguelite chain of maps: start with 3 random heroes, after each map choose new hero, relic or upgrade. Needs M13 and M17 first so relics have mechanics to build on.

Deferred (P3, not needed yet): prestige/Ascension reset (only once players hit the end of the blessing tree), map editor (non-goal in spec section 1).

### M4: Leaderboard (large, needs design first)

- Goal: shared scores across players.
- Blocker: needs an anti-tamper design before any code (see spec section 9); a plain client-submitted score endpoint would be a cheat form. Likely path is a Cloudflare Worker plus D1.
- Done when: the anti-tamper approach is agreed, then built.
- Only in Endless Mode maybe?


### M22: Bugs or UI Changes

- We should check some menue items for bad ux or visual style. for example when i select a hero on the battlefield: currently a flyout opens (or a dialog) at the place where the hero is. it would be much better to have a sidebar with full height coming from the right where all the info is in. that way more space could be filled and a dialog also has ux issues.
- button alignment: some buttons are just underneath vertically aligned. that takes a lot of vertical space. why not bring them next to each other.
- font size and readability. sometimes we should be more compact in font size, sometimes elements are too small. there should be an audit regarding that to get more content in the screen but also to ehnance readability at the same time.
- in endless mode the boss announcement says: "FINAL BOSS" which is not correct. this only applies to the maybe 10-wave or 20-wave variants where the boss appears on the last wave. 
- Menu structure and placenement of buttons before we start a game should feel more like an app. a specific area where everything happens. button logic, navigational structure, everything should feel like as if players are in an app. 
e.g. main menu screen -> start game, action 2, action 3 ->
select map -> select difficulty -> game begins.
No different area like on a website, area 1 = maps, area 2 underneath = buttons. remove header and footer.
- Victory Screen: A lot of content. Needs an UI overhaul and optimized. Maybe fullscreen on the whole map (app view area)

### M22b: Hero Placement
- maybe we should add more placement tiles where we can put heroes on? next to the road possible on each tile?

### M23: Tutorial Stage

We should have a tutorial stage where players get an onboarding into all our mechanics and game play. that should cover minimalistic stages with the most importan topics to deal in an onboarding scenario like most gacha or tower defense games do. we have to define what we want to do and what should be displayed. most apps just create simple scenarios with tooltips that pause the game and players need to follow a tutorial.

### M24: White label (only if game base is solid - not before)

- due to copyright issues we should make a plan to replace all content that is under copyright from MOTTO IMMORTAL and GOAT GAMES with new AI generated content. Images, text, skills or anything that is directly from the game. We should make an audit that if we need to replace that content, we should be ready.
- new hero art is in `/Users/daschultheiss/hero-database/public/td/heroes-alt` xor `/Users/daschultheiss/hero-database/public/td/heroes-alt/review-set-v1`
- new heroes (text, skills) defined in `TOWER_DEFENSE_MYTHIC_HEROES.md`
- we use AI sprites created, maybe we need to do them for all heroes. also all skills and effects need to adapt to the new heroes as well.
- White label documentation: `TOWER_DEFENSE_WHITELABEL_PLAN.md`

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

- M6 criterion 2: closed September 25, 2026 by the Support change below (endless without Warriors 16.3 vs 20.7 with them). Without Tanks is still close (20.3); check with `npm run td:classes`.
- M6 criterion 3: three Mages alone win Verdant on every seed; Verdant is the easiest map for every squad and needs its own tuning.

**Player feedback (September 25, 2026):**

- "Can't stop these enemies": they were flyers, which pass over blockers by design but looked like ground units. Flyers now hover above a faint shadow and bob, and the first flyer wave of a run says that only platform heroes can hit them. Rule unchanged.
- "Support heals too strong, range too big": Support range 220 -> 170 (just above Mages, below Archers), heal per attack 3x -> 1.8x attack (Caishen about 93 -> 56 health per second). Mixed squad endless 24.2 -> 20.7; Supports still count (without them 19.7).

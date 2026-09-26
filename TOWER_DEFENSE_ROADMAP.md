# Tower Defense Roadmap

Last updated: September 26, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

Map implementation must use the asset assignments in [map.md](map.md), including the prepared Sunscar Ruins art for Map 3.

## What's next (priority order)

Map work is handled separately and archived. Only open work is listed here; done milestones move to the archive. Milestones below are in priority order; each one lists what "done" means.

## Use subagents for tackling more than one task

Use subagents for doing more than 1 milestone. Coordinate well when changing files though.

Deferred (P3, not needed yet): prestige/Ascension reset (only once players hit the end of the blessing tree), map editor (non-goal in spec section 1).

### M22: Bugs or UI Changes

- We should check some menue items for bad ux or visual style. for example when i select a hero on the battlefield: currently a flyout opens (or a dialog) at the place where the hero is. it would be much better to have a sidebar with full height coming from the right where all the info is in. that way more space could be filled and a dialog also has ux issues.
- button alignment: some buttons are just underneath vertically aligned. that takes a lot of vertical space. why not bring them next to each other.
- font size and readability. sometimes we should be more compact in font size, sometimes elements are too small. there should be an audit regarding that to get more content in the screen but also to ehnance readability at the same time.
- in endless mode the boss announcement says: "FINAL BOSS" which is not correct. this only applies to the maybe 10-wave or 20-wave variants where the boss appears on the last wave.
  - Fixed (September 26, 2026): the boss nameplate says "Final wave" only on the last wave of a 10 or 20 wave run; endless and earlier bosses show "Boss - wave N". Also fixed: on phones the top bar's Wave stat ran under the buttons; stats keep their width, buttons are 38 px (34 px at 380 px and below), and the Daily Trial goal stat hides up to 420 px. Checked at 360, 390 and 430 px wide without overlap.
- Menu structure and placenement of buttons before we start a game should feel more like an app. a specific area where everything happens. button logic, navigational structure, everything should feel like as if players are in an app. 
e.g. main menu screen -> start game, action 2, action 3 ->
select map -> select difficulty -> game begins.
No different area like on a website, area 1 = maps, area 2 underneath = buttons. remove header and footer. use full width and height of the browser. check navigation.
- Victory Screen: A lot of content. Needs an UI overhaul and optimized. Maybe fullscreen on the whole map (app view area)

#### M22 plan (September 26, 2026)

Today the lobby is one scrolling web page (title block, map cards, a button row, Daily Trial and Expedition cards stacked below). Blessings, help and save open as modal panels, the hero info is a popover next to the hero, and the result screen is a long modal. The plan turns this into an app: one screen at a time, full viewport, clear back navigation.

**Phase A - App shell and navigation** (largest; do first, alone, since it touches the page wiring and most of `td.css`)
- [ ] Full-viewport shell (`100dvh`, no page scroll): an app bar on every menu screen (back button, screen title, Favor chip, settings) and one content area.
- [ ] Screens, one visible at a time, with a small navigation stack and browser Back support (history state):
  1. Main menu: Play, Daily Trial, Expedition, Divine Blessings, Glossary, How to play, Settings (save data, sound, about and the disclaimer), Exit to database. Shows Favor and personal best.
  2. Play -> Map select: the map cards (art, boss, challenge badges, bests), one selected, Next.
  3. Difficulty and run length: today's "mode" panel as a screen (tiers, lengths, challenge list), Start.
  4. Daily Trial and Expedition each get their own screen (today's cards moved there).
  5. Divine Blessings, How to play, Save data become full screens instead of modals.
  6. Game screen: unchanged; Menu returns to the main menu.
- [ ] Remove the web-page title block and the lobby button row; the disclaimer moves to Settings / About.
- [ ] Keyboard and focus: every screen has a focus target, Escape and Back go one screen back.
- Done when: every current feature is reachable from the main menu in at most 3 taps, no screen scrolls the page body (only inner lists), and it works at 390x844, 844x390 and 1440x900.

**Phase B - Hero panel as a sidebar** (after A; can run in parallel with C)
- [ ] Selecting a hero opens a full-height panel from the right (landscape and desktop) or a bottom sheet (portrait phones) instead of the popover. The map stays visible and the hero is not covered.
- [ ] Content in sections: header (portrait, name, class, level, path), health, stats, Target icons, Upgrade (focus / path / Awaken / Train pickers inline), Details; actions Rotate / Sell side by side.
- Done when: the selected hero is never under the panel at the three test sizes, and all popover actions work from the panel.

**Phase C - Result screen overhaul** (after A; can run in parallel with B)
- [ ] Full-stage overlay over the map area, not a centered modal: header (outcome, map, tier, score), sections or tabs Summary (key stats, Favor, shard pick, challenges), Battle (damage table, what went wrong), and fixed bottom actions (Retry or Continue, Blessings, Main menu).
- Done when: nothing on the result screen needs page scrolling at 1440x900; on phones only the section content scrolls.

**Phase D - Buttons and type audit** (last; touches everything lightly)
- [ ] Button groups side by side instead of stacked where space allows (popover actions, result actions, panels).
- [ ] Type scale for the game: body text at least 13 px on phones, labels at least 11 px; one size set per role (screen title, section title, body, label, number). Audit every screen at the three sizes and fix outliers.
- Done when: an audit table (screen x size) shows no text below the minimum and no stacked button pairs that fit side by side.

Decisions (owner, September 26, 2026):
- Main menu: one large Play button, then Daily Trial and Expedition as cards, then a row of smaller buttons (Blessings, Glossary, How to play, Settings, Exit to database).
- Hero panel: the game keeps running while it is open (no automatic pause).
- Glossary: becomes an in-app screen with back navigation; the separate page stays for search engines.
- Map select and difficulty / run length: two steps.

### M22b: Hero Placement
- maybe we should add more placement tiles where we can put heroes on? next to the road possible on each tile?
- that would require to maybe add another placement tile graphically since a lot of round tiles next to each other looks quite strange.

### M23: Tutorial Stage

- We should have a tutorial stage where players get an onboarding into all our mechanics and game play. that should cover minimalistic stages with the most important topics to deal in an onboarding scenario like most gacha or tower defense games do. we have to define what we want to do and what should be displayed. most apps just create simple scenarios with tooltips that pause the game and players need to follow a tutorial.
- players should be introduced to basic mechanics, status effects
upgrades and such.

### M24: White label (only if game base is solid - not before)

due to copyright issues we should make a plan to replace all content that is under copyright from MOTTO IMMORTAL and GOAT GAMES with new AI generated content. Images, text, skills or anything that is directly from the game. We should make an audit that if we need to replace that content, we should be ready.
- plan: White label documentation: `TOWER_DEFENSE_WHITELABEL_PLAN.md`
- new hero art is in `/Users/daschultheiss/hero-database/public/td/heroes-alt` xor `/Users/daschultheiss/hero-database/public/td/heroes-alt/review-set-v1`
- new heroes (text, skills) defined in `TOWER_DEFENSE_MYTHIC_HEROES.md`
- we use AI sprites created, maybe we need to do them for all heroes. also all skills and effects need to adapt to the new heroes as well.


### M25: Leaderboard (large, needs design first)

- Goal: shared scores across players.
- Blocker: needs an anti-tamper design before any code (see spec section 9); a plain client-submitted score endpoint would be a cheat form. Likely path is a Cloudflare Worker plus D1.
- Done when: the anti-tamper approach is agreed, then built.
- Only in Endless Mode maybe?

### M26: Login/Register
- what would we need to provide auth / login / register to dave players progress ? gmail auth ? apple auth ?


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

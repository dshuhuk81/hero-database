# Tower Defense Roadmap

Last updated: September 26, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

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

### M24: White label (only if game base is solid - not before)

due to copyright issues we should make a plan to replace all content that is under copyright from MOTTO IMMORTAL and GOAT GAMES with new AI generated content. Images, text, skills or anything that is directly from the game. We should make an audit that if we need to replace that content, we should be ready.
- plan: White label documentation: `TOWER_DEFENSE_WHITELABEL_PLAN.md`
- audit (September 27, 2026): `TOWER_DEFENSE_WHITELABEL_AUDIT.md` - full inventory of game content in the TD game, readiness per area, a one-switch skin plan, work order and owner decisions.
- progress (September 27, 2026): switched. The game always uses the mythic roster (art approved), generated hero sounds (v3), idle loops from the portraits (test), CC0 music, renamed blessings; database hero sounds, Spine loops, tokens and extraction scripts removed. Left: class icons, enemy sprite review, leftover fallback files. Status section in the audit.
- new hero art is in `/Users/daschultheiss/hero-database/public/td/heroes-alt` xor `/Users/daschultheiss/hero-database/public/td/heroes-alt/review-set-v1`
- new heroes (text, skills) defined in `TOWER_DEFENSE_MYTHIC_HEROES.md`

### M24b - New sounds
- i downloaded a bunch of sound effects that we can try and swap out here:
`/Users/daschultheiss/hero-database/public/td/newFx``
check what we can use its a mix of all kinds of sounds.
- Done (September 27, 2026): hero sounds v4 from these packs (swords, stabs, spells, heals, coins), archers keep the generated sounds (no bow sounds in the packs); interface and combat sounds (hits, block, select, place, upgrade, wave clear, error) from the Tactical Interface pack. Mapping and licenses in `public/td/sfx/CREDITS-mythic.txt`. The original packs and the class icon sources were moved out of the site build to `~/hero-database-assets/td/` (`newFx`, `newArt`): their licenses forbid redistributing the standalone files.

### M24c - New Effects due to hero change
- we should render new effects for our heroes after we swapped them.
- check what kind of hero we have, then look what we can do with a solid type of effect in the game
- if a hero uses lightning, the lightning should look good
- if a hero uses poison, we should see poison bubbles happening
- i dont want any "just straight line as damage" anymore in the game

### M25: Leaderboard (large, needs design first - skip)

- Goal: shared scores across players.
- Blocker: needs an anti-tamper design before any code (see spec section 9); a plain client-submitted score endpoint would be a cheat form. Likely path is a Cloudflare Worker plus D1.
- Done when: the anti-tamper approach is agreed, then built.
- Only in Endless Mode maybe?

### M26: New Game Mode

- New Game mode should be planned. All exiting levels could be moved to "Free Play".
Game Start -> Chose between A) CAmpaign (New) and b) Free Play.
Campaign will require a lot of new concept thinking.
- a concept is written here. look for further information in:
`TOWER_DEFENSE_NEXT_STEPS.md`
- Sprints 0-3 done (September 27, 2026): Home has Campaign and Free Play; Campaign screen (Chapter 1, stages 1-1 First Watch on Moonlit, 1-2 The Green Road on Verdant, 1-3 Sunscar Stand on Sunscar, locked until the previous one is cleared); Squad screen (up to 4 owned heroes); stage data in `src/data/tdCampaign.json` (map, own waves, lives, enemy health, generic rewards list); rules in `src/game/td/campaign.js`, page in `src/game/td/page/campaign.ts`; progress in the save's own versioned `campaign` section (owned heroes, clears with best lives, last squad), exported with the save code. Owner decision: not all heroes at once, so a later summon has something to give: 6 starters (one per class, weaker tiers), each first clear unlocks one hero (1-1 Skadi, 1-2 Atlas, 1-3 Odin), 12 stay locked. No Divine Blessings and no Favor in campaign stages. Balance (bot, every 4-hero squad from the heroes owned by then): 1-1 all squads win, 1-2 16/35, 1-3 31/70; `scripts/test-td-campaign.mjs` fails if a stage drops below 20%. Tanks do worst in 4-hero squads (Gaia 30% on 1-3). Next per the concept: rewards/currencies, hero levels, the 10-stage Chapter 1, then summoning.
- Sprints 4-6 done (September 27, 2026): generic rewards (`{ type: "currency" | "hero", ... }`) with two currencies, Gold and Hero XP (Divine Seals wait for summoning); first clear pays the stage's rewards (1-1: 200 Gold, 100 XP; 1-2: 300/150; 1-3: 400/200, plus the hero), a replay 25% of the currencies (`repeatShare`). Heroes screen (Campaign -> Heroes): hero levels 1-10, +6% attack and health per level in campaign stages only (`heroLevels` in tdCampaign.json; cost 100 Gold + 50 XP, +50/+25 per level), applied by scaling the run's hero list (`campaignHeroes`), no sim change. Campaign save v2 (currencies, levels); v1 saves migrate and are paid the first-clear currencies of stages they had cleared. Effect (bot, every 4-hero squad on 1-3): all level 1: 31/70 win, level 2: 41/70, level 5: 48/70. Next: the 10-stage Chapter 1, then summoning.
- Sprint 7 done (September 27, 2026): Chapter 1 "The Road to the Crossing" has 10 stages (79 waves, about 65 minutes of bot play time for first clears), each introducing one or two enemy mechanics: 1-1 First Watch (Moonlit; grunts, runners), 1-2 The Green Road (Verdant; flyers), 1-3 Iron Hides (Moonlit; brutes, menders), 1-4 Shield Wall (Verdant; shieldbearers, archers), 1-5 The Horned Warden (Moonlit; Baphomet, mid-chapter boss), 1-6 Hexfire (Verdant; hexers), 1-7 Two Gates (Sunscar; two lanes), 1-8 Brood Hollow (Verdant; broodcallers), 1-9 Eve of the Crossing (Sunscar; everything mixed), 1-10 The Crossing (Verdant; Lilith, final boss). First clears pay 200..1100 Gold, 100..550 Hero XP and 50 Divine Seals (100 on 1-5 and 1-10); reward heroes 1-1 Skadi, 1-2 Atlas, 1-3 Odin, 1-5 Plutus (caishen), 1-10 Aegir (poseidon), the rest stay summon-only. Balance (bot, up to 35 sampled 4-hero squads per stage from the heroes owned by then, levels bought evenly with the first-clear currencies so far, level 1 up to 4-5 by 1-10): 1-1 15/15, 1-2 20/35, 1-3 19/35, 1-4 20/35, 1-5 11/35, 1-6 17/35, 1-7 14/35, 1-8 15/35, 1-9 12/35, 1-10 10/35; `scripts/test-td-campaign.mjs` checks all 10 at those levels (fails below 20%, about 35 s). Tanks (Demeter, Atlas) do worst in 4-hero squads on late stages.
- Sprint 8 done (September 27, 2026): smallest summoning. Third currency Divine Seals (first clears only, replays pay none), one banner "Call to the Crossing" in `src/data/tdSummon.json` (100 Divine Seals, pool = every hero not owned yet, uniform, so a summon is always a new hero; no duplicates, ten-pulls or pity yet). Rules `summonPool`, `canSummon`, `summon` in `campaign.js` (rng injectable, `summons` count kept for later pity); Summon screen from the Campaign footer (banner, cost, wallet, heroes left, one button, reveal card with portrait, name, title, class and a Build squad link); the hero is usable in Squad and Heroes right away. Campaign save v3 (+ summons); v2 saves are paid the Divine Seals of stages they had cleared once, v1 saves all first-clear currencies once. Tests: `scripts/test-td-summon.mjs`. Open: the pool includes heroes that stages still give as first-clear rewards, so a summon can take a later stage's hero (that stage then pays only currencies). Pool rule (September 27, 2026): heroes that a stage gives on its first clear (Skadi, Atlas, Odin, Plutus, Aegir) are not summonable (`stageRewardHeroes`), so a summon never takes a stage reward; the banner holds the other 10 heroes. Next per the concept: duplicates and ranks (sprint 9), stars and milestones (10), quests (11).

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

- M6 criterion 2: closed September 25, 2026 by the Support change below (endless without Warriors 16.3 vs 20.7 with them). Without Tanks is still close (20.3); check with `npm run td:classes`.
- M6 criterion 3: three Mages alone win Verdant on every seed; Verdant is the easiest map for every squad and needs its own tuning.

**Player feedback (September 25, 2026):**

- "Can't stop these enemies": they were flyers, which pass over blockers by design but looked like ground units. Flyers now hover above a faint shadow and bob, and the first flyer wave of a run says that only platform heroes can hit them. Rule unchanged.
- "Support heals too strong, range too big": Support range 220 -> 170 (just above Mages, below Archers), heal per attack 3x -> 1.8x attack (Caishen about 93 -> 56 health per second). Mixed squad endless 24.2 -> 20.7; Supports still count (without them 19.7).

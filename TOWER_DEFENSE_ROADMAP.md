# Tower Defense Roadmap

Last updated: September 26, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

Map implementation must use the asset assignments in [map.md](map.md), including the prepared Sunscar Ruins art for Map 3.

## What's next (priority order)

Map work is handled separately and archived. Only open work is listed here; done milestones move to the archive. Milestones below are in priority order; each one lists what "done" means.

## Use subagents for tackling more than one task

Coordinate well when changing files though.

### M14: Run statistics and "what went wrong" (gap check, P1)

The result screen shows MVP by kills, duration, gold, quests, Insight. No damage numbers.
- [ ] Track damage per hero in the sim (total, boss damage, splash/chain share, heal done, buff contribution).
- [ ] Result screen: damage table per hero.
- [ ] Loss screen: leaks by enemy kind for the last wave plus a one-line hint (for example "Most leaks were flyers: add platform heroes").
- Done when: every run end shows per-hero damage and a loss names the enemy kind that leaked most.

### M3: Divine Blessings tuning (next)

- The tree itself shipped (archive, [docs/tower-defense-blessings-research.md](docs/tower-defense-blessings-research.md) section 7). This milestone is the follow-up once endless mode exists.
- Goal: full progression is needed somewhere. Today the full tree wins at about 4 to 5x enemy HP while the 10-wave mode runs at 2x.
- Scope: balance bots that buy blessings (so `td:sweep` measures real progression), pacing check (trunk about 128 runs, a class branch 11 to 21 runs with two heroes), endless waves as the power sink, maybe a cap on vertical bonuses. Later, if class branches feel alike: per-hero capstones.
- Done when: a sweep with bought blessings shows endless runs getting longer with progression, and the 10-wave mode is not trivial before about half the trunk.
- Also decide: endless earns Favor per wave with no cap (farmable), left open by M1.
- [ ] Gap check (September 26, 2026): about 85% of the 74 blessing nodes are percentage bonuses (atk, aps, hp, range, ultCharge, ultPower). Findings suggest roughly 30% numbers / 70% new mechanics. When tuning, turn some nodes into unlocks (for example a new targeting mode, a status effect, a second level-3 branch, an extra run blessing offer) instead of more percentages.

### M15: Endless mutators (gap check, P1)

Endless ramps HP and attack by 8% per wave from wave 21 and adds a boss every 5 waves. Nothing else changes.
- [ ] Every 10 waves offer 3 mutators, pick 1 (for example enemy HP +30% for Favor +20%, enemy speed +15% for Favor +30%, elite enemies for Favor +50%). This also answers the open "Favor per wave with no cap" question in M3.
- [ ] Elite variant of each enemy kind (bigger, one extra trait such as shield or regen).
- Done when: endless runs show a mutator pick every 10 waves and the chosen mutators are saved with the best score.

### M16: Map mechanics (gap check, P1, with the separate map work)

Rings are all equal today; maps differ only by path and boss.
- [ ] Special rings: high ground (+range), shrine (+ult charge), cursed ring (+damage, -attack speed).
- [ ] Hand to the map owner as a spec; the sim needs a per-ring modifier field in `tdMaps.json`.
- Done when: each map has at least one special ring and the recruit sheet shows its effect.

### M17: Run blessings with mechanics (gap check, P2)

The between-wave pick already offers 3 choose 1 (good), but all 12 virtue effects are stats (atk, res, hp, heal, regen, crit, dodge).
- [ ] Add rarity tiers: common stat blessings stay, rare and epic blessings change mechanics (for example "chain lightning can stun", "Wet enemies explode on death", "Tanks' hold also pulls enemies"). Tie them to M13 statuses and deployed heroes so the offer fits the team.
- Done when: rare or epic offers appear in most runs and bots show no single blessing dominating.

### M18: Bosses that change rules (gap check, P2)

Lilith changes rules (untargetable while summoning, shared damage). Baphomet is stats only.
- [ ] Give Baphomet a rule mechanic, for example every 15 s it silences the hero that dealt the most damage (rewards spreading damage). Needs M14 damage tracking. Ask the owner before adding anything that disables heroes.
- [ ] Lilith's missing "End of All" (children +200% attack speed).
- [ ] Future bosses (one per new map) each get one rule, not only more HP.

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

### M22: Bugs or UI Changes

- We should check some menue items for bad ux or visual style. for example when i select a hero on the battlefield: currently a flyout opens (or a dialog) at the place where the hero is. it would be much better to have a sidebar with full height coming from the right where all the info is in. that way more space could be filled and a dialog also has ux issues.
- button alignment: some buttons are just underneath vertically aligned. that takes a lot of y space. why not bring them next to each other.
- font size and readability. sometimes we should be more compact in font size, sometimes elements are too small. there should be an audit regarding that to get more content in the screen but also to ehnance readability at the same time.

### M23: Tutorial Stage

We should have a tutorial stage where players get an onboarding into all our mechanics and game play. that should cover minimalistic stages with the most importan topics to deal in an onboarding scenario like most gacha or tower defense games do. we have to define what we want to do and what should be displayed. most apps just create simple scenarios with tooltips that pause the game and players need to follow a tutorial.

### M24: White label (only if game base is solid - not before)

- due to copyright issues we should make a plan to replace all content that is under copyright from MOTTO IMMORTAL and GOAT GAMES with new AI generated content. Images, text, skills or anything that is directly from the game. We should make an audit that if we need to replace that content, we should be ready.
- new hero art is in `/Users/daschultheiss/hero-database/public/td/heroes-alt`
- new heroes defined in `TOWER_DEFENSE_MYTHIC_HEROES.md`
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

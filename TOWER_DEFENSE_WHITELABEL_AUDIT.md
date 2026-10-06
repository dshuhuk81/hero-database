# Tower Defense: White-Label Audit

Audit date: September 27, 2026 (roadmap M24). Scope: everything the Tower Defense game (`/games/tower-defense`, `src/game/td`, `src/components/td`, `public/td`, R2 `td/`) shows or plays that comes from Motto Immortal / GOAT Games. The rest of the fan database is out of scope.

## Status (September 27, 2026): switched

The game now always uses the mythic roster; the database look is gone from the TD code.

- **Skin** (`src/game/td/skin.js`, `src/data/tdSkinMythic.json`): name, title, portrait (`td/heroes-alt/{id}-thumb-96` / `-card-240`), board token (`-token-192`), idle loop, sounds and ultimate name for all 21 heroes, applied in `src/pages/games/tower-defense.astro` and `TdGlossaryContent.astro`. Art approved by the owner. `scripts/test-td-skin.mjs` checks coverage, that only display fields change, that every file exists, and that no TD source loads database hero, token, animation or boss art.
- **Removed**: database hero sounds (63 files, `HERO_SOUNDS`, `add-hero-audio.js` and its test), Spine idle loops (`public/td/anims`, `tdHeroAnims.json`, `scripts/td-spine/`), board tokens cut from database art (`public/td/tokens`, `build-td-tokens.mjs`, `tdTokenCrops.json`), legacy enemy head portraits, the world map, the boss portrait and faction. R2 still holds the old files under their old keys; nothing loads them.
- **Hero sounds v4** (M24b): picked per hero from the owner's packs (Hove Audio sword combat, Mixkit, Tactical Interface SFX; originals in `~/hero-database-assets/td/newFx`, outside the repo), archers and five ultimates keep the generated v3 sounds (no bow sounds in the packs); `public/td/sfx/mythic-{id}-v4_{kind}.ogg`, sources per file in `public/td/sfx/CREDITS-mythic.txt`. Interface and combat sounds (hits, block, select, place, upgrade, wave clear, error) replaced the Kenney set: `ui-*-v1.ogg`. To replace sounds: new files under a new version, bump `SOUND_VERSION` in `skin.js`, run `node scripts/td-audio-levels.mjs`.
- **Class icons**: the owner's glyphs (sources in `~/hero-database-assets/td/newArt`, outside the repo) as `td/icons/classes/{class}-v1.webp`; the game no longer loads anything from the database.
- **Idle loops (test)**: `scripts/td-idle-anim.py` warps the static portrait (feet pinned, sway, breathing, cloth ripple) into the recruit preview's 24-frame sheet, `td/heroes-alt/anims/{id}-idle-v1.webp`, all 21 wired.
- **Music**: CC0 tracks (`public/td/music/CREDITS.txt`). **Blessings**: renamed, no hero names.
- **Branding**: page title "The Last Crossing | Tower Defense", new descriptions; About and Glossary disclaimers now say the game is not affiliated with GOAT Games or Motto Immortal.

- **Enemy sprites** (M24 leftovers): all five enemy kinds read as the game's monsters (same creature and palette) and were regenerated from text-only prompts (grunt draugr, runner underworld hound, flyer Stymphalian bird, archer satyr, brute armored troll: `{kind}-v2.webp`). Lilith `boss-lilith-v2` was the game's own boss art with the background removed and her brood `brood-v2` a repaint of the game's 3D model: both replaced (`-v3`, night demoness with owl wings and serpent, lilin night spirits). Kept: Baphomet `boss-v1`, `brood-v1` (broodcaller), `boss-lilith-v1` (hexer), which do not follow the game's designs. Versions live in `ENEMY_SPRITE_VERSIONS` (`assets.js`); the Glossary reads them too. Prompts: `src/game/td/sprite-spec-for-ai.md`.

Still open: deleting the unused local leftovers and the replaced sprite files (item 8, needs the owner), the promo image (item 8), and old R2 keys (item 8 list).

Companion documents: [TOWER_DEFENSE_WHITELABEL_PLAN.md](TOWER_DEFENSE_WHITELABEL_PLAN.md) (asset isolation rules, hero art briefs) and [TOWER_DEFENSE_MYTHIC_HEROES.md](TOWER_DEFENSE_MYTHIC_HEROES.md) (replacement names and text for all 21 heroes). Nothing has been switched yet; this is the inventory and the switch plan.

## Historical inventory (September 27, 2026)

> **Historical.** The Status section above is current: the switch to the mythic roster is done (M24, M24b). Everything below
> from "Summary" to the end is the pre-switch audit that drove it: the inventory, the "one switch" proposal, the work order and the
> open owner decisions. Statements such as "heroes are about half done" or "audio does not exist" describe that moment.
> Items 1 to 14 are all resolved (confirmed by the owner, October 6, 2026), including 10 to 12 and 14.
> The live mapping is `src/game/td/skin.js` with `src/data/tdSkinMythic.json`; the per-hero brief is in
> [TOWER_DEFENSE_WHITELABEL_PLAN.md](TOWER_DEFENSE_WHITELABEL_PLAN.md). Re-check a file against the code before acting on it.

## Summary

| Area | Game content today | Replacement ready? |
|---|---|---|
| Hero identity (names, portraits, tokens, idle animations) | Yes, all 21 | Names and text: yes (21/21). Art: first pass 21/21 in `public/td/heroes-alt/review-set-v1`, not approved, not wired. Tokens and animations: not built. |
| Hero audio (voice, attack, ultimate) | Yes, 63 files extracted from the APK | No |
| Background music | Yes (Map 3 confirmed as the game's `bgm_battle_desert`; Maps 1 and 2 very likely the same source) | No |
| Boss HUD portraits and faction label | Yes (`bosses/*.webp`, faction "Spades") | Board sprites are already AI-made; HUD portrait: no |
| Enemy portraits (legacy) | Yes, 5 APK head portraits still loaded | Not needed: AI sprites already replace them on the board |
| Enemy AI sprites | Generated with the game portraits as reference | Done: regenerated from text (item 9) |
| Skill names | 2 of 21 are the game's own names; all 21 are Motto-hero themed | Yes (text pack ultimates) |
| Blessing names (virtues) | 11 of 12 match the game's virtue names | No |
| Class icons | Game hexagon icons from R2 `icons/classes/` | No |
| Branding text | Page title, description, disclaimers name Motto Immortal | Text only, trivial |

Readiness: heroes are about half done (identity content exists, integration and audio do not). The largest open work is audio (63 hero sounds plus 3 music tracks), then wiring and approving the hero art.

## Inventory

Risk: **High** = copied game files (art, audio, animation rigs). **Medium** = the game's own names or designs. **Low** = generic words or mechanics.

### 1. Hero portraits (High)
- Source: R2 `heroes/{id}.webp`, the database's extracted game renders, via `hero.image` in `src/data/gameBalance.json`.
- Shown in: recruit sheet (`page/recruit.ts`), deck (`page/hud.ts`), hero panel (`page/popover.ts`), Daily Trial and Expedition rosters (`page/daily.ts`, `page/expedition.ts`), Glossary (`TdGlossaryContent.astro`), board fallback circle (`render.js` `loadTexture(hero.id, hero.image)`).
- Replacement: `public/td/heroes-alt/review-set-v1/{name}.webp` plus `-card-240/360/480`, `-thumb-96`, `-token-192` exports (21/21, first pass). Needs approval, a move to a final path keyed by TD id (the review set is keyed by the new name, e.g. `aegir`), R2 upload under `td/heroes-alt/`.

### 2. Board tokens (High)
- Source: `public/td/tokens/{id}-v1.webp`, cropped from the game renders by `scripts/build-td-tokens.mjs` (crop fixes in `src/data/tdTokenCrops.json`).
- Replacement: the review set already has `-token-192` exports; either use them directly (new `TOKEN_VERSION` = `v2` in `render.js`) or point the build script at the new art. A version bump avoids stale caches.

### 3. Idle animations (High)
- Source: `public/td/anims/{id}-idle-v1.webp` rendered from the game's Spine rigs (`scripts/td-spine/`), listed in `src/data/tdHeroAnims.json`.
- Replacement: none. Remove the entries (the recruit preview then hides the animation strip, `recruit.ts` already handles that) or show the static new portrait in the strip instead.

### 4. Hero audio (High)
- Source: `public/td/sfx/{id}_{voice,attack,ultimate}.ogg`, 63 files from the APK (`docs/td-hero-audio-map.md` lists the source file per hero). Mapped in `HERO_SOUNDS` (`audio.ts`), gains in `src/data/tdAudioLevels.json`.
- Replacement: none. Options: (a) drop hero voices and use generic class sounds for attack and ultimate (6 classes x 2 sounds, from a CC0 pack like the Kenney sounds the UI already uses), (b) generate per-hero sounds (Coplay has `generate_sfx` and `generate_tts`), (c) silence. (a) is the quickest safe state.

### 5. Background music (High)
- Source: `public/td/music/bg_music_map1..3.m4a`, R2 `td/music/`; `bg_music_map3` matches the game's `bgm_battle_desert.wav` by duration (111.58 s); the other two are from the same extraction set (`~/android/audio_extracted/music`).
- Replacement: none. Needs 3 tracks (Coplay `generate_music`, or CC0 / licensed tracks). Keys are set per map in `tdMaps.json` (`music`).

### 6. Boss HUD portraits and faction (High / Medium)
- Source: `bosses.json` `image` (R2 `bosses/baphomet.webp`, `bosses/lilith.webp`, game art) shown in the boss nameplate (`hud.ts` `bossIntro`) and preloaded in `render.js`; subtitle shows `faction` "Spades" (the game's faction) and class.
- Replacement: crop the existing AI board sprites (`td/enemies/sprites/boss-v1.webp`, `boss-lilith-v1.webp`) for the nameplate; drop the faction from the subtitle. Boss names (Baphomet, Lilith) are folklore and can stay.

### 7. Legacy enemy portraits (High)
- Source: `public/td/enemies/{grunt,runner,flyer,archer,brute}.png`, head portraits from the APK (`UI_Headportraits`, e.g. `Mogu02`). Still loaded by `render.js` (`PORTRAIT_KINDS`) as the fallback behind the AI sprites.
- Action: delete the loader and the files. No replacement needed; the fallback chain ends at the Kenney tiles and vector shapes.

### 8. Other leftover files in `public/td` (checked September 27, 2026)
- Deleted from the repo on September 27, 2026 (owner approved), were: unused, can be deleted from the repo (no reference in `src` or `scripts`; the renderer only loads `sprite.webp`, `spritePlatform.webp`, `spriteRoad.webp` from R2 for maps without authored art, and all three maps have authored art): `sprite.png` and `spritePlatform.png` (painted stone pads with a purple and a gold glow, generic AI style), `spriteRoad.png` (stone road texture), `bg/slot_platform.png`, `bg/slot_road.png` (flat procedural circles), `bg/path_tile.png` (dark flat tile). None looks like game art, origin still not recorded. Also the replaced enemy sprites `enemies/sprites/{grunt,runner,flyer,archer,brute}-v1.webp`, `boss-lilith-v2.webp`, `brood-v2.webp` (game-derived, nothing loads them). The deletion was not done by the agent (needs the owner's go).
- `sprite_backgrounds.png`: a sheet of 9 painted fantasy landscapes (astrolabe terrace, pavilions over a gorge, lava fortress, jungle bridge, violet moon gate, desert with jackal statues, snowy bridge, sea god statue, cloud citadel), added in M24, not referenced. Origin unknown; the owner decides.
- `kenney_enemies.png`: Kenney (CC0), still loaded by `render.js` as the enemy fallback. Keep.
- `promotional/motto-tower-defense-youtube-v1.{png,jpg}`: YouTube thumbnail titled "MOTTO TOWER DEFENSE", generated with the game's Zeus and Lilith as identity references (`docs/tower-defense-thumbnail.md`): a white-haired Zeus in white and gold armor on the left, the game's black-and-red Lilith on the right. Not used by the game, but it is Motto branding and game-derived art and is served from the site: replace or delete it (and its doc) if the thumbnail should follow the white label.
- R2 keys nothing loads any more (owner may delete by hand): `td/sprite.png`, `td/spritePlatform.png`, `td/spriteRoad.png` (the `.webp` versions are the fallback for maps without art; keep or delete together with that `render.js` code), `td/sprite_backgrounds.png`, `td/bg/slot_platform.png`, `td/bg/slot_road.png`, `td/bg/path_tile.png`, `td/bg/worldmap.jpg`, `td/bg/worldmap.webp`, `td/zeusspritetest.png`, `td/promotional/motto-tower-defense-youtube-v1.png` and `.jpg`, `td/enemies/{grunt,runner,flyer,archer,brute}.png`, `td/enemies/sprites/{grunt,runner,flyer,archer,brute}-v1.webp`, `td/enemies/sprites/boss-lilith-v2.webp`, `td/enemies/sprites/brood-v2.webp`.

### 9. Enemy AI sprites (done September 27, 2026)
- Compared each sprite with its game portrait. Recognisably the game's design, replaced from text-only prompts: grunt (red-capped mushroom creature), runner (grey stones with a blue gem eye), flyer (rock sphere with a gold core and teal crystals), archer (purple crystal eye), brute (black and gold spider with amber eyes); Lilith v2 (the game's boss art with the background removed) and brood v2 (repaint of the game's model). Kept: Baphomet (generic horned demon), brood v1 and Lilith v1 (reused for broodcaller and hexer).
- New: `td/enemies/sprites/{grunt,runner,flyer,archer,brute}-v2.webp`, `boss-lilith-v3.webp`, `brood-v3.webp`; prompts in `src/game/td/sprite-spec-for-ai.md`, which no longer tells anyone to use game portraits.

### 10. Hero names and text (Medium) - done
- Source: `name` in `gameBalance.json` (Nuwa, Momus, Caishen, ...). The names are mythology, but the roster, pairing and portrayal are the game's.
- Replacement: display names, titles, bios, trait and ultimate names in `TOWER_DEFENSE_MYTHIC_HEROES.md` (21/21).

### 11. Skill names (Medium) - done
- Source: `heroSkills[id].skillName` in `gameBalance.tuning.json`. "Petrifying Gaze" (Medusa) and "Featherfall Judgment" appear verbatim in the game's skill text; the other 19 are TD-written but themed on the Motto hero (e.g. "Fate Link" for Yuelao, "Fortune Shower" for Caishen). Also shown: `AWAKEN_TEXT` (`popover.ts`), Glossary.
- Replacement: ultimate and awakening names from the text pack.

### 12. Blessing names (virtues) (Low / Medium) - done
- Source: `virtueEffects` / `virtueBlessings` keys in `gameBalance.tuning.json`: Wildness, Desire, Resolve, Oblivion, Defiance, Sacrifice, Mercy, Grace, Fervor, Insight, Gnosis (11 of 12 match the game's virtue set). Shown in the blessing offer, buff bar, result screen and Glossary.
- Replacement: none yet. Single words are generic, but the exact set is the game's; renaming is cheap if done as display labels (keep the keys, saves reference them).

### 13. Class icons (Medium)
- Source: R2 `icons/classes/{class}.webp` (game hexagon icons), `assets.js` `classIcon()` and the Glossary.
- Replacement: none. 6 simple icons (SVG inline would also remove the R2 dependency).

### 14. Branding and site text (Low) - done
- `src/pages/games/tower-defense.astro` title "Tower Defense | Motto Immortal" and description "Command Motto Immortal heroes..."; `TdLobby.astro` About text ("played with heroes from the game") and disclaimer; `TdGlossary.astro` disclaimer. Change when the swap ships.

### Not game content (no action)
Mechanics and systems (classes, blocking, virtues as a mechanic, awakening, paths), all numbers, enemy kinds and names (grunt, runner, ...), map art (`public/td/maps`), hero effects (`hero-fx.js`, `odin-fx.js`, procedural), UI sounds (`click_001` etc., Kenney), internal ids (`odin`, `atlas`, ...; players never see them, saves use them).

## How to be ready: one switch

Put everything a player sees about a hero behind one skin file so the swap is one change, reversible, and testable before launch:

1. `src/data/tdSkin.json`: per TD id `{ name, title, image, token, thumb, voice/attack/ultimate sound keys, skillName, awakenName }`, plus boss portrait and virtue labels. The game reads display data from the skin and falls back to nothing from the database (per the plan's "no fallback" rule).
2. Replace every `hero.image` / `hero.name` read in the files listed in item 1 with a `skin(id)` helper (one module in `src/game/td/`). About 10 call sites.
3. Build flag (`PUBLIC_TD_SKIN=mythic|motto`) during review, so both skins can be compared on the dev server. Remove the Motto skin when the swap ships.
4. Test: a script that loads the page data with the mythic skin and fails on any R2 `heroes/`, `bosses/`, `icons/classes/` path or any Motto name in the output.

## Work order and size

1. Clean-up without new content (small, safe now): delete legacy enemy portraits and loader (7), unused leftovers (8), faction subtitle (6).
2. Skin layer and switch (medium): items 1, 2, 10, 11, 14 with the existing art and text; tokens from the `-token-192` exports; drop animations (3).
3. Art approval (owner): review the 21 portraits in-game via the switch.
4. Audio (large): class-based attack and ultimate sounds, voices dropped or generated (4); 3 music tracks (5).
5. Remaining labels and icons (small): virtue labels (12), class icons (13), boss HUD portraits (6).
6. Enemy sprite review (9).

## Decisions for the owner

1. Hero audio: generic class sounds, generated per-hero sounds, or silence?
2. Music: generate 3 tracks (Coplay) or use CC0 / licensed music?
3. Rename the 12 blessings, or keep them as generic words?
4. Does the swap cover the Glossary's standalone page (`/games/tower-defense/glossary`) too? (Assumed yes.)
5. Open questions 1 to 6 in the plan document still apply (token crops, Zeus scope, timing of text vs art).

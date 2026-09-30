# Tower Defense Enemy Sprite Specification (for AI image generation)

## Goal
Full-body tower defense sprites for the enemy kinds and bosses of "The Last Crossing" (Greek and Norse myth, roads between the worlds). The sprites are displayed at about 44px (enemies), 64px (brute) and 96px (boss) on a top-down tactical map, without a circular mask.

**White label rule (M24):** generate from text only. Never attach, trace or describe art from Motto Immortal (GOAT Games) or any other game: no reference images, no "like the game's X". The first set (v1 of the five enemies, Lilith v2 and her brood v2) was made from the game's portraits and renders and has been replaced; see "Current prompts" below.

## Style Requirements
- **Art style**: Dark fantasy RPG. Rich colors, strong silhouettes, dramatic lighting.
- **View**: Slight 3/4 top-down perspective. NOT pure overhead, NOT pure side-view.
- **Background**: Fully transparent (PNG with alpha channel).
- **Canvas**: 256x256 pixels after the build step, subject centered, fills ~80% of canvas.
- **Format**: PNG-32 (RGBA), no white background, no drop shadow baked in.
- **Key constraint**: The sprite is shown small. Keep the silhouette readable at 44px and face the subject to the right (the game mirrors it when moving left).

## Current prompts (M24 leftovers, September 27, 2026)
Coplay `generate_or_edit_images`, gpt_image_1, medium quality, 1:1, transparent background, no reference image. Every prompt ends with the same style block:

> Dark fantasy RPG art style, rich colors, strong silhouette, dramatic rim lighting, slight 3/4 top-down view, facing right, centered, entire body visible, wide empty margin around it, isolated on a fully transparent background, no ground, no shadow, no text. Readable at small size.

| Kind (file) | Role | Prompt (before the style block) |
|---|---|---|
| grunt (`grunt-v2`) | basic infantry | Full-body game sprite of an undead Norse draugr foot soldier: gaunt grey-blue skin, glowing pale cyan eyes under a battered iron nasal helmet, tattered dark wool tunic with a rusted mail shirt, round wooden shield with a faded rune, notched bronze short sword held forward, marching stance. Colors: grey-blue skin, rust brown, weathered wood, pale cyan eye glow. |
| runner (`runner-v2`) | fast | Full-body game sprite of a lean spectral hound from the underworld: a wiry black wolf-like dog with smoky ember-orange cracks along its ribs, long legs in a full sprint, tail streaming like smoke, bared teeth, a broken bronze collar with a short chain. Fast and light silhouette. Colors: charcoal black, ember orange, dull bronze. |
| flyer (`flyer-v2`) | flying | Full-body game sprite of a Stymphalian bird from Greek myth in flight: a large crane-like bird of prey with sharp metallic bronze feathers, long hooked bronze beak, red eyes, wings spread wide mid-flap, talons tucked, a few loose metal feathers falling (style block: "entire body and both wingtips visible"). Colors: polished bronze and copper, dark teal patina, red eyes. |
| archer (`archer-v3`) | ranged | Full-body game sprite of a wild satyr archer from Greek myth: goat legs with hooves, curled ram horns, shaggy dark hair, lean bare torso with a leather quiver strap, drawing a curved horn bow with a nocked arrow aimed forward, crouched ready stance. Colors: tan and olive skin, dark brown fur, bone-white horns, dark leather, green fletching. |
| brute (`brute-v3`) | armored heavy | Full-body game sprite of a hulking Norse mountain troll in heavy armor: massive hunched body, mossy grey stone-like skin, tusked underbite, small angry yellow eyes, thick riveted iron plates strapped over shoulders and chest, iron-banded forearms, dragging a huge stone-headed club, heavy lumbering stride. Colors: mossy grey-green skin, dark iron, rust accents, yellow eyes. |
| Lilith (`boss-lilith-v4`) | final boss, Verdant Crossing | Full-body game sprite of Lilith, a night demoness boss from folklore: tall pale woman with long black hair, large dark owl wings spread behind her, owl talon feet, an emerald-green serpent coiled around her raised arm, layered gown of deep green and bone white, silver crescent-moon circlet, glowing amber eyes, commanding pose. Clean crisp painted game art with sharp edges (style block plus "no smoke"). v4 (September 29, 2026): redrawn with owl talon feet, complete lower body. |
| brood (`brood-v4`, `lilith_child.png`) | Lilith's summoned children | Full-body game sprite of a small lilin night spirit, the summoned child of a night demoness: a hunched, knee-high creature with a pale owl-like face and big amber eyes, ragged dark-green bat-like wings, thin grey limbs with long claws, a short serpent tail, scuttling forward. Colors: ash grey, dark green, amber eyes, a hint of emerald glow. |

Kept: Baphomet (`boss-v2` since September 29, 2026, redrawn complete with hooves; v1 was a generic horned winged demon with a mace, unlike the game's hunched plated design), `brood-v1` (spiky red-black beast, used tinted for the broodcaller) and `boss-lilith-v1` (violet tentacle figure, used for the hexer). Generated sources: `~/hero-database-assets/td/enemy-sprites-src/` (outside the repo).

## Future bosses
Write new prompts from the myth, in the table format above. The concepts below for Ishtar, Snowman, Typhoon, Nian and Night Hag were written by looking at the mobile game's portraits: do not use them as they are; design each boss again from the myth before generating.

## Boss Sprites (7 types)

### boss_baphomet.png
- **Name**: Baphomet
- **Sprite concept**: Imposing dark demon lord, half-body visible. Towering curved black horns. Red burning eyes. Wings or dark energy mantle spreading behind. Standing pose, looming forward.
- **Scale**: Noticeably larger canvas presence than enemy sprites. Should feel threatening.
- **Color palette**: Matte black, deep red glow, dark purple aura

### boss_ishtar.png
- **Name**: Ishtar IV
- **Sprite concept**: Ancient goddess, regal and unsettling. Elaborate gold and dark crown. Floating rather than walking. Dark ornate robes with gold trim. Gems and celestial motifs.
- **Color palette**: Pale skin, gold crown/jewelry, dark robes, purple gems

### boss_snowman.png
- **Name**: Snowman
- **Sprite concept**: Full body snowman. Three-sphere stacked body. Sinister grin. Red top hat with holly. Chain necklace. Hidden weapons (claws or icicle fists) to hint at danger. Slightly menacing despite cute design.
- **Color palette**: White snow, red hat, gold chain, button black eyes

### boss_typhoon.png
- **Name**: Typhoon
- **Sprite concept**: Ancient wind/earth colossus. Multi-eyed face with twisted antler crown. Massive in scale - body like a living mountain. Wind or dust swirling around it. Multiple arms.
- **Color palette**: Red-brown earth tones, gold antlers, multi-colored eyes

### boss_nian.png
- **Name**: Nian Beast
- **Sprite concept**: Mythical Chinese lion-beast. White fur, flowing orange-red mane like fire. Gold ceremonial armor on chest and head. Roaring pose, front paws raised. Majestic and terrifying.
- **Color palette**: White fur, flame-orange mane, gold armor, amber eyes

### boss_nighthag.png
- **Name**: Spirit of the Night Hag
- **Sprite concept**: Demonic flaming horse/nightmare. Full body galloping. Black body with fire patterns running along mane, hooves, and tail. Eyes and breath are orange flames. Ethereal smoke trails.
- **Color palette**: Jet black, orange-red fire, glowing amber eyes

### boss_lilith.png
- **Name**: Lilith (final boss, Verdant Crossing)
- **Current art (v3)**: text-only prompt, see "Current prompts" (folklore night demoness: owl wings, serpent, green and bone-white gown).

### lilith_child.png
- **Name**: Lilith's children (summoned by Garden of Flesh)
- **Current art (v3)**: text-only prompt, see "Current prompts" (lilin night spirit: owl face, bat wings, serpent tail).

---

## Animation frames (M7, live)
Every still the game shows has an animation sheet with the same name: `enemies/clips/brood-v4` animates `enemies/sprites/brood-v4` (`ENEMY_SHEETS` in `src/game/td/assets.js`). A new or redrawn still needs new clips; a remade sheet for the same still gets a suffix (`brood-v4b`), since R2 caches a year.

Frame format (what the packer and renderer expect):
- Square frames, transparent, facing right, the same canvas and scale in every frame of every clip; feet (lowest contact point) on one line. The packer crops all frames to one shared box and takes the feet point from the first `idle` frame; the renderer scales the idle body's larger side to 80% of the kind's sprite size.
- Clips: `idle` (4, loop), `walk` (8, loop), `attack` (8, loop back to the start pose; strike in the first half), `hurt` (4, returns to the start pose), `death` (8, last frame lying). 12 fps. Kinds that never stop or strike (flyer) may reuse one strip for idle, walk and attack.

Workflow (September 29, 2026; the step-by-step runbook with exact commands is `docs/td-asset-pipeline.md`):
1. Start from a complete still: feet or lowest contact point visible, nothing cut off, 256x256, transparent (`~/hero-database-assets/td/enemy-sprites-src/`, never `public/`). Build and upload the still first (`build-td-enemy-sprites.mjs`, `ENEMY_SPRITE_VERSIONS`).
2. PixelLab PixMiniMax through the API (`POST /v2/animate-pixminimax`, key from the local `pixellab` MCP config): `first_frame` = the still; for idle, walk, attack and hurt also `last_frame` = the same still, so the clip ends in the start pose. Describe motion only, end with "stays in place ... ends in exactly the starting pose", and name what must not change (head count, legs, broken tusk). Death runs open. `frame_count` 4 or 8; about 1 generation per clip; Tier 1 allows 8 concurrent jobs; poll `GET /v2/background-jobs/{id}`.
3. Save each job's frames as `pixellab-<kind>/<clip>/NN.png` (00 = the unchanged input), then `python3 scripts/td-warp-anim.py <kind> ~/hero-database-assets/td/warp-anims --pixellab`. Check every clip for extra or missing limbs, changed head counts, cropped extremities and drift.
4. Add `<file>-<version>` of the still to the `painted` set in `scripts/build-td-enemy-anims.mjs` (e.g. `"boss-lerna-v1": { dir: "lerna", ... }`), build with `--release`, upload with `upload-to-r2.mjs --prefix td/enemies/clips`, add the name to `ENEMY_SHEETS`. Local test before release: build without `--release` and open the game with `?sheets=local&set=painted`.
- Same white label rule as the stills: made from our own sprites or from text, never from Motto Immortal art.
- Tried and dropped for animation: Meshy 3D renders, a free pixel-art pack, warped single stills, generated walk strips without a pinned end pose.

## Output Filenames
```
grunt.png, runner.png, flyer.png, archer.png, brute.png
boss_baphomet.png, boss_ishtar.png, boss_snowman.png, boss_typhoon.png, boss_nian.png, boss_nighthag.png, boss_lilith.png
lilith_child.png
```

## Priority
In the game today: the 5 enemy kinds, Baphomet (Moonlit Pass, `boss_baphomet.png` -> `boss-v2.webp`) and Lilith with her children (Verdant Crossing, `boss_lilith.png` -> `boss-lilith-v4.webp`, `lilith_child.png` -> `brood-v4.webp`). The other 5 bosses can wait until they are added as final bosses.

## Prompt template
Use one generation per sprite with the same style block so the set matches:

> Full-body game sprite of {Sprite concept}. Dark fantasy RPG art style, rich colors, strong silhouette, dramatic rim lighting, slight 3/4 top-down view, facing right, centered, isolated on a fully transparent background, no ground, no shadow, no text. Colors: {Color palette}.

No reference image. Generate square (1024x1024 is fine, the pipeline scales it down). If the tool cannot output transparency, remove the background before the next step.

## Integration
1. Put the images in one folder with the spec file names (`grunt.png` ... `boss_baphomet.png`; `.webp` also works).
2. `node scripts/build-td-enemy-sprites.mjs <folder>` trims, fits the subject to 80% of a 256x256 transparent canvas and writes `public/td/enemies/sprites/{kind}-v1.webp` (or `--version`) (Baphomet becomes `boss-v1.webp`). It warns when the corners are not transparent.
3. `node scripts/upload-to-r2.mjs --prefix td/enemies/sprites` uploads them.
4. The renderer picks them up automatically: full-body sprites win over the circle portraits, are drawn unmasked with a ground shadow and face their direction of travel (draw them facing right). Kinds without a file fall back to the Kenney tiles and vector shapes.

Changed art needs a new file name because R2 objects are cached for a year: build only the changed files with `--only <names> --version vN` and set the same version for those files in `ENEMY_SPRITE_VERSIONS` in `src/game/td/assets.js` (renderer, boss nameplate and Glossary read it). Upload each new file with `node scripts/upload-to-r2.mjs --prefix td/enemies/sprites/{kind}-vN`.

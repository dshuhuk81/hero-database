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
| archer (`archer-v2`) | ranged | Full-body game sprite of a wild satyr archer from Greek myth: goat legs with hooves, curled ram horns, shaggy dark hair, lean bare torso with a leather quiver strap, drawing a curved horn bow with a nocked arrow aimed forward, crouched ready stance. Colors: tan and olive skin, dark brown fur, bone-white horns, dark leather, green fletching. |
| brute (`brute-v2`) | armored heavy | Full-body game sprite of a hulking Norse mountain troll in heavy armor: massive hunched body, mossy grey stone-like skin, tusked underbite, small angry yellow eyes, thick riveted iron plates strapped over shoulders and chest, iron-banded forearms, dragging a huge stone-headed club, heavy lumbering stride. Colors: mossy grey-green skin, dark iron, rust accents, yellow eyes. |
| Lilith (`boss-lilith-v3`) | final boss, Verdant Crossing | Full-body game sprite of Lilith, a night demoness boss from folklore: tall pale woman with long black hair, large dark owl wings spread behind her, owl talon feet, an emerald-green serpent coiled around her raised arm, layered gown of deep green and bone white, silver crescent-moon circlet, glowing amber eyes, commanding pose. Clean crisp painted game art with sharp edges (style block plus "no smoke"). Of three attempts this one is used; the lower gown still fades out a little. |
| brood (`brood-v3`, `lilith_child.png`) | Lilith's summoned children | Full-body game sprite of a small lilin night spirit, the summoned child of a night demoness: a hunched, knee-high creature with a pale owl-like face and big amber eyes, ragged dark-green bat-like wings, thin grey limbs with long claws, a short serpent tail, scuttling forward. Colors: ash grey, dark green, amber eyes, a hint of emerald glow. |

Kept: Baphomet (`boss-v1`, a generic horned winged demon with a mace, unlike the game's hunched plated design), `brood-v1` (spiky red-black beast, used tinted for the broodcaller) and `boss-lilith-v1` (violet tentacle figure, used for the hexer). Generated sources: `~/hero-database-assets/td/enemy-sprites-src/` (outside the repo).

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

## Animation frames (M7, test pipeline in place)
Not in the game yet; the plan and the free workflow are in `docs/tower-defense-ui-plan.md` (M7). Until a kind has a sheet, it uses the still sprite with the procedural motion prototype (`?anim`). Frames for a sheet follow the still sprite's rules, so a kind can switch without resizing or re-anchoring:
- 256x256 PNG-32 per frame, transparent, same scale as the kind's still sprite (subject about 80% of the canvas in the widest frame of all clips, not per frame).
- Feet on the same line in every frame (the renderer anchors at 90% height); facing right.
- Clips and frame counts: `idle` 6 (loop), `walk` 8 (loop), `attack` 6 (strike lands on frame 3), `hurt` 3 to 4, `death` 4 to 6 (last frame lying down). 12 fps.
- Packer input (`scripts/build-td-enemy-anims.mjs`): one horizontal strip PNG per clip, square frames (frame size = strip height), clips `idle`, `walk`, `attack`, `hurt`, `death`; map the files per kind in its `PACKS` table. The packer crops all frames to one shared box and takes the feet point from `idle` frame 0.
- Generated frame series can work well (the flyer, September 29, 2026; a grunt walk strip was rejected for a weak walk cycle): one horizontal strip of 6 frames per clip, same spacing, transparent (or plain black) background, facing right, the last frame leading back into the first. Walk comes first; an attack strip (6 frames, strike on frame 3) is the next most useful. Source strips live in `~/hero-database-assets/td/enemy-sprites-src/`, not in `public/`, and `scripts/td-warp-anim.py` (`STRIPS`) turns them into clips.
- Same white label rule as the stills: made from our own sprites or from text, never from Motto Immortal art.

## Output Filenames
```
grunt.png, runner.png, flyer.png, archer.png, brute.png
boss_baphomet.png, boss_ishtar.png, boss_snowman.png, boss_typhoon.png, boss_nian.png, boss_nighthag.png, boss_lilith.png
lilith_child.png
```

## Priority
In the game today: the 5 enemy kinds, Baphomet (Moonlit Pass, `boss_baphomet.png` -> `boss-v1.webp`) and Lilith with her children (Verdant Crossing, `boss_lilith.png` -> `boss-lilith-v3.webp`, `lilith_child.png` -> `brood-v3.webp`). The other 5 bosses can wait until they are added as final bosses.

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

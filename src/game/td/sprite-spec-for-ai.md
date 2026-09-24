# Tower Defense Enemy Sprite Specification (for AI image generation)

## Goal
Generate full-body tower defense sprites for 6 enemy types + 7 bosses. These replace portrait crops extracted from the mobile game "MOTTO IMMORTAL" (provided as reference images). The sprites will be displayed as 28-52px circles on a top-down tactical map.

## Style Requirements
- **Art style**: Dark fantasy / mobile RPG. Rich colors, strong silhouettes, dramatic lighting. Match the quality of the provided reference portraits.
- **View**: Slight 3/4 top-down perspective (like Clash Royale or AFK Arena idle animations). NOT pure overhead, NOT pure side-view.
- **Background**: Fully transparent (PNG with alpha channel).
- **Canvas**: 256x256 pixels, subject centered, fills ~80% of canvas.
- **Format**: PNG-32 (RGBA), no white background, no drop shadow baked in.
- **Key constraint**: The sprite will be cropped by a circular mask in-game. Keep the most important visual features (head/core/distinguishing element) centered and inside a ~200px diameter circle.

## Enemy Sprites (6 types)

### 1. grunt.png
- **Reference**: `A_UI_HeadPortrait_Mogu02_Img.png` (mushroom creature with red-capped hat, glowing eyes, tiny arms)
- **Role**: Basic melee enemy, medium stats
- **Sprite concept**: Full body of the mushroom monster. Squat bipedal stance, angry face with orange glow eyes, wooden-bark torso, red mushroom cap on head. Walks forward in slight crouch.
- **Color palette**: Earthy browns, red cap, orange glow eyes

### 2. runner.png
- **Reference**: `A_UI_HeadPortrait_Diediemoou02_Img.png` (stack of 3 stone blocks with a single blue gem eye)
- **Role**: Fast melee enemy, low HP, low armor
- **Sprite concept**: Compact stone golem made of 2-3 stacked floating rock segments. Lean silhouette. Moving fast - slight forward lean or motion blur legs.
- **Color palette**: Grey stone, blue gem eye, faint dust particles

### 3. flyer.png
- **Reference**: `A_UI_HeadPortrait_Hanhuizhihe03_Img 2.png` (spherical rock/ice creature with gold core, cracked dark shell with ice crystals)
- **Role**: Flying enemy (bypasses ground heroes)
- **Sprite concept**: Floating orb surrounded by broken rock/ice shards orbiting it. Gold energy core visible through cracks. Hovers with a slight glow beneath it.
- **Color palette**: Dark grey rock, teal/blue ice crystals, gold inner light

### 4. archer.png
- **Reference**: `A_UI_HeadPortrait_An02_Img.png` (purple crystal star-shaped creature with single large eye, mounted on a staff-like dark pillar)
- **Role**: Ranged attacker, attacks heroes
- **Sprite concept**: Floating crystalline eye-creature. Star-burst of dark purple crystal spines radiating from a central purple eye. Hovers slightly above ground, tendrils or roots beneath.
- **Color palette**: Deep purple/black crystals, glowing purple eye

### 5. brute.png
- **Reference**: `A_UI_HeadPortrait_Zhizhu03_Img 2.png` (massive black spider with 8 glowing orange gem-eyes, gold claws, dark carapace)
- **Role**: Heavy melee tank, high HP and armor
- **Sprite concept**: Large black-armored spider. Body nearly fills the frame. Front legs raised aggressively. 8 glowing amber eyes on dark face. Claws prominent.
- **Color palette**: Matte black carapace, gold claws and joints, amber glow eyes

---

## Boss Sprites (7 types)

### boss_baphomet.png
- **Reference**: `A_UI_HeadPortrait_Bafengte03_Img 2.png` (massive black goat-demon head with huge curved horns, glowing red eyes, dark feathery/spiky mantle)
- **Game name**: Baphomet
- **Sprite concept**: Imposing dark demon lord, half-body visible. Towering curved black horns. Red burning eyes. Wings or dark energy mantle spreading behind. Standing pose, looming forward.
- **Scale**: Noticeably larger canvas presence than enemy sprites. Should feel threatening.
- **Color palette**: Matte black, deep red glow, dark purple aura

### boss_ishtar.png
- **Reference**: `A_UI_HeadPortrait_Yishitaer03_Img 2.png` (beautiful pale woman with elaborate gold crown, jewels, dark hair, serene but unsettling expression)
- **Game name**: Ishtar IV
- **Sprite concept**: Ancient goddess, regal and unsettling. Elaborate gold and dark crown. Floating rather than walking. Dark ornate robes with gold trim. Gems and celestial motifs.
- **Color palette**: Pale skin, gold crown/jewelry, dark robes, purple gems

### boss_snowman.png
- **Reference**: `A_UI_HeadPortrait_XueRenBoss02_Img.png` (jolly-looking snowman with red hat, chain necklace, scarf, button eyes - deceptively cute but villainous)
- **Game name**: Snowman
- **Sprite concept**: Full body snowman. Three-sphere stacked body. Sinister grin. Red top hat with holly. Chain necklace. Hidden weapons (claws or icicle fists) to hint at danger. Slightly menacing despite cute design.
- **Color palette**: White snow, red hat, gold chain, button black eyes

### boss_typhoon.png
- **Reference**: `A_UI_HeadPortrait_Tifeng02_Img.png` (massive ancient deity face with multiple eyes, antler-like gold protrusions, earthy red tones, tiny figure visible below showing scale)
- **Game name**: Typhoon
- **Sprite concept**: Ancient wind/earth colossus. Multi-eyed face with twisted antler crown. Massive in scale - body like a living mountain. Wind or dust swirling around it. Multiple arms.
- **Color palette**: Red-brown earth tones, gold antlers, multi-colored eyes

### boss_nian.png
- **Reference**: `A_UI_HeadPortrait_NianShouBoss02_Img.png` (lion-like beast with white fur, orange mane, ornate gold armor headdress, fierce golden eyes)
- **Game name**: Nian Beast
- **Sprite concept**: Mythical Chinese lion-beast. White fur, flowing orange-red mane like fire. Gold ceremonial armor on chest and head. Roaring pose, front paws raised. Majestic and terrifying.
- **Color palette**: White fur, flame-orange mane, gold armor, amber eyes

### boss_nighthag.png
- **Reference**: `A_UI_HeadPortrait_Mengyanma02_Img.png` (jet-black flaming horse head with fiery mane, red-orange flame patterns, glowing red eyes)
- **Game name**: Spirit of the Night Hag
- **Sprite concept**: Demonic flaming horse/nightmare. Full body galloping. Black body with fire patterns running along mane, hooves, and tail. Eyes and breath are orange flames. Ethereal smoke trails.
- **Color palette**: Jet black, orange-red fire, glowing amber eyes

### boss_lilith.png
- **Reference**: `A_UI_HeadPortrait_Lilisi02_Img.png` (black biomechanical humanoid figure, skeletal/lattice texture, glowing purple energy core in chest/head)
- **Game name**: Lilith
- **Sprite concept**: Dark cosmic entity. Tall humanoid but alien. Body is black lattice/web-like organic material with purple void energy visible through gaps. Elongated limbs. No clear face, just a glowing purple vortex where the head should be.
- **Color palette**: Matte black lattice, deep purple glow, void dark background

---

## Output Filenames
```
grunt.png, runner.png, flyer.png, archer.png, brute.png
boss_baphomet.png, boss_ishtar.png, boss_snowman.png, boss_typhoon.png, boss_nian.png, boss_nighthag.png, boss_lilith.png
```

## Integration Notes
Once generated, place files in `/public/td/enemies/` in the hero-database project. The renderer loads them from `/td/enemies/{kind}.png`. Enemy kinds: grunt/runner/flyer/archer/brute. Boss needs separate integration (currently uses `boss` key in renderer, maps to baphomet by default).

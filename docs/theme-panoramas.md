# Theme Landscape Panoramas — October 5, 2026

Parent plan: [Tower Defense Roadmap](../TOWER_DEFENSE_ROADMAP.md).
Presentation: [Tilted Board and Landscape HUD](../TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md).
Assignments: [Map art](../map.md).

## Scope and delivery

After the Moonlit extension, the owner requested all remaining theme panoramas. Twelve new
opaque PNGs were created with the built-in image generation tool (not CLI/API fallback),
visually inspected and copied into the repository without overwriting original images.
Together with Jungle and Moonlit, all fourteen current themes have a registered backdrop.
No production build, R2 upload, map geometry or balance change is included.

The gameplay canvas still uses its original terrain and building assets. The generated centre
is not pixel-identical and must not replace the playable terrain. The panorama is scenery
behind that canvas. All maps sharing an art key share its backdrop; Campaign and Free Play
R18 activation policies remain unchanged. Architecture reuse explicitly excludes its source
panorama. Only delivered environment panoramas are registered; future environments fall back
to their own terrain until their art is delivered.

## Asset inventory

All paths below are relative to `public/td/maps/`; runtime URLs omit `public`.
Wide v1 is the panorama version, not the underlying terrain version (Verdant uses v2).

| Theme | Original source | Panorama | Dimensions |
| --- | --- | --- | --- |
| Jungle | jungle-terrain-v1.png | jungle-terrain-wide-v1.png | 1959 × 803 |
| Moonlit | moonlit-terrain-v1.png | moonlit-terrain-wide-v1.png | 1962 × 802 |
| verdant | verdant-terrain-v2.png | verdant-terrain-wide-v1.png | 1962 × 802 |
| sunscar | sunscar-terrain-v1.png | sunscar-terrain-wide-v1.png | 1961 × 802 |
| frostbound | frostbound-terrain-v1.png | frostbound-terrain-wide-v1.png | 1962 × 802 |
| ashen | ashen-terrain-v1.png | ashen-terrain-wide-v1.png | 1962 × 802 |
| stormpeak | stormpeak-terrain-v1.png | stormpeak-terrain-wide-v1.png | 1962 × 802 |
| tidal | tidal-terrain-v1.png | tidal-terrain-wide-v1.png | 1962 × 802 |
| mycelium | mycelium-terrain-v1.png | mycelium-terrain-wide-v1.png | 1962 × 801 |
| crystal | crystal-terrain-v1.png | crystal-terrain-wide-v1.png | 1962 × 801 |
| necropolis | necropolis-terrain-v1.png | necropolis-terrain-wide-v1.png | 1962 × 802 |
| autumn | autumn-terrain-v1.png | autumn-terrain-wide-v1.png | 1962 × 802 |
| celestial | celestial-terrain-v1.png | celestial-terrain-wide-v1.png | 1962 × 802 |
| clockwork | clockwork-terrain-v1.png | clockwork-terrain-wide-v1.png | 1961 × 802 |

Moonlit's original prompt is retained in [Moonlit Landscape Panorama](moonlit-panorama.md).
Jungle predates this batch; its prompt is not reconstructed here.

## Exact prompt set for the twelve new assets

Each call used its original source as input image 1 (edit target), with
`transparent_background: false`. The shared prompt below was used verbatim, replacing
`THEME` with the corresponding paragraph listed afterwards.

```text
Use case: precise-object-edit / horizontal outpainting. Input image 1 is the edit target, existing hand-painted 2D tower-defense terrain. Extend ONLY sideways, both left and right, to a roughly 2.44:1 panoramic canvas (2400x980). Keep the source centred at original proportions, occupying middle 73% of final width. Preserve central flat quiet playable courtyard, all existing architecture, camera elevated nearly overhead, scale, lighting, palette, sharp brushwork and material textures. New outer scenery must naturally continue existing perimeter without visible vertical seams. Theme details: THEME. No horizon, perspective change, zoom/crop, stretch, duplicated landmarks, mirrored strips, characters, heroes, enemies, road routes, game tiles, portals, UI, text, watermarks, border or strong vignette. Do not obstruct central ground. Fully opaque finished panoramic image.
```

### verdant

Cool grey mossy cracked flagstones, dark green woodland, low ruined stone walls with aged gold column caps and blue water pools; extend woodland and subtle stream banks outside the courtyard.

### sunscar

Warm sandy ruined courtyard, chipped sandstone pillars, dry grasses, desert dunes and existing golden sun wheel top right; extend sand and ruined perimeter, no extra sun wheel.

### frostbound

Snow-covered rune pillars and fir trees, cyan icy cliffs and mist below an elevated slate blue frozen temple courtyard; continue snowy cliffs and pines outside perimeter.

### ashen

Charcoal obsidian forge courtyard, orange lava channels around perimeter, chained dwarven pillars and ember furnaces; extend volcanic crags and perimeter lava, central playable ground stays clear.

### stormpeak

Rain-darkened slate courtyard on storm mountain, gold-trim broken columns and one existing celestial wheel at top, blue lightning and violet cloud banks outside cliffs; continue mountains and cloud banks, no extra wheel.

### tidal

Weathered teal stone temple platform surrounded by turquoise surf, coral and seaweed-clad ruined columns; continue rocky sea and surf outside perimeter, no flooding centre.

### mycelium

Plum violet subterranean flagstone courtyard framed by twisting roots, giant purple mushrooms with mint bioluminescent gills and cave walls; continue glowing fungal cave outside edge.

### crystal

Dark indigo flagstone courtyard, gold rune obelisks and cyan/amethyst crystals on outer cavern cliffs; continue mineral cavern walls outside edge, no crystals on central floor.

### necropolis

Charcoal abandoned cemetery courtyard with skeletal trees, skull-topped ruined pillars, wrought iron fences, tombstones, mausoleums and ghostly teal mist around perimeter; extend cemetery woodland outside edge.

### autumn

Warm woodland courtyard, russet orange maple canopy, mossy stone walls and guardian lion statues at top, small lanterns and fallen leaves at perimeter; extend autumn forest outside edge.

### celestial

Midnight blue astral observatory platform, antique gold armillary instruments, blue banners, star diagrams and stars in void outside rocky edges; extend starry nebula void and rocky platform edges, preserve existing instruments without duplicating.

### clockwork

Rain-darkened iron-grey courtyard, tarnished brass pipes, gears, turquoise glass mechanical pillars, steam vents on perimeter; extend mechanical rocky citadel outside edge, no gears or pipes on central playable floor.

## Verification and next steps

- [x] Visually inspect source and generated images for theme, quiet centre and consistent camera.
- [x] Decode all fourteen images: opaque PNGs, approximately 2.44:1 landscape ratio.
- [x] Check each theme's backdrop assignment and unchanged original terrain in the UI tests.
- [ ] Owner: review all themes on a landscape phone, particularly the original-board/panorama
  transition, perimeter scale, bright lava/water under HUD and dark cavern contrast.
- [ ] If a seam or mismatched landmark is visible, revise only that theme's outer extension;
  do not compensate by changing tile geometry, units or playable terrain.


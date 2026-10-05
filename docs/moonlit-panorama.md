# Moonlit landscape panorama — October 5, 2026

Approved scope: extend Moonlit's outer scenery for wide landscape displays, retaining the
existing playable terrain, structures, camera, palette and map geometry. Parent priority list:
[Tower Defense Roadmap](../TOWER_DEFENSE_ROADMAP.md). Presentation contract:
[Tilted Board and Landscape HUD](../TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md).

## Delivered asset and integration

- New, opaque PNG: `public/td/maps/moonlit-terrain-wide-v1.png`, 1962 × 802 (approximately 2.45:1).
- Edit target: `public/td/maps/moonlit-terrain-v1.png`. The original file is unchanged.
- Generated with the built-in image generation tool, not the CLI/API fallback. The generated
  picture was visually inspected and copied into the project without overwriting an asset.
- Registered as `MAP_SCENES["moonlit-sanctuary-v1"].assets.bleed`. The backdrop is shared by
  `moonlit-pass`, `moonlit-terraces`, `moonlit-horned-gate`, and future maps using this art key.
  Existing R18 activation rules remain unchanged; adding a backdrop does not enable tilt.
- The gameplay canvas still paints the original 16:9 terrain and existing structures; only
  the surrounding landscape backdrop uses the panorama. Its generated centre is not a
  pixel-identical copy and is not substituted for the original playable ground.
- Environment scenes that reuse Moonlit architecture explicitly exclude its `bleed` asset:
  Frostbound, Crystal and other distinct themes now have their own panoramas, recorded in
  [Theme Landscape Panoramas](theme-panoramas.md).
- UI, skin and environment checks pass. Phone acceptance of the scenery transition remains
  with the owner. No production build, R2 upload, geometry change or balance change.

## Final generation prompt

Use case: precise-object-edit / horizontal outpainting. Asset type: ultra-wide landscape
backdrop for our hand-painted 2D fantasy tower-defense game. Input image 1 is the edit target,
our existing Moonlit courtyard terrain. Extend this existing picture horizontally on BOTH
left and right to a roughly 2.44:1 panoramic canvas (about 2400x980). Preserve the existing
central courtyard, open flat playable ground, large golden celestial astrolabe along the
top, columns, original nearly overhead elevated camera, cool slate-blue/indigo material
palette, upper-left moonlight and scale. Keep the source scene centred, occupying
approximately the middle 73% of the final width at its original proportions, with balanced
new scenery strips outside it. Only invent the outer scenery: natural continuations of the
chipped mountain-sanctuary masonry, sparse broken slate columns and subtle aged gold
details, rocky blue-black cliff faces descending into a misty abyss. Match the original
brushwork, sharp dimensional stone textures, illumination and contrast precisely; connect
extensions naturally with no visible vertical seams. Extensions should frame the board,
not obstruct or recompose its central playable ground. Do NOT turn it into a scenic
landscape with a perspective horizon, do not add a second astrolabe or a second moon, do not
stretch existing architecture or zoom/crop the input. No characters, enemies, heroes,
roads, tiles, portals, base buildings, UI, labels, lettering, watermark, border, strong
vignette, duplicated/mirrored side strips. Preserve all existing centre-image content as
closely as possible. Fully opaque background. Return the finished panoramic terrain image only.

## Next

- [ ] Owner: check the transition from the original board into the wide scenery on the phone.
- [x] Extend Verdant's selected v2 terrain, Sunscar and all ten additional environments.
  Full batch record: [Theme Landscape Panoramas](theme-panoramas.md).

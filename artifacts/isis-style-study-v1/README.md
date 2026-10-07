# Isis style and animation study — 2026-10-07

Open `index.html` for the two styles and playable animation with an optional independent effect overlay.

## Art

- `isis-gacha-master.png`: stronger anime/gacha interpretation, simplified graphic shading and costume.
- `isis-fantasy-master.png`: brighter painterly fantasy with more natural proportions.
- Both are 2048 × 2048 RGBA PNGs, exported/upscaled from generated originals preserved as `*-source.png`. The full silhouette occupies 60% of canvas height, bottom at approximately 80%. No cropping of the figure in these masters.
- `*-animation-input.png`: 256 × 256 derivatives for the existing PixelLab pipeline.
- `isis-solar-arc.png`: independent 1024 × 1024 transparent VFX sprite; original and exact prompt retained.
- Images generated with built-in image_gen. Exact prompts in `prompts.json` and `effect-prompt.json`. Fantasy used our original Isis as identity reference; final gacha version was generated from text to avoid inheriting the old realistic style. Costume differences mean this is a direction comparison rather than a controlled same-costume rendering test.

## Animation experiment

Existing `scripts/td-pixellab-clips.mjs` used with `animation-prompts.json`, attack only. PixelLab returned 9 PNGs: unchanged source frame 00 plus 8 generated frames. Jobs are recorded in `animation/jobs.json`. Raw frames remain untouched. Preview excludes source frame 00 from playback, following the existing review pipeline.

All nine frames are 256 × 256. Alpha bounds above 8/255 have at least 51 px clearance from canvas edges; bottom extent varies from y=203 to y=204. See `animation-check.json` and `animation-contact-sheet.png`. This confirms no edge clipping for this sample attack only, not arbitrary rotations or future animations.

Visual review: readable lateral staff motion, moving cloth and torso. PixelLab added a gold motion streak despite the no-effects prompt, and small costume/weapon details change. Prototype only; not a production-approved animation. The independent solar arc is a rough overlay demonstration, not final choreography or attachment tracking.

## Proposed production approach

Keep uncropped high-resolution character masters. Create animation inputs with deliberate motion space; preserve the same canvas, scale and calibrated foot pivot across a clip. Never individually trim animation frames. Export portrait/card crops separately. Additional views are required for convincing turns. Large weapons may require more reserve and a different body scale. Effect assets stay independent; the character image itself is still flattened, not a layered rig. Review bounds, silhouettes and animation quality per hero before replacing the roster. Runtime display must compensate for transparent padding using explicit visual scale and anchor metadata.

No game integration or roster replacement performed. Both styles and the animation remain a review study.

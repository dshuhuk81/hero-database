# Isis — stationary laser attack prototype

This study replaces the previous staff-swing experiment with a casting stance. Heroes are stationary. Isis attacks by firing a laser from her staff, never by hitting with it. Her ultimate also uses a laser; this study covers only the normal attack.

Open `index.html` to play, pause or step the animation; effects and attachment markers can be toggled independently.

## Assets

- `isis-cast-master.png`: 2048 × 2048 transparent master, rescaled from the preserved generated source. Full silhouette occupies approximately 60% of canvas height, with space for movement. Flattened character image, not a layered skeletal rig.
- `isis-cast-input.png`: 256 × 256 PixelLab input with the same framing.
- `isis-laser.png`: independent 1536 × 512 transparent beam. Its emitter lies approximately 10.3% from the left edge at the vertical center. Preview compensates for that offset when attaching it to the staff crystal.
- `*-source.png`: original generated assets, preserved untouched.
- `prompts.json`: exact built-in image_gen prompts and generation-source paths. Character uses our own previously generated Isis design as reference.
- `animation-prompts.json`: stationary charge/release prompt for the existing PixelLab CLI pipeline. Raw animation frames and resumable job IDs are in `animation/`.

## Preview technique

One manually specified crystal position per generated frame anchors the effect. A small procedural charging ring is drawn in rear and front passes with the character between them. The separate beam image is emitted during release and fades in recovery. The beam remains outside the character asset, so its range need not fit inside the 256-pixel animation canvas.

The preview is a prototype, with a fixed beam direction and illustrative timing. Final targeting should compute the angle and length from the tracked emitter to the enemy. It has no gameplay connection and changes no enemies or production game files. This is not an ultimate animation or a finished rig.

## Current status

Image assets and still-pose VFX preview are complete. PixelLab job remained processing after more than 12 minutes. Animation quality, stationary feet and per-frame emitter tracking are NOT verified. Preview falls back to the still image; provisional attachment coordinates match that still, not yet generated frames. A generated clip must be reviewed before use. Resume the saved job without submitting a duplicate:

```sh
node scripts/td-pixellab-clips.mjs --still artifacts/isis-laser-study-v1/isis-cast-input.png --prompts artifacts/isis-laser-study-v1/animation-prompts.json --out artifacts/isis-laser-study-v1/animation --only attack
```

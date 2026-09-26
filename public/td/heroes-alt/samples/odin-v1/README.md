# Odin — first static hero sample

Original Odin artwork for the proposed `zeus` replacement slot. Created with the built-in image generation tool; the exact prompt is in [PROMPT.md](PROMPT.md). These are review assets, not wired into the running game.

## Reference inspected

The locally cached Zeus portrait (`.cache/td-token-src/zeus.webp`) is a 2514 × 6144 transparent WebP: tall, mostly frontal standing figure with a slight torso turn and prominent upper body. The existing board token is a transparent 192 × 192 head-and-shoulders crop. `scripts/create-hero-image-variants.mjs` defines the 96 × 96 top-cropped thumbnail and proportional cards at widths 240, 360, and 480. The existing idle strip is 3840 × 160 (24 frames); this sample creates static assets only.

## Files

| File | Size | Purpose |
|---|---|---|
| `source.png` | 802 × 1960 | Original generated source with alpha |
| `odin.webp` | 2514 × 6144 | Master matching Zeus's canvas dimensions |
| `cards/odin-240.webp` | 240 × 587 | Small card |
| `cards/odin-360.webp` | 360 × 880 | Medium card |
| `cards/odin-480.webp` | 480 × 1173 | Large card |
| `thumbs/odin-96.webp` | 96 × 96 | Top-cropped roster thumbnail |
| `tokens/odin-v1.webp` | 192 × 192 | Face-centered board token |

All image exports retain transparency. The master is upscaled from the generated source, not native 6K artwork. Resizing preserves proportions with transparent padding. Card and thumbnail exports follow the existing variant settings; the token uses the existing token size and compression settings with a manual crop suited to Odin's hat and ravens.

The portrait matches the old asset's layout and standing pose broadly while giving Odin his own aged face, practical clothing, spear, hat, and ravens. It is a calmer pose and more subdued palette than Zeus. The spear tip reaches the upper edge; a later art revision can add breathing room if desired.

Re-export with `node public/td/heroes-alt/samples/odin-v1/export.mjs`. Crop coordinates and verified output dimensions are recorded in `manifest.json`. No original hero assets, crop configuration, animation, or database entries have been replaced. These files have not been uploaded to R2.

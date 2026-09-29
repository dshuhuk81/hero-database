# Monster boss sprites — v1

Three original boss stills for The Last Crossing, created with the built-in image_gen tool from text prompts. Exact prompts are in `prompts.json`. Art direction follows the existing TD monster sprite specification: detailed painted dark fantasy, right-facing three-quarter tactical view, complete bodies and readable silhouettes.

| Boss | PixelLab input: 256 × 256 RGBA PNG | Matching lossless WebP |
|---|---|---|
| Lerna, the Root-Maw | [boss_lerna.png](boss_lerna.png) | [boss-lerna-v1.webp](boss-lerna-v1.webp) |
| Kraghorn, the Broken Tusk | [boss_kraghorn.png](boss_kraghorn.png) | [boss-kraghorn-v1.webp](boss-kraghorn-v1.webp) |
| Vorruk, the Hollow Hunger | [boss_vorruk.png](boss_vorruk.png) | [boss-vorruk-v1.webp](boss-vorruk-v1.webp) |

Original larger generations are preserved as `lerna-source.png`, `kraghorn-source.png`, and `vorruk-source.png`. Each final subject fits within 205 × 205 pixels (80% of the canvas), centered horizontally, with its lowest contact point at approximately y=230 (90% height). The remaining transparent space supports later animation. See `manifest.json` for actual source dimensions, crop bounds and placement.

## Animation intent

These are complete single-layer idle reference images, not layered rigs or animation sheets. Limbs on the far side naturally overlap parts of the torso. PixelLab animation quality still needs to be tested.

- **Lerna:** keep exactly three heads and four legs. Start with breathing, small independent neck sways and a slow alternating walk; hold the torso proportions and head identities stable. Animate one biting head at a time so necks remain readable. The thin root texture belongs to the hide and should not become extra limbs.
- **Kraghorn:** keep four cloven hooves, one intact tusk and one broken tusk. Use a heavy alternating gait with shoulder motion; stone plates follow the torso while the legs flex beneath them. Begin the charge from a head-lowering anticipation. Do not add flying rubble to idle or walk.
- **Vorruk:** keep one continuous segmented body and four mandibles. Use a small travelling body contraction and gentle neck sway for idle/walk. Mandibles hinge independently. The source shows the full body above ground; burrowing and emergence require dedicated clips, rather than a permanent sand mound.

Keep the canvas, character scale, facing direction and contact baseline fixed across frames. For loops, use the same still as the first/last pose where the existing animation workflow supports it. Keep dust, poison pools, shockwaves and targeting markers separate from the body animation. Check every clip for extra/missing limbs, changing head counts, cropped extremities and anchor drift before packing.

## Verification and scope

All six exports decode at exactly 256 × 256 with alpha and fully transparent corners. Final PNGs were visually checked at output size. No backgrounds or shadows are baked into the sprites. Re-export with `node artifacts/td-bosses-v1/export.mjs`; once copied, local sources suffice.

No PixelLab job was run, no animation was produced, and these files have not been wired into boss selection or uploaded. They are local artwork deliverables. The existing enemy build script does not yet map these three boss IDs; integration is a separate step.

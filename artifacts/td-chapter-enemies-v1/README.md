# Chapter 2–3 enemy sprites

Created 2026-10-06 with built-in image_gen from the user-provided text prompts and shared style block. Exact prompts: `prompts.json`.

| PNG | Enemy | Chapter |
| --- | --- | --- |
| burrower.png | Wüstengräber | 2 |
| vinebinder.png | Dschungel-Würger | 3 |
| jaguar.png | Jaguar | 3 |
| sporeling.png | Sporeling | 3 |

Each deliverable is a 256 × 256 RGBA PNG with genuine transparency. Full-resolution generated originals are preserved as `*-source.png`. Export uses alpha trim, proportional containment within 204 × 204 pixels, and 26 pixels of transparent padding on each side. No background removal or painted-content alterations were applied.

All creatures face right in a slight three-quarter top-down view. These are single-frame animation inputs, not animated sprite sheets; PixelLab animation has not been tested. For animation, use the source PNGs and retain consistent scale and anchors across frames. No runtime mappings were changed. Dimensions, alpha and transparent export margins were verified; see `manifest.json`.

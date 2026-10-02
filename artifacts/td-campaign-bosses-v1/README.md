# Campaign boss artwork — v1

Eight original boss artworks for The Last Crossing. Concepts approved by the owner on October 2, 2026 in `TOWER_DEFENSE_CAMPAIGN_BOSS_CONCEPTS.md`. Stills created with the built-in `image_gen` tool: eight initial generations and two framing corrections (Thyrak's antler and Astreon's tail). The owner subsequently requested five PixelLab clips per boss; the first pass is in [the animation review viewer](animation-review/index.html), with [inspection notes](animation-review/REVIEW.md).

## Artwork files

| Chapter | Boss | Transparent 256 × 256 PNG | Lossless WebP | Larger source |
|---|---|---|---|---|
| 4 | Skeld, the Oathfrost | [PNG](boss_skeld.png) | [WebP](boss-skeld-v1.webp) | [Source](skeld-source.png) |
| 6 | Thyrak, the Storm Antler | [PNG](boss_thyrak.png) | [WebP](boss-thyrak-v1.webp) | [Source](thyrak-source.png) |
| 7 | Neressa, the Undertow Queen | [PNG](boss_neressa.png) | [WebP](boss-neressa-v1.webp) | [Source](neressa-source.png) |
| 8 | Morthul, the Bitter Bloom | [PNG](boss_morthul.png) | [WebP](boss-morthul-v1.webp) | [Source](morthul-source.png) |
| 9 | Ilyr, the Broken Reflection | [PNG](boss_ilyr.png) | [WebP](boss-ilyr-v1.webp) | [Source](ilyr-source.png) |
| 10 | Eidros, the Last Bell | [PNG](boss_eidros.png) | [WebP](boss-eidros-v1.webp) | [Source](eidros-source.png) |
| 12 | Astreon, the Hollow Star | [PNG](boss_astreon.png) | [WebP](boss-astreon-v1.webp) | [Source](astreon-source.png) |
| 13 | Brontax, the Brass Adjudicator | [PNG](boss_brontax.png) | [WebP](boss-brontax-v1.webp) | [Source](brontax-source.png) |

Exact text-led generation prompts: [prompts.json](prompts.json). Exact framing correction prompts and inputs: [framing-edits.json](framing-edits.json). Source provenance: [generation-sources.json](generation-sources.json). Export sizes, crops and placement: [manifest.json](manifest.json).

The sources retain the generated alpha channel. PNGs and WebPs fit each complete subject inside a 205 × 205 region on a transparent 256 × 256 canvas, with the lowest contact point at y=230. Export uses the existing three-boss fitting convention. `node artifacts/td-campaign-bosses-v1/export.mjs` reproduces exports from the copied local sources; do not use it to overwrite a published asset version.

## Inspection and later animation

All eight sources and all eight PNG exports were visually inspected. Each has a distinct right-facing silhouette, complete extremities and no baked terrain or attack zones. Final PNG/WebP dimensions and transparent corners were checked. The far-side limbs naturally overlap in the three-quarter view. The owner approved all 40 animation clips on October 2, 2026, including the documented first-pass artifacts; no correction reruns are requested.

Preserve the anatomy in later clips: Skeld four legs and three shell pillars; Thyrak four hooved legs and two antlers; Neressa six walking legs and two pincers; Morthul four limbs and its folded three-lobed cap; Ilyr two fins and one tail; Eidros two arms/two legs with bell and reliquary; Astreon four paws and one tail; Brontax two arms/two legs and two exhaust pipes. Keep gesture effects separate from the body frames.

## Handoff boundary

The concept, still artwork and animation pass are complete and owner-approved. The stills and animation sheets were copied into `public/td/enemies/`, registered by the runtime, uploaded to R2, and assigned chapter-wide through `tdMaps.json` on October 2, 2026. The bosses intentionally use standard boss combat behavior; proposed specials and ultimates were descoped. No game tests or production build were performed.

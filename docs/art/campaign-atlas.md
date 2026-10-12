# Campaign atlas art direction

All thirteen authored campaign chapters now have a production atlas background. The art uses one shared visual grammar: a 16:9 elevated three-quarter view, a continuous route, readable landmarks, dark heroic-fantasy materials, cool environmental light, and small warm navigation lights. Interface text, stage pins, state icons, routes, rewards, and the travelling camp remain DOM layers so progress stays accessible and never becomes baked into the art.

The generated set is collected in [`campaign-atlas-overview.webp`](campaign-atlas-overview.webp). Source-ready WebP files live in `public/td/campaign/` at 2048×1152, quality 88. The twelve new chapter files total about 7 MiB and load only when their chapter is active.

## Asset inventory

| Chapter | Campaign | Asset | Initial stage coordinates (%) |
| --- | --- | --- | --- |
| 1 | The Road to the Crossing | `road-to-crossing.webp` | `12,78 · 28,66 · 39,55 · 24,49 · 48,28 · 62,38 · 79,45 · 74,27 · 86,22 · 94,17` |
| 2 | The Sunscar March | `sunscar-march.webp` | `10,74 · 25,53 · 48,57 · 55,34 · 79,27 · 92,20` |
| 3 | The Emerald Deep | `emerald-deep.webp` | `9,69 · 28,56 · 48,51 · 66,35 · 78,47 · 92,16` |
| 4 | The Frozen Covenant | `frozen-covenant-v2.webp` | `10,64 · 29,48 · 47,50 · 60,29 · 77,43 · 90,25` |
| 5 | The Cinder Oath | `cinder-oath.webp` | `10,68 · 27,56 · 45,35 · 58,55 · 75,37 · 91,16` |
| 6 | The Thunder Stair | `thunder-stair.webp` | `8,65 · 31,56 · 51,38 · 65,28 · 78,20 · 91,11` |
| 7 | The Drowned Crown | `drowned-crown.webp` | `9,69 · 27,57 · 46,43 · 62,37 · 77,44 · 91,14` |
| 8 | The Spore Lanterns | `spore-lanterns.webp` | `8,72 · 28,62 · 46,40 · 62,29 · 78,24 · 91,14` |
| 9 | The Shattered Prism | `shattered-prism.webp` | `9,71 · 27,60 · 46,42 · 62,31 · 78,30 · 91,12` |
| 10 | The Silent Procession | `silent-procession.webp` | `10,74 · 30,61 · 47,42 · 62,27 · 78,40 · 92,13` |
| 11 | The Last Harvest | `last-harvest.webp` | `10,74 · 28,60 · 48,46 · 63,34 · 78,23 · 91,12` |
| 12 | The Astral Meridian | `astral-meridian.webp` | `10,69 · 29,55 · 45,42 · 61,32 · 76,28 · 91,14` |
| 13 | The Brass Reckoning | `brass-reckoning.webp` | `9,72 · 28,59 · 46,43 · 62,35 · 77,27 · 91,13` |

Coordinates are the authored starting values for the DOM overlay. The implementation pass may move an individual point by up to four percentage points to avoid a label collision, but must keep the stage attached to its named landmark and preserve route order.

## Shared generation contract

The twelve new assets were generated with the built-in Imagegen tool using the `stylized-concept` use case. Every prompt requested a production campaign atlas background in landscape 16:9, elevated three-quarter bird's-eye perspective, realistic painterly AAA dark fantasy treatment, a continuous route through the chapter's named landmarks, and generous clear space for UI markers. Every prompt prohibited interface elements, text, letters, numbers, icons, markers, characters, and watermarks.

Chapter-specific prompt subjects were:

- Chapter 1: frontier watch, green road, beast ravine, shield wall, horned gate, hexfire shrine, twin gates, brood hollow, eve camp, final river crossing.
- Chapter 2: dry basin, black glass dunes, serpent wells, scorched brood nest, mirage gate, throne of ash.
- Chapter 3: canopy pass, root maze, flooded court, jaguar steps, serpent ruins, luminous heart temple.
- Chapter 5: coal gate, copper descent, furnace court, ember locks, cinder circuit, forge heart.
- Chapter 6: cloud gate, thunder steps, rain court, windbreak fortress, lightning coil, storm crown.
- Chapter 7: coral gate, tidal causeway, pearl court, sunken bells, undertow, drowned throne.
- Chapter 8: spore gate, lantern roots, fungal court, bloom chambers, mycelial coil, spore heart.
- Chapter 9: quartz gate, prism steps, facet court, resonance hall, mirror coil, crystal crown.
- Chapter 10: mourning gate, bone road, silent court, wraith watch, funeral coil, grave throne.
- Chapter 11: amber gate, maple road, harvest court, falling-leaf terraces, golden hedge coil, last orchard.
- Chapter 12: star gate, moon observatory, astral court, orbit hall, comet coil, zenith crown.
- Chapter 13: brass gate, gearway, piston court, steam locks, escapement, clockwork heart.

Asset: `public/td/campaign/frozen-covenant-v2.webp`. The original generated image remains at `frozen-covenant.webp`; V2 normalizes it non-destructively to the shared 2048×1152 WebP contract. No dependencies were added.

## Generation prompt

Use case: stylized-concept. Create a production background asset for a dark fantasy campaign stage selection map, landscape 16:9. No interface, no text, no letters, no numbers, no markers. Rich realistic painterly textures matching a moonlit heroic fantasy campsite: blue moonlight, ancient carved stone, tiny amber fires. Elevated bird's eye view over a continuous snowy alpine valley, map-like and readable, no close-up foreground. Six landmarks connected by a winding snow trail, these exact approximate image percentage centers: (12%,68%) ancient white gate and small warm expedition camp, (28%,43%) stone causeway across ravine, (45%,58%) circular glacier courtyard, (61%,32%) rune ruins, (76%,48%) winding icy pass, (89%,23%) tall imposing covenant spire fortress. Trail progresses through those six places in order. Frozen river, snow-covered pines, glaciers, steep textured mountains, soft mist at outer edges. Keep each landmark distinct and trail visually legible. Detailed cinematic game environment illustration, restrained luminous teal ice and golden fire, generous landscape space around landmarks. Absolutely no UI or baked in labels.

## Chapter 4 reference implementation

`renderStages()` in `src/game/td/page/campaign.ts` overlays real stage buttons and route segments on the image. Coordinates were adjusted to the resulting landmarks. All unlocks, laurels, details, and squad selection use existing campaign logic. Narrow screens scroll the coordinate plane horizontally; portrait details open as a bottom sheet. Reduced-motion preferences disable ambient animation.

## Campfire marker

Asset: `public/td/campaign/campfire.webp`. Generated with built-in Imagegen as a transparent PNG, trimmed and encoded with the existing Sharp installation to 256px WebP (alpha preserved). The rendered marker uses a separate animated ground glow and three drifting sparks; reduced-motion mode keeps the image still and removes those animations.

Prompt: Use case: stylized-concept. Production transparent game sprite: a single small realistic dark fantasy campfire viewed from elevated three-quarter bird's-eye perspective, matching a richly painted snowy moonlit fantasy campaign map. Weathered irregular charcoal-grey stone fire ring, crossed textured charred wooden logs, deep red glowing embers, several delicate semi-transparent orange flames with pale golden cores, a few fine sparks. Sophisticated painterly realistic AAA environment asset, natural asymmetry, detailed physically convincing materials, cold blue highlights on stone, warm firelight on logs. Compact readable silhouette at 60 pixels tall. Fire fills most of canvas with modest transparent margin; centered square composition. Isolated object on genuinely transparent background. No ground plane, no scenery, no snow patch, no icon border, no text, no cartoon, no flat vector shapes, no giant bonfire, no thick smoke. Preserve transparent negative space between flames.

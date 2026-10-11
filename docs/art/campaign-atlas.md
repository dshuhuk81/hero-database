# Campaign atlas — Chapter 4

The Frozen Covenant is the first playable atlas chapter. Other chapters retain their card selector until they have authored landscape art and landmark coordinates.

Asset: `public/td/campaign/frozen-covenant.webp` (478 KiB). Generated with the built-in Imagegen tool, then encoded as WebP quality 88 using the existing Sharp installation. No dependencies added.

## Generation prompt

Use case: stylized-concept. Create a production background asset for a dark fantasy campaign stage selection map, landscape 16:9. No interface, no text, no letters, no numbers, no markers. Rich realistic painterly textures matching a moonlit heroic fantasy campsite: blue moonlight, ancient carved stone, tiny amber fires. Elevated bird's eye view over a continuous snowy alpine valley, map-like and readable, no close-up foreground. Six landmarks connected by a winding snow trail, these exact approximate image percentage centers: (12%,68%) ancient white gate and small warm expedition camp, (28%,43%) stone causeway across ravine, (45%,58%) circular glacier courtyard, (61%,32%) rune ruins, (76%,48%) winding icy pass, (89%,23%) tall imposing covenant spire fortress. Trail progresses through those six places in order. Frozen river, snow-covered pines, glaciers, steep textured mountains, soft mist at outer edges. Keep each landmark distinct and trail visually legible. Detailed cinematic game environment illustration, restrained luminous teal ice and golden fire, generous landscape space around landmarks. Absolutely no UI or baked in labels.

## Integration

`renderStages()` in `src/game/td/page/campaign.ts` overlays real stage buttons and route segments on the image. Coordinates were adjusted to the resulting landmarks. All unlocks, laurels, details, and squad selection use existing campaign logic. Narrow screens scroll the coordinate plane horizontally; portrait details open as a bottom sheet. Reduced-motion preferences disable ambient animation.

## Campfire marker

Asset: `public/td/campaign/campfire.webp`. Generated with built-in Imagegen as a transparent PNG, trimmed and encoded with the existing Sharp installation to 256px WebP (alpha preserved). The rendered marker uses a separate animated ground glow and three drifting sparks; reduced-motion mode keeps the image still and removes those animations.

Prompt: Use case: stylized-concept. Production transparent game sprite: a single small realistic dark fantasy campfire viewed from elevated three-quarter bird's-eye perspective, matching a richly painted snowy moonlit fantasy campaign map. Weathered irregular charcoal-grey stone fire ring, crossed textured charred wooden logs, deep red glowing embers, several delicate semi-transparent orange flames with pale golden cores, a few fine sparks. Sophisticated painterly realistic AAA environment asset, natural asymmetry, detailed physically convincing materials, cold blue highlights on stone, warm firelight on logs. Compact readable silhouette at 60 pixels tall. Fire fills most of canvas with modest transparent margin; centered square composition. Isolated object on genuinely transparent background. No ground plane, no scenery, no snow patch, no icon border, no text, no cartoon, no flat vector shapes, no giant bonfire, no thick smoke. Preserve transparent negative space between flames.

# Tower Defense mythology group icons

The seven mythology group emblems were generated on 2026-10-05 with the built-in ImageGen tool and are kept as transparent source PNGs under `assets/td/mythology-groups/`. The deterministic exporter `scripts/build-td-mythology-icons.mjs` trims and centers each source on a 128×128 transparent canvas and writes the versioned WebP used by the game.

Run:

```sh
npm run build:td-mythology-icons
```

Export settings: 112×112 maximum visible artwork, centered on 128×128 transparent RGBA, WebP quality 88, alpha quality 100.

## Source mapping

| Group | Source | Runtime asset |
| --- | --- | --- |
| Greek | `assets/td/mythology-groups/greek-source.png` | `public/td/icons/mythology/greek-v1.webp` |
| Norse | `assets/td/mythology-groups/norse-source.png` | `public/td/icons/mythology/norse-v1.webp` |
| Egyptian | `assets/td/mythology-groups/egyptian-source.png` | `public/td/icons/mythology/egyptian-v1.webp` |
| Elder Powers | `assets/td/mythology-groups/elder-powers-source.png` | `public/td/icons/mythology/elder-powers-v1.webp` |
| Underworld | `assets/td/mythology-groups/underworld-source.png` | `public/td/icons/mythology/underworld-v1.webp` |
| Wildborn | `assets/td/mythology-groups/wildborn-source.png` | `public/td/icons/mythology/wildborn-v1.webp` |
| Divine Guardians | `assets/td/mythology-groups/divine-guardians-source.png` | `public/td/icons/mythology/divine-guardians-v1.webp` |

The original ImageGen outputs were stored in `/Users/daschultheiss/.codex/generated_images/01a10d24-c028-7e72-9c50-da2af58a7fad` during creation. The checked-in source PNGs are the durable project inputs.

## Prompt recipe

Shared prompt:

> Use case: logo-brand. Asset type: production 128px mythology-group emblem for a premium painterly fantasy tower-defense interface. Create one mythology-group emblem using the subject below. Detailed hand-painted fantasy game UI icon, dimensional engraved metal and stone, coherent with a premium mythic mobile strategy game; strong iconic silhouette readable at 32px. Centered square emblem, isolated object, balanced symmetry where natural, generous transparent margin, all details inside canvas. Soft upper-left rim light, dignified ancient power, restrained glow. Genuinely transparent alpha background; exactly one emblem; no text, letters, numbers, character, face, creature body, scenery, rectangular plate, circular coin background, border frame, drop shadow outside the emblem, watermark, or contact sheet.

Group subjects:

- Greek: an elegant broken golden laurel wreath enclosing a compact white-marble Ionic column capital crossed by one restrained lightning stroke; warm ivory and antique gold accents.
- Norse: an angular silver-blue world-tree rune woven into restrained Norse knotwork, with a small spear-point axis; cold steel, slate blue and antique gold accents.
- Egyptian: a symmetrical winged solar disc combined with a compact scarab silhouette; lapis blue, sun gold and restrained turquoise accents.
- Elder Powers: a cracked ancient cosmic disc rising behind a primordial mountain peak, subtle star fissures; amethyst, obsidian and antique gold accents.
- Underworld: a narrow ancient underworld gate holding one cold violet-blue flame, subtle downward crescent; charcoal, deep violet and tarnished gold accents.
- Wildborn: a strong claw mark interlocked with a small antler branch and two leaves; forest green, weathered bone and antique gold accents.
- Divine Guardians: a compact upright shield crowned by a clean radiant halo, subtle protective wings; pale cyan, silver and antique gold accents.

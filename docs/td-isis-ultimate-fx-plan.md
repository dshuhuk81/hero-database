# Isis ultimate: particle effect plan

Hero: `isis` (Lord, Mage). Ultimate: Light of the Hidden Sun (`sun_beam`). One beam along her
row, left or right only, 100% to up to 8 enemies (12 awakened).

## State today

A procedural version is live in `src/game/td/hero-fx.js` (`ULTS.isis`, `SHOTS.isis`,
`IMPACTS.isis`, helpers `sunBeam` and `sunFlare`). It uses only the existing fx-kit textures
(`glow`, `twinkle`, `feather`, `dot`) and shapes, so it needs no new files and works with
reduced motion. This plan covers the generated art that replaces or enriches it.

Rules that apply (`docs/td-asset-pipeline.md`, memory "PixelLab clips without effects"):
the character clips stay pure motion; every effect is drawn by the renderer from the sprites
below. Effects never change combat timing.

## Timeline (seconds from the `ult` event)

| t | Layer | What the player sees |
|---|---|---|
| 0.00 | Charge | Solar disc over her crown flares (`sunFlare`, 8 spokes), ground ring at her feet |
| 0.10 | Muzzle | Second flare at the staff head, on the side the beam will go |
| 0.14 | Beam | Wide gold beam sweeps out along the row to the end of her line (about 0.1 s to full length), holds, thins out by 0.7 |
| 0.20 | Core | Slim white second pass inside the beam |
| 0.16 to 0.30 | Hits | For each struck enemy, in order of distance: sunburst, ground ring, rising light motes |
| 0.16 to 0.9 | Drift | Golden feathers and light motes stream along the line in the beam direction and fall away |
| awakened | Extra | Two thin side beams 7 px above and below the main one |

The gameplay hit lands at t = 0 (the sim has already applied damage); all visuals are lead-in
and aftermath. Keep the whole effect under 0.9 s so the 18 s cast cycle stays readable.

## What to generate

Small sprites, one file each, drawn on a transparent 64 px square or strip, white or gold
tinted so the kit can recolor them (`tint`). Generate with PixelLab (`create_image_pixflux` or
`create_object_pro_flash`, "pixel art, glowing gold light, transparent background, no
character"), clean up with `pixelart_workbench`, then paint the final set into
`paintTextures` in `src/game/td/fx-kit.js` (or load them as images from `td/fx/` on R2).

| Texture | Size | Use | Notes |
|---|---|---|---|
| `sunray` | 64 x 8, tileable in x | Beam body, repeated along the line, scrolling 600 px/s | Hot white center, gold edge. Replaces the stroked lines in `sunBeam` |
| `suncap` | 32 x 32 | Beam start and end flares | Round bloom with a faint ring |
| `sunspoke` | 16 x 48 | The 8 spokes of the disc flare (rotate around the center) | Tapered, bright at the base |
| `ankhglint` | 24 x 24 | Small ankh-shaped sparkle for the motes drifting along the beam | Reads as a cross with a loop at 8 px |
| `lightfeather` | 16 x 48 | Wing-feather of light (existing `feather` recolored is the fallback) | Pale gold, soft edge |

Five sprites, about 6 to 10 PixelLab generations including retries. Check each on the dark and
the bright board themes: nothing may look like a damage number or a status icon.

## Hooks

- Texture painting: `paintTextures(PIXI)` in `src/game/td/fx-kit.js`; spawn with
  `kit.spawn("sunray", x, y, { tint, size, stretch, rot, ... })`.
- Beam body: swap the three stroked lines in `sunBeam` for a `sunray` strip stretched to
  `length` px with `stretch`, keeping the swell envelope.
- Event data the effect reads (already emitted by `castUltimate`): `beamDir` (-1 or 1),
  `beamLength` (px), `beamHits` (list of `{ x, y }`), `awakened`.
- Basic attack: `SHOTS.isis` draws the same beam thin (width 4, 0.22 s) to the last enemy hit.
- Lord bonus ticks use the generic `buff` effect (`stepLord` emits it per faction member); a
  gold sun-ring variant for it is optional.

## Acceptance

1. In the dev game with `?figures=lab` or a normal run, cast the ultimate facing left and
   facing right: the beam starts at the staff side, never goes up or down.
2. 8 enemies on the row: one sunburst per enemy, none on enemies off the row.
3. Reduced motion: beam appears at full length instantly, no long particle streams.
4. 60 fps on the tilted boards with three Isis casts in a row (particle cap in `fx-kit`
   `max = 900` is not hit).
5. `node scripts/test-td-ui.mjs` still passes (it loads `hero-fx.js`).

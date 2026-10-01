# Mythic hero review set v1

**Complete first-pass static roster: 21 / 21 heroes, 147 images in this one folder.**

Odin and the first four samples are retained; 16 additional heroes complete the roster. See [STATUS.md](STATUS.md) for the completed checklist and remaining production work.

All originals were generated with the built-in `image_gen` tool. Exact prompts are saved in [ODIN-PROMPT.md](ODIN-PROMPT.md), [PROMPTS.md](PROMPTS.md), and [BATCH-2-PROMPTS.json](BATCH-2-PROMPTS.json). Existing game images were not supplied to the generator; Zeus was inspected to establish asset framing and export requirements.

## Roster

| Hero | Intended internal slot | Full portrait | Board token |
|---|---|---|---|
| Odin | `odin` | [odin.webp](odin.webp) | [odin-token-192.webp](odin-token-192.webp) |
| Atlas | `atlas` | [atlas.webp](atlas.webp) | [atlas-token-192.webp](atlas-token-192.webp) |
| Skadi | `skadi` | [skadi.webp](skadi.webp) | [skadi-token-192.webp](skadi-token-192.webp) |
| Hecate | `hecate` | [hecate.webp](hecate.webp) | [hecate-token-192.webp](hecate-token-192.webp) |
| Hephaestus | `hephaestus` | [hephaestus.webp](hephaestus.webp) | [hephaestus-token-192.webp](hephaestus-token-192.webp) |
| Ymir | `ymir` | [ymir.webp](ymir.webp) | [ymir-token-192.webp](ymir-token-192.webp) |
| Heimdall | `heimdall` | [heimdall.webp](heimdall.webp) | [heimdall-token-192.webp](heimdall-token-192.webp) |
| Gaia | `gaia` | [gaia.webp](gaia.webp) | [gaia-token-192.webp](gaia-token-192.webp) |
| Aegir | `aegir` | [aegir.webp](aegir.webp) | [aegir-token-192.webp](aegir-token-192.webp) |
| Helios | `helios` | [helios.webp](helios.webp) | [helios-token-192.webp](helios-token-192.webp) |
| Surtr | `surtr` | [surtr.webp](surtr.webp) | [surtr-token-192.webp](surtr-token-192.webp) |
| Fenrir | `fenrir` | [fenrir.webp](fenrir.webp) | [fenrir-token-192.webp](fenrir-token-192.webp) |
| Nott | `nott` | [nott.webp](nott.webp) | [nott-token-192.webp](nott-token-192.webp) |
| Vidar | `vidar` | [vidar.webp](vidar.webp) | [vidar-token-192.webp](vidar-token-192.webp) |
| Thanatos | `thanatos` | [thanatos.webp](thanatos.webp) | [thanatos-token-192.webp](thanatos-token-192.webp) |
| Boreas | `boreas` | [boreas.webp](boreas.webp) | [boreas-token-192.webp](boreas-token-192.webp) |
| Atalanta | `atalanta` | [atalanta.webp](atalanta.webp) | [atalanta-token-192.webp](atalanta-token-192.webp) |
| Stheno | `stheno` | [stheno.webp](stheno.webp) | [stheno-token-192.webp](stheno-token-192.webp) |
| Plutus | `plutus` | [plutus.webp](plutus.webp) | [plutus-token-192.webp](plutus-token-192.webp) |
| Harmonia | `harmonia` | [harmonia.webp](harmonia.webp) | [harmonia-token-192.webp](harmonia-token-192.webp) |
| Asclepius | `asclepius` | [asclepius.webp](asclepius.webp) | [asclepius-token-192.webp](asclepius-token-192.webp) |

## Files per hero

- `{hero}-source.png`: original generation with alpha; native dimensions recorded in the manifest.
- `{hero}.webp`: 2514 × 6144 transparent master, matching Zeus's canvas.
- `{hero}-card-240.webp`: 240 × 587.
- `{hero}-card-360.webp`: 360 × 880.
- `{hero}-card-480.webp`: 480 × 1173.
- `{hero}-thumb-96.webp`: 96 × 96 top-cropped thumbnail.
- `{hero}-token-192.webp`: 192 × 192 bust crop; Fenrir uses a wider crop to include his ears.

These large masters are upscaled, not native 6K artwork. [manifest.json](manifest.json) records source sizes, slot mappings, token crops and export dimensions. Card and thumbnail dimensions follow the old asset pipeline, while costumes and characters are newly generated.

## Re-export

For the first five heroes: `node public/td/heroes-alt/review-set-v1/export.mjs`.

For any of the 16 additions, for example: `node public/td/heroes-alt/review-set-v1/add-hero.mjs fenrir`. This reads the source already in this folder. Export scripts preserve other heroes' manifest entries. They regenerate local derivatives only; they do not generate new AI artwork or upload anything.

## Review notes

All 21 source images and 126 WebPs exist; the roster matches the 21 internal TD IDs. Source transparency and export alpha channels were checked, along with all export dimensions. Portraits and 192 px token crops were visually inspected.

These are first-pass review assets. Some original framing remains tight around equipment or cloth, particularly Atlas's arch, Skadi's bow, Hecate's lamp glow and Stheno's bow. Several male faces have similar proportions; identity differentiation can be strengthened in a later art review. Fenrir uses a quadruped wolf interpretation in place of the earlier humanoid-wolf image brief.

No animation strips were generated. These files have not replaced the original hero database art, been wired into the game, or been uploaded to R2.

## Odin alternative — v2

[Odin v2 portrait](odin-v2.webp) follows the user's supplied visual reference: hatless, long grey hair, fur mantle, rust-red cloak, prominent spear and two ravens. It is saved alongside the original Odin. There are seven additional image files under `odin-v2*`: native source, upscaled 2514 × 6144 WebP, three cards, a face-centered 96 px thumbnail and a 192 px token. The raised wing is retained in the full portrait; the token prioritizes the face.

See [ODIN-V2-PROMPT.md](ODIN-V2-PROMPT.md) for the exact built-in generation prompt, `odin-v2-manifest.json` for export metadata, and `export-odin-v2.mjs` to reproduce exports. The original 21-hero manifest is unchanged; this is an alternate appearance for the same Odin slot.

**In game since 2026-09-29:** card, thumb and token copied to `../odin-v2-*.webp`, idle loop rendered to `../anims/odin-idle-v2.webp` (`scripts/td-idle-anim.py`), uploaded to R2, and `tdSkinMythic.json` sets `"art": "v2"` for `odin`.

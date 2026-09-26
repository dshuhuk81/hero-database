# Mythic hero review set v1

**Complete first-pass static roster: 21 / 21 heroes, 147 images in this one folder.**

Odin and the first four samples are retained; 16 additional heroes complete the roster. See [STATUS.md](STATUS.md) for the completed checklist and remaining production work.

All originals were generated with the built-in `image_gen` tool. Exact prompts are saved in [ODIN-PROMPT.md](ODIN-PROMPT.md), [PROMPTS.md](PROMPTS.md), and [BATCH-2-PROMPTS.json](BATCH-2-PROMPTS.json). Existing game images were not supplied to the generator; Zeus was inspected to establish asset framing and export requirements.

## Roster

| Hero | Intended internal slot | Full portrait | Board token |
|---|---|---|---|
| Odin | `zeus` | [odin.webp](odin.webp) | [odin-token-192.webp](odin-token-192.webp) |
| Atlas | `nuwa` | [atlas.webp](atlas.webp) | [atlas-token-192.webp](atlas-token-192.webp) |
| Skadi | `diana` | [skadi.webp](skadi.webp) | [skadi-token-192.webp](skadi-token-192.webp) |
| Hecate | `bastet` | [hecate.webp](hecate.webp) | [hecate-token-192.webp](hecate-token-192.webp) |
| Hephaestus | `phoenix` | [hephaestus.webp](hephaestus.webp) | [hephaestus-token-192.webp](hephaestus-token-192.webp) |
| Ymir | `prometheus` | [ymir.webp](ymir.webp) | [ymir-token-192.webp](ymir-token-192.webp) |
| Heimdall | `momus` | [heimdall.webp](heimdall.webp) | [heimdall-token-192.webp](heimdall-token-192.webp) |
| Gaia | `demeter` | [gaia.webp](gaia.webp) | [gaia-token-192.webp](gaia-token-192.webp) |
| Aegir | `poseidon` | [aegir.webp](aegir.webp) | [aegir-token-192.webp](aegir-token-192.webp) |
| Helios | `amunra` | [helios.webp](helios.webp) | [helios-token-192.webp](helios-token-192.webp) |
| Surtr | `set` | [surtr.webp](surtr.webp) | [surtr-token-192.webp](surtr-token-192.webp) |
| Fenrir | `jormungandr` | [fenrir.webp](fenrir.webp) | [fenrir-token-192.webp](fenrir-token-192.webp) |
| Nott | `nyx` | [nott.webp](nott.webp) | [nott-token-192.webp](nott-token-192.webp) |
| Vidar | `horus` | [vidar.webp](vidar.webp) | [vidar-token-192.webp](vidar-token-192.webp) |
| Thanatos | `anubis` | [thanatos.webp](thanatos.webp) | [thanatos-token-192.webp](thanatos-token-192.webp) |
| Boreas | `fengyi` | [boreas.webp](boreas.webp) | [boreas-token-192.webp](boreas-token-192.webp) |
| Atalanta | `artemis` | [atalanta.webp](atalanta.webp) | [atalanta-token-192.webp](atalanta-token-192.webp) |
| Stheno | `medusa` | [stheno.webp](stheno.webp) | [stheno-token-192.webp](stheno-token-192.webp) |
| Plutus | `caishen` | [plutus.webp](plutus.webp) | [plutus-token-192.webp](plutus-token-192.webp) |
| Harmonia | `yuelao` | [harmonia.webp](harmonia.webp) | [harmonia-token-192.webp](harmonia-token-192.webp) |
| Asclepius | `freya` | [asclepius.webp](asclepius.webp) | [asclepius-token-192.webp](asclepius-token-192.webp) |

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

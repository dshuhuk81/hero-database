# Campaign boss animations — first-pass review

**Owner approved all 40 clips on October 2, 2026**, including the first-pass findings below. No correction reruns are requested. Eight bosses × five PixelLab clips: idle (4 frames), walk (8), attack (8), hurt (4), death (8), matching the existing boss pipeline. These assets were subsequently registered, assigned and uploaded for the live game.

Open [the animated viewer](index.html). Each boss has an approved still alongside its animation, clip selection, pause, frame stepping and playback speed. Full-size lossless sheets show all frames: rows idle/walk/attack/hurt/death; column 0 is the source, subsequent columns are generated frames. Playback excludes frame 00 following the established pipeline.

## Visual inspection — historical recommendations, superseded by owner approval

| Boss | First-pass findings | Recommended correction |
|---|---|---|
| Skeld | No obvious new color flashes or detached effects in the reviewed clips; death settles the body flat. | Owner review; no immediate rerun flagged. |
| Thyrak | Antlers stay attached, attack lowers the neck, death settles on the ground; no obvious new color flashes. | Owner review; no immediate rerun flagged. |
| Neressa | Shell colors remain close to the still; leg/pincer motion is readable. Death lowers the body while the shell stays upright. | Owner review, including whether death is pronounced enough. |
| Morthul | All five clips keep the mushroom and toad colors close to the source; attack opens the mouth. Death only lowers/slumps the body slightly and still reads much like a living seated toad. | Owner review; consider rerunning death with a clearly flattened, inactive pose. |
| Ilyr | Attack introduces opaque gray/beige patches in the transparent gap around the fin/tail (notably frames 01 and 03). Death is comparatively subtle. | Rerun attack; owner decides whether death needs stronger motion. |
| Eidros | Beige blobs appear around the bell-holding arm: idle 01/02/04, several walk frames, hurt 01/04 and late attack frames 07/08. | Rerun idle, walk, attack and hurt. |
| Astreon | Blue/gold palette stays close to the still; tail and paws move, hurt recoils and death lies flat. | Owner review; no immediate rerun flagged. |
| Brontax | Gray detached puffs appear near the tool hand in walk (notably 06) and early attack. Death 03 adds a large ground patch touching the canvas edge, with stray particles. | Rerun walk, attack and death. |

The immediate correction shortlist is **eight clips**, not all forty. These neutral-colored artifacts can blink during playback even though they are not bright new hues. No universal color filter or pixel erasure was applied: that could remove legitimate bone, crystal or brass highlights. Visual findings are a first-pass assessment, not proof that every anatomy detail is flawless.

## Reproducibility and boundary

- Exact motion/palette/anatomy prompts: [animation-prompts](../animation-prompts/).
- Raw frames and persistent job IDs: `.td-work/pixellab/boss-{id}-v1/`; each clip includes its source frame 00 plus generated frames.
- [frame-audit.json](frame-audit.json) records dimensions, saturated hue coverage, brightness shifts and canvas-edge contact. These checks cannot detect every low-saturation blob, silhouette error or temporal flicker.
- Review sheets preserve the generated pixels and transparency without GIF palette quantization.
- Candidate packed WebP/JSON sheets are under [sheets/painted](sheets/painted/), produced with the existing strip-and-pack scripts. Source frame 00 is dropped. They include known defects and must not be published as approved assets.
- For approved targeted corrections, use `scripts/td-pixellab-clips.mjs --only <clip names>` with a new versioned output directory, retaining this first pass for comparison.

No correction jobs were submitted after this batch; the owner approved it as-is. Runtime registration, public assets, R2 upload and chapter-wide campaign assignments were completed afterward. No game tests or production build were performed.

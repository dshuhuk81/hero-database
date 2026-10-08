# Tower Defense: authored effects

## Decision — 2026-10-08

The user approved the Effekseer comparison visually and requested integration.
Keep PixiJS; Phaser remains the replacement option if this approach stops meeting
visual expectations. No new production dependency or gameplay rule was added.

Local comparison: `/games/tower-defense/fx-lab/` (removed from production and sitemap
by the existing local-only route integration). The page runs its own visual clock
and never opens a combat session or touches saves. Existing map art and hero art
are reused. The approved prototype has A/B selection, individual effect selection,
pause, replay, repeat and speed controls. Reduced-motion users start paused.

## In-game profiles

`src/game/td/authored-fx.js` contains `HERO_ATLAS_FX`:

| Hero | Event | Clip | Width | Opacity | Playback | Existing visuals |
| --- | --- | --- | --- | --- | --- | --- |
| Odin | `ult` | lightning | 245 | 0.72 | 1× | Replaces the old sky strike; chain shots remain dynamic |
| Surtr | `hit` | fire | 76 | 0.75 | 2.5× | Supplement; weapon arc and impact remain |
| Surtr | `ult` | fire | 132 | 0.90 | 1× | Supplement; melee/lifesteal cues remain |
| Heimdall | `buff` | buff | 132 | 0.90 | 1× | Replaces activation particles on the recipient |

Widths are in the game's 960×540 coordinate space. The baked effect stays upright
on tilted maps. Heimdall's clip follows the recipient and stops if that hero dies,
is removed, or its Bifrost ward expires. The existing persistent ward rim still
shows the actual duration after the short activation animation finishes. A visual
flame on Surtr does not create a burning status or alter his physical damage.

Events are consumed once. Animation tails may outlive their short simulation event.
They use the renderer's FX clock (pause, speed, end-of-stage tail), clear on restart,
and release frame wrappers on destroy while retaining shared cached asset sources.
At most 32 authored instances are active. Missing clips, full capacity and reduced
motion preserve baseline effects. Other heroes retain the existing renderer.

For another hero, define: event, effect family/clip, source or recipient anchor,
width, opacity, playback speed, whether it supplements/replaces the old cue, and
whether it follows a live unit. Persistent states must use actual simulation expiry,
never the arbitrary length of the animation. Do not infer mechanics from colors.
Suggested next art families: ice, poison, healing, shadow, water. Cross-check hero
assignments with `gameBalance.tuning.json` and `hero-fx.js` before implementing.

## Assets and provenance

`public/td/fx/effekseer-v1/` contains six WebP atlases and `manifest.json`.
All clips are real Effekseer renders, not procedurally imitated particles.

Source: official [Effekseer 1.80.7 release](https://github.com/effekseer/Effekseer/releases/tag/1807).

- `Sample/01_Pierre01/LightningStrike.efkproj` — Pierre.
- `Sample/01_NextSoft01/MagicFire1.efkproj` — NextSoft. Sound disabled for visual export
  (the archive does not include the referenced `Sound/effects_79.wav`).
- `Sample/01_NextSoft01/PowerUp.efkproj` — NextSoft.

The official sample readme declares all these sample effects CC0. Its original text
is retained beside the generated assets as `SAMPLE-LICENSE.txt`.
The Effekseer runtime, editor and Three.js are offline export tools only; none is
added to the production browser bundle. Production uses the existing PixiJS runtime.

## Reproducing the atlases

1. Download `Effekseer1.80.7Mac-arm64.zip` (or the editor for your OS) and
   `EffekseerForWebGL1.80.7.zip` from that release and extract them outside the repo.
   On macOS copy the app out of its read-only disk image to a writable temporary
   directory; run its CLI from `Effekseer.app/Contents/Resources`.
2. Set `SoundValues/Type` to `0` in a working copy of `MagicFire1.efkproj`.
3. Export each source next to its project, preserving relative texture paths:

   ```sh
   ./Effekseer -cui -in /path/to/Sample/01_Pierre01/LightningStrike.efkproj -e /path/to/Sample/01_Pierre01/LightningStrike.efk
   ./Effekseer -cui -in /path/to/Sample/01_NextSoft01/MagicFire1.efkproj -e /path/to/Sample/01_NextSoft01/MagicFire1.efk
   ./Effekseer -cui -in /path/to/Sample/01_NextSoft01/PowerUp.efkproj -e /path/to/Sample/01_NextSoft01/PowerUp.efk
   ```

4. From the repo root, with an existing Playwright installation:

   ```sh
   node scripts/export-td-effekseer.mjs --samples /path/to/Sample --runtime /path/to/EffekseerForWebGL --playwright /path/to/node_modules/playwright
   ```

The exporter serves those inputs only on localhost, opens a test browser, captures
at 192×192 / 30 fps with seed 42, and writes the atlases. Camera settings, dimensions,
pivots and source names are recorded in the manifest. `sharp` is already available
through the existing project tooling.

Normal and additive layers are approximated from black/gray-background LDR captures.
This preserves dark smoke plus emitted light more accurately than a black-backed
single image; it does not retain HDR lighting or refraction of the live battlefield.
The three clips were visually approved as a first art pass, not as a lighting engine.

## Verification

```sh
node --test scripts/test-td-fx-atlas.mjs scripts/test-td-authored-fx.mjs
node scripts/test-td-ultimate-upgrades.mjs
```

The browser comparison was approved by the user. After retry authorization, visible
Chromium verification passed: lab loading, A/B switching, pause, playback speed,
completion, reduced-motion startup and mobile canvas proportions. The responsive
canvas rule overrides Pixi's inline dimensions to prevent mobile distortion.

An isolated browser session also entered a real campaign battle and triggered Odin,
Surtr and Heimdall casts through the simulation. All three atlas pairs rendered,
stayed on the same frame while paused and were removed after playback; there were
no page errors. Desktop combat screenshots and the mobile lab were visually checked.
The nine focused Node tests pass. No production build was run (repo rule).

Pre-existing broad checks: `test-td-ui.mjs` fails at its roster-placement assertion
(line 34, unchanged campaign controller). `npm run check` reports 2053 errors in the
existing codebase; its initial lab run reported none in the new FX files.

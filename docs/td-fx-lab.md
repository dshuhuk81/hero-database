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

### Roster expansion — 2026-10-08

Eleven more families cover every hero whose ultimate has a theme. All are supplements
(`replace: false`): the hero-specific renderer keeps drawing; the clip is added on top.
`at: 'source'` plays on the caster, otherwise on the ultimate's target point.

| Clip | Source sample | Heroes (ultimate) |
| --- | --- | --- |
| ice | NextSoft `MagicCold` | Boreas |
| water | NextSoft `MagicWater` (sound off) | Aegir |
| heal | NextSoft `MagicHeal2` | Asclepius, Gaia (green tint), all `heal` events of Atlas, Gaia, Harmonia, Asclepius, Bram, Jory |
| holy | Pierre `Benediction` | Helios, Isis, Atlas, Harmonia (pink), Bram, Jory |
| shadow | NextSoft `MagicDark` | Nott, Hecate, Nyra, Ash, Elm |
| feather | Pierre `FeatherBomb` | Thanatos |
| cosmic | Pierre `CosmicMist` | Skadi, Wren |
| wind | NextSoft `MagicTornade` | Vidar (on himself) |
| shockwave | Pierre `SonicBoom` | Ymir (ice tint), Sable, Hollis, Kellan and Tilda (on themselves) |
| venom | Pierre `BloodLance`, hue +110 | Fenrir |
| stone | Pierre `HolySandstorm`, starts 1.5 s in | Stheno |

Without an ultimate clip (activation cue only): Heimdall (ward clip on allies), Plutus and
Poppy (coin signature), Atalanta (attack-window buff). The full table lives in `ULTS` in
`authored-fx.js`.

Loading: the renderer fetches only the manifest at start. `prepare(game.heroes)` downloads
a hero's clips when it first appears on the board (`heroAtlasClips`), so a battle loads only
the families of its squad (all 20 clips are ~16 MB; a normal stage loads 2-4 MB). A cast before its clip arrives uses the
baseline effect. Every clip fades over the last fifth of its length.

### Support auras, bosses, Cronus — 2026-10-08

- **Support auras:** the six supports with the passive attack aura (Gaia, Asclepius, Poppy:
  `aura`; Plutus, Jory: `aura-gold`; Harmonia: `aura-rose`, all from `00_Version16/Aura01`)
  play a swirling ground aura under the figure instead of the pulsing glow and ring
  (`updateAuraFx` in `render.js`). The loop is built from overlapping instances that fade in
  and out (`keep()`), so the clip never visibly restarts. The range wave and the ally rims stay:
  they show the real aura reach and who is inside it.
- **Bosses** (`EVENT_ATLAS_FX`): `boss` arrival → `boss-rise` (`00_Version16/Barrior02`),
  `bossDown` → `boss-death` (AndrewFM `boss_death`), `summon` → `shadow` (red tint). All
  supplement the existing particles. Preloaded when the stage has a boss (`options.boss`).
- **Cronus (God Mode):** every slam or ember burst cell plays `blast` (Pierre `FireBall`,
  explosion only) via `authoredFx.play()`; sweep cells get a short `fire` clip. Arms, poses,
  chunky debris and fissures are unchanged. Preloaded when `game.god` is set.

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

### World portals — approved 2026-10-09

The spawn and home presentation in `world-portals.js` was visually approved by the user on
Coal Gate. Preserve this appearance: red flowing ground energy with four small obsidian teeth;
blue ground energy with a floating faceted crystal and soft upward light. The earlier black
oval / zigzag implementation was rejected and removed, including the painted home building.

`portal-red` and `portal-blue` are overhead exports of the CC0 `00_Version16/Aura01.efkefc`
sample (256 px, 60 frames at 30 fps, red hue -115 / blue hue +90). Two instances cross-fade
through each loop, avoiding a visible restart. The pair costs approximately 6 MB in total and
is loaded once per authored battlefield through Pixi's asset cache; per-scene frame wrappers
are released on teardown. No new runtime dependency is used.

Ground energy inherits the board tilt and is drawn after placement tiles, underneath units.
The crystal and teeth counter-scale vertically and sort with units by their ground contact.
Enemy emergence uses the existing short 18px fade at full body size instead of the old 70px
growth. Animation runs during preparation, follows simulation time during combat, and freezes
while paused. Reduced motion uses a static luminous frame; missing atlases retain soft light
and an irregular textured rim. Home loses brightness with health and flashes on an impact.

Re-export with the command below plus `--only portal-red,portal-blue`.
Focused checks: `node --test scripts/test-td-spawn-rift.mjs scripts/test-td-fx-atlas.mjs scripts/test-td-authored-fx.mjs`.

`public/td/fx/effekseer-v1/` contains 44 WebP atlases (22 clips × normal/add) and `manifest.json`.
All clips are real Effekseer renders, not procedurally imitated particles.

Source: official [Effekseer 1.80.7 release](https://github.com/effekseer/Effekseer/releases/tag/1807).

- `Sample/01_Pierre01/LightningStrike.efkproj` — Pierre.
- `Sample/01_NextSoft01/MagicFire1.efkproj` — NextSoft. Sound disabled for visual export
  (the archive does not include the referenced `Sound/effects_79.wav`).
- `Sample/01_NextSoft01/PowerUp.efkproj` — NextSoft.

- Expansion: `01_NextSoft01/{MagicCold,MagicWater,MagicHeal2,MagicDark,MagicTornade}`,
  `01_Pierre02/{Benediction,FeatherBomb,CosmicMist,BloodLance}`,
  `01_Pierre01/{SonicBoom,HolySandstorm}`, `00_Version16/{Aura01,Barrior02}.efkefc` (no CLI
  export needed), `01_AndrewFM01/boss_death`, `01_Pierre02/FireBall`. `MagicWater.efkproj`: set both `SoundValues/Type`
  to `0` like MagicFire1 (its wav files are not in the archive).

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

   Same for every expansion source listed above.

4. From the repo root, with an existing Playwright installation:

   ```sh
   node scripts/export-td-effekseer.mjs --samples /path/to/Sample --runtime /path/to/EffekseerForWebGL --playwright /path/to/node_modules/playwright
   ```

   `--only ice,venom` re-exports some clips and keeps the other manifest entries.

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

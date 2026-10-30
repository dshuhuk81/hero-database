# Game-data tools (Android client)

Scripts that pull data and art out of the Motto Immortal Android clients (Global and CN) and turn it
into the files this site imports. The code lives here, in git. The heavy data stays outside the repo:
APKs, client dumps, extracted art, `out/` (several GB) in the **data directory**.

```
ANDROID_DATA_DIR   data directory, default ~/Downloads/Sites/android
ANDROID_PYTHON     interpreter with UnityPy etc., default $ANDROID_DATA_DIR/.venv-arm/bin/python
```
Python dependencies: `requirements.txt` (a Python 3.9 venv is what ran so far).

## Run a script
```bash
tools/android/run.sh <script> [args]     # runs from $ANDROID_DATA_DIR so relative out/ paths work
```

## Refresh the site data (full flow)
Needs the emulator with the Global client: `tools/android/run.sh restart_emulator.sh --launch global`, then open the game
once and visit the lobby so it downloads its current resources.

```bash
D=out/emu_pull/<date>                                   # a new folder per pull
tools/android/run.sh emu_status.py --pull               # 1. copy the game data from the emulator (read-only, no root)
tools/android/run.sh unpack_config.py $D/global         # 2. decrypt + unpack the config -> ${D}_plain/x_global   (repeat with $D/cn for CN)
X=${D}_plain

# a) release dates and b) events   (data contract: docs/superpowers/specs/2026-10-28-phase1-data-contract-design.md)
tools/android/run.sh export_hero_releases.py --global $X/x_global --cn $X/x_cn --client-global vNNNNNN --client-cn 1.0.13
tools/android/run.sh export_events.py        --global $X/x_global --heroes out/site_data/hero_releases.json
tools/android/run.sh export_release_schedule_md.py       # optional overview in out/site_data/RELEASE_SCHEDULE.md
npm run import:game-data                                 # validates and copies into src/data/generated/ (commit those)

# c) hero art
tools/android/run.sh extract_hero_art.py $D/global/data/packages --out out/art_new_global
tools/android/run.sh build_site_assets.py --config $X/x_global --art out/art_new_global out/art_global --write   # -> out/site_public (first folder wins)
```
`vNNNNNN` is the Global resource version (the number of the folder in `$D/global/download/`, e.g. 102687).
The exports write only to `$ANDROID_DATA_DIR/out/site_data/`; `npm run import:game-data` reads them from there.
Without `--write`, `build_site_assets.py` is a dry run that prints what it would build and what it skips.

### After the import (a, b)
- Read the import warnings: an unknown game id means the hero is missing in `src/data/game_id_mapping.json`.
- New heroes need `src/data/heroes/<id>.json` and an entry in `src/data/summonSchedule.ts` (order, pull quality; `estimatedDate` only for a guess).
- `npm run build`, tests, commit `src/data/generated/`, deploy.

### After the art build (c)
- `build_site_assets.py` skips and reports portraits without transparency (`portrait_opaque`) and portraits shared by several heroes (`portrait_shared`). Look at both lists; do not use `--allow-opaque` casually.
- Copy `out/site_public/heroes/*.webp` to `public/heroes/`, run `npm run build:hero-variants` for `cards/` and `thumbs/`, look at every new image on a dark background.
- `npm run upload-assets:changed` (or `-- --exact key1,key2 --force` to replace existing files), then `node scripts/check-r2-refs.mjs`.
- Replacing an existing image: bump `HERO_IMAGE_VERSION` (`?v=` in the pages), the files are cached for a year.

## Scripts
| Script | Purpose |
|---|---|
| `export_hero_releases.py` | `hero_releases.json`: game id, Global/CN release dates, portrait name |
| `export_events.py` | `events.global.json` (+ report): every dated Global event, banners with `heroGameId` (also reruns) |
| `export_release_schedule_md.py` | human-readable release overview |
| `unpack_config.py` | decrypts and unpacks the config zips of a pull into `x_<label>/` |
| `extract_hero_art.py`, `update_global_art.py` | hero portraits (cutouts only) and skill icons from client bundles / patches |
| `extract_all_art.py` | every UI texture/sprite of a client (APK or `data/packages`) -> `out/art_all/<source>/<group>/<bundle>/*.png` + `index.tsv` |
| `build_site_assets.py` | WebP portraits and skill icons for the site; skips portraits without alpha or shared by several heroes |
| `emu_status.py`, `restart_emulator.sh`, `ram_scan.py`, `motto_crypt.py` | emulator control, memory scan, config decryption |
| `skill_contact_sheet.py` | contact sheet for skill icon checks |

## Known pitfall: white hero backgrounds
The older bundles (APK, CDN patch via `update_global_art.py`, folders `out/art_global` / `out/art_cn`) hold opaque 1024x2048
portraits with a white background for many older heroes. The emulator's `data/packages` (`new_texture_ui_herofigure_*`) give
transparent 838x2048 cutouts (`out/art_new_global`, `out/art_new_cn`; the repo also has them in `extracted/UI_Hero_Portraits`).
The scripts now guard against this: `extract_hero_art.py` skips portraits without transparency (`--keep-opaque` overrides),
`build_site_assets.py` reports and skips them (`portrait_opaque`) and takes several art folders, the first one wins.
The game's `hero_skin` also points several heroes at one portrait (Canopic Jar, Jinchan, Kraken, Nymphia, Ratatoskr, Tailao,
Treant, Ushabti and Cancer all at `Juxiezuo`); those are reported as `portrait_shared` and their images need another source.

## Editing
Edit the scripts in this repository only. If the data directory has a `scripts` entry, it is a symlink to `tools/android/scripts`.

# Tower defense asset pipeline (runbook for agents)

Written for an AI coding agent (e.g. Claude Code in the cloud) that gets one asset job for the
tower defense game ("The Last Crossing", `src/game/td/`). Follow it step by step. It covers:

- **A.** Animation clips for an existing enemy or boss still.
- **B.** A new enemy or boss still, then its clips.
- **C.** Art for a new hero (portrait card, thumbnail, board token, idle loop), plus sounds and
  the data entries a hero needs.

Background and history: `TOWER_DEFENSE_SPEC.md` (section 6 for enemies, section 2 for the hero
skin), `src/game/td/sprite-spec-for-ai.md` (enemy art rules and prompts),
`docs/tower-defense-ui-plan.md` (M7).

## 0. Ground rules

1. **White label.** Never use Motto Immortal / GOAT Games art, names, sounds or text as input or
   output. Sources are our own files in this repo or art the owner hands you.
2. **Never overwrite a published file.** R2 caches every asset for a year. Changed art always
   gets a new file name (a new version: `brute-v3` -> `brute-v4`, hero `"art": "v2"` -> `"v3"`).
   The tools refuse to overwrite; do not work around that.
3. **Do not upload to R2 and do not delete anything on R2.** The owner uploads after reviewing
   your branch (section 5). You have no R2 credentials and need none.
4. **Do not change gameplay** (stats, waves, bosses on maps, campaign) unless the job says so.
   Asset jobs add files and register names; that is all.
5. **Look at every result.** Open the preview images (section 4) and check them before you
   continue. Reject and redo clips with extra or missing limbs, changed head counts, cut-off
   parts, a drifting figure, or a changed art style.
6. **Deliver a branch or PR** with the files and a short report (section 6). Do not merge.

## 1. Setup (once per session)

```bash
npm ci                      # Cloudflare builds with npm 10.9.2; keep package-lock.json as it is
python3 -m pip install --quiet pillow numpy
node --version && python3 -c "import PIL, numpy; print('ok')"
```

PixelLab key (only parts A and B): the environment variable `PIXELLAB_API_KEY` must be set in the
cloud environment settings. Check without printing it:

```bash
test -n "$PIXELLAB_API_KEY" && echo "PixelLab key present" || echo "MISSING: ask the owner"
```

If it is missing, stop and report; do not guess or hard-code a key. Cost: about 1 PixelLab
generation per clip (5 clips per sprite); the account allows 8 jobs at once, the script queues
the rest. Work files go to `.td-work/` (gitignored).

## 2. Names and where things live

| Thing | File | Registered in |
|---|---|---|
| Enemy/boss still (256x256) | `public/td/enemies/sprites/{file}-{version}.webp` | `ENEMY_SPRITE_VERSIONS` in `src/game/td/assets.js` (a missing entry means `v1`) |
| Its animation sheet | `public/td/enemies/clips/{file}-{version}.webp` + `.json` | `ENEMY_SHEETS` in `src/game/td/assets.js` |
| Enemy/boss source art | `~/hero-database-assets/td/enemy-sprites-src/` on the owner's Mac; in a cloud job, the path the owner gives you | build map `FILES` in `scripts/build-td-enemy-sprites.mjs` |
| Hero art | `public/td/heroes-alt/{file}-card-240.webp`, `-thumb-96.webp`, `-token-192.webp` | `src/data/tdSkinMythic.json` (`"art"` for redrawn heroes) |
| Hero idle loop | `public/td/heroes-alt/anims/{id}-idle-{art or v1}.webp` (24 frames, 5376x224) | same |
| Hero board figure | `public/td/heroes-alt/figures/{figure}-{version}.webp` + `.json` (idle, attack, ultimate) | `HERO_FIGURES` in `src/game/td/assets.js` |
| Hero sounds | `public/td/sfx/mythic-{id}-v4_attack.ogg`, `..._ultimate.ogg` | `SOUND_VERSION` in `src/game/td/skin.js`, credits in `public/td/sfx/CREDITS-mythic.txt` |

`{file}` for enemies is the kind (`grunt`, `runner`, `flyer`, `archer`, `brute`, `brood`); bosses are
`boss` (Baphomet) and `boss-{id}` (`boss-lilith`, `boss-lerna`, ...). **A sheet is named after the
still it animates:** `clips/brute-v3` animates `sprites/brute-v3`. Kinds that borrow another
kind's still (`ENEMY_ART` in `assets.js`: mender, shieldbearer, imp, broodcaller, hexer) use the
sheet of exactly that still. For heroes, `{file}` is the internal id (`odin`, `atlas`, ...) or
`{id}-{art}` for a redrawn hero.

## 3. Part A: animation clips for an existing still

Input from the job: which still (e.g. `brute-v3`), optionally prompt wishes.

1. **Check the still.** It must be complete: feet or lowest contact point visible, nothing cut off,
   facing right, transparent, 256x256. Open `public/td/enemies/sprites/{file}-{version}.webp` and
   look. If feet or a gown hem are missing, stop: that needs a new still first (part B).
2. **Write the prompts** to `.td-work/prompts-{file}-{version}.json`. Describe only motion, one
   sentence per clip; name in `keep` what must not change. Template:

   ```json
   {
     "keep": "Keep exactly one head, two arms, the stone club and the iron plates.",
     "clips": {
       "walk": "heavy lumbering walk in place, one full cycle: legs step alternately, body sways, club swings slightly.",
       "idle": "idle loop: heavy breathing, shoulders rise and fall, slight sway.",
       "attack": "raises the club overhead and smashes it down in front of him, then lifts it back.",
       "hurt": "gets hit from the right: grunts and rocks back a little, then steadies.",
       "death": "is killed: sways, drops the club, falls to his knees and topples backwards onto the ground, ending lying still."
     }
   }
   ```

   The script adds "stays in place ... ends in exactly the starting pose" to idle, walk, attack and
   hurt and pins their last frame to the still, so loops close. Death runs open and must end lying.
   Flyers: `walk` is the flight cycle ("flies in place ... wings beat"); the hover height comes
   from the game, not the frames. Quadrupeds: say "on four legs"; multi-headed bosses: state the
   exact head count in `keep`.

   **No effects in clips.** Clips are pure character motion: no particles, snow, wind swirls,
   mist, glow, magic or projectiles. The game's renderer draws all effects, so the frames stay
   clear and crisp. Phrase it positively and do not name the effects you want to avoid (a list
   like "no fire, no flames, no sparks" made Surtr's clips burn more). Start `keep` with "Clean
   crisp frames that show only the <figure>; nothing else appears in the image, the background
   stays empty. Colors stay exactly as in the still." and describe gestures ("thrusts the palm
   forward", "raises the staff"), never the effect. Weapon swings ("slash", "swing", "chop") almost
   always get a white swing trail and a bigger blade; write thrusts, pushes and drops instead
   ("thrusts the sword straight forward", "drops the hammer onto the ground in front of him") and
   add "the <weapon> stays the same size and plain in every frame". Calm gestures and object moves
   (horn, lyre, raised staff) come out clean on the first try.

   **Match the attack to the hero's class and weapon.** Look up the class in
   `src/data/gameBalance.json` before writing prompts. Melee heroes (Warrior, Tank, Assassin) attack
   with their weapon (thrust, drop, stab); an open-hand gesture is only for ranged casters and
   supports. Name the weapon exactly as it is meant to be (spear, blade-spear, oar, dagger). If the
   art does not show it clearly or the owner's reference says otherwise, ask the owner first.
   `frame_count` must be a multiple of 4 (4, 8, 12, ...); 12 frames cost 2 generations.
3. **Generate** (runs 5-20 minutes; safe to rerun, finished clips are skipped, running jobs are
   picked up from `jobs.json`):

   ```bash
   node scripts/td-pixellab-clips.mjs --still public/td/enemies/sprites/brute-v3.webp \
     --prompts .td-work/prompts-brute-v3.json --out .td-work/pixellab/brute-v3 --dry-run   # check the requests
   node scripts/td-pixellab-clips.mjs --still public/td/enemies/sprites/brute-v3.webp \
     --prompts .td-work/prompts-brute-v3.json --out .td-work/pixellab/brute-v3
   ```

4. **Turn the frames into clip strips** (drops the untouched input frame 00, scales, writes a
   preview):

   ```bash
   python3 scripts/td-warp-anim.py brute-v3 .td-work/strips --pixellab --src .td-work/pixellab/brute-v3
   ```

   Output: `.td-work/strips/brute-v3/brute-v3_{idle,walk,attack,hurt,death}.png` and
   `brute-v3_preview.png`. **Open the preview and check every row** (rule 5). To redo one clip,
   delete `.td-work/pixellab/brute-v3/<clip>/` and its line in `jobs.json`, adjust the prompt,
   rerun step 3 with `--only <clip>`, then step 4.

   Small flaws can be fixed for free instead of paying for a new clip. Run the cleanup on the
   frame folders before step 4 (it edits them in place; copy a folder first if you want to keep
   the raw frames):

   ```bash
   python3 scripts/td-clip-cleanup.py .td-work/pixellab/brute-v3/attack            # loose specks
   python3 scripts/td-clip-cleanup.py .td-work/pixellab/brute-v3/ultimate --specks 400   # also loose swirls
   python3 scripts/td-clip-cleanup.py .td-work/pixellab/<archer>/* --string         # coloured bowstring
   python3 scripts/td-clip-cleanup.py .td-work/pixellab/<id>/attack --flash         # yellow flashes
   ```

   Look at the frames again afterwards: a costume or weapon in the flagged colour loses it too.
5. **Pack the sheet.** Add the sheet name to the `painted` set in
   `scripts/build-td-enemy-anims.mjs`, pointing at the strips (the `dir` is relative to the
   folder you pass as the first argument):

   ```js
   "brute-v3": { dir: "brute-v3", clips: clipFiles("brute-v3") },
   ```

   then

   ```bash
   node scripts/build-td-enemy-anims.mjs .td-work/strips --set painted --release --only brute-v3
   ```

   This writes `public/td/enemies/clips/brute-v3.webp` and `.json` (check the size: 70-200 KB).
   If the sheet name already exists in `public/td/enemies/clips/`, stop: a remade sheet for the
   same still needs a suffix (`brute-v3b`) in both the set key and `ENEMY_SHEETS`.
6. **Register:** add `"brute-v3"` to `ENEMY_SHEETS` in `src/game/td/assets.js`.
7. **Test:** `npm run test:tower-defense` must pass (section 4).

## 4. Part B: a new enemy or boss still, then its clips

Input from the job: the source image (transparent PNG, full body, facing right, feet visible),
the kind or boss id, and the version it replaces (if any).

1. **Source.** Put the image in a folder with the file name the build script expects: `grunt.png`,
   `runner.png`, `flyer.png`, `archer.png`, `brute.png`, `lilith_child.png` (brood),
   `boss_baphomet.png`, `boss_lilith.png`, `boss_lerna.png`, `boss_kraghorn.png`,
   `boss_vorruk.png`. A new boss id also needs a line in `FILES` of
   `scripts/build-td-enemy-sprites.mjs` (`boss_<id>: "boss-<id>"`). Art rules and prompt style:
   `src/game/td/sprite-spec-for-ai.md`.
2. **Build the still** as the next version (never an existing one):

   ```bash
   node scripts/build-td-enemy-sprites.mjs <source folder> --only brute --version v4
   ```

   Output `public/td/enemies/sprites/brute-v4.webp` (256x256, subject about 80% of the canvas,
   warns about opaque corners). Open it and check.
3. **Register the still:** set `brute: "v4"` in `ENEMY_SPRITE_VERSIONS` (`assets.js`). Kinds in
   `ENEMY_ART` that borrow this still follow automatically.
4. **Clips:** part A with `brute-v4`. A new still always needs new clips; the old sheet stays for
   the old still until the owner removes it.
5. **New boss only:** a new boss id also needs its name in `src/data/tdBosses.json` and a map or
   stage that uses it; follow "Adding a boss to a level" in `TOWER_DEFENSE_SPEC.md` section 6.
   A brand-new enemy kind (new gameplay) is out of scope for an asset job.

## 5. Part C: art for a new hero

A hero shows a portrait card, a thumbnail, a round board token and a 24-frame idle loop in the
recruit preview; it plays two sounds. On the board it stands as an animated figure (part D).

Input from the job (ask the owner for anything missing, do not invent it):

- the internal id (`odin`, `atlas`, a new `recruit-...`), and whether it is a new hero or a redraw;
- the source portrait: transparent PNG, one full-body figure, tall (roughly 2:5, like the
  review set), facing the viewer or slightly turned, nothing cut off;
- the mythic persona: name, title, ultimate name (`TOWER_DEFENSE_MYTHIC_HEROES.md` style);
- sounds: two `.ogg` files (attack, ultimate) with their license, or which class donor to copy.

Steps:

1. **Version.** New hero: no `"art"` field, files are `{id}-...`. Redraw: pick the next art
   version (`"v2"`, `"v3"`) and pass `--art`.
2. **Export the three images:**

   ```bash
   node scripts/td-hero-assets.mjs --id odin --source <portrait.png> --art v3
   ```

   Writes `{file}-card-240.webp` (240x587), `{file}-thumb-96.webp` (96x96, top crop) and
   `{file}-token-192.webp` (192x192 bust crop, 73% of the width from the top; for wide figures
   such as a wolf pass `--token-width 1`). Open all three: the face must sit inside the token.
3. **Idle loop** (procedural: feet pinned, sway, breathing, cloth ripple):

   ```bash
   python3 scripts/td-idle-anim.py <portrait.png> odin public/td/heroes-alt/anims --version v3
   python3 scripts/td-idle-anim.py <portrait.png> odin .td-work --version v3 --gif   # preview to look at
   ```

   Output `public/td/heroes-alt/anims/odin-idle-v3.webp` (5376x224, 24 frames). Leave out
   `--version` for a new hero (`-idle-v1`). Keep the GIF out of `public/`.
4. **Sounds** (new hero only, or when the job asks): copy to `public/td/sfx/mythic-{id}-v4_attack.ogg`
   and `..._ultimate.ogg`, add the source and license to `public/td/sfx/CREDITS-mythic.txt`, then
   `node scripts/td-audio-levels.mjs` to set their volume.
5. **Register** in `src/data/tdSkinMythic.json` under `heroes.{id}`: `name`, `title`, `skillName`,
   and `"art": "v3"` for a redraw. For a new hero also add its persona section to
   `TOWER_DEFENSE_MYTHIC_HEROES.md`.
6. **Gameplay data (only if the job includes it):** a hero needs a row in
   `src/data/gameBalance.json` and a `heroSkills` entry in `src/data/gameBalance.tuning.json`;
   follow "Integration checklist" in `TOWER_DEFENSE_FILLER_HEROES.md`. Without these the art is
   ready but the hero is not in the game.
7. **Test:** `node scripts/test-td-skin.mjs` checks that every hero has all files, then
   `npm run test:tower-defense`.

## 5b. Part D: board figure for a hero

The board draws each hero as a standing figure with three PixelLab clips: idle (8 frames),
attack (8) and ultimate (12). Recruit pairs with identical art share one figure.

1. **Still:** fit the full-body portrait into 256x256 with the feet 8 px above the bottom (the
   same trim and fit as part B), transparent.
2. **Prompts:** as part A step 2, with the clips `idle`, `attack`, `ultimate` and
   `"frames": { "idle": 8, "attack": 8, "ultimate": 12 }`. The attack follows the hero's class
   (melee attacks with the weapon, ranged casters and supports gesture or aim). No effects.
3. **Generate** with `scripts/td-pixellab-clips.mjs` (part A step 3; `ultimate` ends pinned to
   the still like the loops). About 4 generations per figure.
4. **Check and fix:** open every frame; redo a clip or use `scripts/td-clip-cleanup.py`.
5. **Lab:** copy the frames without frame 00 to `public/td-local/anim-lab/<figure>/<clip>/NN.png`
   and add the figure to `public/td-local/anim-lab/manifest.json` (`id`, `name`, `still`,
   `clips.{clip}.frames`, and `hand: [x, y]` in 256 frame pixels for heroes whose shots fly).
   Preview at `/games/tower-defense/anim-lab` (dev only) and in the game with `?figures=lab`.
6. **Pack:** `node scripts/build-td-hero-figures.mjs --only <figure>` writes
   `public/td/heroes-alt/figures/<figure>-v1.webp` and `.json`. A remade figure needs
   `--version v2`; the script refuses to overwrite.
7. **Register:** map the hero id to the figure in `HERO_FIGURES` (`src/game/td/assets.js`).
   A hero without an entry keeps the round token.

## 6. Checks and delivery

Before you hand over:

- `npm run test:tower-defense` passes (15 suites). For hero jobs also `node scripts/test-td-skin.mjs`.
- `git status` shows only: new files under `public/td/enemies/{sprites,clips}/` or
  `public/td/heroes-alt/` (and `public/td/sfx/`), and the registry edits (`assets.js`,
  `build-td-enemy-anims.mjs`, `build-td-enemy-sprites.mjs`, `tdSkinMythic.json`, ...). Nothing in
  `.td-work/`, no GIFs, no source PNGs in `public/`.
- `TOWER_DEFENSE_SPEC.md` names the new files: section 6 lists the sheets and still versions;
  hero redraws are noted in section 2.

Report to the owner (in the PR description):

1. what was made (files, versions) and how many PixelLab generations it used (the script prints them);
2. the preview images you checked, and anything you redid or still doubt;
3. **the owner's next steps, in this order:** review the branch locally
   (`npm run dev`, open `/games/tower-defense`; sheets and stills show once uploaded), upload the
   new files with `npm run upload-assets` (it only uploads files R2 does not have yet), then
   merge and deploy. Merging before the upload is safe but shows the old art or stills until the
   files exist. Superseded files on R2 are removed by the owner after the deploy.

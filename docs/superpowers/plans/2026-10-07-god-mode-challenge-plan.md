# God-Mode Challenge: from lab to a real mode

Written October 7, 2026. The `god-mode-lab` spike (Cronus rig, FX, arena art) proved the look.
This plan turns it into a playable mode in the main menu on the existing board engine.

## Owner decisions

- **First god: Cronus, lava titan** (layered rig, `public/td/god-mode/cronus/`, built by
  `scripts/build-cronus-rig.mjs`).
- **Arena: 9 x 4 board**, 104 px cells, origin (12, 62), the god behind the parapet above it:

  ```
  P . B B B B B . P    side balconies, five boss cells (one unit)
  . P M M M M M P .    side platforms, melee front
  . . P . . . P . .    further side platforms
  . . H H H H H . .    raised gallery
  ```

  P = platform tiles (6), M = road tiles (5), H = platform tiles with the high-ground ring (5),
  B = boss cells. The existing class patterns decide who reaches the boss (Tank plus, Warrior
  block, Assassin plus, Mage diamond2, Archer cross3, Support block); high ground adds one step.
- **Roster:** the owner's own two squad rows, filled like in the Campaign, no restriction.
- **Heroes can fall** when the god hits them (normal hero HP, fall and redeploy rules).
- **Challenge rules from the lab:** 90 seconds, the god has infinite health, score is the total
  damage dealt. No rewards and no gating yet (player-facing restrictions need the owner's yes).

## Architecture

1. **Sim (`sim.js`)**: a map with `god: { cells, seconds, ... }` makes `TowerDefenseGame` run a
   stationary challenge boss instead of a timeline.
   - The boss is a normal `boss` enemy flagged `stationary`: it never walks, never leaks, has
     effectively infinite health and carries its five `cells`.
   - Reach checks (`reaches`, `inReach`, `inUltArea`, `nearPoint`) accept units with `cells`, so a
     pattern covering any boss cell hits the boss, and an area attack hits it once.
   - The boss runs an attack cycle from tuning (`tuning.godMode.bosses.<id>`): telegraph, strike,
     recovery. Attacks name target cells; heroes in those cells take damage through `damageHero`.
   - The run ends when the timer runs out (`won = true`, `godDamage` is the score).
2. **Map record**: `tdMaps.json` entry `god-cronus` (`grid.board`, `rings` for H, `god` block,
   `godOnly: true` so it stays out of Daily Trial, Expedition and the stage list).
3. **Renderer (`render.js`, `map-scene.js`)**: lava arena art, parapet, tile styles per cell type,
   the Cronus rig as the boss (ported from the lab), telegraphs and the lab's particle kit
   (`fx-kit.js`).
4. **Page**: God Challenge entry on the home rail, a God screen (boss, rules, best score, squad
   rows, Start), session start (`startSession(map, { god })`), result screen, save record
   (`godBest`).
5. **Lab removal**: once the mode plays, `god-mode-lab` is deleted and the rig, FX and arena
   helpers live under `src/game/td/`.

## Milestones

| # | Content | Done when |
|---|---|---|
| M1 | Sim: stationary boss, multi-cell reach, timer, score, attack cycle on cells; map record; `test-td-god-mode.mjs` | headless run: heroes hit the boss through patterns, the god hits and kills a hero, the run ends at 90 s |
| M2 | Renderer: arena art and tiles, Cronus rig as boss, telegraph and impact FX | the mode plays in the real renderer with the lab's look |
| M3 | Page: home rail entry, God screen, session, results, save record | start from the main menu, finish, see the result and best score |
| M4 | Remove the lab, document in `TOWER_DEFENSE_SPEC.md` | lab route gone, spec current |
| M5 | PixelLab pass over the Cronus layers, re-measure pivots | pixel-art layers shipped, rig still seamless |
| M6 | Roar head fit, Sweep and Ember Rain attacks, heroes react to impacts | owner signs off the fight feel |

## Risks

- `sim.js` and `render.js` are large; every hook must keep the campaign tests green
  (`npm run test:tower-defense`).
- Reach checks are spread over several helpers; the `cells` support has to cover all of them, or
  some skills would miss the boss.
- The existing per-mode wiring (`session.ts`, `home.ts`, `save.ts`) assumes three modes; the new
  mode follows the Daily Trial pattern.

# Tower Defense UI audit and rebuild plan

Status: M1-M4 complete, September 24, 2026. Live on motto-immortal-db.com. M5 (gameplay) open, M6 (menu UI pass) done September 28, 2026, M7 (enemy animation) open with a procedural prototype behind `?anim` (September 29, 2026). The original audit and plan below are kept for reference; the status, decision log, M4 and M6 sections are current.

## Status

| Milestone | State | Notes |
| --- | --- | --- |
| M1 Shell, sizing, on-map actions | Done | `GameLayout.astro` (no site nav/footer, safe areas), world fitted to width and height, recruit sheet from rings, anchored hero popover (sheet fallback, docks below the map in portrait), deck, notices, touch rotation, keyboard setup. |
| M2 Blessings, pause, settings, help | Done | Blessings panel with Divine Blessings / This run tabs, reason-based pause controller, menu (sound, restart, choose map), help panel. |
| M3 Transitions, results, a11y | Done | No reloads: one rAF loop, renderer `destroy()`, stale-load guard. Results with Retry / Choose map / Spend Favor. Focus restore, panel focus trap, Escape handling. |
| Acceptance: viewports | Done (Playwright) | 667x375, 844x390, 915x412, 390x844, 1024x768, 1440x900: no document scroll, all rings reachable, popover inside the stage, panels fit. |
| Acceptance: real phone | Done | Checked by the user. |

Added after the plan (user requests):
- Blessing cards with large bonus values, stat icons and colors (choice modal and This run tab).
- On-map buff bar: run blessings summed per stat (same totals as `sim.modifiers()`, pairs included); tap opens This run.
- All 12 Divine Blessing (Favor) nodes implemented in the simulator (`tuning.favor`, tests in `scripts/test-td-favor.mjs`).
- Difficulty knobs (`tuning.difficulty`: enemyHp, enemySpeed, killGold, waveHpScale, invincible), dev-only debug panel (live sliders, wave jump, win/lose, copy values; debug runs are not recorded) and `npm run td:sweep` (win table per HP multiplier).
- Game assets moved to R2 under `td/` (`src/game/td/assets.js`); large images converted to WebP (9 MB to 1.7 MB); unused images removed; `public/td/` removed.

## Decision log

| Decision | Instead of (plan) | Why |
| --- | --- | --- |
| Favor can be bought any time; mid-run purchases apply from the next run ("From next run" chip). Before any deployment they apply immediately. | Purchases only in the lobby or before deployment. | Players did not understand the lock. |
| All Favor nodes functional. Yuelao's Bond keeps the 24% synergy cap; Poseidon's Tide raises melee contact from 42 to 50 px. | Non-functional nodes labelled "Not active yet". | Nodes were implemented. |
| Run blessing offer stays optional: starting the next wave forfeits it (stated in the modal). | Open question in the plan. | Keeps the simulator's offer-expiry behavior. |
| Styles in a dedicated `src/styles/td.css` loaded by `GameLayout.astro`. | `components.css`. | Game-only styles; the old TD block was removed from `components.css`. |
| Debug panel only in `npm run dev` builds. | Not planned. | Balance tuning tool, not a player feature. |

## M4: Live readiness (done)

1. Done: R2 CORS policy set (GET/HEAD for motto-immortal-db.com, www and localhost:4321); verified the site origin receives `Access-Control-Allow-Origin`, other origins do not.
2. Done: deployed build verified on the live site (new UI, 45/45 R2 assets, no failed requests or page errors, no debug button). `astro check`: done. Tower defense files have 0 errors (one fix in `audio.ts`). The earlier hang was an install prompt: `@astrojs/check` and `typescript` are not in `devDependencies`. The rest of the site has 2,049 existing errors, mostly `src/pages/heroes/[id].astro` (1,955) and `src/pages/status.astro` (81); out of scope for this plan.
3. Done: real phone check by the user.
4. Done: enemy HP 2x via `"difficulty": { "enemyHp": 2 }` in `gameBalance.tuning.json` (base HP values restored to the originals, so the knob is the single source). At 2x, `test:td-balance` wins 3 of 10 runs, none flawless; its threshold is now at least 1 winning squad per map. The "road wall" squad loses at every level; review it separately.
5. Done: upgrades are allowed during waves. `test-td-sim.mjs` updated for current design: mid-wave upgrades, Favor tier requirements read from the tree, Medusa's petrify (was a slow), full-run mechanics check at base difficulty. Nyx's Shadow Step now targets the lowest-HP enemy anywhere on the map (`findUltTarget`); her normal attacks stay within range. All TD suites pass.
6. Closed: full-map white wash seen only in headless screenshots (pre-existing, likely an additive glow effect under software rendering); not reported on a real device. Reopen if it shows up in play.
7. Done: page split into modules. Logic in `src/game/td/page/` (`context.ts` shared context, state and late-bound actions; `save.ts`, `boons.ts`, `results.ts`, `debug.ts`, `hud.ts`, `popover.ts`, `recruit.ts`, `panels.ts`, `session.ts`), markup in `src/components/td/` (`TdLobby`, `TdPlayScreen`, `TdOverlays`, `TdDebugPanel`, `TdPanels`). `TowerDefensePage.astro` is about 190 lines of wiring; rendered HTML verified identical to the pre-split version.
8. Closed (note): WebP sources exist only on R2 (originals are in git history). Keep a local source copy if the images will be edited again. R2 objects are cached for one year (`immutable`), so changed files need a new file name.

## M5: Gameplay (open)

1. Done (September 25, 2026): ultimates audit. Edge-case tests in `test-td-sim.mjs` run every roster ultimate against a dead target, a lone target and a crowd (no throw, no invalid numbers, no overheal). Fixed: an ultimate no longer goes to an enemy the same tick's basic attack killed (it retargets); Poseidon's knockback now moves the enemy on the map, so blocked enemies are really pushed out of the pile; Zeus's bounces skip enemies the blast already hit; nothing happens after the last life is lost in a step. `test:td-balance` and `td:sweep` win/loss results unchanged. Decided and shipped: road heroes' ultimates no longer affect flyers (damage, slows, pushes, debuffs), matching their basic attacks; `td:sweep` wins unchanged.
2. Done (September 25, 2026): blocking balance. Shipped a block limit per blocker (`tuning.blocking.blockLimit`: Tank 3, Warrior 2, Assassin 1 melee enemies; extra enemies walk past to the next blocker or the goal). Measured over 5 squads x 2 maps x 3 seeds at the live difficulty (enemyHp 2): balanced 2/6 -> 5/6 wins, glass cannon 0/6 -> 6/6, budget 1/6 -> 3/6, all platform 6/6 unchanged. "No hero falls" quest completion 21% -> 47%. Also measured and not shipped: cheaper redeploy (`redeployCostFactor`, weak) and a damage bonus on held enemies (`heldDamageBonus`); both switches remain in the sim, off. "Road wall" losing is not a blocking problem: it has no real flyer coverage (all 9 flyers of wave 4 leak every run), which is the intended rule. Difficulty kept at enemyHp 2 by decision (September 25, 2026): with the limit, 3/5 squads win on Moonlit Pass and 4/5 on Verdant Crossing; 2.5 would restore the old challenge (1/5 and 3/5).
3. Done (September 25, 2026): Anubis in the roster (21 heroes). Assassin, road, B tier, 90 gold. Ultimate Featherfall Judgment (`soul_drain`), from the game skill text: 450% ATK on the weakest enemy in range, 2s stun (new plain stun, violet tint), a kill refunds 60% of the charge (the skill restores 600 Energy). Token built and uploaded; his sounds now play. Adding a hero re-ranks everyone in `build-game-balance.mjs` (stats shift up to about 4%, five costs +-5 gold); `td:sweep` wins at enemyHp 2 unchanged (3/5 Moonlit Pass, 4/5 Verdant Crossing). In the bot squads he replaced Poseidon with a clear gain (avg 10.3 -> 17.8 lives, 6/6 wins either way); watch him.
4. Done (September 25, 2026): `@astrojs/check` and `typescript` are devDependencies, `npm run check` runs `astro check` (lockfile verified with npm 10.9.2). The TD modules have no type errors (re-checked September 29, 2026 after fixing `autoFodder` JSDoc types and a `hidden` "until-found" narrowing in `popover.ts`); the rest of the site reports about 2,050, almost all a script block in `src/pages/heroes/[id].astro` the checker misparses (the build is fine), plus about 80 in `src/pages/status.astro`.

## M6: Menu UI pass against an AAA reference (done September 28, 2026)

Screenshots of another mobile TD's campaign map, squad select, in-combat HUD and victory screens were compared against `TdLobby.astro`, `TdPlayScreen.astro`, `campaign.ts`, `recruit.ts` and `hud.ts`. Shipped:

- Chapter route rail on the Campaign screen removed again: redundant with the stage cards and the home Campaign card's route.
- Tapping a stage card opens the stage details drawer from the right (`data-td-camp-drawer`: map preview, info, waves, boss, rewards as currency chips, recommended Might) instead of jumping straight to Squad; the drawer's CTA (`data-camp-drawer-start`) is what navigates. The old in-page feature panel is gone; chapter tabs (`data-td-camp-chapters`) sit under the grid.
- Squad power vs. recommended, derived from `stage.hpScale` (the same knob `sim.js` already uses to scale enemy HP) rather than a new invented stat. Since September 28, 2026 it is a small Might readout (crossed swords + value, green at/above, gold below; full text in the tooltip) above Start in the lineup row.
- Small line icons next to Gold/Lives/Wave in the play screen topbar.
- Range-ring preview on first deployment now also fires for touch (`recruit.ts` sets `game.uiPlacement` from the focused/hovered hero card in the recruit sheet); it previously only existed for mouse-hover during the separate "redeploy a fallen hero" flow.

Squad screen follow-up (September 28, 2026, owner measurements against a gacha team screen): stage head with Clear heroes / Quick pick removed (the drawer already shows the stage); roster as two rows of bare 50 x 75 art cards scrolling sideways with "Lv N" over the foot (name in tooltip/label; locked heroes dimmed, no text); lineup at the bottom without a panel, 84 x 84 slots centered with cost and one 11px hint line; no screen footer, Might and Start sit right of the slots. Coverage line, deploy-cap note and Quick pick message removed. Fits 844 x 390 without vertical scroll. Details in `TOWER_DEFENSE_SPEC.md` (Squad selection).

Skipped on purpose: a Lord-hero/support-hero slot pair from the reference's squad screen - would need a new data model and an undefined gameplay effect; not adopted without a design decision. Already equivalent and left alone: the redeploy-cost deck badge and the per-unit ultimate charge ring (both existed, just canvas-side rather than reference-style HTML). Checks: `npm run test:tower-defense`, `npm run check`, manual Chromium pass at 420x900 via the Playwright skill.

## M7: Enemy animation (open)

Goal: enemies that walk, strike, react to hits and die, in the painted style of the current full-body sprites, with free tools only while this is a test.

### Tried and dropped (September 29, 2026)

3D via Meshy.ai: `grunt-v2` became a textured model and `scripts/td-render-3d.py` (local only, `*.py` is gitignored) rendered it in Blender headless at the sprite angle. Dropped by the owner: the render looked flatter than the painted sprite, rigging needed Meshy's paid skeleton export or a Mixamo detour, and every step costs credits. Do not reopen unless the owner asks.

### Step 1: procedural motion (done, prototype)

`animateEnemy` in `render.js`, only with `?anim` in the URL (details in `TOWER_DEFENSE_SPEC.md`, section 6). Walk bounce and lean, attack wind-up and lunge, hit flash and shake, wingbeat, topple on death; no new assets. Open: tune the amounts in play, then decide whether it ships on by default. Switching it on is the `ENEMY_ANIM` line.

### Next steps: real animation frames, free workflow

Each step is usable on its own; stop when the result is good enough at 44 to 108 px.

1. **Frame format and packer (done as a test, September 29, 2026).** `scripts/build-td-enemy-anims.mjs` (sharp) turns one horizontal strip per clip into a WebP sheet plus a Pixi spritesheet JSON with a `td` block (feet anchor, idle body height, fps, pixel-art flag). Frames are cropped to one shared box per kind so the feet never jump. Output goes to `public/td-local/sheets/` (gitignored). Open: versioned file names and an R2 upload once real art exists.
2. **Renderer support (done as a test).** With `?anim=sheets`, `grunt` and `archer` load their sheet and play `idle`, `walk`, `attack`, `hurt` and `death` from the signals `animateEnemy` already reads; other kinds keep the still sprite and the procedural motion. Frames are picked on game time rather than with `AnimatedSprite`'s own ticker, so pause and game speed apply. Test art: a free pixel-art pack in `~/hero-database-assets/td/newAssetTest` (Orc, Soldier); it proves the pipeline but does not match the painted style, and its license is not confirmed, so it is not deployed. Open: a real sheet for a painted enemy, checked the same way.
3. **Warp frames from the existing sprite (cheapest art; grunt done as a test, September 29, 2026: `scripts/td-warp-anim.py`, set `painted`, see `TOWER_DEFENSE_SPEC.md` section 6).** Extend `scripts/td-idle-anim.py` (numpy + Pillow, already used for the recruit idle loops) with region warps: legs shear in opposite directions per step, torso leans, weapon-arm region rotates for the swing, cloth ripples. Test with `grunt` and one boss. No new drawing, no hidden limbs, so it stays a deformation, not a real step.
4. **Cut-out puppet (best quality, most work).** Per enemy:
   - Split the sprite into parts (head, torso, upper and lower arms, legs, weapon, shield, cape). Free options: Krita or GIMP by hand, or Meta's SAM 2 locally (runs on the Mac) for rough masks, then clean up.
   - Fill what the parts hid (the torso behind the shield, the far leg). Hand paint in Krita, or local Stable Diffusion inpainting (ComfyUI, free) seeded from the enemy's own colors. White label rule stays: no game art as input.
   - Rig and animate: Blender (free, already installed) with the parts as image planes on an armature, or DragonBones (free, no longer maintained). Keyframe `walk` (8 frames), `attack` (6), `hit` (3), `death` (6).
   - Render frames headless from Blender with a transparent background at 256x256, then run the packer from step 1.
5. **Optional experiment: local image-to-video.** ComfyUI with an open image-to-video model and `rembg` for the background is free but slow on the Mac, and the clips need hand-picked loop points. Only worth a try for the bosses.
6. **Checks per new sheet.** Download size per kind (target well under 300 KB), frame rate on a real phone with a full wave, reduced motion (hold the first walk frame), `npm run test:tower-defense`, and a Chromium pass at phone size.

Also in place (September 29, 2026): a painted `flyer` from a generated 6-frame flight cycle (`STRIPS` mode of `scripts/td-warp-anim.py`). Generating a short frame series from text and keying it is a fifth free route for kinds where warping one still is not enough.

Current route (September 29, 2026): PixelLab image-to-animation through the API with the kind's complete still as first frame and, for loops, as last frame (details in `TOWER_DEFENSE_SPEC.md` section 6). Archer, grunt, runner, brute and brood are built this way, the flyer from a generated strip; bosses wait for complete stills. Open: owner review in play, then ship the sheets (versioned names, R2 upload, `ENEMY_SHEETS` on by default) and delete superseded R2 files after the deploy.

## Scope and evidence

Audit of the current working tree, including existing local changes in `TowerDefensePage.astro` and `components.css`. This is a source audit; live browser inspection was unavailable in this session. Visual fit and touch usability must be verified during implementation.

Source locations:
- `src/components/pages/TowerDefensePage.astro`: page structure, UI state, input, deployment, upgrades, blessings, results.
- `src/styles/components.css`: tower defense layout and responsive rules.
- `src/layouts/Base.astro`: shared site navigation and footer.
- `src/game/td/render.js`: canvas sizing, coordinate conversion, slot targeting.
- `src/game/td/sim.js`, `favor.js`, and `src/data/tdMaps.json`: simulation, permanent progression, map geometry.

## Findings

| Priority | Finding | Consequence |
| --- | --- | --- |
| P0 | Below 1100px, the 330px command sidebar stacks beneath the map, loses its height limit, and allows content to expand. | Deployment and upgrades require page travel on phones. |
| P0 | Renderer height is always canvas width × 0.5625. Available screen height is ignored. | A landscape screen can overflow even when its width seems sufficient. |
| P0 | Hero selection on the canvas renders upgrade actions in the separate inspector. | The action is distant from the selection; on mobile it can be offscreen. |
| P1 | Site navigation, page introduction, map buttons, personal best, game, briefing, and footer share one document flow. | The battlefield is one section of a website rather than the primary screen. |
| P1 | Divine Blessings is a disclosure above the battlefield and is hidden once a run starts. | Progression cannot be accessed from the battlefield UI. |
| P1 | Map changes, restart, and play-again reload the document. | Screen transitions and game initialization are coupled to navigation. |
| P1 | Mobile HUD scrolls horizontally; lower-priority score and sound controls compete with essential actions. | Controls can disappear beyond the visible HUD. |
| P1 | Instructions say choose five heroes, but runtime permits starting after placing one, with five as the team limit. | Setup instructions misrepresent the actual flow. |
| P1 | Rotation is exposed through the R key; keyboard slot activation returns early before the run starts. | Touch users lack rotation, and keyboard setup is incomplete. |
| P2 | Touch targeting uses a radius in logical map coordinates. | Physical target size shrinks with the rendered map. |
| P2 | Inspector markup is replaced on game changes. | Moving it into a live interactive popover requires preserving focus and button stability. |

Progression issue to address while restructuring initialization: Favor bonuses are calculated before the game is created; purchasing or refunding a node only updates saved data and the tree UI. The current instance does not recompute its starting bonuses. Only starting gold and lives are visibly consumed from the calculated bonus object at this call site; verify the other node effects separately before presenting them as functional.

## Recommended experience

Flow: **Choose battlefield → Prepare on the map → Fight / reinforce between waves → Results → Retry or choose another map.**

1. **Choose battlefield:** cards for Moonlit Pass and Verdant Crossing, each with a preview of its actual path and personal best. Remember the last selection. An explicit Play action enters preparation; combat never begins automatically. Divine Blessings and help are available here.
2. **Prepare:** show the battlefield immediately. Tap an empty ring to recruit a compatible hero beside that location. Keep the current limit of five unique heroes and ability to start with one; describe it accurately as “Deploy up to 5 heroes.”
3. **Fight:** gold, lives, wave, pause, speed, Blessings, and wave action remain inside the game viewport. Selected hero actions appear at the selection. Small event notices replace the sidebar's commentary.
4. **Between waves:** next-wave preview and Start wave action occupy the same stable locations. Keep the existing run blessing choice in an overlay.
5. **Results:** summary, earned Favor, Retry, and Choose map. Longer breakdowns can scroll inside the results panel.

## Screen structure

Landscape/desktop concept:

```text
┌──────────────────────────────────────────────────────────┐
│ Gold · Lives · Wave                  Speed · Pause · Menu │
│                                                          │
│                    BATTLEFIELD                           │
│                hero ● ┌────────────────────┐             │
│                       │ Name · Level · HP  │             │
│                       │ Upgrade 90g Rotate │             │
│                       └────────────────────┘             │
│                                                          │
│ Blessings      [compact hero deck]        Start wave      │
└──────────────────────────────────────────────────────────┘
```

This diagram expresses hierarchy, not a fixed overlay position over every map. Reserve control space before fitting the battlefield; validate both maps so no ring, entrance, or exit is hidden. On short landscape phones use side gutters/rails where they preserve a larger map than stacked top and bottom bars. Do not squeeze every desktop control into a horizontal scrolling HUD.

- Use a game-specific layout with shared metadata/styles and an explicit Back to database action. Remove site navigation/footer from the game shell.
- Size the shell to the available dynamic viewport, including safe-area insets. Fullscreen can be optional; normal browser mode must work.
- Fit the entire 960×540 world into the remaining width **and height**, preserving aspect ratio. Use letterboxing; do not crop the path or distort the map.
- Base layout choices on available height as well as width. Landscape phone is a primary target.
- Portrait remains usable with a compact HUD, map, bottom deck, and bounded sheets. A rotation suggestion may be dismissible, never blocking.
- Keep scroll inside long recruitment, progression, help, and result panels. Active gameplay has no document scroll.
- Score, detailed synergy stats, sound volume, help, and restart move into secondary panels. Keep pause and speed directly accessible.

## Contextual interactions

### Hero upgrade popover

- Tap/click a deployed hero in preparation or combat to select that entity and show its range.
- Anchor a compact DOM popover next to the hero in screen coordinates, offset from the finger/cursor; flip and clamp it to the available viewport.
- Show name, level, health, upgrade cost, upgrade preview, Rotate, and Close. Expand detailed stats on demand.
- Upgrade in two actions: select hero → Upgrade. Keep the popover open for further upgrades, updating cost and affordability without replacing focused controls.
- Reposition after resize/orientation changes. If no safe anchored placement exists, use a compact in-viewport sheet with the selected hero visibly highlighted.
- Dismiss through Close, Escape, tapping empty map space, or selecting another hero. Handle death, max level, insufficient gold, and stale selection explicitly.
- The small popover does not pause combat. Larger panels that obscure the battlefield pause it and restore the previous pause state on close.

### Recruitment

- Tap an empty ring → bounded chooser containing only compatible heroes → tap hero to deploy.
- Keep unavailable heroes readable with a reason: insufficient gold, already deployed, or team full.
- Retain a compact team deck for quick redeployment; detailed names/stats belong in selection UI.
- Use the same input path for pointer, touch, and keyboard. Keep a screen-space touch target budget and resolve nearby-slot ambiguity deterministically.

### Blessings

- A persistent Blessings control opens an in-game panel with two clearly labeled areas: **Divine Blessings / permanent Favor upgrades** and **Run blessings / current run effects**.
- Allow permanent purchases in the lobby and before any deployment; construct the run using the resulting progression snapshot.
- After deployment, keep the tree accessible for inspection with a clear “Changes available next run” state. This avoids silently resetting a prepared formation or changing starting resources mid-run.
- Keep between-wave blessing selection as its own prominent choice overlay. Make required choice/dismissal behavior explicit; do not change the simulator's offer-expiry behavior accidentally.
- On small screens, show tier tabs or a bounded list instead of compressing three progression columns.

## Implementation sequence

1. **Establish the game shell and screen states.** Introduce lobby, preparation, running, between-wave, and results states. Separate overlay state from simulation state. Give pause management explicit reasons so closing a panel cannot resume a manually paused game.
2. **Make battlefield sizing correct.** Update renderer resizing and coordinate conversion around the measured map rectangle. Observe the containing viewport, preserve logical simulation coordinates, and implement responsive control regions and safe areas.
3. **Move actions onto the battlefield.** Replace the command sidebar with recruitment UI, anchored hero actions, a compact deck, and brief notices. Implement touch rotation, keyboard preparation, focus restoration, and stable updates.
4. **Integrate progression and transitions.** Add map cards, Blessings access, progression snapshot initialization, pause/settings/help, and results navigation. Remove reload-based transitions with proper renderer/audio/listener cleanup and exactly one active game loop.
5. **Polish and verify.** Tune density using the real maps, retain the current visual palette, verify all game states at target sizes, and run relevant simulation checks.

Suggested boundaries: `GameLayout.astro`, game shell/panels under `src/components/td/`, controller and overlay placement helpers under `src/game/td/`, and dedicated tower-defense styles. Keep battle rules in the existing simulator. No new production dependency is expected.

## Acceptance criteria

- Inspect at 667×375, 844×390, 915×412, 390×844, 1024×768, and 1440×900 CSS pixels, plus a real landscape phone with browser chrome visible.
- Gold, lives, wave, pause, Blessings, and the available wave action stay accessible without document or HUD scrolling.
- Both maps remain fully visible; all rings can be selected, including rings next to controls and popover edges.
- Select and upgrade any deployed hero without leaving the battlefield; verify popover placement around all four screen edges.
- Recruit, rotate, upgrade, replace a fallen hero, and start the next wave using touch only. Verify keyboard setup and actions too.
- Pointer coordinates remain accurate after resizing and rotating. Overlay interaction never places/selects units behind it.
- Large dialogs stay within the viewport, manage focus, and restore the correct pause state; touch controls target at least 44×44 CSS pixels where possible.
- Permanent purchases apply to the next constructed run without a reload; saved Favor, unlocks, last map, and personal bests survive migration.
- Retry and map changes leave one simulation loop and one set of input handlers active.
- Run `npm run test:tower-defense` and `npm run test:td-balance` after implementation. Add focused regression coverage for new coordinate/state behavior where needed. Do not run `npm run build`; the user runs that check.

First reviewable milestone: map selection → preparation in a viewport-fitted shell → tap hero and upgrade beside it, demonstrated at 844×390 and desktop size. Follow with complete Blessings, settings, results, and accessibility integration.

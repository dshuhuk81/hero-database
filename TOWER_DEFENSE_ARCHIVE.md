# Tower Defense - Completed Work Archive

## Baseline (shipped September 23, 2026)
One-map prototype. Hero placement, automatic combat, gold/lives/score, 10-wave run, boss wave. User completed first full run and beat Baphomet.

## Milestones 1A-4
- Armor mitigation formula (armor / (armor + K), K=260)
- Flyer counters (platform-only targeting, flying flag)
- Ranged enemy behavior (archer enemies stop and shoot from distance)
- Hero upgrades Lv1-4 with gold cost
- Support auras (attack bonus to nearby allies, heal variant for TEAM_HEAL heroes)
- Kenney Micro Roguelike enemy sprites (6 kinds, sliced from packed sheet)
- Particle FX (shot tracers, hit rings, death fade)
- Audio (place, upgrade, error, wave-clear, boss-enter SFX)
- 5-squad balance harness (headless test runner)

## Milestone 5 - Retention (all done)
- **5A**: Economy retuned - kill rewards, upgrade prices, wave-clear bonus calibrated
- **5B**: Hero-named blessings (Divine Favor pre-run tree, 12 nodes, 3 tiers) + pair synergies (Storm Bond, Iron Pact, Celestial Accord, etc.)
- **5C**: Synergy links visible on canvas, HUD badge, inspector bonus line
- **5D**: Run result screen with MVP hero, run duration, gold efficiency, achievements, per-map bests

## Milestone 6A - Meta-progression
- Divine Favor tree: 12 nodes, 3 tiers, spend points before run, earn 1 point per run
- Applied effects: startingGold, lives, damage, tankHp, mageRange (partial - some effects no-ops until sim reads them)

## Milestone 7 (partial)
- **P4**: Kenney enemy sprites upgraded to per-kind tiles (all 6 enemy types, hit-flash, death-fade animation)
- **Second map**: Verdant Crossing (S-curve layout, green theme, balance-verified)

## UX + Bug Fixes (September 24, 2026)
- **Command panel sticky**: added `position: sticky; top: 0; max-height: 100svh` to `.td-command` - CTA always visible without scroll
- **Slot-first placement UX**: removed pre-pick-5-heroes phase; clicking a ring shows filtered hero list for that slot type; heroes auto-enlist into team on first placement
- **Hero images CORS fix**: Vite proxy at `/r2` routes to R2 CDN in dev; PixiJS WebGL texture upload requires CORS headers which R2 lacks; proxy makes requests same-origin
- **Default rotation**: heroes face toward incoming enemies on placement; `defaultRotationFor(x,y)` finds nearest path segment and computes entry direction + PI
- **Bug 02 - Nyx range**: `findTarget` for `shadow_step` variant now filters by `hero.range` before sorting by HP (previously attacked any alive enemy anywhere on map)
- **UI Issue 03b - deselect**: clicking empty canvas or empty slot during combat clears `selectedEntityId` and hides inspector instead of showing "select a hero first" message
- **UI Issue 03 - inspector stats**: hero popover shows an always-visible Attack / Speed / Range / Crit row; Attack is the effective value (`attackValue`: aura, synergy, ultimate buff, run modifiers), gold when boosted with the base value in its tooltip; refreshed with health 4x/s; class moved into the level line; upgrade preview uses the same multiplier
- **UI Issue 04 - Favor tree graph**: tier columns joined by connectors (solid gold when the gate is met, dashed when not; stack vertically on narrow portrait); tier header shows owned count and a pip meter for the "N of previous tier" gate with a "Own X more" hint; nodes have four distinct states: Unlocked (gold check badge), Available (primary buy button), Short on Favor (quiet disabled button with "need N more"), Locked (dashed, lock icon, cost chip, no button)
- **UI Issue 05 - range ring glow**: `drawRangeRing` draws a 3px edge at 0.9 alpha over two soft halo strokes (12px/6px) and an inner falloff band, with 0.08 fill; applies to the placement preview and the selected hero
- **6B Run quests**: one quest per wave (none on the final wave), rolled at wave start from a separate seeded RNG so combat randomness is unchanged. Types: No leaks, No hero falls (only offered with a road hero deployed), Speed clear (clear within `speedClearTravel` x slowest enemy's full-path time after the last spawn, live countdown). Reward `goldBase + goldPerWave x (wave - 1)` gold at wave clear (`tuning.quests`: 40 / 10 / 0.5; no key disables quests). Quest chip replaces the wave preview during a wave; fail and complete notices; Quests stat on the result screen; help entry; tests in `test-td-sim.mjs`. Bot completion rates (5 squads x 2 maps x 10 seeds): No leaks 70%, Speed clear 53%, No hero falls 21%. Balance: `td:sweep` wins at x2.5 and x3 HP went from 1/5 and 0/5 to 1/5 and 1/5 on Moonlit Pass; other cells within noise
- **6C Result loot**: runs reaching wave 3 pick one of three shards on the result screen: Favor shard (10% of the run's Favor, min 5; granted by default so closing the page loses nothing), Gold shard (+60 starting gold next run) or Virtue shard (next run starts with a virtue rolled and named at pick time). Boosts are saved as `nextRunBoost` (one pending, a new pick replaces it), folded in by `buildRunTuning(tuning, favTree, boost)` so a Favor rebuild keeps them, and cleared when the boosted run's wave 1 starts (backing out to the lobby keeps them). Switching away from the Favor shard is blocked once that Favor is spent. Lobby shows the pending boost; `tuning.shards` holds the numbers; tests in `test-td-favor.mjs` and `test-td-save.mjs`
- **P5 Effect hierarchy**: `FX_TIERS` / `effectTier()` in `render.js` map every effect to minor (shots, hits), major (crits, ultimates) or epic (boss entrance, boss death). Major: 1.6x rings, white core flash and spark ring on crits. Epic: 2.6x expanding rings, bigger bursts, 7px screen shake and a red edge vignette fading over 0.5s (off with reduced motion). Sim adds a `crit` flag on hit effects and a `bossDown` effect (combat RNG order unchanged; `test:td-balance` output identical). Boss entrance: 2.5s DOM nameplate (Final wave, name, faction and class, portrait) over the map; visual only, the run keeps going

## Portrait sprites from extracted game assets
- 5 enemy portraits extracted from APK (`extracted/UI_Headportraits/`), resized to 128x128 PNG
- Placed at `public/td/enemies/{grunt,runner,flyer,archer,brute}.png`
- Renderer loads them as circle-masked PIXI.Sprites (primary), falls back to Kenney tiles, then vector shape
- AI agent sprite spec written at `src/game/td/sprite-spec-for-ai.md` (12 sprites: 5 enemies + 7 bosses, 256x256 transparent PNG, 3/4-view, with reference portraits and color palettes)

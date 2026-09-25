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
- **UI Issue 06 - level badge**: floating "LvN" text removed. The hero border is one arc per level (`upgrades.maxLevel`), owned arcs solid gold, the rest dim, filling clockwise from the top; at max level the ring closes and glows. A gold number disc sits on the border at bottom-right, in the gap between arcs. Redrawn only when the level changes (`drawLevelBorder` in `render.js`)
- **5E Between-wave pacing**: wave-clear chime (the registered `clear` sound was never played; now via `ctx.actions.playSound`). Gold gains of 25 or more count up over 0.6s with a "+N" flash in the Gold label row; kill gold stays instant. Opt-in Auto toggle in the top bar (remembered in `localStorage` `td:autonext`): 10s countdown after each cleared wave, shown on the main button, held while a blessing offer is pending, any pause reason is active (panel, manual) or the recruit sheet is open; not before wave 1. Help entry added

## Portrait sprites from extracted game assets
- 5 enemy portraits extracted from APK (`extracted/UI_Headportraits/`), resized to 128x128 PNG
- Placed at `public/td/enemies/{grunt,runner,flyer,archer,brute}.png`
- Renderer loads them as circle-masked PIXI.Sprites (primary), falls back to Kenney tiles, then vector shape
- AI agent sprite spec written at `src/game/td/sprite-spec-for-ai.md` (12 sprites: 5 enemies + 7 bosses, 256x256 transparent PNG, 3/4-view, with reference portraits and color palettes)

## M5 Gameplay (September 25, 2026)
- **Ultimates audit**: every-variant edge-case tests plus four fixes (corpse targeting, knockback position, chain lightning double hits, actions after the run ended). Details in `docs/tower-defense-ui-plan.md` M5
- **Blocking balance**: block limit per blocker (Tank 3, Warrior 2, Assassin 1). Mixed squads now match all-platform squads at the live difficulty; details in `docs/tower-defense-ui-plan.md` M5
- **Anubis**: 21st TD hero, Featherfall Judgment (stun + kill refund); details in `docs/tower-defense-ui-plan.md` M5
- **Road ultimates skip flyers**: matches basic attacks (decision); wins unchanged
- **Animated heroes**: recruit sheet preview plays the in-game Spine idle loop (pre-rendered sprite sheets)
- **Tooling**: `npm run check` (`astro check`)

## Map work (archived September 25, 2026, handled separately)
Map items moved out of the roadmap; the owner does maps separately.
- P3 Two new maps: Crimson Forge (parallel lanes) + Frozen Citadel (spiral), skipped
- Map art: no engine switch needed; brief in `docs/tower-defense-map-art-audit.md`
- Map changes list: (1) done: late-loading full-body enemy sprites now replace fallback art; (2) visible spawn and base (paths 8-11% shorter, needs balance approval); (3) Moonlit Pass art pass; (4) Verdant Crossing art pass; (5) polish and profiling; (6) multiple spawn points

**Map art: no new engine.** PixiJS 8 is already a full WebGL 2D renderer. Phaser would add scenes, physics and input helpers, none of which are the gap, and would mean rewriting `render.js` (about 1,000 lines). The flat look comes from the art setup: both maps share one world-map image, the path is a uniform tiled cobble band with a gold halo and a centerline, there are no shadows, props or ambient motion. Possible upgrades inside Pixi when this comes back: one background per map, a soft drop shadow and worn edges on the path (blurred mask), scenery sprites along the path sorted by y, unit drop shadows, ambient particles (mist, fireflies, embers), color grading per map (`pixi-filters` AdjustmentFilter, Godray, Bloom), animated portals.

## Awakening (September 25, 2026)
- Step after level 4 (`tuning.awakening`: 220 gold, +15% attack, +25% health on top of level 4), lost on death like levels, once per deployed unit
- Every ultimate gets an approved upgrade (table in `AWAKEN_TEXT`, `src/game/td/page/popover.ts`; numbers in `castUltimate`, `sim.js`); Caishen's awakened ultimate pays 15 gold per cast
- Popover: Awaken button with stat and ultimate preview, "Awakened" state; token: radiant double ring and star badge; burst effect and upgrade sound
- Balance (5 squads x 2 maps x 3 seeds, enemyHp 2 / 2.5 / 3): wins identical with and without Awakening; all-platform keeps more lives (20.0 -> 22.5 at x2); bots awakened 52 times in 90 runs
- Tests: awakening path, loss on death, every awakened ultimate against a crowd, specific numbers (Zeus bounces, Medusa and Poseidon targets, Caishen gold, Horus hits)


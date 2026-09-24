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

## Portrait sprites from extracted game assets
- 5 enemy portraits extracted from APK (`extracted/UI_Headportraits/`), resized to 128x128 PNG
- Placed at `public/td/enemies/{grunt,runner,flyer,archer,brute}.png`
- Renderer loads them as circle-masked PIXI.Sprites (primary), falls back to Kenney tiles, then vector shape
- AI agent sprite spec written at `src/game/td/sprite-spec-for-ai.md` (12 sprites: 5 enemies + 7 bosses, 256x256 transparent PNG, 3/4-view, with reference portraits and color palettes)

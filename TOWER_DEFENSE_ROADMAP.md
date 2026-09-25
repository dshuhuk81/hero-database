# Tower Defense Roadmap

Last updated: September 24, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

## What's next (priority order)

| # | Item | Why |
|---|------|-----|
| 1 | **P3 Two new maps** skip | Crimson Forge (parallel lanes) + Frozen Citadel (spiral); add to `tdMaps.json` |
| 2 | **AI sprites** | Hand spec at `src/game/td/sprite-spec-for-ai.md` to AI agent or finde a workflow to create 2d sprite assets to use from the original game 3d art images (like the ones we use for portraits on the r2 server); drop into `public/td/enemies/` or use `https://comfy.org/workflows/templates-sprite_sheet-fe5600667e2c/` or `https://giventofly.github.io/pixelit/` |
| 3 | **Map Art and Map Upgrades** | How can we elevate the map artstyle to be more haptic? Do we need another game engine? What are the possibilities? Phaser? If not, ignore for the time being.


## Dev commands

```
npm run test:tower-defense      # headless combat/upgrade/virtue checks
npm run test:td-balance         # 5-squad balance harness
npm run build:game-balance      # regenerate hero balance
```

`window.tdGame` and `window.tdRenderer` available in browser for debugging.

## Known gaps / deferred

- Favor tree effects beyond startingGold/lives are returned by applyFavorTree but some are no-ops until sim reads them (tank HP, mage range, etc.)
- Sound variants not listening-pass verified
- "No hero falls" quest completes only 21% in bot runs because road heroes die often (blocking balance, see M5 in `docs/tower-defense-ui-plan.md`); revisit after that fix. Kill-count quest type was offered and not picked
- Mobile / landscape layout (large scope, deferred)
- Endless mode, 20-wave mode, leaderboard, replays (deferred per original spec)

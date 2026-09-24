# Tower Defense Roadmap

Last updated: September 24, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

## What's next (priority order)

| # | Item | Why |
|---|------|-----|
| 1 | **UI Issue 03** - Inspector stats | Show ATK / APS / Range numbers at a glance |
| 2 | **UI Issue 04** - Favor tree visual graph | Flat list is hard to read; needs tier lines + unlock state |
| 3 | **6B Run quests** | In-run objectives beyond "survive"; bonus gold / virtue pick on completion |
| 4 | **P3 Two new maps** | Crimson Forge (parallel lanes) + Frozen Citadel (spiral); add to `tdMaps.json` |
| 5 | **UI Issue 05** - Range ring glow | Thicker stroke + low-alpha fill, more readable |
| 6 | **6C Result loot** | Virtue shard pick at run end, feeds Favor pool |
| 7 | **P5 Effect hierarchy** | Boss entrance cinematic (2.5s nameplate), 3-tier effect scale |
| 8 | **UI Issue 06** - Level badge | Integrate into hero circle border instead of floating text |
| 9 | **5E Between-wave pacing** | Wave-clear chime, gold-inflow animation, auto-next countdown |
| 10 | **AI sprites** | Hand spec at `src/game/td/sprite-spec-for-ai.md` to AI agent; drop into `public/td/enemies/` |

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
- Mobile / landscape layout (large scope, deferred)
- Endless mode, 20-wave mode, leaderboard, replays (deferred per original spec)

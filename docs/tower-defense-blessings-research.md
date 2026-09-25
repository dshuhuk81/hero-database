# Divine Blessings 2.0: research and proposal (M4)

Status: decided and built (first version), September 25, 2026. See section 7.

## 1. The problem, measured

Current tree (`src/data/favorTree.json`, `src/game/td/favor.js`): 12 nodes in 3 tiers, each bought once.

| Tier | Nodes | Cost each | Tier total |
| --- | --- | --- | --- |
| 1 | 4 | 25 | 100 |
| 2 | 4 | 60 | 240 |
| 3 | 4 | 120 | 480 |
| All | 12 | | **820 Favor** |

Favor per run (`tuning.favorEarn`, measured with the 5 bot squads on both maps): a finished run pays about **130 to 190 Favor** (10 per wave, 5 per perfect wave, 20 for the boss, up to 25 for lives left). A losing run still pays 40 to 100.

So the whole tree is bought after **5 to 6 runs, roughly 45 to 60 minutes of play**. After that, Favor has no use. The nodes are also mostly small flat numbers (+25 gold, +1 life, +5% HP), so buying one rarely changes how you play.

## 2. What the reference games do

**Infinitode 2 (the moodboard, `src/game/moodboards/infinitode2-upgrade.jpg`, `examples/research.png`)**
- One large connected graph: a central trunk of global research, and a colored branch per tower type (Basic, Sniper, Cannon ...) hanging off it.
- Most nodes have many levels (0/3, 0/5, up to L30) with a small gain per level (the screenshot: Sniper range +15% total, +3% next level). Cost rises per level.
- Several currencies of increasing rarity: green papers (common) plus resources mined in levels (Scalar, then Vector, Matrix, Tensor, Infinitiar). Early nodes need common ones, deep nodes the rare ones. Some nodes need level stars.
- Towers also gain XP during a run. At XP levels 4 and 7 the player picks 1 of 3 abilities, at 10 a fourth comes automatically, at 20 a choice between an ultimate and a flat power boost. Research raises the maximum tower level (4 at start, 20 with full research). So research does not only add stats: it opens more in-run choices.
- A separate Endless research with its own currency (Bit Dust) and much higher level caps, as the long-term sink.

**Bloons TD 6: Monkey Knowledge**
- 6 trees by category (Primary, Military, Magic, Support, Heroes, Powers), about 134 points to finish, 1 point per account level after level 30.
- Mix of stat nodes ("+1 pierce") and behavior nodes ("start each game with a free Dart Monkey", new targeting options).
- Deeper tiers need a number of points already spent in that tree plus specific prerequisite nodes.
- Knowledge can be toggled per node or turned off per game, and fully respecced for a fee.

**Kingdom Rush**
- Older games: one linear 5-step tree per tower type and per spell, paid with stars from levels.
- Newer entries: every tower, hero and spell has its own tree whose points are earned by using it; each tree has mutually exclusive pairs.

**Rogue Tower**: XP from runs unlocks new towers, upgrade cards that can appear during a run, and permanent stat bonuses.

**Design literature on roguelite meta progression (Bugnet, Entalto, Echoes of Myth dev blog)**
- Vertical progression (more damage, more health) makes the game easier; horizontal progression (new options, new mechanics) makes it more varied. Long-lived roguelites lean on horizontal.
- A useful test for every node: "does this change what the player does?"
- If permanent power is too strong, skill stops mattering; if it is too weak, players feel stuck.

## 3. What we already have that fits

- **21 heroes in 6 classes**, each with its own ultimate variant (`tuning.heroSkills`). Per-hero trees are possible without inventing new heroes.
- **In-run hero levels, the new level-3 focus and Awakening at level 5**: this is the same shape as Infinitode's tower XP abilities. Research can open more of these choices instead of only adding stats.
- **Motto Immortal's own vocabulary**: heroes ascend Mythic, then Divine 1 to Divine 5, and every TD hero has a Virtue grid in `src/data/virtueGrids.json` (all 21 covered). This gives a natural name and staging for per-hero ranks.
- **Run-end shards** (6C) and **boss kills per map** (Baphomet, Lilith): natural sources for a rarer currency and for gates.
- **M1 (20-wave and endless mode)** is the content sink that a deeper tree needs. Without harder content, a bigger tree only makes the 10-wave run trivial.

## 4. Proposal

### 4.1 Structure: trunk plus hero branches

```
                [ Hero branches: 21, colored by class ]
     Nyx   Bastet   Anubis ...        Zeus   Phoenix   Fengyi ...
       \      |      /                   \      |      /
        [ Assassin hub ]                  [ Mage hub ]        ... 6 class hubs
                 \                          /
                  ---- [ Divine trunk ] ----
                     (global, like today)
```

- **Divine trunk** (global): today's 12 nodes, turned into leveled nodes (for example Starting gold 5 levels, +10 each) plus new global options. This stays the Favor sink.
- **Class hubs** (6): small nodes that affect a whole class (today's "Tank HP", "Mage range" belong here). Unlock a hub by owning trunk nodes; a hub opens its heroes' branches.
- **Hero branches** (21): the deep part, one per hero, about 8 to 10 nodes.

### 4.2 A hero branch (template)

| Stage (name from the game) | Nodes | Kind |
| --- | --- | --- |
| Mythic | Attack, Health, Attack speed, Range: 5 levels each, small per level (for example +2% per level) | Vertical, cheap, many clicks |
| Divine 1 | Start at level 2 when deployed | Changes the early game |
| Divine 2 | A 4th focus option at level 3, specific to the hero's class (for example Tank: "Taunt radius", Support: "Aura radius") | Horizontal |
| Divine 3 | Choice of 1 of 2 ultimate modifiers, mutually exclusive (like Kingdom Rush) | Horizontal |
| Divine 4 | Cheaper Awakening or redeploy at half cost | Economy |
| Divine 5 | Awakened ultimate gets a second effect | Capstone |

Ultimate modifiers are TD design, not game facts; they should build on each hero's existing variant in `tuning.heroSkills` and live in the tuning file (see the "don't invent" rule: invented minigame balance is fine when it lives in the labeled TD data).

### 4.3 Currencies

- **Favor** (existing): trunk and class hubs. Keep the current earn rates.
- **Insight per hero** (new): earned only by the heroes you deploy, for example 1 per wave the hero was on the field plus 1 per 5 kills. Pays for that hero's branch. This is the Kingdom Rush idea: you grow the heroes you play, and it rewards trying the whole roster.
- **Divine shards** (optional, reuse 6C): rare, from boss kills and perfect runs. Only the Divine 3 to 5 nodes need them, so deep nodes feel earned.

### 4.4 Pacing targets

| Goal | Target |
| --- | --- |
| Trunk complete | 15 to 20 hours |
| One hero branch complete | 10 to 15 runs with that hero |
| Everything | open-ended, only reachable with M1 endless |

With about 150 Favor per run, a 15 to 20 hour trunk means about 15,000 to 20,000 Favor of trunk nodes, so leveled nodes with rising costs (for example cost x1.35 per level) are needed. The exact numbers come from a pacing simulation once the node list exists.

### 4.5 Power budget

A deeper tree adds permanent power, so it needs a counterweight:
- Keep per-level gains small, and most new nodes horizontal.
- Cap total vertical bonuses per stat (for example at most +30% attack from the tree).
- Add difficulty tiers or use M1 endless as the place where full power is needed (Infinitode's Endless research idea).
- BTD6 lesson: allow turning the tree off (or a "no blessings" toggle) for players who want the pure run, and a free or cheap respec so a wrong choice is not permanent.

### 4.6 UI

Infinitode-style graph screen:
- Pan and zoom over the whole graph (mouse drag and wheel, touch drag and pinch). Around 250 to 300 nodes at full size, so SVG with CSS transforms is enough; no new dependency.
- Nodes show level as "3/5", locked nodes greyed with the reason.
- A detail panel (right side on desktop, bottom sheet on phones, like the hero popover): effect now, next level, cost per currency, Buy button.
- Class colors for the branches; hero token in each branch root.

### 4.7 Save migration

`favTree: string[]` becomes `favLevels: Record<string, number>`. Every node in today's tree maps to level 1 of its new leveled node (or is refunded as Favor if the node is removed). Insight per hero is a new map, starting at 0; it could be seeded from past runs only if we had stored per-hero history, which we have not.

## 5. Phased plan

1. **Data model**: leveled nodes, requirement rules (points in tree, specific nodes), cost curves; save migration with tests. Trunk keeps today's effects.
2. **Insight**: per-hero earning at run end, shown in results.
3. **Three pilot hero branches** (one road, one platform, one support), balance checked with `td:sweep` and the bot runner (bots can buy nodes too).
4. **Graph UI** replacing the current Blessings tree tab.
5. **Remaining 18 branches**, then endless research together with M1.

## 6. Decisions needed

1. **Branch unit**: per hero (21 trees, most depth, most work) or per class (6 trees, faster to build)? A middle path: build class trees first, add hero capstones later.
2. **Currency**: Favor only, or Favor plus per-hero Insight (recommended)?
3. **Keep or refund** today's 12 purchases when the tree changes?
4. **Respec**: free toggle, paid respec, or none?
5. **Difficulty**: add tiers now, or rely on M1 endless as the sink?

## 7. Decisions and what was built (September 25, 2026)

Decisions: branches **per class** (6), currency **Favor plus Insight**, old purchases **refunded**, **paid reset**, no difficulty tiers (endless mode is built in parallel and is the power sink).

Built:
- Data: `src/data/blessingTree.json` (replaces `favorTree.json`): 14 trunk nodes in 4 tiers (51 levels, 14,865 Favor), and one branch per class with the same template: Mythic (Might, Vigor, Swiftness, Reach, 5 levels each), Divine I Early Ascension (enter at level 2), Divine II class special (Tank/Warrior hold +1 enemy, Assassin execute +10%, Mage +20 px range, Archer +8% crit, Support heals and aura +25%), Divine III Surge or Wrath (ult charge or ult power +15%, pick one), Divine IV Divine Rite (Awakening -30% gold), Divine V Apotheosis (awakened +15% attack and HP). 25 levels, 620 Insight per branch. Level prices grow x1.35.
- Rules (`favor.js`): deeper stages need levels bought in the same tree, plus the node above; `canBuy` returns the reason shown in the UI.
- Insight: each hero that stood on the field during a cleared wave earns its class 2, plus 1 per 5 kills (fallen heroes included).
- Save: `favLevels`, `insight`, `resetSpent`; the old `favTree` is dropped and its Favor (up to 820) refunded, with a one-time notice. Reset costs 150 Favor and refunds all levels.
- UI (`page/blessings.ts`): pannable, zoomable graph (drag, wheel, pinch, +/-/Fit), node buttons with level "2/5", detail panel with now/next effect and price, Insight chips per class. Detail sits beside the graph, below it on portrait phones.

Measured pacing (bot squads, both maps): about 116 Favor per run, so the trunk takes about 128 runs. Insight per hero per run: Mage 27, Assassin 27, Archer 24, Tank 18, Support 17, Warrior 15; a branch takes 11 to 21 runs with two heroes of that class.

Measured power (difficulty sweep, 2 seeds): without blessings squads win up to enemy HP x2 (the live setting); with the full trunk about x3; with everything about x4 to x5. The 10-wave mode becomes easy late in the progression, so endless mode is where full power is needed. The bots never use the 6th team slot, so real players are a bit stronger still.

## Sources

- [Infinitode 2 Researches (Fandom)](https://infinitode-2.fandom.com/wiki/Researches), [Research Tree summary (Shapes)](https://shapes.inc/fandom/infinitode-2-infinite-tower-defense/research-tree), [Towers and tower XP abilities (Fandom)](https://infinitode-2.fandom.com/wiki/Towers), [Steam discussion: research tree guides](https://steamcommunity.com/app/937310/discussions/0/3083268548814864072/)
- [Monkey Knowledge, BTD6 (Blooncyclopedia)](https://www.bloonswiki.com/Monkey_Knowledge_(BTD6)), [Monkey Knowledge (Fandom)](https://bloons.fandom.com/wiki/Monkey_Knowledge_(BTD6))
- [Kingdom Rush Upgrades (Fandom)](https://kingdomrushtd.fandom.com/wiki/Upgrades)
- [Rogue Tower Upgrades (Fandom)](https://rogue-tower.fandom.com/wiki/Upgrades)
- [How to Design a Roguelite Meta-Progression (Bugnet)](https://bugnet.io/blog/how-to-design-a-roguelite-meta-progression), [5 Essential Tips for Roguelites (Entalto Studios)](https://entaltostudios.com/5-essential-tips-to-make-your-roguelite-game-work/), [Meta-Progression and Difficulty Curves (Echoes of Myth dev blog)](https://echoesofmyth-devblog.blogspot.com/2025/02/roguelite-meta-progression-and.html)

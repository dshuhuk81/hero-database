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
- **Divine Blessings 2.0** (September 25, 2026): `blessingTree.json` replaces `favorTree.json`. Divine trunk (Favor, 14 leveled nodes, 14,865 Favor) plus one branch per hero class (Insight, 25 levels, 620 each: Mythic stats, Early Ascension, class special, Surge or Wrath, Divine Rite, Apotheosis). Insight: 2 per wave a hero stood on the field, 1 per 5 kills, for its class. Old purchases refunded with a one-time notice; reset costs 150 Favor. Graph screen `page/blessings.ts` (drag, wheel, pinch, Fit). Also: `setTeam` accepts 1 up to the team size (Set's Command slot). Research, decisions and measurements: `docs/tower-defense-blessings-research.md`
- **Level focus** (September 25, 2026): the upgrade to level 3 asks for a focus, `tuning.upgrades.focus`: attack +10%, health +25% or range +20%; kept through level 4 and Awakening, lost when the unit falls. Popover: the upgrade button opens three options with previews (keyboard focus moves to the first). Bots pick health on the road, attack on platforms (`td-runner.mjs` `focus` option). Balance, 5 squads x 2 maps x 4 seeds, all heroes one focus: attack 29/40, health 28/40, range 27/40; without the feature 24/40, so runs got slightly easier
- **Lilith** (September 25, 2026): final boss of Verdant Crossing (boss per map via `tdMaps.json` `"boss"`, default Baphomet). HP 2600; Garden of Flesh summons 3 children (HP 600% of her ATK), she cannot be hit while summoning and takes the damage her children take; Flesh Growth re-summons them at 60%. Config `tuning.bosses.lilith`, `enemies.brood`. Coplay sprites `boss-lilith-v1.webp`, `brood-v1.webp` on R2. Verdant 13/20 wins vs 15/20 with Baphomet. Not done: End of All (children +200% attack speed); more bosses only with more maps
- **Mobile landscape re-check** (September 25, 2026): the layout itself shipped in UI plan M1 (September 24); re-verified with Playwright after map2, quests, buff bar and recruit animations at 667x375, 844x390, 915x412, 390x844, 1024x768 and 1440x900 on both maps: no document scroll, all rings and both path ends reachable, every hero popover inside the viewport. Fixed: in short landscape the notice now sits bottom-right instead of covering the bottom-left quest chip; Slayer chip text shortened to "Nyx kills 0/3". Dev-only: the DBG button pushes the Menu button below the rail at 375 and 390 px height (not in production)
- **Slayer quest** (September 25, 2026): fourth run quest `heroKills`. Names a random deployed hero (needs 2 or more deployed) who must land `round(wave enemies / deployed heroes x heroKillsShare)` kills; fails at once if that hero falls, pays at wave clear like the others. `heroKillsShare` 0.6 from a kill-share probe (about 62% success; damage dealers like Zeus and Phoenix average 1.5x an even split, supports like Yuelao and Freya 0.2 to 0.3x, so a support roll is a hard quest). Tests in `test-td-sim.mjs`

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

## Roadmap M1: 20-wave and endless mode (done September 25, 2026)

- Goal: longer runs beyond the current wave count; 20-wave mode with a boss every 5th wave, then endless as an extension.
- Scope: wave generator scaling past the current table, boss cadence, mode picker on the start screen, local best score per mode in the existing `td:v1` save.
- Done when: both modes finish a headless sweep without runaway or trivial difficulty, and the save stays backward compatible.
- Done (September 25, 2026): `src/game/td/waves.js` builds the tables (modes `classic`, `long`, `endless`; classic is `tdWaves.json` unchanged). Longer modes add a boss every 5th wave; bosses before the last are scaled by `tuning.waveGen.midBossScale` (0.4, HP and attack, Lilith's children too), the wave-20 boss and endless bosses from wave 20 are full strength. Waves past 10 cycle base waves 6-9 with +2% enemies and -2% gaps per wave (gap floor 55%); the sim appends endless waves as it goes. Play opens a run length step for the selected map (panel `mode`, each length with that map's best; last pick remembered in `td:mode` and focused), HUD wave total (∞ in endless), boss label and notice on every boss wave. Per-mode records live in `mapTop`/`mapBests` under `map@mode` keys (classic keeps the plain map id, `bestScore` stays the classic record), so old saves load unchanged. Sweep: `npm run td:sweep -- --mode=long|endless`; `test:td-balance` now asserts 20 waves has winners and losers per map and endless ends before the 150-wave guard with a run past wave 20. Results (seed 99-102, no blessings): 20 waves 15/40 wins; endless best squads reach 22-26, with every blessing maxed 30-40.
- Open: endless earns Favor per wave with no cap (farmable); decide with M4 pacing.

## Roadmap M5: Change difficulty and behaviour (done September 25, 2026)
I realize that the "system" only to place 5 heroes is not very rewarding. At the moment ground heroes die too fast and they cant stop rushers good enough. Therefore I think the best would be to remove the "place only 5" heroes.

- Done (September 25, 2026): team cap removed (`tuning.run.maxTeam` gone). Every ring can hold a hero; free rings, gold and "each hero once" are the only limits, and Valkyrie revives are no longer blocked. The deck shows no empty slots any more and scrolls sideways when full. Lobby and help text updated. The save's `lastTeam` is no longer capped.
- Set's Command (trunk capstone, was +1 team slot) now gives +150 starting gold. The node id stays `set_command`, so saves that bought it keep it.
- Road classes (Tank, Warrior, Assassin) get `hpMult` 1.7 and `armorMult` 1.5 in `tuning.classes`, applied in `build-game-balance.mjs` after pricing, so costs don't change. Road deaths per run drop by about half (probe at x2.75, 5 squads x 3 seeds: Moonlit 198 -> 101, Verdant 192 -> 122).
- Difficulty `enemyHp` 2 -> 2.75 (more heroes made runs much easier). Bot squads in `scripts/lib/td-runner.mjs` are now priority lists that fill every ring (the first five are the old squad). 10 waves: 8/10 wins, 1 perfect; mixed squads now beat all-platform, which was the top squad before. 20 waves: Moonlit 1/5, Verdant 4/5. Endless: Moonlit 10-21, Verdant 10-37.
- Open: leaks barely drop with more HP. Rushers get past mainly because of the block limit (Tank 3, Warrior 2, Assassin 1), not because blockers die. If rushers still leak in real play, raise the block limits or slow runners on contact. The road-wall squad still loses (it has no damage platforms).

## Roadmap M6: Class identity (done September 25, 2026)

- Goal: every class has a unique, visible job on the battlefield, and which classes you place changes the outcome.
- Done when: the three measurable checks under "Done criteria" pass, and each class is recognizable in play from its basic attack alone.
- Done (September 25, 2026): class kits live in `tuning.classes` and shape every basic attack (`basicAttack` in `sim.js`), plus a class part in every ultimate (`classUltimate`). Details and measured results under "Shipped" below. `npm run td:classes` prints all three criteria; `test:td-balance` asserts criterion 1.
- Open: criterion 2 fails for Warriors (the squad does as well without them), criterion 3 fails on Verdant (three Mages alone win there on every seed, Verdant is the easiest map overall). Next tuning ideas under "Shipped".

**Original notes (September 25, 2026).** While playing there is no real difference which class goes on the battlefield. Ideas: Tanks only block and survive, little damage, maybe a defense attribute, ultimate makes them invincible. Archers are slow, long range, big single shots, ultimate hits several enemies. Mages deal area and chain damage, high damage but slow, ultimate is a devastating area attack or a channeled beam. Assassins block 1 and deal damage, ultimate makes them untargetable while striking +1 enemy several times. Warriors have decent HP and attack, block +1, ultimate hits several enemies. Supports deal no damage; they heal, buff and revive.

**Diagnosis (sim audit, September 25, 2026).**

- Every basic attack is the same single-target hit on a timer ([sim.js:453-465](src/game/td/sim.js#L453-L465)); the only class difference is Assassins targeting the lowest HP.
- Class averages (21 heroes in `gameBalance.json`):

  | Class | DPS | APS | HP | Range |
  |---|---|---|---|---|
  | Mage | 47 | 1.43 | 520 | 160 |
  | Archer | 40 | 1.21 | 448 | 190 |
  | Assassin | 40 | 1.36 | 923 | 90 |
  | Warrior | 38 | 1.17 | 1221 | 70 |
  | Tank | 30 | 0.89 | 1404 | 60 |
  | Support | 24 | 0.65 | 502 | 150 |

  DPS spread is narrow (24 to 47). Mages attack fastest (the opposite of the concept) and Supports have the highest base attack (38.7).
- Class identity shows only in the ultimate (every 15 to 27 s), so about 95% of the fight looks the same for every class.
- Enemies don't ask for specific classes: no enemy has `magicRes`, so magic vs. physical doesn't matter, and nothing punishes single-target damage against swarms. Flyers are the only real counter (road vs. platform).

**Principles.**

1. Class identity lives in the basic attack (always visible). The ultimate amplifies it and does not replace it.
2. Enemies must demand classes. Without counters, classes only look different and the choice still doesn't matter.
3. No new stats where an existing one works (armor already reduces damage through `resolveDamage`); use class passives instead.
4. The 21 hero variants in `tuning.heroSkills` stay as per-hero flavor on top of the class rules.

**Class concept.**

| Class | Role | Basic attack / passive | Ultimate direction | Counters | Visual |
|---|---|---|---|---|---|
| Tank | Hold the line | Low damage. Blocks 3. Passive: takes about 30% less damage (instead of a new defense stat). | Taunt and hold every enemy in radius for x s. Stronger than invincibility, since Tanks rarely die after M5, and it answers the open M5 runner leak. | Runners, brutes | Shield icon, taunt ring |
| Warrior | Frontline damage | Cleave on every hit: main target plus 1 to 2 neighbors at about 50%. Blocks 2. | Whirlwind hitting everyone in melee range | Swarms at the block point | Slash arc |
| Assassin | Leak catcher | Highest single-target melee DPS, blocks 1. Jumps to the enemy that got past the blockers or is furthest along the path. | Untargetable plus a multi-strike. The enemy it was blocking stays blocked (does not walk on) but cannot damage it. | Runners that slip through, low-HP finishing | Dash trail |
| Archer | Sniper | Slow, heavy shots, longest range, prefers high-HP targets, higher crit | Volley on several targets | Brutes, bosses, brood, flyers | Arrow projectile |
| Mage | Area damage | Slow attack speed, splash or chain per hero (e.g. Zeus chains, others splash), magic damage that ignores armor | Big area burst or channeled beam | Swarms, armored enemies | Orb and splash, lightning chain |
| Support | Force multiplier | No or little damage. Heals road heroes, attack or attack-speed aura, revives. | Stronger version of its support effect | Long waves (keeps the line alive) | Heal beam, aura ring |

**Enemy side (needed so the choice matters).**

- Add `magicRes` to enemy kinds, and make brutes, bosses and brood heavily armored so magic damage counts.
- Swarm waves (many grunts or runners close together) where area damage clearly wins.
- Runner-heavy waves that break a pure blocker line without an Assassin or Tank control.
- Flyers stay the platform check.

**Hidden work.**

- Pricing: `build-game-balance.mjs` prices heroes from single-target DPS. Splash, chain and cleave need an effective-DPS model (for example DPS x expected targets hit), or area heroes come out too cheap.
- Blessing class branches in `blessingTree.json` are generic today (aps, crit, execute, blockLimit). Remap them so each branch strengthens its class identity.
- Bots in `scripts/lib/td-runner.mjs` need squads that use Supports and the new counters, or sweeps will rate those classes as useless.
- Class stats: flip Mage to slow and hard-hitting, drop Support base attack, widen Archer range vs. Mage.

**Done criteria (measurable).**

1. Class-vs-enemy matrix: for each wave type (swarm, armored, runner, flyer, boss) a different class is the sim's best pick.
2. Removing any one class from a mixed squad lowers the score noticeably.
3. Squads of only one class lose.

**Shipped (September 25, 2026).**

Class kits (`tuning.classes`, applied after pricing in `build-game-balance.mjs`):

| Class | Basic attack / passive | Class part of the ultimate | Visual |
|---|---|---|---|
| Tank | Damage x0.6, blocks 3, guard: takes 30% less damage from enemy attacks | Holds (stuns) every ground enemy within 1.8x its range for 2 s | Gold hold zone |
| Warrior | Damage x1.4, blocks 2, cleave: up to 5 enemies within 65 px of the target take 70% | (hero skills unchanged) | Cleave arc |
| Assassin | Damage x1.1, blocks 1, dash: strikes loose (not held, not stunned) enemies up to 170 px away, furthest along first; +160% damage on loose enemies, scaled by (speed / runner speed) squared | Veil: untargetable for 3 s, the blocked enemy stays blocked but deals no damage, each attack strikes 1 extra enemy | Dash trail, translucent token |
| Mage | Magic damage for all Mages, damage x0.6, attack speed x0.55 capped at 0.75/s (heavier hits), splash 35% within 42 px; Zeus chains instead (2 bounces, 60% and 35%) | (hero skills unchanged) | Splash area, lightning chain |
| Archer | Range 210, attack speed x0.5 capped at 0.7/s, +10% crit, pierces 35% of armor or magic resistance, +100% vs flyers, targets the toughest enemy in range | (hero skills unchanged) | (hero shots) |
| Support | Range 220, heals the most injured ally in range for 3x attack each attack; with nobody hurt a 35% attack; passive aura +35% attack | (hero skills unchanged) | Heal beam |

- Warriors and Assassins went back to hpMult/armorMult 1.2 (M5 had 1.7/1.5); Tanks keep 1.7/1.5. Road heroes were too durable for Tanks and heals to matter.
- Enemies: own `magicRes` for armored kinds (brute armor 200 / magic resistance 30, boss 200/90, brood 110/40); flyer HP 90 -> 70 (they caused 81% of all leaks, which made anti-air the only thing that mattered); brute attack 60 -> 80; wave 6 grunts are now a swarm (16 at 220 ms); runners in waves 7 and 9 went 14 -> 18.
- Enemy archers shoot from range for `holdSeconds` (8), then close in and get blocked in contact. Without this a healed Tank that nobody else could reach made the wave run forever (soft-lock).
- Pricing: `valueDps` per class scales DPS before ranking (Mage 1.5, Warrior 1.5, Assassin 1.3, Archer 1.1, Tank 0.6).
- Blessing specials remapped (ids unchanged, saves keep them): Warrior Sweeping Blows (+20% cleave share), Assassin Shadow Reach (+40 px dash), Mage Wide Blast (+30% splash radius), Archer Armor Breaker (+20% pierce). Tank Unbreakable Line and Support Blessed Hands already fit.
- Difficulty `enemyHp` 2.75 -> 3.75 (sweep candidate on all three maps).
- Bots: Supports take the free ring whose aura covers the most uncovered allies; a wave running 120 s counts as a standoff loss.
- UI: class role line in hero details (`CLASS_ROLES` in `ui.js`), recruit sheet notes, a Classes article in How to play.

Results (`npm run td:classes`):

1. Matrix, scored per ring type (a road hero with a fixed healer behind it, scored by enemies stopped; a platform hero with a fixed Tank in front, scored by HP it destroyed). All intended picks win: swarm Warrior / Mage, armored Tank / Mage, runner Assassin, flyer Archer, boss Archer. Supports never win alone (by design, their value is criterion 2). The original wording "a different class per wave type" can't hold with five wave types and two ring types, so it is checked per ring type.
2. Mixed squad (balanced), endless depth over 3 maps x 2 seeds: full 28.0; without Tank 24.0, Assassin 26.7, Mage 10.0, Archer 20.8, Support 21.7, Warrior 28.5 (no loss).
3. One-class squads lose everywhere except Mage on Verdant (wins on 5/5 seeds).

Next tuning ideas: give Warriors something only they do in full runs (their cleave only pays off where enemies bunch at the line; more swarm pressure, or letting cleave hit enemies held by neighbouring blockers); tune Verdant separately (every squad does best there).

## Roadmap M7: Remove the ratings from the hero and hero selection (done September 25, 2026)
- i dont find them very helpful and i dont think we should display them.
- Done (September 25, 2026): the recruit sheet was the only place showing tiers. Hero cards lost their tier badge (`.td-tier` styles removed, card grid now two columns) and the preview line reads "Class - cost gold". `tier` stays in `gameBalance.json` because it still sets ultimate power (`tuning.tierUltPower`); players just don't see it.

## Roadmap M9: Others - sell heroes, rushers (done September 25, 2026)
- It should be possible to remove (sell) heroes from the battlefield.
- Some enemies just rush through tanks and assassins without being stopped.
- Done (September 25, 2026), decisions: refund 50% of everything spent, selling allowed anytime, rushers get slowed instead of higher block limits.
- Sell: `sell(entityId)` / `sellValue` in `sim.js`; each unit tracks `invested` (deploy, upgrades, Awakening), refund `tuning.run.sellRefund` (0.5). A sold hero is not "fallen" (no revive, no redeploy discount); a named kill-quest hero that is sold fails that quest. Popover has a Sell button that needs a second tap ("Confirm +X"). Help text updated.
- Rushers: the cause was the block limit (a bot-run tally found enemies passing a full blocker in over 99% of cases; the rings sit on the path). Enemies squeezing past a full blocker now move at `tuning.blocking.passSlowFactor` (0.8) for `passSlow` (1.5 s), separate from skill slows. A stronger slow (0.55) made Warriors beat Assassins against runners in the class matrix; 0.8 keeps the M6 picks.

## Roadmap M8: Class icons and Divine Blessing tree readability (done September 25, 2026)
- we have all class icons (roles are they called in the database) in the correspondent hero json files like e.g. `src/data/heroes/amunra.json`for archer, warrior, tank, mage, support. we can use that and get add them to text labels. e.g. in the Divine Blessing tree. -> Use Icons.
- The Divine Blessing tree currently has a lot of text issues where text is place inline. In most cases it would be better to make a line break and put text underneath. Analyse the Blessing page for better readability.
- Done (September 25, 2026): class icons come from R2 `icons/classes/{class}.webp` (the hexagon icons the boss and summon calendar pages already use; the hero JSON only has the class name). Helpers `classIcon` / `classIconImg` in `assets.js`, loaded through the same R2 base as TD assets.
- Icons now on: Blessings class branch labels, Insight chips, the detail panel header, the hero popover title and recruit cards.
- Blessings readability: branch labels show icon, class name and Insight on its own line (the trunk label shows Favor the same way); detail panel puts "Gives", "Now", "Next" and "Locked" labels above their text, so long effects wrap cleanly; lock reasons are a labelled block instead of faint small print. Narrow screens open the tree at a readable zoom on the Divine trunk instead of fitting everything at about 18%; Fit still shows the whole tree.

## Roadmap M1 (second round): Tuning and bugfixing - spawn spacing, endless ramp, training (done September 25, 2026)
- Sometime enemies spawn way too close to each other. it looks like a huge asset moving at once. we should add a small delay after one enemy spawned so that they get a bit more space in between. or maybe vary the spawn.
- in endless mode after wave 22 its only like pressing : NEXT wave but it became too easy. we should do something about it.
it could be a huge structural change for gameplay but maybe it should be so hard that you need to play another round in order to get something new or unlock a perk.
- after a hero is awakened you cant do much with the heroes.
currently you can upgrade ATK HP RANGE after lvl 3. what if you can always upgrade those three everytime but it cost a bit more gold?
- Done (September 25, 2026), decisions: compounding endless ramp, training only after Awakening, range training capped at 3.
- Spawn spacing: enemies spawned only 9 to 30 px apart (sprites are 44 px wide; the wave-6 swarm was 9 px). Now enemies on one lane keep at least `waveGen.minSpacing` (18 px) apart, converted per enemy speed, and spread sideways in a fixed pattern (up to 14 px off the path centre, `SWAY` in `sim.js`), so packs read as a crowd. Several entrances already alternate, so multi-lane maps rarely need the extra gap.
- Endless: from wave 21 enemy HP and attack compound by `waveGen.endlessRamp` (8% per wave; wave 30 about 2.2x, wave 40 about 4.7x). Balanced squad with every blessing maxed: waves 60 to 85 before, 35 to 40 now; without blessings runs end at waves 5 to 33. Going deeper now needs the blessing tree (M4).
- Training: after Awakening, "Train" offers attack (+8%), health (+12%) or range (+8% of base, at most 3 times); cost 120 gold, x1.3 per training (`tuning.training`). Uses the level-focus picker in the popover; bots spend spare gold on it too.
- Side effect: the spacing made Warriors and Assassins tie against runners in the class matrix; Assassin `looseBonus` 1.6 -> 2.2 restores the M6 picks.

### M2: Browser Experience
- is there a full screen mode available?

### M3: Divine Blessings tuning (next)

- The tree itself shipped (archive, [docs/tower-defense-blessings-research.md](docs/tower-defense-blessings-research.md) section 7). This milestone is the follow-up once endless mode exists.
- Goal: full progression is needed somewhere. Today the full tree wins at about 4 to 5x enemy HP while the 10-wave mode runs at 2x.
- Scope: balance bots that buy blessings (so `td:sweep` measures real progression), pacing check (trunk about 128 runs, a class branch 11 to 21 runs with two heroes), endless waves as the power sink, maybe a cap on vertical bonuses. Later, if class branches feel alike: per-hero capstones.
- Done when: a sweep with bought blessings shows endless runs getting longer with progression, and the 10-wave mode is not trivial before about half the trunk.
- Also decide: endless earns Favor per wave with no cap (farmable), left open by M1.

## Roadmap M2: Browser experience - full screen mode (done September 25, 2026)
- is there a full screen mode available?
- Done (September 25, 2026): there was none. The top bar now has a full screen button (next to Pause; F toggles, Escape exits) that puts the whole game shell in browser full screen, panels and overlays included. The canvas refits through the existing ResizeObserver. The button hides where the browser can't do element full screen (iPhone Safari only allows it for video); there, "Add to Home Screen" is the closest option. Checked in Chromium: enter, exit and F work, and the top bar still fits at 360 px wide (only the dev-only DBG button makes it tight).

## Roadmap M10: Glossary page - heroes and enemies (done September 25, 2026)
- Goal: one page that explains what every hero and enemy is, which attributes it has and what its skills do.
- Done (September 25, 2026): `/games/tower-defense/glossary` (`src/pages/games/tower-defense/glossary.astro` -> `src/components/td/TdGlossary.astro`, enemy cards in `TdEnemyCard.astro`), linked from the lobby ("Glossary"). Two tabs (arrow keys and `#heroes` / `#enemies` work):
  - Heroes: attribute definitions (road/platform, cost, health, attack, attacks per second, range, damage type, armor and magic res, crit, ult charge, ult power, synergy tags, Awakening), the six classes with their role and block limit, and a card per roster hero with level-1 stats, ultimate name and effect, the class part of the ultimate (Tank pin, Assassin veil), the Awakened upgrade and synergy tags.
  - Enemies: attribute definitions, a card per enemy kind (Grunt, Runner, Flyer, Archer, Brute) with wave-1 health, speed, armor and magic res with their damage reduction, attack, lives lost, gold and first wave, then the bosses (Baphomet, Lilith) and Lilith's Children.
- Numbers are read at build time from `gameBalance.json`, `gameBalance.tuning.json`, `tdWaves.json` and `tdMaps.json`. Ultimate and enemy text lives in `src/game/td/skills.js` (the Awakening text moved there from the popover, which now imports it); update it together with `castUltimate` in `sim.js`.
- Checked in Chromium at 1280 and 375 px: tabs switch, sprites and portraits load, no horizontal scroll, no console errors.

## Roadmap M1 (third round): Target priority per hero (done September 26, 2026)
- Asked: toggle icons in the hero popup for what a hero hits first (ground, flying, boss, highest HP, last, first), like Infinitode 2. The gap check added strongest, weakest and fastest, with the class rule kept as default.
- Done (September 26, 2026): `TARGET_MODES` in `sim.js`: auto (class rule, unchanged: Archers highest health, Assassins loose enemies then lowest health, others first), first, last, highest health, lowest health, fastest (base speed), ground first, flyers first, boss first. Ground, flyers and boss prefer that group and fall back to the class rule; ties go to the enemy furthest along. `setTargeting(entityId, mode)` stores it on the unit (`hero.targeting`); a revive keeps it through the fallen record. With a chosen mode an Assassin still reaches loose enemies inside its dash reach. Supports keep healing first; the mode only steers their fallback attack. Nyx's Shadow Step ultimate target is unchanged.
- Popup: a Target row of 9 icon buttons (`aria-pressed`, title and label per icon) under the stats, with the current choice named next to "Target" (auto shows the class rule). Road heroes don't show the flyers icon. Help entry "Targeting" added.
- Bots keep auto, so `test:td-balance` and sweeps are unchanged (auto uses the same order as before).
- Tests in `test-td-sim.mjs`: every mode picks its enemy, boss fallback and untargetable boss, invalid and road-flying modes rejected, dash reach with a chosen mode, the fallen record keeps the mode. Checked in Chromium at 1280x800, 844x390, 667x375 and 390x844: popup fits, pressed state and label follow the click, no console errors.

## Roadmap M11: Enemies that ask questions (done September 26, 2026)
- Goal (gap check): enemies that demand a decision beyond more damage: healer, shield, summoner, disabler.
- Done (September 26, 2026), all numbers in `tuning.enemies`, logic in `enemyTraits()` in `sim.js` (runs each step while the enemy can act):
  - **Mender** (wave 5, 9): every 2.5 s heals other enemies within 95 px for 8% of their max health; never other Menders; each enemy can take at most 50% of its max health from heals in total (without this cap two Menders behind a Brute outhealed a lone Tank forever); bosses at most 30% of the Mender's health per pulse.
  - **Shieldbearer** (wave 6, 9): shield of 160% of its health takes damage first (`absorbShield` in `hit()`); every hit strips at least 15% of the full shield, so many quick hits break it; regrows at 35%/s after 4 s without a hit.
  - **Hexer** (wave 7): ranged like the Archer enemy; every 6 s hexes the nearest hero within 140 px for 2 s (`hero.hexedUntil`, `isHexed`): no attacks and no ultimate charge. Veiled heroes are skipped. Magic resistance 160.
  - **Broodcaller** (wave 8) and **Imp**: 2 Imps every 4 s, at most 4 alive and 8 in total (`summonerId`, no shared damage). Magic resistance 150, 2 lives.
- Waves: `tdWaves.json` waves 5 to 9 each got one new kind (wave 6 archers 8 -> 6, wave 9 brutes 7 -> 6 to make room). Long and endless modes cycle waves 6 to 9, so they carry them too.
- Class matrix (`td-class-matrix.mjs`, asserted in `test:td-balance`): new rows healer (platform Mage: splash hits the healed pack), shield (Tank / Mage), summoner (Warrior / Archer), hexer (Tank / Archer). Road Healer is a Warrior / Assassin tie, left unasserted. Platform scores no longer count damage on summoned Imps (they are not in the wave total). Old rows unchanged.
- Balance (`test:td-balance`, seed 99): mixed squads still win every map in 10 waves; Moonlit balanced 15 -> 8 lives, Sunscar balanced 4 -> 7, Verdant all-platform went from a win to a loss (Verdant was the easy map). 20 waves and endless within 1 to 3 waves of before.
- Bot runner fix (`td-runner.mjs`): the standoff guard never fired (7200 steps of 1/60 s sum to just under 120), so a stalled wave ran until something else ended it. It is now "120 s without a kill or leak", which also stops counting long boss fights as standoffs.
- Art: no own sprites yet. `ENEMY_ART` in `assets.js` borrows full-body sprites with a tint and size (Mender = Archer crystal with a green heal ring at its feet, Shieldbearer = Grunt with a shield bar and bubble, Broodcaller = old `brood-v1`, Hexer = old `boss-lilith-v1` with a violet rim, Imp = small red Runner); glossary uses matching CSS filters. Hexed heroes get a pulsing violet ring, hexes draw a beam, broken shields spark. Own sprites via Coplay are still open.
- Text: `ENEMY_INFO` in `skills.js`, a "Special enemies" entry in How to play, glossary cards (with Shield stat, Imp card after the Broodcaller), HUD wave preview names.
- Tests in `test-td-sim.mjs`: heal share, no Mender-on-Mender heals, heal budget; shield scale, minimum chip, overflow, regrowth; summon per call, alive cap, lifetime total; hex target, a hexed hero does not attack, veil blocks the hex.

## Roadmap M12: Class paths that change mechanics (done September 26, 2026)
- Goal (gap check): upgrade choices that build a playstyle instead of +% stats.
- Decision: the level 3 focus (attack / health / range) stays; the level 4 upgrade now asks for one of three class paths (`tuning.upgrades.path.level`, numbers in `tuning.paths`, names and text in `PATH_INFO` in `skills.js`). Kept on the unit through Awakening and training, lost when it falls, like the focus.
  - Tank: Bulwark (holds 1 more), Thorns (reflects 40% of damage taken), Warden (held enemies take 30% more from everyone).
  - Warrior: Whirlwind (cleave +3 targets, 30% wider), Sunder (8% armor and magic res shred per hit, up to 40%, 4 s), Bloodlust (25% lifesteal).
  - Assassin: Long Reach (dash +80), Ambush (first strike on each enemy x2.5), Twin Blades (second strike on the nearest other enemy at 70%).
  - Mage: Wildfire (burn: 40% of the hit again over 3 s), Frost (60% speed for 1.5 s), Arc (every Mage chains 2 more times at 60% / 35%; Zeus gets 2 extra bounces).
  - Archer: Piercing (2 enemies behind the target at 60%), Hunter's Mark (target takes 40% more from everyone for 5 s), Crippling (50% speed for 2 s).
  - Support: Sanctuary (heals also reach allies next to the target at 50%), War Hymn (allies in range attack 20% faster), Purify (lifts hexes from allies in range, heals 25% more).
- Sim: `pathFx`, `onStrike` (sunder, bloodlust, burn, chill, mark), `hymnFor`, `purify`; `hit()` now returns the damage dealt and applies Warden and Mark; burn ticks and a separate `chill` slow in `step()` (skill slows keep their own `slowFactor`).
- UI: the level 4 upgrade button opens a path picker (same style as the focus picker) with name and effect; the popup's level line names the path; Glossary class cards list the three paths; How to play mentions them.
- Bots: `playRun` option `paths` (class -> path), default each class's first path. Tests use an `lv()` helper that picks the first path at level 4.
- Balance (endless depth, 3 squads x 3 maps x 2 seeds, one class varied at a time): no paths 22.3; with paths 24 to 28. Tank 26.5 / 26.2 / 26.7, Warrior 26.5 / 26.0 / 26.4, Assassin 26.5 / 26.2 / 26.2, Mage 26.5 / 27.9 / 27.3, Support 26.5 / 26.8 / 26.3, Archer 26.5 / 24.6 / 24.3 (Mark and Crippling were buffed once, 24.1 / 23.9 before). `test:td-balance`: 10 waves unchanged; 20 waves Moonlit 1/5 -> 2/5 and Sunscar 1/5 -> 3/5 wins.
- Open: Archer Mark and Crippling still trail Piercing by about 2 endless waves; the bots don't use targeting or placement that would favor them. Paths add about 4 endless waves overall; M3 (blessing tuning) should account for it.
- Tests in `test-td-sim.mjs`: path required at level 4, wrong or foreign ids refused, asked once; one check per path.

## Roadmap M13: Status effects and reactions (done September 26, 2026)
- Goal (gap check): synergies that change mechanics instead of +% stats, found by combining heroes.
- Statuses (`tuning.statuses`, applied in `onStrike` by every basic strike, including cleave, splash and chain hits): Wet (Poseidon, 4 s, no damage alone), Burn (Phoenix, Prometheus, and the Wildfire path; 30% of the hit over 3 s), Poison (Medusa, Jormungandr; 30% over 4 s), Chill (Frost and Crippling paths). Sim-only choices for the minigame, not claims about the real heroes.
- Reactions (`tuning.statuses.reactions`, logic in `applyHeroStatus`, `applyBurn`, `steam`, `tryFreeze`, the chain in `basicAttack`, `killEnemy`):
  - Conduct (Wet + chain lightning: Zeus or the Arc path): 3 more bounces, +60% on Wet enemies.
  - Steam (Wet + Burn): both consumed, burst of 4x the burn's damage, half to enemies within 55 px.
  - Blight (Burn on a poisoned enemy): spreads a 2x copy of the poison within 80 px (replaces weaker poisons).
  - Freeze (Wet + Chill): 2 s stun, 3 s cooldown per enemy.
  - Soul Harvest (poisoned enemy dies): each Anubis gains 1.5 s of ultimate charge.
- Measured (isolated: the pair plus Nuwa on Moonlit, all level 4, 3 seeds, reactions on vs off with statuses kept): Conduct Poseidon + Zeus +22% damage per second, Steam Poseidon + Phoenix +9%, Blight Medusa + Phoenix +36%, Soul Harvest Jormungandr + Anubis +12%, Freeze Poseidon + Fengyi (Frost) on a 40-runner wave 61 -> 48 leaks. First values were weaker (Conduct 2 bounces +30%, Steam 1.5x, Blight 1x, Freeze 1 s / 4 s) and were raised until every pair beat its reactions-off version. Endless depth was not a usable measure: most test squads die at the wave 10 boss either way.
- UI: status dots above enemy health bars (Wet blue, Burn orange, Poison green, Chill cyan); reaction bursts (particles and a ring); the first time each reaction fires in a run a notice names it and its ingredients ("Reaction discovered: Steam (Wet + Burn) ..."); result screen "Reactions" stat with counts; Glossary "Status effects" section (statuses with their sources from tuning, reactions) and a line on each source hero's card; How to play "Status effects" entry. Texts in `STATUS_INFO` / `REACTION_INFO` (`skills.js`).
- `test:td-balance`: 10 waves unchanged in result (Moonlit budget 17 -> 24 lives); 20 waves Sunscar 3/5 -> 2/5, others equal.
- Tests in `test-td-sim.mjs`: each status source, burn rate, Steam burst and consumption, Conduct bounces, Blight radius and strength, Freeze stun and cooldown, Soul Harvest charge, reactions off keeps statuses.
- Not done: showing a pair's reaction on the canvas synergy links before it fires (the notice on first trigger covers discovery for now).

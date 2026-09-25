# Tower Defense Roadmap

Last updated: September 25, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

Map implementation must use the asset assignments in [map.md](map.md), including the prepared Sunscar Ruins art for Map 3.

## What's next (priority order)

Map work is handled separately and archived. Shipped today (see archive): Slayer quest, landscape re-check, Lilith, level-3 focus, Divine Blessings 2.0. Milestones below are in priority order; each one lists what "done" means.

**Paused September 25, 2026.** All work of this session is uncommitted (Slayer share 0.6, Lilith, level focus, Blessings 2.0 incl. deleted `favorTree.json` and new `blessingTree.json`, `page/blessings.ts`, research doc). `npm run test:tower-defense`, `npm run test:td-balance` and the TD type check pass. Resume with M1 (in parallel) and M4 once endless mode lands.

### M1: 20-wave and endless mode (medium, done, uncommitted)

- Goal: longer runs beyond the current wave count; 20-wave mode with a boss every 5th wave, then endless as an extension.
- Scope: wave generator scaling past the current table, boss cadence, mode picker on the start screen, local best score per mode in the existing `td:v1` save.
- Done when: both modes finish a headless sweep without runaway or trivial difficulty, and the save stays backward compatible.
- Done (September 25, 2026): `src/game/td/waves.js` builds the tables (modes `classic`, `long`, `endless`; classic is `tdWaves.json` unchanged). Longer modes add a boss every 5th wave; bosses before the last are scaled by `tuning.waveGen.midBossScale` (0.4, HP and attack, Lilith's children too), the wave-20 boss and endless bosses from wave 20 are full strength. Waves past 10 cycle base waves 6-9 with +2% enemies and -2% gaps per wave (gap floor 55%); the sim appends endless waves as it goes. Play opens a run length step for the selected map (panel `mode`, each length with that map's best; last pick remembered in `td:mode` and focused), HUD wave total (∞ in endless), boss label and notice on every boss wave. Per-mode records live in `mapTop`/`mapBests` under `map@mode` keys (classic keeps the plain map id, `bestScore` stays the classic record), so old saves load unchanged. Sweep: `npm run td:sweep -- --mode=long|endless`; `test:td-balance` now asserts 20 waves has winners and losers per map and endless ends before the 150-wave guard with a run past wave 20. Results (seed 99-102, no blessings): 20 waves 15/40 wins; endless best squads reach 22-26, with every blessing maxed 30-40.
- Open: endless earns Favor per wave with no cap (farmable); decide with M4 pacing.

### M2: Leaderboard (large, needs design first)

- Goal: shared scores across players.
- Blocker: needs an anti-tamper design before any code (see spec section 9); a plain client-submitted score endpoint would be a cheat form. Likely path is a Cloudflare Worker plus D1.
- Done when: the anti-tamper approach is agreed, then built.
- Only in Endless Mode maybe?

### M3: Sound variant listening pass (postponed)

- Postponed until all hero sounds are in. The in-game sound files still carry internal game names, so they have to be sorted and renamed by hand first, then 1 attack and 1 ultimate sound picked per hero from about 8 files.
- Goal: every sound variant in `src/game/td/audio.ts` has been heard in a real run and judged OK.
- Scope: play through both maps, trigger each variant, note clipping, volume jumps or repetitive-sounding picks; fix or drop bad variants.
- Done when: each variant is marked verified (or removed), and the known gap is closed.

### M4: Divine Blessings tuning (after M1)

- The tree itself shipped (archive, [docs/tower-defense-blessings-research.md](docs/tower-defense-blessings-research.md) section 7). This milestone is the follow-up once endless mode exists.
- Goal: full progression is needed somewhere. Today the full tree wins at about 4 to 5x enemy HP while the 10-wave mode runs at 2x.
- Scope: balance bots that buy blessings (so `td:sweep` measures real progression), pacing check (trunk about 128 runs, a class branch 11 to 21 runs with two heroes), endless waves as the power sink, maybe a cap on vertical bonuses. Later, if class branches feel alike: per-hero capstones.
- Done when: a sweep with bought blessings shows endless runs getting longer with progression, and the 10-wave mode is not trivial before about half the trunk.

### M5: Change difficulty and behaviour (done, uncommitted)
I realize that the "system" only to place 5 heroes is not very rewarding. At the moment ground heroes die too fast and they cant stop rushers good enough. Therefore I think the best would be to remove the "place only 5" heroes.

- Done (September 25, 2026): team cap removed (`tuning.run.maxTeam` gone). Every ring can hold a hero; free rings, gold and "each hero once" are the only limits, and Valkyrie revives are no longer blocked. The deck shows no empty slots any more and scrolls sideways when full. Lobby and help text updated. The save's `lastTeam` is no longer capped.
- Set's Command (trunk capstone, was +1 team slot) now gives +150 starting gold. The node id stays `set_command`, so saves that bought it keep it.
- Road classes (Tank, Warrior, Assassin) get `hpMult` 1.7 and `armorMult` 1.5 in `tuning.classes`, applied in `build-game-balance.mjs` after pricing, so costs don't change. Road deaths per run drop by about half (probe at x2.75, 5 squads x 3 seeds: Moonlit 198 -> 101, Verdant 192 -> 122).
- Difficulty `enemyHp` 2 -> 2.75 (more heroes made runs much easier). Bot squads in `scripts/lib/td-runner.mjs` are now priority lists that fill every ring (the first five are the old squad). 10 waves: 8/10 wins, 1 perfect; mixed squads now beat all-platform, which was the top squad before. 20 waves: Moonlit 1/5, Verdant 4/5. Endless: Moonlit 10-21, Verdant 10-37.
- Open: leaks barely drop with more HP. Rushers get past mainly because of the block limit (Tank 3, Warrior 2, Assassin 1), not because blockers die. If rushers still leak in real play, raise the block limits or slow runners on contact. The road-wall squad still loses (it has no damage platforms).

### M6: Class identity (done, uncommitted; two criteria partly open)

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

## M7: Remove the ratings from the hero and hero selection
- i dont find them very helpful and i dont think we should display them.

## M8: Details in the Game & Divine Blessing tree UX/UI
- we have all class icons (roles are they called in the database) in the correspondent hero json files like e.g. `src/data/heroes/amunra.json`for archer, warrior, tank, mage, support. we can use that and get add them to text labels. e.g. in the Divine Blessing tree. -> Use Icons.
- The Divine Blessing tree currently has a lot of text issues where text is place inline. In most cases it would be better to make a line break and put text underneath. Analyse the Blessing page for better readability.

## M9: Others
- It should be possible to remove (sell) heroes from the battlefield.
- Some enemies just rush through tanks and assassins without being stopped.

## Research notes (September 25, 2026)

**Sprites from game art** (all three options done, September 25, 2026):

1. Hero tokens shipped: `scripts/build-td-tokens.mjs` crops head-and-shoulders cutouts from the full-body hero art on R2 (already transparent, no background removal needed), per-hero crop fixes in `src/data/tdTokenCrops.json`, output `public/td/tokens/{id}-v1.webp`, uploaded to R2 `td/tokens/`. The board draws them with the head overlapping the level ring and a ground shadow; heroes without a token keep the circle portrait.
2. AI enemy sprites: done. Generated with Coplay (`gpt_image_1`, medium quality, transparent background, about $0.04 each; needs a running Unity Editor with the Coplay package, for example `~/android/assetripper/newtry/ExportedProject`; the Gemini provider returned 404). Sources in that project under `Assets/td_sprites/`, sprites uploaded to R2 `td/enemies/sprites/`. Prompts need "entire body visible, wide empty margin" or the subject gets cropped. Prompt template and steps in `src/game/td/sprite-spec-for-ai.md`; `scripts/build-td-enemy-sprites.mjs <folder>` normalizes the images to `public/td/enemies/sprites/{kind}-v1.webp`; the renderer prefers them over portraits (unmasked, ground shadow, faces its direction of travel). In the game: the 5 enemy kinds, Baphomet (`boss-v1`), Lilith (`boss-lilith-v1`) and her children (`brood-v1`); the renderer loads the map's boss sprite.
3. Game Spine data: cracked. The skeleton bundles are not encrypted, only prefixed with a 46-byte decoy UnityFS header; `~/android/extract_spine_bundle.py` extracts skeleton (Spine 4.0.51 binary), atlas and textures. Verified with Ares and Poseidon, rendered with the Spine 4.0 web player. Limits: hero spines only have showcase animations (`entry`, `idle`, `interaction`), no combat moves, and enemies and bosses are 3D models in the game (no Spine). The official Pixi 8 Spine runtime needs Spine 4.2, so the practical route is pre-rendering the idle loop to sprite sheets offline. Shipped September 25, 2026: the recruit sheet shows the hovered or focused hero's idle loop (24-frame sprite sheets in R2 `td/anims/`, loop lengths in `src/data/tdHeroAnims.json`). Pipeline: `scripts/td-spine/` (extractor copy, `heroes.json` TD id -> bundle name, `render-sheets.cjs` renders frames with the Spine 4.0 player in headless Chromium). One skeleton (Jormungandr) is JSON instead of binary.

## Dev commands

```
npm run test:tower-defense      # headless combat/upgrade/virtue checks
npm run test:td-balance         # 5-squad balance harness
npm run td:sweep                # difficulty sweep (enemy HP steps x squads x maps)
npm run td:classes              # class identity report (M6 criteria: matrix, class removal, one-class squads)
npm run build:game-balance      # regenerate hero balance (re-ranks all heroes)
npm run check                   # astro check (TD code is type-clean; rest of site not yet)

node scripts/build-td-tokens.mjs [--only id] [--sheet out.png]   # board tokens -> public/td/tokens
node scripts/build-td-enemy-sprites.mjs <folder>                   # AI enemy art -> public/td/enemies/sprites
PW=<playwright dir> node scripts/td-spine/render-sheets.cjs        # hero idle loops -> public/td/anims
node scripts/upload-to-r2.mjs --prefix td/<folder>                 # upload new files (never overwrites)
```

`window.tdGame` and `window.tdRenderer` available in browser for debugging.

## Known gaps / deferred

Former gaps are now milestones above (M1 to M3); the kill-count quest shipped as the Slayer quest and the landscape layout was re-verified (see archive). Replays were dropped (September 25, 2026).

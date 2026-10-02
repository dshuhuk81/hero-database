# Tower Defense - Completed Work Archive

## R4 battle economy redesign, October 2, 2026

- Battle gold buys deploys and relocations only. Deploy discounts (Master Smith 3% per level,
  class Swift Muster 10%) add up to at most 50%. Relocation between waves costs 25% of the
  deployment cost (class Divine Rite -30%) and keeps the hero's health, charge and cooldowns.
- Removed battle ranks, attack/health focus, class paths, Awakening and training from the
  simulator, tuning, runners, glossary and help. Collection Evolution V still awakens ultimates.
- Blessing nodes migrated in place (same ids and levels): `*_ascension` Swift Muster, `*_rite`
  relocation discount, `*_apotheosis` +15% attack and health always on. Expedition veterans get
  +10% attack and health (`heroBonuses`); challenge `unrefined` is now Hold Position.
- Hero panel: collection level, stars, Evolution and skill levels, then Relocate and Sell.
  Spec: `docs/plans/2026-10-02-tower-defense-r4-economy-design.md`; plan:
  `docs/superpowers/plans/2026-10-02-tower-defense-r4-economy.md`. Gold income is not retuned
  (R12).

## R1 and R3 board follow-ups, October 2, 2026

- Unit sizes set by owner playtest: heroes 1.3x and regular enemies 1.8x. Bosses use a separate
  1x scale because their 96-108 px art is already larger and a 1.8x boss is clipped on upper lanes.
- Road class variety: board grunt and runner groups use 0.4x bodies, 2.5x health and gold, and
  1.25x attack. One-seed matrix: Warrior leads swarms at 58% (Tank 30%), Assassin leads runners
  at 61% (Tank 50%). Both keep five internal leak damage, one shown life.

## Baseline (shipped September 23, 2026)
One-map prototype. Hero placement, automatic combat, gold/lives/score, 10-wave run, boss wave. User completed first full run and beat Baphomet.

### Bugs / Enhancements, October 1, 2026 (done, awaiting owner playtest)

- Melee heroes no longer move on attack: removed the render lean (`scanLunges`/`lungeOffset`
  in `render.js`) that shifted the whole figure toward the target. Enemy strike motion unchanged.
- Gaia Tank -> Support (`tuning.classOverrides`, TD only; database class stays Tank).
  New ultimate `rooted_sanctuary` "Where the Roots Hold": heal allies in range for 30% of her max
  HP, 30% damage reduction for 8s; awakened 50% / 40%. Ranged earth-clod basic and leaf heal
  beams in `hero-fx.js`. Starters now field no Tank (fenrir, vidar on road).
- Atalanta new ultimate `burning_volley` "Fire in the Brambles": 150% attack to
  every enemy within 80px of the target plus burn (50% of the hit over 5s); awakened adds 10s
  rapid fire (+50% attack speed, +30% attack). Class matrix: Archer swarm 30% -> 36%.
- Balance rebuild: Gaia 115g -> 100g; odin, atalanta, boreas, plutus, skadi, heimdall +5g,
  harmonia -5g (slot-group re-ranking).
  - [x] Fixed: Burning and other ticking damage now combines into one moving damage number per enemy instead of leaving a line of numbers behind it.

- [x] Fixed: The stage hero-selection roster now sorts owned heroes by Might from highest to lowest, with locked heroes following in Might order.

- [x] Fixed: Evolution actions now use separate full-width rows, preventing the copy-to-Dust and Evolve buttons from overlapping in the hero-detail panel.

### M5: Sound variant listening pass (ready for listening)

- Goal: every hero sound (voice on placement, attack, ultimate) has been heard in a real run and judged OK.
- Done when: every hero below is ticked, or a bad file is swapped for another pick from the source folders ([docs/td-hero-audio-map.md](docs/td-hero-audio-map.md)).
- Done by tooling (September 25, 2026):
  - All 21 roster heroes have voice, attack and ultimate in `HERO_SOUNDS` (`audio.ts`); all 63 files exist in `public/td/sfx` and on R2 `td/sfx`.
  - Loudness evened out: `node scripts/td-audio-levels.mjs` measures every file with ffmpeg (EBU R128) and writes per-file gains to `src/data/tdAudioLevels.json` (targets: voice -17, attack -20, ultimate -17 LUFS; boosts capped at -1 dB peak). Before: attacks spread from -15.5 (Bastet, Anubis, Momus) to -22.8 LUFS (Zeus, Caishen). Rerun it after adding or swapping a file.
  - Clipping: 2 to 4 full-scale samples per file at most, not audible.
  - Attack sounds were unthrottled (one per hit, every hero). Now each hero plays at most one attack sound per 0.7 s, and all heroes together at most 4 per second.
- Listen for (things ffmpeg can't judge): wrong character or wrong skill, cut-off starts or ends, and long files that may drag: attacks Fengyi 3.6 s, Phoenix 2.7 s, Medusa 2.3 s, Amunra 2.1 s; ultimates Freya 8.8 s, Set 8.1 s, Momus 7.6 s.
- Quick way: Play, open DBG, `tdGame.gold = 99999`, place heroes, then `tdGame.castUltimate(tdGame.heroes[0], tdGame.enemies[0])` during a wave.
- Checklist (voice / attack / ultimate): helios, thanatos, atalanta, hecate, plutus, gaia, skadi, boreas, asclepius, vidar, fenrir, stheno, heimdall, atlas, nott, hephaestus, aegir, ymir, set, harmonia, odin.
### 1. Balance decisions (owner call; measurements ready)

From audit step 3 (numbers in the archive). Each needs a yes/no, then a small data change:
- (d) 1-10 health: APPROVED + DONE September 29, 2026 (combo with e). Shipped: 1-9 hpScale 0.57 -> 0.50, 1-10 0.67 -> 0.60. Post-change campaign sweep: 1-9 27/35, 1-10 27/35 (was 21/35 and 23/35); `td-chapter-length.mjs --variant=0` confirms the measured values (1-9 86% / 71%, 1-10 76% / 67%).
- (e) Chapter 1 length: APPROVED + DONE September 29, 2026 (combo: waves x0.7 + hp relief). Every stage trimmed to ~70% waves (first and last wave kept), 79 -> 59 waves total. Measured after the change: winning runs 51 min, expected with retries 70-74 min (was 103-131), inside/near the 30-60 min target for wins.
- Tanks: APPROVED + DONE September 29, 2026 — campaign squad size raised 5 → 6 (`tdCampaign.json`). Measurement (`td-tank-slot.mjs`, 16 squads per stage and size, both bot policies, all 16 stages): at size 5 Tank squads won 64% vs 93% without (29-point gap — the Tank replaced a damage dealer); at size 6 they win 80% vs 94%, every stage winnable for Tank squads (worst cell 38% on 2-5). Post-change full-chapter re-measure: all stages 43-100% on both policies; Chapter 1 early stages now at 100% (1-1..1-4) — if that reads too easy, a small hpScale bump on 1-1..1-4 is the follow-up knob. Test updated: the "too many heroes" check now adds a reward hero instead of relying on starters exceeding the cap.
- Free Play difficulty since tiles + deploy cap 7 (M22b): 20 waves 4/5 wins vs 2/5 before. Retune enemy health with `td:sweep` or lower the cap. Re-check once generated maps land.
- Tooling fix: DONE September 29, 2026. `td:pacing` class removal now refills removed heroes with the strongest other-class roster heroes (tier, then cost), so variants stay full-size and measure the class contribution instead of playing short-handed. First fair measurement (endless, both policies, vs full squad 32.2 / 29.2 waves): without Mage -15.1 / -11.7 (a real, large contribution — Mages carry endless depth), Archer -8.5 / -8.1, Warrior -7.7 / -2.8, Support -5.5 / -6.1, Tank +1.9 / +0.8 (in a 7-deploy Free Play squad Tanks are at best neutral — consistent with the campaign finding), Assassin +0.0 (Nyx is never deployed in the balanced squad: cost-ordered bench, deploy cap 7).
- Chapter 1 re-tighten after owner playtest (September 29, 2026: "almost too easy with 6 heroes; leaks only on 1-5/1-6 from slow upgrades or misplacement"): APPROVED + SHIPPED September 30, 2026. hpScale 1-1 0.8→1.0, 1-2 0.95→1.1, 1-3 0.9→1.05, 1-4 0.68→1.05 (baseline included an intermediate manual retune), 1-9 0.5→0.6, 1-10 0.6→0.7; mid-chapter 1-5..1-8 untouched (the owner's felt pinch). Post-change measurement matches the approved variant: 1-2 86/100%, 1-3 76/81%, 1-4 52/52%, 1-9 81/90%, 1-10 67/71%. The harder variant (up to 1.2) was rejected — it walled 1-4 at 29-33%.
- Watch item (owner playtest, September 29, 2026): "with a Support on the field heroes are nearly indestructible." Consistent with the class measurement (without Support -5.5/-6.1 endless waves — a real but not dominant contribution). No action yet; re-check after the chapter re-tighten lands, since harder waves also stress healing more.

### 2. M26 Sprint 10 - Stage rating and chapter milestones (done September 29, 2026)

Owner decisions: no player-facing name (wreath icons only, internally "laurels"), rule 1 / 50% / 90% lives, rewards as proposed (may be a bit high, revisit later), automatic payout. Shipped: `laurelLives` / `stageLaurels` / `chapterLaurels` / `payMilestones` in `campaign.js`, `laurels.thresholds` and chapter `milestones` in `tdCampaign.json`, save v8 (`milestones`; reached ones are paid once on load), wreaths on stage cards, drawer "Goals", chapter track under the stage grid, result lines. Tests: new block in `test-td-campaign.mjs` (thresholds, automatic payout once, idempotence, v7 -> v8), stale version asserts in `test-td-summon.mjs` now use `CAMPAIGN_SAVE_VERSION`. Checks: full suite, no new TD type errors, Chromium 1440x900 and 390x844 with a seeded v7 save (12 / 30, first milestone paid), no overflow or page errors. Proposal and measurements: [docs/tower-defense-stage-laurels-plan.md](docs/tower-defense-stage-laurels-plan.md). Open: look in play; stage 1-3 may need +2 lives if 3 wreaths stay out of reach. Move to the archive after that.

### 3. M24d - New boss to replace Lilith

Lilith is a Motto Immortal character (white-label rule); she is the Verdant boss (`tdMaps.json` `boss`, `tuning.bosses.lilith`, sprites `boss-lilith-v1` / `brood-v1`). Idea from the owner: a Greek mythology monster. Needs: name and mechanic (keep or replace the brood summon), stats, sprite, glossary/skin text, effects, tests. Boss selection may move to the map generator; agree where bosses are assigned first. (Common recruit heroes from M24d are done.)


### 5. Playtest follow-ups (owner)

- Archer platform shots (`tuning.enemies.archer.platformAttack` 0.5): manual phone play; raise it or add archers to more waves only after that.
- M24c effects second pass (support auras, recruit effects): look in play.
- Sprint 9 summon/Stars/Evolution numbers: under review in play. Optional: reveal flags "Evolution ready" when a copy makes an upgrade affordable.

### 2c. Chapter 2 on a generated map (done September 29, 2026)

Map generator `orthogonal-v1` built per the map runbook (`map-generator.js`, `npm run td:generate-map`, tests in the suite), first map `sunscar-basin` published (seed 3, Sunscar art, 8 turns, "defense-basin"), Chapter 2 "The Sunscar March": 6 stages on it, Stheno on 2-3, Helios on the 2-6 finale, rating milestones 6 / 12 / 18. Bot win rates 86 -> 40% (cheapest) / 89 -> 34% (carry). Free Play map select now 4 in a row. Expedition test updated (it assumed exactly three maps). Details in the spec (section 7 and Game modes). Open: look in play; Moonlit / Verdant safe regions in the generator script are unverified guesses; Lilith replacement (M24d) still applies to Verdant.

Independent re-check September 29, 2026 (`td-chapter-length.mjs --variant=0`, 21 squads x 2 policies, heroes levelled from the natural campaign income): every Chapter 2 stage sits at 48-86% (cheapest) / 38-86% (carry), all clearly above the 20% floor; softest is the 2-6 finale under "carry" (38%), matching the authored spike. Seal economy with Chapter 2 in place: 350 seals from first clears + ~290 from the chapter's laurel milestones ≈ one full x10 per chapter, and replays now add a quarter of first-clear seals per run (≈160 per Chapter 2 replay). Two-chapter total for a fresh player: ≈1,720 seals (600 + 480 Chapter 1, 350 + 290 Chapter 2) ≈ 28 pulls before dailies and expeditions. Income fits; no tuning.

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
- Set's Command (trunk capstone, was +1 team slot) now gives +150 starting gold. The node id stays `surtr_command`, so saves that bought it keep it.
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

## Roadmap M14: Run statistics and "what went wrong" (done September 26, 2026)
- Goal (gap check): failure becomes information; players see who did the work.
- Sim: `heroStats` per hero id (summed over every unit of that hero, so a redeployed hero stays one row): damage, boss damage (boss and Lilith's children), damage over time (burn and poison ticks, `hit(..., { dot: true })`), healing, aura contribution (the Support aura's share of each boosted hit), kills. Every hero heal now goes through `healHero(target, amount, by)`, which caps at max health and credits the healer (11 heal sites in basic attacks, paths and ultimates). `hit()` records only damage actually dealt (no overkill). Leaks per enemy kind per wave (`waveStats.leakKinds`, lives lost) and per run (`leakKinds`). No RNG use, so `test:td-balance` output is identical.
- Result screen: "Damage by hero" table (damage with share bar and percent, boss damage, kills, Support = healing plus aura contribution), scrolls when long; on a loss a "What went wrong" box: the enemy kind that cost the most lives on the final wave, its share, and a one-line hint (Imps count with their Broodcaller). Helpers `damageRows`, `shortNumber`, `lossReport` in `ui.js`.
- Tests: `test-td-ui.mjs` (row order and share, number format, loss report and merge), `test-td-sim.mjs` (damage, overkill, aura credit, kills, boss and DoT damage, capped heal credit, leak kinds). Checked in Chromium at 1280x800 and 390x844 on a forced loss: table and analysis fit, no console errors.
- Not done: per-wave damage breakdown, chain and splash share, "what killed your heroes" (hero deaths by enemy kind).

## Roadmap M3: Divine Blessings tuning (done September 26, 2026)
- Goal: progression that stays meaningful; the 10-wave mode should not be trivial before about half the trunk; decide whether endless Favor needs a cap.
- Measurement tool: `npm run td:progression` (`scripts/td-progression.mjs`). One bot account plays classic runs from a fresh save, earns Favor and Insight with the real formulas, buys the cheapest affordable blessing after each run, steps up a difficulty tier after a win with 15+ lives and down after a loss, and at each checkpoint plays every map at every tier plus endless. `playRun` now also returns `perfectWaves` and `insightLog`.
- Baseline (tree v2, before changes): trunk complete after about 80 runs, class branches 80% after 20 runs, and from run 20 on the 10-wave mode was 6/6 wins with full lives. Endless 22 -> 36 waves by run 20, then flat. Lever test (full tree at double enemy HP, one effect type removed at a time): no single dominant node, economy nodes (starting gold, clear bonus) largest. So pacing alone could not keep 10 waves interesting.
- Decisions:
  - Endless Favor per wave stays uncapped: endless pays about 15 to 18 Favor per minute against 23.5 (with tiers; 36.8 before) in 10-wave runs, so it is not a farm.
  - No cap on vertical bonuses: they are already bounded by max levels (at most +10% attack per class from Mythic stats).
  - Difficulty tiers for 10 and 20 waves (`tuning.tiers`): Normal, Heroic (enemy health x2, attack x1.3, Favor x1.3), Mythic (x3.2, x1.6, Favor x1.6). All selectable from the start, no unlock. Endless always Normal. Kept in the sim as `tierHp` / `tierAttack`, apart from `difficulty` (the dev debug panel overwrites that). Records per tier: save keys get `#heroic` / `#mythic` (Normal keys unchanged; `bestScore` stays the classic Normal record); `modeBest(save, mode, tier)`. Picker: a radio group above the run lengths (arrow keys work, last pick in `td:tier`), bests shown for the picked tier; result kicker names the tier; How to play "Difficulty" entry.
  - Prices (tree version 3): trunk x2.08 (31,016 Favor), class branches x3 (1,860 Insight each).
  - Gap check (fewer percentage nodes): each class's Surge (+15% ultimate charge) became an Infusion that plugs into M13: Warrior Tidebreaker (Wet), Mage Kindling (Burn), Assassin Venom Blades (Poison), Tank Earthshaker and Archer Frost Arrows (Chill 70% for 1 s, freezes Wet enemies), Support Radiance (heals and attacks lift hexes). Still exclusive with Wrath. Mechanic nodes went from about 19% to 27% of the tree; the findings' 70% target is not reached.
- Save migration (tree v3, `repriceCredit` in `favor.js`, `sanitizeSave`): owned levels stay, the price increase is credited back per currency so available Favor and Insight do not change; Surge levels drop out and their Insight returns; one-time notice in the Blessings panel.
- Result (`td:progression`, 200 runs, balanced squad, 2 seeds x 3 maps per checkpoint):

  | Runs | Trunk | Branches | Normal | Heroic | Mythic | Endless |
  |---|---|---|---|---|---|---|
  | 0 | 0% | 0% | 5/6 | 0/6 | 0/6 | 22.3 |
  | 20 | 10% | 27% | 6/6 | 3/6 | 1/6 | 34.3 |
  | 40 | 23% | 54% | 6/6 | 6/6 | 2/6 | 36.2 |
  | 80 | 50% | 78% | 6/6 | 6/6 | 2/6 | 35.5 |
  | 160 | 100% | 89% | 6/6 | 6/6 | 5/6 | 36.8 |

  Normal is the entry tier, Heroic the mid goal, Mythic stays a real test until the trunk is complete. Trunk completes at about 160 runs.
- Open: endless depth barely grows after run 20 (8% compounding ramp); M15 mutators are the planned endless goals. Normal becomes easy after about 20 runs by design (Heroic takes over).
- Tests: `test-td-favor.mjs` (Infusion rules, stored status, applied status, no status without it, Radiance), `test-td-save.mjs` (v2 migration keeps available Favor and Insight, Surge refund, notice, applied once; tier keys and records), `test-td-sim.mjs` (tier health and attack, endless stays Normal). Checked in Chromium at 1280 and 390 px: tier picker selects, persists and the run uses it.

## Roadmap M15: Endless mutators (done September 26, 2026)
- Goal (gap check): endless should offer goals of the player's own making instead of only a steeper ramp.
- Sim (`tuning.mutators`): after every 10th cleared endless wave, 3 of the not-yet-chosen mutators are offered (separate `mutatorRng`, so combat randomness is unchanged); pick one or skip, the offer expires when the next wave starts. Mutators stack for the rest of the run (`mutators`, `mutatorMods()`, applied in `spawnEnemy` via `applyMutators` and to wave counts in `startWave`):
  - Fortified: enemies +30% health, +40% Favor per wave.
  - Haste: +25% speed, +50%.
  - Warded: every enemy gets a shield worth 40% of its health (15% minimum chip per hit), +50%.
  - Horde: +40% enemies per wave (bosses excluded), +60%.
  - Ironclad: +120 armor and magic resistance, +40%.
  - Elites: every 3rd ordinary enemy is an Elite (2.5x health, shield 60% of that, 3x gold; never bosses, summons or Lilith's children), +60%.
- Favor: each wave cleared with mutators adds their summed share of the per-wave Favor (`mutatorWaves`), so a late pick does not pay out on the whole run.
- Measured (`playRun` option `mutators`, a preference list; balanced squad, 3 maps x 2 seeds; endless Favor per minute of sim time):
  - Frenzy (+80% enemy attack) cost no depth at all (blockers rarely die) and was replaced by Warded.
  - First version paid its share on the whole run's Favor: all six with the full tree gave 29.4 Favor per minute, above the 10-wave rate (23.5), so a farm. After the per-wave change and the retune: each mutator costs 0.5 to 2 waves (full tree 36.8 -> 34.8 to 36.2; all six 34.7) and pays 7 to 23% more Favor per run; all six give 22.2 Favor per minute, still below 10-wave runs. For a fresh account mutators are a net loss by design (a choice for strong squads).
- UI: "Raise the stakes?" modal after the blessing offer (cards with effect and "+N% Favor per wave", Skip button), Auto countdown waits for it, active mutators as red chips on the buff bar, result Favor includes the bonus, the best endless record stores its mutators (`mutators` on `mapBests` / `mapTop`) and the run-length panel shows them next to the endless best. How to play "Mutators" entry. Texts in `MUTATOR_INFO` (`skills.js`).
- Tests in `test-td-sim.mjs`: offer size, endless only, only every 10th wave, only offered ids, Fortified health, Favor shares add up, every 3rd enemy an Elite with shield and gold, Haste speed, Ironclad armor, bosses never Elites, skip. Checked in Chromium at 1280 and 390 px.
- Not done: mutators in the M4 leaderboard (records carry them, ready for it).

## Roadmap M16: Special rings (done September 26, 2026, engine side)
- Goal (gap check): maps that shape builds, not only paths.
- Data: optional `rings` per map in `tdMaps.json`, keyed `"road:N"` / `"platform:N"` (0-based slot index) -> kind; slot arrays unchanged. Kinds in `tuning.rings`: High ground (+20% range, applied on placement and revive), Shrine (ultimate charges 30% faster, in `ultChargeRate`), Cursed (+30% damage in `attackValue`, -20% attack speed). Sim helpers `ringKind`, `ringAt`, `ringFx`.
- Placement per map, chosen from measured path coverage (share of path points within range): High ground on the platform that gains the most from +20% range, Cursed on the best-covering platform (tempting but slower), Shrine on a mid-path road ring. Moonlit Pass: platform 5 high ground (25 -> 28%), platform 3 cursed (50%), road 3 shrine. Verdant Crossing: platform 2 high ground (31 -> 42%), platform 3 cursed, road 3 shrine. Sunscar Ruins: platform 6 high ground (28 -> 41%), platform 5 cursed (54%), road 5 shrine. (Numbers as shown in the recruit sheet, 1-based.)
- UI: procedural marker on the map (colored halo plus badge: gold triangle, cyan diamond, red cross), the recruit sheet names the ring and its effect in the kicker and note, the hero popup's Details say "Standing on ...", How to play "Special rings" entry. Texts in `RING_INFO` (`skills.js`).
- Balance (`test:td-balance`, bots place by ring order, not by ring kind): Moonlit balanced 9 -> 5 lives, budget 24 -> 25; Verdant all-platform loss -> win (6 lives); Sunscar balanced 6 -> 10, budget 15 -> 18; 20 waves Verdant 3/5 -> 4/5, Sunscar 2/5 -> 3/5. Class matrix unchanged.
- Tests in `test-td-sim.mjs`: High ground range, Cursed damage, Shrine charge, plain rings, every map has a special ring and every entry points at an existing slot with a known kind. Checked in Chromium on Moonlit Pass.
- For the map owner: markers are drawn in code on top of the map art; painted versions (for example a raised stone pad for high ground) can replace them per map later. Ring kinds and positions are data only, so they can be moved in `tdMaps.json` without code changes.

## Roadmap M17: Rare and Epic run blessings (done September 26, 2026)
- Goal (gap check): between-wave blessings that change mechanics, tied to statuses and the deployed team.
- Sim (`tuning.runBoons`): each card of the between-wave offer rolls Epic (10%) or Rare (25%) with its own RNG (`boonRng`); it then shows a mechanic blessing the deployed team can use (`boonEligible`: status sources incl. Infusions and paths, chain heroes, road heroes), else a common stat blessing. Offer entries are `"boon:<id>"`; chosen ones go to `game.boons` (stat blessings stay in `virtues`).
  - Rare: Storm Surge (chain bounces stun 0.4 s; needs Zeus or the Arc path), Tidal Pull (Wet enemies 20% slower), Venom Rot (poisoned enemies take 25% more), Wildfire Spread (burning enemies pass their fire on death, 70 px), Rally (a fallen road hero gives every hero +30% damage for 5 s).
  - Epic: Shattering Cold (frozen enemies take double damage; needs Wet and Chill sources), Drowned Burst (Wet enemies burst on death for 30% of their health, 55 px), Soul Reaper (every 10th kill: 15 gold and +1 s charge on every ultimate).
- UI: Rare (blue) and Epic (purple glow) cards with badge, name and effect in the offer; the Blessings panel's This run tab lists them; notice on pick; How to play entry. Texts in `RUN_BOON_INFO` (`skills.js`); card in `mechanicBoonCard` (`boons.ts`).
- Measured: rare or epic cards appeared in 45/45 classic bot runs (5 squads x 3 maps x 3 seeds), about 8 of 27 cards per run. Dominance (bots always take one blessing if offered, endless, 3 squads x 3 maps x 2 seeds): 29.2 to 30.2 waves against 29.6 with stat blessings only; Soul Reaper highest by a small margin; no single blessing dominates. Shattering Cold was never offered (no test squad has a Chill source). Each one is worth about one stat blessing in raw depth; their value is what they change.
- `test:td-balance` (bots take the first card blindly, now sometimes a mechanic one): Moonlit glass cannon win -> loss, balanced 5 -> 4 lives; Sunscar balanced 10 -> 4; Verdant all-platform win -> loss. Checks pass. `playRun` got a `blessings` preference option.
- Tests in `test-td-sim.mjs`: eligibility, rare cards appear and are always eligible, boons kept apart from virtues, each effect (Tidal Pull, Venom Rot, Shattering Cold, Drowned Burst, Wildfire Spread, Soul Reaper, Storm Surge, Rally). Checked in Chromium at 1280 and 390 px.

## Roadmap M18: Bosses that change rules (done September 26, 2026)
- Goal (gap check): boss fights that change how you play, not only more HP. Owner asked to confirm hero-disabling mechanics; the go-ahead came with "next" after the question (same kind of effect as the accepted Hexer).
- Baphomet (`tuning.bosses.baphomet`, loosely after its real mechanics "targets top DPS: silences + self-damage" and "defensive stance"):
  - Mark of the Goat: every 15 s marks the hero with the most recent damage (fading memory, 8 s, `recentDamage` in `recordDamage`); after a 1.5 s warning (red reticle, notice) that hero is silenced for 3 s (no attacks, no ultimate charge; `silencedUntil`, `isSilenced`) and loses 10% of its health. Veiled heroes are skipped; Purify and Radiance lift silences too. Spreading damage over several heroes blunts it.
  - Defensive Stance: every 20 s takes 60% less damage for 4 s (steel ring).
- Lilith: End of All (the missing piece from her archive entry): below 50% health her children attack 3x as fast (`childFrenzy`), with a notice.
- Code: `bossRules(boss, dt)` from `enemyTraits`; applies to every boss of that map, including the scaled mid-bosses of 20 waves and endless.
- Texts: `BOSS_RULES` in `skills.js`, appended to the boss cards in the Glossary.
- Balance (`test:td-balance`): Sunscar balanced 4 -> 3 lives, Sunscar 20 waves 3/5 -> 2/5, other rows unchanged; boss fights run slightly longer.
- Tests in `test-td-sim.mjs`: mark picks the top recent dealer, warning before the silence, self-damage share, a silenced hero does not attack, stance reduction, End of All threshold and child attack speed. Checked in Chromium (reticle, stance ring, notice, silence after the warning).
- Standing rule for new maps: every new boss gets one rule, not only more HP.

## Roadmap M19: Daily Trial (done September 26, 2026, built by a subagent in parallel with M20)
- One fixed setup per UTC day (`src/game/td/daily.js`: date string hashed to the seed): map, 5 allowed heroes (at least 2 road and 2 platform), 2 mutators from the M15 pool active from wave 1, endless at Normal, game seed = day seed (waves, blessing and mutator offers match for everyone). Divine Blessings and shard boosts do not apply (a pending shard boost stays for the next normal run).
- Sim: constructor options `allowedHeroes` (place() rejects others; the recruit sheet lists only them) and `mutators` (preset, `presetMutators`); offers never repeat a preset one.
- Goal: clear wave 5 (the first boss). Measured with a headless bot: the planned wave 15 was reached on 0/20 days (median 4 waves; 5 fixed heroes without blessings clear about 5 to 7 waves, the full roster 25 to 33). With wave 5: 8/20 days (40%), 23/60 (38%). More gold, lives or weaker mutators did not move the wave-5 boss wall, so only the goal changed.
- Reward and records: first goal clear of a day pays 100 Favor once; per-day record (date, best waves cleared, best score, goal reached), last 7 days kept (`save.daily`, sanitized, old saves load with an empty list). Trial runs skip `mapBests`/`mapTop` and the "better than last time" line; debug runs record nothing.
- UI: Daily Trial card in the lobby (map, boss, goal, heroes with portraits and cost, mutators, today's best, Start trial); HUD Goal stat (hidden below 600 px, where the top bar is already full; the start and wave-clear notices and the result carry the goal there); result kicker "Daily Trial <date>" and a goal line; How to play entry. Files: `daily.js`, `page/daily.ts`, `scripts/test-td-daily.mjs` (`--measure [days]` prints the reach rate).
- Open: M4 leaderboard sharing; the top bar at 390 px overlaps (known, see M22); the help text says "five heroes" in words.

## Roadmap M20: Challenge goals per map (done September 26, 2026, built by a subagent in parallel with M19)
- Six optional challenges per map and run length (10 and 20 waves, any difficulty; never endless or the Daily Trial), counted when the run is won and the condition held all run (`src/game/td/challenges.js`, pure): Perfect Defense (no lives lost), Trio (at most 3 different heroes deployed, sold and fallen ones count), One Class, Unrefined (no level, Awakening or training bought), Swift (battle time at most 300 s / 600 s; time between waves does not count), Hoarder (at least 2,000 / 5,000 gold left).
- Rewards: first clear 40 Favor (10 waves) or 60 (20 waves) times the tier's Favor factor; a later clear on a higher tier pays the difference. Stored per map and run length as the highest tier cleared (`save.challenges`, sanitized, backward compatible). Sim tracks `fieldedIds` and `upgradesBought`.
- Measured (bot runs, Normal, 3 maps x 3 seeds): Swift never without blessings (410-670 s), about half of S-tier runs with every blessing (250-345 s). Hoarder: upgrading bots end with 150-550 gold, never-upgrading ones 1,250-1,970 without blessings and 2,200-3,400 with them. Three Archers win every map with all blessings; three Mages lose Sunscar; Warrior-only mostly loses, Tank-only always. Unrefined is fairly easy (S-tier squad wins 8/9 without upgrades, no blessings). Perfect Defense needs at least the Favor trunk.
- UI: badge row on each map card (earned or not, tooltips with run length and tier, screen-reader summary), collapsible challenge list in the run length panel, result screen chips for this run's challenges (new clears highlighted with their Favor; these replace the old hard-coded result achievements), How to play entry. Files: `challenges.js`, `page/challenges.ts`, `scripts/test-td-challenges.mjs`.
- Open: Hoarder comes almost free together with Unrefined once blessings grow; the "+X Divine Favor earned" line leaves out challenge Favor (the chips show it, the total includes it).
- Integration (both): `npm run test:tower-defense` now runs `test-td-daily.mjs` and `test-td-challenges.mjs`; full checks pass, `test:td-balance` identical to before (normal runs unaffected), TD type-clean, lobby checked in Chromium at 1280 and 390 px (no horizontal scroll, no console errors).

## Roadmap M21: Expedition mode (done September 26, 2026)
- Roguelite chain of the three battlefields (shuffled per expedition), each a 10-wave stage at Normal with enemy health scaled per stage (`EXPEDITION.stageHp` 35% / 50% / 65%). Start with 3 random heroes (at least one road and one platform); only the expedition roster can be recruited. Lives carry over between stages (at least 1), gold does not, a stage cannot be retried (Retry hidden; Retry and Restart return to the lobby). Divine Blessings apply; shard boosts wait for a normal run. Finishing pays +300 Favor on top of each stage's normal Favor. Challenges and map records do not count (the M20 trial rule catches the restricted roster).
- Camp after each won stage (in the lobby card, so it survives a reload): one card of each kind, seeded: Recruit (a new hero from the slot type the roster has fewer of; costs 3 lives), Relics (a pair of M17 run blessings that fit the roster, active from wave 1 of every stage), Drill (every current roster hero enters each stage at level 2).
- Sim options (additive): `boons` (preset relics), `startLevels` (per hero, capped below the level 3 focus), `lives`, `hpScale`. Logic in `src/game/td/expedition.js` (pure), page in `page/expedition.ts`, in-progress state and best in the save (`expedition`, `expeditionBest`, sanitized; old saves load with none).
- Measured (headless whole expeditions, 30 seeds each, bot takes its preferred card): first design (3 heroes at 100% / 120% / 140% health) never got past stage 1 without blessings (0/30 finished; 8/30 with every blessing). With 35% / 50% / 65%: finished expeditions with hero-first / drill-first / relic-first picks: fresh account 4 / 3 / 2 of 30, full trunk 14 / 10 / 10, every blessing 23 / 21 / 22. Recruiting was clearly best until it cost lives (it was 7 vs 1 against relics); one veteran was too weak, so the veteran card became a whole-roster Drill; single relics were too weak, so relic cards carry two.
- UI: Expedition card in the lobby (stage, map and boss, lives, stage strength, roster with veteran marks, relics, best, Start/Continue, Abandon with confirm), camp cards, result kicker "Expedition - stage N of 3" and outcome line, start notice, How to play entry. Tests: `scripts/test-td-expedition.mjs` (in `test:tower-defense`). Checked in Chromium at 1280 and 390 px: start, forced stage win, result, camp, choice, reload keeps the state.
- Open: leaving a stage mid-way (Menu, back to the lobby) keeps the expedition at that stage, so a losing stage can be restarted; counting that as a loss would also punish closing the tab by accident. Stage 1 is the main filter (a fresh account fails it in about 13/30 expeditions, mostly with weak random trios).

## Roadmap M22: App shell, hero panel, result screen, type audit (done September 26, 2026)
Owner asks: a side panel instead of the hero flyout, buttons side by side, a font size audit, no "FINAL BOSS" in endless, an app-like menu flow (main menu -> map -> difficulty -> game, full width and height), and a result screen overhaul. Owner decisions: main menu with one big Play button, Daily Trial and Expedition cards, a row of smaller buttons; no pause while the hero panel is open; Glossary as an in-app screen (the separate page stays); map and difficulty as two steps. Built by six subagents in parallel on the shared tree (A, A2, B, C, then D1 and D2), integrated and checked here.
- Bugs first: the boss nameplate says "Final wave" only on the last wave of a 10 or 20 wave run ("Boss - wave N" otherwise); phone top bar no longer overlaps (stats keep their width, smaller buttons, Daily goal stat hidden up to 420 px).
- Phase A, app shell (`page/nav.ts`, `TdLobby.astro` rewritten, `TdSoundControls.astro`, `panels.ts` embed()): full viewport, no page scroll; app bar (back, title, Favor chip, settings); screens home, maps, mode (difficulty and run length), daily, expedition, blessings, help, settings (sound, save link, about with the disclaimer), save, glossary, play. Each screen is a history entry: browser Back and Escape go one level up, reload keeps the screen, Back in a run opens the pause menu. Leaving a run returns to where it started (map select, Daily Trial or Expedition screen); the result screen's Main menu goes home and Expedition's Continue opens the camp. Every feature is at most 2 taps from the main menu, a normal run 3 (Play, Next, run length). The old title block and lobby button row are gone. In a run, Blessings and How to play still open as modals (the game pauses).
- A2, Glossary component (`TdGlossaryContent.astro`, props assetBase, embedded, headingLevel): embedded without hash handling, `tdg-` prefixed ids, sticky tabs inside its scroll area; the standalone page is a thin wrapper and looks as before.
- Phase B, hero panel (`popover.ts` rewritten, same API): desktop and wide landscape push the map aside (1440x900: map 1096x616 next to a 344 px panel); short landscape overlays the side away from the selected hero; portrait uses a bottom sheet from the map's bottom edge. Portrait, name, class, level line; health and stats; Target; Upgrade with focus / path / Awaken / Train inline; Details (open by default, remembered); Rotate and Sell side by side. Checked: the selected hero never covered at 1440x900, 844x390, 390x844; every action works.
- Phase C, result screen (`results.ts` presentation, result block): full-stage overlay; header (outcome, map, mode and tier, score, Daily/Expedition line); Summary (Divine Favor card with every source adding up to the total, which fixes the missing challenge Favor; shard pick; challenges; stats) and Battle (what went wrong, damage table) side by side on wide screens, tabs otherwise; fixed action bar (Retry, Spend Favor, Main menu; Expedition: Continue to camp).
- Phase D, type and buttons (D1 menus, D2 play screen): type scales as CSS variables in td.css (menus: screen 18, section 18, card 15, body 13 to 14, label 11, number 15, display 30; play: HUD 18, title 18, heading 12, meta 12, body 13, label 11). Before: many labels and sentences at 10 to 11 px; after: nothing below 11 px, sentences at 13 px, at all three sizes. Main menu uses the space (Play block on map art, cards beside it, one row of links on wide screens); mode title wraps instead of an ellipsis; Settings in 3 columns; help in newspaper columns; recruit sheet 2 columns on phones; pause menu in button pairs (fits at 844x390); hero panel choices side by side on phones. Kept stacked on purpose: cards with a description sentence each, the landscape side rails, 5 home links on phones (3 + 2). Fixed along the way: the standalone Glossary page had lost its layout after Phase A.
- Checks: `npm run test:tower-defense`, `test:td-balance`, no TD type errors; Chromium at 1440x900, 844x390, 390x844: home -> maps -> mode -> run -> hero panel -> result -> Main menu -> Glossary -> Back, no page scroll, no console errors (apart from the Astro dev toolbar's own audit noise).
- Open: notices triggered on menu screens (e.g. "Expedition abandoned.", camp picks) still go to the play screen's notice area where nobody sees them; in short landscape a hero under the open panel cannot be clicked on the map (select it from the deck); D1's last CSS change (phone run length cards back to one column) was not re-audited; a few scripted edits on td.css and TdLobby.astro (checked here: the other agent's rules are intact).

## Roadmap M22b: Placement tiles and deploy cap (done September 27, 2026)
Owner ask: more places to put heroes, a tile on every step beside the road, and a tile look that works when many sit next to each other. Owner decisions: a tile grid (Arknights style: road tiles for blockers, tiles beside the road for ranged), a deploy cap instead of gold alone, procedural tiles first (painted tiles later).
- Tiles: `src/game/td/grid.js` `buildGrid(map)` lays 60 px square tiles along every route segment (road tiles) and one row on each side just clear of the 70 px road (side tiles, with corner tiles at bends), skipping gates, the sanctuary, a per-map `bounds` box and `exclude` rects (painted walls, astrolabes, statues). `scripts/build-td-grid.mjs` writes the result into `tdMaps.json` as `roadSlots` / `platformSlots` / `rings`, so every consumer still reads plain arrays; `--check` fails when the file is stale. Special rings are anchored by position in the map's `grid.rings` and land on the nearest tile. Counts: Moonlit 22 road + 35 side (was 6 + 5), Verdant 35 + 39 (was 6 + 6), Sunscar 21 + 28 (was 6 + 6).
- Deploy cap: `tuning.run.deployCap` = 7 (sim `deployCap()`, checked in `place()` and before a Caishen revive). Sweep with smart bot placement, caps 5 to 8: 8 made every squad much stronger (all-platform squad won every map); 5 to 7 were within noise of each other; 7 chosen as closest to the old ring layout on 10-wave runs.
- Look: `map-scene.js` draws flat squares (corner brackets on road tiles, a faint inset plate beside the road, glow when focused); the painted round pad sprites are no longer loaded. Special ring markers are square frames. Map select previews show only the route (tiles everywhere carry no information).
- UI: deck shows heroes on field / cap; tapping an empty tile with a full team says so instead of opening the sheet; the sheet shows the count and "Team full" per hero; arrow keys (all four) move to the nearest tile in that direction; player text says "tile" instead of "ring" (help, glossary, notices, Cursed tile).
- Bots and tests: `rankedTiles(map, type, range)` (grid.js) orders tiles by route covered, then closeness to the sanctuary; the balance runner, daily bot and class matrix (top 6 tiles) use it. Rule tests in `test-td-sim.mjs` keep the old hand-placed rings as a fixture (`scripts/fixtures/td-legacy-rings.json`) so their geometry stays stable; new checks cover the cap, file sync, road tiles on the route, side tiles clear of it and no overlaps.
- Balance (`test:td-balance`, before -> after): 20 waves Moonlit 2/5 -> 4/5, Verdant 3/5 -> 4/5, Sunscar 2/5 -> 3/5; endless Moonlit 13, 25, 5, 6, 25 -> 25, 30, 10, 26, 25; Verdant 34, 33, 7, 9, 42 -> 32, 34, 10, 32, 30; Sunscar 15, 25, 5, 5, 25 -> 35, 35, 5, 26, 20. The all-platform squad now wins 10 waves on every map (lost everywhere before).
- Checked in Chromium at 1440x900 (all three maps) and 390x844: tiles, 7 heroes placed, recruit sheet, full team, keyboard; no console errors.
- Open: runs are easier than before (free placement lets a squad build one kill zone); retune enemy health with `npm run td:sweep` or lower the cap if that is too much. `npm run td:classes` not re-run (M6 criteria may shift: platform-only squads are stronger). On phones a tile is about 23 px wide; taps pick the nearest tile but it is small. Painted square tiles per map are still to do; `map.md` pad assets are unused now.

## Roadmap M24 and M24b: White label and new sounds (done September 27, 2026)
Owner ask: replace everything taken from Motto Immortal / GOAT Games in the tower defense game. Full inventory, decisions and status: [TOWER_DEFENSE_WHITELABEL_AUDIT.md](TOWER_DEFENSE_WHITELABEL_AUDIT.md) (plan: TOWER_DEFENSE_WHITELABEL_PLAN.md, hero texts: TOWER_DEFENSE_MYTHIC_HEROES.md).
- Heroes: mythic roster ("The Last Crossing") always on via `src/game/td/skin.js` + `src/data/tdSkinMythic.json`: names, titles, portraits and tokens (`td/heroes-alt/`), ultimate names; art approved by the owner. Idle loops generated from the portraits (`scripts/td-idle-anim.py`, `td/heroes-alt/anims/`).
- Sounds: hero sounds v4 from owner-supplied packs (Hove Audio sword combat, Mixkit, Tactical Interface SFX; archers and five ultimates keep sounds generated with Coplay `generate_sfx`), interface and combat sounds from the Tactical pack; credits and licenses in `public/td/sfx/CREDITS-mythic.txt`; pack originals kept outside the build in `~/hero-database-assets/td/`. Music: 3 CC0 tracks (`public/td/music/CREDITS.txt`).
- Class icons: owner glyphs as `td/icons/classes/{class}-v1.webp`. Blessings (run and Divine Blessings trunk) renamed without hero names. Boss nameplate uses the AI sprites, no faction. Branding: "The Last Crossing | Tower Defense", disclaimers say not affiliated.
- Removed: database hero art/sounds/tokens/Spine loops and their extraction scripts, legacy enemy head portraits, the world map. `scripts/test-td-skin.mjs` fails if TD code loads database hero, token, animation or boss art again.
- Log of the milestone bullets as they stood:
  - plan: White label documentation: `TOWER_DEFENSE_WHITELABEL_PLAN.md`
  - audit (September 27, 2026): `TOWER_DEFENSE_WHITELABEL_AUDIT.md` - full inventory of game content in the TD game, readiness per area, a one-switch skin plan, work order and owner decisions.
  - progress (September 27, 2026): switched. The game always uses the mythic roster (art approved), generated hero sounds (v3), idle loops from the portraits (test), CC0 music, renamed blessings; database hero sounds, Spine loops, tokens and extraction scripts removed. Left: class icons, enemy sprite review, leftover fallback files. Status section in the audit.
  - new hero art is in `/Users/daschultheiss/hero-database/public/td/heroes-alt` xor `/Users/daschultheiss/hero-database/public/td/heroes-alt/review-set-v1`
  - new heroes (text, skills) defined in `TOWER_DEFENSE_MYTHIC_HEROES.md`
  - i downloaded a bunch of sound effects that we can try and swap out here:
  - Done (September 27, 2026): hero sounds v4 from these packs (swords, stabs, spells, heals, coins), archers keep the generated sounds (no bow sounds in the packs); interface and combat sounds (hits, block, select, place, upgrade, wave clear, error) from the Tactical Interface pack. Mapping and licenses in `public/td/sfx/CREDITS-mythic.txt`. The original packs and the class icon sources were moved out of the site build to `~/hero-database-assets/td/` (`newFx`, `newArt`): their licenses forbid redistributing the standalone files.

## Roadmap M26 sprints 0-8: Campaign (done September 27, 2026)
Concept: [TOWER_DEFENSE_NEXT_STEPS.md](TOWER_DEFENSE_NEXT_STEPS.md). Home -> Campaign or Free Play. Stage data `src/data/tdCampaign.json`, summon banner `src/data/tdSummon.json`, rules `src/game/td/campaign.js`, page `src/game/td/page/campaign.ts` (Campaign, Squad, Heroes, Summon screens), progress in the save's own versioned `campaign` section (v3). Tests `scripts/test-td-campaign.mjs` (data, rules, migration, bot winnability of all 10 stages) and `scripts/test-td-summon.mjs`. Sprint 7 and 8 were built by two parallel agents with split file ownership.
- Sprints 0-3 done (September 27, 2026): Home has Campaign and Free Play; Campaign screen (Chapter 1, stages 1-1 First Watch on Moonlit, 1-2 The Green Road on Verdant, 1-3 Sunscar Stand on Sunscar, locked until the previous one is cleared); Squad screen (up to 4 owned heroes); stage data in `src/data/tdCampaign.json` (map, own waves, lives, enemy health, generic rewards list); rules in `src/game/td/campaign.js`, page in `src/game/td/page/campaign.ts`; progress in the save's own versioned `campaign` section (owned heroes, clears with best lives, last squad), exported with the save code. Owner decision: not all heroes at once, so a later summon has something to give: 6 starters (one per class, weaker tiers), each first clear unlocks one hero (1-1 Skadi, 1-2 Atlas, 1-3 Odin), 12 stay locked. No Divine Blessings and no Favor in campaign stages. Balance (bot, every 4-hero squad from the heroes owned by then): 1-1 all squads win, 1-2 16/35, 1-3 31/70; `scripts/test-td-campaign.mjs` fails if a stage drops below 20%. Tanks do worst in 4-hero squads (Gaia 30% on 1-3). Next per the concept: rewards/currencies, hero levels, the 10-stage Chapter 1, then summoning.
- Sprints 4-6 done (September 27, 2026): generic rewards (`{ type: "currency" | "hero", ... }`) with two currencies, Gold and Hero XP (Divine Seals wait for summoning); first clear pays the stage's rewards (1-1: 200 Gold, 100 XP; 1-2: 300/150; 1-3: 400/200, plus the hero), a replay 25% of the currencies (`repeatShare`). Heroes screen (Campaign -> Heroes): hero levels 1-10, +6% attack and health per level in campaign stages only (`heroLevels` in tdCampaign.json; cost 100 Gold + 50 XP, +50/+25 per level), applied by scaling the run's hero list (`campaignHeroes`), no sim change. Campaign save v2 (currencies, levels); v1 saves migrate and are paid the first-clear currencies of stages they had cleared. Effect (bot, every 4-hero squad on 1-3): all level 1: 31/70 win, level 2: 41/70, level 5: 48/70. Next: the 10-stage Chapter 1, then summoning.
- Sprint 7 done (September 27, 2026): Chapter 1 "The Road to the Crossing" has 10 stages (79 waves, about 65 minutes of bot play time for first clears), each introducing one or two enemy mechanics: 1-1 First Watch (Moonlit; grunts, runners), 1-2 The Green Road (Verdant; flyers), 1-3 Iron Hides (Moonlit; brutes, menders), 1-4 Shield Wall (Verdant; shieldbearers, archers), 1-5 The Horned Warden (Moonlit; Baphomet, mid-chapter boss), 1-6 Hexfire (Verdant; hexers), 1-7 Two Gates (Sunscar; two lanes), 1-8 Brood Hollow (Verdant; broodcallers), 1-9 Eve of the Crossing (Sunscar; everything mixed), 1-10 The Crossing (Verdant; Lilith, final boss). First clears pay 200..1100 Gold, 100..550 Hero XP and 50 Divine Seals (100 on 1-5 and 1-10); reward heroes 1-1 Skadi, 1-2 Atlas, 1-3 Odin, 1-5 Plutus (plutus), 1-10 Aegir (aegir), the rest stay summon-only. Balance (bot, up to 35 sampled 4-hero squads per stage from the heroes owned by then, levels bought evenly with the first-clear currencies so far, level 1 up to 4-5 by 1-10): 1-1 15/15, 1-2 20/35, 1-3 19/35, 1-4 20/35, 1-5 11/35, 1-6 17/35, 1-7 14/35, 1-8 15/35, 1-9 12/35, 1-10 10/35; `scripts/test-td-campaign.mjs` checks all 10 at those levels (fails below 20%, about 35 s). Tanks (Demeter, Atlas) do worst in 4-hero squads on late stages.
- Sprint 8 done (September 27, 2026): smallest summoning. Third currency Divine Seals (first clears only, replays pay none), one banner "Call to the Crossing" in `src/data/tdSummon.json` (100 Divine Seals, pool = every hero not owned yet, uniform, so a summon is always a new hero; no duplicates, ten-pulls or pity yet). Rules `summonPool`, `canSummon`, `summon` in `campaign.js` (rng injectable, `summons` count kept for later pity); Summon screen from the Campaign footer (banner, cost, wallet, heroes left, one button, reveal card with portrait, name, title, class and a Build squad link); the hero is usable in Squad and Heroes right away. Campaign save v3 (+ summons); v2 saves are paid the Divine Seals of stages they had cleared once, v1 saves all first-clear currencies once. Tests: `scripts/test-td-summon.mjs`. Open: the pool includes heroes that stages still give as first-clear rewards, so a summon can take a later stage's hero (that stage then pays only currencies). Pool rule (September 27, 2026): heroes that a stage gives on its first clear (Skadi, Atlas, Odin, Plutus, Aegir) are not summonable (`stageRewardHeroes`), so a summon never takes a stage reward; the banner holds the other 10 heroes. Next per the concept: duplicates and ranks (sprint 9), stars and milestones (10), quests (11).

## M24 leftovers (done September 27, 2026)
White label follow-up; details in [TOWER_DEFENSE_WHITELABEL_AUDIT.md](TOWER_DEFENSE_WHITELABEL_AUDIT.md) items 8 and 9.
- Enemy sprites: each compared with the game portrait it was generated from. All five kinds were the game's monsters redrawn (mushroom, stone stack, rock sphere, crystal eye, spider) and were regenerated from text-only prompts in the setting: grunt = draugr foot soldier, runner = underworld hound, flyer = Stymphalian bird, archer = satyr archer, brute = armored mountain troll (`{kind}-v2.webp`). Lilith v2 was the game's boss art with the background removed and her brood v2 a repaint of the game's model: replaced by a folklore night demoness (owl wings, serpent) and lilin night spirits (`boss-lilith-v3`, `brood-v3`). Kept: Baphomet, brood v1 (broodcaller) and Lilith v1 (hexer). 9 generations with Coplay (gpt_image_1, medium), about $0.38 (3 Lilith attempts; the first and third came out smudged, the second is used).
- `ENEMY_SPRITE_VERSIONS` and `enemySpriteVersion()` in `assets.js` drive the renderer, boss nameplate, borrowed sprites (`ENEMY_ART`: mender, shieldbearer and imp follow the new versions) and the Glossary (no hard-coded versions left). Prompts in `src/game/td/sprite-spec-for-ai.md`, which no longer asks for game portraits as references; generated sources in `~/hero-database-assets/td/enemy-sprites-src/`.
- Leftover files checked: fallback pads, road and tile PNGs unused and not game-like; Kenney sheet still used; promo thumbnail is Motto-branded with the game's Zeus and Lilith. Deletions and R2 clean-up left to the owner (roadmap).
- Checks: `npm run test:tower-defense`, no TD type errors; Chromium, Verdant Crossing with every enemy kind spawned mid-wave, and the Glossary: all new sprites load, no console errors.
- Follow-up (September 27, 2026, owner approved): deleted the unused local files (`public/td/sprite.png`, `spritePlatform.png`, `spriteRoad.png`, `bg/slot_platform.png`, `bg/slot_road.png`, `bg/path_tile.png`), the replaced enemy sprites (`{grunt,runner,flyer,archer,brute}-v1.webp`, `boss-lilith-v2.webp`, `brood-v2.webp`) and the Motto promo thumbnail with its doc. R2 copies stay until the owner deletes them.
- M24c follow-up (September 27, 2026, owner approved): Ymir applies Chill instead of Burn (`tuning.statuses.sources`), matching the frost giant; with Aegir's Wet this now triggers Freeze. Burn comes only from Hephaestus and the Wildfire path / Kindling infusion.
- Also deleted (owner, September 27, 2026): `public/td/sprite_backgrounds.png` (unused sheet of 9 painted landscapes, origin unknown); R2 `td/sprite_backgrounds.png` stays until deleted by hand.


## Roadmap M27a: Menu design (done September 29, 2026)

- Most menues are really boring to watch. We have a really nice looking main menu screen at the moment. But all screen within a game mode looks like a text menu. 
- campaign should also have cards. summon is only a button. rethink and restructure this.
- Progress (September 28, 2026): Campaign cards and the Summon screen were done earlier (audit screen pass, M28); Daily Trial already had its banner and portrait cards. This pass:
  - Expedition: Daily-style banner (expedition art, boss art once started, rule chips, reward box before the start, lives box during a run), route of three battlefield cards with map art (done / next battle / ahead; "Unknown battlefield" plus stage health before the order is drawn), camp rewards as large choice cards (recruit portrait, relic and drill icons), squad as portrait cards (shared `trialCardHtml()` in `page/daily.ts`, veterans show their level instead of the cost), relics as tiles, "How it works" steps before the first start. Continue button names the stage.
  - Difficulty and run length: battlefield banner (map art, boss art, Change button back to the map select), difficulty tiers with diamond rank pips, tier colours and a Favor badge, run-length cards with a big 10 / 20 / infinity numeral, best result and a Play button (compact rows on phones).
  - Map select: map art at 90% instead of 55% opacity, softer route overlay.
  - Checks: `npm run test:tower-defense`, no TD type errors, Chromium 1440x900 and 390x844: map select, mode screen, Expedition before start, after a forced stage win (camp) and after a camp pick; no horizontal overflow, no console errors.
- Open: Settings / Glossary / Blessings screens were not part of this pass.
- Closed by the owner September 29, 2026; Settings / Glossary / Blessings redesign not required for this milestone.


## Roadmap cleanup, September 29, 2026 (archived as-is)

Everything below was moved verbatim from the roadmap when it was cut down to open work. Done here: M24c (both passes), audit steps 1, 2, 4 and the step 3 changes that shipped, all M24 user-feedback items, M24d recruits, M26 sprint 9, M27b (rarity odds), M28, research notes, old known gaps. Map items dropped: maps now come from the procedural map generator.

### M24c - New Effects due to hero change (next up, owner September 29, 2026)
- we should render new effects for our heroes after we swapped them.
- check what kind of hero we have, then look what we can do with a solid type of effect in the game
- if a hero uses lightning, the lightning should look good
- if a hero uses poison, we should see poison bubbles happening
- i dont want any "just straight line as damage" anymore in the game
- If a hero has a permanent support skill active (like give more atk or atk speed -> he should get an aura pulsating showing that there is an effect active)
- Progress (Sep 27): done in a first pass. New pooled effect kit (`fx-kit.js`) plus status visuals (`status-fx.js`); every hero has a themed attack, impact and ultimate for its mythic identity (table in `TOWER_DEFENSE_HERO_SKILLS.md`); Odin's lightning forks and re-strikes with a rune circle ultimate; poison bubbles, burn flames, chill frost, wet drips and a frozen ice shell show on enemies; all tracer lines (hero shots, enemy shots, hexes, dashes, heal beams) replaced by travelling projectiles, arcs and curved flows. Ymir Burn -> Chill fixed September 27, 2026 (see archive).
- Second pass (done September 29, 2026): (a) support passive aura now visible while active: pulsing underglow and ring on every `aura` hero, a slow wave out to its real range, faint rims at the feet of allies inside it and a brighter gold rim under a timed ult buff (`render.js` `updateAuraFx`, reduced motion static); (b) the 12 recruits got profiles and class builders for attacks, impacts and ultimates instead of the generic fallback (`hero-fx.js` `CLASS_*`, table in `TOWER_DEFENSE_HERO_SKILLS.md`). Checks: `npm run test:tower-defense`, Chromium 1440x900 and 844x390 on Moonlit (9 recruits + Plutus, wave 1, all ultimates), no page errors. Open: owner look in play; then archive M24c.

#### M23: Tutorial Stage (skip)

- We should have a tutorial stage where players get an onboarding into all our mechanics and game play. that should cover minimalistic stages with the most important topics to deal in an onboarding scenario like most gacha or tower defense games do. we have to define what we want to do and what should be displayed. most apps just create simple scenarios with tooltips that pause the game and players need to follow a tutorial.
- players should be introduced to basic mechanics, status effects
upgrades and such.


#### M24 - Attention! Audit
- There will be an Audit being run. Audit is documented here and will be done from another agent. File: `/Users/daschultheiss/hero-database/TOWER_DEFENSE_PROGRESS_AUDIT.md`

#### Audit changes:
Audit order from `TOWER_DEFENSE_PROGRESS_AUDIT.md` ("Development cycle recommendation"). UI consolidation is done; balance and content-contract work remain open.

- Campaign, Squad and Summon screen pass (done September 28, 2026):
  - Campaign stages screen: 5-wide stage grid with chapter tabs below (later chapters "Coming soon"). Cleared cards fade back with a green check, the next stage glows gold with a play badge, locked ones are grey with a lock. Tapping an unlocked stage opens a details drawer from the right (art, encounter text, waves, lives, boss, best, first-clear and replay rewards, recommended Might vs. last squad) whose button opens Squad. The earlier next-stage card and chapter route rail were removed (redundant with the cards and the home Campaign card's route).
  - Squad now presents four visible lineup slots, road/platform and anti-air coverage, a flyer warning, quick pick, campaign power versus the stage recommendation, richer owned-hero cards with role and expandable skill text, and a separate locked-hero collection with accurate acquisition sources.
  - Summon now presents its banner rules and cost, all ten banner heroes with collected/undiscovered state, the Divine Seal source, a clear disabled state, and a focused reveal that links back to Campaign. Completed-banner copy distinguishes banner heroes from stage rewards.
  - Validation: Campaign and Summon rule suites passed; responsive Chromium flows passed at 1440x900, 390x844 and 844x390 with no document overflow or page errors. Covered stage selection, squad add/remove/quick pick, flyer warning, summon purchase/reveal, exhausted banner and four-hero campaign entry. `astro check` reports no errors in these changed TD files; the repository still has its known unrelated errors. Production build intentionally not run.
  - Next approval gate: Step 3, Balance and pacing. Measured September 28, 2026 (results and proposals under Step 3); tuning waits for owner approval.

- Step 1 - Rules and UI agree (done September 27, 2026):
  - Deploy capacity: `sim.deployCap()` is capped by a restricted roster (Campaign squad, Daily Trial, Expedition), so HUD deck, recruit sheet and entry notice show e.g. `0/2` instead of `0/7`.
  - Life maximum: new `game.maxLives` (campaign stage lives; Expedition uses the run's full lives, carried lives can be lower). The sanctuary's INTEGRITY label uses it (1-1 reads 20 / 20, not 20 / 25).
  - Squad unlock text, boss preview only when the stage has a boss, and the "every hero in this banner" summon text were fixed in the Campaign/Squad/Summon screen pass before this.
  - Menu notices: `ctx.notice` shows in a new menu region (`data-td-menu-notice`) when no run is active, so Expedition camp/abandon, summon and level-up feedback is visible.
  - Save failures: `store.persist()` returns whether the write worked; a failed write shows one notice pointing to Save data export, and a failed import says the save only lasts this visit.
  - Results: Campaign's Continue button reads "Next: stage X" after a win (opens that stage's squad) or "Change squad" after a loss (same stage's squad); "Campaign" only when the chapter is done.
  - Checks: `npm run test:tower-defense` (new sim checks for restricted cap and life maximum), no TD type errors, Chromium 390x844 flow Campaign -> squad -> battle -> loss -> Change squad.
- Step 2 - First session: teaching/tutorial skipped completely for now (owner, September 27, 2026); focus moved to UI polish. Done September 27, 2026:
  - Hero popover: target priority folded into a collapsed "Target" row (summary shows the active rule); opened, it lists labelled options (icon + name, 36px tall) instead of nine 32px icons.
  - Heroes screen: card grid with portrait, "Campaign Lv X / 10" plus level pips, Attack and Health as current -> next, level-up cost on the button; per-level percentage read from `tdCampaign.json` and battle levels named as separate.
  - Checks: `npm run test:tower-defense`, no TD type errors, Chromium 1440x900 and 390x844 (Heroes screen, popover open/closed, target change).
- Step 3 - Balance and pacing (measured September 28, 2026; tuning waits for owner approval). Post-chapter Divine Seal source decided September 28, 2026: Daily Trial goal +15, finished Expedition +60, Seal Dust from spare copies (see M26 sprint 9).
  - Tooling: `td-runner.mjs` has a second bot policy (`policy: "carry"`: upgrades the strongest hero first, takes the last level-4 path; default `"cheapest"` unchanged). `npm run td:pacing -- --seeds=3 --sample=35` prints class removal, map / run length win rates, campaign win rate and minutes per stage, and seal income, for both policies.
  - Tanks: in Endless the result flips with the policy (without Tanks +3.1 waves for "cheapest", -3.4 for "carry"), so the old finding was partly a bot artefact. In the campaign Tanks are the worst class on 8 of 9 contested stages under both policies (squads with a Tank win 10-53%). Real problem, mostly in 4-hero squads.
  - Mages: without Mages -16.9 / -16.6 Endless waves (full squad 30.7 / 31.3), far more than any other class (Archer -8 to -9, Warrior -4 to -6, Support -4 to -8). Confirmed, both policies.
  - Verdant: 80% wins in every mode and policy (Moonlit 47-80%, Sunscar 40-60%). Confirmed easiest map.
  - 10 vs 20 waves: "cheapest" wins 62% / 73%, "carry" 67% / 56%. Policy-dependent, not a tuning target.
  - Campaign: 1-10 falls to 2/35 (6%) with "carry" (29% with "cheapest"), below the 20% floor; 1-9 23-34%, 1-5 31-43%. Winning runs total 63-70 minutes; expected time to clear the chapter with a random squad and retries 147-291 minutes (concept target 30-60).
  - Seals: Daily goal only 105 / week (1.8 pulls, 40 days per x10); Daily + 1 Expedition a day 525 / week (8.8 pulls, 8 days per x10); dusting spare copies stretches this by up to x1.33.
  - Measurement gap: deploy cap is 7, so the balanced squad's 11th hero (Nyx, the only Assassin) is never placed and "without Assassin" reads +0.0. Class removal should use a 7-hero squad per class.
- Economy gold ledger (done September 28, 2026): new `npm run td:economy` (`scripts/td-economy.mjs`, no sim changes — it wraps game instance methods) prints in-run income by source against spend by sink per mode/tier, closing the last gap in the analysis suite (see TOWER_DEFENSE_MECHANICS_OVERVIEW.md, recommendation 1). First measurements (Normal, moonlit-pass, cheapest policy): clear bonus + boons supply 48-59% of income vs. 25-31% from kills; classic spending is 70% levels 2-4 with awakening/training barely engaged (~90 gold/run), while long/endless shift 62-76% of spending into awakening+training; runs end with ~200-370 gold left over. Open question for owner approval: raise kill rewards and cut the clear bonus (keeps totals, makes leaks visibly cost gold) or keep the salary model.
- Kill-reward economy (approved and done September 28, 2026): kill rewards doubled across all enemy kinds (grunt/runner 10, flyer 12, archer 14, brute 24, boss 100, imp 2, mender/shieldbearer 16, hexer 18, brood 12, broodcaller 24), wave-clear bonus halved (50 + 10/wave). Ledger before -> after (classic): kills 31% -> 59% of income, clear bonus 48% -> 23%, total income +6.6%, leftover 184 -> 292. Leaks now visibly cost gold. Balance harness, campaign and summon checks all pass unchanged (3/5 classic wins, endless wave 24).
- Gacha pity and dust sink (done September 28, 2026; mechanics overview recommendation 4): (a) `pityNewInMulti` on the banner — a full x10 that draws no new hero replaces the last duplicate with a weighted draw from the unowned pool (single summons unpitied, no pity once the pool is exhausted). Initially shipped disabled (21-hero pool, no fillers — a guaranteed new hero per x10 would have emptied the collection). **Enabled later the same day** (`pityNewInMulti: true`, owner decision September 28, 2026) after the rarity weights and the 33-hero pool landed: a 4,000-run simulation showed no early-game effect (≈7 new in the first x10 either way) but a fixed collection tail (full collection median 46 -> 12 x10, first legendary P90 11 -> 8); (b) `buyCopiesWithDust` in `campaign.js` — 100 Seal Dust buys 1 spare copy of an owned hero (`dust.copyPrice` in `tdSummon.json`), so duplicates always convert into targeted progress. New summon tests cover pity trigger/refund/single/exhausted and dust-copy buy/guards; full suite and `td:upgrade-sweep` pass. UI wiring done September 28, 2026: the banner shows the pity rule under the pool count (`data-td-summon-pity` in `TdLobby.astro`, text set in `page/campaign.ts`), and the Seal Dust panel gained a hero select plus a dust->copies button (`data-td-dust-copy-hero` / `data-td-dust-copy`); `CampaignProgress` in `page/save.ts` now types the optional `copies` map. Conflict resolved: "new heroes stay hard to get" is now carried by the rarity weights (a specific legendary ≈0.45%/draw), so the pity is enabled — it only fires when a full x10 yields nothing new.
- Filler heroes ("recruits") — IMPLEMENTED September 28, 2026 (owner approved count, names, placeholder art). 12 generic tier-D heroes (2 per class, ~20-25% below the weakest class member, reused abilities/ultimate variants, `recruit-*` ids) grew the summon pool 21 -> 33. Shipped: rows in `gameBalance.json`, `heroSkills` + `roster` (33) in `gameBalance.tuning.json` (tuning keeps generic skill names like "Recruit Shield Wall" so the skin test's new-name rule holds), display entries in `tdSkinMythic.json`, generated placeholder art + reused class sounds via `scripts/td-recruit-assets.py` (rerunnable; swap files for real art later), audio levels in `tdAudioLevels.json`. Measured after integration (clean worktree, full suite 14/14 green): featured chance 5/37 ≈ 13.5%; campaign-end 600-seal x10 now averages 5.8 new heroes / 4.2 copies (was 3.9/6.1 with 21 — a bigger pool duplicates less early); campaign stage sweeps unchanged. Pity stays `false`; re-evaluate with a possible recruit batch 2. Details: `TOWER_DEFENSE_FILLER_HEROES.md`.
- Rarity-driven summon odds (IMPLEMENTED September 28, 2026; owner direction: "legendary / epic / common like most gachas"). Every hero in `gameBalance.json` now carries `rarity`: legendary (tiers S/A, 5 heroes), epic (B/C, 13), common (D, 15 = all recruits). The banner authors `rarityWeights` legendary 1 / epic 4 / common 10; the featured hero's rarity weight is multiplied by `featuredWeight` 5. `campaign.js` weights all draws (including the pity replacement) by rarity and exports `summonRates()`; the banner shows per-rarity rates (featured 9.0%, legendary 2.2%, epic 21.5%, common 67.3% with an epic featured) next to the pool count, computed from the same rules so display cannot drift. Tests cover weight math, rate sums and common>legendary per-hero odds; the stale save-version assertions were raised to 6 (the v6 skill-levels commit had left the suite red). Measured (clean worktree, suite 14/14 green): campaign-end x10 now averages 6.4 new / 3.6 copies. Note: `tierUltPower` in tuning is dead config (per-hero `ultPower` already matches tier) — left in place, flagged for a later cleanup.
- Currency cleanup (approved and done September 28/29, 2026; mechanics overview recommendation 8; owner pain point: "summon currency feels hard — one chapter cannot fund summons"). (a) Campaign replays now pay a quarter of the first-clear Divine Seals (≈150 extra seals per chapter run ≈ 2.5 pulls; `FIRST_CLEAR_ONLY` empty, UI source texts and summon tests updated); (b) shard next-run boost needed no work — the lobby home card already shows it; (c) Divine Essence merged into Seal Dust: `CURRENCIES`/icons/dust panel/Evolution slot updated, evolution without a copy costs `heroEvolution.dustPrice` (150 dust, moved into `tdCampaign.json`), the final skill rank costs 150 dust instead of 1 essence, `exchangeDust` only sells seals, `dust.perEssence` removed from `tdSummon.json`. Save version 7 migrates leftover essence at the historical 1:150 rate; summon tests cover the v6→v7 conversion. Full suite 14/14 green; the two `page/campaign.ts` type errors in `astro check` are pre-existing (fodder section, unchanged by this work). Measured chain at spawn (sim.js lines 578/765): `hp = base.hp x (1 + wave x 0.15 waveHpScale) x 3.75 global difficulty.enemyHp x tierHp (tier x map.enemyHp) x endlessRamp x statScale`; attack scales only by tier x statScale x ramp. Problem: the global 3.75 makes the tuning enemy table fictional — a Normal wave-1 grunt really has 337.5 hp, not 90 — so any per-kind tuning lands 3.75x off from what the author reads, and the debug panel edits the same knob live. Done: every `tuning.enemies.*.hp` and `bosses.lilith.stats.hp` multiplied by 3.75 exactly (grunt 337.5, brute 1200, boss 8250, Lilith 9750) so the table is the Normal-truth; `difficulty.enemyHp` dropped to 1 (key kept for the debug panel); semantic layers untouched (waveHpScale 0.15, map.enemyHp, tiers, endlessRamp, expedition stageHp). Verified: full test suite passes, `td:sweep --hp=1` unchanged at 3/5 wins, `td:economy` classic ledger bit-identical (2215 kill gold, 3779 total income); campaign drift within noise (1-10: 17/35 -> 16/35).
  - Proposals: (a) Tank encounters, (b) Mage trim and (c) Verdant approved by the owner September 28, 2026; (d) 1-10 health and (e) Chapter 1 length measured for decision September 29, 2026 (numbers below, both still open).
  - (d) 1-10 health, re-measured September 29, 2026 (`td:pacing`, seeds 99-101): the September 28 reading (6% carry) was a 4-hero-squad artefact; with 5-hero squads 1-10 wins 60-67% cheapest / 43-48% carry, above the 20% floor. The remaining soft spot is 1-9 under "carry" (17-33%). Variant "late hp relief" (1-9 hpScale 0.57 -> 0.50, 1-10 0.67 -> 0.60, measured with `node scripts/td-chapter-length.mjs --variant=3`): 1-9 -> 76% / 48%, 1-10 -> 76% / 43%, chapter expected time -6 min. Small, safe change — or leave as is, since the floor holds on both policies at 1-10.
  - (e) Chapter 1 length, measured September 29, 2026 (`td-chapter-length.mjs`, in-memory variants, no data changed): 10 stages, 79 waves; pure winning runs 67-68 min, expected with retries 103-131 min vs the 30-60 min concept target — even perfect play overshoots. Variant "waves x0.7" (every stage trimmed to ~70% waves, first and last wave kept, 59 waves total): winning runs 51-52 min, expected 72-76 min; win rates move within noise except late stages up (1-9: 57->81% cheapest, 33->71% carry). Variant "waves x0.7 + late hp relief": expected 70-74 min, 1-10 76% / 67%. Options: ship waves x0.7 (with or without hp relief), accept ~100 min as the real chapter target, or shorten differently (fewer stages would touch rewards/unlocks and was not measured).
  - Done (c) Verdant: new map field `enemyHp` (open modes only; a Campaign / Expedition stage scale replaces it), Verdant 1.25. Measured at 1.3: Endless 23.7 / 18.1 waves (was 28.4 / 25.9; Moonlit 23.7 / 20.4, Sunscar 24.0 / 20.9), 20 waves 10/15 and 7/15. Campaign stages on Verdant unchanged.
  - Not changed (b) Mages: a fair test (same 4-hero core, platform trio swapped) shows no Mage excess: 3 Mages Endless 27.2 / 25.3, 3 Archers 29.6 / 20.9, 2 Mages + 1 Archer 29.8 / 27.7. The -17 "without Mages" came from the test: the balanced list fills the freed places with Tanks and Supports. Splash / chain trims (down to 0.2 share) moved it by at most 2 waves. `td:pacing` class removal needs same-slot replacements before it is used for tuning again.
  - Not changed (a) Tanks: tried without shipping, measured on 1-2..1-10 with both policies. Heavier brute / shieldbearer waves (runners removed) made Tank squads no better and 1-10 harder; Tank hold 3-3.5 s and guard 0.45, +25-60% damage to enemies a Tank holds, and Tank attack x1.5 / x2 / x2.5 all left squads with a Tank at 0-61% vs 9-100% without. Cause: in a 4-hero squad every non-damage place costs wins (on 1-9 all-platform squads with no road hero win); by 1-9 the owned 10 heroes include 2 Tanks and 2 Supports, so Tank squads are also low-damage squads. Losses are leaks, not standoffs. Next step needs an owner decision: accept Tanks as a 7-hero (Free Play / Endless) class, or give 4-hero squads a reason (for example a fifth campaign place for a road hero, or stages that punish leaks through the road differently).
- Sunscar re-check (done September 29, 2026): the earlier note "sunscar-ruins wins with no standard squad" does not reproduce anymore. Current sweep (`td:sweep --hp=1 --seeds=5`): Sunscar 3/5 squads win in classic and long — identical to Moonlit Pass (balanced, budget and all-platform win 5/5; road wall and glass cannon lose on every map, which is the intended contract for lopsided squads). `td:pacing` map table: Sunscar 60% classic / 47% long, between Verdant (easiest) and Moonlit. The kill-reward doubling, facing fix and 5-hero campaign squads since the original measurement apparently closed this. No tuning; point closed.
- Step 4 - Content contract (done September 29, 2026; this line was lost in the Sunscar re-check commit and restored):
  - Balance baselines: `build-game-balance.mjs` had been crashing since the recruits were hand-added. Ranks now come from the fixed set `tuning.balanceReference` (the 21 database heroes); other database heroes in the roster are ranked against it one at a time; hand-authored rows (recruits) and `rarity` are kept. Output is byte-identical to the current file; temporarily adding `ares` added one row and changed none. `--propose=<id>` prints a new hero's row next to its class peers; `--check` now runs first in `npm run test:tower-defense`.
  - Chapter-aware UI: new `currentChapter()` in `campaign.js` (chapter holding the next stage, else the last); the home card, summary and route use that chapter's stages instead of `chapters[0]`. The Stages screen already had chapter tabs; results already continue across chapters. Test with a synthetic two-chapter campaign in `test-td-campaign.mjs`.
  - Acquisition rules: `summonableHeroes()` and `heroRewardStage()` in `campaign.js` replace the page's own filter and its two duplicated reward-stage lookups; covered in `test-td-summon.mjs`.
  - Expedition route length: `EXPEDITION.stages` = 3 (one `stageHp` entry per stage); a new expedition draws that many distinct maps, and the lobby's route preview, rule chip and copy use it instead of the map count. Existing seeds give the same routes; test with a four-map pool.
  - Pixi pinned: `pixi.js@8.21.0` and `@pixi/filter-glow@5.2.1` (what `@8` / `@5` resolved to and what every check today ran on); verified loading in Chromium, no page errors.
  - Content checklists (hero, stage/chapter, map) in `TOWER_DEFENSE_SPEC.md`; spec roster section updated to 33 heroes.
  - No save format change. Checks: full suite (15 steps incl. the balance check), TD type check clean.
- Step 5 - Controlled expansion (open): a few new stages or chapter star milestones, only after 1-4.
- Doc drift listed in the audit (open): `TOWER_DEFENSE_SPEC.md` (one map, 20 heroes), `PROJECT_MEMORY.md` (inline page script), `src/game/td/bugs.md` (inspector stats and blessing graph exist), `docs/tower-defense-ui-plan.md` (ring-era requirements), white-label audit (label historical sections).

#### M24 Urgent User Feedback
This is feedback from a players perspective and we should tackle solutions for these immediately and with high priority.

**Planning status (September 28, 2026; slot readability done September 29; Moonlit authored layout and archer platform shots accepted):** Open recommendations below are proposals for owner review. Suggested order: touch inspection → compact panels, Upgrade clarity and rotation removal → slot readability → authored layout trial → platform-threatening enemy trial. The first three form one usability pass; layout and combat changes should be measured separately. Special-tile atmosphere is complete. This is a code-informed review; visual and playtest checks below are acceptance criteria for implementation.

28.9.2016 (original feedback date as recorded):
- Mobile: Too much texts gathered in one place
  - **Advice — P1, proposed September 28, 2026:** Make the battle panels show one immediate decision at a time. Keep portrait, role, essential stats and the main action visible; collapse skill explanations and advanced targeting under labelled Details / Target controls. The deployed-hero panel currently starts with Details expanded (`page/popover.ts`); start it collapsed on phones and retain the player's choice during the session. Shorten the recruit sheet's class paragraph to the selected hero's role and relevant tile bonus. Keep costs, disabled-action reasons and important warnings visible.
  - **Done when:** At 390×844 and phone landscape, the primary action is visible without scrolling through descriptions, expanded content stays reachable, and the selected tile/range remains visible. Review recruit and deployed-hero panels first; extend the same treatment to other screens only where needed.
  - **Done September 28, 2026:** Recruit sheet (see next item) and deployed-hero panel: Details starts collapsed at max-width 600px / max-height 560px, open on larger screens, and the player's toggle is kept for the session. Upgrade sits at y 564 of 844 (portrait) and 304 of 390 (landscape) with Details closed; Rotate removed from the action row. Chromium 390x844, 844x390, 1440x900, no page errors.
- I am unable to see what a unit is capable of doing before placing them down- maybe on laptop I can hover over it but I cannot do the same on phone
  - **Advice — P1, first change:** Use “tap hero → inspect → Deploy · cost”. Today `page/recruit.ts` previews on hover/focus, but its click handler immediately places the hero. M28 added a range preview, which does not give touch users a deliberate opportunity to read a chosen hero's abilities.
  - **Proposal:** Selecting a card shows a compact role sentence, basic attack/support effect, ultimate effect, ground/flying coverage and the range at the chosen tile. Put full numbers in expandable Details and use current gameplay data so Campaign upgrades are reflected. A separate Deploy button confirms placement; selecting another card only changes the preview. Allow inspection of unaffordable or already deployed heroes while disabling Deploy with a reason. Preserve the existing pause while recruiting.
  - **Done when:** Touch, mouse and keyboard users can compare two heroes and cancel without spending gold; only Deploy places a hero. Verify range, cost and ability descriptions agree with the resulting unit.
  - **Done September 28, 2026:** Cards only select; the inspect panel (role, ground/flying reach, range on this tile, ultimate, collapsed Details with attack/health/speed/crit, class rule, tile bonus, campaign level) stays visible on phones (only the idle animation is dropped). Footer button "Deploy <hero> · <cost> gold" is the only placement; unaffordable/deployed heroes stay inspectable with a disabled button and reason. Hover no longer changes the choice, so Deploy always names the hero it places. Sheet note reduced to the tile bonus (class paragraph removed, part of the compact-panels item); short screens hide the sheet title and note, the list keeps at least one card row and the panel scrolls. New `sim.deployPreview()` shares `place()` maths (`startLevelFor`, `deployRange`); `ROLE_HINTS` moved to `ui.js`. Checks: `npm run test:tower-defense` incl. new preview-vs-placed check, TD UI checks, no new type errors; Chromium 1440x900, 390x844 (touch), 844x390 (touch): second card does not deploy, Deploy places and closes, disabled reason for unaffordable, keyboard focus selects / Enter does not place / Escape closes, no overflow or page errors.
- Slightly more defined tower slots so players can understand the spots where we can place the gods
  - **Advice — P1:** Strengthen the tile silhouette with a contrasting rim and inset surface; distinguish Road and Platform with both shape/icon and colour. When choosing placement, brighten eligible empty slots, dim incompatible ones, and give the selected slot a clear outline. Keep occupied tiles quieter so combat stays readable.
  - **Implementation / done when:** Update the active `map-scene.js` slot drawing and the `render.js` fallback consistently. Check hit areas against the drawn tiles on all three maps at phone size; tapping a visible tile must select that tile without overlapping neighbouring targets. A player should recognise an available position without opening help.
  - **Done September 29, 2026:** Tiles redrawn in `map-scene.js`: dark outer rim + accent rim over a darkened surface on every empty tile; road = recessed socket with corner brackets and a shield glyph, platform = raised bevelled plate with a double chevron (shape and colour differ). Occupied tiles quieter than before. New placement states from `render.js` `slotMode()`: picking a fallen hero in the deck sets `game.uiDeploySlot` (`page/hud.ts`), its tile type glows and the other fades; with a full team empty tiles go quiet so combat stays readable; the focused tile gets a bright outline. The fallback renderer fades the same way. Hit areas: `nearestSlot` now prefers the tile whose 56 px square contains the tap; before, tile corners at two staggered Moonlit bends picked the neighbour, and tile corners beyond the 38 px minimum radius missed entirely. New `test-td-ui.mjs` check samples every tile on all three maps (fails on the old code). Checks: `npm run test:tower-defense`, no TD type errors, Chromium 1440x900 and 844x390 on all three maps (before/after), touch redeploy flow (deck -> eligible platforms / dim road -> tap -> redeployed, states cleared), no page errors. Sanctuary and special-tile effects unchanged.
- personal suggestion but make the slots randomly, not serially or in rows, it adds the depth of the map design bit more
  - **Advice — P2:** Use deliberately authored, irregular platform clusters near bends, islands and clearings. Start with one map for comparison. Keep positions stable between attempts so players can learn a layout; per-run randomness would also change difficulty and complicate Daily Trial comparisons. Road positions still need to line up with the route for blocking.
  - **Implementation:** Extend the source `grid` configuration with authored placement anchors or controlled offsets, then regenerate the slot arrays. `map.md` explicitly makes `roadSlots`, `platformSlots` and `rings` generated output; direct edits would be overwritten. Preserve art assignments, obstacle clearance, entrance/sanctuary clearance and distinct touch targets. Rebind special tiles correctly when indices change.
  - **Done when:** The revised map has useful short- and long-range choices, coverage for every lane and no inaccessible slots. Compare campaign/free-play outcomes against the existing layout before applying it to the other maps; avoid combining layout and enemy tuning in the same measurement.
  - **Trial on Moonlit Pass (September 29, 2026; accepted by the owner the same day):** `grid.platforms` in `grid.js` lets a map author its side tiles (validated: bounds, excludes, gate clearance, 67 px road clearance, no overlap); road tiles stay generated. Moonlit now has 26 staggered side tiles (was 35 in rows): three in each bend pocket, an island of five by the sanctuary (High Ground moved to it), sparse outer tiles; Cursed now sits in the middle pocket. New `npm run td:layout` (`scripts/td-layout-compare.mjs`) plays the same seeds on the committed and the working layout. Iterations: a first cut with 21 tiles and only 5 strong spots was clearly harder (classic 27/40 -> 24/40, campaign 1-5 20/40 -> 12/40); the kept layout keeps about as many strong spots as before. Result (6 seeds, both policies): classic wins 41/60 -> 47/60, mean lives 14.3 -> 16.8, Endless waves 22.7 -> 23.0; most of the gain is one cell (glass cannon, carry policy 0/6 -> 5/6), other squads within noise. Campaign on Moonlit: 1-1 12/12 both, 1-3 25/40 -> 30/40, 1-5 20/40 -> 22/40 (campaign check: 1-3 17/35 -> 21/35, 1-5 19/35 -> 21/35). Road wall in Endless drops from wave 10 to about 6: a bot standoff (its Support's best tile now reaches the front blocker, heals outlast enemies it cannot kill, the runner counts 120 s without progress as a loss), not a real defeat. `test:td-balance`, full suite and tile hit checks pass; screenshots at 1440x900 and 844x390, no tile on painted obstacles, Sanctuary unobstructed. Kept. To revert: delete `grid.platforms` and rerun `node scripts/build-td-grid.mjs`. Other maps get authored tiles only on request, each measured with `td:layout`. Moonlit being slightly easier fits the audit (Moonlit 47-80% vs Sunscar 40-60%).
- I enjoy the design of the maps, specially the design of the "Sanctuary"
  - **Advice — visual constraint for this pass:** Preserve the existing map art and Sanctuary as the focal point. Match new tile borders and ambient effects to each map's palette and keep the final approach, Sanctuary silhouette and damage feedback unobstructed. This positive feedback supports targeted readability changes.
  - **Done when:** Before/after views of all three maps show that the Sanctuary remains easy to identify during placement and busy combat. No replacement art is needed for this feedback.
- I did not quite understand the concept of "rotate" and I personally think players would rather have the option to "upgrade" rather than rotate. (Again I am not exactly sure what "Rotate" does, so if it is important disregard this point)
  - **Owner decision — September 28, 2026:** Remove player-controlled rotation. The control is unclear, adds upkeep during combat and competes with the much more useful Upgrade action.
  - **Implementation advice — P1:** Remove Rotate from the deployed-hero panel, remove the `R` keyboard action and update the keyboard help. Directional attacks and ultimates must automatically face their chosen primary target when they fire; centre their cone or spread on that direction for the whole attack. Keep facing only as internal combat/render state where an animation or effect needs it. Remove `sim.rotate()` and other player-facing rotation wiring once every directional hero has automatic aiming.
  - **Done when:** No rotation control or instruction remains, Upgrade is the main action, and every directional hero can hit an appropriate target without manual setup. Add focused simulation checks for cone and spread skills from enemies approaching on different sides and lanes, then run the existing balance suite to catch any damage increase caused by reliable automatic aiming.
  - **Implemented September 28, 2026 (balance gate open):** `sim.rotate()`, the Rotate button, the `R` key, the facing tick and help/keyboard text are gone; Medusa's "waits until she faces a target" removed. New `sim.faceTarget()` aims every step and at ult cast. New sim checks: Poseidon, Amun-Ra, Set, Jormungandr, Medusa and Diana hit a target on all four sides while starting turned away, spare the enemy behind, Medusa petrifies cone neighbours, facing follows the target in combat. `npm run test:tower-defense` passes. `npm run test:td-balance` vs HEAD: full runs and Endless move within noise both ways (e.g. Endless 28 -> 31 on one Verdant seed, Sunscar all-platform 22 -> 18 lives), no broad damage increase; shield wave best road class flipped Tank (25%) -> Warrior (27%, was 23%). Owner accepted September 28, 2026: no tuning; `test-td-balance.mjs` now lets the Tank trail the best road class on shield waves by up to 3 points (`TOLERANCE`).
- [x] I like the idea of the special tiles, do you think you can create a sort of "aura" or smoke/mist around the special slots? It would then actually feel special than just be highlighted as special — **done September 28, 2026.**
  - Added a persistent ambience layer beneath slots and units. High Ground has rising gold motes, Shrine has drifting cyan mist and a soft pulse, and Cursed has rising red wisps. Each tile creates its small set of Pixi display objects once; frames only update position, scale and opacity. Reduced-motion mode hides moving parts and retains a static coloured glow. Existing badges remain, and the recruit sheet plus deployed-hero details continue to state the exact tile benefit.
  - **Validation:** Renderer syntax and TD UI helper checks pass. Browser checks at 390×844 and 844×390 covered all three special tiles occupied during an active wave with no page errors; 120 animation frames averaged 13.2 ms with a 14 ms p95 in that run. A separate 390×844 reduced-motion check showed static markers with no page errors. The full simulation suite currently stops at the pre-existing dirty-worktree Lilith HP assertion (expected 9750, actual 12187.5), unrelated to this render-only change. Production build intentionally not run.
  - **Second pass (September 28, 2026):** Effect now reaches past the tile and over the hero. A soft radial-gradient texture (drawn once, additive/screen blend) replaces the hard ellipses: ground light about twice the tile size under the slot art, drifting motes / mist / wisps moved to a new layer above the heroes (fainter while occupied so the token stays readable), and the occupying hero gets a matching underglow and rim (rotating gold arcs on High Ground, pulsing cyan double ring on Shrine, uneven red flicker on Cursed). Checks: `npm run test:tower-defense` passes; Chromium 1440x900 on Moonlit Pass (empty tiles, occupied High Ground and Cursed, during wave 1) and 844x390 with reduced motion (static glow and rim), no page errors.
- tower heroes dont take damage? we should invent new enemies types OR add an attack to existing enemies that deal dmg to tower heroes as well, not only road heros.
  - **Finding:** Ordinary enemy targeting in `findEnemyTarget()` excludes platform heroes, including for ranged attackers. Platform heroes are not completely immune: the boss mark can damage them, and Hexers can disable them. The feedback exposes a real gap in regular-wave pressure.
  - **Advice — P2, separate balance pass:** Give one existing ranged enemy an explicit ability to attack either slot type. Introduce it in a controlled mid-chapter wave with a visible projectile, target warning and a short wave-preview description. Use a bounded attack range and cadence; prefer a nearby road defender when one is available, giving Tanks a protective role, while exposed platforms become valid targets. Leave ordinary melee targeting unchanged.
  - **Counterplay / done when:** Players can identify and focus the attacker, protect platforms with positioning/road defenders, and recover through healing or redeployment. Test range, target eligibility, dead/veiled targets, target loss and damage/death handling. Measure platform-heavy and mixed squads under both existing bot policies, plus manual phone play, before increasing its frequency. Revisit the audit's Tank/Mage imbalance with those results; a wholly new enemy and art set can follow if this first variant is insufficient.
  - **Shipped September 29, 2026 (accepted by the owner the same day):** the existing enemy Archer now shoots platform heroes: while it holds at range (110 px, 8 s) it still takes the nearest road hero first, otherwise the nearest living platform hero in range, for half its attack (`tuning.enemies.archer.targetsPlatforms` / `platformAttack` 0.5; set the flag false to switch it off). Melee phase stays road-only. Archers first appear in stage 1-4 and Free Play waves 6 and 8, so this is the controlled mid-chapter introduction. Readability: amber corner brackets on the aimed hero (`aimedAt`), first-archer-wave notice, glossary and leak-hint text updated. Tests: new `test-td-sim.mjs` block (road first, range, fallen heroes, melee phase, flag off, damage share, warning timestamp); full suite, `test:td-balance`, TD type check pass; Chromium check on Moonlit (brackets on Zeus, notice text, no page errors). Measured off -> on, same seeds, both bot policies: Free Play classic 88/120 -> 87/120 wins (lives -0.2 on average), Endless waves -1.0 / +1.0 / -0.5 (Moonlit / Verdant / Sunscar). Campaign (35 sampled squads x 2 policies): 1-4 59 -> 51/70, 1-5 45 -> 39/70, 1-6 40 -> 39, 1-7 48 -> 47, 1-8 44 -> 44, 1-9 27 -> 27, 1-10 39 -> 36; chapter total 62% -> 58%, 1-9 stays at 39% (floor 20%). Bots lose up to ~1 platform hero per run to archers on 1-4 (they do not reposition; players can). Tried: full damage cost 1-4 84% -> 60% (too harsh for an introduction), 0.6 -> 76%, 0.4 -> 80%. Tank squads did not gain a clear protective edge (most sampled 5-hero squads contain a Tank, so the split says little); revisit with the Tank decision. Next: manual phone play; raise `platformAttack` or add archers to more waves only after that.

#### M24d - New boss and heroes
- we need another boss for Lilith cause she is still a character from Motto Immortal. Create all what is necessary. Ideas: some Monsters from Greek Mythology
- also we need common heroes where we can summon from. These can be pawn like common heroes with no heroic names cause they need to differ from our good heroes. they are common and deal as fodder with low stats and limited skills. they should be added to the summon pool and of course everywhere else. we need at least one for each class. 

#### M25: Leaderboard (large, needs design first - skip)

- Goal: shared scores across players.
- Blocker: needs an anti-tamper design before any code (see spec section 9); a plain client-submitted score endpoint would be a cheat form. Likely path is a Cloudflare Worker plus D1.
- Done when: the anti-tamper approach is agreed, then built.
- Only in Endless Mode maybe?

#### M26: Campaign (next sprints)

Concept: `TOWER_DEFENSE_NEXT_STEPS.md`. Sprints 0-8 are done (archive "Roadmap M26 sprints 0-8": 10-stage Chapter 1, squads of 4, Gold / Hero XP / Divine Seals, hero levels, one summon banner).
- Sprint 9: duplicates, Stars and Evolution (done September 28, 2026; replaces the planned ranks 1-3). Design and numbers: `docs/tower-defense-summon-duplicates-plan.md`, current rules in the spec (Summoning; Stars, Evolution and Seal Dust).
  - Summon: 60 Divine Seals per pull, x1 and x10 (600). Pool `"all"`: owned heroes come back as spare copies; stage-reward heroes join once earned. Full-screen reveal dialog (`page/summon-reveal.ts`): wolf card backs, tier glow (gold featured, purple S/A, none), tap to flip, Reveal all, New / +1 copy tags, Summon again / Build squad / Close, Skip animation.
  - Seal sources: campaign first clears (600 = one full x10), Daily Trial goal +15, finished Expedition +60.
  - Stars 1-5 (copies of other heroes + Gold, +10% attack/health each), Evolution I-V (own copy or Divine Essence; ult +20%, crit +10%, ult cooldown -15%, ult +25%, V = awakened ultimate from deploy), Seal Dust (copy -> 30; 2 -> 1 seal; 150 -> 1 Essence). All player-confirmed; Heroes screen has Level / Stars / Evolution tabs. Campaign only.
  - Save: campaign section version 4 (`copies`, `stars`, `evolution`, Seal Dust, Divine Essence).
  - Owner decision: new heroes stay hard to get (x10 at the end of Chapter 1 gives about 4 new heroes, 6 copies); no new-hero boost.
  - Result screen after a campaign stage: Campaign button back to the headquarters instead of Main menu; Spend Favor hidden.
  - Checks: `npm run test:tower-defense` (summon suite covers multi summon, duplicates, Stars, Evolution, dust, v3 -> v4 migration), `npm run td:upgrade-sweep` (1-8 / 1-10: base 25%, 3 stars ~45%, Evolution V ~60-65%, 5 stars + Evolution V 70%), Chromium 1280x800, 900x700, 390x844.
  - Open: numbers under review in play; the reveal could flag "Evolution ready" on a copy that makes an upgrade affordable.
- Sprint 10: stars per stage and chapter milestones (replay reasons).
- Sprint 11: quests (only once enough systems exist to reference).
- Open balance points from sprints 7-8:
  - Tanks do worst in 4-hero squads on late stages (Gaia 1/14 winning squads on 1-9, Atlas 2/13 on 1-10).
  - 1-9 and 1-10 react strongly to enemy health (1-10: hpScale 0.64 -> 0.69 moved bot wins 49% -> 26%); about 10 points above the test's 20% floor.
  - Chapter 1 pays 600 Divine Seals = one x10 at 60 per pull (sprint 9); later seals come from the Daily Trial, the Expedition and Seal Dust.
  - Play time about 65 minutes of winning bot play, over the concept's 30-60; 1-10 alone takes 10-12 minutes.

  ### M27b: Rethink Summon Mode
  - summon should be as to when a user requires to have x amount of a material to summon 1 hero, and XX amound of material to do a 10 pull summon.
  - summons should contain not good heroes (60% chance of dropping), medium heroes (38%) and the best heroes (2%) chance. 
  - for this we might require more heroes and put them to qualities like: common, rare and epic heroes.
  - Progress (September 28, 2026): the cost part is done in M26 sprint 9 (60 seals per pull, 600 for x10, duplicates as copies, reveal with tier glow). Open: quality tiers with 60 / 38 / 2% drop rates; this needs the common fodder heroes from M24d first (the roster has 21 heroes and no commons).

#### M28: AAA reference UI pass (done September 28, 2026)

Screenshots of an unnamed AAA mobile TD's campaign map, squad select, in-combat HUD and victory screens were analyzed and compared against our screens (`TdLobby.astro`, `TdPlayScreen.astro`, `campaign.ts`, `recruit.ts`, `hud.ts`). Findings and owner decisions:
- Already equivalent, no change: redeploy-cost badge on fallen deck heroes (`td-deck-badge`), per-unit ultimate charge ring (drawn on canvas, `render.js`), result screen (ours is one screen with Summary/Battle tabs; the reference needlessly splits Victory into two screens around a sync-loading gap - not worth copying).
- Shipped:
  - Chapter route rail: `routeHtml()` (already used on the home screen's Campaign card) now also renders above the Campaign screen's stage grid (`data-td-camp-route`), done/current/ahead dots for all 10 stages.
  - Stage detail before squad: tapping any unlocked stage card now updates the existing feature panel in place (art, waves, boss, reward) instead of jumping straight to the Squad screen; a card gets `.is-featured`. The panel's own CTA (`data-camp-feature-start`, renamed from the shared `data-camp-stage`) is what actually opens the Squad screen ("Choose squad" or "Replay stage" depending on clear state).
  - Superseded (2026-09-28): route rail and in-page feature panel removed; the stage detail now lives in a right-side drawer (`data-td-camp-drawer`, CTA `data-camp-drawer-start`), chapter tabs under the grid (`data-td-camp-chapters`).
  - Squad power vs. recommended: `data-td-squad-power` in the Squad screen footer reads `Squad power X / recommended Y`, green when at or above, gold when under. `recommendedPower = avg(hero.atk+hero.hp across the roster) * squadSize * stage.hpScale` - a legible readout of the same `hpScale` knob the simulator already uses to scale enemy HP, not a new invented difficulty axis. Footer wraps to 3 lines under 640px (was truncating the squad-count text before the fix).
  - Might (2026-09-28): hero battle-power metric `heroMight()` (attack + health x level x stars x evolution, `heroMight.evolutionPerTier` 0.06). Heroes roster sorted by Might and shows it per tile and in the detail header; the squad readout and stage drawer now say "Squad Might" / "Recommended Might" and include evolution. Roster tiles switched to face close-ups.
  - Roster portrait cards (2026-09-28): tiles became full-bleed 4:5 face cards (class icon, Evolution badge, "Lv. N" + stars over a fade); name and Might moved to aria-label/tooltip and the detail panel.
  - Star-based level caps (2026-09-28): stars now 0-5 (new 0->1 step: 1 copy + 100 Gold), level cap 10 + 10 per star up to Lv 60; per-level gain banded (+6% for Lv 2-10 unchanged, then 3/2/1.5/1.5/1%) so Chapter 1 win rates are identical; save v5 shifts old stars down by one.
  - Stage drawer + currency chips (2026-09-28): drawer shows the battlefield map preview, facts as a plain inline row, smaller about text. New `currency-icons.js`: every campaign currency display is icon + value (wallets, rewards, costs, summon and dust buttons). Icons are the painted item art (`td/icons/items/*-v1.webp` on R2), not line SVGs.
  - Topbar icons: Gold/Lives/Wave in the play screen topbar each got a small line icon next to the label.
  - Touch range preview on first deployment: the recruit sheet (tap an empty tile) never showed the hero's range ring before placing, on any input; mouse-hover-based preview only existed for the separate "redeploy a fallen hero from the deck" flow. `recruit.ts`'s `preview()` now sets `game.uiPlacement` from the focused/hovered hero card, so the existing canvas range ring (`render.js` `buildRanges`) shows for touch too.
- Explicitly skipped (owner decision, September 28, 2026): a Lord-hero / support-hero slot pair like the reference's team screen. Would need a new squad data model and a defined gameplay effect neither of which exist; out of scope until designed on its own.
- Checks: `npm run test:tower-defense` (all suites, including `test-td-campaign.mjs`), `npm run check` (no new TD type errors), manual Chromium pass at 420x900 (campaign -> stage detail -> squad -> battle) via the Playwright skill.

#### M99: Login/Register
- what would we need to provide auth / login / register to dave players progress ? gmail auth ? apple auth ?
- goal: all achieved things from players should be saved
- if requirements are too large or harsh (for a free environment), we skip this entirely.

### Research notes (September 25, 2026)

Superseded September 27, 2026 (M24 white label): the database tokens, Spine idle loops and their scripts below were removed from the game; heroes now use the mythic skin (see the white-label audit). Kept here as history.

**Sprites from game art** (all three options done, September 25, 2026):

1. Hero tokens shipped: `scripts/build-td-tokens.mjs` crops head-and-shoulders cutouts from the full-body hero art on R2 (already transparent, no background removal needed), per-hero crop fixes in `src/data/tdTokenCrops.json`, output `public/td/tokens/{id}-v1.webp`, uploaded to R2 `td/tokens/`. The board draws them with the head overlapping the level ring and a ground shadow; heroes without a token keep the circle portrait.
2. AI enemy sprites: done. Generated with Coplay (`gpt_image_1`, medium quality, transparent background, about $0.04 each; needs a running Unity Editor with the Coplay package, for example `~/android/assetripper/newtry/ExportedProject`; the Gemini provider returned 404). Sources in that project under `Assets/td_sprites/`, sprites uploaded to R2 `td/enemies/sprites/`. Prompts need "entire body visible, wide empty margin" or the subject gets cropped. Prompt template and steps in `src/game/td/sprite-spec-for-ai.md`; `scripts/build-td-enemy-sprites.mjs <folder>` normalizes the images to `public/td/enemies/sprites/{kind}-v1.webp`; the renderer prefers them over portraits (unmasked, ground shadow, faces its direction of travel). In the game: the 5 enemy kinds, Baphomet (`boss-v1`), Lilith (`boss-lilith-v1`) and her children (`brood-v1`); the renderer loads the map's boss sprite.
3. Game Spine data: cracked. The skeleton bundles are not encrypted, only prefixed with a 46-byte decoy UnityFS header; `~/android/extract_spine_bundle.py` extracts skeleton (Spine 4.0.51 binary), atlas and textures. Verified with Ares and Poseidon, rendered with the Spine 4.0 web player. Limits: hero spines only have showcase animations (`entry`, `idle`, `interaction`), no combat moves, and enemies and bosses are 3D models in the game (no Spine). The official Pixi 8 Spine runtime needs Spine 4.2, so the practical route is pre-rendering the idle loop to sprite sheets offline. Shipped September 25, 2026: the recruit sheet shows the hovered or focused hero's idle loop (24-frame sprite sheets in R2 `td/anims/`, loop lengths in `src/data/tdHeroAnims.json`). Pipeline: `scripts/td-spine/` (extractor copy, `heroes.json` TD id -> bundle name, `render-sheets.cjs` renders frames with the Spine 4.0 player in headless Chromium). One skeleton (Jormungandr) is JSON instead of binary.

### Known gaps / deferred

Replays were dropped (September 25, 2026). Open items left by archived milestones:

- M22b (tiles + deploy cap 7): Free Play runs are easier than with the old rings (20 waves 4/5 wins vs 2/5; all-platform squads now win). Retune enemy health with `npm run td:sweep` or lower the cap if that is too much.

- M6 criterion 2: closed September 25, 2026 by the Support change below (endless without Warriors 16.3 vs 20.7 with them). Without Tanks is still close (20.3); check with `npm run td:classes`.
- M6 criterion 3: three Mages alone win Verdant on every seed; Verdant is the easiest map for every squad and needs its own tuning.

**Player feedback (September 25, 2026):**

- "Can't stop these enemies": they were flyers, which pass over blockers by design but looked like ground units. Flyers now hover above a faint shadow and bob, and the first flyer wave of a run says that only platform heroes can hit them. Rule unchanged.
- "Support heals too strong, range too big": Support range 220 -> 170 (just above Mages, below Archers), heal per attack 3x -> 1.8x attack (Caishen about 93 -> 56 health per second). Mixed squad endless 24.2 -> 20.7; Supports still count (without them 19.7).



## Board rewrite and ideas round, October 2, 2026 (branch `tower-defense-planning`)

Plan: [docs/tower-defense-board-plan.md](docs/tower-defense-board-plan.md); ideas and their
status: [TOWER_DEFENSE_GAMEPLAY_IDEAS.md](TOWER_DEFENSE_GAMEPLAY_IDEAS.md). Details in the spec.

- Board model: every map on a compact board (8x4, 9x5, 10x5) from the `board-v1` generator,
  no two layouts alike; class attack patterns, reach steps from high ground, Stormpeak and
  stars; range no longer upgraded in battle; blessing tree reach nodes became class bonuses.
- Waves: fewer, stronger enemies on boards (wave shape), Mage focus rule; campaign `hpScale`
  retuned per stage to bot win-rate targets.
- Lives shown as one per leak (`lifeUnit` 5); laurels count shown lives.
- Three-gate boards with two merge points; lanes may differ in length (targeting ranks by
  distance still to go).
- Signature patterns for Aegir, Stheno, Skadi and Boreas; ultimate areas follow patterns.
- Global stats: collection upgrades apply in every mode.
- Wave interest, pantheon bonds, Heroic campaign (save version 9), Divine Interventions.
- Not balanced yet by owner request: roadmap R5.

## Spec before the board rewrite (archived October 1, 2026)

The full text of `TOWER_DEFENSE_SPEC.md` as it stood before it was restructured around the
compact board model. Kept for its history and measurements; the current spec wins wherever
they differ.

## Tower Defense - Current Design Reference

Last verified against code: September 29, 2026.

This file describes what the game **is** today. Open map-system work is also recorded in
section 7 so the generator handoff remains visible beside the live map contract; other
planning stays in the roadmap.
- Open work and priorities: [TOWER_DEFENSE_ROADMAP.md](TOWER_DEFENSE_ROADMAP.md)
- Finished milestones: [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md)
- Hero ultimates and kits: [TOWER_DEFENSE_HERO_SKILLS.md](TOWER_DEFENSE_HERO_SKILLS.md)
- Mechanics and economy overview (currencies, upgrade layers, balance levers): [TOWER_DEFENSE_MECHANICS_OVERVIEW.md](TOWER_DEFENSE_MECHANICS_OVERVIEW.md)
- Player-facing hero identities: [TOWER_DEFENSE_MYTHIC_HEROES.md](TOWER_DEFENSE_MYTHIC_HEROES.md)
- UI plan: [docs/tower-defense-ui-plan.md](docs/tower-defense-ui-plan.md)
- Blessing tree design: [docs/tower-defense-blessings-research.md](docs/tower-defense-blessings-research.md)
- Summon duplicates, Stars and Evolution: [docs/tower-defense-summon-duplicates-plan.md](docs/tower-defense-summon-duplicates-plan.md)
- Map generator architecture: [docs/tower-defense-map-generator-plan.md](docs/tower-defense-map-generator-plan.md)
- Map-work agent handoff: [docs/tower-defense-map-agent-runbook.md](docs/tower-defense-map-agent-runbook.md)

The original September 2026 MVP spec (20-hero lock, prototype cost table, T1-T6 task
split) lives in git history (last version at commit `5e788d86`).

When code and this file disagree, the code wins. Update this file in the same change.

### 1. Scope

- Route `/games/tower-defense` (plus `/games/tower-defense/glossary`). Public, not in
  `LOCAL_ONLY_ROUTES`. There is currently no entry in `src/data/nav.ts`. The home page
  (`HomePage.astro`) links it through an "Alpha" teaser card ("The Last Crossing", camp art
  `td/ui/camp-home.webp`) beside the Latest Banner card. It has no links to database hero pages,
  because the TD heroes are not the Motto Immortal heroes.
- Fully client side on the static Cloudflare build. No backend, no accounts, no server
  leaderboard, no replays.
- English only, route not localized.
- Non-goals: map editor, shared leaderboard (needs anti-tamper design first).

### 2. Data policy and white label

Invented tuning numbers are allowed, and live only in TD files:

| File | Role |
|---|---|
| `src/data/gameBalance.tuning.json` | Hand-authored knobs (classes, enemies, bosses, run, modes, systems) |
| `src/data/gameBalance.json` | Generated per-hero stats. `npm run build:game-balance` |
| `src/data/tdMaps.json` | Maps. Tiles written by `scripts/build-td-grid.mjs` |
| `src/data/tdWaves.json` | 10 base waves |
| `src/data/tdCampaign.json` | Campaign chapters, stages, squad and hero-level rules |
| `src/data/tdSummon.json` | Summon banners |
| `src/data/blessingTree.json` | Divine Blessings tree (Favor trunk, Insight class branches) |
| `src/data/tdSkinMythic.json` | Player-facing hero names, titles, ultimate names |
| `src/data/tdAudioLevels.json` | Per-file gains. `node scripts/td-audio-levels.mjs` |

Hard rules:
- Never write TD numbers back into `src/data/heroes/*.json`, `hero-ratings.json`,
  `bosses.json` or any CN block. `npm run db:merge` stays unaware of TD files.
- **White label (M24):** the player never sees database hero art, names or sounds.
  `src/game/td/skin.js` gives each hero its mythic persona (title, art, sounds, ultimate
  name) from `tdSkinMythic.json`, with TD-owned art on R2 `td/heroes-alt/` and sounds on
  `td/sfx/mythic-*`. UI code must go through `skin.js`. Sound files are
  `mythic-{id}-{version}_{attack|ultimate}.ogg`: `v4` by default, a replaced sound gets
  a new version in the hero's `tdSkinMythic.json` entry (`"sounds": { "ultimate": "v5" }`).
  The October 1, 2026 audio audit replaced 23 sounds with generated v5 files
  (bows, shields, wolf howl, blessings, ...); owner review page:
  `/games/tower-defense/sound-review` (plays every file in `public/td/sfx`).
- **Hero ids are the mythic names (October 1, 2026):** `odin`, `atlas`, `surtr`, ... in
  code, data, tests, asset and sound file names (`odin-v2-thumb-96.webp`,
  `mythic-odin-v4_attack.ogg`, `fx/odin/`, `odin-fx.js`), blessing node ids included
  (`gaia_bounty`, `odin_dominion`, `surtr_command`). The database ids (zeus, nuwa, set, ...)
  appear only in `tuning.statSource` (which database hero seeds a row's stats) and in
  `LEGACY_HERO_IDS` (`page/save.ts`), which loads older saves and save codes under the new
  ids. `gameBalance.json` rows carry the mythic name and no database image.
  Redrawn heroes carry `"art": "v2"` (etc.) in `tdSkinMythic.json`: files become
  `{id}-{art}-{card-240|thumb-96|token-192}.webp` and `anims/{id}-idle-{art}.webp`, since
  R2 caches immutable. Odin uses v2 (source `review-set-v1/odin-v2*`).
- **Hero board figures (September 30, 2026):** every hero stands on its slot as an animated
  PixelLab figure (idle, attack, ultimate) instead of the round token: sheets
  `td/heroes-alt/figures/{figure}-v1.{webp,json}`, registered in `HERO_FIGURES` (`assets.js`),
  drawn by `updateHeroAnim` in `render.js`; recruit pairs share one figure per class. A sheet loads
  when its hero first appears; until then (or without a sheet) the token shows. Presentation
  only: attack plays when `attackClock` resets, ultimate when `ultClock` drops; ranged shots start
  at the sheet's `hand` point; figures are 80 px tall, drawn in row order (lower in front), with a
  ground shadow, flat ult ring and the level badge. Clips carry no effects (the renderer draws
  them). Since figures reach into the slot above, everything tied to a hero sits on the ground
  plane at its feet: the HP bar is part of the hero container (so a lower figure covers it);
  the special-tile underglow, rim and support aura ring are flat ellipses at the feet
  under the units, and the silenced/hexed warnings are flat rings at the feet, not circles around
  the body. Tokens keep the old circles. `?figures=off` or `?anim=off` shows tokens, `?figures=lab` loads the unpacked dev frames.
  Workflow: `docs/td-asset-pipeline.md` part D.
- Page disclaimer (lobby and glossary): "Not affiliated with GOAT Games or Motto
  Immortal. Heroes, art and text are original; music and sounds are CC0."

### 3. Code layout

- Page: `src/pages/games/tower-defense.astro` -> `src/components/pages/TowerDefensePage.astro`
  (wiring only). Markup in `src/components/td/` (`TdLobby`, `TdPlayScreen`, `TdPanels`,
  `TdOverlays`, `TdGlossary*`, `TdEnemyCard`, `TdSoundControls`, `TdDebugPanel`).
- Glossary (`TdGlossaryContent`, standalone page and in-app screen): sticky bar with the
  Heroes / Enemies tabs and section jump chips (scroll only, the URL hash stays the tab's).
  Its own denser type scale (body 12px, titles 13px). Icons are Material Symbols Rounded,
  loaded as a Google Fonts subset (`icon_names`) built from the icon maps in the component
  frontmatter (`STAT_ICON`, `STATUS_ICON`, `REACTION_ICON`, `UI_ICON`, attribute lists), so a
  new icon must be added there; `.td-msym` renders them. Embedded, the screen body has no top
  padding so nothing shows above the sticky bar.
- Page logic: `src/game/td/page/`. One shared `PageContext` (`context.ts`); modules call
  each other only through `ctx.actions`. Screens are a stack mirrored in browser history
  (`nav.ts`): home opens stages (Play: Campaign), daily, expedition and maps (Play: the
  other modes), and heroes, summon, blessings, glossary, help and settings directly. The
  summon reveal dialog is `summon-reveal.ts`, driven by `campaign.ts`.
- Portrait gate (`page/orient.ts`): the game has no portrait layout. While
  `(orientation: portrait) and (pointer: coarse) and (max-width: 767px)` matches (touch
  phones only; narrow desktop windows and tablets are not blocked), a full-screen modal
  `<dialog>` (`data-td-orient-gate`, in `TowerDefensePage.astro`) covers every screen,
  menus included. No dismiss button, Escape is swallowed; it reopens on each change so it
  stays above other modal dialogs. It adds the `orient` pause reason; turning back to
  landscape closes it and removes the reason, so the run and open screens stay as they were.
  Where element full screen exists, "Enter fullscreen" requests it on the shell and tries
  `screen.orientation.lock("landscape")` (Android); hidden while already full screen and on
  iPhone Safari. The lock is only an enhancement; the gate is the dependable part.
- Full screen toggle (`page/hud.ts`): every `[data-td-fullscreen]` button toggles element
  full screen on the shell - the fight top bar icon button and Settings > Display
  (same expand/compress icon plus a "Full screen" / "Exit full screen" label). All copies
  sync on `fullscreenchange`; F toggles too. Hidden (incl. the Display block) where the
  browser has no element full screen (iPhone Safari).
- Menu frame (`page/frame.ts`): every menu screen (lobby, its dialogs and the embedded
  Blessings, help and save panels) is laid out once for a phone held sideways, 844 x 390
  CSS px, and must fit it without page scrolling; only long lists scroll inside their own
  box (hero roster, hero copy, squad roster, glossary, save code). `.td-app` gets
  `zoom: var(--td-zoom)` with `--td-zoom = max(0.75, min(w / 844, h / 390))`, so desktop shows
  the same layout larger and small phones a slightly smaller one. The play screen is not
  zoomed. Menu CSS lives in the "Menu frame layout" section at the end of `td.css`, prefixed
  `.td-app`; menu rules must not use viewport units or viewport media queries (neither
  follows the zoom; percentages and container queries do). Pointer maths inside the frame
  divides by `zoomOf(el)` (Blessings graph pan and zoom). Checked at 667x375, 844x390,
  915x412, 1280x720, 1440x900 and 1920x1080.
  Home screen (War Camp, September 30, 2026; `docs/tower-defense-home-camp-plan.md`):
  `TdHome.astro` + `page/home.ts`. The camp art (R2 `td/ui/camp-home.webp`, `campHomeArt()`
  in `assets.js`, solid fallback color) fills the screen and the app bar is hidden; its own
  top bar holds the title crest, the global wallet (`wallet.place()` moves the one node in
  and back out) and Settings. Left: the current objective (next campaign stage and chapter
  meter; the Daily Trial once every stage is cleared). Right: the mode rail, a radio group
  of Campaign, Daily Trial, Expedition and Free Play medallions (arrows move and select,
  Enter plays; the selected one slides out its name and status; Daily shows a "1" badge
  until today's goal is cleared), and the Play button beside it, which opens the selected
  mode's screen (Campaign: the stage list on the next stage; Free Play: the map select).
  The pick is saved as `ui.homeMode`; starting a run sets it to that run's mode. Bottom:
  the dock (Heroes, Summon, Divine Blessings, Glossary, How to play; a dot badge when a
  hero can level up, a summon is affordable, or Favor covers an open trunk blessing) and
  "Exit to database". Layout is a grid inside a size container (`td-home`): frames up to
  420px tall slim the bars and cut the objective to one line, below 360px the dock drops
  its labels, portrait frames stack objective and rail above a centered Play.
- Rules (pure, headless-testable): `sim.js`, `waves.js`, `lanes.js`, `grid.js`,
  `campaign.js`, `expedition.js`, `daily.js`, `challenges.js`, `favor.js`, `skills.js`.
- Presentation: `render.js` (PixiJS 8.21.0 and filter-glow 5.2.1 from jsDelivr, exact versions pinned; bump deliberately), `map-scene.js`, `fx-kit.js`,
  `hero-fx.js`, `status-fx.js`, `odin-fx.js`, `skin.js`, `audio.ts`, `ui.js`.
  Presentation never affects combat or consumes combat RNG.
- Styles: `src/styles/td.css`, `td-*` classes.
- Assets: Cloudflare R2 under `td/`, resolved by `assets.js` (R2 public URL in
  production, `/r2` dev proxy locally).

### 4. Roster and hero stats

33 heroes, literal array `roster` in the tuning file: 21 database heroes (below) plus 12
hand-authored common recruits (`recruit-*`, `TOWER_DEFENSE_FILLER_HEROES.md`).

| Class | Slot | Heroes (internal ids) |
|---|---|---|
| Tank | road | `atlas`, `ymir`, `heimdall` |
| Warrior | road | `aegir`, `helios`, `surtr`, `fenrir` |
| Assassin | road | `nott`, `hecate`, `vidar`, `thanatos` |
| Mage | platform | `odin`, `hephaestus`, `boreas` |
| Archer | platform | `skadi`, `atalanta`, `stheno` |
| Support | platform | `plutus`, `harmonia`, `asclepius`, `gaia` |

11 road, 10 platform. Gaia is a Support in TD only (October 1, 2026):
`tuning.classOverrides` (keyed by TD id) swaps a database hero's class before the generator runs; the
database keeps the real game's class (Tank). The build fails on a missing id or missing `stats`,
`baseAttackRate` or `bossUltimatesPer90s`.

Stable baselines (audit step 4, September 29, 2026): ranks are taken against the fixed
set `tuning.balanceReference` (the 21 heroes above, stats from their `tuning.statSource`
database hero), not the whole roster.
Reference heroes are ranked among themselves; any other database hero in the roster is
ranked against the reference alone, so adding a hero never changes an existing row
(verified: adding `ares` changed 0 rows). Rows for roster ids without a database entry
(recruits) are hand-authored and kept as-is; `rarity` is kept, or derived from tier for a
new hero (S/A legendary, B/C epic, D common). `npm run build:game-balance -- --propose=<id>`
prints a new hero's row next to its class peers; `--check` runs first in
`npm run test:tower-defense`.

#### Generator (`scripts/build-game-balance.mjs`)

`rank(x)` = percentile rank within the reference set, plus the hero itself when it is not
a reference hero (ties share the lowest index).

```
aps          = clamp(baseAttackRate, 0.5, 2.2)
dps          = lerp(18, 55, rank(atk * baseAttackRate)),  atk = dps / aps
hp           = lerp(340, 880, rank(stats.hp))
armor/mres   = lerp(30, 230, rank(stats.armor / stats.magicRes))
critChance   = stats.critRate / 100
ultCooldown  = 90 / bossUltimatesPer90s
ultPower     = tierUltPower[tier]   // S+ 1.6, S 1.45, A+ 1.3, A 1.15, B 1.05, C/D 1.0
damageType   = skills[0].damageType normalized (magic -> magical, else physical)
```

Cost is value-based, ranked **within each slot type**, mapped to `85..150`, rounded to 5:

```
effDps     = rawDps * classes[class].valueDps
value_road     = 0.30 rank(effDps) + 0.50 rank(effHp) + 0.20 rank(ultValue)
value_platform = 0.65 rank(effDps) + 0.10 rank(effHp) + 0.25 rank(ultValue)
```

Why not price by tier: tier reflects real-game skill strength, not raw stats, so tier
pricing made D heroes strictly best per gold. Tier feeds `ultPower` instead. Cost
therefore does not track the tier badge; that is intended.

After pricing, class kits apply (`hpMult`, `armorMult`, `apsMult`/`maxAps`, `dpsMult`,
forced `damageType`, `crit`), shifting a whole class without re-ranking cost.

- Community hero submissions (October 1, 2026): public form `/games/tower-defense/submit-hero`
  (`src/pages/games/tower-defense/submit-hero.astro`, no account needed) posts to the Pages
  Function `functions/api/hero-submission.js`, which sends each entry (summary embed, full entry
  as `.md`, optional art upload up to 8 MB) to a private Discord channel. Needs the Cloudflare
  secret `DISCORD_HERO_WEBHOOK`; without it the endpoint answers 503. Spam traps: hidden
  `website` field and a 4-second minimum fill time. Stats, cost and rarity are not asked; the
  owner sets them when a hero is added (pipeline part C).

### 5. Combat rules (`sim.js`)

- Fixed step 60/s, accumulator loop, deterministic, seeded RNG. Speed toggle scales
  steps per frame, never step size. World space `960x540`, canvas CSS-scaled.
- Damage: `mitigation = res / (res + 260)`; `dmg = atk * (1 - mitigation) * (crit ? 1.5 : 1)`.
  True damage skips mitigation.
- Placement: square tiles (`grid.js`, cell 60) on the road (blockers) and in rows beside
  it (ranged); Moonlit Pass has authored, irregular side tiles instead (`grid.platforms`, see map.md). Road tiles take Tank/Warrior/Assassin, platform tiles take
  Mage/Archer/Support. Flyers can only be hit by platform heroes.
  Tile look (`map-scene.js` `drawSlot`): every empty tile has a dark outer rim plus an
  accent rim over a darkened surface. Road = recessed socket, corner brackets and a shield
  glyph (gold accent); platform = raised bevelled plate with a double chevron (map-coloured
  accent). Occupied tiles drop to a faint plate and brackets. Placement states
  (`render.js` `slotMode`): while a fallen hero is picked from the deck
  (`game.uiDeploySlot`), empty tiles of its type glow ("eligible") and the other type fades
  ("dim"); with a full team empty tiles go quiet ("idle"); the focused tile gets a bright
  outline. Taps (`nearestSlot`) always pick the tile whose 56 px square contains the
  point, then the nearest centre within the hit radius.
- Recruiting (`page/recruit.ts`): tapping an empty tile opens the sheet. Choosing a card
  (tap, click, Enter or keyboard focus; hover does not) only inspects that hero: role line,
  ground/flying reach, range on this tile, ultimate text, and collapsed Details (attack,
  health, speed, crit, class rule, tile bonus, campaign level). Numbers come from
  `sim.deployPreview()`, the same maths as `place()`. Only the footer button
  "Deploy <hero> · <cost> gold" places. Unaffordable or deployed heroes stay inspectable;
  Deploy is then disabled with the reason. The recruit pause is unchanged.
- Blocking: `blockLimit` Tank 3, Warrior 2, Assassin 1. Held enemies take `+20%`
  damage; enemies passing a full blocker are slowed.
- Class archetypes: Tank `taunt`, Warrior `cleave`, Assassin `execute` (dash, veil),
  Mage `nuke` (splash, chain), Archer `volley`, Support `aura`/heal. Per-hero
  ultimates and variants: `heroSkills` in tuning, text in `skills.js`.
  Support aura visual (`render.js` `updateAuraFx`): `aura` heroes pulse in their profile
  colour with a slow wave out to their range; allies inside carry a faint rim at their
  feet, allies under a timed ult buff a brighter gold rim. Recruits use the class effect
  builders in `hero-fx.js` (`CLASS_*`).
  Heroes never move on attack (October 1, 2026): the old melee lean that shifted the whole
  figure toward the target is gone; only the attack clip (or token) plays. A full-body step
  needs its own animation. Assassins use 42 px contact range against approaching enemies. They can dash to
  an unheld enemy only after it has passed their tile; the portrait remains anchored while
  speed streaks show the catch-up strike.
- Special tiles (`rings`): `highground` +20% range, `shrine` +30% ult charge,
  `cursed` +30% atk / -20% aps.
  Visuals (`render.js`, built once, animated by transforms only): soft additive ground
  light about twice the tile size under the slot art (`layerSlotAuras`); gold motes, cyan
  mist or red wisps drifting above the heroes (`layerSlotAurasTop`, fainter when occupied);
  the hero on the tile gets an underglow plus a rim (rotating gold arcs, pulsing cyan
  double ring, flickering red ring). Reduced motion: static glow and rim, no drifting parts.
- Hero actions: upgrade Lv1-4 (costs 80/120/160; Lv3 focus, Lv4 class path such as
  Mage wildfire/frost/arc), awakening, training, target mode, sell (50% refund).
  Focus and training offer attack or health only: range is never upgraded in battle (owner,
  October 1, 2026; `docs/tower-defense-board-plan.md`).
  The training picker shows each option's real relative gain ("+6.9% this time")
  instead of the base rate, because training adds a fixed share of base per buy —
  the relative gain shrinks as trainings pile up while the cost grows ×1.3
  (mechanics overview recommendation 7). Measured on Normal (12 seeds, 5 squads,
  3 maps): a winning run buys 0-2 trainings and ~1 awakening, so the sink is
  tight, not over-generous.
  No player rotation (M24): `sim.faceTarget()` turns a hero to its current target every
  step and to the ultimate's primary target at cast, so cones (cleave, knockback, petrify)
  and spreads (volley, moon barrage) centre on that target. `rotation` remains as internal
  combat/effect state; no facing tick is drawn.
- Hero panel (`page/popover.ts`): in campaign stages the title shows the hero's stars and
  Evolution badge (`campaignStars`, `campaignEvolution` from `collectionHeroes`) under the class line.
- Hero panel (`page/popover.ts`): Details is an accordion that starts collapsed on every hero
  selection (it also carries the "battle ranks reset" note). The upgrade flow lives in the
  pinned footer: a one-line preview of the next upgrade sits above Upgrade/Sell, and the rank III
  focus, rank IV path and training picks open there too, with the Upgrade button turning into a
  quiet Cancel while a pick is open.
  Side: portrait stages get a sheet below the map. Otherwise the panel pushes the map aside
  when the map keeps 520px, else overlays it. On desktop (fine pointer) it always sits on the
  right and pushes when it would cover the hero; only touch landscape docks on the side away
  from the hero. The Upgrade button sits in the pinned footer (2/3 width) beside Sell (1/3),
  so it never scrolls out of view on short screens; focus and path choices still open in the
  scrolling body and get scrolled into view by focus.
- Boss warnings (`page/hud.ts`): "Face <boss>" on the start button and "<boss> has entered"
  follow the run's wave table (a wave with a `boss` spawn), so campaign stages with the boss
  on wave 8 or 11 warn on the right wave. The mode rule (`isBossWave`) only covers endless
  waves not generated yet.
- Statuses: wet, burn, poison, chill, with reactions `conduct`, `steam`, `blight`,
  `freeze`, `harvest`.
- Exposed (`enemy.exposed`, end time): +20% damage taken in `hit()`. Set by Ymir
  `expose`, the 72px cleave with 8s awakened exposure, and recruit Elm `weaken_burst`; reapplying
  keeps the later end time (`Math.max`), so a short exposure never cuts a longer one.
- Boreas `ice_shockwave` (tuning `heroSkills.boreas`): shockwave around him within `hero.range`,
  140% U per enemy, 10% chance per enemy (seeded `rng`) to freeze 2s (`stunnedUntil` +
  `frozenUntil`, so Shattering Cold applies). Awakened: +10% chance, +1s. Replaces the old
  `weaken_burst` binding; no exposure. FX: the blast rings are true circles (`squash: 1`) centred on
  the hero, matching his range circle.
- Gaia `rooted_sanctuary` (tuning `heroSkills.gaia`): heals allies in her range for 30% of
  her own max health (Support class blessings raise it) and wards them for 8s: `damageHero`
  cuts damage taken by `wardCut` (30%) while `wardUntil` runs; overlapping wards keep the
  stronger cut and the later end. Awakened: 50% heal, 40% cut.
- Atalanta `burning_volley` (tuning `heroSkills.atalanta`): every enemy within 80px of the
  target takes 60% U (150% attack) and burns for 50% of the hit dealt over 5s (`applyBurn`,
  so Steam/Blight reactions apply). Awakened: rapid fire for 10s (`hero.rapid`,
  `rapidUntil`; `rapidFx()`): +50% attack speed and +30% attack. Replaces `piercing_shot`
  (kept for recruit Hollis). Class matrix: healer/platform has 3% tolerance because she
  clears the small healer pack alone.
- Synergy: each `synergies` tag shared by 2+ deployed heroes within 250px gives `+8%`
  atk, capped at `+24%`.

### 6. Enemies, bosses, waves

- Enemy kinds: `grunt`, `runner`, `flyer`, `archer`, `brute`, `brood`, `mender`,
  `shieldbearer`, `broodcaller`, `imp`, `hexer`, plus `boss`. Stats in `tuning.enemies`.
- Enemy archers (`archer`): stop at `attackRange` 110 and shoot for `holdSeconds` 8, then
  close in to melee (road contact only). While shooting, the nearest road hero in reach
  comes first; with none, `targetsPlatforms` lets them shoot the nearest living platform
  hero in range for `platformAttack` 0.5 of their attack (`sim.findEnemyTarget`). The
  target gets `aimedAt`, drawn as amber corner brackets (`render.js`); the first archer
  wave of a run says so in a notice (`page/hud.ts`). Other enemies never hit platform
  heroes directly (Baphomet's mark and Hexers still affect them).
- Bosses: `baphomet` (mark, stance) and `lilith` (summons brood, enrages below 50%).
  Each map names its boss.
- The boss comes last (October 1, 2026): `startWave` moves boss entries to the end of the
  spawn queue, and `step` spawns one only when no regular enemy is left on the field (killed or
  leaked; a boss's own children do not count, `fieldHasMinions`). Applies to every mode.
- TD-original bosses, prepared but on no map yet (September 29, 2026): `lerna` (Lerna, the
  Root-Maw, three-headed root hydra), `kraghorn` (Kraghorn, the Broken Tusk, stone-plated boar)
  and `vorruk` (Vorruk, the Hollow Hunger, segmented worm). Art and concept notes in
  `artifacts/td-bosses-v1/`; names in `src/data/tdBosses.json` (kept apart from the database's
  `bosses.json`); stills `boss-<id>-v1.webp` built and on R2; PixelLab clips packed as
  `boss-<id>` sheets. No special rules yet: without `tuning.bosses[id]` they fight as the plain
  boss (a simulated Moonlit Pass run with `kraghorn` wins normally).
- Ochenta, the Proud Commander (October 1, 2026): final boss of Heart Temple (`jungle-heart-temple`, stage 3-6 and Free Play). Armored
  wolf warlord with a banner spear and a raven (owner-supplied source `boss_ochenta.png`).
  Still `boss-ochenta-v1.webp`, PixelLab sheet `clips/boss-ochenta-v1` (spear thrust attack).
  Rules in `tuning.bosses.ochenta` (`sim.bossOnHit`, `eightyCount`, `resistCc`, `bossBoost`):
  stats 8800 HP, speed 18, armor 180, magic res 80, attack 80 / 1.2s, 3 lives, 80 gold.
  `valor`: every direct hit (not damage over time) adds 1 Valor; at 80 a shockwave stuns
  heroes within 80px for 2s (hexed, Veil protects), then for 4s +80% speed and 80% crowd-control
  resistance (stun, freeze, petrify, slow and chill timers run out 5x as fast); Valor resets.
  `resolve` (Spanish Resolve): at 80/60/40/20% health a permanent step of +8% attack, +8%
  attack speed, -4% damage taken. `finalEight`: the first drop below 8% starts 8s in which he
  cannot fall below 1 HP and has +80% attack, +80% attack speed, +40% speed. Renderer: gold
  Valor bar under the health bar, gold ring during the rush, red ring during The Final Eight;
  notices in `page/session.ts`; glossary text `BOSS_RULES.ochenta`. Step values are first
  guesses, not playtested.
- Adding a boss to a level:
  1. Art: still `boss-<id>-vN.webp` on R2 (`build-td-enemy-sprites.mjs`, `FILES` maps
     `boss_<id>.png`), animation sheet `clips/boss-<id>-vN`, named after the still (`build-td-enemy-anims.mjs --release`, `ENEMY_SHEETS`).
  2. Name: `tdBosses.json` for TD-original bosses (`bosses.json` only for database bosses).
  3. Placement, either
     - one campaign stage: `"boss": "<id>"` on the stage in `tdCampaign.json`. It replaces that
       stage's map boss only (`stageMap` in `page/campaign.ts` starts the session on a copy of
       the map with the stage's boss; drawer, HUD, notices, renderer and glossary follow), or
     - a whole battlefield: `"boss": "<id>"` on the map in `tdMaps.json` (Free Play, Daily,
       Expedition and every campaign stage on that map without its own `boss`).
     `test-td-campaign.mjs` checks that every stage boss is in `bosses.json` or `tdBosses.json`.
  4. Rules (optional): `tuning.bosses[id]` plus sim code for new mechanics, `stats.hp`, the rules
     sentence in `skills.js`, the glossary text. Sprite size: `bossSpriteSize` in `render.js`
     (default 96 px, Lilith 108).
  5. Checks: `npm run test:tower-defense`, `npm run td:sweep`, a look in the browser.
- Enemy art: full-body sprites from R2 `td/enemies/sprites/` (`render.js`), loaded with
  the `?v=cors1` cache bust like hero thumbs. The same files appear in plain `<img>`
  tags (lobby, boss plate, glossary), and a cached non-CORS copy would make WebGL reject
  the texture and drop the enemy to the 8x8 Kenney tile fallback. Versions live in
  `ENEMY_SPRITE_VERSIONS` (`assets.js`); since September 29, 2026: archer v3, brute v3,
  brood v4, Baphomet `boss-v2`, Lilith `boss-lilith-v4` (redrawn complete, feet included,
  uploaded to R2). Superseded files (older sprite versions, the `td/enemies/*.png` portraits) were
  deleted from R2 after the deploy of commit 37654230 (the first sheet release, `td/enemies/sheets/*-v1`,
  was deleted after `clips/` went live on September 30, 2026); `brood-v1` and `boss-lilith-v1` stay for
  the broodcaller and hexer.
- Procedural enemy motion (on with the enemy animation below, skipped with reduced
  motion): `animateEnemy` in `render.js` moves the full-body sprites procedurally, render
  only and on game time. Distance moved drives a walk cycle (bounce, waddle, lean,
  squash); a jump in `attackClock` plays a swing (wind-up, then a lunge toward `heldBy`,
  or a recoil for ranged shots); an hp drop above 1.5% of max hp (DoT ticks excluded)
  flashes an additive copy of the sprite and shakes it; flyers get a wingbeat; dying
  enemies topple backwards over 0.5 s. Petrified or frozen enemies hold still. With motion
  on, the facing only turns on clearly sideways steps; without it, it flips on any
  horizontal change. `pointOnPath` rounds lane corners (quadratic curve, radius 24 px,
  capped at half the adjacent segments) and blends the `sway` normal across the turn, so
  enemies arc around corners instead of popping sideways. History and the art workflow:
  `docs/tower-defense-ui-plan.md` (M7); frame format: `src/game/td/sprite-spec-for-ai.md`.
- Enemy animation (M7, on by default since September 29, 2026; off with reduced motion or
  `?anim=off`): every full-body enemy moves (`animateEnemy`), and kinds with an animation sheet
  play clips instead of the still. Sheets: `enemies/clips/{file}-{version}.json` + `.webp` on R2,
  named after the still they animate (`clips/brood-v4` animates `sprites/brood-v4`), listed in
  `ENEMY_SHEETS` (`enemySheetUrl(file, version)` in `assets.js`), built with
  `scripts/build-td-enemy-anims.mjs <clips> --set painted --release` into
  `public/td/enemies/clips/` and uploaded with `upload-to-r2.mjs --prefix td/enemies/clips`.
  A new still version needs new clips; a remade sheet for the same still gets a suffix
  (`brood-v4b`) because R2 caches a year. Sheets (October 1, 2026): grunt-v2, runner-v2,
  flyer-v2, archer-v3, brute-v3, brood-v4, boss-v2 (Baphomet), boss-lilith-v4, boss-lerna-v1,
  boss-kraghorn-v1, boss-vorruk-v1, boss-ochenta-v1, plus brood-v1 (broodcaller) and boss-lilith-v1 (hexer),
  the older stills those two keep on purpose (about 70-170 KB each). A sheet is a Pixi
  spritesheet plus a `td` block (feet anchor, idle body size, fps, `pixelArt`). The boss loads
  the map's boss sheet; ENEMY_ART kinds load the sheet of exactly the still they borrow
  (mender -> archer-v3, shieldbearer -> grunt-v2, imp -> runner-v2, broodcaller -> brood-v1,
  hexer -> boss-lilith-v1; tint and rim glow apply). `?sheets=off` shows stills
  with procedural motion; `?sheets=local&set=<name>` loads an unreleased set from
  `public/td-local/sheets/` in dev. `animateEnemy` picks the frame on game time: attack after
  an `attackClock` jump, hurt after a real hit, walk from distance moved, idle otherwise; dying
  plays `death` and fades. Flyers stay at `FLYER_LIFT` with the bob and drop while dying.
- Clip sources (`scripts/td-warp-anim.py`, numpy + Pillow, local only as `*.py` is gitignored;
  outputs in `~/hero-database-assets/td/warp-anims/<kind>/`):
  - `--pixellab` (archer, grunt, runner, brute, brood, Baphomet as `boss`, Lilith as `lilith`
    packed to `boss-lilith`): PixelLab PixMiniMax image-to-animation
    via the API (`POST /v2/animate-pixminimax`, Tier 1: max 8 concurrent jobs, about 1
    generation per clip). First frame = the kind's complete still (feet included). Looping clips
    (walk 8, idle 4, attack 8) and hurt (4) also send `last_frame` = the same still, which the web
    UI does not offer, so they end in the start pose; death (8) runs open. Raw frames:
    `~/hero-database-assets/td/enemy-sprites-src/pixellab-<kind>/<clip>/NN.png` (00 is the
    unchanged input). Every clip drops frame 0: generated frames are slightly redrawn, so the
    untouched input would pop once per loop; loops still close on their generated start pose.
    Frames scaled so the first walk frame's larger side is 90 px.
  - `STRIPS` (flyer): a 6-frame flight cycle generated from text on black
    (`enemy-sprites-src/flyerSpriteFlying.png`). Only dark pixels connected to the border are
    background (flood fill), so dark feathers stay opaque; the rim gets a soft brightness key.
    Frames align on the beak tip; hurt (flash, jolt) and death (tumbling spin) derive from the
    flap frames. `derive: "walker"` does the same for a walk strip (idle, lunge, hurt, death).
  - `RIGS` / `--warp` (fallback): warp frames from one still (weapon arm as a rigid layer,
    legs as pendulums). Superseded by PixelLab clips.
- Tried and dropped (September 29, 2026): Meshy 3D renders, a free pixel-art pack, a
  generated grunt walk strip and a first PixelLab grunt without a pinned last frame (view
  drifted, no loop). Test sets, their code paths and files were removed.
- Base waves (`tdWaves.json`): 1-2 grunt, 3 +runner, 4 flyer, 5 brute/mender/runner,
  6 shieldbearer/archer, 7 runner/hexer/brute, 8 flyer/broodcaller/archer,
  9 brute/mender/shieldbearer/runner, 10 boss + escort.
- Run lengths (`waves.js`): `classic` 10 waves (boss on 10), `long` 20, `endless`.
  Long and endless reuse waves 1-10 plus a mid-boss on 5, then generate waves with a
  boss every 5 (`waveGen`). Free-play run cards show only glyph, name, best and Play;
  the description lives in the card's `title` tooltip.
- Tiers: Normal, Heroic (enemy hp x2, attack x1.3, Favor x1.3), Mythic (x3.2, x1.6,
  x1.6). Global `difficulty.enemyHp` 3.75 applies on top.
- Mutators: every 10 waves pick 1 of 3 (fortified, haste, warded, horde, ironclad,
  elites), each raising Favor.

### 7. Maps (`tdMaps.json`)

Every battlefield is a compact board (October 1, 2026, `docs/tower-defense-board-plan.md`
step 3, `scripts/migrate-td-boards.mjs`): 82 stage maps plus the dev-only `proto-board`, each
with a unique layout (`npm run td:board -- --check`; `npm run td:board -- --current` draws them
all). Ids, names, themes, art, music and bosses stayed as they were.

| Group | Board | Gates |
|---|---|---|
| Chapter 1 stages 1-1 to 1-9 | 8 x 4 cells (118 px) | 1; 2 on 1-7 and 1-9 |
| Chapter finales (1-10, 2-6, ... 13-6) | 10 x 5 cells (94 px) | 2 |
| Every other stage | 9 x 5 cells (104 px) | 1; 2 on stage 3 of chapters 2-13 |

Stages 1-5, 1-9 and 1-10 used to share a map with 1-1, 1-7 and 1-2; they now have their own
maps (`moonlit-horned-gate`, `sunscar-eve`, `verdant-last-crossing`). Free Play battlefields
(not `campaignOnly`): `moonlit-pass`, `verdant-crossing`, `sunscar-ruins`, `sunscar-basin` and
the six `jungle-*` maps; each carries its own `enemyHp` for open modes (0.5 Heart Temple to
1.25 Verdant Crossing), set so bot squads win about 7-9 of 12 runs. The pre-board versions of
the first four live on as a test fixture (`scripts/fixtures/td-classic-maps.json`) for rule
tests that need the range-circle geometry.

Each map: `theme`, `art`, `music`, `path` or `lanes`, `base`, generated `roadSlots`,
`platformSlots`, `rings`, `grid`. Asset assignments: [map.md](map.md).

Board map generator `board-v1` (`src/game/td/map-generator-board.js`, `npm run td:board`): boards
of 8 x 4, 9 x 5 or 10 x 5 cells, one or two gates with equal lanes merging before the base, a
one-cell road, platform blocks next to the road, high ground, cursed and shrine tiles, and a
uniqueness rule (`layoutConflict`: no identical or mirrored cells, at most 70% shared road per
board size), checked over `tdMaps.json` by `test-td-map-generator.mjs`. Board special tiles are
authored as `grid.board.rings` (`{ type, cell, kind }`); `validateMap` asks boards for at least 6
road and 8 platform tiles. Details: `docs/tower-defense-board-plan.md` step 2.

Compact board prototype (October 1, 2026; `src/game/td/board.js`, plan and measurements in
[TOWER_DEFENSE_GAMEPLAY_IDEAS.md](TOWER_DEFENSE_GAMEPLAY_IDEAS.md) section F). A map with
`grid.board` (`cell`, `cols`, `rows`, `origin`, `road` and `platforms` as cell lists) gets one
tile per listed cell (`buildGrid`); the road and tiles are drawn at the cell size, and taps
pick the cell under the pointer (`nearestSlot`). The rules apply to
every board map: `tuning.board` holds the shared rules, a map's own `rules` override single
values (`boardRules()` in `board.js`, `sim.boardRules`): `waveShape` (fewer, stronger enemies;
flyers via `kinds`), `focus` (Mage focus rule), `patterns` (class -> named pattern from
`PATTERNS`: `plus`, `block`, `blockPlus`, `diamond2`, `star3`, `cross3`, `cross4`, `diamond3`,
`block2`), and `heroScale` / `enemyScale`
(unit size on boards: hero and enemy containers scale as a whole, enemy health bars follow).
Reach steps (`steppedPattern`, `sim.patternAt`): high ground moves a hero one step up its
class ladder (Mage `diamond2` -> `star3`, Archer `cross3` -> `cross4`, Tank `plus` -> `block`,
...), Stormpeak's headwinds move platform heroes one step down unless they stand on high ground,
and stars add permanent steps (`heroStars.reachSteps`: +1 at 3 stars, +2 at 5; campaign only,
shown on the Stars tab). On a board a hero's `range` is the radius of the circle with its
pattern's area (`patternRadius`), so ultimate areas and scaled reaches fit the board; heals,
auras and ultimates that check "in range" use the pattern cells (`sim.inReach`).
The recruit card and the hero panel show the pattern as a small grid labelled "Reach"
(`patternSvg`). Test bots rank board tiles by the route cells their pattern covers
(`rankedTiles(map, type, range, pattern)`). With patterns a hero's basic attack reaches the enemies inside its pattern
cells (`sim.reaches`); ultimates, auras, heals and Assassin dashes keep their range circles.
Selecting or placing a hero highlights its cells in green instead of the range ring. A shaped
group sends at least one enemy per gate, splitting the group's strength between them
(`sim.shapedGroup`); the wave preview shows the shaped counts. `prototype: true` maps are
campaign-only and appear in the Free Play map select in dev builds only (`TdLobby`). The live
tuning has no `waveShape` and no Mage `focus`, so every other map plays as before.

`campaignOnly: true` keeps a map out of Free Play (map select, help text), the Daily Trial
pool and the Expedition pool; campaign stages still use it by `mapId`. Campaign layout (September
29, 2026): intro, boss and two-gate stages keep their authored maps (1-1, 1-2, 1-5, 1-7, 1-9, 1-10,
2-1); the other regular stages each get their own lattice-v2 route on their chapter's theme, picked
from 120 seeds per theme for a length close to the map they replace, high tower coverage and
varied gate edges and base rows. Chapter 2's finale 2-6 has the chapter's two-gate map. `hpScale`
was retuned so every stage keeps its win curve (bot squads out of 35, target -> result): 1-4
31 -> 32 at 0.68, 1-6 23 -> 23 at 0.72, 1-8 17 -> 17 at 0.8, 2-2 27 -> 27 at 0.88, 2-3 27 -> 25 at
0.74, 2-4 28 -> 28 at 0.8, 2-5 16 -> 17 at 0.66, 2-6 15 -> 15 at 0.46; 1-3 stays at 0.9 (27/28).
Maps are two layers: a theme (background art, gate/base sprites, `exclude` rectangles for painted
props) and a generated path on top; map-scene.js draws the road, so any theme takes any route.
`orthogonal-v1` only makes left-to-right single lanes (4 or 6-8 turns). `lattice-v2`
(`src/game/td/map-generator-v2.js`, September 29, 2026) is the path layer for new maps: 60 px
lattice (15 x 7), gates on the left, top or bottom edge, base anywhere in the right third,
self-avoiding walks in straight runs of at least two nodes with one empty node to every earlier
part (parallel roads >= 120 px apart), legs in all directions, and a breadth-first reachability
check before every step (no dead ends). `two-gate` builds the shared tail from a junction to the
base first, then two branches of exactly equal node count out to two gates, so both lanes are
equally long and end in the same segment. CLI: `node scripts/generate-td-map.mjs --gen=lattice-v2
--skin=sunscar [--gates=2] --gallery=24` writes a candidate sheet to `public/td-local/`
(gitignored); `--seed=N --id=... --name=... --publish` publishes one. `--check` regenerates both
generators' maps. Plan: one level per chapter with two gates, the rest one. Route previews (map select, stage drawer) draw a dark casing under a gold core so
the road reads on bright sand.

Optional `enemyHp` scales enemy health on that map in open modes (Free play, Daily Trial,
Endless). Verdant Crossing uses 1.25 (September 28, 2026) because it was the easiest map for
every squad. Modes with their own stage scale (`hpScale` from Campaign stages or Expedition)
replace the map value, so tuned stages keep their numbers.

#### Map geometry, analysis and validation

The runtime map contract is data-driven and remains the downstream contract for authored
and generated maps:

- The battlefield is 960×540 logical pixels.
- A single-entry map uses `spawn` plus `path`.
- A multi-entry map uses `lanes: [{ spawn, path }, ...]` and one `base`.
- Every path begins exactly at its visible gate and ends exactly at the visible base.
- Multi-entry routes have equal travel length and an identical shared final segment.
- Initial generated routes use integer, horizontal and vertical segments.
- `grid.js` derives road slots, platform slots and special rings. Do not hand-edit the
  derived arrays; run `node scripts/build-td-grid.mjs` after route or grid changes.

The map foundation added September 29, 2026 consists of:

- `map-analysis.js`: deterministic route length, lane, turn, placement, range coverage,
  blocker-support and landmark metrics through `analyzeMap(map)`.
- `map-validation.js`: stable rejection codes for invalid points, diagonal or short
  segments, self-intersections, endpoint mismatches, unequal lanes, missing shared tails,
  stale grids and insufficient slot counts through `validateMap(map)`.
- `scripts/report-td-maps.mjs`: `npm run td:maps` prints the current geometry baseline and
  validation status; `npm run td:maps -- --json` includes the detailed metrics and errors.
- `map-preview.js`: `mapPreviewModel(map)` resolves terrain, route strokes, gates, base,
  `skinId` and optional `geometryHash` from the same materialized map used by combat.

Current baseline:

| Map | Route length | Turns | Platform coverage at range 90 | Landmark | Valid |
|---|---:|---:|---:|---|---|
| Moonlit Pass | 1,574 | 6 | 74% | `switchback` | yes |
| Verdant Crossing | 2,292 | 4 | 97% | `open-road` | yes |
| Sunscar Ruins | 1,180 per lane | 12 total | 99% | `twin-gate` | yes |
| Sunscar Basin (generated) | 1,672 | 8 | 81% | `defense-basin` | yes |

These values describe the existing maps; they are baselines for generation, not automatic
balance targets.

#### Map preview contract

Every preview pane must consume the same resolved map record as combat. Terrain comes from
the resolved skin; routes, entrances and base come from the resolved layout. Changing the
selected map changes terrain, routes, every gate, base, name and boss together.

Free Play map selection and the Campaign stage drawer use `mapPreviewModel(map)` and draw
the terrain, route strokes, gates and base as lightweight SVG. Do not maintain separate
route thumbnails or screenshots. Expedition currently shows terrain-only compact stops and
Daily shows the battlefield name; review those surfaces before calling preview integration
complete. A future preview cache key must contain `geometryHash`, `skinId` and a preview
renderer version.

#### Map generator `orthogonal-v1` (September 29, 2026)

`src/game/td/map-generator.js` `generateMap(recipe, identity)`: one deterministic,
single-lane, self-avoiding orthogonal route, published as an ordinary `tdMaps.json`
record. Development-time only; the game never generates at runtime.

- Recipe: `{ generator: "orthogonal-v1", ruleset: 1, seed, topology: "single-lane",
  difficultyBand, parameters: { turns, length, coverageGap }, constraints: { exclude } }`.
  `exclude` rects are the skin's safe regions (painted edge props); the road band keeps
  out of them and they become `grid.exclude`.
- Ruleset 1: gate at x 48, sanctuary at x 880, both on rows 120-420; corners on a 30 px
  lattice anchored at the gate inside [150, 110, 800, 450]; inner legs 150-480 px; any two
  non-adjacent legs at least 150 px apart (room for a platform row between); even turn
  counts (leave and enter horizontally); at most 400 attempts with rejection counts
  (`WALK_STUCK`, `NO_BASE_CONNECTION`, `TURNS_OUT_OF_RANGE`, `LENGTH_OUT_OF_RANGE`,
  `COVERAGE_GAP_OUT_OF_RANGE`, `RECIPE_INVALID`, plus `validateMap` codes).
- Special tiles come from geometry, not the RNG: Shrine on the road tile nearest the route
  middle, High Ground on the platform seeing the most route at range 160, Cursed on the
  strongest of the next platforms closest to the sanctuary.
- Published records keep `recipe` and `geometryHash` (FNV-1a over endpoints, route, grid,
  slots and rings). `node scripts/generate-td-map.mjs --check` regenerates every
  published generated map from its recipe and fails on any difference; the test
  `scripts/test-td-map-generator.mjs` (in `test:tower-defense`) checks determinism,
  validity, lattice, exclusions, bounded failure and provenance.
- CLI: `npm run td:generate-map -- --seed=N --skin=sunscar|moonlit|verdant` prints a
  candidate; add `--id=... --name="..." --publish` to write it. Skin presets (theme, art,
  music, boss, safe regions) live in the script; only the Sunscar regions were checked
  against the painting so far.
- First published map: `sunscar-basin` (seed 3, turns 6-8, length 1600-2200, coverage gap
  3-20%), Chapter 2's battlefield. Free Play 20 waves 4/5 wins, in line with the others.
- Free Play map select shows four battlefields in one row in the menu frame.

#### Map authoring workflow today

Hand-authored maps still work as before. To add one:

1. Add its complete runtime record to `tdMaps.json`: identity, scene art, boss, music,
   spawn/base and `path` or `lanes`, plus the `grid` settings.
2. Run `node scripts/build-td-grid.mjs` to derive placements and rings.
3. Run `npm run td:maps` and require `valid: yes`.
4. Use `npm run td:maps -- --json` to inspect detailed coverage and lane metrics.
5. Assign the stable map id to Campaign stages through `stage.mapId` where required.
6. Inspect Free Play and Campaign previews and then the loaded battle.
7. Run `npm run test:tower-defense` and `npm run test:td-balance` for gameplay changes.

#### Planned layout generator and catalogs

The approved direction is a deterministic development-time map compiler. It generates many
candidates, validates and simulates them, and publishes approved candidates as ordinary
stable `tdMaps.json` records. Campaign does not generate an unknown layout when a battle
starts. Live seeded generation is deferred until validation and difficulty fingerprints
predict real outcomes reliably.

The intended source responsibilities are:

```text
tdMapLayouts.json     fixed geometry and deterministic recipes
tdMapSkins.json       art, safe regions, endpoint support and capabilities
tdWaveProfiles.json   reusable enemy and wave compositions
tdCampaign.json       stages, progression bands, rewards and overrides
          |
          v
compiled tdMaps.json + resolved Campaign data
```

A layout owns geometry, a recipe, topology, grid rules, geometry hash, analysis fingerprint
and landmark. A skin owns terrain, road, gate, base, palette, safe regions and supported
topologies. In the first implementation, changing a skin does not change gameplay geometry.

Campaign progression uses non-overlapping hero-level bands: 1–10, 11–20, 21–30, 31–40
and later bands as needed. A band supplies defaults such as layout pool, skin pool, wave
profile, lives and health scale. A published stage stores stable layout and skin ids and may
override any band default. Tutorial stages and boss encounters remain explicitly authored.

The next bounded milestone is `orthogonal-v1`:

1. Accept a versioned recipe with generator id, ruleset, seed, topology, difficulty band
   and parameter ranges.
2. Generate one deterministic single-entry, self-avoiding route on an integer lattice.
3. Use a fixed attempt bound and report stable rejection reasons.
4. Run `buildGrid()`, `validateMap()` and `analyzeMap()` on each candidate.
5. Create a canonical hash over endpoints, route, grid, placements and rings.
6. Return a complete runtime-compatible map record with recipe provenance.
7. Prove that repeated generation produces byte-equivalent geometry and placements.
8. Publish one reviewed candidate into Free Play and verify that its preview and battle
   display the same terrain, route, gate and base.

After that: batch generation and a development atlas; layout/skin catalogs and compiler;
bot difficulty fingerprints; a reviewed three-to-six-map pack; Campaign bands and reusable
wave profiles; Daily/Expedition integration; equal-length split-and-merge generation; and
only then optional live seeded generation.

### 8. Game modes

| Mode | Rules | Source |
|---|---|---|
| Free play | Any map, run length and tier. Starting gold 340, 25 lives, deploy cap 7, wave-clear bonus 100 + 20/wave. Recruits only owned heroes, at base stats (Phase 2, September 30, 2026); pays Favor plus Gold and Hero XP into the collection | `sim.js`, `waves.js` |
| Campaign | Chapter 2 "The Sunscar March" (September 29, 2026): 6 stages, all on the generated Sunscar Basin, unlocked by 1-10; 39 waves, lives 15-18, hpScale 0.75 down to 0.6; Stheno on 2-3, Helios on the 2-6 boss finale; rating milestones 6 / 12 / 18 (600 Gold + 300 Hero XP / 110 Divine Seals / 180 Divine Seals + 60 Seal Dust). Bots (35 squads, after Chapter 1 at Lv 4-7): 86 / 80 / 69 / 69 / 43 / 40% (cheapest), 89 / 77 / 66 / 54 / 34 / 34% (carry); winning runs about 26 min. Chapter 1 "The Road to the Crossing", 10 authored stages across all 3 maps (59 waves total; trimmed from 79 on September 29, 2026 so a chapter clear lands near the 30-60 min target; hpScale re-tightened on 1-1..1-4 and 1-9/1-10 to 1.0/1.1/1.05/1.05/0.6/0.7 on September 30, 2026 after the owner's playtest read too easy at squad size 6). Play on the home screen (Campaign selected) opens the stage list. Squad of up to 6 owned heroes (raised 5 → 6 on September 29, 2026 for Tank viability), 6 starters, stage lives and hp scale, first-clear rewards (repeat pays 25%). Hero levels 1-60 bought with Gold + Hero XP, capped by stars (0-5 stars: cap 10/20/30/40/50/60), stat gain per level falls by band (+6/3/2/1.5/1.5/1%); Stars 0-5 and Evolution I-V from spare copies (campaign stages only) | `campaign.js`, `tdCampaign.json` |
| Summon | Banner "Ember at the Crossing", 60 Divine Seals per summon, x1 or x10 (600), duplicates become spare copies, 14-day featured rotation, featured hero weighted 2x | `campaign.js`, `tdSummon.json` |
| Expedition | Roguelite chain of 10-wave stages on `EXPEDITION.stages` (3) distinct battlefields drawn at random, one `stageHp` step per stage; starts with 3 random owned heroes, camp offers hero (owned, not yet in the roster) / relic / veteran after each win, lives carry over; each stage pays Gold and Hero XP into the collection | `expedition.js` |
| Daily Trial | One UTC-day seed: map, allowed heroes, 2 mutators, goal wave. Endless, Normal, no blessings or boosts | `daily.js` |
| Challenges | Optional per-map, per-length goals checked on a won 10/20-wave run; one-time Favor reward | `challenges.js` |

Restricted rosters (Campaign squad, Daily, Expedition) also cap `deployCap()`; Free Play's
owned list (`allowedHeroes`) restricts who can be recruited.

#### One hero collection (Phase 2, September 30, 2026)

Heroes are owned and upgraded through the campaign (save key `campaign`), and every mode
except the Daily Trial uses the owned heroes (`ownedHeroes()` in `campaign.js`). Free Play
passes them as `allowedHeroes`; the recruit sheet lists only those and says so when a tile
type has none. Expedition draws its starting roster and camp recruits from them (the page
passes the owned heroes as the pool). Upgrades (levels, Stars, Evolution, skills;
`collectionHeroes()`, formerly `campaignHeroes()`) still apply in Campaign stages only, and
Divine Blessings still apply in Free Play and Expedition only. Free Play runs and Expedition
stages pay `collectionRewards` from `tdCampaign.json` (10 Gold + 5 Hero XP per cleared wave,
up to 30 waves a run, never Divine Seals; `collectionReward()`); the result screen shows it
under "For your heroes". Existing saves keep their Expedition in progress and get no
migration gift. Balance: `test:td-balance` requires the six starters to win at least one
Free Play battlefield at Normal; measured at seed 99 (cheapest / carry): Moonlit Pass
L10 / W19, Verdant Crossing L8 / W2, Sunscar Ruins W5 / W17, Sunscar Basin W19 / W25.
`npm run td:sweep -- --owned=starters` adds the starter deck to the sweep. Plan and open
follow-ups: `docs/tower-defense-home-camp-plan.md` (Phase 2).

#### Campaign navigation and screens

Campaign has no hub screen of its own (removed with the War Camp home, September 30,
2026): Play with Campaign selected opens the stage list, and Heroes and Summon sit on the
home dock.

1. (Removed: the Campaign headquarters screen. Old history entries that name it open home.)
2. **Campaign stages** opens from the home screen's Play (Campaign selected), on the
   chapter of the next stage; Back goes home. It owns the stage row (in the menu frame: one row of full-height cards, five in view at the earlier width, swiped sideways for more; it scrolls to the next stage on open; the rating track sits compact on one line below), then chapter tabs below it
   (authored chapters, then locked "Coming soon" tabs up to 3). Stage state reads at a glance:
   cleared cards fade back (translucent, desaturated art) with a green check badge and green
   status, the next stage is bright with a gold play badge and glow, locked ones go grey with
   a lock. No route rail here (the cards already show progress). Tapping an unlocked stage
   card opens a details drawer from the right (modal dialog: stage id and name, the
   battlefield map preview (terrain, lane routes, spawn gates, base; same drawing as the map
   select), about text (2px below body size), a plain inline facts row without boxes
   (battlefield/waves/lives/boss/best), first-clear and replay rewards as currency chips,
   recommended Might plus the last squad's Might). Its "Choose squad" / "Replay stage" button is the
   transition into squad selection; Escape, the close button or the backdrop close it.
3. **Squad selection** remains between a stage and the run. Browser/app Back returns to
   Campaign stages; a finished or abandoned campaign run returns to Campaign stages
   (`exitPlay` maps a run started from squad to stages), and Back from there goes home.
   Layout (top to bottom), measured against a gacha team screen (owner, September 28,
   2026): no stage head and no Clear heroes / Quick pick buttons (the player saw the stage
   in the drawer one screen up). Roster: two rows of bare 50 x 75 art cards scrolling
   sideways, class icon top left, check top right when picked, "Lv N" in 11px over the
   card foot; name, class, role hint and skill are in the tooltip/label. Locked heroes
   trail dimmed with no foot text; their unlock source (stage or Summon) is in the tooltip.
   Lineup at the bottom, no panel: the 5 slots as 84 x 84 cards centered (enlarged from 50 once the footer left) (class icon top
   right, battle gold cost under each; tap or drag out to remove), then one 11px hint line:
   "Drag a hero onto a slot to swap, or tap a slot to free it." (or the flyer warning when
   the stage has flyers and the squad no Mage/Archer). No coverage line or deploy-cap note.
   No screen footer: Might and Start sit in the lineup row, right-aligned, Might (crossed
   swords icon + value, 12px, green at/above recommended, gold below; "Squad Might X /
   recommended Y" in its tooltip and label) above a plain "Start" button (disabled until one
   hero is picked). No squad count text; the slots show it.
   The whole screen fits the menu frame (844 x 390) without vertical scroll. Roster top,
   slots bottom is fixed: do not move the lineup into a side column. Role hints and skill names live in tile tooltips and on the Heroes screen.
   Campaign squads field 6 heroes (Free Play deploys 7). Squad size was raised
   4 → 5 on September 28, 2026 after a sweep showed 4 read as punishment (late-stage
   win rates 34-54% at 4, 49-81% at 5), and 5 → 6 on September 29, 2026 to make Tanks
   viable: measured at size 5 Tank squads won 64% vs 93% without (the Tank replaced a
   damage dealer); at size 6 they win 80% vs 94% (`td-tank-slot.mjs`).
   Class icons across the whole TD UI are `classGlyph()` (assets.js; `classIconImg()`
   delegates to it): simplified solid SVGs readable at small sizes (shield, sword, crossed
   daggers, star, bow, cross), currentColor. Squad/popover badges sit on a class-tinted
   disc. The main site's hero pages keep the game's webp class icons.
   Drag and drop (pointer events, mouse + touch): tile -> slot places or replaces, slot ->
   slot swaps, slot dropped outside the lineup removes. Tap still toggles. On touch a
   roster tile drags only on a mostly vertical pull, so sideways swipes keep scrolling.

Heroes and Summon open from the home screen's dock (Back returns home); the Phase 2 plan in
`docs/tower-defense-home-camp-plan.md` makes the collection count in every mode.

The **Heroes** screen follows the Watcher of Realms hero view: four columns inside the menu
frame. Left, a narrow (176px) scrollable three-column roster of 4:5 portrait cards: a face
close-up fills the card (the full-body portrait scaled around the head; `FACE_FOCUS` in
`page/campaign.ts` shifts the crop for heroes whose head sits lower), class icon top left,
Evolution numeral badge top right (when evolved), "Lv. N" and the star row over a bottom fade.
No name or Might on the card: both are in its aria-label/tooltip and over the hero art. Locked
heroes are greyed with their unlock source ("Stage / 1-2" on two lines, or "Summon") in place
of the level. Owned heroes are sorted by Might (highest first), then locked heroes by class
with their unlock source; the strongest owned hero is selected by default. Centre, the
selected hero's art is the stage (cropped from the top), with name, class and placement role,
Might, stars, Evolution badge and spare copies over its bottom fade on every tab. Right of
the art, a 250px upgrade flyout holds the active tab and scrolls on its own; its upgrade
button stays pinned to the flyout bottom. The right edge is a vertical tab rail (icon over
label). Which modes campaign upgrades and Divine Blessings apply in is explained once in the
glossary (Heroes > Attributes: "Campaign upgrades", "Divine Blessings"), not on each hero. The four tabs:

- **Level**: "level / cap", pips for the current 10-level band, current and next-level Attack/Health, deploy cost, Level up (at the cap: "Star up to raise it to N").
- **Stars**: current stars, Attack/Health now and at the next star, material slots, the
  selected hero's duplicate copies to tap into them, Quick add and Star up.
- **Evolution**: the five tiers (done / next / locked) with their bonus, two material
  slots (a copy of this hero, 150 Seal Dust), Evolve, and "1 copy -> 30 Dust".
- **Skills**: ultimate and class passives, each upgraded separately (save v6).

The detail column scrolls inside its panel; an upgrade redraw on the same hero and tab keeps
the scroll position, so the button stays in place for repeat presses. A small red dot on a roster card's top-right corner means a
level-up is affordable or the hero has its own copy for Evolution. On narrow screens the
roster stacks above the detail panel while retaining its own scroll. On short landscape
screens (phones, height up to 540px) the screen fits the viewport so the page itself never
scrolls: the screen has no head (the app bar says "Heroes" and its wallet shows Gold, Hero XP and Seal Dust), the roster
narrows to 172px, the art column shrinks, the tabs run across the top of the copy, and the
whole copy column is one scroller. Skill upgrade buttons sit under their skill text so the
description gets the full column width.

#### Stage rating and chapter rewards (campaign only, M26 sprint 10)

- Every cleared stage has a rating of 0-3, shown only as laurel wreath icons (no
  player-facing name; internally "laurels"). 1 for a clear, 2 for keeping at least 50%
  of the stage's lives, 3 for at least 90% (`tdCampaign.json` `laurels.thresholds`,
  rounded up: 8 and 14 of 15 lives). Derived from the saved `bestLives`, so older saves
  are rated retroactively.
- Chapter milestones (`chapters[].milestones`): 10 / 20 / 30 rating points pay
  1,000 Gold + 500 Hero XP / 180 Divine Seals / 300 Divine Seals + 100 Seal Dust, once,
  automatically (`payMilestones` in `campaign.js`, on a stage win and on save load).
  Owner note (September 29, 2026): amounts may be a bit high, revisit later.
- UI: wreaths on stage cards, a "Goals" list in the stage drawer ("Keep 8 of 15 lives"),
  a chapter track under the stage grid (points x / 30, meter, milestone rewards marked
  "Received"), and result lines for a new best rating and paid chapter rewards.
- Save: campaign section version 8 adds `milestones: { [chapterId]: number[] }`.

#### Summoning rules and screen

`tdSummon.json` authors the banner, seal sources and dust rates. The current banner uses:

- rotation: `surtr` (Surtr), `nott` (Nott), `hephaestus` (Hephaestus), `hecate` (Hecate);
- one featured hero for 14 days, calculated from `rotationEpoch`;
- rarity weights (`rarityWeights`): every hero carries a `rarity` in
  `gameBalance.json` — legendary (tiers S/A, 5 heroes), epic (B/C, 13), common
  (D, 15, all recruits). A hero's draw weight is its rarity weight
  (legendary 6, epic 4, common 10); the featured hero's rarity weight is
  multiplied by `featuredWeight` 2;
- 60 Divine Seals per summon; x10 (`multiCount`) costs 600 and always gives 10;
- new-hero pity (`pityNewInMulti`, **active**): if a full x10 draws no hero
  the player does not own yet and the pool still has one, the last duplicate is
  replaced by a weighted draw from the unowned heroes. Single summons have no pity.
  Shipped as `false` at first (small 21-hero pool), enabled the same day after the
  rarity weights and the 33-hero pool landed: a 4,000-run simulation showed the
  pity barely touches the early game (≈7 new heroes in the first x10 either way)
  but fixes the collection tail — full collection median 46 x10 without vs 12 x10
  with pity, first legendary P90 improves 11 → 8 x10;
- pool `"all"`: every hero the player owns or can summon, drawn with replacement. A hero
  not owned yet joins; an owned one becomes a spare copy (`copies[heroId]`);
- stage-reward heroes are in the pool from the start; if one is summoned before its stage
  is cleared, that stage's hero reward becomes a spare copy. (`"locked"`, new heroes only,
  is still supported.)

The pool holds 33 heroes: the 21 mythic roster heroes plus 12 "recruits" (generic
tier-D filler heroes, 2 per class, `recruit-*` ids, reused abilities and ultimate
variants, generated placeholder art and reused class sounds — see
`TOWER_DEFENSE_FILLER_HEROES.md`). Recruits are never featured and sit below the
weakest mythic class member in power; they exist so x10 summons yield commons,
duplicates and dust.

A hero's draw chance is its weight over the pool's total weight — with the current
33-hero pool and an epic featured hero: featured 8/236 ≈ 3.4%, each legendary
6/236 ≈ 2.5% (any legendary ≈ 12.7%), each non-featured epic 4/236 ≈ 1.7%
(any epic ≈ 23.7%), each common 10/236 ≈ 4.2% (any common ≈ 63.6%). The banner shows these per-rarity
rates next to the pool count, computed by `summonRates()` from the same weighting
rules used by `summonMany()`, so the displayed rates cannot drift from selection
behavior. New heroes are meant to stay hard to get (owner, September 28, 2026):
with the 33-hero pool and rarity weights the campaign's 600 seals spent as one x10
at the end give on average 6.4 new heroes and 3.6 copies (measured with
`td:upgrade-sweep`; 5.8/4.2 with flat weights, 3.9/6.1 at 21 heroes). High rarities
carry the "hard to get" goal now — a specific legendary sits at ≈2.5% per draw —
so the x10 new-hero pity is enabled: it only fires when a full x10 yields nothing
new and does not cheapen the early game.

Divine Seal sources: campaign first clears (600 in Chapter 1) plus replays at a quarter
of the first-clear seals (≈150 more per chapter run; since September 28, 2026 — with one
chapter, first clears alone made summoning feel impossible, owner feedback),
the Daily Trial goal (+15, once per day) and a finished Expedition (+60).

The Summon screen is centered on the featured target: large art, name/title, remaining
rotation time, Divine Seal balance (on one line with the buttons, no "N more needed"),
Summon x1 / Summon x10 and a Skip animation toggle (per browser, `td:summonSkip`). An
info button next to the name opens a native `popover` with the odds and rules: exact
featured chance, "owned heroes return as copies", the not-owned count, rarity rates and,
when the banner has `pityNewInMulti` and unowned heroes remain, the Summon x10 new-hero
guarantee. The pool below shows each hero as New or with its stars and spare copies. A Seal Dust panel exchanges dust for seals or — via a
hero select — spare copies of an owned hero (`dust.copyPrice`).

**Reveal** (`page/summon-reveal.ts`): a full-screen `<dialog>` over the Summon screen.
The summon is paid and saved before it opens. Cards deal in face down (10 cards as 3/4/3)
with the wolf card back (`public/td/summon-card-back-wolf.webp`); the back's glow shows
the rarity before the flip: gold = legendary, purple = epic, none = common. Tap
flips a card, Reveal all flips the rest, the featured hero bursts. Face-up cards are
large art only, with a small "New" tag on first-time heroes (spare copies carry no tag);
name, class and featured status are in each card's aria-label. No visible title or result
summary; a "Tap a card" hint shows until all cards are face up. The Divine Seal balance
sits top right. The result bar offers Summon xN (same size, with price) and Close; Escape
closes only the dialog. Reduced motion fades instead of flipping.

#### Currency display (campaign)

Currencies always show as icon + value, never as a spelled-out name: `currency-icons.js`
(`currencyAmount`, `currencyList`, `currencyIcon`) shows each currency's item icon from R2
`td/icons/items/{gold,hero-xp,divine-seals,seal-dust,divine-essence}-v1.webp` (96px, trimmed
from the 760px source art in `public/td/icons/items/`; the "Divine Dust" art is Seal Dust).
Favor has no item art and uses the star glyph (`currencyIcon("favor")`). The name is the
chip's tooltip and aria-label. Used for the app bar wallet, the Summon and Seal Dust
wallets, stage rewards (drawer, Squad
screen; hero rewards as a portrait + name chip), level/star costs, summon prices and dust
exchanges. Plain
sentences (result screen, notices) still spell names out.

Global wallet (`page/wallet.ts`, markup in the `TdLobby` app bar, moved into the home
screen's top bar on home): one button on every menu screen, replacing the old Favor chip
and the per-screen wallet rows. It shows the currencies that matter on the open screen,
picked in `td.css` by `.td-shell[data-screen]`: Favor + Divine Seals by default (home
included); Gold + Divine Seals on stages and squad; Gold + Hero XP + Seal Dust on Heroes; Divine Seals + Seal Dust on Summon.
Clicking it opens the inventory dropdown: Favor and per-class Insight (Divine Blessings),
then Gold, Hero XP, Divine Seals and Seal Dust (Campaign), each with where it is earned and
spent, and links to Divine Blessings, Heroes and Summon. Escape, a click outside, a link or
any screen change closes it. It redraws after every save (`store.onPersist`) and on every
screen change (`renderLobby`).

Campaign debug (dev builds only, `import.meta.env.DEV`): a DBG button in the app bar on
the campaign screens (stages, heroes, summon, squad) toggles a panel (`TdLobby`,
`data-td-camp-debug`, wired in `page/campaign.ts`) that adds +10,000 Gold, +10,000 Hero XP,
+600 Divine Seals, +1,000 Seal Dust, or all four, to the saved campaign wallet and redraws
the open screen. Not present in production builds.

#### Might (campaign only)

One battle-power number per hero: `heroMight()` in `campaign.js` = (base Attack + Health) x
level scale x star scale x (1 + `heroMight.evolutionPerTier` x evolution tier), with
`evolutionPerTier` 0.06 in `tdCampaign.json` (a readout weight, not a sim stat). It sorts the
Heroes roster, sums to "Squad Might" on the Squad screen and to "Your last squad" in the stage
drawer, both compared against the stage's "Recommended Might" (from `stage.hpScale`).

#### Stars, Evolution and Seal Dust (campaign only)

Numbers live in `tdCampaign.json` (`heroStars`, `heroEvolution`) and `tdSummon.json`
(`dust`); design and review notes in `docs/tower-defense-summon-duplicates-plan.md`.
Every upgrade is chosen and confirmed by the player; nothing is spent automatically.

- **Level cap by stars** (`heroLevels.capByStars`): 0 stars -> Lv 10, 1 -> 20, 2 -> 30,
  3 -> 40, 4 -> 50, 5 -> 60. Gain per level comes from `heroLevels.statPerLevel`, one rate per
  10-level band: +6% (Lv 2-10, unchanged so Chapter 1 balance holds), +3% (11-20), +2%
  (21-30), +1.5% (31-40), +1.5% (41-50), +1% (51-60): Lv 60 = +144% attack and health.
  Cost stays linear (Gold 100 + 50 per level, Hero XP 50 + 25 per level; ~91k Gold to Lv 60).
- **Stars 0-5** (heroes start at 0): star n -> n+1 costs 1/1/2/3/4 duplicate copies of
  that hero (11 in all) plus 100/200/400/600/800 Gold; +10% attack and health per star (5
  stars = +50%), multiplied with the level bonus. Save version 5 migrates older saves (stars
  counted from 1) by one star down, so stats are unchanged. Stars and Evolution share the
  hero's duplicate supply. Quick add fills the material slots only when enough copies of
  that hero are available.
- **Evolution I-V**: each tier costs 1 copy of the same hero or 150 Seal Dust
  (`heroEvolution.dustPrice`); the
  player taps the material, then Evolve. Tiers: ultimate +20%, crit +10%, ultimate cooldown
  -15%, ultimate +25%, and V: the ultimate starts with its awakened upgrade (the same
  per-ultimate upgrade the in-run Awaken unlocks; `hero.awakenedUlt` in `sim.js`).
- **Seal Dust**: 1 spare copy -> 30 dust (by hand); 2 dust -> 1 Divine Seal;
  100 dust -> 1 spare copy of an owned hero (`buyCopiesWithDust`,
  September 28, 2026). Divine Essence was merged into Seal Dust on September 29, 2026
  (save version 7; leftover essence converts at the historical 1:150 rate) — evolution and
  the final skill rank (150 dust) spend dust directly.
- `campaignHeroes()` applies level x stars to attack/health and Evolution to
  `ultPower`, `critChance`, `ultCooldown` and `awakenedUlt`.

Measured with `npm run td:upgrade-sweep` (20 squads per stage at the expected levels):
base 25% on 1-8 and 1-10; 3 stars about +20 points; Evolution V alone about +35;
5 stars + Evolution V reach 70%. Every stage stays winnable without upgrades.

#### Results screen

The result (`[data-td-result]` in `TdOverlays.astro`, `page/results.ts`) covers the whole
play screen: `.td-play.is-result-open` hides the top and bottom bars. Its footer is shared
by every view: Back to Camp, Stats (cleared stages only), Spend Favor, Continue, Retry.

**Stage Clear** (any won stage, `page/stage-clear.ts`, `data-view="clear"`): three scenes
on the same surface, in this order: Victory (stage, waves and tier, final score, New
personal best for a Free Play top score, lives, leaks, duration, the stage rating as three
laurels that start dark and fill gold one after another, MVP art with damage and kills), Hero contribution (heroes ranked by damage: portrait, name and title, damage and
share bar, support, boss damage, kills; the list scrolls) and Rewards (Divine Favor, Hero
Gold, Hero XP and any other currency the save gained, plus the Daily, Expedition or
Campaign outcome line). Victory and Hero contribution advance after `SCENE_MS` (2000 ms)
each; Rewards stays and shows the footer buttons (`data-final`). The footer bar itself is
there from the first scene, empty, so the layout does not jump. One timer at a time, cleared by
`results.reset()` (restart, exit, new run). Reduced motion drops the animations, not the
timing. Stats switches to Hero contribution, Back returns to Rewards. The MVP is the
damage leader. The rating uses the campaign laurel rule for every mode (`laurelLives()`:
a clear, 50% and 90% of the run's `maxLives` kept). Visual prototype for comparison: `/games/tower-defense/result-redesign-review`.

Losses and Endless runs open the detailed report directly (`data-view="report"`).

A campaign stage's result screen offers Retry, the follow-up (Next: stage X after a win,
Change squad after a loss) and **Campaign** (back to the stage list) instead of
Back to Camp. Spend Favor is hidden after campaign stages (they earn no Favor).

### 9. Meta progression

- **Favor**: earned per wave, perfect wave, boss kill, remaining lives (`favorEarn`),
  scaled by tier and mutators. Spent in the Divine Blessings tree.
- **Insight**: per-class currency for the class branches of the tree. The six Mythic
  "Reach" nodes (`*_reach`) no longer raise range (range is not upgraded on boards); since
  October 1, 2026 they keep their ids and bought levels but give Iron Hide (Tank guard
  +2%/level), Keen Edge (Warrior crit +2%), Killer Instinct (Assassin crit +3%), Focused Mind
  (Mage ultimate charge +3%), Steady Aim (Archer crit +2%) and Swift Grace (Support ultimate
  charge +3%), so saves need no migration or refund.
- **Virtue blessings**: between-wave offers from 12 virtues (Wildness, Desire, ...),
  with virtue pairs (e.g. Storm Bond) granting extra run effects. Run boons (rare/epic)
  can roll with requirements such as `chain` or `wet`.
- **Shards / next-run boost**: gold or virtue boost for the next run.
- Favor purchases are allowed anytime and apply on the next run.
- **Hero collection**: heroes unlocked in the campaign and summoned with Divine Seals are
  the only ones Free Play and Expedition can field; both pay a share of Gold and Hero XP
  (see "One hero collection" above).

### 10. Persistence

`localStorage` key `td:v1`, one JSON blob, sanitized on load (`save.ts`): any bad field
is dropped, a corrupt blob starts fresh, unknown hero ids are removed. Hero ids from before
October 1, 2026 (database ids such as `zeus`) are renamed first (`LEGACY_HERO_IDS`):
`lastTeam`, campaign `owned`/`lastSquad`/`levels`/`copies`/`stars`/`evolution`/`skillLevels`,
expedition roster, veterans and camp cards, and blessing node ids in `favLevels`/`favTree`.

Fields: `bestScore`, `bestWave`, `lastTeam`, `perfectDefense`, `favor`, `favLevels`,
`insight`, `resetSpent`, `refundNotice`, `treeVersion`, `repriceNotice`, `mapBests`,
`mapTop`, `challenges`, `nextRunBoost`, `daily`, `expedition`, `expeditionBest`,
`campaign` (the hero collection), `ui` (`homeMode`, the home screen's mode pick).

The `campaign` section is versioned (`CAMPAIGN_SAVE_VERSION` 8): `owned`, `cleared`,
`lastSquad`, `currencies` (Gold, Hero XP, Divine Seals, Seal Dust),
`levels`, `summons`, `copies`, `stars`, `evolution`, `skillLevels`, `milestones`. Older versions migrate on load
(version 3 gets empty copies, stars and Evolution; version 7 turns leftover Divine Essence
into Seal Dust at 1:150).

Per-map records key as `mapId`, `mapId@long`, `mapId#heroic`, `mapId@long#mythic`, so
older builds can still read `td:v1`. Export/import: save code (`TD1:` prefix) or file.
Audio volume and mute have their own keys.

### Content checklists (audit step 4)

Content is not JSON-only. Before shipping, walk the matching list.

**New hero (database hero)**
1. `npm run build:game-balance -- --propose=<id>`; compare with the class peers it prints.
2. Add the id to `tuning.roster` (not to `balanceReference`), run `npm run build:game-balance`
   and check `git diff src/data/gameBalance.json` adds one row and changes none.
3. `heroSkills.<id>` in the tuning (ultimate variant and numbers); display name, title and
   skill names in `tdSkinMythic.json` (white label, section 2).
4. Art and sound: token/portrait on R2 (`assets.js`, new file names, R2 caches for a year),
   sounds plus `tdAudioLevels.json` (`node scripts/td-audio-levels.mjs`), attack/ultimate
   effects (`hero-fx.js`, `TOWER_DEFENSE_HERO_SKILLS.md`).
5. Acquisition: summon pool by default (rarity from tier); a stage-reward hero also goes
   into a stage's `rewards`, which becomes a spare copy if already owned
   (`heroRewardStage` / `summonableHeroes` in `campaign.js`).
6. Checks: `npm run test:tower-defense` (skin test, ultimate edge cases run every roster
   hero), `npm run test:td-balance`, `npm run td:upgrade-sweep` for the summon economy.

**New campaign stage or chapter**
1. Stage in `tdCampaign.json` under its chapter: `unlockAfter`, `mapId`, lives, `hpScale`,
   waves and rewards (an already-owned hero reward becomes a spare copy).
2. A new chapter's first stage unlocks after the previous chapter's last one; the home
   screen's objective and Campaign note follow `nextStage()` / `currentChapter()`, the Stages screen shows chapter tabs.
3. Checks: `test-td-campaign.mjs` (prints the sampled win rate per stage; keep late stages
   above the 20% floor) and `npm run td:pacing -- --only=campaign`.

**New map**
1. Art per `map.md` (theme in `map-scene.js`), route or `lanes` (multi-lane targeting
   expects equal route lengths), `grid` block, then `node scripts/build-td-grid.mjs`.
2. Optional authored side tiles (`grid.platforms`), measured with `npm run td:layout`.
3. Boss assignment, special tiles (`grid.rings`), music.
4. Modes pick it up automatically: Free Play map select, Daily Trial, Expedition pool
   (route length stays `EXPEDITION.stages`, so a fourth map adds variety, not duration).
5. Run `npm run td:maps` and require `valid: yes`; inspect `--json` coverage, support and
   lane metrics. Confirm the preview terrain, paths, gates and base match the loaded battle.
6. Checks: `npm run test:tower-defense` (tile hit test covers every map), `npm run td:sweep`,
   Chromium at phone and desktop size.

### 11. Tests and tools

| Command | Covers |
|---|---|
| `npm run test:tower-defense` | UI helpers, favor, difficulty, skin, save, sim, daily, challenges, expedition, campaign, summon |
| `npm run test:td-balance` | Balance harness |
| `npm run td:sweep` | Difficulty sweep |
| `npm run td:upgrade-sweep` | Campaign win rates by Stars / Evolution, summon economy |
| `npm run td:classes` / `td:progression` | Class and progression reports |
| `npm run td:economy` | In-run gold ledger: income by source vs. spend by sink, per mode/tier |
| `npm run td:layout -- --map=<id>` | Tile layout A/B: committed vs working `tdMaps.json`, Free Play + campaign stages on that map |
| `npm run td:maps` / `npm run td:maps -- --json` | Map geometry baseline, landmark metrics and stable validation errors |
| `npm run td:generate-map -- --seed=N --skin=...` / `--check` | Generate a map candidate (orthogonal-v1), publish it, or verify published ones regenerate (both generators) |
| `npm run td:generate-map -- --gen=lattice-v2 --skin=... [--gates=2] --gallery=24` | lattice-v2 candidates as an HTML sheet in `public/td-local/`; `--seed=N --id=... --name=... --publish` publishes one |
| `node scripts/build-td-enemy-sprites.mjs <folder> --only <names> --version vN` | Enemy stills (256 px WebP) from `~/hero-database-assets/td/enemy-sprites-src/` |
| `node scripts/td-pixellab-clips.mjs --still <webp> --prompts <json> --out <dir>` | PixelLab clips for one still (8 jobs at once, resumable via `jobs.json`; key from `PIXELLAB_API_KEY`) |
| `python3 scripts/td-warp-anim.py <name> <outdir> --pixellab --src <frames>` | Clip strips from saved PixelLab frames (also `STRIPS` and `--warp` modes) |
| `node scripts/td-hero-assets.mjs --id <id> --source <png> [--art vN]` | Hero card-240, thumb-96, token-192 from one transparent portrait |
| `python3 scripts/td-idle-anim.py <png> <id> <outdir> [--version vN] [--gif]` | Hero idle loop (24 frames, 5376x224) |
| Runbook for asset jobs (agents, cloud) | `docs/td-asset-pipeline.md`: enemy clips, new stills, new hero art, delivery |
| `node scripts/build-td-enemy-anims.mjs <clips> --set painted --release` | Enemy animation sheets into `public/td/enemies/clips/`, named after their still (without `--release`: local test set) |
| `node scripts/upload-to-r2.mjs --prefix td/enemies/...` | Upload stills or sheets to R2 (versioned names, cached a year) |
| `npm run td:pacing` | Balance and pacing report with two bot policies (`cheapest`, `carry` in `scripts/lib/td-runner.mjs`) |
| `npm run build:game-balance` | Regenerate `gameBalance.json` |
| `node scripts/build-td-grid.mjs` | Regenerate map tiles |
| `node scripts/td-audio-levels.mjs` | Regenerate audio gains |

Invariants worth keeping under test: determinism (same seed = same log), gold awarded
once per kill, no deadlock with every road tile filled, flyers reach the base past
blockers, accumulator clamps long tab-away gaps, loss wins a same-tick tie, cost is not
monotonic in tier.

# Tower Defense Roadmap

Last updated: September 28, 2026. Completed work -> [TOWER_DEFENSE_ARCHIVE.md](TOWER_DEFENSE_ARCHIVE.md).

Map implementation must use the asset assignments in [map.md](map.md), including the prepared Sunscar Ruins art for Map 3.

## What's next (priority order)

Map work is handled separately and archived. Only open work is listed here; done milestones move to the archive. Milestones below are in priority order; each one lists what "done" means.

## Use subagents for tackling more than one task

Use subagents for doing more than 1 milestone. Coordinate well when changing files though.

Deferred (P3, not needed yet): prestige/Ascension reset (only once players hit the end of the blessing tree), map editor (non-goal in spec section 1).

### M23: Tutorial Stage (skip)

- We should have a tutorial stage where players get an onboarding into all our mechanics and game play. that should cover minimalistic stages with the most important topics to deal in an onboarding scenario like most gacha or tower defense games do. we have to define what we want to do and what should be displayed. most apps just create simple scenarios with tooltips that pause the game and players need to follow a tutorial.
- players should be introduced to basic mechanics, status effects
upgrades and such.


### M24 - Attention! Audit
- There will be an Audit being run. Audit is documented here and will be done from another agent. File: `/Users/daschultheiss/hero-database/TOWER_DEFENSE_PROGRESS_AUDIT.md`

### Audit changes:
Audit order from `TOWER_DEFENSE_PROGRESS_AUDIT.md` ("Development cycle recommendation"). UI consolidation is done; balance and content-contract work remain open.

- Campaign, Squad and Summon screen pass (done September 28, 2026):
  - Campaign now leads with an illustrated next-stage detail card and a visual chapter route. Selecting an unlocked stage previews its art, encounter text, waves, boss when present and rewards before opening Squad.
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
  - Proposals: (a) Tank encounters, (b) Mage trim and (c) Verdant approved by the owner September 28, 2026; (d) 1-10 health and (e) Chapter 1 length still open.
  - Done (c) Verdant: new map field `enemyHp` (open modes only; a Campaign / Expedition stage scale replaces it), Verdant 1.25. Measured at 1.3: Endless 23.7 / 18.1 waves (was 28.4 / 25.9; Moonlit 23.7 / 20.4, Sunscar 24.0 / 20.9), 20 waves 10/15 and 7/15. Campaign stages on Verdant unchanged.
  - Not changed (b) Mages: a fair test (same 4-hero core, platform trio swapped) shows no Mage excess: 3 Mages Endless 27.2 / 25.3, 3 Archers 29.6 / 20.9, 2 Mages + 1 Archer 29.8 / 27.7. The -17 "without Mages" came from the test: the balanced list fills the freed places with Tanks and Supports. Splash / chain trims (down to 0.2 share) moved it by at most 2 waves. `td:pacing` class removal needs same-slot replacements before it is used for tuning again.
  - Not changed (a) Tanks: tried without shipping, measured on 1-2..1-10 with both policies. Heavier brute / shieldbearer waves (runners removed) made Tank squads no better and 1-10 harder; Tank hold 3-3.5 s and guard 0.45, +25-60% damage to enemies a Tank holds, and Tank attack x1.5 / x2 / x2.5 all left squads with a Tank at 0-61% vs 9-100% without. Cause: in a 4-hero squad every non-damage place costs wins (on 1-9 all-platform squads with no road hero win); by 1-9 the owned 10 heroes include 2 Tanks and 2 Supports, so Tank squads are also low-damage squads. Losses are leaks, not standoffs. Next step needs an owner decision: accept Tanks as a 7-hero (Free Play / Endless) class, or give 4-hero squads a reason (for example a fifth campaign place for a road hero, or stages that punish leaks through the road differently).
- Step 4 - Content contract (open): stable per-hero balance baselines so adding a hero does not shift others (`scripts/build-game-balance.mjs`); chapter-aware campaign UI (currently labels everything with `chapters[0]`); summon eligibility (stage-reward exclusion) into `campaign.js`; Expedition route length as a setting before a fourth map; pin Pixi CDN versions; short content checklists (stage, map, hero).
- Step 5 - Controlled expansion (open): a few new stages or chapter star milestones, only after 1-4.
- Doc drift listed in the audit (open): `TOWER_DEFENSE_SPEC.md` (one map, 20 heroes), `PROJECT_MEMORY.md` (inline page script), `src/game/td/bugs.md` (inspector stats and blessing graph exist), `docs/tower-defense-ui-plan.md` (ring-era requirements), white-label audit (label historical sections).

### M24 Urgent User Feedback
This is feedback from a players perspective and we should tackle solutions for these immediately and with high priority.

**Planning status (September 28, 2026):** Open recommendations below are proposals for owner review. Suggested order: touch inspection → compact panels, Upgrade clarity and rotation removal → slot readability → authored layout trial → platform-threatening enemy trial. The first three form one usability pass; layout and combat changes should be measured separately. Special-tile atmosphere is complete. This is a code-informed review; visual and playtest checks below are acceptance criteria for implementation.

28.9.2016 (original feedback date as recorded):
- Mobile: Too much texts gathered in one place
  - **Advice — P1, proposed September 28, 2026:** Make the battle panels show one immediate decision at a time. Keep portrait, role, essential stats and the main action visible; collapse skill explanations and advanced targeting under labelled Details / Target controls. The deployed-hero panel currently starts with Details expanded (`page/popover.ts`); start it collapsed on phones and retain the player's choice during the session. Shorten the recruit sheet's class paragraph to the selected hero's role and relevant tile bonus. Keep costs, disabled-action reasons and important warnings visible.
  - **Done when:** At 390×844 and phone landscape, the primary action is visible without scrolling through descriptions, expanded content stays reachable, and the selected tile/range remains visible. Review recruit and deployed-hero panels first; extend the same treatment to other screens only where needed.
- I am unable to see what a unit is capable of doing before placing them down- maybe on laptop I can hover over it but I cannot do the same on phone
  - **Advice — P1, first change:** Use “tap hero → inspect → Deploy · cost”. Today `page/recruit.ts` previews on hover/focus, but its click handler immediately places the hero. M28 added a range preview, which does not give touch users a deliberate opportunity to read a chosen hero's abilities.
  - **Proposal:** Selecting a card shows a compact role sentence, basic attack/support effect, ultimate effect, ground/flying coverage and the range at the chosen tile. Put full numbers in expandable Details and use current gameplay data so Campaign upgrades are reflected. A separate Deploy button confirms placement; selecting another card only changes the preview. Allow inspection of unaffordable or already deployed heroes while disabling Deploy with a reason. Preserve the existing pause while recruiting.
  - **Done when:** Touch, mouse and keyboard users can compare two heroes and cancel without spending gold; only Deploy places a hero. Verify range, cost and ability descriptions agree with the resulting unit.
- Slightly more defined tower slots so players can understand the spots where we can place the gods
  - **Advice — P1:** Strengthen the tile silhouette with a contrasting rim and inset surface; distinguish Road and Platform with both shape/icon and colour. When choosing placement, brighten eligible empty slots, dim incompatible ones, and give the selected slot a clear outline. Keep occupied tiles quieter so combat stays readable.
  - **Implementation / done when:** Update the active `map-scene.js` slot drawing and the `render.js` fallback consistently. Check hit areas against the drawn tiles on all three maps at phone size; tapping a visible tile must select that tile without overlapping neighbouring targets. A player should recognise an available position without opening help.
- personal suggestion but make the slots randomly, not serially or in rows, it adds the depth of the map design bit more
  - **Advice — P2:** Use deliberately authored, irregular platform clusters near bends, islands and clearings. Start with one map for comparison. Keep positions stable between attempts so players can learn a layout; per-run randomness would also change difficulty and complicate Daily Trial comparisons. Road positions still need to line up with the route for blocking.
  - **Implementation:** Extend the source `grid` configuration with authored placement anchors or controlled offsets, then regenerate the slot arrays. `map.md` explicitly makes `roadSlots`, `platformSlots` and `rings` generated output; direct edits would be overwritten. Preserve art assignments, obstacle clearance, entrance/sanctuary clearance and distinct touch targets. Rebind special tiles correctly when indices change.
  - **Done when:** The revised map has useful short- and long-range choices, coverage for every lane and no inaccessible slots. Compare campaign/free-play outcomes against the existing layout before applying it to the other maps; avoid combining layout and enemy tuning in the same measurement.
- I enjoy the design of the maps, specially the design of the "Sanctuary"
  - **Advice — visual constraint for this pass:** Preserve the existing map art and Sanctuary as the focal point. Match new tile borders and ambient effects to each map's palette and keep the final approach, Sanctuary silhouette and damage feedback unobstructed. This positive feedback supports targeted readability changes.
  - **Done when:** Before/after views of all three maps show that the Sanctuary remains easy to identify during placement and busy combat. No replacement art is needed for this feedback.
- I did not quite understand the concept of "rotate" and I personally think players would rather have the option to "upgrade" rather than rotate. (Again I am not exactly sure what "Rotate" does, so if it is important disregard this point)
  - **Owner decision — September 28, 2026:** Remove player-controlled rotation. The control is unclear, adds upkeep during combat and competes with the much more useful Upgrade action.
  - **Implementation advice — P1:** Remove Rotate from the deployed-hero panel, remove the `R` keyboard action and update the keyboard help. Directional attacks and ultimates must automatically face their chosen primary target when they fire; centre their cone or spread on that direction for the whole attack. Keep facing only as internal combat/render state where an animation or effect needs it. Remove `sim.rotate()` and other player-facing rotation wiring once every directional hero has automatic aiming.
  - **Done when:** No rotation control or instruction remains, Upgrade is the main action, and every directional hero can hit an appropriate target without manual setup. Add focused simulation checks for cone and spread skills from enemies approaching on different sides and lanes, then run the existing balance suite to catch any damage increase caused by reliable automatic aiming.
- [x] I like the idea of the special tiles, do you think you can create a sort of "aura" or smoke/mist around the special slots? It would then actually feel special than just be highlighted as special — **done September 28, 2026.**
  - Added a persistent ambience layer beneath slots and units. High Ground has rising gold motes, Shrine has drifting cyan mist and a soft pulse, and Cursed has rising red wisps. Each tile creates its small set of Pixi display objects once; frames only update position, scale and opacity. Reduced-motion mode hides moving parts and retains a static coloured glow. Existing badges remain, and the recruit sheet plus deployed-hero details continue to state the exact tile benefit.
  - **Validation:** Renderer syntax and TD UI helper checks pass. Browser checks at 390×844 and 844×390 covered all three special tiles occupied during an active wave with no page errors; 120 animation frames averaged 13.2 ms with a 14 ms p95 in that run. A separate 390×844 reduced-motion check showed static markers with no page errors. The full simulation suite currently stops at the pre-existing dirty-worktree Lilith HP assertion (expected 9750, actual 12187.5), unrelated to this render-only change. Production build intentionally not run.
  - **Second pass (September 28, 2026):** Effect now reaches past the tile and over the hero. A soft radial-gradient texture (drawn once, additive/screen blend) replaces the hard ellipses: ground light about twice the tile size under the slot art, drifting motes / mist / wisps moved to a new layer above the heroes (fainter while occupied so the token stays readable), and the occupying hero gets a matching underglow and rim (rotating gold arcs on High Ground, pulsing cyan double ring on Shrine, uneven red flicker on Cursed). Checks: `npm run test:tower-defense` passes; Chromium 1440x900 on Moonlit Pass (empty tiles, occupied High Ground and Cursed, during wave 1) and 844x390 with reduced motion (static glow and rim), no page errors.
- tower heroes dont take damage? we should invent new enemies types OR add an attack to existing enemies that deal dmg to tower heroes as well, not only road heros.
  - **Finding:** Ordinary enemy targeting in `findEnemyTarget()` excludes platform heroes, including for ranged attackers. Platform heroes are not completely immune: the boss mark can damage them, and Hexers can disable them. The feedback exposes a real gap in regular-wave pressure.
  - **Advice — P2, separate balance pass:** Give one existing ranged enemy an explicit ability to attack either slot type. Introduce it in a controlled mid-chapter wave with a visible projectile, target warning and a short wave-preview description. Use a bounded attack range and cadence; prefer a nearby road defender when one is available, giving Tanks a protective role, while exposed platforms become valid targets. Leave ordinary melee targeting unchanged.
  - **Counterplay / done when:** Players can identify and focus the attacker, protect platforms with positioning/road defenders, and recover through healing or redeployment. Test range, target eligibility, dead/veiled targets, target loss and damage/death handling. Measure platform-heavy and mixed squads under both existing bot policies, plus manual phone play, before increasing its frequency. Revisit the audit's Tank/Mage imbalance with those results; a wholly new enemy and art set can follow if this first variant is insufficient.

### M24c - New Effects due to hero change
- we should render new effects for our heroes after we swapped them.
- check what kind of hero we have, then look what we can do with a solid type of effect in the game
- if a hero uses lightning, the lightning should look good
- if a hero uses poison, we should see poison bubbles happening
- i dont want any "just straight line as damage" anymore in the game
- If a hero has a permanent support skill active (like give more atk or atk speed -> he should get an aura pulsating showing that there is an effect active)
- Progress (Sep 27): done in a first pass. New pooled effect kit (`fx-kit.js`) plus status visuals (`status-fx.js`); every hero has a themed attack, impact and ultimate for its mythic identity (table in `TOWER_DEFENSE_HERO_SKILLS.md`); Odin's lightning forks and re-strikes with a rune circle ultimate; poison bubbles, burn flames, chill frost, wet drips and a frozen ice shell show on enemies; all tracer lines (hero shots, enemy shots, hexes, dashes, heal beams) replaced by travelling projectiles, arcs and curved flows. Open: Ymir shows Burn although he is a frost giant (tuning decision).

### M24d - New boss and heroes
- we need another boss for Lilith cause she is still a character from Motto Immortal. Create all what is necessary. Ideas: some Monsters from Greek Mythology
- also we need common heroes where we can summon from. These can be pawn like common heroes with no heroic names cause they need to differ from our good heroes. they are common and deal as fodder with low stats and limited skills. they should be added to the summon pool and of course everywhere else. we need at least one for each class. 

### M25: Leaderboard (large, needs design first - skip)

- Goal: shared scores across players.
- Blocker: needs an anti-tamper design before any code (see spec section 9); a plain client-submitted score endpoint would be a cheat form. Likely path is a Cloudflare Worker plus D1.
- Done when: the anti-tamper approach is agreed, then built.
- Only in Endless Mode maybe?

### M26: Campaign (next sprints)

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

  ### M27a: Menu design
  - Most menues are really boring to watch. We have a really nice looking main menu screen at the moment. But all screen within a game mode looks like a text menu. 
  - campaign should also have cards. summon is only a button. rethink and restructure this.
  - Progress (September 28, 2026): Campaign cards and the Summon screen were done earlier (audit screen pass, M28); Daily Trial already had its banner and portrait cards. This pass:
    - Expedition: Daily-style banner (expedition art, boss art once started, rule chips, reward box before the start, lives box during a run), route of three battlefield cards with map art (done / next battle / ahead; "Unknown battlefield" plus stage health before the order is drawn), camp rewards as large choice cards (recruit portrait, relic and drill icons), squad as portrait cards (shared `trialCardHtml()` in `page/daily.ts`, veterans show their level instead of the cost), relics as tiles, "How it works" steps before the first start. Continue button names the stage.
    - Difficulty and run length: battlefield banner (map art, boss art, Change button back to the map select), difficulty tiers with diamond rank pips, tier colours and a Favor badge, run-length cards with a big 10 / 20 / infinity numeral, best result and a Play button (compact rows on phones).
    - Map select: map art at 90% instead of 55% opacity, softer route overlay.
    - Checks: `npm run test:tower-defense`, no TD type errors, Chromium 1440x900 and 390x844: map select, mode screen, Expedition before start, after a forced stage win (camp) and after a camp pick; no horizontal overflow, no console errors.
  - Open: Settings / Glossary / Blessings screens were not part of this pass.

  ### M27b: Rethink Summon Mode
  - summon should be as to when a user requires to have x amount of a material to summon 1 hero, and XX amound of material to do a 10 pull summon.
  - summons should contain not good heroes (60% chance of dropping), medium heroes (38%) and the best heroes (2%) chance. 
  - for this we might require more heroes and put them to qualities like: common, rare and epic heroes.
  - Progress (September 28, 2026): the cost part is done in M26 sprint 9 (60 seals per pull, 600 for x10, duplicates as copies, reveal with tier glow). Open: quality tiers with 60 / 38 / 2% drop rates; this needs the common fodder heroes from M24d first (the roster has 21 heroes and no commons).

### M28: AAA reference UI pass (done September 28, 2026)

Screenshots of an unnamed AAA mobile TD's campaign map, squad select, in-combat HUD and victory screens were analyzed and compared against our screens (`TdLobby.astro`, `TdPlayScreen.astro`, `campaign.ts`, `recruit.ts`, `hud.ts`). Findings and owner decisions:
- Already equivalent, no change: redeploy-cost badge on fallen deck heroes (`td-deck-badge`), per-unit ultimate charge ring (drawn on canvas, `render.js`), result screen (ours is one screen with Summary/Battle tabs; the reference needlessly splits Victory into two screens around a sync-loading gap - not worth copying).
- Shipped:
  - Chapter route rail: `routeHtml()` (already used on the home screen's Campaign card) now also renders above the Campaign screen's stage grid (`data-td-camp-route`), done/current/ahead dots for all 10 stages.
  - Stage detail before squad: tapping any unlocked stage card now updates the existing feature panel in place (art, waves, boss, reward) instead of jumping straight to the Squad screen; a card gets `.is-featured`. The panel's own CTA (`data-camp-feature-start`, renamed from the shared `data-camp-stage`) is what actually opens the Squad screen ("Choose squad" or "Replay stage" depending on clear state).
  - Squad power vs. recommended: `data-td-squad-power` in the Squad screen footer reads `Squad power X / recommended Y`, green when at or above, gold when under. `recommendedPower = avg(hero.atk+hero.hp across the roster) * squadSize * stage.hpScale` - a legible readout of the same `hpScale` knob the simulator already uses to scale enemy HP, not a new invented difficulty axis. Footer wraps to 3 lines under 640px (was truncating the squad-count text before the fix).
  - Topbar icons: Gold/Lives/Wave in the play screen topbar each got a small line icon next to the label.
  - Touch range preview on first deployment: the recruit sheet (tap an empty tile) never showed the hero's range ring before placing, on any input; mouse-hover-based preview only existed for the separate "redeploy a fallen hero from the deck" flow. `recruit.ts`'s `preview()` now sets `game.uiPlacement` from the focused/hovered hero card, so the existing canvas range ring (`render.js` `buildRanges`) shows for touch too.
- Explicitly skipped (owner decision, September 28, 2026): a Lord-hero / support-hero slot pair like the reference's team screen. Would need a new squad data model and a defined gameplay effect neither of which exist; out of scope until designed on its own.
- Checks: `npm run test:tower-defense` (all suites, including `test-td-campaign.mjs`), `npm run check` (no new TD type errors), manual Chromium pass at 420x900 (campaign -> stage detail -> squad -> battle) via the Playwright skill.

### M99: Login/Register
- what would we need to provide auth / login / register to dave players progress ? gmail auth ? apple auth ?
- goal: all achieved things from players should be saved
- if requirements are too large or harsh (for a free environment), we skip this entirely.

## Research notes (September 25, 2026)

Superseded September 27, 2026 (M24 white label): the database tokens, Spine idle loops and their scripts below were removed from the game; heroes now use the mythic skin (see the white-label audit). Kept here as history.

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
npm run td:pacing               # audit step 3: class removal, maps, campaign minutes, seals (2 bot policies)
node scripts/td-audio-levels.mjs                                   # hero sound gains -> src/data/tdAudioLevels.json (needs ffmpeg)
npm run build:game-balance      # regenerate hero balance (re-ranks all heroes)
npm run check                   # astro check (TD code is type-clean; rest of site not yet)

node scripts/build-td-grid.mjs [--check]                            # placement tiles -> tdMaps.json (after route / grid block edits)
node scripts/build-td-enemy-sprites.mjs <folder>                   # AI enemy art -> public/td/enemies/sprites
python3 scripts/td-idle-anim.py <portrait> <id> <outdir>           # hero idle loop sheet -> public/td/heroes-alt/anims
node scripts/upload-to-r2.mjs --prefix td/<folder>                 # upload new files (never overwrites)
```

`window.tdGame` and `window.tdRenderer` available in browser for debugging.

## Known gaps / deferred

Replays were dropped (September 25, 2026). Open items left by archived milestones:

- M22b (tiles + deploy cap 7): Free Play runs are easier than with the old rings (20 waves 4/5 wins vs 2/5; all-platform squads now win). Retune enemy health with `npm run td:sweep` or lower the cap if that is too much.

- M6 criterion 2: closed September 25, 2026 by the Support change below (endless without Warriors 16.3 vs 20.7 with them). Without Tanks is still close (20.3); check with `npm run td:classes`.
- M6 criterion 3: three Mages alone win Verdant on every seed; Verdant is the easiest map for every squad and needs its own tuning.

**Player feedback (September 25, 2026):**

- "Can't stop these enemies": they were flyers, which pass over blockers by design but looked like ground units. Flyers now hover above a faint shadow and bob, and the first flyer wave of a run says that only platform heroes can hit them. Rule unchanged.
- "Support heals too strong, range too big": Support range 220 -> 170 (just above Mages, below Archers), heal per attack 3x -> 1.8x attack (Caishen about 93 -> 56 health per second). Mixed squad endless 24.2 -> 20.7; Supports still count (without them 19.7).

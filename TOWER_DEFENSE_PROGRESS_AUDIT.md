# Tower defense progress audit — September 27, 2026

The game has a credible foundation for more content. The simulation, mode adapters, save migrations, responsive shell, and automated checks are already substantial. The next development cycle should consolidate that foundation: make the first campaign session easier to understand, correct mode-specific UI, establish the value of road heroes, and stabilize how new content affects balance.

The largest risk is accumulated complexity. There is already enough mechanical variety for a much larger game. Adding duplicates, ranks, rarity, and ten-pulls now would increase the explanation and balancing burden before the current loop has been validated with new players.

This is a review of the current working tree, including existing uncommitted campaign, menu, sprite, and effects work. It is not a claim about what is deployed. No game code or balance data was changed for this audit.

## Evidence and limits

Reviewed the TD roadmap, archive, specification, campaign/save concept, hero and white-label notes, UI plan, map/art documentation, bug list, and relevant project/design-system documentation. Other Markdown files were inventoried for relevance; unrelated database guides were not audited in detail. Current source takes precedence over historical completion notes.

Inspected the simulator, mode rules, content data, save/controller boundaries, renderer/effects structure, Astro components, CSS, and test harnesses. Ran the following successfully:

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run test:tower-defense` | All 11 suites passed, including all ten campaign stages and summons | [Gameplay log](docs/audits/td-2026-09-27/gameplay-tests.txt) |
| `npm run test:td-balance` | Passed standard, long, endless, and class-matrix assertions | [Balance log](docs/audits/td-2026-09-27/balance-tests.txt) |
| `npm run td:classes` | Completed; class-removal results reveal an imbalance worth investigating | [Class report](docs/audits/td-2026-09-27/class-report.txt) |
| Local Chromium UI inspection | Home, Campaign, Summon, Heroes, Daily, Expedition at 1440×900, 390×844, 844×390; campaign preparation and selected-hero panel at each size | [Browser log](docs/audits/td-2026-09-27/browser-checks.txt) |

The 18 inspected menu/viewport combinations had no document overflow. The final browser pass reported no page JavaScript errors. Astro's development toolbar was hidden because it intercepted a mobile control; the in-game development button remains visible in screenshots. Battlefield placement for inspector checks was injected through the debug game handle, so this is not a full touch-only deployment test.

No production build was run, as requested. No full human campaign playthrough, real-phone test, dense-wave performance profile, network-asset completeness check, or exhaustive accessibility audit was performed. Bot outcomes measure a fixed policy, not player win rates. Previous documentation's playtest and performance claims are treated as historical evidence.

## Status quo

| Area | Assessment | What this means for the next cycle |
| --- | --- | --- |
| Core combat | Established and testable | Preserve the shared simulator; tune clarity and class value |
| Mode coverage | More than sufficient | Improve the existing four mode families before creating another |
| Campaign | Complete first-chapter progression loop | Validate onboarding, pacing, squad decisions, and repeat rewards |
| UI foundation | Strong shell; uneven screen quality | Bring Campaign and Summon up to the home screen's standard |
| Simplicity | Under pressure | Reveal advanced decisions gradually; hold additional progression layers |
| Content scalability | Good for authored stages; partial for heroes/maps | Address concrete extension bottlenecks before Chapter 2 |
| Save reliability | Local saves, migration, export/import exist | Expose save failures before expanding collection investment |
| Validation | Good rules coverage; limited browser regression coverage | Add a small set of actual player-flow checks |

## Game modes

| Mode | Implemented rules | Intended role and audit assessment |
| --- | --- | --- |
| Free Play | Three maps; 10 waves, 20 waves, or Endless. Normal/Heroic/Mythic for finite runs; Endless stays Normal. Full roster, up to seven deployed heroes; permanent Divine Blessings and pending shard boosts apply | Strong sandbox and long-term replay mode. Its prominent home-screen placement currently sends new players into the broadest ruleset |
| Campaign | Ten authored stages over the three maps; six starter heroes; squads of up to four; five stage-reward heroes; Gold, Hero XP, Divine Seals; campaign hero levels 1–10; first-clear and repeat rewards; one summon banner | Best candidate for the learning path and main content pipeline. Campaign levels apply only here; permanent Divine Blessings and shard boosts do not |
| Daily Trial | Date-seeded map, five allowed heroes, two starting mutators, Endless/Normal, wave-five goal, once-per-day 100 Favor goal bonus; no permanent Divine Blessings or shard boosts applied | Distinct, useful challenge mode. Keep it optional for experienced players. Its reward feeds the Favor progression outside the trial |
| Expedition | Shuffled sequence of the three maps; three starting heroes; carried lives; camp choices for recruits, relics, or veteran training; rising stage health; completion bonus | Good roster-adaptation mode. Permanent Divine Blessings apply; campaign levels and pending shard boosts do not. Already enough scope for this cycle |

Sources: [session construction](src/game/td/page/session.ts), [campaign rules](src/game/td/campaign.js), [Daily rules](src/game/td/daily.js), [Expedition rules](src/game/td/expedition.js), [wave generation](src/game/td/waves.js).

**Recommended product hierarchy:** Campaign as the suggested first experience; Free Play as experimentation; Daily and Expedition as optional challenges. A small “Start here” or “Continue campaign” treatment is sufficient. Existing players can retain quick access to Free Play.

A mode description should answer three questions before entry: which heroes are available, which permanent upgrades apply, and what the run earns. Preserve the current separation of progression; explain it consistently instead of merging economies.

Expedition has a deliberate persistence compromise: leaving an unfinished stage allows restarting it, while a recorded loss ends the expedition. Keep that behavior for now and describe it accurately; browser interruption should not become an accidental punishment.

## Gameplay: enough depth, too many simultaneous explanations

The strongest core is easy to describe: place road heroes to hold enemies, place platform heroes to deal damage or support, spend battle gold, and prepare for the next wave. Automatic attacks and ultimates keep execution manageable. Class roles, enemy previews, and result hints support that loop.

Around it, the game now includes level upgrades, a level-three stat focus, a level-four class path, Awakening, repeatable training, target priorities, facing, synergy tags, statuses and reactions, special tiles, run blessings, permanent blessing branches, Insight, shard choices, wave quests, map challenges, and Endless mutators. Campaign adds ownership, account-level hero upgrades, three currencies, and summons.

Most of those features have individual merit. The problem is their combined learning cost. The current [Upgrade help paragraph](src/components/td/TdPanels.astro) describes focus, paths, Awakening, training, selling, and death resets together. A glossary can support discovery, but cannot replace a clear first battle.

Recommended treatment:

| Keep immediately visible | Introduce when relevant | Keep secondary |
| --- | --- | --- |
| Gold, lives, next wave, road/platform role, placement, basic upgrade | Flyers in 1-2; armor/healing in 1-3; the first focus/path when affordable; the first boss rule | Target overrides, detailed synergies, reaction recipes, training, full permanent tree |

Use brief contextual teaching in the existing early campaign stages. The roadmap explicitly skips a full tutorial stage; this recommendation does not require a tutorial framework. Stage 1-1 should teach placement and an upgrade; 1-2 should demonstrate why flyers need platform coverage. Keep class-default targeting selected, with overrides under an expandable control. Consider recommending a default focus so a new player can proceed without comparing three percentages.

Do not remove mechanics indiscriminately. First observe which decisions players understand and enjoy. If focus and class path feel repetitive, simplify the numeric focus before sacrificing the class path, which changes behavior more meaningfully.

### Balance findings from this audit

| Standard 10-wave bot runs, seed 99 | Moonlit | Verdant | Sunscar |
| --- | --- | --- | --- |
| Winning squad presets | 2/5 | 4/5 | 3/5 |
| All-platform preset | Win | Perfect win | Win |
| Road-wall preset | Loss | Loss | Loss |
| Budget preset | Perfect win | Perfect win | Perfect win |
| 20-wave winning presets | 4/5 | 4/5 | 3/5 |

The longer mode being more winnable for these presets is worth checking: generated wave pacing and the additional upgrade economy may make “longer” differ from “harder.” That can be valid, but should be intentional. The road-wall preset lacks strong flyer coverage, so its losses alone are not evidence that all melee heroes need buffs.

The class-removal report is more informative: mean Endless wave reached over three maps and two seeds was **30.7** with the full test roster; **33.8 without Tanks**, **30.7 without Assassins**, **25.8 without Warriors**, **13.2 without Mages**, **23.8 without Archers**, and **27.2 without Supports**. Mage-only and Archer-only squads also win Verdant's standard run in the single-seed check.

These results suggest Tanks need a clearer practical payoff and Mages cover many problems. They do not justify forcing every squad to contain every class. The bot deploys by a fixed priority, chooses inexpensive upgrades, and defaults to the first class path; removing a class changes spending and deployment opportunities. It also counts a 120-second period without a kill or leak as a loss. Treat the report as a controlled tuning signal, not a tier list.

Next balance work should compare representative four-hero campaign squads, fresh seven-hero Free Play squads, and progressed accounts separately. Test several seeds and more than one placement/upgrade policy. Tune enemy composition, map coverage, blocker survival, and reward timing before applying a universal HP increase. A useful acceptance condition is at least one clear encounter advantage for a Tank squad, alongside viable alternatives.

### Campaign economy and pacing

All ten campaign stages pass the existing viability threshold. Stage 1-1 wins with 15/15 tested squads; 1-2 falls to 20/35; 1-5 is 11/35; 1-10 is 10/35. The harness uses expected levels purchased from prior first-clear income and samples at most 35 squads. The 20% test floor establishes that a stage has viable solutions; it does not establish a smooth beginner experience.

The archive estimates about 65 minutes of winning bot combat for Chapter 1, with 1-10 taking 10–12 minutes. These are historical pacing measurements, not a fresh human completion time. Retries, menus, and learning add time. Validate the first three stages with new players before expanding the chapter count.

Chapter 1 awards **600 Divine Seals**, buying **six summons** at 100 each. The banner has ten summon-only heroes; replays award no seals. After all first clears and available summons, a fresh player can own 17 of 21 heroes. This is a finite-content boundary, not a broken summon function. Show where future seals will come from or explicitly explain that current chapter rewards are exhausted.

Keep the guaranteed-new-hero banner for the next cycle. It directly rewards progress and squad experimentation. The proposed 60/38/2 rarity distribution, duplicates, ranks, and ten-pulls would require a larger economy and a reason for weaker pulls to feel useful. None solves the current shortage of post-chapter seal sources. If replay progression is needed, simple stars and a finite chapter milestone reward are a smaller next step than duplicate ranks.

Gold and Hero XP currently arrive in a 2:1 ratio in authored rewards, matching every level-up cost's 2:1 ratio. At the nominal economy level they are largely coupled; replay rounding can introduce small differences. Keep their data fields if useful for future design, but avoid expanding their UI or adding another currency before they represent different decisions.

## UI: preserve the shell, improve the decisions

The [desktop home screen](docs/audits/td-2026-09-27/home-desktop.png) has a strong visual hierarchy, appropriate art, visible progression, and clear primary actions. The viewport-fitted shell, internal scrolling, back navigation, pause reasons, persistent battlefield controls, and responsive inspector are valuable completed work.

The [campaign screen](docs/audits/td-2026-09-27/campaign-portrait.png) is readable but text-heavy. The [initial summon screen](docs/audits/td-2026-09-27/summon-desktop.png) is mostly empty, with its disabled action still bright yellow. Improving it does not require a more complicated summon system.

Recommended screen changes:

| Screen | Focused improvement |
| --- | --- |
| Campaign | Featured next-stage card with map art, encounter lesson, waves, rewards, and Start; compact chapter route and completed stages below. Make Heroes secondary to starting/continuing |
| Squad | Recommended starter composition, visible role coverage, short skill inspection, accurate unlock source. Warn about missing anti-air when the selected stage actually contains flyers |
| Heroes | Label “Campaign level”; show current-to-next attack/health clearly. Preserve battle-level terminology separately |
| Summon | Show available hero portraits, cost, guaranteed-new rule, seal source, and a clear no-seals state. A stronger reveal can come later |
| Battlefield | Keep upgrade primary; collapse advanced targeting. Show the actual restricted roster capacity and stage life maximum |
| Results | Offer the next stage or Change squad as appropriate. The current Campaign action returns to the stage list; Retry preserves the squad, which is less helpful after a composition failure |

### Confirmed inconsistencies to fix first

| Priority | Finding and evidence | Expected correction |
| --- | --- | --- |
| P1 | Campaign HUD and entry notice say “up to 7” / `0/7` even with two selected heroes. Observed in browser; [deployCap](src/game/td/sim.js) returns the global cap, while campaign only restricts `allowedHeroes` | Display the effective deployable capacity for the run. Daily and early Expedition should use the same rule |
| P1 | Fresh stage 1-1 has 20 lives, but the sanctuary reads “20 / 25 INTEGRITY.” [map-scene.js](src/game/td/map-scene.js) uses `tuning.run.lives` for its maximum | Define the run's life maximum once and share it with HUD, scenery, and results; distinguish carried Expedition damage from a campaign's lower maximum |
| P1 | [Squad copy](src/game/td/page/campaign.ts) says stage-reward heroes can be obtained by “clear stage … or summon,” while the banner excludes them | Derive unlock text and eligibility from the same acquisition rules |
| P1 | Squad briefing always names the map boss, including stage 1-1, whose authored waves contain no boss | Derive encounter preview from stage waves; show a boss only when present |
| P2 | Expedition camp/abandon feedback calls `ctx.notice`, whose only host is inside the hidden play screen | Provide a visible menu status region and use it for menu actions |
| P2 | Empty summon pool text says “You own every hero”; stage-reserved heroes can still be locked when the summon-only pool is exhausted | Say “Every hero in this banner is yours,” and preserve remaining stage unlock guidance |

The first four are small fixes with disproportionate value: the interface should teach the actual rules before it becomes more decorative.

### Mobile and readability

The inspector adapts correctly to a [portrait sheet](docs/audits/td-2026-09-27/inspector-portrait.png) and a [short-landscape side overlay](docs/audits/td-2026-09-27/inspector-landscape.png). The landscape overlay covers a substantial part of the battlefield; this is an intentional compromise, not proof of a broken layout. Keep the selected hero visible and make switching through the deck easy.

At 390px board width, a 60-world-pixel tile is about **24 CSS pixels** wide. Enlarging the hit radius cannot make adjacent tiles independently large: nearest-tile selection still divides the available space. A no-overflow test does not prove comfortable placement. Before more tile density or effects, test first placement, adjacent-tile selection, upgrade, sell, redeploy, and orientation change with a thumb on a real phone. If misses are frequent, try a local enlarged placement preview or explicit confirmation for ambiguous touches.

The nine target-priority buttons also impose an icon-learning burden and are only 32px high in CSS. A labelled expandable selector would reduce both density and touch difficulty. Preserve existing focus states and reason-based pausing. Screen-reader battle comprehension and focus behavior across every overlay remain unverified.

The new effects toolkit already pools particles and caps live particles/shapes. That is a sound direction for M24c. Visual acceptance should prioritize enemy silhouettes, flyer recognition, hero selection, and readable status cues during a crowded fight. This audit did not validate dense combat effects or sustained mobile frame time.

## Scalability: extend the current structure

The architecture already has useful boundaries:

- Pure mode/progression modules and a deterministic simulation support headless testing.
- Stages, waves, maps, tuning, skin, and saves are separate data concerns.
- `page/` controllers separate navigation, recruitment, progression, results, and session lifecycle from combat.
- One frame loop, stale-load cancellation, and renderer teardown reduce repeated-run lifecycle risk.
- Stable internal hero IDs survive the mythic reskin; retain that stability.

A rewrite, ECS, new UI framework, or backend is not justified by the present evidence. Several small boundaries do need strengthening:

| Priority | Constraint | Smallest useful next step |
| --- | --- | --- |
| P1 before adding heroes | [Balance generation](scripts/build-game-balance.mjs) ranks heroes relative to the roster and derives prices/stats from database data. Adding one hero can rebalance existing heroes; the mythic skin changes presentation, not this dependency | Establish stable TD-owned balance baselines or explicit per-hero overrides. Require a before/after roster diff for every new hero |
| P1 before Chapter 2 | [Campaign UI](src/game/td/page/campaign.ts) flattens all stages but labels them with `chapters[0]`; chapter completion/progress would become misleading | Render and select chapters explicitly while keeping the existing stage format |
| P2 | Mode-specific rules are spread across session, results, HUD, and panels | Introduce a small typed run policy for roster, progression applicability, rewards, capacity, and initial/max lives. Keep mode adapters; avoid a generic plugin framework |
| P2 | Stage-reward exclusion lives in the campaign page's roster filtering rather than the banner rule itself | Move acquisition eligibility into the pure campaign domain module, reused by UI and tests |
| P2 | `sim.js` is about 1,951 lines, renderer 1,329, CSS 1,224; key controller boundaries use `any` | Type run options and results first. Extract cohesive subsystems only as they change; preserve deterministic tests |
| P2 | Expedition automatically includes every map, but health scaling has three entries and reuses the last for later stages | Make expedition route length/order a deliberate content setting before a fourth map changes its duration |
| P2 | Renderer loads Pixi/filter modules from major-version CDN URLs | Pin exact tested runtime versions or use the existing project delivery process; adding a production dependency still requires confirmation |
| P2 | [Save persistence](src/game/td/page/save.ts) catches write errors silently | Return/report persistence status and offer export when saving fails. Cloud login is not needed to solve this |

Content growth is currently easiest through new authored stages and carefully chosen enemy combinations. A map also needs a scene/art assignment and valid lane geometry; current multi-lane targeting expects equal route lengths. A new hero needs balance, skin/assets/audio, skills/effects, collection eligibility, and tests. Document these as short content checklists rather than assuming every addition is JSON-only.

Performance scaling is unproven beyond existing headless run guards and bounded effects. Profile dense Endless waves, simulation cost, frame time, and repeated start/exit memory on target devices before raising enemy or deploy counts. No player-server scaling work is necessary for the current static, local-save game.

## Development cycle recommendation

| Order | Deliverable | Acceptance criteria |
| --- | --- | --- |
| 1 — Rules and UI agree | Correct capacity, life maximum, unlock source, actual stage boss preview, menu notices, save-failure feedback | Fresh Campaign, Daily, Expedition and Free Play show the applicable rules; mode switching and retry preserve the intended progression boundaries |
| 2 — First-session experience | Minimal teaching in stages 1-1 to 1-3; clearer Campaign/Squad/Summon screens | Three to five new players can deploy, upgrade, handle flyers, explain campaign versus battle levels, and find the next stage without coaching. Record confusion and retry causes |
| 3 — Balance and pacing | Tank/road-role investigation, Verdant tuning, early campaign difficulty review, chapter completion economy decision | Multiple seeds and at least two bot policies plus human checks; representative mixed and alternative squads viable; document intended run duration and late-chapter retry cost |
| 4 — Content contract | Stable hero balance policy, chapter-aware UI, centralized acquisition rules, concise content checklist | A second chapter can be represented correctly; a hero addition does not silently alter unrelated heroes; old saves still migrate |
| 5 — Controlled expansion | A small batch of new stages or simple chapter star milestones | New content reuses established mechanics, offers meaningful encounter variation, and passes the focused regression set |

Finish the current effects/art pass against readability criteria, but do not let it displace the first three items. Keep duplicates/ranks, rarity/ten-pulls, additional modes, cloud accounts, leaderboard, prestige, and editor work deferred. Revisit them when there is a demonstrated player need or a complete economy design.

For regression coverage, retain the current rules suites and add a few meaningful browser flows: fresh Campaign → squad → battle → reward → next stage; summon → new hero → squad; cross-mode transitions; save import/export; failed persistence; mobile placement and panel use. `test-td-ui.mjs` currently tests geometry/pause helpers, not the actual rendered menus, explaining why these inconsistencies can coexist with green tests.

## Documentation maintenance

Use the roadmap for open priorities, the archive for historical evidence, and a concise current-rules reference for implemented behavior. Add this audit as a planning input without treating its recommendations as already approved implementation work.

Specific drift to resolve during consolidation:

- `TOWER_DEFENSE_SPEC.md` still describes one map and a locked 20-hero roster; the current game has three maps and 21 heroes.
- `PROJECT_MEMORY.md` describes all UI logic as an inline page script; the controller split is substantial now.
- `src/game/td/bugs.md` still calls exact inspector stats and a visual blessing graph missing, although both exist.
- `docs/tower-defense-ui-plan.md` contains earlier five-hero/ring-era requirements; later tile and app-shell work supersedes them.
- The white-label audit has an updated status followed by an old “nothing switched” inventory. Label historical sections clearly.
- M24c is listed as open while substantial effects code is present in the working tree. Record implementation versus visual acceptance separately.

The practical milestone is a clear, tested first chapter with trustworthy UI and repeatable content creation. The existing codebase can support that without adding more systems first.

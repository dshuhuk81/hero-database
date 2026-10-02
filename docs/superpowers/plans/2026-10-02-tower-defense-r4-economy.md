# Tower Defense R4 Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove in-battle hero progression and make deployment plus between-wave relocation the complete battle-gold spending loop.

**Architecture:** `TowerDefenseGame` owns discounted deployment and atomic relocation so every UI and mode follows the same rules. Collection-enhanced hero data remains the source of base combat power, while Favor and Expedition add run modifiers during placement. The page modules expose relocation through the existing unit panel and board-slot interaction.

**Tech Stack:** JavaScript simulation modules, TypeScript page modules, Pixi renderer, JSON tuning data, Node assertion scripts.

**Spec:** `docs/plans/2026-10-02-tower-defense-r4-economy-design.md`

## Global Constraints

- Add no production dependency.
- Do not run `npm run build`.
- Preserve existing Favor node IDs, Expedition `veterans`, and challenge `unrefined` save keys.
- Relocation costs 25% of discounted deployment cost, rounded to whole gold; class Rite reduces that result by 30%.
- Deployment discounts stack additively and stop at 50%.
- R4 does not rebalance gold income or enemy difficulty.
- Commit and push the completed implementation to `main`.

## Review Focus

- A relocation to an occupied, missing, or wrong-type tile must not move the hero or spend gold; Task 1 tests each rejection.
- A relocation attempted during a wave or without enough gold must be rejected without mutation; Task 1 tests both cases.
- Moving a hero must retain HP, ultimate charge, cooldowns, entity ID, and refundable investment; Task 1 tests identity and combat-state preservation.
- Old Favor, Expedition, and challenge save keys must keep working after their effects change; Task 3 tests the existing IDs and sanitizers.
- Heroes without campaign progress metadata must still render and deploy correctly in unrestricted and legacy contexts; Task 4 tests/falls back to the base hero data.

---

### Task 1: Deployment Discounts and Atomic Relocation

**Files:**
- Modify: `src/game/td/sim.js:220-305`
- Modify: `src/data/gameBalance.tuning.json`
- Test: `scripts/test-td-sim.mjs`

**Interfaces:**
- Consumes: `this.favor.deployDiscount`, `this.classBonus(hero).deployDiscount`, and `this.classBonus(hero).relocateDiscount`.
- Produces: `deployCost(heroId): number`, `relocationInfo(entityId): { ok, reason, hero?, cost? }`, and `relocate(entityId, slotType, slotIndex): { ok, reason?, hero?, cost? }`.

- [ ] **Step 1: Add focused relocation and discounted-deployment assertions**

Test that global plus class discounts are additive and capped at 50%; a valid relocation costs `round(deployCost * 0.25 * (1 - relocateDiscount))`; and the hero moves while entity ID, HP, ultimate clock, attack clock, cooldown fields, and `invested` remain unchanged. Test rejection during a wave, after completion, without gold, and for occupied, nonexistent, or wrong-type destinations.

- [ ] **Step 2: Run the focused simulation test and confirm the new assertions fail**

Run: `node scripts/test-td-sim.mjs`

Expected: FAIL because relocation APIs and deployment-discount effects are absent.

- [ ] **Step 3: Implement the economy APIs in `sim.js`**

Calculate deployment cost from the base or fallen-hero cost before applying the combined cap. Make `relocate()` validate through `relocationInfo()`, update the existing unit's slot position, range and default rotation, spend gold, increment `relocations`, emit a `relocate` event, and call `onChange("relocate", this)`.

- [ ] **Step 4: Add `run.relocationCost: 0.25` to tuning and rerun the focused test**

Run: `node scripts/test-td-sim.mjs`

Expected: relocation and deployment assertions PASS; remaining failures may still reference the old upgrade system until Task 2.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/game/td/sim.js src/data/gameBalance.tuning.json scripts/test-td-sim.mjs
git commit -m "Add tactical hero relocation"
```

### Task 2: Remove Battle Progression and Class Paths

**Files:**
- Modify: `src/game/td/sim.js`
- Modify: `src/game/td/skills.js:65-195`
- Modify: `src/data/gameBalance.tuning.json`
- Modify: `scripts/test-td-sim.mjs`
- Modify: `scripts/lib/td-runner.mjs:47-100`

**Interfaces:**
- Consumes: collection-enhanced hero fields including `atk`, `hp`, `campaignLevel`, `campaignStars`, `campaignEvolution`, `campaignSkillLevels`, and `awakenedUlt`.
- Produces: placed units with permanent base power plus run modifiers and no `level`, `focus`, `path`, `awakened`, or `trained` battle state.

- [ ] **Step 1: Replace upgrade tests with permanent-power placement tests**

Assert that placement uses collection attack and health, applies run HP modifiers and class `power` once, and exposes no upgrade APIs or battle-progression state. Keep ultimate tests for `awakenedUlt`; delete assertions whose only subject is battle Awakening, focus, training, or class paths.

- [ ] **Step 2: Run the simulation test and confirm the replacement assertions fail**

Run: `node scripts/test-td-sim.mjs`

Expected: FAIL because placed units still contain battle rank state and upgrade methods.

- [ ] **Step 3: Simplify placement and stat calculation in `sim.js`**

Remove constructor `startLevels`, `startLevelFor()`, `upgradeInfo()`, `trainingInfo()`, `upgrade()`, `trainMult()`, `trainingCost()`, `focusMult()`, and `pathFx()`. Replace `maxHpFor` with `maxHpFor(baseHp, heroClass)` and `atkFor` with `atkFor(hero)`, applying class `power` and existing run modifiers without rank multipliers.

- [ ] **Step 4: Remove every class-path combat branch**

Delete path-only blocking, retaliation, dash, attack, healing, aura, reaction-source, and boon-eligibility behavior. Keep equivalent hero-kit, Infusion, and collection-awakened behavior. Remove `PATH_INFO` and battle-only `AWAKEN_TEXT` exports after callers are migrated or temporarily stop importing them.

- [ ] **Step 5: Remove upgrade, Awakening, training, focus, and path tuning**

Delete the top-level `upgrades`, `awakening`, `training`, and `paths` sections only after `rg` confirms no runtime caller remains. Preserve collection progression tuning under its existing campaign keys.

- [ ] **Step 6: Stop runner policies from purchasing upgrades and run the simulation test**

Run: `node scripts/test-td-sim.mjs`

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/game/td/sim.js src/game/td/skills.js src/data/gameBalance.tuning.json scripts/test-td-sim.mjs scripts/lib/td-runner.mjs
git commit -m "Remove in-battle hero progression"
```

### Task 3: Migrate Favor, Expedition, and Challenges

**Files:**
- Modify: `src/data/blessingTree.json`
- Modify: `src/game/td/favor.js:135-170`
- Modify: `src/game/td/expedition.js`
- Modify: `src/game/td/challenges.js`
- Modify: `src/game/td/page/expedition.ts`
- Test: `scripts/test-td-favor.mjs`
- Test: `scripts/test-td-expedition.mjs`
- Test: `scripts/test-td-challenges.mjs`

**Interfaces:**
- Consumes: Task 1's `deployDiscount` and `relocateDiscount`, and Task 2's class `power` placement modifier.
- Produces: `stageGameOptions(state).heroBonuses` as `{ [heroId]: { atk: number, hp: number } }`; run facts field `relocations`; preserved node and challenge IDs with new meanings.

- [ ] **Step 1: Change Favor tests to the approved replacement effects**

Assert `odin_dominion` grants 3% global deploy discount per level; each `*_ascension` grants 10% class deploy discount; `*_rite` grants 30% class relocation discount; and `*_apotheosis` grants 15% class attack and maximum health. Assert existing node IDs and dependency links remain accepted.

- [ ] **Step 2: Change Expedition and challenge tests**

Assert veterans add 10% attack and HP through `heroBonuses` and keep the same `veterans` field. Assert `unrefined` is displayed as Hold Position and succeeds only when `relocations === 0`; confirm saved `unrefined` completions survive sanitization.

- [ ] **Step 3: Run the three focused tests and confirm they fail**

Run: `node scripts/test-td-favor.mjs && node scripts/test-td-expedition.mjs && node scripts/test-td-challenges.mjs`

Expected: FAIL on the old effects and counters.

- [ ] **Step 4: Update the blessing data and effect mapping**

Keep IDs, tree placement, prices, maximum levels and prerequisites. Change names/copy where the old rank language appears; map effect types to `deployDiscount`, class `deployDiscount`, class `relocateDiscount`, and class `power`.

- [ ] **Step 5: Replace Expedition start levels with veteran hero bonuses**

Add `EXPEDITION.veteranBonus = 0.10`, return `heroBonuses` from `stageGameOptions()`, apply those bonuses during placement, and change camp/roster copy from level 2 to `+10% ATK & HP`.

- [ ] **Step 6: Replace the challenge upgrade counter with relocation facts**

Keep the `unrefined` ID, rename its visible challenge to Hold Position, update its text, and evaluate it using `game.relocations`.

- [ ] **Step 7: Run the focused migration tests**

Run: `node scripts/test-td-favor.mjs && node scripts/test-td-expedition.mjs && node scripts/test-td-challenges.mjs`

Expected: all three PASS.

- [ ] **Step 8: Commit Task 3**

```bash
git add src/data/blessingTree.json src/game/td/favor.js src/game/td/expedition.js src/game/td/challenges.js src/game/td/page/expedition.ts scripts/test-td-favor.mjs scripts/test-td-expedition.mjs scripts/test-td-challenges.mjs
git commit -m "Migrate progression bonuses out of battle"
```

### Task 4: Replace Upgrade UI with Permanent Progress and Relocation

**Files:**
- Modify: `src/game/td/page/popover.ts`
- Modify: `src/game/td/page/recruit.ts`
- Modify: `src/game/td/page/hud.ts`
- Modify: `src/game/td/page/context.ts`
- Modify: `src/game/td/page/session.ts`
- Modify: `src/game/td/render.js:950-1085`
- Modify: Tower Defense page markup and styles located by existing `data-td-upgrade` and popover selectors
- Test: `scripts/test-td-ui.mjs`

**Interfaces:**
- Consumes: Task 1's `relocationInfo()`/`relocate()` and Task 2's collection metadata on placed heroes.
- Produces: page action `beginRelocation(entityId): void` and relocation selection state cleared after success, cancellation, wave start, run end, or session teardown.

- [ ] **Step 1: Add UI structure assertions for passive progress and relocation**

Assert the hero panel contains permanent level, stars, evolution and four skill levels; contains Relocate and Sell; and contains no Upgrade, Awaken, Train, focus, path, or battle-rank copy. Assert a hero without campaign metadata falls back to level 1, zero stars/evolution, and available skill-level defaults.

- [ ] **Step 2: Run the UI test and confirm it fails**

Run: `node scripts/test-td-ui.mjs`

Expected: FAIL because upgrade controls remain and relocation controls are absent.

- [ ] **Step 3: Rewrite the selected-hero panel**

Remove upgrade imports, state, handlers and picker markup. Render collection progress passively, preserve targeting/details/sell, and add Relocate with exact cost and disabled reason from `relocationInfo()`.

- [ ] **Step 4: Connect relocation to board-slot input**

When Relocate is selected, close the panel, highlight compatible empty slots with the existing placement affordance, and route the next compatible slot activation to `game.relocate()`. Keep the mode active after an invalid destination; cancel it on explicit cancellation or lifecycle changes.

- [ ] **Step 5: Remove battle-rank presentation**

Make deck and board badges show `campaignLevel` when available. Remove awakened rank borders/stars, starting-rank recruit text, and battle-rank accessibility labels. Keep collection evolution/star presentation in the panel.

- [ ] **Step 6: Run the UI and simulation tests**

Run: `node scripts/test-td-ui.mjs && node scripts/test-td-sim.mjs`

Expected: both PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/game/td/page src/game/td/render.js src/pages src/styles scripts/test-td-ui.mjs
git commit -m "Replace battle upgrades with relocation UI"
```

### Task 5: Remove Dead References and Update Project Documentation

**Files:**
- Modify: `TOWER_DEFENSE_ROADMAP.md`
- Modify: `TOWER_DEFENSE_SPEC.md`
- Modify: `TOWER_DEFENSE_GAMEPLAY_IDEAS.md`
- Modify: any remaining test or script returned by the dead-reference search
- Test: relevant `scripts/test-td-*.mjs` files changed above

**Interfaces:**
- Consumes: completed R4 runtime and UI behavior.
- Produces: repository documentation and scripts that describe only the current economy.

- [ ] **Step 1: Search for stale battle-progression references**

Run: `rg -n 'battle rank|upgradeInfo|trainingInfo|upgradesBought|startLevels|startLevelFor|PATH_INFO|pathFx|hero\.path|unit\.level|hero\.awakened|upgradeDiscount|awakenDiscount|awakenBonus' src/game/td scripts TOWER_DEFENSE_*.md`

Classify every result as collection progression, historical context, unrelated path geometry, or stale battle-upgrade behavior. Remove or rewrite only the stale behavior.

- [ ] **Step 2: Update roadmap, specification, and idea status**

Mark R4 complete, record deployment/relocation/sell as the battle-gold loop, document the exact relocation rules and replacement node effects, and remove R4 from open owner questions.

- [ ] **Step 3: Run focused verification without balance simulations**

Run: `node scripts/test-td-sim.mjs && node scripts/test-td-favor.mjs && node scripts/test-td-expedition.mjs && node scripts/test-td-challenges.mjs && node scripts/test-td-ui.mjs && node scripts/test-td-save.mjs`

Expected: all commands PASS. Do not run the campaign viability sweep or `npm run build`.

- [ ] **Step 4: Check formatting and inspect the final diff**

Run: `git diff --check && git status --short && git diff --stat`

Expected: no whitespace errors; only R4 design, implementation, tests and documentation are changed.

- [ ] **Step 5: Commit final documentation and cleanup**

```bash
git add TOWER_DEFENSE_ROADMAP.md TOWER_DEFENSE_SPEC.md TOWER_DEFENSE_GAMEPLAY_IDEAS.md docs/plans/2026-10-02-tower-defense-r4-economy-design.md docs/superpowers/plans/2026-10-02-tower-defense-r4-economy.md src scripts
git commit -m "Complete tower defense R4 economy redesign"
```

- [ ] **Step 6: Push `main`**

Run: `git push origin main`

Expected: the completed R4 commits are accepted by `origin/main`.

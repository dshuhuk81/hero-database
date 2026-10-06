# Tower Defense Mythology Groups and Two-Row Lords Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mythology identities and icons to the named Tower Defense roster, replace the six-unit campaign lineup with two five-slot rows, and make each row's Lord bonus permanent and group-aware.

**Architecture:** Authored identity metadata stays in `tdSkinMythic.json`, a new catalog owns group presentation, and `build-game-balance.mjs` copies memberships into runtime hero rows. A pure squad-row module owns normalization and validation; campaign UI, new save storage, session startup, Pantheon Bonds, and the simulation consume that shared representation instead of reconstructing membership or row rules.

**Tech Stack:** Astro 7, TypeScript/ES modules, plain JavaScript simulation modules, JSON data, `node:assert`, Sharp for asset export, built-in ImageGen for source art.

**Spec:** `docs/superpowers/specs/2026-10-05-td-mythology-groups-two-row-lords-design.md`

## Global Constraints

- Scope is Tower Defense only; do not edit `src/data/heroes/` or `src/data/all_heroes_db.json`.
- The twelve `recruit-*` heroes remain group-less.
- A named TD hero has one or two mechanically equal mythology groups.
- Two squad rows contain five total units each; a Lord consumes one slot and each row permits at most one Lord.
- Unrelated heroes remain legal in a Lord row but receive no Lord bonus.
- A selected Lord's row bonus remains active for the entire battle, even before deployment and after death or sale.
- Keep existing Greek/Norse Pantheon Bond effects and recruit wildcard behavior.
- Do not add production dependencies.
- Do not run `npm run build`.
- Preserve unrelated working-tree changes and use focused commits.

## Review Focus

- New row-save data can contain nested non-arrays, duplicate IDs, unknown IDs, more than five entries, or Lords away from slot zero; Task 3 tests deterministic sanitization without losing unrelated progression.
- A hero with two memberships can match either row, but must never receive the other row's Lord effect; Task 5 tests both positive matches and cross-row isolation.
- A full five-regular-hero row cannot accept a Lord by silently ejecting a hero; Tasks 3 and 4 test the rejected placement and feedback.
- A legacy save may contain only flat `lastSquad`; Task 3 tests that it is ignored and the new rows start empty while unrelated progression survives.
- Missing, opaque, or visually empty icon output must fail before release; Task 2 checks every catalog path, 128 x 128 dimensions, alpha, and non-empty visible bounds.

---

### Task 1: Authored mythology metadata and runtime propagation

**Files:**
- Create: `src/data/tdMythologyGroups.json`
- Create: `src/game/td/mythology-groups.js`
- Create: `scripts/test-td-mythology-groups.mjs`
- Modify: `src/data/tdSkinMythic.json`
- Modify: `src/data/gameBalance.tuning.json`
- Modify: `scripts/build-game-balance.mjs`
- Modify: `src/data/gameBalance.json` (generated)
- Modify: `package.json`

**Interfaces:**
- Produces: `groupsOf(hero): string[]`, `hasMythologyGroup(hero, groupId): boolean`, `heroesInMythologyGroup(heroes, groupId): any[]`.
- Produces: runtime hero rows with `mythologyGroups: string[]` for all named heroes and `[]` for recruits.
- Produces: catalog records keyed by `greek`, `norse`, `egyptian`, `elder-powers`, `underworld`, `wildborn`, and `divine-guardians`.

- [ ] **Step 1: Write the failing metadata test**

Add assertions that all 22 named heroes have one or two unique catalog IDs, every `recruit-*` has none, the approved membership lists match the spec exactly, Isis is the Egyptian catalog Lord, every icon path is a versioned `/td/icons/mythology/*.webp` path, and `groupsOf`/`hasMythologyGroup` handle missing arrays safely.

- [ ] **Step 2: Run the metadata test and stale-data check**

Run: `node scripts/test-td-mythology-groups.mjs && node scripts/build-game-balance.mjs --check`

Expected: FAIL because the catalog, helper, and generated memberships do not exist.

- [ ] **Step 3: Add the catalog and approved memberships**

Add `mythologyGroups` to the 22 entries in `tdSkinMythic.json` using the exact lists in the spec. Add catalog display names, colors, descriptions, versioned icon paths, and `lordHeroId: "isis"` only on `egyptian`.

- [ ] **Step 4: Implement runtime helpers and generator propagation**

Implement the three exported pure helpers in `mythology-groups.js`. Update `build-game-balance.mjs` so both generated rows and hand-authored rows, including Isis and recruits, receive a cloned array from `tdSkinMythic.json` or `[]`; never use `statSource` for identity.

- [ ] **Step 5: Add the focused test to the TD workflow and regenerate**

Add `test:td-mythology` and include it in `test:tower-defense`. Run `npm run build:game-balance` to update the generated file. Add `groupId: "egyptian"` to Isis's Lord tuning while retaining the old `members` temporarily until Task 5 removes it.

- [ ] **Step 6: Verify Task 1**

Run: `npm run test:td-mythology && node scripts/build-game-balance.mjs --check && node scripts/test-td-skin.mjs`

Expected: all commands pass and the generated rows use TD identities, not database-source identities.

- [ ] **Step 7: Commit**

```bash
git add package.json scripts/build-game-balance.mjs scripts/test-td-mythology-groups.mjs src/data/tdMythologyGroups.json src/data/tdSkinMythic.json src/data/gameBalance.tuning.json src/data/gameBalance.json src/game/td/mythology-groups.js
git commit -m "feat(td): add mythology group metadata"
```

### Task 2: Production mythology-group icons

**Files:**
- Create: `assets/td/mythology-groups/{group}-source.png` (seven files)
- Create: `public/td/icons/mythology/{group}-v1.webp` (seven files)
- Create: `scripts/build-td-mythology-icons.mjs`
- Create: `docs/td-mythology-group-icons.md`
- Modify: `scripts/test-td-mythology-groups.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: icon paths and motifs from `tdMythologyGroups.json`.
- Produces: `npm run build:td-mythology-icons`; normalized transparent 128 x 128 WebPs at the catalog paths.

- [ ] **Step 1: Extend the test to fail on absent or invalid assets**

For every catalog icon, assert that the file exists, Sharp reports 128 x 128 WebP with alpha, the alpha minimum is below 255, and trimmed visible bounds are non-empty. Assert that all seven output paths are distinct.

- [ ] **Step 2: Run the asset validation**

Run: `npm run test:td-mythology`

Expected: FAIL listing the seven missing icon files.

- [ ] **Step 3: Generate seven transparent source icons with ImageGen**

Use one built-in ImageGen call per icon with the shared premium painted mythic emblem direction and the exact motif from the spec. Require a centered readable silhouette, transparent background, no text, no character, no rectangular plate, no watermark, and safe padding. Copy each accepted original into `assets/td/mythology-groups/` without overwriting unrelated assets.

- [ ] **Step 4: Add the deterministic export script**

Implement `scripts/build-td-mythology-icons.mjs`: trim alpha, resize with containment into a 112 x 112 inner area on a transparent 128 x 128 canvas, and export WebP with quality 88 and alpha quality 100. Add `build:td-mythology-icons` to `package.json`.

- [ ] **Step 5: Export, inspect, and document**

Run the exporter, inspect the seven final files as a contact sheet, and record source paths, final paths, exact prompts, built-in ImageGen usage, and export settings in `docs/td-mythology-group-icons.md`. Regenerate any icon that is ambiguous at small size.

- [ ] **Step 6: Verify Task 2**

Run: `npm run build:td-mythology-icons && npm run test:td-mythology`

Expected: exporter reports seven outputs and validation passes.

- [ ] **Step 7: Commit**

```bash
git add assets/td/mythology-groups public/td/icons/mythology scripts/build-td-mythology-icons.mjs scripts/test-td-mythology-groups.mjs docs/td-mythology-group-icons.md package.json
git commit -m "feat(td): add mythology group icons"
```

### Task 3: Pure squad-row rules and new save shape

**Files:**
- Create: `src/game/td/squad-rows.js`
- Create: `scripts/test-td-squad-rows.mjs`
- Modify: `src/data/tdCampaign.json`
- Modify: `src/game/td/campaign.js`
- Modify: `src/game/td/page/save.ts`
- Modify: `scripts/test-td-campaign.mjs`
- Modify: `scripts/test-td-save.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `emptySquadRows(): [string[], string[]]`.
- Produces: `flattenSquadRows(rows): string[]`.
- Produces: `normalizeSquadRows(value, { allowedIds, lordIds }): [string[], string[]]`.
- Produces: `validateSquadRows(rows, { allowedIds, lordIds }): { valid: boolean, reason: string | null }`.
- Produces: `placeInSquadRows(rows, heroId, rowIndex, slotIndex, { lordIds }): { rows: [string[], string[]], error: string | null }`.
- Produces: campaign progress field `lastSquadRows` and campaign save version 10; legacy `lastSquad` is not converted.

- [ ] **Step 1: Write failing row-rule tests**

Cover two rows, five entries per row, uniqueness across rows, empty slots, one Lord per row, Lord normalization to slot zero, legal unrelated regular heroes, exact placement/swapping, and rejection when a Lord is added to a full regular row. Include malformed nested values and unknown IDs.

- [ ] **Step 2: Run the row test**

Run: `node scripts/test-td-squad-rows.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure row module**

Use compact row arrays with order preserved. Normalization removes unknown IDs and later duplicates, caps each row at five, caps rows at two, permits at most one Lord per row, and moves that Lord to index zero. Placement returns the original normalized rows plus an explanatory error when it cannot satisfy the request without silent data loss.

- [ ] **Step 4: Write failing campaign/save-shape tests**

Assert `squadRows: 2`, `squadRowSize: 5`, and `squadSize: 10`; a one-hero partial squad is valid; valid `lastSquadRows` sanitizes with Lords at slot zero; invalid nested data sanitizes safely; legacy `lastSquad` alone produces two empty rows; and all non-squad progression fields remain byte-for-byte equivalent.

- [ ] **Step 5: Implement save version 10 and campaign integration**

Make new progress use `lastSquadRows`. Extend `SaveRules` with `lordIds`, pass it into campaign sanitization, ignore legacy `lastSquad`, and update `validSquad` to validate structured rows through the shared module. Keep legacy hero-ID renaming working inside new row arrays when those arrays exist.

- [ ] **Step 6: Verify Task 3**

Run: `node scripts/test-td-squad-rows.mjs && node scripts/test-td-campaign.mjs && node scripts/test-td-save.mjs`

Expected: all commands pass; legacy saves retain progression but begin with an empty two-row lineup.

- [ ] **Step 7: Commit**

```bash
git add package.json src/data/tdCampaign.json src/game/td/squad-rows.js src/game/td/campaign.js src/game/td/page/save.ts scripts/test-td-squad-rows.mjs scripts/test-td-campaign.mjs scripts/test-td-save.mjs
git commit -m "feat(td): add two-row squad model"
```

### Task 4: Two-row squad selection UI

**Files:**
- Modify: `src/components/td/TdLobby.astro`
- Modify: `src/game/td/page/campaign.ts`
- Modify: `src/styles/td.css`
- Modify: `scripts/test-td-ui.mjs`

**Interfaces:**
- Consumes: Task 1 catalog/runtime memberships and Task 3 row functions.
- Produces: two rendered `[data-td-squad-row]` panels, an active-row state, group icon chips, Lord status, click placement, and pointer drag/drop across ten slots.

- [ ] **Step 1: Add failing source-contract and pure interaction assertions**

Assert that the markup exposes a rows container, `campaign.ts` imports `placeInSquadRows` instead of maintaining a flat local squad, both rows render five indexed slots, roster clicks and pointer drops call the shared placement function with an explicit row and slot, and CSS contains compact short-landscape rules.

- [ ] **Step 2: Run the UI test**

Run: `node scripts/test-td-ui.mjs`

Expected: FAIL on the absent two-row contract.

- [ ] **Step 3: Render the two row panels**

Replace the single lineup/Lord element with one rows host. Each panel renders five slots, row label, active state, Lord crown/group icon/name, matching glow, and unconnected styling. Roster tiles render zero to two mythology icons; Lord cards render a crown.

- [ ] **Step 4: Replace flat selection and drag logic**

Keep `squadRows` as the page state. A row/panel/empty-slot tap selects the active row; roster taps place through `placeInSquadRows`; slot taps remove; pointer dragging identifies both row and slot and supports swaps and cross-row moves. Show explicit feedback for full rows, duplicates, and a second Lord. Never auto-eject a hero.

- [ ] **Step 5: Fit supported landscape phones**

Use two compact stacked lineup rows with tap targets at least 44 CSS px. At the existing short-landscape breakpoint, reduce decorative gaps and portrait size before allowing the roster or Start controls to become inaccessible.

- [ ] **Step 6: Verify Task 4**

Run: `node scripts/test-td-ui.mjs && node scripts/test-td-campaign.mjs`

Expected: both pass. Manually inspect the Squad screen at approximately 844 x 390 and 420 x 900 without running a production build.

- [ ] **Step 7: Commit**

```bash
git add src/components/td/TdLobby.astro src/game/td/page/campaign.ts src/styles/td.css scripts/test-td-ui.mjs
git commit -m "feat(td): render two squad rows"
```

### Task 5: Row-scoped permanent Lord bonuses

**Files:**
- Modify: `src/game/td/page/campaign.ts`
- Modify: `src/game/td/page/session.ts`
- Modify: `src/game/td/campaign.js`
- Modify: `src/game/td/sim.js`
- Modify: `src/game/td/skills.js`
- Modify: `src/data/gameBalance.tuning.json`
- Modify: `scripts/test-td-lord-isis.mjs`
- Modify: `scripts/test-td-sim.mjs`

**Interfaces:**
- Changes: `CampaignRun` to `{ stageId: string; squadRows: [string[], string[]]; heroic?: boolean }`.
- Changes: `stageGameOptions(stage, squadRows, seed?, heroes?, heroic?)` to return flattened `allowedHeroes` plus normalized `squadRows`.
- Produces in `TowerDefenseGame`: `lordRows()`, `lordRowFor(hero)`, `lordFx(hero)`, `lordInterval(lordId)`, and `stepLords(dt)`.

- [ ] **Step 1: Rewrite Lord tests to the row contract**

Assert that an Egyptian hero in Isis's row receives the full bonus before Isis deploys, after Isis dies, and after Isis is sold; a Greek hero in the same row stays unbuffed; a dual-group fixture matches either eligible Lord; a matching hero in the other row stays unbuffed; and two row Lords cannot stack onto one hero.

- [ ] **Step 2: Add failing periodic/mark assertions**

Assert that Isis's timer advances without an Isis battlefield entity, counts matching lineup teammates rather than deployed entities, buffs currently deployed matching row members when it fires, and still requires Isis's own direct damage to place her attack mark.

- [ ] **Step 3: Run focused Lord tests**

Run: `node scripts/test-td-lord-isis.mjs && node scripts/test-td-sim.mjs`

Expected: FAIL because Lord resolution still scans deployed heroes and the hand-authored member list.

- [ ] **Step 4: Carry rows into the session and simulation**

Persist rows from campaign start, flatten only for `allowedHeroes`, and pass normalized rows into `TowerDefenseGame`. Normalize flat-only headless callers to deterministic five-entry rows for backward compatibility.

- [ ] **Step 5: Replace entity-owned Lord state with lineup-owned state**

Build Lord-row descriptors once from `squadRows`, tuning `groupId`, and runtime hero memberships. Store periodic clocks/buff deadlines by Lord ID on the game. Run `stepLords(dt)` once per simulation step independent of deployed Lord entities. Resolve `lordFx(hero)` only through that hero's selected row.

- [ ] **Step 6: Remove duplicated membership and update copy**

Delete Isis's `members` array from tuning. Update `lordText` to describe the catalog group and permanent row scope without claiming the Lord must stand on the field. Keep `lordMark` tied to Isis's direct attacks.

- [ ] **Step 7: Verify Task 5**

Run: `node scripts/test-td-lord-isis.mjs && node scripts/test-td-sim.mjs && node scripts/test-td-campaign.mjs`

Expected: all pass with no cross-row leakage.

- [ ] **Step 8: Commit**

```bash
git add src/data/gameBalance.tuning.json src/game/td/page/campaign.ts src/game/td/page/session.ts src/game/td/campaign.js src/game/td/sim.js src/game/td/skills.js scripts/test-td-lord-isis.mjs scripts/test-td-sim.mjs
git commit -m "feat(td): make Lord bonuses row scoped"
```

### Task 6: Derive Pantheon Bonds from mythology groups

**Files:**
- Modify: `src/data/gameBalance.tuning.json`
- Modify: `src/game/td/bonds.js`
- Modify: `src/game/td/sim.js`
- Modify: `src/game/td/page/campaign.ts`
- Modify: `scripts/test-td-sim.mjs`

**Interfaces:**
- Changes: each bond set uses `groupId` plus existing `name` and `tiers`; it no longer contains a `heroes` array.
- Changes: `bondsOf(cfg, heroes)` accepts hero objects containing `id` and `mythologyGroups`, returning the existing `{ id, name, count, tier, next, members }` shape.

- [ ] **Step 1: Add failing shared-membership tests**

Assert that all approved Greek and Norse heroes count from their runtime memberships, Egyptian and group-less heroes do not count, recruits remain wildcards for the largest native set with Norse winning ties, and a dual-group hero can contribute to the configured cultural bond without creating duplicate membership.

- [ ] **Step 2: Run the bond tests**

Run: `node scripts/test-td-sim.mjs`

Expected: FAIL because bond sets still own duplicated hero arrays and accept IDs.

- [ ] **Step 3: Migrate configuration and callers**

Replace the two `heroes` arrays with `groupId: "norse"` and `groupId: "greek"`. Update `bondsOf`, simulation calls, and squad-screen calls to pass hero objects. Preserve tiers, text, member indexes, and wildcard selection exactly.

- [ ] **Step 4: Verify Task 6**

Run: `node scripts/test-td-sim.mjs && node scripts/test-td-ui.mjs && npm run test:td-mythology`

Expected: all pass and no authored bond membership list remains.

- [ ] **Step 5: Commit**

```bash
git add src/data/gameBalance.tuning.json src/game/td/bonds.js src/game/td/sim.js src/game/td/page/campaign.ts scripts/test-td-sim.mjs
git commit -m "refactor(td): derive bonds from mythology groups"
```

### Task 7: Bounded campaign sampling and living documentation

**Files:**
- Create: `scripts/lib/td-squad-sample.mjs`
- Modify: `scripts/test-td-campaign.mjs`
- Modify: `scripts/td-stage-power.mjs`
- Modify: `scripts/td-layout-compare.mjs`
- Modify: `scripts/td-upgrade-sweep.mjs`
- Modify: `scripts/td-pacing.mjs`
- Modify: `scripts/td-board-tune.mjs`
- Modify: `TOWER_DEFENSE_SPEC.md`

**Interfaces:**
- Produces: `sampleCombinations(list, size, limit): any[][]`, deterministic and bounded without materializing every combination.

- [ ] **Step 1: Add a failing bounded-sampling test**

In `test-td-campaign.mjs`, assert deterministic output, unique combinations, correct combination size, inclusion of first/last spread, graceful handling when `list.length < size`, and a hard result cap for a 34-choose-10 input.

- [ ] **Step 2: Run the campaign test**

Run: `node scripts/test-td-campaign.mjs`

Expected: FAIL because the shared bounded sampler does not exist.

- [ ] **Step 3: Implement and adopt bounded sampling**

Implement `sampleCombinations` without constructing the full combination set. Replace recursive exhaustive `combos(...campaign.squadSize)` usage in the listed campaign analysis scripts and tests. Do not change hand-authored representative six-hero balance squads unless a script is specifically measuring campaign selection capacity.

- [ ] **Step 4: Update the living TD specification**

Document the seven groups, icon directory, two-row squad contract, save version, permanent row-scoped Lord semantics, Isis's current one-member Egyptian group, and shared Bond membership in `TOWER_DEFENSE_SPEC.md`.

- [ ] **Step 5: Verify Task 7**

Run: `node scripts/test-td-campaign.mjs`

Expected: the bounded sampler and campaign tests pass. Do not run a balance report or production build.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/td-squad-sample.mjs scripts/test-td-campaign.mjs scripts/td-stage-power.mjs scripts/td-layout-compare.mjs scripts/td-upgrade-sweep.mjs scripts/td-pacing.mjs scripts/td-board-tune.mjs TOWER_DEFENSE_SPEC.md
git commit -m "docs(td): document two-row Lord rollout"
```

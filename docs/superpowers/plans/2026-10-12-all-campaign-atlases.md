# All Campaign Atlases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the remaining campaign card selectors with the same interactive, textured atlas experience already proven in Chapter 4.

**Architecture:** Store chapter art and stage coordinates as authored data, keep campaign progress and rewards in the existing campaign model, and make `renderStages()` consume one generic atlas configuration for all chapters. The active atlas is the only full-size background rendered; stage buttons, route state, campfire, reward disclosure, drawer, and chapter navigation remain accessible DOM UI.

**Tech Stack:** Astro 7, plain TypeScript/JavaScript, JSON data, CSS, Node `node:test`/`assert`, static WebP assets.

**Spec:** `docs/art/campaign-atlas.md`

## Global Constraints

- Do not run `npm run build`; the repository owner runs production builds.
- Do not add production dependencies.
- Keep all existing campaign stage IDs, unlock rules, save data, rewards, laurels, drawer behavior, and squad flow unchanged.
- Keep public URLs stable.
- Load only the active chapter's full-size atlas image; do not preload all thirteen images.
- Respect `prefers-reduced-motion`; the campfire glow, sparks, and mist must become static.
- Keep each atlas asset at 2048×1152 WebP and below 700 KiB.
- Preserve keyboard access, visible focus, descriptive stage labels, and native disabled semantics.

## Review Focus

- Chapter 1 has ten stages while every later chapter has six; all points must render and remain selectable without assuming a fixed count.
- A save may point to the first stage of a later chapter; the atlas must open that chapter and center its next playable marker.
- Locked, cleared, next, and selected states can overlap; the visual priority must remain selected/next, cleared, then locked while the accessible label reports the true state.
- Portrait screens must pan the 16:9 world without stretching the artwork or hiding the current marker offscreen.
- Missing or malformed atlas data must fail a test with the chapter and stage ID, instead of silently returning to cards in production.

---

### Task 1: Author and validate the atlas manifest

**Files:**
- Create: `src/data/tdCampaignAtlases.json`
- Create: `src/game/td/campaign-atlas.js`
- Create: `scripts/test-td-campaign-atlas.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `src/data/tdCampaign.json` chapter IDs and ordered stage IDs; coordinates and asset names from `docs/art/campaign-atlas.md`.
- Produces: `campaignAtlasFor(atlases, chapter) -> { chapterId, image, stages }` and `atlasRoutePath(from, to) -> string` for the page renderer.

- [ ] **Step 1: Write the failing manifest coverage test**

Create `scripts/test-td-campaign-atlas.mjs` with assertions that every campaign chapter has exactly one atlas, every atlas stage ID equals the chapter's stage ID at the same index, every `x`/`y` is within `0..100`, every referenced image exists, and every WebP is at most `716800` bytes.

- [ ] **Step 2: Run the test and verify the missing module/data failure**

Run: `node scripts/test-td-campaign-atlas.mjs`

Expected: FAIL because `tdCampaignAtlases.json` or `campaign-atlas.js` does not exist.

- [ ] **Step 3: Add the exact atlas schema and all thirteen entries**

Write `src/data/tdCampaignAtlases.json` as an array of:

```js
{ chapterId: number, image: string, stages: Array<{ id: string, x: number, y: number, bend?: number }> }
```

Use `/td/campaign/<asset>.webp`, the coordinates in the spec, and per-segment `bend` values only where the direct quadratic route would cross a label or landmark. Chapter 1 must contain ten stage points; Chapters 2–13 contain six.

- [ ] **Step 4: Implement manifest validation and route construction**

In `src/game/td/campaign-atlas.js`, implement:

```js
export function campaignAtlasFor(atlases, chapter)
export function atlasRoutePath(from, to)
```

`campaignAtlasFor` must throw an error naming the chapter/stage when an entry is missing, duplicated, out of order, or outside the coordinate range. `atlasRoutePath` must use the destination point's optional `bend` to return one quadratic SVG path in the shared `0 0 100 100` coordinate system.

- [ ] **Step 5: Register and run the focused test**

Add `test:td-campaign-atlas` to `package.json` and include it in `test:tower-defense` beside the existing campaign test.

Run: `npm run test:td-campaign-atlas`

Expected: PASS with 13 atlases, 82 stage points, all asset and size checks green.

- [ ] **Step 6: Commit**

```bash
git add src/data/tdCampaignAtlases.json src/game/td/campaign-atlas.js scripts/test-td-campaign-atlas.mjs package.json
git commit -m "feat: define campaign atlas manifest"
```

### Task 2: Generalize the Chapter 4 renderer for every chapter

**Files:**
- Modify: `src/game/td/page/campaign.ts`
- Modify: `scripts/test-td-ui.mjs`

**Interfaces:**
- Consumes: `campaignAtlasFor()` and `atlasRoutePath()` from Task 1; existing `isUnlocked`, `isCleared`, `laurelFlags`, `stageBadge`, and reward helpers.
- Produces: one atlas DOM structure for any authored chapter, with no chapter-specific rendering branches.

- [ ] **Step 1: Add failing structural assertions**

Extend the campaign section of `scripts/test-td-ui.mjs` to assert that `campaign.ts` imports `tdCampaignAtlases.json`, calls `campaignAtlasFor`, uses `atlas.image`, maps `atlas.stages`, and no longer contains `chapter.id === 4`, the hard-coded Chapter 4 coordinate array, or the hard-coded `/td/campaign/frozen-covenant.webp` path.

- [ ] **Step 2: Run the UI test and verify the hard-coded implementation fails it**

Run: `node scripts/test-td-ui.mjs`

Expected: the new campaign-atlas assertions FAIL before the renderer changes. If an unrelated pre-existing assertion also fails, record it separately and continue using the named atlas assertions as the red/green signal.

- [ ] **Step 3: Replace the Chapter 4 branch with manifest-driven rendering**

Import the atlas data and helpers in `src/game/td/page/campaign.ts`. Resolve the current atlas once per `renderStages()` call, join its points to the chapter stages by validated index, use `atlas.image` for the landscape, and use `atlasRoutePath()` for each connection. Remove the card-rendering fallback for authored campaign chapters.

- [ ] **Step 4: Preserve all existing stage behavior**

Keep the current button markup and classes for `is-cleared`, `is-locked`, `is-next`, and `is-featured`; keep the accessible label, native disabled state, laurels, campfire on the next stage, drawer launch, and `data-td-autofocus`. Keep the compact reward `<details>` and bottom chapter rail for every chapter.

- [ ] **Step 5: Run focused campaign checks**

Run: `npm run test:td-campaign-atlas && node scripts/test-td-campaign.mjs`

Expected: both PASS.

- [ ] **Step 6: Run the UI assertions**

Run: `node scripts/test-td-ui.mjs`

Expected: all new atlas assertions PASS; report any unrelated existing failure by assertion name.

- [ ] **Step 7: Commit**

```bash
git add src/game/td/page/campaign.ts scripts/test-td-ui.mjs
git commit -m "feat: render every campaign chapter as an atlas"
```

### Task 3: Make navigation and framing work across all map shapes

**Files:**
- Modify: `src/game/td/page/campaign.ts`
- Modify: `src/styles/td.css`
- Modify: `scripts/test-td-ui.mjs`

**Interfaces:**
- Consumes: generic atlas DOM from Task 2.
- Produces: stable desktop, short-landscape, and portrait navigation with the current marker visible after chapter changes.

- [ ] **Step 1: Add failing responsive/navigation assertions**

Assert that the renderer centers `.is-next` after the new atlas DOM has been inserted, that the atlas image uses async decoding, and that CSS preserves a 16:9 coordinate plane, horizontal overflow, compact portrait chrome, and the existing bottom-sheet drawer rule.

- [ ] **Step 2: Run the targeted UI test and verify failure**

Run: `node scripts/test-td-ui.mjs`

Expected: at least the new centering or async-decoding assertion FAILS.

- [ ] **Step 3: Center the active stage after every chapter render**

In `renderStages()`, select `.td-atlas-stop.is-next`, falling back to `.td-atlas-stop.is-featured`, and set the atlas container's horizontal scroll so the marker center aligns with the viewport center. Clamp the result to the scroll range and use immediate scrolling during render to avoid motion on initial load.

- [ ] **Step 4: Consolidate atlas CSS**

Keep one `.has-campaign-atlas` layout for all chapters. Preserve the 16:9 world using container-relative sizing, remove obsolete card-selector overrides that can no longer apply, and ensure the title and rewards disclosure never intercept stage clicks. Keep the chapter rail at 30px minimum height and horizontally scrollable.

- [ ] **Step 5: Limit image work to the active chapter**

Render only the current `<img>`, add `decoding="async"`, use eager loading for the active image, and do not add hidden chapter images or JavaScript preloads.

- [ ] **Step 6: Verify responsive behavior in a local browser**

Check `1440×850`, `844×390`, and `390×844`. For Chapters 1, 4, 8, and 13 verify: the current stage is initially visible; the artwork is not stretched; chapter tabs remain reachable; the rewards disclosure opens and closes; a stage opens the drawer; “Choose squad” reaches the squad screen; returning preserves the chapter.

- [ ] **Step 7: Commit**

```bash
git add src/game/td/page/campaign.ts src/styles/td.css scripts/test-td-ui.mjs
git commit -m "fix: frame campaign atlases across screen sizes"
```

### Task 4: Calibrate every landmark overlay

**Files:**
- Modify: `src/data/tdCampaignAtlases.json`
- Modify: `docs/art/campaign-atlas.md`

**Interfaces:**
- Consumes: rendered atlases from Tasks 2–3 and the initial coordinates in the art spec.
- Produces: final reviewed stage placement and route bends for all 82 stages.

- [ ] **Step 1: Capture every chapter at desktop size**

Use the debug “All stages playable” option and capture Chapters 1–13 at `1440×850`. Review each stage against its named landmark and mark any label overlap, route crossing, or ambiguous destination.

- [ ] **Step 2: Adjust only authored coordinates and bends**

Move points within the spec's four-percentage-point tolerance. Use `bend` to route dotted connections around labels; do not add chapter-specific CSS selectors or renderer conditions.

- [ ] **Step 3: Capture the long and extreme cases on mobile**

Capture Chapters 1, 8, and 13 at `390×844`; confirm the next marker and its label are fully visible after automatic centering and that panning exposes every other stage.

- [ ] **Step 4: Re-run manifest validation**

Run: `npm run test:td-campaign-atlas`

Expected: PASS with the same 13 atlases and 82 ordered stage points.

- [ ] **Step 5: Record final coordinates and commit**

Update the coordinate table in `docs/art/campaign-atlas.md` to match the manifest.

```bash
git add src/data/tdCampaignAtlases.json docs/art/campaign-atlas.md
git commit -m "chore: calibrate campaign atlas landmarks"
```

### Task 5: Finish regression coverage and documentation

**Files:**
- Modify: `TOWER_DEFENSE_SPEC.md`
- Modify: `scripts/test-td-ui.mjs`
- Test: `scripts/test-td-campaign-atlas.mjs`

**Interfaces:**
- Consumes: final atlas behavior from Tasks 1–4.
- Produces: documented product behavior and repeatable verification for future chapter edits.

- [ ] **Step 1: Update the product specification**

Replace the obsolete “one row of full-height stage cards” campaign description with the atlas behavior: active chapter landscape, DOM stage markers, travel route, next-stage campfire, compact reward disclosure, bottom chapter rail, horizontal portrait pan, and stage-details drawer.

- [ ] **Step 2: Add state coverage for all stage classes**

Extend the atlas test fixture to prove that a representative chapter can render one cleared stage, one next stage, and one locked stage, and that the associated accessible strings are “Cleared”, “Ready to play”, and “Clear <stage> to unlock”. Keep this test at the helper/data level; do not duplicate campaign progression tests.

- [ ] **Step 3: Run final targeted verification**

Run: `npm run test:td-campaign-atlas && node scripts/test-td-campaign.mjs && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 4: Run the broader UI check once**

Run: `node scripts/test-td-ui.mjs`

Expected: PASS, or a final report that names any pre-existing unrelated assertion and shows all atlas assertions passed.

- [ ] **Step 5: Confirm repository constraints**

Verify no production dependency was added, all thirteen WebPs stay below 700 KiB, and `npm run build` was not run.

- [ ] **Step 6: Commit**

```bash
git add TOWER_DEFENSE_SPEC.md scripts/test-td-ui.mjs scripts/test-td-campaign-atlas.mjs
git commit -m "docs: specify campaign atlas experience"
```

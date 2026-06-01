# Status Dashboard and Local Admin Editing

Last updated: 2026-06-01

This document describes the internal project status dashboard, the local editing workflow, what has already been implemented, and sensible next improvements.

## Purpose

The status dashboard turns the project from a collection of many JSON files and Astro pages into a content operations surface.

Primary goals:

- Show the current inventory of heroes, pages, ratings, tags, bosses and content coverage.
- Surface missing or incomplete hero data quickly.
- Allow common hero maintenance tasks directly from the dashboard.
- Keep write access local-only, so the public static site does not expose a production write API.

The dashboard is available during local development at:

```text
/status
```

It is included in the sidebar/meta navigation only while running `npm run dev`.

The production build removes the generated `/status` directory, its dedicated client chunk and its sitemap entry. The dashboard is not deployed to the live site.

## How To Use

Run the Astro site:

```bash
npm run dev
```

Run the local admin server in a second terminal:

```bash
npm run tag-manager
```

Then open `/status` and use the `Edit` button in the hero inventory table.

The dashboard can render without the local admin server, but editing requires `npm run tag-manager`. If the server is missing, the drawer shows:

```text
Cannot reach local admin server: Failed to fetch. Start npm run tag-manager.
```

Restart `npm run tag-manager` after pulling or editing `scripts/tag-manager-server.js`. The dashboard checks the local server capabilities before opening the editor and again before saving. This prevents an older already-running server process from silently ignoring newer editor fields.

## Main Files

Dashboard and status calculation:

- `src/pages/status.astro`
- `src/utils/projectStatus.js`
- `astro.config.mjs`

Navigation:

- `src/data/nav.ts`

Local write server:

- `scripts/tag-manager-server.js`

Data files edited by the admin workflow:

- `src/data/heroes/{heroId}.json`
- `src/data/ratings/hero-ratings.json`
- `src/data/ratings/invest.json`

Tag source files:

- `src/data/tags.json`
- `src/data/tagCategories.json`

## What Has Been Implemented

### 1. Status Dashboard

The dashboard currently shows:

- Project health score.
- Hero totals.
- Released vs unreleased heroes.
- Missing overall ratings.
- Partial rating sets.
- Editorial enrichment backlog.
- CN nerf inventory linking to the CN preview page.
- Page inventory.
- Navigation coverage.
- Editorial strengths and weaknesses coverage.
- Route inventory.
- Internal routes kept outside public navigation.
- Rating, faction, class and role distributions.
- Hero maintenance table with search and filters.
- Separate enrichment status per hero, without treating missing editorial text as broken core data.
- Action queue entry for heroes missing strengths and weaknesses.

The dashboard is calculated from local source files at build/render time.

### 2. Page Cleanup

Unused Astro pages were removed after confirmation:

- `src/pages/damage-calculator.astro`
- `src/pages/guides.astro`
- `src/pages/hera-guide.astro`
- `src/pages/hero-upgrades.astro`
- `src/pages/serket.astro`
- `src/pages/tower.astro`

Kept intentionally:

- `src/pages/privacy.astro`
- `src/pages/design-system.astro`
- `src/pages/heroes/[id].astro`

`privacy` is linked from the footer. `design-system` is internal. `heroes/[id]` is the core dynamic hero detail route.

### 3. Local Admin Editing

The existing `tag-manager-server.js` was extended with local admin endpoints.

Current endpoints:

```text
GET   /api/admin/heroes/:id
GET   /api/admin/capabilities
PATCH /api/admin/heroes/:id
PATCH /api/admin/ratings/:id
PATCH /api/admin/invest/:id
POST  /api/admin/validate
POST  /api/heroes/:id/synergies
GET   /api/tag-categories
```

The existing tag-manager endpoints remain available.

### 4. Hero Edit Drawer

The `/status` page now has an `Edit` action per hero.

The drawer currently supports:

- Release toggle.
- New hero badge toggle.
- Description.
- Core mechanic.
- Ratings:
  - Overall
  - PvP
  - PvE
  - PvE Early
  - PvE Late
- Investment info:
  - Relic recommendation
  - Used in
  - F2P investment
  - Explanation
- Synergy tags:
  - Loaded from `tagCategories.json` through the local server.
  - Searchable.
  - Grouped by category.
  - Saved into each hero JSON's `synergies` array.
- Strengths and weaknesses:
  - Editable as separate repeatable text lists.
  - Saved into each hero JSON's `strengths` and `weaknesses` arrays.
  - Empty entries are removed during save.
  - HTML fragments are rejected by the local admin API so the public component receives plain text.

After saving, the drawer shows:

- Which files were changed.
- Whether validation passed.
- Expandable validation output when a check fails or needs inspection.

Current post-save validation checks:

- `npm run validate:tags`

The local API also knows a `heroDetailStats` validation check, but it is not run automatically because it depends on the external `leak/game_extracted/.../hero_detail.json` file being present.

### 5. Synergy Tag UI

The synergy tag UI started as a functional first pass and was then improved after visual review.

Current behavior:

- Human-readable labels are shown as primary text, for example `ATK Spd Up`.
- Technical tag IDs remain visible as small secondary text, for example `ATK_SPD_UP`.
- Tags are grouped in category panels.
- Selected tags use a custom check indicator and gold highlight.
- A compact summary shows currently selected tags.
- A clear button removes all selected tags for the currently edited hero.

Important implementation note:

The tag chips are created dynamically in client-side JavaScript. Astro CSS is scoped by default, so the dynamically generated chip classes must be styled with `:global(...)` in `status.astro`. Without this, the browser shows native checkboxes and broken inline layout.

### 6. Strengths And Weaknesses Enrichment

Strengths and weaknesses are treated as editorial enrichment, not as a core health check. Missing lists are visible in the dashboard, but they do not reduce a hero's technical completeness score or mark the hero as broken.

Current data state:

- 9 of 79 heroes have both lists.
- 70 heroes still need enrichment.
- Hera and Jiutian Xuannv were populated from their existing guide JSON files.
- Existing Nuba entries were normalized from HTML fragments to plain text.
- Public hero detail pages hide the entire strengths and weaknesses section when both lists are empty.

### 7. Flags Cleanup And Investment Source

The former `Flags` section was removed from the drawer after reviewing its actual usage.

- `activeBug` and `activeBugNotes` had no active hero entries and are no longer rendered publicly.
- Hero-level `f2pInvestment` was unused.
- Hero-level `recommendedRelicLevel` duplicated the richer relic recommendation stored in `invest.json`.
- The small relic-level badge based on `recommendedRelicLevel` was removed from public hero detail pages.
- `newHero` remains available under `Basics` because the public hero cards actively use that badge.

`src/data/ratings/invest.json` is now the single editable source for relic recommendations and F2P investment guidance. Historical hero JSON fields remain in place for now, but they are no longer read or edited by the application.

### 8. CN Comparison As Inventory

CN comparison data is informational, not a per-hero maintenance requirement. Most heroes are expected to match the CN base version.

- Missing `cn` blocks do not appear in hero `Missing` labels.
- CN data does not affect per-hero completeness or project health.
- The dashboard shows a neutral `Heroes nerfed` KPI instead.
- The KPI links to `/cn-preview` for the detailed comparison.

### 9. Common Hero Expectations

Common heroes intentionally use a smaller dashboard completeness checklist.

- `Relic`, `Virtues` and `Comps` are not required for heroes with rarity `Common`.
- These fields do not appear in their hero-level `Missing` labels and do not reduce their completeness percentage.
- Cancer remains fully evaluated as an explicit exception. It is currently stored as rarity `Epic`.

## Local-Only Safety Model

The public site is static. JSON file writing happens only through the local Express server.

This means:

- Production deploys do not expose these write endpoints.
- Edits are local filesystem writes.
- Git remains the safety net for reviewing and reverting changes.
- The dashboard can be deployed as a read-only status surface, but editing only works when `npm run tag-manager` is running locally.

## Validation

After editing hero data, run:

```bash
npm run build
```

For hero JSON or synergy changes, also run:

```bash
npm run after:hero-edit
```

For tag-list or tag-category changes, run:

```bash
npm run after:tags
```

Known note: `WORKFLOWS.md` contains some stale historical script descriptions. Check `package.json` before relying on any workflow command.

## Current Limitations

- The dashboard totals are calculated at page render/build time. After saving in the drawer, refresh the page to recalculate all dashboard metrics.
- The visible row updates release, overall rating and strengths/weaknesses enrichment immediately, but aggregate coverage numbers require refresh.
- There is no undo button in the UI yet. Use Git to inspect and revert local changes.
- There is no batch editing yet.
- Validation runs automatically after save, but there is not yet a separate manual `Run validation` button.
- Tag creation, rename and deletion still live in the old tag-manager frontend/server workflow.
- The edit drawer does not yet cover complex hero structures such as skills, relic upgrade arrays, virtues, detailed comps, CN comparison blocks or synergy links.
- `invest.json` already had local changes before this feature work. Treat those as user-owned changes.

## Recommended Next Improvements

High value:

- Add a manual `Run validation` button for checking without saving.
- Add a dirty-state warning before closing the drawer.
- Add an inline refresh/recalculate action for dashboard metrics.
- Add optimistic row updates for status, missing fields and coverage.
- Add a local-only badge when the admin server is reachable.

Data safety:

- Add optional `.bak` snapshots before writes.
- Add stricter schema validation for hero JSON fields.
- Add clearer rating tier validation if the rating system changes.
- Add a save preview/diff before writing.

Editing UX:

- Add section tabs inside the drawer: Basics, Ratings, Editorial, Investment, Tags.
- Add "only show selected tags" mode.
- Add "missing fields only" mode for a hero.
- Add bulk actions for unreleased heroes.
- Add quick release/unrelease directly from the table.

Tag management:

- Move tag create/rename/delete into the dashboard as a separate admin panel.
- Add drag-and-drop category ordering.
- Add tag usage counts.
- Add "unused tags" and "uncategorized tags" dashboard warnings.

Longer term:

- Split `status.astro` into smaller components if the file grows further.
- Consider a dedicated `/admin` route if more editing features are added.
- Add proper local auth only if the admin server is ever exposed beyond localhost.

## Design Notes

The dashboard should feel like an operations tool, not a marketing page.

Preferred direction:

- Dense but readable desktop-first layout.
- Small typography where it helps scanning.
- Clear status colors, used sparingly.
- No oversized hero sections.
- Cards only for KPI groups, panels and repeated items.
- Forms should use real controls: toggles, selects, textareas, chips and buttons.

For dynamically generated UI in Astro pages, remember that scoped CSS will not apply unless dynamic classes are styled globally.

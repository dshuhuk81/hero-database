# Ananke Guide Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for this small content addition.

**Goal:** Add a general Ananke guide in the existing guide family.

**Architecture:** One static Astro page reuses Base, GuideSectionNav, EvidenceBadge, HeroChips and guide-v2.css. Skill and relic disclosures read the current hero JSON directly. Register the page in the existing guide index.

**Tech Stack:** Astro, TypeScript, existing plain CSS.

**Spec:** `docs/superpowers/specs/2026-11-13-ananke-guide-design.md`, approved with the owner's general-information correction.

## Global Constraints

- No battle results without separate owner approval; no invented game facts.
- Preserve owner edits in hero JSON and skill-label data.
- No new dependencies, build, deployment or shared-style redesign.
- Work in the existing checkout to preserve access to current uncommitted hero text and ignored battle sources. This reversible content-only addition needs no new unit tests under AGENTS.md.

## Review Focus

- Phone width: readable disclosures and no page-level overflow.
- Current skill names and swapped data slots: use names and data IDs, not assumed client ordering.
- Investment: distinguish relic text stages from enhancement levels and unknown duplicate requirements.
- Evidence: partner abilities are not proof of optimized teams or hidden interactions.
- Navigation: discoverable guide entry, working section links and hero links.

### Task 1: Guide and index

- [x] Create `src/pages/guides/ananke.astro`: decision, mechanics, relic, build and partners, modes, sources. Exact text in optional disclosures; all practical claims grounded in client text.
- [x] Add Ananke first in `src/data/guides.ts`, updated 2026-11-13.
- [x] Check with `npm run check`; render using Astro dev. Inspect desktop/mobile and expand disclosures. Check links, imagery and content boundaries.
- [x] Obtain a fresh review of the final content and responsive render, fix material issues, record verification. Leave changes reviewable in the working tree.

## Rulings and progress

- Native execution follows the owner's approval to implement. No additional execution-method question: the work is a single reversible content task.
- Existing guide world is fixed. No concept draw, new font, generated imagery or design-system changes.

## Verification record

- Public route and guide index: HTTP 200, Ananke listed once.
- Targeted Astro check of new guide and index: 0 errors (temporary tsconfig outside the repository). Full project check: 223 errors in unchanged existing files, none in the changed files.
- Four-width browser matrix: 375, 390, 768, 1440 px; no page overflow; all 14 disclosures open/close without overflow; all 17 internal destinations HTTP 200; all portrait images load after lazy loading.
- Source detector: no findings in the new page. Full-site taste inspector identifies inherited guide/site styling and heuristic findings; it is not a clean whole-site design audit. Shared styles are outside this change.
- Fresh content review identified Phoenix's ability classification; corrected to the actual named skill Ashes to Everflame. Separate ordinary-extension documentation review confirms no design-system edits are needed.
- No build or deployment. Owner changes to hero JSON and skill-label data were preserved.

Final reviewer disposition: ship; Phoenix correction resolved. Documentation check: ordinary extension, no shared design changes.

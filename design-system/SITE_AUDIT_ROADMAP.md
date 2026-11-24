# Site Audit and Redesign Roadmap

This document records the planned migration of the remaining Motto Immortal
Database pages to the visual direction established by:

- The redesigned homepage
- The tier list
- The hero detail pages
- [STYLE_GUIDELINES.md](./STYLE_GUIDELINES.md)

Work should be implemented incrementally, starting with shared foundations and
one representative page per page family. Completed phases are recorded here so
the document also serves as the migration tracker.

## Repository review: 23 November 2026

The July migration record below is historical. This review checked the current
routes, components, styles, redirects, Git history, and the local project
dashboard's milestone parser. It did not repeat the browser checks or certify
the current production deployment. Historical approvals are retained; they do
not imply that later changes received a new visual acceptance review.

The dashboard reads the migration overview table directly from this file; it
does not infer completion from application code. Phase 6 remains in progress,
but its remaining scope is user acceptance of the new Bosses directory and guides.
The user confirmed Events, Delusions Den, and Virtues as accepted on
23 November 2026; they are closed and excluded from remaining work.

| Area | Current evidence | Roadmap consequence |
| --- | --- | --- |
| Bosses | Redesigned directory in `src/pages/bosses.astro`, seven individual guides in `src/pages/bosses/[id].astro`, shared artwork and team components | Implemented and developer-verified on 23 November 2026; user visual acceptance pending |
| Events | `src/components/pages/EventsPage.astro` is a localized Global-client calendar with current/upcoming events, filters, date ranges, a mobile list, and detail dialogs | Accepted by the user on 23 November 2026; removed from active scope |
| Delusions Den | Route deleted on 11 September 2026 (`d69f93e9`); no replacement route or redirect is present | Accepted as closed by the user on 23 November 2026; removed from active scope |
| Virtues | `src/pages/virtues.astro` retains the F2P verdict, set bonuses, search, and singular-piece exclusion | Accepted by the user on 23 November 2026; removed from active scope |
| Summon Calendar | Replaced on 28 October 2026 (`25da4378`); `public/_redirects` sends `/summon-calendar` to `/banners` | Use `src/components/pages/BannersPage.astro` for future work |
| CN Preview | `src/pages/cn-preview.astro` deleted on 11 August 2026 (`9d3033af`) | Historical Phase 3 completion, no active CN Preview migration |
| Status | Public dashboard deleted on 23 November 2026 (`04e35fd9`) | Remove from Phase 7; the local project dashboard is a separate tool |
| Guides | Nidhogg and Ananke use the newer decision-first guide components; Ananke was migrated on 23 November 2026 (`b8af564b`, `8d9da3ff`) | July Phase 4 completion does not represent completion of this newer guide rollout |

## Main findings

The initial audit identified `src/components/PageHero.astro` as the largest
shared weakness. Its redesign and the accompanying shared layout foundations
were completed in Phase 1.

The initial audit also found substantial CSS consolidation work. These are
historical baseline measurements, not current counts:

- `src/styles/components.css`: 8,480 lines and 247 raw color declarations
- `src/styles/tips.css`: 889 lines and 70 raw color declarations
- `src/pages/virtues.astro`: 140 raw color declarations
- `src/pages/delusions-den.astro`: 135 raw color declarations

This does not mean every page needs to be rewritten. Several pages are already
structurally sound and primarily need stronger hierarchy, mobile refinement,
and token alignment.

## Migration overview

| Phase | Scope | Status | Primary objective |
| --- | --- | --- | --- |
| 1 | Shared foundations | Approved and complete | Establish the new page header, section title, card, toolbar, tabs, and content-list patterns |
| 2 | Tips | Approved and complete | Make the most important F2P content the strongest content experience |
| 3 | Database pages | Approved and complete | July migration complete for Totems, Hero Stats, Relic Investment, and the since-removed CN Preview |
| 4 | Guides | Approved and complete | July hub/navigation migration complete; newer decision-first guide rollout tracked separately |
| 5 | Tools | Approved and complete | July tools migration complete; Summon Calendar since replaced by Banners |
| 6 | Large specialist pages | In progress | Review the implemented Bosses directory and individual guides; Events, Delusions Den, and Virtues accepted and closed |
| 7 | Meta pages | Planned | Refresh About and Privacy; public Status dashboard removed |

## Phase 1: Shared foundations

**Status: approved and completed on 31 July 2026.**

Implemented foundations:

- Redesigned the shared `PageHero` with the typography and visual strength of
  the new site, using a compact subpage height
- Added reusable section-heading, raised-panel, content-list, toolbar, tab,
  action, and content-state primitives
- Added Astro primitives for section headers, surface panels, and content
  states
- Added a design-system showcase for reviewing the shared primitives
- Standardized the content width of Relic Investment, CN Preview, Tips, Summon
  Calculator, Wishlist, Virtue Wizard, and About
- Added `--page-content-start` and the shared `.page-content` convention so all
  current `PageHero` pages begin their content at the same vertical position
- Removed page-specific first-content offsets that conflicted with the shared
  rhythm

The shared primitives are now the baseline for subsequent phases. Page-specific
mobile table behavior and specialist interactions should be implemented when
their respective page families are migrated.

## Phase 2: Tips first

**Status: approved and completed on 31 July 2026.**

`src/pages/tips.astro` was selected as the first content redesign because it is
the most useful F2P destination.

Implemented changes:

- Added a prominent, localized "Start here" F2P decision section
- Made Early Game the first visible category and reordered categories around
  the player journey
- Used the redesigned shared `PageHero` as the editorial header
- Clarified the four-category tab navigation with mobile scrolling and
  accessible 44px targets
- Added three concise priorities with direct links into the detailed guide
- Surfaced the most common early investment mistake before the long-form
  content
- Replaced repetitive article cards with a quieter, whitespace-led reading
  flow while retaining cards for meaningful grouped information
- Aligned all tab content to the full shared page width
- Restyled "On this page" navigation to match the hero-detail tab language,
  with active scrollspy highlighting and intentional mobile overflow
- Kept the section navigation in normal document flow so it does not compete
  with the sticky category bar
- Preserved deep links, keyboard navigation, tab semantics, translations, and
  existing detailed content
- Built new styling with the global spacing, typography, surface, border, and
  color tokens

This page is now the reference template for long-form educational content.

## Phase 3: Database and comparison pages

**Status: approved and completed on 31 July 2026.**

The shared `PageHero` update badge was also removed during this phase. Its
variable height changed header geometry between routes, while the information
was not important enough to justify that movement.

### Totems

Implemented changes:

- Established a rating-first hierarchy and shared raised-card styling
- Added a consistent, overflow-safe image stage at every breakpoint
- Reduced the visual weight of individual upgrade-effect rows
- Added localized section context and a rated-totem count
- Removed the unused legacy header and raw legacy card styling
- Verified the artwork containment fix at desktop, tablet, and mobile widths

### Hero Stats

Implemented changes:

- Explained what comparison the table helps users make
- Kept sticky hero identity and column headers
- Added keyboard-accessible column sorting
- Applied the shared search and control toolbar
- Reduced mobile columns to Hero, Might, HP, and ATK by default
- Added an optional "All stats" view for the full comparison table

### Relic Investment

Implemented changes:

- Added a clear purpose and recommendation hierarchy
- Applied the shared toolbar, input, surface, and content-heading patterns
- Strengthened the relic target treatment using global tokens
- Aligned portraits and metadata with the hero database experience

### CN Preview

Historical implementation: this route was removed on 11 August 2026. The
following records the July work, not a currently available page.

Implemented changes:

- Explained why CN differences matter and framed them as forecasts
- Led with a verdict-style overview on one strong shared surface
- Applied the shared heading, badge, and card hierarchy
- Added a clear changed-hero directory heading and count
- Converted wide comparison rows into readable mobile value cards

## Phase 4: Guides

**Status: approved and completed on 31 July 2026.**

This records the July navigation and directory migration. The newer
decision-first guide rollout is separate: Nidhogg and Ananke are implemented
examples, while the remaining hero guides need individual assessment against
`DESIGN.md` and `design-system/guide-redesign/`. Do not mark that rollout
complete from this phase's historical status.

Implemented changes:

- Rebuilt the guides hub around a lean, prioritized directory instead of
  presenting every destination with equal visual weight
- Added one prominent featured guide for both the game-mode and hero-guide
  families
- Replaced repetitive guide-card grids with compact, responsive directory rows
- Added concise hub context that explains how the guides are structured and
  what players can expect
- Created a reusable "On this page" component that derives its links directly
  from each guide's section headings
- Added active-section scrollspy highlighting, intentional horizontal mobile
  overflow, and reliable deep-link positioning
- Applied the shared section navigation to the conventional hero guides and
  game-mode guides
- Preserved Hallowed Arklash's bespoke navigation because its planner workflow
  has different interaction requirements
- Removed the doubled first-section spacing introduced by the new navigation
- Retained the established cinematic guide headers and existing decision,
  comparison, skill, team, and investment content
- Verified the hub, a representative hero guide, and a representative
  game-mode guide at desktop and mobile widths
- Confirmed there is no unintended horizontal overflow, no browser errors, and
  that generated navigation links match the available guide sections

## Phase 5: Tools

**Status: approved and completed on 31 July 2026.**

### Summon Calculator

Implemented changes:

- Preserved the existing strongly tokenized calculator and probability logic
- Clarified the input-to-result sequence through the existing numbered panels
- Moved current pity counters into an advanced disclosure that is collapsed by
  default
- Retained immediate result recalculation when summon resources change
- Verified the advanced controls, calculations, and mobile form layout

### Summon Calendar

Historical implementation: replaced by `/banners` on 28 October 2026. The
current implementation is `src/components/pages/BannersPage.astro`, with
running/upcoming banners, history, search, and filters. Old calendar URLs
redirect to `/banners`; the forecast redesign below is historical.

Implemented changes:

- Replaced the bespoke legacy header with the shared `PageHero`
- Added concise forecast context and a visual confidence key
- Made the nearest projected release the dominant calendar item
- Removed redundant far-future spotlight cards
- Kept speculative releases in the complete chronological timeline
- Clearly separated released, coming-soon, and far-future entries
- Improved the mobile-first timeline presentation and content hierarchy

### Virtue Wizard

Implemented changes:

- Added a clear choose-hero, add-sets, and check-fit onboarding sequence
- Added numbered setup and live-result panels
- Strengthened empty, successful, and unsuccessful placement result states
- Replaced poorly spaced native select chevrons with a consistently positioned
  custom chevron, additional right padding, and visible keyboard focus styling
- Added a compact mobile and tablet workspace switch between Build Setup and
  Placement Preview
- Kept setup and preview visible side by side on desktop
- Preserved selected heroes and sets when switching between mobile panels
- Verified the revised workflow at mobile and desktop widths

The improved select styling remains scoped to the Virtue Wizard. It can become
a shared form primitive after other select controls have been audited.

### Wishlist

Implemented changes:

- Added readable hero names to all Wishlist cards
- Identified the first-priority hero for each regular faction
- Used localized priority labels across supported languages
- Preserved direct links to localized hero detail pages
- Retained the established faction artwork while making the recommendation
  order understandable without relying on image position alone

### Verification

- Confirmed no unintended horizontal overflow at desktop and narrow-mobile
  widths
- Confirmed no browser console errors during the tool workflows
- Verified calculator recalculation, pity disclosure, Wizard hero-grid loading,
  Wizard mobile panel switching, Wishlist labels, and all calendar timeline rows
- Completed a production build of all 434 generated pages

## Phase 6: Large specialist pages

**Status: in progress; scope reconciled on 23 November 2026.**

Events, Delusions Den, and Virtues were explicitly accepted by the user on
23 November 2026 and removed from the open scope, including the follow-up
checks and cleanup proposed in the repository review. Only Bosses remains open.

### Bosses

**Status: implemented and developer-verified on 23 November 2026; user visual
acceptance pending.**

The user selected separate boss pages, using the supplied illustrated directory
and guide references while retaining this site's CI and actual game content.
Design: `docs/superpowers/specs/2026-11-23-boss-pages-design.md`.

Implemented:

- Seven vertically stacked directory tiles with large boss artwork, individually
  chosen crops, actual mode/summary, and ordinary links to `/bosses/<id>`
- Seven statically generated boss guides with an illustrated header, fight
  strategy, all 13 recorded team variants, mechanics, metadata, and full skills
- Shared artwork and team components; preserved source team order, hero links,
  mixed-case name resolution, skill-icon aliases, and unknown-hero placeholders
- No new game facts, production dependencies, or source JSON changes; preserved
  the existing Nian Beast exclusion and directory boss-ID anchors
- Static section navigation instead of the former boss tabs and document-wide
  arrow-key handler; native links work without JavaScript
- Removed the unused 831-line legacy boss style block; new styles live in
  `src/styles/bosses.css`

Developer verification:

- `npm run check`: 0 errors, 0 warnings, 0 hints
- Adapter and existing navigation tests: 10 passed
- Eight successful dev-server routes and an unknown-boss 404
- All routes rendered at 375, 768, and 1440px: 24 checks for overflow, content
  counts, section anchors, canonical URLs, and minimum interaction target sizes
- Verified keyboard activation/focus, image-error fallbacks, reduced-motion
  mode, and Lilith's strategy/all three teams with JavaScript disabled
- Inspected directory and representative guide screenshots; independent code
  review reported no material findings

These are local development checks, not a production-build or deployment
verification. Final user visual acceptance remains open. Events, Delusions Den,
and Virtues remain accepted and closed.

## Phase 7: Meta pages

About and Privacy should use the same typography, page width, and
surface styling, but they are lower priority than player-facing content.

**Status: planned; partial foundations already present.** About uses `PageHero`
and the shared page-width tokens but retains extensive local styling. Privacy
still uses its own header and layout. Review their typography, surfaces, mobile
behavior, and obsolete copy against current site functionality. The public
Status dashboard was removed on 23 November 2026 and is no longer in scope.

## Recommended execution order

Remaining work after the 23 November repository review:

1. Obtain user visual acceptance of the implemented Bosses directory and guides.
2. Refresh About and Privacy after the Bosses work.

Separately track the newer decision-first hero-guide rollout. Phases 1–5
remain historical completed migrations, not instructions to repeat them. Removed
routes (Delusions Den, CN Preview, Status) and the replaced Summon Calendar are
not active redesign tasks.

## Implementation method

For each step:

1. Audit the page's information priority before changing its presentation.
2. Remove duplicate or low-value content.
3. Design the mobile reading order first.
4. Redesign one representative page from the selected family.
5. Validate desktop, tablet, and narrow mobile layouts.
6. Extract repeated patterns into shared components.
7. Apply those components to related pages.
8. Replace local visual values with global tokens.
9. Verify keyboard access, focus states, reduced motion, and missing-data states.
10. Run checks appropriate to the change. Per `AGENTS.md`, the user runs the
    production build; do not run it without their request. Record browser checks
    separately from source checks and historical verification.

Do not migrate an entire page family before the representative page has been
reviewed and accepted.

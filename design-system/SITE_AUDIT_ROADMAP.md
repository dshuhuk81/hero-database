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

## Main findings

The initial audit identified `src/components/PageHero.astro` as the largest
shared weakness. Its redesign and the accompanying shared layout foundations
were completed in Phase 1.

The initial audit also found substantial CSS consolidation work:

- `src/styles/components.css`: 8,480 lines and 247 raw color declarations
- `src/styles/tips.css`: 889 lines and 70 raw color declarations
- `src/pages/virtues.astro`: 140 raw color declarations
- `src/pages/delusions-den.astro`: 135 raw color declarations
- `src/pages/status.astro`: 76 raw color declarations

This does not mean every page needs to be rewritten. Several pages are already
structurally sound and primarily need stronger hierarchy, mobile refinement,
and token alignment.

## Migration overview

| Phase | Scope | Status | Primary objective |
| --- | --- | --- | --- |
| 1 | Shared foundations | Approved and complete | Establish the new page header, section title, card, toolbar, tabs, and content-list patterns |
| 2 | Tips | Approved and complete | Make the most important F2P content the strongest content experience |
| 3 | Database pages | Approved and complete | Modernize Totems, Hero Stats, Relic Investment, and CN Preview |
| 4 | Guides | Approved and complete | Standardize the guides hub, hero guides, and game-mode guides |
| 5 | Tools | Approved and complete | Align calculators, calendars, Wishlist, and Virtue Wizard |
| 6 | Large specialist pages | In progress | Carefully simplify Bosses, Events, Delusions Den, and Virtues |
| 7 | Meta pages | Planned | Refresh About, Changelog, Privacy, and Status last |

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
  Calculator, Wishlist, Virtue Wizard, Changelog, and About
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

Implemented changes:

- Explained why CN differences matter and framed them as forecasts
- Led with a verdict-style overview on one strong shared surface
- Applied the shared heading, badge, and card hierarchy
- Added a clear changed-hero directory heading and count
- Converted wide comparison rows into readable mobile value cards

## Phase 4: Guides

**Status: approved and completed on 31 July 2026.**

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

These pages require careful work because they contain substantial information
and bespoke interfaces.

### Delusions Den

`src/pages/delusions-den.astro` is one of the largest visual outliers.

Recommended changes:

- Put a concise strategy at the top
- Use progressive disclosure for secondary mechanics
- Separate rules, rewards, and compositions clearly
- Reduce nested cards
- Use a standard hero composition component
- Perform a major token cleanup

### Virtues

**Status: approved and completed on 31 July 2026.**

Implemented changes:

- Added one dominant F2P verdict focused on useful 2-piece bonuses
- Prioritized Fervor II + III, free unequipping, and protecting Epic and
  Legendary pieces
- Removed the duplicated rarity overview and repeated Fervor callout
- Reduced farming guidance to the actionable Blue and Red cube decisions while
  retaining the pity track and shard formula
- Replaced the complete star-level table with the essential level-40 upgrade
  rule
- Removed low-value Realm Rover facts while retaining unlock requirements,
  relevant rewards, the efficient Top 20% target, and shop priorities
- Removed Singular filler pieces and individual BP/base-stat noise from the
  primary database experience
- Retained set artwork, rarity, piece names, and the effects players use to
  make build decisions
- Added an accessible search that matches set names and bonus effects
- Improved tab semantics, active states, keyboard focus, content width,
  typography, spacing, and token usage
- Verified all 16 set families, search results, no-match handling, tabs, and
  desktop/mobile layouts without horizontal overflow or browser errors

### Bosses and Events

These pages already have meaningful content structures.

Recommended changes:

- Put the verdict and recommended team first
- Show boss mechanics second
- Mark beginner and F2P alternatives clearly
- Use a shared hero team component
- Remove repeated hero metadata
- Improve horizontal behavior on mobile

## Phase 7: Meta pages

About, Changelog, and Privacy should use the same typography, page width, and
surface styling, but they are lower priority than player-facing content.

`src/pages/status.astro` is extremely large and appears closer to internal
tooling. It should be treated separately and should not delay public-facing
improvements.

## Recommended execution order

1. Shared `PageHero` and page primitives
2. Tips
3. Relic Investment
4. Totems
5. Hero Stats
6. Guides index
7. One representative hero guide
8. Bosses and Events
9. Summon Calendar
10. Summon Calculator and Virtue Wizard
11. Delusions Den
12. Virtues
13. About, Changelog, and remaining utility pages

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
10. Run the full production build before handoff.

Do not migrate an entire page family before the representative page has been
reviewed and accepted.

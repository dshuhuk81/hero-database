# Motto Immortal Experience Guidelines

These guidelines define the visual and editorial direction established by the
hero detail pages. Use them when creating a page, revising a component, or
auditing an older part of the site.

The design system page documents available tokens and components. This document
defines how they should be used.

## Design objective

Build interfaces that feel:

- Clear before clever
- Visually strong without becoming noisy
- Spacious, deliberate, and easy to scan
- Useful on mobile rather than merely functional
- Focused on decisions players need to make
- Consistent with the game's visual character

Every screen should answer three questions quickly:

1. What am I looking at?
2. What is most important here?
3. What can I inspect or do next?

## Core principles

### 1. Establish one dominant idea

Every page needs a clear visual entry point. This can be a hero, a title, a
rating, a result, or a primary action.

- Use large headings and strong imagery for the primary subject.
- Give the most important value the greatest visual weight.
- Keep supporting metadata visibly secondary.
- Avoid several components competing for first attention.

For ratings, Overall is dominant. Mode ratings follow. Missing values are
honest `N/A` placeholders and never invented grades.

### 2. Show only useful information

Content earns its place by helping the user understand, compare, or decide.

- Remove duplicate labels, explanations, and repeated metadata.
- Prefer a visual comparison when it communicates the result sufficiently.
- Hide empty optional sections rather than showing empty containers.
- Use placeholders only when they explain the future structure.
- Do not display implementation notes, data limitations, or internal language
  on production pages.

When unsure, remove the element and check whether the page still communicates
the same decision.

### 3. Use whitespace as structure

Whitespace separates concepts and communicates hierarchy.

- Use generous space between major sections.
- Use tighter, consistent spacing within related cards.
- Avoid filling empty space merely to make a page feel complete.
- Prefer a few well-composed groups over many bordered boxes.
- Align content to a shared page grid.

Use spacing tokens from `src/styles/tokens.css`. Do not introduce arbitrary
spacing when an existing token is close enough.

### 4. Typography carries hierarchy

The interface uses scale and weight before ornament.

- Page and hero names should be large, compact, and unmistakable.
- Section titles should be strong and consistent.
- Labels use small uppercase text only for metadata and grouping.
- Body copy should remain readable, quiet, and comfortably spaced.
- Avoid long centered paragraphs.
- Avoid decorative typefaces unless a future global brand decision introduces
  one intentionally.

Use the global type scale and weight tokens. Do not hardcode new font sizes for
routine UI.

### 5. Mobile is a primary layout

Mobile is designed independently, not produced by shrinking desktop.

- Start with the narrow layout and progressively enhance it.
- Keep the primary subject and primary value visible early.
- Stack complex two-column sections before they become cramped.
- Let card collections wrap naturally.
- Size tap targets to at least 40–44 pixels.
- Avoid horizontal scrolling except for intentional navigation strips.
- Keep labels readable without relying on hover.
- Test long hero, skill, mode, and localized names.

Recommended layout checkpoints:

- Narrow mobile: up to 480px
- Mobile/tablet: up to 720–768px
- Compact desktop: up to 1000–1024px
- Full desktop: above 1024px

Breakpoints may vary when the content requires it; they should not be chosen
only because a device category exists.

### 6. Imagery lives in a controlled stage

Hero artwork should feel cinematic without changing the page geometry.

- Give hero artwork a fixed-height, overflow-hidden stage per breakpoint.
- Preserve source aspect ratio.
- Anchor portraits consistently, normally bottom-center.
- Allow exceptional heroes to define optional scale and vertical offset values.
- Use gradients to maintain text contrast.
- Do not let transparent padding or tall weapons determine header height.

Per-hero positioning is an exception. Defaults should work for most heroes.

### 7. Cards express grouping, not decoration

Use cards when their boundaries clarify a reusable or comparable unit.

- Prefer `--bg-surface` and `--bg-raised` for elevation.
- Prefer borders and surface changes over heavy shadows.
- Use the shared radius scale.
- Keep comparable cards structurally consistent.
- Let card width follow content when equal width adds unnecessary empty space.
- Do not put a card inside another card without a clear hierarchy.

### 8. Color communicates meaning

- Use global color tokens.
- Reserve bright accents for status, selection, rarity, ratings, and key focus.
- Use faction color as a contextual accent, not as the entire interface.
- Use canonical tier colors through `data-tier`.
- Use muted text for supporting information, not for essential instructions.
- Maintain sufficient contrast over artwork and translucent surfaces.

Do not copy raw color values from another page. Add or reuse a semantic token.

### 9. Interaction should be obvious and restrained

- Interactive elements need visible hover and keyboard-focus states.
- Motion should confirm state or spatial relationships.
- Use short global transition tokens.
- Avoid animation that delays reading.
- Respect `prefers-reduced-motion`.
- Do not make static information look clickable.
- Do not hide essential information inside accordions without a real density
  problem.

### 10. Data states are part of the design

Every component should intentionally handle:

- Complete data
- Missing optional data
- `N/A` or not-yet-rated data
- Long translated content
- One item and many items
- Missing artwork
- Unreleased content

Never render objects through implicit string conversion. Localized values must
be resolved through the i18n helpers before rendering.

## Page composition

A strong content page normally follows this order:

1. Identity: subject, image, name, essential metadata
2. Verdict: rating, result, or primary recommendation
3. Explanation: mechanics, skills, or supporting evidence
4. Detail: statistics and deeper reference data
5. Recommendations: builds, virtues, synergies, investment
6. Optional specialist content

The order should follow user intent rather than the order of fields in a data
file.

## Implementation rules

- Wrap production pages in `Base.astro`.
- Use tokens from `src/styles/tokens.css`.
- Reuse global patterns from `src/styles/components.css`.
- Reuse an Astro component when the same structure appears more than once.
- Keep data transformation in frontmatter or utilities, not presentation
  markup.
- Use conditional rendering for optional sections.
- Use semantic headings in document order.
- Add meaningful alternative text; use empty `alt` text for decorative images.
- Preserve keyboard access and visible focus.
- Verify at mobile and desktop widths.
- Run `npm run build` before handoff.

## Audit checklist for existing pages

### Hierarchy

- Is the page's purpose clear in the first viewport?
- Is there one obvious primary subject or action?
- Is the most important value visually dominant?
- Are headings meaningfully different from labels?

### Content

- Is any information duplicated?
- Can explanatory copy be replaced by a clearer visual?
- Are empty or low-value sections shown?
- Is internal or technical language exposed to users?

### Layout

- Does the page use the global content width and gutters?
- Is there enough space between major concepts?
- Are cards being used to clarify grouping?
- Are large empty equal-width cards better expressed as content-sized cards?

### Mobile

- Does the layout work at 360–390px?
- Are tap targets large enough?
- Do long labels wrap or resize safely?
- Is important content visible without horizontal scrolling?
- Does the mobile order match user priority?

### Consistency

- Are global tokens used instead of local colors and spacing?
- Are ratings, rarity, buttons, chips, and surfaces consistent?
- Could any local pattern be replaced by an existing shared component?
- Are hover, focus, loading, missing-data, and reduced-motion states handled?

### Final test

Remove every decorative or explanatory element one at a time. If the page
remains equally understandable, leave that element out.

## Definition of done

A page fits this system when:

- Its purpose and primary information are immediately clear.
- It feels spacious but not empty.
- Mobile looks intentionally composed.
- It contains no avoidable or duplicate information.
- It uses the shared tokens and interaction language.
- Its optional and missing-data states are deliberate.
- It feels related to the hero detail experience without copying its exact
  layout unnecessarily.


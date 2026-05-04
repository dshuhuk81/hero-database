# Component Plan
Design System Phase 3 - Component extraction roadmap.
Source of truth: guides.astro (Goldstandard), heroes/[id].astro (detail page).

---

## Status Legend
- [ ] planned
- [~] in progress
- [x] done

---

## 1. Already in components.css (existing, needs cleanup)

| Class group         | Status | Notes |
|---------------------|--------|-------|
| `.page-wrapper`     | [~]    | Duplicated in components.css AND base.css. Remove from components.css. |
| `.content-wrapper`  | [ ]    | Redundant with `.page-wrapper`, different max-width (1200px). Audit usage, consolidate or remove. |
| `.main-content`     | [ ]    | Used by calculator.astro. Token-ify padding values. |
| `.page-header/title/subtitle` | [ ] | Used by several pages. Token-ify font-size to `--text-2xl`. |
| `.separator`        | [ ]    | Hardcoded color. Replace with `rgba(var(--accent-gold), 0.4)` via token. |
| `.tab-bar / .tab`   | [x]    | Well-structured, already uses token vars. Keep as-is. |
| `.main-tabs / .main-tab` | [ ] | Parallel system to `.boss-tabbar`. Consolidate into one pill-tab pattern. |
| `.boss-tabbar / .boss-tab` | [ ] | Same pattern as `.event-tabbar`. Already merged via selector. Good. |
| `.support-card` group | [ ] | Self-contained, no duplication. Token-ify hardcoded px values. |

---

## 2. Patterns to extract (new components)

Priority: HIGH = used on 3+ pages, MEDIUM = 2 pages, LOW = 1 page but important.

---

### 2.1 HeroChip
**Priority: HIGH**
**Source: guides.astro, bosses.astro, tips.astro**

A small hero portrait + name tag used inline in team comp rows.

```
Structure:
.hero-chip
  .hero-chip-portrait   (CSS background-image div, 36x36px)
  span                  (hero name text)
```

CSS location: `components.css`
Astro component: `src/components/HeroChip.astro` (props: heroId, name)

Variants observed:
- guides.astro: `.hero-chip` with `.hero-portrait` inner div
- bosses.astro: identical structure, same class names
- tips.astro: `.hero-pic` / `.hero-pic-img` (rename to match standard)

Token dependencies: `--bg-raised`, `--border-subtle`, `--radius-full`, `--text-sm`

---

### 2.2 CompEntry
**Priority: HIGH**
**Source: guides.astro, bosses.astro**

A team composition block: header with label + reason, hero chip row, optional notes.

```
Structure:
.comp-entry
  .comp-entry-header
    .comp-label           (e.g. "PvP Core")
    .comp-reason          (short description text)
  .comp-hero-row
    HeroChip x N
  .comp-notes             (optional italic note)
```

CSS location: `components.css`
Astro component: `src/components/CompEntry.astro`
(props: label, reason, heroes[], notes?)

Differences to resolve:
- tips.astro uses `.comp-card / .comp-title / .comp-note` - migrate to standard naming
- bosses.astro is already aligned with guides.astro naming

Token dependencies: `--bg-surface`, `--border-subtle`, `--radius-lg`, `--text-sm`, `--text-muted`

---

### 2.3 RatingBadge
**Priority: HIGH**
**Source: heros.astro, heroes/[id].astro, HeroCard.astro**

Colored pill displaying a tier rating (SSS, SS, S, A, B, C).

```
Structure:
.rating-badge[data-tier="SSS"]   (or class .tier-sss)
  text content
```

CSS: gradient background from `--tier-{x}-from` to `--tier-{x}-to`, text from `--tier-{x}-text`.
Already implemented in `HeroCard.astro` and `[id].astro` - extract shared CSS to components.css.

Astro component: `src/components/RatingBadge.astro`
(props: tier, label?)

Token dependencies: full `--tier-*` system (already in tokens.css)

---

### 2.4 SectionLabel / SectionHeader
**Priority: HIGH**
**Source: heroes/[id].astro, guides.astro, heros.astro**

Section kicker + title pattern with optional decorative bar.

```
Variant A (kicker + title, used in [id].astro):
.content-section
  .section-label     (uppercase kicker, gold, --tracking-widest)
  h2                 (section title)

Variant B (bar-decorated title, used in guides.astro):
.section-title
  ::before / ::after pseudo-elements as horizontal bars
```

CSS location: `components.css`
No Astro component needed - pure CSS pattern.

Token dependencies: `--section-kicker-*`, `--section-title-*`, `--accent-gold`, `--border-subtle`

---

### 2.5 Accordion
**Priority: MEDIUM**
**Source: guides.astro, bosses.astro**

Image-backed nav item that expands to reveal content. Toggled via `.is-active` JS class.

```
Structure:
.accordion-nav
  .accordion-item[.is-active]
    .accordion-trigger    (button, image background, overlay label)
    .accordion-content    (collapsible, height: 0 / auto)
```

CSS location: `components.css`
JS: toggle `.is-active` on click, one open at a time.

Differences:
- guides.astro: slide-style accordion (hero per slide)
- bosses.astro: boss selection accordion (height 200px image)
Both use same `.is-active` toggle pattern.

Token dependencies: `--radius-lg`, `--border-subtle`, `--bg-raised`, `--transition-all`, `--duration-slow`

---

### 2.6 MechanicBox
**Priority: MEDIUM**
**Source: guides.astro, bosses.astro**

Color-coded info box for game mechanic explanations.

```
Structure:
.mechanic-box[data-type="warning|info|tip|phase"]
  .mechanic-box-label   (uppercase tag)
  p                     (content text)
```

Color system:
- default: `--accent-teal` border + dim bg
- warning: amber / gold tones
- phase: purple tones

CSS location: `components.css`
No Astro component needed - pure CSS + data attribute.

Token dependencies: `--accent-teal`, `--accent-teal-dim`, `--accent-gold`, `--border-subtle`, `--radius-md`

---

### 2.7 Pill / Tag
**Priority: MEDIUM**
**Source: bosses.astro, heros.astro (filter chips)**

Small inline tag for categories, types, or filter labels.

```
Structure:
.pill                  (static display tag)
.chip[.is-active]      (interactive filter, already in components.css via tokens)
```

`.chip` is already tokenized via `--chip-*` in tokens.css.
`.pill` (static) needs CSS extraction.

CSS location: `components.css`
Token dependencies: `--chip-*` (already complete)

---

### 2.8 StatBar
**Priority: MEDIUM**
**Source: heroes/[id].astro**

Labeled stat row with a progress bar, color-coded by category.

```
Structure:
.stat-entry
  .stat-label
  .stat-value
  .stat-bar-track
    .stat-bar-fill    (width: X%, background by category)
```

Categories: offense (gold), defense (blue), utility (purple).
CSS location: `components.css`
No Astro component - pure CSS pattern.

Token dependencies: `--accent-gold`, `--accent-purple`, `--bg-raised`, `--radius-full`

---

### 2.9 SkillCard
**Priority: MEDIUM**
**Source: heroes/[id].astro, src/components/hero/SkillCard.astro**

Skill image + name + description + upgrade tabs block.

Already exists as `src/components/hero/SkillCard.astro`.
Task: audit whether it uses hardcoded values or tokens, align to token system.

Token dependencies: `--bg-surface`, `--bg-raised`, `--border-subtle`, `--tab-*`

---

### 2.10 StickyPageHeader
**Priority: LOW** (only [id].astro, but high-value pattern)
**Source: heroes/[id].astro**

Glassmorphism sticky header at top of page.

```
Structure:
.hero-page-header   (position: sticky, top: 0, z-index: var(--z-overlay))
  backdrop-filter: blur(20px)
  background: rgba(7,6,12,0.82)
  height: 52px
```

CSS location: `components.css`
No Astro component - CSS-only pattern, page-specific content inside.

Token dependencies: `--z-overlay`, `--bg-base` (as rgba), `--border-subtle`

---

### 2.11 HeroCard
**Priority: LOW** (already exists as component)
**Source: src/components/HeroCard.astro**

Already an Astro component. Task: audit token usage, replace any remaining hardcoded values.

---

## 3. Consolidation tasks (naming conflicts)

| Conflict | Source A | Source B | Resolution |
|----------|----------|----------|------------|
| Hero portrait | `.hero-chip .hero-portrait` (guides) | `.hero-pic .hero-pic-img` (tips) | Standardize to `.hero-chip > .hero-chip-portrait` |
| Comp block | `.comp-entry` (guides, bosses) | `.comp-card` (tips) | Standardize to `.comp-entry` |
| Comp title | `.comp-label` (guides) | `.comp-title` (tips) | Standardize to `.comp-label` |
| Comp note | `.comp-notes` (guides) | `.comp-note` (tips) | Standardize to `.comp-notes` |
| Tab system | `.main-tab` (tips, some pages) | `.boss-tab` (boss, events) | Both are pill-tabs, unify under `.pill-tab` pattern |
| Page wrapper | `components.css` (no padding) | `base.css` (with padding + responsive) | Use `base.css` version, delete from `components.css` |

---

## 4. Migration order (Phase 4+)

Phase 4a - CSS-only extraction (no Astro component changes):
1. Clean up `components.css` (remove `.page-wrapper` duplicate, token-ify `.main-content`, `.separator`)
2. Add `.hero-chip` CSS to `components.css`
3. Add `.comp-entry` CSS to `components.css`
4. Add `.rating-badge` CSS to `components.css`
5. Add `.section-label` + `.section-title` CSS to `components.css`
6. Add `.mechanic-box` CSS to `components.css`
7. Add `.stat-bar` CSS to `components.css`
8. Add `.sticky-page-header` CSS to `components.css`

Phase 4b - guides.astro migration (Goldstandard, highest value):
- Replace inline `.hero-chip` styles with component CSS
- Replace inline `.comp-entry` styles with component CSS
- Replace `--dark-card` with `--bg-surface`
- Replace hardcoded `--gold-light` with `--accent-gold-light`
- Replace hardcoded `--accent-teal` references with token

Phase 4c - bosses.astro migration (shares guides patterns):
- Same as 4b, bosses uses identical patterns

Phase 4d - heros.astro migration:
- Replace rarity border hardcoded colors with `--rarity-*` tokens
- Remove local `.page-wrapper` definition (now global)

Phase 4e - heroes/[id].astro migration (most complex, do last):
- Audit all inline styles for token replacements
- Faction color system stays as dynamic CSS custom properties (correct pattern)
- Sticky header CSS to components.css

Phase 4f - tips.astro (Sanierungsfall, rename classes to match standard):
- Rename `.hero-pic` to `.hero-chip`, `.hero-pic-img` to `.hero-chip-portrait`
- Rename `.comp-card` to `.comp-entry`, `.comp-title` to `.comp-label`, `.comp-note` to `.comp-notes`
- Rename `.main-tabs` system - consolidate with `.pill-tab` if unified
- Remove `eg-*` prefix classes, replace with standard tokens

---

## 5. Do NOT touch (out of scope)

- `calculator.astro` - token consumer only, no class refactoring
- Faction color dynamic theming (`--faction-a/b/glow`) - correct pattern, stays in [id].astro
- ARIA roles and skill tab system in [id].astro - functional, do not restructure
- Supabase auth flow pages (myheroes, shared-heroes)
- Any `.astro` component not listed above

---

## 6. Files changed per phase (change budget)

Phase 4a: 1 file (components.css)
Phase 4b: 1 file (guides.astro)
Phase 4c: 1 file (bosses.astro)
Phase 4d: 1 file (heros.astro)
Phase 4e: 1 file (heroes/[id].astro)
Phase 4f: 1 file (tips.astro)

Max 1 page file per phase to stay under the 10-file limit and allow targeted review.

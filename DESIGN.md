---
name: Motto Immortal Database
description: Fan-made companion for Motto Immortal - hero data, ratings and decision-first guides, every claim with its evidence.
colors:
  immortal-gold: "#facc15"
  immortal-gold-light: "rgba(250, 234, 121, 0.95)"
  immortal-gold-dim: "rgba(250, 204, 21, 0.15)"
  immortal-gold-line: "color-mix(in srgb, #facc15 34%, transparent)"
  arcane-violet: "#a855f7"
  arcane-violet-hover: "#b166f8"
  arcane-violet-dim: "rgba(168, 85, 247, 0.15)"
  frost-blue: "#C8E3FF"
  jade-teal: "#406a5f"
  ember-red: "#f87171"
  ember-red-strong: "#ef4444"
  ember-red-dim: "rgba(239, 68, 68, 0.15)"
  leaf-green: "#4ade80"
  leaf-green-dim: "rgba(74, 222, 128, 0.12)"
  sky-blue: "#60a5fa"
  sky-blue-dim: "rgba(96, 165, 250, 0.12)"
  scrim: "rgba(0, 0, 0, 0.65)"
  hall-black: "#07060c"
  vault-surface: "#0d0b14"
  lantern-raised: "#13111c"
  veil-overlay: "#1a1726"
  ivory-bright: "#f4f1ff"
  moon-text: "#e6e6eb"
  moon-text-secondary: "rgba(230, 230, 235, 0.70)"
  moon-text-muted: "rgba(230, 230, 235, 0.45)"
  hairline-subtle: "rgba(255, 255, 255, 0.08)"
  hairline-medium: "rgba(255, 255, 255, 0.15)"
  hairline-strong: "rgba(255, 255, 255, 0.28)"
  faction-hearts: "#ff8f9c"
  faction-diamonds: "#78ddff"
  faction-clubs: "#82e89a"
  faction-spades: "#91baff"
  faction-starglint: "#ffe28a"
  guide-hades: "#bba5ff"
  tier-splus: "#ff4d4d"
  tier-s: "#facc15"
  tier-aplus: "#8b5cf6"
  tier-a: "#fb923c"
  tier-bplus: "#06b6d4"
  tier-b: "#3b82f6"
  tier-c: "#14b8a6"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(24px, 3.4vw, 38px)"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.2em"
  mono:
    fontFamily: "SF Mono, Fira Code, Cascadia Code, monospace"
    fontSize: "0.875em"
    fontWeight: 400
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "20px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
  "20": "80px"
  "24": "96px"
components:
  button-primary:
    backgroundColor: "{colors.immortal-gold}"
    textColor: "{colors.hall-black}"
    typography: "{typography.body-small}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.immortal-gold-light}"
    textColor: "{colors.hall-black}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.moon-text}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
  button-ghost-hover:
    textColor: "{colors.ivory-bright}"
  chip:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    textColor: "{colors.moon-text-secondary}"
    typography: "{typography.body-small}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "32px"
  chip-active:
    backgroundColor: "{colors.arcane-violet-dim}"
    textColor: "{colors.arcane-violet}"
  input:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    textColor: "{colors.moon-text}"
    typography: "{typography.body-small}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.moon-text-muted}"
    typography: "{typography.body-small}"
    padding: "0 16px"
    height: "48px"
  tab-active:
    textColor: "{colors.ivory-bright}"
  surface-panel:
    backgroundColor: "{colors.lantern-raised}"
    rounded: "{rounded.lg}"
    padding: "20px"
  surface-panel-quiet:
    backgroundColor: "{colors.vault-surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  rating-badge:
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  evidence-badge:
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  hero-card:
    backgroundColor: "#0d1624"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    height: "380px"
---

# Design System: Motto Immortal Database

## Overview

**Creative North Star: "The Hall Ledger"**

The site is a dark hall with two kinds of furniture. The first is the stage: hero art lit against the hall backdrop, fixed in size, anchored bottom-centre, faded into the page by gradients. The second is the ledger: rows, tiles and verdicts where every value says how we know it. The hall supplies the atmosphere and the ledger supplies the trust. When they compete, the ledger wins.

Nocturnal, precise, earned. The page is near-black, with a faint violet and gold haze fixed behind it. Text is cool off-white, and bright colour is rationed. Gold marks what matters most on the page, and tier, rarity and faction colours appear only on the values they describe. Density is moderate: generous space between sections (80px between content blocks), tight and consistent spacing inside them. Inter carries the hierarchy through scale and weight; there is no ornament type.

Confirmed rejections: guides that read as walls of text, decorative typefaces, coloured stripe accents on cards, and any chrome that could pass for the publisher's official game UI. This is a fan project and must look like one we made, not one they made.

**Key Characteristics:**
- Near-black tonal stack of four surfaces; depth from tone and hairlines, not shadow.
- Gold is the primary voice (actions, kickers, active navigation, tab indicator); violet assists (focus, selection, form controls).
- Bright colour is earned by data: tier, rarity, faction, evidence status.
- Hero art lives in fixed-height, overflow-hidden stages with gradient fades.
- One dominant idea per screen: a name, a verdict or a rating outweighs everything around it.
- Every claim carries an evidence badge that differs by shape as well as colour.

## Colors

A near-black violet-tinted ground with one warm voice (gold), one cool helper (violet), and a strictly semantic outer ring of tier, rarity and faction colours.

### Primary
- **Immortal Gold** (`immortal-gold`): The site's voice. Primary action buttons, section kickers, the active navigation item, the tab underline, link hover. Its light variant (`immortal-gold-light`) is the hover state for primary buttons and the guide header and observed-evidence tint. The dim variant (`immortal-gold-dim`) is the wash behind the active rail item, gold callouts and the page-hero atmosphere; the line variant (`immortal-gold-line`) is the 1px border around those gold callouts.

### Secondary
- **Arcane Violet** (`arcane-violet`): The assisting accent. Keyboard focus ring (2px outline, 2px offset), active filter chips, focused input borders, the legacy token-level button. Its dim variant tints active chips and the page-hero atmosphere opposite the gold.

### Tertiary
- **Frost Blue** (`frost-blue`): Community-sourced evidence and cool informational highlights.
- **Jade Teal** (`jade-teal`): Mechanic boxes and boss phase tags; a muted, low-chroma green that reads as "how the game works", not as status.
- **Ember Red** (`ember-red`, with `ember-red-strong` and `ember-red-dim`; CSS `--accent-red*`): Negative outcomes only: weaknesses, bad matchups, lost damage. Also the red virtue rarity (`--rarity-red-border`).
- **Leaf Green** (`leaf-green`, `leaf-green-dim`; CSS `--accent-green*`): Positive outcomes: strengths, must-pull, upgrade levels. For running text, mix it toward Ivory Bright so paragraphs stay readable.
- **Sky Blue** (`sky-blue`, `sky-blue-dim`; CSS `--accent-sky*`): Neutral information such as optional pulls and the defense stat.
- **Scrim** (`scrim`): The backdrop behind overlays and sheets.

Two local exceptions are deliberate: the virtue wizard's 12-hue piece palette is categorical data and stays distinct from site accents (one source, `.vwz-pcN`), and black in mask gradients is an alpha value, not a colour.

### Neutral
- **Hall Black** (`hall-black`): Page background; the bottom of the stack.
- **Vault Surface** (`vault-surface`): Quiet cards and panels, page-hero fallback.
- **Lantern Raised** (`lantern-raised`): Standard panels, toolbars, dropdowns: one step closer to the reader.
- **Veil Overlay** (`veil-overlay`): Modals and sheets only.
- **Ivory Bright** (`ivory-bright`): Headings, active tabs, primary values.
- **Moon Text** (`moon-text`) with its 70% (`moon-text-secondary`) and 45% (`moon-text-muted`) alphas: body, supporting copy, metadata. Muted text never carries essential instructions.
- **Hairlines** (`hairline-subtle`, `hairline-medium`, `hairline-strong`): The default way to separate things. Subtle for panels and dividers, medium for ghost buttons and empty states, strong for hover.

### Semantic rings (data colours)
- **Tier colours** (`tier-splus` through `tier-c`): Each tier is a 135deg two-stop gradient with its own dark text colour, applied only through `data-tier`. S+ and S carry a soft glow. The tokens here are the anchor stop; the full from/to/text set lives in `src/styles/tokens.css`.
- **Faction accents** (`faction-hearts`, `faction-diamonds`, `faction-clubs`, `faction-spades`, `faction-starglint`): Bright enough for AAA text on guide surfaces. A guide page sets `--guide-accent` from its hero's faction; the faction colours headings and lines, never the whole interface. A per-hero override (`guide-hades`) is a token too, and derives its dim (15%) and line (34%) the same way.
- **Rarity** (common green, rare blue, epic violet, legendary gold): Translucent borders and radial portrait backgrounds behind hero art.

### Named Rules
**The Earned Colour Rule.** A saturated colour appears only when a value has earned it: a tier, a rarity, a faction, an evidence status, or the single primary action. Chrome stays in the neutral stack.

**The Gold Leads Rule.** Gold is the one warm voice. Violet never competes with it for the primary action; violet marks where the user is (focus, selection, input), gold marks what matters.

## Typography

**Display Font:** Inter (with -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif)
**Body Font:** Inter (same stack)
**Label/Mono Font:** SF Mono / Fira Code / Cascadia Code for inline code only

**Character:** One sans family doing every job through scale and weight. Black (900) tight-tracked titles over quiet regular body, punctuated by small wide-tracked uppercase kickers in gold.

### Hierarchy
- **Display** (900, clamp 24px to 38px, 1.2, -0.02em, balanced wrap): Page and section titles in the content heading; guide verdict words (38px, uppercase).
- **Headline** (700, 24px, 1.2): Large stat values, empty-state and sub-page titles.
- **Title** (600, 18px, 1.35): Section titles and card headings.
- **Body** (400, 15px, 1.5): Running copy. Descriptions cap at 64ch; verdict sub-lines at 52ch. Pretty text-wrap on paragraphs.
- **Body small** (500 to 700, 13px): Buttons, chips, tabs, inputs, toolbar meta.
- **Label** (700, 11px to 12px, 0.10em to 0.2em, uppercase): Kickers, evidence and rating badges, grouping labels. Metadata only, never sentences.

The scale runs 10 / 11 / 13 / 15 / 16 / 18 / 20 / 24 / 30 / 38px, with display steps at 48 / 60 / 72px (`--text-5xl` to `--text-7xl`) reserved for guide hero names, headline numbers and feature titles. Fluid sizes clamp between two scale steps, never raw rem values.

### Named Rules
**The One Family Rule.** Inter only. No display or serif faces unless a global brand decision adds one; the Georgia wishlist title is an outlier (debt, not precedent).

**The Kicker Rule.** Small uppercase gold text names a group; it never carries a sentence or an instruction.

## Layout

Content sits in a centred column (max 1400px; 1120px for reading pages) with a 24px gutter, offset on desktop by a 48px fixed navigation rail on the left. On mobile (768px and below) the rail becomes a bottom navigation bar and the body gains 56px of bottom margin.

Pages open with a page hero (220px to 360px tall, image or atmosphere, content anchored bottom-left), then content begins 48px below. Content blocks are separated by 80px; a content heading (kicker, title, optional description and actions) sits 32px above its block. Inside blocks, spacing is tight and drawn from the 4px-based scale (8, 12, 16, 20, 24).

Breakpoints are content checkpoints rather than devices: 480px (narrow phones), 600px (two-column hero and boss grids), 768px (rail to bottom nav), 1024px (compact desktop), 1200px (wide). Mobile is designed first at 375px with no horizontal scroll, except intentional strips such as tab bars, which scroll with hidden scrollbars.

Page composition follows user intent: identity, verdict, explanation, detail, recommendations, then specialist content.

### Named Rules
**The One Dominant Idea Rule.** Each screen has one entry point (a hero name, a verdict, a rating) with the greatest visual weight; supporting metadata is visibly secondary.

## Elevation & Depth

Flat by default. Depth comes from the four-step tonal stack (hall black, vault surface, lantern raised, veil overlay) and 1px hairline borders. Shadows are reserved for things that float above the page: the expanded navigation rail, popovers, dropdowns, toasts and modals. Glows belong to data, not chrome: the S+ and S tier badges and the active rail icon get a soft halo, nothing else.

### Shadow Vocabulary
- **Small** (`box-shadow: 0 1px 3px rgba(0,0,0,0.4)`): Small floating chips and tooltips.
- **Medium** (`box-shadow: 0 4px 12px rgba(0,0,0,0.5)`): Dropdowns and popovers.
- **Large** (`box-shadow: 0 8px 32px rgba(0,0,0,0.6)`): Sheets and the support popover.
- **Extra large** (`box-shadow: 0 16px 48px rgba(0,0,0,0.7)`): Modals.
- **Rail spill** (`box-shadow: 18px 0 36px rgba(0,0,0,0.28)`): The navigation rail when it expands over content.
- **Badge lift** (`box-shadow: 0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25)`): Badges floating over hero art.

### Named Rules
**The Tone Before Shadow Rule.** To raise a surface, step it up the tonal stack and give it a hairline. Reach for a shadow only when the element actually floats over other content.

## Shapes

Gently rounded, never pill-shaped by default. Panels, toolbars, cards and the hero card use a 12px radius; buttons and inputs 8px; rating badges 4px. Fully round shapes are reserved for chips, evidence badges and status dots. Hero cards clip their art with an inset clip-path at the same 12px radius. Empty and missing-data states use a dashed medium hairline so absence reads as deliberate, not broken.

Evidence status is encoded in shape as well as colour: a filled dot (Confirmed), a half-filled dot (Observed), a diamond (Community), a dotted ring (Interpretation), and a dashed outline (Untested).

## Components

### Buttons
Quiet frames with one loud exception.
- **Shape:** gently rounded (8px), at least 44px tall, 20px horizontal padding, 13px bold label.
- **Primary:** Immortal Gold fill with Hall Black text. One per view.
- **Ghost (default):** transparent with a medium hairline and Moon Text label; the quiet variant adds the faint surface tint.
- **Hover / Focus:** ghost borders strengthen and text brightens; every button lifts 1px (200ms ease-out). The primary shifts to the lighter gold. Focus is the global 2px violet outline at 2px offset.

### Chips
- **Style:** 32px tall, fully round, 6% white fill, subtle hairline, secondary text at 13px medium.
- **State:** hover raises the fill to 10%; active turns violet (dim violet fill, violet border, violet text).

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Lantern Raised by default; Vault Surface for the quiet variant.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px subtle hairline.
- **Internal Padding:** 20px standard, 12px tight, 32px spacious. Stacked panels sit 16px apart.

### Inputs / Fields
- **Style:** 36px tall, 5% white fill, subtle hairline, 8px radius, 13px text, muted placeholder.
- **Focus:** fill rises to 8%, border turns Arcane Violet.

### Navigation
- **Desktop rail:** fixed 48px column, translucent near-black with a 20px backdrop blur and a right hairline. Icons at 20px, muted at rest. On hover or keyboard focus within, the whole rail expands to 224px as an overlay (no content shift) and every label fades in together. The active item turns gold with a dim gold pill behind it and a soft gold glow on the icon.
- **Mobile:** a bottom bar with visible labels; hover is never required.
- **Tab strip:** 48px tall underlined tabs, 13px semibold with wide tracking, muted at rest, Ivory Bright when active, with a 2px gold indicator that scales in from the centre.

### Hero Card (signature)
The stage in miniature. A 380px tall, 12px-clipped card with the hall backdrop behind a transparent hero portrait (anchored top by default, per-hero vertical offset allowed). Art zooms 8% on hover over 450ms. Floating rating and "new" badges sit in the corners with a blur backdrop (dropped below 600px for performance) and the badge-lift shadow.

### Rating Badge (signature)
A small tier-coloured tag driven only by `data-tier`: 135deg gradient between the tier's two stops, the tier's own dark text, 11px bold uppercase with wide tracking, 4px radius. On hero cards it becomes a 32px round floating badge.

### Evidence Badge (signature)
The ledger's stamp. A fully round outline pill (12px bold uppercase) with a 10% tint of its status colour and an 8px leading glyph whose shape encodes the status: Confirmed (faction clubs green, filled dot), Observed (light gold, half dot), Community (frost blue, diamond), Interpretation (bright, dotted ring), Untested (muted, dashed outline).

### Verdict Card (signature)
The decision at the top of a guide: a 12px panel with the faction accent line as border and a 160deg faction-dim wash fading into Vault Surface. Leads with an uppercase 38px black verdict word, a one-sentence sub-line, then a two-column grid of stat tiles (24px black values over hairline tops), each with its evidence badge.

### Page Hero
A full-width band (220px to 360px) that is image or atmosphere: optional cover art, a screen-blended violet and gold haze, and gradients that fade left and bottom into Hall Black so the title stays legible. It ends on a subtle hairline.

### Content State
Empty, missing, loading and maintenance states are designed, not left blank: a 220px minimum block, dashed medium hairline, Vault Surface, a 48px round icon well, a 20px bold title and a muted description.

## Do's and Don'ts

### Do:
- **Do** take every colour, size, space and radius from `src/styles/tokens.css`; add a semantic token rather than copying a raw value.
- **Do** separate with tone and 1px hairlines; reserve shadows for floating elements.
- **Do** keep one gold primary action per view and use violet only for focus, selection and inputs.
- **Do** apply tier colours only through `data-tier` and faction colour only through `--guide-accent`.
- **Do** put an evidence badge on every guide claim, distinct by glyph shape as well as colour.
- **Do** stage hero art in fixed-height, overflow-hidden frames with transparent-background portraits and gradient fades.
- **Do** show missing data as a deliberate state ("N/A", "Not tested", "No data") using the content-state or dashed treatment.
- **Do** design at 375px first, with 44px tap targets and no horizontal page scroll.
- **Do** lead guides with a verdict and stat tiles; details on demand.

### Don't:
- **Don't** add coloured top or side stripes to cards or callouts as decoration; express category through content, labels, imagery or status colour. A callout is a tinted box (`--guide-accent-dim` or `--guide-legendary-dim`) with a full 1px accent-line border and an 8px radius.
- **Don't** introduce decorative, display or serif typefaces; Inter carries all hierarchy.
- **Don't** let a guide read as a wall of text; replace paragraphs with verdicts, tiles, flows and comparisons wherever a visual says the same thing.
- **Don't** imitate the publisher's official game UI, logo or chrome; the site must never look official.
- **Don't** use saturated colour on chrome that carries no data.
- **Don't** let hero art, transparent padding or tall weapons set the height of a header.
- **Don't** put a card inside a card without a clear hierarchy.

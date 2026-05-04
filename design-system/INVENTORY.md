# Design System Inventory
Phase 0 - READ ONLY Audit

---

## 1. Referenz-Analyse

### guides.astro (GOLDSTANDARD)

**CSS-Variablen (lokal definiert, guides-spezifisch):**
| Variable | Wert | Bemerkung |
|---|---|---|
| `--dark-card` | `#130E0E` | lokale Alias fuer dunkle Karte |
| `--accent-teal` | `#406a5f` | guides-eigene Akzentfarbe, NICHT im globalen tokens.css |
| `--gold-light` | `rgba(250,234,121,0.95)` | aufgehelltes Gold, nur in guides |
| `--gold` | erbt `var(--gold)` aus tokens | d4af37 |
| `--text` | erbt `var(--text-primary)` implizit | |

**Lokal verwendete Hex-Farben (hardcoded, NICHT Tokens):**
- `rgba(64,106,95,...)` - gruener Teal-Ton fuer borders/backgrounds von mechanic-boxes
- `rgba(180,130,80,...)` - goldener Teal fuer highlight mechanic-boxes
- `rgba(255,160,80,...)`/ `rgba(255,180,100,...)` - orange fuer "unreleased" badges
- `#130E0E` - sehr dunkles fast-schwarz fuer Karten
- `rgba(12,12,12,0.6)` - dunkle Overlay-Hintergruende
- `rgba(0,0,0,0.2)` - subtile Code-Block-Hintergruende

**Einzigartige Patterns in guides:**
- Hero Accordion Header mit `guide-header-row` + `hero-accordion` (split-layout)
- `guide-slide` + `guide-container` (Slide-Panel pro Hero-Guide)
- `jump-nav` mit Quick Navigation Links
- `mechanic-box` mit farbcodierten Borders pro Kontext
- `section-title` mit Deko-Balken via `::before`/`::after` (gradient lines)
- `hero-chip` mit `hero-chip-portrait` (CSS background-image portrait, kein img)
- `comp-entry` + `comp-entry-header` + `comp-hero-row` + `comp-notes`
- `overview-card`, `pos-card`, `rating-card`, `skill-card`
- `doom` / `revive` / `highlight` als Inline-Text-Klassen
- `divider-ornament` (dekorative Sterne)
- `print-btn` / `print-bar`

**Spacings (aus CSS-Regeln extrahiert, nicht via Tokens):**
- `margin-top: 20px`, `margin-bottom: 12px`, `16px`, `8px`
- `padding: 14px`, `12px`, `16px`, `20px`

---

### heroes/[id].astro (ZIELZUSTAND DETAILSEITEN)

**"Gute Ansaetze" die ins Design System gehoben werden sollen:**

1. **Sticky Header mit Glassmorphism**: `.hero-page-header` - `backdrop-filter: blur(20px)`, Hoehe 52px, `background: rgba(7,6,12,0.82)`, border-bottom subtle. Sauberste Navigation-Bar im Projekt.

2. **Cinematic Showcase Section**: `.showcase` mit `88vh`/`min-height:520px`/`max-height:900px`, Layering von `.showcase-bg` (Hall-Bild) + `.showcase-art` (CSS background-image Hero) + `.showcase-overlay` + Identity Block. Prev/Next Navigation. Scroll-Hint mit SVG.

3. **Floating Dot-Nav**: `.dot-nav` rechts - kontextbewusste Seiten-Navigation mit Labels on hover. Z-Index 200+.

4. **Faction-Farben als CSS Custom Properties**: `--faction-a`, `--faction-b`, `--faction-glow` werden per `style=""` Attribut gesetzt und in `<style>` konsumiert. Sauberes Pattern fuer dynamische Theming.

5. **Skill-Tab-System**: `.skill-tabs` als `role="tablist"` + `.skill-tab` Buttons mit Icon-Divs (CSS background-image) + `.skill-panels`. Sauber mit ARIA.

6. **stat-entry mit Bar**: `.stat-entry` + `.stat-entry-bar` + `.stat-entry-fill` - labeled stat-bars fuer offensive/defensive/utility Stats.

7. **Big Rating Tiles**: `.big-rating-tiles` mit 3 `big-rating-tile` Kacheln (Overall/PvP/PvE), farbcodiert via Token-Variablen.

8. **Relic Timeline**: `.relic-timeline` + `.relic-bp-row` mit Dot + Line Konnektoren (timeline pattern).

9. **Bug Banner**: `.bug-banner` mit SVG-Icon + `.bug-text` - strukturierter Alert-Block.

10. **Section Label Pattern**: `.content-section` mit `.section-label` als Abschnitts-Kicker (kleinerer uppercase Text). Konsistent ueber alle Sections.

**Lokale CSS Custom Properties:**
```
--faction-a:  z.B. #5b9cf6 (Starglint)
--faction-b:  z.B. #facc15 (Starglint)
--faction-glow: rgba(91,156,246,0.18)
```

**Faction-Color-Map:**
| Faction | a | b | glow |
|---|---|---|---|
| Starglint | `#5b9cf6` | `#facc15` | `rgba(91,156,246,0.18)` |
| Wildfire | `#f97316` | `#dc2626` | `rgba(249,115,22,0.18)` |
| Deepwater | `#22d3ee` | `#0ea5e9` | `rgba(34,211,238,0.18)` |
| Spades | `#a78bfa` | `#7c3aed` | `rgba(167,139,250,0.18)` |

**Hardcoded Werte (nicht Token-basiert):**
- `.hero-page-header background: rgba(7,6,12,0.82)` - fast identisch mit --bg-base
- `.showcase-bg url(hall.webp)` - feste Hintergrund-URL
- `font-family: Inter, ui-sans-serif, system-ui, sans-serif` - lokale Deklaration

---

### heros.astro (ZWEITWICHTIGSTE LISTE)

**Patterns:**
- `page-wrapper` mit `max-width: 1400px`, `margin: 0 auto`, `padding: 0px 16px`
- `sort-bar` mit `display:flex; justify-content:space-between`
- `view-toggle` (Grid/List Switch) mit `.view-btn.active`
- `sort-select` mit Custom-Arrow SVG Background-image
- `grid` mit `grid-template-columns: repeat(auto-fill, minmax(210px, 1fr))`, `gap: 20px`
- `hero-wrapper` mit rarity-Klassen (`rarity-common/epic/legendary`)
- Rarity-Borders: Common `rgba(74,222,128,0.55)`, Epic `rgba(168,85,247,0.6)`, Legendary `rgba(250,204,21,0.75)`
- Rarity-Glow via `::before` Pseudo-Element (radial-gradient)
- **List-View Tabelle**: `.hero-table` mit `table-layout:fixed`, `border-collapse:collapse`
- `list-portrait`: CSS background-image div (44x44px), `background-position: center top 30%`
- `list-badge` + `rating-*` Klassen (konsumiert Tier-Tokens)
- `icon-stack` mit 3 kleinen Icons (faction/role/class) ueber Karte

**Unique fuer heros.astro:**
- Dual-view (Grid + List) mit localStorage-Persistenz
- Multi-Filter (role/class/faction/rarity/tag) mit Set-basiertem State
- Column-sort in List-View

---

### bosses.astro (SEKUNDAERER LISTENTYP)

**Patterns:**
- `page-wrapper` (via `is:global`) + `content-wrapper`
- **Boss Accordion Nav**: `.boss-accordion-nav` - horizontale Bildleiste, `height: 200px`, aehlich guides Accordion aber simpler
- `.boss-slide` / `.boss-visual` mit CSS `--boss-image` Custom Property
- `.boss-identity` overlay mit `.boss-kicker` / `.boss-name` / `.boss-meta`
- `.pill` + `.pill-icon` (generische Badge-Chips mit optionalem Icon)
- `.mechanic-pill` (tooltip-behaeftete Tags, `title="..."`)
- `.mechanic-item` mit `.skill-icon` + `.mechanic-body`
- `.comp-entry` + `.comp-hero-row` + `hero-chip` (GLEICH wie guides!)
- `.panel-section` + `.panel-heading`
- Prev/Next Navigation innerhalb des Slide-Visuals

**Hardcoded Farben:**
- `background: #0d0a0a` fuer Accordion-Nav
- `linear-gradient(90deg, #facc15, #5eead4)` fuer Active-Indikator
- `rgba(255,255,255,0.06)` fuer Accordion-Borders

**Gemeinsam mit guides:**
- `comp-entry`, `comp-hero-row`, `hero-chip` - fast identisch
- Accordion-Pattern (Image + Content Layer + Active-State)

---

### tips.astro (SANIERUNGSFALL - NICHT als Vorlage)

**Patterns die NICHT uebernommen werden:**
- `eg-content-card`, `eg-note-card`, `eg-core-rule-card` - generische Praefixe ohne Struktur
- `eg-main-content`, `eg-team-example` - unklar benannte Wrapper
- `main-tabs` / `main-tab` / `main-tab-panel` - eigenes Tab-System das nicht mit dem in [id].astro harmoniert
- `phase-grid`, `phase-card phase-early/mid/late` - hartcodierte Phase-Klassen
- `phase-row-grid`, `phase-row-label early-label/late-label` - ohne Token-Basis
- `star-split`, `star-box star-good/star-invest` - semantisch OK aber CSS-Unklar
- `support-tier`, `support-tier-label` - redundant zu phase-Mustern
- `diana-dionysus-box`, `dd-split`, `dd-card dd-beginner/dd-advanced` - zu spezifisch
- `wishlist-grid`, `wishlist-faction`, `wishlist-note` - Content-spezifisch
- `comp-card`, `comp-title`, `comp-note` - ANDERER Name als guides/bosses (`comp-entry`)
- `gear-priority-list` - ul-Variante ohne globale Klasse

**hero-pic Pattern aus tips (VERWENDBAR nach Refactor):**
- `.hero-pic` + `.hero-pic-img` (CSS background-image) + `.hero-pic-name` 
- Dieses Pattern ist das sauberste aus tips - `hero-chip` in guides ist verwandt aber mit Portrait-Div
- `pic-highlight` Klasse fuer Hervorhebung

---

## 2. Globale Sammlung (dedupliziert)

### Farben

**Backgrounds (alle aus tokens.css, konsistent verwendet):**
| Token | Wert | Vorkommen |
|---|---|---|
| `--bg-base` | `#07060c` | uberall |
| `--bg-surface` | `#0d0b14` | Karten, Panels |
| `--bg-raised` | `#13111c` | Dropdowns |
| `--bg-overlay` | `#1a1726` | Modals |

**Hardcoded Backgrounds (NUR aus guides.astro):**
- `#130E0E` = `--dark-card` lokal (fast gleich `--bg-base`, konsolidieren)
- `rgba(64,106,95,...)` = Teal-Akzent (fehlt in tokens - neu aufnehmen als `--accent-teal`)
- `rgba(180,130,80,...)` = Bronze-Ton fuer alternate mechanic-box (einmalig, nicht tokenisieren)

**Text (alle aus tokens.css, konsistent):**
| Token | Wert | Vorkommen |
|---|---|---|
| `--text-bright` | `#f4f1ff` | uberall |
| `--text-primary` | `#e6e6eb` | uberall |
| `--text-secondary` | `rgba(230,230,235,0.70)` | Sekundaer-Text |
| `--text-muted` | `rgba(230,230,235,0.45)` | Sehr oft |

**Hardcoded Text (zu konsolidieren):**
- `rgba(230,230,235,0.55)` - zwischen `--text-secondary` und `--text-muted`, in heros.astro `sort-label`
- `rgba(230,230,235,0.4)` - nahe `--text-muted`, Table-Header in heros.astro
- `color: rgba(230, 230, 235, 0.45)` - identisch mit `--text-muted`

**Rarity-Borders (heros.astro, noch nicht tokenisiert):**
- Common: `rgba(74,222,128,0.55)` - gruen
- Epic: `rgba(168,85,247,0.6)` - lila
- Legendary: `rgba(250,204,21,0.75)` - gold

**Rarity-Glow Radial-Gradients (heros.astro, noch nicht tokenisiert):**
- Legendary: `rgba(255,215,100,...)` 
- Epic: `rgba(160,90,255,...)`

### Spacings
Tokens vorhanden (4px-Basis, `--space-1` bis `--space-24`). Viele Seiten nutzen noch Literal-Pixel.
Hauptabweichungen (alle in guides):
- `14px` = zwischen `--space-3 (12px)` und `--space-4 (16px)` - auf `--space-3` konsolidieren
- `20px` = `--space-5` bereits im Token-Set

### Border-Radii
| Token | Wert | Verwendung |
|---|---|---|
| `--radius-sm` | `4px` | Badges, kleine Elemente |
| `--radius-md` | `8px` | Buttons, Inputs, mittlere Karten |
| `--radius-lg` | `12px` | grosse Karten |
| `--radius-xl` | `16px` | sehr grosse Panels |
| `--radius-2xl` | `20px` | Glow-Pseudoelemente |
| `--radius-full` | `9999px` | Pills/Chips |

Abweichungen:
- `border-radius: 6px` in heros.astro `hero-wrapper` - zwischen sm und md, auf `--radius-md` konsolidieren
- `border-radius: 20px` = `--radius-2xl`

### Box-Shadows
Aus tokens.css vorhanden. Selten direkt verwendet. Stattdessen tinted backgrounds.

### Z-Indizes
| Token | Wert | Verwendung |
|---|---|---|
| `--z-overlay` | 200 | hero-page-header, dot-nav |
| `--z-nav` | 500 | Sidebar |
| `--z-dropdown` | 100 | Filter-Dropdowns |

Abweichungen: `z-index: 10` in icon-stack (heros) - entspricht `--z-raised`

### Breakpoints
- Mobile: `480px` (in tokens dokumentiert, selten genutzt)
- Tablet: `768px` (haueftgster Breakpoint)
- `600px` (heros.astro Grid-Collapse, nicht in Tokens)

---

## 3. Pattern-Erkennung

### P1 - Card-Container (HAEUFIGSTE)
**Vorkommen:** guides (`guide-container`, `overview-card`, `mechanic-box`), [id].astro (`content-section`), tips (`eg-content-card`), bosses (`boss-panel`/`panel-section`)
**Sauberste Variante:** `content-section` aus [id].astro (Token-basiert, sectioniertes Layout)
**gemeinsames Muster:** `background: var(--bg-surface)`, `border-radius: --radius-lg`, `border: 1px solid --border-subtle`, `padding: --space-6`
**Empfohlene API:** `<Card variant="default|raised|accent" class="">...</Card>`

### P2 - Hero-Chip / Hero-Pic (SEHR HAEUFIG)
**Vorkommen:** guides (`hero-chip`/`hero-chip-portrait`), bosses (`hero-chip`), tips (`hero-pic`/`hero-pic-img`)
**Zwei Varianten:**
- `hero-chip` (guides/bosses): Inline portrait-div + name, used in comp-rows
- `hero-pic` (tips): etwas groesser, mit highlight-Variante
**Master:** `hero-chip` aus guides (konsistenter CSS-background-image Ansatz)
**Empfohlene API:** `<HeroChip heroId="..." variant="chip|pic" highlight={bool} />`

### P3 - Rating-Badge / Tier-Pill (SEHR HAEUFIG)
**Vorkommen:** [id].astro (`hdr-rating`, `big-rating-tile`, `list-badge`), heros.astro (`list-badge`), guides (`rating-badge`)
**Alle konsumieren Tier-Token-Variablen** (--tier-sss-from etc.) - bereits tokenisiert
**Empfohlene API:** `<RatingBadge rating="SSS|SS|S|A|B|C" size="sm|md|lg" />`

### P4 - Comp-Entry (MITTEL-HAEUFIG)
**Vorkommen:** guides (`comp-entry`), bosses (`comp-entry`), [id].astro (via HeroCompositions)
**Fast identisch in guides und bosses** - gutes Konsolidierungs-Kandidat
**Besteht aus:** `comp-label`, `comp-reason`, `comp-hero-row` (list of HeroChips), `comp-notes` (ul)
**Empfohlene API:** Composable in HeroCompositions.astro bereits vorhanden - nur Token-Basis sichern

### P5 - Accordion (MITTEL-HAEUFIG)
**Vorkommen:** guides (`hero-accordion`, accordion-panel/img/content/label), bosses (`boss-accordion-nav`, accordion-panel)
**Nahezu identische CSS-Struktur** (flex, absolute img, content overlay, is-active class)
**Unterschiede:** guides hat `--img-pos` CSS-Variable, bosses hat feste Bildposition
**Empfohlene API:** `<AccordionNav items={[]} activeIndex={n} />`

### P6 - Section-Label (SEHR HAEUFIG in [id].astro)
**Vorkommen:** [id].astro (`section-label`), guides (`section-title`)
**Beide sind Abschnitts-Kicker** aber mit unterschiedlichem Stil
- `section-label` ([id].astro): kleiner uppercase Kicker
- `section-title` (guides): Kicker mit Deko-Balken via pseudo-elements
**Master:** `section-label` aus [id].astro (schlichter, Token-kompatibel)

### P7 - Skill-Card (MITTEL-HAEUFIG)
**Vorkommen:** guides (`skill-card`), [id].astro (`skill-panel` via Tab-System)
**Unterschiedliche Konzepte:**
- guides: Stand-alone Card pro Skill (kein Tab)
- [id].astro: Tab-basiertes Panel-System (besser)
**Master:** [id].astro Skill-Tab-Panel-System

### P8 - Page-Wrapper (GLOBAL)
**Vorkommen:** alle Seiten (`page-wrapper`)
**Definition in bosses.astro via `is:global`:**
```css
.page-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0px 16px 0;
}
```
**In heros.astro**: identisch
**Sollte in base.css oder tokens.css** als globale Klasse definiert werden

### P9 - Pill/Badge (BOSSES-SPEZIFISCH)
**Vorkommen:** bosses.astro (`pill`, `pill-icon`, `mechanic-pill`)
**Unterschied zu list-badge:** kein Tier-Gradient, neutrale Hintergrundfarbe
**Kandidat fuer generische Badge-Komponente**

### P10 - Tab-Bar (DOPPELT)
**Vorkommen:** tips (`main-tabs`/`main-tab`), [id].astro (`skill-tabs`/`skill-tab`, `comp-mode-tabs`)
**Komplett unterschiedliche Implementierungen** - tips ist simpel, [id].astro ist komplex
**Master:** Token-Variablen bereits in tokens.css definiert (`--tab-*`)

---

## 4. Layout-Entry-Point

**Hauptlayout:** `src/layouts/Base.astro`
- Importiert `src/styles/tokens.css` via `@import` in `<style is:global>`
- Importiert `src/styles/components.css` via `@import` in `<style is:global>`
- Definiert globales Body-Styling (Inter-Font, Gradient-Background, `margin-left: var(--sidebar-width)`)
- Bindet Sidebar und Footer als Komponenten ein

**Weitere globale Style-Dateien:**
| Datei | Zweck |
|---|---|
| `src/styles/tokens.css` | Alle Design-Tokens (existiert, gut strukturiert) |
| `src/styles/components.css` | Globale Komponenten-Styles (noch zu prufen) |
| `src/styles/compositions.css` | Team-Comp-Styles (importiert in bosses.astro) |
| `src/styles/events.css` | Event-Styles (importiert in bosses.astro) |

**Wo neue Styles eingebunden werden muessen:**
- `reset.css` und `base.css` als `@import` in `Base.astro` `<style is:global>` Block
- Reihenfolge: `tokens.css` -> `reset.css` -> `base.css` -> `components.css`

---

## 5. Karteileichen (alle geloescht)

- `src/components/HeroCompositions.astro.bak` - geloescht
- `src/pages/heroes/[id].astro.bak` - geloescht
- `src/pages/guides copy.astro` - geloescht
- `src/components/hero/RatingCard.astro.bak` - geloescht
- `src/components/hero/SkillCard.astro.bak` - geloescht

**Aktive Komponenten in `src/components/hero/`:**
- `RatingCard.astro` - aktiv
- `SkillCard.astro` - aktiv

---

## 6. Offene Luecken / Nachfragen

1. **`--gold-light`** ist in guides.astro lokal definiert (`rgba(250,234,121,0.95)`), fehlt in `tokens.css`. Aufnehmen?

2. **`--accent-teal` / `rgba(64,106,95,...)`** ist der guides-eigene Farbton fuer Mechanic-Boxes. Soll dieser als globaler Token aufgenommen werden, oder ist er guides-spezifisch zu belassen?

3. **`--dark-card: #130E0E`** aus guides ist fast identisch mit `--bg-base: #07060c`. Konsolidieren zu `--bg-base`?

4. **Rarity-Farben** (Common-gruen, Epic-lila, Legendary-gold) fuer Karten-Borders sind noch nicht in `tokens.css`. Aufnehmen?

5. **`page-wrapper`** ist in bosses.astro via `is:global` definiert und in heros.astro dupliziert. Soll dies nach `base.css` oder bleibt es page-lokal?

6. **`600px` Breakpoint** aus heros.astro: In tokens.css ist nur 480/768/1024 dokumentiert. Aufnehmen oder auf 480px konsolidieren?

# Phase 4: Navigation neu sortieren (Card Sorting, keine Flyouts)

Datum: 2026-10-28. Referenz: `newSite/menu*.png` (Gruppen Heroes & gear, Adventure, What's on, Tools). Vorgabe des Besitzers: nicht zu stark an der Referenz, nur als Card Sorting, also Struktur und Reihenfolge, keine aufklappbaren Flyouts. Nicht übernommen werden Seiten, die wir nicht haben (Takeovers, Notices, Community, Gear Codes usw.).

## Ziel
Die 15 sichtbaren Einträge nach Themen gruppieren, mit lesbaren Gruppenüberschriften im Mobile-Menü und auf der Startseite, damit Spieler schneller finden, was sie suchen.

## Ausgangslage
- Quelle der Wahrheit: `src/data/nav.ts` (`NavEntry.group`: `primary | content | tools | meta`). Verbraucher: `Sidebar.astro` (Desktop-Rail mit Trennstrichen, Mobile-Leiste mit 4 markierten Einträgen plus "More"-Sheet), `HomePage.astro` (Teaser-Raster und Verzeichnis, nutzt `tools` vs. Rest), `GuideSectionNav.astro`, `guides/index.astro`.
- Die Rail zeigt nur Icons (Tooltip beim Hover). Das "More"-Sheet listet alle Überlauf-Einträge flach ohne Überschriften.
- Seiten mit `sidebar: false` (Bosses, Divine Throne, Infinite Labyrinth, Timed Challenge, Hero Evolution) erreicht man über die Hubs.
- `/events`, `/banners` sind bewusst unverlinkt und bleiben es.

## Vorschlag: neue Gruppen und Zuordnung

| Gruppe (`group`) | Einträge | Bemerkung |
|---|---|---|
| `home` (oben, ohne Überschrift) | Home | unverändert |
| `heroes` "Heroes" | Hero List, Hero Stats, Tier List, Relic Investment, Totems, Virtue List, Artifact Enhancement | Hero Evolution bleibt `sidebar: false`, erscheint aber in dieser Gruppe auf der Startseite |
| `whatson` "What's on" | Hero Roadmap (später Banners, dann Events) | Die Gruppe bleibt klein, bis `/banners` und `/events` freigegeben sind |
| `tools` "Tools" | Summon Calculator, Wishlist, Virtue Wizard | unverändert, ohne Roadmap |
| `learn` "Guides & Tips" | Guides, Tips | Guides ist der Hub für Adventure (Bosses, Divine Throne, Infinite Labyrinth, Timed Challenge) |
| `meta` | About, Status (nur lokal) | unverändert |

Reihenfolge der Rail von oben nach unten: Home, Heroes, What's on, Tools, Guides & Tips, meta, Support.

Das Mobile-Leiste behält vier markierte Einträge (Home, Guides, Hero List, Hero Stats). Das More-Sheet zeigt die übrigen Einträge **mit Gruppenüberschrift**.

## Umfang
1. `nav.ts`: `group` bekommt die neuen Werte; neue lokalisierte `navGroups`-Tabelle (Reihenfolge, Label in 5 Sprachen, optionale Beschreibung); Hilfsfunktion `entriesByGroup()` liefert die Gruppen in fester Reihenfolge, damit Rail, Sheet und Startseite dieselbe Quelle nutzen.
2. `Sidebar.astro`: Rail rendert die Gruppen aus `entriesByGroup()` (ein Block statt vier kopierter `map`-Blöcke), Trennstrich zwischen Gruppen, Gruppenname als Tooltip/`aria-label` am ersten Eintrag; More-Sheet mit Gruppenüberschriften.
3. `HomePage.astro`: Verzeichnis nach denselben Gruppen statt nach `tools`/Rest.
4. Konsumenten prüfen (`GuideSectionNav`, `guides/index.astro`, `tips.astro`), ob sie `group` verwenden, und anpassen.
5. i18n: Gruppenlabels in den 5 Sprachen.
6. Bestehende URLs bleiben unverändert, es gibt keine Weiterleitungen in dieser Phase.

## Nicht im Umfang
- Aufklappbare Flyouts, Suche (⌘K), neue Seiten, Umbenennen von URLs.
- Einträge für `/events` und `/banners` (bis zur Freigabe) und die Umstellung der Roadmap.
- Neue Icons.

## Erfolgskriterien
- Jeder Eintrag steht in genau einer Gruppe; ein Test (`tests/nav.test.mjs`) prüft, dass jede `group` in `navGroups` existiert, keine Gruppe leer ist und die Reihenfolge der Spezifikation entspricht.
- Rail, More-Sheet und Startseite zeigen dieselben Gruppen in derselben Reihenfolge.
- Das More-Sheet hat Gruppenüberschriften; die Mobile-Leiste hat weiterhin 4 Einträge plus More.
- `/events` und `/banners` tauchen nirgends in der Navigation auf.
- `npm run build` und alle Tests grün; Sichtprüfung Desktop und Handy.

## Entschieden
1. Adventure bleibt über Guides erreichbar (keine eigene Rail-Gruppe).
2. Hero List, Hero Stats und Tier List stehen in der Gruppe "Heroes", nur Home steht frei.
3. Die erste Gruppe heißt "Heroes".

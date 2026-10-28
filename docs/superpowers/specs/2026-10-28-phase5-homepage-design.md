# Phase 5: Startseite

Datum: 2026-10-28. Referenz: `newSite/fastidious.png` (Blöcke "Right now", "New arrivals", große Einstiegskacheln). Vorgabe des Besitzers: große, responsive Kacheln (davon gibt es auf der Seite schon einige, aber zu wenige oder zu kleinteilige).

## Ziel
Die Startseite beantwortet beim Öffnen sofort: **Was läuft gerade, was ist neu, wo geht es weiter.** Alles, was vom Datum abhängt, kommt aus den importierten Spieldaten statt aus Handpflege.

## Ausgangslage (`src/components/pages/HomePage.astro`)
Hero mit drei Buttons, dann "Latest Banner" und "Tower Defense" nebeneinander, "Keep this free", "Start with what matters" (Hero List, Tier List, Guides als große Kacheln), "Everything else" (Verzeichnis nach Navigationsgruppen).
- **"Latest Banner" ist hart codiert:** Held Charon, Zeitraum "Oct 14 — Oct 27, 2026" (gehört zu Yaoji), `data-banner-start="2026-10-14"`. Charon läuft laut Daten 28.10. bis 12.11. Der Block veraltet bei jedem Banner-Wechsel.
- Die Seite ist statisch gebaut; "heute" ist beim Build festgelegt.

## Umfang
1. **"Right now" ersetzt "Latest Banner"** (breite Kachel links neben Tower Defense):
   - Läuft gerade: das laufende Hero-Banner als große Karte im Karten-Design der Banner-Seite (Heldenbild, Name, Zeitraum, "endet in X Tagen"). Daneben das nächste Banner (kleinere Karte, "in X Tagen") und die zwei am bald endenden laufenden Events als Zeilen, Link "Alle Events" auf `/events` und "Alle Banner" auf `/banners`.
   - Berechnung im Browser mit dem heutigen Datum (`src/data/eventTimeline.js`, `src/data/bannerList.js`). Daten als eingebettetes JSON.
   - Kein JavaScript: eine statische Ersatzzeile mit Links auf `/banners` und `/events` (`<noscript>`).
2. **"New arrivals"**: die 6 zuletzt erschienenen Helden (nach Global-Release-Datum, aus `heroReleases`/`summonSchedule`), als `HeroCard`-Reihe mit Release-Datum, jede Karte verlinkt auf `/heroes/<id>`. Nur Helden mit Detailseite und Bild. Wird beim Build berechnet (Release-Datum <= Build-Datum); ein Deploy nach jedem Release ist ohnehin nötig.
3. **Reihenfolge:** Hero, [Right now | Tower Defense], New arrivals, "Start with what matters", "Keep this free", Verzeichnis.
4. **Gemeinsame Kartenlogik:** Die Karten-Erzeugung der Banner-Seite (`card()` in `BannersPage.astro`) wird nach `src/data/bannerCard.js` ausgelagert und von beiden Seiten genutzt, damit die Startseite nicht eine zweite Kopie hat.
5. **Lokalisierung:** neue Texte in 5 Sprachen in `ui.ts` (`home.*`), wie die übrigen Startseitentexte.
6. **Aufräumen:** Hartcodierte Charon-Daten und das Skript für `data-banner-start` entfallen.

## Nicht im Umfang
- Neues Hero-Bild oder Texte der Hero-Sektion, "Keep this free", Verzeichnis, Tower-Defense-Karte.
- News/Patch-Notes-Block, Community-Block, Tools-Kacheln mit Vorschaubildern (bewusst zurückgestellt, siehe frühere Empfehlung).
- Banner-Artwork (separat).

## Erfolgskriterien
- Am Stichtag 28.10.2026 zeigt "Right now" Charon als laufend ("endet in 15 Tagen"), Ananke als nächstes Banner und die bald endenden Events; am 14.11. würde es ohne Neubau Ananke zeigen.
- "New arrivals" zeigt Charon, Yaoji, Mazu, Gaiya, Hebo, Zaojun (neueste zuerst) mit den echten Daten.
- Keine hartcodierten Held- oder Datumsangaben mehr in `HomePage.astro`.
- Test für die Auswahl "zuletzt erschienen" (`recentReleases`) und die Auswahl der Right-now-Einträge (laufendes Banner, nächstes Banner, bald endende Events) inklusive Randtagen.
- Responsive: Karten brechen auf 2 Spalten (≤ 900 px) und 1 Spalte (≤ 600 px).
- `npm run build` und alle Tests grün; Sichtprüfung Desktop und Handy.

## Offene Fragen
1. Sollen **Reruns** in "Right now" als laufendes Banner zählen, wenn gerade ein Rerun läuft und ein neues Banner (wie jetzt: Charon + Bastet-Rerun)? Vorschlag: das neue Hero-Banner als große Karte, der Rerun als Zeile.
2. **New arrivals** mit 6 oder 4 Helden?

# Phase 2: Event-Seite ausbauen (`/events`, nur per URL)

Datum: 2026-10-28. Voraussetzung: Phase 0 und 1 (Seite baut, Daten aus `src/data/generated/events.global.json`). Referenz: `newSite/events.png`.

## Ziel
Aus der vorhandenen Kalender-Seite eine Seite machen, die Spielern auf einen Blick sagt: **Was läuft gerade, wann endet es, was kommt als Nächstes.** Die Seite bleibt unverlinkt und `noindex`, bis der Besitzer sie freigibt.

## Ausgangslage
`src/components/pages/EventsPage.astro` hat bereits: Gantt-Zeitachse (feste 60 Tage, 48 px pro Tag), 5 Kategorie-Gruppen (`banners`, `events`, `leaderboards`, `recurring`, `offers`), Kategorie-Filter, Vor/Zurück/Heute, Today-Spalte, Tooltip, Detail-Dialog, 156 Events aus dem Import. Styles in `src/styles/events.css`. Schwächen: Dialog- und Tooltip-Texte ("Starts", "days") sind fest englisch, keine Zoomstufen, keine Hero-Bilder, auf dem Handy nur horizontales Scrollen, abgeleitete Labels sind nicht erkennbar.

## Umfang
1. **"Right now"-Block** über der Zeitachse: laufende Events (nach Ende sortiert, mit "endet in X Tagen" bzw. "endet heute") und die nächsten kommenden Starts ("in X Tagen"). Max. 6 laufende und 4 kommende Einträge, Banner zuerst. Nur Tagesgenauigkeit, da die Config keine Zeitzone enthält.
2. **Zoomstufen** 7, 14, 30, 60, 90 Tage (Standard 30). Funktionale Anforderung: Der Spieler muss mit einer Zoomstufe möglichst viele Events auf einmal überblicken können, daher gibt es 90 Tage und eine Tagesbreite ab 14 px (bei 90 Tagen ohne Label, nur Farbe und Hero-Bild; Label im Tooltip). Tagesbreite aus der Containerbreite berechnet, Mindestbreite 28 px; Vor/Zurück verschiebt um eine Zoomspanne.
3. **Hero-Porträt auf Balken:** Events mit `heroGameId` zeigen das Thumb des Helden (`heroes/thumbs/<siteId>-96.webp`) vor dem Label. Fehlt das Bild (z. B. Ananke, Nidhogg, Chaos), erscheint ein neutraler Platzhalter statt eines kaputten Bildes. Zuordnung `heroGameId` → Site-ID über `game_id_mapping.json`, zur Build-Zeit in die Eventdaten der Seite eingebettet.
4. **Heute-Linie und "endet in"-Badge:** Vertikale Linie für heute; Balken, die in ≤ 3 Tagen enden, tragen ein Badge ("endet in 2 Tagen").
5. **Mobile Ansicht (≤ 700 px):** Statt Gantt eine Agenda-Liste: nach Startdatum gruppiert, je Eintrag Kategorie-Punkt, Label, Zeitraum und Held. Dieselben Filter.
6. **Abgeleitete Labels:** 96 von 156 Labels sind aus Schablonen gebildet (siehe `events.global.report.json`). Im Detail-Dialog steht dazu der Hinweis "Name aus Spieldaten abgeleitet". Das Flag `derivedLabel` muss dafür in den Importdaten stehen (Anfrage an den Agenten: `derivedLabel: true` pro betroffenem Event).
7. **Lokalisierung:** Alle fest englischen Texte (Dialog, Tooltip, "days", "UTC", Badges, Right-now-Überschriften) werden über `src/i18n/ui.ts` (`events.*`) in den 5 Sprachen geführt und über `data-*`-Attribute oder ein eingebettetes JSON an das Inline-Skript gegeben.
8. **Kategorie-Farben und Legende** bleiben (`category-mark--*`). Die Balkenfarbe folgt der Kategorie, Wiederholungen (`rerun_card_push`) bekommen ein gestricheltes Muster.

## Nicht im Umfang
- Nav-Eintrag, Teaser, Sitemap, Entfernen von `noindex` (Besitzer entscheidet später).
- Spieltag-Wechsel 08:00 UTC oder Uhrzeiten: die Daten haben keine Zeitzone, die Seite zeigt nur Tage und behauptet keine Uhrzeit.
- Banner-Artwork und die Banner-Seite (Phase 3).
- Startseiten-Block "Right now" (Phase 5, nutzt dieselbe Hilfsfunktion).

## Architektur
- Reine Logik in `src/data/eventTimeline.js` (testbar mit `node:test`): `groupByCategory(events)`, `assignLanes(events)`, `runningEvents(events, today)`, `upcomingEvents(events, today, limit)`, `daysUntil(iso, today)`. Die vorhandene Lane-Logik (`lanesFor` im Inline-Skript) wandert dorthin.
- `EventsPage.astro` rendert den Right-now-Block serverseitig (kein JS nötig) und übergibt die Eventdaten samt aufgelöstem Hero-Bild als JSON.
- Das Inline-Skript importiert keine Module; es bekommt die Logik als vorberechnete Daten bzw. bleibt auf Darstellung und Interaktion beschränkt. Ob die Lane-Berechnung in den Build wandert (empfohlen, ein Skript weniger) oder im Browser bleibt, entscheidet der Plan.

## Erfolgskriterien
- `/events` zeigt oben "Right now" mit korrekten Restlaufzeiten (Test: Event endet heute, endet in 3 Tagen, beginnt morgen).
- Zoom 7/14/30/60 funktioniert; Heute-Linie und Badges stimmen an den Rändern (Event endet gestern, beginnt heute, überspannt die ganze Spanne).
- Hero-Porträts erscheinen für vorhandene Helden, Platzhalter für fehlende, keine kaputten Bilder.
- Bei 390 px Breite erscheint die Agenda-Liste, ohne horizontales Seiten-Scrollen.
- Alle Texte der Seite sind in den 5 Sprachen vorhanden.
- `/events` bleibt `noindex`, nicht in Sitemap, nicht in der Navigation.
- `npm run build` und `node --test tests/*.test.mjs` grün.

## Entschieden
- Standard-Zoom 30 Tage; viele Events sichtbar machen ist eine funktionale Anforderung (Zoom 90).
- "Right now" zeigt keine abgelaufenen Events.
- Der Agent liefert `derivedLabel` (Anfrage steht in `docs/agent-message-android.md`); bis dahin entfällt der Hinweis im Dialog.
- Die Seite ist statisch gebaut: "Right now" und alle Restlaufzeiten werden im Browser mit dem heutigen Datum berechnet, nicht beim Build (sonst veralten sie bis zum nächsten Deploy). Das Skript wird deshalb ein gebündeltes `<script>` (kein `is:inline`), das `src/data/eventTimeline.js` importiert.
- Die Seitentexte bleiben im vorhandenen lokalen `copy`-Objekt von `EventsPage.astro` (bestehendes Muster) statt in `ui.ts`.

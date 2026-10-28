# Phase 3: Banner-Seite (`/banners`), die die Hero-Roadmap ersetzt

Datum: 2026-10-28. Voraussetzung: Phase 0 bis 2. Referenz: `newSite/banners.png`. Ohne Banner-Artwork (kommt später).

## Ziel
Eine Seite, die zeigt, **welcher Held in welchem Zeitraum als Banner lief, jetzt läuft und als Nächstes kommt**, inklusive der redaktionellen Pull-Empfehlung. Sie löst die bisherige Hero-Roadmap (`/summon-calendar`) ab.

## Entscheidung: Roadmap ersetzen, nicht behalten
Befund aus den Daten: Der Client kennt 26 Hero-Banner (`new_card_push`) von 2026-01-21 (Hladgunnr) bis 2026-11-13 (Ananke) und 4 Wiederholungs-Banner (`rerun_card_push`, Starts 28.10., 20.11., 25.12., 15.01.). Das ist dieselbe Heldenliste wie in der Roadmap (28 Einträge bis Ananke). Die Roadmap kann darüber hinaus nur das, was der Client nicht hat: Venus und Chaos (noch ohne Banner), Pull-Empfehlung (`pullQuality`), Reihenfolge und Wertung.

Daraus folgt eine Seite mit zwei Abschnitten statt zwei Seiten:
- **Aktuell und kommend:** laufende Banner, bestätigte kommende Banner (aus dem Client) und unbestätigte Helden (Venus, Chaos) mit "geschätzt"-Kennzeichen. Karten tragen die Pull-Empfehlung.
- **Verlauf:** vergangene Banner, nach Monat gruppiert, neueste zuerst.

Die Roadmap-URL wird nach Freigabe zu einer Weiterleitung auf `/banners`. Bis dahin bleibt sie unverändert bestehen.

## Umfang
1. **Seite `/banners`** (und `/<locale>/banners`), zunächst wie `/events`: `noindex`, kein Nav-Eintrag, nicht in der Sitemap.
2. **Datenmodul `src/data/banners.ts`** (Logik in `src/data/bannerList.js`, testbar): baut pro Banner einen Eintrag aus den Importdaten.
   - `id`, `heroSiteId` (über Spiel-ID), `heroName`, `start`, `end`, `kind` (`new` | `rerun`), `status` (`running` | `upcoming` | `ended`, berechnet im Browser gegen heute), `pullQuality`, `order`, `ratings.overall`, Klasse/Fraktion/Rolle.
   - Reruns zeigen den Helden aus dem vorherigen Banner derselben Serie; falls im Client kein Held angegeben ist, erscheint "Wiederholung" ohne Held.
   - Unbestätigte Helden aus `summonSchedule.ts` (ohne Banner-Event) werden als `upcoming` mit `estimated: true` angehängt.
3. **Karte:** Header-Bild = Helden-Kartenbild (`heroes/cards/<id>-480.webp`) zugeschnitten und abgedunkelt, darüber Name und Typ-Badge (Neu / Wiederholung / geschätzt); darunter Zeitraum, Porträt, Klasse/Fraktion/Rolle-Icons, Gesamtwertung, Pull-Empfehlung. Für Helden ohne Bild (Ananke, Nidhogg, Venus, Chaos) ein neutraler Platzhalter statt eines kaputten Bildes. Echtes Banner-Artwork ersetzt später nur den Bildpfad pro Banner.
4. **Filter und Suche:** Chips Alle, Neu, Wiederholung, Laufend, Kommend; Suchfeld nach Heldenname. Zustand über URL-Parameter, damit Links teilbar sind.
5. **Lokalisierung:** alle Texte in den 5 Sprachen, Struktur wie `EventsPage.astro`.
6. **Roadmap-Funktionen, die erhalten bleiben:** Pull-Empfehlung, Reihenfolgennummer, Gesamtwertung, Klasse/Fraktion/Rolle-Icons, Disclaimer "Daten geschätzt" bei unbestätigten Helden.
7. **Umstellung (separater Schritt nach Freigabe):** `/summon-calendar` leitet per `_redirects` (301) auf `/banners` um; Nav-Eintrag "Hero Roadmap" wird zu "Banners"; Startseiten-Teaser und i18n-Label `/summon-calendar` entsprechend; Roadmap-Seite und `summon-calendar.astro` werden entfernt.

## Nicht im Umfang
- Banner-Artwork (separat, Agent).
- Banner vor 2026-01-21: der Client-Export enthält sie nicht. Verlauf beginnt dort. Die Referenz zeigt Dezember 2024; falls der Besitzer ältere Banner will, müssen sie von Hand ergänzt werden.
- Uhrzeiten (Daten haben keine Zeitzone).
- Nav-Umbau (Phase 4) und Startseite (Phase 5).

## Erfolgskriterien
- `/banners` zeigt 26 Hero-Banner und 4 Wiederholungen, korrekt nach Monat gruppiert; Charon als laufend (28.10.), Ananke als kommend, Venus und Chaos als "geschätzt".
- Jede Karte trägt die Pull-Empfehlung des Helden aus `summonSchedule.ts`; kein Held ohne Bild zeigt ein kaputtes Bild.
- Filter und Suche funktionieren und überleben ein Neuladen (URL-Parameter).
- Alle Texte in 5 Sprachen; `/banners` bleibt `noindex`, nicht in Sitemap und Nav.
- Tests für `bannerList.js`: Rerun-Zuordnung, Statusberechnung am Randtag, Anhängen unbestätigter Helden, Sortierung nach Monat.
- `npm run build` und `node --test tests/*.test.mjs` grün.

## Offene Punkte
- Soll der Verlauf eine Zusammenfassung pro Monat zeigen (z. B. "3 Banner")?
- Soll die Seite nach der Umstellung unter `/banners` oder weiter unter `/summon-calendar` liegen? Empfehlung: `/banners`, die alte URL leitet weiter.

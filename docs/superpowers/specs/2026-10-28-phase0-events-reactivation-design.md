# Phase 0: Events-Seite reaktivieren und Bild-Lücken dokumentieren

Datum: 2026-10-28. Teil eines Vier-Phasen-Plans: 0 Aufräumen, 1 Event-Seite, 2 Banner-Seite, 3 Navigation (Card Sorting). Pro Phase eine Spec.

## Ziel
Die deaktivierte Event-Seite wieder baubar und erreichbar machen und festhalten, welche Bilder nach der R2-Wiederherstellung fehlen. Danach kann Phase 1 die Seite visuell neu aufbauen.

## Ausgangslage (verifiziert)
- Seite: `src/pages/_events.astro` und `src/pages/[locale]/_events.astro` (Unterstrich-Präfix, Astro ignoriert sie). Beide importieren `src/components/pages/xxxxxxxxEventsPage.astro`.
- Commit `adb2d032` ("Fix build: disable events pages...") hat die Seiten deaktiviert und den Nav-Eintrag "Event Calendar" aus `src/data/nav.ts` entfernt. Ursprünglicher Dateiname der Komponente: `EventsPage.astro`.
- Daten: `src/data/eventsGlobal.ts` (ca. 60 Events, 5 Kategorien, bis März 2027), Styles: `src/styles/events.css`, i18n-Keys `events.*` in `src/i18n/ui.ts`, Routenlabel `/events` ebenfalls dort.
- R2: Bucket `motto-immortal` (910 Dateien). Von 133 im Code referenzierten Bild-Pfaden fehlen 30 (siehe unten). Keine der 30 liegt unter anderem Namen im Bucket oder lokal in `dist/`, `extracted/`, `data-mine/`, `outputs/`.

## Umfang
1. **Build-Ursache klären.** `npm run build` mit aktivierten Seiten ausführen und die konkrete Fehlermeldung festhalten. Die Verdrahtung der Seiten sieht auf den ersten Blick korrekt aus, die Ursache ist noch nicht bekannt. Fix nur für den tatsächlichen Fehler.
2. **Dateien normalisieren.** `xxxxxxxxEventsPage.astro` zurück zu `EventsPage.astro`, `_events.astro` zu `events.astro` (beide Orte), Importe anpassen.
3. **Kein Nav-Eintrag.** Die Seite ist nur per direkter URL (`/events`, `/<locale>/events`) erreichbar. Weder Sidebar noch Teaser noch Sitemap-Verweis. Eintrag in die Navigation erfolgt erst nach Freigabe durch den Besitzer (frühestens Phase 3).
4. **Bild-Lücken dokumentieren** in `docs/r2-missing-assets.md` (Liste + Fundstellen im Code). Keine Code-Änderung an den betroffenen Seiten.
5. **Prüf-Skript** `scripts/check-r2-refs.mjs`: sammelt Bild-Pfade aus `src/`, prüft sie per HTTP gegen R2 und listet 404er. Wiederverwendbar für Phase 2.

## Fehlende Bilder (30)
- Helden: ananke, chaos, joanneofarc, nidhogg, venus
- Totem-Icons (14): allseeingeyes, branchofserenity, defiantvow, eternaleclipse, hornofpotency, keystoneofwonders, moonglowtear, primordialeverbloom, sanctifiedblood, sigiloflongevity, solarscorch, undyingstaff, unsulliedlotus, windrunnersgrace
- Bosses (7): baphomet, demonic_horse, epica, isthar_vi, jackfrost, lilith, typhoon
- Sonstige: bg_neutral.webp, hall.webp, frieren.jpg, features/home-hero-divine-citadel.webp
- Aus der Git-Historie wiederherstellbar: `icons/totems/moonglowtear.webp` und `unsulliedlotus.webp` (Commit `9454f10f`). Alles andere ist nirgends mehr vorhanden.

## Nicht im Umfang
- Neues Design der Event-Seite (Phase 1), Banner-Seite (Phase 2), Navigation (Phase 3).
- Neu hochladen oder neu erzeugen der fehlenden Bilder. Entscheidung später: neu beschaffen oder aus den Seiten entfernen.
- Änderungen am R2-Bucket.

## Erfolgskriterien
- `npm run build` läuft durch, `/events` und `/<locale>/events` werden erzeugt.
- Die Seite lädt lokal (`npm run dev`) und zeigt Events aus `eventsGlobal.ts`.
- Kein Nav-Eintrag und kein Teaser für `/events`, die Seite ist nur per URL erreichbar. Zu prüfen: `robots`/Sitemap verweisen nicht darauf (noindex erwägen, solange sie unverlinkt ist).
- `docs/r2-missing-assets.md` und `scripts/check-r2-refs.mjs` vorhanden, Skript meldet die 30 bekannten Lücken.

## Offene Frage
`src/i18n/ui.ts` enthält einen Sprachhinweis ("languageNotice…"), laut dem aktuell keine neuen Event-Daten oder Termine veröffentlicht werden können. Muss dieser Hinweis nach der Reaktivierung angepasst oder entfernt werden? Die Datenquelle in `eventsGlobal.ts` ist ein Auszug aus einem lokalen Dashboard (`~/android/dashboard/...`).

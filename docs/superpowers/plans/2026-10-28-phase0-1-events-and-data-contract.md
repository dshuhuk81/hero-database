# Phase 0 + 1: Events reaktivieren und Datenvertrag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Event-Seite ist nur per URL erreichbar und baut wieder; Release-Daten und Events kommen aus den vom Android-Agenten gelieferten JSON-Dateien statt aus Handkuration.

**Architecture:** Ein Import-Skript validiert und kopiert die Agent-Dateien nach `src/data/generated/`. Reine Logik (Validierung, Status, effektives Release-Datum) liegt in `.js`-Modulen mit `node:test`-Tests; `.ts`-Loader und Astro-Seiten konsumieren sie. `summonSchedule.ts` behält nur redaktionelle Felder.

**Tech Stack:** Astro 7, TypeScript/ESM, `node:test` (wie `tests/rating-system.test.mjs`), `npm run build`.

**Spec:** `docs/superpowers/specs/2026-10-28-phase0-events-reactivation-design.md`, `docs/superpowers/specs/2026-10-28-phase1-data-contract-design.md`

## Global Constraints

- Die Event-Seite bekommt **keinen** Nav-Eintrag, keinen Teaser und keinen Sitemap-Eintrag; erreichbar nur über `/events` und `/<locale>/events`.
- Sprachhinweis-Dialog auf der Startseite entfällt komplett (Markup, Skript, CSS, i18n-Keys).
- Datumsformat überall ISO `YYYY-MM-DD`. Platzhalter-Daten (Jahr 2099, 2027-12-12 bei Alt-Slots) sind `null`, nie ein Datum.
- Held-Zuordnung immer über Spiel-ID (`gameId`/`heroGameId` → `game_id_mapping.json` `game_hero_id`), nie über Namen. Einträge mit `alias_of` überspringen.
- `status` (released/upcoming) wird nie gespeichert, nur beim Build aus Datum und heutigem Tag berechnet. Release-Tag selbst zählt als released.
- Der Android-Agent schreibt nur nach `~/Downloads/Sites/android/out/site_data/`, nie in dieses Repo (kein `--ts`).
- Keine Commits ohne Aufforderung des Besitzers. Das Arbeitsverzeichnis enthält viele fremde Änderungen; nur eigene Dateien anfassen.
- Tests: `node --test tests/<file>`; Build: `npm run build`.

## Review Focus

- `end` vor `start` oder fehlendes Datum in einem Event: Import bricht mit Meldung ab, statt kaputte Balken zu bauen.
- `heroGameId` ohne Mapping (aktuell 5012 Chaos): Import meldet es als Warnung, Seite zeigt den Event ohne Held.
- Starthelden mit `globalRelease: null` ("von Anfang an") dürfen nicht als "TBD" oder upcoming erscheinen.
- Release-Datum == heute: gilt als released (Charon am 28.10.).
- `/events` darf weder in `sitemap-*.xml` noch im Sidebar/Teaser auftauchen; `/de/events` etc. müssen trotzdem bauen.

---

## Phase 0

### Task 1: Sprachhinweis entfernen

**Files:**
- Modify: `src/components/pages/HomePage.astro` (Dialog-Markup ab Zeile 52, Inline-Skript um Zeile 327 mit `motto-language-notice-v2`, CSS-Block `.language-notice*` ab Zeile 1103)
- Modify: `src/i18n/ui.ts:242-246` (Keys `languageNoticeEyebrow|Title|Body|Discord|Dismiss` in `home`; Typ in Zeile ~8 prüfen)

- [ ] **Step 1:** Das `<dialog class="language-notice">…</dialog>`, das zugehörige `<script>` (alles was `data-language-notice` nutzt) und alle `.language-notice*`-Regeln (inkl. `::backdrop` und Mobile-Varianten) aus `HomePage.astro` löschen.
- [ ] **Step 2:** Die fünf `languageNotice*`-Keys aus `ui.ts` löschen; falls ein Interface sie auflistet, ebenfalls entfernen. `common.dismiss` nur löschen, wenn `grep -rn '"dismiss"' src` keine weitere Nutzung zeigt.
- [ ] **Step 3:** Verifizieren: `grep -rni "language-notice\|languageNotice\|motto-language-notice" src` liefert keine Treffer.

### Task 2: Events-Seite reaktivieren (nur per URL)

**Files:**
- Rename: `src/components/pages/xxxxxxxxEventsPage.astro` → `src/components/pages/EventsPage.astro`
- Rename: `src/pages/_events.astro` → `src/pages/events.astro`; `src/pages/[locale]/_events.astro` → `src/pages/[locale]/events.astro`
- Modify: beide Seiten (Import-Pfad), `astro.config.mjs` (Sitemap-Filter), `src/layouts/Base.astro` (noindex, falls Prop fehlt)

**Interfaces:**
- Produces: Routen `/events` und `/{de,es,ru,zh}/events`; `<Base noindex>`-Prop (boolean) falls nicht vorhanden.

- [ ] **Step 1: Fehler reproduzieren.** Dateien umbenennen und Importe anpassen, dann `npm run build`. Die genaue Fehlermeldung (falls vorhanden) notieren; nur diesen Fehler beheben. Erwartung: entweder Build grün oder konkrete Meldung (Import, Typ, fehlender i18n-Key).
- [ ] **Step 2:** `Base.astro` auf eine `noindex`-Prop prüfen; falls keine existiert, `noindex?: boolean` ergänzen, die `<meta name="robots" content="noindex, nofollow">` ausgibt. `EventsPage.astro` setzt `noindex`.
- [ ] **Step 3:** `sitemap({ filter: (page) => !/\/events\/?$/.test(page) })` in `astro.config.mjs` (bestehende Konfiguration erhalten).
- [ ] **Step 4:** Verifizieren: `npm run build` grün; `dist/events/index.html` und `dist/de/events/index.html` existieren und enthalten `noindex`; `grep -l "/events" dist/sitemap*.xml` ohne Treffer; `grep -rn '"/events"' src/data/nav.ts` ohne Treffer.

### Task 3: Prüf-Skript für R2-Referenzen und Lückenliste

**Files:**
- Create: `scripts/lib/r2-refs.mjs` (`extractR2Paths(text: string, base: string): string[]`)
- Create: `scripts/check-r2-refs.mjs` (liest `src/`, prüft per HTTP gegen `R2_BASE`, listet 404)
- Create: `docs/r2-missing-assets.md` (Inhalt aus `~/Downloads/Sites/android/out/R2_LUECKEN.md`, ergänzt um Hinweis auf Git-Wiederherstellung)
- Test: `tests/r2-refs.test.mjs`

- [ ] **Step 1: Test schreiben.** `extractR2Paths('src="https://pub-x.r2.dev/heroes/a.webp?v=1" url(/r2/bosses/b.png)', "https://pub-x.r2.dev")` ergibt `["heroes/a.webp", "bosses/b.png"]`; doppelte Pfade nur einmal; Pfade ohne Bildendung ignoriert.
- [ ] **Step 2:** `node --test tests/r2-refs.test.mjs` schlägt fehl (Modul fehlt).
- [ ] **Step 3:** `extractR2Paths` implementieren (Regex für `r2.dev`- und `/r2/`-Präfix, Query abschneiden, `Set`). `check-r2-refs.mjs` nutzt sie, `HEAD`-Requests mit Parallelität 16, Exit-Code 1 bei 404. Im Skript-Kopf dokumentieren: dynamisch gebaute URLs (z. B. `iconUrl()` in `summon-calendar.astro`) werden nicht erkannt.
- [ ] **Step 4:** `node --test tests/r2-refs.test.mjs` grün; `node scripts/check-r2-refs.mjs` meldet die 30 bekannten Lücken (Stand 2026-10-28).
- [ ] **Step 5:** `docs/r2-missing-assets.md` anlegen; nennt außerdem: `moonglowtear` und `unsulliedlotus` (Totem-Icons) sowie `classes/warrior`, `factions/clubs` sind in der Git-Historie zu prüfen (Commits `9454f10f`, `77c601dc`, `5c39218f`); `src/data/heroes/index.js` Zeile 1 hat einen beschädigten Kommentar und wird dabei auf `// src/data/heroes/index.js` korrigiert.

---

## Phase 1

### Task 4: ID-Mapping ergänzen

**Files:**
- Modify: `src/data/game_id_mapping.json` (Einträge `venus` → 3015, `chaos` → 5012, `joanneofarc` falls Spiel-ID in `hero_releases.json` auffindbar)
- Test: `tests/game-data.test.mjs` (Teil 1)

- [ ] **Step 1: Test.** Jeder `gameId` aus `src/data/generated/hero_releases.json` ohne Release-Datum-Platzhalter, dessen Name auf einen Site-Helden passt, ist im Mapping vorhanden; konkret `mapping.venus.game_hero_id === 3015` und `mapping.chaos.game_hero_id === 5012`.
- [ ] **Step 2:** Test schlägt fehl (Einträge fehlen; `generated/` kommt erst in Task 5, Test bis dahin gegen `~/Downloads/Sites/android/out/site_data/hero_releases.json`-Kopie überspringen mit `skip` wenn Datei fehlt).
- [ ] **Step 3:** Einträge im Format der bestehenden (`game_hero_id`, `match_confidence: "high"`, `match_method: "hero_releases.json+global_config_2026-10-28"`, `status: "ok"`, `assets.internal_name` aus `internalName`) ergänzen. `joanneofarc` nur, wenn eindeutig; sonst in `docs/r2-missing-assets.md` als "kein Spiel-ID-Match" vermerken.
- [ ] **Step 4:** Test grün.

### Task 5: Import-Skript mit Validierung

**Files:**
- Create: `scripts/lib/game-data.mjs`
  - `validateHeroReleases(data: unknown): string[]` (Fehlerliste, leer = ok)
  - `validateEvents(data: unknown): { errors: string[]; warnings: string[] }`
- Create: `scripts/import-game-data.mjs` (Argument `--from <dir>`, Standard `../android/out/site_data`; schreibt nach `src/data/generated/`)
- Create: `src/data/generated/hero_releases.json`, `src/data/generated/events.global.json` (Importergebnis)
- Modify: `package.json` (Skript `"import:game-data": "node scripts/import-game-data.mjs"`)
- Test: `tests/game-data.test.mjs` (Teil 2)

**Interfaces:**
- Consumes: Mapping aus Task 4 (`game_id_mapping.json`).
- Produces: Dateien in `src/data/generated/` mit exakt dem Schema aus der Phase-1-Spec.

- [ ] **Step 1: Tests.** `validateEvents` mit einem Event `{start:"2026-11-10", end:"2026-11-01", …}` liefert einen Fehler, der die Event-`id` enthält; Event mit unbekannter `heroGameId` liefert Warnung (kein Fehler); gültiger Event liefert nichts. `validateHeroReleases` meldet ein Datum `2099-11-02` als Fehler und akzeptiert `null`.
- [ ] **Step 2:** Tests schlagen fehl.
- [ ] **Step 3:** Beide Funktionen in `scripts/lib/game-data.mjs` implementieren (ISO-Regex `^\d{4}-\d{2}-\d{2}$`, Kategorie ∈ `banners|events|leaderboards|recurring|offers`, doppelte `id` ist Fehler). `import-game-data.mjs` validiert, bricht bei Fehlern mit Exit 1 ab, gibt Warnungen aus und schreibt formatiert (2 Leerzeichen).
- [ ] **Step 4:** Tests grün; `npm run import:game-data` läuft durch (erwartet: 1 Warnung zu 5012, falls Task 4 es nicht schon abdeckt: dann 0).

### Task 6: Release-Logik

**Files:**
- Create: `src/data/releaseStatus.js`
  - `releaseStatus(globalRelease: string | null, today: string): "released" | "upcoming" | "launch"` (`launch` = von Anfang an, `globalRelease === null` bei Startheld)
  - `effectiveRelease(globalRelease: string | null, eventStarts: string[]): { date: string | null; source: "client" | "event" | "none" }` (Client-Datum hat Vorrang, sonst früheste Event-Startzeit, sonst `none`)
- Create: `src/data/heroReleases.ts` (Loader; `getHeroRelease(siteId: string): { gameId: number; globalRelease: string | null; cnRelease: string | null; date: string | null; source: "client" | "event" | "estimated" | "none" }`)
- Test: `tests/release-status.test.mjs`

**Interfaces:**
- Consumes: `src/data/generated/*.json`, `game_id_mapping.json`.
- Produces: `getHeroRelease`, `releaseStatus`, `effectiveRelease` für Task 7.

- [ ] **Step 1: Tests.** `releaseStatus("2026-10-28","2026-10-28") === "released"`; `releaseStatus("2026-11-02","2026-10-28") === "upcoming"`; `effectiveRelease(null, ["2026-12-07"])` ergibt `{date:"2026-12-07", source:"event"}`; `effectiveRelease("2026-11-13", ["2026-12-07"])` bleibt beim Client-Datum; `effectiveRelease(null, [])` ergibt `{date:null, source:"none"}`.
- [ ] **Step 2:** Tests schlagen fehl.
- [ ] **Step 3:** `releaseStatus.js` implementieren (String-Vergleich der ISO-Daten reicht). `heroReleases.ts` baut beim Import eine Map Site-ID → Release über das Mapping und sammelt pro `heroGameId` die `start`-Daten der `events`-Einträge mit `series` ∈ `new_card_push|seawar|hero_shop`.
- [ ] **Step 4:** Tests grün.

### Task 7: Roadmap auf Importdaten umstellen

**Files:**
- Modify: `src/data/summonSchedule.ts` (Felder `status` und `releaseDate` entfernen, `estimatedDate?: string` (ISO, nur manuelle Schätzung) ergänzen; `order`, `pullQuality`, `displayName` bleiben)
- Modify: `src/pages/summon-calendar.astro` (`resolveEntry`, Zeilen ~55-80 und Filter Zeilen 82-83), `src/components/pages/HomePage.astro` (Nutzer von `summonSchedule`)

**Interfaces:**
- Consumes: `getHeroRelease`, `releaseStatus` aus Task 6.

- [ ] **Step 1:** Alle Nutzer von `summonSchedule` finden (`grep -rn summonSchedule src`) und auf eine gemeinsame Hilfsfunktion `resolveScheduleEntry(entry: ScheduleEntry, today: string)` in `src/data/summonSchedule.ts` umstellen, die `{ status, displayDate, dateSource }` liefert (Datum aus `getHeroRelease`, sonst `estimatedDate` mit `dateSource: "estimated"`).
- [ ] **Step 2:** Roadmap-Seite zeigt bei `dateSource: "estimated"` ein sichtbares "geschätzt"-Kennzeichen am Datum; Datum formatiert wie bisher (`April 01, 2026`).
- [ ] **Step 3:** Handgepflegte `releaseDate`/`status` aus allen Einträgen löschen; für `venus` `estimatedDate: "2026-11-25"` belassen. Chaos bekommt kein `estimatedDate`, sein Datum kommt aus dem Sea-War-Event (2026-12-07).
- [ ] **Step 4:** Verifizieren: `npm run build` grün; in `dist/summon-calendar/index.html` steht Charon unter "Already Released"; Chaos zeigt "December 07, 2026"; Venus trägt das "geschätzt"-Kennzeichen; `grep -n "releaseDate:" src/data/summonSchedule.ts` ohne Treffer.

### Task 8: eventsGlobal.ts auf Importdaten umstellen

**Files:**
- Modify: `src/data/eventsGlobal.ts` (Typ `GlobalEvent`: `hero?: string` ersetzen durch `heroGameId?: number`; Event-Liste aus `generated/events.global.json` laden; `globalEventsMeta` aus `generatedAt` und `client` ableiten)
- Modify: `src/components/pages/EventsPage.astro` (Nutzung von `hero`, `globalEventsMeta.generated`)

**Interfaces:**
- Consumes: `src/data/generated/events.global.json`.
- Produces: unveränderte Exporte `globalEvents: GlobalEvent[]`, `globalEventsMeta`, `GlobalEventCategory`.

- [ ] **Step 1:** `grep -rn "\.hero\b\|globalEventsMeta" src` ausführen und jede Nutzung anpassen (Held-Name über `heroGameId` → Mapping → Heldendaten auflösen, falls die Seite ihn anzeigt).
- [ ] **Step 2:** Die handgepflegte `event(...)`-Liste und den Pfadkommentar zu `~/android/dashboard/...` löschen; Kommentar nennt stattdessen `npm run import:game-data`.
- [ ] **Step 3:** Verifizieren: `npm run build` grün; `/events` zeigt 156 Events nach Kategorie (über `dist/events/index.html` auf `id="global-event-data"` prüfen: JSON enthält 156 Einträge); `grep -c "event(" src/data/eventsGlobal.ts` ergibt 0.

### Task 9: Nachricht an den Agenten und Abschluss

**Files:**
- Create: `docs/agent-message-android.md` (Text unten)

- [ ] **Step 1:** Datei mit folgender Nachricht anlegen: "Bitte `export_events.py` und `export_hero_releases.py` so anpassen, dass sie ausschließlich nach `out/site_data/` schreiben; `--ts` und `--repo` für `hero-database` entfallen. Das Repo importiert selbst per `npm run import:game-data`. Bitte danach Banner-Artwork (`A_UI_NewCardPush_*`) extrahieren und als `banners/new-card-push/<heroGameId>.webp` in R2 hochladen und die Schlüssel melden."
- [ ] **Step 2:** Gesamtprüfung: `node --test tests/*.test.mjs`, `npm run build`, `node scripts/check-r2-refs.mjs` (meldet weiterhin nur die dokumentierten Lücken).

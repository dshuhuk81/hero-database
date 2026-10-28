# Phase 3: Banner-Seite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** `/banners` zeigt laufende, kommende und vergangene Hero-Banner mit Pull-Empfehlung (versteckt, `noindex`), als Nachfolger der Roadmap.
**Architecture:** Reine Logik in `src/data/bannerList.js` (Test mit `node:test`); `src/data/banners.ts` baut die Einträge aus Importdaten + `summonSchedule`; `BannersPage.astro` rendert im Browser (gebündeltes `<script>`, heutiges Datum).
**Spec:** `docs/superpowers/specs/2026-10-28-phase3-banners-design.md`

## Global Constraints
- Kein Nav-Eintrag, `noindex`, nicht in der Sitemap (Muster wie `/events`); `/summon-calendar` bleibt unverändert, Umstellung ist ein separater Schritt nach Freigabe.
- Ohne Banner-Artwork: Header-Bild = `heroes/cards/<id>-480.webp`, Platzhalter bei Fehler.
- Texte in 5 Sprachen im lokalen `copy`-Objekt wie `EventsPage.astro`. Keine Commits.

## Tasks
### Task 1: Logik `src/data/bannerList.js`
- `bannerStatus(start, end, today): "ended"|"running"|"upcoming"` (Ende inklusive; `end` null: running ab Start)
- `splitBanners(banners, today): { current, history }` (current: laufend zuerst nach Ende, dann kommend nach Start, undatierte zuletzt; history: beendet, neueste zuerst)
- `groupByMonth(banners): { month: "YYYY-MM", items }[]` (Reihenfolge bleibt)
- `filterBanners(banners, { kind, status, query }, today)`
- Test `tests/banner-list.test.mjs`: Randtag Ende = running, Start morgen = upcoming, Sortierung, Monatsgruppen, Suche ohne Beachtung der Groß-/Kleinschreibung.
### Task 2: Datenmodul `src/data/banners.ts`
- `buildBanners(): BannerEntry[]` aus `globalEvents` (category banners) plus unbestätigte Helden aus `summonSchedule` (`estimated: true`, ohne Banner-Event). Reruns ohne Held.
### Task 3: Seite und Styles
- `src/components/pages/BannersPage.astro`, `src/styles/banners.css`, `src/pages/banners.astro`, `src/pages/[locale]/banners.astro`.
### Task 4: Prüfung
- Build, Tests, `dist/banners` `noindex`, Sitemap, Nav; Chrome-Screenshot.

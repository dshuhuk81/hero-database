# Phase 1: Datenvertrag mit dem Android-Agenten (Hero-Releases und Events)

Datum: 2026-10-28. Ziel: Keine Handkuration mehr für Release-Daten und Events. Der Agent im Repo `~/Downloads/Sites/android` erzeugt zwei JSON-Dateien, `hero-database` importiert sie per Skript.

## Auftrag an den Agenten

Erzeuge zwei Dateien im Ordner `out/site_data/`, UTF-8, ISO-Datumsformat (`YYYY-MM-DD`), Zeiten als UTC-ISO (`2026-10-28T08:00:00Z`) wo bekannt.

### 1. `hero_releases.json`
```json
{
  "generatedAt": "2026-10-28T12:00:00Z",
  "client": { "global": "v102687", "cn": "1.0.13" },
  "heroes": [
    {
      "gameId": 4014,
      "name": "Charon",
      "internalName": "Karong",
      "globalRelease": "2026-10-28",
      "cnRelease": "2026-07-10",
      "globalSource": "client",
      "portrait": "A_UI_HeadPortrait_Karong02_Img"
    }
  ]
}
```
Regeln:
- `gameId` ist die Spiel-ID (z. B. 4014). Die Brücke zur Site-ID macht `hero-database` über `src/data/game_id_mapping.json`.
- `globalRelease` und `cnRelease` kommen aus `enable_time` in `hero_detail.json`. Platzhalter-Werte (Jahr 2099, 2027-12-12 bei Alt-Slots) werden als `null` geliefert, nie als Datum.
- `globalSource`: `"client"` wenn der Wert aus dem Global-Client stammt, sonst `null` (nicht schätzen, Schätzungen macht die Site).
- Alt-/Skin-Slots (z. B. 30121, 40161) nicht ausgeben.
- Helden ohne Global-Eintrag trotzdem ausgeben, mit `globalRelease: null`.

### 2. `events.global.json`
```json
{
  "generatedAt": "2026-10-28T12:00:00Z",
  "client": "GLOBAL",
  "events": [
    {
      "id": 200390025,
      "label": "New Card Push · Charon",
      "family": "Hero Banner",
      "series": "new_card_push",
      "start": "2026-10-28",
      "end": "2026-11-12",
      "category": "banners",
      "heroGameId": 4014
    }
  ]
}
```
Regeln:
- Felder entsprechen exakt `GlobalEvent` in `src/data/eventsGlobal.ts`, nur `hero` wird zu `heroGameId` (Zahl) statt Freitext wie `"Charon (4014)"`.
- `category` ist einer von `banners`, `events`, `leaderboards`, `recurring`, `offers`.
- Start und Ende als in der Config hinterlegte Tage. Wenn die Config Uhrzeiten enthält, zusätzlich `startAt`/`endAt` (UTC-ISO), da der Spieltag laut Referenz um 08:00 UTC wechselt.
- Alle Events, die der Global-Client kennt, auch zukünftige. Keine manuelle Kuration oder Filterung.

### Lieferung
- Der Agent schreibt die Dateien bei jedem Extraktionslauf neu.
- Er nennt im Abschluss die Zahl der Helden und Events sowie Auffälligkeiten (Platzhalter, fehlende Portraits).

## Seite `hero-database` (nach Lieferung)
- Skript `scripts/import-game-data.mjs`: kopiert die zwei Dateien nach `src/data/generated/`, validiert Schema und ID-Mapping, meldet unbekannte `gameId`.
- `src/data/heroReleases.ts`: Typ und Loader. Status (`released`/`upcoming`) wird beim Build aus `globalRelease` und dem Datum berechnet, nicht gespeichert.
- `summonSchedule.ts` behält nur redaktionelle Felder (`order`, `pullQuality`, `displayName`). Datum und Status kommen aus `heroReleases`.
- `eventsGlobal.ts` wird zum Loader für `generated/events.global.json`. Die Handkuration entfällt.
- Schätzung für Helden ohne Global-Datum (z. B. Venus, Chaos): aus `cnRelease` plus beobachtetem Vorlauf, sichtbar als "estimated" markiert. Der Vorlauf (ca. 3 bis 4 Monate laut aktueller Daten) ist eine Annahme und wird vor Verwendung an den Daten geprüft.

## Nicht im Umfang
- Neue UI. Roadmap- und Event-Seite behalten zunächst ihr Aussehen.
- Automatischer Lauf (Cron/CI). Der Import bleibt ein manuell ausgeführtes Skript.

## Erfolgskriterien
- Beide Dateien liegen vor und bestehen die Validierung.
- Die Roadmap-Seite zeigt Datum und Status aus den Importdaten. Charon erscheint am 28.10. als released.
- `eventsGlobal.ts` enthält keine handgepflegten Einträge mehr.
- Venus und Chaos sind sichtbar als geschätzt gekennzeichnet.

## Stand der Lieferung (2026-10-28, geprüft)
Der Agent hat geliefert: `~/Downloads/Sites/android/out/site_data/{hero_releases.json, events.global.json, events.global.report.json, HANDOFF_EVENTS_BANNERS.md}`. Geprüft: 76 Helden, 156 Events (30 Banner, 37 mit `heroGameId`), Zeitraum 2026-01-15 bis 2027-10-05, Schema entspricht dem Vertrag. Charon 28.10., Nidhogg 02.11., Ananke 13.11. stimmen mit dem Roadmap-Stand überein.

Abweichungen vom Vertrag, jeweils entschieden:
- **Keine `startAt`/`endAt`:** Die Config enthält keine Zeitzone, der Spieltag-Wechsel (08:00 UTC) steht nicht darin. Die Seite zeigt nur Tage und stellt den Wechsel nicht als Fakt dar.
- **Labels:** 96 von 156 sind abgeleitet (Schablone + Heldenname + Phase), nicht der echte Spieltitel. In der UI akzeptabel, im Datenmodell als `derived` erkennbar machen (Report enthält die Liste).
- **Ausgeschlossen:** 87 Newbie-Events (relative Tage), 6 ohne Zeit, 17 mit Platzhalter-Datum.
- **Starthelden** (37, IDs 1001 bis 5005): `globalRelease: null` bedeutet "von Anfang an". Der Loader muss das von "unbekannt" unterscheiden.

## Befunde beim Abgleich (müssen in Phase 1 gelöst werden)
1. **ID-Mapping unvollständig:** `game_id_mapping.json` kennt weder `venus` (Spiel-ID 3015) noch `chaos` (5012) noch `joanneofarc`. Ein Event referenziert 5012: **"Sea War · Chaos", 07.12. bis 18.12.2026**. Chaos kommt also vermutlich wie Hades und Gaiya über Sea War, und die bisher geschätzte Roadmap-Zeit (30.11.) passt nicht dazu. Mapping-Einträge ergänzen und Roadmap-Datum für Chaos prüfen.
2. **Schreibweg:** Das Export-Skript `export_events.py` kann mit `--ts` direkt `src/data/eventsGlobal.ts` in diesem Repo überschreiben. Das widerspricht dem Vertrag (Agent liefert JSON, Repo importiert). Festlegen: Der Agent schreibt nur nach `out/site_data/`, kein `--ts`.
3. **Banner-Artwork fehlt:** Es ist weder extrahiert noch im R2-Bucket. Im Client liegen Texturen `A_UI_NewCardPush_*`, `A_UI_WorldMain_NewCardPush_*` und `..._LimitedTimeChallenge_Illustration*`. Für die Banner-Seite (Phase 3) nötig. Bis dahin Fallback auf Hero-Karten.

## Offene Punkte
- Wo `generated/` im Repo versioniert wird (Vorschlag: committet, damit Builds ohne den Agenten laufen).
- Bildschlüssel für Banner-Art in R2, Vorschlag `banners/new-card-push/<heroGameId>.webp`, vom Agenten beim Upload zu bestätigen.

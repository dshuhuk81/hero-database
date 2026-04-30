# Workflows: What to run after which changes

This file answers the question: "I changed X, what scripts do I need to run?"

---

## Quick Reference

| Was geaendert | Befehl |
|---|---|
| Hero-Stats, Skills, Ratings, Synergies in `src/data/heroes/*.json` | `npm run after:hero-edit` |
| Team Compositions in `src/data/heroes/*.json` | `npm run after:hero-edit` (gleicher Befehl) |
| Divine-V Stats gegen Game-Extract querpruefen | `npm run validate:hero-detail-stats` |
| Synergy-Tags via Tag-Manager (veraendert `tags.json`) | `npm run after:tags` |
| Boss-Daten aus Google Sheet importiert | `npm run after:boss-import` |
| Alles neu bauen (sicherer Zustand) | `npm run rebuild` |
| Nur validieren ohne Build | `npm run validate:all` |

---

## Was macht jeder Befehl intern?

### `npm run after:hero-edit`
Fuer: Aenderungen an `src/data/heroes/*.json` (Stats, Skills, Ratings, Synergies, Team Comps)

```
merge-heroes-db.js       --> src/data/all_heroes_db.json aktualisieren
generator.js             --> src/data/derived/teamCompsByHeroId.json aktualisieren
test-hero-tags.js        --> pruefen ob alle Synergy-Tags gueltig sind
```

Danach noch `npm run build` wenn du deployen moechtest.

---

### `npm run after:tags`
Fuer: Aenderungen an `src/data/tags.json` (z.B. nach Tag-Manager-Session)

```
test-hero-tags.js        --> pruefen ob alle Tags gueltig definiert sind
merge-heroes-db.js       --> src/data/all_heroes_db.json aktualisieren
generator.js             --> src/data/derived/teamCompsByHeroId.json aktualisieren
```

---

### `npm run after:boss-import`
Fuer: Nach `npm run import-attack-rates` (Boss-Daten aus Google Sheet)

```
merge-heroes-db.js       --> baseAttackRate + bossUltimatesPer90s in DB uebernehmen
generator.js             --> Derived Data aktualisieren
```

---

### `npm run rebuild`
Vollstaendiger Rebuild. Sinnvoll wenn unklar ist was geaendert wurde.

```
merge-heroes-db.js       --> all_heroes_db.json
generator.js             --> teamCompsByHeroId.json
astro build              --> statische Seiten + Rankings neu berechnen
```

---

### `npm run validate:all`
Prueft Datenqualitaet ohne zu aendern oder zu bauen.

```
validate-pvp-ratings.js  --> PvP-Ratings auf gueltiges Format pruefen
test-hero-tags.js        --> Synergy-Tags auf Konsistenz pruefen
validate-hero-detail-stats.mjs --> Divine-V Stats gegen hero_detail.json querpruefen
```

---

## Automatischer Schutz: Pre-Commit Hook

Der Git-Hook in `.githooks/pre-commit` prueft vor jedem Commit automatisch:

- Wurden `src/data/heroes/*.json` geaendert? Dann muss `all_heroes_db.json` und `teamCompsByHeroId.json` ebenfalls gestaged sein.
- Wurde `src/data/tags.json` geaendert? Dann muss `all_heroes_db.json` ebenfalls gestaged sein.

**Wenn der Hook blockiert:**
1. `npm run after:hero-edit` ausfuehren (oder `after:tags`)
2. Generierte Dateien stagen: `git add src/data/all_heroes_db.json src/data/derived/teamCompsByHeroId.json`
3. Nochmals committen

**Hook deaktivieren (Notfall):** `git commit --no-verify`

Der Hook ist unter `.githooks/pre-commit` im Repo gespeichert und wird via `npm run prepare` (laeuft automatisch bei `npm install`) aktiviert.

---

## Alle Scripts im Ueberblick

### Development
| Script | Beschreibung |
|---|---|
| `npm run dev` | Astro Dev-Server starten |
| `npm run dev:all` | Dev-Server + API-Server zusammen |
| `npm run tag-manager` | Tag-Manager CMS auf http://localhost:3000 |

### Build & Deploy
| Script | Beschreibung |
|---|---|
| `npm run build` | Produktions-Build (Astro) |
| `npm run rebuild` | Daten neu generieren + Build |
| `npm run deploy:prod` | Build + Vercel Deploy |

### Daten-Workflows (die wichtigen)
| Script | Beschreibung |
|---|---|
| `npm run after:hero-edit` | Nach Hero-JSON-Aenderungen |
| `npm run after:tags` | Nach Tag-Manager-Session |
| `npm run after:boss-import` | Nach Boss-Daten-Import |
| `npm run import-attack-rates` | Boss-Daten aus Google Sheet laden |

### Einzelne Scripts (bei Bedarf)
| Script | Beschreibung |
|---|---|
| `npm run db:merge` | Nur `all_heroes_db.json` neu generieren |
| `npm run db:teamcomps` | Nur `teamCompsByHeroId.json` neu generieren |
| `npm run validate:hero-detail-stats` | Hero-Stats gegen `hero_detail.json` pruefen |
| `npm run validate:tags` | Nur Tags validieren |
| `npm run validate:all` | Alle Validierungen |
| `npm run changelog:add` | Changelog-Eintrag hinzufuegen |

---

## Game-Asset-Pipeline (aus leak/game_extracted und leak/game_graphics)

### Schritt 1: game_id_mapping.json befuellen
Die Mapping-Datei `src/data/game_id_mapping.json` verbindet Projekt-Helden-IDs (z.B. `"zeus"`) mit internen Spieldaten.

**Quellen:**
- `leak/game_extracted/region_754c000000/NewConfig/hero_skin.lua` - Skin-Eintraege mit `hero = XXXX` und `spine = 'NAME_SkeletonData'` geben die game_hero_id
- `leak/game_graphics/new_atlas_sa_ui_skill/` - Skill-Icons
- `leak/game_graphics/new_texture_ui_herofigure_*/` - Held-Portraits (838x2048)

**Status-Werte in game_id_mapping.json:**
- `"ok"` - game_hero_id bekannt, assets gemappt
- `"internal_name_known"` - nur internal_name bekannt, game_hero_id fehlt noch
- `"unknown"` - komplett unbekannt (noch 5 Helden: audhumla, eris, idun, jiutian-xuannv, nut)

**Hilfs-Scripts:**
```bash
node scripts/find-partial-hero-ids.js   # liest hero_skin.lua, gibt spine->heroId aus (dry-run Info)
node scripts/patch-partial-hero-ids.cjs # schreibt game_hero_ids fuer partial-Helden in Mapping
```

**Hinweis:** Skin-Eintraege ohne `portrait`-Feld haben keinen vollen Koerper-Portrait in game_graphics (nur Circle-Portrait 316x316). Betrifft: canopicjar, jinchan, kraken, nymphia, ratatoskr, tailao, treant, ushabti.

### Schritt 2: Portraits und Skill-Icons konvertieren
```bash
node scripts/convert-game-assets.mjs --dry-run  # Vorschau ohne Dateien zu schreiben
node scripts/convert-game-assets.mjs            # PNG -> WebP konvertieren
node scripts/convert-game-assets.mjs --force    # Bereits vorhandene Dateien ueberschreiben
```

**Output:**
- `public/heroes/{hero_id}.webp` - Held-Portrait (838x2048 PNG -> WebP)
- `public/skills/{hero_id}_skill_{1-4}.webp` - Skill-Icons (144x144)
- `public/skills/{hero_id}_relic.webp` - Relic-Icon

**Skill-Nummer-Mapping (Spieldaten -> Projekt):**
| Spieldaten | Projekt |
|---|---|
| Skill03 | skill_1 (Ultimate) |
| Skill01 | skill_2 |
| Skill02 | skill_3 |
| Skill04 | skill_4 |
| Skill06 | relic |

**Bekannte Luecken (kein Skill01/02/04/06 im Atlas):**
canopicjar, jinchan, kraken, nymphia, ratatoskr, tailao, treant, ushabti - haben nur skill_1 (Ultimate) im Atlas.

### Schritt 3: Nach Konvertierung deployen
```bash
node scripts/upload-to-r2.mjs   # konvertierte WebPs auf Cloudflare R2 hochladen
node scripts/upload-to-r2.mjs --dry-run   # nur anzeigen, was hochgeladen wuerde
node scripts/upload-to-r2.mjs --force     # vorhandene Dateien in R2 bewusst ueberschreiben
```

**Wichtig:**
- Standardverhalten bleibt konservativ: vorhandene Dateien in R2 werden per `HEAD` geprueft und uebersprungen.
- Fuer korrigierte Assets (z.B. falsches Portrait bereits auf R2) `--force` verwenden.

**Stand 2026-04-30:**
- Schritt 2 abgeschlossen: 21 partielle game IDs aufgeloest, `internal_name_known` ist abgearbeitet.
- Schritt 3 abgeschlossen: 67 Portraits + 300 Skill-Icons konvertiert und auf R2 hochgeladen.
- Nachtraeglich korrigiert: Anubis, Fengyi, Set und Dionysus hatten zunaechst falsche Portrait-Zuordnungen; Mapping und WebPs sind inzwischen korrigiert.

### Schritt 4: Stats gegen hero_detail.json querpruefen
```bash
node scripts/validate-hero-detail-stats.mjs
```

**Quelle:**
- `leak/game_extracted/region_7584e4b000/client/config/hero_detail.json`

**Scope:**
- Prueft nur Helden, deren Projektdaten bereits auf `Divine V` stehen.
- Helden auf niedrigeren Evolutionsstufen werden bewusst uebersprungen, weil `hero_detail.json` hier gegen Max-Evo verglichen wird.

**Stand 2026-04-30:**
- Schritt 4 ist jetzt implementiert und `npm run validate:hero-detail-stats` laeuft erfolgreich durch.
- Aktuell werden 47 Helden direkt geprueft.
- 19 Helden werden absichtlich uebersprungen, weil ihre Projektwerte nicht auf `Divine V` stehen.
- 6 Helden werden wegen fehlender oder unvollstaendiger `game_id_mapping.json`-Zuordnung uebersprungen.
- Cancer wird aktuell separat uebersprungen, weil die primaere Extract-Zuordnung `game_hero_id=401` nur `max_evo: 9` hat und damit kein gueltiger Divine-V-Vergleich ist.
- Skadi wurde fuer den Stats-Abgleich auf `game_hero_id=1010` als primaere Zuordnung umgestellt; `1011` und `1012` bleiben als Alternativen erhalten.

**Was wird geprueft:**
- Absolute Werte: `atk`, `hp`, `armor`, `magicRes`
- Prozentwerte: `dodgeRate`, `hitBonus`, `critRate`, `critRes`, `atkSpdBonus`, `critDmgBonus`, `healEff`, `pDmgBonus`, `controlRes`, `ultimatePWR`

**Pruefmodell:**
- `attr_base[901|902|941|942]` aus `hero_detail.json` wird mit dem bekannten Divine-V Faktor auf Projektwerte skaliert
- Prozentwerte kommen direkt aus `attr_base` (z.B. `0.06` -> `6`)

---

## Datei-Abhaengigkeiten (Uebersicht)

```
src/data/heroes/*.json          (Quelle - manuell bearbeitet)
       |
       +--> all_heroes_db.json             (via merge-heroes-db.js)
       |
       +--> derived/teamCompsByHeroId.json (via generator.js)

src/data/tags.json              (Quelle - via Tag-Manager oder direkt)
       |
       +--> all_heroes_db.json             (via merge-heroes-db.js)

all_heroes_db.json
       |
       +--> Rankings + Seiten              (via astro build)
```

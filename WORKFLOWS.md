# Workflows: What to run after which changes

This file answers the question: "I changed X, what scripts do I need to run?"

---

## Quick Reference

| Was geaendert | Befehl |
|---|---|
| Hero-Stats, Skills, Ratings, Synergies in `src/data/heroes/*.json` | `npm run after:hero-edit` |
| Team Compositions in `src/data/heroes/*.json` | `npm run after:hero-edit` (gleicher Befehl) |
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
| `npm run validate:tags` | Nur Tags validieren |
| `npm run validate:all` | Alle Validierungen |
| `npm run changelog:add` | Changelog-Eintrag hinzufuegen |

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

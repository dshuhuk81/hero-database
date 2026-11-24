# Motto Immortal Project Command Center

Lokales Entwickler-Dashboard, unabhängig vom öffentlichen Astro-Auftritt. Keine neuen Abhängigkeiten, keine Supabase-Konfiguration erforderlich.

## Start

```sh
npm run dashboard
# http://127.0.0.1:4391
```

Node entsprechend `package.json` verwenden. Alternativer Port: `DASHBOARD_PORT=4392 npm run dashboard`. Nach Änderungen am Server den Prozess neu starten.

```sh
npm run dashboard:generate  # JSON-Snapshot ohne Server
npm run test:dashboard      # Daten-, Änderungs- und HTTP-Tests
```

## Bereiche

- Übersicht: aktuelle Roadmap-Phase, Git-Historie, Arbeitsverzeichnis, wichtige Dokumente, offene Arbeit.
- Helden: Filter, Basisprüfungen, Referenzen und vollständige JSON-Quellen.
- Ratings: sechs vorhandene Kontexte, berechnetes Overall und Provisional-Kennzeichnung. Verwendet unverändert `src/data/ratings/ratingSystem.js`.
- Content Studio: Helden-/Rating-JSON und interne Guide-Recherche; Quelle laden, bearbeiten, validieren, Diff speichern und übernehmen.
- Roadmap & Feedback: Meilensteine aus `design-system/SITE_AUDIT_ROADMAP.md`; neue Einträge mit Priorität, Abhängigkeit und optionaler Issue-Verknüpfung.
- Importe & Assets: vorhandene Import-/R2-Werkzeuge und fehlende Bildreferenzen. Führt keine Uploads aus.
- Project Health: echte, gezielt gestartete Rating-, Tag-, Rating-Test- und Astro-Prüfungen; Ergebnis und Zeitstempel bleiben erhalten, Quellenänderungen markieren Ergebnisse als veraltet.
- Wissensbasis: Volltextsuche in freigegebenen Markdown-Dokumenten und Quelldatei-Betrachter.

## Quellen und Schreibablauf

Heldenquellen bleiben `src/data/heroes/*.json`; Dateien in `heroes/i18n/` sind Übersetzungen und zählen nicht als eigene Helden. Ratings bleiben `src/data/ratings/hero-ratings.json`. Der vorhandene Helden-Merge wird auf Übereinstimmung geprüft. Dokumentierte Status werden übernommen, kein Fertigstellungsgrad geschätzt.

Neues Feedback im Bereich **Roadmap & Feedback** erfassen. `tools/project-dashboard/work-items.json` ist die versionierbare Quelle für diese neuen Arbeitseinträge. Sie dupliziert keine vorhandenen Roadmap-Phasen. Die Einträge werden nicht automatisch als bestätigte Spielfakten behandelt.

Entwürfe und Check-Ergebnisse liegen in `.cache/project-dashboard/` (bereits gitignored). Ein Entwurf enthält den ursprünglichen Dateihash: externe Änderungen blockieren das Übernehmen. Heldenänderungen führen `npm run after:hero-edit` aus; Ratings werden mit dem vorhandenen Rating-Validator geprüft. Bei fehlgeschlagener Validierung werden Quelle und gegebenenfalls Merge zurückgesetzt. Kein automatisches Staging, Committen, Pushen oder Veröffentlichen.

Guide-Entwürfe benötigen `Evidence: Confirmed`, `Observed`, `Community` oder `Untested`. Übernommene Recherche liegt versionierbar unter `tools/project-dashboard/content/guides/`. Für einen öffentlichen Guide sind weiterhin eine Astro-Seite und ein Eintrag im bestehenden Guide-Index erforderlich.

## Aktualisierung und Integrationen

Der Server liest beim Start die aktuellen Quellen. Quellenänderungen werden überwacht; die Browseransicht gleicht alle zehn Sekunden ab und schützt aktive Eingaben vor Neurendern. Der Aktualisieren-Knopf indexiert sofort erneut; der Generator erzeugt denselben JSON-Snapshot. Der letzte erfolgreiche Datenstand bleibt nach einem Refresh-Fehler verfügbar.

GitHub ist optional: `gh` installieren und serverseitig mit einem leseberechtigten Konto anmelden, dann **GitHub abrufen** klicken. Das Origin-Remote bestimmt das Repository. Abgerufen werden offene Issues (ohne Pull Requests) und die letzten Workflow-Läufe. Zugangsdaten werden weder abgefragt noch an den Browser geliefert. Ein Supabase-Keepalive ist kein Build-/Testnachweis; anderer Git-HEAD wird gekennzeichnet. Cloudflare-Buildstatus ist ohne eigene Integration unbekannt.

## Grenzen und Sicherheit

Bindet ausschließlich an `127.0.0.1`. Schreibaufrufe verlangen passende Origin und JSON, sind serialisiert und können nur feste Aktionen auslösen. Keine beliebigen Shell-Befehle oder Dateipfade. Quelldateizugriff nutzt eine Freigabeliste und prüft den realen Pfad; Zugangsdaten und versteckte Dateien sind gesperrt. Nicht ins LAN oder Internet weiterleiten.

Datenqualität bedeutet hier konkrete Basisprüfungen, keine vollständige fachliche Freigabe. Bild-URLs werden nicht auf R2-Verfügbarkeit geprüft. Der Dokumentationsindex prüft Lesbarkeit, keine vollständige Link- oder Inhaltsvalidierung. Produktionsbuilds werden entsprechend `AGENTS.md` vom Betreiber ausgeführt.

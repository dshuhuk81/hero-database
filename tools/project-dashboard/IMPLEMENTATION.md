# Umsetzung: lokales Motto Immortal Command Center

## Umfang

Eigenständiger Node-Server und buildlose Oberfläche. Vorhandene Quellen, Berechnungen und Validatoren wiederverwenden. Keine öffentlichen Astro-Routen, keine neuen Pakete, keine externe Veröffentlichung.

## Entscheidungen

- Arbeitskopie enthält parallele Website-Änderungen; Umsetzung bleibt in `tools/project-dashboard/` plus drei npm-Skripten. Keine bestehenden Inhalte zurücksetzen.
- Der im IDE geöffnete Ideenplan betrifft öffentliche Spielerfeatures; er wird nicht als Auftrag für öffentliche Features verwendet. Maßgeblich ist das bestätigte Command-Center-Konzept aus dieser Unterhaltung.
- Guide Studio erzeugt interne Recherche, keine automatisch veröffentlichte Astro-Seite. Öffentliche Guide-Freigabe und Layout bleiben im bestehenden Workflow.
- Asset-Uploads und Game-Imports werden dokumentiert, nicht über frei parametrisierbare Serverbefehle angeboten.

## Implementierung

- Datenadapter: Helden, Ratings, Markdown, Roadmap, Git, Quellenstand und optionale GitHub-Abfragen.
- Lokale API: Suche, Dateibetrachter, Refresh, feste Checks, Feedback und validierte Entwürfe.
- Oberfläche: acht navigierbare Bereiche, globale Suche, Filter, Quelldateien und Diff.
- Nachweise: automatisierte Tests für Quellen, Konflikte, Rollback, lokale Schreibgrenzen und API; Browserprüfung separat.

## Verifiziert

- 14 Dashboard-Tests bestanden: Quellzugriff, Sprachdateien, Ratings, Diff-Konflikte, Apply/Merge, Rollback, große JSON-Antworten, Check-Fingerprints, parallele HTTP-Schreibaufrufe und fehlgeschlagene/reparierte Watcher-Refreshes.
- Chrome: alle acht Bereiche, Volltextsuche, Heldenfilter, Details, Quelldialog, Editor und Validierung; keine JavaScript-Fehler. Bei 1440, 768 und 390 Pixel kein Seitenüberlauf.
- Browser-Regressionsprüfung: Polling erholt sich von anfänglichem Busy-Status; Refresh-Fehler erscheinen auch bei unverändertem Snapshot-Zeitstempel.
- Astro Check: 178 Dateien, keine Fehler/Warnungen/Hinweise. Vier bestehende Rating-Systemtests bestanden. Rating-Validator bestanden, bestehende Warnung für `set` (Reason ohne Adjustment).
- Asynchroner Tag-Check über echte Dashboard-API: erfolgreich und für aktuellen Quellenstand gespeichert. Gecachter Datenabruf lokal etwa 2 ms.
- Kein Produktionsbuild, kein Commit, Push oder Upload durch diese Umsetzung. GitHub-Liveabruf bleibt optional und wurde nicht als erfolgreich behauptet.

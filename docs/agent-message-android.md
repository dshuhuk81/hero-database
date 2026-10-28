# Nachricht an den Android-Agenten

Bitte `export_events.py` und `export_hero_releases.py` so anpassen, dass sie **ausschließlich nach `out/site_data/`** schreiben. Die Optionen `--ts` und `--repo` für `hero-database` entfallen: Das Repo importiert selbst per `npm run import:game-data` und validiert dabei. Direktes Überschreiben von `src/data/eventsGlobal.ts` ist nicht mehr vorgesehen (die Datei lädt jetzt `src/data/generated/*.json`).

Danach bitte:
1. **Banner-Artwork:** Im Global-Paket (`out/emu_pull/20261028/global/data/packages/`) liegen 428 `newcardpush`-Bundles. Für die Banner-Seite werden die großen Header-Bilder gebraucht, vermutlich `new_texture_ui_activity_newcardpush_<held>_a_ui_newcardpush_<held>_illustration02_bg` (z. B. für Ananke, Eris, Heket, Hebo, Hephaestus, Hela, Idunn). Bitte:
   - die `*_illustration02_bg`-Bundles entpacken und prüfen, ob sie als breites Key-Art taugen (Seitenverhältnis, Größe); falls nicht, sag welche Bundles stattdessen in Frage kommen (`activewindow_<held>_bg`, `backgroundimage_<held>_bg`);
   - pro Hero-Banner (26 `new_card_push`) ein WebP von etwa 1200 px Breite erzeugen, Zuschnitt um 2,4:1, Dateiname `banners/new-card-push/<heroGameId>.webp`;
   - erst nach Freigabe des Besitzers in den R2-Bucket hochladen, dann die Schlüssel melden;
   - eine kurze Liste ausgeben: Held, Spiel-ID, verwendetes Bundle, Auflösung, fehlende Helden.
   Rerun-Banner brauchen kein eigenes Bild (kein Held im Client).
2. **Najia (4015)** ist intern **Naga** (娜迦), ohne Datum und ohne Namen im Export. Im Paket liegen `…newcardpush_naga_…` (activewindow_bg, charactercards_icon, englishname_naga01/najia02) und `seaopenserver_…_najia_illustration02_bg`. Bitte Porträt und Skill-Icons wie bei den anderen Helden extrahieren (nur lokal in `out/`, kein Upload) und prüfen, ob der Client einen englischen Namen oder ein Datum enthält.
3. Prüfen, ob der Client zu Venus (3015) ein Global-Datum hergibt, z. B. über die Gacha-Config. Chaos (5012) hat ein Sea-War-Event am 2026-12-07 und wird darüber datiert.
4. `joanneofarc` ist **ZhenDe (4016)**, bestätigt vom Besitzer; der Global-Name ist noch unbekannt. Bitte `heroes/joanneofarc.webp` sowie `heroes/cards/joanneofarc-{240,360,480}.webp` und `heroes/thumbs/joanneofarc-96.webp` aus dem ZhenDe-Porträt erzeugen und hochladen (erst nach Freigabe des Besitzers).
5. In `events.global.json` bei jedem Event, dessen `label` aus einer Schablone abgeleitet ist (siehe `events.global.report.json`), zusätzlich `"derivedLabel": true` setzen. Die Event-Seite zeigt dafür einen Hinweis.

Stand der Seite: Der Import hat 76 Helden und 156 Events fehlerfrei übernommen (`node --test tests/game-data.test.mjs` prüft das Schema).

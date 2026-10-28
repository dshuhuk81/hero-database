Der Emulator läuft, das Spiel (Global) wurde gestartet und einmal in der Lobby besucht, damit es seine aktuellen Daten lädt. tools/android/run.sh restart_emulator.sh --launch global startet beides. Der Pfad zum Android SDK (~/Library/Android/sdk) und die .venv-arm im Datenordner müssen vorhanden sein.

Die Kette bis zu den Config-Dateien
Daten vom Emulator holen: tools/android/run.sh emu_status.py --pull legt sie in out/emu_pull/<datum>/{global,cn} ab. Das ist nur lesend, kein Root nötig.
Entschlüsseln: tools/android/run.sh motto_crypt.py <dateien> --out out/emu_pull/<datum>_plain/global (gleicher Schlüssel für CN und Global).
Entpacken: config.zip und die deflate_config_*.zip müssen nach <datum>_plain/x_global (und x_cn) entpackt werden. Dafür gibt es kein Skript, das habe ich bisher von Hand gemacht (unzip). Das ist die Lücke.
Ich schlage vor, Schritt 2 und 3 in ein Skript unpack_config.py zu packen. Dann ist es ein Aufruf. Soll ich das bauen?

a) Release-Daten und b) Events
Ab hier läuft alles vom Repo aus:


X=out/emu_pull/<datum>_plain
tools/android/run.sh export_hero_releases.py --global $X/x_global --cn $X/x_cn --client-global vNNNNNN --client-cn 1.0.13
tools/android/run.sh export_events.py --global $X/x_global --heroes out/site_data/hero_releases.json
npm run import:game-data
vNNNNNN ist die Global-Version (aktuell v102687, steht im Client). Der Import bricht bei Fehlern ab und gibt Warnungen aus.

Danach noch zu tun:

Warnungen lesen: Meldet er eine unbekannte Spiel-ID, fehlt der Held in src/data/game_id_mapping.json.
Neue Helden brauchen eine Heldendatei (src/data/heroes/<id>.json) und einen Eintrag in summonSchedule.ts (Reihenfolge und Pull-Empfehlung). Das bleibt Handarbeit.
Bei Helden ohne Global-Datum entscheidest du selbst, ob ein geschätztes Datum (estimatedDate) rein soll.
npm run build, Tests, dann committen und deployen. Die importierten Dateien in src/data/generated/ gehören ins Git.
c) Grafik-Assets
Nicht update_global_art.py allein verwenden: Es lädt Patches vom CDN und schreibt nach out/art_global, und dort liegen die weißen Hintergründe.
Richtiger Weg: Die frischen Bundles vom Emulator (out/emu_pull/<datum>/global/data/packages) mit extract_hero_art.py <ordner> --out out/art_new_global extrahieren. Daher stammen die freigestellten Bilder. Das ist nur eine Vermutung aus den Dateinamen (new_texture_ui_herofigure…); ich habe es nicht ausprobiert.
Dann build_site_assets.py --config $X/x_global --art out/art_new_global --write, aber dieses Skript nimmt art_global standardmäßig an. Bitte mit --art out/art_new_global aufrufen.
Danach: Ergebnis aus out/site_public/heroes/ nach public/heroes/ kopieren, npm run build:hero-variants (Karten und Thumbs), jedes neue Bild ansehen (Transparenz!) und npm run upload-assets:changed. Zum Schluss node scripts/check-r2-refs.mjs.
Meine Empfehlung
Als Erstes das fehlende Entpack-Skript bauen. Danach wäre die Kette für a) und b) ein einziger Ablauf. Bei c) würde ich in build_site_assets.py einbauen, dass es Bilder ohne Transparenz ablehnt, damit sich der weiße Hintergrund nicht wiederholt. Soll ich beides machen?
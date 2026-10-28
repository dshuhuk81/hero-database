# Fehlende Dateien im R2-Bucket `motto-immortal`

Stand 2026-10-28 (aktualisiert nach dem Upload der neuen Heldenbilder), nach der Wiederherstellung. Die Liste stammt aus `~/Downloads/Sites/android/out/R2_LUECKEN.md` (vollständiger, weil sie auch zur Laufzeit gebaute URLs wie `iconUrl()` abdeckt) und aus `node scripts/check-r2-refs.mjs` (nur literale URLs in `src/`).

## Wiederherstellbar aus der Git-Historie
Datei existiert im Elterncommit des Lösch-Commits: `git show <commit>^:public/<pfad> > <datei>`.

| Datei | Gelöscht in |
|---|---|
| `icons/totems/moonglowtear.webp`, `icons/totems/unsulliedlotus.webp` | `4d2deb94` |
| `icons/classes/warrior.webp`, `icons/factions/clubs.webp` | `77c601dc` |
| `icons/classes/tank.webp` | `018ee22f` |

## Gesamter Ordner `icons/classes|factions|roles` fehlt im Bucket
Der Bucket enthält keinen einzigen Key unter `icons/`. Betroffen sind alle Klassen-, Fraktions- und Rollen-Icons (Roadmap, Heldenlisten, Banner-Seite). Alle 14 Dateien liegen im Elterncommit von `77c601dc` und lassen sich wiederherstellen: `classes/{archer,assassin,mage,rank,support,warrior}`, `factions/{clubs,diamonds,hearts,spades,starglint}`, `roles/{arcane,hefty,nimble}` (jeweils `.webp`, Pfad `public/icons/...`). Danach per `npm run upload-assets` in den Bucket laden. `classes/tank.webp` stammt aus `018ee22f`.

## Verloren (nirgends mehr vorhanden)
- **Totem-Icons (12 weitere):** `icons/totems/` allseeingeyes, branchofserenity, defiantvow, eternaleclipse, hornofpotency, keystoneofwonders, primordialeverbloom, sanctifiedblood, sigiloflongevity, solarscorch, undyingstaff, windrunnersgrace
- **Bosses:** `bosses/` baphomet, demonic_horse, epica, isthar_vi, jackfrost, lilith, typhoon
- **Hintergründe (Wurzel):** `bg_neutral.webp`, `bg_halle.webp`, `hall.webp`, `shrineBG.webp`, `frieren.jpg`
- **Sonstiges:** `img_data/nubaFace.webp`

## Helden
Seit dem Upload vom 2026-10-28 liegen `ananke`, `nidhogg`, `venus` und `chaos` vollständig im Bucket (Original, `cards/` 240/360/480, `thumbs/` 96). Weiterhin fehlt **`joanneofarc`**: Der Held ist ZhenDe (Spiel-ID 4016, vom Besitzer bestätigt, Global-Name unbekannt, CN-Release 2026-10-16). Das Porträt liegt beim Agenten unter `out/art_cn/portraits/A_UI_Portrait_ZhenDe_Img.png`.

## Prüfen
```bash
node scripts/check-r2-refs.mjs   # Exit 1, solange Lücken bestehen
```

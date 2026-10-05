# Watcher of Realms: Hero-Folgeauswertungen

Client: `1.6.38.829.1`

## Ergebnisübersicht

| Auswertung | Ergebnis |
|---|---|
| Hero-Katalog | `294` eindeutige technische Hero-IDs; `169` im Hero-Asset-Manifest |
| Progression | `3365` Datensätze; Growth-Profil-Join zu Hero-Instanzen bleibt serverseitig |
| Skills | `8463` Hero-/Skill-Level-Zeilen, Rohformeln erhalten |
| 2D-Größe | `2` Modelle gemessen, `2` Referenzhelden nicht gecacht |

## Kontrollbeispiele

- Rex `2001`: Defender, Position `1`, Skills `[200118, 200114, 200117, 200120]`.
- Voltus `2015`: Mage, Position `2`, Fraktion `The Cursed Cult`, Skills `[201530, 201524, 201501, 201526]`.

## Wichtige Grenzen

- `Unit.m_Type=1` ist ein technischer Filter, kein Veröffentlichungsstatus.
- `m_HeroGrowingID` ist account-/serverseitig. Die Growth-Profile werden nicht spekulativ einem Hero zugeordnet.
- Tile-Weltgröße `3,0` ist eine markierte Prototypannahme; `MAP_1001001` selbst speichert nur Raster und Flags.
- Größenmessungen basieren auf Bind-Pose-Meshes und zwei gecachten Helden.

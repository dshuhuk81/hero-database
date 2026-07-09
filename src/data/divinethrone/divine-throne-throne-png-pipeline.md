# Divine Throne Throne PNG Pipeline

Interne Kurznotiz dazu, wie die `throne`-Bilder fuer die Divine-Throne-Heldenseiten entstanden sind.

## Ausgangslage

Die Divine-Throne-Karten lagen nicht als sauber benannte Website-Assets vor. Im Spiel-Extrakt waren sie Teil von Unity-/Android-Asset-Bundles, gemischt mit UI-Texturen, FX-Texturen, Sprite-Objekten und einzelnen zusammengesetzten UI-Elementen.

Wichtig war deshalb: Nicht nach einem finalen `zeus.png` oder `divine-throne-card.png` suchen, sondern nach den internen Unity-Namen des Throne-Equip-Features.

Die brauchbaren Quellen lagen im Android-Extrakt unter:

```text
/Users/daschultheiss/android/throne_assets_all/
```

Dort tauchten die eigentlichen Karten als exportierte Sprite-Slices auf, z. B.:

```text
new_texture_ui_throneequip_throneframe_a_ui_throneequip_frame_zhousi/
  A_UI_ThroneEquip_Frame_Zhousi.sprite.png

new_texture_ui_throneequip_throneframe_a_ui_throneequip_frame_meidusha/
  A_UI_ThroneEquip_Frame_Meidusha.sprite.png

new_texture_ui_throneequip_throneframe_a_ui_throneequip_frame_yanluowang/
  A_UI_ThroneEquip_Frame_Yanluowang.sprite.png
```

## Warum das trotzdem geklappt hat

Die Throne-Karten waren im Client nicht als direkt verwendbare Website-PNGs abgelegt, aber Unity speichert viele UI-Grafiken als Texture plus Sprite-Metadaten. Die Texture ist das Pixelmaterial, das Sprite-Objekt beschreibt den sichtbaren Ausschnitt, Pivot, Transparenz und UI-Zuschnitt.

Beim Export entstehen daraus `*.sprite.png` Dateien. Diese sind praktisch schon die gerenderten UI-Karten: transparent, zugeschnitten und ohne den Rest des Atlas. Fuer unsere Website mussten sie also nicht neu gestaltet werden, sondern aus den Unity-Sprite-Daten als normale PNG-Dateien herausgeloest und dann sauber benannt werden.

Bei echten 3D-Objekten waere die Pipeline anders: Modell, Materialien und Kamera muessten in Unity oder einem Render-Tool rekonstruiert und als transparentes PNG gerendert werden. Bei diesen Throne Frames war das nicht noetig, weil der Client bereits vorgerenderte 2D-UI-Sprites mit 684 x 872 px enthielt.

## Pipeline

1. Android-/Unity-Assetbestand nach `ThroneEquip`, `ThroneFrame` und `A_UI_ThroneEquip_Frame_*` durchsucht.

2. Die relevanten Bundles in einen eigenen Arbeitsordner extrahiert:

```text
/Users/daschultheiss/android/throne_assets_all/
```

3. Die Manifest-Liste geprueft:

```text
/Users/daschultheiss/android/throne_assets_all/MANIFEST.tsv
```

Dabei waren die gesuchten Karten an `kind = throneframe` erkennbar. Die Frame-Sprites hatten konsistent:

```text
width  = 684
height = 872
file   = A_UI_ThroneEquip_Frame_{Name}.sprite.png
```

4. Nur Bundles mit diesem Prefix wurden als echte Throne-Karten akzeptiert:

```text
new_texture_ui_throneequip_throneframe_a_ui_throneequip_frame_
```

5. Die internen Asset-IDs wurden aus dem Bundle-Namen abgeleitet:

```text
new_texture_ui_throneequip_throneframe_a_ui_throneequip_frame_zhousi
-> zhousi
```

6. Die exportierten Sprite-PNGs wurden in die Website kopiert und normalisiert.
   Die finalen Website-Dateien verwenden jetzt die lokalen Hero-IDs, nicht die
   internen Unity-/Pinyin-Asset-Namen:

```text
public/features/divine-throne/thrones/{heroId}.png
```

Beispiele:

```text
zeus.png
medusa.png
yanluo.png
bastet.png
```

7. Die Divine-Throne-Daten wurden um `throneAssetId` erweitert. Dadurch muss die Komponente kein Hero-Namensraten machen, sondern baut den Bildpfad deterministisch:

```text
/features/divine-throne/thrones/{throneAssetId}.png
```

Dabei ist `throneAssetId` fuer die Website identisch mit der lokalen Hero-ID
(`zeus`, `medusa`, `yanluo`, ...). Die alten Asset-IDs (`zhousi`, `meidusha`,
`yanluowang`, ...) bleiben nur im Export-Mapping relevant.

8. Danach prueft der Validator, ob jeder Divine-Throne-Held auf eine existierende PNG-Datei zeigt.

## Automatisierung

Der Kopier- und Mapping-Schritt ist im Repo dokumentiert/automatisiert:

```text
src/data/divinethrone/apply_throne_assets_to_hero_database.py
```

Das Script macht im Kern:

- das lokale Manifest `src/data/divinethrone/throne_assets_all/MANIFEST.tsv` lesen
- nur `new_texture_ui_throneequip_throneframe_a_ui_throneequip_frame_*` verwenden
- interne Asset-ID aus dem Bundle-Namen ableiten
- interne Asset-ID auf lokale Hero-ID mappen
- Throne-Frames nach `public/features/divine-throne/thrones/{heroId}.png` kopieren
- sonstige Divine-Throne-UI-PNGs nach `public/features/divine-throne/ui/` kopieren
- `public/features/divine-throne/asset-manifest.json` schreiben
- `src/data/divine-throne.json` mit Hero-ID-basiertem `throneAssetId` aktualisieren
- fehlende Hero-zu-Asset-Mappings hart fehlschlagen lassen

## Ergebnis

Im Repo liegen jetzt normale statische Web-PNGs. Die 56 Hero-Throne-Frames liegen hier:

```text
public/features/divine-throne/thrones/
```

Weitere 53 extrahierte Divine-Throne-UI-/FX-/Background-PNGs liegen hier:

```text
public/features/divine-throne/ui/
```

Es wurden mehr Throne-Frames exportiert als aktuell im Feature freigeschaltet sind. Die Website nutzt davon nur die Heroes, die in `src/data/divine-throne.json` Divine-Throne-Daten haben.

Der wichtige Punkt: Die Bilder wurden nicht aus Screenshots ausgeschnitten. Sie kamen aus den originalen Unity-Sprite-Objekten des Clients und wurden als transparente, zugeschnittene PNGs exportiert. Dadurch sind sie deutlich sauberer, konsistenter und besser fuer responsive Hero-Detailseiten geeignet.

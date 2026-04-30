---
name: Motto Immortal Game Data Extraction
description: Vollstaendiger Fortschritt der Datenextraktion aus Motto Immortal (com.goatgames.mot.gb.gp) -- Lua-Configs, Grafiken, Hero-Mapping, offene Aufgaben
type: project
originSessionId: 21095881-bee5-4039-a3ea-70ca9b9231e5
---
# Motto Immortal -- Extraction Status

**Datum letzter Stand:** 2026-04-30 (Session 2)
**Arbeitspfad:** `/Users/daschultheiss/hero-database/leak/`

---

## VOLLSTAENDIG GELOEST

### Aeussere Paket-Entschluesselung
- Format: 4-Byte-Magic (`10 40 00 00`) + AES-256-CBC
- **Key:** `0cb026229cc4577f913bb92feec3b6a38b6e9d4350512b2fa1eb448e597e6868`
- **IV:** `5899400917d35659a31cf3c583e21caa`

### Memory-Dump via Frida (WORKING)
- BlueStacks, ADB Port 5555, Frida-Server Port 27042
- Gesamter Prozess-Speicher nach ZIP-Magic (`PK\x03\x04`) gescannt
- **6.991 Dateien** in `game_extracted/` -- alle lesbar
- Haupt-Script: `/tmp/hook_memscan2.py`

### EN-Lokalisierung aufgeloest (OHNE Frida noetig)
**Quelle:** `leak/game_extracted/region_7584e4b000/client/config/divination/divination_character_setting.json`

Diese JSON-Datei enthaelt alle Hero-EN-Namen direkt lesbar (kein Binary-Format).
Kann mit `python3 -c "import json; ..."` direkt ausgewertet werden.

**Wichtig:** Die `divination_character_setting.json` IDs entsprechen den `hero_id`-Feldern aus `hero_detail.json` und `hero_skin.lua`. Das Divinations-Feature des Spiels nutzt dieselben Hero-IDs.

**Achtung -- Divination-NPC-Konflikt:**
IDs 1010/1011/1012 sind alle Skadi-Varianten in `hero_skin.lua`, aber die Divination nennt:
- 1010 = Skadi (korrekt)
- 1011 = Nephthys (Divinations-NPC oder kuenftiger Held, kein Portrait geleakt)
- 1012 = Nut (Divinations-NPC oder kuenftiger Held, kein Portrait geleakt)
Konklusion: `nut` und `nephthys` sind NOCH NICHT im Spiel implementiert.

### Lua-Configs extrahiert
Pfad: `game_extracted/region_754c000000/NewConfig/`

| Datei | Zeilen | Inhalt |
|-------|--------|--------|
| `hero_detail.lua` | 19.598 | Alle Helden-Stats, Basis-Werte, Fraktionen |
| `skill_detail.lua` | 38.807 | Alle Skills aller Helden |
| `buff.lua` | 22.173 | Alle Buff-Definitionen |
| `item.lua` | 12.122 | Alle Items |
| `hero_skin.lua` | ~8.000 | Skin-Daten, Portraits, Spine-Links |
| `hero_evolution.lua` | ~900 | Evolution-Stufen, Koeffizienten |
| `hero_upgrade.lua` | ~3.000 | Level-Up-Kosten und Stat-Koeffizienten |
| `gacha/gacha_hero.lua` | ~600 | Pull-Weights (`weight`, `wonder_weight`) |
| `hero_enumeration.lua` | ~750 | Attribut-Key-Mapping (901->atk, 902->hp, ...) |
| `hero_spine.lua` | ~500 | Spine-ID -> Hero-ID-Link |
| `battle/battle_constant.lua` | ~300 | Battle-Formeln |

### JSON-Configs extrahiert
Pfad: `game_extracted/region_7584e4b000/client/config/`

| Datei | Inhalt |
|-------|--------|
| `hero_detail.json` | Alle Hero-Stats als JSON (192 Eintraege inkl. Varianten) |
| `divination/divination_character_setting.json` | EN-Namen fuer alle Heroes (Gold-Quelle!) |
| `language.json` | Sprachkuerzel-Mapping (EN_US, DE_DE, etc.) |
| `item.json` | Item-Daten als JSON |

### Grafiken extrahiert
Pfad: `game_graphics/` -- **16.182 PNG-Dateien**, 3,2 GB

Schluessel-Ordner:
- `new_atlas_sa_ui_headportraitnormal/` -- 101 Portraits
- `new_atlas_sa_ui_skill/` -- 373 Skill-Icons (Schema: `A_UI_Hero_<SkillPrefix>_Skill01.png`)
- `new_atlas_sa_ui_item/` -- 746 Item-Icons
- `new_rolespine_<name>_skeletondata/` -- 98+ Helden-Spine-Texturen
- `new_texture_ui_herofigure_a_ui_portrait_<name>_img/` -- Full-body Portraits (838x2048)

### game_id_mapping.json -- aktueller Stand 2026-04-30 (Session 2)
**Datei:** `src/data/game_id_mapping.json`
**Zweck:** Stabiles Mapping Projekt-Hero-ID -> Spieldaten (game_hero_id, internal_name, Portrait-Pfade, Skill-Icon-Prefix)

**Mapping-Status:**
- 68 Helden mit `status=ok` (game_hero_id + assets vollstaendig)
- 2 Helden mit `status=unreleased`: `hela` (2026-05-25), `jiutian-xuannv` (2027-12-12)
- 3 Helden mit `status=not_yet_released`: `nut`, `audhumla`, `idun` (nicht in game data)
- 0 Helden mit `status=unmatched`

**Aufgeloeste Helden (Session 2):**
- `eris` -> game_hero_id=3011, internal=`elisi`. Portrait geleakt + konvertiert. EN-Name Eris bestaetigt via divination.
- `jiutian-xuannv` -> game_hero_id=3013, EN-Name=Xuannv. Nur new_card_push-Assets geleakt, kein Portrait/Spine.
- `nut` -> Kein game_hero_id. Nicht im Spiel. Divination-ID 1012 ist Skadi-Variante, nicht der Held.
- `audhumla` -> Kein game_hero_id. Nicht im Spiel. Kein Eintrag in divination oder game_graphics.
- `idun` -> Kein game_hero_id. Nicht im Spiel. Kein Eintrag in divination oder game_graphics.
- `hela` -- EN-Name korrigiert: interner Name `hela` (CN), aber EN display name ist **Hera** (bestaetigt via divination ID 5008).

**Wichtige Korrekturen gegenueber altem hero_mapping.json:**
- `saihemaite` = Sekhmet (nicht Set wie vorher falsch eingetragen)
- `saierkaite` = Serket (anderer Held)
- `saite` = Set (neuer internal name, noch nicht in hero_mapping)
- Portrait-Dateinamen in `public/images/herofigure/` sind die verlassliche Quelle fuer EN->CN Mapping

**Zodiac-Helden (Sternzeichen):**
Haben zwei game_hero_ids -- eine mit max_evo=9 (normal) und eine mit max_evo=18 (als "erwaehltes Sternzeichen").
Betrifft: Aries, Cancer, Capricorn, Leo, Libra, Pisces, Scorpio, Virgo, Dionysus.
`primary_game_id` zeigt immer auf die max_evo=18 Variante.

**Release Schedule:**
Vollstaendige Liste in `leak/RELEASE_SCHEDULE.md`.
- Hela/Hera (5008) kommt 2026-05-25
- jiutian-xuannv/Xuannv (3013) kommt 2027-12-12

---

## ATTRIBUT-KEY-MAPPING (vollstaendig)

Alle numerischen Keys aus `hero_detail.lua` sind entschluesselt via `hero_enumeration.lua`:

| Key | user_key | Bedeutung |
|-----|----------|-----------|
| 901 | `atk` | Angriff (absolut) |
| 902 | `hpper` | Leben% Bonus |
| 903 | `defper` | Verteidigung% |
| 904 | `dodge` | Ausweichrate |
| 905 | `hr` | Trefferrate |
| 906 | `critrate` | Kritische Rate |
| 907 | `resi` | Krit-Resistenz |
| 908 | `res` | Magieschaden-Reduktion |
| 909 | `atd` | Physisch-Reduktion |
| 914 | `spd` | Bewegungsgeschwindigkeit |
| 915 | `haste` | Angriffsgeschwindigkeit |
| 919 | `crit` | Krit-Schadensboni |
| 920 | `hurtrageregen` | Rage bei Schaden erhalten |
| 921 | `atkrageregen` | Rage ueber Zeit |
| 928 | `hpRecover` | Heilungseffekt |
| 931 | `pmdamage` | Schadensboni (alle) |
| 937 | `moveSpeedRotio` | Bewegungsgeschw.% |
| 941 | `armorRotio` | Ruestung% |
| 942 | `antimagRotio` | Magie-Resist% |
| 944 | `antiCtrlRotio` | CC-Resistenz |
| 946 | `shield` | Schildeffekt |
| 949 | `utRotio` | Ultimate-Staerke |
| 951 | `damageMultiplier` | System-Schadensmultiplikator |

---

## OFFENE AUFGABEN (priorisiert)

### 1. Skill-Effekte cross-referenzieren
`skill_detail.lua` hat Skill-IDs + `des = 'tid#SkillDes_XXXX'` -- erst nach Lokalisierungs-Dump vollstaendig lesbar.
`buff.lua` enthaelt die eigentliche Mechanik (type: 'Taunt', 'Immunity', 'Dot', etc.)
Ablauf: skill_id -> buff_ids -> Mechanik aus buff.lua extrahieren

### 2. Stats gegen hero_detail.json querpruefen (fortlaufend)
game_hero_id -> hero_detail.json Eintrag -> atk_base, hp_base, def_base, critrate_base
Abgleich mit den manuell eingetragenen Stats in den Hero-JSONs.
Script: `npm run validate:hero-detail-stats`

### 3. Eris Portrait-Qualitaet pruefen
- Portrait `public/heroes/eris.webp` ist live auf R2 (249 KB, konvertiert 2026-04-30)
- Eris hat KEINE Skill-Icons im `new_atlas_sa_ui_skill/` Atlas -- nur Spine-Animationen
- Fallback: skill_icon_prefix=null bedeutet keine Skill-Icons werden konvertiert

### 4. jiutian-xuannv Portrait (2027)
Portrait erst verfuegbar wenn der Held naeher am Release (2027-12-12) geleakt wird.

### 5. nut, audhumla, idun -- zukuenftige Releases
Diese Helden haben Skill-Beschreibungen im Projekt (offenbar aus anderen Quellen),
aber noch keine Spieldaten. Beim naechsten Frida-Scan nach ihnen suchen.

### 6. Frida -- naechster Scan bei neuer Game-Version
```bash
adb connect 127.0.0.1:5555
adb forward tcp:27042 tcp:27042
# Spiel in BlueStacks oeffnen und vollstaendig laden
python3 /tmp/hook_memscan2.py
cp -r /tmp/game_extracted /Users/daschultheiss/hero-database/leak/game_extracted
```

---

## ERKENNTNISSE UEBER DAS DIVINATIONS-SYSTEM

Die Datei `divination_character_setting.json` enthaelt Charaktere fuer ein Orakel/Horoskop-Feature im Spiel.
Die IDs in dieser Datei entsprechen den Hero-IDs aus `hero_detail.json` und `hero_skin.lua`.

**Vollstaendige EN-Namen aller bekannten Heroes (Stand 2026-04-30):**

| game_id | EN Name | Projekt-ID |
|---------|---------|------------|
| 101 | Duoxia (NPC) | aquarius |
| 1001 | Hecate | hecate |
| 1002 | Medusa | medusa |
| 1003 | Hela | - (game-Hela, nicht Projekt-Held) |
| 1004 | Poseidon | poseidon |
| 1005 | Nemesis | nemesis |
| 1006 | Elis | iris |
| 1007 | Khepri | khepri |
| 1008 | Momus | momus |
| 1009 | Tefnut | tefnut |
| 1010 | Skadi | skadi |
| 1011 | Nephthys | (nicht im Projekt) |
| 1012 | Nut | (nut -- nicht im Spiel) |
| 2001 | Sekhmet | sekhmet |
| 2002 | Ares | ares |
| 2003 | Horus | horus |
| 2004 | Geb | geb |
| 2005 | Bastet | bastet |
| 2006 | Athena | athena |
| 2007 | Set | set |
| 2008 | Phoenix | phoenix |
| 2009 | Heracles | heracles |
| 2010 | Meret | meret |
| 2011 | Selket | -- (Serket im Projekt als Variante) |
| 3001 | Anubis | anubis |
| 3002 | Freya | freya |
| 3003 | Demeter | demeter |
| 3004 | Jormungandr | jormungandr |
| 3005 | Artemis | artemis |
| 3006 | Pan | pan |
| 3007 | Diana | diana |
| 3008 | Feng Yi | fengyi |
| 3009 | Wenshen | wenshen |
| 3010 | Nvba | nuba |
| 3011 | Eris | eris |
| 3013 | Xuannv | jiutian-xuannv |
| 4001 | Isis | isis |
| 4002 | Caishen | caishen |
| 4003 | Yanluo | yanluo |
| 4004 | Yue Lao | yuelao |
| 4005 | Jingwei | jingwei |
| 4006 | Prometheus | prometheus |
| 4007 | Surtur | surtr |
| 4008 | Ullr | ullr |
| 4009 | Heladeguna | hladgunnr |
| 4010 | Meng Po | mengpo |
| 4011 | Hephaestus | hephaestus |
| 5001 | Amon-Ra | amunra |
| 5002 | Nyx | nyx |
| 5003 | Dionysus | dionysus |
| 5004 | Nuwa | nuwa |
| 5005 | Zeus | zeus |
| 5006 | Nezha | nezha |
| 5007 | Chronus | cronus |
| 5008 | Hera | hela (intern)/hera (EN) |

---

## DATEI-UEBERSICHT

| Datei | Beschreibung |
|-------|-------------|
| `leak/game_extracted/` | 6.991 extrahierte Spieldateien |
| `leak/game_graphics/` | 16.182 PNG-Assets (3,2 GB) |
| `leak/hero_mapping.json` | Rohdaten-Mapping -- 74 Eintraege (inkl. NPCs/Duplikate) |
| `src/data/game_id_mapping.json` | **Haupt-Mapping** -- Projekt-ID -> Spieldaten |
| `leak/RELEASE_SCHEDULE.md` | Helden mit enable_time Feature-Flag |
| `leak/GRAPHICS_INDEX.md` | Index aller Grafik-Ordner |
| `leak/EXTRACTION_PROGRESS.md` | Technische Dokumentation der Extraktionsmethode |
| `leak/frida_dump_localization.py` | Frida-Hook zum Dumpen aller Spieltexte (optional, divination.json reicht fuer Namen) |
| `motto_full.apk` | Original-APK |
| `motto_unsigned.apk` | Modifiziertes APK (Frida-Gadget injiziert) |

---
name: Motto Immortal Game Data Extraction
description: Vollstaendiger Fortschritt der Datenextraktion aus Motto Immortal (com.goatgames.mot.gb.gp) — Lua-Configs, Grafiken, Hero-Mapping, offene Aufgaben
type: project
originSessionId: 21095881-bee5-4039-a3ea-70ca9b9231e5
---
# Motto Immortal – Extraction Status

**Datum letzter Stand:** 2026-04-30
**Arbeitspfad:** `/Users/daschultheiss/android/`

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

### Grafiken extrahiert
Pfad: `game_graphics/` -- **16.182 PNG-Dateien**, 3,2 GB

Schluessel-Ordner:
- `new_atlas_sa_ui_headportraitnormal/` -- 101 Portraits
- `new_atlas_sa_ui_skill/` -- 373 Skill-Icons (Schema: `A_UI_Hero_<SkillPrefix>_Skill01.png`)
- `new_atlas_sa_ui_item/` -- 746 Item-Icons
- `new_rolespine_<name>_skeletondata/` -- 98+ Helden-Spine-Texturen

### game_id_mapping.json erstellt
**Datei:** `src/data/game_id_mapping.json`
**Zweck:** Stabiles Mapping Projekt-Hero-ID -> Spieldaten (game_hero_id, internal_name, Portrait-Pfade, Skill-Icon-Prefix)

**Stand 2026-04-30:**
- 47 Helden vollstaendig gemappt (game_hero_id + assets)
- 21 Helden: internal_name bekannt, game_hero_id fehlt noch (nicht in hero_mapping.json)
- 5 Helden komplett unbekannt: `audhumla`, `eris`, `idun`, `jiutian-xuannv`, `nut`

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
- Hela (5008) kommt 2026-05-25
- tid=3013 kommt 2027-12-12 (sehr frueh geplant)

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

### 1. EN_US Lokalisierung -- Hoehere Prioritaet
**Problem:** `game_extracted/region_7581840000/EN_US/` enthaelt 1.077 binaere Dateien.
Inner-Encryption unbekannt. Enthaelt alle `tid#HeroName_X`, `tid#SkillName_X`, `tid#SkillDes_X`.

**Losung: Frida-Hook beim Spielstart**
Script: `/Users/daschultheiss/android/frida_dump_localization.py`
```bash
adb connect 127.0.0.1:5555
adb forward tcp:27042 tcp:27042
python3 /Users/daschultheiss/android/frida_dump_localization.py
# Im Spiel: alle Menus aufrufen
# Output: /Users/daschultheiss/android/string_dump.json
```
**Nutzen:**
- Loest die 5 komplett unbekannten Helden auf (audhumla, eris, idun, jiutian-xuannv, nut)
- Loest die 21 Helden mit internal_name aber ohne game_hero_id auf
- Gibt exakte Skill-Beschreibungen fuer alle Helden

### 2. game_id_mapping.json vervollstaendigen -- Manuell
Die 21 Helden mit bekanntem internal_name aber ohne game_hero_id:
anubis, ares, athena, bastet, cronus, demeter, geb, gemini, heracles, hladgunnr,
khepri, mengpo, meret, momus, nuba, phoenix, prometheus, sagittarius, taurus, tefnut, ullr.
Diese sind im Spiel vorhanden (Portraits existieren), aber fehlen in `hero_mapping.json`.
Loesung: hero_mapping.json mit diesen internal_names erganzen + game_hero_id aus hero_detail.lua nachschlagen.

### 3. Skill-Effekte cross-referenzieren
`skill_detail.lua` hat Skill-IDs + `des = 'tid#SkillDes_XXXX'` -- erst nach Lokalisierungs-Dump lesbar.
`buff.lua` enthaelt die eigentliche Mechanik (type: 'Taunt', 'Immunity', 'Dot', etc.)
Ablauf: Schritt 1 (Lokalisierung) -> dann skill_id -> buff_ids -> Mechanik

### 4. Portrait/Skill-Icons ins Projekt einbinden
Mit fertigem Mapping sind alle Assets direkt ansteuerbar:
- Portrait: `game_graphics/new_atlas_sa_ui_headportraitnormal/{portrait_normal}.png`
- Skill-Icons: `game_graphics/new_atlas_sa_ui_skill/A_UI_Hero_{skill_icon_prefix}_Skill01.png`
Konvertierung nach WebP (512x512) und Ablage in `src/assets/heroes/` und `src/assets/skills/`

### 5. Stats aus hero_detail.lua verifizieren
game_hero_id -> hero_detail.lua Eintrag -> atk_base, hp_base, def_base, critrate_base
Abgleich mit den manuell eingetragenen Stats in den Hero-JSONs.

---

## DATEI-UEBERSICHT

| Datei | Beschreibung |
|-------|-------------|
| `game_extracted/` | 6.991 extrahierte Spieldateien |
| `game_graphics/` | 16.182 PNG-Assets (3,2 GB) |
| `leak/hero_mapping.json` | Rohdaten-Mapping -- 74 Eintraege (inkl. NPCs/Duplikate) |
| `src/data/game_id_mapping.json` | **Haupt-Mapping** -- Projekt-ID -> Spieldaten |
| `leak/RELEASE_SCHEDULE.md` | Helden mit enable_time Feature-Flag |
| `leak/GRAPHICS_INDEX.md` | Index aller Grafik-Ordner |
| `leak/EXTRACTION_PROGRESS.md` | Technische Dokumentation der Extraktionsmethode |
| `frida_dump_localization.py` | Frida-Hook zum Dumpen aller Spieltexte |
| `motto_full.apk` | Original-APK |
| `motto_unsigned.apk` | Modifiziertes APK (Frida-Gadget injiziert) |

### Frida-Wiederholung (neue Game-Version)
```bash
adb connect 127.0.0.1:5555
adb forward tcp:27042 tcp:27042
# Spiel in BlueStacks oeffnen und vollstaendig laden
python3 /tmp/hook_memscan2.py
cp -r /tmp/game_extracted /Users/daschultheiss/android/game_extracted
```

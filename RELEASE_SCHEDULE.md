# Motto Immortal - Hero Release Schedule

Extracted from: `game_extracted/region_7584e4b000/client/config/hero_detail.json`
Field: `enable_time` (feature flag controlling hero availability)
Extraction date: 2026-04-30
EN names resolved via: `divination_character_setting.json`

> Note: Dates in the past mean the hero was already released at the time of extraction.
> Heroes without an `enable_time` have no release gate (always enabled).

---

## Timeline

| enable_time | game_hero_id | en_name | internal_name | In Project? | Notes |
|-------------|-------------|---------|---------------|-------------|-------|
| 2025-07-25 | 50001 | ??? | hladgunnr variant | partial | Alternate skin, probably Hladgunnr |
| 2026-01-21 | 4009 | Heladeguna | hladgunnr | yes (`hladgunnr`) | already released |
| 2026-02-02 | 5006 | Nezha | nezha | yes (`nezha`) | already released |
| 2026-02-04 | 1009 | Tefnut | tefnut | yes (`tefnut`) | already released |
| 2026-02-18 | 2009 | Heracles | heracles | yes (`heracles`) | already released |
| 2026-03-04 | 3010 | Nvba | nuba | yes (`nuba`) | already released |
| 2026-03-18 | 4010 | Meng Po | mengpo | yes (`mengpo`) | already released |
| 2026-04-01 | 1010 | Skadi | sikadi | yes (`skadi`) | already released |
| 2026-04-05 | 5007 | Chronus | keluo | yes (`cronus`) | already released |
| 2026-04-08 | 3009 | Wenshen | wenshen | yes (`wenshen`) | already released |
| 2026-04-22 | 2010 | Meret | meret | yes (`meret`) | already released |
| 2026-05-06 | 4011 | Hephaestus A | hephaestus | yes (`hephaestus`) | ✅ **released** - 5 skills (manual) |
| 2026-05-20 | 2011 | Serket / Selket B | saierkaite | yes (`serket`) | ✅ released; en_name im Live-Config = "Selket" |
| 2026-05-25 | 5008 | Hera S | hela | yes (`hera`) | ✅ released (confirmed post-release) |
| 2026-06-03 | 3011 | Eris SS | elisi | yes (`eris`) | ✅ released |
| 2026-06-17 | 1012 | Nut SS | sikadi | no | ✅ released 2026-06-17 |
| 2026-06-24 | 3013 | Xuannv SS | jiutianxuannv | yes (`jiutian-xuannv`) | ✅ released; Datum vorgezogen von 2027-12-12 |
| 2026-07-08 | 1011 | Nephthys B | sikadi | no | ✅ released; reales Datum (war 2099-Platzhalter) |
| 2026-07-22 | 4012 | Idun | ??? | no | ✅ released; is_visible=1 (war 0); vo=Vo_PanCi_CJian |
| 2026-07-27 | 5009 | Hades | ??? | no | ✅ released; Launch über SeaWar-Event 201160001, nicht new_card_push |
| **2026-05-01** | **3012** | **Heket** 海奎特 | heket | no | ⚠️ **sofort live** — Datum rückdatiert, Banner läuft aber erst ab 2026-08-19. Siehe Anomalie unten |
| **2026-08-05** | **2012** | **Audhumla** 欧德姆布拉 | Audhumla | no | coming_soon; war 2027-12-26; Banner `new_card_push_19` |
| **2026-08-19** | **3012** | **Heket** (Banner) | heket | no | `new_card_push_20` — der eigentliche Release-Slot |
| **2026-09-02** | **1013** | **He Bo** 河伯 | Hebo | no | coming_soon; war 2029-05-15; Banner `new_card_push_21` |
| **2026-09-16** | **4013** | **Zaojun** 灶君 | zaojun | no | coming_soon; **neu im Global-Config**; Banner `new_card_push_22` |
| **??** | **5010?** | **Gaia** | gaiya | no | nur Gacha-Art, kein hero_detail-Eintrag; ID aus CN abgeleitet |
| 2027-12-12 | 30121 | ??? | (Alt-Slot zu 3012) | no | neu; is_visible=0; Skin `3012101` |

---

## Notes

### Already released (enable_time <= 2026-04-30)
- **Heladeguna** (4009) - 2026-01-21
- **Nezha** (5006) - 2026-02-02
- **Tefnut** (1009) - 2026-02-04
- **Heracles** (2009) - 2026-02-18
- **Nvba/Nuba** (3010) - 2026-03-04
- **Meng Po** (4010) - 2026-03-18
- **Skadi** (1010) - 2026-04-01
- **Chronus** (5007) - 2026-04-05
- **Wenshen** (3009) - 2026-04-08
- **Meret** (2010) - 2026-04-22

### Coming soon (relative to extraction date 2026-04-30)
- **Hephaestus** (4011) - 2026-05-06
- **Selket** (2011) - 2026-05-20; project ID: `serket`
- **Hera** (5008) - 2026-05-25; ✅ released; project ID: `hela`, EN display name is Hera (not Hela)
- **Eris** (3011) - 2026-06-03; is_visible=1 in live global extraction
- **Nut** (1012) - 2026-06-17; divination label, no standalone internal_name yet

### ⚠️ Anomalie: Heket (3012) ist zu früh live — Patch 94792, 2026-07-31

→ Ausformulierter Bugreport: [HEKET_EARLY_UNLOCK_BUGREPORT.md](HEKET_EARLY_UNLOCK_BUGREPORT.md)

**Beobachtung:** Ingame erscheint ein Held, der nicht in die Timeline-Reihenfolge passt.
**Ingame bestätigt (2026-07-31):** Heket ist beschwörbar, obwohl kein Release-Banner läuft.

**Ursache:** Patch 94792 gibt 3012 (海奎特 / Heket) `enable_time = 2026-05-01 00:00:00`.
Das liegt in der Vergangenheit → der Held ist sofort freigeschaltet. Sein eigentlicher
Release-Banner `new_card_push_20` (新卡推送·海奎特3012) startet aber erst **2026-08-19**
und läuft bis 2026-09-01. Zwischen Freischaltung und Banner liegen ~3,5 Monate.

**Warum das nach einem Config-Fehler aussieht:** `2026-05-01` ist exakt das **CN**-Datum
für 3012 (CN-Dump `live_extractions_cn/20260731_071145`). Bei den drei anderen in diesem
Patch neu datierten Helden wurde jeweils ein eigenes Global-Datum gesetzt:

| hero_id | CN `enable_time` | Global `enable_time` | Global-Banner |
|---|---|---|---|
| 2012 Audhumla | 2026-04-17 | 2026-08-05 | new_card_push_19 |
| **3012 Heket** | **2026-05-01** | **2026-05-01** ⚠️ | new_card_push_20 → 2026-08-19 |
| 1013 He Bo | 2026-05-15 | 2026-09-02 | new_card_push_21 |
| 4013 Zaojun | 2026-05-29 | 2026-09-16 | new_card_push_22 |

Nur bei 3012 stimmt das Global-Datum mit dem CN-Datum überein — beim Übertragen der
Zeile wurde das CN-`enable_time` offenbar nicht durch das Global-Datum ersetzt. Erwartbar
wäre `2026-08-19` gewesen, passend zum Banner.

**Zweiter Beleg — Wochentag:** Global-Releases liegen ausnahmslos auf **Mittwoch**
(05-06, 05-20, 06-03, 06-17, 06-24, 07-08, 07-22, 08-05, 08-19, 09-02, 09-16).
Heket's ausgeliefertes `2026-05-01` ist ein **Freitag**. Einzige weitere Nicht-Mittwoch-
Ausnahme ist Hades (Mo, 2026-07-27) — der lief über das SeaWar-Event statt über einen
`new_card_push`-Banner, also anderes Vehikel, keine Anomalie.

**Dritter Beleg — alles andere ist korrekt vorbereitet:** `gacha/gacha_wish.json` hat in
diesem Patch Einträge für 3012, 2012, 1013 **und** 4013 bekommen (alle `is_use: 1`).
Bei 2012/1013/4013 blockt das zukünftige `enable_time`; bei 3012 nicht. Dazu eigener Skin
`301201` (vorher Eris-Skin `301101`), eigene tid-Keys, eigener divination-Eintrag,
`card_hero`-Eintrag. Es ist also genau **ein** falscher Wert, nicht ein unfertiger Held.

**Ist das ein reiner Anzeigefehler?** Nein. `enable_time` ist das Feature-Gate, und der
Server prüft es **nicht** nach: Spieler haben Heket beschworen und **ausgerüstet**, beides
wurde serverseitig persistiert (Ingame bestätigt, 2026-07-31). Der Client-Config-Wert war
die einzige Schranke.

**Ihr Banner wurde nicht vorgezogen.** `new_card_push_20` steht unverändert auf
2026-08-19 → 2026-09-01. Der Kalender davor ist lückenlos belegt (18: Idun bis 08-04,
19: Audhumla 08-05→08-18), 14-Tage-Takt ohne freien Slot. Heket vorzuziehen hieße
Audhumla zu verdrängen. Der Zustand ist also nicht „Release vorgezogen", sondern
„Gate offen, Banner steht" — sie ist ab heute **19 Tage** vor ihrem eigenen Banner
erhältlich.

3012 hat in diesem Patch außerdem einen **eigenen Skin `301201`** bekommen (vorher lief er
auf dem Eris-Skin `301101`) sowie eigene `tid#HeroName_3012` / `tid#HeroDes_3012`,
`job=3`, `vo=Vo_PanCi_SLin`. Also kein Platzhalter mehr, sondern fertiger Held.

---

### Neu aus Live-Extraktion 2026-07-31 / 11:53 (Patch 94792, GLOBAL)

Der Patch schreibt die Timeline um. `hero_detail.json` gegenüber dem Lauf von 07:00
(Patch 94615) geändert — **erstmals seit Wochen wieder Bewegung**:

- **3012 Heket**: `2099-06-24` (Platzhalter, Eris-Skin) → **`2026-05-01`, released**,
  eigener Skin `301201`. Siehe Anomalie oben.
- **2012 Audhumla**: `2027-12-26` → **`2026-08-05`**
- **1013 He Bo**: `2029-05-15` → **`2026-09-02`**
- **4013 Zaojun**: **neu im Global-Config**, `2026-09-16`. Passt zum Asset
  `commontex_fx_x_4013.assetbundle.png`, das schon in Patch 94615 auftauchte.
- **30121**: neu, `2027-12-12`, `is_visible=0`, Skin `3012101` — Alt-/Skin-Slot zu 3012,
  im CN-Client seit Längerem bekannt.

Damit sind die „far future"-Platzhalter (2027/2029/2099) für 2012, 1013 und 3012
aufgelöst. Der Global-Fahrplan steht jetzt durchgehend bis 2026-09-29.

**Neue Banner** (`active.json`):

| Banner | Held | Laufzeit |
|---|---|---|
| new_card_push_19 | 2012 欧德姆布拉 Audhumla | 2026-08-05 → 2026-08-18 |
| new_card_push_20 | 3012 海奎特 Heket | 2026-08-19 → 2026-09-01 |
| new_card_push_21 | 1013 河伯 He Bo | 2026-09-02 → 2026-09-15 |
| new_card_push_22 | 4013 灶君 Zaojun | 2026-09-16 → 2026-09-29 |

**Gaia (5010) unverändert offen**: weiterhin kein `hero_detail`-Eintrag, und die
SeaWar-Instanz `201160002` hat immer noch kein `start_time` in `active.json` und keinen
Hero-Pool. Nur die Gacha-Art liegt bereit. Nach der neuen Banner-Kette wäre der nächste
freie Slot nach dem 2026-09-29.

**Weitere neue Aktivitäten:** `mystery_shop_5`, `give_red_packet_3`, `charge_activity_5`,
`choose_gift`, `active_boss_4`, `monthly_god_trial_5`, Direktkauf-Slots `hero_shop_2/3/5/6`
(孟婆 Meng Po, 麦尔特 Meret, 倪克斯 Nyx, 女娲 Nuwa). Entfallen: `201040004`–`201040008`.

### Neu aus Live-Extraktion 2026-07-31 / 07:00 (Patch 94615, GLOBAL)
- **Gaia** (`Gaiya`) - Datum unbekannt; Art für SeaWar-Instanz `201160002` liegt schon im
  Client, aber kein `hero_detail`-Eintrag. Details unten.
- `hero_detail.json` ist gegenüber dem Lauf vom 2026-07-20 **byte-identisch** — keine neuen
  `enable_time`-Zeilen, keine Datumsverschiebungen.
- NL/PL: `deflate_config_nl_nl.zip` und `deflate_config_pl_pl.zip` liegen in
  `device_patch/packages/`, aber `language.json` listet weiterhin nur DE/EN/ES/FR/IT/PT/TR/
  ZH_CN/ZH_TW → Sprachen vorbereitet, nicht freigeschaltet.

### Coming soon (from 2026-06-18 live extraction)
- **Xuannv** (3013) - **2026-06-24** (moved up from 2027-12-12); Clubs ♣; project ID: `jiutian-xuannv`
- **Nephthys** (1011) - **2026-07-08** (was 2099 placeholder); Spades ♠; sikadi assets
- **Idun** (4012) - **2026-07-22**; Hearts ♥; hidden (is_visible=0); config uses Nvba placeholder data
- **Hades** (5009) - **2026-07-27**; Stars ★; vo=Vo_WDang
- **He Bo** (1013) - **2029-05-15**; Spades ♠; skin 101301; vo=Vo_WHua

### Far future
- **Audhumla** (2012) - 2027-12-26; Diamonds ♦; vo=Vo_CJian

### Placeholder dates (2099 = reserved/not planned)
- **Heket** (3012) - 2099; Clubs ♣; placeholder, uses Eris assets/skin 301101

### Skadi / sikadi variants (1010, 1011, 1012)
All three entries in hero_detail use `internal_name=sikadi`:
- 1010 = base Skadi (released 2026-04-01)
- 1012 = Nut SS (released 2026-06-17)
- 1011 = Nephthys; now has real date 2026-07-08; confirmed new character on CN server

### EN name confusion: Hera vs Hela
The project hero `hela` has EN display name **Hera** (game ID 5008).
The in-game CN internal name is `hela` but the localized EN name is Hera.
Confirmed via `divination_character_setting.json` ID 5008.

---

## 📊 EXTRACTED DATA (Memory Dumps)

### Hephaestus (4011) - Released 2026-05-06

**Extraction Date:** 2026-05-06  
**Method:** Memory Dump + Manual In-Game Check  
**Status:** ✅ Complete (manual)

**Skills (Manual Entry - EN):**
1. ✅ Artisan's Insight (partially in memory dump)
2. ✅ Undying Forge
3. ✅ Molten Aegis
4. ✅ Primal Resonance
5. ✅ Mech Domain

**Notes:**
- Only "Artisan's Insight" was found in memory dump (among 101 skills)
- Other 4 skills are encrypted - not extractable via memory dump
- Skills manually verified in-game (EN available)
- Confirms: Skill texts are IL2CPP encrypted and not accessible

---

### Serket (2011) - Release 2026-05-20

**Status:** ⏳ Pending extraction  
**Next Action:** Memory dump on 2026-05-20

---

### Hera (5008) - Release 2026-05-25

**Status:** ✅ Released  
**Next Action:** Post-release memory dump/skills refresh (if needed)

---

### Eris (3011) - Release 2026-06-03

**Status:** ⏳ Pending extraction  
**Next Action:** Memory dump around 2026-06-03 window

---

### Nut (1012) - Release 2026-06-17

**Status:** ✅ Released  
**Next Action:** Memory dump for skills if needed

---

### Xuannv (3013) - Release 2026-06-24

**Status:** ⏳ Coming soon (6 days); date moved up from 2027-12-12  
**Next Action:** Memory dump on 2026-06-24

---

### Nephthys (1011) - Release 2026-07-08

**Status:** ⏳ Coming soon; date confirmed (was 2099 placeholder)  
**Next Action:** Memory dump on 2026-07-08

---

### Idun (4012) - Release 2026-07-22

**Status:** ✅ Released (bestätigt 2026-07-31, Patch 94615); is_visible=1; vo=Vo_PanCi_CJian  
**Next Action:** Skills/Stats-Extraktion

---

### Hades (5009) - Release 2026-07-27

**Status:** ✅ Released (bestätigt 2026-07-31, Patch 94615); vo=Vo_PanCi_WDang  
**Launch-Vehikel:** SeaWar-Event `201160001` (海战), 2026-07-27 → 2026-08-07, Star-Gacha
mit `reward {type:101, id:5009}`, `hero_evo 6`, `star_minimum_times 40`, Kosten Item 400501.
Kein `new_card_push`-Eintrag — letzter davon ist `new_card_push_18` (Idun, 2026-07-22).  
**Next Action:** Mechanik siehe HADES_MECHANICS_ANALYSIS.md

---

### Gaia (Codename `Gaiya`) - Datum unbekannt

**Status:** 🔍 Kandidat, entdeckt 2026-07-31 in Patch 94615 (GLOBAL)

**Belege:**
- `active/active_gacha_optional/active_gacha_optional_hero_img.json` hat neue Instanz
  **`201160002`** mit fertiger Star-Gacha-Art:
  `A_UI_GachaStar_BlackoutCharacter_Gaiya_Img.png` + `RoleFragmentation_Gaiya01..05`
- `active/active_festival/active_festival.json` hat `201160002` als zweite SeaWar-Instanz
  (gleiches UI wie Hades-Instanz `201160001`)

**Was fehlt:**
- Kein Eintrag in `hero_detail.json` → **kein `enable_time`**
- Kein Eintrag in `divination_character_setting.json`
- Kein Hero-Pool: `active_gacha_optional_hero.json` und `active_gacha_optional.json`
  kennen nur `201160001`
- Kein `start_time`: `active.json` hat `201160002` nicht

**Hero-ID: vermutlich 5010** — abgeleitet aus dem CN-Client (Dump `live_extractions_cn/20260731_071145`,
CN v1.0.12/92514): dort ist `5010 = 盖亚 (Gaia)`, CN-Release **2026-07-08**. Das ist eine
CN-Aussage; im Global-Config existiert für 5010 auch nach Patch 94792 kein Eintrag.

Nicht 4013 — `4013 = 灶君 (Zaojun)`. Bestätigt: Patch 94792 hat 4013 mit Global-Datum
**2026-09-16** in `hero_detail.json` aufgenommen. Das Asset
`device_patch/packages/commontex_fx_x_4013.assetbundle.png` aus Patch 94615 war die
Vorbereitung dafür, nicht für Gaia.

**CN-Reihenfolge nach Gaia** (CN-Daten, Global-Reihenfolge weicht erfahrungsgemäß ab):
4014 = 卡戎 (Charon), CN-Release 2026-07-10; 2014 = 阿南刻 (Ananke), 2026-07-24.

**Stand Patch 94792:** Global hat 4013 Zaojun (2026-09-16) eingeplant, Gaia weiter nicht.
Global zieht also **nicht** Gaia vor, sondern folgt der CN-Reihenfolge — trotz der schon
vorhandenen Gaia-Gacha-Art. Frühester plausibler Slot: nach dem 2026-09-29.

**Next Action:** Nächster Global-Dump — auf `hero_detail`-Eintrag für 5010 und auf
`start_time` für `201160002` prüfen.

---

### Audhumla (2012) - Release 2027-12-26

**Status:** ⏳ Far future; Diamonds ♦; vo=Vo_CJian  
**Next Action:** Wait

---

### He Bo (1013) - Release 2029-05-15

**Status:** ⏳ Far future; Spades ♠; vo=Vo_WHua; skin 101301  
**Next Action:** Wait

---

**Last Updated:** 2026-07-31 11:53 (live global extraction `live_extractions/20260731_115343`,
v1.3.15/90346, Patch **94792** — Timeline umgeschrieben: Heket sofort live (Anomalie),
Audhumla/He Bo/Zaojun mit realen Daten bis 2026-09-16)

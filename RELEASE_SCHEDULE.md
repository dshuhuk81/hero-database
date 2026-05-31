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
| 2026-05-20 | 2011 | Serket B | saierkaite | yes (`serket`) | ✅ released |
| 2026-05-25 | 5008 | Hera S | hela | yes (`hera`) | ✅ released (confirmed post-release) |
| **2026-06-03** | **3011** | **Eris** SS | elisi | yes (`eris`) | **coming soon**; updated from live global extraction |
| **2026-06-17** | **1012** | **Nut** SS | sikadi | yes (`nut`) | confirmed Nut ID; extracted internal name still overlaps with Skadi |
| 2027-12-12 | 3013 | Xuannv SS | jiutianxuannv | yes (`jiutianxuannv`) | far future |
| 2027-12-26 | 2012 | ??? | ??? | no | far future, not in divination |
| 2099-06-24 | 1011 | Nephthys (div label) B | sikadi | no | placeholder date; Skadi variant, not a real hero |
| 2099-06-24 | 3012 | ??? | ??? | no | placeholder date; reserved/disabled |
| 2099-06-24 | 4012 | ??? | ??? | no | placeholder date; reserved/disabled |

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
- **Hera** (5008) - 2026-05-25; ✅ released; project ID: `hera`, extracted internal name is `hela`
- **Eris** (3011) - 2026-06-03; is_visible=1 in live global extraction
- **Nut** (1012) - 2026-06-17; confirmed Nut ID, extracted `internal_name=sikadi`

### Far future
- **Xuannv** (3013) - 2027-12-12; project ID: `jiutianxuannv`
- **Unknown** (2012) - 2027-12-26; not in divination, identity unknown

### Placeholder dates (2099 = reserved/not planned)
IDs 1011, 3012, 4012 have enable_time=2099. These are either reserved slots or disabled content.
1011 uses sikadi (Skadi) assets and is labeled Nephthys in divination - it is not a separate hero.

### Skadi / sikadi overlap (1010, 1011, 1012)
All three entries in hero_detail use `internal_name=sikadi`, but they must not all be mapped to Skadi:
- 1010 = base Skadi (released 2026-04-01)
- 1012 = Nut (release 2026-06-17); confirmed hero ID despite the overlapping extracted internal name
- 1011 = placeholder with 2099 date; uses Skadi assets; listed as Nephthys in divination (separate character system). This is a new character, and confirmend on the CN server.

### EN name confusion: Hera vs Hela
The project hero `hela` is **Hela** (game ID 1003) with extracted internal name `haila`.
The project hero `hera` is **Hera** (game ID 5008) with extracted internal name `hela`.
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

**Status:** ✅ Released  
**Next Action:** Post-release memory dump/skills refresh (if needed)

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

**Status:** ⏳ Pending extraction
**Next Action:** Memory dump around 2026-06-17 window

---

### Xuannv (3013) - Release 2027-12-12

**Status:** ⏳ Far future  
**Next Action:** Wait for release

---

**Last Updated:** 2026-05-30 (live global extraction refresh)

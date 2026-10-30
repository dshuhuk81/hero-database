# Battle-Event-Spezifikation (Entwurf)

Datum: 2026-10-30. Status: Entwurf, abgeleitet aus zwei Live-Aufnahmen mit Client 2.3.8, Patch 102687:
- `fights/charon_20261030_114740`: Odyssey 50-42, Niederlage, 92 s, 13.279 Events, Probe-Schema 2.
- `fights/charon_20261030_115353`: Odyssey 50-42, Sieg, 27 s Kampf (45 s Aufnahme), 6.086 Events, Probe-Schema 3.

Ziel ist der Battle Analyzer: erst objektive Ereignisse, dann Kennzahlen, dann Interpretation. Diese Spezifikation beschreibt nur die erste Stufe, also was `hero_combat_capture.py` aufzeichnet, und die Lücken bis zum Zielbild.

## 1. Grundsätze

1. **`events.jsonl` bleibt roh.** Die Werte werden so gespeichert, wie die Engine sie liefert. Die Umrechnung macht nur `combat_analysis.py`.
2. **Festkomma.** Die Kampfwerte sind Ganzzahlen mit Skala 1024 (`GlobalTools.base1`, im `READY`-Event als `fixed_one`). Das Manifest hält dazu `fixed_point_one: 1024` fest, und `combat_analysis.descale()` teilt die Felder aus `FIXED_POINT_FIELDS`. Belege: `MaxRage` = 1024000 (= 1000 Energie), `CritRate` = 276 (≈ 27 %), Platzhalter-HP 1024000. Positionen und Buff-Zeiten (`lastTime: 102` ≈ 0,1 s) sind ebenfalls Festkomma, werden aber noch nicht umgerechnet.
3. **Fehlen heißt unbekannt**, außer eine Regel sagt ausdrücklich, dass ein Event erwartet war.
4. **Jedes Event nennt Verursacher und Ziel** über die Instanz-ID, nie nur über den Heldennamen.

## 2. Gemeinsame Felder (Envelope)

| Feld | Quelle | Bedeutung |
|---|---|---|
| `host_ts` | Python | Zeitpunkt auf dem Mac beim Einlesen, nur zur Diagnose |
| `ms` | `SceneManager:getCurSceneModel().curTime` | Kampfzeit in ms, nicht skaliert |
| `seq` | Probe (ab Schema 3) | streng monoton, eindeutig pro Injektion; löst gleiche `ms` auf |
| `kind` | Probe | Event-Art, siehe Abschnitt 4 |

Die Sortierung erfolgt nach `(ms, seq)`.

## 3. Einheiten-Identität

| Feld | Beispiel | Hinweis |
|---|---|---|
| `*instance` | `10522460938-1769755251160-4S0JJk` (eigene Helden), `504201-1` (PvE-Gegner) | eindeutig, auch bei gespiegelten Helden (Kebuli auf beiden Seiten belegt) |
| `*hero` / `src` / `dst` | `H_KaRong` | Runtime-Skin-Template; Zuordnung zur Helden-ID über `hero_skin.json` |
| `*camp` | `1` / `-1` | eigenes / gegnerisches Team |
| `*master` | `H_HeHuaiSiTuoSi#…` oder `nil` | Besitzer bei Summons und Hilfseinheiten |

`H_MainPlayer` (je Seite eine Einheit) ist die Spielerfigur und kein Held. `H_HeHuaiSiTuoSi_JiXie` sind die Mechs von Hephaestus. Sie erscheinen als eigene Einheiten, lösen aber **kein** `SUMMON_CREATE` aus.

## 4. Event-Katalog (Ist-Stand)

Anzahlen: Aufnahme 1 / Aufnahme 2.

| kind | Anzahl | Hook | Kernfelder | Bewertung |
|---|---|---|---|---|
| `READY`, `DAMAGE_HOOK` | 1 / 1 | Probe | `target`, `fixed_one` | Health-Check |
| `PLAYER_LINEUP` | 17 / 5 | `PlayerData.init` | HP, ATK, Energie, Loadout-Versuche | **unvollständig**: Helden, die vor der Injektion erzeugt wurden, fehlen. Das Setup stattdessen aus `COMBATANT_SNAPSHOT` ableiten |
| `COMBATANT_SNAPSHOT` | 482 / 208 | `spawnFinish`, `skillStart`, `skillEnd` | alle Attribute aus `AttrEnum` (gepackter String), Position, KI-Zustand | Setup-Quelle für Abschnitt A |
| `PLAYER_SKILL` | 434 / 158 | `Player_Model.skillStart/skillEnd` | `phase`, `skill` (Config-ID, z. B. 401134), `energy` | gut |
| `FEATURE_INIT/ENTER/EXIT` | 3364 / 1751 (ENTER) | `SkillFeatures_Model.init` + Methoden-Wrapper | `feature`, `method`, `call_id`, `parent_call_id`, `self_state` | Mechanik-Callbacks; `call_id`-Stack ist die beste Kausalitätsquelle |
| `DAMAGE` | 219 / 96 | `DamageUtil.calDamageByPower`, `calRealDamageByPower` | `power`, `out`, `coef`, `dmg_type`, `is_crit`, `skill` (die letzten drei ab Schema 3) | Rechenwert vor Schild und Abzug |
| `HIT_APPLIED` | – / 96 | `Player_Model.beHitDirect` (ab Schema 3) | `hit_type`, `want_damage`, `before`, `after`, `hp_lost` | tatsächlicher HP-Verlust |
| `HEAL` | 236 / 74 | `Player_Model.cureExt` | `effective`, `overheal_floor`, `heal_type`, `coef` | gut |
| `DIRECT_HP_CHANGE` | 32 / 10 | `PlayerData.addCurHp` | `requested`, `actual` | ohne Quelle (z. B. HP-Tausch) |
| `ENERGY_CHANGE` | 4083 / 1440 | `PlayerData.changeEnergy/clearEnergy` | `reason`, `before`, `after`, `actual` | gut; größtes Volumen (Zeit-Tick) |
| `BUFF_ADD` | 595 / 282 | `BufManager.addBufById/addBufByData` | `id`, `src`, `dst`, `skill`, `buff_state` (Typ, `lastTime`, Level) | **doppelt**: `addBufById` ruft intern `addBufByData` auf |
| `BUFF_REMOVE`, `BUFF_REMOVE_REQUEST` | 250+25 / 111+19 | `BufManager.removeBuf*` | `id`, `buff_state` | kein Ablaufgrund |
| `SHIELD_CHANGE` | 54 / 16 | `BufWorkShield.setValue/addFixValue` | `before`, `after`, `delta` | nur Schild-Buffs dieser Klasse |
| `TARGET_SELECTION` | 24 / 11 | Feature `findTargets/redirectTargets` | `targets` | nur Features, die Ziele selbst wählen |
| `PLAYER_DEAD` | 8 / 6 | `Player_Model.enterRealDead` | `active_skill` | kein Killer |
| `SUMMON_CREATE/DESTROY`, `PLAYER_REVIVE` | 0 / 0 | Feature-Callbacks | – | in beiden Kämpfen nicht ausgelöst |

## 5. Enums (Client 102687, `Battle/BattleEnum.lua`, `DamageUtil.lua`)

| Feld | Werte |
|---|---|
| `hit_type` (`EBattleHitType`) | 0 Normal, 1 Dodge, 2 Crit, 3 Invincible |
| `ENERGY_CHANGE.reason` (`EEnergyChangeReason`) | 0 Any, 1 Time, 2 Hurt, 3 Kill, 4 Skill, 5 OtherSkill; dazu `ultimate_clear` (Probe) |
| `DAMAGE.dmg_type` | 1 Magisch, 2 Physisch, 3 ohne Tag; `nil` bei True Damage |
| `DAMAGE.path` | `NORMAL`, `TRUE` |

Verteilung in Aufnahme 2: `reason` 1 = 1279, 2 = 79, 4 = 44, 5 = 23, 3 = 6, `ultimate_clear` = 9. `hit_type` 0 = 92, 2 = 4.

## 6. Abdeckung gegenüber dem Analyzer-Konzept

| Bereich | Abgedeckt | Lücke | Vorschlag |
|---|---|---|---|
| A Setup | Attribute je Einheit (Snapshot), Position, Lager | Divine Rank, Relikt, Ausrüstung, Totem; Kampfergebnis | Loadout aus `player.plyData` lesen (Feldnamen prüfen); Ergebnis über das Battle-State-Ende (`EBattleState`) |
| B Timeline | Skill-Start/-Ende, Feature-Callbacks, Tod, `seq` | Channel und Unterbrechung, Bewegung, Normalangriffe getrennt | `aiEngine`-Zustandswechsel hooken; Bewegung über `Move/*Movement_Model` |
| C Damage/Heal | Rechenwert, tatsächlicher HP-Verlust, Crit/Dodge/Invincible, Heilung | Schildabsorption pro Treffer, Overkill | Differenz `want_damage − hp_lost` mit `SHIELD_CHANGE` derselben `seq`-Nähe verknüpfen; Overkill = `want_damage − before` bei `after = 0` |
| D Energy | jede Änderung mit Grund | Cooldowns | `clearCDTime` existiert nur in einzelnen Features; CD-Logik in `PlayerSkill_Model` suchen |
| E Buffs | Quelle, Ziel, Typ, Dauer (`lastTime`) | Resist/Immunität, fehlgeschlagene Anwendung, Ablaufgrund | `BufManager.canAddBuff` und die Return-Pfade von `addBufByData` (nil = abgelehnt) als `BUFF_REJECTED` |
| F Targeting | Zielauswahl eigener Features | Push/Pull/Teleport, Gründe für Zielwechsel | `Player_Model.lockEnemy(enemy, isForce)` hooken |
| G Summons | Besitzer (`master`) an jeder Einheit | Summon-Lebenszyklus für Mech-artige Einheiten | Erzeugung über `SummonerManager_Model` hooken statt über Feature-Callbacks |
| „Warum nicht“ | – | Gründe für nicht ausgeführte Aktionen | `SkillFeatures_Model.canUse`, `canDead`, `BufManager.canAddBuff` mit Rückgabewert protokollieren |

Ursache-Verknüpfung (`causeEventId`): Die Engine liefert keine. Am nächsten kommt man über `call_id`/`parent_call_id` (Feature-Stack), `active_skill` pro Einheit und `seq`-Nachbarschaft. Ein echtes `cause_seq` ließe sich setzen, indem die Probe beim Eintritt in `skillStart`, `beHitDirect` und `cureExt` die aktuelle `seq` auf einen Stack legt und Folge-Events sie mitschreiben.

## 7. Bekannte Probleme

1. `PLAYER_LINEUP` ist unvollständig (siehe Abschnitt 4).
2. `BUFF_ADD` wird doppelt gemeldet; die Auswertung entfernt Dubletten über `dedupe_events`. In der Probe sollte nur `addBufByData` gehookt werden.
3. `want_damage` ist oft größer als `hp_lost` (z. B. 2,82 Mrd. gegenüber 2,26 Mrd. roh). In Aufnahme 2 gilt das für 46 von 96 Treffern, davon 33 ohne `SHIELD_CHANGE` am Ziel innerhalb von ±50 ms. Offen ist, ob das an Schadensminderung in `beHitDirect` oder an einem anderen Schild-Typ liegt.
6. Behoben am 2026-10-30: Die Schild-Hooks wurden bei erneuter Injektion nicht ersetzt und liefen mit dem Code der ersten Injektion weiter (in Aufnahme 2 daher `SHIELD_CHANGE` ohne `seq`). Live bestätigt mit Patch 102814: zwei Injektionen im selben Prozess (`charon_20261030_120935`, dann `charon_20261030_120952`), alle 7.623 Events des Kampfs mit `seq`, darunter 19 `SHIELD_CHANGE`.
4. Frida-Detach hängt nach jeder Aufnahme. Die Daten sind dann bereits gespeichert; die Hooks bleiben bis zur nächsten Injektion oder bis zum Neustart des Spiels aktiv.
5. Werte in `COMBATANT_SNAPSHOT.attributes` und `buff_state` sind gepackte Strings und werden noch nicht umgerechnet.

## 8. Nächste Schritte

1. Doppelte `BUFF_ADD` in der Probe beheben und `PLAYER_LINEUP` aus Snapshots ableiten.
2. `cause_seq`-Stack einführen (Abschnitt 6).
3. Hooks für „Warum nicht“ (`canUse`, `canAddBuff`) und für `lockEnemy`.
4. Einen Kampf mit Summons und Revive aufnehmen, um `SUMMON_*` und `PLAYER_REVIVE` zu verifizieren.
5. Danach Kennzahlen je Kampf (Battle Summary) als JSON neben `events.jsonl`.

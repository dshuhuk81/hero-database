# Level Suppression: Global vs. chinesische Originalversion

**Datum:** 2026-06-12  
**Ziel:** Pruefen, ob das in der globalen Version gefundene Level-Suppression-System auch in der chinesischen Originalversion existiert.

---

## Kurzfazit

Ja. Es gibt einen belastbaren Beweis, dass die chinesische Originalversion ebenfalls ein Level-Suppression-System besitzt.

Die chinesische Version enthaelt dieselbe zentrale Konfiguration `lv_pressing.json`, aktiviert sie in denselben Battle-Modi und fuehrt zusaetzlich eine sichtbare Kampf-/UI-Markierung fuer `combat_repress` bzw. `战力压制` mit.

Vereinfacht gesagt:

- In der globalen Version wurde Level Suppression bereits im Kampfsystem und in der Konfiguration gefunden.
- In der chinesischen Originalversion wurde dieselbe Art von System live aus dem Emulator extrahiert.
- Damit ist Level Suppression kein rein globales Feature, sondern bereits in der chinesischen Originalversion vorhanden.

---

## Gegenueberstellung

| Frage | Globale Version | Chinesische Originalversion |
|---|---|---|
| Gibt es eine Level-Suppression-Konfiguration? | Ja, `lv_pressing.json` vorhanden. | Ja, `lv_pressing.json` live aus dem Emulator extrahiert. |
| Gibt es Modi, die diese Logik aktivieren? | Ja, `battle_mode.json` aktiviert `lv_pressing` fuer Battle-Modi `1` und `2`. | Ja, auch hier aktiviert `battle_mode.json` `lv_pressing` fuer Battle-Modi `1` und `2`. |
| Gibt es Hinweise im Kampfsystem? | Ja, der Kampfschaden wird durch einen Level-Suppression-Faktor angepasst. | Ja, die CN-Version besitzt die passende Konfiguration und zusaetzlich UI-/Protokollfelder fuer `combat_repress`. |
| Ist das System spielintern sichtbar? | In der Analyse als Suppression-System erkennbar. | Ja, es gibt UI-Hinweise mit `战力压制`, sinngemaess "Kampfkraft-/Suppression". |
| Beweisstaerke | Stark, durch Code und Konfigurationsdaten. | Sehr stark, weil die Daten direkt aus einem laufenden CN-Emulator extrahiert wurden. |

---

## Was wurde in der chinesischen Version gefunden?

Die Live-Extraktion aus dem Emulator wurde fuer das chinesische Paket `com.tencent.tmgp.seayoo.zero` durchgefuehrt.

Extraktionskontext:

- Paket: `com.tencent.tmgp.seayoo.zero`
- Version: `1.0.11 (87890)`
- Patch-Version: `91393`
- Extraktionsordner: `live_extractions/20260612_081859`
- Die extrahierten Daten enthalten chinesische Hero-Namen, wodurch der CN-Kontext bestaetigt ist.

Wichtige Funde:

| Fund | Bedeutung |
|---|---|
| `client/config/battle/lv_pressing.json` | Enthalt die Level-Suppression-Tabelle. |
| `client/config/battle/battle_mode.json` | Legt fest, in welchen Battle-Modi Level Suppression aktiv ist. |
| `UIFightDefault.lua` mit `战力压制` | Die Kampf-UI kennt einen sichtbaren Suppression-Zustand. |
| `UIFormationDefault.lua` mit `OverstepBattleCombat` | Bereits in der Formation kann ein Suppression-/Overstep-Zustand angezeigt werden. |
| `code-zero.proto` mit `combat_repress` | Der Suppression-Zustand ist auch in den Kampfdaten vorgesehen. |

---

## Was macht `lv_pressing.json`?

Die Datei beschreibt, wie stark der Levelunterschied im Kampf wirken kann.

Einfach formuliert:

- Bei kleinen Levelunterschieden passiert zunaechst nichts.
- Ab einem hoeheren Levelunterschied greifen Werte wie `reduce_damage` und `increase_damage`.
- Ein niedrigerer Angreifer macht dann weniger Schaden.
- Ein hoeherer Gegner kann mehr Schaden verursachen.

Beispiele aus der chinesischen Version:

| Leveldifferenz | Eigener normaler Schaden | Gegner-Schaden | Anti-Control-Bonus |
|---:|---:|---:|---:|
| 1 bis 20 | keine Reduktion | kein Bonus | kein Bonus |
| 21 | -1 Prozent | +1 Prozent | +1 Prozent |
| 30 | -10 Prozent | +5 Prozent | +5 Prozent |
| 50 | -30 Prozent | +30 Prozent | +30 Prozent |
| 70 | -50 Prozent | +70 Prozent | +50 Prozent |
| 90 | -70 Prozent | +90 Prozent | +50 Prozent |
| 100+ | -80 Prozent | +100 Prozent | +50 Prozent |

Das passt inhaltlich zu dem in der globalen Version gefundenen System.

---

## Wichtigster Vergleichspunkt

Der entscheidende Punkt ist nicht nur, dass irgendwo der Begriff "Suppression" auftaucht.

Entscheidend ist die Kombination aus drei Dingen:

1. Es gibt eine Level-Suppression-Tabelle.
2. Es gibt Battle-Modi, die diese Tabelle aktivieren.
3. Es gibt Kampf-/UI-Daten, die einen aktiven Suppression-Zustand transportieren oder anzeigen.

Diese Kombination existiert in der chinesischen Originalversion.

---

## Unterschied zur globalen Analyse

Die globale Analyse zeigte besonders deutlich die eigentliche Schadenslogik: Der finale Schaden wird mit einem Level-Suppression-Faktor multipliziert.

Die chinesische Live-Extraktion zeigt vor allem:

- Die gleiche Art von Konfiguration ist vorhanden.
- Die gleichen Battle-Modi aktivieren `lv_pressing`.
- Die UI und Kampfdaten kennen `combat_repress` / `战力压制`.

Beim normalen Level-Suppression-System wurde keine relevante Abweichung gefunden:

- Normaler Schaden niedrigerer Helden gegen hoeherstufige Gegner wird weiterhin durch `reduce_damage` reduziert.
- Schaden hoeherstufiger Gegner gegen niedrigere eigene Helden wird weiterhin durch `increase_damage` verstaerkt.
- Diese Kernlogik ist damit in der globalen und in der chinesischen Version vorhanden.

Der vollstaendige Tabellenvergleich ueber alle 200 Leveldifferenzen zeigt:

| Tabellenfeld | Bedeutung | Unterschied CN vs. Global/vorherig |
|---|---|---:|
| `reduce_damage` | Reduktion des normalen Schadens bei Levelnachteil | 0 von 200 Zeilen |
| `increase_damage` | Bonus fuer hoeherstufige Gegner gegen niedrigere eigene Helden | 0 von 200 Zeilen |
| `increase_antiCtrlRotio` | zusaetzlicher Anti-Control-Wert fuer hoeherstufige Gegner | 0 von 200 Zeilen |
| `real_reduce_damage` | zusaetzliche Reduktion fuer echten Schaden / True Damage | 190 von 200 Zeilen |

Auch die Aktivierung ist gleich: In beiden verglichenen Tabellen ist `lv_pressing` nur fuer die Battle-Modi `1` und `2` aktiv.

Der gefundene Unterschied betrifft nur einen Zusatzfall: echten Schaden bzw. True Damage.

- In der globalen bzw. vorherigen Konfiguration ist `real_reduce_damage` deutlich befuellt.
- In der frisch extrahierten chinesischen Konfiguration ist `real_reduce_damage` in den geprueften Reihen `0`.
- Das bedeutet nach aktuellem Codeverstaendnis: Die globale bzw. vorherige Konfiguration reduziert True Damage bei Levelnachteil zusaetzlich, die frisch extrahierte chinesische Konfiguration offenbar nicht.

Fuer Spieler bedeutet das:

| Schadensart | Wirkung der Abweichung |
|---|---|
| Normaler Schaden | Keine erkannte Abweichung im Kernsystem. Beide Versionen nutzen `reduce_damage` und `increase_damage`. |
| Echter Schaden / True Damage | Hier liegt die eigentliche Abweichung: Global/vorherig reduziert True Damage zusaetzlich, die frisch extrahierte CN-Version offenbar nicht. |

Beispielhaft:

| Leveldifferenz | Vorherige/globale `real_reduce_damage` | Frische CN `real_reduce_damage` | Bedeutung |
|---:|---:|---:|---|
| 30 | 20 Prozent | 0 Prozent | True Damage waere in CN nicht reduziert. |
| 50 | 40 Prozent | 0 Prozent | True Damage waere in CN deutlich staerker. |
| 100+ | 90 Prozent | 0 Prozent | Sehr grosser Unterschied fuer True-Damage-Faehigkeiten. |

Das aendert nicht das Hauptfazit. Die normale Level Suppression existiert in beiden Versionen. Die Abweichung ist enger gefasst: In der globalen bzw. vorherigen Konfiguration gibt es zusaetzlich eine True-Damage-Suppression, waehrend diese in der frisch extrahierten chinesischen Konfiguration offenbar nicht aktiv ist.

---

## Belegstellen

Globale Version:

- Kampflogik initialisiert Level Suppression: [Scene_Model.lua](/Users/daschultheiss/android/game_extracted/region_754c000000/Battle/Sce/Scene_Model.lua:79)
- Kampflogik laedt `lv_pressing`: [DamageUtil.lua](/Users/daschultheiss/android/game_extracted/region_754c000000/Battle/Ply/DamageUtil.lua:23)
- Finaler Schaden wird angepasst: [DamageUtil.lua](/Users/daschultheiss/android/game_extracted/region_754c000000/Battle/Ply/DamageUtil.lua:458)

Chinesische Originalversion:

- Live-Extraktionsreport: [DISCOVERY_REPORT.md](/Users/daschultheiss/android/live_extractions/20260612_081859/DISCOVERY_REPORT.md:1)
- Level-Suppression-Tabelle: [lv_pressing.json](/Users/daschultheiss/android/live_extractions/20260612_081859/unpacked/region_03/client/config/battle/lv_pressing.json:1)
- Battle-Modi mit `lv_pressing`: [battle_mode.json](/Users/daschultheiss/android/live_extractions/20260612_081859/unpacked/region_03/client/config/battle/battle_mode.json:1)
- Kampf-UI mit `战力压制`: [UIFightDefault.lua](/Users/daschultheiss/android/live_extractions/20260612_081859/unpacked/region_03/New/Battle/Fight/UIFightDefault.lua:43)
- Formation-UI mit `OverstepBattleCombat`: [UIFormationDefault.lua](/Users/daschultheiss/android/live_extractions/20260612_081859/unpacked/region_03/New/Battle/Formation/UIFormationDefault.lua:297)
- Kampfdaten mit `combat_repress`: [code-zero.proto](/Users/daschultheiss/android/live_extractions/20260612_081859/unpacked/region_03/client/proto/code-zero.proto:536)

---

## Endbewertung

**Beweisstatus:** Bestaetigt.

Die chinesische Originalversion besitzt nachweislich ein Level-Suppression-System. Der Nachweis basiert nicht nur auf Dateinamen oder Vermutungen, sondern auf einer live extrahierten CN-Konfiguration, aktivierenden Battle-Modi und sichtbaren Kampf-/UI-Feldern fuer Suppression.

Damit ist die Annahme widerlegt, dass Level Suppression nur in der globalen Version existiert.

---

## Live-Nachmessung mit Audhumla (05.08.2026)

Der Unterschied bei `real_reduce_damage` wurde inzwischen mit derselben Heldin
und demselben Frida-Messpfad in beiden Clients im laufenden Kampagnenkampf
bestaetigt.

| Client | Normaler Level-Koeffizient | True-Damage-Koeffizient | True-Anteil am erfassten Schaden |
|---|---:|---:|---:|
| Global, Odyssey 45-39 | Levelnachteil aktiv | stark reduziert; final etwa 22% des Eingabewerts | 8,41% |
| China, Kampagne | `666`-`676` von `1024` | **`1024` von `1024` (100%)** | 47,13% |

Damit ist auch live bewiesen, dass im chinesischen Kampagnenkampf die normale
Level Suppression aktiv war, waehrend True Damage gleichzeitig vollstaendig
vom zusaetzlichen Level-Abzug ausgenommen blieb. Die beiden Tests hatten nicht
denselben Levelabstand; deshalb sind die Prozentanteile kein perfekt
kontrollierter Schadensvergleich. Die direkt gemessenen Koeffizienten belegen
die unterschiedliche True-Damage-Behandlung dennoch eindeutig.

Rohdaten: `fights/audhumla_cn_campaign.log` und
`fights/audhumla_grim_surge_unsuppressed.log`.

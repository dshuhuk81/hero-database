# Assessment: meret-guide.md vs. tower.astro

## Kurzurteil

Der bestehende Guide in `meret-guide.md` ist inhaltlich solide, aber er hat drei
Probleme: (1) ein faktischer Fehler bei der Fraktion, (2) er liest sich wie ein
internes Analyse-Memo, nicht wie ein Spielerguide, (3) die Tower-spezifischen
Informationen aus `tower.astro` fehlen vollstaendig.

Der Guide braucht eine Ueberarbeitung, ist aber keine Neuerstellung.

---

## Faktischer Fehler

**Fraktion: Guide sagt "Stars (Sternenallianz)", JSON sagt "Diamonds".**

In `meret-guide.md` steht: "Faction: Stars (星芒阵营)". In `meret.json` ist
`"faction": "Diamonds"` gesetzt. In `tower.astro` ist Meret explizit als
Diamonds-Heldin gefuehrt (Diamonds-Sektion, Diamonds-Relic-Tabelle, Diamonds-
Varianten-Karten). Das muss korrigiert werden.

---

## Was der Tower-Guide zu Meret sagt (nicht im aktuellen Guide)

| Thema | tower.astro |
|---|---|
| Rolle im Team | "Tempo und Setup" - kontrolliert den Support-Fluss |
| Fraktion | Diamonds Kern-Support |
| Relic | 1-10 frueh, 30 fuer High-End (Prioritaet 2) |
| Ersatz | Athena als schwaechere Alternative moeglich |
| Floor 400+ | Team ohne Meret (Athena stattdessen) funktioniert bis 420-440 |
| Floor 440+ | Meret kommt ins Lineup, Athena bleibt als Sicherheit |
| Floor 500+ | Meret ist Pflicht, nicht optional |
| Fazit | "Weaker substitute available" - Meret hat keine echte Ersetzung |

Diese konkreten Floor-Angaben und die Tower-Progression fehlen im aktuellen Guide
komplett. Fuer Spieler, die wissen wollen "wann brauche ich Meret?", ist das die
wichtigste Information.

---

## Was der aktuelle Guide gut macht

- Skill-by-Skill Erklaerung mit Upgrade-Stufen korrekt
- Note-Zuteilungslogik exakt beschrieben (HP-hoechster = Sonne, ATK-hoechster = Mond, selbst = Stern)
- Relic-Breakpoints konsistent mit tower.astro (Lv1 = groesster Sprung)
- Die Warnung zur "sauberen Stat-Hierarchie" ist wichtig und fehlt ueberall sonst
- Stae rken / Schwaechen klar getrennt
- Teamkomp-Empfehlung (Heracles, Bastet, Set, Phoenix) deckt sich 1:1 mit tower.astro

---

## Was der aktuelle Guide weglassen oder aendern sollte

1. **Den Analyse-Memo-Ton.** Formulierungen wie "Spieler-Inferenz, aber direkt aus
   dem Skilltext ableitbar" oder "Confidence: Mittel" sind fuer ein internes
   Dokument. Fuer einen Spieler-Guide braucht es direkte Aussagen.

2. **Chinesische Quellen-Referenzen.** Die `[m.youxibao.com]`-Links sind fuer
   Spieler irrelevant und erhoehen nicht den Inhaltswert.

3. **Die PvE/PvP-Bewertung ohne Grundlage.** Der Guide sagt selbst "Mangels
   belastbarer CN-Tierlists - vorsichtig einordnen". Wenn keine Daten da sind,
   besser weglassen oder klar als vorlaeufig markieren. `meret.json` hat alle
   Ratings auf leer - das ist ehrlicher.

4. **Doppelter Passiv-Name.** Im Guide taucht "Passiv" zweimal auf
   ("Passiv - 帷幕拒落" und "Passiv - 万象和鸣"). Ein Skill ist tatsaechlich eine
   aktive Faehigkeit (Desert Sand Dance / Golden Step). Das ist bereits in
   `meret.json` korrekt - im Guide muessen die Skill-Typen angeglichen werden.

---

## Empfehlung fuer einen vollumfaenglichen Guide

Ein guter Meret-Guide sollte diese Abschnitte enthalten:

### 1. Identitaet
- Fraktion: Diamonds
- Klasse: Support
- Rolle: Tempo-Enabler + Anti-Burst-Schutz

### 2. Kern-Mechanik: Das Noten-System
- Sonne (Sun Note) -> hoechstes HP -> Schild + mehr Max-HP
- Mond (Moon Note) -> hoechster ATK -> ATK-Boost, ab Lv3 auch Krit
- Stern (Star Note) -> Meret selbst -> Energie-Regeneration
- Schadensteilung zwischen Noten-Traegern
- Notfall-Heilung und Death-Save ueber Relikt

### 3. Skills mit Upgrade-Wert
- Welche Upgrades sind wichtig (Lv3 Mond = Krit, Lv4 Passiv = kein Limit)
- Welche sind Komfort-Upgrades

### 4. Relic-Guide
- Lv1: Tod-Immunisierung fuer Noten-Traeger = groesster Sprung
- Lv10: Basisschutz stabil
- Lv30: Volle Schutzstaerke, nur relevant bei hohem Team-Investment

### 5. Playstyle-Warnung
- Tank muss zwingend den hoechsten HP-Wert haben
- Main-Carry muss zwingend den hoechsten ATK-Wert haben
- Falsches Noten-Ziel = halber Kit-Wert

### 6. Tower-Progression (aus tower.astro)
- Boden 400-440: Athena stattdessen spielbar
- Boden 440-470: Meret ins Lineup, Athena als zweite Unterstuetzung
- Boden 500+: Meret Pflicht, Heracles Relic 30 Pflicht

### 7. Team-Kompositionen
- Kern: Heracles + Meret + Bastet + Phoenix + Set
- Fruehes Ersatz-Team: Athena statt Meret

### 8. Investment-Fazit
- F2P: Base + Relic 1-10 als Einstieg
- Standard: Relic 30 fuer Endgame
- Nur sinnvoll, wenn Heracles bereits investiert ist

---

## Zusammenfassung

Der aktuelle Guide ist eine gute Recherche-Grundlage, aber kein fertiger
Spieler-Guide. Mit Korrektatur des Fraktionsfehlers, Einbau der Tower-Daten
und einem klareren Ton waere er sehr stark. Die inhaltliche Substanz - besonders
die Noten-Erklaerung und die Stat-Hierarchie-Warnung - ist gut und sollte
behalten werden.

Der tower.astro liefert den fehlenden Kontext: Wann ist Meret Pflicht, wann ist
sie optional, und was passiert, wenn man sie nicht hat. Das ist die
praktisch relevanteste Information fuer den durchschnittlichen Spieler.

### Overview

Hephaestus is a support who becomes stronger over time. Instead of providing instant value like healing or energy, he needs multiple Ultimate casts to activate his full kit.

Once all devices are active, he creates a short but powerful window where:
- your team deals significantly more damage
- enemies deal less damage
- key targets can be locked down

This makes him very strong in longer fights, but weaker in fast battles.

---

### Strengths

- Strong damage boost once fully set up
- Reduces enemy damage and attack speed
- Can lock down the most dangerous enemy

---

### Weaknesses

- Needs time (multiple Ultimates) to become effective
- Cannot move after activating his Relic
- Struggles in short fights and against burst teams

---

### When to use him

Use Hephaestus when:
- fights last longer (PvE, tower, multi-wave content)
- you can support his energy generation (e.g. Caishen)

Avoid him when:
- fights are very fast (PvP burst comps)
- you need immediate healing or revive

## Analytics
Gut, ich habe alle Daten. Jetzt führe ich eine gründliche Analyse durch — kein Code nötig, alles aus den JSON-Dateien ableitbar.

---

## Hephaestus — Tiefenanalyse

### Was macht ihn einzigartig?

Hephaestus ist der einzige **Zone-Control-Support** im Spiel. Während Caishen, Mengpo und Yuelao reaktive oder gezielte Unterstützung leisten (Energie geben, heilen, reviven), **gestaltet Hephaestus aktiv das Schlachtfeld** durch drei feste Geräte, die er mit jedem Ultimate aktiviert. Das ist sein Kernprinzip: Je mehr Geräte aktiv, desto stärker werden alle seine Fähigkeiten.

**Das Ramp-up-Problem:** Er braucht 3 Ultimate-Casts, bevor sein volles Kit greift. In kurzen Kämpfen (PvP) ist das kritisch, in langen Kämpfen (Boss) ein relativer Vorteil.

---

### Skill-Breakdown im Vergleich

| Skill | Hephaestus | Caishen | Mengpo | Yuelao | Cancer |
|---|---|---|---|---|---|
| **Energie für Team** | Nein (nur selbst via S4) | ✅ Kern-Identität | S4: bedingt | S3: 150 burst | S3: bedingt |
| **Heilung** | S3: 150% ATK (single) | S4: 25% MaxHP trigger | S2: 200% konditionell | S1: 140–160% x6–8 | S2: 250–300% |
| **Debuff/CC** | S2: Restrain + Armor/MRes-Red | – | S3: Push | – | – |
| **Damage Boost** | Fusion: +30% DMG, +50% AtkSpd | S2: +15% ATK (lokal) | S4: +15–30% ATK | S2–S3: +15–25% ATK | S2: +15% ATK |
| **Defensiv-Utility** | S3: bis zu 25% DMG-Red (3 Geräte) | S3: Invulnerability | Relic: Untargetable | Relic: DMG-Share | S3: Super Armor |
| **Revive** | – | – | ✅ Kern-Identität | – | – |

**Kernbeobachtung:** Hephaestus ist der einzige Support, der **feindliches ATK, ATK-SPD und DMG gleichzeitig debufft** — das ist eine ganz andere Rolle als "Heiler" oder "Energie-Battery".

---

### Detaillierte Skill-Bewertung

**Ultimate Domain (S1) — Das Herzstück**

Das Passive ist extrem stark: Drei Geräte auf dem Feld bedeuten von Anfang an Einfluss auf Positionierung. Das Active ist aber **Energy-ineffizient in frühen Phasen** — er kostet Energy, aktiviert aber nur 1 Gerät. Das Fusion-Effekt-Fenster ist nur 5 Sekunden breit, was bedeutet:
- Timing ist entscheidend
- In PvP: 5 Sekunden können einen Kampf entscheiden, aber du musst erst 3 Ults casten
- In PvE/Boss: Der Fusion-Effekt kann wiederholt ausgelöst werden (sehr stark)

**Weakness Analysis (S2) — Unterschätzter Carry-Killer**

Restrain auf den höchst-schadenden Feind ist eine **Top-Tier CC-Fähigkeit**. Mit 3 aktiven Geräten: Basis 2s + 1.5s = 3.5s Restrain. Das ist deutlich länger als die meisten CC-Effekte. Dazu: -20% Armor und M-RES → kombiniert mit einem magischen Carry = massive Schadensamplifizierung. Kein anderer der verglichenen Supports hat eine direkte offensive CC-Option.

**Force Shield (S3) — Solide, aber Single-Target**

150% ATK-Heilung auf das schwächste Ally + DMG-Reduktion. Mit 3 Geräten: 10% + 15% = 25% DMG-Red. Das ist gut, aber Mengpo und Yuelao haben breitere Heilung. Der Wert liegt vor allem in der kombinierten Wirkung mit dem Zone-Passiv.

**Origin Resonance (S4) — Interner Beschleuniger**

Energie-Regen-Boost für sich selbst. Das ist notwendig, weil sein Kernmechanismus von schnellen Ultimate-Casts abhängt. S4 Level 4 (Initial Energy) ist ein wichtiges Upgrade — es beschleunigt den ersten Ult.

**Relic "Undying Forge" — Doppelschneidiges Schwert**

Das ist die interessanteste Designentscheidung. Er bekommt:
- +30% DMG-Reduktion (deutlich mehr mit Relic Lv. 4)
- Unbegrenzte Angreifsreichweite
- Schnellere Cooldowns (Lv. 2)
- Geringere Energy-Kosten für Ultimate (Lv. 3)

Aber er **kann sich nicht bewegen**. In einem Spiel wo Positionierung zentral ist, ist das ein erheblicher Nachteil in PvP: Feinde können seine Forge-Position umgehen, er kann nicht auf Bedrohungen reagieren. In PvE/Boss hingegen ist stationäre Positionierung oft irrelevant.

---

### Synergien — wer harmoniert mit ihm?

**Ideale Carry-Paare (profitieren von Fusion-Effekt):**
- **Jingwei / Isis / Zeus** — alle profitieren massiv von +30% DMG und +50% AtkSpd im 5-Sekunden-Fenster
- Magische Carries (Mage/Arcane) profitieren doppelt: Fusion-Buff + Weakness Analysis debufft Armor/M-RES des Ziels gleichzeitig

**Support-Paarungen:**
- **Caishen** ist fast immer sinnvoll daneben: Caishen liefert Energie, damit Hephaestus schneller seine 3 Ults casten kann → Fusion-Ramp beschleunigt sich erheblich
- **Mengpo**: Revive kompensiert die Schwäche, dass Hephaestus keine Wiederbelebung bietet
- **Cancer**: Super Armor auf Frontliner kombiniert gut mit Hephaestus Zone-Schutz für Backline

**Optimal-Team (Theorie):**

| Position | Held | Rolle |
|---|---|---|
| Front-Center | Tank | Absorption |
| Front-Left/Right | Warrior | Druck |
| Back-Left | Hephaestus | Zone-Control, Buff, CC |
| Back-Center | Caishen | Energie-Battery |
| Back-Right | Magischer Carry | Hauptschadens-Quelle |

Caishen + Hephaestus als Dual-Support ist die natürlichste Synergiekombination: Einer gibt Energie, der andere baut Zone-Kontrolle auf.

---

### Game-Mode-Bewertung

**PvP — Rating: A (solide, aber bedingt)**

Probleme:
- Braucht 3 Ults zum vollen Entfaltung → 30-Sekunden-Kämpfe sind oft vorbei bevor Fusion greift
- Immobilität macht ihn anfällig für Burst-Assassinen die seine Position kennen
- Kein Revive, kein Invulnerability

Stärken:
- Weakness Analysis Restrain auf den gefährlichsten Feind ist im PvP stark
- Wenn Fusion doch feuert: 5 Sekunden +30%/+50% können entscheidend sein
- -20% feindlicher DMG auf alle ist eine der stärksten defensiven Auren überhaupt

**Counter im PvP:**
- Assassine der seine stationäre Forge-Position nutzt → er kann nicht ausweichen
- Schnelle Burst-Comps die Fusion nie abbrennen lassen
- Heroes mit Control-Immunity oder hoher Effect-RES machen Weakness Analysis nutzlos

**PvE / Campaign — Rating: A**

Stärken:
- Stationäre Position ist in PvE irrelevant
- Fusion kann wiederholt ausgelöst werden → Sustained Buff-Uptime
- Zone-Slow (-20% ATK-SPD) verlangsamt Gegner nachhaltig
- Gute Überlebensfähigkeit durch Relic

**Boss-Modi:**
Hier ist er am schlechtesten. `baseAttackRate: 0` und `bossUltimatesPer90s: 0` in den Daten bestätigen: Noch keine Boss-Daten erfasst, aber strukturell ist er schwach für Boss-DPS-Unterstützung weil:
- Kein direkter Energie-Boost für den Carry
- Keine Heilung die mit der Boss-Schadensrate skaliert
- Seine Zone-Effekte hängen von Feinden in Gerät-Range — Bosse bewegen sich oft nicht in die Geräte hinein

**Forgotten Labyrinth / Grim Surge / Torrent Rift:**
Ratings sind leer in der JSON — noch nicht bewertet. Strukturell würde ich erwarten:
- Grim Surge (viele Feinde): stark — Zone-Control trifft mehrere
- Forgotten Labyrinth: mittel — kurze Kämpfe limitieren Ramp-up

---

### Build-Empfehlung

**Relic:** Empfehlung Level 30 (aus JSON). Das ist korrekt und wichtig — Lv. 3 reduziert Energy-Kosten für Ultimate, was direkt den Fusion-Ramp beschleunigt. Lv. 4 erhöht DMG-Reduktion weiter. Ohne Relic ist er deutlich langsamer.

**Virtues (aus Projekt-Daten):**
- **Sacrifice 4-Piece**: +30% MaxHP ohne HP-Verlust — mit seinen 2.1M HP werden das absurde Werte. Das macht ihn in der Forge extrem schwer zu töten.
- **Stoic 2-Piece + Defiance 2-Piece**: weitere +10%/+15% HP

Das Virtue-Setup ist komplett auf **maximale Überlebensfähigkeit** ausgelegt — logisch, da er stationär ist und nicht ausweichen kann. Seine einzige Defensive ist HP und die Relic-DMG-Reduktion.

**Skill-Priorität:**
1. S4 auf Lv. 4 (Initial Energy → sofortiger erster Ult früher)
2. S1 auf Lv. 4 (Fusion-Verstärkung)
3. S2 auf Lv. 4 (Restrain-Dauer + Armor-Reduction)
4. S3 auf Lv. 4 (Heilung)

---

### Fazit: Einordnung im Support-Tier

| Support | Kernwert | Ramp-up | Mobilität | Boss | PvP |
|---|---|---|---|---|---|
| **Caishen** | Energie-Battery | sofort | normal | ✅ stark | SS |
| **Mengpo** | Revive | mittel | normal | mittel | S |
| **Yuelao** | ATK-Share + Heilung | sofort | normal | mittel | S |
| **Cancer** | Super Armor + Energie | sofort | normal | schwach | S |
| **Hephaestus** | Zone-Control + Debuff | langsam (3 Ults) | **keine** | ❌ unklar | A |

**Kurzurteil:** Hephaestus ist ein **situativer Spezialist**, kein universeller T0-Support. Er ist stärker als sein A-Rating vermuten lässt, wenn er Zeit zum Aufbauen hat und der Feind in seine Zonen läuft. In langen PvE-Modi mit vielen Feinden ist er überdurchschnittlich. In PvP und Boss-Kämpfen ist er klar hinter Caishen und Mengpo einzuordnen. Sein bestes Argument ist die **einzigartige Kombination aus Debuff + Buff + CC** — keine anderer Support kann das gleichzeitig. Das macht ihn zum idealen dritten Support in einer etablierten Dual-Core (Caishen + Carry) Komposition.


### Guide Optimierungen
Ich optimiere dir konkret deinen bestehenden Hephaestus-Guide, ohne Struktur zu ändern. Nur:

kürzere Sätze
klarere Aussagen
weniger „verschachtelte Theorie“
mehr spielerorientierte Klarheit
🔧 1) OVERVIEW – kompakter & klarer
❌ Problem aktuell:
zu lang
zu viele Konzepte gleichzeitig
liest sich wie Doku, nicht wie Guide
✅ Ersetzen durch:
<p>
Hephaestus is a <strong>Legendary Support</strong> from the <strong>Hearts faction</strong> built around a unique device system. He places <span class="highlight">3 mechanical devices</span> on the battlefield and activates them one by one with each Ultimate.
</p>

<p>
Each active device strengthens his abilities. Once all 3 are active, they merge into a <strong>Fusion effect</strong> that boosts your team's damage and reduces enemy damage at the same time.
</p>

<p>
He does not provide instant value like healing or energy. Instead, he becomes stronger over time. This makes him powerful in long fights, but weaker in fast battles.
</p>

<p>
His <strong>Forge</strong> locks him into position but gives him damage reduction and unlimited range. Where you place him at the start of the fight matters.
</p>

👉 Gleicher Inhalt — aber:

50% schneller erfassbar
deutlich klarer
🔧 2) DEVICE SYSTEM – entschlacken (wichtig)
❌ Problem:
aktuell zu „verschachtelt“
schwer schnell zu verstehen
✅ Ersetzen:
<ul class="mechanic-list">
  <li>At battle start, <strong>3 inactive devices</strong> are placed on the field.</li>
  <li>Each Ultimate activates one device.</li>
  <li>Active devices create zones: allies regenerate HP and Energy, enemies lose ATK Power and ATK Speed.</li>
  <li>More active devices = stronger effects on all abilities.</li>
  <li>With 3 devices active, they merge into a <strong>Fusion effect</strong> that buffs your team and weakens all enemies.</li>
  <li>After that, every Ultimate can trigger Fusion again.</li>
</ul>

👉 Spieler versteht sofort:

„Stack → 3 → Boom“
🔧 3) RATINGS – konsistent + klar

(inkl. deinem Boss-Fix)

<div class="rating-card">
  <div class="rating-mode">Boss Fights</div>
  <div class="rating-cell"><span class="rating-badge rating-b">B</span></div>
  <div class="rating-desc">
    Usable, but not ideal. Other supports provide more consistent damage boosts and faster impact.
  </div>
</div>
🔧 4) STRENGTHS – kürzer, härter
❌ aktuell:
zu lang
zu „theoretisch“
✅ ersetzen:
<ul class="sw-list">
  <li>Strong team-wide damage boost after setup</li>
  <li>Reduces enemy damage and attack speed</li>
  <li>Can lock down the highest damage enemy</li>
  <li>Scales well in long fights</li>
  <li>Hard to displace due to Forge mechanic</li>
</ul>
🔧 5) WEAKNESSES – wichtiger als Strengths
<ul class="sw-list">
  <li>Needs time to become effective (3 Ultimate casts)</li>
  <li>Weak in fast fights and burst-heavy PvP</li>
  <li>Cannot reposition after the fight starts</li>
  <li>Depends heavily on Relic Level 3</li>
</ul>

✅ 1) FIX: „Boss — Not Recommended“ (wichtig)

Du hast recht:
Die Überschrift ist widersprüchlich (Comp vs. Anti-Comp).

🔧 Lösung (minimal-invasiv, korrekt)

👉 Ersetze nur das Label:

{
  label: "Boss — Alternative Setup",

👉 UND passe den Reason leicht an:

reason: "This is an example setup if you still want to use Hephaestus in boss fights. However, he is generally weaker here compared to other supports because his setup takes time and his effects depend on positioning.",

👉 Notes ergänzen (klar, aber nicht in der Überschrift):

notes: [
  "Hephaestus is generally not optimal for boss fights compared to other supports.",
  "He provides no direct energy boost to the main damage dealer.",
  "His damage window is short and harder to align with boss damage cycles.",
  "Use this setup only if you lack better support options."
]

✅ Ergebnis:

Überschrift bleibt logisch
Spieler wird trotzdem klar gewarnt
keine UX-Verwirrung mehr
✅ 2) WICHTIGER INHALTSFIX (dein Guide ist hier inkonsistent)

Ich muss dich hier kurz challengen:

👉 Dein Guide sagt aktuell:

Boss = A+ (sehr stark)

👉 Deine Analyse + neue Comps sagen:

Boss = schwach / nicht optimal

Das widerspricht sich direkt.

❗ Das ist nicht nur kosmetisch – das ist kritisch für Spieler

Wenn du das so lässt:

Spieler bauen ihn für Boss
merken: funktioniert schlechter
verlieren Vertrauen in deine Guides
✅ Sauberer Fix (empfohlen)
🔧 Rating ändern:
<div class="rating-mode">Boss Fights</div>
<div class="rating-cell"><span class="rating-badge rating-b">B</span></div>
<div class="rating-desc">
  Usable but not optimal. Requires setup time and positioning, while other supports provide more consistent damage boosts for boss fights.
</div>
💡 Warum das korrekt ist (evidence-based)

Aus deiner eigenen Analyse:

kein Energy Support → ❌ DPS scaling
Zonen abhängig → ❌ Boss bewegt sich kaum / irrelevant
kurze Buff Windows → ❌ schlechter als konstante Buffs

➡️ Ergebnis:
👉 nicht trash, aber klar unter Caishen / Mengpo

✅ 3) Mini-Fix (High Value, kein Strukturbruch)
In Synergy fehlt aktuell der wichtigste Punkt:

👉 Caishen fehlt komplett

Das ist ein echter inhaltlicher Gap.

🔧 Ergänzen:
<div class="synergy-entry">
  <div class="synergy-hero-name">Caishen</div>
  <p class="synergy-body">
    The most important partner for Hephaestus. Caishen provides team-wide energy, allowing Hephaestus to use his Ultimate more often. This directly speeds up device activation and helps reach the Fusion state much earlier in the fight.
  </p>
</div>


----- old:-----
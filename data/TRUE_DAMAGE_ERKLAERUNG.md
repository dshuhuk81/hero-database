# True Damage im globalen Client — wie es wirklich funktioniert

**Stand:** 22.07.2026 · Grundlage: Messungen im laufenden Spiel, globaler und chinesischer Client im direkten Vergleich

---

## Kurzfassung

True Damage ist im globalen Client vorhanden und aktiv. Es ist nicht abgeschaltet.

Es fühlt sich für Spieler nur deshalb wirkungslos an, weil es durch mehrere Schichten gefiltert wird — allen voran durch einen Abzug, der bei Levelnachteil bis zu 90 Prozent des Schadens entfernt. Genau dieser Abzug existiert in der chinesischen Originalversion nicht.

Dazu kommt: Manche Helden, denen man True Damage zuschreibt, besitzen es in der spielbaren Fassung gar nicht.

---

## 1. Was True Damage üblicherweise verspricht

In den meisten Spielen bedeutet True Damage: Schaden, der jede Verteidigung ignoriert und ungefiltert ankommt. Rüstung, Resistenzen, Schadensreduktion — alles wirkungslos.

Diese Erwartung trifft auf den globalen Client **nicht** zu.

## 2. Was True Damage hier tatsächlich bedeutet

Im Spiel bedeutet True Damage lediglich: **die Verteidigungsrechnung wird übersprungen**. Nicht: alles wird übersprungen.

Der Schaden umgeht:

- Rüstung und Verteidigungswerte
- kritische Treffer
- Typ- und Fraktionsvorteile
- die üblichen prozentualen Schadensmodifikatoren

Der Schaden wird aber weiterhin beeinflusst von:

- **dem Levelunterschied zwischen Angreifer und Ziel** (der wichtigste Punkt, siehe unten)
- allgemeiner Schadensreduktion und Schadensverstärkung, die auf jede Schadensart wirkt
- Schilden, die ihn ganz normal absorbieren
- Unverwundbarkeit, die ihn vollständig blockiert
- Obergrenzen für Schadenswerte

True Damage ist hier also kein Freifahrtschein, sondern eine Abkürzung um genau eine Rechenstufe herum. Danach durchläuft es dieselben Filter wie jeder andere Schaden.

## 3. Der entscheidende Unterschied: der Level-Abzug

Das Spiel bestraft Kämpfe gegen höherstufige Gegner. Je größer der Levelrückstand, desto stärker wird der eigene Schaden gekürzt.

Für **normalen** Schaden gilt dieser Abzug in beiden Versionen — global wie chinesisch — in exakt gleicher Höhe.

Für **True Damage** gibt es einen zweiten, davon unabhängigen Abzug. Und hier liegt der zentrale Unterschied:

| Levelrückstand | True Damage global | True Damage chinesisch |
|---:|---:|---:|
| 30 Level | −20 % | kein Abzug |
| 50 Level | −40 % | kein Abzug |
| 70 Level | −60 % | kein Abzug |
| 90 Level | −80 % | kein Abzug |
| 100 Level und mehr | −90 % | kein Abzug |

Im globalen Client bleibt bei 100 Level Rückstand also ein Zehntel des True Damage übrig. In der chinesischen Version kommt er vollständig an.

Beide Versionen wurden hierfür im laufenden Spiel gemessen. Der Wert wurde zusätzlich an einem echten Treffer im Kampf überprüft: Ein Angriff mit rund 6 Milliarden True Damage kam bei 90 Level Rückstand mit rund 1,2 Milliarden an — exakt die vorhergesagten 20 Prozent.

## 4. Warum manche Helden gar kein True Damage haben

Ein zweiter, unabhängiger Grund für Verwirrung: True Damage hängt nicht am Helden als Figur, sondern an der konkreten Fassung dieser Figur.

Vom selben Charakter existieren teils mehrere Varianten. Die Spezialfassung kann eine Fähigkeit als True Damage ausführen, während die regulär spielbare Fassung dieselbe Fähigkeit als normalen Schaden ausführt. In den Spieldaten ist dieser Wechsel bei einzelnen Fähigkeiten sogar ausdrücklich vermerkt.

Ein zuvor missverstandener Fall ist Jormungandr. Ihre normalen Angriffe werden
tatsaechlich als normaler Schaden abgerechnet. Beim Tod beschwoert die
spielbare Heldin jedoch intern eine separate Leichen-/Racheeinheit mit dem
Runtime-Namen `H_YeMengJiaDeST`. Erst diese Einheit sammelt den Schaden waehrend
des Rachezustands und ruft beim Ablauf `hitRealDamage` auf. Eine Messung, die
nur nach der Ausgangseinheit `H_YeMengJiaDe` filtert, meldet deshalb
faelschlicherweise null True-Damage-Ereignisse. Es handelt sich nicht um eine
andere spielbare Heldenfassung, sondern um die intern beschworene zweite Phase
derselben Todespassive.

## 5. Warum der Eindruck entsteht, es gäbe kein True Damage

Drei Effekte überlagern sich:

1. **Der Level-Abzug** entfernt in fordernden Spielmodi, in denen Gegner deutlich höherstufig sind, bis zu 90 Prozent des True Damage. Genau dort, wo man ihn am dringendsten bräuchte, wirkt er am schwächsten.
2. **Die Restfilter** — allgemeine Schadensreduktion, Schilde, Obergrenzen — greifen danach zusätzlich.
3. **Die Heldenfassung** teilt bei manchen Figuren überhaupt keinen True Damage aus, unabhängig von allem anderen.

Das Ergebnis wirkt für Spieler identisch mit „das System existiert nicht". Tatsächlich existiert es, feuert messbar — und wird nur so stark reduziert, dass es kaum ins Gewicht fällt.

## 6. Einordnung

Zwei Aussagen sind sauber zu trennen:

- **„Es gibt kein True Damage im globalen Client."** — Falsch. Es wurde im laufenden Kampf beim Auslösen beobachtet und gemessen.
- **„True Damage kommt im globalen Client kaum an."** — Zutreffend, sobald ein spürbarer Levelrückstand besteht.

Der Unterschied zur chinesischen Version betrifft ausschließlich den True-Damage-Abzug. Beim normalen Schaden verhalten sich beide Versionen gleich. Es handelt sich also nicht um ein grundsätzlich anderes Kampfsystem, sondern um eine einzelne, gezielt abweichend eingestellte Stellschraube — mit erheblicher Wirkung auf alle Helden, deren Stärke auf True Damage beruht.

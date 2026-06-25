# Summon-Wahrscheinlichkeiten: Berechnung und Ergebnisse

Stand: 25. Juni 2026

Diese Zusammenfassung dokumentiert die Wahrscheinlichkeiten und Annahmen, die im Summon Calculator verwendet werden.

## 1. Angezeigte Basisraten

| Summon-Art | Epic gesamt | Wishlist | Celestial | Außerhalb der Wishlist |
| --- | ---: | ---: | ---: | ---: |
| Amity | 3,0 % | – | – | – |
| Standard | 5,0 % | 4,6 % | 0,2 % | 0,2 % |
| Suit | 7,8 % | 7,5 % | – | 0,3 % |

### Wahrscheinlichkeit für einen bestimmten Zielhelden

Standard verteilt die Wishlist-Rate auf 16 Plätze:

```text
4,6 % / 16 = 0,2875 % pro Pull
```

Suit verteilt die Wishlist-Rate auf vier Helden der passenden Fraktion:

```text
7,5 % / 4 = 1,875 % pro Pull
```

Mit aktivem Rate Up gelten die angegebenen Zielraten:

| Situation | Zielheld pro Pull |
| --- | ---: |
| Standard ohne Rate Up | 0,2875 % |
| Standard mit Rate Up | 2,0 % |
| Suit ohne Rate Up | 1,875 % |
| Suit mit Rate Up | 3,6 % |

Amity wird nicht für einen bestimmten Zielhelden berechnet. Bekannt ist nur die Chance von 3 % auf irgendeinen Epic-Helden.

## 2. Pity-Regeln

Pity wird in der Berechnung berücksichtigt:

- Standard garantiert spätestens beim 50. Pull einen Epic-Helden.
- Suit garantiert spätestens beim 20. Pull einen Epic-Helden.
- Ein natürlicher Epic vor dem Grenzwert setzt den Zähler der jeweiligen Summon-Art zurück.
- Standard und Suit besitzen getrennte Pity-Zähler.
- Pity wird nicht zwischen Summon-Arten übertragen.
- Die Berechnung startet bei beiden Summon-Arten mit einem Pity-Stand von null.

Der garantierte Epic stammt weiterhin aus dem normalen Epic-Pool. Wishlist und Rate Up verändern seine Verteilung nach denselben Regeln wie bei einem natürlichen Epic.

Die Chance, dass ein garantierter Epic der Zielheld ist, entspricht deshalb dem Anteil des Zielhelden am jeweiligen Epic-Pool:

| Situation | Zielheld-Anteil bei einem Epic |
| --- | ---: |
| Standard ohne Rate Up | 0,2875 % / 5 % = 5,75 % |
| Standard mit Rate Up | 2 % / 5 % = 40,00 % |
| Suit ohne Rate Up | 1,875 % / 7,8 % ≈ 24,04 % |
| Suit mit Rate Up | 3,6 % / 7,8 % ≈ 46,15 % |

Pity erhöht somit nicht den relativen Anteil des Zielhelden am Epic-Pool. Es erzeugt aber zusätzliche Epic-Ereignisse und damit zusätzliche Chancen auf den Zielhelden.

## 3. Berechnungsmethode

Eine einfache Binomialverteilung reicht wegen des zurücksetzenden Pity-Zählers nicht aus. Der Calculator verwendet deshalb eine Zustandsberechnung für jeden einzelnen Pull.

Ein Zustand enthält:

- den aktuellen Pity-Stand,
- die bisher gezogene Anzahl des Zielhelden,
- die Wahrscheinlichkeit, sich in diesem Zustand zu befinden.

Bei jedem Pull werden drei mögliche Übergänge berechnet:

1. Der Zielheld erscheint: Der Pity-Zähler wird zurückgesetzt.
2. Ein anderer Epic erscheint: Der Pity-Zähler wird ebenfalls zurückgesetzt.
3. Kein Epic erscheint: Der Pity-Zähler steigt um eins.

Am Hard-Pity-Grenzwert entfällt die dritte Möglichkeit, da dort ein Epic garantiert ist.

Standard und Suit werden separat simuliert. Anschließend werden ihre Verteilungen miteinander kombiniert. Erwartungswerte werden addiert; die Chance auf keine Zielkopie wird multipliziert:

```text
P(keine Zielkopie insgesamt)
= P(keine Zielkopie aus Standard)
× P(keine Zielkopie aus Suit)
```

```text
P(mindestens eine Zielkopie)
= 1 - P(keine Zielkopie insgesamt)
```

## 4. Ergebnisse für 100 Pulls

### Standard

| Situation | Erwartete Epics | Erwartete Zielkopien | Keine Zielkopie | Mindestens eine |
| --- | ---: | ---: | ---: | ---: |
| Ohne Rate Up | 5,28 | 0,30 | 73,66 % | 26,34 % |
| Mit Rate Up | 5,28 | 2,11 | 10,28 % | 89,72 % |

Standard ohne Rate Up bleibt für einen einzelnen Zielhelden sehr schwach. Trotz Pity erhalten knapp drei Viertel der Spieler in 100 Pulls keine Kopie dieses bestimmten Helden.

### Passende Suit

| Situation | Erwartete Epics | Erwartete Zielkopien | Keine Zielkopie | Mindestens eine |
| --- | ---: | ---: | ---: | ---: |
| Ohne Rate Up | 9,48 | 2,28 | 8,62 % | 91,38 % |
| Mit Rate Up | 9,48 | 4,38 | 0,57 % | 99,43 % |

Suit profitiert stark vom 20-Pull-Pity und dem kleineren Pool. Schon ohne Rate Up liegt die Chance auf mindestens eine Zielkopie nach 100 Pulls bei über 91 %.

## 5. Beispiel: 100 Standard und 100 Suit

### Ohne Rate Up

- Erwartete Epics insgesamt: **14,76**
- Erwartete Zielkopien: **2,58**
- Chance auf keine Zielkopie: **6,35 %**
- Chance auf mindestens eine Zielkopie: **93,65 %**

Verteilung der Zielkopien:

| Kopien | Wahrscheinlichkeit |
| ---: | ---: |
| 0 | 6,35 % |
| 1 | 18,84 % |
| 2 | 26,33 % |
| 3 | 23,19 % |
| 4 | 14,54 % |
| 5 | 6,96 % |
| 6 | 2,66 % |
| 7 oder mehr | 1,13 % |

### Mit Rate Up

- Erwartete Epics insgesamt: **14,76**
- Erwartete Zielkopien: **6,49**
- Chance auf keine Zielkopie: **0,06 %**
- Chance auf mindestens eine Zielkopie: **99,94 %**

Verteilung der Zielkopien:

| Kopien | Wahrscheinlichkeit |
| ---: | ---: |
| 0 | 0,06 % |
| 1 | 0,52 % |
| 2 | 2,19 % |
| 3 | 5,79 % |
| 4 | 10,86 % |
| 5 | 15,48 % |
| 6 | 17,55 % |
| 7 oder mehr | 47,54 % |

## 6. Interpretation

- „Keine Zielkopie“ bedeutet ausschließlich, dass der ausgewählte Held nicht erscheint. Andere Helden werden weiterhin normal gezogen.
- Rate Up verändert nicht die gesamte Epic-Rate. Es erhöht den Anteil des Zielhelden innerhalb des Epic-Pools.
- Pity erhöht die Zahl der erwarteten Epics, nicht direkt den Zielheld-Anteil eines einzelnen Epic-Pulls.
- Suit ist für einen passenden Zielhelden deutlich effizienter als Standard, weil der Wishlist-Pool kleiner und der Pity-Grenzwert niedriger ist.
- Standard profitiert relativ stärker von Rate Up, weil seine Ausgangschance von 0,2875 % besonders niedrig ist.

## 7. Grenzen der Berechnung

- Die Simulation beginnt mit einem leeren Pity-Zähler. Ein bereits aufgebauter Pity-Stand wird derzeit nicht eingegeben.
- Für Amity ist keine Pity-Regel und keine Rate für einen bestimmten Zielhelden hinterlegt.
- Die Berechnung setzt voraus, dass die angezeigten Raten konstant bleiben und der Zielheld korrekt auf Wishlist und Rate Up gesetzt ist.
- Änderungen an Spielraten oder Pity-Regeln müssen im Calculator und in dieser Dokumentation nachgezogen werden.

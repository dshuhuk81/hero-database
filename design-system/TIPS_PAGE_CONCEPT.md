# Tips Page – neues One-Page-Konzept

Stand: 17. September 2026

## Ziel

Die Tips Page wird von einem Nachschlagewerk zu einem kompakten Startguide. Ein neuer Spieler soll in weniger als zwei Minuten verstehen:

1. Was soll ich jetzt tun?
2. Wie baue ich mein erstes funktionierendes Team?
3. Welche Ressourcen darf ich nicht verschwenden?
4. Was ändere ich, wenn ich feststecke?
5. Wo finde ich aktuelle Detailinformationen?

Die Seite bleibt eine einzige, durchscrollbare Seite. Es gibt keine Tabs und keine versteckten Kerninformationen.

## Erkenntnisse aus dem Ist-Zustand

Die derzeitige Seite verteilt ihren Inhalt auf vier Tabs und insgesamt rund 2.940 Zeilen Astro/CSS. Sie enthält unter anderem:

- eine Startzusammenfassung und eine zweite, ausführlichere Start-Checkliste,
- 14 Odyssey-Meilensteine,
- mehrere Tabellen zu Summon-Raten und Wahrscheinlichkeiten,
- konkrete Wishlist-, Chronos- und Starglint-Picks,
- 13 fertige Teamzusammenstellungen,
- Support-Vergleiche, Relikt-Breakpoints und Mid-/Late-Game-Ratschläge,
- vollständige Erklärungen zu Kampf, Rollen, Fraktionen, Ascension und Begriffen.

Außerdem wird `TipsTeams` sowohl innerhalb von `TipsEarly` als auch als eigener Tab eingebunden. Das verstärkt Umfang und Redundanz.

Die Hauptprobleme sind daher nicht fehlende Inhalte, sondern:

- fehlende Priorisierung,
- doppelte Aussagen,
- Vermischung von Einsteiger- und Endgame-Fragen,
- schnell veraltende Heldennamen und Zahlen,
- Details, für die bereits bessere Spezialseiten existieren.

## Empfohlene Seitenstruktur

### 1. Hero: „Dein Start in 5 Regeln“

Zweck: sofort Orientierung geben, ohne Einleitungstext.

Inhalt als fünf kurze Regeln:

1. Treibe Odyssey voran, bis du festhängst.
2. Baue zuerst ein funktionierendes Kernteam.
3. Levele nur die fünf Helden, die dein Resonating Altar bestimmen.
4. Richte deine Wishlist früh ein und investiere nicht blind in jeden neuen Banner.
5. Investiere zuerst in Damage Dealer und ihre Relikte; verteile seltene Ressourcen nicht gleichmäßig.

Darunter nur zwei primäre Aktionen:

- „Zur Start-Checkliste“
- „Ich stecke fest“

Zusätzlich: „Zuletzt geprüft“ statt eines allgemeinen „aktualisiert“-Badges.

### 2. Start-Checkliste: „Das solltest du zuerst tun“

Zweck: handlungsorientierte Reihenfolge statt Systemlexikon.

Darstellung als eine kompakte Timeline mit höchstens acht Punkten:

**Sofort**

- Tutorial abschließen und alle Start-/Mail-Belohnungen abholen.
- Odyssey bis zur aktuellen Grenze spielen.
- Aktive Codes über den offiziellen Community-Kanal prüfen.

**Sobald freigeschaltet**

- Wishlist vollständig setzen.
- Einer aktiven Mindsea/Gilde beitreten.
- Resonating Altar nutzen: nur fünf Helden direkt leveln.
- Wöchentliche Torment-Rift-Belohnungen mitnehmen.
- Cancer als Destined Zodiac wählen.

**Noch nicht priorisieren**

- mehrere vollständige Teams gleichzeitig ausbauen,
- PvP-Rankings erzwingen,
- seltene Reliktmaterialien oder Premium-Währung ohne Ziel ausgeben.
- Artifacts früh aufsteigen lassen; zunächst nur das normale Levelmaximum nutzen.

Keine vollständige Unlock-Tabelle. Nur Freischaltungen nennen, die eine direkte Aktion des Spielers auslösen. Kapitelnummern nur dann anzeigen, wenn sie im aktuellen Global-Client verifiziert und zentral gepflegt werden.

### 3. Erstes Team: „Baue nach Funktionen, nicht nach Tier-List-Plätzen“

Zweck: die häufigste Anfängerfrage lösen, ohne eine schnell veraltende Meta-Liste zu kopieren.

Kompaktes Team-Rezept:

- **1 Haupt-Carry:** verursacht den Großteil des Schadens.
- **1 Frontliner:** hält den ersten Druck aus oder kontrolliert Gegner.
- **1 Sustain-Slot:** Heilung, Schilde oder Schadensreduktion.
- **1 Tempo-/Control-Slot:** Energie, Buffs, Debuffs oder Crowd Control.
- **1 Flex-Slot:** zweiter Damage Dealer oder Antwort auf den jeweiligen Modus.

Direkt darunter drei Regeln:

- Ein höher entwickelter, gut unterstützter Held ist anfangs oft wertvoller als ein einzelner Meta-Held ohne Kopien.
- Team-Synergie und Rollenabdeckung sind wichtiger als fünf hohe Einzelwertungen.
- Früh ein bis zwei starke Damage Dealer fokussieren. Hohe Evolution auf wenigen Kernhelden ist zunächst wertvoller als zehn mittelmäßig entwickelte Helden ohne Reliktzugang.
- Wenn die Meta-Helden noch fehlen, mit den tatsächlich gezogenen Helden spielen und nicht auf das perfekte Team warten. Hladgunnr und Isis können frühe Odyssey-Kapitel tragen; nur nicht langfristig überinvestieren.

CTA: „Helden vergleichen“ zur Tier List und „Aktuelle Wishlist ansehen“ zur Wishlist-Seite.

### 4. Investieren ohne Reue

Zweck: dauerhafte Regeln für Ressourcen vermitteln.

Darstellung als zweispaltige **Tun / Vermeiden**-Liste.

**Tun**

- Nur fünf Helden direkt leveln; andere über den Altar synchronisieren.
- Kopien und Ascension-Material zuerst für ein bis zwei starke Damage Dealer verwenden, damit diese früh Reliktzugang erhalten.
- Seltene Reliktmaterialien zuerst für klar definierte Schlüssel-Breakpoints einsetzen.
- Neue Helden im Trial testen und vor großen Investitionen aktuelle Bewertungen prüfen.
- Genug Währung als Reserve für zukünftige Kernhelden behalten.
- Artifacts zunächst nur bis zum normalen Levelmaximum verbessern und ihre Ascension auf später verschieben.

**Vermeiden**

- jeden Helden parallel leveln oder ausrüsten,
- reguläre Zodiac-Deities langfristig wie vollwertige Named/Destined Heroes behandeln,
- wertvolle Heldenkopien voreilig als Fodder einsetzen,
- rote/seltene Reliktmaterialien gleichmäßig verteilen,
- frühe Ressourcen in Artifact-Ascension binden,
- Popularity-Rankings als allgemeine Tier List lesen.

Kurze Sicherheitshinweise zu reversiblen Entscheidungen gehören hierhin: Was kann kostenlos zurückgesetzt oder getauscht werden, und ab wann entstehen Kosten? Nur aktuell verifizierte Regeln nennen.

#### Relikt-Reihenfolge für neue Accounts

Diese Empfehlung wird als eigener, datierter Praxisblock angezeigt:

1. Haupt-Carry bzw. Haupt-Carrys auf Relikt 20 bringen.
2. Wichtige Supports auf Relikt 10 bringen.
3. Danach den wichtigsten Carry auf Relikt 30 ausbauen.

Starke erste Relikt-20-Ziele sind Bastet, Xuannv, Nut, Zaojun und Skadi. Wenn Nut und Skadi beide verfügbar sind, erhält Nut Relikt 20 zuerst. Die allgemeine Regel bleibt trotzdem sichtbar: Reliktstufen folgen dem tatsächlich verwendeten Team und dürfen nicht blind auf ungespielte Meta-Helden verteilt werden.

#### Wöchentliche Auswahl-Events effizient spielen

Dieser Praxistipp gehört direkt zum Reliktblock, weil diese Events eine wichtige Quelle für seltene Reliktmaterialien sind:

- In rotierenden Events wie **Votive Festival**, **Golden Arcanum** und **Benevolent Feast** die **roten Relikt-Elixiere** als Zielbelohnung wählen. In den derzeitigen englischen Spieldaten heißt das Material **Apotheosis Elixir**.
- Wenn einzelne Belohnungen auf dem Spielfeld gewählt oder gezielt werden können, immer **Einzelzüge** verwenden.
- Nach Erreichen der Zielbelohnung aufhören beziehungsweise zur nächsten Auswahl wechseln, statt den restlichen Pool automatisch abzuräumen.
- **10er-Züge vermeiden**, wenn das Ziel die roten Elixiere sind: Sie verbrauchen mehrere Versuche auf einmal und räumen auch unerwünschte Belohnungen ab. Dadurch sinkt die Zahl der gezielten Chancen auf das knappe Reliktmaterial.

Empfohlene allgemeine Formulierung für die Seite:

> Wähle in wöchentlichen Auswahl-Events die roten Relikt-Elixiere. Nutze Einzelzüge und beende die Runde, sobald du das Ziel erhalten hast. Mit 10er-Zügen verbrauchst du unnötig Versuche für Belohnungen, die du nicht brauchst.

Die drei Eventnamen können als Beispiele in kleinerer Schrift erscheinen. Die eigentliche Empfehlung bleibt bewusst allgemein, damit sie auch für umbenannte oder neue Varianten desselben Eventtyps gilt.

### 5. Summons & Wishlist in 60 Sekunden

Zweck: eine Entscheidung ermöglichen, nicht das gesamte Gacha-System erklären.

Maximal vier Aussagen:

- Wishlist sofort nach Freischaltung vollständig setzen.
- Erst den vorhandenen Kern stabilisieren, dann neue Projekte beginnen.
- Rate-up nicht automatisch mit „muss ziehen“ gleichsetzen.
- Suit Summons auf die Fraktion konzentrieren, in der Kernheld und benötigte Kopien liegen.

Darunter ein kompakter, datierter Empfehlungsblock:

- **Carry-Kern:** Xuannv, Nut, Skadi, Zaojun und Bastet.
- **Support-Kern:** Hephaestus, Yuelao, Mengpo und Meret.
- **Situativ:** Poseidon wird besonders mit Relikt 10 interessant.
- **Caishen:** sehr guter Support, aber wegen früher Event- und Shop-Verfügbarkeit nicht zwingend der wichtigste Wishlist-Slot.

Die Seite erklärt unmittelbar davor: Am Anfang muss der Spieler mit seinen tatsächlichen Pulls arbeiten. Diese Namen sind Ziele, keine Voraussetzung für Fortschritt. Hladgunnr oder Isis sind valide frühe Carries, solange knappe Langzeitressourcen nicht unkontrolliert in sie fließen.

Danach drei Deep Links:

- Wishlist für aktuelle Heldenempfehlungen,
- Summon Calendar für kommende Banner,
- Summon Calculator für Wahrscheinlichkeiten.

Alle Raten, Formeln, 100-Pull-Beispiele und Banner-Mathematik verlassen die Tips Page.

### 6. „Du steckst fest?“ – Diagnose statt mehr Power

Zweck: dem Spieler eine kurze, konkrete Troubleshooting-Schleife geben.

Darstellung als sichtbare Entscheidungsreihe:

| Problem | Zuerst prüfen |
| --- | --- |
| Frontline stirbt sofort | Formation, Tank/Sustain, gegnerischen Burst |
| Zeit läuft ab | Carry-Investment, Energieversorgung, manuelle Ultimate-Kette |
| Backline wird gelöscht | Positionen tauschen, Dive/Assassin kontrollieren |
| Gegner heilt zu viel | Burst-Fenster, Heal-Reduction oder Zielpriorität |
| Team ist deutlich unterlevelt | AFK-Ressourcen, Altar, accountweite Systeme, später erneut versuchen |
| Ein Modus klappt nicht | Nicht jedes Team funktioniert in Odyssey, Bossen und PvP gleich |

Abschlussregel: zuerst Formation oder einen Support-Slot ändern, erst danach Ressourcen ausgeben.

### 7. Nur die Kampfmechaniken, die Entscheidungen verändern

Zweck: notwendige Grundlagen auf einen Bildschirm begrenzen.

Vier kompakte Visuals oder Karten:

- **Front/Back:** Wer fängt den ersten Schaden, wer muss geschützt werden?
- **Auto/Manuell:** Auto für Routine; Ultimates bei schwierigen Kämpfen bündeln.
- **Energy & Control:** Häufigere oder besser getimte Ultimates können mehr bringen als rohe Kampfkraft.
- **Factions:** Synergie und Counter als kleines Diagramm; keine lange Tabelle.

Ascension-Leiter, vollständiges Glossar und allgemeine Erklärung „Was ist dieses Spiel?“ entfallen.

### 8. Mindsea & Zodiac – zwei klare Entscheidungen

Dieser Abschnitt bleibt sehr kurz und kann direkt vor den weiterführenden Links stehen:

- **Destined Zodiac:** Cancer ist die klare Standardempfehlung für neue Accounts. Andere Zodiac-Optionen werden auf der Startseite nicht gleichwertig präsentiert.
- **Mindsea:** so früh wie möglich einer aktiven Gilde beitreten.
- **Mindsea Shop:** Zeus-Kopien priorisieren. Eine erste Dionysus-Kopie ist ebenfalls ein sinnvoller Kauf.

Falls das frühe kostenlose Wechseln der Destined Constellation weiterhin im aktuellen Global-Client funktioniert, kann ein kurzer Zusatz auf die temporäre Experimentierphase hinweisen. Das Endziel der Empfehlung bleibt Cancer.

### 9. „Wenn du weiter bist“ – kompakter Wegweiser

Zweck: Mid-/Late-Game nicht erklären, sondern zum richtigen Spezialinhalt führen.

Eine Link-Gruppe mit jeweils einem Satz:

- Hero Evolution – benötigte Kopien und Aufstiegsstufen.
- Relic Investment – sinnvolle Relikt-Breakpoints.
- Virtues – Sets, Grid und Farming.
- Totems – Effekte und Bewertungen.
- Guides – Helden- und Modus-spezifische Strategien.

Kein eigener Mid-/Late-Game-Tab und keine Relikt- oder Swap-Detailberatung auf dieser Seite.

## Vorgeschlagener Seitenfluss

```text
Hero: 5 Regeln
   ↓
Start-Checkliste
   ↓
Erstes Team bauen
   ↓
Investieren ohne Reue
   ↓
Summons & Wishlist
   ↓
Du steckst fest?
   ↓
4 Kampfgrundlagen
   ↓
Mindsea & Zodiac
   ↓
Weiterführende Guides & Tools
```

Eine schmale, sticky Sprungnavigation kann die sechs Hauptanker anzeigen. Sie ersetzt keine Inhalte und wird auf Mobile horizontal scrollbar.

## Was entfällt oder ausgelagert wird

| Bisheriger Inhalt | Entscheidung | Ziel |
| --- | --- | --- |
| „Was ist Motto Immortal?“ und Core Loop | entfernen | Das weiß ein Spieler auf einer Tips Page bereits |
| 14 Odyssey-Unlocks | stark kürzen | nur handlungsrelevante Meilensteine |
| Summon-Raten, Formeln und 100-Pull-Szenarien | auslagern | Summon Calculator |
| vollständige Wishlist-Picks | auslagern | auf Tips nur kompakter, datierter Starter-Kern; Details auf Wishlist |
| 13 Team-Comps | auslagern/ersetzen | rollenbasiertes Rezept, Guides/Heldenseiten |
| ausführlicher Support-Vergleich | kürzen | ein Tempo-/Sustain-Beispiel im Team-Rezept |
| Relikt-Breakpoints | auslagern | Relic Investment |
| Ascension-Leiter | auslagern | Hero Evolution |
| Chronos- und vollständige Starglint-Picklisten | entfernen oder eigener Guide | auf Tips nur Zeus-Priorität und erste Dionysus-Kopie |
| vollständiges Glossar | entfernen | Begriffe direkt dort erklären, wo sie vorkommen |
| Faction-Bonus-Tabelle | stark kürzen | ein kleines Synergie-/Counter-Visual |
| Deity Swap | kurzer Sicherheitshinweis | nur wenn Kosten und Grenze verifiziert sind |

## Inhaltsregeln

- Jeder Abschnitt beginnt mit einer Empfehlung, nicht mit einer Definition.
- Pro Karte höchstens eine Kernaussage und drei bis fünf Stichpunkte.
- Keine Heldennamen im dauerhaften Grundlagen-Text. Konkrete Starter-, Wishlist- und Reliktempfehlungen stehen ausschließlich in einem datierten, zentral gepflegten Empfehlungsblock.
- Zahlen nur verwenden, wenn sie eine Entscheidung verändern und aus einer zentralen Datenquelle stammen.
- „Früh ein Team fokussieren“ klar von „später mehrere Teams vorbereiten“ trennen.
- Fachbegriffe beim ersten Auftreten in einem Halbsatz erklären; kein separates Glossar.
- Keine Tabs oder Accordions für Kerninhalte. Optional einklappbar sind nur ergänzende Details.
- Jede Empfehlung erhält ein Prüfdatum; volatile Empfehlungen zusätzlich eine Versions-/Patchangabe.

## Recherchebasis

Die externe Recherche zeigt wiederkehrend dieselben Anfängerfragen und Risiken:

- Odyssey ist der zentrale Progressions-Gatekeeper; Formation, Ultimate-Timing sowie der Unterschied zwischen regulären und Destined/Named Heroes gehören zu den wenigen relevanten Grundlagen ([BlueStacks Beginner Guide](https://www.bluestacks.com/blog/game-guides/motto-immortal/moil-beginners-guide-en.html)).
- Neue Spieler fragen vor allem nach Team- und Investitionsprioritäten und sind durch widersprüchliche Tier Lists verunsichert ([Reddit: Character/Team Priority](https://www.reddit.com/r/MottoImmortal/comments/1r534lf/new_players_lack_of_direction_in_characterteam/)).
- Aktuelle Community-Antworten nennen Wishlist-Pflege als unmittelbare Priorität, weisen aber zugleich darauf hin, dass konkrete Heldenlisten schnell veralten ([Reddit: Advice](https://www.reddit.com/r/MottoImmortal/comments/1v0lhg7/advice/)).
- Langzeitberichte warnen sowohl vor zu breiter Frühinvestition als auch vor irreversibler Überinvestition in einen einzigen kurzfristigen Carry; mehrere Teams werden später relevant ([Reddit: 192 Days of Progress](https://www.reddit.com/r/MottoImmortal/comments/1v6hpku/192_days_of_progress_how_i_hit_1_on_server_35/)).
- Vergleichbare gute Gacha-Guides halten den Hauptguide verständlich und verlinken für Wishlist, Equipment und Investments auf eigene Detailseiten ([Prydwen: AFK Journey Beginner Guide](https://www.prydwen.gg/afk-journey/guides/beginner-guide)).

Externe Quellen dienen hier zur Themenfindung, nicht als alleinige Wahrheit für Zahlen oder Meta-Empfehlungen. Spielwerte und Unlock-Bedingungen müssen vor der Umsetzung im aktuellen Global-Client geprüft werden.

## Erfolgskriterien für die spätere Umsetzung

- Ein neuer Spieler sieht die fünf wichtigsten Regeln ohne Scrollen auf Desktop und mit höchstens einem kurzen Scroll auf Mobile.
- Alle Kerninhalte sind ohne Tab-Wechsel erreichbar.
- Die Hauptseite enthält höchstens neun kurze inhaltliche Abschnitte.
- Keine doppelte Empfehlung und keine vollständige Spezialtabelle.
- Konkrete Meta-Inhalte werden nur an einer Stelle gepflegt.
- Der Textumfang sinkt deutlich; Zielgröße: etwa 900–1.300 Wörter pro Sprache ohne verlinkte Detailseiten.
- Alle internen Links führen auf vorhandene, gepflegte Ziele.

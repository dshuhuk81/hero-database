# Tower Defense: Lords für alle Mythologie-Gruppen

Stand: 9. Oktober 2026. Status: **Design-Backlog, keine Balancefreigabe und keine Implementierung**.

## Ziel

Jede der sieben aktiven Mythologie-Gruppen erhält mindestens einen erkennbaren Anführer. Isis ist
bereits der Lord der Egyptian-Gruppe. Dieses Dokument ergänzt sechs primäre Lords und je einen
Ersatzkandidaten. Ein Lord ist etwas stärker und teurer als ein Legendary, beansprucht aber einen
normalen Platz in einer der beiden Fünferreihen. Seine wichtigste Aufgabe ist nicht maximaler
Eigenschaden, sondern eine Gruppe spielerisch zusammenzuführen.

Die Figuren beruhen auf mythologischen Motiven; Titel, Skills und Kampfmechaniken sind originale
Adaptionen für *The Last Crossing*. Mythologische Traditionen besitzen mehrere Fassungen. Vor
Text-, Audio- und Bildproduktion ist pro Figur eine Quellenprüfung erforderlich, insbesondere bei
lebendigen religiösen Traditionen.

## Bestehender Lord-Vertrag

Der aktuelle Code kennt bei Isis bereits drei getrennte Ebenen:

1. **Erbe:** passiver Attributbonus für passende Gruppenmitglieder in der eigenen Squad-Reihe;
2. **Ruf:** periodisches Fenster für Schaden und Heilung, dessen Intervall durch weitere passende
   Reihenmitglieder sinkt;
3. **Befehl:** ein vom direkten Angriff des tatsächlich aufgestellten Lords ausgelöster Effekt.

Erbe und Ruf gehören der gewählten Squad-Reihe. Sie bleiben aktiv, wenn der Lord nicht aufgestellt,
verkauft oder besiegt wurde. Der Befehl braucht dagegen den kämpfenden Lord. Gruppenfremde Helden
dürfen in derselben Reihe stehen, erhalten aber keinen Lord-Bonus. Ein Held mit zwei Gruppen erhält
nur den Bonus des Lords seiner eigenen Reihe; Boni beider Reihen stapeln nicht auf derselben Einheit.

Das heutige Datenschema bildet Isis so ab:

```json
{
  "groupId": "egyptian",
  "attrBonus": 0.15,
  "buff": {
    "dmg": 0.50,
    "heal": 0.50,
    "seconds": 20,
    "baseInterval": 50,
    "perMember": 6,
    "minInterval": 30
  },
  "mark": { "bonus": 0.20, "seconds": 3 }
}
```

Die neuen Entwürfe behalten diese drei Ebenen, geben Ruf und Befehl aber eine zur Gruppe passende
Mechanik. Für eine einfache erste Implementierung kann jeder Lord zunächst Isis’ vorhandenes
Schema mit abweichenden Zahlen verwenden. Die beschriebenen Spezialeffekte sind die Zielversion
und benötigen zusätzliche typisierte Felder statt hero-spezifischer Sonderfälle.

## Gemeinsames Stärke- und Progressionsbudget

- **Seltenheit:** immer `lord`; ein Lord zählt bei Summon-Wahrscheinlichkeiten nicht als Legendary.
- **Persönliche Werte:** ungefähr 8–12 % mehr Gesamtbudget als ein vergleichbarer Legendary, nicht
  pauschal 15 % auf jedes Attribut. Die stärkste Eigenschaft wird erhöht, eine Schwäche bleibt.
- **Aufstellungskosten:** typischerweise 21–24 Nectar. Ein Support-Lord darf niedriger liegen, wenn
  sein persönlicher Schaden gering ist.
- **Ultimate:** markant und zuverlässig, aber ohne Lord-Bonus nicht automatisch die beste Ultimate
  ihrer Klasse. Persönliche Stärke und Gruppenstärke werden gemeinsam bilanziert.
- **Erbe:** etwa 12–15 % Basisattribute oder ein ähnlich wertvoller gruppenspezifischer Split.
- **Ruf:** bei voller Viererbegleitung ungefähr alle 28–32 s, 8–14 s Dauer. Isis’ heutige 20 s bei
  bis zu 30 s Intervall ist deutlich mächtiger und sollte beim gemeinsamen Balancepass geprüft werden.
- **Befehl:** kurze Markierung auf höchstens einem Ziel pro Lord-Angriff oder ein klar begrenzter
  Taktgeber. Kein globaler Bonus bei jedem Treffer aller Gruppenmitglieder.
- **Skillstufen I–V:** verbessern die persönliche Ultimate. Lord-Boni wachsen nicht über normale
  Skillstufen, damit der Wert einer ganzen Reihe nicht an einer versteckten Schadensstufe hängt.
- **Evolution V:** stärkt die persönliche Identität oder die Verbindung zwischen Ultimate und
  Befehl. Das permanente Erbe bleibt unverändert.
- **Signature-Talente:** verändern die persönliche Ultimate, nicht die grundsätzliche Zugehörigkeit
  oder den passiven Lord-Bonus.

## Effekseer-Sprache der Lords

Jeder Lord erhält zusätzlich zu Angriff und Ultimate eine kleine, einheitliche Führungssprache:

- **Erbe:** nur im Squad-Screen als Gruppenwappen; im Kampf keine dauernde Vollflächenanimation.
- **Rufbeginn:** ein kurzer `lordRally<Group>`-Impuls am Lord- oder Reihenanker, anschließend ein
  zurückhaltender `buff`-Loop auf den tatsächlich begünstigten Helden.
- **Befehl:** ein gut sichtbares, kleines Zeichen am betroffenen Gegner oder Verbündeten. Es muss
  von Poison, Burn, Expose und Talentmarken unterscheidbar bleiben.
- **Layering:** Reichweiten und Zielgeometrie bleiben prozedurale Fallbacks; Effekseer liefert
  Material, Licht und Bewegung. Alle Atlanten werden offline als Normal-/Add-WebP gebacken.
- **Reduced Motion:** statisches Gruppenwappen beim Rufbeginn und eine feste Kontur für den Befehl;
  keine rotierenden Vollbildmandalas oder wiederholten Blitze.
- **Budget:** ein Rufimpuls pro Reihe, höchstens vier leise Buff-Loops und eine Befehlsmarke. Lord-
  Effekte dürfen die persönlichen Ultimates anderer Helden nicht überdecken.

## Übersicht: primäre Besetzung

| Gruppe | Primärer Lord | Klasse / Slot | Führungsidentität |
|---|---|---|---|
| Egyptian | Isis (bestehend) | Mage / Platform | Linienlicht, gemeinsamer Burst |
| Greek | Zeus | Mage / Platform | Fokusfeuer und göttliches Urteil |
| Norse | Frigg | Support / Platform | Vorbereitung, Schutz und Schicksalswissen |
| Elder Powers | Tiamat | Tank / Road | urzeitliche Ausdauer und Zonenmacht |
| Underworld | Hades | Tank / Road | Hinrichtung und Kontrolle entkommender Seelen |
| Wildborn | Quetzalcoatl | Mage / Platform | Bewegung, Statusreaktionen und Rückstoß |
| Divine Guardians | Amaterasu | Support / Platform | Reinigung, Rettung und geordnete Offensive |

## Referenz: Isis — Sovereign of the Hidden Sun

- **Status:** bereits implementierter Egyptian Lord · Mage, Platform · Kosten 21.
- **Persönlicher Skill:** horizontaler Sonnenstrahl auf der stärker besetzten Seite; bis zu acht,
  mit Evolution V bis zu zwölf Ziele.
- **Erbe:** +15 % ATK und HP für Egyptian-Helden in ihrer Reihe.
- **Ruf:** derzeit +50 % Schaden und Heilung für 20 s; Basisintervall 50 s, −6 s je passendem
  weiteren Reihenmitglied, Minimum 30 s.
- **Befehl:** Ein direkt von Isis getroffenes Ziel nimmt 3 s lang 20 % mehr Schaden durch passende
  Mitglieder ihrer Reihe.
- **Balancehinweis:** Isis ist die funktionale Referenz, aber ihre Ruf-Uptime ist kein zwingender
  Zielwert. Neue Lords sollen nicht alle dieselben extremen +50 % erhalten.
- **Effekseer:** `holy` für Sun Beam, `buff` für Ruf-Ticks; eine spätere Egyptian-Befehlsmarke kann
  ein kleines geflügeltes Sonnensiegel sein. Die horizontale Trefferlinie bleibt prozedural lesbar.

## Primäre neue Lords

### 1. Zeus — Träger des hohen Urteils

- **Gruppe:** `greek` · **Herkunft:** griechische Mythologie · **Klasse/Slot:** Mage, Platform
- **Kosten/Stärke:** 24 Nectar; hohe ATK und Magieresistenz, niedrige HP. Etwa +10 % persönliches
  Wertebudget gegenüber Odin, aber langsamere Basisangriffe.
- **Führungsrolle:** Greek-Teams bündeln ihren sehr unterschiedlichen Schaden auf ein verurteiltes
  Ziel und erhalten klar erkennbare Burst-Fenster.
- **Basisangriff – Donnerzeichen:** Ein Blitz trifft das Hauptziel und springt für 35 % auf ein
  zweites. Nur der Haupttreffer kann den Lord-Befehl setzen.
- **Signatur – Aigis des Himmels:** Jeder vierte Angriff gibt dem Greek-Helden mit den niedrigsten
  relativen HP in derselben Reihe einen kleinen Schild über 5 % seiner Max-HP.
- **Ultimate – Rat des Olymp:** Zeus markiert bis zu fünf Gegner im Muster. Nach 0.8 s fällt auf
  jedes Ziel ein Blitz für 150 % ATK; treffen mehrere Blitze denselben Boss, verursacht jeder
  weitere nur 60 %. Wet-Ziele lösen Conduct aus.
- **Skillstufen I–V:** Basis; 165 % pro Blitz; sechs Ziele; Cooldown −10 %; Hauptziel 1.5 s Stun.
- **Evolution V – Unwiderrufliches Urteil:** Der erste Blitz trifft zweimal; der zweite Treffer
  verursacht 70 % und erneuert Zeus’ Befehl.
- **Signature-Talente:** **Aigis** – nur drei Blitze, dafür Schilde für Greek-Verbündete. **Keravnos**
  – keine Schilde; Blitze verursachen +35 % gegen Elites und Bosse.
- **Lord-Erbe – Olympische Ordnung:** +12 % ATK und HP sowie +8 % Ultimateladegeschwindigkeit für
  Greek-Helden seiner Reihe.
- **Lord-Ruf – Versammlung der Zwölf:** 10 s lang +30 % Schaden und Heilung. Basisintervall 48 s,
  −5 s je weiterem Greek, Minimum 28 s.
- **Lord-Befehl – Urteil:** Zeus’ direkter Haupttreffer markiert ein Ziel 4 s. Greek-Helden der
  Reihe verursachen daran +18 % Schaden; kritische Treffer verlängern nicht.
- **Effekseer:** `lordRallyGreek` als goldblaues Lorbeer-Blitz-Wappen; `lordCommandJudgment` als
  kleine senkrechte Blitzlanze über dem Ziel. Ultimate nutzt `lightning`, Zielmarken bleiben als
  prozedurale Kreise. Reduced Motion: Wappenblitz und statische Lanzenmarke.
- **Designrichtung:** reifer Himmelskönig mit dunkler Sturmwolke, weißem Mantel, Aigis-Relief und
  konzentriertem Blitzbündel; königlich statt bloß muskulöser Blitzmagier.

### 2. Frigg — Königin des vorbereiteten Schicksals

- **Gruppe:** `norse` · **Herkunft:** nordische Mythologie · **Klasse/Slot:** Support, Platform
- **Kosten/Stärke:** 21 Nectar; hohe HP für einen Support und starke Heilung, niedriger Eigenschaden.
- **Führungsrolle:** Norse-Teams überstehen den ersten schweren Einschlag und antworten mit einem
  geplanten Gegenfenster, statt nur mehr Rohschaden zu erhalten.
- **Basisangriff – Falkenfaden:** Ein silberner Faden trifft einen Gegner; Heilaktionen weben als
  gebogene Fäden zu Verbündeten.
- **Signatur – Was sie nicht sagt:** Der erste negative Statuseffekt auf jeden Norse-Verbündeten
  alle 12 s hält 40 % kürzer.
- **Ultimate – Fensalirs Schleier:** Alle Verbündeten in Reichweite erhalten 8 s einen Schild über
  18 % ihrer Max-HP. Zerbricht ein Schild, erhält der Held sofort 15 % Ultimate-Ladung.
- **Skillstufen I–V:** Basis; Schild 22 %; Dauer 10 s; Cooldown −10 %; Ladung 22 %.
- **Evolution V – Bekannter Ausgang:** Der erste tödliche Treffer auf einen geschützten Helden
  lässt ihn bei 1 HP und heilt 10 % Max-HP; einmal pro Cast.
- **Signature-Talente:** **Falkengewand** – kleinere Schilde, aber Statusimmunität 3 s. **Goldene
  Spindel** – kein Todesfang; zerbrochene Schilde laden alle Norse-Verbündeten um 8 %.
- **Lord-Erbe – Halle der Königin:** +15 % HP und +10 % Heilungs-/Schildstärke für Norse-Helden
  ihrer Reihe.
- **Lord-Ruf – Vorhergesehen:** 10 s lang 25 % Schadensreduktion und +20 % Schaden nach einem
  erlittenen Treffer. Basisintervall 50 s, −6 s je weiterem Norse, Minimum 30 s.
- **Lord-Befehl – Schicksalsfaden:** Friggs direkter Treffer bindet ein Ziel 5 s. Der erste Norse-
  Verbündete, der es trifft, erhält einen 6-%-Schild; pro Marke nur einmal je Verbündetem.
- **Effekseer:** `lordRallyNorse` als silbernes Spindel-/Runenwappen, Buff-Loops als ruhige Fäden;
  Befehl durch einen einzigen sichtbaren Fadenknoten. Ultimate kann `holy` plus neue sparsame
  `thread-shield`-Familie nutzen. Reduced Motion: statischer Schildrand und Knotensymbol.
- **Designrichtung:** souveräne nordische Königin mit Spindel, Schlüsselbund und Falkenmantel;
  weiß, silber und tiefblau, keine generische Walküre.

### 3. Tiamat — Mutter des ersten Meeres

- **Gruppe:** `elder-powers` · **Herkunft:** babylonisch/mesopotamisch · **Klasse/Slot:** Tank, Road
- **Kosten/Stärke:** 24 Nectar; höchste Lord-HP, langsame Angriffe und geringe Rüstung. Die Macht
  liegt in HP und Magieresistenz, nicht in gleichzeitig maximalem Schaden.
- **Führungsrolle:** Elder Powers werden stärker, wenn sie lange an einem Ort bestehen und große
  Flächen gegen Schwärme kontrollieren.
- **Basisangriff – Salzwasserpranke:** weiter schwerer Hieb mit kleinem Wet-Splash.
- **Signatur – Älter als die Ordnung:** Jeder gehaltene Gegner erhöht Tiamats Magieresistenz um
  8 %, maximal vier Stapel.
- **Ultimate – Meer vor der Schöpfung:** 8 s überflutet eine Zone um Tiamat. Gegner sind Wet,
  bewegen sich 25 % langsamer und erleiden pro Sekunde 35 % ATK. Tiamat heilt pro betroffenem
  Gegner 1 % Max-HP pro Sekunde, gedeckelt auf 5 %.
- **Skillstufen I–V:** Basis; Tick 42 %; Radius +20 %; Cooldown −10 %; Heilungsdeckel 7 %.
- **Evolution V – Elf Ungeheuer:** Beim Cast erscheinen elf kurze Wellenimpulse; jeder trifft ein
  anderes gültiges Ziel für 30 % und unterbricht normale Gegner kurz.
- **Signature-Talente:** **Bitteres Meer** – Poison statt Eigenheilung. **Urmutter** – kein
  Tickschaden; stärkere Heilung und 20 % Schadensreduktion für Elder-Verbündete in der Zone.
- **Lord-Erbe – Vor der Zeit:** +15 % HP und +10 % Statusdauer der von Elder-Powers verursachten
  Debuffs, ohne Freeze oder Stun über deren Sicherheitsgrenzen zu verlängern.
- **Lord-Ruf – Erwachen der Tiefe:** 12 s lang +25 % Schaden/Heilung; Elder-Helden erhalten alle
  3 s einen Schild über 4 % Max-HP, nicht stapelbar. Basisintervall 52 s, −6 s je weiterem Elder,
  Minimum 32 s.
- **Lord-Befehl – Urflut:** Tiamats direkter Treffer markiert ein Ziel 4 s als Wet und lässt den
  nächsten Elder-Treffer 25 % Flächenschaden um das Ziel verursachen; danach endet die Marke.
- **Effekseer:** `lordRallyElder` als gebrochene uralte Scheibe über dunklem Wasser;
  `lordCommandPrimordial` ist ein kleiner Salzwasserwirbel am Ziel. Ultimate persistiert über
  `water` Ground-Loop; elf Impulse sind gezählt. Reduced Motion: feste Flutgrenze und elf kurze
  Randkerben statt Wellenanimation.
- **Designrichtung:** urzeitliche Meeresmutter mit schlangen-/drachenhafter Silhouette, aber keine
  historisch behauptete exakte Gestalt; Lapislazuli, Salzweiß und Tiefsee. Die unsichere antike
  Ikonographie muss im Begleittext transparent bleiben.

### 4. Hades — König des verschlossenen Tores

- **Gruppe:** `underworld` · **Herkunft:** griechische Mythologie · **Klasse/Slot:** Tank, Road
- **Kosten/Stärke:** 23 Nectar; hohe Rüstung und kontrollierter Schaden, langsam und ohne starke
  Eigenheilung.
- **Führungsrolle:** Underworld-Helden jagen verwundete Gegner, verhindern Leaks und verwerten Tode,
  ohne zu einer reinen Execute-Gruppe zu werden.
- **Basisangriff – Zweizack des Tores:** schwerer Stoß; verursacht +20 % gegen Gegner unter 35 % HP.
- **Signatur – Reichtum der Tiefe:** Jeder zehnte Kill der eigenen Reihe gibt Hades 5 % Ultimate-
  Ladung; höchstens einmal pro Sekunde.
- **Ultimate – Das Tor bleibt geschlossen:** Ein dunkles Tor entsteht 7 s auf dem Weg. Normale
  Gegner können es nicht überschreiten; Elites werden dort 40 % verlangsamt, Bosse 15 %. Beim Ende
  trifft das Tor alle darin stehenden Gegner für 160 % ATK.
- **Skillstufen I–V:** Basis; Endschaden 190 %; Dauer 8 s; Cooldown −10 %; Elites 55 % Slow.
- **Evolution V – Helm der Unsichtbarkeit:** Hades wird beim Cast 4 s unangreifbar; Underworld-
  Assassins priorisieren währenddessen Gegner am Tor.
- **Signature-Talente:** **Kerberos’ Kette** – kleineres Tor, zieht drei Gegner zurück. **Reichtum
  der Toten** – kein vollständiger Stopp; jeder Tod am Tor zahlt 1 Nectar, maximal fünf pro Cast.
- **Lord-Erbe – Unentrinnbares Reich:** +12 % ATK und HP; Underworld-Helden verursachen +10 %
  Schaden gegen Ziele unter 35 % HP.
- **Lord-Ruf – Die Schatten sammeln sich:** 10 s lang +30 % Schaden und +25 % Ultimate-Laderate;
  Kills verlängern das Fenster nicht. Basisintervall 48 s, −5 s je weiterem Underworld, Minimum 28 s.
- **Lord-Befehl – Münze des Fährmanns:** Hades’ direkter Treffer markiert ein Ziel 5 s. Stirbt es
  durch ein passendes Reihenmitglied, erhält dieses 8 % Ultimate-Ladung; die Marke wird verbraucht.
- **Effekseer:** `lordRallyUnderworld` als dunkles Tor mit kalter Flamme; Befehlsmarke als kleine
  Silbermünze. Ultimate braucht neue `underworld-gate`-Familie, echte Stopplinie bleibt
  prozedural. Reduced Motion: statisches Tor und Münzsymbol.
- **Designrichtung:** ernster König mit Bident, dunklem Metall und mineralischem Reichtum; kein
  Sensenmann und kein brennender Teufel. Kerberos nur als Relief/Schatten, sofern nicht mechanisch.

### 5. Quetzalcoatl — Stimme des gefiederten Windes

- **Gruppe:** `wildborn` · **Herkunft:** mesoamerikanisch, besonders Nahua/Mexica · **Klasse/Slot:** Mage, Platform
- **Kosten/Stärke:** 23 Nectar; große Reichweite und hohe Angriffsgeschwindigkeit, mittlerer Schaden
  und fragile HP.
- **Führungsrolle:** Wildborn-Helden kombinieren Wet, Chill, Poison, Bewegung und Flächenschaden;
  der Lord belohnt unterschiedliche Status statt nur einen Elementtyp.
- **Basisangriff – Muschelwind:** gefiederter Windwirbel; jeder dritte Angriff schiebt normale
  Gegner 10 px zurück.
- **Signatur – Vier Winde:** Quetzalcoatl verursacht +8 % Schaden je unterschiedlichem bestehendem
  Status auf dem Ziel, maximal drei Status.
- **Ultimate – Wind der fünften Sonne:** Eine breite Windfront wandert durch seine Reihe, trifft für
  170 % ATK, macht unstatusierte Ziele Wet und schiebt normale Gegner 50 px zurück. Bereits
  statusierte Ziele behalten ihren Status und lösen passende Reaktionen aus.
- **Skillstufen I–V:** Basis; 195 %; Front +1 Schritt; Cooldown −10 %; Rückstoß 65 px.
- **Evolution V – Wiederkehrende Sonne:** Trifft die Front mindestens drei verschieden statusierte
  Gegner, folgt ein zweiter Windstoß für 70 %.
- **Signature-Talente:** **Edelsteinatem** – kein Rückstoß, dafür 6 s Expose. **Gefiederte Flut** –
  −25 % Schaden, aber alle Ziele werden Wet und stärker verlangsamt.
- **Lord-Erbe – Atem der Wildnis:** +12 % ATK und HP; von Wildborn verursachte Burn-, Poison-,
  Chill- und Wet-Dauern +15 %, kontrollierende Reaktionen bleiben gedeckelt.
- **Lord-Ruf – Vier Richtungen:** 10 s lang +20 % Angriffstempo und +25 % Status-/Reaktionsschaden.
  Basisintervall 48 s, −5 s je weiterem Wildborn, Minimum 28 s.
- **Lord-Befehl – Windknoten:** Direkter Haupttreffer markiert ein Ziel 4 s. Der nächste andere
  Status eines Wildborn-Helden löst sofort seine Reaktion aus und verbraucht die Marke.
- **Effekseer:** `lordRallyWildborn` als vierfarbiges Feder-/Windwappen; `lordCommandWindKnot` als
  kleiner gefiederter Knoten am Ziel. Ultimate verwendet eine neue `feather-wind`-Front plus
  vorhandenes `water`. Reduced Motion: gerade transparente Front und statisches Federsymbol.
- **Designrichtung:** erhabene gefiederte Windgottheit mit Quetzalfedern, Muschelschmuck und
  Türkis; kein chinesischer Drache und keine Vermischung unterschiedlicher mesoamerikanischer Stile.

### 6. Amaterasu — Herrin des wiederkehrenden Morgens

- **Gruppe:** `divine-guardians` · **Herkunft:** Shinto/japanische Mythologie · **Klasse/Slot:** Support, Platform
- **Kosten/Stärke:** 22 Nectar; starke Heilung und Magieresistenz, geringer direkter Schaden.
- **Führungsrolle:** Divine Guardians verhindern Kontrollketten, retten einen gefährdeten Helden
  und verwandeln gute Defensive in ein begrenztes Offensivfenster.
- **Basisangriff – Spiegelglanz:** warmer Lichtimpuls; Heilungen fließen als kleine Spiegelreflexe.
- **Signatur – Achtfacher Spiegel:** Der erste Slow-, Chill-, Root- oder Silence-Effekt auf jeden
  Divine-Guardian alle 12 s wird entfernt.
- **Ultimate – Öffnung der Felsenhöhle:** Ein Sonnenkorridor bleibt 7 s. Verbündete in Reichweite
  werden um 18 % Max-HP geheilt, erhalten +20 % Angriff und sind 3 s gegen Silence und Root immun.
  Gegner im Licht verursachen 20 % weniger Schaden.
- **Skillstufen I–V:** Basis; Heilung 22 %; Dauer 9 s; Cooldown −10 %; Immunität 4 s.
- **Evolution V – Wiederkehrender Morgen:** Der erste tödliche Treffer auf einen Verbündeten im
  Korridor lässt ihn bei 1 HP und heilt 15 % Max-HP; einmal pro Cast.
- **Signature-Talente:** **Himmlische Ordnung** – stärkerer Schutz und Heal, kein Angriffsbonus.
  **Tanz vor der Höhle** – kein Todesfang; +25 % Angriffstempo und 15 % schnellere Ultimateladung.
- **Lord-Erbe – Licht der Ordnung:** +15 % HP sowie +12 % Heilungs- und Schildstärke für Divine-
  Guardians ihrer Reihe.
- **Lord-Ruf – Der Morgen kehrt wieder:** 10 s lang +25 % Schaden/Heilung und 30 % kürzere negative
  Statusdauer. Basisintervall 50 s, −6 s je weiterem Guardian, Minimum 30 s.
- **Lord-Befehl – Spiegelurteil:** Amaterasus direkter Treffer markiert ein Ziel 5 s. Dessen erster
  Angriff auf einen passenden Reihenhelden verursacht 30 % weniger Schaden und verbraucht die Marke.
- **Effekseer:** `lordRallyGuardians` als Schild-Halo-Wappen; Befehlsmarke als kleiner Spiegel über
  dem Gegner. Ultimate nutzt neue `sun-mirror`-Familie, Reichweitenkorridor bleibt sichtbar.
  Reduced Motion: fester Goldkorridor, ein Spiegelglint.
- **Designrichtung:** ruhige kaiserliche Sonnengöttin mit sakralem Spiegel, weiß-roten Gewändern und
  kontrolliertem Goldlicht; keine Feuer-Magierin.

## Ersatzkandidaten

### R1. Athena — Strategin der geordneten Reihe (`greek`)

- **Klasse/Slot:** Tank, Road · **Kosten:** 23 · **Alternative zu:** Zeus, wenn Greek defensiver
  und weniger blitzlastig geführt werden soll.
- **Persönlicher Kern:** Speer und Aigis; Ultimate **Phalanx der Eule** gibt Road-Verbündeten 7 s
  25 % Schadensreduktion und lässt ihre ersten drei Angriffe den Schildrand als Cleave nutzen.
- **Upgrades I–V:** Basis; Reduktion 30 %; vier Cleaves; Cooldown −10 %; Dauer 9 s.
- **Evolution V:** Der erste durch die Phalanx verhinderte tödliche Treffer stunnt Angreifer 2 s.
- **Lord-Erbe:** +15 % HP und +10 % Rüstung/Magieresistenz für Greek.
- **Lord-Ruf:** 10 s +25 % Schaden und 20 % Schadensreduktion; 50/−6/30-s-Intervall.
- **Lord-Befehl:** Athena markiert ein Ziel als **Strategisches Ziel**; der erste Treffer jeder
  anderen Greek-Klasse verursacht +15 %, danach endet die Marke nach drei verschiedenen Klassen.
- **Talente:** **Aigiswall** für stärkere Defensive; **Eulenplan** für Zielmarke und Reichweite.
- **Effekseer:** Oliv-goldenes Eulen-/Aigis-Wappen, `holy` + `stone`; drei kleine Klassensegmente
  an der Befehlsmarke. Reduced Motion: statischer Schild.
- **Designrichtung:** gepanzerte Strategin mit Speer, Aigis und Eule; diszipliniert, nicht Berserkerin.

### R2. Odin — Runenkönig (`norse`, Beförderung des bestehenden Helden)

- **Klasse/Slot:** Mage, Platform · **Kosten:** 23 · **Alternative zu:** Frigg, wenn ein vorhandener
  Held ohne zusätzliche neue Identität zum Lord befördert werden soll.
- **Persönlicher Kern:** bestehende Chain-Lightning- und Runenkreis-Mechanik bleibt erhalten; nur
  Lord-Status, Kosten und Balancebudget ändern sich.
- **Lord-Erbe:** +12 % ATK/HP und +8 % Ultimateladegeschwindigkeit für Norse.
- **Lord-Ruf – Einherjar-Ruf:** 9 s +30 % Schaden und +20 % Angriffstempo; 48/−5/28-s-Intervall.
- **Lord-Befehl – Rabenmal:** Odins Haupttreffer markiert ein Ziel 4 s; Norse-Ketten- und
  Flächentreffer verursachen daran +18 %.
- **Evolution-V-Ergänzung:** Der vierte erwachte Kettenblitz setzt das Rabenmal ebenfalls.
- **Talente:** bestehende Storm Lord/Rune Mark bleiben; Rune Mark muss mit Lord-Marke entweder
  zusammengeführt oder gegen Doppel-Expose geschützt werden.
- **Effekseer:** vorhandenes Odin-Blitzsystem wiederverwenden; neuer Rabenmarken-Clip `feather` +
  Rune. Reduced Motion: statische Rune.
- **Designrichtung:** vorhandene Kunst weiterverwenden; Krone und Gruppenwappen genügen im UI.

### R3. Nuwa — Die den Himmel flickte (`elder-powers`)

- **Klasse/Slot:** Support, Platform · **Kosten:** 22 · **Alternative zu:** Tiamat, wenn Elder Powers
  konstruktiver und weniger monströs geführt werden sollen.
- **Persönlicher Kern:** Ultimate **Fünffarbiger Himmel** repariert Schilde, heilt 16 % Max-HP und
  versiegelt 7 s eine Board-Zone gegen negative Umweltereignisse.
- **Upgrades I–V:** Basis; Heal 20 %; Zone +1 Schritt; Cooldown −10 %; Dauer 9 s.
- **Evolution V:** Überheilung wird zum 15-%-Schild.
- **Lord-Erbe:** +15 % HP und +10 % Schild-/Heilstärke für Elder Powers.
- **Lord-Ruf:** 12 s +25 % Schaden/Heilung und alle 4 s 4-%-Schild; 52/−6/32-s-Intervall.
- **Lord-Befehl:** Direkter Treffer setzt einen farbigen Stein; der nächste Elder-Treffer entfernt
  einen positiven Gegnerstatus und verbraucht ihn.
- **Talente:** **Himmelsnaht** für Schutz; **Menschenschöpferin** für Heilung und Revive-Charge.
- **Effekseer:** neues `five-stones`-Farbband, `holy`/`stone`; feste Zonenbegrenzung als Fallback.
- **Designrichtung:** menschlich-drachengestaltige Schöpferin mit fünffarbigen Steinen; konkrete
  chinesische Bildtraditionen vor Produktion prüfen.

### R4. Hel — Die zweigeteilte Herrin (`underworld`)

- **Klasse/Slot:** Support, Platform · **Kosten:** 22 · **Alternative zu:** Hades, wenn Underworld
  zwischen Erhaltung und Tod statt zwischen Blockade und Execute wählen soll.
- **Persönlicher Kern:** Basisaktionen wechseln zwischen Heilung und Schaden. Ultimate **Halbes
  Leben, halber Tod** heilt Verbündete für 18 % und trifft Gegner für 180 %; Einheiten unter 35 %
  erhalten die jeweilige Wirkung 50 % stärker.
- **Upgrades I–V:** Basis; Heal 22 %; Schaden 210 %; Cooldown −10 %; Schwelle 45 %.
- **Evolution V:** Getötete Gegner geben dem schwächsten Underworld-Verbündeten 8 % HP.
- **Lord-Erbe:** +12 % ATK/HP und +10 % Schaden/Heilung an Zielen unter 35 %.
- **Lord-Ruf:** 10 s +30 % Schaden und Heilung; Todesfälle geben einmal pro Sekunde 3 % Ultimate-
  Ladung; 50/−6/30-s-Intervall.
- **Lord-Befehl:** Hels direkter Treffer markiert ein Ziel 5 s; bei dessen Tod heilt es den letzten
  passenden Angreifer um 6 % Max-HP.
- **Talente:** **Lebende Hälfte** für Sustain; **Tote Hälfte** für Execute.
- **Effekseer:** zweigeteiltes weiß-schwarzes Torwappen, `heal` und `shadow`; Reduced Motion zeigt
  eine geteilte statische Scheibe.
- **Designrichtung:** zweigeteilte Königin Hels, eine lebendige und eine tote Körperhälfte, würdevoll
  statt splatterhaft; nordische Grabfarben.

### R5. Cernunnos — Herr des gehörnten Kreises (`wildborn`)

- **Klasse/Slot:** Support, Platform · **Kosten:** 21 · **Alternative zu:** Quetzalcoatl, wenn
  Wildborn stärker auf Tiere, Poison und Wachstum ausgerichtet werden soll.
- **Persönlicher Kern:** Ultimate **Kreis der Geweihe** erzeugt 8 s eine Zone; Verbündete heilen
  4 % Max-HP alle 2 s, Gegner erhalten Poison und 20 % Slow.
- **Upgrades I–V:** Basis; Heal 5 %; Radius +20 %; Cooldown −10 %; Dauer 10 s.
- **Evolution V:** Jeder Poison-Tod lässt einmal eine Heilranke zum schwächsten Verbündeten wachsen.
- **Lord-Erbe:** +12 % ATK/HP und +15 % Poison-/Burn-Schaden für Wildborn.
- **Lord-Ruf:** 10 s +20 % Angriffstempo und +30 % Statusschaden; 48/−5/28-s-Intervall.
- **Lord-Befehl:** Direkter Treffer setzt **Geweihmal**; der nächste Wildborn-Status splasht mit
  halber Stärke auf zwei nahe Gegner.
- **Talente:** **Herr der Tiere** für Angriffstempo; **Wurzelkreis** für Heilung und Slow.
- **Effekseer:** grünes Geweih-/Torques-Wappen, `venom` Ground-Loop und Blattranken; Reduced Motion:
  feste Geweihkontur.
- **Designrichtung:** gehörnte gallische Gottheit nach archäologischen Motiven mit Torques und
  Schlange; keine pauschale „Druiden“-Mischästhetik.

### R6. Vishnu — Bewahrer des Gleichgewichts (`divine-guardians`)

- **Klasse/Slot:** Mage, Platform · **Kosten:** 24 · **Alternative zu:** Amaterasu, wenn Guardians
  offensiver und reaktionsschneller geführt werden sollen.
- **Persönlicher Kern:** rotierende Chakra-Projektile. Ultimate **Sudarshana-Kreis** trifft bis zu
  sechs Ziele für 140 %, entfernt von jedem einen positiven Zustand und gibt geschützten
  Verbündeten einen 8-%-Schild.
- **Upgrades I–V:** Basis; 160 %; acht Ziele; Cooldown −10 %; Schild 12 %.
- **Evolution V:** Das Chakra kehrt zurück und heilt den schwächsten Guardian um 15 % Max-HP.
- **Lord-Erbe:** +12 % ATK/HP und +10 % Schild-/Heilstärke für Divine Guardians.
- **Lord-Ruf:** 10 s +25 % Schaden/Heilung und 25 % Statusresistenz; 50/−6/30-s-Intervall.
- **Lord-Befehl:** Direkter Treffer setzt **Bewahrtes Ziel**; greift es einen Guardian an, erhält
  dieser 6 % Schild und die Marke endet.
- **Talente:** **Chakra** für offensiven Rückweg; **Muschelklang** für Teamreinigung.
- **Effekseer:** blau-goldenes Chakra-/Muschelwappen, `holy` und echtes kreisendes Projektil;
  Reduced Motion: gerader Hin-/Rückflug ohne Rotation.
- **Designrichtung:** Vishnu mit Chakra und Muschel, königlich blau-gold; ikonographisch und
  religiös besonders sorgfältig prüfen, nicht als generischen Mehrarm-Magier behandeln.

## Empfohlene Produktionsreihenfolge

1. **Zeus / Greek:** prüft den einfachsten Übergang vom Isis-Schema zu einem offensiven Lord.
2. **Frigg / Norse:** prüft defensive Rufeffekte und zeigt, ob Odin Legendary bleiben soll.
3. **Amaterasu / Divine Guardians:** ergänzt Reinigung und Rettung, außerdem bereits im
   allgemeinen Helden-Backlog vorbereitet.
4. **Quetzalcoatl / Wildborn:** prüft gruppenspezifische Status- und Reaktionsverstärkung.
5. **Hades / Underworld:** prüft verbrauchbare Kill-Marken und echte Wegbarriere.
6. **Tiamat / Elder Powers:** technisch anspruchsvollste Kombination aus Tank, Zone und Schilden.

Die erste technische Ausbaustufe sollte Zeus mit dem bereits vorhandenen `attrBonus`/`buff`/`mark`-
Schema implementieren. Erst danach sollte das Lord-Datenmodell um klar benannte optionale Effekte
wie `statusDuration`, `damageReduction`, `shieldPulse`, `onMarkedKill` oder `reactionTrigger`
erweitert werden. So wird zuerst bewiesen, dass mehrere Lords, UI-Auswahl und zwei unabhängige
Reihen zuverlässig funktionieren.

## Prüfkriterien pro Lord

1. Der Lord besitzt seine geführte Gruppe selbst und führt genau eine Gruppe, auch bei zwei
   persönlichen Gruppenmitgliedschaften.
2. Nur passende Helden derselben gewählten Squad-Reihe erhalten Erbe und Ruf.
3. Erbe und Ruf funktionieren vor Aufstellung sowie nach Verkauf oder Tod des Lords.
4. Der Befehl kann ausschließlich durch den tatsächlich kämpfenden Lord ausgelöst werden.
5. Zwei Lords in zwei Reihen beeinflussen einander nicht; ein Held erhält nie beide Lord-Boni.
6. Persönliche Skillstufen verändern keine versteckten gruppenweiten Werte.
7. Lord plus vier passende Helden bleibt stärker als eine unverbundene Reihe, aber nicht so stark,
   dass Gruppenfremde grundsätzlich unspielbar werden. Zielkorridor: ungefähr 15–25 % bessere
   Stage-Leistung in der idealen Gruppenkomposition, nicht 50 %.
8. Lord-Ruf, persönlicher Buff und Talentbuff sind im UI und in der Effektfarbe unterscheidbar.
9. Jeder Effekseer-Clip besitzt einen prozeduralen Fallback und eine Reduced-Motion-Darstellung.
10. Neue Lord-Felder werden datengetrieben validiert und mit gezielten Sim-Tests abgedeckt; kein
    Produktions-Build ohne ausdrückliche Aufforderung.

## Mythologische Arbeitsquellen

Diese Quellen dienen nur zur Prüfung des mythologischen Ankers; die Spielmechaniken stammen nicht
aus ihnen:

- Isis: Metropolitan Museum of Art, *Isis and Horus*.
- Tiamat und Marduk: World History Encyclopedia, Überblick zu Tiamat und dem *Enuma Elish*.
- Nuwa: World History Encyclopedia, Überblick zu Gottheiten des alten China.
- Für Zeus, Frigg, Hades, Quetzalcoatl, Amaterasu, Athena, Hel, Cernunnos und Vishnu müssen vor
  finaler Produktion zusätzlich fachlich belastbare Einzelquellen im jeweiligen Charakterdossier
  dokumentiert werden.

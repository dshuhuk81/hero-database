# Tower Defense: Backlog für 30 neue mythologische Helden + 5 Reserven

Stand: 9. Oktober 2026. Status: **Ideensammlung, keine Balancefreigabe und keine Implementierung**.

## Ziel und Quellen

Diese Sammlung ist ein Produktions-Backlog für neue Helden in *The Last Crossing*. Sie verbindet
mythologisch erkennbare Figuren mit den sechs vorhandenen Klassen, Road-/Platform-Plätzen, Status-
und Reaktionssystemen, fünf Ultimate-Stufen, Evolution V, Signature-Talenten und der bestehenden
Effekseer-Pipeline.

Die extrahierten Daten aus *Watcher of Realms* dienen nur als strukturelle Inspiration. Besonders
nützlich sind dort klar getrennte Rollen, Skills mit mehreren Phasen, Reichweitenwechsel,
Mehrfachtreffer, Schutzfenster und Upgrades, die mehr als bloßen Schaden verändern. Namen, Texte,
Mechanikkombinationen und visuelle Identitäten unten sind eigenständig. Nicht aufgelöste
WoR-Platzhalter oder absolute WoR-Werte wurden nicht übernommen.

Mythologische Überlieferungen besitzen häufig mehrere, teils widersprüchliche Fassungen. Vor der
finalen Illustration und Benennung sollte jede Figur noch einmal mit guten Primär- oder
Fachquellen geprüft werden. Lebendige religiöse Traditionen sind respektvoll darzustellen; keine
heiligen Zeichen als bloße Horror-Dekoration verwenden.

## Gemeinsames Daten- und Balancemodell

Alle Zahlen sind **erste Testwerte**. Sie beschreiben die beabsichtigte Form eines Skills, nicht
seine endgültige Stärke.

- `Klasse` und `Slot` verwenden die bestehenden Werte Tank, Warrior, Assassin, Mage, Archer,
  Support sowie Road oder Platform.
- `Gruppen` verwenden vorerst nur bestehende IDs: `greek`, `norse`, `egyptian`, `elder-powers`,
  `underworld`, `wildborn`, `divine-guardians`. Der Kulturkreis bleibt ein separates Feld; eine
  neue Pantheon-Gruppe ist für die Aufnahme eines einzelnen Helden nicht nötig.
- Jeder Held besitzt einen verständlichen Basisangriff, eine kleine Signaturmechanik, eine
  Ultimate, fünf Skillstufen und zwei alternative Tier-II-Talente.
- Skillstufen folgen dem vorhandenen Modell: Stufe 1 ist der Basisskill; Stufen 2–5 verbessern
  abwechselnd Stärke, Reichweite/Zielzahl, Dauer oder Cooldown. Utility-Skills dürfen nie durch
  einen bedeutungslosen pauschalen `ultPower`-Bonus aufgewertet werden.
- `Evolution V` ist der deutlich sichtbare Awakening-Sprung. Die zwei Signature-Talente bleiben
  Sidegrades und verändern die Einsatzfrage, statt gemeinsam aktiv zu sein.
- Neue Statusarten sind vermieden. Die Entwürfe nutzen Burn, Poison, Chill, Wet, Freeze, Expose,
  Slow, Stun, Shield, Heal und bestehende Reaktionen. Ein Spezialzustand ist nur vorgeschlagen,
  wenn er für die Identität unverzichtbar ist.

## Effekseer-Vertrag für neue Skills

Effekseer bleibt eine **rein visuelle Offline-Autorenebene**. Die Laufzeit spielt gebackene WebP-
Atlanten über `authored-fx.js`; Schaden, Ziele, Radius, Status und Dauer kommen ausschließlich aus
der Simulation. Ein fehlender Atlas darf das Ergebnis eines Kampfes nie verändern.

Für jeden neuen Helden sollte später ein Profil mit diesen Feldern angelegt werden:

```js
{
  palette: { primary, accent, shadow },
  basic: { shape, travel, impact, trail },
  ultimate: {
    event, clip, anchor, layer, width, alpha, speed,
    telegraph, impact, persistent, fallback
  },
  statuses: [{ status, cue }],
  reducedMotion: { staticCue, maxFlashes }
}
```

- `event`: stabiler Sim-Eventname, zum Beispiel `ultAnansiWeb`. Ein Event bezeichnet eine
  sichtbare Phase, nicht den ganzen Skilltext.
- `anchor`: `source`, `target`, `enemy`, `ally`, `cell` oder `path`. Dauerhafte Flächen liegen auf
  der Ground-Layer und folgen keinem bereits entfernten Ziel.
- `telegraph`: dünne, kontrastreiche Vorwarnung der echten Zielgeometrie. Der Atlas darf Radius,
  Richtung oder Zielzahl nicht größer vortäuschen als die Mechanik.
- `impact`: einmaliger Peak am tatsächlichen Trefferzeitpunkt. Mehrphasige Skills erhalten
  getrennte Events für Start, Treffer und Ende.
- `persistent`: nur über `authoredFx.keep()`; Schlüssel ist die konkrete Zone, Markierung oder
  Einheit. Ende und Crossfade folgen dem Sim-Zustand.
- `fallback`: vorhandene Formen aus `fx-kit.js` wie Ring, Projektil, Bogen, Partikel oder statische
  Kontur. Wichtige Lesbarkeit darf nie ausschließlich in einem Clip stecken.
- `replace: true` ist nur erlaubt, wenn der Clip dieselbe Information klarer darstellt. Projektil,
  Kettenverbindung, Heilfluss und echte Bereichsgrenze bleiben normalerweise erhalten.
- Reduced Motion zeigt höchstens eine statische Kontur plus einen kurzen Impact ohne Drift,
  Flackern oder wiederholte Vollbildblitze.
- Bestehende Clip-Familien (`fire`, `ice`, `water`, `heal`, `holy`, `shadow`, `feather`, `cosmic`,
  `wind`, `shockwave`, `venom`, `stone`, `lightning`, `buff`, `blast`) werden zuerst wiederverwendet.
  Neue Atlanten lohnen sich nur für eine unverwechselbare Silhouette wie Netz, Tinte oder
  Sonnenspiegel.

## Priorität A – zuerst prototypisieren

Diese sechs Helden decken je eine Klasse ab, verbreitern die Kulturkreise sofort und testen
Mechaniken, die der aktuelle Kader noch nicht klar besetzt.

Die laufenden Nummern sind stabile **Konzeptnummern**. Die endgültige 30er-Auswahl steht am Ende;
fünf nummerierte Konzepte sind bewusst als austauschbare Reserven enthalten.

### 1. Achilles — Der ungebrochene Wall

- **Herkunft:** griechische Epik · **Klasse/Slot:** Tank, Road · **Seltenheit:** Legendary
- **Gruppen:** `greek`, `divine-guardians` · **Rolle:** Einzel-Choke, Elite-Duell, Rettungsanker
- **Basisangriff – Pelischer Stoß:** kurzer Speerstoß auf den vordersten gehaltenen Gegner.
- **Signatur – Verwundbare Ferse:** Solange Achilles über 50 % HP besitzt, nimmt er 15 % weniger
  Schaden. Darunter endet der Schutz, seine Angriffsgeschwindigkeit steigt jedoch um 20 %.
- **Ultimate – Schwur vor Troja:** 6 s lang hält er zwei zusätzliche Gegner, wird unbeweglich und
  erhält einen Schild über 30 % seiner maximalen HP. Beim Ende stößt er alle gehaltenen normalen
  Gegner einen Schritt zurück.
- **Skillstufen:** I Basiseffekt; II Schild 35 %; III Dauer 7 s; IV Cooldown −10 %; V der Schild
  schützt auch den Road-Verbündeten direkt hinter ihm mit halber Stärke.
- **Evolution V – Kleos:** Fällt Achilles während des Schwurs erstmals pro Stage auf 0 HP, bleibt
  er 3 s bei 1 HP stehen; danach endet der Effekt normal.
- **Signature-Talente:** **Bronzewall** – +1 weiterer Block, aber kein Rückstoß. **Fersenjagd** –
  kein Zusatzblock; während des Schwurs +80 % Schaden gegen Elites und Bosse.
- **Designrichtung:** heroische schwere Bronze, langer Speer und großer Rundschild; helle, ernste
  Silhouette statt überladener Gladiatorenrüstung; die Ferse nur als dezentes Lichtmotiv.
- **Effekseer:** `ultAchillesOath` am Caster; bronzegoldene vertikale Schildplatten, schmaler echter
  Hold-Ring am Boden, weißer Speerkern. Ende mit `ultAchillesRelease` als nach vorn laufende
  Staubkante. Bestehende Clips: `holy` + `stone`; neue Atlasfamilie nicht nötig. Fallback:
  statischer Schildbogen und Ground-Ring. Reduced Motion: feste Bronzekontur, ein Endblitz.

### 2. Maui — Der Inselheber

- **Herkunft:** polynesische Überlieferungen · **Klasse/Slot:** Warrior, Road · **Seltenheit:** Legendary
- **Gruppen:** `wildborn`, `elder-powers` · **Rolle:** Gruppenkontrolle und Wegkorrektur
- **Basisangriff – Haken des Fischers:** weiter Hieb mit dem magischen Haken; cleavt Gegner vor ihm.
- **Signatur – Inselzug:** Jeder fünfte Basisangriff zieht das am weitesten fortgeschrittene
  normale Ziel leicht zu Maui zurück; Bosse werden stattdessen kurz verlangsamt.
- **Ultimate – Die See wird Land:** Maui schlägt den Haken in den Weg. Eine Steinrippe bricht
  hervor, trifft Gegner in einer Linie für 180 % ATK, macht sie Wet und zieht normale Gegner bis
  zu 70 px zur Einschlaglinie zurück.
- **Skillstufen:** I Basiseffekt; II 210 % ATK; III Zug 90 px; IV Cooldown −10 %; V Wet dauert 6 s.
- **Evolution V – Gezähmte Sonne:** Nach dem Einschlag erhält Maui 6 s lang +35 % Angriffstempo;
  seine Hakenangriffe bremsen getroffene Gegner kurz.
- **Signature-Talente:** **Inselkette** – zwei parallele kürzere Rippen, je 70 % Schaden. **Großer
  Fang** – nur ein Zielkorridor, dafür doppelte Zugkraft und +100 % gegen Elites.
- **Designrichtung:** kraftvoller Navigator und Trickster mit ozeanisch geschnitztem Haken;
  natürliche Fasern, Muschel und vulkanischer Stein, keine generische Piratenoptik.
- **Effekseer:** `ultMauiHook` als gebogener Hakenweg, dann `ultMauiRidge` auf der Ground-Layer:
  blaugrüne Gischt trennt sich an einer dunklen Steinrippe. `water` + `stone`; der Zugweg bleibt
  als prozedurale Pfeilkontur lesbar. Reduced Motion: feste Linienkontur und ein Wassersplash.

### 3. Anansi — Der Weber der Wege

- **Herkunft:** Akan/Westafrika · **Klasse/Slot:** Assassin, Road · **Seltenheit:** Legendary
- **Gruppen:** `wildborn`, `elder-powers` · **Rolle:** Runner-Fang, Zielumleitung, Poison-Setup
- **Basisangriff – Geschichtenfaden:** zwei schnelle Dolch-/Fadenhiebe auf ein loses Ziel.
- **Signatur – Der dritte Knoten:** Drei Treffer auf dasselbe Ziel markieren es; der nächste
  Treffer vergiftet es und lässt Anansi zu einem anderen ungebundenen Gegner springen.
- **Ultimate – Netz aus tausend Geschichten:** Ein Netz fällt auf einen Kreis um das schwächste
  lose Ziel. Bis zu fünf normale Gegner werden 2.5 s gestunnt; danach zieht jeder gerissene Faden
  das Ziel 30 px rückwärts und verursacht 120 % ATK.
- **Skillstufen:** I Basiseffekt; II sechs Ziele; III 150 % ATK; IV Cooldown −10 %; V Netzradius +25 %.
- **Evolution V – Die Geschichte kehrt um:** Stirbt ein gefangenes Ziel, springt ein Restfaden auf
  den am weitesten fortgeschrittenen ungefangenen Gegner und bindet ihn 1.5 s.
- **Signature-Talente:** **Klebrige List** – kein Rückzug, dafür 5 s Poison. **Endloser Faden** –
  nur drei Ziele, aber Restfäden können zweimal weiterspringen.
- **Designrichtung:** eleganter menschlicher Trickster mit subtilen Spinnenmotiven, gewebten
  Goldmustern und asymmetrischem Mantel; keine monsterhafte Riesenspinne als Hauptform.
- **Effekseer:** neue wiederverwendbare Familie `web`: `ultAnansiCast` am Ziel, sechs helle
  Fäden wachsen radial; `ultAnansiSnap` setzt kleine Knoten-Impacts pro betroffenem Gegner.
  Netzgeometrie stammt aus den echten Zielen, nicht aus einem dekorativen Vollkreis. Fallback:
  dünne Linien und Knotenpunkte. Reduced Motion: statisches Netz bis zum Statusende.

### 4. Thoth — Schreiber des wahren Namens

- **Herkunft:** altägyptisch · **Klasse/Slot:** Mage, Platform · **Seltenheit:** Legendary
- **Gruppen:** `egyptian`, `divine-guardians` · **Rolle:** Markierung, Magieresistenz-Brechung,
  konzentrierter Burst
- **Basisangriff – Tintenzeichen:** ein gebogen fliegendes Hieroglyphenfragment, das magisch trifft.
- **Signatur – Gezählt und gewogen:** Jeder vierte Treffer schreibt ein Zeichen auf das Ziel;
  markierte Gegner erleiden 15 % mehr Magieschaden für 4 s.
- **Ultimate – Das Wort wird wahr:** Thoth schreibt drei leuchtende Zeichen über dem Ziel. Nach
  kurzer Vorwarnung schlagen sie nacheinander für je 90 % ATK ein; der dritte Treffer kopiert den
  aktuell stärksten negativen Status des Ziels auf bis zu zwei nahe Gegner.
- **Skillstufen:** I Basiseffekt; II 100 % je Zeichen; III Kopie auf drei Gegner; IV Cooldown −10 %;
  V Vorwarnung kürzer, Statuskopie dauert +2 s.
- **Evolution V – Mondarchiv:** Gegen bereits markierte Ziele fällt ein viertes Zeichen für 120 %
  ATK und erneuert die Marke.
- **Signature-Talente:** **Wahrer Name** – alle Zeichen auf ein Ziel, +60 % gegen Bosse. **Randnotiz**
  – die Zeichen wählen drei verschiedene Ziele und kopieren jeweils einen Status.
- **Designrichtung:** würdevoller Schreiber mit Ibis-Kopf oder klarer Ibis-Maske, Mondscheibe,
  Papyrus und tiefblauer Tinte; feine Goldlinien statt Sandsturm-Klischee.
- **Effekseer:** neue Familie `ink-glyph`; `ultThothWrite` über Ziel, drei zeitlich getrennte
  `ultThothSeal`-Impacts. Normal-Layer trägt dunkle Tinte, Add-Layer cyan-goldene Glyphenkanten.
  Statuskopie zeigt einen kurzen Bogen in der Farbe des kopierten Status. Fallback: drei Runen plus
  Impaktringe. Reduced Motion: fertige Glyphen erscheinen statisch, je ein kurzer Trefferblitz.

### 5. Hou Yi — Schütze der neun Sonnen

- **Herkunft:** chinesische Mythologie · **Klasse/Slot:** Archer, Platform · **Seltenheit:** Legendary
- **Gruppen:** `divine-guardians`, `wildborn` · **Rolle:** Anti-Flyer, Linienpierce, Zielpriorität
- **Basisangriff – Krähenfederpfeil:** schneller Pfeil; verursacht gegen Flyer wie andere Archer
  den Klassenbonus und baut zusätzlich Sonnenhitze auf.
- **Signatur – Zehn am Himmel:** Treffer auf Flyer oder Elites geben einen Sonnenzähler, maximal 9.
  Jeder Zähler erhöht den nächsten Ultimate-Schaden um 4 % und wird beim Cast verbraucht.
- **Ultimate – Neun Sonnen fallen:** Hou Yi markiert bis zu neun Gegner im Muster, Flyer zuerst,
  und schießt nacheinander je einen Sonnenpfeil für 95 % ATK. Dasselbe Ziel kann höchstens dreimal
  getroffen werden.
- **Skillstufen:** I Basiseffekt; II 105 % pro Pfeil; III Zielmaximum 10; IV Cooldown −10 %; V
  getroffene Flyer werden 2 s gestunnt.
- **Evolution V – Der letzte Himmel:** Bleibt nur ein gültiges Ziel, bündeln sich alle verbleibenden
  Pfeile darauf, ab dem vierten Treffer jedoch nur noch mit 45 % Schaden.
- **Signature-Talente:** **Sonnenjäger** – Flyer-Priorität, jeder Kill erzeugt einen neuen Pfeil.
  **Dürrebrecher** – maximal fünf Pfeile; jeder explodiert klein und verursacht Burn.
- **Designrichtung:** mythischer Hofbogenschütze mit breitem Ritualbogen, rot-schwarzen
  Sonnenvogelmotiven und neun kleinen Lichtscheiben; keine moderne Wuxia-Standardrüstung.
- **Effekseer:** `ultHouYiMark` zeigt nur auf tatsächlich gewählten Zielen kleine Sonnenscheiben;
  `ultHouYiArrow` sind reisende Projektile, `ultHouYiImpact` ein weißgoldener Kern mit rotem Rand.
  `holy` kann den Impact ergänzen; neue `sun-arrow`-Atlasfamilie nur für die unverwechselbare
  Neunfachsalve. Reduced Motion: statische Marken und Pfeilstreaks ohne Orbit.

### 6. Amaterasu — Licht hinter dem Felsen

- **Herkunft:** Shinto/japanische Mythologie · **Klasse/Slot:** Support, Platform · **Seltenheit:** Lord
- **Gruppen:** `divine-guardians` · **Rolle:** Lord für Divine Guardians, Heilung und Reinigung
- **Basisangriff – Spiegelglanz:** warmer Lichtimpuls; Heilaktionen fließen als kleine
  Spiegelreflexe zu Verbündeten.
- **Signatur – Achtfacher Spiegel:** Ihre Aura erhöht die Heilung und Schildstärke passender
  Divine-Guardians-Helden in derselben Reihe; ihr erster Heal auf ein Ziel entfernt Slow oder Chill.
- **Ultimate – Öffnung der Felsenhöhle:** Ein Sonnenkorridor öffnet sich 6 s lang. Verbündete in
  Reichweite werden sofort um 16 % Max-HP geheilt, erhalten 20 % Angriff und sind 3 s gegen Silence
  und Root geschützt. Gegner im Licht werden geblendet und verursachen 20 % weniger Schaden.
- **Skillstufen:** I Basiseffekt; II Heilung 20 %; III Buffdauer 8 s; IV Cooldown −10 %; V Schutz
  entfernt beim Cast zusätzlich einen kontrollierenden Effekt.
- **Evolution V – Wiederkehrender Morgen:** Beim ersten Tod eines Verbündeten während des Korridors
  bleibt er bei 1 HP, erhält 15 % Max-HP und verbraucht den Schutz für sich.
- **Signature-Talente:** **Himmlische Ordnung** – stärkerer Schutz und Heal, kein Angriffsbonus.
  **Tanz vor der Höhle** – kein Todesfang; Angriffstempo +25 % und Ultimates laden 15 % schneller.
- **Designrichtung:** kaiserliche Sonnengöttin mit sakralem Spiegel, weiß-roten Gewändern und
  kontrollierter Goldsonne; ruhig und erhaben, keine Feuer-Magierin.
- **Effekseer:** neue Familie `sun-mirror`: `ultAmaterasuOpen` am Caster, ein aufgefächerter
  Lichtkorridor mit spiegelnden Rechtecken; `ultAmaterasuBless` folgt betroffenen Verbündeten kurz.
  Ground-Layer behält die echte Reichweitenkontur. Fallback: goldweißer Kegel, Spiegelglints und
  statische Buff-Pips. Reduced Motion: heller Korridor ohne Strahlenrotation, maximal ein Blitz.

## Priorität B – starke zweite Produktionswelle

### Tanks

#### 7. Guan Yu — Wächter des Eids

- **Herkunft:** chinesische Volksreligion und historische Legenden · **Slot/Rarität:** Road, Epic
- **Gruppen:** `divine-guardians` · **Rolle:** Formationstank und Gegenangriff
- **Angriff/Signatur:** schwerer Guandao-Bogen; jeder dritte geblockte Treffer lädt einen
  Gegenhieb, der bis zu drei gehaltene Gegner für 70 % ATK trifft.
- **Ultimate – Pfirsichgartenschwur:** Guan Yu und der nächste Road-Verbündete teilen 6 s lang
  erlittenen Schaden; beide erhalten 25 % Schadensreduktion und heilen sich am Ende für 12 % der
  währenddessen gemeinsam erlittenen HP.
- **Upgrades I–V:** Basis; Reduktion 30 %; Dauer 7 s; Cooldown −10 %; Heilung 18 % der erlittenen HP.
- **Evolution V:** Ein tödlicher Treffer auf den verbundenen Verbündeten wird einmal auf Guan Yu
  umgeleitet und kann ihn nicht unter 1 HP bringen.
- **Talente:** **Brüderbund** verbindet zwei Verbündete mit je halber Reduktion. **Roter Hase**
  verbindet niemanden, gibt Guan Yu aber +2 Block und häufigere Gegenhiebe.
- **Designrichtung:** würdevoller rot-grüner Kriegsgott, langer Bart, Guandao und Siegelmotive;
  historisch inspirierte Lamellenrüstung ohne Karikatur.
- **Effekseer:** `ultGuanYuOath` mit roten Siegelbändern zwischen echten Partnern, `buff`/`holy`;
  persistent folgt die Verbindung beiden Einheiten. Fallback: dünne rote Kurve plus Schildicons;
  Reduced Motion: statische Bindungslinie.

#### 8. Durga — Die Unbezwungene

- **Herkunft:** hinduistische Tradition · **Slot/Rarität:** Road, Legendary
- **Gruppen:** `divine-guardians`, `wildborn` · **Rolle:** Multi-Block und Antwort auf Schwärme
- **Angriff/Signatur:** abwechselnde Waffenhiebe; nach jedem Zielwechsel erhält der nächste Angriff
  30 % Cleave. Ihr Löwe erscheint als Begleitmotiv, nicht als separate Einheit.
- **Ultimate – Kreis der acht Waffen:** 5 s lang pariert sie jede Sekunde den nächsten Treffer und
  beantwortet ihn mit einem radialen Hieb für 90 % ATK auf alle gehaltenen Gegner.
- **Upgrades I–V:** Basis; Gegenhieb 105 %; Dauer 6 s; Cooldown −10 %; erster Gegenhieb stunnt 1 s.
- **Evolution V:** Jeder erfolgreiche Parierhieb gewährt einen stapelbaren 4-%-Schild bis 24 % HP.
- **Talente:** **Mahishas Ende** – +100 % gegen Elites/Bosse, nur ein Ziel. **Löwinnenkreis** –
  radialer Hieb trifft auch nahe ungehaltene Gegner, verursacht aber 25 % weniger Schaden.
- **Designrichtung:** majestätische Beschützerin mit klar lesbaren acht Waffen als Lichtfächer;
  ikonographisch respektvoll, nicht sexualisiert, warme Rot-/Goldpalette und Löwensilhouette.
- **Effekseer:** `ultDurgaGuard` als achtteiliger goldroter Waffenkranz am Caster; pro Parry ein
  segmentweiser `ultDurgaCounter`-Bogen. Neue `weapon-mandala`-Familie möglich. Fallback: acht
  statische Speichen und Slash; Reduced Motion: nur aktives Segment blinkt.

#### 9. Gilgamesh — König der Mauern

- **Herkunft:** mesopotamisches Epos · **Slot/Rarität:** Road, Legendary
- **Gruppen:** `elder-powers`, `divine-guardians` · **Rolle:** Bauender Tank und Choke-Verstärkung
- **Angriff/Signatur:** Keulenhieb; alle 8 s legt er einen Mauerstein ab, der seinen nächsten
  erlittenen Treffer um 20 % reduziert, maximal drei Steine.
- **Ultimate – Mauer von Uruk:** errichtet 7 s lang eine Barriere quer über seinen Road-Abschnitt.
  Sie hat 45 % seiner Max-HP, hält zwei zusätzliche normale Gegner und zerbricht danach in einen
  Steinschock für 120 % ATK.
- **Upgrades I–V:** Basis; Barriere 55 % HP; Dauer 8 s; Cooldown −10 %; Schock slowt 3 s.
- **Evolution V:** Überlebende Barriere-HP werden beim Ende zu einem Schild auf Gilgamesh.
- **Talente:** **Zedernstärke** – kleinere Barriere, reflektiert 25 % Nahkampfschaden. **Sieben Tore**
  – breitere Barriere mit +2 Block, aber ohne Endschaden.
- **Designrichtung:** massiver sumerischer König mit Lapislazuli, Löwenmotiven und Ziegelreliefs;
  Stufenbart und Keule, keine europäische Krone.
- **Effekseer:** `ultGilgameshWall` als `stone`-Ground-Loop mit lapisfarbenen Add-Fugen;
  `ultGilgameshBreak` als gerichtete Ziegeltrümmer. Persistenz folgt Barrieren-HP. Fallback:
  echte Barrierenkontur plus Risse; Reduced Motion: statische Wand und einmaliger Bruch.

#### 10. Taweret — Hüterin der Schwelle

- **Herkunft:** altägyptisch · **Slot/Rarität:** Road, Epic
- **Gruppen:** `egyptian`, `divine-guardians` · **Rolle:** Schutz schwacher Verbündeter und Anti-Leak
- **Angriff/Signatur:** schwerer Tatzenhieb; Gegner, die erstmals an ihr vorbeizukommen versuchen,
  werden einmal 1 s gestunnt.
- **Ultimate – Haus der Geburt:** 8 s lang entsteht um sie eine Schutzzone. Road-Verbündete darin
  nehmen 25 % weniger Schaden; fällt einer unter 30 % HP, heilt Taweret ihn einmal um 15 % Max-HP.
- **Upgrades I–V:** Basis; Reduktion 30 %; Zone +1 Schritt; Cooldown −10 %; Notheilung 22 %.
- **Evolution V:** Während der Zone können normale Gegner keinen ersten Blocker überspringen.
- **Talente:** **Nilwiege** – Notheilung kann zweimal auslösen, Zone kleiner. **Schreckensklaue** –
  keine Heilung; Gegner in der Zone greifen 25 % langsamer an.
- **Designrichtung:** beschützende Nilpferdgöttin mit Krokodilschwanz, Sa-Amulett und Nilblau;
  kräftig und freundlich-furchteinflößend, nicht komisch verniedlicht.
- **Effekseer:** `ultTaweretHouse` mit `water`/`holy` als ruhiger Ground-Loop innerhalb des echten
  Radius; Notheilung `ultTaweretCradle` am Ally. Fallback: blaue Kontur und Sa-Symbol; Reduced
  Motion: stehende Zone ohne Wellen.

### Warriors

#### 11. Perun — Eichendonner

- **Herkunft:** slawische Mythologie · **Slot/Rarität:** Road, Epic
- **Gruppen:** `wildborn`, `divine-guardians` · **Rolle:** Wet-Reaktion und Ketten-Cleave
- **Angriff/Signatur:** Axtschlag; gegen Wet-Ziele springt ein schwacher Blitz auf einen Nachbarn.
- **Ultimate – Donnerkeil:** wirft die Axt durch bis zu vier Gegner vor ihm für 160/130/100/70 %
  ATK; auf Wet entsteht Conduct. Die Axt kehrt zurück und trifft auf dem Rückweg erneut für 50 %.
- **Upgrades I–V:** Basis; Rückweg 65 %; fünf Ziele; Cooldown −10 %; Hauptziel Stun 1.5 s.
- **Evolution V:** Jeder Conduct-Sprung lädt die Ultimate einmal pro Cast um 3 % nach.
- **Talente:** **Eichenkrone** – kürzere Linie, beim Rückweg Schild für Perun. **Sturmgericht** –
  kein Rückweg; an jedem getroffenen Wet-Ziel fällt ein Zusatzblitz.
- **Designrichtung:** slawischer Donnergott mit Eichenholz, rotgoldener Axt und geometrischen
  Stickmustern; wettergegerbte, königliche Silhouette.
- **Effekseer:** reisende Axt bleibt prozedural; `ultPerunBolt` nutzt `lightning` pro Conduct-Ziel,
  Rückweg erzeugt Eichenfunken. Fallback: echte Flugbahn und kurze Bolts; Reduced Motion: keine
  Verzweigung, nur Trefferblitze.

#### 12. Cú Chulainn — Hund von Ulster

- **Herkunft:** irische Mythologie · **Slot/Rarität:** Road, Legendary
- **Gruppen:** `wildborn`, `elder-powers` · **Rolle:** riskanter Elite-Brecher
- **Angriff/Signatur:** Gáe-Bolg-Speerstöße; unter 40 % HP +25 % Angriff, aber −15 % Rüstung.
- **Ultimate – Ríastrad:** 7 s Kampfverwandlung: +45 % Angriffstempo, +35 % Schaden, kann nicht
  geheilt werden und verliert pro Sekunde 3 % aktuelle HP. Jeder Kill verlängert um 0.5 s, max. 3 s.
- **Upgrades I–V:** Basis; Lebensverlust 2.5 %; Schaden +45 %; Cooldown −10 %; Killverlängerung max. 4 s.
- **Evolution V:** Endet Ríastrad über 1 HP, heilt er 25 % des währenddessen verursachten Schadens.
- **Talente:** **Warp-Spasm** – mehr Tempo und Cleave, höherer Selbstverlust. **Champion’s Stand** –
  keine HP-Kosten, dafür nur gegen Elites/Bosse verstärkt.
- **Designrichtung:** junger keltischer Speerchampion; im Normalzustand klare blaue Kriegstracht,
  Transformation als verzerrte rote Silhouette statt Gore.
- **Effekseer:** `ultCuchulainnShift` mit rotem `shadow`/`shockwave`, persistent schmale
  Körper-Aura; Kills erzeugen kurze Speerwirbel. Fallback: rote Kontur und Tempo-Streaks. Reduced
  Motion: statischer roter Rand, keine Körperverzerrung.

#### 13. Ogun — Herr der geschmiedeten Wege

- **Herkunft:** Yoruba-Tradition · **Slot/Rarität:** Road, Legendary
- **Gruppen:** `divine-guardians`, `wildborn` · **Rolle:** Rüstungsbruch und Team-Enabler
- **Angriff/Signatur:** Macheten-/Eisenhieb; jeder vierte Treffer senkt gegnerische Rüstung 4 s um 15 %.
- **Ultimate – Straße aus Eisen:** Ogun schlägt eine glühende Linie vor sich frei. Gegner darauf
  erleiden 190 % ATK und Expose 5 s; Road-Verbündete, deren Angriffe die Linie kreuzen, verursachen
  20 % mehr physischen Schaden.
- **Upgrades I–V:** Basis; 220 %; Linie +1 Schritt; Cooldown −10 %; Expose 7 s.
- **Evolution V:** Der erste physische Treffer jedes Verbündeten auf ein exponiertes Ziel stunnt
  dieses einmal 0.6 s.
- **Talente:** **Schmiedefeuer** – Linie verursacht Burn und mehr Eigenschaden. **Wegbereiter** –
  weniger Schaden, aber Team-Bonus 30 % und längere Linie.
- **Designrichtung:** ehrwürdiger Schmied und Wegöffner mit Eisenwerkzeugen, grünen Akzenten und
  glühender Klinge; kulturelle Perlen-/Textilmuster sorgfältig recherchieren.
- **Effekseer:** `ultOgunRoad` als gerichteter `fire`-Ground-Strip mit dunklen Eisenspänen;
  `ultOgunExpose` als kurzes orangefarbenes Bruchzeichen. Neue Linie wird von echter Geometrie
  bestimmt. Fallback: glühende Bodenkante; Reduced Motion: feste Eisenlinie.

#### 14. Huitzilopochtli — Kolibri des Mittags

- **Herkunft:** mexica/aztekische Mythologie · **Slot/Rarität:** Road, Legendary
- **Gruppen:** `divine-guardians`, `wildborn` · **Rolle:** aggressiver Wellenstarter
- **Angriff/Signatur:** Xiuhcoatl-Hieb; der erste Angriff auf ein volles Ziel verursacht +35 %.
- **Ultimate – Türkisfeuerschlange:** Eine Feuerschlange rast in einem schmalen Korridor vorwärts,
  trifft alle Gegner für 170 % ATK und Burn; nach 2 s kehrt sie auf einer benachbarten Linie zurück.
- **Upgrades I–V:** Basis; 195 %; Rückweg 140 %; Cooldown −10 %; Burn 40 % stärker.
- **Evolution V:** Auf dem Hinweg getötete Gegner erzeugen je einen kleinen Sonnenburst, begrenzt auf fünf.
- **Talente:** **Kolibriflug** – schmaler, schneller Dreifachlauf mit geringerem Schaden. **Mittagssonne**
  – kein Rückweg, dafür breite Explosion am Ende.
- **Designrichtung:** türkis-goldener Kriegergott mit Kolibrifedern und Feuerschlangenwaffe;
  archäologisch inspirierte Formen, keine vermischte Maya-/Mexica-Fantasy.
- **Effekseer:** neue `fire-serpent`-Familie für Hin-/Rückweg; Kopfposition folgt echter Path-Linie,
  `fire` ergänzt Burn-Impacts. Fallback: reisende türkisrote Glutkugel mit Schlangenspur. Reduced
  Motion: einfacher gerader Feuerstreifen ohne Schlängeln.

#### 15. Sekhmet — Die ferne Glut

- **Herkunft:** altägyptisch · **Slot/Rarität:** Road, Epic
- **Gruppen:** `egyptian`, `wildborn` · **Rolle:** Sustain-Warrior und Burn-Ernte
- **Angriff/Signatur:** löwenhafter Klingenhieb; heilt 5 % des Schadens an brennenden Gegnern.
- **Ultimate – Atem der Wüste:** dreiteiliger Kegel für insgesamt 240 % ATK. Brennende Gegner
  explodieren ihren restlichen Burn sofort; die Explosion kann Burn nicht erneut verbreiten.
- **Upgrades I–V:** Basis; 270 %; Kegel +20 %; Cooldown −10 %; Burn-Ernte heilt Sekhmet für 15 %.
- **Evolution V:** Überheilung aus der Ultimate wird 6 s lang zu einem Schild, max. 25 % HP.
- **Talente:** **Rote Herrin** – mehr Burn-Burst, kein Schild. **Heilende Sekhmet** – halbierter
  Schaden, dafür heilt die Druckwelle Road-Verbündete.
- **Designrichtung:** löwenköpfige Kriegerin mit Sonnenscheibe, rotem Leinen und bronzener
  Khopesh; Hitzeverzerrung statt beliebiger Flammenrüstung.
- **Effekseer:** `ultSekhmetBreath` als dreistufiger `fire`-Kegel, Burn-Ernte mit kleinen
  `blast`-Impacts pro Ziel. Fallback: drei transparente Kegelkonturen. Reduced Motion: ein
  statischer Hitzekegel plus Zielblitze.

### Assassins

#### 16. Izanami — Herrin von Yomi

- **Herkunft:** japanische Mythologie · **Slot/Rarität:** Road, Legendary
- **Gruppen:** `underworld`, `elder-powers` · **Rolle:** Anti-Heal und Todesschwelle
- **Angriff/Signatur:** dunkler Fächer-/Speerhieb; getroffene Mender heilen 30 % weniger für 4 s.
- **Ultimate – Tor von Yomi:** öffnet hinter dem schwächsten Gegner ein Tor. Izanami tritt hindurch,
  trifft ihn für 230 % ATK und markiert ihn 6 s. Stirbt er markiert, fügt das Tor zwei nahen Gegnern
  90 % ATK zu; überlebt er, wird er 50 px rückwärts gezogen.
- **Upgrades I–V:** Basis; 260 %; Marke 8 s; Cooldown −10 %; Todesschock trifft drei Gegner.
- **Evolution V:** Ein markierter Nicht-Boss unter 10 % HP wird vom nächsten Izanami-Treffer exekutiert.
- **Talente:** **Totenland** – größerer Todesschock, kein Rückzug. **Verbotener Blick** – kein
  Todesschock; Ziel wird 3 s gestunnt und erhält Expose.
- **Designrichtung:** erhabene Unterweltskönigin in zerfallenden Hofgewändern, schwarzer Kamm und
  weiße Totenblüten; tragisch statt grotesk.
- **Effekseer:** `ultIzanamiGate` neue `yomi-gate`-Familie auf Ground-/Normal-Layer; `shadow`
  ergänzt den Treffer. Markierungsdauer hat eine kleine statische Torkontur am Ziel. Fallback:
  dunkle Ellipse und Blütenpartikel. Reduced Motion: geschlossenes Torzeichen, kurzer Cut.

#### 17. Camazotz — Fledermaus der tiefen Kammer

- **Herkunft:** K’iche’-Maya-Überlieferung · **Slot/Rarität:** Road, Epic
- **Gruppen:** `underworld`, `wildborn` · **Rolle:** Backline-Jagd und Silence-Antwort
- **Angriff/Signatur:** Sichelklauen; Treffer auf Hexer und Mender laden die Ultimate 8 % schneller.
- **Ultimate – Haus der Fledermäuse:** Camazotz springt zum hintersten Spezialgegner, trifft für
  200 % ATK und erzeugt drei Echowellen. Jede Welle verursacht 45 % ATK und unterbricht normale
  Gegner für 0.3 s.
- **Upgrades I–V:** Basis; Sprung 230 %; vier Echowellen; Cooldown −10 %; letzte Welle slowt 3 s.
- **Evolution V:** Stirbt das Hauptziel, springt Camazotz sofort zu einem zweiten Spezialgegner.
- **Talente:** **Schneidende Nacht** – stärkere Einzelziel-Sichel, nur eine Welle. **Echoschwarm** –
  sechs schwächere Wellen mit größerem Radius.
- **Designrichtung:** Maya-Unterweltwesen mit Obsidianflügeln und zeremonieller Halsplatte;
  klare Fledermaussilhouette, keine vampirische Europäisierung.
- **Effekseer:** `ultCamazotzDive` mit `shadow` und gerichteten Afterimages; `ultCamazotzEcho`
  erzeugt exakt gezählte sichelförmige Wellen. Neue `sonic-crescent`-Familie optional. Fallback:
  konzentrische Halbkreise. Reduced Motion: Sprungstreak plus eine statische Echokontur.

#### 18. Ereshkigal — Königin des großen Unten

- **Herkunft:** mesopotamische Mythologie · **Slot/Rarität:** Road, Legendary
- **Gruppen:** `underworld`, `elder-powers` · **Rolle:** Debuff-Sammlerin und Bossdruck
- **Angriff/Signatur:** dunkler Stabstoß; gegen Ziele mit mindestens zwei Debuffs +25 % Schaden.
- **Ultimate – Sieben Tore:** Das Ziel durchläuft sieben schnelle Siegel. Jedes entfernt einen
  positiven Zustand oder verursacht, falls keiner vorhanden ist, 35 % ATK. Der siebte Treffer
  verursacht zusätzlich 140 % und Expose 5 s.
- **Upgrades I–V:** Basis; Einzeltreffer 42 %; Expose 7 s; Cooldown −10 %; siebter Treffer 180 %.
- **Evolution V:** Jeder entfernte positive Zustand verlängert Expose um 1 s, maximal 4 s.
- **Talente:** **Nackte Wahrheit** – stärker gegen Bosse, keine Buff-Entfernung nötig. **Torwächterin**
  – verteilt sieben Siegel auf bis zu drei Ziele, schwächerer Abschluss.
- **Designrichtung:** sumerische Königin mit sieben abnehmenden Schmuckschichten, dunklem
  Lapislazuli und Löwenthron-Motiven; monumental, nicht als Skelettkönigin.
- **Effekseer:** `ultEreshkigalGate1..7` kann aus einem parametrisierten `shadow`/`stone`-Clip mit
  sieben Ringsegmenten entstehen; Abschluss `blast` in Violett-Lapis. Fallback: sieben kleine
  Siegel-Pips, die nacheinander erlöschen. Reduced Motion: Pips wechseln ohne Zoom.

#### 19. Veles — Der Wandelnde unter den Wurzeln

- **Herkunft:** slawische Mythologie · **Slot/Rarität:** Road, Epic
- **Gruppen:** `underworld`, `wildborn` · **Rolle:** Burrower-Jagd und Giftkontrolle
- **Angriff/Signatur:** Schlangenstab; kann untergetauchte Burrower beim Auftauchen sofort
  priorisieren und vergiftet sie.
- **Ultimate – Wurzelpfad:** Veles verschwindet und taucht an bis zu drei fortgeschrittenen losen
  Gegnern nacheinander auf, je 100 % ATK und Poison; Rückkehr an den Ausgangspunkt.
- **Upgrades I–V:** Basis; 115 %; vier Ziele; Cooldown −10 %; Poison 50 % stärker.
- **Evolution V:** Jeder vergiftete Gegner, der während des Pfads stirbt, gibt einen Zusatzsprung.
- **Talente:** **Schlangenwechsel** – weniger Ziele, jeder Treffer hinterlässt Blight-fähigen
  starken Poison. **Viehherr** – kein Poison, dafür zieht jeder Sprung das Ziel leicht zurück.
- **Designrichtung:** wandlungsfähiger slawischer Unterweltsgott mit Wurzeln, Wolle, Hörnern und
  Schlangenschatten; erdig-grün, nicht als generischer Dämon.
- **Effekseer:** `ultVelesBurrow` als dunkle Wurzelspur auf Ground-Layer, `venom` am Auftauchen.
  Fallback: gebogene Bodenlinie und grüner Impact. Reduced Motion: Ursprung/Ziele durch feste
  Wurzelsymbole verbunden.

#### 20. Morrígan — Krähe der Entscheidung

- **Herkunft:** irische Mythologie · **Slot/Rarität:** Road, Legendary
- **Gruppen:** `underworld`, `wildborn` · **Rolle:** Zielmarke und Team-Fokus
- **Angriff/Signatur:** Speerhieb mit Krähenfeder; markiert alle 6 s den am weitesten
  fortgeschrittenen Gegner, der von Assassins 15 % mehr Schaden nimmt.
- **Ultimate – Vorzeichen des Falls:** Drei Krähen wählen je ein Ziel: vorderstes, schwächstes und
  stärkstes. Nach 1 s treffen sie für 130 % ATK. Trifft mehr als eine Krähe dasselbe Ziel, verursacht
  jede weitere +50 % Schaden.
- **Upgrades I–V:** Basis; 145 %; Vorwarnung 0.7 s; Cooldown −10 %; Mehrfachbonus 70 %.
- **Evolution V:** Stirbt eines der drei Ziele, erhält der nächste gültige Gegner dessen Krähe.
- **Talente:** **Eine Schlacht** – alle Krähen fokussieren das stärkste Ziel. **Drei Schicksale** –
  getrennte Ziele werden zusätzlich 3 s exponiert.
- **Designrichtung:** souveräne keltische Kriegsprophetin mit Speer, schwarzem Federumhang und
  rotem Flussmotiv; Krähen als Boten, nicht als Hexenklischee.
- **Effekseer:** `ultMorriganMark` mit drei echten Zielmarken; `feather`-Reiseflüge und dunkle
  Speerimpacts. Fallback: Federbögen. Reduced Motion: drei statische Krähen-Silhouetten, dann Cuts.

### Mages

#### 21. Quetzalcoatl — Gefiederter Wind

- **Herkunft:** mesoamerikanische, besonders Nahua/Mexica-Traditionen · **Slot/Rarität:** Platform, Lord
- **Gruppen:** `wildborn`, `divine-guardians` · **Rolle:** Lord für Wildborn, Wind und Wet-Verteilung
- **Angriff/Signatur:** gefiederter Windwirbel; jeder dritte Treffer schiebt normale Gegner 10 px
  zurück. Lord-Aura stärkt Wildborn derselben Reihe.
- **Ultimate – Wind der fünften Sonne:** Eine breite Windfront wandert über seine Reihe, trifft für
  160 % ATK, verteilt Wet von bereits nassen Zielen auf Nachbarn und schiebt normale Gegner 45 px.
- **Upgrades I–V:** Basis; 185 %; Front +1 Schritt; Cooldown −10 %; Rückstoß 60 px.
- **Evolution V:** Trifft die Front mindestens drei Wet-Ziele, folgt ein zweiter, schwächerer Windstoß.
- **Talente:** **Edelsteinatem** – kein Rückstoß, dafür Expose. **Gefiederte Flut** – weniger Schaden,
  aber alle Ziele werden Wet und stärker geslowt.
- **Designrichtung:** gefiederte Schlangengottheit als erhabene humanoide Priester-/Windgestalt;
  Türkis, Quetzalfedern und Muschelwind, keine Drachenkopie.
- **Effekseer:** neue `feather-wind`-Familie für die wandernde Front, kombiniert mit `water` bei
  Wet-Übertragung. Fallback: breite Windlinie plus echte Zielimpacts. Reduced Motion: transparente
  Frontkante ohne wirbelnde Federn.

#### 22. Baba Yaga — Die Hütte am Rand

- **Herkunft:** slawische Folklore · **Slot/Rarität:** Platform, Epic
- **Gruppen:** `wildborn`, `underworld` · **Rolle:** Zonenmagierin und zufallsarme Hexenküche
- **Angriff/Signatur:** glühender Mörserbolzen; wechselt fest zwischen Burn, Chill und Poison,
  statt zufällig zu würfeln.
- **Ultimate – Mörserkreis:** Rührt 5 s eine Zone am Ziel. Jede Sekunde folgt in derselben festen
  Reihenfolge Burn, Chill, Poison, Burn, dann ein Abschlussburst; vorhandene Reaktionen lösen aus.
- **Upgrades I–V:** Basis; Tickschaden +15 %; Radius +20 %; Cooldown −10 %; Abschlussburst +50 %.
- **Evolution V:** Der Abschluss wiederholt den Status, der im Kreis am häufigsten reagiert hat.
- **Talente:** **Knochenzaun** – kleinerer Kreis, normale Gegner können ihn nicht schnell verlassen.
  **Hühnerbeine** – Zone wandert langsam mit dem vordersten Gegner, aber −25 % Schaden.
- **Designrichtung:** gefährliche alte Grenzwächterin mit Mörser, Birkenbesen und angedeuteter
  Hühnerbein-Hütte; folkloristisch eigenwillig, nicht niedliche Märchenhexe.
- **Effekseer:** `ultBabaCauldron` persistenter Ground-Loop mit drei farblich getrennten Phasen;
  bestehende `fire`, `ice`, `venom`-Clips werden zeitlich verkettet. Fallback: farbiger Kreis und
  Status-Pips. Reduced Motion: statischer Kreis, Farbe wechselt pro Tick.

#### 23. Brigid — Flamme der Inspiration

- **Herkunft:** irische Mythologie · **Slot/Rarität:** Platform, Epic
- **Gruppen:** `divine-guardians`, `elder-powers` · **Rolle:** Hybrid aus Magie und Support
- **Angriff/Signatur:** kleine Schmiedeflamme; jeder fünfte Treffer gibt dem am niedrigsten
  geladenen Verbündeten in Reichweite 3 % Ultimate-Ladung.
- **Ultimate – Dreifache Flamme:** Drei Feuer erscheinen: Schmiede trifft Gegner für 140 % ATK,
  Heilherd heilt Verbündete um 12 % Max-HP, Inspiration gibt 15 % Ultimate-Ladung.
- **Upgrades I–V:** Basis; Schaden 165 %; Heilung 15 %; Cooldown −10 %; Ladung 20 %.
- **Evolution V:** Jede Flamme hinterlässt 5 s eine kleine Zone: Burn, Heal-over-Time bzw. Charge-Tempo.
- **Talente:** **Schmiedin** – alle drei Flammen werden offensiv. **Herdhüterin** – kein Schaden;
  Heilung und Schilde werden verdoppelt.
- **Designrichtung:** dreifache keltische Göttin mit Herdfeuer, Schmiedezange und poetischem
  Lichtband; weiße Kleidung, rote Haare und Messing, keine christlichen Symbole vermischen.
- **Effekseer:** drei getrennte Events und Anker: `ultBrigidForge` am Ziel (`fire`),
  `ultBrigidHearth` am Caster (`heal`), `ultBrigidMuse` auf Allies (`buff`). Fallback: drei klare
  Symbole. Reduced Motion: ein kurzer Impuls pro Funktion.

#### 24. Tezcatlipoca — Rauchender Spiegel

- **Herkunft:** mexica/aztekische Mythologie · **Slot/Rarität:** Platform, Legendary
- **Gruppen:** `underworld`, `elder-powers` · **Rolle:** Illusion, Zielschwächung, Bosskontrolle
- **Angriff/Signatur:** schwarzer Spiegelstrahl; jeder sechste Treffer erzeugt ein Spiegelbild,
  das den nächsten gegnerischen Fernangriff auf dieses Ziel wirkungslos macht.
- **Ultimate – Nachtwind im Spiegel:** Markiert bis zu vier Gegner 6 s. 30 % ihres verursachten
  Schadens wird als Schattenschaden auf sie selbst zurückgeworfen; Bosse reflektieren nur 12 %.
- **Upgrades I–V:** Basis; normale Gegner 35 %; fünf Ziele; Cooldown −10 %; Dauer 8 s.
- **Evolution V:** Markierte Gegner sind zusätzlich 20 % verlangsamt; stirbt einer, springt seine
  Restdauer auf ein nahes Ziel.
- **Talente:** **Jaguarennacht** – nur ein Ziel, starke Bossreflexion. **Vier Richtungen** – sechs
  Ziele, niedrigere Reflexion und kein Slow.
- **Designrichtung:** schwarzer Obsidianspiegel, rauchender Fuß und Jaguar-Nachtmotive; präzise
  Mexica-Formensprache, keine generische Totenkopfästhetik.
- **Effekseer:** neue `smoke-mirror`-Familie; `ultTezcatMark` folgt jedem markierten Gegner als
  dunkle Spiegelscherbe, Rückschaden `ultTezcatReflect` verbindet Trefferquelle und Ziel nur kurz.
  Fallback: Obsidianraute und schwarze Rauchkante. Reduced Motion: statische Raute.

#### 25. Circe — Herrin der Wandlung

- **Herkunft:** griechische Mythologie · **Slot/Rarität:** Platform, Epic
- **Gruppen:** `greek`, `wildborn` · **Rolle:** Massenkontrolle ohne neue permanente Statusart
- **Angriff/Signatur:** Kräuterfläschchen mit kleinem Splash; zyklisch Poison auf jedem vierten Wurf.
- **Ultimate – Becher der Wandlung:** Bis zu vier normale Gegner werden 3 s in harmlose Tiere
  verwandelt: Sie bewegen sich 40 % langsamer, greifen nicht an und verlieren vorübergehend ihre
  Spezialfähigkeit. Elites erhalten stattdessen Slow und Expose; Bosse nur Expose.
- **Upgrades I–V:** Basis; fünf Ziele; Dauer 4 s; Cooldown −10 %; Elites zusätzlich 1 s Stun.
- **Evolution V:** Beim Ende der Wandlung erleiden Ziele 120 % ATK und Poison.
- **Talente:** **Löwenkelch** – Ziele greifen andere Gegner kurz an, keine Verlangsamung. **Schweinehürde**
  – größere Zielzahl, aber keine Endexplosion.
- **Designrichtung:** souveräne Inselzauberin mit Bronzekelch, Kräutern und dezenten Tiermasken;
  dunkles Violett und Meergrün statt Halloween-Hexe.
- **Effekseer:** `ultCircePour` reist als violettgrüner Flüssigkeitsbogen; `ultCirceTransform`
  nutzt `cosmic` plus kurze Tiersilhouetten über den echten Zielen. Die eigentliche Einheit bleibt
  erkennbar. Fallback: Tiermasken-Icon und Statuskontur. Reduced Motion: statisches Maskensymbol.

### Archers

#### 26. Arjuna — Träger von Gandiva

- **Herkunft:** hinduistisches Mahabharata · **Slot/Rarität:** Platform, Legendary
- **Gruppen:** `divine-guardians` · **Rolle:** Präzisionsschütze und Boss-Duell
- **Angriff/Signatur:** präziser Gandiva-Pfeil; wiederholte Treffer auf dasselbe Ziel bauen Fokus
  bis 5 auf, je +4 % Schaden; Zielwechsel setzt zurück.
- **Ultimate – Astras der Pflicht:** Wählt ein Ziel und feuert drei verschiedene Astras: Wind
  durchdringt die Linie für 80 %, Feuer trifft das Ziel für 140 % plus Burn, Licht trifft für 180 %.
- **Upgrades I–V:** Basis; Feuer 165 %; Licht 210 %; Cooldown −10 %; Wind lädt Fokus pro Treffer.
- **Evolution V:** Bei vollem Fokus folgt ein viertes, nicht-elementares Astra für 220 % gegen das Hauptziel.
- **Talente:** **Kurukshetra** – alle Astras fokussieren einen Boss. **Gandivas Regen** – jede Phase
  wählt ein anderes Ziel und splasht klein.
- **Designrichtung:** königlicher Bogenschütze mit großem Gandiva, goldener Krone und kontrollierter
  himmlischer Waffenikonographie; respektvoll, nicht als austauschbarer Fantasy-Ranger.
- **Effekseer:** drei klar getrennte Projektile: `wind`, `fire`, `holy`; echter Pfeilflug bleibt
  sichtbar. Fallback: drei farbige Pfeilspuren. Reduced Motion: keine Spiralen, nur Farbkern je Pfeil.

#### 27. Neith — Weberin des ersten Pfeils

- **Herkunft:** altägyptisch · **Slot/Rarität:** Platform, Legendary
- **Gruppen:** `egyptian`, `elder-powers` · **Rolle:** Lane-Kontrolle und Schutzfäden
- **Angriff/Signatur:** gewebter Lichtpfeil; jeder Treffer spannt kurz einen Faden zum nächsten
  Gegner, der bei Kontakt 20 % Splash verursacht.
- **Ultimate – Webstuhl der Schöpfung:** Spannt drei leuchtende Linien über gewählte Road-
  Segmente. Gegner, die sie in 7 s kreuzen, erleiden einmal 110 % ATK und werden 2 s verlangsamt.
- **Upgrades I–V:** Basis; 130 %; vier Linien; Cooldown −10 %; Slow 3 s.
- **Evolution V:** Jede ausgelöste Linie gibt dem nächsten Verbündeten in der Reihe einen 6-%-Schild.
- **Talente:** **Erster Morgen** – eine breite starke Linie mit Burn-Licht. **Unsichtbares Gewebe** –
  fünf schwächere Linien und stärkere Schilde.
- **Designrichtung:** uralte Weber- und Kriegsgöttin mit roter Krone, Bogen und geometrischen
  Webfäden; kosmisch-alt statt mumienhaft.
- **Effekseer:** neue `light-thread`-Familie; `ultNeithLoom` als persistente Ground-Linien, Trigger
  `ultNeithSnap` auf dem Kreuzungspunkt. Fallback: klare leuchtende Linien. Reduced Motion:
  unveränderte Linien ohne Wabern.

#### 28. Lugh — Meister des langen Arms

- **Herkunft:** irische Mythologie · **Slot/Rarität:** Platform, Epic
- **Gruppen:** `divine-guardians`, `wildborn` · **Rolle:** flexible Zielabdeckung
- **Angriff/Signatur:** Fernwurf des Speers; wechselt nach jedem dritten Treffer zwischen
  Durchbohren (Linie) und Splitterwurf (zwei Ziele).
- **Ultimate – Speer des Sieges:** Wirft einen blendenden Speer entlang der längsten besetzten
  Lane. Er trifft bis zu acht Gegner für 100 % ATK; der letzte Getroffene erleidet 180 % und Stun 2 s.
- **Upgrades I–V:** Basis; Linie 115 %; zehn Ziele; Cooldown −10 %; Endtreffer 230 %.
- **Evolution V:** Der Speer kehrt zurück und trifft überlebende Ziele für 50 %.
- **Talente:** **Viele Künste** – Speer splittet an einer Kreuzung. **Unfehlbare Hand** – nur fünf
  Ziele, dafür jedes weitere stärker als das vorherige.
- **Designrichtung:** leuchtender junger Meister vieler Künste mit langem Speer, Sonnenscheibe und
  keltischen Metallarbeiten; keine römische Legionärsästhetik.
- **Effekseer:** reisender Speer bleibt prozedural; `holy`/`wind` an Treffern und heller Endimpact.
  Fallback: Speerstreak und Trefferzählung. Reduced Motion: gerader Lichtstreifen ohne Nachbilder.

#### 29. Karna — Sohn der Sonne

- **Herkunft:** hinduistisches Mahabharata · **Slot/Rarität:** Platform, Legendary
- **Gruppen:** `divine-guardians`, `elder-powers` · **Rolle:** Rüstungsdurchdringung mit Opferfenster
- **Angriff/Signatur:** goldener Pfeil ignoriert 10 % Rüstung; jeder zehnte Treffer verstärkt dies
  auf 50 %.
- **Ultimate – Vasavi Shakti:** Nach 1.2 s Vorwarnung ein einziger Speerwurf für 420 % ATK, der
  70 % Rüstung ignoriert. Danach verliert Karna 8 s lang 20 % Angriff und seine passive
  Rüstungsdurchdringung.
- **Upgrades I–V:** Basis; 460 %; Vorwarnung 0.9 s; Cooldown −10 %; Schwächung nur 6 s.
- **Evolution V:** Tötet der Speer einen Elite oder trifft einen Boss, wird die Schwächung halbiert.
- **Talente:** **Ungebrochene Rüstung** – weniger Burst, keine Nachschwächung. **Einmalige Waffe** –
  +35 % Schaden und große Explosion, aber Ultimate lädt danach 30 % langsamer.
- **Designrichtung:** strahlender, tragischer Sonnenkrieger mit natürlicher goldener Rüstung,
  königlichem Bogen und einzelnem göttlichem Speer; ernst und nicht überornamentiert.
- **Effekseer:** `ultKarnaTelegraph` als schmale goldene Ziellinie, `ultKarnaSpear` neue
  `solar-lance`-Familie, `ultKarnaExhaust` als gedämpfte Aura am Caster. Fallback: heller Speer und
  nachfolgend graue Statuskontur. Reduced Motion: ein Vorwarnstrich und ein Impact.

#### 30. Ullr — Winterjäger

- **Herkunft:** nordische Mythologie · **Slot/Rarität:** Platform, Epic
- **Gruppen:** `norse`, `wildborn` · **Rolle:** Chill-Spezialist und Anti-Runner
- **Angriff/Signatur:** Ski-Bogenschuss; Treffer auf schnelle, ungehaltene Gegner verursachen Chill.
- **Ultimate – Jagd über gefrorenen Schnee:** 6 s lang wächst seine Reichweite um einen Schritt,
  er schießt 35 % schneller und jeder dritte Pfeil durchdringt bis zu drei Gegner. Wet + Chill kann
  wie gewohnt Freeze auslösen.
- **Upgrades I–V:** Basis; Tempo +45 %; Dauer 7 s; Cooldown −10 %; jeder zweite Pfeil durchdringt.
- **Evolution V:** Gefrorene Ziele werden von Ullrs nächstem Pfeil für +100 % Schaden zerschmettert.
- **Talente:** **Skispur** – stärkere Reichweite und Runner-Priorität. **Eidring** – weniger Tempo,
  aber jeder Pierce-Pfeil gibt nahen Archern kurz +10 % Angriffstempo.
- **Designrichtung:** nordischer Winterjäger auf angedeuteten Knochenskiern, Eibenbogen und
  silbernem Eidring; schlanke Bewegungssilhouette, klar getrennt von Skadis Mondjägerin.
- **Effekseer:** `ultUllrHunt` nutzt `ice`/`wind` am Caster; Pfeile bleiben echte Projektile mit
  flacher Schneespur, Freeze-Shatter nutzt vorhandenes `frost-burst`. Fallback: statischer
  Reichweitenrand und Froststreaks. Reduced Motion: keine Schneeverwehung.

## Support-Kandidaten und Reserve

Die Prioritäten A und B enthalten bisher nur Amaterasu als Support, damit die erste Liste nicht
zu viele ähnliche Heil-Auren erzeugt. Für die gewünschte Gesamtverteilung von fünf Helden je
Klasse gehören die folgenden vier dennoch fest zum 30er-Backlog.

### 31. Saraswati — Stimme des klaren Stroms

> Saraswati gehört zur festen, klassenbalancierten 30er-Auswahl. Circe (Nr. 25) ist stattdessen
> einer der fünf vollständig ausgearbeiteten Reserveentwürfe. Die verbindliche Zusammenstellung
> steht im Abschnitt „Empfohlene Auswahl“.

- **Herkunft:** hinduistische Tradition · **Slot/Rarität:** Platform, Epic
- **Gruppen:** `divine-guardians` · **Rolle:** Ultimate-Ladung und Silence-Reinigung
- **Angriff/Signatur:** Klangwelle der Vina; jeder fünfte Heal gibt 4 % Ultimate-Ladung.
- **Ultimate – Strom der Erkenntnis:** reinigt Silence/Root von Verbündeten, heilt 16 % Max-HP und
  lässt ihre Ultimate-Ladung 6 s lang 25 % schneller wachsen.
- **Upgrades I–V:** Basis; Heilung 20 %; Dauer 8 s; Cooldown −10 %; sofort +10 % Ladung.
- **Evolution V:** Der erste währenddessen gecastete Verbündeten-Ultimate erstattet 20 % Ladung.
- **Talente:** **Vina-Raga** – stärkeres Charge-Tempo, weniger Heilung. **Weißer Strom** – starke
  Reinigung und Heal-over-Time, kein Charge-Bonus.
- **Designrichtung:** ruhige Göttin von Wissen, Musik und Fluss mit Vina, weißem Stoff und
  Schwan-/Lotusmotiven; keine Kampfmagierpose.
- **Effekseer:** `ultSaraswatiStream` als geschwungener `water`/`holy`-Fluss zu realen Allies;
  Noten bleiben dezente Add-Layer. Fallback: gebogene Heal-Flows. Reduced Motion: ein heller Bogen.

### 32. Oshun — Gold des süßen Wassers

- **Herkunft:** Yoruba-Tradition · **Slot/Rarität:** Platform, Legendary
- **Gruppen:** `wildborn`, `divine-guardians` · **Rolle:** Heilung, Wet und Belohnung guter Positionierung
- **Angriff/Signatur:** goldener Wassertropfen; Heilung ist 20 % stärker auf Verbündeten, die neben
  mindestens einem weiteren Verbündeten stehen.
- **Ultimate – Fluss aus Honig:** Eine Wasserwelle durchquert ihre Reihe, macht Gegner Wet und
  heilt jeden gekreuzten Verbündeten um 18 % Max-HP; verbundene Gruppen erhalten 5 s +20 % Schaden.
- **Upgrades I–V:** Basis; Heal 22 %; Buff 25 %; Cooldown −10 %; Buffdauer 7 s.
- **Evolution V:** Überheilung wird bis 15 % Max-HP zum goldenen Schild.
- **Talente:** **Süßwasser** – stärkere Heilung, kein Gegner-Wet. **Goldener Strom** – schwächere
  Heilung, dafür längere Wet-Linie und Angriffsbuff.
- **Designrichtung:** elegante Flussgöttin in Goldgelb mit Spiegel, Fächer und fließenden
  Perlenformen; Wasser/Honig als edle Materialien, sorgfältige Yoruba-Recherche.
- **Effekseer:** `ultOshunRiver` als gerichtete `water`-Front mit goldenem Add-Layer, `heal` an
  Allies. Fallback: blaue/goldene Reihenlinie. Reduced Motion: feste Wellenkante ohne Tropfen.

### 33. Mazu — Laterne über dem Sturm

- **Herkunft:** chinesische Volksreligion · **Slot/Rarität:** Platform, Epic
- **Gruppen:** `divine-guardians`, `wildborn` · **Rolle:** Anti-Fernkampf und Rettung gefährdeter Helden
- **Angriff/Signatur:** rote Laternenflamme; priorisiert den Verbündeten mit niedrigster HP beim Heilen.
- **Ultimate – Sichere Heimkehr:** markiert 6 s bis zu drei Verbündete. Der nächste Fernkampftreffer
  gegen jeden wird negiert; fällt ein Markierter unter 25 % HP, erhält er 18 % Heal und die Marke endet.
- **Upgrades I–V:** Basis; vier Ziele; Heal 22 %; Cooldown −10 %; Markendauer 8 s.
- **Evolution V:** Eine unbenutzte Marke explodiert am Ende als 10-%-Schild.
- **Talente:** **Leuchtfeuer** – größere Zielzahl, kein Heal. **Sturmfahrt** – zwei Ziele, aber zwei
  Fernkampftreffer werden negiert.
- **Designrichtung:** würdevolle Seeschutzgöttin mit roter Laterne, Perlenkrone und ruhigen
  Meeresgewändern; Schutzsignal statt offensiver Sturmzauber.
- **Effekseer:** `ultMazuLantern` nutzt `holy`/`water`; persistente kleine Laterne folgt jedem Ally,
  Rettung erzeugt `heal`. Fallback: Laternenicon und Schildkontur. Reduced Motion: statische Laterne.

### 34. Ix Chel — Weberin von Mond und Regen

- **Herkunft:** Maya-Traditionen · **Slot/Rarität:** Platform, Legendary
- **Gruppen:** `wildborn`, `divine-guardians` · **Rolle:** periodische Heilung und Wetter-Setup
- **Angriff/Signatur:** Mondtropfen; abwechselnd kleiner Schaden und kleiner Heal.
- **Ultimate – Umgestürzter Krug:** 8 s Regen im Zielbereich: Gegner werden Wet und 15 % langsamer;
  Verbündete erhalten pro 2 s 5 % Max-HP. Kein direkter Burst-Heal.
- **Upgrades I–V:** Basis; Heal 6 %; Radius +20 %; Cooldown −10 %; Dauer 10 s.
- **Evolution V:** Ein Verbündeter unter 30 % HP erhält beim ersten Regentick zusätzlich 12 % Heal.
- **Talente:** **Mondweberin** – kleinerer Bereich, stärkere Heilung und Ultimate-Ladung. **Sturmkrug**
  – schwächere Heilung, stärkerer Slow und Wet bleibt 4 s nach Verlassen.
- **Designrichtung:** Maya-Mond-/Regenweberin mit Wasserkrug, Webmustern und Mondkaninchenmotiv;
  konkrete regionale Ikonographie vor Produktion prüfen.
- **Effekseer:** `ultIxChelRain` persistenter `water`-Ground-Loop plus sparsame vertikale Tropfen;
  Heal-Ticks als Mondglint. Fallback: klare Kreisgrenze und Regentropfen. Reduced Motion: statischer
  blauer Bereich mit Tick-Blitz.

### 35. Anahita — Herrin der reinen Wasser

- **Herkunft:** iranische/zoroastrische Tradition · **Slot/Rarität:** Platform, Epic
- **Gruppen:** `divine-guardians`, `wildborn` · **Rolle:** Reinigung und Schutz gegen Statusketten
- **Angriff/Signatur:** Sternenwasser; heilt Ziele mit negativem Status 15 % stärker.
- **Ultimate – Unbefleckter Strom:** entfernt von allen Verbündeten in Reichweite Poison, Burn,
  Chill und Wet, heilt je entferntem Status zusätzlich 4 % Max-HP und gibt 5 s 20 % Statusresistenz.
- **Upgrades I–V:** Basis; Basisheal 10 %; Zusatzheal 5 %; Cooldown −10 %; Resistenz 30 % für 7 s.
- **Evolution V:** Entfernte Status werden als schwacher magischer Splash auf nahe Gegner gespiegelt.
- **Talente:** **Reines Wasser** – starke Heilung, keine Spiegelung. **Sternenfluss** – wenig Heal,
  dafür spiegeln Status mit voller Restdauer.
- **Designrichtung:** königliche iranische Wassergöttin mit Sternenmantel, Krug und klaren
  Silberströmen; achämenidisch/sasanidisch inspirierte Details fachlich prüfen.
- **Effekseer:** `ultAnahitaCleanse` als aufsteigender `water`/`holy`-Wirbel pro betroffenem Ally;
  gespiegelter Status nutzt dessen bestehende Clipfamilie. Fallback: Wasserbogen und entfernte
  Status-Pips. Reduced Motion: ein silberner Reinigungsblitz.

## Empfohlene Auswahl und Reihenfolge

Damit der eigentliche Produktionsbacklog exakt **30 neue Helden mit fünf Figuren pro Klasse**
enthält, gilt folgende Auswahl:

| Klasse | Fünf Kandidaten in empfohlener Reihenfolge |
|---|---|
| Tank | Achilles, Guan Yu, Durga, Gilgamesh, Taweret |
| Warrior | Maui, Perun, Cú Chulainn, Ogun, Huitzilopochtli |
| Assassin | Anansi, Izanami, Camazotz, Ereshkigal, Veles |
| Mage | Thoth, Quetzalcoatl, Baba Yaga, Brigid, Tezcatlipoca |
| Archer | Hou Yi, Arjuna, Neith, Lugh, Karna |
| Support | Amaterasu, Saraswati, Oshun, Mazu, Ix Chel |

**Reserve:** Sekhmet (Warrior), Morrígan (Assassin), Circe (Mage), Ullr (Archer) und Anahita
(Support). Sie sind vollständig beschrieben, falls eine Figur nach Mythologieprüfung, visueller
Abgrenzung oder Prototyping ausgetauscht werden soll. Dadurch enthält das Dokument 30 feste
Kandidaten plus fünf sofort nutzbare Ersatzentwürfe.

Die ersten sechs Prototypen sollten Achilles, Maui, Anansi, Thoth, Hou Yi und Amaterasu sein. Sie
testen je eine Klasse und fünf unterschiedliche technische FX-Anforderungen: persistente
Caster-Barriere, gerichtete Ground-Geometrie, zielgebundenes Netz, mehrphasige Glyphen, echte
Multi-Projectile-Sequenz und einen an Verbündeten gebundenen Schutzkorridor.

## Checkliste pro tatsächlichem Import

1. Mythologische Kurzprüfung und eindeutige kulturelle Benennung abschließen.
2. Rolle gegen bestehende 22 Helden prüfen; kein neuer Held darf nur eine stärkere Kopie sein.
3. Eintrag in `gameBalance.json`/Tuning mit bestehender Klasse, Slot und Gruppen anlegen.
4. Ultimate zuerst mit Fallback-Geometrie und automatischem Mechaniktest implementieren.
5. Skillstufen, Evolution V und beide Tier-II-Talente einzeln auf messbare Wirkung testen.
6. Sim-Events pro sichtbarer Phase emittieren; keine Präsentationszeit als Combat-Timer benutzen.
7. `PROFILES` und `HERO_ATLAS_FX` ergänzen, vorhandene Clipfamilien zuerst nutzen.
8. Nur unverwechselbare fehlende Formen in Effekseer authoren, mit Normal-/Add-Layer exportieren
   und Lizenz/Provenienz dokumentieren.
9. Normal, 2×-Spieltempo, Pause, Reduced Motion, Atlas fehlt und FX-Pool voll visuell prüfen.
10. Erst nach diesen Prüfungen endgültige Zahlen und Produktionspriorität festschreiben.

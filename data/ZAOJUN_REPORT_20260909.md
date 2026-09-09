# Zaojun – Analyse der sechs Kampfaufnahmen vom 09.09.2026

Zaojun zeigt in diesen Aufnahmen das Profil eines **Ultimate-basierten Hauptschadensausteilers mit ausgeprägter Einzelziel-Unterstützung**. Überlebt er die Aufbauphase, trägt er in den vier siegreichen Kämpfen 66,4–96,2 % des erfassten Teamschadens bei. Seine Heilung ergänzt diese Rolle erheblich. Die zentrale Schwäche ist der frühe Verlust seiner eigenen Überlebensfähigkeit beziehungsweise seiner schützenden Teamstruktur.

## Datengrundlage und Einordnung

Ausgewertet wurden `events.jsonl`, `HERO_ANALYSIS.json`, `HERO_GUIDE.md` und `capture_manifest.json` in allen sechs angegebenen Ordnern. Die Rohereignisse wurden zusätzlich auf Skillstarts, Schaden, Heilung, Schutz, Todesfälle und interne Mechanikzustände geprüft.

**Die Moduszuordnung ist vorläufig:** Alle Manifeste enthalten `mode: unspecified`. Die ersten drei Aufnahmen werden hier aufgrund der Gegnergruppen 30437/30438 und der Aufnahmereihenfolge als Tower/Spire eingeordnet, 152709 aufgrund gegnerischer Spielerinstanzen als PvP, die letzten beiden mit Gegnergruppe 383304 als Odyssey. Die genaue Zuordnung muss anhand der Aufnahmeinformation bestätigt werden. Die Einzelkampfergebnisse und Kennzahlen hängen von dieser Benennung nicht ab.

Siege und Niederlagen sind aus den protokollierten Todesfällen aller fünf ursprünglichen Helden einer Seite abgeleitet; ein explizites Ergebnis-/Settlement-Ereignis fehlt. Es ergeben sich vier Siege und zwei Niederlagen. Das ist eine Beschreibung dieser ausgewählten Aufnahmen, keine belastbare allgemeine Siegquote.

Schaden bezeichnet ausschließlich den protokollierten **Calculator-Output**, nicht effektiven HP-Verlust oder den Ergebnisbildschirm. Alle absoluten Schaden-, Heilungs- und Schildzahlen bleiben in **unveränderten Logeinheiten**. Tabellen verwenden Milliarden dieser Einheiten. Die Engine verwendet vielfach eine 1024-Festkommaskala; auf eine pauschale Umrechnung sämtlicher Schadenswerte in UI-Zahlen wird verzichtet. Sekunden entsprechen `ms / 1000` der Kampfuhr, nicht realer Aufnahmezeit.

## Ergebnisse je Kampf

| Aufnahme | Modus, vorläufig | Ausgang | Beobachtete Kampfuhr | Schaden, Mrd. | Teamanteil | Ultimate-Starts | Erste Ultimate | Eigene effektive Heilung an Verbündete, Mrd. |
|---|---|---|---:|---:|---:|---:|---:|---:|
| 152425 | Tower/Spire | Niederlage | 24,187 s | 0,531 | 4,58 % | 0 | – | 0,740 |
| 152519 | Tower/Spire | Sieg | 27,470 s | 78,872 | 94,73 % | 5 | 6,767 s | 14,952 |
| 152614 | Tower/Spire | Sieg | 25,862 s | 55,675 | 81,79 % | 3 | 11,256 s | 5,715 |
| 152709 | PvP | Sieg | 20,569 s | 60,032 | 66,38 % | 3 | 10,653 s | 13,641 |
| 152819 | Odyssey | Niederlage | 20,837 s | 32,159 | 76,99 % | 2 | 10,519 s | 5,117 |
| 152926 | Odyssey | Sieg | 36,381 s | 104,780 | 96,16 % | 5 | 8,107 s | 6,126 |

Ultimate-Starts sind keine Garantie vollständiger Ausführung. Mehrere letzte Ultimates liegen unmittelbar am Kampfende. Im PvP hat der dritte Start keinen protokollierten Schaden mehr.

## Tower/Spire: Überleben eröffnet das Schadenspotenzial

**152425, Gegnergruppe 30437:** Zaojun steht mit CaiShen, HeLaDeGuNa, MDJuXie und MengPo im Team. Seine Bindung trifft HeLaDeGuNa. Er stirbt als erster eigener Held bei **7,236 s**, bevor eine Ultimate startet. Sein einziger Schadenstreffer stammt aus Food Offering (`401324`). Zwei gegnerische Calculator-Ereignisse von `H_ChuNv` bei 7,169 und 7,236 s ergeben zusammen 7,897 Mrd. eingehenden Schaden. Das belegt einen unmittelbaren starken Schadensdruck; der exakte Anteil von Bindungs-HP-Verlust, Mitigation und anderen HP-Veränderungen am Tod ist damit nicht vollständig bestimmt.

Die Energie erreicht vor dem Tod bereits den protokollierten Maximalwert 1.024.000. Es fehlt also nicht einfach nur die aufsummierte Energie: **Der Übergang zur tatsächlichen Ultimate gelingt nicht mehr.** Eine konkrete Steuerungs- oder Unterbrechungsursache lässt sich daraus nicht sicher ableiten.

**152519, dieselbe Gegnergruppe 30437:** Mit WeiNaSi, NvBa, CaiShen und YaoJi überlebt Zaojun den Kampf. Die Bindung liegt auf WeiNaSi. Obwohl NvBa bei 3,350 s und YaoJi bei 10,653 s sterben, setzt Zaojun fünf Ultimates ein und liefert 94,73 % des Teamschadens. CaiShen heilt ihn effektiv um 2,001 Mrd.; bei 8,375 s ist außerdem eine Schildanwendung mit 1,383 Mrd. Wert protokolliert. Zaojun heilt WeiNaSi um 14,952 Mrd., davon 8,607 Mrd. über `401364` und 6,344 Mrd. über Food Offering.

Gegen dieselben Gegner steigt sein Schaden auf etwa das **148,5-Fache**. Die Vergleichbarkeit ist besser als zwischen beliebigen Kämpfen, aber mehrere Partner sowie Startattribute ändern sich. Das ist kein isolierter Nachweis für einen bestimmten Support.

**152614, Gegnergruppe 30438:** CaiShen, NaiFuDiSi, NvWa und BoSaiDong begleiten Zaojun. Seine Bindung trifft ausdrücklich **NvWas Tank-Beschwörung `H_NvWa_RouDun`**, nicht NvWa selbst. Zaojun erhält nur 0,976 Mrd. erfassten eingehenden Calculator-Schaden und gewinnt mit drei Ultimates trotz späterem Erststart bei 11,256 s. Die Tank-Beschwörung erhält 4,133 Mrd. effektive Heilung, CaiShen weitere 1,583 Mrd.

**Bewertung:** In diesen mutmaßlichen Tower-Kämpfen ist Zaojun ein sehr wirksamer Carry, sobald das Team die Anfangsphase absichert. Die früheste Ultimate ist hilfreich, aber nicht allein ausschlaggebend: Auch der spätere Start in 152614 reicht bei geringem eingehendem Druck zum Sieg.

## PvP: starker Beitrag, aber wichtige Zuordnungslücke

**152709:** Das eigene Team besteht aus HeLaDeGuNa, HeLaKeLeSi, YaoJi, CaiShen und Zaojun. Die Bindung liegt auf HeLaKeLeSi, der insgesamt **13,641 Mrd. effektive Heilung** erhält; 13,159 Mrd. davon tragen Skill-ID `401364`. Alle fünf ursprünglichen Gegner sterben, während kein eigener Held als tot protokolliert ist.

Die automatisch erzeugte Skilltabelle erfasst nur 24,405 Mrd. direkt unter Ultimate-ID `401314` und 2,556 Mrd. unter Food Offering. Weitere **33,072 Mrd. aus acht Treffern** stehen auf `normal_or_delayed`. Sie treten bei 11,926–12,127 s nach dem ersten Ultimate-Start auf, während Zaojun im Zustand `injureMove` ist. Unmittelbar zugehörige Buff-Anwendungen nennen `401314`; auch der Schadensparameter passt zum Ultimate-Muster. Das spricht stark für verzögert eintreffenden Ultimate-Schaden, ist aber eine Rekonstruktion aus dem Kontext.

Damit beträgt der **direkt zugeordnete Ultimate-Anteil 40,65 %**, bei Einbeziehung dieser plausiblen verzögerten Treffer **95,74 %**. Die 33,072 Mrd. dürfen weder verloren gehen noch als sicher belegte normale Angriffe interpretiert werden. Außerdem ordnet `ultimates_from_energy_clear` den Verbrauch bei 15,544 s fälschlich `401324` zu; die Rohdaten enthalten dort tatsächlich auch einen Ultimate-Start `401314`.

Der dritte Ultimate-Start bei 20,167 s nutzt laut Mechanikzustand den maximalen Rauchvorrat von 1.228.800, verursacht aber bis Kampfende keinen erfassten Treffer. **Maximale Ladung allein ist kein Leistungsnachweis.**

**Bewertung:** Positiver PvP-Einzelbeleg für Schaden plus Frontkämpfer-Heilung. Eine allgemeine PvP-Dominanz oder Zuverlässigkeit gegen andere Gegnerteams ist mit einem Kampf nicht nachgewiesen.

## Odyssey: besonders deutlicher Unterschied durch die Teamstruktur

Beide Aufnahmen verwenden Gegnergruppe 383304 mit GaiBu, SaiHeMaiTe, BaiYang, BaSiTe und SheShou.

**152819, Niederlage:** AMengLa, NaiFuDiSi, MDJuXie und MengPo begleiten Zaojun. Die Bindung liegt auf MengPo. NaiFuDiSi fällt bei 10,385 s, AMengLa und MDJuXie bei 12,261 s. Zaojun schafft zwei Ultimates und 76,99 % Teamschaden, stirbt jedoch bei **18,224 s**. Nur zwei der fünf Gegner werden ausgeschaltet. Ein hoher Teamanteil reicht hier nicht, weil die eigene Formation vorher zusammenbricht. Es ist keine effektive erhaltene Heilung für Zaojun und keine explizite Schildanwendung auf ihn erfasst.

**152926, Sieg:** NvWa und YiDeng ersetzen AMengLa und NaiFuDiSi; MDJuXie und MengPo bleiben. Zaojuns Bindung liegt jetzt auf NvWas Tank-Beschwörung. Er startet die erste Ultimate **2,412 s früher**, überlebt und erreicht fünf Starts sowie 104,780 Mrd. Schaden – **3,26-mal** so viel wie im verlorenen Versuch. Sein Start-ATK liegt nur rund 3,8 % höher; der Unterschied geht mit erheblich mehr Wirkzeit und Schutz einher.

Zaojun erhält effektiv 4,494 Mrd. Heilung von YiDeng, 1,490 Mrd. von MDJuXie und 0,661 Mrd. von NvWas Support-Beschwörung, zusammen **6,645 Mrd.** Hinzu kommen ein Start-Schild von MDJuXie mit 1,381 Mrd. sowie zwei YiDeng-Schildanwendungen mit je 2,905 Mrd. Diese Schildwerte beschreiben Anwendungen, nicht gemessene Absorption.

NvWas gebundene Tank-Beschwörung stirbt schon bei 10,921 s, NvWa bei 12,060 s und MDJuXie bei 16,884 s. Zaojun gewinnt trotzdem bis 36,314 s. Eine erneute Fire-Bond-Anwendung auf einen anderen Verbündeten ist nicht erfasst. Der Erfolg darf daher nicht mit einer dauerhaft überlebenden Bindung erklärt werden. Die fortgesetzte Unterstützung durch YiDeng ist konkret belegt.

**Bewertung:** Zaojun kann diesen Begegnungstyp als nahezu alleiniger Schadenslieferant gewinnen. Die erfolgreichere Zusammensetzung liefert messbare Versorgung und mehr Zeit. Welcher Anteil des Fortschritts auf YiDeng, NvWa, Positionierung oder weitere veränderte Effekte entfällt, bleibt ohne kontrollierten Einzelwechsel offen.

## Heldenmechanik: was Referenz und Laufzeit tatsächlich zeigen

In allen sechs Aufnahmen weist der Spawn-Snapshot **Level 340 und `evo:15`** aus. Die automatische Angabe „Preset development: Unknown“ bedeutet daher nicht, dass überhaupt keine Entwicklung bekannt wäre. Ausrüstung, vollständige Investition und Reliktstufe als UI-Wert sind weiterhin nicht vollständig dokumentiert.

- **Ultimate / Wildfire Spreading (`401314`):** In den vier Nicht-PvP-Kämpfen mit Ultimate-Treffern stammen 97,36–98,45 % des erfassten eigenen Schadens direkt daraus. Laufzeitparameter belegen einen Rauchdeckel von 1200 und 150 Rauch pro zusätzlicher Zielauswahl auf der 1024-Skala. Der normale Speicherfaktor beträgt ungefähr 20 %. Die ersten Ultimates in 152519 und 152926 starten sogar mit `cachedEnergyCount:0` und tragen dennoch zu Siegen bei: Volle Rauchladung ist keine Voraussetzung für einen nützlichen Einsatz.
- **Food Offering (`401324`):** Frühe Heilung plus ergänzender Schaden. Die Laufzeit zeigt `atkRate:1024`, `hpRate:307` und bei Heilungen `coef:2048`, entsprechend ungefähr 100 % ATK, 30 % HP-Komponente und 200 % Heilkoeffizient. Wessen HP die Schadenskomponente verwendet, wird ohne zugehörige Implementierung nicht zusätzlich behauptet.
- **Aufbaupassive:** `atkMaxCount:10`, `atkRate:204`, `energyCount:122880` und `cdTimeLength:3072` entsprechen ungefähr zehn maximalen ATK-Stapeln mit je 20 %, 120 Energie und einem internen 3-Sekunden-Intervall. Der Zustand erreicht in 152519 und 152926 tatsächlich zehn Stapel, im frühen Verlust 152425 nur zwei. Interne Timer dürfen nicht unbesehen in einen exakten Termin auf der protokollierten Kampfuhr umgerechnet werden.
- **Fire Bond (`40133401`):** Die tatsächlichen Empfänger wechseln mit der Aufstellung und können Beschwörungen sein. Die Referenz beschreibt Schadensreduktion und eigenen HP-Einsatz zugunsten des gebundenen Ziels. Eine genaue Summierung verhinderten Schadens oder geopferter HP liegt nicht vor.
- **Reliktmechanik:** `H_ZaoJun_skill4_2_Model` enthält in den geprüften Laufzeitzuständen `cureRate:256` und `energyRate:819`, entsprechend 25 % und ungefähr 80 %. Effektive Heilung über `401364` ist gemessen. Die Gesamtheilung entspricht wegen fehlender HP, Zielverlust und weiterer Faktoren nicht automatisch 25 % des Calculator-Gesamtschadens.

Das Manifest enthält zudem einen widersprüchlichen externen Relikteintrag („Vortex of Grace“). Für die Interpretation wurde die konsistente Referenz „Blessed Fire Grace“ zusammen mit den protokollierten Mechanikzuständen verwendet, nicht dieser offensichtlich unpassende externe Eintrag.

## Schlussfolgerungen und sinnvolle Folgetests

**Zaojuns Stärke ist die Kombination aus wachsendem Ultimate-Schaden und gezielter Heilung. Seine größte hier sichtbare Einschränkung ist die Zeit, die sein Team ihm zum Wirken verschafft.** Der Heldenwert lässt sich deshalb weder aus dem Schaden des ersten verlorenen Kampfs noch allein aus den hohen Prozentanteilen der Siege ableiten.

Aus diesen Aufnahmen folgen drei praktische Prüfprioritäten:

1. **Überleben vor zusätzlichem Schaden absichern:** Erhaltene Heilung, Schildwirkung und Zeitpunkt des ersten eigenen Todes gegen identische Gegner vergleichen. YiDeng ist im erfolgreichen Odyssey-Versuch ein belegter Versorger; CaiShen im erfolgreichen Tower-Versuch ebenfalls. Eine Rangliste aller möglichen Partner lässt sich daraus nicht bilden.
2. **Bindungsziel bewusst prüfen:** Hohe HP und Beschwörungen beeinflussen, wer die Unterstützung erhält. NvWas Tank zieht in zwei Aufnahmen die Bindung auf sich. Prüfen, ob dieses Ziel die gewünschte Schutz- und Heilfunktion tatsächlich lange genug nutzt.
3. **Einen Partner pro Versuch ändern:** Gleiche Stufe, Gegner, Positionen und Entwicklung beibehalten, mehrere Wiederholungen erfassen und Settlement-Werte ergänzen. Dabei erste Ultimate mit tatsächlichem Treffer, Rauchladung, Überlebensdauer, effektive Heilung und Schildabsorption getrennt messen.

Eine allgemeine Tier-Einstufung, Investitionsempfehlung oder kausale „bester Partner“-Aussage wäre mit diesen sechs unterschiedlich aufgestellten Kämpfen nicht belastbar. Der Befund für die getesteten Begegnungen ist hingegen klar: **Zaojun besitzt erhebliches Carry-Potenzial und benötigt dafür eine passende defensive Teamstruktur.**

## Quellen

- [152425: Rohereignisse](zaojun_20260909_152425/events.jsonl), [Analyse](zaojun_20260909_152425/HERO_ANALYSIS.json)
- [152519: Rohereignisse](zaojun_20260909_152519/events.jsonl), [Analyse](zaojun_20260909_152519/HERO_ANALYSIS.json)
- [152614: Rohereignisse](zaojun_20260909_152614/events.jsonl), [Analyse](zaojun_20260909_152614/HERO_ANALYSIS.json)
- [152709: Rohereignisse](zaojun_20260909_152709/events.jsonl), [Analyse](zaojun_20260909_152709/HERO_ANALYSIS.json)
- [152819: Rohereignisse](zaojun_20260909_152819/events.jsonl), [Analyse](zaojun_20260909_152819/HERO_ANALYSIS.json)
- [152926: Rohereignisse](zaojun_20260909_152926/events.jsonl), [Analyse](zaojun_20260909_152926/HERO_ANALYSIS.json)

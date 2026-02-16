
📘 PROJEKT-ZUSAMMENFASSUNG – HERO DATABASE + SYNERGY SYSTEM

Projektstuktur:
root
- dist
- node_modules
- public 
	/ heroes { contains all hero images as webp - heroId.webp }
	/ icons 
		/ classes { archer, assassin, mage, support, tank, warrior.webp }
		/ factions { spades, hearts, clubs, diamonads, starglint.webp }
		/ footer
		/ roles { arcane, hefty, nimble.webp }
		/ sidebar
	/ skills { contains all skills assets for each hero - heroId_skill_1-4.webp and heroId_relic.webp }
-scripts 
	/ generator.js { creator of compositions and synergies }
src 
	/ components {filter.astro, Footer.astro, HeroCard.astro, HeroCompositions.astro, Sidebar.astro}
		/ hero { RatingCard.astro, SkillCard.astro }
	/ data { heroAdapter.js, rankings.js }
		/ derived { teamCompsByHeroId.json - created by scripts/generator.js }
		/ heroes { all heroId.json files are here }
		/ stats 
	/ pages 
	/ types

🎯 Ziel des Projekts

Du baust eine Hero-Datenbank mit automatischer Team-Composition-Generierung.

Schwerpunkt:
	•	Meta-Teams
	•	35% Faction-Bonus Teams
	•	Mixed Teams
	•	PvE / PvP / General Split
	•	Synergy-Erklärungen mit Beweis aus Skilltexten
	•	UI-Debug-Möglichkeit für jede Synergy-Aussage

Wichtig:
Du hast keine internen Game-Daten, nur:
	•	Level 1 Stats
	•	Skilltexte
	•	Relictexte
	•	Manuell gepflegte Ratings (overall / pve / pvp)

⸻

⚙️ GENERATOR-SYSTEM (Aktueller Stand)

1️⃣ Composition-Generierung

Pro Held:
	•	800 Random Attempts
	•	Kandidaten-Pool = Top 30 nach heuristischer Bewertung
	•	Score basiert auf:
	•	Faction Bonus (bis 35%)
	•	Mode Rating (overall / pve / pvp)
	•	Stats
	•	Heal / Shield / Control / AoE
	•	SynergyScore (aus Synergy-Logik)

Ausgabe:

teamCompsByHeroId.json

Pro Hero:

general
pve
pvp

Pro Mode:

meta
bonus35
bestBonus
mixed


⸻

🧠 SYNERGY SYSTEM – NEUE STRICT VERSION

Du hast dich bewusst von „losem Keyword Matching“ entfernt.

Aktuelle Architektur:

⸻

🔹 SYNERGY_TAGS

ATK_SPEED_TEAM_PROVIDER
ATK_SPEED_SELF_ONLY
ENERGY_TEAM_PROVIDER
CDR_TEAM_PROVIDER
DEF_SHRED_OR_AMP
BASIC_ATTACK_SCALER
ON_HIT_SCALER
FAST_STACKING_WITH_HITS
ULT_DEPENDENT
AOE_DAMAGE_PROFILE


⸻

🔹 Prinzip: Evidence-First

Ablauf pro Held:
	1.	Für jeden Tag → evidenceForTag()
	2.	Nur wenn Regex-Beleg existiert → Tag wird gesetzt
	3.	Keine Evidence → kein Tag

Strict Mode:

Synergy-Aussage nur wenn beide Seiten Evidence haben


⸻

🔹 synergyProfileForHero(hero)

Gibt zurück:

{
  tags: Set,
  evidenceByTag: { tag → snippet },
  forbidsNormals: boolean
}


⸻

🔹 synergyExplanation(team)

Erstellt nur Synergien wenn:
	•	Provider-Tag existiert
	•	Receiver-Tag existiert
	•	Beide Evidence vorhanden

⸻

🔹 Debug Export (sehr wichtig)

synergyDebug

Pro Team:

{
  strictMode: true,
  heroes: [
    {
      heroId,
      heroName,
      forbidsNormals,
      detectedTags,
      tags: [
        {
          tag,
          hasEvidence,
          snippet,
          match
        }
      ]
    }
  ]
}

Im UI:
	•	pro Tag
	•	mit Evidence oder „NO EVIDENCE“
	•	komplett prüfbar

Das war ein großer Qualitätssprung.

⸻

🛠 BISHERIGE PROBLEME (die wir gelöst haben)

❌ Falsche DEF_SHRED bei Dionysus

→ DMG RED wurde fälschlich als DEF Shred interpretiert
→ Regex wurde verschärft

❌ ATK_SPEED_SELF + TEAM gleichzeitig

→ Team-Version gewinnt jetzt

❌ Skill CD -30% nicht erkannt

→ CDR Regex erweitert

❌ Unterminated RegEx Error

→ Basic Attack Pattern repariert

⸻

🧪 Poseidon Analyse

Poseidon hatte keine Tags.

Das ist nicht falsch – sondern zeigt:

Deine Tag-Taxonomie ist aktuell stark auf:
	•	Buff-Provider
	•	Synergy-Interaktionen

Poseidon ist:
	•	AoE Damage
	•	M-RES Shred
	•	Basic Attack Trigger
	•	Self Energy Restore
	•	Shield Self

Er passt nicht perfekt in dein aktuelles Synergy-Modell.

Das bedeutet:

👉 Dein System ist funktional
👉 Aber deine Taxonomie ist noch unvollständig

⸻

🚦AKTUELLER STATUS
	•	Dionysus sauber
	•	Strict Mode funktioniert
	•	Debug UI funktioniert
	•	Synergy-Aussagen sind nachvollziehbar
	•	Regex-System ist stabil

Aber:

Viele Helden haben:
	•	0 Tags
	•	oder nur generische Tags

Das ist nicht unbedingt ein Fehler — sondern ein Design-Problem der Tag-Struktur.

⸻

🧠 Strategische Situation

Du stehst jetzt an einem sehr wichtigen Punkt:

Option A:
Weiter Regex verbessern

Option B:
Tag-Taxonomie neu denken

Option C:
Hybrid:
	•	Kern-Tags manuell pflegen
	•	Synergy automatisch generieren

⸻

❓ WICHTIGE FRAGEN AN DICH

Damit ich weiß, wie wir weitermachen sollen:

⸻

1️⃣ Was ist das Ziel der Synergy-Box?

A) Flavor + nice explanation
B) Competitive Theorycrafting Tool
C) Content Creator Referenz
D) Entscheidungsgrundlage für Spieler

Das beeinflusst die Strenge massiv.

⸻

2️⃣ Wie viele Helden hat dein Spiel aktuell?

20?
40?
100?
300?

Das entscheidet, ob man manuell Tags pflegen kann.

⸻

3️⃣ Möchtest du:
	•	Ein rein datengetriebenes System?
	•	Oder ein semi-kuratiertes System mit manueller Qualitätssicherung?

⸻

4️⃣ Wollen wir Synergien nur für:
	•	Team-Interaktionen
	•	oder auch:
	•	Self Power Spikes
	•	Role Synergies (Tank + Healer)
	•	Tempo Synergies
	•	Burst Windows
	•	Sustain Scaling
	•	Minion Summon Interactions

⸻

5️⃣ Wie wichtig ist Zukunftssicherheit?

Neue Helden sollen:
	•	Vollautomatisch funktionieren?
	•	Oder halbautomatisch mit Review?

⸻

🧭 MEIN VORSCHLAG (wenn du mich fragst)

Du bist jetzt an dem Punkt, wo:

Nicht Regex das Problem ist
Sondern dein Synergy-Modell zu grob ist.

Wir sollten als nächstes:
	1.	Synergy-Taxonomie neu definieren (Design-Level)
	2.	Tags in Kategorien aufteilen:
	•	Buff Provider
	•	Damage Amplifier
	•	Tempo Engine
	•	Sustain Engine
	•	Control Enabler
	•	Trigger Mechanic
	3.	Danach Regex neu ausrichten
	4.	Danach Synergy-Matrix definieren (Tag A synergiert mit Tag B)

Das wäre Version 2.0 – und dann wirklich stark.

⸻

Wenn du willst, können wir jetzt:

👉 Schritt 1 machen:
Synergy-Taxonomie neu designen (konzeptionell, ohne Code)

Oder:

👉 Schritt 2:
Poseidon als Referenz nehmen und Tag-System erweitern

Wie möchtest du fortfahren?
# Watcher of Realms: Hero-Skills

Client: `1.6.38.829.1`

## Umfang

- `8463` Hero-/Skill-Level-Zeilen
- `294` technische Hero-IDs mit Skillzuordnung
- Quellen bleiben getrennt: `levelable` und `fixed`
- `Skill` liefert Name, Beschreibung und Rohformeln; `SkillLevelUp` liefert die Skillstufe und gegebenenfalls das benötigte Hero-Level.

## Beispiele

### Rex (`2001`)

| Skill-ID | Quelle | Stufen | Name |
|---:|---|---:|---|
| 200114 | levelable | 5 | Bulwark |
| 200117 | fixed | 5 | P. ATK |
| 200118 | levelable | 5 | Sword of Retribution |
| 200120 | fixed | 5 | unbenannt |

### Voltus (`2015`)

| Skill-ID | Quelle | Stufen | Name |
|---:|---|---:|---|
| 201501 | fixed | 5 | M. ATK |
| 201524 | levelable | 1 | Powered Up |
| 201526 | fixed | 5 | unbenannt |
| 201530 | levelable | 5 | Lightning Storm |

## Datenqualität

Formelplatzhalter wie `{skm1}` und Rohreferenzen wie `{200118,param16}` bleiben absichtlich unverändert. Ohne die komplette Kampf-Formelauswertung wäre eine freie Übersetzung in Prozent- oder Schadenswerte spekulativ.

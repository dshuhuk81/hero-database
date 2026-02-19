# Hero Stats Management - CSV Workflow

Dieses System ermöglicht die zentrale Pflege aller Hero-Stats in einer CSV-Datei, statt 61 einzelne JSON-Dateien zu bearbeiten.

## 📁 Dateien

- **`src/data/stats/hero-stats.csv`** - Zentrale Stats-Tabelle (hier bearbeiten!)
- **`scripts/export-stats-to-csv.js`** - Exportiert Stats aus Hero-JSONs → CSV
- **`scripts/import-stats-from-csv.js`** - Importiert Stats aus CSV → Hero-JSONs

## 🔄 Workflow

### 1. Stats bearbeiten

```bash
# Öffne die CSV-Datei in deinem bevorzugten Editor:
code src/data/stats/hero-stats.csv          # VS Code
open -a "Microsoft Excel" src/data/stats/hero-stats.csv   # Excel
```

**💡 VS Code Tipp:** Installiere die Extension **"Rainbow CSV"** für farbige Spalten und bessere Lesbarkeit.

### 2. Änderungen in Hero-JSONs übernehmen

```bash
node scripts/import-stats-from-csv.js
```

Das war's! Alle Hero-JSONs werden automatisch aktualisiert.

### 3. CSV neu generieren (optional)

Falls du manuell Hero-JSONs bearbeitet hast und die CSV aktualisieren willst:

```bash
node scripts/export-stats-to-csv.js
```

## 📊 CSV-Struktur

| Spalte | Beschreibung |
|--------|--------------|
| `id` | Hero-ID (z.B. "amunra") |
| `name` | Hero-Name |
| `class` | Klasse (Tank, Warrior, etc.) |
| `rarity` | Seltenheit |
| `might` - `ultimatePWR` | 28 Stat-Felder |

## ✨ Vorteile

✅ **Übersichtlich**: Alle Stats in einer Tabelle  
✅ **Schnell**: Copy & Paste aus Spielquellen  
✅ **Sortierbar**: Nach Klasse, Stats, etc.  
✅ **Sicher**: Original-JSONs bleiben erhalten  
✅ **Versioniert**: CSV kann in Git getrackt werden  

## 🔍 Beispiel-Anwendungsfälle

### Batch-Update: Alle Tank HP um 10% erhöhen

1. Öffne CSV in Excel/Google Sheets
2. Filtere nach `class = "Tank"`
3. Markiere `hp`-Spalte → Formel: `=A2*1.1`
4. Speichern → `node scripts/import-stats-from-csv.js`

### Neue Stats aus Spiel-Update eintragen

1. Kopiere Stats-Tabelle aus Game/Wiki
2. Paste in Excel → Daten aufbereiten
3. Übertrage zu hero-stats.csv
4. Import → Fertig!

### Stats vergleichen

Öffne CSV in Excel/Sheets und nutze:
- Bedingte Formatierung
- Pivot-Tabellen
- Sortierung nach beliebigen Stats

## ⚙️ Technische Details

### Stat-Felder (28 total)

```javascript
might, hp, atk, armor, magicRes, dodgeRate, hitBonus,
critRate, critRes, critDmgBonus, critDmgRed, energy,
cooldownHaste, atkSpdBonus, pDmgBonus, pDmgRed,
mDmgBonus, mDmgRed, healEff, rechargeEff, lifestealEff,
reflectEff, effectRes, effectHit, controlRes, controlBonus,
normalSkillPWR, ultimatePWR
```

### Import-Logik

- Fehlende Werte werden zu `0`
- Leere Strings werden zu `0`
- Existierende Stats in JSONs bleiben erhalten
- Nur die angegebenen Stats werden überschrieben

### Fehlerbehandlung

- ⚠️ Nicht existierende Hero-IDs werden übersprungen
- ⚠️ Defekte JSON-Dateien werden gemeldet
- ✓ Erfolgsmeldung zeigt Anzahl Updates

## 🚀 Pro-Tipps

1. **Backup vor großen Änderungen:**
   ```bash
   git add . && git commit -m "backup before stats update"
   ```

2. **Nur bestimmte Helden aktualisieren:**
   - Lösche unwanted Zeilen in CSV temporär
   - Führe Import aus
   - Restore CSV mit Git

3. **Stats validieren:**
   ```bash
   node scripts/validate-hero-stats.js
   ```

4. **Excel-Formeln nutzen:**
   - Berechne Stats basierend auf anderen Spalten
   - Nutze `VLOOKUP` für Basis-Stats per Klasse
   - Validiere mit `IF`-Formeln

## 📝 Notizen

- CSV verwendet Komma (`,`) als Trennzeichen
- UTF-8 Encoding
- LF-Zeilenenden (Unix-style)
- Trailing newline am Dateiende

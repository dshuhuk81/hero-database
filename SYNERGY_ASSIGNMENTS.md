# 🎯 SYNERGY TAG ASSIGNMENTS - Nach Whale Ratings

Dies ist eine Vorlage basierend auf den Overall Ratings von Hardcore Gamers.
Du kannst hier die Tags direkt vergeben und sie dann in die heroes/*.json eintragen.

## 🔴 KRITISCH - SSS/SS Heroes (außer Top 20):

### Amunra (SSS) - Rank #42 → sollte höher rankieren
Skills: Damage, Energy Restore, Dodge Buff für Team
```json
"synergies": [
  "ENERGY_TEAM_PROVIDER",    // "when Energy Regen boost expires, all allies instantly restore 200 Energy"
  "CC_IMMUNITY_TEAM_PROVIDER" // "Glare of Ra: gains 100% Dodge Rate" (fungiert als Schutz)
]
```

### Hecate (SSS) - Rank #28 → sollte in Top 20
Skills: Control, AOE Damage, Ultimate focused
```json
"synergies": [
  "CONTROL_PROVIDER",      // Stun/Control effects
  "AOE_DAMAGE_PROFILE",    // AOE damage dealer
  "ULT_DEPENDENT"          // Ultimate focused
]
```

### Heracles (SSS) - Rank #48 → sollte höher
Skills: Warrior, Heavy ATK, Control
```json
"synergies": [
  "CONTROL_PROVIDER",      // Crowd control effects
  "AOE_DAMAGE_PROFILE",    // Multi-target damage
  "BASIC_ATTACK_SCALER"    // Normal attack scaling
]
```

### Poseidon (SS) - Rank #57 → sollte höher
Skills: AOE Damage, Disables
```json
"synergies": [
  "CONTROL_PROVIDER",      
  "AOE_DAMAGE_PROFILE",    
  "ENERGY_DRAIN_ENEMY"
]
```

### Tefnut (SS) - Rank #52 → sollte höher
Skills: Support/Control
```json
"synergies": [
  "CONTROL_PROVIDER",
  "ALLY_HEAL_PROVIDER",
  "ENERGY_TEAM_PROVIDER"
]
```

### Zeus (SS) - Rank #34 → sollte höher
Skills: AOE Damage, Ultimate Power
```json
"synergies": [
  "AOE_DAMAGE_PROFILE",
  "ULT_DEPENDENT",
  "ENERGY_DRAIN_ENEMY"
]
```

---

## 🟡 WARNUNG - Aktuell in Top 20 aber mit niedriger Rating:

### Geb (B) - Rank #1 ⚠️

Whales sagen: B (schwach)
Algo sagt: #1 (sehr stark)

**Das ist ein echtes Problem!** Geb muss VIEL niedrigere Synergies haben.
```json
"synergies": [
  "SHIELD_TEAM_PROVIDER"
]
```
(Vielleicht: Nichts anderes!)

### Prometheus (A) - Rank #2

Whales sagen: A (ok)
```json
"synergies": [
  "SHIELD_TEAM_PROVIDER",
  "DAMAGE_REDUCTION_TEAM_PROVIDER"
]
```

### Set (A) - Rank #3

Whales: A Rating
```json
"synergies": [
  "DEF_DOWN_OR_AMP",
  "AOE_DAMAGE_PROFILE"
]
```

### Anubis (S) - Rank #7 ✅ (ok)

```json
"synergies": [
  "CONTROL_PROVIDER",
  "AOE_DAMAGE_PROFILE",
  "ON_HIT_SCALER"
]
```

### Khepri (S) - Rank #8 ✅ (ok)

Support/Tank
```json
"synergies": [
  "SHIELD_TEAM_PROVIDER",
  "CLEANSE_TEAM_PROVIDER",
  "ALLY_HEAL_PROVIDER"
]
```

### Jormungandr (S) - Rank #9 ✅ (ok)

Warrior/Control
```json
"synergies": [
  "CONTROL_PROVIDER",
  "DEF_DOWN_OR_AMP",
  "BASIC_ATTACK_SCALER"
]
```

### Athena (A) - Rank #10

Support/Buff
```json
"synergies": [
  "ATK_SPEED_TEAM_PROVIDER",
  "CDR_TEAM_PROVIDER"
]
```

### Nuwa (SSS) - Rank #11 ✅ 

Tanks
```json
"synergies": [
  "SHIELD_TEAM_PROVIDER",
  "DAMAGE_REDUCTION_TEAM_PROVIDER"
]
```

### Demeter (B) - Rank #12 ⚠️

Whales sagen: B (schwach)
Algo: #12
```json
"synergies": [
  "SHIELD_TEAM_PROVIDER"
]
```

### Nezha (SSS) - Rank #13 ✅

```json
"synergies": [
  "ENERGY_TEAM_PROVIDER",
  "CONTROL_PROVIDER",
  "AOE_DAMAGE_PROFILE"
]
```

### Dionysus (SSS) - Rank #14 ✅

```json
"synergies": [
  "ALLY_HEAL_PROVIDER",
  "CLEANSE_TEAM_PROVIDER",
  "CONTROL_PROVIDER"
]
```

### Freya (B) - Rank #15 ⚠️

Whales: B
```json
"synergies": [
  "ALLY_HEAL_PROVIDER"
]
```

### Yanluo (S) - Rank #16

```json
"synergies": [
  "CONTROL_PROVIDER",
  "ATK_SPEED_TEAM_PROVIDER"
]
```

### Ullr (B) - Rank #17 ⚠️

Whales: B
```json
"synergies": [
  "BASIC_ATTACK_SCALER",
  "AOE_DAMAGE_PROFILE"
]
```

### Pisces (B) - Rank #18 ⚠️

Whales: B
```json
"synergies": [
  "ULT_DEPENDENT",
  "AOE_DAMAGE_PROFILE"
]
```

### Fengyi (S) - Rank #19 ✅

```json
"synergies": []
```

### Pan (SS) - Rank #20 ✅

```json
"synergies": [
  "DEF_DOWN_OR_AMP",
  "TAUNT_OR_PROVOKE",
  "CONTROL_PROVIDER"
]
```

---

## 📋 TODO - NÄCHSTE SCHRITTE:

1. **Verifiziere diese Zuordnungen** gegen dein Game Knowledge
2. **Adjust für weitere Heroes** (nicht alle 61 sind hier aufgelistet)
3. **Trage in heroes/*.json ein** → `"synergies": [...]`
4. **Starten mit Tests** - wie ändern sich die Rankings?
5. **Validiere gegen Whale-Ratings** erneut

Sollen wir ein Paar dieser Top-Priority Heroes starten?

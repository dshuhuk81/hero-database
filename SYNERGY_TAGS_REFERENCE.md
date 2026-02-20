# 📋 SYNERGY TAGS - Vollständige Liste (Neu definiert)

## A) TEAM SUPPORT / BUFF PROVIDER (8 Tags)
**Was gebe ich meinen Verbündeten?**

| Tag | Bedeutung |
|-----|-----------|
| `SHIELD_TEAM` | Ich gebe **Shields für Verbündete** |
| `HEAL_TEAM` | **Heile Verbündete** (nicht Self-Heal!) |
| `ENERGY_RESTORE_TEAM` | Ich stelle **Energie für Verbündete** bereit |
| `CDR_TEAM` | Ich reduziere **Cooldowns für Verbündete** |
| `ATK_SPEED_BUFF_TEAM` | Ich erhöhe **Attack Speed für Verbündete** |
| `DAMAGE_REDUCTION_TEAM` | Ich reduziere **gegnerischen Schaden** für Verbündete |
| `CC_IMMUNITY_TEAM` | Ich gebe **CC Immunity** für Verbündete |
| `DEBUFF_CLEANSE_TEAM` | Ich **entferne Debuffs** von Verbündeten |

---

## B) ENEMY DEBUFF / CROWD CONTROL (5 Tags)
**Was tue ich den Gegnern an?**

| Tag | Bedeutung |
|-----|-----------|
| `CROWD_CONTROL` | Ich verursache **Stun, Freeze, Sleep, Root, etc.** |
| `PROVOKE_TAUNT` | Ich **erzwinge dass Gegner mich angreifen** |
| `ENEMY_VULNERABILITY` | Ich **reduziere gegnerische Defense/Resistance** |
| `BUFF_DISPEL` | Ich **entferne positive Effekte** von Gegnern |
| `ENERGY_DRAIN_ENEMY` | Ich **entziehe Gegnern Energie** |

---

## C) PLAYSTYLE / GAMEPLAY MECHANICS (5 Tags)
**Wie funktioniere ich selbst?**

| Tag | Bedeutung |
|-----|-----------|
| `BASIC_ATTACK_SCALER` | Meine **normalen Attacken sind wichtig** (skalieren / triggern Effekte) |
| `HIT_TRIGGER_SCALER` | Meine Effekte **triggern bei jedem Hit** |
| `FAST_STACKER` | Ich **stacke schnell** mit normalen Attacken |
| `ULTIMATE_DEPENDENT` | Mein **Ultimate ist zentral** für meine Kraft |
| `AREA_DAMAGE_DEALER` | Ich bin **AOE/Multi-Target Dealer**, nicht Single-Target |

---

## D) SELF BUFFS / DEFENSIVES (10 Tags)
**Welche Buffs habe ich nur für mich selbst?**

| Tag | Bedeutung |
|-----|-----------|
| `SELF_SHIELD` | Ich gebe mir **selbst Shields** |
| `SELF_HEAL` | Ich **heile mich selbst** |
| `LIFESTEAL` | Ich stelle **HP wieder her wenn ich Schaden deal** |
| `ENERGY_RESTORE_SELF` | Ich stelle mir **selbst Energie wieder her** |
| `DODGE_BUFF` | Ich **erhöhe meinen Dodge** |
| `CC_RESISTANCE` | Ich werde **resistenter gegen Control** |
| `SUPER_ARMOR` | Ich bin **temporär immun gegen CC/Knockback** |
| `DAMAGE_REDUCTION_SELF` | Ich **reduziere gegnerisches Damage** an mich selbst |
| `STAT_STEAL_AMPLIFY` | Ich **steale/verstärke Stats** durch Feinde |
| `HIT_AVOIDANCE_SELF` | **Gegner treffen mich schwerer** |

---

## E) SELF ONLY - FÜR KOMPATIBILITÄT (1 Tag)
**Self-Buffs ohne Team Effekt**

| Tag | Bedeutung |
|-----|-----------|
| `ATK_SPEED_SELF_ONLY` | Ich erhöhe nur **meine eigene Attack Speed** (KEIN Team Buff) |

---

## 💾 Verwendung in `heroes/*.json`

```json
{
  "id": "geb",
  "name": "Geb",
  ...
  "synergies": [
    "SHIELD_TEAM",
    "DAMAGE_REDUCTION_TEAM",
    "SELF_SHIELD",
    "DAMAGE_REDUCTION_SELF"
  ]
}
```

---

## 📊 Zusammenfassung

| Kategorie | Anzahl Tags | Fokus |
|-----------|------------|-------|
| **A) Team Support** | 8 | Was ich dem Team gebe |
| **B) Enemy Debuff** | 5 | Was ich Gegnern antue |
| **C) Playstyle** | 5 | Wie ich selbst funktioniere |
| **D) Self Buffs** | 10 | Meine eigenen Defensive/Offensive Buffs |
| **E) Self Only** | 1 | Self-only Buffs (Compat) |
| **TOTAL** | **29 Tags** | - |

---

## 🎯 Wichtige Regeln

1. ✅ **Nur Tags eintragen, die Hero wirklich hat**
2. ✅ **`BASIC_ATTACK_SCALER` nicht setzen** wenn Hero keine normalen Attacken macht
3. ✅ **`ENERGY_RESTORE_TEAM` ≠ `ENERGY_RESTORE_SELF`** - Pass auf!
4. ✅ **`SHIELD_TEAM` + `HEALING_TEAM` sind unterschiedlich** - Eine ist Shields, andere ist Heal

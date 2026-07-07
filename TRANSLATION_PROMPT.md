# Übersetzungs-Kontext für motto-immortal-db.com (hero-database)

> Diesen Text als Prompt/Kontext verwenden, wenn an Übersetzungen gearbeitet wird:
> neue Sprachen/Texte ergänzen, bestehende Übersetzungen nachschlagen oder
> Original-Skilltexte eines bestimmten Helden finden.

## Projekt

Astro-Static-Site (`npm run build`, deployt via Cloudflare Pages aus `main`).
Live: https://motto-immortal-db.com — Spiel: "Motto Immortal" (GOAT Games).

## Sprachen & Routing

- Locales: `en` (Default), `de`, `es`, `ru`, `zh` — definiert in `src/i18n/config.ts` (`locales`-Array).
- Routen `/de/…`, `/zh/…` usw., Language-Switcher, hreflang-Alternates und Sitemap
  leiten sich automatisch aus dem `locales`-Array ab. Eine neue Sprache = Eintrag in
  `config.ts` + Übersetzungen; kein Routing-Umbau nötig.

## Wo welche Texte liegen

| Inhalt | Datei(en) |
|---|---|
| **Original-Hero-Daten (EN, Source of Truth)** | `src/data/heroes/<id>.json` — `name`, `description`, `skills[]` (`id`, `name`, `description`, `upgrades.level2–4`), `relic` (`name`, `description`, `upgrades`), `coreMechanic.summary`, `synergyLinks`, `virtueSets` |
| **Hero-Übersetzungen (Overlays)** | `src/data/heroes/i18n/<id>.json` — gleiche Struktur wie Basis; Blattwerte sind Sprach-Maps `{ "en": …, "de": …, "es": …, "ru": …, "zh": … }` |
| **Offizielle CN-Namen (Skills + Relikt)** | `cn`-Block in `src/data/heroes/<id>.json` → `cn.skills[].cnName` (ids `skill_1…4`, `relic`) — vorhanden für: zeus, nyx, nezha, nuwa, jingwei, dionysus, medusa, nemesis, hladgunnr |
| **Generische UI-Texte + Meta-Titles/-Descriptions (SEO)** | `src/i18n/ui.ts` (Sections: common, hero, home, events, tips, totems, footer, language, nav) |
| **Startseiten-Teaser-Karten** | `src/data/nav.ts` (`description`/`badge` sind Sprach-Maps) |
| **Events** | `src/data/events.json` |
| **Merge-/Fallback-Logik** | `src/data/heroes/localize.ts` + `pickLang` in `src/i18n/helpers.ts` |

## ⚠️ Kritische Regeln

1. **Jede Sprach-Map MUSS einen `en`-Key haben.** Fallback-Kette ist
   `locale → en → erste vorhandene Sprache`. Fehlt `en`, sehen andere Sprachen
   zufällig z. B. Deutsch (war ein echter Bug, 2026-07 behoben).
2. **`skills[]` im Overlay ist INDEX-aligned zur Basis-Datei** — Reihenfolge/Länge
   nicht verschieben; Lücken ggf. mit `{}` auffüllen.
3. Overlays sind partiell: fehlende Felder fallen sauber auf EN zurück, solange
   Regel 1 eingehalten wird.
4. Offizielle CN-Namen aus dem `cn`-Block verwenden, wo vorhanden — nicht neu erfinden.

## Stand der Übersetzungen (Juli 2026)

- **de/es**: Skill-Namen + -Beschreibungen + Upgrades für ~72 Helden (aus dem Spielclient
  extrahiert); Hero-Namen für alle 81.
- **ru**: Hero-Namen für alle; vollständig nur zeus, athena, heracles.
- **zh (Simplified)**: **komplett für alle 81 Overlays** — Hero-Namen, Skill-Namen
  und -Beschreibungen (261), alle Lv2–4-Upgrades (737), alle Relikte (289), plus
  descriptions/coreMechanic/synergyLinks/virtueSets für zeus/athena/heracles.
  Offizielle Namen nur wo `cn`-Block existiert; alles andere aus dem EN übersetzt.
- **7 unveröffentlichte Helden** (audhumla, eden, hades, hebo, heket, nephtys, zaojun):
  Basis-Skills sind leer → Overlays nur mit Namen (+ Platzhalter-Relikt „Vortex of Grace").
- **Bewusst nirgends lokalisiert** (in allen Sprachen englisch): Ability-Tags
  („ENEMY CROWD CONTROL"), Klassen-/Fraktions-Chips (Warrior, Diamonds, Legendary),
  Damage-Type-Labels (PHYSICAL/TRUE), Tips-/Totems-Body-Content.
- **Wichtig für Cloud-Sessions**: `data-mine/` ist gitignored! Die extrahierten
  CN-Client-Texte (`cn_en_hero_table.json`, `public/cn_full_skills`) existieren nur
  lokal beim Nutzer. Im Repo verfügbar sind nur die `cn`-Blöcke in den Hero-JSONs.

## Glossar zh (Spielterminologie beibehalten!)

ATK 攻击力 · DMG 伤害 · HP 生命值 · max HP 最大生命值 · shield 护盾 · Super Armor 霸体 ·
DMG RED 减伤 · Lifesteal 吸血 · Dodge Rate 闪避率 · Hit Rate 命中率 · Crit Rate 暴击率 ·
Crit DMG 暴击伤害 · M-RES 魔抗 · Armor 护甲 · Energy 能量 · Energy Regen 能量恢复 ·
ATK SPD 攻速 · Move SPD 移速 · True DMG 真实伤害 · Effect RES 效果抵抗 · CD 冷却时间 ·
Ultimate 大招 · Relic 圣物 · stun 眩晕 · knock down 击倒 · knock back 击退 · taunt 嘲讽 ·
silence 沉默 · freeze 冰冻 · untargetable 不可被选中 · minion 随从 · Deity 神祇 ·
„(Unlocks at Lv.X)" → （X级解锁） · „(Unlock at Relic Lv.X)" → （圣物X级解锁） ·
„DMG equal to X% of ATK" → 相当于攻击力X%的伤害 · CN-Server 国服 · Global 国际服.
Zustände in 【】: z. B. [Revenge] → 【复仇】.

## Typische Aufgaben

**Texte eines Helden nachschlagen:**
Original: `src/data/heroes/<id>.json` · Übersetzungen: `src/data/heroes/i18n/<id>.json` ·
offizielle CN-Namen: `cn`-Block in der Basis-Datei.

**Neuen Helden / neue Texte übersetzen:**
1. EN-Texte aus `src/data/heroes/<id>.json` ziehen.
2. Overlay `src/data/heroes/i18n/<id>.json` ergänzen — jede Map mit `en` + Zielsprache(n).
3. JSON validieren, `npm run build`, Seite `/zh/heroes/<id>` (bzw. `/de/…`) prüfen.

**Vollständigkeit prüfen** (jede Map braucht `en`, zh soll komplett sein):
```bash
python3 - << 'EOF'
import json, glob, os
LOCS = {'en','de','es','ru','zh'}
is_map = lambda v: isinstance(v, dict) and v and set(v) <= LOCS
def walk(n, p):
    if is_map(n):
        miss = [k for k in ('en','zh') if k not in n]
        if miss: print(p, 'fehlt:', miss)
        return
    if isinstance(n, dict):  [walk(v, f'{p}.{k}') for k, v in n.items()]
    if isinstance(n, list):  [walk(v, f'{p}[{i}]') for i, v in enumerate(n)]
for f in sorted(glob.glob('src/data/heroes/i18n/*.json')):
    walk(json.load(open(f)), os.path.basename(f)[:-5])
EOF
```

**Neue Sprache hinzufügen:** `locales`, `localeLabels`, `localeNames` in
`src/i18n/config.ts` erweitern → alle Keys in `src/i18n/ui.ts` übersetzen →
`nav.ts` + `events.json` → Hero-Overlays schrittweise (Fallback EN greift solange).

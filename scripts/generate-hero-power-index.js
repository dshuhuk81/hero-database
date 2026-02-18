import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HERO_DIR = path.join(ROOT, "src", "data", "heroes");
const OUT_DIR = path.join(ROOT, "src", "data", "derived");
const OUT_FILE = path.join(OUT_DIR, "heroPowerIndex.json");

function readJson(fp) {
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}
function writeJson(fp, data) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function listHeroFiles() {
  return fs.readdirSync(HERO_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => path.join(HERO_DIR, f));
}

function toTextBlob(hero) {
  const parts = [];
  if (hero.description) parts.push(hero.description);
  if (hero.passive?.description) parts.push(hero.passive.description);
  if (hero.relic?.description) parts.push(hero.relic.description);

  if (Array.isArray(hero.skills)) {
    for (const sk of hero.skills) {
      if (sk?.name) parts.push(sk.name);
      if (sk?.description) parts.push(sk.description);
      if (Array.isArray(sk?.mechanics)) parts.push(sk.mechanics.join(" "));
    }
  }
  return parts.join("\n").toLowerCase();
}

/**
 * Try to extract common numeric stats across inconsistent schemas.
 * Adjust mapping here if your hero JSON uses different keys.
 */
function extractStats(hero) {
  const s = hero.stats ?? hero.stat ?? hero.baseStats ?? {};
  const get = (...keys) => {
    for (const k of keys) {
      const v = s?.[k];
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }
    return null;
  };

  // Common guesses (you can extend this without touching the algorithm)
  return {
    // Core stats
    atk: get("atk", "ATK", "attack", "Attack"),
    hp: get("hp", "HP", "health", "Health"),
    def: get("def", "DEF", "armor", "Armor", "armor"),
    mres: get("mres", "mRes", "MRES", "m_res", "magicRes", "MagicRes", "mr", "MR"),
    atkSpd: get("atkSpd", "atk_spd", "ATK_SPD", "attackSpeed", "AttackSpeed", "spd", "SPD", "atkSpdBonus"),
    crit: get("crit", "Crit", "critRate", "CritRate", "cr", "CR"),
    
    // New stats
    might: get("might", "Might"),
    critRes: get("critRes", "crit_res", "CritRes"),
    critDmgBonus: get("critDmgBonus", "crit_dmg", "critDmg"),
    critDmgRed: get("critDmgRed", "crit_dmg_red", "critDmgReduction"),
    dodgeRate: get("dodgeRate", "dodge", "dodgeRate"),
    hitBonus: get("hitBonus", "hit", "hit_bonus"),
    energy: get("energy", "Energy"),
    cooldownHaste: get("cooldownHaste", "cooldown_haste", "cooldownHaste"),
    
    // Damage & defense variants
    pDmgBonus: get("pDmgBonus", "phys_dmg_bonus"),
    pDmgRed: get("pDmgRed", "phys_dmg_red"),
    mDmgBonus: get("mDmgBonus", "mag_dmg_bonus"),
    mDmgRed: get("mDmgRed", "mag_dmg_red"),
    
    // Special effects
    healEff: get("healEff", "heal_eff"),
    rechargeEff: get("rechargeEff", "recharge_eff"),
    lifestealEff: get("lifestealEff", "lifesteal_eff"),
    reflectEff: get("reflectEff", "reflect_eff"),
    effectRes: get("effectRes", "effect_res"),
    effectHit: get("effectHit", "effect_hit"),
    controlRes: get("controlRes", "control_res"),
    controlBonus: get("controlBonus", "control_bonus"),
    
    // Power scaling
    normalSkillPWR: get("normalSkillPWR", "normal_skill_pwr"),
    ultimatePWR: get("ultimatePWR", "ultimate_pwr"),
  };
}

function avg(values) {
  const xs = values.filter(v => typeof v === "number" && Number.isFinite(v));
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function percentileNormalize(x, min, max) {
  if (max <= min) return 0.5;
  return clamp((x - min) / (max - min), 0, 1);
}

// --- Text signals (facts via regex) ---
const SIGNALS = [
  // Synergy Engine
  { key: "ENERGY", points: 7, re: /\benergy\b|\brestore(s|d)? energy\b|\bgain(s|ed)? energy\b/ },
  { key: "COOLDOWN", points: 7, re: /\bcooldown\b|\bcdr\b|\breduce(s|d)? cooldown\b/ },
  { key: "ATK_SPEED", points: 5, re: /\batk spd\b|\battack speed\b|\bincrease(s|d)? .*speed\b/ },

  // Damage profile / scaling
  { key: "PERCENT_HP_DAMAGE", points: 6, re: /%.*max hp|max hp.*%|percent.*hp|of target'?s max hp/ },
  { key: "TRUE_DAMAGE", points: 8, re: /\btrue dmg\b|\btrue damage\b/ },
  { key: "AOE", points: 4, re: /\ball enemies\b|\ball targets\b|\bao?e\b|\bto all\b/ },
  { key: "DEF_SHRED", points: 6, re: /\breduce(s|d)? (armor|def|m-?res)\b|\bdef shred\b|\barmor shred\b/ },
  { key: "DAMAGE_AMP", points: 6, re: /\bincrease(s|d)? dmg\b|\bdmg (taken|dealt) increased\b|\bvulnerable\b/ },

  // Sustain / protection
  { key: "ALLY_HEAL", points: 7, re: /\bheal(s|ed)? allies\b|\brestore(s|d)? hp to allies\b|\blowest hp ally\b/ },
  { key: "SELF_HEAL", points: 4, re: /\bheal(s|ed)? self\b|\brestore(s|d)? hp\b/ },
  { key: "SHIELD", points: 6, re: /\bshield\b/ },
  { key: "DAMAGE_REDUCTION", points: 6, re: /\bdmg taken reduced\b|\breduce(s|d)? dmg taken\b|\bdamage reduction\b|\binvulnerable\b|\binvincibl(e|ity)\b/ },
  { key: "CLEANSE", points: 6, re: /\bcleanse\b|\bremove(s|d)? (debuffs|negative effects)\b/ },

  // Control
  { key: "STUN", points: 7, re: /\bstun(ned)?\b/ },
  { key: "SILENCE", points: 6, re: /\bsilence(d)?\b/ },
  { key: "ROOT", points: 5, re: /\broot(ed)?\b/ },
  { key: "KNOCKBACK", points: 4, re: /\bknock\s?back\b/ },
  { key: "SLOW", points: 3, re: /\bslow(ed)?\b/ },

  // Scaling keywords
  { key: "STACKS", points: 4, re: /\bstack(s|ed)?\b|\bstacks up to\b/ },
  { key: "FOR_ENTIRE_BATTLE", points: 4, re: /\bfor the entire battle\b|\bfor the whole battle\b|\bpermanent(ly)?\b/ },
  { key: "RAMPING", points: 3, re: /\bramp(s|ing)?\b|\bincrease(s|d)? over time\b/ },
];

function scoreFromText(hero) {
  const blob = toTextBlob(hero);
  const hits = [];
  let total = 0;

  for (const s of SIGNALS) {
    if (s.re.test(blob)) {
      total += s.points;
      hits.push(s.key);
    }
  }

  // Soft bonus: more explicit numeric details often means “real effect density”
  const numbers = blob.match(/\d+(\.\d+)?%?/g)?.length ?? 0;
  const numericDensityBonus = clamp(numbers / 25, 0, 1) * 4; // max +4
  total += numericDensityBonus;

  return { total, hits, numericDensityBonus };
}

/**
 * Stat score: normalize per-stat relative to roster distribution.
 * This is FACT-based, not meta-based.
 */
function buildStatNormalizers(heroes) {
  const rows = heroes.map(h => ({ id: h.id, stats: extractStats(h) }));

  const keys = [
    "atk", "hp", "def", "mres", "atkSpd", "crit",
    "might", "critRes", "critDmgBonus", "critDmgRed", "dodgeRate", "hitBonus", "energy", "cooldownHaste",
    "pDmgBonus", "pDmgRed", "mDmgBonus", "mDmgRed",
    "healEff", "rechargeEff", "lifestealEff", "reflectEff", "effectRes", "effectHit", "controlRes", "controlBonus",
    "normalSkillPWR", "ultimatePWR"
  ];
  const dist = {};
  for (const k of keys) {
    const vals = rows.map(r => r.stats[k]).filter(v => typeof v === "number");
    if (vals.length === 0) continue;
    dist[k] = {
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg: avg(vals)
    };
  }
  return dist;
}

function scoreFromStats(hero, dist) {
  const st = extractStats(hero);

  // Weights: tweakable but stable defaults
  // Higher weight = more impact on overall score
  const W = {
    // Core offensive stats
    atk: 1.0,
    might: 1.0,
    ultimatePWR: 1.0,
    normalSkillPWR: 0.8,
    
    // Core defensive stats
    hp: 0.75,
    def: 0.65,
    mres: 0.65,
    
    // Damage variations
    pDmgBonus: 0.8,
    mDmgBonus: 0.8,
    pDmgRed: 0.6,
    mDmgRed: 0.6,
    
    // Crit system
    crit: 0.25,
    critRes: 0.5,
    critDmgBonus: 0.6,
    critDmgRed: 0.5,
    
    // Mobility & targeting
    atkSpd: 0.8,
    dodgeRate: 0.7,
    hitBonus: 0.4,
    
    // Effect system
    effectHit: 0.5,
    effectRes: 0.6,
    controlBonus: 0.7,
    controlRes: 0.6,
    
    // Sustain & economy
    healEff: 0.7,
    lifestealEff: 0.6,
    reflectEff: 0.4,
    rechargeEff: 0.5,
    
    // Cooldown & energy
    cooldownHaste: 0.6,
    energy: 0.3
  };

  let total = 0;
  const parts = {};

  for (const [k, w] of Object.entries(W)) {
    const v = st[k];
    if (typeof v !== "number" || !dist[k]) { parts[k] = 0; continue; }

    // normalize to 0..1 within roster range
    const n = percentileNormalize(v, dist[k].min, dist[k].max);
    const points = n * (w * 25); // each channel contributes up to ~25*w
    parts[k] = points;
    total += points;
  }

  return { total, parts, raw: st };
}

function tierFromScore(score100) {
  if (score100 >= 90) return "SSS";
  if (score100 >= 80) return "SS";
  if (score100 >= 70) return "S";
  if (score100 >= 60) return "A";
  if (score100 >= 50) return "B";
  return "C";
}

function main() {
  const files = listHeroFiles();
  const heroes = files.map(readJson).filter(h => h && h.id);

  const dist = buildStatNormalizers(heroes);

  // First pass: compute raw totals
  const raw = heroes.map(hero => {
    const stat = scoreFromStats(hero, dist);
    const text = scoreFromText(hero);

    // Balance: stats are “base power”, text signals are “kit power”
    // Keep them comparable by capping text to avoid “regex spam” dominating.
    const textCapped = Math.min(text.total, 40); // max 40 raw points from text

    const rawTotal = stat.total + textCapped;

    return {
      id: hero.id,
      name: hero.name ?? hero.id,
      rawTotal,
      stat,
      text: { ...text, total: textCapped }
    };
  });

  // Normalize raw totals to 0..100 across roster
  const totals = raw.map(r => r.rawTotal);
  const min = Math.min(...totals);
  const max = Math.max(...totals);

  const outHeroes = {};
  for (const r of raw) {
    const score100 = Math.round(percentileNormalize(r.rawTotal, min, max) * 100);

    outHeroes[r.id] = {
      score: score100,
      tier: tierFromScore(score100),
      breakdown: {
        stats: Math.round(r.stat.total),
        kitText: Math.round(r.text.total),
        statParts: Object.fromEntries(Object.entries(r.stat.parts).map(([k, v]) => [k, Math.round(v)])),
        numericDensityBonus: Math.round(r.text.numericDensityBonus)
      },
      signals: r.text.hits.sort()
    };
  }

  writeJson(OUT_FILE, {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    method: "HPI_B (stats + kit text signals)",
    weights: {
      stats: "normalized per-stat within roster, weighted",
      kitText: "regex signals with cap=40 + numeric density bonus"
    },
    heroes: outHeroes
  });

  console.log(`✅ Wrote ${OUT_FILE} (${Object.keys(outHeroes).length} heroes)`);
}

main();
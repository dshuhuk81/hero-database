// scripts/generator.js
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { keywordTagsForHero, fullSkillText } from "../src/utils/heroTags.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HERO_DIR = "src/data/heroes";
const TAGS_FILE = "src/data/tags.json";
const OUT_FILE = "src/data/derived/teamCompsByHeroId.json";

// Load tags from file
let SYNERGY_TAGS = {};
let ALL_SYNERGY_TAG_LIST = [];

async function loadTags() {
  try {
    const data = await fs.readFile(TAGS_FILE, 'utf-8');
    const tags = JSON.parse(data);
    
    // Convert array to object for compatibility with existing code
    SYNERGY_TAGS = {};
    for (const tag of tags) {
      SYNERGY_TAGS[tag] = tag;
    }
    ALL_SYNERGY_TAG_LIST = tags;
  } catch {
    // Fallback to default tags if file doesn't exist
    SYNERGY_TAGS = {
      // A) TEAM SUPPORT (9 Tags) - alphabetically sorted
      ATK_SPD_UP: "ATK_SPD_UP",
      BUFF_TEAM: "BUFF_TEAM",
      CC_IMMUNITY_TEAM: "CC_IMMUNITY_TEAM",
      CDR_TEAM: "CDR_TEAM",
      DAMAGE_REDUCTION_TEAM: "DAMAGE_REDUCTION_TEAM",
      DEBUFF_CLEANSE_TEAM: "DEBUFF_CLEANSE_TEAM",
      ENERGY_RESTORE_TEAM: "ENERGY_RESTORE_TEAM",
      HEAL_TEAM: "HEAL_TEAM",
      SHIELD_TEAM: "SHIELD_TEAM",

      // B) ENEMY DEBUFF (9 Tags) - alphabetically sorted
      ATK_DOWN: "ATK_DOWN",
      ATK_SPD_DOWN: "ATK_SPD_DOWN",
      BUFF_DISPEL: "BUFF_DISPEL",
      CROWD_CONTROL: "CROWD_CONTROL",
      ENEMY_VULNERABILITY: "ENEMY_VULNERABILITY",
      ENERGY_DRAIN: "ENERGY_DRAIN",
      REDUCES_ATTRIBUTES: "REDUCES_ATTRIBUTES",
      REMOVES_ARMOR: "REMOVES_ARMOR",
      TAUNT: "TAUNT",

      // C) PLAYSTYLE (2 Tags) - alphabetically sorted
      AREA_DAMAGE_DEALER: "AREA_DAMAGE_DEALER",
      BASIC_ATTACK_SCALER: "BASIC_ATTACK_SCALER",

      // D) SELF BUFFS (13 Tags) - alphabetically sorted
      ATK_SPEED: "ATK_SPEED",
      ATK_UP: "ATK_UP",
      CC_RESISTANCE: "CC_RESISTANCE",
      DMG_RED: "DMG_RED",
      DODGE_BUFF: "DODGE_BUFF",
      ENERGY_RESTORE: "ENERGY_RESTORE",
      GAIN_ARMOR: "GAIN_ARMOR",
      HEAL: "HEAL",
      HEAL_EFFECT_UP: "HEAL_EFFECT_UP",
      HIT_AVOID: "HIT_AVOID",
      HP_UP: "HP_UP",
      LIFE_STEAL_UP: "LIFE_STEAL_UP",
      SHIELD: "SHIELD",
    };
    ALL_SYNERGY_TAG_LIST = Object.values(SYNERGY_TAGS);
  }
}

const CFG = {
  seed: 1337,
  attemptsPerHero: 800,
  keepTop: 3, // exactly 3 comps per mode (meta / bonus35 OR bestBonus / mixed)
  candidatePoolSize: 30,

  // ✅ NEW
  synergyStrict: true,   // only emit synergy statements if evidence for BOTH sides exists
  synergyDebug: true,    // export debug bundle per comp for UI inspection
};

// -----------------------------
// Helpers
// -----------------------------
function escapeRegExp(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeRng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17; s >>>= 0;
    s ^= s << 5;  s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}

async function loadHeroes() {
  const files = await fs.readdir(HERO_DIR);
  const heroes = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(HERO_DIR, f), "utf-8");
    const h = JSON.parse(raw);
    if (!h?.id) continue;
    heroes.push(h);
  }
  return heroes;
}

// -----------------------------
// Team keys / dedup
// -----------------------------
function uniqueTeamKey(ids) {
  return [...ids].sort().join("|");
}

// -----------------------------
// Ratings (overall/pve/pvp) mapping
// -----------------------------
const OVERALL_RATING_VALUE = { SSS: 10, SS: 9, S: 8, A: 6, B: 4, C: 2, D: 1 };

function overallRatingValue(h) {
  const raw = (h?.ratings?.overall ?? h?.rating ?? "C");
  const key = String(raw).toUpperCase();
  return OVERALL_RATING_VALUE[key] ?? 2;
}

function modeRatingValue(h, mode = "general") {
  const raw =
    mode === "pve"
      ? (h?.ratings?.pve ?? h?.ratings?.overall ?? h?.rating ?? "C")
      : mode === "pvp"
      ? (h?.ratings?.pvp ?? h?.ratings?.overall ?? h?.rating ?? "C")
      : (h?.ratings?.overall ?? h?.rating ?? "C");

  const key = String(raw).toUpperCase();
  return OVERALL_RATING_VALUE[key] ?? 2;
}

function teamModeAvg(team, mode = "general") {
  const vals = team.map(h => modeRatingValue(h, mode));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// -----------------------------
// Faction bonus (Starglint joker)
// -----------------------------
function factionBonus(team) {
  const counts = {};
  let starglint = 0;

  for (const h of team) {
    const f = h.faction;
    if (String(f).toLowerCase() === "starglint") {
      starglint++;
      continue;
    }
    counts[f] = (counts[f] || 0) + 1;
  }

  if (starglint === 5) return { pct: 35, effectiveFaction: "Starglint" };

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const dominantFaction = entries[0]?.[0] ?? "";
  const dominantBase = entries[0]?.[1] ?? 0;
  const second = entries[1]?.[1] ?? 0;

  const dominant = dominantBase + starglint;

  let pct = 0;
  if (dominant === 5) pct = 35;
  else if (dominant === 4) pct = 30;
  else if (dominant === 3 && second === 2) pct = 25;
  else if (dominant === 3) pct = 15;

  return { pct, effectiveFaction: dominantFaction || "Mixed" };
}

// -----------------------------
// Formation (frontline preference)
// -----------------------------
function durabilityScore(h) {
  const s = h.stats || {};
  const hp = Number(s.hp || 0);
  const armor = Number(s.armor || 0);
  const mres = Number(s.magicRes || 0);
  return hp * 1.0 + armor * 20 + mres * 20;
}

function prefersBackline(h) {
  const cls = String(h.class || "").toLowerCase();
  return ["archer", "mage", "support"].includes(cls);
}

function buildFormation(team) {
  const frontCandidates = team.filter(h => !prefersBackline(h));
  const pool = frontCandidates.length >= 2 ? frontCandidates : team;

  const sorted = [...pool].sort((a, b) => durabilityScore(b) - durabilityScore(a));
  const front = sorted.slice(0, 2).map(h => h.id);
  const back = team.filter(h => !front.includes(h.id)).map(h => h.id);
  return { front, back };
}

// =====================
// Synergy tags/score + explanation (STRICT + EVIDENCE + DEBUG EXPORT)
// =====================
// Tags are loaded dynamically from tags.json in loadTags()
// See loadTags() function at top for initialization

const SYNERGY_STRICT_MODE = Boolean(CFG.synergyStrict);
const SYNERGY_DEBUG_EXPORT = Boolean(CFG.synergyDebug);

// --- Snippet helper: kurzer Auszug um das Match herum ---
function snippetAround(text, matchIndex, maxLen = 180) {
  const raw = String(text || "");
  const idx = Math.max(0, Number(matchIndex || 0));
  const start = Math.max(0, idx - Math.floor(maxLen / 2));
  const end = Math.min(raw.length, start + maxLen);
  const s = raw.slice(start, end).replace(/\s+/g, " ").trim();
  return (start > 0 ? "…" : "") + s + (end < raw.length ? "…" : "");
}

// 🆕 NEW: Baut Profil aus MANUELLEN Synergies-Tags (JSON field)
function synergyProfileFromManual(hero) {
  const raw = fullSkillText(hero) || "";
  const forbidsNormals = /\bno longer performs normal attacks\b/i.test(raw);

  // Liest synergies [] aus hero.synergies
  const manualTags = Array.isArray(hero.synergies) ? hero.synergies : [];
  const tags = new Set(manualTags);

  // Evidence sammeln (für Debug-Export)
  const evidenceByTag = {};
  for (const tag of manualTags) {
    evidenceByTag[tag] = {
      heroId: hero.id,
      heroName: hero.name,
      tag,
      snippet: "(manually assigned)",
      match: "(from synergies field)",
    };
  }

  return { tags, evidenceByTag, forbidsNormals };
}

// TagMap pro Team – using MANUAL synergies now
function buildSynergyMap(team) {
  const map = new Map();
  for (const h of team) map.set(h.id, synergyProfileFromManual(h));
  return map;
}

function synergyScore(team) {
  const prof = buildSynergyMap(team);
  const has = (tag) => team.some(h => prof.get(h.id)?.tags?.has(tag));

  let s = 0;

  // ATK Speed TEAM provider + hit scalers
  const atkSpeedProviders = team.filter(h => prof.get(h.id)?.tags?.has(SYNERGY_TAGS.ATK_SPD_UP));
  const hitScalers = team.filter(h => {
    const tg = prof.get(h.id)?.tags;
    return tg?.has(SYNERGY_TAGS.BASIC_ATTACK_SCALER) || tg?.has(SYNERGY_TAGS.AREA_DAMAGE_DEALER);
  });

  if (atkSpeedProviders.length && hitScalers.length) {
    const cross = atkSpeedProviders.some(p => hitScalers.some(r => r.id !== p.id));
    s += cross ? 35 : 18;
  }

  // Energy TEAM provider + ult dependent
  if (has(SYNERGY_TAGS.ENERGY_RESTORE_TEAM) && has(SYNERGY_TAGS.AREA_DAMAGE_DEALER)) s += 25;

  // DEF down + AoE profile
  if (has(SYNERGY_TAGS.ENEMY_VULNERABILITY) && has(SYNERGY_TAGS.AREA_DAMAGE_DEALER)) s += 18;

  return Math.min(s, 90);
}

// Pair synergies - removed (using manual tag assignment instead)
function detectPairSynergies(team) {
  return []; // Manual tags only
}

// Team synergies - removed (using manual tag assignment instead)
function detectTeamSynergies(team) {
  return []; // Manual tags only
}

function synergyExplanation(team) {
  const pair = detectPairSynergies(team);
  const teamLevel = detectTeamSynergies(team);

  // Deduplicate by kind/from/to/text
  const seen = new Set();
  const combined = [];
  for (const x of [...pair, ...teamLevel]) {
    const key = `${x.type}|${x.kind || ""}|${x.from || ""}|${x.to || ""}|${x.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(x);
  }

  // STRICT: wenn evidence fehlt, rausfiltern (zusätzliche Sicherung)
  const filtered = SYNERGY_STRICT_MODE
    ? combined.filter(x => {
        if (x.type === "team") return Array.isArray(x.evidence) && x.evidence.length >= 1;
        return Array.isArray(x.evidence) && x.evidence.length >= 2;
      })
    : combined;

  return filtered.slice(0, 5);
}

// Debug export: pro Hero, pro Tag: evidence oder null
function buildSynergyDebug(team) {
  const prof = buildSynergyMap(team);

  const heroes = team.map(h => {
    const p = prof.get(h.id);
    const tagRows = ALL_SYNERGY_TAG_LIST.map(tag => {
      const ev = p.evidenceByTag[tag] || null;
      return {
        tag,
        hasEvidence: Boolean(ev),
        snippet: ev?.snippet ?? null,
        match: ev?.match ?? null,
      };
    });

    return {
      heroId: h.id,
      heroName: h.name,
      forbidsNormals: Boolean(p.forbidsNormals),
      detectedTags: Array.from(p.tags),
      tags: tagRows,
    };
  });

  return {
    strictMode: SYNERGY_STRICT_MODE,
    heroes,
  };
}

/*
  WICHTIG: In mkComp(...) bitte ergänzen:

  const synergy = synergyExplanation(team);
  const synergyDebug = SYNERGY_DEBUG_EXPORT ? buildSynergyDebug(team) : null;

  return {
    ...
    synergy,
    synergyDebug,
  };
*/


// -----------------------------
// Facts (optional, mostly unchanged)
// -----------------------------
function isAssassinClass(h) {
  return String(h.class || "").toLowerCase() === "assassin";
}

function hasBacklineTargetText(h) {
  const t = fullSkillText(h).toLowerCase();
  return (
    t.includes("farthest enemy") ||
    t.includes("back row") ||
    t.includes("rear row") ||
    t.includes("behind") ||
    t.includes("teleport") ||
    t.includes("blink")
  );
}

function shortQuote(text, maxWords = 12) {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  return words.length <= maxWords ? words.join(" ") : words.slice(0, maxWords).join(" ") + "…";
}

function extractSkillQuotes(hero, maxPerHero = 1) {
  const buckets = [
    { title: "Healing keyword", re: /\b(heal|restor)\w*\b/i },
    { title: "Shield keyword", re: /\bshield\b/i },
    { title: "Control keyword", re: /\b(stun|silence|freeze|root|sleep|charm|taunt|knock)\w*\b/i },
    { title: "AoE keyword", re: /\b(all enemies|nearby enemies|in a large area|aoe)\b/i },
    { title: "Cooldown keyword", re: /\b(cooldown|cd)\b/i },
    { title: "Energy keyword", re: /\benergy\b/i },
    { title: "Backline target keyword", re: /\b(farthest enemy|back row|rear row|behind|teleport|blink)\b/i },
  ];

  const out = [];
  const skills = hero.skills || [];
  for (let i = 0; i < skills.length; i++) {
    const sk = skills[i];
    const desc = sk?.description || "";
    if (!desc) continue;

    for (const b of buckets) {
      const m = desc.match(b.re);
      if (!m) continue;
      out.push({
        type: "skill_quote",
        heroId: hero.id,
        heroName: hero.name,
        title: `${b.title}: ${m[0]}`,
        value: `Skill “${sk.name ?? `#${i + 1}`}”: “${shortQuote(desc)}”`,
        source: { heroId: hero.id, field: `skills[${i}].description` },
      });
      break;
    }

    if (out.length >= maxPerHero) break;
  }
  return out;
}

function buildFacts(team) {
  const facts = [];

  const fb = factionBonus(team);
  facts.push({
    type: "faction_bonus",
    title: "Faction bonus",
    value: fb.pct === 0 ? "0% (no 3+ faction set)" : `${fb.pct}% ATK & HP (computed from factions; Starglint counts as a joker)`,
    source: { type: "computed", fields: ["hero.faction"] },
  });

  const assassins = team.filter(isAssassinClass);
  if (assassins.length) {
    facts.push({
      type: "rule",
      title: "Backline targeting (class rule)",
      value: `${assassins.map(a => a.name).join(", ")}: class = Assassin`,
      source: { type: "hero_field", fields: assassins.map(a => `${a.id}.class`) },
    });
  } else {
    const backliners = team.filter(hasBacklineTargetText);
    if (backliners.length) {
      facts.push({
        type: "rule",
        title: "Backline targeting (skill text)",
        value: `${backliners.map(b => b.name).join(", ")}: skill/relic text contains “behind/back row/farthest/teleport/blink”`,
        source: { type: "hero_field", fields: backliners.map(b => `${b.id}.skills[].description`) },
      });
    }
  }

  for (const h of team) {
    facts.push({
      type: "hero_identity",
      heroId: h.id,
      title: "Role / Class / Faction",
      value: `${h.name}: role=${h.role ?? "?"}, class=${h.class ?? "?"}, faction=${h.faction ?? "?"}`,
      source: { heroId: h.id, field: "role/class/faction" },
    });

    const s = h.stats || {};
    facts.push({
      type: "hero_stats",
      heroId: h.id,
      title: "Core stats",
      value: `${h.name}: HP=${s.hp ?? "?"}, ATK=${s.atk ?? "?"}, Armor=${s.armor ?? "?"}, M-RES=${s.magicRes ?? "?"}, Crit=${s.critRate ?? "?"}%`,
      source: { heroId: h.id, field: "stats" },
    });

    facts.push(...extractSkillQuotes(h, 1));
  }

  return facts;
}

// -----------------------------
// Heuristic score (mode-aware)
// -----------------------------
function heuristicScore(team, mode = "general") {
  let score = 0;

  const fb = factionBonus(team).pct;
  const fbNorm = fb / 35;
  score += Math.sqrt(fbNorm) * 220;

  // mode rating: overall/pve/pvp
  score += teamModeAvg(team, mode) * 25;

  for (const h of team) {
    const s = h.stats || {};
    score += Number(s.atk || 0) * 0.01;
    score += durabilityScore(h) * 0.00002;
  }

  const allText = team.map(h => fullSkillText(h).toLowerCase()).join(" ");

  const heal = /\b(heal|heals|healing|restore|restores|recover|recovers)\w*\b/.test(allText) ? 1 : 0;
  const shield = /\bshield\b/.test(allText) ? 1 : 0;
  const controlHits = (allText.match(/\b(stun|silence|freeze|root|sleep|charm|taunt|knock)\w*\b/g) || []).length;
  const aoeHits = (allText.match(/\b(all enemies|nearby enemies|in a large area|aoe)\b/g) || []).length;
  const backlineHits = (allText.match(/\b(farthest enemy|back row|rear row|teleport|blink)\b/g) || []).length;

  // base bonuses
  score += heal * 40;
  score += shield * 25;
  score += Math.min(6, controlHits) * 8;

  const topDur = Math.max(...team.map(durabilityScore));
  score += topDur * 0.00002;

  score += synergyScore(team);

  // Mode weights
  if (mode === "pvp") {
    score += Math.min(8, controlHits) * 6;
    score += Math.min(4, backlineHits) * 12;
    score += Math.min(6, aoeHits) * 4;
  }

  if (mode === "pve") {
    score += heal * 25;
    score += shield * 15;
    score += Math.min(6, aoeHits) * 3;
    score += topDur * 0.00002;
  }

  return score;
}

// -----------------------------
// Candidate pool (performance)
// -----------------------------
function pickCandidatePool(heroes) {
  const ranked = heroes
    .map(h => {
      const s = h.stats || {};
      const hp = Number(s.hp || 0);
      const atk = Number(s.atk || 0);
      const armor = Number(s.armor || 0);
      const mres = Number(s.magicRes || 0);
      const rating = overallRatingValue(h);
      const key = hp * 0.000003 + atk * 0.00008 + (armor + mres) * 0.002 + rating * 0.6;
      return { id: h.id, key };
    })
    .sort((a, b) => b.key - a.key);

  return ranked.slice(0, CFG.candidatePoolSize).map(x => x.id);
}

// -----------------------------
// Main
// -----------------------------
async function main() {
  // Load tags from file
  await loadTags();
  
  const heroes = await loadHeroes();
  const heroById = Object.fromEntries(heroes.map(h => [h.id, h]));
  const rng = makeRng(CFG.seed);

  const out = {};
  const globalPool = pickCandidatePool(heroes);

  for (const anchor of heroes) {
    const poolIds = globalPool.filter(id => id !== anchor.id);

    function buildCompsForMode(mode) {
      const best = [];

      for (let i = 0; i < CFG.attemptsPerHero; i++) {
        const used = new Set([anchor.id]);
        const teamIds = [anchor.id];

        while (teamIds.length < 5) {
          const pick = poolIds[Math.floor(rng() * poolIds.length)];
          if (used.has(pick)) continue;
          used.add(pick);
          teamIds.push(pick);
        }

        const team = teamIds.map(id => heroById[id]);
        const score = heuristicScore(team, mode);
        best.push({ teamIds, score });
      }

      best.sort((a, b) => b.score - a.score);

      // de-duplicate by team set
      const uniq = [];
      const seen = new Set();
      for (const cand of best) {
        const key = uniqueTeamKey(cand.teamIds);
        if (seen.has(key)) continue;
        seen.add(key);
        uniq.push(cand);
      }

      const mkComp = (cand, label) => {
        const team = cand.teamIds.map(id => heroById[id]);
        const synergy = synergyExplanation(team);
        const formation = buildFormation(team);
        const facts = buildFacts(team);
        const fb = factionBonus(team);

        const summary = {
          mode,
          label,
          factionBonusPct: fb.pct,
          effectiveFactionForBonus: fb.effectiveFaction,
          heroes: team.map(h => ({
            id: h.id,
            tags: keywordTagsForHero(h),
            class: h.class,
            faction: h.faction,
            role: h.role,
            overall: h?.ratings?.overall ?? null,
            pve: h?.ratings?.pve ?? null,
            pvp: h?.ratings?.pvp ?? null,
          })),
          formation,
        };

        const synergyDebug = CFG.synergyDebug ? buildSynergyDebug(team) : undefined;

        return {
          mode,
          label,
          team: cand.teamIds,
          formation,
          rankingScore: Math.round(cand.score * 10) / 10,
          summary,
          facts,
          synergy,
         synergyDebug,
        };
      };

      // 1) Meta
      const meta = uniq[0];
      const metaKey = meta ? uniqueTeamKey(meta.teamIds) : null;

      // 2) 35% bonus team (anchor must benefit)
      const bonus35 = uniq.find(c => {
        const team = c.teamIds.map(id => heroById[id]);
        const fb = factionBonus(team);

        if (fb.pct !== 35) return false;
        if (uniqueTeamKey(c.teamIds) === metaKey) return false;

        if (String(anchor.faction).toLowerCase() === "starglint") return true;
        return fb.effectiveFaction === anchor.faction;
      });

      const usedKeys = new Set([metaKey, bonus35 ? uniqueTeamKey(bonus35.teamIds) : null].filter(Boolean));

      const comps = [];
      if (meta) comps.push(mkComp(meta, "meta"));
      if (bonus35) comps.push(mkComp(bonus35, "bonus35"));

      // bestBonus fallback (>=15% and anchor benefits)
      if (!bonus35) {
        const bestBonus = uniq.find(c => {
          const key = uniqueTeamKey(c.teamIds);
          if (key === metaKey) return false;

          const team = c.teamIds.map(id => heroById[id]);
          const fb = factionBonus(team);
          if (fb.pct < 15) return false;

          if (String(anchor.faction).toLowerCase() === "starglint") return true;
          return fb.effectiveFaction === anchor.faction;
        });

        if (bestBonus) {
          comps.push(mkComp(bestBonus, "bestBonus"));
          usedKeys.add(uniqueTeamKey(bestBonus.teamIds));
        }
      }

      // Mixed: remaining (anchor benefits OR 0%)
      const mixed = uniq.find(c => {
        const key = uniqueTeamKey(c.teamIds);
        if (usedKeys.has(key)) return false;

        const team = c.teamIds.map(id => heroById[id]);
        const fb = factionBonus(team);

        if (String(anchor.faction).toLowerCase() === "starglint") return true;
        return fb.effectiveFaction === anchor.faction || fb.pct === 0;
      });

      if (mixed) comps.push(mkComp(mixed, "mixed"));

      return comps.slice(0, CFG.keepTop);
    }

    out[anchor.id] = {
      general: buildCompsForMode("general"),
      pve: buildCompsForMode("pve"),
      pvp: buildCompsForMode("pvp"),
    };
  }

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(out, null, 2), "utf-8");
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
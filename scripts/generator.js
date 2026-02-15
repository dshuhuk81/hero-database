// scripts/generator.js
import fs from "node:fs/promises";
import path from "node:path";

const HERO_DIR = "src/data/heroes";
const OUT_FILE = "src/data/derived/teamCompsByHeroId.json";

const CFG = {
  seed: 1337,
  attemptsPerHero: 800,
  keepTop: 3, // exactly 3 comps per mode (meta / bonus35 OR bestBonus / mixed)
  candidatePoolSize: 30,
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

function fullSkillText(h) {
  const parts = [];
  for (const sk of (h.skills || [])) {
    if (sk?.description) parts.push(sk.description);
    if (sk?.upgrades) parts.push(...Object.values(sk.upgrades));
  }
  if (h.relic?.description) parts.push(h.relic.description);
  if (h.relic?.upgrades) parts.push(...Object.values(h.relic.upgrades));
  return parts.join(" ");
}

// -----------------------------
// Tags (UI helper) – fixed heal logic
// -----------------------------
function keywordTagsForHero(hero) {
  const text = fullSkillText(hero).toLowerCase();
  const tags = [];
  const add = (label, ok) => { if (ok && !tags.includes(label)) tags.push(label); };

  // Positive ally heal
  const allyHeal =
    /\b(heals?|restores?|recovers?)\s+(?:hp|health)?\s*(?:to)?\s*(allies?|ally)\b/.test(text) ||
    /\b(heals?|restores?|recovers?)\s+(allies?|ally)\b/.test(text);

  // Self heal (e.g. "heals Amun-Ra", "heals self")
  const heroName = escapeRegExp(hero?.name?.toLowerCase?.() || "");
  const selfHeal =
    (heroName && new RegExp(`\\b(heals?|restores?|recovers?)\\s+${heroName}\\b`).test(text)) ||
    /\bheals?\s+self\b/.test(text);

  // Generic HP restore (can be self-heal; we only label as Self Heal if no Ally Heal)
  const genericHpRestore = /\b(restores?\s+hp|recovers?\s+hp)\b/.test(text);

  // Anti-heal patterns (Nyx case etc.)
  const antiHeal =
    /\b(cannot receive (?:shields? or )?healing|cannot be healed|prevents? healing|healing reduction|reduce(s|d)? healing|healing is reduced|stop(s|ped)? healing|ban(s|ned)? healing)\b/.test(text);

  add("Ally Heal", allyHeal);
  add("Self Heal", !allyHeal && (selfHeal || genericHpRestore));
  add("Anti-Heal", antiHeal);

  // Other tags
  add("Shield", /\bshield\b/.test(text));
  add("Cleanse", /\b(removes? (one|a) debuff|remove debuff|cleanse)\b/.test(text));
  add("Control", /\b(stun|silence|freeze|root|sleep|charm|taunt|knock)\w*\b/.test(text));
  add("AoE", /\b(all enemies|nearby enemies|in a large area|aoe)\b/.test(text));
  add("Energy", /\benergy\b/.test(text));
  add("Cooldown", /\b(cooldown|cd)\b/.test(text));
  add("Backline", /\b(farthest enemy|back row|rear row|behind|teleport|blink)\b/.test(text));
  add("Def Shred", /\b(reduce defense|defense down|armor down|vulnerab)\w*\b/.test(text));

  return tags.slice(0, 3);
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

// -----------------------------
// Synergy tags/score + explanation
// -----------------------------
function synergyTagsForHero(hero) {
  const t = fullSkillText(hero).toLowerCase();
  const tags = new Set();

  const hasAllies = /\b(all allies|allies|ally)\b/.test(t);

  // --- ATK SPEED: TEAM vs SELF ---
  const atkSpdAny = /\b(atk spd|attack speed|haste)\b/.test(t);
  const incWords = /\b(increas|grant|gain|bonus)\w*\b/.test(t);

  const atkSpdTeam =
    hasAllies &&
    atkSpdAny &&
    incWords;

  // “her ATK SPD…” / “Isis gains…” without allies
  const atkSpdSelf =
    atkSpdAny &&
    incWords &&
    !atkSpdTeam;

  if (atkSpdTeam) tags.add("ATK_SPEED_TEAM_PROVIDER");
  if (atkSpdSelf) tags.add("ATK_SPEED_SELF_ONLY");

  // --- ENERGY / CDR provider: nur wenn allies erwähnt ---
  if (hasAllies && /\b(reduc)\w*\b/.test(t) && /\b(cooldown|skill cd|cd)\b/.test(t)) {
    tags.add("CDR_TEAM_PROVIDER");
  }
  if (hasAllies && /\b(energy regen|energy regeneration|gain\w* energy|restore\w* energy)\b/.test(t)) {
    tags.add("ENERGY_TEAM_PROVIDER");
  }

  // --- DEF shred / amp bleibt ok (gegnerbezogen) ---
  if (/\b(reduce defense|defense down|armor down|vulnerab)\w*\b/.test(t)) {
    tags.add("DEF_SHRED_OR_AMP");
  }

  // --- Receiver: Hit scaling nur wenn es explizit um hits/normal attacks geht ---
  const forbidsNormals = /\bno longer performs normal attacks\b/.test(t);

  const normalAttackTrigger =
    /\bafter every \d+ normal attacks?\b/.test(t) ||
    /\bevery \d+ normal attacks?\b/.test(t);

  const onHit =
    /\b(on hit|each hit|per hit|per attack)\b/.test(t);

  const stackingWithHits =
    /\b(stacks?|stacking)\b/.test(t) && (onHit || /\bnormal attacks?|basic attacks?\b/.test(t));

  if (!forbidsNormals && normalAttackTrigger) tags.add("BASIC_ATTACK_SCALER");
  if (!forbidsNormals && onHit) tags.add("ON_HIT_SCALER");
  if (!forbidsNormals && stackingWithHits) tags.add("FAST_STACKING_WITH_HITS");

  // Ult dependent ok:
  if (/\b(ultimate|ultimates?|ult)\b/.test(t) && /\b(when|after|upon)\b/.test(t)) {
    tags.add("ULT_DEPENDENT");
  }

  // AoE profile ok:
  if (/\b(aoe|all enemies|nearby enemies|in a large area)\b/.test(t) && /\b(dmg|damage)\b/.test(t)) {
    tags.add("AOE_DAMAGE_PROFILE");
  }

  return tags;
}

function synergyScore(team) {
  const tagById = new Map(team.map(h => [h.id, synergyTagsForHero(h)]));
  const has = (tag) => team.some(h => tagById.get(h.id)?.has(tag));

  let s = 0;

  const atkSpeedProviders = team.filter(h => tagById.get(h.id)?.has("ATK_SPEED_PROVIDER"));
  const hitScalers = team.filter(h => {
    const tg = tagById.get(h.id);
    return tg?.has("BASIC_ATTACK_SCALER") || tg?.has("ON_HIT_SCALER") || tg?.has("FAST_STACKING_WITH_HITS");
  });
  if (atkSpeedProviders.length && hitScalers.length) {
    const cross = atkSpeedProviders.some(p => hitScalers.some(r => r.id !== p.id));
    s += cross ? 35 : 18;
  }

  if (has("ENERGY_PROVIDER") && has("ULT_DEPENDENT")) s += 25;
  if (has("DEF_SHRED_OR_AMP") && has("AOE_DAMAGE_PROFILE")) s += 18;

  return Math.min(s, 90);
}

function buildSynergyMap(team) {
  const map = new Map();
  for (const h of team) map.set(h.id, synergyTagsForHero(h));
  return map;
}

function detectPairSynergies(team) {
  const tagMap = buildSynergyMap(team);
  const results = [];

  for (const a of team) {
    for (const b of team) {
      if (a.id === b.id) continue;

      const aTags = tagMap.get(a.id);
      const bTags = tagMap.get(b.id);

      if (
      aTags.has("ATK_SPEED_TEAM_PROVIDER") &&
      (bTags.has("BASIC_ATTACK_SCALER") || bTags.has("ON_HIT_SCALER") || bTags.has("FAST_STACKING_WITH_HITS"))
      ) {
        results.push({ type: "pair", from: a.name, to: b.name, text: `${a.name} increases Attack Speed, enhancing ${b.name}'s hit-based scaling.` });
      }

      if (aTags.has("ENERGY_PROVIDER") && bTags.has("ULT_DEPENDENT")) {
        results.push({ type: "pair", from: a.name, to: b.name, text: `${a.name} provides Energy support, accelerating ${b.name}'s ultimate usage.` });
      }

      if (aTags.has("DEF_SHRED_OR_AMP") && bTags.has("AOE_DAMAGE_PROFILE")) {
        results.push({ type: "pair", from: a.name, to: b.name, text: `${a.name} reduces defenses, amplifying ${b.name}'s AoE damage.` });
      }
    }
  }
  return results;
}

function detectTeamSynergies(team) {
  const tagMap = buildSynergyMap(team);
  const tags = new Set();
  for (const h of team) for (const t of tagMap.get(h.id)) tags.add(t);

  const results = [];
  if (tags.has("ENERGY_PROVIDER") && tags.has("ULT_DEPENDENT")) results.push({ type: "team", text: "Energy support accelerates ultimate-based damage cycles." });
  if (tags.has("DEF_SHRED_OR_AMP") && tags.has("AOE_DAMAGE_PROFILE")) results.push({ type: "team", text: "Defense reduction enhances team-wide AoE burst." });
  if (tags.has("ATK_SPEED_PROVIDER") && tags.has("FAST_STACKING_WITH_HITS")) results.push({ type: "team", text: "Attack Speed boosts stacking-based damage scaling." });
  return results;
}

function synergyExplanation(team) {
  const pair = detectPairSynergies(team);
  const teamLevel = detectTeamSynergies(team);

  const uniqueTexts = new Set();
  const combined = [];
  for (const x of [...pair, ...teamLevel]) {
    if (!uniqueTexts.has(x.text)) {
      uniqueTexts.add(x.text);
      combined.push(x);
    }
  }
  return combined.slice(0, 5);
}

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

        return {
          mode,
          label,
          team: cand.teamIds,
          formation,
          rankingScore: Math.round(cand.score * 10) / 10,
          summary,
          facts,
          synergy,
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
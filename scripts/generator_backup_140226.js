// scripts/generator.js
import fs from "node:fs/promises";
import path from "node:path";

const HERO_DIR = "src/data/heroes";
const OUT_FILE = "src/data/derived/teamCompsByHeroId.json";

const CFG = {
  seed: 1337,
  attemptsPerHero: 800,
  // we output exactly 3 comps per hero (meta / 35% bonus / mixed)
  keepTop: 3,
  candidatePoolSize: 30,
};

function keywordTagsForHero(hero) {
  const text = fullSkillText(hero).toLowerCase();

  const tags = [];
  const add = (label, ok) => { 
    if (ok && !tags.includes(label)) tags.push(label); 
  };

  // ---------- HEAL LOGIC ----------

  // Positive ally heal
  const allyHeal = /\b(heals?|restores?|recovers?)\s+(?:hp|health)?\s*(?:to)?\s*(allies?|ally)\b/.test(text);

  // Self heal (e.g. "heals Amun-Ra")
  const selfHeal =
    new RegExp(`\\b(heals?|restores?|recovers?)\\s+${hero.name.toLowerCase()}\\b`).test(text) ||
    /\bheals?\s+self\b/.test(text);

  // Generic HP restore
  const genericHpRestore = /\b(restores?\s+hp|recovers?\s+hp)\b/.test(text);

  // Anti-heal patterns
  const antiHeal = /\b(cannot receive (?:shields? or )?healing|cannot be healed|prevents? healing|healing reduction|reduce(s|d)? healing|healing is reduced|stop(s|ped)? healing|ban(s|ned)? healing)\b/.test(text);

  // Final decisions
  add("Ally Heal", allyHeal);
  add("Self Heal", !allyHeal && (selfHeal || genericHpRestore));
  add("Anti-Heal", antiHeal);

  // ---------- OTHER TAGS ----------

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

// Synergy

function buildSynergyMap(team) {
  const map = new Map();
  for (const h of team) {
    map.set(h.id, synergyTagsForHero(h));
  }
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

      // ATK Speed → Hit Scaler
      if (
        aTags.has("ATK_SPEED_PROVIDER") &&
        (
          bTags.has("BASIC_ATTACK_SCALER") ||
          bTags.has("ON_HIT_SCALER") ||
          bTags.has("FAST_STACKING_WITH_HITS")
        )
      ) {
        results.push({
          type: "pair",
          from: a.name,
          to: b.name,
          text: `${a.name} increases Attack Speed, enhancing ${b.name}'s hit-based scaling.`
        });
      }

      // Energy → Ult Dependent
      if (
        aTags.has("ENERGY_PROVIDER") &&
        bTags.has("ULT_DEPENDENT")
      ) {
        results.push({
          type: "pair",
          from: a.name,
          to: b.name,
          text: `${a.name} provides Energy support, accelerating ${b.name}'s ultimate usage.`
        });
      }

      // DEF Shred → AoE
      if (
        aTags.has("DEF_SHRED_OR_AMP") &&
        bTags.has("AOE_DAMAGE_PROFILE")
      ) {
        results.push({
          type: "pair",
          from: a.name,
          to: b.name,
          text: `${a.name} reduces defenses, amplifying ${b.name}'s AoE damage.`
        });
      }
    }
  }

  return results;
}

function detectTeamSynergies(team) {
  const tagMap = buildSynergyMap(team);
  const tags = new Set();

  for (const h of team) {
    for (const t of tagMap.get(h.id)) {
      tags.add(t);
    }
  }

  const results = [];

  if (tags.has("ENERGY_PROVIDER") && tags.has("ULT_DEPENDENT")) {
    results.push({
      type: "team",
      text: "Energy support accelerates ultimate-based damage cycles."
    });
  }

  if (tags.has("DEF_SHRED_OR_AMP") && tags.has("AOE_DAMAGE_PROFILE")) {
    results.push({
      type: "team",
      text: "Defense reduction enhances team-wide AoE burst."
    });
  }

  if (tags.has("ATK_SPEED_PROVIDER") && tags.has("FAST_STACKING_WITH_HITS")) {
    results.push({
      type: "team",
      text: "Attack Speed boosts stacking-based damage scaling."
    });
  }

  return results;
}

function synergyExplanation(team) {
  const pair = detectPairSynergies(team);
  const teamLevel = detectTeamSynergies(team);

  // Remove duplicates
  const uniqueTexts = new Set();
  const combined = [];

  for (const x of [...pair, ...teamLevel]) {
    if (!uniqueTexts.has(x.text)) {
      uniqueTexts.add(x.text);
      combined.push(x);
    }
  }

  return combined.slice(0, 5); // limit output
}


// Team Fingerprint -----
function teamKeyFromIds(ids) {
  return [...ids].sort().join("|");
}

function teamKeyFromTeam(team) {
  // team = array of hero objects OR ids
  const ids = team.map(x => (typeof x === "string" ? x : x.id));
  return teamKeyFromIds(ids);
}

function teamKeyFromComp(comp) {
  // comp can have formation OR teamIds — support both
  const ids =
    comp?.teamIds ??
    [...(comp?.formation?.front ?? []), ...(comp?.formation?.back ?? [])];

  return teamKeyFromIds(ids);
}

// ---------- QUALITY (hero ratings from json) ----------
const OVERALL_RATING_VALUE = { SSS: 10, SS: 9, S: 8, A: 6, B: 4, C: 2, D: 1 };

function overallRatingValue(h) {
  const raw = (h?.ratings?.overall ?? h?.rating ?? "C");
  const key = String(raw).toUpperCase();
  return OVERALL_RATING_VALUE[key] ?? 2;
}

function teamOverallAvg(team) {
  const vals = team.map(overallRatingValue);
  return vals.reduce((a, b) => a + b, 0) / vals.length; // 1..10
}

// ---------- SYNERGY (facts-only, derived from skill text) ----------
function synergyTagsForHero(hero) {
  const t = fullSkillText(hero).toLowerCase();
  const tags = new Set();

  // Providers
  if (/\b(allies?|ally)\b/.test(t) && /\b(atk spd|attack speed|haste)\b/.test(t) && /\b(increas|grant|gain|bonus)\w*\b/.test(t)) {
    tags.add("ATK_SPEED_PROVIDER");
  }
  if (/\b(allies?|ally)\b/.test(t) && /\b(reduc)\w*\b/.test(t) && /\b(cooldown|skill cd|cd)\b/.test(t)) {
    tags.add("CDR_PROVIDER");
  }
  if (/\b(allies?|ally)\b/.test(t) && /\b(restore\w* energy|gain\w* energy|energy regeneration|energy regen)\b/.test(t)) {
    tags.add("ENERGY_PROVIDER");
  }
  if (/\b(reduce defense|defense down|armor down|vulnerab)\w*\b/.test(t)) {
    tags.add("DEF_SHRED_OR_AMP");
  }

  // Receivers
  if (/\b(normal attacks?|basic attacks?)\b/.test(t) || /\bafter every \d+ normal attacks?\b/.test(t)) {
    tags.add("BASIC_ATTACK_SCALER");
  }
  if (/\b(on hit|each hit|per hit|per attack)\b/.test(t)) {
    tags.add("ON_HIT_SCALER");
  }
  if (/\b(stacks?|stacking)\b/.test(t) && /\b(per hit|per attack|normal attacks?|basic attacks?)\b/.test(t)) {
    tags.add("FAST_STACKING_WITH_HITS");
  }
  if (/\b(ultimate|ultimates?|ult)\b/.test(t) && /\b(when|after|upon)\b/.test(t)) {
    tags.add("ULT_DEPENDENT");
  }

  // Profiles
  if (/\b(aoe|all enemies|nearby enemies|in a large area)\b/.test(t) && /\b(deals? (dmg|damage)|damage)\b/.test(t)) {
    tags.add("AOE_DAMAGE_PROFILE");
  }

  return tags;
}

function synergyScore(team) {
  const tagById = new Map(team.map(h => [h.id, synergyTagsForHero(h)]));
  const has = (tag) => team.some(h => tagById.get(h.id)?.has(tag));

  let s = 0;

  // ATK Speed provider + hit scalers
  const atkSpeedProviders = team.filter(h => tagById.get(h.id)?.has("ATK_SPEED_PROVIDER"));
  const hitScalers = team.filter(h => {
    const tg = tagById.get(h.id);
    return tg?.has("BASIC_ATTACK_SCALER") || tg?.has("ON_HIT_SCALER") || tg?.has("FAST_STACKING_WITH_HITS");
  });
  if (atkSpeedProviders.length && hitScalers.length) {
    const cross = atkSpeedProviders.some(p => hitScalers.some(r => r.id !== p.id));
    s += cross ? 35 : 18;
  }

  // Energy provider + ult dependent
  if (has("ENERGY_PROVIDER") && has("ULT_DEPENDENT")) s += 25;

  // DEF shred/amp + AoE
  if (has("DEF_SHRED_OR_AMP") && has("AOE_DAMAGE_PROFILE")) s += 18;

  return Math.min(s, 90);
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

// ---------- FACTS (computed from hero json only) ----------
// Starglint acts as a joker for faction bonus: e.g. 4 Hearts + 1 Starglint => treated as 5 Hearts.
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

  // all starglint
  if (starglint === 5) {
    return { pct: 35, effectiveFaction: "Starglint" };
  }

  // pick dominant non-starglint faction; assign all starglint to it for max bonus
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const dominantFaction = entries[0]?.[0] ?? "";
  const dominantBase = entries[0]?.[1] ?? 0;
  const second = entries[1]?.[1] ?? 0;
  const dominant = dominantBase + starglint;

  // compute pct from (dominant, second)
  let pct = 0;
  if (dominant === 5) pct = 35;
  else if (dominant === 4) pct = 30;
  else if (dominant === 3 && second === 2) pct = 25;
  else if (dominant === 3) pct = 15;

  // if there is no dominant faction (e.g. 1/1/1/1 + starglint), pct remains 0
  return { pct, effectiveFaction: dominantFaction || "Mixed" };
}

function durabilityScore(h) {
  const s = h.stats || {};
  const hp = Number(s.hp || 0);
  const armor = Number(s.armor || 0);
  const mres = Number(s.magicRes || 0);
  // simple linear combo; this is not displayed as "truth", only used for front selection/scoring
  return hp * 1.0 + armor * 20 + mres * 20;
}

function isAssassinClass(h) {
  return String(h.class || "").toLowerCase() === "assassin";
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

function extractSkillQuotes(hero, maxPerHero = 3) {
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
        value: `Skill “${sk.name ?? `#${i+1}`}”: “${shortQuote(desc)}”`,
        source: { heroId: hero.id, field: `skills[${i}].description` },
      });
      break;
    }

    if (out.length >= maxPerHero) break;
  }
  return out;
}

function prefersBackline(h) {
  const cls = String(h.class || "").toLowerCase();
  // conservative: these classes are usually NOT frontline
  return ["archer", "mage", "support"].includes(cls);
}

function buildFormation(team) {
  // Prefer: pick 2 most durable among frontline-eligible heroes.
  // Fallback: if the team has <2 eligible heroes, we still must place 2 in front.
  const frontCandidates = team.filter(h => !prefersBackline(h));
  const pool = frontCandidates.length >= 2 ? frontCandidates : team;

  const sorted = [...pool].sort((a, b) => durabilityScore(b) - durabilityScore(a));
  const front = sorted.slice(0, 2).map(h => h.id);
  const back = team.filter(h => !front.includes(h.id)).map(h => h.id);
  return { front, back };
}

function buildFacts(team) {
  const facts = [];

  const fb = factionBonus(team);
  facts.push({
    type: "faction_bonus",
    title: "Faction bonus",
    value:
      fb.pct === 0
        ? "0% (no 3+ faction set)"
        : `${fb.pct}% ATK & HP (computed from factions; Starglint counts as a joker)`,
    source: { type: "computed", fields: ["hero.faction"] },
  });

  // Assassin / backline targeting: only if proven by class or text
  const assassins = team.filter(isAssassinClass);
  if (assassins.length) {
    facts.push({
      type: "rule",
      title: "Backline targeting (class rule)",
      value: `${assassins.map(a=>a.name).join(", ")}: class = Assassin`,
      source: { type: "hero_field", fields: assassins.map(a => `${a.id}.class`) },
    });
  } else {
    const backliners = team.filter(hasBacklineTargetText);
    if (backliners.length) {
      facts.push({
        type: "rule",
        title: "Backline targeting (skill text)",
        value: `${backliners.map(b=>b.name).join(", ")}: skill/relic text contains “behind/back row/farthest/teleport/blink”`,
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

// ---------- HEURISTIC SCORE (selection only, no “truth claims”) ----------
function heuristicScore(team) {
  let score = 0;

  // Faction bonus (Starglint counts as joker). Softened a bit so it doesn't dominate.
  const fb = factionBonus(team).pct; // 0,15,25,30,35
  const fbNorm = fb / 35; // 0..1
  score += Math.sqrt(fbNorm) * 220;

  // Team quality from hero JSON ratings.overall
  score += teamOverallAvg(team) * 25; // avg 1..10 => +25..250

  for (const h of team) {
    const s = h.stats || {};
    score += Number(s.atk || 0) * 0.01;
    score += durabilityScore(h) * 0.00002;
  }

  const allText = team.map(h => fullSkillText(h).toLowerCase()).join(" ");
  const heal = /\b(heal|restor)\w*\b/.test(allText) ? 1 : 0;
  const shield = /\bshield\b/.test(allText) ? 1 : 0;
  const controlHits = (allText.match(/\b(stun|silence|freeze|root|sleep|charm|taunt|knock)\w*\b/g) || []).length;

  score += heal * 40;
  score += shield * 25;
  score += Math.min(6, controlHits) * 8;

  // encourage at least 1 “durable” front
  const topDur = Math.max(...team.map(durabilityScore));
  score += topDur * 0.00002;

  // Synergy (facts-only from skill text)
  score += synergyScore(team);

  return score;
}

function pickCandidatePool(heroes) {
  // stable pool: best blended stats; avoids full O(n^5)
  const ranked = heroes.map(h => {
    const s = h.stats || {};
    const hp = Number(s.hp || 0);
    const atk = Number(s.atk || 0);
    const armor = Number(s.armor || 0);
    const mres = Number(s.magicRes || 0);
    const rating = overallRatingValue(h);
    const key = hp * 0.000003 + atk * 0.00008 + (armor + mres) * 0.002 + rating * 0.6;
    return { id: h.id, key };
  }).sort((a,b)=>b.key-a.key);

  return ranked.slice(0, CFG.candidatePoolSize).map(x=>x.id);
}

function uniqueTeamKey(ids) {
  return [...ids].sort().join("|");
}

async function main() {
  const heroes = await loadHeroes();
  const heroById = Object.fromEntries(heroes.map(h => [h.id, h]));
  const rng = makeRng(CFG.seed);

  const out = {};
  const globalPool = pickCandidatePool(heroes);

  for (const anchor of heroes) {
    const poolIds = globalPool.filter(id => id !== anchor.id);
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
      const score = heuristicScore(team);

      best.push({ teamIds, score });
    }

    best.sort((a, b) => b.score - a.score);

    // de-duplicate candidates by team set
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
      const synergy = synergyExplanation(team); // Synergy
      const formation = buildFormation(team);
      const facts = buildFacts(team);
      const fb = factionBonus(team);
      const summary = {
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
        })),
        formation,
      };

      return {
        label,
        team: cand.teamIds,
        formation, // { front: [2], back: [3] }
        rankingScore: Math.round(cand.score * 10) / 10,
        summary,
        facts,
        synergy
      };
    };

    // 1) Meta: best overall
    const meta = uniq[0];

    // 2) 35% bonus team (Starglint joker applies)
    // Must:
    // - have 35%
    // - not equal to meta
    // - anchor must benefit from the effective faction
    const metaKey = meta ? uniqueTeamKey(meta.teamIds) : null;
    const bonus35 = uniq.find(c => {
    const team = c.teamIds.map(id => heroById[id]);
    const fb = factionBonus(team);

    if (fb.pct !== 35) return false;
    if (uniqueTeamKey(c.teamIds) === metaKey) return false;

    // Anchor must benefit (or be Starglint)
    if (anchor.faction === "Starglint") return true;
    return fb.effectiveFaction === anchor.faction;
    });

    // 3) Mixed: best remaining team that is not the same set as meta/bonus35
    const usedKeys = new Set([
    meta ? uniqueTeamKey(meta.teamIds) : null,
    bonus35 ? uniqueTeamKey(bonus35.teamIds) : null,
    ].filter(Boolean));

   
    // Fallbacks if no 35% team exists (rare): pick next best unused
    const comps = [];
    if (meta) comps.push(mkComp(meta, "meta"));
    if (bonus35) {
      comps.push(mkComp(bonus35, "bonus35"));
    }

    // Best bonus for anchor if no true 35% team exists (anchor must benefit)
    const bestBonus = uniq.find(c => {
      if (uniqueTeamKey(c.teamIds) === metaKey) return false;
      if (bonus35 && uniqueTeamKey(c.teamIds) === uniqueTeamKey(bonus35.teamIds)) return false;

      const team = c.teamIds.map(id => heroById[id]);
      const fb = factionBonus(team);

      // needs any bonus at all
      if (fb.pct < 15) return false;

      // anchor must benefit (or be Starglint)
      if (anchor.faction === "Starglint") return true;
      return fb.effectiveFaction === anchor.faction;
    });
    if (!bonus35 && bestBonus) {
      comps.push(mkComp(bestBonus, "bestBonus"));
      usedKeys.add(uniqueTeamKey(bestBonus.teamIds));
    }

    const mixed = uniq.find(c => {
    if (usedKeys.has(uniqueTeamKey(c.teamIds))) return false;

    const team = c.teamIds.map(id => heroById[id]);
    const fb = factionBonus(team);

    if (anchor.faction === "Starglint") return true;
    return fb.effectiveFaction === anchor.faction || fb.pct === 0;
    });

    if (mixed) comps.push(mkComp(mixed, "mixed"));

    out[anchor.id] = comps.slice(0, 3);
  }

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(out, null, 2), "utf-8");
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

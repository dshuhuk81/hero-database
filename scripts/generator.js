// scripts/generator.js
import fs from "node:fs/promises";
import path from "node:path";

const HERO_DIR = "src/data/heroes";
const OUT_FILE = "src/data/derived/teamCompsByHeroId.json";

const CFG = {
  seed: 1337,
  attemptsPerHero: 800,
  keepTop: 3,
  candidatePoolSize: 30,
};

function keywordTagsForHero(hero) {
  const text = fullSkillText(hero).toLowerCase();

  const tags = [];
  const add = (label, ok) => { if (ok && !tags.includes(label)) tags.push(label); };

  add("Heal", /\b(heal|restor)\w*\b/.test(text));
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
function factionBonusPct(team) {
  const counts = {};
  for (const h of team) counts[h.faction] = (counts[h.faction] || 0) + 1;
  const vals = Object.values(counts).sort((a,b)=>b-a);

  if (vals[0] === 5) return 35;
  if (vals[0] === 4) return 30;
  if (vals[0] === 3 && vals[1] === 2) return 25;
  if (vals[0] === 3) return 15;
  return 0;
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

function buildFormation(team) {
  // factual placement rule: 2 most durable in front
  const sorted = [...team].sort((a,b)=>durabilityScore(b)-durabilityScore(a));
  const front = sorted.slice(0, 2).map(h=>h.id);
  const back = team.filter(h=>!front.includes(h.id)).map(h=>h.id);
  return { front, back };
}

function buildFacts(team) {
  const facts = [];

  const fb = factionBonusPct(team);
  facts.push({
    type: "faction_bonus",
    title: "Faction bonus",
    value:
      fb === 0
        ? "0% (no 3+ faction set)"
        : `${fb}% ATK & HP (computed from factions)`,
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

const OVERALL_RATING_VALUE = {
  SSS: 10,
  SS: 9,
  S: 8,
  A: 6,
  B: 4,
  C: 2,
  D: 1,
};

function overallRatingValue(h) {
  const raw = (h?.ratings?.overall ?? h?.rating ?? "C");
  const key = String(raw).toUpperCase();
  return OVERALL_RATING_VALUE[key] ?? 2; // default C
}

function teamOverallAvg(team) {
  const vals = team.map(overallRatingValue);
  return vals.reduce((a, b) => a + b, 0) / vals.length; // 1..10
}


// ---------- HEURISTIC SCORE (selection only, no “truth claims”) ----------
function heuristicScore(team) {
  let score = 0;

  const fb = factionBonusPct(team);
  // soften faction bonus: still matters, but less dominant
  const fbNorm = fb / 35; // 0..1
  score += Math.sqrt(fbNorm) * 220; // 35% => +220, 30% => ~204, 25% => ~186, 15% => ~144

  // team quality from hero JSON ratings.overall
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

  return score;
}

function pickCandidatePool(heroes) {
  // stable pool: best blended stats; avoids full O(n^5)
  const ranked = heroes.map(h => {
    const s = h.stats || {};
    const hp = Number(s.hp || 0);
    const atk = Number(s.atk || 0);
    const armor = Number(s.armor || 0);
    const rating = overallRatingValue(h);
    const mres = Number(s.magicRes || 0);
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

    best.sort((a,b)=>b.score-a.score);

    const comps = [];
    const seen = new Set();
    for (const cand of best) {
      const key = uniqueTeamKey(cand.teamIds);
      if (seen.has(key)) continue;
      seen.add(key);

      const team = cand.teamIds.map(id => heroById[id]);
      const formation = buildFormation(team);
      const facts = buildFacts(team);
      const summary = {
        factionBonusPct: factionBonusPct(team),
        heroes: team.map(h => ({
        id: h.id,
        tags: keywordTagsForHero(h),
        class: h.class,
        faction: h.faction,
        role: h.role
        })),
        formation
      };

      comps.push({
        team: cand.teamIds,
        formation, // { front: [2], back: [3] }
        rankingScore: Math.round(cand.score * 10) / 10,
        summary,
        facts
      });

      if (comps.length >= CFG.keepTop) break;
    }

    out[anchor.id] = comps;
  }

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(out, null, 2), "utf-8");
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

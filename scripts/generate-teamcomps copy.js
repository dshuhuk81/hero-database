import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HERO_DIR = path.join(ROOT, "src", "data", "heroes");
const OUT_DIR = path.join(ROOT, "src", "data", "derived");
const OUT_FILE = path.join(OUT_DIR, "teamCompsByHeroId.json");
const CONFIG_FILE = path.join(OUT_DIR, "builder.config.json");

// ---------- helpers ----------
function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}
function lower(s) {
  return (s ?? "").toString().toLowerCase();
}
function uniqById(arr) {
  const seen = new Set();
  return arr.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}
function getAllHeroes() {
  const files = fs.readdirSync(HERO_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => readJson(path.join(HERO_DIR, f)));
}

function extractText(hero) {
  const skills = hero.skills ?? [];
  const relic = hero.relic ?? {};
  const chunks = [
    hero.name,
    hero.description,
    hero.role,
    hero.class,
    hero.faction,
    ...skills.map((s) => `${s.name} ${s.description} ${JSON.stringify(s.upgrades ?? {})}`),
    relic.name,
    relic.description,
    JSON.stringify(relic.upgrades ?? {})
  ];
  return lower(chunks.filter(Boolean).join(" | "));
}

function tagHero(hero, cfg) {
  const text = extractText(hero);
  const tags = new Set();

  for (const [tag, keywords] of Object.entries(cfg.keywordTags ?? {})) {
    for (const kw of keywords) {
      if (text.includes(lower(kw))) {
        tags.add(tag);
        break;
      }
    }
  }

  // class-based tags (deterministic)
  const cls = lower(hero.class);
  if (cls.includes("tank")) tags.add("tank");
  if (cls.includes("assassin")) tags.add("assassin");
  if (cls.includes("mage")) tags.add("mage");
  if (cls.includes("support")) tags.add("support");
  if (cls.includes("warrior")) tags.add("warrior");
  if (cls.includes("archer") || cls.includes("ranger")) tags.add("ranged");

  // role-based heuristics
  const role = lower(hero.role);
  if (role.includes("hefty")) tags.add("frontline");
  if (role.includes("nimble")) tags.add("nimble");

  // If tank/warrior/hefty → frontline
  if (tags.has("tank") || tags.has("warrior") || role.includes("hefty")) tags.add("frontline");

  // Starglint wildcard tag
  if (hero.faction === "Starglint") tags.add("wildcard");

  return [...tags];
}

function scoreHero(hero, tags) {
  const s = hero.stats ?? {};

  // normalize-ish (these numbers are huge; we use sqrt)
  const hp = Math.sqrt(Math.max(0, s.hp ?? 0));
  const atk = Math.sqrt(Math.max(0, s.atk ?? 0));
  const armor = Math.sqrt(Math.max(0, s.armor ?? 0));
  const mres = Math.sqrt(Math.max(0, s.magicRes ?? 0));
  const dodge = s.dodgeRate ?? 0;

  const survivability =
    hp * 1.2 +
    armor * 1.0 +
    mres * 1.0 +
    dodge * 10 +
    (tags.includes("shield") ? 80 : 0) +
    (tags.includes("taunt") ? 60 : 0);

  const healing =
    (tags.includes("healer") ? atk * 2.2 : 0) +
    (tags.includes("cleanse") ? 80 : 0) +
    (tags.includes("shield") ? 50 : 0);

  const control = (tags.includes("control") ? 200 : 0) + (tags.includes("taunt") ? 120 : 0);

  const burst = atk * (tags.includes("assassin") ? 1.6 : 1.0) + (tags.includes("mage") ? 20 : 0);

  const scaling = (tags.includes("energy") ? 120 : 0) + (tags.includes("mage") ? 40 : 0);

  const antiAssassin =
    (tags.includes("antiAssassin") ? 180 : 0) +
    (tags.includes("tank") ? 40 : 0) +
    (tags.includes("shield") ? 40 : 0);

  return { survivability, healing, control, burst, scaling, antiAssassin };
}

// ---------- archetypes ----------
function getArchetype(anchor) {
  const tags = anchor.__tags ?? [];
  const cls = lower(anchor.class);
  const role = lower(anchor.role);

  if (tags.includes("assassin") || cls.includes("assassin")) return "assassin_carry";
  if (tags.includes("tank") || tags.includes("frontline") || cls.includes("tank") || role.includes("hefty"))
    return "tank_frontliner";
  if (tags.includes("healer") || tags.includes("support") || cls.includes("support")) return "healer_support";
  if (tags.includes("mage") || tags.includes("ranged")) return "dps_carry";
  return "balanced";
}

const ARCHETYPES = {
  healer_support: {
    pve: [
      { slot: "frontline_1", needAny: ["frontline"] },
      { slot: "frontline_2", needAny: ["frontline"] },
      { slot: "carry", needAny: ["assassin", "mage", "ranged"], preferAny: ["scaling"] },
      { slot: "utility", needAny: [], preferAny: ["control", "energy", "shield"] }
    ],
    pvp: [
      { slot: "frontline_1", needAny: ["frontline"] },
      { slot: "frontline_2", needAny: ["frontline"] },
      { slot: "anti_assassin", needAny: [], preferAny: ["antiAssassin", "control", "shield"] },
      { slot: "tempo", needAny: ["assassin", "mage", "ranged"], preferAny: ["burst", "control"] }
    ]
  },
  tank_frontliner: {
    pve: [
      { slot: "healer", needAny: ["healer", "support"], preferAny: ["shield", "cleanse"] },
      { slot: "carry_1", needAny: ["assassin", "mage", "ranged"], preferAny: ["scaling"] },
      { slot: "carry_2", needAny: ["assassin", "mage", "ranged"], preferAny: ["scaling"] },
      { slot: "utility", needAny: [], preferAny: ["control", "energy", "shield"] }
    ],
    pvp: [
      { slot: "healer_or_shield", needAny: ["healer", "support", "shield"], preferAny: ["cleanse"] },
      { slot: "cc", needAny: [], preferAny: ["control", "taunt"] },
      { slot: "burst", needAny: ["assassin", "mage", "ranged"], preferAny: ["burst"] },
      { slot: "anti_assassin", needAny: [], preferAny: ["antiAssassin", "shield"] }
    ]
  },
  assassin_carry: {
    pve: [
      { slot: "frontline", needAny: ["frontline"] },
      { slot: "healer_or_shield", needAny: ["healer", "support", "shield"], preferAny: ["cleanse"] },
      { slot: "cc", needAny: [], preferAny: ["control"] },
      { slot: "carry_buddy", needAny: ["mage", "ranged"], preferAny: ["scaling"] }
    ],
    pvp: [
      { slot: "frontline", needAny: ["frontline"] },
      { slot: "healer_or_shield", needAny: ["healer", "support", "shield"], preferAny: ["cleanse"] },
      { slot: "cc", needAny: [], preferAny: ["control", "taunt"] },
      { slot: "finisher", needAny: ["assassin", "mage", "ranged"], preferAny: ["burst"] }
    ]
  },
  dps_carry: {
    pve: [
      { slot: "frontline_1", needAny: ["frontline"] },
      { slot: "frontline_2", needAny: ["frontline"] },
      { slot: "healer_or_shield", needAny: ["healer", "support", "shield"], preferAny: ["cleanse"] },
      { slot: "utility", needAny: [], preferAny: ["control", "energy"] }
    ],
    pvp: [
      { slot: "frontline", needAny: ["frontline"] },
      { slot: "healer_or_shield", needAny: ["healer", "support", "shield"], preferAny: ["cleanse"] },
      { slot: "cc", needAny: [], preferAny: ["control"] },
      { slot: "anti_assassin", needAny: [], preferAny: ["antiAssassin", "shield"] }
    ]
  },
  balanced: {
    pve: [
      { slot: "frontline_1", needAny: ["frontline"] },
      { slot: "frontline_2", needAny: ["frontline"] },
      { slot: "carry", needAny: ["assassin", "mage", "ranged"] },
      { slot: "support", needAny: ["support"] }
    ],
    pvp: [
      { slot: "frontline", needAny: ["frontline"] },
      { slot: "healer_or_shield", needAny: ["healer", "support", "shield"] },
      { slot: "cc", needAny: [], preferAny: ["control"] },
      { slot: "burst", needAny: ["assassin", "mage", "ranged"] }
    ]
  }
};

// ---------- faction planning ----------
function factionBonusValue(teamFactions) {
  // Your game bonuses:
  // 3 -> 15, 3+2 -> 25, 4 -> 30, 5 -> 35
  // Starglint wildcard
  const nonStar = teamFactions.filter((f) => f !== "Starglint");
  const counts = {};
  for (const f of nonStar) counts[f] = (counts[f] ?? 0) + 1;
  const star = teamFactions.filter((f) => f === "Starglint").length;

  // 3+2 check (non-star only)
  const vals = Object.values(counts).sort((a, b) => b - a);
  if (vals[0] === 3 && vals[1] === 2) return 25;

  // dominant suit with starglint helping
  const maxFaction = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const maxCount = (maxFaction ? counts[maxFaction] : 0) + star;

  if (maxCount >= 5) return 35;
  if (maxCount === 4) return 30;
  if (maxCount === 3) return 15;
  return 0;
}

function getFactionPlans(anchorFaction) {
  return [
    { name: "5_same", kind: "same", main: anchorFaction, needMain: 5, bonus: 35 },
    { name: "4_same", kind: "same", main: anchorFaction, needMain: 4, bonus: 30 },
    { name: "3_plus_2", kind: "split", main: anchorFaction, needMain: 3, needSecond: 2, bonus: 25 },
    { name: "3_same", kind: "same", main: anchorFaction, needMain: 3, bonus: 15 }
  ];
}

function bestSecondFaction(pool, anchorFaction) {
  const factions = ["Hearts", "Spades", "Clubs", "Diamonds"].filter((f) => f !== anchorFaction);
  let best = factions[0];
  let bestQuality = -Infinity;

  for (const f of factions) {
    const candidates = pool.filter((h) => h.faction === f);
    // quality proxy: top few candidates sum
    const quality = candidates
      .slice(0, 8)
      .reduce((a, h) => a + (h.__scores?.burst ?? 0) + (h.__scores?.survivability ?? 0) + (h.__scores?.control ?? 0), 0);
    if (quality > bestQuality) {
      bestQuality = quality;
      best = f;
    }
  }
  return best;
}

// ---------- selection ----------
function heroWeightedScore(h, weights) {
  const sc = h.__scores;
  return (
    sc.survivability * weights.survivability +
    sc.healing * weights.healing +
    sc.control * weights.control +
    sc.burst * weights.burst +
    sc.scaling * weights.scaling +
    sc.antiAssassin * weights.antiAssassin
  );
}

function matchesNeed(hero, needAny = []) {
  if (!needAny || needAny.length === 0) return true;
  const tags = hero.__tags ?? [];
  return needAny.some((t) => tags.includes(t));
}

function matchesPrefer(hero, preferAny = []) {
  if (!preferAny || preferAny.length === 0) return 0;
  const tags = hero.__tags ?? [];
  return preferAny.reduce((acc, t) => acc + (tags.includes(t) ? 1 : 0), 0);
}

function buildTeamWithPlan(enrichedHeroes, anchor, mode, cfg, plan) {
  const weights = cfg.modeWeights?.[mode] ?? cfg.modeWeights?.pve;
  const archetype = getArchetype(anchor);
  const slots = ARCHETYPES[archetype]?.[mode] ?? ARCHETYPES.balanced[mode];

  const poolAll = enrichedHeroes.filter((h) => h.id !== anchor.id);

  let secondFaction = null;
  if (plan.kind === "split") {
    secondFaction = bestSecondFaction(poolAll, anchor.faction);
  }

  // Build allowed pool according to plan (Starglint always allowed)
  const allowed = poolAll.filter((h) => {
    if (h.faction === "Starglint") return true;
    if (plan.kind === "same") return h.faction === plan.main;
    if (plan.kind === "split") return h.faction === plan.main || h.faction === secondFaction;
    return true;
  });

  // Sort by base weighted score
  const sorted = [...allowed].sort((a, b) => heroWeightedScore(b, weights) - heroWeightedScore(a, weights));

  const team = [anchor];
  const picked = new Set([anchor.id]);

  // Enforce faction counts progressively
  function countFaction(faction) {
    return team.filter((h) => h.faction === faction).length;
  }
  function countNonStarFaction(faction) {
    return team.filter((h) => h.faction === faction && h.faction !== "Starglint").length;
  }
  function countStar() {
    return team.filter((h) => h.faction === "Starglint").length;
  }

  function canPick(h) {
    if (picked.has(h.id)) return false;

    // Hard plan constraints:
    if (plan.kind === "same") {
      // allow main faction + Starglint; others should not happen (already filtered)
      return true;
    }
    if (plan.kind === "split") {
      // only main/second/starglint already filtered
      return true;
    }
    return true;
  }

  // slot picking: needAny first, then preferAny, then score
  function pickForSlot(slotDef) {
    const candidates = sorted.filter((h) => canPick(h) && matchesNeed(h, slotDef.needAny));
    if (candidates.length === 0) {
      // fallback: relax needs
      const relaxed = sorted.filter((h) => canPick(h));
      if (relaxed.length === 0) return null;
      return relaxed[0];
    }

    // Score with prefer as tie-breaker
    let best = null;
    let bestVal = -Infinity;

    for (const h of candidates.slice(0, 60)) {
      const base = heroWeightedScore(h, weights);
      const prefer = matchesPrefer(h, slotDef.preferAny) * 50; // prefer bump
      const val = base + prefer;

      if (val > bestVal) {
        bestVal = val;
        best = h;
      }
    }
    return best;
  }

  for (const slot of slots) {
    const pick = pickForSlot(slot);
    if (!pick) continue;
    picked.add(pick.id);
    team.push(pick);
    if (team.length >= 5) break;
  }

  // Fill to 5 with best remaining in allowed pool
  for (const h of sorted) {
    if (team.length >= 5) break;
    if (picked.has(h.id)) continue;
    picked.add(h.id);
    team.push(h);
  }

  // Ensure exactly 5
  const finalTeam = uniqById(team).slice(0, 5);
  return { team: finalTeam, secondFaction, archetype };
}

function evaluateTeam(team, anchor, mode, cfg, plan) {
  const weights = cfg.modeWeights?.[mode] ?? cfg.modeWeights?.pve;

  // base sum
  let score = 0;
  for (const h of team) {
    score += heroWeightedScore(h, weights);
  }

  // hard prioritize faction bonus
  const bonus = factionBonusValue(team.map((h) => h.faction));
  // scale it big so max-bonus wins
  score += bonus * 100;

  // small extra: anchor faction presence
  const anchorPresence = team.filter((h) => h.faction === anchor.faction || h.faction === "Starglint").length;
  score += anchorPresence * 10;

  return score;
}

function pickBestTeamForAnchor(enrichedHeroes, anchor, mode, cfg) {
  const plans = getFactionPlans(anchor.faction);

  let best = null;
  let bestScore = -Infinity;

  for (const plan of plans) {
    // build team
    const built = buildTeamWithPlan(enrichedHeroes, anchor, mode, cfg, plan);
    const team = built.team;

    // discard if team incomplete
    if (!team || team.length < 5) continue;

    // evaluate
    const score = evaluateTeam(team, anchor, mode, cfg, plan);

    // If this plan promised a bonus, but we didn't reach it, penalize
    const actualBonus = factionBonusValue(team.map((h) => h.faction));
    const promised = plan.bonus ?? 0;
    const planPenalty = actualBonus < promised ? (promised - actualBonus) * 150 : 0;

    const finalScore = score - planPenalty;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      best = team;
    }

    // Early exit: if we achieved max bonus (35) with reasonable team, keep it
    if (actualBonus === 35 && plan.name === "5_same") break;
  }
// ---- hard fallback: always return 5 heroes ----
if (!best || best.length < 5) {
  const weights = cfg.modeWeights?.[mode] ?? cfg.modeWeights?.pve;
  const pool = enrichedHeroes.filter(h => h.id !== anchor.id);
  const sorted = [...pool].sort((a, b) => heroWeightedScore(b, weights) - heroWeightedScore(a, weights));
  best = [anchor, ...sorted.slice(0, 4)];
}
  return best;
}

// ---------- formation ----------
function assignFormation(anchor, team, cfg) {
  const row2 = cfg.positions.row2;
  const row3 = cfg.positions.row3;

  // Defensive: ensure we have a team
  if (!team || team.length === 0) team = [anchor];

  const nonAnchor = team.filter((h) => h.id !== anchor.id);

  // robust: always pick 2 "frontliners" (prefer frontline-tag, else highest survivability)
  const candidates = [...nonAnchor].sort((a, b) => {
    const aFront = (a.__tags ?? []).includes("frontline") ? 1 : 0;
    const bFront = (b.__tags ?? []).includes("frontline") ? 1 : 0;
    if (aFront !== bFront) return bFront - aFront;
    return (b.__scores?.survivability ?? 0) - (a.__scores?.survivability ?? 0);
  });

  const frontline = candidates.slice(0, 2);

  // remaining heroes
  const rest = team.filter((h) => !frontline.some((f) => f.id === h.id));

  const anchorRow = cfg.positions.anchorDefaultRow; // "row3" typically
  const row3Heroes = [];
  const row2Heroes = [];

  // Place anchor in its preferred row
  if (anchorRow === "row3") row3Heroes.push(anchor);
  else row2Heroes.push(anchor);

  // Place two "frontliners" in the 2-slot row
  for (const f of frontline) row2Heroes.push(f);

  // Put remaining into the 3-slot row
  for (const h of rest) {
    if (h.id === anchor.id) continue;
    row3Heroes.push(h);
  }

  const ensureUnique = (arr) => {
    const seen = new Set();
    return arr.filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true)));
  };

  let r2 = ensureUnique(row2Heroes).slice(0, 2);
  let r3 = ensureUnique(row3Heroes).filter((h) => !r2.some((x) => x.id === h.id)).slice(0, 3);

  // Fill missing slots from remaining team members
  const remaining = ensureUnique(team).filter(
    (h) => !r2.some((x) => x.id === h.id) && !r3.some((x) => x.id === h.id)
  );

  while (r2.length < 2 && remaining.length) r2.push(remaining.shift());
  while (r3.length < 3 && remaining.length) r3.push(remaining.shift());

  // Force anchor if missing
  const hasAnchor = (arr) => arr.some((h) => h.id === anchor.id);
  if (!hasAnchor(r2) && !hasAnchor(r3)) {
    if (anchorRow === "row3") r3[0] = anchor;
    else r2[0] = anchor;
  }

  // Build formation with fixed slots (no holes)
  const formation = [];
  for (let i = 0; i < 2; i++) formation.push({ heroId: r2[i].id, position: row2[i] });
  for (let i = 0; i < 3; i++) formation.push({ heroId: r3[i].id, position: row3[i] });

  return formation;
}


// ---------- main ----------
const cfg = fs.existsSync(CONFIG_FILE)
  ? readJson(CONFIG_FILE)
  : (() => {
      throw new Error(`Missing config file: ${CONFIG_FILE}`);
    })();

const heroes = getAllHeroes();

const enrichedHeroes = heroes.map((h) => {
  const tags = tagHero(h, cfg);
  const scores = scoreHero(h, tags);
  return { ...h, __tags: tags, __scores: scores };
});

const output = {};

for (const anchor of enrichedHeroes) {
  const pveTeam = pickBestTeamForAnchor(enrichedHeroes, anchor, "pve", cfg);
  const pvpTeam = pickBestTeamForAnchor(enrichedHeroes, anchor, "pvp", cfg);

  output[anchor.id] = {
    pve: { title: "PVE Example", description: "", formation: assignFormation(anchor, pveTeam, cfg) },
    pvp: { title: "PVP Example", description: "", formation: assignFormation(anchor, pvpTeam, cfg) }
  };
}

writeJson(OUT_FILE, output);
console.log(`✅ Generated: ${path.relative(ROOT, OUT_FILE)}`);

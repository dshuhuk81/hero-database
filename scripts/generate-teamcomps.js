import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HERO_DIR = path.join(ROOT, "src", "data", "heroes");
const OUT_DIR = path.join(ROOT, "src", "data", "derived");
const OUT_FILE = path.join(OUT_DIR, "teamCompsByHeroId.json");
const CONFIG_FILE = path.join(OUT_DIR, "builder.config.json");

// Positions in UI are mislabeled:
// row2 positions: back-left/back-right = actual frontline left/right
// row3 positions: front-left/front-center/front-right = actual backline
const POSITION_OVERRIDES = {
  heracles: {
    prefer: "back-right" // actual FRONT-RIGHT (safer lane)
  }
};

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

  const tempo =
    (tags.includes("energy_push") ? 320 : 0) +
    (tags.includes("energy_regen") ? 200 : 0) +
    (tags.includes("cdr") ? 140 : 0) +
    (tags.includes("haste") ? 160 : 0) +
    (tags.includes("buff_atk") ? 90 : 0) +
    (tags.includes("buff_team") ? 70 : 0) +
    (tags.includes("energy_start") ? 60 : 0);

  const survivability =
    hp * 1.2 +
    armor * 1.0 +
    mres * 1.0 +
    dodge * 10 +
    (tags.includes("shield") ? 80 : 0) +
    (tags.includes("taunt") ? 60 : 0) +
    (tags.includes("reflect") ? 60 : 0) +
    (tags.includes("energy_start") ? 40 : 0);

  const healing =
    (tags.includes("healer") ? atk * 2.2 : 0) +
    (tags.includes("cleanse") ? 80 : 0) +
    (tags.includes("shield") ? 50 : 0) +
    (tags.includes("lifesteal_aura") ? 90 : 0);

  const control =
    (tags.includes("control") ? 200 : 0) +
    (tags.includes("taunt") ? 120 : 0) +
    // Tempo-Supports: CDR ist quasi "mehr casts" => wirkt wie Utility/Control
    (tags.includes("cdr") ? 90 : 0);

  const burst =
    atk * (tags.includes("assassin") ? 1.6 : 1.0) +
    (tags.includes("mage") ? 20 : 0) +
    (tags.includes("diver") ? 15 : 0) +
    // haste/buff wirkt indirekt auf damage output, kleiner Bonus reicht
    (tags.includes("haste") ? 70 : 0) +
    (tags.includes("buff_atk") ? 60 : 0);

  const scaling =
    (tags.includes("energy") ? 120 : 0) +
    (tags.includes("energy_start") ? 140 : 0) +
    (tags.includes("mage") ? 40 : 0) +
    // Das ist der eigentliche Fix: Team-Energy Push muss stark zählen
    (tags.includes("energy_push") ? 320 : 0) +
    (tags.includes("energy_regen") ? 180 : 0) +
    // Teamweite Buffs sind selten, aber sehr wertvoll
    (tags.includes("buff_team") ? 90 : 0);

  const antiAssassin =
    (tags.includes("antiAssassin") ? 180 : 0) +
    (tags.includes("tank") ? 40 : 0) +
    (tags.includes("shield") ? 40 : 0);

  return { survivability, healing, control, burst, scaling, antiAssassin, tempo };
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
    const quality = candidates
      .slice(0, 8)
      .reduce(
        (a, h) =>
          a +
          (h.__scores?.burst ?? 0) +
          (h.__scores?.survivability ?? 0) +
          (h.__scores?.control ?? 0),
        0
      );
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
    sc.antiAssassin * weights.antiAssassin +
    sc.tempo * (weights.tempo ?? 0)
  );
}

function matchesNeed(hero, needAny = []) {
  if (!needAny || needAny.length === 0) return true;
  const tags = hero.__tags ?? [];
  return needAny.some((t) => tags.includes(t));
}

function matchesPrefer(hero, preferAny = []) {
  if (!preferAny || preferAny.length === 0) return 0;
  const tags = new Set(hero.__tags ?? []);
  const sc = hero.__scores ?? {};
  return preferAny.reduce((acc, k) => {
    if (tags.has(k)) return acc + 1;
    if (typeof sc[k] === "number") return acc + Math.min(2, sc[k] / 300); // small normalized bump
    return acc;
  }, 0);
}

function rand01() {
  return Math.random();
}

// weighted random pick: pick from topK but not always the top1
function pickWithNoise(candidates, scoreFn, noise = 0.06) {
  let best = null;
  let bestVal = -Infinity;

  for (const c of candidates) {
    const base = scoreFn(c);
    const jitter = 1 + (rand01() * 2 - 1) * noise; // ±noise
    const val = base * jitter;
    if (val > bestVal) {
      bestVal = val;
      best = c;
    }
  }
  return best;
}

function topKBy(arr, scoreFn, k) {
  return [...arr].sort((a, b) => scoreFn(b) - scoreFn(a)).slice(0, k);
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

  // base ranking (deterministic baseline)
  const sorted = [...allowed].sort((a, b) => heroWeightedScore(b, weights) - heroWeightedScore(a, weights));

  // --- randomized search parameters ---
  const tries = cfg.randomSearch?.tries ?? 60; // how many team variants per plan
  const topK = cfg.randomSearch?.topK ?? 14; // candidate pool per slot
  const noise = cfg.randomSearch?.noise ?? 0.08; // 0.05–0.12 is good
  const fillTopK = cfg.randomSearch?.fillTopK ?? 20;

  function canPick(h, picked) {
    return !picked.has(h.id);
  }

  function slotCandidateList(slotDef, picked) {
    // filter by needs
    const needFiltered = sorted.filter((h) => canPick(h, picked) && matchesNeed(h, slotDef.needAny));
    const baseList = needFiltered.length ? needFiltered : sorted.filter((h) => canPick(h, picked));
    const scarcity = needFiltered.length ? topK / Math.max(1, needFiltered.length) : 0;

    const scoreFn = (h) =>
      heroWeightedScore(h, weights) +
      matchesPrefer(h, slotDef.preferAny) * 80 +
      scarcity * 60;

    return topKBy(baseList, scoreFn, topK);
  }

  // build ONE team with randomness
  function buildOne() {
    const team = [anchor];
    const picked = new Set([anchor.id]);

    for (const slot of slots) {
      const candidates = slotCandidateList(slot, picked);
      if (!candidates.length) continue;

      const scoreFn = (h) => heroWeightedScore(h, weights) + matchesPrefer(h, slot.preferAny) * 80;
      const pick = pickWithNoise(candidates, scoreFn, noise);
      if (!pick) continue;

      picked.add(pick.id);
      team.push(pick);
      if (team.length >= 5) break;
    }

    // fill to 5 from top remaining (with a little randomness too)
    const remaining = sorted.filter((h) => !picked.has(h.id));
    const fillPool = remaining.slice(0, fillTopK);

    while (team.length < 5 && fillPool.length) {
      const pick = pickWithNoise(fillPool, (h) => heroWeightedScore(h, weights), noise * 0.6);
      if (!pick) break;
      picked.add(pick.id);
      team.push(pick);

      // remove chosen from fillPool
      const idx = fillPool.findIndex((x) => x.id === pick.id);
      if (idx >= 0) fillPool.splice(idx, 1);
    }

    return uniqById(team).slice(0, 5);
  }

  // Evaluate many variants & keep best
  let bestTeam = null;
  let bestScore = -Infinity;

  // a few deterministic tries first (noise=0) so results stay sane
  for (let i = 0; i < 6; i++) {
    const t = buildOne();
    if (t.length < 5) continue;
    const s = evaluateTeam(t, anchor, mode, cfg);
    if (s > bestScore) {
      bestScore = s;
      bestTeam = t;
    }
  }

  for (let i = 0; i < tries; i++) {
    const t = buildOne();
    if (t.length < 5) continue;
    const s = evaluateTeam(t, anchor, mode, cfg);
    if (s > bestScore) {
      bestScore = s;
      bestTeam = t;
    }
  }

  // fallback
  if (!bestTeam || bestTeam.length < 5) {
    bestTeam = [anchor, ...sorted.slice(0, 4)];
  }

  return { team: bestTeam, secondFaction, archetype };
}

// ---------- synergy bonus ----------
function teamSynergyBonus(team, mode) {
  const tagsOf = (h) => new Set(h.__tags ?? []);
  const countTag = (tag) => team.reduce((acc, h) => acc + (tagsOf(h).has(tag) ? 1 : 0), 0);
  const hasTag = (tag) => team.some((h) => tagsOf(h).has(tag));

  const tempoTotal = team.reduce((a, h) => a + (h.__scores?.tempo ?? 0), 0);

  const carryCount = team.filter((h) => {
    const t = new Set(h.__tags ?? []);
    return t.has("assassin") || t.has("mage") || t.has("ranged") || t.has("burst");
  }).length;

  const controlCount = countTag("control") + countTag("taunt");
  const sustainCount = countTag("healer") + countTag("shield") + countTag("lifesteal_aura");

  const frontlineCount = team.reduce(
    (acc, h) => acc + ((tagsOf(h).has("frontline") || tagsOf(h).has("tank")) ? 1 : 0),
    0
  );

  const hasPressureTank = team.some((h) => {
    const t = tagsOf(h);
    return t.has("tank") || t.has("taunt") || t.has("reflect") || (t.has("shield") && t.has("frontline"));
  });

  const hasDiver = team.some((h) => {
    const t = tagsOf(h);
    return t.has("diver") || t.has("dash") || t.has("jump");
  });

  let bonus = 0;

  // --- TEMPO: engine -> carry conversion ---
  if (tempoTotal > 0) {
    const conversion = carryCount >= 2 ? 1.0 : carryCount === 1 ? 0.65 : 0.25;
    bonus += Math.min(220, (tempoTotal / 6) * conversion);

    // PvP cares more about first-ult cycles / tempo spikes
    if (mode === "pvp") {
      bonus += Math.min(120, (tempoTotal / 10) * conversion);
    }
  }

  // Sustain layer
  if (sustainCount >= 1) bonus += 180;
  if (sustainCount >= 2) bonus += 80;

  // CC-chain / setup tools
  if (controlCount >= 1) bonus += 120;
  if (controlCount >= 2) bonus += 120;

  // Melee cluster proxy
  if (frontlineCount >= 2) bonus += 90;
  if (frontlineCount >= 3) bonus += 70;

  // Pressure tank creates space for diver
  if (hasPressureTank && hasDiver) bonus += 160;

  // PvP-specific utilities
  if (mode === "pvp") {
    if (hasTag("antiAssassin")) bonus += 120;
    if (hasTag("energy_start")) bonus += 60;
  }

  return Math.min(bonus, 650);
}

function evaluateTeam(team, anchor, mode, cfg) {
  const weights = cfg.modeWeights?.[mode] ?? cfg.modeWeights?.pve;
  const factionW = weights.faction ?? 1.0;

  let score = 0;
  for (const h of team) score += heroWeightedScore(h, weights);

  // faction bonus (weighted by config)
  const bonus = factionBonusValue(team.map((h) => h.faction));
  score += bonus * 100 * factionW;

  // small extra: anchor faction presence
  const anchorPresence = team.filter((h) => h.faction === anchor.faction || h.faction === "Starglint").length;
  score += anchorPresence * 10;

  // global synergy bonus
  score += teamSynergyBonus(team, mode);

  return score;
}

function pickBestTeamForAnchor(enrichedHeroes, anchor, mode, cfg) {
  const plans = getFactionPlans(anchor.faction);

  let best = null;
  let bestScore = -Infinity;

  for (const plan of plans) {
    const built = buildTeamWithPlan(enrichedHeroes, anchor, mode, cfg, plan);
    const team = built.team;

    if (!team || team.length < 5) continue;

    const score = evaluateTeam(team, anchor, mode, cfg);

    const actualBonus = factionBonusValue(team.map((h) => h.faction));
    const promised = plan.bonus ?? 0;
    const planPenalty = actualBonus < promised ? (promised - actualBonus) * 150 : 0;

    const finalScore = score - planPenalty;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      best = team;
    }

    if (actualBonus === 35 && plan.name === "5_same") break;
  }

  // hard fallback: always return 5 heroes
  if (!best || best.length < 5) {
    const weights = cfg.modeWeights?.[mode] ?? cfg.modeWeights?.pve;
    const pool = enrichedHeroes.filter((h) => h.id !== anchor.id);
    const sorted = [...pool].sort((a, b) => heroWeightedScore(b, weights) - heroWeightedScore(a, weights));
    best = [anchor, ...sorted.slice(0, 4)];
  }

  return best;
}

// ---------- formation ----------
function assignFormation(anchor, team, cfg) {
  const row2 = cfg.positions.row2; // ["back-left","back-right"] = actual frontline
  const row3 = cfg.positions.row3; // ["front-left","front-center","front-right"] = actual backline

  if (!team || team.length === 0) team = [anchor];

  const ensureUnique = (arr) => {
    const seen = new Set();
    return arr.filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true)));
  };

  const uniqueTeam = ensureUnique(team).slice(0, 5);
  const tagsOf = (h) => new Set(h.__tags ?? []);
  const scOf = (h) => h.__scores ?? {};

  const override = POSITION_OVERRIDES[anchor.id]?.prefer ?? null;

  function scoreHighPressureFront(h) {
    const t = tagsOf(h);
    const s = scOf(h);
    return (
      (t.has("tank") ? 5000 : 0) +
      (t.has("taunt") ? 1200 : 0) +
      (t.has("reflect") ? 900 : 0) +
      (t.has("shield") ? 700 : 0) +
      (t.has("control") ? 500 : 0) +
      (t.has("energy_start") ? 350 : 0) +
      (s.survivability ?? 0)
    );
  }

  function scoreLowPressureFront(h) {
    const t = tagsOf(h);
    const s = scOf(h);
    return (
      (t.has("diver") || t.has("dash") || t.has("jump") ? 1200 : 0) +
      (t.has("lifesteal_aura") ? 500 : 0) +
      (t.has("shield") ? 350 : 0) +
      (t.has("assassin") ? 250 : 0) +
      (s.survivability ?? 0) * 0.7 +
      (s.burst ?? 0) * 0.35
    );
  }

  const candidates = [...uniqueTeam];

  let frontLeft = null;
  let frontRight = null;

  // deterministic override for anchor (Heracles)
  if (override === row2[0]) frontLeft = anchor;
  if (override === row2[1]) frontRight = anchor;

  const remaining = candidates.filter((h) => h.id !== frontLeft?.id && h.id !== frontRight?.id);

  if (!frontLeft) {
    frontLeft = [...remaining].sort((a, b) => scoreHighPressureFront(b) - scoreHighPressureFront(a))[0] ?? anchor;
  }

  const rem2 = remaining.filter((h) => h.id !== frontLeft.id);

  if (!frontRight) {
    frontRight =
      [...rem2].sort((a, b) => scoreLowPressureFront(b) - scoreLowPressureFront(a))[0] ?? rem2[0] ?? anchor;
  }

  let r2 = ensureUnique([frontLeft, frontRight]).slice(0, 2);
  let r3 = ensureUnique(uniqueTeam)
    .filter((h) => !r2.some((x) => x.id === h.id))
    .slice(0, 3);

  // ensure 2+3
  const used = new Set([...r2, ...r3].map((h) => h.id));
  const extras = ensureUnique(uniqueTeam).filter((h) => !used.has(h.id));
  while (r2.length < 2 && extras.length) r2.push(extras.shift());
  while (r3.length < 3 && extras.length) r3.push(extras.shift());

  // force anchor if missing
  const hasAnchor = (arr) => arr.some((h) => h.id === anchor.id);
  if (!hasAnchor(r2) && !hasAnchor(r3)) r3[0] = anchor;

  return [
    { heroId: r2[0].id, position: row2[0] }, // back-left = frontline left (high pressure)
    { heroId: r2[1].id, position: row2[1] }, // back-right = frontline right (safer)
    { heroId: r3[0].id, position: row3[0] },
    { heroId: r3[1].id, position: row3[1] },
    { heroId: r3[2].id, position: row3[2] }
  ];
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
    pve: { title: "PvE example ", description: "", formation: assignFormation(anchor, pveTeam, cfg) },
    pvp: { title: "PvP example", description: "", formation: assignFormation(anchor, pvpTeam, cfg) }
  };
}

writeJson(OUT_FILE, output);
console.log(`✅ Generated: ${path.relative(ROOT, OUT_FILE)}`);

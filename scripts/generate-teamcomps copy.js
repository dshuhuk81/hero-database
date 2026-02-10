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
function sum(...nums) {
  return nums.reduce((a, b) => a + b, 0);
}

function getAllHeroes() {
  const files = fs.readdirSync(HERO_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => {
    const hero = readJson(path.join(HERO_DIR, f));
    return hero;
  });
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

  return [...tags];
}

function scoreHero(hero, tags) {
  const s = hero.stats ?? {};
  // normalize-ish (these numbers are huge; we use ratios/log-ish via sqrt)
  const hp = Math.sqrt(Math.max(0, s.hp ?? 0));
  const atk = Math.sqrt(Math.max(0, s.atk ?? 0));
  const armor = Math.sqrt(Math.max(0, s.armor ?? 0));
  const mres = Math.sqrt(Math.max(0, s.magicRes ?? 0));
  const dodge = (s.dodgeRate ?? 0);

  const survivability = hp * 1.2 + armor * 1.0 + mres * 1.0 + dodge * 10 + (tags.includes("shield") ? 80 : 0);
  const healing = (tags.includes("healer") ? atk * 2.2 : 0) + (tags.includes("cleanse") ? 80 : 0) + (tags.includes("shield") ? 50 : 0);
  const control = (tags.includes("control") ? 200 : 0) + (tags.includes("taunt") ? 120 : 0);
  const burst = atk * (tags.includes("assassin") ? 1.6 : 1.0) + (tags.includes("mage") ? 20 : 0);
  const scaling = (tags.includes("energy") ? 120 : 0) + (tags.includes("mage") ? 40 : 0);
  const antiAssassin = (tags.includes("antiAssassin") ? 180 : 0) + (tags.includes("tank") ? 40 : 0) + (tags.includes("shield") ? 40 : 0);

  return { survivability, healing, control, burst, scaling, antiAssassin };
}

function factionScore(team, anchorFaction) {
  // Starglint is wildcard: we ignore it when counting a dominant suit, but it “fits” the best count.
  const factions = team.map((h) => h.faction);
  const nonStar = factions.filter((f) => f !== "Starglint");
  const counts = {};
  for (const f of nonStar) counts[f] = (counts[f] ?? 0) + 1;

  // assume Starglint supports the max-count faction
  const starCount = factions.filter((f) => f === "Starglint").length;
  const maxFaction = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const maxCount = (maxFaction ? counts[maxFaction] : 0) + starCount;

  // simple mapping to score
  if (maxCount >= 5) return 35;
  if (maxCount === 4) return 30;
  if (maxCount === 3) return 15;

  // handle 3+2 (needs exact split)
  const values = Object.values(counts).sort((a, b) => b - a);
  if (values[0] === 3 && values[1] === 2) return 25;

  // small bonus if anchor faction present
  const anchorPresence = factions.filter((f) => f === anchorFaction).length;
  return 5 + anchorPresence * 2;
}

function pickBestTeamForAnchor(heroes, anchor, mode, cfg) {
  const weights = cfg.modeWeights?.[mode] ?? cfg.modeWeights?.pve;

  // precompute tags/scores
  const enriched = heroes.map((h) => {
    const tags = tagHero(h, cfg);
    const scores = scoreHero(h, tags);
    return { ...h, __tags: tags, __scores: scores };
  });

  const anchorE = enriched.find((h) => h.id === anchor.id);
  const pool = enriched.filter((h) => h.id !== anchor.id);

  // Candidate selection strategy:
  // 1) ensure 2 frontline
  // 2) ensure at least 1 damage dealer
  // 3) ensure utility (cc/antiAssassin/second support) depending on mode

  function heroTotalScore(h) {
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

  const sorted = [...pool].sort((a, b) => heroTotalScore(b) - heroTotalScore(a));

  // frontline picks
  const frontline = sorted.filter((h) => h.__tags.includes("frontline"));
  const backline = sorted.filter((h) => !h.__tags.includes("frontline"));

  const pick = new Set([anchorE.id]);
  const team = [anchorE];

  function addBest(list, predicate) {
    const c = list.find((h) => !pick.has(h.id) && predicate(h));
    if (c) {
      pick.add(c.id);
      team.push(c);
      return true;
    }
    return false;
  }

  // 2 frontline
  addBest(frontline, () => true);
  addBest(frontline, () => true);

  // DPS (prefer mage/assassin/archer style)
  addBest(sorted, (h) => h.__tags.includes("assassin") || h.__tags.includes("mage") || h.__tags.includes("ranged"));

  // Utility slot: PvP prefers antiAssassin/control; PvE prefers scaling/aoe (approx via mage/energy)
  if (mode === "pvp") {
    addBest(sorted, (h) => h.__tags.includes("antiAssassin") || h.__tags.includes("control") || h.__tags.includes("shield"));
  } else {
    addBest(sorted, (h) => h.__tags.includes("energy") || h.__tags.includes("mage") || h.__tags.includes("control"));
  }

  // If still not 5, fill best remaining
  while (team.length < 5) addBest(sorted, () => true);

  // Improve faction bonus by swapping last slot(s) if easy win
  // (simple local search: try replace 5th member with higher factionScore)
  const currentFactionScore = factionScore(team, anchorE.faction);
  const last = team[4];
  let bestTeam = team;
  let bestScore = currentFactionScore;

  for (const cand of sorted.slice(0, 40)) {
    if (pick.has(cand.id)) continue;
    const alt = [...team];
    alt[4] = cand;
    const fsScore = factionScore(alt, anchorE.faction);
    if (fsScore > bestScore) {
      bestScore = fsScore;
      bestTeam = alt;
    }
  }

  return bestTeam;
}

function assignFormation(anchor, team, cfg) {
  const row2 = cfg.positions.row2;
  const row3 = cfg.positions.row3;

  // Determine frontline: by tag frontline; ensure exactly 2
  const nonAnchor = team.filter((h) => h.id !== anchor.id);

  const frontline = nonAnchor
    .filter((h) => (h.__tags ?? []).includes("frontline"))
    .sort((a, b) => (b.__scores?.survivability ?? 0) - (a.__scores?.survivability ?? 0))
    .slice(0, 2);

  // rest to backline (3)
  const rest = team.filter((h) => !frontline.some((f) => f.id === h.id));
  // anchor default row
  const anchorRow = cfg.positions.anchorDefaultRow; // "row3" typically
  const row3Heroes = [];
  const row2Heroes = [];

  if (anchorRow === "row3") {
    row3Heroes.push(anchor);
  } else {
    row2Heroes.push(anchor);
  }

  // place frontline on row2 (2 slots) by default, because your component renders row2 as 2 slots
  // If you prefer the opposite, just swap row2/row3 in config or change this mapping.
  for (const f of frontline) row2Heroes.push(f);

  // fill remaining into row3
  for (const h of rest) {
    if (h.id === anchor.id) continue;
    row3Heroes.push(h);
  }

  // ensure counts: row2=2, row3=3
  // If anchor ended up causing overflow, adjust
  const all = [anchor, ...nonAnchor];
  const ensureUnique = (arr) => {
    const seen = new Set();
    return arr.filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true)));
  };
  let r2 = ensureUnique(row2Heroes).slice(0, 2);
  let r3 = ensureUnique(row3Heroes).filter((h) => !r2.some((x) => x.id === h.id)).slice(0, 3);

  // If anchor not placed yet, force it into preferred row
  const hasAnchor = (arr) => arr.some((h) => h.id === anchor.id);
  if (!hasAnchor(r2) && !hasAnchor(r3)) {
    r3[0] = anchor;
  }

  // Build formation list with positions
  const formation = [];
  for (let i = 0; i < r2.length; i++) {
    formation.push({ heroId: r2[i].id, position: row2[i] });
  }
  for (let i = 0; i < r3.length; i++) {
    formation.push({ heroId: r3[i].id, position: row3[i] });
  }
  return formation;
}

// ---------- main ----------
const cfg = fs.existsSync(CONFIG_FILE)
  ? readJson(CONFIG_FILE)
  : (() => {
      throw new Error(`Missing config file: ${CONFIG_FILE}`);
    })();

const heroes = getAllHeroes();

// enrich once so assignFormation has tags/scores
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
    pve: {
      title: "Best PVE Setup",
      description: "",
      formation: assignFormation(anchor, pveTeam, cfg)
    },
    pvp: {
      title: "Best PVP Setup",
      description: "",
      formation: assignFormation(anchor, pvpTeam, cfg)
    }
  };
}

writeJson(OUT_FILE, output);
console.log(`✅ Generated: ${path.relative(ROOT, OUT_FILE)}`);

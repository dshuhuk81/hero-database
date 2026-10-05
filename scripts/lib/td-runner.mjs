// Shared balance runner: plays a full run with a simple policy (deploy affordable
// heroes, spend spare gold on the cheapest upgrade).
// Used by test-td-balance.mjs and td-balance-sweep.mjs.
import { TowerDefenseGame } from "../../src/game/td/sim.js";
import { buildRunTuning, TREE } from "../../src/game/td/favor.js";
import heroes from "../../src/data/gameBalance.json" with { type: "json" };
import baseTuning from "../../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../../src/data/tdMaps.json" with { type: "json" };
import { rankedTiles } from "../../src/game/td/grid.js";
import { patternFor } from "../../src/game/td/board.js";
import campaign from "../../src/data/tdCampaign.json" with { type: "json" };
import { timelineForMap } from "../../src/game/td/stage-for-map.js";

export { maps };
// Free Play battlefields (campaign-only maps excluded), and a new player's Free Play deck:
// since Phase 2 only owned heroes can be recruited, and a new save owns the campaign starters.
export const freePlayMaps = maps.filter((map) => !map.campaignOnly);
export const STARTERS = campaign.starters;

const STALL_SECONDS = 120; // this long without a kill or leak counts as a standoff (lost run)

// Every blessing at max level ("trunk": only the Favor trunk). Of each pick-one pair
// the first node is taken.
export function maxBlessings(scope = "all") {
  const levels = {};
  const taken = new Set();
  for (const node of TREE.nodes) {
    if (scope === "trunk" && node.tree !== "trunk") continue;
    const group = node.exclusive ? `${node.tree}:${node.exclusive}` : null;
    if (group && taken.has(group)) continue;
    if (group) taken.add(group);
    levels[node.id] = node.maxLevel;
  }
  return levels;
}

// Priority lists: bots deploy in this order while gold and free rings last. The first
// five are the original squad; the rest fill the remaining rings (no team cap since M5).
export const SQUADS = {
  "balanced (S-tier core)": ["atlas", "aegir", "odin", "skadi", "plutus", "helios", "hephaestus", "harmonia", "heimdall", "boreas", "nott", "ymir"],
  "budget (D-tier)": ["gaia", "vidar", "boreas", "atalanta", "asclepius", "stheno", "fenrir", "surtr", "thanatos", "ymir", "skadi"],
  "road wall": ["ymir", "helios", "heimdall", "fenrir", "harmonia", "atlas", "gaia", "asclepius", "plutus", "surtr"],
  "all platform (no blockers)": ["odin", "hephaestus", "skadi", "atalanta", "plutus", "boreas", "stheno", "harmonia", "asclepius"],
  "glass cannon": ["nott", "hecate", "hephaestus", "odin", "harmonia", "aegir", "thanatos", "boreas", "skadi", "vidar", "stheno"],
};

// `tuning` overrides the base tuning (balance experiments).
// `game` adds constructor options (campaign stages: timeline, allowedHeroes, lives, hpScale); without a timeline the
// map plays its own (stage-for-map.js). `maxSeconds` is a runaway guard.
// `policy` remains in the result label for historical balance comparisons; heroes spend placement only on deployment,
// and automated relocation is deferred to the balance pass.
export const POLICIES = ["cheapest", "carry"];
export function playRun(ids, seed, map, { policy = "cheapest", difficulty, favLevels = null, tuning: tuningOverride, tier = "normal", maxSeconds = 1800, game: gameOptions = {} } = {}) {
  const source = tuningOverride ?? baseTuning;
  const runTuning = favLevels ? buildRunTuning(source, favLevels) : source;
  const tuning = difficulty ? { ...runTuning, difficulty } : runTuning;
  const g = new TowerDefenseGame({ heroes, tuning, map, timeline: gameOptions.timeline ?? timelineForMap(map, campaign), tier, seed, ...gameOptions });
  if (!g.setTeam(ids)) throw new Error(`Invalid squad: ${ids}`);
  let spent = 0;
  let stalled = false;
  // Deploy every affordable, not-yet-deployed squad member that has a free ring; Supports take the free ring whose
  // aura covers the most allies no other Support covers yet (auras don't stack).
  const deployAll = () => {
    for (const id of ids) {
      if (g.heroes.some((h) => h.id === id)) continue;
      const base = g.heroesById.get(id);
      if (g.placement < g.deployCost(id)) continue;
      const rings = rankedTiles(map, base.slot, g.rangeFor(base), patternFor(g.boardRules, base.class, base.id));
      if (base.class === "Support") {
        const covered = (i) => g.heroes.filter((h) => !g.supportAuraFor(h) && Math.hypot(h.x - map.platformSlots[i][0], h.y - map.platformSlots[i][1]) <= base.range).length;
        const rank = new Map(rings.map((i, n) => [i, n]));
        rings.sort((a, b) => covered(b) - covered(a) || rank.get(a) - rank.get(b));
      }
      for (const i of rings) {
        const before = g.placement;
        if (g.place(id, base.slot, i)) { spent += before - g.placement; break; }
      }
    }
  };
  deployAll();
  if (!g.start()) throw new Error("The stage could not start");
  // Standoff guard: blockers and heals can outlast enemies nobody can kill. A stage with no kill and no leak
  // for STALL_SECONDS is a standoff; a player would recruit damage mid-stage, the bot counts it as a lost run.
  let quietSteps = 0;
  let progress = -1;
  let step = 0;
  while (g.running && !g.complete && g.time < maxSeconds) {
    g.step(1 / 60);
    step += 1;
    if (step % 60 === 0) { // once a second: spend regrown placement
      deployAll();
    }
    const now = g.totalLeaks + Object.values(g.heroKills).reduce((sum, h) => sum + h.kills, 0);
    quietSteps = now === progress ? quietSteps + 1 : 0;
    progress = now;
    if (quietSteps >= 60 * STALL_SECONDS) { stalled = true; break; }
  }
  const won = g.won && !stalled;
  return { won, stalled, complete: g.complete || stalled, defeated: g.enemiesDown, lives: stalled ? 0 : g.lives, leaks: g.totalLeaks, score: g.score, spent, seconds: Math.round(g.time), perfect: won && g.perfect, insightLog: g.insightLog, mutators: [...(g.mutators ?? [])], boons: [...(g.boons ?? [])] };
}

// Shared balance runner: plays a full run with a simple policy (deploy affordable
// heroes, spend spare gold on the cheapest upgrade, take the first virtue offered).
// Used by test-td-balance.mjs and td-balance-sweep.mjs.
import { TowerDefenseGame } from "../../src/game/td/sim.js";
import { buildRunTuning, TREE } from "../../src/game/td/favor.js";
import heroes from "../../src/data/gameBalance.json" with { type: "json" };
import baseTuning from "../../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../../src/data/tdMaps.json" with { type: "json" };
import waves from "../../src/data/tdWaves.json" with { type: "json" };
import { rankedTiles } from "../../src/game/td/grid.js";
import campaign from "../../src/data/tdCampaign.json" with { type: "json" };

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

// `tuning` overrides the base tuning (balance experiments). `focus` is the level focus
// bots pick ("attack", "health", "range"); default: health on the road, attack on platforms.
// `paths` maps class -> path id for the level-4 path (M12); default: each class's first path.
// `mode` is the run mode (waves.js); endless runs stop at `maxWave` as a runaway guard.
// `game` adds constructor options (campaign stages: waves, allowedHeroes, lives, hpScale).
// `policy` is the upgrade policy: "cheapest" (default) buys the cheapest upgrade and the first
// level-4 path; "carry" pours gold into the strongest hero (highest attack first) and takes the
// last path, so balance results are not an artefact of one play style (audit step 3).
export const POLICIES = ["cheapest", "carry"];
export function playRun(ids, seed, map, { policy = "cheapest", difficulty, favLevels = null, tuning: tuningOverride, focus, paths = null, mutators = null, blessings = null, mode = "classic", tier = "normal", maxWave = 150, game: gameOptions = {} } = {}) {
  const source = tuningOverride ?? baseTuning;
  const runTuning = favLevels ? buildRunTuning(source, favLevels) : source;
  const tuning = difficulty ? { ...runTuning, difficulty } : runTuning;
  const g = new TowerDefenseGame({ heroes, tuning, map, waves, mode, tier, seed, ...gameOptions });
  if (!g.setTeam(ids)) throw new Error(`Invalid squad: ${ids}`);
  let spent = 0;
  let stalled = false;
  let perfectWaves = 0;
  while (!g.complete && g.wave < maxWave) {
    if (!g.running) {
      // deploy every affordable, not-yet-deployed squad member that has a free ring;
      // Supports take the free ring whose aura covers the most allies no other Support
      // covers yet (auras don't stack)
      for (const id of ids) {
        if (g.heroes.some((h) => h.id === id)) continue;
        const base = g.heroesById.get(id);
        if (g.gold < g.deployCost(id)) continue;
        const rings = rankedTiles(map, base.slot, g.rangeFor(base));
        if (base.class === "Support") {
          const covered = (i) => g.heroes.filter((h) => !g.supportAuraFor(h) && Math.hypot(h.x - map.platformSlots[i][0], h.y - map.platformSlots[i][1]) <= base.range).length;
          const rank = new Map(rings.map((i, n) => [i, n]));
          rings.sort((a, b) => covered(b) - covered(a) || rank.get(a) - rank.get(b));
        }
        for (const i of rings) {
          const before = g.gold;
          if (g.place(id, base.slot, i)) { spent += before - g.gold; break; }
        }
      }
      // spend spare gold on the cheapest available upgrade
      for (let guard = 0; guard < 20; guard += 1) {
        const options = g.heroes.map((h) => g.upgradeInfo(h.entityId)).filter((i) => i.ok);
        if (!options.length) break;
        if (policy === "carry") options.sort((a, b) => b.hero.atk - a.hero.atk || a.cost - b.cost);
        else options.sort((a, b) => a.cost - b.cost);
        const before = g.gold;
        const pick = options[0].hero;
        const info = options[0];
        const pathChoice = paths?.[pick.class] ?? (policy === "carry" ? info.pathOptions?.at(-1) : info.pathOptions?.[0]);
        g.upgrade(pick.entityId, info.needsPath ? pathChoice : focus ?? (pick.slotType === "road" ? "health" : "attack"));
        spent += before - g.gold;
      }
      // `blessings`: preference list of offer entries ("boon:<id>" or virtue names), else the first card.
      if (g.virtueOffer) g.chooseVirtue((blessings ?? []).find((name) => g.virtueOffer.includes(name)) ?? g.virtueOffer[0]);
      // Endless mutators (M15): take the first offered one from `mutators` (a preference list), else skip.
      if (g.mutatorOffer) { const pick = (mutators ?? []).find((id) => g.mutatorOffer.includes(id)); if (pick) g.chooseMutator(pick); else g.skipMutators(); }
      if (!g.startWave()) break;
    }
    // Standoff guard: blockers and heals can outlast enemies nobody can kill. A wave with
    // no kill and no leak for STALL_SECONDS is a standoff; a player would recruit damage
    // mid-wave, the bot counts it as a lost run. (Long boss fights keep making progress.)
    const leaksBefore = g.totalLeaks;
    let quietSteps = 0;
    let progress = -1;
    while (g.running && !g.complete) {
      g.step(1 / 60);
      const now = g.totalLeaks + Object.values(g.heroKills).reduce((sum, h) => sum + h.kills, 0);
      quietSteps = now === progress ? quietSteps + 1 : 0;
      progress = now;
      if (quietSteps >= 60 * STALL_SECONDS) { stalled = true; break; }
    }
    if (stalled) break;
    if (!g.running && g.totalLeaks === leaksBefore) perfectWaves += 1;
  }
  const won = g.won && !stalled;
  return { won, stalled, complete: g.complete || stalled, wave: g.wave, lives: stalled ? 0 : g.lives, leaks: g.totalLeaks, score: g.score, spent, seconds: Math.round(g.time), perfect: won && g.perfect, perfectWaves, insightLog: g.insightLog, mutators: [...(g.mutators ?? [])], mutatorWaves: g.mutatorWaves ?? 0, boons: [...(g.boons ?? [])] };
}

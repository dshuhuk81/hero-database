// Shared balance runner: plays a full run with a simple policy (deploy affordable
// heroes, spend spare gold on the cheapest upgrade, take the first virtue offered).
// Used by test-td-balance.mjs and td-balance-sweep.mjs.
import { TowerDefenseGame } from "../../src/game/td/sim.js";
import { buildRunTuning, TREE } from "../../src/game/td/favor.js";
import heroes from "../../src/data/gameBalance.json" with { type: "json" };
import baseTuning from "../../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../../src/data/tdMaps.json" with { type: "json" };
import waves from "../../src/data/tdWaves.json" with { type: "json" };

export { maps };

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
  "balanced (S-tier core)": ["nuwa", "poseidon", "zeus", "diana", "caishen", "amunra", "phoenix", "yuelao", "momus", "fengyi", "nyx", "prometheus"],
  "budget (D-tier)": ["demeter", "horus", "fengyi", "artemis", "freya", "medusa", "jormungandr", "set", "anubis", "prometheus", "diana"],
  "road wall": ["prometheus", "amunra", "momus", "jormungandr", "yuelao", "nuwa", "demeter", "freya", "caishen", "set"],
  "all platform (no blockers)": ["zeus", "phoenix", "diana", "artemis", "caishen", "fengyi", "medusa", "yuelao", "freya"],
  "glass cannon": ["nyx", "bastet", "phoenix", "zeus", "yuelao", "poseidon", "anubis", "fengyi", "diana", "horus", "medusa"],
};

// `tuning` overrides the base tuning (balance experiments). `focus` is the level focus
// bots pick ("attack", "health", "range"); default: health on the road, attack on platforms.
// `paths` maps class -> path id for the level-4 path (M12); default: each class's first path.
// `mode` is the run mode (waves.js); endless runs stop at `maxWave` as a runaway guard.
export function playRun(ids, seed, map, { difficulty, favLevels = null, tuning: tuningOverride, focus, paths = null, mutators = null, blessings = null, mode = "classic", tier = "normal", maxWave = 150 } = {}) {
  const source = tuningOverride ?? baseTuning;
  const runTuning = favLevels ? buildRunTuning(source, favLevels) : source;
  const tuning = difficulty ? { ...runTuning, difficulty } : runTuning;
  const g = new TowerDefenseGame({ heroes, tuning, map, waves, mode, tier, seed });
  if (!g.setTeam(ids)) throw new Error(`Invalid squad: ${ids}`);
  let spent = 0;
  let stalled = false;
  let perfectWaves = 0;
  const slotCount = { road: map.roadSlots.length, platform: map.platformSlots.length };
  while (!g.complete && g.wave < maxWave) {
    if (!g.running) {
      // deploy every affordable, not-yet-deployed squad member that has a free ring;
      // Supports take the free ring whose aura covers the most allies no other Support
      // covers yet (auras don't stack)
      for (const id of ids) {
        if (g.heroes.some((h) => h.id === id)) continue;
        const base = g.heroesById.get(id);
        if (g.gold < g.deployCost(id)) continue;
        const rings = Array.from({ length: slotCount[base.slot] }, (_, i) => i);
        if (base.class === "Support") {
          const covered = (i) => g.heroes.filter((h) => !g.supportAuraFor(h) && Math.hypot(h.x - map.platformSlots[i][0], h.y - map.platformSlots[i][1]) <= base.range).length;
          rings.sort((a, b) => covered(b) - covered(a) || a - b);
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
        options.sort((a, b) => a.cost - b.cost);
        const before = g.gold;
        const pick = options[0].hero;
        const info = options[0];
        const pathChoice = paths?.[pick.class] ?? info.pathOptions?.[0];
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

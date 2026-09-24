// Shared balance runner: plays a full run with a simple policy (deploy affordable
// heroes, spend spare gold on the cheapest upgrade, take the first virtue offered).
// Used by test-td-balance.mjs and td-balance-sweep.mjs.
import { TowerDefenseGame } from "../../src/game/td/sim.js";
import { buildRunTuning } from "../../src/game/td/favor.js";
import heroes from "../../src/data/gameBalance.json" with { type: "json" };
import baseTuning from "../../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../../src/data/tdMaps.json" with { type: "json" };
import waves from "../../src/data/tdWaves.json" with { type: "json" };
import favorTree from "../../src/data/favorTree.json" with { type: "json" };

export { maps, favorTree };

export const SQUADS = {
  "balanced (S-tier core)": ["nuwa", "poseidon", "zeus", "diana", "caishen"],
  "budget (D-tier)": ["demeter", "horus", "fengyi", "artemis", "freya"],
  "road wall": ["prometheus", "amunra", "momus", "jormungandr", "yuelao"],
  "all platform (no blockers)": ["zeus", "phoenix", "diana", "artemis", "caishen"],
  "glass cannon": ["nyx", "bastet", "phoenix", "zeus", "yuelao"],
};

export function playRun(ids, seed, map, { difficulty, favTree = [] } = {}) {
  const runTuning = favTree.length ? buildRunTuning(baseTuning, favTree) : baseTuning;
  const tuning = difficulty ? { ...runTuning, difficulty } : runTuning;
  const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed });
  if (!g.setTeam(ids)) throw new Error(`Invalid squad: ${ids}`);
  let spent = 0;
  const slotCount = { road: map.roadSlots.length, platform: map.platformSlots.length };
  while (!g.complete) {
    if (!g.running) {
      // deploy every affordable, not-yet-deployed squad member
      for (const id of ids) {
        if (g.heroes.some((h) => h.id === id)) continue;
        const base = g.heroesById.get(id);
        if (g.gold < base.cost) continue;
        for (let i = 0; i < slotCount[base.slot]; i += 1) {
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
        g.upgrade(options[0].hero.entityId);
        spent += before - g.gold;
      }
      if (g.virtueOffer) g.chooseVirtue(g.virtueOffer[0]);
      if (!g.startWave()) break;
    }
    for (let i = 0; i < 60 * 120 && g.running && !g.complete; i += 1) g.step(1 / 60);
  }
  return { won: g.won, wave: g.wave, lives: g.lives, leaks: g.totalLeaks, score: g.score, spent, seconds: Math.round(g.time), perfect: g.perfect };
}

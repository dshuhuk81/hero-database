// Class-vs-enemy matrix (M6): how well each class handles each wave type on its own.
// Every hero of a class defends a synthetic wave alone, on the best ring of its slot
// type; the score is the share of the wave's HP it destroyed before the wave ended
// (killed or leaked) or the time limit ran out. A class scores the mean of its heroes.
import { TowerDefenseGame } from "../../src/game/td/sim.js";
import heroes from "../../src/data/gameBalance.json" with { type: "json" };
import baseTuning from "../../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../../src/data/tdMaps.json" with { type: "json" };

export const WAVE_TYPES = {
  swarm: [{ kind: "grunt", count: 24, gapMs: 150 }],
  armored: [{ kind: "brute", count: 6, gapMs: 1200 }],
  runner: [{ kind: "runner", count: 16, gapMs: 350 }],
  flyer: [{ kind: "flyer", count: 12, gapMs: 450 }],
  boss: [{ kind: "boss", count: 1, gapMs: 1000 }],
};
export const CLASSES = ["Tank", "Warrior", "Assassin", "Mage", "Archer", "Support"];
const LIMIT_SECONDS = 120;

// Share of the wave's HP one hero destroys from one ring.
export function defend(heroId, ringIndex, waveType, { map = maps[0], tuning = baseTuning, level = 1 } = {}) {
  const hero = heroes.find((h) => h.id === heroId);
  const waves = [{ wave: 1, spawns: WAVE_TYPES[waveType] }];
  const g = new TowerDefenseGame({ heroes, tuning, map: { ...map, boss: "baphomet" }, waves, seed: 5 });
  g.gold = 1e6;
  g.difficulty.invincible = true; // a leak must not end the run before the wave is scored
  if (!g.place(heroId, hero.slot, ringIndex)) return null;
  for (let l = 1; l < level; l += 1) g.upgrade(g.heroes[0].entityId, "attack");
  const total = g.waveTotalHp(0);
  let dealt = 0;
  const hit = g.hit.bind(g);
  g.hit = (enemy, amount, ...rest) => {
    const before = Math.max(0, enemy.hp);
    hit(enemy, amount, ...rest);
    dealt += before - Math.max(0, enemy.hp);
  };
  g.startWave();
  for (let i = 0; i < 60 * LIMIT_SECONDS && g.running; i += 1) g.step(1 / 60);
  return Math.min(1, dealt / total);
}

// Best ring for a hero against a wave type (a player would pick a good ring).
export function heroScore(heroId, waveType, opts = {}) {
  const map = opts.map ?? maps[0];
  const hero = heroes.find((h) => h.id === heroId);
  const rings = hero.slot === "road" ? map.roadSlots : map.platformSlots;
  let best = 0;
  for (let i = 0; i < rings.length; i += 1) best = Math.max(best, defend(heroId, i, waveType, { ...opts, map }) ?? 0);
  return best;
}

// { waveType: { Class: mean score } }
export function classMatrix(opts = {}) {
  const out = {};
  for (const waveType of Object.keys(WAVE_TYPES)) {
    out[waveType] = {};
    for (const cls of CLASSES) {
      const members = heroes.filter((h) => h.class === cls);
      out[waveType][cls] = members.reduce((sum, h) => sum + heroScore(h.id, waveType, opts), 0) / members.length;
    }
  }
  return out;
}

export function bestClass(row) {
  return Object.entries(row).sort((a, b) => b[1] - a[1])[0][0];
}

export function printMatrix(matrix) {
  console.log("wave".padEnd(10) + CLASSES.map((c) => c.padStart(10)).join("") + "   best");
  for (const [waveType, row] of Object.entries(matrix)) {
    console.log(waveType.padEnd(10) + CLASSES.map((c) => `${Math.round(row[c] * 100)}%`.padStart(10)).join("") + `   ${bestClass(row)}`);
  }
}

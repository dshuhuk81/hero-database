// Class-vs-enemy matrix (M6): how well each class handles each wave type.
// Every hero defends a synthetic wave on the best ring of its slot type, with one fixed
// partner so the test looks like a real line: road heroes get a healer behind them
// (PARTNER.road), platform heroes a Tank in front (PARTNER.platform). Road and
// platform heroes do different jobs, so they are scored differently:
//   road: share of the wave's enemies stopped (killed, or still held at the time limit)
//   platform: share of the wave's HP the hero itself destroyed
// A class scores the mean of its heroes; each slot group has its own best class.
import { TowerDefenseGame } from "../../src/game/td/sim.js";
import heroes from "../../src/data/gameBalance.json" with { type: "json" };
import baseTuning from "../../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../../src/data/tdMaps.json" with { type: "json" };
import { playRun, SQUADS } from "./td-runner.mjs";

export const WAVE_TYPES = {
  swarm: [{ kind: "grunt", count: 24, gapMs: 150 }],
  armored: [{ kind: "brute", count: 6, gapMs: 1200 }],
  runner: [{ kind: "runner", count: 16, gapMs: 350 }],
  flyer: [{ kind: "flyer", count: 12, gapMs: 450 }],
  boss: [{ kind: "boss", count: 1, gapMs: 1000 }],
  // M11 enemies that ask a question: healed packs, shields, summoners, hexers.
  healer: [{ kind: "brute", count: 3, gapMs: 1200 }, { kind: "mender", count: 3, gapMs: 700 }],
  shield: [{ kind: "shieldbearer", count: 12, gapMs: 300 }],
  summoner: [{ kind: "broodcaller", count: 5, gapMs: 1200 }],
  hexer: [{ kind: "hexer", count: 6, gapMs: 900 }],
};
export const CLASSES = ["Tank", "Warrior", "Assassin", "Mage", "Archer", "Support"];
export const ROAD = ["Tank", "Warrior", "Assassin"];
export const PARTNER = { road: "yuelao", platform: "prometheus" };
// Design intent (TOWER_DEFENSE_ROADMAP.md M6): the class each wave type should call for.
// Flyers have no road answer and every road class holds the lone boss, so those are unset.
export const EXPECTED = {
  swarm: { road: "Warrior", platform: "Mage" },
  armored: { road: "Tank", platform: "Mage" },
  runner: { road: "Assassin" },
  flyer: { platform: "Archer" },
  boss: { platform: "Archer" },
  // M11: splash punishes a healed pack; shields need hold time (Tank) or many hits (Mage
  // splash); Archers snipe the tough Broodcaller and outrange the Hexer's hex. Road Healer
  // is a Warrior / Assassin tie, so it is left unset.
  healer: { platform: "Mage" },
  shield: { road: "Tank", platform: "Mage" },
  summoner: { road: "Warrior", platform: "Archer" },
  hexer: { road: "Tank", platform: "Archer" },
};
const LIMIT_SECONDS = 90;

const nearestRing = (rings, [x, y]) => rings.reduce((best, ring, i) => (Math.hypot(ring[0] - x, ring[1] - y) < Math.hypot(rings[best][0] - x, rings[best][1] - y) ? i : best), 0);

// Score of one hero on one ring (see the header).
export function defend(heroId, ringIndex, waveType, { map = maps[0], tuning = baseTuning, level = 1 } = {}) {
  const hero = heroes.find((h) => h.id === heroId);
  const waves = [{ wave: 1, spawns: WAVE_TYPES[waveType] }];
  const g = new TowerDefenseGame({ heroes, tuning, map: { ...map, boss: "baphomet" }, waves, seed: 5 });
  g.gold = 1e6;
  g.difficulty.invincible = true; // a leak must not end the run before the wave is scored
  if (!g.place(heroId, hero.slot, ringIndex)) return null;
  const unit = g.heroes[0];
  for (let l = 1; l < level; l += 1) {
    const info = g.upgradeInfo(unit.entityId);
    g.upgrade(unit.entityId, info.needsPath ? info.pathOptions[0] : "attack");
  }
  const partner = heroes.find((h) => h.id === PARTNER[hero.slot]);
  const rings = partner.slot === "road" ? map.roadSlots : map.platformSlots;
  g.place(partner.id, partner.slot, nearestRing(rings, [unit.x, unit.y]));
  const total = g.waveTotalHp(0);
  let dealt = 0;
  const hit = g.hit.bind(g);
  g.hit = (enemy, amount, source, ...rest) => {
    const before = Math.max(0, enemy.hp);
    hit(enemy, amount, source, ...rest);
    // Summoned imps are not in the wave total, so they don't count here either.
    if (source === unit && !enemy.summonerId) dealt += before - Math.max(0, enemy.hp);
  };
  g.startWave();
  const count = WAVE_TYPES[waveType].reduce((sum, group) => sum + group.count, 0);
  for (let i = 0; i < 60 * LIMIT_SECONDS && g.running; i += 1) g.step(1 / 60);
  if (hero.slot === "road") return 1 - g.totalLeaks / count;
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

// Best class of a slot group ("road" or "platform") in a matrix row.
export function bestClass(row, group) {
  return Object.entries(row).filter(([cls]) => ROAD.includes(cls) === (group === "road")).sort((a, b) => b[1] - a[1])[0][0];
}

export function printMatrix(matrix) {
  console.log("wave".padEnd(10) + CLASSES.map((c) => c.padStart(10)).join("") + "   best road / platform");
  for (const [waveType, row] of Object.entries(matrix)) {
    console.log(waveType.padEnd(10) + CLASSES.map((c) => `${Math.round(row[c] * 100)}%`.padStart(10)).join("") + `   ${bestClass(row, "road")} / ${bestClass(row, "platform")}`);
  }
}

// Squad checks over full runs (bot policy in td-runner.mjs).
const classOf = Object.fromEntries(heroes.map((h) => [h.id, h.class]));

// Mean endless wave reached over every map and `seeds`.
export function endlessDepth(ids, seeds = [99, 100]) {
  let sum = 0;
  for (const map of maps) for (const seed of seeds) sum += playRun(ids, seed, map, { mode: "endless" }).wave;
  return sum / (maps.length * seeds.length);
}

// Endless depth of the mixed balance squad, and without each class it fields.
export function classRemoval(squad = SQUADS["balanced (S-tier core)"]) {
  const out = { full: endlessDepth(squad) };
  for (const cls of CLASSES) {
    const ids = squad.filter((id) => classOf[id] !== cls);
    if (ids.length < squad.length) out[cls] = endlessDepth(ids);
  }
  return out;
}

// 10-wave result per map for a squad of every hero of one class: "W<lives>" or "L<wave>".
export function monoClass(cls, seed = 99) {
  const ids = heroes.filter((h) => h.class === cls).map((h) => h.id);
  return maps.map((map) => {
    const run = playRun(ids, seed, map);
    return { map: map.id, won: run.won, label: run.won ? `W${run.lives}` : `L${run.wave}` };
  });
}

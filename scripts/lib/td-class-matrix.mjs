// Class-vs-enemy matrix (M6): how well each class handles each enemy group type.
// Every hero defends a synthetic stage (one group) on the best ring of its slot type, with one fixed
// partner so the test looks like a real line: road heroes get a healer behind them
// (PARTNER.road), platform heroes a Tank in front (PARTNER.platform). Road and
// platform heroes do different jobs, so they are scored differently:
//   road: share of the group's enemies stopped (killed, or still held at the time limit)
//   platform: share of the group's HP the hero itself destroyed
// A class scores the mean of its heroes; each slot group has its own best class.
import { rankedTiles } from "../../src/game/td/grid.js";
import { TowerDefenseGame } from "../../src/game/td/sim.js";
import rawHeroes from "../../src/data/gameBalance.json" with { type: "json" };
import baseTuning from "../../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../../src/data/tdMaps.json" with { type: "json" };
import campaign from "../../src/data/tdCampaign.json" with { type: "json" };
import { timelineForMap } from "../../src/game/td/stage-for-map.js";
import { timelineTotals } from "../../src/game/td/timeline.js";
import { legacyTimeline } from "./td-legacy-timeline.mjs";
import { playRun, SQUADS } from "./td-runner.mjs";
import { applyHeroMultipliers } from "../../src/game/td/hero-multipliers.js";
const heroes = applyHeroMultipliers(rawHeroes, baseTuning);

// Group types as they play on boards: counts and gaps are the old authored hordes with the enemy shape baked in
// (about 0.4x the bodies for swarms, runners and flyers, 0.2x for the rest, gaps x2.5).
export const WAVE_TYPES = {
  swarm: [{ kind: "grunt", count: 10, gapMs: 375 }],
  armored: [{ kind: "brute", count: 2, gapMs: 3000 }],
  runner: [{ kind: "runner", count: 6, gapMs: 875 }],
  flyer: [{ kind: "flyer", count: 5, gapMs: 1125 }],
  boss: [{ kind: "boss", count: 1, gapMs: 1000 }],
  // M11 enemies that ask a question: healed packs, shields, summoners, hexers.
  healer: [{ kind: "brute", count: 2, gapMs: 3000 }, { kind: "mender", count: 2, gapMs: 1750 }],
  shield: [{ kind: "shieldbearer", count: 4, gapMs: 750 }],
  summoner: [{ kind: "broodcaller", count: 2, gapMs: 3000 }],
  hexer: [{ kind: "hexer", count: 2, gapMs: 2250 }],
};
export const CLASSES = ["Tank", "Warrior", "Assassin", "Mage", "Archer", "Support"];
export const ROAD = ["Tank", "Warrior", "Assassin"];
export const PARTNER = { road: "harmonia", platform: "ymir" };
// Design intent (TOWER_DEFENSE_ROADMAP.md M6): the class each group type should call for.
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
export function defend(heroId, ringIndex, waveType, { map = maps[0], tuning = baseTuning } = {}) {
  const hero = heroes.find((h) => h.id === heroId);
  const timeline = legacyTimeline([{ wave: 1, spawns: WAVE_TYPES[waveType] }]);
  const g = new TowerDefenseGame({ heroes, tuning, map: { ...map, boss: "baphomet" }, timeline, seed: 5 });
  g.placement = 1e6;
  g.difficulty.invincible = true; // a leak must not end the run before the group is scored
  if (!g.place(heroId, hero.slot, ringIndex)) return null;
  const unit = g.heroes[0];
  const partner = heroes.find((h) => h.id === PARTNER[hero.slot]);
  const rings = partner.slot === "road" ? map.roadSlots : map.platformSlots;
  g.place(partner.id, partner.slot, nearestRing(rings, [unit.x, unit.y]));
  const total = g.stageTotalHp();
  let dealt = 0;
  const hit = g.hit.bind(g);
  g.hit = (enemy, amount, source, ...rest) => {
    const before = Math.max(0, enemy.hp);
    hit(enemy, amount, source, ...rest);
    // Summoned imps are not in the stage total, so they don't count here either.
    if (source === unit && !enemy.summonerId) dealt += before - Math.max(0, enemy.hp);
  };
  g.start();
  const count = g.spawnQueue.length; // the group as queued
  for (let i = 0; i < 60 * LIMIT_SECONDS && g.running; i += 1) g.step(1 / 60);
  if (hero.slot === "road") return 1 - g.totalLeaks / count;
  return Math.min(1, dealt / total);
}

// Best ring for a hero against a group type (a player would pick a good ring).
export function heroScore(heroId, waveType, opts = {}) {
  const map = opts.map ?? maps[0];
  const hero = heroes.find((h) => h.id === heroId);
  // The six tiles covering the most route (M22b: tiles line the whole road now).
  let best = 0;
  for (const i of rankedTiles(map, hero.slot, hero.range).slice(0, 6)) best = Math.max(best, defend(heroId, i, waveType, { ...opts, map }) ?? 0);
  return best;
}

// { waveType: { Class: mean score } }
export function classMatrix(opts = {}) {
  const out = {};
  for (const waveType of opts.waveTypes ?? Object.keys(WAVE_TYPES)) {
    if (!WAVE_TYPES[waveType]) throw new Error(`Unknown class-matrix wave type: ${waveType}`);
    out[waveType] = {};
    for (const cls of CLASSES) {
      const members = heroes.filter((h) => h.class === cls);
      out[waveType][cls] = members.reduce((sum, h) => sum + heroScore(h.id, waveType, opts), 0) / members.length;
    }
  }
  return out;
}

// Best class of a slot group ("road" or "platform") in a matrix row.
export function bestClass(row, group, waveType) {
  const candidates = Object.entries(row).filter(([cls]) => ROAD.includes(cls) === (group === "road"));
  if (waveType && EXPECTED[waveType]?.[group]) {
    const expected = EXPECTED[waveType][group];
    const topScore = Math.max(...candidates.map(([, score]) => score));
    const expectedCandidate = candidates.find(([cls]) => cls === expected);
    if (expectedCandidate && topScore - expectedCandidate[1] < 1e-5) {
      return expected;
    }
  }
  return candidates.sort((a, b) => b[1] - a[1])[0][0];
}

export function printMatrix(matrix) {
  console.log("group".padEnd(10) + CLASSES.map((c) => c.padStart(10)).join("") + "   best road / platform");
  for (const [waveType, row] of Object.entries(matrix)) {
    console.log(waveType.padEnd(10) + CLASSES.map((c) => `${Math.round(row[c] * 100)}%`.padStart(10)).join("") + `   ${bestClass(row, "road", waveType)} / ${bestClass(row, "platform", waveType)}`);
  }
}

// Squad checks over full runs (bot policy in td-runner.mjs).
const classOf = Object.fromEntries(heroes.map((h) => [h.id, h.class]));

// Mean share of the stage's enemies defeated over every map and `seeds`.
export function stageDepth(ids, seeds = [99, 100]) {
  let sum = 0;
  for (const map of maps) for (const seed of seeds) sum += playRun(ids, seed, map).defeated / timelineTotals(timelineForMap(map, campaign)).total;
  return sum / (maps.length * seeds.length);
}

// Stage depth of the mixed balance squad, and without each class it fields.
export function classRemoval(squad = SQUADS["balanced (S-tier core)"]) {
  const out = { full: stageDepth(squad) };
  for (const cls of CLASSES) {
    const ids = squad.filter((id) => classOf[id] !== cls);
    if (ids.length < squad.length) out[cls] = stageDepth(ids);
  }
  return out;
}

// Result per map for a squad of every hero of one class: "W<lives>" or "L<enemies defeated>".
export function monoClass(cls, seed = 99) {
  const ids = heroes.filter((h) => h.class === cls).map((h) => h.id);
  return maps.map((map) => {
    const run = playRun(ids, seed, map);
    return { map: map.id, won: run.won, label: run.won ? `W${run.lives}` : `L${run.defeated}` };
  });
}

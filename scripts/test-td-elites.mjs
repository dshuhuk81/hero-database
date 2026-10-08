// Elite affixes (G1 of TOWER_DEFENSE_GAMEPLAY_IDEAS.md): schedule per chapter, spawn marking and
// the six affix rules in the simulation.
import assert from "node:assert/strict";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import { TowerDefenseGame } from "../src/game/td/sim.js";
import { allStages, stageGameOptions } from "../src/game/td/campaign.js";
import { ELITE_AFFIXES, markEliteSpawns, stageElites } from "../src/game/td/elites.js";
import { maps } from "./lib/td-runner.mjs";

// Schedule: none before Chapter 4, one with one affix in 4-7, two with two from 8, finales one more.
{
  const stages = allStages(campaign);
  for (const stage of stages) {
    const elites = stageElites(stage, tuning);
    const chapter = Number(stage.chapter);
    if (chapter < 4) { assert.deepEqual(elites, [], `${stage.id} has no Elites`); continue; }
    const step = chapter >= 8 ? { count: 2, affixes: 2 } : { count: 1, affixes: 1 };
    assert.equal(elites.length, step.count, `${stage.id} Elite count`);
    for (const affixes of elites) {
      assert.equal(affixes.length, step.affixes + (stage.finale ? tuning.elites.finaleAffixes : 0), `${stage.id} affix count`);
      assert.equal(new Set(affixes).size, affixes.length, `${stage.id} affixes are distinct`);
      for (const id of affixes) assert.ok(ELITE_AFFIXES[id] && tuning.elites.affixes[id], `${id} is known and tuned`);
    }
    assert.deepEqual(stageElites(stage, tuning), elites, "deterministic per stage");
    assert.deepEqual(stageGameOptions(stage, [[], []], 1).elites, elites, "the stage options carry them");
  }
  assert.equal(stages.filter((s) => s.finale).length, campaign.chapters.length, "one finale per chapter");
}

// Marking: spread over ground spawns, never the boss or a flyer, the queue keeps its length.
{
  const queue = [..."gggfggggffgg"].map((c, i) => ({ kind: c === "f" ? "flyer" : "grunt", at: i })).concat([{ kind: "boss", at: 20 }]);
  markEliteSpawns(queue, [["blink"], ["thief"]], tuning);
  const marked = queue.filter((e) => e.elite);
  assert.equal(queue.length, 13);
  assert.equal(marked.length, 2);
  assert.ok(marked.every((e) => e.kind === "grunt"));
  assert.ok(marked[0].at < marked[1].at);
}

const map = maps.find((m) => (m.lanes?.length ?? 1) === 1) ?? maps[0];
const game = (elites, timeline = [{ startMs: 0, kind: "grunt", count: 1 }]) => {
  const g = new TowerDefenseGame({ heroes, tuning, map, timeline, seed: 3, hpScale: 1, lives: 999, elites });
  g.start();
  g.step(0.1);
  return g;
};
const eliteOf = (g) => g.enemies.find((e) => e.elite);

// An Elite spawns with more health, gold and its affixes.
{
  const plain = game([]).enemies[0];
  const elite = eliteOf(game([["vampiric"]]));
  assert.ok(elite, "the only ground spawn becomes the Elite");
  assert.deepEqual(elite.affixes, ["vampiric"]);
  assert.ok(Math.abs(elite.maxHp / plain.maxHp - tuning.elites.hp) < 1e-6);
  assert.ok(Math.abs(elite.reward / plain.reward - tuning.elites.reward) < 1e-6);
}

const hero = (g, extra = {}) => ({ id: "test", entityId: 999, x: 0, y: 0, hp: 1000, hpLeft: 1000, armor: 0, slotType: "road", ultClock: 10, ultCooldown: 20, ...extra });

// Vampiric heals on a hit; Thief drains ultimate charge.
{
  const g = game([["vampiric", "thief"]]);
  const elite = eliteOf(g);
  elite.hp = elite.maxHp * 0.5;
  const target = hero(g);
  g.eliteOnStrike(elite, target);
  assert.ok(Math.abs(elite.hp - elite.maxHp * (0.5 + tuning.elites.affixes.vampiric.heal)) < 1e-6);
  assert.ok(Math.abs(target.ultClock - (10 - 20 * tuning.elites.affixes.thief.drain)) < 1e-6);
}

// Mirror reflects magic damage only.
{
  const g = game([["mirror"]]);
  const elite = eliteOf(g);
  const mage = hero(g, { damageType: "magical" });
  const archer = hero(g, { damageType: "physical" });
  g.heroes.push(mage, archer);
  g.hit(elite, 100, mage, { showShot: false, showHit: false });
  g.hit(elite, 100, archer, { showShot: false, showHit: false });
  assert.ok(mage.hpLeft < 1000, "the magic attacker takes reflected damage");
  assert.equal(archer.hpLeft, 1000, "physical damage is not reflected");
}

// Blink jumps ahead once at half health.
{
  const g = game([["blink"]]);
  const elite = eliteOf(g);
  const before = elite.distance;
  g.hit(elite, elite.hp - elite.maxHp * 0.4, null, { showShot: false, showHit: false });
  assert.ok(elite.blinked && elite.distance > before + tuning.elites.affixes.blink.distance - 1, "blinked forward");
  const after = elite.distance;
  g.hit(elite, 1, null, { showShot: false, showHit: false });
  assert.equal(elite.distance, after, "only once");
}

// Splitter breaks into smaller enemies on death.
{
  const g = game([["splitter"]]);
  const elite = eliteOf(g);
  g.hit(elite, elite.hp + (elite.shield || 0) + 1, null, { showShot: false, showHit: false });
  const children = g.enemies.filter((e) => e.splitFrom === elite.entityId && !e.dead);
  assert.equal(children.length, tuning.elites.affixes.splitter.count);
  assert.ok(children.every((c) => Math.abs(c.maxHp - elite.maxHp * tuning.elites.affixes.splitter.hp) < 1e-6 && !c.elite));
}

// Banner speeds up nearby enemies.
{
  const timeline = [{ startMs: 0, kind: "grunt", count: 1 }];
  const run = (elites) => { const g = game(elites, timeline); g.step(1); return g.enemies[0].distance; };
  assert.ok(run([["banner"]]) > run([["vampiric"]]) * 1.1, "a Banner Elite marches faster than a plain Elite");
}

console.log("td elites ok");

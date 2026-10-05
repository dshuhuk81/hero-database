import assert from "node:assert/strict";
import { TowerDefenseGame } from "../src/game/td/sim.js";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
// Rule checks on the classic (pre-board) map; boards shape the enemies (docs/tower-defense-board-plan.md).
import maps from "./fixtures/td-classic-maps.json" with { type: "json" };
import { OPEN_TIMELINE } from "./lib/td-legacy-timeline.mjs";

// Tests start from the sim defaults; the shipped tuning.difficulty is checked separately below.
const { difficulty: shipped, ...baseTuning } = tuning;
const make = (difficulty) => new TowerDefenseGame({ heroes, tuning: difficulty ? { ...baseTuning, difficulty } : baseTuning, map: maps[0], timeline: OPEN_TIMELINE, seed: 9 });

// Defaults keep today's numbers; there is no per-wave health growth any more.
{
  const game = make();
  assert.deepEqual(
    { enemyHp: game.difficulty.enemyHp, enemySpeed: game.difficulty.enemySpeed, invincible: game.difficulty.invincible },
    { enemyHp: 1, enemySpeed: 1, invincible: false },
    "default difficulty",
  );
  assert.equal("waveHpScale" in game.difficulty, false, "no wave health growth");
  game.spawnEnemy("grunt");
  assert.equal(game.enemies[0].maxHp, tuning.enemies.grunt.hp, "base health");
}

// Multipliers from tuning.difficulty (what "Copy values" produces).
{
  const game = make({ enemyHp: 2, enemySpeed: 0.5 });
  game.spawnEnemy("grunt");
  const enemy = game.enemies[0];
  assert.equal(enemy.maxHp, tuning.enemies.grunt.hp * 2, "HP multiplier");
  assert.equal(enemy.speed, tuning.enemies.grunt.speed * 0.5, "speed multiplier");
  const timeline = [{ startMs: 0, kind: "grunt", count: 3 }, { startMs: 4000, kind: "brute", count: 1 }];
  const stage = new TowerDefenseGame({ heroes, tuning: { ...baseTuning, difficulty: { enemyHp: 2 } }, map: maps[0], timeline, seed: 9 });
  assert.equal(stage.stageTotalHp(), Math.round((3 * tuning.enemies.grunt.hp + tuning.enemies.brute.hp) * 2), "stage HP follows difficulty");
}

// Live changes apply to later spawns; invincible keeps lives.
{
  const game = make();
  game.difficulty.enemyHp = 3;
  game.spawnEnemy("grunt");
  assert.equal(game.enemies[0].maxHp, tuning.enemies.grunt.hp * 3, "live HP change");
  game.difficulty.invincible = true;
  game.running = true;
  game.enemies[0].distance = game.path.total + 1;
  const lives = game.lives;
  game.step(1 / 60);
  assert.equal(game.lives, lives, "invincible ignores leaks");
}

// Shipped difficulty from gameBalance.tuning.json is applied (enemy HP 2x).
{
  const game = new TowerDefenseGame({ heroes, tuning, map: maps[0], timeline: OPEN_TIMELINE, seed: 9 });
  assert.equal(game.difficulty.enemyHp, shipped?.enemyHp ?? 1, "shipped enemyHp applied");
  game.spawnEnemy("grunt");
  assert.equal(game.enemies[0].maxHp, tuning.enemies.grunt.hp * (shipped?.enemyHp ?? 1), "shipped HP multiplier on spawn");
}

console.log("Tower defense difficulty checks passed.");

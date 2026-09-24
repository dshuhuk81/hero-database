import assert from "node:assert/strict";
import { TowerDefenseGame } from "../src/game/td/sim.js";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import waves from "../src/data/tdWaves.json" with { type: "json" };

const make = (difficulty) => new TowerDefenseGame({ heroes, tuning: difficulty ? { ...tuning, difficulty } : tuning, map: maps[0], waves, seed: 9 });

// Defaults keep today's numbers.
{
  const game = make();
  assert.deepEqual(
    { enemyHp: game.difficulty.enemyHp, enemySpeed: game.difficulty.enemySpeed, killGold: game.difficulty.killGold, waveHpScale: game.difficulty.waveHpScale, invincible: game.difficulty.invincible },
    { enemyHp: 1, enemySpeed: 1, killGold: 1, waveHpScale: 0.15, invincible: false },
    "default difficulty",
  );
  game.wave = 3;
  game.spawnEnemy("grunt");
  assert.equal(game.enemies[0].maxHp, tuning.enemies.grunt.hp * 1.3, "wave 3 scaling unchanged");
  assert.equal(game.killReward(5), 5, "gold unchanged");
}

// Multipliers from tuning.difficulty (what "Copy values" produces).
{
  const game = make({ enemyHp: 2, enemySpeed: 0.5, killGold: 1.5, waveHpScale: 0.2 });
  game.wave = 3;
  game.spawnEnemy("grunt");
  const enemy = game.enemies[0];
  assert.equal(enemy.maxHp, tuning.enemies.grunt.hp * 1.4 * 2, "HP multiplier and wave scale");
  assert.equal(enemy.speed, tuning.enemies.grunt.speed * 0.5, "speed multiplier");
  assert.equal(game.killReward(4) + game.killReward(4), 12, "gold multiplier with carry");
  assert.equal(game.waveTotalHp(2), Math.round(waves[2].spawns.reduce((s, g) => s + g.count * tuning.enemies[g.kind].hp, 0) * 1.4 * 2), "preview HP follows difficulty");
}

// Live changes apply to later spawns; invincible keeps lives.
{
  const game = make();
  game.difficulty.enemyHp = 3;
  game.wave = 1;
  game.spawnEnemy("grunt");
  assert.equal(game.enemies[0].maxHp, tuning.enemies.grunt.hp * 3, "live HP change");
  game.difficulty.invincible = true;
  game.running = true;
  game.enemies[0].distance = game.path.total + 1;
  const lives = game.lives;
  game.step(1 / 60);
  assert.equal(game.lives, lives, "invincible ignores leaks");
}

console.log("Tower defense difficulty checks passed.");

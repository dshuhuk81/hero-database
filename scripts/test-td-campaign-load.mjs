import assert from "node:assert/strict";
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { campaignLoadRows, stageLoad } from "../src/game/td/campaign-load.js";

// Break caught: an audit that reimplements wave math can drift from the simulator's shaping,
// gate alternation, minimum spacing, stage HP scaling or boss overrides.
{
  const fixtureTuning = structuredClone(tuning);
  fixtureTuning.enemies.grunt = { hp: 10, attack: 4, armor: 2, speed: 10, reward: 1, damage: 1, attackPeriod: 1 };
  fixtureTuning.enemies.boss = { hp: 50, attack: 10, armor: 5, magicRes: 3, speed: 10, reward: 1, damage: 1, attackPeriod: 1 };
  fixtureTuning.enemies.brood = { hp: 5, attack: 2, armor: 1, speed: 10, reward: 0, damage: 1, attackPeriod: 1 };
  fixtureTuning.board.waveShape = { enabled: true, count: 0.5, gap: 2, hp: 2, attack: 3 };
  fixtureTuning.waveGen.minSpacing = 100;
  fixtureTuning.bosses["audit-boss"] = {
    stats: { hp: 100, attack: 20, armor: 8, magicRes: 4, speed: 10, reward: 1, damage: 1, attackPeriod: 1 },
    summon: { kind: "brood", count: 2, spacing: 20 },
  };
  const sourceMap = maps.find((map) => map.lanes?.length === 2);
  const map = { ...structuredClone(sourceMap), id: "audit-map", theme: "audit", boss: "audit-boss" };
  const stage = {
    id: "9-9",
    chapter: "9",
    mapId: map.id,
    lives: 15,
    hpScale: 2,
    waves: [
      { wave: 1, spawns: [{ kind: "grunt", count: 8, gapMs: 1000 }] },
      { wave: 2, spawns: [{ kind: "boss", count: 1, gapMs: 500 }] },
    ],
  };
  const row = stageLoad({ stage, map, tuning: fixtureTuning });
  assert.equal(row.enemyCount, 5, "wave shaping reduces eight grunts to four plus one boss");
  assert.equal(row.spawnGroups, 2, "authored groups are counted once");
  assert.equal(row.enemyTypes, 2, "effective enemy kinds are distinct");
  assert.equal(row.firstSpawnMs, 0, "the first queue entry starts immediately");
  assert.equal(row.lastSpawnMs, 12000, "two gates and minimum lane spacing determine the final queue entry");
  assert.equal(row.spawnWindowMs, 12000, "stage pressure sums the active spawn windows");
  assert.equal(+row.enemiesPerSecond.toFixed(4), 0.4167, "spawn pressure uses effective enemies and queue timing");
  assert.equal(row.totalHp, 390, "health includes stage scale, wave growth, shaping and boss override");
  assert.equal(row.totalAtk, 68, "attack includes shaping and boss override without HP-only wave growth");
  assert.equal(row.avgArmor, 3.2, "armor is count weighted");
  assert.equal(+row.avgMres.toFixed(2), 2.08, "missing magic resistance falls back to armor");
  assert.equal(row.maxHp, 230, "wave-two boss is the maximum-health enemy");
  assert.equal(row.maxAtk, 20, "boss override supplies the maximum attack");
  assert.equal(row.hasBoss, true, "boss presence is reported");
  assert.deepEqual(row.summonedKinds, ["brood"], "summoned children are named separately");
  assert.equal(row.diagnostics.length, 0, "valid fixtures need no diagnostics");
}

// Break caught: Campaign additions, missing maps, mutation or NaN values must not silently
// produce an incomplete report.
{
  const before = JSON.stringify({ campaign, maps, tuning });
  const first = campaignLoadRows({ campaign, maps, tuning });
  const second = campaignLoadRows({ campaign, maps, tuning });
  const stages = campaign.chapters.flatMap((chapter) => chapter.stages);
  assert.equal(first.length, stages.length, "one row per authored Campaign stage");
  assert.equal(new Set(first.map((row) => row.stageId)).size, stages.length, "stage ids remain unique");
  assert.deepEqual(first, second, "the audit is deterministic");
  assert.equal(JSON.stringify({ campaign, maps, tuning }), before, "the audit does not mutate imported data");
  assert.deepEqual([first[0].hpLoad, first[0].atkLoad, first[0].compositeLoad], [1, 1, 1], "stage 1-1 is the normalization baseline");
  assert.ok(first.every((row) => row.diagnostics.length === 0), "current Campaign data resolves without diagnostics");
  assert.ok(first.every((row) => [row.enemyCount, row.lastSpawnMs, row.spawnWindowMs, row.enemiesPerSecond, row.totalHp, row.totalAtk, row.avgArmor, row.avgMres, row.maxHp, row.maxAtk, row.hpLoad, row.atkLoad, row.compositeLoad].every((value) => Number.isFinite(value) && value >= 0)), "all numeric load metrics are finite and non-negative");
  const layouts = new Set(first.map((row) => `${row.board}/${row.gates}`));
  for (const expected of ["8x4/1", "8x4/2", "9x5/1", "9x5/2", "10x5/2"]) assert.ok(layouts.has(expected), `${expected} Campaign layout is represented`);
}

console.log("Tower defense Campaign load checks passed.");

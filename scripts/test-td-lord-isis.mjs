// Isis, Lord of the Egyptian faction: horizontal line pattern, Sun Beam ultimate, Lord bonuses.
import assert from "node:assert/strict";
import rawHeroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import { PATTERNS, steppedPattern, cellAt } from "../src/game/td/board.js";
import { TowerDefenseGame } from "../src/game/td/sim.js";

// --- pattern: a straight horizontal line, never up or down
for (const name of ["row2", "row3", "row4", "row5"]) {
  assert.ok(PATTERNS[name].every(([, dr]) => dr === 0), `${name} has no vertical cells`);
  assert.ok(PATTERNS[name].some(([dc]) => dc < 0) && PATTERNS[name].some(([dc]) => dc > 0), `${name} reaches left and right`);
}
assert.equal(PATTERNS.row4.length, 9);
assert.equal(steppedPattern("row4", 1), "row5");
assert.equal(steppedPattern("row4", -1), "row3");
assert.equal(tuning.board.heroPatterns.isis, "row4", "Isis uses the line pattern");

const isis = rawHeroes.find((h) => h.id === "isis");
assert.ok(isis && isis.class === "Mage" && isis.lord, "Isis is a Lord Mage");
assert.equal(tuning.heroSkills.isis.variant, "sun_beam");

const map = maps.find((m) => m.grid?.board && !m.campaignOnly && !m.prototype) ?? maps.find((m) => m.grid?.board);
const board = map.grid.board;

function setup(extraIds = [], seed = 7) {
  const g = new TowerDefenseGame({ heroes: rawHeroes, tuning, map, seed });
  g.placement = 100000;
  const slotIndex = 0;
  assert.equal(g.place("isis", "platform", slotIndex), true, "isis placed on a platform tile");
  const caster = g.heroes[0];
  const placed = extraIds.map((id, i) => {
    const hero = rawHeroes.find((h) => h.id === id);
    assert.equal(g.place(id, hero.slot, hero.slot === "platform" ? i + 1 : i), true, `${id} placed`);
    return g.heroes.at(-1);
  });
  g.start();
  g.enemies = [];
  return { g, caster, placed };
}
const enemyAt = (g, x, y, hp = 1e7) => {
  g.spawnEnemy("grunt");
  const e = g.enemies.at(-1);
  e.x = x; e.y = y; e.hp = e.maxHp = hp; e.speed = 0; e.armor = 0; e.magicRes = 0;
  return e;
};
const cell = board.cell;

// --- the beam only goes along her row, left or right, and only hits 8
{
  const { g, caster } = setup();
  assert.ok(caster.range > 0 && caster.basic === "beam" && caster.variant === "sun_beam");
  const row = [];
  for (let i = 1; i <= 3; i += 1) row.push(enemyAt(g, caster.x + i * cell, caster.y));
  const above = enemyAt(g, caster.x + cell, caster.y - cell);
  const below = enemyAt(g, caster.x + cell, caster.y + cell);
  const farRow = enemyAt(g, caster.x + 6 * cell, caster.y);
  assert.ok(g.reaches(caster, row[0]), "an enemy on her row is in reach");
  assert.ok(!g.reaches(caster, above) && !g.reaches(caster, below), "above and below are out of reach");
  assert.ok(!g.reaches(caster, farRow), "past the line is out of reach");
  g.castUltimate(caster, row[0]);
  assert.ok(row.every((e) => e.hp < e.maxHp), "everything on the row is hit once");
  assert.equal(above.hp, above.maxHp, "nothing above");
  assert.equal(below.hp, below.maxHp, "nothing below");
  assert.equal(farRow.hp, farRow.maxHp, "nothing beyond the line");
  const dealt = row.map((e) => e.maxHp - e.hp);
  assert.ok(dealt.every((d) => Math.abs(d - dealt[0]) < 1e-6), "100% to each enemy, no falloff");
}
{
  // direction: toward the side with more enemies; targets capped at 8
  const { g, caster } = setup();
  const left = [enemyAt(g, caster.x - cell, caster.y)];
  const right = [];
  for (let i = 1; i <= 4; i += 1) right.push(enemyAt(g, caster.x + i * cell, caster.y));
  g.castUltimate(caster, left[0]);
  assert.ok(right.every((e) => e.hp < e.maxHp) && left[0].hp === left[0].maxHp, "beam turns to the busier side and never both");
  const ev = g.effects.find((e) => e.type === "ult" && e.heroId === "isis");
  assert.equal(ev.beamDir, 1, "effect carries the beam direction");
}
{
  const t = JSON.parse(JSON.stringify(tuning));
  t.heroSkills.isis.targets = 2;
  const g = new TowerDefenseGame({ heroes: rawHeroes, tuning: t, map, seed: 3 });
  g.placement = 1e5; g.place("isis", "platform", 0); g.start(); g.enemies = [];
  const caster = g.heroes[0];
  const row = [1, 2, 3].map((i) => enemyAt(g, caster.x + i * cell, caster.y));
  g.castUltimate(caster, row[0]);
  assert.deepEqual(row.map((e) => e.hp < e.maxHp), [true, true, false], "targets cap counts the nearest enemies first");
}

// --- Lord bonuses
{
  const { g, caster, placed } = setup(["helios", "nott"]);
  const [helios, nott] = placed;
  assert.equal(g.lordFx(helios).atk, 0.15, "faction member gets +15% attributes");
  assert.equal(g.lordFx(caster).atk, 0.15, "the Lord is part of her faction");
  assert.deepEqual(g.lordFx(nott), {}, "other heroes are not affected");
  const plain = new TowerDefenseGame({ heroes: rawHeroes, tuning, map, seed: 7 });
  plain.placement = 1e5; plain.place("helios", "road", 0);
  assert.ok(g.attackValue(helios) > plain.attackValue(plain.heroes[0]) * 1.149, "attack value is raised by the Lord");
  const hp = helios.hpLeft; g.damageHero(helios, 115, null);
  assert.ok(Math.abs(hp - helios.hpLeft - 100) < 1e-6, "15% basic attributes act as 15% more health");

  // periodic bonus: +50% damage and healing for 20s; sooner with more faction members
  const solo = setup().caster;
  assert.equal(g.lordInterval(caster), 44, "one faction member: 50 - 6 seconds");
  assert.equal(setup().g.lordInterval(solo), 50, "alone: 50 seconds");
  const base = g.attackValue(helios);
  caster.lordClock = 0;
  g.stepLord(caster, 44);
  assert.ok(g.time < caster.lordBuffUntil, "bonus starts after the interval");
  assert.ok(Math.abs(g.attackValue(helios) / base - 1.5) < 1e-9, "+50% damage while active");
  const wounded = helios.hpLeft = 100; helios.hp = 1000;
  const healed = g.healHero(helios, 100, caster);
  assert.ok(Math.abs(healed - 150) < 1e-6, "+50% healing from a faction healer while active");
  g.time = caster.lordBuffUntil + 0.01;
  assert.equal(g.lordFx(helios).dmg, 0, "bonus ends after 20 seconds");
  void wounded;

  // mark: 20% extra damage from her faction for 3s, one enemy per Lord attack
  const e1 = enemyAt(g, caster.x + cell, caster.y);
  g.lordMark(caster, e1);
  const before = e1.hp;
  g.time = caster.lordBuffUntil + 0.02;
  g.hit(e1, 100, helios);
  const marked = before - e1.hp;
  g.hit(e1, 100, nott);
  const unmarked = before - marked - e1.hp;
  assert.ok(Math.abs(marked / unmarked - 1.2) < 1e-9, "faction hits deal +20% on the marked enemy, others do not");
  g.time = e1.lordMarkUntil + 0.1;
  const b2 = e1.hp; g.hit(e1, 100, helios);
  assert.ok(Math.abs(b2 - e1.hp - 100) < 1e-6, "mark expires after 3 seconds");
}
{
  // a basic attack marks one enemy and hits the row; an ultimate marks too
  const { g, caster } = setup();
  const a = enemyAt(g, caster.x + cell, caster.y), b = enemyAt(g, caster.x + 2 * cell, caster.y), c = enemyAt(g, caster.x + 3 * cell, caster.y);
  const d = enemyAt(g, caster.x + 4 * cell, caster.y);
  const near = enemyAt(g, caster.x + cell / 2, caster.y); // in front of the target, between her and it
  g.basicAttack(caster, c);
  assert.ok([a, b, c, d, near].every((e) => e.hp < e.maxHp), "basic attack hits everything on the line, also in front of the target");
  assert.ok(c.lordMarkUntil > g.time && !a.lordMarkUntil && !b.lordMarkUntil && !near.lordMarkUntil, "one marked enemy per Lord attack");
  assert.ok(c.maxHp - c.hp > a.maxHp - a.hp, "the target takes the full hit, the rest a share");
}

console.log("Isis Lord checks passed");

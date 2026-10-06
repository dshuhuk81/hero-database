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
  const g = new TowerDefenseGame({ heroes: rawHeroes, tuning, map, seed, squadRows: [["isis", ...extraIds], []] });
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

// --- Lord bonuses: the selected row owns the permanent effect, not the deployed Lord entity.
{
  const base = rawHeroes.find((hero) => hero.id === "helios");
  const dual = { ...base, id: "egyptian-ally", name: "Egyptian Ally", mythologyGroups: ["egyptian", "greek"] };
  const heroes = [...rawHeroes, dual];
  const rows = [["isis", dual.id, "helios"], ["nott"]];
  const g = new TowerDefenseGame({ heroes, tuning, map, seed: 7, squadRows: rows });
  g.placement = 1e5;
  g.place(dual.id, dual.slot, 0);
  g.place("helios", base.slot, 1);
  g.place("nott", "road", 2);
  const [ally, helios, nott] = g.heroes;
  assert.equal(g.lordFx(ally).atk, 0.15, "a matching dual-group hero gets the row Lord bonus before Isis deploys");
  assert.deepEqual(g.lordFx(helios), {}, "an unrelated hero in the Lord row gets no bonus");
  assert.deepEqual(g.lordFx(nott), {}, "a hero in the other row gets no bonus");

  g.place("isis", "platform", 3);
  const caster = g.heroes.at(-1);
  assert.equal(g.lordFx(caster).atk, 0.15, "the Lord matches her own group");
  g.damageHero(caster, caster.hpLeft * 2, null);
  assert.equal(g.lordFx(ally).atk, 0.15, "the row bonus remains after the Lord dies");

  const sold = new TowerDefenseGame({ heroes, tuning, map, seed: 8, squadRows: rows });
  sold.placement = 1e5; sold.place("isis", "platform", 0); sold.place(dual.id, dual.slot, 1);
  sold.sell(sold.heroes.find((hero) => hero.id === "isis").entityId);
  assert.equal(sold.lordFx(sold.heroes.find((hero) => hero.id === dual.id)).atk, 0.15, "the row bonus remains after the Lord is sold");

  const isolated = new TowerDefenseGame({ heroes, tuning, map, squadRows: [["isis"], [dual.id]] });
  isolated.placement = 1e5; isolated.place(dual.id, dual.slot, 0);
  assert.deepEqual(isolated.lordFx(isolated.heroes[0]), {}, "matching mythology in the other row does not leak across rows");

  const twoTuning = structuredClone(tuning);
  twoTuning.lords.odin = { ...twoTuning.lords.isis, faction: "Greek", groupId: "greek" };
  const two = new TowerDefenseGame({ heroes, tuning: twoTuning, map, squadRows: [["isis", dual.id], ["odin", "helios"]] });
  two.placement = 1e5; two.place(dual.id, dual.slot, 0); two.place("helios", base.slot, 1);
  assert.equal(two.lordFx(two.heroes[0]).lord, "isis", "a dual-group hero receives only its own row Lord effect");
  assert.equal(two.lordFx(two.heroes[1]).lord, "odin", "the second row resolves its own Lord independently");

  // Periodic state advances from the lineup even while Isis is absent and counts selected matching teammates.
  assert.equal(g.lordInterval("isis"), 44, "one matching lineup teammate shortens the interval by six seconds");
  assert.equal(new TowerDefenseGame({ heroes, tuning, map, squadRows: [["isis"], []] }).lordInterval("isis"), 50, "a solo Lord uses the base interval");
  const attackBefore = g.attackValue(ally);
  g.stepLords(44);
  assert.ok(g.lordFx(ally).dmg === 0.5 && g.attackValue(ally) > attackBefore * 1.49, "periodic damage bonus activates without a Lord entity");
  g.time = 20.01;
  assert.equal(g.lordFx(ally).dmg, 0, "periodic bonus expires after its configured duration");

  // Only Isis's own direct hit places her mark; matching row allies consume it.
  const markGame = new TowerDefenseGame({ heroes, tuning, map, squadRows: [["isis", dual.id], ["nott"]] });
  markGame.placement = 1e5; markGame.place("isis", "platform", 0); markGame.place(dual.id, dual.slot, 1); markGame.place("nott", "road", 2); markGame.start(); markGame.enemies = [];
  const markIsis = markGame.heroes.find((hero) => hero.id === "isis"), markAlly = markGame.heroes.find((hero) => hero.id === dual.id), other = markGame.heroes.find((hero) => hero.id === "nott");
  const e1 = enemyAt(markGame, markIsis.x + cell, markIsis.y);
  markGame.lordMark(markAlly, e1);
  assert.equal(e1.lordMarkUntil, undefined, "a matching ally cannot place the Lord mark");
  markGame.lordMark(markIsis, e1);
  const before = e1.hp; markGame.hit(e1, 100, markAlly); const marked = before - e1.hp;
  const beforeOther = e1.hp; markGame.hit(e1, 100, other); const unmarked = beforeOther - e1.hp;
  assert.ok(Math.abs(marked / unmarked - 1.2) < 1e-9, "only matching heroes in Isis's row consume her mark bonus");
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

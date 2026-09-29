// Map generator orthogonal-v1: determinism, validity, bounded failure, published provenance.
import assert from "node:assert/strict";
import maps from "../src/data/tdMaps.json" with { type: "json" };
import { generateMap, geometryHash, GENERATOR_REJECTION } from "../src/game/td/map-generator.js";
import { validateMap } from "../src/game/td/map-validation.js";
import { buildGrid } from "../src/game/td/grid.js";

const identity = { id: "test-map", name: "Test", theme: "sunscar", art: "sunscar-sanctuary-v1", music: "cc0_hope_orchestral", boss: "baphomet" };
const recipe = (seed, parameters = {}, constraints = {}) => ({
  generator: "orthogonal-v1", ruleset: 1, seed, topology: "single-lane", difficultyBand: "standard",
  parameters: { turns: [4, 8], length: [1400, 2300], coverageGap: [0, 0.3], ...parameters }, constraints,
});
const legsOf = (path) => path.slice(1).map((p, i) => [path[i], p]);

// Same recipe, byte-identical record; another seed, another route.
{
  const a = generateMap(recipe(11), identity), b = generateMap(recipe(11), identity), c = generateMap(recipe(12), identity);
  assert.ok(a.ok && b.ok && c.ok, "seeds 11 and 12 generate");
  assert.equal(JSON.stringify(a.map), JSON.stringify(b.map), "deterministic record");
  assert.equal(a.map.geometryHash, geometryHash(a.map), "hash matches the geometry");
  assert.notEqual(a.map.geometryHash, c.map.geometryHash, "another seed differs");
}

// Every generated map is valid, orthogonal, on the 30 px lattice and inside its limits.
for (let seed = 1; seed <= 25; seed++) {
  const r = generateMap(recipe(seed), identity);
  if (!r.ok) continue;
  const { map } = r;
  assert.ok(validateMap(map).ok, `seed ${seed} valid`);
  assert.deepEqual(buildGrid(map), { roadSlots: map.roadSlots, platformSlots: map.platformSlots, rings: map.rings }, `seed ${seed} grid reproducible`);
  // The lattice is anchored at the gate: corner x values step by 30 from the spawn.
  assert.ok(map.path.slice(1, -1).every(([x, y]) => (x - map.spawn.x) % 30 === 0 && y % 30 === 0), `seed ${seed} corners on the lattice`);
  assert.ok(legsOf(map.path).every(([a, b]) => a[0] === b[0] || a[1] === b[1]), `seed ${seed} orthogonal`);
  const turns = map.path.length - 2;
  assert.ok(turns >= 4 && turns <= 8 && turns % 2 === 0, `seed ${seed} turn count`);
  assert.equal(Object.keys(map.rings).length, 3, `seed ${seed} three special tiles`);
}

// Excluded regions keep the road out.
{
  const box = [300, 0, 360, 540]; // a wall from top to bottom: no route can cross it
  const r = generateMap(recipe(5, {}, { exclude: [[400, 0, 160, 300]] }), identity);
  if (r.ok) for (const [a, b] of legsOf(r.map.path)) {
    const x0 = Math.min(a[0], b[0]) - 40, x1 = Math.max(a[0], b[0]) + 40, y0 = Math.min(a[1], b[1]) - 40, y1 = Math.max(a[1], b[1]) + 40;
    assert.ok(!(x0 < 560 && x1 > 400 && y0 < 300 && y1 > 0), "no leg crosses the excluded rect");
  }
  const blocked = generateMap(recipe(5, {}, { exclude: [box] }), identity, { attempts: 30 });
  assert.equal(blocked.ok, false, "a wall across the map cannot be crossed");
  assert.equal(blocked.attempts, 30, "stops at the attempt bound");
  assert.ok(Object.keys(blocked.rejections).length > 0, "reports rejection reasons");
}

// Impossible parameters fail inside the bound with stable reasons; a bad recipe is refused.
{
  const r = generateMap(recipe(3, { length: [5000, 6000] }), identity, { attempts: 50 });
  assert.equal(r.ok, false);
  assert.ok(r.rejections[GENERATOR_REJECTION.LENGTH_OUT_OF_RANGE] > 0, "length reason reported");
  assert.deepEqual(generateMap({ ...recipe(1), generator: "other" }, identity).rejections, { [GENERATOR_REJECTION.RECIPE_INVALID]: 1 }, "unknown generator refused");
}

// Published generated maps regenerate from their stored recipe.
for (const map of maps.filter((entry) => entry.recipe)) {
  const r = generateMap(map.recipe, { id: map.id, name: map.name, theme: map.theme, art: map.art, music: map.music, boss: map.boss });
  assert.ok(r.ok, `${map.id} regenerates`);
  assert.equal(r.map.geometryHash, map.geometryHash, `${map.id} geometry unchanged`);
}
console.log("Tower defense map generator checks passed.");

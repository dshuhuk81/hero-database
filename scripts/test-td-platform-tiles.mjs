import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import * as mapScene from "../src/game/td/map-scene.js";

assert.equal(typeof mapScene.platformTileLayout, "function", "map scene exposes compact platform layout");

// A missing or shared asset makes a map render the wrong material; an oversized footprint makes
// adjacent platforms visually merge and cover the battlefield art.
for (const [art, id] of [["moonlit-sanctuary-v1", "moonlit"], ["verdant-shrine-v1", "verdant"], ["sunscar-sanctuary-v1", "sunscar"]]) {
  const asset = mapScene.mapSceneFor({ art }).assets.platform;
  assert.equal(asset, `/td/maps/${id}-platform-v1.png`, `${id} selects its own ranged platform art`);
  assert.ok(existsSync(new URL(`../public${asset}`, import.meta.url)), `${id} ranged platform art exists`);
}

assert.deepEqual(mapScene.platformTileLayout(118), { width: 88, height: 66, y: 3 }, "large board cells keep a 30px horizontal gap between ranged platforms");
assert.deepEqual(mapScene.platformTileLayout(94), { width: 70, height: 53, y: 2 }, "compact board cells preserve the same platform proportions");

console.log("Theme platform asset and compact layout checks passed.");

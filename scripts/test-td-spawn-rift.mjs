import assert from "node:assert/strict";
import * as mapScene from "../src/game/td/map-scene.js";

assert.equal(typeof mapScene.spawnRiftLayout, "function", "map scene exposes spawn-rift placement");
assert.deepEqual(mapScene.spawnRiftLayout({ dx: 70, dy: 0 }, 70), {
  angle: 0, width: 50, depth: 22, emergeX: 13, emergeY: 0,
}, "horizontal lanes get a compact horizontal rift");
assert.deepEqual(mapScene.spawnRiftLayout({ dx: 0, dy: -70 }, 70), {
  angle: -Math.PI / 2, width: 50, depth: 22, emergeX: 0, emergeY: -13,
}, "vertical lanes rotate the rift and its emergence direction");
assert.ok(mapScene.spawnRiftLayout({ dx: -118, dy: 0 }, 118).width < 70,
  "large boards keep the rift clear of neighbouring tile slabs");

console.log("TD spawn-rift tests passed.");

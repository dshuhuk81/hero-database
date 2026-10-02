import assert from "node:assert/strict";
import { bestClass, classMatrix } from "./lib/td-class-matrix.mjs";
import maps from "../src/data/tdMaps.json" with { type: "json" };

const waveTypes = ["swarm", "runner", "armored"];
const matrix = classMatrix({ map: maps.find((map) => !map.campaignOnly && !map.prototype), waveTypes });

assert.deepEqual(Object.keys(matrix), waveTypes, "focused board matrix runs only the requested wave types");
assert.equal(bestClass(matrix.swarm, "road"), "Warrior", "Warrior leads board swarm waves");
assert.equal(bestClass(matrix.runner, "road"), "Assassin", "Assassin leads board runner waves");
assert.equal(bestClass(matrix.armored, "road"), "Tank", "Tank keeps the durable armored-wave role");

console.log("Tower defense board class checks passed");

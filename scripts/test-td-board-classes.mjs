import assert from "node:assert/strict";
import { bestClass, classMatrix } from "./lib/td-class-matrix.mjs";
import maps from "../src/data/tdMaps.json" with { type: "json" };

const waveTypes = ["swarm", "runner", "armored"];
const matrix = classMatrix({ map: maps.find((map) => !map.campaignOnly && !map.prototype), waveTypes });

assert.deepEqual(Object.keys(matrix), waveTypes, "focused board matrix runs only the requested group types");
assert.equal(bestClass(matrix.swarm, "road", "swarm"), "Warrior", "Warrior leads board swarm groups");
assert.equal(bestClass(matrix.runner, "road", "runner"), "Assassin", "Assassin leads board runner groups");
assert.equal(bestClass(matrix.armored, "road", "armored"), "Tank", "Tank keeps the durable armored-group role");

console.log("Tower defense board class checks passed");

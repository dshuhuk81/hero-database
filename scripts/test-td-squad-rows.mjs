import assert from "node:assert/strict";
import {
  emptySquadRows,
  flattenSquadRows,
  normalizeSquadRows,
  placeInSquadRows,
  validateSquadRows,
} from "../src/game/td/squad-rows.js";

const lordIds = new Set(["isis", "odin-lord"]);
const allowedIds = new Set(["isis", "odin-lord", "gaia", "fenrir", "vidar", "atalanta", "asclepius", "nott", "skadi", "surtr", "aegir"]);

assert.deepEqual(emptySquadRows(), [[], []], "a new lineup has exactly two empty rows");
assert.deepEqual(flattenSquadRows([["isis", "gaia"], ["nott"]]), ["isis", "gaia", "nott"], "rows flatten in display order");

const normalized = normalizeSquadRows([
  ["gaia", "isis", "gaia", "ghost", "fenrir", "vidar", "atalanta", "asclepius"],
  ["odin-lord", "nott", ["bad"], null, "skadi", "odin-lord", "surtr", "aegir"],
  ["asclepius"],
], { allowedIds, lordIds });
assert.deepEqual(normalized, [
  ["isis", "gaia", "fenrir", "vidar", "atalanta"],
  ["odin-lord", "nott", "skadi", "surtr", "aegir"],
], "normalization filters malformed, unknown, duplicate and overflowing entries and puts Lords first");

assert.deepEqual(
  normalizeSquadRows([["gaia", "isis", "odin-lord", "fenrir"], "broken"], { allowedIds, lordIds }),
  [["isis", "gaia", "fenrir"], []],
  "only one Lord survives per row and a malformed row becomes empty",
);
assert.deepEqual(normalizeSquadRows(null, { allowedIds, lordIds }), [[], []], "malformed root becomes two empty rows");

assert.deepEqual(validateSquadRows([["isis", "gaia"], ["nott"]], { allowedIds, lordIds }), { valid: true, reason: null });
assert.equal(validateSquadRows([["gaia", "isis"], []], { allowedIds, lordIds }).valid, false, "a Lord outside slot zero is invalid");
assert.equal(validateSquadRows([["isis", "odin-lord"], []], { allowedIds, lordIds }).valid, false, "two Lords in one row are invalid");
assert.equal(validateSquadRows([["gaia"], ["gaia"]], { allowedIds, lordIds }).valid, false, "a hero cannot occur in both rows");
assert.equal(validateSquadRows([["gaia", "fenrir", "vidar", "atalanta", "asclepius", "nott"], []], { allowedIds, lordIds }).valid, false, "each row is capped at five");

const placed = placeInSquadRows([[], []], "gaia", 1, 0, { lordIds });
assert.deepEqual(placed, { rows: [[], ["gaia"]], error: null }, "a regular hero can be placed in either row");

const fullRegular = [["gaia", "fenrir", "vidar", "atalanta", "asclepius"], []];
const rejectedLord = placeInSquadRows(fullRegular, "isis", 0, 0, { lordIds });
assert.deepEqual(rejectedLord.rows, fullRegular, "a Lord never ejects a hero from a full regular row");
assert.match(rejectedLord.error, /full/i, "full-row Lord rejection explains the problem");

const secondLord = placeInSquadRows([["isis", "gaia"], []], "odin-lord", 0, 0, { lordIds });
assert.deepEqual(secondLord.rows, [["isis", "gaia"], []], "a second Lord leaves the row unchanged");
assert.match(secondLord.error, /Lord/i, "second-Lord rejection explains the problem");

const swapped = placeInSquadRows([["isis", "gaia"], ["odin-lord", "nott"]], "gaia", 1, 1, { lordIds });
assert.deepEqual(swapped, { rows: [["isis", "nott"], ["odin-lord", "gaia"]], error: null }, "an already selected hero swaps exactly across rows");

const unrelated = placeInSquadRows([["isis", "gaia"], []], "skadi", 0, 2, { lordIds });
assert.deepEqual(unrelated, { rows: [["isis", "gaia", "skadi"], []], error: null }, "a Lord row permits unrelated regular heroes");

console.log("Tower defense squad row checks passed");

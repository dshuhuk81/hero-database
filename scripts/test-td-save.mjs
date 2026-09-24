import assert from "node:assert/strict";
import { availableFavor, emptySave, encodeSaveCode, parseSaveText, sanitizeSave, saveFileText, SAVE_CODE_PREFIX } from "../src/game/td/page/save.ts";

const rules = { heroIds: new Set(["zeus", "nuwa", "diana"]), maxTeam: 2 };

// Not a save: rejected.
assert.equal(sanitizeSave(null, rules), null, "null rejected");
assert.equal(sanitizeSave({ favor: 10 }, rules), null, "missing bestScore rejected");

// Cleanup: unknown heroes dropped, team capped, favTree deduped, broken runs dropped.
{
  const clean = sanitizeSave({
    bestScore: 900, bestWave: "7", favor: "25", perfectDefense: 1,
    lastTeam: ["zeus", "ghost", "nuwa", "diana"],
    favTree: ["a", "a", 5, "b"],
    mapBests: { "moonlit-pass": { score: 500, wave: 6 }, broken: { wave: 3 } },
  }, rules);
  assert.deepEqual(clean.lastTeam, ["zeus", "nuwa"], "team filtered and capped");
  assert.deepEqual(clean.favTree, ["a", "b"], "favTree deduped");
  assert.equal(clean.bestWave, 7, "numeric bestWave");
  assert.equal(clean.favor, 25, "numeric favor");
  assert.equal(clean.perfectDefense, true, "boolean perfect");
  assert.deepEqual(Object.keys(clean.mapBests), ["moonlit-pass"], "run without score dropped");
  assert.deepEqual(clean.mapTop["moonlit-pass"], { score: 500, wave: 6 }, "old saves seed mapTop from last run");
}

// Save code and save file round-trip; garbage is rejected.
{
  const save = { ...emptySave(), bestScore: 1234, favor: 60, favTree: ["demeter_bounty"], lastTeam: ["zeus"] };
  const code = encodeSaveCode(save);
  assert.ok(code.startsWith(SAVE_CODE_PREFIX), "code prefix");
  assert.deepEqual(parseSaveText(code, rules), save, "code round-trip");
  assert.deepEqual(parseSaveText(`  ${code.slice(0, 10)}\n${code.slice(10)}  `, rules), save, "whitespace in pasted code ignored");
  assert.deepEqual(parseSaveText(saveFileText(save), rules), save, "file round-trip");
  assert.equal(parseSaveText("TD1:not-base64!!", rules), null, "broken code rejected");
  assert.equal(parseSaveText('{"version":99,"save":{}}', rules), null, "unknown file version rejected");
}

// Available Favor: earned minus unlocked node costs; unknown ids cost nothing.
{
  const tree = [{ id: "a", cost: 25 }, { id: "b", cost: 60 }];
  assert.equal(availableFavor({ ...emptySave(), favor: 100, favTree: ["a", "b"] }, tree), 15, "spent favor subtracted");
  assert.equal(availableFavor({ ...emptySave(), favor: 40, favTree: ["gone"] }, tree), 40, "unknown node ignored");
}

// Pending shard boost survives a save round trip; junk is dropped.
{
  const withBoost = (nextRunBoost) => sanitizeSave({ ...emptySave(), nextRunBoost }, rules)?.nextRunBoost;
  assert.deepEqual(withBoost({ type: "gold", gold: 60 }), { type: "gold", gold: 60 }, "gold boost kept");
  assert.deepEqual(withBoost({ type: "virtue", virtue: "Grace" }), { type: "virtue", virtue: "Grace" }, "virtue boost kept");
  assert.equal(withBoost({ type: "gold", gold: -5 }), null, "negative gold dropped");
  assert.equal(withBoost({ type: "other" }), null, "unknown type dropped");
  assert.equal(sanitizeSave({ bestScore: 0 }, rules).nextRunBoost, null, "old saves have no boost");
}

console.log("Tower defense save checks passed.");

import assert from "node:assert/strict";
import { findNode, nodeSpent } from "../src/game/td/favor.js";
import { availableFavor, availableInsight, emptySave, encodeSaveCode, modeBest, parseSaveText, runKey, sanitizeSave, saveFileText, SAVE_CODE_PREFIX } from "../src/game/td/page/save.ts";

const rules = { heroIds: new Set(["zeus", "nuwa", "diana"]) };

// Not a save: rejected.
assert.equal(sanitizeSave(null, rules), null, "null rejected");
assert.equal(sanitizeSave({ favor: 10 }, rules), null, "missing bestScore rejected");

// Cleanup: unknown and repeated heroes dropped, bad blessing levels dropped, broken runs dropped.
{
  const clean = sanitizeSave({
    bestScore: 900, bestWave: "7", favor: "25", perfectDefense: 1,
    lastTeam: ["zeus", "ghost", "nuwa", "zeus", "diana"],
    favLevels: { demeter_bounty: 2, bad: -1, nan: "x", frac: 2.7 },
    insight: { Mage: 12, Tank: 0 },
    mapBests: { "moonlit-pass": { score: 500, wave: 6 }, broken: { wave: 3 } },
  }, rules);
  assert.deepEqual(clean.lastTeam, ["zeus", "nuwa", "diana"], "team filtered, no cap");
  assert.deepEqual(clean.favLevels, { demeter_bounty: 2, frac: 2 }, "blessing levels cleaned");
  assert.deepEqual(clean.insight, { Mage: 12 }, "insight cleaned");
  assert.equal(clean.refundNotice, 0, "new saves have nothing to refund");
  assert.equal(clean.bestWave, 7, "numeric bestWave");
  assert.equal(clean.favor, 25, "numeric favor");
  assert.equal(clean.perfectDefense, true, "boolean perfect");
  assert.deepEqual(Object.keys(clean.mapBests), ["moonlit-pass"], "run without score dropped");
  assert.deepEqual(clean.mapTop["moonlit-pass"], { score: 500, wave: 6 }, "old saves seed mapTop from last run");
}

// Save code and save file round-trip; garbage is rejected.
{
  const save = { ...emptySave(), bestScore: 1234, favor: 60, favLevels: { demeter_bounty: 1 }, insight: { Mage: 4 }, resetSpent: 150, lastTeam: ["zeus"] };
  const code = encodeSaveCode(save);
  assert.ok(code.startsWith(SAVE_CODE_PREFIX), "code prefix");
  assert.deepEqual(parseSaveText(code, rules), save, "code round-trip");
  assert.deepEqual(parseSaveText(`  ${code.slice(0, 10)}\n${code.slice(10)}  `, rules), save, "whitespace in pasted code ignored");
  assert.deepEqual(parseSaveText(saveFileText(save), rules), save, "file round-trip");
  assert.equal(parseSaveText("TD1:not-base64!!", rules), null, "broken code rejected");
  assert.equal(parseSaveText('{"version":99,"save":{}}', rules), null, "unknown file version rejected");
}

// Available Favor and Insight: earned minus levels bought (and resets); unknown ids cost nothing.
{
  const gold = findNode("demeter_bounty");
  const might = findNode("mage_might");
  const save = { ...emptySave(), favor: 500, resetSpent: 150, insight: { Mage: 40 }, favLevels: { demeter_bounty: 2, mage_might: 1, gone: 3 } };
  assert.equal(availableFavor(save), 500 - 150 - nodeSpent(gold, 2), "spent favor and resets subtracted");
  assert.equal(availableInsight(save, "Mage"), 40 - might.cost, "class insight spent");
  assert.equal(availableInsight(save, "Tank"), 0, "no insight earned, none spent");
}

// The first tree (favTree ids) is refunded once: levels start empty, the notice holds the old total.
{
  const old = sanitizeSave({ ...emptySave(), favor: 400, favTree: ["demeter_bounty", "amunra_surge"], favLevels: undefined }, rules);
  assert.deepEqual(old.favLevels, {}, "old purchases dropped");
  assert.equal(old.refundNotice, 25 + 120, "refund notice holds the old prices");
  assert.equal(availableFavor(old), 400, "all Favor available again");
  const migrated = sanitizeSave({ ...old }, rules);
  assert.equal(migrated.refundNotice, 145, "notice kept until dismissed");
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

// Run modes (M2): per-mode records share mapTop under "map@mode" keys.
{
  assert.equal(runKey("moonlit-pass", "classic"), "moonlit-pass", "classic keeps the plain map id");
  assert.equal(runKey("moonlit-pass", "endless"), "moonlit-pass@endless", "other modes get a suffix");
  const clean = sanitizeSave({
    bestScore: 700,
    mapTop: { "moonlit-pass": { score: 600, wave: 10 }, "moonlit-pass@long": { score: 1500, wave: 18 }, "verdant-crossing@long": { score: 1900, wave: 20 }, "moonlit-pass@endless": { score: 3200, wave: 27 } },
  }, rules);
  assert.equal(modeBest(clean, "classic"), 700, "classic best ignores other modes");
  assert.equal(modeBest(clean, "long"), 1900, "20-wave best across maps");
  assert.equal(modeBest(clean, "endless"), 3200, "endless best");
  assert.equal(modeBest(emptySave(), "endless"), 0, "no runs yet");
  const roundTrip = parseSaveText(encodeSaveCode(clean), rules);
  assert.deepEqual(roundTrip.mapTop, clean.mapTop, "mode records survive the save code");
}

console.log("Tower defense save checks passed.");

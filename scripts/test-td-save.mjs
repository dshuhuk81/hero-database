import assert from "node:assert/strict";
import { findNode, nodeSpent } from "../src/game/td/favor.js";
import { availableFavor, availableInsight, emptySave, encodeSaveCode, parseSaveText, resetTdAccount, runKey, sanitizeSave, saveFileText, SAVE_CODE_PREFIX, tierBest } from "../src/game/td/page/save.ts";

import heroes from "../src/data/gameBalance.json" with { type: "json" };

const rules = { heroIds: new Set(heroes.map((hero) => hero.id)) };

// Account reset removes all Tower Defense state and preferences, but leaves the rest of
// the site's local storage alone. A small in-memory Storage exercises the real key scan.
{
  const values = new Map([
    ["td:v1", "save"],
    ["td:audio", "audio"],
    ["td:mode", "campaign"],
    ["heroView", "list"],
  ]);
  const storage = {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(key); },
  };
  resetTdAccount(storage);
  assert.deepEqual([...values.entries()], [["heroView", "list"]], "account reset removes only td:* browser data");
}

// Not a save: rejected.
assert.equal(sanitizeSave(null, rules), null, "null rejected");
assert.equal(sanitizeSave({ favor: 10 }, rules), null, "missing bestScore rejected");

// Cleanup: unknown and repeated heroes dropped, bad blessing levels dropped, broken runs dropped.
{
  const clean = sanitizeSave({
    bestScore: 900, bestWave: "7", favor: "25", perfectDefense: 1, treeVersion: 3,
    lastTeam: ["odin", "ghost", "atlas", "odin", "skadi"],
    favLevels: { gaia_bounty: 2, bad: -1, nan: "x", frac: 2.7 },
    insight: { Mage: 12, Tank: 0 },
    mapBests: { "moonlit-pass": { score: 500, wave: 6 }, broken: { wave: 3 } },
  }, rules);
  assert.deepEqual(clean.lastTeam, ["odin", "atlas", "skadi"], "team filtered, no cap");
  assert.deepEqual(clean.favLevels, { gaia_bounty: 2, frac: 2 }, "blessing levels cleaned");
  assert.deepEqual(clean.insight, { Mage: 12 }, "insight cleaned");
  assert.equal(clean.refundNotice, 0, "new saves have nothing to refund");
  assert.equal("bestWave" in clean, false, "the legacy bestWave field is dropped");
  assert.equal(clean.bestDefeated, 0, "bestDefeated starts at 0");
  assert.equal(clean.favor, 25, "numeric favor");
  assert.equal(clean.perfectDefense, true, "boolean perfect");
  assert.deepEqual(Object.keys(clean.mapBests), ["moonlit-pass"], "run without score dropped");
  assert.deepEqual(clean.mapTop["moonlit-pass"], { score: 500, defeated: 0 }, "old saves seed mapTop from last run");
}

// Saves from before October 1, 2026 used the database ids (zeus, nuwa, ...): they load
// under the mythic ids, blessing node ids included.
{
  const old = sanitizeSave({
    ...emptySave(), bestScore: 10, lastTeam: ["zeus", "set", "odin"],
    favLevels: { demeter_bounty: 2, set_command: 1, mage_might: 1 },
    campaign: { ...emptySave().campaign, owned: ["zeus", "nuwa"], lastSquad: ["zeus"], levels: { zeus: 4 }, copies: { nuwa: 2 } },
  }, rules);
  assert.deepEqual(old.lastTeam, ["odin", "surtr"], "team renamed, duplicates dropped");
  assert.deepEqual(old.favLevels, { gaia_bounty: 2, surtr_command: 1, mage_might: 1 }, "blessing node ids renamed");
  assert.ok(old.campaign.owned.includes("odin") && old.campaign.owned.includes("atlas") && !old.campaign.owned.includes("zeus"), "owned renamed");
  assert.deepEqual(old.campaign.lastSquad, ["odin"], "squad renamed");
  assert.equal(old.campaign.levels.odin, 4, "levels renamed");
  assert.equal(old.campaign.copies.atlas, 2, "copies renamed");
}

// Save code and save file round-trip; garbage is rejected.
{
  const save = { ...emptySave(), bestScore: 1234, favor: 60, favLevels: { gaia_bounty: 1 }, insight: { Mage: 4 }, resetSpent: 150, lastTeam: ["odin"] };
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
  const gold = findNode("gaia_bounty");
  const might = findNode("mage_might");
  const save = { ...emptySave(), favor: 500, resetSpent: 150, insight: { Mage: 40 }, favLevels: { gaia_bounty: 2, mage_might: 1, gone: 3 } };
  assert.equal(availableFavor(save), 500 - 150 - nodeSpent(gold, 2), "spent favor and resets subtracted");
  assert.equal(availableInsight(save, "Mage"), 40 - might.cost, "class insight spent");
  assert.equal(availableInsight(save, "Tank"), 0, "no insight earned, none spent");
}

// The first tree (favTree ids) is refunded once: levels start empty, the notice holds the old total.
{
  const old = sanitizeSave({ ...emptySave(), favor: 400, favTree: ["gaia_bounty", "helios_surge"], favLevels: undefined }, rules);
  assert.deepEqual(old.favLevels, {}, "old purchases dropped");
  assert.equal(old.refundNotice, 25 + 120, "refund notice holds the old prices");
  assert.equal(availableFavor(old), 400, "all Favor available again");
  const migrated = sanitizeSave({ ...old }, rules);
  assert.equal(migrated.refundNotice, 145, "notice kept until dismissed");
}

// Pending shard boost survives a save round trip; junk is dropped.
{
  const withBoost = (nextRunBoost) => sanitizeSave({ ...emptySave(), nextRunBoost }, rules)?.nextRunBoost;
  assert.deepEqual(withBoost({ type: "placement", placement: 6 }), { type: "placement", placement: 6 }, "placement boost kept");
  assert.equal(withBoost({ type: "virtue", virtue: "Grace" }), null, "old virtue boost dropped");
  assert.equal(withBoost({ type: "placement", placement: -5 }), null, "negative placement dropped");
  assert.equal(withBoost({ type: "other" }), null, "unknown type dropped");
  assert.equal(sanitizeSave({ bestScore: 0 }, rules).nextRunBoost, null, "old saves have no boost");
}

// Legacy run modes are gone: records of "map@long" and "map@endless" merge into the plain map key, keeping the higher score.
{
  assert.equal(runKey("moonlit-pass"), "moonlit-pass", "Normal keeps the plain map id");
  assert.equal(runKey("moonlit-pass", "heroic"), "moonlit-pass#heroic");
  const clean = sanitizeSave({
    bestScore: 5000, bestWave: 12,
    mapTop: { "moonlit-pass": { score: 3000, wave: 8 }, "moonlit-pass@long": { score: 4200, wave: 15 }, "sunscar-ruins@endless": { score: 900, wave: 20 }, "moonlit-pass@long#heroic": { score: 800, wave: 4 } },
    daily: [{ date: "2026-10-01", bestWave: 4, bestScore: 700, goalReached: false }],
    quests: { date: "2026-10-01", activity: 0, tasks: { "free-wave10": { done: true, claimed: false }, "free-defeat40": { done: true, claimed: false }, summon: { done: true, claimed: false } }, milestones: [] },
  }, rules);
  assert.equal(clean.bestScore, 5000, "score record survives");
  assert.deepEqual(clean.mapTop["moonlit-pass"], { score: 4200, defeated: 0 }, "mode suffix merged, higher score kept");
  assert.deepEqual(clean.mapTop["sunscar-ruins"], { score: 900, defeated: 0 });
  assert.deepEqual(clean.mapTop["moonlit-pass#heroic"], { score: 800, defeated: 0 }, "tier suffix kept");
  assert.equal(Object.keys(clean.mapTop).some((key) => key.includes("@")), false, "no mode suffix left");
  assert.equal(clean.daily[0].bestDefeated, 0, "old daily record keeps its score and starts at 0 defeated");
  assert.equal(clean.daily[0].bestScore, 700);
  assert.deepEqual(Object.keys(clean.quests.tasks), ["summon"], "tasks of removed quests (Free Play, Challenge) are dropped, the rest keeps its progress");
  assert.equal(tierBest(clean), 5000, "Normal best is the plain bestScore or the best Normal map record");
  assert.equal(tierBest(clean, "heroic"), 800);
  assert.equal(tierBest(emptySave()), 0, "no runs yet");
  const roundTrip = parseSaveText(encodeSaveCode(clean), rules);
  assert.deepEqual(roundTrip.mapTop, clean.mapTop, "records survive the save code");
}

// Tree v3 (M3): a v2 save keeps its levels and its available Favor and Insight; Surge
// levels drop out and their Insight comes back.
{
  const v2 = { ...emptySave(), favor: 1000, insight: { Mage: 300 }, favLevels: { gaia_bounty: 2, mage_might: 5, mage_ascension: 1, mage_surge: 1 } };
  delete v2.treeVersion;
  delete v2.repriceNotice;
  // v2 prices: Gaia 30 + 41; Might 5 + 7 + 9 + 12 + 17; Ascension 40; Surge 80.
  const favorBefore = 1000 - (30 + 41);
  const mageBefore = 300 - (5 + 7 + 9 + 12 + 17) - 40 - 80;
  const migrated = sanitizeSave(v2, rules);
  assert.equal(migrated.treeVersion, 3, "migrated to tree v3");
  assert.equal(availableFavor(migrated), favorBefore, "available Favor unchanged");
  assert.equal(availableInsight(migrated, "Mage"), mageBefore + 80, "Insight unchanged plus the Surge refund");
  assert.equal(migrated.favLevels.mage_might, 5, "owned levels kept");
  assert.equal(migrated.repriceNotice, true, "one-time notice");
  const again = sanitizeSave(migrated, rules);
  assert.equal(availableFavor(again), favorBefore, "credit applied once");
  const fresh = sanitizeSave(emptySave(), rules);
  assert.equal(fresh.repriceNotice, false, "new saves get no notice");
}

// Difficulty tiers (M3): own record keys, Normal keys unchanged.
{
  assert.equal(runKey("moonlit-pass", "mythic"), "moonlit-pass#mythic");
  const save = { ...emptySave(), bestScore: 100, mapTop: { "moonlit-pass": { score: 100, defeated: 10 }, "moonlit-pass#heroic": { score: 500, defeated: 10 } } };
  assert.equal(tierBest(save), 100, "Normal record ignores Heroic");
  assert.equal(tierBest(save, "heroic"), 500);
  assert.equal(tierBest(save, "mythic"), 0, "Mythic has no run");
}

console.log("Tower defense save checks passed.");

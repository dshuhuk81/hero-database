// Daily Quests (R10): task table, activity points, milestone chests, UTC-midnight reset,
// save record (TOWER_DEFENSE_DAILY_QUESTS.md section 7 checks). Pure logic, no DOM.
import assert from "node:assert/strict";
import { dailyDate } from "../src/game/td/daily.js";
import {
  QUEST_BAR_GOAL,
  QUEST_MILESTONES,
  QUEST_MAX_ACTIVITY,
  QUEST_TASKS,
  claimQuestMilestone,
  claimQuestTask,
  milestoneState,
  newQuestRecord,
  notifyQuest,
  questBadgeText,
  questProgress,
  questRecord,
  sanitizeQuests,
} from "../src/game/td/quests.js";
import { emptySave, parseSaveText, encodeSaveCode, sanitizeSave } from "../src/game/td/page/save.ts";
import { isScreen } from "../src/game/td/page/nav.ts";
import heroes from "../src/data/gameBalance.json" with { type: "json" };

const DAY = new Date("2026-10-02T12:00:00Z"); // one fixed UTC day for the simulations
const NEXT = new Date("2026-10-03T00:30:00Z"); // after the UTC-midnight reset
const rules = { heroIds: new Set(heroes.map((hero) => hero.id)) };
const freshSave = () => emptySave();
const sealsOf = (save) => save.campaign.currencies.divineSeals || 0;

// The owner-approved tables (spec sections 2 and 3): eight tasks, 110 total, default chests (the Challenge and Free Play tasks went with Free Play).
{
  assert.equal(QUEST_TASKS.length, 8, "eight daily tasks");
  assert.deepEqual(QUEST_TASKS.map((t) => t.points), [10, 20, 20, 20, 10, 10, 10, 10]);
  assert.equal(QUEST_MAX_ACTIVITY, 110, "total available activity");
  assert.equal(QUEST_BAR_GOAL, 100, "the bar pays up to 100 activity");
  assert.deepEqual(QUEST_MILESTONES, [
    { at: 20, favor: 30, seals: 0 }, { at: 40, favor: 40, seals: 0 }, { at: 60, favor: 50, seals: 10 },
    { at: 80, favor: 60, seals: 0 }, { at: 100, favor: 80, seals: 15 },
  ], "default chest column");
  assert.equal(QUEST_MILESTONES.reduce((sum, c) => sum + c.favor, 0), 260, "chests total 260 Favor");
  assert.equal(QUEST_MILESTONES.reduce((sum, c) => sum + c.seals, 0), 25, "chests total 25 seals");
}

// Check 1: a fresh day starts at 0 activity with all tasks unclaimed.
{
  const save = freshSave();
  const record = questRecord(save, DAY);
  assert.equal(record.date, "2026-10-02");
  assert.equal(record.activity, 0);
  assert.deepEqual(record.tasks, {});
  assert.deepEqual(record.milestones, []);
  const progress = questProgress(save, DAY);
  assert.equal(progress.tasks.length, 8);
  assert.ok(progress.tasks.every((task) => task.state === "open"), "every task open");
  assert.ok(progress.milestones.every((chest) => chest.state === "locked"), "every chest locked");
}

// Check 2: each task pays its points exactly once per day, however often the activity repeats.
{
  const save = freshSave();
  for (const task of QUEST_TASKS) {
    assert.equal(notifyQuest(save, task.id, DAY), true, `${task.id}: first completion counts`);
    assert.equal(notifyQuest(save, task.id, DAY), false, `${task.id}: repeating does not re-count`);
    assert.equal(claimQuestTask(save, task.id, DAY), task.points, `${task.id}: pays its points`);
    assert.equal(claimQuestTask(save, task.id, DAY), 0, `${task.id}: no double pay`);
  }
  assert.equal(questRecord(save, DAY).activity, QUEST_MAX_ACTIVITY, "all eight tasks pay once: 110");
}

// Check 3: claiming pays points; claiming again (or before completion) pays nothing.
{
  const save = freshSave();
  assert.equal(claimQuestTask(save, "summon", DAY), 0, "not completed: nothing to claim");
  notifyQuest(save, "summon", DAY);
  assert.equal(claimQuestTask(save, "summon", DAY), 10);
  assert.equal(claimQuestTask(save, "summon", DAY), 0, "second claim pays nothing");
  assert.equal(questRecord(save, DAY).activity, 10);
  assert.equal(questProgress(save, DAY).tasks.find((t) => t.id === "summon").state, "claimed");
}

// Check 4: a chest is claimable exactly at its threshold, not below it.
{
  const save = freshSave();
  assert.equal(claimQuestMilestone(save, 20, DAY), null, "0 activity: chest locked");
  notifyQuest(save, "trial-goal", DAY); // 20 points
  assert.equal(claimQuestMilestone(save, 20, DAY), null, "done but unclaimed pays no chest");
  claimQuestTask(save, "trial-goal", DAY);
  assert.equal(questRecord(save, DAY).activity, 20);
  assert.equal(milestoneState(questRecord(save, DAY), 20), "ready");
  assert.equal(milestoneState(questRecord(save, DAY), 40), "locked", "next chest needs 40");
  assert.equal(claimQuestMilestone(save, 40, DAY), null, "below the threshold: not claimable");
  assert.equal(claimQuestMilestone(save, 20, DAY).at, 20, "exactly at the threshold: claimable");
  assert.equal(milestoneState(questRecord(save, DAY), 20), "claimed");
}

// Check 5: claiming a chest pays its Favor and seals into the wallet exactly once.
{
  const save = freshSave();
  const favor0 = save.favor;
  const seals0 = sealsOf(save);
  const done = (...ids) => { for (const id of ids) { notifyQuest(save, id, DAY); claimQuestTask(save, id, DAY); } };
  done("heroic-clear", "expedition", "trial-goal", "summon"); // 70
  assert.equal(questRecord(save, DAY).activity, 70);
  assert.equal(milestoneState(questRecord(save, DAY), 100), "locked", "100 needs 100 activity");
  assert.equal(save.favor, favor0, "no Favor before a chest is claimed");
  assert.equal(claimQuestMilestone(save, 60, DAY).seals, 10, "60 chest pays 10 seals");
  assert.equal(save.favor, favor0 + 50);
  assert.equal(sealsOf(save), seals0 + 10);
  assert.equal(claimQuestMilestone(save, 100, DAY), null, "claimed-once rule: 100 still locked");
  done("campaign-clear", "intervention", "blessing", "hero-upgrade"); // 110
  const chest = claimQuestMilestone(save, 100, DAY);
  assert.deepEqual(chest, { at: 100, favor: 80, seals: 15 }, "100 chest pays 80 Favor + 15 seals");
  assert.equal(save.favor, favor0 + 130);
  assert.equal(sealsOf(save), seals0 + 25);
  assert.equal(claimQuestMilestone(save, 100, DAY), null, "chest pays once");
  assert.equal(claimQuestMilestone(save, 80, DAY).favor, 60, "lower thresholds still pay");
  assert.equal(save.favor, favor0 + 190);
  assert.equal(claimQuestMilestone(save, 20, DAY).favor, 30, "chests claim in any order once reached");
  assert.equal(claimQuestMilestone(save, 40, DAY).favor, 40);
  assert.equal(save.favor, favor0 + 260, "all five chests: 260 Favor total");
  assert.equal(sealsOf(save), seals0 + 25);
  assert.equal(claimQuestMilestone(save, 20, DAY), null, "claimed chests do not pay again");
  assert.deepEqual(questRecord(save, DAY).milestones.sort((a, b) => a - b), [20, 40, 60, 80, 100]);
}

// Check 6: after UTC midnight the activity resets and unclaimed points and chests are gone.
{
  const save = freshSave();
  notifyQuest(save, "campaign-clear", DAY);
  claimQuestTask(save, "campaign-clear", DAY); // 10, chests locked
  notifyQuest(save, "trial-goal", DAY); // 20 done, unclaimed - expires
  const record = questRecord(save, NEXT);
  assert.equal(record.date, "2026-10-03");
  assert.equal(record.activity, 0, "unclaimed points expire");
  assert.deepEqual(record.tasks, {}, "done-but-unclaimed tasks expire");
  assert.deepEqual(record.milestones, [], "unclaimed chests expire");
  // The new day pays again.
  notifyQuest(save, "trial-goal", NEXT);
  assert.equal(claimQuestTask(save, "trial-goal", NEXT), 20, "the new day pays its own points");
}

// Check 7: every Go button lands on a registered nav screen.
{
  assert.ok(isScreen("quests"), "the quest screen is registered");
  for (const task of QUEST_TASKS) assert.ok(isScreen(task.go), `${task.id}: Go -> ${task.go}`);
  assert.equal(new Set(QUEST_TASKS.map((t) => t.id)).size, QUEST_TASKS.length, "task ids unique");
}

// Check 8: a full simulated day (clear stage -> trial goal -> expedition -> claim all)
// ends with the exact expected wallet delta.
{
  const save = freshSave();
  const favor0 = save.favor;
  const seals0 = sealsOf(save);
  notifyQuest(save, "campaign-clear", DAY);
  claimQuestTask(save, "campaign-clear", DAY); // 10
  notifyQuest(save, "trial-goal", DAY);
  claimQuestTask(save, "trial-goal", DAY); // 30
  notifyQuest(save, "expedition", DAY);
  claimQuestTask(save, "expedition", DAY); // 50
  assert.equal(questBadgeText(save, DAY), "2 to claim", "two chests ready at 50 activity");
  claimQuestMilestone(save, 20, DAY); // +30 Favor
  claimQuestMilestone(save, 40, DAY); // +40 Favor
  assert.equal(claimQuestMilestone(save, 60, DAY), null, "60 not reached");
  assert.equal(save.favor, favor0 + 70, "exact Favor delta: 30 + 40");
  assert.equal(sealsOf(save), seals0, "no seals below the 60 chest");
  assert.equal(questBadgeText(save, DAY), "50 of 110 activity", "claimed: badge falls back to today's activity");
}

// Check 9: a save without a quests record (old saves) loads as a fresh day, no migration.
{
  const old = { ...emptySave(), bestScore: 10 };
  delete old.quests;
  const loaded = sanitizeSave(JSON.parse(JSON.stringify(old)), rules);
  assert.deepEqual(loaded.quests, newQuestRecord(dailyDate()), "missing record -> fresh day");
  assert.equal(loaded.quests.activity, 0);
  const viaCode = parseSaveText(encodeSaveCode(old), rules);
  assert.deepEqual(viaCode.quests, newQuestRecord(dailyDate()), "save code keeps the rule");
  // A stale (yesterday) record survives the load untouched; the roll-over happens on the
  // first quest read, like the Daily Trial record.
  const yesterday = { ...emptySave(), bestScore: 10, quests: { date: "2026-10-01", activity: 80, tasks: { summon: { done: true, claimed: true } }, milestones: [20, 40] } };
  const kept = sanitizeSave(JSON.parse(JSON.stringify(yesterday)), rules);
  assert.deepEqual(kept.quests, yesterday.quests, "reload keeps the day's record");
  const reloaded = freshSave();
  reloaded.quests = kept.quests;
  const progress = questProgress(reloaded, DAY);
  assert.equal(progress.activity, 0, "a new UTC day starts fresh");
  assert.equal(progress.date, "2026-10-02");
  // Sanitizer drops junk.
  assert.deepEqual(sanitizeQuests("x", "2026-10-02"), newQuestRecord("2026-10-02"));
  assert.deepEqual(sanitizeQuests({ date: "bad", activity: -3, tasks: { unknown: { done: 1 }, summon: { done: true, claimed: true, extra: 1 } }, milestones: [20, 99, 20] }, "2026-10-02"),
    { date: "2026-10-02", activity: 0, tasks: { summon: { done: true, claimed: true } }, milestones: [20] });
}

console.log("td daily quests tests passed");

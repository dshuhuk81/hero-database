// Daily Quests (R10, TOWER_DEFENSE_DAILY_QUESTS.md): a fixed list of ten "do X once"
// activities per UTC day. Completing an activity makes its task claimable; claiming pays
// activity points, and an activity bar pays milestone chests (Favor, Divine Seals at the
// two top milestones) at 20/40/60/80/100. Reset at UTC midnight, the same clock as the
// Daily Trial (daily.js dailyDate()); unclaimed points and chests expire. Pure logic; the
// page module is page/quests.ts, the save record lives in td:v1 as `quests`.
import { dailyDate, isDailyDate } from "./daily.js";
import { addSeals } from "./campaign.js";

// The ten daily tasks (spec section 2, owner-approved list). `go` is the nav screen the
// quest screen's Go button deep-links to (page/nav.ts ScreenId).
export const QUEST_TASKS = [
  { id: "campaign-clear", text: "Clear a campaign stage", points: 10, go: "stages" },
  { id: "heroic-clear", text: "Clear a Heroic campaign stage", points: 20, go: "stages" },
  { id: "trial-goal", text: "Reach the Daily Trial goal", points: 20, go: "daily" },
  { id: "expedition", text: "Finish an Expedition", points: 20, go: "expedition" },
  { id: "challenge", text: "Clear a Challenge", points: 15, go: "mode" },
  { id: "free-wave10", text: "Clear wave 10 in Free Play", points: 10, go: "maps" },
  { id: "summon", text: "Perform a summon", points: 10, go: "summon" },
  { id: "blessing", text: "Buy a blessing-tree node", points: 10, go: "blessings" },
  { id: "intervention", text: "Use a Divine Intervention in a run", points: 10, go: "maps" },
  { id: "hero-upgrade", text: "Promote a hero or buy a hero level", points: 10, go: "heroes" },
];

// Activity chests (spec section 3, the owner-picked default column).
export const QUEST_MILESTONES = [
  { at: 20, favor: 30, seals: 0 },
  { at: 40, favor: 40, seals: 0 },
  { at: 60, favor: 50, seals: 10 },
  { at: 80, favor: 60, seals: 0 },
  { at: 100, favor: 80, seals: 15 },
];

export const QUEST_MAX_ACTIVITY = QUEST_TASKS.reduce((sum, task) => sum + task.points, 0); // 135
export const QUEST_BAR_GOAL = QUEST_MILESTONES.at(-1).at; // the bar fills at 100 activity
export const QUEST_WAVE = 10; // Free Play task: run ends at wave >= 10

export const QUEST_TASK_IDS = new Set(QUEST_TASKS.map((task) => task.id));
const QUEST_MILESTONE_ATS = new Set(QUEST_MILESTONES.map((milestone) => milestone.at));
const questTask = (id) => QUEST_TASKS.find((task) => task.id === id) ?? null;

// Save record per UTC day: { date, activity, tasks: { taskId: { done, claimed } }, milestones:
// [claimed thresholds] }. `done` means the activity happened (the row shows Claim); `claimed`
// means its points were paid into `activity`.
export function newQuestRecord(date) {
  return { date, activity: 0, tasks: {}, milestones: [] };
}

// Save cleanup (page/save.ts): a missing or stale record becomes a fresh day, unknown task
// ids drop, numbers clamp. `today` is dailyDate() at load time.
export function sanitizeQuests(value, today = dailyDate()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return newQuestRecord(today);
  const date = isDailyDate(value.date) ? value.date : today;
  const tasks = {};
  if (value.tasks && typeof value.tasks === "object") {
    for (const [id, state] of Object.entries(value.tasks)) {
      if (!QUEST_TASK_IDS.has(id) || !state || typeof state !== "object") continue;
      const entry = {};
      if (state.done) entry.done = true;
      if (state.claimed) entry.claimed = true;
      if (Object.keys(entry).length) tasks[id] = entry;
    }
  }
  const milestones = Array.isArray(value.milestones)
    ? [...new Set(value.milestones.filter((at) => QUEST_MILESTONE_ATS.has(at)))] : [];
  return { date, activity: Math.max(0, Math.floor(Number(value.activity) || 0)), tasks, milestones };
}

// The record for `now`'s UTC day, rolling over to a fresh one at UTC midnight. Unclaimed
// points and chests from the old day expire with it (spec section 4).
export function questRecord(save, now = new Date()) {
  const date = dailyDate(now);
  if (!save.quests || save.quests.date !== date) save.quests = newQuestRecord(date);
  return save.quests;
}

// Marks a task's activity done (claimable). Page modules call this at the spec's "counted
// when" moments, after the feature itself paid its reward. Idempotent per day: repeating
// the activity does not change anything, and a task done before midnight stays claimable
// until the reset. Returns true when this call made the task claimable.
export function notifyQuest(save, id, now = new Date()) {
  if (!QUEST_TASK_IDS.has(id)) return false;
  const record = questRecord(save, now);
  const state = record.tasks[id] ?? (record.tasks[id] = {});
  if (state.done) return false;
  state.done = true;
  return true;
}

// Claims a task: pays its points into `activity` exactly once. Returns the points paid
// (0 when the task is unknown, not done, or already claimed).
export function claimQuestTask(save, id, now = new Date()) {
  const task = questTask(id);
  if (!task) return 0;
  const record = questRecord(save, now);
  const state = record.tasks[id];
  if (!state?.done || state.claimed) return 0;
  state.claimed = true;
  record.activity += task.points;
  return task.points;
}

// Chest state for the bar: claimed > ready (activity reached the threshold) > locked.
export function milestoneState(record, at) {
  if (record.milestones.includes(at)) return "claimed";
  return record.activity >= at ? "ready" : "locked";
}

// Claims an activity chest: pays its Favor into save.favor and its Divine Seals into the
// campaign wallet, exactly once. Returns the chest { at, favor, seals } or null when it is
// not claimable.
export function claimQuestMilestone(save, at, now = new Date()) {
  const chest = QUEST_MILESTONES.find((milestone) => milestone.at === at);
  if (!chest) return null;
  const record = questRecord(save, now);
  if (record.milestones.includes(at) || record.activity < at) return null;
  record.milestones.push(at);
  save.favor = (save.favor || 0) + chest.favor;
  if (chest.seals) save.campaign = addSeals(save.campaign, chest.seals);
  return chest;
}

// Everything the quest screen and the home badge need in one read.
export function questProgress(save, now = new Date()) {
  const record = questRecord(save, now);
  const tasks = QUEST_TASKS.map((task) => {
    const state = record.tasks[task.id] ?? {};
    return { ...task, done: !!state.done, claimed: !!state.claimed, state: state.claimed ? "claimed" : state.done ? "ready" : "open" };
  });
  const milestones = QUEST_MILESTONES.map((chest) => ({ ...chest, state: milestoneState(record, chest.at) }));
  const claimable = tasks.filter((task) => task.state === "ready").length + milestones.filter((chest) => chest.state === "ready").length;
  return { date: record.date, activity: record.activity, tasks, milestones, claimable };
}

// Home screen dock badge note (the badge itself is the camp's red dot, like the other
// dock items): what the player can act on right now, else today's activity.
export function questBadgeText(save, now = new Date()) {
  const progress = questProgress(save, now);
  if (progress.claimable) return `${progress.claimable} to claim`;
  return progress.activity ? `${progress.activity} of ${QUEST_MAX_ACTIVITY} activity` : "";
}

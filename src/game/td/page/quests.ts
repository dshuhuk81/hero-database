// Daily Quests (R10) on the page: the quest screen with the activity bar (five milestone
// chests), the eight task rows (progress, Go deep-link, Claim) and the UTC-reset countdown
// footer. Rules, task table and chest table live in ../quests.js; the save record in
// page/save.ts. Daily only - no Weekly/Achievements tabs (spec section 5).
import { dailyDate } from "../daily.js";
import { resetText } from "./daily";
import { QUEST_BAR_GOAL, claimQuestMilestone, claimQuestTask, questProgress } from "../quests.js";
import type { PageContext } from "./context";

// One simple glyph per task (24x24 stroke paths, like the home screen icons).
const TASK_ICONS: Record<string, string> = {
  "campaign-clear": "M6 21V3M6 4h11l-2.5 4L17 12H6", // flag
  "heroic-clear": "M12 3l2.2 6.3L20.5 12l-6.3 2.7L12 21l-2.2-6.3L3.5 12l6.3-2.7z", // star
  "trial-goal": "M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9", // hourglass
  expedition: "M3 12a9 9 0 1018 0a9 9 0 10-18 0M15.5 8.5l-2 5-5 2 2-5z", // compass
  summon: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18", // sparkle rays
  blessing: "M12 3l2.2 6.3L20.5 12l-6.3 2.7L12 21l-2.2-6.3L3.5 12l6.3-2.7z", // same star glyph as Heroic
  intervention: "M13 2L5 13h6l-1 9 8-11h-6z", // bolt
  "hero-upgrade": "M7 8a3 3 0 106 0a3 3 0 10-6 0M3 20c0-4 3-6 7-6s7 2 7 6M15 5a3 3 0 010 6M17 14c2.5.5 4 2.5 4 6", // heroes
};

const CHEST_ICON = "M4 10v9h16v-9M4 10h16M12 10v9M12 10s-4.5.2-4.5-2.4C7.5 5.6 12 5 12 8.5c0-3.5 4.5-3 4.5-.9S12 10 12 10z"; // chest with a clasp
const icon = (path: string) => `<svg class="td-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}" fill="none" /></svg>`;
const chestIcon = (path: string) => `<svg class="td-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}" fill="none" stroke-linejoin="round" /></svg>`;

export function createQuests(ctx: PageContext) {
  const { q, store } = ctx;
  const dateEl = q("[data-td-quests-date]");
  const activityEl = q("[data-td-quest-activity]");
  const barEl = q("[data-td-quest-bar]");
  const listEl = q("[data-td-quest-list]");
  const resetEl = q("[data-td-quests-reset]");
  let seenDate = "";

  function chestHtml(chest: { at: number; favor: number; seals: number; state: string }) {
    const ready = chest.state === "ready";
    const reward = `${chest.favor} Favor${chest.seals ? ` + ${chest.seals} Divine Seals` : ""}`;
    const label = chest.state === "claimed" ? `Chest claimed: ${reward}` : ready ? `Claim chest: ${reward}` : `Chest at ${chest.at} activity: ${reward}`;
    return `<button type="button" class="td-quest-chest is-${chest.state}" style="left:${chest.at}%" data-quest-chest="${chest.at}"${ready ? "" : " disabled"} aria-label="${label}">` +
      `${chestIcon(CHEST_ICON)}<small>${chest.at}</small></button>`;
  }

  function taskRow(task: { id: string; text: string; points: number; go: string; state: string }) {
    const progress = task.state === "open" ? "0/1" : "1/1";
    const action = task.state === "ready"
      ? `<button type="button" class="action-button action-button--primary td-quest-claim" data-quest-claim="${task.id}">Claim</button>`
      : `<button type="button" class="action-button action-button--quiet" data-td-go="${task.go}">Go</button>`;
    return `<li class="td-quest is-${task.state}">` +
      `<span class="td-quest-icon">${icon(TASK_ICONS[task.id] ?? TASK_ICONS["campaign-clear"])}</span>` +
      `<span class="td-quest-copy"><strong>${task.text}</strong><small>${task.state === "claimed" ? "Claimed" : progress}</small></span>` +
      `<span class="td-quest-points">+${task.points}</span>${action}</li>`;
  }

  function render() {
    const progress = questProgress(store.data);
    if (seenDate !== progress.date) seenDate = progress.date;
    dateEl.textContent = progress.date;
    activityEl.textContent = `${Math.min(progress.activity, QUEST_BAR_GOAL)} / ${QUEST_BAR_GOAL}`;
    const fill = Math.min(100, Math.round((progress.activity / QUEST_BAR_GOAL) * 100));
    barEl.innerHTML = `<span class="td-quest-track" aria-hidden="true"><span class="td-quest-fill" style="width:${fill}%"></span></span>` +
      progress.milestones.map(chestHtml).join("");
    listEl.innerHTML = progress.tasks.map(taskRow).join("");
    resetEl.textContent = `New quests in ${resetText()} - unclaimed points and chests expire at UTC midnight.`;
  }

  // Claim buttons pay the task's activity points; the bar's chest buttons pay Favor/Seals.
  listEl.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-quest-claim]");
    if (!button) return;
    const points = claimQuestTask(store.data, button.dataset.questClaim!);
    if (!points) return;
    store.persist();
    render();
    ctx.notice(`+${points} activity.`);
  });
  barEl.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-quest-chest]");
    if (!button) return;
    const chest = claimQuestMilestone(store.data, Number(button.dataset.questChest));
    if (!chest) return;
    store.persist();
    render();
    ctx.notice(`Chest claimed: +${chest.favor} Favor${chest.seals ? ` and +${chest.seals} Divine Seals` : ""}.`);
  });

  // A new UTC day re-renders the whole list (the record rolls over on the next read).
  setInterval(() => { if (seenDate && seenDate !== dailyDate()) render(); }, 60000);

  return { render };
}

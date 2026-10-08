// Daily Quests (R10) on the page: the quest screen with the activity bar (five milestone
// chests), the eight task rows (progress, Go deep-link, Claim) and the UTC-reset countdown
// footer. Rules, task table and chest table live in ../quests.js; the save record in
// page/save.ts. Daily only - no Weekly/Achievements tabs (spec section 5).
import { homeEmblemPath, loadTdImage, questArtPath } from "../assets.js";
import { dailyDate } from "../daily.js";
import { resetText } from "./daily";
import { QUEST_BAR_GOAL, claimQuestMilestone, claimQuestTask, questProgress } from "../quests.js";
import type { PageContext } from "./context";

// One PixelLab emblem per task (ui/emblems, shared with the home screen where the task's mode lives).
const TASK_EMBLEMS: Record<string, string> = {
  "campaign-clear": "campaign",
  "heroic-clear": "heroic",
  "trial-goal": "trial",
  expedition: "expedition",
  summon: "summon",
  blessing: "blessings",
  intervention: "intervention",
  "hero-upgrade": "heroes",
};
const art = (path: string) => `<img class="td-quest-art" data-td-art="${path}" alt="" decoding="async">`;

export function createQuests(ctx: PageContext) {
  const { q, store, root } = ctx;
  const dateEl = q("[data-td-quests-date]");
  const activityEl = q("[data-td-quest-activity]");
  const barEl = q("[data-td-quest-bar]");
  const listEl = q("[data-td-quest-list]");
  const resetEl = q("[data-td-quests-reset]");
  let seenDate = "";
  loadTdImage(q<HTMLImageElement>("[data-td-quests-coin]"), questArtPath("activity"));

  function chestHtml(chest: { at: number; favor: number; seals: number; state: string }) {
    const ready = chest.state === "ready";
    const reward = `${chest.favor} Favor${chest.seals ? ` + ${chest.seals} Divine Seals` : ""}`;
    const label = chest.state === "claimed" ? `Chest claimed: ${reward}` : ready ? `Claim chest: ${reward}` : `Chest at ${chest.at} activity: ${reward}`;
    return `<button type="button" class="td-quest-chest is-${chest.state}" style="left:${chest.at}%" data-quest-chest="${chest.at}"${ready ? "" : " disabled"} aria-label="${label}">` +
      `<span class="td-quest-chest-reward"><b>${chest.favor}</b> Favor${chest.seals ? `<em>+${chest.seals} Seals</em>` : ""}</span>` +
      `<span class="td-quest-chest-art">${art(questArtPath(chest.state === "claimed" ? "chest-open" : "chest-closed"))}</span><small>${chest.at}</small></button>`;
  }

  function taskRow(task: { id: string; text: string; points: number; go: string; state: string }) {
    const progress = task.state === "open" ? "0/1" : "1/1";
    const action = task.state === "ready"
      ? `<button type="button" class="action-button action-button--primary td-quest-claim" data-quest-claim="${task.id}">Claim</button>`
      : `<button type="button" class="action-button action-button--quiet" data-td-go="${task.go}">Go</button>`;
    return `<li class="td-quest is-${task.state}">` +
      `<span class="td-quest-icon">${art(homeEmblemPath(TASK_EMBLEMS[task.id] ?? "campaign"))}</span>` +
      `<span class="td-quest-copy"><strong>${task.text}</strong><small class="td-quest-progress">${task.state === "claimed" ? "Completed · Claimed" : `${progress} completed`}</small></span>` +
      `<span class="td-quest-points">${art(questArtPath("activity"))}+${task.points}</span>${action}</li>`;
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
    for (const img of root.querySelectorAll<HTMLImageElement>(".td-quests-screen img[data-td-art]")) loadTdImage(img, img.dataset.tdArt);
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

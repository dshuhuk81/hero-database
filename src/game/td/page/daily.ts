// Daily Trial (M19) on the page: the Daily Trial screen with today's setup and best, its
// summary for the home screen, starting the trial run, and recording a finished trial for the
// result screen. Setup, seed and the save record live in ../daily.js.
import { bossSprite, classIconImg, homeEmblemPath, loadTdImage, mutatorArtPath, questArtPath } from "../assets.js";
import { defeatedCount, DAILY, dailyDate, dailyRecord, dailySetup, recordDaily } from "../daily.js";
import { addSeals } from "../campaign.js";
import { notifyQuest } from "../quests.js";
import summonData from "../../../data/tdSummon.json" with { type: "json" };
import { MUTATOR_INFO } from "../skills.js";
import type { PageContext } from "./context";
import type { SaveData } from "./save";

export type DailySetup = { date: string; seed: number; mapId: string; heroIds: string[]; mutators: string[]; goal: number };

// Divine Seals for the day's first goal clear, on top of the Favor (summon currency, M26).
const DAILY_SEALS: number = (summonData as any).sealSources?.dailyGoal ?? 0;

const mutatorInfo = MUTATOR_INFO as Record<string, { name: string; text: string }>;

// Portrait card of a locked-in hero (Daily Trial squad, Expedition roster). `badge`
// replaces the placement cost in the top corner (for example an Expedition veteran's level).
export function trialCardHtml(hero: any, index: number, badge = `${hero.cost}`) {
  const heroClass = String(hero.class || "").toLowerCase();
  return `<li class="td-trial-card td-trial-card--${heroClass}" style="--i:${index}">` +
    `<div class="td-trial-card-art"><img data-rarity="${hero.rarity ?? ''}" src="${hero.portrait ?? hero.image}" alt="" loading="lazy" decoding="async"></div>` +
    `<span class="td-trial-card-class" title="${hero.class}">${classIconImg(hero.class, 20)}</span>` +
    `<span class="td-trial-card-cost">${badge}</span>` +
    `<div class="td-trial-card-plate"><strong>${hero.name}</strong>${hero.title ? `<small>${hero.title}</small>` : ""}` +
    `<span class="td-trial-card-meta"><span>${hero.class}</span><span>${hero.slot === "road" ? "Road" : "Platform"}</span></span></div></li>`;
}

// Time left until the next UTC midnight, when dailyDate() rolls over to a new trial.
export function resetText(now = Date.now()) {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  const minutes = Math.max(1, Math.ceil((next.getTime() - now) / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

// Goal line shared by the Daily Trial screen and the result screen.
export const dailyGoalText = (setup: DailySetup) => `Defeat ${setup.goal} enemies`;

export function dailyBestText(save: SaveData, date: string) {
  const record = dailyRecord(save.daily, date);
  if (!record) return "No trial run today yet.";
  return `Today's best: ${record.bestScore.toLocaleString()} points, ${record.bestDefeated} ${record.bestDefeated === 1 ? "enemy" : "enemies"} defeated${record.goalReached ? " - goal reached" : ""}.`;
}

// Records a finished trial run in the save (skipped for debug runs), pays the one-time
// goal Favor and Divine Seals and returns the result screen line. The caller persists the save.
export function finishDaily(save: SaveData, game: any, setup: DailySetup, record: boolean) {
  const defeated = defeatedCount(game);
  const reached = defeated >= setup.goal;
  let reward = 0;
  if (record) {
    const result = recordDaily(save.daily, setup, { defeated, score: game.score ?? 0 });
    save.daily = result.records;
    reward = result.reward;
    save.favor = (save.favor || 0) + reward;
    if (reward) save.campaign = addSeals(save.campaign, DAILY_SEALS) as SaveData["campaign"];
    if (reached) notifyQuest(save, "trial-goal"); // R10 daily quest #3: the trial goal, once per day
  }
  const goal = reached
    ? `Goal reached: ${dailyGoalText(setup).toLowerCase()}.${reward ? ` +${reward} Favor${DAILY_SEALS ? ` and +${DAILY_SEALS} Divine Seals` : ""} for today's first clear.` : ""}`
    : `Goal missed: ${dailyGoalText(setup).toLowerCase()} (${defeated} defeated).`;
  // A trial started before midnight UTC keeps its own day.
  const best = setup.date === dailyDate() ? ` ${dailyBestText(save, setup.date)}` : ` Trial of ${setup.date}.`;
  return { reached, reward, text: goal + best };
}

export function createDaily(ctx: PageContext) {
  const { q, data, store, heroById } = ctx;
  const mapEl = q("[data-td-daily-map]");
  const dateEl = q("[data-td-daily-date]");
  const goalEl = q("[data-td-daily-goal]");
  const heroesEl = q("[data-td-daily-heroes]");
  const mutatorsEl = q("[data-td-daily-mutators]");
  const bestEl = q("[data-td-daily-best]");
  const bossEl = q("[data-td-daily-boss]");
  const bossArtEl = q<HTMLImageElement>("[data-td-daily-boss-art]");
  const rewardEl = q("[data-td-daily-reward]");
  const rewardAmountEl = q("[data-td-daily-reward-amount]");
  const rewardStateEl = q("[data-td-daily-reward-state]");
  const squadCountEl = q("[data-td-daily-squad-count]");
  let today: DailySetup | null = null;
  loadTdImage(q<HTMLImageElement>("[data-td-daily-emblem]"), homeEmblemPath("trial"));

  // Recomputed when the UTC date changes while the page stays open.
  function setup(): DailySetup {
    const date = dailyDate();
    if (today?.date !== date) today = dailySetup(date, data) as DailySetup;
    return today;
  }

  function render() {
    const current = setup();
    const map = data.maps.find((entry: any) => entry.id === current.mapId);
    const boss = ctx.bossFor(map);
    const record = dailyRecord(store.data.daily, current.date);
    dateEl.textContent = current.date;
    mapEl.textContent = map?.name ?? current.mapId;
    bossEl.textContent = boss.name;
    const bossArt = bossSprite(boss.id);
    if (bossArtEl.getAttribute("src") !== bossArt) bossArtEl.src = bossArt;
    goalEl.innerHTML = `Defeat <strong>${current.goal} enemies</strong>`;
    rewardAmountEl.textContent = `+${DAILY.rewardFavor}`;
    q("[data-td-daily-reward-seals]").textContent = DAILY_SEALS ? `+${DAILY_SEALS} Divine Seals` : "";
    rewardEl.classList.toggle("is-claimed", !!record?.goalReached);
    rewardStateEl.textContent = record?.goalReached ? "Claimed today" : "Reward available";
    const chestEl = q<HTMLImageElement>("[data-td-daily-chest]");
    const chestPath = questArtPath(record?.goalReached ? "chest-open" : "chest-closed");
    if (chestEl.dataset.path !== chestPath) { chestEl.dataset.path = chestPath; delete chestEl.dataset.local; loadTdImage(chestEl, chestPath); }
    squadCountEl.textContent = `${current.heroIds.length} heroes locked in`;
    heroesEl.innerHTML = current.heroIds.map((id, index) => trialCardHtml(heroById.get(id), index)).join("");
    mutatorsEl.innerHTML = current.mutators.map((id) => `<li><img class="td-trial-mutator-art" data-td-art="${mutatorArtPath(id)}" alt="" decoding="async"><span><strong>${mutatorInfo[id]?.name ?? id}</strong>${mutatorInfo[id]?.text ?? ""}</span></li>`).join("");
    for (const img of mutatorsEl.querySelectorAll<HTMLImageElement>("img[data-td-art]")) loadTdImage(img, img.dataset.tdArt);
    bestEl.textContent = dailyBestText(store.data, current.date);
  }

  // Home screen data (home.ts): today's battlefield and whether the goal is cleared yet.
  function homeSummary() {
    const current = setup();
    const record = dailyRecord(store.data.daily, current.date);
    const map = data.maps.find((entry: any) => entry.id === current.mapId);
    return { mapName: (map?.name ?? current.mapId) as string, cleared: !!record?.goalReached, best: record?.bestScore ?? 0 };
  }

  // A new UTC day re-renders the whole trial.
  setInterval(() => {
    if (today && today.date !== dailyDate()) render();
  }, 60000);

  function start() {
    const current = setup();
    const map = data.maps.find((entry: any) => entry.id === current.mapId);
    if (map) ctx.actions.startSession(map, { daily: current });
  }

  q("[data-td-daily-start]").addEventListener("click", start);

  return { render, setup, start, homeSummary };
}

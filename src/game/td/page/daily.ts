// Daily Trial (M19) on the page: the Daily Trial screen with today's setup and best, its
// card on the main menu, starting the trial run, and recording a finished trial for the
// result screen. Setup, seed and the save record live in ../daily.js.
import { bossSprite, classIconImg } from "../assets.js";
import { clearedWaves, DAILY, dailyDate, dailyRecord, dailySetup, recordDaily } from "../daily.js";
import { MUTATOR_INFO } from "../skills.js";
import type { PageContext } from "./context";
import type { SaveData } from "./save";

export type DailySetup = { date: string; seed: number; mapId: string; heroIds: string[]; mutators: string[]; goal: number };

const mutatorInfo = MUTATOR_INFO as Record<string, { name: string; text: string }>;

// Goal line shared by the Daily Trial screen and the result screen.
export const dailyGoalText = (setup: DailySetup) => `Clear wave ${setup.goal}`;

export function dailyBestText(save: SaveData, date: string) {
  const record = dailyRecord(save.daily, date);
  if (!record) return "No trial run today yet.";
  return `Today's best: ${record.bestScore.toLocaleString()} points, ${record.bestWave} ${record.bestWave === 1 ? "wave" : "waves"} cleared${record.goalReached ? " - goal reached" : ""}.`;
}

// Records a finished trial run in the save (skipped for debug runs), pays the one-time
// goal Favor and returns the result screen line. The caller persists the save.
export function finishDaily(save: SaveData, game: any, setup: DailySetup, record: boolean) {
  const cleared = clearedWaves(game);
  const reached = cleared >= setup.goal;
  let reward = 0;
  if (record) {
    const result = recordDaily(save.daily, setup, { cleared, score: game.score ?? 0 });
    save.daily = result.records;
    reward = result.reward;
    save.favor = (save.favor || 0) + reward;
  }
  const goal = reached
    ? `Goal reached: ${dailyGoalText(setup).toLowerCase()}.${reward ? ` +${reward} Favor for today's first clear.` : ""}`
    : `Goal missed: ${dailyGoalText(setup).toLowerCase()} (${cleared} cleared).`;
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
  const summaryMapEl = q("[data-td-daily-summary-map]");
  const summaryEl = q("[data-td-daily-summary]");
  let today: DailySetup | null = null;

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
    goalEl.innerHTML = `Survive the assault and clear <strong>wave ${current.goal}</strong>.`;
    rewardAmountEl.textContent = `+${DAILY.rewardFavor}`;
    rewardEl.classList.toggle("is-claimed", !!record?.goalReached);
    rewardStateEl.textContent = record?.goalReached ? "Claimed today" : "Reward available";
    squadCountEl.textContent = `${current.heroIds.length} heroes locked in`;
    heroesEl.innerHTML = current.heroIds.map((id, index) => {
      const hero = heroById.get(id);
      const heroClass = String(hero.class || "").toLowerCase();
      return `<li class="td-trial-card td-trial-card--${heroClass}" style="--i:${index}">` +
        `<div class="td-trial-card-art"><img src="${hero.portrait ?? hero.image}" alt="" loading="lazy" decoding="async"></div>` +
        `<span class="td-trial-card-class" title="${hero.class}">${classIconImg(hero.class, 20)}</span>` +
        `<span class="td-trial-card-cost">${hero.cost}g</span>` +
        `<div class="td-trial-card-plate"><strong>${hero.name}</strong>${hero.title ? `<small>${hero.title}</small>` : ""}` +
        `<span class="td-trial-card-meta"><span>${hero.class}</span><span>${hero.slot === "road" ? "Road" : "Platform"}</span></span></div></li>`;
    }).join("");
    mutatorsEl.innerHTML = current.mutators.map((id) => `<li title="${mutatorInfo[id]?.text ?? ""}"><strong>${mutatorInfo[id]?.name ?? id}</strong>${mutatorInfo[id]?.text ?? ""}</li>`).join("");
    bestEl.textContent = dailyBestText(store.data, current.date);
    summaryMapEl.textContent = map?.name ?? current.mapId;
    summaryEl.textContent = `${dailyGoalText(current)}. ${record ? `Today's best: ${record.bestScore.toLocaleString()}${record.goalReached ? ", goal reached" : ""}.` : `+${DAILY.rewardFavor} Favor for the first clear.`}`;
  }

  function start() {
    const current = setup();
    const map = data.maps.find((entry: any) => entry.id === current.mapId);
    if (map) ctx.actions.startSession(map, { daily: current });
  }

  q("[data-td-daily-start]").addEventListener("click", start);

  return { render, setup, start };
}

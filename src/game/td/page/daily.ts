// Daily Trial (M19) on the page: the lobby card with today's setup and best, starting
// the trial run, and recording a finished trial for the result screen. Setup, seed and
// the save record live in ../daily.js.
import { classIconImg } from "../assets.js";
import { clearedWaves, DAILY, dailyDate, dailyRecord, dailySetup, recordDaily } from "../daily.js";
import { MUTATOR_INFO } from "../skills.js";
import type { PageContext } from "./context";
import type { SaveData } from "./save";

export type DailySetup = { date: string; seed: number; mapId: string; heroIds: string[]; mutators: string[]; goal: number };

const mutatorInfo = MUTATOR_INFO as Record<string, { name: string; text: string }>;

// Goal line shared by the lobby card and the result screen.
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
    dateEl.textContent = current.date;
    mapEl.textContent = `${map?.name ?? current.mapId} - Boss: ${ctx.bossFor(map).name}`;
    goalEl.textContent = `Goal: ${dailyGoalText(current)}. First clear today: +${DAILY.rewardFavor} Favor. Endless, Normal, no Divine Blessings or shard boosts.`;
    heroesEl.innerHTML = current.heroIds.map((id) => {
      const hero = heroById.get(id);
      return `<li class="td-daily-hero"><img src="${hero.image}" alt="" width="36" height="36" loading="lazy"><span><strong>${classIconImg(hero.class, 14)}${hero.name}</strong><small>${hero.slot === "road" ? "Road" : "Platform"} - ${hero.cost} gold</small></span></li>`;
    }).join("");
    mutatorsEl.innerHTML = current.mutators.map((id) => `<li class="td-daily-mutator"><span><strong>${mutatorInfo[id]?.name ?? id}</strong><small>${mutatorInfo[id]?.text ?? ""}</small></span></li>`).join("");
    bestEl.textContent = dailyBestText(store.data, current.date);
  }

  function start() {
    const current = setup();
    const map = data.maps.find((entry: any) => entry.id === current.mapId);
    if (map) ctx.actions.startSession(map, { daily: current });
  }

  q("[data-td-daily-start]").addEventListener("click", start);

  return { render, setup, start };
}

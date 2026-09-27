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

// Small stroke glyphs for the mutator chips on the main menu (24x24 paths).
const MUTATOR_GLYPH: Record<string, string> = {
  fortified: "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z",
  haste: "M13 3L5 13h6l-1 8 8-10h-6z",
  warded: "M3 12a9 9 0 1018 0a9 9 0 10-18 0M8 12a4 4 0 108 0a4 4 0 10-8 0",
  horde: "M4 10a2 2 0 104 0a2 2 0 10-4 0M10 7a2 2 0 104 0a2 2 0 10-4 0M16 10a2 2 0 104 0a2 2 0 10-4 0M3 18c1-3 5-3 6 0M9 15c1-3 5-3 6 0M15 18c1-3 5-3 6 0",
  ironclad: "M5 5h14v5c0 6-3 9-7 11-4-2-7-5-7-11zM5 10h14M12 5v16",
  elites: "M4 17l2-9 4 4 2-6 2 6 4-4 2 9z",
};
const mutatorChip = (id: string) => {
  const glyph = MUTATOR_GLYPH[id];
  return `<span class="td-mutator-chip" title="${mutatorInfo[id]?.text ?? ""}">` +
    (glyph ? `<svg class="td-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${glyph}" fill="none" /></svg>` : "") +
    `${mutatorInfo[id]?.name ?? id}</span>`;
};

// Time left until the next UTC midnight, when dailyDate() rolls over to a new trial.
function resetText(now = Date.now()) {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  const minutes = Math.max(1, Math.ceil((next.getTime() - now) / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

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
  const summaryMutatorsEl = q("[data-td-daily-summary-mutators]");
  const summaryRewardEl = q("[data-td-daily-summary-reward]");
  const summaryResetEl = q("[data-td-daily-summary-reset]");
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
    summaryEl.textContent = `${dailyGoalText(current)}${record ? ` \u00b7 best ${record.bestScore.toLocaleString()}` : ""}`;
    summaryMutatorsEl.innerHTML = current.mutators.map(mutatorChip).join("");
    summaryRewardEl.classList.toggle("is-claimed", !!record?.goalReached);
    summaryRewardEl.innerHTML = record?.goalReached ? "Reward claimed" : `First clear <b>+${DAILY.rewardFavor} Favor</b>`;
    renderReset();
  }

  // The reset countdown ticks once a minute; a new UTC day re-renders the whole trial.
  function renderReset() {
    summaryResetEl.textContent = ` \u00b7 resets in ${resetText()}`;
  }
  setInterval(() => {
    if (today && today.date !== dailyDate()) render();
    else renderReset();
  }, 60000);

  function start() {
    const current = setup();
    const map = data.maps.find((entry: any) => entry.id === current.mapId);
    if (map) ctx.actions.startSession(map, { daily: current });
  }

  q("[data-td-daily-start]").addEventListener("click", start);

  return { render, setup, start };
}

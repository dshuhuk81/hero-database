// Challenge goals (M20) on the page: badges on the lobby map cards, the challenge list in
// the difficulty panel, and recording a finished run (results.ts). Rules in ../challenges.js.
import { CHALLENGE_REWARD, CHALLENGES, evaluateChallenges, recordChallenges, runFacts } from "../challenges.js";
import { notifyQuest } from "../quests.js";
import { runKey, type RunTier, type SaveData } from "./save";

type ChallengeResult = { id: string; isNew: boolean; tierUp: boolean; favor: number };
export type ChallengeRun = { ids: string[]; results: ChallengeResult[]; favor: number };

const byId = new Map(CHALLENGES.map((entry) => [entry.id, entry]));

// Progress is kept per map (the Normal runKey); the value is the highest tier.
export const challengeKey = (mapId: string) => runKey(mapId, "normal");

export const challengeIcon = (id: string) =>
  `<svg class="td-challenge-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${byId.get(id)?.icon ?? ""}" /></svg>`;

const tierLabel = (tiers: any, tier: string) => tiers?.[tier]?.label ?? tier;

// Evaluates a finished run and, unless it was a debug run, stores new clears and adds their
// Favor to save.favor. The caller persists the save.
export function recordChallengeRun(save: SaveData, mapId: string, game: any, tiers: any, debug: boolean): ChallengeRun {
  const ids = evaluateChallenges(runFacts(game)) as string[];
  if (!ids.length) return { ids, results: [], favor: 0 };
  if (debug) return { ids, results: ids.map((id) => ({ id, isNew: false, tierUp: false, favor: 0 })), favor: 0 };
  const { favor, results } = recordChallenges(save.challenges, challengeKey(mapId), ids, game.tier, tiers);
  save.favor = (save.favor || 0) + favor;
  if (results.some((result: ChallengeResult) => result.isNew || result.tierUp)) notifyQuest(save, "challenge"); // R10 daily quest #5: a challenge tier clear
  return { ids, results, favor };
}

// Result screen chips: completed challenges, new clears highlighted with their Favor.
export function challengeResultHtml(run: ChallengeRun) {
  if (!run.results.length) return "";
  const chips = run.results.map((result) => {
    const entry = byId.get(result.id)!;
    const note = result.isNew ? "New" : result.tierUp ? "Higher difficulty" : "";
    const reward = result.favor ? ` +${result.favor} Favor` : "";
    return `<span class="td-achievement td-challenge-chip${note ? " is-new" : ""}">${challengeIcon(result.id)}${entry.name}` +
      (note ? `<small>${note}${reward}</small>` : "") + `</span>`;
  }).join("");
  return `<span class="td-label">Challenges completed</span><div class="td-challenge-chips">${chips}</div>`;
}

// Lobby: one badge per challenge on every map card, earned once cleared on the map.
export function renderChallengeBadges(root: HTMLElement, save: SaveData, tiers: any) {
  root.querySelectorAll<HTMLElement>("[data-map-challenges]").forEach((list) => {
    const mapId = list.dataset.mapChallenges!;
    let done = 0;
    list.querySelectorAll<HTMLElement>("[data-challenge]").forEach((badge) => {
      const id = badge.dataset.challenge!;
      const tier = save.challenges[challengeKey(mapId)]?.[id];
      if (tier) done += 1;
      badge.classList.toggle("is-earned", !!tier);
      badge.title = `${byId.get(id)!.name}: ${tier ? `done on ${tierLabel(tiers, tier)}` : "not done yet"}`;
    });
    list.querySelector<HTMLElement>("[data-challenge-summary]")!.textContent = `Challenges ${done} of ${CHALLENGES.length} done.`;
  });
}

// Difficulty panel: each challenge with its condition and whether it is done on this map.
export function renderChallengeList(el: HTMLElement, save: SaveData, mapId: string, tiers: any) {
  const status = (id: string) => {
    const tier = save.challenges[challengeKey(mapId)]?.[id] as RunTier | undefined;
    return `<span class="td-challenge-status${tier ? " is-done" : ""}">${tier ? tierLabel(tiers, tier) : "open"}</span>`;
  };
  const rows = CHALLENGES.map((entry) => `<li class="td-challenge-row" data-challenge-row="${entry.id}">${challengeIcon(entry.id)}` +
    `<span class="td-challenge-copy"><strong>${entry.name}</strong><small>${entry.text}</small></span>` +
    `<span class="td-challenge-states">${status(entry.id)}</span></li>`).join("");
  const done = CHALLENGES.filter((entry) => save.challenges[challengeKey(mapId)]?.[entry.id]).length;
  el.querySelector<HTMLElement>("[data-td-challenge-count]")!.textContent = `${done} of ${CHALLENGES.length}`;
  el.querySelector<HTMLElement>("[data-td-challenge-list]")!.innerHTML = rows;
  el.querySelector<HTMLElement>("[data-td-challenge-reward]")!.textContent =
    `Optional goals, checked when you win. Each first clear pays ${CHALLENGE_REWARD} Favor, more on Heroic and Mythic; clearing it later on a higher difficulty pays the difference.`;
}

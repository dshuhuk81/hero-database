// Challenge goals (M20) on the page: badges on the lobby map cards, the challenge list in
// the run length panel, and recording a finished run (results.ts). Rules in ../challenges.js.
import { CHALLENGE_MODES, CHALLENGE_REWARD, CHALLENGES, evaluateChallenges, recordChallenges, runFacts } from "../challenges.js";
import { runKey, type RunMode, type RunTier, type SaveData } from "./save";

type ChallengeResult = { id: string; isNew: boolean; tierUp: boolean; favor: number };
export type ChallengeRun = { ids: string[]; results: ChallengeResult[]; favor: number };

const MODE_LABEL: Record<string, string> = { classic: "10 waves", long: "20 waves" };
const byId = new Map(CHALLENGES.map((entry) => [entry.id, entry]));

// Progress is kept per map and run length (the Normal runKey); the value is the highest tier.
export const challengeKey = (mapId: string, mode: RunMode) => runKey(mapId, mode, "normal");

export const challengeIcon = (id: string) =>
  `<svg class="td-challenge-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${byId.get(id)?.icon ?? ""}" /></svg>`;

const tierLabel = (tiers: any, tier: string) => tiers?.[tier]?.label ?? tier;

// Evaluates a finished run and, unless it was a debug run, stores new clears and adds their
// Favor to save.favor. The caller persists the save.
export function recordChallengeRun(save: SaveData, mapId: string, game: any, tiers: any, debug: boolean): ChallengeRun {
  const ids = evaluateChallenges(runFacts(game)) as string[];
  if (!ids.length) return { ids, results: [], favor: 0 };
  if (debug) return { ids, results: ids.map((id) => ({ id, isNew: false, tierUp: false, favor: 0 })), favor: 0 };
  const { favor, results } = recordChallenges(save.challenges, challengeKey(mapId, game.mode), ids, game.mode, game.tier, tiers);
  save.favor = (save.favor || 0) + favor;
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

// Lobby: one badge per challenge on every map card. Earned when cleared on 10 or 20 waves,
// "both" when cleared on both.
export function renderChallengeBadges(root: HTMLElement, save: SaveData, tiers: any) {
  root.querySelectorAll<HTMLElement>("[data-map-challenges]").forEach((list) => {
    const mapId = list.dataset.mapChallenges!;
    let done = 0;
    list.querySelectorAll<HTMLElement>("[data-challenge]").forEach((badge) => {
      const id = badge.dataset.challenge!;
      const cleared = CHALLENGE_MODES.filter((mode) => save.challenges[challengeKey(mapId, mode as RunMode)]?.[id]);
      done += cleared.length;
      badge.classList.toggle("is-earned", cleared.length > 0);
      badge.classList.toggle("is-both", cleared.length === CHALLENGE_MODES.length);
      const where = cleared.map((mode) => `${MODE_LABEL[mode]} (${tierLabel(tiers, save.challenges[challengeKey(mapId, mode as RunMode)][id])})`).join(", ");
      badge.title = `${byId.get(id)!.name}: ${where ? `done on ${where}` : "not done yet"}`;
    });
    const total = CHALLENGES.length * CHALLENGE_MODES.length;
    list.querySelector<HTMLElement>("[data-challenge-summary]")!.textContent = `Challenges ${done} of ${total} done.`;
  });
}

// Run length panel: each challenge with its condition and where it is done on this map.
export function renderChallengeList(el: HTMLElement, save: SaveData, mapId: string, tiers: any) {
  const status = (id: string, mode: RunMode) => {
    const tier = save.challenges[challengeKey(mapId, mode)]?.[id] as RunTier | undefined;
    return `<span class="td-challenge-status${tier ? " is-done" : ""}">${MODE_LABEL[mode]}: ${tier ? tierLabel(tiers, tier) : "open"}</span>`;
  };
  const rows = CHALLENGES.map((entry) => `<li class="td-challenge-row" data-challenge-row="${entry.id}">${challengeIcon(entry.id)}` +
    `<span class="td-challenge-copy"><strong>${entry.name}</strong><small>${entry.text}</small></span>` +
    `<span class="td-challenge-states">${status(entry.id, "classic")}${status(entry.id, "long")}</span></li>`).join("");
  const done = CHALLENGES.reduce((sum, entry) => sum + CHALLENGE_MODES.filter((mode) => save.challenges[challengeKey(mapId, mode as RunMode)]?.[entry.id]).length, 0);
  el.querySelector<HTMLElement>("[data-td-challenge-count]")!.textContent = `${done} of ${CHALLENGES.length * CHALLENGE_MODES.length}`;
  el.querySelector<HTMLElement>("[data-td-challenge-list]")!.innerHTML = rows;
  el.querySelector<HTMLElement>("[data-td-challenge-reward]")!.textContent =
    `Optional goals for 10 and 20 wave runs, checked when you win. Each first clear pays ${CHALLENGE_REWARD.classic} Favor (${CHALLENGE_REWARD.long} on 20 waves), more on Heroic and Mythic; clearing it later on a higher difficulty pays the difference.`;
}

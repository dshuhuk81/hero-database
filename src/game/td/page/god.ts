// God Challenge on the page: its screen on the home rail, the home summary, picking a squad and
// starting the run, and recording a finished run for the result screen. The rules and the arena
// live in ../god-mode.js (data: tdGodMode.json).
import { godChallenge, godChallenges, godMapFor } from "../god-mode.js";
import type { PageContext } from "./context";
import type { SaveData } from "./save";

export type GodRun = { challengeId: string; squadRows: [string[], string[]] };

const challengeOf = (id: string) => godChallenge(id) ?? godChallenges[0];

// The best total damage so far, one line for the screen and the result.
export const godBestText = (save: SaveData, challengeId: string) => {
  const best = save.godBest?.[challengeId] ?? 0;
  return best ? `Best: ${best.toLocaleString()} damage.` : "No run yet.";
};

// Records a finished run (skipped for debug runs) and returns the result screen line.
export function finishGod(save: SaveData, game: any, run: GodRun, record: boolean) {
  const score = Math.round(game.godDamage ?? game.score ?? 0);
  const previous = save.godBest?.[run.challengeId] ?? 0;
  const record_ = record && score > previous;
  if (record_) save.godBest = { ...save.godBest, [run.challengeId]: score };
  const fallen = game.fallenHeroes?.length ?? 0;
  const text = `${score.toLocaleString()} damage in ${Math.round(game.runDuration || game.time)} seconds${fallen ? `, ${fallen} ${fallen === 1 ? "hero" : "heroes"} fell` : ""}. ${record_ ? "New best!" : godBestText(save, run.challengeId)}`;
  return { score, newBest: record_, text };
}

export function createGod(ctx: PageContext, deps: { openSquad(onStart: (rows: [string[], string[]]) => void): void }) {
  const { q, store } = ctx;
  const challenge = challengeOf(godChallenges[0].id);

  function render() {
    q("[data-td-god-name]").textContent = challenge.name;
    q("[data-td-god-subtitle]").textContent = challenge.title;
    q("[data-td-god-goal]").innerHTML = `Deal as much damage as you can in <strong>${challenge.seconds} seconds</strong>.`;
    q("[data-td-god-rules]").innerHTML = [
      "The god cannot be defeated",
      "Score is your total damage",
      "Its strikes can make heroes fall",
    ].map((rule) => `<li>${rule}</li>`).join("");
    q("[data-td-god-arena]").textContent = "Melee heroes stand on the front row and reach the god's cells with their patterns. Ranged heroes use the side platforms and the raised gallery, whose high ground reaches one step further. Move heroes out of the marked tiles before a strike lands.";
    q("[data-td-god-best]").textContent = godBestText(store.data, challenge.id);
  }

  function homeSummary() {
    return { bossName: challenge.name as string, best: store.data.godBest?.[challenge.id] ?? 0 };
  }

  function start() {
    deps.openSquad((rows) => ctx.actions.startSession(godMapFor(challenge), { god: { challengeId: challenge.id, squadRows: rows } }));
  }

  q("[data-td-god-start]").addEventListener("click", start);

  return { render, homeSummary, start };
}

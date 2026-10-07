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

  let selectedId: string = challenge.id;

  function render() {
    const current = challengeOf(selectedId);
    const best = store.data.godBest?.[current.id] ?? 0;
    const milestones: number[] = current.milestones ?? [];
    q("[data-td-god-tabs]").innerHTML = godChallenges.map((c: any) =>
      `<button class="td-god-tab" type="button" role="tab" aria-selected="${c.id === current.id}" data-td-god-tab="${c.id}"><img src="/td/god-mode/${c.id}/${c.id}-icon-v1.webp" alt="" width="24" height="24" /><span><strong>${c.name}</strong><small>${c.title}</small></span></button>`).join("");
    q("[data-td-god-backdrop]").style.setProperty("--td-god-art", `url("/td/god-mode/${current.id}/${current.id}-select-bg-v1.webp")`);
    q("[data-td-god-name]").textContent = current.name;
    q("[data-td-god-subtitle]").textContent = current.title;
    q("[data-td-god-goal]").innerHTML = `Deal as much damage as you can in <strong>${current.seconds} seconds</strong>.`;
    q("[data-td-god-rules]").innerHTML = [
      "The god cannot be defeated",
      "Its strikes can make heroes fall",
    ].map((rule) => `<li>${rule}</li>`).join("");
    q("[data-td-god-best-value]").textContent = best.toLocaleString();
    // Score ladder: highest tier on top; a tier is reached once the best damage passes it.
    q("[data-td-god-ladder]").innerHTML = milestones.map((need, i) => ({ need, tier: i + 1, prev: milestones[i - 1] ?? 0 })).reverse().map(({ need, tier, prev }) => {
      const fill = Math.max(0, Math.min(1, (best - prev) / (need - prev)));
      return `<li class="td-god-tier${best >= need ? " is-reached" : ""}" style="--fill:${(fill * 100).toFixed(1)}%"><span>Tier ${tier}</span><strong>${need.toLocaleString()}</strong><i aria-hidden="true"></i></li>`;
    }).join("");
  }

  function homeSummary() {
    return { bossName: challenge.name as string, best: store.data.godBest?.[challenge.id] ?? 0 };
  }

  function start() {
    deps.openSquad((rows) => ctx.actions.startSession(godMapFor(challengeOf(selectedId)), { god: { challengeId: selectedId, squadRows: rows } }));
  }

  q("[data-td-god-start]").addEventListener("click", start);
  q("[data-td-god-tabs]").addEventListener("click", (event) => {
    const tab = (event.target as HTMLElement).closest<HTMLElement>("[data-td-god-tab]");
    if (!tab || tab.dataset.tdGodTab === selectedId) return;
    selectedId = tab.dataset.tdGodTab!;
    render();
  });

  return { render, homeSummary, start };
}

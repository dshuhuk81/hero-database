// Results screen: records the finished run (unless it was a debug run) and fills
// the summary, stats, comparison with the last run, achievements and Favor.
import { computeFavor } from "../favor.js";
import type { PageContext } from "./context";

export function fmtDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

export function createResults(ctx: PageContext) {
  const { q, data, store, blessingNames, totalWaves } = ctx;
  const resultEl = q("[data-td-result]");

  function reset() {
    resultEl.hidden = true;
    for (const selector of ["[data-td-result-stats]", "[data-td-result-compare]", "[data-td-result-achievements]", "[data-td-result-favor]"]) q(selector).hidden = true;
  }

  function finishRun() {
    const session = ctx.getSession();
    if (!session) return;
    const game = session.game;
    const map = session.map;
    const saved = store.data;
    const earnedFavor = computeFavor({ waves: game.wave, perfectWaves: session.perfectWaves, bossKilled: !!game.won, livesLeft: game.lives }, data.tuning);
    const prevRun = saved.mapBests[map.id] || null;
    // Debug runs (changed knobs, jumps, forced results) never touch saved progress.
    if (!session.debug) {
      if (game.perfect) saved.perfectDefense = true;
      saved.bestScore = Math.max(saved.bestScore, game.score);
      saved.bestWave = Math.max(saved.bestWave, game.wave);
      saved.favor = (saved.favor || 0) + earnedFavor;
      saved.mapBests[map.id] = { score: game.score ?? 0, wave: game.wave ?? 0, duration: Math.round(game.runDuration ?? 0), lives: game.lives ?? 0, leaks: game.totalLeaks ?? 0 };
      const top = saved.mapTop[map.id];
      if (!top || game.score > top.score) saved.mapTop[map.id] = { score: game.score, wave: game.wave };
      store.persist();
    }

    ctx.actions.closePopover(false);
    ctx.actions.closeSheet(false);
    ctx.actions.cancelDeploy();
    q("[data-td-result-kicker]").textContent = game.perfect ? "Perfect defense" : game.won ? "Victory" : "Defense broken";
    q("[data-td-result-title]").textContent = game.won ? `${map.name} secured` : `${map.name} fell`;
    q("[data-td-result-copy]").textContent = game.perfect
      ? `${game.score.toLocaleString()} points - all ${totalWaves} waves - ${game.lives} lives left - not a single enemy broke through`
      : `${game.score.toLocaleString()} points - wave ${game.wave} - ${game.lives} lives left - ${game.totalLeaks} leaks`;

    const kills = Object.values(game.heroKills ?? {}) as { name: string; kills: number }[];
    kills.sort((a, b) => b.kills - a.kills);
    const mvp = kills[0] ?? null;
    const bestVirtueName = game.activePairs?.length ? game.activePairs[0].name : (game.virtues.length ? (blessingNames[game.virtues[0]] ?? game.virtues[0]) : null);
    const statsEl = q("[data-td-result-stats]");
    statsEl.innerHTML = [
      mvp ? `<div class="td-result-stat"><span>MVP</span><strong>${mvp.name}</strong><small>${mvp.kills} kills</small></div>` : "",
      `<div class="td-result-stat"><span>Duration</span><strong>${fmtDuration(game.runDuration ?? 0)}</strong></div>`,
      `<div class="td-result-stat"><span>Gold left</span><strong>${game.gold}</strong><small>of ~${Math.round((game.totalGoldEarned ?? 0) + game.tuning.run.startingGold)} earned</small></div>`,
      `<div class="td-result-stat"><span>Spent</span><strong>${game.totalGoldSpent ?? 0}</strong></div>`,
      bestVirtueName ? `<div class="td-result-stat"><span>Best blessing</span><strong>${bestVirtueName}</strong></div>` : "",
    ].join("");
    statsEl.hidden = false;

    const compareEl = q("[data-td-result-compare]");
    if (prevRun) {
      const improvements: string[] = [];
      if (game.score > prevRun.score) improvements.push(`higher score (+${(game.score - prevRun.score).toLocaleString()})`);
      if (game.lives > prevRun.lives) improvements.push(`more lives left (+${game.lives - prevRun.lives})`);
      if (game.totalLeaks < prevRun.leaks) improvements.push(`fewer leaks (-${prevRun.leaks - game.totalLeaks})`);
      if (game.won && (prevRun.duration ?? 0) > 0 && game.runDuration < prevRun.duration) improvements.push(`faster run (-${fmtDuration(prevRun.duration - game.runDuration)})`);
      if (improvements.length) { compareEl.textContent = `Better than last time: ${improvements.join(", ")}.`; compareEl.hidden = false; }
    }

    const earned: string[] = [];
    if (game.perfect) earned.push("Perfect Defense");
    if (game.won && game.gold >= 150) earned.push("Hoarder");
    if (game.won && game.runDuration <= 300) earned.push("Speed Run");
    const achieveEl = q("[data-td-result-achievements]");
    if (earned.length) { achieveEl.innerHTML = earned.map((name) => `<span class="td-achievement">${name}</span>`).join(""); achieveEl.hidden = false; }

    const favorEl = q("[data-td-result-favor]");
    favorEl.textContent = session.debug
      ? "Debug run: score, bests and Favor were not recorded."
      : `+${earnedFavor} Divine Favor earned. Total: ${saved.favor} Favor.`;
    favorEl.hidden = false;
    ctx.actions.syncSpendButton();
    resultEl.hidden = false;
    resultEl.scrollTop = 0;
    q<HTMLButtonElement>("[data-td-retry]").focus({ preventScroll: true });
  }

  return { finishRun, reset };
}

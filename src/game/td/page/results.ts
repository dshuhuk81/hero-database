// Results screen: records the finished run (unless it was a debug run) and fills
// the summary, stats, comparison with the last run, achievements and Favor.
import { computeFavor, shardEligible, shardFavor } from "../favor.js";
import type { PageContext } from "./context";
import { availableFavor, type RunBoost } from "./save";

type ShardChoice = "favor" | "gold" | "virtue";

export function fmtDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

export function createResults(ctx: PageContext) {
  const { q, data, store, blessingNames, totalWaves } = ctx;
  const resultEl = q("[data-td-result]");
  const shardsEl = q("[data-td-result-shards]");
  // Run-end shard (6C). The Favor shard is granted with the run's Favor so nothing
  // is lost if the page closes; picking a boost converts it back.
  let shard: { favor: number; earned: number; virtue: string; choice: ShardChoice; previousBoost: RunBoost | null } | null = null;

  function reset() {
    resultEl.hidden = true;
    shard = null;
    for (const selector of ["[data-td-result-stats]", "[data-td-result-compare]", "[data-td-result-achievements]", "[data-td-result-favor]", "[data-td-result-shards]"]) q(selector).hidden = true;
  }

  const boostText = (boost: RunBoost) => boost.type === "gold"
    ? `+${boost.gold} starting gold` : `start with ${blessingNames[boost.virtue] ?? boost.virtue}`;

  function renderFavorLine() {
    const favorEl = q("[data-td-result-favor]");
    const total = store.data.favor;
    const shardText = shard?.choice === "favor" ? ` plus ${shard.favor} from the Favor shard` : "";
    favorEl.textContent = `+${shard?.earned ?? 0} Divine Favor earned${shardText}. Total: ${total} Favor.`;
  }

  function renderShards() {
    if (!shard) return;
    const cfg = data.tuning.shards;
    const virtueName = blessingNames[shard.virtue] ?? shard.virtue;
    const virtueLabel = data.tuning.virtueEffects[shard.virtue]?.label ?? "";
    // Taking a boost gives the Favor shard back; blocked if it was already spent.
    const canRevoke = shard.choice !== "favor" || availableFavor(store.data, data.favorTree || []) >= shard.favor;
    const options: { id: ShardChoice; name: string; value: string; detail: string }[] = [
      { id: "favor", name: "Favor shard", value: `+${shard.favor} Favor`, detail: "Permanent. Spend it on Divine Blessings." },
      { id: "gold", name: "Gold shard", value: `+${cfg.gold} gold`, detail: "Your next run starts with extra gold." },
      { id: "virtue", name: "Virtue shard", value: virtueName, detail: `Your next run starts with this blessing${virtueLabel ? `: ${virtueLabel}` : "."}` },
    ];
    const replaces = shard.previousBoost ? `<p class="td-shard-note">A Gold or Virtue shard replaces your pending boost (${boostText(shard.previousBoost)}).</p>` : "";
    shardsEl.innerHTML = `<span class="td-label">Pick a shard</span><div class="td-shard-row">` + options.map((option) => {
      const chosen = shard!.choice === option.id;
      const disabled = !chosen && option.id !== "favor" && !canRevoke;
      return `<button class="td-shard${chosen ? " is-chosen" : ""}" type="button" data-shard="${option.id}" aria-pressed="${chosen}"${disabled ? " disabled" : ""}>` +
        `<span class="td-shard-name">${option.name}</span><strong>${option.value}</strong><small>${option.detail}</small></button>`;
    }).join("") + `</div>` + replaces +
      (canRevoke ? "" : `<p class="td-shard-note">The Favor shard is already spent, so it stays your pick.</p>`);
    shardsEl.hidden = false;
  }

  function choose(choice: ShardChoice) {
    if (!shard || choice === shard.choice) return;
    const saved = store.data;
    if (shard.choice === "favor") {
      if (availableFavor(saved, data.favorTree || []) < shard.favor) return;
      saved.favor -= shard.favor;
    }
    if (choice === "favor") {
      saved.favor += shard.favor;
      saved.nextRunBoost = shard.previousBoost;
    } else {
      saved.nextRunBoost = choice === "gold" ? { type: "gold", gold: data.tuning.shards.gold } : { type: "virtue", virtue: shard.virtue };
    }
    shard.choice = choice;
    store.persist();
    renderShards();
    renderFavorLine();
    ctx.actions.syncSpendButton();
    ctx.actions.renderLobby();
    q<HTMLButtonElement>(`[data-shard="${choice}"]`).focus({ preventScroll: true });
  }

  shardsEl.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-shard]");
    if (button && !button.disabled) choose(button.dataset.shard as ShardChoice);
  });

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
      if (shardEligible(game.wave, data.tuning)) {
        const virtues = Object.keys(data.tuning.virtueEffects || {});
        shard = { favor: shardFavor(earnedFavor, data.tuning), earned: earnedFavor, virtue: virtues[Math.floor(Math.random() * virtues.length)], choice: "favor", previousBoost: saved.nextRunBoost };
        saved.favor += shard.favor;
      }
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
      game.tuning.quests ? `<div class="td-result-stat"><span>Quests</span><strong>${game.questsDone ?? 0}</strong><small>completed</small></div>` : "",
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
    if (session.debug) favorEl.textContent = "Debug run: score, bests and Favor were not recorded.";
    else if (shard) { renderFavorLine(); renderShards(); }
    else favorEl.textContent = `+${earnedFavor} Divine Favor earned. Total: ${saved.favor} Favor.` +
      (data.tuning.shards ? ` Reach wave ${data.tuning.shards.minWave} to earn a shard.` : "");
    favorEl.hidden = false;
    ctx.actions.syncSpendButton();
    resultEl.hidden = false;
    resultEl.scrollTop = 0;
    q<HTMLButtonElement>("[data-td-retry]").focus({ preventScroll: true });
  }

  return { finishRun, reset };
}

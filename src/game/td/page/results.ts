// Results screen: records the finished run (unless it was a debug run) and fills
// the summary, stats, comparison with the last run, achievements and Favor.
import { computeFavor, computeInsight, shardEligible, shardFavor } from "../favor.js";
import { shownLives } from "../board.js";

// Insight earned per class this run (Divine Blessings class branches).
// Reactions triggered this run (M13), most frequent first.
function reactionStat(counts: Record<string, number> = {}) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "";
  const names = REACTION_INFO as Record<string, { name: string }>;
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  return `<div class="td-result-stat"><span>Reactions</span><strong>${total}</strong><small>${entries.map(([id, n]) => `${names[id]?.name ?? id} ${n}`).join(", ")}</small></div>`;
}

// Per-hero damage table (M14): damage and its share, boss damage, kills, and healing plus
// aura contribution for Supports.
function damageTable(heroStats: Record<string, any>) {
  const rows = damageRows(heroStats);
  if (!rows.length) return "";
  const body = rows.map((row: any) => {
    const support = row.heal + row.buff;
    return `<tr><th scope="row">${row.name}</th>` +
      `<td><span class="td-dmg-bar" data-share="${Math.round(row.share * 100)}"></span>${shortNumber(row.damage)} <small>${Math.round(row.share * 100)}%</small></td>` +
      `<td>${row.boss ? shortNumber(row.boss) : "-"}</td><td>${row.kills}</td><td>${support ? shortNumber(support) : "-"}</td></tr>`;
  }).join("");
  return `<table><caption>Damage by hero</caption><thead><tr><th scope="col">Hero</th><th scope="col">Damage</th><th scope="col">Boss</th><th scope="col">Kills</th><th scope="col" title="Healing done plus the attack its aura added to allies">Support</th></tr></thead><tbody>${body}</tbody></table>`;
}

function insightStat(earned: Record<string, number>) {
  const entries = Object.entries(earned).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "";
  const total = entries.reduce((sum, [, points]) => sum + points, 0);
  return `<div class="td-result-stat"><span>Insight</span><strong>+${total}</strong><small>${entries.map(([cls, points]) => `${cls} +${points}`).join(", ")}</small></div>`;
}
import type { PageContext } from "./context";
import { REACTION_INFO } from "../skills.js";
import { damageRows, lossReport, shortNumber } from "../ui.js";
import { type CampaignProgress } from "./save";
import { finishDaily } from "./daily";
import { defeatedCount } from "../daily.js";
import { collectionReward, grantRewards, laurelLives } from "../campaign.js";
import { currencyList } from "../currency-icons.js";
import campaignData from "../../../data/tdCampaign.json" with { type: "json" };
import { finishExpeditionStage } from "./expedition";
import { finishCampaignRun } from "./campaign";
import { notifyQuest } from "../quests.js";
import { createStageClear } from "./stage-clear";

export function fmtDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

export function createResults(ctx: PageContext) {
  const { q, data, store } = ctx;
  const resultEl = q("[data-td-result]");
  const playEl = q("[data-td-play]");
  const statsButton = q<HTMLButtonElement>("[data-td-result-stats-toggle]");
  const lossStatsButton = q<HTMLButtonElement>("[data-td-loss-stats-toggle]");
  const lossStatsEl = q("[data-td-loss-stats]");
  const retryButton = q<HTMLButtonElement>("[data-td-result-retry]");
  const lossRetryButton = q<HTMLButtonElement>("[data-td-loss-retry]");
  const lossCloseButton = q<HTMLButtonElement>("[data-td-loss-close]");
  // Button the final Stage Clear scene focuses (Continue or Retry).
  let primaryAction: HTMLButtonElement | null = null;
  const stageClear = createStageClear(ctx, () => primaryAction?.focus({ preventScroll: true }));
  // Run-end Favor shard (6C), granted with the run's Favor so nothing is lost if the page closes.
  let shard: { favor: number } | null = null;
  // Favor this run paid, by source, so the summary adds up to what the save gained.
  let rewards: { label: string; favor: number }[] = [];
  // Gold and Hero XP this run paid into the hero collection (Daily Trial, Expedition).
  let collectionHtml = "";

  // Summary / Battle tabs (narrow screens; wide screens show both columns).
  const tabs = [...resultEl.querySelectorAll<HTMLButtonElement>("[data-td-result-tab]")];
  function showTab(id: string, focus = false) {
    for (const tab of tabs) {
      const active = tab.dataset.tdResultTab === id;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus({ preventScroll: true });
    }
    for (const panel of resultEl.querySelectorAll<HTMLElement>("[data-td-result-panel]")) {
      panel.classList.toggle("is-active", panel.dataset.tdResultPanel === id);
      panel.scrollTop = 0;
    }
  }
  resultEl.querySelector("[role=tablist]")?.addEventListener("click", (event) => {
    const tab = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-td-result-tab]");
    if (tab) showTab(tab.dataset.tdResultTab!);
  });
  resultEl.querySelector("[role=tablist]")?.addEventListener("keydown", (event) => {
    const key = (event as KeyboardEvent).key;
    if (key !== "ArrowLeft" && key !== "ArrowRight") return;
    const current = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    const next = tabs[(current + (key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    showTab(next.dataset.tdResultTab!, true);
    event.preventDefault();
  });

  // Stats (cleared stages): back to Hero contribution; pressed again it returns to Rewards.
  statsButton.addEventListener("click", () => {
    const toStats = resultEl.dataset.scene !== "performance";
    stageClear.showScene(toStats ? "performance" : "rewards");
    statsButton.setAttribute("aria-pressed", String(toStats));
    statsButton.textContent = toStats ? "Back" : "Stats";
    statsButton.focus({ preventScroll: true });
  });

  // The loss footer keeps the reference screen's Stats shortcut. It toggles a compact run
  // report without the damage/DPS table, while the rest of the loss navigation stays put.
  lossStatsButton.addEventListener("click", () => {
    const showStats = resultEl.dataset.lossPage !== "stats";
    resultEl.dataset.lossPage = showStats ? "stats" : "advice";
    resultEl.setAttribute("aria-labelledby", showStats ? "td-loss-stats-title" : "td-loss-title");
    lossStatsButton.setAttribute("aria-pressed", String(showStats));
    lossStatsButton.focus({ preventScroll: true });
  });

  function reset() {
    stageClear.stop();
    resultEl.hidden = true;
    playEl.classList.remove("is-result-open");
    resultEl.dataset.view = "report";
    delete resultEl.dataset.scene;
    delete resultEl.dataset.final;
    delete resultEl.dataset.fromDefeat;
    resultEl.dataset.lossPage = "advice";
    resultEl.setAttribute("aria-labelledby", "td-result-title");
    statsButton.hidden = true;
    statsButton.setAttribute("aria-pressed", "false");
    statsButton.textContent = "Stats";
    lossStatsButton.setAttribute("aria-pressed", "false");
    shard = null;
    rewards = [];
    collectionHtml = "";
    showTab("summary");
    for (const selector of ["[data-td-result-stats]", "[data-td-result-analysis]", "[data-td-result-damage]", "[data-td-result-favor]", "[data-td-result-battle-empty]"]) q(selector).hidden = true;
  }

  function renderAnalysis(game: any) {
    const el = q("[data-td-result-analysis]");
    const report = !game.won ? lossReport(game.stageStats) : null;
    el.hidden = !report;
    if (!report) return;
    el.innerHTML = `<strong>What went wrong</strong><p>${Math.round(report.share * 100)}% of the lives lost (${shownLives(report.lives, game.lifeUnit)} of ${shownLives(report.total, game.lifeUnit)}) went to ${report.name}.</p><p>${report.hint}</p>`;
  }

  function renderDamage(game: any) {
    const el = q("[data-td-result-damage]");
    el.innerHTML = damageTable(game.heroStats ?? {});
    for (const bar of el.querySelectorAll<HTMLElement>("[data-share]")) bar.style.setProperty("--share", `${bar.dataset.share}%`);
    el.hidden = !el.innerHTML;
  }

  // Favor summary: headline total, one chip per source (run, Daily or Expedition bonus, Favor
  // shard) and the new balance.
  function renderFavorLine(note = "") {
    const favorEl = q("[data-td-result-favor]");
    const parts = [...rewards];
    if (shard) parts.push({ label: "Favor shard", favor: shard.favor });
    const earned = parts.reduce((sum, part) => sum + part.favor, 0);
    const chips = parts.filter((part) => part.favor > 0 || part === parts[0])
      .map((part) => `<li><span>${part.label}</span><strong>+${part.favor}</strong></li>`).join("");
    favorEl.innerHTML = `<div class="td-result-favor-head"><span class="td-label">Divine Favor</span><strong>+${earned}</strong><small>Total ${store.data.favor}</small></div>` +
      `<ul class="td-result-favor-parts">${chips}</ul>` + collectionHtml + (note ? `<p class="td-result-favor-note">${note}</p>` : "");
  }

  function finishRun() {
    const session = ctx.getSession();
    if (!session) return;
    const game = session.game;
    const map = session.map;
    const saved = store.data;
    // Heroic and Mythic pay more Favor (tuning.tiers, M3).
    // Daily Trial mutators (M15) pay their Favor share of the stage extra.
    const tierFavor = data.tuning.tiers?.[game.tier]?.favor ?? 1;
    const forecast = game.stageForecast();
    const stageShare = game.won ? 1 : forecast ? forecast.down / forecast.total : 0; // part of the stage's enemies defeated
    const mutatorShare = (game.mutators ?? []).reduce((sum: number, id: string) => sum + (data.tuning.mutators?.pool?.[id]?.favor ?? 0), 0);
    const mutatorFavor = Math.round(stageShare * data.tuning.favorEarn.perStage * mutatorShare);
    // Campaign stages (M26) have their own progression: no Favor, Insight or shard.
    const campaign = session.campaign;
    const earnedFavor = campaign ? 0 : Math.round((computeFavor({ share: stageShare, perfect: !!game.perfect, bossKilled: !!game.won, livesLeft: game.lives }, data.tuning) + mutatorFavor) * tierFavor);
    const earnedInsight = (session.debug || campaign ? {} : computeInsight(game.insightLog)) as Record<string, number>;
    // Daily Trial (M19) runs keep their own per-day record.
    const daily = session.daily;
    const expedition = session.expedition;
    const dailyRun = daily ? finishDaily(saved, game, daily, !session.debug)
      : expedition ? { ...finishExpeditionStage(saved, game, expedition, data, !session.debug), reached: game.won }
      : campaign ? (({ text, won, followUp, paid, laurels, heroXp }) => ({ text, reached: won, reward: 0, followUp, paid, laurels, heroXp }))(finishCampaignRun(saved, game, campaign, (id) => ctx.heroById.get(id)?.name ?? id, !session.debug)) : null;
    // The Daily Trial and Expedition pay a share of Gold and Hero XP into the collection (Phase 2).
    const collection = campaign || session.debug ? [] : collectionReward(campaignData, defeatedCount(game));
    if (collection.length) {
      saved.campaign = grantRewards(saved.campaign, collection) as CampaignProgress;
      collectionHtml = `<p class="td-result-collection"><span class="td-label">For your heroes</span>${currencyList(Object.fromEntries(collection.map((reward: any) => [reward.id, reward.amount])), { plus: true })}</p>`;
    }
    // Debug runs (changed knobs, jumps, forced results) never touch saved progress.
    if (!session.debug) {
      // R10 daily quest #9: a run that cast a Divine Intervention. The campaign clears (#1, #2)
      // report in finishCampaignRun.
      if ((game.interventionsUsed ?? 0) > 0) notifyQuest(saved, "intervention");
      if (game.perfect) saved.perfectDefense = true;
      saved.favor = (saved.favor || 0) + earnedFavor;
      for (const [cls, points] of Object.entries(earnedInsight)) saved.insight[cls] = (saved.insight[cls] || 0) + points;
      if (shardEligible(stageShare, data.tuning) && !campaign) {
        shard = { favor: shardFavor(earnedFavor, data.tuning) };
        saved.favor += shard.favor;
      }
      store.persist();
    }

    ctx.actions.closePopover(false);
    ctx.actions.closeSheet(false);
    ctx.actions.cancelDeploy();
    // Header: outcome, then where and how (Daily / Expedition / Campaign stage, tier), then score.
    // An Expedition stage is final (M21): no Retry; Continue leads back to the camp or the menu.
    retryButton.hidden = !!expedition;
    lossRetryButton.hidden = !!expedition;
    const continueButton = q<HTMLButtonElement>("[data-td-result-continue]");
    continueButton.hidden = !expedition && !campaign;
    continueButton.dataset.tdToLobby = campaign ? "stages" : "expedition";
    // Campaign: after a loss go straight to this stage's squad, after a win to the next stage's.
    const followUp: string | null = campaign ? (dailyRun as any)?.followUp ?? null : null;
    if (followUp) continueButton.dataset.tdCampStage = followUp; else delete continueButton.dataset.tdCampStage;
    continueButton.textContent = expedition && (dailyRun as any)?.outcome === "camp" ? "Continue to camp"
      : campaign ? (!followUp ? "Campaign" : game.won ? `Next: stage ${followUp}` : "Change squad") : "Continue";
    // One primary action: Retry steps back when Continue leads on.
    retryButton.classList.toggle("action-button--primary", continueButton.hidden);
    retryButton.classList.toggle("action-button--quiet", !continueButton.hidden);
    // Campaign stages lead back to the stage list instead of the main menu.
    const menuButton = q<HTMLButtonElement>("[data-td-result-menu]");
    menuButton.hidden = !!expedition || (!!campaign && !followUp);
    menuButton.dataset.tdToLobby = campaign ? "stages" : "home";
    menuButton.textContent = campaign ? "Campaign" : "Back to Camp";
    const outcome = game.won ? "won" : "lost";
    resultEl.dataset.outcome = outcome;
    q("[data-td-result-kicker]").textContent = game.perfect ? "Perfect defense" : game.won ? "Victory" : "Defense broken";
    const tierName = data.tuning.tiers?.[game.tier]?.label ?? game.tier;
    const context = daily ? `Daily Trial ${daily.date}`
      : expedition ? `Expedition stage ${expedition.stage + 1} of ${expedition.stages.length}`
      : campaign ? `Campaign stage ${campaign.stageId}`
      : "";
    q("[data-td-result-meta]").textContent = [context, game.tier !== "normal" ? tierName : ""].filter(Boolean).join(" - ");
    const dailyEl = q("[data-td-result-daily]");
    dailyEl.hidden = !dailyRun;
    dailyEl.textContent = dailyRun?.text ?? "";
    dailyEl.classList.toggle("is-reached", !!dailyRun?.reached);
    q("[data-td-result-title]").textContent = game.won ? `${map.name} secured` : `${map.name} fell`;
    q("[data-td-defeat-map]").textContent = `${map.name} fell`;
    q("[data-td-defeat-context]").textContent = context;
    q("[data-td-result-score]").textContent = `${game.score.toLocaleString()} points`;
    q("[data-td-result-copy]").textContent = game.perfect
      ? `All ${forecast?.total ?? 0} enemies defeated, ${shownLives(game.lives, game.lifeUnit)} lives left, not a single enemy broke through`
      : `${forecast?.down ?? 0} of ${forecast?.total ?? 0} enemies defeated, ${shownLives(game.lives, game.lifeUnit)} ${shownLives(game.lives, game.lifeUnit) === 1 ? "life" : "lives"} left, ${game.totalLeaks} ${game.totalLeaks === 1 ? "leak" : "leaks"}`;

    const kills = Object.values(game.heroKills ?? {}) as { name: string; kills: number }[];
    kills.sort((a, b) => b.kills - a.kills);
    const mvp = kills[0] ?? null;
    const statsEl = q("[data-td-result-stats]");
    const statsHtml = [
      mvp ? `<div class="td-result-stat"><span>MVP</span><strong>${mvp.name}</strong><small>${mvp.kills} kills</small></div>` : "",
      `<div class="td-result-stat"><span>Duration</span><strong>${fmtDuration(game.runDuration ?? 0)}</strong></div>`,
      `<div class="td-result-stat"><span>Placement left</span><strong>${Math.floor(game.placement)}</strong><small>of ~${Math.round((game.totalPlacementEarned ?? 0) + game.tuning.run.startingPlacement)} earned</small></div>`,
      `<div class="td-result-stat"><span>Spent</span><strong>${game.totalPlacementSpent ?? 0}</strong></div>`,
      insightStat(earnedInsight),
      reactionStat(game.reactionCounts),
    ].join("");
    statsEl.innerHTML = statsHtml;
    lossStatsEl.innerHTML = statsHtml;
    statsEl.hidden = false;
    renderAnalysis(game);
    if (game.won) renderDamage(game);
    else {
      const damageEl = q("[data-td-result-damage]");
      damageEl.innerHTML = "";
      damageEl.hidden = true;
    }
    q("[data-td-result-battle-empty]").hidden = !q("[data-td-result-damage]").hidden || !q("[data-td-result-analysis]").hidden;

    const favorEl = q("[data-td-result-favor]");
    rewards = [{ label: "Run", favor: earnedFavor }];
    if (daily) rewards.push({ label: "Daily first clear", favor: dailyRun?.reward ?? 0 });
    if (expedition) rewards.push({ label: "Expedition complete", favor: dailyRun?.reward ?? 0 });
    if (session.debug) favorEl.innerHTML = `<p class="td-result-favor-note">Debug run: score, bests and Favor were not recorded.</p>`;
    else if (campaign) favorEl.innerHTML = `<p class="td-result-favor-note">Campaign stages build campaign progress (heroes, unlocked stages) instead of Favor.</p>`;
    else if (shard) renderFavorLine();
    else renderFavorLine(data.tuning.shards ? `Defeat ${Math.round(data.tuning.shards.minDefeatedShare * 100)}% of the enemies to earn a shard.` : "");
    favorEl.hidden = false;
    ctx.actions.syncSpendButton();
    showTab("summary");
    playEl.classList.add("is-result-open");
    resultEl.hidden = false;
    resultEl.scrollTop = 0;
    resultEl.dataset.lossPage = "advice";
    lossStatsButton.setAttribute("aria-pressed", "false");
    primaryAction = game.won
      ? q<HTMLButtonElement>(expedition || campaign ? "[data-td-result-continue]" : "[data-td-result-retry]")
      : lossRetryButton.hidden ? lossCloseButton : lossRetryButton;
    retryButton.textContent = "Retry"; // the stage name overflowed the button; it stays in the tooltip
    retryButton.title = game.won ? `Retry ${map.name}` : "Retry";
    statsButton.hidden = !game.won;
    if (!game.won) {
      stageClear.playDefeat();
      resultEl.focus({ preventScroll: true });
      return;
    }
    if (statsButton.hidden) { primaryAction.focus({ preventScroll: true }); return; }

    // Stage Clear sequence: rewards are what the save gained this run.
    const favorGained = session.debug || campaign ? 0
      : rewards.reduce((sum, part) => sum + part.favor, 0) + (shard?.favor ?? 0);
    const paid: Record<string, number> = { gold: 0, heroXp: 0 };
    for (const reward of [...collection, ...(((dailyRun as any)?.paid ?? []) as any[])]) paid[reward.id] = (paid[reward.id] ?? 0) + reward.amount;
    const expeditionSeals = (dailyRun as any)?.seals ?? 0;
    if (expeditionSeals) paid.divineSeals = (paid.divineSeals ?? 0) + expeditionSeals;
    stageClear.play({
      mapName: map.name,
      context: [daily || expedition || campaign ? context : "", `${forecast?.total ?? 0} enemies`, tierName].filter(Boolean).join(" · "),
      score: game.score,
      lives: shownLives(game.lives, game.lifeUnit), // shown lives (stage clear screen)
      leaks: game.totalLeaks ?? 0,
      duration: fmtDuration(game.runDuration ?? 0),
      // Same rule as campaign stage ratings: a clear, half the lives, 90% of the lives.
      rating: (dailyRun as any)?.laurels?.filter(Boolean).length ?? laurelLives(campaignData, { lives: game.maxLives }).filter((lives: number) => game.lives >= lives).length,
      laurels: (dailyRun as any)?.laurels ?? undefined, // Campaign: the earned laurels, which can skip one when the stage goal was missed
      rewards: [...(campaign ? [] : [{ id: "favor", amount: favorGained }]), ...Object.entries(paid).map(([id, amount]) => ({ id, amount }))],
      heroXp: (dailyRun as any)?.heroXp ?? [],
      note: session.debug ? "Debug run: score, bests and rewards were not recorded." : campaign ? "" : dailyRun?.text ?? "", // Campaign: tiles and hero row replace the text
      rows: damageRows(game.heroStats ?? {}),
    });
    resultEl.focus({ preventScroll: true });
  }

  return { finishRun, reset };
}

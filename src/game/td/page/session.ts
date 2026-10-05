// Run lifecycle and page-wide control: start/end runs (one game + renderer per run,
// stale loads cancelled), game event handling, lobby/play screens, global keys and
// clicks, stage resize and the single frame loop.
import { buildRunTuning } from "../favor.js";
import { shownLives } from "../board.js";
import { createRenderer } from "../render.js";
import { mapSceneFor } from "../map-scene.js";
import { environmentFor } from "../environments.js";
import { timelineForMap } from "../stage-for-map.js";
import { TowerDefenseGame } from "../sim.js";
import { REACTION_INFO } from "../skills.js";
import type { PageContext, Slot } from "./context";
import { dailyGameOptions } from "../daily.js";
import { stageGameOptions } from "../expedition.js";
import { collectionHeroes, mightEnemyScale, stageById, stageGameOptions as campaignGameOptions } from "../campaign.js";
import campaignData from "../../../data/tdCampaign.json" with { type: "json" };
import type { DailySetup } from "./daily";
import type { CampaignRun } from "./campaign";
import type { ExpeditionState } from "./save";
import type { ScreenId } from "./nav";

// Enemy death and final-impact animations use up to 0.5s of wall time in render.js.
// Keep transition UI off the battlefield until those animations have resolved.
const BATTLE_SETTLE_MS = 850;

type Deps = {
  music: { play(track: string): void; stop(): void };
  speed(): number;
  hudTick(now: number): void;
  buffBar: { render(): void; reset(): void; position(): void };
  results: { finishRun(): void; reset(): void };
  debugPanel: { apply(): void; tick(now: number): void } | null;
  popover: { tick(now: number): void; isOpen(): boolean };
  recruit: { isOpen(): boolean };
};

export function createSessionController(ctx: PageContext, deps: Deps) {
  const { root, q, state, store, data, pause, heroById } = ctx;
  const stageEl = q("[data-td-stage]");
  const loadingEl = q("[data-td-loading]");
  const noticeEl = q("[data-td-notice]");
  const stageNameEl = q("[data-td-stage-name]");
  const stageNumberEl = q("[data-td-stage-number]");
  const stageTitleEl = q("[data-td-stage-title]");
  let sessionToken = 0;
  let loadingCanvas: HTMLCanvasElement | null = null;
  let battleSettleTimer: number | undefined;

  async function start(map: any, options: { daily?: DailySetup | null; expedition?: ExpeditionState | null; campaign?: CampaignRun | null } = {}) {
    const token = ++sessionToken;
    const daily = options.daily ?? null;
    const expedition = options.expedition ?? null;
    const campaign = options.campaign ?? null;
    const campaignStage = campaign ? stageById(campaignData, campaign.stageId) : null;
    end();
    if (!daily && !expedition && !campaign) { // the Daily Trial, Expedition and Campaign leave the lobby's map pick alone
      state.selectedMap = map;
      try { localStorage.setItem("td:map", map.id); } catch {}
    }
    // The home screen's Play picks this mode next time ("again" or "next").
    const homeMode = daily ? "daily" : expedition ? "expedition" : campaign ? "campaign" : "free";
    if (store.data.ui.homeMode !== homeMode) {
      store.data.ui = { ...store.data.ui, homeMode };
      store.persist();
    }
    deps.music.play(map.music);
    ctx.actions.showScreen("play");
    const environment = environmentFor(map);
    const environmentLabel = q("[data-td-environment-rule]");
    environmentLabel.hidden = !environment;
    environmentLabel.textContent = environment?.rule ?? "";
    stageNameEl.title = [campaignStage?.name, environment?.rule, environment?.text].filter(Boolean).join(" - "); // the compact landscape chip shows only the stage number
    stageNameEl.dataset.kind = campaignStage ? "campaign" : "battlefield";
    stageNameEl.hidden = !campaignStage && !environment;
    if (campaignStage) {
      stageNumberEl.textContent = `${campaign!.heroic ? "Heroic stage" : "Stage"} ${campaignStage.id}`;
      stageTitleEl.textContent = campaignStage.name;
    } else if (environment) {
      stageNumberEl.textContent = "Battlefield";
      stageTitleEl.textContent = map.name;
    }
    pause.clear();
    ctx.actions.syncPauseButton();
    deps.results.reset();
    noticeEl.classList.remove("is-visible");
    loadingEl.textContent = "Preparing battlefield";
    loadingEl.hidden = false;

    const canvas = document.createElement("canvas");
    canvas.className = "td-canvas";
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", `${map.name} battlefield. Use the arrow keys to choose a tile, then Enter to use it.`);
    stageEl.prepend(canvas);
    loadingCanvas = canvas;

    // Daily Trial (M19): the same map, squad and mutators for everyone, so no Divine Blessings
    // and no shard boost (collection upgrades still apply).
    // Campaign stages (M26) are balanced as authored: no Divine Blessings either.
    const runLevels = daily || campaign ? {} : { ...store.data.favLevels };
    // Expedition stages (M21) keep Divine Blessings but skip the shard boost (it waits for a normal run).
    const boost = daily || expedition || campaign ? null : store.data.nextRunBoost;
    // Hero levels, stars, Evolution and skills apply in every mode (global stats).
    // Free Play deploys only owned heroes; an Expedition roster is drawn from them when it
    // starts. The Daily Trial keeps its own squad.
    const heroes = collectionHeroes(campaignData, store.data.campaign, data.heroes);
    const special = daily ? dailyGameOptions(daily) : expedition ? stageGameOptions(expedition)
      : campaignStage ? campaignGameOptions(campaignStage, campaign!.squad, undefined, heroes, !!campaign!.heroic)
      : { allowedHeroes: [...store.data.campaign.owned] };
    // R12: Free Play and Expedition enemies grow with the collection's upgrades (by less than 100%).
    if (!daily && !campaignStage) {
      const pool: string[] = (special as any).allowedHeroes ?? [...store.data.campaign.owned];
      const might = mightEnemyScale(campaignData, store.data.campaign, data.heroes, pool, data.tuning.run?.deployCap ?? 7);
      if (might !== 1) (special as any).hpScale = ((special as any).hpScale ?? map?.enemyHp ?? 1) * might;
    }
    const tuning = buildRunTuning(data.tuning, runLevels, boost);
    // Divine Interventions unlock with campaign stages (tuning.interventions.<id>.unlockAfter);
    // the Daily Trial stays the same for everyone without them.
    const interventions = daily ? [] : Object.entries(data.tuning.interventions ?? {})
      .filter(([, cfg]: [string, any]) => !cfg.unlockAfter || store.data.campaign.cleared?.[cfg.unlockAfter]).map(([id]) => id);
    // Expedition lives carry over, so its maximum is the run's full lives, not the carried count.
    const game: any = new TowerDefenseGame({ ...data, heroes, interventions, timeline: timelineForMap(map, campaignData), tier: state.selectedTier, tuning, map, ...special, ...(expedition && { maxLives: tuning.run.lives }) });
    let renderer: any;
    try {
      renderer = await createRenderer(canvas, game, { boss: ctx.bossFor(map), campaign: Boolean(campaignStage || daily || expedition) }); // R18 by run context: Campaign, Daily Trial and Expedition
    } catch (error) {
      canvas.remove();
      if (token === sessionToken) loadingEl.textContent = "The battlefield failed to load. Reload the page to try again.";
      throw error;
    }
    if (token !== sessionToken) { renderer.destroy(); canvas.remove(); return; }
    loadingCanvas = null;
    loadingEl.hidden = true;

    game.onChange = (type: string) => handleChange(type);
    game.onEffect = ctx.actions.playEffect;
    const keyboardSlots: Slot[] = [
      ...map.roadSlots.map((_: unknown, index: number) => ({ type: "road", index })),
      ...map.platformSlots.map((_: unknown, index: number) => ({ type: "platform", index })),
    ];
    state.session = { game, renderer, canvas, map, started: false, keyboardSlots, favLevels: runLevels, boost, debug: false, daily, expedition, campaign };
    deps.debugPanel?.apply();
    (window as any).tdGame = game; // debugging/testing handle
    (window as any).tdRenderer = renderer; // debugging/testing handle
    ctx.actions.bindCanvas(state.session);
    pause.sync();
    ctx.actions.updateHud();
    ctx.actions.renderDeck();
    ctx.actions.renderPreview();
    deps.buffBar.render();
    ctx.actions.resetPowers();
    const boostText = boost?.type === "placement" ? ` Placement shard: +${boost.placement} starting placement.` : "";
    const dailyText = daily ? ` Daily Trial: ${daily.heroIds.length} heroes, goal: defeat ${daily.goal} enemies.`
      : campaignStage ? ` Campaign stage ${campaignStage.id} ${campaignStage.name}: ${campaign!.squad.length} heroes, ${shownLives(campaignStage.lives, game.lifeUnit)} lives.`
      : expedition ? ` Expedition stage ${expedition.stage + 1} of ${expedition.stages.length}: ${expedition.roster.length} heroes, ${shownLives(expedition.lives, game.lifeUnit)} lives.` : "";
    ctx.notice(`Tap a tile on ${map.name} to deploy a hero (up to ${game.deployCap()} at once).${boostText}${dailyText}`);
  }

  function end() {
    window.clearTimeout(battleSettleTimer);
    battleSettleTimer = undefined;
    stageNameEl.hidden = true;
    deps.buffBar.reset();
    ctx.actions.closePopover(false);
    ctx.actions.closeSheet(false);
    ctx.actions.cancelDeploy();
    deps.results.reset();
    if (loadingCanvas) { loadingCanvas.remove(); loadingCanvas = null; }
    const session = state.session;
    if (!session) return;
    session.game.onChange = () => {};
    session.game.onEffect = null;
    session.renderer.destroy();
    session.canvas.remove();
    state.session = null;
    (window as any).tdGame = null;
    (window as any).tdRenderer = null;
  }

  // Ends the run and returns to a menu screen (nav.ts exitPlay picks the default).
  function toLobby(target?: ScreenId) {
    sessionToken += 1; // cancels a battlefield that is still loading
    ctx.actions.closePanel(false);
    end();
    deps.music.stop();
    pause.clear();
    ctx.actions.renderLobby();
    ctx.actions.exitPlay(target);
  }

  function handleChange(type: string, settled = false) {
    const session = state.session;
    if (!session) return;
    const game = session.game;
    if (!settled && type === "finish") {
      const token = sessionToken;
      window.clearTimeout(battleSettleTimer);
      battleSettleTimer = window.setTimeout(() => {
        battleSettleTimer = undefined;
        if (token === sessionToken && state.session === session) handleChange(type, true);
      }, BATTLE_SETTLE_MS);
      return;
    }
    ctx.actions.updateHud();
    if (type === "leak" && game.lives > 0) ctx.notice(`${game.map.base ? `${mapSceneFor(game.map)?.baseName ?? "Sanctuary"} hit.` : "An enemy broke through."} ${shownLives(game.lives, game.lifeUnit)} ${shownLives(game.lives, game.lifeUnit) === 1 ? "life" : "lives"} left.`);
    if (type === "death") {
      const fallen = game.fallenHeroes.at(-1);
      const hero = fallen && heroById.get(fallen.id);
      if (hero) ctx.notice(`${hero.name} has fallen. Tap an empty tile or the deck to redeploy.`);
    }
    if (type === "revive" && game.lastRevive) {
      const revived = heroById.get(game.lastRevive.heroId);
      const reviver = heroById.get(game.lastRevive.by);
      const full = game.heroes.find((unit: any) => unit.id === game.lastRevive.by)?.awakenedUlt;
      if (revived) ctx.notice(`${reviver?.name ?? "A hero"} revived ${revived.name} with ${full ? "full" : "half"} health.`);
    }
    // Boss rules (M18).
    if (type === "bossMark") {
      const marked = game.heroes.find((h: any) => (h.markedByBossUntil ?? 0) > game.time);
      if (marked) ctx.notice(`${ctx.bossFor(game.map).name} marks ${marked.name}: silenced in a moment. Spread your damage to blunt the mark.`);
    }
    if (type === "endOfAll") ctx.notice(`End of All: ${ctx.bossFor(game.map).name}'s children now attack three times as fast.`);
    if (type === "eightyCount") ctx.notice(`The Eighty Count: ${ctx.bossFor(game.map).name} stuns nearby heroes and charges ahead, shrugging off crowd control.`);
    if (type === "resolve") ctx.notice(`Spanish Resolve: ${ctx.bossFor(game.map).name} grows stronger.`);
    if (type === "finalEight") ctx.notice(`The Final Eight: ${ctx.bossFor(game.map).name} cannot fall for 8 seconds. Hold the line.`);
    // First time each reaction fires in a run: name it so players learn the combination.
    if (type === "reaction" && game.lastReaction) {
      const info = (REACTION_INFO as Record<string, { name: string; needs: string; text: string }>)[game.lastReaction.name];
      // The glossary owns requirements and explanations; combat only announces the discovery.
      if (info) ctx.notice(`Reaction discovered: ${info.name}.`);
    }
    if (type === "finish") deps.results.finishRun();
    ctx.actions.renderDeck();
    if (type === "place") ctx.actions.startStage();
    ctx.actions.renderPreview();
    if (type === "reset" || type === "mutator" || type === "place" || type === "sell" || type === "death" || type === "revive") deps.buffBar.render();
    ctx.actions.refreshSelection();
    if (deps.recruit.isOpen()) ctx.actions.updateSheet();
    if (ctx.actions.activePanel()?.dataset.tdPanel === "blessings") ctx.actions.renderRunTab();
  }

  // Free stage space under the letterboxed map (portrait screens), in px.
  function spaceBelowMap() {
    const session = state.session;
    if (!session) return 0;
    return stageEl.getBoundingClientRect().bottom - session.canvas.getBoundingClientRect().bottom;
  }

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const opener = target.closest<HTMLElement>("[data-td-open]");
    if (opener) { ctx.actions.openPanel(opener.dataset.tdOpen!, ctx.actions.activePanel() ? null : opener); return; }
    if (target.closest("[data-td-close-panel]")) { ctx.actions.closePanel(); return; }
    if (target.closest("[data-td-restart]") || target.closest("[data-td-retry]")) {
      // An Expedition stage cannot be replayed; its outcome is final (M21).
      if (state.session?.expedition) { toLobby(); return; }
      const map = state.session?.map ?? state.selectedMap;
      const daily = state.session?.daily ?? null; // a trial retries the same day's setup
      const campaign = state.session?.campaign ?? null; // a campaign stage retries with the same squad
      ctx.actions.closePanel(false);
      start(map, { daily, campaign });
      return;
    }
    const exit = target.closest<HTMLElement>("[data-td-to-lobby]");
    if (exit) {
      // Result screen follow-up: pick the stage first, then leave the run straight to its squad.
      const stage = exit.dataset.tdCampStage;
      if (stage) ctx.actions.selectCampaignStage(stage);
      toLobby((stage ? "squad" : exit.dataset.tdToLobby || undefined) as ScreenId | undefined);
    }
  });

  document.addEventListener("keydown", (event) => {
    const activePanel = ctx.actions.activePanel();
    if (event.key === "Escape") {
      if (activePanel) ctx.actions.closePanel();
      else if (deps.recruit.isOpen()) ctx.actions.closeSheet();
      else if (deps.popover.isOpen()) ctx.actions.closePopover();
      else if (state.deployHeroId || state.relocateEntityId !== null) ctx.actions.cancelDeploy();
      else return;
      event.preventDefault();
      return;
    }
    if (event.key === "Tab" && activePanel) {
      // Keep focus inside the open panel.
      const focusables = [...activePanel.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input, [tabindex='0']")].filter((el) => !el.closest("[hidden]"));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === activePanel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      return;
    }
  });

  new ResizeObserver(() => {
    state.session?.renderer.resize();
    ctx.actions.positionPopover();
    deps.buffBar.position();
  }).observe(stageEl);

  // One frame loop for the page lifetime; it idles in the lobby (no session).
  let last = performance.now();
  function frame(now: number) {
    const delta = (now - last) / 1000;
    last = now;
    const session = state.session;
    if (session) {
      session.game.advance(delta * deps.speed());
      session.renderer.draw(now);
      deps.debugPanel?.tick(now);
      deps.popover.tick(now);
      deps.hudTick(now);
    }
    requestAnimationFrame(frame);
  }

  function run() {
    ctx.actions.renderLobby();
    requestAnimationFrame(frame);
  }

  return { start, end, toLobby, handleChange, spaceBelowMap, run };
}

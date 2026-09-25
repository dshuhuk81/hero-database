// Run lifecycle and page-wide control: start/end runs (one game + renderer per run,
// stale loads cancelled), game event handling, lobby/play screens, global keys and
// clicks, stage resize and the single frame loop.
import { buildRunTuning } from "../favor.js";
import { createRenderer } from "../render.js";
import { mapSceneFor } from "../map-scene.js";
import { TowerDefenseGame } from "../sim.js";
import type { PageContext, Slot } from "./context";

type Deps = {
  music: { play(track: string): void; stop(): void };
  speed(): number;
  hudTick(now: number): void;
  buffBar: { render(): void; reset(): void; position(): void };
  runOffer: { render(): void; reset(): void };
  results: { finishRun(): void; reset(): void };
  debugPanel: { apply(): void; tick(now: number): void } | null;
  popover: { tick(now: number): void; isOpen(): boolean };
  recruit: { isOpen(): boolean };
};

export function createSessionController(ctx: PageContext, deps: Deps) {
  const { root, q, state, store, data, pause, heroById } = ctx;
  const lobbyEl = q("[data-td-lobby]");
  const playEl = q("[data-td-play]");
  const stageEl = q("[data-td-stage]");
  const loadingEl = q("[data-td-loading]");
  const noticeEl = q("[data-td-notice]");
  let sessionToken = 0;
  let loadingCanvas: HTMLCanvasElement | null = null;

  function showScreen(name: "lobby" | "play") {
    root.dataset.screen = name;
    lobbyEl.hidden = name !== "lobby";
    playEl.hidden = name !== "play";
  }

  async function start(map: any) {
    const token = ++sessionToken;
    end();
    state.selectedMap = map;
    try { localStorage.setItem("td:map", map.id); } catch {}
    deps.music.play(map.music);
    showScreen("play");
    pause.clear();
    ctx.actions.syncPauseButton();
    deps.results.reset();
    noticeEl.classList.remove("is-visible");
    loadingEl.textContent = "Preparing battlefield";
    loadingEl.hidden = false;

    const canvas = document.createElement("canvas");
    canvas.className = "td-canvas";
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", `${map.name} battlefield. Use the left and right arrow keys to choose a ring, then Enter to use it.`);
    stageEl.prepend(canvas);
    loadingCanvas = canvas;

    const runFavTree = [...store.data.favTree];
    const boost = store.data.nextRunBoost;
    const game: any = new TowerDefenseGame({ ...data, tuning: buildRunTuning(data.tuning, runFavTree, boost), map });
    let renderer: any;
    try {
      renderer = await createRenderer(canvas, game, { boss: ctx.bossFor(map) });
    } catch (error) {
      canvas.remove();
      if (token === sessionToken) loadingEl.textContent = "The battlefield failed to load. Reload the page to try again.";
      throw error;
    }
    if (token !== sessionToken) { renderer.destroy(); canvas.remove(); return; }
    loadingCanvas = null;
    loadingEl.hidden = true;

    game.onChange = handleChange;
    game.onEffect = ctx.actions.playEffect;
    const keyboardSlots: Slot[] = [
      ...map.roadSlots.map((_: unknown, index: number) => ({ type: "road", index })),
      ...map.platformSlots.map((_: unknown, index: number) => ({ type: "platform", index })),
    ];
    state.session = { game, renderer, canvas, map, started: false, perfectWaves: 0, keyboardSlots, favTree: runFavTree, boost, debug: false };
    deps.debugPanel?.apply();
    (window as any).tdGame = game; // debugging/testing handle
    (window as any).tdRenderer = renderer; // debugging/testing handle
    ctx.actions.bindCanvas(state.session);
    pause.sync();
    ctx.actions.updateHud();
    ctx.actions.renderDeck();
    ctx.actions.syncMainAction();
    ctx.actions.renderPreview();
    deps.buffBar.render();
    const boostText = boost?.type === "gold" ? ` Gold shard: +${boost.gold} starting gold.`
      : boost?.type === "virtue" ? ` Virtue shard: ${ctx.blessingNames[boost.virtue] ?? boost.virtue} is active.` : "";
    ctx.notice(`Tap a ring on ${map.name} to deploy a hero.${boostText}`);
  }

  function end() {
    deps.buffBar.reset();
    ctx.actions.closePopover(false);
    ctx.actions.closeSheet(false);
    ctx.actions.cancelDeploy();
    deps.runOffer.reset();
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

  function toLobby() {
    sessionToken += 1; // cancels a battlefield that is still loading
    ctx.actions.closePanel(false);
    end();
    deps.music.stop();
    pause.clear();
    showScreen("lobby");
    ctx.actions.renderLobby();
    q<HTMLButtonElement>("[data-td-play-start]").focus({ preventScroll: true });
  }

  function handleChange(type: string) {
    const session = state.session;
    if (!session) return;
    const game = session.game;
    ctx.actions.updateHud();
    if (type === "leak" && game.lives > 0) ctx.notice(`${game.map.base ? `${mapSceneFor(game.map)?.baseName ?? "Sanctuary"} hit.` : "An enemy broke through."} ${game.lives} ${game.lives === 1 ? "life" : "lives"} left.`);
    if (type === "death") {
      const fallen = game.fallenHeroes.at(-1);
      const hero = fallen && heroById.get(fallen.id);
      if (hero) ctx.notice(`${hero.name} has fallen. Tap the empty ring or the deck to redeploy.`);
    }
    if (type === "revive" && game.lastRevive) {
      const revived = heroById.get(game.lastRevive.heroId);
      const reviver = heroById.get(game.lastRevive.by);
      if (revived) ctx.notice(`${reviver?.name ?? "A hero"} revived ${revived.name} (level 1, half health).`);
    }
    if (type === "clear" && game.waveStats) {
      ctx.actions.playSound("clear");
      const stats = game.waveStats;
      if (stats.leaks === 0) session.perfectWaves += 1;
      const leakText = stats.leaks === 0 ? "no leaks" : `${stats.leaks} leak${stats.leaks === 1 ? "" : "s"}`;
      const questText = game.quest?.status === "done" ? ` Quest complete: +${game.quest.gold} gold.` : "";
      ctx.notice(`Wave ${stats.wave} cleared: ${stats.kills} kills, ${leakText}, ${stats.goldEarned} gold earned.${questText}`);
    }
    if (type === "quest" && game.quest?.status === "failed" && game.lives > 0) ctx.notice(`Quest failed: ${ctx.actions.questName(game.quest)}.`);
    if (type === "finish") deps.results.finishRun();
    ctx.actions.renderDeck();
    ctx.actions.syncMainAction();
    ctx.actions.renderPreview();
    deps.runOffer.render();
    if (type === "virtue" || type === "reset") deps.buffBar.render();
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
      const map = state.session?.map ?? state.selectedMap;
      ctx.actions.closePanel(false);
      start(map);
      return;
    }
    if (target.closest("[data-td-to-lobby]")) toLobby();
  });

  const isTyping = (target: EventTarget | null) => target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
  document.addEventListener("keydown", (event) => {
    const activePanel = ctx.actions.activePanel();
    if (event.key === "Escape") {
      if (activePanel) ctx.actions.closePanel();
      else if (deps.recruit.isOpen()) ctx.actions.closeSheet();
      else if (deps.popover.isOpen()) ctx.actions.closePopover();
      else if (state.deployHeroId) ctx.actions.cancelDeploy();
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
    if (event.key.toLowerCase() === "r" && !event.metaKey && !event.ctrlKey && !activePanel && !isTyping(event.target) && state.session && state.selectedEntityId !== null) {
      state.session.game.rotate(state.selectedEntityId);
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
    showScreen("lobby");
    ctx.actions.renderLobby();
    requestAnimationFrame(frame);
  }

  return { start, end, toLobby, handleChange, spaceBelowMap, run };
}

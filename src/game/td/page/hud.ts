// HUD (placement, lives, enemies defeated, score), the stage forecast strip, the deck of heroes still to place (never fielded or fallen) and the circles of fielded
// heroes, pause and speed buttons.
import type { PageContext } from "./context";
import { shownLives } from "../board.js";
import { bossHudState } from "../ui.js";
import { defeatedCount } from "../daily.js";
import { bossSprite } from "../assets.js";

// Placement jumps at least this big (boons, ultimates) count up with a "+N" float; the one-per-second regrowth updates instantly.
const GOLD_TWEEN_MIN = 25;
const GOLD_TWEEN_MS = 600;

const KIND_NAMES: Record<string, string> = { grunt: "Grunts", runner: "Runners", flyer: "Flyers", archer: "Archers", brute: "Brutes", brood: "Children", mender: "Menders", shieldbearer: "Shieldbearers", hexer: "Hexers", broodcaller: "Broodcallers", imp: "Imps" };

export function createHud(ctx: PageContext) {
  const { q, state, store, pause, heroById, data } = ctx;
  const bossName = () => ctx.bossFor(state.session?.map).name;
  const previewEl = q("[data-td-preview]");
  const deckEl = q("[data-td-deck]");
  const deckCountEl = q("[data-td-deck-count]");
  const fieldedEl = q("[data-td-fielded]");
  const pauseButton = q<HTMLButtonElement>("[data-td-pause]");
  const speedButton = q<HTMLButtonElement>("[data-td-speed]");
  const goldEl = q("[data-td-gold]");
  const goldFloatEl = q("[data-td-gold-float]");
  const bossHealthEl = q("[data-td-boss-health]");
  const bossHealthFill = q<HTMLElement>("[data-td-boss-health-fill]");
  const bossShieldFill = q<HTMLElement>("[data-td-boss-shield-fill]");
  const bossValorFill = q<HTMLElement>("[data-td-boss-valor-fill]");
  let speed = 1;
  let lastFrame = 0;
  let shownGold = 0;
  let lastPlacement = -1;
  let goldTween: { from: number; to: number; start: number } | null = null;
  let deckKey = "";
  let lastStrip = 0;
  let bossPlateTimer = 0;

  function update() {
    const game = state.session?.game;
    if (!game) return;
    updateGold(game.placement);
    q("[data-td-lives]").textContent = String(shownLives(game.lives, game.lifeUnit));
    // How many of the stage's enemies are down (killed or through the gates), like the reference's kill counter.
    const forecast = game.stageForecast?.();
    q("[data-td-down-stat]").hidden = !forecast;
    if (forecast) {
      q("[data-td-down]").textContent = String(forecast.down);
      q("[data-td-down-total]").textContent = String(forecast.total);
    }
    // Daily Trial goal (M19): enemies defeated out of the goal.
    const daily = state.session?.daily;
    const dailyHud = q("[data-td-daily-hud]");
    dailyHud.hidden = !daily;
    if (daily) {
      const cleared = defeatedCount(game);
      q("[data-td-daily-progress]").textContent = cleared >= daily.goal ? "Done" : `${cleared}/${daily.goal}`;
      dailyHud.classList.toggle("is-done", cleared >= daily.goal);
    }
    q("[data-td-score]").textContent = game.score.toLocaleString();
    q("[data-td-synergy-count]").textContent = String(game.activeSynergyCount());
    syncBossHealth(game);
  }

  function syncBossHealth(game: any) {
    const info = bossHudState(game);
    bossHealthEl.hidden = !info;
    if (!info) return;
    const percent = Math.round(info.ratio * 100);
    q("[data-td-boss-health-name]").textContent = bossName();
    q("[data-td-boss-health-value]").textContent = `${percent}%`;
    bossHealthEl.setAttribute("aria-valuenow", String(percent));
    bossHealthFill.style.width = `${percent}%`;
    bossShieldFill.hidden = info.shieldRatio === undefined || info.shieldRatio <= 0;
    bossShieldFill.style.width = `${Math.round((info.shieldRatio ?? 0) * 100)}%`;
    bossValorFill.hidden = info.valorRatio === undefined;
    bossValorFill.style.width = `${Math.round((info.valorRatio ?? 0) * 100)}%`;
  }

  function updateGold(gold: number) {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const gain = gold - (goldTween?.to ?? shownGold);
    if (gain >= GOLD_TWEEN_MIN && state.session?.started) {
      goldFloatEl.textContent = `+${gain}`;
      goldFloatEl.classList.remove("is-playing");
      void goldFloatEl.offsetWidth; // restart the float animation
      goldFloatEl.classList.add("is-playing");
      if (!reduced) { goldTween = { from: shownGold, to: gold, start: performance.now() }; return; }
    }
    if (goldTween && gold > goldTween.to) { goldTween.to = gold; return; } // regrowth during a count-up
    goldTween = null;
    shownGold = gold;
    goldEl.textContent = String(gold);
  }

  // The stage at a glance: before the start a summary chip, then a live strip with the next groups and their ETA.
  function summaryChip(game: any) {
    const forecast = game.stageForecast?.();
    if (!forecast || game.started) return "";
    const detail = Object.entries(forecast.counts).map(([kind, count]) => `${count} ${kind === "boss" ? bossName() : KIND_NAMES[kind] ?? kind}`).join(", ");
    return `<span class="td-forecast-chip td-forecast-chip--summary" title="${detail}"><b>${forecast.total}</b> enemies${forecast.totalHp ? ` · <b>${forecast.totalHp.toLocaleString()}</b> HP` : ""}</span>`;
  }

  function renderPreview() {
    const game = state.session?.game;
    const html = !game || game.complete ? "" : summaryChip(game);
    previewEl.hidden = !html;
    previewEl.innerHTML = html;
  }

  // The whole roster sits in the deck from the first frame: placed heroes (select), fallen
  // heroes and heroes not yet fielded (both dragged onto the battlefield, see recruit.ts).
  function deckEntries(): any[] {
    const game = state.session?.game;
    if (!game) return [];
    const roster = data.heroes.filter((hero: any) => game.heroesById.has(hero.id) && (!game.allowedHeroes || game.allowedHeroes.has(hero.id)));
    return roster.map((hero: any) => {
      const unit = game.heroes.find((entry: any) => entry.id === hero.id);
      if (unit) return { kind: "unit", id: hero.id, unit };
      return { kind: game.fallenHeroes.some((entry: any) => entry.id === hero.id) ? "fallen" : "ready", id: hero.id, unit: null as any };
    });
  }

  // Rebuilds buttons only when the composition changes, so focus survives kills. Fielded heroes
  // are round portraits next to the powers (bottom left); the rest wait in the deck (bottom right)
  // and return there when they fall.
  function renderDeck() {
    const game = state.session?.game;
    const entries = deckEntries();
    const key = entries.map((entry) => `${entry.kind}:${entry.id}:${entry.unit?.entityId ?? ""}`).join("|");
    if (key !== deckKey) {
      deckKey = key;
      const portrait = (hero: any) => `<img data-rarity="${hero.rarity ?? ''}" src="${hero.image}" alt="" width="40" height="40">`;
      fieldedEl.innerHTML = entries.filter((entry) => entry.kind === "unit").map((entry) =>
        `<button type="button" class="td-fielded-slot" data-deck-unit="${entry.unit.entityId}">${portrait(heroById.get(entry.id))}<span class="td-deck-badge" data-deck-badge></span></button>`).join("");
      deckEl.innerHTML = entries.filter((entry) => entry.kind !== "unit").map((entry) => {
        const attr = entry.kind === "fallen" ? `data-deck-fallen="${entry.id}"` : `data-deck-ready="${entry.id}"`;
        return `<button type="button" class="td-deck-slot is-draggable${entry.kind === "fallen" ? " is-fallen" : ""}" ${attr}>${portrait(heroById.get(entry.id))}<span class="td-deck-badge" data-deck-badge></span></button>`;
      }).join("");
    }
    if (!game) return;
    deckCountEl.textContent = `${game.heroes.length}/${game.deployCap()}`;
    deckCountEl.classList.toggle("is-full", game.heroes.length >= game.deployCap());
    fieldedEl.querySelectorAll<HTMLButtonElement>("[data-deck-unit]").forEach((button) => {
      const unit = game.heroes.find((entry: any) => entry.entityId === Number(button.dataset.deckUnit));
      if (!unit) return;
      button.classList.toggle("is-selected", unit.entityId === state.selectedEntityId);
      button.setAttribute("aria-label", `${unit.name}${unit.campaignLevel ? `, level ${unit.campaignLevel}` : ""}. Show actions.`);
      button.querySelector<HTMLElement>("[data-deck-badge]")!.textContent = unit.campaignLevel ? String(unit.campaignLevel) : "";
    });
    deckEl.querySelectorAll<HTMLButtonElement>("[data-deck-fallen], [data-deck-ready]").forEach((button) => {
      const fallen = button.dataset.deckFallen !== undefined;
      const hero = heroById.get((fallen ? button.dataset.deckFallen : button.dataset.deckReady)!);
      const cost = game.deployCost(hero.id); // blessing discounts included (R4)
      const short = game.complete || game.placement < cost;
      button.classList.toggle("is-unaffordable", short);
      button.classList.toggle("is-selected", state.deployHeroId === hero.id);
      button.setAttribute("aria-label", `${hero.name}${fallen ? " has fallen" : ""}. ${fallen ? "Redeploy" : "Deploy"} for ${cost} placement: drag onto the battlefield or tap, then tap a tile.`);
      button.querySelector<HTMLElement>("[data-deck-badge]")!.textContent = `${cost}`;
    });
  }

  // Also ends a relocation (R4): both use the empty-tile highlight and end on the same events
  // (stage start, run end, an empty map tap, Escape).
  function cancelDeploy() {
    if (!state.deployHeroId && state.relocateEntityId === null) return;
    state.deployHeroId = "";
    state.relocateEntityId = null;
    if (state.session) { state.session.game.uiPlacement = null; state.session.game.uiDeploySlot = null; }
    renderDeck();
  }

  function syncPauseButton() {
    const manual = pause.has("manual");
    pauseButton.setAttribute("aria-pressed", String(manual));
    pauseButton.setAttribute("aria-label", manual ? "Resume game" : "Pause game");
  }

  // The stage waits, paused in effect, until the first hero is placed; that placement starts it at 1x.
  function startStage() {
    const session = state.session;
    if (!session) return;
    const game = session.game;
    if (game.running || game.complete || !game.heroes.length) return;
    if (!session.started) {
      session.started = true;
      store.data.lastTeam = [...game.team];
      store.persist();
      speed = 1;
      speedButton.textContent = "1x";
      speedButton.setAttribute("aria-label", "Game speed 1x");
    }
    ctx.actions.closeSheet(false);
    cancelDeploy();
    if (game.start()) {
      pause.remove("manual");
      syncPauseButton();
      ctx.notice("The stage has started. Heroes attack automatically.");
    }
    renderPreview();
  }

  const onDeckClick = (event: Event) => {
    const session = state.session;
    if (!session) return;
    const target = event.target as HTMLElement;
    const unitButton = target.closest<HTMLButtonElement>("[data-deck-unit]");
    if (unitButton) {
      const unit = session.game.heroes.find((entry: any) => entry.entityId === Number(unitButton.dataset.deckUnit));
      if (unit) ctx.actions.selectUnit(unit);
      return;
    }
    // Tap fallback for keyboards and short taps: pick the hero, then tap an empty tile.
    const readyButton = target.closest<HTMLButtonElement>("[data-deck-fallen], [data-deck-ready]");
    if (readyButton) {
      if (ctx.actions.consumeDragClick()) return;
      const hero = heroById.get((readyButton.dataset.deckFallen ?? readyButton.dataset.deckReady)!);
      const cost = session.game.deployCost(hero.id);
      if (session.game.placement < cost) { ctx.notice(`${hero.name} needs ${cost} placement, you have ${Math.floor(session.game.placement)}.`); return; }
      ctx.actions.closePopover(false);
      ctx.actions.closeSheet(false);
      state.deployHeroId = state.deployHeroId === hero.id ? "" : hero.id;
      session.game.uiDeploySlot = state.deployHeroId ? hero.slot : null;
      if (state.deployHeroId) ctx.notice(`Tap an empty ${hero.slot} tile to deploy ${hero.name}.`);
      else session.game.uiPlacement = null;
      renderDeck();
    }
  };
  deckEl.addEventListener("click", onDeckClick);
  fieldedEl.addEventListener("click", onDeckClick);

  pauseButton.addEventListener("click", () => { pause.toggle("manual"); syncPauseButton(); });

  // Full screen for the whole game shell (board, panels, overlays). Hidden where the
  // browser can't do element full screen (iPhone Safari). F toggles, Escape exits.
  // Two buttons share this: the fight top bar and the Settings screen (Display).
  const shell = q("[data-td-fullscreen]").closest<HTMLElement>("[data-td-root]")!;
  const fullscreenButtons = [...shell.querySelectorAll<HTMLButtonElement>("[data-td-fullscreen]")];
  const doc = document as any;
  const canFullscreen = Boolean(document.fullscreenEnabled || doc.webkitFullscreenEnabled);
  for (const button of fullscreenButtons) button.hidden = !canFullscreen;
  const settingsRow = shell.querySelector<HTMLElement>("[data-td-fullscreen-row]");
  if (settingsRow) settingsRow.hidden = !canFullscreen;
  const isFullscreen = () => (document.fullscreenElement || doc.webkitFullscreenElement) === shell;
  function toggleFullscreen() {
    const request = isFullscreen()
      ? (document.exitFullscreen ?? doc.webkitExitFullscreen)?.call(document)
      : (shell.requestFullscreen ?? (shell as any).webkitRequestFullscreen)?.call(shell, { navigationUI: "hide" });
    request?.catch?.(() => ctx.notice("Full screen is not available here."));
  }
  function syncFullscreenButton() {
    const on = isFullscreen();
    for (const button of fullscreenButtons) {
      button.setAttribute("aria-pressed", String(on));
      button.setAttribute("aria-label", on ? "Exit full screen" : "Enter full screen");
      button.classList.toggle("is-on", on);
      const label = button.querySelector("[data-td-fullscreen-label]");
      if (label) label.textContent = on ? "Exit full screen" : "Full screen";
    }
  }
  for (const button of fullscreenButtons) button.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", syncFullscreenButton);
  document.addEventListener("webkitfullscreenchange", syncFullscreenButton);
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() !== "f" || event.metaKey || event.ctrlKey || event.altKey || !canFullscreen) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    toggleFullscreen();
  });
  speedButton.addEventListener("click", () => {
    speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
    speedButton.textContent = `${speed}x`;
    speedButton.setAttribute("aria-label", `Game speed ${speed}x`);
  });

  function tick(now: number) {
    const dt = lastFrame ? now - lastFrame : 0;
    lastFrame = now;
    const game = state.session?.game;
    if (!game) return;
    syncBossHealth(game);
    // Placement regrows every battle second without a change event: keep the counter and the
    // deck's affordable/dimmed state current so heroes can be dragged out mid-stage.
    if (Math.floor(game.placement) !== lastPlacement) {
      lastPlacement = Math.floor(game.placement);
      updateGold(game.placement);
      renderDeck();
    }
    if (goldTween) {
      const t = Math.min(1, (now - goldTween.start) / GOLD_TWEEN_MS);
      shownGold = Math.round(goldTween.from + (goldTween.to - goldTween.from) * (1 - (1 - t) ** 3));
      goldEl.textContent = String(shownGold);
      if (t >= 1) goldTween = null;
    }
    // The strip's ETAs tick once a second; the first flyer or archer of a run is explained once.
    if (game.running && now - lastStrip >= 1000) {
      lastStrip = now;
      renderPreview();
      const session = state.session;
      if (session && !session.flyerHint && game.enemies.some((enemy: any) => enemy.flying)) {
        session.flyerHint = true;
        ctx.notice("Flyers pass over blockers. Only platform heroes can hit them.");
      } else if (session && !session.archerHint && game.tuning.enemies.archer?.targetsPlatforms && game.enemies.some((enemy: any) => enemy.kind === "archer")) {
        session.archerHint = true;
        ctx.notice("Archers shoot platform heroes in reach when no road hero is. Amber brackets mark their target.");
      }
    }
  }

  // Boss entrance (P5): 2.5s nameplate over the map. Visual only; the run keeps
  // going and the entrance notice covers screen readers.
  function bossIntro() {
    const plate = q("[data-td-boss-plate]");
    const boss = ctx.bossFor(state.session?.map);
    q("[data-td-boss-kicker]").textContent = "Boss";
    ctx.notice(`${boss.name} has entered ${state.session?.map.name ?? "the battlefield"}.`);
    q("[data-td-boss-name]").textContent = boss.name;
    q("[data-td-boss-sub]").textContent = boss?.class ? `${boss.class} boss` : "";
    // The board sprite doubles as the nameplate portrait (no database art in the game).
    q<HTMLImageElement>("[data-td-boss-art]").src = bossSprite(boss?.id);
    plate.hidden = false;
    plate.classList.remove("is-playing");
    void plate.offsetWidth; // restart the animation
    plate.classList.add("is-playing");
    window.clearTimeout(bossPlateTimer);
    bossPlateTimer = window.setTimeout(() => { plate.hidden = true; plate.classList.remove("is-playing"); }, 2500);
  }

  return { update, startStage, renderPreview, tick, bossIntro, renderDeck, cancelDeploy, syncPauseButton, speed: () => speed };
}

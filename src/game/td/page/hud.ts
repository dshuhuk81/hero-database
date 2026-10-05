// HUD (placement, lives, wave, score), wave preview, main wave button, deck of deployed
// and fallen heroes, pause and speed buttons.
import type { PageContext } from "./context";
import { shownLives } from "../board.js";
import { isBossWave } from "../waves.js";
import { bossHudState } from "../ui.js";
import { clearedWaves } from "../daily.js";
import { bossSprite } from "../assets.js";

const QUEST_NAMES: Record<string, string> = { noLeaks: "No leaks", heroSurvival: "No hero falls", speedClear: "Speed clear", heroKills: "Slayer" };

const AUTO_NEXT_KEY = "td:autonext";
const AUTO_NEXT_MS = 10000;
// Gold jumps at least this big (wave clear, quest) count up with a "+N" float; the one-per-second regrowth updates instantly.
const GOLD_TWEEN_MIN = 25;
const GOLD_TWEEN_MS = 600;

const KIND_NAMES: Record<string, string> = { grunt: "Grunts", runner: "Runners", flyer: "Flyers", archer: "Archers", brute: "Brutes", brood: "Children", mender: "Menders", shieldbearer: "Shieldbearers", hexer: "Hexers", broodcaller: "Broodcallers", imp: "Imps" };

export function createHud(ctx: PageContext) {
  const { q, state, store, pause, heroById, data } = ctx;
  const bossName = () => ctx.bossFor(state.session?.map).name;
  // The wave table is the truth (campaign stages put the boss on their own last wave, e.g. 8 or 11);
  // the mode rule only covers endless waves not generated yet.
  const bossWave = (game: any, n: number) => {
    const wave = game.waves?.[n - 1];
    return wave ? wave.spawns.some((group: any) => group.kind === "boss") : isBossWave(n, game.mode, data.tuning.waveGen);
  };
  const previewEl = q("[data-td-preview]");
  const deckEl = q("[data-td-deck]");
  const deckCountEl = q("[data-td-deck-count]");
  const mainAction = q<HTMLButtonElement>("[data-td-main-action]");
  const pauseButton = q<HTMLButtonElement>("[data-td-pause]");
  const speedButton = q<HTMLButtonElement>("[data-td-speed]");
  const autoButton = q<HTMLButtonElement>("[data-td-auto]");
  const goldEl = q("[data-td-gold]");
  const goldFloatEl = q("[data-td-gold-float]");
  const bossHealthEl = q("[data-td-boss-health]");
  const bossHealthFill = q<HTMLElement>("[data-td-boss-health-fill]");
  const bossShieldFill = q<HTMLElement>("[data-td-boss-shield-fill]");
  const bossValorFill = q<HTMLElement>("[data-td-boss-valor-fill]");
  let speed = 1;
  let autoNext = false;
  try { autoNext = localStorage.getItem(AUTO_NEXT_KEY) === "1"; } catch {}
  // Between-wave countdown (5E): armed once per cleared wave, frozen while held.
  let autoWave = -1;
  let autoLeft = AUTO_NEXT_MS;
  let lastFrame = 0;
  let shownGold = 0;
  let lastPlacement = -1;
  let goldTween: { from: number; to: number; start: number } | null = null;
  let deckKey = "";
  let lastQuestTick = 0;
  let bossPlateTimer = 0;

  function update() {
    const game = state.session?.game;
    if (!game) return;
    updateGold(game.placement);
    q("[data-td-lives]").textContent = String(shownLives(game.lives, game.lifeUnit));
    q("[data-td-wave]").textContent = String(game.wave);
    q("[data-td-wave-total]").textContent = Number.isFinite(game.totalWaves) ? String(game.totalWaves) : "∞";
    // Campaign Encounter Pacing: how many of the stage's enemies are down, like the reference's kill counter.
    const forecast = game.stageForecast?.();
    q("[data-td-down-stat]").hidden = !forecast;
    if (forecast) {
      q("[data-td-down]").textContent = String(forecast.down);
      q("[data-td-down-total]").textContent = String(forecast.total);
    }
    // Daily Trial goal (M19): waves cleared out of the goal.
    const daily = state.session?.daily;
    const dailyHud = q("[data-td-daily-hud]");
    dailyHud.hidden = !daily;
    if (daily) {
      const cleared = clearedWaves(game);
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

  function syncMainAction() {
    const session = state.session;
    const game = session?.game;
    if (!session || !game) { mainAction.disabled = true; mainAction.textContent = "Deploy a hero"; return; }
    if (game.complete) { mainAction.disabled = true; mainAction.textContent = "Run complete"; return; }
    if (!session.started) {
      mainAction.disabled = game.heroes.length === 0;
      mainAction.textContent = game.heroes.length === 0 ? "Deploy a hero" : "Start wave 1";
      return;
    }
    if (game.running) {
      mainAction.disabled = true;
      mainAction.textContent = game.wave === game.totalWaves ? "Final wave" : `Wave ${game.wave} underway`;
      return;
    }
    mainAction.disabled = false;
    const label = bossWave(game, game.wave + 1) ? `Face ${bossName()}` : `Start wave ${game.wave + 1}`;
    mainAction.textContent = countdownActive() ? `${label} - ${Math.ceil(autoLeft / 1000)}s` : label;
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

  function countdownActive() {
    const session = state.session;
    const game = session?.game;
    return autoNext && !!session?.started && !!game && !game.running && !game.complete && game.wave > 0 && autoWave === game.wave;
  }

  // Held while the player is deciding: blessing offer, a panel or manual pause, the recruit sheet, a relocation.
  const countdownHeld = (game: any) => !!game.virtueOffer || !!game.mutatorOffer || pause.paused || !!state.pendingSlot || state.relocateEntityId !== null;

  function syncAutoButton() {
    autoButton.setAttribute("aria-pressed", String(autoNext));
    autoButton.classList.toggle("is-on", autoNext);
    autoButton.title = autoNext ? "Auto-start next wave after 10 seconds: on" : "Auto-start next wave after 10 seconds: off";
  }

  const questName = (quest: any) => QUEST_NAMES[quest.type] ?? quest.type;

  function questGoal(quest: any, game: any) {
    if (quest.type === "noLeaks") return "Let no enemy through";
    if (quest.type === "heroSurvival") return "Keep every hero alive";
    if (quest.type === "heroKills") return `${quest.heroName} kills ${Math.min(quest.kills, quest.target)}/${quest.target}`;
    const lastSpawnAt = game.waveStats?.lastSpawnAt;
    if (lastSpawnAt == null) return `Clear within ${quest.seconds}s of the last spawn`;
    return `${Math.max(0, Math.ceil(quest.seconds - (game.time - lastSpawnAt)))}s left to clear`;
  }

  // Shown during a wave in place of the next-wave preview. Kept to a short chip (the full goal sits in
  // its tooltip) so it never spreads over the first combat row.
  function questChip(game: any) {
    const quest = game.quest;
    const status = quest.status === "failed" ? " is-failed" : "";
    const lastSpawnAt = game.waveStats?.lastSpawnAt;
    const progress = quest.type === "heroKills" ? `${Math.min(quest.kills, quest.target)}/${quest.target} ` : quest.type === "speedClear" && lastSpawnAt != null ? `${Math.max(0, Math.ceil(quest.seconds - (game.time - lastSpawnAt)))}s ` : "";
    const detail = quest.status === "failed" ? "failed" : `${progress}+${quest.reward}`;
    return `<span class="td-wave-chip td-quest-chip${status}" data-td-quest title="${questGoal(quest, game)} - +${quest.reward} placement">Quest <b>${questName(quest)}</b> ${detail}</span>`;
  }

  // What the stage holds and what arrives next (Campaign Encounter Pacing P1).
  function summaryChip(game: any) {
    const forecast = game.stageForecast?.();
    if (!forecast || game.wave > 0) return "";
    const detail = Object.entries(forecast.counts).map(([kind, count]) => `${count} ${kind === "boss" ? bossName() : KIND_NAMES[kind] ?? kind}`).join(", ");
    return `<span class="td-wave-chip td-wave-chip--summary" title="${detail}"><b>${forecast.total}</b> enemies in ${forecast.waves} waves</span>`;
  }

  function incomingChips(game: any) {
    const forecast = game.stageForecast?.(3);
    if (!forecast?.ahead.length) return "";
    return forecast.ahead.slice(0, 2).map((group: any) => `<span class="td-wave-chip td-wave-chip--incoming">${group.count}x <b>${group.kind === "boss" ? bossName() : KIND_NAMES[group.kind] ?? group.kind}</b></span>`).join("");
  }

  function renderPreview() {
    const game = state.session?.game;
    if (game?.running) { // the wave's remaining queue: counts only, since the chips are not redrawn every tick
      const html = (game.quest ? questChip(game) : "") + incomingChips(game);
      previewEl.hidden = !html;
      previewEl.innerHTML = html;
      return;
    }
    const info = game && !game.running && !game.complete ? game.wavePreview() : null;
    if (!info) { previewEl.hidden = true; return; }
    previewEl.hidden = false;
    previewEl.innerHTML = summaryChip(game) + `<span class="td-wave-chip">Next wave <b>${info.wave}</b></span>` + Object.entries(info.counts)
      .map(([kind, count]) => `<span class="td-wave-chip">${count}x <b>${kind === "boss" ? bossName() : KIND_NAMES[kind] ?? kind}</b></span>`).join("") +
      (info.totalHp ? `<span class="td-wave-chip td-wave-chip--hp"><b>${info.totalHp.toLocaleString()}</b> enemy HP</span>` : "");
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

  // Rebuilds buttons only when the deck composition changes, so focus survives kills.
  function renderDeck() {
    const game = state.session?.game;
    const entries = deckEntries();
    const key = entries.map((entry) => `${entry.kind}:${entry.id}:${entry.unit?.entityId ?? ""}`).join("|");
    if (key !== deckKey) {
      deckKey = key;
      deckEl.innerHTML = entries.map((entry) => {
        const hero = heroById.get(entry.id);
        const attr = entry.kind === "unit" ? `data-deck-unit="${entry.unit.entityId}"` : entry.kind === "fallen" ? `data-deck-fallen="${entry.id}"` : `data-deck-ready="${entry.id}"`;
        return `<button type="button" class="td-deck-slot${entry.kind === "fallen" ? " is-fallen" : ""}${entry.kind === "unit" ? "" : " is-draggable"}" ${attr}>` +
          `<img src="${hero.image}" alt="" width="40" height="40"><span class="td-deck-badge" data-deck-badge></span></button>`;
      }).join("");
    }
    if (!game) return;
    deckCountEl.textContent = `${game.heroes.length}/${game.deployCap()}`;
    deckCountEl.classList.toggle("is-full", game.heroes.length >= game.deployCap());
    deckEl.querySelectorAll<HTMLButtonElement>("[data-deck-unit]").forEach((button) => {
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
  // (wave start, run end, an empty map tap, Escape).
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

  mainAction.addEventListener("click", () => {
    const session = state.session;
    if (!session) return;
    const game = session.game;
    if (game.running || game.complete) return;
    if (!session.started) {
      if (!game.heroes.length) return;
      session.started = true;
      if (session.boost) store.data.nextRunBoost = null; // shard used up by this run
      store.data.lastTeam = [...game.team];
      store.persist();
    }
    ctx.actions.closeSheet(false);
    cancelDeploy();
    if (game.startWave()) {
      pause.remove("manual"); // starting a wave is an explicit resume
      syncPauseButton();
      // Flyers look like ground units to new players: the first flyer wave of a run explains them.
      const flyers = !session.flyerHint && game.waves[game.wave - 1]?.spawns.some((group: any) => group.kind === "flyer");
      if (flyers) session.flyerHint = true;
      // Same for enemy archers once they can shoot platform heroes (tuning targetsPlatforms).
      const archers = !flyers && !session.archerHint && game.tuning.enemies.archer?.targetsPlatforms
        && game.waves[game.wave - 1]?.spawns.some((group: any) => group.kind === "archer");
      if (archers) session.archerHint = true;
      ctx.notice(bossWave(game, game.wave) ? `${bossName()} has entered ${session.map.name}.`
        : flyers ? `Wave ${game.wave}: flyers pass over blockers. Only platform heroes can hit them.`
        : archers ? `Wave ${game.wave}: archers shoot platform heroes in reach when no road hero is. Amber brackets mark their target.`
        : `Wave ${game.wave} incoming. Heroes attack automatically.`);
    }
    syncMainAction();
    renderPreview();
  });

  deckEl.addEventListener("click", (event) => {
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
  });

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

  autoButton.addEventListener("click", () => {
    autoNext = !autoNext;
    try { localStorage.setItem(AUTO_NEXT_KEY, autoNext ? "1" : "0"); } catch {}
    syncAutoButton();
    const game = state.session?.game;
    if (autoNext && game) { autoWave = game.wave; autoLeft = AUTO_NEXT_MS; } // toggling on mid-break starts a fresh 10s
    syncMainAction();
  });
  syncAutoButton();

  function tick(now: number) {
    const dt = lastFrame ? now - lastFrame : 0;
    lastFrame = now;
    const game = state.session?.game;
    if (!game) return;
    syncBossHealth(game);
    // Placement regrows every battle second without a change event: keep the counter and the
    // deck's affordable/dimmed state current so heroes can be dragged out mid-wave.
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
    // A new break (wave cleared) arms a fresh countdown; a running wave disarms it.
    if (game.running) autoWave = -1;
    else if (game.wave > 0 && autoWave !== game.wave) { autoWave = game.wave; autoLeft = AUTO_NEXT_MS; }
    if (countdownActive() && !countdownHeld(game)) {
      const before = Math.ceil(autoLeft / 1000);
      autoLeft -= dt;
      if (autoLeft <= 0) { autoWave = -1; mainAction.click(); }
      else if (Math.ceil(autoLeft / 1000) !== before) syncMainAction();
    }
    // Speed clear counts down once the last enemy has spawned; 4 text updates a second.
    if (!game.running || game.quest?.type !== "speedClear" || game.quest.status !== "active" || now - lastQuestTick <= 250) return;
    lastQuestTick = now;
    previewEl.innerHTML = questChip(game);
  }

  // Boss entrance (P5): 2.5s nameplate over the map. Visual only; the run keeps
  // going and the entrance notice covers screen readers.
  function bossIntro() {
    const plate = q("[data-td-boss-plate]");
    const boss = ctx.bossFor(state.session?.map);
    const game = state.session?.game;
    // Only the last wave of a finite run is the final one; endless and earlier bosses show their wave.
    q("[data-td-boss-kicker]").textContent = game && game.wave === game.totalWaves ? "Final wave" : `Boss - wave ${game?.wave ?? ""}`;
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

  return { update, syncMainAction, renderPreview, questName, tick, bossIntro, renderDeck, cancelDeploy, syncPauseButton, speed: () => speed };
}

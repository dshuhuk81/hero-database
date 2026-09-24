// HUD (gold, lives, wave, score), wave preview, main wave button, deck of deployed
// and fallen heroes, pause and speed buttons.
import type { PageContext } from "./context";

const QUEST_NAMES: Record<string, string> = { noLeaks: "No leaks", heroSurvival: "No hero falls", speedClear: "Speed clear" };

const KIND_NAMES: Record<string, string> = { grunt: "Grunts", runner: "Runners", flyer: "Flyers", archer: "Archers", brute: "Brutes" };

export function createHud(ctx: PageContext) {
  const { q, state, store, pause, heroById, maxTeam, totalWaves, bossName } = ctx;
  const kindNames: Record<string, string> = { ...KIND_NAMES, boss: bossName };
  const previewEl = q("[data-td-preview]");
  const deckEl = q("[data-td-deck]");
  const mainAction = q<HTMLButtonElement>("[data-td-main-action]");
  const pauseButton = q<HTMLButtonElement>("[data-td-pause]");
  const speedButton = q<HTMLButtonElement>("[data-td-speed]");
  let speed = 1;
  let deckKey = "";
  let lastQuestTick = 0;
  let bossPlateTimer = 0;

  function update() {
    const game = state.session?.game;
    if (!game) return;
    q("[data-td-gold]").textContent = String(game.gold);
    q("[data-td-lives]").textContent = String(game.lives);
    q("[data-td-wave]").textContent = String(game.wave);
    q("[data-td-score]").textContent = game.score.toLocaleString();
    q("[data-td-synergy-count]").textContent = String(game.activeSynergyCount());
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
      mainAction.textContent = game.wave === totalWaves ? "Final wave" : `Wave ${game.wave} underway`;
      return;
    }
    mainAction.disabled = false;
    mainAction.textContent = game.wave === totalWaves - 1 ? `Face ${bossName}` : `Start wave ${game.wave + 1}`;
  }

  const questName = (quest: any) => QUEST_NAMES[quest.type] ?? quest.type;

  function questGoal(quest: any, game: any) {
    if (quest.type === "noLeaks") return "Let no enemy through";
    if (quest.type === "heroSurvival") return "Keep every hero alive";
    const lastSpawnAt = game.waveStats?.lastSpawnAt;
    if (lastSpawnAt == null) return `Clear within ${quest.seconds}s of the last spawn`;
    return `${Math.max(0, Math.ceil(quest.seconds - (game.time - lastSpawnAt)))}s left to clear`;
  }

  // Shown during a wave in place of the next-wave preview.
  function questChip(game: any) {
    const quest = game.quest;
    const status = quest.status === "failed" ? " is-failed" : "";
    const detail = quest.status === "failed" ? "failed" : `${questGoal(quest, game)} - +${quest.gold} gold`;
    return `<span class="td-wave-chip td-quest-chip${status}" data-td-quest>Quest <b>${questName(quest)}</b> ${detail}</span>`;
  }

  function renderPreview() {
    const game = state.session?.game;
    if (game?.running && game.quest) {
      previewEl.hidden = false;
      previewEl.innerHTML = questChip(game);
      return;
    }
    const info = game && !game.running && !game.complete ? game.wavePreview() : null;
    if (!info) { previewEl.hidden = true; return; }
    previewEl.hidden = false;
    previewEl.innerHTML = `<span class="td-wave-chip">Next wave <b>${info.wave}</b></span>` + Object.entries(info.counts)
      .map(([kind, count]) => `<span class="td-wave-chip">${count}x <b>${kindNames[kind] ?? kind}</b></span>`).join("") +
      (info.totalHp ? `<span class="td-wave-chip td-wave-chip--hp"><b>${info.totalHp.toLocaleString()}</b> enemy HP</span>` : "");
  }

  function deckEntries() {
    const game = state.session?.game;
    if (!game) return [];
    const units = game.heroes.map((unit: any) => ({ kind: "unit", id: unit.id, unit }));
    const fallenIds = [...new Set<string>(game.fallenHeroes.map((entry: any) => entry.id))]
      .filter((id) => !game.heroes.some((unit: any) => unit.id === id));
    return [...units, ...fallenIds.map((id) => ({ kind: "fallen", id, unit: null as any }))];
  }

  // Rebuilds buttons only when the deck composition changes, so focus survives kills.
  function renderDeck() {
    const game = state.session?.game;
    const entries = deckEntries();
    const key = entries.map((entry) => `${entry.kind}:${entry.id}:${entry.unit?.entityId ?? ""}`).join("|");
    if (key !== deckKey) {
      deckKey = key;
      const empties = Math.max(0, maxTeam - entries.length);
      deckEl.innerHTML = entries.map((entry) => {
        const hero = heroById.get(entry.id);
        const attr = entry.kind === "unit" ? `data-deck-unit="${entry.unit.entityId}"` : `data-deck-fallen="${entry.id}"`;
        return `<button type="button" class="td-deck-slot${entry.kind === "fallen" ? " is-fallen" : ""}" ${attr}>` +
          `<img src="${hero.image}" alt="" width="40" height="40"><span class="td-deck-badge" data-deck-badge></span></button>`;
      }).join("") + `<span class="td-deck-empty" aria-hidden="true"></span>`.repeat(empties);
    }
    if (!game) return;
    deckEl.querySelectorAll<HTMLButtonElement>("[data-deck-unit]").forEach((button) => {
      const unit = game.heroes.find((entry: any) => entry.entityId === Number(button.dataset.deckUnit));
      if (!unit) return;
      button.classList.toggle("is-selected", unit.entityId === state.selectedEntityId);
      button.setAttribute("aria-label", `${unit.name}, level ${unit.level}. Show actions.`);
      button.querySelector<HTMLElement>("[data-deck-badge]")!.textContent = String(unit.level);
    });
    deckEl.querySelectorAll<HTMLButtonElement>("[data-deck-fallen]").forEach((button) => {
      const hero = heroById.get(button.dataset.deckFallen!);
      const teamFull = game.team.length >= maxTeam;
      button.disabled = game.complete || game.gold < hero.cost || teamFull;
      button.classList.toggle("is-selected", state.deployHeroId === hero.id);
      button.setAttribute("aria-label", `${hero.name} has fallen. Redeploy for ${hero.cost} gold${teamFull ? ", team full" : ""}.`);
      button.querySelector<HTMLElement>("[data-deck-badge]")!.textContent = `${hero.cost}g`;
    });
  }

  function cancelDeploy() {
    if (!state.deployHeroId) return;
    state.deployHeroId = "";
    if (state.session) state.session.game.uiPlacement = null;
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
      ctx.notice(game.wave === totalWaves ? `${bossName} has entered ${session.map.name}.` : `Wave ${game.wave} incoming. Heroes attack automatically.`);
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
    const fallenButton = target.closest<HTMLButtonElement>("[data-deck-fallen]");
    if (fallenButton && !fallenButton.disabled) {
      const hero = heroById.get(fallenButton.dataset.deckFallen!);
      ctx.actions.closePopover(false);
      ctx.actions.closeSheet(false);
      state.deployHeroId = state.deployHeroId === hero.id ? "" : hero.id;
      if (state.deployHeroId) ctx.notice(`Tap an empty ${hero.slot} ring to redeploy ${hero.name}.`);
      else session.game.uiPlacement = null;
      renderDeck();
    }
  });

  pauseButton.addEventListener("click", () => { pause.toggle("manual"); syncPauseButton(); });
  speedButton.addEventListener("click", () => {
    speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
    speedButton.textContent = `${speed}x`;
    speedButton.setAttribute("aria-label", `Game speed ${speed}x`);
  });

  // Speed clear counts down once the last enemy has spawned; 4 text updates a second.
  function tick(now: number) {
    const game = state.session?.game;
    if (!game?.running || game.quest?.type !== "speedClear" || game.quest.status !== "active" || now - lastQuestTick <= 250) return;
    lastQuestTick = now;
    previewEl.innerHTML = questChip(game);
  }

  // Boss entrance (P5): 2.5s nameplate over the map. Visual only; the run keeps
  // going and the entrance notice covers screen readers.
  function bossIntro() {
    const plate = q("[data-td-boss-plate]");
    const boss = ctx.data.boss;
    q("[data-td-boss-name]").textContent = bossName;
    q("[data-td-boss-sub]").textContent = [boss?.faction, boss?.class].filter(Boolean).join(" ");
    const art = q<HTMLImageElement>("[data-td-boss-art]");
    art.hidden = !boss?.image;
    if (boss?.image) art.src = boss.image;
    plate.hidden = false;
    plate.classList.remove("is-playing");
    void plate.offsetWidth; // restart the animation
    plate.classList.add("is-playing");
    window.clearTimeout(bossPlateTimer);
    bossPlateTimer = window.setTimeout(() => { plate.hidden = true; plate.classList.remove("is-playing"); }, 2500);
  }

  return { update, syncMainAction, renderPreview, questName, tick, bossIntro, renderDeck, cancelDeploy, syncPauseButton, speed: () => speed };
}

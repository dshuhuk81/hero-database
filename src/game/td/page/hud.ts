// HUD (gold, lives, wave, score), wave preview, main wave button, deck of deployed
// and fallen heroes, pause and speed buttons.
import type { PageContext } from "./context";

const QUEST_NAMES: Record<string, string> = { noLeaks: "No leaks", heroSurvival: "No hero falls", speedClear: "Speed clear", heroKills: "Slayer" };

const AUTO_NEXT_KEY = "td:autonext";
const AUTO_NEXT_MS = 10000;
// Gold jumps at least this big (wave clear, quest) count up with a "+N" float; kill gold updates instantly.
const GOLD_TWEEN_MIN = 25;
const GOLD_TWEEN_MS = 600;

const KIND_NAMES: Record<string, string> = { grunt: "Grunts", runner: "Runners", flyer: "Flyers", archer: "Archers", brute: "Brutes" };

export function createHud(ctx: PageContext) {
  const { q, state, store, pause, heroById, maxTeam, totalWaves, bossName } = ctx;
  const kindNames: Record<string, string> = { ...KIND_NAMES, boss: bossName };
  const previewEl = q("[data-td-preview]");
  const deckEl = q("[data-td-deck]");
  const mainAction = q<HTMLButtonElement>("[data-td-main-action]");
  const pauseButton = q<HTMLButtonElement>("[data-td-pause]");
  const speedButton = q<HTMLButtonElement>("[data-td-speed]");
  const autoButton = q<HTMLButtonElement>("[data-td-auto]");
  const goldEl = q("[data-td-gold]");
  const goldFloatEl = q("[data-td-gold-float]");
  let speed = 1;
  let autoNext = false;
  try { autoNext = localStorage.getItem(AUTO_NEXT_KEY) === "1"; } catch {}
  // Between-wave countdown (5E): armed once per cleared wave, frozen while held.
  let autoWave = -1;
  let autoLeft = AUTO_NEXT_MS;
  let lastFrame = 0;
  let shownGold = 0;
  let goldTween: { from: number; to: number; start: number } | null = null;
  let deckKey = "";
  let lastQuestTick = 0;
  let bossPlateTimer = 0;

  function update() {
    const game = state.session?.game;
    if (!game) return;
    updateGold(game.gold);
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
    const label = game.wave === totalWaves - 1 ? `Face ${bossName}` : `Start wave ${game.wave + 1}`;
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
    if (goldTween && gold > goldTween.to) { goldTween.to = gold; return; } // kill gold during a count-up
    goldTween = null;
    shownGold = gold;
    goldEl.textContent = String(gold);
  }

  function countdownActive() {
    const session = state.session;
    const game = session?.game;
    return autoNext && !!session?.started && !!game && !game.running && !game.complete && game.wave > 0 && autoWave === game.wave;
  }

  // Held while the player is deciding: blessing offer, a panel or manual pause, the recruit sheet.
  const countdownHeld = (game: any) => !!game.virtueOffer || pause.paused || !!state.pendingSlot;

  function syncAutoButton() {
    autoButton.setAttribute("aria-pressed", String(autoNext));
    autoButton.classList.toggle("is-on", autoNext);
    autoButton.title = autoNext ? "Auto-start next wave after 10 seconds: on" : "Auto-start next wave after 10 seconds: off";
  }

  const questName = (quest: any) => QUEST_NAMES[quest.type] ?? quest.type;

  function questGoal(quest: any, game: any) {
    if (quest.type === "noLeaks") return "Let no enemy through";
    if (quest.type === "heroSurvival") return "Keep every hero alive";
    if (quest.type === "heroKills") return `${quest.heroName} lands ${quest.target} kills (${Math.min(quest.kills, quest.target)}/${quest.target})`;
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

// Expedition (M21) on the page: the Expedition screen (start, continue, abandon, camp
// choice), its card on the main menu and recording a finished stage for the result screen. Rules live in ../expedition.js.
import { classIconImg } from "../assets.js";
import { chooseCamp, EXPEDITION, finishStage, newExpedition } from "../expedition.js";
import { RUN_BOON_INFO } from "../skills.js";
import type { PageContext } from "./context";
import type { ExpeditionState, SaveData } from "./save";

const relicInfo = RUN_BOON_INFO as Record<string, { name: string; text: string }>;

// Records a finished stage (skipped for debug runs): moves on to the camp, finishes the
// expedition (with its Favor) or ends it on a loss. Returns the result screen line.
// The caller persists the save.
export function finishExpeditionStage(save: SaveData, game: any, state: ExpeditionState, data: any, record: boolean) {
  const total = state.stages.length;
  const result = finishStage(state, { won: !!game.won, lives: game.lives ?? 0 }, data);
  let reward = 0;
  if (record) {
    save.expedition = result.state as ExpeditionState | null;
    save.expeditionBest = { ...save.expeditionBest, stages: Math.max(save.expeditionBest.stages, result.cleared) };
    if (result.outcome === "complete") {
      reward = EXPEDITION.completeFavor;
      save.favor = (save.favor || 0) + reward;
      save.expeditionBest.completed += 1;
    }
  }
  const text = result.outcome === "camp"
    ? `Stage ${result.cleared} of ${total} cleared with ${game.lives} lives left. Choose your reward at the camp on the Expedition screen, then continue.`
    : result.outcome === "complete"
      ? `Expedition complete: all ${total} stages cleared.${reward ? ` +${reward} Favor.` : ""}`
      : `The expedition ends at stage ${state.stage + 1} of ${total} (${result.cleared} cleared).`;
  return { outcome: result.outcome, text, reward };
}

export function createExpedition(ctx: PageContext) {
  const { q, data, store, heroById } = ctx;
  const stageEl = q("[data-td-exp-stage]");
  const titleEl = q("[data-td-exp-title]");
  const copyEl = q("[data-td-exp-copy]");
  const startButton = q<HTMLButtonElement>("[data-td-exp-start]");
  const abandonButton = q<HTMLButtonElement>("[data-td-exp-abandon]");
  const campEl = q("[data-td-exp-camp]");
  const cardsEl = q("[data-td-exp-cards]");
  const detailsEl = q("[data-td-exp-details]");
  const rosterEl = q("[data-td-exp-roster]");
  const relicsEl = q("[data-td-exp-relics]");
  const bestEl = q("[data-td-exp-best]");
  const summaryTitleEl = q("[data-td-exp-summary-title]");
  const summaryEl = q("[data-td-exp-summary]");
  let abandonArmed = false;

  const mapOf = (id: string) => data.maps.find((map: any) => map.id === id);
  const heroItem = (id: string, veteran: boolean) => {
    const hero = heroById.get(id);
    return `<li class="td-daily-hero"><img src="${hero.image}" alt="" width="36" height="36" loading="lazy"><span><strong>${classIconImg(hero.class, 14)}${hero.name}</strong><small>${hero.slot === "road" ? "Road" : "Platform"}${veteran ? " - veteran (enters at level 2)" : ""}</small></span></li>`;
  };

  function cardHtml(card: any, index: number, state: ExpeditionState) {
    if (card.type === "hero") {
      const hero = heroById.get(card.id);
      return `<button type="button" class="td-mutator" data-exp-card="${index}"><strong>Recruit ${hero.name}</strong><small>${hero.class}, ${hero.slot === "road" ? "road" : "platform"}. Joins the roster for the rest of the expedition.</small><span class="td-exp-cost">Costs ${Math.min(EXPEDITION.recruitLives, state.lives - 1)} lives</span></button>`;
    }
    if (card.type === "relic") {
      const names = card.ids.map((id: string) => relicInfo[id]?.name ?? id).join(" and ");
      const texts = card.ids.map((id: string) => relicInfo[id]?.text ?? "").join(" ");
      return `<button type="button" class="td-mutator" data-exp-card="${index}"><strong>Relics: ${names}</strong><small>${texts} Active from wave 1 of every stage.</small></button>`;
    }
    const names = card.ids.map((id: string) => heroById.get(id)?.name ?? id).join(", ");
    return `<button type="button" class="td-mutator" data-exp-card="${index}"><strong>Drill</strong><small>${names} enter every stage at level ${EXPEDITION.veteranLevel}.</small></button>`;
  }

  function render() {
    const state = store.data.expedition;
    const best = store.data.expeditionBest;
    bestEl.textContent = best.stages ? `Best: ${best.stages} ${best.stages === 1 ? "stage" : "stages"} cleared, ${best.completed} ${best.completed === 1 ? "expedition" : "expeditions"} completed.` : "No expedition yet.";
    abandonButton.hidden = !state;
    abandonButton.textContent = abandonArmed ? "Confirm abandon" : "Abandon";
    detailsEl.hidden = !state;
    if (!state) {
      stageEl.textContent = "";
      titleEl.textContent = "Three battlefields, one squad";
      copyEl.textContent = `Start with ${EXPEDITION.startHeroes} random heroes and clear the three battlefields in a row, each tougher than the last. Lives carry over, gold does not. After each stage, take a new hero, a pair of relics or a drill for your squad. Divine Blessings apply. Finishing pays +${EXPEDITION.completeFavor} Favor.`;
      startButton.textContent = "Start expedition";
      startButton.hidden = false;
      campEl.hidden = true;
      summaryTitleEl.textContent = "Start";
      summaryEl.textContent = `Three battlefields, one squad. +${EXPEDITION.completeFavor} Favor.`;
      return;
    }
    const map = mapOf(state.stages[state.stage]);
    summaryTitleEl.textContent = `Stage ${state.stage + 1} of ${state.stages.length}`;
    summaryEl.textContent = `${state.lives} lives left.${state.camp ? " Camp reward waiting." : ` Next: ${map?.name ?? state.stages[state.stage]}.`}`;
    stageEl.textContent = `Stage ${state.stage + 1} of ${state.stages.length}`;
    titleEl.textContent = `${map?.name ?? state.stages[state.stage]} - Boss: ${ctx.bossFor(map).name}`;
    copyEl.textContent = `${state.lives} lives left. Enemies at ${Math.round(EXPEDITION.stageHp[Math.min(state.stage, EXPEDITION.stageHp.length - 1)] * 100)}% of Normal health.${state.camp ? " Take one camp reward to continue." : ""}`;
    rosterEl.innerHTML = state.roster.map((id) => heroItem(id, state.veterans.includes(id))).join("");
    relicsEl.innerHTML = state.relics.length
      ? state.relics.map((id) => `<li class="td-daily-mutator"><span><strong>${relicInfo[id]?.name ?? id}</strong><small>${relicInfo[id]?.text ?? ""}</small></span></li>`).join("")
      : `<li><small>None yet.</small></li>`;
    campEl.hidden = !state.camp;
    cardsEl.innerHTML = state.camp ? state.camp.map((card, i) => cardHtml(card, i, state)).join("") : "";
    cardsEl.querySelector("button")?.setAttribute("data-td-autofocus", ""); // the screen opens on the first camp choice
    startButton.hidden = !!state.camp;
    startButton.textContent = "Continue";
  }

  function start() {
    let state = store.data.expedition;
    if (!state) {
      state = newExpedition(Math.floor(Math.random() * 2 ** 31), data) as ExpeditionState;
      store.data.expedition = state;
      store.persist();
    }
    if (state.camp) { render(); return; }
    const map = mapOf(state.stages[state.stage]);
    if (map) ctx.actions.startSession(map, { expedition: state });
  }

  startButton.addEventListener("click", start);
  abandonButton.addEventListener("click", () => {
    if (!abandonArmed) { abandonArmed = true; render(); return; }
    abandonArmed = false;
    store.data.expedition = null;
    store.persist();
    render();
    startButton.focus({ preventScroll: true }); // the Abandon button is gone now
    ctx.notice("Expedition abandoned.");
  });
  cardsEl.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-exp-card]");
    const state = store.data.expedition;
    if (!button || !state?.camp) return;
    const card = state.camp[Number(button.dataset.expCard)];
    store.data.expedition = chooseCamp(state, Number(button.dataset.expCard)) as ExpeditionState;
    store.persist();
    render();
    ctx.notice(card?.type === "hero" ? `${heroById.get(card.id)?.name} joins the expedition.` : card?.type === "relic" ? "Relics packed for the next stage." : "Your squad drilled: veterans enter at level 2.");
    startButton.focus({ preventScroll: true });
  });

  return { render, start };
}

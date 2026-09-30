// Expedition (M21) on the page: the Expedition screen (start, continue, abandon, camp
// choice), its summary for the home screen and recording a finished stage for the result screen. Rules live in ../expedition.js.
import { bossSprite } from "../assets.js";
import { mapSceneFor } from "../map-scene.js";
import { chooseCamp, EXPEDITION, finishStage, newExpedition } from "../expedition.js";
import { addSeals } from "../campaign.js";
import summonData from "../../../data/tdSummon.json" with { type: "json" };
import { RUN_BOON_INFO } from "../skills.js";
import type { PageContext } from "./context";
import type { ExpeditionState, SaveData } from "./save";
import { roman } from "./route";
import { trialCardHtml } from "./daily";

// Divine Seals for a finished expedition, on top of the Favor (summon currency, M26).
const EXP_SEALS: number = (summonData as any).sealSources?.expeditionComplete ?? 0;
const sealsText = EXP_SEALS ? ` + ${EXP_SEALS} Seals` : "";

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
      save.campaign = addSeals(save.campaign, EXP_SEALS) as SaveData["campaign"];
      save.expeditionBest.completed += 1;
    }
  }
  const text = result.outcome === "camp"
    ? `Stage ${result.cleared} of ${total} cleared with ${game.lives} lives left. Choose your reward at the camp on the Expedition screen, then continue.`
    : result.outcome === "complete"
      ? `Expedition complete: all ${total} stages cleared.${reward ? ` +${reward} Favor${EXP_SEALS ? `, +${EXP_SEALS} Divine Seals` : ""}.` : ""}`
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
  const rosterCountEl = q("[data-td-exp-roster-count]");
  const relicsBoxEl = q("[data-td-exp-relics-box]");
  const rulesEl = q("[data-td-exp-rules]");
  const statusEl = q("[data-td-exp-status]");
  const routeEl = q("[data-td-exp-route]");
  const routeNoteEl = q("[data-td-exp-route-note]");
  const stepsEl = q("[data-td-exp-steps]");
  const bossArtEl = q<HTMLImageElement>("[data-td-exp-boss-art]");
  const relicsEl = q("[data-td-exp-relics]");
  const bestEl = q("[data-td-exp-best]");
  let abandonArmed = false;

  const mapOf = (id: string) => data.maps.find((map: any) => map.id === id);
  const hpPct = (stage: number) => Math.round(EXPEDITION.stageHp[Math.min(stage, EXPEDITION.stageHp.length - 1)] * 100);
  const icon = (path: string) => `<svg class="td-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}" fill="none" /></svg>`;
  const RELIC_ICON = "M12 3l2.2 6.3L20.5 12l-6.3 2.7L12 21l-2.2-6.3L3.5 12l6.3-2.7z";
  const DRILL_ICON = "M4 20l6-6M14 4l6 6-8 8-6-6zM16 8l-2-2";

  // One battlefield on the route: its map art, boss and stage health. Before the start the
  // order is still random, so the stops show only their stage number and health.
  function stopHtml(mapId: string | null, index: number, state: "done" | "current" | "ahead") {
    const map = mapId ? mapOf(mapId) : null;
    const art = map ? mapSceneFor(map)?.assets.terrain : null;
    const label = state === "done" ? "Cleared" : state === "current" ? "Next battle" : "Ahead";
    return `<li class="td-exp-stop is-${state}">${art ? `<img class="td-exp-stop-art" src="${art}" alt="">` : ""}` +
      `<span class="td-exp-stop-num">${roman(index + 1)}</span>` +
      `<span class="td-exp-stop-copy"><strong>${map?.name ?? "Unknown battlefield"}</strong>` +
      `<small>${map ? `Boss: ${ctx.bossFor(map).name} · ` : ""}Enemies at ${hpPct(index)}% health</small>` +
      `<span class="td-exp-stop-state">${state === "done" ? "✓ " : ""}${label}</span></span></li>`;
  }

  function cardHtml(card: any, index: number, state: ExpeditionState) {
    if (card.type === "hero") {
      const hero = heroById.get(card.id);
      return `<button type="button" class="td-exp-choice td-exp-choice--hero" data-exp-card="${index}"><img class="td-exp-choice-art" src="${hero.portrait ?? hero.image}" alt="" loading="lazy">` +
        `<span class="td-label">Recruit</span><strong>${hero.name}</strong><small>${hero.class} · ${hero.slot === "road" ? "Road" : "Platform"}. Joins the roster for the rest of the expedition.</small>` +
        `<span class="td-exp-cost">Costs ${Math.min(EXPEDITION.recruitLives, state.lives - 1)} lives</span></button>`;
    }
    if (card.type === "relic") {
      const names = card.ids.map((id: string) => relicInfo[id]?.name ?? id).join(" + ");
      const texts = card.ids.map((id: string) => relicInfo[id]?.text ?? "").join(" ");
      return `<button type="button" class="td-exp-choice td-exp-choice--relic" data-exp-card="${index}"><span class="td-exp-choice-icon">${icon(RELIC_ICON)}</span>` +
        `<span class="td-label">Relics</span><strong>${names}</strong><small>${texts} Active from wave 1 of every stage.</small></button>`;
    }
    const names = card.ids.map((id: string) => heroById.get(id)?.name ?? id).join(", ");
    return `<button type="button" class="td-exp-choice td-exp-choice--drill" data-exp-card="${index}"><span class="td-exp-choice-icon">${icon(DRILL_ICON)}</span>` +
      `<span class="td-label">Drill</span><strong>Veteran training</strong><small>${names} enter every stage at level ${EXPEDITION.veteranLevel}.</small></button>`;
  }

  function render() {
    const state = store.data.expedition;
    const best = store.data.expeditionBest;
    const stops = state ? state.stages.length : Math.min(EXPEDITION.stages, data.maps.filter((map: any) => !map.campaignOnly).length);
    bestEl.textContent = best.stages ? `Best: ${best.stages} ${best.stages === 1 ? "stage" : "stages"} cleared, ${best.completed} ${best.completed === 1 ? "expedition" : "expeditions"} completed.` : "No expedition yet.";
    abandonButton.hidden = !state;
    abandonButton.textContent = abandonArmed ? "Confirm abandon" : "Abandon";
    detailsEl.hidden = !state;
    relicsBoxEl.hidden = !state?.relics.length;
    stepsEl.hidden = !!state;
    bossArtEl.hidden = !state;
    rulesEl.innerHTML = [`${stops} battlefields`, "Normal", "Lives carry over", "Divine Blessings apply", "No shard boosts"].map((rule) => `<li>${rule}</li>`).join("");
    q("[data-td-exp-step-squad]").textContent = `Start with ${EXPEDITION.startHeroes} random heroes. Only they can be deployed.`;
    if (!state) {
      stageEl.textContent = "";
      titleEl.textContent = "Three battlefields, one squad";
      copyEl.textContent = `Clear ${stops} battlefields in a row with the heroes you are given, and grow the squad at camp between battles.`;
      statusEl.className = "td-trial-reward td-exp-status";
      statusEl.innerHTML = `<span class="td-label">Complete all ${stops}</span><strong>+${EXPEDITION.completeFavor} <small>Favor${sealsText}</small></strong><span class="td-trial-reward-state">Paid once per expedition</span>`;
      routeNoteEl.textContent = "Order is drawn at the start";
      routeEl.innerHTML = Array.from({ length: stops }, (_, i) => stopHtml(null, i, "ahead")).join("");
      startButton.textContent = "Start expedition";
      startButton.hidden = false;
      campEl.hidden = true;
      return;
    }
    const map = mapOf(state.stages[state.stage]);
    stageEl.textContent = `Stage ${state.stage + 1} of ${state.stages.length}`;
    titleEl.textContent = map?.name ?? state.stages[state.stage];
    copyEl.innerHTML = state.camp
      ? `Battle won. Take one camp reward, then face <strong>${ctx.bossFor(map).name}</strong>.`
      : `Next boss: <strong>${ctx.bossFor(map).name}</strong>. Enemies at ${hpPct(state.stage)}% of Normal health.`;
    const bossArt = bossSprite(ctx.bossFor(map).id ?? map?.boss ?? "baphomet");
    if (bossArtEl.getAttribute("src") !== bossArt) bossArtEl.src = bossArt;
    statusEl.className = "td-trial-reward td-exp-status is-lives";
    statusEl.innerHTML = `<span class="td-label">Lives left</span><strong><svg class="td-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z" /></svg>${state.lives}</strong><span class="td-trial-reward-state">Finish for +${EXPEDITION.completeFavor} Favor${sealsText}</span>`;
    routeNoteEl.textContent = `${state.stage} of ${state.stages.length} cleared`;
    routeEl.innerHTML = state.stages.map((id, i) => stopHtml(id, i, i < state.stage ? "done" : i === state.stage ? "current" : "ahead")).join("");
    rosterCountEl.textContent = `${state.roster.length} ${state.roster.length === 1 ? "hero" : "heroes"}`;
    rosterEl.innerHTML = state.roster.map((id, i) => trialCardHtml(heroById.get(id), i, state.veterans.includes(id) ? `Lv ${EXPEDITION.veteranLevel}` : `${heroById.get(id).cost}g`)).join("");
    relicsEl.innerHTML = state.relics.map((id) => `<li title="${relicInfo[id]?.text ?? ""}"><strong>${relicInfo[id]?.name ?? id}</strong>${relicInfo[id]?.text ?? ""}</li>`).join("");
    campEl.hidden = !state.camp;
    cardsEl.innerHTML = state.camp ? state.camp.map((card, i) => cardHtml(card, i, state)).join("") : "";
    cardsEl.querySelector("button")?.setAttribute("data-td-autofocus", ""); // the screen opens on the first camp choice
    startButton.hidden = !!state.camp;
    startButton.textContent = `Continue to stage ${state.stage + 1}`;
  }

  // Home screen data (home.ts): the stage an expedition in progress is on, and its camp.
  function homeSummary() {
    const state = store.data.expedition;
    return state ? { stage: state.stage, stages: state.stages.length, lives: state.lives, camp: !!state.camp } : null;
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

  return { render, start, homeSummary };
}

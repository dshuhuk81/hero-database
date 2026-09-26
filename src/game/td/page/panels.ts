// Panels (menu, Blessings, help, save): modal open/close with focus restore and a
// "panel" pause reason, or embedded in a menu screen (M22), the Blessings tabs, the
// Divine Blessings graph (blessings.ts) and the This run tab.
import { buildRunTuning } from "../favor.js";
import { createBlessingsGraph } from "./blessings";
import { boonCard, mechanicBoonCard } from "./boons";
import type { PageContext } from "./context";
import { availableFavor, modeBest } from "./save";

export function createPanels(ctx: PageContext, deps: { renderSavePanel(): void }) {
  const { root, q, state, store, data, pause, blessingNames } = ctx;
  const panelLayer = q("[data-td-panel-layer]");
  let activePanel: HTMLElement | null = null;
  let panelReturnFocus: HTMLElement | null = null;
  let blessingsTab: "favor" | "run" = "favor";

  const computeAvailableFavor = () => availableFavor(store.data);
  const graph = createBlessingsGraph(ctx, {
    appliesNow: () => favorAppliesNow(),
    onChange() {
      applyFavorToPreparedRun();
      renderFavorNote();
      ctx.actions.renderLobby();
      syncSpendButton();
    },
  });

  function render(name: string) {
    if (name === "menu") renderMenu();
    if (name === "blessings") renderBlessingsPanel();
    if (name === "save") deps.renderSavePanel();
  }

  // Modal (during a run) and embedded (menu screen) use the same panel element; it moves
  // between the modal layer and its screen host.
  function setEmbedded(panel: HTMLElement, embedded: boolean) {
    panel.classList.toggle("is-embedded", embedded);
    if (embedded) { panel.removeAttribute("role"); panel.removeAttribute("aria-modal"); }
    else { panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); }
  }

  // Shows a panel inside a menu screen: no modal layer, no pause, no focus trap.
  function embed(name: string, host: HTMLElement) {
    const panel = root.querySelector<HTMLElement>(`[data-td-panel="${name}"]`);
    if (!panel) return;
    if (activePanel === panel) close(false);
    if (panel.parentElement !== host) host.append(panel);
    setEmbedded(panel, true);
    render(name);
    panel.hidden = false;
  }

  function open(name: string, opener?: HTMLElement | null) {
    const panel = root.querySelector<HTMLElement>(`[data-td-panel="${name}"]`);
    if (!panel) return;
    if (panel.parentElement !== panelLayer) { panelLayer.append(panel); setEmbedded(panel, false); }
    if (activePanel) activePanel.hidden = true;
    else panelReturnFocus = opener ?? (document.activeElement as HTMLElement | null);
    render(name);
    panelLayer.hidden = false;
    panel.hidden = false;
    panel.scrollTop = 0;
    activePanel = panel;
    pause.add("panel");
    panel.focus({ preventScroll: true });
  }

  function close(restoreFocus = true) {
    if (!activePanel) return;
    activePanel.hidden = true;
    activePanel = null;
    panelLayer.hidden = true;
    pause.remove("panel");
    const target = panelReturnFocus;
    panelReturnFocus = null;
    if (restoreFocus && target?.isConnected) target.focus({ preventScroll: true });
  }

  function renderMenu() {
    ctx.actions.updateHud();
    q("[data-td-menu-best]").textContent = modeBest(store.data, state.session?.game.mode ?? state.selectedMode, state.session?.game.tier ?? state.selectedTier).toLocaleString();
    q<HTMLButtonElement>("[data-td-restart]").hidden = !state.session;
    ctx.actions.syncAudioUi();
  }

  // Favor can always be spent. Before anything is deployed the current run is
  // rebuilt with it; otherwise it takes effect when the next run starts.
  function favorAppliesNow() {
    const session = state.session;
    return !session || (!session.started && session.game.heroes.length === 0);
  }

  function renderBlessingsPanel() {
    renderFavorTree();
    renderRunTab();
    const session = state.session;
    selectTab(session?.started && !session.game.complete ? blessingsTab : "favor");
  }

  function selectTab(tab: "favor" | "run") {
    blessingsTab = tab;
    root.querySelectorAll<HTMLButtonElement>("[data-td-tab]").forEach((button) => {
      const active = button.dataset.tdTab === tab;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    root.querySelectorAll<HTMLElement>("[data-td-tabpanel]").forEach((panel) => { panel.hidden = panel.dataset.tdTabpanel !== tab; });
    if (tab === "favor") graph.ensureFit();
  }

  function renderFavorNote() {
    const session = state.session;
    q("[data-td-favor-note]").textContent = !favorAppliesNow()
      ? session?.game.complete ? "Purchases apply from your next run. Retry to use them." : "Run in progress: purchases apply from your next run."
      : session ? "Purchases apply to this run right away." : "Purchases apply when your next run starts.";
  }

  function renderFavorTree() {
    renderFavorNote();
    graph.render();
  }

  function syncSpendButton() {
    const available = computeAvailableFavor();
    q("[data-td-spend-count]").textContent = `(${available})`;
    q("[data-td-spend]").hidden = available <= 0;
  }

  function applyFavorToPreparedRun() {
    const session = state.session;
    if (!session || !favorAppliesNow()) return;
    // Nothing is deployed yet, so the run can be rebuilt from the new snapshot.
    session.game.tuning = buildRunTuning(data.tuning, store.data.favLevels, session.boost);
    session.favLevels = { ...store.data.favLevels };
    session.game.reset();
    pause.sync();
    ctx.actions.updateHud();
  }

  function renderRunTab() {
    const panel = q("[data-td-tabpanel='run']");
    const game = state.session?.game;
    const virtues: string[] = game?.virtues ?? [];
    const pairs: any[] = game?.activePairs ?? [];
    const boons: string[] = game?.boons ?? [];
    const synergies = game ? game.activeSynergyCount() : 0;
    if (!game || (!virtues.length && !pairs.length && !boons.length && !synergies)) {
      panel.innerHTML = `<p class="td-favor-note">No run blessings yet. Clearing a wave can offer a blessing that lasts for the rest of the run.</p>`;
      return;
    }
    const cards = virtues.map((name) => boonCard({ tag: "div", name: blessingNames[name] ?? name, effect: data.tuning.virtueEffects[name], compact: true })).join("");
    const pairCards = pairs.map((pair) => boonCard({ tag: "div", name: pair.name, effect: pair.effect, compact: true, pair: true, badge: "Pair bonus" })).join("");
    const boonCards = boons.map((id) => mechanicBoonCard(id, data.tuning.runBoons?.list?.[id]?.rarity ?? "rare", { tag: "div", compact: true })).join("");
    panel.innerHTML = `<div class="td-boon-grid">${boonCards}${pairCards}${cards}</div>` +
      `<p class="td-favor-note">${synergies} active synergy link${synergies === 1 ? "" : "s"} between deployed heroes.</p>`;
  }

  panelLayer.addEventListener("click", (event) => { if (event.target === panelLayer) close(); });

  const tabList = q(".td-tabs");
  tabList.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-td-tab]");
    if (button) selectTab(button.dataset.tdTab as "favor" | "run");
  });
  tabList.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const next = blessingsTab === "favor" ? "run" : "favor";
    selectTab(next);
    q<HTMLButtonElement>(`[data-td-tab="${next}"]`).focus();
  });

  return { open, close, embed, active: () => activePanel, selectTab, renderRunTab, syncSpendButton, computeAvailableFavor };
}

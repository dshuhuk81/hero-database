// Modal panels (menu, Blessings, help, save): open/close with focus restore and a
// "panel" pause reason, the Blessings tabs, the Divine Blessings (Favor) tree and
// the This run tab.
import { buildRunTuning, canUnlock, isFavorNodeActive } from "../favor.js";
import { boonCard } from "./boons";
import type { PageContext } from "./context";
import { availableFavor } from "./save";

export function createPanels(ctx: PageContext, deps: { renderSavePanel(): void }) {
  const { root, q, state, store, data, pause, blessingNames } = ctx;
  const favorTreeData: any[] = data.favorTree || [];
  const panelLayer = q("[data-td-panel-layer]");
  let activePanel: HTMLElement | null = null;
  let panelReturnFocus: HTMLElement | null = null;
  let blessingsTab: "favor" | "run" = "favor";

  const computeAvailableFavor = () => availableFavor(store.data, favorTreeData);

  function open(name: string, opener?: HTMLElement | null) {
    const panel = root.querySelector<HTMLElement>(`[data-td-panel="${name}"]`);
    if (!panel) return;
    if (activePanel) activePanel.hidden = true;
    else panelReturnFocus = opener ?? (document.activeElement as HTMLElement | null);
    if (name === "menu") renderMenu();
    if (name === "blessings") renderBlessingsPanel();
    if (name === "save") deps.renderSavePanel();
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
    q("[data-td-menu-best]").textContent = store.data.bestScore.toLocaleString();
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
  }

  function renderFavorTree() {
    const session = state.session;
    const available = computeAvailableFavor();
    const now = favorAppliesNow();
    q("[data-td-favor-available]").textContent = String(available);
    q("[data-td-favor-note]").textContent = !now
      ? session?.game.complete ? "Purchases apply from your next run. Retry to use them." : "Run in progress: purchases apply from your next run."
      : session ? "Purchases apply to this run right away." : "Purchases apply when your next run starts.";
    const owned: string[] = store.data.favTree;
    const tiers = [...new Set(favorTreeData.map((node: any) => node.tier))].sort((a, b) => a - b);
    const icon = (path: string) => `<svg class="td-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}" /></svg>`;
    const lockIcon = icon("M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z");
    const checkIcon = icon("M5 12l5 5L19 7");
    // Each tier opens once enough nodes of the tier before it are owned; the
    // connector between columns and the pip meter show that gate.
    const parts = tiers.map((tier: number, index: number) => {
      const nodes = favorTreeData.filter((node: any) => node.tier === tier);
      const ownedHere = nodes.filter((node: any) => owned.includes(node.id)).length;
      let open = true;
      let gate = `<p class="td-tier-gate">No requirement</p>`;
      let connector = "";
      if (index > 0) {
        const prevTier = favorTreeData.filter((node: any) => node.tier === tiers[index - 1]);
        const requiresMin = nodes[0]?.requiresMin ?? prevTier.length;
        const have = prevTier.filter((node: any) => owned.includes(node.id)).length;
        open = have >= requiresMin;
        const pips = prevTier.map((_: any, pip: number) =>
          `<i class="td-pip${pip < have ? " is-filled" : ""}${pip === requiresMin - 1 ? " is-goal" : ""}"></i>`).join("");
        gate = `<p class="td-tier-gate"><span class="td-pips" aria-hidden="true">${pips}</span>` +
          `${open ? "Opened" : `Own ${requiresMin - have} more from Tier ${tiers[index - 1]}`}<span class="sr-only"> (${have} of ${requiresMin} required)</span></p>`;
        connector = `<div class="td-tier-link${open ? " is-open" : ""}" aria-hidden="true"><span>${icon("M9 6l6 6-6 6")}</span></div>`;
      }
      const cards = nodes.map((node: any) => {
        const unlocked = owned.includes(node.id);
        const active = isFavorNodeActive(node);
        const reqMet = canUnlock(node.id, owned, favorTreeData);
        const affordable = available >= node.cost;
        const pending = unlocked && !now && !!session && !session.favTree.includes(node.id);
        const status = unlocked ? "is-unlocked" : !active ? "is-inactive" : !reqMet ? "is-locked" : affordable ? "is-available" : "is-short";
        const badge = unlocked ? `<span class="td-node-badge">${checkIcon}<span class="sr-only">Unlocked</span></span>`
          : status === "is-locked" ? `<span class="td-node-badge">${lockIcon}<span class="sr-only">Locked</span></span>` : "";
        const chips = [
          pending ? `<span class="td-wave-chip td-wave-chip--pending">From next run</span>` : "",
          !active ? `<span class="td-wave-chip td-wave-chip--muted">Not active yet</span>` : "",
          status === "is-locked" ? `<span class="td-wave-chip td-wave-chip--muted">${node.cost} Favor</span>` : "",
        ].join("");
        const action = status === "is-available"
          ? `<button class="action-button action-button--primary" type="button" data-unlock="${node.id}">${node.cost} Favor</button>`
          : status === "is-short"
            ? `<button class="action-button action-button--quiet" type="button" data-unlock="${node.id}" disabled>${node.cost} Favor - need ${node.cost - available} more</button>`
            : "";
        return `<div class="td-blessing-node ${status}" data-node-id="${node.id}" tabindex="-1">` +
          `<div class="td-node-head"><strong>${node.name}</strong>${badge}</div><small>${node.description}</small>` +
          (chips ? `<div class="td-blessing-chips">${chips}</div>` : "") + action + `</div>`;
      }).join("");
      return connector + `<section class="td-blessings-tier${open ? "" : " is-locked"}" aria-label="Tier ${tier}">` +
        `<header class="td-tier-head"><span class="td-label">Tier ${tier}</span><span class="td-tier-count">${ownedHere}/${nodes.length}</span></header>` +
        gate + cards + `</section>`;
    }).join("");
    q("[data-td-favor-tree]").innerHTML = `<div class="td-blessings-tiers">${parts}</div>` +
      (store.data.favTree.length > 0 ? `<button type="button" class="td-respec" data-td-respec>Respec (refund all)</button>` : "");
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
    session.game.tuning = buildRunTuning(data.tuning, store.data.favTree, session.boost);
    session.game.reset();
    pause.sync();
    ctx.actions.updateHud();
  }

  function renderRunTab() {
    const panel = q("[data-td-tabpanel='run']");
    const game = state.session?.game;
    const virtues: string[] = game?.virtues ?? [];
    const pairs: any[] = game?.activePairs ?? [];
    const synergies = game ? game.activeSynergyCount() : 0;
    if (!game || (!virtues.length && !pairs.length && !synergies)) {
      panel.innerHTML = `<p class="td-favor-note">No run blessings yet. Clearing a wave can offer a blessing that lasts for the rest of the run.</p>`;
      return;
    }
    const cards = virtues.map((name) => boonCard({ tag: "div", name: blessingNames[name] ?? name, effect: data.tuning.virtueEffects[name], compact: true })).join("");
    const pairCards = pairs.map((pair) => boonCard({ tag: "div", name: pair.name, effect: pair.effect, compact: true, pair: true, badge: "Pair bonus" })).join("");
    panel.innerHTML = `<div class="td-boon-grid">${pairCards}${cards}</div>` +
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

  q("[data-td-favor-tree]").addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const unlock = target.closest<HTMLButtonElement>("[data-unlock]");
    if (unlock) {
      const id = unlock.dataset.unlock!;
      const node = favorTreeData.find((entry: any) => entry.id === id);
      if (!node || !isFavorNodeActive(node) || store.data.favTree.includes(id)) return;
      if (!canUnlock(id, store.data.favTree, favorTreeData) || computeAvailableFavor() < node.cost) return;
      store.data.favTree = [...store.data.favTree, id];
      store.persist();
      applyFavorToPreparedRun();
      renderFavorTree();
      ctx.actions.renderLobby();
      syncSpendButton();
      q(`[data-node-id="${id}"]`).focus({ preventScroll: true });
      return;
    }
    if (target.closest("[data-td-respec]")) {
      store.data.favTree = [];
      store.persist();
      applyFavorToPreparedRun();
      renderFavorTree();
      ctx.actions.renderLobby();
      syncSpendButton();
      activePanel?.focus({ preventScroll: true });
    }
  });

  return { open, close, active: () => activePanel, selectTab, renderRunTab, syncSpendButton, computeAvailableFavor };
}

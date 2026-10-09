// Home screen (War Camp, docs/tower-defense-home-camp-plan.md; markup in TdHome.astro):
// each mode on the rail opens its screen (the last played mode, ui.homeMode in the save,
// stays expanded), the objective shows the next campaign stage, and dock badges mark actions
// that can be taken right now. The mode screens themselves stay where they were.
import { campHomeArt, homeEmblemPath, loadTdImage } from "../assets.js";
import { canBuy, levelCost, TREE } from "../favor.js";
import { questBadgeText, questProgress } from "../quests.js";
import { resetText } from "./daily";
import { roman } from "./route";
import { availableFavor, isHomeMode, type HomeMode } from "./save";
import type { PageContext } from "./context";

type CampaignSummary = {
  next: { id: string; name: string } | null;
  chapter: { id: string; name: string };
  cleared: number;
  total: number;
  started: boolean;
  canSummon: boolean;
  canLevelUp: boolean;
};
type DailySummary = { mapName: string; cleared: boolean; best: number };
type ExpeditionSummary = { stage: number; stages: number; lives: number; camp: boolean } | null;
type GodSummary = { bossName: string; best: number };

type Deps = {
  campaign: { homeSummary(): CampaignSummary; focusNextStage(): void };
  daily: { homeSummary(): DailySummary };
  expedition: { homeSummary(): ExpeditionSummary };
  god: { homeSummary(): GodSummary };
};

// What the rail says for one mode.
type ModeView = { note: string; badge: string };

export function createHome(ctx: PageContext, deps: Deps) {
  const { root, q, store } = ctx;
  const modeButtons = [...root.querySelectorAll<HTMLButtonElement>(".td-camp-home [data-home-mode]")];
  const questKickerEl = q("[data-td-home-quest-kicker]");
  const questTitleEl = q("[data-td-home-quest-title]");
  const questNoteEl = q("[data-td-home-quest-note]");
  const questMeterEl = q("[data-td-home-quest-meter]");
  const dockButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-home-dock]")];

  // Solid fallback color (td.css) until the art arrives.
  q("[data-td-home-scene]").style.backgroundImage = `url("${campHomeArt()}")`;

  root.querySelectorAll<HTMLImageElement>("[data-home-emblem]").forEach((img) => loadTdImage(img, homeEmblemPath(img.dataset.homeEmblem)));

  const selected = (): HomeMode => store.data.ui.homeMode;

  // Favor covers the next level of a trunk blessing that is open to buy.
  function canBuyBlessing() {
    const favor = availableFavor(store.data);
    return TREE.nodes.some((node: any) => {
      if (node.tree !== "trunk" || !canBuy(node.id, store.data.favLevels).ok) return false;
      return levelCost(node, (store.data.favLevels[node.id] || 0) + 1) <= favor;
    });
  }

  function views(camp: CampaignSummary, daily: DailySummary, exp: ExpeditionSummary, god: GodSummary): Record<HomeMode, ModeView> {
    return {
      campaign: camp.next
        ? { note: `${camp.started ? "Continue" : "Begin"} ${camp.next.id}`, badge: "" }
        : { note: "Replay stages", badge: "" },
      daily: daily.cleared
        ? { note: `New in ${resetText()}`, badge: "" }
        : { note: "New trial", badge: "1" },
      expedition: exp
        ? { note: exp.camp ? "Camp reward waiting" : `Stage ${roman(exp.stage + 1)} of ${roman(exp.stages)}`, badge: "" }
        : { note: "Not started", badge: "" },
      god: god.best
        ? { note: `${god.bossName} · best ${god.best.toLocaleString()}`, badge: "" }
        : { note: `${god.bossName} awaits`, badge: "" },
    };
  }

  function render() {
    const camp = deps.campaign.homeSummary();
    const daily = deps.daily.homeSummary();
    const exp = deps.expedition.homeSummary();
    const all = views(camp, daily, exp, deps.god.homeSummary());
    const mode = selected();

    modeButtons.forEach((button) => {
      const id = button.dataset.homeMode as HomeMode;
      const view = all[id];
      const on = id === mode;
      button.classList.toggle("is-selected", on);
      button.toggleAttribute("data-td-autofocus", on); // the screen opens on the last played mode
      button.querySelector<HTMLElement>("[data-home-mode-note]")!.textContent = view.note;
      button.setAttribute("aria-label", `${button.querySelector("strong")?.textContent ?? ""}: ${view.note}`);
      const badge = button.querySelector<HTMLElement>("[data-home-mode-badge]")!;
      badge.hidden = !view.badge;
      badge.textContent = view.badge;
    });

    // Objective: the next campaign stage; the Daily Trial once every stage is cleared.
    questMeterEl.hidden = !camp.next;
    if (camp.next) {
      questKickerEl.textContent = "Next stage";
      questTitleEl.textContent = camp.next.name;
      questNoteEl.textContent = `Stage ${camp.next.id} · ${camp.cleared} of ${camp.total} cleared`;
      questMeterEl.style.setProperty("--td-home-progress", `${camp.total ? Math.round((camp.cleared / camp.total) * 100) : 0}%`);
    } else {
      questKickerEl.textContent = "Today";
      questTitleEl.textContent = daily.cleared ? "Daily Trial cleared" : "Today's Daily Trial";
      questNoteEl.textContent = daily.cleared ? `New trial in ${resetText()}` : `${daily.mapName} · first clear pays Favor and Seals`;
    }

    // Dock badges: only states the player can act on right now.
    const ready: Record<string, string> = {
      // Dot only for claimable tasks/chests. Today's activity is progress, not an action.
      quests: questProgress(store.data).claimable ? questBadgeText(store.data) : "",
      heroes: camp.canLevelUp ? "upgrade ready" : "",
      summon: camp.canSummon ? "summon available" : "",
      blessings: canBuyBlessing() ? "Favor to spend" : "",
    };
    dockButtons.forEach((button) => {
      const note = ready[button.dataset.homeDock!] ?? "";
      button.querySelector<HTMLElement>("[data-home-dock-badge]")!.hidden = !note;
      const label = button.querySelector(".td-camp-home-dock-label")?.textContent ?? "";
      button.setAttribute("aria-label", note ? `${label}, ${note}` : label);
    });
  }

  // A mode opens its screen and becomes the expanded one on the rail. Campaign opens the
  // stage list on the next stage.
  function launch(mode: HomeMode) {
    if (mode !== selected()) {
      store.data.ui = { ...store.data.ui, homeMode: mode };
      store.persist();
    }
    if (mode === "campaign") {
      deps.campaign.focusNextStage();
      ctx.actions.showScreen("stages");
    } else ctx.actions.showScreen(mode);
  }

  modeButtons.forEach((button) => button.addEventListener("click", () => {
    if (isHomeMode(button.dataset.homeMode)) launch(button.dataset.homeMode);
  }));

  // The Daily Trial reset countdown on the rail.
  setInterval(() => { if (root.dataset.screen === "home") render(); }, 60000);

  return { render };
}

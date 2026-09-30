// Home screen (War Camp, docs/tower-defense-home-camp-plan.md; markup in TdHome.astro):
// the mode rail picks what Play opens (the pick is kept in the save, ui.homeMode), the
// objective shows the next campaign stage, and dock badges mark actions that can be taken
// right now. The mode screens themselves stay where they were: Play only navigates.
import { campHomeArt } from "../assets.js";
import { canBuy, levelCost, TREE } from "../favor.js";
import { resetText } from "./daily";
import { roman } from "./route";
import { availableFavor, HOME_MODES, isHomeMode, type HomeMode } from "./save";
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

type Deps = {
  campaign: { homeSummary(): CampaignSummary; focusNextStage(): void };
  daily: { homeSummary(): DailySummary };
  expedition: { homeSummary(): ExpeditionSummary };
};

// What the rail, the Play button and its note say for one mode.
type ModeView = { note: string; kicker: string; playNote: string; badge: string };

export function createHome(ctx: PageContext, deps: Deps) {
  const { root, q, store, state } = ctx;
  const railEl = q("[data-td-home-modes]");
  const modeButtons = [...railEl.querySelectorAll<HTMLButtonElement>("[data-home-mode]")];
  const playButton = q<HTMLButtonElement>("[data-td-home-play]");
  const questTitleEl = q("[data-td-home-quest-title]");
  const questNoteEl = q("[data-td-home-quest-note]");
  const questMeterEl = q("[data-td-home-quest-meter]");
  const dockButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-home-dock]")];

  // Solid fallback color (td.css) until the art arrives.
  q("[data-td-home-scene]").style.backgroundImage = `url("${campHomeArt()}")`;

  const selected = (): HomeMode => store.data.ui.homeMode;

  // Favor covers the next level of a trunk blessing that is open to buy.
  function canBuyBlessing() {
    const favor = availableFavor(store.data);
    return TREE.nodes.some((node: any) => {
      if (node.tree !== "trunk" || !canBuy(node.id, store.data.favLevels).ok) return false;
      return levelCost(node, (store.data.favLevels[node.id] || 0) + 1) <= favor;
    });
  }

  function views(camp: CampaignSummary, daily: DailySummary, exp: ExpeditionSummary): Record<HomeMode, ModeView> {
    const best = store.data.bestScore;
    const boost = store.data.nextRunBoost;
    return {
      campaign: camp.next
        ? { note: `${camp.started ? "Continue" : "Begin"} ${camp.next.id}`, kicker: `Stage ${camp.next.id}`, playNote: camp.next.name, badge: "" }
        : { note: "All stages cleared", kicker: "Replay", playNote: "Replay stages for Gold and Hero XP", badge: "" },
      daily: daily.cleared
        ? { note: "Cleared today", kicker: "Today", playNote: `${daily.mapName} · new trial in ${resetText()}`, badge: "" }
        : { note: "New trial", kicker: "Today", playNote: `${daily.mapName} · resets in ${resetText()}`, badge: "1" },
      expedition: exp
        ? { note: exp.camp ? "Camp reward waiting" : `Stage ${roman(exp.stage + 1)} of ${roman(exp.stages)}`, kicker: `Stage ${roman(exp.stage + 1)}`, playNote: `${exp.lives} ${exp.lives === 1 ? "life" : "lives"} left${exp.camp ? " · camp reward waiting" : ""}`, badge: "" }
        : { note: "Not started", kicker: "New expedition", playNote: "Three battlefields, one squad", badge: "" },
      free: {
        note: best ? `Best ${best.toLocaleString()}` : "No runs yet",
        kicker: best ? `Best ${best.toLocaleString()}` : "First run",
        playNote: boost ? (boost.type === "gold" ? `Next run: +${boost.gold} gold` : `Next run: ${ctx.blessingNames[boost.virtue] ?? boost.virtue}`) : state.selectedMap.name,
        badge: "",
      },
    };
  }

  function render() {
    const camp = deps.campaign.homeSummary();
    const daily = deps.daily.homeSummary();
    const exp = deps.expedition.homeSummary();
    const all = views(camp, daily, exp);
    const mode = selected();

    modeButtons.forEach((button) => {
      const id = button.dataset.homeMode as HomeMode;
      const view = all[id];
      const on = id === mode;
      button.setAttribute("aria-checked", String(on));
      button.classList.toggle("is-selected", on);
      button.tabIndex = on ? 0 : -1;
      button.querySelector<HTMLElement>("[data-home-mode-note]")!.textContent = view.note;
      const badge = button.querySelector<HTMLElement>("[data-home-mode-badge]")!;
      badge.hidden = !view.badge;
      badge.textContent = view.badge;
    });

    const view = all[mode];
    playButton.dataset.mode = mode;
    q("[data-td-home-play-kicker]").textContent = view.kicker;
    q("[data-td-home-play-note]").textContent = view.playNote;
    playButton.setAttribute("aria-label", `Play ${modeButtons.find((b) => b.dataset.homeMode === mode)?.querySelector("strong")?.textContent ?? ""}: ${view.kicker}, ${view.playNote}`);

    // Objective: the next campaign stage; the Daily Trial once every stage is cleared.
    questMeterEl.hidden = !camp.next;
    if (camp.next) {
      questTitleEl.textContent = camp.next.name;
      questNoteEl.textContent = `Stage ${camp.next.id} · ${camp.cleared} of ${camp.total} cleared`;
      questMeterEl.style.setProperty("--td-home-progress", `${camp.total ? Math.round((camp.cleared / camp.total) * 100) : 0}%`);
    } else {
      questTitleEl.textContent = daily.cleared ? "Daily Trial cleared" : "Today's Daily Trial";
      questNoteEl.textContent = daily.cleared ? `New trial in ${resetText()}` : `${daily.mapName} · first clear pays Favor and Seals`;
    }

    // Dock badges: only states the player can act on right now.
    const ready: Record<string, string> = {
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

  function select(mode: HomeMode, focus = false) {
    if (mode !== selected()) {
      store.data.ui = { ...store.data.ui, homeMode: mode };
      store.persist();
    }
    render();
    if (focus) modeButtons.find((button) => button.dataset.homeMode === mode)?.focus();
  }

  // Play: open the selected mode's screen. Campaign opens the stage list on the next stage.
  function launch(mode = selected()) {
    if (mode === "campaign") {
      deps.campaign.focusNextStage();
      ctx.actions.showScreen("stages");
    } else ctx.actions.showScreen(mode === "free" ? "maps" : mode);
  }

  railEl.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-home-mode]");
    if (button && isHomeMode(button.dataset.homeMode)) select(button.dataset.homeMode);
  });
  // Radio group keys: arrows move and select; Enter launches the selected mode.
  railEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // no click: Enter plays instead of selecting again
      launch();
      return;
    }
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    const edge = event.key === "Home" ? 0 : event.key === "End" ? HOME_MODES.length - 1 : -1;
    if (!step && edge < 0) return;
    event.preventDefault();
    const index = HOME_MODES.indexOf(selected());
    select(edge >= 0 ? HOME_MODES[edge] : HOME_MODES[(index + step + HOME_MODES.length) % HOME_MODES.length], true);
  });
  playButton.addEventListener("click", () => launch());

  // The Daily Trial reset countdown on the rail and Play note.
  setInterval(() => { if (root.dataset.screen === "home") render(); }, 60000);

  return { render };
}

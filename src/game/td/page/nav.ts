// App navigation (M22): one screen at a time, either a menu screen (data-td-screen in
// TdLobby.astro) or the play screen. The screens form a small stack that is mirrored in
// browser history (one entry per screen, state { tdScreen, tdIndex }), so browser Back,
// the app bar back button and Escape all go one level up. During a run browser Back
// stays in the game and opens its menu instead (deps.onGameBack).
import type { PageContext } from "./context";

export type ScreenId = "home" | "maps" | "mode" | "daily" | "expedition" | "blessings" | "help" | "settings" | "save" | "glossary" | "play";

// One level up when there is no history entry to go back to (for example after a reload).
const PARENT: Record<ScreenId, ScreenId> = {
  home: "home", maps: "home", mode: "maps", daily: "home", expedition: "home", blessings: "home",
  help: "home", settings: "home", save: "settings", glossary: "home", play: "home",
};
const isScreen = (value: unknown): value is ScreenId => typeof value === "string" && value in PARENT;

export function createNav(ctx: PageContext, deps: { onShow(id: ScreenId): void; onGameBack(): void }) {
  const { root, q } = ctx;
  const menuEl = q("[data-td-lobby]");
  const playEl = q("[data-td-play]");
  const titleEl = q("[data-td-appbar-title]");
  const backButton = q<HTMLButtonElement>("[data-td-nav-back]");
  const screens = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>("[data-td-screen]").forEach((el) => screens.set(el.dataset.tdScreen!, el));

  let current: ScreenId = "home";
  let index = 0; // history index of the current entry (ours start at 0)
  const stack: ScreenId[] = []; // screen of each of our history entries; may have holes after a reload

  function render(id: ScreenId, focus = true) {
    current = id;
    root.dataset.screen = id;
    menuEl.hidden = id === "play";
    playEl.hidden = id !== "play";
    if (id !== "play") {
      screens.forEach((el, key) => { el.hidden = key !== id; });
      const screen = screens.get(id)!;
      titleEl.textContent = screen.dataset.title ?? "";
      backButton.hidden = id === "home";
      backButton.setAttribute("aria-label", `Back to ${screens.get(parentOf(id))?.dataset.title ?? "main menu"}`);
      screen.querySelector<HTMLElement>(".td-screen-body")?.scrollTo(0, 0);
    }
    deps.onShow(id);
    if (focus && id !== "play") {
      const screen = screens.get(id)!;
      const target = [...screen.querySelectorAll<HTMLElement>("[data-td-autofocus]")].find((el) => !el.closest("[hidden]")) ?? titleEl;
      target.focus({ preventScroll: true });
    }
  }

  // The screen below in the stack when known, else the fixed parent.
  function parentOf(id: ScreenId) {
    const below = index > 0 ? stack[index - 1] : undefined;
    return below && below !== id && below !== "play" ? below : PARENT[id];
  }

  function push(id: ScreenId) {
    index += 1;
    stack.length = index;
    stack[index] = id;
    history.pushState({ tdScreen: id, tdIndex: index }, "");
  }

  function replace(id: ScreenId) {
    stack[index] = id;
    history.replaceState({ tdScreen: id, tdIndex: index }, "");
  }

  // Shows a screen. If it is already further down the stack, history goes back to that
  // entry (the screen shows right away; the popstate that follows only confirms it).
  // Leaving the play screen for a new screen replaces the play entry.
  function go(id: ScreenId) {
    if (id === current) return;
    const below = stack.lastIndexOf(id, index - 1);
    if (below >= 0) {
      const delta = below - index;
      index = below;
      render(id);
      history.go(delta);
      return;
    }
    if (current === "play") replace(id);
    else push(id);
    render(id);
  }

  // Leaving a run: to the given screen, else back where the run was started from (the
  // map select for a normal run, the Daily Trial or Expedition screen for those).
  function exitPlay(target?: ScreenId) {
    const below = current === "play" && index > 0 ? stack[index - 1] : undefined;
    go(target ?? (below === "mode" ? "maps" : below && below !== "play" ? below : "home"));
  }

  function back() {
    if (current === "home" || current === "play") return;
    if (index > 0) history.back();
    else { replace(PARENT[current]); render(PARENT[current]); }
  }

  window.addEventListener("popstate", (event) => {
    const s = event.state;
    const id: ScreenId = isScreen(s?.tdScreen) ? s.tdScreen : "home";
    const i = typeof s?.tdIndex === "number" ? s.tdIndex : 0;
    if (current === "play" && id !== "play") {
      // Back during a run: stay in the game and let the page decide (menu, close a panel).
      index = i;
      stack[i] = id;
      push("play");
      deps.onGameBack();
      return;
    }
    if (id === "play" && current !== "play") { history.back(); return; } // a finished run's entry
    index = i;
    stack[i] = id;
    if (id !== current) render(id);
  });

  const isTyping = (target: EventTarget | null) => target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented || current === "play" || isTyping(event.target)) return;
    if (current === "home") return;
    event.preventDefault();
    back();
  });

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest<HTMLElement>("[data-td-go]");
    if (link && isScreen(link.dataset.tdGo)) { go(link.dataset.tdGo); return; }
    if (target.closest("[data-td-nav-back]")) back();
  });

  // First screen: a reload keeps the menu screen it was on; a run cannot survive one.
  function init() {
    const s = history.state;
    index = typeof s?.tdIndex === "number" ? s.tdIndex : 0;
    const id: ScreenId = isScreen(s?.tdScreen) && s.tdScreen !== "play" ? s.tdScreen : "home";
    replace(id);
    render(id, false);
  }

  return { go, back, exitPlay, init, current: () => current };
}

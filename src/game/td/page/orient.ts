// Portrait gate: the game has no portrait layout, so phones held upright get a full-screen
// "Rotate your phone" cover over every screen (menus included). It is a modal <dialog> so it
// sits in the top layer above the other modal dialogs, cannot be dismissed (Escape is
// swallowed), and pauses the run while shown. Turning back to landscape closes it and lifts
// the pause; the run and every open screen stay as they were. Where element full screen
// exists, a button enters it and asks the browser to lock landscape (Android); the gate
// itself stays the dependable part.
import type { PageContext } from "./context";

// Touch phones only: narrow desktop windows (fine pointer) and tablets (768px+ wide in
// portrait) keep playing.
const PHONE_PORTRAIT = "(orientation: portrait) and (pointer: coarse) and (max-width: 767px)";

export function createOrientGate(ctx: PageContext) {
  const { q, pause } = ctx;
  const gate = q<HTMLDialogElement>("[data-td-orient-gate]");
  const fullscreenButton = q<HTMLButtonElement>("[data-td-orient-fullscreen]");
  const shell = gate.closest<HTMLElement>("[data-td-root]")!;
  const doc = document as any;
  const query = matchMedia(PHONE_PORTRAIT);

  const isFullscreen = () => Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
  const canFullscreen = Boolean(document.fullscreenEnabled || doc.webkitFullscreenEnabled);

  function syncFullscreenButton() {
    fullscreenButton.hidden = !canFullscreen || isFullscreen();
  }

  function sync() {
    if (query.matches) {
      pause.add("orient");
      syncFullscreenButton();
      // Reopen so the gate lands above any modal dialog opened since.
      if (gate.open) gate.close();
      gate.showModal();
    } else {
      if (gate.open) gate.close();
      pause.remove("orient");
    }
  }

  async function enterFullscreen() {
    try {
      await (shell.requestFullscreen ?? (shell as any).webkitRequestFullscreen)?.call(shell, { navigationUI: "hide" });
      await (screen.orientation as any)?.lock?.("landscape");
    } catch {} // lock is an enhancement; rotating by hand still clears the gate
  }

  gate.addEventListener("cancel", (event) => event.preventDefault());
  fullscreenButton.addEventListener("click", enterFullscreen);
  document.addEventListener("fullscreenchange", syncFullscreenButton);
  document.addEventListener("webkitfullscreenchange", syncFullscreenButton);
  query.addEventListener("change", sync);
  sync();
}

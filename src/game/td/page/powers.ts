// Divine Interventions (sim.js interventionState / castThunderfall / castShield): two buttons
// in the bottom bar. A button fills while its power charges. Thunderfall arms a tap on the
// map (recruit.ts bindCanvas asks `aiming()` first); Shield of the Crossing fires at once.
import type { PageContext } from "./context";

export const POWER_INFO: Record<string, { name: string; text: string }> = {
  thunderfall: { name: "Thunderfall", text: "Tap the map: a bolt strikes the tiles there a moment later for a share of every enemy's health." },
  shield: { name: "Shield", text: "For a few seconds, enemies reaching the base cost no lives. Once per wave." },
};

export function createPowers(ctx: PageContext) {
  const { q, state } = ctx;
  const host = q("[data-td-powers]");
  let aimingId: string | null = null;
  let key = "";

  function render() {
    const game = state.session?.game;
    const ids: string[] = game ? Object.keys(game.interventions ?? {}) : [];
    host.hidden = !ids.length;
    if (!ids.length) { host.innerHTML = ""; key = ""; return; }
    const states = ids.map((id) => ({ id, ...game.interventionState(id) }));
    if (aimingId && !states.find((s) => s.id === aimingId)?.ready) aimingId = null;
    if (!aimingId && game?.uiAim) game.uiAim = null;
    const next = states.map((s) => `${s.id}:${s.ready}:${Math.floor((s.charge / s.max) * 20)}:${aimingId === s.id}`).join("|");
    if (next === key) return;
    key = next;
    host.innerHTML = states.map((s) => {
      const info = POWER_INFO[s.id];
      const fill = Math.round(Math.min(1, s.charge / s.max) * 100);
      const status = s.ready ? "ready" : s.usedThisWave ? "used this wave" : `${fill}% charged`;
      return `<button type="button" class="td-power${s.ready ? " is-ready" : ""}${aimingId === s.id ? " is-aiming" : ""}" data-td-power="${s.id}" style="--fill:${fill}%" aria-label="${info.name}, ${status}. ${info.text}" title="${info.name}: ${info.text}"${s.ready ? "" : " disabled"}>${info.name}</button>`;
    }).join("");
  }

  host.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-td-power]");
    const game = state.session?.game;
    if (!button || button.disabled || !game) return;
    const id = button.dataset.tdPower!;
    if (id === "shield") {
      if (game.castShield()) ctx.notice("Shield of the Crossing: leaks cost no lives for a few seconds.");
    } else if (id === "thunderfall") {
      aimingId = aimingId === id ? null : id;
      if (aimingId) ctx.notice("Thunderfall: tap the map where the bolt should strike.");
    }
    render();
  });

  // The canvas asks before placing heroes: a tap while Thunderfall is armed casts it there.
  function aimAt(x: number, y: number) {
    const game = state.session?.game;
    if (!aimingId || !game) return false;
    const cast = aimingId === "thunderfall" && game.castThunderfall(x, y);
    aimingId = null;
    game.uiAim = null;
    render();
    return cast;
  }

  const aiming = () => !!aimingId;
  // Aim preview (R5): the renderer draws the tiles Thunderfall would hit under the cursor.
  function hover(x: number, y: number) {
    const game = state.session?.game;
    if (!game) return;
    const radius = game.tuning.interventions?.thunderfall?.radius ?? 0;
    game.uiAim = aimingId === "thunderfall" ? { x, y, radius, rect: game.areaRect(x, y, radius) } : null;
  }
  const reset = () => { aimingId = null; key = ""; if (state.session) state.session.game.uiAim = null; render(); };

  return { render, aimAt, aiming, hover, reset };
}

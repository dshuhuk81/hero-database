// Divine Interventions (sim.js interventionState / castThunderfall / castShield): two buttons
// round buttons in the bottom left. A ring fills with the charge and the percentage sits in the middle. Thunderfall arms a tap on the
// map (recruit.ts bindCanvas asks `aiming()` first); Shield of the Crossing fires at once.
import type { PageContext } from "./context";

export const POWER_INFO: Record<string, { name: string; text: string }> = {
  thunderfall: { name: "Thunderfall", text: "Tap the map: a bolt strikes the tiles there a moment later for a share of every enemy's health." },
  shield: { name: "Shield", text: "For a few seconds, enemies reaching the base cost no lives. Then it needs a minute to recover." },
};

// Shown in place of the percentage once a power is ready.
const POWER_GLYPH: Record<string, string> = {
  thunderfall: '<svg class="td-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13 3L6 13h5l-1 8 8-11h-5z" /></svg>',
  shield: '<svg class="td-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.500-7-10V6z" /></svg>',
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
      const status = s.ready ? "ready" : s.cooling ? "recovering" : `${fill}% charged`;
      return `<button type="button" class="td-power${s.ready ? " is-ready" : ""}${aimingId === s.id ? " is-aiming" : ""}" data-td-power="${s.id}" style="--fill:${fill}%" aria-label="${info.name}, ${status}. ${info.text}" title="${info.name}: ${info.text}"${s.ready ? "" : " disabled"}><span class="td-power-value">${s.ready ? POWER_GLYPH[s.id] ?? "!" : `${fill}%`}</span></button>`;
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
    game.uiAim = aimingId === "thunderfall" ? { x, y, radius: game.thunderRadius(), area: game.thunderArea(x, y) } : null;
  }
  const reset = () => { aimingId = null; key = ""; if (state.session) state.session.game.uiAim = null; render(); };

  return { render, aimAt, aiming, hover, reset };
}

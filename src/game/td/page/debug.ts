// Debug panel (dev builds only): live difficulty knobs, shortcuts and a rough
// damage readout. Runs touched by debug changes are not recorded (session.debug).
import type { PageContext } from "./context";

const DEBUG_DEFAULTS = { enemyHp: 1, waveHpScale: 0.15, enemySpeed: 1, killGold: 1 };

function formatKnob(key: string, value: number) {
  return key === "waveHpScale" ? `${Math.round(value * 100)}%` : `x${value.toFixed(2)}`;
}

// Returns null when the page has no debug panel (production build).
export function createDebugPanel(ctx: PageContext) {
  const { root, q, data, store, totalWaves } = ctx;
  const debugEl = root.querySelector<HTMLElement>("[data-td-debug]");
  if (!debugEl) return null;
  const tunedDifficulty = data.tuning.difficulty || {};
  const knobs: Record<string, number> = { ...DEBUG_DEFAULTS, ...tunedDifficulty };
  let invincible = false;
  let lastUpdate = 0;
  const knobsChanged = () => Object.entries(DEBUG_DEFAULTS).some(([key, value]) => knobs[key] !== (tunedDifficulty[key] ?? value));

  // Knobs persist across retries in this page; they mark the run as a debug run.
  function apply() {
    const session = ctx.getSession();
    if (!session) return;
    Object.assign(session.game.difficulty, knobs, { invincible });
    if (knobsChanged() || invincible) session.debug = true;
  }

  function syncUi() {
    debugEl!.querySelectorAll<HTMLInputElement>("[data-debug-knob]").forEach((input) => {
      const key = input.dataset.debugKnob!;
      input.value = String(knobs[key]);
      debugEl!.querySelector<HTMLElement>(`[data-debug-out="${key}"]`)!.textContent = formatKnob(key, knobs[key]);
    });
    debugEl!.querySelector<HTMLInputElement>("[data-debug-invincible]")!.checked = invincible;
  }

  function renderStats() {
    const session = ctx.getSession();
    if (debugEl!.hidden || !session) return;
    const game = session.game;
    const mods = game.modifiers();
    // Rough sustained damage: attack x attacks per second x crit, before enemy armor and ultimates.
    const dps = game.heroes.reduce((sum: number, unit: any) => sum + game.attackValue(unit) * unit.aps * (1 + Math.min(1, unit.critChance + mods.crit) * 0.5), 0);
    const waveIndex = game.running ? game.wave - 1 : game.wave;
    const waveHp = game.waveTotalHp(waveIndex);
    const alive = game.enemies.filter((enemy: any) => !enemy.dead);
    const rows = [
      ["Team DPS (rough)", Math.round(dps).toLocaleString()],
      [`Wave ${waveIndex + 1} total HP`, waveHp.toLocaleString()],
      ["HP / DPS", dps > 0 ? `${Math.round(waveHp / dps)}s` : "-"],
      ["Enemies alive", String(alive.length)],
      ["Leaks this wave / run", `${game.waveStats?.leaks ?? 0} / ${game.totalLeaks}`],
    ];
    debugEl!.querySelector<HTMLElement>("[data-debug-stats]")!.innerHTML = rows.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join("");
  }

  // Called from the frame loop; refreshes the readout four times a second.
  function tick(now: number) {
    if (debugEl!.hidden || now - lastUpdate <= 250) return;
    lastUpdate = now;
    renderStats();
  }

  const toggle = q<HTMLButtonElement>("[data-td-debug-toggle]");
  toggle.addEventListener("click", () => {
    debugEl.hidden = !debugEl.hidden;
    toggle.setAttribute("aria-pressed", String(!debugEl.hidden));
    syncUi();
    renderStats();
  });
  debugEl.addEventListener("input", (event) => {
    const input = event.target as HTMLInputElement;
    if (input.dataset.debugKnob) {
      knobs[input.dataset.debugKnob] = Number(input.value);
    } else if (input.matches("[data-debug-invincible]")) {
      invincible = input.checked;
    } else return;
    syncUi();
    apply();
    ctx.actions.renderPreview();
    renderStats();
  });
  debugEl.addEventListener("click", async (event) => {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-debug-action]")?.dataset.debugAction;
    if (!action) return;
    const copyOut = debugEl.querySelector<HTMLOutputElement>("[data-debug-copy]")!;
    if (action === "favor") {
      store.data.favor = (store.data.favor || 0) + 500;
      store.persist();
      ctx.actions.renderLobby();
      ctx.notice("+500 Favor (debug).");
      return;
    }
    if (action === "reset") {
      Object.assign(knobs, DEBUG_DEFAULTS, tunedDifficulty);
      invincible = false;
      syncUi();
      apply();
      ctx.actions.renderPreview();
      return;
    }
    if (action === "copy") {
      const text = `"difficulty": ${JSON.stringify(knobs)}`;
      copyOut.textContent = text;
      try { await navigator.clipboard.writeText(text); ctx.notice("Difficulty values copied. Paste into gameBalance.tuning.json."); }
      catch { ctx.notice("Copy blocked by the browser. Values are shown in the debug panel."); }
      return;
    }
    const session = ctx.getSession();
    if (!session) { ctx.notice("Start a run first."); return; }
    const game = session.game;
    session.debug = true;
    if (action === "gold") { game.gold += 500; ctx.actions.handleChange("debug"); }
    if (action === "win" && !game.complete) { game.running = false; game.finish(true); }
    if (action === "lose" && !game.complete) { game.running = false; game.lives = 0; game.finish(false); }
    if (action === "jump") {
      if (game.running || game.complete) { ctx.notice("Jump works between waves."); return; }
      const target = Math.min(totalWaves, Math.max(1, Number(debugEl.querySelector<HTMLInputElement>("[data-debug-wave]")!.value) || 1));
      game.wave = target - 1;
      game.virtueOffer = null;
      session.started = true;
      ctx.actions.handleChange("debug");
      ctx.notice(`Next wave set to ${target}. Press Start when ready.`);
    }
  });
  syncUi();

  return { apply, tick };
}

// Blessing presentation: cards (large bonus value, stat word, stat icon), the
// on-map buff bar with summed run blessings, and the milestone offer modal.
import { blessingDisplay, buffChips } from "../ui.js";
import { MUTATOR_INFO, RUN_BOON_INFO } from "../skills.js";
import { bondText } from "../bonds.js";
import type { PageContext } from "./context";

export const BOON_ICONS: Record<string, string> = {
  atk: '<path d="M14.5 3.5l6 0 0 6-9 9-3-3z" /><path d="M5 14l5 5M3.5 20.5l3-3" />',
  res: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />',
  hp: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.3 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z" />',
  heal: '<path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z" />',
  regen: '<path d="M13 2L5 13.5h6L10 22l9-12h-6z" />',
  crit: '<circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />',
  dodge: '<path d="M3 8h11a3 3 0 10-3-3M3 12h15a3 3 0 11-3 3M3 16h8" />',
};

export type BoonCardOptions = { tag: "button" | "div"; name: string; effect: any; attrs?: string; badge?: string; cta?: string; compact?: boolean; pair?: boolean };

export function boonCard(options: BoonCardOptions) {
  const shown = blessingDisplay(options.effect);
  const icon = BOON_ICONS[shown.tone] ?? "";
  const classes = ["td-boon", `td-boon--${shown.tone}`, options.compact ? "td-boon--tile" : "", options.pair ? "td-boon--pair" : ""].filter(Boolean).join(" ");
  const label = `${options.name}: ${options.effect?.label ?? `${shown.value} ${shown.stat}`}`;
  const type = options.tag === "button" ? ' type="button"' : "";
  return `<${options.tag} class="${classes}"${type} ${options.attrs ?? ""} aria-label="${label}">` +
    (options.badge ? `<span class="td-boon-badge">${options.badge}</span>` : "") +
    `<span class="td-boon-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${icon}</svg></span>` +
    `<span class="td-boon-main" aria-hidden="true"><span class="td-boon-value">${shown.value}</span><span class="td-boon-stat">${shown.stat}</span></span>` +
    `<span class="td-boon-name" aria-hidden="true">${options.name}</span>` +
    (options.cta ? `<span class="td-boon-cta" aria-hidden="true">${options.cta}</span>` : "") +
    `</${options.tag}>`;
}

// Rare and epic run blessing card (M17): rarity badge, name and what it changes.
const RARITY_ICON = '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />';
export function mechanicBoonCard(id: string, rarity: string, options: { tag: "button" | "div"; attrs?: string; cta?: string; compact?: boolean }) {
  const info = (RUN_BOON_INFO as Record<string, { name: string; text: string }>)[id] ?? { name: id, text: "" };
  const label = rarity === "epic" ? "Epic" : "Rare";
  const classes = ["td-boon", "td-boon--mech", `td-boon--${rarity}`, options.compact ? "td-boon--tile" : ""].filter(Boolean).join(" ");
  const type = options.tag === "button" ? ' type="button"' : "";
  return `<${options.tag} class="${classes}"${type} ${options.attrs ?? ""} aria-label="${label} blessing ${info.name}: ${info.text}">` +
    `<span class="td-boon-badge">${label}</span>` +
    `<span class="td-boon-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${RARITY_ICON}</svg></span>` +
    `<span class="td-boon-main" aria-hidden="true"><span class="td-boon-stat">${info.name}</span></span>` +
    `<span class="td-boon-text" aria-hidden="true">${info.text}</span>` +
    (options.cta ? `<span class="td-boon-cta" aria-hidden="true">${options.cta}</span>` : "") +
    `</${options.tag}>`;
}

// Buff bar: summed run blessings shown on the battlefield.
export function createBuffBar(ctx: PageContext) {
  const { q, data, blessingNames } = ctx;
  const buffsEl = q("[data-td-buffs]");
  const stageEl = q("[data-td-stage]");
  let buffValues: Record<string, string> = {};

  function sources(game: any, type: string) {
    const parts = game.virtues
      .filter((name: string) => data.tuning.virtueEffects[name]?.type === type)
      .map((name: string) => `${blessingNames[name] ?? name} ${blessingDisplay(data.tuning.virtueEffects[name]).value}`);
    for (const pair of game.activePairs ?? []) {
      if (pair.effect?.type === type) parts.push(`${pair.name} ${blessingDisplay(pair.effect).value}`);
    }
    return parts.join(", ");
  }

  // Portrait: the map leaves free space below it; the bar sits there instead of over the map.
  function position() {
    if (buffsEl.hidden || !ctx.getSession()) return;
    const below = ctx.actions.spaceBelowMap();
    const dock = stageEl.clientWidth <= 600 && stageEl.clientHeight > stageEl.clientWidth && below >= 60;
    buffsEl.classList.toggle("is-below", dock);
    if (dock) buffsEl.style.setProperty("--td-buffs-top", `${stageEl.clientHeight - below + 8}px`);
  }

  function render() {
    const game = ctx.getSession()?.game;
    const chips = game ? buffChips(game.modifiers()) : [];
    const mutators: string[] = game?.mutators ?? [];
    // Pantheon bonds active on the field (bonds.js), before the blessings.
    const bonds = (game?.bonds?.() ?? []).filter((bond: any) => bond.tier);
    buffsEl.hidden = chips.length === 0 && mutators.length === 0 && bonds.length === 0;
    const bondChips = bonds.map((bond: any) => `<span class="td-buff td-buff--bond" title="${bond.name} bond (${bond.count} heroes): ${bondText(bond.tier)}"><b>${bond.count}</b><span>${bond.name}</span></span>`).join("");
    // Endless mutators (M15) sit after the blessings, in warning red.
    const mutatorChips = mutators.map((id) => {
      const info = (MUTATOR_INFO as Record<string, { name: string; text: string }>)[id];
      return `<span class="td-buff td-buff--mutator" title="${info?.text ?? id}"><b>!</b><span>${info?.name ?? id}</span></span>`;
    }).join("");
    buffsEl.innerHTML = bondChips + chips.map((chip) => {
      const changed = buffValues[chip.type] !== chip.value;
      const stat = blessingDisplay({ type: chip.type, value: 0 }).stat;
      return `<button type="button" class="td-buff td-boon--${chip.type}${changed ? " is-bumped" : ""}" data-td-buff aria-label="${chip.value} ${stat} from ${sources(game, chip.type)}. Show run blessings.">` +
        `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${BOON_ICONS[chip.type] ?? ""}</svg>` +
        `<b>${chip.value}</b><span>${chip.short}</span></button>`;
    }).join("") + mutatorChips;
    buffValues = Object.fromEntries(chips.map((chip) => [chip.type, chip.value]));
    position();
  }

  function reset() {
    buffValues = {};
    buffsEl.hidden = true;
  }

  buffsEl.addEventListener("click", (event) => {
    const chip = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-td-buff]");
    if (!chip) return;
    ctx.actions.openPanel("blessings", chip);
    ctx.actions.selectBlessingsTab("run");
  });

  return { render, position, reset };
}

// Run blessing offer: opens as the stage's defeat counter crosses a milestone and pauses the stage until a card is
// chosen or skipped.
export function createRunOffer(ctx: PageContext) {
  const { q, data, blessingNames, pause } = ctx;
  const modalEl = q("[data-td-blessing-modal]");
  const gridEl = q("[data-td-blessing-grid]");
  let offerKey = "";

  function render() {
    const game = ctx.getSession()?.game;
    const offer: string[] | null = game && !game.complete ? game.virtueOffer : null;
    if (!offer) { close(); return; }
    const key = offer.join("|");
    if (key === offerKey) return;
    offerKey = key;
    const owned: string[] = game.virtues;
    gridEl.innerHTML = offer.map((name) => {
      if (name.startsWith("boon:")) {
        const id = name.slice(5);
        return mechanicBoonCard(id, data.tuning.runBoons?.list?.[id]?.rarity ?? "rare", { tag: "button", attrs: `data-virtue="${name}"`, cta: "Select" });
      }
      const effect = data.tuning.virtueEffects[name];
      const pair = (data.tuning.virtuePairs || []).find((entry: any) => entry.virtues.includes(name) && entry.virtues.every((v: string) => v === name || owned.includes(v)));
      return boonCard({
        tag: "button",
        name: blessingNames[name] ?? name,
        effect,
        attrs: `data-virtue="${name}"`,
        badge: pair ? `Completes ${pair.name}` : "",
        cta: "Select",
      });
    }).join("");
    ctx.actions.closePopover(false);
    ctx.actions.closeSheet(false);
    modalEl.hidden = false;
    pause.add("offer");
    gridEl.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }

  function close() {
    modalEl.hidden = true;
    offerKey = "";
    if (pause.has("offer")) pause.remove("offer");
  }

  function reset() {
    close();
  }

  q("[data-td-blessing-skip]").addEventListener("click", () => {
    ctx.getSession()?.game.skipVirtues();
    ctx.getSession()?.canvas.focus({ preventScroll: true });
  });

  gridEl.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-virtue]");
    const session = ctx.getSession();
    if (!button || !session) return;
    const name = button.dataset.virtue!;
    if (!session.game.chooseVirtue(name)) return;
    if (name.startsWith("boon:")) {
      const info = (RUN_BOON_INFO as Record<string, { name: string; text: string }>)[name.slice(5)];
      ctx.notice(`${info?.name ?? "Blessing"}: ${info?.text ?? ""}`);
      ctx.getSession()?.canvas.focus({ preventScroll: true });
      return;
    }
    const triggered = (session.game.activePairs ?? []).find((pair: any) => pair.virtues.includes(name));
    const blessingName = blessingNames[name] ?? name;
    ctx.notice(triggered ? `${blessingName} activates ${triggered.name}: ${triggered.label}` : `${blessingName} blesses your squad for the rest of this run.`);
    ctx.getSession()?.canvas.focus({ preventScroll: true });
  });

  return { render, reset };
}

// Relic card for the run panel and the on-map bar with the active bonds and mutators.
import { MUTATOR_INFO, RUN_BOON_INFO } from "../skills.js";
import { bondText } from "../bonds.js";
import type { PageContext } from "./context";

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

// Bar on the battlefield: active Pantheon bonds and endless mutators.
export function createBuffBar(ctx: PageContext) {
  const { q } = ctx;
  const buffsEl = q("[data-td-buffs]");
  const stageEl = q("[data-td-stage]");

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
    const mutators: string[] = game?.mutators ?? [];
    // Pantheon bonds active on the field (bonds.js).
    const bonds = (game?.bonds?.() ?? []).filter((bond: any) => bond.tier);
    buffsEl.hidden = mutators.length === 0 && bonds.length === 0;
    // Short label (NOR 4) so the chip reads on its own in short landscape; tap explains it.
    const bondChips = bonds.map((bond: any, index: number) => `<button type="button" class="td-buff td-buff--bond" data-bond-index="${index}" aria-label="${bond.name} bond, ${bond.count} heroes" title="${bond.name} bond (${bond.count} heroes)"><b>${bond.count}</b><span>${bond.name.slice(0, 3).toUpperCase()}</span></button>`).join("");
    // Mutators sit after the bonds, in warning red.
    const mutatorChips = mutators.map((id) => {
      const info = (MUTATOR_INFO as Record<string, { name: string; text: string }>)[id];
      return `<span class="td-buff td-buff--mutator" title="${info?.text ?? id}"><b>!</b><span>${info?.name ?? id}</span></span>`;
    }).join("");
    buffsEl.innerHTML = bondChips + mutatorChips;
    bondsOnField = bonds;
    position();
  }

  // Tap a bond chip: what the reached tier does and what the next tier needs.
  let bondsOnField: any[] = [];
  buffsEl.addEventListener("click", (event: Event) => {
    const chip = (event.target as HTMLElement).closest<HTMLElement>("[data-bond-index]");
    const bond = chip && bondsOnField[Number(chip.dataset.bondIndex)];
    if (!bond) return;
    const next = bond.next ? ` Next at ${bond.next.count} heroes: ${bondText(bond.next)}.` : "";
    ctx.notice(`${bond.name} bond, ${bond.count} heroes: ${bondText(bond.tier)}.${next}`);
  });

  function reset() {
    buffsEl.hidden = true;
  }

  return { render, position, reset };
}

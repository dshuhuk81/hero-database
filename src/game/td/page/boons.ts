// Relic card for the run panel and the on-map bar with the active bonds and mutators.
import { MUTATOR_INFO, RUN_BOON_INFO } from "../skills.js";
import type { PageContext } from "./context";

// Shortest readable tier: "+12% ATK +10% ULT". Stat keys match tuning.bonds tiers.
function bondShort(tier: any) {
  if (!tier) return "";
  const parts: string[] = [];
  if (tier.atk) parts.push(`+${Math.round(tier.atk * 100)}% ATK`);
  if (tier.ultCharge) parts.push(`+${Math.round(tier.ultCharge * 100)}% ULT`);
  if (tier.guard) parts.push(`-${Math.round(tier.guard * 100)}% dmg taken`);
  if (tier.heal) parts.push(`+${Math.round(tier.heal * 100)}% heal`);
  return parts.join(" ");
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
    // Deaths re-render the bar: keep an open tip on its bond, drop it if that bond is gone.
    const open = openBond && bonds.find((bond: any) => bond.name === openBond.name);
    if (open) showTip(buffsEl.querySelector<HTMLElement>(`[data-bond-index="${bonds.indexOf(open)}"]`)!, open);
    else hideTip();
    position();
  }

  // Tap a bond chip: small tooltip right under it (not the notice line, which buff/change messages use).
  let bondsOnField: any[] = [];
  let openBond: any = null;
  const tipEl = document.createElement("div");
  tipEl.className = "td-bond-tip";
  tipEl.hidden = true;
  stageEl.appendChild(tipEl);

  function hideTip() {
    tipEl.hidden = true;
    openBond = null;
    document.removeEventListener("pointerdown", onOutsideTap, true);
  }

  function onOutsideTap(event: Event) {
    if (!tipEl.contains(event.target as Node) && !(event.target as HTMLElement).closest?.("[data-bond-index]")) hideTip();
  }

  function showTip(chip: HTMLElement, bond: any) {
    const next = bond.next ? `<span>Next ${bond.next.count}: ${bondShort(bond.next)}</span>` : "";
    tipEl.innerHTML = `<b>${bond.count} ${bond.name}: ${bondShort(bond.tier)}</b>${next}`;
    tipEl.hidden = false;
    openBond = bond;
    // Under the chip, clamped to the stage.
    const stageRect = stageEl.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    const width = tipEl.offsetWidth;
    const left = Math.max(4, Math.min(chipRect.left - stageRect.left, stageEl.clientWidth - width - 4));
    tipEl.style.left = `${left}px`;
    tipEl.style.top = `${chipRect.bottom - stageRect.top + 4}px`;
    document.addEventListener("pointerdown", onOutsideTap, true);
  }

  buffsEl.addEventListener("click", (event: Event) => {
    const chip = (event.target as HTMLElement).closest<HTMLElement>("[data-bond-index]");
    const bond = chip && bondsOnField[Number(chip.dataset.bondIndex)];
    if (!bond) return;
    if (openBond?.name === bond.name) hideTip();
    else showTip(chip!, bond);
  });

  function reset() {
    hideTip();
    buffsEl.hidden = true;
  }

  return { render, position, reset };
}

// Global wallet in the app bar: a few chips picked per screen (td.css, .td-wallet-chip) and a
// dropdown with the full inventory, every currency with where it comes from and where it goes.
// The page calls render() after each save (store.onPersist) and on every screen change.
import type { PageContext } from "./context";
import { availableFavor, availableInsight } from "./save";
import { CLASSES } from "../favor.js";
import { CURRENCIES } from "../campaign.js";
import { currencyAmount, currencyIcon, currencyName } from "../currency-icons.js";
import { classIconImg } from "../assets.js";

const CHIPS = ["favor", ...CURRENCIES];
const SOURCES: Record<string, string> = {
  favor: "Every run outside the campaign. Spent on Divine Blessings.",
  gold: "Campaign stages. Spent on hero levels.",
  heroXp: "Campaign stages. Spent on hero levels.",
  divineSeals: "Campaign first clears, Daily Trial and Expedition. Spent on summons.",
  sealDust: "Spare hero copies. Spent on Evolution, copies and Divine Seals.",
};

export function createWallet(ctx: PageContext) {
  const { q, store } = ctx;
  const rootEl = q("[data-td-wallet]");
  const button = q<HTMLButtonElement>("[data-td-wallet-button]");
  const chipsEl = q("[data-td-wallet-chips]");
  const panel = q("[data-td-wallet-panel]");

  const amounts = (): Record<string, number> => {
    const currencies = store.data.campaign.currencies as Record<string, number>;
    return Object.fromEntries(CHIPS.map((id) => [id, id === "favor" ? availableFavor(store.data) : currencies[id] || 0]));
  };

  const row = (id: string, amount: number) =>
    `<li class="td-wallet-row"><span class="td-wallet-row-icon">${currencyIcon(id)}</span>` +
    `<span class="td-wallet-row-text"><strong>${currencyName(id)}</strong><small>${SOURCES[id]}</small></span>` +
    `<b class="td-wallet-row-amount">${Math.round(amount).toLocaleString()}</b></li>`;

  function panelHtml(have: Record<string, number>) {
    const insight = CLASSES.map((cls: string) =>
      `<span class="td-bchip" style="--edge:var(--td-class-${cls.toLowerCase()})">${classIconImg(cls, 16)}${cls} <b>${availableInsight(store.data, cls).toLocaleString()}</b></span>`).join("");
    return `<section class="td-wallet-group"><h2 class="td-label">Divine Blessings</h2><ul>${row("favor", have.favor)}</ul>` +
      `<div class="td-wallet-insight"><strong>Insight</strong><small>Deployed heroes earn it for their class. Spent on that class's blessings.</small><div class="td-wallet-insight-chips">${insight}</div></div>` +
      `<div class="td-wallet-links"><button class="td-link-button" type="button" data-td-go="blessings">Open Divine Blessings</button></div></section>` +
      `<section class="td-wallet-group"><h2 class="td-label">Campaign</h2><ul>${CURRENCIES.map((id: string) => row(id, have[id])).join("")}</ul>` +
      `<div class="td-wallet-links"><button class="td-link-button" type="button" data-td-go="heroes">Heroes</button><button class="td-link-button" type="button" data-td-go="summon">Summon</button></div></section>`;
  }

  function render() {
    const have = amounts();
    chipsEl.innerHTML = `<span class="sr-only">Inventory:</span>` +
      CHIPS.map((id) => `<span class="td-wallet-chip" data-chip="${id}">${currencyAmount(id, have[id])}</span>`).join("");
    if (!panel.hidden) panel.innerHTML = panelHtml(have);
  }

  function setOpen(open: boolean, restoreFocus = false) {
    if (open) panel.innerHTML = panelHtml(amounts());
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (!open && restoreFocus) button.focus();
  }

  button.addEventListener("click", () => setOpen(button.getAttribute("aria-expanded") !== "true"));
  // Links inside navigate (nav.ts handles data-td-go on the root); close the panel as they do.
  panel.addEventListener("click", (event) => { if ((event.target as HTMLElement).closest("[data-td-go]")) setOpen(false); });
  // Escape closes the panel first; preventDefault keeps nav.ts from also going back a screen.
  rootEl.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || panel.hidden) return;
    event.preventDefault();
    setOpen(false, true);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!panel.hidden && !rootEl.contains(event.target as Node)) setOpen(false);
  });

  return { render, close: () => setOpen(false) };
}

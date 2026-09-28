// Currency display (campaign): one inline icon per currency, always shown as icon + value.
// Tints live in td.css (.td-cur--<id>); inside buttons the icon takes the text color.
import { CURRENCY_NAMES } from "./campaign.js";

const PATHS = {
  gold: '<circle cx="12" cy="12" r="8" /><path d="M9 12h6" />',
  heroXp: '<path d="M6 13.5l6-6 6 6M6 19l6-6 6 6" />',
  divineSeals: '<circle cx="12" cy="12" r="8" /><path d="M12 7.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z" />',
  sealDust: '<path d="M8 5.5l.9 2.1 2.1.9-2.1.9L8 11.5l-.9-2.1L5 8.5l2.1-.9zM16 11l.9 2.1 2.1.9-2.1.9L16 17l-.9-2.1L13 14l2.1-.9zM8.5 15.5v3M7 17h3" />',
  divineEssence: '<path class="is-fill" d="M12 3c.8 4.6 2.4 6.2 7 7-4.6.8-6.2 2.4-7 7-.8-4.6-2.4-6.2-7-7 4.6-.8 6.2-2.4 7-7z" />',
};

export const currencyName = (id) => CURRENCY_NAMES[id] ?? id;

export function currencyIcon(id) {
  return `<svg class="td-cur-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${PATHS[id] ?? PATHS.gold}</svg>`;
}

// `amount` as icon + number; `plus` prefixes "+" (rewards). The name is the tooltip and label.
export function currencyAmount(id, amount, { plus = false } = {}) {
  const value = `${plus ? "+" : ""}${Math.round(amount).toLocaleString()}`;
  return `<span class="td-cur td-cur--${id}" title="${currencyName(id)}" aria-label="${value} ${currencyName(id)}">${currencyIcon(id)}<b aria-hidden="true">${value}</b></span>`;
}

// A cost or reward map { gold: 100, heroXp: 50 } as a row of chips.
export function currencyList(amounts, options) {
  return `<span class="td-cur-list">${Object.entries(amounts).map(([id, n]) => currencyAmount(id, n, options)).join("")}</span>`;
}

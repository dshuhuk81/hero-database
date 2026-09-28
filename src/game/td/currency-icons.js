// Currency display (campaign): one icon per currency, always shown as icon + value.
// Art: td/icons/items/{file}-v1.webp on R2 (96px, trimmed from the 760px sources in
// public/td/icons/items/).
import { CURRENCY_NAMES } from "./campaign.js";
import { tdAsset } from "./assets.js";

const FILES = { gold: "gold", heroXp: "hero-xp", divineSeals: "divine-seals", sealDust: "seal-dust", divineEssence: "divine-essence" };

export const currencyName = (id) => CURRENCY_NAMES[id] ?? id;

export function currencyIcon(id) {
  return `<img class="td-cur-icon" src="${tdAsset(`icons/items/${FILES[id] ?? FILES.gold}-v1.webp`)}" alt="" width="20" height="20" decoding="async">`;
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

// Currency display: one icon per currency, always shown as icon + value.
// Art: td/icons/items/{file}-v1.webp on R2 (96px, trimmed from the 760px sources in
// public/td/icons/items/). Favor (Divine Blessings) has no item art: it uses the star glyph.
import { CURRENCY_NAMES } from "./campaign.js";
import { tdAsset } from "./assets.js";

const FILES = { gold: "gold", heroXp: "hero-xp", divineSeals: "divine-seals", sealDust: "seal-dust" };

const FAVOR_ICON = `<svg class="td-cur-icon td-cur-icon--favor" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3l2.2 6.3L20.5 12l-6.3 2.7L12 21l-2.2-6.3L3.5 12l6.3-2.7z" /></svg>`;

export const currencyName = (id) => (id === "favor" ? "Favor" : CURRENCY_NAMES[id] ?? id);

export function currencyIcon(id) {
  if (id === "favor") return FAVOR_ICON;
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

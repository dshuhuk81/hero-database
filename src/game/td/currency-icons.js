// Currency display: one icon per currency, always shown as icon + value.
// Art: PixelLab pixel icons td/ui/currency/{file}-v1.webp (32 px drawn, stored at 64 px), Favor
// included. A file not on R2 yet falls back to the copy in public/td (inline onerror, since the
// icons are built as markup strings).
import { CURRENCY_NAMES } from "./campaign.js";
import { tdAsset } from "./assets.js";

const FILES = { favor: "favor", gold: "gold", heroXp: "hero-xp", divineSeals: "divine-seals", sealDust: "seal-dust" };

export const currencyName = (id) => (id === "favor" ? "Favor" : CURRENCY_NAMES[id] ?? id);

export function currencyIcon(id) {
  const path = `ui/currency/${FILES[id] ?? FILES.gold}-v1.webp`;
  return `<img class="td-cur-icon td-cur-icon--${id}" src="${tdAsset(path)}" onerror="this.onerror=null;this.src='/td/${path}'" alt="" width="20" height="20" decoding="async">`;
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

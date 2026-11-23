// In-game gift codes, maintained by hand in giftCodes.json.
// `expires` (YYYY-MM-DD, last valid day) may be null when the end is unknown.
import raw from "./giftCodes.json";

export type GiftCode = {
  code: string;
  label: string;
  validFrom?: string | null;
  expires?: string | null;
  note?: string | null;
};

const isDate = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value));

export const giftCodes: GiftCode[] = (raw as unknown as GiftCode[])
  .filter((c) => c && typeof c.code === "string" && c.code.trim() && typeof c.label === "string")
  .sort((a, b) => (isDate(b.validFrom) ? Date.parse(b.validFrom) : 0) - (isDate(a.validFrom) ? Date.parse(a.validFrom) : 0));

/** Codes still valid on the given day (YYYY-MM-DD). Used at build time; the browser re-checks. */
export function activeGiftCodes(today = new Date().toISOString().slice(0, 10)): GiftCode[] {
  return giftCodes.filter((c) => !isDate(c.expires) || c.expires >= today);
}

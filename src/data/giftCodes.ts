// In-game gift codes, maintained by hand in giftCodes.json (JSON has no comments,
// so the template lives here). Add a new object at the top or bottom of the array;
// order does not matter, newest `validFrom` is shown first.
//
//   {
//     "code": "ExampleCode",              required, exactly as typed in game
//     "label": "Spring season gift",      required, short name shown above the code
//     "validFrom": "2027-03-01",          optional, YYYY-MM-DD, used for sorting
//     "expires": "2027-03-31",            optional, last valid day (YYYY-MM-DD);
//                                         the code hides itself after this day.
//                                         Use null if the end is unknown.
//     "note": "Season Mar 1 - Mar 31"     optional, shown instead of the end date
//   }                                     when `expires` is null
//
// Take code and dates from the official announcement. Do not guess an end date.
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

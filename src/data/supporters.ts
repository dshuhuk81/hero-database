// Supporters who agreed to be named. Add entries to supporters.json only with
// the donor's consent, using the display name they chose.
import raw from "./supporters.json";

export type Supporter = {
  name: string;
  // ISO date (YYYY-MM-DD) of the donation; drives how long the celebration runs.
  since: string;
  // "gold" plays the bigger celebration. Defaults to "standard".
  tier?: "standard" | "gold";
};

export const supporters: Supporter[] = (raw as unknown as Supporter[])
  .filter((s) => s && typeof s.name === "string" && s.name.trim() && !Number.isNaN(Date.parse(s.since)))
  .sort((a, b) => Date.parse(b.since) - Date.parse(a.since));

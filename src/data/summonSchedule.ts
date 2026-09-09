export type ScheduleStatus = "released" | "upcoming";
export type PullQuality = "pull" | "optional" | "whales-only" | "skip" | "unsure";

export interface ScheduleEntry {
  id: string;
  displayName?: string;
  status: ScheduleStatus;
  order: number;
  pullQuality?: PullQuality;
}

/** Single source of truth for the release order used by the calendar and homepage teasers. */
export const summonSchedule: ScheduleEntry[] = [
  { id: "hladgunnr", status: "released", order: 1 }, { id: "nezha", status: "released", order: 2 },
  { id: "tefnut", status: "released", order: 3 }, { id: "heracles", status: "released", order: 4 },
  { id: "nuba", status: "released", order: 5 }, { id: "mengpo", status: "released", order: 6 },
  { id: "skadi", status: "released", order: 7 }, { id: "cronus", status: "released", order: 8 },
  { id: "wenshen", status: "released", order: 9 }, { id: "meret", status: "released", order: 10 },
  { id: "hephaestus", status: "released", order: 11 }, { id: "serket", status: "released", order: 12 },
  { id: "hera", status: "released", order: 13 }, { id: "eris", status: "released", order: 14 },
  { id: "nut", status: "released", order: 15 }, { id: "xuannv", status: "released", order: 16 },
  { id: "nephtys", status: "released", order: 17 }, { id: "idunn", status: "released", order: 18 },
  { id: "hades", status: "released", order: 19, pullQuality: "whales-only" },
  { id: "audhumla", status: "released", order: 20, pullQuality: "optional" },
  { id: "heket", status: "released", order: 21, pullQuality: "pull" },
  { id: "hebo", status: "upcoming", order: 22, pullQuality: "skip" },
  { id: "zaojun", status: "upcoming", order: 23, pullQuality: "pull" },
  { id: "yaoji", status: "upcoming", order: 24, pullQuality: "pull" }, { id: "mazu", status: "upcoming", order: 25, pullQuality: "optional" },
  { id: "gaiya", status: "upcoming", order: 26, pullQuality: "whales-only" }, { id: "charon", status: "upcoming", order: 27, pullQuality: "optional" },
  { id: "ananke", status: "upcoming", order: 28, pullQuality: "pull" }, { id: "nidhogg", status: "upcoming", order: 29, pullQuality: "whales-only" },
  { id: "venus", status: "upcoming", order: 30, pullQuality: "pull" }, { id: "chaos", status: "upcoming", order: 31, pullQuality: "whales-only" },
];

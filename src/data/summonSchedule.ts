export type ScheduleStatus = "released" | "upcoming";
export type PullQuality = "pull" | "optional" | "whales-only" | "skip" | "unsure";

export interface ScheduleEntry {
  id: string;
  displayName?: string;
  status: ScheduleStatus;
  order: number;
  /** Release date label shown in the calendar. Leave empty (or use "TBD") to hide it. */
  releaseDate?: string;
  pullQuality?: PullQuality;
}

/** Single source of truth for the release order used by the calendar and homepage teasers. */
export const summonSchedule: ScheduleEntry[] = [
  {
    id: "hladgunnr",
    status: "released",
    order: 1,
    releaseDate: "January 21, 2026",
    pullQuality: "pull",
  },
  {
    id: "nezha",
    status: "released",
    order: 2,
    releaseDate: "February 02, 2026",
    pullQuality: "whales-only",
  },
  {
    id: "tefnut",
    status: "released",
    order: 3,
    releaseDate: "February 04, 2026",
    pullQuality: "pull",
  },
  {
    id: "heracles",
    status: "released",
    order: 4,
    releaseDate: "February 18, 2026",
    pullQuality: "pull",
  },
  {
    id: "nuba",
    status: "released",
    order: 5,
    releaseDate: "March 04, 2026",
    pullQuality: "pull",
  },
  {
    id: "mengpo",
    status: "released",
    order: 6,
    releaseDate: "March 18, 2026",
    pullQuality: "pull",
  },
  {
    id: "skadi",
    status: "released",
    order: 7,
    releaseDate: "April 01, 2026",
    pullQuality: "pull",
  },
  {
    id: "cronus",
    status: "released",
    order: 8,
    releaseDate: "April 05, 2026",
    pullQuality: "whales-only",
  },
  {
    id: "wenshen",
    status: "released",
    order: 9,
    releaseDate: "April 08, 2026",
    pullQuality: "pull",
  },
  {
    id: "meret",
    status: "released",
    order: 10,
    releaseDate: "April 22, 2026",
    pullQuality: "pull",
  },
  {
    id: "hephaestus",
    status: "released",
    order: 11,
    releaseDate: "May 06, 2026",
    pullQuality: "pull",
  },
  {
    id: "serket",
    status: "released",
    order: 12,
    releaseDate: "May 20, 2026",
    pullQuality: "optional",
  },
  {
    id: "hera",
    status: "released",
    order: 13,
    releaseDate: "May 25, 2026",
    pullQuality: "whales-only",
  },
  {
    id: "eris",
    status: "released",
    order: 14,
    releaseDate: "June 03, 2026",
    pullQuality: "pull",
  },
  {
    id: "nut",
    status: "released",
    order: 15,
    releaseDate: "June 17, 2026",
    pullQuality: "pull",
  },
  {
    id: "xuannv",
    status: "released",
    order: 16,
    releaseDate: "June 24, 2026",
    pullQuality: "pull",
  },
  {
    id: "nephtys",
    status: "released",
    order: 17,
    releaseDate: "July 08, 2026",
    pullQuality: "skip",
  },
  {
    id: "idunn",
    status: "released",
    order: 18,
    releaseDate: "July 22, 2026",
    pullQuality: "pull",
  },
  {
    id: "hades",
    status: "released",
    order: 19,
    releaseDate: "July 27, 2026",
    pullQuality: "whales-only",
  },
  {
    id: "audhumla",
    status: "released",
    order: 20,
    releaseDate: "August 05, 2026",
    pullQuality: "optional",
  },
  {
    id: "heket",
    status: "released",
    order: 21,
    releaseDate: "August 19, 2026",
    pullQuality: "pull",
  },
  {
    id: "hebo",
    status: "released",
    order: 22,
    releaseDate: "September 02, 2026",
    pullQuality: "skip",
  },
  {
    id: "zaojun",
    status: "released",
    order: 23,
    releaseDate: "September 16, 2026",
    pullQuality: "pull",
  },
  {
    id: "gaiya",
    status: "upcoming",
    order: 24,
    releaseDate: "September 28, 2026",
    pullQuality: "whales-only",
  },
  {
    id: "mazu",
    status: "upcoming",
    order: 25,
    releaseDate: "September 30, 2026",
    pullQuality: "optional",
  },
  {
    id: "yaoji",
    status: "upcoming",
    order: 26,
    releaseDate: "October 14, 2026",
    pullQuality: "pull",
  },
  {
    id: "charon",
    status: "upcoming",
    order: 27,
    releaseDate: "October 28, 2026",
    pullQuality: "optional",
  },
    {
    id: "nidhogg",
    status: "upcoming",
    order: 28,
    releaseDate: "November 2, 2026",
    pullQuality: "whales-only",
  },
  {
    id: "ananke",
    status: "upcoming",
    order: 29,
    releaseDate: "November 13, 2026",
    pullQuality: "skip",
  },
  {
    id: "venus",
    status: "upcoming",
    order: 30,
    releaseDate: "November 25, 2026",
    pullQuality: "pull",
  },
  {
    id: "chaos",
    status: "upcoming",
    order: 31,
    releaseDate: "November 30, 2026",
    pullQuality: "whales-only",
  },
];

import { getHeroRelease, type ReleaseSource } from "./heroReleases";
import { releaseStatus } from "./releaseStatus.js";

export type ScheduleStatus = "released" | "upcoming";
export type PullQuality = "pull" | "optional" | "whales-only" | "skip" | "unsure";

export interface ScheduleEntry {
  id: string;
  displayName?: string;
  order: number;
  /** Manual guess (YYYY-MM-DD), only used while the game data has no Global date for this hero. */
  estimatedDate?: string;
  pullQuality?: PullQuality;
}

export interface ResolvedSchedule {
  status: ScheduleStatus;
  /** ISO date, or null when nothing is known. */
  date: string | null;
  dateSource: ReleaseSource;
}

/** Release status and date come from the imported game data; the entry only adds editorial fields. */
export function resolveScheduleEntry(entry: ScheduleEntry, today: string): ResolvedSchedule {
  const release = getHeroRelease(entry.id);
  const known = release && release.source !== "none";
  const date = known ? release.date : (entry.estimatedDate ?? null);
  const dateSource: ReleaseSource = known ? release.source : entry.estimatedDate ? "estimated" : "none";
  return { status: releaseStatus(date, today) === "released" ? "released" : "upcoming", date, dateSource };
}

/** "2026-04-01" -> "April 01, 2026" */
export function formatReleaseDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

/** Single source of truth for the release order used by the calendar and homepage teasers. */
export const summonSchedule: ScheduleEntry[] = [
  {
    id: "hladgunnr",
    order: 1,
    pullQuality: "pull",
  },
  {
    id: "nezha",
    order: 2,
    pullQuality: "whales-only",
  },
  {
    id: "tefnut",
    order: 3,
    pullQuality: "pull",
  },
  {
    id: "heracles",
    order: 4,
    pullQuality: "pull",
  },
  {
    id: "nuba",
    order: 5,
    pullQuality: "pull",
  },
  {
    id: "mengpo",
    order: 6,
    pullQuality: "pull",
  },
  {
    id: "skadi",
    order: 7,
    pullQuality: "pull",
  },
  {
    id: "cronus",
    order: 8,
    pullQuality: "whales-only",
  },
  {
    id: "wenshen",
    order: 9,
    pullQuality: "pull",
  },
  {
    id: "meret",
    order: 10,
    pullQuality: "pull",
  },
  {
    id: "hephaestus",
    order: 11,
    pullQuality: "pull",
  },
  {
    id: "serket",
    order: 12,
    pullQuality: "optional",
  },
  {
    id: "hera",
    order: 13,
    pullQuality: "whales-only",
  },
  {
    id: "eris",
    order: 14,
    pullQuality: "pull",
  },
  {
    id: "nut",
    order: 15,
    pullQuality: "pull",
  },
  {
    id: "xuannv",
    order: 16,
    pullQuality: "pull",
  },
  {
    id: "nephtys",
    order: 17,
    pullQuality: "skip",
  },
  {
    id: "idunn",
    order: 18,
    pullQuality: "pull",
  },
  {
    id: "hades",
    order: 19,
    pullQuality: "whales-only",
  },
  {
    id: "audhumla",
    order: 20,
    pullQuality: "optional",
  },
  {
    id: "heket",
    order: 21,
    pullQuality: "pull",
  },
  {
    id: "hebo",
    order: 22,
    pullQuality: "skip",
  },
  {
    id: "zaojun",
    order: 23,
    pullQuality: "pull",
  },
  {
    id: "gaiya",
    order: 24,
    pullQuality: "whales-only",
  },
  {
    id: "mazu",
    order: 25,
    pullQuality: "optional",
  },
  {
    id: "yaoji",
    order: 26,
    pullQuality: "pull",
  },
  {
    id: "charon",
    order: 27,
    pullQuality: "optional",
  },
    {
    id: "nidhogg",
    order: 28,
    pullQuality: "whales-only",
  },
  {
    id: "ananke",
    order: 29,
    pullQuality: "skip",
  },
  {
    id: "venus",
    estimatedDate: "2026-11-25",
    order: 30,
    pullQuality: "pull",
  },
  {
    id: "chaos",
    order: 31,
    pullQuality: "whales-only",
  },
];

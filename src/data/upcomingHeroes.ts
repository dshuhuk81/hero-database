// Preview data (separate from the editorial previews in heroPreviews.ts) for heroes that are not released on Global yet: CN-client attributes and skill texts
// (Chinese source plus English translation). Written by tools/android/scripts/export_upcoming_heroes.py.
// The /heroes/upcoming page exists only while the hero JSON still says "release": false.
import { heroes } from "./heroes/withRatings";

export interface PreviewUpgrade { level: number; zh: string; en?: string }
export interface PreviewSkill {
  slot: number;
  kind: "ultimate" | "basic" | "skill" | "passive";
  zh: { name: string; description: string };
  en?: { name: string; description: string };
  upgrades: PreviewUpgrade[];
}
export interface UpcomingHero {
  id: string;
  gameId: number;
  source: { client: string; pull: string };
  cnName: string;
  enSource?: "global-client" | "translated-from-cn";
  stats: Record<string, number>;
  /** From the default skin: client icon name per skill slot and the hero-screen backdrop asset. */
  art?: { skillIcons: Record<string, string>; detailBackground: string | null; relicIcon?: string };
  /** Artifact: name, effect name and one effect per level (each level unlocks its own effect). */
  relic?: {
    zh: { name: string; skillName: string };
    en?: { name: string; skillName: string };
    levels: { level: number; zh: string; en?: string }[];
  };
  skills: PreviewSkill[];
}

const files = import.meta.glob("./upcoming-heroes/*.json", { eager: true, import: "default" }) as Record<string, UpcomingHero>;
const unreleased = new Set((heroes as any[]).filter((hero) => hero.release === false).map((hero) => hero.id));

export const upcomingHeroes: UpcomingHero[] = Object.values(files)
  .filter((preview) => unreleased.has(preview.id))
  .sort((a, b) => a.id.localeCompare(b.id));

const upcomingById = new Map(upcomingHeroes.map((preview) => [preview.id, preview]));

export const getUpcomingHero = (id: string) => upcomingById.get(id);
export const hasUpcomingHero = (id: string) => upcomingById.has(id);
/** English-only for now; the preview route is not duplicated under the locale folders. */
export const upcomingHref = (id: string) => `/heroes/upcoming/${id}`;

// Banner list for /banners: every hero banner from the game data plus heroes that are known
// to come but have no banner yet. Status (running/upcoming/ended) is derived in the browser.
import { globalEvents } from "./eventsGlobal";
import { summonSchedule, resolveScheduleEntry, type PullQuality } from "./summonSchedule";
import { siteIdForGameId } from "./heroReleases";
import allHeroes from "./all_heroes_db.json";
import { heroes as ratedHeroes } from "./heroes/withRatings";

export interface BannerEntry {
  id: string;
  kind: "new" | "rerun";
  start: string | null;
  end: string | null;
  label: string;
  heroSiteId?: string;
  heroName?: string;
  faction?: string;
  heroClass?: string;
  role?: string;
  overall?: string;
  pullQuality?: PullQuality;
  order?: number;
  /** No banner in the game data yet; the date is a guess or comes from another event. */
  estimated: boolean;
}

const heroById = new Map(Object.values(allHeroes as Record<string, any>).map((hero) => [hero.id, hero]));
const ratingById = new Map((ratedHeroes as any[]).map((hero) => [hero.id, hero.ratings?.overall as string | undefined]));
const scheduleById = new Map(summonSchedule.map((entry) => [entry.id, entry]));

/** Reruns repeat a hero that already had a banner, so they carry no pull recommendation or order number. */
function heroFields(siteId: string, rerun = false) {
  const hero = heroById.get(siteId) ?? {};
  const entry = scheduleById.get(siteId);
  return {
    heroSiteId: siteId,
    heroName: entry?.displayName ?? hero.name ?? siteId,
    faction: hero.faction,
    heroClass: hero.class,
    role: hero.role,
    overall: ratingById.get(siteId),
    pullQuality: rerun ? undefined : entry?.pullQuality,
    order: rerun ? undefined : entry?.order,
  };
}

export function buildBanners(today = new Date().toISOString().slice(0, 10)): BannerEntry[] {
  const banners: BannerEntry[] = [];
  const bannedHeroes = new Set<string>();

  for (const event of globalEvents.filter((e) => e.category === "banners")) {
    const siteId = event.heroGameId === undefined ? undefined : siteIdForGameId(event.heroGameId);
    // Only a first banner makes a hero "announced"; reruns repeat heroes that already came.
    if (siteId && event.series !== "rerun_card_push") bannedHeroes.add(siteId);
    banners.push({
      id: String(event.id),
      kind: event.series === "rerun_card_push" ? "rerun" : "new",
      start: event.start,
      end: event.end,
      label: event.label,
      estimated: false,
      ...(siteId ? heroFields(siteId, event.series === "rerun_card_push") : {}),
    });
  }

  for (const entry of summonSchedule) {
    if (bannedHeroes.has(entry.id)) continue;
    const resolved = resolveScheduleEntry(entry, today);
    if (resolved.status !== "upcoming") continue;
    banners.push({
      id: `upcoming-${entry.id}`,
      kind: "new",
      start: resolved.date,
      end: null,
      label: entry.displayName ?? (heroById.get(entry.id)?.name ?? entry.id),
      estimated: resolved.dateSource !== "client",
      ...heroFields(entry.id),
    });
  }
  return banners;
}

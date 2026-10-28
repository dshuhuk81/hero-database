// Release dates per site hero id, from the game data the Android agent exports
// (npm run import:game-data). Heroes are joined on the game id, never on the name.
import heroReleaseData from "./generated/hero_releases.json";
import eventData from "./generated/events.global.json";
import mapping from "./game_id_mapping.json";
import { effectiveRelease } from "./releaseStatus.js";

export type ReleaseSource = "client" | "event" | "estimated" | "none";

export interface HeroRelease {
  gameId: number;
  globalRelease: string | null;
  cnRelease: string | null;
  /** Best known Global release date (ISO), see effectiveRelease. */
  date: string | null;
  source: ReleaseSource;
  /** Available from the start of the game: neither Global nor CN has a release date. */
  launchHero: boolean;
}

// Site ids whose mapping key differs from the site id.
const MAPPING_KEY: Record<string, string> = { xuannv: "jiutian-xuannv" };
// Events that feature a hero as a release: banner, Sea War or direct purchase.
const RELEASE_SERIES = new Set(["new_card_push", "seawar", "hero_shop"]);

const releaseByGameId = new Map(heroReleaseData.heroes.map((hero) => [hero.gameId, hero]));
const eventStartsByGameId = new Map<number, string[]>();
for (const event of eventData.events as { series: string; start: string; heroGameId?: number }[]) {
  if (event.heroGameId === undefined || !RELEASE_SERIES.has(event.series)) continue;
  eventStartsByGameId.set(event.heroGameId, [...(eventStartsByGameId.get(event.heroGameId) ?? []), event.start]);
}

export function getHeroRelease(siteId: string): HeroRelease | undefined {
  const entry = (mapping as Record<string, { game_hero_id: number | null }>)[MAPPING_KEY[siteId] ?? siteId];
  const gameId = entry?.game_hero_id;
  if (!gameId) return undefined;
  const hero = releaseByGameId.get(gameId);
  if (!hero) return undefined;
  const { date, source } = effectiveRelease(hero.globalRelease, eventStartsByGameId.get(gameId) ?? []);
  return {
    gameId,
    globalRelease: hero.globalRelease,
    cnRelease: hero.cnRelease,
    date,
    source,
    launchHero: !hero.globalRelease && !hero.cnRelease,
  };
}

const siteIdByGameId = new Map(
  Object.entries(mapping as Record<string, { game_hero_id: number | null; alias_of?: string }>)
    .filter(([, entry]) => entry.game_hero_id && !entry.alias_of)
    .map(([siteId, entry]) => [entry.game_hero_id as number, siteId]),
);

/** Site hero id for a game id, or undefined when the hero has no site entry. */
export function siteIdForGameId(gameId: number): string | undefined {
  return siteIdByGameId.get(gameId);
}

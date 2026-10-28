// Global-client events. The data is exported from the game client by the Android agent and
// imported with `npm run import:game-data`; do not edit src/data/generated/ by hand.
import eventData from "./generated/events.global.json";
import heroData from "./generated/hero_releases.json";

export type GlobalEventCategory = "banners" | "events" | "leaderboards" | "recurring" | "offers";

export interface GlobalEvent {
  id: number;
  label: string;
  family: string;
  series: string;
  start: string;
  end: string;
  category: GlobalEventCategory;
  /** Game id of the featured hero, if any. */
  heroGameId?: number;
  /** Display name of the featured hero, resolved from heroGameId. */
  hero?: string;
}

export const globalEventsMeta = {
  client: eventData.client,
  generated: eventData.generatedAt,
  source: "Global client configuration",
};

const heroNames = new Map(heroData.heroes.map((hero) => [hero.gameId, hero.name]));

export const globalEvents: GlobalEvent[] = (eventData.events as GlobalEvent[]).map((event) => ({
  ...event,
  hero: event.heroGameId === undefined ? undefined : (heroNames.get(event.heroGameId) ?? undefined),
}));

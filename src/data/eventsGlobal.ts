export type GlobalEventCategory = "banners" | "events" | "leaderboards" | "recurring" | "offers";

export interface GlobalEvent {
  id: number;
  label: string;
  family: string;
  series: string;
  start: string;
  end: string;
  category: GlobalEventCategory;
  hero?: string;
}

export const globalEventsMeta = {
  client: "GLOBAL",
  generated: "2026-09-25 07:30:47",
  source: "Global client configuration",
};

const event = (
  id: number,
  label: string,
  family: string,
  series: string,
  start: string,
  end: string,
  category: GlobalEventCategory,
  hero?: string,
): GlobalEvent => ({ id, label, family, series, start, end, category, hero });

// Curated from /Users/daschultheiss/android/dashboard/src/data/events.global.json.
// This snapshot intentionally contains Global-client dates only.
export const globalEvents: GlobalEvent[] = [
  event(200390021, "New Card Push · He Bo", "Hero Banner", "new_card_push", "2026-09-02", "2026-09-15", "banners", "Hebo (1013)"),
  event(200890005, "Recharge Event · Phase 5", "Recharge", "charge_activity", "2026-09-02", "2026-09-10", "offers"),
  event(200560020, "Treasure Hunt · Phase 20", "Treasure Hunt", "treasure_hunt", "2026-09-04", "2026-09-08", "recurring"),
  event(200560021, "Treasure Hunt · Phase 21", "Treasure Hunt", "treasure_hunt", "2026-09-11", "2026-09-15", "recurring"),
  event(200390022, "New Card Push · Zaojun", "Hero Banner", "new_card_push", "2026-09-16", "2026-09-29", "banners", "Zaojun (4013)"),
  event(200820003, "Red Packet Handout · Phase 3", "Red Packet", "give_red_packet", "2026-09-16", "2026-09-29", "offers"),
  event(200560022, "Treasure Hunt · Phase 22", "Treasure Hunt", "treasure_hunt", "2026-09-18", "2026-09-22", "recurring"),
  event(200900003, "God Direct Purchase · Nuwa", "Hero Direct Purchase", "hero_shop", "2026-09-19", "2026-09-21", "offers"),
  event(201040002, "God Direct Purchase · Hladgunnr", "Hero Direct Purchase", "hero_shop", "2026-09-24", "2026-09-26", "offers"),
  event(200560023, "Treasure Hunt · Phase 23", "Treasure Hunt", "treasure_hunt", "2026-09-25", "2026-09-29", "recurring"),
  event(201160002, "Sea War · Gaia", "Featured Event", "seawar", "2026-09-28", "2026-10-09", "events"),
  event(200390024, "New Card Push · Mazu", "Hero Banner", "new_card_push", "2026-09-30", "2026-10-13", "banners", "Mazu (2013)"),
  event(200560024, "Treasure Hunt · Phase 24", "Treasure Hunt", "treasure_hunt", "2026-10-02", "2026-10-06", "recurring"),
  event(200810006, "Mystery Shop · Phase 6", "Mystery Shop", "mystery_shop", "2026-10-04", "2026-10-10", "offers"),
  event(200900001, "God Direct Purchase · Hera", "Hero Direct Purchase", "hero_shop", "2026-10-05", "2026-10-07", "offers"),
  event(200560025, "Treasure Hunt · Phase 25", "Treasure Hunt", "treasure_hunt", "2026-10-09", "2026-10-13", "recurring"),
  event(201040003, "God Direct Purchase · Meret", "Hero Direct Purchase", "hero_shop", "2026-10-10", "2026-10-12", "offers"),
  event(201250001, "Choice Gift Pack", "Gift", "choose_gift", "2026-10-12", "2026-10-15", "offers"),
  event(200390023, "New Card Push · Yaoji", "Hero Banner", "new_card_push", "2026-10-14", "2026-10-27", "banners", "Yaoji (3014)"),
  event(200890006, "Recharge Event · Phase 6", "Recharge", "charge_activity", "2026-10-14", "2026-10-22", "offers"),
  event(201110001, "Totem Rank", "Leaderboard", "active_rank3", "2026-10-14", "2026-10-20", "leaderboards"),
  event(200560026, "Treasure Hunt · Phase 26", "Treasure Hunt", "treasure_hunt", "2026-10-16", "2026-10-20", "recurring"),
  event(200900002, "God Direct Purchase · Amun-Ra", "Hero Direct Purchase", "hero_shop", "2026-10-18", "2026-10-20", "offers"),
  event(201130001, "Relic Awakening Rank", "Leaderboard", "active_rank5", "2026-10-21", "2026-10-27", "leaderboards"),
  event(200560027, "Treasure Hunt · Phase 27", "Treasure Hunt", "treasure_hunt", "2026-10-23", "2026-10-27", "recurring"),
  event(201040004, "God Direct Purchase · Heracles", "Hero Direct Purchase", "hero_shop", "2026-10-25", "2026-10-27", "offers"),
  event(200390025, "New Card Push · Charon", "Hero Banner", "new_card_push", "2026-10-28", "2026-11-12", "banners", "Charon (4014)"),
  event(201120003, "Virtue Collection Rank · Phase 3", "Leaderboard", "active_rank4", "2026-10-28", "2026-11-03", "leaderboards"),
  event(200560028, "Treasure Hunt · Phase 28", "Treasure Hunt", "treasure_hunt", "2026-10-30", "2026-11-03", "recurring"),
  event(200900004, "God Direct Purchase · Chronus", "Hero Direct Purchase", "hero_shop", "2026-11-01", "2026-11-03", "offers"),
  event(201400001, "Golden Eye", "Featured Event", "active_gem_creation", "2026-11-02", "2026-11-13", "events"),
  event(201110002, "Totem Rank · Phase 2", "Leaderboard", "active_rank3", "2026-11-04", "2026-11-10", "leaderboards"),
  event(201250002, "Choice Gift Pack · Phase 2", "Gift", "choose_gift", "2026-11-04", "2026-11-07", "offers"),
  event(200560029, "Treasure Hunt · Phase 29", "Treasure Hunt", "treasure_hunt", "2026-11-06", "2026-11-10", "recurring"),
  event(201040005, "God Direct Purchase · Xuannv", "Hero Direct Purchase", "hero_shop", "2026-11-08", "2026-11-10", "offers"),
  event(201130002, "Relic Awakening Rank · Phase 2", "Leaderboard", "active_rank5", "2026-11-11", "2026-11-17", "leaderboards"),
  event(200390026, "New Card Push · Ananke", "Hero Banner", "new_card_push", "2026-11-13", "2026-11-26", "banners", "Ananke (2014)"),
  event(200560030, "Treasure Hunt · Phase 30", "Treasure Hunt", "treasure_hunt", "2026-11-13", "2026-11-17", "recurring"),
  event(200890007, "Recharge Event · Phase 7", "Recharge", "charge_activity", "2026-11-13", "2026-11-21", "offers"),
  event(201120004, "Virtue Collection Rank · Phase 4", "Leaderboard", "active_rank4", "2026-11-18", "2026-11-24", "leaderboards"),
  event(200560031, "Treasure Hunt · Phase 31", "Treasure Hunt", "treasure_hunt", "2026-11-20", "2026-11-24", "recurring"),
  event(200810007, "Mystery Shop · Phase 7", "Mystery Shop", "mystery_shop", "2026-11-22", "2026-11-28", "offers"),
  event(200560032, "Treasure Hunt · Phase 32", "Treasure Hunt", "treasure_hunt", "2026-11-27", "2026-12-01", "recurring"),
  event(200560033, "Treasure Hunt · Phase 33", "Treasure Hunt", "treasure_hunt", "2026-12-04", "2026-12-08", "recurring"),
  event(200560034, "Treasure Hunt · Phase 34", "Treasure Hunt", "treasure_hunt", "2026-12-11", "2026-12-15", "recurring"),
  event(200560035, "Treasure Hunt · Phase 35", "Treasure Hunt", "treasure_hunt", "2026-12-18", "2026-12-22", "recurring"),
  event(200560036, "Treasure Hunt · Phase 36", "Treasure Hunt", "treasure_hunt", "2026-12-25", "2026-12-29", "recurring"),
];

import baseStats from "./base-stats.json";

/**
 * Gibt einen Hero mit aufgelösten Stats zurück
 */
export function resolveHero(hero) {
  const classStats = baseStats[hero.class];

  if (!classStats) {
    throw new Error(`No base stats found for class "${hero.class}"`);
  }

  return {
    ...hero,

    // Stats werden hier zusammengesetzt
    stats: {
      ...classStats,

      // optional: spätere Overrides pro Held
      ...(hero.stats ?? {})
    }
  };
}

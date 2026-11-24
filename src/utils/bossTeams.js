/**
 * @typedef {{ id: string, name: string }} HeroReference
 * @typedef {{ id: string | null, name: string }} BossTeamMember
 */

/**
 * Resolve a boss's single recommended team (`boss.team`, hero ids in formation
 * order: front-left, front-right, back-left, back-center, back-right).
 * Unknown heroes stay visible as a member without an id instead of silently
 * shrinking the team; blank entries are dropped.
 * @param {{ team?: string[] }} boss
 * @param {HeroReference[]} heroes
 * @returns {BossTeamMember[]}
 */
export function getBossTeam(boss, heroes) {
  const normalize = (/** @type {string} */ value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const lookup = new Map(heroes.flatMap(hero => [
    [normalize(hero.id), hero], [normalize(hero.name), hero],
  ]));
  return (boss.team ?? [])
    .map(reference => reference.trim())
    .filter(Boolean)
    .map(reference => {
      const hero = lookup.get(normalize(reference));
      return { id: hero?.id ?? null, name: hero?.name ?? reference };
    });
}

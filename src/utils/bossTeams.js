/**
 * @typedef {{ id: string, name: string }} HeroReference
 * @typedef {{ id: string | null, name: string }} BossTeamMember
 * @typedef {{ id: string, label: string, members: BossTeamMember[] }} BossTeam
 * @typedef {{ id?: string, label?: string, 'hero-comp'?: string, heroes?: string[] }} Composition
 */

/**
 * Adapt the database's two team formats without dropping alternatives or
 * unknown hero slots. The explicit hero-comp field defines display order.
 * @param {{ recommendedComps?: Composition[], beginnerComp?: string[] }} boss
 * @param {HeroReference[]} heroes
 * @returns {BossTeam[]}
 */
export function getBossTeams(boss, heroes) {
  const normalize = (/** @type {string} */ value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const lookup = new Map(heroes.flatMap(hero => [
    [normalize(hero.id), hero], [normalize(hero.name), hero],
  ]));
  const resolve = (/** @type {string[]} */ references) => references
    .map(reference => reference.trim())
    .filter(Boolean)
    .map(reference => {
      const hero = lookup.get(normalize(reference));
      return { id: hero?.id ?? null, name: hero?.name ?? reference };
    });

  const teams = (boss.recommendedComps ?? []).map((comp, index) => {
    const ordered = (comp['hero-comp'] ?? '').split(',').map(id => id.trim()).filter(Boolean);
    return {
      id: comp.id || `team-${index + 1}`,
      label: comp.label?.trim() || `Team ${index + 1}`,
      members: resolve(ordered.length ? ordered : (comp.heroes ?? [])),
    };
  }).filter(team => team.members.length > 0);

  const beginner = resolve(boss.beginnerComp ?? []);
  if (beginner.length) teams.push({ id: 'beginner', label: 'Beginner Comp', members: beginner });
  return teams;
}

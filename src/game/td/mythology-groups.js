// Tower Defense mythology identity. These helpers consume the generated hero-row shape;
// `statSource` is deliberately irrelevant because it only lends balance stats to a TD persona.
export function groupsOf(hero) {
  return Array.isArray(hero?.mythologyGroups) ? hero.mythologyGroups : [];
}

export function hasMythologyGroup(hero, groupId) {
  return typeof groupId === "string" && groupsOf(hero).includes(groupId);
}

export function heroesInMythologyGroup(heroes, groupId) {
  return Array.isArray(heroes) ? heroes.filter((hero) => hasMythologyGroup(hero, groupId)) : [];
}

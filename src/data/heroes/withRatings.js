import heroRatings from "../ratings/hero-ratings.json";
import { heroes as baseHeroes, getHeroById as getBaseHeroById, statMaxima } from "./index.js";

function ratingsForHeroId(id) {
  const r = heroRatings?.[id];
  if (!r) return { overall: null, pvp: null, pve: null };
  return {
    overall: r.overall ?? null,
    pvp: r.pvp ?? null,
    pve: r.pve ?? null,
  };
}

function withRatings(hero) {
  if (!hero) return hero;
  return {
    ...hero,
    ratings: ratingsForHeroId(hero.id),
  };
}

export const heroes = baseHeroes.map(withRatings);

export function getHeroById(id) {
  return withRatings(getBaseHeroById(id));
}

export { statMaxima };


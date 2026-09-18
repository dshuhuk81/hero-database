import heroRatings from "../ratings/hero-ratings.json";
import { resolveHeroRatings } from "../ratings/ratingSystem.js";
import { heroes as baseHeroes, getHeroById as getBaseHeroById, statMaxima } from "./index.js";

function ratingsForHeroId(id) {
  return resolveHeroRatings(heroRatings?.[id]);
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

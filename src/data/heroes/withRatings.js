import heroRatings from "../ratings/hero-ratings.json";
import { HERO_RATING_KEYS } from "../ratings/heroRatingFields.js";
import { heroes as baseHeroes, getHeroById as getBaseHeroById, statMaxima } from "./index.js";

function ratingsForHeroId(id) {
  const r = heroRatings?.[id];
  return Object.fromEntries(HERO_RATING_KEYS.map((key) => [key, r?.[key] ?? null]));
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

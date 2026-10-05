import { levelScale } from "./campaign.js";

export function levelHero(hero, campaign, requestedLevel) {
  const maximum = campaign.heroLevels?.max ?? 1;
  const level = Math.max(1, Math.min(maximum, Math.floor(Number(requestedLevel) || 1)));
  const scale = levelScale(campaign, level);
  return {
    ...hero,
    atk: Math.round(hero.atk * scale),
    hp: Math.round(hero.hp * scale),
    campaignLevel: level,
  };
}

export function createCombatLabDuel() {
  return {};
}

// Runtime hero stat multipliers (tuning.heroMultipliers in gameBalance.tuning.json), so every hero's
// numbers can be tuned by hand without rebuilding gameBalance.json.
//   { atk: 2.5, hp: 2.5, armor: 1, magicRes: 1,
//     byRarity: { legendary: { atk: 1.6, hp: 1.6 } }, byClass: { Warrior: { atk: 1.2 } }, byHero: { fenrir: { hp: 1.5 } } }
// Global, rarity, class and hero factors multiply. `atk` scales dps too (dps = atk * aps). Armor and magic
// resistance default to 1: the damage formula (sim.js K) works on their absolute size.
// Apply once, to the raw gameBalance.json rows, before skinning or building a run.
const STATS = ["atk", "hp", "armor", "magicRes"];

export function heroMultiplier(config, hero, stat) {
  const factor = (value) => (Number.isFinite(value) && value > 0 ? value : 1);
  return factor(config?.[stat]) * factor(config?.byRarity?.[hero.rarity]?.[stat]) * factor(config?.byClass?.[hero.class]?.[stat]) * factor(config?.byHero?.[hero.id]?.[stat]);
}

export function applyHeroMultipliers(heroes, tuning) {
  const config = tuning?.heroMultipliers;
  if (!config) return heroes;
  return heroes.map((hero) => {
    const [atk, hp, armor, magicRes] = STATS.map((stat) => heroMultiplier(config, hero, stat));
    return {
      ...hero,
      atk: Math.round(hero.atk * atk),
      dps: Math.round(hero.dps * atk),
      hp: Math.round(hero.hp * hp),
      armor: Math.round(hero.armor * armor),
      magicRes: Math.round(hero.magicRes * magicRes),
    };
  });
}

// types/hero.ts
export interface HeroStats {
  hp: number;
  atk: number;
  armor: number;
  magicRes: number;
  dodgeRate: number;
  hitBonus: number;
  critRate: number;
  critRes: number;
  critDmgBonus: number;
  critDmgRed: number;
  energy: number;
  cooldownHaste: number;
  atkSpdBonus: number;
  pDmgBonus: number;
  pDmgRed: number;
  mDmgBonus: number;
  mDmgRed: number;
  healEff: number;
  rechargeEff: number;
  lifestealEff: number;
  reflectEff: number;
  effectRes: number;
  effectHit: number;
  controlRes: number;
  controlBonus: number;
  normalSkillPWR: number;
  ultimatePWR: number;
}

export interface HeroRatings {
  overall: string;
  grimSurge: string;
  delusionsDen: string;
  torrentRift: string;
  pvp: string;
}

export interface SkillUpgrades {
  level2: string;
  level3: string;
  level4: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  upgrades: SkillUpgrades;
  image: string;
}

export interface Relic {
  name: string;
  description: string;
  upgrades: {
    level2: string;
    level3: string;
    level4: string;
  };
  image: string;
}

export interface FormationHero {
  heroId: string;
  position: 'back-left' | 'back-right' | 'front-left' | 'front-center' | 'front-right';
}

export interface TeamComp {
  title: string;
  /*description: string;*/
  formation: FormationHero[];
}

export interface TeamComps {
  pve: TeamComp;
  pvp: TeamComp;
}

export interface Hero {
  id: string;
  name: string;
  image: string;
  faction: string;
  role: string;
  class: string;
  rarity: string;
  description: string;
  ratings: HeroRatings;
  recommendedRelicLevel?: number;
  level?: number;
  evolution?: string;
  stats: HeroStats;
  skills: Skill[];
  relic: Relic;
  teamComps?: TeamComps;
}

export interface HeroesData {
  heroes: Hero[];
  metadata?: {
    total_heroes: number;
    epic_heroes: number;
    legendary_heroes: number;
  };
}

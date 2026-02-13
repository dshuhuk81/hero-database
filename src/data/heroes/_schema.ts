export interface Hero {
  id: string;

  name: string;
  image: string;

  faction: "Starglint" | "Hearts" | "Clubs" | "Diamonds" | "Spades";
  role: "Nimble" | "Arcane" | "Hefty";
  class: "Fighter" | "Support" | "Assassin" | "Tank" | "Archer";
  rarity: "Common" | "Epic" | "Legendary";

  description: string;

  ratings: {
    overall: "SSS" | "SS" | "S" | "A" | "B" | "C";
    grimSurge?: string;
    delusionsDen?: string;
    torrentRift?: string;
    pvp?: string;
    pve?: string;
  };

  stats: {
    hp: number;
    atk: number;
    armor: number;
    mres: number;
    dodge: number;
    hit: number;
    critRate: number;
    critRes: number;
    critDmg: number;
    critDmgRed: number;
    energy: number;
  };

  skills: {
    id: string;
    name: string;
    icon: string;
    description: string;
    upgrades: {
      level2?: string;
      level3?: string;
      level4?: string;
    };
  }[];

  relic?: {
    name: string;
    icon: string;
    description: string;
  };
}

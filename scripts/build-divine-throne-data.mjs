import fs from "node:fs";
import path from "node:path";

const SOURCE_PATH = "src/data/divinethrone/throne_capture_current.json";
const HERO_DB_PATH = "src/data/all_heroes_db.json";
const OUTPUT_PATH = "src/data/divine-throne.json";

const locales = ["zh", "en", "de", "es", "ru"];
const milestoneLevels = [10, 20, 30, 40];

const heroIdByCaptureId = {
  5005: "zeus",
  5004: "nuwa",
  5003: "dionysus",
  5002: "nyx",
  5001: "amunra",
  4008: "ullr",
  4006: "prometheus",
  4005: "jingwei",
  4004: "yuelao",
  4003: "yanluo",
  4002: "caishen",
  4001: "isis",
  3008: "fengyi",
  3007: "diana",
  3006: "pan",
  3005: "artemis",
  3004: "jormungandr",
  3003: "demeter",
  3002: "freya",
  3001: "anubis",
  2008: "phoenix",
  2007: "set",
  2006: "athena",
  2005: "bastet",
  2004: "geb",
  2003: "horus",
  2002: "ares",
  2001: "sekhmet",
  1008: "momus",
  1007: "khepri",
  1006: "iris",
  1005: "nemesis",
  1004: "poseidon",
  1003: "hela",
  1002: "medusa",
  1001: "hecate",
};

const throneAssetIdByHeroId = {
  zeus: "zeus",
  nuwa: "nuwa",
  dionysus: "dionysus",
  nyx: "nyx",
  amunra: "amunra",
  ullr: "ullr",
  prometheus: "prometheus",
  jingwei: "jingwei",
  yuelao: "yuelao",
  yanluo: "yanluo",
  caishen: "caishen",
  isis: "isis",
  fengyi: "fengyi",
  diana: "diana",
  pan: "pan",
  artemis: "artemis",
  jormungandr: "jormungandr",
  demeter: "demeter",
  freya: "freya",
  anubis: "anubis",
  phoenix: "phoenix",
  set: "set",
  athena: "athena",
  bastet: "bastet",
  geb: "geb",
  horus: "horus",
  ares: "ares",
  sekhmet: "sekhmet",
  momus: "momus",
  khepri: "khepri",
  iris: "iris",
  nemesis: "nemesis",
  poseidon: "poseidon",
  hela: "hela",
  medusa: "medusa",
  hecate: "hecate",
};

const metadata = {
  zeus: {
    seatName: {
      en: "Throne of Thunder",
      de: "Thron des Donners",
      es: "Trono del trueno",
      ru: "Трон грома",
    },
    subtitle: { en: "", de: "", es: "", ru: "" },
    milestones: {
      10: {
        en: "At the start of battle, Zeus gains a permanent Thunder Clone. The Thunder Clone inherits 30% of Zeus's total attributes.",
        de: "Zu Kampfbeginn erhält Zeus einen permanenten Donnerklon. Der Donnerklon erbt 30% von Zeus' gesamten Attributen.",
        es: "Al inicio del combate, Zeus obtiene un clon de trueno permanente. El clon hereda el 30% de todos los atributos de Zeus.",
        ru: "В начале боя Зевс получает постоянного громового двойника. Двойник наследует 30% всех характеристик Зевса.",
      },
      20: {
        en: "The Thunder Clone inherits 60% of Zeus's total attributes.",
        de: "Der Donnerklon erbt 60% von Zeus' gesamten Attributen.",
        es: "El clon de trueno hereda el 60% de todos los atributos de Zeus.",
        ru: "Громовой двойник наследует 60% всех характеристик Зевса.",
      },
      30: {
        en: "When Zeus is about to die, he sacrifices the Thunder Clone to become invincible for 3s and restore 60% max HP. Once per battle.",
        de: "Wenn Zeus fallen würde, opfert er den Donnerklon, wird 3 Sekunden unverwundbar und stellt 60% max. LP wieder her. Einmal pro Kampf.",
        es: "Cuando Zeus está a punto de morir, sacrifica el clon de trueno, se vuelve invencible durante 3 s y recupera un 60% de su vida máxima. Una vez por combate.",
        ru: "Когда Зевс должен погибнуть, он жертвует громовым двойником, становится неуязвимым на 3 сек. и восстанавливает 60% макс. здоровья. Один раз за бой.",
      },
      40: {
        en: "The Thunder Clone inherits 70% of Zeus's total attributes.",
        de: "Der Donnerklon erbt 70% von Zeus' gesamten Attributen.",
        es: "El clon de trueno hereda el 70% de todos los atributos de Zeus.",
        ru: "Громовой двойник наследует 70% всех характеристик Зевса.",
      },
    },
  },
  nuwa: {
    seatName: { en: "Throne of Humanity", de: "Thron der Menschheit", es: "Trono de la humanidad", ru: "Трон человечества" },
    subtitle: { en: "Sacred Sovereign Nuwa", de: "Heilige Herrscherin Nuwa", es: "Soberana sagrada Nuwa", ru: "Священная владычица Нюйва" },
    milestones: {
      10: {
        en: "[Divine Shield] also grants the target 30% ATK for 5s.",
        de: "[Göttlicher Schild] gewährt dem Ziel außerdem 30% ANG für 5 Sekunden.",
        es: "[Escudo divino] también otorga al objetivo un 30% de ATQ durante 5 s.",
        ru: "[Божественный щит] также дает цели 30% АТК на 5 сек.",
      },
      20: {
        en: "[Divine Shield] also grants the target 40% ATK for 5s.",
        de: "[Göttlicher Schild] gewährt dem Ziel außerdem 40% ANG für 5 Sekunden.",
        es: "[Escudo divino] también otorga al objetivo un 40% de ATQ durante 5 s.",
        ru: "[Божественный щит] также дает цели 40% АТК на 5 сек.",
      },
      30: {
        en: "For each summoned unit on the field, Nuwa's shield strength increases by 10%.",
        de: "Für jede beschworene Einheit auf dem Feld steigt Nuwas Schildstärke um 10%.",
        es: "Por cada unidad invocada en el campo, la potencia del escudo de Nuwa aumenta un 10%.",
        ru: "За каждого призванного юнита на поле сила щитов Нюйвы повышается на 10%.",
      },
      40: {
        en: "[Divine Shield] also grants the target 50% ATK for 5s.",
        de: "[Göttlicher Schild] gewährt dem Ziel außerdem 50% ANG für 5 Sekunden.",
        es: "[Escudo divino] también otorga al objetivo un 50% de ATQ durante 5 s.",
        ru: "[Божественный щит] также дает цели 50% АТК на 5 сек.",
      },
    },
  },
  dionysus: {
    seatName: { en: "Throne of Wine and Ecstasy", de: "Thron des Weins und der Ekstase", es: "Trono del vino y el éxtasis", ru: "Трон вина и экстаза" },
    subtitle: { en: "God of Wine and Revelry", de: "Gott des Weins und der Ausgelassenheit", es: "Dios del vino y la celebración", ru: "Бог вина и веселья" },
    milestones: {
      10: {
        en: "Rejuvenating Dance affects 1 additional unit.",
        de: "Verjüngungstanz wirkt auf 1 zusätzliche Einheit.",
        es: "Danza rejuvenecedora afecta a 1 unidad adicional.",
        ru: "Омолаживающий танец действует на 1 дополнительного юнита.",
      },
      20: {
        en: "Rejuvenating Dance additionally restores HP equal to 200% ATK.",
        de: "Verjüngungstanz stellt zusätzlich LP in Höhe von 200% ANG wieder her.",
        es: "Danza rejuvenecedora restaura vida adicional equivalente al 200% del ATQ.",
        ru: "Омолаживающий танец дополнительно восстанавливает здоровье в размере 200% АТК.",
      },
      30: {
        en: "Rejuvenating Dance affects 3 additional units.",
        de: "Verjüngungstanz wirkt auf 3 zusätzliche Einheiten.",
        es: "Danza rejuvenecedora afecta a 3 unidades adicionales.",
        ru: "Омолаживающий танец действует на 3 дополнительных юнитов.",
      },
      40: {
        en: "Rejuvenating Dance additionally restores HP equal to 250% ATK.",
        de: "Verjüngungstanz stellt zusätzlich LP in Höhe von 250% ANG wieder her.",
        es: "Danza rejuvenecedora restaura vida adicional equivalente al 250% del ATQ.",
        ru: "Омолаживающий танец дополнительно восстанавливает здоровье в размере 250% АТК.",
      },
    },
  },
  nyx: {
    seatName: { en: "Throne of Night", de: "Thron der Nacht", es: "Trono de la noche", ru: "Трон ночи" },
    subtitle: { en: "Goddess of Night", de: "Göttin der Nacht", es: "Diosa de la noche", ru: "Богиня ночи" },
    milestones: {
      10: {
        en: "At the start of battle, all enemies lose 30% Hit Rate for 15s.",
        de: "Zu Kampfbeginn verlieren alle Gegner 30% Trefferchance für 15 Sekunden.",
        es: "Al inicio del combate, todos los enemigos pierden un 30% de precisión durante 15 s.",
        ru: "В начале боя все враги теряют 30% меткости на 15 сек.",
      },
      20: {
        en: "Nyx deals 40% increased damage to units above 30% HP.",
        de: "Nyx verursacht 40% mehr Schaden an Einheiten mit mehr als 30% LP.",
        es: "Nyx inflige un 40% más de daño a unidades con más del 30% de vida.",
        ru: "Никс наносит на 40% больше урона юнитам с запасом здоровья выше 30%.",
      },
      30: {
        en: "At the start of battle, all enemies lose 30% Hit Rate for 30s.",
        de: "Zu Kampfbeginn verlieren alle Gegner 30% Trefferchance für 30 Sekunden.",
        es: "Al inicio del combate, todos los enemigos pierden un 30% de precisión durante 30 s.",
        ru: "В начале боя все враги теряют 30% меткости на 30 сек.",
      },
      40: {
        en: "Nyx deals 45% increased damage to units above 30% HP.",
        de: "Nyx verursacht 45% mehr Schaden an Einheiten mit mehr als 30% LP.",
        es: "Nyx inflige un 45% más de daño a unidades con más del 30% de vida.",
        ru: "Никс наносит на 45% больше урона юнитам с запасом здоровья выше 30%.",
      },
    },
  },
  amunra: {
    seatName: { en: "Throne of the Hidden Sun", de: "Thron der verborgenen Sonne", es: "Trono del sol oculto", ru: "Трон скрытого солнца" },
    subtitle: { en: "God of the Sun and Hidden Things", de: "Gott der Sonne und des Verborgenen", es: "Dios del sol y de lo oculto", ru: "Бог солнца и сокрытого" },
    milestones: {
      10: {
        en: "During [Sunlight], each flying sword fired grants the weakest ally a shield equal to 50% ATK for 3s.",
        de: "Während [Sonnenlicht] verleiht jedes abgefeuerte Flugschwert dem schwächsten Verbündeten einen Schild in Höhe von 50% ANG für 3 Sekunden.",
        es: "Durante [Luz solar], cada espada voladora disparada otorga al aliado más débil un escudo equivalente al 50% del ATQ durante 3 s.",
        ru: "Во время [Солнечного сияния] каждый выпущенный летающий меч дает самому слабому союзнику щит в размере 50% АТК на 3 сек.",
      },
      20: {
        en: "At battle start, [Radiance] affects one additional ally, prioritizing frontline allies.",
        de: "Zu Kampfbeginn wirkt [Glanz] auf einen zusätzlichen Verbündeten, bevorzugt Frontlinien-Verbündete.",
        es: "Al inicio del combate, [Resplandor] afecta a un aliado adicional, priorizando a los aliados de primera línea.",
        ru: "В начале боя [Сияние] действует на одного дополнительного союзника, отдавая приоритет передней линии.",
      },
      30: {
        en: "Damage dealt during [Sunlight] becomes True Damage.",
        de: "Während [Sonnenlicht] verursachter Schaden wird zu absolutem Schaden.",
        es: "El daño infligido durante [Luz solar] se convierte en daño verdadero.",
        ru: "Урон во время [Солнечного сияния] становится истинным уроном.",
      },
      40: {
        en: "During [Sunlight], each flying sword fired grants the weakest ally a shield equal to 60% ATK for 3s.",
        de: "Während [Sonnenlicht] verleiht jedes abgefeuerte Flugschwert dem schwächsten Verbündeten einen Schild in Höhe von 60% ANG für 3 Sekunden.",
        es: "Durante [Luz solar], cada espada voladora disparada otorga al aliado más débil un escudo equivalente al 60% del ATQ durante 3 s.",
        ru: "Во время [Солнечного сияния] каждый выпущенный летающий меч дает самому слабому союзнику щит в размере 60% АТК на 3 сек.",
      },
    },
  },
};

const compactMetadata = {
  ullr: ["Throne of Winter", "God of Winter, Snow and Hunting", [
    "When casting [Blood Contract], also shields the ally connected by frost; that shield has 30% effectiveness.",
    "Casting [Lash of Pain] makes the target permanently take 10% increased damage, stacking up to 3 times.",
    "When casting [Blood Contract], also shields the ally connected by frost; that shield has 60% effectiveness.",
    "Casting [Lash of Pain] makes the target permanently take 15% increased damage, stacking up to 3 times.",
  ]],
  prometheus: ["Throne of Sacrifice", "Fire Thief", [
    "While in [Punishment State], damage taken is reduced by an additional 20%.",
    "Gains 200 initial Energy at the start of battle.",
    "While in [Punishment State], damage taken is reduced by an additional 40%.",
    "Gains 200 initial Energy at the start of battle.",
  ]],
  jingwei: ["Throne of Oath", "Imperial Princess Who Carries Wood to Calm the Sea", [
    "Each tornado from [Howling Hurricane] reduces the target's Armor and M-RES by 10% for 15s, stacking up to 10 times.",
    "At full [Grand Entrance] stacks, gains an additional 45% Crit DMG.",
    "Each tornado from [Howling Hurricane] reduces the target's Armor and M-RES by 20% for 15s, stacking up to 10 times.",
    "At full [Grand Entrance] stacks, gains an additional 50% Crit DMG.",
  ]],
  yuelao: ["Throne of Mandarin Ducks", "Red Joy Deity", [
    "When the linked unit with the highest HP is about to die, they gain a shield equal to 200% ATK of the linked unit with the highest ATK.",
    "When the linked unit with the highest ATK is about to die, they gain a shield equal to 20% max HP of the linked unit with the highest HP.",
    "When the linked unit with the highest HP is about to die, they gain a shield equal to 300% ATK of the linked unit with the highest ATK.",
    "When the linked unit with the highest ATK is about to die, they gain a shield equal to 30% max HP of the linked unit with the highest HP.",
  ]],
  yanluo: ["Throne of Judgment", "Lord of the Underworld", [
    "If [Underworld Arbitration] kills an enemy, Yanluo gains 10% of that unit's ATK, up to 1000% of his own ATK.",
    "If [Underworld Arbitration] kills an enemy, Yanluo gains 20% of that unit's ATK, up to 2000% of his own ATK.",
    "[Underworld Arbitration] deals 50% increased damage to enemies below 50% HP.",
    "If [Underworld Arbitration] kills an enemy, Yanluo gains 25% of that unit's ATK, up to 2500% of his own ATK.",
  ]],
  caishen: ["Throne of Prosperity", "Lord of Wealth and Treasure", [
    "[Gold Ingot] additionally grants the target a shield equal to 300% of Caishen's ATK.",
    "[Gold Ingot] additionally grants the target a shield equal to 400% of Caishen's ATK.",
    "The trigger range of [Endless Fortune] becomes global.",
    "[Gold Ingot] additionally grants the target a shield equal to 500% of Caishen's ATK.",
  ]],
  isis: ["Throne of Mercy", "Goddess of Life and Motherhood", [
    "Isis's Normal Attack fires an extra arrow at a random target. It can trigger attack effects and deals 30% of the original damage.",
    "Isis gains 600 Energy on entry.",
    "The extra arrow deals 50% of the original damage.",
    "The extra arrow deals 55% of the original damage.",
  ]],
  fengyi: ["Throne of Blossoms", "God of Wind", [
    "The first time Fengyi gains Whirlwind, she gains 50% Crit Rate.",
    "Fengyi's critical hits ignore 80% of the target's Armor and M-RES.",
    "Each [Whirlwind] stack grants Fengyi an additional 70% Crit DMG.",
    "Each [Whirlwind] stack grants Fengyi an additional 75% Crit DMG.",
  ]],
  diana: ["Throne of the Oak", "Goddess of the Moon and Oak", [
    "When a unit with Moon Phase participates in killing an enemy, Moon Phase is extended by 5s.",
    "Moon Phase additionally grants 20% Crit Rate and 30% Hit Rate.",
    "Moon Phase cooldown is reduced to 10s.",
    "Moon Phase additionally grants 30% Crit Rate and 40% Hit Rate.",
  ]],
  pan: ["Throne of Desire and Dread", "God of Wildlife and Forests", [
    "When an allied deity unit is killed, Pan curses the killer and fears them for 5s.",
    "When an allied deity unit is killed, Pan curses the killer, fears them for 5s, and makes them take 30% increased damage.",
    "[Pipes] additionally puts one more unit to sleep.",
    "When an allied deity unit is killed, Pan curses the killer and fears them for 8s.",
  ]],
  artemis: ["Throne of the Silver Moon", "Mistress of Beasts and Lady of the Wild", [
    "[Gale-Force Shot] reduces the target's Armor and M-RES by 5% for 10s on hit, stacking up to 10 times.",
    "When [Hunter's Snare] triggers, Artemis gains 300 Energy.",
    "[Gale-Force Shot] reduces the target's Armor and M-RES by 10% for 10s on hit, stacking up to 10 times.",
    "When [Hunter's Snare] triggers, Artemis gains 400 Energy.",
  ]],
  jormungandr: ["Throne of the Ouroboros", "World Serpent", [
    "For every 10% max HP Jormungandr loses, he gains 5% ATK, up to 50%. His corpse inherits this ATK at 30% efficiency.",
    "For every 10% max HP Jormungandr loses, he gains 10% ATK, up to 100%.",
    "During [Serpent's Approach], Jormungandr gains Super Armor.",
    "For every 10% max HP Jormungandr loses, he gains 20% ATK, up to 100%.",
  ]],
  demeter: ["Throne of Harvest", "Goddess of Agriculture, Grain and Harvest", [
    "Each heal from [Recovery] additionally restores HP to Demeter equal to 50% ATK.",
    "[Recovery] trigger count +1.",
    "Each heal from [Recovery] additionally restores HP to Demeter equal to 85% ATK.",
    "When [Recovery] triggers, Demeter gains a shield equal to 500% ATK.",
  ]],
  freya: ["Throne of Blossoming Flowers", "Goddess of Love and Beauty", [
    "25% of Freya's overhealing becomes a shield, up to 100% of the target's max HP.",
    "When an allied unit drops to 50% max HP, Freya restores HP equal to 500% of her ATK. Triggers once.",
    "35% of Freya's overhealing becomes a shield.",
    "40% of Freya's overhealing becomes a shield.",
  ]],
  anubis: ["Throne of Weighing Hearts", "God of Funerals, Embalming and Death", [
    "For 8s after [Soulfarer] triggers, the target takes 30% increased damage.",
    "For 8s after [Soulfarer] triggers, the target takes 50% increased damage.",
    "[Featherfall Judgment] deals 45% increased damage, and the Artifact execute threshold increases to 10% max HP if that Artifact effect is unlocked.",
    "[Featherfall Judgment] deals 50% increased damage.",
  ]],
  phoenix: ["Throne of Poetry and Fire", "Undying Bird", [
    "Phoenix's Nirvana state is enhanced: restores an additional 5% max HP per second.",
    "Phoenix's Nirvana state is enhanced: restores an additional 12% max HP per second.",
    "After Phoenix revives from Nirvana for the first time, 40% of her damage becomes True Damage. Each later Nirvana increases this by 20%, up to 100%.",
    "Phoenix's Nirvana state is enhanced: restores an additional 15% max HP per second.",
  ]],
  set: ["Throne of Frenzy and Sand", "God of War, Desert and Storms", [
    "[Dunes' Bloodrage] increases allied units' Dodge Rate by 10%.",
    "[Dunes' Bloodrage] increases allied units' Dodge Rate by 20%.",
    "When [Khamsin's Shelter] lands, it deals 200% damage and knockdown to units around the target.",
    "When [Khamsin's Shelter] lands, it deals 300% damage and knockdown to units around the target.",
  ]],
  athena: ["Throne of Wisdom and Strategy", "Goddess of Wisdom, Strategy and Craft", [
    "Allies inside Athena's aura restore HP equal to 100% ATK every second.",
    "Allies inside Athena's aura restore HP equal to 150% ATK every second.",
    "When 3 allied units are inside Athena's aura, her Healing Efficiency and Shield Strength increase by 50%.",
    "When 3 allied units are inside Athena's aura, damage Athena takes is reduced by 70%.",
  ]],
  bastet: ["Throne of the Cat", "Guardian Goddess of the Home", [
    "When Bastet triggers Dodge, she permanently gains 2.5% ATK, up to 25%.",
    "When Bastet triggers Dodge, she permanently gains 5% ATK, up to 50%.",
    "When Bastet has at least 100% Dodge, her damage dealt increases by 20%.",
    "When Bastet triggers Dodge, she permanently gains 5% ATK, up to 60%.",
  ]],
  geb: ["Throne of the Earth Veins", "God of Earth and Fertility", [
    "After [Unstoppable] ends, Geb taunts enemies within 3m for 3s.",
    "After [Unstoppable] ends, Geb taunts enemies within 3m for 5s.",
    "While shielded, Geb takes 30% reduced damage.",
    "After [Unstoppable] ends, Geb taunts enemies within 5m for 5s.",
  ]],
  horus: ["Throne of Piercing Sight", "God of Sky and Vengeance", [
    "While in [Vengeance], damage dealt to the locked enemy increases by 30%.",
    "While in [Vengeance], damage dealt to the locked enemy increases by 50%.",
    "While in [Vengeance], damage taken from enemies that are not the locked target is reduced by 50%.",
    "After casting [Frenzied Blade], Horus gains 30% ATK for 5s. This effect can stack.",
  ]],
  ares: ["Throne of War and Violence", "God of War, Killing and Riot", [
    "[Unyielding Will] duration increases by 2s.",
    "[Battlefield Storm] damage dealt increases by 30%.",
    "During [Unyielding Will], participating in a kill extends its duration by 3s.",
    "[Unyielding Will] duration increases by 3s.",
  ]],
  sekhmet: ["Throne of the Blazing Sun", "Goddess of Fire, War and Vengeance", [
    "Sekhmet steals 15% of the [Duel] target's total attributes, up to 75% of her own corresponding attributes.",
    "Gains 10 stacks of [Fighting Spirit] on entry.",
    "Sekhmet steals 20% of the [Duel] target's total attributes, up to 100% of her own corresponding attributes.",
    "Sekhmet steals 25% of the [Duel] target's total attributes, up to 125% of her own corresponding attributes.",
  ]],
  momus: ["Throne of Mockery", "God of Mockery, Blame and Satire", [
    "When taking damage, Momus gains 5% Armor and M-RES, stacking up to 20 times.",
    "When taking damage, Momus gains 10% Armor and M-RES, stacking up to 20 times.",
    "When reaching maximum stacks, refreshes the uses of [Phantom Puppet]. Once only.",
    "When taking damage, Momus gains 12% Armor and M-RES, stacking up to 20 times.",
  ]],
  khepri: ["Throne of Rebirth", "God of Sunrise and the Scarab", [
    "Each hit of Khepri's Ultimate reduces the target's M-RES by 10% for 10s, stacking 5 times.",
    "Each hit of Khepri's Ultimate reduces the target's M-RES by 20% for 10s, stacking 5 times.",
    "While under [Scarab's Blessing], Khepri restores 100 Energy per second.",
    "Each hit of Khepri's Ultimate reduces the target's M-RES by 25% for 10s, stacking 5 times.",
  ]],
  iris: ["Throne of the Rainbow", "Rainbow Messenger", [
    "At battle start, summons a butterfly on the nearest frontline ally. After 4s, it deals 150% ATK damage to enemies within 3m and stuns them for 3s.",
    "At battle start, summons a butterfly on the nearest frontline ally. After 4s, it deals 150% ATK damage to enemies within 3m and stuns them for 4s.",
    "At battle start, summons butterflies on the nearest 2 frontline allies. After 4s, they deal 150% ATK damage to enemies within 3m and stun them for 4s.",
    "At battle start, summons butterflies on the nearest 2 frontline allies. After 4s, they deal 150% ATK damage to enemies within 3m and stun them for 5s.",
  ]],
  nemesis: ["Throne of Justice", "Goddess of Vengeance", [
    "The first time Nemesis damages each enemy deity unit, she permanently gains 30% ATK, stacking up to 5 times.",
    "Nemesis gains 40% ATK.",
    "The first time Nemesis participates in a kill, she permanently gains 50% Lifesteal.",
    "Nemesis gains 45% ATK.",
  ]],
  poseidon: ["Throne of Ocean Currents", "God of the Sea and Earthquakes", [
    "When Poseidon applies a control effect, he gains a shield equal to 50% ATK.",
    "When Poseidon applies a control effect, he gains a shield equal to 100% ATK.",
    "While Poseidon has a shield, damage taken is reduced by 40%.",
    "While Poseidon has a shield, damage taken is reduced by 50%.",
  ]],
  hela: ["Throne of Decay", "Queen of Death and the Underworld", [
    "Hela gains 100 initial Energy on entry.",
    "Hela gains 300 initial Energy on entry.",
    "After casting her Ultimate, refreshes the cooldown of [Blight upon Life].",
    "Hela gains 400 initial Energy on entry.",
  ]],
  medusa: ["Throne of Serpents and Gaze", "Gorgon", [
    "After Medusa casts her Ultimate, she gains 40% ATK SPD.",
    "After Medusa deals damage to [Serpent Kiss Mark] 3 times, she petrifies the target for 1s.",
    "After Medusa deals damage to [Serpent Kiss Mark] 3 times, she petrifies the target for 2s.",
    "After Medusa casts her Ultimate, she gains 60% ATK SPD.",
  ]],
  hecate: ["Throne of the Nethermoon", "Triple Goddess of Dark Moon and Opportunity", [
    "Healing received by Hecate increases by 30%.",
    "When casting her Ultimate, Hecate also steals 2% Armor and M-RES from enemy units on the field, up to 100% of her own Armor and M-RES.",
    "Healing received by Hecate increases by 50%.",
    "Healing received by Hecate increases by 60%.",
  ]],
};

const compactTranslationDrafts = {
  ullr: {
    de: ["Thron des Winters", "Gott des Winters, des Schnees und der Jagd", [
      "Beim Wirken von [Blood Contract] erhält auch der durch Frost verbundene Verbündete einen Schild; dieser Schild hat 30% Wirksamkeit.",
      "Das Wirken von [Lash of Pain] lässt das Ziel dauerhaft 10% mehr Schaden erleiden, bis zu 3-mal stapelbar.",
      "Beim Wirken von [Blood Contract] erhält auch der durch Frost verbundene Verbündete einen Schild; dieser Schild hat 60% Wirksamkeit.",
      "Das Wirken von [Lash of Pain] lässt das Ziel dauerhaft 15% mehr Schaden erleiden, bis zu 3-mal stapelbar.",
    ]],
    es: ["Trono del invierno", "Dios del invierno, la nieve y la caza", [
      "Al lanzar [Blood Contract], también protege al aliado conectado por la escarcha; ese escudo tiene un 30% de efectividad.",
      "Lanzar [Lash of Pain] hace que el objetivo reciba permanentemente un 10% más de daño, acumulable hasta 3 veces.",
      "Al lanzar [Blood Contract], también protege al aliado conectado por la escarcha; ese escudo tiene un 60% de efectividad.",
      "Lanzar [Lash of Pain] hace que el objetivo reciba permanentemente un 15% más de daño, acumulable hasta 3 veces.",
    ]],
    ru: ["Трон зимы", "Бог зимы, снега и охоты", [
      "При применении [Blood Contract] также дает щит союзнику, связанному морозом; этот щит имеет 30% эффективности.",
      "Применение [Lash of Pain] навсегда увеличивает получаемый целью урон на 10%, суммируется до 3 раз.",
      "При применении [Blood Contract] также дает щит союзнику, связанному морозом; этот щит имеет 60% эффективности.",
      "Применение [Lash of Pain] навсегда увеличивает получаемый целью урон на 15%, суммируется до 3 раз.",
    ]],
  },
  prometheus: {
    de: ["Thron des Opfers", "Feuerdieb", [
      "Während [Punishment State] wird erlittener Schaden zusätzlich um 20% reduziert.",
      "Erhält zu Kampfbeginn 200 Anfangsenergie.",
      "Während [Punishment State] wird erlittener Schaden zusätzlich um 40% reduziert.",
      "Erhält zu Kampfbeginn 200 Anfangsenergie.",
    ]],
    es: ["Trono del sacrificio", "Ladrón del fuego", [
      "Mientras está en [Punishment State], el daño recibido se reduce un 20% adicional.",
      "Obtiene 200 de energía inicial al comienzo del combate.",
      "Mientras está en [Punishment State], el daño recibido se reduce un 40% adicional.",
      "Obtiene 200 de energía inicial al comienzo del combate.",
    ]],
    ru: ["Трон жертвы", "Похититель огня", [
      "В состоянии [Punishment State] получаемый урон дополнительно снижается на 20%.",
      "Получает 200 начальной энергии в начале боя.",
      "В состоянии [Punishment State] получаемый урон дополнительно снижается на 40%.",
      "Получает 200 начальной энергии в начале боя.",
    ]],
  },
  jingwei: {
    de: ["Thron des Schwurs", "Kaiserliche Prinzessin, die Holz trägt, um das Meer zu beruhigen", [
      "Jeder Tornado von [Howling Hurricane] senkt Rüstung und M-RES des Ziels 15 Sekunden lang um 10%, bis zu 10-mal stapelbar.",
      "Bei vollen [Grand Entrance]-Stapeln erhält Jingwei zusätzlich 45% Krit-SCH.",
      "Jeder Tornado von [Howling Hurricane] senkt Rüstung und M-RES des Ziels 15 Sekunden lang um 20%, bis zu 10-mal stapelbar.",
      "Bei vollen [Grand Entrance]-Stapeln erhält Jingwei zusätzlich 50% Krit-SCH.",
    ]],
    es: ["Trono del juramento", "Princesa imperial que lleva madera para calmar el mar", [
      "Cada tornado de [Howling Hurricane] reduce la armadura y la RES M del objetivo un 10% durante 15 s, acumulable hasta 10 veces.",
      "Con acumulaciones máximas de [Grand Entrance], obtiene un 45% adicional de daño crítico.",
      "Cada tornado de [Howling Hurricane] reduce la armadura y la RES M del objetivo un 20% durante 15 s, acumulable hasta 10 veces.",
      "Con acumulaciones máximas de [Grand Entrance], obtiene un 50% adicional de daño crítico.",
    ]],
    ru: ["Трон клятвы", "Императорская принцесса, несущая дерево, чтобы усмирить море", [
      "Каждый торнадо от [Howling Hurricane] снижает броню и M-RES цели на 10% на 15 сек., суммируется до 10 раз.",
      "При максимальных стаках [Grand Entrance] получает дополнительно 45% крит. урона.",
      "Каждый торнадо от [Howling Hurricane] снижает броню и M-RES цели на 20% на 15 сек., суммируется до 10 раз.",
      "При максимальных стаках [Grand Entrance] получает дополнительно 50% крит. урона.",
    ]],
  },
  yuelao: {
    de: ["Thron der Mandarinenten", "Rote Glücksgottheit", [
      "Wenn die verbundene Einheit mit den höchsten LP sterben würde, erhält sie einen Schild in Höhe von 200% ANG der verbundenen Einheit mit dem höchsten ANG.",
      "Wenn die verbundene Einheit mit dem höchsten ANG sterben würde, erhält sie einen Schild in Höhe von 20% max. LP der verbundenen Einheit mit den höchsten LP.",
      "Wenn die verbundene Einheit mit den höchsten LP sterben würde, erhält sie einen Schild in Höhe von 300% ANG der verbundenen Einheit mit dem höchsten ANG.",
      "Wenn die verbundene Einheit mit dem höchsten ANG sterben würde, erhält sie einen Schild in Höhe von 30% max. LP der verbundenen Einheit mit den höchsten LP.",
    ]],
    es: ["Trono de los patos mandarines", "Deidad roja de la dicha", [
      "Cuando la unidad vinculada con más vida está a punto de morir, obtiene un escudo equivalente al 200% del ATQ de la unidad vinculada con mayor ATQ.",
      "Cuando la unidad vinculada con mayor ATQ está a punto de morir, obtiene un escudo equivalente al 20% de la vida máxima de la unidad vinculada con más vida.",
      "Cuando la unidad vinculada con más vida está a punto de morir, obtiene un escudo equivalente al 300% del ATQ de la unidad vinculada con mayor ATQ.",
      "Cuando la unidad vinculada con mayor ATQ está a punto de morir, obtiene un escudo equivalente al 30% de la vida máxima de la unidad vinculada con más vida.",
    ]],
    ru: ["Трон мандаринских уток", "Красное божество радости", [
      "Когда связанный юнит с наибольшим здоровьем должен погибнуть, он получает щит в размере 200% АТК связанного юнита с наибольшей АТК.",
      "Когда связанный юнит с наибольшей АТК должен погибнуть, он получает щит в размере 20% макс. здоровья связанного юнита с наибольшим здоровьем.",
      "Когда связанный юнит с наибольшим здоровьем должен погибнуть, он получает щит в размере 300% АТК связанного юнита с наибольшей АТК.",
      "Когда связанный юнит с наибольшей АТК должен погибнуть, он получает щит в размере 30% макс. здоровья связанного юнита с наибольшим здоровьем.",
    ]],
  },
  yanluo: {
    de: ["Thron des Urteils", "Herr der Unterwelt", [
      "Wenn [Underworld Arbitration] einen Gegner tötet, erhält Yanluo 10% des ANG dieser Einheit, bis zu 1000% seines eigenen ANG.",
      "Wenn [Underworld Arbitration] einen Gegner tötet, erhält Yanluo 20% des ANG dieser Einheit, bis zu 2000% seines eigenen ANG.",
      "[Underworld Arbitration] verursacht 50% mehr Schaden an Gegnern unter 50% LP.",
      "Wenn [Underworld Arbitration] einen Gegner tötet, erhält Yanluo 25% des ANG dieser Einheit, bis zu 2500% seines eigenen ANG.",
    ]],
    es: ["Trono del juicio", "Señor del inframundo", [
      "Si [Underworld Arbitration] mata a un enemigo, Yanluo obtiene el 10% del ATQ de esa unidad, hasta el 1000% de su propio ATQ.",
      "Si [Underworld Arbitration] mata a un enemigo, Yanluo obtiene el 20% del ATQ de esa unidad, hasta el 2000% de su propio ATQ.",
      "[Underworld Arbitration] inflige un 50% más de daño a enemigos por debajo del 50% de vida.",
      "Si [Underworld Arbitration] mata a un enemigo, Yanluo obtiene el 25% del ATQ de esa unidad, hasta el 2500% de su propio ATQ.",
    ]],
    ru: ["Трон суда", "Владыка подземного мира", [
      "Если [Underworld Arbitration] убивает врага, Яньло получает 10% АТК этого юнита, до 1000% от собственной АТК.",
      "Если [Underworld Arbitration] убивает врага, Яньло получает 20% АТК этого юнита, до 2000% от собственной АТК.",
      "[Underworld Arbitration] наносит на 50% больше урона врагам с запасом здоровья ниже 50%.",
      "Если [Underworld Arbitration] убивает врага, Яньло получает 25% АТК этого юнита, до 2500% от собственной АТК.",
    ]],
  },
  caishen: {
    de: ["Thron des Wohlstands", "Herr von Reichtum und Schätzen", [
      "[Gold Ingot] gewährt dem Ziel zusätzlich einen Schild in Höhe von 300% von Caishens ANG.",
      "[Gold Ingot] gewährt dem Ziel zusätzlich einen Schild in Höhe von 400% von Caishens ANG.",
      "Der Auslösebereich von [Endless Fortune] wird global.",
      "[Gold Ingot] gewährt dem Ziel zusätzlich einen Schild in Höhe von 500% von Caishens ANG.",
    ]],
    es: ["Trono de la prosperidad", "Señor de la riqueza y los tesoros", [
      "[Gold Ingot] otorga además al objetivo un escudo equivalente al 300% del ATQ de Caishen.",
      "[Gold Ingot] otorga además al objetivo un escudo equivalente al 400% del ATQ de Caishen.",
      "El alcance de activación de [Endless Fortune] pasa a ser global.",
      "[Gold Ingot] otorga además al objetivo un escudo equivalente al 500% del ATQ de Caishen.",
    ]],
    ru: ["Трон процветания", "Владыка богатства и сокровищ", [
      "[Gold Ingot] дополнительно дает цели щит в размере 300% АТК Цайшэня.",
      "[Gold Ingot] дополнительно дает цели щит в размере 400% АТК Цайшэня.",
      "Область срабатывания [Endless Fortune] становится глобальной.",
      "[Gold Ingot] дополнительно дает цели щит в размере 500% АТК Цайшэня.",
    ]],
  },
  isis: {
    de: ["Thron der Barmherzigkeit", "Göttin des Lebens und der Mutterschaft", [
      "Isis' normaler Angriff feuert einen zusätzlichen Pfeil auf ein zufälliges Ziel. Er kann Angriffseffekte auslösen und verursacht 30% des ursprünglichen Schadens.",
      "Isis erhält beim Eintritt 600 Energie.",
      "Der zusätzliche Pfeil verursacht 50% des ursprünglichen Schadens.",
      "Der zusätzliche Pfeil verursacht 55% des ursprünglichen Schadens.",
    ]],
    es: ["Trono de la misericordia", "Diosa de la vida y la maternidad", [
      "El ataque normal de Isis dispara una flecha adicional a un objetivo aleatorio. Puede activar efectos de ataque e inflige el 30% del daño original.",
      "Isis obtiene 600 de energía al entrar.",
      "La flecha adicional inflige el 50% del daño original.",
      "La flecha adicional inflige el 55% del daño original.",
    ]],
    ru: ["Трон милосердия", "Богиня жизни и материнства", [
      "Обычная атака Исиды выпускает дополнительную стрелу по случайной цели. Она может активировать эффекты атаки и наносит 30% исходного урона.",
      "Исида получает 600 энергии при выходе на поле.",
      "Дополнительная стрела наносит 50% исходного урона.",
      "Дополнительная стрела наносит 55% исходного урона.",
    ]],
  },
  fengyi: {
    de: ["Thron der Blüten", "Gott des Windes", [
      "Wenn Fengyi zum ersten Mal Wirbelwind erhält, gewinnt sie 50% Krit-Rate.",
      "Fengyis kritische Treffer ignorieren 80% der Rüstung und M-RES des Ziels.",
      "Jeder [Whirlwind]-Stapel gewährt Fengyi zusätzlich 70% Krit-SCH.",
      "Jeder [Whirlwind]-Stapel gewährt Fengyi zusätzlich 75% Krit-SCH.",
    ]],
    es: ["Trono de las flores", "Dios del viento", [
      "La primera vez que Fengyi obtiene Torbellino, gana un 50% de probabilidad crítica.",
      "Los golpes críticos de Fengyi ignoran el 80% de la armadura y la RES M del objetivo.",
      "Cada acumulación de [Whirlwind] otorga a Fengyi un 70% adicional de daño crítico.",
      "Cada acumulación de [Whirlwind] otorga a Fengyi un 75% adicional de daño crítico.",
    ]],
    ru: ["Трон цветения", "Бог ветра", [
      "Когда Фэнъи впервые получает Вихрь, она получает 50% шанса крита.",
      "Критические удары Фэнъи игнорируют 80% брони и M-RES цели.",
      "Каждый стак [Whirlwind] дает Фэнъи дополнительно 70% крит. урона.",
      "Каждый стак [Whirlwind] дает Фэнъи дополнительно 75% крит. урона.",
    ]],
  },
  diana: {
    de: ["Thron der Eiche", "Göttin des Mondes und der Eiche", [
      "Wenn eine Einheit mit Mondphase an einem Kill beteiligt ist, wird Mondphase um 5 Sekunden verlängert.",
      "Mondphase gewährt zusätzlich 20% Krit-Rate und 30% Trefferchance.",
      "Die Abklingzeit von Mondphase wird auf 10 Sekunden reduziert.",
      "Mondphase gewährt zusätzlich 30% Krit-Rate und 40% Trefferchance.",
    ]],
    es: ["Trono del roble", "Diosa de la luna y el roble", [
      "Cuando una unidad con Fase lunar participa en matar a un enemigo, Fase lunar se prolonga 5 s.",
      "Fase lunar otorga además un 20% de probabilidad crítica y un 30% de precisión.",
      "El enfriamiento de Fase lunar se reduce a 10 s.",
      "Fase lunar otorga además un 30% de probabilidad crítica y un 40% de precisión.",
    ]],
    ru: ["Трон дуба", "Богиня луны и дуба", [
      "Когда юнит с Лунной фазой участвует в убийстве врага, Лунная фаза продлевается на 5 сек.",
      "Лунная фаза дополнительно дает 20% шанса крита и 30% меткости.",
      "Перезарядка Лунной фазы сокращается до 10 сек.",
      "Лунная фаза дополнительно дает 30% шанса крита и 40% меткости.",
    ]],
  },
  pan: {
    de: ["Thron von Begierde und Schrecken", "Gott der Wildnis und Wälder", [
      "Wenn eine verbündete Gottheit getötet wird, verflucht Pan den Täter und versetzt ihn 5 Sekunden lang in Furcht.",
      "Wenn eine verbündete Gottheit getötet wird, verflucht Pan den Täter, versetzt ihn 5 Sekunden lang in Furcht und lässt ihn 30% mehr Schaden erleiden.",
      "[Pipes] lässt zusätzlich eine weitere Einheit einschlafen.",
      "Wenn eine verbündete Gottheit getötet wird, verflucht Pan den Täter und versetzt ihn 8 Sekunden lang in Furcht.",
    ]],
    es: ["Trono del deseo y el pavor", "Dios de la fauna y los bosques", [
      "Cuando una deidad aliada muere, Pan maldice al asesino y le causa miedo durante 5 s.",
      "Cuando una deidad aliada muere, Pan maldice al asesino, le causa miedo durante 5 s y hace que reciba un 30% más de daño.",
      "[Pipes] duerme además a una unidad adicional.",
      "Cuando una deidad aliada muere, Pan maldice al asesino y le causa miedo durante 8 s.",
    ]],
    ru: ["Трон желания и ужаса", "Бог дикой природы и лесов", [
      "Когда союзный божественный юнит погибает, Пан проклинает убийцу и пугает его на 5 сек.",
      "Когда союзный божественный юнит погибает, Пан проклинает убийцу, пугает его на 5 сек. и заставляет получать на 30% больше урона.",
      "[Pipes] дополнительно усыпляет еще одного юнита.",
      "Когда союзный божественный юнит погибает, Пан проклинает убийцу и пугает его на 8 сек.",
    ]],
  },
  artemis: {
    de: ["Thron des Silbermonds", "Herrin der Tiere und der Wildnis", [
      "[Gale-Force Shot] senkt bei einem Treffer Rüstung und M-RES des Ziels 10 Sekunden lang um 5%, bis zu 10-mal stapelbar.",
      "Wenn [Hunter's Snare] ausgelöst wird, erhält Artemis 300 Energie.",
      "[Gale-Force Shot] senkt bei einem Treffer Rüstung und M-RES des Ziels 10 Sekunden lang um 10%, bis zu 10-mal stapelbar.",
      "Wenn [Hunter's Snare] ausgelöst wird, erhält Artemis 400 Energie.",
    ]],
    es: ["Trono de la luna plateada", "Señora de las bestias y de lo salvaje", [
      "[Gale-Force Shot] reduce la armadura y la RES M del objetivo un 5% durante 10 s al golpear, acumulable hasta 10 veces.",
      "Cuando se activa [Hunter's Snare], Artemis obtiene 300 de energía.",
      "[Gale-Force Shot] reduce la armadura y la RES M del objetivo un 10% durante 10 s al golpear, acumulable hasta 10 veces.",
      "Cuando se activa [Hunter's Snare], Artemis obtiene 400 de energía.",
    ]],
    ru: ["Трон серебряной луны", "Владычица зверей и дикой природы", [
      "[Gale-Force Shot] при попадании снижает броню и M-RES цели на 5% на 10 сек., суммируется до 10 раз.",
      "Когда срабатывает [Hunter's Snare], Артемида получает 300 энергии.",
      "[Gale-Force Shot] при попадании снижает броню и M-RES цели на 10% на 10 сек., суммируется до 10 раз.",
      "Когда срабатывает [Hunter's Snare], Артемида получает 400 энергии.",
    ]],
  },
  jormungandr: {
    de: ["Thron des Ouroboros", "Weltschlange", [
      "Für je 10% verlorene max. LP erhält Jormungandr 5% ANG, bis zu 50%. Sein Leichnam erbt diesen ANG mit 30% Wirksamkeit.",
      "Für je 10% verlorene max. LP erhält Jormungandr 10% ANG, bis zu 100%.",
      "Während [Serpent's Approach] erhält Jormungandr Superrüstung.",
      "Für je 10% verlorene max. LP erhält Jormungandr 20% ANG, bis zu 100%.",
    ]],
    es: ["Trono del Ouroboros", "Serpiente del mundo", [
      "Por cada 10% de vida máxima que pierde Jormungandr, obtiene un 5% de ATQ, hasta un 50%. Su cadáver hereda este ATQ con un 30% de eficiencia.",
      "Por cada 10% de vida máxima que pierde Jormungandr, obtiene un 10% de ATQ, hasta un 100%.",
      "Durante [Serpent's Approach], Jormungandr obtiene superarmadura.",
      "Por cada 10% de vida máxima que pierde Jormungandr, obtiene un 20% de ATQ, hasta un 100%.",
    ]],
    ru: ["Трон Уробороса", "Мировой змей", [
      "За каждые 10% потерянного макс. здоровья Йормунганд получает 5% АТК, до 50%. Его труп наследует эту АТК с эффективностью 30%.",
      "За каждые 10% потерянного макс. здоровья Йормунганд получает 10% АТК, до 100%.",
      "Во время [Serpent's Approach] Йормунганд получает суперброню.",
      "За каждые 10% потерянного макс. здоровья Йормунганд получает 20% АТК, до 100%.",
    ]],
  },
  demeter: {
    de: ["Thron der Ernte", "Göttin von Landwirtschaft, Getreide und Ernte", [
      "Jede Heilung durch [Recovery] stellt Demeter zusätzlich LP in Höhe von 50% ANG wieder her.",
      "Auslöseanzahl von [Recovery] +1.",
      "Jede Heilung durch [Recovery] stellt Demeter zusätzlich LP in Höhe von 85% ANG wieder her.",
      "Wenn [Recovery] ausgelöst wird, erhält Demeter einen Schild in Höhe von 500% ANG.",
    ]],
    es: ["Trono de la cosecha", "Diosa de la agricultura, el grano y la cosecha", [
      "Cada curación de [Recovery] restaura además vida a Demeter equivalente al 50% del ATQ.",
      "Cantidad de activaciones de [Recovery] +1.",
      "Cada curación de [Recovery] restaura además vida a Demeter equivalente al 85% del ATQ.",
      "Cuando se activa [Recovery], Demeter obtiene un escudo equivalente al 500% del ATQ.",
    ]],
    ru: ["Трон урожая", "Богиня земледелия, зерна и жатвы", [
      "Каждое исцеление от [Recovery] дополнительно восстанавливает Деметре здоровье в размере 50% АТК.",
      "Количество срабатываний [Recovery] +1.",
      "Каждое исцеление от [Recovery] дополнительно восстанавливает Деметре здоровье в размере 85% АТК.",
      "Когда срабатывает [Recovery], Деметра получает щит в размере 500% АТК.",
    ]],
  },
  freya: {
    de: ["Thron blühender Blumen", "Göttin der Liebe und Schönheit", [
      "25% von Freyas Überheilung wird zu einem Schild, bis zu 100% der max. LP des Ziels.",
      "Wenn eine verbündete Einheit auf 50% max. LP fällt, stellt Freya LP in Höhe von 500% ihres ANG wieder her. Wird einmal ausgelöst.",
      "35% von Freyas Überheilung wird zu einem Schild.",
      "40% von Freyas Überheilung wird zu einem Schild.",
    ]],
    es: ["Trono de las flores florecientes", "Diosa del amor y la belleza", [
      "El 25% de la sobrecuración de Freya se convierte en un escudo, hasta el 100% de la vida máxima del objetivo.",
      "Cuando una unidad aliada cae al 50% de vida máxima, Freya restaura vida equivalente al 500% de su ATQ. Se activa una vez.",
      "El 35% de la sobrecuración de Freya se convierte en un escudo.",
      "El 40% de la sobrecuración de Freya se convierte en un escudo.",
    ]],
    ru: ["Трон цветущих цветов", "Богиня любви и красоты", [
      "25% избыточного исцеления Фрейи превращается в щит, до 100% макс. здоровья цели.",
      "Когда союзный юнит падает до 50% макс. здоровья, Фрейя восстанавливает здоровье в размере 500% своей АТК. Срабатывает один раз.",
      "35% избыточного исцеления Фрейи превращается в щит.",
      "40% избыточного исцеления Фрейи превращается в щит.",
    ]],
  },
  anubis: {
    de: ["Thron des Herzenswiegens", "Gott der Bestattungen, Einbalsamierung und des Todes", [
      "8 Sekunden lang nach dem Auslösen von [Soulfarer] erleidet das Ziel 30% mehr Schaden.",
      "8 Sekunden lang nach dem Auslösen von [Soulfarer] erleidet das Ziel 50% mehr Schaden.",
      "[Featherfall Judgment] verursacht 45% mehr Schaden; wenn der Artefakt-Effekt freigeschaltet ist, steigt die Hinrichtungsschwelle des Artefakts auf 10% max. LP.",
      "[Featherfall Judgment] verursacht 50% mehr Schaden.",
    ]],
    es: ["Trono del pesaje de corazones", "Dios de los funerales, el embalsamamiento y la muerte", [
      "Durante 8 s después de activarse [Soulfarer], el objetivo recibe un 30% más de daño.",
      "Durante 8 s después de activarse [Soulfarer], el objetivo recibe un 50% más de daño.",
      "[Featherfall Judgment] inflige un 45% más de daño, y el umbral de ejecución del artefacto aumenta al 10% de vida máxima si ese efecto de artefacto está desbloqueado.",
      "[Featherfall Judgment] inflige un 50% más de daño.",
    ]],
    ru: ["Трон взвешивания сердец", "Бог погребений, бальзамирования и смерти", [
      "В течение 8 сек. после срабатывания [Soulfarer] цель получает на 30% больше урона.",
      "В течение 8 сек. после срабатывания [Soulfarer] цель получает на 50% больше урона.",
      "[Featherfall Judgment] наносит на 45% больше урона, а порог казни артефакта повышается до 10% макс. здоровья, если этот эффект артефакта открыт.",
      "[Featherfall Judgment] наносит на 50% больше урона.",
    ]],
  },
  phoenix: {
    de: ["Thron von Dichtung und Feuer", "Unsterblicher Vogel", [
      "Phoenix' Nirvana-Zustand wird verstärkt: stellt zusätzlich 5% max. LP pro Sekunde wieder her.",
      "Phoenix' Nirvana-Zustand wird verstärkt: stellt zusätzlich 12% max. LP pro Sekunde wieder her.",
      "Nachdem Phoenix zum ersten Mal aus Nirvana wiederbelebt wurde, werden 40% ihres Schadens zu absolutem Schaden. Jedes spätere Nirvana erhöht dies um 20%, bis zu 100%.",
      "Phoenix' Nirvana-Zustand wird verstärkt: stellt zusätzlich 15% max. LP pro Sekunde wieder her.",
    ]],
    es: ["Trono de la poesía y el fuego", "Ave inmortal", [
      "El estado Nirvana de Phoenix se mejora: restaura un 5% adicional de vida máxima por segundo.",
      "El estado Nirvana de Phoenix se mejora: restaura un 12% adicional de vida máxima por segundo.",
      "Después de que Phoenix reviva de Nirvana por primera vez, el 40% de su daño se convierte en daño verdadero. Cada Nirvana posterior aumenta esto un 20%, hasta un 100%.",
      "El estado Nirvana de Phoenix se mejora: restaura un 15% adicional de vida máxima por segundo.",
    ]],
    ru: ["Трон поэзии и огня", "Бессмертная птица", [
      "Состояние Нирваны Феникс усиливается: дополнительно восстанавливает 5% макс. здоровья в секунду.",
      "Состояние Нирваны Феникс усиливается: дополнительно восстанавливает 12% макс. здоровья в секунду.",
      "После первого возрождения Феникс из Нирваны 40% ее урона становится истинным уроном. Каждая последующая Нирвана увеличивает это на 20%, до 100%.",
      "Состояние Нирваны Феникс усиливается: дополнительно восстанавливает 15% макс. здоровья в секунду.",
    ]],
  },
  set: {
    de: ["Thron von Raserei und Sand", "Gott des Krieges, der Wüste und der Stürme", [
      "[Dunes' Bloodrage] erhöht die Ausweichrate verbündeter Einheiten um 10%.",
      "[Dunes' Bloodrage] erhöht die Ausweichrate verbündeter Einheiten um 20%.",
      "Wenn [Khamsin's Shelter] landet, verursacht es 200% Schaden und Niederschlag bei Einheiten um das Ziel.",
      "Wenn [Khamsin's Shelter] landet, verursacht es 300% Schaden und Niederschlag bei Einheiten um das Ziel.",
    ]],
    es: ["Trono del frenesí y la arena", "Dios de la guerra, el desierto y las tormentas", [
      "[Dunes' Bloodrage] aumenta un 10% la evasión de las unidades aliadas.",
      "[Dunes' Bloodrage] aumenta un 20% la evasión de las unidades aliadas.",
      "Cuando [Khamsin's Shelter] aterriza, inflige 200% de daño y derriba a las unidades alrededor del objetivo.",
      "Cuando [Khamsin's Shelter] aterriza, inflige 300% de daño y derriba a las unidades alrededor del objetivo.",
    ]],
    ru: ["Трон безумия и песка", "Бог войны, пустыни и бурь", [
      "[Dunes' Bloodrage] повышает уклонение союзных юнитов на 10%.",
      "[Dunes' Bloodrage] повышает уклонение союзных юнитов на 20%.",
      "Когда [Khamsin's Shelter] приземляется, оно наносит 200% урона и сбивает юнитов вокруг цели.",
      "Когда [Khamsin's Shelter] приземляется, оно наносит 300% урона и сбивает юнитов вокруг цели.",
    ]],
  },
  athena: {
    de: ["Thron der Weisheit und Strategie", "Göttin der Weisheit, Strategie und Handwerkskunst", [
      "Verbündete in Athenas Aura stellen jede Sekunde LP in Höhe von 100% ANG wieder her.",
      "Verbündete in Athenas Aura stellen jede Sekunde LP in Höhe von 150% ANG wieder her.",
      "Wenn 3 verbündete Einheiten in Athenas Aura sind, steigen ihre Heilungseffizienz und Schildstärke um 50%.",
      "Wenn 3 verbündete Einheiten in Athenas Aura sind, wird der Schaden, den Athena erleidet, um 70% reduziert.",
    ]],
    es: ["Trono de la sabiduría y la estrategia", "Diosa de la sabiduría, la estrategia y la artesanía", [
      "Los aliados dentro del aura de Athena restauran vida equivalente al 100% del ATQ cada segundo.",
      "Los aliados dentro del aura de Athena restauran vida equivalente al 150% del ATQ cada segundo.",
      "Cuando 3 unidades aliadas están dentro del aura de Athena, su eficiencia de curación y fuerza de escudo aumentan un 50%.",
      "Cuando 3 unidades aliadas están dentro del aura de Athena, el daño que recibe Athena se reduce un 70%.",
    ]],
    ru: ["Трон мудрости и стратегии", "Богиня мудрости, стратегии и ремесла", [
      "Союзники внутри ауры Афины каждую секунду восстанавливают здоровье в размере 100% АТК.",
      "Союзники внутри ауры Афины каждую секунду восстанавливают здоровье в размере 150% АТК.",
      "Когда 3 союзных юнита находятся внутри ауры Афины, ее эффективность лечения и сила щитов повышаются на 50%.",
      "Когда 3 союзных юнита находятся внутри ауры Афины, получаемый Афиной урон снижается на 70%.",
    ]],
  },
  bastet: {
    de: ["Thron der Katze", "Schutzgöttin des Hauses", [
      "Wenn Bastet Ausweichen auslöst, erhält sie dauerhaft 2,5% ANG, bis zu 25%.",
      "Wenn Bastet Ausweichen auslöst, erhält sie dauerhaft 5% ANG, bis zu 50%.",
      "Wenn Bastet mindestens 100% Ausweichen hat, verursacht sie 20% mehr Schaden.",
      "Wenn Bastet Ausweichen auslöst, erhält sie dauerhaft 5% ANG, bis zu 60%.",
    ]],
    es: ["Trono del gato", "Diosa guardiana del hogar", [
      "Cuando Bastet activa evasión, obtiene permanentemente un 2,5% de ATQ, hasta un 25%.",
      "Cuando Bastet activa evasión, obtiene permanentemente un 5% de ATQ, hasta un 50%.",
      "Cuando Bastet tiene al menos un 100% de evasión, el daño que inflige aumenta un 20%.",
      "Cuando Bastet activa evasión, obtiene permanentemente un 5% de ATQ, hasta un 60%.",
    ]],
    ru: ["Трон кошки", "Богиня-хранительница дома", [
      "Когда Бастет срабатывает уклонение, она навсегда получает 2,5% АТК, до 25%.",
      "Когда Бастет срабатывает уклонение, она навсегда получает 5% АТК, до 50%.",
      "Когда у Бастет не менее 100% уклонения, наносимый ею урон увеличивается на 20%.",
      "Когда Бастет срабатывает уклонение, она навсегда получает 5% АТК, до 60%.",
    ]],
  },
  geb: {
    de: ["Thron der Erdadern", "Gott der Erde und Fruchtbarkeit", [
      "Nachdem [Unstoppable] endet, verspottet Geb Gegner innerhalb von 3 m für 3 Sekunden.",
      "Nachdem [Unstoppable] endet, verspottet Geb Gegner innerhalb von 3 m für 5 Sekunden.",
      "Solange Geb einen Schild hat, erleidet er 30% weniger Schaden.",
      "Nachdem [Unstoppable] endet, verspottet Geb Gegner innerhalb von 5 m für 5 Sekunden.",
    ]],
    es: ["Trono de las venas de la tierra", "Dios de la tierra y la fertilidad", [
      "Después de que termina [Unstoppable], Geb provoca a los enemigos en un radio de 3 m durante 3 s.",
      "Después de que termina [Unstoppable], Geb provoca a los enemigos en un radio de 3 m durante 5 s.",
      "Mientras tiene escudo, Geb recibe un 30% menos de daño.",
      "Después de que termina [Unstoppable], Geb provoca a los enemigos en un radio de 5 m durante 5 s.",
    ]],
    ru: ["Трон земных жил", "Бог земли и плодородия", [
      "После окончания [Unstoppable] Геб провоцирует врагов в радиусе 3 м на 3 сек.",
      "После окончания [Unstoppable] Геб провоцирует врагов в радиусе 3 м на 5 сек.",
      "Пока у Геба есть щит, получаемый им урон снижается на 30%.",
      "После окончания [Unstoppable] Геб провоцирует врагов в радиусе 5 м на 5 сек.",
    ]],
  },
  horus: {
    de: ["Thron des durchdringenden Blicks", "Gott des Himmels und der Rache", [
      "Während [Vengeance] wird der dem fixierten Gegner zugefügte Schaden um 30% erhöht.",
      "Während [Vengeance] wird der dem fixierten Gegner zugefügte Schaden um 50% erhöht.",
      "Während [Vengeance] wird erlittener Schaden von Gegnern, die nicht das fixierte Ziel sind, um 50% reduziert.",
      "Nach dem Wirken von [Frenzied Blade] erhält Horus 5 Sekunden lang 30% ANG. Dieser Effekt kann stapeln.",
    ]],
    es: ["Trono de la mirada penetrante", "Dios del cielo y la venganza", [
      "Mientras está en [Vengeance], el daño infligido al enemigo fijado aumenta un 30%.",
      "Mientras está en [Vengeance], el daño infligido al enemigo fijado aumenta un 50%.",
      "Mientras está en [Vengeance], el daño recibido de enemigos que no son el objetivo fijado se reduce un 50%.",
      "Después de lanzar [Frenzied Blade], Horus obtiene un 30% de ATQ durante 5 s. Este efecto puede acumularse.",
    ]],
    ru: ["Трон пронзающего взора", "Бог неба и мести", [
      "Во время [Vengeance] урон по зафиксированному врагу увеличивается на 30%.",
      "Во время [Vengeance] урон по зафиксированному врагу увеличивается на 50%.",
      "Во время [Vengeance] получаемый урон от врагов, не являющихся зафиксированной целью, снижается на 50%.",
      "После применения [Frenzied Blade] Гор получает 30% АТК на 5 сек. Этот эффект может суммироваться.",
    ]],
  },
  ares: {
    de: ["Thron von Krieg und Gewalt", "Gott des Krieges, Tötens und Aufruhrs", [
      "Die Dauer von [Unyielding Will] erhöht sich um 2 Sekunden.",
      "Der verursachte Schaden von [Battlefield Storm] steigt um 30%.",
      "Während [Unyielding Will] verlängert die Beteiligung an einem Kill die Dauer um 3 Sekunden.",
      "Die Dauer von [Unyielding Will] erhöht sich um 3 Sekunden.",
    ]],
    es: ["Trono de la guerra y la violencia", "Dios de la guerra, la matanza y el tumulto", [
      "La duración de [Unyielding Will] aumenta 2 s.",
      "El daño infligido por [Battlefield Storm] aumenta un 30%.",
      "Durante [Unyielding Will], participar en una eliminación prolonga su duración 3 s.",
      "La duración de [Unyielding Will] aumenta 3 s.",
    ]],
    ru: ["Трон войны и насилия", "Бог войны, убийства и мятежа", [
      "Длительность [Unyielding Will] увеличивается на 2 сек.",
      "Урон [Battlefield Storm] увеличивается на 30%.",
      "Во время [Unyielding Will] участие в убийстве продлевает его длительность на 3 сек.",
      "Длительность [Unyielding Will] увеличивается на 3 сек.",
    ]],
  },
  sekhmet: {
    de: ["Thron der brennenden Sonne", "Göttin des Feuers, des Krieges und der Rache", [
      "Sekhmet stiehlt 15% der gesamten Attribute des [Duel]-Ziels, bis zu 75% ihrer eigenen entsprechenden Attribute.",
      "Erhält beim Eintritt 10 Stapel [Fighting Spirit].",
      "Sekhmet stiehlt 20% der gesamten Attribute des [Duel]-Ziels, bis zu 100% ihrer eigenen entsprechenden Attribute.",
      "Sekhmet stiehlt 25% der gesamten Attribute des [Duel]-Ziels, bis zu 125% ihrer eigenen entsprechenden Attribute.",
    ]],
    es: ["Trono del sol ardiente", "Diosa del fuego, la guerra y la venganza", [
      "Sekhmet roba el 15% de los atributos totales del objetivo de [Duel], hasta el 75% de sus propios atributos correspondientes.",
      "Obtiene 10 acumulaciones de [Fighting Spirit] al entrar.",
      "Sekhmet roba el 20% de los atributos totales del objetivo de [Duel], hasta el 100% de sus propios atributos correspondientes.",
      "Sekhmet roba el 25% de los atributos totales del objetivo de [Duel], hasta el 125% de sus propios atributos correspondientes.",
    ]],
    ru: ["Трон пылающего солнца", "Богиня огня, войны и мести", [
      "Сехмет крадет 15% всех характеристик цели [Duel], до 75% от своих соответствующих характеристик.",
      "Получает 10 стаков [Fighting Spirit] при выходе на поле.",
      "Сехмет крадет 20% всех характеристик цели [Duel], до 100% от своих соответствующих характеристик.",
      "Сехмет крадет 25% всех характеристик цели [Duel], до 125% от своих соответствующих характеристик.",
    ]],
  },
  momus: {
    de: ["Thron des Spotts", "Gott des Spotts, Tadels und der Satire", [
      "Wenn Momus Schaden erleidet, erhält er 5% Rüstung und M-RES, bis zu 20-mal stapelbar.",
      "Wenn Momus Schaden erleidet, erhält er 10% Rüstung und M-RES, bis zu 20-mal stapelbar.",
      "Beim Erreichen der maximalen Stapel werden die Einsätze von [Phantom Puppet] erneuert. Nur einmal.",
      "Wenn Momus Schaden erleidet, erhält er 12% Rüstung und M-RES, bis zu 20-mal stapelbar.",
    ]],
    es: ["Trono de la burla", "Dios de la burla, la culpa y la sátira", [
      "Al recibir daño, Momus obtiene un 5% de armadura y RES M, acumulable hasta 20 veces.",
      "Al recibir daño, Momus obtiene un 10% de armadura y RES M, acumulable hasta 20 veces.",
      "Al alcanzar las acumulaciones máximas, se reinician los usos de [Phantom Puppet]. Solo una vez.",
      "Al recibir daño, Momus obtiene un 12% de armadura y RES M, acumulable hasta 20 veces.",
    ]],
    ru: ["Трон насмешки", "Бог насмешки, порицания и сатиры", [
      "При получении урона Мом получает 5% брони и M-RES, суммируется до 20 раз.",
      "При получении урона Мом получает 10% брони и M-RES, суммируется до 20 раз.",
      "При достижении максимальных стаков обновляет использования [Phantom Puppet]. Только один раз.",
      "При получении урона Мом получает 12% брони и M-RES, суммируется до 20 раз.",
    ]],
  },
  khepri: {
    de: ["Thron der Wiedergeburt", "Gott des Sonnenaufgangs und des Skarabäus", [
      "Jeder Treffer von Khepris Ultimate senkt die M-RES des Ziels 10 Sekunden lang um 10%, bis zu 5-mal stapelbar.",
      "Jeder Treffer von Khepris Ultimate senkt die M-RES des Ziels 10 Sekunden lang um 20%, bis zu 5-mal stapelbar.",
      "Während [Scarab's Blessing] stellt Khepri 100 Energie pro Sekunde wieder her.",
      "Jeder Treffer von Khepris Ultimate senkt die M-RES des Ziels 10 Sekunden lang um 25%, bis zu 5-mal stapelbar.",
    ]],
    es: ["Trono del renacimiento", "Dios del amanecer y el escarabajo", [
      "Cada golpe de la definitiva de Khepri reduce la RES M del objetivo un 10% durante 10 s, acumulable 5 veces.",
      "Cada golpe de la definitiva de Khepri reduce la RES M del objetivo un 20% durante 10 s, acumulable 5 veces.",
      "Mientras está bajo [Scarab's Blessing], Khepri restaura 100 de energía por segundo.",
      "Cada golpe de la definitiva de Khepri reduce la RES M del objetivo un 25% durante 10 s, acumulable 5 veces.",
    ]],
    ru: ["Трон возрождения", "Бог восхода и скарабея", [
      "Каждое попадание ультимейта Хепри снижает M-RES цели на 10% на 10 сек., суммируется 5 раз.",
      "Каждое попадание ультимейта Хепри снижает M-RES цели на 20% на 10 сек., суммируется 5 раз.",
      "Под действием [Scarab's Blessing] Хепри восстанавливает 100 энергии в секунду.",
      "Каждое попадание ультимейта Хепри снижает M-RES цели на 25% на 10 сек., суммируется 5 раз.",
    ]],
  },
  iris: {
    de: ["Thron des Regenbogens", "Regenbogenbotin", [
      "Zu Kampfbeginn beschwört Iris einen Schmetterling auf den nächsten Frontlinien-Verbündeten. Nach 4 Sekunden verursacht er 150% ANG-Schaden an Gegnern innerhalb von 3 m und betäubt sie 3 Sekunden lang.",
      "Zu Kampfbeginn beschwört Iris einen Schmetterling auf den nächsten Frontlinien-Verbündeten. Nach 4 Sekunden verursacht er 150% ANG-Schaden an Gegnern innerhalb von 3 m und betäubt sie 4 Sekunden lang.",
      "Zu Kampfbeginn beschwört Iris Schmetterlinge auf die 2 nächsten Frontlinien-Verbündeten. Nach 4 Sekunden verursachen sie 150% ANG-Schaden an Gegnern innerhalb von 3 m und betäuben sie 4 Sekunden lang.",
      "Zu Kampfbeginn beschwört Iris Schmetterlinge auf die 2 nächsten Frontlinien-Verbündeten. Nach 4 Sekunden verursachen sie 150% ANG-Schaden an Gegnern innerhalb von 3 m und betäuben sie 5 Sekunden lang.",
    ]],
    es: ["Trono del arcoíris", "Mensajera del arcoíris", [
      "Al inicio del combate, invoca una mariposa sobre el aliado de primera línea más cercano. Tras 4 s, inflige daño del 150% del ATQ a enemigos en 3 m y los aturde durante 3 s.",
      "Al inicio del combate, invoca una mariposa sobre el aliado de primera línea más cercano. Tras 4 s, inflige daño del 150% del ATQ a enemigos en 3 m y los aturde durante 4 s.",
      "Al inicio del combate, invoca mariposas sobre los 2 aliados de primera línea más cercanos. Tras 4 s, infligen daño del 150% del ATQ a enemigos en 3 m y los aturden durante 4 s.",
      "Al inicio del combate, invoca mariposas sobre los 2 aliados de primera línea más cercanos. Tras 4 s, infligen daño del 150% del ATQ a enemigos en 3 m y los aturden durante 5 s.",
    ]],
    ru: ["Трон радуги", "Радужная посланница", [
      "В начале боя призывает бабочку на ближайшего союзника передней линии. Через 4 сек. она наносит урон 150% АТК врагам в радиусе 3 м и оглушает их на 3 сек.",
      "В начале боя призывает бабочку на ближайшего союзника передней линии. Через 4 сек. она наносит урон 150% АТК врагам в радиусе 3 м и оглушает их на 4 сек.",
      "В начале боя призывает бабочек на 2 ближайших союзников передней линии. Через 4 сек. они наносят урон 150% АТК врагам в радиусе 3 м и оглушают их на 4 сек.",
      "В начале боя призывает бабочек на 2 ближайших союзников передней линии. Через 4 сек. они наносят урон 150% АТК врагам в радиусе 3 м и оглушают их на 5 сек.",
    ]],
  },
  nemesis: {
    de: ["Thron der Gerechtigkeit", "Göttin der Vergeltung", [
      "Wenn Nemesis jede gegnerische Gottheit zum ersten Mal beschädigt, erhält sie dauerhaft 30% ANG, bis zu 5-mal stapelbar.",
      "Nemesis erhält 40% ANG.",
      "Wenn Nemesis zum ersten Mal an einem Kill beteiligt ist, erhält sie dauerhaft 50% Lebensraub.",
      "Nemesis erhält 45% ANG.",
    ]],
    es: ["Trono de la justicia", "Diosa de la venganza", [
      "La primera vez que Nemesis daña a cada deidad enemiga, obtiene permanentemente un 30% de ATQ, acumulable hasta 5 veces.",
      "Nemesis obtiene un 40% de ATQ.",
      "La primera vez que Nemesis participa en una eliminación, obtiene permanentemente un 50% de robo de vida.",
      "Nemesis obtiene un 45% de ATQ.",
    ]],
    ru: ["Трон справедливости", "Богиня возмездия", [
      "Когда Немезида впервые наносит урон каждому вражескому божественному юниту, она навсегда получает 30% АТК, суммируется до 5 раз.",
      "Немезида получает 40% АТК.",
      "Когда Немезида впервые участвует в убийстве, она навсегда получает 50% вампиризма.",
      "Немезида получает 45% АТК.",
    ]],
  },
  poseidon: {
    de: ["Thron der Meeresströmungen", "Gott des Meeres und der Erdbeben", [
      "Wenn Poseidon einen Kontrolleffekt anwendet, erhält er einen Schild in Höhe von 50% ANG.",
      "Wenn Poseidon einen Kontrolleffekt anwendet, erhält er einen Schild in Höhe von 100% ANG.",
      "Solange Poseidon einen Schild hat, wird erlittener Schaden um 40% reduziert.",
      "Solange Poseidon einen Schild hat, wird erlittener Schaden um 50% reduziert.",
    ]],
    es: ["Trono de las corrientes oceánicas", "Dios del mar y los terremotos", [
      "Cuando Poseidon aplica un efecto de control, obtiene un escudo equivalente al 50% del ATQ.",
      "Cuando Poseidon aplica un efecto de control, obtiene un escudo equivalente al 100% del ATQ.",
      "Mientras Poseidon tiene un escudo, el daño recibido se reduce un 40%.",
      "Mientras Poseidon tiene un escudo, el daño recibido se reduce un 50%.",
    ]],
    ru: ["Трон океанских течений", "Бог моря и землетрясений", [
      "Когда Посейдон накладывает эффект контроля, он получает щит в размере 50% АТК.",
      "Когда Посейдон накладывает эффект контроля, он получает щит в размере 100% АТК.",
      "Пока у Посейдона есть щит, получаемый урон снижается на 40%.",
      "Пока у Посейдона есть щит, получаемый урон снижается на 50%.",
    ]],
  },
  hela: {
    de: ["Thron des Verfalls", "Königin des Todes und der Unterwelt", [
      "Hela erhält beim Eintritt 100 Anfangsenergie.",
      "Hela erhält beim Eintritt 300 Anfangsenergie.",
      "Nach dem Wirken ihrer Ultimate wird die Abklingzeit von [Blight upon Life] zurückgesetzt.",
      "Hela erhält beim Eintritt 400 Anfangsenergie.",
    ]],
    es: ["Trono de la decadencia", "Reina de la muerte y el inframundo", [
      "Hela obtiene 100 de energía inicial al entrar.",
      "Hela obtiene 300 de energía inicial al entrar.",
      "Después de lanzar su definitiva, se reinicia el enfriamiento de [Blight upon Life].",
      "Hela obtiene 400 de energía inicial al entrar.",
    ]],
    ru: ["Трон тления", "Королева смерти и подземного мира", [
      "Хела получает 100 начальной энергии при выходе на поле.",
      "Хела получает 300 начальной энергии при выходе на поле.",
      "После применения ультимейта обновляет перезарядку [Blight upon Life].",
      "Хела получает 400 начальной энергии при выходе на поле.",
    ]],
  },
  medusa: {
    de: ["Thron der Schlangen und des Blicks", "Gorgone", [
      "Nachdem Medusa ihre Ultimate wirkt, erhält sie 40% ANG-GES.",
      "Nachdem Medusa [Serpent Kiss Mark] 3-mal Schaden zugefügt hat, versteinert sie das Ziel 1 Sekunde lang.",
      "Nachdem Medusa [Serpent Kiss Mark] 3-mal Schaden zugefügt hat, versteinert sie das Ziel 2 Sekunden lang.",
      "Nachdem Medusa ihre Ultimate wirkt, erhält sie 60% ANG-GES.",
    ]],
    es: ["Trono de las serpientes y la mirada", "Gorgona", [
      "Después de que Medusa lanza su definitiva, obtiene un 40% de VEL ATQ.",
      "Después de que Medusa inflige daño a [Serpent Kiss Mark] 3 veces, petrifica al objetivo durante 1 s.",
      "Después de que Medusa inflige daño a [Serpent Kiss Mark] 3 veces, petrifica al objetivo durante 2 s.",
      "Después de que Medusa lanza su definitiva, obtiene un 60% de VEL ATQ.",
    ]],
    ru: ["Трон змей и взгляда", "Горгона", [
      "После применения ультимейта Медуза получает 40% скорости атаки.",
      "После того как Медуза 3 раза наносит урон по [Serpent Kiss Mark], она окаменяет цель на 1 сек.",
      "После того как Медуза 3 раза наносит урон по [Serpent Kiss Mark], она окаменяет цель на 2 сек.",
      "После применения ультимейта Медуза получает 60% скорости атаки.",
    ]],
  },
  hecate: {
    de: ["Thron des Unterweltmonds", "Dreifache Göttin des dunklen Mondes und der Gelegenheit", [
      "Von Hecate erhaltene Heilung steigt um 30%.",
      "Beim Wirken ihrer Ultimate stiehlt Hecate zusätzlich 2% Rüstung und M-RES von gegnerischen Einheiten auf dem Feld, bis zu 100% ihrer eigenen Rüstung und M-RES.",
      "Von Hecate erhaltene Heilung steigt um 50%.",
      "Von Hecate erhaltene Heilung steigt um 60%.",
    ]],
    es: ["Trono de la luna del inframundo", "Diosa triple de la luna oscura y la oportunidad", [
      "La curación recibida por Hecate aumenta un 30%.",
      "Al lanzar su definitiva, Hecate también roba un 2% de armadura y RES M de las unidades enemigas en el campo, hasta el 100% de su propia armadura y RES M.",
      "La curación recibida por Hecate aumenta un 50%.",
      "La curación recibida por Hecate aumenta un 60%.",
    ]],
    ru: ["Трон луны подземного мира", "Триединая богиня темной луны и возможности", [
      "Получаемое Гекатой исцеление увеличивается на 30%.",
      "При применении ультимейта Геката также крадет 2% брони и M-RES у вражеских юнитов на поле, до 100% собственной брони и M-RES.",
      "Получаемое Гекатой исцеление увеличивается на 50%.",
      "Получаемое Гекатой исцеление увеличивается на 60%.",
    ]],
  },
};

function localizeCompact(heroId, en, locale, fieldLabel) {
  const draft = compactTranslationDrafts[heroId]?.[locale];
  if (!draft) throw new Error(`Missing compact ${locale} translations for ${heroId}`);

  const value = fieldLabel === "seatName"
    ? draft[0]
    : fieldLabel === "subtitle"
      ? draft[1]
      : draft[2][milestoneLevels.indexOf(fieldLabel)];

  if (typeof value !== "string") {
    throw new Error(`Missing compact ${locale} ${fieldLabel} translation for ${heroId}`);
  }

  return value;
}

function expandCompactMetadata() {
  for (const [heroId, [seatNameEn, subtitleEn, skillTexts]] of Object.entries(compactMetadata)) {
    metadata[heroId] = {
      seatName: {
        en: seatNameEn,
        de: localizeCompact(heroId, seatNameEn, "de", "seatName"),
        es: localizeCompact(heroId, seatNameEn, "es", "seatName"),
        ru: localizeCompact(heroId, seatNameEn, "ru", "seatName"),
      },
      subtitle: {
        en: subtitleEn,
        de: localizeCompact(heroId, subtitleEn, "de", "subtitle"),
        es: localizeCompact(heroId, subtitleEn, "es", "subtitle"),
        ru: localizeCompact(heroId, subtitleEn, "ru", "subtitle"),
      },
      milestones: Object.fromEntries(
        milestoneLevels.map((level, index) => [level, {
          en: skillTexts[index],
          de: localizeCompact(heroId, skillTexts[index], "de", level),
          es: localizeCompact(heroId, skillTexts[index], "es", level),
          ru: localizeCompact(heroId, skillTexts[index], "ru", level),
        }]),
      ),
    };
  }
}

function localized(zh, translations, fieldLabel, heroId) {
  const result = { zh };
  for (const locale of locales.filter((entry) => entry !== "zh")) {
    const value = translations?.[locale];
    if (typeof value !== "string") {
      throw new Error(`Missing ${locale} ${fieldLabel} translation for ${heroId}`);
    }
    result[locale] = value;
  }
  return result;
}

function main() {
  expandCompactMetadata();

  const captureRows = JSON.parse(fs.readFileSync(SOURCE_PATH, "utf8"));
  const heroDb = JSON.parse(fs.readFileSync(HERO_DB_PATH, "utf8"));
  const knownHeroIds = new Set(Object.keys(heroDb));

  const heroes = captureRows.map((row) => {
    const heroId = heroIdByCaptureId[row.hero_id];
    if (!heroId) throw new Error(`No canonical heroId mapping for capture id ${row.hero_id}`);
    if (!knownHeroIds.has(heroId)) throw new Error(`Mapped heroId does not exist locally: ${heroId}`);

    const throneAssetId = throneAssetIdByHeroId[heroId];
    if (!throneAssetId) throw new Error(`Missing throneAssetId mapping for ${heroId}`);

    const entryTranslations = metadata[heroId];
    if (!entryTranslations) throw new Error(`Missing localization metadata for ${heroId}`);

    return {
      heroId,
      captureHeroId: row.hero_id,
      open: Boolean(row.open),
      cnName: row.cn_name,
      configName: row.config_name,
      captureInternalName: row.internal_name || null,
      captureEnName: row.en_name || null,
      exSkillIds: row.ex_skill,
      throneAssetId,
      seatName: localized(row.seat_name, entryTranslations.seatName, "seatName", heroId),
      subtitle: localized(row.subtitle || "", entryTranslations.subtitle, "subtitle", heroId),
      milestones: milestoneLevels.map((level) => ({
        level,
        text: localized(
          row.skills[String(level)],
          entryTranslations.milestones[level],
          `milestone ${level}`,
          heroId,
        ),
      })),
    };
  });

  const output = {
    schemaVersion: 1,
    generatedFrom: {
      file: SOURCE_PATH,
      capturedHeroCount: captureRows.length,
    },
    notes: [
      "Chinese text is preserved from the capture source.",
      "heroId is normalized to the local canonical hero id.",
      "Non-Chinese localizations are draft translations and should be reviewed before publication.",
      "German, Spanish and Russian use dedicated draft translations rather than English fallback text.",
      "Capture row 2001 is normalized from an incorrect Set label to the local Sekhmet hero.",
    ],
    localizationStatus: {
      zh: "source",
      en: "draft",
      de: "draft",
      es: "draft",
      ru: "draft",
    },
    milestoneLevels,
    locales,
    heroes,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${OUTPUT_PATH} (${heroes.length} heroes)`);
}

main();

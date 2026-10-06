// Player-facing text for hero ultimates and enemies, shared by the in-game popover
// and the glossary page. Numbers mirror castUltimate / classUltimate in sim.js and
// tuning.enemies; update both together.

// What each ultimate does before Awakening. Every ultimate hits for 250% of attack
// times the hero's ultimate power, unless the text says otherwise.
/** @type {Record<string, string>} */
export const SKILL_TEXT = {
  shield_wall: "Slows every enemy in her reach widened by two steps for 3s and heals road allies in range for 15% of their max health.",
  expose: "Slows every enemy in his reach widened by two steps for 3s and exposes them: they take 20% more damage for 4s.",
  mass_taunt: "Slows every enemy in his reach widened by three steps for 3s.",
  knockback: "Strikes up to 3 enemies in front of him, furthest along first, and pushes them 80px back along the path.",
  war_cry: "Strikes every enemy in front of him and slows them for 2s.",
  lifesteal_cleave: "Strikes every enemy in front of him and heals for 15% of the damage dealt.",
  venom_cleave: "Strikes every enemy within 72px in front of him and exposes them: they take 20% more damage for 4s.",
  shadow_step: "Phases to the weakest enemy she can reach anywhere on the map and strikes it (1.8x damage below 35% health), slowing enemies around it for 2s.",
  soul_drain: "Heavy hit (1.8x) on the weakest enemy in range that stuns it for 2s. A kill refunds 60% of the charge.",
  claw_sweep: "Strikes her target (1.8x below 35% health) and claws every enemy within 55px of it for 70% (1.8x below 35% health).",
  rapid_strike: "Hits his target 3 times for 50% each.",
  chain_lightning: "Blasts every enemy within 72px of the target, then lightning bounces to 2 more enemies for 70% and 45%.",
  rebirth_flame: "Blasts every enemy within 72px of the target and heals herself for 20% of her max health.",
  weaken_burst: "Blasts every enemy within 72px of the target and exposes them: they take 20% more damage for 4s.",
  ice_shockwave: "An ice shockwave hits every enemy within his attack range for 140%. Each enemy hit has a 10% chance to freeze for 2s (cannot move or attack).",
  moon_barrage: "Fires 3 shots for 55% each at enemies in front of her and raises the attack of allies in range by 25% for 5s.",
  piercing_shot: "Fires a shot through the target that hits every enemy on the line, up to 1.5x her range, for 55% each.",
  limitless_shots: "For 6s every basic attack looses 3 arrows at its target (50% each for the extra two) that set it on fire, and her reach grows one step.",
  flurry: "For 4s every basic attack strikes 3 times (60% each for the extra two).",
  solar_rush: "Cleaves every enemy in front of him for 60% and slows them for 2s. Then for 5s he attacks 30% faster with 20% more attack, and every attack strikes twice (70% for the second).",
  bifrost_ward: "Allies in his reach take 25% less damage for 4s.",
  molten_ground: "The road around the target turns to lava for 4s: enemies on it take 50% of her attack per second (within 80px) and are slowed.",
  petrify_shot: "Petrifies up to 3 enemies in front of her for 3s (they cannot move or attack) and hits them for 55%.",
  fortune_shower: "Heals allies in range for 18% of their max health and raises their attack by 25% for 5s.",
  fate_link: "Heals allies in range for 18% of their max health and fills 30% of their ultimate charge.",
  valkyrie_call: "Revives the most recently fallen hero on its free tile at level 1 with half health. Heals allies in range when nobody can be revived.",
  rooted_sanctuary: "Heals allies in range for 30% of her own max health. For 8s they take 30% less damage.",
  sun_beam: "Fires a bright beam along her row, to the left or right (never up or down), toward the side with more enemies. Hits up to 8 enemies on that line once for 100% each.",
};

// Campaign skill progression uses the same two passive slots for every hero so saves stay
// stable, while each class gives those slots its own name and fiction. The effects themselves
// are applied in campaign.js: one raises attack, the other raises health.
export const CLASS_PASSIVE_SKILLS = {
  Tank: [
    { id: "passiveAttack", name: "Crushing Counter", text: "Turns a firm defense into heavier attacks." },
    { id: "passiveHealth", name: "Stone Skin", text: "Hardens the body against sustained pressure." },
  ],
  Warrior: [
    { id: "passiveAttack", name: "Battle Rhythm", text: "Each practiced motion adds force to the next strike." },
    { id: "passiveHealth", name: "Iron Constitution", text: "Endures longer when holding the road." },
  ],
  Assassin: [
    { id: "passiveAttack", name: "Deadly Opening", text: "Punishes the first gap in an enemy's guard." },
    { id: "passiveHealth", name: "Escape Artist", text: "Survives the danger of fighting behind enemy lines." },
  ],
  Mage: [
    { id: "passiveAttack", name: "Arcane Study", text: "Refines every spell into a stronger attack." },
    { id: "passiveHealth", name: "Warding Sigil", text: "A quiet ward absorbs part of every blow." },
  ],
  Archer: [
    { id: "passiveAttack", name: "True Aim", text: "Places every shot where it will hurt most." },
    { id: "passiveHealth", name: "Light Footing", text: "Keeps the archer alive when the battle reaches the platform." },
  ],
  Support: [
    { id: "passiveAttack", name: "Guiding Hymn", text: "Channels greater force through every attack." },
    { id: "passiveHealth", name: "Protective Grace", text: "Sustains the caster through a prolonged defense." },
  ],
};

// What the awakened ultimate (collection Evolution V, `awakenedUlt`) adds.
/** @type {Record<string, string>} */
export const AWAKEN_TEXT = {
  shield_wall: "heals road allies for 30% instead of 15%, slow lasts 4s",
  expose: "enemies take extra damage for 7s instead of 4s",
  mass_taunt: "reach widened by four steps instead of three, slow lasts 5s",
  knockback: "pushes up to 5 enemies 140px instead of 3 enemies 80px",
  war_cry: "cleave deals 50% more damage, slow lasts 4s",
  lifesteal_cleave: "heals for 30% of the damage dealt instead of 15%",
  venom_cleave: "cleave radius 100px, extra damage taken lasts 8s",
  shadow_step: "also strikes the second weakest enemy",
  claw_sweep: "splash radius 90px instead of 55px",
  rapid_strike: "5 hits instead of 3",
  chain_lightning: "4 bounces instead of 2",
  rebirth_flame: "blast radius 110px, heals herself for 40% instead of 20%",
  weaken_burst: "blast radius 110px instead of 72px",
  ice_shockwave: "20% freeze chance, freeze lasts 3s",
  moon_barrage: "5 shots instead of 3, ally buff lasts 8s",
  piercing_shot: "90% damage per enemy hit instead of 55%, twice the range",
  limitless_shots: "5 arrows per attack instead of 3, lasts 8s",
  flurry: "5 strikes per attack instead of 3, lasts 6s",
  solar_rush: "rush lasts 8s instead of 5s",
  bifrost_ward: "allies take 35% less damage for 6s",
  molten_ground: "lava lasts 5s and covers 110px",
  petrify_shot: "petrifies 5 enemies for 4s instead of 3 for 3s",
  fortune_shower: "ally buff lasts 8s and every cast pays 15 gold",
  fate_link: "allies gain 60% ultimate charge instead of 30%",
  valkyrie_call: "revived heroes return at full health",
  rooted_sanctuary: "heals for 50% of her max health, allies take 40% less damage",
  sun_beam: "hits up to 12 enemies instead of 8",
  soul_drain: "stun lasts 3s, a kill refunds 80% of the charge",
};

// Lord skill (tuning.lords): what a selected Lord gives matching heroes in that squad row.
// Built from the tuned numbers so the text never drifts from the sim (stepLords, lordFx, lordMark).
/** @param {{ faction: string, groupId: string, attrBonus: number, buff: { dmg: number, heal: number, seconds: number, baseInterval: number, perMember: number, minInterval: number }, mark: { bonus: number, seconds: number } } | undefined} cfg */
export function lordText(cfg) {
  if (!cfg) return "";
  const pct = (v) => `${Math.round(v * 100)}%`;
  return `Lord (${cfg.faction}): always raises the basic attributes of matching ${cfg.faction} heroes in this row by ${pct(cfg.attrBonus)}. `
    + `Periodically raises their damage and healing by ${pct(cfg.buff.dmg)} for ${cfg.buff.seconds}s; more matching row heroes shorten the interval (from ${cfg.buff.baseInterval}s to ${cfg.buff.minInterval}s). `
    + `After the Lord damages an enemy directly, matching heroes in this row deal ${pct(cfg.mark.bonus)} extra damage to it for ${cfg.mark.seconds}s (one enemy per Lord attack).`;
}

// Class part added on top of every hero ultimate (classUltimate in sim.js).
/** @type {Record<string, string>} */
export const CLASS_ULT_TEXT = {
  Tank: "Tank: also pins every ground enemy in its reach widened by two steps in place for 2s.",
  Assassin: "Assassin: also becomes untouchable for 3s while striking an extra enemy.",
};

// Boss rules (M18); numbers in tuning.bosses. Loosely follow the real mechanics in bosses.json.
/** @type {Record<string, string>} */
export const BOSS_RULES = {
  baphomet: "Mark of the Goat: every 15s marks the hero that dealt the most recent damage; 1.5s later it is silenced for 3s and loses 10% health (Supports with Radiance or Purify can lift it). Defensive Stance: every 20s takes 60% less damage for 4s. Spreading damage over several heroes blunts the mark.",
  lilith: "End of All: below half health her children attack three times as fast.",
  ochenta: "The Eighty Count: every hit he takes grants 1 Valor; at 80 Valor a shockwave stuns heroes within 80px for 2s, and for 4s he moves 80% faster and shrugs off 80% of crowd control. Fast attacks only fuel his momentum. Spanish Resolve: at 80%, 60%, 40% and 20% health he gains 8% attack, 8% attack speed and takes 4% less damage, for good. The Final Eight: below 8% health he cannot fall below 1 HP for 8s and attacks 80% harder and faster while moving 40% faster.",
};

// Rare and epic run blessings (M17); numbers in tuning.runBoons.
/** @type {Record<string, { name: string, text: string }>} */
export const RUN_BOON_INFO = {
  storm_surge: { name: "Storm Surge", text: "Chain lightning bounces stun each enemy they reach for 0.4s." },
  tidal_pull: { name: "Tidal Pull", text: "Wet enemies move 20% slower." },
  venom_rot: { name: "Venom Rot", text: "Poisoned enemies take 25% more damage from every source." },
  wildfire_spread: { name: "Wildfire Spread", text: "Burning enemies that die pass their fire to enemies nearby." },
  rally: { name: "Rally", text: "When a road hero falls, every hero deals 30% more damage for 5s." },
  shattering_cold: { name: "Shattering Cold", text: "Frozen enemies take double damage." },
  drowned_burst: { name: "Drowned Burst", text: "Wet enemies burst when they die, dealing 30% of their health to enemies nearby." },
  soul_reaper: { name: "Soul Reaper", text: "Every 10th kill pays 15 gold and charges every ultimate by 1s." },
};

// Special rings (M16); numbers in tuning.rings, placement in tdMaps.json "rings".
/** @type {Record<string, { name: string, text: string }>} */
export const RING_INFO = {
  highground: { name: "High ground", text: "Reach one step further for the hero standing here." },
  shrine: { name: "Shrine", text: "The hero's ultimate charges 30% faster." },
  cursed: { name: "Cursed tile", text: "+30% damage, but 20% slower attacks." },
};

// Endless mutators (M15); numbers in tuning.mutators.
/** @type {Record<string, { name: string, text: string }>} */
export const MUTATOR_INFO = {
  fortified: { name: "Fortified", text: "Enemies have 30% more health." },
  haste: { name: "Haste", text: "Enemies move 25% faster." },
  warded: { name: "Warded", text: "Every enemy carries a shield worth 40% of its health." },
  horde: { name: "Horde", text: "The stage sends 40% more enemies." },
  ironclad: { name: "Ironclad", text: "Enemies gain 120 armor and 120 magic resistance." },
  elites: { name: "Elites", text: "Every 3rd enemy is an Elite: 2.5x health, a shield, 3x gold." },
};

// Status effects and reactions (M13); numbers in tuning.statuses.
/** @type {Record<string, { name: string, text: string }>} */
export const STATUS_INFO = {
  wet: { name: "Wet", text: "No damage on its own, lasts 4s. Sets up Conduct, Steam and Freeze." },
  burn: { name: "Burn", text: "30% of the hit again as damage over 3s." },
  poison: { name: "Poison", text: "30% of the hit again as damage over 4s." },
  chill: { name: "Chill", text: "Slowed by the Frost or Crippling path." },
};

/** @type {Record<string, { name: string, needs: string, text: string }>} */
export const REACTION_INFO = {
  conduct: { name: "Conduct", needs: "Wet + chain lightning", text: "A chain that starts on a Wet enemy bounces 3 more times and hits Wet enemies 60% harder." },
  steam: { name: "Steam", needs: "Wet + Burn", text: "Wet and Burn cancel out in a burst of 4x the burn's damage, half of that to enemies nearby." },
  blight: { name: "Blight", needs: "Poison + Burn", text: "Burning a poisoned enemy spreads its poison, twice as strong, to enemies around it." },
  freeze: { name: "Freeze", needs: "Wet + Chill", text: "A Wet enemy that gets chilled freezes solid for 2s (once every 3s)." },
  harvest: { name: "Soul Harvest", needs: "Poison + soul-draining ultimate", text: "Every poisoned enemy that dies charges the soul-draining Assassin's ultimate by 1.5s." },
};

// Enemy kinds in the order players meet them; stats come from tuning.enemies.
/** @type {Record<string, { name: string, text: string }>} */
export const ENEMY_INFO = {
  grunt: { name: "Grunt", text: "The basic foot soldier. Walks the path, stops at road heroes and fights them in melee." },
  runner: { name: "Runner", text: "Fast and fragile. Slips past full blockers quickly; Assassins hit fast enemies nobody holds hardest." },
  flyer: { name: "Flyer", text: "Flies over the road: ignores blockers and never attacks. Road heroes and their ultimates cannot reach it, so only platform heroes can. Archers hit it twice as hard." },
  archer: { name: "Archer", text: "Stops at range for 8 seconds and shoots the nearest road hero. With no road hero in reach it shoots a platform hero within range instead, for half damage (amber brackets mark the target). Then closes in to melee." },
  brute: { name: "Brute", text: "Slow and heavily armored against physical damage, but weak to magic. Costs 2 lives if it gets through." },
  boss: { name: "Boss", text: "The battlefield's final boss, arriving with an escort. Very tough, hits hard and costs 3 lives if it gets through." },
  mender: { name: "Mender", text: "Every 2.5 seconds heals nearby enemies (not other Menders) for 8% of their health. Each enemy can be healed for at most half its health in total. Walks inside the pack, so splash damage, Last enemy targeting or an Assassin's dash reach it." },
  shieldbearer: { name: "Shieldbearer", text: "Carries a shield worth 160% of its health that takes damage first. Every hit strips at least 15% of the shield, so many quick hits (cleave, splash, fast attackers) break it faster than one big hit. The shield grows back after 4 seconds without a hit." },
  hexer: { name: "Hexer", text: "Every 6 seconds hexes the nearest hero within 140 range: for 2 seconds it cannot attack and its ultimate stops charging. Shoots road heroes from range like an Archer. Resists magic; Archers outrange the hex." },
  broodcaller: { name: "Broodcaller", text: "Calls 2 Imps every 4 seconds, up to 4 at a time and 8 in total. Resists magic; Archers snipe it from range. Costs 2 lives if it gets through." },
  burrower: { name: "Burrower", text: "When it takes a hit it dives for 3 seconds: untargetable, and it walks under your blockers. It can only dive again 6 seconds after surfacing. Assassins catch it on the surface; a second blocker holds the next one." },
  vinebinder: { name: "Vinebinder", text: "Roots the road hero it is fighting every 7 seconds: that hero cannot attack for 4 seconds but still blocks, and its ultimate keeps charging. Resists magic somewhat; a Support heals through it." },
  jaguar: { name: "Jaguar", text: "Fast. Leaps over the first blocker it meets (once) and keeps running. A second blocker behind the first, or Archers, stop it." },
  sporeling: { name: "Sporeling", text: "Weak and quick. When it dies it leaves spores: heroes within 70 range attack 25% slower for 4 seconds. Kill it before it reaches the line." },
  imp: { name: "Imp", text: "Small, fast and fragile. Only appears from a Broodcaller." },
  brood: { name: "Lilith's Children", text: "Summoned around Lilith. While any of them stand she cannot be hit, and all damage they take also hurts her. When all have fallen she summons them again, weaker." },
};

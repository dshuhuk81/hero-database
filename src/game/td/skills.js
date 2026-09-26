// Player-facing text for hero ultimates and enemies, shared by the in-game popover
// and the glossary page. Numbers mirror castUltimate / classUltimate in sim.js and
// tuning.enemies; update both together.

// What each ultimate does before Awakening. Every ultimate hits for 250% of attack
// times the hero's ultimate power, unless the text says otherwise.
/** @type {Record<string, string>} */
export const SKILL_TEXT = {
  shield_wall: "Slows every enemy within 1.8x her range for 3s and heals road allies in range for 15% of their max health.",
  expose: "Slows every enemy within 1.8x his range for 3s and exposes them: they take 20% more damage for 4s.",
  mass_taunt: "Slows every enemy within 2.5x his range for 3s.",
  drain_field: "Slows every enemy within 1.8x her range for 3s and heals herself for 15% of her max health.",
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
  moon_barrage: "Fires 3 shots for 55% each at enemies in front of her and raises the attack of allies in range by 25% for 5s.",
  piercing_shot: "Fires a shot through the target that hits every enemy on the line, up to 1.5x her range, for 55% each.",
  petrify_shot: "Petrifies up to 3 enemies in front of her for 3s (they cannot move or attack) and hits them for 55%. Waits until she faces a target.",
  fortune_shower: "Heals allies in range for 18% of their max health and raises their attack by 25% for 5s.",
  fate_link: "Heals allies in range for 18% of their max health and fills 30% of their ultimate charge.",
  valkyrie_call: "Revives the most recently fallen hero on its free ring at level 1 with half health. Heals allies in range when nobody can be revived.",
};

// What Awakening adds to each ultimate.
/** @type {Record<string, string>} */
export const AWAKEN_TEXT = {
  shield_wall: "heals road allies for 30% instead of 15%, slow lasts 4s",
  expose: "enemies take extra damage for 7s instead of 4s",
  mass_taunt: "taunt reaches 3.5x range instead of 2.5x, slow lasts 5s",
  drain_field: "heals herself for 35% instead of 15%",
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
  moon_barrage: "5 shots instead of 3, ally buff lasts 8s",
  piercing_shot: "90% damage per enemy hit instead of 55%, twice the range",
  petrify_shot: "petrifies 5 enemies for 4s instead of 3 for 3s",
  fortune_shower: "ally buff lasts 8s and every cast pays 15 gold",
  fate_link: "allies gain 60% ultimate charge instead of 30%",
  valkyrie_call: "revived heroes return at full health",
  soul_drain: "stun lasts 3s, a kill refunds 80% of the charge",
};

// Class part added on top of every hero ultimate (classUltimate in sim.js).
/** @type {Record<string, string>} */
export const CLASS_ULT_TEXT = {
  Tank: "Tank: also pins every ground enemy within 1.8x range in place for 2s.",
  Assassin: "Assassin: also becomes untouchable for 3s while striking an extra enemy.",
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
  harvest: { name: "Soul Harvest", needs: "Poison + Anubis", text: "Every poisoned enemy that dies charges Anubis's ultimate by 1.5s." },
};

// Class paths chosen with the level 4 upgrade (M12); numbers in tuning.paths.
/** @type {Record<string, Record<string, { name: string, text: string }>>} */
export const PATH_INFO = {
  Tank: {
    bulwark: { name: "Bulwark", text: "Holds 1 more enemy at once." },
    thorns: { name: "Thorns", text: "Enemies that hit it take 40% of that damage back." },
    warden: { name: "Warden", text: "Enemies it holds take 30% more damage from every hero." },
  },
  Warrior: {
    whirlwind: { name: "Whirlwind", text: "Cleave hits 3 more enemies in a 30% wider area." },
    sunder: { name: "Sunder", text: "Each hit strips 8% armor and magic res from the target for 4s, up to 40%." },
    bloodlust: { name: "Bloodlust", text: "Heals for 25% of the damage its attacks deal." },
  },
  Assassin: {
    reach: { name: "Long Reach", text: "Dashes 80 further to catch loose enemies." },
    ambush: { name: "Ambush", text: "The first strike on each enemy deals 2.5x damage." },
    twin: { name: "Twin Blades", text: "Every attack also strikes the nearest other enemy for 70%." },
  },
  Mage: {
    wildfire: { name: "Wildfire", text: "Hits set enemies on fire: 40% of the hit again over 3s." },
    frost: { name: "Frost", text: "Hits slow enemies to 60% speed for 1.5s." },
    arc: { name: "Arc", text: "Attacks chain to 2 more enemies (60% and 35%); Zeus gets 2 extra bounces." },
  },
  Archer: {
    piercing: { name: "Piercing", text: "Each shot also hits up to 2 enemies right behind the target for 60%." },
    mark: { name: "Hunter's Mark", text: "Hit enemies take 40% more damage from every hero for 5s." },
    crippling: { name: "Crippling", text: "Hits slow enemies to 50% speed for 2s." },
  },
  Support: {
    sanctuary: { name: "Sanctuary", text: "Heals also reach allies next to the target for half." },
    hymn: { name: "War Hymn", text: "Allies in range attack 20% faster." },
    purify: { name: "Purify", text: "Lifts hexes from allies in range and heals 25% more." },
  },
};

// Enemy kinds in the order players meet them; stats come from tuning.enemies.
/** @type {Record<string, { name: string, text: string }>} */
export const ENEMY_INFO = {
  grunt: { name: "Grunt", text: "The basic foot soldier. Walks the path, stops at road heroes and fights them in melee." },
  runner: { name: "Runner", text: "Fast and fragile. Slips past full blockers quickly; Assassins hit fast enemies nobody holds hardest." },
  flyer: { name: "Flyer", text: "Flies over the road: ignores blockers and never attacks. Road heroes and their ultimates cannot reach it, so only platform heroes can. Archers hit it twice as hard." },
  archer: { name: "Archer", text: "Stops at range and shoots road heroes for 8 seconds, then closes in to melee." },
  brute: { name: "Brute", text: "Slow and heavily armored against physical damage, but weak to magic. Costs 2 lives if it gets through." },
  boss: { name: "Boss", text: "The battlefield's final boss, arriving with an escort. Very tough, hits hard and costs 3 lives if it gets through." },
  mender: { name: "Mender", text: "Every 2.5 seconds heals nearby enemies (not other Menders) for 8% of their health. Each enemy can be healed for at most half its health in total. Walks inside the pack, so splash damage, Last enemy targeting or an Assassin's dash reach it." },
  shieldbearer: { name: "Shieldbearer", text: "Carries a shield worth 160% of its health that takes damage first. Every hit strips at least 15% of the shield, so many quick hits (cleave, splash, fast attackers) break it faster than one big hit. The shield grows back after 4 seconds without a hit." },
  hexer: { name: "Hexer", text: "Every 6 seconds hexes the nearest hero within 140 range: for 2 seconds it cannot attack and its ultimate stops charging. Shoots road heroes from range like an Archer. Resists magic; Archers outrange the hex." },
  broodcaller: { name: "Broodcaller", text: "Calls 2 Imps every 4 seconds, up to 4 at a time and 8 in total. Resists magic; Archers snipe it from range. Costs 2 lives if it gets through." },
  imp: { name: "Imp", text: "Small, fast and fragile. Only appears from a Broodcaller." },
  brood: { name: "Lilith's Children", text: "Summoned around Lilith. While any of them stand she cannot be hit, and all damage they take also hurts her. When all have fallen she summons them again, weaker." },
};

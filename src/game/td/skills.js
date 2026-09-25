// Player-facing text for hero ultimates and enemies, shared by the in-game popover
// and the glossary page. Numbers mirror castUltimate / classUltimate in sim.js and
// tuning.enemies; update both together.

// What each ultimate does before Awakening. Every ultimate hits for 250% of attack
// times the hero's ultimate power, unless the text says otherwise.
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
export const CLASS_ULT_TEXT = {
  Tank: "Tank: also pins every ground enemy within 1.8x range in place for 2s.",
  Assassin: "Assassin: also becomes untouchable for 3s while striking an extra enemy.",
};

// Enemy kinds in the order players meet them; stats come from tuning.enemies.
export const ENEMY_INFO = {
  grunt: { name: "Grunt", text: "The basic foot soldier. Walks the path, stops at road heroes and fights them in melee." },
  runner: { name: "Runner", text: "Fast and fragile. Slips past full blockers quickly; Assassins hit fast enemies nobody holds hardest." },
  flyer: { name: "Flyer", text: "Flies over the road: ignores blockers and never attacks. Road heroes and their ultimates cannot reach it, so only platform heroes can. Archers hit it twice as hard." },
  archer: { name: "Archer", text: "Stops at range and shoots road heroes for 8 seconds, then closes in to melee." },
  brute: { name: "Brute", text: "Slow and heavily armored against physical damage, but weak to magic. Costs 2 lives if it gets through." },
  boss: { name: "Boss", text: "The battlefield's final boss, arriving with an escort. Very tough, hits hard and costs 3 lives if it gets through." },
  brood: { name: "Lilith's Children", text: "Summoned around Lilith. While any of them stand she cannot be hit, and all damage they take also hurts her. When all have fallen she summons them again, weaker." },
};

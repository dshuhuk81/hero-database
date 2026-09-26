import assert from "node:assert/strict";
import { TowerDefenseGame } from "../src/game/td/sim.js";
import {
  TREE, CLASSES, applyBlessings, buildRunTuning, canBuy, computeInsight, findNode, legacyRefund, levelCost,
  nodeSpent, pointsIn, shardEligible, shardFavor, spentByCurrency,
} from "../src/game/td/favor.js";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import waves from "../src/data/tdWaves.json" with { type: "json" };

const trunkNode = (type) => TREE.nodes.find((entry) => entry.tree === "trunk" && entry.effect.type === type);
const classNode = (cls, type) => TREE.nodes.find((entry) => entry.tree === cls && entry.effect.type === type);
const make = (levels = {}) => {
  const game = new TowerDefenseGame({ heroes, tuning: buildRunTuning(tuning, levels), map: maps[0], waves, seed: 5 });
  game.gold = 100000;
  return game;
};
const heroOf = (cls) => heroes.find((hero) => hero.class === cls);
const place = (game, hero) => {
  const slots = hero.slot === "road" ? game.map.roadSlots : game.map.platformSlots;
  const index = slots.findIndex((_, i) => !game.heroes.some((h) => h.slotType === hero.slot && h.slotIndex === i));
  assert.equal(game.place(hero.id, hero.slot, index), true, `place ${hero.id}`);
  return game.heroes.at(-1);
};
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

// --- Tree data: every reference resolves, every class has the same branch, effects are known ---
{
  const ids = new Set(TREE.nodes.map((n) => n.id));
  assert.equal(ids.size, TREE.nodes.length, "node ids unique");
  for (const node of TREE.nodes) {
    for (const ref of [...(node.requires || []), ...(node.requiresAny || [])]) assert.ok(ids.has(ref), `${node.id} requires ${ref}`);
    assert.ok(node.maxLevel >= 1 && node.cost > 0, `${node.id} level and cost`);
    assert.ok(node.tree === "trunk" || CLASSES.includes(node.tree), `${node.id} tree`);
  }
  const shape = (cls) => TREE.nodes.filter((n) => n.tree === cls).map((n) => `${n.stage}:${n.maxLevel}:${n.cost}`).join("|");
  for (const cls of CLASSES) assert.equal(shape(cls), shape(CLASSES[0]), `${cls} branch matches the template`);
  // Every heroes' class has a branch.
  for (const hero of heroes) assert.ok(CLASSES.includes(hero.class), `${hero.class} has a branch`);
}

// --- Costs: level prices grow by costGrowth; spent is summed per currency ---
{
  const gold = trunkNode("startingGold");
  assert.equal(levelCost(gold, 1), gold.cost);
  assert.equal(levelCost(gold, 3), Math.round(gold.cost * TREE.costGrowth ** 2));
  assert.equal(nodeSpent(gold, 2), levelCost(gold, 1) + levelCost(gold, 2));
  const might = classNode("Tank", "atk");
  const spent = spentByCurrency({ [gold.id]: 2, [might.id]: 1, unknown_node: 4 });
  assert.equal(spent.favor, nodeSpent(gold, 2), "trunk spends Favor");
  assert.equal(spent.Tank, might.cost, "class nodes spend that class's Insight");
  assert.equal(pointsIn({ [gold.id]: 2, [might.id]: 1 }, "trunk"), 2);
  assert.equal(pointsIn({ [gold.id]: 2, [might.id]: 1 }, "Tank"), 1);
}

// --- Unlock rules: points in the tree, required nodes, pick-one pairs, level cap ---
{
  const tier2 = TREE.nodes.find((n) => n.tree === "trunk" && n.requiresPoints);
  const tier1 = TREE.nodes.filter((n) => n.tree === "trunk" && !n.requiresPoints);
  assert.equal(canBuy(tier1[0].id, {}).ok, true, "tier 1 open from the start");
  const few = { [tier1[0].id]: tier2.requiresPoints - 1 };
  assert.equal(canBuy(tier2.id, few).ok, false, "tier 2 needs its points");
  assert.ok(canBuy(tier2.id, few).reason.includes(String(tier2.requiresPoints)));
  const enough = Object.fromEntries(tier1.map((n) => [n.id, n.maxLevel]));
  assert.ok(pointsIn(enough, "trunk") >= tier2.requiresPoints);
  assert.equal(canBuy(tier2.id, enough).ok, true, "tier 2 open with enough points");
  assert.equal(canBuy(tier1[0].id, enough).ok, false, "maxed node cannot be bought again");

  // Class branch: Mythic stats open, Divine stages gated by points and by the node above.
  const cls = "Mage";
  const node = (type) => classNode(cls, type);
  const mythic = TREE.nodes.filter((n) => n.tree === cls && n.stage === "Mythic");
  const full = Object.fromEntries(mythic.map((n) => [n.id, n.maxLevel]));
  assert.equal(canBuy(node("startLevel").id, {}).ok, false, "Divine I needs points");
  assert.equal(canBuy(node("startLevel").id, full).ok, true, "Divine I open after Mythic");
  assert.equal(canBuy(node("splash").id, full).ok, false, "Divine II needs Divine I");
  const withD2 = { ...full, [node("startLevel").id]: 1, [node("splash").id]: 1 };
  assert.ok(pointsIn(withD2, cls) >= node("infuse").requiresPoints, "enough points for Divine III");
  assert.equal(canBuy(node("infuse").id, withD2).ok, true);
  const pickedInfusion = { ...withD2, [node("infuse").id]: 1 };
  assert.equal(canBuy(node("ultPower").id, pickedInfusion).ok, false, "Infusion and Wrath exclude each other");
  assert.ok(canBuy(node("ultPower").id, pickedInfusion).reason.includes("pick one"));
  assert.equal(canBuy(node("awakenDiscount").id, withD2).ok, false, "Divine IV needs Infusion or Wrath");
  assert.ok(canBuy(node("awakenDiscount").id, withD2).reason.includes(" or "));
  assert.equal(canBuy(node("awakenDiscount").id, pickedInfusion).ok, true, "Divine IV open after Infusion");
}

// --- Bonuses scale with the level ---
{
  const hp = trunkNode("heroHp");
  close(applyBlessings({ [hp.id]: 3 }).heroHpBonus, hp.effect.value * 3, "3 levels of hero HP");
  close(applyBlessings({ [hp.id]: 99 }).heroHpBonus, hp.effect.value * hp.maxLevel, "levels past the cap are clamped");
  const might = classNode("Tank", "atk");
  close(applyBlessings({ [might.id]: 2 }).classBonus.Tank.atk, might.effect.value * 2, "class bonus under classBonus");
  assert.deepEqual(make().favor, { classBonus: {} }, "no bonuses without blessings");
}

// --- Trunk effects in the simulator ---
{
  const gold = trunkNode("startingGold");
  const lives = trunkNode("lives");
  const run = buildRunTuning(tuning, { [gold.id]: 2, [lives.id]: 1 });
  assert.equal(run.run.startingGold, tuning.run.startingGold + gold.effect.value * 2, "starting gold");
  assert.equal(run.run.lives, tuning.run.lives + lives.effect.value, "lives");
  assert.equal(tuning.run.startingGold, buildRunTuning(tuning, {}).run.startingGold, "base tuning not mutated");

  assert.equal(make().wavePreview(2).totalHp, undefined, "no HP without Horus");
  assert.ok(make({ [trunkNode("showHp").id]: 1 }).wavePreview(2).totalHp > 0, "Horus shows wave HP");

  const mage = heroOf("Mage");
  const plain = place(make(), mage).hp;
  assert.equal(place(make({ [trunkNode("heroHp").id]: 5 }), mage).hp, Math.round(plain * (1 + trunkNode("heroHp").effect.value * 5)), "hero HP");

  const reward = tuning.enemies.grunt.reward;
  let total = 0;
  const loot = make({ [trunkNode("killGold").id]: 5 });
  for (let i = 0; i < 100; i += 1) total += loot.killReward(reward);
  assert.equal(total, Math.round(100 * reward * (1 + trunkNode("killGold").effect.value * 5)), "kill gold");

  close(make({ [trunkNode("ultCharge").id]: 5 }).ultChargeRate(), 1 + trunkNode("ultCharge").effect.value * 5, "ult charge");
  close(make({ [trunkNode("synergyTag").id]: 2 }).synergyPerTag(), tuning.synergy.bonusPerTag + trunkNode("synergyTag").effect.value * 2, "synergy");

  const slow = make({ [trunkNode("wave1Speed").id]: 3 });
  slow.startWave();
  slow.spawnEnemy("grunt");
  close(slow.enemies.at(-1).speed, tuning.enemies.grunt.speed * (1 - trunkNode("wave1Speed").effect.value * 3), "wave 1 slowed");

  const cheap = make({ [trunkNode("upgradeDiscount").id]: 5 });
  const unit = place(cheap, mage);
  assert.equal(cheap.upgradeInfo(unit.entityId).cost, Math.round(tuning.upgrades.costs[1] * (1 - trunkNode("upgradeDiscount").effect.value * 5)), "upgrade discount");

  const clear = make({ [trunkNode("clearBonus").id]: 5 });
  place(clear, mage);
  clear.startWave(); clear.spawnQueue = []; clear.enemies = [];
  const before = clear.gold;
  clear.step(1 / 60);
  const base = tuning.run.waveClearBonus.base;
  assert.equal(clear.gold - before, Math.round(base * (1 + trunkNode("clearBonus").effect.value * 5)) + (clear.quest?.status === "done" ? clear.quest.gold : 0), "wave-clear bonus");

  const offers = make({ [trunkNode("extraOffer").id]: 1 });
  offers.offerVirtues();
  assert.equal(offers.virtueOffer.length, 4, "one more blessing offered");

  const boss = make({ [trunkNode("bossDamage").id]: 4 });
  const zeus = place(boss, heroOf("Mage"));
  boss.startWave(); boss.spawnQueue = []; boss.enemies = [];
  const b = boss.spawnEnemy("boss");
  const g = boss.spawnEnemy("grunt");
  const bHp = b.hp, gHp = g.hp;
  boss.hit(b, 100, zeus); boss.hit(g, 10, zeus);
  close(bHp - b.hp, 100 * (1 + trunkNode("bossDamage").effect.value * 4), "boss damage bonus");
  close(gHp - g.hp, 10, "no bonus on other enemies");

  // Set's Command (former team slot, now starting gold) keeps its id so bought levels carry over.
  const command = buildRunTuning(tuning, { set_command: 1 });
  assert.equal(command.run.startingGold, tuning.run.startingGold + findNode("set_command").effect.value, "Set's Command adds starting gold");
  assert.equal(command.run.maxTeam, undefined, "no team cap");

  const wall = make({ [trunkNode("contactRange").id]: 4 });
  const tank = place(wall, heroOf("Tank"));
  const reach = 42 + trunkNode("contactRange").effect.value * 4;
  assert.ok(wall.findEnemyTarget({ x: tank.x + reach - 1, y: tank.y }), "contact range grows");
}

// --- Class effects apply to their class only ---
{
  const lv = (cls, type, level = null) => { const n = classNode(cls, type); return { [n.id]: level ?? n.maxLevel }; };
  const mage = heroOf("Mage"), tank = heroOf("Tank"), archer = heroOf("Archer"), assassin = heroOf("Assassin"), support = heroOf("Support"), warrior = heroOf("Warrior");

  const atkGame = make(lv("Mage", "atk"));
  const m = place(atkGame, mage), t = place(atkGame, tank);
  const plainGame = make();
  const pm = place(plainGame, mage), pt = place(plainGame, tank);
  close(atkGame.attackValue(m) / plainGame.attackValue(pm), 1 + classNode("Mage", "atk").effect.value * 5, "mage attack");
  close(atkGame.attackValue(t), plainGame.attackValue(pt), "tank attack unchanged");

  assert.equal(place(make(lv("Tank", "hp")), tank).hp, Math.round(pt.hp * (1 + classNode("Tank", "hp").effect.value * 5)), "tank HP");
  assert.equal(place(make(lv("Mage", "range")), mage).range, Math.round(mage.range * (1 + classNode("Mage", "range").effect.value * 5)), "range %");
  // Class specials strengthen the class kit (M6).
  const wide = make(lv("Mage", "splash"));
  close(wide.splashRadius(place(wide, mage)), tuning.classes.Mage.splash.radius * (1 + classNode("Mage", "splash").effect.value), "Wide Blast");
  close(plainGame.splashRadius(pm), tuning.classes.Mage.splash.radius, "plain splash radius");
  const breaker = make(lv("Archer", "pierce"));
  close(breaker.pierceFor(place(breaker, archer)), tuning.classes.Archer.pierce + classNode("Archer", "pierce").effect.value, "Armor Breaker");
  const sweep = make(lv("Warrior", "cleave"));
  close(sweep.cleaveShare(place(sweep, warrior)), tuning.classes.Warrior.cleave.share + classNode("Warrior", "cleave").effect.value, "Sweeping Blows");
  const reach = make(lv("Assassin", "dash"));
  assert.equal(reach.dashReach(place(reach, assassin)), tuning.classes.Assassin.dash + classNode("Assassin", "dash").effect.value, "Shadow Reach");
  assert.equal(reach.dashReach(place(reach, mage)), 0, "only Assassins dash");

  const early = make(lv("Archer", "startLevel"));
  const a = place(early, archer);
  assert.equal(a.level, 2, "Early Ascension enters at level 2");
  assert.equal(a.atk, early.atkFor(a, 2));
  assert.equal(early.upgradeInfo(a.entityId).needsFocus, true, "the focus is still chosen at level 3");
  assert.equal(place(early, mage).level, 1, "other classes enter at level 1");


  // Infusion (Divine III): the class's attacks apply its status; other classes don't.
  // Heroes without a status of their own, so only the Infusion can apply one.
  const byId = (id) => heroes.find((h) => h.id === id);
  for (const [cls, hero, status] of [["Mage", byId("fengyi"), "burn"], ["Warrior", byId("amunra"), "wet"], ["Archer", byId("diana"), "chill"]]) {
    assert.equal(applyBlessings(lv(cls, "infuse")).classBonus[cls].infuse, status, `${cls} infusion stored`);
    const game = make(lv(cls, "infuse"));
    const unit = place(game, hero);
    const foe = game.spawnEnemy("grunt");
    game.applyHeroStatus(unit, foe, 100);
    const has = { burn: game.isBurning(foe), wet: game.isWet(foe), chill: foe.chill > 0 }[status];
    assert.ok(has, `${cls} Infusion applies ${status}`);
  }
  const bareGame = make({});
  const bareFoe = bareGame.spawnEnemy("grunt");
  bareGame.applyHeroStatus(place(bareGame, byId("fengyi")), bareFoe, 100);
  assert.ok(!bareGame.isBurning(bareFoe), "no Infusion, no status");
  assert.equal(applyBlessings(lv("Support", "purify")).classBonus.Support.purify, 1, "Radiance stored");

  const heal = make(lv("Support", "support"));
  close(heal.healFraction({ class: "Support" }), tuning.support.healFraction * (1 + classNode("Support", "support").effect.value), "support heals");

  // Unbreakable Line: a Tank engages one more melee enemy before the next walks past.
  const engagedUntilFull = (levels, hero) => {
    const game = make(levels);
    const w = place(game, hero);
    game.engaged = new Map();
    let caught = 0;
    while (game.findEnemyTarget({ x: w.x + 5, y: w.y }) && caught < 10) caught += 1;
    return caught;
  };
  assert.equal(engagedUntilFull({}, tank), tuning.blocking.blockLimit.Tank, "default Tank limit");
  assert.equal(engagedUntilFull(lv("Tank", "blockLimit"), tank), tuning.blocking.blockLimit.Tank + 1, "Unbreakable Line +1");
  assert.equal(engagedUntilFull(lv("Tank", "blockLimit"), warrior), tuning.blocking.blockLimit.Warrior, "Tank blessing leaves Warriors alone");

  const rite = make(lv("Tank", "awakenDiscount"));
  const tu = place(rite, tank);
  tu.level = tuning.upgrades.maxLevel;
  assert.equal(rite.upgradeInfo(tu.entityId).cost, Math.round(tuning.awakening.cost * (1 - classNode("Tank", "awakenDiscount").effect.value)), "Divine Rite");

  const apex = make(lv("Tank", "awakenBonus"));
  const ta = place(apex, tank);
  const bonus = classNode("Tank", "awakenBonus").effect.value;
  assert.equal(apex.atkFor(ta, 4, true), Math.round(ta.baseAtk * (1 + tuning.upgrades.attackPerLevel * 3) * (1 + tuning.awakening.attackBonus + bonus)), "Apotheosis attack");
}

// --- Insight: waves on the field and kills per class, credited at wave clear ---
{
  const game = make();
  const zeus = place(game, heroOf("Mage"));
  const tank = place(game, heroOf("Tank"));
  game.startWave(); game.spawnQueue = []; game.enemies = [];
  for (let i = 0; i < TREE.insight.killsPerPoint; i += 1) game.hit(game.spawnEnemy("grunt"), 1e9, zeus);
  game.enemies = [];
  game.step(1 / 60);
  assert.deepEqual(game.insightLog.Mage, { waves: 1, kills: TREE.insight.killsPerPoint });
  assert.deepEqual(game.insightLog.Tank, { waves: 1, kills: 0 });
  const { perWave } = TREE.insight;
  assert.deepEqual(computeInsight(game.insightLog), { Mage: perWave + 1, Tank: perWave }, "perWave per wave + 1 per killsPerPoint kills");
  assert.deepEqual(computeInsight({}), {}, "nothing played, nothing earned");
  // A unit that falls during the wave still earns its class the wave.
  game.startWave(); game.spawnQueue = []; game.enemies = [];
  game.damageHero(tank, tank.hpLeft + 1, null);
  game.step(1 / 60);
  assert.equal(game.insightLog.Tank.waves, 2, "fallen tank still credited");
}

// --- Old tree refund ---
{
  assert.equal(legacyRefund(["demeter_bounty", "amunra_surge", "gone"]), 25 + 120, "old prices refunded, unknown ids ignored");
  assert.equal(legacyRefund([]), 0);
  assert.ok(findNode("demeter_bounty"), "old ids that still exist are new nodes, bought from level 0 again");
}

// --- 6C run-end shards: eligibility, Favor size, and boosts folded into run tuning ---
{
  const { minWave, favorMin, gold } = tuning.shards;
  assert.equal(shardEligible(minWave - 1, tuning), false, "early loss earns no shard");
  assert.equal(shardEligible(minWave, tuning), true, "reaching minWave earns a shard");
  assert.equal(shardEligible(10, { ...tuning, shards: undefined }), false, "no config, no shards");
  assert.equal(shardFavor(150, tuning), 15, "10% of run Favor");
  assert.equal(shardFavor(20, tuning), favorMin, "minimum Favor shard");

  const base = new TowerDefenseGame({ heroes, tuning: buildRunTuning(tuning, {}), map: maps[0], waves, seed: 5 });
  const goldRun = new TowerDefenseGame({ heroes, tuning: buildRunTuning(tuning, {}, { type: "gold", gold }), map: maps[0], waves, seed: 5 });
  assert.equal(goldRun.gold, base.gold + gold, "gold shard adds starting gold");
  const virtue = Object.keys(tuning.virtueEffects)[0];
  const virtueRun = new TowerDefenseGame({ heroes, tuning: buildRunTuning(tuning, {}, { type: "virtue", virtue }), map: maps[0], waves, seed: 5 });
  assert.deepEqual(virtueRun.virtues, [virtue], "virtue shard starts the run with the virtue");
  virtueRun.reset();
  assert.deepEqual(virtueRun.virtues, [virtue], "virtue survives a reset (Favor rebuild before wave 1)");
  const bogus = new TowerDefenseGame({ heroes, tuning: buildRunTuning(tuning, {}, { type: "virtue", virtue: "Nope" }), map: maps[0], waves, seed: 5 });
  assert.deepEqual(bogus.virtues, [], "unknown virtue ignored");
}

console.log("Tower defense favor checks passed.");

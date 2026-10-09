// Tier I hero talents in the battle (T2, docs/tower-defense-hero-talents-concept.md). Each talent is
// compared with the same hero and seed without it.
import assert from "node:assert/strict";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { TowerDefenseGame } from "../src/game/td/sim.js";
import { boardOf } from "../src/game/td/board.js";
import { talentFx } from "../src/game/td/talents.js";
import { maps } from "./lib/td-runner.mjs";

const map = maps.find((m) => boardOf(m) && m.theme === "moonlit") ?? maps.find((m) => boardOf(m));
const timeline = [{ startMs: 0, kind: "grunt", count: 6, repeat: 1, everyMs: 1000 }];
const withTalents = (id, talents) => heroes.map((hero) => (hero.id === id ? { ...hero, talents } : hero));
const heroOf = (list, id) => list.find((hero) => hero.id === id);
// A game with one hero of `id` placed on the first tile of its slot type (`slot`: road or platform).
const game = ({ id, talents = [], slot = "road", index = 0, timeline: tl = timeline, extra = {} }) => {
  const list = withTalents(id, talents);
  const g = new TowerDefenseGame({ heroes: list, tuning, map, timeline: tl, seed: 11, hpScale: 1e6, lives: 99999, ...extra });
  g.placement = 1e6;
  assert.ok(g.place(id, slot, index), `${id} placed`);
  return g;
};
const run = (g, seconds) => { g.start(); while (g.time < seconds) g.step(1 / 60); };
const damageDone = (g, id) => g.heroStats[id]?.damage ?? 0;

// Merge rules.
{
  assert.deepEqual(talentFx([]), {});
  assert.deepEqual(talentFx(undefined), {});
  assert.ok(Math.abs(talentFx(["tank-iron-wall", "support-war-hymn"]).attackFactor - 0.7) < 1e-9);
  assert.equal(talentFx(["warrior-whirlwind"]).cleaveShareSet, 0.5);
  assert.equal(talentFx(["archer-multishot", "mage-focus-lens"]).extraTargets, 1);
  assert.equal(talentFx(["mage-focus-lens"]).noSplash, true);
  assert.deepEqual(talentFx(["odin-storm-lord"]), {}, "Tier II has no fx yet");
}

// Iron Wall: the Tank's own attacks deal 30% less, and it holds one more enemy.
{
  const plain = game({ id: "atlas", slot: "road" });
  const iron = game({ id: "atlas", talents: ["tank-iron-wall"], slot: "road" });
  const a = plain.attackValue(plain.heroes[0]), b = iron.attackValue(iron.heroes[0]);
  assert.ok(Math.abs(b / a - 0.7) < 1e-9, `attack x0.7 (${b / a})`);
  assert.equal(iron.talentFx(iron.heroes[0]).blockLimitAdd, 1);
}

// Thorns: a blocker that takes hits sends a share back to the attacker.
{
  const run1 = (talents) => {
    const g = game({ id: "atlas", talents, slot: "road" });
    g.heroes[0].atk = 0; // no own damage: only reflection can hurt the enemies
    g.heroes[0].hp = g.heroes[0].hpLeft = 1e9;
    run(g, 25);
    return g.enemies.reduce((sum, e) => sum + (e.maxHp - e.hp), 0);
  };
  assert.equal(run1([]), 0, "no talent, no damage to the attackers");
  assert.ok(run1(["tank-thorns"]) > 0, "thorns hurts the attackers");
}

// Duelist: one attack on a held enemy deals 50% more, on an unheld one the same as before; no crits.
{
  const strike = (talents, held) => {
    const g = game({ id: "aegir", talents, slot: "road" });
    const hero = g.heroes[0];
    hero.critChance = 0;
    g.start(); g.step(1 / 60);
    const enemy = g.enemies.find((e) => !e.dead);
    enemy.hp = enemy.maxHp = 1e9;
    enemy.held = held;
    const before = enemy.hp;
    g.basicAttack(hero, enemy);
    return before - enemy.hp;
  };
  assert.ok(Math.abs(strike(["warrior-duelist"], true) / strike([], true) - 1.5) < 1e-6, "held x1.5");
  assert.ok(Math.abs(strike(["warrior-duelist"], false) / strike([], false) - 1) < 1e-6, "unheld unchanged");
}

// Executioner: a hit finishes a ground enemy under the threshold, a boss is never finished.
{
  const g = game({ id: "nott", talents: ["assassin-executioner"], slot: "road" });
  g.heroes[0].atk = 1;
  g.start(); g.step(1 / 60);
  const enemy = { ...g.enemies[0] };
  assert.ok(enemy, "a grunt is on the road");
  const target = g.enemies.find((e) => !e.dead);
  target.hp = target.maxHp * 0.1;
  const hero = g.heroes[0];
  hero.attackClock = 0;
  g.basicAttack(hero, target);
  assert.equal(target.dead, true, "executioner finishes a grunt below 12%");

  const h2 = game({ id: "nott", slot: "road" });
  h2.heroes[0].atk = 1;
  h2.start(); h2.step(1 / 60);
  const t2 = h2.enemies.find((e) => !e.dead);
  t2.hp = t2.maxHp * 0.1;
  h2.basicAttack(h2.heroes[0], t2);
  assert.equal(t2.dead, false, "without the talent a 1-damage hit does not finish it");
}

// Focus Lens: no splash at all; Wildfire: wider splash, smaller share. Two enemies stand on one spot,
// one attack on the first: a plain Mage splashes onto the second.
{
  const attack = (talents) => {
    const g = game({ id: "boreas", talents, slot: "platform" });
    const hero = g.heroes[0];
    g.start();
    const first = g.spawnEnemy("grunt", { distance: 60 });
    const second = g.spawnEnemy("grunt", { distance: 60 });
    second.x = first.x + 4; second.y = first.y + 4;
    first.hp = first.maxHp = second.hp = second.maxHp = 1e9;
    g.effects = [];
    g.basicAttack(hero, first);
    return { splash: g.effects.filter((e) => e.type === "splash").length, second: 1e9 - second.hp, g, hero };
  };
  const plain = attack([]);
  assert.ok(plain.splash > 0 && plain.second > 0, "a Mage splashes onto the neighbour");
  const focus = attack(["mage-focus-lens"]);
  assert.equal(focus.splash, 0, "Focus Lens never splashes");
  assert.equal(focus.second, 0, "and the neighbour takes nothing");
  const fire = attack(["mage-wildfire"]);
  assert.ok(Math.abs(fire.g.splashRadius(fire.hero) / plain.g.splashRadius(plain.hero) - 1.5) < 1e-9, "Wildfire splash radius x1.5");
  assert.equal(fire.g.splashShare(fire.hero), 0.25);
  assert.equal(plain.g.splashShare(plain.hero), tuning.classes.Mage.splash.share);
}

// Piercing Shot: the enemies behind the target on the same line take the pierce share too.
// Multishot: the nearest other enemy in reach takes its share. Direct attacks, no crits.
{
  const volley = (talents, place) => {
    const g = game({ id: "skadi", talents, slot: "platform" });
    const hero = g.heroes[0];
    hero.critChance = 0;
    g.start();
    const enemies = place(g, hero);
    for (const e of enemies) e.hp = e.maxHp = 1e9;
    g.basicAttack(hero, enemies[0]);
    return enemies.map((e) => 1e9 - e.hp);
  };
  const line = (g, hero) => {
    const target = g.spawnEnemy("grunt", { distance: 60 });
    const dx = target.x - hero.x, dy = target.y - hero.y, len = Math.hypot(dx, dy);
    const behind = g.spawnEnemy("grunt", { distance: 60 });
    behind.x = target.x + (dx / len) * 20; behind.y = target.y + (dy / len) * 20;
    const third = g.spawnEnemy("grunt", { distance: 60 });
    third.x = target.x + (dx / len) * 40; third.y = target.y + (dy / len) * 40;
    return [target, behind, third];
  };
  const plain = volley([], line);
  assert.equal(plain[1], 0, "without the talent the enemy behind is untouched");
  const pierce = volley(["archer-piercing-shot"], line);
  assert.ok(pierce[1] > 0 && pierce[2] > 0, "piercing shot hits both enemies behind");
  assert.ok(Math.abs(pierce[1] / plain[0] - talentFx(["archer-piercing-shot"]).pierceShare) < 1e-6, "pierced enemy takes the pierce share of the main hit");
  const sideways = (g, hero) => {
    const target = g.spawnEnemy("grunt", { distance: 60 });
    const other = g.spawnEnemy("grunt", { distance: 60 });
    other.x = target.x + 4; other.y = target.y + 4;
    return [target, other];
  };
  assert.equal(volley(["archer-piercing-shot"], sideways)[1], 0, "not on the line, not pierced");
  const multi = volley(["archer-multishot"], sideways);
  assert.ok(multi[1] > 0, "multishot hits the other enemy in reach");
  assert.equal(volley([], sideways)[1], 0, "without the talent it is not hit");
}

// Warden: healing above full health becomes a barrier, capped at 20% of max health; it takes hits first.
{
  const g = game({ id: "asclepius", talents: ["support-warden"], slot: "platform" });
  const [support] = g.heroes;
  const ally = { ...support, entityId: 9001, id: "ally-test", hp: 1000, hpLeft: 900, barrierHp: 0 };
  g.heroes.push(ally);
  g.healHero(ally, 150, support); // 100 to full, 50 overflow
  assert.equal(ally.hpLeft, 1000);
  assert.ok(Math.abs(ally.barrierHp - 50) < 1e-9, `barrier from overflow (${ally.barrierHp})`);
  g.damageHero(ally, 20, null);
  assert.ok(Math.abs(ally.barrierHp - 30) < 1e-9, "barrier takes the hit");
  assert.equal(ally.hpLeft, 1000);
  g.healHero(ally, 5000, support);
  assert.ok(ally.barrierHp <= 200 + 1e-9, "barrier capped at 20% of max health");
}

// War Hymn: heals less and its aura is 60% stronger.
{
  const plain = game({ id: "harmonia", slot: "platform" }), hymn = game({ id: "harmonia", talents: ["support-war-hymn"], slot: "platform" });
  const healer = (g) => g.heroes[0];
  assert.ok(Math.abs(hymn.talentFx(healer(hymn)).healFactor - 0.6) < 1e-9, "heal x0.6");
  const ally = (g) => ({ ...g.heroes[0], entityId: 9002, id: "ally-aura", x: g.heroes[0].x, y: g.heroes[0].y, ability: "attack" });
  for (const g of [plain, hymn]) { g.heroes.push(ally(g)); }
  const bonus = (g) => g.supportAuraFor(g.heroes.at(-1))?.bonus ?? 0;
  assert.ok(bonus(plain) > 0, "a support aura reaches the ally");
  assert.ok(Math.abs(bonus(hymn) / bonus(plain) - 1.6) < 1e-9, `aura x1.6 (${bonus(hymn) / bonus(plain)})`);
}

console.log("td talent effects ok");

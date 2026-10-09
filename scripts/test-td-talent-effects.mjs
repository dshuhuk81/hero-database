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
  assert.deepEqual(talentFx(["unknown-talent"]), {}, "an unknown talent id changes nothing");
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

// Tier II (signature) talents: each ultimate cast directly, with and without the talent.
const enemyAt = (g, x, y, hp = 1e9) => { const e = g.spawnEnemy("grunt", { distance: 60 }); e.x = x; e.y = y; e.hp = e.maxHp = hp; return e; };
const ally = (g, hero, slot = "road", extra = {}) => { const a = { ...hero, entityId: 9100 + g.heroes.length, id: `ally-${g.heroes.length}`, slotType: slot, hp: 1000, hpLeft: 500, barrierHp: 0, ...extra }; g.heroes.push(a); return a; };

// Sky Pillar: the wall holds 2 more enemies while it stands; World's Weight shields allies in reach.
{
  const plain = game({ id: "atlas", slot: "road" });
  const pillar = game({ id: "atlas", talents: ["atlas-sky-pillar"], slot: "road" });
  const hero = pillar.heroes[0];
  pillar.castUltimate(hero, enemyAt(pillar, hero.x + 5, hero.y + 5));
  assert.equal(pillar.wallBonus(hero), 2, "Sky Pillar: +2 blockers while the wall stands");
  pillar.time += 7;
  assert.equal(pillar.wallBonus(hero), 0, "and it ends after 6 s");
  const p0 = plain.heroes[0];
  plain.castUltimate(p0, enemyAt(plain, p0.x + 5, p0.y + 5));
  assert.equal(plain.wallBonus(p0), 0, "without the talent nothing changes");
}
{
  const g = game({ id: "atlas", talents: ["atlas-world-s-weight"], slot: "road" });
  const hero = g.heroes[0];
  const platform = ally(g, hero, "platform");
  g.castUltimate(hero, enemyAt(g, hero.x + 5, hero.y + 5));
  assert.ok(platform.barrierHp > 0 && g.time < platform.barrierUntil, "World's Weight shields a platform ally in reach");
  const plain = game({ id: "atlas", slot: "road" });
  const plainHero = plain.heroes[0];
  const plainAlly = ally(plain, plainHero, "platform");
  plain.castUltimate(plainHero, enemyAt(plain, plainHero.x + 5, plainHero.y + 5));
  assert.equal(plainAlly.barrierHp, 0, "without the talent no barrier");
}

// Ragnarok: the struck enemies burn. Blood Pact: the neighbouring road allies are healed too.
{
  const g = game({ id: "surtr", talents: ["surtr-ragnarok"], slot: "road" });
  const hero = g.heroes[0];
  const target = enemyAt(g, hero.x + 5, hero.y + 5);
  g.castUltimate(hero, target);
  assert.ok(target.burnUntil > g.time, "Ragnarok leaves burning enemies");
  const plain = game({ id: "surtr", slot: "road" });
  const ph = plain.heroes[0];
  const pt = enemyAt(plain, ph.x + 5, ph.y + 5);
  plain.castUltimate(ph, pt);
  assert.ok(!(pt.burnUntil > plain.time), "without the talent no burn");
}
{
  const heal = (talents) => {
    const g = game({ id: "surtr", talents, slot: "road" });
    const hero = g.heroes[0];
    const neighbour = ally(g, hero, "road", { hpLeft: 500 });
    g.castUltimate(hero, enemyAt(g, hero.x + 5, hero.y + 5));
    return neighbour.hpLeft - 500;
  };
  assert.equal(heal([]), 0, "without the talent the neighbour is not healed");
  assert.ok(heal(["surtr-blood-pact"]) > 0, "Blood Pact heals the neighbour");
}

// Eclipse: veiled after the step. Twin Stars: the step strikes two enemies.
{
  const g = game({ id: "nott", talents: ["nott-eclipse"], slot: "road" });
  const hero = g.heroes[0];
  g.castUltimate(hero, enemyAt(g, hero.x + 5, hero.y + 5));
  assert.ok(Math.abs(hero.veilUntil - g.time - 6) < 1e-9, "Eclipse: the veil lasts 6 s instead of 3");
  const plain = game({ id: "nott", slot: "road" });
  const ph = plain.heroes[0];
  plain.castUltimate(ph, enemyAt(plain, ph.x + 5, ph.y + 5));
  assert.ok(Math.abs(ph.veilUntil - plain.time - 3) < 1e-9, "without Eclipse the veil lasts 3 s");
}
{
  const struck = (talents) => {
    const g = game({ id: "nott", talents, slot: "road" });
    const hero = g.heroes[0];
    const a = enemyAt(g, hero.x + 5, hero.y + 5, 1e9);
    const b = enemyAt(g, hero.x - 30, hero.y - 30, 1e9);
    g.castUltimate(hero, a);
    return [a, b].filter((e) => e.hp < e.maxHp).length;
  };
  assert.equal(struck([]), 1, "without Twin Stars only the target");
  assert.equal(struck(["nott-twin-stars"]), 2, "Twin Stars strikes the second enemy too");
}

// Storm Lord: two more bolts. Rune Mark: the struck target takes more damage from everyone for 6 s.
{
  // Enemies struck: the target plus the bounces. Bounce targets sit 120 px diagonally off the target, outside
  // the blast pattern but within the 140 px bounce reach. Each hit also emits a shot, so count enemies.
  const struck = (talents) => {
    const g = game({ id: "odin", talents, slot: "platform" });
    const hero = g.heroes[0];
    const first = enemyAt(g, hero.x + 5, hero.y + 5);
    const rest = Array.from({ length: 6 }, (_, i) => enemyAt(g, first.x + 85 + i * 0.5, first.y + 85));
    g.castUltimate(hero, first);
    return [first, ...rest].filter((e) => e.hp < e.maxHp).length;
  };
  assert.equal(struck(["odin-storm-lord"]) - struck([]), 2, "Storm Lord adds two bolts");
  const g = game({ id: "odin", talents: ["odin-rune-mark"], slot: "platform" });
  const hero = g.heroes[0];
  const target = enemyAt(g, hero.x + 5, hero.y + 5);
  g.castUltimate(hero, target);
  assert.ok(target.exposed > g.time + 5, "Rune Mark exposes the target for about 6 s");
}

// Endless Quiver: the shot window lasts 2 s longer. Wind Step: each shot in the window slows its target.
{
  const window = (talents) => { const g = game({ id: "atalanta", talents, slot: "platform" }); const h = g.heroes[0]; g.castUltimate(h, enemyAt(g, h.x + 5, h.y + 5)); return h.win.until - g.time; };
  assert.ok(Math.abs(window(["atalanta-endless-quiver"]) - window([]) - 2) < 1e-9, "Endless Quiver +2 s");
  const g = game({ id: "atalanta", talents: ["atalanta-wind-step"], slot: "platform" });
  const hero = g.heroes[0];
  const target = enemyAt(g, hero.x + 5, hero.y + 5);
  g.castUltimate(hero, target);
  g.basicAttack(hero, target);
  assert.ok(target.slow >= 1.5 - 1e-9, "Wind Step slows the struck target");
}

// Golden Tithe: 3 more Nectar, heals less. Midas Touch: heals more, no Nectar at all.
{
  const run = (talents) => {
    const g = game({ id: "plutus", talents, slot: "platform" });
    const hero = g.heroes[0];
    const a = ally(g, hero, "road", { hpLeft: 100 });
    const before = g.placement;
    g.castUltimate(hero, enemyAt(g, hero.x + 5, hero.y + 5));
    return { nectar: g.placement - before, healed: a.hpLeft - 100 };
  };
  const plain = run([]), gold = run(["plutus-golden-tithe"]), midas = run(["plutus-midas-touch"]);
  assert.equal(gold.nectar - plain.nectar, 3, "Golden Tithe pays 3 more Nectar");
  assert.ok(Math.abs(gold.healed / plain.healed - 0.6) < 1e-6, "Golden Tithe heals x0.6");
  assert.ok(Math.abs(midas.healed / plain.healed - 1.5) < 1e-6, "Midas Touch heals x1.5");
  assert.equal(midas.nectar, 0, "Midas Touch pays no Nectar");
}


// T5: the rest of the Tier II talents (16 heroes), each against the same setup without the talent.
const hitSpy = (g) => { const orig = g.hit.bind(g); const calls = []; g.hit = (e, a, h, o) => { calls.push(e); return orig(e, a, h, o); }; return calls; };
const ready = (id, talents, slot = "road", extra = {}) => { const g = game({ id, talents, slot, ...extra }); g.heroes[0].hp = g.heroes[0].hpLeft = 1e9; return g; };
const near = (g, hero, x = 5, y = 5) => enemyAt(g, hero.x + x, hero.y + y);

// Ymir: Frost Expose chills, Giant's Reach halves the expose time here (wider, shorter).
{
  const g = ready("ymir", ["ymir-frost-expose"]); const h = g.heroes[0]; const e = near(g, h);
  g.castUltimate(h, e); assert.ok(e.chill > 0, "Frost Expose chills the exposed enemy");
  const p = ready("ymir", []); const ph = p.heroes[0]; const pe = near(p, ph);
  p.castUltimate(ph, pe); assert.equal(pe.chill ?? 0, 0, "without it no chill");
  const r = ready("ymir", ["ymir-giant-s-reach"]); const rh = r.heroes[0]; const re = near(r, rh);
  r.castUltimate(rh, re);
  assert.ok(Math.abs((re.exposed - r.time) / (pe.exposed - p.time) - 0.5) < 1e-6, "Giant's Reach: half the expose time");
}

// Heimdall: Rainbow Bridge shields allies just beyond reach at half strength; Gjallarhorn stuns when the ward ends.
{
  const g = ready("heimdall", ["heimdall-rainbow-bridge"]); const h = g.heroes[0];
  const far = ally(g, h, "platform", { x: h.x + h.range * 1.6, y: h.y });
  assert.equal(g.inReach(h, far), false, "the test ally is outside reach");
  g.castUltimate(h, near(g, h));
  assert.ok(far.wardUntil > g.time && far.wardCut > 0, "Rainbow Bridge reaches the ally beyond reach");
  const p = ready("heimdall", []); const ph = p.heroes[0]; const pfar = ally(p, ph, "platform", { x: ph.x + ph.range * 1.6, y: ph.y });
  p.castUltimate(ph, near(p, ph));
  assert.ok(!(pfar.wardUntil > p.time), "without it the far ally gets nothing");
}
{
  const g = ready("heimdall", ["heimdall-gjallarhorn"]); const h = g.heroes[0];
  const e = near(g, h); g.start(); g.castUltimate(h, e);
  assert.ok(h.hornAt > g.time, "Gjallarhorn is armed by the ward");
  while (g.time < h.hornAt + 0.1) g.step(1 / 60);
  assert.ok(e.stunnedUntil > g.time, "the horn stuns enemies near him when the ward ends");
}

// Gaia: Deep Roots cannot be moved while the sanctuary holds; Overgrowth roots enemies in her pattern.
{
  const g = ready("gaia", ["gaia-deep-roots"], "platform"); const h = g.heroes[0];
  g.castUltimate(h, near(g, h));
  assert.equal(g.relocationInfo(h.entityId).ok, false, "Deep Roots: rooted while the sanctuary holds");
  g.time += 20;
  assert.ok(g.relocationInfo(h.entityId).ok, "free again once the sanctuary is gone");
}
{
  const g = ready("gaia", ["gaia-overgrowth"], "platform"); const h = g.heroes[0];
  const e = enemyAt(g, h.x, h.y); g.castUltimate(h, e);
  assert.ok(e.stunnedUntil > g.time, "Overgrowth roots the enemy in her pattern");
}

// Aegir: Undertow pushes less and wets; Rogue Wave pushes twice as far to fewer enemies.
{
  const push = (talents) => {
    const g = game({ id: "aegir", talents, slot: "road" }); const h = g.heroes[0];
    const e = g.spawnEnemy("grunt", { distance: 200 }); e.x = h.x + 5; e.y = h.y + 5; e.hp = e.maxHp = 1e9;
    const before = e.distance; g.castUltimate(h, e); return { moved: before - e.distance, e };
  };
  const plain = push([]), under = push(["aegir-undertow"]), rogue = push(["aegir-rogue-wave"]);
  assert.ok(Math.abs(under.moved / plain.moved - 0.5) < 1e-6, "Undertow pushes half as far");
  assert.ok(Math.abs(rogue.moved / plain.moved - 2) < 1e-6, "Rogue Wave pushes twice as far");
  assert.ok(under.e.wetUntil > 0 && under.e.slow > 0, "Undertow wets and slows the pushed enemy");
}

// Helios: Zenith lengthens the rush; Blinding Noon weakens struck enemies.
{
  const win = (talents) => { const g = game({ id: "helios", talents, slot: "road" }); const h = g.heroes[0]; g.castUltimate(h, near(g, h)); return h.win.until - g.time; };
  assert.ok(Math.abs(win(["helios-zenith"]) - win([]) - 3) < 1e-9, "Zenith +3 s on the rush");
  const g = ready("helios", ["helios-blinding-noon"]); const h = g.heroes[0]; const e = near(g, h);
  g.castUltimate(h, e);
  assert.equal(e.blindShare, 0.3, "Blinding Noon marks the struck enemy");
  assert.ok(e.blindUntil > g.time, "for a few seconds");
}

// Fenrir: Lock Jaw stuns the bitten target; Pack Howl hastens the allies beside him.
{
  const g = ready("fenrir", ["fenrir-lock-jaw"]); const h = g.heroes[0]; const e = near(g, h);
  g.castUltimate(h, e); assert.ok(e.stunnedUntil > g.time, "Lock Jaw stuns");
  const p = ready("fenrir", []); const ph = p.heroes[0]; const pe = near(p, ph); p.castUltimate(ph, pe);
  assert.equal(pe.stunnedUntil ?? 0, 0, "without it no stun");
}
{
  const g = ready("fenrir", ["fenrir-pack-howl"]); const h = g.heroes[0];
  const a = ally(g, h, "road"); g.castUltimate(h, near(g, h));
  assert.ok(a.rapid?.aps > 0 && a.rapidUntil > g.time, "Pack Howl hastens the neighbour");
}

// Hecate: Torchlight burns the swept enemies; Three Roads sweeps everything in her pattern.
{
  const g = ready("hecate", ["hecate-torchlight"], "road"); const h = g.heroes[0];
  const e = near(g, h); const t = near(g, h, -40, 0); g.castUltimate(h, e);
  assert.ok(t.burnUntil > g.time, "Torchlight burns the swept enemy");
}
{
  const roads = (talents) => {
    const g = ready("hecate", talents, "road"); const h = g.heroes[0];
    // The target stands on one neighbour; the other neighbours of the hero are in her pattern but not around the target.
    const target = near(g, h, 104, 0);
    const spots = [[-104, 0], [0, 104], [0, -104], [-104, 104], [-104, -104]];
    const inPattern = spots.map(([x, y]) => near(g, h, x, y)).filter((e) => g.inReach(h, e) && !g.nearPoint(target, e, 55));
    const calls = hitSpy(g);
    g.castUltimate(h, target);
    return inPattern.filter((e) => calls.includes(e)).length;
  };
  assert.equal(roads([]), 0, "without Three Roads the pattern-only enemies are untouched");
  assert.ok(roads(["hecate-three-roads"]) > 0, "Three Roads sweeps the pattern");
}

// Vidar: Silent Fury adds weaker strikes; Vengeance strikes harder the more health is missing.
{
  const shot = (talents) => { const g = game({ id: "vidar", talents, slot: "road" }); const h = g.heroes[0]; g.castUltimate(h, near(g, h)); return h.win; };
  const plain = shot([]), fury = shot(["vidar-silent-fury"]);
  assert.equal(fury.extra, plain.extra + 2, "Silent Fury: two more strikes");
  assert.ok(Math.abs(fury.share / plain.share - 0.7) < 1e-9, "each strike weaker");
  const g = game({ id: "vidar", talents: ["vidar-vengeance"], slot: "road" }); const h = g.heroes[0];
  h.hpLeft = h.hp; g.castUltimate(h, near(g, h)); const full = h.win.share;
  h.hpLeft = h.hp / 2; g.castUltimate(h, near(g, h)); const hurt = h.win.share;
  assert.ok(Math.abs(hurt / full - 1.4) < 1e-9, "Vengeance: +40% at half health (x0.8 max)");
}

// Thanatos: Reaper finishes enemies below 15%; Soul Harvest refunds charge from kills while open.
{
  const g = ready("thanatos", ["thanatos-reaper"], "road"); const h = g.heroes[0];
  const e = near(g, h); e.hp = e.maxHp * 0.1; e.maxHp = 1e9 * 0 + e.maxHp;
  g.castUltimate(h, e); assert.ok(e.dead, "Reaper finishes a grunt below 15%");
  const p = ready("thanatos", [], "road"); const ph = p.heroes[0]; const pe = near(p, ph); pe.hp = pe.maxHp * 0.1;
  p.castUltimate(ph, pe); assert.ok(!pe.dead, "without Reaper the same enemy survives");
}
{
  const g = ready("thanatos", ["thanatos-soul-harvest"], "road"); const h = g.heroes[0];
  g.castUltimate(h, near(g, h)); h.ultClock = 0;
  const victim = g.spawnEnemy("grunt", { distance: 60 });
  g.killEnemy(victim, h);
  assert.ok(Math.abs(h.ultClock - h.ultCooldown * 0.1) < 1e-9, "a kill in the window refunds 10% of the charge");
  g.time += 10; h.ultClock = 0; g.killEnemy(g.spawnEnemy("grunt", { distance: 60 }), h);
  assert.equal(h.ultClock, 0, "no refund after the window");
}

// Hephaestus: Hammerfall is one blow with a stun and no lava; Forge Bed is wider and lasts longer.
{
  const g = ready("hephaestus", ["hephaestus-hammerfall"], "platform"); const h = g.heroes[0]; const e = near(g, h);
  g.castUltimate(h, e);
  assert.equal((g.zones ?? []).length, 0, "Hammerfall leaves no lava");
  assert.ok(e.stunnedUntil > g.time, "and stuns the target");
}
{
  const zone = (talents) => { const g = game({ id: "hephaestus", talents, slot: "platform" }); const h = g.heroes[0]; g.castUltimate(h, near(g, h)); return g.zones[0]; };
  const plain = zone([]), forge = zone(["hephaestus-forge-bed"]);
  assert.ok(Math.abs(forge.radius / plain.radius - 1.3) < 1e-9, "Forge Bed: x1.3 radius");
  assert.ok(Math.abs(forge.until / plain.until - 1.5) < 1e-6, "Forge Bed lasts 1.5x as long");
}

// Boreas: Deep Freeze freezes every struck enemy; Northwind pushes each one back a tile.
{
  const g = ready("boreas", ["boreas-deep-freeze"], "platform"); const h = g.heroes[0];
  const e = enemyAt(g, h.x, h.y); const f = enemyAt(g, h.x + 3, h.y + 3);
  g.castUltimate(h, e);
  assert.ok(e.frozenUntil > g.time && f.frozenUntil > g.time, "every struck enemy freezes");
}
{
  const g = ready("boreas", ["boreas-northwind"], "platform"); const h = g.heroes[0];
  const e = g.spawnEnemy("grunt", { distance: 200 }); e.x = h.x; e.y = h.y; e.hp = e.maxHp = 1e9;
  const before = e.distance; g.castUltimate(h, e);
  assert.ok(Math.abs((before - e.distance) - 104) < 1e-6, "Northwind pushes back one tile");
}

// Isis: Long Noon strikes the struck again twice; Twin Beam also takes the enemies on the other side.
{
  const g = ready("isis", ["isis-long-noon"], "platform"); const h = g.heroes[0]; const e = near(g, h, 0, 0);
  g.start(); g.castUltimate(h, e);
  assert.equal(g.timedHits.length, 2, "two repeat strikes queued per struck enemy");
  const hp0 = e.hp;
  while (g.time < 2) g.step(1 / 60);
  assert.ok(e.hp < hp0, "the repeat strikes land");
}

// Skadi: Hunt Mark focuses the one target; Wide Barrage adds arrows of less power.
{
  const g = ready("skadi", ["skadi-hunt-mark"], "platform"); const h = g.heroes[0];
  const t = enemyAt(g, h.x, h.y), o = enemyAt(g, h.x + 4, h.y + 4); const calls = hitSpy(g);
  g.castUltimate(h, t);
  assert.ok(calls.every((c) => c === t), "every arrow hits the marked target");
}
{
  const arrows = (talents) => { const g = game({ id: "skadi", talents, slot: "platform" }); const h = g.heroes[0]; const t = enemyAt(g, h.x, h.y); for (let i = 0; i < 6; i += 1) enemyAt(g, h.x + 4 * (i + 1), h.y + 4 * (i + 1)); const calls = hitSpy(g); g.castUltimate(h, t); return calls.length; };
  assert.equal(arrows(["skadi-wide-barrage"]) - arrows([]), 3, "Wide Barrage: three more arrows");
}

// Stheno: Stone Stare holds one target longer; Coiled Gaze holds more, shorter.
{
  const gaze = (talents) => { const g = game({ id: "stheno", talents, slot: "platform" }); const h = g.heroes[0]; for (let i = 0; i < 8; i += 1) enemyAt(g, h.x + 2 * i, h.y + 3); const t = g.enemies[0]; g.castUltimate(h, t); return { petrified: g.enemies.filter((e) => e.petrifiedUntil > g.time).length, until: Math.max(...g.enemies.map((e) => (e.petrifiedUntil ?? 0) - g.time)) }; };
  const plain = gaze([]), stare = gaze(["stheno-stone-stare"]), coiled = gaze(["stheno-coiled-gaze"]);
  assert.equal(stare.petrified, 1, "Stone Stare takes one target");
  assert.ok(Math.abs(stare.until / plain.until - 1.5) < 1e-6, "and holds it longer");
  assert.ok(coiled.petrified > plain.petrified, "Coiled Gaze takes more");
  assert.ok(Math.abs(coiled.until / plain.until - 0.6) < 1e-6, "and holds them shorter");
}

// Harmonia: Shared Fate splits damage across the linked heroes; Harmony speeds them up.
{
  const g = ready("harmonia", ["harmonia-shared-fate"], "platform"); const h = g.heroes[0];
  const a = ally(g, h, "platform", { hpLeft: 1000 }); a.fateUntil = g.time + 6; a.fateSplit = true;
  h.fateUntil = g.time + 6; h.fateSplit = true; const before = a.hpLeft;
  g.damageHero(h, 100, null);
  assert.ok(Math.abs((before - a.hpLeft) - 50) < 1e-9, "the linked ally takes half");
}
{
  const g = ready("harmonia", ["harmonia-harmony"], "platform"); const h = g.heroes[0];
  const a = ally(g, h, "platform"); g.castUltimate(h, enemyAt(g, h.x, h.y));
  assert.ok(a.rapid?.aps > 0, "Harmony speeds up the linked ally");
}

// Asclepius: Second Life revives once per stage at 30%; Serpent Rod turns the heal into healing over time.
{
  const g = ready("asclepius", ["asclepius-second-life"], "platform"); const h = g.heroes[0]; g.start();
  const fallen = { id: "atlas", slotType: "road", slotIndex: 1, targeting: "auto" };
  g.fallenHeroes.push(fallen);
  g.castUltimate(h, near(g, h));
  assert.ok(g.heroes.some((x) => x.id === "atlas"), "the fallen hero returns");
  const back = g.heroes.find((x) => x.id === "atlas");
  assert.ok(Math.abs(back.hpLeft / back.hp - 0.3) < 0.01, "at 30% health");
  g.fallenHeroes.push({ ...fallen, slotIndex: 2 });
  g.castUltimate(h, near(g, h));
  assert.equal(g.heroes.filter((x) => x.id === "atlas").length, 1, "a second revive in the same stage is refused");
}
{
  const g = ready("asclepius", ["asclepius-serpent-rod"], "platform"); const h = g.heroes[0];
  const a = ally(g, h, "road", { hpLeft: 200 }); g.start();
  g.castUltimate(h, near(g, h));
  assert.ok(a.hotPerSecond > 0, "the squad gets healing over time");
  const before = a.hpLeft; while (g.time < 2) g.step(1 / 60);
  assert.ok(a.hpLeft > before, "and it heals while it lasts");
}

// Talent cues (Effekseer, T5): each playtest Tier II effect emits its cue event; without the talent none.
{
  const cues = (id, talents, slot, cast) => { const g = game({ id, talents, slot }); const h = g.heroes[0]; h.hp = h.hpLeft = 1e9; g.start(); g.effects = []; cast(g, h); return g.effects.map((e) => e.type).filter((t) => t.startsWith("talent")); };
  const at = (g, h) => enemyAt(g, h.x + 5, h.y + 5);
  assert.deepEqual(cues("atlas", ["atlas-sky-pillar"], "road", (g, h) => g.castUltimate(h, at(g, h))), ["talentWall"]);
  assert.deepEqual(cues("atlas", [], "road", (g, h) => g.castUltimate(h, at(g, h))), []);
  assert.ok(cues("atlas", ["atlas-world-s-weight"], "road", (g, h) => { ally(g, h, "platform"); g.castUltimate(h, at(g, h)); }).includes("talentShield"));
  assert.ok(cues("surtr", ["surtr-ragnarok"], "road", (g, h) => g.castUltimate(h, at(g, h))).includes("talentBurn"));
  assert.ok(cues("nott", ["nott-eclipse"], "road", (g, h) => g.castUltimate(h, at(g, h))).includes("talentVeil"));
  assert.ok(cues("odin", ["odin-rune-mark"], "platform", (g, h) => g.castUltimate(h, at(g, h))).includes("talentMark"));
  assert.ok(cues("atalanta", ["atalanta-wind-step"], "platform", (g, h) => { const t = at(g, h); g.castUltimate(h, t); g.basicAttack(h, t); }).includes("talentSlow"));
  assert.ok(cues("plutus", ["plutus-golden-tithe"], "platform", (g, h) => g.castUltimate(h, at(g, h))).includes("talentTithe"));
  assert.ok(cues("plutus", ["plutus-midas-touch"], "platform", (g, h) => { ally(g, h, "road"); g.castUltimate(h, at(g, h)); }).includes("talentMidas"));
}

console.log("td talent effects ok");

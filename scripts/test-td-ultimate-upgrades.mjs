// Utility ultimates must gain a real gameplay effect from Skill levels and Evolution.
import assert from "node:assert/strict";
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import rawHeroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import { collectionHeroes, newCampaignProgress } from "../src/game/td/campaign.js";
import { TowerDefenseGame } from "../src/game/td/sim.js";
import { createHeroFx } from "../src/game/td/hero-fx.js";

const ids = ["atlas", "ymir", "heimdall", "gaia", "plutus", "harmonia", "asclepius"];
const upgraded = collectionHeroes(campaign, {
  ...newCampaignProgress(campaign),
  skillLevels: Object.fromEntries(ids.map((id) => [id, { ultimate: 5 }])),
  evolution: Object.fromEntries(ids.map((id) => [id, 4])),
}, rawHeroes);
const byId = (roster, id) => roster.find((hero) => hero.id === id);
assert.equal(byId(upgraded, "atlas").ultimateEffectPower, 1.74,
  "Ultimate skill and Evolution jointly increase utility effect strength");
assert.equal(byId(rawHeroes, "atlas").ultimateEffectPower ?? 1, 1,
  "unupgraded ultimates retain their existing strength");

function cast(id, boosted, prepare = () => {}) {
  const roster = boosted ? upgraded : rawHeroes;
  const g = new TowerDefenseGame({ heroes: roster, tuning, map: maps[0], seed: 914 });
  g.placement = 100000;
  const hero = byId(roster, id);
  assert.equal(g.place(id, hero.slot, 0), true, `${id} placed`);
  const allyId = id === "atlas" ? "ymir" : "atlas";
  if (id !== "ymir" && id !== "asclepius") {
    assert.equal(g.place(allyId, "road", id === "atlas" || id === "heimdall" ? 1 : 0), true, "ally placed");
  }
  g.start();
  g.enemies = [];
  g.spawnEnemy("grunt");
  const caster = g.heroes.find((h) => h.id === id);
  const ally = g.heroes.find((h) => h.id === allyId);
  const enemy = g.enemies[0];
  enemy.x = caster.x; enemy.y = caster.y;
  if (ally) { ally.x = caster.x; ally.y = caster.y; ally.hpLeft = ally.hp * 0.25; }
  prepare({ g, caster, ally, enemy });
  g.castUltimate(caster, enemy);
  return { g, caster, ally, enemy };
}

for (const id of ["atlas", "gaia", "plutus"]) {
  const base = cast(id, false);
  const boost = cast(id, true);
  assert.ok(boost.ally.hpLeft / boost.ally.hp > base.ally.hpLeft / base.ally.hp,
    `${id}: upgraded ultimate heals more`);
}

for (const [id, field] of [["ymir", "exposed"]]) {
  const base = cast(id, false);
  const boost = cast(id, true);
  assert.ok(boost.enemy[field] > base.enemy[field], `${id}: upgraded control lasts longer`);
}

{
  const base = cast("heimdall", false);
  const boost = cast("heimdall", true);
  assert.ok(base.ally.wardCut > 0 && boost.ally.wardCut > base.ally.wardCut, "heimdall: upgraded ward cuts more damage");
  assert.ok(boost.ally.wardUntil > base.ally.wardUntil, "heimdall: upgraded ward lasts longer");
}

{
  const base = cast("harmonia", false);
  const boost = cast("harmonia", true);
  assert.ok(boost.ally.ultClock / boost.ally.ultCooldown > base.ally.ultClock / base.ally.ultCooldown,
    "harmonia: upgraded ultimate restores more charge");
}

{
  const prepare = ({ g }) => {
    const fallen = byId(rawHeroes, "atlas");
    g.fallenHeroes.push({ id: "atlas", slotType: "road", slotIndex: 0 });
    g.team = ["asclepius", fallen.id];
  };
  const base = cast("asclepius", false, prepare);
  const boost = cast("asclepius", true, prepare);
  const hpShare = ({ g }) => { const revived = g.heroes.find((h) => h.id === "atlas"); return revived.hpLeft / revived.hp; };
  assert.ok(hpShare(boost) > hpShare(base), "asclepius: upgraded revival restores more HP");
  assert.ok(hpShare(boost) <= 1, "revival never exceeds maximum HP");
}

{
  const { g } = cast("gaia", true);
  const effect = g.effects.find((e) => e.type === "ult" && e.heroId === "gaia");
  assert.ok(effect.ultimateEffectPower > 1, "upgraded utility power reaches the hero effect renderer");
}

// Stronger utility casts get an extra hero-coloured cue without changing the area shown.
{
  const rendered = (id, effectPower) => {
    const spawns = [];
    const kit = {
      TAU: Math.PI * 2,
      rand: (min, max) => (min + max) / 2,
      n: (n) => n,
      spawn: (texture, x, y, options) => spawns.push({ texture, x, y, options }),
      shape: () => {},
    };
    createHeroFx(kit).update({ effects: [{ type: "ult", heroId: id, heroVariant: tuning.heroSkills[id].variant,
      x: 100, y: 100, sourceX: 90, sourceY: 90, range: 100,
      ultimateEffectPower: effectPower }] });
    return spawns;
  };
  for (const id of ["atlas", "asclepius"]) {
    assert.ok(rendered(id, 1.2).length > rendered(id, 1).length,
      `${id}: upgraded utility cast has an extra visible effect`);
  }
}

console.log("Tower defense utility ultimate upgrade checks passed");

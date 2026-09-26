// Expedition (M21): setup, stage options, camp cards and choices, stage outcomes, save
// sanitizing and the sim options it relies on.
import assert from "node:assert/strict";
import { TowerDefenseGame } from "../src/game/td/sim.js";
import { chooseCamp, campOffer, EXPEDITION, finishStage, newExpedition, sanitizeExpedition, stageGameOptions } from "../src/game/td/expedition.js";
import { emptySave, sanitizeSave } from "../src/game/td/page/save.ts";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import waves from "../src/data/tdWaves.json" with { type: "json" };

const data = { heroes, maps, tuning };
const slotOf = new Map(heroes.map((hero) => [hero.id, hero.slot]));

// --- New expedition: deterministic, every map once, a road and a platform hero ---
{
  const a = newExpedition(42, data), b = newExpedition(42, data), c = newExpedition(43, data);
  assert.deepEqual(a, b, "same seed, same expedition");
  assert.notDeepEqual(a.roster, c.roster, "another seed differs");
  assert.deepEqual([...a.stages].sort(), maps.map((m) => m.id).sort(), "every battlefield once");
  for (let seed = 1; seed < 40; seed += 1) {
    const e = newExpedition(seed, data);
    assert.equal(e.roster.length, EXPEDITION.startHeroes);
    assert.ok(e.roster.some((id) => slotOf.get(id) === "road") && e.roster.some((id) => slotOf.get(id) === "platform"), "road and platform hero");
  }
  assert.equal(a.lives, tuning.run.lives, "full lives at the start");
}

// --- Stage options and the sim: roster only, relics, veterans, lives, health scale ---
{
  const e = { ...newExpedition(7, data), stage: 1, relics: ["soul_reaper"], veterans: [], lives: 9 };
  e.veterans = [e.roster[0]];
  const opts = stageGameOptions(e);
  assert.equal(opts.mode, "classic");
  assert.equal(opts.hpScale, EXPEDITION.stageHp[1]);
  const map = maps.find((m) => m.id === e.stages[1]);
  const g = new TowerDefenseGame({ heroes, tuning, map, waves, ...opts });
  const plain = new TowerDefenseGame({ heroes, tuning, map, waves });
  assert.equal(g.lives, 9, "lives carried over");
  assert.deepEqual(g.boons, ["soul_reaper"], "relics active from wave 1");
  assert.ok(Math.abs(g.spawnEnemy("grunt").maxHp / plain.spawnEnemy("grunt").maxHp - EXPEDITION.stageHp[1]) < 1e-9, "stage health scale");
  g.gold = 1e6;
  const outsider = heroes.find((hero) => !e.roster.includes(hero.id));
  assert.equal(g.place(outsider.id, outsider.slot, 0), false, "only the roster can be recruited");
  const vet = heroes.find((hero) => hero.id === e.roster[0]);
  const rings = vet.slot === "road" ? map.roadSlots : map.platformSlots;
  for (let i = 0; i < rings.length && !g.place(vet.id, vet.slot, i); i += 1);
  assert.equal(g.heroes.find((h) => h.id === vet.id).level, EXPEDITION.veteranLevel, "veterans enter at level 2");
}

// --- Camp: one card of each kind, choices apply, recruiting costs lives ---
{
  const e = newExpedition(99, data);
  const cards = campOffer(e, data);
  assert.deepEqual(cards.map((c) => c.type), ["hero", "relic", "veteran"], "a hero, relics and a drill");
  assert.ok(!e.roster.includes(cards[0].id), "a new hero");
  assert.deepEqual(campOffer(e, data), cards, "deterministic camp");
  const withCamp = { ...e, camp: cards };
  const hired = chooseCamp(withCamp, 0);
  assert.equal(hired.roster.length, e.roster.length + 1);
  assert.equal(hired.lives, e.lives - EXPEDITION.recruitLives, "recruiting costs lives");
  assert.equal(hired.camp, null, "camp closed");
  const relics = chooseCamp(withCamp, 1);
  assert.deepEqual(relics.relics, cards[1].ids, "relic pair");
  const drilled = chooseCamp(withCamp, 2);
  assert.deepEqual([...drilled.veterans].sort(), [...e.roster].sort(), "drill: the whole roster");
  assert.equal(chooseCamp(withCamp, 5), withCamp, "unknown card ignored");
  assert.equal(chooseCamp({ ...e, camp: cards, lives: 2 }, 0).lives, 1, "never below one life");
}

// --- Stage outcomes ---
{
  const e = newExpedition(5, data);
  const lost = finishStage(e, { won: false, lives: 0 }, data);
  assert.equal(lost.outcome, "lost");
  assert.equal(lost.state, null);
  const won = finishStage(e, { won: true, lives: 17 }, data);
  assert.equal(won.outcome, "camp");
  assert.equal(won.state.stage, 1);
  assert.equal(won.state.lives, 17, "lives carry over");
  assert.ok(won.state.camp.length > 0, "camp offered");
  const last = finishStage({ ...e, stage: e.stages.length - 1 }, { won: true, lives: 3 }, data);
  assert.equal(last.outcome, "complete");
  assert.equal(last.cleared, e.stages.length);
}

// --- Save: sanitize, drop junk, keep a valid state through the save ---
{
  const rules = { heroIds: new Set(heroes.map((h) => h.id)), mapIds: new Set(maps.map((m) => m.id)), relicIds: new Set(Object.keys(tuning.runBoons.list)) };
  const e = { ...newExpedition(11, data), relics: ["soul_reaper", "bogus"], camp: [{ type: "hero", id: "nope" }, { type: "relic", ids: ["rally"] }] };
  const clean = sanitizeExpedition(e, rules);
  assert.deepEqual(clean.relics, ["soul_reaper"], "unknown relic dropped");
  assert.equal(clean.camp.length, 1, "unknown camp card dropped");
  assert.equal(sanitizeExpedition({ stages: [], roster: [] }, rules), null, "broken state dropped");
  const save = sanitizeSave({ ...emptySave(), expedition: clean, expeditionBest: { stages: 2, completed: 1 } }, rules);
  assert.deepEqual(save.expedition, clean, "state survives a save round trip");
  assert.deepEqual(save.expeditionBest, { stages: 2, completed: 1 });
  const old = sanitizeSave({ bestScore: 0 }, rules);
  assert.equal(old.expedition, null, "old saves have no expedition");
  assert.deepEqual(old.expeditionBest, { stages: 0, completed: 0 });
}

console.log("Tower defense expedition checks passed.");

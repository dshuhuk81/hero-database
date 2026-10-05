// Balance and pacing report (audit step 3). Measures before any tuning, with several seeds
// and both bot policies (td-runner.mjs POLICIES), so a finding that only one play style
// shows is visible as such:
//   1. Stage depth (share of the stage defeated) of the mixed squad without each class, refilled to full size
//      (removal alone measured "playing short-handed", not the class contribution)
//   2. Win rate per map (the map's own timeline)
//   3. Campaign: winning squads and play time per stage
//   4. Divine Seal income (arithmetic from tdSummon.json)
// Run with: npm run td:pacing -- --seeds=3 --sample=35 --only=classes,maps,campaign,seals
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import summonCfg from "../src/data/tdSummon.json" with { type: "json" };
import { allStages, collectionHeroes, finishCampaignStage, heroLevel, levelUp, newCampaignProgress, stageGameOptions } from "../src/game/td/campaign.js";
import { timelineForMap } from "../src/game/td/stage-for-map.js";
import { timelineTotals } from "../src/game/td/timeline.js";
import { CLASSES } from "./lib/td-class-matrix.mjs";
import { maps, playRun, POLICIES, SQUADS } from "./lib/td-runner.mjs";

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const SEEDS = Array.from({ length: Math.max(1, Number(arg("seeds", 3))) }, (_, i) => 99 + i);
const SAMPLE = Number(arg("sample", 35));
const only = new Set(arg("only", "classes,maps,campaign,seals").split(","));
const classOf = Object.fromEntries(heroes.map((h) => [h.id, h.class]));
const mean = (list) => (list.length ? list.reduce((s, x) => s + x, 0) / list.length : 0);
const pct = (x) => `${Math.round(x * 100)}%`;
const pad = (s, n) => String(s).padStart(n);
console.log(`Seeds ${SEEDS.join(", ")} - policies ${POLICIES.join(", ")}`);

if (only.has("classes")) {
  console.log("\n1. Share of the stage defeated, mixed squad without each class (mean over maps x seeds)");
  const squad = SQUADS["balanced (S-tier core)"];
  const depth = (ids, policy) => mean(maps.flatMap((map) => SEEDS.map((seed) => playRun(ids, seed, map, { policy }).defeated / timelineTotals(timelineForMap(map, campaign)).total)));
  console.log("variant".padEnd(28) + POLICIES.map((p) => pad(p, 10)).join(""));
  // Class removal must keep the squad full, or it measures "playing short-handed"
  // instead of the class's contribution (the old "without Mages -17" was mostly that
  // artefact). Each removed hero is replaced by the strongest roster hero of another
  // class not already in the squad (tier, then cost as the strength proxy).
  const tierRank = { S: 0, A: 1, B: 2, C: 3, D: 4 };
  const tierOf = Object.fromEntries(heroes.map((h) => [h.id, h.tier]));
  const costOf = Object.fromEntries(heroes.map((h) => [h.id, h.cost]));
  const refill = (ids, removedCls) => {
    const out = [...ids];
    const candidates = heroes.map((h) => h.id).filter((id) => classOf[id] !== removedCls && !out.includes(id))
      .sort((a, b) => (tierRank[tierOf[a]] ?? 9) - (tierRank[tierOf[b]] ?? 9) || costOf[b] - costOf[a]);
    while (out.length < squad.length && candidates.length) out.push(candidates.shift());
    return out;
  };
  const variants = [["full squad", squad]];
  for (const cls of CLASSES) {
    const removed = squad.filter((id) => classOf[id] === cls);
    if (!removed.length) continue; // class not in the squad: nothing to measure
    variants.push([`without ${cls} (refilled)`, refill(squad.filter((id) => classOf[id] !== cls), cls)]);
  }
  const full = {};
  for (const [label, ids] of variants) {
    const cells = POLICIES.map((policy) => {
      const d = depth(ids, policy);
      if (label === "full squad") full[policy] = d;
      return label === "full squad" ? d.toFixed(1) : `${d.toFixed(1)} (${d - full[policy] >= 0 ? "+" : ""}${(d - full[policy]).toFixed(1)})`;
    });
    console.log(label.padEnd(28) + cells.map((c) => pad(c, 14)).join(""));
  }
}

if (only.has("maps")) {
  console.log("\n2. Win rate per map (5 balance squads x seeds)");
  console.log("map".padEnd(20) + POLICIES.map((p) => pad(p, 14)).join(""));
  const totals = {};
  for (const map of maps) {
    const cells = [];
    for (const policy of POLICIES) {
      const runs = Object.values(SQUADS).flatMap((ids) => SEEDS.map((seed) => playRun(ids, seed, map, { policy })));
      const rate = runs.filter((r) => r.won).length / runs.length;
      const key = policy;
      (totals[key] ??= []).push(rate);
      cells.push(`${pct(rate)} ${Math.round(mean(runs.filter((r) => r.won).map((r) => r.seconds)) / 60)}m`);
    }
    console.log(map.id.padEnd(20) + cells.map((c) => pad(c, 14)).join(""));
  }
  console.log("all maps".padEnd(20) + Object.values(totals).map((rates) => pad(pct(mean(rates)), 14)).join(""));
  console.log("   cells: win rate and mean minutes of a won run");
}

if (only.has("campaign")) {
  console.log(`\n3. Campaign: share of sampled squads (campaign.squadSize heroes) that win (max ${SAMPLE} squads, owned heroes levelled evenly)`);
  const stages = allStages(campaign);
  const cost = Object.fromEntries(heroes.map((h) => [h.id, h.cost]));
  const combos = (list, k) => (k === 0 ? [[]] : list.flatMap((x, i) => combos(list.slice(i + 1), k - 1).map((c) => [x, ...c])));
  const sample = (list, n) => (list.length <= n ? list : Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]));
  const spendEvenly = (progress) => {
    for (;;) {
      const lowest = [...progress.owned].sort((a, b) => heroLevel(progress, a) - heroLevel(progress, b))[0];
      const next = levelUp(campaign, progress, lowest);
      if (!next) return progress;
      progress = next;
    }
  };
  console.log("stage".padEnd(7) + POLICIES.map((p) => pad(`${p} win`, 14) + pad("min", 6) + pad("exp.min", 9)).join("") + "  best/worst class (share of wins)");
  let progress = newCampaignProgress(campaign);
  const chapter = Object.fromEntries(POLICIES.map((p) => [p, { first: 0, expected: 0 }]));
  for (const stage of stages) {
    const leveled = spendEvenly(progress);
    const runHeroes = collectionHeroes(campaign, leveled, heroes);
    const map = maps.find((m) => m.id === stage.mapId);
    const squads = sample(combos(leveled.owned, campaign.squadSize), SAMPLE);
    const cells = [];
    const classWins = {};
    const classRuns = {};
    for (const policy of POLICIES) {
      const runs = squads.map((squad, i) => ({ squad, ...playRun([...squad].sort((a, b) => cost[a] - cost[b]), i + 1, map, { policy, game: stageGameOptions(stage, squad, i + 1, runHeroes) }) }));
      const won = runs.filter((r) => r.won);
      const rate = won.length / runs.length;
      const minutes = mean(won.map((r) => r.seconds)) / 60;
      // expected minutes to a first clear: failed attempts cost their own length
      const lossMinutes = mean(runs.filter((r) => !r.won).map((r) => r.seconds)) / 60;
      const expected = rate ? minutes + ((1 - rate) / rate) * lossMinutes : Infinity;
      chapter[policy].first += minutes;
      chapter[policy].expected += expected;
      cells.push(pad(`${won.length}/${runs.length} ${pct(rate)}`, 14) + pad(minutes.toFixed(1), 6) + pad(expected.toFixed(1), 9));
      for (const r of runs) for (const cls of new Set(r.squad.map((id) => classOf[id]))) {
        classRuns[cls] = (classRuns[cls] ?? 0) + 1;
        if (r.won) classWins[cls] = (classWins[cls] ?? 0) + 1;
      }
    }
    const byClass = Object.keys(classRuns).map((cls) => [cls, (classWins[cls] ?? 0) / classRuns[cls]]).sort((a, b) => b[1] - a[1]);
    const note = byClass.length ? `${byClass[0][0]} ${pct(byClass[0][1])} / ${byClass.at(-1)[0]} ${pct(byClass.at(-1)[1])}` : "";
    console.log(stage.id.padEnd(7) + cells.join("") + "  " + note);
    progress = finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress;
  }
  for (const policy of POLICIES) console.log(`   ${policy}: winning runs ${chapter[policy].first.toFixed(0)} min, expected with retries ${chapter[policy].expected.toFixed(0)} min`);
  console.log("   min: mean length of a won run; exp.min: expected minutes to a first clear with a random sampled squad");
}

if (only.has("seals")) {
  const pull = summonCfg.banners[0].cost.divineSeals;
  const { dailyGoal, expeditionComplete } = summonCfg.sealSources;
  const { perCopy, perSeal } = summonCfg.dust;
  const chapterSeals = allStages(campaign).reduce((sum, stage) => sum + (stage.rewards.find((r) => r.id === "divineSeals")?.amount ?? 0), 0);
  const refund = perCopy / perSeal; // seals back from a copy turned into dust
  console.log(`\n4. Divine Seals: Chapter 1 pays ${chapterSeals} (${(chapterSeals / pull).toFixed(1)} pulls at ${pull}); a spare copy as dust returns ${refund} seals (${pct(refund / pull)} of a pull)`);
  console.log("routine".padEnd(34) + pad("seals/week", 12) + pad("pulls/week", 12) + pad("days/x10", 10));
  for (const [label, perDay] of [["Daily goal only", dailyGoal], ["Daily + 1 Expedition/week", dailyGoal + expeditionComplete / 7], ["Daily + 3 Expeditions/week", dailyGoal + (3 * expeditionComplete) / 7], ["Daily + 1 Expedition/day", dailyGoal + expeditionComplete]]) {
    console.log(label.padEnd(34) + pad(Math.round(perDay * 7), 12) + pad((perDay * 7 / pull).toFixed(1), 12) + pad(Math.ceil((pull * 10) / perDay), 10));
  }
  console.log("   pulls/week before dust; dusting every spare copy stretches that by up to x" + (pull / (pull - refund)).toFixed(2));
}

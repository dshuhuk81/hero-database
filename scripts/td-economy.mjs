// In-run gold ledger (mechanics overview, recommendation 1): plays full runs and
// reports income by source against spend by sink, per mode and tier. This is the
// one table the other sweeps do not print — use it before economy tuning.
// No sim changes: the ledger wraps game instance methods after construction.
//
//   node scripts/td-economy.mjs                       # classic + long + endless, Normal, all squads
//   node scripts/td-economy.mjs -- --mode=classic --tier=heroic --seeds=3
//   node scripts/td-economy.mjs -- --policy=carry --max-wave=30
import { TowerDefenseGame } from "../src/game/td/sim.js";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import waves from "../src/data/tdWaves.json" with { type: "json" };
import { maps, SQUADS, POLICIES } from "./lib/td-runner.mjs";
import { rankedTiles } from "../src/game/td/grid.js";

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
  const [key, value] = a.slice(2).split("=");
  return [key, value ?? true];
}));
const MODES = args.mode ? String(args.mode).split(",") : ["classic", "long", "endless"];
const TIERS = args.tier ? String(args.tier).split(",") : ["normal"];
const SEEDS = Number(args.seeds ?? 1);
const POLICY = args.policy ?? "cheapest";
if (!POLICIES.includes(POLICY)) throw new Error(`Unknown policy ${POLICY}`);
const MAX_WAVE = Number(args["max-wave"] ?? 30); // endless guard; classic/long ignore it
const MAP = maps.find((m) => m.id === args.map) ?? maps[0];

// Play one run with the same bot policy as td-runner, but ledger every gold flow.
function ledgerRun(ids, seed, mode, tier) {
  const g = new TowerDefenseGame({ heroes, tuning, map: MAP, waves, mode, tier, seed });
  if (!g.setTeam(ids)) throw new Error(`Invalid squad: ${ids}`);
  const ledger = {
    start: g.gold,
    kills: 0, quests: 0, clearAndBoons: 0, sellRefunds: 0,
    deploys: 0, levels: 0, awakening: 0, training: 0,
    upgradesBought: 0, heroesDeployed: 0,
  };
  // Income: kill rewards pass through killReward (difficulty/favor already applied).
  const origKillReward = g.killReward.bind(g);
  g.killReward = (reward) => { const paid = origKillReward(reward); ledger.kills += paid; return paid; };
  // Income: quest payouts; clear bonus and boon/fortune gold are the remainder of
  // totalGoldEarned (tracked at the end) — boon gold is small and flagged in output.
  const origCompleteQuest = g.completeQuest.bind(g);
  g.completeQuest = () => { const before = g.gold; origCompleteQuest(); ledger.quests += g.gold - before; };
  // Sink: deploys.
  const origPlace = g.place.bind(g);
  g.place = (...a) => { const before = g.gold; const ok = origPlace(...a); if (ok) { ledger.deploys += before - g.gold; ledger.heroesDeployed += 1; } return ok; };
  // Sink: upgrades, split into levels / awakening / training.
  const origUpgrade = g.upgrade.bind(g);
  g.upgrade = (...a) => {
    const info = origUpgrade(...a);
    if (info?.ok) {
      if (info.awaken) ledger.awakening += info.cost;
      else if (info.train) ledger.training += info.cost;
      else ledger.levels += info.cost;
      ledger.upgradesBought += 1;
    }
    return info;
  };
  // Income: sell refunds.
  const origSell = g.sell.bind(g);
  g.sell = (...a) => { const result = origSell(...a); if (result?.ok) ledger.sellRefunds += result.refund; return result; };

  const STALL = 60 * 120;
  while (!g.complete && g.wave < (mode === "endless" ? MAX_WAVE : Infinity)) {
    if (!g.running) {
      for (const id of ids) {
        if (g.heroes.some((h) => h.id === id)) continue;
        const base = g.heroesById.get(id);
        if (g.gold < g.deployCost(id)) continue;
        for (const i of rankedTiles(MAP, base.slot, g.rangeFor(base))) {
          if (g.place(id, base.slot, i)) break;
        }
      }
      for (let guard = 0; guard < 20; guard += 1) {
        const options = g.heroes.map((h) => g.upgradeInfo(h.entityId)).filter((i) => i.ok);
        if (!options.length) break;
        if (POLICY === "carry") options.sort((a, b) => b.hero.atk - a.hero.atk || a.cost - b.cost);
        else options.sort((a, b) => a.cost - b.cost);
        const pick = options[0];
        g.upgrade(pick.hero.entityId, pick.needsPath ? pick.pathOptions?.[0] : (pick.hero.slotType === "road" ? "health" : "attack"));
      }
      if (g.virtueOffer) g.chooseVirtue(g.virtueOffer[0]);
      if (g.mutatorOffer) g.skipMutators();
      if (!g.startWave()) break;
    }
    let quiet = 0; let progress = -1; let stalled = false;
    while (g.running && !g.complete) {
      g.step(1 / 60);
      const now = g.totalLeaks + Object.values(g.heroKills).reduce((sum, h) => sum + h.kills, 0);
      quiet = now === progress ? quiet + 1 : 0;
      progress = now;
      if (quiet >= STALL) { stalled = true; break; }
    }
    if (stalled) break;
  }
  // Remainder of tracked income: wave-clear bonuses plus boon/fortune trickle.
  ledger.clearAndBoons = g.totalGoldEarned - ledger.kills - ledger.quests;
  ledger.spentTotal = ledger.deploys + ledger.levels + ledger.awakening + ledger.training;
  ledger.leftover = g.gold;
  return { won: g.won, wave: g.wave, seconds: Math.round(g.time), ...ledger };
}

const avg = (rows, key) => Math.round(rows.reduce((s, r) => s + r[key], 0) / rows.length);

for (const tier of TIERS) {
  for (const mode of MODES) {
    const rows = [];
    for (const ids of Object.values(SQUADS)) {
      for (let seed = 1; seed <= SEEDS; seed += 1) rows.push(ledgerRun(ids, seed * 99, mode, tier));
    }
    const wins = rows.filter((r) => r.won).length;
    const income = avg(rows, "start") + avg(rows, "kills") + avg(rows, "quests") + avg(rows, "clearAndBoons") + avg(rows, "sellRefunds");
    console.log(`\n=== ${mode} / ${tier} — ${rows.length} runs (${wins} won), map ${MAP.id}, policy ${POLICY} ===`);
    console.log("INCOME".padEnd(28), "avg gold", "share");
    const line = (label, value) => console.log(label.padEnd(28), String(value).padStart(8), `${Math.round((value / income) * 100)}%`);
    line("starting gold", avg(rows, "start"));
    line("kill rewards", avg(rows, "kills"));
    line("wave clear + boons*", avg(rows, "clearAndBoons"));
    line("quests", avg(rows, "quests"));
    line("sell refunds", avg(rows, "sellRefunds"));
    console.log("total income".padEnd(28), String(income).padStart(8));
    console.log("SPEND".padEnd(28), "avg gold", "share");
    const sline = (label, value) => console.log(label.padEnd(28), String(value).padStart(8), `${Math.round((value / Math.max(1, avg(rows, "spentTotal"))) * 100)}%`);
    sline("deploys", avg(rows, "deploys"));
    sline("levels 2-4", avg(rows, "levels"));
    sline("awakening", avg(rows, "awakening"));
    sline("training", avg(rows, "training"));
    console.log("total spent".padEnd(28), String(avg(rows, "spentTotal")).padStart(8));
    console.log("leftover at run end".padEnd(28), String(avg(rows, "leftover")).padStart(8));
    console.log("upgrades bought / run".padEnd(28), String(avg(rows, "upgradesBought")).padStart(8));
    console.log("heroes deployed / run".padEnd(28), String(avg(rows, "heroesDeployed")).padStart(8));
    console.log("avg wave reached".padEnd(28), String(avg(rows, "wave")).padStart(8));
  }
}
console.log("\n* clear + boons also includes Soul Reaper and awakened Fortune Shower payouts (small).");

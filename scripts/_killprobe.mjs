import { TowerDefenseGame } from "../src/game/td/sim.js";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import waves from "../src/data/tdWaves.json" with { type: "json" };
import { SQUADS } from "./lib/td-runner.mjs";
const rows = [];
for (const map of maps) for (const ids of Object.values(SQUADS)) for (const seed of [1,2,3,4,5,6]) {
  const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed });
  g.setTeam(ids);
  const slotCount = { road: map.roadSlots.length, platform: map.platformSlots.length };
  while (!g.complete) {
    if (!g.running) {
      for (const id of ids) { if (g.heroes.some((h) => h.id === id)) continue; const b = g.heroesById.get(id); if (g.gold < g.deployCost(id)) continue;
        for (let i = 0; i < slotCount[b.slot]; i++) if (g.place(id, b.slot, i)) break; }
      for (let k = 0; k < 20; k++) { const o = g.heroes.map((h) => g.upgradeInfo(h.entityId)).filter((i) => i.ok); if (!o.length) break; o.sort((a,b)=>a.cost-b.cost); g.upgrade(o[0].hero.entityId); }
      if (g.virtueOffer) g.chooseVirtue(g.virtueOffer[0]);
      const before = Object.fromEntries(Object.entries(g.heroKills).map(([k,v]) => [k, v.kills]));
      const team = g.heroes.map((h) => ({ e: h.entityId, id: h.id, slot: h.slotType }));
      if (!g.startWave()) break;
      const total = waves[g.wave-1].spawns.reduce((s,x)=>s+x.count,0);
      for (let i = 0; i < 60*120 && g.running && !g.complete; i++) g.step(1/60);
      for (const t of team) rows.push({ wave: g.wave, total, n: team.length, id: t.id, slot: t.slot, kills: (g.heroKills[t.e]?.kills ?? 0) - (before[t.e] ?? 0) });
    }
  }
}
// ratio kills / fair share (total/n)
const r = rows.map((x) => x.kills / (x.total / x.n)).sort((a,b)=>a-b);
const q = (p) => r[Math.floor(p * (r.length - 1))].toFixed(2);
console.log("samples", r.length, "quantiles 10/25/40/50/60/75/90:", [.1,.25,.4,.5,.6,.75,.9].map(q).join(" "));
for (const f of [0.5,0.6,0.7,0.8,1.0]) console.log("factor", f, "success", (r.filter((v)=>v>=f).length/r.length*100).toFixed(0)+"%");
const zero = rows.filter((x)=>x.kills===0); console.log("zero-kill heroes:", [...new Set(zero.map(z=>z.id))].join(","), zero.length);
const by = {}; for (const x of rows) { (by[x.id] ??= []).push(x.kills/(x.total/x.n)); }
console.log(Object.entries(by).map(([k,v])=>`${k}:${(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2)}`).join(" "));
const tot = [...new Set(rows.map(x=>x.wave+":"+x.total))].join(" "); console.log("wave:total", tot);

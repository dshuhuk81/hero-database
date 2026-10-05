// Tower defense hero balance (src/data/gameBalance.json).
//
// Stable baselines (audit step 4): stats come from percentile ranks, so ranking against the
// whole roster made every new hero shift everyone else. Ranks are now taken against a fixed
// reference set, `tuning.balanceReference`:
//   - reference heroes are ranked among themselves (class-kit edits still rebuild them);
//   - any other roster hero from the database is ranked *against* the reference, one at a
//     time, so adding a hero never changes an existing row;
//   - roster ids with no database entry (the recruits) are hand-authored rows, kept as-is.
// TD ids are the mythic names (odin, atlas, ...); `tuning.statSource` names the database hero
// whose stats seed each generated row. Row names come from the mythic skin (tdSkinMythic.json).
// `rarity` is kept from the file, or derived from tier for a new hero.
//
//   npm run build:game-balance                 rewrite gameBalance.json
//   npm run build:game-balance -- --check      fail when the file is stale (tests)
//   npm run build:game-balance -- --propose=id print the row a new database hero would get
//                                              (id = database id; ship it under a new TD id in
//                                              tuning.roster and tuning.statSource)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import heroes from "../src/data/all_heroes_db.json" with { type: "json" };
import mythic from "../src/data/tdSkinMythic.json" with { type: "json" };
import ratings from "../src/data/ratings/hero-ratings.json" with { type: "json" };
import { calculateOverall } from "../src/data/ratings/ratingSystem.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(here, "../src/data/gameBalance.json");
const current = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, "utf8")) : [];
const currentById = new Map(current.map((row) => [row.id, row]));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const lerp = (a, b, t) => a + (b - a) * t;
const round5 = (n) => Math.round(n / 5) * 5;
const TIER_RARITY = { S: "legendary", A: "legendary", B: "epic", C: "epic", D: "common" };
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

// Database hero for TD id `id` (tuning.statSource), carrying the TD id and mythic name.
const source = (id, dbId = tuning.statSource?.[id]) => {
  const hero = heroes[dbId];
  if (!hero) throw new Error(`Missing tower-defense hero: ${id} (database ${dbId})`);
  if (!hero.stats || !hero.baseAttackRate || !hero.bossUltimatesPer90s) throw new Error(`Incomplete tower-defense hero: ${id}`);
  // TD-only class swaps (tuning.classOverrides); the database keeps the real game's class.
  const override = tuning.classOverrides?.[id];
  return { ...hero, id, dbId, name: mythic.heroes[id]?.name ?? hero.name, class: override ?? hero.class };
};
const reference = (tuning.balanceReference ?? []).map((id) => source(id));
if (reference.length < 2) throw new Error(`tuning.balanceReference too small: ${reference.length}`);

// Rank of `value` within `pool` (ties share the lowest index), 0..1.
const rankIn = (pool, value) => [...pool].sort((a, b) => a - b).findIndex((entry) => entry === value) / (pool.length - 1);
const rawDpsOf = (h) => h.stats.atk * h.baseAttackRate;
const mitigation = (res) => res / (res + 260);

// Row before pricing for database hero `h`, its values ranked in `group` (reference heroes,
// plus `h` when it is not one of them).
function basicRow(h, group) {
  const rank = (get) => rankIn(group.map(get), get(h));
  const aps = clamp(h.baseAttackRate, 0.5, 2.2);
  const dps = lerp(18, 55, rank(rawDpsOf));
  const tier = calculateOverall(ratings[h.dbId]).tier ?? "C";
  const classTuning = tuning.classes[h.class];
  if (!classTuning) throw new Error(`No class tuning for ${h.class}`);
  const rawType = String(h.skills?.[0]?.damageType ?? "").toLowerCase();
  const damageType = rawType === "magic" || rawType === "magical" ? "magical" : rawType === "true" ? "true" : "physical";
  return {
    id: h.id, name: h.name, class: h.class, tier, slot: classTuning.slot,
    range: classTuning.range, ability: classTuning.ability, damageType,
    image: "",
    atk: Math.round(dps / aps), aps: Math.round(aps * 100) / 100, dps: Math.round(dps),
    hp: Math.round(lerp(340, 880, rank((x) => x.stats.hp))), armor: Math.round(lerp(30, 230, rank((x) => x.stats.armor))),
    magicRes: Math.round(lerp(30, 230, rank((x) => x.stats.magicRes))), critChance: h.stats.critRate / 100,
    ultCooldown: Math.round((90 / h.bossUltimatesPer90s) * 10) / 10, ultPower: tuning.tierUltPower[tier] ?? 1,
    synergies: Array.isArray(h.synergies) ? h.synergies : [],
  };
}

// Full row for database hero `h` ranked in `group` (see basicRow).
function buildRow(h, group) {
  const rows = new Map(group.map((x) => [x.id, basicRow(x, group)]));
  const row = rows.get(h.id);
  const all = [...rows.values()];
  // Effective damage for pricing: class kits (tuning.classes valueDps) scale single-target
  // DPS by what the kit adds, e.g. Mage splash or Warrior cleave hitting several enemies.
  const byId = new Map(group.map((x) => [x.id, x]));
  const effDps = (r) => rawDpsOf(byId.get(r.id)) * (tuning.classes[r.class].valueDps ?? 1);
  const ehp = (r) => r.hp / (1 - (mitigation(r.armor) + mitigation(r.magicRes)) / 2);
  const ult = (r) => (90 / r.ultCooldown) * r.ultPower;
  const value = (r) => {
    const rank = (get) => rankIn(all.map(get), get(r));
    return r.slot === "road"
      ? 0.3 * rank(effDps) + 0.5 * rank(ehp) + 0.2 * rank(ult)
      : 0.65 * rank(effDps) + 0.1 * rank(ehp) + 0.25 * rank(ult);
  };
  // Cost is ranked within the slot type.
  const slotValues = all.filter((r) => r.slot === row.slot).map(value);
  // Placement points (11-25). A cost already in gameBalance.json wins: those are tuned by hand.
  row.cost = currentById.get(row.id)?.cost ?? Math.round(lerp(11, 25, rankIn(slotValues, value(row))));
  // Class kits apply after pricing, so they shift a whole class without re-ranking costs:
  // durability (hpMult/armorMult), attack rhythm (apsMult keeps DPS, so fewer but heavier
  // hits; maxAps caps it), class damage (dpsMult), damage type and crit.
  const { hpMult = 1, armorMult = 1, apsMult = 1, maxAps = 2.2, dpsMult = 1, damageType, crit = 0 } = tuning.classes[row.class];
  row.hp = Math.round(row.hp * hpMult);
  row.armor = Math.round(row.armor * armorMult);
  const dps = row.dps * dpsMult;
  row.aps = Math.round(clamp(row.aps * apsMult, 0.3, maxAps) * 100) / 100;
  row.atk = Math.round(dps / row.aps);
  row.dps = Math.round(dps);
  if (damageType) row.damageType = damageType;
  if (crit) row.critChance = Math.round((row.critChance + crit) * 100) / 100;
  // Display scale (tuning.heroStatScale): applied after pricing and class kits, so ranks, costs and
  // DPS ratios stay as they were. Armor and magic resistance are not scaled: the damage formula
  // (sim.js K) works on their absolute size.
  const scale = tuning.heroStatScale ?? 1;
  row.atk = Math.round(row.atk * scale);
  row.dps = Math.round(row.dps * scale);
  row.hp = Math.round(row.hp * scale);
  row.rarity = currentById.get(row.id)?.rarity ?? TIER_RARITY[String(row.tier)[0]] ?? "epic";
  return row;
}

const referenceIds = new Set(reference.map((h) => h.id));
const rowFor = (id, dbId) => (referenceIds.has(id) ? buildRow(source(id, dbId), reference) : buildRow(source(id, dbId), [...reference, source(id, dbId)]));

const proposed = arg("propose");
if (proposed) {
  const row = rowFor(proposed, proposed);
  console.log(JSON.stringify(row, null, 2));
  const peers = current.filter((r) => r.class === row.class && r.slot === row.slot).map((r) => `${r.id} ${r.cost}p atk ${r.atk} hp ${r.hp}`);
  console.log(`\n${row.class} peers today: ${peers.join(", ")}\nNo existing row changes. To ship it, pick a TD id, add it to tuning.roster and tuning.statSource ("<id>": "${proposed}"), give it a tdSkinMythic.json entry and run npm run build:game-balance.`);
  process.exit(0);
}

const generated = [];
const authored = [];
for (const id of tuning.roster) {
  if (tuning.statSource?.[id]) generated.push(rowFor(id));
  else if (currentById.has(id)) authored.push(currentById.get(id));
  else throw new Error(`Roster id ${id} has no database entry and no authored row in gameBalance.json`);
}
generated.sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name));
const output = [...generated, ...authored];
const json = `${JSON.stringify(output, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (fs.readFileSync(outputPath, "utf8") !== json) throw new Error("gameBalance.json is stale; run npm run build:game-balance");
} else {
  fs.writeFileSync(outputPath, json);
}
console.log(`Tower defense balance: ${output.length} heroes (${generated.length} generated against ${reference.length} reference heroes, ${authored.length} authored), ${Math.min(...output.map((h) => h.cost))}-${Math.max(...output.map((h) => h.cost))} placement`);

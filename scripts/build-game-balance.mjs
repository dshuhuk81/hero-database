import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import heroes from "../src/data/all_heroes_db.json" with { type: "json" };
import ratings from "../src/data/ratings/hero-ratings.json" with { type: "json" };
import { calculateOverall } from "../src/data/ratings/ratingSystem.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(here, "../src/data/gameBalance.json");
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const lerp = (a, b, t) => a + (b - a) * t;
const round5 = (n) => Math.round(n / 5) * 5;
const roster = tuning.roster.map((id) => {
  const hero = heroes[id];
  if (!hero) throw new Error(`Missing tower-defense hero: ${id}`);
  if (!hero.stats || !hero.baseAttackRate || !hero.bossUltimatesPer90s) throw new Error(`Incomplete tower-defense hero: ${id}`);
  return hero;
});
if (roster.length < 2) throw new Error(`Roster too small: ${roster.length}`);

function ranks(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((value) => sorted.findIndex((entry) => entry === value) / (values.length - 1));
}

const rawDps = roster.map((h) => h.stats.atk * h.baseAttackRate);
const hpRank = ranks(roster.map((h) => h.stats.hp));
const armorRank = ranks(roster.map((h) => h.stats.armor));
const resistRank = ranks(roster.map((h) => h.stats.magicRes));
const dpsRank = ranks(rawDps);
const basics = roster.map((h, i) => {
  const aps = clamp(h.baseAttackRate, 0.5, 2.2);
  const dps = lerp(18, 55, dpsRank[i]);
  const tier = calculateOverall(ratings[h.id]).tier ?? "C";
  const classTuning = tuning.classes[h.class];
  if (!classTuning) throw new Error(`No class tuning for ${h.class}`);
  const rawType = String(h.skills?.[0]?.damageType ?? "").toLowerCase();
  const damageType = rawType === "magic" || rawType === "magical" ? "magical" : rawType === "true" ? "true" : "physical";
  return {
    id: h.id, name: h.name, class: h.class, tier, slot: classTuning.slot,
    range: classTuning.range, ability: classTuning.ability, damageType,
    image: `https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev/heroes/thumbs/${h.id}-96.webp`,
    atk: Math.round(dps / aps), aps: Math.round(aps * 100) / 100, dps: Math.round(dps),
    hp: Math.round(lerp(340, 880, hpRank[i])), armor: Math.round(lerp(30, 230, armorRank[i])),
    magicRes: Math.round(lerp(30, 230, resistRank[i])), critChance: h.stats.critRate / 100,
    ultCooldown: Math.round((90 / h.bossUltimatesPer90s) * 10) / 10, ultPower: tuning.tierUltPower[tier] ?? 1,
    synergies: Array.isArray(h.synergies) ? h.synergies : [],
  };
});

const mitigation = (res) => res / (res + 260);
const ehpRank = ranks(basics.map((h) => h.hp / (1 - (mitigation(h.armor) + mitigation(h.magicRes)) / 2)));
const ultRank = ranks(basics.map((h) => (90 / h.ultCooldown) * h.ultPower));
for (let i = 0; i < basics.length; i += 1) {
  const h = basics[i];
  h._value = h.slot === "road"
    ? 0.3 * dpsRank[i] + 0.5 * ehpRank[i] + 0.2 * ultRank[i]
    : 0.65 * dpsRank[i] + 0.1 * ehpRank[i] + 0.25 * ultRank[i];
}
for (const slot of ["road", "platform"]) {
  const group = basics.filter((h) => h.slot === slot);
  const groupRanks = ranks(group.map((h) => h._value));
  group.forEach((hero, index) => { hero.cost = round5(lerp(85, 150, groupRanks[index])); });
}
// Class durability (tuning.classes hpMult/armorMult) is applied after pricing, so it
// shifts a whole class without re-ranking costs.
for (const h of basics) {
  const { hpMult = 1, armorMult = 1 } = tuning.classes[h.class];
  h.hp = Math.round(h.hp * hpMult);
  h.armor = Math.round(h.armor * armorMult);
}
const output = basics.map(({ _value, ...hero }) => hero).sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name));
const json = `${JSON.stringify(output, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== json) throw new Error("gameBalance.json is stale; run npm run build:game-balance");
} else {
  fs.writeFileSync(outputPath, json);
}
console.log(`Tower defense balance: ${output.length} heroes, ${Math.min(...output.map((h) => h.cost))}-${Math.max(...output.map((h) => h.cost))} gold`);

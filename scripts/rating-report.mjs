import heroRatings from "../src/data/ratings/hero-ratings.json" with { type: "json" };
import { calculateOverall } from "../src/data/ratings/ratingSystem.js";

const rows = Object.entries(heroRatings)
  .map(([id, ratings]) => ({ id, name: ratings.name || id, ratings, ...calculateOverall(ratings) }))
  .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name));

console.log("| Hero | PvE E | PvE M | PvE L | PvP E | PvP M | PvP L | Score | Base | Adj. | Overall | Coverage |");
console.log("| --- | :---: | :---: | :---: | :---: | :---: | :---: | ---: | :---: | ---: | :---: | :---: |");
for (const row of rows) {
  const score = row.score === null ? "—" : row.score.toFixed(2);
  const coverage = row.complete ? "Complete" : `${row.ratedFields}/${row.totalFields}`;
  const rating = (key) => row.ratings[key] || "—";
  console.log(`| ${row.name} | ${rating("pveearly")} | ${rating("pvemidgame")} | ${rating("pveendgame")} | ${rating("pvpearly")} | ${rating("pvpmidgame")} | ${rating("pvpendgame")} | ${score} | ${row.baseTier ?? "—"} | ${row.adjustment} | ${row.tier ?? "—"} | ${coverage} |`);
  if (row.adjustment) console.log(`| ↳ ${row.reason} |  |  |  |  |  |  |  |  |  |  |  |`);
}

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import groups from "../src/data/tdMythologyGroups.json" with { type: "json" };
import skin from "../src/data/tdSkinMythic.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { groupsOf, hasMythologyGroup, heroesInMythologyGroup } from "../src/game/td/mythology-groups.js";

const EXPECTED = {
  greek: ["atlas", "gaia", "helios", "hecate", "thanatos", "hephaestus", "boreas", "atalanta", "stheno", "plutus", "harmonia", "asclepius"],
  norse: ["ymir", "heimdall", "aegir", "surtr", "fenrir", "nott", "vidar", "odin", "skadi"],
  egyptian: ["isis"],
  "elder-powers": ["atlas", "ymir", "gaia", "helios", "surtr", "nott"],
  underworld: ["hecate", "thanatos", "isis"],
  wildborn: ["aegir", "fenrir", "boreas", "skadi", "atalanta", "stheno"],
  "divine-guardians": ["heimdall", "vidar", "harmonia", "asclepius"],
};
const namedIds = Object.keys(skin.heroes).filter((id) => !id.startsWith("recruit-"));

assert.equal(namedIds.length, 22, "the authored mythological roster has 22 named heroes");
assert.deepEqual(Object.keys(groups).sort(), Object.keys(EXPECTED).sort(), "catalog contains exactly the approved active groups");
for (const [id, group] of Object.entries(groups)) {
  assert.equal(group.id, id, `${id}: record repeats its stable id`);
  assert.equal(typeof group.name, "string", `${id}: display name`);
  assert.match(group.icon, /^\/td\/icons\/mythology\/[a-z-]+-v1\.webp$/, `${id}: versioned project icon path`);
  assert.match(group.color, /^#[0-9a-f]{6}$/i, `${id}: display color`);
}
assert.equal(groups.egyptian.lordHeroId, "isis", "Isis leads the Egyptian group");
for (const [id, group] of Object.entries(groups)) if (id !== "egyptian") {
  assert.equal(group.lordHeroId ?? null, null, `${id}: no Lord is invented`);
}
assert.equal(new Set(Object.values(groups).map((group) => group.icon)).size, 7, "every group has a distinct icon path");
for (const [id, group] of Object.entries(groups)) {
  const path = fileURLToPath(new URL(`../public${group.icon}`, import.meta.url));
  assert.ok(existsSync(path), `${id}: icon file exists`);
  const image = sharp(path).ensureAlpha();
  const meta = await image.metadata();
  assert.deepEqual([meta.width, meta.height, meta.format, meta.hasAlpha], [128, 128, "webp", true], `${id}: 128px transparent WebP`);
  const stats = await image.stats();
  assert.ok(stats.channels[3].min < 255, `${id}: icon preserves transparent pixels`);
  const visible = await image.clone().trim({ threshold: 1 }).metadata();
  assert.ok((visible.width ?? 0) > 1 && (visible.height ?? 0) > 1, `${id}: icon has visible content`);
}

for (const id of namedIds) {
  const memberships = skin.heroes[id].mythologyGroups;
  assert.ok(Array.isArray(memberships) && memberships.length >= 1 && memberships.length <= 2, `${id}: one or two mythology groups`);
  assert.equal(new Set(memberships).size, memberships.length, `${id}: memberships are unique`);
  for (const groupId of memberships) assert.ok(groups[groupId], `${id}: ${groupId} exists in the catalog`);
}
for (const [id, hero] of Object.entries(skin.heroes).filter(([id]) => id.startsWith("recruit-"))) {
  assert.deepEqual(hero.mythologyGroups ?? [], [], `${id}: ordinary recruit stays group-less`);
}
for (const [groupId, expected] of Object.entries(EXPECTED)) {
  const actual = namedIds.filter((id) => skin.heroes[id].mythologyGroups.includes(groupId));
  assert.deepEqual(actual.sort(), [...expected].sort(), `${groupId}: approved members`);
}

const runtime = new Map(heroes.map((hero) => [hero.id, hero]));
for (const id of namedIds) assert.deepEqual(runtime.get(id)?.mythologyGroups, skin.heroes[id].mythologyGroups, `${id}: runtime membership matches authored identity`);
for (const hero of heroes.filter((entry) => entry.id.startsWith("recruit-"))) assert.deepEqual(hero.mythologyGroups, [], `${hero.id}: runtime recruit is group-less`);
assert.deepEqual(groupsOf(null), [], "missing hero has no groups");
assert.deepEqual(groupsOf({ mythologyGroups: "norse" }), [], "malformed membership is ignored");
assert.equal(hasMythologyGroup(runtime.get("skadi"), "norse"), true, "membership helper finds primary group");
assert.equal(hasMythologyGroup(runtime.get("skadi"), "wildborn"), true, "membership helper finds second group");
assert.equal(hasMythologyGroup(runtime.get("skadi"), "greek"), false, "membership helper rejects unrelated group");
assert.deepEqual(heroesInMythologyGroup(heroes, "egyptian").map((hero) => hero.id), ["isis"], "group query uses runtime identities");
assert.equal(tuning.lords.isis.groupId, "egyptian", "Isis Lord tuning references the stable group id");

console.log("Tower defense mythology group checks passed");

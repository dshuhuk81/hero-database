import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { entriesByGroup, navGroupOrder } from "../src/data/navGroups.js";

const entry = (href, group) => ({ href, group });

test("groups come in the fixed order and keep the entry order within a group", () => {
  const entries = [entry("/tips", "learn"), entry("/heroes", "heroes"), entry("/", "home"), entry("/hero-stats", "heroes"), entry("/summon-calculator", "tools")];
  const result = entriesByGroup(entries).map((g) => [g.group, g.entries.map((e) => e.href)]);
  assert.deepEqual(result, [["home", ["/"]], ["heroes", ["/heroes", "/hero-stats"]], ["tools", ["/summon-calculator"]], ["learn", ["/tips"]]]);
});

test("empty groups are left out", () => {
  assert.deepEqual(entriesByGroup([entry("/about", "meta")]).map((g) => g.group), ["meta"]);
});

test("an unknown group is an error instead of a silently dropped entry", () => {
  assert.throws(() => entriesByGroup([entry("/x", "misc")]), /misc/);
});

test("the group order is the one in the spec", () => {
  assert.deepEqual(navGroupOrder, ["home", "heroes", "whatson", "tools", "learn", "meta"]);
});

test("every group used in nav.ts is a known group", () => {
  const source = readFileSync(new URL("../src/data/nav.ts", import.meta.url), "utf-8");
  const used = [...source.matchAll(/^\s*group: "([a-z]+)",/gm)].map((m) => m[1]);
  assert.ok(used.length >= 15, `expected nav entries, found ${used.length}`);
  for (const group of used) assert.ok(navGroupOrder.includes(group), `unknown group "${group}" in nav.ts`);
});

test("banners and events are in the navigation, the old roadmap is not", () => {
  const source = readFileSync(new URL("../src/data/nav.ts", import.meta.url), "utf-8");
  assert.ok(/href: "\/banners"/.test(source), "expected a /banners entry");
  assert.ok(/href: "\/events"/.test(source), "expected an /events entry");
  assert.ok(!/href: "\/summon-calendar"/.test(source), "the roadmap entry was replaced by /banners");
});

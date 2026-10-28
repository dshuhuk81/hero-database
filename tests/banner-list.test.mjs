import test from "node:test";
import assert from "node:assert/strict";
import { bannerStatus, filterBanners, groupByMonth, splitBanners } from "../src/data/bannerList.js";

const TODAY = "2026-10-28";
const b = (id, start, end, over = {}) => ({ id, start, end, kind: "new", heroName: `Hero${id}`, ...over });

test("the end day still counts as running, the day after as ended", () => {
  assert.equal(bannerStatus("2026-10-14", "2026-10-28", TODAY), "running");
  assert.equal(bannerStatus("2026-10-14", "2026-10-27", TODAY), "ended");
});

test("a banner starting tomorrow is upcoming; an undated end runs from its start", () => {
  assert.equal(bannerStatus("2026-10-29", "2026-11-12", TODAY), "upcoming");
  assert.equal(bannerStatus("2026-10-01", null, TODAY), "running");
  assert.equal(bannerStatus(null, null, TODAY), "upcoming");
});

test("split: current = running by end, then upcoming by start, undated last; history newest first", () => {
  const list = [
    b(1, "2026-09-16", "2026-09-29"),
    b(2, "2026-10-14", "2026-10-28"),
    b(3, "2026-11-13", "2026-11-26"),
    b(4, "2026-10-28", "2026-11-12"),
    b(5, null, null, { estimated: true }),
    b(6, "2026-09-02", "2026-09-15"),
  ];
  const { current, history } = splitBanners(list, TODAY);
  assert.deepEqual(current.map((x) => x.id), [2, 4, 3, 5]);
  assert.deepEqual(history.map((x) => x.id), [1, 6]);
});

test("groupByMonth keeps order and groups by start month", () => {
  const groups = groupByMonth([b(1, "2026-09-16", "2026-09-29"), b(2, "2026-09-02", "2026-09-15"), b(3, "2026-08-19", "2026-09-01")]);
  assert.deepEqual(groups.map((g) => [g.month, g.items.map((x) => x.id)]), [["2026-09", [1, 2]], ["2026-08", [3]]]);
});

test("filter by kind, status and case-insensitive hero name", () => {
  const list = [b(1, "2026-10-14", "2026-10-28", { heroName: "Yaoji" }), b(2, "2026-10-28", "2026-11-03", { kind: "rerun", heroName: undefined }), b(3, "2026-11-13", "2026-11-26", { heroName: "Ananke" })];
  assert.deepEqual(filterBanners(list, { kind: "rerun" }, TODAY).map((x) => x.id), [2]);
  assert.deepEqual(filterBanners(list, { status: "upcoming" }, TODAY).map((x) => x.id), [3]);
  assert.deepEqual(filterBanners(list, { query: "yAo" }, TODAY).map((x) => x.id), [1]);
});

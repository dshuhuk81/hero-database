import test from "node:test";
import assert from "node:assert/strict";
import { dayProgress, pickRightNow, recentReleases } from "../src/data/homeRightNow.js";

const TODAY = "2026-10-28";
const item = (id, start, end, category = "events", extra = {}) => ({ id, label: `e${id}`, start, end, category, ...extra });
const banner = (id, start, end, kind = "new") => ({ id, start, end, kind, heroName: `H${id}` });

test("progress counts both the first and the last day", () => {
  assert.deepEqual(dayProgress("2026-10-28", "2026-11-12", TODAY), { total: 16, elapsed: 1, left: 15, pct: 6 });
  assert.deepEqual(dayProgress("2026-10-14", "2026-10-28", TODAY), { total: 15, elapsed: 15, left: 0, pct: 100 });
});

test("progress is clamped for dates outside the event", () => {
  assert.equal(dayProgress("2026-11-01", "2026-11-05", TODAY).elapsed, 0);
  assert.equal(dayProgress("2026-10-01", "2026-10-10", TODAY).pct, 100);
});

test("featured is the running new banner, next is the earliest upcoming new banner", () => {
  const banners = [banner("a", "2026-10-14", "2026-10-27"), banner("b", "2026-10-28", "2026-11-12"), banner("c", "2026-11-13", "2026-11-26"), banner("r", "2026-10-28", "2026-11-03", "rerun")];
  const { featured, nextBanner } = pickRightNow([], banners, TODAY);
  assert.equal(featured.id, "b");
  assert.equal(nextBanner.id, "c");
});

test("a banner ending today is still featured; with none running featured is null", () => {
  assert.equal(pickRightNow([], [banner("a", "2026-10-14", "2026-10-28")], TODAY).featured.id, "a");
  assert.equal(pickRightNow([], [banner("a", "2026-10-01", "2026-10-10"), banner("c", "2026-11-13", "2026-11-26")], TODAY).featured, null);
});

test("an announced hero without a banner (no end date) is never the next or the featured banner", () => {
  const banners = [banner("est", "2026-10-20", null), banner("c", "2026-11-13", "2026-11-26"), banner("e2", "2026-11-02", null)];
  const { featured, nextBanner } = pickRightNow([], banners, TODAY);
  assert.equal(featured, null);
  assert.equal(nextBanner.id, "c");
});

test("offers only fill up the running list when fewer than four other items run", () => {
  const items = [item(1, "2026-10-20", "2026-11-10"), item(2, "2026-10-20", "2026-11-03", "offers"), item(3, "2026-10-20", "2026-12-01", "offers"), item(4, "2026-10-20", "2026-10-30", "offers")];
  const { running } = pickRightNow(items, [], TODAY, { minRunning: 3 });
  assert.deepEqual(running.map((i) => i.id), [1, 4, 2]);
  assert.deepEqual(pickRightNow(items, [], TODAY, { minRunning: 1 }).running.map((i) => i.id), [1]);
});

test("running items end soonest first, offers are left out and the limit reports the rest", () => {
  const items = [
    item(1, "2026-10-20", "2026-11-10"),
    item(2, "2026-10-20", "2026-10-30"),
    item(3, "2026-10-20", "2026-10-29", "offers"),
    item(4, "2026-10-28", "2026-10-28", "leaderboards"),
    item(5, "2026-10-01", "2026-12-01", "recurring"),
  ];
  const { running, moreRunning } = pickRightNow(items, [], TODAY, { runningLimit: 3, minRunning: 4 });
  assert.deepEqual(running.map((i) => i.id), [4, 2, 1]);
  assert.equal(moreRunning, 1);
});

test("coming items start soonest first, exclude offers and the already shown next banner", () => {
  const items = [item(1, "2026-11-04", "2026-11-10"), item(2, "2026-10-30", "2026-11-03"), item(3, "2026-10-29", "2026-10-30", "offers"), item(4, "2026-11-13", "2026-11-26", "banners", { bannerId: "c" })];
  const banners = [banner("c", "2026-11-13", "2026-11-26")];
  const { coming } = pickRightNow(items, banners, TODAY, { comingLimit: 5 });
  assert.deepEqual(coming.map((i) => i.id), [2, 1]);
});

test("recent releases: newest first, future dates and undated are left out, limit applies", () => {
  const entries = [{ id: "a", date: "2026-09-02" }, { id: "b", date: "2026-10-14" }, { id: "c", date: "2026-11-02" }, { id: "d", date: null }, { id: "e", date: "2026-10-28" }];
  assert.deepEqual(recentReleases(entries, TODAY, 2).map((e) => e.id), ["e", "b"]);
  assert.deepEqual(recentReleases(entries, TODAY, 10).map((e) => e.id), ["e", "b", "a"]);
});

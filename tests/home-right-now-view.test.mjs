import test from "node:test";
import assert from "node:assert/strict";
import { renderRightNow } from "../src/data/homeRightNowView.js";

const copy = {
  running: "Running", comingUp: "Coming up", lastDay: "Last day", daysLeft: "days left", dayLeft: "day left",
  inDays: "in {n} days", tomorrow: "tomorrow", nextBanner: "Next banner", moreRunning: "{n} more running",
  allEvents: "All events", allBanners: "All banners", nothingRunning: "Nothing is running.", nothingComing: "Nothing announced.",
  rerun: "Rerun", categories: { events: "Event", banners: "Banner", leaderboards: "Leaderboard", recurring: "Recurring", offers: "Offer" },
};
const ctx = { locale: "en", copy, today: "2026-10-28", eventsHref: "/events", bannersHref: "/banners", heroHref: (id) => `/heroes/${id}` };
const ev = (id, start, end, category = "events", extra = {}) => ({ id, label: `E${id}`, start, end, category, ...extra });
const state = (over = {}) => ({ featured: null, nextBanner: null, running: [], moreRunning: 0, coming: [], ...over });

test("labels are escaped", () => {
  const html = renderRightNow(state({ running: [ev(1, "2026-10-20", "2026-11-10")].map((e) => ({ ...e, label: '<img onerror="x">' })) }), ctx);
  assert.ok(!html.running.includes("<img onerror"));
  assert.ok(html.running.includes("&lt;img onerror"));
});

test("the last day and plural/singular day counts read correctly", () => {
  const html = renderRightNow(state({ running: [ev(1, "2026-10-20", "2026-10-28"), ev(2, "2026-10-20", "2026-10-29"), ev(3, "2026-10-20", "2026-11-02")] }), ctx).running;
  assert.match(html, /Last day/);
  assert.match(html, /<b>1<\/b><small>day left<\/small>/);
  assert.match(html, /<b>5<\/b><small>days left<\/small>/);
});

test("progress bar carries the percentage for assistive tech", () => {
  const html = renderRightNow(state({ running: [ev(1, "2026-10-24", "2026-11-02")] }), ctx).running;
  assert.match(html, /role="progressbar"[^>]*aria-valuenow="50"/);
});

test("coming rows say tomorrow or in n days and carry a machine-readable date", () => {
  const html = renderRightNow(state({ coming: [ev(1, "2026-10-29", "2026-10-31"), ev(2, "2026-11-04", "2026-11-08")] }), ctx).coming;
  assert.match(html, /tomorrow/);
  assert.match(html, /in 7 days/);
  assert.match(html, /<time datetime="2026-11-04">/);
});

test("empty states and the 'more running' link", () => {
  const empty = renderRightNow(state(), ctx);
  assert.match(empty.running, /Nothing is running\./);
  assert.match(empty.coming, /Nothing announced\./);
  const more = renderRightNow(state({ running: [ev(1, "2026-10-20", "2026-11-10")], moreRunning: 3 }), ctx).running;
  assert.match(more, /3 more running/);
});

test("the featured banner shows the hero, the days left and the next banner", () => {
  const featured = { id: "b", heroName: "Charon", heroSiteId: "charon", image: "https://x/y.webp", start: "2026-10-28", end: "2026-11-12" };
  const next = { id: "c", heroName: "Ananke", start: "2026-11-13", end: "2026-11-26" };
  const html = renderRightNow(state({ featured, nextBanner: next }), ctx).feature;
  assert.match(html, /Charon/);
  assert.match(html, /<b>15<\/b>/);
  assert.match(html, /href="\/heroes\/charon"/);
  assert.match(html, /Next banner/);
  assert.match(html, /Ananke/);
  assert.match(html, /in 16 days/);
});

test("without a featured banner the feature slot is empty", () => {
  assert.equal(renderRightNow(state(), ctx).feature, "");
});

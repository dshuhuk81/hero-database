// Selection logic for the "Right now" block of the home page. Dates are ISO strings (YYYY-MM-DD, UTC);
// the game config has no time zone, so everything is day-precise.
import { daysUntil } from "./eventTimeline.js";

/** Progress of an event on `today`; the first and the last day both count. */
export function dayProgress(start, end, today) {
  const total = daysUntil(end, start) + 1;
  const elapsed = Math.min(total, Math.max(0, daysUntil(today, start) + 1));
  return { total, elapsed, left: daysUntil(end, today), pct: Math.round((elapsed / total) * 100) };
}

const byEndThenBanner = (a, b) => a.end.localeCompare(b.end) || Number(b.category === "banners") - Number(a.category === "banners");

/**
 * @param items   events and rerun banners as { id, start, end, category, bannerId? }
 * @param banners hero banners as { id, kind: "new" | "rerun", start, end }; end is null for a hero without a banner yet
 * @returns {{ featured, nextBanner, running, moreRunning, coming }}
 */
export function pickRightNow(items, banners, today, { runningLimit = 5, comingLimit = 6, minRunning = 5 } = {}) {
  // Only real banners (with an end date) count; a hero announced without a banner is not one.
  const newBanners = banners.filter((b) => b.kind === "new" && b.start && b.end);
  const featured = newBanners
    .filter((b) => b.start <= today && (!b.end || b.end >= today))
    .sort((a, b) => b.start.localeCompare(a.start))[0] ?? null;
  const nextBanner = newBanners.filter((b) => b.start > today).sort((a, b) => a.start.localeCompare(b.start))[0] ?? null;

  const shown = items.filter((i) => i.category !== "offers");
  const active = (i) => i.start <= today && i.end >= today;
  const running = shown.filter(active).sort(byEndThenBanner);
  // Offers are the least interesting rows, so they only fill the list up to minRunning.
  if (running.length < minRunning) {
    const offers = items.filter((i) => i.category === "offers" && active(i)).sort(byEndThenBanner);
    running.push(...offers.slice(0, minRunning - running.length));
  }
  const coming = shown
    .filter((i) => i.start > today && !(nextBanner && i.bannerId === nextBanner.id))
    .sort((a, b) => a.start.localeCompare(b.start) || Number(b.category === "banners") - Number(a.category === "banners"))
    .slice(0, comingLimit);
  return { featured, nextBanner, running: running.slice(0, runningLimit), moreRunning: Math.max(0, running.length - runningLimit), coming };
}

/** The latest releases up to `today` from [{ id, date }]; undated and future entries are skipped. */
export function recentReleases(entries, today, limit) {
  return entries
    .filter((e) => e.date && e.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

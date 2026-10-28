// Pure helpers for the event calendar. Dates are ISO strings (YYYY-MM-DD) in UTC; the game
// config carries no time zone, so everything is day-precise.
const DAY_MS = 86400000;
const parse = (iso) => Date.parse(`${iso}T00:00:00Z`);

/** Whole days from `today` to `iso` (negative when `iso` is in the past). */
export function daysUntil(iso, today) {
  return Math.round((parse(iso) - parse(today)) / DAY_MS);
}

const byCategoryRank = (event) => (event.category === "banners" ? 0 : 1);

/** Events active on `today` (start and end day inclusive), soonest-ending first, banners first on a tie. */
export function runningEvents(events, today) {
  return events
    .filter((event) => event.start <= today && event.end >= today)
    .sort((a, b) => a.end.localeCompare(b.end) || byCategoryRank(a) - byCategoryRank(b));
}

/** Events starting after `today`, earliest first, banners first on a tie. */
export function upcomingEvents(events, today, limit) {
  return events
    .filter((event) => event.start > today)
    .sort((a, b) => a.start.localeCompare(b.start) || byCategoryRank(a) - byCategoryRank(b))
    .slice(0, limit);
}

/** Stacks overlapping events into lanes; an event starting on another's end day gets its own lane. */
export function assignLanes(events) {
  const laneEnds = [];
  return [...events]
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
    .map((event) => {
      let lane = laneEnds.findIndex((end) => end < event.start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = event.end;
      return { ...event, lane };
    });
}

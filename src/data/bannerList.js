// Pure helpers for the banner page. Dates are ISO strings (YYYY-MM-DD) in UTC.

/** @returns {"ended" | "running" | "upcoming"} the end day itself still counts as running */
export function bannerStatus(start, end, today) {
  if (!start) return "upcoming";
  if (start > today) return "upcoming";
  if (end && end < today) return "ended";
  return "running";
}

const withStatus = (banners, today) => banners.map((banner) => ({ banner, status: bannerStatus(banner.start, banner.end, today) }));

/** current: running (soonest end first), upcoming (earliest start first), undated last; history: ended, newest first. */
export function splitBanners(banners, today) {
  const rows = withStatus(banners, today);
  const pick = (status) => rows.filter((row) => row.status === status).map((row) => row.banner);
  const running = pick("running").sort((a, b) => (a.end ?? "9999").localeCompare(b.end ?? "9999"));
  const upcoming = pick("upcoming");
  const dated = upcoming.filter((banner) => banner.start).sort((a, b) => a.start.localeCompare(b.start));
  const undated = upcoming.filter((banner) => !banner.start);
  const history = pick("ended").sort((a, b) => b.start.localeCompare(a.start));
  return { current: [...running, ...dated, ...undated], history };
}

/** Groups an ordered list by start month, keeping the given order. */
export function groupByMonth(banners) {
  const groups = [];
  for (const banner of banners) {
    const month = banner.start.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(banner);
    else groups.push({ month, items: [banner] });
  }
  return groups;
}

/** @param {{ kind?: string, status?: string, query?: string }} filters */
export function filterBanners(banners, { kind, status, query } = {}, today) {
  const needle = query?.trim().toLowerCase();
  return banners.filter((banner) => {
    if (kind && banner.kind !== kind) return false;
    if (status && bannerStatus(banner.start, banner.end, today) !== status) return false;
    if (needle && !(banner.heroName ?? "").toLowerCase().includes(needle)) return false;
    return true;
  });
}

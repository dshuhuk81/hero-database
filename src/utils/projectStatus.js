import { heroes } from "../data/heroes/withRatings";
import heroRatings from "../data/ratings/hero-ratings.json";
import pageUpdates from "../data/pageUpdates.json";
import { navEntries } from "../data/nav";

const RATING_FIELDS = ["overall", "pvp", "pve"];
const REQUIRED_FIELDS = ["id", "name", "faction", "role", "class", "rarity"];
const INTERNAL_ROUTES = new Set(["/design-system", "/privacy", "/status"]);
const pageModules = import.meta.glob(["../pages/**/*.astro", "!../pages/status.astro"]);

function isFilled(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function countBy(items, key) {
  return [...items].reduce((acc, item) => {
    const value = item[key] || "Missing";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function asSegments(record) {
  return Object.entries(record)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function ratingCoverageFor(hero) {
  const filled = RATING_FIELDS.filter((field) => isFilled(hero.ratings?.[field])).length;
  return {
    filled,
    total: RATING_FIELDS.length,
    percent: percent(filled, RATING_FIELDS.length),
  };
}

function hasStrengthWeakness(hero) {
  return isFilled(hero.strengths) && isFilled(hero.weaknesses);
}

function routeFromPagePath(filePath) {
  const normalized = filePath
    .replace("../pages", "")
    .replace(/\.astro$/, "")
    .replace(/\/index$/, "");
  return normalized || "/";
}

function getPageInventory() {
  const routes = [...Object.keys(pageModules).map(routeFromPagePath), "/status"].sort();
  const navRoutes = new Set(navEntries.map((entry) => entry.href));
  const dynamicRoutes = routes.filter((route) => route.includes("["));
  const staticRoutes = routes.filter((route) => !route.includes("["));
  const publicStaticRoutes = staticRoutes.filter((route) => !INTERNAL_ROUTES.has(route));
  const unlinkedPublicRoutes = publicStaticRoutes.filter((route) => !navRoutes.has(route));
  const stalePageUpdates = Object.keys(pageUpdates).filter((key) => {
    const route = `/${key}`;
    const aliases = {
      rankings: "/hero-stats",
      stats: "/hero-stats",
      tierlist: "/heroes",
      shrine: "/tips",
      "early-game": "/tips",
    };
    return !routes.includes(route) && !routes.includes(aliases[key]);
  });

  return {
    routes,
    staticRoutes,
    dynamicRoutes,
    navRoutes: [...navRoutes].sort(),
    internalRoutes: staticRoutes.filter((route) => INTERNAL_ROUTES.has(route)),
    unlinkedPublicRoutes,
    stalePageUpdates,
    navCoverage: percent(publicStaticRoutes.length - unlinkedPublicRoutes.length, publicStaticRoutes.length),
  };
}

function getHeroChecks(hero) {
  const ratings = ratingCoverageFor(hero);
  const requiredFields = REQUIRED_FIELDS.every((field) => isFilled(hero[field]));
  const expectsAdvancedContent = hero.rarity !== "Common" || hero.id === "cancer";
  const checks = [
    { key: "identity", label: "Identity", ok: requiredFields },
    { key: "stats", label: "Stats", ok: isFilled(hero.stats) },
    { key: "skills", label: "Skills", ok: isFilled(hero.skills) },
    { key: "rating", label: "Rating", ok: isFilled(hero.ratings?.overall) },
    { key: "synergy", label: "Synergy", ok: isFilled(hero.synergies) || isFilled(hero.synergyTags) },
    ...(expectsAdvancedContent
      ? [
          { key: "relic", label: "Relic", ok: isFilled(hero.relic) },
          { key: "virtues", label: "Virtues", ok: isFilled(hero.virtues) || isFilled(hero.virtueSets) },
        ]
      : []),
  ];
  const passed = checks.filter((check) => check.ok).length;

  return {
    checks,
    passed,
    total: checks.length,
    percent: percent(passed, checks.length),
    ratingPercent: ratings.percent,
  };
}

function getSeverity(heroStatus) {
  if (!heroStatus.hasStats || !heroStatus.hasSkills || !heroStatus.hasRating) return "critical";
  if (heroStatus.completenessPercent < 70) return "warning";
  return "ok";
}

function getStatusLabel(severity) {
  if (severity === "critical") return "Needs data";
  if (severity === "warning") return "Needs content";
  return "Healthy";
}

function getHealthScore(metrics) {
  const integrityScore = metrics.orphanRatings === 0 && metrics.stalePageUpdates === 0 ? 100 : 75;
  return Math.round(
    metrics.coreCoverage * 0.35 +
      metrics.ratingCoverage * 0.25 +
      metrics.navCoverage * 0.15 +
      metrics.metaCoverage * 0.15 +
      integrityScore * 0.1
  );
}

export function getProjectStatus() {
  const pageInventory = getPageInventory();
  const heroIds = new Set(heroes.map((hero) => hero.id));
  const ratingIds = Object.keys(heroRatings);

  const releasedHeroes = heroes.filter((hero) => hero.release !== false);
  const unreleasedHeroes = heroes.filter((hero) => hero.release === false);
  const missingRatings = heroes.filter((hero) => !isFilled(hero.ratings?.overall));
  const partialRatings = heroes.filter((hero) => {
    const coverage = ratingCoverageFor(hero);
    return coverage.filled > 0 && coverage.filled < coverage.total;
  });
  const missingStats = heroes.filter((hero) => !isFilled(hero.stats));
  const missingSkills = heroes.filter((hero) => !isFilled(hero.skills));
  const missingStrengthWeakness = heroes.filter((hero) => !hasStrengthWeakness(hero));
  const orphanRatings = ratingIds.filter((id) => !heroIds.has(id));

  const heroStatuses = heroes
    .map((hero) => {
      const coverage = getHeroChecks(hero);
      const hasStats = isFilled(hero.stats);
      const hasSkills = isFilled(hero.skills);
      const hasRating = isFilled(hero.ratings?.overall);
      const missingChecks = coverage.checks.filter((check) => !check.ok).map((check) => check.label);
      const status = {
        id: hero.id,
        name: hero.name,
        release: hero.release !== false,
        faction: hero.faction || "Missing",
        class: hero.class || "Missing",
        role: hero.role || "Missing",
        rarity: hero.rarity || "Missing",
        ratings: hero.ratings || {},
        hasStats,
        hasSkills,
        hasRating,
        completenessPercent: coverage.percent,
        ratingPercent: coverage.ratingPercent,
        missingChecks,
        hasStrengthWeakness: hasStrengthWeakness(hero),
      };
      const severity = getSeverity(status);

      return {
        ...status,
        severity,
        statusLabel: getStatusLabel(severity),
      };
    })
    .sort((a, b) => {
      const severityRank = { critical: 0, warning: 1, ok: 2 };
      const severityDiff = severityRank[a.severity] - severityRank[b.severity];
      return severityDiff !== 0 ? severityDiff : a.name.localeCompare(b.name);
    });

  const coreChecksTotal = heroes.length * 2;
  const coreChecksPassed = heroes.filter((hero) => isFilled(hero.stats)).length + heroes.filter((hero) => isFilled(hero.skills)).length;
  const ratingCoverage = percent(heroes.length - missingRatings.length, heroes.length);
  const strengthWeaknessComplete = heroes.length - missingStrengthWeakness.length;
  const metaCoverage = Math.round(
    heroes.reduce((sum, hero) => sum + getHeroChecks(hero).percent, 0) / Math.max(heroes.length, 1)
  );

  const metrics = {
    coreCoverage: percent(coreChecksPassed, coreChecksTotal),
    ratingCoverage,
    navCoverage: pageInventory.navCoverage,
    metaCoverage,
    orphanRatings: orphanRatings.length,
    stalePageUpdates: pageInventory.stalePageUpdates.length,
  };

  const actionQueue = [
    {
      label: "Add missing overall ratings",
      count: missingRatings.length,
      severity: missingRatings.length ? "critical" : "ok",
      detail: missingRatings.slice(0, 8).map((hero) => hero.name).join(", "),
    },
    {
      label: "Complete partial rating sets",
      count: partialRatings.length,
      severity: partialRatings.length ? "warning" : "ok",
      detail: partialRatings.slice(0, 8).map((hero) => hero.name).join(", "),
    },
    {
      label: "Review unreleased heroes",
      count: unreleasedHeroes.length,
      severity: unreleasedHeroes.length ? "info" : "ok",
      detail: unreleasedHeroes.slice(0, 8).map((hero) => hero.name).join(", "),
    },
    {
      label: "Add strengths & weaknesses",
      count: missingStrengthWeakness.length,
      severity: missingStrengthWeakness.length ? "info" : "ok",
      detail: missingStrengthWeakness.slice(0, 8).map((hero) => hero.name).join(", "),
    },
    {
      label: "Fix orphan rating IDs",
      count: orphanRatings.length,
      severity: orphanRatings.length ? "critical" : "ok",
      detail: orphanRatings.slice(0, 8).join(", "),
    },
    {
      label: "Review unlinked public pages",
      count: pageInventory.unlinkedPublicRoutes.length,
      severity: pageInventory.unlinkedPublicRoutes.length ? "warning" : "ok",
      detail: pageInventory.unlinkedPublicRoutes.slice(0, 8).join(", "),
    },
    {
      label: "Clean stale page update keys",
      count: pageInventory.stalePageUpdates.length,
      severity: pageInventory.stalePageUpdates.length ? "warning" : "ok",
      detail: pageInventory.stalePageUpdates.slice(0, 8).join(", "),
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    healthScore: getHealthScore(metrics),
    totals: {
      heroes: heroes.length,
      released: releasedHeroes.length,
      unreleased: unreleasedHeroes.length,
      newHeroes: heroes.filter((hero) => hero.newHero).length,
      missingRatings: missingRatings.length,
      partialRatings: partialRatings.length,
      missingStats: missingStats.length,
      missingSkills: missingSkills.length,
      strengthWeaknessComplete,
      missingStrengthWeakness: missingStrengthWeakness.length,
      orphanRatings: orphanRatings.length,
      stalePageUpdates: pageInventory.stalePageUpdates.length,
      routes: pageInventory.routes.length,
      staticRoutes: pageInventory.staticRoutes.length,
      dynamicRoutes: pageInventory.dynamicRoutes.length,
      navPages: pageInventory.navRoutes.length,
      internalRoutes: pageInventory.internalRoutes.length,
      unlinkedPublicRoutes: pageInventory.unlinkedPublicRoutes.length,
    },
    coverage: [
      { label: "Core hero data", value: metrics.coreCoverage, detail: "Stats and skills" },
      { label: "Overall ratings", value: metrics.ratingCoverage, detail: "Heroes with overall tier" },
      { label: "Navigation coverage", value: metrics.navCoverage, detail: "Public static pages in navigation" },
      { label: "Meta completeness", value: metrics.metaCoverage, detail: "Optional content fields" },
      {
        label: "Strengths & weaknesses",
        value: percent(strengthWeaknessComplete, heroes.length),
        detail: "Editorial hero enrichment",
      },
    ],
    distributions: {
      faction: asSegments(countBy(heroes, "faction")),
      class: asSegments(countBy(heroes, "class")),
      role: asSegments(countBy(heroes, "role")),
      rarity: asSegments(countBy(heroes, "rarity")),
    },
    ratings: asSegments(
      heroes.reduce((acc, hero) => {
        const rating = hero.ratings?.overall || "Missing";
        acc[rating] = (acc[rating] || 0) + 1;
        return acc;
      }, {})
    ),
    actionQueue,
    heroStatuses,
    pages: pageInventory,
    pageUpdates: Object.entries(pageUpdates).map(([area, version]) => ({ area, version })),
  };
}

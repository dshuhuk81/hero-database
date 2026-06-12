function normalizeHeroKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function getHeroQuery(argv = process.argv.slice(2)) {
  const queryParts = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--report") continue;
    if (arg === "--hero") {
      if (argv[i + 1]) queryParts.push(argv[++i]);
      continue;
    }
    if (arg.startsWith("--hero=")) {
      queryParts.push(arg.slice("--hero=".length));
      continue;
    }
    if (arg.startsWith("--")) continue;
    queryParts.push(arg);
  }

  return queryParts.join(" ").trim();
}

export function filterHeroesByQuery(heroes, query) {
  const needle = normalizeHeroKey(query);
  if (!needle) return heroes;

  const exact = heroes.filter((hero) => {
    const keys = [hero.id, hero.name, hero.fileName, hero.fileBaseName].map(normalizeHeroKey);
    return keys.includes(needle);
  });
  if (exact.length === 1) return exact;

  const partial = heroes.filter((hero) => {
    const keys = [hero.id, hero.name, hero.fileName, hero.fileBaseName].map(normalizeHeroKey);
    return keys.some((key) => key.includes(needle));
  });
  if (partial.length === 1) return partial;

  if (exact.length > 1 || partial.length > 1) {
    const matches = (exact.length > 1 ? exact : partial).map((hero) => `${hero.name} (${hero.id})`).join(", ");
    throw new Error(`Hero query "${query}" is ambiguous. Matches: ${matches}`);
  }

  throw new Error(`Hero not found for query "${query}". Try a hero id, filename, or display name.`);
}

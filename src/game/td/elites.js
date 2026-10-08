// Elite affixes (G1 of TOWER_DEFENSE_GAMEPLAY_IDEAS.md): from tuning.elites.schedule's first
// chapter on, a few ordinary timeline enemies of a campaign stage arrive as Elites with one to
// three affixes. The Elites of a stage are fixed by its id, so the stage drawer can list them
// before the battle; the simulation picks which spawns carry them at start (sim.js start()),
// so timelines and enemy counts stay as authored. Numbers live in tuning.elites.
// Pure logic; no DOM.

// Player-facing names, one-line rules and the pip colour drawn over an Elite's health bar.
export const ELITE_AFFIXES = {
  vampiric: { name: "Vampiric", text: "Heals itself with every hit on a hero.", color: 0xdc2626 },
  blink: { name: "Blink", text: "At half health it vanishes and reappears further down the road, once.", color: 0xa855f7 },
  mirror: { name: "Mirror", text: "Reflects part of the magic damage it takes back to the caster.", color: 0x67e8f9 },
  banner: { name: "Banner", text: "Nearby enemies march faster.", color: 0xf97316 },
  thief: { name: "Thief", text: "Every hit drains the struck hero's ultimate charge.", color: 0x6366f1 },
  splitter: { name: "Splitter", text: "Breaks into smaller enemies when it falls.", color: 0x84cc16 },
};

export const ELITE_AFFIX_IDS = Object.keys(ELITE_AFFIXES);

// Small deterministic generator seeded from a string (the stage id).
function seededRandom(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// The schedule step for a chapter ({ fromChapter, count, affixes }), or null before the first.
function scheduleFor(cfg, chapter) {
  return [...(cfg?.schedule ?? [])].sort((a, b) => b.fromChapter - a.fromChapter).find((step) => chapter >= step.fromChapter) ?? null;
}

// The Elites of a campaign stage: an array of affix id lists (one list per Elite), empty when
// the stage's chapter has none. `stage.chapter` and `stage.finale` come from allStages().
export function stageElites(stage, tuning) {
  const cfg = tuning?.elites;
  const step = stage ? scheduleFor(cfg, Number(stage.chapter)) : null;
  if (!step || !step.count) return [];
  const pool = ELITE_AFFIX_IDS.filter((id) => cfg.affixes?.[id]);
  const perElite = Math.min(pool.length, step.affixes + (stage.finale ? cfg.finaleAffixes || 0 : 0));
  const random = seededRandom(`elite:${stage.id}`);
  return Array.from({ length: step.count }, () => {
    const left = [...pool];
    return Array.from({ length: perElite }, () => left.splice(Math.floor(random() * left.length), 1)[0]);
  });
}

// Spawn queue entries that may become Elites: authored ground enemies (no boss, no flyer).
export function eliteCandidates(queue, tuning) {
  return queue.filter((entry) => entry.kind !== "boss" && !tuning.enemies[entry.kind]?.flying);
}

// Marks queue entries as Elites, spread evenly over the stage (the first Elite a third of the
// way in for one Elite, at a third and two thirds for two, ...). Mutates the entries.
export function markEliteSpawns(queue, elites, tuning) {
  if (!elites?.length) return;
  const candidates = eliteCandidates(queue, tuning);
  if (!candidates.length) return;
  elites.forEach((affixes, i) => {
    const index = Math.min(candidates.length - 1, Math.floor(candidates.length * (i + 1) / (elites.length + 1)));
    candidates[index].elite = affixes;
  });
}

export const affixNames = (affixes) => (affixes ?? []).map((id) => ELITE_AFFIXES[id]?.name ?? id);

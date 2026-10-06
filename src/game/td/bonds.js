// Pantheon bonds (tuning.bonds, TOWER_DEFENSE_GAMEPLAY_IDEAS.md C1): heroes of one pantheon
// together unlock that set's tiers (2 and 4 heroes). Recruits (ids starting with
// `wildcard`) are wildcards: each counts for the set with the most of its own heroes (the
// first listed set on a tie) and shares its bonus. Pure, shared by the sim (heroes on the
// field) and the squad screen (the picked squad).

// `heroes`: runtime hero records with mythologyGroups. Returns [{ id, name, count, tier, next, members }] per set, where
// `members` holds indexes into `heroes`, `tier` the reached tier (null below the first) and
// `next` the next tier still to reach.
export function bondsOf(cfg, heroes) {
  if (!cfg?.sets) return [];
  const setIds = Object.keys(cfg.sets);
  const native = Object.fromEntries(setIds.map((id) => [id, heroes.flatMap((hero, i) => (hero?.mythologyGroups?.includes(cfg.sets[id].groupId) ? [i] : []))]));
  const wildSet = setIds.reduce((best, id) => (native[id].length > native[best].length ? id : best), setIds[0]);
  const wild = heroes.flatMap((hero, i) => (cfg.wildcard && hero?.id?.startsWith(cfg.wildcard) ? [i] : []));
  return setIds.map((id) => {
    const members = id === wildSet ? [...native[id], ...wild] : native[id];
    const tiers = [...cfg.sets[id].tiers].sort((a, b) => a.count - b.count);
    const tier = tiers.filter((t) => members.length >= t.count).at(-1) ?? null;
    const next = tiers.find((t) => members.length < t.count) ?? null;
    return { id, name: cfg.sets[id].name, count: members.length, tier, next, members: new Set(members) };
  });
}

const pct = (v) => `${Math.round(v * 100)}%`;

// A tier's effects in words: "+6% attack", "7% less damage taken, heals +15%".
export function bondText(tier) {
  if (!tier) return "";
  const parts = [];
  if (tier.atk) parts.push(`+${pct(tier.atk)} attack`);
  if (tier.ultCharge) parts.push(`ultimates charge ${pct(tier.ultCharge)} faster`);
  if (tier.guard) parts.push(`${pct(tier.guard)} less damage taken`);
  if (tier.heal) parts.push(`heals +${pct(tier.heal)}`);
  return parts.join(", ");
}

// Hero talents, Tier I (docs/tower-defense-hero-talents-concept.md; data in tdTalents.json `fx`).
// A hero carries its chosen talent ids (collectionHeroes, campaign.js); talentFx() merges their
// effects into one object the simulation reads. Key suffixes set the merge rule:
//   ...Factor  multiplied together (default 1)
//   ...Set     the last talent wins (replaces the kit value)
//   ...Add     summed
//   other numbers summed; booleans true when any talent sets them
// Tier II (signature) talents have no fx yet and change nothing in battle.
import talentData from "../../data/tdTalents.json" with { type: "json" };

const EFFECTS = new Map([...Object.values(talentData.classes).flat(), ...Object.values(talentData.heroes).flat()].map((talent) => [talent.id, talent.fx ?? {}]));

const NONE = Object.freeze({});

export function talentFx(ids) {
  if (!ids?.length) return NONE;
  const out = {};
  for (const id of ids) {
    for (const [key, value] of Object.entries(EFFECTS.get(id) ?? {})) {
      if (key.endsWith("Factor")) out[key] = (out[key] ?? 1) * value;
      else if (key.endsWith("Set")) out[key] = value;
      else if (typeof value === "boolean") out[key] = !!out[key] || value;
      else out[key] = (out[key] ?? 0) + value;
    }
  }
  return out;
}

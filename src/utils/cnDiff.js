// CN-vs-Global diff engine.
//
// Reads the optional `cn` block manually curated into each hero JSON
// (see .claude/CLAUDE.md and data-mine/cn/ for the ingestion format) and
// turns it into display-ready summaries. Pure functions only - this never
// invents data: every row mirrors what is stored in the hero JSON.
//
// SEMANTICS (authoritative - keep ingestion consistent with this):
// CN is the canonical base version and never "changes". `change` always
// describes how the GLOBAL build compares to the CN base, judged by whether
// the Global value is better or worse for the player:
//   "buff"    - Global is BETTER than CN (stronger for the player)
//   "nerf"    - Global is WORSE than CN  (weaker for the player)
//   "diff"    - non-numeric / direction-ambiguous difference (e.g. damageType)
//   "neutral" - Global equals CN
// Direction depends on the stat: more damage/heal/shield/duration of a good
// effect = better; higher cooldown / longer self-debuff = worse. The
// ingestion step sets `change` per row using that judgement.
//
// `cn` block shape (per hero JSON):
//   cn: {
//     captured: "YYYY-MM-DD",
//     source: "...",
//     skills: [
//       { id, cnName, values: [ { label, field, global, cn, unit,
//                                 change: "buff"|"nerf"|"diff"|"neutral",
//                                 verified?: boolean } ], notes?: [] }
//     ]
//   }

const CHANGE_KINDS = ["buff", "nerf", "diff", "neutral"];

function isChangedRow(row) {
  return row && row.change && row.change !== "neutral";
}

// Humanize a skill id when no Global name is found ("skill_1" -> "Skill 1").
function humanizeSkillId(id) {
  if (!id) return "Skill";
  if (id === "relic") return "Relic";
  const m = /^skill[_-]?(\d+)$/i.exec(id);
  return m ? `Skill ${m[1]}` : id;
}

// English display name for a CN skill block, taken from the Global hero JSON.
// The CN block's `cnName` (Chinese) is intentionally never used for display.
function englishSkillName(hero, skillId) {
  const relic = hero && hero.relic;
  if (skillId === "relic") return (relic && relic.name) || "Relic";
  const list = hero && Array.isArray(hero.skills) ? hero.skills : [];
  const match = list.find((s) => s && s.id === skillId);
  return (match && match.name) || humanizeSkillId(skillId);
}

/**
 * Build a per-hero CN comparison summary.
 * @returns null when the hero has no `cn` block, otherwise:
 *   { captured, source, totals:{buff,nerf,diff,neutral,changes,total},
 *     hasChanges, skills:[{ id, cnName, notes, rows:[...],
 *                           changedRows, changeCount }] }
 */
export function getCnSummary(hero) {
  const cn = hero && hero.cn;
  if (!cn || !Array.isArray(cn.skills) || cn.skills.length === 0) return null;

  const totals = { buff: 0, nerf: 0, diff: 0, neutral: 0, changes: 0, total: 0 };

  const skills = cn.skills.map((skill) => {
    const rows = Array.isArray(skill.values) ? skill.values : [];
    let changeCount = 0;
    for (const row of rows) {
      totals.total += 1;
      const kind = CHANGE_KINDS.includes(row.change) ? row.change : "neutral";
      totals[kind] += 1;
      if (isChangedRow(row)) {
        totals.changes += 1;
        changeCount += 1;
      }
    }
    return {
      id: skill.id,
      name: englishSkillName(hero, skill.id),
      notes: Array.isArray(skill.notes) ? skill.notes : [],
      rows,
      changedRows: rows.filter(isChangedRow),
      changeCount,
    };
  });

  return {
    captured: cn.captured ?? null,
    source: cn.source ?? null,
    totals,
    hasChanges: totals.changes > 0,
    skills,
  };
}

/**
 * Collect every hero that has a `cn` block, newest-captured first and
 * most-changed first, for the hub page.
 * @returns [{ id, name, image, role, class, faction, rarity, summary }]
 */
export function getCnHeroes(heroes) {
  const list = [];
  for (const hero of heroes) {
    const summary = getCnSummary(hero);
    if (!summary) continue;
    list.push({
      id: hero.id,
      name: hero.name,
      image: hero.image,
      role: hero.role,
      class: hero.class,
      faction: hero.faction,
      rarity: hero.rarity,
      summary,
    });
  }

  list.sort((a, b) => {
    const ca = a.summary.totals.changes;
    const cb = b.summary.totals.changes;
    if (cb !== ca) return cb - ca;
    return a.name.localeCompare(b.name);
  });

  return list;
}

/** Aggregate counts across all CN heroes for the hub header. */
export function getCnOverview(cnHeroes) {
  const o = {
    heroes: cnHeroes.length,
    changedHeroes: 0,
    buff: 0,
    nerf: 0,
    diff: 0,
    latestCaptured: null,
  };
  for (const h of cnHeroes) {
    const t = h.summary.totals;
    if (t.changes > 0) o.changedHeroes += 1;
    o.buff += t.buff;
    o.nerf += t.nerf;
    o.diff += t.diff;
    const cap = h.summary.captured;
    if (cap && (!o.latestCaptured || cap > o.latestCaptured)) {
      o.latestCaptured = cap;
    }
  }
  return o;
}

/** Format a stored value for display (keeps strings, appends unit to numbers). */
export function formatCnValue(value, unit) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return `${value}${unit || ""}`;
  return String(value);
}

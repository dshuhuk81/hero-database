const BOSS_MECHANIC_RULES = {
  ENERGY_DRAIN: {
    preferHeroTags: ["Energy", "Cooldown"],
    minTagCounts: { Energy: 1, Cooldown: 1 },
  },
};

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function normalizeRules(rules) {
  return {
    goal: rules?.goal ?? null,
    preferHeroTags: Array.isArray(rules?.preferHeroTags) ? rules.preferHeroTags : [],
    avoidHeroTags: Array.isArray(rules?.avoidHeroTags) ? rules.avoidHeroTags : [],
    minTagCounts: typeof rules?.minTagCounts === "object" && rules.minTagCounts ? rules.minTagCounts : {},
    notes: rules?.notes ?? null,
  };
}

function mergeRules(base, extra) {
  const a = normalizeRules(base);
  const b = normalizeRules(extra);

  const minTagCounts = { ...a.minTagCounts };
  for (const [tag, count] of Object.entries(b.minTagCounts)) {
    const prev = Number(minTagCounts[tag] || 0);
    minTagCounts[tag] = Math.max(prev, Number(count || 0));
  }

  return {
    goal: b.goal || a.goal || null,
    preferHeroTags: uniq([...a.preferHeroTags, ...b.preferHeroTags]),
    avoidHeroTags: uniq([...a.avoidHeroTags, ...b.avoidHeroTags]),
    minTagCounts,
    notes: b.notes || a.notes || null,
  };
}

export function bossMechanicsToAutoRules(boss) {
  const tags = Array.isArray(boss?.mechanicTags) ? boss.mechanicTags : [];
  let combined = normalizeRules(null);
  for (const tag of tags) {
    if (BOSS_MECHANIC_RULES[tag]) {
      combined = mergeRules(combined, BOSS_MECHANIC_RULES[tag]);
    }
  }
  return combined;
}

export function applyBossMechanicMapping(compRules, boss, defaultAutoRules) {
  const base = mergeRules(defaultAutoRules, bossMechanicsToAutoRules(boss));
  return mergeRules(base, compRules);
}

export function resolveAutoComp(comp, boss, defaultAutoRules) {
  return {
    ...comp,
    autoRules: applyBossMechanicMapping(comp?.autoRules, boss, defaultAutoRules),
  };
}

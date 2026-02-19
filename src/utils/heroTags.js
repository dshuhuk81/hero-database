/**
 * Derives keyword tags from a hero's skill descriptions
 * Used for team composition generation and boss counter analysis
 */

/**
 * @param {Object} hero - Hero object with skills and relic
 * @returns {string[]} Array of tag labels (max 3)
 */
export function keywordTagsForHero(hero) {
  const text = fullSkillText(hero).toLowerCase();
  const tags = [];
  const add = (label, ok) => { if (ok && !tags.includes(label)) tags.push(label); };

  // Ally Heal - allows words like "several", "multiple", "all" between verb and "allies"
  const allyHeal =
    /\b(heals?|restores?|recovers?)\s+(?:several|multiple|all|nearby|the|an?)?\s*(?:hp|health)?\s*(?:to|for)?\s*(allies?|ally)\b/.test(text) ||
    /\b(heals?|restores?|recovers?)\s+(?:hp|health)?\s+(?:equal\s+)?to\s+[\s\S]{0,60}\b(allies?|ally)\b/.test(text);

  // Self heal (e.g. "heals Amun-Ra", "heals self", "heals himself/herself")
  const heroName = escapeRegExp(hero?.name?.toLowerCase?.() || "");
  const selfHeal =
    (heroName && new RegExp(`\\b(heals?|restores?|recovers?)\\s+(?:\\w+\\s+)?${heroName}\\b`).test(text)) ||
    /\b(heals?|restores?)\s+(?:himself|herself|itself|self)\b/.test(text);

  // Generic HP restore (can be self-heal; we only label as Self Heal if no Ally Heal)
  const genericHpRestore = /\b(restores?|recovers?)\s+hp\b/.test(text) && 
    !/\b(allies?|ally|team|party)\b/.test(text.substring(Math.max(0, text.indexOf('restores hp') - 100), text.indexOf('restores hp') + 100));

  // Anti-heal patterns
  const antiHeal =
    /\b(cannot receive (?:shields? or )?healing|cannot be healed|prevents? healing|healing reduction|reduce(s|d)? healing|healing is reduced|stop(s|ped)? healing|ban(s|ned)? healing)\b/.test(text);

  add("Ally Heal", allyHeal);
  add("Self Heal", !allyHeal && (selfHeal || genericHpRestore));
  add("Anti-Heal", antiHeal);

  // Other tags
  add("Shield", /\bshield\b/.test(text));
  add("Cleanse", /\b(removes?|remove|cleanse[sd]?)\s+(?:one|a|an?|the|all|any|multiple)?\s*(?:debuffs?|negative\s+effects?)\b/.test(text));
  add("Control", /\b(stun|silence|freeze|root|sleep|charm|taunt|knock)\w*\b/.test(text));
  add("AoE", /\b(all enemies|nearby enemies|in a large area|aoe)\b/.test(text));
  add("Energy", /\benergy\b/.test(text));
  add("Cooldown", /\b(cooldown|cd)\b/.test(text));
  add("Backline", /\b(farthest enemy|back row|rear row|behind|teleport|blink)\b/.test(text));
  add("Def Down", /\b(reduce defense|defense down|armor down|vulnerab)\w*\b/.test(text));

  return tags.slice(0, 3);
}

/**
 * Concatenates all skill and relic text for a hero
 */
export function fullSkillText(hero) {
  const parts = [];
  for (const sk of (hero?.skills || [])) {
    if (sk?.description) parts.push(sk.description);
    if (sk?.upgrades) parts.push(...Object.values(sk.upgrades));
  }
  if (hero?.relic?.description) parts.push(hero.relic.description);
  if (hero?.relic?.upgrades) parts.push(...Object.values(hero.relic.upgrades));
  return parts.join(" ");
}

/**
 * Escapes special regex characters in a string
 * @private
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

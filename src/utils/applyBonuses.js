/**
 * Apply account stat preset to a hero's stats.
 *
 * When a preset has stats, those values REPLACE the hero's base stats
 * (they represent the total, not an additive bonus). When the preset
 * is empty ("none"), the hero's original stats are returned unchanged.
 *
 * @param {object} heroStats - The hero's base stats object (26 fields)
 * @param {object} presetStats - Total stat values keyed by stat name. Empty object = no change.
 * @returns {object} New stats object (never mutates original)
 */
export function applyBonuses(heroStats, presetStats) {
  if (!presetStats || Object.keys(presetStats).length === 0) {
    return { ...heroStats };
  }

  const result = { ...heroStats };

  for (const [stat, value] of Object.entries(presetStats)) {
    if (stat in result) {
      result[stat] = Number(value || 0);
    }
  }

  return result;
}

/**
 * Look up a preset's stats by key from the accountBonuses config.
 *
 * @param {object} accountBonusesConfig - The parsed accountBonuses.json
 * @param {string} presetKey - Preset key (e.g. "none", "example")
 * @returns {object} The stats object for that preset (empty object if not found)
 */
export function getPresetBonuses(accountBonusesConfig, presetKey) {
  const preset = accountBonusesConfig?.presets?.[presetKey];
  return preset?.stats ?? {};
}

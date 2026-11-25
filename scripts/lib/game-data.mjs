// Validation for the JSON files the Android agent delivers (see
// docs/superpowers/specs/2026-10-28-phase1-data-contract-design.md).
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORIES = new Set(["banners", "events", "leaderboards", "recurring", "offers"]);
// The game client uses 2099 as "not scheduled"; those must arrive as null.
const isPlaceholderDate = (value) => value.startsWith("2099-");

/** @returns {string[]} one message per problem, empty when the data is valid */
export function validateHeroReleases(data) {
  const errors = [];
  const seen = new Set();
  for (const hero of data?.heroes ?? []) {
    if (seen.has(hero.gameId)) errors.push(`hero ${hero.gameId}: duplicate gameId`);
    seen.add(hero.gameId);
    for (const field of ["globalRelease", "cnRelease"]) {
      const value = hero[field];
      if (value === null || value === undefined) continue;
      if (!ISO_DATE.test(value)) errors.push(`hero ${hero.gameId}: ${field} "${value}" is not YYYY-MM-DD`);
      else if (isPlaceholderDate(value)) errors.push(`hero ${hero.gameId}: ${field} "${value}" is a placeholder, expected null`);
    }
  }
  return errors;
}

/**
 * @param {{ events?: object[] }} data
 * @param {Set<number>} knownGameIds game ids present in game_id_mapping.json
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateEvents(data, knownGameIds) {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  for (const event of data?.events ?? []) {
    const where = `event ${event.id}`;
    if (seen.has(event.id)) errors.push(`${where}: duplicate id`);
    seen.add(event.id);
    if (!CATEGORIES.has(event.category)) errors.push(`${where}: unknown category "${event.category}"`);
    const startOk = ISO_DATE.test(event.start ?? "");
    const endOk = ISO_DATE.test(event.end ?? "");
    if (!startOk || !endOk) errors.push(`${where}: start/end must be YYYY-MM-DD (got "${event.start}" / "${event.end}")`);
    else if (event.end < event.start) errors.push(`${where}: ends (${event.end}) before it starts (${event.start})`);
    if (event.heroGameId !== undefined && !knownGameIds.has(event.heroGameId)) {
      warnings.push(`${where}: heroGameId ${event.heroGameId} is not in game_id_mapping.json`);
    }
  }
  return { errors, warnings };
}

const CHAIN_KEYS = new Set(["odyssey", "chapters", "spire"]);
const REWARD_KINDS = new Set(["currency", "item", "equipment"]);

/**
 * odyssey.global.json: quest chains with rewards, plus feature unlocks.
 * Unresolved names are allowed (they are listed in data.unresolved and flagged on the page).
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateOdyssey(data) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(data?.chains) || !Array.isArray(data?.unlocks)) {
    return { errors: ["odyssey: chains and unlocks must be arrays"], warnings };
  }
  const seen = new Set();
  for (const chain of data.chains) {
    if (!CHAIN_KEYS.has(chain.key)) errors.push(`odyssey: unknown chain "${chain.key}"`);
    if (!chain.quests?.length) errors.push(`odyssey: chain ${chain.key} has no quests`);
    for (const quest of chain.quests ?? []) {
      const where = `quest ${quest.id}`;
      if (seen.has(quest.id)) errors.push(`${where}: duplicate id`);
      seen.add(quest.id);
      if (!quest.text) warnings.push(`${where}: no English text`);
      for (const reward of quest.rewards ?? []) {
        if (!REWARD_KINDS.has(reward.kind)) errors.push(`${where}: unknown reward kind "${reward.kind}"`);
        if (!reward.name) warnings.push(`${where}: unresolved reward ${reward.kind} ${reward.id}`);
      }
    }
  }
  const unlockIds = new Set();
  for (const unlock of data.unlocks) {
    if (unlockIds.has(unlock.id)) errors.push(`unlock ${unlock.id}: duplicate id`);
    unlockIds.add(unlock.id);
    if (!unlock.conditions || !Object.keys(unlock.conditions).length) errors.push(`unlock ${unlock.id}: no conditions`);
  }
  if (data.unresolved?.length) warnings.push(`odyssey: ${data.unresolved.length} text key(s) without English text`);
  return { errors, warnings };
}

const BOSS_MODES = new Set(["torment_rift", "grim_surge", "old_gods_calamity", "old_gods_return"]);

// bosses.global.json from export_bosses.py: rewards are [type, id, amount] triples that must
// resolve to an entry in data.items ("type/id").
export function validateBosses(data) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(data?.bosses) || typeof data?.items !== "object" || !data.items) {
    return { errors: ["bosses: bosses must be an array and items an object"], warnings };
  }
  const checkRewards = (list, where) => {
    for (const reward of list ?? []) {
      if (!Array.isArray(reward) || reward.length !== 3) {
        errors.push(`${where}: reward is not a [type, id, amount] triple`);
        continue;
      }
      const item = data.items[`${reward[0]}/${reward[1]}`];
      if (!item) errors.push(`${where}: reward ${reward[0]}/${reward[1]} missing from items`);
      else if (!item.name) warnings.push(`${where}: reward ${reward[0]}/${reward[1]} has no English name`);
    }
  };
  for (const boss of data.bosses) {
    const where = `boss ${boss.siteId ?? boss.clientName} (${boss.mode})`;
    if (!BOSS_MODES.has(boss.mode)) errors.push(`${where}: unknown mode`);
    if (!boss.siteId) warnings.push(`${where}: no site boss id`);
    const lists = [
      ...(boss.damageMilestones ?? []), ...(boss.recordMilestones ?? []), ...(boss.serverMilestones ?? []),
      ...(boss.dailyRanks ?? []), ...(boss.finalRanks ?? []),
      ...(boss.awakenings ?? []).flatMap((a) => [{ rewards: a.showRewards }, ...a.ranks]),
    ];
    if (!lists.length) errors.push(`${where}: no rewards`);
    for (const entry of lists) {
      checkRewards(entry.rewards, where);
      checkRewards(entry.topTeamExtra, where);
    }
    checkRewards(boss.showRewards, where);
  }
  for (const [key, item] of Object.entries(data.items)) {
    for (const option of item.choose?.options ?? []) {
      if (!data.items[`${option[0]}/${option[1]}`]) errors.push(`item ${key}: chest option ${option[0]}/${option[1]} missing from items`);
    }
  }
  if (data.unresolved?.length) warnings.push(`bosses: ${data.unresolved.length} text key(s) without English text`);
  return { errors, warnings };
}

// event_rewards.global.json: rewards per event id (currently leaderboards), item names/icons shared in "items".
export function validateEventRewards(data, eventIds = null) {
  const errors = [];
  const warnings = [];
  if (!data?.events || typeof data.events !== "object" || !data?.items || typeof data.items !== "object") {
    return { errors: ["event rewards: events and items must be objects"], warnings };
  }
  for (const [id, entry] of Object.entries(data.events)) {
    const where = `event rewards ${id}`;
    const checkRewards = (list) => {
      for (const reward of list ?? []) {
        if (!Array.isArray(reward) || reward.length !== 3) {
          errors.push(`${where}: reward is not a [type, id, amount] triple`);
          continue;
        }
        const item = data.items[`${reward[0]}/${reward[1]}`];
        if (!item) errors.push(`${where}: reward ${reward[0]}/${reward[1]} missing from items`);
        else if (!item.name) warnings.push(`${where}: reward ${reward[0]}/${reward[1]} has no English name`);
      }
    };
    if (entry.kind === "leaderboard") {
      if (!Array.isArray(entry.ranks) || !entry.ranks.length) errors.push(`${where}: no rank tiers`);
      for (const tier of entry.ranks ?? []) {
        if (!Number.isInteger(tier.from) || !Number.isInteger(tier.to) || tier.from > tier.to) {
          errors.push(`${where}: bad rank range ${tier.from}-${tier.to}`);
        }
        checkRewards(tier.rewards);
      }
    } else if (entry.kind === "wishlist") {
      if (!Array.isArray(entry.rewards) || !entry.rewards.length) errors.push(`${where}: empty wish list`);
      checkRewards(entry.rewards);
    } else {
      errors.push(`${where}: unknown kind ${entry.kind}`);
    }
    if (eventIds && !eventIds.has(Number(id))) warnings.push(`${where}: no matching event`);
  }
  if (data.unresolved?.length) warnings.push(`event rewards: ${data.unresolved.length} text key(s) without English text`);
  return { errors, warnings };
}

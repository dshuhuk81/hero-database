// Campaign (M26): chapters of authored stages on the existing battlefields. Pick a stage,
// pick a squad of up to `squadSize` heroes you own, win to unlock the next stage. A first
// clear pays the stage's rewards (currencies, heroes), a replay `repeatShare` of its
// currencies. Currencies level heroes (`heroLevels`), which raises their attack and health
// in campaign stages only. Static stage data lives in
// src/data/tdCampaign.json; the player's campaign progress is its own versioned section
// of the td:v1 save (`campaign`), separate from Free Play records. Divine Seals (first
// clears only) pay for summons: one banner that gives a hero the player does not own yet
// (src/data/tdSummon.json). Pure logic; the page module is page/campaign.ts.
export const CAMPAIGN_SAVE_VERSION = 3; // 1: owned, cleared, lastSquad; 2: + currencies, hero levels; 3: + Divine Seals, summons
export const CURRENCIES = ["gold", "heroXp", "divineSeals"];
export const CURRENCY_NAMES = { gold: "Gold", heroXp: "Hero XP", divineSeals: "Divine Seals" };
// Save version that introduced each currency: stages cleared under an older save are paid
// that currency's first-clear amount once on migration.
const CURRENCY_SINCE = { gold: 2, heroXp: 2, divineSeals: 3 };
// Currencies only a first clear pays; replays pay a share of the others.
const FIRST_CLEAR_ONLY = ["divineSeals"];

// Every stage in play order, with its chapter.
export function allStages(campaign) {
  return campaign.chapters.flatMap((chapter) => chapter.stages.map((stage) => ({ ...stage, chapter: chapter.id })));
}

export function stageById(campaign, id) {
  return allStages(campaign).find((stage) => stage.id === id) ?? null;
}

// Fresh progress: the starter heroes, nothing cleared.
export function newCampaignProgress(campaign) {
  return { version: CAMPAIGN_SAVE_VERSION, owned: [...campaign.starters], cleared: {}, lastSquad: [], currencies: Object.fromEntries(CURRENCIES.map((id) => [id, 0])), levels: {}, summons: 0 };
}

export const isCleared = (progress, stageId) => !!progress.cleared[stageId];

export function isUnlocked(progress, stage) {
  return !stage.unlockAfter || isCleared(progress, stage.unlockAfter);
}

// The first stage not cleared yet that is open (the campaign screen's suggestion).
export function nextStage(campaign, progress) {
  return allStages(campaign).find((stage) => isUnlocked(progress, stage) && !isCleared(progress, stage.id)) ?? null;
}

// A squad is valid when it has 1..squadSize distinct owned heroes.
export function validSquad(campaign, progress, squad) {
  const ids = [...new Set(squad)];
  return ids.length >= 1 && ids.length <= campaign.squadSize && ids.length === squad.length && ids.every((id) => progress.owned.includes(id));
}

// Options for new TowerDefenseGame(...) on top of heroes, tuning and map. The stage's own
// waves replace tdWaves.json; classic mode plays exactly that list.
// `heroes`: the run's hero list with campaign levels applied (campaignHeroes), if any.
export function stageGameOptions(stage, squad, seed = Math.floor(Math.random() * 2 ** 31), heroes = null) {
  return {
    ...(heroes && { heroes }),
    mode: "classic",
    tier: "normal",
    seed: seed >>> 0,
    waves: stage.waves,
    allowedHeroes: squad,
    lives: stage.lives,
    hpScale: stage.hpScale ?? 1,
  };
}

// Rewards this version understands: known currencies and heroes not owned yet. Other reward
// types stay in the data for later versions and are ignored here.
const known = (reward, progress) => (reward.type === "currency" && CURRENCIES.includes(reward.id) && reward.amount > 0)
  || (reward.type === "hero" && !progress.owned.includes(reward.id));

// What the first clear of a stage would pay now.
export function pendingRewards(stage, progress) {
  return (stage.rewards ?? []).filter((reward) => known(reward, progress));
}

// What a replay pays: `repeatShare` of the stage's currencies (not Divine Seals), no heroes.
export function repeatRewards(campaign, stage) {
  return (stage.rewards ?? []).filter((reward) => reward.type === "currency" && CURRENCIES.includes(reward.id) && !FIRST_CLEAR_ONLY.includes(reward.id))
    .map((reward) => ({ ...reward, amount: Math.max(1, Math.round(reward.amount * (campaign.repeatShare ?? 0))) }))
    .filter((reward) => (campaign.repeatShare ?? 0) > 0);
}

// Applies rewards to progress (generic: currencies add up, heroes join).
export function grantRewards(progress, rewards) {
  const currencies = { ...progress.currencies };
  const owned = [...progress.owned];
  for (const reward of rewards) {
    if (reward.type === "currency" && CURRENCIES.includes(reward.id)) currencies[reward.id] = (currencies[reward.id] || 0) + reward.amount;
    else if (reward.type === "hero" && !owned.includes(reward.id)) owned.push(reward.id);
  }
  return { ...progress, currencies, owned };
}

// "+200 Gold, +100 Hero XP, Skadi" (heroName maps ids to display names).
export function rewardText(rewards, heroName = (id) => id) {
  return rewards.map((reward) => reward.type === "currency" ? `+${reward.amount} ${CURRENCY_NAMES[reward.id] ?? reward.id}` : heroName(reward.id)).join(", ");
}

// --- Hero levels ---
export const heroLevel = (progress, id) => progress.levels?.[id] ?? 1;

// Cost to go from `level` to level + 1, or null at the cap.
export function levelUpCost(campaign, level) {
  const cfg = campaign.heroLevels;
  if (!cfg || level >= cfg.max) return null;
  return Object.fromEntries(Object.entries(cfg.cost).map(([id, { base, perLevel }]) => [id, base + perLevel * (level - 1)]));
}

export function canLevelUp(campaign, progress, id) {
  const cost = levelUpCost(campaign, heroLevel(progress, id));
  return !!cost && progress.owned.includes(id) && Object.entries(cost).every(([currency, amount]) => (progress.currencies[currency] || 0) >= amount);
}

// Pays and raises the level; returns the new progress or null when not possible.
export function levelUp(campaign, progress, id) {
  if (!canLevelUp(campaign, progress, id)) return null;
  const level = heroLevel(progress, id);
  const cost = levelUpCost(campaign, level);
  const currencies = { ...progress.currencies };
  for (const [currency, amount] of Object.entries(cost)) currencies[currency] -= amount;
  return { ...progress, currencies, levels: { ...progress.levels, [id]: level + 1 } };
}

// Attack and health multiplier of a campaign level.
export const levelScale = (campaign, level) => 1 + (campaign.heroLevels?.statPerLevel ?? 0) * (level - 1);

// The run's hero list with campaign levels applied to attack and health.
export function campaignHeroes(campaign, progress, heroes) {
  return heroes.map((hero) => {
    const scale = levelScale(campaign, heroLevel(progress, hero.id));
    return scale === 1 ? hero : { ...hero, atk: Math.round(hero.atk * scale), hp: Math.round(hero.hp * scale), campaignLevel: heroLevel(progress, hero.id) };
  });
}

// --- Summoning ---
// Heroes a stage gives on its first clear. The summon banner leaves them out, so a stage's
// hero reward is never taken by a summon first.
export function stageRewardHeroes(campaign) {
  return [...new Set(allStages(campaign).flatMap((stage) => (stage.rewards ?? []).filter((reward) => reward.type === "hero").map((reward) => reward.id)))];
}

const heroIdOf = (hero) => (typeof hero === "string" ? hero : hero.id);

export const bannerById = (summonCfg, bannerId) => summonCfg?.banners?.find((banner) => banner.id === bannerId) ?? null;

// Heroes a summon can give: every roster hero (ids or hero objects) not owned yet.
export function summonPool(progress, heroes) {
  return heroes.map(heroIdOf).filter((id) => !progress.owned.includes(id));
}

// A banner's pool ("locked": heroes not owned yet; the only kind so far).
function bannerPool(banner, progress, heroes) {
  return banner?.pool === "locked" ? summonPool(progress, heroes) : [];
}

export const canAfford = (progress, cost) => Object.entries(cost ?? {}).every(([id, amount]) => (progress.currencies[id] || 0) >= amount);

export function canSummon(summonCfg, bannerId, progress, heroes) {
  const banner = bannerById(summonCfg, bannerId);
  return !!banner && bannerPool(banner, progress, heroes).length > 0 && canAfford(progress, banner.cost);
}

// Pays the banner's cost and adds a uniformly random hero from its pool (always a new one).
// Returns { progress, heroId }, or null when the banner is unknown, the pool is empty or
// the wallet is short. `rng` returns [0, 1) (injectable for tests).
export function summon(summonCfg, bannerId, progress, heroes, rng = Math.random) {
  if (!canSummon(summonCfg, bannerId, progress, heroes)) return null;
  const banner = bannerById(summonCfg, bannerId);
  const pool = bannerPool(banner, progress, heroes);
  const heroId = pool[Math.min(pool.length - 1, Math.max(0, Math.floor(rng() * pool.length)))];
  const currencies = { ...progress.currencies };
  for (const [id, amount] of Object.entries(banner.cost ?? {})) currencies[id] -= amount;
  return { progress: { ...progress, currencies, owned: [...progress.owned, heroId], summons: (progress.summons || 0) + 1 }, heroId };
}

// After a stage: a win records the clear (best lives kept) and pays the first-clear or the
// replay rewards. A loss changes nothing. Returns the new progress, whether it was a first
// clear, the rewards granted and the stage it unlocked.
export function finishCampaignStage(campaign, progress, stageId, { won, lives }) {
  const stage = stageById(campaign, stageId);
  if (!stage || !won) return { progress, firstClear: false, granted: [], unlocked: null };
  const before = progress.cleared[stageId];
  const firstClear = !before;
  const granted = firstClear ? pendingRewards(stage, progress) : repeatRewards(campaign, stage);
  const next = {
    ...grantRewards(progress, granted),
    cleared: { ...progress.cleared, [stageId]: { clears: (before?.clears ?? 0) + 1, bestLives: Math.max(before?.bestLives ?? 0, lives) } },
  };
  const unlocked = firstClear ? allStages(campaign).find((entry) => entry.unlockAfter === stageId) ?? null : null;
  return { progress: next, firstClear, granted, unlocked };
}

// Save shape check and migration. Unknown heroes and stages are dropped, starters are
// always owned, and a missing or older section becomes a valid current one.
export function sanitizeCampaign(value, campaign, heroIds) {
  const fresh = newCampaignProgress(campaign);
  if (!value || typeof value !== "object") return fresh;
  const stageIds = new Set(allStages(campaign).map((stage) => stage.id));
  const owned = [...new Set([...fresh.owned, ...(Array.isArray(value.owned) ? value.owned : [])])].filter((id) => heroIds.has(id));
  const cleared = {};
  for (const [id, entry] of Object.entries(value.cleared ?? {})) {
    if (!stageIds.has(id) || !entry || typeof entry !== "object") continue;
    cleared[id] = { clears: Math.max(1, Math.floor(Number(entry.clears) || 1)), bestLives: Math.max(0, Math.floor(Number(entry.bestLives) || 0)) };
  }
  const lastSquad = (Array.isArray(value.lastSquad) ? [...new Set(value.lastSquad)] : []).filter((id) => owned.includes(id)).slice(0, campaign.squadSize);
  // Version 1 had no currencies or levels: they start at zero and level 1.
  const currencies = Object.fromEntries(CURRENCIES.map((id) => [id, Math.max(0, Math.floor(Number(value.currencies?.[id]) || 0))]));
  // Stages cleared under an older version did not pay the currencies added since (version 1:
  // all of them, version 2: Divine Seals); those first-clear amounts are paid once now.
  const version = Number(value.version) || 1;
  for (const stage of allStages(campaign)) {
    if (!cleared[stage.id]) continue;
    for (const reward of stage.rewards ?? []) {
      if (reward.type === "currency" && CURRENCIES.includes(reward.id) && version < CURRENCY_SINCE[reward.id]) currencies[reward.id] += Math.max(0, Math.floor(Number(reward.amount) || 0));
    }
  }
  const max = campaign.heroLevels?.max ?? 1;
  const levels = {};
  for (const [id, level] of Object.entries(value.levels ?? {})) {
    const n = Math.min(max, Math.floor(Number(level) || 1));
    if (owned.includes(id) && n > 1) levels[id] = n;
  }
  const summons = Math.max(0, Math.floor(Number(value.summons) || 0));
  return { version: CAMPAIGN_SAVE_VERSION, owned, cleared, lastSquad, currencies, levels, summons };
}

// Campaign (M26): chapters of authored stages on the existing battlefields. Pick a stage,
// pick a squad of up to `squadSize` heroes you own, win to unlock the next stage. A first
// clear pays the stage's rewards (currencies, heroes), a replay `repeatShare` of its
// currencies. Currencies level heroes (`heroLevels`), which raises their attack and health
// in campaign stages only. Static stage data lives in
// src/data/tdCampaign.json; the player's campaign progress is its own versioned section
// of the td:v1 save (`campaign`), separate from Free Play records. Divine Seals (first
// clears, the Daily Trial goal and finished Expeditions) pay for summons: one banner that gives a hero the player does not own yet
// (src/data/tdSummon.json). Pure logic; the page module is page/campaign.ts.
export const CAMPAIGN_SAVE_VERSION = 4; // 1: owned, cleared, lastSquad; 2: + currencies, hero levels; 3: + Divine Seals, summons; 4: + copies, stars, evolution, Seal Dust, Divine Essence
export const CURRENCIES = ["gold", "heroXp", "divineSeals", "sealDust", "divineEssence"];
export const CURRENCY_NAMES = { gold: "Gold", heroXp: "Hero XP", divineSeals: "Divine Seals", sealDust: "Seal Dust", divineEssence: "Divine Essence" };
// Save version that introduced each currency: stages cleared under an older save are paid
// that currency's first-clear amount once on migration.
const CURRENCY_SINCE = { gold: 2, heroXp: 2, divineSeals: 3, sealDust: 4, divineEssence: 4 };
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
  return { version: CAMPAIGN_SAVE_VERSION, owned: [...campaign.starters], cleared: {}, lastSquad: [], currencies: Object.fromEntries(CURRENCIES.map((id) => [id, 0])), levels: {}, summons: 0, copies: {}, stars: {}, evolution: {} };
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

// --- Stars (M28): spare copies of any hero + Gold raise a hero's attack and health ---
export const heroStars = (progress, id) => progress.stars?.[id] ?? 1;
export const starScale = (campaign, stars) => 1 + (campaign.heroStars?.statPerStar ?? 0) * (stars - 1);

// Cost to go from `stars` to stars + 1: { copies, gold }, or null at the cap.
export function starUpCost(campaign, stars) {
  const cfg = campaign.heroStars;
  if (!cfg || stars >= cfg.max) return null;
  return { copies: cfg.copies[stars - 1], gold: cfg.gold[stars - 1] };
}

// Spare copies still needed for a hero's remaining Evolution tiers.
const evolutionNeed = (campaign, progress, id) => Math.max(0, evolutionMax(campaign) - heroEvolution(progress, id));

// Quick add: `count` spare copies, taken only from copies no Evolution still needs (most
// plentiful first). Returns { heroId: n } or null when there are not enough.
export function autoFodder(campaign, progress, count) {
  const surplus = Object.entries(progress.copies ?? {})
    .map(([id, n]) => [id, n - evolutionNeed(campaign, progress, id)])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const pick = {};
  let left = count;
  for (const [id, n] of surplus) {
    if (!left) break;
    const take = Math.min(n, left);
    pick[id] = take;
    left -= take;
  }
  return left ? null : pick;
}

// Pays the star cost with the chosen copies ({ heroId: n }, exactly the cost's count) and
// raises the stars. Returns the new progress or null when not possible.
export function starUp(campaign, progress, id, fodder) {
  const cost = starUpCost(campaign, heroStars(progress, id));
  if (!cost || !progress.owned.includes(id) || (progress.currencies.gold || 0) < cost.gold) return null;
  const entries = Object.entries(fodder ?? {}).filter(([, n]) => n > 0);
  if (entries.reduce((sum, [, n]) => sum + n, 0) !== cost.copies) return null;
  if (entries.some(([hid, n]) => !Number.isInteger(n) || (progress.copies?.[hid] ?? 0) < n)) return null;
  const copies = { ...progress.copies };
  for (const [hid, n] of entries) { copies[hid] -= n; if (!copies[hid]) delete copies[hid]; }
  return { ...progress, copies, currencies: { ...progress.currencies, gold: progress.currencies.gold - cost.gold }, stars: { ...progress.stars, [id]: heroStars(progress, id) + 1 } };
}

// --- Evolution (M28): a copy of the same hero (or Divine Essence) improves its skill ---
export const heroEvolution = (progress, id) => progress.evolution?.[id] ?? 0;
export const evolutionMax = (campaign) => campaign.heroEvolution?.tiers?.length ?? 0;

// What evolving would spend now: "copy" (a copy of the hero first), "essence", or null.
export function evolutionMaterial(campaign, progress, id) {
  if (!progress.owned.includes(id) || heroEvolution(progress, id) >= evolutionMax(campaign)) return null;
  if ((progress.copies?.[id] ?? 0) > 0) return "copy";
  return (progress.currencies.divineEssence || 0) > 0 ? "essence" : null;
}

// Spends a copy of the hero (or, with `useEssence` or no copy, 1 Divine Essence) and
// raises its Evolution tier. Returns the new progress or null when not possible.
export function evolve(campaign, progress, id, useEssence = false) {
  const material = useEssence ? ((progress.currencies.divineEssence || 0) > 0 && evolutionMaterial(campaign, progress, id) ? "essence" : null) : evolutionMaterial(campaign, progress, id);
  if (!material) return null;
  const next = { ...progress, evolution: { ...progress.evolution, [id]: heroEvolution(progress, id) + 1 } };
  if (material === "copy") {
    const copies = { ...progress.copies, [id]: progress.copies[id] - 1 };
    if (!copies[id]) delete copies[id];
    return { ...next, copies };
  }
  return { ...next, currencies: { ...progress.currencies, divineEssence: progress.currencies.divineEssence - 1 } };
}

// Sum of the unlocked tiers' bonuses: { ultPower, crit, ultCooldown, awakenedUlt }.
export function evolutionBonus(campaign, tier) {
  const bonus = { ultPower: 0, crit: 0, ultCooldown: 0, awakenedUlt: false };
  for (const entry of (campaign.heroEvolution?.tiers ?? []).slice(0, tier)) {
    bonus.ultPower += entry.ultPower ?? 0;
    bonus.crit += entry.crit ?? 0;
    bonus.ultCooldown += entry.ultCooldown ?? 0;
    bonus.awakenedUlt ||= !!entry.awakenedUlt;
  }
  return bonus;
}

// --- Seal Dust (M28): spare copies become dust; dust buys Divine Seals or Divine Essence ---
// Converts `count` spare copies of a hero to Seal Dust (summonCfg.dust.perCopy each).
export function convertCopies(summonCfg, progress, id, count = 1) {
  const n = Math.floor(Number(count) || 0);
  const per = summonCfg?.dust?.perCopy ?? 0;
  if (n < 1 || !per || (progress.copies?.[id] ?? 0) < n) return null;
  const copies = { ...progress.copies, [id]: progress.copies[id] - n };
  if (!copies[id]) delete copies[id];
  return { ...progress, copies, currencies: { ...progress.currencies, sealDust: (progress.currencies.sealDust || 0) + n * per } };
}

// Exchanges Seal Dust for `count` Divine Seals ("seals", dust.perSeal each) or Divine
// Essence ("essence", dust.perEssence each). Returns the new progress or null.
export function exchangeDust(summonCfg, progress, kind, count = 1) {
  const n = Math.floor(Number(count) || 0);
  const price = kind === "seals" ? summonCfg?.dust?.perSeal : kind === "essence" ? summonCfg?.dust?.perEssence : 0;
  const target = kind === "seals" ? "divineSeals" : "divineEssence";
  if (n < 1 || !price || (progress.currencies.sealDust || 0) < n * price) return null;
  return { ...progress, currencies: { ...progress.currencies, sealDust: progress.currencies.sealDust - n * price, [target]: (progress.currencies[target] || 0) + n } };
}

// The run's hero list with campaign levels and stars applied to attack and health and
// Evolution to the ultimate and crit (campaign stages only).
export function campaignHeroes(campaign, progress, heroes) {
  return heroes.map((hero) => {
    const level = heroLevel(progress, hero.id), stars = heroStars(progress, hero.id), tier = heroEvolution(progress, hero.id);
    const scale = levelScale(campaign, level) * starScale(campaign, stars);
    if (scale === 1 && !tier) return hero;
    const bonus = evolutionBonus(campaign, tier);
    return {
      ...hero,
      atk: Math.round(hero.atk * scale),
      hp: Math.round(hero.hp * scale),
      ultPower: +(hero.ultPower * (1 + bonus.ultPower)).toFixed(4),
      critChance: +(hero.critChance + bonus.crit).toFixed(4),
      ultCooldown: +(hero.ultCooldown * (1 + bonus.ultCooldown)).toFixed(3),
      ...(bonus.awakenedUlt && { awakenedUlt: true }),
      campaignLevel: level,
      campaignStars: stars,
      campaignEvolution: tier,
    };
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

// Featured heroes rotate on a fixed schedule authored by the banner. Keeping the
// calculation in the rules layer makes the displayed target and the actual odds agree.
export function featuredHeroId(banner, now = Date.now()) {
  const rotation = banner?.featuredRotation ?? [];
  const days = Math.max(1, Number(banner?.rotationDays) || 14);
  const epoch = Date.parse(banner?.rotationEpoch ?? "");
  if (!rotation.length) return null;
  const elapsed = Number.isFinite(epoch) ? Math.max(0, now - epoch) : 0;
  return rotation[Math.floor(elapsed / (days * 86400000)) % rotation.length];
}

export function featuredChance(banner, progress, heroes, now = Date.now()) {
  const pool = bannerPool(banner, progress, heroes);
  const featured = featuredHeroId(banner, now);
  if (!featured || !pool.includes(featured)) return 0;
  const weight = Math.max(1, Number(banner.featuredWeight) || 1);
  return weight / (weight + pool.length - 1);
}

// Heroes a summon can give: every roster hero (ids or hero objects) not owned yet.
export function summonPool(progress, heroes) {
  return heroes.map(heroIdOf).filter((id) => !progress.owned.includes(id));
}

// A banner's pool. "locked": heroes not owned yet (no duplicates). "all": every hero passed
// in, owned or not; an owned hero drawn again becomes a spare copy (M28).
function bannerPool(banner, progress, heroes) {
  if (banner?.pool === "all") return heroes.map(heroIdOf);
  return banner?.pool === "locked" ? summonPool(progress, heroes) : [];
}
const withReplacement = (banner) => banner?.pool === "all";

export const canAfford = (progress, cost) => Object.entries(cost ?? {}).every(([id, amount]) => (progress.currencies[id] || 0) >= amount);

export function canSummon(summonCfg, bannerId, progress, heroes) {
  const banner = bannerById(summonCfg, bannerId);
  return !!banner && bannerPool(banner, progress, heroes).length > 0 && canAfford(progress, banner.cost);
}

// How many heroes the banner's multi summon gives right now: `multiCount`, or (on a
// "locked" banner) fewer when fewer new heroes are left. 0 when the wallet is short.
export function multiSummonCount(summonCfg, bannerId, progress, heroes) {
  const banner = bannerById(summonCfg, bannerId);
  if (!banner) return 0;
  const pool = bannerPool(banner, progress, heroes).length;
  const count = Math.min(Math.max(1, Number(banner.multiCount) || 10), withReplacement(banner) && pool ? Infinity : pool);
  return count > 0 && canAfford(progress, scaleCost(banner.cost, count)) ? count : 0;
}

const scaleCost = (cost, count) => Object.fromEntries(Object.entries(cost ?? {}).map(([id, amount]) => [id, amount * count]));

// Pays `count` times the banner's cost and draws `count` heroes one after another. The
// current featured hero has the authored weight; every other hero has weight 1. A "locked"
// banner draws without replacement (new heroes only); an "all" banner with replacement:
// a hero not owned yet joins, an owned one adds a spare copy. Returns
// { progress, heroIds, isNew }, or null when the banner is unknown, a "locked" pool has
// fewer than `count` heroes or the wallet is short. `rng` returns [0, 1) (injectable).
export function summonMany(summonCfg, bannerId, progress, heroes, count = 1, rng = Math.random) {
  const banner = bannerById(summonCfg, bannerId);
  const n = Math.floor(Number(count) || 0);
  if (!banner || n < 1) return null;
  let pool = bannerPool(banner, progress, heroes);
  const cost = scaleCost(banner.cost, n);
  if (!pool.length || (!withReplacement(banner) && pool.length < n) || !canAfford(progress, cost)) return null;
  const featured = featuredHeroId(banner);
  const featuredWeight = Math.max(1, Number(banner.featuredWeight) || 1);
  const heroIds = [];
  const owned = [...progress.owned];
  const copies = { ...progress.copies };
  const isNew = [];
  for (let i = 0; i < n; i += 1) {
    const ordered = featured && pool.includes(featured) ? [featured, ...pool.filter((id) => id !== featured)] : pool;
    const totalWeight = ordered.reduce((sum, id) => sum + (id === featured ? featuredWeight : 1), 0);
    let roll = Math.min(.999999999, Math.max(0, rng())) * totalWeight;
    let heroId = ordered.at(-1);
    for (const id of ordered) {
      roll -= id === featured ? featuredWeight : 1;
      if (roll < 0) { heroId = id; break; }
    }
    heroIds.push(heroId);
    isNew.push(!owned.includes(heroId));
    if (owned.includes(heroId)) copies[heroId] = (copies[heroId] || 0) + 1;
    else owned.push(heroId);
    if (!withReplacement(banner)) pool = pool.filter((id) => id !== heroId);
  }
  const currencies = { ...progress.currencies };
  for (const [id, amount] of Object.entries(cost)) currencies[id] -= amount;
  return { progress: { ...progress, currencies, owned, copies, summons: (progress.summons || 0) + n }, heroIds, isNew };
}

// One summon: { progress, heroId }, or null (see summonMany).
export function summon(summonCfg, bannerId, progress, heroes, rng = Math.random) {
  const result = summonMany(summonCfg, bannerId, progress, heroes, 1, rng);
  return result && { progress: result.progress, heroId: result.heroIds[0] };
}

// Divine Seals paid outside the campaign (Daily Trial goal, finished Expedition), from
// tdSummon.json "sealSources". Returns the new progress.
export function addSeals(progress, amount) {
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  return n ? { ...progress, currencies: { ...progress.currencies, divineSeals: (progress.currencies.divineSeals || 0) + n } } : progress;
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
  // Version 3 had no copies, stars or Evolution: they start empty (1 star, tier 0).
  const counts = (obj, min, max, keep) => Object.fromEntries(Object.entries(obj && typeof obj === "object" ? obj : {})
    .map(([id, n]) => [id, Math.min(max, Math.floor(Number(n) || 0))])
    .filter(([id, n]) => keep(id) && n >= min));
  const copies = counts(value.copies, 1, Infinity, (id) => heroIds.has(id));
  const stars = counts(value.stars, 2, campaign.heroStars?.max ?? 1, (id) => owned.includes(id));
  const evolution = counts(value.evolution, 1, campaign.heroEvolution?.tiers?.length ?? 0, (id) => owned.includes(id));
  return { version: CAMPAIGN_SAVE_VERSION, owned, cleared, lastSquad, currencies, levels, summons, copies, stars, evolution };
}

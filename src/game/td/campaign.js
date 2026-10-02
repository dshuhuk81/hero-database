// Campaign (M26): chapters of authored stages on the existing battlefields. Pick a stage,
// pick a squad of up to `squadSize` heroes you own, win to unlock the next stage. A first
// clear pays the stage's rewards (currencies, heroes), a replay `repeatShare` of its
// currencies. Currencies level heroes (`heroLevels`), which raises their attack and health
// in every mode (global stats). Static stage data lives in
// src/data/tdCampaign.json; the player's campaign progress is its own versioned section
// of the td:v1 save (`campaign`), separate from Free Play records. Divine Seals (first
// clears, replays at a quarter, the Daily Trial goal and finished Expeditions) pay for summons: one banner that gives a hero the player does not own yet
// (src/data/tdSummon.json). Pure logic; the page module is page/campaign.ts.
import heroBalance from "../../data/gameBalance.json" with { type: "json" };

export const CAMPAIGN_SAVE_VERSION = 9; // 1: owned, cleared, lastSquad; 2: + currencies, hero levels; 3: + Divine Seals, summons; 4: + copies, stars, evolution, Seal Dust, Divine Essence; 5: stars count from 0, level cap by stars; 6: independently upgradeable skills; 7: Divine Essence merged into Seal Dust (mechanics overview recommendation 8); 8: + paid chapter milestones; 9: + Heroic clears
export const CURRENCIES = ["gold", "heroXp", "divineSeals", "sealDust"];
export const CURRENCY_NAMES = { gold: "Gold", heroXp: "Hero XP", divineSeals: "Divine Seals", sealDust: "Seal Dust" };
// Save version that introduced each currency: stages cleared under an older save are paid
// that currency's first-clear amount once on migration.
const CURRENCY_SINCE = { gold: 2, heroXp: 2, divineSeals: 3, sealDust: 4 };
// Currencies only a first clear pays; replays pay a share of the others. Empty since
// September 28, 2026: replays pay repeatShare of Divine Seals too (owner feedback — with
// one chapter, first clears alone (600 seals) made summoning feel impossible).
const FIRST_CLEAR_ONLY = [];

// Every stage in play order, with its chapter.
export function allStages(campaign) {
  return campaign.chapters.flatMap((chapter) => chapter.stages.map((stage) => ({ ...stage, chapter: chapter.id })));
}

export function stageById(campaign, id) {
  return allStages(campaign).find((stage) => stage.id === id) ?? null;
}

// Fresh progress: the starter heroes, nothing cleared.
export function newCampaignProgress(campaign) {
  return { version: CAMPAIGN_SAVE_VERSION, owned: [...campaign.starters], cleared: {}, lastSquad: [], currencies: Object.fromEntries(CURRENCIES.map((id) => [id, 0])), levels: {}, summons: 0, copies: {}, stars: {}, evolution: {}, skillLevels: {}, milestones: {}, heroic: {} };
}

export const isCleared = (progress, stageId) => !!progress.cleared[stageId];

export function isUnlocked(progress, stage, override = false) {
  return override || !stage.unlockAfter || isCleared(progress, stage.unlockAfter);
}

// The first stage not cleared yet that is open (the campaign screen's suggestion).
export function nextStage(campaign, progress) {
  return allStages(campaign).find((stage) => isUnlocked(progress, stage) && !isCleared(progress, stage.id)) ?? null;
}

// The chapter the player is in (audit step 4): the one holding the next stage, or the last
// chapter once everything is cleared. Home card, summary and route count only its stages.
export function currentChapter(campaign, progress) {
  const next = nextStage(campaign, progress);
  return campaign.chapters.find((chapter) => chapter.stages.some((stage) => stage.id === next?.id)) ?? campaign.chapters.at(-1);
}

// A squad is valid when it has 1..squadSize distinct owned heroes.
export function validSquad(campaign, progress, squad) {
  const ids = [...new Set(squad)];
  return ids.length >= 1 && ids.length <= campaign.squadSize && ids.length === squad.length && ids.every((id) => progress.owned.includes(id));
}

// Options for new TowerDefenseGame(...) on top of heroes, tuning and map. The stage's own
// waves replace tdWaves.json; classic mode plays exactly that list.
// `heroes`: the run's hero list with campaign levels applied (collectionHeroes), if any.
// `heroic`: the stage's Heroic version (the Heroic tier: tuning.tiers.heroic).
export function stageGameOptions(stage, squad, seed = Math.floor(Math.random() * 2 ** 31), heroes = null, heroic = false) {
  return {
    ...(heroes && { heroes }),
    mode: "classic",
    tier: heroic ? "heroic" : "normal",
    seed: seed >>> 0,
    waves: stage.waves,
    allowedHeroes: squad,
    lives: stage.lives,
    hpScale: stage.hpScale ?? 1,
  };
}

// Rewards this version understands. Other reward types stay in the data for later versions
// and are ignored here. An already-owned first-clear hero becomes a spare copy.
const known = (reward) => (reward.type === "currency" && CURRENCIES.includes(reward.id) && reward.amount > 0)
  || reward.type === "hero";

// What the first clear of a stage would pay now.
export function pendingRewards(stage, progress) {
  return (stage.rewards ?? []).filter((reward) => known(reward) && (reward.type !== "hero" || !progress.cleared?.[stage.id]));
}

// What a replay pays: `repeatShare` of the stage's currencies (not Divine Seals), no heroes.
export function repeatRewards(campaign, stage) {
  return (stage.rewards ?? []).filter((reward) => reward.type === "currency" && CURRENCIES.includes(reward.id) && !FIRST_CLEAR_ONLY.includes(reward.id))
    .map((reward) => ({ ...reward, amount: Math.max(1, Math.round(reward.amount * (campaign.repeatShare ?? 0))) }))
    .filter((reward) => (campaign.repeatShare ?? 0) > 0);
}

// Applies rewards to progress (generic: currencies add up, new heroes join, duplicates
// become spare copies).
export function grantRewards(progress, rewards) {
  const currencies = { ...progress.currencies };
  const owned = [...progress.owned];
  const copies = { ...progress.copies };
  for (const reward of rewards) {
    if (reward.type === "currency" && CURRENCIES.includes(reward.id)) currencies[reward.id] = (currencies[reward.id] || 0) + reward.amount;
    else if (reward.type === "hero" && owned.includes(reward.id)) copies[reward.id] = (copies[reward.id] || 0) + 1;
    else if (reward.type === "hero") owned.push(reward.id);
  }
  return { ...progress, currencies, owned, copies };
}

// "+200 Gold, +100 Hero XP, Skadi" (heroName maps ids to display names).
export function rewardText(rewards, heroName = (id) => id) {
  return rewards.map((reward) => reward.type === "currency" ? `+${reward.amount} ${CURRENCY_NAMES[reward.id] ?? reward.id}` : heroName(reward.id)).join(", ");
}

// --- Hero levels ---
export const heroLevel = (progress, id) => progress.levels?.[id] ?? 1;

// Cost to go from `level` to level + 1, or null at the cap.
// Level cap from stars (heroLevels.capByStars: 0 stars -> 10 ... 5 stars -> 60).
export const levelCap = (campaign, stars) => campaign.heroLevels?.capByStars?.[stars] ?? campaign.heroLevels?.max ?? 1;
export const heroLevelCap = (campaign, progress, id) => levelCap(campaign, heroStars(progress, id));

// Cost of level -> level + 1, or null at `cap` (the hero's star cap; default the absolute max).
export function levelUpCost(campaign, level, cap = campaign.heroLevels?.max ?? 1) {
  const cfg = campaign.heroLevels;
  if (!cfg || level >= Math.min(cap, cfg.max)) return null;
  return Object.fromEntries(Object.entries(cfg.cost).map(([id, { base, perLevel }]) => [id, base + perLevel * (level - 1)]));
}

export function canLevelUp(campaign, progress, id) {
  const cost = levelUpCost(campaign, heroLevel(progress, id), heroLevelCap(campaign, progress, id));
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

// Attack and health gained by the step to `level` (2+). statPerLevel is one rate per star band
// of bandSize levels (levels 2-10 band 0, 11-20 band 1, ...), so later levels add less.
export function levelStepGain(campaign, level) {
  const cfg = campaign.heroLevels ?? {};
  const rates = Array.isArray(cfg.statPerLevel) ? cfg.statPerLevel : [cfg.statPerLevel ?? 0];
  return rates[Math.min(rates.length - 1, Math.floor((level - 1) / (cfg.bandSize ?? 10)))] ?? 0;
}
// Attack and health multiplier of a campaign level.
export function levelScale(campaign, level) {
  let scale = 1;
  for (let l = 2; l <= level; l += 1) scale += levelStepGain(campaign, l);
  return scale;
}

// --- Stars (M26 sprint 9): duplicate copies of the hero + Gold raise attack and health ---
// Heroes start at 0 stars (save version 5; earlier saves counted from 1).
export const heroStars = (progress, id) => progress.stars?.[id] ?? 0;
export const starScale = (campaign, stars) => 1 + (campaign.heroStars?.statPerStar ?? 0) * stars;

// Cost to go from `stars` to stars + 1: { copies, gold }, or null at the cap.
export function starUpCost(campaign, stars) {
  const cfg = campaign.heroStars;
  if (!cfg || stars >= cfg.max) return null;
  return { copies: cfg.copies[stars], gold: cfg.gold[stars] };
}

// Quick add: `count` duplicate copies of `heroId` for its next star.
// Stars and Evolution share the same duplicate supply. Returns { heroId: n } or null.
/** @param {any} campaign @param {any} progress @param {number} count @param {string | null} [heroId] @returns {Record<string, number> | null} */
export function autoFodder(_campaign, progress, count, heroId = null) {
  if (!heroId || !Number.isInteger(count) || count < 1 || (progress.copies?.[heroId] ?? 0) < count) return null;
  return { [heroId]: count };
}

// Pays the star cost with duplicate copies of that hero ({ heroId: n }, exactly the cost's count) and
// raises the stars. Returns the new progress or null when not possible.
export function starUp(campaign, progress, id, fodder) {
  const cost = starUpCost(campaign, heroStars(progress, id));
  if (!cost || !progress.owned.includes(id) || (progress.currencies.gold || 0) < cost.gold) return null;
  const entries = Object.entries(fodder ?? {}).filter(([, n]) => n > 0);
  if (entries.reduce((sum, [, n]) => sum + n, 0) !== cost.copies) return null;
  if (entries.length !== 1 || entries[0][0] !== id || !Number.isInteger(entries[0][1]) || (progress.copies?.[id] ?? 0) < entries[0][1]) return null;
  const copies = { ...progress.copies };
  for (const [hid, n] of entries) { copies[hid] -= n; if (!copies[hid]) delete copies[hid]; }
  return { ...progress, copies, currencies: { ...progress.currencies, gold: progress.currencies.gold - cost.gold }, stars: { ...progress.stars, [id]: heroStars(progress, id) + 1 } };
}

// --- Evolution (M26 sprint 9): tier-specific duplicate costs (or Seal Dust) improve its skill ---
export const heroEvolution = (progress, id) => progress.evolution?.[id] ?? 0;
export const evolutionMax = (campaign) => campaign.heroEvolution?.tiers?.length ?? 0;
export const evolutionCopyCost = (campaign, tier) => campaign.heroEvolution?.tiers?.[tier]?.copies ?? 1;

// --- Might: one battle-power number per hero, from base attack + health scaled by level,
// stars and evolution tier (heroMight.evolutionPerTier in tdCampaign.json). Sorts the Heroes
// screen and sums to squad Might against a stage's recommendation.
export function heroMight(campaign, progress, hero) {
  const tier = heroEvolution(progress, hero.id);
  const evo = 1 + (campaign.heroMight?.evolutionPerTier ?? 0) * tier;
  const perSkill = campaign.heroSkillLevels?.passiveStatPerLevel ?? 0;
  const attackSkill = 1 + perSkill * (heroSkillLevel(progress, hero.id, "passiveAttack") - 1);
  const healthSkill = 1 + perSkill * (heroSkillLevel(progress, hero.id, "passiveHealth") - 1);
  return Math.round((hero.atk * attackSkill + hero.hp * healthSkill) * levelScale(campaign, heroLevel(progress, hero.id)) * starScale(campaign, heroStars(progress, hero.id)) * evo);
}

// What evolving would spend now: "copy" (the tier's required hero copies first), "dust"
// (heroEvolution.dustPrice Seal Dust), or null.
export function evolutionMaterial(campaign, progress, id) {
  const tier = heroEvolution(progress, id);
  if (!progress.owned.includes(id) || tier >= evolutionMax(campaign)) return null;
  if ((progress.copies?.[id] ?? 0) >= evolutionCopyCost(campaign, tier)) return "copy";
  const price = campaign.heroEvolution?.dustPrice ?? 0;
  return price > 0 && (progress.currencies.sealDust || 0) >= price ? "dust" : null;
}

// Spends the tier's configured hero copies or, with `useDust`, the flat Seal Dust price and
// raises its Evolution tier. Returns the new progress or null when not possible.
export function evolve(campaign, progress, id, useDust = false) {
  const price = campaign.heroEvolution?.dustPrice ?? 0;
  const tier = heroEvolution(progress, id);
  const copyCost = evolutionCopyCost(campaign, tier);
  const material = useDust ? (price > 0 && (progress.currencies.sealDust || 0) >= price && evolutionMaterial(campaign, progress, id) ? "dust" : null) : evolutionMaterial(campaign, progress, id);
  if (!material) return null;
  const next = { ...progress, evolution: { ...progress.evolution, [id]: tier + 1 } };
  if (material === "copy") {
    const copies = { ...progress.copies, [id]: progress.copies[id] - copyCost };
    if (!copies[id]) delete copies[id];
    return { ...next, copies };
  }
  return { ...next, currencies: { ...progress.currencies, sealDust: progress.currencies.sealDust - price } };
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

// --- Skills: the Ultimate and two class-flavoured passives level independently. Early
// ranks cost Gold; authored cost arrays can add a rare currency to later ranks.
export const SKILL_IDS = ["ultimate", "passiveAttack", "passiveHealth"];
export const heroSkillLevel = (progress, id, skillId) => progress.skillLevels?.[id]?.[skillId] ?? 1;

export function skillUpCost(campaign, progress, id, skillId) {
  if (!progress.owned.includes(id) || !SKILL_IDS.includes(skillId)) return null;
  const cfg = campaign.heroSkillLevels;
  const level = heroSkillLevel(progress, id, skillId);
  if (!cfg || level >= (cfg.max ?? 1)) return null;
  return Object.fromEntries(Object.entries(cfg.cost ?? {}).map(([currency, costs]) => [currency, Number(costs?.[level - 1]) || 0]).filter(([, amount]) => amount > 0));
}

export function canSkillUp(campaign, progress, id, skillId) {
  const cost = skillUpCost(campaign, progress, id, skillId);
  return !!cost && Object.entries(cost).every(([currency, amount]) => (progress.currencies[currency] || 0) >= amount);
}

export function skillUp(campaign, progress, id, skillId) {
  const cost = skillUpCost(campaign, progress, id, skillId);
  if (!cost || !canSkillUp(campaign, progress, id, skillId)) return null;
  const currencies = { ...progress.currencies };
  for (const [currency, amount] of Object.entries(cost)) currencies[currency] -= amount;
  return {
    ...progress,
    currencies,
    skillLevels: {
      ...progress.skillLevels,
      [id]: { ...progress.skillLevels?.[id], [skillId]: heroSkillLevel(progress, id, skillId) + 1 },
    },
  };
}

// --- Seal Dust (M26 sprint 9): spare copies become dust; dust buys Divine Seals ---
// Converts `count` spare copies of a hero to Seal Dust (summonCfg.dust.perCopy each).
export function convertCopies(summonCfg, progress, id, count = 1) {
  const n = Math.floor(Number(count) || 0);
  const per = summonCfg?.dust?.perCopy ?? 0;
  if (n < 1 || !per || (progress.copies?.[id] ?? 0) < n) return null;
  const copies = { ...progress.copies, [id]: progress.copies[id] - n };
  if (!copies[id]) delete copies[id];
  return { ...progress, copies, currencies: { ...progress.currencies, sealDust: (progress.currencies.sealDust || 0) + n * per } };
}

// Exchanges Seal Dust for `count` Divine Seals (dust.perSeal each). Returns the new
// progress or null. (Divine Essence was merged into Seal Dust in save version 7.)
export function exchangeDust(summonCfg, progress, kind, count = 1) {
  const n = Math.floor(Number(count) || 0);
  const price = kind === "seals" ? summonCfg?.dust?.perSeal : 0;
  if (n < 1 || !price || (progress.currencies.sealDust || 0) < n * price) return null;
  return { ...progress, currencies: { ...progress.currencies, sealDust: progress.currencies.sealDust - n * price, divineSeals: (progress.currencies.divineSeals || 0) + n } };
}

// Buys spare copies of an owned hero with Seal Dust (summonCfg.dust.copyPrice each),
// so duplicates always convert into targeted progress (mechanics overview
// recommendation 4). Returns the new progress, or null when the hero is not owned,
// no price is configured or the wallet is short.
export function buyCopiesWithDust(summonCfg, progress, heroId, count = 1) {
  const price = summonCfg?.dust?.copyPrice ?? 0;
  const n = Math.floor(Number(count) || 0);
  if (n < 1 || !price || !progress.owned.includes(heroId)) return null;
  if ((progress.currencies.sealDust || 0) < n * price) return null;
  return {
    ...progress,
    copies: { ...progress.copies, [heroId]: (progress.copies[heroId] || 0) + n },
    currencies: { ...progress.currencies, sealDust: progress.currencies.sealDust - n * price },
  };
}

// --- One collection for every mode (Phase 2, docs/tower-defense-home-camp-plan.md) ---
// Heroes are unlocked and upgraded through the campaign (the save key stays `campaign`).
// Free Play and Expedition use the owned heroes at base stats for now (decision 1c);
// the Daily Trial keeps the full roster so every player gets the same setup.
export const ownedHeroes = (progress, heroes) => heroes.filter((hero) => progress.owned.includes(hero.id));

// Gold and Hero XP a Free Play run or an Expedition stage pays into the collection:
// `collectionRewards.perWave` for each cleared wave, up to `maxWaves` per run. Never Divine
// Seals, so new heroes come no faster than before.
export function collectionReward(campaign, wavesCleared) {
  const cfg = campaign.collectionRewards;
  const waves = Math.max(0, Math.min(Math.floor(Number(wavesCleared) || 0), cfg?.maxWaves ?? Infinity));
  if (!cfg || !waves) return [];
  return Object.entries(cfg.perWave ?? {})
    .filter(([id, amount]) => CURRENCIES.includes(id) && id !== "divineSeals" && amount > 0)
    .map(([id, amount]) => ({ type: "currency", id, amount: Math.round(amount * waves) }));
}

// The run's hero list with campaign levels and stars applied to attack and health and
// Evolution to the ultimate and crit (every mode: global stats).
// Permanent reach steps on boards (docs/tower-defense-board-plan.md decision 1): range grows
// outside battle only, one pattern step per threshold in heroStars.reachSteps
// ({ "3": 1, "5": 2 }: one step at 3 stars, two at 5).
export function starReachSteps(campaign, stars) {
  let steps = 0;
  for (const [at, value] of Object.entries(campaign.heroStars?.reachSteps ?? {})) if (stars >= Number(at)) steps = Math.max(steps, value);
  return steps;
}

export function collectionHeroes(campaign, progress, heroes) {
  return heroes.map((hero) => {
    const level = heroLevel(progress, hero.id), stars = heroStars(progress, hero.id), tier = heroEvolution(progress, hero.id);
    const scale = levelScale(campaign, level) * starScale(campaign, stars);
    const skillCfg = campaign.heroSkillLevels ?? {};
    const skillStat = skillCfg.passiveStatPerLevel ?? 0;
    const attackSkill = 1 + skillStat * (heroSkillLevel(progress, hero.id, "passiveAttack") - 1);
    const healthSkill = 1 + skillStat * (heroSkillLevel(progress, hero.id, "passiveHealth") - 1);
    const ultimateSkill = 1 + (skillCfg.ultimatePowerPerLevel ?? 0) * (heroSkillLevel(progress, hero.id, "ultimate") - 1);
    const reachSteps = starReachSteps(campaign, stars);
    if (scale === 1 && !tier && attackSkill === 1 && healthSkill === 1 && ultimateSkill === 1 && !reachSteps) return hero;
    const bonus = evolutionBonus(campaign, tier);
    return {
      ...hero,
      ...(reachSteps && { reachSteps }),
      atk: Math.round(hero.atk * scale * attackSkill),
      hp: Math.round(hero.hp * scale * healthSkill),
      ultPower: +(hero.ultPower * (1 + bonus.ultPower) * ultimateSkill).toFixed(4),
      critChance: +(hero.critChance + bonus.crit).toFixed(4),
      ultCooldown: +(hero.ultCooldown * (1 + bonus.ultCooldown)).toFixed(3),
      ...(bonus.awakenedUlt && { awakenedUlt: true }),
      campaignLevel: level,
      campaignStars: stars,
      campaignEvolution: tier,
      campaignSkillLevels: { ...progress.skillLevels?.[hero.id] },
    };
  });
}

// --- Summoning ---
// Heroes a stage gives on its first clear.
export function stageRewardHeroes(campaign) {
  return [...new Set(allStages(campaign).flatMap((stage) => (stage.rewards ?? []).filter((reward) => reward.type === "hero").map((reward) => reward.id)))];
}

const heroIdOf = (hero) => (typeof hero === "string" ? hero : hero.id);

// Acquisition rules (audit step 4), shared by the Summon and Squad screens and the tests.
// The stage whose first clear gives this hero, or null (then Summon is its source).
export function heroRewardStage(campaign, heroId) {
  return allStages(campaign).find((stage) => (stage.rewards ?? []).some((reward) => reward.type === "hero" && reward.id === heroId)) ?? null;
}

// Heroes the banner may draw from `heroes` (ids or hero objects). Stage-reward heroes are
// included too; if summoned first, their eventual first-clear reward becomes a spare copy.
export function summonableHeroes(_campaign, _progress, heroes) {
  return heroes.map(heroIdOf);
}

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

// Rarity (legendary/epic/common, from each hero's `rarity` in gameBalance.json) drives
// the summon odds: the banner's `rarityWeights` give every hero of a rarity its base
// weight; the featured hero's weight is its rarity weight x `featuredWeight`.
const RARITY_BY_ID = Object.fromEntries(heroBalance.map((hero) => [hero.id, hero.rarity ?? "common"]));
export const heroRarity = (id) => RARITY_BY_ID[id] ?? "common";
const rarityWeight = (banner, id) => Math.max(0, Number(banner?.rarityWeights?.[heroRarity(id)]) || 1);
const drawWeight = (banner, id, featured, featuredWeight) => rarityWeight(banner, id) * (id === featured ? featuredWeight : 1);

export function featuredChance(banner, progress, heroes, now = Date.now()) {
  const pool = bannerPool(banner, progress, heroes);
  const featured = featuredHeroId(banner, now);
  if (!featured || !pool.includes(featured)) return 0;
  const featuredWeight = Math.max(1, Number(banner.featuredWeight) || 1);
  const total = pool.reduce((sum, id) => sum + drawWeight(banner, id, featured, featuredWeight), 0);
  return drawWeight(banner, featured, featured, featuredWeight) / total;
}

// Summon odds per rarity plus the featured hero, for the banner's rate display. Shares
// the weighting rules with summonMany() so the shown rates cannot drift from the draw.
export function summonRates(banner, progress, heroes, now = Date.now()) {
  const pool = bannerPool(banner, progress, heroes);
  const featured = featuredHeroId(banner, now);
  const featuredWeight = Math.max(1, Number(banner.featuredWeight) || 1);
  const total = pool.reduce((sum, id) => sum + drawWeight(banner, id, featured, featuredWeight), 0);
  const rates = { featured: 0, legendary: 0, epic: 0, common: 0 };
  if (!total) return rates;
  for (const id of pool) {
    const share = drawWeight(banner, id, featured, featuredWeight) / total;
    rates[heroRarity(id)] += share;
    if (id === featured) rates.featured = share;
  }
  return rates;
}

// Heroes a summon can give: every roster hero (ids or hero objects) not owned yet.
export function summonPool(progress, heroes) {
  return heroes.map(heroIdOf).filter((id) => !progress.owned.includes(id));
}

// A banner's pool. "locked": heroes not owned yet (no duplicates). "all": every hero passed
// in, owned or not; an owned hero drawn again becomes a spare copy (M26 sprint 9).
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

// Pays `count` times the banner's cost and draws `count` heroes one after another. Each
// hero's weight is its rarity weight (`rarityWeights`: legendary/epic/common); the
// current featured hero's rarity weight is multiplied by `featuredWeight`. A "locked"
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
    const totalWeight = ordered.reduce((sum, id) => sum + drawWeight(banner, id, featured, featuredWeight), 0);
    let roll = Math.min(.999999999, Math.max(0, rng())) * totalWeight;
    let heroId = ordered.at(-1);
    for (const id of ordered) {
      roll -= drawWeight(banner, id, featured, featuredWeight);
      if (roll < 0) { heroId = id; break; }
    }
    heroIds.push(heroId);
    isNew.push(!owned.includes(heroId));
    if (owned.includes(heroId)) copies[heroId] = (copies[heroId] || 0) + 1;
    else owned.push(heroId);
    if (!withReplacement(banner)) pool = pool.filter((id) => id !== heroId);
  }
  // New-hero pity (mechanics overview recommendation 4): on a full multi summon of a
  // banner with `pityNewInMulti`, at least one draw joins the collection while any
  // pool hero is still unowned. The last duplicate is replaced by a weighted draw
  // from the unowned subset, so featured odds stay honest among the new heroes.
  if (banner.pityNewInMulti && n >= (Math.max(1, Number(banner.multiCount) || 10)) && !isNew.some(Boolean)) {
    const unowned = pool.filter((id) => !owned.includes(id));
    if (unowned.length) {
      const ordered = featured && unowned.includes(featured) ? [featured, ...unowned.filter((id) => id !== featured)] : unowned;
      const totalWeight = ordered.reduce((sum, id) => sum + drawWeight(banner, id, featured, featuredWeight), 0);
      let roll = Math.min(.999999999, Math.max(0, rng())) * totalWeight;
      let heroId = ordered.at(-1);
      for (const id of ordered) {
        roll -= drawWeight(banner, id, featured, featuredWeight);
        if (roll < 0) { heroId = id; break; }
      }
      const slot = heroIds.length - 1;
      const replaced = heroIds[slot];
      copies[replaced] -= 1;
      if (copies[replaced] <= 0) delete copies[replaced];
      heroIds[slot] = heroId;
      isNew[slot] = true;
      owned.push(heroId);
    }
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

// Stage rating (M26 sprint 10), internally "laurels": 0-3 per stage, shown to players only
// as icons. Laurel n needs a clear keeping at least thresholds[n-1] of the stage's lives
// (1 / 50% / 90%), counted in shown lives (`laurels.lifeUnit` internal lives each, like the
// HUD), so a goal reads as the player sees it. Returns the internal lives each laurel needs.
// Derived from the saved bestLives, so older saves rate retroactively.
export function laurelLives(campaign, stage) {
  const unit = campaign.laurels?.lifeUnit ?? 1;
  const shownMax = Math.ceil(stage.lives / unit);
  return (campaign.laurels?.thresholds ?? [0]).map((share) => {
    const shown = Math.ceil(share * shownMax);
    return shown ? (shown - 1) * unit + 1 : 0;
  });
}

export function stageLaurels(campaign, progress, stage) {
  const entry = progress.cleared[stage.id];
  return entry ? laurelLives(campaign, stage).filter((lives) => entry.bestLives >= lives).length : 0;
}

// A chapter's laurels and its milestones (paid automatically when reached).
export function chapterLaurels(campaign, progress, chapterId) {
  const chapter = campaign.chapters.find((entry) => entry.id === chapterId);
  if (!chapter) return { earned: 0, max: 0, milestones: [] };
  const per = campaign.laurels?.thresholds?.length ?? 0;
  const earned = chapter.stages.reduce((sum, stage) => sum + stageLaurels(campaign, progress, stage), 0);
  const paid = progress.milestones?.[chapterId] ?? [];
  const milestones = (chapter.milestones ?? []).map((milestone) => ({ ...milestone, paid: paid.includes(milestone.laurels) }));
  return { earned, max: chapter.stages.length * per, milestones };
}

// Pays every reached, unpaid milestone. Returns the new progress and the milestones paid.
export function payMilestones(campaign, progress) {
  let next = progress;
  /** @type {{ chapter: any, laurels: number, rewards: any[] }[]} */
  const paid = [];
  for (const chapter of campaign.chapters) {
    const { earned, milestones } = chapterLaurels(campaign, next, chapter.id);
    for (const milestone of milestones) {
      if (milestone.paid || earned < milestone.laurels) continue;
      next = { ...grantRewards(next, milestone.rewards), milestones: { ...next.milestones, [chapter.id]: [...(next.milestones?.[chapter.id] ?? []), milestone.laurels] } };
      paid.push({ chapter: chapter.id, laurels: milestone.laurels, rewards: milestone.rewards });
    }
  }
  return { progress: next, paid };
}

// Heroic campaign (TOWER_DEFENSE_GAMEPLAY_IDEAS.md D2): once every stage of a chapter is
// cleared, each of its stages has a Heroic version on the Heroic tier (tuning.tiers.heroic).
// Its first clear pays Divine Seals only (`heroic.sealShare` of the stage's own first-clear
// seals, at least `heroic.minSeals`); Heroic clears give no laurels and no replay rewards.
export function heroicUnlocked(campaign, progress, stage) {
  const chapter = campaign.chapters.find((entry) => entry.stages.some((s) => s.id === stage.id));
  return !!campaign.heroic && !!chapter && chapter.stages.every((s) => isCleared(progress, s.id));
}

export const isHeroicCleared = (progress, stageId) => !!progress.heroic?.[stageId];

export function heroicRewards(campaign, stage, progress) {
  if (!campaign.heroic || isHeroicCleared(progress, stage.id)) return [];
  const seals = (stage.rewards ?? []).filter((reward) => reward.type === "currency" && reward.id === "divineSeals").reduce((sum, reward) => sum + reward.amount, 0);
  const amount = Math.max(campaign.heroic.minSeals ?? 0, Math.round(seals * (campaign.heroic.sealShare ?? 1)));
  return amount > 0 ? [{ type: "currency", id: "divineSeals", amount }] : [];
}

// After a stage: a win records the clear (best lives kept) and pays the first-clear or the
// replay rewards. A Heroic win (`heroic`) records the Heroic clear and pays heroicRewards. A loss changes nothing. Returns the new progress, whether it was a first
// clear, the rewards granted and the stage it unlocked.
export function finishCampaignStage(campaign, progress, stageId, { won, lives, heroic = false }) {
  const stage = stageById(campaign, stageId);
  if (!stage || !won) return { progress, firstClear: false, granted: [], unlocked: null, laurels: null, milestones: [] };
  if (heroic) {
    if (!heroicUnlocked(campaign, progress, stage)) return { progress, firstClear: false, granted: [], unlocked: null, laurels: null, milestones: [] };
    const before = progress.heroic?.[stageId];
    const granted = heroicRewards(campaign, stage, progress);
    const next = { ...grantRewards(progress, granted), heroic: { ...progress.heroic, [stageId]: { clears: (before?.clears ?? 0) + 1, bestLives: Math.max(before?.bestLives ?? 0, lives) } } };
    return { progress: next, firstClear: !before, granted, unlocked: null, laurels: null, milestones: [], heroic: true };
  }
  const before = progress.cleared[stageId];
  const firstClear = !before;
  const granted = firstClear ? pendingRewards(stage, progress) : repeatRewards(campaign, stage);
  const recorded = {
    ...grantRewards(progress, granted),
    cleared: { ...progress.cleared, [stageId]: { clears: (before?.clears ?? 0) + 1, bestLives: Math.max(before?.bestLives ?? 0, lives) } },
  };
  const laurels = { before: stageLaurels(campaign, progress, stage), after: stageLaurels(campaign, recorded, stage) };
  const { progress: next, paid: milestones } = payMilestones(campaign, recorded);
  const unlocked = firstClear ? allStages(campaign).find((entry) => entry.unlockAfter === stageId) ?? null : null;
  return { progress: next, firstClear, granted, unlocked, laurels, milestones };
}

// Save shape check and migration. Unknown heroes and stages are dropped, starters are
// always owned, and a missing or older section becomes a valid current one.
export function sanitizeCampaign(value, campaign, heroIds) {
  const fresh = newCampaignProgress(campaign);
  if (!value || typeof value !== "object") return fresh;
  const stageIds = new Set(allStages(campaign).map((stage) => stage.id));
  const owned = [...new Set([...fresh.owned, ...(Array.isArray(value.owned) ? value.owned : [])])].filter((id) => heroIds.has(id));
  /** @type {Record<string, { clears: number, bestLives: number }>} */
  const cleared = {};
  for (const [id, entry] of Object.entries(value.cleared ?? {})) {
    if (!stageIds.has(id) || !entry || typeof entry !== "object") continue;
    cleared[id] = { clears: Math.max(1, Math.floor(Number(entry.clears) || 1)), bestLives: Math.max(0, Math.floor(Number(entry.bestLives) || 0)) };
  }
  const lastSquad = (Array.isArray(value.lastSquad) ? [...new Set(value.lastSquad)] : []).filter((id) => owned.includes(id)).slice(0, campaign.squadSize);
  // Version 1 had no currencies or levels: they start at zero and level 1.
  const currencies = Object.fromEntries(CURRENCIES.map((id) => [id, Math.max(0, Math.floor(Number(value.currencies?.[id]) || 0))]));
  const version = Number(value.version) || 1;
  // Version 7 merged Divine Essence into Seal Dust: leftover essence converts at the
  // historical rate (1 essence cost 150 dust, tdSummon.json dust.perEssence at version 6).
  if (version < 7) currencies.sealDust += Math.max(0, Math.floor(Number(value.currencies?.divineEssence) || 0)) * 150;
  // Stages cleared under an older version did not pay the currencies added since (version 1:
  // all of them, version 2: Divine Seals); those first-clear amounts are paid once now.
  for (const stage of allStages(campaign)) {
    if (!cleared[stage.id]) continue;
    for (const reward of stage.rewards ?? []) {
      if (reward.type === "currency" && CURRENCIES.includes(reward.id) && version < CURRENCY_SINCE[reward.id]) currencies[reward.id] += Math.max(0, Math.floor(Number(reward.amount) || 0));
    }
  }
  const summons = Math.max(0, Math.floor(Number(value.summons) || 0));
  // Version 3 had no copies, stars or Evolution: they start empty (0 stars, tier 0).
  const counts = (obj, min, max, keep) => Object.fromEntries(Object.entries(obj && typeof obj === "object" ? obj : {})
    .map(([id, n]) => [id, Math.min(max, Math.floor(Number(n) || 0))])
    .filter(([id, n]) => keep(id) && n >= min));
  const copies = counts(value.copies, 1, Infinity, (id) => heroIds.has(id));
  // Version 4 counted stars from 1; version 5 from 0 (same stats: one less star, one less step).
  const starShift = version < 5 ? 1 : 0;
  const stars = counts(Object.fromEntries(Object.entries(value.stars && typeof value.stars === "object" ? value.stars : {}).map(([id, n]) => [id, (Number(n) || 0) - starShift])), 1, campaign.heroStars?.max ?? 0, (id) => owned.includes(id));
  // Levels are capped by the hero's stars.
  /** @type {Record<string, number>} */
  const levels = {};
  for (const [id, level] of Object.entries(value.levels ?? {})) {
    const n = Math.min(levelCap(campaign, stars[id] ?? 0), Math.floor(Number(level) || 1));
    if (owned.includes(id) && n > 1) levels[id] = n;
  }
  const evolution = counts(value.evolution, 1, campaign.heroEvolution?.tiers?.length ?? 0, (id) => owned.includes(id));
  const skillMax = campaign.heroSkillLevels?.max ?? 1;
  const skillLevels = Object.fromEntries(Object.entries(value.skillLevels && typeof value.skillLevels === "object" ? value.skillLevels : {}).flatMap(([id, skills]) => {
    if (!owned.includes(id) || !skills || typeof skills !== "object") return [];
    const clean = Object.fromEntries(Object.entries(skills).filter(([skillId]) => SKILL_IDS.includes(skillId)).map(([skillId, level]) => [skillId, Math.min(skillMax, Math.max(1, Math.floor(Number(level) || 1)))]).filter(([, level]) => level > 1));
    return Object.keys(clean).length ? [[id, clean]] : [];
  }));
  // Version 7 had no milestones: reached ones are paid once here (retroactive laurels).
  /** @type {Record<string, number[]>} */
  const milestones = {};
  for (const chapter of campaign.chapters) {
    const valid = new Set((chapter.milestones ?? []).map((milestone) => milestone.laurels));
    const list = Array.isArray(value.milestones?.[chapter.id]) ? [...new Set(value.milestones[chapter.id].map(Number))].filter((n) => valid.has(n)) : [];
    if (list.length) milestones[chapter.id] = list;
  }
  // Version 8 had no Heroic clears: they start empty.
  /** @type {Record<string, { clears: number, bestLives: number }>} */
  const heroic = {};
  for (const [id, entry] of Object.entries(value.heroic ?? {})) {
    if (!stageIds.has(id) || !cleared[id] || !entry || typeof entry !== "object") continue;
    heroic[id] = { clears: Math.max(1, Math.floor(Number(entry.clears) || 1)), bestLives: Math.max(0, Math.floor(Number(entry.bestLives) || 0)) };
  }
  const clean = { version: CAMPAIGN_SAVE_VERSION, owned, cleared, lastSquad, currencies, levels, summons, copies, stars, evolution, skillLevels, milestones, heroic };
  return payMilestones(campaign, clean).progress;
}

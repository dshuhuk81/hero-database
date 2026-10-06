// Summoning (M26 sprint 8): Divine Seals come from campaign clears (replays a quarter),
// one banner gives a hero the player does not own yet, and the save section keeps and
// migrates the new fields (version 7: Divine Essence merged into Seal Dust).
// Uses a copy of the campaign with seals on every stage so it does not depend on the
// authored stage rewards.
import assert from "node:assert/strict";
import campaignData from "../src/data/tdCampaign.json" with { type: "json" };
import summonData from "../src/data/tdSummon.json" with { type: "json" };
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import { bannerPool, heroAvailability, rotationEndsAt, allStages, stageRewardHeroes, heroRewardStage, summonableHeroes, canSummon, CAMPAIGN_SAVE_VERSION, CURRENCIES, CURRENCY_NAMES, featuredChance, featuredHeroId, finishCampaignStage, multiSummonCount, newCampaignProgress, repeatRewards, rewardText, sanitizeCampaign, summon, summonMany, summonPool, summonRates, addSeals, validSquad, autoFodder, buyCopiesWithDust, collectionHeroes, convertCopies, evolutionBonus, evolutionMaterial, evolve, exchangeDust, heroEvolution, heroStars, starScale, starUp, starUpCost } from "../src/game/td/campaign.js";

const heroIds = new Set(heroes.map((hero) => hero.id));
const ids = heroes.map((hero) => hero.id);
const SEALS = 50;
const campaign = {
  ...campaignData,
  chapters: campaignData.chapters.map((chapter) => ({
    ...chapter,
    stages: chapter.stages.map((stage) => ({ ...stage, rewards: [...stage.rewards.filter((reward) => reward.id !== "divineSeals"), { type: "currency", id: "divineSeals", amount: SEALS }] })),
  })),
};
const stages = allStages(campaign);
// The authored banner has pool "all" (duplicates become copies, M26 sprint 9). The no-duplicate
// checks below run on a "locked" copy of it; the M26 sprint 9 section uses the authored one.
const authored = summonData.banners[0];
const summonCfg = { ...summonData, banners: [{ ...authored, pool: "locked" }] };
const banner = summonCfg.banners[0];
const cost = banner.cost.divineSeals;
const withSeals = (p, n) => ({ ...p, currencies: { ...p.currencies, divineSeals: n } });
const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };

// --- Data ---
assert.ok(CURRENCIES.includes("divineSeals") && CURRENCY_NAMES.divineSeals === "Divine Seals", "Divine Seals currency");
assert.equal(summonCfg.banners.length, 1, "one banner");
assert.ok(banner.id && banner.name && banner.pool === "locked" && cost > 0, "banner shape");
assert.equal(featuredHeroId(banner, Date.parse(banner.rotationEpoch)), banner.featuredRotation[0], "first featured rotation");
assert.equal(featuredHeroId(banner, Date.parse(banner.rotationEpoch) + banner.rotationDays * 86400000), banner.featuredRotation[1], "featured hero rotates");
assert.equal(rewardText([{ type: "currency", id: "divineSeals", amount: 50 }]), "+50 Divine Seals", "reward text");

// --- Pool ---
{
  const p = newCampaignProgress(campaign);
  assert.equal(p.summons, 0, "fresh progress: no summons");
  const pool = summonPool(p, heroes);
  assert.deepEqual(pool, ids.filter((id) => !campaign.starters.includes(id)), "pool = heroes not owned");
  assert.deepEqual(summonPool(p, ids), pool, "pool accepts ids or hero objects");
}

// --- Summon ---
{
  const p = newCampaignProgress(campaign);
  assert.equal(summon(summonCfg, banner.id, p, ids), null, "no seals: null");
  assert.equal(summon(summonCfg, banner.id, withSeals(p, cost - 1), ids), null, "one seal short: null");
  assert.ok(!canSummon(summonCfg, banner.id, withSeals(p, cost - 1), ids), "canSummon false when short");
  assert.equal(summon(summonCfg, "nope", withSeals(p, cost), ids), null, "unknown banner: null");
  const rich = withSeals(p, cost * 2 + 7);
  assert.ok(canSummon(summonCfg, banner.id, rich, ids), "canSummon with seals");
  const pool = summonPool(rich, ids);
  const featured = featuredHeroId(banner);
  assert.ok(pool.includes(featured), "featured hero is summonable");
  assert.ok(featuredChance(banner, rich, ids) > featuredChance({ ...banner, featuredWeight: 1 }, rich, ids), "featured chance is boosted");
  const first = summon(summonCfg, banner.id, rich, ids, () => 0);
  assert.equal(first.heroId, featured, "rng 0 picks the featured hero");
  assert.equal(first.progress.currencies.divineSeals, cost + 7, "cost paid");
  assert.equal(first.progress.currencies.gold, rich.currencies.gold, "other currencies untouched");
  assert.equal(first.progress.summons, 1, "summon counted");
  assert.ok(first.progress.owned.includes(first.heroId) && !rich.owned.includes(first.heroId), "new hero owned, input not mutated");
  assert.equal(rich.currencies.divineSeals, cost * 2 + 7, "input wallet not mutated");
  const last = summon(summonCfg, banner.id, first.progress, ids, () => 0.999999);
  assert.equal(last.heroId, summonPool(first.progress, ids).at(-1), "rng near 1 picks the last pool hero");
  assert.notEqual(last.heroId, first.heroId, "never a duplicate");
  assert.equal(last.progress.summons, 2, "second summon counted");
  // The summoned hero is usable right away.
  const picked = [first.heroId, ...campaign.starters];
  const squadRows = [picked.slice(0, campaign.squadRowSize), picked.slice(campaign.squadRowSize)];
  assert.ok(validSquad(campaign, first.progress, squadRows), "summoned hero fits a valid two-row squad");
  assert.ok(!validSquad(campaign, rich, squadRows), "not before the summon");
  // Weighted pool: every hero remains reachable. Weights follow the banner's
  // rarityWeights (lord/legendary/epic/common), the featured hero multiplied by featuredWeight.
  const rarityOf = (id) => heroes.find((hero) => hero.id === id)?.rarity ?? "common";
  const weightOf = (id) => Math.max(1, banner.rarityWeights?.[rarityOf(id)] ?? 1) * (id === featured ? banner.featuredWeight : 1);
  const totalWeight = pool.reduce((sum, id) => sum + weightOf(id), 0);
  const seen = new Set(Array.from({ length: totalWeight }, (_, i) => summon(summonCfg, banner.id, rich, ids, () => (i + 0.5) / totalWeight).heroId));
  assert.equal(seen.size, pool.length, "every pool hero reachable");
  // Rarity rates: commons individually outweigh legendaries; rates sum to 1.
  const rates = summonRates(banner, rich, ids);
  assert.ok(Math.abs(rates.lord + rates.legendary + rates.epic + rates.common - 1) < 1e-9, "rarity rates sum to 1");
  const fresh = summonRates(banner, { owned: [] }, ids);
  assert.ok(Math.abs(fresh.lord - 0.003) < 0.0005, `Lords are summoned at about 0.3% on a fresh account (${(fresh.lord * 100).toFixed(2)}%)`);
  const aCommon = pool.find((id) => rarityOf(id) === "common" && id !== featured);
  const aLegendary = pool.find((id) => rarityOf(id) === "legendary" && id !== featured);
  assert.ok(weightOf(aCommon) > weightOf(aLegendary), "common outweighs legendary per hero");
  assert.ok(rates.common > rates.legendary && rates.common > rates.epic, "commons dominate the banner");
  assert.ok(rates.legendary > rates.featured, "all legendary heroes together are more likely than the featured hero");
  assert.ok(Math.abs(rates.featured - featuredChance(banner, rich, ids)) < 1e-9, "featured rate matches featuredChance");
  // Empty pool: everything owned.
  const all = { ...withSeals(p, cost * 10), owned: [...ids] };
  assert.deepEqual(summonPool(all, ids), [], "empty pool");
  assert.ok(!canSummon(summonCfg, banner.id, all, ids), "canSummon false on empty pool");
  assert.equal(summon(summonCfg, banner.id, all, ids), null, "empty pool: null");
  // Summoning the whole pool.
  let q = withSeals(p, cost * pool.length);
  for (let i = 0; i < pool.length; i += 1) q = summon(summonCfg, banner.id, q, ids, Math.random).progress;
  assert.deepEqual([q.currencies.divineSeals, q.summons, summonPool(q, ids).length], [0, pool.length, 0], "whole pool summoned, wallet empty");
}

// --- Seals: first clears pay full, replays a quarter (since September 28, 2026) ---
{
  let p = newCampaignProgress(campaign);
  const won = finishCampaignStage(campaign, p, stages[0].id, { won: true, lives: 10 });
  assert.equal(won.progress.currencies.divineSeals, SEALS, "first clear pays seals");
  const repeatSeals = repeatRewards(campaign, stages[0]).find((reward) => reward.id === "divineSeals");
  assert.equal(repeatSeals?.amount, Math.round(SEALS * (campaign.repeatShare ?? 0)), "repeat rewards pay a share of seals");
  assert.ok(repeatRewards(campaign, stages[0]).some((reward) => reward.id === "gold"), "repeat rewards keep gold");
  const again = finishCampaignStage(campaign, won.progress, stages[0].id, { won: true, lives: 10 });
  assert.equal(again.progress.currencies.divineSeals, SEALS + repeatSeals.amount, "replay pays the seal share");
}

// --- Save section ---
{
  assert.equal(CAMPAIGN_SAVE_VERSION, 10, "save version 10");
  const fresh = sanitizeCampaign(undefined, campaign, heroIds);
  assert.deepEqual([fresh.version, fresh.currencies.divineSeals, fresh.summons], [CAMPAIGN_SAVE_VERSION, 0, 0], "fresh section");
  const clean = sanitizeCampaign({ version: 3, owned: [...campaign.starters], cleared: {}, currencies: { divineSeals: "120" }, summons: "4.7" }, campaign, heroIds);
  assert.deepEqual([clean.currencies.divineSeals, clean.summons], [120, 4], "seals and summons cleaned");
  const bad = sanitizeCampaign({ version: 3, currencies: { divineSeals: -5 }, summons: -2 }, campaign, heroIds);
  assert.deepEqual([bad.currencies.divineSeals, bad.summons], [0, 0], "negatives clamp to 0");
  const cleared = { [stages[0].id]: { clears: 2, bestLives: 5 }, [stages[1].id]: { clears: 1, bestLives: 3 } };
  // Version 2: cleared before seals existed; the seals of those stages are paid once, gold is not paid again.
  const v2 = sanitizeCampaign({ version: 2, owned: [...campaign.starters], cleared, currencies: { gold: 77, heroXp: 5, divineSeals: 0 }, levels: {} }, campaign, heroIds);
  assert.deepEqual([v2.version, v2.currencies.gold, v2.currencies.heroXp, v2.currencies.divineSeals, v2.summons], [CAMPAIGN_SAVE_VERSION, 77, 5, SEALS * 2, 0], "version 2 migrates: seals back-paid once");
  assert.equal(sanitizeCampaign(v2, campaign, heroIds).currencies.divineSeals, SEALS * 2, "seals not back-paid again");
  // Version 1: every first-clear currency, seals included, once.
  const v1 = sanitizeCampaign({ version: 1, owned: [...campaign.starters], cleared }, campaign, heroIds);
  const sum = (id) => stages.slice(0, 2).reduce((n, stage) => n + stage.rewards.filter((reward) => reward.id === id).reduce((m, reward) => m + reward.amount, 0), 0);
  assert.deepEqual([v1.currencies.gold, v1.currencies.divineSeals], [sum("gold"), SEALS * 2], "version 1 migrates: all currencies paid once");
  assert.equal(sanitizeCampaign(v1, campaign, heroIds).currencies.gold, sum("gold"), "not paid again");
  // Summoned heroes survive the round trip.
  const summoned = summon(summonCfg, banner.id, withSeals(newCampaignProgress(campaign), cost), ids, () => 0).progress;
  const back = sanitizeCampaign(JSON.parse(JSON.stringify(summoned)), campaign, heroIds);
  assert.deepEqual(back, summoned, "summoned progress round-trips unchanged");
}

// Stage reward heroes remain summonable; their eventual stage reward becomes a copy.
{
  const reserved = stageRewardHeroes(campaignData);
  const fromStages = allStages(campaignData).flatMap((stage) => stage.rewards.filter((reward) => reward.type === "hero").map((reward) => reward.id));
  assert.deepEqual([...reserved].sort(), [...new Set(fromStages)].sort(), "stage reward heroes listed");
  assert.ok(reserved.every((id) => !campaignData.starters.includes(id)), "no starter is a stage reward");
  // One rule for the banner and the Squad screen's source text (campaign.js).
  const fresh = newCampaignProgress(campaignData);
  const roster = [...campaignData.starters, ...reserved, "someone-else"];
  const open = summonableHeroes(campaignData, fresh, roster);
  assert.ok(reserved.every((id) => open.includes(id)), "all stage reward heroes are summonable from the start");
  assert.ok(open.includes("someone-else") && campaignData.starters.every((id) => open.includes(id)), "everyone else is");
  const openingRates = summonRates(authored, fresh, summonableHeroes(campaignData, fresh, heroes));
  assert.ok(openingRates.legendary > openingRates.featured, "opening banner: all available legendary heroes together outweigh the featured hero");
  assert.ok(openingRates.common > openingRates.legendary + openingRates.epic, "opening banner: commons are more likely than every higher rarity combined");
  const earned = { ...fresh, owned: [...fresh.owned, reserved[0]] };
  assert.ok(summonableHeroes(campaignData, earned, roster).includes(reserved[0]), "an earned stage reward hero remains summonable as copies");
  const rewardStage = heroRewardStage(campaignData, reserved[0]);
  assert.equal(rewardStage?.rewards.some((r) => r.type === "hero" && r.id === reserved[0]), true, "reward stage found");
  const duplicateReward = finishCampaignStage(campaignData, earned, rewardStage.id, { won: true, lives: rewardStage.lives });
  assert.equal(duplicateReward.progress.copies[reserved[0]], 1, "an already-owned stage reward becomes a spare copy");
  assert.equal(heroRewardStage(campaignData, "someone-else"), null, "summon-only hero has no reward stage");
}

// --- Multi summon (M27b) ---
{
  const multi = banner.multiCount;
  assert.ok(multi >= 2, "banner has a multi summon");
  const p = newCampaignProgress(campaign);
  const pool = summonPool(p, ids);
  const n = Math.min(multi, pool.length);
  assert.equal(multiSummonCount(summonCfg, banner.id, withSeals(p, cost * n - 1), ids), 0, "multi: one seal short");
  const rich = withSeals(p, cost * n + 3);
  assert.equal(multiSummonCount(summonCfg, banner.id, rich, ids), n, "multi count = multiCount or pool left");
  assert.equal(summonMany(summonCfg, banner.id, withSeals(p, cost * n - 1), ids, n), null, "summonMany: short wallet is null, nothing paid");
  assert.equal(summonMany(summonCfg, banner.id, rich, ids, pool.length + 1), null, "summonMany: more than the pool is null");
  assert.equal(summonMany(summonCfg, banner.id, rich, ids, 0), null, "summonMany: count 0 is null");
  const many = summonMany(summonCfg, banner.id, rich, ids, n, Math.random);
  assert.equal(many.heroIds.length, n, "summonMany gives count heroes");
  assert.equal(new Set(many.heroIds).size, n, "no duplicates within one multi summon");
  assert.ok(many.heroIds.every((id) => pool.includes(id)), "all from the pool");
  assert.deepEqual([many.progress.currencies.divineSeals, many.progress.summons], [3, n], "multi pays count x cost, counts each summon");
  assert.equal(rich.owned.length, campaign.starters.length, "input not mutated");
  assert.equal(summonMany(summonCfg, banner.id, rich, ids, n, () => 0).heroIds[0], featuredHeroId(banner), "featured weight applies to the first draw");
  // Fewer heroes left than multiCount: the multi summon shrinks to what is left.
  const nearlyAll = { ...rich, owned: [...rich.owned, ...pool.slice(0, pool.length - 3)] };
  assert.equal(multiSummonCount(summonCfg, banner.id, nearlyAll, ids), Math.min(multi, 3), "multi shrinks to heroes left");
  // Seal sources outside the campaign.
  assert.equal(addSeals(p, 15).currencies.divineSeals, 15, "addSeals pays");
  assert.equal(addSeals(p, -4), p, "addSeals ignores negatives");
  assert.ok(summonCfg.sealSources.dailyGoal > 0 && summonCfg.sealSources.expeditionComplete > 0, "seal sources authored");
}

// --- Economy: the authored campaign pays at least one full multi summon ---
{
  const campaignSeals = allStages(campaignData).reduce((sum, stage) => sum + (stage.rewards ?? []).filter((reward) => reward.id === "divineSeals").reduce((m, reward) => m + reward.amount, 0), 0);
  assert.ok(campaignSeals >= cost * banner.multiCount, `campaign pays ${campaignSeals} seals, a full x${banner.multiCount} costs ${cost * banner.multiCount}`);
}

// --- Duplicates, Stars, Evolution, Seal Dust (M26 sprint 9) ---
{
  assert.equal(authored.pool, "all", "authored banner gives duplicates");
  const cfg = summonData;
  const p0 = withSeals(newCampaignProgress(campaignData), cost * 30);
  // With replacement: 10 draws of one hero (rng 0 = featured) -> 1 new + 9 copies.
  const featured = featuredHeroId(authored);
  const tenSame = summonMany(cfg, authored.id, p0, ids, 10, () => 0);
  assert.deepEqual(tenSame.heroIds, Array(10).fill(featured), "all banner draws with replacement");
  assert.deepEqual(tenSame.isNew, [true, ...Array(9).fill(false)], "first is new, the rest copies");
  assert.equal(tenSame.progress.copies[featured], 9, "duplicates become copies");
  assert.equal(tenSame.progress.owned.filter((id) => id === featured).length, 1, "owned once");
  assert.equal(multiSummonCount(cfg, authored.id, { ...p0, owned: [...ids] }, ids), authored.multiCount, "multi is full even with everything owned");
  // Stars: duplicate copies of that hero + gold.
  const hero = campaignData.starters[0];
  let p = { ...tenSame.progress, currencies: { ...tenSame.progress.currencies, gold: 5000 } };
  assert.equal(heroStars(p, hero), 0, "start at 0 stars");
  assert.deepEqual(starUpCost(campaignData, 0), { copies: campaignData.heroStars.copies[0], gold: campaignData.heroStars.gold[0] }, "star cost from data");
  assert.equal(starUp(campaignData, p, hero, {}), null, "star up needs copies");
  assert.equal(starUp(campaignData, p, hero, { [featured]: 2 }), null, "star up needs exactly the cost's copies");
  assert.equal(starUp(campaignData, p, hero, { [featured]: 1.5 }), null, "whole copies only");
  assert.equal(starUp(campaignData, p, hero, { [featured]: 1 }), null, "copies of another hero are not star material");
  const ownCopies = { ...p, copies: { ...p.copies, [hero]: 3 } };
  const s2 = starUp(campaignData, ownCopies, hero, { [hero]: 1 });
  assert.deepEqual([heroStars(s2, hero), s2.copies[hero], s2.currencies.gold], [1, 2, 5000 - campaignData.heroStars.gold[0]], "star up pays duplicate copies and gold");
  assert.equal(starUp(campaignData, { ...ownCopies, currencies: { ...ownCopies.currencies, gold: 0 } }, hero, { [hero]: 1 }), null, "star up needs gold");
  // Quick add only selects duplicates of the hero being upgraded.
  const tiers = campaignData.heroEvolution.tiers.length;
  const mixed = { ...p, copies: { [featured]: 9, [hero]: 2, nott: 1 } };
  assert.deepEqual(autoFodder(campaignData, mixed, 2, hero), { [hero]: 2 }, "select the hero's duplicates");
  assert.equal(autoFodder(campaignData, mixed, 3, hero), null, "other heroes cannot cover a duplicate shortage");
  // Evolution: copies of the same hero first, then Seal Dust (heroEvolution.dustPrice).
  const dustPrice = campaignData.heroEvolution.dustPrice;
  assert.equal(evolutionMaterial(campaignData, p, hero), null, "no copy, not enough dust: cannot evolve");
  let e = p;
  for (let i = 0; i < tiers; i += 1) e = evolve(campaignData, e, featured);
  const copyTotal = campaignData.heroEvolution.tiers.reduce((sum, tier) => sum + (tier.copies ?? 1), 0);
  assert.deepEqual([heroEvolution(e, featured), e.copies[featured] ?? 0], [tiers, 9 - copyTotal], "evolve spends each tier's copies of the same hero");
  assert.equal(evolve(campaignData, e, featured), null, "max tier");
  const withDust = { ...p, currencies: { ...p.currencies, sealDust: dustPrice } };
  assert.equal(evolutionMaterial(campaignData, withDust, hero), "dust", "dust evolves when no copy");
  const ev = evolve(campaignData, withDust, hero);
  assert.deepEqual([heroEvolution(ev, hero), ev.currencies.sealDust], [1, 0], "dust evolves any hero");
  assert.equal(evolve(campaignData, { ...p, currencies: { ...p.currencies, sealDust: dustPrice - 1 } }, hero), null, "not enough dust");
  // Evolution bonuses reach the run's hero list; V gives the awakened ultimate.
  const base = heroes.find((h) => h.id === featured);
  const run = collectionHeroes(campaignData, { ...e, stars: { [featured]: 3 } }, heroes).find((h) => h.id === featured);
  const bonus = evolutionBonus(campaignData, tiers);
  assert.equal(run.atk, Math.round(base.atk * starScale(campaignData, 3)), "stars scale attack");
  assert.equal(run.critChance, +(base.critChance + bonus.crit).toFixed(4), "evolution crit");
  assert.ok(run.ultPower > base.ultPower && run.ultCooldown < base.ultCooldown && run.awakenedUlt, "evolution ultimate power, cooldown, awakened");
  assert.equal(collectionHeroes(campaignData, newCampaignProgress(campaignData), heroes)[0], heroes[0], "no upgrades: hero unchanged");
  // Dust.
  const d = cfg.dust;
  assert.equal(convertCopies(cfg, p, hero, 1), null, "no copy to convert");
  const dusted = convertCopies(cfg, p, featured, 3);
  assert.deepEqual([dusted.copies[featured], dusted.currencies.sealDust], [6, 3 * d.perCopy], "copies to dust");
  assert.equal(exchangeDust(cfg, dusted, "essence", 1), null, "essence is gone (merged into dust, save version 7)");
  const sealsBack = exchangeDust(cfg, dusted, "seals", 5);
  assert.deepEqual([sealsBack.currencies.sealDust, sealsBack.currencies.divineSeals], [3 * d.perCopy - 5 * d.perSeal, dusted.currencies.divineSeals + 5], "dust to seals");
  assert.equal(exchangeDust(cfg, dusted, "seals", 1000), null, "not enough dust");
  // Dust buys copies (recommendation 4): owned hero only, copyPrice each.
  const copyPrice = cfg.dust.copyPrice;
  assert.ok(copyPrice > 0, "dust copy price authored");
  const dustRich = { ...p, currencies: { ...p.currencies, sealDust: copyPrice * 2 } };
  assert.equal(buyCopiesWithDust(cfg, dustRich, "stheno", 1), null, "dust copies need an owned hero");
  assert.equal(buyCopiesWithDust(cfg, { ...dustRich, currencies: { ...dustRich.currencies, sealDust: copyPrice - 1 } }, hero, 1), null, "dust copies need the dust");
  const bought = buyCopiesWithDust(cfg, dustRich, hero, 2);
  assert.deepEqual([bought.copies[hero], bought.currencies.sealDust], [(p.copies[hero] || 0) + 2, 0], "dust becomes targeted copies");
  // Save round trip and v3 migration.
  const back = sanitizeCampaign(JSON.parse(JSON.stringify({ ...e, stars: { [featured]: 3, nope: 4 }, evolution: { ...e.evolution, [hero]: 99 } })), campaignData, heroIds);
  assert.deepEqual([back.stars[featured], back.stars.nope, back.evolution[featured], back.evolution[hero], back.copies[featured] ?? 0], [3, undefined, tiers, tiers, 9 - copyTotal], "v4 fields cleaned and clamped");
  const v3 = sanitizeCampaign({ version: 3, owned: [...campaignData.starters], cleared: {}, currencies: { divineSeals: 40 } }, campaignData, heroIds);
  assert.deepEqual([v3.version, v3.copies, v3.stars, v3.evolution, v3.currencies.sealDust, v3.currencies.divineEssence], [CAMPAIGN_SAVE_VERSION, {}, {}, {}, 0, undefined], "v3 migrates to empty fields");
  // v6 → v7: leftover Divine Essence becomes Seal Dust at the historical 1:150 rate.
  const v6 = sanitizeCampaign({ version: 6, owned: [...campaignData.starters], cleared: {}, currencies: { sealDust: 20, divineEssence: 2 } }, campaignData, heroIds);
  assert.deepEqual([v6.currencies.sealDust, v6.currencies.divineEssence, v6.version], [20 + 300, undefined, CAMPAIGN_SAVE_VERSION], "essence becomes dust on migration");
  // v4 counted stars from 1: one less star, same stats; levels stay within the new cap.
  const v4 = sanitizeCampaign({ version: 4, owned: [...campaignData.starters, featured], stars: { [featured]: 3, [hero]: 1 }, levels: { [featured]: 10 } }, campaignData, heroIds);
  assert.deepEqual([v4.stars[featured], v4.stars[hero], v4.levels[featured]], [2, undefined, 10], "v4 stars shift down by one");
  assert.equal(starScale(campaignData, 2), 1 + 2 * campaignData.heroStars.statPerStar, "0-based star scale");
}
// --- New-hero pity in multi summons (recommendation 4) ---
// The pity tests force the flag on/off so they hold regardless of the live config;
// the authored banner ships with pityNewInMulti: true (enabled September 28, 2026
// after the rarity weights and the 33-hero pool landed).
{
  const cfg = { ...summonData, banners: [{ ...authored, pityNewInMulti: true }] };
  const missing = "plutus";
  const ownedRest = ids.filter((id) => id !== missing);
  const pAllButOne = withSeals({ ...newCampaignProgress(campaignData), owned: [...ownedRest] }, cost * 30);
  // rng pinned high: every draw lands on the last pool entry (owned) -> all duplicates.
  const pitied = summonMany(cfg, authored.id, pAllButOne, ids, authored.multiCount, () => 0.999999);
  assert.equal(pitied.isNew.filter(Boolean).length, 1, "multi with a missing hero guarantees one new");
  assert.equal(pitied.heroIds.at(-1), missing, "the missing hero replaces the last duplicate");
  assert.ok(pitied.progress.owned.includes(missing), "pitied hero joins the collection");
  const replacedCopies = Object.values(pitied.progress.copies).reduce((sum, n) => sum + n, 0);
  assert.equal(replacedCopies, authored.multiCount - 1, "the replaced draw refunds its copy");
  // Single summons have no pity.
  const single = summonMany(cfg, authored.id, pAllButOne, ids, 1, () => 0.999999);
  assert.equal(single.isNew[0], false, "single draw stays unpitied");
  // Everything owned: pity has nothing to give, draws stay copies.
  const pAll = withSeals({ ...newCampaignProgress(campaignData), owned: [...ids] }, cost * 30);
  const allCopies = summonMany(cfg, authored.id, pAll, ids, authored.multiCount, () => 0.999999);
  assert.equal(allCopies.isNew.filter(Boolean).length, 0, "no pity once the pool is exhausted");
  // Flag off: the same draw stays all duplicates. Forced config, so the test
  // holds regardless of the live banner's pityNewInMulti.
  const offCfg = { ...summonData, banners: [{ ...authored, pityNewInMulti: false }] };
  const unpitied = summonMany(offCfg, authored.id, pAllButOne, ids, authored.multiCount, () => 0.999999);
  assert.equal(unpitied.isNew.filter(Boolean).length, 0, "pityNewInMulti: false disables the replacement");
}

// Availability windows (banner.availability): a listed hero is only in the pool inside its window.
{
  const ids = heroes.map((hero) => hero.id);
  const now = Date.parse("2026-10-10T12:00:00Z");
  const windowed = (entry) => ({ ...summonData.banners[0], availability: [{ hero: "isis", ...entry }] });
  const fresh = newCampaignProgress(campaignData);
  const inPool = (banner) => bannerPool(banner, fresh, ids, now).includes("isis");
  assert.ok(inPool(windowed({ from: null, until: null })), "an open window keeps the hero in the pool");
  assert.ok(inPool(windowed({ from: "2026-10-01T00:00:00Z", until: "2026-10-20T00:00:00Z" })), "inside the window");
  assert.ok(!inPool(windowed({ from: "2026-10-11T00:00:00Z", until: null })), "before from: not in the pool");
  assert.ok(!inPool(windowed({ from: null, until: "2026-10-10T00:00:00Z" })), "after until: not in the pool");
  assert.equal(heroAvailability(windowed({ from: null, until: null }), "odin", now).listed, false, "unlisted heroes are always available");
  const closed = windowed({ from: "2027-01-01T00:00:00Z", until: null });
  const cfg = { ...summonData, banners: [{ ...closed, pityNewInMulti: false }] };
  const rich = { ...fresh, currencies: { ...fresh.currencies, divineSeals: 100000 } };
  for (let i = 0; i < 40; i += 1) {
    const drawn = summonMany(cfg, closed.id, rich, ids, 10, () => (i * 0.0251 + 0.003) % 1, now);
    assert.ok(!drawn.heroIds.includes("isis"), "a hero outside its window is never drawn");
  }
  assert.equal(summonRates(closed, fresh, ids, now).lord, 0, "no Lord rate while the Lord is out of the pool");
  assert.ok(rotationEndsAt(summonData.banners[0], now) > now, "the rotation has a next change");
}

console.log("Tower defense summon checks passed.");

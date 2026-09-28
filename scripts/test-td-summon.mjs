// Summoning (M26 sprint 8): Divine Seals come from first clears only, one banner gives a
// hero the player does not own yet, and the save section keeps and migrates the new fields.
// Uses a copy of the campaign with seals on every stage so it does not depend on the
// authored stage rewards.
import assert from "node:assert/strict";
import campaignData from "../src/data/tdCampaign.json" with { type: "json" };
import summonCfg from "../src/data/tdSummon.json" with { type: "json" };
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import { allStages, stageRewardHeroes, canSummon, CAMPAIGN_SAVE_VERSION, CURRENCIES, CURRENCY_NAMES, featuredChance, featuredHeroId, finishCampaignStage, multiSummonCount, newCampaignProgress, repeatRewards, rewardText, sanitizeCampaign, summon, summonMany, summonPool, addSeals, validSquad } from "../src/game/td/campaign.js";

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
  assert.ok(featuredChance(banner, rich, ids) > 1 / pool.length, "featured chance is boosted");
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
  const squad = [first.heroId, ...campaign.starters.slice(0, campaign.squadSize - 1)];
  assert.ok(validSquad(campaign, first.progress, squad), "summoned hero fits a valid squad");
  assert.ok(!validSquad(campaign, rich, squad), "not before the summon");
  // Weighted pool: every hero remains reachable.
  const totalWeight = banner.featuredWeight + pool.length - 1;
  const seen = new Set(Array.from({ length: totalWeight }, (_, i) => summon(summonCfg, banner.id, rich, ids, () => (i + 0.5) / totalWeight).heroId));
  assert.equal(seen.size, pool.length, "every pool hero reachable");
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

// --- Seals: first clears only ---
{
  let p = newCampaignProgress(campaign);
  const won = finishCampaignStage(campaign, p, stages[0].id, { won: true, lives: 10 });
  assert.equal(won.progress.currencies.divineSeals, SEALS, "first clear pays seals");
  assert.ok(!repeatRewards(campaign, stages[0]).some((reward) => reward.id === "divineSeals"), "repeat rewards have no seals");
  assert.ok(repeatRewards(campaign, stages[0]).some((reward) => reward.id === "gold"), "repeat rewards keep gold");
  const again = finishCampaignStage(campaign, won.progress, stages[0].id, { won: true, lives: 10 });
  assert.equal(again.progress.currencies.divineSeals, SEALS, "replay pays no seals");
}

// --- Save section ---
{
  assert.equal(CAMPAIGN_SAVE_VERSION, 3, "save version 3");
  const fresh = sanitizeCampaign(undefined, campaign, heroIds);
  assert.deepEqual([fresh.version, fresh.currencies.divineSeals, fresh.summons], [3, 0, 0], "fresh section");
  const clean = sanitizeCampaign({ version: 3, owned: [...campaign.starters], cleared: {}, currencies: { divineSeals: "120" }, summons: "4.7" }, campaign, heroIds);
  assert.deepEqual([clean.currencies.divineSeals, clean.summons], [120, 4], "seals and summons cleaned");
  const bad = sanitizeCampaign({ version: 3, currencies: { divineSeals: -5 }, summons: -2 }, campaign, heroIds);
  assert.deepEqual([bad.currencies.divineSeals, bad.summons], [0, 0], "negatives clamp to 0");
  const cleared = { [stages[0].id]: { clears: 2, bestLives: 5 }, [stages[1].id]: { clears: 1, bestLives: 3 } };
  // Version 2: cleared before seals existed; the seals of those stages are paid once, gold is not paid again.
  const v2 = sanitizeCampaign({ version: 2, owned: [...campaign.starters], cleared, currencies: { gold: 77, heroXp: 5, divineSeals: 0 }, levels: {} }, campaign, heroIds);
  assert.deepEqual([v2.version, v2.currencies.gold, v2.currencies.heroXp, v2.currencies.divineSeals, v2.summons], [3, 77, 5, SEALS * 2, 0], "version 2 migrates: seals back-paid once");
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

// Stage reward heroes are not summonable (the page removes them from the roster it passes).
{
  const reserved = stageRewardHeroes(campaignData);
  const fromStages = allStages(campaignData).flatMap((stage) => stage.rewards.filter((reward) => reward.type === "hero").map((reward) => reward.id));
  assert.deepEqual([...reserved].sort(), [...new Set(fromStages)].sort(), "stage reward heroes listed");
  assert.ok(reserved.every((id) => !campaignData.starters.includes(id)), "no starter is a stage reward");
}

// --- Multi summon (M27) ---
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

console.log("Tower defense summon checks passed.");

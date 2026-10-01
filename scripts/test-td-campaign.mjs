// Campaign (M26): stage data is valid, unlocks and first-clear rewards follow the rules,
// the save section migrates, and every stage is winnable with heroes the player can own.
import assert from "node:assert/strict";
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { heroMight, heroLevelCap, levelCap, levelScale } from "../src/game/td/campaign.js";
import { collectionReward, ownedHeroes, allStages, chapterLaurels, currentChapter, laurelLives, payMilestones, stageLaurels, CAMPAIGN_SAVE_VERSION, CURRENCIES, collectionHeroes, canLevelUp, canSkillUp, finishCampaignStage, heroLevel, heroSkillLevel, isUnlocked, levelUp, levelUpCost, newCampaignProgress, nextStage, pendingRewards, repeatRewards, sanitizeCampaign, skillUp, skillUpCost, stageGameOptions, validSquad } from "../src/game/td/campaign.js";
import { playRun, maps } from "./lib/td-runner.mjs";
import dbBosses from "../src/data/bosses.json" with { type: "json" };
import tdBosses from "../src/data/tdBosses.json" with { type: "json" };
const knownBosses = new Set([...dbBosses.bosses, ...tdBosses.bosses].map((boss) => boss.id));

// Chapter-aware progress (audit step 4): a second chapter unlocks after the first one's last
// stage; the current chapter follows the next stage and stays on the last chapter at the end.
{
  const first = campaign.chapters[0];
  const last = first.stages.at(-1);
  const two = { ...campaign, chapters: [first, { id: "2", name: "Test", stages: [{ ...first.stages[0], id: "2-1", unlockAfter: last.id }] }] };
  let p = newCampaignProgress(two);
  assert.equal(currentChapter(two, p).id, first.id, "fresh save: chapter 1");
  for (const stage of first.stages) p = finishCampaignStage(two, p, stage.id, { won: true, lives: 1 }).progress;
  assert.equal(nextStage(two, p)?.id, "2-1", "chapter 2 opens after chapter 1");
  assert.equal(currentChapter(two, p).id, "2", "current chapter follows the next stage");
  p = finishCampaignStage(two, p, "2-1", { won: true, lives: 1 }).progress;
  assert.equal(currentChapter(two, p).id, "2", "all clear: last chapter");
}

const heroIds = new Set(heroes.map((hero) => hero.id));
const enemyKinds = new Set([...Object.keys(tuning.enemies), "boss"]);
const stages = allStages(campaign);

// --- Data ---
assert.ok(campaign.squadSize >= 1, "squad size");
assert.ok(campaign.starters.length >= campaign.squadSize && campaign.starters.every((id) => heroIds.has(id)), "starters exist and fill a squad");
assert.equal(new Set(stages.map((stage) => stage.id)).size, stages.length, "stage ids unique");
stages.forEach((stage, i) => {
  assert.ok(maps.some((map) => map.id === stage.mapId), `${stage.id}: map exists`);
  // Optional per-stage boss (replaces the map's): must be a boss the page can name.
  if (stage.boss) assert.ok(knownBosses.has(stage.boss), `${stage.id}: boss ${stage.boss} is in bosses.json or tdBosses.json`);
  assert.ok(stage.waves.length >= 1 && stage.waves.every((wave) => wave.spawns.every((group) => enemyKinds.has(group.kind) && group.count > 0)), `${stage.id}: waves use known enemies`);
  assert.ok(stage.lives >= 1, `${stage.id}: lives`);
  assert.equal(stage.unlockAfter, i === 0 ? null : stages[i - 1].id, `${stage.id}: unlocks after the previous stage`);
  assert.ok(["gold", "heroXp", "divineSeals"].every((id) => stage.rewards.some((reward) => reward.type === "currency" && reward.id === id && reward.amount > 0)), `${stage.id}: first clear pays gold, hero XP and Divine Seals`);
  assert.ok(stage.rewards.filter((reward) => reward.type === "hero").length <= 1, `${stage.id}: at most one reward hero`);
  for (const reward of stage.rewards) if (reward.type === "hero") assert.ok(heroIds.has(reward.id) && !campaign.starters.includes(reward.id), `${stage.id}: reward hero ${reward.id} exists and is not a starter`);
});

// --- Rules ---
{
  let p = newCampaignProgress(campaign);
  assert.deepEqual(p.owned, campaign.starters, "starts with the starters");
  assert.equal(nextStage(campaign, p).id, stages[0].id, "first stage suggested");
  assert.ok(isUnlocked(p, stages[0]) && !isUnlocked(p, stages[1]), "only the first stage is open");
  assert.ok(validSquad(campaign, p, campaign.starters.slice(0, campaign.squadSize)), "owned squad valid");
  // Starters can all fit in the squad; add one more owned hero to exceed the cap.
  const extra = stages.flatMap((stage) => stage.rewards).find((reward) => reward.type === "hero").id;
  p = { ...p, owned: [...p.owned, extra] };
  assert.ok(!validSquad(campaign, p, [...campaign.starters, extra].slice(0, campaign.squadSize + 1)), "too many heroes");
  p = newCampaignProgress(campaign);
  assert.ok(!validSquad(campaign, p, [stages[0].rewards.find((reward) => reward.type === "hero").id]), "locked hero not allowed");
  assert.ok(!validSquad(campaign, p, []), "empty squad");
  const lost = finishCampaignStage(campaign, p, stages[0].id, { won: false, lives: 0 });
  assert.equal(lost.progress, p, "a loss changes nothing");
  const won = finishCampaignStage(campaign, p, stages[0].id, { won: true, lives: 12 });
  const rewardHero = stages[0].rewards.find((reward) => reward.type === "hero").id;
  const gold = stages[0].rewards.find((reward) => reward.id === "gold").amount;
  assert.ok(won.firstClear && won.unlocked.id === stages[1].id, "first clear unlocks");
  p = won.progress;
  assert.ok(p.owned.includes(rewardHero) && isUnlocked(p, stages[1]), "reward hero owned, next stage open");
  assert.equal(p.currencies.gold, gold, "first clear pays its gold");
  assert.equal(pendingRewards(stages[0], p).some((reward) => reward.type === "hero"), false, "hero reward only once");
  const again = finishCampaignStage(campaign, p, stages[0].id, { won: true, lives: 18 });
  assert.ok(!again.firstClear && again.granted.every((reward) => reward.type === "currency"), "replay pays currencies only");
  assert.deepEqual(again.granted, repeatRewards(campaign, stages[0]), "replay pays the repeat share");
  assert.equal(again.progress.currencies.gold, gold + Math.round(gold * campaign.repeatShare), "replay gold added");
  assert.deepEqual(again.progress.cleared[stages[0].id], { clears: 2, bestLives: 18 }, "clears and best lives tracked");
  const options = stageGameOptions(stages[0], ["gaia"], 7);
  assert.deepEqual([options.mode, options.allowedHeroes, options.lives, options.waves], ["classic", ["gaia"], stages[0].lives, stages[0].waves], "game options");
}

// --- Skill levels ---
{
  const id = campaign.starters[0];
  const fresh = newCampaignProgress(campaign);
  assert.equal(heroSkillLevel(fresh, id, "ultimate"), 1, "skills start at level 1");
  assert.deepEqual(skillUpCost(campaign, fresh, id, "ultimate"), { gold: 150 }, "first skill rank costs Gold");
  assert.equal(canSkillUp(campaign, fresh, id, "ultimate"), false, "cannot upgrade without the cost");
  let p = { ...fresh, currencies: { ...fresh.currencies, gold: 5000, sealDust: 200 } };
  p = skillUp(campaign, p, id, "ultimate");
  p = skillUp(campaign, p, id, "ultimate");
  p = skillUp(campaign, p, id, "ultimate");
  assert.equal(heroSkillLevel(p, id, "ultimate"), 4, "ultimate levels independently");
  assert.deepEqual(skillUpCost(campaign, p, id, "ultimate"), { gold: 1000, sealDust: 150 }, "final rank also costs rare material");
  p = skillUp(campaign, p, id, "ultimate");
  assert.equal(heroSkillLevel(p, id, "ultimate"), 5, "skill reaches its cap");
  assert.equal(skillUp(campaign, p, id, "ultimate"), null, "skill cannot pass its cap");
  const passive = skillUp(campaign, { ...p, currencies: { ...p.currencies, gold: 5000 } }, id, "passiveAttack");
  assert.equal(heroSkillLevel(passive, id, "passiveAttack"), 2, "passives level separately from the ultimate");
  const baseHero = heroes.find((hero) => hero.id === id);
  const skilledHero = collectionHeroes(campaign, passive, heroes).find((hero) => hero.id === id);
  assert.ok(skilledHero.atk > baseHero.atk && skilledHero.hp === baseHero.hp, "attack passive affects campaign attack only");
  assert.ok(skilledHero.ultPower > baseHero.ultPower, "ultimate level affects campaign Ultimate power");
}

// --- Hero levels ---
{
  let p = { ...newCampaignProgress(campaign), currencies: { gold: 10000, heroXp: 10000 } };
  const id = campaign.starters[0];
  assert.deepEqual(levelUpCost(campaign, 1), { gold: campaign.heroLevels.cost.gold.base, heroXp: campaign.heroLevels.cost.heroXp.base }, "level 1 -> 2 cost");
  assert.equal(levelUp(campaign, newCampaignProgress(campaign), id), null, "no level up without currencies");
  assert.equal(levelUp(campaign, p, "odin"), null, "only owned heroes level up");
  // Caps by stars: 0 stars -> 10 ... 5 stars -> 60.
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((s) => levelCap(campaign, s)), [10, 20, 30, 40, 50, 60], "level caps by stars");
  const cap0 = heroLevelCap(campaign, p, id);
  for (let i = 1; i < cap0; i += 1) p = levelUp(campaign, p, id);
  assert.equal(heroLevel(p, id), cap0, "levels up to the 0-star cap");
  assert.ok(!canLevelUp(campaign, p, id) && levelUpCost(campaign, cap0, cap0) === null, "capped until a star");
  const starred = { ...p, stars: { [id]: 1 } };
  assert.ok(canLevelUp(campaign, starred, id), "a star lifts the cap");
  assert.equal(levelUpCost(campaign, campaign.heroLevels.max), null, "absolute max");
  // Banded gains: levels 1-10 keep +6% each, later bands add less.
  assert.equal(+levelScale(campaign, 10).toFixed(4), +(1 + 0.06 * 9).toFixed(4), "levels 2-10 unchanged at +6%");
  assert.ok(levelScale(campaign, 20) - levelScale(campaign, 10) < levelScale(campaign, 10) - levelScale(campaign, 1), "later band adds less");
  const scaled = collectionHeroes(campaign, p, heroes).find((hero) => hero.id === id);
  const base = heroes.find((hero) => hero.id === id);
  assert.equal(scaled.atk, Math.round(base.atk * levelScale(campaign, cap0)), "level scales attack");
  assert.equal(collectionHeroes(campaign, p, heroes).find((hero) => hero.id === "odin"), heroes.find((hero) => hero.id === "odin"), "level 1 heroes unchanged");
}

// --- Save section ---
{
  assert.deepEqual(sanitizeCampaign(undefined, campaign, heroIds), newCampaignProgress(campaign), "missing section: fresh progress");
  const clean = sanitizeCampaign({ owned: ["odin", "ghost"], cleared: { "1-1": { clears: "2", bestLives: 9 }, "9-9": { clears: 1 } }, lastSquad: ["odin", "ghost", "nott"] }, campaign, heroIds);
  assert.deepEqual(clean.owned, [...campaign.starters, "odin"], "starters kept, unknown heroes dropped");
  assert.deepEqual(clean.cleared, { "1-1": { clears: 2, bestLives: 9 } }, "unknown stages dropped");
  assert.deepEqual(clean.lastSquad, ["odin"], "last squad only owned heroes");
  const v1 = sanitizeCampaign({ version: 1, owned: [...campaign.starters], cleared: {}, lastSquad: [] }, campaign, heroIds);
  const zero = Object.fromEntries(CURRENCIES.map((id) => [id, 0]));
  assert.deepEqual([v1.version, v1.currencies, v1.levels], [CAMPAIGN_SAVE_VERSION, zero, {}], "version 1 saves migrate: no currencies, level 1");
  const paid = sanitizeCampaign({ version: 1, owned: [...campaign.starters], cleared: { [stages[0].id]: { clears: 3, bestLives: 5 } } }, campaign, heroIds);
  assert.equal(paid.currencies.gold, stages[0].rewards.find((reward) => reward.id === "gold").amount, "version 1 clears are paid once on migration");
  assert.equal(sanitizeCampaign(paid, campaign, heroIds).currencies.gold, paid.currencies.gold, "not paid again");
  const levels = sanitizeCampaign({ owned: ["odin"], levels: { odin: 99, gaia: 3, ghost: 4, nott: 2 }, currencies: { gold: "40", heroXp: -5, gems: 9 } }, campaign, heroIds);
  assert.deepEqual([levels.levels, levels.currencies], [{ odin: levelCap(campaign, 0), gaia: 3 }, { ...zero, gold: 40 }], "levels capped by stars, only owned heroes; currencies cleaned");
  const skills = sanitizeCampaign({ owned: ["odin"], skillLevels: { odin: { ultimate: 99, passiveAttack: 3, unknown: 4 }, ghost: { ultimate: 2 } } }, campaign, heroIds);
  assert.deepEqual(skills.skillLevels, { odin: { ultimate: campaign.heroSkillLevels.max, passiveAttack: 3 } }, "skill levels are capped and unknown skills and heroes are dropped");
}

// --- Winnable: every stage, with the heroes owned by then at the level the chapter's
// first-clear currencies buy (spread evenly over all owned heroes), has winning squads
// (bot, fixed seeds). At most SAMPLE squads per stage, evenly spread over all 4-hero
// combinations, keep the check fast. Below 20% a stage counts as too hard. ---
{
  const SAMPLE = 35;
  const cost = Object.fromEntries(heroes.map((hero) => [hero.id, hero.cost]));
  const combos = (list, k) => (k === 0 ? [[]] : list.flatMap((x, i) => combos(list.slice(i + 1), k - 1).map((c) => [x, ...c])));
  const sample = (list, n) => (list.length <= n ? list : Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]));
  // Expected levels: level the lowest owned hero while the currencies last.
  const spendEvenly = (progress) => {
    for (;;) {
      const lowest = [...progress.owned].sort((a, b) => heroLevel(progress, a) - heroLevel(progress, b))[0];
      const next = levelUp(campaign, progress, lowest);
      if (!next) return progress;
      progress = next;
    }
  };
  let progress = newCampaignProgress(campaign);
  for (const stage of stages) {
    const leveled = spendEvenly(progress);
    const runHeroes = collectionHeroes(campaign, leveled, heroes);
    const levels = leveled.owned.map((id) => heroLevel(leveled, id));
    const map = maps.find((entry) => entry.id === stage.mapId);
    const squads = sample(combos(leveled.owned, campaign.squadSize), SAMPLE);
    const wins = squads.filter((squad, i) => playRun([...squad].sort((a, b) => cost[a] - cost[b]), i + 1, map, { game: stageGameOptions(stage, squad, i + 1, runHeroes) }).won).length;
    const rate = wins / squads.length;
    console.log(`  ${stage.id}: ${wins}/${squads.length} squads win (${leveled.owned.length} heroes, level ${Math.min(...levels)}-${Math.max(...levels)})`);
    assert.ok(rate >= 0.2, `${stage.id}: too hard (${wins}/${squads.length} squads win)`);
    progress = finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress;
  }
}
// --- Might: grows with level, stars and evolution ---
{
  const hero = heroes[0];
  const base = newCampaignProgress(campaign);
  const m = (progress) => heroMight(campaign, progress, hero);
  assert.equal(m(base), hero.atk + hero.hp, "Might at level 1, 0 stars, no evolution is base attack + health");
  assert.ok(m({ ...base, levels: { [hero.id]: 5 } }) > m(base), "Might rises with level");
  assert.ok(m({ ...base, stars: { [hero.id]: 3 } }) > m(base), "Might rises with stars");
  assert.ok(m({ ...base, evolution: { [hero.id]: 2 } }) > m(base), "Might rises with evolution");
}

// --- Stage laurels and chapter milestones (M26 sprint 10) ---
{
  const chapter = campaign.chapters[0];
  const stage = chapter.stages.find((entry) => entry.lives === 15);
  assert.deepEqual(laurelLives(campaign, stage), [0, 8, 14], "15 lives: any clear, 8+, 14+");
  let progress = newCampaignProgress(campaign);
  assert.equal(stageLaurels(campaign, progress, stage), 0, "uncleared stage has none");
  const rated = (lives) => stageLaurels(campaign, { ...progress, cleared: { [stage.id]: { clears: 1, bestLives: lives } } }, stage);
  assert.deepEqual([rated(1), rated(7), rated(8), rated(13), rated(14), rated(15)], [1, 1, 2, 2, 3, 3], "laurel thresholds");
  // Clearing stages in order: milestones pay automatically and only once.
  const byId = Object.fromEntries(chapter.stages.map((entry) => [entry.id, entry]));
  const gold0 = progress.currencies.gold;
  let paidTotal = [];
  let firstLaurels = null;
  for (const entry of chapter.stages) {
    const result = finishCampaignStage(campaign, progress, entry.id, { won: true, lives: entry.lives });
    firstLaurels ??= result.laurels;
    paidTotal = paidTotal.concat(result.milestones.map((m) => m.laurels));
    progress = result.progress;
  }
  assert.deepEqual(firstLaurels, { before: 0, after: 3 }, "a flawless first clear earns 3");
  assert.deepEqual(paidTotal, [10, 20, 30], "all three milestones paid on the way");
  const info = chapterLaurels(campaign, progress, chapter.id);
  assert.deepEqual([info.earned, info.max, info.milestones.every((m) => m.paid)], [30, 30, true], "chapter at 30 / 30, all paid");
  const replay = finishCampaignStage(campaign, progress, chapter.stages[0].id, { won: true, lives: 20 });
  assert.deepEqual(replay.milestones, [], "no second payout");
  assert.deepEqual(payMilestones(campaign, progress).paid, [], "payMilestones idempotent");
  const expectedGold = chapter.stages.reduce((n, entry) => n + entry.rewards.filter((r) => r.id === "gold").reduce((m, r) => m + r.amount, 0), 0)
    + chapter.milestones.flatMap((m) => m.rewards).filter((r) => r.id === "gold").reduce((n, r) => n + r.amount, 0);
  assert.equal(progress.currencies.gold - gold0, expectedGold, "milestone gold added once");
  assert.ok(byId[chapter.stages[0].id], "stage lookup");
  // A loss changes nothing and reports no laurels.
  assert.deepEqual([finishCampaignStage(campaign, progress, stage.id, { won: false, lives: 0 }).laurels], [null], "loss: no laurels");
  // v7 save with 12 laurels already earned: the 10 milestone is paid once on load.
  const cleared = Object.fromEntries(chapter.stages.slice(0, 4).map((entry) => [entry.id, { clears: 1, bestLives: entry.lives }]));
  const v7 = { version: 7, owned: [...campaign.starters], cleared, currencies: { gold: 0, heroXp: 0, divineSeals: 0, sealDust: 0 } };
  const migrated = sanitizeCampaign(v7, campaign, heroIds);
  const ten = chapter.milestones.find((m) => m.laurels === 10);
  assert.deepEqual([migrated.version, migrated.milestones[chapter.id], migrated.currencies.gold], [CAMPAIGN_SAVE_VERSION, [10], ten.rewards.find((r) => r.id === "gold").amount], "v7 -> v8 pays reached milestones once");
  assert.equal(sanitizeCampaign(migrated, campaign, heroIds).currencies.gold, migrated.currencies.gold, "not paid again on reload");
  assert.deepEqual(sanitizeCampaign({ ...migrated, milestones: { [chapter.id]: [10, 999, "x"] } }, campaign, heroIds).milestones[chapter.id], [10], "unknown milestones dropped");
}

// One collection (Phase 2): Free Play and Expedition pay Gold and Hero XP per cleared wave,
// capped per run, never Divine Seals; they deploy only owned heroes.
{
  const cfg = campaign.collectionRewards;
  const amounts = (waves) => Object.fromEntries(collectionReward(campaign, waves).map((reward) => [reward.id, reward.amount]));
  assert.deepEqual(amounts(10), { gold: cfg.perWave.gold * 10, heroXp: cfg.perWave.heroXp * 10 }, "10 waves pay perWave x10");
  assert.deepEqual(amounts(cfg.maxWaves + 50), amounts(cfg.maxWaves), "capped at maxWaves");
  assert.deepEqual(collectionReward(campaign, 0), [], "no cleared wave, no reward");
  assert.deepEqual(collectionReward({ ...campaign, collectionRewards: { perWave: { divineSeals: 5, gold: 1 } } }, 3), [{ type: "currency", id: "gold", amount: 3 }], "never Divine Seals");
  const fresh = newCampaignProgress(campaign);
  assert.deepEqual(ownedHeroes(fresh, heroes).map((hero) => hero.id).sort(), [...campaign.starters].sort(), "new save owns the starters");
}
console.log("Tower defense campaign checks passed.");

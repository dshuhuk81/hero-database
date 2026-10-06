// Campaign (M26): stage data is valid, unlocks and first-clear rewards follow the rules,
// the save section migrates, and every stage is winnable with heroes the player can own.
import assert from "node:assert/strict";
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import rawHeroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { heroMight, heroLevelCap, levelCap, levelScale, mightEnemyScale, starScale } from "../src/game/td/campaign.js";
import { validateTimeline } from "../src/game/td/timeline.js";
import { stageRuleFor, starReachSteps, collectionReward, ownedHeroes, allStages, chapterLaurels, currentChapter, laurelFlags, laurelLives, goalMet, goalText, payMilestones, stageLaurels, CAMPAIGN_SAVE_VERSION, CURRENCIES, collectionHeroes, canLevelUp, canSkillUp, finishCampaignStage, heroLevel, heroSkillLevel, isUnlocked, levelUp, levelUpCost, newCampaignProgress, nextStage, pendingRewards, repeatRewards, sanitizeCampaign, skillUp, skillUpCost, stageGameOptions, validSquad } from "../src/game/td/campaign.js";
import { playRun, maps } from "./lib/td-runner.mjs";
import dbBosses from "../src/data/bosses.json" with { type: "json" };
import tdBosses from "../src/data/tdBosses.json" with { type: "json" };
import { applyHeroMultipliers } from "../src/game/td/hero-multipliers.js";
const heroes = applyHeroMultipliers(rawHeroes, tuning);
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
assert.deepEqual([campaign.squadRows, campaign.squadRowSize, campaign.squadSize], [2, 5, 10], "two five-slot rows provide ten total slots");
assert.ok(campaign.starters.length >= 1 && campaign.starters.every((id) => heroIds.has(id)), "starters exist");
assert.equal(new Set(stages.map((stage) => stage.id)).size, stages.length, "stage ids unique");
stages.forEach((stage, i) => {
  assert.ok(maps.some((map) => map.id === stage.mapId), `${stage.id}: map exists`);
  // Optional per-stage boss (replaces the map's): must be a boss the page can name.
  if (stage.boss) assert.ok(knownBosses.has(stage.boss), `${stage.id}: boss ${stage.boss} is in bosses.json or tdBosses.json`);
  assert.ok(Array.isArray(stage.timeline) && validateTimeline(stage.timeline).length === 0 && stage.timeline.every((group) => enemyKinds.has(group.kind)), `${stage.id}: the timeline is valid and uses known enemies`);
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
  const beforeDebugAccess = structuredClone(p);
  assert.equal(isUnlocked(p, stages[1], true), true, "debug override makes a locked stage playable");
  assert.deepEqual(p, beforeDebugAccess, "debug stage access does not fabricate campaign progress");
  const starterRows = [campaign.starters.slice(0, 5), campaign.starters.slice(5, 10)];
  assert.ok(validSquad(campaign, p, starterRows), "owned rows valid");
  assert.ok(validSquad(campaign, p, [[campaign.starters[0]], []]), "a partial one-hero lineup is valid");
  // Starters can all fit in the squad; add one more owned hero to exceed the cap.
  const rewardStage = stages.find((stage) => stage.rewards.some((reward) => reward.type === "hero"));
  const extra = rewardStage.rewards.find((reward) => reward.type === "hero").id;
  p = { ...p, owned: [...p.owned, extra] };
  assert.ok(!validSquad(campaign, p, [[...campaign.starters, extra], []]), "more than five heroes in one row is invalid");
  p = newCampaignProgress(campaign);
  assert.ok(!validSquad(campaign, p, [[extra], []]), "locked hero not allowed");
  assert.ok(!validSquad(campaign, p, [[], []]), "empty squad");
  const lost = finishCampaignStage(campaign, p, stages[0].id, { won: false, lives: 0 });
  assert.equal(lost.progress, p, "a loss changes nothing");
  const won = finishCampaignStage(campaign, p, stages[0].id, { won: true, lives: 12 });
  const gold = stages[0].rewards.find((reward) => reward.id === "gold").amount;
  assert.ok(won.firstClear && won.unlocked.id === stages[1].id, "first clear unlocks");
  p = won.progress;
  assert.ok(isUnlocked(p, stages[1]), "next stage open");
  assert.equal(p.currencies.gold, gold, "first clear pays its gold");
  const heroWon = finishCampaignStage(campaign, newCampaignProgress(campaign), rewardStage.id, { won: true, lives: 1 });
  assert.ok(heroWon.progress.owned.includes(extra), "the authored reward hero is granted");
  assert.equal(pendingRewards(rewardStage, heroWon.progress).some((reward) => reward.type === "hero"), false, "hero reward only once");
  const again = finishCampaignStage(campaign, p, stages[0].id, { won: true, lives: 18 });
  assert.ok(!again.firstClear && again.granted.every((reward) => reward.type === "currency"), "replay pays currencies only");
  assert.deepEqual(again.granted, repeatRewards(campaign, stages[0]), "replay pays the repeat share");
  assert.equal(again.progress.currencies.gold, gold + Math.round(gold * campaign.repeatShare), "replay gold added");
  assert.deepEqual(again.progress.cleared[stages[0].id], { clears: 2, bestLives: 18, goal: false }, "clears, best lives and the unmet stage goal tracked");
  const options = stageGameOptions(stages[0], [["gaia"], ["fenrir"]], 7);
  assert.deepEqual([options.allowedHeroes, options.squadRows, options.lives, options.timeline], [["gaia", "fenrir"], [["gaia"], ["fenrir"]], stages[0].lives, stages[0].timeline], "game options preserve rows and flatten deployment access");
  assert.equal("waves" in options || "mode" in options, false, "no waves and no run modes");
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

// --- Reach steps from stars (board plan decision 1: range grows outside battle only) ---
{
  assert.deepEqual([0, 2, 3, 4, 5].map((n) => starReachSteps(campaign, n)), [0, 0, 1, 1, 2], "reach steps at 3 and 5 stars");
  const id = heroes[0].id;
  const starred = { ...newCampaignProgress(campaign), owned: [id], stars: { [id]: 3 } };
  assert.equal(collectionHeroes(campaign, starred, heroes).find((h) => h.id === id).reachSteps, 1, "a 3-star hero carries one reach step");
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
  // Linear gain (WoR reference, td:wor-progression): +9.6% of base per level, about x6.7 at level 60 (x10 with 5 stars).
  assert.equal(+levelScale(campaign, 10).toFixed(4), +(1 + 0.096 * 9).toFixed(4), "levels 2-10 add +9.6% each");
  assert.equal(+(levelScale(campaign, 20) - levelScale(campaign, 10)).toFixed(4), +(levelScale(campaign, 10) - levelScale(campaign, 1) + 0.096).toFixed(4), "later bands add the same per level");
  assert.ok(Math.abs(levelScale(campaign, 60) * starScale(campaign, 5) - 10) < 0.5, "level 60 with 5 stars is about x10 over level 1");
  const scaled = collectionHeroes(campaign, p, heroes).find((hero) => hero.id === id);
  const base = heroes.find((hero) => hero.id === id);
  assert.equal(scaled.atk, Math.round(base.atk * levelScale(campaign, cap0)), "level scales attack");
  assert.equal(collectionHeroes(campaign, p, heroes).find((hero) => hero.id === "odin"), heroes.find((hero) => hero.id === "odin"), "level 1 heroes unchanged");
}

// --- Save section ---
{
  assert.deepEqual(sanitizeCampaign(undefined, campaign, heroIds), newCampaignProgress(campaign), "missing section: fresh progress");
  const clean = sanitizeCampaign({ owned: ["odin", "ghost"], cleared: { "1-1": { clears: "2", bestLives: 9 }, "9-9": { clears: 1 } }, lastSquadRows: [["gaia", "ghost", "gaia"], { broken: true }] }, campaign, heroIds);
  assert.deepEqual(clean.owned, [...campaign.starters, "odin"], "starters kept, unknown heroes dropped");
  assert.deepEqual(clean.cleared, { "1-1": { clears: 2, bestLives: 9 } }, "unknown stages dropped");
  assert.deepEqual(clean.lastSquadRows, [["gaia"], []], "row data filters unowned heroes and malformed nested values");
  const lordRows = sanitizeCampaign({ version: CAMPAIGN_SAVE_VERSION, owned: ["isis"], lastSquadRows: [["gaia", "isis"], []] }, campaign, heroIds);
  assert.deepEqual(lordRows.lastSquadRows, [["isis", "gaia"], []], "a saved Lord is normalized to slot zero");
  const legacy = sanitizeCampaign({ ...newCampaignProgress(campaign), currencies: { gold: 123 }, levels: { gaia: 2 }, lastSquad: ["gaia", "fenrir"] }, campaign, heroIds);
  assert.deepEqual(legacy.lastSquadRows, [[], []], "a legacy flat squad is deliberately ignored");
  assert.deepEqual([legacy.currencies.gold, legacy.levels], [123, { gaia: 2 }], "ignoring the old squad preserves unrelated progression");
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
// combinations, keep the check fast. Below 20% a stage is noted (informational: the bot has no focus
// targeting or relocation). This is a bot simulation, so it only runs with `--viability` (about 10 minutes). ---
if (process.argv.includes("--viability")) {
  const SAMPLE = Number(process.argv.find((arg) => arg.startsWith("--sample="))?.split("=")[1] ?? 35);
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
  const fromChapter = Number(process.argv.find(arg => arg.startsWith("--from-chapter="))?.split("=")[1] ?? 1);
  for (const stage of stages) {
    const leveled = spendEvenly(progress);
    if (stage.chapter < fromChapter) {
      progress = finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress;
      continue;
    }
    const runHeroes = collectionHeroes(campaign, leveled, heroes);
    const levels = leveled.owned.map((id) => heroLevel(leveled, id));
    const map = maps.find((entry) => entry.id === stage.mapId);
    const squads = sample(combos(leveled.owned, campaign.squadSize), SAMPLE);
    const wins = squads.filter((squad, i) => playRun([...squad].sort((a, b) => cost[a] - cost[b]), i + 1, map, { game: stageGameOptions(stage, squad, i + 1, runHeroes) }).won).length;
    const rate = wins / squads.length;
    console.log(`  ${stage.id}: ${wins}/${squads.length} squads win (${leveled.owned.length} heroes, level ${Math.min(...levels)}-${Math.max(...levels)})`);
    // Informational only: the bot has no focus targeting or relocation, so a human clears stages it cannot (owner, Oct 5).
    if (rate < 0.2) console.log(`    note: ${stage.id} is below 20% for the bot`);
    progress = finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress;
  }
}
// --- R12: Free Play / Expedition enemy health grows with collection upgrades, by less than 100% ---
{
  const owned = campaign.starters;
  const fresh = newCampaignProgress(campaign);
  assert.equal(mightEnemyScale(campaign, fresh, heroes, owned), 1, "an un-upgraded collection leaves enemy health alone");
  const upgraded = { ...fresh, levels: Object.fromEntries(owned.map((id) => [id, 30])) };
  const ratio = owned.map((id) => heroes.find((h) => h.id === id)).reduce((sum, h) => sum + heroMight(campaign, upgraded, h), 0)
    / owned.map((id) => heroes.find((h) => h.id === id)).reduce((sum, h) => sum + heroMight(campaign, fresh, h), 0);
  const scale = mightEnemyScale(campaign, upgraded, heroes, owned);
  assert.ok(ratio > 2 && scale > 1 && scale < ratio, `enemy health grows (${scale.toFixed(2)}x) by less than the Might ratio (${ratio.toFixed(2)}x)`);
  const maxed = { ...fresh, levels: Object.fromEntries(owned.map((id) => [id, 60])), stars: Object.fromEntries(owned.map((id) => [id, 5])) };
  assert.ok(mightEnemyScale(campaign, maxed, heroes, owned) <= campaign.heroMight.enemyHpCap, "capped");
  assert.equal(mightEnemyScale({ ...campaign, heroMight: { ...campaign.heroMight, enemyHpExponent: 0 } }, upgraded, heroes, owned), 1, "exponent 0 turns it off");
  console.log(`R12 Might enemy scale: level 30 starters x${scale.toFixed(2)} (Might x${ratio.toFixed(2)}).`);
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
  // Goals count shown lives (laurels.lifeUnit 5): 15 lives show as 3; 50% -> 2 shown (6+), 90% -> 3 shown (11+).
  assert.deepEqual(laurelLives(campaign, stage), [0, 6, 11], "15 lives (3 shown): any clear, 2 shown, 3 shown");
  let progress = newCampaignProgress(campaign);
  assert.equal(stageLaurels(campaign, progress, stage), 0, "uncleared stage has none");
  const rated = (lives) => stageLaurels(campaign, { ...progress, cleared: { [stage.id]: { clears: 1, bestLives: lives } } }, stage);
  assert.deepEqual([rated(1), rated(5), rated(6), rated(10), rated(11), rated(15)], [1, 1, 2, 2, 3, 3], "laurel thresholds");
  assert.equal(campaign.laurels.lifeUnit, tuning.board.lifeUnit, "laurels count lives like the battle shows them");
  // Clearing stages in order: milestones pay automatically and only once.
  const byId = Object.fromEntries(chapter.stages.map((entry) => [entry.id, entry]));
  const gold0 = progress.currencies.gold;
  let paidTotal = [];
  let firstLaurels = null;
  for (const entry of chapter.stages) {
    const result = finishCampaignStage(campaign, progress, entry.id, { won: true, lives: entry.lives, facts: { classes: new Set(), heroes: 1, heroDeaths: 0, leakKinds: {} } }); // meets every stage goal
    firstLaurels ??= result.laurels;
    paidTotal = paidTotal.concat(result.milestones.map((m) => m.laurels));
    progress = result.progress;
  }
  assert.deepEqual([firstLaurels.before, firstLaurels.after, firstLaurels.flags], [0, 3, [true, true, true]], "a flawless first clear that meets the goal earns 3");
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
  // Heroic campaign: open once the whole chapter is cleared; the first Heroic clear pays seals once.
  const { heroicUnlocked, heroicRewards } = await import("../src/game/td/campaign.js");
  const first = chapter.stages[0];
  assert.ok(!heroicUnlocked(campaign, newCampaignProgress(campaign), first), "Heroic stays closed before the chapter is cleared");
  assert.ok(heroicUnlocked(campaign, progress, first), "a cleared chapter opens Heroic");
  const seals = heroicRewards(campaign, first, progress).find((reward) => reward.id === "divineSeals")?.amount ?? 0;
  assert.ok(seals > 0, "a Heroic first clear pays seals");
  const heroicWin = finishCampaignStage(campaign, progress, first.id, { won: true, lives: 5, heroic: true });
  assert.equal(heroicWin.progress.currencies.divineSeals - progress.currencies.divineSeals, seals, "Heroic seals paid");
  assert.deepEqual([heroicWin.progress.cleared, heroicWin.milestones], [progress.cleared, []], "Heroic clears leave laurels and milestones alone");
  const heroicGold = (granted) => granted.filter((reward) => reward.id === "gold").reduce((sum, reward) => sum + reward.amount, 0);
  const stageGold = first.rewards.filter((reward) => reward.id === "gold").reduce((sum, reward) => sum + reward.amount, 0);
  assert.equal(heroicGold(heroicWin.granted), Math.round(stageGold * campaign.heroic.currencyShare), "a Heroic clear pays a share of the stage's Gold");
  const heroicAgain = finishCampaignStage(campaign, heroicWin.progress, first.id, { won: true, lives: 5, heroic: true }).granted;
  assert.equal(heroicGold(heroicAgain), heroicGold(heroicWin.granted), "a Heroic replay pays the Gold again");
  assert.ok(!heroicAgain.some((reward) => reward.id === "divineSeals"), "Heroic seals only on the first Heroic clear");
  assert.deepEqual(sanitizeCampaign(heroicWin.progress, campaign, heroIds).heroic, heroicWin.progress.heroic, "Heroic clears survive the save");
  assert.equal(stageGameOptions(first, [], 1, null, true).tier, "heroic", "Heroic plays on the Heroic tier");
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

// Stage goals (A1): laurel 3 is the stage's own goal; a goal once met stays met, and a laurel
// earned by lives before goals existed is kept.
{
  const stage = allStages(campaign).find((entry) => entry.goal?.type === "noClass");
  const facts = (over = {}) => ({ classes: new Set(["Tank"]), heroes: 3, heroDeaths: 0, leakKinds: {}, ...over });
  assert.ok(allStages(campaign).every((entry) => entry.goal && goalText(entry.goal)), "every stage has a readable goal");
  assert.ok(goalMet({ type: "noClass", class: "Mage" }, facts()) && !goalMet({ type: "noClass", class: "Mage" }, facts({ classes: new Set(["Mage"]) })), "noClass");
  assert.ok(goalMet({ type: "maxHeroes", count: 3 }, facts()) && !goalMet({ type: "maxHeroes", count: 2 }, facts()), "maxHeroes");
  assert.ok(goalMet({ type: "noFall" }, facts()) && !goalMet({ type: "noFall" }, facts({ heroDeaths: 1 })), "noFall");
  assert.ok(goalMet({ type: "noLeakKind", kind: "flyer" }, facts()) && !goalMet({ type: "noLeakKind", kind: "flyer" }, facts({ leakKinds: { flyer: 1 } })), "noLeakKind");
  const miss = finishCampaignStage(campaign, newCampaignProgress(campaign), stage.id, { won: true, lives: stage.lives, facts: facts({ classes: new Set([stage.goal.class]) }) });
  assert.deepEqual(laurelFlags(campaign, miss.progress, stage), [true, true, false], "full lives without the goal: two laurels, not three");
  const hit = finishCampaignStage(campaign, miss.progress, stage.id, { won: true, lives: 1, facts: facts() });
  assert.deepEqual(laurelFlags(campaign, hit.progress, stage), [true, true, true], "meeting the goal on a later clear earns laurel 3");
  assert.equal(stageLaurels(campaign, hit.progress, stage), 3);
  const again = finishCampaignStage(campaign, hit.progress, stage.id, { won: true, lives: 1, facts: facts({ classes: new Set([stage.goal.class]) }) });
  assert.equal(laurelFlags(campaign, again.progress, stage)[2], true, "a met goal is not lost on a worse run");
  const old = { ...newCampaignProgress(campaign), cleared: { [stage.id]: { clears: 1, bestLives: stage.lives } } };
  assert.equal(laurelFlags(campaign, old, stage)[2], true, "a laurel earned by lives before goals existed is kept");
  const kept = finishCampaignStage(campaign, old, stage.id, { won: true, lives: 1, facts: facts({ classes: new Set([stage.goal.class]) }) });
  assert.equal(laurelFlags(campaign, kept.progress, stage)[2], true, "...even after a later clear that misses the goal");
  const saved = sanitizeCampaign(JSON.parse(JSON.stringify(hit.progress)), campaign, new Set(heroes.map((hero) => hero.id)));
  assert.equal(saved.cleared[stage.id].goal, true, "the goal survives the save check");
}

// One collection (Phase 2): Free Play and Expedition pay Gold and Hero XP per enemy defeated,
// capped per run, never Divine Seals; they deploy only owned heroes.
{
  const cfg = campaign.collectionRewards;
  const amounts = (defeated) => Object.fromEntries(collectionReward(campaign, defeated).map((reward) => [reward.id, reward.amount]));
  assert.deepEqual(amounts(10), { gold: cfg.perDefeated.gold * 10, heroXp: cfg.perDefeated.heroXp * 10 }, "10 enemies pay perDefeated x10");
  assert.deepEqual(amounts(cfg.maxDefeated + 50), amounts(cfg.maxDefeated), "capped at maxDefeated");
  assert.deepEqual(collectionReward(campaign, 0), [], "no enemy defeated, no reward");
  assert.deepEqual(collectionReward({ ...campaign, collectionRewards: { perDefeated: { divineSeals: 5, gold: 1 } } }, 3), [{ type: "currency", id: "gold", amount: 3 }], "never Divine Seals");
  const fresh = newCampaignProgress(campaign);
  assert.deepEqual(ownedHeroes(fresh, heroes).map((hero) => hero.id).sort(), [...campaign.starters].sort(), "new save owns the starters");
}
// Stage rules (A2): every named rule exists and reaches the game options.
{
  const withRule = allStages(campaign).filter((entry) => entry.rule);
  assert.ok(withRule.length > 20 && withRule.every((entry) => stageRuleFor(entry)?.mods), "every stage rule names a defined rule");
  assert.equal(stageRuleFor(allStages(campaign)[0]), null, "the first stage is plain");
  assert.deepEqual(stageGameOptions(withRule[0], [["gaia"], []], 1).stageRule, stageRuleFor(withRule[0]), "the rule goes into the game options");
}

// Reactions a squad can trigger (C2): both halves must be on the squad.
{
  const { squadReactions } = await import("../src/game/td/reactions.js");
  const team = (...ids) => ids.map((id) => ({ id, name: id }));
  const ids = (list) => squadReactions(list, tuning).map((reaction) => reaction.id).sort();
  assert.deepEqual(ids(team("aegir")), [], "one half alone is no reaction");
  assert.deepEqual(ids(team("aegir", "hephaestus")), ["steam"], "Wet + Burn");
  assert.deepEqual(ids(team("aegir", "ymir", "hephaestus")), ["freeze", "steam"], "Wet + Chill and Wet + Burn");
  assert.deepEqual(ids(team("stheno", "hephaestus")), ["blight"], "Poison + Burn");
  assert.deepEqual(ids(team("aegir", "odin")), ["conduct"], "Wet + chain lightning");
  assert.deepEqual(ids(team("thanatos", "fenrir")), ["harvest"], "Thanatos + poison");
  assert.deepEqual(squadReactions(team("aegir", "hephaestus"), tuning)[0].names, ["aegir", "hephaestus"], "names the heroes behind it");
}
console.log("Tower defense campaign checks passed.");

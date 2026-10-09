// Hero talents T1 (docs/tower-defense-hero-talents-concept.md): data shape, unlock gates and prices,
// switching, collection stats and save sanitizing.
import assert from "node:assert/strict";
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import talentData from "../src/data/tdTalents.json" with { type: "json" };
import { CAMPAIGN_SAVE_VERSION, collectionHeroes, heroTalents, newCampaignProgress, sanitizeCampaign, switchTalent, talentEligible, talentPool, talentSlot, unlockTalent } from "../src/game/td/campaign.js";

// Data: 6 class pairs, 22 signature pairs for the 22 non-recruit heroes, no recruit talents.
{
  assert.equal(Object.keys(talentData.classes).length, 6);
  assert.ok(Object.values(talentData.classes).every((pair) => pair.length === 2));
  assert.equal(Object.keys(talentData.heroes).length, 22);
  assert.ok(Object.values(talentData.heroes).every((pair) => pair.length === 2));
  const eligible = heroes.filter((hero) => talentEligible(hero.id));
  assert.equal(eligible.length, 22);
  assert.ok(eligible.every((hero) => hero.rarity !== "common"), "recruits are common and excluded");
  assert.ok(heroes.filter((hero) => hero.rarity === "common").every((hero) => !talentEligible(hero.id)));
  assert.equal(talentPool("recruit-bram", "I").length, 0);
  assert.equal(CAMPAIGN_SAVE_VERSION, 12);
}

const chapterStages = (n) => campaign.chapters.find((chapter) => Number(chapter.id) === n).stages.map((stage) => stage.id);
const clearChapter = (progress, n) => ({ ...progress, cleared: Object.fromEntries([...Object.entries(progress.cleared), ...chapterStages(n).map((id) => [id, { clears: 1, bestLives: 5 }])]) });
// A hero that has everything except the one thing a test changes.
const ready = (overrides = {}) => {
  const base = { ...newCampaignProgress(campaign), owned: ["odin", "recruit-bram"], currencies: { gold: 10000, sealDust: 500, heroXp: 0, divineSeals: 0 } };
  return clearChapter({ ...base, ...overrides }, 4);
};

// Gates: Tier I after Chapter 4 at Level 20 with a star; Tier II after Chapter 8 at Level 40 with 3 stars.
{
  const fresh = newCampaignProgress(campaign);
  fresh.owned = ["odin"];
  fresh.currencies = { gold: 10000, sealDust: 500 };
  fresh.levels = { odin: 40 };
  fresh.stars = { odin: 3 };
  assert.equal(talentSlot(campaign, fresh, "odin", "I").requirement, "Clear Chapter 4");
  assert.equal(unlockTalent(campaign, fresh, "odin", "I", "mage-focus-lens"), null);
  const cleared = clearChapter(fresh, 4);
  assert.equal(talentSlot(campaign, cleared, "odin", "I").locked, false);
  const low = { ...cleared, levels: { odin: 19 }, stars: { odin: 1 } };
  assert.equal(talentSlot(campaign, low, "odin", "I").requirement, "Level 20");
  const starless = { ...cleared, levels: { odin: 25 }, stars: { odin: 0 } };
  assert.equal(talentSlot(campaign, starless, "odin", "I").requirement, "1 star");
  const tier1 = { ...cleared, levels: { odin: 45 }, stars: { odin: 3 } };
  assert.equal(talentSlot(campaign, tier1, "odin", "II").requirement, "Clear Chapter 8", "Tier II waits for Chapter 8");
  const chapter8 = clearChapter(tier1, 8);
  assert.equal(talentSlot(campaign, chapter8, "odin", "II").locked, false, "Tier II opens after Chapter 8");
  assert.equal(talentSlot(campaign, { ...chapter8, levels: { odin: 39 } }, "odin", "II").requirement, "Level 40");
  assert.equal(talentSlot(campaign, tier1, "odin", "I").requirement, null);
}

// Unlock: pays Gold and Seal Dust, chooses one talent of the tier, no second unlock.
{
  const progress = ready({ levels: { odin: 20 }, stars: { odin: 1 } });
  const pool = talentPool("odin", "I").map((talent) => talent.id);
  assert.equal(unlockTalent(campaign, progress, "odin", "I", "recruit-x"), null, "unknown talent id");
  assert.equal(unlockTalent(campaign, progress, "odin", "I", talentData.heroes.odin[0].id), null, "a Tier II talent in Tier I");
  const next = unlockTalent(campaign, progress, "odin", "I", pool[0]);
  assert.ok(next, "unlocks");
  assert.equal(next.currencies.gold, progress.currencies.gold - 1000);
  assert.equal(next.currencies.sealDust, progress.currencies.sealDust - 30);
  assert.equal(next.talents.odin.I, pool[0]);
  assert.equal(unlockTalent(campaign, next, "odin", "I", pool[1]), null, "a second unlock of the same tier is refused");
  const poor = { ...progress, currencies: { gold: 999, sealDust: 500 } };
  assert.equal(unlockTalent(campaign, poor, "odin", "I", pool[0]), null, "not enough Gold");
}

// Switching: never free, Tier I 200 Gold, Tier II 500 Gold, only for unlocked tiers.
{
  const progress = ready({ levels: { odin: 40 }, stars: { odin: 3 }, talents: { odin: { I: "mage-focus-lens" } } });
  const other = talentPool("odin", "I").find((talent) => talent.id !== "mage-focus-lens").id;
  assert.equal(switchTalent(campaign, progress, "odin", "I", other).currencies.gold, progress.currencies.gold - 200);
  assert.equal(switchTalent(campaign, progress, "odin", "I", "mage-focus-lens"), null, "same talent is no switch");
  assert.equal(switchTalent(campaign, progress, "odin", "II", talentData.heroes.odin[1].id), null, "Tier II not unlocked");
  const t2 = { ...progress, talents: { odin: { I: "mage-focus-lens", II: talentData.heroes.odin[0].id } } };
  const swapped = switchTalent(campaign, t2, "odin", "II", talentData.heroes.odin[1].id);
  assert.equal(swapped.currencies.gold, t2.currencies.gold - 500);
  assert.equal(swapped.talents.odin.II, talentData.heroes.odin[1].id);
  assert.equal(switchTalent(campaign, { ...progress, currencies: { gold: 100, sealDust: 0 } }, "odin", "I", other), null, "no switch without Gold");
}

// Collection stats: chosen talents reach the battle hero; a hero without talents is unchanged.
{
  const base = ready({ levels: { odin: 40 }, stars: { odin: 3 } });
  const hero = heroes.find((entry) => entry.id === "odin");
  const plain = collectionHeroes(campaign, base, [hero])[0];
  assert.equal("talents" in plain, false, "no talents: no talents field");
  const withTalent = collectionHeroes(campaign, { ...base, talents: { odin: { I: talentPool("odin", "I")[0].id, II: talentData.heroes.odin[1].id } } }, [hero])[0];
  assert.deepEqual(withTalent.talents, [talentPool("odin", "I")[0].id, talentData.heroes.odin[1].id]);
  const { talents, ...stripped } = withTalent;
  assert.deepEqual(stripped, plain, "talents change nothing else in the collection stats");
  assert.equal(heroTalents({ talents: { odin: { I: talentPool("odin", "I")[0].id } } }, "odin")[0].name, talentPool("odin", "I")[0].name);
}

// Save: invalid, foreign and recruit talents are dropped; a valid one survives a round trip.
{
  const raw = { ...ready({ levels: { odin: 40 }, stars: { odin: 3 } }), talents: {
    odin: { I: talentPool("odin", "I")[1].id, II: "not-a-talent" },
    "recruit-bram": { I: "tank-iron-wall" },
    atlas: { I: "tank-iron-wall" },
  } };
  const clean = sanitizeCampaign(raw, campaign, new Set(heroes.map((hero) => hero.id)));
  assert.equal(clean.version, 12);
  assert.deepEqual(clean.talents, { odin: { I: talentPool("odin", "I")[1].id } });
  const again = sanitizeCampaign(clean, campaign, new Set(heroes.map((hero) => hero.id)));
  assert.deepEqual(again.talents, clean.talents);
}

console.log("td talents ok");

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getHeroById(id) {
  const heroPath = join(__dirname, `../src/data/heroes/${id}.json`);
  try {
    return JSON.parse(readFileSync(heroPath, "utf-8"));
  } catch (e) {
    return null;
  }
}

function keywordTagsForHero(hero) {
  const text = fullSkillText(hero).toLowerCase();
  const tags = [];
  const add = (label, ok) => { if (ok && !tags.includes(label)) tags.push(label); };

  // Ally Heal
  const allyHeal = /\b(heals?|restores?|recovers?)\s+(?:several|multiple|all|nearby|the|an?)?\s*(?:hp|health)?\s*(?:to|for)?\s*(allies?|ally)\b/.test(text) ||
    /\b(heals?|restores?|recovers?)\s+(?:hp|health)?\s+(?:equal\s+)?to\s+[\s\S]{0,60}\b(allies?|ally)\b/.test(text);
  
  const heroName = (hero?.name?.toLowerCase?.() || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const selfHeal = (heroName && new RegExp(`\\b(heals?|restores?|recovers?)\\s+(?:\\w+\\s+)?${heroName}\\b`).test(text)) ||
    /\b(heals?|restores?)\s+(?:himself|herself|itself|self)\b/.test(text);
  
  const genericHpRestore = /\b(restores?|recovers?)\s+hp\b/.test(text) && 
    !/\b(allies?|ally|team|party)\b/.test(text.substring(Math.max(0, text.indexOf('restores hp') - 100), text.indexOf('restores hp') + 100));
  
  const antiHeal = /\b(cannot receive (?:shields? or )?healing|cannot be healed|prevents? healing|healing reduction|reduce(s|d)? healing|healing is reduced|stop(s|ped)? healing|ban(s|ned)? healing)\b/.test(text);

  add("Ally Heal", allyHeal);
  add("Self Heal", !allyHeal && (selfHeal || genericHpRestore));
  add("Anti-Heal", antiHeal);
  add("Shield", /\bshield\b/.test(text));
  add("Cleanse", /\b(removes?|remove|cleanse[sd]?)\s+(?:one|a|an?|the|all|any|multiple)?\s*(?:debuffs?|negative\s+effects?)\b/.test(text));
  add("Control", /\b(stun|silence|freeze|root|sleep|charm|taunt|knock)\w*\b/.test(text));
  add("AoE", /\b(all enemies|nearby enemies|in a large area|aoe)\b/.test(text));
  add("Energy", /\benergy\b/.test(text));
  add("Cooldown", /\b(cooldown|cd)\b/.test(text));
  add("Backline", /\b(farthest enemy|back row|rear row|behind|teleport|blink)\b/.test(text));
  add("Def Shred", /\b(reduce defense|defense down|armor down|vulnerab)\w*\b/.test(text));

  return tags;
}

function fullSkillText(h) {
  const parts = [];
  for (const sk of (h.skills || [])) {
    if (sk?.description) parts.push(sk.description);
    if (sk?.upgrades) parts.push(...Object.values(sk.upgrades));
  }
  if (h.relic?.description) parts.push(h.relic.description);
  if (h.relic?.upgrades) parts.push(...Object.values(h.relic.upgrades));
  return parts.join(" ");
}

// Test specific heroes
const heroIds = ["cashien", "dionysus", "yuelao"];

for (const id of heroIds) {
  const hero = getHeroById(id);
  if (!hero) {
    console.log(`Hero ${id} not found!`);
    continue;
  }
  
  const tags = keywordTagsForHero(hero);
  const text = fullSkillText(hero).toLowerCase();
  
  console.log(`\n=== ${hero.name} ===`);
  console.log("Tags:", tags);
  
  // Check for cleanse-related text
  const cleanseRegex = /\b(removes?|remove|cleanse[sd]?)\s+(?:one|a|an?|the)?\s*(?:debuffs?|negative\s+effects?)\b/;
  const match = text.match(cleanseRegex);
  if (match) {
    console.log("Cleanse match found:", match[0]);
    console.log("Context:", text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + 100)));
  } else {
    console.log("No cleanse pattern matched");
  }
}

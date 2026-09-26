import { buildWave, MODE_WAVES, isRunMode, wavesForMode } from "./waves.js";
import { mapLanes } from "./lanes.js";

const K = 260;
// Sideways spread of spawned enemies (px from the path centre), cycled per spawn.
const SWAY = [0, 10, -10, 5, -14, 14, -5];
const STEP = 1 / 60;
const REACTION_COLORS = { conduct: "purple", steam: "white", blight: "green", freeze: "white", harvest: "purple" };
// Hero target priorities (popover icons, M1). "auto" is the class rule in targetOrder().
export const TARGET_MODES = ["auto", "first", "last", "strongest", "weakest", "fastest", "ground", "flying", "boss"];

export function createRng(seed = 0x51f15e) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const mitigation = (resistance) => resistance / (resistance + K);
export function resolveDamage(attack, resistance, type = "physical", critical = false) {
  const reduced = type === "true" ? attack : attack * (1 - mitigation(resistance));
  return reduced * (critical ? 1.5 : 1);
}

function pathMetrics(points) {
  const lengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const length = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    lengths.push(length);
    total += length;
  }
  return { lengths, total };
}

// `offset` shifts the point sideways from the path centre (px, left of travel direction).
export function pointOnPath(points, distance, offset = 0) {
  let remaining = distance;
  for (let i = 1; i < points.length; i += 1) {
    const ax = points[i - 1][0]; const ay = points[i - 1][1];
    const bx = points[i][0]; const by = points[i][1];
    const segment = Math.hypot(bx - ax, by - ay);
    if (remaining <= segment) {
      const t = segment ? remaining / segment : 0;
      const nx = segment ? -(by - ay) / segment : 0;
      const ny = segment ? (bx - ax) / segment : 0;
      return { x: ax + (bx - ax) * t + nx * offset, y: ay + (by - ay) * t + ny * offset };
    }
    remaining -= segment;
  }
  const last = points.at(-1);
  return { x: last[0], y: last[1] };
}

export class TowerDefenseGame {
  constructor({ heroes, tuning, map, waves, mode = "classic", tier = "normal", seed = 1337, allowedHeroes = null, mutators = null, onChange = () => {} }) {
    this.heroesById = new Map(heroes.map((hero) => [hero.id, hero]));
    // Daily Trial (M19): only these heroes can be deployed, and these mutators are active from wave 1.
    this.allowedHeroes = allowedHeroes ? new Set(allowedHeroes) : null;
    this.presetMutators = (mutators ?? []).filter((id) => tuning.mutators?.pool?.[id]);
    this.tuning = tuning;
    this.support = tuning.support || { healFraction: 0.18, auraAttackBonus: 0.25, auraDuration: 6 };
    this.classes = tuning.classes || {}; // class kits (M6): how each class attacks, blocks and supports
    this.virtueEffects = tuning.virtueEffects || {};
    this.favor = tuning.favor || {}; // permanent Divine Blessing bonuses (favor.js)
    // Difficulty knobs (tuning.difficulty); the debug panel edits them live.
    this.difficulty = { enemyHp: 1, enemySpeed: 1, killGold: 1, waveHpScale: 0.15, invincible: false, ...(tuning.difficulty || {}) };
    // Difficulty tier (M3) for the finite modes; endless has its own ramp and stays Normal.
    // Kept apart from `difficulty`, which the dev debug panel overwrites.
    this.tier = mode !== "endless" && tuning.tiers?.[tier] ? tier : "normal";
    const tierCfg = tuning.tiers?.[this.tier] ?? {};
    this.tierHp = tierCfg.enemyHp ?? 1;
    this.tierAttack = tierCfg.enemyAttack ?? 1;
    this.map = map;
    // Run mode (waves.js): classic = tdWaves.json, long = 20 waves, endless = until the last life.
    this.mode = isRunMode(mode) ? mode : "classic";
    this.baseWaves = waves;
    this.waves = wavesForMode(waves, this.mode, tuning.waveGen);
    this.totalWaves = this.mode === "classic" ? this.waves.length : MODE_WAVES[this.mode];
    this.rng = createRng(seed);
    // Quests draw from their own stream so combat randomness is unchanged by them.
    this.questRng = createRng((seed ^ 0x7a3d9c1) >>> 0);
    this.mutatorRng = createRng((seed ^ 0x3c6ef372) >>> 0);
    this.boonRng = createRng((seed ^ 0x5be0cd19) >>> 0); // rare / epic run blessing rolls (M17) // endless mutator offers (M15), apart from combat
    this.onChange = onChange;
    this.onEffect = null; // optional hook (effect) => void, used for audio
    this.lanes = mapLanes(map).map((lane) => ({ ...lane, ...pathMetrics(lane.path) }));
    // Longest route: speed quests and tests size their limits by it.
    this.path = this.lanes.reduce((longest, lane) => (lane.total > longest.total ? lane : longest));
    // Final boss per map (tdMaps.json "boss"); tuning.bosses holds its stat overrides and skills.
    this.bossId = map.boss ?? "baphomet";
    this.bossTuning = tuning.bosses?.[this.bossId] ?? null;
    this.reset();
  }

  reset() {
    this.gold = this.tuning.run.startingGold;
    this.lives = this.tuning.run.lives;
    this.score = 0;
    this.wave = 0;
    this.team = [];
    this.heroes = [];
    this.enemies = [];
    this.effects = [];
    this.running = false;
    this.paused = false;
    this.complete = false;
    this.won = false;
    this.spawnQueue = [];
    this.spawnClock = 0;
    this.accumulator = 0;
    this.entityId = 1;
    this.time = 0;
    this.waveStats = null;
    this.virtues = [];
    this.activePairs = [];
    this.virtueOffer = null;
    this.boons = []; // rare and epic run blessings chosen this run (M17)
    this.rallyUntil = 0;
    this.reaperKills = 0;
    this.mutators = [...(this.presetMutators ?? [])]; // endless mutators chosen this run (M15), Daily Trial ones first
    this.mutatorWaves = 0; // sum of the mutators' Favor shares over the waves cleared with them
    this.mutatorOffer = null;
    this.spawnCount = 0;
    this.quest = null;
    this.questsDone = 0;
    this.totalLeaks = 0;
    this.perfect = false;
    this.fallenHeroes = [];
    this.heroKills = {};
    this.heroStats = {}; // per hero id: damage, boss, dot, heal, buff, kills (M14 result screen)
    this.leakKinds = {}; // lives lost per enemy kind over the run
    this.reactionsSeen = new Set(); // reactions triggered this run (first one of each gets a notice)
    this.reactionCounts = {};
    this.lastReaction = null;
    this.insightLog = {}; // per class { waves, kills } for Insight at run end (favor.js computeInsight)
    this.totalGoldEarned = 0;
    this.totalGoldSpent = 0;
    this.fieldedIds = []; // every hero id deployed this run, sold or fallen ones included (M20 challenges)
    this.upgradesBought = 0; // levels, Awakenings and trainings bought this run (M20 challenges)
    this.goldCarry = 0; // fractional kill-gold bonus not yet paid out
    this.runDuration = 0;
    // Virtue shard (6C): the run starts with this virtue already chosen.
    const startVirtue = this.tuning.run.startVirtue;
    if (startVirtue && this.virtueEffects[startVirtue]) this.addVirtue(startVirtue);
    this.onChange("reset", this);
  }

  setTeam(ids) {
    const valid = [...new Set(ids)].filter((id) => this.heroesById.has(id));
    if (!valid.length) return false;
    this.team = valid;
    this.onChange("team", this);
    return true;
  }

  // Deploy price; heroes that fell earlier this run can be cheaper (tuning.blocking.redeployCostFactor).
  deployCost(heroId) {
    const base = this.heroesById.get(heroId);
    const factor = this.tuning.blocking?.redeployCostFactor;
    if (!base) return Infinity;
    return factor && this.fallenHeroes.some((entry) => entry.id === heroId) ? Math.round(base.cost * factor) : base.cost;
  }

  place(heroId, slotType, slotIndex) {
    const base = this.heroesById.get(heroId);
    const cost = this.deployCost(heroId);
    if (!base || base.slot !== slotType || this.gold < cost) return false;
    if (this.allowedHeroes && !this.allowedHeroes.has(heroId)) return false;
    if (this.heroes.some((hero) => hero.id === heroId)) return false;
    if (this.heroes.some((hero) => hero.slotType === slotType && hero.slotIndex === slotIndex)) return false;
    // No team cap: free rings and gold are the only limits. `team` records who was fielded.
    const slot = (slotType === "road" ? this.map.roadSlots : this.map.platformSlots)[slotIndex];
    if (!slot) return false;
    if (!this.team.includes(heroId)) {
      this.team = [...this.team, heroId];
      this.onChange("team", this);
    }
    this.gold -= cost;
    this.totalGoldSpent += cost;
    if (!this.fieldedIds.includes(heroId)) this.fieldedIds.push(heroId);
    const hp = this.maxHpFor(base.hp, 1, base.class);
    const skill = this.tuning.heroSkills?.[heroId];
    this.heroes.push({ ...base, range: this.rangeFor(base) * (1 + (this.ringAt(slotType, slotIndex)?.range || 0)), entityId: this.entityId++, x: slot[0], y: slot[1], slotType, slotIndex, hp, hpLeft: hp, attackClock: 0, ultClock: 0, rotation: this.defaultRotationFor(slot[0], slot[1]), targeting: "auto", level: 1, baseAtk: base.atk, baseHp: base.hp, variant: skill?.variant ?? null, skillName: skill?.skillName ?? null, basic: skill?.basic ?? null });
    // Early Ascension (class blessing): the unit enters at a higher level, below the focus level.
    const startLevel = Math.min(1 + (this.classBonus(base).startLevel || 0), (this.tuning.upgrades.focus?.level ?? Infinity) - 1, this.tuning.upgrades.maxLevel);
    if (startLevel > 1) {
      const placed = this.heroes.at(-1);
      placed.level = startLevel;
      placed.atk = this.atkFor(placed, startLevel);
      placed.hp = placed.hpLeft = this.maxHpFor(base.hp, startLevel, base.class);
    }
    this.heroes.at(-1).invested = cost; // deploy, upgrades and awakening paid for this unit (sell refund)
    if (this.running) this.waveHeroes?.set(this.heroes.at(-1).entityId, base.class);
    this.emit({ type: "place", heroId, x: slot[0], y: slot[1] });
    this.onChange("place", this);
    return true;
  }

  // Aggregated modifiers from chosen virtues and any triggered pairs.
  modifiers() {
    const totals = { atk: 0, res: 0, hp: 0, heal: 0, regen: 0, crit: 0, dodge: 0 };
    for (const name of this.virtues) {
      const effect = this.virtueEffects[name];
      if (effect && totals[effect.type] !== undefined) totals[effect.type] += effect.value;
    }
    for (const pair of this.activePairs) {
      const effect = pair.effect;
      if (effect && totals[effect.type] !== undefined) totals[effect.type] += effect.value;
    }
    return totals;
  }

  // Divine Blessings class branch bonuses (favor.js applyBlessings) for a hero or class name.
  classBonus(heroOrClass) {
    const cls = typeof heroOrClass === "string" ? heroOrClass : heroOrClass?.class;
    return this.favor.classBonus?.[cls] ?? {};
  }

  // Class kit (tuning.classes) for a hero or class name.
  kit(heroOrClass) {
    const cls = typeof heroOrClass === "string" ? heroOrClass : heroOrClass?.class;
    return this.classes[cls] ?? {};
  }

  maxHpFor(baseHp, level, heroClass, awakened = false, focus = null, trained = null) {
    const tuning = this.tuning.upgrades;
    const cb = this.classBonus(heroClass);
    const favorHp = (this.favor.heroHpBonus || 0) + (cb.hp || 0);
    const awake = awakened ? 1 + (this.tuning.awakening?.healthBonus || 0) + (cb.awakenBonus || 0) : 1;
    return Math.round(baseHp * (1 + tuning.healthPerLevel * (level - 1)) * (1 + this.modifiers().hp) * (1 + favorHp) * awake * this.focusMult(focus, "health") * this.trainMult(trained, "health"));
  }

  // Training (tuning.training): after Awakening a hero can train attack, health or range
  // again and again; each training adds its share, range at most rangeCap times.
  trainMult(trained, stat) {
    return 1 + (this.tuning.training?.[stat] || 0) * (trained?.[stat] || 0);
  }

  trainingCost(hero) {
    const cfg = this.tuning.training;
    const done = Object.values(hero.trained || {}).reduce((sum, n) => sum + n, 0);
    return Math.round(cfg.cost * cfg.costGrowth ** done * (1 - (this.favor.upgradeDiscount || 0)));
  }

  // Class path chosen at tuning.upgrades.path.level (M12): its numbers from tuning.paths.
  pathFx(hero, id) {
    if (!hero?.path || (id && hero.path !== id)) return null;
    return this.tuning.paths?.[hero.class]?.[hero.path] ?? null;
  }

  // Level focus (tuning.upgrades.focus): reaching focus.level asks for attack, health or range.
  focusMult(focus, stat) {
    const bonus = this.tuning.upgrades.focus?.[stat];
    return focus === stat && bonus ? 1 + bonus : 1;
  }

  atkFor(hero, level, awakened = false, focus = hero.focus, trained = hero.trained) {
    const tuning = this.tuning.upgrades;
    const awake = awakened ? 1 + (this.tuning.awakening?.attackBonus || 0) + (this.classBonus(hero).awakenBonus || 0) : 1;
    return Math.round(hero.baseAtk * (1 + tuning.attackPerLevel * (level - 1)) * awake * this.focusMult(focus, "attack") * this.trainMult(trained, "attack"));
  }

  rangeFor(base) {
    const cb = this.classBonus(base);
    return Math.round(base.range * (1 + (cb.range || 0)) + (cb.rangeFlat || 0));
  }

  // Kill gold with difficulty and Favor bonus; fractions carry over so small rewards still gain.
  killReward(reward) {
    this.goldCarry += reward * this.difficulty.killGold * (1 + (this.favor.killGoldBonus || 0));
    const paid = Math.floor(this.goldCarry + 1e-9);
    this.goldCarry -= paid;
    return paid;
  }

  executeThreshold(hero) {
    return 0.35 + (this.classBonus(hero).execute || 0);
  }

  ultChargeRate(hero = null) {
    return (1 + this.modifiers().regen + (this.favor.ultChargeBonus || 0) + (this.classBonus(hero).ultCharge || 0)) * (1 + (this.ringFx(hero)?.ultCharge || 0));
  }

  // Special rings (M16): a map's `rings` names the kind per "road:0" / "platform:2"; the
  // numbers live in tuning.rings (range, ultCharge, atk, aps shares).
  ringKind(slotType, slotIndex) {
    return this.map.rings?.[`${slotType}:${slotIndex}`] ?? null;
  }

  ringAt(slotType, slotIndex) {
    const kind = this.ringKind(slotType, slotIndex);
    return kind ? this.tuning.rings?.[kind] ?? null : null;
  }

  ringFx(hero) {
    return hero?.slotType ? this.ringAt(hero.slotType, hero.slotIndex) : null;
  }

  synergyPerTag() {
    return (this.tuning.synergy?.bonusPerTag || 0) + (this.favor.synergyTagBonus || 0);
  }

  // Between-wave offer: each card may roll Epic or Rare (tuning.runBoons.chance, own RNG)
  // and then shows a mechanic blessing the deployed team can use ("boon:<id>"); otherwise
  // a common stat blessing (virtue).
  offerVirtues() {
    const available = Object.keys(this.virtueEffects).filter((name) => !this.virtues.includes(name));
    const cfg = this.tuning.runBoons;
    const boons = cfg ? Object.keys(cfg.list).filter((id) => !this.boons.includes(id) && this.boonEligible(id)) : [];
    const picks = [];
    const count = 3 + (this.favor.extraOffer || 0);
    for (let i = 0; i < count; i += 1) {
      const roll = cfg ? this.boonRng() : 1;
      const rarity = roll < cfg?.chance.epic ? "epic" : roll < (cfg?.chance.epic ?? 0) + (cfg?.chance.rare ?? 0) ? "rare" : null;
      const pool = rarity ? boons.filter((id) => cfg.list[id].rarity === rarity) : [];
      if (pool.length) {
        const id = pool[Math.floor(this.boonRng() * pool.length)];
        boons.splice(boons.indexOf(id), 1);
        picks.push(`boon:${id}`);
      } else if (available.length) {
        picks.push(available.splice(Math.floor(this.rng() * available.length), 1)[0]);
      }
    }
    this.virtueOffer = picks.length ? picks : null;
  }

  chooseVirtue(name) {
    if (!this.virtueOffer || !this.virtueOffer.includes(name) || this.virtues.includes(name)) return false;
    this.virtueOffer = null;
    if (name.startsWith("boon:")) this.boons = [...this.boons, name.slice(5)];
    else this.addVirtue(name);
    this.onChange("virtue", this);
    return true;
  }

  hasBoon(id) {
    return this.boons?.includes(id) ? this.tuning.runBoons.list[id] : null;
  }

  // Whether the deployed team can use a mechanic blessing (M17).
  boonEligible(id) {
    const need = this.tuning.runBoons.list[id]?.requires;
    const applies = (status) => this.heroes.some((h) => this.statusCfg()?.sources?.[h.id] === status || this.classBonus(h).infuse === status
      || (status === "burn" && h.path === "wildfire") || (status === "chill" && (h.path === "frost" || h.path === "crippling")));
    switch (need) {
      case null: case undefined: return true;
      case "chain": return this.heroes.some((h) => (h.basic === "chain" && this.kit(h).chain) || h.path === "arc");
      case "road": return this.heroes.some((h) => h.slotType === "road");
      case "freeze": return applies("wet") && applies("chill");
      default: return applies(need);
    }
  }

  addVirtue(name) {
    const before = this.modifiers().hp;
    this.virtues.push(name);
    const pairs = this.tuning.virtuePairs || [];
    for (const pair of pairs) {
      if (!this.activePairs.find((p) => p.name === pair.name) && pair.virtues.every((v) => this.virtues.includes(v))) {
        this.activePairs.push(pair);
      }
    }
    const hpGain = this.modifiers().hp - before;
    if (hpGain > 0) {
      // Apply the health bonus to already-deployed heroes, granted as current health.
      for (const hero of this.heroes) {
        const next = this.maxHpFor(hero.baseHp, hero.level, hero.class, hero.awakened, hero.focus, hero.trained);
        hero.hpLeft += next - hero.hp;
        hero.hp = next;
      }
    }
  }

  upgradeInfo(entityId) {
    const hero = this.heroes.find((item) => item.entityId === entityId);
    if (!hero) return { ok: false, reason: "No hero selected." };
    const tuning = this.tuning.upgrades;
    if (this.complete) return { ok: false, reason: "Run is over.", hero };
    if (hero.level >= tuning.maxLevel) {
      // Awakening: one step past the level cap. Lost when the hero falls, like levels.
      const awakening = this.tuning.awakening;
      if (hero.awakened && this.tuning.training) return this.trainingInfo(hero);
      if (!awakening || hero.awakened) return { ok: false, reason: `${hero.name} is fully upgraded.`, hero };
      const cost = Math.round(awakening.cost * (1 - (this.classBonus(hero).awakenDiscount || 0)));
      const nextAtk = this.atkFor(hero, hero.level, true);
      const nextHp = this.maxHpFor(hero.baseHp, hero.level, hero.class, true, hero.focus);
      if (this.gold < cost) return { ok: false, awaken: true, reason: `Needs ${cost} gold, you have ${this.gold}.`, hero, cost, nextAtk, nextHp };
      return { ok: true, awaken: true, hero, cost, nextAtk, nextHp };
    }
    const cost = Math.round(tuning.costs[hero.level] * (1 - (this.favor.upgradeDiscount || 0)));
    const nextAtk = this.atkFor(hero, hero.level + 1);
    const nextHp = this.maxHpFor(hero.baseHp, hero.level + 1, hero.class, false, hero.focus, hero.trained);
    // The step to focus.level needs a choice; each option previews its own numbers.
    const needsFocus = !hero.focus && hero.level + 1 === tuning.focus?.level;
    const focusOptions = needsFocus ? {
      attack: { nextAtk: this.atkFor(hero, hero.level + 1, false, "attack"), nextHp, nextRange: hero.range },
      health: { nextAtk, nextHp: this.maxHpFor(hero.baseHp, hero.level + 1, hero.class, false, "health"), nextRange: hero.range },
      range: { nextAtk, nextHp, nextRange: Math.round(hero.range * this.focusMult("range", "range")) },
    } : null;
    // The step to path.level asks for one of the class paths (tuning.paths, M12).
    const needsPath = !hero.path && hero.level + 1 === tuning.path?.level && !!this.tuning.paths?.[hero.class];
    const pathOptions = needsPath ? Object.keys(this.tuning.paths[hero.class]) : null;
    if (this.gold < cost) return { ok: false, reason: `Needs ${cost} gold — you have ${this.gold}.`, hero, cost, nextAtk, nextHp, needsFocus, focusOptions, needsPath, pathOptions };
    return { ok: true, hero, cost, nextAtk, nextHp, needsFocus, focusOptions, needsPath, pathOptions };
  }

  // Training offer, shaped like the level focus choice (needsFocus + focusOptions), so
  // upgrade(entityId, stat) and the popover picker handle both. Range drops out at its cap.
  trainingInfo(hero) {
    const cfg = this.tuning.training;
    const cost = this.trainingCost(hero);
    const trained = hero.trained || {};
    const plus = (stat) => ({ ...trained, [stat]: (trained[stat] || 0) + 1 });
    const hp = (t) => this.maxHpFor(hero.baseHp, hero.level, hero.class, true, hero.focus, t);
    const focusOptions = {
      attack: { nextAtk: this.atkFor(hero, hero.level, true, hero.focus, plus("attack")), nextHp: hero.hp, nextRange: hero.range },
      health: { nextAtk: hero.atk, nextHp: hp(plus("health")), nextRange: hero.range },
    };
    if ((trained.range || 0) < cfg.rangeCap) {
      focusOptions.range = { nextAtk: hero.atk, nextHp: hero.hp, nextRange: hero.range + Math.round(this.rangeFor(this.heroesById.get(hero.id)) * cfg.range) };
    }
    const info = { train: true, needsFocus: true, focusOptions, hero, cost, nextAtk: hero.atk, nextHp: hero.hp };
    if (this.gold < cost) return { ...info, ok: false, reason: `Needs ${cost} gold, you have ${this.gold}.` };
    return { ...info, ok: true };
  }

  upgrade(entityId, focus = null) {
    let info = this.upgradeInfo(entityId);
    if (!info.ok) return info;
    if (info.needsFocus) {
      const option = info.focusOptions[focus];
      if (!option) return { ...info, ok: false, reason: info.train ? "Choose what to train: attack, health or range." : `Choose a focus for level ${info.hero.level + 1}: attack, health or range.` };
      info = { ...info, ...option };
      if (info.train) info.hero.trained = { ...(info.hero.trained || {}), [focus]: (info.hero.trained?.[focus] || 0) + 1 };
      else info.hero.focus = focus;
      info.hero.range = option.nextRange;
    } else if (info.needsPath) {
      if (!info.pathOptions.includes(focus)) return { ...info, ok: false, reason: `Choose a path for level ${info.hero.level + 1}.` };
      info.hero.path = focus;
    }
    this.gold -= info.cost;
    this.totalGoldSpent += info.cost;
    this.upgradesBought += 1;
    info.hero.invested = (info.hero.invested || 0) + info.cost;
    if (info.awaken) {
      info.hero.awakened = true;
      this.emitHeroEffect(info.hero, { type: "awaken", x: info.hero.x, y: info.hero.y, life: 0.9, color: "gold" });
    } else if (info.train) {
      this.emitHeroEffect(info.hero, { type: "buff", x: info.hero.x, y: info.hero.y, life: 0.5, color: "gold" });
    } else info.hero.level += 1;
    const hpGain = info.nextHp - info.hero.hp;
    info.hero.atk = info.nextAtk;
    info.hero.hp = info.nextHp;
    info.hero.hpLeft += hpGain; // the new maximum health is granted, but no free full heal
    this.onChange("upgrade", this);
    return info;
  }

  defaultRotationFor(x, y) {
    let bestDist = Infinity;
    let bestAngle = 0;
    for (const { path } of this.lanes) for (let i = 0; i < path.length - 1; i++) {
      const [ax, ay] = path[i];
      const [bx, by] = path[i + 1];
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
      const dist = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
      if (dist < bestDist) {
        bestDist = dist;
        bestAngle = Math.atan2(dy, dx) + Math.PI; // face toward incoming enemies
      }
    }
    return bestAngle;
  }

  // Selling refunds tuning.run.sellRefund of what was paid for this unit (deploy, upgrades,
  // awakening); allowed anytime. A revived unit was free, so it sells for nothing.
  sellValue(entityId) {
    const hero = this.heroes.find((item) => item.entityId === entityId);
    return hero ? Math.floor((hero.invested || 0) * (this.tuning.run.sellRefund ?? 0.5)) : 0;
  }

  sell(entityId) {
    const hero = this.heroes.find((item) => item.entityId === entityId);
    if (!hero || this.complete) return { ok: false };
    const refund = this.sellValue(entityId);
    this.heroes = this.heroes.filter((item) => item !== hero);
    this.team = this.team.filter((id) => id !== hero.id);
    this.gold += refund;
    this.totalGoldSpent -= refund;
    // A named hero that leaves before its kill quest is done fails it, like a fall.
    if (this.quest?.type === "heroKills" && this.quest.heroEntityId === hero.entityId && this.quest.kills < this.quest.target) this.failQuest();
    this.emit({ type: "sell", heroId: hero.id, x: hero.x, y: hero.y, life: 0.6, color: "gold" });
    this.onChange("sell", this);
    return { ok: true, hero, refund };
  }

  // Target priority chosen in the hero popover (TARGET_MODES); "auto" keeps the class rule.
  setTargeting(entityId, mode) {
    const hero = this.heroes.find((item) => item.entityId === entityId);
    if (!hero || !TARGET_MODES.includes(mode) || (mode === "flying" && hero.slotType === "road")) return false;
    hero.targeting = mode;
    this.onChange("targeting", this);
    return true;
  }

  rotate(entityId) {
    const hero = this.heroes.find((item) => item.entityId === entityId);
    if (!hero) return;
    hero.rotation = (hero.rotation + Math.PI / 2) % (Math.PI * 2);
    this.onChange("rotate", this);
  }

  wavePreview(waveIndex = this.wave) {
    const wave = this.waves[waveIndex];
    if (!wave) return null;
    const counts = {};
    for (const group of wave.spawns) counts[group.kind] = (counts[group.kind] || 0) + group.count;
    if (!this.favor.showEnemyHp) return { wave: waveIndex + 1, counts };
    return { wave: waveIndex + 1, counts, totalHp: this.waveTotalHp(waveIndex) };
  }

  // Endless past the 20-wave length: enemy HP and attack compound by waveGen.endlessRamp
  // per wave, so every endless run ends and going deeper needs Divine Blessings.
  endlessRamp(waveNumber = this.wave) {
    const over = this.mode === "endless" ? waveNumber - MODE_WAVES.long : 0;
    return over > 0 ? (1 + (this.tuning.waveGen?.endlessRamp || 0)) ** over : 1;
  }

  // Total enemy HP of a wave, with the same scaling as spawnEnemy.
  waveTotalHp(waveIndex = this.wave) {
    const wave = this.waves[waveIndex];
    if (!wave) return 0;
    const scale = (1 + waveIndex * this.difficulty.waveHpScale) * this.difficulty.enemyHp * this.tierHp * this.endlessRamp(waveIndex + 1);
    return Math.round(wave.spawns.reduce((sum, group) => sum + group.count * (group.scale ?? 1) * (this.tuning.enemies[group.kind]?.hp || 0), 0) * scale);
  }

  startWave() {
    // Endless: generate this wave and the next, so previews and quests always see it.
    if (this.mode === "endless") {
      while (this.waves.length <= this.wave + 1) this.waves.push(buildWave(this.baseWaves, this.waves.length + 1, this.mode, this.tuning.waveGen));
    }
    if (this.running || this.complete || this.wave >= this.waves.length) return false;
    const wave = this.waves[this.wave];
    this.wave += 1;
    this.waveStats = { wave: this.wave, kills: 0, leaks: 0, goldEarned: 0, heroDeaths: 0, lastSpawnAt: null, leakKinds: {} };
    this.virtueOffer = null; // unclaimed offers expire when the next wave starts
    this.mutatorOffer = null;
    this.waveHeroes = new Map(this.heroes.map((hero) => [hero.entityId, hero.class])); // Insight credit per wave
    this.quest = this.rollQuest();
    this.spawnQueue = [];
    let at = 0;
    // Several entrances take turns, so each gate sends an even share of every group.
    // Enemies on one lane keep at least waveGen.minSpacing px apart (a time gap alone
    // stacks slow walkers into one blob) and spread sideways in a fixed pattern.
    let lane = 0;
    const laneFree = this.lanes.map(() => 0);
    const spacing = this.tuning.waveGen?.minSpacing ?? 0;
    for (const group of wave.spawns) {
      const speed = (this.tuning.enemies[group.kind]?.speed || 1) * this.difficulty.enemySpeed;
      const count = group.kind === "boss" ? group.count : Math.round(group.count * (1 + this.mutatorMods().count));
      for (let i = 0; i < count; i += 1) {
        const gate = lane++ % this.lanes.length;
        at = Math.max(at, laneFree[gate]);
        this.spawnQueue.push({ at, kind: group.kind, scale: group.scale ?? 1, lane: gate, sway: SWAY[this.spawnQueue.length % SWAY.length] });
        laneFree[gate] = at + spacing / speed;
        at += group.gapMs / 1000;
      }
      at += 0.8;
    }
    this.spawnClock = 0;
    this.running = true;
    this.paused = false;
    this.onChange("wave", this);
    return true;
  }

  advance(deltaSeconds) {
    if (this.paused || this.complete) return;
    this.accumulator += Math.min(deltaSeconds, 5);
    while (this.accumulator >= STEP) {
      this.step(STEP);
      this.accumulator -= STEP;
    }
  }

  step(dt) {
    if (!this.running) return;
    this.time += dt;
    this.spawnClock += dt;
    while (this.spawnQueue.length && this.spawnQueue[0].at <= this.spawnClock) {
      const next = this.spawnQueue.shift();
      this.spawnEnemy(next.kind, { statScale: next.scale ?? 1, lane: next.lane ?? 0, sway: next.sway ?? 0 });
      if (!this.spawnQueue.length && this.waveStats) this.waveStats.lastSpawnAt = this.time;
    }
    this.checkQuestClock();

    this.engaged = new Map(); // road hero -> melee enemies it holds this step (block limit)
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.held = false;
      enemy.slow = Math.max(0, enemy.slow - dt);
      enemy.chill = Math.max(0, (enemy.chill ?? 0) - dt);
      if ((enemy.burnUntil ?? 0) > this.time) this.hit(enemy, enemy.burnDps * dt, enemy.burnBy, { showShot: false, showHit: false, dot: true });
      if (!enemy.dead && (enemy.poisonUntil ?? 0) > this.time) this.hit(enemy, enemy.poisonDps * dt, enemy.poisonBy, { showShot: false, showHit: false, dot: true });
      if (enemy.dead) continue;
      enemy.squeeze = Math.max(0, (enemy.squeeze ?? 0) - dt);
      // Petrification and stuns stop movement and attacks; simulation time still advances.
      if ((enemy.petrifiedUntil ?? 0) > this.time || (enemy.stunnedUntil ?? 0) > this.time) continue;
      this.enemyTraits(enemy, dt);
      const target = enemy.flying ? null : this.findEnemyTarget(enemy);
      if (target) {
        const ranged = this.shootsFromRange(enemy);
        enemy.held = !ranged; // stopped by a blocker (melee contact)
        // Ranged enemies hold position for holdSeconds, then close in (no endless standoff
        // against a healed blocker nobody else can reach).
        if (ranged) enemy.rangedTime = (enemy.rangedTime ?? 0) + dt;
        enemy.attackClock -= dt;
        if (enemy.attackClock <= 0) {
          const mods = this.modifiers();
          // A veiled Assassin keeps holding its enemy, but nothing can hurt it.
          if (!this.isVeiled(target) && this.rng() >= mods.dodge) {
            const taken = resolveDamage(enemy.attack, target.armor * (1 + mods.res), "physical") * (1 - this.guardFor(target));
            this.damageHero(target, taken, enemy);
            const thorns = this.pathFx(target, "thorns");
            if (thorns && !enemy.dead) this.hit(enemy, taken * thorns.reflect, target, { showShot: false, showHit: false });
            this.emit({ type: "shot", x1: enemy.x, y1: enemy.y, x2: target.x, y2: target.y, life: 0.12, color: "red" });
          }
          enemy.attackClock = (enemy.attackPeriod || 0.9) / this.childFrenzy(enemy);
        }
      } else {
        // Walking past a full blocker costs time: a milder slow (passSlowFactor) for passSlow
        // seconds, separate from skill slows; the stronger of the two applies.
        const blocking = this.tuning.blocking ?? {};
        if (enemy.brushed) enemy.squeeze = Math.max(enemy.squeeze, blocking.passSlow || 0);
        const tidal = this.hasBoon("tidal_pull") && this.isWet(enemy) ? this.hasBoon("tidal_pull").slow : 1;
        const pace = Math.min(enemy.slow > 0 ? (enemy.slowFactor ?? 0.55) : 1, enemy.squeeze > 0 ? blocking.passSlowFactor ?? 1 : 1, enemy.chill > 0 ? enemy.chillFactor : 1) * tidal;
        enemy.distance += enemy.speed * pace * dt;
        const lane = this.laneOf(enemy);
        const point = pointOnPath(lane.path, enemy.distance, enemy.sway);
        enemy.x = point.x; enemy.y = point.y;
        if (enemy.distance >= lane.total) {
          enemy.dead = true;
          const previousLives = this.lives;
          if (!this.difficulty.invincible) this.lives = Math.max(0, this.lives - enemy.damage);
          if (this.map.base) {
            enemy.exitReason = "base";
            // Emit before finish: the final breach must still reach the renderer/audio.
            this.emit({ type: "baseHit", enemyId: enemy.entityId, damage: previousLives - this.lives,
              x: this.map.base.x, y: this.map.base.y, life: 0.65, color: "red" });
          }
          if (this.waveStats) {
            this.waveStats.leaks += 1;
            this.waveStats.leakKinds[enemy.kind] = (this.waveStats.leakKinds[enemy.kind] || 0) + (previousLives - this.lives || enemy.damage || 1);
          }
          this.leakKinds[enemy.kind] = (this.leakKinds[enemy.kind] || 0) + (enemy.damage || 1);
          this.totalLeaks += 1;
          if (this.quest?.type === "noLeaks") this.failQuest();
          this.onChange("leak", this);
          if (this.lives === 0) this.finish(false);
        }
      }
    }

    if (this.complete) return; // the last life was lost this step: heroes stand down

    for (const hero of this.heroes) {
      if (this.isHexed(hero) || this.isSilenced(hero)) continue; // Hexer or Baphomet: no attacks, ultimate charge paused
      hero.attackClock -= dt;
      hero.ultClock += dt;
      const target = this.findTarget(hero);
      if (hero.attackClock <= 0 && this.basicAttack(hero, target)) {
        hero.attackClock = 1 / (hero.aps * (1 + (this.classBonus(hero).aps || 0) + this.hymnFor(hero) + (this.ringFx(hero)?.aps || 0)));
      }
      // A basic attack that just killed its target must not spend the ultimate on the corpse.
      const ultTarget = this.findUltTarget(hero, target?.dead ? this.findTarget(hero) : target);
      if (ultTarget && hero.ultClock >= hero.ultCooldown / this.ultChargeRate(hero)) {
        if (this.castUltimate(hero, ultTarget) !== false) {
          hero.ultClock = hero.ultRefund || 0; // some ultimates hand back part of their charge
          hero.ultRefund = 0;
        }
      }
    }

    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    if (!this.complete) this.resummonIfNeeded();
    this.effects = this.effects.filter((effect) => (effect.life -= dt) > 0);
    if (this.running && !this.spawnQueue.length && !this.enemies.length) {
      this.running = false;
      // Insight: every unit that stood on the field during the wave counts, fallen ones included.
      this.waveHeroes ||= new Map();
      for (const hero of this.heroes) this.waveHeroes.set(hero.entityId, hero.class);
      for (const cls of this.waveHeroes.values()) (this.insightLog[cls] ||= { waves: 0, kills: 0 }).waves += 1;
      if (this.wave >= this.waves.length) this.finish(true);
      else {
        // Wave-clear bonus: flat, predictable income so early waves fund the
        // next recruit while kill rewards stay scarce (economy milestone 5A).
        const bonus = this.tuning.run.waveClearBonus;
        if (bonus) {
          const amount = Math.round((bonus.base + bonus.perWave * (this.wave - 1)) * (1 + (this.favor.clearBonus || 0)));
          this.gold += amount;
          if (this.waveStats) this.waveStats.goldEarned += amount;
          this.totalGoldEarned += amount;
        }
        this.completeQuest();
        this.mutatorWaves += this.mutatorMods().favor;
        this.offerVirtues(); this.offerMutators(); this.onChange("clear", this);
      }
    }
  }

  laneOf(enemy) {
    return this.lanes[enemy.lane] ?? this.lanes[0];
  }

  spawnEnemy(kind, { distance = 0, statScale = 1, lane = 0, sway = 0, extra = null } = {}) {
    let base = this.tuning.enemies[kind];
    if (kind === "boss" && this.bossTuning?.stats) base = { ...base, ...this.bossTuning.stats };
    const ramp = this.endlessRamp();
    const scale = (1 + (this.wave - 1) * this.difficulty.waveHpScale) * this.difficulty.enemyHp * this.tierHp * statScale * ramp;
    const point = pointOnPath((this.lanes[lane] ?? this.lanes[0]).path, distance, sway);
    const favorSpeed = this.wave === 1 && this.favor.wave1SpeedDebuff ? 1 - this.favor.wave1SpeedDebuff : 1;
    const speed = base.speed * favorSpeed * this.difficulty.enemySpeed;
    const enemy = { ...base, speed, statScale, entityId: this.entityId++, kind, maxHp: base.hp * scale, hp: base.hp * scale, attack: (base.attack || 0) * statScale * ramp * this.tierAttack, magicRes: base.magicRes ?? base.armor * 0.8, distance, lane, sway, x: point.x, y: point.y, dead: false, slow: 0, attackClock: 0, ...extra };
    if (base.shield) enemy.shield = enemy.shieldMax = enemy.maxHp * base.shield.hp;
    this.applyMutators(enemy);
    this.enemies.push(enemy);
    if (kind === "boss") {
      enemy.bossId = this.bossId;
      this.emit({ type: "boss", x: point.x, y: point.y, life: 0.9, color: "red" });
      if (this.bossTuning?.summon) this.summonChildren(enemy, statScale);
    }
    return enemy;
  }

  // Endless mutators (M15, tuning.mutators): after every `every`-th endless wave the player
  // may pick one of `offer` mutators (or skip). Each makes enemies harder; every wave
  // cleared afterwards pays its `favor` share on top of the normal per-wave Favor
  // (tracked in mutatorWaves). They stack and last for the rest of the run.
  offerMutators() {
    const cfg = this.tuning.mutators;
    if (!cfg || this.mode !== "endless" || this.wave % cfg.every !== 0) return;
    const available = Object.keys(cfg.pool).filter((id) => !this.mutators.includes(id));
    const picks = [];
    while (picks.length < cfg.offer && available.length) picks.push(available.splice(Math.floor(this.mutatorRng() * available.length), 1)[0]);
    this.mutatorOffer = picks.length ? picks : null;
  }

  chooseMutator(id) {
    if (!this.mutatorOffer?.includes(id)) return false;
    this.mutatorOffer = null;
    this.mutators = [...this.mutators, id];
    this.onChange("mutator", this);
    return true;
  }

  skipMutators() {
    if (!this.mutatorOffer) return false;
    this.mutatorOffer = null;
    this.onChange("mutator", this);
    return true;
  }

  // Summed effects of the chosen mutators.
  mutatorMods() {
    const pool = this.tuning.mutators?.pool ?? {};
    const out = { hp: 0, speed: 0, attack: 0, count: 0, armor: 0, shield: 0, elite: 0, favor: 0 };
    for (const id of this.mutators ?? []) for (const key of Object.keys(out)) out[key] += pool[id]?.[key] || 0;
    return out;
  }

  applyMutators(enemy) {
    this.spawnCount += 1;
    if (!this.mutators?.length) return;
    const mods = this.mutatorMods();
    enemy.maxHp *= 1 + mods.hp;
    enemy.hp *= 1 + mods.hp;
    if (enemy.shieldMax) { enemy.shieldMax *= 1 + mods.hp; enemy.shield = enemy.shieldMax; }
    enemy.speed *= 1 + mods.speed;
    enemy.attack *= 1 + mods.attack;
    enemy.armor += mods.armor;
    enemy.magicRes += mods.armor;
    if (mods.shield) {
      enemy.shieldMax = (enemy.shieldMax || 0) + enemy.maxHp * mods.shield;
      enemy.shield = enemy.shieldMax;
      enemy.shieldChip ??= this.tuning.mutators.elite.minChip;
    }
    // Elites: every Nth ordinary enemy (not bosses, summons or Lilith's children).
    const elite = this.tuning.mutators.elite;
    if (mods.elite && enemy.kind !== "boss" && !enemy.parentId && !enemy.summonerId && this.spawnCount % mods.elite === 0) {
      enemy.elite = true;
      enemy.maxHp *= elite.hp;
      enemy.hp = enemy.maxHp;
      enemy.reward *= elite.reward;
      const shield = enemy.maxHp * elite.shield;
      enemy.shieldMax = (enemy.shieldMax || 0) + shield;
      enemy.shield = enemy.shieldMax;
      enemy.shieldChip = elite.minChip;
    }
  }

  // Lilith (Garden of Flesh / Flesh Growth, bosses.json): summons children around
  // herself on entry and again whenever all of them have fallen (at resummonScale).
  // She cannot be hit while summoning; damage her children take is dealt to her too.
  summonChildren(boss, statScale) {
    const cfg = this.bossTuning.summon;
    boss.untargetable = true;
    const spacing = cfg.spacing ?? 40;
    // Alternate ahead of and behind her (+1, -1, +2, ...). A behind slot past the path
    // start would clamp onto her and, at equal speed, walk inside her sprite, so it goes ahead.
    const behindRoom = Math.floor(boss.distance / spacing);
    let ahead = 0;
    let behind = 0;
    for (let i = 0; i < cfg.count; i += 1) {
      const goBehind = i % 2 === 1 && behind < behindRoom;
      const offset = goBehind ? -(++behind) * spacing : ++ahead * spacing;
      const distance = Math.min(this.laneOf(boss).total - 1, boss.distance + offset);
      this.spawnEnemy(cfg.kind, { distance, statScale, lane: boss.lane ?? 0, extra: { parentId: boss.entityId } });
    }
    this.emit({ type: "summon", x: boss.x, y: boss.y, life: 0.7, color: "purple" });
  }

  resummonIfNeeded() {
    const cfg = this.bossTuning?.summon;
    if (!cfg) return;
    for (const boss of this.enemies) {
      if (boss.dead || !boss.untargetable) continue;
      if (this.enemies.some((e) => e.parentId === boss.entityId && !e.dead)) continue;
      this.summonChildren(boss, (cfg.resummonScale ?? 1) * (boss.statScale ?? 1));
    }
  }

  emit(effect) {
    this.effects.push(effect);
    this.onEffect?.(effect);
  }

  // Render-only context: lets effects originate at the caster and identify heals.
  emitHeroEffect(hero, effect) {
    this.emit({ heroId: hero.id, heroVariant: hero.variant ?? null,
      sourceId: hero.entityId, sourceX: hero.x, sourceY: hero.y,
      facing: hero.rotation || 0, range: hero.range, ...effect });
  }

  // Ranged enemies (attackRange) shoot from distance until their holdSeconds run out.
  shootsFromRange(enemy) {
    return enemy.attackRange !== undefined && (enemy.rangedTime ?? 0) < (enemy.holdSeconds ?? Infinity);
  }

  findEnemyTarget(enemy) {
    // Ranged enemies stop and shoot from distance; melee (and ranged past their hold) needs contact.
    const melee = !this.shootsFromRange(enemy);
    const reach = melee ? 42 + (this.favor.contactRangeBonus || 0) : enemy.attackRange;
    const limits = this.tuning.blocking?.blockLimit;
    let best = null;
    enemy.brushed = false;
    for (const hero of this.heroes) {
      if (hero.slotType !== "road" || hero.hpLeft <= 0) continue;
      const distance = Math.hypot(hero.x - enemy.x, hero.y - enemy.y);
      // Block limit: a blocker that already holds its share lets further melee enemies walk
      // past, but they brush against it (step() slows them, tuning.blocking.passSlow).
      const limit = melee && limits?.[hero.class] !== undefined ? limits[hero.class] + (this.classBonus(hero).blockLimit || 0) + (this.pathFx(hero, "bulwark")?.blockLimit || 0) : undefined;
      if (limit !== undefined && (this.engaged?.get(hero) || 0) >= limit) {
        if (distance <= reach) enemy.brushed = true;
        continue;
      }
      if (distance <= reach && (!best || distance < best.distance)) best = { hero, distance };
    }
    if (best && melee && this.engaged) this.engaged.set(best.hero, (this.engaged.get(best.hero) || 0) + 1);
    enemy.heldBy = best && melee ? best.hero : null;
    return best?.hero ?? null;
  }

  // Heal share of an ultimate; Support class blessings raise it.
  healFraction(hero) {
    return this.support.healFraction * (1 + this.modifiers().heal) * (1 + (this.classBonus(hero).support || 0));
  }

  supportAuraFor(hero) {
    // Passive local aura: allies inside a support's range gain attack. Does not stack.
    for (const support of this.heroes) {
      if (support.ability !== "aura" || support === hero) continue;
      if (Math.hypot(support.x - hero.x, support.y - hero.y) <= support.range) return { source: support, bonus: this.support.passiveAuraBonus * (1 + (this.classBonus(support).support || 0)) };
    }
    return null;
  }

  synergyBonusFor(hero) {
    const cfg = this.tuning.synergy;
    if (!cfg || !hero.synergies?.length) return 0;
    let total = 0;
    for (const other of this.heroes) {
      if (other === hero || other.hpLeft <= 0) continue;
      const dist = Math.hypot(other.x - hero.x, other.y - hero.y);
      if (dist > cfg.range) continue;
      for (const tag of hero.synergies) {
        if (other.synergies?.includes(tag)) total += this.synergyPerTag();
      }
    }
    return Math.min(total, cfg.cap);
  }

  synergyLinksFor(hero) {
    const cfg = this.tuning.synergy;
    if (!cfg || !hero.synergies?.length) return [];
    const links = [];
    for (const other of this.heroes) {
      if (other === hero || other.hpLeft <= 0) continue;
      const dist = Math.hypot(other.x - hero.x, other.y - hero.y);
      if (dist > cfg.range) continue;
      const shared = hero.synergies.filter((t) => other.synergies?.includes(t));
      if (shared.length) links.push({ hero: other, shared });
    }
    return links;
  }

  activeSynergyCount() {
    const cfg = this.tuning.synergy;
    if (!cfg) return 0;
    let count = 0;
    for (let i = 0; i < this.heroes.length; i++) {
      for (let j = i + 1; j < this.heroes.length; j++) {
        const a = this.heroes[i]; const b = this.heroes[j];
        if (a.hpLeft <= 0 || b.hpLeft <= 0) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) > cfg.range) continue;
        if ((a.synergies || []).some((t) => (b.synergies || []).includes(t))) count++;
      }
    }
    return count;
  }

  attackValue(hero) {
    const aura = this.supportAuraFor(hero);
    const ultBuff = this.time < (hero.buffUntil || 0) ? 1 + this.support.auraAttackBonus : 1;
    const synBonus = this.synergyBonusFor(hero);
    const rally = this.time < (this.rallyUntil || 0) ? 1 + (this.hasBoon("rally")?.atk || 0) : 1;
    return hero.atk * (1 + this.modifiers().atk) * (1 + (this.classBonus(hero).atk || 0)) * (aura ? 1 + aura.bonus : 1) * ultBuff * (1 + synBonus) * (1 + (this.ringFx(hero)?.atk || 0)) * rally;
  }

  damageHero(hero, amount, source) {
    if (amount <= 0 || this.isVeiled(hero)) return;
    hero.hpLeft -= amount;
    hero._hitFlash = true;
    if (hero.hpLeft <= 0) {
      const rally = this.boons?.length && hero.slotType === "road" ? this.hasBoon("rally") : null;
      if (rally) this.rallyUntil = this.time + rally.seconds;
      this.fallenHeroes.push({ id: hero.id, slotType: hero.slotType, slotIndex: hero.slotIndex, targeting: hero.targeting });
      this.heroes = this.heroes.filter((entry) => entry !== hero);
      this.team = this.team.filter((id) => id !== hero.id);
      if (this.waveStats) this.waveStats.heroDeaths += 1;
      if (this.quest?.type === "heroSurvival") this.failQuest();
      if (this.quest?.type === "heroKills" && this.quest.heroEntityId === hero.entityId && this.quest.kills < this.quest.target) this.failQuest();
      this.onChange("death", this);
    }
  }

  // Ultimate target: normally the attack target. Nyx's Shadow Step phases to the
  // lowest-HP reachable enemy anywhere on the map (road heroes still cannot hit flyers).
  findUltTarget(hero, attackTarget = this.findTarget(hero)) {
    if (hero.variant !== "shadow_step") return attackTarget;
    const alive = this.enemies.filter((e) => this.canHit(hero, e));
    alive.sort((a, b) => a.hp - b.hp);
    return alive[0] ?? null;
  }

  // Removes and returns the newest fallen entry that can be revived, or null.
  takeRevivableFallen() {
    for (let i = this.fallenHeroes.length - 1; i >= 0; i -= 1) {
      const entry = this.fallenHeroes[i];
      const onField = this.heroes.some((h) => h.id === entry.id);
      const ringTaken = this.heroes.some((h) => h.slotType === entry.slotType && h.slotIndex === entry.slotIndex);
      if (onField || ringTaken) continue;
      this.fallenHeroes.splice(i, 1);
      return entry;
    }
    return null;
  }

  // Road heroes cannot reach flyers; untargetable enemies (a summoning Lilith) are skipped.
  canHit(hero, enemy) {
    return !enemy.dead && !enemy.untargetable && !(enemy.flying && hero.slotType === "road");
  }

  findTarget(hero) {
    if ((hero.targeting ?? "auto") !== "auto") {
      // A chosen priority ranks everything the hero can reach: its range, plus loose
      // enemies inside the Assassin dash reach.
      const reach = this.dashReach(hero);
      const targets = this.enemies.filter((enemy) => {
        if (!this.canHit(hero, enemy)) return false;
        const d = Math.hypot(hero.x - enemy.x, hero.y - enemy.y);
        return d <= hero.range || (d <= reach && !enemy.held && !this.isStopped(enemy));
      });
      targets.sort(this.targetOrder(hero));
      return targets[0] ?? null;
    }
    const loose = this.dashTarget(hero);
    if (loose) return loose;
    if (hero.variant === "shadow_step") {
      const alive = this.enemies.filter((e) => this.canHit(hero, e) && Math.hypot(hero.x - e.x, hero.y - e.y) <= hero.range);
      alive.sort((a, b) => a.hp - b.hp);
      return alive[0] ?? null;
    }
    // Melee heroes on the road cannot reach flyers; platform coverage is required.
    const targets = this.enemies.filter((enemy) => this.canHit(hero, enemy) && Math.hypot(hero.x - enemy.x, hero.y - enemy.y) <= hero.range);
    targets.sort(this.targetOrder(hero));
    return targets[0] ?? null;
  }

  // Basic attack target order. Class rule ("auto"): Assassins finish the weakest, Archers
  // snipe the toughest (kit target "strongest"), everyone else the enemy furthest along.
  // A chosen priority replaces it; ground, flying and boss prefer that group and use the
  // class rule inside it. Ties go to the enemy furthest along.
  targetOrder(hero) {
    const classOrder = this.classTargetOrder(hero);
    const prefer = (match) => (a, b) => (match(b) - match(a)) || classOrder(a, b);
    switch (hero.targeting ?? "auto") {
      case "first": return (a, b) => b.distance - a.distance;
      case "last": return (a, b) => a.distance - b.distance;
      case "strongest": return (a, b) => b.hp - a.hp || b.distance - a.distance;
      case "weakest": return (a, b) => a.hp - b.hp || b.distance - a.distance;
      case "fastest": return (a, b) => b.speed - a.speed || b.distance - a.distance;
      case "ground": return prefer((e) => (e.flying ? 0 : 1));
      case "flying": return prefer((e) => (e.flying ? 1 : 0));
      case "boss": return prefer((e) => (e.kind === "boss" ? 1 : 0));
      default: return classOrder;
    }
  }

  classTargetOrder(hero) {
    if (hero.ability === "execute") return (a, b) => a.hp - b.hp;
    if (this.kit(hero).target === "strongest") return (a, b) => b.hp - a.hp || b.distance - a.distance;
    return (a, b) => b.distance - a.distance;
  }

  // Assassin leak catcher (kit dash): an enemy no blocker holds, within dash reach,
  // furthest along the path. Held enemies are left to the line.
  dashTarget(hero) {
    const reach = this.dashReach(hero);
    if (!reach) return null;
    let best = null;
    for (const enemy of this.enemies) {
      if (enemy.held || this.isStopped(enemy) || !this.canHit(hero, enemy)) continue;
      if (Math.hypot(hero.x - enemy.x, hero.y - enemy.y) > reach) continue;
      if (!best || enemy.distance > best.distance) best = enemy;
    }
    return best;
  }

  dashReach(hero) {
    const dash = this.kit(hero).dash;
    return dash ? dash + (this.classBonus(hero).dash || 0) + (this.pathFx(hero, "reach")?.dash || 0) : 0;
  }

  // Class kit numbers with their class blessings (blessingTree *_special), for sim and UI.
  splashRadius(hero) {
    const splash = this.kit(hero).splash;
    return splash ? splash.radius * (1 + (this.classBonus(hero).splash || 0)) : 0;
  }

  cleaveShare(hero) {
    const cleave = this.kit(hero).cleave;
    return cleave ? cleave.share + (this.classBonus(hero).cleave || 0) : 0;
  }

  pierceFor(hero) {
    return Math.min(1, (this.kit(hero).pierce || 0) + (this.classBonus(hero).pierce || 0));
  }

  // Tank passive: a share of incoming damage is shrugged off.
  guardFor(hero) {
    return Math.min(0.9, (this.kit(hero).guard || 0) + (this.classBonus(hero).guard || 0));
  }

  isStopped(enemy) {
    return (enemy.petrifiedUntil ?? 0) > this.time || (enemy.stunnedUntil ?? 0) > this.time;
  }

  isVeiled(hero) {
    return (hero?.veilUntil ?? 0) > this.time;
  }

  // One basic attack, shaped by the class kit (tuning.classes, M6). Returns false when
  // the hero had nothing to do, so its attack timer stays ready.
  //   Support: heals the most injured ally in range, else a weak attack (damageShare).
  //   Mage: splash around the target, or a chain (hero skill basic "chain", Zeus).
  //   Warrior: cleaves up to `targets` enemies next to the target.
  //   Archer: pierces a share of armor or magic resistance.
  //   Assassin: dashes to loose enemies; while veiled strikes extra enemies too.
  basicAttack(hero, target) {
    const kit = this.kit(hero);
    const cb = this.classBonus(hero);
    if (this.pathFx(hero, "purify") || cb.purify) this.purify(hero);
    if (kit.heal && this.healPulse(hero, kit, cb)) return true;
    if (!target) return false;
    const mods = this.modifiers();
    const crit = this.rng() < hero.critChance + mods.crit + (cb.crit || 0);
    const pierce = this.pierceFor(hero);
    const value = this.attackValue(hero);
    // Archer anti-air (kit airBonus). Assassins hunt enemies nobody holds (kit looseBonus),
    // scaled by (speed / kit.looseSpeed) squared, so runners take the full bonus and slow
    // walkers little of it.
    const path = this.pathFx(hero);
    const chainer = (hero.basic === "chain" && !!kit.chain) || hero.path === "arc";
    const strike = (enemy, share, opts = {}) => {
      const shred = (enemy.sunderUntil ?? 0) > this.time ? enemy.sunder : 0;
      const resistance = (hero.damageType === "magical" ? enemy.magicRes : enemy.armor) * (1 - pierce) * (1 - shred);
      const loose = kit.looseBonus && !enemy.held ? kit.looseBonus * (kit.looseSpeed ? Math.min(1, enemy.speed / kit.looseSpeed) ** 2 : 1) : 0;
      // Ambush (Assassin path): the first strike on each enemy hits much harder.
      const ambush = hero.path === "ambush" && !enemy.ambushedBy?.has(hero.entityId) ? path.firstHit : 1;
      if (ambush !== 1) (enemy.ambushedBy ||= new Set()).add(hero.entityId);
      const conducts = chainer && this.isWet(enemy) ? 1 + (this.statusCfg()?.reactions?.conduct?.bonus || 0) : 1;
      const bonus = (1 + (enemy.flying ? kit.airBonus || 0 : 0) + loose) * ambush * conducts;
      const dealt = this.hit(enemy, resolveDamage(value * share * bonus, resistance, hero.damageType, crit), hero, { crit, ...opts }) || 0;
      this.onStrike(hero, enemy, dealt);
      return dealt;
    };
    if (kit.dash && Math.hypot(hero.x - target.x, hero.y - target.y) > hero.range) {
      this.emitHeroEffect(hero, { type: "dash", x1: hero.x, y1: hero.y, x2: target.x, y2: target.y, life: 0.3, color: "purple" });
    }
    strike(target, kit.damageShare ?? 1);
    const others = (radius) => this.enemies
      .filter((e) => e !== target && this.canHit(hero, e) && Math.hypot(target.x - e.x, target.y - e.y) <= radius)
      .sort((a, b) => Math.hypot(target.x - a.x, target.y - a.y) - Math.hypot(target.x - b.x, target.y - b.y));
    // Arc (Mage path): every Mage chains; a chaining Mage (Zeus) gets the extra bounces.
    const arc = hero.path === "arc" ? path : null;
    let chain = hero.basic === "chain" && kit.chain ? { reach: kit.chain.reach, falloff: [...kit.chain.falloff, ...(arc?.falloff ?? [])] } : arc;
    // Conduct (M13): a chain that starts on a Wet enemy bounces further.
    const conduct = this.statusCfg()?.reactions?.conduct;
    if (chain && conduct && this.isWet(target)) {
      chain = { ...chain, falloff: [...chain.falloff, ...Array(conduct.bounces).fill(chain.falloff.at(-1))] };
      this.reaction("conduct", target, hero, 40);
    }
    if (chain) {
      let from = target;
      const struck = new Set([target]);
      for (const share of chain.falloff) {
        const next = this.enemies.filter((e) => !struck.has(e) && this.canHit(hero, e) && Math.hypot(from.x - e.x, from.y - e.y) <= chain.reach)
          .sort((a, b) => Math.hypot(from.x - a.x, from.y - a.y) - Math.hypot(from.x - b.x, from.y - b.y))[0];
        if (!next) break;
        this.emitHeroEffect(hero, { type: "shot", x1: from.x, y1: from.y, x2: next.x, y2: next.y, life: 0.2, color: "purple", heroVariant: "chain_lightning" });
        strike(next, share, { showShot: false });
        const surge = this.hasBoon("storm_surge");
        if (surge && !next.dead) next.stunnedUntil = Math.max(next.stunnedUntil ?? 0, this.time + surge.stun);
        struck.add(next);
        from = next;
      }
    }
    if (kit.splash && !(hero.basic === "chain" && kit.chain)) {
      const radius = this.splashRadius(hero);
      this.emitHeroEffect(hero, { type: "splash", x: target.x, y: target.y, radius, life: 0.35, color: "purple" });
      for (const e of others(radius)) strike(e, kit.splash.share, { showShot: false, showHit: false });
    } else if (kit.cleave) {
      // Whirlwind (Warrior path): more cleave targets in a wider radius.
      const whirl = hero.path === "whirlwind" ? path : null;
      const radius = kit.cleave.radius * (whirl?.radius ?? 1);
      const victims = others(radius).slice(0, kit.cleave.targets + (whirl?.targets ?? 0));
      this.emitHeroEffect(hero, { type: "cleave", x: target.x, y: target.y, radius, life: 0.3, color: "gold" });
      for (const e of victims) strike(e, this.cleaveShare(hero), { showShot: false, showHit: false });
    }
    // Piercing (Archer path): the shot carries on into enemies right behind the target.
    if (hero.path === "piercing") for (const e of others(path.radius).slice(0, path.targets)) strike(e, path.share, { showHit: false });
    // Twin Blades (Assassin path): a second strike on the nearest other enemy in reach.
    if (hero.path === "twin") {
      const reach = Math.max(hero.range, this.dashReach(hero));
      const second = this.enemies.filter((e) => e !== target && this.canHit(hero, e) && Math.hypot(hero.x - e.x, hero.y - e.y) <= reach)
        .sort((a, b) => Math.hypot(hero.x - a.x, hero.y - a.y) - Math.hypot(hero.x - b.x, hero.y - b.y))[0];
      if (second) strike(second, path.share);
    }
    if (kit.veil && this.isVeiled(hero)) {
      const extra = this.enemies.filter((e) => e !== target && this.canHit(hero, e) && Math.hypot(hero.x - e.x, hero.y - e.y) <= Math.max(hero.range, this.dashReach(hero)))
        .sort(this.targetOrder(hero)).slice(0, kit.veil.extraTargets);
      for (const e of extra) strike(e, 1);
    }
    return true;
  }

  // Per-strike path effects (M12), after the damage landed.
  onStrike(hero, enemy, dealt) {
    this.applyHeroStatus(hero, enemy, dealt);
    const path = this.pathFx(hero);
    if (!path || enemy.dead && hero.path !== "bloodlust") return;
    switch (hero.path) {
      case "sunder":
        enemy.sunder = Math.min(path.max, ((enemy.sunderUntil ?? 0) > this.time ? enemy.sunder : 0) + path.perHit);
        enemy.sunderUntil = this.time + path.seconds;
        break;
      case "bloodlust":
        this.healHero(hero, dealt * path.lifesteal, hero);
        break;
      case "wildfire":
        this.applyBurn(enemy, hero, dealt * path.share, path.seconds);
        break;
      case "frost":
      case "crippling":
        // Keeps the stronger slow while one is still running.
        enemy.chillFactor = enemy.chill > 0 ? Math.min(path.factor, enemy.chillFactor) : path.factor;
        enemy.chill = path.seconds;
        this.tryFreeze(enemy, hero);
        break;
      case "mark":
        enemy.markedUntil = this.time + path.seconds;
        enemy.markBonus = path.bonus;
        break;
    }
  }

  // Status effects and reactions (M13, tuning.statuses). Heroes listed in `sources` apply
  // their status with every basic strike:
  //   wet: no effect alone; poison and burn: `share` of the hit again over `seconds`.
  // Reactions: Conduct (chain hits on Wet enemies), Steam (Burn meets Wet: burst),
  // Blight (Burn on a poisoned enemy spreads a stronger copy of its poison), Freeze (Chill meets Wet: stun),
  // Soul Harvest (poisoned enemies that die charge Anubis's ultimate).
  statusCfg() {
    return this.tuning.statuses ?? null;
  }

  isWet(enemy) {
    return (enemy.wetUntil ?? 0) > this.time;
  }

  isPoisoned(enemy) {
    return (enemy.poisonUntil ?? 0) > this.time;
  }

  isBurning(enemy) {
    return (enemy.burnUntil ?? 0) > this.time;
  }

  applyHeroStatus(hero, enemy, dealt) {
    const cfg = this.statusCfg();
    if (!cfg || enemy.dead) return;
    // A hero's own status (sources) plus its class Infusion blessing, if different.
    const own = cfg.sources?.[hero.id];
    const infuse = this.classBonus(hero).infuse;
    if (own) this.applyStatusKind(own, hero, enemy, dealt);
    if (infuse && infuse !== own && !enemy.dead) this.applyStatusKind(infuse, hero, enemy, dealt);
  }

  applyStatusKind(kind, hero, enemy, dealt) {
    const cfg = this.statusCfg();
    if (kind === "chill") {
      enemy.chillFactor = enemy.chill > 0 ? Math.min(cfg.chill.factor, enemy.chillFactor) : cfg.chill.factor;
      enemy.chill = Math.max(enemy.chill ?? 0, cfg.chill.seconds);
      this.tryFreeze(enemy, hero);
    } else if (kind === "wet") {
      if (this.isBurning(enemy)) return this.steam(enemy, enemy.burnBy ?? hero, enemy.burnDps * (enemy.burnUntil - this.time));
      enemy.wetUntil = this.time + cfg.wet.seconds;
      this.tryFreeze(enemy, hero);
    } else if (kind === "burn") {
      this.applyBurn(enemy, hero, dealt * cfg.burn.share, cfg.burn.seconds);
    } else if (kind === "poison") {
      const dps = dealt * cfg.poison.share / cfg.poison.seconds;
      if (dps >= (this.isPoisoned(enemy) ? enemy.poisonDps : 0)) {
        enemy.poisonDps = dps;
        enemy.poisonUntil = this.time + cfg.poison.seconds;
        enemy.poisonBy = hero;
      }
    }
  }

  // Burn: `total` damage over `seconds`; a new burn replaces a weaker one. On a Wet enemy it
  // turns into Steam instead; on a poisoned one it spreads the poison (Blight).
  applyBurn(enemy, hero, total, seconds) {
    const reactions = this.statusCfg()?.reactions;
    if (reactions?.steam && this.isWet(enemy)) return this.steam(enemy, hero, total);
    if (reactions?.blight && this.isPoisoned(enemy)) {
      let spread = 0;
      for (const other of this.enemies) {
        const dps = enemy.poisonDps * (reactions.blight.boost ?? 1);
        if (other === enemy || other.dead || (this.isPoisoned(other) && other.poisonDps >= dps) || Math.hypot(other.x - enemy.x, other.y - enemy.y) > reactions.blight.radius) continue;
        other.poisonDps = dps;
        other.poisonUntil = enemy.poisonUntil;
        other.poisonBy = enemy.poisonBy;
        spread += 1;
      }
      if (spread) this.reaction("blight", enemy, hero, reactions.blight.radius);
    }
    if (total / seconds >= (this.isBurning(enemy) ? enemy.burnDps : 0)) {
      enemy.burnDps = total / seconds;
      enemy.burnUntil = this.time + seconds;
      enemy.burnBy = hero;
    }
  }

  // Steam: Wet and Burn cancel out in one burst of `burst` x the burn's damage, and half of
  // that (`splash`) to enemies nearby.
  steam(enemy, hero, burnTotal) {
    const cfg = this.statusCfg()?.reactions?.steam;
    if (!cfg) return;
    enemy.wetUntil = 0;
    enemy.burnUntil = 0;
    const burst = burnTotal * cfg.burst;
    for (const other of [...this.enemies]) {
      if (other.dead || Math.hypot(other.x - enemy.x, other.y - enemy.y) > cfg.radius) continue;
      this.hit(other, other === enemy ? burst : burst * cfg.splash, hero, { showShot: false, showHit: false });
    }
    this.reaction("steam", enemy, hero, cfg.radius);
  }

  // Freeze: a Wet enemy that gets chilled is stunned; it can't refreeze during the cooldown.
  tryFreeze(enemy, hero) {
    const cfg = this.statusCfg()?.reactions?.freeze;
    if (!cfg || !this.isWet(enemy) || !(enemy.chill > 0) || (enemy.freezeReadyAt ?? 0) > this.time) return;
    enemy.wetUntil = 0;
    enemy.stunnedUntil = Math.max(enemy.stunnedUntil ?? 0, this.time + cfg.seconds);
    enemy.frozenUntil = this.time + cfg.seconds;
    enemy.freezeReadyAt = this.time + cfg.cooldown;
    this.reaction("freeze", enemy, hero, 30);
  }

  reaction(name, enemy, hero, radius) {
    this.reactionCounts[name] = (this.reactionCounts[name] || 0) + 1;
    this.emit({ type: "reaction", reaction: name, x: enemy.x, y: enemy.y, radius, life: 0.5, color: REACTION_COLORS[name] ?? "white" });
    if (!this.reactionsSeen.has(name)) {
      this.reactionsSeen.add(name);
      this.lastReaction = { name, heroId: hero?.id ?? null };
      this.onChange("reaction", this);
    }
  }

  // Kill effects of run blessings (M17).
  boonsOnKill(enemy, hero) {
    const spread = this.hasBoon("wildfire_spread");
    if (spread && this.isBurning(enemy)) {
      for (const other of this.enemies) {
        if (other.dead || other === enemy || this.isBurning(other) || Math.hypot(other.x - enemy.x, other.y - enemy.y) > spread.radius) continue;
        other.burnDps = enemy.burnDps;
        other.burnUntil = enemy.burnUntil;
        other.burnBy = enemy.burnBy;
      }
    }
    const burst = this.hasBoon("drowned_burst");
    if (burst && this.isWet(enemy)) {
      enemy.wetUntil = 0;
      for (const other of [...this.enemies]) {
        if (other.dead || other === enemy || Math.hypot(other.x - enemy.x, other.y - enemy.y) > burst.radius) continue;
        this.hit(other, enemy.maxHp * burst.share, hero, { showShot: false, showHit: false });
      }
      this.emit({ type: "reaction", reaction: "steam", x: enemy.x, y: enemy.y, radius: burst.radius, life: 0.45, color: "white" });
    }
    const reaper = this.hasBoon("soul_reaper");
    if (reaper && ++this.reaperKills % reaper.every === 0) {
      this.gold += reaper.gold;
      this.totalGoldEarned += reaper.gold;
      for (const h of this.heroes) h.ultClock += reaper.charge;
    }
  }

  // War Hymn (Support path): allies inside a hymn Support's range attack faster. Does not stack.
  hymnFor(hero) {
    let best = 0;
    for (const support of this.heroes) {
      const hymn = this.pathFx(support, "hymn");
      if (hymn && support !== hero && Math.hypot(support.x - hero.x, support.y - hero.y) <= support.range) best = Math.max(best, hymn.aps);
    }
    return best;
  }

  // Purify (Support path): every action lifts hexes from allies in range.
  purify(hero) {
    for (const ally of this.heroes) {
      if ((this.isHexed(ally) || this.isSilenced(ally)) && Math.hypot(hero.x - ally.x, hero.y - ally.y) <= hero.range) {
        ally.hexedUntil = 0;
        ally.silencedUntil = 0;
        this.emitHeroEffect(hero, { type: "beam", x1: hero.x, y1: hero.y, x2: ally.x, y2: ally.y, life: 0.3, color: "green" });
      }
    }
  }

  // Support basic action: heal the most injured ally in range (by health share).
  healPulse(hero, kit, cb) {
    let ally = null;
    for (const other of this.heroes) {
      if (other.hpLeft >= other.hp || Math.hypot(hero.x - other.x, hero.y - other.y) > hero.range) continue;
      if (!ally || other.hpLeft / other.hp < ally.hpLeft / ally.hp) ally = other;
    }
    if (!ally) return false;
    const amount = this.attackValue(hero) * kit.heal * (1 + this.modifiers().heal) * (1 + (cb.support || 0)) * (1 + (this.pathFx(hero, "purify")?.heal || 0));
    this.healHero(ally, amount, hero);
    // Sanctuary (Support path): the heal also reaches allies standing next to the target.
    const sanctuary = this.pathFx(hero, "sanctuary");
    if (sanctuary) {
      for (const other of this.heroes) {
        if (other !== ally && Math.hypot(other.x - ally.x, other.y - ally.y) <= sanctuary.radius) this.healHero(other, amount * sanctuary.share, hero);
      }
    }
    this.emitHeroEffect(hero, { type: "beam", x1: hero.x, y1: hero.y, x2: ally.x, y2: ally.y, life: 0.3, color: "green" });
    return true;
  }

  hit(enemy, amount, hero, { showShot = true, showHit = true, crit = false, dot = false } = {}) {
    if (enemy.dead || enemy.untargetable) return;
    const vuln = (enemy.exposed && enemy.exposed > this.time) ? 1.2 : 1;
    const held = enemy.held ? 1 + (this.tuning.blocking?.heldDamageBonus || 0) : 1;
    const bossHit = enemy.kind === "boss" ? 1 + (this.favor.bossDamage || 0) : 1;
    // Paths (M12): Warden's held enemies and Hunter's Mark take more from everyone.
    const warden = enemy.held ? 1 + (this.pathFx(enemy.heldBy, "warden")?.heldBonus || 0) : 1;
    const marked = (enemy.markedUntil ?? 0) > this.time ? 1 + enemy.markBonus : 1;
    // Run blessings (M17): Venom Rot on poisoned enemies, Shattering Cold on frozen ones.
    const rot = this.boons.length && this.isPoisoned(enemy) ? 1 + (this.hasBoon("venom_rot")?.bonus || 0) : 1;
    const shatter = this.boons.length && (enemy.frozenUntil ?? 0) > this.time ? 1 + (this.hasBoon("shattering_cold")?.bonus || 0) : 1;
    const before = enemy.hp;
    const stance = (enemy.stanceUntil ?? 0) > this.time ? 1 - (this.bossTuning?.stance?.reduction || 0) : 1;
    enemy.hp -= this.absorbShield(enemy, amount * vuln * held * bossHit * warden * marked * rot * shatter * stance);
    if (enemy.parentId) this.shareDamage(enemy, Math.min(before, before - enemy.hp), hero);
    if (showShot) this.emitHeroEffect(hero, { type: "shot", x1: hero.x, y1: hero.y, x2: enemy.x, y2: enemy.y, life: 0.12, color: hero.damageType === "magical" ? "purple" : "gold", heroVariant: hero.variant ?? null });
    if (showHit || crit) this.emitHeroEffect(hero, { type: "hit", x: enemy.x, y: enemy.y, life: 0.18, color: hero.damageType === "magical" ? "purple" : "gold", melee: hero.slotType === "road", crit, heroVariant: hero.variant ?? null });
    const dealt = Math.max(0, before - Math.max(0, enemy.hp));
    if (hero && dealt > 0) this.recordDamage(hero, enemy, dealt, dot);
    if (enemy.hp <= 0) this.killEnemy(enemy, hero);
    return dealt;
  }

  // Run statistics per hero id (M14), summed over every unit of that hero.
  statFor(hero) {
    return (this.heroStats[hero.id] ||= { id: hero.id, name: hero.name, class: hero.class, damage: 0, boss: 0, dot: 0, heal: 0, buff: 0, kills: 0 });
  }

  recordDamage(hero, enemy, dealt, dot) {
    if (!hero.id) return; // enemy sources (none today) stay out of hero stats
    const stat = this.statFor(hero);
    stat.damage += dealt;
    // Recent damage with a fading memory (Baphomet's Mark targets the top recent dealer).
    const memory = this.bossTuning?.mark?.memory ?? 8;
    hero.recentDamage = (hero.recentDamage || 0) * Math.exp(-(this.time - (hero.recentAt ?? this.time)) / memory) + dealt;
    hero.recentAt = this.time;
    if (enemy.kind === "boss" || enemy.parentId) stat.boss += dealt;
    if (dot) stat.dot += dealt;
    // Support aura: its share of this hit is credited to the Support as buff contribution.
    const aura = this.supportAuraFor(hero);
    if (aura) this.statFor(aura.source).buff += dealt * aura.bonus / (1 + aura.bonus);
  }

  // Heals a hero up to its maximum and credits the healer (M14). Returns the amount healed.
  healHero(target, amount, by) {
    const healed = Math.max(0, Math.min(target.hp, target.hpLeft + amount) - target.hpLeft);
    target.hpLeft += healed;
    if (by?.id && healed > 0) this.statFor(by).heal += healed;
    return healed;
  }

  // Shieldbearer (M11): the shield takes hits before health. Every hit strips at least
  // minChip of the full shield, so many quick hits (cleave, splash, fast attackers) break
  // it sooner than one big hit. Returns the damage left over for health.
  absorbShield(enemy, damage) {
    enemy.lastHitAt = this.time;
    if (!(enemy.shield > 0)) return damage;
    const shieldBefore = enemy.shield;
    const strip = Math.max(damage, enemy.shieldMax * (enemy.shieldChip ?? this.tuning.enemies[enemy.kind]?.shield?.minChip ?? 0));
    enemy.shield = Math.max(0, shieldBefore - strip);
    if (enemy.shield === 0) this.emit({ type: "shieldBreak", x: enemy.x, y: enemy.y, life: 0.4, color: "white" });
    return Math.max(0, damage - shieldBefore);
  }

  // Per-kind enemy traits (M11), run every step while the enemy can act:
  //   heal (Mender): pulses heal to other enemies nearby (not other Menders); bosses take at
  //     most `cap` of the Mender's max health per pulse. Each enemy can receive at most
  //     `budget` of its max health in total, so a held group cannot outheal a weak line forever.
  //   shield (Shieldbearer): refills at regenRate per second after regenDelay seconds without a hit.
  //   summon (Broodcaller): calls `count` imps every `every` seconds, at most `max` alive
  //     and `total` over its life (a held Broodcaller must not feed a wave forever).
  //   hex (Hexer): stuns the nearest hero in range for `seconds`, every `every` seconds.
  enemyTraits(enemy, dt) {
    if (enemy.kind === "boss" && this.bossTuning) this.bossRules(enemy, dt);
    const cfg = this.tuning.enemies[enemy.kind];
    if (!cfg) return;
    if (cfg.heal) {
      enemy.healClock = (enemy.healClock ?? cfg.heal.every) - dt;
      if (enemy.healClock <= 0) {
        enemy.healClock = cfg.heal.every;
        let healed = false;
        for (const other of this.enemies) {
          if (other.kind === enemy.kind || other.dead || other.hp >= other.maxHp) continue;
          if (Math.hypot(other.x - enemy.x, other.y - enemy.y) > cfg.heal.radius) continue;
          const left = other.maxHp * cfg.heal.budget - (other.healed ?? 0);
          const amount = Math.min(other.maxHp * cfg.heal.share, other.kind === "boss" ? enemy.maxHp * cfg.heal.cap : Infinity, left, other.maxHp - other.hp);
          if (amount <= 0) continue;
          other.hp += amount;
          other.healed = (other.healed ?? 0) + amount;
          healed = true;
        }
        if (healed) this.emit({ type: "splash", x: enemy.x, y: enemy.y, radius: cfg.heal.radius, life: 0.45, color: "green", enemyHeal: true });
      }
    }
    if (cfg.shield && enemy.shield < enemy.shieldMax && this.time - (enemy.lastHitAt ?? -Infinity) >= cfg.shield.regenDelay) {
      enemy.shield = Math.min(enemy.shieldMax, enemy.shield + enemy.shieldMax * cfg.shield.regenRate * dt);
    }
    if (cfg.summon) {
      enemy.summonClock = (enemy.summonClock ?? cfg.summon.every) - dt;
      if (enemy.summonClock <= 0) {
        enemy.summonClock = cfg.summon.every;
        const alive = this.enemies.filter((e) => e.summonerId === enemy.entityId && !e.dead).length;
        const room = Math.max(0, Math.min(cfg.summon.count, cfg.summon.max - alive, cfg.summon.total - (enemy.summoned ?? 0)));
        enemy.summoned = (enemy.summoned ?? 0) + room;
        for (let i = 0; i < room; i += 1) {
          this.spawnEnemy(cfg.summon.kind, { distance: enemy.distance + 12 * (i + 1), statScale: enemy.statScale ?? 1, lane: enemy.lane ?? 0, sway: SWAY[(enemy.entityId + i) % SWAY.length], extra: { summonerId: enemy.entityId } });
        }
        if (room > 0) this.emit({ type: "summon", x: enemy.x, y: enemy.y, life: 0.5, color: "red" });
      }
    }
    if (cfg.hex) {
      enemy.hexClock = (enemy.hexClock ?? cfg.hex.every * 0.5) - dt;
      if (enemy.hexClock <= 0) {
        let best = null;
        for (const hero of this.heroes) {
          if (this.isVeiled(hero) || this.isHexed(hero)) continue;
          const d = Math.hypot(hero.x - enemy.x, hero.y - enemy.y);
          if (d <= cfg.hex.range && (!best || d < best.d)) best = { hero, d };
        }
        if (best) {
          enemy.hexClock = cfg.hex.every;
          best.hero.hexedUntil = this.time + cfg.hex.seconds;
          this.emit({ type: "hex", x1: enemy.x, y1: enemy.y, x2: best.hero.x, y2: best.hero.y, x: best.hero.x, y: best.hero.y, life: 0.5, color: "purple" });
        }
      }
    }
  }

  isHexed(hero) {
    return (hero?.hexedUntil ?? 0) > this.time;
  }

  // Boss rules (M18, tuning.bosses[id]):
  //   mark (Baphomet): every `every` s it marks the hero with the most recent damage; after
  //     `warn` s that hero is silenced for `seconds` and loses `selfDamage` of its health.
  //   stance (Baphomet): every `every` s it takes `reduction` less damage for `seconds`.
  //   endOfAll (Lilith): below `below` health her children attack `attackSpeed` times as fast.
  bossRules(boss, dt) {
    const cfg = this.bossTuning;
    if (cfg.mark) {
      boss.markClock = (boss.markClock ?? cfg.mark.every) - dt;
      const target = this.heroes.find((h) => h.entityId === boss.markTarget);
      if (boss.markTarget && boss.markAt <= this.time) {
        if (target && !this.isVeiled(target)) {
          target.silencedUntil = this.time + cfg.mark.seconds;
          this.damageHero(target, target.hp * cfg.mark.selfDamage, boss);
          this.emit({ type: "hex", x1: boss.x, y1: boss.y, x2: target.x, y2: target.y, x: target.x, y: target.y, life: 0.6, color: "red" });
        }
        boss.markTarget = null;
      } else if (!boss.markTarget && boss.markClock <= 0) {
        const top = [...this.heroes].sort((a, b) => this.recentDamageOf(b) - this.recentDamageOf(a))[0];
        boss.markClock = cfg.mark.every;
        if (top && this.recentDamageOf(top) > 0) {
          boss.markTarget = top.entityId;
          boss.markAt = this.time + cfg.mark.warn;
          top.markedByBossUntil = boss.markAt;
          this.emit({ type: "bossMark", x: top.x, y: top.y, life: cfg.mark.warn, color: "red" });
          this.onChange("bossMark", this);
        }
      }
    }
    if (cfg.stance) {
      boss.stanceClock = (boss.stanceClock ?? cfg.stance.every) - dt;
      if (boss.stanceClock <= 0) {
        boss.stanceClock = cfg.stance.every;
        boss.stanceUntil = this.time + cfg.stance.seconds;
        this.emit({ type: "hold", x: boss.x, y: boss.y, radius: 40, life: 0.5, color: "red" });
      }
    }
    if (cfg.endOfAll && !boss.endOfAll && boss.hp <= boss.maxHp * cfg.endOfAll.below) {
      boss.endOfAll = true;
      this.onChange("endOfAll", this);
      this.emit({ type: "summon", x: boss.x, y: boss.y, life: 0.9, color: "red" });
    }
  }

  // End of All (Lilith): her children attack faster once she is below the threshold.
  childFrenzy(enemy) {
    if (!enemy.parentId || !this.bossTuning?.endOfAll) return 1;
    const parent = this.enemies.find((e) => e.entityId === enemy.parentId);
    return parent?.endOfAll ? this.bossTuning.endOfAll.attackSpeed : 1;
  }

  recentDamageOf(hero) {
    return (hero.recentDamage || 0) * Math.exp(-(this.time - (hero.recentAt ?? this.time)) / (this.bossTuning?.mark?.memory ?? 8));
  }

  isSilenced(hero) {
    return (hero?.silencedUntil ?? 0) > this.time;
  }

  // Damage a child takes also reaches its summoner (capped at what the child had left).
  shareDamage(child, dealt, hero) {
    const parent = this.enemies.find((e) => e.entityId === child.parentId);
    if (!parent || parent.dead || dealt <= 0) return;
    parent.hp -= dealt * (this.bossTuning?.summon?.sharedDamage ?? 1);
    if (parent.hp <= 0) this.killEnemy(parent, hero);
  }

  killEnemy(enemy, hero) {
    enemy.dead = true;
    if (this.boons.length) this.boonsOnKill(enemy, hero);
    const harvest = this.statusCfg()?.reactions?.harvest;
    if (harvest && this.isPoisoned(enemy)) {
      for (const anubis of this.heroes.filter((h) => h.id === "anubis")) {
        anubis.ultClock += harvest.charge;
        this.reaction("harvest", enemy, anubis, 20);
      }
    }
    if (enemy.kind === "boss") this.emit({ type: "bossDown", x: enemy.x, y: enemy.y, life: 1.2, color: "red" });
    const reward = this.killReward(enemy.reward);
    this.gold += reward;
    this.score += Math.round(enemy.maxHp + enemy.reward * 4);
    if (this.waveStats) { this.waveStats.kills += 1; this.waveStats.goldEarned += reward; }
    this.totalGoldEarned += reward;
    if (hero?.id) this.statFor(hero).kills += 1;
    const slot = this.heroKills[hero.entityId];
    if (slot) slot.kills += 1;
    else this.heroKills[hero.entityId] = { name: hero.name, kills: 1 };
    if (this.quest?.type === "heroKills" && this.quest.status === "active" && this.quest.heroEntityId === hero.entityId) this.quest.kills += 1;
    (this.insightLog[hero.class] ||= { waves: 0, kills: 0 }).kills += 1;
    this.onChange("kill", this);
  }

  inCone(hero, enemy, halfAngle = Math.PI / 3) {
    const angle = Math.atan2(enemy.y - hero.y, enemy.x - hero.x);
    let delta = angle - (hero.rotation || 0);
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return Math.abs(delta) <= halfAngle;
  }

  castUltimate(hero, target) {
    const power = this.attackValue(hero) * 2.5 * hero.ultPower * (1 + (this.classBonus(hero).ultPower || 0));
    const variant = hero.variant;
    // Road heroes cannot reach flyers with basic attacks, and their ultimates follow the same rule.
    const foes = this.enemies.filter((e) => !e.untargetable && !(e.flying && hero.slotType === "road"));
    // Awakened heroes (level 5 step, tuning.awakening) get the approved per-ultimate upgrade.
    const aw = !!hero.awakened;

    if (variant === "shadow_step") {
      // Nyx: phase to lowest-HP enemy, execute it, slow nearby
      // Awakened: also strikes the second weakest enemy.
      const struck = aw ? foes.filter((e) => !e.dead).sort((a, b) => a.hp - b.hp).slice(0, 2) : [target];
      if (!struck.includes(target)) struck[0] = target;
      for (const victim of struck) {
        this.hit(victim, victim.hp / victim.maxHp < this.executeThreshold(hero) ? power * 1.8 : power, hero);
        foes.filter((e) => !e.dead && Math.hypot(victim.x - e.x, victim.y - e.y) <= 70).forEach((e) => { e.slow = 2; });
      }
    } else if (variant === "soul_drain") {
      // Anubis, Featherfall Judgment: drain the weakest enemy (his attack target as an
      // Assassin), stun it for 2s, 450% ATK (1.8x the standard ultimate). A kill hands
      // back 60% of the charge (the skill restores 600 of 1000 Energy).
      this.hit(target, power * 1.8, hero);
      if (target.dead) hero.ultRefund = hero.ultCooldown * (aw ? 0.8 : 0.6);
      else target.stunnedUntil = Math.max(target.stunnedUntil ?? 0, this.time + (aw ? 3 : 2));
    } else if (variant === "valkyrie_call") {
      // Freya: revive the most recent eligible fallen hero at 50% HP; fallback heal if none.
      // Eligible: not already back on the field, ring still free, and room in the team.
      const fallen = this.takeRevivableFallen();
      if (fallen) {
        const base = this.heroesById.get(fallen.id);
        const slotArr = fallen.slotType === "road" ? this.map.roadSlots : this.map.platformSlots;
        const slot = slotArr[fallen.slotIndex];
        const fullHp = this.maxHpFor(base.hp, 1, base.class);
        const fSkill = this.tuning.heroSkills?.[fallen.id];
        this.heroes.push({ ...base, range: this.rangeFor(base) * (1 + (this.ringAt(fallen.slotType, fallen.slotIndex)?.range || 0)), entityId: this.entityId++, x: slot[0], y: slot[1], slotType: fallen.slotType, slotIndex: fallen.slotIndex, hp: fullHp, hpLeft: Math.round(fullHp * (aw ? 1 : 0.5)), attackClock: 0, ultClock: 0, rotation: this.defaultRotationFor(slot[0], slot[1]), targeting: fallen.targeting ?? "auto", level: 1, baseAtk: base.atk, baseHp: base.hp, variant: fSkill?.variant ?? null, skillName: fSkill?.skillName ?? null, basic: fSkill?.basic ?? null });
        if (!this.team.includes(fallen.id)) this.team = [...this.team, fallen.id];
        this.lastRevive = { heroId: fallen.id, by: hero.id };
        this.emitHeroEffect(hero, { type: "heal", x: slot[0], y: slot[1], life: 0.7, color: "green" });
        this.onChange("revive", this);
      } else {
        const fraction = this.healFraction(hero);
        this.heroes.filter((a) => Math.hypot(hero.x - a.x, hero.y - a.y) <= hero.range).forEach((a) => {
          this.healHero(a, a.hp * fraction, hero);
          this.emitHeroEffect(hero, { type: "heal", x: a.x, y: a.y, life: 0.5, color: "green" });
        });
      }
    } else if (variant === "knockback") {
      // Poseidon: cleave + push up to 3 enemies back on path (sorted by furthest progress = most dangerous first)
      const around = foes.filter((e) => !e.dead && Math.hypot(hero.x - e.x, hero.y - e.y) <= 72);
      const cone = around.filter((e) => this.inCone(hero, e));
      const victims = (cone.length ? cone : around).sort((a, b) => b.distance - a.distance).slice(0, aw ? 5 : 3);
      victims.forEach((e) => {
        this.hit(e, power, hero);
        // Move the body too: a blocked enemy never walks, so only updating distance left it in the pile.
        e.distance = Math.max(0, e.distance - (aw ? 140 : 80));
        const point = pointOnPath(this.laneOf(e).path, e.distance, e.sway);
        e.x = point.x; e.y = point.y;
      });
    } else if (variant === "petrify_shot") {
      // Gaze catches distinct enemies in the facing cone, furthest along first.
      const skill = this.tuning.heroSkills?.[hero.id];
      const limit = Math.max(1, Math.floor(skill?.petrifyTargets ?? 3)) + (aw ? 2 : 0);
      const duration = Math.max(0, skill?.petrifyDuration ?? 3) + (aw ? 1 : 0);
      const victims = foes.filter(e => !e.dead
        && Math.hypot(hero.x - e.x, hero.y - e.y) <= hero.range && this.inCone(hero, e))
        .sort((a, b) => b.distance - a.distance).slice(0, limit);
      if (!victims.length) return false; // Keep the ultimate ready until she faces a target.
      const gazeTargets = victims.map(e => ({ x: e.x, y: e.y }));
      for (const victim of victims) {
        this.hit(victim, power * 0.55, hero, { showShot: false });
        if (!victim.dead) victim.petrifiedUntil = Math.max(victim.petrifiedUntil ?? 0, this.time + duration);
      }
      this.emitHeroEffect(hero, { type: "ult", x: gazeTargets[0].x, y: gazeTargets[0].y,
        gazeTargets, life: 0.55, color: "purple" });
      return;
    } else if (variant === "shield_wall") {
      // Nuwa: taunt + heal nearby road allies
      foes.filter((e) => Math.hypot(hero.x - e.x, hero.y - e.y) <= hero.range * 1.8).forEach((e) => { e.slow = aw ? 4 : 3; });
      this.heroes.filter((a) => a.slotType === "road" && Math.hypot(hero.x - a.x, hero.y - a.y) <= hero.range).forEach((a) => {
        this.healHero(a, a.hp * (aw ? 0.3 : 0.15), hero);
        this.emitHeroEffect(hero, { type: "heal", x: a.x, y: a.y, life: 0.5, color: "green" });
      });
    } else if (variant === "expose") {
      // Prometheus: taunt + expose enemies (take +20% damage for 4s, see hit())
      foes.filter((e) => Math.hypot(hero.x - e.x, hero.y - e.y) <= hero.range * 1.8).forEach((e) => { e.slow = 3; e.exposed = this.time + (aw ? 7 : 4); });
    } else if (variant === "mass_taunt") {
      // Momus: wide taunt (2.5x range)
      foes.filter((e) => Math.hypot(hero.x - e.x, hero.y - e.y) <= hero.range * (aw ? 3.5 : 2.5)).forEach((e) => { e.slow = aw ? 5 : 3; });
    } else if (variant === "drain_field") {
      // Demeter: taunt + self heal
      foes.filter((e) => Math.hypot(hero.x - e.x, hero.y - e.y) <= hero.range * 1.8).forEach((e) => { e.slow = 3; });
      this.healHero(hero, hero.hp * (aw ? 0.35 : 0.15), hero);
      this.emitHeroEffect(hero, { type: "heal", x: hero.x, y: hero.y, life: 0.5, color: "green" });
    } else if (variant === "war_cry") {
      // Amunra: cleave + slow hit enemies
      const around = foes.filter((e) => !e.dead && Math.hypot(hero.x - e.x, hero.y - e.y) <= 72);
      const cone = around.filter((e) => this.inCone(hero, e));
      (cone.length ? cone : around).forEach((e) => { this.hit(e, power * (aw ? 1.5 : 1), hero); e.slow = aw ? 4 : 2; });
      this.emitHeroEffect(hero, { type: "buff", x: hero.x, y: hero.y, life: 0.4, color: "gold" });
    } else if (variant === "lifesteal_cleave") {
      // Set: cleave + heal self for 15% of power per target hit
      const around = foes.filter((e) => !e.dead && Math.hypot(hero.x - e.x, hero.y - e.y) <= 72);
      const cone = around.filter((e) => this.inCone(hero, e));
      const targets = cone.length ? cone : around;
      targets.forEach((e) => this.hit(e, power, hero));
      if (targets.length > 0) {
        this.healHero(hero, power * targets.length * (aw ? 0.3 : 0.15), hero);
        this.emitHeroEffect(hero, { type: "heal", x: hero.x, y: hero.y, life: 0.4, color: "green" });
      }
    } else if (variant === "venom_cleave") {
      // Jormungandr: cleave + vulnerability debuff (+20% dmg taken for 4s, see hit())
      const around = foes.filter((e) => !e.dead && Math.hypot(hero.x - e.x, hero.y - e.y) <= (aw ? 100 : 72));
      const cone = around.filter((e) => this.inCone(hero, e));
      (cone.length ? cone : around).forEach((e) => { this.hit(e, power, hero); e.exposed = this.time + (aw ? 8 : 4); });
    } else if (variant === "claw_sweep") {
      // Bastet: execute target + AoE execute around it
      const execMult = target.hp / target.maxHp < this.executeThreshold(hero) ? 1.8 : 1;
      this.hit(target, power * execMult, hero);
      foes.filter((e) => !e.dead && e !== target && Math.hypot(target.x - e.x, target.y - e.y) <= (aw ? 90 : 55)).forEach((e) => {
        this.hit(e, power * (e.hp / e.maxHp < this.executeThreshold(hero) ? 1.8 : 0.7), hero);
      });
    } else if (variant === "rapid_strike") {
      // Horus: 3 rapid hits at 50% power
      for (let i = 0; i < (aw ? 5 : 3); i += 1) if (!target.dead) this.hit(target, power * 0.5, hero);
    } else if (variant === "chain_lightning") {
      // Zeus: nuke primary cluster + bounce to 2 nearest others
      const blasted = foes.filter((e) => Math.hypot(target.x - e.x, target.y - e.y) <= 72);
      blasted.forEach((e) => this.hit(e, power, hero));
      // Bounces jump from enemy to enemy, skipping anyone already hit; each one weaker.
      const falloff = aw ? [0.7, 0.45, 0.3, 0.2] : [0.7, 0.45];
      const struck = [...blasted];
      let from = target;
      for (const mult of falloff) {
        const next = foes.filter((e) => !e.dead && !struck.includes(e) && Math.hypot(from.x - e.x, from.y - e.y) <= 140)
          .sort((a, b) => Math.hypot(from.x - a.x, from.y - a.y) - Math.hypot(from.x - b.x, from.y - b.y))[0];
        if (!next) break;
        this.hit(next, power * mult, hero);
        this.emitHeroEffect(hero, { type: "shot", x1: from.x, y1: from.y, x2: next.x, y2: next.y, life: 0.2, color: "purple", heroVariant: "chain_lightning" });
        struck.push(next);
        from = next;
      }
    } else if (variant === "rebirth_flame") {
      // Phoenix: nuke + self heal for 20% max HP
      foes.filter((e) => Math.hypot(target.x - e.x, target.y - e.y) <= (aw ? 110 : 72)).forEach((e) => this.hit(e, power, hero));
      this.healHero(hero, hero.hp * (aw ? 0.4 : 0.2), hero);
      this.emitHeroEffect(hero, { type: "heal", x: hero.x, y: hero.y, life: 0.5, color: "green" });
    } else if (variant === "weaken_burst") {
      // Fengyi: nuke + expose hit targets
      foes.filter((e) => Math.hypot(target.x - e.x, target.y - e.y) <= (aw ? 110 : 72)).forEach((e) => { this.hit(e, power, hero); e.exposed = this.time + 4; });
    } else if (variant === "moon_barrage") {
      // Diana: volley + grant atk buff to nearby allies
      const shots = aw ? 5 : 3;
      const spread = foes.filter((e) => !e.dead && e !== target && Math.hypot(hero.x - e.x, hero.y - e.y) <= hero.range && this.inCone(hero, e)).slice(0, shots - 1);
      const victims = [target, ...spread];
      for (let i = 0; i < shots; i += 1) { const v = victims[i % victims.length]; if (!v.dead) this.hit(v, power * 0.55, hero); }
      this.heroes.filter((a) => Math.hypot(hero.x - a.x, hero.y - a.y) <= hero.range).forEach((a) => {
        a.buffUntil = Math.max(a.buffUntil || 0, this.time + (aw ? 8 : 5));
        this.emitHeroEffect(hero, { type: "buff", x: a.x, y: a.y, life: 0.4, color: "gold" });
      });
    } else if (variant === "piercing_shot") {
      // Artemis: single shot piercing all enemies in line from hero through target
      const dx = target.x - hero.x; const dy = target.y - hero.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len; const uy = dy / len;
      foes.filter((e) => !e.dead).forEach((e) => {
        const ex = e.x - hero.x; const ey = e.y - hero.y;
        const proj = ex * ux + ey * uy;
        if (proj < 0 || proj > hero.range * (aw ? 2 : 1.5)) return;
        if (Math.abs(ex * uy - ey * ux) <= 18) this.hit(e, power * (aw ? 0.9 : 0.55), hero);
      });
    } else if (variant === "fortune_shower") {
      // Caishen: heal all allies + grant atk buff together
      const fraction = this.healFraction(hero);
      this.heroes.filter((a) => Math.hypot(hero.x - a.x, hero.y - a.y) <= hero.range).forEach((a) => {
        this.healHero(a, a.hp * fraction, hero);
        a.buffUntil = Math.max(a.buffUntil || 0, this.time + (aw ? 8 : 5));
        this.emitHeroEffect(hero, { type: "heal", x: a.x, y: a.y, life: 0.5, color: "green" });
        this.emitHeroEffect(hero, { type: "buff", x: a.x, y: a.y, life: 0.4, color: "gold" });
      });
      if (aw) {
        this.gold += 15; // awakened Fortune Shower pays out
        this.totalGoldEarned += 15;
        if (this.waveStats) this.waveStats.goldEarned += 15;
      }
    } else if (variant === "fate_link") {
      // Yuelao: heal allies + accelerate their ult charge by 30%
      const fraction = this.healFraction(hero);
      this.heroes.filter((a) => Math.hypot(hero.x - a.x, hero.y - a.y) <= hero.range).forEach((a) => {
        this.healHero(a, a.hp * fraction, hero);
        a.ultClock = Math.min(a.ultCooldown, a.ultClock + a.ultCooldown * (aw ? 0.6 : 0.3));
        this.emitHeroEffect(hero, { type: "heal", x: a.x, y: a.y, life: 0.5, color: "green" });
      });
    } else {
      // Generic class fallback (no variant)
      if (hero.ability === "taunt") {
        foes.filter((e) => Math.hypot(hero.x - e.x, hero.y - e.y) <= hero.range * 1.8).forEach((e) => { e.slow = 3; });
      } else if (hero.ability === "cleave") {
        const around = foes.filter((e) => !e.dead && Math.hypot(hero.x - e.x, hero.y - e.y) <= 72);
        const cone = around.filter((e) => this.inCone(hero, e));
        (cone.length ? cone : around).forEach((e) => this.hit(e, power, hero));
      } else if (hero.ability === "nuke") {
        foes.filter((e) => Math.hypot(target.x - e.x, target.y - e.y) <= 72).forEach((e) => this.hit(e, power, hero));
      } else if (hero.ability === "volley") {
        const spread = foes.filter((e) => !e.dead && e !== target && Math.hypot(hero.x - e.x, hero.y - e.y) <= hero.range && this.inCone(hero, e)).slice(0, 2);
        const victims = [target, ...spread];
        for (let i = 0; i < 3; i += 1) { const v = victims[i % victims.length]; if (!v.dead) this.hit(v, power * 0.55, hero); }
      } else if (hero.ability === "aura") {
        const allies = this.heroes.filter((ally) => Math.hypot(hero.x - ally.x, hero.y - ally.y) <= hero.range);
        if (hero.synergies?.includes("TEAM_HEAL")) {
          const fraction = this.healFraction(hero);
          allies.forEach((ally) => { this.healHero(ally, ally.hp * fraction, hero); this.emitHeroEffect(hero, { type: "heal", x: ally.x, y: ally.y, life: 0.5, color: "green" }); });
        } else {
          allies.forEach((ally) => { ally.buffUntil = this.time + this.support.auraDuration; this.emitHeroEffect(hero, { type: "buff", x: ally.x, y: ally.y, life: 0.5, color: "gold" }); });
        }
        this.hit(target, power * 0.65, hero);
      } else {
        this.hit(target, target.hp / target.maxHp < this.executeThreshold(hero) ? power * 1.8 : power, hero);
      }
    }
    this.classUltimate(hero, foes);
    this.emitHeroEffect(hero, { type: "ult", x: target.x, y: target.y, life: 0.55, color: "purple", heroVariant: hero.variant ?? null });
  }

  // Class part of every ultimate (M6), on top of the hero's own skill.
  //   Tank (kit hold): taunts and holds every ground enemy in taunt range in place.
  //   Assassin (kit veil): untargetable for a few seconds, striking extra enemies.
  classUltimate(hero, foes) {
    const kit = this.kit(hero);
    if (kit.hold) {
      const radius = hero.range * 1.8;
      const until = this.time + kit.hold + (this.classBonus(hero).hold || 0);
      for (const e of foes) {
        if (e.dead || e.flying || Math.hypot(hero.x - e.x, hero.y - e.y) > radius) continue;
        e.stunnedUntil = Math.max(e.stunnedUntil ?? 0, until);
      }
      this.emitHeroEffect(hero, { type: "hold", x: hero.x, y: hero.y, radius, life: 0.8, color: "gold" });
    }
    if (kit.veil) {
      hero.veilUntil = this.time + kit.veil.seconds;
      this.emitHeroEffect(hero, { type: "veil", x: hero.x, y: hero.y, life: 0.6, color: "purple" });
    }
  }

  // Run quests (6B): one objective per wave, except the final wave where gold
  // has no use. Pays tuning.quests gold at wave clear; no config means no quests.
  rollQuest() {
    const cfg = this.tuning.quests;
    if (!cfg || this.wave >= this.waves.length) return null;
    const types = ["noLeaks", "speedClear"];
    // Only road heroes take hits; without one, survival would be free gold.
    if (this.heroes.some((hero) => hero.slotType === "road")) types.push("heroSurvival");
    // Needs two heroes, or the named hero would simply be the whole team.
    if (this.heroes.length >= 2) types.push("heroKills");
    const type = types[Math.floor(this.questRng() * types.length)];
    const quest = { type, wave: this.wave, status: "active", gold: cfg.goldBase + cfg.goldPerWave * (this.wave - 1) };
    if (type === "speedClear") {
      // Scaled to the slowest enemy's time to walk the whole path, so the limit
      // fits the map length and wave mix instead of one fixed number.
      const spawns = this.waves[this.wave - 1].spawns;
      const slowest = Math.min(...spawns.map((group) => this.tuning.enemies[group.kind]?.speed ?? Infinity)) * this.difficulty.enemySpeed;
      quest.seconds = Math.round((this.path.total / slowest) * cfg.speedClearTravel);
    }
    if (type === "heroKills") {
      // A random deployed hero must land a share of an even split of the wave's kills.
      const hero = this.heroes[Math.floor(this.questRng() * this.heroes.length)];
      const enemies = this.waves[this.wave - 1].spawns.reduce((sum, group) => sum + group.count, 0);
      quest.heroEntityId = hero.entityId;
      quest.heroId = hero.id;
      quest.heroName = hero.name;
      quest.target = Math.max(1, Math.round((enemies / this.heroes.length) * cfg.heroKillsShare));
      quest.kills = 0;
    }
    return quest;
  }

  failQuest() {
    if (this.quest?.status !== "active") return;
    this.quest.status = "failed";
    this.onChange("quest", this);
  }

  checkQuestClock() {
    const quest = this.quest;
    const lastSpawnAt = this.waveStats?.lastSpawnAt;
    if (quest?.type !== "speedClear" || quest.status !== "active" || lastSpawnAt == null) return;
    if (this.time - lastSpawnAt > quest.seconds) this.failQuest();
  }

  completeQuest() {
    const quest = this.quest;
    if (quest?.status !== "active") return;
    if (quest.type === "heroKills" && quest.kills < quest.target) { this.failQuest(); return; }
    quest.status = "done";
    this.questsDone += 1;
    this.gold += quest.gold;
    if (this.waveStats) this.waveStats.goldEarned += quest.gold;
    this.totalGoldEarned += quest.gold;
  }

  finish(won) {
    this.running = false;
    this.complete = true;
    this.won = won;
    this.perfect = won && this.totalLeaks === 0;
    this.runDuration = this.time;
    this.onChange("finish", this);
  }
}

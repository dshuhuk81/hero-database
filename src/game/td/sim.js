import { expandTimeline, timelineTotals } from "./timeline.js";
import { mapLanes } from "./lanes.js";
import { bondsOf } from "./bonds.js";
import { boardOf, boardRules, cellAt, inPattern, PATTERNS, patternFor, patternRadius, steppedPattern, unitInPattern } from "./board.js";
import { environmentMultiplier, modsMultiplier } from "./environments.js";
import { normalizeSquadRows } from "./squad-rows.js";

const K = 260;
// Symmetric positions across a lane. The actual width follows the board and melee reach.
const FORMATION = [0, 0.75, -0.75, 0.38, -1, 1, -0.38];
const STEP = 1 / 60;
const NO_BOOST = { attack: 0, attackSpeed: 0, speed: 0 };
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

// Corners are rounded over this many px either side of a vertex, so a sideways offset turns
// with the path instead of snapping from one segment's normal to the next.
const CORNER_RADIUS = 24;

// `offset` shifts the point sideways from the path centre (px, left of travel direction).
export function pointOnPath(points, distance, offset = 0) {
  let remaining = distance;
  for (let i = 1; i < points.length; i += 1) {
    const ax = points[i - 1][0]; const ay = points[i - 1][1];
    const bx = points[i][0]; const by = points[i][1];
    const segment = Math.hypot(bx - ax, by - ay);
    if (remaining <= segment) {
      if (!segment) return { x: ax, y: ay };
      const dx = (bx - ax) / segment; const dy = (by - ay) / segment;
      // Inside the rounding zone of the vertex before (i-1) or after (i) this segment?
      const prev = i > 1 ? cornerAt(points, i - 1) : null;
      const next = i < points.length - 1 ? cornerAt(points, i) : null;
      if (prev && remaining < prev.r) return cornerPoint(prev, 0.5 + remaining / (2 * prev.r), offset);
      if (next && segment - remaining < next.r) return cornerPoint(next, 0.5 - (segment - remaining) / (2 * next.r), offset);
      return { x: ax + dx * remaining - dy * offset, y: ay + dy * remaining + dx * offset };
    }
    remaining -= segment;
  }
  const last = points.at(-1);
  return { x: last[0], y: last[1] };
}

// Rounding zone at vertex k: enter point, vertex, exit point (quadratic Bezier) and the
// in/out directions whose normals get blended across the turn.
function cornerAt(points, k) {
  const [px, py] = points[k - 1]; const [vx, vy] = points[k]; const [nx, ny] = points[k + 1];
  const lenIn = Math.hypot(vx - px, vy - py); const lenOut = Math.hypot(nx - vx, ny - vy);
  if (!lenIn || !lenOut) return null;
  const inX = (vx - px) / lenIn; const inY = (vy - py) / lenIn;
  const outX = (nx - vx) / lenOut; const outY = (ny - vy) / lenOut;
  if (inX * outX + inY * outY > 0.999) return null; // straight through
  const r = Math.min(CORNER_RADIUS, lenIn / 2, lenOut / 2);
  return { r, vx, vy, inX, inY, outX, outY };
}

function cornerPoint(c, t, offset) {
  const { r, vx, vy, inX, inY, outX, outY } = c;
  const sx = vx - inX * r; const sy = vy - inY * r;
  const ex = vx + outX * r; const ey = vy + outY * r;
  const u = 1 - t;
  const x = u * u * sx + 2 * u * t * vx + t * t * ex;
  const y = u * u * sy + 2 * u * t * vy + t * t * ey;
  // Tangent of the curve, rotated left, gives the offset normal.
  let tx = u * inX + t * outX; let ty = u * inY + t * outY;
  const tl = Math.hypot(tx, ty) || 1;
  tx /= tl; ty /= tl;
  return { x: x - ty * offset, y: y + tx * offset };
}

export class TowerDefenseGame {
  constructor({ heroes, tuning, map, timeline, tier = "normal", seed = 1337, allowedHeroes = null, squadRows = null, mutators = null, boons = null, lives = null, maxLives = null, hpScale = null, atkScale = null, stageRule = null, interventions = null, heroBonuses = null, onChange = () => {} }) {
    // Expedition veterans (M21): per-hero attack and health bonuses for this run only,
    // folded into the base stats so every placement and redeploy uses them.
    const boosted = (hero) => {
      const bonus = heroBonuses?.[hero.id];
      return bonus ? { ...hero, atk: hero.atk * (1 + (bonus.atk || 0)), hp: hero.hp * (1 + (bonus.hp || 0)) } : hero;
    };
    this.heroesById = new Map(heroes.map((hero) => [hero.id, boosted(hero)]));
    const flatLineup = Array.from(allowedHeroes ?? []);
    const rowInput = squadRows ?? [flatLineup.slice(0, 5), flatLineup.slice(5, 10)];
    this.squadRows = normalizeSquadRows(rowInput, { allowedIds: new Set(this.heroesById.keys()), lordIds: new Set(Object.keys(tuning.lords ?? {})) });
    // Daily Trial (M19): only these heroes can be deployed, and these mutators are active from the start.
    this.allowedHeroes = allowedHeroes ? new Set(allowedHeroes) : null;
    this.presetMutators = (mutators ?? []).filter((id) => tuning.mutators?.pool?.[id]);
    // Expedition (M21): relics (run blessings active from the start), lives carried over from
    // the previous stage and a stage health scale.
    this.presetBoons = (boons ?? []).filter((id) => tuning.runBoons?.list?.[id]);
    // Divine Interventions unlocked for this run (the page passes them; none in the Daily Trial).
    this.interventionIds = (interventions ?? []).filter((id) => tuning.interventions?.[id]);
    this.startLives = lives;
    // Enemy health scale: a mode's own stage scale (campaign, Expedition), else the map's
    // (`enemyHp` in tdMaps.json, evens out map difficulty in the Daily Trial and Expedition).
    this.hpScale = hpScale ?? map?.enemyHp ?? 1;
    // Enemy attack scale: a campaign stage's own `atkScale` (tdCampaign.json), 1 everywhere else.
    this.atkScale = atkScale ?? 1;
    this.stageRule = stageRule; // a campaign stage's own rule ({ name, text, mods }, tdStageRules.json), null elsewhere
    this.tuning = tuning;
    // Life maximum for the HUD, scenery and results: a campaign stage's own lives, the run's
    // tuned lives for an Expedition (carried lives can be lower), otherwise tuning.run.lives.
    this.maxLives = Math.max(1, maxLives ?? lives ?? tuning.run.lives);
    this.support = tuning.support || { healFraction: 0.18, auraAttackBonus: 0.25, auraDuration: 6 };
    this.classes = tuning.classes || {}; // class kits (M6): how each class attacks, blocks and supports
    // Board maps (board.js): tuning.board plus the map's own rules (enemy shape, Mage focus,
    // attack patterns, unit sizes); null on maps that still use range circles.
    this.boardRules = boardRules(map, tuning);
    if (this.boardRules?.focus && this.classes.Mage) this.classes = { ...this.classes, Mage: { ...this.classes.Mage, focus: this.boardRules.focus } };
    this.favor = tuning.favor || {}; // permanent Divine Blessing bonuses (favor.js)
    // Difficulty knobs (tuning.difficulty); the debug panel edits them live.
    this.difficulty = { enemyHp: 1, enemySpeed: 1, invincible: false, ...(tuning.difficulty || {}) };
    // Difficulty tier (M3).
    // Kept apart from `difficulty`, which the dev debug panel overwrites.
    this.tier = tuning.tiers?.[tier] ? tier : "normal";
    const tierCfg = tuning.tiers?.[this.tier] ?? {};
    this.tierHp = (tierCfg.enemyHp ?? 1) * (this.hpScale || 1);
    this.tierAttack = tierCfg.enemyAttack ?? 1;
    this.map = map;
    // The stage as one timeline of spawn groups (timeline.js). Daily Trial mutators that add enemies (Horde)
    // scale each regular group once, here, so the forecast and the spawn queue agree.
    const hordeShare = this.presetMutators.reduce((sum, id) => sum + (tuning.mutators.pool[id].count || 0), 0);
    this.timeline = (timeline ?? []).map((group) => (group.kind === "boss" || !hordeShare ? { ...group } : { ...group, count: Math.max(1, Math.round(group.count * (1 + hordeShare))) }));
    this.rng = createRng(seed);
    this.boonRng = createRng((seed ^ 0x5be0cd19) >>> 0); // rare / epic run blessing rolls (M17), apart from combat
    this.onChange = onChange;
    this.onEffect = null; // optional hook (effect) => void, used for audio
    this.lanes = mapLanes(map).map((lane) => ({ ...lane, ...pathMetrics(lane.path) }));
    // Longest route: tests size their limits by it.
    this.path = this.lanes.reduce((longest, lane) => (lane.total > longest.total ? lane : longest));
    // Final boss per map (tdMaps.json "boss"); tuning.bosses holds its stat overrides and skills.
    this.bossId = map.boss ?? "baphomet";
    this.bossTuning = tuning.bosses?.[this.bossId] ?? null;
    // God-Mode challenge (god-mode.js): a map with a `god` block plays a stationary god for a
    // fixed time instead of a timeline; the score is the damage dealt to it.
    this.god = map.god ?? null;
    this.reset();
  }

  reset() {
    this.interventions = Object.fromEntries(this.interventionIds.map((id) => [id, { charge: 0 }]));
    this.interventionsUsed = 0; // Divine Interventions cast this run (R10 daily quest)
    this.strikes = []; // pending Thunderfall bolts { x, y, at }
    this.shieldUntil = 0;
    this.shieldReadyAt = 0; // Shield of the Crossing cooldown (tuning.interventions.shield.cooldownSeconds)
    // Placement points replace gold: heroes cost points, the counter regrows with battle time.
    this.placement = this.tuning.run.startingPlacement;
    this.placementClock = 0;
    this.lives = this.startLives ?? this.tuning.run.lives;
    this.score = 0;
    this.godDamage = 0; // God-Mode: total damage dealt to the god this run
    this.godAttack = null; // God-Mode: the attack cycle's state
    this.started = false;
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
    this.stageStats = null;
    this.boons = [...(this.presetBoons ?? [])]; // rare and epic run blessings chosen this run (M17), Expedition relics first
    this.rallyUntil = 0;
    this.lordStates = Object.fromEntries(this.lordRows().map(({ lordId }) => [lordId, { clock: 0, buffUntil: 0 }]));
    this.reaperKills = 0;
    this.mutators = [...(this.presetMutators ?? [])]; // Daily Trial mutators, active from the start
    this.spawnCount = 0;
    this.totalLeaks = 0;
    this.enemiesDown = 0; // authored enemies killed or leaked, for the stage counter (stageForecast)
    this.perfect = false;
    this.fallenHeroes = [];
    this.heroKills = {};
    this.heroStats = {}; // per hero id: damage, boss, dot, heal, buff, kills (M14 result screen)
    this.leakKinds = {}; // lives lost per enemy kind over the run
    this.reactionsSeen = new Set(); // reactions triggered this run (first one of each gets a notice)
    this.reactionCounts = {};
    this.lastReaction = null;
    this.insightLog = {}; // per class { stages, kills } for Insight at run end (favor.js computeInsight)
    this.totalPlacementEarned = 0;
    this.totalPlacementSpent = 0;
    this.fieldedIds = []; // every hero id deployed this run, sold or fallen ones included (M20 challenges)
    this.relocations = 0;
    this.runDuration = 0;
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
    const raw = factor && this.fallenHeroes.some((entry) => entry.id === heroId) ? base.cost * factor : base.cost;
    const discount = Math.min(0.5, (this.favor.deployDiscount || 0) + (this.classBonus(base).deployDiscount || 0));
    return Math.max(1, Math.round(raw * (1 - discount)));
  }

  place(heroId, slotType, slotIndex) {
    const base = this.heroesById.get(heroId);
    const cost = this.deployCost(heroId);
    if (!base || base.slot !== slotType || this.placement < cost) return false;
    if (this.allowedHeroes && !this.allowedHeroes.has(heroId)) return false;
    if (this.heroes.some((hero) => hero.id === heroId)) return false;
    if (this.heroes.some((hero) => hero.slotType === slotType && hero.slotIndex === slotIndex)) return false;
    // Deploy cap (M22b): with a tile on every step of the road, the number of heroes on the
    // field is the limit, not the tiles. `team` records who was fielded.
    if (this.heroes.length >= this.deployCap()) return false;
    const slot = (slotType === "road" ? this.map.roadSlots : this.map.platformSlots)[slotIndex];
    if (!slot) return false;
    if (!this.team.includes(heroId)) {
      this.team = [...this.team, heroId];
      this.onChange("team", this);
    }
    this.placement -= cost;
    this.totalPlacementSpent += cost;
    if (!this.fieldedIds.includes(heroId)) this.fieldedIds.push(heroId);
    const hp = this.maxHpFor(base.hp, base.class);
    const atk = this.atkFor({ ...base, baseAtk: base.atk });
    const skill = this.tuning.heroSkills?.[heroId];
    this.heroes.push({ ...base, atk, range: this.deployRange(base, slotType, slotIndex), entityId: this.entityId++, x: slot[0], y: slot[1], slotType, slotIndex, hp, hpLeft: hp, attackClock: 0, ultClock: 0, rotation: this.defaultRotationFor(slot[0], slot[1]), targeting: "auto", baseAtk: base.atk, baseHp: base.hp, variant: skill?.variant ?? null, skillName: skill?.skillName ?? null, basic: skill?.basic ?? null });
    this.heroes.at(-1).invested = cost;
    this.emit({ type: "place", heroId, x: slot[0], y: slot[1] });
    this.onChange("place", this);
    return true;
  }

  // On a board the range is the radius of the hero's pattern (patternRadius), so ultimate
  // areas and scaled reaches fit the board; elsewhere the tuned range with tile and
  // environment bonuses.
  deployRange(base, slotType, slotIndex) {
    const pattern = this.patternAt(base, slotType, slotIndex);
    if (pattern) return patternRadius(pattern, boardOf(this.map).cell);
    return this.rangeFor(base) * (1 + (this.ringAt(slotType, slotIndex)?.range || 0)) * this.environment("range", { ...base, slotType, slotIndex });
  }

  environment(stat, hero = null, kind = null) {
    const ctx = { phase: this.environmentPhase(), hero, kind, ring: hero ? this.ringKind(hero.slotType, hero.slotIndex) : null };
    return environmentMultiplier(this.map, stat, ctx) * (this.stageRule ? modsMultiplier(this.stageRule.mods, stat, ctx) : 1); // chapter environment x stage rule
  }

  // What place() would field on this tile, without spending anything (recruit preview).
  // Attack is the unit's own value; auras, synergy and run buffs apply once it is placed.
  deployPreview(heroId, slotType, slotIndex) {
    const base = this.heroesById.get(heroId);
    if (!base) return null;
    return {
      atk: this.atkFor({ ...base, baseAtk: base.atk }),
      hp: this.maxHpFor(base.hp, base.class),
      range: this.deployRange(base, slotType, slotIndex),
      aps: base.aps,
      critChance: base.critChance,
      cost: this.deployCost(heroId),
      hitsFlyers: slotType !== "road",
    };
  }

  relocationInfo(entityId) {
    const hero = this.heroes.find((item) => item.entityId === entityId);
    if (!hero) return { ok: false, reason: "No hero selected." };
    if (this.complete) return { ok: false, reason: "Run is over.", hero };
    // The stage never pauses, so a hero may move at any time, but not again right away.
    const cooldown = this.tuning.run.relocationCooldownSeconds ?? 8;
    const wait = hero.relocatedAt != null ? Math.ceil(hero.relocatedAt + cooldown - this.time) : 0;
    if (wait > 0) return { ok: false, reason: `${hero.name} can move again in ${wait}s.`, hero };
    const share = this.tuning.run.relocationCost ?? 0.25;
    const discount = Math.min(1, this.classBonus(hero).relocateDiscount || 0);
    const cost = Math.round(this.deployCost(hero.id) * share * (1 - discount));
    if (this.placement < cost) return { ok: false, reason: `Needs ${cost} placement — you have ${this.placement}.`, hero, cost };
    return { ok: true, hero, cost };
  }

  relocate(entityId, slotType, slotIndex) {
    const info = this.relocationInfo(entityId);
    if (!info.ok) return info;
    const hero = info.hero;
    if (hero.slot !== slotType) return { ...info, ok: false, reason: `${hero.name} needs a ${hero.slot} tile.` };
    const slot = (slotType === "road" ? this.map.roadSlots : this.map.platformSlots)[slotIndex];
    if (!slot) return { ...info, ok: false, reason: "That tile does not exist." };
    if (this.heroes.some((item) => item.slotType === slotType && item.slotIndex === slotIndex)) return { ...info, ok: false, reason: "That tile is occupied." };
    this.placement -= info.cost;
    this.totalPlacementSpent += info.cost;
    hero.relocatedAt = this.time;
    hero.slotType = slotType;
    hero.slotIndex = slotIndex;
    hero.x = slot[0];
    hero.y = slot[1];
    hero.range = this.deployRange(hero, slotType, slotIndex);
    hero.rotation = this.defaultRotationFor(slot[0], slot[1]);
    this.relocations += 1;
    this.emit({ type: "relocate", heroId: hero.id, x: slot[0], y: slot[1], life: 0.5, color: "gold" });
    this.onChange("relocate", this);
    return info;
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

  maxHpFor(baseHp, heroClass) {
    const cb = this.classBonus(heroClass);
    const favorHp = (this.favor.heroHpBonus || 0) + (cb.hp || 0);
    return Math.round(baseHp * (1 + favorHp) * (1 + (cb.power || 0)));
  }

  atkFor(hero) {
    return Math.round((hero.baseAtk ?? hero.atk) * (1 + (this.classBonus(hero).power || 0)));
  }

  rangeFor(base) {
    const cb = this.classBonus(base);
    return Math.round(base.range * (1 + (cb.range || 0)) + (cb.rangeFlat || 0));
  }

  // Pays placement points (boons, ultimates); tracked for the run stats.
  addPlacement(amount) {
    if (!(amount > 0)) return 0;
    this.placement += amount;
    this.totalPlacementEarned += amount;
    if (this.stageStats) this.stageStats.placementEarned += amount;
    return amount;
  }

  executeThreshold(hero) {
    return 0.35 + (this.classBonus(hero).execute || 0);
  }

  ultChargeRate(hero = null) {
    return (1 + (this.favor.ultChargeBonus || 0) + (this.classBonus(hero).ultCharge || 0) + (this.bondFx(hero).ultCharge || 0)) * (1 + (this.ringFx(hero)?.ultCharge || 0)) * this.environment("charge", hero);
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

  hasBoon(id) {
    return this.boons?.includes(id) ? this.tuning.runBoons.list[id] : null;
  }

  // Whether the deployed team can use a mechanic blessing (M17).
  boonEligible(id) {
    const need = this.tuning.runBoons.list[id]?.requires;
    const applies = (status) => this.heroes.some((h) => this.statusCfg()?.sources?.[h.id] === status || this.classBonus(h).infuse === status);
    switch (need) {
      case null: case undefined: return true;
      case "chain": return this.heroes.some((h) => h.basic === "chain" && this.kit(h).chain);
      case "road": return this.heroes.some((h) => h.slotType === "road");
      case "freeze": return applies("wet") && applies("chill");
      default: return applies(need);
    }
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
    this.placement += refund;
    this.totalPlacementSpent -= refund;
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

  // Heroes aim on their own (M24: no player rotation). Cones and spreads are centred on the
  // chosen primary target; `rotation` stays as combat/render state for effects.
  faceTarget(hero, target) {
    if (target) hero.rotation = Math.atan2(target.y - hero.y, target.x - hero.x);
  }

  // Enemy shape (tuning.board.enemyShape): enemies are fewer and stronger than the old authored hordes. The timeline
  // carries the final counts; `hp`, `reward`, `attack` and `leak` multiply each enemy, `power` is their default.
  // `kinds` overrides any of these per enemy kind (e.g. flyers, which skip blockers).
  enemyShape(kind = null) {
    const base = this.boardRules?.enemyShape ?? this.tuning.enemyShape;
    if (!base?.enabled) return null;
    const cfg = { ...base, ...(kind ? base.kinds?.[kind] : null) };
    const power = cfg.power ?? 1;
    return { hp: cfg.hp ?? power, reward: cfg.reward ?? power, attack: cfg.attack ?? power, leak: cfg.leak ?? power };
  }

  formationSway(index) {
    const cell = boardOf(this.map)?.cell ?? 96;
    const spread = this.tuning.timeline?.laneSpread ?? 0.23;
    const contact = this.tuning.blocking?.contactRange ?? 42;
    const max = Math.min(cell * spread, contact * 0.9);
    return FORMATION[index % FORMATION.length] * max;
  }

  // Total health of the whole timeline with the same scaling as spawnEnemy (debug panel readout).
  stageTotalHp() {
    const { counts } = timelineTotals(this.timeline);
    let sum = 0;
    for (const [kind, n] of Object.entries(counts)) {
      const shape = kind === "boss" ? null : this.enemyShape(kind);
      sum += n * (this.tuning.enemies[kind]?.hp || 0) * (shape?.hp ?? 1);
    }
    return Math.round(sum * this.difficulty.enemyHp * this.tierHp);
  }

  // Environment phase rules alternate every tuning.timeline.phaseSeconds of battle time (environments.js).
  environmentPhase() {
    return this.started ? Math.floor(this.time / (this.tuning.timeline?.phaseSeconds ?? 20)) + 1 : 0;
  }

  // The whole stage at a glance. `total` and `counts` are what the timeline will spawn; `down` counts killed
  // or leaked authored enemies; `ahead` lists the next groups with the seconds until their next spawn.
  stageForecast(maxGroups = 3) {
    if (!this.timeline.length) return null;
    const { total, counts } = timelineTotals(this.timeline);
    const queue = this.started ? this.spawnQueue : expandTimeline(this.timeline, { gates: this.lanes.length, spacingMs: this.tuning.timeline?.spacingMs ?? 700 });
    const ahead = [];
    for (const entry of queue) {
      const eta = Math.max(0, Math.round(entry.at - (this.started ? this.spawnClock : 0)));
      const last = ahead.at(-1);
      if (last && last.kind === entry.kind && eta - last.eta <= 3) last.count += 1;
      else ahead.push({ kind: entry.kind, count: 1, eta });
    }
    return { total, counts, down: Math.min(total, this.enemiesDown), ahead: ahead.slice(0, maxGroups), ...(this.favor.showEnemyHp && { totalHp: this.stageTotalHp() }) };
  }

  // Starts the stage clock: the whole timeline becomes one spawn queue (no waves, no pauses).
  start() {
    if (this.running || this.complete || (!this.timeline.length && !this.god)) return false;
    if (this.god) return this.startGod();
    const spacingMs = this.tuning.timeline?.spacingMs ?? 700;
    const queue = expandTimeline(this.timeline, { gates: this.lanes.length, spacingMs });
    // Enemies on one lane keep a formation sway so they do not stack into one blob.
    const laneSpawned = this.lanes.map(() => 0);
    for (const entry of queue) entry.sway = this.formationSway(laneSpawned[entry.lane]++);
    // The boss closes the stage: it waits for the field to clear, at most tuning.timeline.bossWaitMs.
    this.spawnQueue = [...queue.filter((e) => e.kind !== "boss"), ...queue.filter((e) => e.kind === "boss")];
    this.stageStats = { kills: 0, leaks: 0, placementEarned: 0, heroDeaths: 0, leakKinds: {} };
    this.spawnClock = 0;
    this.started = true;
    this.running = true;
    this.paused = false;
    this.onChange("start", this);
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
    if (this.god && this.time >= this.god.seconds) { // the challenge ends on the clock, the god never falls
      this.time = this.god.seconds;
      this.finish(true);
      return;
    }
    this.stepInterventions(dt);
    this.stepLords(dt);
    // Placement regrows by tuning.run.placementPerSecond (x Favor rate) per second of battle time.
    this.placementClock += dt * (1 + (this.favor.placementRate || 0)) * this.environment("placementRate");
    const perSecond = this.tuning.run.placementPerSecond ?? 1;
    while (this.placementClock >= 1 / perSecond - 1e-9) {
      this.placementClock -= 1 / perSecond;
      this.addPlacement(1);
    }
    this.spawnClock += dt;
    while (this.spawnQueue.length) {
      const next = this.spawnQueue[0];
      // A boss waits for the field to clear, but never longer than tuning.timeline.bossWaitMs after its time.
      const bossHeld = next.kind === "boss" && this.fieldHasMinions() && this.spawnClock < next.at + (this.tuning.timeline?.bossWaitMs ?? 30000) / 1000;
      if (next.at > this.spawnClock || bossHeld) break;
      this.spawnQueue.shift();
      this.spawnEnemy(next.kind, { statScale: next.scale ?? 1, lane: next.lane ?? 0, sway: next.sway ?? 0 });
    }

    this.engaged = new Map(); // road hero -> melee enemies it holds this step (block limit)
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.held = false;
      enemy.slow = Math.max(0, enemy.slow - dt);
      enemy.chill = Math.max(0, (enemy.chill ?? 0) - dt);
      if ((enemy.burnUntil ?? 0) > this.time) this.hit(enemy, enemy.burnDps * dt, enemy.burnBy, { showShot: false, showHit: false, dot: true });
      if (!enemy.dead && (enemy.poisonUntil ?? 0) > this.time) this.hit(enemy, enemy.poisonDps * dt, enemy.poisonBy, { showShot: false, showHit: false, dot: true });
      if (enemy.dead) continue;
      if (enemy.stationary) { this.stepGod(enemy, dt); continue; } // the god never walks, blocks or leaks
      enemy.squeeze = Math.max(0, (enemy.squeeze ?? 0) - dt);
      if ((enemy.rallyUntil ?? 0) > this.time) this.resistCc(enemy, dt);
      // Petrification and stuns stop movement and attacks; simulation time still advances.
      if ((enemy.petrifiedUntil ?? 0) > this.time || (enemy.stunnedUntil ?? 0) > this.time) continue;
      this.enemyTraits(enemy, dt);
      const boost = enemy.kind === "boss" ? this.bossBoost(enemy) : NO_BOOST;
      const target = enemy.flying || (enemy.burrowedUntil ?? 0) > this.time ? null : this.findEnemyTarget(enemy); // a burrowed enemy walks under its blockers
      const leap = this.tuning.enemies[enemy.kind]?.leap;
      if (target && leap && !enemy.leaped) {
        // Jaguar: bounds over the first blocker it meets, once, and runs on.
        enemy.leaped = true;
        enemy.held = false;
        enemy.distance += leap.distance;
        const lane = this.laneOf(enemy);
        const point = pointOnPath(lane.path, Math.min(enemy.distance, lane.total), enemy.sway);
        this.emit({ type: "splash", x: enemy.x, y: enemy.y, radius: 34, life: 0.35, color: "gold" });
        enemy.x = point.x; enemy.y = point.y;
        continue;
      }
      if (target) {
        const ranged = this.shootsFromRange(enemy);
        enemy.held = !ranged; // stopped by a blocker (melee contact)
        // Ranged enemies hold position for holdSeconds, then close in (no endless standoff
        // against a healed blocker nobody else can reach).
        if (ranged) enemy.rangedTime = (enemy.rangedTime ?? 0) + dt;
        if (target.slotType === "platform") target.aimedAt = this.time; // renderer: target warning
        enemy.attackClock -= dt;
        if (enemy.attackClock <= 0) {
          // A veiled Assassin keeps holding its enemy, but nothing can hurt it.
          if (!this.isVeiled(target)) {
            const reach = target.slotType === "platform" ? enemy.platformAttack ?? 1 : 1; // archers hit platforms softer
            const taken = resolveDamage(enemy.attack * reach * (1 + boost.attack), target.armor, "physical") * (1 - this.guardFor(target));
            this.damageHero(target, taken, enemy);
            this.emit({ type: "shot", x1: enemy.x, y1: enemy.y, x2: target.x, y2: target.y, life: 0.12, color: "red" });
          }
          enemy.attackClock = (enemy.attackPeriod || 0.9) / this.childFrenzy(enemy) / (1 + boost.attackSpeed);
        }
      } else {
        // Walking past a full blocker costs time: a milder slow (passSlowFactor) for passSlow
        // seconds, separate from skill slows; the stronger of the two applies.
        const blocking = this.tuning.blocking ?? {};
        if (enemy.brushed) enemy.squeeze = Math.max(enemy.squeeze, blocking.passSlow || 0);
        const tidal = this.hasBoon("tidal_pull") && this.isWet(enemy) ? this.hasBoon("tidal_pull").slow : 1;
        const pace = Math.min(enemy.slow > 0 ? (enemy.slowFactor ?? 0.55) : 1, enemy.squeeze > 0 ? blocking.passSlowFactor ?? 1 : 1, enemy.chill > 0 ? enemy.chillFactor : 1) * tidal;
        enemy.distance += enemy.speed * pace * (1 + boost.speed) * dt;
        const lane = this.laneOf(enemy);
        const point = pointOnPath(lane.path, enemy.distance, enemy.sway);
        enemy.x = point.x; enemy.y = point.y;
        if (enemy.distance >= lane.total) {
          enemy.dead = true;
          const previousLives = this.lives;
          if (!this.difficulty.invincible && !this.shielded()) this.lives = Math.max(0, this.lives - enemy.damage);
          else if (this.shielded() && this.map.base) this.emit({ type: "shieldBlock", x: this.map.base.x, y: this.map.base.y, life: 0.8 });
          if (this.map.base) {
            enemy.exitReason = "base";
            // Emit before finish: the final breach must still reach the renderer/audio.
            this.emit({ type: "baseHit", enemyId: enemy.entityId, damage: previousLives - this.lives,
              x: this.map.base.x, y: this.map.base.y, life: 0.65, color: "red" });
          }
          if (this.stageStats) {
            this.stageStats.leaks += 1;
            this.stageStats.leakKinds[enemy.kind] = (this.stageStats.leakKinds[enemy.kind] || 0) + (previousLives - this.lives || enemy.damage || 1);
          }
          this.leakKinds[enemy.kind] = (this.leakKinds[enemy.kind] || 0) + (enemy.damage || 1);
          this.totalLeaks += 1;
          if (!enemy.parentId) this.enemiesDown += 1;
          this.onChange("leak", this);
          if (this.lives === 0) this.finish(false);
        }
      }
    }

    if (this.complete) return; // the last life was lost this step: heroes stand down

    // Ground zones (Hephaestus' Molten Ground): damage per second and a slow while enemies stand in them.
    this.zones = (this.zones ?? []).filter((z) => z.until > this.time);
    for (const z of this.zones) {
      for (const e of this.enemies) {
        if (e.dead || e.untargetable || e.flying || !this.nearPoint(z, e, z.radius)) continue;
        e.slow = Math.max(e.slow, 0.25);
        this.hit(e, z.dps * dt, z.hero, { showShot: false, showHit: false, dot: true });
      }
    }

    for (const hero of this.heroes) {
      if (this.isHexed(hero) || this.isSilenced(hero)) continue; // Hexer or Baphomet: no attacks, ultimate charge paused
      if (this.isRooted(hero)) { hero.ultClock += dt; continue; } // Vinebinder: cannot attack, still blocks, charge keeps running
      hero.attackClock -= dt;
      hero.ultClock += dt;
      const target = this.findTarget(hero);
      this.faceTarget(hero, target);
      if (hero.attackClock <= 0 && this.basicAttack(hero, target)) {
        hero.attackClock = 1 / (hero.aps * (1 + (this.classBonus(hero).aps || 0) + (this.ringFx(hero)?.aps || 0) + this.rapidFx(hero).aps) * this.environment("aps", hero) * this.sporeFactor(hero));
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
    if (this.running && !this.god && !this.spawnQueue.length && !this.enemies.length) {
      this.running = false;
      // Insight: every class that stood on the field at the end counts once, fallen heroes included.
      const classes = [...this.heroes.map((hero) => hero.class), ...this.fallenHeroes.map((entry) => this.heroesById.get(entry.id)?.class)].filter(Boolean);
      for (const cls of classes) (this.insightLog[cls] ||= { stages: 0, kills: 0 }).stages = 1;
      this.finish(true);
    }
  }

  // Divine Interventions (tuning.interventions, TOWER_DEFENSE_GAMEPLAY_IDEAS.md B2): player
  // powers that charge during the stage (one point per second plus `killCharge` per kill) and
  // are ready at `charge` points. Thunderfall strikes a spot after `delay` seconds for a share
  // of every enemy's health there; Shield of the Crossing makes leaks cost no lives for
  // `seconds`, then a `cooldownSeconds` pause.
  interventionState(id) {
    const cfg = this.tuning.interventions?.[id];
    const state = this.interventions?.[id];
    if (!cfg || !state) return null;
    const cooling = id === "shield" && this.time < this.shieldReadyAt;
    const max = this.interventionMax(id);
    return { charge: state.charge, max, ready: this.running && !this.complete && state.charge >= max && !cooling, cooling };
  }

  // Charge a power needs: its tuned `charge`, lowered by the blessing tree (R5: Storm Caller,
  // Bulwark Vigil), at least a quarter of the base.
  interventionMax(id) {
    const base = this.tuning.interventions[id].charge;
    const cut = id === "thunderfall" ? this.favor.thunderCharge : id === "shield" ? this.favor.shieldCharge : 0;
    return base * Math.max(0.25, 1 - (cut || 0));
  }

  stepInterventions(dt) {
    for (const [id, state] of Object.entries(this.interventions ?? {})) state.charge = Math.min(this.interventionMax(id), state.charge + dt);
    if (!this.strikes?.length) return;
    const due = this.strikes.filter((strike) => strike.at <= this.time);
    this.strikes = this.strikes.filter((strike) => strike.at > this.time);
    for (const strike of due) this.thunderStrike(strike);
  }

  chargeInterventionsOnKill() {
    for (const [id, state] of Object.entries(this.interventions ?? {})) {
      const cfg = this.tuning.interventions[id];
      state.charge = Math.min(this.interventionMax(id), state.charge + (cfg.killCharge || 0));
    }
  }

  shielded() {
    return this.time < (this.shieldUntil || 0);
  }

  // Tap a spot: the bolt lands `delay` seconds later on the cells around it (nearPoint).
  castThunderfall(x, y) {
    if (!this.interventionState("thunderfall")?.ready) return false;
    const cfg = this.tuning.interventions.thunderfall;
    this.interventions.thunderfall.charge = 0;
    this.interventionsUsed += 1;
    this.strikes.push({ x, y, at: this.time + cfg.delay });
    // R5: the target tiles pulse until the bolt lands (render.js thunderWarn).
    this.emit({ type: "thunderWarn", x, y, radius: this.thunderRadius(), area: this.thunderArea(x, y), life: cfg.delay });
    this.onChange("intervention", this);
    return true;
  }

  thunderStrike({ x, y }) {
    const cfg = this.tuning.interventions.thunderfall;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.untargetable || !this.inThunderArea({ x, y }, enemy)) continue;
      // True damage: a share of the enemy's health, smaller for bosses; shields absorb first.
      const before = enemy.hp;
      enemy.hp -= this.absorbShield(enemy, enemy.maxHp * (enemy.kind === "boss" ? cfg.bossShare : cfg.share));
      const dealt = Math.max(0, before - Math.max(0, enemy.hp));
      if (dealt > 0) this.emit({ type: "damageNumber", enemyId: enemy.entityId, enemyKind: enemy.kind, x: enemy.x, y: enemy.y, flying: enemy.flying, amount: dealt, life: 0.75 });
      if (enemy.hp <= 0) this.killEnemy(enemy, null);
    }
    this.emit({ type: "thunderStrike", x, y, radius: this.thunderRadius(), area: this.thunderArea(x, y), life: 0.7 });
  }

  // Thunderfall area (R5): a 3 x 3 block on boards, widened by Wrath of the Sky to 13 and then
  // 17 tiles; on classic maps a circle growing by a third per level.
  thunderPattern() {
    return ["block", "blockPlus", "star3"][Math.min(2, this.favor.thunderArea || 0)];
  }

  thunderRadius() {
    return this.tuning.interventions.thunderfall.radius * (1 + (this.favor.thunderArea || 0) / 3);
  }

  inThunderArea(point, enemy) {
    const board = this.boardRules && boardOf(this.map);
    if (!board) return Math.hypot(point.x - enemy.x, point.y - enemy.y) <= this.thunderRadius();
    return inPattern(board, this.thunderPattern(), point.x, point.y, enemy.x, enemy.y);
  }

  // The cells Thunderfall covers around a point ({ cell, cells: [[x, y] top-left] }), for the
  // renderer's preview, warning and flash; null off boards.
  thunderArea(x, y) {
    const board = this.boardRules && boardOf(this.map);
    if (!board) return null;
    const [c, r] = cellAt(board, x, y);
    const cells = (PATTERNS[this.thunderPattern()] ?? [])
      .map(([dc, dr]) => [c + dc, r + dr])
      .filter(([cc, rr]) => cc >= 0 && rr >= 0 && cc < board.cols && rr < board.rows)
      .map(([cc, rr]) => [board.origin[0] + cc * board.cell, board.origin[1] + rr * board.cell]);
    return { cell: board.cell, cells };
  }

  castShield() {
    if (!this.interventionState("shield")?.ready) return false;
    const cfg = this.tuning.interventions.shield;
    this.interventions.shield.charge = 0;
    this.interventionsUsed += 1;
    const seconds = cfg.seconds + (this.favor.shieldSeconds || 0); // Long Vigil (R5)
    this.shieldUntil = this.time + seconds;
    this.shieldReadyAt = this.time + seconds + (cfg.cooldownSeconds ?? 60);
    // R5: a dome over the base for as long as the Shield holds (render.js shieldUp).
    if (this.map.base) this.emit({ type: "shieldUp", x: this.map.base.x, y: this.map.base.y, radius: 70, life: seconds });
    this.onChange("intervention", this);
    return true;
  }

  // Regular enemies still on the field (not bosses, not a boss's children): the boss waits for them.
  fieldHasMinions() {
    return this.enemies.some((enemy) => !enemy.dead && enemy.kind !== "boss" && !enemy.parentId);
  }

  laneOf(enemy) {
    return this.lanes[enemy.lane] ?? this.lanes[0];
  }

  spawnEnemy(kind, { distance = 0, statScale = 1, lane = 0, sway = 0, extra = null } = {}) {
    let base = this.tuning.enemies[kind];
    if (kind === "boss" && this.bossTuning?.stats) base = { ...base, ...this.bossTuning.stats };
    const scale = this.difficulty.enemyHp * this.tierHp * statScale * this.environment("enemyHp");
    const point = pointOnPath((this.lanes[lane] ?? this.lanes[0]).path, distance, sway);
    const favorSpeed = this.time < (this.tuning.timeline?.openingSeconds ?? 30) && this.favor.openingSpeedDebuff ? 1 - this.favor.openingSpeedDebuff : 1; // the opening of the stage
    const speed = base.speed * favorSpeed * this.difficulty.enemySpeed * this.environment("enemySpeed", null, kind);
    const enemy = { ...base, speed, statScale, entityId: this.entityId++, kind, maxHp: base.hp * scale, hp: base.hp * scale, attack: (base.attack || 0) * statScale * this.tierAttack * this.atkScale, magicRes: base.magicRes ?? base.armor * 0.8, distance, lane, sway, x: point.x, y: point.y, dead: false, slow: 0, attackClock: 0, ...extra };
    // Enemy shape: timeline enemies (not bosses, not summoned children) carry the
    // health, gold, attack and leak damage of the enemies the shape removed.
    const shape = this.enemyShape(kind);
    if (shape && kind !== "boss" && !extra) {
      enemy.maxHp *= shape.hp; enemy.hp *= shape.hp;
      enemy.reward = (enemy.reward || 0) * shape.reward;
      enemy.attack *= shape.attack;
      enemy.damage = Math.max(1, Math.round((enemy.damage || 1) * shape.leak)); // whole lives (flyers 2.5 -> 3)
    }
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
    const reach = melee ? (this.tuning.blocking?.contactRange ?? 42) + (this.favor.contactRangeBonus || 0) : enemy.attackRange;
    const limits = this.tuning.blocking?.blockLimit;
    let best = null;
    enemy.brushed = false;
    for (const hero of this.heroes) {
      if (hero.slotType !== "road" || hero.hpLeft <= 0) continue;
      const distance = Math.hypot(hero.x - enemy.x, hero.y - enemy.y);
      // Block limit: a blocker that already holds its share lets further melee enemies walk
      // past, but they brush against it (step() slows them, tuning.blocking.passSlow).
      const limit = melee && limits?.[hero.class] !== undefined ? limits[hero.class] + (this.classBonus(hero).blockLimit || 0) : undefined;
      if (limit !== undefined && (this.engaged?.get(hero) || 0) >= limit) {
        if (distance <= reach) enemy.brushed = true;
        continue;
      }
      if (distance <= reach && (!best || distance < best.distance)) best = { hero, distance };
    }
    // Enemy archers (targetsPlatforms, M24 trial): with no road hero in reach they shoot the
    // nearest platform hero in range instead. Only while shooting from range; contact stays road.
    if (!best && !melee && enemy.targetsPlatforms) {
      for (const hero of this.heroes) {
        if (hero.slotType !== "platform" || hero.hpLeft <= 0) continue;
        const distance = Math.hypot(hero.x - enemy.x, hero.y - enemy.y);
        if (distance <= reach && (!best || distance < best.distance)) best = { hero, distance };
      }
    }
    if (best && melee && this.engaged) this.engaged.set(best.hero, (this.engaged.get(best.hero) || 0) + 1);
    enemy.heldBy = best && melee ? best.hero : null;
    return best?.hero ?? null;
  }

  // Heal share of an ultimate; Support class blessings raise it.
  healFraction(hero) {
    return this.support.healFraction * (1 + (this.classBonus(hero).support || 0));
  }

  supportAuraFor(hero) {
    // Passive local aura: allies inside a support's range gain attack. Does not stack.
    for (const support of this.heroes) {
      if (support.ability !== "aura" || support === hero) continue;
      if (this.inReach(support, hero)) return { source: support, bonus: this.support.passiveAuraBonus * (1 + (this.classBonus(support).support || 0)) };
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
    return hero.atk * (1 + (this.classBonus(hero).atk || 0)) * (aura ? 1 + aura.bonus : 1) * ultBuff * (1 + synBonus) * (1 + (this.bondFx(hero).atk || 0)) * (1 + (this.ringFx(hero)?.atk || 0)) * rally * (1 + this.rapidFx(hero).atk) * this.environment("attack", hero) * (1 + (this.lordFx(hero).atk || 0)) * (1 + (this.lordFx(hero).dmg || 0));
  }

  // Rapid fire (Atalanta's awakened Burning Volley): faster, harder shots for a few seconds.
  rapidFx(hero) {
    return this.time < (hero.rapidUntil || 0) ? hero.rapid : { aps: 0, atk: 0 };
  }

  damageHero(hero, amount, source) {
    if (amount <= 0 || this.isVeiled(hero)) return;
    if (this.time < (hero.wardUntil || 0)) { // Gaia's Rooted Sanctuary, Heimdall's Bifrost Ward
      amount *= 1 - hero.wardCut;
      if (hero.wardFx === "bifrost") this.emit({ type: "wardhit", heroId: "heimdall", x: hero.x, y: hero.y - 8, life: 0.3 });
    }
    amount /= 1 + (this.lordFx(hero).hp || 0); // a Lord's faction: +% basic attributes
    hero.hpLeft -= amount;
    hero._hitFlash = true;
    if (hero.hpLeft <= 0) {
      const rally = this.boons?.length && hero.slotType === "road" ? this.hasBoon("rally") : null;
      if (rally) this.rallyUntil = this.time + rally.seconds;
      this.fallenHeroes.push({ id: hero.id, slotType: hero.slotType, slotIndex: hero.slotIndex, targeting: hero.targeting });
      this.heroes = this.heroes.filter((entry) => entry !== hero);
      this.team = this.team.filter((id) => id !== hero.id);
      if (this.stageStats) this.stageStats.heroDeaths += 1;
      this.onChange("death", this);
    }
  }

  // Ultimate target: normally the attack target. Nott's Shadow Step phases to the
  // lowest-HP reachable enemy anywhere on the map (road heroes still cannot hit flyers).
  findUltTarget(hero, attackTarget = this.findTarget(hero)) {
    if (hero.variant !== "shadow_step") return attackTarget;
    const alive = this.enemies.filter((e) => this.canHit(hero, e));
    alive.sort((a, b) => a.hp - b.hp);
    return alive[0] ?? null;
  }

  // Heroes allowed on the field at once. A restricted roster (Campaign squad, Daily Trial,
  // Expedition) can field every hero in it; only an open roster uses tuning.run.deployCap.
  deployCap() {
    return this.allowedHeroes ? this.allowedHeroes.size : this.tuning.run.deployCap ?? Infinity;
  }

  // Removes and returns the newest fallen entry that can be revived, or null.
  takeRevivableFallen() {
    if (this.heroes.length >= this.deployCap()) return null;
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

  // The attack pattern a hero ({ id, class, reachSteps }) has on a tile: its signature or
  // class pattern, +1 step on high ground, -1 in an environment that cuts platform range
  // (Stormpeak) unless high ground shelters it, plus permanent reach steps (`reachSteps`,
  // upgrades outside battle). Null off the board.
  patternAt(hero, slotType, slotIndex) {
    const base = patternFor(this.boardRules, hero.class, hero.id);
    const reachSteps = hero.reachSteps ?? 0;
    if (!base) return null;
    const ring = this.ringKind(slotType, slotIndex);
    const env = this.environment("range", { slotType, slotIndex });
    const windowReach = this.time < (hero.win?.until ?? 0) ? hero.win.reach ?? 0 : 0; // ult window (Limitless Shots)
    const steps = (ring === "highground" ? 1 : 0) + (env < 1 - 1e-9 ? -1 : 0) + reachSteps + windowReach;
    return steppedPattern(base, steps);
  }

  patternOf(hero) {
    return this.patternAt(hero, hero.slotType, hero.slotIndex);
  }

  // Lives per shown life on boards (tuning.board.lifeUnit); 1 elsewhere.
  get lifeUnit() {
    return this.boardRules?.lifeUnit ?? 1;
  }

  // Whether a hero's own reach covers another unit (ally or enemy): pattern cells on a board,
  // the range circle elsewhere. Ultimates, heals and auras use it for "in range".
  inReach(hero, unit) {
    const pattern = this.patternOf(hero);
    const board = pattern && boardOf(this.map);
    return board ? unitInPattern(board, pattern, hero.x, hero.y, unit) : Math.hypot(hero.x - unit.x, hero.y - unit.y) <= hero.range;
  }

  // Ultimate areas around the hero (pattern-shaped ultimates): on a board the hero's pattern
  // `steps` up the ladder, elsewhere a circle of `scale` x range. Areas sized as a multiple of
  // the range (taunts 1.8x, Heimdall 2.5x) map to steps by area: 1.8x -> 2, 2.5x -> 3, 3.5x -> 4.
  inUltArea(hero, unit, scale = 1) {
    const pattern = this.patternOf(hero);
    const board = pattern && boardOf(this.map);
    if (!board) return Math.hypot(hero.x - unit.x, hero.y - unit.y) <= hero.range * scale;
    const steps = scale >= 3.4 ? 4 : scale >= 2.4 ? 3 : scale >= 1.7 ? 2 : scale > 1 ? 1 : 0;
    return unitInPattern(board, steppedPattern(pattern, steps), hero.x, hero.y, unit);
  }

  // Close areas (cleaves, blasts around a target, bounces' splash) of `radius` px around a
  // point: on a board a plus of cells around the point's cell (radius up to 80 px) or a
  // 3 x 3 block (larger), elsewhere the circle.
  nearPoint(point, unit, radius) {
    const board = this.boardRules && boardOf(this.map);
    if (!board) return Math.hypot(point.x - unit.x, point.y - unit.y) <= radius;
    return unitInPattern(board, radius <= 80 ? "plus" : "block", point.x, point.y, unit);
  }

  reaches(hero, enemy, distance = Math.hypot(hero.x - enemy.x, hero.y - enemy.y)) {
    const pattern = this.patternOf(hero);
    const board = pattern && boardOf(this.map);
    if (board) return unitInPattern(board, pattern, hero.x, hero.y, enemy);
    // Beam heroes only see their own row, to either side.
    return hero.variant === "sun_beam" ? this.onBeam(hero, enemy, enemy.x < hero.x ? -1 : 1) : distance <= hero.range;
  }

  findTarget(hero) {
    if ((hero.targeting ?? "auto") !== "auto") {
      // A chosen priority ranks everything the hero can reach: its range, plus loose
      // enemies that have passed it and remain inside the Assassin dash reach.
      const targets = this.enemies.filter((enemy) => {
        if (!this.canHit(hero, enemy)) return false;
        const d = Math.hypot(hero.x - enemy.x, hero.y - enemy.y);
        return this.reaches(hero, enemy, d) || this.canDashTo(hero, enemy, d);
      });
      targets.sort(this.targetOrder(hero));
      return targets[0] ?? null;
    }
    const loose = this.dashTarget(hero);
    if (loose) return loose;
    if (hero.variant === "shadow_step") {
      const alive = this.enemies.filter((e) => this.canHit(hero, e) && this.reaches(hero, e));
      alive.sort((a, b) => a.hp - b.hp);
      return alive[0] ?? null;
    }
    // Melee heroes on the road cannot reach flyers; platform coverage is required.
    const targets = this.enemies.filter((enemy) => this.canHit(hero, enemy) && this.reaches(hero, enemy));
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
      case "first": return (a, b) => this.progress(b) - this.progress(a);
      case "last": return (a, b) => this.progress(a) - this.progress(b);
      case "strongest": return (a, b) => b.hp - a.hp || this.progress(b) - this.progress(a);
      case "weakest": return (a, b) => a.hp - b.hp || this.progress(b) - this.progress(a);
      case "fastest": return (a, b) => b.speed - a.speed || this.progress(b) - this.progress(a);
      case "ground": return prefer((e) => (e.flying ? 0 : 1));
      case "flying": return prefer((e) => (e.flying ? 1 : 0));
      case "boss": return prefer((e) => (e.kind === "boss" ? 1 : 0));
      // Flyers skip blockers, so only platform heroes can stop them: by default those shoot a flyer
      // in reach first (owner playtest, Oct 5: platform heroes ignored them while brutes soaked fire).
      default: return hero.slotType === "platform" ? prefer((e) => (e.flying ? 1 : 0)) : classOrder;
    }
  }

  classTargetOrder(hero) {
    if (hero.ability === "execute") return (a, b) => a.hp - b.hp;
    if (this.kit(hero).target === "strongest") return (a, b) => b.hp - a.hp || this.progress(b) - this.progress(a);
    return (a, b) => this.progress(b) - this.progress(a);
  }

  // Assassin leak catcher (kit dash): a moving enemy that has already passed the Assassin,
  // no blocker holds and remains within dash reach. Approaching enemies must enter melee.
  // How far along an enemy is, as minus the distance still to go to the base: comparable
  // across lanes of different length (three-gate boards), and on equal lanes the same order
  // as distance walked.
  progress(enemy) {
    return enemy.distance - this.laneOf(enemy).total;
  }

  dashTarget(hero) {
    let best = null;
    for (const enemy of this.enemies) {
      if (!this.canDashTo(hero, enemy)) continue;
      if (!best || this.progress(enemy) > this.progress(best)) best = enemy;
    }
    return best;
  }

  canDashTo(hero, enemy, distance = Math.hypot(hero.x - enemy.x, hero.y - enemy.y)) {
    const reach = this.dashReach(hero);
    if (!reach || distance > reach || enemy.held || this.isStopped(enemy) || !this.canHit(hero, enemy)) return false;
    const lane = this.laneOf(enemy);
    const next = pointOnPath(lane.path, Math.min(lane.total, enemy.distance + 4), enemy.sway);
    return Math.hypot(hero.x - next.x, hero.y - next.y) > distance;
  }

  dashReach(hero) {
    const dash = this.kit(hero).dash;
    return dash ? dash + (this.classBonus(hero).dash || 0) : 0;
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
    return Math.min(0.9, (this.kit(hero).guard || 0) + (this.classBonus(hero).guard || 0) + (this.bondFx(hero).guard || 0));
  }

  // Pantheon bonds (bonds.js) among the heroes standing on the field; `members` holds their
  // entity ids.
  bonds() {
    const alive = this.heroes.filter((hero) => hero.hpLeft > 0);
    return bondsOf(this.tuning.bonds, alive)
      .map((bond) => ({ ...bond, members: new Set([...bond.members].map((i) => alive[i].entityId)) }));
  }

  // The bond effects on one hero ({ atk, guard, ultCharge, heal } shares), empty when none.
  bondFx(hero) {
    if (!hero || !this.tuning.bonds) return {};
    const bond = this.bonds().find((b) => b.tier && b.members.has(hero.entityId));
    return bond?.tier ?? {};
  }

  // Lords belong to selected squad rows, not battlefield entities. Their row effect remains active
  // before deployment and after sale or death. A hero must both occupy that row and match its group.
  lordRows() {
    return this.squadRows.flatMap((heroIds, rowIndex) => {
      const lordId = heroIds.find((id) => this.tuning.lords?.[id]);
      if (!lordId) return [];
      const cfg = this.tuning.lords[lordId];
      return [{ rowIndex, lordId, groupId: cfg.groupId, heroIds }];
    });
  }

  lordRowFor(hero) {
    if (!hero) return null;
    return this.lordRows().find((row) => row.heroIds.includes(hero.id) && hero.mythologyGroups?.includes(row.groupId)) ?? null;
  }

  // Returns { atk, hp, dmg, heal, lord } for a matching hero in its selected Lord row.
  lordFx(hero) {
    const row = this.lordRowFor(hero);
    if (!row) return {};
    const cfg = this.tuning.lords[row.lordId];
    const live = this.time < (this.lordStates[row.lordId]?.buffUntil ?? 0);
    return { atk: cfg.attrBonus || 0, hp: cfg.attrBonus || 0,
      dmg: live ? cfg.buff?.dmg || 0 : 0, heal: live ? cfg.buff?.heal || 0 : 0, lord: row.lordId };
  }

  // Matching selected teammates besides the Lord shorten the periodic interval, deployed or not.
  lordFactionCount(lordId) {
    const row = this.lordRows().find((entry) => entry.lordId === lordId);
    if (!row) return 0;
    return row.heroIds.filter((id) => id !== lordId && this.heroesById.get(id)?.mythologyGroups?.includes(row.groupId)).length;
  }

  lordInterval(lordId) {
    const buff = this.tuning.lords?.[lordId]?.buff;
    if (!buff) return Infinity;
    return Math.max(buff.minInterval ?? 0, buff.baseInterval - buff.perMember * this.lordFactionCount(lordId));
  }

  stepLords(dt) {
    for (const row of this.lordRows()) {
      const cfg = this.tuning.lords[row.lordId];
      const state = this.lordStates[row.lordId] ??= { clock: 0, buffUntil: 0 };
      if (this.time < state.buffUntil) continue;
      state.clock += dt;
      if (state.clock < this.lordInterval(row.lordId)) continue;
      state.clock = 0;
      state.buffUntil = this.time + cfg.buff.seconds;
      for (const ally of this.heroes) if (this.lordRowFor(ally)?.lordId === row.lordId) {
        this.emitHeroEffect(ally, { type: "buff", x: ally.x, y: ally.y, life: 0.6, color: "gold" });
      }
    }
  }

  // After the Lord's direct damage: one struck enemy takes extra damage from her faction for a while.
  lordMark(lord, enemy) {
    const mark = this.tuning.lords?.[lord.id]?.mark;
    const row = this.lordRows().find((entry) => entry.lordId === lord.id && entry.heroIds.includes(lord.id));
    if (!mark || !row || !enemy || enemy.dead) return;
    enemy.lordMarkUntil = this.time + mark.seconds;
    enemy.lordMarkBonus = mark.bonus;
    enemy.lordMarkBy = lord.id;
  }

  // Beam heroes (Isis): shots travel along the hero's row only, to the left or the right.
  // A unit is on the beam when it stands on that row (a board cell row, elsewhere a band of
  // `rowTolerance` px) on the chosen side (dir -1 or 1; the hero's own cell counts for both).
  onBeam(hero, enemy, dir) {
    const board = boardOf(this.map);
    const pattern = this.patternOf(hero);
    if (board && pattern) {
      const [hc, hr] = cellAt(board, hero.x, hero.y);
      const [c, r] = cellAt(board, enemy.x, enemy.y);
      return r === hr && (c - hc) * dir >= 0 && inPattern(board, pattern, hero.x, hero.y, enemy.x, enemy.y);
    }
    const tolerance = this.tuning.heroSkills?.[hero.id]?.rowTolerance ?? 24;
    const dx = (enemy.x - hero.x) * dir;
    return Math.abs(enemy.y - hero.y) <= tolerance && dx >= -tolerance && dx <= hero.range;
  }

  // Enemies on the beam, nearest to the hero first.
  beamLine(hero, enemies, dir) {
    return enemies.filter((e) => this.canHit(hero, e) && this.onBeam(hero, e, dir)).sort((a, b) => Math.abs(a.x - hero.x) - Math.abs(b.x - hero.x));
  }

  // Which way the beam goes: toward the side with more enemies on the row, the target's side on a tie.
  beamDirection(hero, enemies, target) {
    const side = (dir) => this.beamLine(hero, enemies, dir).filter((e) => (e.x - hero.x) * dir > 1).length;
    const left = side(-1), right = side(1);
    if (left !== right) return left > right ? -1 : 1;
    return target && target.x < hero.x ? -1 : 1;
  }

  // How far the beam reaches in px: the pattern's cells on a board, the range elsewhere.
  beamLength(hero) {
    const board = boardOf(this.map);
    const pattern = this.patternOf(hero);
    if (board && pattern) return Math.max(...PATTERNS[pattern].map(([dc]) => Math.abs(dc))) * board.cell + board.cell / 2;
    return hero.range;
  }

  isStopped(enemy) {
    return (enemy.petrifiedUntil ?? 0) > this.time || (enemy.stunnedUntil ?? 0) > this.time;
  }

  isVeiled(hero) {
    return (hero?.veilUntil ?? 0) > this.time;
  }

  // Focus (Mage kit `focus`, enemy shape prototype): splash or chain shares that find no
  // other enemy fold into the main target, so a Mage facing a lone strong enemy keeps most
  // of its damage. `slots` splash neighbours are expected; each missing one adds
  // `splash.share * share`. A chaining Mage adds its unused bounce shares the same way.
  focusShare(hero, kit, others) {
    const focus = kit.focus;
    if (!focus) return 0;
    const chainer = hero.basic === "chain" && !!kit.chain;
    if (chainer) {
      const falloff = kit.chain.falloff;
      const reach = kit.chain.reach;
      const found = others(reach).length;
      return falloff.slice(found).reduce((sum, share) => sum + share, 0) * (focus.share ?? 1);
    }
    if (!kit.splash) return 0;
    const missing = Math.max(0, (focus.slots ?? 2) - others(this.splashRadius(hero)).length);
    return missing * kit.splash.share * (focus.share ?? 1);
  }

  // One basic attack, shaped by the class kit (tuning.classes, M6). Returns false when
  // the hero had nothing to do, so its attack timer stays ready.
  //   Support: heals the most injured ally in range, else a weak attack (damageShare).
  //   Mage: splash around the target, or a chain (hero skill basic "chain", Odin).
  //   Warrior: cleaves up to `targets` enemies next to the target.
  //   Archer: pierces a share of armor or magic resistance.
  //   Assassin: dashes to loose enemies; while veiled strikes extra enemies too.
  basicAttack(hero, target) {
    const kit = this.kit(hero);
    const cb = this.classBonus(hero);
    if (cb.purify) this.purify(hero);
    if (kit.heal && this.healPulse(hero, kit, cb)) return true;
    if (!target) return false;
    const crit = this.rng() < hero.critChance + (cb.crit || 0);
    const pierce = this.pierceFor(hero);
    const value = this.attackValue(hero);
    // Archer anti-air (kit airBonus). Assassins hunt enemies nobody holds (kit looseBonus),
    // scaled by (speed / kit.looseSpeed) squared, so runners take the full bonus and slow
    // walkers little of it.
    const chainer = hero.basic === "chain" && !!kit.chain;
    const strike = (enemy, share, opts = {}) => {
      const shred = (enemy.sunderUntil ?? 0) > this.time ? enemy.sunder : 0;
      const resistance = (hero.damageType === "magical" ? enemy.magicRes : enemy.armor) * (1 - pierce) * (1 - shred);
      const loose = kit.looseBonus && !enemy.held ? kit.looseBonus * (kit.looseSpeed ? Math.min(1, enemy.speed / kit.looseSpeed) ** 2 : 1) : 0;
      const conducts = chainer && this.isWet(enemy) ? 1 + (this.statusCfg()?.reactions?.conduct?.bonus || 0) : 1;
      const bonus = (1 + (enemy.flying ? kit.airBonus || 0 : 0) + loose) * conducts;
      const dealt = this.hit(enemy, resolveDamage(value * share * bonus, resistance, hero.damageType, crit), hero, { crit, ...opts }) || 0;
      this.onStrike(hero, enemy, dealt);
      return dealt;
    };
    if (kit.dash && !this.inReach(hero, target)) {
      this.emitHeroEffect(hero, { type: "dash", x1: hero.x, y1: hero.y, x2: target.x, y2: target.y, life: 0.3, color: "purple" });
    }
    const others = (radius) => this.enemies
      .filter((e) => e !== target && this.canHit(hero, e) && Math.hypot(target.x - e.x, target.y - e.y) <= radius)
      .sort((a, b) => Math.hypot(target.x - a.x, target.y - a.y) - Math.hypot(target.x - b.x, target.y - b.y));
    const beam = hero.basic === "beam";
    strike(target, (kit.damageShare ?? 1) + (beam ? 0 : this.focusShare(hero, kit, others)), beam ? { showShot: false } : {});
    if (beam) {
      // Isis: the shot is a horizontal beam that strikes every enemy on her row on that side
      // (nearest first, up to `targets`), the target in full and the rest for the splash share.
      const dir = target.x < hero.x ? -1 : 1;
      const skill = this.tuning.heroSkills?.[hero.id];
      const line = [target, ...this.beamLine(hero, this.enemies, dir).filter((e) => e !== target)].slice(0, skill?.targets ?? 8);
      for (const e of line.slice(1)) strike(e, kit.splash?.share ?? 0.35, { showShot: false });
      this.emitHeroEffect(hero, { type: "shot", x1: hero.x, y1: hero.y, x2: hero.x + dir * this.beamLength(hero), y2: hero.y, life: 0.25, color: "gold", beam: true, beamDir: dir, beamLength: this.beamLength(hero) });
      this.lordMark(hero, target);
    }
    // Ult window (Atalanta, Vidar, Helios): every basic attack lands extra strikes on its target.
    const win = this.time < (hero.win?.until ?? 0) ? hero.win : null;
    if (win?.extra) {
      for (let i = 0; i < win.extra && !target.dead; i += 1) {
        const dealt = strike(target, win.share, { showShot: false, showHit: false });
        this.emitHeroEffect(hero, { type: "extra", x: target.x, y: target.y, index: i, count: win.extra, life: 0.3 });
        if (win.burnShare && !target.dead) this.applyBurn(target, hero, dealt * win.burnShare, win.burnSeconds ?? 5);
      }
    }
    let chain = hero.basic === "chain" && kit.chain ? { reach: kit.chain.reach, falloff: [...kit.chain.falloff] } : null;
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
    if (kit.splash && !beam && !(hero.basic === "chain" && kit.chain)) {
      const radius = this.splashRadius(hero);
      this.emitHeroEffect(hero, { type: "splash", x: target.x, y: target.y, radius, life: 0.35, color: "purple" });
      for (const e of others(radius)) strike(e, kit.splash.share, { showShot: false, showHit: false });
    } else if (kit.cleave) {
      const radius = kit.cleave.radius;
      const victims = others(radius).slice(0, kit.cleave.targets);
      this.emitHeroEffect(hero, { type: "cleave", x: target.x, y: target.y, radius, life: 0.3, color: "gold" });
      for (const e of victims) strike(e, this.cleaveShare(hero), { showShot: false, showHit: false });
    }
    if (kit.veil && this.isVeiled(hero)) {
      const extra = this.enemies.filter((e) => e !== target && this.canHit(hero, e) && Math.hypot(hero.x - e.x, hero.y - e.y) <= Math.max(hero.range, this.dashReach(hero)))
        .sort(this.targetOrder(hero)).slice(0, kit.veil.extraTargets);
      for (const e of extra) strike(e, 1);
    }
    return true;
  }

  onStrike(hero, enemy, dealt) {
    this.applyHeroStatus(hero, enemy, dealt);
  }

  // Status effects and reactions (M13, tuning.statuses). Heroes listed in `sources` apply
  // their status with every basic strike:
  //   wet: no effect alone; poison and burn: `share` of the hit again over `seconds`.
  // Reactions: Conduct (chain hits on Wet enemies), Steam (Burn meets Wet: burst),
  // Blight (Burn on a poisoned enemy spreads a stronger copy of its poison), Freeze (Chill meets Wet: stun),
  // Soul Harvest (poisoned enemies that die charge Thanatos's ultimate).
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
      this.addPlacement(reaper.placement);
      for (const h of this.heroes) h.ultClock += reaper.charge;
    }
  }

  // A Support class blessing can lift hexes from allies in range.
  purify(hero) {
    for (const ally of this.heroes) {
      if ((this.isHexed(ally) || this.isSilenced(ally)) && this.inReach(hero, ally)) {
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
      if (other.hpLeft >= other.hp || !this.inReach(hero, other)) continue;
      if (!ally || other.hpLeft / other.hp < ally.hpLeft / ally.hp) ally = other;
    }
    if (!ally) return false;
    const amount = this.attackValue(hero) * kit.heal * (1 + (cb.support || 0));
    this.healHero(ally, amount, hero);
    this.emitHeroEffect(hero, { type: "beam", x1: hero.x, y1: hero.y, x2: ally.x, y2: ally.y, life: 0.3, color: "green" });
    return true;
  }

  hit(enemy, amount, hero, { showShot = true, showHit = true, crit = false, dot = false } = {}) {
    if (enemy.dead || enemy.untargetable) return;
    const vuln = (enemy.exposed && enemy.exposed > this.time) ? 1.2 : 1;
    const held = enemy.held ? 1 + (this.tuning.blocking?.heldDamageBonus || 0) : 1;
    const bossHit = enemy.kind === "boss" ? 1 + (this.favor.bossDamage || 0) : 1;
    // Run blessings (M17): Venom Rot on poisoned enemies, Shattering Cold on frozen ones.
    const rot = this.boons.length && this.isPoisoned(enemy) ? 1 + (this.hasBoon("venom_rot")?.bonus || 0) : 1;
    const shatter = this.boons.length && (enemy.frozenUntil ?? 0) > this.time ? 1 + (this.hasBoon("shattering_cold")?.bonus || 0) : 1;
    const marked = hero?.entityId && (enemy.lordMarkUntil ?? 0) > this.time && this.lordFx(hero).lord === enemy.lordMarkBy ? 1 + (enemy.lordMarkBonus || 0) : 1;
    const before = enemy.hp;
    const shieldBefore = enemy.shield || 0;
    const stance = (enemy.stanceUntil ?? 0) > this.time ? 1 - (this.bossTuning?.stance?.reduction || 0) : 1;
    const resolve = enemy.resolveSteps ? 1 - enemy.resolveSteps * (this.bossTuning?.resolve?.reduction || 0) : 1;
    enemy.hp -= this.absorbShield(enemy, amount * vuln * held * bossHit * rot * shatter * stance * resolve * marked);
    if (enemy.kind === "boss" && this.bossTuning) this.bossOnHit(enemy, dot);
    if (enemy.parentId) this.shareDamage(enemy, Math.min(before, before - enemy.hp), hero);
    const burrow = this.tuning.enemies[enemy.kind]?.burrow;
    if (burrow && !dot && enemy.hp > 0 && this.time >= (enemy.burrowReadyAt ?? 0)) {
      // Burrower: dives for `seconds` after taking a hit (untargetable, walks under blockers), then must wait `cooldown`.
      enemy.untargetable = true;
      enemy.burrowedUntil = this.time + burrow.seconds;
      enemy.burrowReadyAt = enemy.burrowedUntil + burrow.cooldown;
      this.emit({ type: "splash", x: enemy.x, y: enemy.y, radius: 30, life: 0.4, color: "gold" });
    }
    if (showShot) this.emitHeroEffect(hero, { type: "shot", x1: hero.x, y1: hero.y, x2: enemy.x, y2: enemy.y, life: 0.12, color: hero.damageType === "magical" ? "purple" : "gold", heroVariant: hero.variant ?? null });
    if (showHit || crit) this.emitHeroEffect(hero, { type: "hit", x: enemy.x, y: enemy.y, life: 0.18, color: hero.damageType === "magical" ? "purple" : "gold", melee: hero.slotType === "road", crit, heroVariant: hero.variant ?? null });
    const dealt = Math.max(0, before - Math.max(0, enemy.hp));
    const shieldDealt = Math.max(0, shieldBefore - (enemy.shield || 0));
    if (dealt + shieldDealt > 0) this.emit({ type: "damageNumber", enemyId: enemy.entityId, enemyKind: enemy.kind,
      x: enemy.x, y: enemy.y, flying: enemy.flying, amount: dealt + shieldDealt, shielded: shieldDealt > 0, crit, dot, life: 0.75 });
    if (hero && dealt > 0) this.recordDamage(hero, enemy, dealt, dot);
    if (enemy.stationary) { // God-Mode: every point counts towards the score, the god itself never falls
      this.godDamage += dealt;
      this.score = Math.round(this.godDamage);
      enemy.hp = enemy.maxHp;
    }
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
    amount *= this.environment("heal", target) * (1 + (by?.entityId ? this.bondFx(by).heal || 0 : 0)) * (1 + (by?.entityId ? this.lordFx(by).heal || 0 : 0));
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
  //     and `total` over its life (a held Broodcaller must not feed a stage forever).
  //   hex (Hexer): stuns the nearest hero in range for `seconds`, every `every` seconds.
  enemyTraits(enemy, dt) {
    if (enemy.kind === "boss" && this.bossTuning) this.bossRules(enemy, dt);
    const cfg = this.tuning.enemies[enemy.kind];
    if (!cfg) return;
    if (cfg.burrow && enemy.burrowedUntil && this.time >= enemy.burrowedUntil) {
      enemy.untargetable = false;
      enemy.burrowedUntil = 0;
      this.emit({ type: "splash", x: enemy.x, y: enemy.y, radius: 30, life: 0.4, color: "gold" });
    }
    if (cfg.root && enemy.held && enemy.heldBy) {
      // Vinebinder: roots the road hero it is fighting every `every` seconds; the hero cannot attack for `seconds` but keeps blocking.
      enemy.rootClock = (enemy.rootClock ?? cfg.root.every * 0.5) - dt;
      if (enemy.rootClock <= 0 && !this.isVeiled(enemy.heldBy)) {
        enemy.rootClock = cfg.root.every;
        enemy.heldBy.rootedUntil = this.time + cfg.root.seconds;
        this.emit({ type: "hex", x1: enemy.x, y1: enemy.y, x2: enemy.heldBy.x, y2: enemy.heldBy.y, x: enemy.heldBy.x, y: enemy.heldBy.y, life: 0.5, color: "green" });
      }
    }
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
          this.spawnEnemy(cfg.summon.kind, { distance: enemy.distance + 12 * (i + 1), statScale: enemy.statScale ?? 1, lane: enemy.lane ?? 0, sway: this.formationSway(enemy.entityId + i), extra: { summonerId: enemy.entityId } });
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

  isRooted(hero) {
    return (hero?.rootedUntil ?? 0) > this.time;
  }

  // Sporeling clouds slow attack speed for a few seconds.
  sporeFactor(hero) {
    return (hero?.sporedUntil ?? 0) > this.time ? hero.sporeAps ?? 1 : 1;
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

  // Ochenta's rules, run on every hit he takes (after the damage, before a kill):
  //   finalEight: the first time he drops below `below` health he cannot fall below 1 HP for
  //     `seconds` and gains `attack`, `attackSpeed` and `speed` while it lasts.
  //   resolve: each threshold in `at` (health shares) he passes adds a permanent step of
  //     `attack`, `attackSpeed` and `reduction` (less damage taken).
  //   valor: every direct hit (not damage over time) adds 1 Valor; at `max` he releases the
  //     Eighty Count (eightyCount).
  bossOnHit(boss, dot) {
    const cfg = this.bossTuning;
    if (cfg.finalEight) {
      if (!boss.finalEightUntil && boss.hp <= boss.maxHp * cfg.finalEight.below) {
        boss.finalEightUntil = this.time + cfg.finalEight.seconds;
        this.emit({ type: "hold", x: boss.x, y: boss.y, radius: 48, life: 0.8, color: "red" });
        this.onChange("finalEight", this);
      }
      if (boss.finalEightUntil > this.time) boss.hp = Math.max(1, boss.hp);
    }
    if (boss.hp <= 0) return;
    if (cfg.resolve) {
      const steps = boss.resolveSteps ?? 0;
      while ((boss.resolveSteps ?? 0) < cfg.resolve.at.length && boss.hp <= boss.maxHp * cfg.resolve.at[boss.resolveSteps ?? 0]) boss.resolveSteps = (boss.resolveSteps ?? 0) + 1;
      if (boss.resolveSteps > steps) {
        this.emit({ type: "hold", x: boss.x, y: boss.y, radius: 36, life: 0.5, color: "gold" });
        this.onChange("resolve", this);
      }
    }
    if (cfg.valor && !dot) {
      boss.valor = (boss.valor ?? 0) + 1;
      if (boss.valor >= cfg.valor.max) this.eightyCount(boss);
    }
  }

  // The Eighty Count (Ochenta, tuning.bosses[id].valor): a shockwave stuns every hero within
  // `radius` for `stun` s, then for `seconds` he moves `speed` faster and resists `ccResist`
  // of crowd control (resistCc). Valor starts again from 0.
  eightyCount(boss) {
    const cfg = this.bossTuning.valor;
    boss.valor = 0;
    boss.rallyUntil = this.time + cfg.seconds;
    for (const hero of this.heroes) {
      if (this.isVeiled(hero) || Math.hypot(hero.x - boss.x, hero.y - boss.y) > cfg.radius) continue;
      hero.hexedUntil = Math.max(hero.hexedUntil ?? 0, this.time + cfg.stun);
    }
    this.emit({ type: "splash", x: boss.x, y: boss.y, radius: cfg.radius, life: 0.6, color: "red" });
    this.onChange("eightyCount", this);
  }

  // Crowd-control resistance: stuns, freezes, petrification and slows on the enemy run out
  // 1 / (1 - share) times as fast, so a share of 0.8 cuts their length by 80%.
  resistCc(enemy, dt) {
    const share = Math.min(0.95, this.bossTuning?.valor?.ccResist || 0);
    const extra = dt * share / (1 - share);
    for (const key of ["stunnedUntil", "petrifiedUntil", "frozenUntil"]) {
      if ((enemy[key] ?? 0) > this.time) enemy[key] = Math.max(this.time, enemy[key] - extra);
    }
    enemy.slow = Math.max(0, enemy.slow - extra);
    enemy.chill = Math.max(0, (enemy.chill ?? 0) - extra);
  }

  // Ochenta's summed bonuses (shares): Spanish Resolve steps, the Eighty Count rush and The
  // Final Eight. Other bosses get none.
  bossBoost(boss) {
    const cfg = this.bossTuning;
    if (!cfg?.resolve && !cfg?.valor && !cfg?.finalEight) return NO_BOOST;
    const steps = boss.resolveSteps ?? 0;
    const final = (boss.finalEightUntil ?? 0) > this.time ? cfg.finalEight : null;
    const rush = (boss.rallyUntil ?? 0) > this.time ? cfg.valor?.speed || 0 : 0;
    return {
      attack: steps * (cfg.resolve?.attack || 0) + (final?.attack || 0),
      attackSpeed: steps * (cfg.resolve?.attackSpeed || 0) + (final?.attackSpeed || 0),
      speed: rush + (final?.speed || 0),
    };
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
    if (!enemy.parentId) this.enemiesDown += 1;
    if (this.boons.length) this.boonsOnKill(enemy, hero);
    const spores = this.tuning.enemies[enemy.kind]?.spores;
    if (spores) {
      for (const hero of this.heroes) {
        if (Math.hypot(hero.x - enemy.x, hero.y - enemy.y) > spores.radius) continue;
        hero.sporedUntil = this.time + spores.seconds;
        hero.sporeAps = spores.aps;
      }
      this.emit({ type: "splash", x: enemy.x, y: enemy.y, radius: spores.radius, life: 0.5, color: "green" });
    }
    const harvest = this.statusCfg()?.reactions?.harvest;
    if (harvest && this.isPoisoned(enemy)) {
      for (const thanatos of this.heroes.filter((h) => h.id === "thanatos")) {
        thanatos.ultClock += harvest.charge;
        this.reaction("harvest", enemy, thanatos, 20);
      }
    }
    if (enemy.kind === "boss") this.emit({ type: "bossDown", x: enemy.x, y: enemy.y, life: 1.2, color: "red" });
    this.score += Math.round(enemy.maxHp + enemy.reward * 4);
    if (this.stageStats) this.stageStats.kills += 1;
    this.chargeInterventionsOnKill();
    if (hero) {
      if (hero.id) this.statFor(hero).kills += 1;
      const slot = this.heroKills[hero.entityId];
      if (slot) slot.kills += 1;
      else this.heroKills[hero.entityId] = { name: hero.name, kills: 1 };
      (this.insightLog[hero.class] ||= { stages: 0, kills: 0 }).kills += 1;
    }
    this.onChange("kill", this);
  }

  inCone(hero, enemy, halfAngle = Math.PI / 3) {
    // On a board an enemy in the hero's own cell (held by a road hero) is always in front.
    const board = this.boardRules && boardOf(this.map);
    if (board && Math.hypot(enemy.x - hero.x, enemy.y - hero.y) < board.cell / 2) return true;
    const angle = Math.atan2(enemy.y - hero.y, enemy.x - hero.x);
    let delta = angle - (hero.rotation || 0);
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return Math.abs(delta) <= halfAngle;
  }

  castUltimate(hero, target) {
    this.faceTarget(hero, target);
    const power = this.attackValue(hero) * 2.5 * hero.ultPower * (1 + (this.classBonus(hero).ultPower || 0));
    const utilityPower = Math.min(1.75, Math.max(1, hero.ultimateEffectPower ?? 1));
    const controlPower = Math.min(1.5, utilityPower);
    const variant = hero.variant;
    // Road heroes cannot reach flyers with basic attacks, and their ultimates follow the same rule.
    const foes = this.enemies.filter((e) => !e.untargetable && !(e.flying && hero.slotType === "road"));
    // Campaign Evolution V (campaign.js collectionHeroes) unlocks the upgraded ultimate.
    const aw = !!hero.awakenedUlt;
    const beam = {}; // sun_beam: direction, length and struck spots for the effect

    if (variant === "limitless_shots") {
      // Atalanta (Idril's Limitless Shots): for a few seconds every basic attack looses extra
      // arrows at its target, her reach grows one step, and the arrows burn.
      const skill = this.tuning.heroSkills?.[hero.id];
      hero.win = {
        until: this.time + (skill?.seconds ?? 6) + (aw ? skill?.awakenSeconds ?? 2 : 0),
        extra: (aw ? skill?.awakenShots ?? 5 : skill?.shots ?? 3) - 1,
        share: skill?.share ?? 0.5, reach: 1,
        burnShare: skill?.burnShare ?? 0.4, burnSeconds: skill?.burnSeconds ?? 4,
      };
      this.emitHeroEffect(hero, { type: "buff", x: hero.x, y: hero.y, life: 0.5, color: "gold" });
    } else if (variant === "flurry") {
      // Vidar: for a few seconds each basic attack strikes three times (five awakened).
      const skill = this.tuning.heroSkills?.[hero.id];
      hero.win = { until: this.time + (skill?.seconds ?? 4) + (aw ? skill?.awakenSeconds ?? 2 : 0), extra: (aw ? 4 : 2), share: skill?.share ?? 0.6 };
      this.emitHeroEffect(hero, { type: "buff", x: hero.x, y: hero.y, life: 0.4, color: "purple" });
    } else if (variant === "solar_rush") {
      // Helios: cleave in front of him, then a rush: faster, harder attacks with a second strike each.
      const skill = this.tuning.heroSkills?.[hero.id];
      const around = foes.filter((e) => !e.dead && this.nearPoint(hero, e, 72));
      const cone = around.filter((e) => this.inCone(hero, e));
      (cone.length ? cone : around).forEach((e) => { this.hit(e, power * 0.6, hero); e.slow = 2; });
      const seconds = (skill?.seconds ?? 5) + (aw ? skill?.awakenSeconds ?? 3 : 0);
      hero.win = { until: this.time + seconds, extra: 1, share: skill?.share ?? 0.7 };
      hero.rapid = { aps: skill?.rapidAps ?? 0.3, atk: skill?.rapidAtk ?? 0.2 };
      hero.rapidUntil = this.time + seconds;
      this.emitHeroEffect(hero, { type: "buff", x: hero.x, y: hero.y, life: 0.4, color: "gold" });
    } else if (variant === "bifrost_ward") {
      // Heimdall: the bridge shields his allies. They take less damage for a few seconds (his class hold still pins foes).
      const skill = this.tuning.heroSkills?.[hero.id];
      const cut = Math.min(0.6, (aw ? skill?.awakenWard ?? 0.35 : skill?.ward ?? 0.25) * controlPower);
      const until = this.time + ((skill?.seconds ?? 4) + (aw ? skill?.awakenSeconds ?? 2 : 0)) * controlPower;
      this.heroes.filter((a) => this.inReach(hero, a)).forEach((a) => {
        a.wardCut = Math.max(cut, this.time < (a.wardUntil || 0) ? a.wardCut : 0);
        a.wardUntil = Math.max(until, a.wardUntil || 0);
        a.wardFx = "bifrost"; // the renderer draws the bridge-coloured rim while this runs
        this.emitHeroEffect(hero, { type: "buff", x: a.x, y: a.y, life: 0.5, color: "gold" });
      });
    } else if (variant === "molten_ground") {
      // Hephaestus: the hammer turns the road around the target into lava for a few seconds.
      const skill = this.tuning.heroSkills?.[hero.id];
      const seconds = (skill?.seconds ?? 4) + (aw ? skill?.awakenSeconds ?? 1 : 0);
      (this.zones ??= []).push({ x: target.x, y: target.y, radius: aw ? skill?.awakenRadius ?? 110 : skill?.radius ?? 80,
        until: this.time + seconds, dps: power * (skill?.dps ?? 0.5), hero });
    } else if (variant === "shadow_step") {
      // Nott: phase to lowest-HP enemy, execute it, slow nearby
      // Awakened: also strikes the second weakest enemy.
      const struck = aw ? foes.filter((e) => !e.dead).sort((a, b) => a.hp - b.hp).slice(0, 2) : [target];
      if (!struck.includes(target)) struck[0] = target;
      for (const victim of struck) {
        this.hit(victim, victim.hp / victim.maxHp < this.executeThreshold(hero) ? power * 1.8 : power, hero);
        foes.filter((e) => !e.dead && this.nearPoint(victim, e, 70)).forEach((e) => { e.slow = 2; });
      }
    } else if (variant === "soul_drain") {
      // Thanatos, Featherfall Judgment: drain the weakest enemy (his attack target as an
      // Assassin), stun it for 2s, 450% ATK (1.8x the standard ultimate). A kill hands
      // back 60% of the charge (the skill restores 600 of 1000 Energy).
      this.hit(target, power * 1.8, hero);
      if (target.dead) hero.ultRefund = hero.ultCooldown * (aw ? 0.8 : 0.6);
      else target.stunnedUntil = Math.max(target.stunnedUntil ?? 0, this.time + (aw ? 3 : 2));
    } else if (variant === "valkyrie_call") {
      // Asclepius: revive the most recent eligible fallen hero at 50% HP; fallback heal if none.
      // Eligible: not already back on the field, ring still free, and room in the team.
      const fallen = this.takeRevivableFallen();
      if (fallen) {
        const base = this.heroesById.get(fallen.id);
        const slotArr = fallen.slotType === "road" ? this.map.roadSlots : this.map.platformSlots;
        const slot = slotArr[fallen.slotIndex];
        const fullHp = this.maxHpFor(base.hp, base.class);
        const fSkill = this.tuning.heroSkills?.[fallen.id];
        this.heroes.push({ ...base, atk: this.atkFor({ ...base, baseAtk: base.atk }), range: this.deployRange(base, fallen.slotType, fallen.slotIndex), entityId: this.entityId++, x: slot[0], y: slot[1], slotType: fallen.slotType, slotIndex: fallen.slotIndex, hp: fullHp, hpLeft: Math.round(fullHp * Math.min(1, (aw ? 1 : 0.5) * utilityPower)), attackClock: 0, ultClock: 0, rotation: this.defaultRotationFor(slot[0], slot[1]), targeting: fallen.targeting ?? "auto", baseAtk: base.atk, baseHp: base.hp, variant: fSkill?.variant ?? null, skillName: fSkill?.skillName ?? null, basic: fSkill?.basic ?? null });
        if (!this.team.includes(fallen.id)) this.team = [...this.team, fallen.id];
        this.lastRevive = { heroId: fallen.id, by: hero.id };
        this.emitHeroEffect(hero, { type: "heal", x: slot[0], y: slot[1], life: 0.7, color: "green" });
        this.onChange("revive", this);
      } else {
        const fraction = this.healFraction(hero);
        this.heroes.filter((a) => this.inReach(hero, a)).forEach((a) => {
          this.healHero(a, a.hp * fraction * utilityPower, hero);
          this.emitHeroEffect(hero, { type: "heal", x: a.x, y: a.y, life: 0.5, color: "green" });
        });
      }
    } else if (variant === "knockback") {
      // Aegir: cleave + push up to 3 enemies back on path (sorted by furthest progress = most dangerous first)
      const around = foes.filter((e) => !e.dead && this.nearPoint(hero, e, 72));
      const cone = around.filter((e) => this.inCone(hero, e));
      const victims = (cone.length ? cone : around).sort((a, b) => this.progress(b) - this.progress(a)).slice(0, aw ? 5 : 3);
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
        && this.inUltArea(hero, e) && this.inCone(hero, e))
        .sort((a, b) => this.progress(b) - this.progress(a)).slice(0, limit);
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
      // Atlas: taunt + heal nearby road allies
      foes.filter((e) => this.inUltArea(hero, e, 1.8)).forEach((e) => { e.slow = aw ? 4 : 3; });
      this.heroes.filter((a) => a.slotType === "road" && this.inReach(hero, a)).forEach((a) => {
        this.healHero(a, a.hp * (aw ? 0.3 : 0.15) * utilityPower, hero);
        this.emitHeroEffect(hero, { type: "heal", x: a.x, y: a.y, life: 0.5, color: "green" });
      });
    } else if (variant === "expose") {
      // Ymir: taunt + expose enemies (take +20% damage for 4s, see hit())
      foes.filter((e) => this.inUltArea(hero, e, 1.8)).forEach((e) => { e.slow = 3; e.exposed = Math.max(e.exposed ?? 0, this.time + (aw ? 7 : 4) * controlPower); });
    } else if (variant === "mass_taunt") {
      // Heimdall: wide taunt (2.5x range)
      foes.filter((e) => this.inUltArea(hero, e, aw ? 3.5 : 2.5)).forEach((e) => { e.slow = (aw ? 5 : 3) * controlPower; });
    } else if (variant === "rooted_sanctuary") {
      // Gaia (Support): heals allies in range from her own max health, then they take less damage.
      const skill = this.tuning.heroSkills?.[hero.id];
      const heal = hero.hp * (aw ? skill?.awakenHeal ?? 0.5 : skill?.heal ?? 0.3) * (1 + (this.classBonus(hero).support || 0)) * utilityPower;
      const cut = aw ? skill?.awakenWard ?? 0.4 : skill?.ward ?? 0.3;
      const until = this.time + (skill?.wardSeconds ?? 8);
      this.heroes.filter((a) => this.inReach(hero, a)).forEach((a) => {
        this.healHero(a, heal, hero);
        a.wardCut = Math.max(cut, this.time < (a.wardUntil || 0) ? a.wardCut : 0);
        a.wardUntil = Math.max(until, a.wardUntil || 0);
        this.emitHeroEffect(hero, { type: "heal", x: a.x, y: a.y, life: 0.5, color: "green" });
      });
    } else if (variant === "war_cry") {
      // Helios: cleave + slow hit enemies
      const around = foes.filter((e) => !e.dead && this.nearPoint(hero, e, 72));
      const cone = around.filter((e) => this.inCone(hero, e));
      (cone.length ? cone : around).forEach((e) => { this.hit(e, power * (aw ? 1.5 : 1), hero); e.slow = aw ? 4 : 2; });
      this.emitHeroEffect(hero, { type: "buff", x: hero.x, y: hero.y, life: 0.4, color: "gold" });
    } else if (variant === "lifesteal_cleave") {
      // Set: cleave + heal self for 15% of power per target hit
      const around = foes.filter((e) => !e.dead && this.nearPoint(hero, e, 72));
      const cone = around.filter((e) => this.inCone(hero, e));
      const targets = cone.length ? cone : around;
      targets.forEach((e) => this.hit(e, power, hero));
      if (targets.length > 0) {
        this.healHero(hero, power * targets.length * (aw ? 0.3 : 0.15), hero);
        this.emitHeroEffect(hero, { type: "heal", x: hero.x, y: hero.y, life: 0.4, color: "green" });
      }
    } else if (variant === "venom_cleave") {
      // Fenrir: cleave + vulnerability debuff (+20% dmg taken for 4s, see hit())
      const around = foes.filter((e) => !e.dead && this.nearPoint(hero, e, aw ? 100 : 72));
      const cone = around.filter((e) => this.inCone(hero, e));
      (cone.length ? cone : around).forEach((e) => { this.hit(e, power, hero); e.exposed = Math.max(e.exposed ?? 0, this.time + (aw ? 8 : 4)); });
    } else if (variant === "claw_sweep") {
      // Hecate: execute target + AoE execute around it
      const execMult = target.hp / target.maxHp < this.executeThreshold(hero) ? 1.8 : 1;
      this.hit(target, power * execMult, hero);
      foes.filter((e) => !e.dead && e !== target && this.nearPoint(target, e, aw ? 90 : 55)).forEach((e) => {
        this.hit(e, power * (e.hp / e.maxHp < this.executeThreshold(hero) ? 1.8 : 0.7), hero);
      });
    } else if (variant === "rapid_strike") {
      // Vidar: 3 rapid hits at 50% power
      for (let i = 0; i < (aw ? 5 : 3); i += 1) if (!target.dead) this.hit(target, power * 0.5, hero);
    } else if (variant === "chain_lightning") {
      // Odin: nuke primary cluster + bounce to 2 nearest others
      const blasted = foes.filter((e) => this.nearPoint(target, e, 72));
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
      // Hephaestus: nuke + self heal for 20% max HP
      foes.filter((e) => this.nearPoint(target, e, aw ? 110 : 72)).forEach((e) => this.hit(e, power, hero));
      this.healHero(hero, hero.hp * (aw ? 0.4 : 0.2), hero);
      this.emitHeroEffect(hero, { type: "heal", x: hero.x, y: hero.y, life: 0.5, color: "green" });
    } else if (variant === "ice_shockwave") {
      // Boreas: an ice shockwave fills his whole attack radius; each enemy hit may freeze.
      const skill = this.tuning.heroSkills?.[hero.id];
      const chance = (skill?.freezeChance ?? 0.1) + (aw ? skill?.awakenFreezeChance ?? 0.1 : 0);
      const seconds = (skill?.freezeSeconds ?? 2) + (aw ? skill?.awakenFreezeSeconds ?? 1 : 0);
      foes.filter((e) => this.inReach(hero, e)).forEach((e) => {
        this.hit(e, power * (skill?.damage ?? 1.15), hero, { showShot: false });
        if (e.dead || this.rng() >= chance) return;
        e.stunnedUntil = Math.max(e.stunnedUntil ?? 0, this.time + seconds);
        e.frozenUntil = Math.max(e.frozenUntil ?? 0, this.time + seconds);
      });
    } else if (variant === "weaken_burst") {
      // Recruit Elm: nuke + expose hit targets
      foes.filter((e) => this.nearPoint(target, e, aw ? 110 : 72)).forEach((e) => { this.hit(e, power, hero); e.exposed = Math.max(e.exposed ?? 0, this.time + 4); });
    } else if (variant === "moon_barrage") {
      // Skadi: volley + grant atk buff to nearby allies
      const shots = aw ? 5 : 3;
      const spread = foes.filter((e) => !e.dead && e !== target && this.inUltArea(hero, e) && this.inCone(hero, e)).slice(0, shots - 1);
      const victims = [target, ...spread];
      for (let i = 0; i < shots; i += 1) { const v = victims[i % victims.length]; if (!v.dead) this.hit(v, power * 0.55, hero); }
      this.heroes.filter((a) => this.inReach(hero, a)).forEach((a) => {
        a.buffUntil = Math.max(a.buffUntil || 0, this.time + (aw ? 8 : 5));
        this.emitHeroEffect(hero, { type: "buff", x: a.x, y: a.y, life: 0.4, color: "gold" });
      });
    } else if (variant === "burning_volley") {
      // Atalanta: burning arrows rain on the target area; every enemy hit burns.
      // Awakened: rapid fire afterwards (faster, harder basic shots).
      const skill = this.tuning.heroSkills?.[hero.id];
      const radius = skill?.radius ?? 80;
      foes.filter((e) => !e.dead && this.nearPoint(target, e, radius)).forEach((e) => {
        const dealt = this.hit(e, power * (skill?.damage ?? 0.6), hero, { showShot: false });
        if (!e.dead) this.applyBurn(e, hero, (dealt || power * (skill?.damage ?? 0.6)) * (skill?.burnShare ?? 1), skill?.burnSeconds ?? 5);
      });
      if (aw) {
        hero.rapid = { aps: skill?.rapidAps ?? 0.5, atk: skill?.rapidAtk ?? 0.3 };
        hero.rapidUntil = this.time + (skill?.rapidSeconds ?? 10);
        this.emitHeroEffect(hero, { type: "buff", x: hero.x, y: hero.y, life: 0.4, color: "gold" });
      }
    } else if (variant === "piercing_shot") {
      // Atalanta: single shot piercing all enemies in line from hero through target
      const dx = target.x - hero.x; const dy = target.y - hero.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len; const uy = dy / len;
      foes.filter((e) => !e.dead).forEach((e) => {
        const ex = e.x - hero.x; const ey = e.y - hero.y;
        const proj = ex * ux + ey * uy;
        if (proj < 0 || proj > hero.range * (aw ? 2 : 1.5)) return;
        if (Math.abs(ex * uy - ey * ux) <= 18) this.hit(e, power * (aw ? 0.9 : 0.55), hero);
      });
    } else if (variant === "sun_beam") {
      // Isis: a bright beam along her row, left or right only; one hit of 100% on up to 8
      // enemies on that line (12 awakened). Her Lord mark lands on the first enemy it strikes.
      const skill = this.tuning.heroSkills?.[hero.id];
      beam.dir = this.beamDirection(hero, foes, target);
      beam.length = this.beamLength(hero);
      const struck = this.beamLine(hero, foes, beam.dir).slice(0, aw ? skill?.awakenTargets ?? 12 : skill?.targets ?? 8);
      beam.hits = struck.map((e) => ({ x: e.x, y: e.y }));
      for (const e of struck) this.hit(e, power * (skill?.damage ?? 1), hero, { showShot: false });
      this.lordMark(hero, struck.includes(target) ? target : struck[0]);
    } else if (variant === "fortune_shower") {
      // Plutus: heal all allies + grant atk buff together
      const fraction = this.healFraction(hero);
      this.heroes.filter((a) => this.inReach(hero, a)).forEach((a) => {
        this.healHero(a, a.hp * fraction * utilityPower, hero);
        a.buffUntil = Math.max(a.buffUntil || 0, this.time + (aw ? 8 : 5));
        this.emitHeroEffect(hero, { type: "heal", x: a.x, y: a.y, life: 0.5, color: "green" });
        this.emitHeroEffect(hero, { type: "buff", x: a.x, y: a.y, life: 0.4, color: "gold" });
      });
      if (aw) {
        this.addPlacement(this.tuning.heroSkills?.[hero.id]?.awakenPlacement ?? 3); // awakened Fortune Shower pays out
      }
    } else if (variant === "fate_link") {
      // Harmonia: heal allies + accelerate their ult charge by 30%
      const fraction = this.healFraction(hero);
      this.heroes.filter((a) => this.inReach(hero, a)).forEach((a) => {
        this.healHero(a, a.hp * fraction * utilityPower, hero);
        a.ultClock = Math.min(a.ultCooldown, a.ultClock + a.ultCooldown * Math.min(1, (aw ? 0.6 : 0.3) * utilityPower));
        this.emitHeroEffect(hero, { type: "heal", x: a.x, y: a.y, life: 0.5, color: "green" });
      });
    } else {
      // Generic class fallback (no variant)
      if (hero.ability === "taunt") {
        foes.filter((e) => this.inUltArea(hero, e, 1.8)).forEach((e) => { e.slow = 3; });
      } else if (hero.ability === "cleave") {
        const around = foes.filter((e) => !e.dead && this.nearPoint(hero, e, 72));
        const cone = around.filter((e) => this.inCone(hero, e));
        (cone.length ? cone : around).forEach((e) => this.hit(e, power, hero));
      } else if (hero.ability === "nuke") {
        foes.filter((e) => this.nearPoint(target, e, 72)).forEach((e) => this.hit(e, power, hero));
      } else if (hero.ability === "volley") {
        const spread = foes.filter((e) => !e.dead && e !== target && this.inUltArea(hero, e) && this.inCone(hero, e)).slice(0, 2);
        const victims = [target, ...spread];
        for (let i = 0; i < 3; i += 1) { const v = victims[i % victims.length]; if (!v.dead) this.hit(v, power * 0.55, hero); }
      } else if (hero.ability === "aura") {
        const allies = this.heroes.filter((ally) => this.inReach(hero, ally));
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
    this.emitHeroEffect(hero, { type: "ult", x: target.x, y: target.y, life: 0.55, color: "purple", heroVariant: hero.variant ?? null, awakened: aw, ultimateEffectPower: utilityPower, ...(beam.dir && { beamDir: beam.dir, beamLength: beam.length, beamHits: beam.hits }) });
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
        if (e.dead || e.flying || !this.inUltArea(hero, e, 1.8)) continue;
        e.stunnedUntil = Math.max(e.stunnedUntil ?? 0, until);
      }
      this.emitHeroEffect(hero, { type: "hold", x: hero.x, y: hero.y, radius, life: 0.8, color: "gold" });
    }
    if (kit.veil) {
      hero.veilUntil = this.time + kit.veil.seconds;
      this.emitHeroEffect(hero, { type: "veil", x: hero.x, y: hero.y, life: 0.6, color: "purple" });
    }
  }

  // --- God-Mode challenge (god-mode.js, tdGodMode.json) ---

  // The stationary god takes the field and the clock starts; its attack cycle waits `firstAttackAt`.
  startGod() {
    const cfg = this.god;
    this.spawnQueue = [];
    this.stageStats = { kills: 0, leaks: 0, placementEarned: 0, heroDeaths: 0, leakKinds: {} };
    this.spawnClock = 0;
    // A fixed reference health keeps percentage effects (true damage, executes) in a sane range;
    // hit() refills it after every blow, so the god never falls.
    this.spawnEnemy("boss", { extra: { stationary: true, cells: cfg.cells, godId: cfg.id, speed: 0, attack: 0, hp: cfg.boss.refHp, maxHp: cfg.boss.refHp, armor: cfg.boss.armor ?? 0, magicRes: cfg.boss.magicRes ?? 0 } });
    this.godAttack = { index: 0, phase: "wait", clock: cfg.firstAttackAt ?? 3, cells: [] };
    this.started = true;
    this.running = true;
    this.paused = false;
    this.onChange("start", this);
    return true;
  }

  // One step of the god's attack cycle: announce (telegraph), strike, recover, next attack.
  stepGod(boss, dt) {
    const cfg = this.god, state = this.godAttack;
    if (!cfg || !state || !cfg.cycle?.length) return;
    state.clock -= dt;
    if (state.clock > 0) return;
    const attack = cfg.cycle[state.index % cfg.cycle.length];
    if (state.phase === "wait") {
      state.cells = this.godAttackCells(attack);
      state.phase = "telegraph";
      state.clock = attack.telegraph;
      this.emit({ type: "godTelegraph", attack: attack.attack, side: attack.side ?? null, cells: state.cells, life: attack.telegraph, x: boss.x, y: boss.y });
    } else if (state.phase === "telegraph") {
      this.godStrike(boss, attack, state.cells);
      state.phase = "recover";
      state.clock = attack.recovery;
    } else {
      state.phase = "wait";
      state.index += 1;
      state.clock = 0;
    }
  }

  // The cells an attack marks: a slam covers a plus around its impact cell, a sweep a whole
  // row, embers land on `count` cells where heroes stand (chosen with the run's seeded rng).
  godAttackCells(attack) {
    const board = boardOf(this.map);
    switch (attack.attack) {
      case "slam": return (PATTERNS.plus ?? []).map(([dc, dr]) => [attack.cell[0] + dc, attack.cell[1] + dr]).filter(([c, r]) => c >= 0 && r >= 0 && c < board.cols && r < board.rows);
      case "sweep": return Array.from({ length: board.cols }, (_, c) => [c, attack.row]);
      case "embers": {
        const occupied = [...new Map(this.heroes.map((hero) => cellAt(board, hero.x, hero.y)).map((cell) => [cell.join(","), cell])).values()];
        const picked = [];
        while (picked.length < attack.count && occupied.length) picked.push(occupied.splice(Math.floor(this.rng() * occupied.length), 1)[0]);
        return picked;
      }
      default: return [];
    }
  }

  // The blow lands: every hero standing in a marked cell loses a share of its health.
  godStrike(boss, attack, cells) {
    const board = boardOf(this.map);
    const marked = new Set(cells.map((cell) => cell.join(",")));
    for (const hero of [...this.heroes]) {
      if (marked.has(cellAt(board, hero.x, hero.y).join(","))) this.damageHero(hero, hero.hp * attack.damage, boss);
    }
    this.emit({ type: "godStrike", attack: attack.attack, side: attack.side ?? null, cells, life: 0.6, x: boss.x, y: boss.y });
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

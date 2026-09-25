const K = 260;
const STEP = 1 / 60;

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

export function pointOnPath(points, distance) {
  let remaining = distance;
  for (let i = 1; i < points.length; i += 1) {
    const ax = points[i - 1][0]; const ay = points[i - 1][1];
    const bx = points[i][0]; const by = points[i][1];
    const segment = Math.hypot(bx - ax, by - ay);
    if (remaining <= segment) {
      const t = segment ? remaining / segment : 0;
      return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t };
    }
    remaining -= segment;
  }
  const last = points.at(-1);
  return { x: last[0], y: last[1] };
}

export class TowerDefenseGame {
  constructor({ heroes, tuning, map, waves, seed = 1337, onChange = () => {} }) {
    this.heroesById = new Map(heroes.map((hero) => [hero.id, hero]));
    this.tuning = tuning;
    this.support = tuning.support || { healFraction: 0.18, auraAttackBonus: 0.25, auraDuration: 6 };
    this.virtueEffects = tuning.virtueEffects || {};
    this.favor = tuning.favor || {}; // permanent Divine Blessing bonuses (favor.js)
    // Difficulty knobs (tuning.difficulty); the debug panel edits them live.
    this.difficulty = { enemyHp: 1, enemySpeed: 1, killGold: 1, waveHpScale: 0.15, invincible: false, ...(tuning.difficulty || {}) };
    this.map = map;
    this.waves = waves;
    this.rng = createRng(seed);
    // Quests draw from their own stream so combat randomness is unchanged by them.
    this.questRng = createRng((seed ^ 0x7a3d9c1) >>> 0);
    this.onChange = onChange;
    this.onEffect = null; // optional hook (effect) => void, used for audio
    this.path = pathMetrics(map.path);
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
    this.quest = null;
    this.questsDone = 0;
    this.totalLeaks = 0;
    this.perfect = false;
    this.fallenHeroes = [];
    this.heroKills = {};
    this.totalGoldEarned = 0;
    this.totalGoldSpent = 0;
    this.goldCarry = 0; // fractional kill-gold bonus not yet paid out
    this.runDuration = 0;
    // Virtue shard (6C): the run starts with this virtue already chosen.
    const startVirtue = this.tuning.run.startVirtue;
    if (startVirtue && this.virtueEffects[startVirtue]) this.addVirtue(startVirtue);
    this.onChange("reset", this);
  }

  setTeam(ids) {
    const valid = [...new Set(ids)].filter((id) => this.heroesById.has(id));
    if (valid.length !== this.tuning.run.maxTeam) return false;
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
    if (this.heroes.some((hero) => hero.id === heroId)) return false;
    if (this.heroes.some((hero) => hero.slotType === slotType && hero.slotIndex === slotIndex)) return false;
    if (!this.team.includes(heroId)) {
      if (this.team.length >= (this.tuning.run.maxTeam ?? 5)) return false;
      this.team = [...this.team, heroId];
      this.onChange("team", this);
    }
    const slot = (slotType === "road" ? this.map.roadSlots : this.map.platformSlots)[slotIndex];
    if (!slot) return false;
    this.gold -= cost;
    this.totalGoldSpent += cost;
    const hp = this.maxHpFor(base.hp, 1, base.class);
    const skill = this.tuning.heroSkills?.[heroId];
    this.heroes.push({ ...base, range: this.rangeFor(base), entityId: this.entityId++, x: slot[0], y: slot[1], slotType, slotIndex, hp, hpLeft: hp, attackClock: 0, ultClock: 0, rotation: this.defaultRotationFor(slot[0], slot[1]), level: 1, baseAtk: base.atk, baseHp: base.hp, variant: skill?.variant ?? null, skillName: skill?.skillName ?? null });
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

  maxHpFor(baseHp, level, heroClass, awakened = false) {
    const tuning = this.tuning.upgrades;
    const favorHp = (this.favor.heroHpBonus || 0) + (heroClass === "Tank" ? this.favor.tankHpBonus || 0 : 0);
    const awake = awakened ? 1 + (this.tuning.awakening?.healthBonus || 0) : 1;
    return Math.round(baseHp * (1 + tuning.healthPerLevel * (level - 1)) * (1 + this.modifiers().hp) * (1 + favorHp) * awake);
  }

  rangeFor(base) {
    return base.range + (base.class === "Mage" ? this.favor.mageRangeBonus || 0 : 0);
  }

  // Kill gold with difficulty and Favor bonus; fractions carry over so small rewards still gain.
  killReward(reward) {
    this.goldCarry += reward * this.difficulty.killGold * (1 + (this.favor.killGoldBonus || 0));
    const paid = Math.floor(this.goldCarry + 1e-9);
    this.goldCarry -= paid;
    return paid;
  }

  executeThreshold(hero) {
    const raised = hero?.class === "Assassin" ? this.favor.assassinExecuteThreshold || 0 : 0;
    return Math.max(0.35, raised);
  }

  ultChargeRate() {
    return 1 + this.modifiers().regen + (this.favor.ultChargeBonus || 0);
  }

  synergyPerTag() {
    return (this.tuning.synergy?.bonusPerTag || 0) + (this.favor.synergyTagBonus || 0);
  }

  offerVirtues() {
    const available = Object.keys(this.virtueEffects).filter((name) => !this.virtues.includes(name));
    const picks = [];
    while (picks.length < 3 && available.length) {
      picks.push(available.splice(Math.floor(this.rng() * available.length), 1)[0]);
    }
    this.virtueOffer = picks.length ? picks : null;
  }

  chooseVirtue(name) {
    if (!this.virtueOffer || !this.virtueOffer.includes(name) || this.virtues.includes(name)) return false;
    this.virtueOffer = null;
    this.addVirtue(name);
    this.onChange("virtue", this);
    return true;
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
        const next = this.maxHpFor(hero.baseHp, hero.level, hero.class, hero.awakened);
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
      if (!awakening || hero.awakened) return { ok: false, reason: `${hero.name} is fully upgraded.`, hero };
      const cost = awakening.cost;
      const nextAtk = Math.round(hero.baseAtk * (1 + tuning.attackPerLevel * (hero.level - 1)) * (1 + awakening.attackBonus));
      const nextHp = this.maxHpFor(hero.baseHp, hero.level, hero.class, true);
      if (this.gold < cost) return { ok: false, awaken: true, reason: `Needs ${cost} gold, you have ${this.gold}.`, hero, cost, nextAtk, nextHp };
      return { ok: true, awaken: true, hero, cost, nextAtk, nextHp };
    }
    const cost = tuning.costs[hero.level];
    const nextAtk = Math.round(hero.baseAtk * (1 + tuning.attackPerLevel * hero.level));
    const nextHp = this.maxHpFor(hero.baseHp, hero.level + 1, hero.class);
    if (this.gold < cost) return { ok: false, reason: `Needs ${cost} gold — you have ${this.gold}.`, hero, cost, nextAtk, nextHp };
    return { ok: true, hero, cost, nextAtk, nextHp };
  }

  upgrade(entityId) {
    const info = this.upgradeInfo(entityId);
    if (!info.ok) return info;
    const tuning = this.tuning.upgrades;
    this.gold -= info.cost;
    this.totalGoldSpent += info.cost;
    if (info.awaken) {
      info.hero.awakened = true;
      this.emitHeroEffect(info.hero, { type: "awaken", x: info.hero.x, y: info.hero.y, life: 0.9, color: "gold" });
    } else info.hero.level += 1;
    const hpGain = info.nextHp - info.hero.hp;
    info.hero.atk = info.nextAtk;
    info.hero.hp = info.nextHp;
    info.hero.hpLeft += hpGain; // the new maximum health is granted, but no free full heal
    this.onChange("upgrade", this);
    return info;
  }

  defaultRotationFor(x, y) {
    const path = this.map.path;
    let bestDist = Infinity;
    let bestAngle = 0;
    for (let i = 0; i < path.length - 1; i++) {
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

  // Total enemy HP of a wave, with the same scaling as spawnEnemy.
  waveTotalHp(waveIndex = this.wave) {
    const wave = this.waves[waveIndex];
    if (!wave) return 0;
    const scale = (1 + waveIndex * this.difficulty.waveHpScale) * this.difficulty.enemyHp;
    return Math.round(wave.spawns.reduce((sum, group) => sum + group.count * (this.tuning.enemies[group.kind]?.hp || 0), 0) * scale);
  }

  startWave() {
    if (this.running || this.complete || this.wave >= this.waves.length) return false;
    const wave = this.waves[this.wave];
    this.wave += 1;
    this.waveStats = { wave: this.wave, kills: 0, leaks: 0, goldEarned: 0, heroDeaths: 0, lastSpawnAt: null };
    this.virtueOffer = null; // unclaimed offers expire when the next wave starts
    this.quest = this.rollQuest();
    this.spawnQueue = [];
    let at = 0;
    for (const group of wave.spawns) {
      for (let i = 0; i < group.count; i += 1) {
        this.spawnQueue.push({ at, kind: group.kind });
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
      this.spawnEnemy(this.spawnQueue.shift().kind);
      if (!this.spawnQueue.length && this.waveStats) this.waveStats.lastSpawnAt = this.time;
    }
    this.checkQuestClock();

    this.engaged = new Map(); // road hero -> melee enemies it holds this step (block limit)
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.held = false;
      enemy.slow = Math.max(0, enemy.slow - dt);
      // Petrification and stuns stop movement and attacks; simulation time still advances.
      if ((enemy.petrifiedUntil ?? 0) > this.time || (enemy.stunnedUntil ?? 0) > this.time) continue;
      const target = enemy.flying ? null : this.findEnemyTarget(enemy);
      if (target) {
        enemy.held = enemy.attackRange === undefined; // stopped by a blocker (melee contact)
        enemy.attackClock -= dt;
        if (enemy.attackClock <= 0) {
          const mods = this.modifiers();
          if (this.rng() >= mods.dodge) {
            this.damageHero(target, resolveDamage(enemy.attack, target.armor * (1 + mods.res), "physical"), enemy);
            this.emit({ type: "shot", x1: enemy.x, y1: enemy.y, x2: target.x, y2: target.y, life: 0.12, color: "red" });
          }
          enemy.attackClock = enemy.attackPeriod || 0.9;
        }
      } else {
        enemy.distance += enemy.speed * (enemy.slow > 0 ? (enemy.slowFactor ?? 0.55) : 1) * dt;
        const point = pointOnPath(this.map.path, enemy.distance);
        enemy.x = point.x; enemy.y = point.y;
        if (enemy.distance >= this.path.total) {
          enemy.dead = true;
          const previousLives = this.lives;
          if (!this.difficulty.invincible) this.lives = Math.max(0, this.lives - enemy.damage);
          if (this.map.base) {
            enemy.exitReason = "base";
            // Emit before finish: the final breach must still reach the renderer/audio.
            this.emit({ type: "baseHit", enemyId: enemy.entityId, damage: previousLives - this.lives,
              x: this.map.base.x, y: this.map.base.y, life: 0.65, color: "red" });
          }
          if (this.waveStats) this.waveStats.leaks += 1;
          this.totalLeaks += 1;
          if (this.quest?.type === "noLeaks") this.failQuest();
          this.onChange("leak", this);
          if (this.lives === 0) this.finish(false);
        }
      }
    }

    if (this.complete) return; // the last life was lost this step: heroes stand down

    for (const hero of this.heroes) {
      hero.attackClock -= dt;
      hero.ultClock += dt;
      const target = this.findTarget(hero);
      const mods = this.modifiers();
      if (target && hero.attackClock <= 0) {
        const resistance = hero.damageType === "magical" ? target.magicRes : target.armor;
        const crit = this.rng() < hero.critChance + mods.crit;
        this.hit(target, resolveDamage(this.attackValue(hero), resistance, hero.damageType, crit), hero, { crit });
        hero.attackClock = 1 / hero.aps;
      }
      // A basic attack that just killed its target must not spend the ultimate on the corpse.
      const ultTarget = this.findUltTarget(hero, target?.dead ? this.findTarget(hero) : target);
      if (ultTarget && hero.ultClock >= hero.ultCooldown / this.ultChargeRate()) {
        if (this.castUltimate(hero, ultTarget) !== false) {
          hero.ultClock = hero.ultRefund || 0; // some ultimates hand back part of their charge
          hero.ultRefund = 0;
        }
      }
    }

    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.effects = this.effects.filter((effect) => (effect.life -= dt) > 0);
    if (this.running && !this.spawnQueue.length && !this.enemies.length) {
      this.running = false;
      if (this.wave >= this.waves.length) this.finish(true);
      else {
        // Wave-clear bonus: flat, predictable income so early waves fund the
        // next recruit while kill rewards stay scarce (economy milestone 5A).
        const bonus = this.tuning.run.waveClearBonus;
        if (bonus) {
          const amount = bonus.base + bonus.perWave * (this.wave - 1);
          this.gold += amount;
          if (this.waveStats) this.waveStats.goldEarned += amount;
          this.totalGoldEarned += amount;
        }
        this.completeQuest();
        this.offerVirtues(); this.onChange("clear", this);
      }
    }
  }

  spawnEnemy(kind) {
    const base = this.tuning.enemies[kind];
    const scale = (1 + (this.wave - 1) * this.difficulty.waveHpScale) * this.difficulty.enemyHp;
    const point = pointOnPath(this.map.path, 0);
    const favorSpeed = this.wave === 1 && this.favor.wave1SpeedDebuff ? 1 - this.favor.wave1SpeedDebuff : 1;
    const speed = base.speed * favorSpeed * this.difficulty.enemySpeed;
    this.enemies.push({ ...base, speed, entityId: this.entityId++, kind, maxHp: base.hp * scale, hp: base.hp * scale, magicRes: base.armor * 0.8, distance: 0, x: point.x, y: point.y, dead: false, slow: 0, attackClock: 0 });
    if (kind === "boss") this.emit({ type: "boss", x: point.x, y: point.y, life: 0.9, color: "red" });
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

  findEnemyTarget(enemy) {
    // Ranged enemies (attackRange) stop and shoot from distance; melee needs contact.
    const reach = enemy.attackRange ?? 42 + (this.favor.contactRangeBonus || 0);
    const melee = enemy.attackRange === undefined;
    const limits = this.tuning.blocking?.blockLimit;
    let best = null;
    for (const hero of this.heroes) {
      if (hero.slotType !== "road" || hero.hpLeft <= 0) continue;
      // Block limit: a blocker that already holds its share lets further melee enemies walk past.
      const limit = melee ? limits?.[hero.class] : undefined;
      if (limit !== undefined && (this.engaged?.get(hero) || 0) >= limit) continue;
      const distance = Math.hypot(hero.x - enemy.x, hero.y - enemy.y);
      if (distance <= reach && (!best || distance < best.distance)) best = { hero, distance };
    }
    if (best && melee && this.engaged) this.engaged.set(best.hero, (this.engaged.get(best.hero) || 0) + 1);
    return best?.hero ?? null;
  }

  supportAuraFor(hero) {
    // Passive local aura: allies inside a support's range gain attack. Does not stack.
    for (const support of this.heroes) {
      if (support.ability !== "aura" || support === hero) continue;
      if (Math.hypot(support.x - hero.x, support.y - hero.y) <= support.range) return { source: support, bonus: this.support.passiveAuraBonus };
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
    return hero.atk * (1 + this.modifiers().atk) * (aura ? 1 + aura.bonus : 1) * ultBuff * (1 + synBonus);
  }

  damageHero(hero, amount, source) {
    if (amount <= 0) return;
    hero.hpLeft -= amount;
    hero._hitFlash = true;
    if (hero.hpLeft <= 0) {
      this.fallenHeroes.push({ id: hero.id, slotType: hero.slotType, slotIndex: hero.slotIndex });
      this.heroes = this.heroes.filter((entry) => entry !== hero);
      this.team = this.team.filter((id) => id !== hero.id);
      if (this.waveStats) this.waveStats.heroDeaths += 1;
      if (this.quest?.type === "heroSurvival") this.failQuest();
      this.onChange("death", this);
    }
  }

  // Ultimate target: normally the attack target. Nyx's Shadow Step phases to the
  // lowest-HP reachable enemy anywhere on the map (road heroes still cannot hit flyers).
  findUltTarget(hero, attackTarget = this.findTarget(hero)) {
    if (hero.variant !== "shadow_step") return attackTarget;
    const alive = this.enemies.filter((e) => !e.dead && !(e.flying && hero.slotType === "road"));
    alive.sort((a, b) => a.hp - b.hp);
    return alive[0] ?? null;
  }

  // Removes and returns the newest fallen entry that can be revived, or null.
  takeRevivableFallen() {
    const teamFull = this.team.length >= (this.tuning.run.maxTeam ?? 5);
    for (let i = this.fallenHeroes.length - 1; i >= 0; i -= 1) {
      const entry = this.fallenHeroes[i];
      const onField = this.heroes.some((h) => h.id === entry.id);
      const ringTaken = this.heroes.some((h) => h.slotType === entry.slotType && h.slotIndex === entry.slotIndex);
      const needsTeamSpot = !this.team.includes(entry.id);
      if (onField || ringTaken || (needsTeamSpot && teamFull)) continue;
      this.fallenHeroes.splice(i, 1);
      return entry;
    }
    return null;
  }

  findTarget(hero) {
    if (hero.variant === "shadow_step") {
      const alive = this.enemies.filter((e) => !e.dead && !(e.flying && hero.slotType === "road") && Math.hypot(hero.x - e.x, hero.y - e.y) <= hero.range);
      alive.sort((a, b) => a.hp - b.hp);
      return alive[0] ?? null;
    }
    // Melee heroes on the road cannot reach flyers; platform coverage is required.
    const targets = this.enemies.filter((enemy) => !enemy.dead && !(enemy.flying && hero.slotType === "road") && Math.hypot(hero.x - enemy.x, hero.y - enemy.y) <= hero.range);
    targets.sort(hero.ability === "execute" ? (a, b) => a.hp - b.hp : (a, b) => b.distance - a.distance);
    return targets[0] ?? null;
  }

  hit(enemy, amount, hero, { showShot = true, crit = false } = {}) {
    if (enemy.dead) return;
    const vuln = (enemy.exposed && enemy.exposed > this.time) ? 1.2 : 1;
    const held = enemy.held ? 1 + (this.tuning.blocking?.heldDamageBonus || 0) : 1;
    enemy.hp -= amount * vuln * held;
    if (showShot) this.emitHeroEffect(hero, { type: "shot", x1: hero.x, y1: hero.y, x2: enemy.x, y2: enemy.y, life: 0.12, color: hero.damageType === "magical" ? "purple" : "gold", heroVariant: hero.variant ?? null });
    this.emitHeroEffect(hero, { type: "hit", x: enemy.x, y: enemy.y, life: 0.18, color: hero.damageType === "magical" ? "purple" : "gold", melee: hero.slotType === "road", crit, heroVariant: hero.variant ?? null });
    if (enemy.hp <= 0) {
      enemy.dead = true;
      if (enemy.kind === "boss") this.emit({ type: "bossDown", x: enemy.x, y: enemy.y, life: 1.2, color: "red" });
      const reward = this.killReward(enemy.reward);
      this.gold += reward;
      this.score += Math.round(enemy.maxHp + enemy.reward * 4);
      if (this.waveStats) { this.waveStats.kills += 1; this.waveStats.goldEarned += reward; }
      this.totalGoldEarned += reward;
      const slot = this.heroKills[hero.entityId];
      if (slot) slot.kills += 1;
      else this.heroKills[hero.entityId] = { name: hero.name, kills: 1 };
      this.onChange("kill", this);
    }
  }

  inCone(hero, enemy, halfAngle = Math.PI / 3) {
    const angle = Math.atan2(enemy.y - hero.y, enemy.x - hero.x);
    let delta = angle - (hero.rotation || 0);
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return Math.abs(delta) <= halfAngle;
  }

  castUltimate(hero, target) {
    const power = this.attackValue(hero) * 2.5 * hero.ultPower;
    const variant = hero.variant;
    // Road heroes cannot reach flyers with basic attacks, and their ultimates follow the same rule.
    const foes = hero.slotType === "road" ? this.enemies.filter((e) => !e.flying) : this.enemies;
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
        this.heroes.push({ ...base, range: this.rangeFor(base), entityId: this.entityId++, x: slot[0], y: slot[1], slotType: fallen.slotType, slotIndex: fallen.slotIndex, hp: fullHp, hpLeft: Math.round(fullHp * (aw ? 1 : 0.5)), attackClock: 0, ultClock: 0, rotation: this.defaultRotationFor(slot[0], slot[1]), level: 1, baseAtk: base.atk, baseHp: base.hp, variant: fSkill?.variant ?? null, skillName: fSkill?.skillName ?? null });
        if (!this.team.includes(fallen.id)) this.team = [...this.team, fallen.id];
        this.lastRevive = { heroId: fallen.id, by: hero.id };
        this.emitHeroEffect(hero, { type: "heal", x: slot[0], y: slot[1], life: 0.7, color: "green" });
        this.onChange("revive", this);
      } else {
        const fraction = this.support.healFraction * (1 + this.modifiers().heal);
        this.heroes.filter((a) => Math.hypot(hero.x - a.x, hero.y - a.y) <= hero.range).forEach((a) => {
          a.hpLeft = Math.min(a.hp, a.hpLeft + a.hp * fraction);
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
        const point = pointOnPath(this.map.path, e.distance);
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
        a.hpLeft = Math.min(a.hp, a.hpLeft + a.hp * (aw ? 0.3 : 0.15));
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
      hero.hpLeft = Math.min(hero.hp, hero.hpLeft + hero.hp * (aw ? 0.35 : 0.15));
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
        hero.hpLeft = Math.min(hero.hp, hero.hpLeft + power * targets.length * (aw ? 0.3 : 0.15));
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
      hero.hpLeft = Math.min(hero.hp, hero.hpLeft + hero.hp * (aw ? 0.4 : 0.2));
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
      const fraction = this.support.healFraction * (1 + this.modifiers().heal);
      this.heroes.filter((a) => Math.hypot(hero.x - a.x, hero.y - a.y) <= hero.range).forEach((a) => {
        a.hpLeft = Math.min(a.hp, a.hpLeft + a.hp * fraction);
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
      const fraction = this.support.healFraction * (1 + this.modifiers().heal);
      this.heroes.filter((a) => Math.hypot(hero.x - a.x, hero.y - a.y) <= hero.range).forEach((a) => {
        a.hpLeft = Math.min(a.hp, a.hpLeft + a.hp * fraction);
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
          const fraction = this.support.healFraction * (1 + this.modifiers().heal);
          allies.forEach((ally) => { ally.hpLeft = Math.min(ally.hp, ally.hpLeft + ally.hp * fraction); this.emitHeroEffect(hero, { type: "heal", x: ally.x, y: ally.y, life: 0.5, color: "green" }); });
        } else {
          allies.forEach((ally) => { ally.buffUntil = this.time + this.support.auraDuration; this.emitHeroEffect(hero, { type: "buff", x: ally.x, y: ally.y, life: 0.5, color: "gold" }); });
        }
        this.hit(target, power * 0.65, hero);
      } else {
        this.hit(target, target.hp / target.maxHp < this.executeThreshold(hero) ? power * 1.8 : power, hero);
      }
    }
    this.emitHeroEffect(hero, { type: "ult", x: target.x, y: target.y, life: 0.55, color: "purple", heroVariant: hero.variant ?? null });
  }

  // Run quests (6B): one objective per wave, except the final wave where gold
  // has no use. Pays tuning.quests gold at wave clear; no config means no quests.
  rollQuest() {
    const cfg = this.tuning.quests;
    if (!cfg || this.wave >= this.waves.length) return null;
    const types = ["noLeaks", "speedClear"];
    // Only road heroes take hits; without one, survival would be free gold.
    if (this.heroes.some((hero) => hero.slotType === "road")) types.push("heroSurvival");
    const type = types[Math.floor(this.questRng() * types.length)];
    const quest = { type, wave: this.wave, status: "active", gold: cfg.goldBase + cfg.goldPerWave * (this.wave - 1) };
    if (type === "speedClear") {
      // Scaled to the slowest enemy's time to walk the whole path, so the limit
      // fits the map length and wave mix instead of one fixed number.
      const spawns = this.waves[this.wave - 1].spawns;
      const slowest = Math.min(...spawns.map((group) => this.tuning.enemies[group.kind]?.speed ?? Infinity)) * this.difficulty.enemySpeed;
      quest.seconds = Math.round((this.path.total / slowest) * cfg.speedClearTravel);
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

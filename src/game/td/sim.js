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
    this.map = map;
    this.waves = waves;
    this.rng = createRng(seed);
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
    this.totalLeaks = 0;
    this.perfect = false;
    this.heroKills = {};
    this.totalGoldEarned = 0;
    this.totalGoldSpent = 0;
    this.runDuration = 0;
    this.onChange("reset", this);
  }

  setTeam(ids) {
    const valid = [...new Set(ids)].filter((id) => this.heroesById.has(id));
    if (valid.length !== this.tuning.run.maxTeam) return false;
    this.team = valid;
    this.onChange("team", this);
    return true;
  }

  place(heroId, slotType, slotIndex) {
    const base = this.heroesById.get(heroId);
    if (!base || !this.team.includes(heroId) || base.slot !== slotType || this.gold < base.cost) return false;
    if (this.heroes.some((hero) => hero.id === heroId)) return false;
    if (this.heroes.some((hero) => hero.slotType === slotType && hero.slotIndex === slotIndex)) return false;
    const slot = (slotType === "road" ? this.map.roadSlots : this.map.platformSlots)[slotIndex];
    if (!slot) return false;
    this.gold -= base.cost;
    this.totalGoldSpent += base.cost;
    const hp = this.maxHpFor(base.hp, 1);
    this.heroes.push({ ...base, entityId: this.entityId++, x: slot[0], y: slot[1], slotType, slotIndex, hp, hpLeft: hp, attackClock: 0, ultClock: 0, rotation: 0, level: 1, baseAtk: base.atk, baseHp: base.hp });
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

  maxHpFor(baseHp, level) {
    const tuning = this.tuning.upgrades;
    return Math.round(baseHp * (1 + tuning.healthPerLevel * (level - 1)) * (1 + this.modifiers().hp));
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
    const before = this.modifiers().hp;
    this.virtues.push(name);
    this.virtueOffer = null;
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
        const next = this.maxHpFor(hero.baseHp, hero.level);
        hero.hpLeft += next - hero.hp;
        hero.hp = next;
      }
    }
    this.onChange("virtue", this);
    return true;
  }

  upgradeInfo(entityId) {
    const hero = this.heroes.find((item) => item.entityId === entityId);
    if (!hero) return { ok: false, reason: "No hero selected." };
    const tuning = this.tuning.upgrades;
    if (this.running) return { ok: false, reason: "Upgrades are only available between waves.", hero };
    if (hero.level >= tuning.maxLevel) return { ok: false, reason: `${hero.name} is at the level cap (${tuning.maxLevel}).`, hero };
    const cost = tuning.costs[hero.level];
    const nextAtk = Math.round(hero.baseAtk * (1 + tuning.attackPerLevel * hero.level));
    const nextHp = this.maxHpFor(hero.baseHp, hero.level + 1);
    if (this.gold < cost) return { ok: false, reason: `Needs ${cost} gold — you have ${this.gold}.`, hero, cost, nextAtk, nextHp };
    return { ok: true, hero, cost, nextAtk, nextHp };
  }

  upgrade(entityId) {
    const info = this.upgradeInfo(entityId);
    if (!info.ok) return info;
    const tuning = this.tuning.upgrades;
    this.gold -= info.cost;
    this.totalGoldSpent += info.cost;
    info.hero.level += 1;
    const hpGain = info.nextHp - info.hero.hp;
    info.hero.atk = info.nextAtk;
    info.hero.hp = info.nextHp;
    info.hero.hpLeft += hpGain; // the new maximum health is granted, but no free full heal
    this.onChange("upgrade", this);
    return info;
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
    return { wave: waveIndex + 1, counts };
  }

  startWave() {
    if (this.running || this.complete || this.wave >= this.waves.length) return false;
    const wave = this.waves[this.wave];
    this.wave += 1;
    this.waveStats = { wave: this.wave, kills: 0, leaks: 0, goldEarned: 0 };
    this.virtueOffer = null; // unclaimed offers expire when the next wave starts
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
    while (this.spawnQueue.length && this.spawnQueue[0].at <= this.spawnClock) this.spawnEnemy(this.spawnQueue.shift().kind);

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.slow = Math.max(0, enemy.slow - dt);
      const target = enemy.flying ? null : this.findEnemyTarget(enemy);
      if (target) {
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
        enemy.distance += enemy.speed * (enemy.slow > 0 ? 0.55 : 1) * dt;
        const point = pointOnPath(this.map.path, enemy.distance);
        enemy.x = point.x; enemy.y = point.y;
        if (enemy.distance >= this.path.total) {
          enemy.dead = true;
          this.lives = Math.max(0, this.lives - enemy.damage);
          if (this.waveStats) this.waveStats.leaks += 1;
          this.totalLeaks += 1;
          this.onChange("leak", this);
          if (this.lives === 0) this.finish(false);
        }
      }
    }

    for (const hero of this.heroes) {
      hero.attackClock -= dt;
      hero.ultClock += dt;
      const target = this.findTarget(hero);
      const mods = this.modifiers();
      if (target && hero.attackClock <= 0) {
        const resistance = hero.damageType === "magical" ? target.magicRes : target.armor;
        this.hit(target, resolveDamage(this.attackValue(hero), resistance, hero.damageType, this.rng() < hero.critChance + mods.crit), hero);
        hero.attackClock = 1 / hero.aps;
      }
      if (target && hero.ultClock >= hero.ultCooldown / (1 + mods.regen)) {
        this.castUltimate(hero, target);
        hero.ultClock = 0;
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
        this.offerVirtues(); this.onChange("clear", this);
      }
    }
  }

  spawnEnemy(kind) {
    const base = this.tuning.enemies[kind];
    const scale = 1 + (this.wave - 1) * 0.15;
    const point = pointOnPath(this.map.path, 0);
    this.enemies.push({ ...base, entityId: this.entityId++, kind, maxHp: base.hp * scale, hp: base.hp * scale, magicRes: base.armor * 0.8, distance: 0, x: point.x, y: point.y, dead: false, slow: 0, attackClock: 0 });
    if (kind === "boss") this.emit({ type: "boss", x: point.x, y: point.y, life: 0.9, color: "red" });
  }

  emit(effect) {
    this.effects.push(effect);
    this.onEffect?.(effect);
  }

  findEnemyTarget(enemy) {
    // Ranged enemies (attackRange) stop and shoot from distance; melee needs contact.
    const reach = enemy.attackRange ?? 42;
    let best = null;
    for (const hero of this.heroes) {
      if (hero.slotType !== "road" || hero.hpLeft <= 0) continue;
      const distance = Math.hypot(hero.x - enemy.x, hero.y - enemy.y);
      if (distance <= reach && (!best || distance < best.distance)) best = { hero, distance };
    }
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
        if (other.synergies?.includes(tag)) total += cfg.bonusPerTag;
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
    if (hero.hpLeft <= 0) {
      this.heroes = this.heroes.filter((entry) => entry !== hero);
      this.onChange("death", this);
    }
  }

  findTarget(hero) {
    // Melee heroes on the road cannot reach flyers; platform coverage is required.
    const targets = this.enemies.filter((enemy) => !enemy.dead && !(enemy.flying && hero.slotType === "road") && Math.hypot(hero.x - enemy.x, hero.y - enemy.y) <= hero.range);
    targets.sort(hero.ability === "execute" ? (a, b) => a.hp - b.hp : (a, b) => b.distance - a.distance);
    return targets[0] ?? null;
  }

  hit(enemy, amount, hero) {
    if (enemy.dead) return;
    enemy.hp -= amount;
    this.emit({ type: "shot", x1: hero.x, y1: hero.y, x2: enemy.x, y2: enemy.y, life: 0.12, color: hero.damageType === "magical" ? "purple" : "gold" });
    this.emit({ type: "hit", x: enemy.x, y: enemy.y, life: 0.18, color: hero.damageType === "magical" ? "purple" : "gold", melee: hero.slotType === "road" });
    if (enemy.hp <= 0) {
      enemy.dead = true;
      this.gold += enemy.reward;
      this.score += Math.round(enemy.maxHp + enemy.reward * 4);
      if (this.waveStats) { this.waveStats.kills += 1; this.waveStats.goldEarned += enemy.reward; }
      this.totalGoldEarned += enemy.reward;
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
    if (hero.ability === "taunt") {
      this.enemies.filter((e) => Math.hypot(hero.x - e.x, hero.y - e.y) <= hero.range * 1.8).forEach((e) => { e.slow = 3; });
    } else if (hero.ability === "cleave") {
      // Cone in the hero's facing direction; falls back to all-around if nothing is in the cone.
      const around = this.enemies.filter((e) => !e.dead && Math.hypot(hero.x - e.x, hero.y - e.y) <= 72);
      const cone = around.filter((e) => this.inCone(hero, e));
      (cone.length ? cone : around).forEach((e) => this.hit(e, power, hero));
    } else if (hero.ability === "nuke") {
      this.enemies.filter((e) => Math.hypot(target.x - e.x, target.y - e.y) <= 72).forEach((e) => this.hit(e, power, hero));
    } else if (hero.ability === "volley") {
      // Three rapid shots spread across the facing cone, falling back to the primary target.
      const spread = this.enemies.filter((e) => !e.dead && e !== target && Math.hypot(hero.x - e.x, hero.y - e.y) <= hero.range && this.inCone(hero, e)).slice(0, 2);
      const victims = [target, ...spread];
      for (let i = 0; i < 3; i += 1) {
        const victim = victims[i % victims.length];
        if (!victim.dead) this.hit(victim, power * 0.55, hero);
      }
    } else if (hero.ability === "aura") {
      // Support ultimates are local: only allies inside the support's range benefit.
      const allies = this.heroes.filter((ally) => Math.hypot(hero.x - ally.x, hero.y - ally.y) <= hero.range);
      if (hero.synergies?.includes("TEAM_HEAL")) {
        const fraction = this.support.healFraction * (1 + this.modifiers().heal);
        allies.forEach((ally) => {
          ally.hpLeft = Math.min(ally.hp, ally.hpLeft + ally.hp * fraction);
          this.emit({ type: "heal", x: ally.x, y: ally.y, life: 0.5, color: "green" });
        });
      } else {
        allies.forEach((ally) => {
          ally.buffUntil = this.time + this.support.auraDuration;
          this.emit({ type: "buff", x: ally.x, y: ally.y, life: 0.5, color: "gold" });
        });
      }
      this.hit(target, power * 0.65, hero);
    } else {
      this.hit(target, target.hp / target.maxHp < 0.35 ? power * 1.8 : power, hero);
    }
    this.emit({ type: "ult", x: target.x, y: target.y, life: 0.55, color: "purple" });
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

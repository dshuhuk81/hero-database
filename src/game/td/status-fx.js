// Status visuals on enemies (M24c): poison bubbles, burn flames and embers, chill frost,
// wet drips, and a frost glint on frozen enemies. Cheap by design: particles come from the
// shared fx-kit pool as optional spawns (skipped when the pool is busy), and the spawn
// interval stretches when many enemies carry a status at once.
// `body(enemy)` returns { x, y, top, width } in world space: feet point, body top y and width.

const RATES = { poison: 0.22, burn: 0.1, chill: 0.28, wet: 0.3, frozen: 0.35 };
const CROWD = 24; // statused enemies before intervals start stretching

export function createStatusFx(kit, { reducedMotion = false } = {}) {
  const clocks = new WeakMap();
  const { rand } = kit;

  const spawners = {
    poison(b) { // green bubbles rise from the body, swell and pop
      kit.spawn("bubble", b.x + rand(-b.width, b.width) * 0.35, b.y - (b.y - b.top) * rand(0.35, 0.7), {
        tint: Math.random() < 0.5 ? 0x9be15d : 0x6cc644, add: false, optional: true,
        size: rand(4, 6), sizeEnd: rand(7, 10), vy: -rand(18, 30), wobble: 2.5, wobbleFreq: 1.8, life: rand(0.6, 0.9), hold: 0.7, alpha: 0.9,
        onEnd: (p) => kit.spawn("ring", p.x, p.y, { tint: 0xc9ff8a, size: 6, sizeEnd: 13, life: 0.16, alpha: 0.8, hold: 0, optional: true }),
      });
    },
    burn(b) { // flame tongues licking up, with the odd ember
      const x = b.x + rand(-b.width, b.width) * 0.3, y = b.y - (b.y - b.top) * rand(0.1, 0.5);
      kit.spawn("flame", x, y, { tint: Math.random() < 0.5 ? 0xff7a2e : 0xffb347, optional: true,
        size: rand(7, 10), sizeEnd: 3, vy: -rand(30, 50), life: rand(0.3, 0.45), hold: 0.3, alpha: 0.9 });
      if (Math.random() < 0.35) kit.spawn("ember", x, y, { tint: 0xffd27a, optional: true, size: 6, sizeEnd: 2,
        vx: rand(-20, 20), vy: -rand(50, 80), life: 0.5, align: true });
    },
    chill(b) { // frost flakes drift down around the body
      kit.spawn("flake", b.x + rand(-b.width, b.width) * 0.45, b.top + rand(0, 8), { tint: 0xcff4ff, optional: true,
        size: rand(5, 7), vy: rand(14, 24), spin: rand(-2, 2), wobble: 3, wobbleFreq: 1.2, life: 0.9, hold: 0.6, alpha: 0.9 });
    },
    wet(b) { // water drips from the body and splash at the feet
      const x = b.x + rand(-b.width, b.width) * 0.3;
      kit.spawn("drop", x, b.y - (b.y - b.top) * rand(0.3, 0.6), { tint: 0x6fb8ff, add: false, optional: true,
        size: 4, vy: 10, ay: 260, life: 0.35, align: true, alpha: 0.9,
        onEnd: (p) => kit.spawn("ring", p.x, p.y, { tint: 0x9fd4ff, size: 4, sizeEnd: 10, stretch: 0.4, life: 0.2, alpha: 0.7, hold: 0, optional: true }) });
    },
    frozen(b) { // glints over the ice shell
      kit.spawn("twinkle", b.x + rand(-b.width, b.width) * 0.3, b.y - (b.y - b.top) * rand(0.3, 0.8), { tint: 0xffffff, optional: true,
        size: rand(8, 12), sizeEnd: 2, life: 0.4, spin: 3 });
    },
  };

  return {
    // `states(enemy)` returns the list of active status names for an enemy.
    update(enemies, dt, body, states) {
      if (reducedMotion || dt <= 0) return; // pips on the health bar stay the static cue
      let statused = 0;
      const pending = [];
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        const list = states(enemy);
        if (list.length) { statused += 1; pending.push([enemy, list]); }
      }
      const stretch = Math.max(1, statused / CROWD) * (kit.load() > 0.75 ? 2 : 1);
      for (const [enemy, list] of pending) {
        let clock = clocks.get(enemy);
        if (!clock) { clock = {}; clocks.set(enemy, clock); }
        let b = null;
        for (const name of list) {
          clock[name] = (clock[name] ?? Math.random() * RATES[name]) - dt;
          if (clock[name] > 0) continue;
          clock[name] = RATES[name] * stretch * (0.8 + Math.random() * 0.4);
          b ??= body(enemy);
          spawners[name](b);
        }
      }
    },
  };
}

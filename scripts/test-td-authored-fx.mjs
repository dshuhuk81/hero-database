import test from 'node:test';
import assert from 'node:assert/strict';
const fx = await import('../src/game/td/authored-fx.js').catch(() => ({}));

function fixture(options = {}) {
  assert.equal(typeof fx.createAuthoredFx, 'function');
  const created = [];
  const atlas = { create(_parent, x, y, width) {
    const entry = { x, y, width, samples: [], destroyed: false };
    created.push(entry);
    return { container: { alpha: 1, scale: { y: 1 }, position: { set(x, y) { entry.x = x; entry.y = y; } } },
      seek(time) { entry.samples.push(time); return time < 2; },
      destroy() { entry.destroyed = true; } };
  } };
  const player = fx.createAuthoredFx({ atlases: new Map(['lightning', 'fire', 'buff'].map(id => [id, atlas])), ...options });
  return { player, created };
}

const ult = () => ({ heroId: 'odin', heroVariant: 'chain_lightning', type: 'ult', x: 100, y: 200 });

test('Odin keeps dynamic chain shots; only his ultimate uses the authored strike', () => {
  const { player, created } = fixture();
  const shot = { ...ult(), type: 'shot', x1: 0, y1: 0, x2: 100, y2: 200 }, effect = ult();
  player.update([shot, effect], 0);
  assert.equal(created.length, 1);
  assert.equal(player.owns(effect), true);
  assert.equal(player.owns(shot), false);
});

test('short simulation events play once and finish their visual tail; pause freezes the clip', () => {
  const { player, created } = fixture();
  const effect = ult();
  player.update([effect], 0);
  player.update([effect], 0.25);
  player.update([], 0);
  assert.equal(created.length, 1);
  assert.deepEqual(created[0].samples, [0, 0.25, 0.25]);
  player.update([], 2);
  assert.equal(created[0].destroyed, true);
  assert.equal(player.count(), 0);
});

test('missing assets, reduced motion, invalid anchors and full capacity preserve baseline effects', () => {
  for (const options of [{ atlases: new Map() }, { reducedMotion: true }, { max: 0 }]) {
    const { player, created } = fixture(options), effect = ult();
    player.update([effect], 0);
    assert.equal(player.owns(effect), false);
    assert.equal(created.length, 0);
  }
  const { player } = fixture();
  const bad = { ...ult(), x: NaN };
  player.update([bad], 0);
  assert.equal(player.owns(bad), false);
});

test('Heimdall buff follows its recipient and ends when that recipient is no longer protected', () => {
  let recipient = { x: 260, y: 300 };
  const { player, created } = fixture({ locate: () => ({ ...recipient, follow: () => recipient }) });
  const effect = { heroId: 'heimdall', type: 'buff', sourceX: 20, sourceY: 20, x: 260, y: 300 };
  player.update([effect], 0);
  recipient = { x: 280, y: 310 };
  player.update([], 0.1);
  assert.deepEqual([created[0].x, created[0].y], [280, 310]);
  recipient = null;
  player.update([], 0.1);
  assert.equal(created[0].destroyed, true);
});

test('Surtr adds flames without removing his melee and lifesteal cues; unknown heroes use baseline', () => {
  const { player, created } = fixture();
  const hit = { heroId: 'surtr', type: 'hit', x: 10, y: 20 };
  const ultimate = { ...hit, type: 'ult' };
  const unknown = { ...hit, heroId: 'ymir' };
  player.update([hit, ultimate, unknown], 0);
  assert.equal(created.length, 2);
  assert.equal(player.owns(hit), false);
  assert.equal(player.owns(ultimate), false);
  assert.equal(player.owns(unknown), false);
});

test('reset destroys every instance and allows the next run to reuse the atlas', () => {
  const { player, created } = fixture();
  const effect = ult();
  player.update([effect], 0);
  player.clear();
  assert.equal(player.owns(effect), false);
  assert.equal(created[0].destroyed, true);
  player.update([effect], 0);
  assert.equal(created.length, 2);
});

test('real simulation casts activate fire, healing and buff profiles without modifying combat events or health', async () => {
  const [{ TowerDefenseGame }, { default: heroes }, { default: tuning }, { default: maps }] = await Promise.all([
    import('../src/game/td/sim.js'),
    import('../src/data/gameBalance.json', { with: { type: 'json' } }),
    import('../src/data/gameBalance.tuning.json', { with: { type: 'json' } }),
    import('../src/data/tdMaps.json', { with: { type: 'json' } }),
  ]);
  for (const id of ['odin', 'surtr', 'heimdall', 'hephaestus', 'helios', 'vidar', 'atalanta', 'skadi', 'atlas', 'gaia', 'asclepius', 'plutus', 'harmonia', 'recruit-bram', 'recruit-kellan', 'recruit-ives', 'recruit-wren', 'recruit-poppy', 'recruit-jory']) {
    const game = new TowerDefenseGame({ heroes, tuning, map: maps[0], seed: 914 });
    game.placement = 100000;
    const base = heroes.find(hero => hero.id === id);
    assert.equal(game.place(id, base.slot, 0), true);
    game.start();
    game.enemies = [];
    game.spawnEnemy('grunt');
    const caster = game.heroes.find(hero => hero.id === id);
    const enemy = game.enemies[0];
    enemy.x = caster.x; enemy.y = caster.y;
    game.castUltimate(caster, enemy);
    const before = JSON.stringify({ effects: game.effects, health: enemy.hp, caster: caster.hpLeft });
    const { player, created } = fixture();
    player.update(game.effects, 0);
    assert.ok(created.length > 0, `${id}'s real cast triggers an authored effect`);
    assert.equal(JSON.stringify({ effects: game.effects, health: enemy.hp, caster: caster.hpLeft }), before);
  }
});

test('every roster hero has a buff cue, while fire remains restricted to fire skills', async () => {
  const { default: heroes } = await import('../src/data/gameBalance.json', { with: { type: 'json' } });
  for (const hero of heroes) {
    const { player, created } = fixture();
    player.update([{ heroId: hero.id, type: 'buff', x: 1, y: 2 }], 0);
    assert.equal(created.length, 1, `${hero.id}: activation cue`);
  }
  const { player, created } = fixture();
  player.update([{ heroId: 'boreas', type: 'ult', x: 1, y: 2 }], 0);
  assert.equal(created.length, 0, 'ice keeps its dedicated renderer');
});

test('recipient tracking uses the relevant status and ignores unrelated wards for heals', () => {
  const ally = { x: 10, y: 20, hpLeft: 100, wardFx: 'bifrost', wardUntil: 2, win: { until: 4 } };
  const game = { time: 1, heroes: [ally] };
  const event = { heroId: 'gaia', type: 'heal', x: 10, y: 20 };
  const locate = (e, r) => fx.locateAuthoredFx(e, r, game, h => [h.x + 5, h.y + 8]);
  const heal = locate(event, { clip: 'buff' });
  assert.deepEqual([heal.x, heal.y], [15, 34]);
  game.time = 3;
  assert.ok(heal.follow(), 'an unrelated expired ward must not cancel healing');
  const buff = locate({ ...event, heroId: 'vidar', type: 'buff' }, { clip: 'buff', status: 'window' });
  ally.x = 30;
  assert.equal(buff.follow().x, 35);
  game.time = 5;
  assert.equal(buff.follow(), null);
  ally.hpLeft = 0;
  assert.equal(heal.follow(), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
const fx = await import('../src/game/td/fx-atlas.js').catch(() => ({}));

test('effect playback ends instead of wrapping; a paused timestamp preserves its frame', () => {
  assert.equal(typeof fx.atlasFrame, 'function');
  const clip = { frames: 60, fps: 30 };
  assert.equal(fx.atlasFrame(clip, 0), 0);
  assert.equal(fx.atlasFrame(clip, 0.5), 15);
  assert.equal(fx.atlasFrame(clip, 0.5), 15);
  assert.equal(fx.atlasFrame(clip, 1.999), 59);
  assert.equal(fx.atlasFrame(clip, 2), null);
  assert.equal(fx.atlasFrame(clip, -0.1), null);
});

test('looped playback wraps only the selected loop range', () => {
  assert.equal(typeof fx.atlasFrame, 'function');
  const clip = { frames: 90, fps: 30, loop: [30, 60] };
  assert.equal(fx.atlasFrame(clip, 0.5, true), 15);
  assert.equal(fx.atlasFrame(clip, 2, true), 30);
  assert.equal(fx.atlasFrame(clip, 2.5, true), 45);
  assert.equal(fx.atlasFrame(clip, 3, true), 30);
  assert.equal(fx.atlasFrame(clip, 3, false), null);
});

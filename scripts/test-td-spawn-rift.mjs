import test from 'node:test';
import assert from 'node:assert/strict';
import * as portals from '../src/game/td/world-portals.js';

test('portal animation freezes during pause and follows simulation speed', () => {
  assert.equal(typeof portals.createPortalClock, 'function');
  const tick = portals.createPortalClock();
  assert.equal(tick({ time: 0, running: false }, 1000), 0);
  assert.ok(tick({ time: 0, running: false }, 1050) > 0, 'portal moves before combat');
  const before = tick({ time: 0, paused: true }, 1100);
  assert.equal(tick({ time: 0, paused: true }, 5000), before);
  assert.equal(tick({ time: 0.15, running: true }, 5050), before + 0.15);
  assert.equal(tick({ time: 0, running: false }, 5100), 0, 'restarting resets the clock');
});

test('overlapping atlas samples never go dark or jump at the loop boundary', () => {
  assert.equal(typeof portals.portalLoopSamples, 'function');
  for (const time of [0, 0.25, 0.99, 1, 1.99999, 2, 200.1]) {
    const samples = portals.portalLoopSamples(time, 2);
    assert.equal(samples.length, 2);
    assert.ok(Math.abs(samples[0].alpha + samples[1].alpha - 1) < 1e-9);
    for (const sample of samples) assert.ok(sample.time >= 0 && sample.time < 2);
  }
  const start = portals.portalLoopSamples(2, 2);
  assert.equal(start[0].alpha, 0, 'the abruptly wrapped frame is invisible');
  assert.equal(start[1].alpha, 1, 'the other instance covers the loop seam');
});

test('portal geometry fits the spawn cell for all four exits and skips repeated path points', () => {
  assert.equal(typeof portals.portalLayout, 'function');
  for (const [end, direction] of [[[170, 100], [1, 0]], [[30, 100], [-1, 0]], [[100, 30], [0, -1]], [[100, 170], [0, 1]]]) {
    for (const cell of [62, 94, 118]) {
      const layout = portals.portalLayout([[100, 100], [100, 100], end], cell);
      assert.deepEqual(layout.direction, direction);
      assert.ok(layout.radius < cell / 2, 'the solid footprint cannot reach adjacent tiles');
    }
  }
});

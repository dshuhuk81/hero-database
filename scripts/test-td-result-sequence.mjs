import assert from "node:assert/strict";
import { register } from "node:module";

// Astro resolves extensionless TypeScript imports; make Node's focused test runner do
// the same without adding a test-only dependency.
register("./lib/test-ts-resolver.mjs", import.meta.url);

const { createStageClear, SCENE_MS } = await import("../src/game/td/page/stage-clear.ts");

// A defeat gets the same timed presentation as a clear, but has only two steps:
// Defeat first, then the dedicated advice/statistics page. This catches regressions that
// skip the presentation, enter a victory scene, or fall back to the old DPS report.
{
  const resultEl = {
    dataset: { view: "report" },
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
  };
  let pending = null;
  let cleared = 0;
  let finished = 0;
  const originalWindow = globalThis.window;
  globalThis.window = {
    setTimeout(callback, delay) {
      pending = { callback, delay };
      return 17;
    },
    clearTimeout(id) {
      if (id !== undefined) cleared += 1;
    },
  };

  try {
    const sequence = createStageClear({
      q(selector) {
        assert.equal(selector, "[data-td-result]");
        return resultEl;
      },
      heroById: new Map(),
    }, () => { finished += 1; });

    sequence.playDefeat();
    assert.equal(resultEl.dataset.view, "defeat", "defeat presentation is shown first");
    assert.equal(resultEl.attributes["aria-labelledby"], "td-defeat-title", "dialog is labelled by the defeat heading");
    assert.equal(pending.delay, SCENE_MS, "defeat presentation uses the clear-screen scene timing");
    assert.equal(finished, 0, "final report is not focused before the blend");

    pending.callback();
    assert.equal(resultEl.dataset.view, "loss", "defeat blends to the dedicated loss page");
    assert.equal(resultEl.attributes["aria-labelledby"], "td-loss-title", "loss page restores its accessible label");
    assert.equal(finished, 1, "the loss-page action receives focus after the blend");
    assert.equal(cleared, 1, "only the active transition timer is cleared");
  } finally {
    globalThis.window = originalWindow;
  }
}

// Leaving the result screen cancels the pending blend and never focuses an action from a
// screen that is no longer open.
{
  const resultEl = { dataset: {}, setAttribute() {} };
  let timerId = null;
  let cancelledId = null;
  let finished = 0;
  const originalWindow = globalThis.window;
  globalThis.window = {
    setTimeout() { timerId = 23; return timerId; },
    clearTimeout(id) { cancelledId = id; },
  };

  try {
    const sequence = createStageClear({ q: () => resultEl, heroById: new Map() }, () => { finished += 1; });
    sequence.playDefeat();
    sequence.stop();
    assert.equal(cancelledId, timerId, "leaving the result screen cancels the defeat transition");
    assert.equal(finished, 0, "a cancelled transition does not focus the report action");
  } finally {
    globalThis.window = originalWindow;
  }
}

console.log("TD result sequence tests passed");

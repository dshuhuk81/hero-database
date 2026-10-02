import assert from "node:assert/strict";
import { createStageClear, SCENE_MS } from "../src/game/td/page/stage-clear.ts";

// A defeat gets the same timed presentation as a clear, but has only two steps:
// Defeat first, then the existing detailed run report. This catches regressions that
// skip the presentation, enter a victory scene, or leave the report hidden afterward.
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
    assert.equal(resultEl.dataset.view, "report", "defeat blends to the detailed report");
    assert.equal(resultEl.attributes["aria-labelledby"], "td-result-title", "detailed report restores its accessible label");
    assert.equal(finished, 1, "the report action receives focus after the blend");
    assert.equal(cleared, 1, "only the active transition timer is cleared");
  } finally {
    globalThis.window = originalWindow;
  }
}

console.log("TD result sequence tests passed");

import assert from "node:assert/strict";
import { createPauseController, fitRect, placePopover, slotHitRadius, worldToLocal } from "../src/game/td/ui.js";
import { buildRunTuning, isFavorNodeActive, ACTIVE_FAVOR_EFFECTS } from "../src/game/td/favor.js";
import { canvasPoint, nearestSlot } from "../src/game/td/render.js";
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import favorTreeData from "../src/data/favorTree.json" with { type: "json" };

// --- fitRect: world fits width AND height, aspect preserved ---
{
  const cases = [
    [667, 375], [844, 390], [915, 412], [390, 844], [1024, 768], [1440, 900], [676, 390], [500, 300],
  ];
  for (const [w, h] of cases) {
    const fit = fitRect(w, h);
    assert.ok(fit.width <= w && fit.height <= h, `fits ${w}x${h}`);
    assert.ok(Math.abs(fit.width / fit.height - 16 / 9) < 0.02, `aspect kept ${w}x${h}`);
    assert.ok(fit.width === Math.floor(w) || fit.height === Math.floor(h), `fills one axis ${w}x${h}`);
  }
  assert.deepEqual(fitRect(960, 0), { width: 960, height: 540 }, "missing height falls back to width");
  assert.deepEqual(fitRect(0, 0), { width: 960, height: 540 }, "missing width falls back to world size");
}

// --- Coordinates: canvasPoint and worldToLocal round-trip on a letterboxed canvas ---
{
  const container = { left: 88, top: 0, width: 676, height: 390 };
  const fit = fitRect(container.width, container.height);
  const canvasRect = { left: container.left + (container.width - fit.width) / 2, top: container.top + (container.height - fit.height) / 2, width: fit.width, height: fit.height };
  const canvas = { getBoundingClientRect: () => canvasRect };
  for (const map of maps) {
    for (const [x, y] of [...map.roadSlots, ...map.platformSlots]) {
      const local = worldToLocal(canvasRect, container, { x, y });
      const back = canvasPoint(canvas, { clientX: local.x + container.left, clientY: local.y + container.top });
      assert.ok(Math.abs(back.x - x) < 1e-6 && Math.abs(back.y - y) < 1e-6, `round-trip ${map.id} ${x},${y}`);
      const slot = nearestSlot(map, back, slotHitRadius(fit.width / 960, "touch"));
      assert.ok(slot, `ring reachable ${map.id} ${x},${y}`);
    }
  }
}

// --- slotHitRadius: screen-space target, bounded ---
{
  assert.equal(slotHitRadius(1, "mouse"), 38, "desktop keeps the old radius");
  assert.ok(slotHitRadius(0.5, "touch") * 0.5 >= 28 || slotHitRadius(0.5, "touch") === 60, "touch target >= 28px radius when not capped");
  assert.equal(slotHitRadius(0.2, "touch"), 60, "radius capped");
  const minSlotGap = Math.min(...maps.map((map) => {
    const slots = [...map.roadSlots, ...map.platformSlots];
    let min = Infinity;
    for (let i = 0; i < slots.length; i += 1) for (let j = i + 1; j < slots.length; j += 1) min = Math.min(min, Math.hypot(slots[i][0] - slots[j][0], slots[i][1] - slots[j][1]));
    return min;
  }));
  // Between two rings the nearest one wins deterministically.
  const map = maps[0];
  const [a, b] = [map.roadSlots[2], map.roadSlots[3]];
  const nearA = { x: a[0] + (b[0] - a[0]) * 0.2, y: a[1] + (b[1] - a[1]) * 0.2 };
  assert.deepEqual({ ...nearestSlot(map, nearA, 60), distance: 0 }, { type: "road", index: 2, distance: 0 }, "nearest ring wins");
  assert.ok(minSlotGap > 60, "max radius smaller than ring spacing");
}

// --- placePopover: all four edges ---
{
  const bounds = { width: 800, height: 450 };
  const size = { width: 248, height: 180 };
  const inside = (p) => p.x >= 8 && p.y >= 8 && p.x + size.width <= bounds.width - 8 && p.y + size.height <= bounds.height - 8;
  const coversAnchor = (p, a) => a.x >= p.x && a.x <= p.x + size.width && a.y >= p.y && a.y <= p.y + size.height;
  const anchors = {
    center: { x: 400, y: 225 },
    leftEdge: { x: 10, y: 225 },
    rightEdge: { x: 790, y: 225 },
    topEdge: { x: 400, y: 10 },
    bottomEdge: { x: 400, y: 440 },
    topLeft: { x: 10, y: 10 },
    bottomRight: { x: 790, y: 440 },
  };
  for (const [name, anchor] of Object.entries(anchors)) {
    const placed = placePopover({ anchor, size, bounds, gap: 20 });
    assert.equal(placed.mode, "anchored", `${name} anchored`);
    assert.ok(inside(placed), `${name} inside bounds`);
    assert.ok(!coversAnchor(placed, anchor), `${name} does not cover the hero`);
  }
  assert.equal(placePopover({ anchor: anchors.rightEdge, size, bounds, gap: 20 }).side, "left", "flips left at right edge");
  assert.equal(placePopover({ anchor: anchors.leftEdge, size, bounds, gap: 20 }).side, "right", "stays right at left edge");
  assert.equal(placePopover({ anchor: { x: 150, y: 100 }, size, bounds: { width: 300, height: 200 } }).mode, "sheet", "sheet when nothing fits");
  assert.equal(placePopover({ anchor: { x: 10, y: 10 }, size, bounds: { width: 200, height: 100 } }).mode, "sheet", "sheet when bounds smaller than popover");
}

// --- Pause controller: reasons, manual pause survives panels ---
{
  let paused = false;
  const pause = createPauseController((value) => { paused = value; });
  pause.add("manual");
  pause.add("panel");
  pause.remove("panel");
  assert.equal(paused, true, "closing a panel keeps a manual pause");
  pause.toggle("manual");
  assert.equal(paused, false, "manual toggle resumes");
  pause.add("recruit");
  pause.add("panel");
  pause.remove("recruit");
  assert.equal(paused, true, "panel still pauses");
  pause.clear();
  assert.equal(paused, false, "clear resumes");
}

// --- Favor: run snapshot and active-node labelling ---
{
  const base = buildRunTuning(tuning, []);
  assert.equal(base.run.startingGold, tuning.run.startingGold, "no nodes, no bonus");
  const gold = favorTreeData.find((node) => node.effect.type === "startingGold");
  const lives = favorTreeData.find((node) => node.effect.type === "lives");
  const boosted = buildRunTuning(tuning, [gold.id, lives.id]);
  assert.equal(boosted.run.startingGold, tuning.run.startingGold + gold.effect.value, "starting gold applied");
  assert.equal(boosted.run.lives, tuning.run.lives + lives.effect.value, "lives applied");
  assert.equal(tuning.run.startingGold, base.run.startingGold, "base tuning not mutated");
  const inactive = favorTreeData.filter((node) => !isFavorNodeActive(node));
  assert.ok(inactive.every((node) => !ACTIVE_FAVOR_EFFECTS.includes(node.effect.type)), "inactive nodes flagged");
  assert.equal(favorTreeData.filter(isFavorNodeActive).length, favorTreeData.length, "every node is active");
}

console.log("Tower defense UI helper checks passed.");

// --- Blessing cards: every tuned effect has a short stat label and a value ---
{
  const { blessingDisplay } = await import("../src/game/td/ui.js");
  const effects = [...Object.values(tuning.virtueEffects), ...(tuning.virtuePairs || []).map((pair) => pair.effect)];
  for (const effect of effects) {
    const shown = blessingDisplay(effect);
    assert.notEqual(shown.tone, "none", `known effect type ${effect.type}`);
    assert.match(shown.value, /^\+\d+%$/, `value formatted ${effect.type}`);
  }
  assert.deepEqual(blessingDisplay({ type: "atk", value: 0.15 }), { value: "+15%", stat: "Attack", tone: "atk" }, "attack card");
  assert.equal(blessingDisplay({ type: "mystery", value: 1 }).tone, "none", "unknown type falls back");
  console.log("Blessing card checks passed.");
}

// --- Buff bar: stacked blessings add up exactly like the simulator ---
{
  const { buffChips } = await import("../src/game/td/ui.js");
  const { TowerDefenseGame } = await import("../src/game/td/sim.js");
  const heroes = (await import("../src/data/gameBalance.json", { with: { type: "json" } })).default;
  const waves = (await import("../src/data/tdWaves.json", { with: { type: "json" } })).default;
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 3 });
  for (const name of ["Wildness", "Desire", "Insight"]) { g.virtueOffer = [name]; g.chooseVirtue(name); }
  const chips = buffChips(g.modifiers());
  const atk = chips.find((chip) => chip.type === "atk");
  const pairBonus = (tuning.virtuePairs || []).find((pair) => pair.name === "Storm Bond")?.effect.value ?? 0;
  const expected = Math.round((tuning.virtueEffects.Wildness.value + tuning.virtueEffects.Desire.value + pairBonus) * 100);
  assert.equal(atk.value, `+${expected}%`, "attack blessings and pair bonus add up");
  assert.deepEqual(chips.map((chip) => chip.type), ["atk", "crit"], "fixed order, zero stats hidden");
  assert.deepEqual(buffChips({ atk: 0, hp: 0 }), [], "no chips without blessings");
  console.log("Buff bar checks passed.");
}

import assert from "node:assert/strict";
import { bleedCanvasSize, createPauseController, fitRect, placePopover, slotHitRadius, tiltView, worldToLocal } from "../src/game/td/ui.js";
import * as ui from "../src/game/td/ui.js";
import { buildRunTuning, TREE } from "../src/game/td/favor.js";
import * as render from "../src/game/td/render.js";
import { enemySheetUrl } from "../src/game/td/assets.js";
import * as mapScene from "../src/game/td/map-scene.js";
const { canvasPoint, nearestSlot } = render;
// Large, slow bosses must visibly cycle their walk poses instead of holding nearly the same
// frame for a whole second. Walking 20 world pixels is Lerna's unimpeded one-second travel.
{
  const phase = render.advanceEnemyWalkPhase;
  const frames = new Set(Array.from({ length: 61 }, (_, tick) =>
    Math.floor(phase(0, tick * 20 / 60, 96, "boss") / (2 * Math.PI) * 8) % 8));
  assert.ok(frames.size >= 5, "Lerna shows at least five walk poses during one second of travel");
  assert.equal(phase(1, 0, 96, "boss"), 1, "stationary or paused enemies do not advance their walk");
  assert.equal(phase(1, 100, 96, "boss"), 1, "teleports do not advance the walk cycle");
  assert.equal(phase(0, 19.8, 44, "grunt"), Math.PI, "normal enemy stride is unchanged");
}
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import campaign from "../src/data/tdCampaign.json" with { type: "json" };

// Squad selection is row-aware: two rendered rows, shared placement rules and mythology chips.
{
  const { readFileSync } = await import("node:fs");
  const lobby = readFileSync(new URL("../src/components/td/TdLobby.astro", import.meta.url), "utf8");
  const controller = readFileSync(new URL("../src/game/td/page/campaign.ts", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles/td.css", import.meta.url), "utf8");
  assert.ok(lobby.includes("data-td-squad-rows"), "Squad screen exposes a two-row host");
  assert.match(controller, /import \{[^}]*placeInSquadRows[^}]*\} from "\.\.\/squad-rows\.js"/, "campaign UI imports the shared placement rule");
  assert.ok(controller.includes("let squadRows") && !controller.includes("let squad: string[]"), "campaign UI stores structured rows instead of a flat local squad");
  assert.ok(controller.includes('data-td-squad-row="${rowIndex}"') && controller.includes('data-squad-slot="${slotIndex}"'), "both row and slot indexes are rendered");
  assert.ok(controller.includes("placeInSquadRows(squadRows, id, activeRow") && controller.includes("placeInSquadRows(squadRows, current.id, rowIndex, slotIndex"), "roster taps and pointer drops use the shared placement rule");
  assert.ok(controller.includes("td-mythology-icon") && controller.includes("group.icon"), "roster and row UI render mythology icons");
  assert.match(css, /\.td-squad-rows\s*\{[\s\S]*grid-template-rows:\s*repeat\(2,/, "lineup CSS reserves two compact rows");
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 430px\)[\s\S]*\.td-squad-row/, "short landscape has an explicit two-row compaction rule");
}

// Combat readability: bars identify allegiance at a glance, rapid numbers merge instead of
// stacking, status pips stay bounded, spawn labels step aside during combat, and bosses use HUD.
assert.equal(typeof render.combatBarStyle, "function", "combat bar styling is exposed");
assert.notEqual(render.combatBarStyle("enemy").healthColor, render.combatBarStyle("hero").healthColor, "enemy and hero health colors are distinct");
assert.ok(render.combatBarStyle("hero").secondaryWidth < 1, "hero ultimate bar is narrower than health");
assert.equal(render.combatBarStyle("boss").overhead, false, "boss health leaves the crowded battlefield");
assert.deepEqual([0, 1, 2, 3, 4].map(render.damageNumberOffset), [-14, 14, 0, -24, 24], "damage numbers fan out around their target");
// Adjacent enemies must not spawn identical overlapping damage labels. Placement is kept
// close to the target, with limited vertical lanes instead of an unbounded tower of text.
{
  const place = render.placeDamageNumber;
  const first = { x: 100, y: 150, width: 32, height: 16 };
  const second = place({ x: 110, y: 150, width: 32, height: 16 }, [first]);
  assert.ok(Math.abs(second.x - first.x) >= 36 || Math.abs(second.y - first.y) >= 20, "neighbouring damage labels have a readable gap");
  const empty = place({ x: 110, y: 150, width: 32, height: 16 }, []);
  assert.deepEqual(empty, { x: 110, y: 150 }, "an isolated number stays over its target");
  const crowded = Array.from({ length: 30 }, (_, i) => ({ x: 110, y: 150 - i * 20, width: 500, height: 16 }));
  const bounded = place({ x: 110, y: 150, width: 32, height: 16 }, crowded);
  assert.ok(Math.abs(bounded.y - 150) <= 60 && Math.abs(bounded.x - 110) <= 16, "crowding cannot push a number far away from its owner");
}
assert.equal(render.shouldMergeDamageNumber({ enemyId: 7, dot: false, crit: false, shielded: false, life: 0.65, maxLife: 0.75 }, { enemyId: 7, dot: false, crit: false, shielded: false }), true, "rapid normal hits merge");
assert.equal(render.shouldMergeDamageNumber({ enemyId: 7, dot: false, crit: false, shielded: false, life: 0.4, maxLife: 0.75 }, { enemyId: 7, dot: false, crit: false, shielded: false }), false, "older hits remain separate");
assert.deepEqual(render.visibleStatusPips(["wet", "burn", "poison", "chill"]), ["wet", "burn", "poison"], "at most three status pips are shown");
assert.equal(mapScene.spawnLabelVisible({ running: false }), true, "spawn label is visible before the stage starts");
assert.equal(mapScene.spawnLabelVisible({ running: true }), false, "spawn label hides during combat");
assert.equal(ui.bossHudState({ enemies: [] }), null, "boss HUD stays hidden without a living boss");
assert.deepEqual(ui.bossHudState({ enemies: [{ kind: "boss", dead: false, hp: 250, maxHp: 1000 }] }), { ratio: 0.25, hp: 250, maxHp: 1000 }, "boss HUD reports the living boss health");

// R18 activation is a run-context decision: Free Play stays opt-in by map, while every current
// and future Campaign stage inherits the shared tilted presentation unless the developer disables
// it through the URL escape hatch.
{
  assert.equal(typeof render.resolveTilt, "function", "renderer exposes a pure tilt resolver");
  const mapById = (id) => maps.find((entry) => entry.id === id);
  const explicit = render.resolveTilt(mapById("moonlit-pass"), tuning.board.tilt);
  assert.deepEqual(explicit, { enabled: true, k: 0.75, offsetY: 55 }, "explicit Free Play map enables R18");

  const freeControl = mapById("moonlit-terraces");
  assert.deepEqual(render.resolveTilt(freeControl, tuning.board.tilt), { enabled: false, k: 1, offsetY: 0 }, "unlisted Free Play map stays flat");
  assert.deepEqual(render.resolveTilt(freeControl, tuning.board.tilt, { campaign: true }), { enabled: true, k: 0.75, offsetY: 55 }, "the same map tilts in Campaign");

  for (const id of ["moonlit-terraces", "sunscar-basin", "sunscar-throne"]) {
    const map = mapById(id);
    assert.ok(map, `${id} exists`);
    assert.equal(render.resolveTilt(map, tuning.board.tilt, { campaign: true }).enabled, true, `${map.grid.board.cols}x${map.grid.board.rows} Campaign map tilts`);
  }

  assert.deepEqual(render.resolveTilt(mapById("moonlit-pass"), tuning.board.tilt, { campaign: true, param: "off" }), { enabled: false, k: 1, offsetY: 0 }, "tilt=off disables R18");
  assert.deepEqual(render.resolveTilt(mapById("moonlit-pass"), tuning.board.tilt, { param: "0.6" }), { enabled: true, k: 0.6, offsetY: 55 }, "numeric URL override wins");
  assert.deepEqual(render.resolveTilt(mapById("proto-slabs"), tuning.board.tilt), { enabled: true, k: 0.85, offsetY: 40 }, "per-map geometry override wins");

  const stages = campaign.chapters.flatMap((chapter) => chapter.stages);
  assert.equal(stages.length, 82, "Campaign fixture covers all current stages");
  for (const stage of stages) {
    const map = mapById(stage.mapId);
    assert.ok(map, `${stage.id} references an existing map`);
    assert.equal(render.resolveTilt(map, tuning.board.tilt, { campaign: true }).enabled, true, `${stage.id} enables R18`);
  }

  const attributes = new Set();
  const playHost = {
    setAttribute: (name) => attributes.add(name),
    removeAttribute: (name) => attributes.delete(name),
  };
  assert.equal(typeof render.syncTiltBleed, "function", "renderer exposes bleed-state synchronization");
  render.syncTiltBleed(playHost, true);
  assert.equal(attributes.has("data-bleed"), true, "tilted runs enable full bleed");
  render.syncTiltBleed(playHost, false);
  assert.equal(attributes.has("data-bleed"), false, "an untilted Free Play run clears stale Campaign bleed");
}

// R18 wide scenery: approved themes use authored panoramic backdrops while themes without one retain
// their ordinary terrain image as the bleed fallback.
assert.equal(mapScene.mapBackdropFor?.({ art: "jungle-heart-v1" }), "/td/maps/jungle-terrain-wide-v1.png", "Jungle selects the panoramic backdrop");
for (const map of maps.filter((map) => map.art === "moonlit-sanctuary-v1")) {
  assert.equal(mapScene.mapBackdropFor(map), "/td/maps/moonlit-terrain-wide-v1.png", `${map.id} shares Moonlit's panoramic backdrop`);
  assert.equal(mapScene.mapSceneFor(map).assets.terrain, "/td/maps/moonlit-terrain-v1.png", `${map.id} retains the original playable terrain`);
}
for (const [art, id, version] of [["verdant-shrine-v1", "verdant", "v2"], ["sunscar-sanctuary-v1", "sunscar", "v1"]]) {
  assert.equal(mapScene.mapBackdropFor({ art }), `/td/maps/${id}-terrain-wide-v1.png`, `${id} selects its own panorama`);
  assert.equal(mapScene.mapSceneFor({ art }).assets.terrain, `/td/maps/${id}-terrain-${version}.png`, `${id} keeps its selected playable terrain`);
}

{
  const { ENVIRONMENTS } = await import("../src/game/td/environments.js");
  for (const environment of Object.values(ENVIRONMENTS)) {
    const map = { art: `${environment.id}-sanctuary-v1` };
    assert.equal(mapScene.mapBackdropFor(map), `/td/maps/${environment.id}-terrain-wide-v1.png`, `${environment.id} selects its own panorama, not shared architecture's theme`);
    assert.equal(mapScene.mapSceneFor(map).assets.terrain, `/td/maps/${environment.id}-terrain-v1.png`, `${environment.id} keeps the original playable terrain`);
  }
}
{
  const { existsSync } = await import("node:fs");
  for (const scene of Object.values(mapScene.MAP_SCENES)) {
    assert.ok(existsSync(new URL(`../public${scene.assets.bleed}`, import.meta.url)), `${scene.name} panorama exists in public assets`);
  }
  assert.equal(mapScene.mapBackdropFor({ art: "unknown-future-theme" }), null, "unknown art is not replaced with another theme");
}

// R18 rollout: the first public review matrix covers both established board sizes and both
// gate counts. All four maps use the shared renderer path; theme art may still use its fallback.
{
  const matrix = [
    ["moonlit-pass", 8, 4, 1],
    ["sunscar-ruins", 8, 4, 2],
    ["sunscar-basin", 9, 5, 1],
    ["jungle-flooded-court", 9, 5, 2],
  ];
  for (const [id, cols, rows, gates] of matrix) {
    const map = maps.find((entry) => entry.id === id);
    assert.ok(map, `${id} exists`);
    assert.deepEqual([map.grid.board.cols, map.grid.board.rows, map.lanes?.length ?? 1], [cols, rows, gates], `${id} represents ${cols}x${rows}, ${gates} gate(s)`);
    assert.ok(tuning.board.tilt.maps.includes(id), `${id} uses the shared R18 presentation`);
  }
}

// Phones have no portrait gameplay layout. The modal orientation gate pauses the whole game and
// asks coarse-pointer phones below 768 px to rotate; short-landscape overlays stay compact.
{
  const { readFileSync } = await import("node:fs");
  const orient = readFileSync(new URL("../src/game/td/page/orient.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/components/pages/TowerDefensePage.astro", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles/td.css", import.meta.url), "utf8");
  assert.match(orient, /orientation: portrait[^\n]*pointer: coarse[^\n]*max-width: 767px/, "portrait phone gate owns the unsupported orientation");
  assert.ok(orient.includes('pause.add("orient")') && page.includes("Rotate your phone"), "portrait gate pauses and tells the player to rotate");
  const compact = css.slice(css.indexOf("/* R18 prototype (D)"));
  assert.match(compact, /\.td-play\[data-bleed\][\s\S]*?\.td-stage-name[\s\S]*?white-space:\s*nowrap/, "map rule chip is a compact single line");
  assert.match(compact, /\.td-play\[data-bleed\][\s\S]*?\.td-stage \.td-notice[\s\S]*?max-width:\s*min\(360px/, "battle notices have a compact width cap");
}

// Board unit scale: bosses already have larger source art, so they can be tuned separately
// without shrinking the regular enemies the owner sized by eye.
assert.equal(typeof render.enemyRenderScale, "function", "renderer exposes enemy scale selection");
assert.equal(render.enemyRenderScale("grunt", tuning.board), tuning.board.enemyScale, "regular enemies use enemyScale");
assert.equal(render.enemyRenderScale("boss", tuning.board), tuning.board.bossScale, "bosses use bossScale");
assert.equal(render.enemyRenderScale("boss", { enemyScale: 1.4 }), 1.4, "legacy board rules use enemyScale for bosses");
assert.equal(render.enemyRenderScale("grunt", null), 1, "classic enemies keep their original scale");
assert.equal(render.enemyRenderScale("boss", null), 1, "classic bosses keep their original scale");

// World portal timing, footprint and exit directions are covered by test-td-spawn-rift.mjs.

// Lilith's walk steps foot by foot in a sharp sheet (frames ~196 px, not the usual ~100 px) and
// she stays opaque while her children make her untargetable; targetability is a simulation rule,
// not a transparency effect.
assert.match(enemySheetUrl("boss-lilith", "v4") ?? "", /clips\/boss-lilith-v4b\.json$/, "Lilith uses the remade sharp animation sheet");
assert.equal(render.enemyRenderAlpha?.({ kind: "boss", untargetable: true }), 1, "untargetable Lilith remains fully opaque");
assert.ok(render.enemyRenderAlpha?.({ kind: "burrower", untargetable: true, burrowedUntil: 5 }) < 0.3, "a diving Burrower is nearly invisible");
assert.equal(render.enemyRenderAlpha?.({ kind: "burrower", untargetable: false, burrowedUntil: 0 }), 1, "a surfaced Burrower is opaque");

// Placement hierarchy: empty tiles stay quiet until a hero is actively being placed.
assert.equal(render.slotVisualMode?.(null, "road"), "idle", "road tiles are quiet without an active placement");
assert.equal(render.slotVisualMode?.(null, "platform"), "idle", "platform tiles are quiet without an active placement");
assert.equal(render.slotVisualMode?.("road", "road"), "eligible", "matching road tiles light up during placement");
assert.equal(render.slotVisualMode?.("road", "platform"), "dim", "non-matching platform tiles recede during road placement");
assert.equal(render.slotVisualMode?.("platform", "platform"), "eligible", "matching platform tiles light up during placement");
assert.equal(render.slotVisualMode?.("platform", "road"), "dim", "non-matching road tiles recede during platform placement");

// Ground units share one depth plane: the lower foot point draws in front. Flyers remain above it.
assert.ok(render.unitDepth?.(280, "enemy") < render.unitDepth?.(300, "hero"), "approaching enemy stays behind the lower hero");
assert.ok(render.unitDepth?.(320, "enemy") > render.unitDepth?.(300, "hero"), "enemy below the hero draws in front");
assert.ok(render.unitDepth?.(200, "flyer") > render.unitDepth?.(500, "hero"), "flyer stays above ground units");

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

// --- R18 landscape bleed: world scale follows height on wide phones ---
{
  assert.deepEqual(bleedCanvasSize(797, 360), { width: 621, height: 349 }, "797x360 keeps the reference hero scale");
  assert.deepEqual(bleedCanvasSize(2392, 1080), { width: 1864, height: 1048 }, "ultrawide phones stay height-led");
  assert.deepEqual(bleedCanvasSize(667, 375), { width: 647, height: 364 }, "narrow landscape still fits the full world");
}

// --- Coordinates: tilted canvas input stays aligned across representative board geometries ---
{
  const previous = { ...tiltView };
  const representatives = ["proto-slabs", "moonlit-pass", "sunscar-basin"].map((id) => maps.find((map) => map.id === id));
  for (const view of [{ k: 0.7, offsetY: 70 }, { k: 0.85, offsetY: 40 }]) {
    Object.assign(tiltView, view);
    for (const [width, height] of [[797, 360], [844, 390], [915, 412]]) {
      const container = { left: 0, top: 0, width, height };
      const fit = bleedCanvasSize(container.width, container.height);
      const canvasRect = { left: (container.width - fit.width) / 2, top: (container.height - fit.height) / 2, width: fit.width, height: fit.height };
      const canvas = { getBoundingClientRect: () => canvasRect };
      for (const map of representatives) {
        assert.ok(map, "representative board exists");
        const slots = [...map.roadSlots, ...map.platformSlots];
        const edgeSlots = [
          slots.reduce((a, b) => b[0] < a[0] ? b : a),
          slots.reduce((a, b) => b[0] > a[0] ? b : a),
          slots.reduce((a, b) => b[1] < a[1] ? b : a),
          slots.reduce((a, b) => b[1] > a[1] ? b : a),
        ];
        for (const [x, y] of edgeSlots) {
          const local = worldToLocal(canvasRect, container, { x, y });
          const back = canvasPoint(canvas, { clientX: local.x, clientY: local.y });
          assert.ok(Math.abs(back.x - x) < 1e-6 && Math.abs(back.y - y) < 1e-6, `tilted edge round-trip ${map.id} k${view.k} ${width}x${height} ${x},${y}`);
          assert.ok(nearestSlot(map, back, slotHitRadius(fit.width / 960, "touch")), `tilted edge tile reachable ${map.id} k${view.k} ${width}x${height} ${x},${y}`);
        }
      }
    }
  }

  // The 6x3 prototype's 96 px tile is only 26.4 CSS px tall after tilt on the reference
  // phone. A touch 27 px from its centre is therefore just outside the painted tile, but must
  // remain inside the promised 28 px touch halo. This catches distance checks that ignore tilt.
  const container = { left: 0, top: 0, width: 797, height: 360 };
  const fit = bleedCanvasSize(container.width, container.height);
  const canvasRect = { left: (container.width - fit.width) / 2, top: (container.height - fit.height) / 2, width: fit.width, height: fit.height };
  const canvas = { getBoundingClientRect: () => canvasRect };
  Object.assign(tiltView, { k: 0.85, offsetY: 40 });
  const prototype = representatives[0];
  const platformIndex = 5; // bottom-left tile has no neighbour below it
  const [x, y] = prototype.platformSlots[platformIndex];
  const local = worldToLocal(canvasRect, container, { x, y });
  const below = canvasPoint(canvas, { clientX: local.x, clientY: local.y + 27 });
  const hit = nearestSlot(prototype, below, slotHitRadius(fit.width / 960, "touch"));
  assert.deepEqual(hit && { type: hit.type, index: hit.index }, { type: "platform", index: platformIndex }, "tilt preserves the 28px vertical touch halo");
  Object.assign(tiltView, previous);
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
  // Tiles (M22b) sit edge to edge, closer than the hit radius; nearest wins, so a tap
  // always picks the tile it lands in.
  assert.ok(minSlotGap >= 52, "tiles do not overlap");
  // Every point inside a drawn 56 px tile picks that tile, including the corners of
  // staggered tiles at road bends (M24 slot readability).
  for (const tileMap of maps) {
    for (const type of ["road", "platform"]) {
      (type === "road" ? tileMap.roadSlots : tileMap.platformSlots).forEach(([x, y], index) => {
        for (let dx = -27; dx <= 27; dx += 3) for (let dy = -27; dy <= 27; dy += 3) {
          const hit = nearestSlot(tileMap, { x: x + dx, y: y + dy }, 38);
          assert.ok(hit && hit.type === type && hit.index === index, `${tileMap.id} ${type} ${index}: tap at ${dx},${dy} picks its own tile`);
        }
      });
    }
  }
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

// --- Favor: run snapshot ---
{
  const base = buildRunTuning(tuning, {});
  assert.equal(base.run.startingPlacement, tuning.run.startingPlacement, "no nodes, no bonus");
  const gold = TREE.nodes.find((node) => node.effect.type === "startingPlacement");
  const lives = TREE.nodes.find((node) => node.effect.type === "lives");
  const boosted = buildRunTuning(tuning, { [gold.id]: 1, [lives.id]: 1 });
  assert.equal(boosted.run.startingPlacement, tuning.run.startingPlacement + gold.effect.value, "starting gold applied");
  assert.equal(boosted.run.lives, tuning.run.lives + lives.effect.value, "lives applied");
  assert.equal(tuning.run.startingPlacement, base.run.startingPlacement, "base tuning not mutated");
}

console.log("Tower defense UI helper checks passed.");

// M14 run statistics: damage rows, short numbers, loss report.
{
  const { damageRows, shortNumber, lossReport } = await import("../src/game/td/ui.js");
  const rows = damageRows({ a: { id: "a", name: "A", damage: 300, heal: 0, buff: 0 }, b: { id: "b", name: "B", damage: 100, heal: 50, buff: 0 }, c: { id: "c", name: "C", damage: 0, heal: 10, buff: 90 } });
  assert.deepEqual(rows.map((r) => r.id), ["a", "b", "c"], "sorted by damage, then support");
  assert.equal(rows[0].share, 0.75, "damage share");
  assert.deepEqual([shortNumber(950), shortNumber(1234), shortNumber(12400), shortNumber(1.25e6)], ["950", "1.2k", "12k", "1.3M"]);
  assert.equal(lossReport({ leakKinds: {} }), null, "no leaks, no report");
  const report = lossReport({ leakKinds: { flyer: 6, runner: 2 } });
  assert.equal(report.kind, "flyer");
  assert.equal("wave" in report, false, "the loss report has no wave number");
  assert.equal(report.share, 0.75);
  assert.ok(report.hint.includes("platform"), "flyer hint");
  assert.equal(lossReport({ leakKinds: { broodcaller: 2, imp: 3, runner: 4 } }).kind, "broodcaller", "imps count with their Broodcaller");
  console.log("Run statistics checks passed.");
}

// R4: the battle hero panel shows permanent collection progress and offers Relocate and Sell,
// with no battle upgrade controls left.
{
  const { heroProgress } = await import("../src/game/td/ui.js");
  const { readFileSync } = await import("node:fs");
  const full = heroProgress({ class: "Tank", campaignLevel: 7, campaignStars: 3, campaignEvolution: 2, campaignSkillLevels: { ultimate: 4, passiveAttack: 2 } });
  assert.deepEqual({ level: full.level, stars: full.stars, evolution: full.evolution }, { level: 7, stars: 3, evolution: 2 }, "collection progress");
  assert.deepEqual(full.skills.map((s) => [s.id, s.level]), [["ultimate", 4], ["passiveAttack", 2], ["passiveHealth", 1]], "skill levels with level 1 defaults");
  const legacy = heroProgress({ class: "Mage" });
  assert.deepEqual({ level: legacy.level, stars: legacy.stars, evolution: legacy.evolution }, { level: 1, stars: 0, evolution: 0 }, "hero without campaign data falls back");
  assert.ok(legacy.skills.every((s) => s.level === 1), "fallback skill levels");
  const markup = readFileSync(new URL("../src/components/td/TdOverlays.astro", import.meta.url), "utf8");
  const panel = markup.slice(markup.indexOf("data-td-popover"), markup.indexOf("</aside>"));
  assert.ok(panel.includes("data-pop-relocate") && panel.includes("data-pop-sell"), "Relocate and Sell");
  assert.ok(panel.includes("data-pop-progress"), "permanent progress summary");
  for (const gone of ["data-pop-upgrade", "data-pop-focus", "data-pop-path", "Upgrade", "Awaken", "Train"]) assert.ok(!panel.includes(gone), `no ${gone} in the hero panel`);
  const script = readFileSync(new URL("../src/game/td/page/popover.ts", import.meta.url), "utf8");
  for (const gone of ["upgradeInfo", "battleRank", "PATH_INFO", "AWAKEN_TEXT", "Battle rank"]) assert.ok(!script.includes(gone), `popover.ts drops ${gone}`);
  console.log("Hero panel checks passed.");
}

// R4 review fixes: redeploy prices use the discounted deployment cost, there is no auto-start
// countdown, and the revive notice no longer names a battle level.
{
  const { readFileSync } = await import("node:fs");
  const read = (path) => readFileSync(new URL(`../src/game/td/page/${path}`, import.meta.url), "utf8");
  const hud = read("hud.ts"), recruit = read("recruit.ts"), session = read("session.ts");
  const fallen = hud.slice(hud.indexOf("[data-deck-fallen]"), hud.indexOf("function cancelDeploy"));
  assert.ok(fallen.includes("game.deployCost(hero.id)") && !/hero\.cost\b/.test(fallen), "fallen deck buttons price with deployCost");
  const redeploy = recruit.slice(recruit.indexOf("if (state.deployHeroId) {"), recruit.indexOf("// Drag a hero from the bar"));
  assert.ok(!/hero\.cost\b/.test(redeploy), "redeploy notice prices with deployCost");
  assert.ok(!hud.includes("autoNext") && !hud.includes("countdownHeld"), "there is no auto-start countdown any more");
  assert.ok(!session.includes("(level 1, half health)"), "revive notice drops the battle level");
  console.log("R4 review fix checks passed.");
}

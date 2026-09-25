// Divine Blessings graph (docs/tower-defense-blessings-research.md): the Favor trunk
// on top, one Insight branch per hero class below, drawn as a pannable, zoomable
// node graph with a detail panel. Nodes are real buttons, so keyboard and screen
// readers work; dragging pans, the wheel and pinch zoom.
import { TREE, CLASSES, canBuy, findNode, levelCost, nodeCurrency, pointsIn } from "../favor.js";
import type { PageContext } from "./context";
import { availableFavor, availableInsight } from "./save";
import { classIconImg } from "../assets.js";

const U = 84; // grid unit in world px
const NODE = 60; // node button size
const BRANCH_COLS = 2;
const BRANCH_GAP = 1;
const TRUNK_COLS = 4;
const BRANCH_TOP = 5.6; // first branch row (grid rows)
const WORLD_COLS = CLASSES.length * BRANCH_COLS + (CLASSES.length - 1) * BRANCH_GAP;
const TRUNK_X = (WORLD_COLS - TRUNK_COLS) / 2;
const PAD = 0.6; // grid units around the world

const GLYPHS: Record<string, string> = {
  startingGold: "Gold", lives: "Life", showHp: "Scout", heroHp: "HP", killGold: "Loot", ultCharge: "Ult",
  synergyTag: "Bond", wave1Speed: "Slow", upgradeDiscount: "Cost", clearBonus: "Clear", contactRange: "Wall",
  extraOffer: "+1", bossDamage: "Boss", atk: "ATK", hp: "HP", aps: "SPD", range: "RNG",
  startLevel: "Lv2", blockLimit: "Hold", execute: "Exec", rangeFlat: "RNG", crit: "Crit", support: "Heal",
  cleave: "Cleave", dash: "Dash", splash: "AoE", pierce: "Pierce",
  ultPower: "Pow", awakenDiscount: "Rite", awakenBonus: "Apex",
};

const branchIndex = (tree: string) => CLASSES.indexOf(tree);
const branchX = (index: number) => index * (BRANCH_COLS + BRANCH_GAP);

// Grid position (columns, rows) of a node's centre.
function gridPos(node: any) {
  if (node.tree === "trunk") return { x: TRUNK_X + node.col + 0.5, y: node.row + 0.5 };
  return { x: branchX(branchIndex(node.tree)) + node.col + 0.5, y: BRANCH_TOP + node.row + 0.5 };
}
const px = (grid: number) => (grid + PAD) * U;

// Effect text for a level: {v} is value x level, {p} the same as a percentage.
function effectText(node: any, level: number) {
  const v = node.effect.value * Math.max(1, level);
  const pct = `${Math.round(v * 1000) / 10}%`;
  return node.text.replace("{v}", String(Math.round(v * 100) / 100)).replace("{p}", pct);
}

const currencyName = (node: any) => (nodeCurrency(node) === "favor" ? "Favor" : `${node.tree} Insight`);

export function createBlessingsGraph(ctx: PageContext, deps: { onChange(): void; appliesNow(): boolean }) {
  const { q, state, store } = ctx;
  const host = q("[data-td-favor-tree]");
  let selectedId: string = TREE.nodes[0].id;
  let view = { x: 0, y: 0, scale: 1 };
  let fitted = false;
  let resetArmed = false;

  const nodes: any[] = TREE.nodes;
  const worldW = (WORLD_COLS + PAD * 2) * U;
  const worldH = (BRANCH_TOP + 7 + PAD * 2) * U;

  function available(node: any) {
    return nodeCurrency(node) === "favor" ? availableFavor(store.data) : availableInsight(store.data, node.tree);
  }

  function status(node: any) {
    const level = store.data.favLevels[node.id] || 0;
    if (level >= node.maxLevel) return "is-max";
    if (!canBuy(node.id, store.data.favLevels).ok) return level ? "is-owned" : "is-locked";
    return available(node) >= levelCost(node, level + 1) ? "is-available" : level ? "is-owned" : "is-short";
  }

  // Lines: trunk spine and tier bars, a bus to every branch, branch spines and row bars.
  function edgesSvg() {
    const lines: string[] = [];
    const line = (x1: number, y1: number, x2: number, y2: number, on: boolean, color = "") =>
      lines.push(`<line x1="${px(x1)}" y1="${px(y1)}" x2="${px(x2)}" y2="${px(y2)}" class="${on ? "is-on" : ""}"${color ? ` style="--edge:${color}"` : ""} />`);
    const trunkPoints = pointsIn(store.data.favLevels, "trunk");
    const cx = TRUNK_X + TRUNK_COLS / 2;
    const trunkRows = [...new Set(nodes.filter((n) => n.tree === "trunk").map((n) => n.row))].sort();
    for (const row of trunkRows) {
      const inRow = nodes.filter((n) => n.tree === "trunk" && n.row === row).map((n) => gridPos(n).x);
      const need = Math.max(...nodes.filter((n) => n.tree === "trunk" && n.row === row).map((n) => n.requiresPoints || 0));
      line(Math.min(...inRow, cx), row + 0.5, Math.max(...inRow, cx), row + 0.5, trunkPoints >= need);
      if (row > 0) line(cx, row - 0.5, cx, row + 0.5, trunkPoints >= need);
    }
    const busY = BRANCH_TOP - 0.9;
    line(cx, trunkRows.at(-1)! + 0.5, cx, busY, true);
    line(branchX(0) + BRANCH_COLS / 2, busY, branchX(CLASSES.length - 1) + BRANCH_COLS / 2, busY, true);
    CLASSES.forEach((cls: string, index: number) => {
      const bx = branchX(index) + BRANCH_COLS / 2;
      const color = `var(--td-class-${cls.toLowerCase()})`;
      const points = pointsIn(store.data.favLevels, cls);
      line(bx, busY, bx, BRANCH_TOP + 0.5, true, color);
      const rows = [...new Set(nodes.filter((n) => n.tree === cls).map((n) => n.row))].sort((a, b) => a - b);
      for (const row of rows) {
        const inRow = nodes.filter((n) => n.tree === cls && n.row === row);
        const need = Math.max(...inRow.map((n) => n.requiresPoints || 0));
        const xs = inRow.map((n) => gridPos(n).x);
        if (xs.length > 1 || xs[0] !== bx) line(Math.min(...xs, bx), BRANCH_TOP + row + 0.5, Math.max(...xs, bx), BRANCH_TOP + row + 0.5, points >= need, color);
        if (row > 0) line(bx, BRANCH_TOP + row - 0.5, bx, BRANCH_TOP + row + 0.5, points >= need, color);
      }
    });
    return `<svg class="td-bgraph-edges" width="${worldW}" height="${worldH}" aria-hidden="true">${lines.join("")}</svg>`;
  }

  function labelsHtml() {
    // Name on top, currency underneath; class branches lead with their class icon.
    const trunk = `<div class="td-bgraph-label td-bgraph-label--trunk" style="left:${px(TRUNK_X + TRUNK_COLS / 2)}px;top:${px(-0.3)}px">` +
      `<span class="td-bgraph-label-text"><strong>Divine trunk</strong><small>${availableFavor(store.data)} Favor</small></span></div>`;
    const branches = CLASSES.map((cls: string, index: number) =>
      `<div class="td-bgraph-label" style="left:${px(branchX(index) + BRANCH_COLS / 2)}px;top:${px(BRANCH_TOP - 0.4)}px;--edge:var(--td-class-${cls.toLowerCase()})">` +
      `${classIconImg(cls, 26)}<span class="td-bgraph-label-text"><strong>${cls}</strong><small>${availableInsight(store.data, cls)} Insight</small></span></div>`).join("");
    return trunk + branches;
  }

  function nodesHtml() {
    return nodes.map((node) => {
      const pos = gridPos(node);
      const level = store.data.favLevels[node.id] || 0;
      const color = node.tree === "trunk" ? "var(--accent-gold)" : `var(--td-class-${node.tree.toLowerCase()})`;
      const label = `${node.name}, ${node.tree === "trunk" ? "Divine trunk" : `${node.tree} ${node.stage}`}, level ${level} of ${node.maxLevel}`;
      return `<button type="button" class="td-bnode ${status(node)}${node.id === selectedId ? " is-selected" : ""}" data-bnode="${node.id}" ` +
        `style="left:${px(pos.x) - NODE / 2}px;top:${px(pos.y) - NODE / 2}px;--node:${color}" aria-label="${label}">` +
        `<span class="td-bnode-glyph">${GLYPHS[node.effect.type] ?? "?"}</span><span class="td-bnode-level">${level}/${node.maxLevel}</span></button>`;
    }).join("");
  }

  function detailHtml() {
    const node = findNode(selectedId);
    if (!node) return "";
    const level = store.data.favLevels[node.id] || 0;
    const check = canBuy(node.id, store.data.favLevels);
    const cost = level < node.maxLevel ? levelCost(node, level + 1) : 0;
    const have = available(node);
    const where = node.tree === "trunk" ? "Divine trunk" : `${classIconImg(node.tree, 18)}${node.tree} - ${node.stage}`;
    const pending = !deps.appliesNow() && !!state.session && (state.session.favLevels[node.id] || 0) !== level;
    const exclusive = node.exclusive ? `<p class="td-bdetail-note">Pick one: ${nodes.filter((n) => n.tree === node.tree && n.exclusive === node.exclusive).map((n) => n.name).join(" or ")}.</p>` : "";
    // Label above its text, so long effects wrap cleanly instead of flowing under the label.
    const row = (label: string, text: string) => `<div class="td-bdetail-row"><span class="td-bdetail-k">${label}</span><p>${text}</p></div>`;
    let action = "";
    if (level >= node.maxLevel) action = `<p class="td-bdetail-state">Fully unlocked.</p>`;
    else if (!check.ok) action = row("Locked", check.reason);
    else action = `<button type="button" class="action-button action-button--primary td-bdetail-buy" data-bbuy="${node.id}"${have < cost ? " disabled" : ""}>` +
      `<span>${level ? `Level ${level + 1}` : "Unlock"}</span><span>${cost} ${currencyName(node)}</span></button>` +
      (have < cost ? `<p class="td-bdetail-state">Need ${cost - have} more ${currencyName(node)}.</p>` : "");
    return `<p class="td-label td-bdetail-where">${where}</p><h3>${node.name}</h3>` +
      `<p class="td-bdetail-level">Level ${level} of ${node.maxLevel}${pending ? ` <span class="td-wave-chip td-wave-chip--pending">From next run</span>` : ""}</p>` +
      (level ? row("Now", effectText(node, level)) : "") +
      (level < node.maxLevel ? row(level ? "Next" : "Gives", effectText(node, level + 1)) : "") +
      exclusive + action;
  }

  function summaryHtml() {
    const insight = CLASSES.map((cls: string) =>
      `<span class="td-bchip" style="--edge:var(--td-class-${cls.toLowerCase()})">${classIconImg(cls, 16)}${cls} <b>${availableInsight(store.data, cls)}</b></span>`).join("");
    const refund = store.data.refundNotice
      ? `<p class="td-favor-note td-bnotice">The Divine Blessings were rebuilt: ${store.data.refundNotice} Favor from your earlier purchases was refunded. <button type="button" class="td-link-button" data-bdismiss>OK</button></p>` : "";
    return `<div class="td-bsummary"><span class="td-bchip td-bchip--favor"><b>${availableFavor(store.data)}</b> Favor</span>${insight}</div>` +
      `<p class="td-favor-note td-bexplain">Favor comes from every run. Insight goes to the class of each hero you deploy: ${TREE.insight.perWave} per wave it stands on the field, 1 per ${TREE.insight.killsPerPoint} kills.</p>` + refund;
  }

  function resetHtml() {
    const anything = Object.keys(store.data.favLevels).length > 0;
    if (!anything) return "";
    const cost = TREE.reset.favorCost;
    const can = availableFavor(store.data) >= cost;
    return `<button type="button" class="td-respec${resetArmed ? " is-armed" : ""}" data-breset${can ? "" : " disabled"}>` +
      (resetArmed ? `Confirm: reset all blessings for ${cost} Favor` : `Reset all blessings (${cost} Favor, refunds everything else)`) + `</button>`;
  }

  function applyView() {
    const world = host.querySelector<HTMLElement>(".td-bgraph-world");
    if (world) world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
  }

  // Whole tree in view. On first open a narrow screen would shrink it past reading size,
  // so it starts at READABLE_SCALE on the Divine trunk instead (Fit still shows all).
  const READABLE_SCALE = 0.55;
  function fit(initial = false) {
    const viewport = host.querySelector<HTMLElement>(".td-bgraph");
    if (!viewport) return;
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    if (!w || !h) return;
    const whole = Math.min(1, w / worldW, h / worldH);
    if (initial && whole < READABLE_SCALE) {
      view.scale = READABLE_SCALE;
      view.x = w / 2 - px(TRUNK_X + TRUNK_COLS / 2) * view.scale;
      view.y = 0;
    } else {
      view.scale = Math.max(0.18, whole);
      view.x = (w - worldW * view.scale) / 2;
      view.y = Math.max(0, (h - worldH * view.scale) / 2);
    }
    fitted = true;
    applyView();
  }

  function zoomAt(factor: number, cx: number, cy: number) {
    const next = Math.max(0.18, Math.min(1.8, view.scale * factor));
    const k = next / view.scale;
    view.x = cx - (cx - view.x) * k;
    view.y = cy - (cy - view.y) * k;
    view.scale = next;
    applyView();
  }

  // Keeps a node inside the viewport (keyboard focus, detail selection).
  function reveal(id: string) {
    const viewport = host.querySelector<HTMLElement>(".td-bgraph");
    const node = findNode(id);
    if (!viewport || !node) return;
    const pos = gridPos(node);
    const sx = px(pos.x) * view.scale + view.x;
    const sy = px(pos.y) * view.scale + view.y;
    const margin = NODE * view.scale;
    if (sx < margin || sx > viewport.clientWidth - margin) view.x += viewport.clientWidth / 2 - sx;
    if (sy < margin || sy > viewport.clientHeight - margin) view.y += viewport.clientHeight / 2 - sy;
    applyView();
  }

  function render() {
    const focusedId = (document.activeElement as HTMLElement | null)?.dataset?.bnode;
    host.innerHTML = summaryHtml() +
      `<div class="td-bgraph-wrap"><div class="td-bgraph" data-bgraph tabindex="-1">` +
      `<div class="td-bgraph-world" style="width:${worldW}px;height:${worldH}px">${edgesSvg()}${labelsHtml()}${nodesHtml()}</div>` +
      `<div class="td-bgraph-zoom"><button type="button" class="td-icon-button td-icon-button--small" data-bzoom="in" aria-label="Zoom in">+</button>` +
      `<button type="button" class="td-icon-button td-icon-button--small" data-bzoom="out" aria-label="Zoom out">-</button>` +
      `<button type="button" class="td-icon-button td-icon-button--small" data-bzoom="fit" aria-label="Fit the whole tree">Fit</button></div></div>` +
      `<aside class="td-bdetail" aria-live="polite">${detailHtml()}</aside></div>` + resetHtml();
    if (!fitted) requestAnimationFrame(() => fit(true));
    else applyView();
    if (focusedId) host.querySelector<HTMLElement>(`[data-bnode="${focusedId}"]`)?.focus({ preventScroll: true });
  }

  function select(id: string) {
    selectedId = id;
    host.querySelectorAll<HTMLElement>("[data-bnode]").forEach((el) => el.classList.toggle("is-selected", el.dataset.bnode === id));
    const detail = host.querySelector<HTMLElement>(".td-bdetail");
    if (detail) detail.innerHTML = detailHtml();
  }

  function buy(id: string) {
    const node = findNode(id);
    if (!node || !canBuy(id, store.data.favLevels).ok) return;
    const level = store.data.favLevels[id] || 0;
    if (available(node) < levelCost(node, level + 1)) return;
    store.data.favLevels = { ...store.data.favLevels, [id]: level + 1 };
    store.persist();
    resetArmed = false;
    deps.onChange();
    render();
    host.querySelector<HTMLElement>("[data-bbuy]")?.focus({ preventScroll: true });
  }

  function reset() {
    const cost = TREE.reset.favorCost;
    if (availableFavor(store.data) < cost) return;
    store.data.resetSpent = (store.data.resetSpent || 0) + cost;
    store.data.favLevels = {};
    store.persist();
    resetArmed = false;
    deps.onChange();
    render();
  }

  // Pointer handling: one pointer pans (a short tap still clicks the node),
  // two pointers pinch-zoom. The wheel zooms around the cursor.
  const pointers = new Map<number, { x: number; y: number }>();
  let dragged = false;
  let pinchStart = 0;
  host.addEventListener("pointerdown", (event) => {
    const viewport = (event.target as HTMLElement).closest(".td-bgraph");
    if (!viewport || (event.target as HTMLElement).closest(".td-bgraph-zoom")) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragged = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  host.addEventListener("pointermove", (event) => {
    const prev = pointers.get(event.pointerId);
    if (!prev) return;
    const viewport = host.querySelector<HTMLElement>(".td-bgraph")!;
    if (pointers.size === 1) {
      const dx = event.clientX - prev.x;
      const dy = event.clientY - prev.y;
      if (!dragged && Math.hypot(dx, dy) < 6) return;
      if (!dragged) viewport.setPointerCapture(event.pointerId);
      dragged = true;
      view.x += dx; view.y += dy;
      applyView();
    } else if (pointers.size === 2) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = viewport.getBoundingClientRect();
      if (pinchStart) zoomAt(dist / pinchStart, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
      pinchStart = dist;
      dragged = true;
      return;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  });
  const release = (event: PointerEvent) => { pointers.delete(event.pointerId); if (pointers.size < 2) pinchStart = 0; };
  host.addEventListener("pointerup", release);
  host.addEventListener("pointercancel", release);
  host.addEventListener("wheel", (event) => {
    const viewport = (event.target as HTMLElement).closest<HTMLElement>(".td-bgraph");
    if (!viewport) return;
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, event.clientX - rect.left, event.clientY - rect.top);
  }, { passive: false });

  host.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const nodeButton = target.closest<HTMLElement>("[data-bnode]");
    if (nodeButton) {
      if (dragged) { dragged = false; return; }
      select(nodeButton.dataset.bnode!);
      return;
    }
    const zoom = target.closest<HTMLElement>("[data-bzoom]");
    if (zoom) {
      const viewport = host.querySelector<HTMLElement>(".td-bgraph")!;
      if (zoom.dataset.bzoom === "fit") fit();
      else zoomAt(zoom.dataset.bzoom === "in" ? 1.25 : 0.8, viewport.clientWidth / 2, viewport.clientHeight / 2);
      return;
    }
    const buyButton = target.closest<HTMLElement>("[data-bbuy]");
    if (buyButton) { buy(buyButton.dataset.bbuy!); return; }
    if (target.closest("[data-breset]")) {
      if (resetArmed) reset();
      else { resetArmed = true; render(); host.querySelector<HTMLElement>("[data-breset]")?.focus({ preventScroll: true }); }
      return;
    }
    if (target.closest("[data-bdismiss]")) {
      store.data.refundNotice = 0;
      store.persist();
      render();
    }
  });
  host.addEventListener("focusin", (event) => {
    const id = (event.target as HTMLElement).dataset?.bnode;
    if (id && id !== selectedId) { select(id); reveal(id); }
    else if (id) reveal(id);
  });

  // The graph cannot measure itself while its tab is hidden; fit once it shows.
  function ensureFit() { if (!fitted) requestAnimationFrame(() => fit(true)); }

  return { render, ensureFit };
}

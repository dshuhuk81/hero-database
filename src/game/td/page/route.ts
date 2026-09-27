// Progress route for the main menu mode panels (Campaign stages, Expedition stages): a row
// of nodes joined by a line, each done, current or ahead. Pure markup, styled in td.css.
export type RouteNode = { label: string; state: "done" | "current" | "ahead"; note?: string };

export function routeHtml(nodes: RouteNode[]) {
  return nodes.map((node) =>
    `<span class="td-route-node is-${node.state}">` +
      `<i class="td-route-dot"></i>` +
      `<span class="td-route-label">${node.label}</span>` +
      (node.note ? `<span class="td-route-note">${node.note}</span>` : "") +
    `</span>`).join("");
}

const ROMAN: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
export function roman(value: number) {
  let n = Math.max(0, Math.floor(value)), out = "";
  for (const [size, glyph] of ROMAN) while (n >= size) { out += glyph; n -= size; }
  return out;
}

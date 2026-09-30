// Roman numerals for stage and evolution labels (Expedition stops, Evolution tiers).
const ROMAN: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
export function roman(value: number) {
  let n = Math.max(0, Math.floor(value)), out = "";
  for (const [size, glyph] of ROMAN) while (n >= size) { out += glyph; n -= size; }
  return out;
}

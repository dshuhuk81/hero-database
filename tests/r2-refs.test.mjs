import test from "node:test";
import assert from "node:assert/strict";
import { extractR2Paths } from "../scripts/lib/r2-refs.mjs";

const BASE = "https://pub-x.r2.dev";

test("extracts r2.dev and /r2/ image paths and drops query strings", () => {
  const text = `src="${BASE}/heroes/a.webp?v=1" style="background:url(/r2/bosses/b.png)"`;
  assert.deepEqual(extractR2Paths(text, BASE), ["bosses/b.png", "heroes/a.webp"]);
});

test("returns each path once", () => {
  const text = `${BASE}/heroes/a.webp ${BASE}/heroes/a.webp?v=2`;
  assert.deepEqual(extractR2Paths(text, BASE), ["heroes/a.webp"]);
});

test("ignores paths without an image extension and other hosts", () => {
  const text = `${BASE}/heroes/index.js https://other.r2.dev/heroes/z.webp ${BASE}/skills/x.mp4`;
  assert.deepEqual(extractR2Paths(text, BASE), ["skills/x.mp4"]);
});

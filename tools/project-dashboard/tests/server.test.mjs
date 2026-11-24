import test from "node:test";
import { request } from "node:http";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createDashboard } from "../server.mjs";
test("local API serves UI and data, blocks foreign writes and sensitive files", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "motto-http-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ["src/data/heroes", "src/data/ratings"])
    await mkdir(path.join(root, dir), { recursive: true });
  await writeFile(path.join(root, "PRODUCT.md"), "# Product\nKnown source");
  const server = await createDashboard(root);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base)).status, 200);
  assert.match(await (await fetch(base + "/app.js")).text(), /render/);
  assert.equal(
    (await (await fetch(base + "/api/data")).json()).heroes.length,
    0,
  );
  assert.equal((await fetch(base + "/api/file?path=.env.local")).status, 400);
  const foreign = await fetch(base + "/api/work-items", {
    method: "POST",
    headers: {
      Origin: "https://attacker.example",
      "Content-Type": "application/json",
    },
    body: '{"title":"Attack"}',
  });
  assert.equal(foreign.status, 403);
  const write = await fetch(base + "/api/work-items", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Actual feedback", description: "Observed" }),
  });
  assert.equal(write.status, 200);
  assert.equal(
    (await (await fetch(base + "/api/data")).json()).workItems[0].title,
    "Actual feedback",
  );
  let finishFirst;
  const firstResponse = new Promise((resolve, reject) => {
    const req = request(
      base + "/api/work-items",
      {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      },
    );
    req.on("error", reject);
    req.write('{"title":');
    finishFirst = () => req.end('"Slow first"}');
  });
  await new Promise((r) => setTimeout(r, 50));
  const overlap = await fetch(base + "/api/work-items", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: '{"title":"Second"}',
  });
  finishFirst();
  assert.equal(await firstResponse, 200);
  assert.equal(overlap.status, 409);
  const invalid = await fetch(base + "/api/checks", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: '{"key":"constructor"}',
  });
  assert.equal(invalid.status, 400);
  assert.equal(
    (await (await fetch(base + "/api/search?q=Known")).json()).length,
    1,
  );
  // A failed watched refresh retains good data and publishes its error separately.
  const good = await (await fetch(base + "/api/data")).json();
  await writeFile(path.join(root, "src/data/heroes/broken.json"), "{invalid");
  let failed;
  for (let n = 0; n < 40; n++) {
    await new Promise((r) => setTimeout(r, 50));
    failed = await (await fetch(base + "/api/data")).json();
    if (failed.refreshError) break;
  }
  assert.match(failed.refreshError, /broken.json/);
  assert.equal(failed.generatedAt, good.generatedAt);
  await rm(path.join(root, "src/data/heroes/broken.json"));
  for (let n = 0; n < 40; n++) {
    await new Promise((r) => setTimeout(r, 50));
    failed = await (await fetch(base + "/api/data")).json();
    if (!failed.refreshError) break;
  }
  assert.equal(failed.refreshError, null);
});

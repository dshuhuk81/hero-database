import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  buildSnapshot,
  readSource,
  validateDraft,
  saveDraft,
  applyDraft,
  addWorkItem,
  run,
  fingerprint,
} from "../data.mjs";
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "motto-dashboard-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of [
    "src/data/heroes",
    "src/data/ratings",
    "design-system",
    "tools/project-dashboard",
  ])
    await mkdir(path.join(root, dir), { recursive: true });
  const hero = {
    id: "sample",
    name: "Sample",
    faction: "Light",
    role: "Tank",
    class: "Warrior",
    description: "Known",
    stats: { hp: 10 },
    skills: [{ name: "Skill" }],
    image: "",
  };
  await writeFile(
    path.join(root, "src/data/heroes/sample.json"),
    JSON.stringify(hero),
  );
  await writeFile(
    path.join(root, "src/data/all_heroes_db.json"),
    JSON.stringify({ sample: hero }),
  );
  await writeFile(
    path.join(root, "src/data/ratings/hero-ratings.json"),
    JSON.stringify({ sample: { name: "Sample", pveearly: "S" } }),
  );
  await writeFile(path.join(root, "PRODUCT.md"), "# Product\nEvidence only.");
  await writeFile(
    path.join(root, "design-system/SITE_AUDIT_ROADMAP.md"),
    "| 6 | Specialist | In progress | Improve |\n| 7 | Meta | Planned | Polish |",
  );
  return { root, hero };
}
test("snapshot derives heroes, unknown ratings, roadmap and searchable sources", async (t) => {
  const { root } = await fixture(t);
  const s = await buildSnapshot(root);
  assert.equal(s.heroes.length, 1);
  assert.equal(s.heroes[0].overall.tier, "S");
  assert.equal(s.heroes[0].overall.complete, false);
  assert.equal(s.milestones[0].status, "in-progress");
  assert.ok(s.documents.some((d) => d.content.includes("Evidence only")));
  assert.equal(s.health.mergeSynced, true);
  assert.equal(s.health.checks.length, 0);
});
test("source access blocks credentials, traversal and symlink escapes", async (t) => {
  const { root } = await fixture(t);
  await assert.rejects(readSource(root, ".env.local"));
  await assert.rejects(readSource(root, "src/../../token.json"));
  const { symlink } = await import("node:fs/promises");
  await symlink("/etc/passwd", path.join(root, "src/data/leak.json"));
  await assert.rejects(readSource(root, "src/data/leak.json"));
  assert.match((await readSource(root, "PRODUCT.md")).content, /Evidence/);
});
test("draft validation keeps computed overall and requires adjustment reasoning", async (t) => {
  const { root } = await fixture(t);
  await assert.rejects(
    validateDraft(root, {
      kind: "rating",
      id: "sample",
      content: '{"overall":"S+"}',
    }),
    /overall|Unbekannt/,
  );
  await assert.rejects(
    validateDraft(root, {
      kind: "rating",
      id: "sample",
      content: '{"pveearly":"Z"}',
    }),
    /Rating/,
  );
  await assert.rejects(
    validateDraft(root, {
      kind: "rating",
      id: "sample",
      content: '{"overallAdjustment":1}',
    }),
    /Begründung/,
  );
  const valid = await validateDraft(root, {
    kind: "rating",
    id: "sample",
    content: '{"pveearly":"S"}',
  });
  assert.equal(valid.overall.tier, "S");
});
test("draft has diff, detects external edits and never overwrites them", async (t) => {
  const { root, hero } = await fixture(t);
  const draft = await saveDraft(root, {
    kind: "hero",
    id: "sample",
    content: JSON.stringify({ ...hero, description: "Updated" }),
  });
  assert.ok(draft.diff.some((line) => line.type === "add"));
  await writeFile(path.join(root, "src/data/heroes/sample.json"), "{}");
  await assert.rejects(applyDraft(root, draft.id), /geändert/);
  assert.equal(
    await readFile(path.join(root, "src/data/heroes/sample.json"), "utf8"),
    "{}",
  );
});
test("guide drafts remain internal research with evidence labels", async (t) => {
  const { root } = await fixture(t);
  const d = await saveDraft(root, {
    kind: "guide",
    id: "sample-notes",
    content: "# Notes\n\nEvidence: Untested\n\nOpen questions.",
  });
  const result = await applyDraft(root, d.id);
  assert.match(result.path, /tools\/project-dashboard\/content\/guides/);
  assert.match(
    await readFile(path.join(root, result.path), "utf8"),
    /Untested/,
  );
});
test("feedback is versionable and dependencies reference existing work", async (t) => {
  const { root } = await fixture(t);
  await assert.rejects(
    addWorkItem(root, { title: "Test", dependencies: ["missing"] }),
    /Abhängigkeit/,
  );
  const item = await addWorkItem(root, {
    title: "Player feedback",
    category: "feedback",
    status: "planned",
    description: "Observed: navigation confusing",
  });
  const s = await buildSnapshot(root);
  assert.equal(s.workItems[0].id, item.id);
});
test("localized hero files are not separate heroes and merge ignores object key order", async (t) => {
  const { root, hero } = await fixture(t);
  await mkdir(path.join(root, "src/data/heroes/i18n"));
  await writeFile(
    path.join(root, "src/data/heroes/i18n/sample.json"),
    JSON.stringify({ de: { name: "Beispiel" } }),
  );
  await writeFile(
    path.join(root, "src/data/all_heroes_db.json"),
    JSON.stringify({
      sample: Object.fromEntries(Object.entries(hero).reverse()),
    }),
  );
  const s = await buildSnapshot(root);
  assert.equal(s.heroes.length, 1);
  assert.equal(s.health.mergeSynced, true);
});
test("hero application runs project validation and regenerates the merge", async (t) => {
  const { root, hero } = await fixture(t);
  await mkdir(path.join(root, "scripts"));
  await writeFile(
    path.join(root, "scripts/merge.mjs"),
    "import fs from 'node:fs';const hero=JSON.parse(fs.readFileSync('src/data/heroes/sample.json'));fs.writeFileSync('src/data/all_heroes_db.json',JSON.stringify({sample:hero},null,2));",
  );
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      scripts: { "after:hero-edit": "node scripts/merge.mjs" },
    }),
  );
  const d = await saveDraft(root, {
    kind: "hero",
    id: "sample",
    content: JSON.stringify({ ...hero, description: "Updated" }),
  });
  await applyDraft(root, d.id);
  assert.equal(
    JSON.parse(
      await readFile(path.join(root, "src/data/all_heroes_db.json"), "utf8"),
    ).sample.description,
    "Updated",
  );
  await assert.rejects(applyDraft(root, d.id), /bereits/);
});
test("failed validation restores hero source and generated merge", async (t) => {
  const { root, hero } = await fixture(t);
  const merge = await readFile(
    path.join(root, "src/data/all_heroes_db.json"),
    "utf8",
  );
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      scripts: { "after:hero-edit": 'node -e "process.exit(1)"' },
    }),
  );
  const d = await saveDraft(root, {
    kind: "hero",
    id: "sample",
    content: JSON.stringify({ ...hero, description: "Rejected" }),
  });
  await assert.rejects(applyDraft(root, d.id), /fehlgeschlagen/);
  assert.equal(
    JSON.parse(await readFile(path.join(root, d.path), "utf8")).description,
    hero.description,
  );
  assert.equal(
    await readFile(path.join(root, "src/data/all_heroes_db.json"), "utf8"),
    merge,
  );
});
test("draft storage refuses symlink destinations outside the repository", async (t) => {
  const { root } = await fixture(t);
  const external = await mkdtemp(path.join(tmpdir(), "motto-outside-"));
  t.after(() => rm(external, { recursive: true, force: true }));
  const { symlink } = await import("node:fs/promises");
  await symlink(external, path.join(root, ".cache"));
  await assert.rejects(
    saveDraft(root, {
      kind: "guide",
      id: "safe",
      content: "# Test\nEvidence: Untested",
    }),
    /außerhalb/,
  );
});

test("JSON command output is not truncated", async (t) => {
  const { root } = await fixture(t);
  const r = await run(
    root,
    [
      "node",
      "-e",
      'process.stdout.write(JSON.stringify({value:"x".repeat(50000)}))',
    ],
    5000,
    { jsonOutput: true },
  );
  assert.equal(JSON.parse(r.output).value.length, 50000);
});
test("check fingerprints include test files and TypeScript config", async (t) => {
  const { root } = await fixture(t);
  await mkdir(path.join(root, "tests"));
  await writeFile(path.join(root, "tests/rating-system.test.mjs"), "// First");
  const a = await fingerprint(root);
  await writeFile(
    path.join(root, "tests/rating-system.test.mjs"),
    "// Changed",
  );
  const b = await fingerprint(root);
  assert.notEqual(a, b);
  await writeFile(path.join(root, "tsconfig.json"), "{}");
  assert.notEqual(b, await fingerprint(root));
});
test("failed validation preserves an independently changed merge", async (t) => {
  const { root, hero } = await fixture(t);
  await mkdir(path.join(root, "scripts"));
  await writeFile(
    path.join(root, "scripts/validate.mjs"),
    `import fs from 'node:fs';fs.writeFileSync('src/data/all_heroes_db.json','{"external":true}');process.exit(1);`,
  );
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      scripts: { "after:hero-edit": "node scripts/validate.mjs" },
    }),
  );
  const d = await saveDraft(root, {
    kind: "hero",
    id: "sample",
    content: JSON.stringify({ ...hero, description: "Rejected" }),
  });
  await assert.rejects(applyDraft(root, d.id), /Merge|merge/);
  assert.equal(
    await readFile(path.join(root, "src/data/all_heroes_db.json"), "utf8"),
    '{"external":true}',
  );
});

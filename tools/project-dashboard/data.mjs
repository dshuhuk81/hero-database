import {
  readFile,
  writeFile,
  readdir,
  mkdir,
  realpath,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify, isDeepStrictEqual } from "node:util";
import {
  calculateOverall,
  RATING_FACTORS,
  RATING_TIERS,
} from "../../src/data/ratings/ratingSystem.js";
const exec = promisify(execFile);
export const CACHE = ".cache/project-dashboard";
const ITEMS = "tools/project-dashboard/work-items.json";
const hash = (s) => createHash("sha256").update(s).digest("hex");
const stringify = (v) => JSON.stringify(v, null, 2) + "\n";
const exists = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};
async function json(root, file, fallback) {
  try {
    return JSON.parse(await readFile(path.join(root, file), "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return fallback;
    throw new Error(`${file}: ${e.message}`);
  }
}
export async function atomic(root, file, value) {
  const base = await realpath(root);
  let parent = path.dirname(path.join(root, file));
  while (!(await exists(parent))) {
    const next = path.dirname(parent);
    if (next === parent) throw new Error("Ungültiges Ziel.");
    parent = next;
  }
  const resolved = await realpath(parent);
  if (resolved !== base && !resolved.startsWith(base + path.sep))
    throw new Error("Schreibziel liegt außerhalb des Repositorys.");
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  const temp = path.join(root, file) + "." + randomUUID() + ".tmp";
  await writeFile(temp, typeof value === "string" ? value : stringify(value));
  await rename(temp, path.join(root, file));
}
async function walk(root, dir, extensions) {
  const out = [];
  let entries;
  try {
    entries = await readdir(path.join(root, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (
      e.name.startsWith(".") ||
      ["node_modules", "output", "outputs", "assets"].includes(e.name)
    )
      continue;
    const p = path.posix.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(root, p, extensions)));
    else if (e.isFile() && extensions.includes(path.extname(p))) out.push(p);
  }
  return out;
}
function allowed(file) {
  return (
    !file.split("/").some((p) => p === ".." || p.startsWith(".")) &&
    (/^[\w-]+\.md$/.test(file) ||
      /^(src|scripts)\/[\w/.[\]-]+\.(json|js|mjs|cjs|ts|astro|css)$/.test(
        file,
      ) ||
      /^(docs|design-system|tools\/project-dashboard)\/[\w/.-]+\.(md|json|mjs|js|css|html)$/.test(
        file,
      ))
  );
}
export async function readSource(root, file) {
  if (typeof file !== "string" || !allowed(file))
    throw new Error("Datei ist nicht freigegeben.");
  const base = await realpath(root);
  const resolved = await realpath(path.join(root, file));
  if (
    !resolved.startsWith(base + path.sep) ||
    !allowed(path.relative(base, resolved).split(path.sep).join("/"))
  )
    throw new Error("Datei liegt außerhalb des Repositorys.");
  const info = await stat(resolved);
  if (!info.isFile() || info.size > 1500000)
    throw new Error("Datei ist zu groß.");
  return { path: file, content: await readFile(resolved, "utf8") };
}
export async function run(root, args, timeout = 60000, options = {}) {
  try {
    const r = await exec(args[0], args.slice(1), {
      cwd: root,
      timeout,
      maxBuffer: 3 * 1024 * 1024,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GH_PROMPT_DISABLED: "1",
      },
    });
    return {
      ok: true,
      exitCode: 0,
      output: options.jsonOutput
        ? r.stdout
        : (r.stdout + r.stderr).slice(-24000),
    };
  } catch (e) {
    return {
      ok: false,
      exitCode: typeof e.code === "number" ? e.code : null,
      output: (
        String(e.stdout || "") +
        String(e.stderr || "") +
        (!e.stdout && !e.stderr ? e.message : "")
      ).slice(-24000),
    };
  }
}
export async function fingerprint(root) {
  const files = [
    ...(await walk(root, "src", [".json", ".js", ".ts", ".astro", ".css"])),
    ...(await walk(root, "scripts", [".mjs", ".js", ".cjs"])),
    ...(await walk(root, "tests", [".mjs", ".js", ".ts"])),
    "tsconfig.json",
    "astro.config.mjs",
    "package.json",
    "package-lock.json",
  ];
  const h = createHash("sha256");
  for (const p of files.sort()) {
    h.update(p);
    try {
      h.update(await readFile(path.join(root, p)));
    } catch {
      h.update("missing");
    }
  }
  return h.digest("hex");
}
export const CHECKS = {
  ratings: ["node", "scripts/validate-ratings.mjs"],
  tags: ["node", "scripts/test-hero-tags.js"],
  "rating-tests": ["node", "--test", "tests/rating-system.test.mjs"],
  types: ["npm", "run", "check"],
};
export async function runCheck(root, key) {
  if (!Object.hasOwn(CHECKS, key)) throw new Error("Unbekannte Prüfung.");
  const before = await fingerprint(root);
  const startedAt = new Date().toISOString();
  const result = await run(root, CHECKS[key], 120000);
  const row = {
    key,
    startedAt,
    finishedAt: new Date().toISOString(),
    fingerprint: before,
    ...result,
  };
  const saved = await json(root, `${CACHE}/checks.json`, []);
  await atomic(root, `${CACHE}/checks.json`, [
    ...saved.filter((r) => r.key !== key),
    row,
  ]);
  return row;
}
export async function buildSnapshot(root) {
  const heroPaths = (await readdir(path.join(root, "src/data/heroes")))
    .filter((p) => p.endsWith(".json") && p !== "index.json")
    .map((p) => `src/data/heroes/${p}`)
    .sort();
  const ratings = await json(root, "src/data/ratings/hero-ratings.json", {});
  const merged = await json(root, "src/data/all_heroes_db.json", {});
  const actual = {};
  const heroes = [];
  for (const file of heroPaths) {
    const h = await json(root, file, {});
    actual[h.id] = h;
    const issues = [];
    for (const field of [
      "id",
      "name",
      "faction",
      "role",
      "class",
      "description",
    ])
      if (!h[field]) issues.push(`Fehlendes Feld: ${field}`);
    if (!Array.isArray(h.skills) || !h.skills.length)
      issues.push("Keine Skills erfasst");
    if (!h.stats || !Object.keys(h.stats).length)
      issues.push("Keine Stats erfasst");
    if (!h.image) issues.push("Bildreferenz fehlt");
    if (h.id !== path.basename(file, ".json"))
      issues.push("ID und Dateiname weichen ab");
    const r = ratings[h.id] || {};
    const overall = calculateOverall(r);
    if (!overall.complete)
      issues.push(`${6 - overall.ratedFields} Rating-Kontexte offen`);
    for (const field of ["synergyPartners", "synergyLinks"]) {
      const values = h[field];
      if (Array.isArray(values))
        for (const v of values)
          if (
            typeof v === "string" &&
            !heroPaths.includes(`src/data/heroes/${v}.json`)
          )
            issues.push(`Unbekannte Referenz (${field}): ${v}`);
    }
    heroes.push({
      id: h.id,
      name: h.name || path.basename(file),
      faction: h.faction || "Unbekannt",
      role: h.role || "Unbekannt",
      class: h.class,
      release: h.release,
      image:
        typeof h.image === "string" &&
        /^https:\/\/pub-e35e94828bf347ca93c3d2c6a50d06f6\.r2\.dev\//.test(
          h.image,
        )
          ? h.image
          : null,
      path: file,
      issues,
      ratings: r,
      overall,
      status: issues.length ? "needs-review" : "implemented",
    });
  }
  const docs = [
    ...(await readdir(root)).filter((p) => /^[\w-]+\.md$/.test(p)),
    ...(await walk(root, "docs", [".md"])),
    ...(await walk(root, "design-system", [".md"])),
    ...(await walk(root, "tools/project-dashboard", [".md"])),
  ];
  const documents = [];
  for (const file of [...new Set(docs)].sort()) {
    try {
      const source = await readSource(root, file);
      documents.push({
        ...source,
        title: source.content.match(/^#\s+(.+)$/m)?.[1] || path.basename(file),
        category: file.startsWith("design-system")
          ? "design"
          : file.includes("/guides/")
            ? "guide"
            : "documentation",
      });
    } catch {
      /* Oversized, non-allowlisted research stays outside the index. */
    }
  }
  const roadmap = documents.find(
    (d) => d.path === "design-system/SITE_AUDIT_ROADMAP.md",
  );
  const milestones = [];
  for (const line of (roadmap?.content || "").split("\n")) {
    const m = line.match(
      /^\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/,
    );
    if (m)
      milestones.push({
        id: m[1],
        title: m[2].trim(),
        status: /complete/i.test(m[3])
          ? "implemented"
          : /progress/i.test(m[3])
            ? "in-progress"
            : /block/i.test(m[3])
              ? "blocked"
              : "planned",
        sourceStatus: m[3].trim(),
        description: m[4].trim(),
        path: roadmap.path,
      });
  }
  const [gitStatus, gitLog, gitBranch, gitRemote, gitHead] = await Promise.all([
    run(root, ["git", "status", "--short"], 5000),
    run(root, ["git", "log", "-8", "--format=%h%x09%aI%x09%s"], 5000),
    run(root, ["git", "branch", "--show-current"], 5000),
    run(root, ["git", "remote", "get-url", "origin"], 5000),
    run(root, ["git", "rev-parse", "HEAD"], 5000),
  ]);
  const fp = await fingerprint(root);
  const checks = (await json(root, `${CACHE}/checks.json`, [])).map((c) => ({
    ...c,
    stale: c.fingerprint !== fp,
  }));

  const mergeSynced =
    Object.keys(actual).length === Object.keys(merged).length &&
    Object.entries(actual).every(([id, h]) => isDeepStrictEqual(h, merged[id]));
  const github = await json(root, `${CACHE}/github.json`, null);
  const drafts = await listDrafts(root);
  const workItems = await json(root, ITEMS, []);
  return {
    generatedAt: new Date().toISOString(),
    project: "Motto Immortal",
    heroes,
    documents,
    milestones,
    workItems,
    drafts,
    ratingFactors: RATING_FACTORS,
    git: {
      branch: gitBranch.ok ? gitBranch.output.trim() : null,
      head: gitHead.ok ? gitHead.output.trim() : null,
      remote: gitRemote.ok ? gitRemote.output.trim() : null,
      changes: gitStatus.ok
        ? gitStatus.output.trim().split("\n").filter(Boolean)
        : [],
      recent: gitLog.ok
        ? gitLog.output
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((l) => {
              const [id, date, ...title] = l.split("\t");
              return { id, date, title: title.join("\t") };
            })
        : [],
    },
    github,
    health: {
      mergeSynced,
      checks,
      fingerprint: fp,
      build:
        "Nicht ausgeführt – Produktionsbuild wird vom Betreiber gestartet.",
      assetVerification:
        "Nur Bildreferenzen geprüft; R2-Erreichbarkeit nicht geprüft.",
      ratingOrphans: Object.keys(ratings).filter((id) => !actual[id]),
    },
  };
}
const idPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;
function draftPath(kind, id) {
  if (!idPattern.test(id))
    throw new Error("ID: nur kleine Buchstaben, Zahlen und Bindestriche.");
  if (kind === "hero") return `src/data/heroes/${id}.json`;
  if (kind === "rating") return "src/data/ratings/hero-ratings.json";
  if (kind === "guide")
    return `tools/project-dashboard/content/guides/${id}.md`;
  throw new Error("Unbekannter Entwurfstyp.");
}
export async function validateDraft(root, input) {
  const { kind, id, content } = input;
  const file = draftPath(kind, id);
  if (typeof content !== "string" || !content.trim() || content.length > 250000)
    throw new Error("Inhalt fehlt oder ist zu groß.");
  if (kind === "guide") {
    if (
      !/^#\s+\S/m.test(content) ||
      !/^Evidence:\s*(Confirmed|Observed|Community|Untested)\s*$/m.test(content)
    )
      throw new Error(
        "Guide benötigt Titel und Evidence: Confirmed / Observed / Community / Untested.",
      );
    return { path: file, value: content };
  }
  let value;
  try {
    value = JSON.parse(content);
  } catch {
    throw new Error("Ungültiges JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("JSON-Objekt erwartet.");
  if (kind === "hero") {
    if (value.id !== id)
      throw new Error("Helden-ID muss mit der Ziel-ID übereinstimmen.");
    for (const k of ["name", "faction", "role", "class"])
      if (typeof value[k] !== "string" || !value[k].trim())
        throw new Error(`Pflichtfeld fehlt: ${k}`);
    if (
      !Array.isArray(value.skills) ||
      !value.stats ||
      typeof value.stats !== "object" ||
      Array.isArray(value.stats)
    )
      throw new Error("skills (Array) und stats (Objekt) erforderlich.");
    return { path: file, value };
  }
  if (!(await exists(path.join(root, `src/data/heroes/${id}.json`))))
    throw new Error("Held existiert nicht.");
  for (const field of ["name", "overallReason"])
    if (value[field] !== undefined && typeof value[field] !== "string")
      throw new Error(`Rating-Feld ${field} muss Text sein.`);
  const keys = [
    ...RATING_FACTORS.map((f) => f.key),
    "name",
    "overallAdjustment",
    "overallReason",
  ];
  for (const k of Object.keys(value))
    if (!keys.includes(k))
      throw new Error(`Unbekanntes Rating-Feld: ${k}; overall wird berechnet.`);
  for (const { key } of RATING_FACTORS)
    if (
      value[key] !== undefined &&
      value[key] !== "" &&
      !RATING_TIERS.includes(value[key])
    )
      throw new Error(`Ungültiges Rating: ${key}`);
  if (
    value.overallAdjustment !== undefined &&
    (!Number.isInteger(value.overallAdjustment) ||
      Math.abs(value.overallAdjustment) > 1)
  )
    throw new Error("Adjustment muss -1, 0 oder 1 sein.");
  if (
    value.overallAdjustment &&
    !(typeof value.overallReason === "string" && value.overallReason.trim())
  )
    throw new Error("Adjustment benötigt eine Begründung.");
  return { path: file, value, overall: calculateOverall(value) };
}
function diff(before, after) {
  if (before === after) return [];
  const a = before.split("\n"),
    b = after.split("\n");
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length,
    endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  return [
    ...a
      .slice(Math.max(0, start - 2), start)
      .map((text) => ({ type: "context", text })),
    ...a.slice(start, endA).map((text) => ({ type: "remove", text })),
    ...b.slice(start, endB).map((text) => ({ type: "add", text })),
    ...b.slice(endB, endB + 2).map((text) => ({ type: "context", text })),
  ];
}
async function original(root, file) {
  try {
    return await readFile(path.join(root, file), "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
export async function saveDraft(root, input) {
  const valid = await validateDraft(root, input);
  const before = await original(root, valid.path);
  let after = input.kind === "guide" ? input.content : stringify(valid.value);
  if (input.kind === "rating") {
    const all = before ? JSON.parse(before) : {};
    all[input.id] = valid.value;
    after = stringify(all);
  }
  const d = {
    id: randomUUID(),
    kind: input.kind,
    targetId: input.id,
    path: valid.path,
    content: input.content,
    beforeHash: hash(before ?? "ABSENT"),
    createdAt: new Date().toISOString(),
    diff: diff(before ?? "", after),
    overall: valid.overall,
  };
  await atomic(root, `${CACHE}/drafts/${d.id}.json`, d);
  return d;
}
export async function listDrafts(root) {
  const files = await walk(root, `${CACHE}/drafts`, [".json"]);
  return (await Promise.all(files.map((f) => json(root, f, null))))
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function applyDraft(root, id) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Ungültige Entwurfs-ID.");
  const d = await json(root, `${CACHE}/drafts/${id}.json`, null);
  if (!d || d.appliedAt)
    throw new Error("Entwurf fehlt oder wurde bereits übernommen.");
  const valid = await validateDraft(root, {
    kind: d.kind,
    id: d.targetId,
    content: d.content,
  });
  const before = await original(root, valid.path);
  if (hash(before ?? "ABSENT") !== d.beforeHash)
    throw new Error(
      "Quelldatei wurde seit dem Entwurf geändert. Bitte neu öffnen.",
    );
  let after = d.kind === "guide" ? d.content : stringify(valid.value);
  if (d.kind === "rating") {
    const all = JSON.parse(before || "{}");
    all[d.targetId] = valid.value;
    after = stringify(all);
  }
  const mergedPath = "src/data/all_heroes_db.json",
    mergedBefore = d.kind === "hero" ? await original(root, mergedPath) : null;
  const expectedMerged = {};
  if (d.kind === "hero")
    for (const file of await readdir(path.join(root, "src/data/heroes"))) {
      if (file.endsWith(".json") && file !== "index.json") {
        const h = await json(root, `src/data/heroes/${file}`, {});
        if (h.id) expectedMerged[h.id] = h;
      }
    }
  if (d.kind === "hero") expectedMerged[d.targetId] = valid.value;
  await atomic(root, valid.path, after);
  try {
    if (d.kind !== "guide") {
      const command =
        d.kind === "hero"
          ? ["npm", "run", "after:hero-edit"]
          : ["node", "scripts/validate-ratings.mjs"];
      const result = await run(root, command, 90000);
      if (!result.ok)
        throw new Error(`Projektvalidierung fehlgeschlagen: ${result.output}`);
    }
  } catch (e) {
    const current = await original(root, valid.path);
    if (current !== after)
      throw new Error(
        `${e.message}\nExterne Änderung erkannt; automatisches Zurücksetzen ausgelassen.`,
      );
    if (before === null) await unlink(path.join(root, valid.path));
    else await atomic(root, valid.path, before);
    if (d.kind === "hero") {
      const mergedCurrent = await original(root, mergedPath);
      if (mergedCurrent !== mergedBefore) {
        let ours = false;
        try {
          ours = isDeepStrictEqual(JSON.parse(mergedCurrent), expectedMerged);
        } catch {}
        if (!ours)
          throw new Error(
            `${e.message}\nExterne Merge-Änderung erkannt und beibehalten. Heldenquelle wurde zurückgesetzt; Merge bitte prüfen.`,
          );
        if (mergedBefore === null) await unlink(path.join(root, mergedPath));
        else await atomic(root, mergedPath, mergedBefore);
      }
    }
    throw e;
  }
  d.appliedAt = new Date().toISOString();
  await atomic(root, `${CACHE}/drafts/${id}.json`, d);
  return { path: valid.path, appliedAt: d.appliedAt };
}
export async function addWorkItem(root, input) {
  const items = await json(root, ITEMS, []);
  if (
    typeof input.title !== "string" ||
    !input.title.trim() ||
    input.title.length > 180
  )
    throw new Error("Titel erforderlich (max. 180 Zeichen).");
  const statuses = ["planned", "in-progress", "blocked", "implemented"];
  const categories = ["feedback", "feature", "bug", "content", "technical"];
  if (
    !statuses.includes(input.status || "planned") ||
    !categories.includes(input.category || "feedback")
  )
    throw new Error("Ungültiger Status oder Kategorie.");
  const deps = input.dependencies || [];
  if (!Array.isArray(deps) || deps.some((d) => !items.some((i) => i.id === d)))
    throw new Error("Unbekannte Abhängigkeit.");
  const item = {
    id: randomUUID(),
    title: input.title.trim(),
    description: String(input.description || "").slice(0, 10000),
    category: input.category || "feedback",
    status: input.status || "planned",
    priority: ["high", "normal", "low"].includes(input.priority)
      ? input.priority
      : "normal",
    dependencies: deps,
    milestone: String(input.milestone || ""),
    issueUrl:
      typeof input.issueUrl === "string" &&
      /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+$/.test(
        input.issueUrl,
      )
        ? input.issueUrl
        : null,
    createdAt: new Date().toISOString(),
  };
  await atomic(root, ITEMS, [...items, item]);
  return item;
}
export async function updateWorkItem(root, id, input) {
  const items = await json(root, ITEMS, []);
  const item = items.find((i) => i.id === id);
  if (
    !item ||
    !["planned", "in-progress", "blocked", "implemented"].includes(input.status)
  )
    throw new Error("Ungültiger Eintrag oder Status.");
  item.status = input.status;
  item.updatedAt = new Date().toISOString();
  await atomic(root, ITEMS, items);
  return item;
}
export async function refreshGitHub(root) {
  const remote = await run(root, ["git", "remote", "get-url", "origin"], 5000);
  const match = remote.output
    .trim()
    .match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  if (!remote.ok || !match) throw new Error("Kein GitHub-Origin konfiguriert.");
  const repo = match[1];
  const [issues, runs] = await Promise.all([
    run(
      root,
      [
        "gh",
        "api",
        "--paginate",
        "--slurp",
        "--jq",
        '[.[][] | select(has("pull_request") | not) | {number,title,url:.html_url,labels:[.labels[].name]}]',
        `repos/${repo}/issues?state=open&per_page=100`,
      ],
      20000,
      { jsonOutput: true },
    ),
    run(
      root,
      [
        "gh",
        "run",
        "list",
        "--repo",
        repo,
        "--limit",
        "20",
        "--json",
        "name,status,conclusion,headSha,url,createdAt",
      ],
      20000,
      { jsonOutput: true },
    ),
  ]);
  if (!issues.ok || !runs.ok)
    throw new Error(
      `GitHub nicht verfügbar. gh installieren/anmelden. ${(issues.ok ? runs.output : issues.output).slice(-600)}`,
    );
  const issuePages = JSON.parse(issues.output);
  const data = {
    repo,
    fetchedAt: new Date().toISOString(),
    issues: issuePages,
    runs: JSON.parse(runs.output),
  };
  await atomic(root, `${CACHE}/github.json`, data);
  return data;
}

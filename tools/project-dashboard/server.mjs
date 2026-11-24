import http from "node:http";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import {
  buildSnapshot,
  run,
  atomic,
  CACHE,
  readSource,
  runCheck,
  CHECKS,
  saveDraft,
  validateDraft,
  applyDraft,
  addWorkItem,
  updateWorkItem,
  refreshGitHub,
} from "./data.mjs";
export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const PUBLIC = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "public",
);
export async function createDashboard(root = ROOT) {
  let snapshot = await buildSnapshot(root),
    refreshError = null,
    busy = false,
    checkJob = null;
  async function refresh() {
    try {
      const next = await buildSnapshot(root);
      await atomic(root, `${CACHE}/snapshot.json`, next);
      snapshot = next;
      refreshError = null;
      return next;
    } catch (e) {
      refreshError = e.message;
      throw e;
    }
  }
  const server = http.createServer(async (req, res) => {
    const host = req.headers.host || "";
    const validHost = /^(127\.0\.0\.1|localhost):\d+$/.test(host);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' https://pub-e35e94828bf347ca93c3d2c6a50d06f6.r2.dev; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    const send = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(data));
    };
    try {
      if (!validHost)
        return send(403, { error: "Nur lokaler Zugriff erlaubt." });
      const url = new URL(req.url, `http://${host}`);
      if (req.method === "GET") {
        if (url.pathname === "/api/data")
          return send(200, {
            ...snapshot,
            refreshError,
            busy,
            checkJob,
            checksAvailable: Object.keys(CHECKS),
          });
        if (url.pathname === "/api/file") {
          const file = url.searchParams.get("path");
          const source = await readSource(root, file);
          const tracked = await run(
            root,
            ["git", "ls-files", "--error-unmatch", "--", file],
            5000,
          );
          return send(200, { ...source, tracked: tracked.ok });
        }
        if (url.pathname === "/api/search") {
          const q = (url.searchParams.get("q") || "").toLowerCase();
          return send(
            200,
            snapshot.documents
              .filter((d) =>
                (d.title + " " + d.content + " " + d.path)
                  .toLowerCase()
                  .includes(q),
              )
              .map((d) => ({
                path: d.path,
                title: d.title,
                category: d.category,
              })),
          );
        }
        const staticFiles = {
          "/": "index.html",
          "/app.js": "app.js",
          "/styles.css": "styles.css",
        };
        const f = staticFiles[url.pathname];
        if (!f) return send(404, { error: "Nicht gefunden." });
        const type = f.endsWith(".js")
          ? "text/javascript"
          : f.endsWith(".css")
            ? "text/css"
            : "text/html";
        res.writeHead(200, { "Content-Type": type + "; charset=utf-8" });
        res.end(await readFile(path.join(PUBLIC, f)));
        return;
      }
      if (req.method !== "POST")
        return send(405, { error: "Methode nicht erlaubt." });
      if (
        req.headers.origin !== `http://${host}` ||
        !/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")
      )
        return send(403, {
          error: "Lokaler JSON-Aufruf mit passender Origin erforderlich.",
        });
      if (busy) return send(409, { error: "Ein Vorgang läuft bereits." });
      busy = true;
      try {
        let raw = "";
        for await (const chunk of req) {
          raw += chunk;
          if (Buffer.byteLength(raw) > 300000)
            return send(413, { error: "Anfrage zu groß." });
        }
        let input;
        try {
          input = JSON.parse(raw || "{}");
        } catch {
          return send(400, { error: "Ungültiges JSON." });
        }
        if (!input || typeof input !== "object" || Array.isArray(input))
          return send(400, { error: "JSON-Objekt erwartet." });
        if (url.pathname === "/api/refresh") {
          await refresh();
          return send(200, { generatedAt: snapshot.generatedAt });
        }
        if (url.pathname === "/api/github") {
          await refreshGitHub(root);
          await refresh();
          return send(200, { ok: true });
        }
        if (url.pathname === "/api/validate")
          return send(200, await validateDraft(root, input));
        if (url.pathname === "/api/drafts") {
          const d = await saveDraft(root, input);
          await refresh();
          return send(200, d);
        }
        if (url.pathname === "/api/apply") {
          const d = await applyDraft(root, input.id);
          await refresh();
          return send(200, d);
        }
        if (url.pathname === "/api/work-items") {
          const item = await addWorkItem(root, input);
          await refresh();
          return send(200, item);
        }
        if (url.pathname === "/api/work-items/status") {
          const item = await updateWorkItem(root, input.id, input);
          await refresh();
          return send(200, item);
        }
        if (url.pathname === "/api/checks") {
          if (!Object.hasOwn(CHECKS, input.key))
            return send(400, { error: "Unbekannte Prüfung." });
          if (checkJob?.state === "running")
            return send(409, { error: "Prüfung läuft bereits." });
          checkJob = {
            key: input.key,
            state: "running",
            startedAt: new Date().toISOString(),
          };
          runCheck(root, input.key)
            .then((result) => {
              checkJob = { ...result, state: "finished" };
            })
            .catch((e) => {
              checkJob = { key: input.key, state: "error", error: e.message };
            })
            .then(() => refresh())
            .catch((e) => {
              refreshError = e.message;
            });
          return send(202, checkJob);
        }
        return send(404, { error: "Nicht gefunden." });
      } finally {
        busy = false;
      }
    } catch (e) {
      send(400, { error: e.message });
    }
  });
  const watchers = [];
  let timer;
  for (const dir of [
    "",
    "src",
    "scripts",
    "tests",
    "docs",
    "design-system",
    "tools/project-dashboard",
  ]) {
    try {
      const watcher = watch(
        path.join(root, dir),
        { recursive: dir !== "" },
        (_event, name) => {
          const file = String(name || "");
          if (
            dir === "" &&
            !(
              /^[\w-]+\.md$/.test(file) ||
              /^(package(-lock)?|tsconfig)\.json$/.test(file) ||
              file === "astro.config.mjs"
            )
          )
            return;
          const schedule = () => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
              if (busy) {
                schedule();
                return;
              }
              busy = true;
              try {
                await refresh();
              } catch {
                /* refresh retains the last successful snapshot. */
              } finally {
                busy = false;
              }
            }, 500);
          };
          schedule();
        },
      );
      watcher.on("error", () => {});
      watcher.unref();
      watchers.push(watcher);
    } catch {
      /* Optional directories can be absent. */
    }
  }
  server.on("close", () => {
    clearTimeout(timer);
    watchers.forEach((w) => w.close());
  });
  return server;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.DASHBOARD_PORT || 4391);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("DASHBOARD_PORT muss zwischen 1024 und 65535 liegen.");
  const server = await createDashboard();
  server.on("error", (e) => {
    console.error(
      e.code === "EADDRINUSE"
        ? `Port ${port} ist belegt. Anderen DASHBOARD_PORT verwenden.`
        : e.message,
    );
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(`Motto Immortal Command Center: http://127.0.0.1:${port}`),
  );
}

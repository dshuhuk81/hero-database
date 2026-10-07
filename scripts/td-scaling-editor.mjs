// Local editor for stage hpScale. Serves the scaling page and writes edits into tdCampaign.json.
// Run: npm run td:scaling-editor  [--port=4599]
// Only the hpScale number of each edited stage is replaced in the raw text, so the file keeps its formatting.
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { buildHtml, CAMPAIGN_PATH } from "./td-scaling-overview.mjs";

const port = Number((process.argv.find((a) => a.startsWith("--port=")) || "--port=4599").slice(7));

function saveHp(changes) {
  let text = readFileSync(CAMPAIGN_PATH, "utf8");
  const before = JSON.parse(text);
  const known = new Set(before.chapters.flatMap((c) => c.stages.map((s) => s.id)));
  let saved = 0;
  for (const [id, value] of Object.entries(changes)) {
    if (!known.has(id)) throw new Error(`unknown stage ${id}`);
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new Error(`bad hpScale for ${id}`);
    const at = text.indexOf(`"id": "${id}"`);
    if (at < 0) throw new Error(`stage ${id} not found in file text`);
    const re = /("hpScale":\s*)[\d.]+/g;
    re.lastIndex = at;
    const m = re.exec(text);
    if (!m) throw new Error(`hpScale of ${id} not found`);
    text = text.slice(0, m.index) + m[1] + String(Math.round(value * 100) / 100) + text.slice(m.index + m[0].length);
    saved++;
  }
  const after = JSON.parse(text); // must still parse; also verify only hpScale moved
  after.chapters.forEach((c, ci) => c.stages.forEach((s, si) => {
    const o = before.chapters[ci].stages[si];
    if (JSON.stringify({ ...s, hpScale: 0 }) !== JSON.stringify({ ...o, hpScale: 0 })) throw new Error(`unexpected change in ${s.id}`);
  }));
  writeFileSync(CAMPAIGN_PATH, text);
  return saved;
}

createServer((req, res) => {
  const send = (code, body, type = "application/json") => { res.writeHead(code, { "content-type": type }); res.end(body); };
  try {
    if (req.method === "GET" && req.url === "/") return send(200, buildHtml({ editable: true }), "text/html; charset=utf-8");
    if (req.method === "POST" && req.url === "/save") {
      let body = "";
      req.on("data", (d) => (body += d));
      req.on("end", () => {
        try { send(200, JSON.stringify({ saved: saveHp(JSON.parse(body)) })); }
        catch (e) { send(400, JSON.stringify({ error: e.message })); }
      });
      return;
    }
    send(404, "{}");
  } catch (e) { send(500, JSON.stringify({ error: e.message })); }
}).listen(port, "127.0.0.1", () => console.log(`TD scaling editor: http://127.0.0.1:${port}`));

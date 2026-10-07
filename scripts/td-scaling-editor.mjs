// Local editor: stage hpScale (tdCampaign.json) and hero stat factors (heroMultipliers in gameBalance.tuning.json).
// Serves the scaling page and writes edits back.
// Run: npm run td:scaling-editor  [--port=4599]
// Only the hpScale number of each edited stage is replaced in the raw text, so the file keeps its formatting.
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { buildHtml, CAMPAIGN_PATH, TUNING_PATH, BALANCE_PATH, STATS } from "./td-scaling-overview.mjs";

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

// Replace only the "heroMultipliers" block of gameBalance.tuning.json (keeps the file's formatting).
function saveHeroMultipliers(m) {
  let text = readFileSync(TUNING_PATH, "utf8");
  const tuning = JSON.parse(text);
  const heroIds = new Set(JSON.parse(readFileSync(BALANCE_PATH, "utf8")).map((h) => h.id));
  const rarities = new Set(JSON.parse(readFileSync(BALANCE_PATH, "utf8")).map((h) => h.rarity));
  const classes = new Set(Object.keys(tuning.classes));
  const num = (v, where) => { if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) throw new Error(`bad factor at ${where}`); return Math.round(v * 1000) / 1000; };
  const clean = {};
  for (const st of STATS) clean[st] = num(m[st] ?? 1, st);
  const group = (name, allowed) => {
    const out = {};
    for (const [key, factors] of Object.entries(m[name] ?? {})) {
      if (!allowed.has(key)) throw new Error(`unknown ${name} key ${key}`);
      out[key] = {};
      for (const [st, v] of Object.entries(factors)) {
        if (!STATS.includes(st)) throw new Error(`unknown stat ${st}`);
        if (v !== 1) out[key][st] = num(v, `${name}.${key}.${st}`);
      }
    }
    return out;
  };
  clean.byRarity = group("byRarity", rarities);
  clean.byClass = group("byClass", classes);
  clean.byHero = group("byHero", heroIds);
  for (const k of Object.keys(clean.byHero)) if (!Object.keys(clean.byHero[k]).length) delete clean.byHero[k];
  const inline = (o) => (Object.keys(o).length ? `{ ${Object.entries(o).map(([k, v]) => `${JSON.stringify(k)}: ${v}`).join(", ")} }` : "{}");
  const table = (o) => (Object.keys(o).length ? `{\n${Object.entries(o).map(([k, v]) => `      ${JSON.stringify(k)}: ${inline(v)}`).join(",\n")}\n    }` : "{}");
  const block = `"heroMultipliers": {\n${STATS.map((st) => `    "${st}": ${clean[st]},`).join("\n")}\n    "byRarity": ${table(clean.byRarity)},\n    "byClass": ${table(clean.byClass)},\n    "byHero": ${table(clean.byHero)}\n  }`;
  const start = text.indexOf('"heroMultipliers"');
  if (start < 0) throw new Error("heroMultipliers block not found");
  let depth = 0, end = -1;
  for (let i = text.indexOf("{", start); i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) { end = i + 1; break; }
  }
  if (end < 0) throw new Error("unterminated heroMultipliers block");
  text = text.slice(0, start) + block + text.slice(end);
  const after = JSON.parse(text);
  if (JSON.stringify({ ...after, heroMultipliers: 0 }) !== JSON.stringify({ ...tuning, heroMultipliers: 0 })) throw new Error("unexpected change outside heroMultipliers");
  writeFileSync(TUNING_PATH, text);
  return Object.keys(clean.byHero).length;
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
    if (req.method === "POST" && req.url === "/save-heroes") {
      let body = "";
      req.on("data", (d) => (body += d));
      req.on("end", () => {
        try { send(200, JSON.stringify({ heroOverrides: saveHeroMultipliers(JSON.parse(body)) })); }
        catch (e) { send(400, JSON.stringify({ error: e.message })); }
      });
      return;
    }
    send(404, "{}");
  } catch (e) { send(500, JSON.stringify({ error: e.message })); }
}).listen(port, "127.0.0.1", () => console.log(`TD scaling editor: http://127.0.0.1:${port}`));

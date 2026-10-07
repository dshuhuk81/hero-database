// Enemy HP / ATK scale per chapter and stage, as one self-contained HTML page.
// Static file:  node scripts/td-scaling-overview.mjs      -> docs/td-scaling-overview.html (read only)
// Editable:     npm run td:scaling-editor                 -> http://127.0.0.1:4599 (saves hpScale into tdCampaign.json)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const CAMPAIGN_PATH = join(root, "src/data/tdCampaign.json");
const TUNING_PATH = join(root, "src/data/gameBalance.tuning.json");

const goalText = (g) => {
  if (!g) return "";
  switch (g.type) {
    case "noFall": return "No life lost";
    case "noLeakKind": return `No ${g.kind} leaks`;
    case "maxHeroes": return `Max ${g.count} heroes`;
    case "noClass": return `No ${g.class}`;
    default: return g.type;
  }
};

export function buildHtml({ editable = false } = {}) {
  const campaign = JSON.parse(readFileSync(CAMPAIGN_PATH, "utf8"));
  const tiers = JSON.parse(readFileSync(TUNING_PATH, "utf8")).tiers;
  const data = {
    editable,
    heroic: { hp: tiers.heroic.enemyHp, atk: tiers.heroic.enemyAttack },
    chapters: campaign.chapters.map((c, i) => ({
      n: i + 1,
      name: c.name,
      stages: c.stages.map((s) => ({
        id: s.id, name: s.name, rule: s.rule || "", hp: s.hpScale, atk: s.atkScale,
        lives: s.lives, might: s.recommendedMight ?? null, goal: goalText(s.goal),
      })),
    })),
  };
  return TEMPLATE.replace("/*DATA*/", JSON.stringify(data).replace(/</g, "\\u003c"));
}

const TEMPLATE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TD Scaling Overview</title>
<style>
:root{--bg:#14161c;--card:#1c1f27;--ink:#e8e6df;--mute:#8d93a1;--line:#2c303b;--hp:#e0a24a;--atk:#6aa9e0;--up:#e86a5c;--down:#6cc08b;--dirty:rgba(224,162,74,.16);--field:#12141a}
@media (prefers-color-scheme:light){:root{--bg:#f6f4ee;--card:#fff;--ink:#22252c;--mute:#6b7080;--line:#e2dfd5;--hp:#b8741a;--atk:#2d6fae;--up:#c4382a;--down:#2c8a55;--dirty:rgba(184,116,26,.14);--field:#faf8f3}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,sans-serif;padding:24px 16px 90px}
main{max-width:1200px;margin:0 auto}h1{margin:0 0 4px;font-size:24px}p.sub{color:var(--mute);margin:0 0 20px}
section,.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px;overflow-x:auto}
h2{font-size:16px;margin:0 0 10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}h2 small{color:var(--mute);font-weight:400}
.tools{margin-left:auto;display:flex;gap:6px;align-items:center;font-size:12px;color:var(--mute)}
table{width:100%;border-collapse:collapse;min-width:900px}th,td{padding:4px 8px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}
th{color:var(--mute);font-weight:500;font-size:12px}.num{text-align:right;font-variant-numeric:tabular-nums}
.id{color:var(--mute)}.atk{color:var(--atk)}.up{color:var(--up)}.down{color:var(--down)}.goal{color:var(--mute)}
.barcell{width:24%}.bar{height:8px;background:var(--line);border-radius:4px;overflow:hidden}.bar i{display:block;height:100%;background:var(--hp)}
.tag{font-size:11px;color:var(--mute);border:1px solid var(--line);border-radius:4px;padding:0 5px;margin-left:4px}
input,button{font:inherit;color:var(--ink)}
input.hp{width:84px;text-align:right;background:var(--field);border:1px solid var(--line);border-radius:6px;padding:3px 6px;font-variant-numeric:tabular-nums;color:var(--hp);font-weight:600}
input.hp:focus{outline:2px solid var(--hp);outline-offset:0}input.fac{width:60px;text-align:right;background:var(--field);border:1px solid var(--line);border-radius:6px;padding:2px 6px}
.ro{color:var(--hp);font-weight:600}
button{background:var(--field);border:1px solid var(--line);border-radius:6px;padding:3px 10px;cursor:pointer}button:hover{border-color:var(--hp)}
tr.dirty td{background:var(--dirty)}.orig{color:var(--mute);font-size:11px;margin-left:6px}
.legend{display:flex;gap:16px;color:var(--mute);font-size:12px;margin-bottom:6px}.legend b{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px}
svg{width:100%;height:auto;display:block}.grid{stroke:var(--line)}.ch{stroke:var(--line);stroke-dasharray:3 3}.lbl{fill:var(--mute);font-size:11px}
#savebar{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);padding:10px 16px;display:none;justify-content:center;gap:12px;align-items:center}
#savebar.on{display:flex}#savebar .go{background:var(--hp);color:#14161c;border-color:var(--hp);font-weight:600;padding:6px 18px}
#msg{color:var(--mute)}
</style></head><body><main>
<h1>Tower Defense scaling overview</h1>
<p class="sub" id="sub"></p>
<div class="card"><div class="legend"><span><b style="background:var(--hp)"></b>Enemy HP (log axis)</span><span><b style="background:var(--atk)"></b>Enemy ATK (linear)</span></div><div id="chart"></div></div>
<div id="chapters"></div>
</main>
<div id="savebar"><span id="count"></span><button id="reset">Discard changes</button><button class="go" id="save">Save to tdCampaign.json</button><span id="msg"></span></div>
<script>
const D = /*DATA*/;
const $ = (s, r = document) => r.querySelector(s);
const fmt = (n) => String(Math.round(n * 100) / 100);
const stages = D.chapters.flatMap((c) => c.stages.map((s) => (s.orig = s.hp, s.ch = c.n, s)));
const dirtyList = () => stages.filter((s) => s.hp !== s.orig);

$('#sub').innerHTML = (D.editable
  ? 'Edit any <b>Enemy HP</b> value (or use the chapter factor), then <b>Save</b>. It writes <code>hpScale</code> into <code>src/data/tdCampaign.json</code>, so tests pick it up right away.'
  : 'Read only. Run <code>npm run td:scaling-editor</code> to edit and save.')
  + ' Enemy HP is the stage <code>hpScale</code>, ATK is <code>atkScale</code>. Heroic columns apply x' + D.heroic.hp + ' HP and x' + D.heroic.atk + ' ATK.';

function chart() {
  const W = 1000, H = 220, p = { l: 40, r: 10, t: 10, b: 24 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
  const hs = stages.map((s) => s.hp), lo = Math.min(...hs) * 0.8, hi = Math.max(...hs) * 1.05;
  const maxAtk = Math.max(...stages.map((s) => s.atk)) * 1.05, n = stages.length;
  const x = (i) => p.l + i / (n - 1) * iw;
  const yH = (v) => p.t + ih - (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * ih;
  const yA = (v) => p.t + ih - v / maxAtk * ih;
  const path = (f) => stages.map((s, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + f(s).toFixed(1)).join(' ');
  const origPath = stages.map((s, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + yH(s.orig).toFixed(1)).join(' ');
  let grid = [0.5, 1, 2, 5, 10, 20, 50, 100].filter((v) => v >= lo && v <= hi).map((v) =>
    '<line x1="' + p.l + '" x2="' + (W - p.r) + '" y1="' + yH(v).toFixed(1) + '" y2="' + yH(v).toFixed(1) + '" class="grid"/><text x="' + (p.l - 6) + '" y="' + (yH(v) + 4).toFixed(1) + '" class="lbl" text-anchor="end">' + v + 'x</text>').join('');
  let idx = 0, lines = '';
  D.chapters.forEach((c, ci) => {
    const xx = x(idx) - (ci ? iw / (n - 1) / 2 : 0); idx += c.stages.length;
    lines += '<line x1="' + xx.toFixed(1) + '" x2="' + xx.toFixed(1) + '" y1="' + p.t + '" y2="' + (p.t + ih) + '" class="ch"/><text x="' + (xx + 3).toFixed(1) + '" y="' + (H - 8) + '" class="lbl">Ch ' + c.n + '</text>';
  });
  const changed = dirtyList().length ? '<path d="' + origPath + '" fill="none" stroke="var(--mute)" stroke-width="1.5" stroke-dasharray="4 3"/>' : '';
  $('#chart').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '">' + grid + lines + '<path d="' + path((s) => yA(s.atk)) + '" fill="none" stroke="var(--atk)" stroke-width="2"/>' + changed + '<path d="' + path((s) => yH(s.hp)) + '" fill="none" stroke="var(--hp)" stroke-width="2"/></svg>';
}

function build() {
  $('#chapters').innerHTML = D.chapters.map((c) => '<section data-ch="' + c.n + '"><h2>Chapter ' + c.n + ': ' + c.name +
    ' <small class="stat"></small>' + (D.editable ? '<span class="tools">chapter factor x <input class="fac" type="number" step="0.05" value="1"><button class="apply">Apply</button></span>' : '') + '</h2>' +
    '<table><thead><tr><th>Stage</th><th>Name</th><th class="num">Enemy HP</th><th>HP (log scale)</th><th class="num">vs prev</th><th class="num">Enemy ATK</th><th class="num">Heroic HP</th><th class="num">Heroic ATK</th><th class="num">Lives</th><th class="num">Rec. Might</th><th>Goal</th></tr></thead><tbody>' +
    c.stages.map((s) => '<tr data-id="' + s.id + '"><td class="id">' + s.id + '</td><td>' + s.name + (s.rule ? ' <span class="tag">' + s.rule + '</span>' : '') + '</td>' +
      '<td class="num">' + (D.editable ? '<input class="hp" type="number" step="0.01" min="0.01" value="' + s.hp + '">' : '<span class="ro">' + fmt(s.hp) + 'x</span>') + '<span class="orig"></span></td>' +
      '<td class="barcell"><div class="bar"><i></i></div></td><td class="num d"></td><td class="num atk">' + fmt(s.atk) + 'x</td><td class="num hh"></td><td class="num">' + fmt(s.atk * D.heroic.atk) + 'x</td>' +
      '<td class="num">' + s.lives + '</td><td class="num">' + (s.might ? s.might.toLocaleString('en-US') : '') + '</td><td class="goal">' + s.goal + '</td></tr>').join('') +
    '</tbody></table></section>').join('');
}

function refresh() {
  const hs = stages.map((s) => s.hp), lo = Math.min(...hs) * 0.8, hi = Math.max(...hs);
  stages.forEach((s, i) => {
    const tr = $('tr[data-id="' + s.id + '"]');
    const prev = stages[i - 1], d = prev ? s.hp / prev.hp : null;
    $('.bar i', tr).style.width = Math.max(1, (Math.log(s.hp) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * 100) + '%';
    const dc = $('.d', tr); dc.textContent = d == null ? 'start' : (d >= 1 ? '+' : '') + Math.round((d - 1) * 100) + '%';
    dc.className = 'num d' + (d != null && d > 1.5 ? ' up' : d != null && d < 0.67 ? ' down' : '');
    $('.hh', tr).textContent = fmt(s.hp * D.heroic.hp) + 'x';
    const dirty = s.hp !== s.orig; tr.classList.toggle('dirty', dirty);
    $('.orig', tr).textContent = dirty ? 'was ' + fmt(s.orig) : '';
  });
  D.chapters.forEach((c) => {
    const v = c.stages.map((s) => s.hp);
    $('section[data-ch="' + c.n + '"] .stat').textContent = c.stages.length + ' stages \\u00b7 min ' + fmt(Math.min(...v)) + 'x \\u00b7 avg ' + fmt(v.reduce((a, b) => a + b, 0) / v.length) + 'x \\u00b7 max ' + fmt(Math.max(...v)) + 'x';
  });
  const n = dirtyList().length;
  $('#savebar').classList.toggle('on', D.editable && n > 0);
  $('#count').textContent = n + ' stage' + (n === 1 ? '' : 's') + ' changed';
  chart();
}

build(); refresh();
if (D.editable) {
  const byId = Object.fromEntries(stages.map((s) => [s.id, s]));
  $('#chapters').addEventListener('input', (e) => {
    if (!e.target.classList.contains('hp')) return;
    const v = parseFloat(e.target.value);
    if (v > 0) { byId[e.target.closest('tr').dataset.id].hp = v; refresh(); }
  });
  $('#chapters').addEventListener('click', (e) => {
    if (!e.target.classList.contains('apply')) return;
    const sec = e.target.closest('section'), f = parseFloat($('.fac', sec).value);
    if (!(f > 0)) return;
    D.chapters[sec.dataset.ch - 1].stages.forEach((s) => { s.hp = Math.round(s.hp * f * 100) / 100; $('tr[data-id="' + s.id + '"] input.hp').value = s.hp; });
    $('.fac', sec).value = 1; refresh();
  });
  $('#reset').onclick = () => { stages.forEach((s) => { s.hp = s.orig; $('tr[data-id="' + s.id + '"] input.hp').value = s.hp; }); refresh(); };
  $('#save').onclick = async () => {
    const changes = Object.fromEntries(dirtyList().map((s) => [s.id, s.hp]));
    $('#msg').textContent = 'saving...';
    try {
      const r = await fetch('/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(changes) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || r.status);
      stages.forEach((s) => { s.orig = s.hp; });
      refresh(); $('#savebar').classList.add('on'); $('#msg').textContent = 'saved ' + j.saved + ' stages at ' + new Date().toLocaleTimeString();
      setTimeout(() => $('#savebar').classList.remove('on'), 4000);
    } catch (err) { $('#msg').textContent = 'save failed: ' + err.message; }
  };
  addEventListener('beforeunload', (e) => { if (dirtyList().length) e.preventDefault(); });
}
</script></body></html>
`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = join(root, "docs/td-scaling-overview.html");
  writeFileSync(out, buildHtml());
  console.log(`wrote ${out}`);
}

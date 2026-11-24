const $ = (s) => document.querySelector(s);
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const date = (value) =>
  value
    ? new Date(value).toLocaleString("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Unbekannt";
const labels = {
  implemented: "Umgesetzt",
  planned: "Geplant",
  "in-progress": "In Arbeit",
  blocked: "Blockiert",
  "needs-review": "Prüfen",
};
const sections = [
  ["overview", "◫", "Übersicht"],
  ["heroes", "♙", "Helden & Datenqualität"],
  ["ratings", "≋", "Ratings & Empfehlungen"],
  ["studio", "✎", "Content Studio"],
  ["roadmap", "⚑", "Roadmap & Feedback"],
  ["assets", "▧", "Importe & Assets"],
  ["health", "◷", "Project Health"],
  ["documents", "▤", "Wissensbasis"],
];
let data,
  view = "overview",
  pollTimer,
  noticeTimer;
const filters = { q: "", status: "", faction: "" };
const badge = (s) =>
  `<span class="tag ${escape(s)}">${escape(labels[s] || s)}</span>`;
const source = (p, label = "Quelle öffnen") =>
  `<button class="link-button source-link" data-source="${escape(p)}">${escape(label)} ↗</button>`;
const empty = (s) => `<div class="empty">${escape(s)}</div>`;
function notify(message) {
  $("#notice").textContent = message;
  $("#notice").classList.add("visible");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(
    () => $("#notice").classList.remove("visible"),
    9000,
  );
}
async function api(url, body) {
  const r = await fetch(
    url,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  let value;
  try {
    value = await r.json();
  } catch {
    throw new Error(
      "Serverantwort nicht lesbar. Lokalen Dashboard-Server neu starten.",
    );
  }
  if (!r.ok) throw new Error(value.error || `HTTP ${r.status}`);
  return value;
}
async function reload(renderPage = true) {
  data = await api("/api/data");
  if (!Array.isArray(data.heroes))
    throw new Error("Dashboard-Datenformat unbekannt. Server neu starten.");
  $("#stamp").textContent =
    `Stand: ${date(data.generatedAt)} · ${data.git.branch || "Git nicht verfügbar"}`;
  syncWarning();
  if (renderPage) render();
  if (data.checkJob?.state === "running") {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(async () => {
      try {
        await reload(view === "health");
      } catch (e) {
        notify(e.message);
      }
    }, 1500);
  }
}
function heading(title, description, num) {
  return `<div class="page-head"><div><p class="eyebrow">MOTTO IMMORTAL / PROJECT WORKSPACE</p><h1>${title}</h1><p class="lead">${description}</p></div><span class="page-number">${num} / 08</span></div>`;
}
function stats(items) {
  return `<div class="stats">${items.map(([value, label]) => `<div class="stat"><b>${escape(value)}</b><span>${escape(label)}</span></div>`).join("")}</div>`;
}
function row(title, description, right = "") {
  return `<div class="row"><div class="row-main"><h3>${title}</h3>${description ? `<p>${description}</p>` : ""}</div>${right}</div>`;
}
function render() {
  view = location.hash.slice(1).split("?")[0] || "overview";
  if (!sections.some((s) => s[0] === view) && view !== "search")
    view = "overview";
  $("#nav").innerHTML = sections
    .map(
      ([id, icon, label]) =>
        `<a href="#${id}" class="${view === id ? "active" : ""}" ${view === id ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icon}</span>${label}</a>`,
    )
    .join("");
  $("#breadcrumb").textContent =
    `Workspace / ${sections.find((s) => s[0] === view)?.[2] || "Suche"}`;
  syncWarning();
  $("#main").innerHTML = {
    overview,
    heroes,
    ratings,
    studio,
    roadmap,
    assets,
    health,
    documents,
    search,
  }[view]();
  bind();
  $("#sidebar").classList.remove("open");
  $("#menu").setAttribute("aria-expanded", "false");
}
function overview() {
  const pending = data.heroes.filter((h) => h.issues.length);
  const active = data.milestones.filter((m) => m.status === "in-progress");
  return (
    heading(
      "Dein Projekt. Ein klarer Überblick.",
      "Daten, Inhalte und nächste Schritte – direkt aus deinem Repository, an einem Ort.",
      "01",
    ) +
    stats([
      [data.heroes.length, "Helden in der Datenbank"],
      [pending.length, "Helden mit offenen Hinweisen"],
      [data.documents.length, "Indexierte Dokumente"],
      [
        data.workItems.filter((i) => i.status !== "implemented").length,
        "Offene Arbeitseinträge",
      ],
    ]) +
    `<div class="grid"><div><section class="section"><div class="section-top"><h2>Aktueller Meilenstein</h2><span class="meta">Aus der bestehenden Roadmap</span></div>${active.map((m) => row(escape(m.title), `${escape(m.description)}<br>${source(m.path)}`, badge(m.status))).join("") || empty("Kein aktiver Meilenstein in der Roadmap ausgewiesen.")}</section><section class="section"><div class="section-top"><h2>Zuletzt geändert</h2><span class="meta">Git-Historie</span></div>${data.git.recent.map((c) => row(escape(c.title), `${escape(c.id)} · ${date(c.date)}`)).join("") || empty("Keine Git-Historie verfügbar.")}</section><section class="section"><h2>Offene Aufgaben</h2>${
      data.workItems
        .filter((i) => i.status !== "implemented")
        .slice(0, 6)
        .map((i) =>
          row(
            escape(i.title),
            escape(i.description.slice(0, 160)),
            badge(i.status),
          ),
        )
        .join("") ||
      empty(
        "Noch keine internen Aufgaben erfasst. Neues Spielerfeedback unter Roadmap & Feedback eintragen.",
      )
    }<a href="#roadmap" class="source-link">Roadmap & Feedback öffnen →</a></section></div><div><section class="section"><h2>Projektstatus</h2>${row("Daten-Merge", data.health.mergeSynced ? "Generierte Datenbank entspricht den Heldenquellen." : "Abweichung: Merge nach Quellenänderung erforderlich.", badge(data.health.mergeSynced ? "implemented" : "needs-review"))}${row("Prüfungen", data.health.checks.length ? `${data.health.checks.filter((c) => c.ok && !c.stale).length} aktuelle erfolgreiche Prüfungen` : "Noch keine Prüfungen im Dashboard ausgeführt.")}<a href="#health" class="source-link">Prüfungen verwalten →</a></section><section class="section"><h2>Wichtige Dokumente</h2>${[
      "PRODUCT.md",
      "PROJECT_MEMORY.md",
      "WORKFLOWS.md",
      "DESIGN.md",
      "AGENTS.md",
    ]
      .filter((p) => data.documents.some((d) => d.path === p))
      .map((p) => row(source(p, p), ""))
      .join(
        "",
      )}</section><section class="section"><h2>Arbeitsverzeichnis</h2><p class="muted">Branch: ${escape(data.git.branch || "Unbekannt")} · ${data.git.changes.length} geänderte Einträge</p><pre>${escape(data.git.changes.join("\n") || "Keine lokalen Änderungen gemeldet.")}</pre></section></div></div>`
  );
}
function toolbar(type) {
  return `<div class="toolbar"><input id="local-search" type="search" placeholder="Held oder Hinweis suchen …" aria-label="Helden filtern" value="${escape(filters.q)}"><select id="faction-filter" aria-label="Fraktion"><option value="">Alle Fraktionen</option>${[
    ...new Set(data.heroes.map((h) => h.faction)),
  ]
    .sort()
    .map(
      (v) =>
        `<option ${filters.faction === v ? "selected" : ""}>${escape(v)}</option>`,
    )
    .join(
      "",
    )}</select><select id="status-filter" aria-label="Datenstatus"><option value="">Jeder Status</option><option value="needs-review" ${filters.status === "needs-review" ? "selected" : ""}>Mit offenen Hinweisen</option><option value="implemented" ${filters.status === "implemented" ? "selected" : ""}>Ohne Hinweise</option></select><span class="count" id="filter-count"></span></div><div id="filtered-content" data-type="${type}"></div>`;
}
function filteredHeroes() {
  return data.heroes.filter(
    (h) =>
      (!filters.faction || h.faction === filters.faction) &&
      (!filters.status || h.status === filters.status) &&
      `${h.name} ${h.id} ${h.issues.join(" ")}`
        .toLowerCase()
        .includes(filters.q.toLowerCase()),
  );
}
function renderFiltered() {
  const el = $("#filtered-content");
  if (!el) return;
  const list = filteredHeroes();
  $("#filter-count").textContent =
    `${list.length} von ${data.heroes.length} Helden`;
  if (el.dataset.type === "ratings") {
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Held</th>${data.ratingFactors.map((f) => `<th>${escape(f.group)} ${escape(f.label)}</th>`).join("")}<th>Overall</th><th></th></tr></thead><tbody>${list.map((h) => `<tr><td><b>${escape(h.name)}</b><small>${escape(h.faction)}</small></td>${data.ratingFactors.map((f) => `<td>${escape(h.ratings[f.key] || "—")}</td>`).join("")}<td><b>${escape(h.overall.tier || "—")}</b><small>${h.overall.complete ? "Vollständig" : `Provisional · ${h.overall.ratedFields}/6`}</small>${h.overall.reason ? `<small>${escape(h.overall.reason)}</small>` : ""}</td><td><button class="link-button" data-edit="rating" data-id="${escape(h.id)}">Bearbeiten</button></td></tr>`).join("")}</tbody></table></div>${!list.length ? empty("Keine passenden Helden.") : ""}`;
  } else {
    el.innerHTML = `<div class="hero-list">${list.map((h) => `<details><summary><span class="hero-summary">${h.image ? `<img loading="lazy" src="${escape(h.image)}" alt="">` : ""}<span>${escape(h.name)}<small class="meta"> · ${escape(h.faction)} / ${escape(h.role)}</small></span>${badge(h.status)}</span></summary><div class="detail-body"><span class="meta">${escape(h.id)} · ${escape(h.class || "Klasse unbekannt")}</span>${h.issues.length ? `<ul class="issues">${h.issues.map((i) => `<li>${escape(i)}</li>`).join("")}</ul>` : "<p>Keine Hinweise aus den automatischen Basisprüfungen.</p>"}<p>Overall ${escape(h.overall.tier || "offen")} · ${h.overall.ratedFields}/6 Kontexte</p><div class="detail-actions">${source(h.path, "Helden-Daten ansehen")}<button class="link-button" data-edit="hero" data-id="${escape(h.id)}">Entwurf erstellen</button></div></div></details>`).join("")}</div>${!list.length ? empty("Keine passenden Helden.") : ""}`;
  }
  bindActions(el);
}
function heroes() {
  return (
    heading(
      "Helden & Datenqualität",
      "Fehlende Angaben, unvollständige Ratings und Referenzen prüfen. Hinweise sind Prüfbedarf, keine Bewertung der Spielstärke.",
      "02",
    ) + toolbar("heroes")
  );
}
function ratings() {
  return (
    heading(
      "Ratings & Empfehlungen",
      "Sechs bestehende Kontexte. Overall wird mit der vorhandenen Projektlogik berechnet; fehlende Werte bleiben offen.",
      "03",
    ) +
    `<div class="info">${data.ratingFactors.map((f) => `${escape(f.group)} ${escape(f.label)}: ${f.weight * 100} %`).join(" · ")}<br>Diese Gewichte stammen aus ratingSystem.js. ${source("src/data/ratings/README.md", "Methodik")}</div>` +
    toolbar("ratings")
  );
}
function studio() {
  return (
    heading(
      "Content Studio",
      "Quelle öffnen, Entwurf bearbeiten, Diff prüfen und validierte Änderungen bewusst übernehmen.",
      "04",
    ) +
    `<div class="grid"><section class="section"><h2>Neuer Entwurf</h2><form id="draft-form"><div class="form-grid"><label class="field">Inhaltstyp<select id="draft-kind"><option value="hero">Held (JSON)</option><option value="rating">Rating (JSON)</option><option value="guide">Guide-Recherche (Markdown)</option></select></label><label class="field">Ziel-ID<input id="draft-id" list="hero-ids" placeholder="z. B. amunra" required pattern="[a-z0-9][a-z0-9-]{0,79}"><datalist id="hero-ids">${data.heroes.map((h) => `<option value="${escape(h.id)}">${escape(h.name)}</option>`).join("")}</datalist></label></div><div class="actions"><button type="button" id="load-source">Vorhandene Quelle laden</button><button type="button" id="new-template">Leere Vorlage</button></div><label class="field">Entwurfsinhalt<textarea id="draft-content" class="code" spellcheck="false" required placeholder="Quelle laden oder Vorlage anlegen"></textarea></label><div class="actions"><button type="button" id="validate-draft">Validieren</button><button class="primary" type="submit">Entwurf & Diff speichern</button></div><p class="meta" id="validation-result" role="status"></p></form></section><section class="section"><h2>Entwürfe zur Prüfung</h2><p class="muted">Helden und Ratings werden in ihre bestehenden Quellen übernommen. Guides bleiben interne Recherche; eine öffentliche Astro-Seite benötigt zusätzlich die bestehende Guide-Struktur und den Index.</p>${
      data.drafts
        .filter((d) => !d.appliedAt)
        .map(
          (d) =>
            `<div class="draft"><h3>${escape(d.targetId)} <span class="tag">${escape(d.kind)}</span></h3><p class="meta">${date(d.createdAt)} · ${escape(d.path)}</p><pre class="diff">${d.diff.map((l) => `<span class="diff-line diff-${escape(l.type)}">${l.type === "add" ? "+" : l.type === "remove" ? "-" : " "} ${escape(l.text)}</span>`).join("")}</pre><div class="actions"><button class="primary" data-apply="${d.id}">Validieren & übernehmen</button>${source(d.path, "Aktuelle Quelle")}</div></div>`,
        )
        .join("") || empty("Keine offenen Entwürfe.")
    }<p class="meta">${data.drafts.filter((d) => d.appliedAt).length} Entwürfe bereits übernommen.</p></section></div>`
  );
}
function roadmap() {
  return (
    heading(
      "Roadmap & Feedback",
      "Bestehende Meilensteine verfolgen und neue Rückmeldungen als versionierte Arbeitseinträge erfassen.",
      "05",
    ) +
    `<div class="grid"><div><section class="section"><h2>Meilensteine aus dem Site Audit</h2>${data.milestones.map((m) => `<details class="milestone ${m.status}"><summary>${escape(m.id)} · ${escape(m.title)} ${badge(m.status)}</summary><p>${escape(m.description)}</p><p class="meta">Originalstatus: ${escape(m.sourceStatus)}</p>${source(m.path, "Roadmap-Dokument")}</details>`).join("") || empty("Keine Meilensteine im Roadmap-Dokument erkannt.")}</section><section class="section"><h2>Arbeitseinträge</h2><div class="toolbar"><select id="work-filter" aria-label="Arbeitseinträge filtern"><option value="">Alle Status</option>${Object.entries(
      labels,
    )
      .filter(([s]) => s !== "needs-review")
      .map(([s, l]) => `<option value="${s}">${l}</option>`)
      .join("")}</select></div><div id="work-list">${
      data.workItems
        .map(
          (i) =>
            `<div class="row work-row" data-status="${i.status}"><div class="row-main"><h3>${escape(i.title)}</h3><span class="meta">${escape(i.category)} · Priorität ${escape(i.priority)} · ${date(i.createdAt)}</span><p class="feedback-description">${escape(i.description)}</p>${i.milestone ? `<p>Meilenstein: ${escape(i.milestone)}</p>` : ""}${i.dependencies.length ? `<p>Abhängig von: ${i.dependencies.map((id) => escape(data.workItems.find((w) => w.id === id)?.title || id)).join(", ")}</p>` : ""}${i.issueUrl ? `<a href="${escape(i.issueUrl)}" target="_blank" rel="noreferrer">GitHub Issue ↗</a>` : ""}</div><select class="status-select" data-work="${i.id}" aria-label="Status für ${escape(i.title)}">${Object.entries(
              labels,
            )
              .filter(([s]) => s !== "needs-review")
              .map(
                ([s, l]) =>
                  `<option value="${s}" ${i.status === s ? "selected" : ""}>${l}</option>`,
              )
              .join("")}</select></div>`,
        )
        .join("") ||
      empty("Noch keine Arbeitseinträge. Feedback rechts erfassen.")
    }</div></section></div><div><section class="section"><h2>Feedback / Aufgabe erfassen</h2><form id="work-form"><label class="field">Titel<input name="title" required maxlength="180" placeholder="Was soll verbessert werden?"></label><div class="form-grid"><label class="field">Kategorie<select name="category"><option value="feedback">Spielerfeedback</option><option value="feature">Feature</option><option value="bug">Fehler</option><option value="content">Inhalt</option><option value="technical">Technik</option></select></label><label class="field">Priorität<select name="priority"><option value="normal">Normal</option><option value="high">Hoch</option><option value="low">Niedrig</option></select></label></div><label class="field">Beobachtung, Quelle und offene Fragen<textarea name="description" required placeholder="Was wurde beobachtet? Wann und von wem? Was ist noch unbestätigt?"></textarea></label><label class="field">Meilenstein<select name="milestone"><option value="">Noch nicht zugeordnet</option>${data.milestones.map((m) => `<option value="${m.id}">${escape(m.id + " · " + m.title)}</option>`).join("")}</select></label><label class="field">Abhängigkeit<select name="dependency"><option value="">Keine</option>${data.workItems.map((i) => `<option value="${i.id}">${escape(i.title)}</option>`).join("")}</select></label><label class="field">GitHub Issue (optional)<input name="issueUrl" type="url" placeholder="https://github.com/…/issues/123"></label><button class="primary">Eintrag speichern</button><p class="meta">Speichert tools/project-dashboard/work-items.json. Keine automatische Veröffentlichung.</p></form></section><section class="section"><div class="section-top"><h2>GitHub Issues</h2><button id="github-refresh">Abrufen</button></div><p class="meta">Serverseitig über gh. ${data.github ? `Stand ${date(data.github.fetchedAt)}` : "Noch nicht abgerufen."}</p>${data.github?.issues?.map((i) => row(`<a href="${escape(i.url)}" target="_blank" rel="noreferrer">#${i.number} ${escape(i.title)}</a>`, escape(i.labels.join(" · ")))).join("") || empty("Keine abgerufenen offenen Issues.")}</section></div></div>`
  );
}
function assets() {
  const missing = data.heroes.filter((h) =>
    h.issues.includes("Bildreferenz fehlt"),
  );
  return (
    heading(
      "Importe & Assets",
      "Vorhandene Pipelines nachvollziehen und Datenänderungen vor dem Übernehmen prüfen. Uploads laufen über die bestehenden Werkzeuge.",
      "06",
    ) +
    stats([
      [data.heroes.length - missing.length, "Helden mit Bildreferenz"],
      [missing.length, "Fehlende Bildreferenzen"],
      [
        data.health.mergeSynced ? "Synchron" : "Prüfen",
        "Generierter Helden-Merge",
      ],
      [data.health.ratingOrphans.length, "Ratings ohne Heldenquelle"],
    ]) +
    `<div class="grid"><section class="section"><h2>Bestehende Workflows</h2>${[
      [
        "npm run import:game-data",
        "Game-Client-Daten importieren",
        "scripts/import-game-data.mjs",
      ],
      [
        "npm run after:hero-edit",
        "Helden zusammenführen und Tags validieren",
        "scripts/merge-heroes-db.js",
      ],
      [
        "npm run import-ratings",
        "Rating-Import prüfen",
        "scripts/import-ratings.cjs",
      ],
      [
        "npm run prepare-hero-variants",
        "R2-Bilder laden und Varianten erzeugen",
        "scripts/create-hero-image-variants.mjs",
      ],
      [
        "npm run upload-assets:changed",
        "Geänderte Assets zu R2 hochladen",
        "scripts/upload-to-r2.mjs",
      ],
    ]
      .map(([cmd, desc, p]) =>
        row(`<code>${cmd}</code>`, `${desc}<br>${source(p)}`),
      )
      .join(
        "",
      )}<div class="info">Diese Befehle werden hier dokumentiert. Imports und Uploads werden nicht beim Laden oder Aktualisieren ausgeführt. JSON-Änderungen können im Content Studio als Diff geprüft werden.</div></section><section class="section"><h2>Asset-Prüfung</h2><p class="muted">${escape(data.health.assetVerification)} Eine vorhandene URL belegt noch kein verfügbares Asset.</p>${missing.map((h) => row(escape(h.name), source(h.path))).join("") || empty("Alle Helden besitzen eine Bildreferenz.")}<h2>Rating-Referenzen</h2>${data.health.ratingOrphans.map((id) => row(escape(id), "Kein entsprechender Held in src/data/heroes.")).join("") || empty("Keine verwaisten Rating-Einträge.")}${source("docs/r2-missing-assets.md", "Bekannte fehlende Assets")}</section></div>`
  );
}
function health() {
  return (
    heading(
      "Project Health",
      "Tatsächliche Prüfergebnisse mit Zeitstempel. Änderungen an Quellen machen ältere Ergebnisse sichtbar veraltet.",
      "07",
    ) +
    `<div class="grid"><div><section class="section"><h2>Lokale Prüfungen</h2>${data.checksAvailable
      .map((key) => {
        const c = data.health.checks.find((c) => c.key === key);
        const running = data.checkJob?.state === "running";
        return `<div class="check-card"><div class="actions"><h3>${escape({ ratings: "Rating-Daten", tags: "Helden-Tags", "rating-tests": "Rating-Systemtests", types: "Astro / TypeScript" }[key] || key)}</h3><button data-check="${key}" ${running ? "disabled" : ""}>${running && data.checkJob.key === key ? "Läuft …" : "Prüfung starten"}</button></div><p class="meta">${c ? `${c.ok ? "Erfolgreich" : "Fehlgeschlagen"} · ${date(c.finishedAt)} · ${c.stale ? "VERALTET – Quellen geändert" : "für aktuellen Quellenstand"}` : "Noch nicht ausgeführt."}</p>${c ? `<details><summary>Prüfausgabe · Exit ${c.exitCode ?? "unbekannt"}</summary><pre>${escape(c.output)}</pre></details>` : ""}</div>`;
      })
      .join(
        "",
      )}${data.checkJob?.state === "error" ? `<p class="info warning">${escape(data.checkJob.error)}</p>` : ""}</section><section class="section"><h2>GitHub / externe Checks</h2><button id="github-refresh">GitHub-Status abrufen</button><p class="muted">Nur Läufe für den aktuellen Git-HEAD gelten als zugehörig. Supabase Keepalive ist keine Build- oder Datenprüfung.</p>${data.github?.runs.map((r) => row(`<a href="${escape(r.url)}" target="_blank" rel="noreferrer">${escape(r.name)}</a>`, `${escape(r.conclusion || r.status)} · ${date(r.createdAt)}<br>${r.headSha === data.git.head ? "Aktueller Git-HEAD" : "Anderer Git-Stand"}${/keepalive/i.test(r.name) ? " · Infrastruktur-Ping" : ""}`)).join("") || empty("Keine externen Ergebnisse abgerufen. Cloudflare-Buildstatus ist nicht konfiguriert.")}</section></div><div><section class="section"><h2>Daten & Dokumentation</h2>${row("Helden-Merge", data.health.mergeSynced ? "Quellen und Merge stimmen überein." : "Generierter Merge weicht von den Quellen ab.", badge(data.health.mergeSynced ? "implemented" : "needs-review"))}${row("Dokumentationsindex", `${data.documents.length} lesbare Dokumente indexiert. Inhaltsrichtigkeit und interne Links werden damit nicht automatisch bestätigt.`)}${row("Produktionsbuild", escape(data.health.build))}${row("Letzter Datenrefresh", date(data.generatedAt))}</section><section class="section"><h2>Technische Hinweise</h2><p class="muted">Die vorhandene Supabase-API wird nicht erweitert. GitHub-Zugang bleibt im lokalen Serverprozess. Das Dashboard prüft weder Netzwerkassets noch die Vollständigkeit aller Übersetzungen.</p>${source("AGENTS.md", "Repo-Konventionen")}${source("PROJECT_MEMORY.md", "Projektgedächtnis")}</section></div></div>`
  );
}
function documents() {
  return (
    heading(
      "Die Wissensbasis",
      "Versionierte Dokumente und lokale Recherchen durchsuchen. Änderungen erfolgen an den vorhandenen Quelldateien.",
      "08",
    ) +
    `<div class="toolbar"><input id="document-query" type="search" placeholder="Titel oder Inhalt suchen …" aria-label="Dokumente durchsuchen"><select id="document-category" aria-label="Dokumentkategorie"><option value="">Alle Kategorien</option><option value="documentation">Dokumentation</option><option value="design">Design</option><option value="guide">Guide-Recherche</option></select></div><div id="document-list"></div>`
  );
}
function filterDocuments() {
  const q = ($("#document-query")?.value || "").toLowerCase(),
    category = $("#document-category")?.value || "";
  const list = data.documents.filter(
    (d) =>
      (!category || d.category === category) &&
      `${d.title} ${d.content} ${d.path}`.toLowerCase().includes(q),
  );
  $("#document-list").innerHTML =
    list
      .map((d) =>
        row(
          source(d.path, d.title),
          escape(d.path),
          `<span class="tag">${escape(d.category)}</span>`,
        ),
      )
      .join("") || empty("Keine passenden Dokumente.");
  bindActions($("#document-list"));
}
function search() {
  const q = $("#search").value.trim().toLowerCase();
  const docs = q
    ? data.documents.filter((d) =>
        `${d.title} ${d.path} ${d.content}`.toLowerCase().includes(q),
      )
    : [];
  const hs = q
    ? data.heroes.filter((h) =>
        `${h.id} ${h.name} ${h.faction}`.toLowerCase().includes(q),
      )
    : [];
  return (
    heading(
      "Projekt durchsuchen",
      q
        ? `Ergebnisse für „${escape($("#search").value)}“`
        : "Suchbegriff oben eingeben.",
      "—",
    ) +
    `<h2>Helden · ${hs.length}</h2>${hs.map((h) => row(escape(h.name), `${escape(h.faction)} · ${source(h.path, "Daten ansehen")}`)).join("") || empty("Keine Helden-Treffer.")}<h2>Dokumente · ${docs.length}</h2>${
      docs
        .slice(0, 100)
        .map((d) => {
          const index = d.content.toLowerCase().indexOf(q);
          return `<div class="result"><h3>${source(d.path, d.title)}</h3><p>${escape(d.content.slice(Math.max(0, index - 100), Math.max(0, index - 100) + 250))} …</p><span class="meta">${escape(d.path)}</span></div>`;
        })
        .join("") || empty("Keine Dokument-Treffer.")
    }`
  );
}
async function action(button, fn) {
  button.disabled = true;
  try {
    await fn();
  } catch (e) {
    notify(e.message);
  } finally {
    button.disabled = false;
  }
}
async function openSource(file) {
  const d = $("#source-dialog");
  $("#source-title").textContent = file;
  $("#source-content").textContent = "Wird geladen …";
  $("#github-source").hidden = true;
  if (!d.open) d.showModal();
  try {
    const source = await api("/api/file?path=" + encodeURIComponent(file));
    $("#source-content").textContent = source.content;
    const repo = data.git.remote?.match(
      /github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/,
    )?.[1];
    if (repo && source.tracked) {
      $("#github-source").href =
        `https://github.com/${repo}/blob/${data.git.head || "HEAD"}/${file.split("/").map(encodeURIComponent).join("/")}`;
      $("#github-source").hidden = false;
    }
  } catch (e) {
    $("#source-content").textContent = e.message;
  }
}
async function loadEditor(kind, id) {
  const input = $("#draft-content");
  if (!id) throw new Error("Ziel-ID eingeben.");
  if (kind === "rating") {
    input.value = JSON.stringify(
      data.heroes.find((h) => h.id === id)?.ratings || {},
      null,
      2,
    );
  } else if (kind === "hero") {
    input.value = (
      await api(
        "/api/file?path=" + encodeURIComponent(`src/data/heroes/${id}.json`),
      )
    ).content;
  } else {
    input.value = (
      await api(
        "/api/file?path=" +
          encodeURIComponent(`tools/project-dashboard/content/guides/${id}.md`),
      )
    ).content;
  }
}
function draftInput() {
  return {
    kind: $("#draft-kind").value,
    id: $("#draft-id").value.trim(),
    content: $("#draft-content").value,
  };
}
function bindActions(root) {
  root
    .querySelectorAll("[data-source]")
    .forEach((b) => (b.onclick = () => openSource(b.dataset.source)));
  root.querySelectorAll("[data-edit]").forEach(
    (b) =>
      (b.onclick = async () => {
        location.hash = "studio";
        await new Promise((r) => setTimeout(r, 0));
        $("#draft-kind").value = b.dataset.edit;
        $("#draft-id").value = b.dataset.id;
        try {
          await loadEditor(b.dataset.edit, b.dataset.id);
        } catch (e) {
          notify(e.message);
        }
      }),
  );
}
function bind() {
  bindActions($("#main"));
  if ($("#filtered-content")) {
    renderFiltered();
    $("#local-search").oninput = (e) => {
      filters.q = e.target.value;
      renderFiltered();
    };
    $("#faction-filter").onchange = (e) => {
      filters.faction = e.target.value;
      renderFiltered();
    };
    $("#status-filter").onchange = (e) => {
      filters.status = e.target.value;
      renderFiltered();
    };
  }
  if ($("#document-list")) {
    filterDocuments();
    $("#document-query").oninput = filterDocuments;
    $("#document-category").onchange = filterDocuments;
  }
  $("#load-source")?.addEventListener("click", (e) =>
    action(e.currentTarget, () =>
      loadEditor($("#draft-kind").value, $("#draft-id").value.trim()),
    ),
  );
  $("#new-template")?.addEventListener("click", () => {
    const kind = $("#draft-kind").value,
      id = $("#draft-id").value.trim();
    $("#draft-content").value =
      kind === "guide"
        ? `# ${id || "Guide-Recherche"}\n\nEvidence: Untested\n\n## Quellen\n\n## Beobachtungen\n\n## Offene Fragen\n`
        : kind === "rating"
          ? JSON.stringify(
              Object.fromEntries([
                ...data.ratingFactors.map((f) => [f.key, ""]),
                ["overallAdjustment", 0],
                ["overallReason", ""],
              ]),
              null,
              2,
            )
          : JSON.stringify(
              {
                id,
                name: "",
                faction: "",
                role: "",
                class: "",
                description: "",
                stats: {},
                skills: [],
                image: "",
              },
              null,
              2,
            );
  });
  $("#validate-draft")?.addEventListener("click", (e) =>
    action(e.currentTarget, async () => {
      const r = await api("/api/validate", draftInput());
      $("#validation-result").textContent =
        `Struktur gültig. ${r.overall ? `Overall: ${r.overall.tier || "offen"} (${r.overall.ratedFields}/6). ` : ""}Projektvalidierung erfolgt beim Übernehmen.`;
    }),
  );
  $("#draft-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    action(e.submitter, async () => {
      await api("/api/drafts", draftInput());
      await reload();
      notify("Entwurf gespeichert. Diff vor dem Übernehmen prüfen.");
    });
  });
  document.querySelectorAll("[data-apply]").forEach(
    (b) =>
      (b.onclick = () =>
        action(b, async () => {
          await api("/api/apply", { id: b.dataset.apply });
          await reload();
          notify("Änderung validiert und in die Quelle übernommen.");
        })),
  );
  $("#work-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    action(e.submitter, async () => {
      const values = Object.fromEntries(new FormData(e.target));
      values.dependencies = values.dependency ? [values.dependency] : [];
      await api("/api/work-items", values);
      await reload();
      notify("Arbeitseintrag versionierbar gespeichert.");
    });
  });
  document.querySelectorAll("[data-work]").forEach(
    (select) =>
      (select.onchange = () =>
        action(select, async () => {
          await api("/api/work-items/status", {
            id: select.dataset.work,
            status: select.value,
          });
          await reload();
        })),
  );
  $("#work-filter")?.addEventListener("change", (e) => {
    document
      .querySelectorAll(".work-row")
      .forEach(
        (row) =>
          (row.hidden = Boolean(
            e.target.value && row.dataset.status !== e.target.value,
          )),
      );
  });
  $("#github-refresh")?.addEventListener("click", (e) =>
    action(e.currentTarget, async () => {
      await api("/api/github", {});
      await reload();
      notify("GitHub-Daten aktualisiert.");
    }),
  );
  document.querySelectorAll("[data-check]").forEach(
    (b) =>
      (b.onclick = () =>
        action(b, async () => {
          await api("/api/checks", { key: b.dataset.check });
          await reload();
          notify("Prüfung läuft. Das Ergebnis erscheint automatisch.");
        })),
  );
}
$("#refresh").onclick = (e) =>
  action(e.currentTarget, async () => {
    await api("/api/refresh", {});
    await reload();
    notify("Projektwissen aktualisiert.");
  });
$("#menu").onclick = () => {
  const open = $("#sidebar").classList.toggle("open");
  $("#menu").setAttribute("aria-expanded", String(open));
};
$("#close-source").onclick = () => $("#source-dialog").close();
$("#search").oninput = () => {
  if (location.hash !== "#search") location.hash = "search";
  else render();
};
window.addEventListener("hashchange", () => {
  if (data) render();
});
window.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)
  ) {
    e.preventDefault();
    $("#search").focus();
  }
});
try {
  await reload();
} catch (e) {
  $("#main").innerHTML =
    `<div class="error-panel"><h1>Dashboard nicht verfügbar</h1><p>${escape(e.message)}</p><p class="muted">Lokalen Server mit <code>npm run dashboard</code> starten und die Seite neu laden.</p></div>`;
}

function syncWarning() {
  const alert = $("#sync-alert");
  alert.hidden = !data.refreshError;
  alert.textContent = data.refreshError
    ? `Aktualisierung fehlgeschlagen: ${data.refreshError}. Letzter erfolgreicher Stand: ${date(data.generatedAt)}.`
    : "";
}
let polling = false;
setInterval(async () => {
  if (!data || polling) return;
  polling = true;
  try {
    const next = await api("/api/data");
    const changed = next.generatedAt !== data.generatedAt;
    const editing =
      /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) ||
      view === "studio";
    data = next;
    syncWarning();
    if (changed) {
      if (!editing) {
        render();
        $("#stamp").textContent =
          `Stand: ${date(data.generatedAt)} · ${data.git.branch || "Git nicht verfügbar"}`;
      } else
        notify(
          "Quellen aktualisiert. Beim nächsten Seitenwechsel oder Klick auf Aktualisieren wird die neue Ansicht angezeigt.",
        );
    }
  } catch {
    /* Keep the current view when the local server is temporarily unavailable. */
  } finally {
    polling = false;
  }
}, 10000);

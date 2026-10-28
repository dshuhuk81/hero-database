// HTML for the "Right now" block. A pure function so the same markup is produced at build time
// (no-JS fallback) and in the browser (real "today"). All dynamic text is escaped here.
import { daysUntil } from "./eventTimeline.js";
import { dayProgress } from "./homeRightNow.js";

const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
const fill = (template, n) => template.replace("{n}", String(n));

const countdown = (left, copy) =>
  left <= 0 ? `<span class="hl-last">${esc(copy.lastDay)}</span>` : `<b>${left}</b><small>${esc(left === 1 ? copy.dayLeft : copy.daysLeft)}</small>`;
const relative = (start, today, copy) => {
  const n = daysUntil(start, today);
  return n === 1 ? copy.tomorrow : fill(copy.inDays, n);
};
const day = (iso, locale) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00Z`));
const category = (id, copy) => copy.categories?.[id] ?? id;
const thumb = (item) =>
  item.heroImage
    ? `<img class="hl-thumb" src="${esc(item.heroImage)}" alt="" width="40" height="40" loading="lazy" decoding="async">`
    : `<span class="hl-dot" aria-hidden="true"></span>`;

function runningRow(item, ctx) {
  const { total, left, pct } = dayProgress(item.start, item.end, ctx.today);
  return `<li class="hl-row" data-category="${esc(item.category)}"><a href="${esc(ctx.eventsHref)}">${thumb(item)}<span class="hl-main"><strong>${esc(item.label)}</strong><small>${esc(category(item.category, ctx.copy))}</small><span class="hl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${esc(item.label)} (${total})"><i style="width:${pct}%"></i></span></span><span class="hl-count">${countdown(left, ctx.copy)}</span></a></li>`;
}

function comingRow(item, ctx) {
  return `<li class="hl-next" data-category="${esc(item.category)}"><time datetime="${esc(item.start)}">${esc(day(item.start, ctx.locale))}</time><span class="hl-next-main"><strong>${esc(item.label)}</strong><small>${esc(category(item.category, ctx.copy))}</small></span><span class="hl-in">${esc(relative(item.start, ctx.today, ctx.copy))}</span></li>`;
}

function feature(state, ctx) {
  const b = state.featured;
  if (!b) return "";
  const { left, pct } = dayProgress(b.start, b.end, ctx.today);
  const href = b.heroSiteId ? ctx.heroHref(b.heroSiteId) : ctx.bannersHref;
  const art = b.image ? `<img class="hl-feature-img" src="${esc(b.image)}" alt="" width="360" height="360" decoding="async">` : "";
  const next = state.nextBanner
    ? `<p class="hl-feature-next"><span>${esc(ctx.copy.nextBanner)}</span><strong>${esc(state.nextBanner.heroName ?? "")}</strong><em>${esc(relative(state.nextBanner.start, ctx.today, ctx.copy))}</em></p>`
    : "";
  return `<a class="hl-feature" href="${esc(href)}"><span class="hl-feature-art">${art}</span><span class="hl-feature-body"><strong class="hl-feature-name">${esc(b.heroName)}</strong><span class="hl-feature-count">${countdown(left, ctx.copy)}</span><span class="hl-bar hl-bar--gold" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${esc(b.heroName)}"><i style="width:${pct}%"></i></span>${next}</span></a>`;
}

/** @returns {{ feature: string, running: string, coming: string }} */
export function renderRightNow(state, ctx) {
  const running = state.running.length
    ? `<ul class="hl-list">${state.running.map((i) => runningRow(i, ctx)).join("")}</ul>${state.moreRunning ? `<a class="hl-more" href="${esc(ctx.eventsHref)}">${esc(fill(ctx.copy.moreRunning, state.moreRunning))}</a>` : ""}`
    : `<p class="hl-empty">${esc(ctx.copy.nothingRunning)}</p>`;
  const coming = state.coming.length
    ? `<ol class="hl-timeline">${state.coming.map((i) => comingRow(i, ctx)).join("")}</ol>`
    : `<p class="hl-empty">${esc(ctx.copy.nothingComing)}</p>`;
  return { feature: feature(state, ctx), running, coming };
}

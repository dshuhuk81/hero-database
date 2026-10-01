// Cloudflare Pages Function: POST /api/hero-submission
// Receives the community hero form (src/pages/games/tower-defense/submit-hero.astro) and posts
// it to a private Discord channel through a webhook. No account needed for the sender.
//
// Setup (once): Cloudflare dashboard -> Pages project -> Settings -> Variables and secrets ->
// add the secret DISCORD_HERO_WEBHOOK with the channel's webhook URL. Local test:
// `npm run build && npx wrangler pages dev dist` with DISCORD_HERO_WEBHOOK in .dev.vars.

const FIELDS = {
  creator: { label: "Submitted by", max: 80, required: true },
  contact: { label: "Contact", max: 120 },
  heroName: { label: "Hero name", max: 60, required: true },
  heroTitle: { label: "Title", max: 100, required: true },
  myth: { label: "Myth", max: 200, required: true },
  mythSource: { label: "Source", max: 300 },
  pronouns: { label: "Pronouns", max: 40 },
  cardLine: { label: "Card line", max: 200, required: true },
  bio: { label: "Biography", max: 1500 },
  lineRecruit: { label: "Recruit line", max: 150 },
  lineUlt: { label: "Ultimate line", max: 150 },
  lineDefeat: { label: "Defeat line", max: 150 },
  heroClass: { label: "Class", max: 20, required: true, oneOf: ["Tank", "Warrior", "Assassin", "Mage", "Archer", "Support"] },
  position: { label: "Position", max: 20, oneOf: ["road", "platform", "unsure"] },
  damageType: { label: "Damage type", max: 20, oneOf: ["physical", "magical", "unsure"] },
  weapon: { label: "Weapon", max: 200, required: true },
  basicName: { label: "Basic attack", max: 80 },
  basicText: { label: "Basic attack text", max: 300 },
  ultName: { label: "Ultimate", max: 80, required: true },
  ultFlavor: { label: "Ultimate flavor", max: 200 },
  ultText: { label: "Ultimate effect", max: 1500, required: true },
  awakening: { label: "Awakening", max: 400 },
  closestUlt: { label: "Closest ultimate", max: 120 },
  strengths: { label: "Strengths", max: 200, list: true },
  artLink: { label: "Art link", max: 500 },
  rightsOwn: { label: "Own art or permission", flag: true },
  rightsNotGame: { label: "Not from another game", flag: true },
  features: { label: "Key features", max: 300 },
  lookText: { label: "Look description", max: 1500 },
  sounds: { label: "Sounds", max: 20, oneOf: ["class", "own"] },
  soundLink: { label: "Sound files", max: 500 },
  soundLicense: { label: "Sound license", max: 200 },
  notes: { label: "Notes", max: 1500 },
};

const IMAGE_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const MAX_IMAGE = 8 * 1024 * 1024; // Discord's free upload limit is 10 MB per message
const MIN_FILL_MS = 4000; // bots post instantly

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const clean = (value, max) => String(value ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  if (!env.DISCORD_HERO_WEBHOOK) return json({ ok: false, error: "not_configured" }, 503);

  // Same-site posts only (a browser always sends Origin on a cross-site POST).
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ ok: false, error: "forbidden" }, 403);

  let form;
  try { form = await request.formData(); } catch { return json({ ok: false, error: "bad_request" }, 400); }

  // Spam traps: a hidden field people never fill, and a minimum time on the page.
  const startedAt = Number(form.get("startedAt"));
  if (clean(form.get("website"), 200) || !Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_MS) {
    return json({ ok: true }); // look successful, send nothing
  }

  const data = {};
  const missing = [];
  for (const [key, cfg] of Object.entries(FIELDS)) {
    if (cfg.flag) { data[key] = form.get(key) === "on"; continue; }
    if (cfg.list) { data[key] = form.getAll(key).map((v) => clean(v, 40)).filter(Boolean).slice(0, 4).join(", "); continue; }
    let value = clean(form.get(key), cfg.max);
    if (cfg.oneOf && value && !cfg.oneOf.includes(value)) value = "";
    data[key] = value;
    if (cfg.required && !value) missing.push(key);
  }

  const image = form.get("artFile");
  const hasImage = image && typeof image === "object" && image.size > 0;
  if (hasImage && (!IMAGE_TYPES[image.type] || image.size > MAX_IMAGE)) return json({ ok: false, error: "bad_image" }, 400);
  if ((data.artLink || hasImage) && !(data.rightsOwn && data.rightsNotGame)) missing.push("rights");
  if (!data.artLink && !hasImage && !data.lookText) missing.push("lookText");
  if (missing.length) return json({ ok: false, error: "missing", fields: missing }, 400);

  // Full entry as a Markdown file; the message itself is a short summary.
  const lines = [`# ${data.heroName}, ${data.heroTitle}`, ""];
  for (const [key, cfg] of Object.entries(FIELDS)) {
    const value = cfg.flag ? (data[key] ? "yes" : "no") : data[key];
    if (value === "" || (cfg.flag && !(data.artLink || hasImage))) continue;
    lines.push(`**${cfg.label}:** ${String(value).includes("\n") ? "\n" + value : value}`, "");
  }
  lines.push(`_Received ${new Date().toISOString()}_`);
  const slug = data.heroName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "hero";

  const embed = {
    title: `${data.heroName}, ${data.heroTitle}`.slice(0, 256),
    description: [data.cardLine, "", `**Ultimate:** ${data.ultName}`, data.ultText.slice(0, 600)].join("\n").slice(0, 2000),
    color: 0xfacc15,
    fields: [
      { name: "Class", value: [data.heroClass, data.position, data.damageType].filter(Boolean).join(" · ").slice(0, 1024), inline: true },
      { name: "Myth", value: data.myth.slice(0, 1024), inline: true },
      { name: "By", value: [data.creator, data.contact].filter(Boolean).join(" · ").slice(0, 1024), inline: true },
    ],
    footer: { text: "Full entry in the attached file" },
  };
  if (hasImage) embed.image = { url: `attachment://art-${slug}.${IMAGE_TYPES[image.type]}` };
  else if (/^https?:\/\//i.test(data.artLink)) embed.url = data.artLink;

  const out = new FormData();
  out.append("payload_json", JSON.stringify({
    username: "Hero submissions",
    embeds: [embed],
    allowed_mentions: { parse: [] }, // never ping anyone from user text
  }));
  out.append("files[0]", new Blob([lines.join("\n")], { type: "text/markdown" }), `hero-${slug}.md`);
  if (hasImage) out.append("files[1]", image, `art-${slug}.${IMAGE_TYPES[image.type]}`);

  const res = await fetch(env.DISCORD_HERO_WEBHOOK, { method: "POST", body: out });
  if (!res.ok) return json({ ok: false, error: "delivery_failed" }, 502);
  return json({ ok: true });
}

export const onRequest = () => json({ ok: false, error: "method_not_allowed" }, 405);

import { c as createAstro, d as createComponent, f as renderHead, h as renderComponent, F as Fragment, r as renderTemplate, e as addAttribute } from '../../chunks/astro/server_DBrEwI3E.mjs';
import { $ as $$Sidebar } from '../../chunks/Sidebar_CCRmdcKm.mjs';
import { $ as $$Footer } from '../../chunks/Footer_BzvorMvm.mjs';
import { a as allHeroesData } from '../../chunks/all_heroes_db_CNeIlBgo.mjs';
/* empty css                                   */
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro("https://motto-immortal.vercel.app");
const prerender = false;
const $$id = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const { id } = Astro2.params;
  let shareData = null;
  let heroesMap = {};
  let error = "";
  Object.values(allHeroesData).forEach((hero) => {
    heroesMap[hero.id] = hero;
  });
  try {
    const response = await fetch(new URL(`/api/shared-heroes/${id}`, Astro2.url));
    if (!response.ok) {
      error = "Setup not found";
    } else {
      shareData = await response.json();
    }
  } catch (err) {
    error = "Failed to load setup";
  }
  const factionMap = {};
  if (shareData?.heroesData) {
    shareData.heroesData.forEach((item) => {
      const hero = heroesMap[item.hero_id];
      if (hero) {
        if (!factionMap[hero.faction]) {
          factionMap[hero.faction] = [];
        }
        factionMap[hero.faction].push({
          ...hero,
          evolution: item.evolution
        });
      }
    });
  }
  const EVOLUTION_LEVELS = {
    1: "Elite",
    2: "Elite+",
    3: "Epic",
    4: "Epic+",
    5: "Legendary",
    6: "Legendary+",
    7: "Exalted",
    8: "Exalted+",
    9: "Mythic",
    10: "Divine",
    11: "Divine I",
    12: "Divine II",
    13: "Divine III",
    14: "Divine IV",
    15: "Divine V"
  };
  return renderTemplate`<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Shared Hero Setup - Hero Database</title>${renderHead()}</head> <body> ${renderComponent($$result, "Sidebar", $$Sidebar, {})} <div class="container"> ${error ? renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": async ($$result2) => renderTemplate` <h1>Shared Hero Setup</h1> <div class="error-message">${error}</div> ` })}` : renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": async ($$result2) => renderTemplate` <h1>Shared Hero Setup</h1> ${shareData && renderTemplate`<div class="header-info">
Created ${new Date(shareData.createdAt).toLocaleDateString()} </div>`}${Object.keys(factionMap).length === 0 ? renderTemplate`<div class="empty-message">No heroes in this setup</div>` : Object.keys(factionMap).sort().map((faction) => renderTemplate`<div class="faction-section"> <div class="faction-title"> <img class="faction-icon"${addAttribute(`/icons/factions/${faction.toLowerCase()}.webp`, "src")}${addAttribute(faction, "alt")}> <span>${faction}</span> </div> <div class="heroes-grid"> ${factionMap[faction].map((hero) => renderTemplate`<a${addAttribute(`/heroes/${hero.id}`, "href")} class="hero-card"${addAttribute(`--hero-bg-position: 50% 10%; background-image: url('${hero.image}')`, "style")}> <div class="hero-info"> <div class="hero-name">${hero.name}</div> <div class="hero-evolution"> ${EVOLUTION_LEVELS[hero.evolution] || `Level ${hero.evolution}`} </div> </div> </a>`)} </div> </div>`)}` })}`} </div> ${renderComponent($$result, "Footer", $$Footer, {})} </body></html>`;
}, "/Users/daschultheiss/hero-database/src/pages/shared-heroes/[id].astro", void 0);

const $$file = "/Users/daschultheiss/hero-database/src/pages/shared-heroes/[id].astro";
const $$url = "/shared-heroes/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

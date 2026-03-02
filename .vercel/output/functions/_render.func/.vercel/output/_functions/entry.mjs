import { renderers } from './renderers.mjs';
import { c as createExports } from './chunks/entrypoint_B5C9prow.mjs';
import { manifest } from './manifest_HW22LQE7.mjs';

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/bosses.astro.mjs');
const _page2 = () => import('./pages/calculator.astro.mjs');
const _page3 = () => import('./pages/changelog.astro.mjs');
const _page4 = () => import('./pages/char-guide-nuba.astro.mjs');
const _page5 = () => import('./pages/early-game.astro.mjs');
const _page6 = () => import('./pages/early-gameclaude.astro.mjs');
const _page7 = () => import('./pages/events.astro.mjs');
const _page8 = () => import('./pages/hero-upgrades.astro.mjs');
const _page9 = () => import('./pages/heroes/_id_.astro.mjs');
const _page10 = () => import('./pages/heros.astro.mjs');
const _page11 = () => import('./pages/login.astro.mjs');
const _page12 = () => import('./pages/myheroes.astro.mjs');
const _page13 = () => import('./pages/newgame.astro.mjs');
const _page14 = () => import('./pages/nuba-guide.astro.mjs');
const _page15 = () => import('./pages/privacy.astro.mjs');
const _page16 = () => import('./pages/rankings.astro.mjs');
const _page17 = () => import('./pages/register.astro.mjs');
const _page18 = () => import('./pages/shared-heroes/_id_.astro.mjs');
const _page19 = () => import('./pages/shrine.astro2.mjs');
const _page20 = () => import('./pages/shrine.astro.mjs');
const _page21 = () => import('./pages/stages.astro.mjs');
const _page22 = () => import('./pages/stageviewer.astro.mjs');
const _page23 = () => import('./pages/symbol-harmony.astro.mjs');
const _page24 = () => import('./pages/tierlist.astro.mjs');
const _page25 = () => import('./pages/totems.astro.mjs');
const _page26 = () => import('./pages/index.astro.mjs');

const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/bosses.astro", _page1],
    ["src/pages/calculator.astro", _page2],
    ["src/pages/changelog.astro", _page3],
    ["src/pages/char-guide-nuba.astro", _page4],
    ["src/pages/early-game.astro", _page5],
    ["src/pages/early-gameClaude.astro", _page6],
    ["src/pages/events.astro", _page7],
    ["src/pages/hero-upgrades.astro", _page8],
    ["src/pages/heroes/[id].astro", _page9],
    ["src/pages/heros.astro", _page10],
    ["src/pages/login.astro", _page11],
    ["src/pages/myheroes.astro", _page12],
    ["src/pages/newgame.md", _page13],
    ["src/pages/nuba-guide.html", _page14],
    ["src/pages/privacy.astro", _page15],
    ["src/pages/rankings.astro", _page16],
    ["src/pages/register.astro", _page17],
    ["src/pages/shared-heroes/[id].astro", _page18],
    ["src/pages/shrine.astro", _page19],
    ["src/pages/Shrine.md", _page20],
    ["src/pages/stages.ts", _page21],
    ["src/pages/StageViewer.astro", _page22],
    ["src/pages/symbol-harmony.astro", _page23],
    ["src/pages/tierlist.astro", _page24],
    ["src/pages/totems.astro", _page25],
    ["src/pages/index.astro", _page26]
]);
const serverIslandMap = new Map();
const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "bdc707ca-28b2-4fd8-be3f-e1fca1b161da",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;

export { __astrojsSsrVirtualEntry as default, pageMap };

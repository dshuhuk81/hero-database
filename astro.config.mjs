import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';

const LOCAL_ONLY_ROUTES = ['/status', '/games/tower-defense/anim-lab', '/games/tower-defense/god-mode-lab', '/games/tower-defense/overview'];
const SITE = 'https://motto-immortal-db.com';

function localOnlyRoutes() {
  return {
    name: 'local-only-routes',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        for (const route of LOCAL_ONLY_ROUTES) {
          await rm(new URL(`.${route}/`, dir), { recursive: true, force: true });
        }

        const assetDir = new URL('./_astro/', dir);
        const assets = await readdir(assetDir).catch(() => []);
        const assetPrefixes = LOCAL_ONLY_ROUTES.map((route) => `${route.split('/').filter(Boolean).pop()}.`);
        await Promise.all(
          assets
            .filter((name) => assetPrefixes.some((prefix) => name.startsWith(prefix)))
            .map((name) => rm(new URL(name, assetDir), { force: true }))
        );

        const sitemapFiles = (await readdir(dir)).filter((name) => /^sitemap.*\.xml$/.test(name));
        for (const file of sitemapFiles) {
          const sitemapPath = new URL(file, dir);
          let content = await readFile(sitemapPath, 'utf8');
          for (const route of LOCAL_ONLY_ROUTES) {
            const url = new URL(`${route.replace(/^\/|\/$/g, '')}/`, SITE).href;
            content = content.replace(`<url><loc>${url}</loc></url>`, '');
          }
          await writeFile(sitemapPath, content, 'utf8');
        }
      },
    },
  };
}

const R2_BASE = 'https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev';

export default defineConfig({
  // Site Configuration
  site: SITE,

  output: 'static',

  integrations: [sitemap(), localOnlyRoutes()],

  vite: {
    server: {
      proxy: {
        '/r2': {
          target: R2_BASE,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/r2/, ''),
          // R2 sends a one-year cache lifetime, so a file replaced under the same name stayed
          // stale on localhost. In dev the browser keeps an asset for two minutes instead.
          // `no-cache` here revalidated every request against r2.dev, which answers 429 once a
          // run asks a few hundred times (deck thumbnails, terrain panoramas).
          configure: (proxy) => {
            proxy.on('proxyRes', (res) => { res.headers['cache-control'] = 'max-age=120'; });
          },
        },
      },
    },
  },
});

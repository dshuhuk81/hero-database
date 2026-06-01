import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';

const LOCAL_ONLY_ROUTES = ['/status'];
const SITE = 'https://motto-immortal.vercel.app';

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
        await Promise.all(
          assets
            .filter((name) => name.startsWith('status.'))
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

export default defineConfig({
  // Site Configuration
  site: SITE,

  output: 'static',

  integrations: [sitemap(), localOnlyRoutes()],
});

import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://motto-immortal-db.com';
const R2_BASE = 'https://pub-e35e94828bf347ca93c3d2c6a50d06f6.r2.dev';

export default defineConfig({
  // Site Configuration
  site: SITE,

  output: 'static',

  integrations: [sitemap()],

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

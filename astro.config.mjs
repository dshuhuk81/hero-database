import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Site Configuration
  site: 'https://motto-immortal.vercel.app',

  output: 'static',

  integrations: [sitemap()],
});

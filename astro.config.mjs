import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import dotenv from 'dotenv';

// Explizit .env.local laden
dotenv.config({ path: '.env.local' });

export default defineConfig({
  // Site Configuration
  site: 'https://motto-immortal.vercel.app',
  
  // Server mode (needed for API) with per-page opt-out via prerender
  output: 'server',
  
  // Vercel Adapter für Deployment
  adapter: vercel({
    maxDuration: 10
  }),
});

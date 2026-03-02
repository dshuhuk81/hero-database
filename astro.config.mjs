import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import dotenv from 'dotenv';

// Explizit .env.local laden
dotenv.config({ path: '.env.local' });

// Force Node 20 runtime by setting environment variable
process.env.ASTRO_VERCEL_FORCE_RUNTIME = 'nodejs20.x';

export default defineConfig({
  // Site Configuration
  site: 'https://motto-immortal.vercel.app',
  
  // Static site mit serverless functions für API routes
  output: 'server',
  
  // Vercel Adapter für Deployment
  adapter: vercel({
    functionPerRoute: false,
    edgeMiddleware: false,
    includeFiles: [],
    maxDuration: 10
  }),
});

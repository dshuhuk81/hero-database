import { defineConfig } from 'astro/config';
import dotenv from 'dotenv';

// Explizit .env.local laden
dotenv.config({ path: '.env.local' });

export default defineConfig({
  // Site Configuration
  site: 'https://motto-immortal.vercel.app',
  
  // Hybrid mode: Static site mit API-Routes
  output: 'hybrid',
});

#!/usr/bin/env node
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env.local
dotenv.config({ path: '.env.local' });

// Map .env.local variable names to what the script expects
process.env.PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Now run the actual analysis script
const analysisScriptPath = path.join(process.cwd(), 'scripts/analyze-fight-accuracy.js');
const analysisModule = await import(analysisScriptPath);

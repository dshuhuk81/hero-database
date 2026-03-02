import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Only create clients if environment variables are available
let supabaseClient = null;
let supabaseAdmin = null;

if (supabaseUrl && supabaseKey) {
  supabaseClient = createClient(supabaseUrl, supabaseKey);
}

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
}

export { supabaseClient, supabaseAdmin };

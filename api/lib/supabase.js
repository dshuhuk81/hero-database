import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Client für User-Operationen
export const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Service Role Client für Server-seitige Operationen
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

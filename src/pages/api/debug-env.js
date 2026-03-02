import { supabaseClient, supabaseAdmin } from '../../lib/supabase.js';

export async function GET() {
  const envVars = {
    SUPABASE_URL: process.env.SUPABASE_URL ? '✓ vorhanden' : '✗ fehlt',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✓ vorhanden' : '✗ fehlt',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ vorhanden' : '✗ fehlt',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✓ vorhanden' : '✗ fehlt',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ vorhanden' : '✗ fehlt',
    supabaseClient: supabaseClient ? '✓ initialisiert' : '✗ null',
    supabaseAdmin: supabaseAdmin ? '✓ initialisiert' : '✗ null',
  };

  return new Response(
    JSON.stringify(envVars, null, 2),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

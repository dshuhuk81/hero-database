import { supabaseAdmin } from '../../lib/supabase.js';

export async function GET() {
  try {
    // Check if user_profiles table exists and is accessible
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .limit(1);

    return new Response(
      JSON.stringify({ 
        tableAccessible: !error,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        } : null,
        sampleData: data
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        caught: true,
        message: error.message,
        stack: error.stack?.substring(0, 300)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

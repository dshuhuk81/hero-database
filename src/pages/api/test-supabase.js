import { supabaseAdmin } from '../../lib/supabase.js';

export async function GET() {
  try {
    // Test simple database query
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (error) {
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: error.message,
          code: error.code,
          details: error.details  
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        status: 'success',
        message: 'Supabase connection working',
        data: data
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        status: 'catch_error',
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

import { supabaseAdmin } from '../../lib/supabase.js';

export async function POST({ request }) {
  try {
    const { email, password } = await request.json();

    const result = await supabaseAdmin.auth.admin.createUser({
      email: email || 'test-' + Date.now() + '@example.com',
      password: password || 'testpass123',
      email_confirm: false,
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        hasError: !!result.error,
        error: result.error,
        hasData: !!result.data,
        userId: result.data?.user?.id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        caught: true,
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 500)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

import { supabaseClient } from '../../../lib/supabase.js';

export async function POST({ request }) {
  try {
    if (!supabaseClient) {
      return new Response(
        JSON.stringify({ error: 'Supabase client is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email und Passwort sind erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Session als Cookie setzen
    const headers = new Headers();
    if (data.session) {
      headers.append(
        'Set-Cookie',
        `sb-auth-token=${data.session.access_token}; Path=/; Max-Age=${data.session.expires_in}; SameSite=Lax`
      );
    }
    headers.append('Content-Type', 'application/json');

    return new Response(
      JSON.stringify({
        message: 'Login erfolgreich',
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        session: data.session,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Interner Fehler' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

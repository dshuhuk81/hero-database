import type { APIRoute } from 'astro';
import { supabaseClient } from '../../../lib/supabase.js';
import { jsonResponse } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!supabaseClient) {
    return jsonResponse({ error: 'Supabase client is not configured' }, 500);
  }

  const { email, password } = await request.json();

  if (!email || !password) {
    return jsonResponse({ error: 'Email und Passwort sind erforderlich' }, 400);
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return jsonResponse({ error: error.message }, 401);
    }

    if (data.session) {
      cookies.set('sb-auth-token', data.session.access_token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: data.session.expires_in,
      });
    }

    return jsonResponse({
      message: 'Login erfolgreich',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      accessToken: data.session?.access_token || null,
      expiresIn: data.session?.expires_in || null,
    }, 200);
  } catch (err: any) {
    console.error('Login error:', err);
    return jsonResponse({ error: 'Interner Fehler: ' + err.message }, 500);
  }
};

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { jsonResponse } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin) {
    return jsonResponse({ error: 'Supabase admin client is not configured' }, 500);
  }

  const { email, password, confirmPassword } = await request.json();

  if (!email || !password || !confirmPassword) {
    return jsonResponse({ error: 'Email und Passwort sind erforderlich' }, 400);
  }

  if (password !== confirmPassword) {
    return jsonResponse({ error: 'Passwörter stimmen nicht überein' }, 400);
  }

  if (password.length < 6) {
    return jsonResponse({ error: 'Passwort muss mindestens 6 Zeichen lang sein' }, 400);
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return jsonResponse({ error: authError.message }, 400);
    }

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return jsonResponse({ error: 'Fehler beim Erstellen des Profils' }, 400);
    }

    return jsonResponse({
      message: 'Registrierung erfolgreich',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    }, 201);
  } catch (err: any) {
    console.error('Register error:', err);
    return jsonResponse({ error: 'Interner Fehler: ' + err.message }, 500);
  }
};

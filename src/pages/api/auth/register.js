import { supabaseAdmin } from '../../../lib/supabase.js';

export async function POST(context) {
  try {
    const { request } = context;
    const { email, password, confirmPassword } = await request.json();

    // Validierung
    if (!email || !password || !confirmPassword) {
      return new Response(JSON.stringify({ error: 'Email und Passwort benötigt' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    if (password !== confirmPassword) {
      return new Response(JSON.stringify({ error: 'Passwörter stimmen nicht überein' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Passwort mind. 6 Zeichen' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // User erstellen (ohne Profil-Erstellung zunächst)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (error) {
      console.log('Supabase error:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ 
      success: true,
      user: { id: data.user.id, email: data.user.email }
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    console.log('Exception:', e.message);
    return new Response(JSON.stringify({ error: 'Fehler: ' + e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

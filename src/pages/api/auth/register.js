import { supabaseAdmin } from '../supabase.js';

export async function POST({ request }) {
  try {
    // Direkt JSON parsen
    let data;
    try {
      data = await request.json();
    } catch (e) {
      console.error('JSON Parse error:', e.message);
      console.log('Request headers:', request.headers);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON: ' + e.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, confirmPassword } = data;

    // Validierung
    if (!email || !password || !confirmPassword) {
      return new Response(
        JSON.stringify({ error: 'Email und Passwort sind erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (password !== confirmPassword) {
      return new Response(
        JSON.stringify({ error: 'Passwörter stimmen nicht überein' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Passwort muss mindestens 6 Zeichen lang sein' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Registering user:', email);

    // Benutzer registrieren
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // User-Profil erstellen
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Erstellen des Profils: ' + profileError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created successfully:', authData.user.id);

    return new Response(
      JSON.stringify({
        message: 'Registrierung erfolgreich',
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Register error:', error.message);
    console.error('Full error:', error);
    return new Response(
      JSON.stringify({ error: 'Server error: ' + error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

import { supabaseAdmin } from '../lib/supabase.js';

export default async function handler(req, res) {
  // Nur POST akzeptieren
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, confirmPassword } = req.body;

  // Validierung
  if (!email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Email und Passwort sind erforderlich' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwörter stimmen nicht überein' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
  }

  try {
    // Benutzer mit Auth registrieren
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Email-Bestätigung kann später aktiviert werden
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // User-Profil erstellen
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
      });

    if (profileError) {
      // Cleanup: User löschen wenn Profil fehlschlägt
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: 'Fehler beim Erstellen des Profils' });
    }

    return res.status(201).json({
      message: 'Registrierung erfolgreich',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Interner Fehler' });
  }
}

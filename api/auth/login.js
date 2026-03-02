import { supabaseClient } from '../lib/supabase.js';

export default async function handler(req, res) {
  // Nur POST akzeptieren
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseClient) {
    return res.status(500).json({ error: 'Supabase client is not configured' });
  }

  const { email, password } = req.body;

  // Validierung
  if (!email || !password) {
    return res.status(400).json({ error: 'Email und Passwort sind erforderlich' });
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Session als HTTP-only Cookie setzen
    if (data.session) {
      res.setHeader(
        'Set-Cookie',
        `sb-auth-token=${data.session.access_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${data.session.expires_in}`
      );
    }

    return res.status(200).json({
      message: 'Login erfolgreich',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      accessToken: data.session?.access_token || null,
      expiresIn: data.session?.expires_in || null,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Interner Fehler: ' + error.message });
  }
}

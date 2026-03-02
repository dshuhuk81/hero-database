export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Cookie löschen
    res.setHeader('Set-Cookie', 'sb-auth-token=; Path=/; HttpOnly; Max-Age=0');

    return res.status(200).json({
      message: 'Logout erfolgreich',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Interner Fehler' });
  }
}

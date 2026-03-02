import { supabaseAdmin } from './supabase.js';

export function readBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

export async function requireUser(req, res) {
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Supabase admin client is not configured' });
    return null;
  }

  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Kein Token gefunden' });
    return null;
  }

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData?.user) {
    res.status(401).json({ error: 'Ungültiger Token' });
    return null;
  }

  return userData.user;
}

import { supabaseAdmin } from '../../lib/supabase.js';
import { requireUser } from '../../lib/auth.js';

function generateShareId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: heroes, error: heroesError } = await supabaseAdmin
      .from('user_heroes')
      .select('hero_id, evolution')
      .eq('user_id', user.id);

    if (heroesError) {
      return res.status(400).json({ error: heroesError.message });
    }

    if (!heroes || heroes.length === 0) {
      return res.status(400).json({ error: 'Du hast keine Heroes um zu teilen' });
    }

    let shareId = generateShareId();
    let attempts = 0;

    while (attempts < 5) {
      const { data: existing } = await supabaseAdmin
        .from('shared_hero_configs')
        .select('id')
        .eq('share_id', shareId)
        .limit(1);

      if (!existing || existing.length === 0) break;
      shareId = generateShareId();
      attempts += 1;
    }

    const { error } = await supabaseAdmin
      .from('shared_hero_configs')
      .insert({
        share_id: shareId,
        user_id: user.id,
        heroes_data: JSON.stringify(heroes),
      });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const fallbackHost = process.env.FRONTEND_URL || 'https://motto-immortal.vercel.app';
    const baseUrl = host ? `${protocol}://${host}` : fallbackHost;

    return res.status(201).json({
      message: 'Setup geteilt',
      shareId,
      shareUrl: `${baseUrl}/shared-heroes/${shareId}`,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error: ' + error.message });
  }
}

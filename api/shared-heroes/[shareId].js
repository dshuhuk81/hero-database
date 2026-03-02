import { supabaseAdmin } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin client is not configured' });
  }

  const { shareId } = req.query;
  if (!shareId) {
    return res.status(400).json({ error: 'shareId is required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('shared_hero_configs')
      .select('share_id, heroes_data, created_at, user_id')
      .eq('share_id', shareId)
      .limit(1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Setup nicht gefunden' });
    }

    const config = data[0];
    const heroesData = typeof config.heroes_data === 'string'
      ? JSON.parse(config.heroes_data)
      : config.heroes_data;

    return res.status(200).json({
      shareId: config.share_id,
      heroesData,
      createdAt: config.created_at,
      creator: { email: 'Anonymous' },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error: ' + error.message });
  }
}

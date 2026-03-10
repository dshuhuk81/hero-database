import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { jsonResponse } from '../../../lib/auth';

export const GET: APIRoute = async ({ params }) => {
  if (!supabaseAdmin) {
    return jsonResponse({ error: 'Supabase admin client is not configured' }, 500);
  }

  const { shareId } = params;
  if (!shareId) return jsonResponse({ error: 'shareId is required' }, 400);

  try {
    const { data, error } = await supabaseAdmin
      .from('shared_hero_configs')
      .select('share_id, heroes_data, created_at, user_id')
      .eq('share_id', shareId)
      .limit(1);

    if (error) return jsonResponse({ error: error.message }, 400);
    if (!data || data.length === 0) return jsonResponse({ error: 'Setup nicht gefunden' }, 404);

    const config = data[0];
    const heroesData = typeof config.heroes_data === 'string'
      ? JSON.parse(config.heroes_data)
      : config.heroes_data;

    return jsonResponse({
      shareId: config.share_id,
      heroesData,
      createdAt: config.created_at,
      creator: { email: 'Anonymous' },
    }, 200);
  } catch (err: any) {
    return jsonResponse({ error: 'Error: ' + err.message }, 500);
  }
};

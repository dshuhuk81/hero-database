import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase.js';
import { requireUser, jsonResponse } from '../../../../lib/auth';

function generateShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export const POST: APIRoute = async ({ request }) => {
  const { user, error } = await requireUser(request);
  if (error) return error;

  try {
    const { data: heroes, error: heroesError } = await supabaseAdmin!
      .from('user_heroes')
      .select('hero_id, evolution')
      .eq('user_id', user.id);

    if (heroesError) return jsonResponse({ error: heroesError.message }, 400);
    if (!heroes || heroes.length === 0) {
      return jsonResponse({ error: 'Du hast keine Heroes um zu teilen' }, 400);
    }

    let shareId = generateShareId();
    let attempts = 0;

    while (attempts < 5) {
      const { data: existing } = await supabaseAdmin!
        .from('shared_hero_configs')
        .select('id')
        .eq('share_id', shareId)
        .limit(1);

      if (!existing || existing.length === 0) break;
      shareId = generateShareId();
      attempts += 1;
    }

    const { error: insertError } = await supabaseAdmin!
      .from('shared_hero_configs')
      .insert({
        share_id: shareId,
        user_id: user.id,
        heroes_data: JSON.stringify(heroes),
      });

    if (insertError) return jsonResponse({ error: insertError.message }, 400);

    const url = new URL(request.url);
    const fallbackHost = process.env.FRONTEND_URL || 'https://motto-immortal.vercel.app';
    const baseUrl = url.origin || fallbackHost;

    return jsonResponse({
      message: 'Setup geteilt',
      shareId,
      shareUrl: `${baseUrl}/shared-heroes/${shareId}`,
    }, 201);
  } catch (err: any) {
    return jsonResponse({ error: 'Error: ' + err.message }, 500);
  }
};

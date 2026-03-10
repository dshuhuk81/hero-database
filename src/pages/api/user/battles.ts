import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireUser, jsonResponse } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const { user, error } = await requireUser(request);
  if (error) return error;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

  const { data, error: dbError } = await supabaseAdmin!
    .from('fight_outcomes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (dbError) {
    return jsonResponse({ error: 'Failed to fetch fights: ' + dbError.message }, 500);
  }

  const { count } = await supabaseAdmin!
    .from('fight_outcomes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return jsonResponse({
    fights: data || [],
    total: count || 0,
    limit,
    offset,
  }, 200);
};

export const POST: APIRoute = async ({ request }) => {
  const { user, error } = await requireUser(request);
  if (error) return error;

  const {
    teamPlayer,
    teamEnemy,
    bpPlayer,
    bpEnemy,
    winner,
    predictedWinRate,
    mode = 'pvp',
    notes = null,
  } = await request.json();

  if (!Array.isArray(teamPlayer) || !Array.isArray(teamEnemy)) {
    return jsonResponse({ error: 'teamPlayer and teamEnemy must be arrays' }, 400);
  }

  if (!['player', 'enemy'].includes(winner)) {
    return jsonResponse({ error: 'winner must be "player" or "enemy"' }, 400);
  }

  try {
    const { data, error: dbError } = await supabaseAdmin!
      .from('fight_outcomes')
      .insert({
        user_id: user.id,
        team_player: teamPlayer,
        team_enemy: teamEnemy,
        bp_player: Math.max(0, parseInt(bpPlayer) || 0),
        bp_enemy: Math.max(0, parseInt(bpEnemy) || 0),
        winner,
        predicted_win_rate: predictedWinRate ? parseFloat(predictedWinRate) : null,
        mode,
        notes,
      })
      .select();

    if (dbError) {
      console.error('Supabase insert error:', dbError);
      return jsonResponse({ error: dbError.message }, 400);
    }

    return jsonResponse({
      message: 'Fight outcome recorded',
      outcome: data?.[0],
    }, 201);
  } catch (err: any) {
    console.error('Error in battles handler:', err);
    return jsonResponse({ error: err.message }, 500);
  }
};

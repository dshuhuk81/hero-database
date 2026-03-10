import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase.js';
import { requireUser, jsonResponse } from '../../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const { user, error } = await requireUser(request);
  if (error) return error;

  try {
    const { data, error: dbError } = await supabaseAdmin!
      .from('user_heroes')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (dbError) return jsonResponse({ error: dbError.message }, 400);
    return jsonResponse(data || [], 200);
  } catch {
    return jsonResponse({ error: 'Fehler beim Abrufen der Heroes' }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const { user, error } = await requireUser(request);
  if (error) return error;

  try {
    const { heroId, notes, level, evolution } = await request.json();

    if (!heroId) {
      return jsonResponse({ error: 'heroId ist erforderlich' }, 400);
    }

    const { data, error: dbError } = await supabaseAdmin!
      .from('user_heroes')
      .insert({
        user_id: user.id,
        hero_id: heroId,
        notes: notes || null,
        level: level || 1,
        evolution: evolution || 1,
      })
      .select();

    if (dbError) {
      if (dbError.code === '23505') {
        return jsonResponse({ error: 'Dieser Hero ist bereits in deiner Sammlung' }, 400);
      }
      return jsonResponse({ error: dbError.message }, 400);
    }

    return jsonResponse({ message: 'Hero hinzugefügt', hero: data?.[0] }, 201);
  } catch {
    return jsonResponse({ error: 'Fehler beim Hinzufügen des Heroes' }, 500);
  }
};

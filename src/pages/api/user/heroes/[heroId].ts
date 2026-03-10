import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase.js';
import { requireUser, jsonResponse } from '../../../../lib/auth';

export const DELETE: APIRoute = async ({ request, params }) => {
  const { user, error } = await requireUser(request);
  if (error) return error;

  const { heroId } = params;
  if (!heroId) return jsonResponse({ error: 'heroId ist erforderlich' }, 400);

  try {
    const { error: dbError } = await supabaseAdmin!
      .from('user_heroes')
      .delete()
      .eq('user_id', user.id)
      .eq('hero_id', heroId);

    if (dbError) return jsonResponse({ error: dbError.message }, 400);
    return jsonResponse({ message: 'Hero entfernt' }, 200);
  } catch {
    return jsonResponse({ error: 'Fehler beim Entfernen des Heroes' }, 500);
  }
};

export const PATCH: APIRoute = async ({ request, params }) => {
  const { user, error } = await requireUser(request);
  if (error) return error;

  const { heroId } = params;
  if (!heroId) return jsonResponse({ error: 'heroId ist erforderlich' }, 400);

  try {
    const { is_favorited, evolution } = await request.json();
    const updateData: Record<string, any> = {};

    if (typeof is_favorited !== 'undefined') {
      if (typeof is_favorited !== 'boolean') {
        return jsonResponse({ error: 'is_favorited muss true oder false sein' }, 400);
      }
      updateData.is_favorited = is_favorited;
    }

    if (typeof evolution !== 'undefined') {
      const evoNum = parseInt(evolution, 10);
      if (Number.isNaN(evoNum) || evoNum < 1 || evoNum > 15) {
        return jsonResponse({ error: 'evolution muss zwischen 1 und 15 sein' }, 400);
      }
      updateData.evolution = evoNum;
    }

    if (Object.keys(updateData).length === 0) {
      return jsonResponse({ error: 'Keine gültigen Update-Daten' }, 400);
    }

    const { data, error: dbError } = await supabaseAdmin!
      .from('user_heroes')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('hero_id', heroId)
      .select();

    if (dbError) return jsonResponse({ error: dbError.message }, 400);
    if (!data || data.length === 0) return jsonResponse({ error: 'Hero nicht gefunden' }, 404);

    return jsonResponse({ message: 'Hero aktualisiert', hero: data[0] }, 200);
  } catch {
    return jsonResponse({ error: 'Fehler beim Aktualisieren des Heroes' }, 500);
  }
};

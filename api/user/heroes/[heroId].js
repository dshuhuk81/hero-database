import { supabaseAdmin } from '../../lib/supabase.js';
import { requireUser } from '../../lib/auth.js';

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const { heroId } = req.query;
  if (!heroId) {
    return res.status(400).json({ error: 'heroId ist erforderlich' });
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await supabaseAdmin
        .from('user_heroes')
        .delete()
        .eq('user_id', user.id)
        .eq('hero_id', heroId);

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ message: 'Hero entfernt' });
    } catch (error) {
      return res.status(500).json({ error: 'Fehler beim Entfernen des Heroes' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { is_favorited, evolution } = req.body || {};
      const updateData = {};

      if (typeof is_favorited !== 'undefined') {
        if (typeof is_favorited !== 'boolean') {
          return res.status(400).json({ error: 'is_favorited muss true oder false sein' });
        }
        updateData.is_favorited = is_favorited;
      }

      if (typeof evolution !== 'undefined') {
        const evoNum = parseInt(evolution, 10);
        if (Number.isNaN(evoNum) || evoNum < 1 || evoNum > 15) {
          return res.status(400).json({ error: 'evolution muss zwischen 1 und 15 sein' });
        }
        updateData.evolution = evoNum;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'Keine gültigen Update-Daten' });
      }

      const { data, error } = await supabaseAdmin
        .from('user_heroes')
        .update(updateData)
        .eq('user_id', user.id)
        .eq('hero_id', heroId)
        .select();

      if (error) return res.status(400).json({ error: error.message });
      if (!data || data.length === 0) return res.status(404).json({ error: 'Hero nicht gefunden' });

      return res.status(200).json({
        message: 'Hero aktualisiert',
        hero: data[0],
      });
    } catch (error) {
      return res.status(500).json({ error: 'Fehler beim Aktualisieren des Heroes' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

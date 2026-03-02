import { supabaseAdmin } from '../../lib/supabase.js';
import { requireUser } from '../../lib/auth.js';

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_heroes')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json(data || []);
    } catch (error) {
      return res.status(500).json({ error: 'Fehler beim Abrufen der Heroes' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { heroId, notes, level, evolution } = req.body || {};

      if (!heroId) {
        return res.status(400).json({ error: 'heroId ist erforderlich' });
      }

      const { data, error } = await supabaseAdmin
        .from('user_heroes')
        .insert({
          user_id: user.id,
          hero_id: heroId,
          notes: notes || null,
          level: level || 1,
          evolution: evolution || 1,
        })
        .select();

      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({ error: 'Dieser Hero ist bereits in deiner Sammlung' });
        }
        return res.status(400).json({ error: error.message });
      }

      return res.status(201).json({
        message: 'Hero hinzugefügt',
        hero: data?.[0],
      });
    } catch (error) {
      return res.status(500).json({ error: 'Fehler beim Hinzufügen des Heroes' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

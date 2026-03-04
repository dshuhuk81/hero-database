import { supabaseAdmin } from '../../src/lib/supabase.js';
import { requireUser } from '../lib/auth.js';

export default async function handler(req, res) {
  try {
    const user = await requireUser(req, res);
if (!user) return;

    // GET: Fetch fight history
    if (req.method === 'GET') {
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const offset = Math.max(parseInt(req.query.offset) || 0, 0);

      const { data, error } = await supabaseAdmin
        .from('fight_outcomes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch fights: ' + error.message });
      }

      // Count total fights for pagination
      const { count } = await supabaseAdmin
        .from('fight_outcomes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      return res.status(200).json({
        fights: data || [],
        total: count || 0,
        limit,
        offset,
      });
    }

    // POST: Submit fight outcome
    if (req.method === 'POST') {
      const {
        teamPlayer,
        teamEnemy,
        bpPlayer,
        bpEnemy,
        winner,
        predictedWinRate,
        mode = 'pvp',
        notes = null,
      } = req.body || {};

      // Validate required fields
      if (!Array.isArray(teamPlayer) || !Array.isArray(teamEnemy)) {
        return res.status(400).json({ error: 'teamPlayer and teamEnemy must be arrays' });
      }

      if (!['player', 'enemy'].includes(winner)) {
        return res.status(400).json({ error: 'winner must be "player" or "enemy"' });
      }

      const { data, error } = await supabaseAdmin
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

      if (error) {
        console.error('Supabase insert error:', error);
        return res.status(400).json({ error: error.message });
      }

      return res.status(201).json({
        message: 'Fight outcome recorded',
        outcome: data?.[0],
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in battles handler:', error);
    return res.status(500).json({ error: error.message });
  }
}

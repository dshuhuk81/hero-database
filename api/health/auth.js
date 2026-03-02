import { supabaseClient, supabaseAdmin } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const status = {
    ok: false,
    checks: {
      supabaseClientConfigured: !!supabaseClient,
      supabaseAdminConfigured: !!supabaseAdmin,
      dbReachable: false,
    },
    timestamp: new Date().toISOString(),
  };

  if (!supabaseAdmin) {
    return res.status(500).json(status);
  }

  try {
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .limit(1);

    status.checks.dbReachable = !error;
    status.ok = status.checks.supabaseClientConfigured && status.checks.supabaseAdminConfigured && status.checks.dbReachable;

    if (error) {
      return res.status(500).json({ ...status, error: error.message });
    }

    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({ ...status, error: error.message });
  }
}

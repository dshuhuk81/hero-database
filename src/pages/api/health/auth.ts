import type { APIRoute } from 'astro';
import { supabaseClient, supabaseAdmin } from '../../../lib/supabase.js';
import { jsonResponse } from '../../../lib/auth';

export const GET: APIRoute = async () => {
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
    return jsonResponse(status, 500);
  }

  try {
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .limit(1);

    status.checks.dbReachable = !error;
    status.ok = status.checks.supabaseClientConfigured && status.checks.supabaseAdminConfigured && status.checks.dbReachable;

    if (error) {
      return jsonResponse({ ...status, error: error.message }, 500);
    }

    return jsonResponse(status, 200);
  } catch (err: any) {
    return jsonResponse({ ...status, error: err.message }, 500);
  }
};

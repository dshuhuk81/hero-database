import { supabaseAdmin } from './supabase.js';

export function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function readBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || typeof authHeader !== 'string') return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

export async function requireUser(request: Request): Promise<{ user: any; error?: never } | { user?: never; error: Response }> {
  if (!supabaseAdmin) {
    return { error: jsonResponse({ error: 'Supabase admin client is not configured' }, 500) };
  }

  const token = readBearerToken(request);
  if (!token) {
    return { error: jsonResponse({ error: 'Kein Token gefunden' }, 401) };
  }

  try {
    const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !userData?.user) {
      return { error: jsonResponse({ error: 'Ungültiger Token' }, 401) };
    }
    return { user: userData.user };
  } catch {
    return { error: jsonResponse({ error: 'Ungültiger Token' }, 401) };
  }
}

import type { APIRoute } from 'astro';
import { jsonResponse } from '../../../lib/auth';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    cookies.delete('sb-auth-token', { path: '/' });

    return jsonResponse({ message: 'Logout erfolgreich' }, 200);
  } catch (err: any) {
    console.error('Logout error:', err);
    return jsonResponse({ error: 'Interner Fehler' }, 500);
  }
};

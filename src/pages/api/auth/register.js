import { supabaseAdmin } from '../../../lib/supabase.js';

async function registerUser(email, password) {
  if (!supabaseAdmin) throw new Error('Supabase not configured');
  if (!email || !password) throw new Error('Email and password required');
  
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
  });
  
  if (error) throw new Error(error.message);
  return data.user;
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { email, password, confirmPassword } = body;

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    const user = await registerUser(email, password);

    return new Response(
      JSON.stringify({ success: true, user: { id: user.id, email: user.email } }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Registration failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST() {
  const headers = new Headers();
  headers.append('Set-Cookie', 'sb-auth-token=; Path=/; Max-Age=0');
  headers.append('Content-Type', 'application/json');

  return new Response(
    JSON.stringify({ message: 'Logout erfolgreich' }),
    { status: 200, headers }
  );
}

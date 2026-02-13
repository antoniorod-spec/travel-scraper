import { supabaseServer } from './server';

export async function getRequestUser(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return { ok: false, status: 401, error: 'Missing authorization token' };
  }

  const { data: userData, error: userError } = await supabaseServer.auth.getUser(token);
  if (userError || !userData?.user) {
    return { ok: false, status: 401, error: 'Invalid or expired session token' };
  }

  const user = userData.user;
  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = profile?.role || 'viewer';
  return { ok: true, user, role };
}

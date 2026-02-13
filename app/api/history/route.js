import { supabaseServer } from '../../../lib/supabase/server';
import { getRequestUser } from '../../../lib/supabase/auth';

export async function GET(request) {
  const authContext = await getRequestUser(request);
  if (!authContext.ok) {
    return Response.json({ error: authContext.error }, { status: authContext.status });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(200, Number(searchParams.get('limit') || '50'));

  let query = supabaseServer
    .from('scrape_results')
    .select('id, user_id, url, status, error_type, error_message, data_json, from_cache, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (authContext.role !== 'admin') {
    query = query.eq('user_id', authContext.user.id);
  }

  const { data, error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    success: true,
    role: authContext.role,
    items: data || [],
  });
}

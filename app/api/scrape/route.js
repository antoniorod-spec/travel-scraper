import { fetchPageHtml, parseCircuitPage } from '../../../lib/scraper';
import { consumeRateLimit, getClientIp } from '../../../lib/rateLimit';
import { validateTargetUrl } from '../../../lib/security';
import { getCache, setCache } from '../../../lib/cache';
import { supabaseServer } from '../../../lib/supabase/server';
import { getRequestUser } from '../../../lib/supabase/auth';

export const maxDuration = 60; // Vercel Pro: up to 300s

export async function POST(request) {
  let authContext;
  let normalizedUrl = '';
  try {
    authContext = await getRequestUser(request);
    if (!authContext.ok) {
      return Response.json({ error: authContext.error }, { status: authContext.status });
    }

    const ip = getClientIp(request);
    const rate = consumeRateLimit(`scrape:${ip}`, 30, 60_000);
    if (!rate.allowed) {
      return Response.json(
        {
          error: 'Rate limit exceeded. Try again later.',
          retryAfterMs: rate.resetInMs,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'URL is required' }, { status: 400 });
    }

    const check = validateTargetUrl(url);
    if (!check.ok) {
      return Response.json({ error: check.reason }, { status: 400 });
    }
    normalizedUrl = check.normalizedUrl;

    // Check cache first
    const cached = getCache(normalizedUrl);
    if (cached) {
      return Response.json({ success: true, data: { ...cached, fromCache: true } });
    }

    // Check persistent history in Supabase
    const ttlMinutes = Number(process.env.SCRAPER_DB_CACHE_TTL_MINUTES || '30');
    const ttlIso = new Date(Date.now() - ttlMinutes * 60 * 1000).toISOString();
    let historyQuery = supabaseServer
      .from('scrape_results')
      .select('data_json, updated_at')
      .eq('url', normalizedUrl)
      .eq('status', 'success')
      .gte('updated_at', ttlIso)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (authContext.role !== 'admin') {
      historyQuery = historyQuery.eq('user_id', authContext.user.id);
    }

    const { data: dbHistory } = await historyQuery;
    if (dbHistory?.[0]?.data_json) {
      const dbData = dbHistory[0].data_json;
      setCache(normalizedUrl, dbData);
      return Response.json({ success: true, data: { ...dbData, fromCache: true } });
    }

    // Fetch the page (with automatic retry + backoff)
    const html = await fetchPageHtml(normalizedUrl);

    // Parse it
    const data = parseCircuitPage(html, normalizedUrl);

    // Store in cache
    setCache(normalizedUrl, data);

    await supabaseServer.from('scrape_results').insert({
      user_id: authContext.user.id,
      url: normalizedUrl,
      status: 'success',
      error_type: null,
      error_message: null,
      data_json: data,
      from_cache: false,
    });

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Scrape error:', error);
    const errorType = error.errorType || 'unknown';
    if (authContext?.ok && normalizedUrl) {
      await supabaseServer.from('scrape_results').insert({
        user_id: authContext.user.id,
        url: normalizedUrl,
        status: 'error',
        error_type: errorType,
        error_message: error.message || 'Failed to scrape URL',
        data_json: null,
        from_cache: false,
      });
    }
    return Response.json(
      {
        error: error.message || 'Failed to scrape URL',
        errorType,
        details: error.cause?.code || '',
      },
      { status: error.statusCode || 500 }
    );
  }
}

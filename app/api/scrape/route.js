import { fetchPageHtml, parseCircuitPage } from '../../../lib/scraper';
import { consumeRateLimit, getClientIp } from '../../../lib/rateLimit';
import { validateTargetUrl } from '../../../lib/security';

export const maxDuration = 60; // Vercel Pro: up to 300s

export async function POST(request) {
  try {
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

    // Fetch the page
    const html = await fetchPageHtml(check.normalizedUrl);

    // Parse it
    const data = parseCircuitPage(html, check.normalizedUrl);

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Scrape error:', error);
    return Response.json(
      {
        error: error.message || 'Failed to scrape URL',
        details: error.cause?.code || '',
      },
      { status: 500 }
    );
  }
}

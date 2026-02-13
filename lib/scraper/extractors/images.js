export function toAbsoluteImageUrl(imageUrl, pageUrl) {
  const raw = String(imageUrl || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;

  try {
    return new URL(raw, pageUrl).toString();
  } catch {
    if (raw.startsWith('/')) return `https://${raw.replace(/^\/+/, '')}`;
    return raw;
  }
}

export function extractImages($, pageUrl) {
  let banner = '';

  const bgEl = $('.header-summary__bg');
  if (bgEl.length) {
    const img = bgEl.find('img');
    if (img.length) {
      banner = img.attr('src') || img.attr('data-src') || '';
    }
    if (!banner) {
      const style = bgEl.attr('style') || '';
      const m = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
      if (m) banner = m[1];
    }
    if (!banner) {
      banner = bgEl.attr('data-bg') || bgEl.attr('data-background') || '';
    }
  }

  if (!banner) {
    const headerImg = $('[class*="header-summary"] img').first();
    if (headerImg.length) {
      banner = headerImg.attr('src') || headerImg.attr('data-src') || '';
    }
  }

  if (!banner) {
    banner = $('meta[property="og:image"]').attr('content') || '';
  }

  banner = toAbsoluteImageUrl(banner, pageUrl);

  let small = '';
  if (banner) {
    small = banner
      .replace(/resize\/crop\/\d+\/\d+/g, 'resize/crop/385/280')
      .replace(/\d+_\d+\.jpg/g, '900_900.jpg')
      .replace(/cdn\.traveltool\.es/g, 'cdn.smy.travel');
  }

  small = toAbsoluteImageUrl(small, pageUrl);

  return { banner, small };
}

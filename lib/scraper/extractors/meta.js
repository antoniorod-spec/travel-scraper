export function extractMetaTitle($) {
  const og = $('meta[property="og:title"]').attr('content');
  if (og) return cleanTitle(og);
  const title = $('title').text();
  if (title) return cleanTitle(title);
  const h1 = $('h1').first().text();
  return h1 ? h1.trim() : '';
}

function cleanTitle(raw) {
  return raw
    .replace(/\s*\|.*$/, '')
    .replace(/\s*-\s*Kerala.*$/i, '')
    .replace(/\s*-\s*Viajes.*$/i, '')
    .trim();
}

export function extractMetaDescription($) {
  const desc =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    '';
  return desc.trim();
}

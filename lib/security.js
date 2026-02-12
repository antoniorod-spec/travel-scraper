const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
];

const PRIVATE_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '::1',
  '::',
]);

function isPrivateIpv4(hostname) {
  return PRIVATE_IPV4_RANGES.some((re) => re.test(hostname));
}

function isLikelyIpv6Literal(hostname) {
  return hostname.includes(':');
}

export function validateTargetUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'Invalid URL format' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, reason: 'Only http/https URLs are allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (PRIVATE_HOSTNAMES.has(hostname) || isPrivateIpv4(hostname) || isLikelyIpv6Literal(hostname)) {
    return { ok: false, reason: 'Private or local network URLs are not allowed' };
  }

  const allowList = (process.env.SCRAPER_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  if (allowList.length > 0) {
    const isAllowed = allowList.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
    if (!isAllowed) {
      return { ok: false, reason: 'Domain is not allowed by server policy' };
    }
  }

  return { ok: true, normalizedUrl: parsed.toString() };
}

export function sanitizeSpreadsheetCell(value) {
  const str = String(value ?? '');
  if (!str) return '';
  if (/^[=+\-@]/.test(str)) return `'${str}`;
  return str;
}

export function clampText(value, maxLen = 5000) {
  const str = String(value ?? '');
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen);
}

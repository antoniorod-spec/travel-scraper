/**
 * Simple in-memory cache with TTL for scraped results.
 * Cache key = normalized URL, value = parsed data.
 */

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

const cache = new Map();

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    // Remove trailing slashes, lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();
    let path = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.protocol}//${parsed.hostname}${path}${parsed.search}`;
  } catch {
    return url;
  }
}

function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

/**
 * Get cached data for a URL. Returns null if not cached or expired.
 */
export function getCache(url) {
  cleanupExpired();
  const key = normalizeUrl(url);
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Store data in cache for a URL.
 */
export function setCache(url, data, ttlMs = DEFAULT_TTL_MS) {
  cleanupExpired();
  const key = normalizeUrl(url);
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    createdAt: Date.now(),
  });
}

/**
 * Clear the entire cache.
 */
export function clearCache() {
  cache.clear();
}

/**
 * Get cache stats.
 */
export function getCacheStats() {
  cleanupExpired();
  return {
    size: cache.size,
    keys: [...cache.keys()],
  };
}

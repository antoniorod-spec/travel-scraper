const buckets = new Map();

function now() {
  return Date.now();
}

function cleanupExpired(currentTime) {
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= currentTime) buckets.delete(key);
  }
}

export function consumeRateLimit(key, limit = 20, windowMs = 60_000) {
  const currentTime = now();
  cleanupExpired(currentTime);

  const record = buckets.get(key);
  if (!record || record.resetAt <= currentTime) {
    buckets.set(key, { count: 1, resetAt: currentTime + windowMs });
    return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, record.resetAt - currentTime),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - record.count),
    resetInMs: Math.max(0, record.resetAt - currentTime),
  };
}

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

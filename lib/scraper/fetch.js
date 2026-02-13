/**
 * Fetches the HTML content of a URL from the server side (no CORS issues).
 * Includes automatic retry with exponential backoff.
 */
export async function fetchPageHtml(url, { maxRetries = 1, initialDelay = 2000 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
      });

      if (!response.ok) {
        const statusCode = response.status;
        // Don't retry on client errors (except 429)
        if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
          const err = new Error(`HTTP ${statusCode}`);
          err.statusCode = statusCode;
          err.errorType = classifyHttpError(statusCode);
          throw err;
        }
        // Retry on 429 and 5xx
        const err = new Error(`HTTP ${statusCode}`);
        err.statusCode = statusCode;
        err.errorType = classifyHttpError(statusCode);
        err.retryable = true;
        throw err;
      }

      return await response.text();
    } catch (err) {
      lastError = err;

      // Classify the error
      if (!err.errorType) {
        if (err.name === 'AbortError') {
          err.errorType = 'timeout';
          err.retryable = true;
        } else if (/fetch|network|econnrefused|enotfound|dns/i.test(err.message)) {
          err.errorType = 'network';
          err.retryable = true;
        } else {
          err.errorType = 'unknown';
        }
      }

      // Retry if possible
      if (err.retryable && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

function classifyHttpError(statusCode) {
  if (statusCode === 429) return 'rate-limit';
  if (statusCode === 403) return 'forbidden';
  if (statusCode >= 500) return 'server-error';
  if (statusCode === 408) return 'timeout';
  return 'unknown';
}

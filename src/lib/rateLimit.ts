// Minimal in-memory sliding-window rate limiter for sensitive endpoints (mobile
// login / refresh). The cPanel deployment runs a single standalone Node process,
// so a per-process map is sufficient; swap for Redis if the app is ever scaled out.

interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>();

/**
 * Returns { ok, retryAfter } for a key. Allows `limit` hits per `windowMs`.
 * Call once per attempt; a denied call still counts toward the window.
 */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Clear a key's counter, e.g. after a successful login. */
export function rateLimitReset(key: string): void {
  buckets.delete(key);
}

// Best-effort cleanup so the map cannot grow without bound on a long-lived process.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    buckets.forEach((v, k) => { if (v.resetAt <= now) buckets.delete(k); });
  }, 10 * 60 * 1000).unref?.();
}

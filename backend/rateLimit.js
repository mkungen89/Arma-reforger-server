// Lightweight in-memory rate limiter (no external dependency).
// Good enough for single-process deployments (Docker / systemd).

function createRateLimiter({
  windowMs = 60_000,
  max = 60,
  keyGenerator = (req) => req.ip || req.connection?.remoteAddress || 'unknown',
  message = 'Too many requests, please try again later.',
} = {}) {
  const hits = new Map(); // key -> { count, resetAt }

  // Periodic cleanup to prevent unbounded memory.
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (!entry || entry.resetAt <= now) hits.delete(key);
    }
  }, Math.max(10_000, Math.floor(windowMs / 2)));
  cleanupInterval.unref?.();

  return function rateLimiter(req, res, next) {
    try {
      const now = Date.now();
      const key = keyGenerator(req);
      const entry = hits.get(key);

      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }

      entry.count += 1;

      if (entry.count > max) {
        const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
        res.setHeader('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
          error: message,
          code: 'RATE_LIMITED',
          retryAfterSeconds,
        });
      }

      return next();
    } catch (e) {
      // Fail open to avoid blocking traffic if limiter errors.
      return next();
    }
  };
}

module.exports = { createRateLimiter };



const WINDOW_MS = 15 * 60 * 1000;

// Per-process limiter: deploy a shared store before running multiple instances.
function createAuthLimiter({ limit = 20, now = Date.now } = {}) {
  const attempts = new Map();
  return (req, res, next) => {
    const time = now();
    for (const [key, entry] of attempts) {
      if (entry.expires <= time) attempts.delete(key);
    }
    const key = req.ip;
    let entry = attempts.get(key);
    if (!entry) {
      // Bound memory even when requests arrive from many different IPs.
      if (attempts.size >= 10000) {
        return res.status(429).json({ error: "Too many attempts. Please try again later." });
      }
      entry = { count: 0, expires: time + WINDOW_MS };
      attempts.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > limit) {
      res.set("Retry-After", String(Math.ceil((entry.expires - time) / 1000)));
      return res.status(429).json({ error: "Too many attempts. Please try again later." });
    }
    next();
  };
}

function securityHeaders(req, res, next) {
  res.set({
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  });
  if (process.env.NODE_ENV === "production") {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

function sameOrigin(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  // Browser fetch metadata catches cross-site requests even without Origin.
  if (req.get("Sec-Fetch-Site") === "cross-site") {
    return res.status(403).json({ error: "Cross-origin requests are not allowed." });
  }
  const origin = req.get("Origin");
  if (origin) {
    const expected = process.env.APP_ORIGIN || `${req.protocol}://${req.get("host")}`;
    if (origin !== expected) {
      return res.status(403).json({ error: "Cross-origin requests are not allowed." });
    }
  }
  next();
}

module.exports = { createAuthLimiter, securityHeaders, sameOrigin };

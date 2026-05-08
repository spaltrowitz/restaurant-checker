type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

const buckets = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
const CLEANUP_INTERVAL = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of buckets) {
      if (now >= entry.resetAt) {
        buckets.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[rate-limit] Cleaned ${cleaned} expired entries, ${buckets.size} remaining`);
    }
  }, CLEANUP_INTERVAL);
  // Don't block Node.js shutdown
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

function getClientIP(request: Request): string {
  const headers = new Headers(request.headers);
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headers.get("x-real-ip") || "unknown";
}

export function rateLimit(
  request: Request,
  route: string,
  config: RateLimitConfig
): Response | null {
  ensureCleanup();

  const ip = getClientIP(request);
  const key = `${route}:${ip}`;
  const now = Date.now();

  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    // New window
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    console.warn(`[rate-limit] ${route}`, ip);
    return Response.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  entry.count++;
  return null;
}

// Pre-configured limiters for each route
export const CHECK_LIMIT: RateLimitConfig = { maxRequests: 5, windowMs: 60_000 };
export const REPORT_LIMIT: RateLimitConfig = { maxRequests: 10, windowMs: 60_000 };
export const REPORTS_LIMIT: RateLimitConfig = { maxRequests: 20, windowMs: 60_000 };

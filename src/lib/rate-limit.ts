import "server-only";

/**
 * A small fixed-window limiter, in process memory.
 *
 * This exists for one reason: our API key can make the backend SEND SMS. An
 * unthrottled `/api/auth/send-code` is an SMS pump pointed at the store's
 * account, and the bill is real money. Upstream's own rate-limit hook is a stub
 * today, so the guard has to live here.
 *
 * LIMITATION — deliberately stated rather than hidden: this is per-process. Run
 * more than one instance and each gets its own budget. If you scale out, move
 * this to Redis (or whatever shared store you already run) before you rely on
 * it as a security control rather than as a speed bump.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/**
 * Best-effort client identity. `x-forwarded-for` is trivially spoofable when the
 * app is exposed directly, so this is only meaningful behind a proxy that
 * rewrites it. Documented in README under deployment.
 */
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? (fwd.split(",")[0] ?? "").trim() : "";
  return `${scope}:${ip || req.headers.get("x-real-ip") || "unknown"}`;
}

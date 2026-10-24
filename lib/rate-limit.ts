import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Limitador de ventana fija compatible con Route Handlers de Next.js.
 *
 * `express-rate-limit` está diseñado para Express y no protege Route Handlers
 * de Next. Se mantiene la misma semántica (límite, ventana, Retry-After) con
 * una implementación sin dependencias.
 *
 * Limitación conocida: la memoria es por instancia. En Vercel, con varias
 * instancias, el límite efectivo se multiplica. Para producción real usa un
 * almacén compartido (Upstash Redis o Vercel KV); el contrato de esta función
 * no cambia.
 */

export type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as typeof globalThis & {
  __vigoRateLimit?: Map<string, Bucket>;
};

const store = (globalStore.__vigoRateLimit ??= new Map<string, Bucket>());

function cleanup(now: number) {
  if (store.size < 2000) return;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export function checkRateLimit(key: string, policy: RateLimitPolicy): RateLimitResult {
  const now = Date.now();
  cleanup(now);
  const existing = store.get(key);
  const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + policy.windowMs };

  bucket.count += 1;
  store.set(key, bucket);

  const allowed = bucket.count <= policy.limit;
  return {
    allowed,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
    ...(result.allowed ? {} : { "Retry-After": String(result.retryAfterSeconds) }),
  };
}

export function getClientIdentifier(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();
  const userAgent = headers.get("user-agent")?.slice(0, 80) ?? "unknown";
  return `${forwarded || realIp || "anonymous"}:${userAgent}`;
}

export function resetRateLimitStore() {
  store.clear();
}

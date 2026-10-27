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

type RedisConfig = { url: string; token: string };

function getRedisConfig(): RedisConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

/**
 * Rate limit distribuido. Usa Upstash Redis si está configurado; si no,
 * cae al limitador en memoria. Un fallo de red no bloquea la petición:
 * se degrada a memoria y se registra el aviso.
 */
export async function checkRateLimitAsync(
  key: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const redis = getRedisConfig();
  if (!redis) return checkRateLimit(key, policy);

  try {
    const res = await fetch(`${redis.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redis.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, policy.windowMs, "NX"],
        ["PTTL", key],
      ]),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`upstash ${res.status}`);

    const payload = (await res.json()) as { result?: unknown; error?: string }[];
    const count = Number(payload[0]?.result ?? 0);
    const pttl = Number(payload[2]?.result ?? policy.windowMs);
    const resetAt = Date.now() + (pttl > 0 ? pttl : policy.windowMs);
    return {
      allowed: count <= policy.limit,
      limit: policy.limit,
      remaining: Math.max(0, policy.limit - count),
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
    };
  } catch (err) {
    console.warn(
      "[rate-limit] fallback a memoria:",
      err instanceof Error ? err.message.slice(0, 120) : "error",
    );
    return checkRateLimit(key, policy);
  }
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

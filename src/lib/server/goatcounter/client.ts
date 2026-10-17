import { env } from "$env/dynamic/private";
import { getRedis, pingRedis } from "$lib/server/auth/session-store.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 600;
const MIN_REQUEST_INTERVAL_MS = 280; // GoatCounter allows 4 req/sec; 280ms keeps throughput under ~3.5 req/sec.
const DEFAULT_CACHE_TTL_MS = 30_000; // 30 seconds cache for dashboard read queries
const REQUEST_TIMEOUT_MS = 15_000;
const CACHE_MAX_ENTRIES = 500; // Hard cap so unique query URLs cannot grow without bound.

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
// Identical GETs that overlap (layout and page loads) share one upstream call.
const inflightRequests = new Map<string, Promise<unknown>>();

// Lifetime totals for this process only; never include cache keys or requests.
const counters = {
  memoryHits: 0,
  sharedHits: 0,
  misses: 0,
  inflightDeduplications: 0,
  upstreamAttempts: 0,
  rateLimited: 0,
  backoffs: 0,
  retries: 0,
};
const startedAt = Date.now();

// Redis copy of the cache, shared by every replica so a second pod does not
// spend GoatCounter's 4 req/s budget on a query the first already answered.
const SHARED_CACHE_PREFIX = "gc-cache:";

async function readSharedCache<T>(cacheKey: string): Promise<T | undefined> {
  if (!(await pingRedis(100))) return undefined;
  try {
    const raw = await getRedis().get(SHARED_CACHE_PREFIX + cacheKey);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

async function writeSharedCache(
  cacheKey: string,
  data: unknown,
  ttlMs: number
): Promise<void> {
  if (!(await pingRedis(100))) return;
  try {
    await getRedis().set(
      SHARED_CACHE_PREFIX + cacheKey,
      JSON.stringify(data),
      "PX",
      ttlMs
    );
  } catch {
    // The per-process cache still holds the value.
  }
}

async function clearSharedCache(): Promise<void> {
  if (!(await pingRedis())) return;
  const redis = getRedis();
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(
      cursor,
      "MATCH",
      `${SHARED_CACHE_PREFIX}*`,
      "COUNT",
      500
    );
    if (keys.length) await redis.del(...keys);
    cursor = next;
  } while (cursor !== "0");
}

let lastRequestTime = 0;
let pacerQueue: Promise<void> = Promise.resolve();

// Last observed upstream health, used by /api/health without issuing blocking requests.
const UPSTREAM_STATUS_WINDOW_MS = 5 * 60_000;
const UPSTREAM_REFRESH_INTERVAL_MS = 60_000;
let lastUpstreamSuccessAt = 0;
let lastUpstreamFailureAt = 0;
let lastUpstreamRefreshAt = -Infinity;
let upstreamRefreshPending = false;

export class UpstreamHttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "UpstreamHttpError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Ensure outbound calls to GoatCounter are spaced apart to never exceed the 4 req/sec rate limit.
async function paceRequest(): Promise<void> {
  const execute = async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;

    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
    }

    lastRequestTime = Date.now();
  };

  pacerQueue = pacerQueue.then(execute, execute);
  return pacerQueue;
}

function sweepCache(now: number): void {
  if (memoryCache.size < CACHE_MAX_ENTRIES) return;

  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt <= now) memoryCache.delete(key);
  }

  // Still full after removing expired entries: drop the oldest half.
  if (memoryCache.size >= CACHE_MAX_ENTRIES) {
    const keys = [...memoryCache.keys()].slice(
      0,
      Math.floor(CACHE_MAX_ENTRIES / 2)
    );
    for (const key of keys) memoryCache.delete(key);
  }
}

export function getApiKey(): string {
  return (
    env.GOATCOUNTER_API_KEY ||
    process.env.GOATCOUNTER_API_KEY ||
    ""
  ).trim();
}

export function getBaseUrl(): string {
  const url = (env.GOATCOUNTER_URL || process.env.GOATCOUNTER_URL || "").trim();
  return url.replace(/\/+$/, "");
}

/**
 * GoatCounter routes /api/v0/stats/* by Host header, matching the site's
 * vhost. Container-internal URLs like http://goatcounter:8080 send
 * "Host: goatcounter:8080", which matches no site, and the API answers
 * 404 even though /api/v0/me works. Set GOATCOUNTER_VHOST to the site's
 * vhost so stats resolve; it is sent as the Host header verbatim.
 */
export function getVhost(): string {
  return (env.GOATCOUNTER_VHOST || process.env.GOATCOUNTER_VHOST || "").trim();
}

function upstreamHeaders(
  apiKey: string,
  vhost = getVhost()
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...(vhost ? { Host: vhost } : {}),
  };
}

/**
 * GoatCounter uses 404 both for unknown paths and for "no site matches this
 * Host header". Surface the Host-routing cause explicitly so a
 * misconfigured GOATCOUNTER_VHOST is diagnosable instead of rendering as
 * mysteriously empty reports.
 */
function hostRoutingHint(response: Response, url: URL): string | null {
  if (response.status !== 404) return null;

  const isApiPath = url.pathname.startsWith("/api/v0/");
  const host = url.host;
  const hostLooksInternal =
    host.startsWith("goatcounter") ||
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    /^\d+\.\d+\.\d+\.\d+/.test(host) ||
    host.endsWith(".svc.cluster.local");

  if (isApiPath && hostLooksInternal && !getVhost()) {
    return (
      "GoatCounter returned 404 for an API path. It routes /api/v0/stats/* by " +
      `the Host header, and "${host}" matches no site. Set GOATCOUNTER_VHOST ` +
      "to your site's vhost (the domain the GoatCounter dashboard uses) so " +
      "gtcd sends the right Host."
    );
  }

  return null;
}

/**
 * Guard the outbound integration: GoatCounter answers a missing or empty
 * Bearer token with the cryptic "wrong format for Authorization header", so
 * fail before the request with an actionable configuration error instead.
 */
function requireApiConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "GOATCOUNTER_URL is not configured. Set it in your .env or container environment (e.g. http://goatcounter:8080)."
    );
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "GOATCOUNTER_API_KEY is not configured. Generate a token in GoatCounter (Settings → API) or run ./scripts/setup.sh, then set it in your .env or container environment."
    );
  }

  return { baseUrl, apiKey };
}

export function clearClientCache(): void {
  memoryCache.clear();
  clearSharedCache().catch(() => {});
}

/**
 * Report the last observed GoatCounter reachability without performing I/O.
 * "unknown" means no request has completed (successfully or not) recently.
 */
export function getUpstreamStatus(): "up" | "down" | "unknown" {
  const now = Date.now();

  if (lastUpstreamSuccessAt > lastUpstreamFailureAt) {
    return now - lastUpstreamSuccessAt <= UPSTREAM_STATUS_WINDOW_MS
      ? "up"
      : "unknown";
  }

  if (lastUpstreamFailureAt > 0) {
    return now - lastUpstreamFailureAt <= UPSTREAM_STATUS_WINDOW_MS
      ? "down"
      : "unknown";
  }

  return "unknown";
}

export function getUpstreamObservation() {
  return {
    status: getUpstreamStatus(),
    observedAt: Math.max(lastUpstreamSuccessAt, lastUpstreamFailureAt) || null,
    lastSuccessAt: lastUpstreamSuccessAt || null,
    lastFailureAt: lastUpstreamFailureAt || null,
  };
}

export function getClientDiagnostics() {
  return {
    startedAt,
    sampledAt: Date.now(),
    upstream: getUpstreamObservation(),
    counters: { ...counters },
  };
}

/**
 * Trigger a background refresh of the upstream status. Never await this from a
 * liveness path. Share overlapping probes and sample at most once per minute
 * per process, including failures, so monitoring cannot exhaust the API budget.
 */
export function refreshUpstreamStatus(): void {
  const now = Date.now();
  if (
    upstreamRefreshPending ||
    now - lastUpstreamRefreshAt < UPSTREAM_REFRESH_INTERVAL_MS
  ) {
    return;
  }

  lastUpstreamRefreshAt = now;
  upstreamRefreshPending = true;
  void gcFetch("/api/v0/me", {}, undefined, { bypassCache: true })
    .catch(() => {})
    .finally(() => {
      upstreamRefreshPending = false;
    });
}

export interface GoatCounterRequestOptions {
  readonly bypassCache?: boolean;
  readonly ttlMs?: number;
  readonly vhost?: string;
}

export async function gcFetch<T>(
  path: string,
  init: RequestInit = {},
  params?: Record<string, string | undefined>,
  options: GoatCounterRequestOptions = {}
): Promise<T> {
  const { baseUrl } = requireApiConfig();
  const url = new URL(`${baseUrl}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const isGet = !init.method || init.method.toUpperCase() === "GET";
  const cacheKey = `${options.vhost ?? getVhost()}::${url}`;
  const now = Date.now();

  if (isGet && !options.bypassCache) {
    const cached = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > now) {
      counters.memoryHits++;
      return cached.data;
    }
  }

  if (isGet && !options.bypassCache) {
    const pending = inflightRequests.get(cacheKey) as Promise<T> | undefined;
    if (pending) {
      counters.inflightDeduplications++;
      return pending;
    }
  }

  if (!isGet) return requestWithRetry<T>(url, init, isGet, cacheKey, options);

  const request = (async () => {
    if (!options.bypassCache) {
      const shared = await readSharedCache<T>(cacheKey);
      if (shared !== undefined) {
        counters.sharedHits++;
        sweepCache(Date.now());
        memoryCache.set(cacheKey, {
          data: shared,
          expiresAt: Date.now() + (options.ttlMs ?? DEFAULT_CACHE_TTL_MS),
        });
        return shared;
      }
      counters.misses++;
    }
    return requestWithRetry<T>(url, init, isGet, cacheKey, options);
  })();

  inflightRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

async function requestWithRetry<T>(
  url: URL,
  init: RequestInit,
  isGet: boolean,
  cacheKey: string,
  options: GoatCounterRequestOptions
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await paceRequest();

      counters.upstreamAttempts++;
      if (attempt > 0) counters.retries++;
      const response = await fetch(url.toString(), {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          ...upstreamHeaders(getApiKey(), options.vhost),
          ...init.headers,
        },
      });

      if (response.status === 429) {
        counters.rateLimited++;
        const retryAfterHeader =
          response.headers.get("Retry-After") ||
          response.headers.get("X-Rate-Limit-Reset");
        const parsedSeconds = retryAfterHeader
          ? parseInt(retryAfterHeader, 10)
          : 0;

        // Ensure wait is at least 1000ms, adding exponential backoff and jitter
        const jitter = Math.floor(Math.random() * 250);
        const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt);
        const waitMs =
          Math.max(1000, parsedSeconds * 1000, exponentialDelay) + jitter;

        lastError = new Error(
          attempt === MAX_RETRIES
            ? "Rate limit exceeded (429). Retry budget exhausted."
            : `Rate limit exceeded (429). Retry scheduled in ${waitMs}ms.`
        );

        lastUpstreamFailureAt = Date.now();
        if (attempt === MAX_RETRIES) break;
        counters.backoffs++;
        await sleep(waitMs);
        continue;
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        const hint = hostRoutingHint(response, url);

        throw new UpstreamHttpError(
          hint || errorData.error || `API error: ${response.status}`,
          response.status
        );
      }

      const result = (await response.json()) as T;

      lastUpstreamSuccessAt = Date.now();

      if (isGet) {
        const ttl = options.ttlMs ?? DEFAULT_CACHE_TTL_MS;
        sweepCache(Date.now());
        memoryCache.set(cacheKey, {
          data: result,
          expiresAt: Date.now() + ttl,
        });
        await writeSharedCache(cacheKey, result, ttl);
      }

      return result;
    } catch (error) {
      lastUpstreamFailureAt = Date.now();

      if (error instanceof Error) {
        lastError = error;
        if (
          error instanceof UpstreamHttpError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 408
        ) {
          throw error;
        }
      }

      if (attempt < MAX_RETRIES) {
        counters.backoffs++;
        const jitter = Math.floor(Math.random() * 150);
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt) + jitter);
      }
    }
  }

  throw lastError || new Error("Request failed after retries");
}

export async function gcFetchRaw(
  path: string,
  init: RequestInit = {},
  options: Pick<GoatCounterRequestOptions, "vhost"> = {}
): Promise<Response> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "GOATCOUNTER_URL is not configured. Set it in your .env or container environment (e.g. http://goatcounter:8080)."
    );
  }

  await paceRequest();

  const url = `${baseUrl}${path}`;
  const apiKey = getApiKey();
  const vhost = options.vhost ?? getVhost();

  counters.upstreamAttempts++;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        // The login form endpoint does not require an API token; only send the
        // header when a key exists so we never transmit an empty Bearer value.
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(vhost ? { Host: vhost } : {}),
        ...init.headers,
      },
    });
  } catch (cause) {
    lastUpstreamFailureAt = Date.now();
    throw cause;
  }

  if (response.ok) lastUpstreamSuccessAt = Date.now();
  else lastUpstreamFailureAt = Date.now();
  if (response.status === 429) counters.rateLimited++;
  return response;
}

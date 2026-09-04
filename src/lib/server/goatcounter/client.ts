import { env } from "$env/dynamic/private";

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

let lastRequestTime = 0;
let pacerQueue: Promise<void> = Promise.resolve();

// Last observed upstream health, used by /api/health without issuing blocking requests.
const UPSTREAM_STATUS_WINDOW_MS = 5 * 60_000;
let lastUpstreamSuccessAt = 0;
let lastUpstreamFailureAt = 0;

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
    const keys = [...memoryCache.keys()].slice(0, Math.floor(CACHE_MAX_ENTRIES / 2));
    for (const key of keys) memoryCache.delete(key);
  }
}

export function getApiKey(): string {
  return env.GOATCOUNTER_API_KEY || process.env.GOATCOUNTER_API_KEY || "";
}

export function getBaseUrl(): string {
  const url = env.GOATCOUNTER_URL || process.env.GOATCOUNTER_URL || "";
  return url.replace(/\/+$/, "");
}

export function clearClientCache(): void {
  memoryCache.clear();
}

/**
 * Report the last observed GoatCounter reachability without performing I/O.
 * "unknown" means no request has completed (successfully or not) recently.
 */
export function getUpstreamStatus(): "up" | "down" | "unknown" {
  const now = Date.now();

  if (lastUpstreamSuccessAt > lastUpstreamFailureAt) {
    return now - lastUpstreamSuccessAt <= UPSTREAM_STATUS_WINDOW_MS ? "up" : "unknown";
  }

  if (lastUpstreamFailureAt > 0) {
    return now - lastUpstreamFailureAt <= UPSTREAM_STATUS_WINDOW_MS ? "down" : "unknown";
  }

  return "unknown";
}

/**
 * Trigger a background refresh of the upstream status. Never await this from a
 * liveness path: it must not block health probes when GoatCounter is slow.
 */
export function refreshUpstreamStatus(): void {
  gcFetch("/api/v0/me", {}, undefined, { bypassCache: true }).catch(() => {});
}

export async function gcFetch<T>(
  path: string,
  init: RequestInit = {},
  params?: Record<string, string | undefined>,
  options: { bypassCache?: boolean; ttlMs?: number } = {},
): Promise<T> {
  const url = new URL(`${getBaseUrl()}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const isGet = !init.method || init.method.toUpperCase() === "GET";
  const cacheKey = url.toString();
  const now = Date.now();

  if (isGet && !options.bypassCache) {
    const cached = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await paceRequest();

      const response = await fetch(url.toString(), {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiKey()}`,
          ...init.headers,
        },
      });

      if (response.status === 429) {
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
          `Rate limit exceeded (429). Retry scheduled in ${waitMs}ms.`,
        );

        await sleep(waitMs);
        continue;
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `API error: ${response.status}`);
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
      }

      return result;
    } catch (error) {
      lastUpstreamFailureAt = Date.now();

      if (error instanceof Error) {
        lastError = error;
        if (
          error.message.includes("401") ||
          error.message.includes("Not authenticated")
        ) {
          throw error;
        }
      }

      if (attempt < MAX_RETRIES) {
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
): Promise<Response> {
  await paceRequest();

  const url = `${getBaseUrl()}${path}`;

  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      ...init.headers,
    },
  });

  lastUpstreamSuccessAt = Date.now();
  return response;
}

import { GOATCOUNTER_API_KEY, GOATCOUNTER_URL } from "$env/static/private";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 600;
const MIN_REQUEST_INTERVAL_MS = 280; // GoatCounter allows 4 req/sec; 280ms keeps throughput under ~3.5 req/sec.
const DEFAULT_CACHE_TTL_MS = 30_000; // 30 seconds cache for dashboard read queries

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

let lastRequestTime = 0;
let pacerQueue: Promise<void> = Promise.resolve();

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

export function getBaseUrl(): string {
  return GOATCOUNTER_URL.replace(/\/+$/, "");
}

export function clearClientCache(): void {
  memoryCache.clear();
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GOATCOUNTER_API_KEY}`,
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
        lastRequestTime = Date.now() + waitMs;

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

      if (isGet) {
        const ttl = options.ttlMs ?? DEFAULT_CACHE_TTL_MS;
        memoryCache.set(cacheKey, {
          data: result,
          expiresAt: Date.now() + ttl,
        });
      }

      return result;
    } catch (error) {
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

  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GOATCOUNTER_API_KEY}`,
      ...init.headers,
    },
  });
}

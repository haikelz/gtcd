import { env } from "$env/dynamic/private";
import {
  getRedis,
  pingRedis,
  reportRedisFailure,
} from "$lib/server/auth/session-store.js";
import { upstreamFetch } from "./upstream-fetch.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 600;
const MIN_REQUEST_INTERVAL_MS = 280; // GoatCounter allows 4 req/sec; 280ms keeps throughput under ~3.5 req/sec.
const DEFAULT_CACHE_TTL_MS = 30_000; // 30 seconds cache for dashboard read queries
const REQUEST_TIMEOUT_MS = 15_000;
// One budget per call across pacing, attempts and backoff, so an unreachable
// GoatCounter cannot stall a page for a minute.
const REQUEST_DEADLINE_MS = 20_000;
const MAX_RATE_LIMIT_WAIT_MS = 60_000;
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
  if (!(await pingRedis())) return undefined;

  const raw = await getRedis()
    .get(SHARED_CACHE_PREFIX + cacheKey)
    .catch((cause: unknown) => {
      reportRedisFailure(cause);
      return null;
    });
  try {
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
  if (!(await pingRedis())) return;
  try {
    await getRedis().set(
      SHARED_CACHE_PREFIX + cacheKey,
      JSON.stringify(data),
      "PX",
      ttlMs
    );
  } catch (cause) {
    // The per-process cache still holds the value.
    reportRedisFailure(cause);
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
// A 429 holds every queued request until then, not only the one that saw it.
let rateLimitedUntil = 0;
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

/**
 * Space outbound calls so they never exceed the 4 req/sec rate limit, and
 * hold them all while a 429 pause lasts. Throws instead of waiting past
 * `deadline`; nothing has been sent at that point.
 */
async function paceRequest(deadline: number): Promise<void> {
  const execute = async () => {
    // Re-check after sleeping: a 429 may have arrived meanwhile.
    for (;;) {
      const now = Date.now();
      const wait = Math.max(
        MIN_REQUEST_INTERVAL_MS - (now - lastRequestTime),
        rateLimitedUntil - now
      );
      if (wait <= 0) break;
      if (now + wait >= deadline) {
        throw rateLimitedUntil > now
          ? new UpstreamHttpError(
              "Rate limit exceeded (429). Retry later.",
              429
            )
          : new Error("GoatCounter request deadline exceeded.");
      }

      await sleep(wait);
    }

    lastRequestTime = Date.now();
  };

  const turn = pacerQueue.then(execute);
  pacerQueue = turn.catch(() => {});
  return turn;
}

/** Retry-After is delta-seconds or an HTTP-date; X-Rate-Limit-Reset is seconds. */
function retryAfterMs(response: Response): number {
  const header =
    response.headers.get("Retry-After") ||
    response.headers.get("X-Rate-Limit-Reset");
  if (!header) return 0;

  const seconds = Number(header);
  const ms = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(header) - Date.now();
  return Number.isFinite(ms) ? ms : 0;
}

/** Pause every queued request after a 429; returns the pause in ms. */
function pauseForRateLimit(response: Response, attempt: number): number {
  const jitter = Math.floor(Math.random() * 250);
  const waitMs = Math.min(
    Math.max(1000, retryAfterMs(response), BASE_DELAY_MS * 2 ** attempt) +
      jitter,
    MAX_RATE_LIMIT_WAIT_MS
  );

  rateLimitedUntil = Math.max(rateLimitedUntil, Date.now() + waitMs);
  return waitMs;
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
  const deadline = Date.now() + REQUEST_DEADLINE_MS;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Past the deadline, the last upstream error explains more than the pacer.
    await paceRequest(deadline).catch((cause: unknown) => {
      throw lastError ?? cause;
    });

    try {
      counters.upstreamAttempts++;
      if (attempt > 0) counters.retries++;
      const response = await upstreamFetch(url, {
        ...init,
        signal: AbortSignal.timeout(
          Math.max(1, Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now()))
        ),
        headers: {
          ...upstreamHeaders(getApiKey(), options.vhost),
          ...init.headers,
        },
      });

      // GoatCounter refused without running the request, so even a POST may
      // be sent again once the shared pause ends.
      if (response.status === 429) {
        counters.rateLimited++;
        lastUpstreamFailureAt = Date.now();
        const waitMs = pauseForRateLimit(response, attempt);
        const exhausted =
          attempt === MAX_RETRIES || Date.now() + waitMs >= deadline;

        lastError = new UpstreamHttpError(
          exhausted
            ? "Rate limit exceeded (429). Retry budget exhausted."
            : `Rate limit exceeded (429). Retry scheduled in ${waitMs}ms.`,
          429
        );
        if (exhausted) break;
        counters.backoffs++;
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
      if (!(error instanceof Error)) throw error;

      lastError = error;
      // A POST or PUT that failed any other way may already have run upstream.
      // A timeout spent the budget, and a 4xx other than 408 will not change.
      if (
        !isGet ||
        error.name === "TimeoutError" ||
        (error instanceof UpstreamHttpError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 408)
      ) {
        throw error;
      }

      const delay =
        BASE_DELAY_MS * 2 ** attempt + Math.floor(Math.random() * 150);
      if (attempt === MAX_RETRIES || Date.now() + delay >= deadline) break;
      counters.backoffs++;
      await sleep(delay);
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

  const deadline = Date.now() + REQUEST_DEADLINE_MS;
  await paceRequest(deadline);

  const url = `${baseUrl}${path}`;
  const apiKey = getApiKey();
  const vhost = options.vhost ?? getVhost();

  counters.upstreamAttempts++;
  let response: Response;
  try {
    response = await upstreamFetch(url, {
      ...init,
      // The pacer may have spent part of the budget; stay inside the deadline.
      signal: AbortSignal.timeout(
        Math.max(1, Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now()))
      ),
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
  if (response.status === 429) {
    counters.rateLimited++;
    pauseForRateLimit(response, 0);
  }
  return response;
}

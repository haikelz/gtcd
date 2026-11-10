import { error } from "@sveltejs/kit";
import type { Locale } from "$lib/dashboard-layout";
import { type MessageKey, translate } from "$lib/i18n";
import { gcFetch, UpstreamHttpError } from "./client.js";
import type { GoatCounterRequestOptions } from "./client.js";
import { PathFilterLimitError } from "./filter.js";
import type {
  CountTotalResponse,
  GoatCounterUser,
  HitStat,
  HitsResponse,
  RefsResponse,
  StatsDetailPage,
  StatsPage,
  StatsResponse,
} from "./types.js";

function normalizeName(name: string | null | undefined): string {
  if (!name || name.trim() === "") {
    return "Unknown";
  }
  return name.trim();
}

const SIZE_CATEGORY_NAMES: Readonly<Record<string, string>> = {
  phone: "Phones",
  tablet: "Tablets and large phones",
  desktop: "Computer monitors",
  desktophd: "Computer monitors larger than HD",
  unknown: "Unknown",
};

function normalizeStatName(
  page: StatsPage,
  id: string,
  name: string | null | undefined
): string {
  if (page === "sizes" && (!name || name.trim() === "")) {
    return SIZE_CATEGORY_NAMES[id] ?? "Unknown";
  }

  return normalizeName(name);
}

/** A stats row as GoatCounter sends it: 2.7 omits the id it cannot attribute. */
type UpstreamHitStat = Omit<HitStat, "id"> & { readonly id?: string };
type UpstreamStatsResponse = Omit<StatsResponse, "stats"> & {
  readonly stats?: readonly UpstreamHitStat[];
};

/**
 * GoatCounter 2.7 sends direct visits in toprefs without an id. Every row gets
 * a string id, empty when GoatCounter sent none, so nothing links to it.
 */
function normalizeStats(
  page: StatsPage,
  stats: readonly UpstreamHitStat[] | undefined
): HitStat[] {
  return (stats ?? []).map((item) => {
    const id = item.id ?? "";
    return { ...item, id, name: normalizeStatName(page, id, item.name) };
  });
}

const STATS_PAGES: readonly StatsPage[] = [
  "browsers",
  "systems",
  "locations",
  "languages",
  "sizes",
  "campaigns",
  "toprefs",
];

/**
 * Validate an untrusted stats page name before it is ever interpolated into
 * an upstream URL. Prevents path traversal into other GoatCounter endpoints.
 */
export function isStatsPage(value: string): value is StatsPage {
  return (STATS_PAGES as readonly string[]).includes(value);
}

const DETAIL_STATS_PAGES: readonly StatsDetailPage[] = [
  "browsers",
  "systems",
  "locations",
  "sizes",
  "campaigns",
  "toprefs",
];

export function isStatsDetailPage(value: string): value is StatsDetailPage {
  return (DETAIL_STATS_PAGES as readonly string[]).includes(value);
}

export async function getMe(): Promise<GoatCounterUser> {
  return gcFetch<GoatCounterUser>("/api/v0/me");
}

/**
 * Join resolved filter path IDs for include_paths. An empty array means the
 * filter matched nothing, which short-circuits to an empty response — the
 * API omits empty parameters, so it cannot express "no paths" itself.
 */
function includePathsParam(includePaths?: number[]): string | undefined {
  return includePaths && includePaths.length > 0
    ? includePaths.join(",")
    : undefined;
}

function emptyTotal(): CountTotalResponse {
  return { total: 0, total_events: 0, total_utc: 0, stats: [] };
}

export async function getTotal(
  start?: string,
  end?: string,
  includePaths?: number[],
  options?: GoatCounterRequestOptions
): Promise<CountTotalResponse> {
  if (includePaths && includePaths.length === 0) return emptyTotal();

  return gcFetch<CountTotalResponse>(
    "/api/v0/stats/total",
    {},
    { start, end, include_paths: includePathsParam(includePaths) },
    options
  );
}

export async function getHits(
  start?: string,
  end?: string,
  limit?: number,
  excludePaths?: string,
  pathByName?: boolean,
  includePaths?: number[],
  options?: GoatCounterRequestOptions
): Promise<HitsResponse> {
  if (includePaths && includePaths.length === 0) {
    return { hits: [], total: 0, more: false };
  }

  const res = await gcFetch<HitsResponse>(
    "/api/v0/stats/hits",
    {},
    {
      start,
      end,
      limit: limit?.toString(),
      exclude_paths: excludePaths,
      path_by_name: pathByName ? "true" : undefined,
      include_paths: includePathsParam(includePaths),
    },
    options
  );

  return {
    ...res,
    hits: (res.hits || []).map((hit) => {
      const path = normalizeName(hit.path);
      const title =
        hit.title && hit.title.trim() !== "" ? hit.title.trim() : path;

      return {
        ...hit,
        path,
        title,
      };
    }),
  };
}

export async function getReferrals(
  pathId: number,
  start?: string,
  end?: string,
  limit?: number,
  offset?: number,
  options?: GoatCounterRequestOptions
): Promise<RefsResponse> {
  const res = await gcFetch<RefsResponse>(
    `/api/v0/stats/hits/${pathId}`,
    {},
    {
      start,
      end,
      limit: limit?.toString(),
      offset: offset?.toString(),
    },
    options
  );

  return {
    ...res,
    refs: (res.refs || []).map((ref) => ({
      ...ref,
      name: normalizeName(ref.name),
    })),
  };
}

export async function getStats(
  page: StatsPage,
  start?: string,
  end?: string,
  limit?: number,
  offset?: number,
  includePaths?: number[],
  options?: GoatCounterRequestOptions
): Promise<StatsResponse> {
  if (includePaths && includePaths.length === 0) {
    return { stats: [], more: false };
  }

  const res = await gcFetch<UpstreamStatsResponse>(
    `/api/v0/stats/${page}`,
    {},
    {
      start,
      end,
      limit: limit?.toString(),
      offset: offset?.toString(),
      include_paths: includePathsParam(includePaths),
    },
    options
  );

  return { ...res, stats: normalizeStats(page, res.stats) };
}

export async function getStatsDetail(
  page: StatsPage,
  id: string,
  start?: string,
  end?: string,
  limit?: number,
  offset?: number,
  includePaths?: number[],
  options?: GoatCounterRequestOptions
): Promise<StatsResponse> {
  if (includePaths && includePaths.length === 0) {
    return { stats: [], more: false };
  }

  const res = await gcFetch<UpstreamStatsResponse>(
    `/api/v0/stats/${page}/${encodeURIComponent(id)}`,
    {},
    {
      start,
      end,
      limit: limit?.toString(),
      offset: offset?.toString(),
      include_paths: includePathsParam(includePaths),
    },
    options
  );

  return { ...res, stats: normalizeStats(page, res.stats) };
}

export async function getPaths(
  limit?: number,
  after?: number,
  options?: GoatCounterRequestOptions
): Promise<{
  paths: { id: number; path: string; title: string; event: boolean }[];
  more: boolean;
}> {
  const res = await gcFetch<{
    paths: { id: number; path: string; title: string; event: boolean }[];
    more: boolean;
  }>(
    "/api/v0/paths",
    {},
    {
      limit: limit?.toString(),
      after: after?.toString(),
    },
    options
  );

  return {
    ...res,
    paths: (res.paths || []).map((p) => {
      const path = normalizeName(p.path);
      const title = p.title && p.title.trim() !== "" ? p.title.trim() : path;

      return {
        ...p,
        path,
        title,
      };
    }),
  };
}

function isRateLimited(cause: unknown): boolean {
  return cause instanceof UpstreamHttpError && cause.status === 429;
}

function isUnavailable(cause: unknown): boolean {
  if (cause instanceof UpstreamHttpError) {
    return cause.status === 408 || cause.status >= 500;
  }
  if (!(cause instanceof Error)) return false;

  // AbortSignal.timeout rejects with TimeoutError; undici reports network
  // failures as a TypeError that carries the socket error as its cause.
  return (
    cause.name === "TimeoutError" ||
    (cause instanceof TypeError && cause.cause !== undefined)
  );
}

/** A rate limit, timeout or outage: worth a retry, not worth showing raw. */
export function isTransientUpstreamError(cause: unknown): boolean {
  return isRateLimited(cause) || isUnavailable(cause);
}

/**
 * A translated, user-safe message for a failed request. Upstream text stays in
 * the server log; unknown failures use the caller's own message.
 */
export function reportLoadError(
  cause: unknown,
  locale: Locale,
  fallback: MessageKey
): string {
  console.error(
    "Report request failed:",
    cause instanceof Error ? cause.message : cause
  );

  if (cause instanceof PathFilterLimitError) {
    return translate(locale, "common.filterLimit", {
      limit: cause.limit.toLocaleString(locale),
    });
  }
  if (isRateLimited(cause)) return translate(locale, "common.rateLimited");
  if (isUnavailable(cause)) {
    return translate(locale, "common.upstreamUnavailable");
  }

  return translate(locale, fallback);
}

/**
 * A report request for a load function to stream. A failure rejects with
 * the translated message as an expected error, which reaches the page's
 * {:catch} block as `{ message }`.
 */
export function streamReport<T>(
  request: Promise<T>,
  locale: Locale,
  fallback: MessageKey
): Promise<T> {
  const streamed = request.catch((cause: unknown) => {
    throw error(503, reportLoadError(cause, locale, fallback));
  });

  // SvelteKit handles the rejection once it serializes the promise; mark it
  // handled now so a fast failure cannot become an unhandled rejection.
  streamed.catch(() => {});
  return streamed;
}

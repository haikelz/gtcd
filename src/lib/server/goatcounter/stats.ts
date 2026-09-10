import { gcFetch } from "./client.js";
import type {
  CountTotalResponse,
  GoatCounterUser,
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

export async function getTotal(
  start?: string,
  end?: string
): Promise<CountTotalResponse> {
  return gcFetch<CountTotalResponse>("/api/v0/stats/total", {}, { start, end });
}

export async function getHits(
  start?: string,
  end?: string,
  limit?: number,
  excludePaths?: string,
  pathByName?: boolean
): Promise<HitsResponse> {
  const res = await gcFetch<HitsResponse>(
    "/api/v0/stats/hits",
    {},
    {
      start,
      end,
      limit: limit?.toString(),
      exclude_paths: excludePaths,
      path_by_name: pathByName ? "true" : undefined,
    }
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
  offset?: number
): Promise<RefsResponse> {
  const res = await gcFetch<RefsResponse>(
    `/api/v0/stats/hits/${pathId}`,
    {},
    {
      start,
      end,
      limit: limit?.toString(),
      offset: offset?.toString(),
    }
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
  offset?: number
): Promise<StatsResponse> {
  const res = await gcFetch<StatsResponse>(
    `/api/v0/stats/${page}`,
    {},
    {
      start,
      end,
      limit: limit?.toString(),
      offset: offset?.toString(),
    }
  );

  return {
    ...res,
    stats: (res.stats || []).map((item) => ({
      ...item,
      name: normalizeStatName(page, item.id, item.name),
    })),
  };
}

export async function getStatsDetail(
  page: StatsPage,
  id: string,
  start?: string,
  end?: string,
  limit?: number,
  offset?: number
): Promise<StatsResponse> {
  const res = await gcFetch<StatsResponse>(
    `/api/v0/stats/${page}/${encodeURIComponent(id)}`,
    {},
    {
      start,
      end,
      limit: limit?.toString(),
      offset: offset?.toString(),
    }
  );

  return {
    ...res,
    stats: (res.stats || []).map((item) => ({
      ...item,
      name: normalizeStatName(page, item.id, item.name),
    })),
  };
}

export async function getPaths(
  limit?: number,
  after?: number
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
    }
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

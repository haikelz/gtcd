import { filterMatches, parseFilter } from "$lib/filter.js";
import { gcFetch } from "./client.js";
import type { GoatCounterRequestOptions } from "./client.js";

/**
 * GoatCounter's JSON API has no filter parameter, so a filter is resolved to
 * matching path IDs here and passed to every stats endpoint as
 * include_paths — the same scope GoatCounter's own dashboard applies the
 * filter to (totals, charts, page list and audience reports).
 */

const MAX_FILTER_CHARS = 200;
const MAX_PATH_SCAN = 10_000;
const SCAN_PAGE_SIZE = 200;
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX_ENTRIES = 100;

interface PathScanEntry {
  readonly ids: number[] | undefined;
  readonly expiresAt: number;
}

const cache = new Map<string, PathScanEntry>();

/** Read and normalize the filter query parameter. */
export function getFilterFromUrl(url: URL): string {
  const raw = url.searchParams.get("filter");
  if (!raw) return "";
  const trimmed = raw.trim();
  return trimmed.length > MAX_FILTER_CHARS
    ? trimmed.slice(0, MAX_FILTER_CHARS)
    : trimmed;
}

function remember(key: string, ids: number[] | undefined): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { ids, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Resolve a filter to the IDs of matching paths.
 *
 * Returns undefined when the filter does not narrow anything (no filter, or a
 * keyword-only filter with no effect), an empty array when nothing matches,
 * and otherwise the matching path IDs. Throws when the site has more paths
 * than can be scanned, rather than silently reporting partial results.
 */
export async function resolveFilter(
  filter: string,
  options?: GoatCounterRequestOptions
): Promise<number[] | undefined> {
  if (!filter) return undefined;

  const key = `${options?.vhost ?? ""}\n${filter}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.ids;

  const parsed = parseFilter(filter);
  if (
    parsed.term === "" &&
    !parsed.onlyEvent &&
    !parsed.onlyPageview &&
    !parsed.negate
  ) {
    // Keywords like at:start on their own do not narrow the result set.
    remember(key, undefined);
    return undefined;
  }

  const ids: number[] = [];
  let after: number | undefined;
  let scanned = 0;
  let more = true;

  while (more) {
    const res = await gcFetch<{
      paths: {
        id: number;
        path: string;
        title: string | null;
        event: boolean;
      }[];
      more: boolean;
    }>(
      "/api/v0/paths",
      {},
      {
        limit: String(SCAN_PAGE_SIZE),
        ...(after !== undefined ? { after: String(after) } : {}),
      },
      options
    );

    for (const p of res.paths) {
      if (
        filterMatches(parsed, {
          path: p.path ?? "",
          title: p.title ?? "",
          event: !!p.event,
        })
      ) {
        ids.push(p.id);
      }
    }

    scanned += res.paths.length;
    const last = res.paths[res.paths.length - 1];
    more = res.more && !!last && res.paths.length > 0;
    if (last) after = last.id;

    if (scanned >= MAX_PATH_SCAN) {
      if (more) {
        throw new Error(
          `This site has more than ${MAX_PATH_SCAN.toLocaleString()} paths, ` +
            "which is the limit for path filtering. Remove the filter to " +
            "view reports."
        );
      }
      break;
    }
  }

  // Matching every path is the same as no filter; avoid sending a huge
  // include_paths list upstream.
  const result = ids.length === scanned ? undefined : ids;
  remember(key, result);
  return result;
}

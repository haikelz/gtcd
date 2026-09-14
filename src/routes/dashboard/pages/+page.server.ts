import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl } from "$lib/server/helpers.js";

function parseExcludedPathIds(value: string | null): string {
  if (!value) return "";

  const ids = value.split(",");
  if (ids.some((id) => !/^\d+$/.test(id) || Number(id) < 1)) {
    throw new Error("Choose a valid page list.");
  }

  return ids.join(",");
}

export async function load({ url, parent }) {
  const { range, start, end } = getDateRangeFromUrl(url);
  const excludedPathIds = parseExcludedPathIds(url.searchParams.get("exclude"));
  const { vhost } = await parent();

  try {
    const hits = await stats.getHits(
      start,
      end,
      100,
      excludedPathIds,
      undefined,
      { vhost }
    );
    const nextExcludedPathIds = [
      excludedPathIds,
      ...hits.hits.map((hit) => String(hit.path_id)),
    ]
      .filter(Boolean)
      .join(",");
    const previousExcludedPathIds = excludedPathIds
      .split(",")
      .filter(Boolean)
      .slice(0, -100)
      .join(",");

    return {
      range,
      hits,
      excludedPathIds,
      nextExcludedPathIds,
      previousExcludedPathIds,
    };
  } catch (e: unknown) {
    return {
      range,
      error: e instanceof Error ? e.message : "Failed",
      hits: null,
      excludedPathIds,
      nextExcludedPathIds: "",
      previousExcludedPathIds: "",
    };
  }
}

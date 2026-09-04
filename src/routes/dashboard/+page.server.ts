import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRange } from "$lib/server/helpers.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  const preset = url.searchParams.get("range") || "7d";
  const { start, end } = getDateRange(preset);

  const [
    totalResult,
    hitsResult,
    browsersResult,
    systemsResult,
    locationsResult,
    languagesResult,
    sizesResult,
  ] = await Promise.allSettled([
    stats.getTotal(start, end),
    stats.getHits(start, end, 20),
    stats.getStats("browsers", start, end, 15),
    stats.getStats("systems", start, end, 15),
    stats.getStats("locations", start, end, 15),
    stats.getStats("languages", start, end, 15),
    stats.getStats("sizes", start, end, 15),
  ]);

  const total = totalResult.status === "fulfilled" ? totalResult.value : null;
  const hits = hitsResult.status === "fulfilled" ? hitsResult.value : null;
  const browsers =
    browsersResult.status === "fulfilled" ? browsersResult.value : null;
  const systems =
    systemsResult.status === "fulfilled" ? systemsResult.value : null;
  const locations =
    locationsResult.status === "fulfilled" ? locationsResult.value : null;
  const languages =
    languagesResult.status === "fulfilled" ? languagesResult.value : null;
  const sizes = sizesResult.status === "fulfilled" ? sizesResult.value : null;

  const allFailed =
    !total &&
    !hits &&
    !browsers &&
    !systems &&
    !locations &&
    !languages &&
    !sizes;

  let generalError: string | null = null;
  if (allFailed) {
    const firstRejection = [
      totalResult,
      hitsResult,
      browsersResult,
      systemsResult,
      locationsResult,
      languagesResult,
      sizesResult,
    ].find((result) => result.status === "rejected") as
      | PromiseRejectedResult
      | undefined;

    generalError =
      firstRejection?.reason instanceof Error
        ? firstRejection.reason.message
        : "Failed to load dashboard data.";
  }

  return {
    range: preset,
    error: generalError,
    total,
    hits,
    browsers,
    systems,
    locations,
    languages,
    sizes,
  };
};

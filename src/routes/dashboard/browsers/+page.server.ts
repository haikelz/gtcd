import * as stats from "$lib/server/goatcounter/stats.js";
import type { StatsPage } from "$lib/server/goatcounter/types.js";
import { getDateRange } from "$lib/server/helpers.js";

export const load = async ({ url }) => {
  const preset = url.searchParams.get("range") || "7d";
  const { start, end } = getDateRange(preset);

  try {
    const result = await stats.getStats(
      "browsers" as StatsPage,
      start,
      end,
      50
    );
    return { range: preset, stats: result };
  } catch (e: unknown) {
    return {
      range: preset,
      error: e instanceof Error ? e.message : "Failed",
      stats: null,
    };
  }
};

export const actions = {
  detail: async ({ request, url }) => {
    const data = await request.formData();
    const id = data.get("id") as string;
    const preset = url.searchParams.get("range") || "7d";
    const { start, end } = getDateRange(preset);

    try {
      const detail = await stats.getStatsDetail(
        "browsers" as StatsPage,
        id,
        start,
        end,
        20
      );
      return { detailId: id, detail };
    } catch (e: unknown) {
      return { detailError: e instanceof Error ? e.message : "Failed" };
    }
  },
};

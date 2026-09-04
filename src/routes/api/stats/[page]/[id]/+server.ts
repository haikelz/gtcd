import { getDashboardSession } from "$lib/server/auth/session.js";
import { getStatsDetail, isStatsPage } from "$lib/server/goatcounter/stats.js";
import { getDateRange } from "$lib/server/helpers.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, cookies, url }) => {
  try {
    const session = await getDashboardSession(cookies);
    if (!session) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only known stats pages may be proxied upstream.
    if (!isStatsPage(params.page)) {
      return json({ error: "Unknown stats page" }, { status: 400 });
    }

    const preset = url.searchParams.get("range") || "7d";
    const { start, end } = getDateRange(preset);

    const detail = await getStatsDetail(params.page, params.id, start, end, 20);
    return json(detail);
  } catch (e: unknown) {
    const status =
      e instanceof Error && e.message === "Not authenticated" ? 401 : 500;
    return json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status }
    );
  }
};

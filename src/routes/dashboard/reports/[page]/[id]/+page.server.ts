import { error } from "@sveltejs/kit";
import { type MessageKey, translate } from "$lib/i18n";
import {
  getFilterFromUrl,
  resolveFilter,
} from "$lib/server/goatcounter/filter.js";
import { getDateRangeFromUrl, getOffsetFromUrl } from "$lib/server/helpers.js";
import {
  getStatsDetail,
  isStatsDetailPage,
  streamReport,
} from "$lib/server/goatcounter/stats.js";

const NAME_MAX_LENGTH = 200;

const REPORTS = {
  browsers: {
    labelKey: "reports.detailBrowsers",
    parentKey: "reports.parentBrowsers",
    parentHref: "/dashboard/browsers",
    route: "browsers",
  },
  systems: {
    labelKey: "reports.detailSystems",
    parentKey: "reports.parentSystems",
    parentHref: "/dashboard/systems",
    route: "systems",
  },
  locations: {
    labelKey: "reports.detailLocations",
    parentKey: "reports.parentLocations",
    parentHref: "/dashboard/locations",
    route: "locations",
  },
  sizes: {
    labelKey: "reports.detailSizes",
    parentKey: "reports.parentDevices",
    parentHref: "/dashboard/devices",
    route: "sizes",
  },
  campaigns: {
    labelKey: "reports.detailCampaigns",
    parentKey: "reports.parentCampaigns",
    parentHref: "/dashboard/campaigns",
    route: "campaigns",
  },
  toprefs: {
    labelKey: "reports.detailToprefs",
    parentKey: "reports.parentReferrers",
    parentHref: "/dashboard/referrers",
    route: "toprefs",
  },
} as const satisfies Record<
  string,
  {
    labelKey: MessageKey;
    parentHref: string;
    parentKey: MessageKey;
    route: string;
  }
>;

export async function load({ locals, params, url, parent }) {
  if (!isStatsDetailPage(params.page)) {
    throw error(404, translate(locals.locale, "reports.detailNotFound"));
  }

  const report = REPORTS[params.page];
  const { preferences, vhost } = await parent();
  const { range, start, end } = getDateRangeFromUrl(url, preferences.timezone);
  const offset = getOffsetFromUrl(url);

  // Streamed: the page renders its skeleton while GoatCounter answers.
  const page = params.page;
  const detail = streamReport(
    resolveFilter(getFilterFromUrl(url), { vhost }).then((includePaths) =>
      getStatsDetail(page, params.id, start, end, 50, offset, includePaths, {
        vhost,
      })
    ),
    locals.locale,
    "reports.detailLoadFailed"
  );

  return {
    detail,
    detailId: params.id,
    detailName: detailName(url.searchParams.get("name")),
    offset,
    range,
    report,
  };
}

/**
 * The display name the report list links with (`?name=`), so the heading
 * reads "Mobile" rather than the id "phone". Untrusted input: control
 * characters go and the length is capped; Svelte escapes the rest.
 */
function detailName(value: string | null): string | null {
  const name = value
    ?.replace(/\p{Cc}/gu, "")
    .trim()
    .slice(0, NAME_MAX_LENGTH);

  return name || null;
}

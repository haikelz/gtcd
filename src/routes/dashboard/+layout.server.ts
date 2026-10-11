import { redirect } from "@sveltejs/kit";
import { VIEW_PARAMS } from "$lib/dashboard-layout.js";
import {
  getGoatCounterAdminUrl,
  isDashboardAdmin,
} from "$lib/server/auth/admin.js";
import { getDashboardLayout } from "$lib/server/dashboard-layout-store.js";
import { getDashboardSiteContext } from "$lib/server/goatcounter/site-context.js";
import type { LayoutServerLoad } from "./$types";

const REPORT_ROUTE =
  /^\/dashboard(\/(pages|paths|browsers|systems|locations|languages|devices|campaigns|referrers|reports)(\/.*)?)?\/?$/;

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(302, "/login");
  }

  const [siteContext, dashboardLayout] = await Promise.all([
    getDashboardSiteContext(url),
    getDashboardLayout(locals.user.email),
  ]);

  // Like GoatCounter's default view: a report opened without any period or
  // filter parameters starts from the user's saved default.
  const defaultView = dashboardLayout.views.find(
    (view) => view.name === dashboardLayout.defaultView
  );
  if (
    defaultView?.query &&
    REPORT_ROUTE.test(url.pathname) &&
    !VIEW_PARAMS.some((param) => url.searchParams.has(param))
  ) {
    const target = new URLSearchParams(defaultView.query);
    for (const [key, value] of url.searchParams) target.set(key, value);
    throw redirect(302, `${url.pathname}?${target}`);
  }

  return {
    dashboardLayout,
    user: locals.user,
    isAdmin: isDashboardAdmin(locals.user.email),
    goatCounterAdminUrl: getGoatCounterAdminUrl(),
    ...siteContext,
  };
};

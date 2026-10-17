import { redirect } from "@sveltejs/kit";
import { VIEW_PARAMS } from "$lib/dashboard-layout.js";
import { LOCALE_COOKIE } from "$lib/i18n/index.js";
import { applyDisplayOverrides } from "$lib/preferences.js";
import {
  getGoatCounterAdminUrl,
  isDashboardAdmin,
} from "$lib/server/auth/admin.js";
import { getDashboardLayout } from "$lib/server/dashboard-layout-store.js";
import { getDashboardSiteContext } from "$lib/server/goatcounter/site-context.js";
import { getMe } from "$lib/server/goatcounter/stats.js";
import type { LayoutServerLoad } from "./$types";

const REPORT_ROUTE =
  /^\/dashboard(\/(pages|paths|browsers|systems|locations|languages|devices|campaigns|referrers|reports)(\/.*)?)?\/?$/;

export const load: LayoutServerLoad = async ({ cookies, locals, url }) => {
  if (!locals.user) {
    throw redirect(302, "/login");
  }

  const [siteContext, dashboardLayout] = await Promise.all([
    getDashboardSiteContext(url),
    getDashboardLayout(locals.user.email, async () => {
      const me = await getMe();
      return me.user.settings;
    }),
  ]);

  // Like GoatCounter's default view: a report opened without any period or
  // filter parameters starts from the user's saved default.
  const defaultView = dashboardLayout.views.find(
    (view) => view.name === dashboardLayout.defaultView
  );
  if (
    defaultView?.query &&
    REPORT_ROUTE.test(url.pathname) &&
    !VIEW_PARAMS.some(
      (param) => param !== "site" && url.searchParams.has(param)
    )
  ) {
    const target = new URLSearchParams(defaultView.query);
    for (const [key, value] of url.searchParams) target.set(key, value);
    throw redirect(302, `${url.pathname}?${target}`);
  }

  const preferences = applyDisplayOverrides(
    siteContext.preferences,
    dashboardLayout.overrides
  );

  // Pages render in the user's effective locale; remember it for pages
  // outside the dashboard (login, errors) and for form-action messages.
  locals.locale = preferences.locale;
  if (cookies.get(LOCALE_COOKIE) !== preferences.locale) {
    cookies.set(LOCALE_COOKIE, preferences.locale, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  }

  return {
    dashboardLayout,
    locale: preferences.locale,
    user: locals.user,
    isAdmin: isDashboardAdmin(locals.user.email),
    goatCounterAdminUrl: getGoatCounterAdminUrl(),
    ...siteContext,
    preferences,
  };
};

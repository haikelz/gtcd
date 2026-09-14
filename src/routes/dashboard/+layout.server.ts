import { redirect } from "@sveltejs/kit";
import {
  getGoatCounterAdminUrl,
  isDashboardAdmin,
} from "$lib/server/auth/admin.js";
import { getDashboardSiteContext } from "$lib/server/goatcounter/site-context.js";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(302, "/login");
  }

  const siteContext = await getDashboardSiteContext(url);

  return {
    user: locals.user,
    isAdmin: isDashboardAdmin(locals.user.email),
    goatCounterAdminUrl: getGoatCounterAdminUrl(),
    ...siteContext,
  };
};

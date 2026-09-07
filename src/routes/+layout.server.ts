import type { LayoutServerLoad } from "./$types";
import {
  getGoatCounterAdminUrl,
  isDashboardAdmin,
} from "$lib/server/auth/admin.js";

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    authenticated: !!locals.user,
    user: locals.user,
    isAdmin: locals.user ? isDashboardAdmin(locals.user.email) : false,
    goatCounterAdminUrl: getGoatCounterAdminUrl(),
  };
};

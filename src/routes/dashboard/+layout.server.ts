import { redirect } from "@sveltejs/kit";
import {
  getGoatCounterAdminUrl,
  isDashboardAdmin,
} from "$lib/server/auth/admin.js";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, "/login");
  }

  return {
    user: locals.user,
    isAdmin: isDashboardAdmin(locals.user.email),
    goatCounterAdminUrl: getGoatCounterAdminUrl(),
  };
};

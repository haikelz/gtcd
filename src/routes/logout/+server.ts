import { translate } from "$lib/i18n";
import { destroyDashboardSession } from "$lib/server/auth/session.js";
import { logoutNativeSession } from "$lib/server/goatcounter/native-session.js";
import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ cookies, locals }) => {
  if (locals.user) await logoutNativeSession(cookies, locals.user.email);

  // The session may still be valid server-side; say so and let the user retry.
  if (!(await destroyDashboardSession(cookies))) {
    throw error(503, translate(locals.locale, "auth.signOutFailed"));
  }

  throw redirect(302, "/login");
};

import { destroyDashboardSession } from "$lib/server/auth/session.js";
import { logoutNativeSession } from "$lib/server/goatcounter/native-session.js";
import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ cookies, locals }) => {
  if (locals.user) await logoutNativeSession(cookies, locals.user.email);
  await destroyDashboardSession(cookies);
  throw redirect(302, "/login");
};

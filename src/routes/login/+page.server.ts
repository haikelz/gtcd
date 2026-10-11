import {
  createDashboardSession,
  shouldUseSecureCookies,
} from "$lib/server/auth/session.js";
import { authenticateWithGoatCounter } from "$lib/server/goatcounter/auth.js";
import { translate } from "$lib/i18n";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  // If already logged in, redirect to dashboard
  if (locals.user) {
    throw redirect(302, "/dashboard");
  }
};

export const actions: Actions = {
  login: async ({ request, cookies, locals, url }) => {
    const data = await request.formData();
    const emailValue = data.get("email");
    const password = data.get("password");

    if (typeof emailValue !== "string" || typeof password !== "string") {
      return fail(400, {
        error: translate(locals.locale, "auth.missingCredentials"),
      });
    }

    const email = emailValue.trim();

    if (!email || !password || email.length > 254 || password.length > 1024) {
      return fail(400, {
        error: translate(locals.locale, "auth.missingCredentials"),
      });
    }

    const result = await authenticateWithGoatCounter(email, password);

    if (!result.success) {
      switch (result.reason) {
        case "invalid_credentials":
          return fail(400, {
            error: translate(locals.locale, "auth.invalidCredentials"),
          });
        case "mfa_required":
          return fail(400, {
            error: translate(locals.locale, "auth.mfaRequired"),
          });
        case "unavailable":
          return fail(502, {
            error: translate(locals.locale, "auth.unavailable"),
          });
      }
    }

    // Authentication successful — create dashboard session
    await createDashboardSession(
      cookies,
      result.user.email,
      shouldUseSecureCookies(request.headers, url)
    );

    throw redirect(302, "/dashboard");
  },
};

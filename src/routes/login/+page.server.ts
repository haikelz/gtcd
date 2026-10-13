import {
  clearLoginFailures,
  clientIp,
  isLoginLimited,
  recordLoginFailure,
} from "$lib/server/auth/login-guard.js";
import {
  createDashboardSession,
  shouldUseSecureCookies,
} from "$lib/server/auth/session.js";
import { authenticateWithGoatCounter } from "$lib/server/goatcounter/auth.js";
import { getTurnstileSiteKey, verifyTurnstile } from "$lib/server/turnstile";
import { translate } from "$lib/i18n";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  // If already logged in, redirect to dashboard
  if (locals.user) {
    throw redirect(302, "/dashboard");
  }

  return { turnstileSiteKey: getTurnstileSiteKey() };
};

export const actions: Actions = {
  login: async ({ request, cookies, getClientAddress, locals, url }) => {
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

    const ip = clientIp(getClientAddress);

    if (await isLoginLimited(email, ip)) {
      return fail(429, {
        error: translate(locals.locale, "auth.tooManyAttempts"),
      });
    }

    // Check the bot challenge before spending a GoatCounter login attempt.
    if (!(await verifyTurnstile(data.get("cf-turnstile-response")))) {
      return fail(400, {
        error: translate(locals.locale, "auth.challengeFailed"),
      });
    }

    const result = await authenticateWithGoatCounter(email, password);

    if (!result.success) {
      switch (result.reason) {
        case "invalid_credentials":
          await recordLoginFailure(email, ip);
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
    await clearLoginFailures(email);
    await createDashboardSession(
      cookies,
      result.user.email,
      shouldUseSecureCookies(request.headers, url)
    );

    throw redirect(302, "/dashboard");
  },
};

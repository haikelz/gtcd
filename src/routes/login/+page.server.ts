import { getGoatCounterAdminUrl } from "$lib/server/auth/admin.js";
import {
  clearLoginFailures,
  clearMfa,
  clientIp,
  getPendingMfa,
  isLoginLimited,
  recordLoginFailure,
  recordMfaFailure,
  startMfa,
} from "$lib/server/auth/login-guard.js";
import {
  createDashboardSession,
  shouldUseSecureCookies,
} from "$lib/server/auth/session.js";
import {
  authenticateWithGoatCounter,
  verifyTotpWithGoatCounter,
} from "$lib/server/goatcounter/auth.js";
import { getTurnstileSiteKey, verifyTurnstile } from "$lib/server/turnstile";
import { saveNativeSession } from "$lib/server/goatcounter/native-session.js";
import { translate } from "$lib/i18n";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

/** GoatCounter's own reset page, when its public URL is configured. */
function passwordResetUrl(): string | null {
  const adminUrl = getGoatCounterAdminUrl();
  if (!adminUrl) return null;
  return new URL(
    "user/forgot",
    adminUrl.endsWith("/") ? adminUrl : `${adminUrl}/`
  ).href;
}

export const load: PageServerLoad = async ({ cookies, locals }) => {
  // If already logged in, redirect to dashboard
  if (locals.user) {
    throw redirect(302, "/dashboard");
  }

  const mfa = await getPendingMfa(cookies);

  return {
    mfaEmail: mfa?.pending.email ?? null,
    passwordResetUrl: passwordResetUrl(),
    turnstileSiteKey: getTurnstileSiteKey(),
  };
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

    const secure = shouldUseSecureCookies(request.headers, url);
    const result = await authenticateWithGoatCounter(email, password);

    if (!result.success) {
      switch (result.reason) {
        case "invalid_credentials":
          await recordLoginFailure(email, ip);
          return fail(400, {
            error: translate(locals.locale, "auth.invalidCredentials"),
          });
        case "mfa_required":
          // The password was right; the code step finishes the login.
          await startMfa(cookies, email, result.challenge, secure);
          return { mfa: true };
        case "unavailable":
          return fail(502, {
            error: translate(locals.locale, "auth.unavailable"),
          });
      }
    }

    // Authentication successful — create dashboard session
    await clearLoginFailures(email);
    await createDashboardSession(cookies, result.user.email, secure);
    await saveNativeSession(cookies, {
      email: result.user.email,
      cookies: result.nativeCookies,
    });

    throw redirect(302, "/dashboard");
  },

  totp: async ({ request, cookies, getClientAddress, locals, url }) => {
    const mfa = await getPendingMfa(cookies);
    if (!mfa) {
      await clearMfa(cookies);
      return fail(400, { error: translate(locals.locale, "auth.mfaExpired") });
    }

    const code = String((await request.formData()).get("code") ?? "").replace(
      /\s/g,
      ""
    );
    if (!/^\d{6}$/.test(code)) {
      return fail(400, { error: translate(locals.locale, "auth.mfaInvalid") });
    }

    const result = await verifyTotpWithGoatCounter(mfa.pending.challenge, code);

    if (!result.success) {
      switch (result.reason) {
        case "invalid_code": {
          await recordLoginFailure(
            mfa.pending.email,
            clientIp(getClientAddress)
          );
          const canRetry = await recordMfaFailure(cookies, mfa.id, mfa.pending);
          return fail(400, {
            error: translate(
              locals.locale,
              canRetry ? "auth.mfaInvalid" : "auth.mfaExpired"
            ),
          });
        }
        case "expired":
          await clearMfa(cookies, mfa.id);
          return fail(400, {
            error: translate(locals.locale, "auth.mfaExpired"),
          });
        case "unavailable":
          return fail(502, {
            error: translate(locals.locale, "auth.unavailable"),
          });
      }
    }

    await clearMfa(cookies, mfa.id);
    await clearLoginFailures(mfa.pending.email);
    await createDashboardSession(
      cookies,
      mfa.pending.email,
      shouldUseSecureCookies(request.headers, url)
    );
    await saveNativeSession(cookies, {
      email: mfa.pending.email,
      cookies: result.nativeCookies,
    });

    throw redirect(302, "/dashboard");
  },

  cancelMfa: async ({ cookies }) => {
    await clearMfa(cookies);
    return { mfa: false };
  },
};

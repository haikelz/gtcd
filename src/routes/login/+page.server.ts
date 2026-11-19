import { getGoatCounterAdminUrl } from "$lib/server/auth/admin.js";
import {
  claimLoginAttempt,
  claimMfaAttempt,
  clearLoginFailures,
  clearMfa,
  clientIp,
  getPendingMfa,
  releaseLoginAttempt,
  releaseMfaAttempt,
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

    // Check the bot challenge before spending a GoatCounter login attempt.
    if (!(await verifyTurnstile(data.get("cf-turnstile-response")))) {
      return fail(400, {
        error: translate(locals.locale, "auth.challengeFailed"),
      });
    }

    if (!(await claimLoginAttempt(email, ip))) {
      return fail(429, {
        error: translate(locals.locale, "auth.tooManyAttempts"),
      });
    }

    const secure = shouldUseSecureCookies(request.headers, url);
    const result = await authenticateWithGoatCounter(email, password, ip);

    if (!result.success) {
      switch (result.reason) {
        case "invalid_credentials":
          // The claimed attempt stays counted as this failure.
          return fail(400, {
            error: translate(locals.locale, "auth.invalidCredentials"),
          });
        case "mfa_required":
          // The password was right; the code step claims its own attempts.
          await releaseLoginAttempt(email, ip);
          await startMfa(cookies, email, result.challenge, secure);
          return { mfa: true };
        case "unavailable":
          await releaseLoginAttempt(email, ip);
          return fail(502, {
            error: translate(locals.locale, "auth.unavailable"),
          });
      }
    }

    // Authentication successful — create dashboard session
    await clearLoginFailures(email, ip);
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

    const ip = clientIp(getClientAddress);
    const email = mfa.pending.email;

    if (!(await claimLoginAttempt(email, ip))) {
      return fail(429, {
        error: translate(locals.locale, "auth.tooManyAttempts"),
      });
    }

    // Claimed before GoatCounter answers so parallel codes cannot share a try;
    // an unavailable GoatCounter gives the try back below.
    const attemptsLeft = await claimMfaAttempt(mfa.id);
    if (attemptsLeft < 0) {
      // GoatCounter never judged this code.
      await releaseLoginAttempt(email, ip);
      await clearMfa(cookies, mfa.id);
      return fail(429, { error: translate(locals.locale, "auth.mfaExpired") });
    }

    const result = await verifyTotpWithGoatCounter(
      mfa.pending.challenge,
      code,
      ip
    );

    if (!result.success) {
      switch (result.reason) {
        case "invalid_code":
          // The claimed attempt stays counted as this failure.
          if (attemptsLeft === 0) await clearMfa(cookies, mfa.id);
          return fail(400, {
            error: translate(
              locals.locale,
              attemptsLeft > 0 ? "auth.mfaInvalid" : "auth.mfaExpired"
            ),
          });
        case "expired":
          await releaseLoginAttempt(email, ip);
          await clearMfa(cookies, mfa.id);
          return fail(400, {
            error: translate(locals.locale, "auth.mfaExpired"),
          });
        case "unavailable":
          await releaseMfaAttempt(mfa.id);
          await releaseLoginAttempt(email, ip);
          return fail(502, {
            error: translate(locals.locale, "auth.unavailable"),
          });
      }
    }

    await clearMfa(cookies, mfa.id);
    await clearLoginFailures(email, ip);
    await createDashboardSession(
      cookies,
      email,
      shouldUseSecureCookies(request.headers, url)
    );
    await saveNativeSession(cookies, {
      email,
      cookies: result.nativeCookies,
    });

    throw redirect(302, "/dashboard");
  },

  cancelMfa: async ({ cookies }) => {
    await clearMfa(cookies);
    return { mfa: false };
  },
};

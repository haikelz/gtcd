import { getBaseUrl } from "./client.js";
import { captureNativeCookies, nativeRequest } from "./native-session.js";
import { parseTotpForm, type TotpChallenge } from "./totp-form.js";
import type { GoatCounterAuthResult, GoatCounterTotpResult } from "./types.js";

/**
 * Verify credentials against GoatCounter's login form endpoint.
 *
 * GoatCounter (v2.6 handlers/user.go) signals every login outcome with a
 * redirect destination, never with an error status:
 *   success            → 303 "/"
 *   unknown email      → 303 "/user/new"
 *   wrong password     → 303 "/user/new?email=…"
 *   no password set    → 303 "/user/forgot?email=…"
 *   TOTP enabled       → 200 with the TOTP form
 * Classify by the Location header; treating every 3xx as success would accept
 * any wrong credential, because failures redirect too.
 */
export async function authenticateWithGoatCounter(
  email: string,
  password: string
): Promise<GoatCounterAuthResult> {
  let response: Response;

  try {
    response = await nativeRequest(
      "/user/requestlogin",
      { email, cookies: {} },
      undefined,
      new URLSearchParams({
        email,
        password,
      })
    );
  } catch {
    // Network error or GoatCounter unavailable
    return {
      success: false,
      reason: "unavailable",
    };
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location") ?? "";
    const path = new URL(location, getBaseUrl()).pathname;

    if (path === "/") {
      return {
        success: true,
        user: { email },
        nativeCookies: captureNativeCookies(response.headers),
      };
    }

    return {
      success: false,
      reason: "invalid_credentials",
    };
  }

  // TOTP-enabled accounts receive the token form instead of a redirect.
  const challenge = parseTotpForm(await response.text());

  if (challenge) {
    return {
      success: false,
      reason: "mfa_required",
      challenge,
    };
  }

  return {
    success: false,
    reason: "invalid_credentials",
  };
}

/**
 * Finish a TOTP login. GoatCounter answers a valid code with 303 "/", a wrong
 * code with the TOTP form again (200), and a stale challenge with 303
 * "/user/new".
 */
export async function verifyTotpWithGoatCounter(
  challenge: TotpChallenge,
  code: string
): Promise<GoatCounterTotpResult> {
  let response: Response;

  try {
    response = await nativeRequest(
      "/user/totplogin",
      { email: "", cookies: {} },
      undefined,
      new URLSearchParams({
        loginmac: challenge.loginMac,
        totp_token: code,
        user_logintoken: challenge.loginToken,
      })
    );
  } catch {
    return { success: false, reason: "unavailable" };
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location") ?? "";
    return new URL(location, getBaseUrl()).pathname === "/"
      ? { success: true, nativeCookies: captureNativeCookies(response.headers) }
      : { success: false, reason: "expired" };
  }

  if (response.status >= 500) return { success: false, reason: "unavailable" };
  return { success: false, reason: "invalid_code" };
}

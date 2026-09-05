import { gcFetchRaw, getBaseUrl } from "./client.js";
import type { GoatCounterAuthResult } from "./types.js";

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
  password: string,
): Promise<GoatCounterAuthResult> {
  let response: Response;

  try {
    response = await gcFetchRaw("/user/requestlogin", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email,
        password,
      }).toString(),
      redirect: "manual",
    });
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
      };
    }

    return {
      success: false,
      reason: "invalid_credentials",
    };
  }

  // TOTP-enabled accounts receive the token form instead of a redirect.
  const body = await response.text();

  if (
    body.includes("TOTP") ||
    body.includes("totp") ||
    body.includes("two-factor")
  ) {
    return {
      success: false,
      reason: "mfa_required",
    };
  }

  return {
    success: false,
    reason: "invalid_credentials",
  };
}

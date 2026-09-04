import { getBaseUrl } from "./client.js";
import type { GoatCounterAuthResult } from "./types.js";

export async function authenticateWithGoatCounter(
  email: string,
  password: string
): Promise<GoatCounterAuthResult> {
  const baseUrl = getBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/user/requestlogin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email,
        password,
      }),
      redirect: "manual",
    });

    // Successful login redirects to the site
    if (response.status >= 300 && response.status < 400) {
      return {
        success: true,
        user: { email },
      };
    }

    // Check response body for error clues
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

    if (response.status === 403 || response.status === 401) {
      return {
        success: false,
        reason: "invalid_credentials",
      };
    }

    // If the page contains a "login" form again, credentials were wrong
    if (body.includes("requestlogin") && body.includes("password")) {
      return {
        success: false,
        reason: "invalid_credentials",
      };
    }

    // Any other non-redirect response is treated as an error
    return {
      success: false,
      reason: "invalid_credentials",
    };
  } catch (e) {
    // Network error or GoatCounter unavailable
    return {
      success: false,
      reason: "unavailable",
    };
  }
}

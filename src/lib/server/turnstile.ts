import { env } from "$env/dynamic/private";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function read(name: string): string | undefined {
  const value = env[name] ?? process.env[name];
  return value?.trim() || undefined;
}

/** The public site key, or null when Turnstile is off (either key unset). */
export function getTurnstileSiteKey(): string | null {
  const siteKey = read("TURNSTILE_SITE_KEY");
  return siteKey && read("TURNSTILE_SECRET_KEY") ? siteKey : null;
}

/**
 * Checks a widget token with Cloudflare. Fails closed: a missing token, a
 * rejected token, or an unreachable siteverify endpoint all return false.
 */
export async function verifyTurnstile(token: unknown): Promise<boolean> {
  const secret = read("TURNSTILE_SECRET_KEY");
  // Off unless both keys are set, matching what the login page renders.
  if (!secret || !getTurnstileSiteKey()) return true;

  // Cloudflare caps tokens at 2048 characters.
  if (typeof token !== "string" || !token || token.length > 2048) return false;

  try {
    const response = await fetch(SITEVERIFY_URL, {
      body: new URLSearchParams({ response: token, secret }),
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  }
}

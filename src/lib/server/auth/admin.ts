import { env } from "$env/dynamic/private";
import { getRequestEvent } from "$app/server";
import type { Locale } from "$lib/dashboard-layout";
import { translate } from "$lib/i18n";
import { error } from "@sveltejs/kit";

function getAdminEmails(): readonly string[] {
  const value = env.GTCD_ADMIN_EMAILS || process.env.GTCD_ADMIN_EMAILS || "";

  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

// The 403 page follows the request's language; a load called outside a
// request (as the e2e guard checks do) falls back to English.
function requestLocale(): Locale {
  try {
    return getRequestEvent().locals.locale ?? "en";
  } catch {
    return "en";
  }
}

export function isDashboardAdmin(email: string): boolean {
  return getAdminEmails().includes(email.trim().toLowerCase());
}

export function requireDashboardAdmin(
  user: { readonly email: string } | null
): {
  readonly email: string;
} {
  if (!user || !isDashboardAdmin(user.email)) {
    throw error(403, translate(requestLocale(), "admin.required"));
  }

  return user;
}

export function getGoatCounterAdminUrl(): string | null {
  const value = (
    env.GOATCOUNTER_ADMIN_URL ||
    process.env.GOATCOUNTER_ADMIN_URL ||
    ""
  ).trim();

  if (!value) return null;

  try {
    const url = new URL(value);
    const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(
      url.hostname
    );

    if (
      url.username ||
      url.password ||
      (url.protocol !== "https:" && !(isLocalhost && url.protocol === "http:"))
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

import { building } from "$app/environment";
import { isLocale } from "$lib/dashboard-layout.js";
import { LOCALE_COOKIE, localeFromAcceptLanguage } from "$lib/i18n/index.js";
import { getDashboardSession } from "$lib/server/auth/session.js";
import { startReportScheduler } from "$lib/server/email-reports.js";
import type { Handle, ServerInit } from "@sveltejs/kit";

export const init: ServerInit = () => {
  if (!building) startReportScheduler();
};

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export const handle: Handle = async ({ event, resolve }) => {
  // Validate session on every request
  event.locals.user = await getDashboardSession(event.cookies);

  // The dashboard layout refines this with the user's effective locale and
  // remembers it in the cookie, so login and error pages match next time.
  const savedLocale = event.cookies.get(LOCALE_COOKIE);
  event.locals.locale = isLocale(savedLocale)
    ? savedLocale
    : localeFromAcceptLanguage(event.request.headers.get("accept-language"));

  const response = await resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('<html lang="en">', `<html lang="${event.locals.locale}">`),
  });

  for (const [header, value] of Object.entries(securityHeaders)) {
    response.headers.set(header, value);
  }

  if (event.locals.user) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  if (event.url.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000");
  }

  return response;
};
